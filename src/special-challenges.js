// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  SPECIAL_CAMPAIGNS,
  getSpecialCampaign,
  getSpecialStage,
} from './special-campaigns.js'

export const SPECIAL_CHALLENGE_STATE_VERSION = 1
export const SPECIAL_CHALLENGE_FIRST_CLEAR_REWARD = 1
export const SPECIAL_CHALLENGE_STATUSES = Object.freeze(['active', 'completed', 'failed'])
export const SPECIAL_CHALLENGE_EVENT_TYPES = Object.freeze([
  'shot-launched',
  'shot-settled',
  'score-changed',
  'block-direct-hit',
  'block-destroyed',
  'tag-group-completed',
  'ability-hit',
  'mirror-ricochet',
  'decoy-hit',
  'platform-derailed',
  'collapse-chain-complete',
  'map-rule-pulse',
  'base-objective-completed',
])

const STATUS_SET = new Set(SPECIAL_CHALLENGE_STATUSES)
const EVENT_TYPE_SET = new Set(SPECIAL_CHALLENGE_EVENT_TYPES)

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((entry) => typeof entry === 'string' && entry.length > 0))]
}

function eventTags(event) {
  return uniqueStrings([
    ...(Array.isArray(event?.tags) ? event.tags : []),
    ...(Array.isArray(event?.sourceTags) ? event.sourceTags : []),
    event?.tag,
    event?.targetTag,
    event?.sourceTag,
  ])
}

function eventHasTag(event, tag) {
  return typeof tag === 'string' && eventTags(event).includes(tag)
}

function eventIdentity(event, fallbackPrefix) {
  for (const value of [event?.targetId, event?.blockId, event?.platformId, event?.sourceId, event?.chainId]) {
    if (typeof value === 'string' && value.length > 0) return value
    if (Number.isSafeInteger(value)) return String(value)
  }
  const tick = nonNegativeInteger(event?.tick)
  return `${fallbackPrefix}:${tick}`
}

function eventShotIdentity(event) {
  for (const value of [event?.shotId, event?.projectileId, event?.acornId]) {
    if (typeof value === 'string' && value.length > 0) return value
    if (Number.isSafeInteger(value)) return String(value)
  }
  return null
}

function definitionFromStage(campaign, stage) {
  const challenge = stage?.objective?.challenge
  if (!campaign || !stage || !challenge) return null
  return deepFreeze({
    id: stage.id,
    badgeId: `special-contract:${stage.id}`,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    stageNumber: stage.number,
    stageTitle: stage.title,
    kind: challenge.kind,
    metric: challenge.parameters?.metric || challenge.kind,
    label: challenge.label,
    description: challenge.description,
    requiredForClear: false,
    rewardGold: SPECIAL_CHALLENGE_FIRST_CLEAR_REWARD,
    parameters: { ...(challenge.parameters || {}) },
  })
}

export const SPECIAL_CHALLENGE_DEFINITIONS = deepFreeze(SPECIAL_CAMPAIGNS.flatMap((campaign) => (
  campaign.stages.map((stage) => definitionFromStage(campaign, stage)).filter(Boolean)
)))

export const SPECIAL_CHALLENGE_IDS = deepFreeze(SPECIAL_CHALLENGE_DEFINITIONS.map((entry) => entry.id))
const DEFINITION_BY_ID = new Map(SPECIAL_CHALLENGE_DEFINITIONS.map((entry) => [entry.id, entry]))

export function getSpecialChallengeDefinition(campaignId, stageReference) {
  const campaign = getSpecialCampaign(campaignId)
  const stage = getSpecialStage(campaignId, stageReference)
  return definitionFromStage(campaign, stage)
}

function initialCounters() {
  return {
    shotsLaunched: 0,
    shotsSettled: 0,
    stageScore: 0,
    directHits: 0,
    decoyHits: 0,
    collapseChains: 0,
    anchorBreaks: 0,
    rulePulses: 0,
  }
}

function initialProgress() {
  return {
    sequenceIndex: 0,
    completedTags: [],
    qualifyingTargetIds: [],
    collapseSourceIds: [],
    activationTargetIds: {},
    ricochetCounts: {},
    rulePulseCounts: {},
    railCartDerailed: false,
  }
}

