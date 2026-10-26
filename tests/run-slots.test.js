// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { MAIN_LEVELS } from '../src/game-core.js'
import { SPECIAL_CAMPAIGN_IDS } from '../src/special-campaigns.js'
import {
  completeRunCheckpoint,
  createRunCheckpoint,
} from '../src/run-checkpoint.js'
import {
  RUN_SLOT_IDS,
  RUN_SLOTS_VERSION,
  clearRunSlot,
  createRunSlots,
  getLastActiveRunCheckpoint,
  getRunSlot,
  isDailyRunSlotExpired,
  normalizeRunSlots,
  runSlotIdFor,
  runSlotIdForCheckpoint,
  setRunSlot,
  updateRunSlot,
} from '../src/run-slots.js'

const CURRENT_DAILY_SEED = 20260901

function checkpointFor(mode, index = 0) {
  if (mode === 'main') {
    return createRunCheckpoint({ mode, level: 4, runSeed: 100 + index })
  }
  if (mode === 'endless') {
    return createRunCheckpoint({ mode, level: MAIN_LEVELS + 7, runSeed: 200 + index })
  }
  if (mode === 'daily') {
    return createRunCheckpoint({ mode, level: 2, runSeed: CURRENT_DAILY_SEED })
  }
  return createRunCheckpoint({
    mode: 'special',
    campaign: SPECIAL_CAMPAIGN_IDS[index],
    level: (index % 4) + 1,
    runSeed: 300 + index,
  })
}

test('declares one frozen slot for every independent run identity', () => {
  assert.deepEqual(RUN_SLOT_IDS, [
    'main',
    'endless',
    'daily',
    ...SPECIAL_CAMPAIGN_IDS.map((campaignId) => `special:${campaignId}`),
  ])
  assert.equal(RUN_SLOT_IDS.length, 8)

  const empty = createRunSlots()
  assert.equal(empty.version, RUN_SLOTS_VERSION)
  assert.equal(empty.lastActive, null)
  assert.deepEqual(Object.keys(empty.slots), RUN_SLOT_IDS)
  assert.ok(Object.values(empty.slots).every((checkpoint) => checkpoint === null))
  assert.ok(Object.isFrozen(empty))
  assert.ok(Object.isFrozen(empty.slots))
})

test('updates main, endless, daily, and all five special campaigns without overwriting another slot', () => {
  const checkpoints = [
    checkpointFor('main'),
    checkpointFor('endless'),
    checkpointFor('daily'),
    ...SPECIAL_CAMPAIGN_IDS.map((_, index) => checkpointFor('special', index)),
  ]
  let runSlots = createRunSlots()
  for (const checkpoint of checkpoints) {
    runSlots = updateRunSlot(runSlots, checkpoint, { dailySeed: CURRENT_DAILY_SEED })
  }

  for (const checkpoint of checkpoints) {
    const slotId = runSlotIdForCheckpoint(checkpoint)
    assert.deepEqual(runSlots.slots[slotId], checkpoint)
  }
  assert.equal(runSlots.lastActive, `special:${SPECIAL_CAMPAIGN_IDS.at(-1)}`)
  assert.deepEqual(getLastActiveRunCheckpoint(runSlots), checkpoints.at(-1))
  assert.ok(Object.isFrozen(runSlots))
  assert.ok(Object.isFrozen(runSlots.slots))
})

test('maps modes and campaigns to stable slot ids and rejects invented identities', () => {
  assert.equal(runSlotIdFor('main'), 'main')
  assert.equal(runSlotIdFor('endless'), 'endless')
  assert.equal(runSlotIdFor('daily'), 'daily')
  assert.equal(runSlotIdFor('special', SPECIAL_CAMPAIGN_IDS[0]), `special:${SPECIAL_CAMPAIGN_IDS[0]}`)
  assert.equal(runSlotIdFor('special', 'invented-campaign'), null)
  assert.equal(runSlotIdFor('arcade'), null)
  assert.equal(runSlotIdForCheckpoint({ polluted: true }), null)
})

