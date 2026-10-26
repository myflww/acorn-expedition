// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ARCHITECTURE_MECHANISM_COLLISION_MODES,
  ARCHITECTURE_MECHANISM_PHYSICS_KINDS,
  architectureMechanismCollisionMode,
  architectureMechanismCollisionParts,
  buildArchitectureMechanismParts,
  createArchitectureMechanismBinding,
  createArchitectureMechanismBindings,
  resolveArchitectureMechanismHost,
  resolveArchitectureMechanismModel,
  resolveArchitectureMechanismPose,
} from '../src/architecture-mechanisms.js'
import {
  COMPLETE_BUILDING_SILHOUETTES,
  validateCompleteBuildingSilhouettes,
} from '../src/main-architecture-blueprints.js'

const FRAME = Object.freeze({ left: 0, width: 200, height: 100, groundY: 200 })

function anchorFor(formId, mechanism) {
  return COMPLETE_BUILDING_SILHOUETTES[formId].mechanismAnchors
    .find((anchor) => anchor.mechanism === mechanism)
}

function block({
  id,
  x,
  y,
  rotation = 0,
  previousX = x,
  previousY = y,
  previousRotation = rotation,
  massId = null,
  feature = null,
}) {
  return {
    id,
    x,
    y,
    rotation,
    previousX,
    previousY,
    previousRotation,
    initialX: x,
    initialY: y,
    initialRotation: rotation,
    completeBuildingMassId: massId,
    physicalFeature: feature,
  }
}

test('every authored mechanism declares one host and an explicit collision contract', () => {
  assert.deepEqual(ARCHITECTURE_MECHANISM_PHYSICS_KINDS, ['rotor', 'body', 'visual'])
  assert.deepEqual(ARCHITECTURE_MECHANISM_COLLISION_MODES, ['parts', 'host', 'none'])
  const physicsKinds = new Set(ARCHITECTURE_MECHANISM_PHYSICS_KINDS)
  let anchorCount = 0
  for (const [formId, spec] of Object.entries(COMPLETE_BUILDING_SILHOUETTES)) {
    const massIds = new Set(spec.massing.map((mass) => mass.id))
    for (const anchor of spec.mechanismAnchors) {
      anchorCount += 1
      assert.notEqual(Boolean(anchor.hostMassId), Boolean(anchor.hostFeature), `${formId}: host`)
      if (anchor.hostMassId) assert.ok(massIds.has(anchor.hostMassId), `${formId}: mass host`)
      assert.ok(physicsKinds.has(anchor.physicsKind), `${formId}: physics kind`)
      assert.equal(typeof anchor.blocksBirds, 'boolean', `${formId}: blocksBirds`)
      assert.ok(ARCHITECTURE_MECHANISM_COLLISION_MODES.includes(
        architectureMechanismCollisionMode(anchor),
      ))
    }
  }
  assert.ok(anchorCount >= 20)
  assert.deepEqual(validateCompleteBuildingSilhouettes(), [])

  const windmillRotor = anchorFor('tripod-windmill-watch', 'wind-rotor')
  const royalRotor = anchorFor('wind-engine-gate', 'giant-windwheel')
  for (const rotor of [windmillRotor, royalRotor]) {
    assert.equal(rotor.physicsKind, 'rotor')
    assert.equal(rotor.blocksBirds, true)
    assert.equal(architectureMechanismCollisionMode(rotor), 'parts')
  }
})

