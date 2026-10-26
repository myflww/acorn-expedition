// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DAILY_CHALLENGE_BOONS,
  DAILY_CHALLENGE_COMPLETION_REWARD,
  DAILY_CHALLENGE_HISTORY_LIMITS,
  DAILY_CHALLENGE_PRESSURES,
  DAILY_CHALLENGE_SEGMENT_COUNT,
  DAILY_CHALLENGE_SEGMENTS,
  buildDailyChallenge,
  claimDailyChallengeReward,
  dailyChallengeWeekKey,
  getDailyChallengeStatus,
  normalizeDailyChallengeState,
  recordDailyChallengeSegment,
} from '../src/daily-challenges.js'
import { mixSeed } from '../src/game-core.js'

const TEST_DAY = '2026-08-31'
const TEST_DAY_KEY = '20260831'

function clearDay(state, date, baseScore = 1_000) {
  let next = state
  for (let segment = 1; segment <= DAILY_CHALLENGE_SEGMENT_COUNT; segment += 1) {
    const result = recordDailyChallengeSegment(next, {
      date,
      segment,
      cleared: true,
      score: baseScore * segment,
    })
    assert.equal(result.ok, true)
    next = result.state
  }
  return next
}

test('daily contract has three named stages and exactly one deterministic boon and pressure', () => {
  const first = buildDailyChallenge(TEST_DAY)
  const second = buildDailyChallenge(20260831)

  assert.deepEqual(first, second)
  assert.equal(first.dateKey, TEST_DAY_KEY)
  assert.equal(first.weekKey, '2026-W36')
  assert.equal(first.segments.length, 3)
  assert.deepEqual(first.segments.map((segment) => segment.title), [
    '晨间巡逻',
    '战术突围',
    '今日决战',
  ])
  assert.equal(first.modifiers.boon.kind, 'boon')
  assert.equal(first.modifiers.pressure.kind, 'pressure')
  assert.ok(DAILY_CHALLENGE_BOONS.some(({ id }) => id === first.modifiers.boon.id))
  assert.ok(DAILY_CHALLENGE_PRESSURES.some(({ id }) => id === first.modifiers.pressure.id))
  assert.deepEqual(first.completionReward, DAILY_CHALLENGE_COMPLETION_REWARD)

  for (const [index, segment] of first.segments.entries()) {
    const number = index + 1
    const levelSeed = mixSeed(first.dateSeed, 'level', number)
    assert.deepEqual(segment.generation, {
      mode: 'daily',
      level: number,
      runSeed: first.dateSeed,
      levelSeed,
      seed: mixSeed(levelSeed, 'layout'),
    })
  }

  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.modifiers))
  assert.ok(Object.isFrozen(first.segments[0].objective))
  assert.ok(Object.isFrozen(DAILY_CHALLENGE_SEGMENTS))
})

test('date seeding is calendar-safe, ISO-week aware and varies across days', () => {
  assert.equal(dailyChallengeWeekKey('2026-12-31'), '2026-W53')
  assert.equal(dailyChallengeWeekKey('2027-01-01'), '2026-W53')
  assert.equal(dailyChallengeWeekKey('2027-01-04'), '2027-W01')
  assert.throws(() => buildDailyChallenge('2026-02-30'), /invalid calendar/i)
  assert.throws(() => buildDailyChallenge(20260230), /invalid calendar/i)

  const contracts = Array.from({ length: 21 }, (_, offset) =>
    buildDailyChallenge(`2026-08-${String(offset + 1).padStart(2, '0')}`))
  const boonIds = new Set(contracts.map((contract) => contract.modifiers.boon.id))
  const pressureIds = new Set(contracts.map((contract) => contract.modifiers.pressure.id))
  assert.ok(boonIds.size > 1)
  assert.ok(pressureIds.size > 1)
  assert.equal(new Set(contracts.map((contract) => contract.id)).size, contracts.length)
})

