// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TALENT_SCORE_MILESTONES, advanceTalentUnlockOnClear,
  awardAchievement, createDefaultSaveData, mixSeed,
} from '../src/game-core.js'
import { createRunCheckpoint } from '../src/run-checkpoint.js'
import { createRunSlots, getLastActiveRunCheckpoint, getRunSlot, runSlotIdFor, updateRunSlot } from '../src/run-slots.js'
import { normalizeFailureAidState } from '../src/failure-aid.js'
import { getSpecialCampaign, getSpecialStage, SPECIAL_CAMPAIGN_IDS } from '../src/special-campaigns.js'
import { buildSpecialBackgroundScene } from '../src/special-backgrounds.js'
import { claimGoldenAcornReward, normalizeEncounterRewards } from '../src/encounter-rewards.js'
import { claimDailyChallengeReward, recordDailyChallengeSegment } from '../src/daily-challenges.js'

const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')

// Execute the shipped game methods, with only their browser/environment
// boundary replaced. These regressions must fail if runtime wiring is removed.
function runtimeMethod(name, dependencies = {}) {
  const start = source.indexOf(`\n  ${name}(`)
  assert.ok(start >= 0, `runtime method ${name} exists`)
  const tail = source.slice(start + 1)
  const next = tail.slice(1).search(/\n  [A-Za-z]\w*\(/u)
  const method = next < 0 ? tail : tail.slice(0, next + 1)
  return new Function(...Object.keys(dependencies), `return ({${method}}).${name}`)(...Object.values(dependencies))
}

test('all four run modes restore the saved seed before generating content', () => {
  for (const [mode, level] of [['main', 7], ['endless', 31], ['daily', 2], ['special', 3]]) {
    const campaign = mode === 'special' ? SPECIAL_CAMPAIGN_IDS[0] : null
    const checkpoint = createRunCheckpoint({ mode, level, campaign, runSeed: 20260907, score: 20000 })
    const slots = updateRunSlot(createRunSlots(), checkpoint, { dailySeed: 20260907 })
    const resume = runtimeMethod('resumeRun', {
      loadRunSlots: () => slots, getRunSlot, getLastActiveRunCheckpoint, updateRunSlot,
      dateSeed: () => 20260907, QA_MODE: true, getSpecialCampaign,
      getSpecialStage, buildSpecialBackgroundScene, runSlotIdFor, normalizeFailureAidState,
    })
    const context = {
      runSeed: 999, save: { failureAidStates: {} },
      setTalentProgression() {}, audio: { unlock() {}, ui() {} },
      enterPreLevelFlow() { this.restoredLevelSeed = mixSeed(this.runSeed, 'level', this.level) },
    }
    resume.call(context)
    assert.equal(context.runSeed, checkpoint.runSeed, mode)
    assert.equal(context.restoredLevelSeed, mixSeed(checkpoint.runSeed, 'level', level), mode)
    assert.equal(context.score, 20000, mode)
  }
})

test('retried and reloaded golden acorns keep score available but pay currency once', () => {
  const collect = runtimeMethod('collectEgg', { claimGoldenAcornReward })
  const context = {
    mode: 'main', level: 9, runSeed: 20260907, specialCampaignId: null,
    goldenEgg: { x: 1, y: 2 }, score: 0, save: { eggs: 0, encounterRewards: {} },
    levelScoreBreakdown: { golden: 0 }, talentEffect: (_id, _key, fallback) => fallback,
    unlock() {}, spawnBurst() {}, audio: { egg() {} }, showBanner() {}, persist() {},
  }
  collect.call(context)
  assert.equal(context.save.eggs, 1)
  assert.equal(context.score, 5000)
  context.save = JSON.parse(JSON.stringify(context.save))
  context.score = 0
  context.goldenEgg = { x: 1, y: 2 }
  collect.call(context)
  assert.equal(context.score, 5000, 'retry score opportunity remains intact')
  assert.equal(context.save.eggs, 1, 'returning to the same level-start cannot mint currency')
  context.runSeed += 1
  context.goldenEgg = { x: 1, y: 2 }
  collect.call(context)
  assert.equal(context.save.eggs, 2, 'a genuinely new expedition can earn a new reward')
  assert.deepEqual(normalizeEncounterRewards({ 'main:1:1': true, '__proto__': true, 'main:0:1': true }), { 'main:1:1': true })
})

test('achievement normalization preserves already paid encounter rewards', () => {
  const unlock = runtimeMethod('unlock', { ACHIEVEMENTS: { first_blood: '首次击倒' }, awardAchievement })
  const context = {
    save: { ...createDefaultSaveData(), encounterRewards: { 'main:9:20260907': true } },
    achievementQueue: [], persist() {},
  }
  assert.equal(unlock.call(context, 'first_blood'), true)
  assert.deepEqual(context.save.encounterRewards, { 'main:9:20260907': true })
})

test('daily replay can improve a record but never repeatedly mint its final talent imprint', () => {
  const complete = runtimeMethod('completeLevel', {
    advanceTalentUnlockOnClear, TALENT_SCORE_MILESTONES,
    recordDailyChallengeSegment, claimDailyChallengeReward, DAILY_LEVELS: 3,
  })
  let daily = {}
  for (let segment = 1; segment <= 2; segment += 1) {
    daily = recordDailyChallengeSegment(daily, {
      dateSeed: 20260907, segment, cleared: true, score: segment * 10000,
    }).state
  }
  const context = {
    state: 'play', mode: 'daily', level: 3, runSeed: 20260907,
    score: 50000, levelStartScore: 30000, talentEligibleCount: 3, talentClaimedCount: 3,
    save: { ...createDefaultSaveData(), dailyChallenge: daily },
    specialObjectiveProgress: () => ({ met: true }), syncSpecialChallengeScore() {},
    currentClearEvaluation: () => ({ totalBonus: 1000, stars: 3 }),
    commitRunScore() {}, unlock() {}, clearCheckpoint() {}, persist() {}, showBanner() {},
    showDailyVictory() { this.state = 'victory' },
  }
  complete.call(context)
  assert.equal(context.save.imprints, 1)
  assert.equal(context.save.eggs, 1)
  context.state = 'play'
  context.talentEligibleCount = 3
  context.talentClaimedCount = 3
  context.score = 55000
  complete.call(context)
  assert.equal(context.save.imprints, 1)
  assert.equal(context.save.eggs, 1)
})

function settlementContext(overrides = {}) {
  return {
    state: 'play', mode: 'main', turnActive: true, birds: [], blocks: [], platforms: [],
    fireTrail: [], pendingMapEvents: [], moltenPulseSequences: [], mapPulseTick: 0,
    specialSettlementStartTick: null, shotsRemaining: 0,
    specialObjectiveProgress: () => ({ met: true, targetsMet: true, collapseMet: true }),
    settleSpecialChallengeShot() {}, showBanner() {},
    completeLevel() { this.completed = true },
    hasTalent: () => false, openEmergencySupply: () => false,
    gameOver() { this.failed = true }, spawnBird() { this.reloaded = true },
    ...overrides,
  }
}

test('a final clear includes pending burn damage and stops harmless swaying at a bounded time', () => {
  const resolve = runtimeMethod('resolveRound')
  const context = settlementContext({ blocks: [{ burningTicks: 70, burnPulseApplied: false, burnPulseDamage: 3 }] })
  resolve.call(context)
  context.mapPulseTick = 24
  resolve.call(context)
  assert.equal(context.completed, undefined)
  context.blocks[0].burnPulseApplied = true
  context.mapPulseTick = 35
  resolve.call(context)
  assert.equal(context.completed, true)
  const wobbling = settlementContext({ blocks: [{ asleep: false, vx: 0.4, vy: 0 }] })
  resolve.call(wobbling)
  wobbling.mapPulseTick = 75
  resolve.call(wobbling)
  assert.equal(wobbling.completed, true)
})

test('the real game tick routes a main-mode clear through settlement before freezing the world', () => {
  const step = runtimeMethod('stepGame')
  const resolve = runtimeMethod('resolveRound')
  const context = settlementContext({
    birds: [{ launched: true }], slowTimer: 0, comboWindowTicks: 0,
    save: { tutorialSeen: true },
    stepSpecialMapRules() {}, stepBird() {}, stepMoltenPulseSequences() {},
    stepBlocks() {}, stepSquirrels() {}, stepFireTrail() {}, stepParticles() {},
    syncSpecialChallengeScore() {}, syncUI() {}, resolveRound: resolve,
  })
  step.call(context)
  assert.equal(context.completed, undefined)
  assert.equal(context.specialSettlementStartTick, 1)
  context.birds = []
  context.mapPulseTick = 25
  step.call(context)
  assert.equal(context.completed, true)
})

test('last-shot failure waits for active debris, while ordinary reloads remain short', () => {
  const resolve = runtimeMethod('resolveRound')
  const context = settlementContext({
    specialObjectiveProgress: () => ({ met: false, targetsMet: false, collapseMet: true }),
    blocks: [{ asleep: false, vx: 0.4, vy: 1 }],
  })
  resolve.call(context)
  context.mapPulseTick = 40
  resolve.call(context)
  assert.equal(context.failed, undefined)
  context.blocks = []
  context.mapPulseTick = 50
  resolve.call(context)
  assert.equal(context.failed, true)
  const reload = settlementContext({
    shotsRemaining: 2,
    specialObjectiveProgress: () => ({ met: false, targetsMet: false, collapseMet: true }),
  })
  resolve.call(reload)
  reload.mapPulseTick = 6
  resolve.call(reload)
  assert.equal(reload.reloaded, true)
})
