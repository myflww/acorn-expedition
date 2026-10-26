// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  SPECIAL_ACORNS,
  SPECIAL_ACORN_BY_TYPE,
  SPECIAL_SQUIRRELS,
  SPECIAL_SQUIRREL_BY_TYPE,
  SPECIAL_ROSTER,
  calculateVineWinchVelocity,
  evaluateVineWinchDisplacement,
  evaluateVineWinchLineOfSight,
  getSpecialRosterEntry,
  planVineWinchActivation,
  selectVineWinchTarget,
  specialRosterForLevel,
  validateSpecialRoster,
} from '../src/special-roster.js'

test('special roster ships five visually and mechanically distinct acorns and squirrels', () => {
  assert.equal(SPECIAL_ACORNS.length, 5)
  assert.equal(SPECIAL_SQUIRRELS.length, 5)
  assert.equal(SPECIAL_ROSTER.length, 10)
  assert.equal(new Set(SPECIAL_ACORNS.map((entry) => entry.ability.id)).size, 5)
  assert.equal(new Set(SPECIAL_SQUIRRELS.map((entry) => entry.ability.id)).size, 5)
  assert.equal(new Set(SPECIAL_ROSTER.map((entry) => entry.visual.art)).size, 10)
  assert.equal(new Set(SPECIAL_ROSTER.map((entry) => entry.visual.silhouette)).size, 10)
  assert.equal(SPECIAL_ACORN_BY_TYPE.quake.title, '震地橡宝')
  assert.equal(SPECIAL_SQUIRREL_BY_TYPE.shield.title, '盾尾卫士')
  for (const entry of SPECIAL_ROSTER) {
    assert.ok(entry.counter.length >= 20)
    assert.ok(Object.isFrozen(entry))
    assert.ok(Object.isFrozen(entry.visual.palette))
    assert.ok(Object.isFrozen(entry.stats))
    assert.ok(Object.isFrozen(entry.ability))
  }
  assert.ok(Object.isFrozen(SPECIAL_ACORNS))
  assert.ok(Object.isFrozen(SPECIAL_SQUIRRELS))
  assert.ok(Object.isFrozen(SPECIAL_ROSTER))
})

test('special roster validates schema, identities, numeric balance parameters, and discovery ids', () => {
  assert.deepEqual(validateSpecialRoster(), { valid: true, errors: [] })
  assert.deepEqual(SPECIAL_ACORNS.map((entry) => entry.type), ['drill', 'frost', 'vine', 'boomerang', 'quake'])
  assert.deepEqual(SPECIAL_SQUIRRELS.map((entry) => entry.type), ['shield', 'engineer', 'glider', 'shaman', 'burrower'])
  for (const entry of SPECIAL_ROSTER) {
    assert.match(entry.discoveryId, entry.kind === 'acorn' ? /^bird:/u : /^enemy:/u)
    assert.ok(entry.firstLevel >= 14 && entry.firstLevel <= 46)
    assert.ok(Object.values(entry.stats).every((value) => Number.isFinite(value)))
  }
})

test('震地橡宝的重型弹道抗风但不与其他特殊橡宝同质化', () => {
  const quake = SPECIAL_ACORN_BY_TYPE.quake
  assert.equal(quake.stats.launchSpeed, 1.06)
  assert.equal(quake.stats.gravityScale, 1.08)
  assert.equal(quake.stats.windMultiplier, 0.55)
  assert.ok(quake.stats.mass > Math.max(...SPECIAL_ACORNS.filter((entry) => entry !== quake).map((entry) => entry.stats.mass)))
  assert.ok(quake.stats.restitution < Math.min(...SPECIAL_ACORNS.filter((entry) => entry !== quake).map((entry) => entry.stats.restitution)))
  assert.ok(new Set(SPECIAL_ACORNS.map((entry) => `${entry.stats.launchSpeed}/${entry.stats.gravityScale}`)).size >= 4)
})

