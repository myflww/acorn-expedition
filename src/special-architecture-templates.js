// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const BASE_WOOD = Object.freeze({ hp: 3, massMultiplier: 1.4 })

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round3(value) {
  return Math.round(value * 1_000) / 1_000
}

function profileHash(profileId, seed = 0) {
  let hash = (Number(seed) >>> 0) ^ 0x9e3779b9
  for (const character of String(profileId)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x85ebca6b) >>> 0
    hash ^= hash >>> 13
  }
  return hash >>> 0
}

export const SPECIAL_ARCHITECTURE_FAMILIES = deepFreeze({
  polar: {
    title: '极夜钟楼构件',
    campaignId: 'polar-clocktower',
    variants: {
      'bell-arch': { title: '钟拱门', silhouette: '双墙钟拱与冻结扶壁' },
      'pendulum-frame': { title: '钟摆支架', silhouette: '高门架、偏心摆杆与配重' },
    },
  },
  tide: {
    title: '潮缚港工构件',
    campaignId: 'tidebound-undercity',
    variants: {
      'arcade-pier': { title: '拱廊码头', silhouette: '长栈桥、连续水门与不等距桥桩' },
      'hull-fort': { title: '船壳浮堡', silhouette: '开口船腹、偏置舱室与船首撞角' },
    },
  },
  mirror: {
    title: '镜林棱镜构件',
    campaignId: 'mirrorwood-labyrinth',
    variants: {
      'prism-courtyard': { title: '棱镜三角庭院', silhouette: '中心棱柱、对开斜面与外侧碎片' },
      'zigzag-gate': { title: '折线门', silhouette: '齿形门叶、错高边桩与假通道' },
    },
  },
  root: {
    title: '根脉矿工构件',
    campaignId: 'deep-root-fault',
    variants: {
      'a-frame-mine': { title: '低矮 A 形矿堡', silhouette: '压低横梁、外张坑木与薄弱中柱' },
      'rail-bridge': { title: '矿轨桥', silhouette: '长轨梁、拱撑桥墩与偏载矿车' },
    },
  },
  storm: {
    title: '雷云航站构件',
    campaignId: 'stormline-skyport',
    variants: {
      'cable-gate': { title: '悬索桥门', silhouette: '双塔桥门、落地缆锚与中置桥面' },
      'bridge-deck': { title: '航站舰桥', silhouette: '长舰体、偏置驾驶舱与单侧高桅' },
    },
  },
})

export const SPECIAL_ARCHITECTURE_PROFILE_MAP = deepFreeze({
  'twin-narrow': { realm: 'polar', variant: 'bell-arch', authoredStage: 1 },
  'offset-needle': { realm: 'polar', variant: 'pendulum-frame', authoredStage: 2 },
  'single-spine': { realm: 'polar', variant: 'bell-arch', authoredStage: 3 },
  'clock-crown': { realm: 'polar', variant: 'pendulum-frame', authoredStage: 4 },
  'flooded-alley': { realm: 'tide', variant: 'arcade-pier', authoredStage: 1 },
  'three-rafts': { realm: 'tide', variant: 'hull-fort', authoredStage: 2 },
  'ballast-ring': { realm: 'tide', variant: 'arcade-pier', authoredStage: 3 },
  'shell-engine': { realm: 'tide', variant: 'hull-fort', authoredStage: 4 },
  'double-facade': { realm: 'mirror', variant: 'prism-courtyard', authoredStage: 1 },
  'backstop-court': { realm: 'mirror', variant: 'zigzag-gate', authoredStage: 2 },
  'alternating-gates': { realm: 'mirror', variant: 'zigzag-gate', authoredStage: 3 },
  'hex-prism': { realm: 'mirror', variant: 'prism-courtyard', authoredStage: 4 },
  'low-ceiling': { realm: 'root', variant: 'a-frame-mine', authoredStage: 1 },
  'rail-supported': { realm: 'root', variant: 'rail-bridge', authoredStage: 2 },
  'armored-bunker': { realm: 'root', variant: 'a-frame-mine', authoredStage: 3 },
  'switchyard-fort': { realm: 'root', variant: 'rail-bridge', authoredStage: 4 },
  'quake-training-span': { realm: 'storm', variant: 'cable-gate', authoredStage: 1 },
  'cable-bridge': { realm: 'storm', variant: 'cable-gate', authoredStage: 2 },
  'storm-ring': { realm: 'storm', variant: 'bridge-deck', authoredStage: 3 },
  'suspended-bridge': { realm: 'storm', variant: 'bridge-deck', authoredStage: 4 },
})

