// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { buildEmergencySupplyQueue } from './emergency-supply.js'
import {
  SPECIAL_CAMPAIGN_IDS,
  getSpecialCampaign,
  getSpecialStage,
} from './special-campaigns.js'

const MODE_SET = new Set(['main', 'endless', 'daily', 'special'])
const SPECIAL_CAMPAIGN_SET = new Set(SPECIAL_CAMPAIGN_IDS)
const MAX_RUN_SEED = 0xffff_ffff

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstOwn(source, keys) {
  if (!isRecord(source)) return undefined
  for (const key of keys) {
    if (Object.hasOwn(source, key) && source[key] !== undefined) return source[key]
  }
  return undefined
}

function nonNegativeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === '' || value === null || value === undefined) return 0
  let numeric
  try {
    numeric = Number(value)
  } catch {
    return 0
  }
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.min(maximum, Math.floor(numeric))
}

function positiveInteger(value) {
  const normalized = nonNegativeInteger(value)
  return normalized > 0 ? normalized : null
}

function ratio(value) {
  let numeric
  try {
    numeric = Number(value)
  } catch {
    return 0
  }
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(1, numeric))
}

function shortText(value, maximum = 96) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/gu, ' ').slice(0, maximum)
}

function canonicalIntegerPart(value, { positive = false, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value)) return false
  const numeric = Number(value)
  return Number.isSafeInteger(numeric)
    && numeric <= maximum
    && (positive ? numeric > 0 : numeric >= 0)
}

function validLevelIdentity(value) {
  if (typeof value !== 'string' || value.length > 128) return false
  const parts = value.split(':')
  const mode = parts[0]
  if (!MODE_SET.has(mode)) return false
  if (mode === 'special') {
    if (parts.length !== 4 || !SPECIAL_CAMPAIGN_SET.has(parts[1])) return false
    return canonicalIntegerPart(parts[2], { positive: true })
      && canonicalIntegerPart(parts[3], { maximum: MAX_RUN_SEED })
  }
  if (parts.length !== 3) return false
  return canonicalIntegerPart(parts[1], { positive: true })
    && canonicalIntegerPart(parts[2], { maximum: MAX_RUN_SEED })
}

function normalizeContext(value) {
  const source = isRecord(value) ? value : {}
  const modeValue = firstOwn(source, ['mode'])
  const mode = typeof modeValue === 'string' && MODE_SET.has(modeValue) ? modeValue : ''
  const level = positiveInteger(firstOwn(source, ['level', 'stage', 'stageNumber'])) ?? 0
  const campaignValue = firstOwn(source, ['campaignId', 'campaign', 'specialCampaignId'])
  const campaignId = mode === 'special'
    && typeof campaignValue === 'string'
    && SPECIAL_CAMPAIGN_SET.has(campaignValue)
    ? campaignValue
    : ''
  const seed = nonNegativeInteger(firstOwn(source, ['runSeed', 'seed', 'levelSeed']), MAX_RUN_SEED)
  return { source, mode, level, campaignId, seed }
}

function newState(levelIdentity = null) {
  return deepFreeze({
    version: FAILURE_AID_VERSION,
    levelIdentity,
    consecutiveFailures: 0,
    elderAidOffered: false,
    elderAidClaimed: false,
  })
}

export const FAILURE_AID_VERSION = 1
export const ELDER_AID_FAILURE_THRESHOLD = 3
export const ELDER_AID_SHOT_COUNT = 2

export const FAILURE_REASONS = deepFreeze({
  TARGETS_REMAIN: 'targets-remain',
  COLLAPSE_SHORTFALL: 'collapse-shortfall',
  BOSS_SURVIVED: 'boss-survived',
  SCORE_SHORTFALL: 'score-shortfall',
  AMMO_DEPLETED: 'ammo-depleted',
  OBJECTIVE_INCOMPLETE: 'objective-incomplete',
})

const REASON_SET = new Set(Object.values(FAILURE_REASONS))

export const ELDER_AID_OFFER = deepFreeze({
  id: 'elder-aid',
  name: '长老援助',
  failureThreshold: ELDER_AID_FAILURE_THRESHOLD,
  shotCount: ELDER_AID_SHOT_COUNT,
  description: `连续失败 ${ELDER_AID_FAILURE_THRESHOLD} 次后，本关可领取 ${ELDER_AID_SHOT_COUNT} 枚当前弹药池内的援助橡宝。援助弹不计入余弹星级与余弹奖励。`,
})

