// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calculateShotBudget } from '../src/game-core.js'
import { TALENT_RANK_DATA } from '../src/talent-progression.js'

// Execute the actual allocation method without creating a DOM or physics world.
const gameSource = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
const start = gameSource.indexOf('\n  shotAllocationForGenerated(')
const end = gameSource.indexOf('\n  talentContextForCurrentLevel(', start)
assert.ok(start >= 0 && end > start)
const allocate = new Function('calculateShotBudget',
  `return ({${gameSource.slice(start, end)}}).shotAllocationForGenerated`,
)(calculateShotBudget)

function allocation({ base = 8, rank = 0, mode = 'endless', contracts = [] } = {}) {
  const effects = TALENT_RANK_DATA.pack.ranks[rank - 1]?.effects || {}
  return allocate.call({
    mode,
    specialAcornContracts: () => contracts,
    talentEffect: (_id, key, fallback) => effects[key] ?? fallback,
  }, { baseShotBudget: base, birdsAvailable: base - 1, objective: { shotLimit: base } })
}

test('each Pack rank remains useful with a full eight-round endless magazine', () => {
  for (const rank of [1, 2, 3]) {
    const actual = allocation({ rank })
    assert.equal(actual.baseShotBudget, 8)
    assert.equal(actual.initialShotTotal, 8)
    assert.equal(actual.grantedPackShots, 0)
    assert.equal(actual.overflowPackReinforcements, rank)
    assert.equal(actual.overflowPackDirectDamageBonus, 1)
    assert.equal(actual.maximumEffectiveShotBudget, 8)
  }
})

test('only rounds blocked by the cap convert; the others retain bonus-ammo status', () => {
  const partial = allocation({ base: 7, rank: 3 })
  assert.equal(partial.baseShotBudget, 7)
  assert.equal(partial.initialShotTotal, 8)
  assert.equal(partial.grantedPackShots, 1)
  assert.equal(partial.overflowPackReinforcements, 2)
  assert.equal(partial.grantedPackShots + partial.overflowPackReinforcements, 3)

  const room = allocation({ base: 5, rank: 3 })
  assert.equal(room.grantedPackShots, 3)
  assert.equal(room.overflowPackReinforcements, 0)
})

test('overflow does not consume talent-exclusive allowance or inflate rating ammunition', () => {
  const actual = allocation({ rank: 3, contracts: [{ type: 'talent-emberheart', copiesPerLevel: 1 }] })
  assert.equal(actual.initialShotTotal, 8)
  assert.equal(actual.totalShotBudget, 9)
  assert.equal(actual.baseShotBudget, 8)
  assert.equal(actual.grantedContractShots, 1)
  assert.equal(actual.overflowPackReinforcements, 3)
  assert.equal(actual.maximumEffectiveShotBudget, 9)
})

test('ordinary mode allocations and runs without Pack never receive an overflow bonus', () => {
  for (const mode of ['main', 'special', 'daily']) {
    const actual = allocation({ rank: 3, mode })
    assert.equal(actual.initialShotTotal, 11)
    assert.equal(actual.grantedPackShots, 3)
    assert.equal(actual.overflowPackReinforcements, 0)
  }
  const none = allocation()
  assert.equal(none.initialShotTotal, 8)
  assert.equal(none.overflowPackReinforcements, 0)
  assert.equal(none.overflowPackDirectDamageBonus, 0)
})
