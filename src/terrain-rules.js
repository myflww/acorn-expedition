// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const MAIN_LEVEL_COUNT = 18

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function positiveInteger(value, fallback = 1) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

function stableTerrainRoll(seed, salt = 0) {
  let value = (Number(seed) >>> 0) ^ Math.imul((salt + 1) >>> 0, 0x9e3779b1)
  value ^= value >>> 16
  value = Math.imul(value, 0x21f0aaad)
  value ^= value >>> 15
  value = Math.imul(value, 0x735a2d97)
  value ^= value >>> 15
  return value >>> 0
}

/**
 * Ground rules are intentionally separate from block materials. A wood block
 * remains wood on every map, while the surface below it can be mud, snow,
 * stone paving, or a deck. The same frozen numbers drive runtime physics,
 * deterministic level generation, renderer styling, and A/B tests.
 *
 * `rollingDrag` is horizontal speed retained by a grounded acorn each fixed
 * tick. `restitution` multiplies the body's own bounce. `groundFriction` and
 * `structureGrip` combine with a block material's friction at floor contact.
 */
export const TERRAIN_RULES = deepFreeze({
  'meadow-dirt': {
    id: 'meadow-dirt', name: '林缘黄土', family: 'dirt',
    description: '坚实的普通土坡，滚动与建筑抓地都较为均衡。',
    groundFriction: 0.72, rollingDrag: 0.74, restitution: 0.82,
    structureGrip: 1, squirrelGrip: 1,
    colors: {
      surface: '#6d4a2d', rim: '#88a65e', subsoil: '#51361f', deep: '#241b14', accent: '#c69a5d',
    },
    texture: { kind: 'roots-and-pebbles', spacing: 76, density: 0.5 },
  },
  'woodchip-wetland': {
    id: 'woodchip-wetland', name: '木屑湿地', family: 'soft',
    description: '吸水木屑会快速吞掉滚动动量，但高大建筑的地基抓地不如石路。',
    groundFriction: 1.15, rollingDrag: 0.52, restitution: 0.45,
    structureGrip: 0.72, squirrelGrip: 0.84,
    colors: {
      surface: '#4f4933', rim: '#78916a', subsoil: '#3e3327', deep: '#201b17', accent: '#b9844f',
    },
    texture: { kind: 'woodchips-and-pools', spacing: 54, density: 0.72 },
  },
  'ice-snow': {
    id: 'ice-snow', name: '雪尘冰面', family: 'ice',
    description: '薄雪下的冰层抓地力弱，橡果与坠落建材会滑行更远、反弹更明显。',
    groundFriction: 0.12, rollingDrag: 0.955, restitution: 1.3,
    structureGrip: 0.25, squirrelGrip: 0.58,
    colors: {
      surface: '#b9d9df', rim: '#f2f5eb', subsoil: '#739ca8', deep: '#304f5d', accent: '#eafcff',
    },
    texture: { kind: 'snow-ridges-and-cracks', spacing: 82, density: 0.48 },
  },
  'royal-stone-road': {
    id: 'royal-stone-road', name: '王城石路', family: 'stone',
    description: '松鼠王国核心的楔形石路，对建筑地基提供最强抓地和沉稳支撑。',
    groundFriction: 0.92, rollingDrag: 0.68, restitution: 0.9,
    structureGrip: 1.35, squirrelGrip: 1.08,
    colors: {
      surface: '#6f756d', rim: '#c8c5ad', subsoil: '#494b47', deep: '#242625', accent: '#a9ad9d',
    },
    texture: { kind: 'royal-pavers', spacing: 68, density: 0.65 },
  },
  'mirror-glass': {
    id: 'mirror-glass', name: '镜林晶面', family: 'mirror',
    description: '镜林中的局部晶面几乎不消耗滚动速度，反弹与折返路线更容易被利用。',
    groundFriction: 0.08, rollingDrag: 0.975, restitution: 1.45,
    structureGrip: 0.32, squirrelGrip: 0.62,
    colors: {
      surface: '#a8cad3', rim: '#f0ffff', subsoil: '#607d89', deep: '#2e4451', accent: '#d99be8',
    },
    texture: { kind: 'mirror-facets', spacing: 96, density: 0.42 },
  },
  'root-rock-shelf': {
    id: 'root-rock-shelf', name: '深根岩台', family: 'rock',
    description: '断层洞穴中的粗糙岩台，滑行短、支撑稳，很适合震地橡宝传递冲击。',
    groundFriction: 1.02, rollingDrag: 0.62, restitution: 0.7,
    structureGrip: 1.2, squirrelGrip: 1.05,
    colors: {
      surface: '#554b4a', rim: '#8d7665', subsoil: '#382f33', deep: '#1b171d', accent: '#d6a761',
    },
    texture: { kind: 'fault-strata', spacing: 88, density: 0.58 },
  },
  'skyship-deck': {
    id: 'skyship-deck', name: '浮空甲板', family: 'deck',
    description: '雷云航站的铆接木甲板，摩擦适中，但坠落建材会产生略强反弹。',
    groundFriction: 0.68, rollingDrag: 0.78, restitution: 1.08,
    structureGrip: 0.92, squirrelGrip: 0.96,
    colors: {
      surface: '#775232', rim: '#c49b62', subsoil: '#523720', deep: '#221d1a', accent: '#d9b774',
    },
    texture: { kind: 'deck-planks-and-rivets', spacing: 72, density: 0.64 },
  },
})

