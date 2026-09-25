/**
 * Domain Picker overlay 渲染——从 overlay.ts 沿接缝拆分（overlay.ts 行数棘轮）。
 *
 * 列表（cursor + current 标记 + 星名 + 工程别名 + 职责标语）→ 分隔线 →
 * 详情区（别名徽章 / 职责标语+创始星 / motto / 提示词精华 essence 多行）。
 * 列表带滚动窗口（scrollWindowWithIndicators）：选中项恒可见，截断处留指示行。
 * 应用后只写单行确认，完整方法论照常由引擎注入（UI 不转储 volatileBlock）。
 */
import { color } from '../engine/ansi.js'
import type { RivetTheme } from '../theme.js'
import stringWidth from 'string-width'
import { DOMAIN_SWITCH_CACHE_NOTE } from '../../agent/domain-picker-entries.js'
import {
  frameTop as formatBorder,
  frameBottom as formatBottomBorder,
  frameFooter as formatFooter,
  frameLine as padLine,
  CURSOR,
} from './overlay-frame.js'
import {
  compactHints,
  renderTabBar,
  wrapToWidth,
  scrollWindowWithIndicators,
} from './overlay.js'

export interface DomainPickerEntry {
  /** 选择键：'auto' | domain id */
  key: string
  /** 显示名（内置域 = taskMode.name，如「项目统筹」；custom 域回退星域名） */
  name: string
  /** 内部 id / 旧星名（如 天权、tianquan）——仅供对照与切换输入，不参与主要展示 */
  legacyName: string
  /** 适用场景（什么任务选它） */
  scenario: string
  /** 做法（用它时按什么方式推进） */
  how: string
  /** 次要元信息（dim）：decisionStyle · keywords */
  meta: string
  /** 一句话专长（star-genesis；custom 域缺省） */
  expertise?: string
  /** 是否为当前生效项 */
  current: boolean
  uiPersona?: {
    separator: 'thin' | 'thick' | 'dots'
    accent: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'dim'
    glyph: string
  }
}

export interface DomainPickerData {
  entries: DomainPickerEntry[]
  selectedIndex: number
}