test('silhouette validation rejects incomplete, ambiguous, or dangling mechanism contracts', () => {
  const malformed = structuredClone(COMPLETE_BUILDING_SILHOUETTES)
  Object.assign(malformed['lean-to-loading-shed'].mechanismAnchors[0], {
    hostMassId: null,
    hostFeature: null,
  })
  Object.assign(malformed['terraced-checkpoint'].mechanismAnchors[0], {
    hostMassId: 'lower-retaining-wall',
    hostFeature: 'also-a-feature',
  })
  malformed['tripod-windmill-watch'].mechanismAnchors[0].hostMassId = 'missing-mass'
  malformed['tripod-windmill-watch'].mechanismAnchors[1].physicsKind = 'ghost'
  malformed['suspension-freight-bridge'].mechanismAnchors[0].blocksBirds = 'no'
  malformed['royal-viaduct'].mechanismAnchors[0].hostFeature = 'missing-feature'
  const errors = validateCompleteBuildingSilhouettes(malformed)
  assert.ok(errors.some((error) => error.includes('exactly one hostMassId or hostFeature')))
  assert.ok(errors.some((error) => error.includes('.hostMassId must reference an authored mass')))
  assert.ok(errors.some((error) => error.includes('.hostFeature must reference an authored physical feature')))
  assert.ok(errors.some((error) => error.includes('.physicsKind is unsupported')))
  assert.ok(errors.some((error) => error.includes('.blocksBirds must be boolean')))
})

test('binding selects the nearest matching mass and preserves host-local pose', () => {
  const anchor = {
    mechanism: 'test-ramp',
    xRatio: 0.75,
    yRatio: 0.5,
    scale: 1,
    hostMassId: 'ramp-host',
    hostFeature: null,
    physicsKind: 'body',
    blocksBirds: true,
  }
  const distant = block({ id: 'distant', x: 20, y: 20, massId: 'ramp-host' })
  const host = block({ id: 'host', x: 100, y: 150, massId: 'ramp-host' })
  const resolvedHost = resolveArchitectureMechanismHost({ anchor, blocks: [distant, host], frame: FRAME })
  assert.equal(resolvedHost.block, host)
  assert.equal(resolvedHost.identity, 'host')

  const binding = createArchitectureMechanismBinding({ anchor, blocks: [distant, host], frame: FRAME })
  assert.equal(binding.hostId, 'host')
  assert.equal(binding.localX, 50)
  assert.equal(binding.localY, 0)
  assert.equal(binding.collisionMode, 'parts')
  assert.equal(Object.isFrozen(binding), true)

  const liveHost = {
    ...host,
    x: 200,
    y: 300,
    rotation: 90,
    previousX: 180,
    previousY: 280,
    previousRotation: 0,
  }
  const pose = resolveArchitectureMechanismPose({ binding, blocks: [distant, liveHost] })
  assert.equal(pose.active, true)
  assert.ok(Math.abs(pose.x - 200) < 1e-9)
  assert.ok(Math.abs(pose.y - 350) < 1e-9)
  assert.ok(Math.abs(pose.previousX - 230) < 1e-9)
  assert.ok(Math.abs(pose.previousY - 280) < 1e-9)
  assert.equal(pose.rotation, 90)

  const removed = resolveArchitectureMechanismPose({ binding, blocks: [distant] })
  assert.equal(removed.active, false)
  assert.equal(removed.reason, 'host-removed')
  assert.deepEqual(buildArchitectureMechanismParts(binding, removed), [])
})

test('L4 and L16 rotors emit the same collidable hub-and-four-blade geometry used for drawing', () => {
  const scenarios = [
    {
      formId: 'tripod-windmill-watch',
      mechanism: 'wind-rotor',
      host: block({ id: 'l4-head', x: 100, y: 131, massId: 'mill-head' }),
    },
    {
      formId: 'wind-engine-gate',
      mechanism: 'giant-windwheel',
      host: block({ id: 'l16-axle', x: 34, y: 131, feature: 'giant-windwheel-anchor' }),
    },
  ]
  for (const scenario of scenarios) {
    const anchor = anchorFor(scenario.formId, scenario.mechanism)
    const binding = createArchitectureMechanismBinding({
      anchor,
      blocks: [scenario.host],
      frame: FRAME,
      id: scenario.formId,
    })
    const model = resolveArchitectureMechanismModel({
      binding,
      blocks: [scenario.host],
      spinDegrees: 30,
      previousSpinDegrees: 20,
    })
    assert.equal(model.active, true)
    assert.equal(model.parts.length, 5)
    assert.equal(model.parts.filter((part) => part.shape === 'circle').length, 1)
    assert.equal(model.parts.filter((part) => part.shape === 'rect').length, 4)
    assert.equal(model.collisionParts.length, 5)
    assert.ok(model.parts.every((part) => part.renderable && part.collidable && part.blocksBirds))
    assert.ok(model.parts.every((part) => [
      part.x, part.y, part.previousX, part.previousY, part.rotation, part.previousRotation,
    ].every(Number.isFinite)))
    assert.equal(Object.isFrozen(model.parts), true)
    assert.equal(Object.isFrozen(model.parts[0]), true)
  }
})

