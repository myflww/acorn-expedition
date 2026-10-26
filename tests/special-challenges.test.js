// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SPECIAL_CHALLENGE_DEFINITIONS,
  SPECIAL_CHALLENGE_EVENT_TYPES,
  SPECIAL_CHALLENGE_FIRST_CLEAR_REWARD,
  SPECIAL_CHALLENGE_IDS,
  consumeSpecialChallengeEvent,
  createSpecialChallengeState,
  deserializeSpecialChallengeRecords,
  deserializeSpecialChallengeState,
  getSpecialChallengeDefinition,
  normalizeSpecialChallengeRecords,
  recordSpecialChallengeCompletion,
  serializeSpecialChallengeRecords,
  serializeSpecialChallengeState,
  summarizeSpecialChallenge,
} from '../src/special-challenges.js'

function challenge(campaignId, stageNumber) {
  const state = createSpecialChallengeState({ campaignId, stageNumber })
  assert.ok(state, `missing challenge for ${campaignId}:${stageNumber}`)
  return state
}

function consume(state, ...events) {
  return events.reduce((current, event) => consumeSpecialChallengeEvent(current, event), state)
}

function taggedEvent(type, tag, id, extra = {}) {
  return { type, tags: [tag], targetId: id, ...extra }
}

test('the authored registry exposes exactly the eleven optional special-stage contracts', () => {
  assert.equal(SPECIAL_CHALLENGE_DEFINITIONS.length, 11)
  assert.equal(SPECIAL_CHALLENGE_IDS.length, 11)
  assert.equal(new Set(SPECIAL_CHALLENGE_IDS).size, 11)
  assert.ok(Object.isFrozen(SPECIAL_CHALLENGE_DEFINITIONS))
  assert.ok(Object.isFrozen(SPECIAL_CHALLENGE_DEFINITIONS[0].parameters))
  assert.ok(SPECIAL_CHALLENGE_DEFINITIONS.every((entry) => (
    entry.requiredForClear === false
      && entry.rewardGold === SPECIAL_CHALLENGE_FIRST_CLEAR_REWARD
      && typeof entry.badgeId === 'string'
  )))
  assert.equal(createSpecialChallengeState({ campaignId: 'polar-clocktower', stageNumber: 1 }), null)
  assert.equal(getSpecialChallengeDefinition('missing', 2), null)
})

test('all challenge states initialize as frozen, JSON-safe active records', () => {
  for (const definition of SPECIAL_CHALLENGE_DEFINITIONS) {
    const state = challenge(definition.campaignId, definition.stageNumber)
    assert.equal(state.challengeId, definition.id)
    assert.equal(state.status, 'active')
    assert.equal(state.revision, 0)
    assert.equal(state.failureCode, null)
    assert.ok(Object.isFrozen(state))
    assert.ok(Object.isFrozen(state.counters))
    assert.ok(Object.isFrozen(state.progress))
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state)
  }
})

test('the unified consumer is immutable, ignores unsupported events, and counts shared events', () => {
  const initial = challenge('tidebound-undercity', 2)
  assert.ok(SPECIAL_CHALLENGE_EVENT_TYPES.includes('shot-settled'))
  assert.equal(consumeSpecialChallengeEvent(initial, { type: 'unknown' }), initial)
  assert.equal(consumeSpecialChallengeEvent(initial, null), initial)

  const next = consume(initial,
    { type: 'shot-launched', shotId: 'shot-1' },
    { type: 'shot-settled', shotId: 'shot-1' },
    { type: 'score-changed', stageScore: 1234 },
  )
  assert.notEqual(next, initial)
  assert.equal(initial.counters.shotsLaunched, 0)
  assert.equal(next.counters.shotsLaunched, 1)
  assert.equal(next.counters.shotsSettled, 1)
  assert.equal(next.counters.stageScore, 1234)
  assert.equal(next.revision, 3)
  assert.ok(Object.isFrozen(next))
  assert.throws(() => consumeSpecialChallengeEvent({}, { type: 'shot-launched' }), TypeError)
})

