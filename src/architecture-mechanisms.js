// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

/**
 * Pure runtime model for authored building mechanisms.
 *
 * The model deliberately knows nothing about Canvas, the game loop, or the
 * collision solver.  It binds an authored mechanism anchor to one physical
 * building body, follows that body's live pose, and emits a single geometry
 * description that render and collision adapters can consume together.
 */

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

export const ARCHITECTURE_MECHANISM_PHYSICS_KINDS = Object.freeze([
  'rotor',
  'body',
  'visual',
])

export const ARCHITECTURE_MECHANISM_COLLISION_MODES = Object.freeze([
  'parts',
  'host',
  'none',
])

const PHYSICS_KINDS = new Set(ARCHITECTURE_MECHANISM_PHYSICS_KINDS)

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function degreesToRadians(value) {
  return finiteNumber(value) * Math.PI / 180
}

function rotatePoint(x, y, degrees) {
  const radians = degreesToRadians(degrees)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  }
}

function nonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeFrame(frame) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
    throw new TypeError('architecture mechanism frame must be an object')
  }
  const left = Number(frame.left)
  const width = Number(frame.width)
  const height = Number(frame.height)
  const groundY = Number(frame.groundY)
  if (![left, width, height, groundY].every(Number.isFinite)
    || width <= 0 || height <= 0) {
    throw new RangeError('architecture mechanism frame must define finite positive width and height')
  }
  return { left, width, height, groundY }
}

function normalizeAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    throw new TypeError('architecture mechanism anchor must be an object')
  }
  const hostMassId = nonEmptyText(anchor.hostMassId) ? anchor.hostMassId : null
  const hostFeature = nonEmptyText(anchor.hostFeature) ? anchor.hostFeature : null
  if (Boolean(hostMassId) === Boolean(hostFeature)) {
    throw new RangeError('architecture mechanism anchor must define exactly one hostMassId or hostFeature')
  }
  if (!nonEmptyText(anchor.mechanism)) {
    throw new RangeError('architecture mechanism anchor requires mechanism')
  }
  if (!PHYSICS_KINDS.has(anchor.physicsKind)) {
    throw new RangeError(`unsupported architecture mechanism physicsKind: ${String(anchor.physicsKind)}`)
  }
  if (typeof anchor.blocksBirds !== 'boolean') {
    throw new TypeError('architecture mechanism anchor blocksBirds must be boolean')
  }
  const xRatio = Number(anchor.xRatio)
  const yRatio = Number(anchor.yRatio)
  const scale = Number(anchor.scale)
  if (![xRatio, yRatio, scale].every(Number.isFinite)
    || xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1 || scale <= 0) {
    throw new RangeError('architecture mechanism anchor has invalid normalized geometry')
  }
  return {
    mechanism: anchor.mechanism,
    xRatio,
    yRatio,
    scale,
    hostMassId,
    hostFeature,
    physicsKind: anchor.physicsKind,
    blocksBirds: anchor.blocksBirds,
  }
}

function initialBlockPose(block) {
  return {
    x: finiteNumber(block?.initialX, finiteNumber(block?.x)),
    y: finiteNumber(block?.initialY, finiteNumber(block?.y)),
    rotation: finiteNumber(block?.initialRotation, finiteNumber(block?.rotation)),
  }
}

function currentBlockPose(block) {
  const x = finiteNumber(block?.x, finiteNumber(block?.initialX))
  const y = finiteNumber(block?.y, finiteNumber(block?.initialY))
  const rotation = finiteNumber(block?.rotation, finiteNumber(block?.initialRotation))
  return {
    x,
    y,
    rotation,
    previousX: finiteNumber(block?.previousX, x),
    previousY: finiteNumber(block?.previousY, y),
    previousRotation: finiteNumber(block?.previousRotation, rotation),
  }
}

function blockIdentity(block) {
  for (const key of ['id', 'physicalModuleId', 'moduleId']) {
    const value = block?.[key]
    if ((typeof value === 'string' && value.length > 0) || Number.isFinite(value)) {
      return { key, value }
    }
  }
  return null
}

function anchorPosition(anchor, frame) {
  return {
    x: frame.left + frame.width * anchor.xRatio,
    y: frame.groundY - frame.height * anchor.yRatio,
  }
}

function hostMatchesAnchor(block, anchor) {
  if (anchor.hostMassId) return block?.completeBuildingMassId === anchor.hostMassId
  return block?.physicalFeature === anchor.hostFeature
}