/**
 * Builds the retry identity. The run seed is part of the identity so a newly
 * started expedition at the same authored level cannot inherit old failures.
 */
export function failureAidLevelIdentity(value = {}) {
  if (typeof value === 'string') return validLevelIdentity(value) ? value : null
  const { mode, level, campaignId, seed } = normalizeContext(value)
  if (!mode || level === 0 || (mode === 'special' && !campaignId)) return null
  return mode === 'special'
    ? `${mode}:${campaignId}:${level}:${seed}`
    : `${mode}:${level}:${seed}`
}

export function createFailureAidState(levelContext) {
  const levelIdentity = levelContext === undefined
    ? null
    : failureAidLevelIdentity(levelContext)
  return newState(levelIdentity)
}

/** Strips unknown fields and rejects impossible or future-version state. */
export function normalizeFailureAidState(value) {
  if (!isRecord(value)) return newState()
  const version = firstOwn(value, ['version'])
  if (version !== undefined && version !== FAILURE_AID_VERSION) return newState()
  const identityValue = firstOwn(value, ['levelIdentity'])
  const levelIdentity = validLevelIdentity(identityValue) ? identityValue : null
  if (!levelIdentity) return newState()
  const consecutiveFailures = nonNegativeInteger(firstOwn(value, ['consecutiveFailures']))
  const thresholdReached = consecutiveFailures >= ELDER_AID_FAILURE_THRESHOLD
  const elderAidClaimed = thresholdReached && firstOwn(value, ['elderAidClaimed']) === true
  const elderAidOffered = thresholdReached
    && (elderAidClaimed || firstOwn(value, ['elderAidOffered']) === true)
  return deepFreeze({
    version: FAILURE_AID_VERSION,
    levelIdentity,
    consecutiveFailures,
    elderAidOffered,
    elderAidClaimed,
  })
}

/** Resets the retry streak whenever mode, campaign, level, or run seed changes. */
export function syncFailureAidLevel(state, levelContext = {}) {
  const normalized = normalizeFailureAidState(state)
  const levelIdentity = failureAidLevelIdentity(levelContext)
  if (!levelIdentity) return newState()
  return normalized.levelIdentity === levelIdentity ? normalized : newState(levelIdentity)
}

function explicitFailureReason(source) {
  const value = firstOwn(source, ['reason', 'failureReason'])
  if (typeof value !== 'string') return ''
  const aliases = {
    'targets-remaining': FAILURE_REASONS.TARGETS_REMAIN,
    'remaining-targets': FAILURE_REASONS.TARGETS_REMAIN,
    collapse: FAILURE_REASONS.COLLAPSE_SHORTFALL,
    boss: FAILURE_REASONS.BOSS_SURVIVED,
    score: FAILURE_REASONS.SCORE_SHORTFALL,
    ammo: FAILURE_REASONS.AMMO_DEPLETED,
    objective: FAILURE_REASONS.OBJECTIVE_INCOMPLETE,
  }
  const normalized = aliases[value] ?? value
  return REASON_SET.has(normalized) ? normalized : ''
}

function deriveFailureReason(source) {
  const explicit = explicitFailureReason(source)
  if (explicit) return explicit
  const bossHp = nonNegativeInteger(firstOwn(source, ['bossHpRemaining', 'bossHp']))
  const bossAlive = firstOwn(source, ['bossAlive']) === true
  if (bossAlive || bossHp > 0) return FAILURE_REASONS.BOSS_SURVIVED
  const remainingTargets = nonNegativeInteger(firstOwn(source, [
    'remainingTargetCount', 'remainingTargets', 'squirrelsRemaining',
  ]))
  if (remainingTargets > 0) return FAILURE_REASONS.TARGETS_REMAIN
  const collapseRatio = ratio(firstOwn(source, ['collapseRatio', 'destructionRatio']))
  const requiredCollapseRatio = ratio(firstOwn(source, [
    'requiredCollapseRatio', 'requiredDestructionRatio',
  ]))
  if (collapseRatio + Number.EPSILON < requiredCollapseRatio) {
    return FAILURE_REASONS.COLLAPSE_SHORTFALL
  }
  const score = nonNegativeInteger(firstOwn(source, ['score', 'stageScore']))
  const requiredScore = nonNegativeInteger(firstOwn(source, ['requiredScore', 'parScore']))
  if (requiredScore > 0 && score < requiredScore) return FAILURE_REASONS.SCORE_SHORTFALL
  if (firstOwn(source, ['ammoDepleted', 'acornsDepleted']) === true) {
    return FAILURE_REASONS.AMMO_DEPLETED
  }
  return FAILURE_REASONS.OBJECTIVE_INCOMPLETE
}

