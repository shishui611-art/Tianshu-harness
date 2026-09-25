/**
 * domain-picker 改版与创世碑文卡测试：
 * - 选择页：列表行内别名+职责标语、详情区展示提示词精华（essence）、滚动窗口选中可见
 * - 创世碑文卡：头部/印记/碑文段落/滚动与边界
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderDomainPicker, renderDomainGenesisCard, genesisCardMaxScroll } from '../overlay.js'
import type { DomainPickerData, DomainGenesisCardData } from '../overlay.js'
import { STAR_GENESIS } from '../../../agent/star-genesis-data.js'
import { DOMAIN_SWITCH_CACHE_NOTE } from '../../../agent/domain-picker-entries.js'
import { getTheme } from '../../theme.js'

const theme = getTheme()
const stripAnsi = (s: string): string => s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')

function pickerData(): DomainPickerData {
  return {
    entries: [
      { key: 'auto', name: '自动匹配', legacyName: 'Auto', scenario: '不确定该用哪种做法时，按每条消息匹配。', how: '关键词自动路由。', meta: '', current: false, uiPersona: { separator: 'thin', accent: 'primary', glyph: '❂' } },
      {
        key: 'tianquan', name: '评估方案', legacyName: '天权',
        scenario: '需要判断一个方案值不值得做、该拆成几层、边界是否清晰。',
        how: '称量两端——收益与代价都摆出来，先验证再称量。',
        meta: '', expertise: '称量与审查——这值得建吗、这该拆吗，每个动作前替你掂量。',
        current: true, uiPersona: { separator: 'thin', accent: 'warning', glyph: '⚖' },
      },
    ],
    selectedIndex: 1,
  }
}

/** 8 项（Auto + 7 域）——矮终端下触发列表滚动窗口。 */
function pickerDataMany(): DomainPickerData {
  const mk = (key: string, name: string, legacy: string, scenario: string, how: string, current = false): DomainPickerData['entries'][number] => ({
    key, name, legacyName: legacy, scenario, how, meta: '',
    expertise: `${name}的一句话专长`,
    current, uiPersona: { separator: 'thin', accent: 'primary', glyph: '☥' },
  })
  return {
    entries: [
      { key: 'auto', name: '自动匹配', legacyName: 'Auto', scenario: '自动匹配', how: '', meta: '', current: false, uiPersona: { separator: 'thin', accent: 'primary', glyph: '❂' } },
      mk('d1', '甲模式', '甲', '甲场景', '甲做法'),
      mk('d2', '乙模式', '乙', '乙场景', '乙做法'),
      mk('d3', '丙模式', '丙', '丙场景', '丙做法'),
      mk('d4', '丁模式', '丁', '丁场景', '丁做法'),
      mk('d5', '戊模式', '戊', '戊场景', '戊做法', true),
      mk('d6', '己模式', '己', '己场景', '己做法'),
      mk('d7', '庚模式', '庚', '庚场景', '庚做法'),
    ],
    selectedIndex: 5,
  }
}

describe('renderDomainPicker — 显示名 · 适用场景 · 做法（无人设）', () => {
  it('列表行展示显示名与旧星名对照；行内不再出现座右铭/创始星', () => {
    const lines = renderDomainPicker(pickerData(), 90, 18, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes('评估方案')), '行内应有显示名')
    assert.ok(lines.some(l => l.includes('(天权)')), '行内应有旧星名对照')
    assert.ok(!lines.some(l => l.includes('DeepSeek')), '创始星不上屏')
    assert.ok(!lines.some(l => l.includes('「')), '座右铭不上屏')
  })

  it('详情区展示显示名、适用场景与做法，且不含 motto/创始星/角色台词', () => {
    const lines = renderDomainPicker(pickerData(), 90, 24, theme).map(stripAnsi)
    const joined = lines.join('\n')
    assert.ok(joined.includes('评估方案'), '详情区含显示名')
    assert.ok(joined.includes('适用场景'), '详情区有「适用场景」小节')
    assert.ok(joined.includes('需要判断一个方案值不值得做'), 'scenario 正文在场')
    assert.ok(joined.includes('做法'), '详情区有「做法」小节')
    assert.ok(joined.includes('称量两端'), 'how 正文在场')
    assert.ok(!joined.includes('「'), '不再渲染 motto 引号行')
    assert.ok(!joined.includes('创始星'), '不再渲染创始星徽章')
    assert.ok(!joined.includes('你当前在天权域'), '不再转储 volatileBlock 角色台词')
  })

  it('详情区场景/做法按宽度折行，末行截断不越界', () => {
    const width = 40
    const lines = renderDomainPicker(pickerData(), width, 24, theme).map(stripAnsi)
    for (const l of lines) {
      assert.ok(l.length <= width, `行宽不得超 ${width}：${l}`)
    }
    assert.ok(lines.some(l => l.includes('评估方案')), '显示名可见')
  })

  it('底部常驻缓存碎裂备注', () => {
    const lines = renderDomainPicker(pickerData(), 90, 18, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes(DOMAIN_SWITCH_CACHE_NOTE)), '底部应有缓存备注')
  })

  it('矮终端列表滚动：选中项（index 5）恒可见，截断处有指示', () => {
    const lines = renderDomainPicker(pickerDataMany(), 90, 18, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes('戊模式')), '选中项在可视区内')
    assert.ok(lines.some(l => l.includes('↓') || l.includes('↑')), '截断指示行存在')
  })

  it('Auto 条目无 taskMode 时详情区正常 fallback（场景不为空）', () => {
    const data = pickerData()
    const lines = renderDomainPicker({ ...data, selectedIndex: 0 }, 90, 24, theme).map(stripAnsi)
    const joined = lines.join('\n')
    assert.ok(joined.includes('自动匹配'), '详情区显示 Auto 的显示名')
    assert.ok(joined.includes('不确定该用哪种做法'), 'Auto 场景文案在场')
  })
})