function rawBlock(x, y, width, height, role, options = {}) {
  return {
    x, y, width, height, role,
    rotation: options.rotation || 0,
    minStage: options.minStage || 1,
    architectureRole: options.architectureRole || role,
    ...(options.critical ? { critical: true } : {}),
    ...(options.cableAnchor ? { cableAnchor: true } : {}),
    ...(options.counterweight ? { counterweight: true } : {}),
    ...(options.ballast ? { ballast: true } : {}),
    ...(options.reflective ? { reflective: true } : {}),
  }
}

function groundPost(x, width, height, role = 'post', options = {}) {
  return rawBlock(x, -height / 2, width, height, role, options)
}

function groundBrace(x, width, height, rotation, options = {}) {
  const radians = Math.abs(rotation) * Math.PI / 180
  const verticalExtent = width * Math.sin(radians) + height * Math.cos(radians)
  return rawBlock(x, -verticalExtent / 2, width, height, 'brace', {
    ...options,
    rotation,
    architectureRole: options.architectureRole || 'diagonal-brace',
  })
}

function supportedBeam(x, supportTop, width, height, role = 'lintel', options = {}) {
  return rawBlock(x, supportTop - height / 2, width, height, role, options)
}

function bellArch() {
  return [
    groundPost(-72, 26, 124),
    groundPost(72, 22, 124, 'post', { critical: true, architectureRole: 'clock-key-support' }),
    supportedBeam(0, -124, 172, 24, 'lintel'),
    rawBlock(-36, -178, 20, 60, 'post'),
    rawBlock(2, -178, 16, 60, 'post', { architectureRole: 'bell-center-pin' }),
    rawBlock(40, -178, 20, 60, 'post'),
    supportedBeam(3, -208, 118, 20, 'roof'),
    groundBrace(-125, 74, 12, 65, { architectureRole: 'frozen-buttress' }),
    groundBrace(132, 74, 12, -58, { architectureRole: 'frozen-buttress' }),
    groundPost(-170, 18, 54, 'post', { minStage: 3, architectureRole: 'bell-stair' }),
  ]
}

function pendulumFrame() {
  return [
    groundPost(-92, 24, 170),
    groundPost(92, 22, 170, 'post', { critical: true, architectureRole: 'escapement-support' }),
    supportedBeam(0, -170, 220, 24, 'roof'),
    groundPost(21, 42, 48, 'post', { counterweight: true, architectureRole: 'pendulum-weight' }),
    rawBlock(21, -109, 14, 122, 'post', { architectureRole: 'pendulum-rod' }),
    groundBrace(-139, 82, 12, 70, { architectureRole: 'clock-frame-leg' }),
    groundBrace(146, 82, 12, -66, { architectureRole: 'clock-frame-leg' }),
    rawBlock(-48, -214, 18, 40, 'post', { minStage: 2, architectureRole: 'gear-pin' }),
    rawBlock(54, -214, 18, 40, 'post', { minStage: 4, architectureRole: 'gear-pin' }),
  ]
}

function arcadePier() {
  return [
    groundPost(-105, 22, 96),
    groundPost(-35, 20, 96, 'post', { critical: true, architectureRole: 'salt-worn-pile' }),
    groundPost(50, 24, 96),
    groundPost(125, 22, 96),
    supportedBeam(10, -96, 290, 24, 'lintel', { architectureRole: 'pier-deck' }),
    groundBrace(-70, 70, 10, 60, { architectureRole: 'arcade-opening' }),
    groundBrace(7, 70, 10, -60, { architectureRole: 'arcade-opening' }),
    groundBrace(88, 72, 10, 60, { architectureRole: 'arcade-opening' }),
    rawBlock(112, -145, 18, 50, 'post', { minStage: 2, architectureRole: 'harbor-lamp-post' }),
  ]
}

