// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  FRACTURABLE_SPAN_MODULE_KINDS,
  FRACTURABLE_SPAN_ROLES,
  SPAN_FRACTURE_RULES,
  evaluateSpanFracture,
  planSpanFracture,
} from '../src/span-fracture.js'

const longBeam = (overrides = {}) => ({
  id: 'royal-carrier-1',
  x: 200,
  y: 300,
  width: 300,
  height: 24,
  rotation: 0,
  previousX: 198,
  previousY: 299,
  previousRotation: 0,
  initialX: 180,
  initialY: 300,
  initialRotation: 0,
  vx: 2,
  vy: -1,
  vr: 0,
  type: 'wood',
  role: 'building-span',
  moduleKind: 'authored-building-span',
  constructionId: 'resin-wood',
  physicalModuleId: 'citadel-carrier',
  physicalModuleKind: 'royal-carrier',
  completeBuilding: true,
  buildingFormId: 'throne-granary-citadel',
  buildingStructuralSystem: 'bonded-stone-and-resin-frame',
  hp: 7,
  maxHp: 10,
  mass: 12,
  ...overrides,
})

const impact = (overrides = {}) => ({
  contactX: 140,
  contactY: 300,
  closingMomentum: 15,
  ...overrides,
})

test('fracture rules keep wood weaker than stone and expose immutable span vocabularies', () => {
  assert.ok(
    SPAN_FRACTURE_RULES.materials.wood.closingMomentumThreshold
      < SPAN_FRACTURE_RULES.materials.stone.closingMomentumThreshold,
  )
  assert.equal(SPAN_FRACTURE_RULES.minimumSegmentLength, 48)
  assert.ok(FRACTURABLE_SPAN_ROLES.includes('long-beam'))
  assert.ok(FRACTURABLE_SPAN_MODULE_KINDS.includes('authored-building-span'))
  assert.ok(Object.isFrozen(SPAN_FRACTURE_RULES))
  assert.ok(Object.isFrozen(SPAN_FRACTURE_RULES.materials.wood))
  assert.ok(Object.isFrozen(FRACTURABLE_SPAN_ROLES))
})

test('ordinary low-speed contact cannot fracture while sufficient closing momentum can', () => {
  const soft = evaluateSpanFracture({
    block: longBeam(),
    impact: impact({ closingMomentum: 8 }),
    impactType: 'red',
  })
  assert.equal(soft.eligible, false)
  assert.equal(soft.reason, 'below-material-threshold')
  assert.equal(planSpanFracture({
    block: longBeam(), impact: impact({ closingMomentum: 8 }), impactType: 'red',
  }), null)

  const hard = evaluateSpanFracture({ block: longBeam(), impact: impact(), impactType: 'red' })
  assert.equal(hard.eligible, true)
  assert.equal(hard.effectiveClosingMomentum, 15)
  assert.equal(hard.threshold, 14)
  assert.ok(Object.isFrozen(hard))
})

test('stone needs more momentum, while dash, drill, and present or future contracts amplify real impacts', () => {
  const stone = longBeam({ type: 'stone' })
  assert.equal(evaluateSpanFracture({ block: stone, impact: impact({ closingMomentum: 15 }) }).eligible, false)
  assert.equal(evaluateSpanFracture({
    block: stone, impact: impact({ closingMomentum: 14 }), impactType: 'drill',
  }).eligible, true)
  assert.equal(evaluateSpanFracture({
    block: longBeam(), impact: impact({ closingMomentum: 11 }), impactType: 'dash',
  }).eligible, true)
  assert.equal(evaluateSpanFracture({
    block: stone, impact: impact({ closingMomentum: 15 }), impactType: 'talent-emberheart',
  }).eligible, true)
  assert.equal(evaluateSpanFracture({
    block: stone, impact: impact({ closingMomentum: 15 }), impactType: 'talent-future-contract',
  }).eligible, true)
  assert.equal(evaluateSpanFracture({
    block: stone, impact: impact({ closingMomentum: 0 }), impactType: 'drill',
  }).reason, 'impact-too-soft')
})

