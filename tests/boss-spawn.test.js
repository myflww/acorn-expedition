// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  GROUND_Y,
  MAIN_BOSS_LEVELS,
  MAIN_LEVELS,
  SLING_X,
  bossProfileForEncounter,
  buildBossSpawnPreferences,
  circleRectCollisionManifold,
  distanceSquared,
  findNearestCircleClearPosition,
  findSafeCircleSpawnPosition,
  generateLevel,
  rotatedRectBounds,
} from '../src/game-core.js'
import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import { generateSpecialLevel } from '../src/special-levels.js'
import { SPECIAL_SQUIRREL_BY_TYPE } from '../src/special-roster.js'

const WORLD_MIN_X = -350
const WORLD_MAX_X = 1450
const MINIMUM_BOSS_SLING_DISTANCE = 520
const REAR_START_RATIO = 0.5

function assertStrictlyGrows(profiles, field, label) {
  for (let index = 1; index < profiles.length; index += 1) {
    assert.ok(
      profiles[index][field] > profiles[index - 1][field],
      `${label}: ${field} must grow from encounter ${index} to ${index + 1}`,
    )
  }
}

function assertBossKnockbackResistance(profile, label) {
  assert.ok(Number.isFinite(profile.knockbackMultiplier), `${label}: knockbackMultiplier must be finite`)
  assert.ok(profile.knockbackMultiplier > 0, `${label}: knockbackMultiplier must remain positive`)
  assert.ok(profile.knockbackMultiplier < 1, `${label}: boss must resist more knockback than a regular enemy`)
}

function runtimeCircle(target, index = 0) {
  const roster = SPECIAL_SQUIRREL_BY_TYPE[target.variant]
  const size = target.boss
    ? Math.max(target.size, roster?.stats.size || 0)
    : roster?.stats.size || target.size
  return {
    ...target,
    y: target.variant === 'glider' ? Math.min(target.y, 270 + (index % 3) * 52) : target.y,
    radius: size * 0.78,
  }
}

function fortressBounds(blocks) {
  const bounds = blocks.map(rotatedRectBounds)
  return {
    left: Math.min(...bounds.map((bound) => bound.left)),
    right: Math.max(...bounds.map((bound) => bound.right)),
  }
}