test('state normalization sanitizes corruption, migrates dailyBest and returns independent frozen data', () => {
  const input = {
    days: {
      [TEST_DAY_KEY]: {
        completedSegments: 99,
        bestScore: '1250',
        rewardClaimed: false,
      },
      20260230: { completedSegments: 3, bestScore: 999_999 },
      garbage: { completedSegments: 3 },
    },
    dailyBest: {
      [TEST_DAY_KEY]: 2_000,
      20260901: 750,
      invalid: 50_000,
    },
    weeks: {
      '2026-W36': {
        completedDays: [TEST_DAY_KEY, TEST_DAY_KEY, 'not-a-day'],
        claimedDays: [TEST_DAY_KEY],
        best: 1_500,
      },
      '2026-W99': { bestScore: 999_999 },
    },
  }

  const normalized = normalizeDailyChallengeState(input)
  input.days[TEST_DAY_KEY].bestScore = 9_999_999
  input.weeks['2026-W36'].completedDays.push('20260901')

  assert.deepEqual(normalized.days[TEST_DAY_KEY], {
    completedSegments: 3,
    bestScore: 2_000,
    rewardClaimed: true,
  })
  assert.deepEqual(normalized.days['20260901'], {
    completedSegments: 0,
    bestScore: 750,
    rewardClaimed: false,
  })
  assert.equal(normalized.days['20260230'], undefined)
  assert.equal(normalized.weeks['2026-W99'], undefined)
  assert.deepEqual(normalized.weeks['2026-W36'].completedDateKeys, [TEST_DAY_KEY])
  assert.deepEqual(normalized.weeks['2026-W36'].rewardDateKeys, [TEST_DAY_KEY])
  assert.equal(normalized.weeks['2026-W36'].bestScore, 2_000)
  assert.ok(Object.isFrozen(normalized))
  assert.ok(Object.isFrozen(normalized.days[TEST_DAY_KEY]))
  assert.ok(Object.isFrozen(normalized.weeks['2026-W36'].completedDateKeys))
})

test('progress is sequential, replays do not double-count and best score only increases', () => {
  const skipped = recordDailyChallengeSegment({}, {
    date: TEST_DAY,
    segment: 2,
    cleared: true,
    score: 10_000,
  })
  assert.equal(skipped.ok, false)
  assert.equal(skipped.reason, 'out-of-sequence')
  assert.equal(skipped.status.completedSegments, 0)
  assert.equal(skipped.status.bestScore, 0)

  const failed = recordDailyChallengeSegment({}, {
    date: TEST_DAY,
    segment: 1,
    cleared: false,
    score: 500,
  })
  assert.equal(failed.reason, 'attempt-recorded')
  assert.equal(failed.status.completedSegments, 0)
  assert.equal(failed.status.bestScore, 500)
  assert.equal(failed.bestImproved, true)

  const cleared = recordDailyChallengeSegment(failed.state, {
    date: TEST_DAY,
    segment: 1,
    cleared: true,
    score: 400,
  })
  assert.equal(cleared.segmentAdvanced, true)
  assert.equal(cleared.status.completedSegments, 1)
  assert.equal(cleared.status.bestScore, 500)
  assert.equal(cleared.bestImproved, false)

  const replay = recordDailyChallengeSegment(cleared.state, {
    date: TEST_DAY,
    segment: 1,
    cleared: true,
    score: 650,
  })
  assert.equal(replay.reason, 'segment-already-cleared')
  assert.equal(replay.segmentAdvanced, false)
  assert.equal(replay.status.completedSegments, 1)
  assert.equal(replay.status.bestScore, 650)
  assert.equal(replay.status.week.completedDays, 0)

  const stage2 = recordDailyChallengeSegment(replay.state, {
    date: TEST_DAY,
    segment: 2,
    cleared: true,
    score: 1_200,
  })
  const stage3 = recordDailyChallengeSegment(stage2.state, {
    date: TEST_DAY,
    segment: 3,
    cleared: true,
    score: 3_000,
  })
  assert.equal(stage3.challengeCompletedNow, true)
  assert.equal(stage3.status.completed, true)
  assert.equal(stage3.status.nextSegment, null)
  assert.equal(stage3.status.rewardAvailable, true)
  assert.equal(stage3.status.week.completedDays, 1)

  const finaleReplay = recordDailyChallengeSegment(stage3.state, {
    date: TEST_DAY,
    segment: 3,
    cleared: true,
    score: 2_500,
  })
  assert.equal(finaleReplay.challengeCompletedNow, false)
  assert.equal(finaleReplay.status.week.completedDays, 1)
  assert.equal(finaleReplay.status.bestScore, 3_000)
})

