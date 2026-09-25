/**
 * task-2 验收脚本（可执行形态）：
 *
 * 1. 16 个内置模式的显示名逐字符合 lead 给的表；
 * 2. `/domain tianquan`、`/domain 天权`、`/task-mode 评估方案` 三条路径命中同一 id；
 * 3. 工具白名单 / courageThreshold / decisionStyle / toolPreset 与 HEAD 版本一致；
 * 4. `<star-domain>` 注入形态不含 motto / 诗句，且会话内字节稳定。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { STAR_DOMAINS, type StarDomainId } from '../star-domain-data.js'
import { starDomainRegistry } from '../star-domain-registry.js'
import { domainDisplayName, domainScenario, domainHow } from '../star-domain.js'

/** lead 给的显示名对照表（逐字）。 */
const EXPECTED_NAMES: Record<string, string> = {
  tianshu: '项目统筹',
  pojun: '探索新方案',
  tianfu: '维护结构',
  tianliang: '执行任务',
  tianquan: '评估方案',
  tianji: '检查前提',
  tianxuan: '跨模块分析',
  fu: '优化提示词',
  wenqu: '整理代码',
  kaiyang: '核对运行结果',
  yaoguang: '复现并验证',
  huagai: '跟进长期任务',
  qiming: '日常开发',
  changgeng: '检查界面与交付',
  qisha: '精简冗余',
  taiyi: '使用最小工具集',
}

describe('task-2 验收：显示名逐字对表', () => {
  it('16 个内置模式的 taskMode.name 与 lead 的表逐字一致', () => {
    const ids = Object.keys(STAR_DOMAINS) as StarDomainId[]
    assert.equal(ids.length, 16, `内置模式应为 16 个，实得 ${ids.length}`)
    const diffs: string[] = []
    for (const id of ids) {
      const actual = domainDisplayName(STAR_DOMAINS[id])
      const expected = EXPECTED_NAMES[id]
      if (expected === undefined) diffs.push(`${id}: 表中无此 id（实得「${actual}」）`)
      else if (actual !== expected) diffs.push(`${id}: 期望「${expected}」实得「${actual}」`)
    }
    for (const id of Object.keys(EXPECTED_NAMES)) {
      if (!(id in STAR_DOMAINS)) diffs.push(`表中 ${id} 在 STAR_DOMAINS 里不存在`)
    }
    assert.deepEqual(diffs, [], `显示名对表差异：\n${diffs.join('\n')}`)
  })

  it('每个模式都有非空的适用场景与做法', () => {
    const missing: string[] = []
    for (const id of Object.keys(STAR_DOMAINS) as StarDomainId[]) {
      const d = STAR_DOMAINS[id]
      if (!domainScenario(d)) missing.push(`${id}: 缺 scenario`)
      if (!domainHow(d)) missing.push(`${id}: 缺 how`)
    }
    assert.deepEqual(missing, [])
  })
})

describe('task-2 验收：三条输入路径命中同一 id', () => {
  /** 复刻 slash-commands.ts::handleTaskModeCommand 的匹配顺序。 */
  function resolve(arg: string): string | undefined {
    return starDomainRegistry
      .list()
      .find(d => d.id === arg.toLowerCase() || d.name === arg || domainDisplayName(d) === arg)?.id
  }

  it('/domain tianquan（旧 ID）与 /domain 天权（旧星名）与 /task-mode 评估方案（显示名）同域', () => {
    const byId = resolve('tianquan')
    const byLegacyName = resolve('天权')
    const byDisplayName = resolve('评估方案')
    assert.equal(byId, 'tianquan')
    assert.equal(byLegacyName, 'tianquan')
    assert.equal(byDisplayName, 'tianquan')
    assert.equal(new Set([byId, byLegacyName, byDisplayName]).size, 1, '三条路径必须落到同一个 id')
  })

  it('16 个模式的三条路径都自洽（显示名 / 旧星名 / 旧 ID 各解析回自身）', () => {
    for (const id of Object.keys(STAR_DOMAINS) as StarDomainId[]) {
      const d = STAR_DOMAINS[id]
      assert.equal(resolve(id), id, `${id} 经自身 id 应解析回自身`)
      assert.equal(resolve(d.name), id, `${d.name} 经旧星名应解析回 ${id}`)
      assert.equal(resolve(domainDisplayName(d)), id, `${domainDisplayName(d)} 经显示名应解析回 ${id}`)
    }
  })
})