function assertSafeBossSpawn(generated, label) {
  const solids = [...generated.blocks, ...generated.platforms]
  const bossIndex = generated.targets.findIndex((target) => target.boss)
  assert.notEqual(bossIndex, -1, `${label}: missing boss`)
  const boss = runtimeCircle(generated.targets[bossIndex], bossIndex)
  const grounded = boss.variant !== 'glider'
  const authoredOnGround = grounded && Math.abs(boss.y - (GROUND_Y - boss.radius)) < 0.01
  const authored = { x: boss.x, y: boss.y - (grounded && !authoredOnGround ? 3 : 0) }
  const tacticalPreferences = buildBossSpawnPreferences(boss, generated.blocks, {
    minX: WORLD_MIN_X + boss.radius + 2,
    maxX: WORLD_MAX_X - boss.radius - 2,
    grounded,
  })
  const safe = findSafeCircleSpawnPosition(boss, solids, {
    minX: WORLD_MIN_X + boss.radius + 2,
    maxX: WORLD_MAX_X - boss.radius - 2,
    minY: boss.radius + 2,
    maxY: GROUND_Y - boss.radius,
    groundY: GROUND_Y,
    preferGround: grounded,
    preferred: [authored, ...tacticalPreferences],
    avoidCircles: [],
    padding: 3,
    maxSearch: 520,
  })
  assert.ok(safe, `${label}: no safe boss spawn`)
  const paddedBoss = { ...boss, ...safe, radius: boss.radius + 3 }
  assert.ok(solids.every((solid) => {
    const manifold = circleRectCollisionManifold(paddedBoss, solid)
    return !manifold || manifold.overlap <= 1e-6
  }), `${label}: boss overlaps structure`)
  const guards = []
  const occupied = [{ ...boss, ...safe }]
  for (const target of generated.targets.map(runtimeCircle).filter((entry) => !entry.boss)) {
    const clear = findNearestCircleClearPosition(target, solids, {
      minX: WORLD_MIN_X + target.radius + 2,
      maxX: WORLD_MAX_X - target.radius - 2,
      minY: target.radius + 2,
      maxY: GROUND_Y - target.radius,
      avoidCircles: occupied,
      padding: 2,
      maxSearch: 420,
    })
    assert.ok(clear, `${label}: no clear guard spawn`)
    const guard = { ...target, ...clear }
    guards.push(guard)
    occupied.push(guard)
  }
  assert.ok(guards.every((guard, index) => occupied.every((other, otherIndex) => {
    if (other === guard || otherIndex === index + 1) return true
    const clearance = guard.radius + other.radius + 3
    return distanceSquared(guard, other) > clearance * clearance
  })), `${label}: boss or guards overlap`)
  const fortress = fortressBounds(generated.blocks)
  const rearStart = fortress.left + (fortress.right - fortress.left) * REAR_START_RATIO
  const physicalCourt = generated.bossCourtyard?.physicalLayout === true
  if (physicalCourt) {
    assert.ok(Math.abs(boss.x - generated.bossCourtyard.centerX) <= 1e-6,
      `${label}: boss ignored its authored physical court`)
    assert.ok(Math.abs(safe.x - generated.bossCourtyard.centerX) <= 1e-6,
      `${label}: safe solver moved the boss out of its physical court`)
    const courtMarker = generated.blocks.find((block) => (
      block.physicalFeature === 'open-boss-court'
    ))
    if (courtMarker) {
      assert.ok(Math.abs(boss.x - courtMarker.x) <= 1e-6,
        `${label}: boss ignored its explicit open-court marker`)
      assert.ok(Math.abs(
        boss.y + boss.radius - rotatedRectBounds(courtMarker).top,
      ) <= 1e-6, `${label}: boss does not rest on its open-court threshold`)
    }
    const verticalTop = safe.y - boss.radius - 3
    const verticalBottom = safe.y + boss.radius + 3
    const sideObstacles = generated.blocks
      .map(rotatedRectBounds)
      .filter((bounds) => bounds.bottom > verticalTop + 1e-6
        && bounds.top < verticalBottom - 1e-6)
    const leftEdge = sideObstacles
      .filter((bounds) => bounds.right <= safe.x + 1e-6)
      .reduce((edge, bounds) => Math.max(edge, bounds.right), fortress.left)
    const rightEdge = sideObstacles
      .filter((bounds) => bounds.left >= safe.x - 1e-6)
      .reduce((edge, bounds) => Math.min(edge, bounds.left), fortress.right)
    assert.ok(safe.x - leftEdge >= boss.radius + 3 - 1e-6,
      `${label}: physical court lacks left-side boss clearance`)
    assert.ok(rightEdge - safe.x >= boss.radius + 3 - 1e-6,
      `${label}: physical court lacks right-side boss clearance`)
  } else if (generated.mode !== 'special') {
    assert.ok(safe.x >= rearStart - 20,
      `${label}: boss is in front of the fortress midpoint (${safe.x} < ${rearStart})`)
  }
  assert.ok(safe.x >= fortress.left + boss.radius - 1e-6
    && safe.x <= fortress.right - boss.radius + 1e-6,
  `${label}: boss is outside the fortress composition`)
  assert.ok(safe.x - SLING_X >= MINIMUM_BOSS_SLING_DISTANCE - 1e-6,
    `${label}: boss is too close to the launcher`)
  if (authoredOnGround) {
    assert.ok(Math.abs(safe.y - (GROUND_Y - boss.radius)) < 1e-9,
      `${label}: grounded boss has an opening fall`)
  } else if (safe.x === authored.x) {
    assert.ok(Math.abs(safe.y - authored.y) < 1e-9,
      `${label}: boss left its authored supported or flying position`)
  }
  return { boss, safe, guards }
}

test('main level 6 seed 5 keeps its boss alive on a clear tactical rear court', () => {
  const generated = generateLevel({ level: 6, seed: 5, mode: 'main' })
  const boss = runtimeCircle(generated.targets.find((target) => target.boss))
  const { safe } = assertSafeBossSpawn(generated, 'main-6/seed-5')
  const fortress = fortressBounds(generated.blocks)
  assert.ok(safe.x >= (fortress.left + fortress.right) / 2)
  assert.equal(safe.y, GROUND_Y - boss.radius)
})