test('completion reward is unavailable early and can be claimed only once per date', () => {
  const twoSegments = recordDailyChallengeSegment(
    recordDailyChallengeSegment({}, {
      date: TEST_DAY,
      segment: 1,
      cleared: true,
      score: 1_000,
    }).state,
    {
      date: TEST_DAY,
      segment: 2,
      cleared: true,
      score: 2_000,
    },
  ).state

  const early = claimDailyChallengeReward(twoSegments, { date: TEST_DAY })
  assert.equal(early.ok, false)
  assert.equal(early.reason, 'challenge-incomplete')
  assert.equal(early.reward, null)

  const complete = recordDailyChallengeSegment(twoSegments, {
    date: TEST_DAY,
    segment: 3,
    cleared: true,
    score: 3_000,
  }).state
  const claimed = claimDailyChallengeReward(complete, { date: TEST_DAY })
  assert.equal(claimed.ok, true)
  assert.equal(claimed.reward.goldenAcorns, 1)
  assert.equal(claimed.status.rewardClaimed, true)
  assert.equal(claimed.status.rewardAvailable, false)
  assert.equal(claimed.status.week.rewardDays, 1)

  const duplicate = claimDailyChallengeReward(claimed.state, { date: TEST_DAY })
  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.reason, 'reward-already-claimed')
  assert.equal(duplicate.reward, null)
  assert.equal(duplicate.status.week.rewardDays, 1)
})

test('weekly records stay unique and summarize multiple completed days', () => {
  let state = clearDay({}, '2026-08-31', 1_000)
  state = claimDailyChallengeReward(state, { date: '2026-08-31' }).state
  state = clearDay(state, '2026-09-01', 2_000)
  state = claimDailyChallengeReward(state, { date: '2026-09-01' }).state

  const monday = getDailyChallengeStatus(state, '2026-08-31')
  const tuesday = getDailyChallengeStatus(state, '2026-09-01')
  assert.equal(monday.weekKey, '2026-W36')
  assert.equal(tuesday.weekKey, monday.weekKey)
  assert.deepEqual(monday.week, {
    completedDays: 2,
    rewardDays: 2,
    bestScore: 6_000,
  })

  const normalizedAgain = normalizeDailyChallengeState(state)
  assert.deepEqual(normalizedAgain, state)
  assert.deepEqual(normalizedAgain.weeks['2026-W36'].completedDateKeys, [
    '20260831',
    '20260901',
  ])
})

test('normalization bounds retained day and week history', () => {
  const days = {}
  const date = new Date(Date.UTC(2026, 0, 1))
  for (let index = 0; index < 50; index += 1) {
    const key = date.toISOString().slice(0, 10).replaceAll('-', '')
    days[key] = { completedSegments: 1, bestScore: index }
    date.setUTCDate(date.getUTCDate() + 1)
  }
  const weeks = {}
  for (let week = 1; week <= 20; week += 1) {
    weeks[`2026-W${String(week).padStart(2, '0')}`] = { bestScore: week }
  }

  const normalized = normalizeDailyChallengeState({ days, weeks })
  assert.equal(Object.keys(normalized.days).length, DAILY_CHALLENGE_HISTORY_LIMITS.days)
  assert.equal(Object.keys(normalized.weeks).length, DAILY_CHALLENGE_HISTORY_LIMITS.weeks)
  assert.equal(normalized.days['20260101'], undefined)
  assert.ok(normalized.days['20260219'])
  assert.equal(normalized.weeks['2026-W01'], undefined)
  assert.ok(normalized.weeks['2026-W20'])
})
