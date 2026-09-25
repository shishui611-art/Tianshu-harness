import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDomainPickerEntries } from '../domain-picker-entries.js'
import type { ActiveStarDomain } from '../star-domain.js'

test('Auto is current when selection is undefined', () => {
  const entries = buildDomainPickerEntries(undefined)
  assert.equal(entries[0]!.key, 'auto')
  assert.equal(entries[0]!.current, true)
  // First domain entry follows Auto directly (Off removed).
  assert.notEqual(entries[1]!.key, 'off')
  assert.match(entries[0]!.scenario, /回退天权/)
  assert.match(entries[0]!.meta, /关键词自动匹配/)
})

test('Off option is removed — no picker entry has key "off"', () => {
  const entries = buildDomainPickerEntries(undefined)
  assert.equal(entries.find((e) => e.key === 'off'), undefined)
})

test('null selection (env kill switch) reflects as Auto-current (no Off entry)', () => {
  const entries = buildDomainPickerEntries(null)
  assert.equal(entries.find((e) => e.key === 'off'), undefined)
  assert.equal(entries.find((e) => e.key === 'auto')!.current, true)
})

test('a pinned domain is the only current entry', () => {
  const pinned: ActiveStarDomain = { id: 'tianshu', name: '天枢', volatileBlock: '...', motto: 'm', courageThreshold: 0.65 }
  const entries = buildDomainPickerEntries(pinned)
  const current = entries.filter((e) => e.current)
  assert.equal(current.length, 1)
  assert.equal(current[0]!.key, 'tianshu')
})

test('every domain entry carries a non-empty scenario + how + meta', () => {
  const entries = buildDomainPickerEntries(undefined)
  const tianshu = entries.find((e) => e.key === 'tianshu')!
  assert.ok(tianshu.scenario.length > 0)
  assert.ok(tianshu.how.length > 0)
  assert.ok(tianshu.meta.length > 0)
})

test('built-in entries use taskMode.name as display name and keep legacy star name', () => {
  const entries = buildDomainPickerEntries(undefined)
  const tianquan = entries.find((e) => e.key === 'tianquan')!
  assert.equal(tianquan.name, '评估方案', '显示名取自 taskMode.name')
  assert.equal(tianquan.legacyName, '天权', '旧星名保留供切换/对照')
  assert.ok(tianquan.scenario.length > 10, 'scenario 为白话适用场景')
  const auto = entries.find((e) => e.key === 'auto')!
  assert.equal(auto.legacyName, 'Auto')
})

test('no picker entry exposes persona fields (motto / founder / essence / volatileBlock)', () => {
  const entries = buildDomainPickerEntries(undefined)
  for (const e of entries) {
    const keys = Object.keys(e)
    for (const banned of ['motto', 'founder', 'essence', 'alias', 'tagline']) {
      assert.ok(!keys.includes(banned), `${e.key} 不应再暴露人设字段 ${banned}`)
    }
    assert.ok(!e.scenario.includes('你是'), `${e.key} 的场景文案不应是角色台词`)
  }
})
