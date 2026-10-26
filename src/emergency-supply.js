// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { Rng, mixSeed } from './game-core.js'

const ELIGIBLE_MODE_SET = new Set(['special', 'endless'])
const ACORN_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,31}$/u

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstDefined(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key]
  }
  return undefined
}

function booleanValue(value, fallback = false) {
  if (value === true || value === 1 || value === 'true') return true
  if (value === false || value === 0 || value === 'false') return false
  return fallback
}

function nonNegativeInteger(value) {
  if (value === '' || value === null || value === undefined) return 0
  let numeric
  try {
    numeric = Number(value)
  } catch {
    return 0
  }
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric))
}

function normalizeAmmoPool(value) {
  if (!Array.isArray(value)) return Object.freeze([])
  const pool = []
  const seen = new Set()
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const type = entry.trim()
    // `golden` is a collectible, not a launchable acorn. It must never be
    // manufactured by a rescue purchase even if corrupt state puts it in the
    // authored magazine.
    if (!ACORN_TYPE_PATTERN.test(type) || type === 'golden' || seen.has(type)) continue
    seen.add(type)
    pool.push(type)
  }
  return Object.freeze(pool)
}

function normalizeEligibilityInput(value) {
  const source = isRecord(value) ? value : {}
  const shotsRemaining = nonNegativeInteger(firstDefined(source, [
    'shotsRemaining', 'remainingShots', 'acornsRemaining',
  ]))
  const queuedShots = Array.isArray(source.shotQueue)
    ? source.shotQueue.length
    : nonNegativeInteger(firstDefined(source, ['queuedShots', 'queueLength']))
  const shotInFlight = booleanValue(firstDefined(source, [
    'shotInFlight', 'hasActiveAcorn', 'activeShot',
  ]))
  const explicitDepletion = firstDefined(source, ['ammoDepleted', 'acornsDepleted', 'depleted'])
  const ammoDepleted = explicitDepletion === undefined
    ? shotsRemaining === 0 && queuedShots === 0 && !shotInFlight
    : booleanValue(explicitDepletion)
      && shotsRemaining === 0
      && queuedShots === 0
      && !shotInFlight

  return deepFreeze({
    mode: typeof source.mode === 'string' ? source.mode : '',
    shotsRemaining,
    queuedShots,
    shotInFlight,
    ammoDepleted,
    levelCleared: booleanValue(firstDefined(source, [
      'levelCleared', 'objectiveComplete', 'objectivesComplete', 'cleared',
    ])),
    opportunityUsed: booleanValue(firstDefined(source, [
      'opportunityUsed', 'supplyUsed', 'emergencySupplyUsed',
    ])),
    automaticRescuePending: booleanValue(firstDefined(source, [
      'automaticRescuePending', 'talentRescuePending',
    ])),
    ammoPool: normalizeAmmoPool(firstDefined(source, [
      'ammoPool', 'currentAmmoPool', 'availableTypes', 'birdTypes',
    ])),
  })
}

export const EMERGENCY_SUPPLY_ELIGIBLE_MODES = deepFreeze(['special', 'endless'])

export const EMERGENCY_SUPPLY_OFFERS = deepFreeze([
  {
    id: 'two-acorns',
    name: '小队补给',
    goldenAcornCost: 1,
    acornCount: 2,
  },
  {
    id: 'six-acorns',
    name: '远征补给',
    goldenAcornCost: 5,
    acornCount: 6,
  },
])

/**
 * Answers whether the one-per-level rescue choice may open now. The caller
 * should ask only after the launched acorn has settled and after any automatic
 * talent rescue has resolved. Both constraints are still defended here so a
 * mid-flight frame cannot buy ammunition early.
 */
export function evaluateEmergencySupplyEligibility(value = {}) {
  const state = normalizeEligibilityInput(value)
  let reason = 'eligible'
  if (!ELIGIBLE_MODE_SET.has(state.mode)) reason = 'unsupported-mode'
  else if (state.levelCleared) reason = 'level-already-cleared'
  else if (state.opportunityUsed) reason = 'opportunity-already-used'
  else if (state.automaticRescuePending) reason = 'automatic-rescue-pending'
  else if (state.shotInFlight) reason = 'shot-still-active'
  else if (!state.ammoDepleted) reason = 'ammo-not-depleted'
  else if (state.ammoPool.length === 0) reason = 'empty-ammo-pool'

  return deepFreeze({
    eligible: reason === 'eligible',
    reason,
    ...state,
  })
}

/** Returns both fixed prices with affordability calculated from clean funds. */
export function quoteEmergencySupply(value = {}) {
  const source = isRecord(value) ? value : { goldenAcorns: value }
  const goldenAcorns = nonNegativeInteger(firstDefined(source, [
    'goldenAcorns', 'balance', 'eggs',
  ]))
  const offers = EMERGENCY_SUPPLY_OFFERS.map((offer) => ({
    ...offer,
    affordable: goldenAcorns >= offer.goldenAcornCost,
    shortfall: Math.max(0, offer.goldenAcornCost - goldenAcorns),
    balanceAfterPurchase: goldenAcorns >= offer.goldenAcornCost
      ? goldenAcorns - offer.goldenAcornCost
      : goldenAcorns,
  }))
  return deepFreeze({ goldenAcorns, offers })
}