test('all authored main bosses spawn safely in the actual fortress middle/rear', () => {
  for (const level of MAIN_BOSS_LEVELS) {
    for (let seed = 1; seed <= 80; seed += 1) {
      assertSafeBossSpawn(generateLevel({ level, seed, mode: 'main' }), `main-${level}/seed-${seed}`)
    }
  }
})

test('endless bosses through depth 100 keep a safe tactical spawn across fortress seeds', () => {
  for (let depth = 10; depth <= 100; depth += 10) {
    for (let seed = 1; seed <= 40; seed += 1) {
      const generated = generateLevel({ level: MAIN_LEVELS + depth, seed, mode: 'endless' })
      assert.equal(generated.isBossLevel, true, `endless-${depth}/seed-${seed}: missing boss gate`)
      assertSafeBossSpawn(generated, `endless-${depth}/seed-${seed}`)
    }
  }
})

test('all five special bosses use their authored fortress rear without overlap', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (let runSeed = 1; runSeed <= 40; runSeed += 1) {
      const generated = generateSpecialLevel({
        campaignId: campaign.id,
        stageNumber: campaign.stages.at(-1).number,
        runSeed,
      })
      assertSafeBossSpawn(generated, `${campaign.id}/seed-${runSeed}`)
    }
  }
})

test('main boss profiles grow through the campaign and culminate in a heavyweight king', () => {
  const profiles = MAIN_BOSS_LEVELS.map((level) => bossProfileForEncounter(
    'main',
    level,
    level === MAIN_LEVELS ? 'king' : 'general',
  ))

  assertStrictlyGrows(profiles, 'hp', 'main boss ramp')
  assertStrictlyGrows(profiles, 'size', 'main boss ramp')
  assertStrictlyGrows(profiles, 'mass', 'main boss ramp')
  assert.ok(profiles.at(-1).hp >= 14, 'the final king must have at least 14 HP')
  profiles.forEach((profile, index) => {
    assertBossKnockbackResistance(profile, `main-${MAIN_BOSS_LEVELS[index]}`)
    assert.equal(Object.isFrozen(profile), true)
  })
})

test('endless boss growth is monotonic, materially stronger, and capped at deep floors', () => {
  const depths = [10, 20, 40, 60, 80, 100, 200]
  const profiles = depths.map((depth) => (
    bossProfileForEncounter('endless', MAIN_LEVELS + depth, 'general')
  ))

  for (const field of ['hp', 'size', 'mass']) {
    for (let index = 1; index < profiles.length; index += 1) {
      assert.ok(
        profiles[index][field] >= profiles[index - 1][field],
        `endless depth ${depths[index]}: ${field} must not decrease`,
      )
    }
    assert.ok(profiles[2][field] > profiles[0][field], `${field} must grow before the endless cap`)
    assert.equal(profiles.at(-1)[field], profiles.at(-2)[field], `${field} must be capped by depth 100`)
  }
  profiles.forEach((profile, index) => {
    assertBossKnockbackResistance(profile, `endless-${depths[index]}`)
  })
})

test('every special boss profile has boss-only knockback resistance', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const finale = campaign.stages.at(-1)
    const profile = bossProfileForEncounter('special', finale.number, finale.encounter.bossVariant)
    assertBossKnockbackResistance(profile, `${campaign.id}/${finale.encounter.bossVariant}`)
  }
})