test('顺时拆钟要求左齿轮、中指针、右齿轮的严格顺序', () => {
  const success = consume(challenge('polar-clocktower', 2),
    taggedEvent('block-destroyed', 'left-gear', 'left'),
    taggedEvent('block-destroyed', 'center-needle', 'center'),
    taggedEvent('block-destroyed', 'right-gear', 'right', { tick: 19 }),
  )
  assert.equal(success.status, 'completed')
  assert.equal(success.completedAtTick, 19)
  assert.equal(summarizeSpecialChallenge(success).detail, '秘境契约已完成')

  const failure = consume(challenge('polar-clocktower', 2),
    taggedEvent('block-destroyed', 'center-needle', 'center'),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'wrong-sequence')
})

test('精准拆轴只计入直接撞击且不得超过两次', () => {
  const success = consume(challenge('polar-clocktower', 3),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-a', { destroyed: true }),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-b', { destroyed: true }),
  )
  assert.equal(success.status, 'completed')
  assert.equal(success.counters.directHits, 2)

  const environmentalBypass = consume(challenge('polar-clocktower', 3),
    taggedEvent('block-destroyed', 'counterweight', 'axis-a', { cause: 'direct' }),
    taggedEvent('block-destroyed', 'counterweight', 'axis-b', { cause: 'direct' }),
  )
  assert.equal(environmentalBypass.status, 'active')
  assert.equal(environmentalBypass.counters.directHits, 0)
  assert.deepEqual(environmentalBypass.progress.qualifyingTargetIds, [])

  const nonBooleanDestruction = consume(challenge('polar-clocktower', 3),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-a', { destroyed: 1 }),
  )
  assert.equal(nonBooleanDestruction.status, 'active')
  assert.deepEqual(nonBooleanDestruction.progress.qualifyingTargetIds, [])

  const failure = consume(challenge('polar-clocktower', 3),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-a'),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-b'),
    taggedEvent('block-direct-hit', 'counterweight', 'axis-c'),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'direct-hit-limit')
})

test('一潮高分必须在第四枚橡宝落地前达到标准分', () => {
  const success = consume(challenge('tidebound-undercity', 2),
    { type: 'shot-settled', shotId: 'a' },
    { type: 'shot-settled', shotId: 'b' },
    { type: 'shot-settled', shotId: 'c' },
    { type: 'score-changed', stageScore: 9800 },
  )
  assert.equal(success.status, 'completed')

  const failure = consume(challenge('tidebound-undercity', 2),
    ...['a', 'b', 'c', 'd'].map((shotId) => ({ type: 'shot-settled', shotId })),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'score-deadline')
})

test('先浮后沉必须先完成浮筒组、再完成石制配重组', () => {
  const success = consume(challenge('tidebound-undercity', 3),
    taggedEvent('tag-group-completed', 'weak-floats', 'floats'),
    taggedEvent('tag-group-completed', 'stone-ballast', 'ballast'),
  )
  assert.equal(success.status, 'completed')

  const failure = consume(challenge('tidebound-undercity', 3),
    taggedEvent('tag-group-completed', 'stone-ballast', 'ballast'),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'wrong-sequence')
})

test('镜面借力只接受经反弹后的背面命中', () => {
  const initial = challenge('mirrorwood-labyrinth', 2)
  const ignored = consume(initial,
    taggedEvent('block-direct-hit', 'rear-support', 'front', { ricochetCount: 1, impactSide: 'front' }),
    taggedEvent('block-direct-hit', 'rear-support', 'plain', { ricochetCount: 0, impactSide: 'rear' }),
  )
  assert.equal(ignored.status, 'active')
  assert.equal(ignored.progress.qualifyingTargetIds.length, 0)

  const success = consume(ignored,
    taggedEvent('block-direct-hit', 'rear-support', 'rear-a', { ricochetCount: 1, impactSide: 'rear' }),
    { type: 'mirror-ricochet', shotId: 'return-shot' },
    taggedEvent('block-direct-hit', 'rear-support', 'rear-b', {
      shotId: 'return-shot', impactSide: 'rear',
    }),
  )
  assert.equal(success.status, 'completed')

  const failure = consume(ignored, { type: 'base-objective-completed' })
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'contract-unmet')
})