/**
 * Resolve the closest authored host at binding time.  Multiple bodies may
 * share one mass id, so proximity to the authored anchor is the deterministic
 * tie-breaker.  Live updates never run this search again: they resolve the
 * stored body identity, preventing a destroyed mechanism from jumping to a
 * surviving sibling body.
 */
export function resolveArchitectureMechanismHost({ anchor, blocks, frame }) {
  const normalizedAnchor = normalizeAnchor(anchor)
  const normalizedFrame = normalizeFrame(frame)
  if (!Array.isArray(blocks)) throw new TypeError('architecture mechanism blocks must be an array')
  const authoredPosition = anchorPosition(normalizedAnchor, normalizedFrame)
  const candidates = blocks
    .map((block, index) => ({ block, index, identity: blockIdentity(block) }))
    .filter(({ block, identity }) => identity && hostMatchesAnchor(block, normalizedAnchor))
    .map((candidate) => {
      const pose = initialBlockPose(candidate.block)
      return {
        ...candidate,
        pose,
        distanceSquared: (pose.x - authoredPosition.x) ** 2 + (pose.y - authoredPosition.y) ** 2,
      }
    })
    .sort((first, second) => first.distanceSquared - second.distanceSquared
      || first.index - second.index)
  const match = candidates[0]
  if (!match) return null
  // Shallow-freeze the resolver record only. The referenced live block belongs
  // to the physics runtime and must never be frozen or mutated by this module.
  return Object.freeze({
    block: match.block,
    identityKey: match.identity.key,
    identity: match.identity.value,
    initialPose: match.pose,
    distanceSquared: match.distanceSquared,
  })
}

export function architectureMechanismCollisionMode(anchor) {
  const normalizedAnchor = normalizeAnchor(anchor)
  if (!normalizedAnchor.blocksBirds || normalizedAnchor.physicsKind === 'visual') return 'none'
  // A body selected by feature is already a real physics body.  Reusing that
  // collider prevents an invisible duplicate from amplifying impacts.
  if (normalizedAnchor.physicsKind === 'body' && normalizedAnchor.hostFeature) return 'host'
  // Rotors always need the authored hub/blade composite.  In L16 the selected
  // physical feature is only the axle, not a substitute for the sails.
  return 'parts'
}

export function createArchitectureMechanismBinding({
  anchor,
  blocks,
  frame,
  id = null,
  index = 0,
}) {
  const normalizedAnchor = normalizeAnchor(anchor)
  const normalizedFrame = normalizeFrame(frame)
  if (!Array.isArray(blocks)) throw new TypeError('architecture mechanism blocks must be an array')
  const authoredPosition = anchorPosition(normalizedAnchor, normalizedFrame)
  const host = resolveArchitectureMechanismHost({
    anchor: normalizedAnchor,
    blocks,
    frame: normalizedFrame,
  })
  const mechanismId = nonEmptyText(id)
    ? id
    : `architecture-mechanism:${index}:${normalizedAnchor.mechanism}`
  const collisionMode = architectureMechanismCollisionMode(normalizedAnchor)
  if (!host) {
    return deepFreeze({
      id: mechanismId,
      ...normalizedAnchor,
      collisionMode,
      usesHostCollider: collisionMode === 'host',
      activeAtBinding: false,
      hostIdentityKey: null,
      hostId: null,
      localX: 0,
      localY: 0,
      authoredX: authoredPosition.x,
      authoredY: authoredPosition.y,
      hostInitialPose: null,
    })
  }
  const differenceX = authoredPosition.x - host.initialPose.x
  const differenceY = authoredPosition.y - host.initialPose.y
  const localOffset = rotatePoint(differenceX, differenceY, -host.initialPose.rotation)
  return deepFreeze({
    id: mechanismId,
    ...normalizedAnchor,
    collisionMode,
    usesHostCollider: collisionMode === 'host',
    activeAtBinding: true,
    hostIdentityKey: host.identityKey,
    hostId: host.identity,
    localX: localOffset.x,
    localY: localOffset.y,
    authoredX: authoredPosition.x,
    authoredY: authoredPosition.y,
    hostInitialPose: host.initialPose,
  })
}

export function createArchitectureMechanismBindings({
  anchors,
  blocks,
  frame,
  idPrefix = 'architecture-mechanism',
}) {
  if (!Array.isArray(anchors)) throw new TypeError('architecture mechanism anchors must be an array')
  return deepFreeze(anchors.map((anchor, index) => createArchitectureMechanismBinding({
    anchor,
    blocks,
    frame,
    id: `${idPrefix}:${index}:${anchor?.mechanism || 'unknown'}`,
    index,
  })))
}