test('boss preferences follow actual structure geometry and are immutable', () => {
  const boss = { x: 720, y: 180, radius: 32 }
  const compactFortress = [
    { x: 650, y: 490, width: 40, height: 60 },
    { x: 900, y: 470, width: 180, height: 20 },
  ]
  const giantRearKeep = [
    { x: 740, y: 480, width: 80, height: 80 },
    { x: 1_260, y: 440, width: 240, height: 30 },
  ]
  const compact = buildBossSpawnPreferences(boss, compactFortress)
  const giant = buildBossSpawnPreferences(boss, giantRearKeep)

  assert.ok(compact.length > 2)
  assert.ok(giant.length > compact.length)
  assert.ok(giant[0].x > compact[0].x + 200)
  assert.ok(compact.every((point) => point.x - SLING_X >= MINIMUM_BOSS_SLING_DISTANCE))
  assert.ok(compact.every((point) => point.y === GROUND_Y - boss.radius))
  assert.ok(Object.isFrozen(compact))
  assert.ok(compact.every(Object.isFrozen))

  const airborne = buildBossSpawnPreferences(boss, giantRearKeep, { grounded: false })
  assert.ok(airborne.every((point) => point.y === boss.y))
  assert.throws(() => buildBossSpawnPreferences(boss, []), /at least one structure rectangle/u)
  assert.throws(
    () => buildBossSpawnPreferences(boss, compactFortress, { rearStartRatio: 0.8, focusRatio: 0.6 }),
    /options are invalid/u,
  )
})

test('runtime reserves the tactical boss court before placing its guards', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /buildBossSpawnPreferences/u)
  assert.match(runtime, /Number\(second\.isBoss\) - Number\(first\.isBoss\)/u)
  assert.match(runtime, /avoidCircles: options\.avoidCircles/u)
})

test('bosses ignore environmental defeat without blocking direct or explosion damage', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /const BOSS_SPAWN_PROTECTION_TICKS = Math\.round\(900 \/ STEP_MS\)/u)
  assert.match(runtime, /if \(squirrel\.isBoss \|\| this\.squirrelHasSpawnProtection\(squirrel\)\) continue/u)
  assert.match(runtime, /if \(impact > 6 && !squirrel\.isBoss && !spawnProtected\)/u)
  assert.match(runtime, /if \(outsideWorld && squirrel\.isBoss\)/u)
  assert.match(runtime, /if \(squirrel\.spawnProtectionTicks > 0\) squirrel\.spawnProtectionTicks -= 1/u)
  assert.match(runtime, /const windDirectBonus = headwindBonus \+ windborneBonus/u)
  assert.match(
    runtime,
    /this\.damageSquirrel\(\s*squirrel,\s*bird\.damage\s*\+\s*bird\.flatDamageBonus\s*\+\s*firstBossHitBonus\s*\+\s*windDirectBonus\s*\)/u,
  )
  assert.match(runtime, /explode\(x, y, radius, damage(?:,[^)]*)?\)[\s\S]{0,2600}this\.damageSquirrel\(squirrel, damage(?: \+ shieldBonus)?\)/u)

  const damageMethod = runtime.match(/damageSquirrel\(squirrel, amount\) \{[\s\S]*?\n  \}\n\n  activateBossPhases/u)?.[0]
  assert.ok(damageMethod)
  assert.doesNotMatch(damageMethod, /spawnProtection|environment|isBoss\s*&&/u)
})

test('default boss phases use local shockwaves without waking the entire fortress', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const phaseMethod = runtime.match(/activateBossPhases\(squirrel\) \{[\s\S]*?\n  \}\n\n  killSquirrel/u)?.[0]
  assert.ok(phaseMethod, 'activateBossPhases method must remain inspectable')

  assert.doesNotMatch(phaseMethod, /wakeStructure:\s*true/u)
  assert.doesNotMatch(phaseMethod, /changes\.wakeStructure\s*\|\|\s*changes\.shockPower/u)
  assert.match(
    phaseMethod,
    /if \(changes\.shockPower\) \{[\s\S]{0,260}this\.shockwave\(squirrel\.x, squirrel\.y,\s*\d+,\s*changes\.shockPower/u,
  )

  // Boss phase hardening must not accidentally turn direct hits into an
  // environmental-damage path: ordinary impact and explosions remain valid.
  assert.match(
    runtime,
    /this\.damageSquirrel\(\s*squirrel,\s*bird\.damage\s*\+\s*bird\.flatDamageBonus\s*\+\s*firstBossHitBonus\s*\+\s*windDirectBonus\s*\)/u,
  )
  assert.match(runtime, /explode\(x, y, radius, damage(?:,[^)]*)?\)[\s\S]{0,2600}this\.damageSquirrel\(squirrel, damage(?: \+ shieldBonus)?\)/u)
})
