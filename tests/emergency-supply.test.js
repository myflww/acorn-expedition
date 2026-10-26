// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EMERGENCY_SUPPLY_ELIGIBLE_MODES,
  EMERGENCY_SUPPLY_OFFERS,
  buildEmergencySupplyQueue,
  evaluateEmergencySupplyEligibility,
  purchaseEmergencySupply,
  quoteEmergencySupply,
} from '../src/emergency-supply.js'

const eligibleState = {
  mode: 'special',
  ammoDepleted: true,
  levelCleared: false,
  supplyUsed: false,
  currentAmmoPool: ['frost', 'red', 'bomb'],
}

test('only offers a rescue after special or endless ammo has fully settled and depleted', () => {
  assert.deepEqual(EMERGENCY_SUPPLY_ELIGIBLE_MODES, ['special', 'endless'])
  assert.equal(evaluateEmergencySupplyEligibility(eligibleState).eligible, true)
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, mode: 'endless' }).eligible, true)
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, mode: 'main' }).reason, 'unsupported-mode')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, mode: 'daily' }).reason, 'unsupported-mode')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, levelCleared: true }).reason, 'level-already-cleared')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, supplyUsed: true }).reason, 'opportunity-already-used')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, ammoDepleted: false }).reason, 'ammo-not-depleted')
  assert.equal(evaluateEmergencySupplyEligibility({
    ...eligibleState, ammoDepleted: true, shotsRemaining: 1,
  }).reason, 'ammo-not-depleted')
  assert.equal(evaluateEmergencySupplyEligibility({
    ...eligibleState, ammoDepleted: true, shotQueue: ['red'],
  }).reason, 'ammo-not-depleted')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, shotInFlight: true }).reason, 'shot-still-active')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, automaticRescuePending: true }).reason, 'automatic-rescue-pending')
  assert.equal(evaluateEmergencySupplyEligibility({ ...eligibleState, currentAmmoPool: [] }).reason, 'empty-ammo-pool')
})

test('derives depletion conservatively from live reserves, queue, and active shot', () => {
  const base = { mode: 'endless', ammoPool: ['red'] }
  assert.equal(evaluateEmergencySupplyEligibility({ ...base, shotsRemaining: 0, queuedShots: 0 }).eligible, true)
  assert.equal(evaluateEmergencySupplyEligibility({ ...base, shotsRemaining: 1 }).reason, 'ammo-not-depleted')
  assert.equal(evaluateEmergencySupplyEligibility({ ...base, shotQueue: ['red'] }).reason, 'ammo-not-depleted')
  assert.equal(evaluateEmergencySupplyEligibility({ ...base, activeShot: true }).reason, 'shot-still-active')
})

test('quotes the exact requested prices and disables unaffordable choices', () => {
  assert.deepEqual(EMERGENCY_SUPPLY_OFFERS.map(({ goldenAcornCost, acornCount }) => (
    [goldenAcornCost, acornCount]
  )), [[1, 2], [5, 6]])

  const empty = quoteEmergencySupply({ goldenAcorns: -4 })
  assert.equal(empty.goldenAcorns, 0)
  assert.equal(empty.offers.every((offer) => !offer.affordable), true)
  assert.deepEqual(empty.offers.map((offer) => offer.shortfall), [1, 5])

  const partial = quoteEmergencySupply({ goldenAcorns: 3.9 })
  assert.equal(partial.goldenAcorns, 3)
  assert.equal(partial.offers[0].affordable, true)
  assert.equal(partial.offers[0].balanceAfterPurchase, 2)
  assert.equal(partial.offers[1].affordable, false)
  assert.equal(partial.offers[1].balanceAfterPurchase, 3)
  assert.ok(Object.isFrozen(partial))
  assert.ok(Object.isFrozen(partial.offers))
  assert.ok(Object.isFrozen(partial.offers[0]))
})

test('small purchase spends one gold, adds two distinct current-pool acorns, and consumes the chance', () => {
  const input = {
    ...eligibleState,
    offerId: 'two-acorns',
    goldenAcorns: 4,
    seed: 927,
    level: 2,
    campaignId: 'polar-watch',
  }
  const result = purchaseEmergencySupply(input)

  assert.equal(result.ok, true)
  assert.equal(result.opportunityUsed, true)
  assert.equal(result.goldenAcornsSpent, 1)
  assert.equal(result.goldenAcornsRemaining, 3)
  assert.equal(result.addedAcorns, 2)
  assert.equal(new Set(result.queue).size, 2)
  assert.equal(result.queue.every((type) => input.currentAmmoPool.includes(type)), true)
  assert.equal(result.queueEntries.every((entry) => (
    entry.bonusShot
    && !entry.countsForReserveStars
    && !entry.countsForReserveBonus
    && entry.source === 'emergency-supply'
  )), true)
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.queue))
  assert.ok(Object.isFrozen(result.queueEntries[0]))
})