test('physical body mechanisms reuse their host collider while mass-hosted bodies own parts', () => {
  const portcullis = anchorFor('outer-castle-gate', 'portcullis')
  const physicalGate = block({ id: 'gate', x: 100, y: 172, feature: 'portcullis' })
  const gateBinding = createArchitectureMechanismBinding({
    anchor: portcullis,
    blocks: [physicalGate],
    frame: FRAME,
  })
  const gatePose = resolveArchitectureMechanismPose({ binding: gateBinding, blocks: [physicalGate] })
  const gateParts = buildArchitectureMechanismParts(gateBinding, gatePose)
  assert.equal(gateBinding.collisionMode, 'host')
  assert.equal(gateBinding.usesHostCollider, true)
  assert.ok(gateParts.length > 0)
  assert.ok(gateParts.every((part) => part.renderable && !part.collidable))
  assert.ok(gateParts.every((part) => part.collisionSource === 'host' && part.blocksBirds))
  assert.deepEqual(architectureMechanismCollisionParts(gateParts), [])

  const ramp = anchorFor('lean-to-loading-shed', 'loading-ramp')
  const rampHost = block({ id: 'deck', x: 50, y: 191, massId: 'loading-deck' })
  const rampBinding = createArchitectureMechanismBinding({
    anchor: ramp,
    blocks: [rampHost],
    frame: FRAME,
  })
  const rampPose = resolveArchitectureMechanismPose({ binding: rampBinding, blocks: [rampHost] })
  const rampParts = buildArchitectureMechanismParts(rampBinding, rampPose)
  assert.equal(rampBinding.collisionMode, 'parts')
  assert.ok(rampParts.length > 0)
  assert.equal(architectureMechanismCollisionParts(rampParts).length, rampParts.length)
})

test('batch binding keeps visual-only mechanisms renderable and non-colliding', () => {
  const anchors = COMPLETE_BUILDING_SILHOUETTES['tripod-windmill-watch'].mechanismAnchors
  const millHead = block({ id: 'mill-head', x: 100, y: 130, massId: 'mill-head' })
  const bindings = createArchitectureMechanismBindings({
    anchors,
    blocks: [millHead],
    frame: FRAME,
    idPrefix: 'l4',
  })
  assert.equal(bindings.length, 2)
  assert.equal(Object.isFrozen(bindings), true)
  const vaneBinding = bindings.find((binding) => binding.mechanism === 'weather-vane')
  const vaneModel = resolveArchitectureMechanismModel({ binding: vaneBinding, blocks: [millHead] })
  assert.equal(vaneModel.active, true)
  assert.ok(vaneModel.parts.length > 0)
  assert.ok(vaneModel.parts.every((part) => part.renderable && !part.collidable))
  assert.deepEqual(vaneModel.collisionParts, [])
})

test('unresolved hosts remain inactive rather than binding to an unrelated replacement', () => {
  const anchor = anchorFor('counterweight-lift-station', 'counterweight')
  const binding = createArchitectureMechanismBinding({ anchor, blocks: [], frame: FRAME })
  assert.equal(binding.activeAtBinding, false)
  assert.equal(binding.hostId, null)
  const unrelated = block({ id: 'unrelated', x: 182, y: 170, massId: 'other' })
  const pose = resolveArchitectureMechanismPose({ binding, blocks: [unrelated] })
  assert.equal(pose.active, false)
  assert.equal(pose.reason, 'host-not-found')
})