const ANSI_RE = /\x1B\[[0-9;]*[a-zA-Z]/g
function stripAnsiPlain(s: string): string {
  return s.replace(ANSI_RE, '')
}

/**
 * 渲染 Domain Picker overlay（CC 风星域选择器）。
 */
export function renderDomainPicker(data: DomainPickerData, width: number, height: number, theme: RivetTheme): string[] {
  const lines: string[] = []
  lines.push(formatBorder(width, theme, 'subtle'))
  lines.push(renderTabBar('domain', width, theme))

  const innerWidth = width - 4 // padLine 占 2，左右各留 1 空隙
  const contentRows = Math.max(3, height - 4) // border + title + footer + bottom
  // 详情区（提示词精华）上限 8 行，随 contentRows 收缩（下限 1：徽章行）——
  // 保证 listRows + detailRows + 固定 6 行 ≤ height，矮终端不超屏（2026-08 回归）。
  const detailRows = Math.min(8, Math.max(1, contentRows - 6))
  const listRows = Math.max(1, contentRows - detailRows - 2) // 分隔线 + 缓存备注行

  const sel = data.selectedIndex
  const current = data.entries[sel]
  const currentAccentKey = current?.uiPersona?.accent ?? 'primary'
  const currentAccent = (theme as any)[currentAccentKey] ?? theme.primary

  // 列表滚动窗口：选中项恒可见，截断处留指示行（指示行仅在行数装得下时显示，
  // 防矮终端 listRows=1 时 ↑+选中+↓ 撑破预算——2026-08 超屏回归）。
  const win = scrollWindowWithIndicators(data.entries.map(() => 1), sel, listRows)
  const winRows = win.end - win.start
  let row = 0
  if (win.start > 0 && row + 1 + winRows <= listRows) {
    lines.push(padLine(` ${color('↑ 更多', theme.dim)}`, width, theme))
    row++
  }
  for (let i = win.start; i < win.end; i++) {
    const e = data.entries[i]!
    const selected = i === sel
    const eAccentKey = e.uiPersona?.accent ?? 'primary'
    const eAccent = (theme as any)[eAccentKey] ?? theme.primary
    const eGlyph = e.uiPersona?.glyph ?? '●'

    const cursor = selected ? color(CURSOR, currentAccent, { bold: true }) : ' '
    const mark = e.current ? color(eGlyph, eAccent, { bold: true }) : selected ? color(eGlyph, currentAccent) : color(eGlyph, theme.dim)
    const name = selected ? color(e.name, currentAccent, { bold: true }) : color(e.name, theme.secondary)
    // 行内：旧星名/ID 对照 + 适用场景首段——一眼看懂这个模式干什么。做法移入详情区。
    const legacy = e.legacyName && e.legacyName !== e.name ? color(` (${e.legacyName})`, theme.dim) : ''
    const head = `${cursor} ${mark} ${name}${legacy}`
    const headWidth = width - 2 - (selected ? 1 : 0)
    const scenarioRoom = headWidth - stringWidth(stripAnsiPlain(head)) - 2
    if (e.scenario && scenarioRoom > 8) {
      lines.push(padLine(`${head}  ${color(e.scenario.slice(0, scenarioRoom), theme.dim)}`, width, theme))
    } else {
      lines.push(padLine(head, width, theme))
    }
    row++
  }
  if (win.end < data.entries.length && row + 1 <= listRows) {
    lines.push(padLine(` ${color('↓ 更多', theme.dim)}`, width, theme))
    row++
  }
  for (; row < listRows; row++) {
    lines.push(padLine('', width, theme))
  }

  // 分隔线自适应强调色与样式
  const sepChar = current?.uiPersona?.separator === 'dots'
    ? '·'
    : current?.uiPersona?.separator === 'thick'
      ? '━'
      : '─'
  lines.push(padLine(` ${color(sepChar.repeat(Math.max(0, innerWidth - 1)), currentAccent)}`, width, theme))

  // 详情区：显示名 → 适用场景 → 做法（均为白话描述，不含座右铭/创始星/角色台词）
  const previewLines: string[] = []
  if (current) {
    const glyph = current.uiPersona?.glyph ?? '●'
    previewLines.push(color(`  ${glyph}  ${current.name}`, currentAccent, { bold: true }))

    const idLine = current.legacyName && current.legacyName !== current.name
      ? `  ${current.legacyName}${current.key !== 'auto' ? ` · ${current.key}` : ''}`
      : current.key !== 'auto' ? `  ${current.key}` : ''
    if (idLine) previewLines.push(color(idLine.trimEnd(), theme.dim))

    previewLines.push(` ${color('适用场景', theme.secondary, { bold: true })}`)
    for (const w of wrapToWidth(current.scenario || current.expertise || '', innerWidth - 1, 3)) {
      if (previewLines.length < detailRows) previewLines.push(`  ${color(w, theme.muted)}`)
    }
    if (current.how) {
      if (previewLines.length < detailRows) {
        previewLines.push(` ${color('做法', theme.secondary, { bold: true })}`)
      }
      for (const w of wrapToWidth(current.how, innerWidth - 1, Math.max(1, detailRows - previewLines.length))) {
        if (previewLines.length < detailRows) previewLines.push(`  ${color(w, theme.muted)}`)
      }
    }
  }

  for (let i = 0; i < detailRows; i++) {
    lines.push(padLine(previewLines[i] ?? '', width, theme))
  }

  // 常驻备注：切换星域的缓存代价（预防性提示，切换后的忠告见 slash-commands）。
  lines.push(padLine(` ${color(DOMAIN_SWITCH_CACHE_NOTE, theme.dim)}`, width, theme))

  lines.push(formatFooter(compactHints([['←/→', '切换'], ['↑↓', '选择'], ['Enter', '应用'], ['g', '说明'], ['S', '设为默认'], ['Esc', '取消']]), width, theme, 'subtle'))
  lines.push(formatBottomBorder(width, theme, 'subtle'))
  return lines
}