test('a fracture plan divides geometry and conserved state without touching the source block', () => {
  const source = longBeam()
  const before = structuredClone(source)
  const plan = planSpanFracture({ block: source, impact: impact(), impactType: 'ordinary' })
  assert.ok(plan)
  assert.deepEqual(source, before)
  assert.equal(plan.parentId, source.id)
  assert.equal(plan.requestedLocalX, -60)
  assert.equal(plan.splitLocalX, -60)
  assert.equal(plan.fragments.length, 2)

  const [left, right] = plan.fragments
  assert.equal(left.width, 90)
  assert.equal(right.width, 210)
  assert.equal(left.x, 95)
  assert.equal(right.x, 245)
  assert.equal(left.y, source.y)
  assert.equal(right.y, source.y)
  assert.equal(left.hp + right.hp, source.hp)
  assert.equal(left.maxHp + right.maxHp, source.maxHp)
  assert.equal(left.mass + right.mass, source.mass)
  assert.equal(left.hp, source.hp * 0.3)
  assert.equal(left.maxHp, source.maxHp * 0.3)
  assert.equal(left.mass, source.mass * 0.3)
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.fragments))
  assert.ok(plan.fragments.every(Object.isFrozen))
})

test('fractional health, mass, and width remain strictly conserved across impact positions', () => {
  for (let rotation = -180; rotation <= 180; rotation += 15) {
    const radians = rotation * Math.PI / 180
    for (let localX = -150; localX <= 150; localX += 7.5) {
      const source = longBeam({
        x: 20, y: -10, width: 300.1, height: 20, rotation,
        hp: 7.3, maxHp: 13.7, mass: 11.9,
      })
      const plan = planSpanFracture({
        block: source,
        impact: impact({
          contactX: source.x + localX * Math.cos(radians),
          contactY: source.y + localX * Math.sin(radians),
          closingMomentum: 30,
        }),
      })
      const [left, right] = plan.fragments
      assert.equal(left.width + right.width, source.width)
      assert.equal(left.hp + right.hp, source.hp)
      assert.equal(left.maxHp + right.maxHp, source.maxHp)
      assert.equal(left.mass + right.mass, source.mass)
      assert.ok(left.width >= SPAN_FRACTURE_RULES.minimumSegmentLength)
      assert.ok(right.width >= SPAN_FRACTURE_RULES.minimumSegmentLength)
    }
  }
})

test('split points near either tip are clamped so both pieces retain the minimum length', () => {
  const source = longBeam()
  const leftTip = planSpanFracture({
    block: source,
    impact: impact({ contactX: -500, closingMomentum: 30 }),
  })
  assert.deepEqual(leftTip.fragments.map((fragment) => fragment.width), [48, 252])

  const rightTip = planSpanFracture({
    block: source,
    impact: impact({ contactX: 900, closingMomentum: 30 }),
  })
  assert.deepEqual(rightTip.fragments.map((fragment) => fragment.width), [252, 48])
})

test('rotated spans project the world impact onto their local axis and preserve their pose', () => {
  const source = longBeam({
    x: 100,
    y: 200,
    width: 200,
    rotation: 90,
    previousX: 90,
    previousY: 190,
    previousRotation: 0,
    initialX: 80,
    initialY: 180,
    initialRotation: -90,
  })
  const plan = planSpanFracture({
    block: source,
    impact: impact({ contactX: 100, contactY: 240, closingMomentum: 30 }),
  })
  const [left, right] = plan.fragments

  assert.ok(Math.abs(plan.splitLocalX - 40) < 1e-9)
  assert.ok(Math.abs(left.width - 140) < 1e-9)
  assert.ok(Math.abs(right.width - 60) < 1e-9)
  assert.ok(Math.abs(left.x - 100) < 1e-9)
  assert.ok(Math.abs(left.y - 170) < 1e-9)
  assert.ok(Math.abs(right.x - 100) < 1e-9)
  assert.ok(Math.abs(right.y - 270) < 1e-9)
  assert.equal(left.rotation, 90)
  assert.equal(right.rotation, 90)

  // Previous and initial centres use their own historical rotations rather
  // than incorrectly reusing the current 90-degree pose.
  assert.ok(Math.abs(left.previousX - 60) < 1e-9)
  assert.ok(Math.abs(left.previousY - 190) < 1e-9)
  assert.ok(Math.abs(right.previousX - 160) < 1e-9)
  assert.ok(Math.abs(right.previousY - 190) < 1e-9)
  assert.ok(Math.abs(left.initialX - 80) < 1e-9)
  assert.ok(Math.abs(left.initialY - 210) < 1e-9)
  assert.ok(Math.abs(right.initialX - 80) < 1e-9)
  assert.ok(Math.abs(right.initialY - 110) < 1e-9)
})

