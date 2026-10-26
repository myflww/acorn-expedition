// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { Rng, dateSeed, mixSeed } from './game-core.js'

const DATE_KEY_PATTERN = /^\d{8}$/u
const WEEK_KEY_PATTERN = /^(\d{4})-W(\d{2})$/u

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

function nonNegativeInteger(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback
  let numeric
  try {
    numeric = Number(value)
  } catch {
    return fallback
  }
  if (!Number.isFinite(numeric) || numeric < 0) return fallback
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric))
}

function booleanValue(value, fallback = false) {
  if (value === true || value === 1 || value === 'true') return true
  if (value === false || value === 0 || value === 'false') return false
  return fallback
}

function seedParts(value) {
  const text = String(value)
  if (!DATE_KEY_PATTERN.test(text)) throw new RangeError('daily challenge date seed must use YYYYMMDD')
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(4, 6))
  const day = Number(text.slice(6, 8))
  // Reuse the core calendar validation so impossible dates cannot enter saves.
  const seed = dateSeed({ year, month, day })
  return { year, month, day, seed, key: String(seed) }
}

function normalizeDateSeed(value = new Date()) {
  let candidate = value
  if (isRecord(candidate) && !(candidate instanceof Date)) {
    candidate = firstDefined(candidate, ['dateSeed', 'dateKey', 'date', 'day']) ?? candidate
  }
  if ((typeof candidate === 'number' && Number.isSafeInteger(candidate))
    || (typeof candidate === 'string' && DATE_KEY_PATTERN.test(candidate))) {
    return seedParts(candidate).seed
  }
  return dateSeed(candidate)
}

function dateKey(value = new Date()) {
  return String(normalizeDateSeed(value))
}

function weeksInIsoYear(year) {
  const december28 = new Date(Date.UTC(year, 11, 28))
  const day = december28.getUTCDay() || 7
  december28.setUTCDate(december28.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(december28.getUTCFullYear(), 0, 1))
  return Math.ceil((((december28 - yearStart) / 86_400_000) + 1) / 7)
}

function validWeekKey(value) {
  if (typeof value !== 'string') return false
  const match = WEEK_KEY_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const week = Number(match[2])
  return week >= 1 && week <= weeksInIsoYear(year)
}

function validDateKey(value) {
  try {
    seedParts(value)
    return true
  } catch {
    return false
  }
}

/** Returns the ISO week bucket used by the compact weekly history. */
export function dailyChallengeWeekKey(value = new Date()) {
  const { year, month, day } = seedParts(normalizeDateSeed(value))
  const date = new Date(Date.UTC(year, month - 1, day))
  const isoDay = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - isoDay)
  const isoYear = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil((((date - yearStart) / 86_400_000) + 1) / 7)
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export const DAILY_CHALLENGE_VERSION = 1
export const DAILY_CHALLENGE_SEGMENT_COUNT = 3

export const DAILY_CHALLENGE_HISTORY_LIMITS = deepFreeze({
  days: 35,
  weeks: 12,
})

export const DAILY_CHALLENGE_COMPLETION_REWARD = deepFreeze({
  id: 'daily-contract-clear',
  name: '今日远征薪酬',
  goldenAcorns: 1,
})

export const DAILY_CHALLENGE_SEGMENTS = deepFreeze([
  {
    number: 1,
    id: 'morning-patrol',
    title: '晨间巡逻',
    summary: '先拔掉王国外围岗哨，为今日远征测试弹道与阵容。',
    encounter: 'patrol',
    difficulty: 1,
    objective: {
      type: 'defeat-all',
      minimumCollapseRatio: 0,
      bossRequired: false,
    },
  },
  {
    number: 2,
    id: 'tactical-breakout',
    title: '战术突围',
    summary: '突破增援防线，在更紧的弹药与倒塌要求中找到承重弱点。',
    encounter: 'breakout',
    difficulty: 2,
    objective: {
      type: 'clear-and-collapse',
      minimumCollapseRatio: 0.25,
      bossRequired: false,
    },
  },
  {
    number: 3,
    id: 'daily-showdown',
    title: '今日决战',
    summary: '攻入今日王国据点，击破守将与加固的最后防线。',
    encounter: 'showdown',
    difficulty: 3,
    objective: {
      type: 'defeat-boss',
      minimumCollapseRatio: 0.35,
      bossRequired: true,
    },
  },
])

