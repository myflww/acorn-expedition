// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { createDefaultSaveData, normalizeSaveData } from '../src/game-core.js'

test('special campaign unlock and progress migrate without trusting malformed keys', () => {
  const defaults = createDefaultSaveData()
  assert.equal(defaults.specialUnlocked, false)
  assert.deepEqual(defaults.specialProgress, {})
  const normalized = normalizeSaveData({
    specialModeUnlocked: true,
    specialCampaigns: {
      'polar-clocktower': 2.9,
      'stormline-skyport': 99,
      '../outside': 4,
    },
    bestStars: {
      'special:polar-clocktower:2': 3,
      'special:polar-clocktower:9': 3,
    },
  })
  assert.equal(normalized.specialUnlocked, true)
  assert.deepEqual(normalized.specialProgress, { 'polar-clocktower': 2, 'stormline-skyport': 4 })
  assert.deepEqual(normalized.bestStars, { 'special:polar-clocktower:2': 3 })
})