test('migrates the old single runCheckpoint shape into its derived slot and lastActive', () => {
  const main = checkpointFor('main')
  const migratedMain = normalizeRunSlots({ runCheckpoint: JSON.parse(JSON.stringify(main)) })
  assert.deepEqual(migratedMain.slots.main, main)
  assert.equal(migratedMain.lastActive, 'main')
  assert.equal(migratedMain.slots.endless, null)

  const special = checkpointFor('special', 3)
  const migratedSpecial = normalizeRunSlots({ checkpoint: JSON.parse(JSON.stringify(special)) })
  const specialSlot = `special:${SPECIAL_CAMPAIGN_IDS[3]}`
  assert.deepEqual(migratedSpecial.slots[specialSlot], special)
  assert.equal(migratedSpecial.lastActive, specialSlot)

  assert.equal(normalizeRunSlots(completeRunCheckpoint(main)).lastActive, null)
})

test('explicit slot updates reject mismatched, completed, stale, and malformed checkpoints', () => {
  const main = checkpointFor('main')
  const endless = checkpointFor('endless')
  const original = updateRunSlot(createRunSlots(), main)

  const mismatch = setRunSlot(original, 'main', endless)
  assert.deepEqual(mismatch, original)
  assert.equal(mismatch.slots.main.mode, 'main')

  const completed = setRunSlot(original, 'endless', completeRunCheckpoint(endless))
  assert.deepEqual(completed, original)

  const staleDaily = createRunCheckpoint({ mode: 'daily', level: 1, runSeed: 20260831 })
  const stale = setRunSlot(original, 'daily', staleDaily, { dailySeed: CURRENT_DAILY_SEED })
  assert.deepEqual(stale, original)

  const malformed = setRunSlot(original, 'endless', { mode: 'endless', polluted: true })
  assert.deepEqual(malformed, original)
  assert.deepEqual(setRunSlot(original, '__proto__', endless), original)
})

test('clears only the requested slot and does not invent a replacement lastActive', () => {
  const main = checkpointFor('main')
  const endless = checkpointFor('endless')
  let runSlots = updateRunSlot(createRunSlots(), main)
  runSlots = updateRunSlot(runSlots, endless)

  const clearedBackground = clearRunSlot(runSlots, 'main')
  assert.equal(clearedBackground.slots.main, null)
  assert.deepEqual(clearedBackground.slots.endless, endless)
  assert.equal(clearedBackground.lastActive, 'endless')

  const clearedActive = clearRunSlot(clearedBackground, 'endless')
  assert.equal(clearedActive.slots.endless, null)
  assert.equal(clearedActive.lastActive, null)
  assert.deepEqual(clearRunSlot(clearedActive, 'invented'), clearedActive)
})

test('detects and prunes expired daily runs only when supplied the current daily seed', () => {
  const staleDaily = createRunCheckpoint({ mode: 'daily', level: 2, runSeed: 20260831 })
  const currentDaily = checkpointFor('daily')
  const main = checkpointFor('main')

  assert.equal(isDailyRunSlotExpired(staleDaily, { dailySeed: CURRENT_DAILY_SEED }), true)
  assert.equal(isDailyRunSlotExpired(currentDaily, { dailySeed: CURRENT_DAILY_SEED }), false)
  assert.equal(isDailyRunSlotExpired(staleDaily), false)
  assert.equal(isDailyRunSlotExpired(main, { dailySeed: CURRENT_DAILY_SEED }), false)

  const raw = {
    version: RUN_SLOTS_VERSION,
    lastActive: 'daily',
    slots: { main, daily: staleDaily },
  }
  const normalized = normalizeRunSlots(raw, { dailySeed: CURRENT_DAILY_SEED })
  assert.deepEqual(normalized.slots.main, main)
  assert.equal(normalized.slots.daily, null)
  assert.equal(normalized.lastActive, null)
  assert.equal(getRunSlot(raw, 'daily', { dailySeed: CURRENT_DAILY_SEED }), null)

  const retained = normalizeRunSlots({ ...raw, slots: { main, daily: currentDaily } }, {
    dailySeed: CURRENT_DAILY_SEED,
  })
  assert.deepEqual(retained.slots.daily, currentDaily)
  assert.equal(retained.lastActive, 'daily')
})

