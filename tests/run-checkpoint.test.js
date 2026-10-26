// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  MAIN_LEVELS,
  MIN_ZOOM,
  TALENT_SCORE_MILESTONES,
} from '../src/game-core.js'
import { SPECIAL_CAMPAIGN_IDS } from '../src/special-campaigns.js'
import { TALENT_PROGRESSION_VERSION } from '../src/talent-progression.js'
import {
  RUN_CHECKPOINT_MODES,
  RUN_CHECKPOINT_PHASE,
  RUN_CHECKPOINT_VERSION,
  canResumeRunCheckpoint,
  clearRunCheckpoint,
  completeRunCheckpoint,
  createRunCheckpoint,
  isRunCheckpointResumable,
  normalizeRunCheckpoint,
} from '../src/run-checkpoint.js'

const scoreForTalentChoices = (count) => TALENT_SCORE_MILESTONES[count - 1]?.score ?? Number.MAX_SAFE_INTEGER

test('creates a frozen, independent level-start checkpoint and rolls back mid-level score', () => {
  const live = {
    mode: 'main',
    level: 7,
    runSeed: 0xfeedbeef,
    score: 7_850,
    levelStartScore: 7_000,
    talents: { feather: 1, power: 1 },
    talentClaimedCount: 2,
    talentEligibleCount: 2,
    talentRerollCount: 0,
    zoomPref: 1.25,
    missionCollapsed: true,
    blocks: [{ x: 99 }],
  }
  const checkpoint = createRunCheckpoint(live)

  assert.deepEqual(checkpoint, {
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 7,
    campaign: null,
    runSeed: 0xfeedbeef,
    score: 7_000,
    levelStartScore: 7_000,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { feather: 1, power: 1 },
      fusionIds: [],
      specialTalentIds: [],
    },
    talents: { feather: 1, power: 1 },
    talentClaimedCount: 2,
    talentEligibleCount: 2,
    talentRerollCount: 0,
    zoomPref: 1.25,
    missionCollapsed: true,
  })
  assert.equal('blocks' in checkpoint, false)
  assert.ok(Object.isFrozen(checkpoint))
  assert.ok(Object.isFrozen(checkpoint.talentProgression))
  assert.ok(Object.isFrozen(checkpoint.talentProgression.fusionIds))
  assert.ok(Object.isFrozen(checkpoint.talents))
  assert.equal(checkpoint.talents, checkpoint.talentProgression.ranks)
  live.talents.feather = 0
  assert.equal(checkpoint.talents.feather, 1)
})

test('validates mode-specific level, campaign, and seed boundaries', () => {
  assert.deepEqual(RUN_CHECKPOINT_MODES, ['main', 'endless', 'daily', 'special'])
  assert.equal(createRunCheckpoint({ mode: 'main', level: 1, runSeed: 1 }).level, 1)
  assert.equal(createRunCheckpoint({ mode: 'main', level: MAIN_LEVELS, runSeed: 1 }).level, 18)
  assert.equal(normalizeRunCheckpoint({
    mode: 'main', level: MAIN_LEVELS + 1, runSeed: 1, score: 0,
  }), null)

  assert.equal(createRunCheckpoint({
    mode: 'endless', level: MAIN_LEVELS + 1, runSeed: 2,
  }).level, 19)
  assert.equal(normalizeRunCheckpoint({
    mode: 'endless', level: MAIN_LEVELS, runSeed: 2, score: 0,
  }), null)

  assert.equal(createRunCheckpoint({ mode: 'daily', level: 1, runSeed: 20260825 }).mode, 'daily')
  assert.equal(createRunCheckpoint({ mode: 'daily', level: 3, runSeed: 20260825 }).level, 3)
  assert.equal(normalizeRunCheckpoint({
    mode: 'daily', level: 4, runSeed: 20260825, score: 0,
  }), null)
  assert.equal(normalizeRunCheckpoint({
    mode: 'daily', level: 10, runSeed: 20260825, score: 0,
  }), null)
  assert.throws(() => createRunCheckpoint({
    mode: 'daily', level: 4, runSeed: 20260825,
  }), /valid level start/u)
  assert.equal(normalizeRunCheckpoint({
    mode: 'daily', level: 1, runSeed: 20260230, score: 0,
  }), null)

  const campaign = SPECIAL_CAMPAIGN_IDS[0]
  assert.equal(createRunCheckpoint({
    mode: 'special', level: 4, campaign, runSeed: 3,
  }).campaign, campaign)
  assert.throws(() => createRunCheckpoint({ mode: 'special', level: 1, runSeed: 3 }), /valid level start/u)
  assert.equal(normalizeRunCheckpoint({
    mode: 'special', level: 5, campaign, runSeed: 3, score: 0,
  }), null)
  assert.equal(normalizeRunCheckpoint({
    mode: 'special', level: 1, campaign: 'invented-campaign', runSeed: 3, score: 0,
  }), null)
})

