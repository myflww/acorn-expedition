// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

/** Pure state and geometry rules for flying, destructible transport platforms. */

export const DESTRUCTIBLE_PLATFORM_DEFAULTS = Object.freeze({
  boardHp: 3,
  carrierHp: 2,
  carrierKind: 'rotor-pod',
  carrierWidth: 28,
  carrierHeight: 24,
  carrierGap: 6,
  carrierOffsetRatio: 0.3,
})

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback
const nonNegative = (value, fallback) => Math.max(0, finite(value, fallback))
const positive = (value, fallback) => {
  const number = finite(value, fallback)
  return number > 0 ? number : fallback
}
const freezePair = (value) => Object.freeze([value[0], value[1]])

function hpPair(value, fallback) {
  if (Array.isArray(value) && value.length === 2) {
    return [nonNegative(value[0], fallback[0]), nonNegative(value[1], fallback[1])]
  }
  const shared = nonNegative(value, Number.NaN)
  return Number.isFinite(shared) ? [shared, shared] : [...fallback]
}

/**
 * Adds the damage state consumed by the runtime without mutating the authored
 * platform. Three board HP makes a normal one-damage acorn need three clean
 * hits, while explosive/high-damage impacts can open it in one or two.
 */
export function initializeDestructiblePlatform(platform, options = {}) {
  if (!isRecord(platform) || !isRecord(options)) {
    throw new TypeError('platform and options must be objects')
  }

  const boardMaxHp = positive(
    platform.boardMaxHp,
    positive(options.boardHp, positive(platform.boardHp, DESTRUCTIBLE_PLATFORM_DEFAULTS.boardHp)),
  )
  const boardHp = Math.min(boardMaxHp, nonNegative(platform.boardHp, boardMaxHp))
  const authoredCarrierMax = platform.carrierMaxHp ?? options.carrierHp
  const carrierMaxHp = hpPair(authoredCarrierMax, [
    DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierHp,
    DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierHp,
  ]).map((hp) => positive(hp, DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierHp))
  const carrierHp = hpPair(platform.carrierHp, carrierMaxHp)
    .map((hp, index) => Math.min(carrierMaxHp[index], hp))
  const destroyed = Boolean(platform.destroyed) || boardHp <= 0
  const derailed = Boolean(platform.derailed) || carrierHp.some((hp) => hp <= 0)
  const powered = !derailed && platform.powered !== false

  return Object.freeze({
    ...platform,
    boardHp,
    boardMaxHp,
    carrierHp: freezePair(carrierHp),
    carrierMaxHp: freezePair(carrierMaxHp),
    carrierKind: typeof platform.carrierKind === 'string' && platform.carrierKind
      ? platform.carrierKind
      : typeof options.carrierKind === 'string' && options.carrierKind
        ? options.carrierKind
        : DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierKind,
    destroyed,
    derailed,
    powered,
    blocksBirds: destroyed ? false : platform.blocksBirds !== false,
  })
}

function pose(platform, previous = false) {
  const prefix = previous ? 'previous' : ''
  const x = finite(previous ? platform.previousX : platform.x, finite(platform.x, 0))
  const y = finite(previous ? platform.previousY : platform.y, finite(platform.y, 0))
  const rotation = finite(
    previous ? platform.previousRotation : platform.rotation,
    finite(platform.rotation, 0),
  )
  if (![x, y, rotation].every(Number.isFinite)) {
    throw new TypeError(`${prefix || 'current'} platform pose must be finite`)
  }
  return { x, y, rotation }
}

function transformedCarrierPose(hostPose, localX, localY) {
  const radians = hostPose.rotation * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    x: hostPose.x + localX * cosine - localY * sine,
    y: hostPose.y + localX * sine + localY * cosine,
    rotation: hostPose.rotation,
  }
}

/**
 * Returns both carrier colliders in world coordinates. Each collider includes
 * a frozen `previous` rectangle so the swept collision solver can account for
 * translation and host rotation during the tick.
 */
