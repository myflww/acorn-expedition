// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  ACORN_HITBOX_BONUS,
  BLOCK_MATERIALS,
  FORTRESS_START_X,
  FRICTION,
  GRAVITY,
  GROUND_Y,
  MAX_PULL,
  POWER,
  Rng,
  SLING_X,
  SLING_Y,
  TOWER_SPACING,
  circleIntersectsRect,
  generateLevel,
  mixSeed,
  rectsOverlap,
} from './game-core.js'
import {
  getSpecialCampaign,
  getSpecialStage,
  specialStageSeed,
} from './special-campaigns.js'
import { SPECIAL_ACORN_BY_TYPE, SPECIAL_SQUIRREL_BY_TYPE } from './special-roster.js'
import { terrainProfileForSpecial } from './terrain-rules.js'
import { buildSpecialArchitectureTemplate } from './special-architecture-templates.js'

const BASE_BIRD_FLIGHT = Object.freeze({
  red: { radius: 15, launchSpeed: 1, gravityScale: 1, windMultiplier: 1, interactionBonus: 0, directDamageBonus: 0 },
  bomb: { radius: 17, launchSpeed: 1, gravityScale: 1, windMultiplier: 1, interactionBonus: 130, directDamageBonus: 130 },
  split: { radius: 15, launchSpeed: 1, gravityScale: 1, windMultiplier: 1, interactionBonus: 0, directDamageBonus: 0 },
  dash: { radius: 15, launchSpeed: 1, gravityScale: 1, windMultiplier: 1, activeSpeedMultiplier: 1.8, interactionBonus: 0, directDamageBonus: 0 },
})

const FLIGHT_REACH_CACHE = new Map()
const PLATFORM_PLAYFIELD = Object.freeze({ left: 360, right: 1400, top: 68, bottom: GROUND_Y - 4 })

function deepClone(value) {
  return structuredClone(value)
}

function modifierValue(stage, kind, fallback = null) {
  return stage.layoutModifiers.find((entry) => entry.kind === kind)?.value ?? fallback
}