export const DAILY_CHALLENGE_BOONS = deepFreeze([
  {
    id: 'quartermaster-cache',
    kind: 'boon',
    name: '林间军需',
    description: '每段契约的基础弹药增加 1 枚。',
    effects: { bonusShots: 1 },
  },
  {
    id: 'steady-sling',
    kind: 'boon',
    name: '稳固弹弓',
    description: '发射动力提高 8%，更容易攻击远端要害。',
    effects: { launchPowerMultiplier: 1.08 },
  },
  {
    id: 'bearing-ledger',
    kind: 'boon',
    name: '承重图谱',
    description: '对建筑造成的有效伤害提高 15%。',
    effects: { structureDamageMultiplier: 1.15 },
  },
  {
    id: 'windbreak-feathers',
    kind: 'boon',
    name: '避风羽标',
    description: '橡宝受到的横风偏移降低 25%。',
    effects: { acornWindMultiplier: 0.75 },
  },
  {
    id: 'vanguard-map',
    kind: 'boon',
    name: '先锋地图',
    description: '对松鼠的直接撞击伤害提高 18%。',
    effects: { targetDamageMultiplier: 1.18 },
  },
])

export const DAILY_CHALLENGE_PRESSURES = deepFreeze([
  {
    id: 'reinforced-garrison',
    kind: 'pressure',
    name: '强化驻军',
    description: '松鼠与守将的耐久提高 18%。',
    effects: { targetHpMultiplier: 1.18 },
  },
  {
    id: 'royal-masonry',
    kind: 'pressure',
    name: '王国加固',
    description: '建筑构件的耐久提高 16%。',
    effects: { structureHpMultiplier: 1.16 },
  },
  {
    id: 'crosswind-front',
    kind: 'pressure',
    name: '横风锋面',
    description: '关卡横风强度提高 35%。',
    effects: { windMultiplier: 1.35 },
  },
  {
    id: 'extra-sentry',
    kind: 'pressure',
    name: '增援哨兵',
    description: '每段契约额外部署 1 名松鼠。',
    effects: { extraTargets: 1 },
  },
  {
    id: 'tight-magazine',
    kind: 'pressure',
    name: '紧缩弹药',
    description: '每段契约的基础弹药减少 1 枚，不会削减天赋橡宝。',
    effects: { baseShotBudgetDelta: -1 },
  },
])

/**
 * Builds the complete deterministic contract for one local calendar day.
 * `generation` is shaped so the current `generateLevel` call can consume its
 * mode, level and seed without introducing a second random-number source.
 */
export function buildDailyChallenge(value = new Date()) {
  const daySeed = normalizeDateSeed(value)
  const key = String(daySeed)
  const boon = DAILY_CHALLENGE_BOONS[
    new Rng(mixSeed(daySeed, 'daily-challenge', DAILY_CHALLENGE_VERSION, 'boon'))
      .integer(0, DAILY_CHALLENGE_BOONS.length)
  ]
  const pressure = DAILY_CHALLENGE_PRESSURES[
    new Rng(mixSeed(daySeed, 'daily-challenge', DAILY_CHALLENGE_VERSION, 'pressure'))
      .integer(0, DAILY_CHALLENGE_PRESSURES.length)
  ]
  const segments = DAILY_CHALLENGE_SEGMENTS.map((segment) => {
    const levelSeed = mixSeed(daySeed, 'level', segment.number)
    return {
      ...segment,
      generation: {
        mode: 'daily',
        level: segment.number,
        runSeed: daySeed,
        levelSeed,
        seed: mixSeed(levelSeed, 'layout'),
      },
    }
  })

  return deepFreeze({
    version: DAILY_CHALLENGE_VERSION,
    id: `daily-${key}`,
    title: '今日远征契约',
    dateSeed: daySeed,
    dateKey: key,
    weekKey: dailyChallengeWeekKey(daySeed),
    modifiers: { boon, pressure },
    segments,
    completionReward: DAILY_CHALLENGE_COMPLETION_REWARD,
  })
}