export function destructiblePlatformCarrierHitboxes(platform, options = {}) {
  const state = initializeDestructiblePlatform(platform, options)
  const width = positive(state.width, 96)
  const height = positive(state.height, 16)
  const carrierWidth = positive(state.carrierWidth ?? options.carrierWidth, DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierWidth)
  const carrierHeight = positive(state.carrierHeight ?? options.carrierHeight, DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierHeight)
  const carrierGap = nonNegative(state.carrierGap ?? options.carrierGap, DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierGap)
  const ratio = Math.min(0.45, Math.max(0.12, finite(
    state.carrierOffsetRatio ?? options.carrierOffsetRatio,
    DESTRUCTIBLE_PLATFORM_DEFAULTS.carrierOffsetRatio,
  )))
  const maximumOffset = Math.max(0, width / 2 - carrierWidth / 2 - 2)
  const offsetX = Math.min(width * ratio, maximumOffset)
  const offsetY = -(height / 2 + carrierHeight / 2 + carrierGap)
  const currentHostPose = pose(state)
  const previousHostPose = pose(state, true)

  return Object.freeze([-1, 1].map((side, carrierIndex) => {
    const current = transformedCarrierPose(currentHostPose, side * offsetX, offsetY)
    const previous = transformedCarrierPose(previousHostPose, side * offsetX, offsetY)
    const active = state.carrierHp[carrierIndex] > 0
    return Object.freeze({
      carrierIndex,
      carrierKind: state.carrierKind,
      specialVisualKind: state.specialVisualKind,
      x: current.x,
      y: current.y,
      width: carrierWidth,
      height: carrierHeight,
      rotation: current.rotation,
      previousX: previous.x,
      previousY: previous.y,
      previousRotation: previous.rotation,
      previous: Object.freeze({
        x: previous.x,
        y: previous.y,
        width: carrierWidth,
        height: carrierHeight,
        rotation: previous.rotation,
      }),
      active,
      blocksBirds: active,
    })
  }))
}

function stoppedMotion(platform, derailed) {
  if (!derailed) return platform
  return {
    ...platform,
    velocityX: 0,
    velocityY: 0,
    vx: 0,
    vy: 0,
  }
}

/**
 * Applies one direct impact to the board or an explicitly selected carrier.
 * The frozen result carries both the next platform state and a small outcome
 * record that presentation/audio layers may consume exactly once.
 */
export function applyDestructiblePlatformImpact(platform, impact = {}) {
  if (!isRecord(impact)) throw new TypeError('impact must be an object')
  const state = initializeDestructiblePlatform(platform)
  const targetKind = impact.targetKind ?? impact.target
  if (targetKind !== 'board' && targetKind !== 'carrier') {
    throw new RangeError('impact target must be board or carrier')
  }
  const requestedDamage = nonNegative(impact.damage, 0)
  const carrierIndex = targetKind === 'carrier' ? impact.carrierIndex : null
  if (targetKind === 'carrier' && (!Number.isInteger(carrierIndex) || carrierIndex < 0 || carrierIndex > 1)) {
    throw new RangeError('carrier index must be 0 or 1')
  }

  let boardHp = state.boardHp
  const carrierHp = [...state.carrierHp]
  const availableHp = targetKind === 'board' ? boardHp : carrierHp[carrierIndex]
  const appliedDamage = Math.min(availableHp, requestedDamage)
  if (targetKind === 'board') boardHp = Math.max(0, boardHp - appliedDamage)
  else carrierHp[carrierIndex] = Math.max(0, carrierHp[carrierIndex] - appliedDamage)

  const boardDestroyed = state.boardHp > 0 && boardHp <= 0
  const carrierDestroyed = targetKind === 'carrier'
    && state.carrierHp[carrierIndex] > 0 && carrierHp[carrierIndex] <= 0
  const destroyed = state.destroyed || boardHp <= 0
  const derailed = state.derailed || carrierHp.some((hp) => hp <= 0)
  const newlyDerailed = !state.derailed && derailed
  const powered = !derailed && state.powered
  const nextState = stoppedMotion({
    ...state,
    boardHp,
    carrierHp: freezePair(carrierHp),
    destroyed,
    derailed,
    powered,
    blocksBirds: destroyed ? false : state.blocksBirds,
  }, derailed)
  const nextPlatform = Object.freeze(nextState)
  const outcome = Object.freeze({
    consumed: appliedDamage > 0,
    targetKind,
    carrierIndex,
    requestedDamage,
    appliedDamage,
    boardDestroyed,
    carrierDestroyed,
    newlyDerailed,
    specialVisualKind: state.specialVisualKind,
  })

  return Object.freeze({ platform: nextPlatform, outcome })
}