export function createSpecialChallengeState({
  campaignId,
  stageReference,
  stageNumber,
} = {}) {
  const reference = stageReference ?? stageNumber
  const definition = getSpecialChallengeDefinition(campaignId, reference)
  if (!definition) return null
  return deepFreeze({
    version: SPECIAL_CHALLENGE_STATE_VERSION,
    challengeId: definition.id,
    badgeId: definition.badgeId,
    campaignId: definition.campaignId,
    stageNumber: definition.stageNumber,
    kind: definition.kind,
    metric: definition.metric,
    label: definition.label,
    description: definition.description,
    parameters: definition.parameters,
    status: 'active',
    counters: initialCounters(),
    progress: initialProgress(),
    failureCode: null,
    completedAtTick: null,
    lastEventType: null,
    revision: 0,
  })
}

function cloneState(state) {
  return {
    ...state,
    counters: { ...state.counters },
    progress: {
      ...state.progress,
      completedTags: [...state.progress.completedTags],
      qualifyingTargetIds: [...state.progress.qualifyingTargetIds],
      collapseSourceIds: [...state.progress.collapseSourceIds],
      activationTargetIds: Object.fromEntries(Object.entries(state.progress.activationTargetIds)
        .map(([key, values]) => [key, [...values]])),
      ricochetCounts: { ...state.progress.ricochetCounts },
      rulePulseCounts: { ...state.progress.rulePulseCounts },
    },
  }
}

function addUnique(list, value) {
  if (typeof value !== 'string' || value.length === 0 || list.includes(value)) return false
  list.push(value)
  return true
}

function complete(next, event) {
  next.status = 'completed'
  next.failureCode = null
  next.completedAtTick = nonNegativeInteger(event?.tick)
}

function fail(next, code) {
  next.status = 'failed'
  next.failureCode = code
}

function consumeOrderedTag(next, event, { groupOnly = false } = {}) {
  const sequence = uniqueStrings(next.parameters.sequence)
  if (!sequence.length) return
  const eventType = groupOnly ? 'tag-group-completed' : 'block-destroyed'
  if (event.type !== eventType) return
  const matchedIndex = sequence.findIndex((tag) => eventHasTag(event, tag))
  if (matchedIndex < 0 || matchedIndex < next.progress.sequenceIndex) return
  if (matchedIndex !== next.progress.sequenceIndex) {
    fail(next, 'wrong-sequence')
    return
  }
  const tag = sequence[matchedIndex]
  addUnique(next.progress.completedTags, tag)
  next.progress.sequenceIndex += 1
  if (next.progress.sequenceIndex >= sequence.length) complete(next, event)
}

function consumeTaggedBlocksWithinDirectHits(next, event) {
  const targetTag = next.parameters.targetTag
  const required = nonNegativeInteger(next.parameters.requiredTaggedBlocks)
  const maximum = nonNegativeInteger(next.parameters.maximumDirectHits, Number.MAX_SAFE_INTEGER)
  if (event.type === 'block-direct-hit' && eventHasTag(event, targetTag)) {
    next.counters.directHits += 1
    // The collision event is the authoritative proof that the marked weak
    // point broke under the acorn itself. A later block-destroyed event may be
    // caused by an explosion, fire, or delayed collapse and must not be able
    // to turn that environmental break into a precision-strike completion.
    if (event.destroyed === true) {
      addUnique(next.progress.qualifyingTargetIds, eventIdentity(event, 'direct-target'))
    }
    if (next.counters.directHits > maximum) {
      fail(next, 'direct-hit-limit')
      return
    }
  }
  if (required > 0 && next.progress.qualifyingTargetIds.length >= required
    && next.counters.directHits <= maximum) complete(next, event)
}

function consumeScoreRush(next, event) {
  const targetScore = nonNegativeInteger(next.parameters.targetScore)
  const withinShots = nonNegativeInteger(next.parameters.withinShots)
  if (next.counters.stageScore >= targetScore && next.counters.shotsSettled < withinShots) {
    complete(next, event)
    return
  }
  if (event.type === 'shot-settled' && next.counters.shotsSettled >= withinShots) {
    fail(next, 'score-deadline')
  }
}

