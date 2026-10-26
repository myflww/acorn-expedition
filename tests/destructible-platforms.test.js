// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DESTRUCTIBLE_PLATFORM_DEFAULTS,
  applyDestructiblePlatformImpact,
  destructiblePlatformCarrierHitboxes,
  initializeDestructiblePlatform,
} from '../src/destructible-platforms.js'

const authoredPlatform = () => ({
  x: 100,
  y: 200,
  width: 100,
  height: 20,
  rotation: 0,
  previousX: 100,
  previousY: 200,
  previousRotation: 0,
  velocityX: 2.5,
  velocityY: -1,
  blocksBirds: true,
  specialVisualKind: 'skyport-deck',
  carrierKind: 'twin-rotor',
})

test('initialization adds two independent carriers and preserves authored visual identity', () => {
  const authored = authoredPlatform()
  const platform = initializeDestructiblePlatform(authored)

  assert.equal(platform.boardHp, 3)
  assert.equal(platform.boardMaxHp, 3)
  assert.deepEqual(platform.carrierHp, [2, 2])
  assert.deepEqual(platform.carrierMaxHp, [2, 2])
  assert.equal(platform.carrierKind, 'twin-rotor')
  assert.equal(platform.specialVisualKind, 'skyport-deck')
  assert.equal(platform.blocksBirds, true)
  assert.equal(platform.powered, true)
  assert.equal(platform.destroyed, false)
  assert.equal(platform.derailed, false)
  assert.ok(Object.isFrozen(platform))
  assert.ok(Object.isFrozen(platform.carrierHp))
  assert.equal(authored.boardHp, undefined, 'authored level data must remain untouched')
})

test('normal impacts need three clean hits while high damage opens the board sooner', () => {
  let platform = initializeDestructiblePlatform(authoredPlatform())
  const first = applyDestructiblePlatformImpact(platform, { target: 'board', damage: 1 })
  platform = first.platform
  assert.equal(platform.boardHp, 2)
  assert.equal(platform.blocksBirds, true)
  assert.equal(first.outcome.boardDestroyed, false)

  const second = applyDestructiblePlatformImpact(platform, { targetKind: 'board', damage: 1 })
  platform = second.platform
  assert.equal(platform.boardHp, 1)
  assert.equal(platform.blocksBirds, true)

  const third = applyDestructiblePlatformImpact(platform, { target: 'board', damage: 1 })
  assert.equal(third.platform.boardHp, 0)
  assert.equal(third.platform.destroyed, true)
  assert.equal(third.platform.blocksBirds, false)
  assert.equal(third.outcome.boardDestroyed, true)
  assert.equal(third.outcome.consumed, true)
  assert.equal(third.outcome.specialVisualKind, 'skyport-deck')
  assert.ok(Object.isFrozen(third))
  assert.ok(Object.isFrozen(third.platform))
  assert.ok(Object.isFrozen(third.outcome))

  const explosive = applyDestructiblePlatformImpact(authoredPlatform(), { target: 'board', damage: 3 })
  assert.equal(explosive.platform.destroyed, true)
  assert.equal(explosive.outcome.appliedDamage, DESTRUCTIBLE_PLATFORM_DEFAULTS.boardHp)
})

test('destroying either named carrier derails the platform and removes propulsion', () => {
  const result = applyDestructiblePlatformImpact(authoredPlatform(), {
    target: 'carrier',
    carrierIndex: 1,
    damage: 2,
  })

  assert.deepEqual(result.platform.carrierHp, [2, 0])
  assert.equal(result.platform.boardHp, 3)
  assert.equal(result.platform.destroyed, false)
  assert.equal(result.platform.blocksBirds, true, 'an intact fallen board remains a physical obstacle')
  assert.equal(result.platform.derailed, true)
  assert.equal(result.platform.powered, false)
  assert.equal(result.platform.velocityX, 0)
  assert.equal(result.platform.velocityY, 0)
  assert.equal(result.outcome.carrierIndex, 1)
  assert.equal(result.outcome.carrierDestroyed, true)
  assert.equal(result.outcome.newlyDerailed, true)

  const hitboxes = destructiblePlatformCarrierHitboxes(result.platform)
  assert.equal(hitboxes[0].active, true)
  assert.equal(hitboxes[1].active, false)
  assert.equal(hitboxes[1].blocksBirds, false)
})

test('carrier hitboxes follow current and previous translation plus host rotation', () => {
  const hitboxes = destructiblePlatformCarrierHitboxes({
    ...authoredPlatform(),
    rotation: 90,
    previousX: 90,
    previousY: 190,
    previousRotation: 0,
    carrierWidth: 20,
    carrierHeight: 12,
    carrierGap: 4,
  })

  assert.equal(hitboxes.length, 2)
  // Local carrier centres are (-30,-20) and (+30,-20). Rotating the host by
  // 90 degrees moves them to opposite vertical sides of x=120.
  assert.deepEqual(hitboxes.map(({ x, y }) => [x, y]), [[120, 170], [120, 230]])
  assert.deepEqual(hitboxes.map(({ previousX, previousY }) => [previousX, previousY]), [[60, 170], [120, 170]])
  assert.deepEqual(hitboxes[0].previous, {
    x: 60, y: 170, width: 20, height: 12, rotation: 0,
  })
  assert.equal(hitboxes[0].rotation, 90)
  assert.equal(hitboxes[0].specialVisualKind, 'skyport-deck')
  assert.equal(hitboxes[0].carrierKind, 'twin-rotor')
  assert.ok(Object.isFrozen(hitboxes))
  assert.ok(hitboxes.every((hitbox) => Object.isFrozen(hitbox) && Object.isFrozen(hitbox.previous)))
})

test('a destroyed board remains non-blocking and cannot consume duplicate damage events', () => {
  const destroyed = applyDestructiblePlatformImpact(authoredPlatform(), {
    target: 'board', damage: 99,
  }).platform
  const duplicate = applyDestructiblePlatformImpact(destroyed, {
    target: 'board', damage: 5,
  })

  assert.equal(duplicate.platform.blocksBirds, false)
  assert.equal(duplicate.platform.destroyed, true)
  assert.equal(duplicate.outcome.appliedDamage, 0)
  assert.equal(duplicate.outcome.consumed, false)
  assert.equal(duplicate.outcome.boardDestroyed, false)
  assert.throws(() => applyDestructiblePlatformImpact(destroyed, {
    target: 'carrier', carrierIndex: 2, damage: 1,
  }), /carrier index/u)
})
