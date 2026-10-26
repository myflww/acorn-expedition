// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { SPECIAL_CAMPAIGN_IDS } from '../src/special-campaigns.js'
import {
  ELDER_AID_FAILURE_THRESHOLD,
  ELDER_AID_OFFER,
  ELDER_AID_SHOT_COUNT,
  FAILURE_AID_VERSION,
  FAILURE_REASONS,
  claimElderAid,
  createFailureAidState,
  describeLevelFailure,
  failureAidLevelIdentity,
  isElderAidAvailable,
  normalizeFailureAidState,
  recordLevelFailure,
  syncFailureAidLevel,
} from '../src/failure-aid.js'

const mainLevel = { mode: 'main', level: 7, runSeed: 20260901 }

function failRepeatedly(context, count, initialState) {
  let state = initialState
  let result = null
  for (let index = 0; index < count; index += 1) {
    result = recordLevelFailure(state, context)
    state = result.state
  }
  return result
}

test('creates stable identities for every mode and all five independent special campaigns', () => {
  assert.equal(failureAidLevelIdentity(mainLevel), 'main:7:20260901')
  assert.equal(failureAidLevelIdentity({ mode: 'endless', level: 42, seed: 9 }), 'endless:42:9')
  assert.equal(failureAidLevelIdentity({ mode: 'daily', stage: 2, levelSeed: 20260901 }), 'daily:2:20260901')
  for (const campaignId of SPECIAL_CAMPAIGN_IDS) {
    assert.equal(
      failureAidLevelIdentity({ mode: 'special', campaignId, level: 3, runSeed: 88 }),
      `special:${campaignId}:3:88`,
    )
  }
  assert.equal(failureAidLevelIdentity({ mode: 'special', campaignId: 'invented', level: 1 }), null)
  assert.equal(failureAidLevelIdentity({ mode: 'arcade', level: 1 }), null)
  assert.equal(failureAidLevelIdentity({ mode: 'main', level: 0 }), null)
  assert.deepEqual(createFailureAidState(mainLevel), {
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 0,
    elderAidOffered: false,
    elderAidClaimed: false,
  })
  assert.ok(Object.isFrozen(createFailureAidState()))
})

test('gives transparent mode, level, reason, facts, and actionable copy', () => {
  const mainHint = describeLevelFailure({
    ...mainLevel,
    remainingTargetCount: 2,
    collapseRatio: 0.31,
    requiredCollapseRatio: 0.45,
  })
  assert.equal(mainHint.reason, FAILURE_REASONS.TARGETS_REMAIN)
  assert.equal(mainHint.levelLabel, '主线 · 7/18')
  assert.match(mainHint.summary, /2 只松鼠/)
  assert.deepEqual(mainHint.facts, [
    { label: '剩余松鼠', value: '2 只' },
    { label: '建筑破坏', value: '31% / 要求 45%' },
  ])
  assert.match(mainHint.message, /主线重试不会改变本关基础配置/)

  const endlessHint = describeLevelFailure({
    mode: 'endless', level: 55, runSeed: 4, reason: 'boss-survived', bossHpRemaining: 12, bossMaxHp: 30,
  })
  assert.equal(endlessHint.reasonLabel, 'Boss 未被击败')
  assert.match(endlessHint.levelLabel, /第 55 层/)
  assert.deepEqual(endlessHint.facts, [{ label: 'Boss 剩余生命', value: '12 / 30' }])
  assert.match(endlessHint.message, /无尽后期/)

  const dailyHint = describeLevelFailure({
    mode: 'daily', level: 1, runSeed: 20260901, reason: 'score-shortfall', score: 8100, parScore: 9000,
  })
  assert.match(dailyHint.summary, /900 分/)
  assert.match(dailyHint.message, /今日的规则与随机种子保持不变/)

  const specialHint = describeLevelFailure({
    mode: 'special', campaignId: 'polar-clocktower', level: 1, runSeed: 7,
    reason: 'collapse-shortfall', collapseRatio: 0.18, requiredCollapseRatio: 0.24,
  })
  assert.match(specialHint.levelLabel, /极夜钟楼.*霜齿之门/)
  assert.match(specialHint.summary, /还差 6%/)
  assert.match(specialHint.message, /本秘境机制/)
  assert.ok(Object.isFrozen(specialHint))
  assert.ok(Object.isFrozen(specialHint.facts))
  assert.ok(Object.isFrozen(specialHint.recommendations))
})