function consumeRicochetTargets(next, event) {
  if (event.type !== 'block-direct-hit' || !eventHasTag(event, next.parameters.targetTag)) return
  const minimumRicochets = nonNegativeInteger(next.parameters.minimumRicochets, 1)
  const shotId = eventShotIdentity(event)
  const trackedRicochets = shotId ? nonNegativeInteger(next.progress.ricochetCounts[shotId]) : 0
  if (Math.max(nonNegativeInteger(event.ricochetCount), trackedRicochets) < minimumRicochets) return
  if (event.impactSide && event.impactSide !== 'rear') return
  addUnique(next.progress.qualifyingTargetIds, eventIdentity(event, 'ricochet-target'))
  if (next.progress.qualifyingTargetIds.length >= nonNegativeInteger(next.parameters.requiredTaggedBlocks)) {
    complete(next, event)
  }
}

function consumeIdentifyTarget(next, event) {
  if (event.type === 'decoy-hit') {
    next.counters.decoyHits += 1
    if (next.counters.decoyHits > nonNegativeInteger(next.parameters.maximumDecoyHits)) {
      fail(next, 'decoy-hit')
    }
    return
  }
  if (event.type === 'base-objective-completed') complete(next, event)
}

function consumeTaggedBlocksPerActivation(next, event) {
  if (event.type !== 'ability-hit' || !eventHasTag(event, next.parameters.targetTag)) return
  if (event.birdType && event.birdType !== 'drill') return
  const activationId = typeof event.activationId === 'string' && event.activationId
    ? event.activationId
    : Number.isSafeInteger(event.activationId) ? String(event.activationId) : null
  if (!activationId) return
  const targetId = eventIdentity(event, 'ability-target')
  const values = [...(next.progress.activationTargetIds[activationId] || [])]
  addUnique(values, targetId)
  next.progress.activationTargetIds[activationId] = values
  if (values.length >= nonNegativeInteger(next.parameters.requiredTaggedBlocks)) complete(next, event)
}

function consumePropAndSupportOrder(next, event) {
  const [firstTag, secondTag] = uniqueStrings(next.parameters.sequence)
  if (!firstTag || !secondTag) return
  if (event.type === 'platform-derailed' && eventHasTag(event, firstTag)) {
    next.progress.railCartDerailed = true
    next.progress.sequenceIndex = Math.max(next.progress.sequenceIndex, 1)
    addUnique(next.progress.completedTags, firstTag)
    return
  }
  if (event.type !== 'block-destroyed' || !eventHasTag(event, secondTag)) return
  if (!next.progress.railCartDerailed) {
    fail(next, 'wrong-prop-order')
    return
  }
  next.progress.sequenceIndex = 2
  addUnique(next.progress.completedTags, secondTag)
  complete(next, event)
}

function consumeScoreAndCollapseChains(next, event) {
  const targetScore = nonNegativeInteger(next.parameters.targetScore)
  const minimumChains = nonNegativeInteger(next.parameters.minimumCollapseChains, 1)
  const withinShots = nonNegativeInteger(next.parameters.withinShots, Number.MAX_SAFE_INTEGER)
  if (next.counters.stageScore >= targetScore && next.counters.collapseChains >= minimumChains
    && next.counters.shotsSettled < withinShots) {
    complete(next, event)
    return
  }
  if (event.type === 'shot-settled' && next.counters.shotsSettled >= withinShots) {
    fail(next, 'collapse-score-deadline')
  }
}

function consumeTaggedAnchorPrecision(next, event) {
  if (event.type !== 'block-destroyed') return
  const tags = eventTags(event)
  const isAnchor = Boolean(event.isAnchor)
    || tags.includes('cable-anchor')
    || tags.includes(next.parameters.targetTag)
  if (!isAnchor) return
  next.counters.anchorBreaks += 1
  const targetTagged = tags.includes(next.parameters.targetTag)
  if (!targetTagged) {
    fail(next, 'wrong-anchor')
    return
  }
  addUnique(next.progress.qualifyingTargetIds, eventIdentity(event, 'anchor'))
  const maximum = nonNegativeInteger(next.parameters.maximumAnchorBreaks, Number.MAX_SAFE_INTEGER)
  if (next.counters.anchorBreaks > maximum) {
    fail(next, 'anchor-limit')
    return
  }
  if (next.progress.qualifyingTargetIds.length >= nonNegativeInteger(next.parameters.requiredTaggedBlocks)) {
    complete(next, event)
  }
}