test('fragment velocities include the parent angular motion and conserve linear momentum', () => {
  const source = longBeam({ x: 0, y: 0, width: 200, vx: 3, vy: -2, vr: 30 })
  const plan = planSpanFracture({
    block: source,
    impact: impact({ contactX: 0, contactY: 0, closingMomentum: 30 }),
  })
  const [left, right] = plan.fragments
  const totalXMomentum = left.vx * left.mass + right.vx * right.mass
  const totalYMomentum = left.vy * left.mass + right.vy * right.mass
  assert.ok(Math.abs(totalXMomentum - source.vx * source.mass) < 1e-9)
  assert.ok(Math.abs(totalYMomentum - source.vy * source.mass) < 1e-9)
  assert.equal(left.vr, source.vr)
  assert.equal(right.vr, source.vr)
})

test('fragments inherit construction and building metadata, receive unique markers, and cannot split again', () => {
  const source = longBeam()
  const plan = planSpanFracture({
    block: source,
    impact: impact({ closingMomentum: 30 }),
    fragmentIds: { left: 'left-runtime-id', right: 'right-runtime-id' },
  })
  const [left, right] = plan.fragments
  for (const fragment of [left, right]) {
    assert.equal(fragment.type, source.type)
    assert.equal(fragment.constructionId, source.constructionId)
    assert.equal(fragment.physicalModuleId, source.physicalModuleId)
    assert.equal(fragment.physicalModuleKind, source.physicalModuleKind)
    assert.equal(fragment.completeBuilding, source.completeBuilding)
    assert.equal(fragment.buildingFormId, source.buildingFormId)
    assert.equal(fragment.buildingStructuralSystem, source.buildingStructuralSystem)
    assert.equal(fragment.fractureParentId, source.id)
    assert.equal(fragment.spanFractured, true)
    assert.equal(planSpanFracture({
      block: fragment,
      impact: impact({ closingMomentum: 999 }),
      impactType: 'drill',
    }), null)
  }
  assert.equal(left.id, 'left-runtime-id')
  assert.equal(left.fractureSide, 'left')
  assert.equal(right.id, 'right-runtime-id')
  assert.equal(right.fractureSide, 'right')
})

test('short, square, unsupported-material, dead, and unmarked blocks do not produce plans', () => {
  const cases = [
    longBeam({ width: 90 }),
    longBeam({ width: 130, height: 80 }),
    longBeam({ type: 'ice' }),
    longBeam({ hp: 0 }),
    longBeam({ rotation: Number.NaN }),
    longBeam({ role: 'wall-panel', moduleKind: 'wall-panel' }),
    longBeam({ spanFractured: true }),
  ]
  for (const block of cases) {
    assert.equal(planSpanFracture({
      block,
      impact: impact({ closingMomentum: 999 }),
      impactType: 'drill',
    }), null)
  }

  assert.ok(planSpanFracture({
    block: longBeam({ role: 'wall-panel', moduleKind: 'wall-panel', spanFracturable: true }),
    impact: impact({ closingMomentum: 30 }),
  }))
})