function modeAndLevelLabel({ mode, level, campaignId }) {
  if (mode === 'main') return { modeLabel: '主线', levelLabel: `主线 · ${level}/18` }
  if (mode === 'endless') return { modeLabel: '无尽', levelLabel: `无尽 · 第 ${level} 层` }
  if (mode === 'daily') return { modeLabel: '每日挑战', levelLabel: `每日挑战 · 第 ${level} 关` }
  const campaign = getSpecialCampaign(campaignId)
  const stage = getSpecialStage(campaignId, level)
  const campaignTitle = campaign?.title ?? '未知秘境'
  return {
    modeLabel: '秘境',
    levelLabel: `${campaignTitle} · ${level}/4${stage?.title ? ` · ${stage.title}` : ''}`,
  }
}

function failureFacts(source) {
  const facts = []
  const remainingTargets = nonNegativeInteger(firstOwn(source, [
    'remainingTargetCount', 'remainingTargets', 'squirrelsRemaining',
  ]))
  if (remainingTargets > 0) facts.push({ label: '剩余松鼠', value: `${remainingTargets} 只` })

  const collapseRatio = ratio(firstOwn(source, ['collapseRatio', 'destructionRatio']))
  const requiredCollapseRatio = ratio(firstOwn(source, [
    'requiredCollapseRatio', 'requiredDestructionRatio',
  ]))
  if (requiredCollapseRatio > 0 || collapseRatio > 0) {
    facts.push({
      label: '建筑破坏',
      value: `${Math.round(collapseRatio * 100)}% / 要求 ${Math.round(requiredCollapseRatio * 100)}%`,
    })
  }

  const bossHp = nonNegativeInteger(firstOwn(source, ['bossHpRemaining', 'bossHp']))
  const bossMaxHp = nonNegativeInteger(firstOwn(source, ['bossMaxHp', 'bossHpMaximum']))
  if (bossHp > 0) {
    facts.push({ label: 'Boss 剩余生命', value: bossMaxHp > 0 ? `${bossHp} / ${bossMaxHp}` : `${bossHp}` })
  }

  const score = nonNegativeInteger(firstOwn(source, ['score', 'stageScore']))
  const requiredScore = nonNegativeInteger(firstOwn(source, ['requiredScore', 'parScore']))
  if (requiredScore > 0) facts.push({ label: '本局得分', value: `${score} / 要求 ${requiredScore}` })
  if (firstOwn(source, ['ammoDepleted', 'acornsDepleted']) === true) {
    facts.push({ label: '弹药', value: '已耗尽' })
  }
  return facts
}