function normalizeDay(value) {
  const source = isRecord(value) ? value : {}
  const completedSegments = Math.min(
    DAILY_CHALLENGE_SEGMENT_COUNT,
    nonNegativeInteger(firstDefined(source, [
      'completedSegments', 'clearedSegments', 'progress', 'level',
    ])),
  )
  const bestScore = nonNegativeInteger(firstDefined(source, [
    'bestScore', 'score', 'best',
  ]))
  const rewardClaimed = completedSegments === DAILY_CHALLENGE_SEGMENT_COUNT
    && booleanValue(firstDefined(source, ['rewardClaimed', 'claimed']))
  return { completedSegments, bestScore, rewardClaimed }
}

function normalizeDateKeys(value, weekKey) {
  if (!Array.isArray(value)) return []
  const keys = new Set()
  for (const entry of value) {
    const key = String(entry)
    if (!validDateKey(key) || dailyChallengeWeekKey(key) !== weekKey) continue
    keys.add(key)
  }
  return [...keys].sort()
}

function normalizeWeek(value, weekKey) {
  const source = isRecord(value) ? value : {}
  const completedDateKeys = normalizeDateKeys(firstDefined(source, [
    'completedDateKeys', 'completedDays',
  ]), weekKey)
  const rewardDateKeys = normalizeDateKeys(firstDefined(source, [
    'rewardDateKeys', 'claimedDays',
  ]), weekKey)
  // A claimed reward is proof of completion, even if an old/corrupt save lost
  // the matching completion marker.
  const completed = [...new Set([...completedDateKeys, ...rewardDateKeys])].sort()
  return {
    completedDateKeys: completed,
    rewardDateKeys,
    bestScore: nonNegativeInteger(firstDefined(source, ['bestScore', 'best'])),
  }
}

function latestEntries(entries, limit) {
  return entries.sort(([left], [right]) => right.localeCompare(left)).slice(0, limit)
}

/**
 * Sanitizes the persisted daily-challenge slice. The result is an immutable,
 * caller-independent value with bounded history (35 days and 12 ISO weeks).
 * A legacy `dailyBest` map may be passed directly during migration.
 */