test('migrates a supported unversioned checkpoint while stripping corrupt fields', () => {
  const legacy = {
    runMode: 'special',
    stageNumber: '3',
    specialCampaignId: SPECIAL_CAMPAIGN_IDS[1],
    seed: '20260825',
    score: '12999',
    startScore: '12000',
    selectedTalents: ['power', 'feather', 'invented', 'power'],
    claimed: '99',
    eligible: '99',
    zoom: '9',
    missionCollapsed: 'true',
    prototypePollution: { unsafe: true },
  }
  const checkpoint = normalizeRunCheckpoint(legacy)

  assert.deepEqual(checkpoint, {
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'special',
    level: 3,
    campaign: SPECIAL_CAMPAIGN_IDS[1],
    runSeed: 20260825,
    score: 12_000,
    levelStartScore: 12_000,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { feather: 1, power: 1 },
      fusionIds: [],
      specialTalentIds: [],
    },
    talents: { feather: 1, power: 1 },
    talentClaimedCount: 2,
    talentEligibleCount: 2,
    talentRerollCount: 0,
    zoomPref: 1,
    missionCollapsed: true,
  })
  assert.equal('prototypePollution' in checkpoint, false)
})

test('migrates explicit version-one talents to rank one without upgrading old values', () => {
  const checkpoint = normalizeRunCheckpoint({
    version: 1,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 4,
    runSeed: 91,
    score: 5_000,
    levelStartScore: 5_000,
    talents: { power: 1, feather: true, frost: 2, invented: 1 },
    talentClaimedCount: 99,
    talentEligibleCount: 99,
  })

  assert.deepEqual(checkpoint.talentProgression, {
    version: TALENT_PROGRESSION_VERSION,
    ranks: { feather: 1, power: 1 },
    fusionIds: [],
    specialTalentIds: [],
  })
  assert.deepEqual(checkpoint.talents, { feather: 1, power: 1 })
  assert.equal(checkpoint.talentClaimedCount, 2)
  assert.equal(checkpoint.talentEligibleCount, 2)
})

test('rejects bad identity data and safely cleans optional corruption', () => {
  assert.equal(normalizeRunCheckpoint(null), null)
  assert.equal(normalizeRunCheckpoint([]), null)
  assert.equal(normalizeRunCheckpoint({ version: 99, mode: 'main' }), null)
  assert.equal(normalizeRunCheckpoint({ mode: 'arcade', level: 1, runSeed: 1, score: 0 }), null)
  assert.equal(normalizeRunCheckpoint({ mode: 'main', level: 1, runSeed: 0, score: 0 }), null)
  assert.equal(normalizeRunCheckpoint({ mode: 'main', level: 1, runSeed: 1, score: -1 }), null)
  assert.equal(normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: 'mid-level',
    mode: 'main',
    level: 1,
    runSeed: 1,
    score: 0,
  }), null)

  assert.equal(normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 2,
    runSeed: 7,
    score: 5_000,
    levelStartScore: 5_000,
    talents: { feather: 1 },
  }), null)

  const cleaned = normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 2,
    campaign: SPECIAL_CAMPAIGN_IDS[0],
    runSeed: 7,
    score: 5_000,
    levelStartScore: 5_000,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { feather: 1, invented: 1, power: 0 },
      fusionIds: ['invented'],
      specialTalentIds: ['invented'],
    },
    talents: { power: 3 },
    talentClaimedCount: 12,
    talentEligibleCount: 12,
    zoomPref: Number.NaN,
    missionCollapsed: 'yes',
  })
  assert.deepEqual(cleaned.talents, { feather: 1 })
  assert.deepEqual(cleaned.talentProgression.fusionIds, [])
  assert.deepEqual(cleaned.talentProgression.specialTalentIds, [])
  assert.equal(cleaned.campaign, null)
  assert.equal(cleaned.talentClaimedCount, 1)
  assert.equal(cleaned.talentEligibleCount, 2)
  assert.equal(cleaned.zoomPref, 1)
  assert.equal(cleaned.missionCollapsed, false)
})