function consumeScoreBeforeRulePulses(next, event) {
  const targetScore = nonNegativeInteger(next.parameters.targetScore)
  const deadlineRuleId = next.parameters.deadlineRuleId
  const deadlinePulses = nonNegativeInteger(next.parameters.deadlinePulses)
  const pulses = nonNegativeInteger(next.progress.rulePulseCounts[deadlineRuleId])
  if (next.counters.stageScore >= targetScore && next.counters.collapseChains >= 1
    && pulses < deadlinePulses) {
    complete(next, event)
    return
  }
  if (event.type === 'map-rule-pulse' && event.ruleId === deadlineRuleId && pulses >= deadlinePulses) {
    fail(next, 'rule-pulse-deadline')
  }
}

function consumeMetric(next, event) {
  switch (next.metric) {
    case 'tagged-support-order': consumeOrderedTag(next, event); break
    case 'tag-group-order': consumeOrderedTag(next, event, { groupOnly: true }); break
    case 'tagged-blocks-within-direct-hits': consumeTaggedBlocksWithinDirectHits(next, event); break
    case 'stage-score-within-shots': consumeScoreRush(next, event); break
    case 'tagged-blocks-after-ricochet': consumeRicochetTargets(next, event); break
    case 'decoy-hits': consumeIdentifyTarget(next, event); break
    case 'tagged-blocks-per-activation': consumeTaggedBlocksPerActivation(next, event); break
    case 'prop-and-support-order': consumePropAndSupportOrder(next, event); break
    case 'stage-score-and-collapse-chains': consumeScoreAndCollapseChains(next, event); break
    case 'tagged-anchor-precision': consumeTaggedAnchorPrecision(next, event); break
    case 'stage-score-before-rule-pulses': consumeScoreBeforeRulePulses(next, event); break
    default: break
  }
}

function consumeCommonEvent(next, event) {
  if (event.type === 'shot-launched') next.counters.shotsLaunched += 1
  if (event.type === 'shot-settled') next.counters.shotsSettled += 1
  if (event.type === 'score-changed') {
    next.counters.stageScore = Math.max(next.counters.stageScore, nonNegativeInteger(event.stageScore))
  }
  if (event.type === 'decoy-hit') next.counters.decoyHits = Math.max(0, next.counters.decoyHits)
  if (event.type === 'collapse-chain-complete') {
    const sourceId = eventIdentity(event, 'collapse-chain')
    if (addUnique(next.progress.collapseSourceIds, sourceId)) {
      next.counters.collapseChains = next.progress.collapseSourceIds.length
    }
  }
  if (event.type === 'mirror-ricochet') {
    const shotId = eventShotIdentity(event)
    if (shotId) {
      const previous = nonNegativeInteger(next.progress.ricochetCounts[shotId])
      const declared = nonNegativeInteger(event.ricochetCount)
      next.progress.ricochetCounts[shotId] = Math.max(previous + 1, declared)
    }
  }
  if (event.type === 'map-rule-pulse' && typeof event.ruleId === 'string' && event.ruleId) {
    const previous = nonNegativeInteger(next.progress.rulePulseCounts[event.ruleId])
    const declared = nonNegativeInteger(event.pulseCount)
    next.progress.rulePulseCounts[event.ruleId] = Math.max(previous + 1, declared)
    next.counters.rulePulses += 1
  }
}

export function consumeSpecialChallengeEvent(state, event) {
  if (!isRecord(state) || state.version !== SPECIAL_CHALLENGE_STATE_VERSION) {
    throw new TypeError('special challenge state is invalid')
  }
  if (!isRecord(event) || !EVENT_TYPE_SET.has(event.type) || state.status !== 'active') return state
  const next = cloneState(state)
  consumeCommonEvent(next, event)
  consumeMetric(next, event)
  if (event.type === 'base-objective-completed' && next.status === 'active') {
    fail(next, 'contract-unmet')
  }
  next.lastEventType = event.type
  next.revision += 1
  return deepFreeze(next)
}

const FAILURE_LABELS = Object.freeze({
  'wrong-sequence': '标记顺序错误',
  'direct-hit-limit': '直接撞击次数超过限制',
  'score-deadline': '未在限定弹药前达到目标分',
  'decoy-hit': '误击了镜像假身',
  'wrong-prop-order': '中心支柱在矿车脱轨前被破坏',
  'collapse-score-deadline': '限定弹药内未完成坍塌与得分目标',
  'wrong-anchor': '破坏了非目标钢索锚点',
  'anchor-limit': '破坏的钢索锚点超过限制',
  'rule-pulse-deadline': '地图脉冲期限已经到达',
  'contract-unmet': '过关时未完成秘境契约',
})