test('derives the failure reason when the runtime does not provide one', () => {
  assert.equal(describeLevelFailure({ ...mainLevel, bossAlive: true }).reason, FAILURE_REASONS.BOSS_SURVIVED)
  assert.equal(describeLevelFailure({ ...mainLevel, remainingTargets: 1 }).reason, FAILURE_REASONS.TARGETS_REMAIN)
  assert.equal(describeLevelFailure({
    ...mainLevel, collapseRatio: 0.2, requiredCollapseRatio: 0.4,
  }).reason, FAILURE_REASONS.COLLAPSE_SHORTFALL)
  assert.equal(describeLevelFailure({
    ...mainLevel, score: 20, requiredScore: 100,
  }).reason, FAILURE_REASONS.SCORE_SHORTFALL)
  assert.equal(describeLevelFailure({ ...mainLevel, ammoDepleted: true }).reason, FAILURE_REASONS.AMMO_DEPLETED)
  assert.equal(describeLevelFailure(mainLevel).reason, FAILURE_REASONS.OBJECTIVE_INCOMPLETE)
})

test('offers elder aid exactly once when the same level reaches three consecutive failures', () => {
  assert.equal(ELDER_AID_FAILURE_THRESHOLD, 3)
  const first = recordLevelFailure(undefined, mainLevel)
  const second = recordLevelFailure(first.state, mainLevel)
  const third = recordLevelFailure(second.state, mainLevel)
  const fourth = recordLevelFailure(third.state, mainLevel)

  assert.equal(first.state.consecutiveFailures, 1)
  assert.equal(first.failuresUntilAid, 2)
  assert.equal(second.state.consecutiveFailures, 2)
  assert.equal(second.shouldOfferElderAid, false)
  assert.equal(third.state.consecutiveFailures, 3)
  assert.equal(third.aidEligible, true)
  assert.equal(third.shouldOfferElderAid, true)
  assert.deepEqual(third.offer, ELDER_AID_OFFER)
  assert.equal(fourth.state.consecutiveFailures, 4)
  assert.equal(fourth.aidEligible, true)
  assert.equal(fourth.shouldOfferElderAid, false)
  assert.equal(isElderAidAvailable(fourth.state, mainLevel), true)
})

test('claim selects only current-level acorns and explicitly excludes aid from reserve stars', () => {
  const ready = failRepeatedly(mainLevel, 3).state
  const input = {
    ...mainLevel,
    availableBirdTypes: ['frost', 'bomb', 'red', 'frost', 'golden', '', {}, null],
  }
  const first = claimElderAid(ready, input)
  const deterministicRepeat = claimElderAid(ready, structuredClone(input))

  assert.equal(first.ok, true)
  assert.equal(first.reason, 'aid-claimed')
  assert.equal(first.addedAcorns, ELDER_AID_SHOT_COUNT)
  assert.equal(first.queue.length, 2)
  assert.deepEqual(first.queue, deterministicRepeat.queue)
  assert.equal(first.queue.every((type) => ['frost', 'bomb', 'red'].includes(type)), true)
  assert.equal(first.queueEntries.every((entry) => (
    entry.source === 'elder-aid'
    && entry.bonus === true
    && entry.bonusShot === true
    && entry.countsForReserveStars === false
    && entry.countsForReserveBonus === false
  )), true)
  assert.equal(first.state.elderAidClaimed, true)
  assert.equal(isElderAidAvailable(first.state, mainLevel), false)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.queue))
  assert.ok(Object.isFrozen(first.queueEntries[0]))
})