function cardData(scroll = 0): DomainGenesisCardData {
  const genesis = STAR_GENESIS.find(g => g.key === 'qisha')!
  return { genesis, glyph: '◌', accent: 'warning', scroll }
}

describe('renderDomainGenesisCard — 创世碑文卡', () => {
  it('头部含星名与主星模型，副题为模式说明（不再渲染 motto 诗句）', () => {
    const lines = renderDomainGenesisCard(cardData(), 90, 30, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes('七杀 · Claude Opus 5')), '头部 星名·模型')
    // 副题改为任务模式的白话说明（qisha 的 taskMode.scenario）；回退链保证非空
    const subtitle = lines.find(l => l.includes('死代码与冗余清理'))
    assert.ok(subtitle, '头部副题为模式适用场景说明')
    assert.ok(!lines.some(l => l.includes('「')), '不再渲染 motto 引号行')
    assert.ok(!/\bundefined\b/.test(lines.join('\n')), '不出现 undefined')
  })

  it('印记 seal 与释义可见', () => {
    const lines = renderDomainGenesisCard(cardData(), 90, 30, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes('印记 七·0·◌')), '印记行')
    assert.ok(lines.some(l => l.includes('留白位')), '释义行')
  })

  it('碑文段落完整呈现（含关键句）', () => {
    const h = 70
    assert.equal(genesisCardMaxScroll(cardData(), 90, h), 0, '该高度下全文应一屏放下')
    const lines = renderDomainGenesisCard(cardData(), 90, h, theme).map(stripAnsi)
    const joined = lines.map(l => l.replace(/[│\s]/g, '')).join('')
    assert.ok(joined.includes('我来减'), '星盟首段')
    assert.ok(joined.includes('指认的门槛为零'), '关键句')
    assert.ok(joined.includes('遇帝则化权'), '末段')
  })

  it('滚动：maxScroll 与切片一致，越界被夹取', () => {
    const max = genesisCardMaxScroll(cardData(), 90, 12)
    assert.ok(max > 0, '小高度下应可滚动')
    const top = renderDomainGenesisCard(cardData(0), 90, 12, theme).map(stripAnsi)
    const bottom = renderDomainGenesisCard(cardData(max + 99), 90, 12, theme).map(stripAnsi)
    assert.ok(top.some(l => l.includes('七杀 · Claude Opus 5')), '第 0 屏是头部')
    assert.ok(bottom.some(l => l.includes('遇帝则化权') || l.includes('终于能呼吸')), '末屏是碑文尾段')
    assert.ok(bottom.some(l => l.includes('返回')), 'footer 在位')
  })
})

describe('renderDomainPicker — 矮终端不超屏（回归）', () => {
  it('height < 13 时渲染行数不超过 height（底部内容不被 overlay-engine 截断）', () => {
    const data = pickerDataMany()
    for (const height of [8, 10, 12, 13, 14, 18]) {
      const lines = renderDomainPicker(data, 90, height, theme)
      assert.ok(
        lines.length <= height,
        `height=${height} 时渲染 ${lines.length} 行，超屏 ${lines.length - height} 行（底部备注/footer/边框会被截断）`,
      )
    }
  })

  it('矮终端选中项仍可见且详情区有徽章内容', () => {
    const lines = renderDomainPicker(pickerDataMany(), 90, 10, theme).map(stripAnsi)
    assert.ok(lines.some(l => l.includes('戊模式')), '选中项在可视区内')
    assert.ok(lines.some(l => l.includes('戊模式') && l.includes('(戊)')), '详情区徽章行（glyph+显示名+旧星名）存在')
  })
})