test('真影辨识在基础目标完成且没有误击假身时成功', () => {
  const success = consume(challenge('mirrorwood-labyrinth', 3),
    { type: 'base-objective-completed', tick: 12 },
  )
  assert.equal(success.status, 'completed')
  assert.equal(summarizeSpecialChallenge(success).current, 1)

  const failure = consume(challenge('mirrorwood-labyrinth', 3),
    { type: 'decoy-hit', targetId: 'false-image' },
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'decoy-hit')
})

test('垂线穿根要求同一次震地激活命中两个不同根壁', () => {
  const splitActivations = consume(challenge('deep-root-fault', 1),
    taggedEvent('ability-hit', 'root-wall', 'root-a', { activationId: 'one', birdType: 'drill' }),
    taggedEvent('ability-hit', 'root-wall', 'root-b', { activationId: 'two', birdType: 'drill' }),
  )
  assert.equal(splitActivations.status, 'active')

  const success = consume(splitActivations,
    taggedEvent('ability-hit', 'root-wall', 'root-c', { activationId: 'one', birdType: 'drill' }),
  )
  assert.equal(success.status, 'completed')

  const failure = consume(splitActivations, { type: 'base-objective-completed' })
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'contract-unmet')
})

test('先车后堡要求巡逻矿车脱轨后再破坏中心支柱', () => {
  const success = consume(challenge('deep-root-fault', 2),
    taggedEvent('platform-derailed', 'rail-cart', 'cart'),
    taggedEvent('block-destroyed', 'center-support', 'support'),
  )
  assert.equal(success.status, 'completed')

  const failure = consume(challenge('deep-root-fault', 2),
    taggedEvent('block-destroyed', 'center-support', 'support'),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'wrong-prop-order')
})

test('落石连锁必须在五发内完成两次独立连锁并达到标准分', () => {
  const success = consume(challenge('deep-root-fault', 3),
    { type: 'collapse-chain-complete', chainId: 'chain-a' },
    { type: 'collapse-chain-complete', chainId: 'chain-a' },
    { type: 'collapse-chain-complete', chainId: 'chain-b' },
    { type: 'score-changed', stageScore: 13200 },
  )
  assert.equal(success.status, 'completed')
  assert.equal(success.counters.collapseChains, 2)

  const failure = consume(challenge('deep-root-fault', 3),
    ...['a', 'b', 'c', 'd', 'e'].map((shotId) => ({ type: 'shot-settled', shotId })),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'collapse-score-deadline')
})

test('对角断缆只允许破坏两个指定对角锨点', () => {
  const success = consume(challenge('stormline-skyport', 2),
    taggedEvent('block-destroyed', 'cable-anchor-diagonal', 'upper-left', { isAnchor: true }),
    taggedEvent('block-destroyed', 'cable-anchor-diagonal', 'lower-right', { isAnchor: true }),
  )
  assert.equal(success.status, 'completed')
  assert.equal(success.counters.anchorBreaks, 2)

  const failure = consume(challenge('stormline-skyport', 2),
    taggedEvent('block-destroyed', 'cable-anchor', 'wrong-anchor', { isAnchor: true }),
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'wrong-anchor')
})

test('两次雷鸣必须在第二次雷击脉冲前连锁坍塌并达到标准分', () => {
  const success = consume(challenge('stormline-skyport', 3),
    { type: 'collapse-chain-complete', chainId: 'storm-chain' },
    { type: 'score-changed', stageScore: 14000 },
  )
  assert.equal(success.status, 'completed')

  const failure = consume(challenge('stormline-skyport', 3),
    { type: 'map-rule-pulse', ruleId: 'storm-lightning-pulse', pulseCount: 1 },
    { type: 'map-rule-pulse', ruleId: 'storm-lightning-pulse', pulseCount: 2 },
  )
  assert.equal(failure.status, 'failed')
  assert.equal(failure.failureCode, 'rule-pulse-deadline')
})

