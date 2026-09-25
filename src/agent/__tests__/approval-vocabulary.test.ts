import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  HIDDEN_MODE_NOTE,
  TIER_HINT,
  UNATTENDED_SANDBOX_NOTE,
  formatPermissionChrome,
  formatPermissionLabel,
  formatTierLabel,
  modeToTier,
  parsePermissionAlias,
  tierToMode,
} from '../approval-vocabulary.js'

describe('modeToTier', () => {
  it('maps the three public wires', () => {
    assert.equal(modeToTier('manual'), 'supervise')
    assert.equal(modeToTier('auto-safe'), 'auto')
    assert.equal(modeToTier('dangerously-skip-permissions'), 'unattended')
  })

  it('treats auto-accept and unknown as 自动, not 全自动', () => {
    assert.equal(modeToTier('auto-accept'), 'auto')
    assert.equal(modeToTier(undefined), 'auto')
    assert.equal(modeToTier('suggest'), 'auto')
  })
})

describe('tierToMode', () => {
  it('never emits auto-accept', () => {
    assert.equal(tierToMode('supervise'), 'manual')
    assert.equal(tierToMode('auto'), 'auto-safe')
    assert.equal(tierToMode('unattended'), 'dangerously-skip-permissions')
  })
})

describe('parsePermissionAlias', () => {
  it('accepts old and new tokens', () => {
    assert.equal(parsePermissionAlias('manual'), 'supervise')
    assert.equal(parsePermissionAlias('supervise'), 'supervise')
    assert.equal(parsePermissionAlias('auto'), 'auto')
    assert.equal(parsePermissionAlias('default'), 'auto')
    assert.equal(parsePermissionAlias('yolo'), 'unattended')
    assert.equal(parsePermissionAlias('yes'), 'unattended')
    assert.equal(parsePermissionAlias('autonomous'), 'unattended')
    assert.equal(parsePermissionAlias('unattended'), 'unattended')
    assert.equal(parsePermissionAlias('YOLO'), 'unattended')
  })

  it('rejects auto-accept and junk', () => {
    assert.equal(parsePermissionAlias('auto-accept'), undefined)
    assert.equal(parsePermissionAlias('full'), undefined)
  })
})

describe('labels', () => {
  it('uses 请求批准 / 帮我批准 / 完全访问 as Chinese chrome (逐字)', () => {
    assert.equal(formatPermissionLabel('manual'), '请求批准')
    assert.equal(formatPermissionLabel('auto-safe'), '帮我批准')
    assert.equal(formatPermissionLabel('dangerously-skip-permissions'), '完全访问')
    assert.equal(formatPermissionLabel('auto-accept'), '帮我批准')
    assert.equal(formatPermissionChrome('dangerously-skip-permissions'), '完全访问')
    assert.equal(formatTierLabel('supervise'), '请求批准')
    assert.equal(formatTierLabel('auto'), '帮我批准')
    assert.equal(formatTierLabel('unattended'), '完全访问')
  })

  it('uses Request approval / Approve for me / Full access in English', () => {
    assert.equal(formatPermissionLabel('manual', 'en'), 'Request approval')
    assert.equal(formatPermissionLabel('auto-safe', 'en'), 'Approve for me')
    assert.equal(formatPermissionLabel('dangerously-skip-permissions', 'en'), 'Full access')
  })

  it('三档文案不再声称自动开沙箱（沙箱是显式 opt-in）', () => {
    const all = [
      TIER_HINT.zh.supervise, TIER_HINT.zh.auto, TIER_HINT.zh.unattended,
      TIER_HINT.en.supervise, TIER_HINT.en.auto, TIER_HINT.en.unattended,
      UNATTENDED_SANDBOX_NOTE.zh, UNATTENDED_SANDBOX_NOTE.en,
    ].join('\n')
    assert.doesNotMatch(all, /沙箱自动开启/, '不得再出现「沙箱自动开启」')
    assert.doesNotMatch(all, /写边界仍在/, '不得再出现「写边界仍在」')
    assert.doesNotMatch(all, /write sandbox stays on/, '不得再出现 write sandbox stays on')
    assert.doesNotMatch(all, /写沙箱仍开/, '不得再出现「写沙箱仍开」')
  })

  it('三档行为与表格逐条一致', () => {
    assert.equal(TIER_HINT.zh.supervise, '需要批准的操作先问用户。')
    assert.equal(TIER_HINT.zh.auto, '一般低风险操作自动执行，高风险仍问用户。')
    assert.equal(TIER_HINT.zh.unattended, '不弹批准确认；仍遵守已有拒绝规则和运行时自保护。')
  })

  it('hidden auto-accept 明示为历史别名', () => {
    assert.match(HIDDEN_MODE_NOTE.zh, /auto-accept/)
    assert.match(HIDDEN_MODE_NOTE.zh, /历史别名/)
    assert.equal(modeToTier('auto-accept'), 'auto')
  })
})
