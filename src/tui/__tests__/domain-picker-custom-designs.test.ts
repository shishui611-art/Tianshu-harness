import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderDomainPicker, renderModelPicker, renderThemePicker } from '../format/overlay.js'
import type { DomainPickerData, ModelPickerData, ThemePickerData } from '../format/overlay.js'
import { getTheme } from '../theme.js'

const theme = getTheme()

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
}

describe('renderTabBar UI Integration', () => {
  it('renders standard centered Tab Bar in all three pickers', () => {
    const dData: DomainPickerData = {
      entries: [
        { key: 'auto', name: '自动匹配', legacyName: 'Auto', scenario: '自动', how: '', meta: 'meta', current: true },
      ],
      selectedIndex: 0,
    }
    const mData: ModelPickerData = {
      entries: [{ id: 'gpt-5.5', provider: 'openai', current: true }],
      selectedIndex: 0,
    }
    const tData: ThemePickerData = {
      entries: [{ name: 'cobalt', current: true, isDefault: false, description: '钴蓝' }],
      selectedIndex: 0,
    }

    const dLines = renderDomainPicker(dData, 80, 15, theme)
    const mLines = renderModelPicker(mData, 80, 15, theme)
    const tLines = renderThemePicker(tData, 80, 15, theme)

    // All pickers should now have the centered Tab Bar indicating Domain, Model, and Theme tabs
    assert.ok(dLines.some(l => stripAnsi(l).includes('Domain') && stripAnsi(l).includes('Model') && stripAnsi(l).includes('Theme')))
    assert.ok(mLines.some(l => stripAnsi(l).includes('Domain') && stripAnsi(l).includes('Model') && stripAnsi(l).includes('Theme')))
    assert.ok(tLines.some(l => stripAnsi(l).includes('Domain') && stripAnsi(l).includes('Model') && stripAnsi(l).includes('Theme')))
  })
})

describe('renderDomainPicker Star Domain Custom Designs', () => {
  it('renders custom star domain glyph, separator and accent color', () => {
    const data: DomainPickerData = {
      entries: [
        {
          key: 'tianshu',
          name: '项目统筹',
          legacyName: '天枢',
          scenario: '跨模块或跨文件的改动、需要权衡架构取舍的规划。',
          how: '先建全局视图再动手，把复杂任务拆成可独立验证的单元。',
          meta: 'methodical',
          current: true,
          uiPersona: { separator: 'thin', accent: 'secondary', glyph: '✹' },
        },
        {
          key: 'pojun',
          name: '探索新方案',
          legacyName: '破军',
          scenario: '边界未知、需要快速试错探明可行性的任务。',
          how: '选一条最短路径先验证，失败即边界信息。',
          meta: 'bold',
          current: false,
          uiPersona: { separator: 'thick', accent: 'error', glyph: '✷' },
        },
      ],
      selectedIndex: 0,
    }

    const lines = renderDomainPicker(data, 80, 15, theme)
    assert.ok(lines.length > 0)
    
    // Check that Tianshu glyph is rendered in the list
    assert.ok(lines.some(l => stripAnsi(l).includes('✹')))
    // Check that Pojun glyph is rendered in the list
    assert.ok(lines.some(l => stripAnsi(l).includes('✷')))

    // Verify Tianshu divider is '─' (thin)
    const hasThinDivider = lines.some(l => stripAnsi(l).includes('───') && !stripAnsi(l).includes('✹'))
    assert.ok(hasThinDivider)

    // 任务模式改版：详情区徽章行带 glyph+显示名，改为「适用场景 / 做法」两段白话描述
    assert.ok(lines.some(l => stripAnsi(l).includes('✹') && stripAnsi(l).includes('项目统筹')), '徽章行应含 glyph 与显示名')
    assert.ok(lines.some(l => stripAnsi(l).includes('适用场景')), '详情区含适用场景')
    assert.ok(lines.some(l => stripAnsi(l).includes('做法')), '详情区含做法')
    // 人设退场：座右铭、创始星、角色台词不再出现在面板任何一行
    assert.ok(!lines.some(l => stripAnsi(l).includes('「')), '不再渲染 motto 引号行')
  })

  it('adapts divider line for Pojun style (thick / ━)', () => {
    const data: DomainPickerData = {
      entries: [
        {
          key: 'pojun',
          name: '探索新方案',
          legacyName: '破军',
          scenario: '边界未知、需要快速试错的任务。',
          how: '选一条最短路径先验证。',
          meta: 'bold',
          current: true,
          uiPersona: { separator: 'thick', accent: 'error', glyph: '✷' },
        },
      ],
      selectedIndex: 0,
    }

    const lines = renderDomainPicker(data, 80, 15, theme)
    // Pojun is selected, divider should render thick style '━'
    const hasThickDivider = lines.some(l => stripAnsi(l).includes('━━━'))
    assert.ok(hasThickDivider)
  })
})
