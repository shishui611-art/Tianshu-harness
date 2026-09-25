/**
 * Shared star-domain picker entry builder.
 *
 * Single source of truth for the "Auto / <built-in & custom domains>"
 * selection list, consumed by BOTH the TUI domain-picker overlay (src/main.ts)
 * and the desktop server's GET /sessions/:id/domains route. Keeps the two
 * surfaces byte-identical instead of drifting copies.
 */
import { starDomainRegistry } from './star-domain-registry.js'
import { STAR_GENESIS } from './star-genesis-data.js'
import { domainDisplayName, domainScenario, domainHow, type ActiveStarDomain } from './star-domain.js'

/**
 * Shared warning shown when a star-domain is switched MID-SESSION. Swapping the
 * volatileBlock rewrites frozenBase, so the prefix cache is fully invalidated and
 * the next request rebuilds the whole context (~10x cost). New sessions / picking
 * a domain before the first turn pay nothing.
 */
export const DOMAIN_SWITCH_CACHE_WARNING =
  '⚠ 会话中途切换星域会使前缀缓存整体失效，下一次请求需全量重建上下文（成本约 10 倍+）。建议新开会话或在会话开始时选择。'

/** 选择器底部的常驻预防性备注（短版；切换后的忠告用上面的 WARNING）。 */
export const DOMAIN_SWITCH_CACHE_NOTE =
  '⚠ 会话内切换星域会打断前缀缓存，建议在新会话切换'

export interface DomainPickerEntry {
  /** Selection key: 'auto' | domain id. */
  key: string
  /**
   * 列表 + 详情区的显示名。内置域 = taskMode.name（如「项目统筹」）；custom 域
   * 无 taskMode 时回退星域名。**不再展示星名人格**——内部 id/旧星名仍可作输入。
   */
  name: string
  /** 内部 id / 旧星名（如 天权、tianquan）——切换输入仍接受，面板底部给出以便对照。 */
  legacyName: string
  /** 适用场景（taskMode.scenario，缺省回退 tagline）——「什么任务选它」。 */
  scenario: string
  /** 做法（taskMode.how）——「用它时按什么方式推进」。custom 域缺省时为空串。 */
  how: string
  /** Secondary dim meta: decisionStyle · keywords. */
  meta: string
  /** 一句话专长（star-genesis expertise；custom 域缺省回退 scenario）。 */
  expertise?: string
  /** Whether this is the session's current selection. */
  current: boolean
  uiPersona?: {
    separator: 'thin' | 'thick' | 'dots'
    accent: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'dim'
    glyph: string
  }
}

/**
 * Build the domain picker entries given the session's current domain state.
 *
 * User-selectable options: `Auto` + each built-in/custom domain. The `Off`
 * option was removed — a session with no persona is only reachable via the
 * `STAR_SOUL=0` env kill switch, not a picker choice.
 *
 * Tri-state mirrors AgentLoop.getSessionDomain():
 *  - `undefined` → Auto (per-message keyword match)
 *  - `null`      → no persona (env kill switch only; not user-selectable)
 *  - object      → a specific domain is pinned
 */
const DOMAIN_PINYIN_MAP: Record<string, string> = {
  auto: 'zìdòng',
  tianshu: 'tiānshū',
  pojun: 'pòjūn',
  tianfu: 'tiānfǔ',
  tianliang: 'tiānliáng',
  tianquan: 'tiānquán',
  tianji: 'tiānjī',
  tianxuan: 'tiānxuán',
  fu: 'fǔ',
  wenqu: 'wénqǔ',
  kaiyang: 'kāiyáng',
  yaoguang: 'yáoguāng',
  huagai: 'huágài',
  qiming: 'qǐmíng',
  changgeng: 'chánggēng',
  qisha: 'qīshā',
}

export function buildDomainPickerEntries(
  current: ActiveStarDomain | null | undefined,
): DomainPickerEntry[] {
  return [
    {
      key: 'auto',
      name: '自动匹配',
      legacyName: 'Auto',
      scenario: '不确定该用哪种做法时——按每条消息的内容匹配最合适的模式；未命中时回退天权（评估方案）。',
      how: '关键词自动路由；也可随时用 /task-mode <显示名|ID|旧星名> 手动钉定。',
      meta: 'zìdòng · 关键词自动匹配',
      current: current === undefined || current === null,
      uiPersona: { separator: 'thin', accent: 'primary', glyph: '❂' },
    },
    ...starDomainRegistry.list().map((d) => {
      const pinyin = DOMAIN_PINYIN_MAP[d.id] ?? d.id
      const genesis = STAR_GENESIS.find((g) => g.key === d.id)
      const scenario = domainScenario(d)
      const how = domainHow(d)
      return {
        key: d.id,
        name: domainDisplayName(d),
        legacyName: d.name,
        // custom 域缺 taskMode → scenario 回退 tagline；两者都空时用 expertise/meta，
        // 保证面板不出现空白的适用场景行。
        scenario: scenario || genesis?.expertise || `${pinyin} · ${d.id}`,
        how,
        meta: `${pinyin} · ${d.keywords.slice(0, 4).join(',')}`,
        expertise: genesis?.expertise,
        current: current != null && current.id === d.id,
        uiPersona: d.uiPersona,
      }
    }),
  ]
}