test('version two accepts ranks one through three and strips coercion, unknown ids, and illegal fusions', () => {
  assert.equal(normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 12,
    runSeed: 123,
    score: 0,
    levelStartScore: 0,
    talentProgression: { ranks: {}, fusionIds: [], specialTalentIds: [] },
  }), null)

  const checkpoint = normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 12,
    runSeed: 123,
    score: scoreForTalentChoices(11),
    levelStartScore: scoreForTalentChoices(11),
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: {
        feather: 1,
        power: 3,
        pack: 2,
        stonebreaker: 3,
        frost: '3',
        flame: 4,
        invented: 3,
      },
      fusionIds: ['faultCrown', 'thermalRift', 'invented', 'faultCrown'],
      specialTalentIds: ['emberheart', 'invented', 'emberheart'],
    },
    // The compatibility mirror is deliberately contradictory; canonical v2
    // progression remains authoritative.
    talents: { frost: 3 },
    talentClaimedCount: 0,
    talentEligibleCount: 99,
  })

  assert.deepEqual(checkpoint.talentProgression, {
    version: TALENT_PROGRESSION_VERSION,
    ranks: { feather: 1, power: 3, pack: 2, stonebreaker: 3 },
    fusionIds: ['faultCrown'],
    specialTalentIds: ['emberheart'],
  })
  assert.equal(checkpoint.talents, checkpoint.talentProgression.ranks)
  assert.equal(checkpoint.talentClaimedCount, 11)
  assert.equal(checkpoint.talentEligibleCount, 11)
  assert.ok(Object.isFrozen(checkpoint.talentProgression.specialTalentIds))
})

test('version two strips a rare contract when its saved total rank is below the unlock requirement', () => {
  const checkpoint = normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 3,
    runSeed: 137,
    score: scoreForTalentChoices(2),
    levelStartScore: scoreForTalentChoices(2),
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { power: 1 },
      fusionIds: [],
      specialTalentIds: ['emberheart'],
    },
  })

  assert.deepEqual(checkpoint.talentProgression.ranks, { power: 1 })
  assert.deepEqual(checkpoint.talentProgression.specialTalentIds, [])
  assert.equal(checkpoint.talentClaimedCount, 1)
})

test('derives claim counters from every progression choice and rejects score-injected ranks', () => {
  const tampered = normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 3,
    runSeed: 7,
    score: 5_000,
    levelStartScore: 5_000,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { power: 1 },
      fusionIds: [],
      specialTalentIds: [],
    },
    talentClaimedCount: 99,
    talentEligibleCount: 99,
  })
  assert.equal(tampered.talentClaimedCount, 1)
  assert.equal(tampered.talentEligibleCount, 1)

  assert.equal(normalizeRunCheckpoint({
    version: RUN_CHECKPOINT_VERSION,
    phase: RUN_CHECKPOINT_PHASE,
    status: 'active',
    mode: 'main',
    level: 1,
    runSeed: 7,
    score: 0,
    levelStartScore: 0,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { power: 2 },
      fusionIds: [],
      specialTalentIds: [],
    },
  }), null)
})

test('does not restore score-injected talents and clamps the stored view preference', () => {
  assert.equal(normalizeRunCheckpoint({
    mode: 'main', level: 1, runSeed: 1, score: 0,
    talents: { feather: 1, power: 1 },
  }), null)

  const minimumZoom = createRunCheckpoint({
    mode: 'main', level: 2, runSeed: 4, score: 0,
    talents: { feather: 1 }, talentClaimedCount: 1, zoomPref: MIN_ZOOM,
  })
  assert.equal(minimumZoom.zoomPref, MIN_ZOOM)
  const cleanedZoom = createRunCheckpoint({
    mode: 'main', level: 2, runSeed: 4, zoomPref: MIN_ZOOM - 0.01,
  })
  assert.equal(cleanedZoom.zoomPref, 1)
})