describe('task-2 验收：白名单 / 阈值 / decisionStyle / toolPreset 与 HEAD 一致', () => {
  /** 从 HEAD 版本源码里抽出每个域的这四类字段，不走 import（HEAD 是旧版）。 */
  function headFields(): Map<string, { toolWhitelist: string[]; courageThreshold: string; decisionStyle: string; toolPreset: string }> {
    const src = execFileSync('git', ['show', 'HEAD:src/agent/star-domain-data.ts'], {
      encoding: 'utf8',
      cwd: join(process.cwd()),
    })
    const out = new Map<string, { toolWhitelist: string[]; courageThreshold: string; decisionStyle: string; toolPreset: string }>()
    // 每个域块以 `\n  <id>: {` 开头，到下一条同缩进 id 或文件尾为止。
    const re = /^ {2}([a-z][a-z0-9_]*): \{$/gm
    const marks: Array<{ id: string; start: number }> = []
    for (const m of src.matchAll(re)) marks.push({ id: m[1]!, start: m.index! })
    for (let i = 0; i < marks.length; i++) {
      const body = src.slice(marks[i]!.start, marks[i + 1]?.start ?? src.length)
      const wl = /toolWhitelist: \[([^\]]*)\]/.exec(body)
      out.set(marks[i]!.id, {
        toolWhitelist: wl ? wl[1]!.split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [],
        courageThreshold: /courageThreshold: ([0-9.]+)/.exec(body)?.[1] ?? '',
        decisionStyle: /decisionStyle: '([a-z]+)'/.exec(body)?.[1] ?? '',
        toolPreset: /toolPreset: '([a-z]+)'/.exec(body)?.[1] ?? '',
      })
    }
    return out
  }

  it('逐域 diff 为空：四个字段一字未改', () => {
    const head = headFields()
    assert.ok(head.size >= 16, `HEAD 应解析出 ≥16 个域，实得 ${head.size}`)
    const diffs: string[] = []
    for (const id of Object.keys(STAR_DOMAINS) as StarDomainId[]) {
      const h = head.get(id)
      const n = STAR_DOMAINS[id]
      if (!h) { diffs.push(`${id}: HEAD 中未找到该域`); continue }
      if (h.courageThreshold !== String(n.courageThreshold)) {
        diffs.push(`${id}.courageThreshold: HEAD=${h.courageThreshold} 现在=${n.courageThreshold}`)
      }
      if (h.decisionStyle !== n.decisionStyle) {
        diffs.push(`${id}.decisionStyle: HEAD=${h.decisionStyle} 现在=${n.decisionStyle}`)
      }
      const nowPreset = n.toolPreset ?? ''
      if (h.toolPreset !== nowPreset) {
        diffs.push(`${id}.toolPreset: HEAD=${h.toolPreset || '(无)'} 现在=${nowPreset || '(无)'}`)
      }
      const nowWl = [...n.toolWhitelist]
      if (h.toolWhitelist.join('|') !== nowWl.join('|')) {
        diffs.push(`${id}.toolWhitelist: HEAD=${h.toolWhitelist.length} 项 现在=${nowWl.length} 项 ` +
          `缺失=[${h.toolWhitelist.filter(x => !nowWl.includes(x)).join(',')}] 新增=[${nowWl.filter(x => !h.toolWhitelist.includes(x)).join(',')}]`)
      }
    }
    assert.deepEqual(diffs, [], `与 HEAD 的差异：\n${diffs.join('\n')}`)
  })
})

describe('task-2 验收：<star-domain> 注入形态无人设', () => {
  it('buildStableVolatileBlock 渲染的块不含 motto= 与诗句', async () => {
    const { buildStableVolatileBlock } = await import('../../prompt/volatile.js')
    const d = STAR_DOMAINS.qiming
    const block = buildStableVolatileBlock({
      cwd: process.cwd(),
      activeDomain: {
        name: d.name,
        volatileBlock: d.volatileBlock,
        motto: d.motto,
        ...(d.taskMode ? { taskMode: d.taskMode } : {}),
      },
    })
    assert.ok(block.includes('<star-domain'), '块应在场')
    assert.doesNotMatch(block, /motto=/, '不得再携带 motto 属性')
    assert.ok(!block.includes(d.motto), `诗句「${d.motto}」不得进 prompt`)
    assert.match(block, /执行纪律：绿非证明/, '验证纪律文本保留')
    assert.ok(!block.includes('全星域共享'), '星域拟人化措辞已中性化')
    assert.match(block, /task-mode="日常开发"/, '注入形态改为任务模式标注')
  })

  it('块的标签名未变，assignSalience 判定继续生效', async () => {
    const { assignSalience } = await import('../../prompt/volatile.js')
    assert.equal(assignSalience('<star-domain name="x" task-mode="y">z</star-domain>'), 1.0)
  })
})

describe('task-2 验收：FROZEN 块字节稳定', () => {
  it('同一会话常量重复渲染字节一致，且不随「轮次」变化', async () => {
    const { buildStableVolatileBlock } = await import('../../prompt/volatile.js')
    const d = STAR_DOMAINS.tianquan
    const ctx = {
      cwd: process.cwd(),
      activeDomain: {
        name: d.name,
        volatileBlock: d.volatileBlock,
        motto: d.motto,
        ...(d.taskMode ? { taskMode: d.taskMode } : {}),
      },
    }
    const a = buildStableVolatileBlock(ctx)
    const b = buildStableVolatileBlock(ctx)
    assert.equal(a, b, '同输入应字节一致')
    // 逐轮渲染（frozen 前缀每轮重建）仍须字节一致——这是前缀缓存的底线。
    for (let turn = 0; turn < 5; turn++) {
      assert.equal(buildStableVolatileBlock(ctx), a, `第 ${turn} 轮渲染应与首轮字节一致`)
    }
  })

  it('源码里不再有 motto= 的注入模板', () => {
    const src = readFileSync(join(process.cwd(), 'src/prompt/volatile.ts'), 'utf8')
    assert.ok(!src.includes('motto="${'), 'volatile.ts 不应再有 motto 插值模板')
  })
})
