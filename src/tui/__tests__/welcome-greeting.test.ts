import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTheme } from '../theme.js'
import { settleWelcomeGreeting, GREETING_SETTLE_MS, type WelcomeGreetingDeps } from '../welcome-greeting.js'

/** settle 是 fire-and-forget(异步微任务链),断言前让出事件循环。 */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 20))

/** 2026-09 去人设后，三档 voice 共用同一套中性文案（api/greeting.ts 的 VOICE_POOLS
 *  三键同指 TEMPLATES）。此处的 morning 契约改为「落在这套中性池内」。 */
const NEUTRAL_MORNING = [
  '上午好，准备开启什么新任务？',
  '早啊，代码在等你',
  '上午好，今天从哪开始？',
  '早安，一杯咖啡一行代码',
  '上午好，思路清晰的时候最适合开工',
  '早，今天有什么计划？',
  '上午好呀，新的一天新的代码',
  '早安，先跑个测试热热身',
]

function deps(over: Partial<WelcomeGreetingDeps> = {}): WelcomeGreetingDeps & { committed: string[] } {
  const committed: string[] = []
  return {
    enabled: true,
    isTty: true,
    isAgentBusy: () => false,
    isInputPending: () => false,
    commitStatic: (text) => { committed.push(text) },
    // 默认走算法路径(零网络):greeting LLM 关、无 provider 注入。
    greetingConfig: { enabled: false, model: 'deepseek-v4-flash' },
    ...over,
    committed,
  }
}

const strip = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '')

test('enabled=false / 非 TTY:零输出', async () => {
  const a = deps({ enabled: false })
  settleWelcomeGreeting(a)
  await settle()
  assert.equal(a.committed.length, 0, 'skipWelcome 场景不输出')

  const b = deps({ isTty: false })
  settleWelcomeGreeting(b)
  await settle()
  assert.equal(b.committed.length, 0, '管道/CI 零污染')
})

test('RIVET_WELCOME_GREETING=off / =0:零输出(ANIM 同族语义双认,审查 #3)', async () => {
  const prev = process.env.RIVET_WELCOME_GREETING
  try {
    for (const val of ['off', '0']) {
      process.env.RIVET_WELCOME_GREETING = val
      const d = deps()
      settleWelcomeGreeting(d)
      await settle()
      assert.equal(d.committed.length, 0, `=${val} 应关闭`)
    }
  } finally {
    if (prev === undefined) delete process.env.RIVET_WELCOME_GREETING
    else process.env.RIVET_WELCOME_GREETING = prev
  }
})

test('输入中但未提交(input pending):静默放弃,不插输入框上方(审查 #6)', async () => {
  const d = deps({ isInputPending: () => true })
  settleWelcomeGreeting(d)
  await settle()
  assert.equal(d.committed.length, 0, '打字中窗口不追加')
})

test('算法路径:恰好一行,✦ glyph + 非空短文案(池内容由 greeting.test.ts 时段分区覆盖)', async () => {
  const d = deps({ hour: 9 })
  settleWelcomeGreeting(d)
  await settle()
  assert.equal(d.committed.length, 1, '一行原则')
  const line = strip(d.committed[0]!)
  assert.ok(line.startsWith('✦ '), `glyph 前缀,实得:${line}`)
  const text = line.slice(2)
  assert.ok(text.length > 0 && text.length <= 25, `算法模板非空且短,实得:${text}`)
})

test('用户已开始交互(agent busy):静默放弃,零残留', async () => {
  const d = deps({ isAgentBusy: () => true })
  settleWelcomeGreeting(d)
  await settle()
  assert.equal(d.committed.length, 0, '绝不插队对话流')
})

test('LLM 启用且有 provider:竞速窗口内返回 LLM 行(fetch mock)', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ choices: [{ message: { content: '早上好，开工！' } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )) as typeof fetch
  try {
    const d = deps({ greetingConfig: { enabled: true, model: 'flash' }, provider: { apiKey: 'k', baseUrl: 'https://api.example.com/v1' }, hour: 8 })
    settleWelcomeGreeting(d)
    await settle()
    assert.equal(d.committed.length, 1)
    assert.ok(strip(d.committed[0]!).includes('早上好，开工！'), 'LLM 行优先于算法行')
  } finally {
    globalThis.fetch = orig
  }
})

test('voice 注入(去人设):playful 与 default 同池,无角色化文案', async () => {
  const d = deps({ hour: 8, voice: 'playful' })
  settleWelcomeGreeting(d)
  await settle()
  assert.equal(d.committed.length, 1, '一行原则')
  const text = strip(d.committed[0]!).slice(2)
  assert.ok(NEUTRAL_MORNING.includes(text), `voice=playful 应命中中性池,实得:${text}`)
})

test('voice 正规化集成:pastel 主题无注入也走中性池(去人设后不再分角色池)', async () => {
  setTheme('pastel')
  try {
    const d = deps({ hour: 8 }) // 不注入 voice——走 active theme 的 voice
    settleWelcomeGreeting(d)
    await settle()
    assert.equal(d.committed.length, 1, '一行原则')
    const text = strip(d.committed[0]!).slice(2)
    assert.ok(NEUTRAL_MORNING.includes(text), `pastel 主题应同样命中中性池,实得:${text}`)
  } finally {
    setTheme('graphite')
  }
})

test('去人设:全主题问候语都不含角色自称(小天/Nova)', async () => {
  for (const themeName of ['graphite', 'pastel', 'cyberpunk', 'gemini'] as const) {
    setTheme(themeName)
    try {
      for (const hour of [9, 15, 20]) {
        const d = deps({ hour })
        settleWelcomeGreeting(d)
        await settle()
        const text = strip(d.committed[0]!).slice(2)
        assert.ok(!text.includes('小天'), `${themeName} hour=${hour} 不应含「小天」:${text}`)
        assert.ok(!text.includes('Nova'), `${themeName} hour=${hour} 不应含「Nova」:${text}`)
      }
    } finally {
      setTheme('graphite')
    }
  }
})

test('LLM 竞速超时(provider 挂起):算法行兜底,至多一行', async () => {
  const orig = globalThis.fetch
  // fetch 永不返回(不响应 abort),逼 race 走 GREETING_SETTLE_MS 超时。
  globalThis.fetch = (async () => new Promise<Response>(() => {})) as typeof fetch
  try {
    const d = deps({ greetingConfig: { enabled: true, model: 'flash' }, provider: { apiKey: 'k', baseUrl: 'https://api.example.com/v1' }, hour: 20 })
    const t0 = Date.now()
    settleWelcomeGreeting(d)
    await new Promise((r) => setTimeout(r, GREETING_SETTLE_MS + 80))
    assert.ok(Date.now() - t0 >= GREETING_SETTLE_MS, '等待竞速窗口')
    assert.equal(d.committed.length, 1, '一行原则:算法兜底')
    assert.ok(strip(d.committed[0]!).startsWith('✦ '), '兜底行带 glyph 前缀')
  } finally {
    globalThis.fetch = orig
  }
})
