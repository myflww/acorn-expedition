// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  MAIN_LEVELS,
  MAX_ZOOM,
  MIN_ZOOM,
  TALENT_SCORE_MILESTONES,
  dateSeed,
} from './game-core.js'
import {
  SPECIAL_CAMPAIGN_IDS,
  SPECIAL_STAGE_COUNT_PER_CAMPAIGN,
} from './special-campaigns.js'
import { DAILY_CHALLENGE_SEGMENT_COUNT } from './daily-challenges.js'
import {
  TALENT_PROGRESSION_IDS,
  TALENT_PROGRESSION_VERSION,
  normalizeTalentProgression,
} from './talent-progression.js'

export const RUN_CHECKPOINT_VERSION = 2
export const RUN_CHECKPOINT_PHASE = 'level-start'
export const RUN_CHECKPOINT_MODES = Object.freeze(['main', 'endless', 'daily', 'special'])
export const RUN_CHECKPOINT_STATUSES = Object.freeze(['active', 'completed'])

const MODE_SET = new Set(RUN_CHECKPOINT_MODES)
const STATUS_SET = new Set(RUN_CHECKPOINT_STATUSES)
const CAMPAIGN_SET = new Set(SPECIAL_CAMPAIGN_IDS)
const TALENT_IDS = TALENT_PROGRESSION_IDS
const TALENT_ID_SET = new Set(TALENT_IDS)
const UINT32_MAX = 0xffff_ffff
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER

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

function unwrapCheckpoint(value) {
  if (!isRecord(value)) return null
  if (isRecord(value.runCheckpoint)) return value.runCheckpoint
  if (isRecord(value.checkpoint)) return value.checkpoint
  if (isRecord(value.data)
    && (typeof value.data.mode === 'string' || typeof value.data.runMode === 'string')) {
    return value.data
  }
  return value
}

function integer(value, { minimum = 0, maximum = MAX_SAFE_INTEGER, legacy = false } = {}) {
  if (legacy && typeof value === 'string' && /^\d+$/u.test(value.trim())) value = Number(value)
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value < minimum || value > maximum) return null
  return value
}

function number(value, { minimum = -Infinity, maximum = Infinity, legacy = false } = {}) {
  if (legacy && typeof value === 'string' && value.trim() !== '') value = Number(value)
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < minimum || value > maximum) return null
  return value
}

function boolean(value, fallback, legacy) {
  if (typeof value === 'boolean') return value
  if (legacy) {
    if (value === 1 || value === '1' || value === 'true') return true
    if (value === 0 || value === '0' || value === 'false') return false
  }
  return fallback
}