function hullFort() {
  return [
    groundBrace(-112, 120, 18, 20, { ballast: true, architectureRole: 'port-hull' }),
    groundBrace(125, 120, 18, -24, { ballast: true, architectureRole: 'starboard-hull' }),
    groundPost(-38, 22, 72, 'post', { critical: true, architectureRole: 'hull-keel-pin' }),
    groundPost(42, 22, 72),
    supportedBeam(0, -72, 190, 24, 'lintel', { architectureRole: 'floating-deck' }),
    rawBlock(-25, -122, 20, 52, 'post', { architectureRole: 'cabin-wall' }),
    rawBlock(35, -122, 20, 52, 'post', { architectureRole: 'cabin-wall' }),
    supportedBeam(5, -148, 100, 20, 'roof', { architectureRole: 'cabin-roof' }),
    rawBlock(55, -189, 12, 42, 'post', { minStage: 3, architectureRole: 'signal-mast' }),
  ]
}

function prismCourtyard() {
  return [
    groundBrace(-75, 150, 14, -63, { reflective: true, architectureRole: 'left-prism-face' }),
    groundBrace(75, 150, 14, 63, { reflective: true, architectureRole: 'right-prism-face' }),
    groundPost(8, 24, 104, 'post', { critical: true, reflective: true, architectureRole: 'prism-heart' }),
    groundBrace(-142, 66, 12, -72, { reflective: true, architectureRole: 'mirror-shard' }),
    groundBrace(151, 58, 12, 68, { reflective: true, architectureRole: 'mirror-shard' }),
    groundPost(-185, 18, 48, 'post', { architectureRole: 'courtyard-marker' }),
    groundPost(195, 18, 64, 'post', { minStage: 2, architectureRole: 'courtyard-marker' }),
    groundBrace(-216, 48, 10, 54, { minStage: 4, reflective: true, architectureRole: 'mirror-shard' }),
  ]
}

function zigzagGate() {
  return [
    groundBrace(-170, 112, 14, -58, { reflective: true, architectureRole: 'zigzag-leaf' }),
    groundBrace(-85, 112, 14, 58, { reflective: true, architectureRole: 'zigzag-leaf' }),
    groundBrace(0, 112, 14, -58, { reflective: true, critical: true, architectureRole: 'false-gate-hinge' }),
    groundBrace(85, 112, 14, 58, { reflective: true, architectureRole: 'zigzag-leaf' }),
    groundBrace(170, 112, 14, -58, { reflective: true, architectureRole: 'zigzag-leaf' }),
    groundPost(-224, 20, 60, 'post', { architectureRole: 'gate-marker' }),
    groundPost(224, 20, 90, 'post', { architectureRole: 'gate-marker' }),
    groundPost(258, 16, 48, 'post', { minStage: 3, architectureRole: 'decoy-marker' }),
  ]
}

function aFrameMine() {
  return [
    groundPost(-62, 24, 94),
    groundPost(62, 22, 94),
    supportedBeam(0, -94, 160, 24, 'roof', { architectureRole: 'low-mine-roof' }),
    groundBrace(-125, 92, 14, -68, { architectureRole: 'pit-prop' }),
    groundBrace(132, 92, 14, 64, { architectureRole: 'pit-prop' }),
    groundPost(5, 18, 68, 'post', { critical: true, architectureRole: 'fault-key-support' }),
    groundPost(-174, 20, 48, 'post', { architectureRole: 'mine-lamp-stand' }),
    groundBrace(181, 58, 12, 70, { minStage: 3, architectureRole: 'collapsed-pit-prop' }),
  ]
}

function railBridge() {
  return [
    groundPost(-120, 28, 78),
    groundPost(-35, 20, 78, 'post', { critical: true, architectureRole: 'switch-key-pier' }),
    groundPost(62, 26, 78),
    groundPost(145, 24, 78),
    supportedBeam(10, -78, 320, 24, 'lintel', { architectureRole: 'rail-carrier' }),
    supportedBeam(8, -102, 270, 12, 'lintel', { architectureRole: 'mine-rail' }),
    groundBrace(-78, 68, 10, 60, { architectureRole: 'trestle-brace' }),
    groundBrace(13, 76, 10, -60, { architectureRole: 'trestle-brace' }),
    groundBrace(104, 68, 10, 60, { architectureRole: 'trestle-brace' }),
    rawBlock(76, -126, 54, 24, 'roof', { counterweight: true, minStage: 2, architectureRole: 'ore-cart' }),
  ]
}