test('large purchase is deterministic, coverage-first, balanced, and never injects a foreign type', () => {
  const input = {
    ...eligibleState,
    mode: 'endless',
    offerId: 'six-acorns',
    goldenAcorns: 12,
    currentAmmoPool: ['red', 'bomb', 'split', 'red', 'golden', {}, '', ' BAD '],
    seed: 54321,
    level: 67,
  }
  const first = purchaseEmergencySupply(input)
  const second = purchaseEmergencySupply(structuredClone(input))

  assert.equal(first.ok, true)
  assert.equal(first.goldenAcornsSpent, 5)
  assert.equal(first.goldenAcornsRemaining, 7)
  assert.deepEqual(first.queue, second.queue)
  assert.equal(first.queue.length, 6)
  assert.deepEqual(new Set(first.queue), new Set(['red', 'bomb', 'split']))
  assert.equal(first.queue.every((type) => ['red', 'bomb', 'split'].includes(type)), true)
  const counts = Object.values(Object.groupBy(first.queue, (type) => type)).map((types) => types.length)
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1)
  for (let index = 1; index < first.queue.length; index += 1) {
    assert.notEqual(first.queue[index], first.queue[index - 1])
  }
})

test('different seeds provide random variation while retaining deterministic constraints', () => {
  const variants = new Set()
  for (let seed = 1; seed <= 20; seed += 1) {
    const queue = buildEmergencySupplyQueue({
      ammoPool: ['frost', 'vine', 'quake', 'boomerang'],
      acornCount: 6,
      seed,
      mode: 'special',
      level: 3,
      campaignId: 'wind-archive',
      offerId: 'six-acorns',
    })
    variants.add(queue.join(','))
    assert.equal(queue.every((type) => ['frost', 'vine', 'quake', 'boomerang'].includes(type)), true)
    assert.equal(new Set(queue.slice(0, 4)).size, 4)
  }
  assert.ok(variants.size > 1)
})

test('invalid or unaffordable purchases do not spend gold or consume the opportunity', () => {
  const poor = purchaseEmergencySupply({
    ...eligibleState,
    offerId: 'six-acorns',
    goldenAcorns: 4,
  })
  assert.equal(poor.ok, false)
  assert.equal(poor.reason, 'insufficient-golden-acorns')
  assert.equal(poor.goldenAcornsRemaining, 4)
  assert.equal(poor.goldenAcornsSpent, 0)
  assert.equal(poor.opportunityUsed, false)
  assert.deepEqual(poor.queue, [])

  const unknown = purchaseEmergencySupply({
    ...eligibleState,
    offerId: 'invented',
    goldenAcorns: 99,
  })
  assert.equal(unknown.ok, false)
  assert.equal(unknown.reason, 'unknown-offer')
  assert.equal(unknown.opportunityUsed, false)

  const repeat = purchaseEmergencySupply({
    ...eligibleState,
    supplyUsed: true,
    offerId: 'two-acorns',
    goldenAcorns: 99,
  })
  assert.equal(repeat.ok, false)
  assert.equal(repeat.reason, 'opportunity-already-used')
  assert.equal(repeat.goldenAcornsRemaining, 99)
})

test('normalization is independent: caller mutation cannot alter the frozen result', () => {
  const pool = ['frost', 'frost', 'red', null]
  const eligibility = evaluateEmergencySupplyEligibility({
    mode: 'special',
    ammoDepleted: true,
    ammoPool: pool,
  })
  pool[0] = 'invented'
  pool.push('bomb')

  assert.deepEqual(eligibility.ammoPool, ['frost', 'red'])
  assert.ok(Object.isFrozen(eligibility))
  assert.ok(Object.isFrozen(eligibility.ammoPool))
  assert.deepEqual(buildEmergencySupplyQueue(null), [])
  assert.deepEqual(buildEmergencySupplyQueue('corrupt'), [])
})
