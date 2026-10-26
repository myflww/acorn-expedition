// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

/**
 * Authored physical identities for the eighteen main-campaign encounters.
 *
 * The base solver still owns collision-safe posts, beams, courts and family
 * modules.  These records change the actual tower plan, proportions, offsets,
 * landmark piece and construction palette so two story chapters cannot fall
 * back to the same visible stack with a different background label.
 */

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

export const CONSTRUCTION_MATERIALS = deepFreeze({
  'canvas-screen': {
    name: '风帆布',
    visual: {
      motif: 'cross-laced-fabric',
      fill: '#d8c59b', shadow: '#9f7b58', outline: '#3e2b22',
      line: '#47707b', highlight: '#f6edd5', accent: '#9a643c', secondary: '#879a78',
    },
    baseMaterial: 'wood',
    allowedBaseMaterials: ['wood'],
    hpMultiplier: 0.45,
    massMultiplier: 0.38,
    frictionMultiplier: 0.78,
    supportMultiplier: 0.52,
    angularDampingMultiplier: 0.72,
    restitutionMultiplier: 1.25,
    windDragMultiplier: 1.85,
    windTippingMultiplier: 1.45,
    armorHp: 0,
    soundMaterial: 'wood',
    scoreBonus: 15,
    jointPolicy: 'none',
    discoveryId: 'object:canvas-screen',
  },
  'resin-timber': {
    name: '树脂木',
    visual: {
      motif: 'resin-drips-leaf',
      fill: '#b87435', shadow: '#754224', outline: '#3e2b22',
      line: '#6b3d22', highlight: '#f4c56e', accent: '#e0aa3f', secondary: '#728b55',
    },
    baseMaterial: 'wood',
    allowedBaseMaterials: ['wood'],
    hpMultiplier: 1.55,
    massMultiplier: 1.12,
    frictionMultiplier: 1.28,
    supportMultiplier: 1.18,
    angularDampingMultiplier: 1.35,
    restitutionMultiplier: 0.62,
    windDragMultiplier: 0.88,
    windTippingMultiplier: 0.82,
    armorHp: 0,
    soundMaterial: 'wood',
    scoreBonus: 35,
    // Resin is a material identity, not a late-campaign nail skin. Any real
    // wood contact that touches a resin member receives its own adhesive bond,
    // even before the royal nail system is introduced.
    jointPolicy: 'adhesive',
    clusterPlacement: true,
    jointProfile: {
      kind: 'resin-bond', priority: 1, autoRetain: true,
      strength: 12, bearingAllowance: 22, breakDistance: 18,
      stiffness: 0.3, velocityDamping: 0.2, angularStiffness: 0.045,
      damageScale: 0.4,
    },
    discoveryId: 'object:resin-timber',
  },
  'packed-earth': {
    name: '根土夯砖',
    visual: {
      motif: 'staggered-bricks-root-leaf',
      fill: '#9e6849', shadow: '#6b4935', outline: '#3e2b22',
      line: '#4e5556', highlight: '#c99872', accent: '#728b55', secondary: '#6d523b',
    },
    baseMaterial: 'wood',
    allowedBaseMaterials: ['wood'],
    hpMultiplier: 1.65,
    massMultiplier: 1.48,
    frictionMultiplier: 1.22,
    supportMultiplier: 1.12,
    angularDampingMultiplier: 1.18,
    restitutionMultiplier: 0.72,
    windDragMultiplier: 0.76,
    windTippingMultiplier: 0.72,
    armorHp: 0,
    soundMaterial: 'stone',
    hardMaterial: true,
    suppressFlame: true,
    scoreBonus: 45,
    jointPolicy: 'rooted',
    clusterPlacement: true,
    jointProfile: {
      kind: 'root-bond', priority: 2, autoRetain: true,
      strength: 16, bearingAllowance: 30, breakDistance: 16,
      stiffness: 0.35, velocityDamping: 0.24, angularStiffness: 0.055,
      damageScale: 0.28,
    },
    discoveryId: 'object:packed-earth',
  },
  'resin-glass': {
    name: '松脂晶板',
    visual: {
      motif: 'gold-bands-glint-spark',
      fill: '#77bdb3', shadow: '#397c78', outline: '#3e2b22',
      line: '#47707b', highlight: '#ffffff', accent: '#e0aa3f', secondary: '#f5c95f',
    },
    baseMaterial: 'ice',
    allowedBaseMaterials: ['wood', 'ice'],
    hpMultiplier: 1.85,
    massMultiplier: 1.3,
    frictionMultiplier: 1.7,
    supportMultiplier: 1.42,
    angularDampingMultiplier: 1.3,
    restitutionMultiplier: 1.7,
    windDragMultiplier: 0.94,
    windTippingMultiplier: 0.88,
    armorHp: 0,
    soundMaterial: 'glass',
    suppressFlame: true,
    scoreBonus: 55,
    suppressIceSlow: true,
    jointPolicy: 'none',
    discoveryId: 'object:resin-glass',
  },
  'leaf-iron-plate': {
    name: '叶铁护板',
    visual: {
      motif: 'shield-ribs-double-leaf',
      fill: '#3f6259', shadow: '#263e3a', outline: '#3e2b22',
      line: '#d8dfbd', highlight: '#718d79', accent: '#f2b84d', secondary: '#728b55',
    },
    baseMaterial: null,
    allowedBaseMaterials: ['wood', 'stone'],
    hpMultiplier: 1.08,
    massMultiplier: 1.34,
    frictionMultiplier: 1.06,
    supportMultiplier: 1.2,
    angularDampingMultiplier: 1.42,
    restitutionMultiplier: 0.7,
    windDragMultiplier: 0.72,
    windTippingMultiplier: 0.62,
    armorHp: 2,
    soundMaterial: 'stone',
    hardMaterial: true,
    scoreBonus: 80,
    jointPolicy: 'clamped',
    clusterPlacement: true,
    jointProfile: {
      kind: 'iron-clamp', priority: 3, autoRetain: true,
      strength: 18, bearingAllowance: 38, breakDistance: 14,
      stiffness: 0.42, velocityDamping: 0.28, angularStiffness: 0.068,
      damageScale: 0.22,
    },
    discoveryId: 'object:leaf-iron-plate',
  },
})

const frontier = 'frontier-towers'
const bridge = 'asymmetric-bridge-gate'
const rock = 'triangular-rock-fort'
const royal = 'royal-stone-city'

const BUILDING_FORM_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u

const BUILDING_CATEGORIES = new Set([
  'agricultural', 'border', 'wind', 'bridge', 'military', 'industrial',
  'frost', 'infrastructure', 'royal',
])

const SILHOUETTE_SYMMETRIES = new Set(['symmetric', 'asymmetric', 'stepped'])
const MECHANISM_PHYSICS_KINDS = new Set(['rotor', 'body', 'visual'])

function silhouetteMass(id, kind, xRatio, widthRatio, heightRatio, baseRatio = 0) {
  return { id, kind, xRatio, widthRatio, heightRatio, baseRatio }
}

function silhouetteRoof(kind, fromXRatio, toXRatio, elevationRatio, pitch = 0) {
  return { kind, fromXRatio, toXRatio, elevationRatio, pitch }
}

function silhouetteConnection(kind, fromMass, toMass, elevationRatio, openBelow = false) {
  return { kind, fromMass, toMass, elevationRatio, openBelow }
}

function silhouetteOpening(kind, xRatio, widthRatio, heightRatio, baseRatio = 0) {
  return { kind, xRatio, widthRatio, heightRatio, baseRatio }
}

function silhouetteWing(side, kind, widthRatio, heightRatio) {
  return { side, kind, widthRatio, heightRatio }
}

function silhouetteMechanism(
  mechanism,
  xRatio,
  yRatio,
  scale = 1,
  { hostMassId = null, hostFeature = null, physicsKind, blocksBirds } = {},
) {
  return {
    mechanism,
    xRatio,
    yRatio,
    scale,
    hostMassId,
    hostFeature,
    physicsKind,
    blocksBirds,
  }
}

function silhouetteSpec({
  composition,
  spanRatio,
  symmetry,
  groundProfile,
  massing,
  roofSegments,
  connections = [],
  openings = [],
  wings = [],
  mechanismAnchors = [],
}) {
  return {
    composition,
    footprint: { spanRatio, symmetry, groundProfile },
    massing,
    roofSegments,
    connections,
    openings,
    wings,
    mechanismAnchors,
  }
}

/**
 * Normalized silhouette contracts. Horizontal coordinates run from the left
 * edge (0) to the right edge (1); vertical ratios rise from the ground (0).
 * They deliberately describe masses, voids and cross-building connections,
 * allowing physics and Canvas renderers to agree on a recognizable complete
 * building without importing one another.
 */