function shuffleCycle(pool, rng, previousType) {
  const cycle = [...pool]
  for (let index = cycle.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.integer(0, index + 1)
    ;[cycle[index], cycle[swapIndex]] = [cycle[swapIndex], cycle[index]]
  }
  if (previousType && cycle.length > 1 && cycle[0] === previousType) {
    const swapIndex = cycle.findIndex((type) => type !== previousType)
    ;[cycle[0], cycle[swapIndex]] = [cycle[swapIndex], cycle[0]]
  }
  return cycle
}

/**
 * Builds a deterministic coverage-first rescue magazine. Every current-level
 * type appears before a repeat where capacity permits, and cycle boundaries do
 * not repeat when more than one type is available.
 */
export function buildEmergencySupplyQueue(value = {}) {
  const source = isRecord(value) ? value : {}
  const {
    ammoPool = [],
    acornCount = 0,
    seed = 1,
    mode = '',
    level = 0,
    campaignId = '',
    offerId = '',
  } = source
  const pool = normalizeAmmoPool(ammoPool)
  const count = nonNegativeInteger(acornCount)
  if (!pool.length || count === 0) return Object.freeze([])
  const normalizedSeed = (typeof seed === 'string' || typeof seed === 'number')
    && (typeof seed !== 'number' || Number.isFinite(seed))
    ? seed
    : 1
  const normalizedLevel = nonNegativeInteger(level)
  const normalizedCampaignId = typeof campaignId === 'string' ? campaignId.slice(0, 64) : ''
  const normalizedOfferId = typeof offerId === 'string' ? offerId.slice(0, 64) : ''
  const rng = new Rng(mixSeed(
    normalizedSeed,
    'emergency-supply',
    typeof mode === 'string' ? mode : '',
    normalizedLevel,
    normalizedCampaignId,
    normalizedOfferId,
    count,
    pool.join(','),
  ))
  const queue = []
  while (queue.length < count) {
    const cycle = shuffleCycle(pool, rng, queue.at(-1))
    queue.push(...cycle.slice(0, count - queue.length))
  }
  return Object.freeze(queue)
}

function failedPurchase(reason, eligibility, quote, offer = null) {
  return deepFreeze({
    ok: false,
    reason,
    opportunityUsed: eligibility.opportunityUsed,
    goldenAcornsBefore: quote.goldenAcorns,
    goldenAcornsSpent: 0,
    goldenAcornsRemaining: quote.goldenAcorns,
    addedAcorns: 0,
    offer,
    queue: [],
    queueEntries: [],
    ammoPool: eligibility.ammoPool,
    eligibility,
  })
}

/**
 * Resolves a purchase without mutating save data or the live shot queue.
 * Successful entries are explicitly bonus ammunition so integrations cannot
 * accidentally count paid rescue shots toward reserve stars or score.
 */
export function purchaseEmergencySupply(value = {}) {
  const source = isRecord(value) ? value : {}
  const eligibility = evaluateEmergencySupplyEligibility(source)
  const quote = quoteEmergencySupply(source)
  const offerId = typeof source.offerId === 'string' ? source.offerId : ''
  const offer = quote.offers.find((candidate) => candidate.id === offerId) ?? null

  if (!eligibility.eligible) return failedPurchase(eligibility.reason, eligibility, quote, offer)
  if (!offer) return failedPurchase('unknown-offer', eligibility, quote)
  if (!offer.affordable) return failedPurchase('insufficient-golden-acorns', eligibility, quote, offer)

  const queue = buildEmergencySupplyQueue({
    ammoPool: eligibility.ammoPool,
    acornCount: offer.acornCount,
    seed: firstDefined(source, ['seed', 'runSeed', 'levelSeed']),
    mode: eligibility.mode,
    level: firstDefined(source, ['level', 'stage', 'stageNumber']),
    campaignId: firstDefined(source, ['campaignId', 'campaign', 'specialCampaignId']),
    offerId: offer.id,
  })
  const queueEntries = queue.map((type) => ({
    type,
    source: 'emergency-supply',
    bonusShot: true,
    damageBonus: 0,
    countsForReserveStars: false,
    countsForReserveBonus: false,
  }))
  return deepFreeze({
    ok: true,
    reason: 'purchased',
    opportunityUsed: true,
    goldenAcornsBefore: quote.goldenAcorns,
    goldenAcornsSpent: offer.goldenAcornCost,
    goldenAcornsRemaining: quote.goldenAcorns - offer.goldenAcornCost,
    addedAcorns: offer.acornCount,
    offer,
    queue: [...queue],
    queueEntries,
    ammoPool: eligibility.ammoPool,
    eligibility,
  })
}