function cableGate() {
  return [
    groundPost(-105, 28, 150, 'post', { cableAnchor: true }),
    groundPost(105, 26, 150, 'post', { cableAnchor: true }),
    // The first quake lesson needs a real high-drop shaft rather than a
    // painted prompt over a solid deck. Two deck halves leave a 64px opening;
    // later annexes still make the silhouette denser without sealing it.
    supportedBeam(-105, -150, 140, 24, 'lintel', { architectureRole: 'left-suspension-deck' }),
    supportedBeam(105, -150, 140, 24, 'lintel', { architectureRole: 'right-suspension-deck' }),
    groundBrace(-174, 96, 12, -70, { cableAnchor: true, architectureRole: 'left-ground-stay' }),
    groundBrace(178, 96, 12, 67, { cableAnchor: true, architectureRole: 'right-ground-stay' }),
    groundPost(60, 18, 88, 'post', { critical: true, cableAnchor: true, architectureRole: 'release-anchor' }),
    rawBlock(-80, -198, 20, 48, 'post', { architectureRole: 'bridge-tower' }),
    rawBlock(70, -198, 20, 48, 'post', { architectureRole: 'bridge-tower' }),
    supportedBeam(-5, -222, 180, 22, 'roof', { minStage: 2, architectureRole: 'tower-crown' }),
  ]
}

function bridgeDeck() {
  return [
    groundPost(0, 260, 32, 'post', { ballast: true, architectureRole: 'airship-keel' }),
    groundBrace(-178, 90, 18, -25, { architectureRole: 'port-bow' }),
    groundBrace(178, 90, 18, 20, { architectureRole: 'starboard-bow' }),
    rawBlock(-60, -64, 22, 64, 'post', { critical: true, architectureRole: 'bridge-key-bulkhead' }),
    rawBlock(15, -64, 24, 64, 'post', { architectureRole: 'bridge-bulkhead' }),
    rawBlock(75, -64, 20, 64, 'post', { architectureRole: 'bridge-bulkhead' }),
    supportedBeam(10, -96, 190, 20, 'roof', { architectureRole: 'command-deck' }),
    rawBlock(70, -156, 14, 80, 'post', { minStage: 2, architectureRole: 'signal-mast' }),
    supportedBeam(70, -196, 54, 12, 'roof', { minStage: 4, architectureRole: 'mast-yard' }),
  ]
}

const VARIANT_BUILDERS = Object.freeze({
  'bell-arch': bellArch,
  'pendulum-frame': pendulumFrame,
  'arcade-pier': arcadePier,
  'hull-fort': hullFort,
  'prism-courtyard': prismCourtyard,
  'zigzag-gate': zigzagGate,
  'a-frame-mine': aFrameMine,
  'rail-bridge': railBridge,
  'cable-gate': cableGate,
  'bridge-deck': bridgeDeck,
})

function rawBounds(block) {
  const radians = Math.abs(block.rotation || 0) * Math.PI / 180
  const width = block.width * Math.cos(radians) + block.height * Math.sin(radians)
  const height = block.width * Math.sin(radians) + block.height * Math.cos(radians)
  return {
    left: block.x - width / 2,
    right: block.x + width / 2,
    top: block.y - height / 2,
    bottom: block.y + height / 2,
  }
}

function addDifficultyAnnex(blocks, stage, direction) {
  if (stage < 2) return blocks
  const bounds = blocks.map(rawBounds)
  const edge = direction > 0
    ? Math.max(...bounds.map((entry) => entry.right))
    : Math.min(...bounds.map((entry) => entry.left))
  const firstX = edge + direction * 45
  blocks.push(groundPost(firstX, 18, 58, 'post', { architectureRole: 'stage-annex' }))
  blocks.push(supportedBeam(firstX, -58, 52, 18, 'roof', { architectureRole: 'stage-annex-cap' }))
  if (stage >= 3) {
    const secondX = firstX + direction * 70
    blocks.push(groundPost(secondX, 20, 82, 'post', { architectureRole: 'stage-annex' }))
    blocks.push(supportedBeam(secondX, -82, 52, 18, 'roof', { architectureRole: 'stage-annex-cap' }))
  }
  if (stage >= 4) {
    const braceX = firstX + direction * 126
    blocks.push(groundBrace(braceX, 74, 12, direction > 0 ? -66 : 66, {
      architectureRole: 'stage-elite-brace',
    }))
  }
  return blocks
}