export function summarizeSpecialChallenge(state) {
  if (!isRecord(state)) return null
  const parameters = state.parameters || {}
  let current = 0
  let total = 1
  let detail = state.description || ''
  switch (state.metric) {
    case 'tagged-support-order':
    case 'tag-group-order':
    case 'prop-and-support-order':
      current = nonNegativeInteger(state.progress?.sequenceIndex)
      total = uniqueStrings(parameters.sequence).length || 1
      detail = `顺序进度 ${Math.min(current, total)} / ${total}`
      break
    case 'tagged-blocks-within-direct-hits':
      current = state.progress?.qualifyingTargetIds?.length || 0
      total = nonNegativeInteger(parameters.requiredTaggedBlocks, 1)
      detail = `标记目标 ${current} / ${total} · 直接撞击 ${state.counters?.directHits || 0} / ${parameters.maximumDirectHits}`
      break
    case 'stage-score-within-shots':
      current = Math.min(state.counters?.stageScore || 0, nonNegativeInteger(parameters.targetScore, 1))
      total = nonNegativeInteger(parameters.targetScore, 1)
      detail = `得分 ${state.counters?.stageScore || 0} / ${total} · 已结束 ${state.counters?.shotsSettled || 0} / ${parameters.withinShots} 发`
      break
    case 'tagged-blocks-after-ricochet':
    case 'tagged-blocks-per-activation':
    case 'tagged-anchor-precision':
      current = state.progress?.qualifyingTargetIds?.length
        || Math.max(0, ...Object.values(state.progress?.activationTargetIds || {}).map((values) => values.length))
      total = nonNegativeInteger(parameters.requiredTaggedBlocks, 1)
      detail = `有效目标 ${Math.min(current, total)} / ${total}`
      break
    case 'decoy-hits':
      current = Math.max(0, nonNegativeInteger(parameters.maximumDecoyHits) - (state.counters?.decoyHits || 0))
      total = 1
      detail = state.counters?.decoyHits ? '已经误击假身' : '尚未误击假身'
      break
    case 'stage-score-and-collapse-chains':
      current = state.counters?.collapseChains || 0
      total = nonNegativeInteger(parameters.minimumCollapseChains, 1)
      detail = `连锁坍塌 ${current} / ${total} · 得分 ${state.counters?.stageScore || 0} / ${parameters.targetScore}`
      break
    case 'stage-score-before-rule-pulses':
      current = state.counters?.collapseChains || 0
      total = 1
      detail = `连锁坍塌 ${current} / 1 · 得分 ${state.counters?.stageScore || 0} / ${parameters.targetScore}`
      break
    default: break
  }
  if (state.status === 'completed') current = total
  return deepFreeze({
    challengeId: state.challengeId,
    label: state.label,
    status: state.status,
    current: Math.min(current, total),
    total,
    detail: state.status === 'failed'
      ? FAILURE_LABELS[state.failureCode] || '秘境契约未完成'
      : state.status === 'completed' ? '秘境契约已完成' : detail,
    failureCode: state.failureCode,
  })
}

function normalizeProgress(value) {
  const source = isRecord(value) ? value : {}
  const activationSource = isRecord(source.activationTargetIds) ? source.activationTargetIds : {}
  return {
    sequenceIndex: nonNegativeInteger(source.sequenceIndex),
    completedTags: uniqueStrings(source.completedTags),
    qualifyingTargetIds: uniqueStrings(source.qualifyingTargetIds),
    collapseSourceIds: uniqueStrings(source.collapseSourceIds),
    activationTargetIds: Object.fromEntries(Object.entries(activationSource)
      .filter(([key, values]) => key && Array.isArray(values))
      .map(([key, values]) => [key, uniqueStrings(values)])),
    ricochetCounts: Object.fromEntries(Object.entries(isRecord(source.ricochetCounts)
      ? source.ricochetCounts : {}).filter(([key]) => key).map(([key, count]) => [key, nonNegativeInteger(count)])),
    rulePulseCounts: Object.fromEntries(Object.entries(isRecord(source.rulePulseCounts)
      ? source.rulePulseCounts : {}).filter(([key]) => key).map(([key, count]) => [key, nonNegativeInteger(count)])),
    railCartDerailed: Boolean(source.railCartDerailed),
  }
}

export function serializeSpecialChallengeState(state) {
  if (!isRecord(state) || state.version !== SPECIAL_CHALLENGE_STATE_VERSION) {
    throw new TypeError('special challenge state is invalid')
  }
  return JSON.stringify(state)
}

