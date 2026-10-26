// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const gameSource = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')

test('archive discoveries reuse the full discovery dialog with story lore', () => {
  assert.match(html, /id="discovery-lore"/u)
  assert.match(gameSource, /data-action="archive-discovery"/u)
  assert.match(gameSource, /openArchiveDiscovery\(id,/u)
  assert.match(gameSource, /setText\(dom\.discoveryLore, entry\.lore/u)
})

test('achievement rewards, talent balance, and endless record are wired into player UI', () => {
  assert.match(gameSource, /awardAchievement\(this\.save, id\)/u)
  assert.match(gameSource, /achievementDates\?\.\[id\]/u)
  assert.match(gameSource, /class="talent-wallet"/u)
  assert.match(gameSource, /endlessBestStage/u)
})

test('the once-per-level emergency supply dialog is connected to round resolution', () => {
  for (const id of [
    'emergency-supply-card',
    'emergency-supply-small',
    'emergency-supply-large',
    'emergency-supply-decline',
  ]) assert.match(html, new RegExp(`id="${id}"`, 'u'))
  assert.match(gameSource, /purchaseEmergencySupply\(/u)
  assert.match(gameSource, /else if \(!this\.openEmergencySupply\(\)\) this\.gameOver\(\)/u)
  assert.match(gameSource, /this\.emergencySupplyUsed = true/u)
})