test('daily checkpoints are resumable only for the caller-provided current date seed', () => {
  const daily = createRunCheckpoint({ mode: 'daily', level: 3, runSeed: 20260825 })
  assert.equal(isRunCheckpointResumable(daily), true)
  assert.equal(isRunCheckpointResumable(daily, { dailySeed: 20260825 }), true)
  assert.equal(canResumeRunCheckpoint(daily, { dailySeed: 20260824 }), false)
  assert.equal(isRunCheckpointResumable(daily, { dailySeed: '20260825' }), false)
})

test('completion disables recovery, clear removes the slot, and main finale remains resumable until completed', () => {
  const finale = createRunCheckpoint({
    mode: 'main', level: MAIN_LEVELS, runSeed: 42, score: 95_000,
    talents: { feather: 1, power: 1, pack: 1 },
    talentClaimedCount: 3,
    talentEligibleCount: 3,
  })
  const completed = completeRunCheckpoint(finale)

  assert.equal(isRunCheckpointResumable(finale), true)
  assert.equal(completed.status, 'completed')
  assert.equal(isRunCheckpointResumable(completed), false)
  assert.notEqual(completed, finale)
  assert.ok(Object.isFrozen(completed))
  assert.equal(clearRunCheckpoint(completed), null)
  assert.equal(completeRunCheckpoint({ broken: true }), null)
})

test('create accepts canonical progression and survives a frozen JSON round trip', () => {
  const progression = {
    ranks: { power: 3, stonebreaker: 3, flame: 1 },
    fusionIds: ['faultCrown'],
    specialTalentIds: ['emberheart'],
  }
  const original = createRunCheckpoint({
    mode: 'special',
    level: 2,
    campaign: SPECIAL_CAMPAIGN_IDS.at(-1),
    runSeed: 123456,
    score: scoreForTalentChoices(9),
    talentProgression: progression,
    talentClaimedCount: 0,
    talentEligibleCount: 99,
    zoomPref: 0.8,
  })
  progression.ranks.power = 1
  progression.fusionIds.length = 0
  assert.equal(original.talents.power, 3)
  assert.deepEqual(original.talentProgression.fusionIds, ['faultCrown'])
  assert.equal(original.talentClaimedCount, 9)
  const parsed = JSON.parse(JSON.stringify(original))
  const restored = normalizeRunCheckpoint(parsed)

  assert.deepEqual(restored, original)
  assert.notEqual(restored, original)
  assert.notEqual(restored.talents, original.talents)
  assert.equal(restored.talents, restored.talentProgression.ranks)
  assert.ok(Object.isFrozen(restored))
  assert.ok(Object.isFrozen(restored.talents))
  assert.ok(Object.isFrozen(restored.talentProgression.fusionIds))
})

test('a non-zero talent reroll count survives a checkpoint JSON round trip', () => {
  const original = createRunCheckpoint({
    mode: 'main',
    level: 5,
    runSeed: 7654321,
    score: scoreForTalentChoices(2),
    talents: { power: 1 },
    talentRerollCount: 7,
  })
  const restored = normalizeRunCheckpoint(JSON.parse(JSON.stringify(original)))

  assert.equal(original.talentRerollCount, 7)
  assert.equal(restored.talentRerollCount, 7)
  assert.deepEqual(restored, original)
})

test('endless runtime preserves live exits but cannot resurrect a defeated expedition', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /window\.addEventListener\('pagehide',[\s\S]*this\.persistCheckpoint\(\)/u)
  assert.match(runtime, /this\.level \+= 1[\s\S]*this\.persistCheckpoint\(\)[\s\S]*this\.setState\('between'\)/u)
  assert.match(runtime, /if \(this\.mode === 'endless' && this\.state === 'over'\) return/u)
  assert.match(runtime, /if \(this\.mode === 'endless'\) this\.clearCheckpoint\(\)/u)
  assert.match(runtime, /重新挑战无尽/u)
  assert.match(runtime, /this\.state === 'over' && this\.mode === 'endless'[\s\S]*this\.restartRun\(\)/u)
})
