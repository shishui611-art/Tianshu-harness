/**
 * 对外权限词表 — 零依赖叶子。
 *
 * 后端 ApprovalMode 四枚举不动。对外只暴露三档：
 *   请求批准 / 帮我批准 / 完全访问（en: Request approval / Approve for me / Full access）
 *
 * 桌面经 src/server/ui-shared 消费；禁止从此文件 import 运行时模块。
 * 规格：docs/specs/2026-08-25-权限词统一.md
 */

export const PERMISSION_TIERS = ['supervise', 'auto', 'unattended'] as const
export type PermissionTier = (typeof PERMISSION_TIERS)[number]

/** 与 loop-types.ApprovalMode 字面量对齐，本叶子不 import 以免拖运行时。 */
export type ApprovalWireMode =
  | 'auto-accept'
  | 'auto-safe'
  | 'manual'
  | 'dangerously-skip-permissions'

export type PermissionLang = 'zh' | 'en'

export const TIER_TO_WIRE: Record<PermissionTier, ApprovalWireMode> = {
  supervise: 'manual',
  auto: 'auto-safe',
  unattended: 'dangerously-skip-permissions',
}

export const TIER_LABEL: Record<PermissionLang, Record<PermissionTier, string>> = {
  zh: { supervise: '请求批准', auto: '帮我批准', unattended: '完全访问' },
  en: { supervise: 'Request approval', auto: 'Approve for me', unattended: 'Full access' },
}

/**
 * 三档行为说明。文案与代码一致，尤其「完全访问」**不得**声称会自动开沙箱：
 *   - 沙箱只在显式配置时请求开启：`sandboxRequested()` 判定
 *     `RIVET_SANDBOX === '1' || 'learn'`（src/tools/sandbox-profile.ts:389-390）；
 *     见 src/tools/bash.ts:249-252 的 wrapSandboxCommand 头注「Default-OFF.
 *     Enable with RIVET_SANDBOX=1.」；
 *   - 批准档位不再驱动沙箱：applySandboxPolicyForApprovalMode 已是 no-op
 *     （sandbox-profile.ts:426-433，「Approval mode no longer drives the sandbox」）；
 *   - 即便显式请求，是否有真实内核写边界仍取决于运行环境：selectSandboxBackend
 *     （sandbox-profile.ts:351）在原生 Windows 恒返回 'none'（:590-599 的
 *     'native Windows has no lightweight kernel FS sandbox'）；后端缺失时
 *     getSandboxStartupNotice 只发一条 warn（:480-488）。
 * 因此「完全访问」的正确表述是「不弹批准确认」，写边界一层要么取决于用户显式配置，
 * 要么根本不存在——由已有的拒绝规则与运行时自保护兜底。
 */
export const TIER_HINT: Record<PermissionLang, Record<PermissionTier, string>> = {
  zh: {
    supervise: '需要批准的操作先问用户。',
    auto: '一般低风险操作自动执行，高风险仍问用户。',
    unattended: '不弹批准确认；仍遵守已有拒绝规则和运行时自保护。',
  },
  en: {
    supervise: 'Ask the user before any operation that needs approval.',
    auto: 'Run ordinary low-risk operations directly; still ask for high-risk ones.',
    unattended: 'No approval prompts; existing deny rules and runtime self-protection still apply.',
  },
}

/**
 * 「完全访问」档的行为补充说明（写给需要知道兜底细节的用户）。
 *
 * 沙箱不是本档自动带来的：它只在显式配置时请求开启（RIVET_SANDBOX=1 / 配置项），
 * 且是否有可用后端取决于运行环境（原生 Windows 无内核写边界）。不要把这条读成
 * 「本档自动开沙箱」——那是本文件 2026-09 修正前的过时文案。
 */
export const UNATTENDED_SANDBOX_NOTE: Record<PermissionLang, string> = {
  zh: '写沙箱不会因本档自动开启：仅在你显式配置时请求开启，且是否生效取决于运行环境。回滚是兜底。',
  en: 'No write sandbox is turned on by this tier; it is opt-in via explicit config and depends on the host. Rollback is the safety net.',
}

/**
 * 隐藏/兼容模式的说明。`auto-accept` 是历史别名（不属于对外三档，
 * parsePermissionAlias 也不接受它），modeToTier 把它映射到 auto（帮我批准）——
 * 它**不是**「帮我批准」的第四档，只是旧配置里可能残留的 wire 值。
 */
export const HIDDEN_MODE_NOTE: Record<PermissionLang, string> = {
  zh: 'auto-accept 是历史别名（wire 值），显示与行为同「帮我批准」，不属于对外三档。',
  en: 'auto-accept is a legacy alias (wire value); it shows and behaves as "Approve for me" and is not a fourth tier.',
}

const ALIAS_TO_TIER: Record<string, PermissionTier> = {
  supervise: 'supervise',
  manual: 'supervise',
  auto: 'auto',
  default: 'auto',
  unattended: 'unattended',
  yolo: 'unattended',
  yes: 'unattended',
  autonomous: 'unattended',
}

export function modeToTier(mode: string | undefined): PermissionTier {
  switch (mode) {
    case 'manual':
      return 'supervise'
    case 'dangerously-skip-permissions':
      return 'unattended'
    case 'auto-accept':
    case 'auto-safe':
    default:
      return 'auto'
  }
}

export function tierToMode(tier: PermissionTier): ApprovalWireMode {
  return TIER_TO_WIRE[tier]
}

/** 解析用户敲的档位词。`auto-accept` 是隐档，不进三档别名。 */
export function parsePermissionAlias(token: string): PermissionTier | undefined {
  const key = token.trim().toLowerCase()
  return ALIAS_TO_TIER[key]
}

export function formatPermissionLabel(
  mode: string | undefined,
  lang: PermissionLang = 'zh',
): string {
  return TIER_LABEL[lang][modeToTier(mode)]
}

export function formatTierLabel(tier: PermissionTier, lang: PermissionLang = 'zh'): string {
  return TIER_LABEL[lang][tier]
}

/** TUI 底栏 / 欢迎屏用的短标签（与选择器主词同一套）。 */
export function formatPermissionChrome(mode: string | undefined, lang: PermissionLang = 'zh'): string {
  return formatPermissionLabel(mode, lang)
}

export const PERMISSION_PICKER_TIERS: readonly PermissionTier[] = PERMISSION_TIERS