function findBoundHost(binding, blocks) {
  if (!binding?.hostIdentityKey || binding.hostId == null) return null
  return blocks.find((block) => block?.[binding.hostIdentityKey] === binding.hostId) || null
}

export function resolveArchitectureMechanismPose({
  binding,
  blocks,
  spinDegrees = 0,
  previousSpinDegrees = spinDegrees,
}) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    throw new TypeError('architecture mechanism binding must be an object')
  }
  if (!Array.isArray(blocks)) throw new TypeError('architecture mechanism blocks must be an array')
  const host = findBoundHost(binding, blocks)
  if (!host) {
    return deepFreeze({
      id: binding.id,
      mechanism: binding.mechanism,
      active: false,
      reason: binding.activeAtBinding ? 'host-removed' : 'host-not-found',
      x: binding.authoredX,
      y: binding.authoredY,
      rotation: 0,
      previousX: binding.authoredX,
      previousY: binding.authoredY,
      previousRotation: 0,
      scale: binding.scale,
      physicsKind: binding.physicsKind,
      blocksBirds: binding.blocksBirds,
      collisionMode: binding.collisionMode,
      usesHostCollider: binding.usesHostCollider,
    })
  }
  const hostPose = currentBlockPose(host)
  const currentOffset = rotatePoint(binding.localX, binding.localY, hostPose.rotation)
  const previousOffset = rotatePoint(binding.localX, binding.localY, hostPose.previousRotation)
  const appliedSpin = binding.physicsKind === 'rotor' ? finiteNumber(spinDegrees) : 0
  const appliedPreviousSpin = binding.physicsKind === 'rotor'
    ? finiteNumber(previousSpinDegrees, appliedSpin)
    : 0
  return deepFreeze({
    id: binding.id,
    mechanism: binding.mechanism,
    active: true,
    reason: null,
    x: hostPose.x + currentOffset.x,
    y: hostPose.y + currentOffset.y,
    rotation: hostPose.rotation + appliedSpin,
    previousX: hostPose.previousX + previousOffset.x,
    previousY: hostPose.previousY + previousOffset.y,
    previousRotation: hostPose.previousRotation + appliedPreviousSpin,
    scale: binding.scale,
    physicsKind: binding.physicsKind,
    blocksBirds: binding.blocksBirds,
    collisionMode: binding.collisionMode,
    usesHostCollider: binding.usesHostCollider,
  })
}

function partCollisionMetadata(binding) {
  const collidable = binding.collisionMode === 'parts'
  return {
    renderable: true,
    collidable,
    blocksBirds: binding.blocksBirds,
    collisionSource: collidable
      ? 'mechanism'
      : binding.collisionMode === 'host' ? 'host' : 'none',
  }
}

function makePart(binding, pose, descriptor, index) {
  const currentOffset = rotatePoint(
    finiteNumber(descriptor.localX),
    finiteNumber(descriptor.localY),
    pose.rotation,
  )
  const previousOffset = rotatePoint(
    finiteNumber(descriptor.localX),
    finiteNumber(descriptor.localY),
    pose.previousRotation,
  )
  const shape = descriptor.shape || 'rect'
  return {
    id: `${binding.id}:part:${index}:${descriptor.role}`,
    mechanismId: binding.id,
    mechanism: binding.mechanism,
    role: descriptor.role,
    shape,
    x: pose.x + currentOffset.x,
    y: pose.y + currentOffset.y,
    previousX: pose.previousX + previousOffset.x,
    previousY: pose.previousY + previousOffset.y,
    rotation: pose.rotation + finiteNumber(descriptor.localRotation),
    previousRotation: pose.previousRotation + finiteNumber(descriptor.localRotation),
    ...(shape === 'circle'
      ? { radius: descriptor.radius }
      : { width: descriptor.width, height: descriptor.height }),
    ...partCollisionMetadata(binding),
  }
}