test('summaries expose active progress and localized terminal failure details', () => {
  const active = consume(challenge('polar-clocktower', 2),
    taggedEvent('block-destroyed', 'left-gear', 'left'),
  )
  assert.deepEqual(summarizeSpecialChallenge(active), {
    challengeId: 'polar-clocktower-2',
    label: '顺时拆钟',
    status: 'active',
    current: 1,
    total: 3,
    detail: '顺序进度 1 / 3',
    failureCode: null,
  })

  const failed = consume(challenge('mirrorwood-labyrinth', 3), { type: 'decoy-hit' })
  assert.equal(summarizeSpecialChallenge(failed).detail, '误击了镜像假身')
  assert.equal(summarizeSpecialChallenge(null), null)
})

test('challenge state serialization round-trips without trusting unknown or malformed data', () => {
  const original = consume(challenge('deep-root-fault', 1),
    taggedEvent('ability-hit', 'root-wall', 'root-a', { activationId: 'one', birdType: 'drill' }),
  )
  const restored = deserializeSpecialChallengeState(serializeSpecialChallengeState(original))
  assert.deepEqual(restored, original)
  assert.ok(Object.isFrozen(restored))
  assert.ok(Object.isFrozen(restored.progress.activationTargetIds.one))
  assert.equal(deserializeSpecialChallengeState('{bad-json'), null)
  assert.equal(deserializeSpecialChallengeState(JSON.stringify({ ...original, challengeId: 'not-real' })), null)
  assert.equal(deserializeSpecialChallengeState(null), null)
  assert.throws(() => serializeSpecialChallengeState(null), TypeError)
})

test('completion records grant one gold acorn once, retain first date, and improve best stats', () => {
  const completed = consume(challenge('polar-clocktower', 2),
    { type: 'shot-launched' },
    { type: 'shot-launched' },
    taggedEvent('block-destroyed', 'left-gear', 'left'),
    taggedEvent('block-destroyed', 'center-needle', 'center'),
    taggedEvent('block-destroyed', 'right-gear', 'right'),
    { type: 'score-changed', stageScore: 9000 },
  )
  const first = recordSpecialChallengeCompletion({}, completed, {
    completedAt: '2026-09-01T01:02:03.000Z', shotsUsed: 5, stageScore: 9000,
  })
  assert.equal(first.firstCompletion, true)
  assert.equal(first.rewardGold, 1)
  assert.equal(first.improved, false)
  assert.equal(first.record.completedAt, '2026-09-01T01:02:03.000Z')

  const repeat = recordSpecialChallengeCompletion(first.records, completed, {
    completedAt: '2026-09-02T01:02:03.000Z', shotsUsed: 4, stageScore: 11000,
  })
  assert.equal(repeat.firstCompletion, false)
  assert.equal(repeat.rewardGold, 0)
  assert.equal(repeat.improved, true)
  assert.equal(repeat.record.completedAt, '2026-09-01T01:02:03.000Z')
  assert.equal(repeat.record.bestShotsUsed, 4)
  assert.equal(repeat.record.bestStageScore, 11000)
  assert.ok(Object.isFrozen(repeat.records))

  const restored = deserializeSpecialChallengeRecords(serializeSpecialChallengeRecords(repeat.records))
  assert.deepEqual(restored, repeat.records)
  assert.deepEqual(normalizeSpecialChallengeRecords({ junk: { completedAt: 'today' } }), {})
  assert.equal(deserializeSpecialChallengeRecords('{bad-json'), null)

  const ignored = recordSpecialChallengeCompletion(repeat.records, challenge('polar-clocktower', 2))
  assert.equal(ignored.rewardGold, 0)
  assert.equal(ignored.record, null)
  assert.equal(Object.keys(ignored.records).length, 1)
})