test('prunes current-date daily checkpoints beyond the three authored segments', () => {
  const validDaily = JSON.parse(JSON.stringify(checkpointFor('daily')))
  const levelFour = { ...validDaily, level: 4 }
  const levelTen = { ...validDaily, level: 10 }

  const envelope = normalizeRunSlots({
    version: RUN_SLOTS_VERSION,
    lastActive: 'daily',
    slots: { daily: levelFour },
  }, { dailySeed: CURRENT_DAILY_SEED })
  assert.equal(envelope.slots.daily, null)
  assert.equal(envelope.lastActive, null)

  const migrated = normalizeRunSlots({ runCheckpoint: levelTen }, {
    dailySeed: CURRENT_DAILY_SEED,
  })
  assert.equal(migrated.slots.daily, null)
  assert.equal(migrated.lastActive, null)
  assert.equal(getRunSlot({
    version: RUN_SLOTS_VERSION,
    lastActive: 'daily',
    slots: { daily: levelTen },
  }, 'daily', { dailySeed: CURRENT_DAILY_SEED }), null)
})

test('normalization strips unknown fields, inherited slots, misplaced campaigns, and future versions', () => {
  const inheritedMain = checkpointFor('main')
  const endless = JSON.parse(JSON.stringify(checkpointFor('endless')))
  endless.prototypePollution = { unsafe: true }
  const misplacedSpecial = checkpointFor('special', 1)
  const slotRecords = Object.create({ main: inheritedMain })
  slotRecords.endless = endless
  slotRecords[`special:${SPECIAL_CAMPAIGN_IDS[0]}`] = misplacedSpecial
  slotRecords.unknown = checkpointFor('main')
  Object.defineProperty(slotRecords, '__proto__', {
    configurable: true,
    enumerable: true,
    value: checkpointFor('main'),
  })

  const normalized = normalizeRunSlots({
    version: RUN_SLOTS_VERSION,
    lastActive: 'endless',
    slots: slotRecords,
    injected: { privileged: true },
  })
  assert.equal(normalized.slots.main, null)
  assert.equal(normalized.slots[`special:${SPECIAL_CAMPAIGN_IDS[0]}`], null)
  assert.equal(normalized.slots.endless.mode, 'endless')
  assert.equal('prototypePollution' in normalized.slots.endless, false)
  assert.equal('unknown' in normalized.slots, false)
  assert.equal('__proto__' in normalized.slots, true)
  assert.equal(Object.hasOwn(normalized.slots, '__proto__'), false)
  assert.equal('injected' in normalized, false)
  assert.equal(normalized.lastActive, 'endless')

  endless.level = MAIN_LEVELS + 100
  assert.equal(normalized.slots.endless.level, MAIN_LEVELS + 7)
  assert.ok(Object.isFrozen(normalized.slots.endless))
  assert.deepEqual(normalizeRunSlots({ version: 99, lastActive: 'endless', slots: slotRecords }), createRunSlots())
})

test('lastActive is accepted only when its normalized slot remains resumable', () => {
  const main = checkpointFor('main')
  const raw = { version: RUN_SLOTS_VERSION, lastActive: 'daily', slots: { main } }
  assert.equal(normalizeRunSlots(raw).lastActive, null)
  assert.equal(getLastActiveRunCheckpoint(raw), null)

  const valid = normalizeRunSlots({ ...raw, lastActive: 'main' })
  assert.equal(valid.lastActive, 'main')
  assert.deepEqual(getRunSlot(valid, 'main'), main)
  assert.equal(getRunSlot(valid, 'invented'), null)
})
