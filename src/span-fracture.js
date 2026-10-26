// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const nested of Object.values(value)) deepFreeze(nested)
  return Object.freeze(value)
}

export const FRACTURABLE_SPAN_ROLES = Object.freeze([
  'long-beam',
  'bridge-span',
  'building-carrier',
  'building-span',
])

export const FRACTURABLE_SPAN_MODULE_KINDS = Object.freeze([
  'long-beam',
  'asymmetric-bridge',
  'authored-building-span',
  'complete-building-connection',
])

/**
 * Momentum uses the same approximate scale as collision.closingMomentum in
 * game-core. A special acorn lowers the speed needed to reach the material
 * threshold, but still needs a real impact; merely resting against a beam can
 * never split it.
 */
export const SPAN_FRACTURE_RULES = deepFreeze({
  minimumEligibleLength: 120,
  minimumAspectRatio: 2.4,
  minimumSegmentLength: 48,
  minimumRawClosingMomentum: 6,
  materials: {
    wood: { closingMomentumThreshold: 14 },
    stone: { closingMomentumThreshold: 22 },
  },
  impactMultipliers: {
    ordinary: 1,
    red: 1,
    fire: 1.15,
    dash: 1.3,
    quake: 1.45,
    bomb: 1.55,
    drill: 1.65,
    'talent-emberheart': 1.5,
    'talent-prism-bell': 1.35,
    'talent-thunder-root': 1.65,
  },
  futureContractMultiplier: 1.5,
})

const spanIdentity = (block) => block?.id ?? block?.physicalModuleId ?? block?.moduleId ?? null

const impactTypeOf = (options, impact) => String(
  options?.impactType
    ?? options?.projectileType
    ?? impact?.impactType
    ?? impact?.projectileType
    ?? impact?.type
    ?? 'ordinary',
)

const impactMultiplierFor = (impactType) => {
  const authored = SPAN_FRACTURE_RULES.impactMultipliers[impactType]
  if (Number.isFinite(authored)) return authored
  return impactType.startsWith('talent-')
    ? SPAN_FRACTURE_RULES.futureContractMultiplier
    : SPAN_FRACTURE_RULES.impactMultipliers.ordinary
}

const isNamedSpan = (block) => block?.spanFracturable === true
  || FRACTURABLE_SPAN_ROLES.includes(block?.role)
  || FRACTURABLE_SPAN_MODULE_KINDS.includes(block?.moduleKind)

/**
 * Returns an immutable explanation of whether an impact may split a span.
 * This function never mutates the block or impact and is safe to call before
 * damage settlement.
 */
export function evaluateSpanFracture(options = {}) {
  const block = options?.block
  const impact = options?.impact ?? options
  const materialRule = SPAN_FRACTURE_RULES.materials[block?.type]
  const width = Number(block?.width)
  const height = Number(block?.height)
  const x = Number(block?.x)
  const y = Number(block?.y)
  const rotation = Number(block?.rotation ?? 0)
  const hp = Number(block?.hp)
  const maxHp = Number(block?.maxHp ?? block?.hp)
  const mass = Number(block?.mass)
  const closingMomentum = Number(options?.closingMomentum ?? impact?.closingMomentum)
  const impactType = impactTypeOf(options, impact)
  const impactMultiplier = impactMultiplierFor(impactType)
  const effectiveClosingMomentum = Number.isFinite(closingMomentum)
    ? Math.max(0, closingMomentum) * impactMultiplier
    : 0
  const threshold = materialRule?.closingMomentumThreshold ?? null

  let reason = 'eligible'
  if (!block || typeof block !== 'object') reason = 'missing-block'
  else if (spanIdentity(block) === null) reason = 'missing-identity'
  else if (!materialRule) reason = 'unsupported-material'
  else if (block.spanFractured === true || block.fractureParentId != null) reason = 'already-fractured'
  else if (!isNamedSpan(block)) reason = 'not-a-span'
  else if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotation)) {
    reason = 'invalid-pose'
  }
  else if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    reason = 'invalid-geometry'
  } else if (width < SPAN_FRACTURE_RULES.minimumEligibleLength
    || width / height < SPAN_FRACTURE_RULES.minimumAspectRatio
    || width < SPAN_FRACTURE_RULES.minimumSegmentLength * 2) {
    reason = 'span-too-short'
  } else if (!Number.isFinite(hp) || hp <= 0
    || !Number.isFinite(maxHp) || maxHp <= 0
    || !Number.isFinite(mass) || mass <= 0) {
    reason = 'invalid-physical-state'
  } else if (!Number.isFinite(closingMomentum)
    || closingMomentum < SPAN_FRACTURE_RULES.minimumRawClosingMomentum) {
    reason = 'impact-too-soft'
  } else if (effectiveClosingMomentum < threshold) reason = 'below-material-threshold'

  return Object.freeze({
    eligible: reason === 'eligible',
    reason,
    material: block?.type ?? null,
    impactType,
    impactMultiplier,
    closingMomentum: Number.isFinite(closingMomentum) ? Math.max(0, closingMomentum) : 0,
    effectiveClosingMomentum,
    threshold,
  })
}