function rotorPartDescriptors(scale) {
  const radius = 38 * scale
  const hubRadius = 7 * scale
  const innerRadius = 8 * scale
  const bladeLength = radius - innerRadius
  const bladeCenter = innerRadius + bladeLength / 2
  const bladeThickness = Math.max(7, radius * 0.22)
  const descriptors = [{
    role: 'hub', shape: 'circle', localX: 0, localY: 0, radius: hubRadius,
  }]
  for (let blade = 0; blade < 4; blade += 1) {
    const degrees = blade * 90
    const center = rotatePoint(bladeCenter, 0, degrees)
    descriptors.push({
      role: `blade-${blade + 1}`,
      shape: 'rect',
      localX: center.x,
      localY: center.y,
      localRotation: degrees,
      width: bladeLength,
      height: bladeThickness,
    })
  }
  return descriptors
}

function bodyPartDescriptors(mechanism, scale, physicsKind) {
  if (/portcullis|granary-gate|frost-lock|keystone/u.test(mechanism)) {
    return [{ role: 'gate-body', shape: 'rect', localX: 0, localY: 0, width: 58 * scale, height: 84 * scale }]
  }
  if (/roadway|ramp|drawbridge|chute|gallery/u.test(mechanism)) {
    return [{ role: 'span-body', shape: 'rect', localX: 0, localY: 0, width: 96 * scale, height: 14 * scale }]
  }
  if (/counterweight/u.test(mechanism)) {
    return [
      { role: 'counterweight-cable', shape: 'rect', localX: 0, localY: -20 * scale, width: 3 * scale, height: 40 * scale },
      { role: 'counterweight-body', shape: 'rect', localX: 0, localY: 10 * scale, width: 28 * scale, height: 30 * scale },
    ]
  }
  if (/hoist|lift|crane|pulley/u.test(mechanism)) {
    return [
      { role: 'pulley-wheel', shape: 'circle', localX: 0, localY: 0, radius: 10 * scale },
      { role: 'hoist-line', shape: 'rect', localX: 0, localY: 25 * scale, width: 3 * scale, height: 40 * scale },
      { role: 'hoist-load', shape: 'rect', localX: 0, localY: 49 * scale, width: 24 * scale, height: 17 * scale },
    ]
  }
  if (/cable|belt/u.test(mechanism)) {
    return [{ role: 'drive-line', shape: 'rect', localX: 0, localY: 0, width: 72 * scale, height: 4 * scale }]
  }
  if (/beacon/u.test(mechanism)) {
    return [
      { role: 'beacon-bowl', shape: 'rect', localX: 0, localY: 8 * scale, width: 30 * scale, height: 10 * scale },
      { role: 'beacon-flame', shape: 'circle', localX: 0, localY: -5 * scale, radius: 13 * scale },
    ]
  }
  if (/vane/u.test(mechanism)) {
    return [
      { role: 'vane-mast', shape: 'rect', localX: 0, localY: 6 * scale, width: 3 * scale, height: 34 * scale },
      { role: 'vane-flag', shape: 'rect', localX: 13 * scale, localY: -7 * scale, width: 26 * scale, height: 10 * scale },
    ]
  }
  return [{
    role: physicsKind === 'visual' ? 'visual-body' : 'mechanism-body',
    shape: 'circle',
    localX: 0,
    localY: 0,
    radius: 12 * scale,
  }]
}

/**
 * Produce the canonical mechanism geometry.  Render adapters draw every part;
 * collision adapters consume only parts whose `collidable` flag is true.
 * A body backed by an existing physical feature remains renderable but marks
 * its `collisionSource` as `host`, so no duplicate collider is constructed.
 */
export function buildArchitectureMechanismParts(binding, pose) {
  if (!binding || !pose || pose.active !== true) return Object.freeze([])
  const descriptors = binding.physicsKind === 'rotor'
    ? rotorPartDescriptors(binding.scale)
    : bodyPartDescriptors(binding.mechanism, binding.scale, binding.physicsKind)
  return deepFreeze(descriptors.map((descriptor, index) => (
    makePart(binding, pose, descriptor, index)
  )))
}

export function architectureMechanismCollisionParts(parts) {
  if (!Array.isArray(parts)) throw new TypeError('architecture mechanism parts must be an array')
  return deepFreeze(parts.filter((part) => part?.collidable === true))
}

export function resolveArchitectureMechanismModel({
  binding,
  blocks,
  spinDegrees = 0,
  previousSpinDegrees = spinDegrees,
}) {
  const pose = resolveArchitectureMechanismPose({
    binding,
    blocks,
    spinDegrees,
    previousSpinDegrees,
  })
  const parts = buildArchitectureMechanismParts(binding, pose)
  return Object.freeze({
    active: pose.active,
    binding,
    pose,
    parts,
    collisionParts: architectureMechanismCollisionParts(parts),
  })
}