export const COMPLETE_BUILDING_SILHOUETTES = deepFreeze({
  'gabled-granary': silhouetteSpec({
    composition: 'single-raised-barn', spanRatio: 0.48, symmetry: 'symmetric', groundProfile: 'piered',
    massing: [silhouetteMass('grain-house', 'raised-barn', 0.5, 0.72, 0.5, 0.14)],
    roofSegments: [
      silhouetteRoof('gable-left', 0.14, 0.5, 0.72, 0.62),
      silhouetteRoof('gable-right', 0.5, 0.86, 0.72, -0.62),
    ],
    openings: [silhouetteOpening('granary-door', 0.5, 0.22, 0.3, 0.14)],
  }),
  'lean-to-loading-shed': silhouetteSpec({
    composition: 'asymmetric-loading-shed', spanRatio: 0.62, symmetry: 'asymmetric', groundProfile: 'split-piers',
    massing: [
      silhouetteMass('loading-deck', 'raised-loading-platform', 0.25, 0.34, 0.25, 0.08),
      silhouetteMass('store-bay', 'enclosed-store', 0.66, 0.44, 0.52, 0.1),
    ],
    roofSegments: [silhouetteRoof('single-slope-canopy', 0.1, 0.9, 0.68, -0.3)],
    connections: [silhouetteConnection('loading-sill', 'loading-deck', 'store-bay', 0.28, true)],
    openings: [silhouetteOpening('store-door', 0.67, 0.18, 0.34, 0.1)],
    wings: [silhouetteWing('left', 'loading-ramp', 0.18, 0.16)],
    mechanismAnchors: [silhouetteMechanism('loading-ramp', 0.08, 0.09, 0.9, {
      hostMassId: 'loading-deck', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'terraced-checkpoint': silhouetteSpec({
    composition: 'stepped-hillside-checkpoint', spanRatio: 0.68, symmetry: 'stepped', groundProfile: 'terraced',
    massing: [
      silhouetteMass('lower-retaining-wall', 'retaining-bastion', 0.3, 0.42, 0.27),
      silhouetteMass('upper-gatehouse', 'terraced-gatehouse', 0.69, 0.34, 0.44, 0.27),
    ],
    roofSegments: [silhouetteRoof('upper-flat-cap', 0.53, 0.86, 0.74)],
    connections: [silhouetteConnection('switchback-stair', 'lower-retaining-wall', 'upper-gatehouse', 0.3, true)],
    openings: [silhouetteOpening('toll-door', 0.69, 0.16, 0.3, 0.27)],
    wings: [silhouetteWing('left', 'retaining-terrace', 0.24, 0.24)],
    mechanismAnchors: [silhouetteMechanism('switchback-ramp', 0.48, 0.28, 1, {
      hostMassId: 'lower-retaining-wall', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'tripod-windmill-watch': silhouetteSpec({
    composition: 'tripod-windmill-tower', spanRatio: 0.58, symmetry: 'symmetric', groundProfile: 'splayed-feet',
    massing: [
      silhouetteMass('tripod-base', 'splayed-watch-frame', 0.5, 0.46, 0.56),
      silhouetteMass('mill-head', 'windmill-head', 0.5, 0.26, 0.22, 0.56),
      silhouetteMass('back-store', 'wind-sheltered-store', 0.76, 0.22, 0.25),
    ],
    roofSegments: [
      silhouetteRoof('mill-cap-left', 0.37, 0.5, 0.84, 0.48),
      silhouetteRoof('mill-cap-right', 0.5, 0.63, 0.84, -0.48),
    ],
    connections: [silhouetteConnection('axle-seat', 'tripod-base', 'mill-head', 0.62, true)],
    openings: [silhouetteOpening('open-tripod-bay', 0.5, 0.3, 0.47)],
    wings: [silhouetteWing('right', 'back-store', 0.24, 0.26)],
    mechanismAnchors: [
      silhouetteMechanism('wind-rotor', 0.5, 0.69, 1.3, {
        hostMassId: 'mill-head', physicsKind: 'rotor', blocksBirds: true,
      }),
      silhouetteMechanism('weather-vane', 0.62, 0.89, 0.7, {
        hostMassId: 'mill-head', physicsKind: 'visual', blocksBirds: false,
      }),
    ],
  }),
  'suspension-freight-bridge': silhouetteSpec({
    composition: 'twin-bridgehead-suspension-span', spanRatio: 0.88, symmetry: 'symmetric', groundProfile: 'ballasted-abutments',
    massing: [
      silhouetteMass('left-bridgehead', 'bridgehead-tower', 0.14, 0.2, 0.56),
      silhouetteMass('bridge-deck', 'suspended-deck', 0.5, 0.58, 0.1, 0.42),
      silhouetteMass('right-bridgehead', 'bridgehead-tower', 0.86, 0.2, 0.56),
    ],
    roofSegments: [silhouetteRoof('open-suspension-deck', 0.14, 0.86, 0.53)],
    connections: [
      silhouetteConnection('left-suspension-cable', 'left-bridgehead', 'bridge-deck', 0.64, true),
      silhouetteConnection('right-suspension-cable', 'right-bridgehead', 'bridge-deck', 0.64, true),
    ],
    openings: [silhouetteOpening('bridge-under-span', 0.5, 0.52, 0.4)],
    wings: [
      silhouetteWing('left', 'stone-abutment', 0.18, 0.22),
      silhouetteWing('right', 'stone-abutment', 0.18, 0.22),
    ],
    mechanismAnchors: [
      silhouetteMechanism('freight-cable', 0.5, 0.67, 1.15, {
        hostMassId: 'bridge-deck', physicsKind: 'visual', blocksBirds: false,
      }),
      silhouetteMechanism('hoist', 0.19, 0.61, 0.8, {
        hostMassId: 'left-bridgehead', physicsKind: 'body', blocksBirds: true,
      }),
    ],
  }),
  'twin-tower-barbican': silhouetteSpec({
    composition: 'twin-gatehouse-and-rear-court', spanRatio: 0.82, symmetry: 'symmetric', groundProfile: 'continuous-plinth',
    massing: [
      silhouetteMass('left-gate-tower', 'gatehouse-tower', 0.2, 0.25, 0.7),
      silhouetteMass('central-gate', 'portcullis-bay', 0.5, 0.3, 0.46),
      silhouetteMass('right-gate-tower', 'gatehouse-tower', 0.8, 0.25, 0.7),
      silhouetteMass('rear-court', 'command-platform', 0.5, 0.36, 0.23, 0.47),
    ],
    roofSegments: [
      silhouetteRoof('left-battlement', 0.08, 0.32, 0.75),
      silhouetteRoof('rear-command-cap', 0.34, 0.66, 0.75),
      silhouetteRoof('right-battlement', 0.68, 0.92, 0.75),
    ],
    connections: [
      silhouetteConnection('gate-lintel-left', 'left-gate-tower', 'central-gate', 0.49, false),
      silhouetteConnection('gate-lintel-right', 'central-gate', 'right-gate-tower', 0.49, false),
    ],
    openings: [silhouetteOpening('barbican-gate', 0.5, 0.24, 0.42)],
    wings: [
      silhouetteWing('left', 'curtain-wall', 0.16, 0.34),
      silhouetteWing('right', 'curtain-wall', 0.16, 0.34),
    ],
    mechanismAnchors: [silhouetteMechanism('portcullis', 0.5, 0.24, 1, {
      hostMassId: 'central-gate', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'a-frame-sorting-gantry': silhouetteSpec({
    composition: 'wide-a-frame-industrial-yard', spanRatio: 0.8, symmetry: 'asymmetric', groundProfile: 'wide-sill',
    massing: [
      silhouetteMass('left-gantry-leg', 'a-frame-leg', 0.25, 0.13, 0.62),
      silhouetteMass('gantry-boom', 'overhead-crane-beam', 0.5, 0.62, 0.1, 0.57),
      silhouetteMass('right-gantry-leg', 'a-frame-leg', 0.71, 0.13, 0.62),
      silhouetteMass('log-crib', 'timber-storage-bin', 0.86, 0.23, 0.3),
    ],
    roofSegments: [silhouetteRoof('open-gantry-beam', 0.17, 0.82, 0.69)],
    connections: [
      silhouetteConnection('left-knee-brace', 'left-gantry-leg', 'gantry-boom', 0.55, true),
      silhouetteConnection('right-knee-brace', 'gantry-boom', 'right-gantry-leg', 0.55, true),
    ],
    openings: [silhouetteOpening('sorting-work-bay', 0.48, 0.42, 0.53)],
    wings: [silhouetteWing('right', 'log-crib', 0.25, 0.3)],
    mechanismAnchors: [
      silhouetteMechanism('sorting-crane', 0.62, 0.68, 1.05, {
        hostMassId: 'right-gantry-leg', physicsKind: 'body', blocksBirds: true,
      }),
      silhouetteMechanism('pulley', 0.51, 0.57, 0.75, {
        hostMassId: 'right-gantry-leg', physicsKind: 'body', blocksBirds: true,
      }),
    ],
  }),
  'sawwheel-workshop': silhouetteSpec({
    composition: 'gabled-workshop-with-wheel-bay', spanRatio: 0.76, symmetry: 'asymmetric', groundProfile: 'resin-sill',
    massing: [
      silhouetteMass('workshop-shell', 'gabled-workshop', 0.43, 0.58, 0.57),
      silhouetteMass('sawwheel-bay', 'wheel-house', 0.81, 0.24, 0.43),
      silhouetteMass('timber-chute', 'feed-chute', 0.11, 0.2, 0.2),
    ],
    roofSegments: [
      silhouetteRoof('workshop-gable-left', 0.14, 0.43, 0.72, 0.55),
      silhouetteRoof('workshop-gable-right', 0.43, 0.72, 0.72, -0.55),
      silhouetteRoof('wheel-bay-lean-to', 0.7, 0.93, 0.5, -0.18),
    ],
    connections: [silhouetteConnection('belt-housing', 'workshop-shell', 'sawwheel-bay', 0.42, false)],
    openings: [silhouetteOpening('workshop-door', 0.4, 0.19, 0.33)],
    wings: [
      silhouetteWing('left', 'timber-feed-chute', 0.2, 0.2),
      silhouetteWing('right', 'wheel-house', 0.24, 0.44),
    ],
    mechanismAnchors: [
      silhouetteMechanism('sawwheel', 0.81, 0.27, 1.1, {
        hostMassId: 'sawwheel-bay', physicsKind: 'rotor', blocksBirds: true,
      }),
      silhouetteMechanism('belt-drive', 0.65, 0.43, 0.9, {
        hostMassId: 'sawwheel-bay', physicsKind: 'visual', blocksBirds: false,
      }),
    ],
  }),
  'counterweight-lift-station': silhouetteSpec({
    composition: 'unequal-lift-towers-and-transfer-bridge', spanRatio: 0.84, symmetry: 'asymmetric', groundProfile: 'split-footings',
    massing: [
      silhouetteMass('lift-shaft', 'tall-lift-tower', 0.2, 0.23, 0.82),
      silhouetteMass('transfer-deck', 'upper-transfer-bridge', 0.48, 0.48, 0.1, 0.59),
      silhouetteMass('station-tower', 'medium-station-tower', 0.72, 0.25, 0.64),
      silhouetteMass('counterweight-tower', 'counterweight-frame', 0.91, 0.14, 0.48),
    ],
    roofSegments: [
      silhouetteRoof('lift-headhouse', 0.08, 0.32, 0.88),
      silhouetteRoof('station-headhouse', 0.6, 0.84, 0.7),
    ],
    connections: [silhouetteConnection('transfer-bridge', 'lift-shaft', 'station-tower', 0.64, true)],
    openings: [silhouetteOpening('transfer-underpass', 0.48, 0.3, 0.56)],
    wings: [silhouetteWing('right', 'counterweight-frame', 0.16, 0.5)],
    mechanismAnchors: [
      silhouetteMechanism('freight-lift', 0.2, 0.42, 0.95, {
        hostMassId: 'lift-shaft', physicsKind: 'body', blocksBirds: true,
      }),
      silhouetteMechanism('counterweight', 0.91, 0.3, 0.8, {
        hostMassId: 'counterweight-tower', physicsKind: 'body', blocksBirds: true,
      }),
    ],
  }),
  'icewood-lock-gate': silhouetteSpec({
    composition: 'interlocking-frost-gate', spanRatio: 0.78, symmetry: 'symmetric', groundProfile: 'froststone-feet',
    massing: [
      silhouetteMass('left-lock-bastion', 'lock-bastion', 0.18, 0.28, 0.72),
      silhouetteMass('keystone-gate', 'icewood-gate', 0.5, 0.38, 0.57),
      silhouetteMass('right-lock-bastion', 'lock-bastion', 0.82, 0.28, 0.72),
    ],
    roofSegments: [
      silhouetteRoof('left-frost-cap', 0.05, 0.31, 0.78, 0.08),
      silhouetteRoof('lock-cap', 0.31, 0.69, 0.66),
      silhouetteRoof('right-frost-cap', 0.69, 0.95, 0.78, -0.08),
    ],
    connections: [
      silhouetteConnection('left-ice-tenon', 'left-lock-bastion', 'keystone-gate', 0.52, false),
      silhouetteConnection('right-ice-tenon', 'keystone-gate', 'right-lock-bastion', 0.52, false),
    ],
    openings: [silhouetteOpening('lock-gate-opening', 0.5, 0.27, 0.46)],
    wings: [
      silhouetteWing('left', 'froststone-buttress', 0.16, 0.38),
      silhouetteWing('right', 'froststone-buttress', 0.16, 0.38),
    ],
    mechanismAnchors: [silhouetteMechanism('frost-lock', 0.5, 0.48, 1.05, {
      hostMassId: 'keystone-gate', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'quarry-terrace-city': silhouetteSpec({
    composition: 'ascending-quarry-terraces', spanRatio: 0.86, symmetry: 'stepped', groundProfile: 'rock-cut-steps',
    massing: [
      silhouetteMass('lower-terrace', 'retaining-terrace', 0.18, 0.32, 0.26),
      silhouetteMass('middle-terrace', 'retaining-terrace', 0.48, 0.32, 0.3, 0.24),
      silhouetteMass('upper-terrace', 'ore-platform', 0.77, 0.3, 0.31, 0.49),
      silhouetteMass('ore-hoist', 'hoist-tower', 0.81, 0.15, 0.2, 0.76),
    ],
    roofSegments: [
      silhouetteRoof('lower-quarry-cap', 0.03, 0.34, 0.3),
      silhouetteRoof('middle-quarry-cap', 0.33, 0.63, 0.58),
      silhouetteRoof('upper-quarry-cap', 0.63, 0.92, 0.84),
    ],
    connections: [
      silhouetteConnection('lower-switchback', 'lower-terrace', 'middle-terrace', 0.29, true),
      silhouetteConnection('upper-switchback', 'middle-terrace', 'upper-terrace', 0.55, true),
    ],
    openings: [silhouetteOpening('ore-chute-void', 0.64, 0.16, 0.42, 0.1)],
    wings: [silhouetteWing('right', 'hoist-frame', 0.18, 0.52)],
    mechanismAnchors: [
      silhouetteMechanism('ore-hoist', 0.81, 0.88, 0.85, {
        hostMassId: 'ore-hoist', physicsKind: 'body', blocksBirds: true,
      }),
      silhouetteMechanism('ore-chute', 0.64, 0.42, 0.95, {
        hostMassId: 'upper-terrace', physicsKind: 'body', blocksBirds: true,
      }),
    ],
  }),
  'avalanche-fort': silhouetteSpec({
    composition: 'buttressed-fort-and-rear-keep', spanRatio: 0.9, symmetry: 'symmetric', groundProfile: 'buttressed-plinth',
    massing: [
      silhouetteMass('left-bastion', 'corner-bastion', 0.15, 0.25, 0.72),
      silhouetteMass('curtain-wall', 'double-curtain-wall', 0.5, 0.5, 0.57),
      silhouetteMass('right-bastion', 'corner-bastion', 0.85, 0.25, 0.72),
      silhouetteMass('rear-keep', 'command-keep', 0.58, 0.29, 0.29, 0.56),
    ],
    roofSegments: [
      silhouetteRoof('left-snow-battlement', 0.03, 0.28, 0.78),
      silhouetteRoof('rear-keep-cap', 0.43, 0.72, 0.9, 0.08),
      silhouetteRoof('right-snow-battlement', 0.72, 0.97, 0.78),
    ],
    connections: [
      silhouetteConnection('left-curtain-ring', 'left-bastion', 'curtain-wall', 0.55, false),
      silhouetteConnection('right-curtain-ring', 'curtain-wall', 'right-bastion', 0.55, false),
    ],
    openings: [silhouetteOpening('froststone-arch', 0.5, 0.25, 0.45)],
    wings: [
      silhouetteWing('left', 'avalanche-buttress', 0.17, 0.44),
      silhouetteWing('right', 'avalanche-buttress', 0.17, 0.44),
    ],
    mechanismAnchors: [silhouetteMechanism('ice-keystone', 0.5, 0.5, 1, {
      hostMassId: 'curtain-wall', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'royal-viaduct': silhouetteSpec({
    composition: 'multi-arch-royal-viaduct', spanRatio: 0.94, symmetry: 'stepped', groundProfile: 'deep-piers',
    massing: [
      silhouetteMass('pier-a', 'viaduct-pier', 0.12, 0.1, 0.5),
      silhouetteMass('pier-b', 'viaduct-pier', 0.38, 0.1, 0.5),
      silhouetteMass('pier-c', 'viaduct-pier', 0.64, 0.1, 0.5),
      silhouetteMass('pier-d', 'viaduct-pier', 0.88, 0.1, 0.5),
      silhouetteMass('roadway', 'elevated-roadway', 0.5, 0.88, 0.11, 0.5),
      silhouetteMass('tollhouse', 'royal-tollhouse', 0.68, 0.22, 0.25, 0.61),
    ],
    roofSegments: [
      silhouetteRoof('viaduct-roadway', 0.04, 0.96, 0.63),
      silhouetteRoof('tollhouse-cap', 0.57, 0.79, 0.9, 0.18),
    ],
    connections: [
      silhouetteConnection('arch-a', 'pier-a', 'pier-b', 0.48, true),
      silhouetteConnection('arch-b', 'pier-b', 'pier-c', 0.48, true),
      silhouetteConnection('arch-c', 'pier-c', 'pier-d', 0.48, true),
    ],
    openings: [
      silhouetteOpening('viaduct-arch-a', 0.25, 0.16, 0.43),
      silhouetteOpening('viaduct-arch-b', 0.51, 0.16, 0.43),
      silhouetteOpening('viaduct-arch-c', 0.76, 0.15, 0.43),
    ],
    wings: [silhouetteWing('right', 'mile-standard', 0.1, 0.34)],
    mechanismAnchors: [silhouetteMechanism('elevated-roadway', 0.5, 0.58, 1, {
      hostFeature: 'continuous-road', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'granary-redoubt': silhouetteSpec({
    composition: 'continuous-wall-and-three-redoubts', spanRatio: 0.94, symmetry: 'symmetric', groundProfile: 'continuous-plinth',
    massing: [
      silhouetteMass('left-redoubt', 'redoubt-tower', 0.15, 0.22, 0.65),
      silhouetteMass('central-redoubt', 'redoubt-tower', 0.5, 0.24, 0.72),
      silhouetteMass('right-redoubt', 'redoubt-tower', 0.85, 0.22, 0.65),
      silhouetteMass('continuous-wall', 'granary-rampart', 0.5, 0.82, 0.38),
      silhouetteMass('covered-gallery', 'granary-walk', 0.5, 0.7, 0.15, 0.38),
    ],
    roofSegments: [
      silhouetteRoof('left-redoubt-cap', 0.04, 0.26, 0.7),
      silhouetteRoof('covered-granary-roof', 0.18, 0.82, 0.57),
      silhouetteRoof('right-redoubt-cap', 0.74, 0.96, 0.7),
    ],
    connections: [
      silhouetteConnection('left-covered-gallery', 'left-redoubt', 'central-redoubt', 0.49, true),
      silhouetteConnection('right-covered-gallery', 'central-redoubt', 'right-redoubt', 0.49, true),
    ],
    openings: [silhouetteOpening('convoy-gate', 0.5, 0.2, 0.33)],
    wings: [
      silhouetteWing('left', 'granary-wall-return', 0.12, 0.3),
      silhouetteWing('right', 'granary-wall-return', 0.12, 0.3),
    ],
    mechanismAnchors: [silhouetteMechanism('signal-beacon', 0.85, 0.73, 0.75, {
      hostMassId: 'right-redoubt', physicsKind: 'visual', blocksBirds: false,
    })],
  }),
  'outer-castle-gate': silhouetteSpec({
    composition: 'complete-outer-castle-gate', spanRatio: 0.98, symmetry: 'symmetric', groundProfile: 'citadel-plinth',
    massing: [
      silhouetteMass('left-corner-tower', 'castle-corner-tower', 0.12, 0.22, 0.84),
      silhouetteMass('left-curtain', 'inner-curtain-wall', 0.31, 0.2, 0.52),
      silhouetteMass('central-gatehouse', 'great-gatehouse', 0.5, 0.34, 0.72),
      silhouetteMass('right-curtain', 'inner-curtain-wall', 0.69, 0.2, 0.52),
      silhouetteMass('right-corner-tower', 'castle-corner-tower', 0.88, 0.22, 0.84),
    ],
    roofSegments: [
      silhouetteRoof('left-crenellation', 0.02, 0.23, 0.9),
      silhouetteRoof('gatehouse-crenellation', 0.33, 0.67, 0.79),
      silhouetteRoof('right-crenellation', 0.77, 0.98, 0.9),
    ],
    connections: [
      silhouetteConnection('left-wall-ring', 'left-corner-tower', 'central-gatehouse', 0.5, false),
      silhouetteConnection('right-wall-ring', 'central-gatehouse', 'right-corner-tower', 0.5, false),
    ],
    openings: [silhouetteOpening('great-castle-arch', 0.5, 0.24, 0.52)],
    wings: [
      silhouetteWing('left', 'corner-tower-wing', 0.2, 0.84),
      silhouetteWing('right', 'corner-tower-wing', 0.2, 0.84),
    ],
    mechanismAnchors: [silhouetteMechanism('portcullis', 0.5, 0.28, 1.2, {
      hostFeature: 'portcullis', physicsKind: 'body', blocksBirds: true,
    })],
  }),
  'wind-engine-gate': silhouetteSpec({
    composition: 'mechanized-gate-and-wind-engine', spanRatio: 0.98, symmetry: 'asymmetric', groundProfile: 'machine-bed-plinth',
    massing: [
      silhouetteMass('wind-engine-tower', 'wind-engine-tower', 0.17, 0.25, 0.9),
      silhouetteMass('drawbridge-gatehouse', 'drawbridge-gatehouse', 0.5, 0.36, 0.72),
      silhouetteMass('drawbridge-leaf', 'drawbridge-leaf', 0.5, 0.28, 0.08, 0.2),
      silhouetteMass('counterweight-tower', 'counterweight-tower', 0.83, 0.25, 0.82),
    ],
    roofSegments: [
      silhouetteRoof('wind-engine-crown', 0.05, 0.29, 0.95),
      silhouetteRoof('gatehouse-cap', 0.32, 0.68, 0.79),
      silhouetteRoof('counterweight-cap', 0.71, 0.95, 0.88),
    ],
    connections: [
      silhouetteConnection('gear-gallery', 'wind-engine-tower', 'drawbridge-gatehouse', 0.64, true),
      silhouetteConnection('counterweight-gallery', 'drawbridge-gatehouse', 'counterweight-tower', 0.64, true),
    ],
    openings: [silhouetteOpening('drawbridge-gate', 0.5, 0.26, 0.53)],
    wings: [
      silhouetteWing('left', 'wind-engine-bed', 0.22, 0.42),
      silhouetteWing('right', 'counterweight-buttress', 0.2, 0.52),
    ],
    mechanismAnchors: [
      silhouetteMechanism('giant-windwheel', 0.17, 0.69, 1.45, {
        hostFeature: 'giant-windwheel-anchor', physicsKind: 'rotor', blocksBirds: true,
      }),
      silhouetteMechanism('drawbridge', 0.5, 0.2, 1.05, {
        hostFeature: 'lift-bridge', physicsKind: 'body', blocksBirds: true,
      }),
      silhouetteMechanism('counterweight', 0.83, 0.48, 0.95, {
        hostFeature: 'hanging-counterweight', physicsKind: 'body', blocksBirds: true,
      }),
    ],
  }),
  'arcaded-inner-court': silhouetteSpec({
    composition: 'three-depth-courtyard-and-keep', spanRatio: 0.94, symmetry: 'stepped', groundProfile: 'courtyard-plinth',
    massing: [
      silhouetteMass('forecourt-wall', 'low-forecourt-wall', 0.19, 0.32, 0.3),
      silhouetteMass('arcade-gallery', 'stone-arcade-gallery', 0.5, 0.5, 0.56),
      silhouetteMass('rear-command-keep', 'command-keep', 0.81, 0.28, 0.88),
    ],
    roofSegments: [
      silhouetteRoof('forecourt-parapet', 0.03, 0.34, 0.34),
      silhouetteRoof('arcade-parapet', 0.29, 0.7, 0.62),
      silhouetteRoof('keep-battlement', 0.68, 0.95, 0.94),
    ],
    connections: [
      silhouetteConnection('forecourt-passage', 'forecourt-wall', 'arcade-gallery', 0.29, true),
      silhouetteConnection('arcade-keep-gallery', 'arcade-gallery', 'rear-command-keep', 0.53, true),
    ],
    openings: [
      silhouetteOpening('forecourt-gate', 0.18, 0.15, 0.26),
      silhouetteOpening('arcade-bay-left', 0.42, 0.13, 0.43),
      silhouetteOpening('arcade-bay-right', 0.58, 0.13, 0.43),
    ],
    wings: [
      silhouetteWing('left', 'forecourt-return', 0.18, 0.3),
      silhouetteWing('right', 'command-keep', 0.28, 0.88),
    ],
  }),
  'throne-granary-citadel': silhouetteSpec({
    composition: 'citadel-keep-throne-and-domed-granary', spanRatio: 1, symmetry: 'symmetric', groundProfile: 'citadel-platform',
    massing: [
      silhouetteMass('left-guard-tower', 'royal-guard-tower', 0.1, 0.18, 0.83),
      silhouetteMass('citadel-keep', 'great-citadel-keep', 0.44, 0.34, 0.95),
      silhouetteMass('throne-bay', 'recessed-throne-bay', 0.48, 0.24, 0.45),
      silhouetteMass('royal-granary', 'domed-royal-granary', 0.72, 0.28, 0.68),
      silhouetteMass('right-guard-tower', 'royal-guard-tower', 0.91, 0.18, 0.83),
    ],
    roofSegments: [
      silhouetteRoof('left-guard-battlement', 0.01, 0.19, 0.89),
      silhouetteRoof('citadel-crown', 0.27, 0.61, 1),
      silhouetteRoof('granary-dome-left', 0.58, 0.72, 0.82, 0.7),
      silhouetteRoof('granary-dome-right', 0.72, 0.86, 0.82, -0.7),
      silhouetteRoof('right-guard-battlement', 0.82, 1, 0.89),
    ],
    connections: [
      silhouetteConnection('left-citadel-wall', 'left-guard-tower', 'citadel-keep', 0.58, false),
      silhouetteConnection('granary-gallery', 'citadel-keep', 'royal-granary', 0.58, true),
      silhouetteConnection('right-citadel-wall', 'royal-granary', 'right-guard-tower', 0.58, false),
    ],
    openings: [
      silhouetteOpening('throne-arch', 0.48, 0.2, 0.42),
      silhouetteOpening('locked-granary-gate', 0.72, 0.18, 0.44),
    ],
    wings: [
      silhouetteWing('left', 'guard-tower-wing', 0.18, 0.83),
      silhouetteWing('right', 'guard-tower-wing', 0.18, 0.83),
    ],
    mechanismAnchors: [silhouetteMechanism('royal-granary-gate', 0.72, 0.26, 1.2, {
      hostFeature: 'locked-granary-gate', physicsKind: 'body', blocksBirds: true,
    })],
  }),
})

function completeBuildingForm({
  name,
  category,
  towerForms,
  roof,
  wall,
  foundation,
  complexity,
  structuralSystem,
  supportPathCount,
  mechanisms = [],
  visualParts,
  silhouetteSpec,
}) {
  return {
    name,
    category,
    completeBuilding: true,
    towerForms,
    roof,
    wall,
    foundation,
    complexity,
    structuralSystem,
    supportPathCount,
    mechanisms,
    visualParts,
    silhouetteSpec,
  }
}

function catalogBuildingForm(formId, config) {
  const authoredSilhouette = COMPLETE_BUILDING_SILHOUETTES[formId]
  if (!authoredSilhouette) throw new RangeError(`Unknown complete building silhouette: ${formId}`)
  return completeBuildingForm({ ...config, silhouetteSpec: authoredSilhouette })
}

/**
 * Reusable complete-building vocabulary shared by the main campaign and the
 * endless selector. These are architectural systems, not decorative skins:
 * every entry names its foundation, load-bearing frame, envelope, roof and
 * visible mechanisms so a generator can construct a coherent whole instead
 * of repeating an arbitrary post/post/beam floor.
 */
export const COMPLETE_BUILDING_FORM_CATALOG = deepFreeze({
  'gabled-granary': catalogBuildingForm('gabled-granary', {
    name: '架空双坡粮仓', category: 'agricultural',
    towerForms: ['broad-granary-bay'], roof: 'gabled-timber', wall: 'timber-frame',
    foundation: 'stone-piers', complexity: 1, structuralSystem: 'braced-frame',
    supportPathCount: 1, visualParts: ['raised-deck', 'grain-bay', 'ridge-cap'],
  }),
  'lean-to-loading-shed': catalogBuildingForm('lean-to-loading-shed', {
    name: '偏置装卸棚', category: 'agricultural',
    towerForms: ['lean-to-loading-bay', 'raised-store-bay'], roof: 'lean-to-canopy',
    wall: 'canvas-clad-frame', foundation: 'timber-sill-and-piers', complexity: 1,
    structuralSystem: 'shed-frame', supportPathCount: 1, mechanisms: ['loading-ramp'],
    visualParts: ['loading-deck', 'rain-canopy', 'grain-sack-bay'],
  }),
  'terraced-checkpoint': catalogBuildingForm('terraced-checkpoint', {
    name: '顺坡层台驿卡', category: 'border',
    towerForms: ['terraced-gatehouse', 'retaining-bastion'], roof: 'stepped-flat',
    wall: 'timber-and-earth-retaining-wall', foundation: 'stepped-stone-footings',
    complexity: 2, structuralSystem: 'stepped-retaining-frame', supportPathCount: 2,
    mechanisms: ['switchback-ramp'], visualParts: ['retaining-steps', 'toll-hut', 'road-marker'],
  }),
  'tripod-windmill-watch': catalogBuildingForm('tripod-windmill-watch', {
    name: '风车三脚瞭望所', category: 'wind',
    towerForms: ['tripod-watch', 'windmill-head'], roof: 'windmill-cap',
    wall: 'open-braced-frame', foundation: 'splayed-stone-feet', complexity: 2,
    structuralSystem: 'tripod-braced-frame', supportPathCount: 2,
    mechanisms: ['wind-rotor', 'weather-vane'],
    visualParts: ['splayed-legs', 'rotor-hub', 'canvas-sails'],
  }),
  'suspension-freight-bridge': catalogBuildingForm('suspension-freight-bridge', {
    name: '风索运粮桥', category: 'bridge',
    towerForms: ['twin-bridgehead', 'hoist-tower'], roof: 'open-bridge-deck',
    wall: 'bridge-abutments', foundation: 'ballasted-stone-abutments', complexity: 2,
    structuralSystem: 'suspension-truss', supportPathCount: 2,
    mechanisms: ['freight-cable', 'hoist'],
    visualParts: ['bridgeheads', 'suspended-deck', 'hanging-grain-crate'],
  }),
  'twin-tower-barbican': catalogBuildingForm('twin-tower-barbican', {
    name: '黑松双塔瓮城', category: 'military',
    towerForms: ['twin-gatehouse', 'rear-command-court'], roof: 'crenellated-gatehouse',
    wall: 'packed-earth-curtain', foundation: 'continuous-stone-plinth', complexity: 3,
    structuralSystem: 'twin-gatehouse-frame', supportPathCount: 2,
    mechanisms: ['portcullis'], visualParts: ['gate-towers', 'central-gate', 'inner-court'],
  }),
  'a-frame-sorting-gantry': catalogBuildingForm('a-frame-sorting-gantry', {
    name: '原木分拣龙门架', category: 'industrial',
    towerForms: ['sorting-gantry', 'log-crib'], roof: 'open-gantry',
    wall: 'resin-timber-frame', foundation: 'wide-timber-sill', complexity: 3,
    structuralSystem: 'a-frame-gantry', supportPathCount: 2,
    mechanisms: ['sorting-crane', 'pulley'], visualParts: ['a-frame', 'crane-boom', 'log-bins'],
  }),
  'sawwheel-workshop': catalogBuildingForm('sawwheel-workshop', {
    name: '锯轮木工坊', category: 'industrial',
    towerForms: ['gabled-workshop', 'sawwheel-bay'], roof: 'gabled-workshop',
    wall: 'workshop-infill', foundation: 'resin-timber-sill', complexity: 3,
    structuralSystem: 'portal-frame', supportPathCount: 2,
    mechanisms: ['sawwheel', 'belt-drive'], visualParts: ['workshop-shell', 'sawwheel', 'timber-chute'],
  }),
  'counterweight-lift-station': catalogBuildingForm('counterweight-lift-station', {
    name: '树冠配重货梯站', category: 'industrial',
    towerForms: ['lift-shaft', 'counterweight-tower', 'upper-transfer-deck'],
    roof: 'counterweight-headhouse', wall: 'lift-shaft-frame',
    foundation: 'split-stone-and-timber-footings', complexity: 3,
    structuralSystem: 'counterweighted-frame', supportPathCount: 2,
    mechanisms: ['freight-lift', 'counterweight'],
    visualParts: ['unequal-towers', 'transfer-bridge', 'lift-cage'],
  }),
  'icewood-lock-gate': catalogBuildingForm('icewood-lock-gate', {
    name: '冰木咬合锁门', category: 'frost',
    towerForms: ['twin-lock-bastion', 'keystone-gate'], roof: 'interlocking-frost-cap',
    wall: 'icewood-dovetail-wall', foundation: 'froststone-feet', complexity: 4,
    structuralSystem: 'interlocking-gate-frame', supportPathCount: 2,
    mechanisms: ['frost-lock'], visualParts: ['stone-feet', 'ice-tenons', 'lock-crystal'],
  }),
  'quarry-terrace-city': catalogBuildingForm('quarry-terrace-city', {
    name: '冰矿阶城', category: 'frost',
    towerForms: ['quarry-terrace', 'ore-hoist', 'retaining-bastion'], roof: 'terraced-quarry',
    wall: 'stepped-masonry', foundation: 'rock-cut-terraces', complexity: 4,
    structuralSystem: 'terraced-retaining-frame', supportPathCount: 2,
    mechanisms: ['ore-hoist', 'ore-chute'], visualParts: ['switchback-ramp', 'ore-bin', 'ice-lanterns'],
  }),
  'avalanche-fort': catalogBuildingForm('avalanche-fort', {
    name: '黑松雪崩堡', category: 'military',
    towerForms: ['corner-bastions', 'rear-command-keep', 'central-arch'],
    roof: 'snow-shedding-battlement', wall: 'froststone-curtain',
    foundation: 'buttressed-stone-plinth', complexity: 4,
    structuralSystem: 'buttressed-fort', supportPathCount: 3,
    mechanisms: ['ice-keystone'], visualParts: ['double-curtain', 'arched-gate', 'command-platform'],
  }),
  'royal-viaduct': catalogBuildingForm('royal-viaduct', {
    name: '王家里程高架桥', category: 'infrastructure',
    towerForms: ['viaduct-pier', 'tollhouse', 'mile-standard'], roof: 'viaduct-roadway',
    wall: 'stone-arcade', foundation: 'deep-stone-piers', complexity: 4,
    structuralSystem: 'arch-viaduct', supportPathCount: 3,
    mechanisms: ['elevated-roadway'], visualParts: ['repeating-arches', 'tollhouse', 'royal-mile-marker'],
  }),
  'granary-redoubt': catalogBuildingForm('granary-redoubt', {
    name: '高地护粮堡', category: 'infrastructure',
    towerForms: ['three-redoubt-towers', 'covered-granary-walk'], roof: 'covered-granary-walk',
    wall: 'mixed-granary-rampart', foundation: 'continuous-stone-plinth', complexity: 4,
    structuralSystem: 'curtain-wall-redoubt', supportPathCount: 3,
    mechanisms: ['signal-beacon'], visualParts: ['continuous-wall', 'covered-gallery', 'watch-fires'],
  }),
  'outer-castle-gate': catalogBuildingForm('outer-castle-gate', {
    name: '王城外郭城门', category: 'royal',
    towerForms: ['corner-towers', 'central-gatehouse', 'inner-curtain-wall'],
    roof: 'crenellated-stone', wall: 'royal-masonry', foundation: 'continuous-stone-plinth',
    complexity: 5, structuralSystem: 'redundant-castle-frame', supportPathCount: 3,
    mechanisms: ['portcullis'], visualParts: ['corner-towers', 'great-arch', 'battlements'],
  }),
  'wind-engine-gate': catalogBuildingForm('wind-engine-gate', {
    name: '王城风机门阵', category: 'royal',
    towerForms: ['wind-engine-tower', 'counterweight-tower', 'drawbridge-gatehouse'],
    roof: 'wind-engine-crown', wall: 'mechanized-masonry', foundation: 'machine-bed-stone-plinth',
    complexity: 5, structuralSystem: 'geared-gatehouse', supportPathCount: 3,
    mechanisms: ['giant-windwheel', 'drawbridge', 'counterweight'],
    visualParts: ['windwheel', 'gear-room', 'drawbridge'],
  }),
  'arcaded-inner-court': catalogBuildingForm('arcaded-inner-court', {
    name: '将军三重内庭', category: 'royal',
    towerForms: ['forecourt-wall', 'arcade-gallery', 'rear-command-keep'],
    roof: 'arcaded-parapet', wall: 'inner-court-arcade', foundation: 'courtyard-stone-plinth',
    complexity: 5, structuralSystem: 'arcade-and-keep', supportPathCount: 3,
    visualParts: ['forecourt', 'arcade', 'command-keep'],
  }),
  'throne-granary-citadel': catalogBuildingForm('throne-granary-citadel', {
    name: '橡心王座粮仓城', category: 'royal',
    towerForms: ['citadel-keep', 'twin-guard-towers', 'domed-royal-granary'],
    roof: 'granary-dome', wall: 'citadel-masonry', foundation: 'citadel-stone-platform',
    complexity: 5, structuralSystem: 'citadel-core-and-wings', supportPathCount: 3,
    mechanisms: ['royal-granary-gate'],
    visualParts: ['great-keep', 'granary-dome', 'throne-bay'],
  }),
})

/**
 * Late-campaign physics authoring contract.
 *
 * Every rectangle is expressed inside the authored silhouette footprint:
 * - xRatio is the horizontal centre (0 = left, 1 = right)
 * - baseRatio rises from the ground
 * - widthRatio / heightRatio are normalized extents
 *
 * Rectangles may meet along a complete edge to transfer load, but must never
 * penetrate one another.  This is deliberately a different grammar from the
 * legacy towerFloors array: the solver can instantiate an actual bridge,
 * curtain wall, gatehouse, arcade or citadel from these pieces directly.
 */
function physicalRect(id, kind, xRatio, widthRatio, heightRatio, baseRatio, options) {
  return {
    id,
    kind,
    xRatio,
    widthRatio,
    heightRatio,
    baseRatio,
    role: options.role,
    material: options.material,
    towerIndex: options.towerIndex,
    moduleClass: options.moduleClass,
    massId: options.massId,
    massKind: options.massKind,
    ...(options.structuralSpine === true ? { structuralSpine: true } : {}),
    ...(Number.isFinite(options.rotation) ? { rotation: options.rotation } : {}),
    ...(options.feature ? { feature: options.feature } : {}),
  }
}

function authoredPhysicalBuilding(grammar, supportStrategy, requiredKinds, physicalModules) {
  return {
    physicalLayout: {
      version: 'normalized-rect-v1',
      coordinateSpace: 'silhouette-footprint',
      origin: 'ground-left',
      allowEdgeContact: true,
      grammar,
      supportStrategy,
      requiredKinds,
    },
    physicalModules,
  }
}

export const LATE_CAMPAIGN_PHYSICAL_LAYOUTS = deepFreeze({
  'royal-viaduct': authoredPhysicalBuilding(
    'four-pier-three-arch-viaduct',
    'Four deep piers bear three separate arch spandrels and one continuous elevated road.',
    ['bridge-pier', 'arch-spandrel', 'continuous-roadway', 'tollhouse-wall', 'tollhouse-roof'],
    [
      physicalRect('pier-a-body', 'bridge-pier', 0.12, 0.1, 0.5, 0, { role: 'support', material: 'stone', towerIndex: 0, moduleClass: 'masonry-pier', massId: 'pier-a', massKind: 'viaduct-pier' }),
      physicalRect('pier-b-body', 'bridge-pier', 0.38, 0.1, 0.5, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'masonry-pier', massId: 'pier-b', massKind: 'viaduct-pier' }),
      physicalRect('pier-c-body', 'bridge-pier', 0.64, 0.1, 0.5, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'masonry-pier', massId: 'pier-c', massKind: 'viaduct-pier' }),
      physicalRect('pier-d-body', 'bridge-pier', 0.88, 0.1, 0.5, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'masonry-pier', massId: 'pier-d', massKind: 'viaduct-pier' }),
      physicalRect('arch-span-a', 'arch-spandrel', 0.25, 0.16, 0.08, 0.42, { role: 'carrier', material: 'stone', towerIndex: 0, moduleClass: 'masonry-arch', massId: 'roadway', massKind: 'elevated-roadway', feature: 'three-arch-run' }),
      physicalRect('arch-span-b', 'arch-spandrel', 0.51, 0.16, 0.08, 0.42, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'masonry-arch', massId: 'roadway', massKind: 'elevated-roadway', feature: 'three-arch-run' }),
      physicalRect('arch-span-c', 'arch-spandrel', 0.76, 0.14, 0.08, 0.42, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'masonry-arch', massId: 'roadway', massKind: 'elevated-roadway', feature: 'three-arch-run' }),
      physicalRect('royal-road-deck', 'continuous-roadway', 0.5, 0.92, 0.1, 0.5, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'road-deck', massId: 'roadway', massKind: 'elevated-roadway', structuralSpine: true, feature: 'continuous-road' }),
      physicalRect('tollhouse-left-wall', 'tollhouse-wall', 0.6, 0.06, 0.18, 0.6, { role: 'wall', material: 'wood', towerIndex: 2, moduleClass: 'enclosed-building', massId: 'tollhouse', massKind: 'royal-tollhouse' }),
      physicalRect('tollhouse-right-wall', 'tollhouse-wall', 0.76, 0.06, 0.18, 0.6, { role: 'wall', material: 'wood', towerIndex: 2, moduleClass: 'enclosed-building', massId: 'tollhouse', massKind: 'royal-tollhouse' }),
      physicalRect('tollhouse-roof-cap', 'tollhouse-roof', 0.68, 0.22, 0.07, 0.78, { role: 'roof', material: 'wood', towerIndex: 2, moduleClass: 'roof-cap', massId: 'tollhouse', massKind: 'royal-tollhouse' }),
    ],
  ),
  'granary-redoubt': authoredPhysicalBuilding(
    'continuous-wall-three-redoubts',
    'Three independently founded redoubts are joined by wall fields and two covered gallery bays.',
    ['redoubt-core', 'continuous-wall-segment', 'convoy-gate-pier', 'covered-gallery-post', 'covered-gallery-roof'],
    [
      physicalRect('left-redoubt-core', 'redoubt-core', 0.15, 0.18, 0.6, 0, { role: 'support', material: 'stone', towerIndex: 0, moduleClass: 'redoubt', massId: 'left-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('left-redoubt-cap', 'redoubt-cap', 0.15, 0.22, 0.06, 0.6, { role: 'roof', material: 'stone', towerIndex: 0, moduleClass: 'battlement-cap', massId: 'left-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('central-gate-left-pier', 'convoy-gate-pier', 0.425, 0.07, 0.46, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'gatehouse', massId: 'central-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('central-gate-right-pier', 'convoy-gate-pier', 0.575, 0.07, 0.46, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'gatehouse', massId: 'central-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('central-gate-lintel', 'convoy-gate-lintel', 0.5, 0.22, 0.08, 0.46, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'gatehouse', massId: 'central-redoubt', massKind: 'redoubt-tower', structuralSpine: true, feature: 'convoy-gate' }),
      physicalRect('central-redoubt-upper', 'redoubt-core', 0.5, 0.16, 0.14, 0.54, { role: 'wall', material: 'stone', towerIndex: 1, moduleClass: 'redoubt', massId: 'central-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('central-redoubt-cap', 'redoubt-cap', 0.5, 0.2, 0.06, 0.68, { role: 'roof', material: 'stone', towerIndex: 1, moduleClass: 'battlement-cap', massId: 'central-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('right-redoubt-core', 'redoubt-core', 0.85, 0.18, 0.6, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'redoubt', massId: 'right-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('right-redoubt-cap', 'redoubt-cap', 0.85, 0.22, 0.06, 0.6, { role: 'roof', material: 'stone', towerIndex: 3, moduleClass: 'battlement-cap', massId: 'right-redoubt', massKind: 'redoubt-tower' }),
      physicalRect('left-wall-field', 'continuous-wall-segment', 0.315, 0.15, 0.38, 0, { role: 'wall', material: 'stone', towerIndex: 0, moduleClass: 'fortification-wall', massId: 'continuous-wall', massKind: 'granary-rampart' }),
      physicalRect('left-wall-ring', 'continuous-wall-segment', 0.315, 0.15, 0.08, 0.38, { role: 'carrier', material: 'stone', towerIndex: 0, moduleClass: 'wall-ring', massId: 'continuous-wall', massKind: 'granary-rampart', structuralSpine: true }),
      physicalRect('right-wall-field', 'continuous-wall-segment', 0.685, 0.15, 0.38, 0, { role: 'wall', material: 'stone', towerIndex: 2, moduleClass: 'fortification-wall', massId: 'continuous-wall', massKind: 'granary-rampart' }),
      physicalRect('right-wall-ring', 'continuous-wall-segment', 0.685, 0.15, 0.08, 0.38, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'wall-ring', massId: 'continuous-wall', massKind: 'granary-rampart', structuralSpine: true }),
      physicalRect('left-gallery-post-a', 'covered-gallery-post', 0.27, 0.04, 0.08, 0.46, { role: 'support', material: 'wood', towerIndex: 0, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk' }),
      physicalRect('left-gallery-post-b', 'covered-gallery-post', 0.37, 0.04, 0.08, 0.46, { role: 'support', material: 'wood', towerIndex: 1, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk' }),
      physicalRect('left-gallery-roof', 'covered-gallery-roof', 0.315, 0.15, 0.06, 0.54, { role: 'roof', material: 'wood', towerIndex: 0, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk', feature: 'covered-walk' }),
      physicalRect('right-gallery-post-a', 'covered-gallery-post', 0.63, 0.04, 0.08, 0.46, { role: 'support', material: 'wood', towerIndex: 2, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk' }),
      physicalRect('right-gallery-post-b', 'covered-gallery-post', 0.73, 0.04, 0.08, 0.46, { role: 'support', material: 'wood', towerIndex: 3, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk' }),
      physicalRect('right-gallery-roof', 'covered-gallery-roof', 0.685, 0.15, 0.06, 0.54, { role: 'roof', material: 'wood', towerIndex: 2, moduleClass: 'covered-gallery', massId: 'covered-gallery', massKind: 'granary-walk', feature: 'covered-walk' }),
    ],
  ),
  'outer-castle-gate': authoredPhysicalBuilding(
    'corner-towers-curtains-great-gatehouse',
    'Two corner towers and two curtain walls terminate at a wide independent central gatehouse.',
    ['corner-tower', 'curtain-wall', 'gatehouse-pier', 'great-gate-lintel', 'portcullis'],
    [
      physicalRect('left-corner-tower-body', 'corner-tower', 0.12, 0.18, 0.76, 0, { role: 'support', material: 'stone', towerIndex: 0, moduleClass: 'corner-tower', massId: 'left-corner-tower', massKind: 'castle-corner-tower' }),
      physicalRect('left-corner-tower-cap', 'corner-tower-cap', 0.12, 0.2, 0.07, 0.76, { role: 'roof', material: 'stone', towerIndex: 0, moduleClass: 'battlement-cap', massId: 'left-corner-tower', massKind: 'castle-corner-tower' }),
      physicalRect('left-curtain-body', 'curtain-wall', 0.27, 0.12, 0.45, 0, { role: 'wall', material: 'stone', towerIndex: 1, moduleClass: 'curtain-wall', massId: 'left-curtain', massKind: 'inner-curtain-wall' }),
      physicalRect('left-curtain-ring', 'curtain-wall-ring', 0.27, 0.12, 0.07, 0.45, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'wall-ring', massId: 'left-curtain', massKind: 'inner-curtain-wall', structuralSpine: true }),
      physicalRect('great-gate-left-pier', 'gatehouse-pier', 0.36, 0.06, 0.52, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'great-gatehouse', massId: 'central-gatehouse', massKind: 'great-gatehouse' }),
      physicalRect('great-gate-right-pier', 'gatehouse-pier', 0.64, 0.06, 0.52, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'great-gatehouse', massId: 'central-gatehouse', massKind: 'great-gatehouse' }),
      physicalRect('great-gate-arch-lintel', 'great-gate-lintel', 0.5, 0.34, 0.1, 0.52, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'great-gatehouse', massId: 'central-gatehouse', massKind: 'great-gatehouse', structuralSpine: true, feature: 'wide-central-arch' }),
      physicalRect('great-gate-upper-house', 'gatehouse-upper-house', 0.5, 0.26, 0.12, 0.62, { role: 'wall', material: 'stone', towerIndex: 1, moduleClass: 'great-gatehouse', massId: 'central-gatehouse', massKind: 'great-gatehouse' }),
      physicalRect('great-gatehouse-cap', 'gatehouse-cap', 0.5, 0.32, 0.07, 0.74, { role: 'roof', material: 'stone', towerIndex: 1, moduleClass: 'battlement-cap', massId: 'central-gatehouse', massKind: 'great-gatehouse' }),
      physicalRect('great-gate-portcullis', 'portcullis', 0.5, 0.22, 0.42, 0, { role: 'gate', material: 'wood', towerIndex: 1, moduleClass: 'destructible-gate', massId: 'central-gatehouse', massKind: 'great-gatehouse', feature: 'portcullis' }),
      physicalRect('right-curtain-body', 'curtain-wall', 0.73, 0.12, 0.45, 0, { role: 'wall', material: 'stone', towerIndex: 2, moduleClass: 'curtain-wall', massId: 'right-curtain', massKind: 'inner-curtain-wall' }),
      physicalRect('right-curtain-ring', 'curtain-wall-ring', 0.73, 0.12, 0.07, 0.45, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'wall-ring', massId: 'right-curtain', massKind: 'inner-curtain-wall', structuralSpine: true }),
      physicalRect('right-corner-tower-body', 'corner-tower', 0.88, 0.18, 0.76, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'corner-tower', massId: 'right-corner-tower', massKind: 'castle-corner-tower' }),
      physicalRect('right-corner-tower-cap', 'corner-tower-cap', 0.88, 0.2, 0.07, 0.76, { role: 'roof', material: 'stone', towerIndex: 3, moduleClass: 'battlement-cap', massId: 'right-corner-tower', massKind: 'castle-corner-tower' }),
    ],
  ),
  'wind-engine-gate': authoredPhysicalBuilding(
    'asymmetric-wind-engine-and-lift-gate',
    'A wind-engine tower drives a broad lift gatehouse and a separate counterweight tower through two galleries.',
    ['wind-engine-tower', 'lift-gate-pier', 'mechanical-gallery', 'drawbridge-leaf', 'counterweight-tower', 'counterweight'],
    [
      physicalRect('wind-engine-tower-body', 'wind-engine-tower', 0.17, 0.22, 0.78, 0, { role: 'support', material: 'stone', towerIndex: 0, moduleClass: 'mechanical-tower', massId: 'wind-engine-tower', massKind: 'wind-engine-tower' }),
      physicalRect('wind-engine-tower-cap', 'wind-engine-cap', 0.17, 0.26, 0.08, 0.78, { role: 'roof', material: 'stone', towerIndex: 0, moduleClass: 'machine-crown', massId: 'wind-engine-tower', massKind: 'wind-engine-tower' }),
      physicalRect('wind-engine-axle', 'wind-engine-axle', 0.17, 0.06, 0.05, 0.86, { role: 'mechanism', material: 'wood', towerIndex: 0, moduleClass: 'machine-axle', massId: 'wind-engine-tower', massKind: 'wind-engine-tower', feature: 'giant-windwheel-anchor' }),
      physicalRect('lift-gate-left-pier', 'lift-gate-pier', 0.36, 0.06, 0.58, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'lift-gatehouse', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse' }),
      physicalRect('lift-gate-right-pier', 'lift-gate-pier', 0.64, 0.06, 0.58, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'lift-gatehouse', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse' }),
      physicalRect('lift-gate-lintel', 'lift-gate-lintel', 0.5, 0.34, 0.1, 0.58, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'lift-gatehouse', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse', structuralSpine: true, feature: 'wide-lift-gate' }),
      physicalRect('lift-gate-upper-house', 'lift-gate-upper-house', 0.5, 0.28, 0.12, 0.68, { role: 'wall', material: 'stone', towerIndex: 1, moduleClass: 'lift-gatehouse', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse' }),
      physicalRect('lift-gate-roof', 'lift-gate-roof', 0.5, 0.34, 0.07, 0.8, { role: 'roof', material: 'stone', towerIndex: 1, moduleClass: 'battlement-cap', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse' }),
      physicalRect('lift-gate-drawbridge', 'drawbridge-leaf', 0.5, 0.22, 0.05, 0.15, { role: 'gate', material: 'wood', towerIndex: 1, moduleClass: 'drawbridge', massId: 'drawbridge-leaf', massKind: 'drawbridge-leaf', feature: 'lift-bridge' }),
      physicalRect('wind-machine-gallery', 'mechanical-gallery', 0.305, 0.05, 0.07, 0.62, { role: 'carrier', material: 'wood', towerIndex: 0, moduleClass: 'gear-gallery', massId: 'drawbridge-gatehouse', massKind: 'drawbridge-gatehouse', structuralSpine: true }),
      physicalRect('counterweight-machine-gallery', 'mechanical-gallery', 0.695, 0.05, 0.07, 0.62, { role: 'carrier', material: 'wood', towerIndex: 2, moduleClass: 'gear-gallery', massId: 'counterweight-tower', massKind: 'counterweight-tower', structuralSpine: true }),
      physicalRect('counterweight-block', 'counterweight', 0.695, 0.05, 0.12, 0.38, { role: 'mechanism', material: 'stone', towerIndex: 2, moduleClass: 'counterweight', massId: 'counterweight-tower', massKind: 'counterweight-tower', feature: 'hanging-counterweight' }),
      physicalRect('counterweight-tower-body', 'counterweight-tower', 0.83, 0.22, 0.74, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'mechanical-tower', massId: 'counterweight-tower', massKind: 'counterweight-tower' }),
      physicalRect('counterweight-tower-cap', 'counterweight-cap', 0.83, 0.26, 0.08, 0.74, { role: 'roof', material: 'stone', towerIndex: 3, moduleClass: 'machine-crown', massId: 'counterweight-tower', massKind: 'counterweight-tower' }),
    ],
  ),
  'arcaded-inner-court': authoredPhysicalBuilding(
    'forecourt-arcade-rear-keep',
    'A low gated forecourt leads into a true three-bay stone arcade and terminates at one rear command keep.',
    ['forecourt-wall', 'forecourt-gate-lintel', 'arcade-pier', 'arcade-arch', 'arcade-roof', 'rear-command-keep'],
    [
      physicalRect('forecourt-left-wall', 'forecourt-wall', 0.085, 0.11, 0.26, 0, { role: 'wall', material: 'stone', towerIndex: 0, moduleClass: 'forecourt-wall', massId: 'forecourt-wall', massKind: 'low-forecourt-wall' }),
      physicalRect('forecourt-right-wall', 'forecourt-wall', 0.285, 0.13, 0.26, 0, { role: 'wall', material: 'stone', towerIndex: 0, moduleClass: 'forecourt-wall', massId: 'forecourt-wall', massKind: 'low-forecourt-wall' }),
      physicalRect('forecourt-gate-lintel', 'forecourt-gate-lintel', 0.18, 0.08, 0.04, 0.22, { role: 'carrier', material: 'stone', towerIndex: 0, moduleClass: 'forecourt-gate', massId: 'forecourt-wall', massKind: 'low-forecourt-wall', feature: 'forecourt-gate' }),
      physicalRect('forecourt-arcade-passage', 'forecourt-passage', 0.355, 0.01, 0.06, 0.22, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'court-passage', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery', structuralSpine: true }),
      physicalRect('arcade-pier-a', 'arcade-pier', 0.38, 0.04, 0.4, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'masonry-arcade', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery' }),
      physicalRect('arcade-pier-b', 'arcade-pier', 0.47, 0.04, 0.4, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'masonry-arcade', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery' }),
      physicalRect('arcade-pier-c', 'arcade-pier', 0.56, 0.04, 0.4, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'masonry-arcade', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery' }),
      physicalRect('arcade-pier-d', 'arcade-pier', 0.65, 0.04, 0.4, 0, { role: 'support', material: 'stone', towerIndex: 2, moduleClass: 'masonry-arcade', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery' }),
      physicalRect('arcade-arch-a', 'arcade-arch', 0.425, 0.05, 0.06, 0.34, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'masonry-arch', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery', feature: 'three-bay-arcade' }),
      physicalRect('arcade-arch-b', 'arcade-arch', 0.515, 0.05, 0.06, 0.34, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'masonry-arch', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery', feature: 'three-bay-arcade' }),
      physicalRect('arcade-arch-c', 'arcade-arch', 0.605, 0.05, 0.06, 0.34, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'masonry-arch', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery', feature: 'three-bay-arcade' }),
      physicalRect('arcade-continuous-roof', 'arcade-roof', 0.515, 0.31, 0.08, 0.4, { role: 'roof', material: 'stone', towerIndex: 1, moduleClass: 'arcade-parapet', massId: 'arcade-gallery', massKind: 'stone-arcade-gallery', structuralSpine: true }),
      physicalRect('inner-court-threshold', 'inner-court-threshold', 0.735, 0.13, 0.04, 0, { role: 'threshold', material: 'stone', towerIndex: 2, moduleClass: 'boss-forecourt', massId: 'rear-command-keep', massKind: 'command-keep', feature: 'open-boss-court' }),
      physicalRect('rear-command-keep-body', 'rear-command-keep', 0.9, 0.2, 0.84, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'command-keep', massId: 'rear-command-keep', massKind: 'command-keep' }),
      physicalRect('rear-command-keep-cap', 'rear-keep-cap', 0.9, 0.2, 0.06, 0.84, { role: 'roof', material: 'stone', towerIndex: 3, moduleClass: 'battlement-cap', massId: 'rear-command-keep', massKind: 'command-keep' }),
    ],
  ),
  'throne-granary-citadel': authoredPhysicalBuilding(
    'guard-towers-keep-throne-granary',
    'Twin guard towers tie into a broad throne keep, a separately gated domed granary, and an open Boss forecourt.',
    ['guard-tower', 'citadel-keep-pier', 'throne-arch-lintel', 'citadel-upper-keep', 'granary-wall', 'granary-drum', 'granary-dome-course', 'royal-granary-gate', 'boss-forecourt-threshold'],
    [
      physicalRect('left-guard-tower-body', 'guard-tower', 0.09, 0.14, 0.72, 0, { role: 'support', material: 'stone', towerIndex: 0, moduleClass: 'royal-guard-tower', massId: 'left-guard-tower', massKind: 'royal-guard-tower' }),
      physicalRect('left-guard-tower-cap', 'guard-tower-cap', 0.09, 0.14, 0.07, 0.72, { role: 'roof', material: 'stone', towerIndex: 0, moduleClass: 'battlement-cap', massId: 'left-guard-tower', massKind: 'royal-guard-tower' }),
      physicalRect('left-citadel-link', 'citadel-wall-link', 0.18, 0.04, 0.08, 0.5, { role: 'carrier', material: 'stone', towerIndex: 0, moduleClass: 'citadel-ring', massId: 'citadel-keep', massKind: 'great-citadel-keep', structuralSpine: true }),
      physicalRect('citadel-left-keep-pier', 'citadel-keep-pier', 0.245, 0.09, 0.58, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'great-citadel-keep', massId: 'citadel-keep', massKind: 'great-citadel-keep' }),
      physicalRect('citadel-right-keep-pier', 'citadel-keep-pier', 0.475, 0.09, 0.58, 0, { role: 'support', material: 'stone', towerIndex: 1, moduleClass: 'great-citadel-keep', massId: 'citadel-keep', massKind: 'great-citadel-keep' }),
      physicalRect('boss-forecourt-threshold', 'boss-forecourt-threshold', 0.36, 0.14, 0.04, 0, { role: 'threshold', material: 'stone', towerIndex: 1, moduleClass: 'boss-forecourt', massId: 'throne-bay', massKind: 'recessed-throne-bay', feature: 'open-boss-court' }),
      physicalRect('throne-arch-lintel', 'throne-arch-lintel', 0.36, 0.14, 0.1, 0.48, { role: 'carrier', material: 'stone', towerIndex: 1, moduleClass: 'throne-bay', massId: 'throne-bay', massKind: 'recessed-throne-bay', structuralSpine: true, feature: 'throne-arch' }),
      physicalRect('citadel-upper-keep', 'citadel-upper-keep', 0.36, 0.32, 0.28, 0.58, { role: 'wall', material: 'stone', towerIndex: 1, moduleClass: 'great-citadel-keep', massId: 'citadel-keep', massKind: 'great-citadel-keep' }),
      physicalRect('citadel-crown', 'citadel-crown', 0.36, 0.36, 0.08, 0.86, { role: 'roof', material: 'stone', towerIndex: 1, moduleClass: 'citadel-crown', massId: 'citadel-keep', massKind: 'great-citadel-keep' }),
      physicalRect('keep-granary-gallery', 'citadel-gallery-link', 0.545, 0.05, 0.08, 0.5, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'citadel-ring', massId: 'royal-granary', massKind: 'domed-royal-granary', structuralSpine: true }),
      physicalRect('granary-left-wall', 'granary-wall', 0.6, 0.06, 0.5, 0, { role: 'wall', material: 'stone', towerIndex: 2, moduleClass: 'royal-granary', massId: 'royal-granary', massKind: 'domed-royal-granary' }),
      physicalRect('royal-granary-gate', 'royal-granary-gate', 0.69, 0.12, 0.34, 0, { role: 'gate', material: 'wood', towerIndex: 2, moduleClass: 'destructible-gate', massId: 'royal-granary', massKind: 'domed-royal-granary', feature: 'locked-granary-gate' }),
      physicalRect('granary-right-wall', 'granary-wall', 0.78, 0.06, 0.5, 0, { role: 'wall', material: 'stone', towerIndex: 2, moduleClass: 'royal-granary', massId: 'royal-granary', massKind: 'domed-royal-granary' }),
      physicalRect('granary-drum', 'granary-drum', 0.69, 0.24, 0.08, 0.5, { role: 'carrier', material: 'stone', towerIndex: 2, moduleClass: 'dome-drum', massId: 'royal-granary', massKind: 'domed-royal-granary', structuralSpine: true }),
      physicalRect('granary-dome-lower', 'granary-dome-course', 0.69, 0.2, 0.07, 0.58, { role: 'roof', material: 'stone', towerIndex: 2, moduleClass: 'stepped-dome', massId: 'royal-granary', massKind: 'domed-royal-granary', feature: 'granary-dome' }),
      physicalRect('granary-dome-upper', 'granary-dome-course', 0.69, 0.14, 0.07, 0.65, { role: 'roof', material: 'stone', towerIndex: 2, moduleClass: 'stepped-dome', massId: 'royal-granary', massKind: 'domed-royal-granary', feature: 'granary-dome' }),
      physicalRect('granary-dome-finial', 'granary-finial', 0.69, 0.04, 0.08, 0.72, { role: 'roof', material: 'stone', towerIndex: 2, moduleClass: 'dome-finial', massId: 'royal-granary', massKind: 'domed-royal-granary' }),
      physicalRect('granary-right-link', 'citadel-wall-link', 0.835, 0.05, 0.08, 0.5, { role: 'carrier', material: 'stone', towerIndex: 3, moduleClass: 'citadel-ring', massId: 'right-guard-tower', massKind: 'royal-guard-tower', structuralSpine: true }),
      physicalRect('right-guard-tower-body', 'guard-tower', 0.93, 0.14, 0.72, 0, { role: 'support', material: 'stone', towerIndex: 3, moduleClass: 'royal-guard-tower', massId: 'right-guard-tower', massKind: 'royal-guard-tower' }),
      physicalRect('right-guard-tower-cap', 'guard-tower-cap', 0.93, 0.14, 0.07, 0.72, { role: 'roof', material: 'stone', towerIndex: 3, moduleClass: 'battlement-cap', massId: 'right-guard-tower', massKind: 'royal-guard-tower' }),
    ],
  ),
})

function completeBuildingPlan(formId, story) {
  const form = COMPLETE_BUILDING_FORM_CATALOG[formId]
  if (!form) throw new RangeError(`Unknown complete building form: ${formId}`)
  const authoredPhysics = LATE_CAMPAIGN_PHYSICAL_LAYOUTS[formId] || null
  return {
    formId,
    name: form.name,
    category: form.category,
    completeBuilding: true,
    towerForms: [...form.towerForms],
    roof: form.roof,
    wall: form.wall,
    foundation: form.foundation,
    complexity: form.complexity,
    structuralSystem: form.structuralSystem,
    supportPathCount: form.supportPathCount,
    mechanisms: [...form.mechanisms],
    visualParts: [...form.visualParts],
    silhouetteSpec: form.silhouetteSpec,
    physicalLayout: authoredPhysics?.physicalLayout || null,
    physicalModules: authoredPhysics ? [...authoredPhysics.physicalModules] : [],
    storyFunction: story.storyFunction,
    loadPath: story.loadPath,
    failurePlane: story.failurePlane,
    signatureFeature: story.signatureFeature,
  }
}

function accent(constructionId, ratio, roles, offset = 0) {
  return { constructionId, ratio, roles, offset }
}

function blueprint(level, id, name, familyId, towerFloors, geometry, options = {}) {
  return {
    level,
    id,
    name,
    familyId,
    towerFloors,
    geometry,
    baseOffsets: options.baseOffsets || towerFloors.map(() => 0),
    constructionPalette: options.constructionPalette || [],
    landmark: options.landmark || null,
    buildingPlan: options.buildingPlan || null,
    motif: options.motif || id,
    minimumEndlessDepth: options.minimumEndlessDepth ?? 1,
  }
}

export const MAIN_ARCHITECTURE_BLUEPRINTS = deepFreeze([
  blueprint(1, 'moonfall-granary', '月落粮仓', frontier, [2],
    { postWidthScale: 0.94, postHeightScale: 0.9, beamWidthScale: 1.12, beamHeightScale: 0.92, spacingDelta: -4, stagger: 1 }, {
      landmark: { kind: 'granary-ridge', width: 46, height: 12, offset: 0 },
      motif: '粮仓屋脊',
      buildingPlan: completeBuildingPlan('gabled-granary', {
        storyFunction: '让远征从被搬空的家园粮仓出发。',
        loadPath: '轻木屋顶通过双侧框架落到四个石墩。',
        failurePlane: '仓门底梁是唯一明显失效面。',
        signatureFeature: '架空粮仓与空粮格。',
      }),
    }),
  blueprint(2, 'cart-rut-loading-shed', '车辙装卸棚', frontier, [2, 2],
    { postWidthScale: 0.9, postHeightScale: 0.98, beamWidthScale: 1.08, beamHeightScale: 0.94, spacingDelta: 0, stagger: 2 }, {
      baseOffsets: [-8, 10],
      constructionPalette: [accent('canvas-screen', 0.18, ['roof', 'lintel'], 0)],
      landmark: { kind: 'loading-sign', width: 16, height: 28, offset: -22, constructionId: 'canvas-screen' },
      motif: '偏置雨棚',
      buildingPlan: completeBuildingPlan('lean-to-loading-shed', {
        storyFunction: '把月下车辙与匆忙转运粮袋纳入一座林缘装卸棚。',
        loadPath: '单坡雨棚落在背墙和前排立柱上，装卸台由石墩承托。',
        failurePlane: '斜坡与前沿立柱交界是可读的薄弱处。',
        signatureFeature: '偏置帆布雨棚和装卸坡道。',
      }),
    }),
  blueprint(3, 'pine-slope-terrace', '松坡层台路卡', frontier, [2, 3],
    { postWidthScale: 0.98, postHeightScale: 1.04, beamWidthScale: 0.98, beamHeightScale: 1, spacingDelta: 5, stagger: 3 }, {
      baseOffsets: [12, -10],
      constructionPalette: [accent('resin-timber', 0.24, ['post', 'lintel', 'roof'], 1)],
      landmark: { kind: 'slope-marker', width: 24, height: 20, offset: 22, constructionId: 'resin-timber' },
      motif: '层台路标',
      buildingPlan: completeBuildingPlan('terraced-checkpoint', {
        storyFunction: '让破晓松坡的高低差真正参与关卡构图。',
        loadPath: '阶梯式石脚承受挡土墙，驿亭木架独立落在上层台地。',
        failurePlane: '上层收费亭的树脂木连接可以与挡土墙分离。',
        signatureFeature: '顺坡折返的层台与山口路标。',
      }),
    }),
  blueprint(4, 'windscar-tripod-watch', '风峡三脚瞭望塔', frontier, [3, 2, 3],
    { postWidthScale: 0.88, postHeightScale: 1.14, beamWidthScale: 0.92, beamHeightScale: 0.9, spacingDelta: 3, stagger: 3 }, {
      baseOffsets: [-12, 9, -4],
      constructionPalette: [accent('canvas-screen', 0.22, ['post', 'roof'], 2)],
      landmark: { kind: 'wind-vane', width: 12, height: 38, offset: 18, constructionId: 'canvas-screen' },
      motif: '三脚风标', minimumEndlessDepth: 3,
      buildingPlan: completeBuildingPlan('tripod-windmill-watch', {
        storyFunction: '用原始风车瞭望所教会玩家读取风峡的力量。',
        loadPath: '风轮轴力由宽跨三脚架分流到外张石脚。',
        failurePlane: '中央轴座与背风仓的连接不承担主塔重量。',
        signatureFeature: '帆布叶片、风标和外张三脚架。',
      }),
    }),
  blueprint(5, 'gale-vine-freight-bridge', '风索运粮桥', frontier, [2, 3, 4],
    { postWidthScale: 0.94, postHeightScale: 1.08, beamWidthScale: 1.1, beamHeightScale: 0.9, spacingDelta: 8, stagger: 4 }, {
      baseOffsets: [-12, 14, -6],
      constructionPalette: [
        accent('resin-timber', 0.24, ['lintel', 'roof'], 0),
        accent('canvas-screen', 0.12, ['post'], 3),
      ],
      landmark: { kind: 'hoist-hook', width: 20, height: 30, offset: -24, constructionId: 'resin-timber' },
      motif: '悬挂粮箱', minimumEndlessDepth: 5,
      buildingPlan: completeBuildingPlan('suspension-freight-bridge', {
        storyFunction: '把峡谷运粮线表现为真正连接两岸的索桥。',
        loadPath: '桥面荷载经桁架和吊索转移到两端压索石桥台。',
        failurePlane: '一组明示的树脂木吊索节点控制货箱支线。',
        signatureFeature: '双桥头、悬空桥面和吊运粮箱。',
      }),
    }),
  blueprint(6, 'black-pine-barbican', '黑松瓮城', frontier, [3, 4, 3, 3],
    { postWidthScale: 1.04, postHeightScale: 1.04, beamWidthScale: 1.06, beamHeightScale: 1.05, spacingDelta: 8, stagger: 2 }, {
      baseOffsets: [-8, 8, -10, 6],
      constructionPalette: [
        accent('packed-earth', 0.18, ['post', 'lintel'], 1),
        accent('resin-timber', 0.14, ['roof'], 0),
      ],
      landmark: { kind: 'command-crest', width: 32, height: 22, offset: 0, constructionId: 'packed-earth' },
      motif: '前墙后庭', minimumEndlessDepth: 7,
      buildingPlan: completeBuildingPlan('twin-tower-barbican', {
        storyFunction: '将边境守将置于双塔门堡后的真实瓮城内。',
        loadPath: '连续石基同时承托双门楼与中央闸梁，后庭将台独立承重。',
        failurePlane: '中门木闸与侧墙的夹缝提供进攻口，不会引发全堡自动倒塌。',
        signatureFeature: '双塔城门、黑松将旗和关内净空庭院。',
      }),
    }),
  blueprint(7, 'log-sorting-gantry', '原木分拣吊架', bridge, [2, 2, 4],
    { postWidthScale: 0.94, postHeightScale: 1, beamWidthScale: 1.12, beamHeightScale: 0.9, spacingDelta: 10, stagger: 2 }, {
      baseOffsets: [-10, 18, -4],
      constructionPalette: [accent('resin-timber', 0.26, ['post', 'lintel', 'roof'], 2)],
      landmark: { kind: 'gantry-boom', width: 54, height: 12, offset: 20, constructionId: 'resin-timber' },
      motif: '偏载吊臂', minimumEndlessDepth: 10,
      buildingPlan: completeBuildingPlan('a-frame-sorting-gantry', {
        storyFunction: '把粮食转运线藏进宽阔的原木分拣产业区。',
        loadPath: 'A形框将偏载吊臂的力量分到宽木基与两侧斜撑。',
        failurePlane: '吊臂轴座可单独被切断，而原木笼仍保持站立。',
        signatureFeature: '宽跨龙门架、滑轮吊臂与原木格。',
      }),
    }),
  blueprint(8, 'sawwheel-workshop', '锯轮工坊', bridge, [2, 3, 3],
    { postWidthScale: 1.02, postHeightScale: 0.96, beamWidthScale: 1.08, beamHeightScale: 1.06, spacingDelta: 8, stagger: 3 }, {
      baseOffsets: [10, -12, 5],
      constructionPalette: [
        accent('resin-glass', 0.18, ['post', 'lintel'], 0),
        accent('resin-timber', 0.18, ['roof'], 1),
      ],
      landmark: { kind: 'saw-bearing', width: 30, height: 22, offset: -22, constructionId: 'resin-glass' },
      motif: '锯轮轴承', minimumEndlessDepth: 10,
      buildingPlan: completeBuildingPlan('sawwheel-workshop', {
        storyFunction: '让林场折返线穿过一座有外露机械的完整工坊。',
        loadPath: '双坡屋架通过门式框架落在树脂木地梁，锯轮有独立轴座。',
        failurePlane: '皮带轴与料槽接口是两个不同的局部薄弱点。',
        signatureFeature: '双坡工坊外壳、大锯轮和皮带轴。',
      }),
    }),
  blueprint(9, 'canopy-lift-station', '树冠货梯站', bridge, [4, 3, 3, 2],
    { postWidthScale: 0.92, postHeightScale: 1.12, beamWidthScale: 1.14, beamHeightScale: 0.92, spacingDelta: 12, stagger: 4 }, {
      baseOffsets: [-14, 10, -8, 14],
      constructionPalette: [
        accent('resin-glass', 0.22, ['lintel', 'roof'], 2),
        accent('canvas-screen', 0.1, ['post'], 1),
      ],
      landmark: { kind: 'lift-pulley', width: 14, height: 34, offset: 24, constructionId: 'resin-timber' },
      motif: '不等高货梯', minimumEndlessDepth: 10,
      buildingPlan: completeBuildingPlan('counterweight-lift-station', {
        storyFunction: '用一座树冠货梯站将运粮线从地面引向雪线。',
        loadPath: '两座不等高井架各自落地，上层转运桥以双端铰支连接。',
        failurePlane: '配重塔与货梯笼的索系可分离，不将两座井架一起拖倒。',
        signatureFeature: '不等高井架、上层连桥和明示配重。',
      }),
    }),
  blueprint(10, 'icewood-lock-gate', '冰木咬合门', rock, [3, 5, 3],
    { postWidthScale: 1.04, postHeightScale: 0.95, beamWidthScale: 1.08, beamHeightScale: 1.1, spacingDelta: 10, stagger: 2 }, {
      baseOffsets: [12, -6, -12],
      constructionPalette: [
        accent('resin-glass', 0.28, ['post', 'lintel', 'roof'], 0),
        accent('resin-timber', 0.12, ['lintel'], 2),
      ],
      landmark: { kind: 'lock-crystal', width: 28, height: 28, offset: 0, constructionId: 'resin-glass' },
      motif: '冰木锁形门', minimumEndlessDepth: 30,
      buildingPlan: completeBuildingPlan('icewood-lock-gate', {
        storyFunction: '用一座像巨锁的雪线关门引入三种材质判断。',
        loadPath: '重量由霜石脚承受，冰榫只锁定木门框而不悬托整体石墙。',
        failurePlane: '锁晶与冰榫组成永久脆化后的局部解题口。',
        signatureFeature: '石脚、咬合冰榫和中央锁晶。',
      }),
    }),
  blueprint(11, 'ice-mine-step-city', '冰矿阶城', rock, [2, 4, 5, 2],
    { postWidthScale: 1.08, postHeightScale: 1, beamWidthScale: 0.98, beamHeightScale: 1.12, spacingDelta: 12, stagger: 3 }, {
      baseOffsets: [14, -4, 6, -14],
      constructionPalette: [
        accent('packed-earth', 0.22, ['post', 'lintel'], 1),
        accent('resin-glass', 0.16, ['roof'], 0),
      ],
      landmark: { kind: 'ore-cap', width: 44, height: 18, offset: -18, constructionId: 'packed-earth' },
      motif: '三段矿台', minimumEndlessDepth: 30,
      buildingPlan: completeBuildingPlan('quarry-terrace-city', {
        storyFunction: '把松鼠的霜石开采线展示为沿山体生长的矿坑阶城。',
        loadPath: '每层挡土墙独立落在岩切台地，矿轨斜坡不承担上层重石。',
        failurePlane: '运石溜槽与冰晶支座提供可观察的定向坠落路线。',
        signatureFeature: '折返矿道、运石吊机和三段挡土台。',
      }),
    }),
  blueprint(12, 'black-pine-avalanche-fort', '黑松雪崩堡', rock, [3, 4, 5, 2],
    { postWidthScale: 1.1, postHeightScale: 1.06, beamWidthScale: 1.02, beamHeightScale: 1.14, spacingDelta: 14, stagger: 2 }, {
      baseOffsets: [12, -6, 8, -12],
      constructionPalette: [
        accent('packed-earth', 0.24, ['post', 'lintel'], 2),
        accent('resin-glass', 0.18, ['roof'], 1),
      ],
      landmark: { kind: 'avalanche-crown', width: 34, height: 24, offset: 0, constructionId: 'resin-glass' },
      motif: '悬置石冠', minimumEndlessDepth: 30,
      buildingPlan: completeBuildingPlan('avalanche-fort', {
        storyFunction: '将霜石关的材质课程合成一座黑松重甲Boss堡。',
        loadPath: '厚石基和两翼扶壁承受城墙，冰木城楼独立落在墙冠圈梁上。',
        failurePlane: '中央冰锁拱门是设计好的破口，两翼棱堡保留冗余承重。',
        signatureFeature: '双层城墙、霜石拱门和后部将台。',
      }),
    }),
  blueprint(13, 'royal-mile-viaduct', '王家里程高架桥', bridge, [3, 3, 5, 4],
    { postWidthScale: 0.98, postHeightScale: 1.02, beamWidthScale: 1.15, beamHeightScale: 1, spacingDelta: 8, stagger: 2 }, {
      baseOffsets: [-10, 14, -6, 10],
      constructionPalette: [
        accent('leaf-iron-plate', 0.16, ['post', 'lintel', 'roof'], 0),
        accent('resin-timber', 0.16, ['roof', 'gate-cap'], 2),
      ],
      landmark: { kind: 'mile-standard', width: 18, height: 34, offset: -24, constructionId: 'leaf-iron-plate' },
      motif: '石脚高架', minimumEndlessDepth: 20,
      buildingPlan: completeBuildingPlan('royal-viaduct', {
        storyFunction: '让关后里程印成为连续通向王城的标准化高架。',
        loadPath: '上层道路通过重复拱券将荷载导入深埋石桥墩。',
        failurePlane: '收费亭和木制护栏可局部破坏，石拱不会无条件整排坍塌。',
        signatureFeature: '连续石拱、高位运粮道和王家里程碑。',
      }),
    }),
  blueprint(14, 'highland-granary-redoubt', '高地护粮堡垒', bridge, [3, 4, 5, 5],
    { postWidthScale: 1.02, postHeightScale: 1.08, beamWidthScale: 1.13, beamHeightScale: 1.06, spacingDelta: 7, stagger: 3 }, {
      baseOffsets: [10, -12, 8, -8],
      constructionPalette: [
        accent('leaf-iron-plate', 0.22, ['post', 'lintel', 'roof'], 2),
        accent('packed-earth', 0.14, ['post'], 1),
      ],
      landmark: { kind: 'redoubt-cap', width: 48, height: 18, offset: 18, constructionId: 'leaf-iron-plate' },
      motif: '错层炮台', minimumEndlessDepth: 20,
      buildingPlan: completeBuildingPlan('granary-redoubt', {
        storyFunction: '把高地侧风下的王家运输线改造成连续护粮堡。',
        loadPath: '连续石基墙承托三座驿塔，墙后木廊以分段支座避免整体拖倒。',
        failurePlane: '一根标记的粮仓廊柱能打开局部通路，但其他驿塔仍有支撑。',
        signatureFeature: '连续护粮石墙、三驿塔和背墙廊架。',
      }),
    }),
  blueprint(15, 'royal-outer-barbican', '王国外郭瓮城', royal, [3, 4, 5, 3],
    { postWidthScale: 1.08, postHeightScale: 1, beamWidthScale: 1.08, beamHeightScale: 1.12, spacingDelta: 2, stagger: 1 }, {
      // Pull the inner pair apart so the authored great arch is a real central
      // gate, while the outer towers remain tied to short curtain walls.
      baseOffsets: [-8, -10, 10, 8],
      constructionPalette: [
        accent('leaf-iron-plate', 0.26, ['roof', 'gate-cap'], 0),
        accent('packed-earth', 0.12, ['post'], 3),
      ],
      landmark: { kind: 'portcullis-crown', width: 34, height: 24, offset: 0, constructionId: 'leaf-iron-plate' },
      motif: '砌合瓮城', minimumEndlessDepth: 50,
      buildingPlan: completeBuildingPlan('outer-castle-gate', {
        storyFunction: '让运输线第一次真正汇入完整的松鼠王城外郭。',
        loadPath: '中央门楼、两翼角塔与内墙各自有连续石基，由拱券与圈梁横向系结。',
        failurePlane: '木门榫和冰接缝是攻城口，叶铁墙芯提供冗余承重。',
        signatureFeature: '巨型石拱门、两翼角楼和多层城垛。',
      }),
    }),
  blueprint(16, 'royal-wind-engine-gate', '王城风机门阵', royal, [4, 5, 4, 4],
    { postWidthScale: 1.04, postHeightScale: 1.12, beamWidthScale: 1.02, beamHeightScale: 1.1, spacingDelta: 4, stagger: 2 }, {
      baseOffsets: [7, -7, 9, -9],
      constructionPalette: [
        accent('leaf-iron-plate', 0.3, ['post', 'lintel', 'roof'], 1),
        accent('resin-timber', 0.1, ['roof'], 0),
      ],
      landmark: { kind: 'wind-engine-shaft', width: 18, height: 40, offset: 22, constructionId: 'leaf-iron-plate' },
      motif: '配重风机门', minimumEndlessDepth: 50,
      buildingPlan: completeBuildingPlan('wind-engine-gate', {
        storyFunction: '将风峡、林场和霜石关的工程语言合并为王城机关门。',
        loadPath: '风轮轴座落在独立机床石台，门楼与配重塔各自承重并以齿轮连动。',
        failurePlane: '齿轮联轴可使升降桥失效，但不应把厚石城墙拖倒。',
        signatureFeature: '巨型风轮、石制配重塔和王庭升降桥。',
      }),
    }),
  blueprint(17, 'general-triple-court', '将军三重内庭', royal, [3, 5, 4, 3],
    { postWidthScale: 1.12, postHeightScale: 1.08, beamWidthScale: 1.13, beamHeightScale: 1.15, spacingDelta: 5, stagger: 1 }, {
      baseOffsets: [-7, 6, -6, 7],
      constructionPalette: [
        accent('leaf-iron-plate', 0.34, ['post', 'lintel', 'roof', 'gate-cap'], 2),
        accent('packed-earth', 0.1, ['post'], 1),
      ],
      landmark: { kind: 'general-standard', width: 54, height: 16, offset: -20, constructionId: 'leaf-iron-plate' },
      motif: '三重内庭', minimumEndlessDepth: 50,
      buildingPlan: completeBuildingPlan('arcaded-inner-court', {
        storyFunction: '把松果将军放在王庭三重防线的纵深内，而不是野外塔前。',
        loadPath: '前庭墙、中庭拱廊和后部主堡各有独立基础，廊架荷载通过石拱导向墙墩。',
        failurePlane: '前庭木门与一段冰榫拱廊提供两条局部攻击路线。',
        signatureFeature: '前庭、拱廊、后部将台的三层纵深。',
      }),
    }),
  blueprint(18, 'oakheart-throne-granary', '橡心王座粮仓城', royal, [4, 5, 5, 4],
    { postWidthScale: 1.13, postHeightScale: 1.1, beamWidthScale: 1.15, beamHeightScale: 1.17, spacingDelta: 5, stagger: 1 }, {
      baseOffsets: [6, -5, 5, -6],
      constructionPalette: [
        accent('leaf-iron-plate', 0.4, ['post', 'lintel', 'roof', 'gate-cap'], 0),
        accent('resin-glass', 0.08, ['roof'], 3),
      ],
      landmark: { kind: 'throne-granary-seal', width: 44, height: 24, offset: 0, constructionId: 'leaf-iron-plate' },
      motif: '王座粮仓圆穹', minimumEndlessDepth: 50,
      buildingPlan: completeBuildingPlan('throne-granary-citadel', {
        storyFunction: '用王座、军队、机关和被锁粮仓共同完成从第1关到终章的叙事闭环。',
        loadPath: '中央主堡、双近卫塔和粮仓圆穹分置三组石基，圆穹以扶壁将侧推力导入平台。',
        failurePlane: '锁粮大门和王座湾两侧冰缝是仅有的工程破口，主堡保持多路径承重。',
        signatureFeature: '粮仓圆穹、王座湾、中央主堡和双近卫塔。',
      }),
    }),
])

const BLUEPRINT_BY_LEVEL = new Map(MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => [entry.level, entry]))

export function mainArchitectureBlueprintForLevel(levelValue) {
  const level = Number(levelValue)
  if (!Number.isSafeInteger(level) || level < 1 || level > MAIN_ARCHITECTURE_BLUEPRINTS.length) {
    throw new RangeError('main architecture level must be between 1 and 18')
  }
  return BLUEPRINT_BY_LEVEL.get(level)
}

export function architectureBlueprintForEncounter({ mode = 'main', level = 1, seed = 1, familyId } = {}) {
  // Main campaign chapters are the only encounters with a one-to-one authored
  // blueprint.  Special realms still call the shared fortress generator with
  // a virtual main level before replacing its blocks; those virtual levels can
  // exceed eighteen and must not be mistaken for story chapters.
  if (mode === 'main') {
    const normalizedLevel = Number(level)
    return Number.isSafeInteger(normalizedLevel)
      && normalizedLevel >= 1
      && normalizedLevel <= MAIN_ARCHITECTURE_BLUEPRINTS.length
      ? mainArchitectureBlueprintForLevel(normalizedLevel)
      : null
  }
  if (mode !== 'endless') return null
  const normalizedLevel = Number(level)
  if (!Number.isSafeInteger(normalizedLevel) || normalizedLevel < 1) {
    throw new RangeError('endless architecture level must be a positive integer')
  }
  const depth = normalizedLevel > 18 ? normalizedLevel - 18 : normalizedLevel
  const unlocked = MAIN_ARCHITECTURE_BLUEPRINTS.filter((entry) => (
    depth >= entry.minimumEndlessDepth
  ))
  // From floor twenty onward, endless mode has entered the authored
  // stronghold vocabulary.  Never let a family roll with no late blueprint
  // silently fall back to the legacy four-post tower generator: prefer an
  // unlocked physical layout from the requested family, then fall back to the
  // whole unlocked physical pool (currently used by the rock family until its
  // own normalized layouts are authored).
  const physicalUnlocked = depth >= 20
    ? unlocked.filter((entry) => entry.buildingPlan?.physicalModules?.length > 0)
    : []
  const familyPhysical = physicalUnlocked.filter((entry) => entry.familyId === familyId)
  const candidates = depth >= 20
    ? (familyPhysical.length ? familyPhysical : physicalUnlocked)
    : unlocked.filter((entry) => entry.familyId === familyId)
  if (!candidates.length) return null
  const seedOffset = (Number(seed) >>> 0) % candidates.length
  return candidates[(seedOffset + depth - 1) % candidates.length]
}

function nonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validStringList(value, minimumLength = 1) {
  return Array.isArray(value)
    && value.length >= minimumLength
    && value.every(nonEmptyText)
    && new Set(value).size === value.length
}

function sameStringList(left, right) {
  return validStringList(left, 0)
    && validStringList(right, 0)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
}

function finiteRatio(value, minimum = 0, maximum = 1) {
  return Number.isFinite(value) && value >= minimum && value <= maximum
}

function sameSilhouetteSpec(left, right) {
  return Boolean(left && right) && JSON.stringify(left) === JSON.stringify(right)
}

const PHYSICAL_MODULE_ROLES = new Set([
  'support', 'carrier', 'wall', 'roof', 'gate', 'mechanism', 'threshold',
])
const PHYSICAL_MODULE_MATERIALS = new Set(['wood', 'stone', 'ice'])
const PHYSICAL_LAYOUT_EPSILON = 1e-6

function normalizedRectangleBounds(module) {
  if (!module || !Number.isFinite(module.xRatio) || !Number.isFinite(module.widthRatio)
    || !Number.isFinite(module.baseRatio) || !Number.isFinite(module.heightRatio)) return null
  return {
    left: module.xRatio - module.widthRatio / 2,
    right: module.xRatio + module.widthRatio / 2,
    bottom: module.baseRatio,
    top: module.baseRatio + module.heightRatio,
  }
}

function intervalPenetration(fromA, toA, fromB, toB) {
  return Math.min(toA, toB) - Math.max(fromA, fromB)
}

function rectanglesPenetrate(left, right) {
  return intervalPenetration(left.left, left.right, right.left, right.right) > PHYSICAL_LAYOUT_EPSILON
    && intervalPenetration(left.bottom, left.top, right.bottom, right.top) > PHYSICAL_LAYOUT_EPSILON
}

function rectanglesShareLoadEdge(left, right) {
  const horizontalContact = (
    Math.abs(left.right - right.left) <= PHYSICAL_LAYOUT_EPSILON
      || Math.abs(right.right - left.left) <= PHYSICAL_LAYOUT_EPSILON
  ) && intervalPenetration(left.bottom, left.top, right.bottom, right.top) > PHYSICAL_LAYOUT_EPSILON
  const verticalContact = (
    Math.abs(left.top - right.bottom) <= PHYSICAL_LAYOUT_EPSILON
      || Math.abs(right.top - left.bottom) <= PHYSICAL_LAYOUT_EPSILON
  ) && intervalPenetration(left.left, left.right, right.left, right.right) > PHYSICAL_LAYOUT_EPSILON
  return horizontalContact || verticalContact
}

/**
 * Validate one authored complete-building physics plan independently of the
 * campaign record.  Keeping this exported makes the format available to the
 * physics generator and to content tooling without importing Canvas code.
 */
export function validatePhysicalBuildingLayout(
  physicalLayout,
  physicalModules,
  { path = 'physicalBuilding', silhouetteSpec = null, towerCount = 4 } = {},
) {
  const errors = []
  if (!physicalLayout || typeof physicalLayout !== 'object' || Array.isArray(physicalLayout)) {
    return [`${path}.physicalLayout must be an object`]
  }
  if (physicalLayout.version !== 'normalized-rect-v1') {
    errors.push(`${path}.physicalLayout.version must be normalized-rect-v1`)
  }
  if (physicalLayout.coordinateSpace !== 'silhouette-footprint') {
    errors.push(`${path}.physicalLayout.coordinateSpace must be silhouette-footprint`)
  }
  if (physicalLayout.origin !== 'ground-left') {
    errors.push(`${path}.physicalLayout.origin must be ground-left`)
  }
  if (physicalLayout.allowEdgeContact !== true) {
    errors.push(`${path}.physicalLayout.allowEdgeContact must be true`)
  }
  for (const key of ['grammar', 'supportStrategy']) {
    if (!nonEmptyText(physicalLayout[key])) errors.push(`${path}.physicalLayout.${key} is required`)
  }
  if (!validStringList(physicalLayout.requiredKinds, 3)) {
    errors.push(`${path}.physicalLayout.requiredKinds must contain at least three unique kinds`)
  }
  if (!Array.isArray(physicalModules) || !physicalModules.length) {
    errors.push(`${path}.physicalModules must contain authored rectangles`)
    return errors
  }

  const massKinds = new Map((silhouetteSpec?.massing || []).map((mass) => [mass.id, mass.kind]))
  const moduleIds = new Set()
  const kinds = new Set()
  const validRectangles = []
  let structuralSpineCount = 0
  let groundedLoadPathCount = 0
  for (const [index, module] of physicalModules.entries()) {
    const modulePath = `${path}.physicalModules[${index}]`
    if (!module || typeof module !== 'object' || Array.isArray(module)) {
      errors.push(`${modulePath} must be an object`)
      continue
    }
    if (!nonEmptyText(module.id) || !BUILDING_FORM_ID.test(module.id)) {
      errors.push(`${modulePath}.id must be a slug`)
    } else if (moduleIds.has(module.id)) {
      errors.push(`${modulePath}.id must be unique`)
    }
    moduleIds.add(module.id)
    if (!nonEmptyText(module.kind) || !BUILDING_FORM_ID.test(module.kind)) {
      errors.push(`${modulePath}.kind must be a slug`)
    } else {
      kinds.add(module.kind)
    }
    if (!finiteRatio(module.xRatio)) errors.push(`${modulePath}.xRatio must be normalized`)
    if (!finiteRatio(module.widthRatio, 0.01, 1)) {
      errors.push(`${modulePath}.widthRatio must be between 0.01 and 1`)
    }
    if (!finiteRatio(module.heightRatio, 0.01, 1)) {
      errors.push(`${modulePath}.heightRatio must be between 0.01 and 1`)
    }
    if (!finiteRatio(module.baseRatio)) errors.push(`${modulePath}.baseRatio must be normalized`)
    const bounds = normalizedRectangleBounds(module)
    if (bounds) {
      if (bounds.left < -PHYSICAL_LAYOUT_EPSILON || bounds.right > 1 + PHYSICAL_LAYOUT_EPSILON) {
        errors.push(`${modulePath} must fit within normalized physical width`)
      }
      if (bounds.bottom < -PHYSICAL_LAYOUT_EPSILON || bounds.top > 1 + PHYSICAL_LAYOUT_EPSILON) {
        errors.push(`${modulePath} must fit within normalized physical height`)
      }
      if (bounds.left >= -PHYSICAL_LAYOUT_EPSILON && bounds.right <= 1 + PHYSICAL_LAYOUT_EPSILON
        && bounds.bottom >= -PHYSICAL_LAYOUT_EPSILON && bounds.top <= 1 + PHYSICAL_LAYOUT_EPSILON) {
        validRectangles.push({ index, module, bounds })
      }
    }
    if (!PHYSICAL_MODULE_ROLES.has(module.role)) errors.push(`${modulePath}.role is unsupported`)
    if (!PHYSICAL_MODULE_MATERIALS.has(module.material)) errors.push(`${modulePath}.material is unsupported`)
    if (!Number.isSafeInteger(module.towerIndex)
      || module.towerIndex < 0 || module.towerIndex >= towerCount) {
      errors.push(`${modulePath}.towerIndex must reference an authored tower`)
    }
    if (!nonEmptyText(module.moduleClass) || !BUILDING_FORM_ID.test(module.moduleClass)) {
      errors.push(`${modulePath}.moduleClass must be a slug`)
    }
    if (!nonEmptyText(module.massId) || !massKinds.has(module.massId)) {
      errors.push(`${modulePath}.massId must reference an authored silhouette mass`)
    } else if (module.massKind !== massKinds.get(module.massId)) {
      errors.push(`${modulePath}.massKind must match its authored silhouette mass`)
    }
    if (module.structuralSpine !== undefined && typeof module.structuralSpine !== 'boolean') {
      errors.push(`${modulePath}.structuralSpine must be boolean when present`)
    }
    if (module.structuralSpine === true) structuralSpineCount += 1
    if (module.rotation !== undefined
      && (!Number.isFinite(module.rotation) || module.rotation < -90 || module.rotation > 90)) {
      errors.push(`${modulePath}.rotation must be between -90 and 90 degrees`)
    }
    if (module.feature !== undefined && !nonEmptyText(module.feature)) {
      errors.push(`${modulePath}.feature must be non-empty when present`)
    }
    if (Math.abs(module.baseRatio) <= PHYSICAL_LAYOUT_EPSILON
      && ['support', 'wall', 'gate', 'threshold'].includes(module.role)) {
      groundedLoadPathCount += 1
    }
  }

  if (structuralSpineCount < 1) errors.push(`${path}.physicalModules must declare a structural spine`)
  if (groundedLoadPathCount < 2) errors.push(`${path}.physicalModules must provide at least two grounded load paths`)
  if (kinds.size < 3) errors.push(`${path}.physicalModules must contain at least three module kinds`)
  for (const requiredKind of physicalLayout.requiredKinds || []) {
    if (!kinds.has(requiredKind)) {
      errors.push(`${path}.physicalModules must include required kind ${requiredKind}`)
    }
  }

  const adjacency = new Map(validRectangles.map(({ index }) => [index, new Set()]))
  for (let leftIndex = 0; leftIndex < validRectangles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < validRectangles.length; rightIndex += 1) {
      const left = validRectangles[leftIndex]
      const right = validRectangles[rightIndex]
      if (rectanglesPenetrate(left.bounds, right.bounds)) {
        errors.push(`${path}.physicalModules ${left.module.id} and ${right.module.id} must not penetrate`)
      } else if (rectanglesShareLoadEdge(left.bounds, right.bounds)) {
        adjacency.get(left.index).add(right.index)
        adjacency.get(right.index).add(left.index)
      }
    }
  }
  if (validRectangles.length === physicalModules.length && validRectangles.length > 1) {
    const visited = new Set()
    const pending = [validRectangles[0].index]
    while (pending.length) {
      const current = pending.pop()
      if (visited.has(current)) continue
      visited.add(current)
      for (const neighbor of adjacency.get(current) || []) pending.push(neighbor)
    }
    if (visited.size !== validRectangles.length) {
      const disconnected = validRectangles
        .filter(({ index }) => !visited.has(index))
        .map(({ module }) => module.id)
      errors.push(`${path}.physicalModules must form one edge-connected building; disconnected: ${disconnected.join(', ')}`)
    }
  }
  return errors
}

export function validateCompleteBuildingSilhouettes(records = COMPLETE_BUILDING_SILHOUETTES) {
  const errors = []
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return ['complete building silhouettes must be an object']
  }
  const entries = Object.entries(records)
  if (entries.length < 18) errors.push('complete building silhouettes must contain at least eighteen specs')
  for (const [formId, spec] of entries) {
    const path = `completeBuildingSilhouettes.${formId}`
    if (!BUILDING_FORM_ID.test(formId)) errors.push(`${path}.id must be a slug`)
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      errors.push(`${path} must be an object`)
      continue
    }
    if (!nonEmptyText(spec.composition)) errors.push(`${path}.composition is required`)
    const footprint = spec.footprint
    if (!footprint || typeof footprint !== 'object' || Array.isArray(footprint)) {
      errors.push(`${path}.footprint is required`)
    } else {
      if (!finiteRatio(footprint.spanRatio, 0.3, 1)) {
        errors.push(`${path}.footprint.spanRatio must be between 0.3 and 1`)
      }
      if (!SILHOUETTE_SYMMETRIES.has(footprint.symmetry)) {
        errors.push(`${path}.footprint.symmetry is unsupported`)
      }
      if (!nonEmptyText(footprint.groundProfile)) errors.push(`${path}.footprint.groundProfile is required`)
    }

    const masses = Array.isArray(spec.massing) ? spec.massing : []
    if (!masses.length) errors.push(`${path}.massing must contain at least one mass`)
    const massIds = new Set()
    for (const [index, mass] of masses.entries()) {
      const massPath = `${path}.massing[${index}]`
      if (!mass || typeof mass !== 'object' || Array.isArray(mass)) {
        errors.push(`${massPath} must be an object`)
        continue
      }
      if (!nonEmptyText(mass.id)) errors.push(`${massPath}.id is required`)
      else if (massIds.has(mass.id)) errors.push(`${massPath}.id must be unique`)
      massIds.add(mass.id)
      if (!nonEmptyText(mass.kind)) errors.push(`${massPath}.kind is required`)
      if (!finiteRatio(mass.xRatio)) errors.push(`${massPath}.xRatio must be normalized`)
      if (!finiteRatio(mass.widthRatio, 0.05, 1)) errors.push(`${massPath}.widthRatio must be between 0.05 and 1`)
      if (!finiteRatio(mass.heightRatio, 0.05, 1)) errors.push(`${massPath}.heightRatio must be between 0.05 and 1`)
      if (!finiteRatio(mass.baseRatio)) errors.push(`${massPath}.baseRatio must be normalized`)
      if (Number.isFinite(mass.baseRatio) && Number.isFinite(mass.heightRatio)
        && mass.baseRatio + mass.heightRatio > 1.001) {
        errors.push(`${massPath} must fit within normalized silhouette height`)
      }
      if (Number.isFinite(mass.xRatio) && Number.isFinite(mass.widthRatio)
        && (mass.xRatio - mass.widthRatio / 2 < -0.001
          || mass.xRatio + mass.widthRatio / 2 > 1.001)) {
        errors.push(`${massPath} must fit within normalized silhouette width`)
      }
    }

    const roofs = Array.isArray(spec.roofSegments) ? spec.roofSegments : []
    if (!roofs.length) errors.push(`${path}.roofSegments must contain at least one segment`)
    for (const [index, roof] of roofs.entries()) {
      const roofPath = `${path}.roofSegments[${index}]`
      if (!nonEmptyText(roof?.kind)) errors.push(`${roofPath}.kind is required`)
      if (!finiteRatio(roof?.fromXRatio) || !finiteRatio(roof?.toXRatio)
        || roof.fromXRatio >= roof.toXRatio) {
        errors.push(`${roofPath} must define an ordered normalized horizontal span`)
      }
      if (!finiteRatio(roof?.elevationRatio)) errors.push(`${roofPath}.elevationRatio must be normalized`)
      if (!finiteRatio(roof?.pitch, -1, 1)) errors.push(`${roofPath}.pitch must be between -1 and 1`)
    }

    const connections = Array.isArray(spec.connections) ? spec.connections : []
    if (!Array.isArray(spec.connections)) errors.push(`${path}.connections must be an array`)
    for (const [index, connection] of connections.entries()) {
      const connectionPath = `${path}.connections[${index}]`
      if (!nonEmptyText(connection?.kind)) errors.push(`${connectionPath}.kind is required`)
      if (!massIds.has(connection?.fromMass) || !massIds.has(connection?.toMass)
        || connection.fromMass === connection.toMass) {
        errors.push(`${connectionPath} must reference two distinct authored masses`)
      }
      if (!finiteRatio(connection?.elevationRatio)) {
        errors.push(`${connectionPath}.elevationRatio must be normalized`)
      }
      if (typeof connection?.openBelow !== 'boolean') errors.push(`${connectionPath}.openBelow must be boolean`)
    }

    const openings = Array.isArray(spec.openings) ? spec.openings : []
    if (!openings.length) errors.push(`${path}.openings must contain at least one intentional void`)
    for (const [index, opening] of openings.entries()) {
      const openingPath = `${path}.openings[${index}]`
      if (!nonEmptyText(opening?.kind)) errors.push(`${openingPath}.kind is required`)
      for (const key of ['xRatio', 'widthRatio', 'heightRatio', 'baseRatio']) {
        if (!finiteRatio(opening?.[key], key === 'widthRatio' || key === 'heightRatio' ? 0.05 : 0, 1)) {
          errors.push(`${openingPath}.${key} must be normalized`)
        }
      }
      if (Number.isFinite(opening?.baseRatio) && Number.isFinite(opening?.heightRatio)
        && opening.baseRatio + opening.heightRatio > 1.001) {
        errors.push(`${openingPath} must fit within normalized silhouette height`)
      }
    }

    const wings = Array.isArray(spec.wings) ? spec.wings : []
    if (!Array.isArray(spec.wings)) errors.push(`${path}.wings must be an array`)
    for (const [index, wing] of wings.entries()) {
      const wingPath = `${path}.wings[${index}]`
      if (!['left', 'right'].includes(wing?.side)) errors.push(`${wingPath}.side is unsupported`)
      if (!nonEmptyText(wing?.kind)) errors.push(`${wingPath}.kind is required`)
      if (!finiteRatio(wing?.widthRatio, 0.05, 1)) errors.push(`${wingPath}.widthRatio must be normalized`)
      if (!finiteRatio(wing?.heightRatio, 0.05, 1)) errors.push(`${wingPath}.heightRatio must be normalized`)
    }

    const anchors = Array.isArray(spec.mechanismAnchors) ? spec.mechanismAnchors : []
    if (!Array.isArray(spec.mechanismAnchors)) errors.push(`${path}.mechanismAnchors must be an array`)
    const physicalFeatures = new Set(
      (LATE_CAMPAIGN_PHYSICAL_LAYOUTS[formId]?.physicalModules || [])
        .map((module) => module.feature)
        .filter(nonEmptyText),
    )
    for (const [index, anchor] of anchors.entries()) {
      const anchorPath = `${path}.mechanismAnchors[${index}]`
      if (!nonEmptyText(anchor?.mechanism)) errors.push(`${anchorPath}.mechanism is required`)
      if (!finiteRatio(anchor?.xRatio)) errors.push(`${anchorPath}.xRatio must be normalized`)
      if (!finiteRatio(anchor?.yRatio)) errors.push(`${anchorPath}.yRatio must be normalized`)
      if (!finiteRatio(anchor?.scale, 0.25, 2)) errors.push(`${anchorPath}.scale must be between 0.25 and 2`)
      const hasMassHost = nonEmptyText(anchor?.hostMassId)
      const hasFeatureHost = nonEmptyText(anchor?.hostFeature)
      if (hasMassHost === hasFeatureHost) {
        errors.push(`${anchorPath} must define exactly one hostMassId or hostFeature`)
      }
      if (hasMassHost && !massIds.has(anchor.hostMassId)) {
        errors.push(`${anchorPath}.hostMassId must reference an authored mass`)
      }
      if (hasFeatureHost && !physicalFeatures.has(anchor.hostFeature)) {
        errors.push(`${anchorPath}.hostFeature must reference an authored physical feature`)
      }
      if (!MECHANISM_PHYSICS_KINDS.has(anchor?.physicsKind)) {
        errors.push(`${anchorPath}.physicsKind is unsupported`)
      }
      if (typeof anchor?.blocksBirds !== 'boolean') {
        errors.push(`${anchorPath}.blocksBirds must be boolean`)
      }
    }
  }
  return errors
}

export function validateCompleteBuildingFormCatalog(records = COMPLETE_BUILDING_FORM_CATALOG) {
  const errors = []
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return ['complete building form catalog must be an object']
  }
  const entries = Object.entries(records)
  if (entries.length < 18) errors.push('complete building form catalog must contain at least eighteen forms')
  const names = new Set()
  for (const [formId, form] of entries) {
    const path = `completeBuildingForms.${formId}`
    if (!BUILDING_FORM_ID.test(formId)) errors.push(`${path}.id must be a slug`)
    if (!form || typeof form !== 'object' || Array.isArray(form)) {
      errors.push(`${path} must be an object`)
      continue
    }
    if (!nonEmptyText(form.name)) errors.push(`${path}.name is required`)
    else if (names.has(form.name)) errors.push(`${path}.name must be unique`)
    names.add(form.name)
    if (!BUILDING_CATEGORIES.has(form.category)) errors.push(`${path}.category is unsupported`)
    if (form.completeBuilding !== true) errors.push(`${path}.completeBuilding must be true`)
    if (!validStringList(form.towerForms)) errors.push(`${path}.towerForms must be a unique non-empty string list`)
    for (const key of ['roof', 'wall', 'foundation', 'structuralSystem']) {
      if (!nonEmptyText(form[key])) errors.push(`${path}.${key} is required`)
    }
    if (!Number.isSafeInteger(form.complexity) || form.complexity < 1 || form.complexity > 5) {
      errors.push(`${path}.complexity must be an integer from 1 to 5`)
    }
    if (!Number.isSafeInteger(form.supportPathCount)
      || form.supportPathCount < 1 || form.supportPathCount > 4) {
      errors.push(`${path}.supportPathCount must be an integer from 1 to 4`)
    }
    if (!validStringList(form.mechanisms, 0)) {
      errors.push(`${path}.mechanisms must be a unique string list`)
    }
    if (!validStringList(form.visualParts, 3)) {
      errors.push(`${path}.visualParts must contain at least three unique parts`)
    }
    const authoredSilhouette = COMPLETE_BUILDING_SILHOUETTES[formId]
    if (!authoredSilhouette) {
      errors.push(`${path}.silhouetteSpec references an unknown silhouette`)
    } else if (!sameSilhouetteSpec(form.silhouetteSpec, authoredSilhouette)) {
      errors.push(`${path}.silhouetteSpec must match its authored silhouette`)
    }
    if (form.silhouetteSpec) {
      const anchoredMechanisms = new Set(
        form.silhouetteSpec.mechanismAnchors?.map((anchor) => anchor.mechanism) || [],
      )
      for (const mechanism of form.mechanisms || []) {
        if (!anchoredMechanisms.has(mechanism)) {
          errors.push(`${path}.silhouetteSpec must anchor mechanism ${mechanism}`)
        }
      }
      for (const mechanism of anchoredMechanisms) {
        if (!form.mechanisms?.includes(mechanism)) {
          errors.push(`${path}.silhouetteSpec anchors undeclared mechanism ${mechanism}`)
        }
      }
    }
  }
  return errors
}

export function validateMainArchitectureBlueprints(records = MAIN_ARCHITECTURE_BLUEPRINTS) {
  const errors = []
  if (!Array.isArray(records) || records.length !== 18) {
    return ['blueprints must contain exactly eighteen records']
  }
  const ids = new Set()
  const levels = new Set()
  const mainFormIds = new Set()
  for (const [index, entry] of records.entries()) {
    const path = `blueprints[${index}]`
    if (!entry || typeof entry !== 'object') {
      errors.push(`${path} must be an object`)
      continue
    }
    if (typeof entry.id !== 'string' || !entry.id) errors.push(`${path}.id is required`)
    else if (ids.has(entry.id)) errors.push(`${path}.id must be unique`)
    ids.add(entry.id)
    if (!Number.isSafeInteger(entry.level) || entry.level < 1 || entry.level > 18) {
      errors.push(`${path}.level must be between 1 and 18`)
    } else if (levels.has(entry.level)) errors.push(`${path}.level must be unique`)
    levels.add(entry.level)
    if (!Array.isArray(entry.towerFloors) || !entry.towerFloors.length
      || entry.towerFloors.some((floor) => !Number.isSafeInteger(floor) || floor < 2 || floor > 5)) {
      errors.push(`${path}.towerFloors must contain integers from 2 to 5`)
    }
    if (!Array.isArray(entry.baseOffsets) || entry.baseOffsets.length !== entry.towerFloors?.length) {
      errors.push(`${path}.baseOffsets must match towerFloors`)
    }
    for (const rule of entry.constructionPalette || []) {
      if (!CONSTRUCTION_MATERIALS[rule.constructionId]) {
        errors.push(`${path}.constructionPalette references an unknown construction`)
      }
      if (!(rule.ratio > 0 && rule.ratio <= 1) || !Array.isArray(rule.roles) || !rule.roles.length) {
        errors.push(`${path}.constructionPalette entries need a ratio and roles`)
      }
    }
    if (entry.landmark?.constructionId && !CONSTRUCTION_MATERIALS[entry.landmark.constructionId]) {
      errors.push(`${path}.landmark references an unknown construction`)
    }
    const plan = entry.buildingPlan
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      errors.push(`${path}.buildingPlan is required`)
      continue
    }
    const form = COMPLETE_BUILDING_FORM_CATALOG[plan.formId]
    if (!form) errors.push(`${path}.buildingPlan.formId references an unknown complete building form`)
    else if (mainFormIds.has(plan.formId)) errors.push(`${path}.buildingPlan.formId must be unique in the main campaign`)
    mainFormIds.add(plan.formId)
    if (!nonEmptyText(plan.name)) errors.push(`${path}.buildingPlan.name is required`)
    if (!BUILDING_CATEGORIES.has(plan.category)) errors.push(`${path}.buildingPlan.category is unsupported`)
    if (plan.completeBuilding !== true) errors.push(`${path}.buildingPlan.completeBuilding must be true`)
    if (!validStringList(plan.towerForms)) {
      errors.push(`${path}.buildingPlan.towerForms must be a unique non-empty string list`)
    }
    for (const key of ['roof', 'wall', 'foundation', 'structuralSystem']) {
      if (!nonEmptyText(plan[key])) errors.push(`${path}.buildingPlan.${key} is required`)
    }
    if (!Number.isSafeInteger(plan.complexity) || plan.complexity < 1 || plan.complexity > 5) {
      errors.push(`${path}.buildingPlan.complexity must be an integer from 1 to 5`)
    }
    if (!Number.isSafeInteger(plan.supportPathCount)
      || plan.supportPathCount < 1 || plan.supportPathCount > 4) {
      errors.push(`${path}.buildingPlan.supportPathCount must be an integer from 1 to 4`)
    }
    if (!validStringList(plan.mechanisms, 0)) {
      errors.push(`${path}.buildingPlan.mechanisms must be a unique string list`)
    }
    if (!validStringList(plan.visualParts, 3)) {
      errors.push(`${path}.buildingPlan.visualParts must contain at least three unique parts`)
    }
    if (!plan.silhouetteSpec || typeof plan.silhouetteSpec !== 'object'
      || Array.isArray(plan.silhouetteSpec)) {
      errors.push(`${path}.buildingPlan.silhouetteSpec is required`)
    }
    const authoredPhysics = LATE_CAMPAIGN_PHYSICAL_LAYOUTS[plan.formId] || null
    if (entry.level >= 13) {
      errors.push(...validatePhysicalBuildingLayout(plan.physicalLayout, plan.physicalModules, {
        path: `${path}.buildingPlan`,
        silhouetteSpec: plan.silhouetteSpec,
        towerCount: entry.towerFloors?.length || 4,
      }))
      if (!authoredPhysics) {
        errors.push(`${path}.buildingPlan must reference an authored late-campaign physical layout`)
      } else if (JSON.stringify(plan.physicalLayout) !== JSON.stringify(authoredPhysics.physicalLayout)
        || JSON.stringify(plan.physicalModules) !== JSON.stringify(authoredPhysics.physicalModules)) {
        errors.push(`${path}.buildingPlan physical layout must match its authored complete building`)
      }
    } else if (plan.physicalLayout !== null
      || !Array.isArray(plan.physicalModules) || plan.physicalModules.length !== 0) {
      errors.push(`${path}.buildingPlan physical layout is reserved for main levels 13 through 18`)
    }
    for (const key of ['storyFunction', 'loadPath', 'failurePlane', 'signatureFeature']) {
      if (!nonEmptyText(plan[key])) errors.push(`${path}.buildingPlan.${key} is required`)
    }
    if (form) {
      for (const key of [
        'name', 'category', 'completeBuilding', 'roof', 'wall', 'foundation', 'complexity',
        'structuralSystem', 'supportPathCount',
      ]) {
        if (plan[key] !== form[key]) {
          errors.push(`${path}.buildingPlan.${key} must match its complete building form`)
        }
      }
      for (const key of ['towerForms', 'mechanisms', 'visualParts']) {
        if (!sameStringList(plan[key], form[key])) {
          errors.push(`${path}.buildingPlan.${key} must match its complete building form`)
        }
      }
      if (!sameSilhouetteSpec(plan.silhouetteSpec, form.silhouetteSpec)) {
        errors.push(`${path}.buildingPlan.silhouetteSpec must match its complete building form`)
      }
    }
  }
  const orderedPlans = records
    .filter((entry) => Number.isSafeInteger(entry?.level) && entry?.buildingPlan)
    .sort((left, right) => left.level - right.level)
  for (let index = 1; index < orderedPlans.length; index += 1) {
    if (orderedPlans[index].buildingPlan.complexity < orderedPlans[index - 1].buildingPlan.complexity) {
      errors.push('blueprints buildingPlan complexity must not decrease as the main campaign advances')
      break
    }
  }
  return errors
}