function reasonCopy(reason, source) {
  const remainingTargets = nonNegativeInteger(firstOwn(source, [
    'remainingTargetCount', 'remainingTargets', 'squirrelsRemaining',
  ]))
  const collapseRatio = ratio(firstOwn(source, ['collapseRatio', 'destructionRatio']))
  const requiredCollapseRatio = ratio(firstOwn(source, [
    'requiredCollapseRatio', 'requiredDestructionRatio',
  ]))
  const score = nonNegativeInteger(firstOwn(source, ['score', 'stageScore']))
  const requiredScore = nonNegativeInteger(firstOwn(source, ['requiredScore', 'parScore']))
  const bossHp = nonNegativeInteger(firstOwn(source, ['bossHpRemaining', 'bossHp']))
  const objectiveLabel = shortText(firstOwn(source, ['objectiveLabel', 'objectiveName']))

  if (reason === FAILURE_REASONS.TARGETS_REMAIN) return {
    reasonLabel: '仍有目标存活',
    summary: remainingTargets > 0 ? `仍有 ${remainingTargets} 只松鼠未被消灭。` : '仍有松鼠未被消灭。',
    recommendation: '优先命中承重支点或高处目标，让一次有效倒塌同时清场。',
  }
  if (reason === FAILURE_REASONS.COLLAPSE_SHORTFALL) {
    const gap = Math.max(0, requiredCollapseRatio - collapseRatio)
    return {
      reasonLabel: '建筑破坏不足',
      summary: `建筑破坏 ${Math.round(collapseRatio * 100)}%，还差 ${Math.round(gap * 100)}% 达到过关要求。`,
      recommendation: '将高动能或破甲橡宝留给主承重件，避免在已松动的零散建材上浪费弹药。',
    }
  }
  if (reason === FAILURE_REASONS.BOSS_SURVIVED) return {
    reasonLabel: 'Boss 未被击败',
    summary: bossHp > 0 ? `Boss 仍剩 ${bossHp} 点生命。` : 'Boss 在战斗结束时仍然存活。',
    recommendation: '先破除护卫与防护结构，再把直接伤害、高处坠物或阶段克制留给 Boss。',
  }
  if (reason === FAILURE_REASONS.SCORE_SHORTFALL) return {
    reasonLabel: '得分未达标',
    summary: `本局 ${score} 分，还差 ${Math.max(0, requiredScore - score)} 分达到要求。`,
    recommendation: '优先制造材质克制、多目标命中和高价值连锁，不要只用最后一击勉强清场。',
  }
  if (reason === FAILURE_REASONS.AMMO_DEPLETED) return {
    reasonLabel: '橡宝已耗尽',
    summary: '所有橡宝已用完，但过关目标尚未完成。',
    recommendation: '重试时先规划待发序列，把特殊橡宝留给对应材质、地形或特殊松鼠。',
  }
  return {
    reasonLabel: '额外目标未完成',
    summary: objectiveLabel ? `未完成本关目标“${objectiveLabel}”。` : '本关仍有必要目标未完成。',
    recommendation: '重试前展开任务卡，确认目标是清敌、破坏度、精准命中、顺序破拆还是得分要求。',
  }
}

function modeRecommendation(context) {
  if (context.mode === 'main') return '主线重试不会改变本关基础配置，可根据本次落点修正角度和出手顺序。'
  if (context.mode === 'endless') return '无尽后期应优先保留能克制特殊松鼠、Boss 与高耐久建材的橡宝。'
  if (context.mode === 'daily') return '今日的规则与随机种子保持不变，可直接复用已验证的前几次落点。'
  const stage = getSpecialStage(context.campaignId, context.level)
  if (stage?.tutorialContract?.instruction) return `本秘境机制：${stage.tutorialContract.instruction}`
  const campaign = getSpecialCampaign(context.campaignId)
  return campaign?.briefing?.difficulty?.note
    ? `秘境建议：${campaign.briefing.difficulty.note}`
    : '秘境弹药池与地图机制绑定，先确认本关专属橡宝和环境规则。'
}

/**
 * Produces UI-ready, evidence-first failure copy without changing retry state.
 */
export function describeLevelFailure(value = {}) {
  const context = normalizeContext(value)
  const levelIdentity = failureAidLevelIdentity(value)
  const reason = deriveFailureReason(context.source)
  const labels = modeAndLevelLabel(context)
  const copy = reasonCopy(reason, context.source)
  const facts = failureFacts(context.source)
  const recommendations = [copy.recommendation, modeRecommendation(context)]
  return deepFreeze({
    levelIdentity,
    mode: context.mode || null,
    modeLabel: labels.modeLabel,
    level: context.level,
    campaignId: context.campaignId || null,
    levelLabel: labels.levelLabel,
    reason,
    reasonLabel: copy.reasonLabel,
    title: `${labels.levelLabel}未通过`,
    summary: copy.summary,
    facts,
    recommendations,
    message: `${copy.summary} ${recommendations.join(' ')}`,
  })
}