function validDailySeed(runSeed) {
  const text = String(runSeed)
  if (!/^\d{8}$/u.test(text)) return false
  try {
    return dateSeed(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`) === runSeed
  } catch {
    return false
  }
}

function validLevel(mode, value) {
  if (mode === 'main') return value >= 1 && value <= MAIN_LEVELS
  if (mode === 'endless') return value >= MAIN_LEVELS + 1
  if (mode === 'daily') return value >= 1 && value <= DAILY_CHALLENGE_SEGMENT_COUNT
  if (mode === 'special') return value >= 1 && value <= SPECIAL_STAGE_COUNT_PER_CAMPAIGN
  return false
}

function normalizeLegacyTalents(value, legacy) {
  const enabled = new Set()
  if (legacy && Array.isArray(value)) {
    for (const id of value) if (typeof id === 'string' && TALENT_ID_SET.has(id)) enabled.add(id)
  } else if (isRecord(value)) {
    for (const [id, rank] of Object.entries(value)) {
      if (!TALENT_ID_SET.has(id)) continue
      if (rank === 1 || rank === true || (legacy && (rank === '1' || rank === 'true'))) enabled.add(id)
    }
  }
  const talents = {}
  for (const id of TALENT_IDS) if (enabled.has(id)) talents[id] = 1
  return talents
}

function normalizeLegacyTalentProgression(source, legacy) {
  const ranks = normalizeLegacyTalents(firstDefined(source, ['talents', 'selectedTalents']), legacy)
  return normalizeTalentProgression({ ranks })
}

function normalizeVersionTwoTalentProgression(value) {
  if (!isRecord(value)
    || value.version !== TALENT_PROGRESSION_VERSION
    || !isRecord(value.ranks)
    || !Array.isArray(value.fusionIds)
    || !Array.isArray(value.specialTalentIds)) return null

  // Version two never coerces or clamps rank values. Unknown ids and invalid
  // fusion/special ids are safe to discard, while the progression module is
  // the single source of truth for fusion prerequisites and source conflicts.
  const ranks = {}
  for (const [id, rank] of Object.entries(value.ranks)) {
    if (!TALENT_ID_SET.has(id)) continue
    if (typeof rank === 'number' && Number.isInteger(rank) && rank >= 1 && rank <= 3) ranks[id] = rank
  }
  const fusionIds = value.fusionIds.filter((id) => typeof id === 'string')
  const specialTalentIds = value.specialTalentIds.filter((id) => typeof id === 'string')
  return normalizeTalentProgression({
    version: TALENT_PROGRESSION_VERSION,
    ranks,
    fusionIds,
    specialTalentIds,
  })
}

function normalizeCheckpointTalentProgression(source, checkpointFormat, legacy) {
  if (checkpointFormat === 'v2') return normalizeVersionTwoTalentProgression(source.talentProgression)
  return normalizeLegacyTalentProgression(source, legacy)
}

function earnedTalentCount(score) {
  let count = 0
  for (const milestone of TALENT_SCORE_MILESTONES) {
    if (score < milestone.score) break
    count += 1
  }
  return count
}

function progressionChoiceCount(progression) {
  const rankChoices = Object.values(progression.ranks).reduce((sum, rank) => sum + rank, 0)
  return rankChoices + progression.fusionIds.length + progression.specialTalentIds.length
}

function normalizeCounts(source, progression, score, legacy) {
  const talentCount = progressionChoiceCount(progression)
  const earnedCount = earnedTalentCount(score)
  if (talentCount > earnedCount) return null

  const claimedValue = integer(firstDefined(source, [
    'talentClaimedCount', 'claimed', 'claimedCount',
  ]), { maximum: TALENT_SCORE_MILESTONES.length, legacy })
  const eligibleValue = integer(firstDefined(source, [
    'talentEligibleCount', 'eligible', 'eligibleCount',
  ]), { maximum: TALENT_SCORE_MILESTONES.length, legacy })

  // The canonical progression is authoritative. Rank upgrades, fusions and
  // special contracts each consume one earned selection; stored counters can
  // never manufacture an extra claim.
  const talentClaimedCount = talentCount
  const defaultEligible = Math.max(1, talentClaimedCount)
  const requestedEligible = eligibleValue ?? Math.max(defaultEligible, claimedValue ?? 0)
  const talentEligibleCount = Math.min(
    earnedCount,
    talentClaimedCount + 1,
    Math.max(defaultEligible, talentClaimedCount, requestedEligible),
  )

  return { talentClaimedCount, talentEligibleCount }
}

function normalizeStatus(source, legacy) {
  const explicit = source.status
  if (explicit !== undefined) return STATUS_SET.has(explicit) ? explicit : null
  if (legacy && boolean(source.completed, false, true)) return 'completed'
  return 'active'
}

/**
 * Canonicalizes persisted checkpoint data. Invalid identity fields return
 * null; optional or derived fields are stripped, clamped, or rebuilt.
 *
 * A checkpoint always represents the beginning of a level. Any mid-level
 * score is deliberately rolled back to the lower level-start value so a
 * refresh can never keep points while recreating an untouched structure.
 */
export function normalizeRunCheckpoint(value) {
  const source = unwrapCheckpoint(value)
  if (!source) return null

  const versionValue = source.version
  const legacy = versionValue === undefined || versionValue === 0
  const versionOne = versionValue === 1
  const checkpointFormat = versionValue === RUN_CHECKPOINT_VERSION ? 'v2' : 'legacy'
  if (!legacy && !versionOne && checkpointFormat !== 'v2') return null
  if (source.phase !== undefined && source.phase !== RUN_CHECKPOINT_PHASE) return null

  const mode = firstDefined(source, ['mode', 'runMode'])
  if (!MODE_SET.has(mode)) return null

  const level = integer(firstDefined(source, ['level', 'stage', 'stageNumber']), {
    minimum: 1,
    legacy,
  })
  if (level === null || !validLevel(mode, level)) return null

  const runSeed = integer(firstDefined(source, ['runSeed', 'seed']), {
    minimum: 1,
    maximum: UINT32_MAX,
    legacy,
  })
  if (runSeed === null || (mode === 'daily' && !validDailySeed(runSeed))) return null

  const rawCampaign = firstDefined(source, ['campaign', 'specialCampaignId', 'campaignId'])
  const campaign = mode === 'special' && typeof rawCampaign === 'string' && CAMPAIGN_SET.has(rawCampaign)
    ? rawCampaign
    : null
  if (mode === 'special' && campaign === null) return null

  const rawScore = integer(source.score, { legacy })
  const rawLevelStartScore = integer(firstDefined(source, ['levelStartScore', 'startScore']), { legacy })
  if (rawScore === null && rawLevelStartScore === null) return null
  const checkpointScore = rawScore === null
    ? rawLevelStartScore
    : rawLevelStartScore === null ? rawScore : Math.min(rawScore, rawLevelStartScore)

  const talentProgression = normalizeCheckpointTalentProgression(source, checkpointFormat, legacy)
  if (!talentProgression) return null
  const counts = normalizeCounts(source, talentProgression, checkpointScore, legacy)
  if (!counts) return null
  const talentRerollCount = integer(source.talentRerollCount, {
    maximum: TALENT_SCORE_MILESTONES.length * 20,
    legacy,
  }) ?? 0

  const zoom = number(firstDefined(source, ['zoomPref', 'zoom']), {
    minimum: MIN_ZOOM,
    maximum: MAX_ZOOM,
    legacy,
  })
  const status = normalizeStatus(source, legacy || versionOne)
  if (status === null) return null

  return deepFreeze({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status,
    mode,
    level,
    campaign,
    runSeed,
    score: checkpointScore,
    levelStartScore: checkpointScore,
    talentProgression,
    talents: talentProgression.ranks,
    talentClaimedCount: counts.talentClaimedCount,
    talentEligibleCount: counts.talentEligibleCount,
    talentRerollCount,
    zoomPref: zoom ?? 1,
    missionCollapsed: boolean(source.missionCollapsed, false, legacy),
  })
}

/**
 * Creates an active level-start checkpoint from live run fields. Throws for
 * impossible mode/level/seed combinations so integration mistakes fail fast.
 */
export function createRunCheckpoint(source = {}) {
  if (!isRecord(source)) throw new TypeError('run checkpoint source must be an object')
  const mode = source.mode ?? 'main'
  const score = source.score ?? 0
  const talentProgression = normalizeTalentProgression(source.talentProgression ?? {
    ranks: source.talents ?? {},
    fusionIds: source.fusionIds ?? source.talentFusionIds ?? [],
    specialTalentIds: source.specialTalentIds ?? [],
  })
  const candidate = {
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode,
    level: source.level ?? (mode === 'endless' ? MAIN_LEVELS + 1 : 1),
    campaign: source.campaign ?? source.specialCampaignId ?? null,
    runSeed: source.runSeed ?? 1,
    score,
    levelStartScore: source.levelStartScore ?? score,
    talentProgression,
    talents: talentProgression.ranks,
    talentClaimedCount: source.talentClaimedCount ?? source.claimed ?? 0,
    talentEligibleCount: source.talentEligibleCount ?? source.eligible ?? 1,
    talentRerollCount: source.talentRerollCount ?? 0,
    zoomPref: source.zoomPref ?? 1,
    missionCollapsed: source.missionCollapsed ?? true,
  }
  const checkpoint = normalizeRunCheckpoint(candidate)
  if (!checkpoint) throw new RangeError('run checkpoint source does not describe a valid level start')
  return checkpoint
}

/**
 * Structural checks are clock-free. Callers restoring a daily run should pass
 * today's dateSeed as dailySeed; an older daily checkpoint then becomes stale.
 */
export function isRunCheckpointResumable(value, { dailySeed } = {}) {
  const checkpoint = normalizeRunCheckpoint(value)
  if (!checkpoint || checkpoint.status !== 'active') return false
  if (checkpoint.mode !== 'daily' || dailySeed === undefined) return true
  const expectedSeed = integer(dailySeed, { minimum: 1, maximum: UINT32_MAX })
  return expectedSeed !== null && checkpoint.runSeed === expectedSeed
}

export const canResumeRunCheckpoint = isRunCheckpointResumable

export function completeRunCheckpoint(value) {
  const checkpoint = normalizeRunCheckpoint(value)
  if (!checkpoint) return null
  return deepFreeze({ ...checkpoint, status: 'completed' })
}

export function clearRunCheckpoint() {
  return null
}