test('破城橡宝的专属能力足以对应加重后的木、冰、石结构', () => {
  const drill = SPECIAL_ACORN_BY_TYPE.drill
  assert.equal(drill.ability.id, 'vertical-bore')
  assert.equal(drill.ability.diveSpeed, 21)
  assert.equal(drill.ability.maxPierces, 4)
  assert.equal(drill.ability.stoneDamageMultiplier, 2.35)
  assert.equal(drill.ability.activeWindMultiplier, 0.18)
  assert.equal(SPECIAL_ACORN_BY_TYPE.frost.ability.brittleDamageMultiplier, 1.8)
  assert.equal(SPECIAL_ACORN_BY_TYPE.frost.ability.permanentBlockFreeze, true)
  assert.equal('blockBrittleMs' in SPECIAL_ACORN_BY_TYPE.frost.ability, false)
  assert.match(SPECIAL_ACORN_BY_TYPE.frost.summary, /永久/u)
  assert.equal(SPECIAL_ACORN_BY_TYPE.vine.ability.range, 230)
  assert.equal(SPECIAL_ACORN_BY_TYPE.vine.ability.displacementThreshold, 18)
  assert.equal(SPECIAL_ACORN_BY_TYPE.vine.ability.jointDamage, 2)
  assert.equal(SPECIAL_ACORN_BY_TYPE.quake.ability.shockDamage, 2)
  assert.equal(SPECIAL_ACORN_BY_TYPE.quake.ability.blockWakeRadius, 175)

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /BOMB_ABILITY = Object\.freeze\(\{ radius: 130, structureDamage: 4 \}\)/u)
  assert.match(runtime, /BOMB_ABILITY\.structureDamage/u)
})

test('藤锁绞盘优先教学钩、关键支点和横梁，然后才比较同级距离', () => {
  const origin = { x: 0, y: 0 }
  const ordinary = { id: 'ordinary', x: 30, y: 120, width: 22, height: 48, hp: 3 }
  const beam = { id: 'beam', x: 80, y: 80, width: 60, height: 16, hp: 3, role: 'lintel' }
  const anchor = { id: 'anchor', x: 100, y: -70, width: 24, height: 50, hp: 3, cableAnchor: true }
  const tutorial = {
    id: 'tutorial', x: 210, y: 0, width: 40, height: 20, hp: 3,
    tutorialTetherTarget: true,
  }
  assert.equal(selectVineWinchTarget({
    origin,
    blocks: [ordinary, beam, anchor, tutorial],
    range: 230,
  }).target, tutorial)
  assert.equal(selectVineWinchTarget({
    origin,
    blocks: [ordinary, beam, anchor],
    range: 230,
  }).target, anchor)
  assert.equal(selectVineWinchTarget({
    origin,
    blocks: [ordinary, beam],
    range: 230,
  }).target, beam)
})

test('藤锁只能锁定视线可达的外边界，建筑和实体平台都会遮挡', () => {
  const origin = { x: 0, y: 0 }
  const frontWall = {
    id: 'front-wall', x: 55, y: 0, width: 32, height: 150, hp: 9,
    role: 'wall-panel',
  }
  const hiddenAnchor = {
    id: 'hidden-anchor', x: 115, y: 0, width: 24, height: 50, hp: 9,
    cableAnchor: true,
  }
  const hiddenLine = evaluateVineWinchLineOfSight({
    origin,
    target: hiddenAnchor,
    blocks: [frontWall, hiddenAnchor],
  })
  assert.equal(hiddenLine.clear, false)
  assert.equal(hiddenLine.blocker, frontWall)
  assert.equal(evaluateVineWinchLineOfSight({
    origin,
    target: frontWall,
    blocks: [frontWall, hiddenAnchor],
  }).clear, true, '遮挡体本身应仍可锁定')
  assert.equal(selectVineWinchTarget({
    origin,
    blocks: [frontWall, hiddenAnchor],
    range: 230,
  }).target, frontWall)

  const solidPlatform = {
    id: 'solid-platform', x: 55, y: 0, width: 30, height: 90,
    blocksBirds: true,
  }
  assert.equal(evaluateVineWinchLineOfSight({
    origin,
    target: hiddenAnchor,
    blocks: [hiddenAnchor],
    platforms: [solidPlatform],
  }).clear, false)
  assert.equal(evaluateVineWinchLineOfSight({
    origin,
    target: hiddenAnchor,
    blocks: [hiddenAnchor],
    platforms: [{ ...solidPlatform, id: 'ghost-platform', blocksBirds: false }],
  }).clear, true, '非实体平台不应挡住藤锁')
  assert.equal(evaluateVineWinchLineOfSight({
    origin,
    target: hiddenAnchor,
    blocks: [
      hiddenAnchor,
      { id: 'angled-brace', x: 55, y: 0, width: 14, height: 100, rotation: 45, hp: 4 },
    ],
  }).clear, false, '旋转斜撑也必须使用真实轮廓遮挡')
})

