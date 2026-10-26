// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { MAIN_LEVELS, generateLevel } from '../src/game-core.js'
import { generateSpecialLevel } from '../src/special-levels.js'
import {
  TERRAIN_RULES,
  resolveTerrainGroundContact,
  simulateTerrainStopDistance,
  terrainProfileForEndless,
  terrainProfileForMain,
  terrainProfileForSpecial,
  terrainRuleAtX,
} from '../src/terrain-rules.js'

function assertRecursivelyFrozen(value, path = 'value') {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`)
  for (const [key, child] of Object.entries(value)) assertRecursivelyFrozen(child, `${path}.${key}`)
}

test('terrain contracts are finite, recursively frozen, and visually complete', () => {
  assert.deepEqual(
    ['meadow-dirt', 'woodchip-wetland', 'ice-snow', 'royal-stone-road']
      .filter((id) => !TERRAIN_RULES[id]),
    [],
  )
  assertRecursivelyFrozen(TERRAIN_RULES, 'TERRAIN_RULES')
  for (const rule of Object.values(TERRAIN_RULES)) {
    for (const key of ['groundFriction', 'rollingDrag', 'restitution', 'structureGrip', 'squirrelGrip']) {
      assert.ok(Number.isFinite(rule[key]) && rule[key] > 0, `${rule.id}.${key}`)
    }
    assert.ok(rule.rollingDrag < 1, `${rule.id} never stops a rolling acorn`)
    assert.match(rule.colors.surface, /^#[0-9a-f]{6}$/iu)
    assert.match(rule.colors.rim, /^#[0-9a-f]{6}$/iu)
    assert.ok(rule.texture.kind)
    assert.ok(rule.texture.spacing > 0)
  }
})

test('terrain A/B physics makes ice roll farther, soft ground shorter, and stone foundations grip harder', () => {
  const dirt = simulateTerrainStopDistance('meadow-dirt', { initialSpeed: 12 })
  const soft = simulateTerrainStopDistance('woodchip-wetland', { initialSpeed: 12 })
  const ice = simulateTerrainStopDistance('ice-snow', { initialSpeed: 12 })
  assert.ok(ice.distance > dirt.distance * 4, `${ice.distance} should greatly exceed ${dirt.distance}`)
  assert.ok(soft.distance < dirt.distance * 0.6, `${soft.distance} should stay below ${dirt.distance}`)

  const dirtBlock = resolveTerrainGroundContact(
    { vx: 8, vy: 5 }, TERRAIN_RULES['meadow-dirt'],
    { body: 'structure', bodyRestitution: 0.1, materialFriction: 0.62 },
  )
  const stoneRoadBlock = resolveTerrainGroundContact(
    { vx: 8, vy: 5 }, TERRAIN_RULES['royal-stone-road'],
    { body: 'structure', bodyRestitution: 0.1, materialFriction: 0.62 },
  )
  const iceBlock = resolveTerrainGroundContact(
    { vx: 8, vy: 5 }, TERRAIN_RULES['ice-snow'],
    { body: 'structure', bodyRestitution: 0.1, materialFriction: 0.62 },
  )
  assert.ok(Math.abs(stoneRoadBlock.vx) < Math.abs(dirtBlock.vx), 'royal road did not add foundation grip')
  assert.ok(Math.abs(iceBlock.vx) > Math.abs(dirtBlock.vx), 'ice did not reduce structure grip')
  assert.ok(Math.abs(iceBlock.vy) > Math.abs(dirtBlock.vy), 'ice did not increase floor elasticity')
})

test('main chapters map to authored ground families and generated blueprints consume them', () => {
  const expected = new Map([
    [1, 'meadow-dirt'], [3, 'meadow-dirt'], [6, 'meadow-dirt'],
    [7, 'woodchip-wetland'], [9, 'woodchip-wetland'],
    [10, 'ice-snow'], [12, 'ice-snow'],
    [13, 'royal-stone-road'], [18, 'royal-stone-road'],
  ])
  for (const [level, terrainId] of expected) {
    const profile = terrainProfileForMain(level)
    assert.equal(profile.primaryId, terrainId, `main ${level}`)
    assertRecursivelyFrozen(profile, `main-${level}`)
    const generated = generateLevel({ mode: 'main', level, seed: 923 })
    assert.deepEqual(generated.terrainProfile, profile)
    assert.equal(terrainRuleAtX(generated.terrainProfile, 760).id, terrainId)
  }
})

test('主线地形标签跟随风峡、林场、雪线和王城叙事', () => {
  assert.equal(terrainProfileForMain(4).label, '风峡砾土隘道')
  assert.equal(terrainProfileForMain(5).label, '风峡砾土隘道')
  assert.equal(terrainProfileForMain(6).label, '黑松关隘台地')
  assert.equal(terrainProfileForMain(7).label, '云杉林场木屑湿地')
  assert.equal(terrainProfileForMain(10).label, '月光雪尘冰面')
  assert.equal(terrainProfileForMain(13).label, '王城楔形石路')
})

test('endless terrain unlocks persist in a seeded pool with no more than two active ground rules', () => {
  const depths = [1, 7, 16, 28, 50, 100]
  for (const depth of depths) {
    for (const seed of [3, 71, 923]) {
      const options = { level: MAIN_LEVELS + depth, seed }
      const first = terrainProfileForEndless(options)
      const second = terrainProfileForEndless(options)
      assert.deepEqual(first, second, `depth ${depth}, seed ${seed} is not deterministic`)
      assert.ok(first.ruleCount >= 1 && first.ruleCount <= 2)
      assert.equal(new Set(first.terrainIds).size, first.ruleCount)
      for (const terrainId of first.terrainIds) assert.ok(TERRAIN_RULES[terrainId])
      const generated = generateLevel({ mode: 'endless', ...options })
      assert.deepEqual(generated.terrainProfile, first)
    }
  }

  const highDepthSamples = Array.from({ length: 80 }, (_, index) => (
    terrainProfileForEndless({ level: MAIN_LEVELS + 60, seed: index + 1 }).terrainIds
  )).flat()
  for (const unlocked of ['meadow-dirt', 'woodchip-wetland', 'ice-snow', 'royal-stone-road']) {
    assert.ok(highDepthSamples.includes(unlocked), `${unlocked} disappeared after its endless unlock`)
  }
})

test('five special campaigns use ice, wetland, local mirror, rock shelf, and floating deck terrain', () => {
  const cases = [
    ['polar-clocktower', 'ice-snow', 1],
    ['tidebound-undercity', 'woodchip-wetland', 1],
    ['mirrorwood-labyrinth', 'meadow-dirt', 2],
    ['deep-root-fault', 'root-rock-shelf', 1],
    ['stormline-skyport', 'skyship-deck', 1],
  ]
  for (const [campaignId, primaryId, ruleCount] of cases) {
    const options = { campaignId, stageNumber: 2, runSeed: 923 }
    const generated = generateSpecialLevel(options)
    const expected = terrainProfileForSpecial({
      campaignId, stageNumber: 2, seed: generated.seed,
    })
    assert.deepEqual(generated.terrainProfile, expected)
    assert.equal(generated.terrainProfile.primaryId, primaryId)
    assert.equal(generated.terrainProfile.ruleCount, ruleCount)
    assert.ok(generated.terrainProfile.ruleCount <= 2)
    if (campaignId === 'mirrorwood-labyrinth') {
      const zone = generated.terrainProfile.zones[0]
      assert.equal(terrainRuleAtX(generated.terrainProfile, (zone.startX + zone.endX) / 2).id, 'mirror-glass')
      assert.equal(terrainRuleAtX(generated.terrainProfile, zone.startX - 1).id, 'meadow-dirt')
    }
  }
})

test('runtime consumes terrain for acorns, structures, squirrels, visuals, and calm weather has no fake wind streaks', () => {
  const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(source, /this\.terrainProfile = generated\.terrainProfile/u)
  assert.match(source, /resolveTerrainGroundContact\(bird, this\.terrainAt\(bird\.x\)/u)
  assert.match(source, /body: 'structure'[\s\S]{0,220}materialFriction: material\.friction/u)
  assert.match(source, /body: 'squirrel'/u)
  assert.match(source, /terrain\.structureGrip/u)
  assert.match(source, /drawGround\(\)[\s\S]{0,900}this\.terrainAt/u)
  assert.match(source, /if \(hasPhysicalWind && weather\.windVisual > 0\.28\)/u)
  assert.doesNotMatch(source, /Math\.sign\(this\.windX \|\| 1\)/u)
  assert.match(source, /terrainProfile: this\.terrainProfile/u)
})