function colorNumber(value) {
  return Number.parseInt(value.slice(1), 16)
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function birdFlightProfile(type) {
  const roster = SPECIAL_ACORN_BY_TYPE[type]
  if (!roster) return BASE_BIRD_FLIGHT[type] || BASE_BIRD_FLIGHT.red
  const interactionBonus = type === 'frost' ? roster.ability.radius
    : type === 'vine' ? roster.ability.range
      : type === 'quake' ? roster.ability.shockRadius
        : 0
  const directDamageBonus = type === 'quake' ? roster.ability.shockRadius : 0
  return {
    radius: roster.stats.radius,
    launchSpeed: roster.stats.launchSpeed,
    gravityScale: roster.stats.gravityScale,
    windMultiplier: roster.stats.windMultiplier ?? 1,
    activeSpeedMultiplier: 1,
    interactionBonus,
    directDamageBonus,
  }
}

function reachEnvironment(stage, rules, generatedWindX) {
  const windCycle = rules.find((entry) => entry.kind === 'wind-cycle')
  const windX = Array.isArray(windCycle?.parameters?.sequence)
    ? finiteNumber(windCycle.parameters.sequence[0], generatedWindX)
    : generatedWindX
  const updraft = rules.find((entry) => entry.kind === 'wind-zone')
  const water = rules.find((entry) => entry.kind === 'water-cycle')
  const levels = water?.parameters?.levels
  const waterStartPhase = Math.max(0, Math.floor(finiteNumber(modifierValue(stage, 'water-start-phase', 0))))
  const waterY = Array.isArray(levels) && levels.length
    ? finiteNumber(levels[(waterStartPhase + 1) % levels.length], null)
    : null
  return { windX, updraft, water, waterY }
}

function minimumUpdraftAt(x, rule) {
  if (!rule) return 0
  const lanes = Math.max(0, Math.floor(finiteNumber(rule.parameters?.lanes, 3)))
  const width = Math.max(0, finiteNumber(rule.parameters?.width, 82))
  for (let lane = 0; lane < lanes; lane += 1) {
    if (Math.abs(x - (600 + lane * 190)) <= width / 2) {
      // Runtime pulses from 65% to 100%; reachability uses the weakest lift.
      return finiteNumber(rule.parameters?.accelerationY, -0.18) * 0.65
    }
  }
  return 0
}

/**
 * Conservative full-pull horizontal range using the same fixed-step order as
 * the runtime. The vertical drill can be delayed until the target column, so
 * its horizontal reach uses the unmodified flight envelope; area and tether
 * abilities are accounted for separately.
 */
export function estimateSpecialBirdReach(type, {
  windX = 0,
  updraft = null,
  water = null,
  waterY = null,
} = {}) {
  const profile = birdFlightProfile(type)
  const activeSpeed = profile.activeSpeedMultiplier || 1
  const cacheKey = JSON.stringify([
    type, windX, updraft?.id || null, updraft?.parameters || null,
    water?.id || null, water?.parameters || null, waterY,
  ])
  const cached = FLIGHT_REACH_CACHE.get(cacheKey)
  if (cached) return cached
  const anchorY = SLING_Y - 55
  let groundReachX = SLING_X
  let bestPullDegrees = 180
  for (let degrees = 90; degrees <= 180; degrees += 0.5) {
    const radians = degrees * Math.PI / 180
    const pullX = Math.cos(radians) * MAX_PULL
    const pullY = Math.sin(radians) * MAX_PULL
    let x = SLING_X + pullX
    let y = anchorY + pullY
    let vx = -pullX * POWER * profile.launchSpeed * activeSpeed
    let vy = -pullY * POWER * profile.launchSpeed * activeSpeed
    for (let tick = 0; tick < 360; tick += 1) {
      vy += GRAVITY * profile.gravityScale
      vx += windX * profile.windMultiplier
      vy += minimumUpdraftAt(x, updraft)
      if (waterY !== null && y > waterY) {
        vy -= finiteNumber(water?.parameters?.buoyancy, 0.58) * GRAVITY
        const drag = finiteNumber(water?.parameters?.drag, 0.86)
        vx *= drag
        vy *= drag
      }
      vx *= FRICTION
      vy *= FRICTION
      x += vx
      y += vy
      if (y >= GROUND_Y - profile.radius) {
        if (x > groundReachX) {
          groundReachX = x
          bestPullDegrees = degrees
        }
        break
      }
    }
  }
  const result = Object.freeze({
    type,
    groundReachX: Math.round(groundReachX * 10) / 10,
    interactionReachX: Math.round((groundReachX + profile.interactionBonus) * 10) / 10,
    directDamageReachX: Math.round((groundReachX + (profile.directDamageBonus || 0)) * 10) / 10,
    interactionBonus: profile.interactionBonus,
    bestPullDegrees,
  })
  FLIGHT_REACH_CACHE.set(cacheKey, result)
  return result
}

export function buildSpecialReachabilityContract({ stage, campaign, targets, rules, windX }) {
  const environment = reachEnvironment(stage, rules, windX)
  const reaches = Object.fromEntries(stage.availableBirdTypes.map((type) => [
    type,
    estimateSpecialBirdReach(type, environment),
  ]))
  const requiredReachX = Math.max(...targets.map((target) => (
    target.x - target.size * 0.78 - ACORN_HITBOX_BONUS
  )))
  const targetCapableBirdTypes = stage.availableBirdTypes.filter((type) => (
    reaches[type].directDamageReachX + 0.5 >= requiredReachX
  ))
  const structureCapableBirdTypes = stage.availableBirdTypes.filter((type) => (
    reaches[type].interactionReachX + 0.5 >= requiredReachX
  ))
  const signatureType = campaign.signatureBird.id
  const guaranteedOrder = [signatureType, ...stage.availableBirdTypes.filter((type) => type !== signatureType)]
  const guaranteedBirdType = guaranteedOrder.find((type) => targetCapableBirdTypes.includes(type)) || null
  const minimumGuaranteedShots = !guaranteedBirdType
    ? 0
    : guaranteedBirdType === signatureType ? 1 : Math.min(stage.objective.shotLimit, guaranteedOrder.length)
  const needsStructureInteraction = Number(stage.objective?.requiredCollapseRatio || 0) > 0
  const deadlockFree = Boolean(guaranteedBirdType)
    && (!needsStructureInteraction || structureCapableBirdTypes.length > 0)
  return Object.freeze({
    launcherX: SLING_X,
    requiredReachX: Math.round(requiredReachX * 10) / 10,
    windX: environment.windX,
    reaches: Object.freeze(reaches),
    capableBirdTypes: Object.freeze(targetCapableBirdTypes),
    targetCapableBirdTypes: Object.freeze(targetCapableBirdTypes),
    structureCapableBirdTypes: Object.freeze(structureCapableBirdTypes),
    guaranteedBirdType,
    minimumGuaranteedShots,
    deadlockFree,
  })
}

/**
 * Builds a deterministic secret-stage magazine. The signature acorn always
 * leads, every authored type appears once when capacity permits, and only the
 * remaining slots are random. This removes all-same-type soft locks without
 * making repeated runs identical.
 */
export function buildSpecialShotQueue({ birdTypes = [], signatureBirdType = '', totalShots = 0, seed = 1 } = {}) {
  const pool = [...new Set(birdTypes.filter((type) => typeof type === 'string' && type))]
  const count = Math.max(0, Math.floor(Number(totalShots) || 0))
  if (!pool.length || count === 0) return Object.freeze([])
  const signature = pool.includes(signatureBirdType) ? signatureBirdType : pool[0]
  const rng = new Rng(mixSeed(seed, 'special-shot-queue'))
  const queue = []
  let cycleIndex = 0
  while (queue.length < count) {
    const cycle = cycleIndex === 0
      ? [signature, ...pool.filter((type) => type !== signature)]
      : [...pool]
    const shuffleStart = cycleIndex === 0 ? 1 : 0
    for (let index = cycle.length - 1; index > shuffleStart; index -= 1) {
      const swap = rng.integer(shuffleStart, index + 1)
      ;[cycle[index], cycle[swap]] = [cycle[swap], cycle[index]]
    }
    if (queue.length && cycle.length > 1 && queue.at(-1) === cycle[0]) {
      const swap = cycle.findIndex((type) => type !== queue.at(-1))
      ;[cycle[0], cycle[swap]] = [cycle[swap], cycle[0]]
    }
    queue.push(...cycle.slice(0, count - queue.length))
    cycleIndex += 1
  }
  return Object.freeze(queue)
}

function angleDelta(first, second) {
  return ((first - second + 180) % 360 + 360) % 360 - 180
}

export function blockCountsAsCollapsed(block, {
  displacementThreshold = 26,
  rotationThreshold = 18,
} = {}) {
  if (!block || typeof block !== 'object') return true
  const x = finiteNumber(block.x)
  const y = finiteNumber(block.y)
  const initialX = finiteNumber(block.initialX, x)
  const initialY = finiteNumber(block.initialY, y)
  const rotation = finiteNumber(block.rotation)
  const initialRotation = finiteNumber(block.initialRotation)
  return Math.hypot(x - initialX, y - initialY) >= Math.max(0, displacementThreshold)
    || Math.abs(angleDelta(rotation, initialRotation)) >= Math.max(0, rotationThreshold)
}

export function calculateStructuralCollapseRatio(initialBlockCount, blocks = []) {
  const initial = Math.max(0, Math.floor(finiteNumber(initialBlockCount)))
  if (initial === 0) return 1
  const standing = Array.isArray(blocks)
    ? blocks.reduce((sum, block) => blockCountsAsCollapsed(block)
      ? sum
      : sum + Math.max(0, finiteNumber(block?.collapseWeight, 1)), 0)
    : 0
  return Math.min(1, Math.max(0, 1 - standing / initial))
}

export function evaluateSpecialObjective({
  objective = null,
  initialBlockCount = 0,
  blocks = [],
  remainingTargetCount = 0,
  remainingBossCount = 0,
  stageScore = 0,
} = {}) {
  const type = objective?.type || 'eliminate-all'
  const targetCount = Math.max(0, Math.floor(finiteNumber(remainingTargetCount)))
  const bossCount = Math.max(0, Math.floor(finiteNumber(remainingBossCount)))
  const collapseRatio = calculateStructuralCollapseRatio(initialBlockCount, blocks)
  const requiredCollapseRatio = Math.min(1, Math.max(0, finiteNumber(objective?.requiredCollapseRatio)))
  const targetsMet = type === 'defeat-boss'
    ? bossCount === 0 && (!objective?.clearGuards || targetCount === 0)
    : targetCount === 0
  const collapseMet = collapseRatio + 1e-9 >= requiredCollapseRatio
  const parScore = Math.max(0, Math.floor(finiteNumber(objective?.parScore)))
  const normalizedScore = Math.max(0, Math.floor(finiteNumber(stageScore)))
  return Object.freeze({
    type,
    met: targetsMet && collapseMet,
    targetsMet,
    collapseMet,
    collapseRatio,
    requiredCollapseRatio,
    parScore,
    parScoreMet: parScore === 0 || normalizedScore >= parScore,
    stageScore: normalizedScore,
  })
}

function materialize(block, type) {
  const material = BLOCK_MATERIALS[type]
  block.type = type
  block.hp = material.hp
  block.mass = (block.width * block.height / 1_000) * material.massMultiplier
  return block
}

const PROFILE_LAYOUTS = Object.freeze({
  'twin-narrow': { centers: [670, 850], floors: [4, 4], beam: 102, spread: 29 },
  'offset-needle': { centers: [625, 805, 985], floors: [2, 5, 3], beam: 116, spread: 31, shift: 6 },
  'single-spine': { centers: [720, 900], floors: [5, 5], beam: 94, spread: 24 },
  'clock-crown': { centers: [610, 770, 930, 1090], floors: [3, 5, 5, 3], beam: 126, spread: 35, shift: 4 },
  'flooded-alley': { centers: [620, 775, 930, 1085], floors: [2, 3, 2, 3], beam: 118, spread: 34 },
  'three-rafts': { centers: [650, 835, 1020], floors: [3, 4, 3], beam: 132, spread: 39 },
  'ballast-ring': { centers: [605, 760, 915, 1070], floors: [3, 3, 4, 3], beam: 136, spread: 40, shift: 5 },
  'shell-engine': { centers: [660, 800, 940, 1080], floors: [2, 4, 4, 2], beam: 128, spread: 36, shift: 7 },
  'double-facade': { centers: [665, 755, 955, 1045], floors: [4, 4, 4, 4], beam: 94, spread: 27 },
  'backstop-court': { centers: [610, 790, 1010], floors: [3, 4, 5], beam: 134, spread: 39, shift: 5 },
  'alternating-gates': { centers: [620, 790, 960, 1130], floors: [5, 4, 5, 4], beam: 128, spread: 36, shift: 8 },
  'hex-prism': { centers: [640, 780, 920, 1060], floors: [4, 5, 5, 4], beam: 122, spread: 34, shift: 6 },
  'low-ceiling': { centers: [620, 770, 920, 1070], floors: [2, 2, 3, 2], beam: 138, spread: 42 },
  'rail-supported': { centers: [650, 850, 1050], floors: [3, 4, 3], beam: 142, spread: 43 },
  'armored-bunker': { centers: [640, 785, 930, 1075], floors: [2, 3, 3, 2], beam: 132, spread: 39, shift: 3 },
  'switchyard-fort': { centers: [605, 755, 905, 1055], floors: [3, 4, 4, 5], beam: 124, spread: 35, shift: 7 },
  'suspended-cargo': { centers: [640, 820, 1000], floors: [3, 3, 4], beam: 138, spread: 41 },
  // The first quake lesson leaves a broad, uninterrupted drop lane between
  // its first two structures. Two ground anchors sit inside one shock radius
  // without placing a roof or moving obstacle over the intended impact point.
  'quake-training-span': { centers: [620, 860, 1100], floors: [3, 3, 4], beam: 128, spread: 38 },
  'cable-bridge': { centers: [610, 760, 910, 1060], floors: [2, 4, 4, 2], beam: 142, spread: 43, shift: 5 },
  'storm-ring': { centers: [640, 780, 920, 1060], floors: [4, 3, 4, 3], beam: 130, spread: 38, shift: 8 },
  'suspended-bridge': { centers: [600, 750, 900, 1050], floors: [3, 5, 5, 3], beam: 140, spread: 42, shift: 4 },
})

function makeProfileBlock(x, y, width, height, role = 'structural') {
  const material = BLOCK_MATERIALS.wood
  return {
    x, y, type: 'wood', width, height, role,
    hp: material.hp,
    mass: (width * height / 1_000) * material.massMultiplier,
  }
}

function buildProfileBlocks(stage, seed = 0) {
  const profileId = modifierValue(stage, 'tower-profile')
  if (!profileId || !PROFILE_LAYOUTS[profileId]) return null
  return buildSpecialArchitectureTemplate({
    profileId,
    stage,
    groundY: GROUND_Y,
    originX: 850,
    seed,
  })
}

function activeRule(campaign, stage, kind) {
  return campaign.mapRules.find((rule) => stage.activeRuleIds.includes(rule.id) && rule.kind === kind) || null
}

const AUTHORED_MATERIAL_MARKERS = Object.freeze([
  'reinforcedSupport', 'counterweight', 'ballast', 'weakFloat', 'repairableFloat',
  'rootWall', 'ceilingDrop', 'lightningRod', 'critical', 'cableAnchor', 'reflective',
  'tutorialFrostTarget', 'tutorialTetherTarget', 'tutorialReturnSurface',
  'tutorialDrillLayer', 'tutorialShockAnchor', 'tutorialMaterialLocked',
])

function hasAuthoredMaterialMarker(block) {
  return AUTHORED_MATERIAL_MARKERS.some((key) => block[key])
}

function spacedSelection(values, count) {
  if (count <= 0 || values.length === 0) return []
  if (count >= values.length) return [...values]
  return Array.from({ length: count }, (_, index) => (
    values[Math.round((index + 0.5) * values.length / count - 0.5)]
  ))
}

function alignedSupportColumn(supports, count) {
  // Silhouette profiles offset alternate floors by a few pixels. Treat posts
  // within one narrow tower lane as a column, then the drill tutorial snaps
  // the selected layers onto a truly shared X axis.
  const tolerance = 12
  const groups = []
  for (const support of [...supports].sort((first, second) => first.x - second.x || second.y - first.y)) {
    const group = groups.find((candidate) => Math.abs(candidate.x - support.x) <= tolerance)
    if (group) {
      group.blocks.push(support)
      group.x = group.blocks.reduce((sum, block) => sum + block.x, 0) / group.blocks.length
    } else groups.push({ x: support.x, blocks: [support] })
  }
  const eligible = groups
    .filter((group) => group.blocks.length >= count)
    .sort((first, second) => (
      Math.abs(first.x - 900) - Math.abs(second.x - 900)
      || second.blocks.length - first.blocks.length
    ))
  return (eligible[0]?.blocks || supports)
    .sort((first, second) => second.y - first.y)
    .slice(0, count)
}

/**
 * High-collapse stages need deliberate ground weak points, not a lucky material
 * shuffle. Keep the authored material totals unchanged by exchanging excess
 * ground masonry with the nearest unmarked upper post. Stone still forms the
 * low, readable skeleton, while a stable wood fuse gives the magazine a real
 * route into the requested collapse percentage.
 */
function balanceCollapseSupports(blocks, stage) {
  const requiredRatio = Math.max(0, Math.min(1, finiteNumber(stage.objective?.requiredCollapseRatio)))
  if (requiredRatio < 0.4) return
  const groundSupports = blocks
    .filter((block) => block.role === 'post'
      && Math.abs(block.y + block.height / 2 - GROUND_Y) <= 4)
    .sort((first, second) => first.x - second.x)
  if (groundSupports.length < 2) return

  const maximumGroundStoneCount = Math.max(
    1,
    Math.floor(groundSupports.length * (1 - requiredRatio)),
  )
  const protectedStones = groundSupports.filter((block) => (
    block.type === 'stone' && hasAuthoredMaterialMarker(block)
  ))
  const movableStones = groundSupports.filter((block) => (
    block.type === 'stone' && !hasAuthoredMaterialMarker(block)
  ))
  const movableKeepCount = Math.max(0, maximumGroundStoneCount - protectedStones.length)
  const keptMovable = new Set(spacedSelection(movableStones, movableKeepCount))
  const excessStones = movableStones.filter((block) => !keptMovable.has(block))
  if (!excessStones.length) return

  const upperPosts = blocks
    .filter((block) => block.role === 'post'
      && block.type !== 'stone'
      && !groundSupports.includes(block)
      && !hasAuthoredMaterialMarker(block))
    .sort((first, second) => second.y - first.y || first.x - second.x)
  for (let index = 0; index < Math.min(excessStones.length, upperPosts.length); index += 1) {
    const groundStone = excessStones[index]
    const upperPost = upperPosts[index]
    const weakType = upperPost.type
    materialize(groundStone, weakType)
    materialize(upperPost, 'stone')
    groundStone.collapseFuse = true
    upperPost.relocatedMasonry = true
  }
}

function applyMaterialProfile(blocks, campaign, stage, rng) {
  const materialRule = activeRule(campaign, stage, 'material-modifier')
  const iceRatio = Number(modifierValue(
    stage,
    'ice-ratio',
    materialRule?.parameters?.material === 'ice' ? 0.24 : 0,
  ))
  const stoneRatio = Number(modifierValue(
    stage,
    'stone-ratio',
    modifierValue(stage, 'metal-ratio', materialRule?.parameters?.material === 'stone' ? 0.24 : 0),
  ))
  const breakableSupport = activeRule(campaign, stage, 'breakable-support')
  const authoredAnchors = breakableSupport
    ? Number(breakableSupport.parameters.anchorsPerPlatform || 2) * Math.max(1, platformCount(stage))
    : 0
  const criticalSupports = Math.max(
    Number(modifierValue(stage, 'critical-supports', 0)),
    Number(modifierValue(stage, 'anchor-count', 0)),
    authoredAnchors,
  )
  const mirrorCount = Number(modifierValue(stage, 'mirror-count', modifierValue(stage, 'moving-mirror-count', 0)))
  const indices = blocks.map((_, index) => index)
  const tieBreak = new Map(indices.map((index) => [index, rng.next()]))
  const iceCount = Math.min(blocks.length, Math.round(blocks.length * Math.max(0, iceRatio)))
  const stoneCount = Math.min(blocks.length - iceCount, Math.round(blocks.length * Math.max(0, stoneRatio)))
  // Materials follow structural roles instead of a whole-building shuffle:
  // stone preferentially anchors low posts, while glass/ice occupies exposed
  // upper lintels and roofs. This preserves readable weak/strong layers and
  // lets same-material nail/masonry joints form intentionally.
  const stoneOrder = [...indices].sort((first, second) => {
    const firstBlock = blocks[first]
    const secondBlock = blocks[second]
    const roleRank = (block) => block.role === 'foundation' ? 0 : block.role === 'post' ? 1 : 2
    return roleRank(firstBlock) - roleRank(secondBlock)
      || secondBlock.y - firstBlock.y
      || tieBreak.get(first) - tieBreak.get(second)
  })
  const stoneIndices = new Set(stoneOrder.slice(0, stoneCount))
  const iceOrder = indices.filter((index) => !stoneIndices.has(index)).sort((first, second) => {
    const firstBlock = blocks[first]
    const secondBlock = blocks[second]
    const roleRank = (block) => block.role === 'roof' ? 0 : block.role === 'lintel' ? 1 : 2
    return roleRank(firstBlock) - roleRank(secondBlock)
      || firstBlock.y - secondBlock.y
      || tieBreak.get(first) - tieBreak.get(second)
  })
  for (const index of stoneIndices) materialize(blocks[index], 'stone')
  for (const index of iceOrder.slice(0, iceCount)) materialize(blocks[index], 'ice')
  const supports = blocks
    .filter((block) => block.height > block.width)
    .sort((first, second) => second.y - first.y || first.x - second.x)
  const beams = blocks
    .filter((block) => block.width > block.height && !String(block.role).startsWith('tutorial-'))
    .sort((first, second) => second.y - first.y || first.x - second.x)
  const reinforceCount = Number(modifierValue(stage, 'support-count', 0))
  for (const block of supports.slice(0, reinforceCount)) {
    materialize(block, 'stone')
    block.reinforcedSupport = true
  }
  const counterweightCount = Number(modifierValue(stage, 'counterweight-count', 0))
  for (const block of [...beams].sort((first, second) => first.y - second.y).slice(0, counterweightCount)) {
    materialize(block, 'stone')
    block.counterweight = true
  }
  const ballastCount = Number(modifierValue(stage, 'ballast-blocks', 0))
  for (const block of [...blocks].sort((first, second) => second.y - first.y).slice(0, ballastCount)) {
    materialize(block, 'stone')
    block.ballast = true
  }
  const weakFloatCount = Number(modifierValue(stage, 'weak-floats', 0))
  for (const block of beams.slice(0, weakFloatCount)) {
    materialize(block, 'ice')
    block.weakFloat = true
  }
  const repairableFloatCount = Number(modifierValue(stage, 'repairable-floats', 0))
  for (const block of beams.slice(0, repairableFloatCount)) {
    block.repairableFloat = true
    block.hp += 1
  }
  const rootWallCount = Number(modifierValue(stage, 'root-wall-count', 0))
  const rootWallColumn = alignedSupportColumn(supports, rootWallCount)
  const rootWallX = rootWallColumn.length
    ? rootWallColumn.reduce((sum, block) => sum + block.x, 0) / rootWallColumn.length
    : null
  for (const block of rootWallColumn) {
    if (stage.tutorialStage === true) block.x = rootWallX
    materialize(block, 'stone')
    // A drill lesson is about punching through durable layers. A layer that
    // also inherits the template's one-hit fuse marker teaches the opposite
    // rule, so the authored tutorial wall owns its material/weak-point state.
    if (stage.tutorialStage === true) {
      delete block.critical
      delete block.cableAnchor
      delete block.collapseFuse
    }
    block.rootWall = true
    block.tutorialDrillLayer = stage.tutorialStage === true
    block.tutorialMaterialLocked = stage.tutorialStage === true
  }
  const ceilingGroupCount = Number(modifierValue(stage, 'ceiling-group-count', 0))
  for (const block of [...blocks].sort((first, second) => first.y - second.y).slice(0, ceilingGroupCount)) {
    block.ceilingDrop = true
  }
  const lightningRodCount = Number(modifierValue(stage, 'lightning-rods', 0))
  for (const block of [...supports].sort((first, second) => first.y - second.y).slice(0, lightningRodCount)) {
    materialize(block, 'stone')
    block.lightningRod = true
  }
  const criticalCandidates = supports.filter((block) => (
    !block.rootWall && !block.tutorialMaterialLocked
  ))
  for (const block of criticalCandidates.slice(0, criticalSupports)) {
    materialize(block, block.type === 'stone' ? 'wood' : block.type)
    block.hp = breakableSupport ? Math.max(1, Number(breakableSupport.parameters.anchorHp || 1)) : 1
    block.critical = true
    block.cableAnchor = Boolean(breakableSupport)
  }
  for (const block of blocks.filter((entry) => entry.width > entry.height).slice(0, mirrorCount)) {
    const mirrorRule = activeRule(campaign, stage, 'surface-restitution')
    block.reflective = true
    block.surfaceMaterial = 'mirror'
    block.hp = Math.max(block.hp, Number(mirrorRule?.parameters?.durability || 2))
  }
  balanceCollapseSupports(blocks, stage)

  // Critical cable anchors are deliberately weak and may consume every stone
  // selected by a small asymmetric template. Preserve the advertised realm
  // material mix on an unmarked upper member so visual language and material
  // strategy never disappear from a generated seed.
  const ensureMaterial = (type, requestedRatio) => {
    if (!(requestedRatio > 0) || blocks.some((block) => block.type === type)) return
    const candidate = blocks
      .filter((block) => !block.critical
        && !block.tutorialMaterialLocked
        && !block.collapseFuse
        && block.type !== type)
      .sort((first, second) => (
        (first.role === 'roof' || first.role === 'lintel' ? 0 : 1)
        - (second.role === 'roof' || second.role === 'lintel' ? 0 : 1)
        || first.y - second.y
      ))[0]
    if (candidate) {
      materialize(candidate, type)
      candidate.realmMaterialAccent = true
    }
  }
  ensureMaterial('stone', stoneRatio)
  ensureMaterial('ice', iceRatio)
}

function addTutorialBlock(blocks, {
  x, y, width, height, role, type = 'wood', markers = {},
}) {
  const block = makeProfileBlock(x, y, width, height, role)
  materialize(block, type)
  Object.assign(block, markers)
  blocks.push(block)
  return block
}

/**
 * The first encounter in each secret campaign uses authored geometry instead
 * of hoping that a random material pass happens to demonstrate the ability.
 * Returned points are data only; runtime tutorials may draw them, while CI can
 * validate the actual blocks around them.
 */
function applyTutorialGeometry(blocks, campaign, stage) {
  if (stage.tutorialStage !== true) return null
  const signatureType = campaign.signatureBird.id
  if (signatureType === 'frost') {
    const shared = {
      tutorialFrostTarget: true,
      tutorialMaterialLocked: true,
      tutorialClusterId: 'frost-ring-cluster',
    }
    addTutorialBlock(blocks, {
      x: 522, y: 495, width: 22, height: 50, role: 'tutorial-post', type: 'ice', markers: shared,
    })
    addTutorialBlock(blocks, {
      x: 578, y: 495, width: 22, height: 50, role: 'tutorial-post', type: 'ice', markers: shared,
    })
    addTutorialBlock(blocks, {
      x: 550, y: 459, width: 84, height: 22, role: 'tutorial-lintel', type: 'ice', markers: shared,
    })
    return { activationPoint: { x: 550, y: 390 } }
  }

  if (signatureType === 'vine') {
    addTutorialBlock(blocks, {
      x: 472, y: 495, width: 24, height: 50, role: 'tutorial-raft-post', type: 'wood',
      markers: { tutorialRaftPart: true },
    })
    addTutorialBlock(blocks, {
      x: 528, y: 495, width: 24, height: 50, role: 'tutorial-raft-post', type: 'wood',
      markers: { tutorialRaftPart: true },
    })
    addTutorialBlock(blocks, {
      x: 500, y: 459, width: 86, height: 22, role: 'tutorial-raft-beam', type: 'wood',
      markers: {
        tutorialRaftPart: true,
        tutorialTetherTarget: true,
        tutorialMaterialLocked: true,
        tutorialTag: 'tutorial-tether-target',
      },
    })
    return { activationPoint: { x: 430, y: 375 } }
  }

  if (signatureType === 'boomerang') {
    for (const block of blocks) {
      delete block.reflective
      delete block.surfaceMaterial
    }
    addTutorialBlock(blocks, {
      x: 1230, y: 450, width: 20, height: 140, role: 'tutorial-return-mirror', type: 'stone',
      markers: {
        reflective: true,
        surfaceMaterial: 'mirror',
        tutorialReturnSurface: true,
        tutorialMaterialLocked: true,
      },
    })
    return {
      activationPoint: { x: 1278, y: 342 },
      turnPoint: { x: 1278, y: 342 },
    }
  }

  if (signatureType === 'drill') {
    const layers = blocks.filter((block) => block.tutorialDrillLayer)
    const columnX = layers.length
      ? layers.reduce((sum, block) => sum + block.x, 0) / layers.length
      : 900
    const top = layers.length
      ? Math.min(...layers.map((block) => block.y - block.height / 2))
      : 330
    return { activationPoint: { x: columnX, y: top - 66 }, columnX }
  }

  if (signatureType === 'quake') {
    const groundSupports = blocks
      .filter((block) => block.height > block.width
        && Math.abs(block.y + block.height / 2 - GROUND_Y) <= 4)
    const towerAnchors = groundSupports.filter((block) => (
      block.cableAnchor && block.architectureRole === 'post'
    ))
    const impactX = towerAnchors.length >= 2
      ? towerAnchors.reduce((sum, block) => sum + block.x, 0) / towerAnchors.length
      : groundSupports.reduce((sum, block) => sum + block.x, 0) / Math.max(1, groundSupports.length)
    const pair = [
      [...groundSupports].filter((block) => block.x < impactX).sort((a, b) => b.x - a.x)[0],
      [...groundSupports].filter((block) => block.x > impactX).sort((a, b) => a.x - b.x)[0],
    ].filter(Boolean)
    for (const block of pair) {
      block.tutorialShockAnchor = true
      block.tutorialMaterialLocked = true
      block.tutorialTag = 'tutorial-shock-anchor'
      block.cableAnchor = true
      block.critical = true
      block.hp = Math.max(3, block.hp)
    }
    return {
      activationPoint: { x: impactX, y: 190 },
      impactPoint: { x: impactX, y: GROUND_Y - 18 },
    }
  }
  return null
}

function applyTutorialTargetGeometry(targets, campaign, stage) {
  if (stage.tutorialStage !== true || campaign.signatureBird.id !== 'boomerang') return
  const target = targets.find((candidate) => candidate.variant === 'shield') || targets[0]
  if (!target) return
  const radius = target.size * 0.78
  target.x = 1145
  target.y = GROUND_Y - radius
  target.tutorialReturnTarget = true
  target.tutorialTag = 'tutorial-return-target'
}

function tutorialTargetMarker(entityKind, entity, entityIndex, tag) {
  return Object.freeze({
    entityKind,
    entityIndex,
    tag,
    x: finiteNumber(entity?.x),
    y: finiteNumber(entity?.y),
  })
}

function tutorialCheck(id, passed, actual, required) {
  return Object.freeze({ id, passed: Boolean(passed), actual, required })
}

/**
 * Compiles a machine-verifiable lesson contract from generated geometry. This
 * is intentionally stricter than tutorial copy: if a later material/profile
 * edit obscures the lesson, the feasibility audit fails with a concrete check.
 */
export function buildSpecialTutorialContract({
  campaign, stage, blocks = [], targets = [], platforms = [], decoys = [],
  rules = [], windX = 0, geometry = null,
} = {}) {
  if (stage?.tutorialStage !== true || !stage.tutorialContract) return null
  const authored = stage.tutorialContract
  const checks = []
  const tutorialTargets = []
  const ruleIds = new Set(rules.map((entry) => entry?.id))
  checks.push(tutorialCheck(
    'signature-first-shot',
    stage.availableBirdTypes?.[0] === authored.signatureBirdType
      || campaign.signatureBird.id === authored.signatureBirdType,
    campaign.signatureBird.id,
    authored.signatureBirdType,
  ))
  checks.push(tutorialCheck(
    'required-rules-active',
    authored.requiredRuleIds.every((id) => ruleIds.has(id)),
    [...ruleIds],
    authored.requiredRuleIds,
  ))

  if (authored.kind === 'frost-cluster') {
    const cluster = blocks.filter((block) => block.tutorialFrostTarget)
    cluster.forEach((block) => tutorialTargets.push(tutorialTargetMarker(
      'block', block, blocks.indexOf(block), 'frost-ring-target',
    )))
    const radius = finiteNumber(authored.radius)
    checks.push(tutorialCheck('frost-target-count', cluster.length >= authored.minimumTargets, cluster.length, authored.minimumTargets))
    checks.push(tutorialCheck(
      'frost-material',
      cluster.every((block) => block.type === authored.targetMaterial),
      cluster.map((block) => block.type),
      authored.targetMaterial,
    ))
    checks.push(tutorialCheck(
      'frost-radius-coverage',
      cluster.every((block) => Math.hypot(
        block.x - geometry.activationPoint.x,
        block.y - geometry.activationPoint.y,
      ) <= radius + 1e-6),
      cluster.map((block) => Math.round(Math.hypot(
        block.x - geometry.activationPoint.x,
        block.y - geometry.activationPoint.y,
      ) * 10) / 10),
      radius,
    ))
  } else if (authored.kind === 'vine-tether') {
    const tetherTargets = blocks.filter((block) => block.tutorialTetherTarget)
    tetherTargets.forEach((block) => tutorialTargets.push(tutorialTargetMarker(
      'block', block, blocks.indexOf(block), authored.targetTag,
    )))
    const distances = blocks.map((block) => ({
      block,
      distance: Math.hypot(block.x - geometry.activationPoint.x, block.y - geometry.activationPoint.y),
    })).sort((first, second) => first.distance - second.distance)
    const targetDistance = distances.find((entry) => entry.block === tetherTargets[0])?.distance ?? Number.POSITIVE_INFINITY
    const competingDistance = distances.find((entry) => entry.block !== tetherTargets[0])?.distance ?? Number.POSITIVE_INFINITY
    checks.push(tutorialCheck('vine-unique-target', tetherTargets.length === 1, tetherTargets.length, 1))
    checks.push(tutorialCheck('vine-target-in-range', targetDistance <= authored.range, Math.round(targetDistance * 10) / 10, authored.range))
    checks.push(tutorialCheck(
      'vine-target-is-nearest',
      targetDistance + 8 <= competingDistance,
      Math.round((competingDistance - targetDistance) * 10) / 10,
      'nearest by at least 8px',
    ))
    checks.push(tutorialCheck(
      'vine-target-is-raft-beam',
      tetherTargets[0]?.role === 'tutorial-raft-beam' && tetherTargets[0]?.width > tetherTargets[0]?.height,
      tetherTargets[0]?.role ?? null,
      'tutorial-raft-beam',
    ))
  } else if (authored.kind === 'boomerang-return') {
    const surfaces = [
      ...blocks.filter((block) => block.reflective),
      ...platforms.filter((platform) => platform.reflective),
    ]
    const returnTarget = targets.find((target) => target.tutorialReturnTarget)
    surfaces.forEach((surface) => tutorialTargets.push(tutorialTargetMarker(
      blocks.includes(surface) ? 'block' : 'platform',
      surface,
      blocks.includes(surface) ? blocks.indexOf(surface) : platforms.indexOf(surface),
      'tutorial-return-surface',
    )))
    if (returnTarget) tutorialTargets.push(tutorialTargetMarker(
      'target', returnTarget, targets.indexOf(returnTarget), authored.targetTag,
    ))
    checks.push(tutorialCheck('boomerang-one-surface', surfaces.length === authored.mirrorSurfaceCount, surfaces.length, authored.mirrorSurfaceCount))
    checks.push(tutorialCheck('boomerang-no-decoys', decoys.length === authored.decoyCount, decoys.length, authored.decoyCount))
    checks.push(tutorialCheck(
      'boomerang-return-lane',
      Boolean(returnTarget && surfaces[0]
        && returnTarget.x < surfaces[0].x
        && surfaces[0].x < geometry.turnPoint.x),
      returnTarget ? [returnTarget.x, surfaces[0]?.x, geometry.turnPoint.x] : null,
      'target.x < mirror.x < turn.x',
    ))
  } else if (authored.kind === 'vertical-drill-column') {
    const layers = blocks.filter((block) => block.tutorialDrillLayer)
      .sort((first, second) => first.y - second.y)
    layers.forEach((block) => tutorialTargets.push(tutorialTargetMarker(
      'block', block, blocks.indexOf(block), authored.targetTag,
    )))
    const xs = layers.map((block) => block.x)
    const spread = xs.length ? Math.max(...xs) - Math.min(...xs) : Number.POSITIVE_INFINITY
    checks.push(tutorialCheck('drill-layer-count', layers.length >= authored.minimumLayers, layers.length, authored.minimumLayers))
    checks.push(tutorialCheck('drill-column-alignment', spread <= authored.columnTolerance, spread, authored.columnTolerance))
    checks.push(tutorialCheck(
      'drill-high-durability-stone',
      layers.every((block) => block.type === authored.targetMaterial && block.hp >= authored.minimumHp),
      layers.map((block) => `${block.type}:${block.hp}`),
      `${authored.targetMaterial}:${authored.minimumHp}+`,
    ))
    checks.push(tutorialCheck('drill-not-critical-fuse', layers.every((block) => !block.critical), layers.filter((block) => block.critical).length, 0))
  } else if (authored.kind === 'quake-drop-zone') {
    const anchors = blocks.filter((block) => block.tutorialShockAnchor)
    anchors.forEach((block) => tutorialTargets.push(tutorialTargetMarker(
      'block', block, blocks.indexOf(block), authored.targetTag,
    )))
    const halfCorridor = authored.corridorWidth / 2
    const corridorObstacles = blocks.filter((block) => (
      block.x + block.width / 2 > geometry.impactPoint.x - halfCorridor
      && block.x - block.width / 2 < geometry.impactPoint.x + halfCorridor
      && block.y - block.height / 2 < geometry.impactPoint.y - 12
      && block.y + block.height / 2 > 90
    ))
    const platformObstacles = platforms.filter((platform) => {
      const envelope = platformMotionEnvelope(platform)
      return envelope.x + envelope.width / 2 > geometry.impactPoint.x - halfCorridor
        && envelope.x - envelope.width / 2 < geometry.impactPoint.x + halfCorridor
    })
    checks.push(tutorialCheck('quake-anchor-count', anchors.length >= authored.minimumAnchors, anchors.length, authored.minimumAnchors))
    checks.push(tutorialCheck(
      'quake-anchor-radius',
      anchors.every((block) => Math.hypot(block.x - geometry.impactPoint.x, block.y - geometry.impactPoint.y) <= authored.shockRadius),
      anchors.map((block) => Math.round(Math.hypot(block.x - geometry.impactPoint.x, block.y - geometry.impactPoint.y) * 10) / 10),
      authored.shockRadius,
    ))
    checks.push(tutorialCheck(
      'quake-high-drop',
      geometry.impactPoint.y - geometry.activationPoint.y >= authored.minimumDropHeight,
      geometry.impactPoint.y - geometry.activationPoint.y,
      authored.minimumDropHeight,
    ))
    checks.push(tutorialCheck('quake-open-corridor', corridorObstacles.length === 0 && platformObstacles.length === 0, {
      blockCount: corridorObstacles.length, platformCount: platformObstacles.length,
    }, { blockCount: 0, platformCount: 0 }))
    checks.push(tutorialCheck('quake-no-global-crosswind', Math.abs(windX) < 1e-9, windX, 0))
  }

  return Object.freeze({
    ...authored,
    activationPoint: geometry?.activationPoint || null,
    impactPoint: geometry?.impactPoint || null,
    turnPoint: geometry?.turnPoint || null,
    firstShotBirdType: campaign.signatureBird.id,
    passed: checks.every((entry) => entry.passed),
    checks: Object.freeze(checks),
    targets: Object.freeze(tutorialTargets),
  })
}

function platformCount(stage) {
  const kinds = ['platform-count', 'raft-count', 'cart-count', 'moving-mirror-count']
  for (const kind of kinds) {
    const value = modifierValue(stage, kind)
    if (Number.isInteger(value)) return value
  }
  const anchorCount = modifierValue(stage, 'anchor-count')
  if (Number.isInteger(anchorCount)) return Math.max(1, Math.ceil(anchorCount / 2))
  return stage.activeRuleIds.some((id) => /pendulum|platform|raft|cart|shutter|cable/u.test(id)) ? 2 : 0
}

function platformTouchesTarget(platform, target, tolerance = 4) {
  return circleIntersectsRect({
    x: target.x,
    y: target.y,
    radius: target.size * 0.78 + tolerance,
  }, platform)
}

export function platformMotionEnvelope(platform, { clearance = 0 } = {}) {
  const rotation = finiteNumber(platform?.rotation) * Math.PI / 180
  const halfWidth = Math.abs(Math.cos(rotation)) * finiteNumber(platform?.width) / 2
    + Math.abs(Math.sin(rotation)) * finiteNumber(platform?.height) / 2
  const halfHeight = Math.abs(Math.sin(rotation)) * finiteNumber(platform?.width) / 2
    + Math.abs(Math.cos(rotation)) * finiteNumber(platform?.height) / 2
  const velocityX = finiteNumber(platform?.velocityX, finiteNumber(platform?.vx))
  const velocityY = finiteNumber(platform?.velocityY, finiteNumber(platform?.vy))
  const movesHorizontally = Math.abs(velocityX) > 0.001
    && Number.isFinite(Number(platform?.minX)) && Number.isFinite(Number(platform?.maxX))
  const movesVertically = Math.abs(velocityY) > 0.001
    && Number.isFinite(Number(platform?.minY)) && Number.isFinite(Number(platform?.maxY))
  const minCenterX = movesHorizontally ? Math.min(platform.minX, platform.maxX) : finiteNumber(platform?.x)
  const maxCenterX = movesHorizontally ? Math.max(platform.minX, platform.maxX) : finiteNumber(platform?.x)
  const minCenterY = movesVertically ? Math.min(platform.minY, platform.maxY) : finiteNumber(platform?.y)
  const loadSinkAllowance = finiteNumber(platform?.loadSinkPerMass) > 0 ? 24 : 0
  const maxCenterY = (movesVertically ? Math.max(platform.minY, platform.maxY) : finiteNumber(platform?.y))
    + loadSinkAllowance
  const extra = Math.max(0, finiteNumber(clearance))
  return Object.freeze({
    x: (minCenterX + maxCenterX) / 2,
    y: (minCenterY + maxCenterY) / 2,
    width: maxCenterX - minCenterX + halfWidth * 2 + extra * 2,
    height: maxCenterY - minCenterY + halfHeight * 2 + extra * 2,
    rotation: 0,
  })
}

function movePlatformTo(platform, x, y) {
  const offsetX = x - platform.x
  const offsetY = y - platform.y
  const moved = { ...platform, x, y }
  for (const field of ['minX', 'maxX']) {
    if (Number.isFinite(Number(moved[field]))) moved[field] += offsetX
  }
  for (const field of ['minY', 'maxY', 'baseY']) {
    if (Number.isFinite(Number(moved[field]))) moved[field] += offsetY
  }
  return moved
}

function platformEnvelopeFitsPlayfield(envelope) {
  return envelope.x - envelope.width / 2 >= PLATFORM_PLAYFIELD.left
    && envelope.x + envelope.width / 2 <= PLATFORM_PLAYFIELD.right
    && envelope.y - envelope.height / 2 >= PLATFORM_PLAYFIELD.top
    && envelope.y + envelope.height / 2 <= PLATFORM_PLAYFIELD.bottom
}

function platformDeploymentIsClear(platform, blocks, targets, placedPlatforms) {
  if (!platform) return false
  const envelope = platformMotionEnvelope(platform, { clearance: 8 })
  return platformEnvelopeFitsPlayfield(envelope)
    && blocks.every((block) => !rectsOverlap(envelope, block))
    && targets.every((target) => !platformTouchesTarget(envelope, target, 8))
    && placedPlatforms.every((placed) => (
      !rectsOverlap(envelope, platformMotionEnvelope(placed, { clearance: 8 }))
    ))
}

function clampPlatformTrackToPlayfield(platform) {
  let fitted = { ...platform }
  for (let pass = 0; pass < 2; pass += 1) {
    const envelope = platformMotionEnvelope(fitted, { clearance: 8 })
    const left = envelope.x - envelope.width / 2
    const right = envelope.x + envelope.width / 2
    const top = envelope.y - envelope.height / 2
    const bottom = envelope.y + envelope.height / 2
    const offsetX = left < PLATFORM_PLAYFIELD.left
      ? PLATFORM_PLAYFIELD.left - left
      : right > PLATFORM_PLAYFIELD.right ? PLATFORM_PLAYFIELD.right - right : 0
    const offsetY = top < PLATFORM_PLAYFIELD.top
      ? PLATFORM_PLAYFIELD.top - top
      : bottom > PLATFORM_PLAYFIELD.bottom ? PLATFORM_PLAYFIELD.bottom - bottom : 0
    if (Math.abs(offsetX) < 0.001 && Math.abs(offsetY) < 0.001) break
    fitted = movePlatformTo(fitted, fitted.x + offsetX, fitted.y + offsetY)
  }
  return fitted
}

function findClearPlatformPosition(platform, blocks, targets, placedPlatforms) {
  const highestStructureTop = Math.min(...blocks.map((block) => block.y - block.height / 2))
  const aboveStructure = Math.max(108, highestStructureTop - 62)
  const candidateYs = [...new Set([
    platform.y, platform.y - 44, platform.y + 44,
    aboveStructure, 92, 104, 108, 136, 164, 192, 220, 250, 286, 316, 350, 382, 414, 448,
  ])]
  const horizontal = Math.abs(finiteNumber(platform.velocityX)) > 0.001
  const lateralCandidates = [...new Set([
    platform.x, platform.x - 54, platform.x + 54, platform.x - 108, platform.x + 108,
    420, 480, 540, 600, 690, 780, 870, 960, 1050, 1140, 1182, 1230, 1320,
  ])]
  const candidateXs = horizontal && platform.lockTrackToCorridor
    ? [platform.x]
    : lateralCandidates
  for (const y of candidateYs) {
    if (y - platform.height / 2 < 92 || y + platform.height / 2 > GROUND_Y - 4) continue
    for (const x of candidateXs) {
      const candidate = movePlatformTo(platform, x, y)
      if (platformDeploymentIsClear(candidate, blocks, targets, placedPlatforms)) return candidate
    }
  }
  // Never force an authored obstacle into a structure merely to satisfy a
  // requested count.  The fallback still prefers the empty high/approach lane,
  // but an unexpectedly crowded future profile safely omits the platform.
  const fallback = clampPlatformTrackToPlayfield(movePlatformTo(
    platform,
    horizontal ? platform.x : 420,
    horizontal ? 92 : platform.y,
  ))
  return platformDeploymentIsClear(fallback, blocks, targets, placedPlatforms)
    ? fallback
    : null
}

function makePlatforms(campaign, stage, rng, blocks, targets) {
  const rule = activeRule(campaign, stage, 'moving-platform')
  const axis = rule?.parameters?.axis
  const amplitude = Math.max(28, Number(rule?.parameters?.amplitude || 74))
  const periodTicks = Math.max(60, Number(rule?.parameters?.periodTicks || 180))
  const speed = Math.max(0.45, Number(rule?.parameters?.speed || amplitude * 4 / periodTicks))
  const phaseStep = Number(rule?.parameters?.phaseStep || 0.25)
  const cableRule = activeRule(campaign, stage, 'breakable-support')
  const mirrorRule = activeRule(campaign, stage, 'surface-restitution')
  // Counts are layout controls, not permission to create a generic obstacle.
  // A stage must explicitly activate a moving-platform or suspended-cable rule
  // before any platform can enter the encounter.
  if (!rule && !cableRule) return []
  const platforms = []
  const specialVisualKind = {
    'polar-clocktower': 'clock-pendulum',
    'tidebound-undercity': 'buoyant-raft',
    'mirrorwood-labyrinth': 'mirror-gate',
    'deep-root-fault': 'mine-cart',
    'stormline-skyport': 'skyport-deck',
  }[campaign.id] || 'wooden-platform'
  const count = Math.min(4, platformCount(stage))
  for (let index = 0; index < count; index += 1) {
    const horizontal = axis === 'horizontal' || stage.activeRuleIds.some((id) => /cart|shutter/u.test(id))
    const authoredMinX = Number(rule?.parameters?.minX)
    const authoredMaxX = Number(rule?.parameters?.maxX)
    const defaultX = FORTRESS_START_X - 20 + index * TOWER_SPACING
    const width = rule?.parameters?.derailImpulse
      ? 88 + (index % 2) * 12
      : 108 + (index % 2) * 20
    const corridorLeft = Number.isFinite(authoredMinX) ? authoredMinX : 400
    const corridorRight = Number.isFinite(authoredMaxX) ? authoredMaxX : 1380
    const authoredHorizontalCorridor = Number.isFinite(authoredMinX) && Number.isFinite(authoredMaxX)
    const laneGap = 14
    const laneWidth = horizontal
      ? (corridorRight - corridorLeft - laneGap * Math.max(0, count - 1)) / Math.max(1, count)
      : 0
    const laneLeft = corridorLeft + index * (laneWidth + laneGap)
    const laneRight = laneLeft + laneWidth
    const laneCenter = (laneLeft + laneRight) / 2
    const horizontalHalfTravel = authoredHorizontalCorridor
      ? Math.max(0, (laneWidth - width) / 2)
      : Math.min(amplitude, Math.max(0, (laneWidth - width) / 2))
    const minX = horizontal
      ? laneCenter - horizontalHalfTravel
      : defaultX - amplitude
    const maxX = horizontal
      ? laneCenter + horizontalHalfTravel
      : defaultX + amplitude
    const phase = ((index * phaseStep) % 1 + 1) % 1
    const x = horizontal ? minX + (maxX - minX) * phase : defaultX
    const y = 280 + (index % 2) * 110 + rng.range(-12, 12)
    const mirrorAngle = Number(mirrorRule?.parameters?.angleSnapDegrees || 0)
    const platform = findClearPlatformPosition({
      x,
      y,
      width,
      height: 16,
      velocityX: horizontal ? (index % 2 ? -speed : speed) : 0,
      velocityY: horizontal ? 0 : (index % 2 ? -speed : speed),
      minX,
      maxX,
      minY: Math.max(190, y - amplitude),
      maxY: Math.min(470, y + amplitude),
      baseY: y,
      loadSinkPerMass: Number(rule?.parameters?.loadSinkPerMass || 0),
      derailImpulse: Number(rule?.parameters?.derailImpulse || 0),
      cablePlatform: Boolean(cableRule),
      cableIntegrity: Number(cableRule?.parameters?.anchorsPerPlatform || 0),
      cableLength: Number(cableRule?.parameters?.cableLength || 0),
      cableAngularImpulse: Number(cableRule?.parameters?.oneAnchorAngularImpulse || 0),
      reflective: Boolean(mirrorRule),
      surfaceRestitution: Number(mirrorRule?.parameters?.restitution || 0),
      blocksBirds: true,
      carrierKind: rule?.parameters?.carrierType || 'flying-squirrel',
      carrierHp: Number(rule?.parameters?.carrierHp || 2),
      boardHp: Number(rule?.parameters?.boardHp || 3),
      boardMaxHp: Number(rule?.parameters?.boardHp || 3),
      affectsStructures: false,
      specialPlatform: stage.id,
      specialVisualKind,
      lockTrackToCorridor: authoredHorizontalCorridor,
      rotation: mirrorRule ? (index % 2 ? -1 : 1) * mirrorAngle : 0,
    }, blocks, targets, platforms)
    if (!platform) continue
    platform.motionEnvelope = platformMotionEnvelope(platform)
    platforms.push(platform)
  }
  return platforms
}

function makeTarget(x, y, variant, elite = false, eliteHpBonus = 3) {
  const roster = SPECIAL_SQUIRREL_BY_TYPE[variant]
  const size = roster.stats.size + (elite ? 7 : 0)
  const hp = roster.stats.hp + (elite ? eliteHpBonus : 0)
  return {
    x,
    y,
    size,
    hp,
    boss: elite,
    variant,
    reward: roster.stats.score * (elite ? 3 : 1),
  }
}

function buildTargets(blocks, campaign, stage, rng) {
  const count = stage.encounter.targetCount
  const variants = campaign.enemyVariants
  const eliteVariant = stage.encounter.bossVariant
  const eliteHpBonus = Math.max(1, Number(modifierValue(stage, 'boss-armor', 3)))
  const beams = blocks
    .filter((block) => block.width > block.height && !String(block.role).startsWith('tutorial-'))
    .sort((first, second) => first.y - second.y || first.x - second.x)
  const lowestBeamY = Math.max(...beams.map((beam) => beam.y))
  const baseBeams = beams.filter((beam) => Math.abs(beam.y - lowestBeamY) < 2)
  const desiredElevated = Math.min(count, Math.max(
    0,
    Number(modifierValue(stage, 'elevated-targets', count - Math.min(4, baseBeams.length))),
  ))
  const groundCount = Math.max(0, count - desiredElevated - (eliteVariant ? 1 : 0))
  const rearTargets = Number(modifierValue(stage, 'rear-targets', 0))
  const elevatedBeams = rearTargets > 0
    ? [...beams].sort((first, second) => second.x - first.x || first.y - second.y)
    : beams
  const targets = []
  for (let index = 0; index < count; index += 1) {
    const variant = eliteVariant && index === 0 ? eliteVariant : variants[index % variants.length]
    const elite = Boolean(eliteVariant && index === 0)
    const target = makeTarget(0, 0, variant, elite, eliteHpBonus)
    const radius = target.size * 0.78
    if (elite || index >= groundCount) {
      const beamIndex = elite ? 0 : index - groundCount + (eliteVariant ? 1 : 0)
      const beam = elevatedBeams[beamIndex % elevatedBeams.length]
      const offsetLimit = Math.max(0, beam.width / 2 - radius - 6)
      const offset = (beamIndex % 3 - 1) * Math.min(18, offsetLimit)
      target.x = beam.x + offset
      target.y = beam.y - beam.height / 2 - radius
    } else {
      const beam = baseBeams[index % baseBeams.length]
      const side = index % 2 ? 1 : -1
      target.x = beam.x + side * (beam.width / 2 + radius + 9) + rng.range(-4, 4)
      target.y = GROUND_Y - radius
    }
    targets.push(target)
  }
  return targets
}

function ruleWind(campaign, stage) {
  // Vertical updraft lanes are not an unexplained horizontal crosswind. Only
  // an authored wind-cycle rule may initialise global wind, using its first
  // visible dial value so the contract and runtime begin in the same state.
  const windCycle = activeRule(campaign, stage, 'wind-cycle')
  const sequence = windCycle?.parameters?.sequence
  return Array.isArray(sequence) && sequence.length ? finiteNumber(sequence[0]) : 0
}

function markObjectiveEntity(entity, tag) {
  if (!entity) return
  const tags = Array.isArray(entity.objectiveTags) ? entity.objectiveTags : []
  if (!tags.includes(tag)) tags.push(tag)
  entity.objectiveTags = tags
}

function objectiveMarker(stage, tag, entityKind, entity, entityIndex, sequenceIndex = null) {
  markObjectiveEntity(entity, tag)
  return Object.freeze({
    id: `${stage.id}:${tag}:${entityKind}:${entityIndex}`,
    tag,
    entityKind,
    entityIndex,
    sequenceIndex,
    x: finiteNumber(entity?.x),
    y: finiteNumber(entity?.y),
  })
}

function spacedEntities(entities, count) {
  if (!entities.length || count <= 0) return []
  if (count === 1) return [entities[Math.floor(entities.length / 2)]]
  return Array.from({ length: count }, (_, index) => (
    entities[Math.round(index * (entities.length - 1) / (count - 1))]
  ))
}

/**
 * Resolves authored objective tags to concrete generated entities without
 * changing their geometry. Runtime code can track these markers by entity
 * index while the underlying block/target/platform also carries objectiveTags.
 */
export function buildSpecialObjectiveMarkers({ stage, blocks = [], targets = [], platforms = [], decoys = [] } = {}) {
  const challenge = stage?.objective?.challenge
  if (!challenge) return Object.freeze([])
  const markers = []
  const add = (tag, entityKind, entity, sequenceIndex = null) => {
    if (!entity) return
    const list = entityKind === 'block' ? blocks
      : entityKind === 'target' ? targets
        : entityKind === 'platform' ? platforms : decoys
    markers.push(objectiveMarker(stage, tag, entityKind, entity, list.indexOf(entity), sequenceIndex))
  }

  if (challenge.kind === 'identify-target') {
    targets.forEach((target) => add('physical-target', 'target', target))
    decoys.forEach((decoy) => add('visual-decoy', 'decoy', decoy))
    return Object.freeze(markers)
  }

  if (challenge.kind === 'precision-strike') {
    const targetTag = challenge.parameters.targetTag
    const required = Math.max(1, Math.floor(finiteNumber(
      challenge.parameters.requiredTaggedBlocks,
      challenge.parameters.maximumAnchorBreaks || 2,
    )))
    const supports = blocks.filter((block) => block.height > block.width)
      .sort((first, second) => first.x - second.x || second.y - first.y)
    let candidates = []
    if (targetTag === 'counterweight') candidates = blocks.filter((block) => block.counterweight)
    else if (targetTag === 'root-wall') candidates = blocks.filter((block) => block.rootWall)
    else if (targetTag === 'rear-support') candidates = [...supports].sort((first, second) => second.x - first.x)
    else if (targetTag === 'cable-anchor-diagonal') {
      const anchors = blocks.filter((block) => block.cableAnchor)
      if (anchors.length > 1) {
        const xs = anchors.map((block) => finiteNumber(block.x))
        const ys = anchors.map((block) => finiteNumber(block.y))
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const spanX = Math.max(1, maxX - minX)
        const spanY = Math.max(1, maxY - minY)
        const diagonalScore = (block) => (
          (finiteNumber(block.x) - minX) / spanX
          + (finiteNumber(block.y) - minY) / spanY
        )
        const upperLeft = [...anchors].sort((first, second) => (
          diagonalScore(first) - diagonalScore(second)
          || first.x - second.x || first.y - second.y
        ))[0]
        const lowerRight = [...anchors].filter((block) => block !== upperLeft)
          .sort((first, second) => (
            diagonalScore(second) - diagonalScore(first)
            || second.x - first.x || second.y - first.y
          ))[0]
        upperLeft.precisionAnchorCorner = 'upper-left'
        lowerRight.precisionAnchorCorner = 'lower-right'
        candidates = [upperLeft, lowerRight]
      } else candidates = anchors
    }
    if (!candidates.length) candidates = supports
    const selected = spacedEntities(candidates, Math.min(required, candidates.length))
    if (targetTag === 'counterweight') {
      for (const block of selected) block.precisionWeakPoint = true
    }
    selected.forEach((block) => add(targetTag, 'block', block))
    return Object.freeze(markers)
  }

  if (challenge.kind === 'ordered-demolition') {
    const sequence = challenge.parameters.sequence || []
    const supports = blocks.filter((block) => block.height > block.width)
      .sort((first, second) => first.x - second.x || second.y - first.y)
    let entities = []
    let kinds = []
    if (stage.id === 'tidebound-undercity-3') {
      const [floatTag, ballastTag] = sequence
      const floats = blocks.filter((block) => block.weakFloat)
      const stoneCandidates = blocks.filter((block) => block.type === 'stone')
        .sort((first, second) => second.y - first.y || first.x - second.x)
      const authoredBallasts = stoneCandidates.filter((block) => block.ballast)
      const ballastCount = Math.min(3, stoneCandidates.length)
      const ballasts = [...authoredBallasts]
      for (const block of stoneCandidates) {
        if (ballasts.length >= ballastCount) break
        if (!ballasts.includes(block)) ballasts.push(block)
      }
      for (const block of ballasts) block.ballast = true
      floats.forEach((block) => add(floatTag, 'block', block, 0))
      ballasts.forEach((block) => add(ballastTag, 'block', block, 1))
      return Object.freeze(markers)
    } else if (stage.id === 'mirrorwood-labyrinth-3') {
      const orderedTargets = [...targets].sort((first, second) => first.x - second.x)
      const mirrorGate = platforms.find((platform) => platform.reflective) || platforms[0]
      entities = [orderedTargets[0], mirrorGate, orderedTargets.at(-1)]
      kinds = ['target', 'platform', 'target']
    } else if (stage.id === 'deep-root-fault-2') {
      const orderedPlatforms = [...platforms].sort((first, second) => first.x - second.x)
      entities = [...orderedPlatforms, supports[Math.floor(supports.length / 2)]]
      kinds = [...orderedPlatforms.map(() => 'platform'), 'block']
    } else {
      entities = spacedEntities(supports, sequence.length)
      kinds = entities.map(() => 'block')
    }
    sequence.forEach((tag, index) => add(tag, kinds[index] || 'block', entities[index], index))
  }
  return Object.freeze(markers)
}

/**
 * Converts the authored campaign contract into a normal game blueprint. The
 * output deliberately matches generateLevel(), with extra special fields that
 * the runtime can consume without branching through the content tables again.
 */
export function generateSpecialLevel({
  campaignId,
  stageNumber,
  runSeed = 1,
  lucky = false,
  luckyMultiplier = null,
} = {}) {
  const campaign = getSpecialCampaign(campaignId)
  const stage = getSpecialStage(campaignId, stageNumber)
  if (!campaign || !stage) throw new RangeError(`Unknown special stage: ${campaignId}/${stageNumber}`)
  const seed = specialStageSeed(campaignId, stageNumber, runSeed)
  const terrainProfile = terrainProfileForSpecial({ campaignId, stageNumber, seed })
  const rng = new Rng(mixSeed(seed, 'special-layout'))
  const configuredLuckyMultiplier = Number(luckyMultiplier)
  const normalizedLuckyMultiplier = luckyMultiplier !== null && Number.isFinite(configuredLuckyMultiplier)
    ? Math.max(1, configuredLuckyMultiplier)
    : lucky ? 3 : 1
  const virtualLevel = 12 + stage.difficulty
  const base = generateLevel({
    level: virtualLevel,
    seed: mixSeed(seed, 'fortress'),
    mode: 'main',
    lucky,
    luckyMultiplier: normalizedLuckyMultiplier,
  })
  const architectureTemplate = buildProfileBlocks(stage, mixSeed(seed, 'realm-architecture'))
  const blocks = architectureTemplate?.blocks || deepClone(base.blocks)
  applyMaterialProfile(blocks, campaign, stage, rng)
  const tutorialGeometry = applyTutorialGeometry(blocks, campaign, stage)
  const targets = buildTargets(blocks, campaign, stage, rng)
  applyTutorialTargetGeometry(targets, campaign, stage)
  const platforms = makePlatforms(campaign, stage, rng, blocks, targets)
  const rules = stage.activeRuleIds.map((id) => campaign.mapRules.find((rule) => rule.id === id))
  const windX = ruleWind(campaign, stage)
  const reachability = buildSpecialReachabilityContract({
    stage, campaign, targets, rules, windX,
  })
  const decoyRule = activeRule(campaign, stage, 'target-decoy')
  const decoyCount = Number(modifierValue(
    stage,
    'decoy-count',
    decoyRule ? Math.min(4, Math.ceil(stage.encounter.targetCount / 2)) : 0,
  ))
  const decoys = Array.from({ length: Math.max(0, decoyCount) }, (_, index) => {
    const source = targets[index % targets.length]
    const offset = Number(decoyRule?.parameters?.offsetX || 92) * (index % 2 ? -1 : 1)
    return {
      x: Math.min(1320, Math.max(480, source.x + offset)),
      y: source.y,
      variant: source.variant,
      opacity: Number(decoyRule?.parameters?.opacity || 0.52),
      revealAfterImpactTicks: Number(decoyRule?.parameters?.revealAfterImpactTicks || 24),
    }
  })
  const objectiveMarkers = buildSpecialObjectiveMarkers({ stage, blocks, targets, platforms, decoys })
  const tutorialContract = buildSpecialTutorialContract({
    campaign, stage, blocks, targets, platforms, decoys, rules, windX,
    geometry: tutorialGeometry,
  })
  return {
    ...base,
    seed,
    level: stage.number,
    mode: 'special',
    mapType: `special:${campaign.id}`,
    terrainProfile,
    windX,
    skyColor: colorNumber(campaign.theme.colors.skyTop),
    isBossLevel: Boolean(stage.encounter.bossVariant),
    blocks,
    targets,
    platforms,
    birdTypes: [...stage.availableBirdTypes],
    birdsAvailable: Math.max(0, stage.objective.shotLimit - 1),
    goldenEgg: rng.chance(Math.min(1, 0.06 * normalizedLuckyMultiplier))
      ? { x: FORTRESS_START_X + TOWER_SPACING * 1.5, y: 245 }
      : null,
    campaignId: campaign.id,
    stageId: stage.id,
    specialArchitecture: architectureTemplate?.metadata || null,
    campaign,
    stage,
    briefing: campaign.briefing,
    tutorialStage: stage.tutorialStage === true,
    tutorialContract,
    tutorialTargets: tutorialContract?.targets || [],
    theme: campaign.theme,
    rules,
    objective: stage.objective,
    objectiveChallenge: stage.objective.challenge || null,
    objectiveMarkers,
    bossPhases: stage.encounter.bossPhases || [],
    reachability,
    decoys,
  }
}