const rotatedOffset = (localX, rotationDegrees) => {
  const radians = rotationDegrees * Math.PI / 180
  return {
    x: localX * Math.cos(radians),
    y: localX * Math.sin(radians),
  }
}

const localImpactX = (block, contactX, contactY) => {
  const radians = finiteNumber(block.rotation) * Math.PI / 180
  const dx = contactX - finiteNumber(block.x)
  const dy = contactY - finiteNumber(block.y)
  return dx * Math.cos(radians) + dy * Math.sin(radians)
}

const adjacentFloat = (value, direction) => {
  if (!Number.isFinite(value) || Number.isNaN(Number(direction)) || value === direction) return value
  if (value === 0) return direction > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value, false)
  let bits = view.getBigUint64(0, false)
  const towardGreaterValue = direction > value
  bits += towardGreaterValue === (value > 0) ? 1n : -1n
  view.setBigUint64(0, bits, false)
  return view.getFloat64(0, false)
}

// `total - first` is mathematically exact but its rounded result can still
// make `first + second` miss a decimal total by one ULP. Search the immediate
// representable neighbours so runtime invariants may use strict equality.
const conservedPair = (total, desiredFirst) => {
  const firstCandidates = [desiredFirst]
  let lower = desiredFirst
  let upper = desiredFirst
  for (let index = 0; index < 4; index += 1) {
    lower = adjacentFloat(lower, Number.NEGATIVE_INFINITY)
    upper = adjacentFloat(upper, Number.POSITIVE_INFINITY)
    firstCandidates.push(lower, upper)
  }
  for (const first of firstCandidates) {
    if (first < 0 || first > total) continue
    let second = total - first
    for (let index = 0; index < 9; index += 1) {
      const sum = first + second
      if (sum === total) return [first, second]
      second = adjacentFloat(
        second,
        sum < total ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY,
      )
    }
  }
  // Every finite non-negative pair used by the game reaches the exact branch;
  // this defensive fallback retains the closest proportional representation.
  return [desiredFirst, total - desiredFirst]
}

const dividedQuantity = (total, firstRatio) => conservedPair(total, total * firstRatio)

const poseFieldsFor = (block, localCenterX) => {
  const fields = {}
  for (const prefix of ['previous', 'initial']) {
    const xKey = `${prefix}X`
    const yKey = `${prefix}Y`
    const rotationKey = `${prefix}Rotation`
    if (!Number.isFinite(Number(block[xKey])) || !Number.isFinite(Number(block[yKey]))) continue
    const rotation = finiteNumber(block[rotationKey], finiteNumber(block.rotation))
    const offset = rotatedOffset(localCenterX, rotation)
    fields[xKey] = Number(block[xKey]) + offset.x
    fields[yKey] = Number(block[yKey]) + offset.y
    if (Object.hasOwn(block, rotationKey)) fields[rotationKey] = rotation
  }
  return fields
}