function makeProfile({ id, label, primaryId, zones = [], source = 'authored' }) {
  if (!TERRAIN_RULES[primaryId]) throw new RangeError(`Unknown primary terrain: ${primaryId}`)
  const normalizedZones = zones.map((zone, index) => {
    if (!TERRAIN_RULES[zone.terrainId]) throw new RangeError(`Unknown terrain zone: ${zone.terrainId}`)
    const startX = Number(zone.startX)
    const endX = Number(zone.endX)
    if (!Number.isFinite(startX) || !Number.isFinite(endX) || endX <= startX) {
      throw new TypeError(`terrain zone ${index} must have a finite increasing range`)
    }
    return {
      id: zone.id || `${id}-zone-${index + 1}`,
      terrainId: zone.terrainId,
      startX,
      endX,
      label: zone.label || TERRAIN_RULES[zone.terrainId].name,
    }
  })
  const terrainIds = [...new Set([primaryId, ...normalizedZones.map((zone) => zone.terrainId)])]
  if (terrainIds.length > 2) throw new RangeError('a level may contain at most two primary terrain rules')
  return deepFreeze({
    id,
    label: label || TERRAIN_RULES[primaryId].name,
    source,
    primaryId,
    terrainIds,
    ruleCount: terrainIds.length,
    zones: normalizedZones,
  })
}

export const DEFAULT_TERRAIN_PROFILE = makeProfile({
  id: 'default-meadow-dirt', label: '林缘土坡', primaryId: 'meadow-dirt', source: 'default',
})

export function terrainRuleById(id) {
  return TERRAIN_RULES[id] || TERRAIN_RULES['meadow-dirt']
}

export function terrainRuleAtX(profile, x) {
  const normalized = profile && TERRAIN_RULES[profile.primaryId] ? profile : DEFAULT_TERRAIN_PROFILE
  const position = Number(x)
  if (Number.isFinite(position)) {
    for (let index = normalized.zones.length - 1; index >= 0; index -= 1) {
      const zone = normalized.zones[index]
      if (position >= zone.startX && position < zone.endX) return terrainRuleById(zone.terrainId)
    }
  }
  return terrainRuleById(normalized.primaryId)
}

export function terrainProfileForMain(level = 1) {
  const chapterLevel = clamp(positiveInteger(level), 1, MAIN_LEVEL_COUNT)
  const primaryId = chapterLevel <= 6 ? 'meadow-dirt'
    : chapterLevel <= 9 ? 'woodchip-wetland'
      : chapterLevel <= 12 ? 'ice-snow'
        : 'royal-stone-road'
  const chapterLabel = chapterLevel <= 3 ? '林缘起伏土坡'
    : chapterLevel <= 5 ? '风峡砾土隘道'
      : chapterLevel <= 6 ? '黑松关隘台地'
        : chapterLevel <= 9 ? '云杉林场木屑湿地'
          : chapterLevel <= 12 ? '月光雪尘冰面'
            : '王城楔形石路'
  return makeProfile({
    id: `main-${chapterLevel}-${primaryId}`,
    label: chapterLabel,
    primaryId,
    source: 'main-chapter',
  })
}

export function terrainProfileForEndless({ level = 1, seed = 1 } = {}) {
  const normalizedLevel = positiveInteger(level)
  const depth = normalizedLevel > MAIN_LEVEL_COUNT ? normalizedLevel - MAIN_LEVEL_COUNT : normalizedLevel
  const unlocked = ['meadow-dirt']
  if (depth >= 7) unlocked.push('woodchip-wetland')
  if (depth >= 16) unlocked.push('ice-snow')
  if (depth >= 28) unlocked.push('royal-stone-road')

  const primaryRoll = stableTerrainRoll(seed, depth * 3 + 1)
  const primaryId = unlocked[primaryRoll % unlocked.length]
  const secondaryRoll = stableTerrainRoll(seed, depth * 3 + 2)
  const secondaryPool = unlocked.filter((id) => id !== primaryId)
  const hasSecondary = secondaryPool.length > 0 && secondaryRoll % 100 < Math.min(55, 18 + depth)
  const secondaryId = hasSecondary ? secondaryPool[secondaryRoll % secondaryPool.length] : null
  const zoneWidth = 250 + stableTerrainRoll(seed, depth * 3 + 3) % 220
  const zoneStart = 510 + stableTerrainRoll(seed, depth * 3 + 4) % Math.max(1, 680 - zoneWidth)
  return makeProfile({
    id: `endless-${depth}-${primaryId}${secondaryId ? `-${secondaryId}` : ''}`,
    label: secondaryId
      ? `${TERRAIN_RULES[primaryId].name} / ${TERRAIN_RULES[secondaryId].name}`
      : TERRAIN_RULES[primaryId].name,
    primaryId,
    source: 'endless-seeded',
    zones: secondaryId ? [{
      id: `endless-${depth}-secondary`, terrainId: secondaryId,
      startX: zoneStart, endX: zoneStart + zoneWidth,
    }] : [],
  })
}