test('the same level cannot claim twice and an empty pool never fabricates ammunition', () => {
  const ready = failRepeatedly(mainLevel, 3).state
  const empty = claimElderAid(ready, { ...mainLevel, ammoPool: ['golden', '', null] })
  assert.equal(empty.ok, false)
  assert.equal(empty.reason, 'empty-ammo-pool')
  assert.equal(empty.state.elderAidClaimed, false)
  assert.deepEqual(empty.queue, [])

  const claimed = claimElderAid(ready, { ...mainLevel, ammoPool: ['vine'] })
  assert.deepEqual(claimed.queue, ['vine', 'vine'])
  const repeated = claimElderAid(claimed.state, { ...mainLevel, ammoPool: ['bomb'] })
  assert.equal(repeated.ok, false)
  assert.equal(repeated.reason, 'aid-already-claimed')
  assert.deepEqual(repeated.queue, [])
})

test('switching level identity resets streak, offer, and claim state', () => {
  const claimed = claimElderAid(
    failRepeatedly(mainLevel, 3).state,
    { ...mainLevel, ammoPool: ['red'] },
  )
  const nextLevel = { mode: 'main', level: 8, runSeed: mainLevel.runSeed }
  const switched = syncFailureAidLevel(claimed.state, nextLevel)
  assert.equal(switched.levelIdentity, 'main:8:20260901')
  assert.equal(switched.consecutiveFailures, 0)
  assert.equal(switched.elderAidOffered, false)
  assert.equal(switched.elderAidClaimed, false)

  const firstNextFailure = recordLevelFailure(claimed.state, nextLevel)
  assert.equal(firstNextFailure.state.consecutiveFailures, 1)
  assert.equal(firstNextFailure.shouldOfferElderAid, false)

  const sameAuthoredLevelNewRun = syncFailureAidLevel(claimed.state, {
    ...mainLevel, runSeed: mainLevel.runSeed + 1,
  })
  assert.equal(sameAuthoredLevelNewRun.consecutiveFailures, 0)

  const wrongLevelClaim = claimElderAid(claimed.state, { ...nextLevel, ammoPool: ['red'] })
  assert.equal(wrongLevelClaim.reason, 'level-changed')
  assert.equal(wrongLevelClaim.state.levelIdentity, 'main:8:20260901')
  assert.equal(wrongLevelClaim.state.consecutiveFailures, 0)
})

test('normalization is frozen, mutation-independent, and strips polluted or impossible fields', () => {
  const raw = {
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 3.9,
    elderAidOffered: true,
    elderAidClaimed: true,
    privileged: true,
  }
  const normalized = normalizeFailureAidState(raw)
  raw.consecutiveFailures = 99
  raw.elderAidClaimed = false
  assert.deepEqual(normalized, {
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 3,
    elderAidOffered: true,
    elderAidClaimed: true,
  })
  assert.equal('privileged' in normalized, false)
  assert.ok(Object.isFrozen(normalized))

  assert.deepEqual(normalizeFailureAidState({
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 2,
    elderAidOffered: true,
    elderAidClaimed: true,
  }), {
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 2,
    elderAidOffered: false,
    elderAidClaimed: false,
  })
  assert.equal(normalizeFailureAidState({ version: 99 }).levelIdentity, null)
  assert.equal(normalizeFailureAidState({
    version: FAILURE_AID_VERSION,
    levelIdentity: 'main:07:20260901',
    consecutiveFailures: 3,
  }).levelIdentity, null)

  const inherited = Object.create({
    levelIdentity: 'main:7:20260901',
    consecutiveFailures: 99,
    elderAidOffered: true,
  })
  inherited.version = FAILURE_AID_VERSION
  assert.equal(normalizeFailureAidState(inherited).levelIdentity, null)
})

test('invalid failure calls fail closed and do not mutate existing valid state', () => {
  const existing = failRepeatedly(mainLevel, 2).state
  const invalid = recordLevelFailure(existing, { mode: 'special', campaignId: '__proto__', level: 1 })
  assert.equal(invalid.ok, false)
  assert.deepEqual(invalid.state, existing)
  assert.equal(invalid.shouldOfferElderAid, false)

  const premature = claimElderAid(existing, { ...mainLevel, ammoPool: ['red'] })
  assert.equal(premature.ok, false)
  assert.equal(premature.reason, 'threshold-not-reached')
})