export function normalizeDailyChallengeState(value = {}) {
  const source = isRecord(value) ? value : {}
  const daySource = isRecord(source.days) ? source.days : {}
  const legacyBest = isRecord(source.dailyBest) ? source.dailyBest : {}
  const allDayKeys = new Set([...Object.keys(daySource), ...Object.keys(legacyBest)])
  const dayEntries = []
  for (const key of allDayKeys) {
    if (!validDateKey(key)) continue
    const normalized = normalizeDay(daySource[key])
    normalized.bestScore = Math.max(normalized.bestScore, nonNegativeInteger(legacyBest[key]))
    dayEntries.push([key, normalized])
  }

  const weeksSource = isRecord(source.weeks) ? source.weeks
    : isRecord(source.weekly) ? source.weekly : {}
  const weekEntries = []
  for (const [key, entry] of Object.entries(weeksSource)) {
    if (!validWeekKey(key)) continue
    weekEntries.push([key, normalizeWeek(entry, key)])
  }

  const days = Object.fromEntries(latestEntries(
    dayEntries,
    DAILY_CHALLENGE_HISTORY_LIMITS.days,
  ))
  const weeks = Object.fromEntries(weekEntries)
  // Reconstruct the retained portion of weekly history from authoritative day
  // records. This makes migrations and partially-written saves self-healing.
  for (const [key, day] of Object.entries(days)) {
    const weekKey = dailyChallengeWeekKey(key)
    weeks[weekKey] ||= normalizeWeek({}, weekKey)
    const week = weeks[weekKey]
    // The weekly claim marker is the idempotency backstop if a write was
    // interrupted after recording the reward but before updating the day.
    if (week.rewardDateKeys.includes(key)) {
      day.completedSegments = DAILY_CHALLENGE_SEGMENT_COUNT
      day.rewardClaimed = true
    }
    week.bestScore = Math.max(week.bestScore, day.bestScore)
    if (day.completedSegments === DAILY_CHALLENGE_SEGMENT_COUNT) {
      addUniqueDate(week.completedDateKeys, key)
    }
    if (day.rewardClaimed) addUniqueDate(week.rewardDateKeys, key)
  }

  return deepFreeze({
    version: DAILY_CHALLENGE_VERSION,
    days,
    weeks: Object.fromEntries(latestEntries(
      Object.entries(weeks),
      DAILY_CHALLENGE_HISTORY_LIMITS.weeks,
    )),
  })
}

function mutableState(value) {
  const normalized = normalizeDailyChallengeState(value)
  return {
    version: DAILY_CHALLENGE_VERSION,
    days: Object.fromEntries(Object.entries(normalized.days).map(([key, day]) => [key, { ...day }])),
    weeks: Object.fromEntries(Object.entries(normalized.weeks).map(([key, week]) => [key, {
      ...week,
      completedDateKeys: [...week.completedDateKeys],
      rewardDateKeys: [...week.rewardDateKeys],
    }])),
  }
}

function ensureWeek(state, weekKey) {
  state.weeks[weekKey] ||= {
    completedDateKeys: [],
    rewardDateKeys: [],
    bestScore: 0,
  }
  return state.weeks[weekKey]
}

function addUniqueDate(values, key) {
  if (!values.includes(key)) values.push(key)
  values.sort()
}

function statusFromNormalized(state, value) {
  const key = dateKey(value)
  const weekKey = dailyChallengeWeekKey(key)
  const day = state.days[key] || normalizeDay()
  const week = state.weeks[weekKey] || normalizeWeek({}, weekKey)
  const completed = day.completedSegments === DAILY_CHALLENGE_SEGMENT_COUNT
  return deepFreeze({
    dateKey: key,
    weekKey,
    completedSegments: day.completedSegments,
    nextSegment: completed ? null : day.completedSegments + 1,
    completed,
    bestScore: day.bestScore,
    rewardClaimed: day.rewardClaimed,
    rewardAvailable: completed && !day.rewardClaimed,
    week: {
      completedDays: week.completedDateKeys.length,
      rewardDays: week.rewardDateKeys.length,
      bestScore: week.bestScore,
    },
  })
}

/** Returns presentation-ready progress without exposing mutable save records. */
export function getDailyChallengeStatus(value = {}, dateValue = new Date()) {
  const state = normalizeDailyChallengeState(value)
  return statusFromNormalized(state, dateValue)
}

function failedResult(state, reason, dateValue = null) {
  let status = null
  if (dateValue !== null) {
    try {
      status = statusFromNormalized(state, dateValue)
    } catch {
      // Invalid date input intentionally has no status payload.
    }
  }
  return deepFreeze({
    ok: false,
    reason,
    state,
    status,
    bestImproved: false,
    segmentAdvanced: false,
    challengeCompletedNow: false,
  })
}

/**
 * Records one attempt. Cleared segments advance only in order, replaying a
 * segment never double-counts the day, and the best run score is monotonic.
 */