export function terrainProfileForSpecial({ campaignId, stageNumber = 1, seed = 1 } = {}) {
  const stage = positiveInteger(stageNumber)
  if (campaignId === 'polar-clocktower') {
    return makeProfile({ id: `${campaignId}-${stage}-snow`, label: '极地雪尘冰面', primaryId: 'ice-snow', source: 'special-campaign' })
  }
  if (campaignId === 'tidebound-undercity') {
    return makeProfile({ id: `${campaignId}-${stage}-wetland`, label: '涨落木屑湿地', primaryId: 'woodchip-wetland', source: 'special-campaign' })
  }
  if (campaignId === 'mirrorwood-labyrinth') {
    const shift = stableTerrainRoll(seed, stage) % 90
    return makeProfile({
      id: `${campaignId}-${stage}-mirror`, label: '镜林土径 / 局部晶面',
      primaryId: 'meadow-dirt', source: 'special-campaign',
      zones: [{
        id: `${campaignId}-${stage}-mirror-zone`, terrainId: 'mirror-glass',
        startX: 610 + shift, endX: 970 + shift,
      }],
    })
  }
  if (campaignId === 'deep-root-fault') {
    return makeProfile({ id: `${campaignId}-${stage}-rock`, label: '断层深根岩台', primaryId: 'root-rock-shelf', source: 'special-campaign' })
  }
  if (campaignId === 'stormline-skyport') {
    return makeProfile({ id: `${campaignId}-${stage}-deck`, label: '雷云航站甲板', primaryId: 'skyship-deck', source: 'special-campaign' })
  }
  return DEFAULT_TERRAIN_PROFILE
}

export function terrainProfileForLevel({ mode = 'main', level = 1, seed = 1, campaignId = null } = {}) {
  if (mode === 'special') return terrainProfileForSpecial({ campaignId, stageNumber: level, seed })
  if (mode === 'endless') return terrainProfileForEndless({ level, seed })
  return terrainProfileForMain(level)
}

export function resolveTerrainGroundContact({ vx = 0, vy = 0 } = {}, terrain, {
  body = 'acorn',
  bodyRestitution = 1,
  materialFriction = 0.62,
} = {}) {
  const rule = typeof terrain === 'string' ? terrainRuleById(terrain) : terrain || TERRAIN_RULES['meadow-dirt']
  const horizontalSpeed = Number.isFinite(Number(vx)) ? Number(vx) : 0
  const verticalSpeed = Number.isFinite(Number(vy)) ? Number(vy) : 0
  const ownRestitution = clamp(Number(bodyRestitution) || 0, 0, 1.5)
  const bounce = verticalSpeed > 0
    ? -verticalSpeed * clamp(ownRestitution * rule.restitution, 0, 0.92)
    : verticalSpeed
  if (body === 'structure') {
    const friction = clamp(Number(materialFriction) || 0, 0, 1.5)
    const retained = clamp(1 - friction * 0.6 * rule.groundFriction * rule.structureGrip, 0.04, 0.995)
    return { vx: horizontalSpeed * retained, vy: bounce, retained, terrainId: rule.id }
  }
  if (body === 'squirrel') {
    const retained = clamp(1 - rule.groundFriction * rule.squirrelGrip * 0.42, 0.18, 0.82)
    return { vx: horizontalSpeed * retained, vy: bounce, retained, terrainId: rule.id }
  }
  return {
    vx: horizontalSpeed * rule.rollingDrag,
    vy: bounce,
    retained: rule.rollingDrag,
    terrainId: rule.id,
  }
}

export function simulateTerrainStopDistance(terrain, {
  initialSpeed = 12,
  stopSpeed = 0.05,
  maximumTicks = 600,
} = {}) {
  const rule = typeof terrain === 'string' ? terrainRuleById(terrain) : terrain || TERRAIN_RULES['meadow-dirt']
  let speed = Math.abs(Number(initialSpeed) || 0)
  let distance = 0
  let ticks = 0
  while (speed > stopSpeed && ticks < maximumTicks) {
    speed *= rule.rollingDrag
    distance += speed
    ticks += 1
  }
  return deepFreeze({ terrainId: rule.id, distance, ticks, finalSpeed: speed })
}