test('藤锁教学横梁在支柱上方保持可见且优先', () => {
  const origin = { x: 430, y: 375 }
  const leftPost = { id: 'left', x: 472, y: 495, width: 24, height: 50, hp: 4 }
  const rightPost = { id: 'right', x: 528, y: 495, width: 24, height: 50, hp: 4 }
  const tutorialBeam = {
    id: 'tutorial-beam', x: 500, y: 459, width: 86, height: 22, hp: 4,
    role: 'tutorial-raft-beam', tutorialTetherTarget: true,
  }
  const blocks = [leftPost, rightPost, tutorialBeam]
  assert.equal(evaluateVineWinchLineOfSight({
    origin, target: tutorialBeam, blocks,
  }).clear, true)
  assert.equal(selectVineWinchTarget({ origin, blocks, range: 230 }).target, tutorialBeam)
})

test('藤锁绞盘可选可抓取移动平台，空放时明确不消耗使用次数', () => {
  const bird = { x: 100, y: 100 }
  const platform = {
    id: 'raft', x: 180, y: 100, width: 112, height: 16,
    blocksBirds: true, velocityY: 1,
  }
  const empty = planVineWinchActivation({
    bird,
    ability: SPECIAL_ACORN_BY_TYPE.vine.ability,
  })
  assert.equal(empty.consumeUse, false)
  assert.equal(empty.selection, null)
  const planned = planVineWinchActivation({
    bird,
    platforms: [platform],
    ability: SPECIAL_ACORN_BY_TYPE.vine.ability,
  })
  assert.equal(planned.consumeUse, true)
  assert.equal(planned.selection.target, platform)
  assert.equal(planned.selection.entityKind, 'platform')

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /if \(!plan\.consumeUse \|\| poweredAbility\.maxTargets < 1\) \{[\s\S]*?bird\.used = false/u)
  assert.match(runtime, /vinePreviewSelection\(bird\)[\s\S]*?this\.specialWaterY !== null[\s\S]*?parameters\?\.buoyancy[\s\S]*?parameters\?\.drag/u)
  assert.match(runtime, /vinePreviewSelection\(bird\)[\s\S]*?this\.vinePreviewHitsSolid[\s\S]*?if \(hitSolid \|\|/u)
  assert.match(runtime, /vinePreviewHitsSolid[\s\S]*?resolveSweptCircleRectCollision/u)
  assert.match(runtime, /predictAimPath\(bird[\s\S]*?bird\.type === 'vine' && this\.vinePreviewHitsSolid[\s\S]*?if \(vineHitSolid \|\|/u)
})

test('藤锁拉移阈值只计划目标相连榫结，孤立目标改用短暂低摩擦', () => {
  const joints = [
    { id: 'connected', firstId: 'target', secondId: 'beam', broken: false },
    { id: 'unrelated', firstId: 'left', secondId: 'right', broken: false },
    { id: 'already-broken', firstId: 'target', secondId: 'roof', broken: true },
  ]
  const below = evaluateVineWinchDisplacement({
    targetId: 'target', startX: 0, startY: 0, currentX: 17.99, currentY: 0,
    threshold: 18, joints,
  })
  assert.equal(below.reached, false)
  assert.deepEqual(below.connectedJointIds, [])

  const reached = evaluateVineWinchDisplacement({
    targetId: 'target', startX: 0, startY: 0, currentX: 18, currentY: 0,
    threshold: 18, joints,
  })
  assert.equal(reached.reached, true)
  assert.deepEqual(reached.connectedJointIds, ['connected'])
  assert.equal(reached.applySlip, false)

  const isolated = evaluateVineWinchDisplacement({
    targetId: 'isolated', startX: 0, startY: 0, currentX: 19, currentY: 0,
    threshold: 18, joints,
  })
  assert.equal(isolated.applySlip, true)
})

test('藤锁持续力按质量归一并限速，异常输入不会产生非有限数', () => {
  const light = calculateVineWinchVelocity({
    target: { x: 100, y: 0, vx: 0, vy: 0, mass: 1 },
    anchor: { x: 0, y: 0 }, force: 1, maxSpeed: 8.8,
  })
  const heavy = calculateVineWinchVelocity({
    target: { x: 100, y: 0, vx: 0, vy: 0, mass: 9 },
    anchor: { x: 0, y: 0 }, force: 1, maxSpeed: 8.8,
  })
  assert.ok(Math.abs(light.vx) > Math.abs(heavy.vx))
  const capped = calculateVineWinchVelocity({
    target: { x: 10, y: 5, vx: 999, vy: -999, mass: Number.NaN },
    anchor: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    force: Number.POSITIVE_INFINITY,
    maxSpeed: 8.8,
  })
  assert.ok(Object.values(capped).every(Number.isFinite))
  assert.ok(capped.speed <= 8.8)
})

test('every authored special ability parameter is connected to the game runtime', () => {
  const runtime = [
    readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/game-core.js', import.meta.url), 'utf8'),
  ].join('\n')
  assert.ok(runtime.includes('bird.windMultiplier'), 'per-acorn wind resistance is not consumed by game.js')
  for (const entry of SPECIAL_ROSTER) {
    const runtimeParameters = Object.keys(entry.ability).filter((key) => !['id', 'trigger', 'uses'].includes(key))
    for (const parameter of runtimeParameters) {
      assert.ok(runtime.includes(`.${parameter}`), `${entry.type}.${parameter} is not consumed by game.js`)
    }
  }
  for (const type of ['bomb', 'split', 'dash', ...SPECIAL_ACORNS.map((entry) => entry.type)]) {
    assert.ok(runtime.includes(`bird.type === '${type}'`), `${type} has no active ability branch`)
  }
  for (const type of SPECIAL_SQUIRRELS.map((entry) => entry.type)) {
    assert.ok(runtime.includes(`variant === '${type}'`), `${type} has no runtime behavior branch`)
  }
})

test('roster lookup accepts runtime, discovery, and canonical ids', () => {
  const drill = SPECIAL_ACORNS[0]
  assert.equal(getSpecialRosterEntry('acorn:drill'), drill)
  assert.equal(getSpecialRosterEntry('bird:drill'), drill)
  assert.equal(getSpecialRosterEntry('unknown'), null)
  assert.deepEqual(specialRosterForLevel(18, 'acorn').map((entry) => entry.type), ['drill'])
  assert.deepEqual(specialRosterForLevel(30, 'squirrel').map((entry) => entry.type), ['shield', 'engineer', 'glider'])
  assert.throws(() => specialRosterForLevel(0), /positive integer/u)
  assert.throws(() => specialRosterForLevel(20, 'bird'), /kind must be/u)
})

test('validator reports malformed or duplicate extension data without throwing', () => {
  const base = structuredClone(SPECIAL_ACORNS[0])
  const duplicate = structuredClone(SPECIAL_ACORNS[0])
  duplicate.title = ''
  duplicate.stats.mass = Number.NaN
  const result = validateSpecialRoster([base, duplicate])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('.title is required')))
  assert.ok(result.errors.some((error) => error.includes('.stats must be finite numbers')))
  assert.ok(result.errors.some((error) => error.includes('duplicate id')))
  assert.deepEqual(validateSpecialRoster(null), { valid: false, errors: ['roster must be an array'] })
})
