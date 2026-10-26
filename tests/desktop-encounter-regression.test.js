// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { GROUND_Y, MAIN_LEVELS, rotatedRectBounds } from '../src/game-core.js'
import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import { estimateSpecialBirdReach, generateSpecialLevel } from '../src/special-levels.js'
import { createHeadlessGame } from './helpers/headless-game.js'

const seed = 20260907
const step = (game, ticks) => {
  for (let tick = 0; tick < ticks && game.state === 'play'; tick += 1) {
    game.fixedTick += 1
    game.stepGame()
  }
}

test('16 fixed-seed encounters retain their buildings and enemies during the opening three seconds', async () => {
  const game = await createHeadlessGame()
  const encounters = [
    ...[1, 6, 12, 18].map((level) => ({ mode: 'main', level })),
    ...SPECIAL_CAMPAIGNS.flatMap((campaign) => [1, 4].map((level) => ({
      mode: 'special', campaign: campaign.id, level,
    }))),
    ...[20, 50].map((depth) => ({ mode: 'endless', level: MAIN_LEVELS + depth })),
  ]
  for (const encounter of encounters) {
    const label = `${encounter.mode}/${encounter.campaign || ''}/${encounter.level}`
    Object.assign(game, {
      mode: encounter.mode, level: encounter.level, runSeed: seed, score: 0,
      specialCampaignId: encounter.campaign || null,
    })
    game.setTalentProgression()
    game.startLevel({ retry: false })
    const blockIds = game.blocks.map((block) => block.id)
    const targets = game.squirrels.map((squirrel) => [squirrel.id, squirrel.hp])
    const queue = [game.currentBird.type, ...game.shotQueue]
    if (encounter.mode === 'special') {
      const generated = generateSpecialLevel({ campaignId: encounter.campaign, stageNumber: encounter.level, runSeed: seed })
      assert.ok(generated.reachability.deadlockFree, `${label}: range contract`)
      assert.ok(queue.some((type) => generated.reachability.targetCapableBirdTypes.includes(type)), `${label}: actual ammunition reach`)
      if (encounter.level === 1) assert.equal(queue[0], generated.campaign.signatureBird.id, `${label}: tutorial acorn first`)
    } else {
      assert.ok(game.blocks.every((block) => rotatedRectBounds(block).right <= 1410.01), `${label}: complete fortress inside boundary`)
      const farthest = Math.max(...game.squirrels.map((squirrel) => squirrel.x - squirrel.radius))
      assert.ok(queue.some((type) => estimateSpecialBirdReach(type, { windX: game.windX }).directDamageReachX >= farthest), `${label}: far target range`)
    }
    if (encounter.mode === 'endless') assert.equal(queue.length, 8)
    step(game, 90)
    assert.deepEqual(game.blocks.map((block) => block.id), blockIds, `${label}: no automatic cleanup of authored supports`)
    assert.deepEqual(game.squirrels.map((squirrel) => [squirrel.id, squirrel.hp]), targets, `${label}: no opening death or damage`)
    assert.equal(game.score, 0, `${label}: no automatic score`)
    assert.ok(game.specialObjectiveProgress().collapseRatio < 0.005, `${label}: no opening collapse`)
  }
})

test('rank-three pack reinforces three full-magazine acorns and contract injection preserves their metadata', async () => {
  const game = await createHeadlessGame()
  Object.assign(game, { mode: 'endless', level: 68, runSeed: seed, score: 50000 })
  game.setTalentProgression({ ranks: { pack: 3 } })
  game.startLevel({ retry: false })
  assert.equal(game.baseShotBudget, 8)
  assert.equal(game.shotsRemaining, 8)
  assert.deepEqual([game.currentBird.grantedDamageBonus, ...game.shotQueueDamageBonus], [1, 1, 1, 0, 0, 0, 0, 0])
  assert.ok([game.currentBird.bonusShot, ...game.shotQueueBonus].every((bonus) => !bonus))
  game.setTalentProgression({ ranks: { pack: 3 }, specialTalentIds: ['emberheart'] })
  game.startLevel({ retry: false })
  const ammo = [{ ...game.currentBird, damageBonus: game.currentBird.grantedDamageBonus }, ...game.shotQueue.map((type, index) => ({
    type, damageBonus: game.shotQueueDamageBonus[index], bonusShot: game.shotQueueBonus[index],
  }))]
  assert.equal(ammo.length, 9)
  assert.deepEqual(ammo.filter((bird) => !bird.bonusShot).map((bird) => bird.damageBonus), [1, 1, 1, 0, 0, 0, 0, 0])
  assert.equal(ammo.find((bird) => bird.type === 'talent-emberheart').damageBonus, 0)
})

test('last-shot falling stone can defeat the remaining squirrel before the loss decision', async () => {
  const game = await createHeadlessGame()
  game.runSeed = seed
  game.startLevel({ retry: false })
  const block = game.blocks[0]
  Object.assign(block, {
    type: 'stone', x: 700, y: 310, initialX: 700, initialY: 310,
    previousX: 700, previousY: 310, minimumY: 310, fallStartY: 310,
    width: 40, height: 40, w: 40, h: 40, hp: 10, maxHp: 10,
    mass: 4, asleep: false, vx: 0, vy: 1, rotation: 0, vr: 0,
  })
  const target = game.squirrels[0]
  Object.assign(target, { x: 700, y: GROUND_Y - target.radius, vx: 0, vy: 0, hp: 1 })
  Object.assign(game, {
    blocks: [block], squirrels: [target], birds: [], currentBird: null,
    structureJoints: [], shotsRemaining: 0, turnActive: true,
  })
  step(game, 12)
  assert.equal(game.state, 'play', 'the loss screen must not preempt falling debris')
  step(game, 90)
  assert.equal(game.state, 'between', 'the delayed physical kill produces an actual clear')
  assert.equal(game.level, 2)
})

test('a finished main objective still scores the already burning final beam', async () => {
  const game = await createHeadlessGame()
  game.runSeed = seed
  game.startLevel({ retry: false })
  const block = game.blocks[0]
  Object.assign(block, { hp: 1, burningTicks: 30, burnDurationTotal: 30, burnPulseDamage: 1, burnPulseApplied: false })
  Object.assign(game, { blocks: [block], squirrels: [], birds: [], currentBird: null, structureJoints: [], turnActive: true })
  step(game, 12)
  assert.equal(game.state, 'play')
  step(game, 30)
  assert.equal(game.state, 'between')
  assert.equal(game.blocks.length, 0)
  assert.ok(game.levelScoreBreakdown.blocks > 0, 'pending burn damage is included in the final score')
})