export function recordDailyChallengeSegment(value = {}, result = {}) {
  const state = normalizeDailyChallengeState(value)
  const source = isRecord(result) ? result : {}
  const dateValue = firstDefined(source, ['dateSeed', 'dateKey', 'date']) ?? new Date()
  let key
  try {
    key = dateKey(dateValue)
  } catch {
    return failedResult(state, 'invalid-date')
  }
  const segment = Number(firstDefined(source, ['segment', 'segmentNumber', 'level']))
  if (!Number.isInteger(segment) || segment < 1 || segment > DAILY_CHALLENGE_SEGMENT_COUNT) {
    return failedResult(state, 'invalid-segment', key)
  }

  const previous = state.days[key] || normalizeDay()
  const cleared = booleanValue(firstDefined(source, ['cleared', 'completed', 'won']))
  if (segment > previous.completedSegments + 1) {
    return failedResult(state, 'out-of-sequence', key)
  }

  const next = mutableState(state)
  const day = { ...previous }
  const score = nonNegativeInteger(firstDefined(source, ['score', 'runScore', 'bestScore']))
  const bestImproved = score > day.bestScore
  day.bestScore = Math.max(day.bestScore, score)
  const segmentAdvanced = cleared && segment === previous.completedSegments + 1
  if (segmentAdvanced) day.completedSegments = segment
  next.days[key] = day

  const weekKey = dailyChallengeWeekKey(key)
  const week = ensureWeek(next, weekKey)
  week.bestScore = Math.max(week.bestScore, day.bestScore)
  const challengeCompletedNow = segmentAdvanced
    && day.completedSegments === DAILY_CHALLENGE_SEGMENT_COUNT
  if (challengeCompletedNow) addUniqueDate(week.completedDateKeys, key)

  const normalized = normalizeDailyChallengeState(next)
  const reason = segmentAdvanced ? 'segment-cleared'
    : cleared ? 'segment-already-cleared' : 'attempt-recorded'
  return deepFreeze({
    ok: true,
    reason,
    state: normalized,
    status: statusFromNormalized(normalized, key),
    bestImproved,
    segmentAdvanced,
    challengeCompletedNow,
  })
}

/**
 * Claims the fixed completion reward exactly once for a date. Currency is not
 * mutated here: the integration layer credits `reward.goldenAcorns` and saves
 * the returned state in the same transaction.
 */
export function claimDailyChallengeReward(value = {}, options = {}) {
  const state = normalizeDailyChallengeState(value)
  const source = isRecord(options) ? options : { date: options }
  const dateValue = firstDefined(source, ['dateSeed', 'dateKey', 'date']) ?? new Date()
  let key
  try {
    key = dateKey(dateValue)
  } catch {
    return deepFreeze({
      ok: false,
      reason: 'invalid-date',
      state,
      status: null,
      reward: null,
    })
  }
  const day = state.days[key] || normalizeDay()
  if (day.completedSegments < DAILY_CHALLENGE_SEGMENT_COUNT) {
    return deepFreeze({
      ok: false,
      reason: 'challenge-incomplete',
      state,
      status: statusFromNormalized(state, key),
      reward: null,
    })
  }
  if (day.rewardClaimed) {
    return deepFreeze({
      ok: false,
      reason: 'reward-already-claimed',
      state,
      status: statusFromNormalized(state, key),
      reward: null,
    })
  }

  const next = mutableState(state)
  next.days[key] = { ...day, rewardClaimed: true }
  const weekKey = dailyChallengeWeekKey(key)
  const week = ensureWeek(next, weekKey)
  addUniqueDate(week.completedDateKeys, key)
  addUniqueDate(week.rewardDateKeys, key)
  week.bestScore = Math.max(week.bestScore, day.bestScore)
  const normalized = normalizeDailyChallengeState(next)

  return deepFreeze({
    ok: true,
    reason: 'reward-claimed',
    state: normalized,
    status: statusFromNormalized(normalized, key),
    reward: DAILY_CHALLENGE_COMPLETION_REWARD,
  })
}
