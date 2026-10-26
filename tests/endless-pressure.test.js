// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ENDLESS_PRESSURE_TIERS,
  MAIN_LEVELS,
  MAX_NON_BOSS_TARGETS,
  analyzeStructureStability,
  bossProfileForEncounter,
  buildStructureJoints,
  endlessPressureProfile,
  generateLevel,
  structureJointCountsForLevel,
  structureJointKindsForLevel,
} from '../src/game-core.js'

test('endless pressure belts are immutable, deterministic, and rise without exceeding caps', () => {
  assert.equal(Object.isFrozen(ENDLESS_PRESSURE_TIERS), true)
  assert.equal(MAX_NON_BOSS_TARGETS, 12)
  const depths = [1, 9, 10, 20, 30, 50, 80, 120, 500]
  const profiles = depths.map((depth) => endlessPressureProfile(MAIN_LEVELS + depth))

  assert.deepEqual(endlessPressureProfile(MAIN_LEVELS + 50), profiles[5])
  assert.equal(Object.isFrozen(profiles[5]), true)
  assert.equal(profiles[0].nonBossTargetCount, 7)
  assert.equal(profiles[2].bossGuardCount, 5)
  assert.equal(profiles[6].regularBaseHp, 2)
  assert.equal(profiles[7].nonBossTargetCount, MAX_NON_BOSS_TARGETS)
  assert.equal(profiles[7].reinforcedTargetFraction, 0.25)

  for (let index = 1; index < profiles.length; index += 1) {
    assert.ok(profiles[index].nonBossTargetCount >= profiles[index - 1].nonBossTargetCount)
    assert.ok(profiles[index].regularBaseHp >= profiles[index - 1].regularBaseHp)
    assert.ok(profiles[index].bossGuardCount >= profiles[index - 1].bossGuardCount)
    assert.ok(profiles[index].minimumPhysicalBlocks >= profiles[index - 1].minimumPhysicalBlocks)
    assert.ok(profiles[index].bossHp >= profiles[index - 1].bossHp)
  }
  assert.equal(profiles.at(-1).bossHp, endlessPressureProfile(MAIN_LEVELS + 100).bossHp)
})

test('non-boss endless garrisons consume the profile count and deterministic HP mix', () => {
  for (const depth of [9, 11, 21, 31, 51, 81, 121]) {
    const profile = endlessPressureProfile(MAIN_LEVELS + depth)
    for (const seed of [1, 7, 20260828]) {
      const generated = generateLevel({ mode: 'endless', level: MAIN_LEVELS + depth, seed })
      const targets = generated.targets.filter((target) => !target.boss)
      const reinforced = targets.filter((target) => target.endlessReinforced)
      assert.equal(targets.length, profile.nonBossTargetCount, `depth ${depth}, seed ${seed}`)
      assert.equal(
        reinforced.length,
        Math.round(targets.length * profile.reinforcedTargetFraction),
        `depth ${depth}, seed ${seed}: reinforced count`,
      )
      assert.ok(targets.every((target) => target.hp >= profile.regularBaseHp))
      assert.equal(generated.endlessPressure.reinforcedTargetCount, reinforced.length)
    }
  }
})

test('endless boss decades receive their full guard cohort and stronger capped profile', () => {
  for (const depth of [10, 30, 50, 80, 100, 120]) {
    const pressure = endlessPressureProfile(MAIN_LEVELS + depth)
    const profile = bossProfileForEncounter('endless', MAIN_LEVELS + depth)
    for (const seed of [1, 7, 31]) {
      const generated = generateLevel({ mode: 'endless', level: MAIN_LEVELS + depth, seed })
      assert.equal(generated.targets.filter((target) => !target.boss).length, pressure.bossGuardCount)
      assert.equal(generated.targets.find((target) => target.boss).hp, profile.hp)
    }
  }
  assert.ok(
    bossProfileForEncounter('endless', MAIN_LEVELS + 100).hp
      > bossProfileForEncounter('endless', MAIN_LEVELS + 10).hp,
  )
  assert.deepEqual(
    bossProfileForEncounter('endless', MAIN_LEVELS + 200),
    bossProfileForEncounter('endless', MAIN_LEVELS + 100),
  )
})

test('late endless floors meet a connected compound size without reviving legacy tower stacks', () => {
  for (const depth of [20, 30, 50, 80, 120]) {
    const pressure = endlessPressureProfile(MAIN_LEVELS + depth)
    for (const seed of [1, 7, 20260828]) {
      const level = MAIN_LEVELS + depth
      const generated = generateLevel({ mode: 'endless', level, seed })
      const additions = generated.blocks.filter((block) => block.moduleKind === 'endless-compound-apron')
      assert.ok(generated.blocks.length >= pressure.minimumPhysicalBlocks)
      assert.equal(additions.length, generated.endlessPressure.compoundAddedBlocks)
      assert.ok(additions.every((block) => (
        block.completeBuilding === true
        && block.familyPart === 'endless-fortified-apron'
        && !['post', 'lintel'].includes(block.role)
      )))
      if (additions.length) {
        assert.ok(new Set(additions.map((block) => block.compoundSection)).size >= 3)
        assert.ok(additions.some((block) => block.role === 'building-wall'))
        assert.ok(additions.some((block) => block.role === 'building-span'))
      }

      const physical = generated.blocks.map((block, index) => ({
        ...block,
        id: `pressure-${depth}-${seed}-${index}`,
      }))
      const joints = buildStructureJoints(physical, {
        allowedKinds: structureJointKindsForLevel('endless', level),
        desiredCounts: structureJointCountsForLevel('endless', level),
      })
      assert.equal(
        analyzeStructureStability(physical, generated.platforms, { joints }).unstableIds.size,
        0,
        `depth ${depth}, seed ${seed}: compound begins unsupported`,
      )
    }
  }
})

test('main, daily, and special boss contracts do not inherit endless pressure', () => {
  const main = generateLevel({ mode: 'main', level: 18, seed: 19 })
  const daily = generateLevel({ mode: 'daily', level: 11, seed: 19 })
  assert.equal(main.endlessPressure, null)
  assert.equal(daily.endlessPressure, null)
  assert.equal(main.blocks.some((block) => block.moduleKind === 'endless-compound-apron'), false)
  assert.equal(daily.blocks.some((block) => block.moduleKind === 'endless-compound-apron'), false)
  assert.deepEqual(bossProfileForEncounter('special', 4, 'general'), {
    hp: 6,
    size: 26,
    mass: 2.7,
    knockbackMultiplier: 0.42,
    title: '秘境首领',
  })
})