const fragmentVelocity = (block, offset) => {
  if (!Number.isFinite(Number(block.vx)) || !Number.isFinite(Number(block.vy))) return {}
  const angularVelocity = finiteNumber(block.vr) * Math.PI / 180
  return {
    vx: Number(block.vx) - angularVelocity * offset.y,
    vy: Number(block.vy) + angularVelocity * offset.x,
  }
}

const normalizedFragmentIds = (parentId, value) => {
  const left = value?.left ?? `${String(parentId)}:fracture:left`
  const right = value?.right ?? `${String(parentId)}:fracture:right`
  if ((typeof left !== 'string' && typeof left !== 'number')
    || (typeof right !== 'string' && typeof right !== 'number')
    || String(left).length === 0 || String(right).length === 0 || left === right) return null
  return { left, right }
}

/**
 * Plans a two-piece fracture without mutating runtime state.
 *
 * Input may provide collision data under `impact` (the shape returned by
 * resolveCircleRectCollision) or directly as contactX/contactY and
 * closingMomentum. The returned fragments retain all source metadata while
 * overriding only identity, pose, dimensions, conserved physical quantities,
 * and fracture markers.
 */
export function planSpanFracture(options = {}) {
  const block = options?.block
  const impact = options?.impact ?? options
  const eligibility = evaluateSpanFracture(options)
  if (!eligibility.eligible) return null

  const contactX = Number(options.contactX ?? impact?.contactX)
  const contactY = Number(options.contactY ?? impact?.contactY)
  if (!Number.isFinite(contactX) || !Number.isFinite(contactY)) return null

  const parentId = spanIdentity(block)
  const fragmentIds = normalizedFragmentIds(parentId, options.fragmentIds)
  if (!fragmentIds) return null

  const halfWidth = block.width / 2
  const minimum = SPAN_FRACTURE_RULES.minimumSegmentLength
  const requestedLocalX = localImpactX(block, contactX, contactY)
  const splitLocalX = Math.max(-halfWidth + minimum, Math.min(halfWidth - minimum, requestedLocalX))
  const [leftWidth, rightWidth] = conservedPair(
    Number(block.width),
    halfWidth + splitLocalX,
  )
  const leftRatio = leftWidth / block.width
  const [leftHp, rightHp] = dividedQuantity(Number(block.hp), leftRatio)
  const [leftMaxHp, rightMaxHp] = dividedQuantity(Number(block.maxHp ?? block.hp), leftRatio)
  const [leftMass, rightMass] = dividedQuantity(Number(block.mass), leftRatio)
  const leftLocalCenterX = -halfWidth + leftWidth / 2
  const rightLocalCenterX = splitLocalX + rightWidth / 2
  const rotation = finiteNumber(block.rotation)

  const makeFragment = ({ side, id, width, localCenterX, hp, maxHp, mass }) => {
    const offset = rotatedOffset(localCenterX, rotation)
    return Object.freeze({
      ...block,
      ...poseFieldsFor(block, localCenterX),
      ...fragmentVelocity(block, offset),
      id,
      x: Number(block.x) + offset.x,
      y: Number(block.y) + offset.y,
      rotation,
      width,
      height: Number(block.height),
      hp,
      maxHp,
      mass,
      fractureParentId: parentId,
      fractureSide: side,
      spanFractured: true,
    })
  }

  const left = makeFragment({
    side: 'left', id: fragmentIds.left, width: leftWidth,
    localCenterX: leftLocalCenterX, hp: leftHp, maxHp: leftMaxHp, mass: leftMass,
  })
  const right = makeFragment({
    side: 'right', id: fragmentIds.right, width: rightWidth,
    localCenterX: rightLocalCenterX, hp: rightHp, maxHp: rightMaxHp, mass: rightMass,
  })

  return Object.freeze({
    fractured: true,
    parentId,
    eligibility,
    requestedLocalX,
    splitLocalX,
    minimumSegmentLength: minimum,
    fragments: Object.freeze([left, right]),
  })
}