export function deserializeSpecialChallengeState(serialized) {
  if (typeof serialized !== 'string') return null
  try {
    const source = JSON.parse(serialized)
    const definition = DEFINITION_BY_ID.get(source?.challengeId)
    if (!definition || source.version !== SPECIAL_CHALLENGE_STATE_VERSION
      || !STATUS_SET.has(source.status)) return null
    const base = createSpecialChallengeState({
      campaignId: definition.campaignId,
      stageNumber: definition.stageNumber,
    })
    const counters = initialCounters()
    for (const key of Object.keys(counters)) counters[key] = nonNegativeInteger(source.counters?.[key])
    return deepFreeze({
      ...base,
      status: source.status,
      counters,
      progress: normalizeProgress(source.progress),
      failureCode: source.status === 'failed' && typeof source.failureCode === 'string'
        ? source.failureCode : null,
      completedAtTick: source.status === 'completed'
        ? nonNegativeInteger(source.completedAtTick) : null,
      lastEventType: EVENT_TYPE_SET.has(source.lastEventType) ? source.lastEventType : null,
      revision: nonNegativeInteger(source.revision),
    })
  } catch {
    return null
  }
}

function normalizeIsoDate(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  try { return new Date(timestamp).toISOString() } catch { return null }
}

function normalizeCompletionRecord(challengeId, value) {
  if (!DEFINITION_BY_ID.has(challengeId) || !isRecord(value)) return null
  const completedAt = normalizeIsoDate(value.completedAt)
  if (!completedAt) return null
  const bestShotsUsed = nonNegativeInteger(value.bestShotsUsed)
  const bestStageScore = nonNegativeInteger(value.bestStageScore)
  return deepFreeze({
    challengeId,
    badgeId: DEFINITION_BY_ID.get(challengeId).badgeId,
    completedAt,
    bestShotsUsed,
    bestStageScore,
  })
}

export function normalizeSpecialChallengeRecords(value) {
  const source = isRecord(value) ? value : {}
  const records = {}
  for (const challengeId of SPECIAL_CHALLENGE_IDS) {
    const record = normalizeCompletionRecord(challengeId, source[challengeId])
    if (record) records[challengeId] = record
  }
  return deepFreeze(records)
}

export function recordSpecialChallengeCompletion(recordsValue, state, {
  completedAt = new Date(),
  stageScore = state?.counters?.stageScore,
  shotsUsed = state?.counters?.shotsLaunched,
} = {}) {
  const records = normalizeSpecialChallengeRecords(recordsValue)
  if (!isRecord(state) || state.status !== 'completed' || !DEFINITION_BY_ID.has(state.challengeId)) {
    return deepFreeze({ records, firstCompletion: false, improved: false, rewardGold: 0, record: null })
  }
  const existing = records[state.challengeId]
  const normalizedDate = normalizeIsoDate(completedAt)
  if (!normalizedDate) throw new RangeError('completedAt must be a valid date')
  const nextShots = nonNegativeInteger(shotsUsed)
  const nextScore = nonNegativeInteger(stageScore)
  const bestShotsUsed = existing?.bestShotsUsed > 0 && nextShots > 0
    ? Math.min(existing.bestShotsUsed, nextShots)
    : Math.max(existing?.bestShotsUsed || 0, nextShots)
  const bestStageScore = Math.max(existing?.bestStageScore || 0, nextScore)
  const record = deepFreeze({
    challengeId: state.challengeId,
    badgeId: state.badgeId,
    completedAt: existing?.completedAt || normalizedDate,
    bestShotsUsed,
    bestStageScore,
  })
  const improved = Boolean(existing)
    && (record.bestShotsUsed !== existing.bestShotsUsed
      || record.bestStageScore !== existing.bestStageScore)
  return deepFreeze({
    records: { ...records, [state.challengeId]: record },
    firstCompletion: !existing,
    improved,
    rewardGold: existing ? 0 : SPECIAL_CHALLENGE_FIRST_CLEAR_REWARD,
    record,
  })
}

export function serializeSpecialChallengeRecords(value) {
  return JSON.stringify(normalizeSpecialChallengeRecords(value))
}

export function deserializeSpecialChallengeRecords(serialized) {
  if (typeof serialized !== 'string') return null
  try { return normalizeSpecialChallengeRecords(JSON.parse(serialized)) } catch { return null }
}