/** Records one loss and emits the elder-aid modal trigger exactly once. */
export function recordLevelFailure(state, failureContext = {}) {
  const levelIdentity = failureAidLevelIdentity(failureContext)
  const normalized = normalizeFailureAidState(state)
  if (!levelIdentity) {
    return deepFreeze({
      ok: false,
      reason: 'invalid-level',
      state: normalized,
      hint: describeLevelFailure(failureContext),
      aidEligible: false,
      shouldOfferElderAid: false,
      failuresUntilAid: ELDER_AID_FAILURE_THRESHOLD,
      offer: null,
    })
  }

  const synced = syncFailureAidLevel(normalized, failureContext)
  const consecutiveFailures = Math.min(
    Number.MAX_SAFE_INTEGER,
    synced.consecutiveFailures + 1,
  )
  const thresholdReached = consecutiveFailures >= ELDER_AID_FAILURE_THRESHOLD
  const shouldOfferElderAid = thresholdReached
    && !synced.elderAidOffered
    && !synced.elderAidClaimed
  const nextState = deepFreeze({
    version: FAILURE_AID_VERSION,
    levelIdentity,
    consecutiveFailures,
    elderAidOffered: synced.elderAidOffered || shouldOfferElderAid,
    elderAidClaimed: synced.elderAidClaimed,
  })
  const aidEligible = thresholdReached && !nextState.elderAidClaimed
  return deepFreeze({
    ok: true,
    reason: 'failure-recorded',
    state: nextState,
    hint: describeLevelFailure(failureContext),
    aidEligible,
    shouldOfferElderAid,
    failuresUntilAid: aidEligible
      ? 0
      : Math.max(0, ELDER_AID_FAILURE_THRESHOLD - consecutiveFailures),
    offer: aidEligible ? ELDER_AID_OFFER : null,
  })
}

export function isElderAidAvailable(state, levelContext) {
  const normalized = normalizeFailureAidState(state)
  if (levelContext !== undefined) {
    const identity = failureAidLevelIdentity(levelContext)
    if (!identity || identity !== normalized.levelIdentity) return false
  }
  return normalized.consecutiveFailures >= ELDER_AID_FAILURE_THRESHOLD
    && normalized.elderAidOffered
    && !normalized.elderAidClaimed
}

function failedClaim(reason, state) {
  return deepFreeze({
    ok: false,
    reason,
    state,
    aidClaimed: state.elderAidClaimed,
    addedAcorns: 0,
    queue: [],
    queueEntries: [],
  })
}

/**
 * Claims the one-per-level aid. Selection is deterministic and coverage-first,
 * and can only use the current authored ammunition pool supplied by the caller.
 */
export function claimElderAid(state, value = {}) {
  const context = normalizeContext(value)
  const identity = failureAidLevelIdentity(value)
  const normalized = normalizeFailureAidState(state)
  if (!identity) return failedClaim('invalid-level', normalized)
  if (normalized.levelIdentity !== identity) {
    return failedClaim('level-changed', syncFailureAidLevel(normalized, value))
  }
  if (normalized.consecutiveFailures < ELDER_AID_FAILURE_THRESHOLD) {
    return failedClaim('threshold-not-reached', normalized)
  }
  if (!normalized.elderAidOffered) return failedClaim('aid-not-offered', normalized)
  if (normalized.elderAidClaimed) return failedClaim('aid-already-claimed', normalized)

  const ammoPool = firstOwn(context.source, [
    'ammoPool', 'currentAmmoPool', 'availableTypes', 'availableBirdTypes', 'birdTypes',
  ])
  const queue = buildEmergencySupplyQueue({
    ammoPool,
    acornCount: ELDER_AID_SHOT_COUNT,
    seed: context.seed,
    mode: context.mode,
    level: context.level,
    campaignId: context.campaignId,
    offerId: ELDER_AID_OFFER.id,
  })
  if (queue.length !== ELDER_AID_SHOT_COUNT) return failedClaim('empty-ammo-pool', normalized)

  const nextState = deepFreeze({
    ...normalized,
    elderAidClaimed: true,
  })
  const queueEntries = queue.map((type) => ({
    type,
    source: ELDER_AID_OFFER.id,
    bonus: true,
    bonusShot: true,
    damageBonus: 0,
    countsForReserveStars: false,
    countsForReserveBonus: false,
  }))
  return deepFreeze({
    ok: true,
    reason: 'aid-claimed',
    state: nextState,
    aidClaimed: true,
    addedAcorns: ELDER_AID_SHOT_COUNT,
    queue: [...queue],
    queueEntries,
  })
}