function materialize(raw, transform) {
  const x = transform.originX + transform.jitter + raw.x * transform.scale * transform.direction
  const y = transform.groundY + raw.y * transform.scale
  const width = raw.width * transform.scale
  const height = raw.height * transform.scale
  const rotation = raw.rotation * transform.direction
  return {
    x: round3(x),
    y: round3(y),
    type: 'wood',
    width: round3(width),
    height: round3(height),
    role: raw.role,
    hp: BASE_WOOD.hp,
    mass: round3((width * height / 1_000) * BASE_WOOD.massMultiplier),
    rotation: round3(rotation),
    structuralRestRotation: round3(rotation),
    architectureRole: raw.architectureRole,
    architectureTheme: transform.realm,
    ...(raw.critical ? { critical: true } : {}),
    ...(raw.cableAnchor ? { cableAnchor: true } : {}),
    ...(raw.counterweight ? { counterweight: true } : {}),
    ...(raw.ballast ? { ballast: true } : {}),
    ...(raw.reflective ? { reflective: true } : {}),
  }
}

function blockBounds(block) {
  const bounds = rawBounds(block)
  return Object.freeze(Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, round3(value)])))
}

function combinedBounds(blocks) {
  const bounds = blocks.map(blockBounds)
  const left = Math.min(...bounds.map((entry) => entry.left))
  const right = Math.max(...bounds.map((entry) => entry.right))
  const top = Math.min(...bounds.map((entry) => entry.top))
  const bottom = Math.max(...bounds.map((entry) => entry.bottom))
  return Object.freeze({
    left: round3(left), right: round3(right), top: round3(top), bottom: round3(bottom),
    width: round3(right - left), height: round3(bottom - top),
  })
}

/**
 * Builds fresh, mutable block descriptors so the existing material pass may
 * recolor and rebalance them. The accompanying metadata is frozen and safe to
 * retain in generated-level diagnostics.
 */
export function buildSpecialArchitectureTemplate({
  profileId,
  stage = null,
  groundY = 520,
  originX = 820,
  seed = 0,
} = {}) {
  const profile = SPECIAL_ARCHITECTURE_PROFILE_MAP[profileId]
  if (!profile) throw new RangeError(`Unknown special architecture profile: ${profileId}`)
  const stageNumber = clamp(Math.floor(finiteNumber(stage?.number ?? stage, profile.authoredStage)), 1, 4)
  const normalizedGroundY = finiteNumber(groundY, NaN)
  const normalizedOriginX = finiteNumber(originX, NaN)
  if (![normalizedGroundY, normalizedOriginX].every(Number.isFinite)) {
    throw new TypeError('groundY and originX must be finite numbers')
  }
  const hash = profileHash(profileId, seed)
  const direction = hash & 1 ? -1 : 1
  const jitter = ((hash >>> 8) % 13) - 6
  const scale = 1 + (stageNumber - 1) * 0.045
  const family = SPECIAL_ARCHITECTURE_FAMILIES[profile.realm]
  const rawBlocks = VARIANT_BUILDERS[profile.variant]()
    .filter((block) => block.minStage <= stageNumber)
  addDifficultyAnnex(rawBlocks, stageNumber, direction)
  const blocks = rawBlocks.map((block) => materialize(block, {
    originX: normalizedOriginX,
    groundY: normalizedGroundY,
    direction,
    jitter,
    scale,
    realm: profile.realm,
  }))
  const variant = family.variants[profile.variant]
  const bounds = combinedBounds(blocks)
  const metadata = deepFreeze({
    version: 1,
    profileId,
    realm: profile.realm,
    campaignId: family.campaignId,
    familyTitle: family.title,
    variant: profile.variant,
    variantTitle: variant.title,
    silhouette: variant.silhouette,
    authoredStage: profile.authoredStage,
    stage: stageNumber,
    difficultyTier: stageNumber,
    scale: round3(scale),
    mirrored: direction < 0,
    weakPointCount: blocks.filter((block) => block.critical).length,
    diagonalCount: blocks.filter((block) => Math.abs(block.rotation) > 0.01).length,
    bounds,
  })
  return { profileId, stage: stageNumber, groundY: normalizedGroundY, metadata, blocks }
}

export function specialArchitectureProfileIds() {
  return Object.freeze(Object.keys(SPECIAL_ARCHITECTURE_PROFILE_MAP))
}
