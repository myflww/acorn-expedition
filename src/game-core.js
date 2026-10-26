// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { getMainEnvironmentTheme } from './main-environment-themes.js'
import {
  CONSTRUCTION_MATERIALS,
  architectureBlueprintForEncounter,
} from './main-architecture-blueprints.js'
import { terrainProfileForLevel } from './terrain-rules.js'

export { CONSTRUCTION_MATERIALS }

const UINT32_RANGE = 0x1_0000_0000

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

export const VIEWPORT = deepFreeze({
  width: 900,
  height: 600,
  fps: 30,
})

export const GRAVITY = 0.5
export const GROUND_Y = 520
export const SLING_X = 120
export const SLING_Y = 430
// The slightly stronger band adds roughly ten percent to a normal acorn's
// useful full-pull range without changing the aiming radius or flattening the
// trajectory puzzle. Runtime launch, aim previews, and special-stage
// reachability simulation all consume these shared constants.
export const MAX_PULL = 118
export const POWER = 0.265
export const FRICTION = 0.995
export const ACORN_HITBOX_BONUS = 2.5
export const MAIN_LEVELS = 18
export const MAIN_BOSS_LEVELS = deepFreeze([6, 12, 17, 18])
export const MIN_ZOOM = 0.55
export const MAX_ZOOM = 2
export const FORTRESS_START_X = 620
export const TOWER_SPACING = 178
export const MAX_WIND_MAGNITUDE = 0.09
// Late endless compounds can field a real royal garrison. Story and daily
// encounters keep their authored counts; this ceiling is consumed only by the
// endless pressure profile below and remains bounded for physics/runtime cost.
export const MAX_NON_BOSS_TARGETS = 12

export const WIND_TUNING = deepFreeze({
  mainBase: 0.04,
  mainPerLevel: 0.005,
  endlessBase: 0.05,
  endlessPerDepth: 0.0015,
})

export function levelWindMagnitude(mode, levelValue, authoredMagnitude = null) {
  const level = positiveLevel(levelValue)
  const authored = Number(authoredMagnitude)
  if (authoredMagnitude !== null && Number.isFinite(authored)) {
    return clamp(Math.abs(authored), 0, MAX_WIND_MAGNITUDE)
  }
  if (mode === 'endless') {
    const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
    return Math.min(
      MAX_WIND_MAGNITUDE,
      WIND_TUNING.endlessBase + depth * WIND_TUNING.endlessPerDepth,
    )
  }
  return Math.min(
    MAX_WIND_MAGNITUDE,
    WIND_TUNING.mainBase + level * WIND_TUNING.mainPerLevel,
  )
}

/**
 * Resolves the wind that the next launched acorn will actually receive.
 * `completedLaunches` is deliberately zero-based so aiming, HUD presentation
 * and the launch commit can share one prediction without mutating the map.
 */
export function windForPendingLaunch({
  currentWind = 0,
  sequence = null,
  completedLaunches = 0,
  advanceSteps = 1,
  keeperAlive = true,
} = {}) {
  const fallback = Number.isFinite(Number(currentWind)) ? Number(currentWind) : 0
  if (!keeperAlive || !Array.isArray(sequence) || sequence.length === 0) return fallback
  const launches = Math.max(0, Math.trunc(Number(completedLaunches) || 0))
  const steps = Math.max(1, Math.trunc(Number(advanceSteps) || 1))
  const candidate = Number(sequence[(launches * steps) % sequence.length])
  return Number.isFinite(candidate) ? candidate : fallback
}

// Authored in screen pixels and converted to world units at render time, so
// zooming out never reduces the selected single trajectory to a sub-pixel trail.
export const AIM_GUIDE_STYLE = deepFreeze({
  color: 'rgba(87,195,235,.98)',
  shadowColor: 'rgba(18,70,112,.82)',
  lineScreenWidth: 3.8,
  dashScreenLength: 3.2,
  gapScreenLength: 7.5,
  shadowScreenBlur: 4.5,
})

export const AIM_GUIDE_MODES = deepFreeze(['standard', 'beginner', 'off'])

export const AIM_GUIDE_MODE_LABELS = deepFreeze({
  standard: '有弹道',
  beginner: '新手弹道',
  off: '无弹道',
})

export function normalizeAimGuideMode(value, legacyAimGuide) {
  if (AIM_GUIDE_MODES.includes(value)) return value
  if (legacyAimGuide !== undefined) {
    return booleanValue(legacyAimGuide, true) ? 'standard' : 'off'
  }
  return 'standard'
}

export function nextAimGuideMode(value) {
  const mode = normalizeAimGuideMode(value)
  const index = AIM_GUIDE_MODES.indexOf(mode)
  return AIM_GUIDE_MODES[(index + 1) % AIM_GUIDE_MODES.length]
}

export const AUDIO_VOLUME_DEFAULTS = deepFreeze({
  music: 0.5,
  sfx: 0.9,
})

export function aimGuideVisualMetrics(zoom = 1) {
  const safeZoom = clamp(Number.isFinite(Number(zoom)) ? Number(zoom) : 1, MIN_ZOOM, MAX_ZOOM)
  return Object.freeze({
    zoom: safeZoom,
    lineWidth: AIM_GUIDE_STYLE.lineScreenWidth / safeZoom,
    dashLength: AIM_GUIDE_STYLE.dashScreenLength / safeZoom,
    gapLength: AIM_GUIDE_STYLE.gapScreenLength / safeZoom,
    shadowBlur: AIM_GUIDE_STYLE.shadowScreenBlur / safeZoom,
  })
}

export const SHOT_BUDGET_RULES = deepFreeze({
  endlessMaximumTotalShots: 8,
})

export const GOLDEN_ACORN_RULES = deepFreeze({
  baseChancePerLevel: 0.06,
  luckyChanceMultiplier: 3,
})

// Achievement rewards stay small enough that normal play remains the main
// source of golden acorns. Milestone achievements pay more than discoveries,
// while the complete set yields 17 acorns in total.
export const ACHIEVEMENT_REWARDS = deepFreeze({
  first_blood: 1,
  ten_kills: 2,
  egg_hunter: 1,
  combo5: 2,
  reach_lv10: 3,
  boss_slayer: 2,
  daily_win: 1,
  special_first: 2,
  special_all: 3,
})

export const CONSTANTS = deepFreeze({
  gravity: GRAVITY,
  groundY: GROUND_Y,
  slingX: SLING_X,
  slingY: SLING_Y,
  maxPull: MAX_PULL,
  power: POWER,
  acornHitboxBonus: ACORN_HITBOX_BONUS,
  friction: FRICTION,
  mainLevels: MAIN_LEVELS,
  mainBossLevels: MAIN_BOSS_LEVELS,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  fortressStartX: FORTRESS_START_X,
  towerSpacing: TOWER_SPACING,
  maxWindMagnitude: MAX_WIND_MAGNITUDE,
  maxNonBossTargets: MAX_NON_BOSS_TARGETS,
  endlessMaximumTotalShots: SHOT_BUDGET_RULES.endlessMaximumTotalShots,
})

export const TALENTS = deepFreeze({
  feather: {
    icon: 'feather', name: '轻羽', desc: '重力降低20%，弹道更飘',
    effects: { gravityMultiplier: 0.8 },
  },
  power: {
    icon: 'power', name: '巨力', desc: '橡果直接撞击伤害+1',
    effects: { damageBonus: 1 },
  },
  pack: {
    icon: 'pack', name: '备战', desc: '每关额外+1只橡宝，不计入余弹星级与奖励；满仓装不下时，改为1枚基础弹直击+1',
    effects: {
      extraShots: 1,
      overflowDirectDamageBonus: 1,
      countsForReserveStars: false,
      countsForReserveBonus: false,
    },
  },
  flame: {
    icon: 'flame', name: '烈焰尾迹', desc: '火焰航迹首次擦过建材造成1点伤害；木材随后再受1点灼烧',
    effects: {
      trailBlockDamage: 1,
      woodBurnDamage: 1,
      trailRadius: 28,
      trailSpawnInterval: 3,
      trailLifeTicks: 45,
      burnDurationTicks: 72,
    },
  },
  frost: {
    icon: 'frost', name: '极寒体质', desc: '霜环范围+35%，永久脆化倍率再提高25%',
    effects: {
      frostRadiusMultiplier: 1.35,
      brittleDamageMultiplier: 1.25,
    },
  },
  leech: {
    icon: 'leech', name: '能量回收', desc: '击倒松鼠35%概率返还橡果',
    effects: { refundChance: 0.35 },
  },
  shock: {
    icon: 'shock', name: '共振', desc: '冲击波范围+60%',
    effects: { shockwaveRadiusMultiplier: 1.6 },
  },
  lucky: {
    icon: 'lucky', name: '幸运星', desc: '金橡果出现率×3，更快解锁天赋',
    effects: { goldenEggChanceMultiplier: 3 },
  },
  comboM: {
    icon: 'comboM', name: '连击大师', desc: '连击加分×2，更快解锁天赋',
    effects: { comboScoreMultiplier: 2 },
  },
  stonebreaker: {
    icon: 'stonebreaker', name: '破甲尖锥', desc: '对石块直接伤害+1，并向附近最多2块石材扩散1点裂纹伤害',
    effects: {
      stoneDamageBonus: 1,
      stoneCrackRadius: 64,
      stoneCrackDamage: 1,
      stoneCrackMaxTargets: 2,
    },
  },
  blastCore: {
    icon: 'blastCore', name: '爆破核心', desc: '爆炸橡果的爆炸半径+25%',
    effects: { explosionRadiusMultiplier: 1.25 },
  },
  tailwind: {
    icon: 'tailwind', name: '定风羽', desc: '风力对橡果的影响降低50%',
    effects: { windMultiplier: 0.5 },
  },
  secondWind: {
    icon: 'secondWind', name: '绝境补给', desc: '每关首次耗尽橡宝时，从本关弹药池补给1只强化橡宝，直接伤害+1；不计入余弹星级与奖励',
    effects: {
      rescueShots: 1,
      rescuesPerLevel: 1,
      rescueBirdType: 'current-pool',
      rescueDamageBonus: 1,
      countsForReserveStars: false,
      countsForReserveBonus: false,
    },
  },
  tacticalMagazine: {
    icon: 'tacticalMagazine', name: '战术弹仓', desc: '解锁待发序列换位，可在矄准前把任意待发橡宝换到发射位',
    effects: { queueSelectionEnabled: true },
  },
  windTrace: {
    icon: 'windTrace', name: '风迹推演', desc: '横风关显示金色风偏落点与风廊趋势，不替代设置中的蓝色新手弹道',
    effects: {
      windTraceGuideEnabled: true,
      windTraceLandingMarkerEnabled: true,
      windCorridorPreviewEnabled: true,
    },
  },
})

// Main-route structure specialist. Unlike the generic 烈焰尾迹 talent, this
// acorn carries its own one-shot ignition core and therefore works even when
// the player has not drafted any fire talent.
export const FIRE_ACORN = deepFreeze({
  type: 'fire',
  title: '烈焰橡果',
  unlockLevel: 8,
  stats: {
    radius: 16,
    mass: 1.08,
    launchSpeed: 1,
    gravityScale: 1.01,
    restitution: 0.3,
    baseDamage: 1,
  },
  ability: {
    id: 'ember-anchor',
    spreadRadius: 72,
    maximumNeighbors: 2,
    ignitionDamage: 1,
    burnDurationTicks: 120,
    woodBurnDamage: 2,
    otherBurnDamage: 1,
  },
})

// The runtime has ten launchable acorns plus the golden-acorn stage pickup.
// Keeping the complete content vocabulary beside the affinity table makes it
// harder for a newly authored acorn to silently miss the talent draft system.
export const ACORN_AFFINITY_TYPES = deepFreeze([
  'red',
  'bomb',
  'split',
  'dash',
  'fire',
  'drill',
  'frost',
  'vine',
  'boomerang',
  'quake',
  'golden',
])
const LAUNCHABLE_AFFINITY_TYPES = deepFreeze(ACORN_AFFINITY_TYPES.filter((type) => type !== 'golden'))

// Talent drafting is data-driven: `requiresAll`/`requiresAny` prevent a talent
// with no runtime effect from entering the pool, `directAny` identifies options
// that answer the current encounter, and the remaining fields only influence
// deterministic weighting. Tokens are produced by normalizeTalentContext().
export const TALENT_AFFINITIES = deepFreeze({
  feather: {
    category: 'trajectory',
    baseWeight: 1.05,
    requiresAll: ['feature:launchable-acorn'],
    requiresAny: [],
    directAny: ['feature:launchable-acorn'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: ['vine', 'boomerang'],
    preferredTokens: ['bird:frost', 'bird:vine', 'bird:boomerang', 'bird:quake', 'enemy:shaman', 'feature:wind'],
  },
  power: {
    category: 'impact',
    baseWeight: 1.1,
    requiresAll: ['feature:launchable-acorn'],
    requiresAny: [],
    directAny: ['feature:launchable-acorn'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: ['red', 'dash'],
    preferredTokens: ['bird:red', 'bird:dash', 'bird:drill', 'bird:boomerang', 'bird:quake', 'objective:defeat-boss'],
  },
  pack: {
    category: 'reserves',
    baseWeight: 0.95,
    requiresAll: ['feature:shots'],
    requiresAny: [],
    directAny: ['feature:shots'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: [],
    preferredTokens: ['feature:tight-shot-limit', 'objective:collapse-and-clear', 'objective:defeat-boss'],
  },
  flame: {
    category: 'structure',
    baseWeight: 1,
    requiresAll: ['feature:launchable-acorn', 'feature:blocks'],
    requiresAny: [],
    directAny: ['feature:blocks'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: ['fire', 'split', 'vine', 'boomerang'],
    preferredTokens: ['material:wood', 'bird:fire', 'bird:split', 'bird:vine', 'enemy:engineer', 'objective:collapse-and-clear'],
  },
  frost: {
    category: 'control',
    baseWeight: 1.05,
    requiresAll: [],
    requiresAny: ['bird:frost'],
    directAny: ['bird:frost'],
    birdAny: ['frost'],
    signatureBirdTypes: ['frost'],
    preferredTokens: ['bird:frost', 'material:ice', 'enemy:glider', 'enemy:burrower', 'enemy:engineer'],
  },
  leech: {
    category: 'reserves',
    baseWeight: 0.9,
    requiresAll: ['feature:targets'],
    requiresAny: [],
    directAny: ['feature:targets'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: [],
    preferredTokens: ['feature:many-targets', 'bird:split', 'bird:bomb', 'bird:quake'],
  },
  shock: {
    category: 'structure',
    baseWeight: 1,
    requiresAll: ['feature:blocks'],
    requiresAny: [],
    directAny: ['feature:blocks'],
    birdAny: ['bomb', 'quake'],
    signatureBirdTypes: ['quake'],
    preferredTokens: ['bird:bomb', 'bird:quake', 'objective:collapse-and-clear', 'feature:many-targets'],
  },
  lucky: {
    category: 'score',
    baseWeight: 0.72,
    requiresAll: ['feature:score'],
    requiresAny: [],
    directAny: ['feature:golden-acorn'],
    birdAny: [],
    signatureBirdTypes: [],
    preferredTokens: ['feature:golden-acorn', 'objective:eliminate-all'],
  },
  comboM: {
    category: 'score',
    baseWeight: 0.82,
    requiresAll: ['feature:score'],
    requiresAny: [],
    directAny: ['feature:combo-opportunity'],
    birdAny: ['split', 'drill'],
    signatureBirdTypes: ['split'],
    preferredTokens: ['feature:combo-opportunity', 'bird:split', 'bird:drill', 'feature:many-targets'],
  },
  stonebreaker: {
    category: 'structure',
    baseWeight: 1.08,
    requiresAll: [],
    requiresAny: ['material:stone'],
    directAny: ['material:stone'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: ['drill'],
    preferredTokens: ['material:stone', 'bird:drill', 'objective:collapse-and-clear'],
  },
  blastCore: {
    category: 'ability',
    baseWeight: 1.12,
    requiresAll: [],
    requiresAny: ['bird:bomb'],
    directAny: ['bird:bomb'],
    birdAny: ['bomb'],
    signatureBirdTypes: ['bomb'],
    preferredTokens: ['bird:bomb', 'enemy:shield', 'feature:many-targets', 'objective:defeat-boss'],
  },
  tailwind: {
    category: 'trajectory',
    baseWeight: 1.08,
    requiresAll: [],
    requiresAny: ['feature:wind'],
    directAny: ['feature:wind'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: [],
    preferredTokens: ['feature:wind', 'enemy:shaman', 'rule:wind-cycle'],
  },
  secondWind: {
    category: 'reserves',
    baseWeight: 0.92,
    requiresAll: ['feature:shots'],
    requiresAny: [],
    directAny: ['feature:shots'],
    birdAny: [],
    signatureBirdTypes: [],
    preferredTokens: ['feature:tight-shot-limit', 'objective:defeat-boss', 'feature:many-targets'],
  },
  tacticalMagazine: {
    category: 'reserves',
    baseWeight: 1.02,
    requiresAll: ['feature:shots', 'feature:launchable-acorn'],
    requiresAny: ['feature:mixed-magazine', 'talent:tacticalMagazine'],
    directAny: ['feature:shots'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: [],
    preferredTokens: ['feature:tight-shot-limit', 'feature:many-targets', 'objective:defeat-boss'],
  },
  windTrace: {
    category: 'trajectory',
    baseWeight: 1.08,
    requiresAll: [],
    requiresAny: ['feature:wind'],
    directAny: ['feature:wind'],
    birdAny: LAUNCHABLE_AFFINITY_TYPES,
    signatureBirdTypes: ['boomerang', 'vine'],
    preferredTokens: ['feature:wind', 'rule:wind-cycle', 'enemy:glider', 'bird:boomerang'],
  },
})

const TALENT_SCORE_THRESHOLDS = [
  0,
  5_000,
  12_000,
  22_000,
  35_000,
  50_000,
  70_000,
  95_000,
  125_000,
  160_000,
  200_000,
  245_000,
  295_000,
  355_000,
  425_000,
  505_000,
  595_000,
  695_000,
  805_000,
  925_000,
  1_055_000,
  1_195_000,
  1_345_000,
  1_505_000,
  1_675_000,
  1_855_000,
  2_045_000,
  2_245_000,
  2_455_000,
  2_675_000,
]

// A score of zero is the single opening pick. Later picks are earned from the
// cumulative score of the current run. The widening gaps keep main-mode picks
// meaningful while leaving long endless runs enough room for rank-three
// upgrades, fusions, and rare acorn contracts after the old 295,000-point cap.
export const TALENT_SCORE_MILESTONES = deepFreeze(TALENT_SCORE_THRESHOLDS.map((score, index) => ({
  id: index === 0 ? 'opening' : `score-${score}`,
  index,
  score,
})))

export const STORY = deepFreeze([
  {
    level: 1,
    title: '序章 · 失窃之夜',
    text: '千年寒冬将至。一夜之间，松鼠军团搬空了王国的粮仓。\n年迈的橡树长老把祖传的树枝弹射器交到你手里：\n“去吧，橡宝。把冬天抢回来。”',
  },
  {
    level: 4,
    title: '第一章 · 风峡追踪',
    text: '车辙消失在风峡。松鼠们把偷来的橡果堆在高塔后，\n又用狂风守住山口。看风标，留出风偏；\n橡果不会顺风低头，但会借风转弯。',
  },
  {
    level: 6,
    title: '关隘战 · 边境守将',
    text: '峡口尽头，披甲守将用两座塔锁死了粮车。\n这不再是追击，而是第一场攻坚战。\n拆掉承重点，别和每块石头硬碰。',
  },
  {
    level: 7,
    title: '第二章 · 升降林场',
    text: '越过山口，运粮线进入昼夜运转的升降林场。\n平台会挡住低弹道，也会把橡宝送上高处。\n机关不分敌我，看准节奏的人才是主人。',
  },
  {
    level: 10,
    title: '第三章 · 霜石关',
    text: '运粮线的第二道门是一座冰木与岩石咬合的堡垒。\n石柱耐打，冰块却能让整层失衡。\n找对材料，一发就能变成一场雪崩。',
  },
  {
    level: 12,
    title: '关隘战 · 黑松将军',
    text: '黑松将军收拢残兵，在霜石关后摆下最后一座防线。\n它以为坚甲能抵住每一发橡果，\n却忘了脚下的城墙也会倒。',
  },
  {
    level: 13,
    title: '第四章 · 云杉运输线',
    text: '关后的地图上，六个印记一直通向王城。\n敌人开始用石材加固底层，并把守卫分散到高处。\n从现在起，每一发都要同时解决结构与目标。',
  },
  {
    level: 16,
    title: '第五章 · 王城机关阵',
    text: '王城外垒把风峡的气流和林场的升降机关接在了一起。\n弹道、时机、倒塌顺序，缺一不可。\n城门已经在眼前，但最难的三步才刚开始。',
  },
  {
    level: 17,
    title: '决战前夜 · 将军之怒',
    text: '松鼠将军挡在王庭之前，身后是最后四名近卫。\n“小小橡果，也配谈冬天？”\n“配不配，弹一下就知道。”',
  },
  {
    level: 18,
    title: '终章 · 大王与春天',
    text: '王庭之上，松鼠大王启动了风机与升降桥，\n粮仓就锁在它身后。赢了，冬天就只是冬天；\n输了，冬天就是永远。——拉满你的弹弓吧。',
  },
])

export const EPILOGUE = deepFreeze([
  '【后日谈】粮仓满了，但边境还有松鼠残党在流浪……\n也许，冬天教会它们的只是饥饿。',
  '【后日谈】橡树长老在你的弹弓上刻了一行字：\n“射程即正义。”',
  '【后日谈】有只小松鼠偷偷还回来一颗橡果，\n上面留着牙印，和一张道歉的树叶。',
  '【后日谈】传说最远的弹道可以绕世界一圈。\n你决定试试。',
  '【后日谈】春天来了。但弹弓，舍不得放下。',
])

export function clamp(value, minimum, maximum) {
  if (![value, minimum, maximum].every(Number.isFinite)) {
    throw new TypeError('clamp expects finite numbers')
  }
  if (minimum > maximum) throw new RangeError('minimum cannot exceed maximum')
  return Math.min(maximum, Math.max(minimum, value))
}

export function calculateCrushDamage(impactSpeed, mass = 1) {
  const speed = Number(impactSpeed)
  const normalizedMass = Number(mass)
  if (!Number.isFinite(speed) || !Number.isFinite(normalizedMass) || speed <= 0 || normalizedMass <= 0) return 0
  const impactEnergy = speed * Math.sqrt(normalizedMass)
  // Falling structures should reward a deliberate collapse without letting a
  // small settling wobble erase a multi-hit enemy. Stone remains the most
  // dangerous material through mass, but only a genuinely fast fall hurts.
  if (impactEnergy >= 22) return 2
  if (impactEnergy >= 13) return 1
  return 0
}

// Every acorn only deals direct collision damage when it genuinely enters the
// contact with enough normal momentum. This prevents any spent shell resting
// against a post from grinding away hit points every few ticks. Explosions,
// burning and authored abilities are separate damage paths and never pass
// through this rule.
export const ORDINARY_ACORN_IMPACT_RULES = deepFreeze({
  minimumClosingSpeed: 2.2,
  minimumMomentum: 2.5,
  restingRelativeSpeed: 1.2,
  restingSurfaceNormalY: -0.6,
})

// Damage eligibility and scene lifetime are deliberately separate contracts.
// An acorn may be harmless after losing momentum while still remaining on
// screen long enough for the landing to read. Conversely, a shell caught in a
// tiny physics loop must not keep the turn open for the old 30-second timeout.
export const ACORN_LIFECYCLE_RULES = deepFreeze({
  minimumVisibleTicks: 15,
  groundedSettleTicks: 18,
  maximumGroundedTicks: 90,
  structureSettleTicks: 24,
  platformSettleTicks: 24,
  stalledSettleTicks: 54,
  stalledSpeed: 1.65,
  stalledDisplacement: 0.9,
  outsideSettleTicks: 6,
  maximumActiveTicks: 360,
})

export function advanceAcornLifecycleCounters(previous = {}, observation = {}) {
  const count = (key) => Math.max(0, Math.floor(finiteNumber(previous[key])))
  const abilityActive = Boolean(observation.abilityActive)
  const grounded = Boolean(observation.grounded)
  const groundedStable = grounded && Boolean(observation.groundedStable)
  const restingOnStructure = Boolean(observation.restingOnStructure)
  const restingOnPlatform = Boolean(observation.restingOnPlatform)
  const speed = Math.max(0, finiteNumber(observation.speed))
  const displacement = Math.max(0, finiteNumber(observation.displacement))
  const stalled = speed <= ACORN_LIFECYCLE_RULES.stalledSpeed
    && displacement <= ACORN_LIFECYCLE_RULES.stalledDisplacement

  return Object.freeze({
    groundedStillTicks: !abilityActive && groundedStable ? count('groundedStillTicks') + 1 : 0,
    groundedTicks: !abilityActive && grounded ? count('groundedTicks') + 1 : 0,
    structureStillTicks: !abilityActive && restingOnStructure
      ? count('structureStillTicks') + 1 : 0,
    platformStillTicks: !abilityActive && restingOnPlatform
      ? count('platformStillTicks') + 1 : 0,
    stalledTicks: !abilityActive && stalled ? count('stalledTicks') + 1 : 0,
    outsideWorldTicks: observation.outsideWorld ? count('outsideWorldTicks') + 1 : 0,
  })
}

export function evaluateAcornLifecycle(options = {}) {
  const age = Math.max(0, Math.floor(finiteNumber(options.age)))
  const groundedStillTicks = Math.max(0, Math.floor(finiteNumber(options.groundedStillTicks)))
  const groundedTicks = Math.max(0, Math.floor(finiteNumber(options.groundedTicks)))
  const structureStillTicks = Math.max(0, Math.floor(finiteNumber(options.structureStillTicks)))
  const platformStillTicks = Math.max(0, Math.floor(finiteNumber(options.platformStillTicks)))
  const stalledTicks = Math.max(0, Math.floor(finiteNumber(options.stalledTicks)))
  const outsideWorldTicks = Math.max(0, Math.floor(finiteNumber(options.outsideWorldTicks)))
  const farOutsideWorld = Boolean(options.farOutsideWorld)
  const abilityActive = Boolean(options.abilityActive)

  if (farOutsideWorld || outsideWorldTicks >= ACORN_LIFECYCLE_RULES.outsideSettleTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'out-of-bounds' })
  }
  if (age >= ACORN_LIFECYCLE_RULES.maximumActiveTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'maximum-lifetime' })
  }
  if (abilityActive) return Object.freeze({ shouldSettle: false, reason: 'ability-active' })
  if (age < ACORN_LIFECYCLE_RULES.minimumVisibleTicks) {
    return Object.freeze({ shouldSettle: false, reason: 'minimum-visible-time' })
  }
  if (groundedStillTicks >= ACORN_LIFECYCLE_RULES.groundedSettleTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'grounded' })
  }
  if (groundedTicks >= ACORN_LIFECYCLE_RULES.maximumGroundedTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'grounded-timeout' })
  }
  if (structureStillTicks >= ACORN_LIFECYCLE_RULES.structureSettleTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'resting-on-structure' })
  }
  if (platformStillTicks >= ACORN_LIFECYCLE_RULES.platformSettleTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'resting-on-platform' })
  }
  if (stalledTicks >= ACORN_LIFECYCLE_RULES.stalledSettleTicks) {
    return Object.freeze({ shouldSettle: true, reason: 'stalled' })
  }
  return Object.freeze({ shouldSettle: false, reason: 'active' })
}

export function evaluateAcornStructureImpact(options = {}) {
  const type = typeof options.type === 'string' ? options.type : 'red'
  const splitClone = Boolean(options.splitClone)
  const ordinary = type === 'red' && !splitClone

  const enteringContact = Boolean(options.enteringContact ?? true)
  if (!enteringContact) {
    return Object.freeze({
      eligible: false,
      ordinary,
      momentumGated: true,
      enteringContact: false,
      closingSpeed: 0,
      momentum: 0,
      reason: 'same-contact',
    })
  }

  const requestedNormalX = finiteNumber(options.normalX)
  const requestedNormalY = finiteNumber(options.normalY)
  const normalLength = Math.hypot(requestedNormalX, requestedNormalY)
  if (normalLength <= 1e-9) {
    return Object.freeze({
      eligible: false,
      ordinary,
      momentumGated: true,
      enteringContact: true,
      closingSpeed: 0,
      momentum: 0,
      reason: 'invalid-normal',
    })
  }

  const normalX = requestedNormalX / normalLength
  const normalY = requestedNormalY / normalLength
  const relativeVelocityX = finiteNumber(options.birdVx) - finiteNumber(options.blockVx)
  const relativeVelocityY = finiteNumber(options.birdVy) - finiteNumber(options.blockVy)
  const closingSpeed = Math.max(0, -(
    relativeVelocityX * normalX + relativeVelocityY * normalY
  ))
  const mass = Math.max(0, finiteNumber(options.mass, 1))
  const momentum = closingSpeed * mass
  const base = {
    ordinary,
    momentumGated: true,
    enteringContact: true,
    closingSpeed,
    momentum,
  }
  if (closingSpeed + Number.EPSILON < ORDINARY_ACORN_IMPACT_RULES.minimumClosingSpeed) {
    return Object.freeze({ ...base, eligible: false, reason: 'insufficient-closing-speed' })
  }
  if (momentum + Number.EPSILON < ORDINARY_ACORN_IMPACT_RULES.minimumMomentum) {
    return Object.freeze({ ...base, eligible: false, reason: 'insufficient-momentum' })
  }
  return Object.freeze({ ...base, eligible: true, reason: 'eligible' })
}

export function calculateOverviewCamera({ left, right, preferredZoom = 1 } = {}) {
  if (![left, right, preferredZoom].every(Number.isFinite) || right <= left || preferredZoom <= 0) {
    throw new RangeError('calculateOverviewCamera expects finite ascending bounds and a positive zoom')
  }
  const contentWidth = Math.max(720, right - left)
  const fitZoom = Math.min(1, (VIEWPORT.width - 36) / contentWidth)
  return {
    x: (left + right) / 2,
    y: VIEWPORT.height / 2,
    zoom: clamp(fitZoom * preferredZoom, MIN_ZOOM, MAX_ZOOM),
  }
}

function uint32Seed(seed) {
  const numeric = Number(seed)
  if (!Number.isFinite(numeric)) throw new TypeError('seed must be a finite number')
  return Math.trunc(numeric) >>> 0 || 1
}

export class Rng {
  constructor(seed = 1) {
    this.initialSeed = uint32Seed(seed)
    this._state = this.initialSeed
  }

  get state() {
    return this._state
  }

  next() {
    this._state = (Math.imul(this._state, 1_664_525) + 1_013_904_223) >>> 0
    return this._state / UINT32_RANGE
  }

  range(minimum, maximum) {
    if (![minimum, maximum].every(Number.isFinite) || minimum > maximum) {
      throw new RangeError('range expects finite ascending bounds')
    }
    return minimum + this.next() * (maximum - minimum)
  }

  integer(minimum, maximumExclusive) {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximumExclusive) || minimum >= maximumExclusive) {
      throw new RangeError('integer expects safe integer bounds with minimum < maximumExclusive')
    }
    return minimum + Math.floor(this.next() * (maximumExclusive - minimum))
  }

  chance(probability) {
    return this.next() < clamp(probability, 0, 1)
  }

  pick(values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new RangeError('pick expects a non-empty array')
    }
    return values[this.integer(0, values.length)]
  }

  clone() {
    const copy = new Rng(this.initialSeed)
    copy._state = this._state
    return copy
  }
}

function validCalendarParts(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return false
  const candidate = new Date(year, month - 1, day)
  return candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
}

export function dateSeed(value = new Date()) {
  let year
  let month
  let day

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    ;[year, month, day] = value.split('-').map(Number)
  } else if (value && typeof value === 'object' && !(value instanceof Date)
    && 'year' in value && 'month' in value && 'day' in value) {
    year = Number(value.year)
    month = Number(value.month)
    day = Number(value.day)
  } else {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) throw new RangeError('dateSeed received an invalid date')
    year = date.getFullYear()
    month = date.getMonth() + 1
    day = date.getDate()
  }

  if (!validCalendarParts(year, month, day)) {
    throw new RangeError('dateSeed received invalid calendar parts')
  }
  return year * 10_000 + month * 100 + day
}

function seedPart(value) {
  if (value instanceof Date) return `date:${value.toISOString()}`
  if (value === null) return 'null:'
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('mixSeed does not accept non-finite numbers')
      return `number:${Object.is(value, -0) ? '-0' : value}`
    case 'bigint': return `bigint:${value}`
    case 'string': return `string:${value}`
    case 'boolean': return `boolean:${value}`
    case 'undefined': return 'undefined:'
    default: throw new TypeError('mixSeed accepts only primitive values and Date instances')
  }
}

export function mixSeed(...parts) {
  let hash = 0x811c9dc5
  for (const part of parts) {
    const text = seedPart(part)
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index)
      hash = Math.imul(hash ^ (code & 0xff), 0x01000193) >>> 0
      hash = Math.imul(hash ^ (code >>> 8), 0x01000193) >>> 0
    }
    hash = Math.imul(hash ^ 0xff, 0x01000193) >>> 0
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d) >>> 0
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b) >>> 0
  hash ^= hash >>> 16
  return hash >>> 0 || 1
}

/**
 * Performs exactly one golden-acorn spawn roll for a level. A second random
 * value is reserved for placement so changing fortress size never changes the
 * level-wide incidence rate.
 */
export function rollGoldenAcornForLevel(options = {}) {
  if (!isRecord(options)) throw new TypeError('rollGoldenAcornForLevel expects an options object')
  const level = positiveLevel(options.level ?? 1)
  const mode = typeof options.mode === 'string' && options.mode ? options.mode : 'main'
  const seed = uint32Seed(options.seed ?? 1)
  const configuredMultiplier = Number(options.luckyMultiplier)
  const luckyMultiplier = Number.isFinite(configuredMultiplier)
    ? Math.max(1, configuredMultiplier)
    : options.lucky ? GOLDEN_ACORN_RULES.luckyChanceMultiplier : 1
  const chance = Math.min(1, GOLDEN_ACORN_RULES.baseChancePerLevel * luckyMultiplier)
  const rng = new Rng(mixSeed(seed, 'golden-acorn-per-level', mode, level))
  const roll = rng.next()
  const placementRoll = rng.next()

  return Object.freeze({
    spawned: roll < chance,
    chance,
    roll,
    placementRoll,
    luckyMultiplier,
  })
}

function talentStringList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback
  return [...new Set(source
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, 'en'))
}

function talentCount(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

function normalizeTalentRules(source) {
  const kinds = new Set(talentStringList(source.ruleKinds))
  const ids = new Set(talentStringList(source.ruleIds))
  const rules = Array.isArray(source.rules)
    ? source.rules
    : Array.isArray(source.mapRules) ? source.mapRules : []
  for (const rule of rules) {
    if (typeof rule === 'string') {
      kinds.add(rule)
      continue
    }
    if (!isRecord(rule)) continue
    if (typeof rule.kind === 'string' && rule.kind.trim()) kinds.add(rule.kind.trim())
    if (typeof rule.id === 'string' && rule.id.trim()) ids.add(rule.id.trim())
  }
  return {
    kinds: [...kinds].sort((first, second) => first.localeCompare(second, 'en')),
    ids: [...ids].sort((first, second) => first.localeCompare(second, 'en')),
  }
}

function normalizeTalentContext(value = {}) {
  const source = isRecord(value) ? value : {}
  const birdInput = source.birdTypes ?? source.acornTypes
  const birdTypes = talentStringList(birdInput, ['red'])
    .filter((type) => type !== 'golden')
  const materialTypes = talentStringList(source.materialTypes, ['wood'])
  const enemyTypes = talentStringList(source.enemyTypes, ['normal'])
  const rules = normalizeTalentRules(source)
  const mapType = typeof source.mapType === 'string' && source.mapType.trim()
    ? source.mapType.trim()
    : 'normal'
  const objectiveType = typeof source.objectiveType === 'string' && source.objectiveType.trim()
    ? source.objectiveType.trim()
    : 'eliminate-all'
  const signatureBirdType = typeof source.signatureBirdType === 'string'
    ? source.signatureBirdType.trim()
    : ''
  const windX = Number.isFinite(Number(source.windX)) ? Number(source.windX) : 0
  const blockCount = talentCount(source.blockCount, materialTypes.length ? 1 : 0)
  const targetCount = talentCount(source.targetCount, enemyTypes.length ? 1 : 0)
  const shotLimit = talentCount(source.shotLimit, 3)
  const difficulty = talentCount(source.difficulty, 1)
  const hasBlocks = source.hasBlocks === undefined ? blockCount > 0 : Boolean(source.hasBlocks)
  const hasTargets = source.hasTargets === undefined ? targetCount > 0 : Boolean(source.hasTargets)
  const tokens = new Set(['feature:score'])

  for (const type of birdTypes) {
    tokens.add(`bird:${type}`)
    tokens.add(`acorn:${type}`)
  }
  for (const type of materialTypes) tokens.add(`material:${type}`)
  for (const type of enemyTypes) tokens.add(`enemy:${type}`)
  for (const kind of rules.kinds) tokens.add(`rule:${kind}`)
  for (const id of rules.ids) tokens.add(`rule-id:${id}`)
  for (const id of talentStringList(source.ownedTalentIds)) tokens.add(`talent:${id}`)
  tokens.add(`map:${mapType}`)
  tokens.add(`objective:${objectiveType}`)
  if (birdTypes.length) tokens.add('feature:launchable-acorn')
  if (new Set(talentStringList(source.magazineBirdTypes, birdTypes)).size > 1) tokens.add('feature:mixed-magazine')
  if (hasBlocks) tokens.add('feature:blocks')
  if (hasTargets) tokens.add('feature:targets')
  if (shotLimit > 0) tokens.add('feature:shots')
  if (shotLimit > 0 && shotLimit <= 5) tokens.add('feature:tight-shot-limit')
  if (targetCount >= 4) tokens.add('feature:many-targets')
  if (hasBlocks && hasTargets && blockCount + targetCount >= 3) tokens.add('feature:combo-opportunity')
  if (Boolean(source.hasGoldenAcorn)) {
    tokens.add('feature:golden-acorn')
    tokens.add('acorn:golden')
  }
  const hasWindRule = rules.kinds.some((kind) => kind === 'wind-cycle' || kind === 'wind-zone')
    || rules.ids.some((id) => /wind|updraft/u.test(id))
  if (Math.abs(windX) > 0.001 || mapType === 'wind' || hasWindRule) tokens.add('feature:wind')
  if (mapType === 'moving' || rules.kinds.includes('moving-platform')) tokens.add('feature:moving-platform')

  const signature = [
    birdTypes.join(','),
    materialTypes.join(','),
    enemyTypes.join(','),
    rules.kinds.join(','),
    rules.ids.join(','),
    mapType,
    objectiveType,
    signatureBirdType,
    windX,
    blockCount,
    targetCount,
    shotLimit,
    difficulty,
    Boolean(source.hasGoldenAcorn),
  ].join('|')

  return {
    birdTypes,
    materialTypes,
    enemyTypes,
    ruleKinds: rules.kinds,
    ruleIds: rules.ids,
    mapType,
    objectiveType,
    signatureBirdType,
    windX,
    blockCount,
    targetCount,
    shotLimit,
    difficulty,
    tokens,
    signature,
  }
}

function evaluateTalentWithContext(talentId, context) {
  const affinity = TALENT_AFFINITIES[talentId]
  if (!affinity) throw new RangeError(`unknown talent: ${talentId}`)
  const missingRequiredTokens = affinity.requiresAll.filter((token) => !context.tokens.has(token))
  const matchingRequirementTokens = affinity.requiresAny.filter((token) => context.tokens.has(token))
  const eligible = missingRequiredTokens.length === 0
    && (affinity.requiresAny.length === 0 || matchingRequirementTokens.length > 0)
  const matchingDirectTokens = affinity.directAny.filter((token) => context.tokens.has(token))
  const matchingBirdTypes = affinity.birdAny.filter((type) => context.birdTypes.includes(type))
  const signatureMatch = eligible && Boolean(context.signatureBirdType)
    && affinity.signatureBirdTypes.includes(context.signatureBirdType)
  const preferredTokens = affinity.preferredTokens.filter((token) => context.tokens.has(token))
  const direct = eligible && (matchingDirectTokens.length > 0 || signatureMatch)
  const birdLinked = eligible && matchingBirdTypes.length > 0
  const weight = eligible
    ? affinity.baseWeight
      + (direct ? 2.35 : 0)
      + (birdLinked ? 2.8 : 0)
      + (signatureMatch ? 3.6 : 0)
      + Math.min(4, preferredTokens.length) * 0.55
      + Math.min(10, context.difficulty) * 0.015
    : 0
  return Object.freeze({
    talentId,
    category: affinity.category,
    eligible,
    direct,
    birdLinked,
    signatureMatch,
    weight,
    matchingRequirementTokens: Object.freeze(matchingRequirementTokens),
    matchingDirectTokens: Object.freeze(matchingDirectTokens),
    matchingBirdTypes: Object.freeze(matchingBirdTypes),
    preferredTokens: Object.freeze(preferredTokens),
    missingRequiredTokens: Object.freeze(missingRequiredTokens),
  })
}

/**
 * Reports whether one talent can affect the supplied encounter and why it is
 * weighted. This is also suitable for contextual card copy in the UI.
 */
export function evaluateTalentAffinity(talentId, context = {}) {
  return evaluateTalentWithContext(talentId, normalizeTalentContext(context))
}

function weightedTalentOrder(candidates, seed, milestoneId, milestoneIndex, contextSignature, phase) {
  return [...candidates]
    .map((candidate) => {
      const rng = new Rng(mixSeed(
        seed,
        'contextual-talent',
        milestoneId,
        milestoneIndex,
        contextSignature,
        phase,
        candidate.talentId,
      ))
      const roll = Math.max(Number.EPSILON, rng.next())
      return { candidate, rank: -Math.log(roll) / Math.max(0.05, candidate.weight) }
    })
    .sort((first, second) => first.rank - second.rank
      || first.candidate.talentId.localeCompare(second.candidate.talentId, 'en'))
    .map((entry) => entry.candidate)
}

/**
 * Deterministically builds a contextual talent draft.
 *
 * @param {object} options
 * @param {number|string} options.seed Stable run seed.
 * @param {{id?: string, index?: number}|string} options.milestone Unlock marker.
 * @param {string[]} options.ownedTalentIds Talents already selected this run.
 * @param {number} options.limit Maximum number of cards (normally three).
 * @param {object} options.context Current bird/material/enemy/map description.
 * @returns {readonly string[]} Talent ids. When enough candidates remain, at
 * least two directly answer the encounter and one may explore the wider build.
 */
export function chooseContextualTalentOptions(options = {}) {
  if (!isRecord(options)) throw new TypeError('chooseContextualTalentOptions expects an options object')
  const milestone = isRecord(options.milestone) ? options.milestone : null
  const milestoneId = milestone?.id
    ?? (typeof options.milestone === 'string' ? options.milestone : options.milestoneId)
    ?? 'opening'
  const milestoneIndex = talentCount(milestone?.index ?? options.milestoneIndex, 0)
  const limit = Math.min(
    Object.keys(TALENTS).length,
    talentCount(options.limit, 3),
  )
  if (limit === 0) return Object.freeze([])
  const ownedTalentIds = talentStringList(options.ownedTalentIds)
  const context = normalizeTalentContext({
    ...(isRecord(options.context) ? options.context : {}),
    ownedTalentIds,
  })
  const owned = new Set(ownedTalentIds)
  const candidates = Object.keys(TALENTS)
    .filter((talentId) => !owned.has(talentId))
    .map((talentId) => evaluateTalentWithContext(talentId, context))
    .filter((entry) => entry.eligible)
  if (candidates.length === 0) return Object.freeze([])

  const seed = options.seed ?? 1
  const selected = []
  const selectedIds = new Set()
  const add = (candidate) => {
    if (!candidate || selectedIds.has(candidate.talentId) || selected.length >= limit) return
    selected.push(candidate)
    selectedIds.add(candidate.talentId)
  }

  // A special stage's signature acorn always gets a compatible card when one
  // remains. This prevents its defining mechanic from being absent at both the
  // opening and later score milestones.
  if (context.signatureBirdType) {
    add(weightedTalentOrder(
      candidates.filter((candidate) => candidate.signatureMatch),
      seed,
      milestoneId,
      milestoneIndex,
      context.signature,
      'signature',
    )[0])
  }

  // When enough options remain, every visible card should explain itself via
  // at least one acorn in the current magazine. Encounter-only or score-only
  // choices become fallback options after the acorn-linked build is exhausted.
  for (const candidate of weightedTalentOrder(
    candidates.filter((candidate) => candidate.birdLinked),
    seed,
    milestoneId,
    milestoneIndex,
    context.signature,
    'acorn-linked',
  )) add(candidate)

  const directCandidates = candidates.filter((candidate) => candidate.direct)
  const requiredDirectCount = Math.min(2, limit, directCandidates.length)
  for (const candidate of weightedTalentOrder(
    directCandidates,
    seed,
    milestoneId,
    milestoneIndex,
    context.signature,
    'direct',
  )) {
    if (selected.filter((entry) => entry.direct).length >= requiredDirectCount) break
    add(candidate)
  }

  for (const candidate of weightedTalentOrder(
    candidates,
    seed,
    milestoneId,
    milestoneIndex,
    context.signature,
    'explore',
  )) add(candidate)

  return Object.freeze(selected.map((entry) => entry.talentId))
}

export const DEFAULT_SAVE_DATA = deepFreeze({
  score: 0,
  level: 0,
  endlessBestStage: 0,
  kills: 0,
  eggs: 0,
  imprints: 0,
  ach: {},
  achievementDates: {},
  achievementRewardsClaimed: {},
  dailyBest: {},
  muted: false,
  endlessUnlocked: false,
  specialUnlocked: false,
  specialProgress: {},
  tutorialSeen: false,
  abilityTutorialSeen: false,
  seenStories: {},
  seenDiscoveries: {},
  bestStars: {},
  settings: {
    aimGuideMode: 'standard',
    shake: true,
    reducedMotion: null,
    skipStory: true,
    musicVolume: AUDIO_VOLUME_DEFAULTS.music,
    sfxVolume: AUDIO_VOLUME_DEFAULTS.sfx,
  },
})

export function createDefaultSaveData() {
  return {
    score: 0,
    level: 0,
    endlessBestStage: 0,
    kills: 0,
    eggs: 0,
    imprints: 0,
    ach: {},
    achievementDates: {},
    achievementRewardsClaimed: {},
    dailyBest: {},
    muted: false,
    endlessUnlocked: false,
    specialUnlocked: false,
    specialProgress: {},
    tutorialSeen: false,
    abilityTutorialSeen: false,
    seenStories: {},
    seenDiscoveries: {},
    bestStars: {},
    settings: {
      aimGuideMode: 'standard',
      shake: true,
      reducedMotion: null,
      skipStory: true,
      musicVolume: AUDIO_VOLUME_DEFAULTS.music,
      sfxVolume: AUDIO_VOLUME_DEFAULTS.sfx,
    },
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstDefined(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key]
  }
  return undefined
}

function nonNegativeInteger(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback
  let numeric
  try {
    numeric = Number(value)
  } catch {
    return fallback
  }
  if (!Number.isFinite(numeric) || numeric < 0) return fallback
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric))
}

function finiteNumber(value, fallback = 0) {
  try {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
  } catch {
    return fallback
  }
}

export function calculateTalentUnlockProgress(scoreValue, claimedCountValue = 0) {
  const score = nonNegativeInteger(scoreValue)
  const claimedCount = Math.min(
    TALENT_SCORE_MILESTONES.length,
    nonNegativeInteger(claimedCountValue),
  )
  let earnedCount = 0
  while (earnedCount < TALENT_SCORE_MILESTONES.length
    && score >= TALENT_SCORE_MILESTONES[earnedCount].score) {
    earnedCount += 1
  }

  const pendingMilestones = claimedCount < earnedCount
    ? TALENT_SCORE_MILESTONES.slice(claimedCount, earnedCount)
    : []
  const nextMilestoneIndex = Math.max(earnedCount, claimedCount)
  const nextMilestone = TALENT_SCORE_MILESTONES[nextMilestoneIndex] ?? null

  return {
    score,
    earnedCount,
    claimedCount,
    pendingCount: pendingMilestones.length,
    pendingMilestones,
    nextPendingMilestone: pendingMilestones[0] ?? null,
    nextMilestone,
    pointsToNext: nextMilestone ? Math.max(0, nextMilestone.score - score) : 0,
  }
}

// A successful clear can open at most one new score milestone. Excess score is
// never discarded: a later clear advances the next already-reached milestone.
// Keeping this rule pure makes the reduced talent cadence independently testable.
export function advanceTalentUnlockOnClear(scoreValue, eligibleCountValue = 1) {
  const scoreProgress = calculateTalentUnlockProgress(scoreValue, 0)
  const previousEligibleCount = Math.min(
    TALENT_SCORE_MILESTONES.length,
    nonNegativeInteger(eligibleCountValue, 1),
  )
  const eligibleCount = scoreProgress.earnedCount > previousEligibleCount
    ? Math.min(scoreProgress.earnedCount, previousEligibleCount + 1)
    : previousEligibleCount

  return {
    previousEligibleCount,
    eligibleCount,
    unlockedMilestone: eligibleCount > previousEligibleCount
      ? TALENT_SCORE_MILESTONES[previousEligibleCount] ?? null
      : null,
  }
}

export const CLEAR_STAR_RULES = deepFreeze({
  twoStarMinimumReserve: 1,
  threeStarMinimumReserve: 2,
  standardThreeStarCollapseRatio: 0.25,
  specialThreeStarCollapseMargin: 0.08,
  clearBonus: 1_000,
  reserveBonusPerShot: 250,
})

/**
 * Resolves the total ammunition a mode may hand to the runtime. All values are
 * total shots (the loaded acorn plus reserves), avoiding the historical
 * `birdsAvailable + 1` ambiguity. Endless applies its cap after talent bonuses.
 */
export function calculateShotBudget({
  mode = 'main',
  baseShotBudget = 0,
  bonusShotsGranted = 0,
} = {}) {
  const requestedBaseShotBudget = nonNegativeInteger(baseShotBudget)
  const requestedBonusShots = nonNegativeInteger(bonusShotsGranted)
  const maximumTotalShotBudget = mode === 'endless'
    ? SHOT_BUDGET_RULES.endlessMaximumTotalShots
    : null
  const cappedBaseShotBudget = maximumTotalShotBudget === null
    ? requestedBaseShotBudget
    : Math.min(requestedBaseShotBudget, maximumTotalShotBudget)
  const totalShotBudget = maximumTotalShotBudget === null
    ? Math.min(Number.MAX_SAFE_INTEGER, cappedBaseShotBudget + requestedBonusShots)
    : Math.min(maximumTotalShotBudget, cappedBaseShotBudget + requestedBonusShots)
  const grantedBonusShots = Math.max(0, totalShotBudget - cappedBaseShotBudget)

  return Object.freeze({
    mode,
    requestedBaseShotBudget,
    baseShotBudget: cappedBaseShotBudget,
    requestedBonusShots,
    bonusShotsGranted: grantedBonusShots,
    totalShotBudget,
    maximumTotalShotBudget,
  })
}

/**
 * Removes unspent talent/refund/rescue ammunition from star and reserve-bonus
 * scoring. Callers should track `bonusShotsRemaining` as bonus shots are fired;
 * when it is omitted, all granted bonus shots are conservatively treated as
 * still present. Legacy callers that supply only shotsRemaining are unchanged.
 */
export function calculateReserveEligibility({
  shotsRemaining = 0,
  baseShotBudget,
  bonusShotsGranted = 0,
  bonusShotsRemaining,
} = {}) {
  const shots = nonNegativeInteger(shotsRemaining)
  const hasBaseBudget = baseShotBudget !== undefined
  const normalizedBaseShotBudget = hasBaseBudget
    ? nonNegativeInteger(baseShotBudget)
    : shots
  const granted = nonNegativeInteger(bonusShotsGranted)
  const declaredBonusRemaining = bonusShotsRemaining === undefined
    ? Math.min(shots, granted)
    : Math.min(shots, nonNegativeInteger(bonusShotsRemaining))
  // Even inconsistent runtime metadata cannot turn shots beyond the authored
  // base budget into score-eligible reserves.
  const unavoidableBonusOverflow = Math.max(0, shots - normalizedBaseShotBudget)
  const excludedBonusShots = Math.min(
    shots,
    Math.max(declaredBonusRemaining, unavoidableBonusOverflow),
  )
  const starEligibleShotsRemaining = Math.min(
    normalizedBaseShotBudget,
    Math.max(0, shots - excludedBonusShots),
  )

  return Object.freeze({
    shotsRemaining: shots,
    baseShotBudget: normalizedBaseShotBudget,
    bonusShotsGranted: granted,
    bonusShotsRemaining: declaredBonusRemaining,
    excludedBonusShots,
    starEligibleShotsRemaining,
  })
}

export function calculateClearResult(shotsRemainingOrOptions) {
  const detailed = isRecord(shotsRemainingOrOptions)
  const eligibility = detailed
    ? calculateReserveEligibility(shotsRemainingOrOptions)
    : calculateReserveEligibility({ shotsRemaining: shotsRemainingOrOptions })
  const shots = eligibility.starEligibleShotsRemaining
  const clearBonus = CLEAR_STAR_RULES.clearBonus
  const reserveBonus = shots * CLEAR_STAR_RULES.reserveBonusPerShot
  const result = {
    stars: shots < CLEAR_STAR_RULES.twoStarMinimumReserve
      ? 1
      : shots < CLEAR_STAR_RULES.threeStarMinimumReserve ? 2 : 3,
    clearBonus,
    reserveBonus,
    totalBonus: clearBonus + reserveBonus,
  }
  return detailed ? Object.freeze({ ...result, ...eligibility }) : result
}

/**
 * Migration API for objective-aware victory evaluation. The legacy
 * calculateClearResult(shots) remains byte-for-byte compatible for callers
 * that have already established a clear.
 */
export function evaluateLevelClear({
  shotsRemaining = 0,
  baseShotBudget,
  bonusShotsGranted = 0,
  bonusShotsRemaining,
  targetsMet,
  remainingTargetCount = 0,
  collapseRatio = 1,
  requiredCollapseRatio = 0,
  mode = 'main',
  standardThreeStarCollapseRatio = CLEAR_STAR_RULES.standardThreeStarCollapseRatio,
  specialCollapseMargin = CLEAR_STAR_RULES.specialThreeStarCollapseMargin,
} = {}) {
  const eligibility = calculateReserveEligibility({
    shotsRemaining,
    baseShotBudget,
    bonusShotsGranted,
    bonusShotsRemaining,
  })
  const shots = eligibility.starEligibleShotsRemaining
  const normalizedRemainingTargets = nonNegativeInteger(remainingTargetCount)
  const eliminationMet = typeof targetsMet === 'boolean'
    ? targetsMet
    : normalizedRemainingTargets === 0
  const normalizedCollapseRatio = clamp(
    finiteNumber(collapseRatio),
    0,
    1,
  )
  const normalizedRequiredCollapse = clamp(
    finiteNumber(requiredCollapseRatio),
    0,
    1,
  )
  const margin = clamp(
    finiteNumber(specialCollapseMargin),
    0,
    1,
  )
  const standardStructureLine = clamp(
    finiteNumber(standardThreeStarCollapseRatio, CLEAR_STAR_RULES.standardThreeStarCollapseRatio),
    0,
    1,
  )
  const collapseMet = normalizedCollapseRatio + Number.EPSILON >= normalizedRequiredCollapse
  const cleared = eliminationMet && collapseMet
  const special = mode === 'special'
  const threeStarCollapseRatio = special
    ? Math.min(1, normalizedRequiredCollapse + margin)
    : Math.max(normalizedRequiredCollapse, standardStructureLine)
  const threeStarCollapseMet = normalizedCollapseRatio + Number.EPSILON >= threeStarCollapseRatio
  let stars = 0
  if (cleared) {
    stars = 1
    if (shots >= CLEAR_STAR_RULES.twoStarMinimumReserve) stars = 2
    if (shots >= CLEAR_STAR_RULES.threeStarMinimumReserve && threeStarCollapseMet) stars = 3
  }
  const legacyBonus = calculateClearResult(shots)
  const clearBonus = cleared ? legacyBonus.clearBonus : 0
  const reserveBonus = cleared ? legacyBonus.reserveBonus : 0
  return Object.freeze({
    cleared,
    stars,
    shotsRemaining: eligibility.shotsRemaining,
    baseShotBudget: eligibility.baseShotBudget,
    bonusShotsGranted: eligibility.bonusShotsGranted,
    bonusShotsRemaining: eligibility.bonusShotsRemaining,
    excludedBonusShots: eligibility.excludedBonusShots,
    starEligibleShotsRemaining: shots,
    eliminationMet,
    collapseMet,
    collapseRatio: normalizedCollapseRatio,
    requiredCollapseRatio: normalizedRequiredCollapse,
    threeStarCollapseRatio,
    threeStarCollapseMet,
    clearBonus,
    reserveBonus,
    totalBonus: clearBonus + reserveBonus,
  })
}

function booleanValue(value, fallback = false) {
  if (value === true || value === 1 || value === 'true') return true
  if (value === false || value === 0 || value === 'false') return false
  return fallback
}

function normalizeAchievements(value) {
  if (!isRecord(value)) return {}
  const achievements = {}
  for (const [key, enabled] of Object.entries(value)) {
    if (/^[a-z][a-z0-9_]{0,63}$/u.test(key) && booleanValue(enabled)) achievements[key] = true
  }
  return achievements
}

function normalizeAchievementTimestamp(value) {
  const timestamp = value instanceof Date
    ? value.getTime()
    : typeof value === 'string' && value.trim()
      ? Date.parse(value)
      : Number.NaN
  if (!Number.isFinite(timestamp)) return null
  try {
    return new Date(timestamp).toISOString()
  } catch {
    return null
  }
}

/**
 * Sanitizes the three achievement save records as one unit. Dates and reward
 * claims without a matching unlocked achievement are discarded, preventing a
 * corrupt or hand-edited side record from manufacturing archive history.
 * Legacy saves only had `ach`; those unlocks remain valid but intentionally do
 * not receive an invented date or a retroactive reward.
 */
export function normalizeAchievementRecords(
  achievementsValue,
  achievementDatesValue,
  achievementRewardsClaimedValue,
) {
  const ach = normalizeAchievements(achievementsValue)
  const achievementDates = {}
  const dateSource = isRecord(achievementDatesValue) ? achievementDatesValue : {}
  for (const [achievementId, dateValue] of Object.entries(dateSource)) {
    if (!ach[achievementId]) continue
    const achievedAt = normalizeAchievementTimestamp(dateValue)
    if (achievedAt) achievementDates[achievementId] = achievedAt
  }

  const achievementRewardsClaimed = {}
  const claimSource = isRecord(achievementRewardsClaimedValue)
    ? achievementRewardsClaimedValue
    : {}
  for (const [achievementId, claimed] of Object.entries(claimSource)) {
    if (ach[achievementId]
      && Object.hasOwn(ACHIEVEMENT_REWARDS, achievementId)
      && booleanValue(claimed)) {
      achievementRewardsClaimed[achievementId] = true
    }
  }

  return { ach, achievementDates, achievementRewardsClaimed }
}

function validDateSeedKey(key) {
  if (!/^\d{8}$/u.test(key)) return false
  try {
    dateSeed(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`)
    return true
  } catch {
    return false
  }
}

function normalizeDailyBest(value) {
  if (!isRecord(value)) return {}
  const dailyBest = {}
  for (const [key, score] of Object.entries(value)) {
    const normalizedScore = nonNegativeInteger(score, -1)
    if (validDateSeedKey(key) && normalizedScore >= 0) dailyBest[key] = normalizedScore
  }
  return dailyBest
}

function normalizeBestStars(value) {
  if (!isRecord(value)) return {}
  const bestStars = {}
  for (const [key, stars] of Object.entries(value)) {
    if (!/^(?:(?:main|endless|daily):\d{1,8}|special:[a-z][a-z0-9-]*:[1-4])$/u.test(key)) continue
    const normalized = nonNegativeInteger(stars)
    if (normalized >= 1 && normalized <= 3) bestStars[key] = normalized
  }
  return bestStars
}

function normalizeSpecialProgress(value) {
  if (!isRecord(value)) return {}
  const progress = {}
  for (const [campaignId, stage] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(campaignId)) continue
    progress[campaignId] = Math.min(4, nonNegativeInteger(stage))
  }
  return progress
}

function normalizeSeenDiscoveries(value) {
  if (!isRecord(value)) return {}
  const seen = {}
  for (const [key, enabled] of Object.entries(value)) {
    if (/^(bird|enemy|object|item|map):[a-z-]+$/u.test(key) && booleanValue(enabled)) seen[key] = true
  }
  return seen
}

function normalizeSeenStories(value) {
  if (!isRecord(value)) return {}
  const seen = {}
  for (const [key, enabled] of Object.entries(value)) {
    if (/^(?:main:\d{1,2}|special:[a-z][a-z0-9-]*:[1-4]|endless:\d{1,8})$/u.test(key)
      && booleanValue(enabled)) seen[key] = true
  }
  return seen
}

function normalizeSettings(value) {
  const source = isRecord(value) ? value : {}
  const musicVolume = Number(source.musicVolume)
  const sfxVolume = Number(source.sfxVolume)
  return {
    aimGuideMode: normalizeAimGuideMode(source.aimGuideMode, source.aimGuide),
    shake: booleanValue(source.shake, true),
    reducedMotion: typeof source.reducedMotion === 'boolean' ? source.reducedMotion : null,
    skipStory: booleanValue(source.skipStory, true),
    musicVolume: Number.isFinite(musicVolume)
      ? clamp(musicVolume, 0, 1)
      : AUDIO_VOLUME_DEFAULTS.music,
    sfxVolume: Number.isFinite(sfxVolume)
      ? clamp(sfxVolume, 0, 1)
      : AUDIO_VOLUME_DEFAULTS.sfx,
  }
}

function unwrapSaveData(value) {
  if (!isRecord(value)) return {}
  if (isRecord(value.best)) return value.best
  if (isRecord(value.data) && isRecord(value.data.best)) return value.data.best
  return value
}

export function normalizeSaveData(value) {
  const source = unwrapSaveData(value)
  const bestLevel = nonNegativeInteger(firstDefined(source, ['level', 'maxLevel', 'bestLevel']))
  const achievementRecords = normalizeAchievementRecords(
    firstDefined(source, ['ach', 'achievements']),
    firstDefined(source, ['achievementDates', 'achievement_dates', 'achievedAt']),
    firstDefined(source, ['achievementRewardsClaimed', 'achievement_rewards_claimed']),
  )
  return {
    score: nonNegativeInteger(firstDefined(source, ['score', 'highScore', 'bestScore'])),
    level: bestLevel,
    endlessBestStage: nonNegativeInteger(firstDefined(source, [
      'endlessBestStage', 'endlessBestLevel', 'endlessHighLevel',
    ]), Math.max(0, bestLevel - MAIN_LEVELS)),
    kills: nonNegativeInteger(firstDefined(source, ['kills', 'totalKills'])),
    eggs: nonNegativeInteger(firstDefined(source, ['eggs', 'goldenEggs'])),
    imprints: nonNegativeInteger(firstDefined(source, ['imprints', 'expeditionImprints'])),
    ach: achievementRecords.ach,
    achievementDates: achievementRecords.achievementDates,
    achievementRewardsClaimed: achievementRecords.achievementRewardsClaimed,
    dailyBest: normalizeDailyBest(firstDefined(source, ['dailyBest', 'daily_best'])),
    muted: booleanValue(firstDefined(source, ['muted', 'soundMuted'])),
    endlessUnlocked: booleanValue(firstDefined(source, ['endlessUnlocked', 'endless'])),
    specialUnlocked: booleanValue(firstDefined(source, ['specialUnlocked', 'specialModeUnlocked'])),
    specialProgress: normalizeSpecialProgress(firstDefined(source, ['specialProgress', 'specialCampaigns'])),
    tutorialSeen: booleanValue(firstDefined(source, ['tutorialSeen', 'tutorialComplete'])),
    abilityTutorialSeen: booleanValue(firstDefined(source, ['abilityTutorialSeen', 'abilityTutorialComplete'])),
    seenStories: normalizeSeenStories(firstDefined(source, ['seenStories', 'storyHistory'])),
    seenDiscoveries: normalizeSeenDiscoveries(firstDefined(source, ['seenDiscoveries', 'seenContent', 'fieldGuide'])),
    bestStars: normalizeBestStars(firstDefined(source, ['bestStars', 'levelStars'])),
    settings: normalizeSettings(source.settings),
  }
}

/**
 * Unlocks and pays one achievement without mutating the supplied save object.
 * Callers can inject a Date or ISO-compatible string for deterministic tests;
 * invalid values fall back to the actual unlock time and are always stored as
 * canonical ISO strings. Repeated calls never award golden acorns twice.
 */
export function awardAchievement(saveValue, achievementId, achievedAtValue = new Date()) {
  const save = normalizeSaveData(saveValue)
  const reward = typeof achievementId === 'string'
    && Object.hasOwn(ACHIEVEMENT_REWARDS, achievementId)
    ? ACHIEVEMENT_REWARDS[achievementId]
    : 0
  if (!reward || save.ach[achievementId]) {
    return {
      save,
      achievementId,
      unlocked: false,
      reward: 0,
      achievedAt: save.achievementDates[achievementId] ?? null,
    }
  }

  const achievedAt = normalizeAchievementTimestamp(achievedAtValue)
    ?? new Date().toISOString()
  const nextSave = {
    ...save,
    eggs: Math.min(Number.MAX_SAFE_INTEGER, save.eggs + reward),
    ach: { ...save.ach, [achievementId]: true },
    achievementDates: { ...save.achievementDates, [achievementId]: achievedAt },
    achievementRewardsClaimed: {
      ...save.achievementRewardsClaimed,
      [achievementId]: true,
    },
  }
  return {
    save: nextSave,
    achievementId,
    unlocked: true,
    reward,
    achievedAt,
  }
}

const MAP_TYPES = ['normal', 'wind', 'moving']
const SKY_COLORS = [0x87ceeb, 0xffb347, 0x9370db, 0x2f4f4f]
const GAME_MODES = new Set(['main', 'endless', 'daily'])

// The last six story stages are deliberately authored instead of leaning on
// unbounded procedural growth. Each row adds one readable pressure at a time:
// denser objectives, then wind, then moving cover, then a combined gauntlet.
// Fixed caps keep every layout inside the existing camera and physics budget.
const MAIN_LATE_LEVEL_RULES = deepFreeze({
  13: { mapType: 'normal', minimumTargets: 6, birdsAvailable: 5, platformCount: 0 },
  14: { mapType: 'wind', minimumTargets: 7, birdsAvailable: 6, platformCount: 0, windMagnitude: 0.075 },
  15: { mapType: 'moving', minimumTargets: 8, birdsAvailable: 7, platformCount: 2 },
  16: { mapType: 'wind', minimumTargets: 9, birdsAvailable: 8, platformCount: 0, windMagnitude: 0.085 },
  17: { mapType: 'moving', minimumTargets: 6, birdsAvailable: 9, platformCount: 3 },
  18: { mapType: 'wind', minimumTargets: 7, birdsAvailable: 10, platformCount: 0, windMagnitude: 0.09 },
})

export const MOVING_PLATFORM_RULES = deepFreeze({
  mainCounts: { 9: 1, 15: 2, 17: 3 },
  endlessUnlockDepth: 12,
  endlessTiers: [
    { minimumDepth: 12, count: 1, interval: 5 },
    { minimumDepth: 30, count: 2, interval: 4 },
    { minimumDepth: 60, count: 3, interval: 3 },
    { minimumDepth: 100, count: 4, interval: 2 },
  ],
})

/**
 * Moving cover is a taught pressure, not an automatic consequence of the
 * three-map palette. Story mode introduces one rail at stage 9, then revisits
 * it twice with a larger but still bounded set. Endless mode starts at depth
 * 12 and uses a fixed cadence whose frequency and count rise independently;
 * the schedule is seed-independent so a retried floor never changes rules.
 */
export function movingPlatformProfileForLevel(mode, levelValue) {
  const level = positiveLevel(levelValue)
  if (mode === 'main') {
    const count = MOVING_PLATFORM_RULES.mainCounts[level] ?? 0
    return Object.freeze({ active: count > 0, count, interval: null, tierMinimumDepth: null })
  }
  if (mode === 'endless') {
    const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
    const tier = [...MOVING_PLATFORM_RULES.endlessTiers]
      .reverse()
      .find((candidate) => depth >= candidate.minimumDepth)
    if (!tier) {
      return Object.freeze({ active: false, count: 0, interval: null, tierMinimumDepth: null })
    }
    const active = (depth - tier.minimumDepth) % tier.interval === 0
    return Object.freeze({
      active,
      count: active ? tier.count : 0,
      interval: tier.interval,
      tierMinimumDepth: tier.minimumDepth,
    })
  }
  return Object.freeze({ active: false, count: 0, interval: null, tierMinimumDepth: null })
}

const MAIN_BOSS_GUARDS = deepFreeze({ 6: 3, 12: 4, 17: 5, 18: 6 })
const BASE_NON_BOSS_TARGET_CAP = 7

export const STRONGHOLD_RULES = deepFreeze({
  maximumPhysicalBlocks: 84,
  mainTiers: [
    { minimumLevel: 13, tier: 1 },
    { minimumLevel: 15, tier: 2 },
    { minimumLevel: 17, tier: 3 },
  ],
  endlessTiers: [
    { minimumDepth: 10, tier: 1 },
    { minimumDepth: 30, tier: 2 },
    { minimumDepth: 50, tier: 3 },
  ],
  stoneRatios: [0.3, 0.38, 0.5, 0.6],
})

// Endless pressure is intentionally authored as broad, deterministic belts.
// A retry at the same depth therefore keeps the same strategic contract while
// the seeded architecture selector is still free to vary the actual building.
// The physical-body targets rise slowly and remain below the global 84-body
// solver budget; they describe a connected apron/gatehouse compound, not an
// instruction to clone another set of four post-and-lintel towers.
export const ENDLESS_PRESSURE_TIERS = deepFreeze([
  {
    minimumDepth: 1,
    nonBossTargetCount: 7,
    regularBaseHp: 1,
    reinforcedTargetFraction: 0,
    bossGuardCount: 4,
    minimumPhysicalBlocks: 28,
  },
  {
    minimumDepth: 10,
    nonBossTargetCount: 7,
    regularBaseHp: 1,
    reinforcedTargetFraction: 0,
    bossGuardCount: 5,
    minimumPhysicalBlocks: 36,
  },
  {
    minimumDepth: 20,
    nonBossTargetCount: 8,
    regularBaseHp: 1,
    reinforcedTargetFraction: 0.2,
    bossGuardCount: 5,
    minimumPhysicalBlocks: 38,
  },
  {
    minimumDepth: 30,
    nonBossTargetCount: 8,
    regularBaseHp: 1,
    reinforcedTargetFraction: 0.35,
    bossGuardCount: 6,
    minimumPhysicalBlocks: 40,
  },
  {
    minimumDepth: 50,
    nonBossTargetCount: 9,
    regularBaseHp: 1,
    reinforcedTargetFraction: 0.5,
    bossGuardCount: 7,
    minimumPhysicalBlocks: 42,
  },
  {
    minimumDepth: 80,
    nonBossTargetCount: 10,
    regularBaseHp: 2,
    reinforcedTargetFraction: 0,
    bossGuardCount: 8,
    minimumPhysicalBlocks: 44,
  },
  {
    minimumDepth: 120,
    nonBossTargetCount: 12,
    regularBaseHp: 2,
    reinforcedTargetFraction: 0.25,
    bossGuardCount: 9,
    minimumPhysicalBlocks: 46,
  },
])

/**
 * Pure endless-mode difficulty contract. Both a raw endless depth and the
 * runtime's `MAIN_LEVELS + depth` value are accepted, matching the other
 * endless helpers in this module. Boss durability deliberately caps at depth
 * 100 so arbitrarily long saved runs remain finite; garrison and compound
 * pressure can still reach their final authored belt at depth 120.
 */
export function endlessPressureProfile(levelValue) {
  const level = positiveLevel(levelValue)
  const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  const tier = [...ENDLESS_PRESSURE_TIERS]
    .reverse()
    .find((candidate) => depth >= candidate.minimumDepth)
    || ENDLESS_PRESSURE_TIERS[0]
  const bossDepth = Math.min(100, depth)
  const bossDecade = Math.max(0, Math.floor(bossDepth / 10))
  const bossShapeStep = Math.max(0, Math.floor((bossDepth - 10) / 15))
  return Object.freeze({
    depth,
    tierMinimumDepth: tier.minimumDepth,
    nonBossTargetCount: tier.nonBossTargetCount,
    regularBaseHp: tier.regularBaseHp,
    reinforcedTargetFraction: tier.reinforcedTargetFraction,
    bossGuardCount: tier.bossGuardCount,
    minimumPhysicalBlocks: tier.minimumPhysicalBlocks,
    bossHp: 9 + bossDecade,
    bossSize: 41 + bossShapeStep * 1.5,
    bossMass: 3.5 + bossShapeStep * 0.45,
    bossKnockbackMultiplier: Math.max(0.22, 0.44 - bossShapeStep * 0.035),
  })
}

export const STRUCTURE_FAMILY_RULES = deepFreeze({
  ids: {
    frontier: 'frontier-towers',
    bridge: 'asymmetric-bridge-gate',
    rock: 'triangular-rock-fort',
    royal: 'royal-stone-city',
  },
  main: {
    bridgeLevels: [7, 8, 9, 13, 14],
    rockLevels: [10, 11, 12],
    royalLevels: [15, 16, 17, 18],
  },
  endless: {
    bridgeUnlockDepth: 10,
    rockUnlockDepth: 30,
    royalUnlockDepth: 50,
    complexityStepDepth: 20,
    maximumComplexity: 3,
    maximumRoyalWeight: 0.62,
    minimumBridgeWeight: 0.16,
    persistentRockWeight: 0.24,
  },
  rockStoneBudgetRatios: [0, 0.82, 0.91, 1],
  royalStoneCoreRatios: [0, 0.88, 0.94, 1],
})

function mainStructureFamilyComplexity(level, familyId) {
  if (familyId === STRUCTURE_FAMILY_RULES.ids.bridge) {
    if (level <= 8) return 1
    if (level <= 13) return 2
    return 3
  }
  if (familyId === STRUCTURE_FAMILY_RULES.ids.rock) return clamp(level - 9, 1, 3)
  if (familyId === STRUCTURE_FAMILY_RULES.ids.royal) return clamp(level - 14, 1, 3)
  return 0
}

/**
 * Selects a deterministic structural silhouette without tying endless mode to
 * one handcrafted floor. Once a family unlocks it remains in the weighted
 * pool; royal-city frequency rises with depth while bridge gates and rock
 * forts retain non-zero shares so late endless runs do not collapse into one
 * repeated castle blueprint.
 */
export function structureFamilyProfileForLevel(mode, levelValue, seedValue = 1) {
  const level = positiveLevel(levelValue)
  const seed = uint32Seed(seedValue)
  const ids = STRUCTURE_FAMILY_RULES.ids
  let id = ids.frontier
  let complexity = 0
  let weights = { frontier: 1, bridge: 0, rock: 0, royal: 0 }

  if (mode === 'main') {
    if (STRUCTURE_FAMILY_RULES.main.bridgeLevels.includes(level)) id = ids.bridge
    else if (STRUCTURE_FAMILY_RULES.main.rockLevels.includes(level)) id = ids.rock
    else if (STRUCTURE_FAMILY_RULES.main.royalLevels.includes(level)) id = ids.royal
    complexity = mainStructureFamilyComplexity(level, id)
    weights = {
      frontier: Number(id === ids.frontier),
      bridge: Number(id === ids.bridge),
      rock: Number(id === ids.rock),
      royal: Number(id === ids.royal),
    }
  } else if (mode === 'endless') {
    const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
    const rules = STRUCTURE_FAMILY_RULES.endless
    if (depth >= rules.bridgeUnlockDepth) {
      complexity = Math.min(
        rules.maximumComplexity,
        1 + Math.floor((depth - rules.bridgeUnlockDepth) / rules.complexityStepDepth),
      )
      if (depth < rules.rockUnlockDepth) {
        id = ids.bridge
        weights = { frontier: 0, bridge: 1, rock: 0, royal: 0 }
      } else {
        let bridgeWeight = 0.52
        let rockWeight = 0.48
        let royalWeight = 0
        if (depth >= rules.royalUnlockDepth) {
          royalWeight = Math.min(
            rules.maximumRoyalWeight,
            0.28 + (depth - rules.royalUnlockDepth) * 0.006,
          )
          rockWeight = rules.persistentRockWeight
          bridgeWeight = Math.max(rules.minimumBridgeWeight, 1 - royalWeight - rockWeight)
          const total = bridgeWeight + rockWeight + royalWeight
          bridgeWeight /= total
          rockWeight /= total
          royalWeight /= total
        }
        weights = { frontier: 0, bridge: bridgeWeight, rock: rockWeight, royal: royalWeight }
        const roll = new Rng(mixSeed(seed, 'structure-family', mode, level)).next()
        id = roll < bridgeWeight
          ? ids.bridge
          : roll < bridgeWeight + rockWeight ? ids.rock : ids.royal
      }
    }
  }

  const mirrored = (mixSeed(seed, 'structure-family-mirror', mode, level) & 1) === 1
  const bridgeSpanCount = id === ids.bridge ? Math.min(2, Math.max(1, complexity)) : 0
  const rockButtressCount = id === ids.rock ? Math.min(4, complexity + 1) : 0
  const royalStoneCoreRatio = id === ids.royal
    ? STRUCTURE_FAMILY_RULES.royalStoneCoreRatios[complexity]
    : 0
  return Object.freeze({
    id,
    complexity,
    mirrored,
    bridgeSpanCount,
    rockButtressCount,
    royalStoneCoreRatio,
    weights: Object.freeze(weights),
  })
}

/**
 * Endless mode advances through the same geographic belts as the story even
 * when an older unlocked building form rotates back into the mix. This keeps
 * a late bridge or workshop inside the kingdom core instead of snapping the
 * whole backdrop back to the generic forest.
 */
export function endlessEnvironmentThemeLevel(levelValue, seedValue = 1) {
  const level = positiveLevel(levelValue)
  const seed = uint32Seed(seedValue)
  const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  const pool = depth < 3 ? [1, 2, 3]
    : depth < 5 ? [2, 3, 4]
      : depth < 7 ? [3, 4, 5]
        : depth < 10 ? [4, 5, 6]
          : depth < 30 ? [7, 8, 9]
            : depth < 50 ? [10, 11, 12]
              : depth < 80 ? [13, 14, 15]
                : [15, 16, 17, 18]
  const index = mixSeed(seed, 'endless-environment-belt', depth) % pool.length
  return pool[index]
}

// Late fortresses gain persistent construction modules instead of swapping one
// gimmick for another. The story uses explicit counts so its skyline can be
// authored; endless mode unlocks the same vocabulary progressively and then
// keeps it in every later floor.
export const STRONGHOLD_MODULE_RULES = deepFreeze({
  main: {
    13: { trussCount: 1, stoneTrussCount: 0, wallPanelCount: 1, longBeamCount: 0 },
    14: { trussCount: 2, stoneTrussCount: 0, wallPanelCount: 1, longBeamCount: 1 },
    15: { trussCount: 3, stoneTrussCount: 1, wallPanelCount: 2, longBeamCount: 1 },
    16: { trussCount: 4, stoneTrussCount: 2, wallPanelCount: 3, longBeamCount: 1 },
    17: { trussCount: 5, stoneTrussCount: 3, wallPanelCount: 3, longBeamCount: 2 },
    18: { trussCount: 6, stoneTrussCount: 4, wallPanelCount: 3, longBeamCount: 2 },
  },
  durabilityScale: {
    regular: 1,
    trussPart: 1.25,
    wallPanel: 1.6,
    longBeam: 2.2,
    foundationPier: 1.5,
  },
})

const EMPTY_STRONGHOLD_MODULE_PROFILE = deepFreeze({
  trussCount: 0,
  stoneTrussCount: 0,
  wallPanelCount: 0,
  longBeamCount: 0,
})

export function strongholdModuleProfileForLevel(mode, levelValue) {
  const level = positiveLevel(levelValue)
  if (mode === 'main') {
    const authored = STRONGHOLD_MODULE_RULES.main[level]
    return authored ? Object.freeze({ ...authored }) : EMPTY_STRONGHOLD_MODULE_PROFILE
  }
  if (mode !== 'endless') return EMPTY_STRONGHOLD_MODULE_PROFILE
  const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  if (depth < 10) return EMPTY_STRONGHOLD_MODULE_PROFILE
  const wallPanelCount = Math.min(3, 1 + Math.floor((depth - 10) / 15))
  if (depth < 30) {
    return Object.freeze({ trussCount: 0, stoneTrussCount: 0, wallPanelCount, longBeamCount: 0 })
  }
  const trussCount = Math.min(6, 1 + Math.floor((depth - 30) / 10))
  if (depth < 50) {
    return Object.freeze({ trussCount, stoneTrussCount: 0, wallPanelCount, longBeamCount: 1 })
  }
  return Object.freeze({
    trussCount,
    stoneTrussCount: Math.min(trussCount, 1 + Math.floor((depth - 50) / 20)),
    wallPanelCount,
    longBeamCount: Math.min(2, 1 + Math.floor((depth - 50) / 30)),
  })
}

export function strongholdTierForLevel(mode, levelValue) {
  const level = positiveLevel(levelValue)
  if (mode === 'main') {
    if (level >= 17) return 3
    if (level >= 15) return 2
    if (level >= 13) return 1
    return 0
  }
  if (mode !== 'endless') return 0
  const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  if (depth >= 50) return 3
  if (depth >= 30) return 2
  if (depth >= 10) return 1
  return 0
}

// Coefficients are normalized strengths for the runtime solver. Friction and
// supportStability increase grip; angularDamping is the fraction of angular
// speed removed per fixed tick; restitution is the retained bounce speed.
export const BLOCK_MATERIALS = deepFreeze({
  wood: {
    hp: 3,
    color: 0xb8860b,
    massMultiplier: 1.4,
    friction: 0.62,
    supportStability: 0.84,
    angularDamping: 0.2,
    restitution: 0.1,
  },
  stone: {
    hp: 8,
    color: 0x888888,
    massMultiplier: 3.2,
    friction: 0.9,
    supportStability: 1.2,
    angularDamping: 0.34,
    restitution: 0.04,
  },
  ice: {
    hp: 2,
    color: 0x9fe8ff,
    massMultiplier: 1.15,
    friction: 0.1,
    supportStability: 0.3,
    angularDamping: 0.06,
    restitution: 0.28,
  },
})

// A resting fortress is treated as a joined structure instead of a stack of
// perfectly frictionless rectangles. Bearing allowance extends the usable top
// face of a support: stone masonry can keep carrying an off-centre beam after a
// weak neighbouring post is removed, wood has modest joinery, and ice remains
// deliberately brittle. Wake thresholds prevent harmless solver overlap and
// the zero-force edge of a shockwave from waking an entire connected tower.
export const STRUCTURE_STABILITY_RULES = deepFreeze({
  regularImpact: {
    minimumEnergy: 5,
    radius: 52,
    maximumPower: 3,
    powerPerEnergy: 0.32,
    angularImpulseScale: 0.035,
  },
  materials: {
    wood: {
      bearingAllowance: 6,
      shockWakeSpeed: 0.72,
      collisionWakeSpeed: 0.55,
      collisionWakePenetration: 0.8,
    },
    stone: {
      bearingAllowance: 24,
      shockWakeSpeed: 1.1,
      collisionWakeSpeed: 0.85,
      collisionWakePenetration: 1.25,
    },
    ice: {
      bearingAllowance: 0,
      shockWakeSpeed: 0.34,
      collisionWakeSpeed: 0.28,
      collisionWakePenetration: 0.45,
    },
  },
})

// Same-material contacts can be authored as finite structural joints. Wood
// uses visible iron nails: forgiving, but easier to tear out. Stone uses a
// tighter masonry bond that carries more load and survives substantially more
// damage. Ice/glass deliberately has no joined profile and remains brittle.
export const STRUCTURE_JOINT_RULES = deepFreeze({
  contactTolerance: 4.5,
  wood: {
    kind: 'nail',
    strength: 7,
    bearingAllowance: 14,
    breakDistance: 15,
    stiffness: 0.25,
    velocityDamping: 0.15,
    angularStiffness: 0.038,
    damageScale: 0.5,
  },
  stone: {
    kind: 'masonry',
    strength: 16,
    bearingAllowance: 38,
    breakDistance: 12,
    stiffness: 0.39,
    velocityDamping: 0.24,
    angularStiffness: 0.062,
    damageScale: 0.25,
  },
})

function constructionAllowsTensionJoint(block) {
  const policy = CONSTRUCTION_MATERIALS[block?.constructionId]?.jointPolicy ?? 'inherit'
  return policy !== 'none'
}

function constructionJointProfile(first, second) {
  const profiles = [first, second]
    .map((block) => {
      const construction = CONSTRUCTION_MATERIALS[block?.constructionId]
      return construction?.jointProfile
        ? { ...construction.jointProfile, constructionId: block.constructionId }
        : null
    })
    .filter(Boolean)
    .sort((left, right) => (right.priority || 0) - (left.priority || 0))
  return profiles[0] || null
}

export const INTEGRAL_TRUSS_JOINT_RULES = deepFreeze({
  wood: {
    strength: 8,
    bearingAllowance: 18,
    breakDistance: 15,
    stiffness: 0.27,
    velocityDamping: 0.15,
    angularStiffness: 0.04,
    damageScale: 0.5,
  },
  stone: {
    strength: 16,
    bearingAllowance: 36,
    breakDistance: 11,
    stiffness: 0.38,
    velocityDamping: 0.23,
    angularStiffness: 0.06,
    damageScale: 0.28,
  },
})

// Reinforced contacts are a late-campaign escalation, not a universal hidden
// buff. The main story introduces leaf-iron nails at the outer royal wall and
// masonry only after reaching the inner keep. Endless mode deliberately waits
// until its matching late stronghold tiers so its opening floors remain easy
// to read and teach the base collapse rules first.
export const STRUCTURE_JOINT_UNLOCKS = deepFreeze({
  nail: { mainLevel: 13, endlessDepth: 30 },
  masonry: { mainLevel: 15, endlessDepth: 50 },
})

// Counts are authored independently from the number of possible contacts in
// a generated fortress. This keeps the first encounter readable, then adds a
// predictable amount of reinforcement as the player advances. Endless growth
// is intentionally capped so the finite-joint solver and demolition budget do
// not become unbounded after hundreds of floors.
export const STRUCTURE_JOINT_COUNT_RULES = deepFreeze({
  nail: {
    main: { initialCount: 4, countPerLevel: 4, maximumCount: 16 },
    endless: {
      initialCount: 4, levelsPerIncrease: 5, countPerIncrease: 1, maximumCount: 18,
    },
  },
  masonry: {
    main: { initialCount: 10, countPerLevel: 16, maximumCount: 58 },
    endless: {
      initialCount: 10, levelsPerIncrease: 5, countPerIncrease: 3, maximumCount: 48,
    },
  },
})

const NO_STRUCTURE_JOINT_KINDS = deepFreeze([])
const NAIL_STRUCTURE_JOINT_KINDS = deepFreeze(['nail'])
const ALL_STRUCTURE_JOINT_KINDS = deepFreeze(['nail', 'masonry'])

function progressiveStructureJointCount(kind, mode, level) {
  const unlock = STRUCTURE_JOINT_UNLOCKS[kind]
  const rule = STRUCTURE_JOINT_COUNT_RULES[kind]
  if (mode === 'main') {
    const offset = level - unlock.mainLevel
    if (offset < 0) return 0
    return Math.min(rule.main.maximumCount, rule.main.initialCount + offset * rule.main.countPerLevel)
  }
  if (mode !== 'endless') return 0
  const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  const offset = depth - unlock.endlessDepth
  if (offset < 0) return 0
  return Math.min(
    rule.endless.maximumCount,
    rule.endless.initialCount
      + Math.floor(offset / rule.endless.levelsPerIncrease) * rule.endless.countPerIncrease,
  )
}

export function structureJointCountsForLevel(mode, levelValue) {
  const level = positiveLevel(levelValue)
  return Object.freeze({
    nail: progressiveStructureJointCount('nail', mode, level),
    masonry: progressiveStructureJointCount('masonry', mode, level),
  })
}

export function structureJointKindsForLevel(mode, levelValue) {
  const counts = structureJointCountsForLevel(mode, levelValue)
  if (counts.masonry > 0) return ALL_STRUCTURE_JOINT_KINDS
  if (counts.nail > 0) return NAIL_STRUCTURE_JOINT_KINDS
  return NO_STRUCTURE_JOINT_KINDS
}

function structureEntityKey(entity, index) {
  return entity?.id ?? entity?.key ?? index
}

function overlapLength(firstMin, firstMax, secondMin, secondMax) {
  return Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin)
}

/**
 * Builds deterministic, mutable runtime joints for touching wood/wood and
 * stone/stone pairs. Authored weak points are intentionally never auto-joined.
 */
export function buildStructureJoints(blocks = [], options = {}) {
  if (!Array.isArray(blocks)) throw new TypeError('blocks must be an array')
  const tolerance = Number(options.contactTolerance ?? STRUCTURE_JOINT_RULES.contactTolerance)
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError('joint contactTolerance must be finite and non-negative')
  }
  const allowedKindsSource = options.allowedKinds
  if (allowedKindsSource !== undefined
    && !Array.isArray(allowedKindsSource)
    && !(allowedKindsSource instanceof Set)) {
    throw new TypeError('joint allowedKinds must be an array or Set')
  }
  const allowedKinds = allowedKindsSource === undefined ? null : new Set(allowedKindsSource)
  const desiredCountsSource = options.desiredCounts
  if (desiredCountsSource !== undefined && !isRecord(desiredCountsSource)) {
    throw new TypeError('joint desiredCounts must be an object')
  }
  const desiredCounts = desiredCountsSource === undefined ? null : {}
  if (desiredCounts) {
    for (const kind of ['nail', 'masonry']) {
      const value = Number(desiredCountsSource[kind] ?? 0)
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`joint desiredCounts.${kind} must be a non-negative safe integer`)
      }
      desiredCounts[kind] = value
    }
  }
  const joints = []
  const trussModules = new Map()
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block?.moduleKind !== 'tri-truss' || !block.moduleId) continue
    const entries = trussModules.get(block.moduleId) || []
    entries.push({ block, index })
    trussModules.set(block.moduleId, entries)
  }
  for (const [moduleId, entries] of trussModules) {
    const beamEntry = entries.find(({ block }) => block.modulePart === 'top-beam')
    if (!beamEntry) continue
    for (const bracePart of ['left-brace', 'right-brace']) {
      const braceEntry = entries.find(({ block }) => block.modulePart === bracePart)
      if (!braceEntry) continue
      const first = braceEntry.block
      const second = beamEntry.block
      if (!constructionAllowsTensionJoint(first)
        || !constructionAllowsTensionJoint(second)) continue
      const constructionProfile = constructionJointProfile(first, second)
      const profile = constructionProfile || INTEGRAL_TRUSS_JOINT_RULES[first.type]
        || INTEGRAL_TRUSS_JOINT_RULES.wood
      const firstKey = structureEntityKey(first, braceEntry.index)
      const secondKey = structureEntityKey(second, beamEntry.index)
      joints.push({
        id: `joint:integral:${String(moduleId)}:${bracePart}`,
        firstId: firstKey,
        secondId: secondKey,
        material: first.type,
        kind: constructionProfile?.kind || 'integral-truss',
        integral: true,
        autoRetain: true,
        bondedConstructionId: constructionProfile?.constructionId || null,
        contact: 'integral',
        restDx: second.x - first.x,
        restDy: second.y - first.y,
        restRotation: Number(second.rotation ?? 0) - Number(first.rotation ?? 0),
        strength: profile.strength,
        maxStrength: profile.strength,
        bearingAllowance: profile.bearingAllowance,
        breakDistance: profile.breakDistance,
        stiffness: profile.stiffness,
        velocityDamping: profile.velocityDamping,
        angularStiffness: profile.angularStiffness,
        damageScale: profile.damageScale,
        broken: false,
      })
    }
  }
  // Explicit complete-building layouts may join unlike materials (a timber
  // machine gallery socketed into a stone tower) and may contain a short
  // authored hinge gap (a raised drawbridge leaf).  These are real finite
  // joints, not fake overlap or infinite anchoring. They auto-retain because
  // the layout itself is the authoring contract, and break normally when the
  // connected module is destroyed or pulled beyond its allowed distance.
  const authoredBondPairs = new Set()
  const authoredEntries = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => typeof block?.physicalModuleId === 'string')
  for (let firstEntryIndex = 0; firstEntryIndex < authoredEntries.length; firstEntryIndex += 1) {
    const firstEntry = authoredEntries[firstEntryIndex]
    const first = firstEntry.block
    const firstBounds = rotatedRectBounds(first)
    for (let secondEntryIndex = firstEntryIndex + 1;
      secondEntryIndex < authoredEntries.length; secondEntryIndex += 1) {
      const secondEntry = authoredEntries[secondEntryIndex]
      const second = secondEntry.block
      const secondBounds = rotatedRectBounds(second)
      const horizontalOverlap = overlapLength(
        firstBounds.left, firstBounds.right, secondBounds.left, secondBounds.right,
      )
      const verticalOverlap = overlapLength(
        firstBounds.top, firstBounds.bottom, secondBounds.top, secondBounds.bottom,
      )
      const verticalContact = (
        Math.abs(firstBounds.bottom - secondBounds.top) <= tolerance
        || Math.abs(secondBounds.bottom - firstBounds.top) <= tolerance
      ) && horizontalOverlap > Math.min(5, Math.min(firstBounds.width, secondBounds.width) * 0.18)
      const horizontalContact = (
        Math.abs(firstBounds.right - secondBounds.left) <= tolerance
        || Math.abs(secondBounds.right - firstBounds.left) <= tolerance
      ) && verticalOverlap > Math.min(5, Math.min(firstBounds.height, secondBounds.height) * 0.18)
      const explicitlyAnchored = first.authoredAnchorModuleId === second.physicalModuleId
        || second.authoredAnchorModuleId === first.physicalModuleId
      if (!verticalContact && !horizontalContact && !explicitlyAnchored) continue
      if (!constructionAllowsTensionJoint(first) || !constructionAllowsTensionJoint(second)) continue
      const constructionProfile = constructionJointProfile(first, second)
      const firstProfile = STRUCTURE_JOINT_RULES[first.type] || STRUCTURE_JOINT_RULES.wood
      const secondProfile = STRUCTURE_JOINT_RULES[second.type] || STRUCTURE_JOINT_RULES.wood
      const profile = constructionProfile || {
        strength: Math.max(firstProfile.strength, secondProfile.strength)
          + Number(first.structuralSpine || second.structuralSpine) * 2,
        bearingAllowance: Math.max(firstProfile.bearingAllowance, secondProfile.bearingAllowance),
        breakDistance: explicitlyAnchored
          ? Math.max(18, firstProfile.breakDistance, secondProfile.breakDistance)
          : Math.max(firstProfile.breakDistance, secondProfile.breakDistance),
        stiffness: Math.max(firstProfile.stiffness, secondProfile.stiffness),
        velocityDamping: Math.max(firstProfile.velocityDamping, secondProfile.velocityDamping),
        angularStiffness: Math.max(firstProfile.angularStiffness, secondProfile.angularStiffness),
        damageScale: Math.min(firstProfile.damageScale, secondProfile.damageScale),
      }
      const firstKey = structureEntityKey(first, firstEntry.index)
      const secondKey = structureEntityKey(second, secondEntry.index)
      const pairKey = structureContactPairKey(firstKey, secondKey)
      authoredBondPairs.add(pairKey)
      joints.push({
        id: `joint:authored:${String(firstKey)}:${String(secondKey)}`,
        firstId: firstKey,
        secondId: secondKey,
        material: first.type === second.type ? first.type : 'mixed',
        kind: constructionProfile?.kind || 'authored-building-bond',
        authoredBuildingBond: true,
        autoRetain: true,
        bondedConstructionId: constructionProfile?.constructionId || null,
        contact: explicitlyAnchored && !verticalContact && !horizontalContact
          ? 'hinge'
          : verticalContact ? 'bearing' : 'side',
        restDx: second.x - first.x,
        restDy: second.y - first.y,
        restRotation: Number(second.rotation ?? 0) - Number(first.rotation ?? 0),
        strength: profile.strength,
        maxStrength: profile.strength,
        bearingAllowance: profile.bearingAllowance,
        breakDistance: profile.breakDistance,
        stiffness: profile.stiffness,
        velocityDamping: profile.velocityDamping,
        angularStiffness: profile.angularStiffness,
        damageScale: profile.damageScale,
        broken: false,
      })
    }
  }
  for (let firstIndex = 0; firstIndex < blocks.length; firstIndex += 1) {
    const first = blocks[firstIndex]
    const materialProfile = STRUCTURE_JOINT_RULES[first?.type]
    if (!materialProfile
      || first.critical || first.weakPoint || first.cableAnchor || first.weakFloat
      || !constructionAllowsTensionJoint(first)) continue
    const firstBounds = rotatedRectBounds(first)
    for (let secondIndex = firstIndex + 1; secondIndex < blocks.length; secondIndex += 1) {
      const second = blocks[secondIndex]
      if (authoredBondPairs.has(structureContactPairKey(
        structureEntityKey(first, firstIndex),
        structureEntityKey(second, secondIndex),
      ))) continue
      if (second?.type !== first.type || second.critical || second.weakPoint
        || second.cableAnchor || second.weakFloat
        || !constructionAllowsTensionJoint(second)) continue
      if (first.moduleKind === 'tri-truss' && first.moduleId === second.moduleId) continue
      const secondBounds = rotatedRectBounds(second)
      const horizontalOverlap = overlapLength(
        firstBounds.left, firstBounds.right, secondBounds.left, secondBounds.right,
      )
      const verticalOverlap = overlapLength(
        firstBounds.top, firstBounds.bottom, secondBounds.top, secondBounds.bottom,
      )
      const verticalContact = (
        Math.abs(firstBounds.bottom - secondBounds.top) <= tolerance
        || Math.abs(secondBounds.bottom - firstBounds.top) <= tolerance
      ) && horizontalOverlap > Math.min(5, Math.min(firstBounds.width, secondBounds.width) * 0.18)
      const horizontalContact = (
        Math.abs(firstBounds.right - secondBounds.left) <= tolerance
        || Math.abs(secondBounds.right - firstBounds.left) <= tolerance
      ) && verticalOverlap > Math.min(5, Math.min(firstBounds.height, secondBounds.height) * 0.18)
      if (!verticalContact && !horizontalContact) continue
      const constructionProfile = constructionJointProfile(first, second)
      const profile = constructionProfile || materialProfile
      if (!constructionProfile && allowedKinds && !allowedKinds.has(profile.kind)) continue
      const firstKey = structureEntityKey(first, firstIndex)
      const secondKey = structureEntityKey(second, secondIndex)
      joints.push({
        id: `joint:${String(firstKey)}:${String(secondKey)}`,
        firstId: firstKey,
        secondId: secondKey,
        material: first.type,
        kind: profile.kind,
        autoRetain: Boolean(constructionProfile?.autoRetain),
        bondedConstructionId: constructionProfile?.constructionId || null,
        contact: verticalContact ? 'bearing' : 'side',
        restDx: second.x - first.x,
        restDy: second.y - first.y,
        restRotation: Number(second.rotation ?? 0) - Number(first.rotation ?? 0),
        strength: profile.strength,
        maxStrength: profile.strength,
        bearingAllowance: profile.bearingAllowance,
        breakDistance: profile.breakDistance,
        stiffness: profile.stiffness,
        velocityDamping: profile.velocityDamping,
        angularStiffness: profile.angularStiffness,
        damageScale: profile.damageScale,
        broken: false,
      })
    }
  }
  if (!desiredCounts) return joints
  const selectedIds = new Set(
    joints
      .filter((joint) => joint.integral === true || joint.autoRetain === true)
      .map((joint) => joint.id),
  )
  for (const kind of ['nail', 'masonry']) {
    const candidates = joints.filter((joint) => joint.kind === kind)
    const count = Math.min(candidates.length, desiredCounts[kind])
    for (let index = 0; index < count; index += 1) {
      // Candidate order follows fortress construction order. Sampling the
      // midpoint of equal slices distributes sparse first encounters across
      // the whole skyline instead of clustering every nail on tower one.
      const candidateIndex = Math.min(
        candidates.length - 1,
        Math.floor((index + 0.5) * candidates.length / count),
      )
      selectedIds.add(candidates[candidateIndex].id)
    }
  }
  return joints.filter((joint) => selectedIds.has(joint.id))
}

function activeStructureJoint(joints, first, second) {
  if (!Array.isArray(joints)) return null
  const firstKey = first?.id ?? first?.key
  const secondKey = second?.id ?? second?.key
  return joints.find((joint) => !joint.broken && (
    (joint.firstId === firstKey && joint.secondId === secondKey)
    || (joint.firstId === secondKey && joint.secondId === firstKey)
  )) || null
}

export function structureContactPairKey(firstId, secondId) {
  const first = String(firstId ?? '')
  const second = String(secondId ?? '')
  if (!first || !second) throw new TypeError('structure contact ids must be non-empty')
  return JSON.stringify(first < second ? [first, second] : [second, first])
}

export function shouldWakeStructureBlock(block = {}, options = {}) {
  const source = options.source ?? 'shock'
  if (source !== 'shock' && source !== 'collision') {
    throw new RangeError('structure wake source must be shock or collision')
  }
  const speed = Math.max(0, finiteNumber(options.speed))
  const penetration = Math.max(0, finiteNumber(options.penetration))
  if (options.force === true) return speed > 0.01 || penetration > 0.001
  const profile = STRUCTURE_STABILITY_RULES.materials[block?.type]
    || STRUCTURE_STABILITY_RULES.materials.wood
  if (source === 'shock') return speed >= profile.shockWakeSpeed
  return speed >= profile.collisionWakeSpeed
    || penetration >= profile.collisionWakePenetration
}

export const STRUCTURE_WIND_RULES = deepFreeze({
  forcePerProjectedHeight: 0.0016,
  angularAccelerationScale: 0.04,
  maximumExposure: 1.5,
  materials: {
    wood: { drag: 1, tipping: 1 },
    stone: { drag: 0.58, tipping: 0.38 },
    ice: { drag: 0.82, tipping: 1.35 },
  },
})

/**
 * Returns a deterministic horizontal force and tipping response for one
 * oriented block. Force depends on its wind-facing height; acceleration and
 * angular acceleration additionally respect mass, aspect ratio and material.
 */
export function calculateStructureWindLoad(block = {}, windX = 0, { exposure = 1 } = {}) {
  const requestedType = typeof block?.type === 'string' ? block.type : 'wood'
  const materialType = STRUCTURE_WIND_RULES.materials[requestedType] ? requestedType : 'wood'
  const material = STRUCTURE_WIND_RULES.materials[materialType]
  const materialPhysics = BLOCK_MATERIALS[materialType]
  const construction = CONSTRUCTION_MATERIALS[block?.constructionId] || null
  const width = finiteNumber(block?.width)
  const height = finiteNumber(block?.height)
  const normalizedWind = finiteNumber(windX)
  const normalizedExposure = clamp(finiteNumber(exposure, 1), 0, STRUCTURE_WIND_RULES.maximumExposure)
  const rotation = finiteNumber(block?.rotation) * Math.PI / 180
  const validGeometry = width > 0 && height > 0
  const derivedMass = validGeometry ? width * height / 1_000 * materialPhysics.massMultiplier : 0
  const suppliedMass = finiteNumber(block?.mass, derivedMass)
  const mass = suppliedMass > 0 ? suppliedMass : derivedMass
  if (!validGeometry || mass <= 0) {
    return Object.freeze({
      active: false,
      materialType,
      windX: normalizedWind,
      exposure: normalizedExposure,
      mass: 0,
      projectedWidth: 0,
      projectedHeight: 0,
      forceX: 0,
      accelerationX: 0,
      tippingMoment: 0,
      angularAcceleration: 0,
    })
  }
  const projectedWidth = Math.abs(Math.cos(rotation)) * width + Math.abs(Math.sin(rotation)) * height
  const projectedHeight = Math.abs(Math.cos(rotation)) * height + Math.abs(Math.sin(rotation)) * width
  const forceX = normalizedWind * projectedHeight * STRUCTURE_WIND_RULES.forcePerProjectedHeight
    * material.drag * (construction?.windDragMultiplier ?? 1) * normalizedExposure
  const accelerationX = forceX / mass
  const aspect = clamp(projectedHeight / Math.max(1, projectedWidth), 0.12, 4)
  const tippingMoment = forceX * projectedHeight / 2 * aspect * material.tipping
    * (construction?.windTippingMultiplier ?? 1)
  const angularAcceleration = tippingMoment / mass * STRUCTURE_WIND_RULES.angularAccelerationScale
  return Object.freeze({
    active: Math.abs(forceX) > 0,
    materialType,
    windX: normalizedWind,
    exposure: normalizedExposure,
    mass,
    projectedWidth,
    projectedHeight,
    forceX,
    accelerationX,
    tippingMoment,
    angularAcceleration,
  })
}

export const FALLING_DEBRIS_RULES = deepFreeze({
  wood: { minimumFallDistance: 84, minimumImpactSpeed: 8.5, twoDamageEnergy: 24 },
  stone: { minimumFallDistance: 28, minimumImpactSpeed: 6.5, twoDamageEnergy: 20 },
  ice: { minimumFallDistance: 72, minimumImpactSpeed: 7.5, twoDamageEnergy: 21 },
})

function debrisEntityId(value, label) {
  if (typeof value === 'string' && value.length > 0) return value
  if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'bigint') return String(value)
  throw new TypeError(`${label} must be a non-empty string or finite number`)
}

export function fallingDebrisHitKey(blockId, targetId) {
  return JSON.stringify([
    debrisEntityId(blockId, 'blockId'),
    debrisEntityId(targetId, 'targetId'),
  ])
}

function settledDebrisPair(collection, key) {
  if (!collection) return false
  if (typeof collection.has === 'function') return collection.has(key)
  return Array.isArray(collection) && collection.includes(key)
}

/**
 * Pure once-only damage decision. It never mutates settledPairKeys: callers
 * add pairKey only when consumePair is true, so a harmless touch does not use
 * up the block's later legitimate falling hit.
 */
export function evaluateFallingDebrisDamage(options = {}) {
  const block = options.block && typeof options.block === 'object' ? options.block : {}
  const target = options.target && typeof options.target === 'object' ? options.target : {}
  const blockId = options.blockId ?? block.id
  const targetId = options.targetId ?? target.id
  let pairKey = null
  try {
    pairKey = fallingDebrisHitKey(blockId, targetId)
  } catch {
    return Object.freeze({
      eligible: false, damage: 0, consumePair: false, pairKey: null,
      reason: 'missing-pair-id', materialType: null,
      fallDistance: 0, impactSpeed: 0, impactEnergy: 0,
      minimumFallDistance: 0, minimumImpactSpeed: 0,
    })
  }
  const materialType = options.materialType ?? block.type ?? 'wood'
  const rule = FALLING_DEBRIS_RULES[materialType]
  if (!rule) {
    return Object.freeze({
      eligible: false, damage: 0, consumePair: false, pairKey,
      reason: 'unsupported-material', materialType,
      fallDistance: 0, impactSpeed: 0, impactEnergy: 0,
      minimumFallDistance: 0, minimumImpactSpeed: 0,
    })
  }
  const derivedFallDistance = Number.isFinite(block.y) && Number.isFinite(block.fallStartY)
    ? Math.max(0, block.y - block.fallStartY)
    : 0
  const fallDistance = Math.max(0, finiteNumber(options.fallDistance, derivedFallDistance))
  const derivedImpactSpeed = Math.max(0, finiteNumber(block.frameImpactSpeed, finiteNumber(block.vy)))
  const impactSpeed = Math.max(0, finiteNumber(options.impactSpeed, derivedImpactSpeed))
  const derivedMass = Math.max(0.1, finiteNumber(block.width) * finiteNumber(block.height) / 1_000
    * BLOCK_MATERIALS[materialType].massMultiplier)
  const mass = Math.max(0.1, finiteNumber(options.mass, finiteNumber(block.mass, derivedMass || 1)))
  const impactEnergy = impactSpeed * Math.sqrt(mass)
  const base = {
    pairKey,
    materialType,
    fallDistance,
    impactSpeed,
    impactEnergy,
    minimumFallDistance: rule.minimumFallDistance,
    minimumImpactSpeed: rule.minimumImpactSpeed,
  }
  if (settledDebrisPair(options.settledPairKeys, pairKey)) {
    return Object.freeze({ ...base, eligible: false, damage: 0, consumePair: false, reason: 'pair-already-settled' })
  }
  if (fallDistance + Number.EPSILON < rule.minimumFallDistance) {
    return Object.freeze({ ...base, eligible: false, damage: 0, consumePair: false, reason: 'insufficient-fall' })
  }
  if (impactSpeed + Number.EPSILON < rule.minimumImpactSpeed) {
    return Object.freeze({ ...base, eligible: false, damage: 0, consumePair: false, reason: 'insufficient-impact' })
  }
  const damage = impactEnergy >= rule.twoDamageEnergy ? 2 : 1
  return Object.freeze({ ...base, eligible: true, damage, consumePair: true, reason: 'eligible' })
}

function positiveLevel(value) {
  const level = Number(value)
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('level must be a positive safe integer')
  }
  return level
}

function bossLevel(mode, level) {
  if (mode === 'main') return MAIN_BOSS_LEVELS.includes(level)
  if (mode === 'endless') {
    const depth = level > MAIN_LEVELS ? level - MAIN_LEVELS : level
    return depth > 0 && depth % 10 === 0
  }
  return level % 10 === 0
}

export function calculateStructureComponentStats(options = {}) {
  if (!isRecord(options)) throw new TypeError('calculateStructureComponentStats expects an object')
  const type = options.type ?? 'wood'
  const material = BLOCK_MATERIALS[type]
  if (!material) throw new RangeError(`unsupported block material: ${String(type)}`)
  const constructionId = options.constructionId ?? null
  const construction = constructionId === null ? null : CONSTRUCTION_MATERIALS[constructionId]
  if (constructionId !== null && !construction) {
    throw new RangeError(`unsupported construction material: ${String(constructionId)}`)
  }
  const width = Number(options.width)
  const height = Number(options.height)
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('component width and height must be finite positive numbers')
  }
  const role = options.role ?? 'structural'
  let defaultDurabilityScale = STRONGHOLD_MODULE_RULES.durabilityScale.regular
  let defaultMassScale = 1
  if (role === 'truss-brace' || role === 'rock-buttress'
    || options.moduleKind === 'tri-truss' || options.moduleKind === 'rock-buttress') {
    defaultDurabilityScale = STRONGHOLD_MODULE_RULES.durabilityScale.trussPart
    defaultMassScale = 1.08
  } else if (role === 'wall-panel' || role === 'gate-wall') {
    defaultDurabilityScale = STRONGHOLD_MODULE_RULES.durabilityScale.wallPanel
    defaultMassScale = 1.15
  } else if (role === 'long-beam' || role === 'bridge-span'
    || role === 'building-carrier' || role === 'building-span') {
    // A 300px carrier should not share the three hit points of a 110px lintel.
    // The geometry ratio is bounded so huge procedural depths remain finite.
    defaultDurabilityScale = clamp(width / 132, 2, 2.6)
    defaultMassScale = 1.1
  } else if (role === 'building-wall') {
    defaultDurabilityScale = type === 'stone' ? 1.65 : 1.35
    defaultMassScale = type === 'stone' ? 1.24 : 1.12
  } else if (role === 'foundation-pier') {
    defaultDurabilityScale = STRONGHOLD_MODULE_RULES.durabilityScale.foundationPier
    defaultMassScale = 1.35
  } else if (role === 'facade-panel') {
    // A complete wall panel is an envelope and a shear member, not another
    // thin decorative plank. It deliberately sits between the two columns of
    // a bay and gives later buildings a continuous, readable load path.
    defaultDurabilityScale = type === 'stone' ? 1.55 : 1.25
    defaultMassScale = type === 'stone' ? 1.18 : 1.08
  } else if (role === 'frame-sill') {
    defaultDurabilityScale = 1.18
    defaultMassScale = 1.05
  }
  const durabilityScale = Number(options.durabilityScale ?? defaultDurabilityScale)
  const massScale = Number(options.massScale ?? defaultMassScale)
  if (!Number.isFinite(durabilityScale) || durabilityScale <= 0
    || !Number.isFinite(massScale) || massScale <= 0) {
    throw new RangeError('component durabilityScale and massScale must be finite positive numbers')
  }
  return Object.freeze({
    hp: Math.ceil(material.hp * durabilityScale * (construction?.hpMultiplier ?? 1)),
    mass: width * height / 1_000 * material.massMultiplier * massScale
      * (construction?.massMultiplier ?? 1),
    durabilityScale,
    massScale,
  })
}

function makeBlock(x, y, type, width = 26, height = 46, role = 'structural', metadata = {}) {
  const stats = calculateStructureComponentStats({ type, width, height, role, ...metadata })
  return {
    x,
    y,
    type,
    role,
    width,
    height,
    ...metadata,
    hp: stats.hp,
    mass: stats.mass,
    durabilityScale: stats.durabilityScale,
    massScale: stats.massScale,
  }
}

export function isHardStructureMaterial(block = {}) {
  return block?.type === 'stone'
    || Boolean(CONSTRUCTION_MATERIALS[block?.constructionId]?.hardMaterial)
}

function applyConstructionMaterial(block, constructionId) {
  const construction = CONSTRUCTION_MATERIALS[constructionId]
  if (!construction) throw new RangeError(`unsupported construction material: ${String(constructionId)}`)
  if (!construction.allowedBaseMaterials.includes(block.type)) return false
  const stats = calculateStructureComponentStats({ ...block, constructionId })
  block.constructionId = constructionId
  block.constructionName = construction.name
  block.hp = stats.hp
  block.mass = stats.mass
  block.durabilityScale = stats.durabilityScale
  block.massScale = stats.massScale
  block.armorHp = construction.armorHp || 0
  block.maxArmorHp = construction.armorHp || 0
  return true
}

function applyArchitectureConstructionPalette(blocks, blueprint) {
  if (!blueprint) return 0
  for (const block of blocks) {
    block.architectureBlueprintId = blueprint.id
    block.architectureBlueprintName = blueprint.name
    block.architectureMotif = blueprint.motif
  }
  let appliedCount = 0
  for (const rule of blueprint.constructionPalette) {
    const construction = CONSTRUCTION_MATERIALS[rule.constructionId]
    const candidates = blocks.filter((block) => (
      !block.constructionId
      && !block.critical
      && !block.weakPoint
      && (rule.roles.includes(block.role)
        || (block.physicalLegacyRoles || []).some((role) => rule.roles.includes(role)))
      && construction.allowedBaseMaterials.includes(block.type)
    ))
    if (!candidates.length) continue
    const desired = Math.min(
      candidates.length,
      Math.max(Math.min(2, candidates.length), Math.ceil(blocks.length * rule.ratio)),
    )
    const chosen = new Set()
    if (construction.clusterPlacement) {
      const normalizeIndex = (index) => (
        (index % candidates.length + candidates.length) % candidates.length
      )
      const anchorIndex = normalizeIndex(
        Math.floor(candidates.length / 2) + Number(rule.offset || 0),
      )
      chosen.add(anchorIndex)
      while (chosen.size < desired) {
        const selectedBlocks = [...chosen].map((index) => candidates[index])
        let bestIndex = -1
        let bestScore = Infinity
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
          if (chosen.has(candidateIndex)) continue
          const candidate = candidates[candidateIndex]
          const score = Math.min(...selectedBlocks.map((selected) => {
            const sameTower = candidate.towerIndex === selected.towerIndex
            const sameMaterial = candidate.type === selected.type
            const floorDistance = Math.abs(
              Number(candidate.floorIndex ?? 0) - Number(selected.floorIndex ?? 0),
            )
            const spatialDistance = Math.hypot(candidate.x - selected.x, candidate.y - selected.y)
            return (sameTower ? 0 : 1_000) + (sameMaterial ? 0 : 300)
              + floorDistance * 70 + spatialDistance
          }))
          if (score < bestScore || (score === bestScore && candidateIndex < bestIndex)) {
            bestScore = score
            bestIndex = candidateIndex
          }
        }
        if (bestIndex < 0) break
        chosen.add(bestIndex)
      }
    } else {
      for (let index = 0; index < desired; index += 1) {
        const evenlySpaced = Math.min(
          candidates.length - 1,
          Math.floor((index + 0.5) * candidates.length / desired),
        )
        chosen.add((evenlySpaced + rule.offset) % candidates.length)
      }
    }
    for (const candidateIndex of chosen) {
      if (applyConstructionMaterial(candidates[candidateIndex], rule.constructionId)) appliedCount += 1
    }
  }
  return appliedCount
}

function completeBuildingEnvelopeProfile(plan = {}) {
  const searchable = [
    plan.formId,
    plan.category,
    plan.wall,
    plan.structuralSystem,
  ].filter(Boolean).join(' ')
  const openFrame = /open|bridge|gantry|lift-shaft|arcade|suspension/u.test(searchable)
  let material = 'wood'
  let constructionId = null
  if (/icewood|frost-lock/u.test(searchable)) {
    material = 'ice'
    constructionId = 'resin-glass'
  } else if (/royal|castle|citadel|masonry|stone-arcade|froststone|buttressed/u.test(searchable)) {
    material = 'stone'
  } else if (/packed-earth/u.test(searchable)) {
    constructionId = 'packed-earth'
  } else if (/resin-timber/u.test(searchable)) {
    constructionId = 'resin-timber'
  }
  return Object.freeze({ material, constructionId, openFrame })
}

function architectureRoleForBlock(block = {}) {
  if (block.role === 'foundation-pier') return 'foundation'
  if (block.role === 'facade-panel') return 'envelope'
  if (block.role === 'frame-sill') return 'frame-sill'
  if (block.role === 'blueprint-landmark') return 'signature-mechanism'
  if (block.role === 'roof' || block.role === 'battlement') return 'roofline'
  if (block.role === 'post' || block.role === 'truss-brace'
    || block.role === 'rock-buttress' || block.role === 'outer-rock-buttress') return 'frame'
  if (block.role === 'wall-panel' || block.role === 'gate-wall') return 'curtain-wall'
  if (block.role === 'building-wall') return 'curtain-wall'
  if (block.role === 'bridge-span' || block.role === 'long-beam'
    || block.role === 'building-span' || block.role === 'building-carrier') return 'long-span'
  if (/gate|keystone/u.test(block.role || '')) return 'gate'
  return 'beam'
}

function completeBuildingTowerForm(plan, block) {
  if (block?.completeBuildingMassKind) return block.completeBuildingMassKind
  const forms = Array.isArray(plan?.towerForms) && plan.towerForms.length
    ? plan.towerForms
    : [plan?.formId || 'complete-building']
  const authoredIndex = Number.isInteger(block?.towerIndex)
    ? block.towerIndex
    : Number.isInteger(block?.gapIndex) ? block.gapIndex : 0
  return forms[((authoredIndex % forms.length) + forms.length) % forms.length]
}

function completeBuildingShapeForRole(plan, block, architectureRole, towerForm) {
  if (architectureRole === 'foundation') return plan.foundation
  if (architectureRole === 'roofline' || architectureRole === 'signature-mechanism') {
    if (/wind/u.test(towerForm)) return plan.roof
    if (/granary|workshop|headhouse/u.test(towerForm)) return plan.roof
    if (/bridge|viaduct|transfer|gantry|sorting/u.test(towerForm)) return 'open-bridge-deck'
    if (/terrace|retaining|forecourt/u.test(towerForm)) return 'stepped-flat'
    if (/corner|bastion|keep|gatehouse|command|tower/u.test(towerForm)
      && /military|royal/u.test(plan.category || '')) return 'crenellated-stone'
    return plan.roof
  }
  if (architectureRole === 'envelope' || architectureRole === 'curtain-wall') {
    if (/bridge|gantry|lift-shaft|transfer|open/u.test(towerForm)) return 'open-braced-frame'
    return plan.wall
  }
  if (architectureRole === 'long-span' || architectureRole === 'gate') {
    return plan.structuralSystem
  }
  return towerForm
}

function applyCompleteBuildingBlockIdentity(block, blueprint, appliedComplexity) {
  const plan = blueprint?.buildingPlan
  if (!plan?.completeBuilding) return block
  const architectureRole = architectureRoleForBlock(block)
  block.buildingFormId = plan.formId
  block.buildingFormName = plan.name || blueprint.name
  block.buildingCategory = plan.category || null
  block.completeBuilding = true
  block.completeBuildingTowerForm = completeBuildingTowerForm(plan, block)
  block.architectureRole = architectureRole
  block.architecturalShape = completeBuildingShapeForRole(
    plan,
    block,
    architectureRole,
    block.completeBuildingTowerForm,
  )
  block.buildingComplexity = appliedComplexity
  block.buildingStructuralSystem = plan.structuralSystem
  block.buildingSupportPathCount = plan.supportPathCount
  block.buildingMechanisms = [...(plan.mechanisms || [])]
  block.buildingSignatureFeature = plan.signatureFeature
  return block
}

/**
 * Turns each authored structural bay into part of one complete building.
 * Mature masonry is consolidated into real wall or pier bodies before the
 * cross-building carriers are added. This is important: a facade painted
 * behind four open post-and-lintel stacks still reads as four stacks. The
 * consolidated bodies own collision, mass and hit points, while gates,
 * arcades and machine frames deliberately remain open.
 */
function applyCompleteBuildingPlan(blocks, blueprint, options = {}) {
  const plan = blueprint?.buildingPlan
  if (!plan?.completeBuilding) {
    return Object.freeze({ panelCount: 0, stoneCount: 0, constructionCount: 0, complexity: 0 })
  }
  const mode = options.mode || 'main'
  const level = positiveLevel(options.level ?? 1)
  const strongholdTier = Math.max(0, Number(options.strongholdTier || 0))
  const minimumBossOverheadClearance = Math.max(
    0,
    finiteNumber(options.minimumBossOverheadClearance),
  )
  const appliedComplexity = mode === 'endless'
    ? Math.min(5, Math.max(plan.complexity, 2 + strongholdTier))
    : plan.complexity
  const towerIndexes = [...new Set(blocks
    .map((block) => block.towerIndex)
    .filter(Number.isInteger))].sort((first, second) => first - second)
  const massingCandidates = (plan.silhouetteSpec?.massing || []).filter((mass) => (
    !/roadway|continuous-wall|covered-gallery|granary-walk|leaf|recessed|throne-bay|platform/u.test(
      `${mass.id} ${mass.kind}`,
    )
  ))
  const applyMassingIdentity = (block) => {
    if (massingCandidates.length && Number.isInteger(block.towerIndex)) {
      const towerPosition = Math.max(0, towerIndexes.indexOf(block.towerIndex))
      const xRatio = towerIndexes.length <= 1 ? 0.5 : towerPosition / (towerIndexes.length - 1)
      const coveringMasses = massingCandidates.filter((mass) => (
        xRatio >= mass.xRatio - mass.widthRatio / 2 - 1e-6
        && xRatio <= mass.xRatio + mass.widthRatio / 2 + 1e-6
      ))
      const nearestMass = [...(coveringMasses.length ? coveringMasses : massingCandidates)]
        .sort((first, second) => (coveringMasses.length
          // Where masses overlap, the taller primary volume owns the physical
          // bay; low curtain walls remain in the facade layer behind it.
          ? second.heightRatio - first.heightRatio
            || Math.abs(first.xRatio - xRatio) - Math.abs(second.xRatio - xRatio)
            || first.widthRatio - second.widthRatio
          : Math.abs(first.xRatio - xRatio) - Math.abs(second.xRatio - xRatio)
            || second.heightRatio - first.heightRatio
        ))[0]
      block.completeBuildingMassId = nearestMass.id
      block.completeBuildingMassKind = nearestMass.kind
      block.completeBuildingXRatio = xRatio
    }
    return block
  }
  for (const block of blocks) {
    applyMassingIdentity(block)
    applyCompleteBuildingBlockIdentity(block, blueprint, appliedComplexity)
  }

  const envelope = completeBuildingEnvelopeProfile(plan)
  const reservedSlots = Math.max(0, Number(options.reservedSlots || 0))
  const maximumCount = Math.max(0, STRONGHOLD_RULES.maximumPhysicalBlocks - reservedSlots)

  // Main 13–18 and the matching late-endless blueprints own a normalized
  // physical layout.  It is intentionally instantiated here *after* the
  // legacy generator has supplied a deterministic footprint, then replaces
  // that legacy body wholesale.  Keeping or consolidating the old four tower
  // stacks underneath these modules would make the authored bridge, gatehouse
  // and citadel little more than metadata on the same repeated silhouette.
  const physicalModules = Array.isArray(plan.physicalModules) ? plan.physicalModules : []
  if (plan.physicalLayout && physicalModules.length > 0) {
    if (plan.physicalLayout.version !== 'normalized-rect-v1'
      || plan.physicalLayout.coordinateSpace !== 'silhouette-footprint'
      || plan.physicalLayout.origin !== 'ground-left') {
      throw new RangeError(`unsupported physical building layout for ${plan.formId}`)
    }
    if (physicalModules.length > maximumCount) {
      throw new RangeError(
        `${plan.formId} requires ${physicalModules.length} bodies; maximum is ${maximumCount}`,
      )
    }

    const legacyBlocks = [...blocks]
    const legacyBounds = legacyBlocks.map((block) => rotatedRectBounds(block))
    const rawLeft = Math.min(...legacyBounds.map((bounds) => bounds.left))
    const rawRight = Math.max(...legacyBounds.map((bounds) => bounds.right))
    const rawTop = Math.min(...legacyBounds.map((bounds) => bounds.top))
    const rawCenterX = (rawLeft + rawRight) / 2
    const authoredSpanRatio = clamp(
      finiteNumber(plan.silhouetteSpec?.footprint?.spanRatio, 1),
      0.55,
      1,
    )
    const footprintWidth = Math.max(420, (rawRight - rawLeft) * authoredSpanRatio)
    const footprintHeight = clamp(GROUND_Y - rawTop, 280, 470)
    const footprintLeft = rawCenterX - footprintWidth / 2
    const removedStoneCount = legacyBlocks.filter((block) => block.type === 'stone').length
    const descriptorIds = new Set()

    const roleProfile = (physicalRole, material) => {
      const royal = plan.category === 'royal'
      if (physicalRole === 'carrier') return {
        role: 'building-span', moduleKind: 'authored-building-span',
        durabilityScale: royal ? 3.1 : 2.7, massScale: material === 'stone' ? 1.3 : 1.16,
        legacyRoles: ['lintel'],
      }
      if (physicalRole === 'roof') return {
        role: 'roof', moduleKind: 'authored-building-span',
        durabilityScale: royal ? 2.5 : 2.15, massScale: material === 'stone' ? 1.24 : 1.1,
        legacyRoles: ['roof'],
      }
      if (physicalRole === 'wall') return {
        role: 'building-wall', moduleKind: 'authored-building-mass',
        durabilityScale: royal ? 2.45 : 2.05, massScale: material === 'stone' ? 1.34 : 1.16,
        legacyRoles: ['post'],
      }
      if (physicalRole === 'gate') return {
        role: 'gate-wall', moduleKind: 'authored-building-mass',
        durabilityScale: material === 'stone' ? 1.9 : 1.35,
        massScale: material === 'stone' ? 1.2 : 1.06,
        legacyRoles: ['gate-cap', 'post'],
      }
      if (physicalRole === 'threshold') return {
        role: 'foundation-pier', moduleKind: 'authored-building-mass',
        durabilityScale: 3, massScale: 1.4, legacyRoles: ['post'],
      }
      if (physicalRole === 'mechanism') return {
        role: 'blueprint-landmark', moduleKind: 'authored-building-mass',
        durabilityScale: 1.35, massScale: 1.08, legacyRoles: ['roof'],
      }
      return {
        role: 'facade-panel', moduleKind: 'authored-building-mass',
        durabilityScale: royal ? 2.8 : 2.35, massScale: material === 'stone' ? 1.42 : 1.18,
        legacyRoles: ['post'],
      }
    }

    const normalizedDescriptors = physicalModules.map((descriptor, index) => {
      if (!descriptor || typeof descriptor !== 'object') {
        throw new TypeError(`${plan.formId}.physicalModules[${index}] must be an object`)
      }
      if (typeof descriptor.id !== 'string' || !descriptor.id || descriptorIds.has(descriptor.id)) {
        throw new RangeError(`${plan.formId}.physicalModules[${index}] has an invalid or duplicate id`)
      }
      descriptorIds.add(descriptor.id)
      if (typeof descriptor.kind !== 'string' || !descriptor.kind) {
        throw new RangeError(`${plan.formId}.${descriptor.id} is missing kind`)
      }
      const xRatio = Number(descriptor.xRatio)
      const widthRatio = Number(descriptor.widthRatio)
      const heightRatio = Number(descriptor.heightRatio)
      const baseRatio = Number(descriptor.baseRatio)
      if (![xRatio, widthRatio, heightRatio, baseRatio].every(Number.isFinite)
        || widthRatio <= 0 || heightRatio <= 0 || xRatio < 0 || xRatio > 1
        || baseRatio < 0 || xRatio - widthRatio / 2 < -1e-6
        || xRatio + widthRatio / 2 > 1 + 1e-6 || baseRatio + heightRatio > 1 + 1e-6) {
        throw new RangeError(`${plan.formId}.${descriptor.id} has invalid normalized geometry`)
      }
      if (!BLOCK_MATERIALS[descriptor.material]) {
        throw new RangeError(`${plan.formId}.${descriptor.id} has unsupported material`)
      }
      return { ...descriptor, xRatio, widthRatio, heightRatio, baseRatio }
    })

    blocks.splice(0, blocks.length)
    let constructionCount = 0
    for (const descriptor of normalizedDescriptors) {
      const width = footprintWidth * descriptor.widthRatio
      const height = footprintHeight * descriptor.heightRatio
      const x = footprintLeft + footprintWidth * descriptor.xRatio
      const y = GROUND_Y - footprintHeight * descriptor.baseRatio - height / 2
      const profile = roleProfile(descriptor.role, descriptor.material)
      const moduleId = `complete-building:${mode}:${level}:${plan.formId}:${descriptor.id}`
      const block = makeBlock(
        x,
        y,
        descriptor.material,
        width,
        height,
        profile.role,
        {
          rotation: finiteNumber(descriptor.rotation),
          structuralRestRotation: finiteNumber(descriptor.rotation),
          towerIndex: Number.isInteger(descriptor.towerIndex) ? descriptor.towerIndex : undefined,
          familyId: options.familyId || null,
          familyPart: 'authored-physical-layout',
          moduleKind: profile.moduleKind,
          moduleId,
          modulePart: descriptor.kind,
          physicalModuleId: descriptor.id,
          physicalModuleKind: descriptor.kind,
          physicalModuleClass: descriptor.moduleClass || null,
          physicalFeature: descriptor.feature || null,
          physicalRole: descriptor.role,
          physicalLegacyRoles: profile.legacyRoles,
          physicalLayoutVersion: plan.physicalLayout.version,
          physicalGrammar: plan.physicalLayout.grammar,
          physicalSupportStrategy: plan.physicalLayout.supportStrategy,
          completeBuildingMassId: descriptor.massId || null,
          completeBuildingMassKind: descriptor.massKind || null,
          completeBuildingXRatio: descriptor.xRatio,
          structuralSpine: descriptor.structuralSpine === true,
          structuralBearingAllowance: descriptor.structuralSpine === true
            ? (descriptor.material === 'stone' ? 52 : 28)
            : descriptor.material === 'stone' ? 38 : descriptor.material === 'wood' ? 16 : 0,
          durabilityScale: profile.durabilityScale,
          massScale: profile.massScale,
        },
      )
      applyCompleteBuildingBlockIdentity(block, blueprint, appliedComplexity)
      if (envelope.constructionId && applyConstructionMaterial(block, envelope.constructionId)) {
        constructionCount += 1
      }
      block.architectureBlueprintId = blueprint.id
      block.architectureBlueprintName = blueprint.name
      block.architectureMotif = blueprint.motif
      blocks.push(block)
    }

    // Preserve towerIndex only as a compatibility anchor.  Real support
    // metadata is inferred from authored edge contact rather than assuming the
    // old four-column grammar.
    for (let index = 0; index < blocks.length; index += 1) {
      const descriptor = normalizedDescriptors[index]
      const block = blocks[index]
      const supportedBy = normalizedDescriptors
        .filter((candidate, candidateIndex) => candidateIndex !== index
          && Math.abs(candidate.baseRatio + candidate.heightRatio - descriptor.baseRatio) <= 1e-6
          && Math.min(
            descriptor.xRatio + descriptor.widthRatio / 2,
            candidate.xRatio + candidate.widthRatio / 2,
          ) - Math.max(
            descriptor.xRatio - descriptor.widthRatio / 2,
            candidate.xRatio - candidate.widthRatio / 2,
          ) > 1e-6)
        .map((candidate) => candidate.towerIndex)
        .filter(Number.isInteger)
      block.supportTowers = [...new Set(supportedBy)]
    }

    // A visibly suspended gate or machine part still needs a real finite
    // hinge. Edge-touching pieces are bonded automatically by
    // buildStructureJoints; only isolated authored mechanisms receive this
    // nearest-module tether metadata.
    for (const block of blocks.filter((candidate) => (
      candidate.physicalRole === 'gate' || candidate.physicalRole === 'mechanism'
    ))) {
      const bounds = rotatedRectBounds(block)
      const touchesAnother = blocks.some((other) => {
        if (other === block) return false
        const otherBounds = rotatedRectBounds(other)
        const horizontalOverlap = overlapLength(
          bounds.left, bounds.right, otherBounds.left, otherBounds.right,
        )
        const verticalOverlap = overlapLength(
          bounds.top, bounds.bottom, otherBounds.top, otherBounds.bottom,
        )
        return ((Math.abs(bounds.bottom - otherBounds.top) <= 4.5
          || Math.abs(otherBounds.bottom - bounds.top) <= 4.5) && horizontalOverlap > 0.25)
          || ((Math.abs(bounds.right - otherBounds.left) <= 4.5
            || Math.abs(otherBounds.right - bounds.left) <= 4.5) && verticalOverlap > 0.25)
      })
      if (touchesAnother || Math.abs(bounds.bottom - GROUND_Y) <= 3) continue
      const nearest = blocks
        .filter((other) => other !== block)
        .map((other) => {
          const otherBounds = rotatedRectBounds(other)
          const gapX = Math.max(0, otherBounds.left - bounds.right, bounds.left - otherBounds.right)
          const gapY = Math.max(0, otherBounds.top - bounds.bottom, bounds.top - otherBounds.bottom)
          return { other, distance: Math.hypot(gapX, gapY) }
        })
        .sort((first, second) => (
          first.distance - second.distance
          || String(first.other.physicalModuleId).localeCompare(String(second.other.physicalModuleId))
        ))[0]
      if (nearest && nearest.distance <= 56) {
        block.authoredAnchorModuleId = nearest.other.physicalModuleId
      }
    }

    for (let firstIndex = 0; firstIndex < blocks.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < blocks.length; secondIndex += 1) {
        const manifold = rectCollisionManifold(blocks[firstIndex], blocks[secondIndex])
        if (manifold && manifold.overlap > 0.12) {
          throw new RangeError(
            `${plan.formId} physical modules ${blocks[firstIndex].physicalModuleId}`
            + ` and ${blocks[secondIndex].physicalModuleId} penetrate by ${manifold.overlap}`,
          )
        }
      }
    }

    const targetPerches = []
    const targetRadius = 14 * 0.78
    for (const block of blocks.filter((candidate) => (
      candidate.role === 'roof' || candidate.role === 'building-span'
    ))) {
      const bounds = rotatedRectBounds(block)
      const offsets = bounds.width >= 120 ? [-0.25, 0.25] : [0]
      for (const offset of offsets) {
        const candidate = makeTarget(
          block.x + bounds.width * offset,
          bounds.top - targetRadius,
          14,
          false,
          'normal',
          { role: 'authored-building-perch', towerIndex: block.towerIndex },
        )
        const clear = blocks.every((other) => {
          if (other === block) return true
          const manifold = circleRectCollisionManifold({
            x: candidate.x,
            y: candidate.y,
            radius: targetRadius,
          }, other)
          return !manifold || manifold.overlap <= 1e-6
        })
        if (clear) targetPerches.push(candidate)
      }
    }

    const bossCourtyard = options.bossCourtyard
    if (bossCourtyard && typeof bossCourtyard === 'object') {
      const bossRadius = Math.max(1, (minimumBossOverheadClearance - 16) / 2)
      const paddedBossRadius = bossRadius + 3
      const courtMarker = blocks.find((block) => block.physicalFeature === 'open-boss-court')
      const preferredX = courtMarker?.x ?? finiteNumber(bossCourtyard.centerX, rawCenterX)
      const preferredSurfaceY = courtMarker
        ? rotatedRectBounds(courtMarker).top
        : GROUND_Y
      const bossCircleAt = (x, surfaceY) => ({
        x,
        y: surfaceY - paddedBossRadius,
        radius: paddedBossRadius,
      })
      const bossPositionIsClear = (x, surfaceY) => blocks.every((block) => {
        const manifold = circleRectCollisionManifold(bossCircleAt(x, surfaceY), block)
        return !manifold || manifold.overlap <= 1e-6
      })
      const physicalBounds = blocks.map((block) => rotatedRectBounds(block))
      const physicalLeft = Math.min(...physicalBounds.map((bounds) => bounds.left))
      const physicalRight = Math.max(...physicalBounds.map((bounds) => bounds.right))
      // A legacy tower gap can sit outside an authored asymmetric footprint.
      // Keep unmarked endless boss courts inside the actual composition; an
      // explicit open-boss-court marker remains the story-authoritative spot.
      const minimumCourtX = physicalLeft + paddedBossRadius
      const maximumCourtX = physicalRight - paddedBossRadius
      const courtCandidates = []
      if (courtMarker) {
        courtCandidates.push({ x: preferredX, surfaceY: preferredSurfaceY })
      } else {
        for (let offset = 0; offset <= footprintWidth + 160; offset += 2) {
          courtCandidates.push({ x: preferredX - offset, surfaceY: GROUND_Y })
          if (offset) courtCandidates.push({ x: preferredX + offset, surfaceY: GROUND_Y })
        }
        // Some complete fortresses intentionally close their entire ground
        // line. In those compositions a wide horizontal module is a real
        // upper court, not permission to eject the boss beyond the last wall.
        const topCourts = blocks
          .map((block) => ({ block, bounds: rotatedRectBounds(block) }))
          .filter(({ block, bounds }) => (
            Math.abs(finiteNumber(block.rotation)) <= 1e-6
            && bounds.width >= paddedBossRadius * 2 + 6
          ))
          .flatMap(({ bounds }) => {
            const left = bounds.left + paddedBossRadius + 3
            const right = bounds.right - paddedBossRadius - 3
            return [
              clamp(preferredX, left, right),
              (left + right) / 2,
              left,
              right,
            ].map((x) => ({ x, surfaceY: bounds.top }))
          })
          .sort((first, second) => (
            Math.abs(first.x - preferredX) - Math.abs(second.x - preferredX)
            || second.surfaceY - first.surfaceY
          ))
        courtCandidates.push(...topCourts)
      }
      const selectedCourt = courtCandidates.find(({ x, surfaceY }) => (
        x >= minimumCourtX
        && x <= maximumCourtX
        && bossPositionIsClear(x, surfaceY)
      ))
      if (!selectedCourt) {
        throw new RangeError(`${plan.formId} has no collision-free boss courtyard`)
      }
      const selectedX = selectedCourt.x
      const courtSurfaceY = selectedCourt.surfaceY
      const verticalTop = courtSurfaceY - bossRadius * 2
      const obstacles = blocks
        .filter((block) => block !== courtMarker)
        .map((block) => rotatedRectBounds(block))
        .filter((bounds) => bounds.bottom > verticalTop + 1e-6
          && bounds.top < courtSurfaceY - 1e-6)
      const leftObstacle = obstacles
        .filter((bounds) => bounds.right <= selectedX + 1e-6)
        .sort((first, second) => second.right - first.right)[0]
      const rightObstacle = obstacles
        .filter((bounds) => bounds.left >= selectedX - 1e-6)
        .sort((first, second) => first.left - second.left)[0]
      const clearLeft = leftObstacle?.right ?? footprintLeft - 80
      const clearRight = rightObstacle?.left ?? footprintLeft + footprintWidth + 80
      bossCourtyard.centerX = selectedX
      bossCourtyard.clearWidth = Math.max(0, clearRight - clearLeft)
      bossCourtyard.surfaceY = courtSurfaceY
      bossCourtyard.physicalLayout = true
    }

    return Object.freeze({
      panelCount: blocks.length,
      stoneCount: blocks.filter((block) => block.type === 'stone').length - removedStoneCount,
      constructionCount,
      complexity: appliedComplexity,
      physicalLayout: true,
      physicalModuleCount: blocks.length,
      targetPerches: Object.freeze(targetPerches),
      footprint: Object.freeze({
        left: footprintLeft,
        width: footprintWidth,
        height: footprintHeight,
      }),
    })
  }

  const pieceBudget = towerIndexes.length
  let panelCount = 0
  let addedPieceCount = 0
  let stoneCount = 0
  let constructionCount = 0

  const canAddPiece = () => addedPieceCount < pieceBudget && blocks.length < maximumCount
  const isClearCandidate = (candidate) => blocks.every((other) => {
    const manifold = rectCollisionManifold(candidate, other)
    return !manifold || manifold.overlap <= 0.12
  })
  const decoratePiece = (piece, { replacement = false } = {}) => {
    applyMassingIdentity(piece)
    applyCompleteBuildingBlockIdentity(piece, blueprint, appliedComplexity)
    if (envelope.constructionId && applyConstructionMaterial(piece, envelope.constructionId)) {
      constructionCount += 1
    }
    piece.architectureBlueprintId = blueprint.id
    piece.architectureBlueprintName = blueprint.name
    piece.architectureMotif = blueprint.motif
    blocks.push(piece)
    panelCount += 1
    if (!replacement) addedPieceCount += 1
    stoneCount += Number(piece.type === 'stone')
    return piece
  }

  // Royal keeps, redoubts and viaduct piers must be physical masses, not an
  // open three-piece tower repeated four times. Merge the two posts of every
  // eligible storey (and any brace trapped between them) into one collision
  // wall. Horizontal beams remain separate so the building can still fail at
  // readable courses, but its dominant body is now a keep, wall or bridge
  // pier. Open arcades, gantries and drawbridge voids are intentionally left
  // as frames.
  const solidMassKind = (kind = '') => (
    /tower|keep|redoubt|gatehouse|bastion|granary|pier|tollhouse|store|wall/u.test(kind)
    && !/open|arcade-gallery|drawbridge-leaf|recessed|throne-bay/u.test(kind)
  )
  const shouldConsolidateBays = appliedComplexity >= 4
    && (mode !== 'main' || level >= 13)
  if (shouldConsolidateBays) {
    const storeys = []
    for (const towerIndex of towerIndexes) {
      const floorIndexes = [...new Set(blocks
        .filter((block) => block.towerIndex === towerIndex && block.role === 'post')
        .map((block) => block.floorIndex)
        .filter(Number.isInteger))].sort((first, second) => first - second)
      for (const floorIndex of floorIndexes) storeys.push({ towerIndex, floorIndex })
    }

    for (const { towerIndex, floorIndex } of storeys) {
      const posts = blocks.filter((block) => (
        block.towerIndex === towerIndex
        && block.floorIndex === floorIndex
        && block.role === 'post'
      )).sort((first, second) => first.x - second.x)
      if (posts.length !== 2 || !solidMassKind(posts[0].completeBuildingMassKind)) continue
      const postBounds = posts.map((post) => rotatedRectBounds(post))
      const candidate = {
        x: (postBounds[0].left + postBounds[1].right) / 2,
        y: (Math.min(...postBounds.map((bounds) => bounds.top))
          + Math.max(...postBounds.map((bounds) => bounds.bottom))) / 2,
        width: postBounds[1].right - postBounds[0].left,
        height: Math.max(...postBounds.map((bounds) => bounds.bottom))
          - Math.min(...postBounds.map((bounds) => bounds.top)),
        rotation: 0,
      }
      const replaceable = blocks.filter((block) => (
        block.towerIndex === towerIndex
        && block.floorIndex === floorIndex
        && (block.role === 'post'
          || block.role === 'truss-brace'
          || block.moduleKind === 'tri-truss')
      ))
      const replaceableSet = new Set(replaceable)
      const clear = blocks.every((other) => replaceableSet.has(other) || (() => {
        const manifold = rectCollisionManifold(candidate, other)
        return !manifold || manifold.overlap <= 0.12
      })())
      if (!clear) continue

      stoneCount -= replaceable.filter((block) => block.type === 'stone').length
      for (const block of replaceable) {
        const index = blocks.indexOf(block)
        if (index >= 0) blocks.splice(index, 1)
      }
      decoratePiece(makeBlock(
        candidate.x,
        candidate.y,
        envelope.material === 'ice' ? 'ice' : 'stone',
        candidate.width,
        candidate.height,
        'facade-panel',
        {
          towerIndex,
          floorIndex,
          familyId: options.familyId || null,
          familyPart: 'complete-building-envelope',
          moduleKind: 'complete-building-envelope',
          moduleId: `complete-building:${mode}:${level}:${plan.formId}:mass-${towerIndex}-${floorIndex}`,
          modulePart: 'solid-bay-wall',
          structuralBearingAllowance: 36,
          durabilityScale: plan.category === 'royal' ? 1.9 : 1.62,
          massScale: plan.category === 'royal' ? 1.36 : 1.22,
          consolidatedStorey: true,
        },
      ), { replacement: true })
    }
  }

  // Replace one complete row of short tower lintels with a single real
  // carrier spanning the whole compound. This is the structural difference
  // between an authored building and four towers that merely happen to stand
  // beside one another: the new body rests on every bay, transfers load across
  // all supports, and remains a single collision object. Higher rows are
  // preferred so castle cornices and industrial transfer decks are readable;
  // wind-machine roofs stay intact so their rotor anchor is never removed.
  if (plan.complexity >= 2 && towerIndexes.length >= 2 && canAddPiece()) {
    const horizontalRoles = new Set(['lintel', 'roof'])
    const maximumFloor = Math.max(0, ...blocks
      .map((block) => Number.isInteger(block.floorIndex) ? block.floorIndex : 0))
    const carrierRows = []
    for (let floorIndex = 0; floorIndex <= maximumFloor; floorIndex += 1) {
      const members = towerIndexes.map((towerIndex) => blocks.find((block) => (
        block.towerIndex === towerIndex
        && block.floorIndex === floorIndex
        && horizontalRoles.has(block.role)
        && !block.moduleKind
        && !block.critical
        && !block.weakPoint
      )))
      if (members.some((member) => !member)) continue
      if (members.some((member) => member.role === 'roof'
        && /windmill-head|wind-engine-tower/u.test(member.completeBuildingTowerForm || ''))) continue
      const memberBounds = members.map((member) => rotatedRectBounds(member))
      if (Math.max(...members.map((member) => member.y))
        - Math.min(...members.map((member) => member.y)) > 3) continue
      const candidate = {
        x: (Math.min(...memberBounds.map((bounds) => bounds.left))
          + Math.max(...memberBounds.map((bounds) => bounds.right))) / 2,
        y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
        width: Math.max(...memberBounds.map((bounds) => bounds.right))
          - Math.min(...memberBounds.map((bounds) => bounds.left)),
        height: Math.min(...members.map((member) => member.height)),
        rotation: 0,
      }
      // A whole-building carrier may cross a reserved boss court only when it
      // is genuinely an overhead bridge. A low floor beam spanning every bay
      // used to intersect the boss crown at spawn on some endless seeds.
      if (Number.isInteger(options.bossCourtyardIndex)
        && GROUND_Y - (candidate.y + candidate.height / 2) < minimumBossOverheadClearance) {
        continue
      }
      const memberSet = new Set(members)
      const clear = blocks.every((other) => memberSet.has(other) || (() => {
        const manifold = rectCollisionManifold(candidate, other)
        return !manifold || manifold.overlap <= 0.12
      })())
      if (!clear) continue
      carrierRows.push({ floorIndex, members, candidate })
    }

    const selectedRow = carrierRows.sort((first, second) => (
      second.floorIndex - first.floorIndex
      || second.candidate.width - first.candidate.width
    ))[0]
    if (selectedRow) {
      const removedStoneCount = selectedRow.members
        .filter((member) => member.type === 'stone').length
      for (const member of selectedRow.members) {
        const index = blocks.indexOf(member)
        if (index >= 0) blocks.splice(index, 1)
      }
      stoneCount -= removedStoneCount
      const composition = plan.silhouetteSpec?.composition || plan.formId
      const connectionKind = /wind/u.test(composition) ? 'windmill-gallery'
        : /bridge|viaduct/u.test(composition) ? 'continuous-roadway'
          : /lift|gantry|workshop|industrial/u.test(`${composition} ${plan.category}`)
            ? 'machine-transfer-beam'
            : /castle|citadel|gate|fort|redoubt|court|royal/u.test(`${composition} ${plan.category}`)
              ? 'citadel-cornice'
              : 'long-timber-carrier'
      const carrierRole = selectedRow.members.some((member) => member.role === 'roof')
        ? 'roof'
        : 'building-carrier'
      decoratePiece(makeBlock(
        selectedRow.candidate.x,
        selectedRow.candidate.y,
        envelope.material,
        selectedRow.candidate.width,
        selectedRow.candidate.height,
        carrierRole,
        {
          floorIndex: selectedRow.floorIndex,
          supportTowers: [...towerIndexes],
          familyId: options.familyId || null,
          familyPart: 'complete-building-connection',
          moduleKind: 'complete-building-connection',
          moduleId: `complete-building:${mode}:${level}:${plan.formId}:whole-building-carrier`,
          modulePart: 'monolithic-carrier',
          connectionKind,
          silhouetteComposition: composition,
          structuralBearingAllowance: 48,
          // This is a deliberate primary load path, not a glowing weak point.
          // It can carry several bays, receives the plan's bonded material,
          // and is substantially tougher than the short beams it replaces.
          structuralSpine: true,
          durabilityScale: plan.category === 'royal' ? 4.2 : 3.4,
          massScale: plan.category === 'royal' ? 1.28 : 1.16,
        },
      ))
    }
  }

  // Mature buildings are never allowed to stop at "four bays under one long
  // plank". In addition to the whole-width carrier, every neighbouring pair
  // receives its own physically supported gallery. Royal keeps use masonry;
  // engineered halls and viaducts inherit their authored envelope material.
  const progression = mode === 'endless' && level > MAIN_LEVELS ? level - MAIN_LEVELS : level
  const denseMassing = plan.category === 'royal'
    || /continuous-wall|castle-gate|citadel|inner-court/u.test(
      plan.silhouetteSpec?.composition || '',
    )
  const connectedCompoundPlan = appliedComplexity >= 4
    && progression >= (mode === 'endless' ? 50 : 13)
    && denseMassing
  if (connectedCompoundPlan && pieceBudget > 0) {
    const bossCourtyardIndex = Number.isInteger(options.bossCourtyardIndex)
      ? options.bossCourtyardIndex
      : null
    const horizontalRoles = new Set(['lintel', 'roof', 'keystone'])
    const gapInterval = (gapIndex, top, bottom) => {
      const overlapsBand = (bounds) => (
        bounds.bottom > top + 1e-6 && bounds.top < bottom - 1e-6
      )
      const leftBounds = blocks
        .filter((block) => block.towerIndex === gapIndex)
        .map((block) => rotatedRectBounds(block))
        .filter(overlapsBand)
      const rightBounds = blocks
        .filter((block) => block.towerIndex === gapIndex + 1)
        .map((block) => rotatedRectBounds(block))
        .filter(overlapsBand)
      if (!leftBounds.length || !rightBounds.length) return null
      const leftEdge = Math.max(...leftBounds.map((bounds) => bounds.right))
      const rightEdge = Math.min(...rightBounds.map((bounds) => bounds.left))
      if (rightEdge - leftEdge < 12) return null
      return {
        leftEdge,
        rightEdge,
        centerX: (leftEdge + rightEdge) / 2,
        width: rightEdge - leftEdge,
      }
    }
    const pairedHorizontalBands = (gapIndex) => {
      const members = (towerIndex) => blocks.filter((block) => (
        block.towerIndex === towerIndex && horizontalRoles.has(block.role)
      )).map((block) => ({ block, bounds: rotatedRectBounds(block) }))
      const leftMembers = members(gapIndex)
      const rightMembers = members(gapIndex + 1)
      const bands = []
      for (const left of leftMembers) {
        const right = rightMembers
          .filter((candidate) => Math.abs(candidate.bounds.bottom - left.bounds.bottom) <= 6)
          .sort((first, second) => (
            Math.abs(first.bounds.bottom - left.bounds.bottom)
              - Math.abs(second.bounds.bottom - left.bounds.bottom)
          ))[0]
        if (!right) continue
        const top = Math.max(left.bounds.top, right.bounds.top)
        const bottom = Math.min(left.bounds.bottom, right.bounds.bottom)
        if (bottom - top < 10) continue
        bands.push({
          top,
          bottom,
          floorIndex: Math.min(left.block.floorIndex ?? 0, right.block.floorIndex ?? 0),
          left,
          right,
        })
      }
      return bands
        .filter((band, index, allBands) => allBands.findIndex((candidate) => (
          Math.abs(candidate.bottom - band.bottom) <= 2
        )) === index)
        .sort((first, second) => second.bottom - first.bottom)
    }
    const contextForSupport = (support, connectionKind) => {
      const gapIndex = support?.gapIndex
      if (!Number.isInteger(gapIndex) || gapIndex === bossCourtyardIndex) return null
      const supportBounds = rotatedRectBounds(support)
      const band = pairedHorizontalBands(gapIndex).find((candidate) => (
        supportBounds.top - candidate.bottom >= 24
      ))
      if (!band) return null
      return {
        gapIndex,
        support,
        supportBounds,
        band,
        connectionKind,
        wall: null,
      }
    }

    // Horizontal continuity is the first priority: place one supported high
    // gallery across every adjacent tower pair, including the boss courtyard.
    // Each span rests on the exposed lips of matching tower beams and leaves
    // the entire ground-level court clear for the boss collider.
    const adjacentGapIndexes = towerIndexes
      .slice(0, -1)
      .filter((towerIndex, index) => towerIndexes[index + 1] === towerIndex + 1)
    for (const gapIndex of adjacentGapIndexes) {
      if (!canAddPiece()) break
      const bands = [...pairedHorizontalBands(gapIndex)]
        .sort((first, second) => first.top - second.top)
      let selected = null
      for (const band of bands) {
        const galleryHeight = Math.max(14, Math.min(18, band.bottom - band.top))
        const galleryTop = band.top - galleryHeight
        const galleryBottom = band.top
        const overlapsGallery = (bounds) => (
          bounds.bottom > galleryTop + 1e-6 && bounds.top < galleryBottom - 1e-6
        )
        const leftObstacles = blocks
          .filter((block) => block !== band.left.block
            && block.towerIndex === gapIndex)
          .map((block) => rotatedRectBounds(block))
          .filter(overlapsGallery)
        const rightObstacles = blocks
          .filter((block) => block !== band.right.block
            && block.towerIndex === gapIndex + 1)
          .map((block) => rotatedRectBounds(block))
          .filter(overlapsGallery)
        const leftBearingLip = Math.min(12, Math.max(5, band.left.bounds.width * 0.08))
        const rightBearingLip = Math.min(12, Math.max(5, band.right.bounds.width * 0.08))
        const leftEdge = Math.max(
          band.left.bounds.right - leftBearingLip,
          leftObstacles.length
            ? Math.max(...leftObstacles.map((bounds) => bounds.right)) + 0.25
            : -Infinity,
        )
        const rightEdge = Math.min(
          band.right.bounds.left + rightBearingLip,
          rightObstacles.length
            ? Math.min(...rightObstacles.map((bounds) => bounds.left)) - 0.25
            : Infinity,
        )
        if (rightEdge - leftEdge < 18) continue
        const candidate = {
          x: (leftEdge + rightEdge) / 2,
          y: (galleryTop + galleryBottom) / 2,
          width: rightEdge - leftEdge,
          height: galleryHeight,
          rotation: 0,
        }
        if (!isClearCandidate(candidate)) continue
        selected = { band, candidate }
        break
      }
      if (!selected) continue
      decoratePiece(makeBlock(
        selected.candidate.x,
        selected.candidate.y,
        plan.category === 'royal' ? 'stone' : envelope.material,
        selected.candidate.width,
        selected.candidate.height,
        'building-span',
        {
          gapIndex,
          supportTowers: [gapIndex, gapIndex + 1],
          floorIndex: selected.band.floorIndex,
          familyId: options.familyId || null,
          familyPart: 'complete-building-connection',
          moduleKind: 'complete-building-connection',
          moduleId: `complete-building:${mode}:${level}:${plan.formId}:gap-${gapIndex}:gallery`,
          modulePart: gapIndex === bossCourtyardIndex
            ? 'courtyard-overpass'
            : 'high-gallery-span',
          connectionKind: 'high-gallery',
          courtyardOverpass: gapIndex === bossCourtyardIndex,
          structuralBearingAllowance: 38,
          durabilityScale: gapIndex === bossCourtyardIndex ? 1.62 : 1.48,
          massScale: 1.2,
        },
      ))
    }

    const gateSupports = [...new Set(blocks
      .filter((block) => block.moduleKind === 'royal-gatehouse')
      .map((block) => block.gapIndex))]
      .map((gapIndex) => blocks
        .filter((block) => block.moduleKind === 'royal-gatehouse'
          && block.gapIndex === gapIndex)
        .sort((first, second) => (
          rotatedRectBounds(first).top - rotatedRectBounds(second).top
          || second.width - first.width
        ))[0])
      .map((support) => contextForSupport(support, 'gate-superstructure'))
      .filter(Boolean)
    const curtainSupports = [...new Set(blocks
      .filter((block) => ['royal-upper-curtain-cap', 'wall-panel-cap']
        .includes(block.moduleKind))
      .map((block) => block.gapIndex))]
      .map((gapIndex) => blocks
        .filter((block) => ['royal-upper-curtain-cap', 'wall-panel-cap']
          .includes(block.moduleKind) && block.gapIndex === gapIndex)
        .sort((first, second) => rotatedRectBounds(first).top - rotatedRectBounds(second).top)[0])
      .map((support) => contextForSupport(support, 'curtain-rise'))
      .filter(Boolean)
    const connectionContexts = [...gateSupports, ...curtainSupports]
      .filter((context, index, contexts) => contexts.findIndex((candidate) => (
        candidate.gapIndex === context.gapIndex
      )) === index)

    // The fourth envelope body raises the central gate (or, when a gate is not
    // available, the first curtain wall) to meet one of the high courses.
    for (const context of connectionContexts) {
      if (!canAddPiece()) break
      const wallTop = context.band.bottom
      const wallBottom = context.supportBounds.top
      const interval = gapInterval(
        context.gapIndex,
        wallTop + 0.25,
        wallBottom - 0.25,
      )
      if (!interval || wallBottom - wallTop < 20) continue
      const supportCenterLeft = context.supportBounds.left + 1
      const supportCenterRight = context.supportBounds.right - 1
      const centerX = clamp(interval.centerX, supportCenterLeft, supportCenterRight)
      const width = Math.min(
        interval.width,
        2 * Math.min(centerX - interval.leftEdge, interval.rightEdge - centerX),
      )
      if (width < 12) continue
      const candidate = {
        x: centerX,
        y: (wallTop + wallBottom) / 2,
        width,
        height: wallBottom - wallTop,
        rotation: 0,
      }
      if (!isClearCandidate(candidate)) continue
      context.wall = decoratePiece(makeBlock(
        candidate.x,
        candidate.y,
        plan.category === 'royal' ? 'stone' : envelope.material,
        candidate.width,
        candidate.height,
        'building-wall',
        {
          gapIndex: context.gapIndex,
          supportTowers: [context.gapIndex, context.gapIndex + 1],
          floorIndex: context.band.floorIndex,
          familyId: options.familyId || null,
          familyPart: 'complete-building-connection',
          moduleKind: 'complete-building-connection',
          moduleId: `complete-building:${mode}:${level}:${plan.formId}:gap-${context.gapIndex}:wall`,
          modulePart: 'upper-wall-rise',
          connectionKind: context.connectionKind,
          structuralBearingAllowance: 38,
          durabilityScale: context.connectionKind === 'gate-superstructure' ? 1.55 : 1.42,
          massScale: 1.18,
        },
      ))
    }
  }

  for (const towerIndex of towerIndexes) {
    if (!canAddPiece()) break
    const posts = blocks.filter((block) => (
      block.towerIndex === towerIndex
      && block.floorIndex === 0
      && block.role === 'post'
    )).sort((first, second) => first.x - second.x)
    if (posts.length !== 2) continue
    const leftBounds = rotatedRectBounds(posts[0])
    const rightBounds = rotatedRectBounds(posts[1])
    const clearLeft = leftBounds.right + 1
    const clearRight = rightBounds.left - 1
    const clearWidth = clearRight - clearLeft
    if (clearWidth < 14) continue
    const commonBottom = Math.min(leftBounds.bottom, rightBounds.bottom)
    const postHeight = Math.min(leftBounds.height, rightBounds.height)
    const panelHeight = envelope.openFrame
      ? Math.max(10, Math.min(16, postHeight * 0.3))
      : Math.max(22, Math.min(36, postHeight * 0.72))
    const candidate = {
      x: (clearLeft + clearRight) / 2,
      y: commonBottom - panelHeight / 2,
      width: clearWidth,
      height: panelHeight,
      rotation: 0,
    }
    if (!isClearCandidate(candidate)) continue
    const role = envelope.openFrame ? 'frame-sill' : 'facade-panel'
    const panel = makeBlock(
      candidate.x,
      candidate.y,
      envelope.material,
      candidate.width,
      candidate.height,
      role,
      {
        towerIndex,
        floorIndex: 0,
        familyId: options.familyId || null,
        familyPart: 'complete-building-envelope',
        moduleKind: 'complete-building-envelope',
        moduleId: `complete-building:${mode}:${level}:${plan.formId}:tower-${towerIndex}`,
        modulePart: envelope.openFrame ? 'ground-sill' : 'ground-wall',
        structuralBearingAllowance: envelope.openFrame ? 10 : 18,
      },
    )
    decoratePiece(panel)
  }

  return Object.freeze({ panelCount, stoneCount, constructionCount, complexity: appliedComplexity })
}

const MAIN_BOSS_PROFILES = deepFreeze({
  6: { hp: 7, size: 40, mass: 3.2, knockbackMultiplier: 0.46, title: '林场护军' },
  12: { hp: 9, size: 43, mass: 3.8, knockbackMultiplier: 0.4, title: '关城将军' },
  17: { hp: 12, size: 46, mass: 4.5, knockbackMultiplier: 0.32, title: '王城大将' },
  18: { hp: 15, size: 50, mass: 5.4, knockbackMultiplier: 0.24, title: '松鼠大王' },
})

export function bossProfileForEncounter(mode, levelValue, variant = 'general') {
  const level = positiveLevel(levelValue)
  if (mode === 'main') {
    const authoredLevel = MAIN_BOSS_LEVELS.includes(level)
      ? level
      : MAIN_BOSS_LEVELS.find((bossLevel) => bossLevel >= level) || MAIN_LEVELS
    return Object.freeze({ ...MAIN_BOSS_PROFILES[authoredLevel] })
  }
  if (mode === 'endless') {
    const pressure = endlessPressureProfile(level)
    return Object.freeze({
      hp: pressure.bossHp,
      size: pressure.bossSize,
      mass: pressure.bossMass,
      knockbackMultiplier: pressure.bossKnockbackMultiplier,
      title: pressure.depth >= 80 ? '王城铁卫' : '远征守将',
    })
  }
  // Secret-stage bosses keep their authored HP and puzzle budgets. This
  // profile supplies only their shared boss identity and knockback resistance;
  // generateSpecialLevel remains the authority for encounter-specific stats.
  return Object.freeze({
    hp: 6,
    size: variant === 'glider' ? 24 : 26,
    mass: variant === 'glider' ? 2.1 : 2.7,
    knockbackMultiplier: variant === 'glider' ? 0.52 : 0.42,
    title: '秘境首领',
  })
}

function makeTarget(x, y, size = 16, boss = false, variant = 'normal', metadata = {}) {
  return { x, y, size, boss, variant, hp: boss ? 5 : 1, ...metadata }
}

export const BIRD_TYPE_UNLOCKS = deepFreeze([
  { type: 'red', level: 1 },
  { type: 'bomb', level: 2 },
  { type: 'split', level: 4 },
  { type: 'dash', level: 6 },
  { type: 'fire', level: FIRE_ACORN.unlockLevel },
])

export function birdTypePool(levelValue) {
  const level = positiveLevel(levelValue)
  return BIRD_TYPE_UNLOCKS
    .filter((unlock) => level >= unlock.level)
    .map((unlock) => unlock.type)
}

/**
 * Builds a deterministic, coverage-first main-campaign ammunition queue.
 * Every unlocked type appears once before any type repeats when the shot
 * budget permits it; later cycles stay balanced and avoid boundary repeats.
 */
export function buildMainAmmoQueue(options = {}) {
  if (!isRecord(options)) throw new TypeError('buildMainAmmoQueue expects an options object')
  const level = positiveLevel(options.level ?? 1)
  const seed = uint32Seed(options.seed ?? 1)
  const totalShots = nonNegativeInteger(options.totalShots)
  const sourcePool = options.availableTypes === undefined
    ? birdTypePool(level)
    : options.availableTypes
  if (!Array.isArray(sourcePool)) throw new TypeError('availableTypes must be an array')
  const pool = [...new Set(sourcePool.filter((type) => (
    typeof type === 'string'
    && type !== 'golden'
    && LAUNCHABLE_AFFINITY_TYPES.includes(type)
  )))]
  if (totalShots > 0 && pool.length === 0) {
    throw new RangeError('at least one launchable available type is required')
  }

  const rng = new Rng(mixSeed(seed, 'main-ammo-coverage', level, totalShots, pool.join(',')))
  const queue = []
  while (queue.length < totalShots) {
    const cycle = [...pool]
    for (let index = cycle.length - 1; index > 0; index -= 1) {
      const swapIndex = rng.integer(0, index + 1)
      ;[cycle[index], cycle[swapIndex]] = [cycle[swapIndex], cycle[index]]
    }
    if (queue.length === 0) {
      const firstEncounterTypes = BIRD_TYPE_UNLOCKS
        .filter((unlock) => unlock.level === level && cycle.includes(unlock.type))
        .map((unlock) => unlock.type)
      for (let index = firstEncounterTypes.length - 1; index >= 0; index -= 1) {
        const firstType = firstEncounterTypes[index]
        cycle.splice(cycle.indexOf(firstType), 1)
        cycle.unshift(firstType)
      }
    }
    if (queue.length && cycle.length > 1 && queue.at(-1) === cycle[0]) {
      const swapIndex = cycle.findIndex((type) => type !== queue.at(-1))
      ;[cycle[0], cycle[swapIndex]] = [cycle[swapIndex], cycle[0]]
    }
    queue.push(...cycle.slice(0, totalShots - queue.length))
  }
  return Object.freeze(queue)
}

export function verticalPlatformMotionEnvelope(platform = {}, clearance = 0) {
  const padding = Math.max(0, finiteNumber(clearance))
  const width = Math.max(0, finiteNumber(platform.width)) + padding * 2
  const height = Math.max(0, finiteNumber(platform.height))
  const centerY = (Math.min(
    finiteNumber(platform.minY, platform.y),
    finiteNumber(platform.maxY, platform.y),
  ) + Math.max(
    finiteNumber(platform.minY, platform.y),
    finiteNumber(platform.maxY, platform.y),
  )) / 2
  const travelHeight = Math.abs(
    finiteNumber(platform.maxY, platform.y) - finiteNumber(platform.minY, platform.y),
  ) + height + padding * 2
  return {
    x: finiteNumber(platform.x),
    y: centerY,
    width,
    height: travelHeight,
    rotation: 0,
  }
}

function placeMainMovingPlatforms(count, { blocks, targets, strongholdTier }) {
  const platforms = []
  // Four vertically separated lanes fit entirely in the approach to the
  // fortress.  Keeping a guaranteed upstream fallback lane is important:
  // authored guards can occupy the castle frontage, but must never silently
  // delete one of the promised moving obstacles.
  const xLanes = strongholdTier > 0
    ? [338, 382, 420, 360, 250]
    : [350, 392, 430, 330]
  const tracks = [[82, 142], [182, 242], [282, 342], [382, 442]]
  for (let index = 0; index < count; index += 1) {
    const candidates = []
    for (let trackOffset = 0; trackOffset < tracks.length; trackOffset += 1) {
      for (let laneOffset = 0; laneOffset < xLanes.length; laneOffset += 1) {
        const track = tracks[(index + trackOffset) % tracks.length]
        const x = xLanes[(index * 2 + laneOffset) % xLanes.length]
        candidates.push({
          x,
          y: (track[0] + track[1]) / 2,
          width: 112,
          height: 16,
          velocityY: index % 2 === 0 ? 1 : -1,
          minY: track[0],
          maxY: track[1],
          blocksBirds: true,
          affectsStructures: false,
        })
      }
    }
    const selected = candidates.find((candidate) => {
      const envelope = verticalPlatformMotionEnvelope(candidate, 8)
      if (blocks.some((block) => rectsOverlap(envelope, block))) return false
      if (targets.some((target) => circleIntersectsRect({
        x: target.x,
        y: target.y,
        radius: target.size * 0.78 + 8,
      }, envelope))) return false
      return platforms.every((platform) => !rectsOverlap(
        envelope,
        verticalPlatformMotionEnvelope(platform, 8),
      ))
    })
    if (selected) platforms.push(selected)
  }
  return platforms
}

function structureFamilyTowerPlan(profile, defaultTowerCount, baseFloors, blueprint = null, mode = 'main') {
  const ids = STRUCTURE_FAMILY_RULES.ids
  let towerCount = defaultTowerCount
  let floorCounts = Array.from({ length: towerCount }, () => baseFloors)
  let spacingBonus = 0
  let baseOffsets = Array.from({ length: towerCount }, () => 0)

  if (profile.id === ids.bridge) {
    towerCount = profile.complexity <= 1 ? 3 : 4
    floorCounts = towerCount === 3
      ? [Math.max(2, baseFloors - 2), Math.max(2, baseFloors - 2), baseFloors]
      : [
          Math.max(2, baseFloors - 2),
          Math.max(2, baseFloors - 2),
          baseFloors,
          baseFloors,
        ]
    spacingBonus = 18
    baseOffsets = towerCount === 3 ? [-8, 16, -2] : [-10, 14, -6, 12]
  } else if (profile.id === ids.rock) {
    towerCount = profile.complexity <= 1 ? 3 : 4
    floorCounts = towerCount === 3
      ? [Math.max(2, baseFloors - 2), baseFloors, Math.max(2, baseFloors - 2)]
      : [
          Math.max(2, baseFloors - 3),
          Math.max(3, baseFloors - 2),
          baseFloors,
          Math.max(2, baseFloors - 3),
        ]
    // Rock forts need a real boss court between their sloped bastions. The
    // larger pitch also stops rotated outer corners from touching the next
    // bastion before the simulation begins.
    spacingBonus = 60
    baseOffsets = towerCount === 3 ? [8, -4, -8] : [10, -4, 4, -10]
  } else if (profile.id === ids.royal) {
    towerCount = 4
    floorCounts = [
      Math.max(3, baseFloors - 2),
      baseFloors,
      baseFloors,
      Math.max(3, baseFloors - 2),
    ]
    // Keep the four-tower royal skyline inside the authored 1350px combat
    // world even after battlements and right-side foundations are added.
    spacingBonus = 3.5
    baseOffsets = [0, -6, 6, 0]
  }

  if (blueprint) {
    towerCount = blueprint.towerFloors.length
    floorCounts = [...blueprint.towerFloors]
    spacingBonus += blueprint.geometry.spacingDelta
    baseOffsets = [...blueprint.baseOffsets]
    // Deep endless encounters remix the authored silhouette at the generator's
    // full four-tower scale. This keeps the story motif while preserving the
    // target space and the capped late-game nail vocabulary.
    if (mode === 'endless' && defaultTowerCount > towerCount) {
      const sourceFloors = [...floorCounts]
      const sourceOffsets = [...baseOffsets]
      while (towerCount < defaultTowerCount) {
        const sourceIndex = towerCount % sourceFloors.length
        floorCounts.push(sourceFloors[sourceIndex])
        baseOffsets.push(-sourceOffsets[sourceIndex])
        towerCount += 1
      }
    }
  }

  if (profile.mirrored && profile.id !== ids.frontier) {
    floorCounts.reverse()
    baseOffsets = baseOffsets.reverse().map((offset) => -offset)
  }
  return {
    towerCount,
    floorCounts,
    spacingBonus,
    baseOffsets,
    maximumFloors: Math.max(...floorCounts),
  }
}

function structureFamilyFloorShift(profile, towerIndex, towerCount, floorIndex) {
  const ids = STRUCTURE_FAMILY_RULES.ids
  if (profile.id === ids.bridge) {
    const gateIndex = profile.mirrored ? Math.max(0, towerCount - 2) : 1
    const direction = Math.sign(gateIndex - towerIndex)
    return direction * Math.min(10, floorIndex * 2.4)
      + (towerIndex % 2 === 0 ? -1 : 1) * (floorIndex % 2 ? 2 : 0)
  }
  if (profile.id === ids.rock) {
    const centre = (towerCount - 1) / 2
    return Math.sign(centre - towerIndex) * Math.min(12, floorIndex * 2.8)
  }
  if (profile.id === ids.royal) {
    const centre = (towerCount - 1) / 2
    return Math.sign(centre - towerIndex) * Math.min(7, floorIndex * 1.4)
  }
  return 0
}

/**
 * Adds a grounded, continuous outer apron to late endless physical buildings.
 * Five touching masonry sections form one curtain/gatehouse composition: a
 * shared plinth course, solid wall masses, a continuous wall walk, a raised
 * three-section command bay and crenellations. It deliberately avoids the
 * legacy post/lintel/tower roles, so increasing body pressure also increases
 * architectural vocabulary instead of cloning four more vertical stacks.
 */
function applyEndlessCompoundPressure(blocks, blueprint, options = {}) {
  const pressure = options.pressure
  if (options.mode !== 'endless' || !pressure || !blueprint?.buildingPlan?.completeBuilding) {
    return Object.freeze({ addedCount: 0, stoneCount: 0 })
  }
  const reservedSlots = Math.max(0, nonNegativeInteger(options.reservedSlots))
  const maximumCount = Math.max(0, STRONGHOLD_RULES.maximumPhysicalBlocks - reservedSlots)
  const requiredCount = Math.min(maximumCount, pressure.minimumPhysicalBlocks)
  const deficit = Math.max(0, requiredCount - blocks.length)
  if (deficit === 0 || blocks.length === 0) {
    return Object.freeze({ addedCount: 0, stoneCount: 0 })
  }

  const level = positiveLevel(options.level ?? 1)
  const bounds = blocks.map((block) => rotatedRectBounds(block))
  const compositionLeft = Math.min(...bounds.map((entry) => entry.left))
  // Keep the new curtain safely behind the launcher while using the whole
  // available left shoulder of the fortress. Five sections read as one broad
  // ward rather than five thin towers.
  const apronWidth = clamp(compositionLeft - 300, 220, 280)
  const rightEdge = compositionLeft
  const leftEdge = rightEdge - apronWidth
  const sectionCount = 5
  const sectionWidth = apronWidth / sectionCount
  const foundationHeight = 16
  const lowerWallHeight = 64
  const capHeight = 14
  const upperWallHeight = 48
  const crenelHeight = 18
  const foundationTop = GROUND_Y - foundationHeight
  const lowerWallTop = foundationTop - lowerWallHeight
  const lowerCapTop = lowerWallTop - capHeight
  const upperWallTop = lowerCapTop - upperWallHeight
  const upperCapTop = upperWallTop - capHeight
  const descriptors = []
  const sectionX = (sectionIndex) => leftEdge + sectionWidth * (sectionIndex + 0.5)
  const pushDescriptor = (descriptor) => descriptors.push(descriptor)

  // One continuous plinth course distributes every upper mass to ground.
  for (let section = 0; section < sectionCount; section += 1) {
    pushDescriptor({
      section,
      layer: 'plinth',
      x: sectionX(section),
      y: GROUND_Y - foundationHeight / 2,
      width: sectionWidth,
      height: foundationHeight,
      role: 'foundation-pier',
      durabilityScale: 2.4,
      massScale: 1.34,
      structuralSpine: true,
    })
  }
  // Broad wall masses create a genuine curtain rather than repeated columns.
  for (let section = 0; section < sectionCount; section += 1) {
    pushDescriptor({
      section,
      layer: 'curtain',
      x: sectionX(section),
      y: foundationTop - lowerWallHeight / 2,
      width: sectionWidth - 4,
      height: lowerWallHeight,
      role: 'building-wall',
      durabilityScale: 2.25,
      massScale: 1.28,
      structuralSpine: true,
    })
  }
  // The wall walk is a continuous visual/load-bearing line across the ward.
  for (let section = 0; section < sectionCount; section += 1) {
    pushDescriptor({
      section,
      layer: 'wall-walk',
      x: sectionX(section),
      y: lowerWallTop - capHeight / 2,
      width: sectionWidth,
      height: capHeight,
      role: 'building-span',
      durabilityScale: 2.5,
      massScale: 1.22,
      structuralSpine: true,
    })
  }
  // A stepped three-section gatehouse creates a readable centre hierarchy.
  for (const section of [1, 2, 3]) {
    pushDescriptor({
      section,
      layer: 'command-wall',
      x: sectionX(section),
      y: lowerCapTop - upperWallHeight / 2,
      width: sectionWidth * 0.78,
      height: upperWallHeight,
      role: 'building-wall',
      durabilityScale: 2.35,
      massScale: 1.3,
      structuralSpine: true,
    })
  }
  for (const section of [1, 2, 3]) {
    pushDescriptor({
      section,
      layer: 'command-cornice',
      x: sectionX(section),
      y: upperWallTop - capHeight / 2,
      width: sectionWidth * 0.9,
      height: capHeight,
      role: 'building-span',
      durabilityScale: 2.65,
      massScale: 1.24,
      structuralSpine: true,
    })
  }
  // Low outer crenels and a taller central crown finish the silhouette. Each
  // body has a full-width bearing surface below it, so no decorative collider
  // begins suspended or relies on an invisible anchor.
  for (const section of [0, 4]) {
    for (const offset of [-0.25, 0.25]) {
      pushDescriptor({
        section,
        layer: 'outer-crenel',
        x: sectionX(section) + sectionWidth * offset,
        y: lowerCapTop - crenelHeight / 2,
        width: Math.max(10, sectionWidth * 0.22),
        height: crenelHeight,
        role: 'battlement',
        durabilityScale: 1.8,
        massScale: 1.12,
      })
    }
  }
  for (const section of [1, 2, 3]) {
    for (const offset of [-0.27, 0, 0.27]) {
      pushDescriptor({
        section,
        layer: 'command-crenel',
        x: sectionX(section) + sectionWidth * offset,
        y: upperCapTop - crenelHeight / 2,
        width: Math.max(9, sectionWidth * 0.18),
        height: crenelHeight,
        role: 'battlement',
        durabilityScale: 1.9,
        massScale: 1.14,
      })
    }
  }

  const appliedComplexity = Math.min(
    5,
    Math.max(blueprint.buildingPlan.complexity, 2 + strongholdTierForLevel('endless', level)),
  )
  const selected = descriptors.slice(0, Math.min(deficit, descriptors.length))
  for (const [index, descriptor] of selected.entries()) {
    const block = makeBlock(
      descriptor.x,
      descriptor.y,
      'stone',
      descriptor.width,
      descriptor.height,
      descriptor.role,
      {
        durabilityScale: descriptor.durabilityScale,
        massScale: descriptor.massScale,
        structuralSpine: descriptor.structuralSpine === true,
        familyPart: 'endless-fortified-apron',
        moduleKind: 'endless-compound-apron',
        moduleId: `endless-compound:${level}:section-${descriptor.section}:${descriptor.layer}:${index}`,
        modulePart: descriptor.layer,
        compoundSection: descriptor.section,
        endlessPressureTier: pressure.tierMinimumDepth,
        completeBuildingMassId: 'endless-outer-ward',
        completeBuildingMassKind: 'fortified-curtain-gatehouse',
        completeBuildingXRatio: 0,
        structuralBearingAllowance: descriptor.structuralSpine ? 52 : 34,
      },
    )
    applyCompleteBuildingBlockIdentity(block, blueprint, appliedComplexity)
    blocks.push(block)
  }
  return Object.freeze({ addedCount: selected.length, stoneCount: selected.length })
}

function applyEndlessTargetPressure(targets, pressure, seedValue) {
  if (!pressure || !Array.isArray(targets)) return 0
  const regularTargets = targets
    .map((target, index) => ({ target, index }))
    .filter(({ target }) => !target.boss)
  for (const { target } of regularTargets) {
    target.hp = Math.max(target.hp || 1, pressure.regularBaseHp)
  }
  const reinforcedCount = Math.min(
    regularTargets.length,
    Math.round(regularTargets.length * pressure.reinforcedTargetFraction),
  )
  const ranked = [...regularTargets].sort((first, second) => (
    mixSeed(seedValue, 'endless-pressure-target', pressure.depth, first.index)
      - mixSeed(seedValue, 'endless-pressure-target', pressure.depth, second.index)
    || first.index - second.index
  ))
  for (const { target } of ranked.slice(0, reinforcedCount)) {
    target.hp = Math.max(target.hp, pressure.regularBaseHp + 1)
    target.endlessReinforced = true
  }
  return reinforcedCount
}

export function generateLevel(options = {}) {
  if (!isRecord(options)) throw new TypeError('generateLevel expects an options object')
  const level = positiveLevel(options.level ?? 1)
  const mode = options.mode ?? 'main'
  if (!GAME_MODES.has(mode)) throw new RangeError(`unsupported game mode: ${mode}`)

  const seed = uint32Seed(options.seed ?? 1)
  const goldenAcornRoll = rollGoldenAcornForLevel({
    seed,
    level,
    mode,
    lucky: Boolean(options.lucky),
    luckyMultiplier: options.luckyMultiplier,
  })
  const rng = new Rng(seed)
  const structureFamily = structureFamilyProfileForLevel(mode, level, seed)
  const architectureBlueprint = architectureBlueprintForEncounter({
    mode,
    level,
    seed,
    familyId: structureFamily.id,
  })
  const terrainProfile = terrainProfileForLevel({ mode, level, seed })
  const lateRule = mode === 'main' ? MAIN_LATE_LEVEL_RULES[level] : null
  const environmentThemeLevel = mode === 'main' ? level
    : mode === 'endless' ? endlessEnvironmentThemeLevel(level, seed)
      : null
  const environmentTheme = environmentThemeLevel
    ? getMainEnvironmentTheme(environmentThemeLevel)
    : null
  const materialBias = environmentTheme?.architecture?.materialBias || null
  const architectureScale = finiteNumber(environmentTheme?.architecture?.scale, 0.42)
  const fortification = finiteNumber(environmentTheme?.architecture?.fortification, 0.2)
  const mapIndex = Math.floor((level - 1) / 3) % MAP_TYPES.length
  const cycleMapType = lateRule?.mapType ?? MAP_TYPES[mapIndex]
  const movingPlatformProfile = movingPlatformProfileForLevel(mode, level)
  const mapType = mode === 'main' || mode === 'endless'
    ? movingPlatformProfile.active ? 'moving'
      : cycleMapType === 'moving' ? 'normal' : cycleMapType
    : cycleMapType
  const skyColor = SKY_COLORS[level % SKY_COLORS.length]
  const windMagnitude = levelWindMagnitude(mode, level, lateRule?.windMagnitude ?? null)
  const windX = mapType === 'wind' ? (rng.next() < 0.5 ? -windMagnitude : windMagnitude) : 0
  const isBossLevel = bossLevel(mode, level)
  const endlessPressure = mode === 'endless' ? endlessPressureProfile(level) : null
  const strongholdTier = strongholdTierForLevel(mode, level)
  const strongholdModules = strongholdModuleProfileForLevel(mode, level)
  const authoredJointCounts = structureJointCountsForLevel(mode, level)
  const stoneChance = materialBias?.stone ?? (strongholdTier > 0
    ? 0.22 + strongholdTier * 0.08
    : Math.min(0.1 + level * 0.02, 0.3))
  const iceChance = materialBias?.ice ?? 0.25
  const baseTowerCount = Math.min(1 + Math.floor(level / 2), 4)
  const baseFloors = 2 + Math.min(Math.floor(level / 3), 3)
  const towerPlan = structureFamilyTowerPlan(
    structureFamily,
    baseTowerCount,
    baseFloors,
    architectureBlueprint,
    mode,
  )
  const towerCount = towerPlan.towerCount
  const towerFloorCounts = towerPlan.floorCounts
  const floors = towerPlan.maximumFloors
  const completeBuildingPanelBudget = architectureBlueprint?.buildingPlan?.completeBuilding
    ? towerCount
    : 0
  const completeBuildingEnvelope = completeBuildingEnvelopeProfile(
    architectureBlueprint?.buildingPlan,
  )
  const foundationBlocksPerTower = strongholdTier > 0 ? 2 : 0
  const totalBlockCount = towerFloorCounts.reduce((sum, count) => sum + count * 3, 0)
    + towerCount * foundationBlocksPerTower
  const strongholdConnectorCount = Math.min(
    strongholdModules.wallPanelCount,
    Math.max(0, towerCount - 1 - (isBossLevel ? 1 : 0)),
  )
  const royalGateReserved = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
    && strongholdConnectorCount > 0
  const actualStrongholdConnectorCount = Math.max(
    0,
    strongholdConnectorCount - Number(royalGateReserved),
  )
  const longBeamCount = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
    ? strongholdModules.longBeamCount
    : 0
  const familyBridgeSpanCount = Math.min(
    structureFamily.bridgeSpanCount,
    Math.max(0, towerCount - 1 - (isBossLevel ? 1 : 0)),
  )
  const familyRockButtressCount = structureFamily.rockButtressCount
  const availableTrussSlotCount = towerFloorCounts.reduce(
    (sum, count) => sum + Math.max(0, count - 2),
    0,
  )
  const reservedRockButtressCount = Math.min(
    familyRockButtressCount,
    availableTrussSlotCount,
  )
  const reservedStrongholdTrussCount = Math.min(
    strongholdModules.trussCount,
    Math.max(0, availableTrussSlotCount - reservedRockButtressCount),
  )
  const strongholdBattlementCount = strongholdTier >= 3
    ? towerCount * (structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal ? 2 : 1)
    : 0
  const familySilhouetteBlockCount = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.rock
    ? (structureFamily.complexity >= 2 ? 3 : 0)
      + (structureFamily.complexity >= 3 ? 2 : 0)
    : structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
      ? actualStrongholdConnectorCount * 2 + Number(royalGateReserved) * 4
      : 0
  const projectedBlockCount = totalBlockCount
    + actualStrongholdConnectorCount * 2
    + strongholdBattlementCount
    + longBeamCount
    + familyBridgeSpanCount
    + familySilhouetteBlockCount
    + completeBuildingPanelBudget
  const authoredStoneRatio = materialBias
    ? Math.min(STRONGHOLD_RULES.stoneRatios[strongholdTier], materialBias.stone + 0.02)
    : STRONGHOLD_RULES.stoneRatios[strongholdTier]
  const rockStoneRatio = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.rock
    ? STRUCTURE_FAMILY_RULES.rockStoneBudgetRatios[structureFamily.complexity]
    : 0
  // Endless bridge gates keep their wooden weak span, while the six late
  // stone trusses and authored masonry contacts still need reserved headroom.
  // Raise only the budget ceiling as that mandatory vocabulary grows; this
  // does not force the remaining gallery pieces to become stone.
  const bridgeStoneRatio = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.bridge
    ? Math.min(0.78, 0.6 + Math.max(0, strongholdModules.stoneTrussCount - 3) * 0.06)
    : 0
  let maxStoneRatio = Math.max(
    authoredStoneRatio,
    bridgeStoneRatio,
    rockStoneRatio,
    structureFamily.royalStoneCoreRatio,
  )
  let maxStoneCount = Math.floor(projectedBlockCount * maxStoneRatio)
  // Keep guaranteed masonry separate from the probabilistic storey budget.
  // Towers are emitted one at a time, so comparing the total stone count with
  // a mixed budget let early towers consume slots reserved for rear
  // foundations and reinforced posts.
  const guaranteedStoneTrussCount = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
    ? reservedStrongholdTrussCount
    : Math.min(reservedStrongholdTrussCount, strongholdModules.stoneTrussCount)
  const guaranteedStrongholdStones = actualStrongholdConnectorCount + strongholdBattlementCount
    + towerCount * foundationBlocksPerTower + guaranteedStoneTrussCount * 3
    + Math.max(0, reservedRockButtressCount * 3 - Number(reservedRockButtressCount > 0))
    + (strongholdTier >= 3 ? longBeamCount : 0)
    + familySilhouetteBlockCount
    + Number(completeBuildingEnvelope.material === 'stone') * completeBuildingPanelBudget
  let randomStoneLimit = Math.max(0, maxStoneCount - guaranteedStrongholdStones)
  const reinforcedFloors = strongholdTier > 0 ? strongholdTier : 0
  const forcedMasonryPostCount = Math.min(towerCount * 2, authoredJointCounts.masonry)
  const forcedMasonryBeamCount = Math.ceil(Math.max(
    0,
    authoredJointCounts.masonry - forcedMasonryPostCount,
  ) / 2)
  // Reserve the exact union of normal stronghold reinforcements and authored
  // masonry modules. A simple sum double-counts overlaps on the first floor;
  // an underestimate lets random stone consume a slot needed by a later tower.
  let mandatoryStoneReserve = forcedMasonryPostCount + forcedMasonryBeamCount
  // A royal city's non-gallery storeys are deliberately all masonry.  Their
  // authored core used to fit inside the generic floor plan by coincidence;
  // taller blueprints expose the missing reservation and let early random
  // rolls consume stone slots needed by rear towers. Reserve the whole core
  // up front. Truss pieces are also counted in the guaranteed budget, so this
  // conservative upper bound merely suppresses surplus random stone; it never
  // raises the level's material ceiling.
  if (structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal) {
    mandatoryStoneReserve = Math.max(
      mandatoryStoneReserve,
      towerFloorCounts.reduce((sum, count) => sum + Math.max(0, count - 1) * 3, 0),
    )
  }
  // Authored masonry is a hard content contract, while the ratio is a soft
  // material-mix target. A compact bridge blueprint can devote more of its
  // total pieces to external trusses, leaving the ratio-derived tower budget
  // one or two stones short. Expand only that local budget to fit the required
  // joints; never silently delete the late-game construction vocabulary.
  if (structureFamily.id !== STRUCTURE_FAMILY_RULES.ids.royal
    && randomStoneLimit < mandatoryStoneReserve) {
    randomStoneLimit = mandatoryStoneReserve
    maxStoneCount = guaranteedStrongholdStones + randomStoneLimit
    maxStoneRatio = Math.max(maxStoneRatio, maxStoneCount / Math.max(1, projectedBlockCount))
  }

  const blocks = []
  const towerBases = []
  const groundTargets = []
  const elevatedTargets = []
  const fallbackPerchTargets = []
  let stoneCount = 0
  let randomStoneCount = 0
  let reinforcedStoneCount = 0
  let forcedStoneCount = 0
  const goldenEggCandidates = []
  const geometryScale = clamp(
    1 + architectureScale * 0.1 + fortification * 0.025 + strongholdTier * 0.025,
    1.02,
    1.16,
  )
  const blueprintGeometry = architectureBlueprint?.geometry || {}
  const postWidth = Math.round(26 * geometryScale * (blueprintGeometry.postWidthScale || 1))
  const postHeight = Math.round(46 * geometryScale * (blueprintGeometry.postHeightScale || 1))
  const beamWidth = Math.round(110 * geometryScale * (blueprintGeometry.beamWidthScale || 1))
  const beamHeight = Math.round(20 * geometryScale * (blueprintGeometry.beamHeightScale || 1))
  const floorStride = postHeight + beamHeight
  // The first boss predates foundation piers, but still needs a real ground
  // court. Give only this frontier-era layout extra pitch; later authored
  // families already reserve their own arena and remain inside world bounds.
  const bossCourtSpacingBonus = isBossLevel && strongholdTier === 0 ? 20 : 0
  const towerSpacing = TOWER_SPACING + strongholdTier * 10
    + towerPlan.spacingBonus + bossCourtSpacingBonus
  const foundationHeight = strongholdTier > 0 ? 14 + strongholdTier * 2 : 0
  const strongholdBearingAllowance = strongholdTier > 0 ? 44 + strongholdTier * 2 : 0
  const trussCandidates = []
  for (let floor = 1; floor < floors - 1; floor += 1) {
    for (let tower = 0; tower < towerCount; tower += 1) {
      if (floor < towerFloorCounts[tower] - 1) trussCandidates.push(`${tower}:${floor}`)
    }
  }
  const selectedTrussSlots = new Map()
  const rockButtressCount = Math.min(familyRockButtressCount, trussCandidates.length)
  for (let index = 0; index < rockButtressCount; index += 1) {
    selectedTrussSlots.set(trussCandidates[index], {
      moduleKind: 'rock-buttress',
      braceMaterial: 'stone',
      beamMaterial: index === 0 ? 'ice' : 'stone',
      integral: false,
      weakPoint: index === 0,
    })
  }
  const strongholdTrussCandidates = trussCandidates.filter((slot) => !selectedTrussSlots.has(slot))
  const trussCount = Math.min(strongholdModules.trussCount, strongholdTrussCandidates.length)
  const actualStoneTrussCount = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
    ? trussCount
    : Math.min(trussCount, strongholdModules.stoneTrussCount)
  const stoneTrussStart = Math.max(0, trussCount - actualStoneTrussCount)
  for (let index = 0; index < trussCount; index += 1) {
    const material = index >= stoneTrussStart ? 'stone' : 'wood'
    selectedTrussSlots.set(strongholdTrussCandidates[index], {
      moduleKind: 'tri-truss',
      braceMaterial: material,
      beamMaterial: material,
      integral: true,
      weakPoint: false,
    })
  }

  function pickBlockType(reinforced = false) {
    const roll = rng.next()
    const remainingMandatoryStones = Math.max(0, mandatoryStoneReserve - forcedStoneCount)
    // Generic reinforced floors are optional. They may use only the headroom
    // left after all later authored masonry posts/beams have been reserved.
    if (reinforced && randomStoneCount < randomStoneLimit - remainingMandatoryStones) {
      reinforcedStoneCount += 1
      randomStoneCount += 1
      stoneCount += 1
      return 'stone'
    }
    if (roll < stoneChance && randomStoneCount < randomStoneLimit - remainingMandatoryStones) {
      randomStoneCount += 1
      stoneCount += 1
      return 'stone'
    }
    if (roll < stoneChance + iceChance) return 'ice'
    return 'wood'
  }

  function pickForcedStone() {
    if (randomStoneCount >= randomStoneLimit) {
      throw new RangeError(
        `authored masonry reserve exceeds the level stone budget (${randomStoneCount}/${randomStoneLimit}; ${structureFamily.id}; ${architectureBlueprint?.id || 'default'})`,
      )
    }
    reinforcedStoneCount += 1
    forcedStoneCount += 1
    randomStoneCount += 1
    stoneCount += 1
    return 'stone'
  }

  for (let tower = 0; tower < towerCount; tower += 1) {
    const baseX = FORTRESS_START_X + tower * towerSpacing
      + towerPlan.baseOffsets[tower] + rng.range(0, 28)
    towerBases.push(baseX)
    if (foundationHeight > 0) {
      const pierSpread = Math.round(35 * geometryScale)
      const pierWidth = Math.max(postWidth + 16, Math.round(beamWidth * 0.42))
      for (const side of [-1, 1]) {
        const royalWorldEdgeInset = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
          && tower === towerCount - 1 && side > 0 ? 10 : 0
        blocks.push(makeBlock(
          baseX + side * pierSpread - royalWorldEdgeInset,
          GROUND_Y - foundationHeight / 2,
          'stone',
          pierWidth,
          foundationHeight,
          'foundation-pier',
          {
            towerIndex: tower,
            floorIndex: -1,
            side: side < 0 ? 'left' : 'right',
            moduleKind: 'foundation-pier',
          },
        ))
        stoneCount += 1
      }
    }
    let previousFloorCenter = baseX
    const towerFloors = towerFloorCounts[tower]
    for (let floor = 0; floor < towerFloors; floor += 1) {
      // Every storey now meets face-to-face: posts sit on the ground/beam and
      // the beam sits exactly on the posts. The previous 52px stride embedded
      // each upper post 19px into the beam below, so the collision solver saw
      // an interlocked mass that could not collapse naturally.
      const profileFamily = (level + tower) % 4
      const direction = tower % 2 === 0 ? -1 : 1
      const centerShift = profileFamily === 1
        ? direction * (floor % 2 ? 4 : -1)
        : profileFamily === 2 ? direction * Math.min(6, floor * 1.5)
          : profileFamily === 3 && floor === floors - 1 ? direction * 4 : 0
      const blueprintStagger = finiteNumber(architectureBlueprint?.geometry?.stagger)
        * (((tower * 2 + floor + level) % 3) - 1)
      const floorCenter = baseX + centerShift
        + structureFamilyFloorShift(structureFamily, tower, towerCount, floor)
        + blueprintStagger
      const baseSpread = Math.round(35 * geometryScale)
      const familySpreadScale = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.rock
        ? Math.max(0.58, 1.06 - floor * 0.1)
        : structureFamily.id === STRUCTURE_FAMILY_RULES.ids.bridge
          ? (floor === 0 ? 1.1 : Math.max(0.86, 1 - floor * 0.025))
          : structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
            ? Math.max(0.9, 1.04 - floor * 0.025)
            : 1
      const floorSpread = Math.round(baseSpread * familySpreadScale * (
        profileFamily === 0 && floor === 0 ? 1.12
          : profileFamily === 2 ? Math.max(0.9, 1 - floor * 0.02)
            : 1
      ))
      const floorBeamWidth = Math.round(beamWidth * (
        profileFamily === 2 ? Math.max(0.91, 1 - floor * 0.02)
          : profileFamily === 3 && floor % 2 ? 1.08 : 1
      ))
      const postY = GROUND_Y - foundationHeight - postHeight / 2 - floor * floorStride
      const beamY = postY - postHeight / 2 - beamHeight / 2
      const reinforceLeft = floor < reinforcedFloors && (tower + floor + level) % 2 === 0
      const reinforceRight = floor < reinforcedFloors && !reinforceLeft
      const topPostOrdinal = tower * 2
      const isTowerRoof = floor === towerFloors - 1
      const forceNailedLeftPost = isTowerRoof
        && topPostOrdinal < authoredJointCounts.nail
      const forceNailedRightPost = isTowerRoof
        && topPostOrdinal + 1 < authoredJointCounts.nail
      const forceMasonryLeftPost = floor === 0
        && topPostOrdinal < forcedMasonryPostCount
      const forceMasonryRightPost = floor === 0
        && topPostOrdinal + 1 < forcedMasonryPostCount
      const forceMasonryBeam = floor === 0 && tower < forcedMasonryBeamCount
      const trussProfile = selectedTrussSlots.get(`${tower}:${floor}`)
      if (trussProfile) {
        const moduleId = `${trussProfile.moduleKind}:${mode}:${level}:tower-${tower}:floor-${floor}`
        const bottomSpread = Math.min(9, Math.max(7, postWidth * 0.28))
        for (const side of [-1, 1]) {
          const topX = floorCenter + side * floorSpread
          const bottomX = previousFloorCenter + side * bottomSpread
          const horizontalDelta = topX - bottomX
          const rotation = Math.atan2(horizontalDelta, postHeight) * 180 / Math.PI
          const braceWidth = Math.max(16, Math.round(postWidth * 0.66))
          const rotationRadians = rotation * Math.PI / 180
          // Keep the rotated rectangle face-aligned with the storey above and
          // below. Using the centre-line length would make its outer corners
          // penetrate both beams and explosively eject the whole tower.
          const braceLength = (
            postHeight - braceWidth * Math.abs(Math.sin(rotationRadians))
          ) / Math.max(0.25, Math.abs(Math.cos(rotationRadians)))
          blocks.push(makeBlock(
            (topX + bottomX) / 2,
            postY,
            trussProfile.braceMaterial,
            braceWidth,
            braceLength,
            trussProfile.moduleKind === 'rock-buttress' ? 'rock-buttress' : 'truss-brace',
            {
              rotation,
              structuralRestRotation: rotation,
              towerIndex: tower,
              floorIndex: floor,
              side: side < 0 ? 'left' : 'right',
              moduleId,
              moduleKind: trussProfile.moduleKind,
              modulePart: side < 0 ? 'left-brace' : 'right-brace',
              integralJoint: trussProfile.integral,
              familyId: structureFamily.id,
            },
          ))
        }
        blocks.push(makeBlock(
          floorCenter,
          beamY,
          trussProfile.beamMaterial,
          floorBeamWidth,
          beamHeight,
          trussProfile.weakPoint ? 'keystone' : 'lintel',
          {
            towerIndex: tower,
            floorIndex: floor,
            moduleId,
            moduleKind: trussProfile.moduleKind,
            modulePart: 'top-beam',
            integralJoint: trussProfile.integral,
            weakPoint: trussProfile.weakPoint,
            critical: trussProfile.weakPoint,
            durabilityScale: trussProfile.weakPoint ? 0.72 : undefined,
            familyId: structureFamily.id,
          },
        ))
        stoneCount += Number(trussProfile.braceMaterial === 'stone') * 2
          + Number(trussProfile.beamMaterial === 'stone')
      } else {
        const forceRoyalCoreStone = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
          && !isTowerRoof
        blocks.push(makeBlock(
          floorCenter - floorSpread, postY,
          forceNailedLeftPost ? 'wood'
            : forceRoyalCoreStone || forceMasonryLeftPost ? pickForcedStone()
              : pickBlockType(reinforceLeft),
          postWidth, postHeight, 'post', {
            towerIndex: tower,
            floorIndex: floor,
            side: 'left',
            structuralBearingAllowance: strongholdBearingAllowance,
            familyId: structureFamily.id,
            familyPart: isTowerRoof ? 'gallery' : 'core',
          },
        ))
        blocks.push(makeBlock(
          floorCenter + floorSpread, postY,
          forceNailedRightPost ? 'wood'
            : forceRoyalCoreStone || forceMasonryRightPost ? pickForcedStone()
              : pickBlockType(reinforceRight),
          postWidth, postHeight, 'post', {
            towerIndex: tower,
            floorIndex: floor,
            side: 'right',
            structuralBearingAllowance: strongholdBearingAllowance,
            familyId: structureFamily.id,
            familyPart: isTowerRoof ? 'gallery' : 'core',
          },
        ))
        blocks.push(makeBlock(
          floorCenter,
          beamY,
          isTowerRoof ? 'wood'
            : forceRoyalCoreStone || forceMasonryBeam ? pickForcedStone()
              : pickBlockType(),
          floorBeamWidth,
          beamHeight,
          isTowerRoof ? 'roof' : 'lintel',
          {
            towerIndex: tower,
            floorIndex: floor,
            familyId: structureFamily.id,
            familyPart: isTowerRoof ? 'gallery' : 'core',
          },
        ))
      }

      if (floor === 0 && strongholdTier === 0) {
        groundTargets.push(makeTarget(
          baseX - 92,
          GROUND_Y - 18,
          16,
          false,
          'normal',
          { role: 'ground-guard', towerIndex: tower },
        ))
      }
      if (rng.next() < 0.4 + level * 0.02) {
        const targetSize = 14
        const targetRadius = targetSize * 0.78
        elevatedTargets.push(makeTarget(
          floorCenter + rng.range(-20, 20),
          beamY - beamHeight / 2 - targetRadius,
          targetSize,
        ))
      }
      goldenEggCandidates.push({ x: floorCenter, y: beamY - beamHeight / 2 - 14 })
      const targetSize = 14
      const targetRadius = targetSize * 0.78
      // Intermediate floors have a safe gap between their two upper posts;
      // the exposed roof has room for two guards. Keeping deterministic
      // fallback perches on every storey guarantees the authored target count
      // even for a seed that rolls no optional elevated guards.
      const fallbackOffsets = isTowerRoof ? [-20, 20] : [0]
      for (const offsetX of fallbackOffsets) {
        fallbackPerchTargets.push(makeTarget(
          floorCenter + offsetX,
          beamY - beamHeight / 2 - targetRadius,
          targetSize,
        ))
      }
      previousFloorCenter = floorCenter
    }
  }

  const towerGaps = towerBases.slice(0, -1).map((leftBase, index) => {
    const rightBase = towerBases[index + 1]
    return {
      index,
      leftBase,
      rightBase,
      centerX: (leftBase + rightBase) / 2,
      clearWidth: rightBase - leftBase - 96,
    }
  })
  const facingGapInterval = (gap, { top = -Infinity, bottom = Infinity } = {}) => {
    const verticalOverlap = (bounds) => (
      bounds.bottom > top + 1e-6 && bounds.top < bottom - 1e-6
    )
    const leftBounds = blocks
      .filter((block) => block.towerIndex === gap.index)
      .map((block) => rotatedRectBounds(block))
      .filter(verticalOverlap)
    const rightBounds = blocks
      .filter((block) => block.towerIndex === gap.index + 1)
      .map((block) => rotatedRectBounds(block))
      .filter(verticalOverlap)
    const leftEdge = leftBounds.length
      ? Math.max(...leftBounds.map((bounds) => bounds.right))
      : gap.leftBase + 48
    const rightEdge = rightBounds.length
      ? Math.min(...rightBounds.map((bounds) => bounds.left))
      : gap.rightBase - 48
    return {
      leftEdge,
      rightEdge,
      centerX: (leftEdge + rightEdge) / 2,
      width: Math.max(0, rightEdge - leftEdge),
    }
  }
  const arenaBossVariant = mode === 'main' && level === MAIN_LEVELS ? 'king' : 'general'
  const arenaBossSize = isBossLevel
    ? bossProfileForEncounter(mode, level, arenaBossVariant).size
    : 38
  const minimumBossCourtyardWidth = Math.max(
    2 * (arenaBossSize * 0.78 + 3),
    finiteNumber(environmentTheme?.architecture?.bossArena?.minimumClearance),
  )
  const rearTowerGaps = towerGaps.slice(Math.floor(towerGaps.length / 2))
  const rearBossCourtyards = rearTowerGaps
    .filter((gap) => gap.clearWidth >= minimumBossCourtyardWidth)
  const bossCourtyard = isBossLevel && towerGaps.length
    ? rearBossCourtyards.at(-1)
      ?? rearTowerGaps.at(-1)
    : null

  if (bossCourtyard) {
    // Floor beams used to overhang the tower posts by seven pixels per side.
    // Their lower corners clipped a ground boss even when the visible doorway
    // between posts was wide enough. Trim only the two court-facing lintels;
    // the 92px span still rests broadly on both posts and reads as an authored
    // gate instead of an accidental collision pocket.
    for (const towerIndex of [bossCourtyard.index, bossCourtyard.index + 1]) {
      const beam = blocks.find((block) => block.towerIndex === towerIndex
        && block.floorIndex === 0
        && (block.role === 'lintel' || block.role === 'roof'))
      if (!beam) continue
      beam.width = Math.max(92, Math.round(beamWidth * 0.82))
      const refreshed = calculateStructureComponentStats(beam)
      beam.mass = refreshed.mass
      beam.hp = refreshed.hp
    }
    const leftCourtPost = blocks.find((block) => block.towerIndex === bossCourtyard.index
      && block.floorIndex === 0 && block.role === 'post' && block.side === 'right')
    const rightCourtPost = blocks.find((block) => block.towerIndex === bossCourtyard.index + 1
      && block.floorIndex === 0 && block.role === 'post' && block.side === 'left')
    if (leftCourtPost) leftCourtPost.x -= 8
    if (rightCourtPost) rightCourtPost.x += 8
    const leftCourtPier = blocks.find((block) => block.towerIndex === bossCourtyard.index
      && block.role === 'foundation-pier' && block.side === 'right')
    const rightCourtPier = blocks.find((block) => block.towerIndex === bossCourtyard.index + 1
      && block.role === 'foundation-pier' && block.side === 'left')
    if (leftCourtPier) leftCourtPier.x -= 10
    if (rightCourtPier) rightCourtPier.x += 10

    // Asymmetric families shift individual floors away from their tower base,
    // so the base-to-base estimate can still leave a doorway a pixel too
    // narrow for the padded runtime boss collider. Measure the actual facing
    // post/pier edges and open only the remaining deficit. This keeps the boss
    // inside the authored fortress instead of letting the safe-spawn solver
    // eject it behind the final wall.
    const leftCourtParts = [leftCourtPost, leftCourtPier].filter(Boolean)
    const rightCourtParts = [rightCourtPost, rightCourtPier].filter(Boolean)
    if (leftCourtParts.length && rightCourtParts.length) {
      const actualLeftEdge = Math.max(...leftCourtParts.map((block) => block.x + block.width / 2))
      const actualRightEdge = Math.min(...rightCourtParts.map((block) => block.x - block.width / 2))
      const desiredClearWidth = minimumBossCourtyardWidth + 4
      const extraPerSide = Math.max(0, desiredClearWidth - (actualRightEdge - actualLeftEdge)) / 2
      for (const part of leftCourtParts) part.x -= extraPerSide
      for (const part of rightCourtParts) part.x += extraPerSide
      bossCourtyard.clearWidth = actualRightEdge - actualLeftEdge + extraPerSide * 2
    }
  }

  // The outer barbican is authored around one central great arch. The generic
  // asymmetric beam overhang left that middle opening half a pixel below the
  // gate selector threshold, so the whole gatehouse jumped to the far-left
  // bay. Trim only the two centre-facing floor beams; they retain broad post
  // bearing while the physical portcullis now matches the silhouette contract.
  if (royalGateReserved
    && architectureBlueprint?.buildingPlan?.formId === 'outer-castle-gate') {
    const centralGap = towerGaps.find((gap) => gap.index === 1)
    if (centralGap) {
      const floorOneBeam = (towerIndex) => blocks.find((block) => (
        block.towerIndex === towerIndex
        && block.floorIndex === 1
        && ['lintel', 'roof', 'keystone'].includes(block.role)
      ))
      const leftBeam = floorOneBeam(centralGap.index)
      const rightBeam = floorOneBeam(centralGap.index + 1)
      if (leftBeam && rightBeam) {
        const bandHeight = Math.min(leftBeam.height, rightBeam.height)
        const bandY = (leftBeam.y + rightBeam.y) / 2
        const interval = facingGapInterval(centralGap, {
          top: bandY - bandHeight / 2,
          bottom: GROUND_Y,
        })
        const desiredOpening = 68
        const trim = Math.max(0, desiredOpening - interval.width)
        const centreFacingBeams = blocks.filter((block) => (
          [centralGap.index, centralGap.index + 1].includes(block.towerIndex)
          && block.floorIndex <= 1
          && ['lintel', 'roof', 'keystone'].includes(block.role)
        ))
        for (const beam of centreFacingBeams) {
          beam.width = Math.max(96, beam.width - trim)
          const refreshed = calculateStructureComponentStats(beam)
          beam.mass = refreshed.mass
          beam.hp = refreshed.hp
        }
      }
    }
  }

  const royalGateGap = royalGateReserved
    ? towerGaps
      .filter((gap) => gap !== bossCourtyard)
      .map((gap) => {
        const horizontalAtGate = (towerIndex) => blocks.filter((block) => (
          block.towerIndex === towerIndex
          && block.floorIndex <= 1
          && ['lintel', 'roof', 'keystone'].includes(block.role)
        ))
        const leftMembers = horizontalAtGate(gap.index)
        const rightMembers = horizontalAtGate(gap.index + 1)
        const leftFloorOne = leftMembers.find((block) => block.floorIndex === 1)
          || leftMembers.at(-1)
        const rightFloorOne = rightMembers.find((block) => block.floorIndex === 1)
          || rightMembers.at(-1)
        if (!leftFloorOne || !rightFloorOne) return { gap, openingWidth: 0 }
        const gateBeamHeight = Math.min(leftFloorOne.height, rightFloorOne.height)
        const gateBeamY = (leftFloorOne.y + rightFloorOne.y) / 2
        return {
          gap,
          openingWidth: facingGapInterval(gap, {
            top: gateBeamY - gateBeamHeight / 2,
            bottom: GROUND_Y,
          }).width,
        }
      })
      .sort((first, second) => (
        Number(second.openingWidth > 42) - Number(first.openingWidth > 42)
        || Math.abs(first.gap.index - 1) - Math.abs(second.gap.index - 1)
        || second.openingWidth - first.openingWidth
      ))[0]?.gap || null
    : null

  if (familyBridgeSpanCount > 0 && towerGaps.length) {
    const availableBridgeGaps = towerGaps.filter((gap) => (
      gap !== bossCourtyard
      && towerFloorCounts[gap.index] === towerFloorCounts[gap.index + 1]
    ))
    if (structureFamily.mirrored) availableBridgeGaps.reverse()
    for (const gap of availableBridgeGaps.slice(0, familyBridgeSpanCount)) {
      const commonFloor = Math.min(
        towerFloorCounts[gap.index],
        towerFloorCounts[gap.index + 1],
      ) - 1
      const leftBeam = blocks.find((block) => block.towerIndex === gap.index
        && block.floorIndex === commonFloor
        && ['lintel', 'roof', 'keystone'].includes(block.role))
      const rightBeam = blocks.find((block) => block.towerIndex === gap.index + 1
        && block.floorIndex === commonFloor
        && ['lintel', 'roof', 'keystone'].includes(block.role))
      if (!leftBeam || !rightBeam) continue
      const leftX = leftBeam.x
      const rightX = rightBeam.x
      const spanHeight = 14 + structureFamily.complexity * 2
      const supportTop = Math.min(
        leftBeam.y - leftBeam.height / 2,
        rightBeam.y - rightBeam.height / 2,
      )
      const span = makeBlock(
        (leftX + rightX) / 2,
        supportTop - spanHeight / 2,
        'wood',
        rightX - leftX,
        spanHeight,
        'bridge-span',
        {
          moduleKind: 'asymmetric-bridge',
          moduleId: `structure-family:${mode}:${level}:bridge-${gap.index}`,
          familyId: structureFamily.id,
          familyPart: 'weak-span',
          gapIndex: gap.index,
          supportTowers: [gap.index, gap.index + 1],
          weakPoint: true,
          critical: true,
          durabilityScale: 0.72,
          massScale: 0.9,
        },
      )
      blocks.push(span)
      const perchRadius = 14 * 0.78
      for (const ratio of [0.3, 0.7]) {
        fallbackPerchTargets.push(makeTarget(
          leftX + (rightX - leftX) * ratio,
          span.y - span.height / 2 - perchRadius,
          14,
          false,
          'normal',
          { role: 'bridge-guard', spawnClass: 'perch' },
        ))
      }
      goldenEggCandidates.push({ x: span.x, y: span.y - span.height / 2 - 14 })
    }
  }

  if (strongholdTier > 0 && towerGaps.length) {
    const connectorGaps = towerGaps
      .filter((gap) => gap !== bossCourtyard && gap !== royalGateGap)
      .slice(0, actualStrongholdConnectorCount)
    for (const gap of connectorGaps) {
      // Use the actual facing edges of posts and foundation piers. The old
      // base-distance estimate pushed curtain panels 6–20px into adjacent
      // masonry on asymmetric castle blueprints, which looked sturdy but
      // started the solver in an invalid compressed state.
      const wallInterval = facingGapInterval(gap, {
        top: GROUND_Y - postHeight,
        bottom: GROUND_Y,
      })
      const wallWidth = Math.max(0, wallInterval.width - 4)
      if (wallWidth < 28) continue
      const capY = GROUND_Y - postHeight - 8
      const capInterval = facingGapInterval(gap, {
        top: capY - 8,
        bottom: capY + 8,
      })
      const capWidth = Math.min(
        Math.max(24, gap.rightBase - gap.leftBase - beamWidth - 4),
        Math.max(0, capInterval.width - 4),
      )
      if (capWidth < 24) continue
      blocks.push(makeBlock(
        wallInterval.centerX,
        GROUND_Y - postHeight / 2,
        'stone',
        wallWidth,
        postHeight,
        'wall-panel',
        { moduleKind: 'wall-panel', gapIndex: gap.index },
      ))
      stoneCount += 1
      blocks.push(makeBlock(
        capInterval.centerX,
        capY,
        'wood',
        capWidth,
        16,
        'gate-cap',
        { moduleKind: 'wall-panel-cap', gapIndex: gap.index },
      ))
      const guardRadius = 14 * 0.78
      elevatedTargets.push(makeTarget(
        capInterval.centerX,
        GROUND_Y - postHeight - 16 - guardRadius,
        14,
      ))
    }

    if (strongholdTier >= 3) {
      const bridgeSpans = blocks.filter((block) => (
        block.moduleKind === 'asymmetric-bridge'
      ))
      for (let tower = 0; tower < towerBases.length; tower += 1) {
        const roof = blocks.find((block) => block.towerIndex === tower
          && block.floorIndex === towerFloorCounts[tower] - 1
          && block.role === 'roof')
        if (!roof) continue
        const bridgeOnLeft = bridgeSpans.some((span) => span.supportTowers?.[1] === tower)
        const bridgeOnRight = bridgeSpans.some((span) => span.supportTowers?.[0] === tower)
        // A tower caught between two spans already has a busy crown. For an
        // end tower, place its merlon on the outside face so it cannot start
        // embedded in the bridge deck.
        if (bridgeOnLeft && bridgeOnRight) continue
        const battlementDirection = bridgeOnLeft ? 1
          : bridgeOnRight ? -1
            : tower % 2 === 0 ? 1 : -1
        const battlementOffsets = structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal
          ? [-34, 34]
          : [battlementDirection * 40]
        for (const offset of battlementOffsets) {
          blocks.push(makeBlock(
            roof.x + offset,
            roof.y - roof.height / 2 - 9,
            'stone',
            18,
            18,
            'battlement',
            {
              towerIndex: tower,
              familyId: structureFamily.id,
              familyPart: 'battlement',
            },
          ))
          stoneCount += 1
        }
      }
    }

    if (longBeamCount > 0 && towerBases.length >= 3) {
      const longBeamHeight = 24 + strongholdTier * 2
      const spanCandidates = towerGaps
        .filter((gap) => gap !== bossCourtyard
          && towerFloorCounts[gap.index] === towerFloorCounts[gap.index + 1])
        .map((gap) => {
          const leftTower = gap.index
          const rightTower = gap.index + 1
          const roofFloor = towerFloorCounts[leftTower] - 1
          const leftRoof = blocks.find((block) => block.towerIndex === leftTower
            && block.floorIndex === roofFloor && block.role === 'roof')
          const rightRoof = blocks.find((block) => block.towerIndex === rightTower
            && block.floorIndex === roofFloor && block.role === 'roof')
          if (!leftRoof || !rightRoof) return null
          return {
            leftTower,
            rightTower,
            leftX: leftRoof.x - leftRoof.width * 0.36,
            rightX: rightRoof.x + rightRoof.width * 0.36,
            supportTop: Math.min(
              leftRoof.y - leftRoof.height / 2,
              rightRoof.y - rightRoof.height / 2,
            ),
          }
        })
        .filter(Boolean)
      for (const span of spanCandidates.slice(0, longBeamCount)) {
        const { leftTower, rightTower, leftX, rightX, supportTop } = span
        const carrierSupportTop = supportTop - (strongholdTier >= 3 ? 18 : 0)
        const carrier = makeBlock(
          (leftX + rightX) / 2,
          carrierSupportTop - longBeamHeight / 2,
          strongholdTier >= 3 ? 'stone' : 'wood',
          rightX - leftX,
          longBeamHeight,
          'long-beam',
          {
            moduleKind: 'long-beam',
            moduleId: `stronghold:${mode}:${level}:carrier-${leftTower}-${rightTower}`,
            supportTowers: [leftTower, rightTower],
          },
        )
        blocks.push(carrier)
        if (carrier.type === 'stone') stoneCount += 1
        const perchRadius = 14 * 0.78
        for (const ratio of [0.28, 0.72]) {
          fallbackPerchTargets.push(makeTarget(
            leftX + (rightX - leftX) * ratio,
            carrier.y - carrier.height / 2 - perchRadius,
            14,
            false,
            'normal',
            { role: 'carrier-guard', spawnClass: 'perch' },
          ))
        }
        goldenEggCandidates.push({
          x: carrier.x,
          y: carrier.y - carrier.height / 2 - 14,
        })
      }
    }
  }

  let familySilhouetteModuleCount = 0
  if (structureFamily.id === STRUCTURE_FAMILY_RULES.ids.rock
    && structureFamily.complexity >= 2) {
    // A real A-frame crown replaces the old visual of "another vertical
    // stack". The two stone rafters rest on the tallest tower roof, leave a
    // small apex gap, and are locked by one readable keystone.
    const crownTowerIndex = towerFloorCounts.indexOf(Math.max(...towerFloorCounts))
    const crownRoof = blocks.find((block) => block.towerIndex === crownTowerIndex
      && block.floorIndex === towerFloorCounts[crownTowerIndex] - 1
      && block.role === 'roof')
    if (crownRoof) {
      crownRoof.width = Math.max(crownRoof.width, Math.round(170 * geometryScale))
      const refreshedRoof = calculateStructureComponentStats(crownRoof)
      crownRoof.mass = refreshedRoof.mass
      crownRoof.hp = refreshedRoof.hp
      crownRoof.maxHp = refreshedRoof.hp
      const slopeWidth = Math.round(142 * geometryScale)
      const slopeHeight = Math.round(19 * geometryScale)
      const slopeAngle = 52
      const radians = slopeAngle * Math.PI / 180
      const rotatedHeight = slopeWidth * Math.sin(radians) + slopeHeight * Math.cos(radians)
      // A slightly wider centre pitch keeps the two rotated bodies tangent
      // instead of starting with a hidden 1–3px SAT penetration at the apex.
      const slopeOffset = Math.round(52 * geometryScale)
      const slopeY = crownRoof.y - crownRoof.height / 2 - rotatedHeight / 2
      for (const side of [-1, 1]) {
        blocks.push(makeBlock(
          crownRoof.x + side * slopeOffset,
          slopeY,
          'stone',
          slopeWidth,
          slopeHeight,
          'a-frame-rafter',
          {
            rotation: side < 0 ? -slopeAngle : slopeAngle,
            structuralRestRotation: side < 0 ? -slopeAngle : slopeAngle,
            towerIndex: crownTowerIndex,
            familyId: structureFamily.id,
            familyPart: 'a-frame-crown',
            moduleKind: 'a-frame-crown',
            moduleId: `structure-family:${mode}:${level}:a-frame-crown`,
            durabilityScale: 1.35,
            massScale: 1.2,
          },
        ))
      }
      const apexTop = slopeY - rotatedHeight / 2
      blocks.push(makeBlock(
        crownRoof.x,
        apexTop - 10,
        'stone',
        32,
        20,
        'a-frame-keystone',
        {
          towerIndex: crownTowerIndex,
          familyId: structureFamily.id,
          familyPart: 'a-frame-crown',
          moduleKind: 'a-frame-crown',
          moduleId: `structure-family:${mode}:${level}:a-frame-crown`,
          weakPoint: true,
          critical: true,
          durabilityScale: 0.82,
        },
      ))
      stoneCount += 3
      familySilhouetteModuleCount += 3
    }

    if (structureFamily.complexity >= 3) {
      const desiredButtressWidth = Math.round(150 * geometryScale)
      const buttressHeight = Math.round(20 * geometryScale)
      const buttressAngle = 56
      const radians = buttressAngle * Math.PI / 180
      const desiredBoundsHeight = desiredButtressWidth * Math.sin(radians)
        + buttressHeight * Math.cos(radians)
      const buttressGaps = towerGaps
        .filter((gap) => gap !== bossCourtyard)
        .slice(0, 2)
      let placedButtresses = 0
      for (const [index, gap] of buttressGaps.entries()) {
        const supportingCap = blocks.find((block) => (
          block.gapIndex === gap.index && block.moduleKind === 'wall-panel-cap'
        ))
        const supportSurfaceY = supportingCap
          ? rotatedRectBounds(supportingCap).top
          : GROUND_Y
        const interval = facingGapInterval(gap, {
          top: supportSurfaceY - desiredBoundsHeight,
          bottom: supportSurfaceY,
        })
        const maximumButtressWidth = (
          Math.max(0, interval.width - 4) - buttressHeight * Math.sin(radians)
        ) / Math.cos(radians)
        const buttressWidth = Math.min(desiredButtressWidth, maximumButtressWidth)
        if (buttressWidth < 96) continue
        const boundsHeight = buttressWidth * Math.sin(radians)
          + buttressHeight * Math.cos(radians)
        const rotation = index % 2 === 0 ? -buttressAngle : buttressAngle
        blocks.push(makeBlock(
          interval.centerX,
          supportSurfaceY - boundsHeight / 2,
          'stone',
          buttressWidth,
          buttressHeight,
          'outer-rock-buttress',
          {
            rotation,
            structuralRestRotation: rotation,
            gapIndex: gap.index,
            supportTowers: [gap.index, gap.index + 1],
            familyId: structureFamily.id,
            familyPart: 'inner-buttress',
            moduleKind: 'rock-silhouette-buttress',
            moduleId: `structure-family:${mode}:${level}:inner-buttress-${gap.index}`,
            durabilityScale: 1.45,
            massScale: 1.22,
          },
        ))
        placedButtresses += 1
      }
      stoneCount += placedButtresses
      familySilhouetteModuleCount += placedButtresses
    }
  }

  if (structureFamily.id === STRUCTURE_FAMILY_RULES.ids.royal) {
    // Fill selected side gaps into a two-course curtain wall. The remaining
    // central gap becomes a proper stone gatehouse, so late levels read as one
    // citadel instead of four unrelated material-swapped towers.
    const lowerCurtains = blocks.filter((block) => (
      block.role === 'wall-panel' && block.moduleKind === 'wall-panel'
    ))
    for (const lower of lowerCurtains) {
      const lowerCap = blocks.find((block) => (
        block.role === 'gate-cap' && block.gapIndex === lower.gapIndex
        && block.moduleKind === 'wall-panel-cap'
      ))
      if (!lowerCap) continue
      const upperHeight = postHeight
      const upperY = lowerCap.y - lowerCap.height / 2 - upperHeight / 2
      const upperTop = upperY - upperHeight / 2
      const upperBottom = upperY + upperHeight / 2
      const upperInterval = facingGapInterval(
        towerGaps[lower.gapIndex],
        { top: upperTop, bottom: upperBottom },
      )
      const upperWidth = Math.min(
        Math.round(lower.width * 0.94),
        Math.max(0, upperInterval.width - 4),
      )
      if (upperWidth < 24) continue
      const upperX = upperInterval.centerX
      blocks.push(makeBlock(
        upperX,
        upperY,
        'stone',
        upperWidth,
        upperHeight,
        'wall-panel',
        {
          gapIndex: lower.gapIndex,
          familyId: structureFamily.id,
          familyPart: 'upper-curtain',
          moduleKind: 'royal-upper-curtain',
          moduleId: `structure-family:${mode}:${level}:upper-curtain-${lower.gapIndex}`,
        },
      ))
      const capY = upperY - upperHeight / 2 - 8
      const capInterval = facingGapInterval(
        towerGaps[lower.gapIndex],
        { top: capY - 8, bottom: capY + 8 },
      )
      const capWidth = Math.min(upperWidth + 8, Math.max(0, capInterval.width - 4))
      const capX = clamp(
        upperX,
        capInterval.leftEdge + capWidth / 2 + 2,
        capInterval.rightEdge - capWidth / 2 - 2,
      )
      blocks.push(makeBlock(
        capX,
        capY,
        'stone',
        capWidth,
        16,
        'gate-cap',
        {
          gapIndex: lower.gapIndex,
          familyId: structureFamily.id,
          familyPart: 'upper-curtain',
          moduleKind: 'royal-upper-curtain-cap',
          moduleId: `structure-family:${mode}:${level}:upper-curtain-${lower.gapIndex}`,
        },
      ))
      stoneCount += 2
      familySilhouetteModuleCount += 2
    }

    if (royalGateGap) {
      const horizontalAtGate = (towerIndex) => blocks.filter((block) => (
        block.towerIndex === towerIndex
        && block.floorIndex <= 1
        && ['lintel', 'roof', 'keystone'].includes(block.role)
      ))
      const leftMembers = horizontalAtGate(royalGateGap.index)
      const rightMembers = horizontalAtGate(royalGateGap.index + 1)
      const leftFloorOne = leftMembers.find((block) => block.floorIndex === 1) || leftMembers.at(-1)
      const rightFloorOne = rightMembers.find((block) => block.floorIndex === 1) || rightMembers.at(-1)
      if (leftFloorOne && rightFloorOne) {
        const gateBeamHeight = Math.min(leftFloorOne.height, rightFloorOne.height)
        const gateBeamY = (leftFloorOne.y + rightFloorOne.y) / 2
        const gateInterval = facingGapInterval(royalGateGap, {
          top: gateBeamY - gateBeamHeight / 2,
          bottom: GROUND_Y,
        })
        const { leftEdge, rightEdge } = gateInterval
        const gateWidth = gateInterval.width
        if (gateWidth > 42) {
          const gateBeam = makeBlock(
          (leftEdge + rightEdge) / 2,
          gateBeamY,
          'stone',
          gateWidth,
          gateBeamHeight,
          'citadel-gate-beam',
          {
            gapIndex: royalGateGap.index,
            familyId: structureFamily.id,
            familyPart: 'royal-gatehouse',
            moduleKind: 'royal-gatehouse',
            moduleId: `structure-family:${mode}:${level}:royal-gatehouse`,
            durabilityScale: 1.55,
            massScale: 1.2,
          },
        )
        const columnWidth = Math.min(18, Math.max(12, Math.round(gateWidth * 0.16)))
        const columnTop = gateBeam.y + gateBeam.height / 2
        const columnHeight = GROUND_Y - columnTop
        for (const x of [leftEdge + columnWidth / 2, rightEdge - columnWidth / 2]) {
          blocks.push(makeBlock(
            x,
            columnTop + columnHeight / 2,
            'stone',
            columnWidth,
            columnHeight,
            'citadel-gate-column',
            {
              gapIndex: royalGateGap.index,
              familyId: structureFamily.id,
              familyPart: 'royal-gatehouse',
              moduleKind: 'royal-gatehouse',
              moduleId: `structure-family:${mode}:${level}:royal-gatehouse`,
            },
          ))
        }
        blocks.push(gateBeam)
        blocks.push(makeBlock(
          gateBeam.x,
          gateBeam.y - gateBeam.height / 2 - 11,
          'stone',
          30,
          22,
          'citadel-keystone',
          {
            gapIndex: royalGateGap.index,
            familyId: structureFamily.id,
            familyPart: 'royal-gatehouse',
            moduleKind: 'royal-gatehouse',
            moduleId: `structure-family:${mode}:${level}:royal-gatehouse`,
            weakPoint: true,
            critical: true,
            durabilityScale: 0.8,
          },
        ))
        stoneCount += 4
        familySilhouetteModuleCount += 4
        const perchRadius = 14 * 0.78
        fallbackPerchTargets.push(makeTarget(
          gateBeam.x,
          gateBeam.y - gateBeam.height / 2 - perchRadius,
          14,
          false,
          'normal',
          { role: 'citadel-gate-guard', spawnClass: 'perch' },
        ))
        goldenEggCandidates.push({
          x: gateBeam.x,
          y: gateBeam.y - gateBeam.height / 2 - 14,
        })
        }
      }
    }
  }

  const completeBuildingStats = applyCompleteBuildingPlan(blocks, architectureBlueprint, {
    mode,
    level,
    strongholdTier,
    familyId: structureFamily.id,
    reservedSlots: architectureBlueprint?.landmark ? 1 : 0,
    bossCourtyardIndex: bossCourtyard?.index,
    bossCourtyard,
    minimumBossOverheadClearance: arenaBossSize * 0.78 * 2 + 16,
  })
  const endlessCompoundStats = applyEndlessCompoundPressure(blocks, architectureBlueprint, {
    mode,
    level,
    pressure: endlessPressure,
    reservedSlots: architectureBlueprint?.landmark ? 1 : 0,
  })
  const usesExplicitPhysicalLayout = completeBuildingStats.physicalLayout === true
  if (usesExplicitPhysicalLayout) {
    // The normalized physical plan replaces the legacy towers wholesale, so
    // their already-authored guards and perches must be replaced wholesale as
    // well. Merely collision-filtering those stale points leaves many of them
    // visibly suspended in empty space where an old beam used to be.
    groundTargets.length = 0
    elevatedTargets.length = 0
    fallbackPerchTargets.length = 0
  }
  if (Array.isArray(completeBuildingStats.targetPerches)) {
    fallbackPerchTargets.push(...completeBuildingStats.targetPerches)
    goldenEggCandidates.push(...completeBuildingStats.targetPerches.map((target) => ({
      x: target.x,
      y: target.y,
    })))
  }
  stoneCount += completeBuildingStats.stoneCount + endlessCompoundStats.stoneCount
  let architectureConstructionCount = completeBuildingStats.constructionCount
    + applyArchitectureConstructionPalette(blocks, architectureBlueprint)
  let architectureLandmarkAdded = false
  if (architectureBlueprint?.landmark
    && blocks.length < STRONGHOLD_RULES.maximumPhysicalBlocks) {
    const landmark = architectureBlueprint.landmark
    const roofs = blocks
      .filter((block) => block.role === 'roof')
      .sort((first, second) => (
        rotatedRectBounds(first).top - rotatedRectBounds(second).top
        || (first.towerIndex ?? 0) - (second.towerIndex ?? 0)
      ))
    for (const roof of roofs) {
      const width = Math.max(10, Math.min(landmark.width, roof.width - 8))
      const height = Math.max(10, landmark.height)
      const maximumOffset = Math.max(0, roof.width / 2 - width / 2 - 4)
      const authoredOffset = clamp(landmark.offset || 0, -maximumOffset, maximumOffset)
      const offsets = [...new Set([
        authoredOffset,
        0,
        -maximumOffset,
        maximumOffset,
        -maximumOffset * 0.5,
        maximumOffset * 0.5,
      ])]
      let selected = null
      for (const offset of offsets) {
        const candidate = {
          x: roof.x + offset,
          y: rotatedRectBounds(roof).top - height / 2,
          width,
          height,
          rotation: 0,
        }
        if (blocks.every((other) => other === roof || !rectsOverlap(candidate, other))) {
          selected = candidate
          break
        }
      }
      if (!selected) continue
      const construction = landmark.constructionId
        ? CONSTRUCTION_MATERIALS[landmark.constructionId]
        : null
      const landmarkType = construction?.allowedBaseMaterials.includes(roof.type)
        ? roof.type
        : construction?.allowedBaseMaterials[0] || roof.type
      const landmarkBlock = makeBlock(
        selected.x,
        selected.y,
        landmarkType,
        selected.width,
        selected.height,
        'blueprint-landmark',
        {
          towerIndex: roof.towerIndex,
          floorIndex: (roof.floorIndex ?? 0) + 1,
          moduleKind: 'architecture-landmark',
          moduleId: `architecture-blueprint:${mode}:${level}:${architectureBlueprint.id}`,
          landmarkKind: landmark.kind,
          architectureBlueprintId: architectureBlueprint.id,
          architectureBlueprintName: architectureBlueprint.name,
          architectureMotif: architectureBlueprint.motif,
          completeBuildingMassId: roof.completeBuildingMassId,
          completeBuildingMassKind: roof.completeBuildingMassKind,
          completeBuildingXRatio: roof.completeBuildingXRatio,
          structuralBearingAllowance: 6,
        },
      )
      applyCompleteBuildingBlockIdentity(
        landmarkBlock,
        architectureBlueprint,
        completeBuildingStats.complexity,
      )
      if (landmark.constructionId
        && applyConstructionMaterial(landmarkBlock, landmark.constructionId)) {
        architectureConstructionCount += 1
      }
      blocks.push(landmarkBlock)
      stoneCount += Number(landmarkBlock.type === 'stone')
      architectureLandmarkAdded = true
      break
    }
  }

  if (usesExplicitPhysicalLayout && bossCourtyard) {
    const bossRadius = arenaBossSize * 0.78
    const paddedBossRadius = bossRadius + 3
    const bossCourtIsClear = (x, surfaceY) => blocks.every((block) => {
      const manifold = circleRectCollisionManifold({
        x,
        y: surfaceY - paddedBossRadius,
        radius: paddedBossRadius,
      }, block)
      return !manifold || manifold.overlap <= 1e-6
    })
    if (!bossCourtIsClear(bossCourtyard.centerX, bossCourtyard.surfaceY ?? GROUND_Y)) {
      // Landmarks are attached after the normalized shell is built. If one
      // occupies an otherwise valid upper court, move the boss to another
      // supported surface inside the same composition instead of spawning it
      // through the ornament or beyond the fortress edge.
      const bounds = blocks.map((block) => rotatedRectBounds(block))
      const compositionLeft = Math.min(...bounds.map((entry) => entry.left))
      const compositionRight = Math.max(...bounds.map((entry) => entry.right))
      const minimumX = compositionLeft + paddedBossRadius
      const maximumX = compositionRight - paddedBossRadius
      const preferredX = bossCourtyard.centerX
      const candidates = []
      for (let offset = 0; offset <= compositionRight - compositionLeft; offset += 2) {
        candidates.push({ x: preferredX - offset, surfaceY: GROUND_Y })
        if (offset) candidates.push({ x: preferredX + offset, surfaceY: GROUND_Y })
      }
      for (const { block, blockBounds } of blocks
        .map((block) => ({ block, blockBounds: rotatedRectBounds(block) }))
        .filter(({ block, blockBounds }) => (
          block.role !== 'blueprint-landmark'
          && Math.abs(finiteNumber(block.rotation)) <= 1e-6
          && blockBounds.width >= paddedBossRadius * 2 + 6
        ))
        .sort((first, second) => (
          Math.abs(first.block.x - preferredX) - Math.abs(second.block.x - preferredX)
          || second.blockBounds.top - first.blockBounds.top
        ))) {
        const left = blockBounds.left + paddedBossRadius + 3
        const right = blockBounds.right - paddedBossRadius - 3
        for (const x of [clamp(preferredX, left, right), (left + right) / 2, left, right]) {
          candidates.push({ x, surfaceY: blockBounds.top })
        }
      }
      const selected = candidates.find((candidate) => (
        candidate.x >= minimumX
        && candidate.x <= maximumX
        && bossCourtIsClear(candidate.x, candidate.surfaceY)
      ))
      if (!selected) {
        throw new RangeError(`${architectureBlueprint.buildingPlan.formId} landmark blocks its boss court`)
      }
      bossCourtyard.centerX = selected.x
      bossCourtyard.surfaceY = selected.surfaceY
    }
  }

  // Explicit physical plans replace a larger legacy budget, and endless
  // compounds can add a new all-stone ward afterwards. Normalize the reported
  // ceiling to the bodies that actually survived generation: a stone budget
  // above 100% is not meaningful, while the current authored masonry remains
  // a hard lower bound.
  maxStoneCount = Math.min(blocks.length, Math.max(stoneCount, maxStoneCount))
  maxStoneRatio = clamp(maxStoneCount / Math.max(1, blocks.length), 0, 1)

  const endlessStrongholdTargets = mode === 'endless'
    ? Math.min(MAX_NON_BOSS_TARGETS, endlessPressure.nonBossTargetCount)
    : null
  const minimumTargets = Math.min(
    MAX_NON_BOSS_TARGETS,
    lateRule?.minimumTargets ?? endlessStrongholdTargets ?? 2,
  )
  const targetClearsBuilding = (target) => blocks.every((block) => {
    const manifold = circleRectCollisionManifold({
      x: target.x,
      y: target.y,
      radius: target.size * 0.78,
    }, block)
    // A guard authored on a roof is tangent to that roof; reject only actual
    // body penetration so runtime never has to teleport it out of masonry.
    return !manifold || manifold.overlap <= 1e-6
  })
  const targetHasPhysicalSupport = (target) => {
    const radius = target.size * 0.78
    const bottom = target.y + radius
    if (Math.abs(bottom - GROUND_Y) <= 1e-6) return true
    return blocks.some((block) => {
      const bounds = rotatedRectBounds(block)
      return Math.abs(bottom - bounds.top) <= 1e-6
        && target.x - radius >= bounds.left - 1e-6
        && target.x + radius <= bounds.right + 1e-6
    })
  }
  const targetCandidateIsUsable = (target) => (
    targetClearsBuilding(target)
    && (!usesExplicitPhysicalLayout || targetHasPhysicalSupport(target))
  )
  const encounterTargetCap = lateRule?.minimumTargets
    ?? endlessStrongholdTargets
    ?? BASE_NON_BOSS_TARGET_CAP

  if (usesExplicitPhysicalLayout) {
    // Roof/span perches are the primary authored positions. Fill any remaining
    // encounter budget with true ground contacts, never coordinates inherited
    // from the deleted tower stack. Boss floors receive a few extra candidates
    // so reserving their court cannot reduce the intended guard count.
    const requestedCandidateCount = encounterTargetCap + (isBossLevel
      ? mode === 'endless' ? endlessPressure.bossGuardCount + 6 : 4
      : 0)
    const supportedPerches = fallbackPerchTargets.filter(targetCandidateIsUsable)
    fallbackPerchTargets.splice(0, fallbackPerchTargets.length, ...supportedPerches)
    const physicalBounds = blocks.map((block) => rotatedRectBounds(block))
    const minimumX = Math.max(
      FORTRESS_START_X - 100,
      Math.min(...physicalBounds.map((bounds) => bounds.left)) - 60,
    )
    const maximumX = Math.min(
      1_334,
      Math.max(...physicalBounds.map((bounds) => bounds.right)) + 30,
    )
    const size = 14
    const radius = size * 0.78
    const stride = radius * 2 + 8
    for (let x = minimumX + radius; x <= maximumX - radius + 1e-6; x += stride) {
      if (fallbackPerchTargets.length >= requestedCandidateCount) break
      const candidate = makeTarget(
        x,
        GROUND_Y - radius,
        size,
        false,
        'normal',
        { role: 'authored-building-ground-guard', spawnClass: 'ground' },
      )
      if (!targetCandidateIsUsable(candidate)) continue
      if (fallbackPerchTargets.some((other) => (
        Math.hypot(candidate.x - other.x, candidate.y - other.y)
          < radius + other.size * 0.78 + 4
      ))) continue
      fallbackPerchTargets.push(candidate)
    }
  }
  for (const perch of fallbackPerchTargets) {
    if (groundTargets.length + elevatedTargets.length >= minimumTargets) break
    if (!targetCandidateIsUsable(perch)) continue
    const overlapsExisting = elevatedTargets.some((target) => (
      Math.hypot(target.x - perch.x, target.y - perch.y) < target.size + perch.size
    ))
    if (!overlapsExisting) elevatedTargets.push(perch)
  }

  // Keep every tower's exposed ground target, then deterministically admit
  // elevated targets in generation order until the encounter reaches its cap.
  const clearElevatedTargets = elevatedTargets.filter(targetCandidateIsUsable)
  let targets = [
    ...groundTargets,
    ...clearElevatedTargets.slice(0, Math.max(0, encounterTargetCap - groundTargets.length)),
  ]

  if (strongholdTier > 0) {
    const orderedCandidates = [...elevatedTargets, ...fallbackPerchTargets]
      .sort((first, second) => first.x - second.x || first.y - second.y)
      .filter(targetCandidateIsUsable)
      .filter((candidate, index, candidates) => candidates.slice(0, index).every((other) => (
        Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 22
      )))
    const distributed = []
    const usedIndices = new Set()
    for (let index = 0; index < encounterTargetCap && distributed.length < orderedCandidates.length; index += 1) {
      let candidateIndex = Math.min(
        orderedCandidates.length - 1,
        Math.floor((index + 0.5) * orderedCandidates.length / encounterTargetCap),
      )
      while (usedIndices.has(candidateIndex) && candidateIndex + 1 < orderedCandidates.length) {
        candidateIndex += 1
      }
      while (usedIndices.has(candidateIndex) && candidateIndex > 0) candidateIndex -= 1
      if (!usedIndices.has(candidateIndex)) {
        usedIndices.add(candidateIndex)
        distributed.push(orderedCandidates[candidateIndex])
      }
    }
    targets = distributed
  }

  let groundFallbackOrdinal = 0
  const fallbackTargetMinimum = usesExplicitPhysicalLayout ? encounterTargetCap : 2
  while (targets.length < fallbackTargetMinimum && groundFallbackOrdinal < 80) {
    const direction = groundFallbackOrdinal % 2 === 0 ? -1 : 1
    const distance = 80 + Math.floor(groundFallbackOrdinal / 2) * 18
    const fallbackSize = usesExplicitPhysicalLayout ? 14 : 16
    const fallbackRadius = fallbackSize * 0.78
    const target = makeTarget(
      FORTRESS_START_X + direction * distance,
      usesExplicitPhysicalLayout ? GROUND_Y - fallbackRadius : GROUND_Y - 18,
      fallbackSize,
      false,
      'normal',
      usesExplicitPhysicalLayout
        ? { role: 'authored-building-ground-guard', spawnClass: 'ground' }
        : {},
    )
    groundFallbackOrdinal += 1
    if (usesExplicitPhysicalLayout && target.x + target.size >= 1_350) continue
    if (!targetCandidateIsUsable(target)) continue
    if (targets.some((other) => (
      Math.hypot(other.x - target.x, other.y - target.y) < other.size + target.size
    ))) continue
    targets.push(target)
  }
  if (targets.length < fallbackTargetMinimum) {
    throw new RangeError('generated building has no collision-free target positions')
  }

  if (isBossLevel) {
    // Story bosses add guards in four explicit tiers and gain their own
    // durability/weight curve. They remain direct-combat targets: falling
    // architecture shapes the arena but cannot erase a boss at opening spawn.
    const desiredGuardCount = mode === 'main'
      ? MAIN_BOSS_GUARDS[level] ?? groundTargets.length
      : mode === 'endless'
        ? Math.min(MAX_NON_BOSS_TARGETS, endlessPressure.bossGuardCount)
        : Math.min(6, 3 + strongholdTier)
    const bossVariant = mode === 'main' && level === MAIN_LEVELS ? 'king' : 'general'
    const bossProfile = bossProfileForEncounter(mode, level, bossVariant)
    const bossSize = bossProfile.size
    const bossRadius = bossSize * 0.78
    const bossX = bossCourtyard?.centerX ?? FORTRESS_START_X + 150
    const bossTarget = makeTarget(
      bossX,
      (bossCourtyard?.surfaceY ?? GROUND_Y) - bossRadius,
      bossSize,
      true,
      bossVariant,
      bossProfile,
    )
    const bossClearance = bossRadius + 14 * 0.78 + 8
    const guardSource = mode === 'endless'
      ? [...targets, ...fallbackPerchTargets]
        .filter(targetCandidateIsUsable)
        .filter((candidate, index, candidates) => candidates.slice(0, index).every((other) => (
          Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 4
        )))
      : targets
    const guardCandidates = guardSource
      .filter((target) => Math.hypot(target.x - bossX, target.y - bossTarget.y) > bossClearance)
      .sort((first, second) => first.x - second.x || first.y - second.y)
    const guards = []
    const usedGuardIndices = new Set()
    for (let index = 0; index < desiredGuardCount && guards.length < guardCandidates.length; index += 1) {
      const ratio = desiredGuardCount <= 1 ? 0.5 : index / (desiredGuardCount - 1)
      let candidateIndex = Math.round(ratio * (guardCandidates.length - 1))
      while (usedGuardIndices.has(candidateIndex) && candidateIndex + 1 < guardCandidates.length) {
        candidateIndex += 1
      }
      while (usedGuardIndices.has(candidateIndex) && candidateIndex > 0) candidateIndex -= 1
      if (!usedGuardIndices.has(candidateIndex)) {
        usedGuardIndices.add(candidateIndex)
        guards.push(guardCandidates[candidateIndex])
      }
    }
    targets = [bossTarget, ...guards]
  }
  const endlessReinforcedTargetCount = applyEndlessTargetPressure(
    targets,
    endlessPressure,
    seed,
  )

  const platformCount = mode === 'main' || mode === 'endless'
    ? movingPlatformProfile.count
    : lateRule?.platformCount ?? (mapType === 'moving' ? Math.min(level, 4) : 0)
  const platforms = platformCount > 0
    ? placeMainMovingPlatforms(platformCount, { blocks, targets, strongholdTier })
    : []

  const safeGoldenEggCandidates = goldenEggCandidates.filter((candidate) => blocks.every((block) => (
    !circleIntersectsRect({ x: candidate.x, y: candidate.y, radius: 11 }, block)
  )))
  const goldenEgg = goldenAcornRoll.spawned && safeGoldenEggCandidates.length
    ? safeGoldenEggCandidates[Math.min(
      safeGoldenEggCandidates.length - 1,
      Math.floor(goldenAcornRoll.placementRoll * safeGoldenEggCandidates.length),
    )]
    : null
  const authoredBaseShotBudget = (lateRule?.birdsAvailable ?? (3 + Math.floor(level / 5))) + 1
  const shotBudget = calculateShotBudget({ mode, baseShotBudget: authoredBaseShotBudget })
  const actualBridgeSpanCount = blocks.filter((block) => (
    block.moduleKind === 'asymmetric-bridge'
  )).length
  const actualRockButtressCount = new Set(blocks
    .filter((block) => block.moduleKind === 'rock-buttress')
    .map((block) => block.moduleId)).size

  // Some broad pre-royal blueprints used to place the outermost foundation
  // beyond the runtime's right boundary. The cleanup pass then removed that
  // post at spawn and dismantled its entire wing without a player shot.
  // Translate the complete encounter together: never clamp individual pieces
  // or change the relationships that hold a roof, brace and target in place.
  const encounterRight = Math.max(...blocks.map((block) => rotatedRectBounds(block).right))
  const encounterShiftX = Math.min(0, 1410 - encounterRight)
  if (encounterShiftX !== 0) {
    for (const entity of [...blocks, ...targets, ...platforms]) {
      entity.x += encounterShiftX
      if (Number.isFinite(entity.minX)) entity.minX += encounterShiftX
      if (Number.isFinite(entity.maxX)) entity.maxX += encounterShiftX
    }
    if (goldenEgg) goldenEgg.x += encounterShiftX
  }

  return {
    seed,
    level,
    mode,
    endlessDepth: mode === 'endless' ? (level > MAIN_LEVELS ? level - MAIN_LEVELS : level) : null,
    endlessPressure: endlessPressure ? {
      ...endlessPressure,
      compoundAddedBlocks: endlessCompoundStats.addedCount,
      reinforcedTargetCount: endlessReinforcedTargetCount,
    } : null,
    mapType,
    movingPlatformProfile,
    windX,
    skyColor,
    isBossLevel,
    strongholdTier,
    strongholdModules: {
      ...strongholdModules,
      longBeamCount,
      wallPanelCount: actualStrongholdConnectorCount,
    },
    structureFamily: {
      ...structureFamily,
      towerCount,
      towerFloorCounts: [...towerFloorCounts],
      bridgeSpanCount: actualBridgeSpanCount,
      rockButtressCount: actualRockButtressCount,
      silhouetteModuleCount: familySilhouetteModuleCount,
      stoneBudgetRatio: maxStoneRatio,
    },
    architectureBlueprint: architectureBlueprint ? {
      id: architectureBlueprint.id,
      name: architectureBlueprint.name,
      motif: architectureBlueprint.motif,
      familyId: architectureBlueprint.familyId,
      geometry: { ...architectureBlueprint.geometry },
      towerFloors: [...architectureBlueprint.towerFloors],
      constructionIds: architectureBlueprint.constructionPalette
        .map((entry) => entry.constructionId),
      landmarkKind: architectureBlueprint.landmark?.kind || null,
      constructionCount: architectureConstructionCount,
      landmarkAdded: architectureLandmarkAdded,
      buildingPlan: architectureBlueprint.buildingPlan ? {
        ...architectureBlueprint.buildingPlan,
        towerForms: [...architectureBlueprint.buildingPlan.towerForms],
        mechanisms: [...architectureBlueprint.buildingPlan.mechanisms],
        visualParts: [...architectureBlueprint.buildingPlan.visualParts],
        appliedComplexity: completeBuildingStats.complexity,
        envelopePieceCount: completeBuildingStats.panelCount,
      } : null,
    } : null,
    bossCourtyard: bossCourtyard ? {
      centerX: bossCourtyard.centerX + encounterShiftX,
      clearWidth: bossCourtyard.clearWidth,
      minimumClearance: minimumBossCourtyardWidth,
      gapIndex: bossCourtyard.index,
      surfaceY: bossCourtyard.surfaceY ?? GROUND_Y,
      physicalLayout: bossCourtyard.physicalLayout === true,
    } : null,
    fortressStyle: structureFamily.id,
    environmentThemeId: environmentTheme?.id || null,
    environmentThemeLevel,
    terrainProfile,
    architectureStyle: environmentTheme?.architecture?.style || null,
    materialBias: materialBias ? { ...materialBias } : null,
    maximumPhysicalBlocks: STRONGHOLD_RULES.maximumPhysicalBlocks,
    stoneChance,
    stoneCount,
    maxStoneCount,
    blocks,
    targets,
    platforms,
    goldenEgg,
    goldenAcornChance: goldenAcornRoll.chance,
    birdTypes: birdTypePool(level),
    baseShotBudget: shotBudget.baseShotBudget,
    totalShotBudget: shotBudget.totalShotBudget,
    maximumTotalShotBudget: shotBudget.maximumTotalShotBudget,
    birdsAvailable: Math.max(0, shotBudget.totalShotBudget - 1),
    fortressStartX: FORTRESS_START_X + encounterShiftX,
  }
}

function finitePoint(value, label) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError(`${label} must have finite x and y coordinates`)
  }
  return value
}

function radiusOf(circle) {
  const radius = Number(circle.radius ?? circle.r)
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('circle radius must be non-negative')
  return radius
}

function rectSize(rectangle) {
  const width = Number(rectangle.width ?? rectangle.w)
  const height = Number(rectangle.height ?? rectangle.h)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
    throw new RangeError('rectangle width and height must be non-negative')
  }
  return { width, height }
}

export function distanceSquared(a, b) {
  finitePoint(a, 'first point')
  finitePoint(b, 'second point')
  const deltaX = b.x - a.x
  const deltaY = b.y - a.y
  return deltaX * deltaX + deltaY * deltaY
}

export function circlesOverlap(first, second) {
  finitePoint(first, 'first circle')
  finitePoint(second, 'second circle')
  const combinedRadius = radiusOf(first) + radiusOf(second)
  return distanceSquared(first, second) <= combinedRadius * combinedRadius
}

/**
 * Builds the one-shot transition for the drill acorn's active dive. The
 * player chooses an x column during normal flight, then commits to a fast
 * downward bore from that exact position.
 */
export function calculateVerticalDrillActivation(bird = {}, ability = {}, stepMs = 1000 / VIEWPORT.fps) {
  const normalizedStepMs = Math.max(1, finiteNumber(stepMs, 1000 / VIEWPORT.fps))
  const diveSpeed = Math.max(0.01, finiteNumber(ability?.diveSpeed, 18))
  const horizontalRetention = clamp(finiteNumber(ability?.horizontalVelocityRetention, 0), 0, 1)
  const maximumPierces = Math.max(0, Math.floor(finiteNumber(ability?.maxPierces, 0)))
  const durationTicks = Math.max(1, Math.round(
    Math.max(normalizedStepMs, finiteNumber(ability?.durationMs, normalizedStepMs)) / normalizedStepMs,
  ))
  const baseDamage = Math.max(0, finiteNumber(bird?.baseDamage, finiteNumber(bird?.damage)))
  return Object.freeze({
    vx: finiteNumber(bird?.vx) * horizontalRetention,
    vy: Math.max(diveSpeed, finiteNumber(bird?.vy)),
    rotation: 0,
    pierceRemaining: maximumPierces,
    abilityTicks: durationTicks,
    damage: baseDamage * Math.max(0, finiteNumber(ability?.damageMultiplier, 1)),
  })
}

export function pointInRect(point, rectangle) {
  finitePoint(point, 'point')
  finitePoint(rectangle, 'rectangle')
  const { width, height } = rectSize(rectangle)
  return point.x >= rectangle.x - width / 2
    && point.x <= rectangle.x + width / 2
    && point.y >= rectangle.y - height / 2
    && point.y <= rectangle.y + height / 2
}

export function circleIntersectsRect(circle, rectangle) {
  finitePoint(circle, 'circle')
  finitePoint(rectangle, 'rectangle')
  const radius = radiusOf(circle)
  const { width, height } = rectSize(rectangle)
  const radians = rectangleRotation(rectangle)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const worldDeltaX = circle.x - rectangle.x
  const worldDeltaY = circle.y - rectangle.y
  // Rotate the circle into the rectangle's local coordinates. The old
  // axis-aligned test made a visibly tilted beam retain an invisible flat hit
  // box, which was the source of several impossible-looking contacts.
  const localX = worldDeltaX * cosine + worldDeltaY * sine
  const localY = -worldDeltaX * sine + worldDeltaY * cosine
  const closestX = clamp(localX, -width / 2, width / 2)
  const closestY = clamp(localY, -height / 2, height / 2)
  const deltaX = localX - closestX
  const deltaY = localY - closestY
  return deltaX * deltaX + deltaY * deltaY <= radius * radius
}

export function circleRectCollisionManifold(circle, rectangle) {
  finitePoint(circle, 'circle')
  finitePoint(rectangle, 'rectangle')
  const radius = radiusOf(circle)
  const { width, height } = rectSize(rectangle)
  const radians = rectangleRotation(rectangle)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const worldDeltaX = circle.x - rectangle.x
  const worldDeltaY = circle.y - rectangle.y
  const localX = worldDeltaX * cosine + worldDeltaY * sine
  const localY = -worldDeltaX * sine + worldDeltaY * cosine
  const halfWidth = width / 2
  const halfHeight = height / 2
  const closestX = clamp(localX, -halfWidth, halfWidth)
  const closestY = clamp(localY, -halfHeight, halfHeight)
  const deltaX = localX - closestX
  const deltaY = localY - closestY
  const distanceSquaredToRect = deltaX * deltaX + deltaY * deltaY
  if (distanceSquaredToRect > radius * radius + 1e-8) return null

  let localNormalX
  let localNormalY
  let overlap
  let contactLocalX = closestX
  let contactLocalY = closestY
  if (distanceSquaredToRect > 1e-12) {
    const distance = Math.sqrt(distanceSquaredToRect)
    localNormalX = deltaX / distance
    localNormalY = deltaY / distance
    overlap = Math.max(0, radius - distance)
  } else {
    // A circle whose centre is inside the rectangle needs the distance to the
    // nearest face as well as its radius to leave the solid volume. Prefer the
    // upper face for a perfectly centred tie so gravity does not eject an
    // entity deeper into the ground.
    const edgeX = halfWidth - Math.abs(localX)
    const edgeY = halfHeight - Math.abs(localY)
    if (edgeX < edgeY) {
      localNormalX = Math.sign(localX || 1)
      localNormalY = 0
      overlap = radius + edgeX
      contactLocalX = localNormalX * halfWidth
      contactLocalY = localY
    } else {
      localNormalX = 0
      localNormalY = Math.sign(localY || -1)
      overlap = radius + edgeY
      contactLocalX = localX
      contactLocalY = localNormalY * halfHeight
    }
  }

  const normalX = localNormalX * cosine - localNormalY * sine
  const normalY = localNormalX * sine + localNormalY * cosine
  return {
    overlap,
    normalX,
    normalY,
    contactX: rectangle.x + contactLocalX * cosine - contactLocalY * sine,
    contactY: rectangle.y + contactLocalX * sine + contactLocalY * cosine,
  }
}

/**
 * Separates a moving circle from a (possibly moving/rotating) rectangle and
 * resolves only the closing component of their relative velocity.  Keeping
 * this response independent from damage/cooldown state is important for
 * moving walls: a contact may be visually quiet while it must still remain a
 * solid obstacle every simulation tick.
 */
export function resolveCircleRectCollision(circle, rectangle, options = {}) {
  const manifold = circleRectCollisionManifold(circle, rectangle)
  if (!manifold) return null

  const circleVx = Number(circle.vx ?? 0)
  const circleVy = Number(circle.vy ?? 0)
  const surfaceVx = Number(options.surfaceVx ?? rectangle.vx ?? 0)
  const surfaceVy = Number(options.surfaceVy ?? rectangle.vy ?? 0)
  const restitution = Number(options.restitution ?? 0.45)
  const padding = Number(options.padding ?? 0.05)
  const mass = Number(options.mass ?? circle.mass ?? 1)
  if (![circleVx, circleVy, surfaceVx, surfaceVy, restitution, padding, mass]
    .every(Number.isFinite)
    || restitution < 0 || restitution > 1.5 || padding < 0 || mass <= 0) {
    throw new RangeError('circle collision response values must be valid')
  }

  const relativeNormalVelocity = (circleVx - surfaceVx) * manifold.normalX
    + (circleVy - surfaceVy) * manifold.normalY
  let vx = circleVx
  let vy = circleVy
  if (relativeNormalVelocity < 0) {
    const impulse = -(1 + restitution) * relativeNormalVelocity
    vx += impulse * manifold.normalX
    vy += impulse * manifold.normalY
  }

  const separation = manifold.overlap + padding
  return Object.freeze({
    x: circle.x + manifold.normalX * separation,
    y: circle.y + manifold.normalY * separation,
    vx,
    vy,
    overlap: manifold.overlap,
    normalX: manifold.normalX,
    normalY: manifold.normalY,
    contactX: manifold.contactX,
    contactY: manifold.contactY,
    relativeNormalVelocity,
    closingMomentum: Math.max(0, -relativeNormalVelocity) * mass,
  })
}

/**
 * Finds the first circle/rectangle contact along both bodies' motion during a
 * fixed tick.  Thin moving walls need this continuous check: using only the
 * final overlap can choose the wrong exit face, while a fast dash can cross a
 * sixteen-pixel board completely between frames.
 */
export function resolveSweptCircleRectCollision(circle, rectangle, options = {}) {
  finitePoint(circle, 'circle')
  finitePoint(rectangle, 'rectangle')
  const previousCircle = options.previousCircle || circle
  const previousRectangle = options.previousRectangle || rectangle
  finitePoint(previousCircle, 'previous circle')
  finitePoint(previousRectangle, 'previous rectangle')
  const radius = radiusOf(circle)
  const { width, height } = rectSize(rectangle)
  const currentRotation = Number(rectangle.rotation ?? 0)
  const previousRotation = Number(previousRectangle.rotation ?? currentRotation)
  const maxSteps = Number(options.maxSteps ?? 64)
  const maxStep = Number(options.maxStep
    ?? Math.max(1, Math.min(radius * 0.35, Math.min(width, height) * 0.3)))
  if (![currentRotation, previousRotation, maxSteps, maxStep].every(Number.isFinite)
    || maxSteps < 1 || maxStep <= 0) {
    throw new RangeError('swept collision values must be valid')
  }

  const rotationDelta = ((currentRotation - previousRotation + 180) % 360 + 360) % 360 - 180
  const relativeDeltaX = (circle.x - previousCircle.x) - (rectangle.x - previousRectangle.x)
  const relativeDeltaY = (circle.y - previousCircle.y) - (rectangle.y - previousRectangle.y)
  const angularTravel = Math.abs(rotationDelta) * Math.PI / 180 * Math.hypot(width, height) * 0.5
  const travel = Math.hypot(relativeDeltaX, relativeDeltaY) + angularTravel
  const steps = Math.min(Math.floor(maxSteps), Math.max(1, Math.ceil(travel / maxStep)))

  for (let index = 0; index <= steps; index += 1) {
    const time = index / steps
    const sampledCircle = {
      ...circle,
      x: previousCircle.x + (circle.x - previousCircle.x) * time,
      y: previousCircle.y + (circle.y - previousCircle.y) * time,
    }
    const sampledRectangle = {
      ...rectangle,
      x: previousRectangle.x + (rectangle.x - previousRectangle.x) * time,
      y: previousRectangle.y + (rectangle.y - previousRectangle.y) * time,
      rotation: previousRotation + rotationDelta * time,
    }
    const response = resolveCircleRectCollision(sampledCircle, sampledRectangle, options)
    if (!response) continue
    // A body that starts exactly tangent and is already moving away must not
    // be rewound to its previous position merely because touching counts as a
    // manifold.  Closing contacts and genuine penetration still resolve at t=0.
    if (index === 0 && response.overlap <= 1e-6
      && response.relativeNormalVelocity >= 0) continue
    const angularDelta = rotationDelta * Math.PI / 180
    const contactOffsetX = response.contactX - sampledRectangle.x
    const contactOffsetY = response.contactY - sampledRectangle.y
    const surfaceDeltaX = rectangle.x - previousRectangle.x - angularDelta * contactOffsetY
    const surfaceDeltaY = rectangle.y - previousRectangle.y + angularDelta * contactOffsetX
    const circleDeltaX = circle.x - previousCircle.x
    const circleDeltaY = circle.y - previousCircle.y
    const sweepRelativeNormalVelocity = (circleDeltaX - surfaceDeltaX) * response.normalX
      + (circleDeltaY - surfaceDeltaY) * response.normalY
    return Object.freeze({
      ...response,
      time,
      rectangleX: sampledRectangle.x,
      rectangleY: sampledRectangle.y,
      rectangleRotation: sampledRectangle.rotation,
      sweepRelativeNormalVelocity,
    })
  }
  return null
}

/**
 * Resolves the special case where a falling solid reaches a squirrel that is
 * already standing on the ground.  The solid yields at the first contact and
 * rests on the squirrel collider; the squirrel is never projected through the
 * beam or relocated to a remote clear point.
 */
export function resolveSquirrelSolidCollision(squirrel, solid, options = {}) {
  const padding = Number(options.padding ?? 0.08)
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError('squirrel collision padding must be valid')
  }

  const grounded = Boolean(options.grounded)
  const solidCanYield = options.solidCanYield !== false
  const previousSolid = options.previousSolid && typeof options.previousSolid === 'object'
    ? options.previousSolid
    : solid
  const previousSquirrel = options.previousSquirrel && typeof options.previousSquirrel === 'object'
    ? options.previousSquirrel
    : squirrel
  const squirrelVx = Number(squirrel.vx ?? 0)
  const squirrelVy = Number(squirrel.vy ?? 0)
  const solidVx = Number(solid.vx ?? 0)
  const solidVy = Number(solid.vy ?? 0)
  const surfaceVx = Number(options.surfaceVx ?? solidVx)
  const surfaceVy = Number(options.surfaceVy ?? solidVy)
  if (![squirrelVx, squirrelVy, solidVx, solidVy, surfaceVx, surfaceVy].every(Number.isFinite)) {
    throw new TypeError('squirrel and solid velocities must be finite')
  }

  const response = resolveSweptCircleRectCollision(squirrel, solid, {
    previousCircle: previousSquirrel,
    previousRectangle: previousSolid,
    surfaceVx,
    surfaceVy,
    restitution: options.restitution ?? 0.06,
    padding,
    mass: squirrel.mass ?? 1,
  })
  if (!response) return null

  const closingNormalVelocity = Math.min(
    response.relativeNormalVelocity,
    Number.isFinite(response.sweepRelativeNormalVelocity)
      ? response.sweepRelativeNormalVelocity
      : response.relativeNormalVelocity,
  )
  const firstContactFromAbove = grounded && solidCanYield
    && response.normalY > 0.45
    && closingNormalVelocity < 0
  if (firstContactFromAbove) {
    const correction = response.overlap + padding
    const solidApproachSpeed = (surfaceVx - squirrelVx) * response.normalX
      + (surfaceVy - squirrelVy) * response.normalY
    const stoppedSolidVx = solidVx - Math.max(0, solidApproachSpeed) * response.normalX
    const stoppedSolidVy = solidVy - Math.max(0, solidApproachSpeed) * response.normalY
    return Object.freeze({
      pinned: true,
      squirrelX: squirrel.x,
      squirrelY: squirrel.y,
      squirrelVx,
      squirrelVy: Math.min(0, squirrelVy),
      solidX: response.rectangleX - response.normalX * correction,
      solidY: response.rectangleY - response.normalY * correction,
      solidRotation: response.rectangleRotation,
      solidVx: stoppedSolidVx,
      solidVy: stoppedSolidVy,
      normalX: response.normalX,
      normalY: response.normalY,
      overlap: response.overlap,
      contactX: response.contactX,
      contactY: response.contactY,
    })
  }

  return Object.freeze({
    pinned: false,
    squirrelX: response.x,
    squirrelY: response.y,
    squirrelVx: response.vx,
    squirrelVy: response.vy,
    solidX: solid.x,
    solidY: solid.y,
    solidRotation: Number(solid.rotation ?? 0),
    solidVx,
    solidVy,
    normalX: response.normalX,
    normalY: response.normalY,
    overlap: response.overlap,
    contactX: response.contactX,
    contactY: response.contactY,
  })
}

export function findNearestCircleClearPosition(circle, rectangles, options = {}) {
  finitePoint(circle, 'circle')
  if (!Array.isArray(rectangles)) throw new TypeError('rectangles must be an array')
  const radius = radiusOf(circle)
  const minX = Number(options.minX ?? -Infinity)
  const maxX = Number(options.maxX ?? Infinity)
  const minY = Number(options.minY ?? -Infinity)
  const maxY = Number(options.maxY ?? Infinity)
  const step = Number(options.step ?? Math.max(6, Math.min(12, radius * 0.75)))
  const maxSearch = Number(options.maxSearch ?? 360)
  const preferred = Array.isArray(options.preferred) ? options.preferred : []
  const avoidCircles = Array.isArray(options.avoidCircles) ? options.avoidCircles : []
  const padding = Number(options.padding ?? 0)
  if (Number.isNaN(minX) || Number.isNaN(maxX) || Number.isNaN(minY) || Number.isNaN(maxY)
    || !Number.isFinite(step) || !Number.isFinite(maxSearch) || !Number.isFinite(padding)
    || minX > maxX || minY > maxY || step <= 0 || maxSearch < 0 || padding < 0) {
    throw new RangeError('clear-position bounds and search values must be valid')
  }
  for (const obstacle of avoidCircles) {
    finitePoint(obstacle, 'avoid circle')
    radiusOf(obstacle)
  }

  const isClear = (point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return false
    const candidate = { x: point.x, y: point.y, radius: radius + padding }
    if (!rectangles.every((rectangle) => {
      const manifold = circleRectCollisionManifold(candidate, rectangle)
      return !manifold || manifold.overlap <= 1e-6
    })) return false
    return avoidCircles.every((obstacle) => {
      const clearance = candidate.radius + radiusOf(obstacle) + padding
      return distanceSquared(candidate, obstacle) > clearance * clearance
    })
  }

  for (const point of preferred) {
    if (isClear(point)) return { x: point.x, y: point.y }
  }
  if (isClear(circle)) return { x: circle.x, y: circle.y }

  const rings = Math.ceil(maxSearch / step)
  for (let ring = 1; ring <= rings; ring += 1) {
    const extent = ring * step
    for (let offset = -ring; offset <= ring; offset += 1) {
      const delta = offset * step
      const candidates = [
        { x: circle.x + delta, y: circle.y - extent },
        { x: circle.x + delta, y: circle.y + extent },
      ]
      if (Math.abs(offset) < ring) {
        candidates.push(
          { x: circle.x - extent, y: circle.y + delta },
          { x: circle.x + extent, y: circle.y + delta },
        )
      }
      for (const candidate of candidates) if (isClear(candidate)) return candidate
    }
  }
  return null
}

/**
 * Builds deterministic tactical spawn candidates for a boss encounter.
 *
 * The candidates are derived from the authored structure bounds rather than
 * the regular tower constants. This keeps custom special maps and later,
 * wider fortresses valid while ensuring a boss is first searched for in the
 * middle/rear half of the actual stronghold instead of being pushed toward
 * the launcher by the generic nearest-clear search.
 *
 * Collision and guard clearance are deliberately left to
 * findSafeCircleSpawnPosition(), which can reject candidates against the
 * complete runtime solid/target set.
 */
export function buildBossSpawnPreferences(circle, structureRectangles, options = {}) {
  finitePoint(circle, 'boss circle')
  if (!Array.isArray(structureRectangles)) {
    throw new TypeError('structureRectangles must be an array')
  }
  if (structureRectangles.length === 0) {
    throw new RangeError('at least one structure rectangle is required')
  }

  const radius = radiusOf(circle)
  const groundY = Number(options.groundY ?? GROUND_Y)
  const slingX = Number(options.slingX ?? SLING_X)
  const minimumSlingDistance = Number(options.minimumSlingDistance ?? 520)
  const rearStartRatio = Number(options.rearStartRatio ?? 0.5)
  const focusRatio = Number(options.focusRatio ?? 0.72)
  const step = Number(options.step ?? Math.max(4, Math.min(8, radius * 0.2)))
  const grounded = options.grounded !== false

  if (![groundY, slingX, minimumSlingDistance, rearStartRatio, focusRatio, step]
    .every(Number.isFinite)
    || minimumSlingDistance < 0 || rearStartRatio < 0 || rearStartRatio > 1
    || focusRatio < rearStartRatio || focusRatio > 1 || step <= 0) {
    throw new RangeError('boss spawn preference options are invalid')
  }

  const bounds = structureRectangles.map((rectangle) => rotatedRectBounds(rectangle))
  const structureLeft = Math.min(...bounds.map((bound) => bound.left))
  const structureRight = Math.max(...bounds.map((bound) => bound.right))
  const structureWidth = structureRight - structureLeft
  if (!Number.isFinite(structureWidth) || structureWidth <= 0) {
    throw new RangeError('structure rectangles must span a positive width')
  }

  const rearMargin = Number(options.rearMargin ?? Math.max(72, radius * 2.5))
  const minX = Number(options.minX ?? slingX + minimumSlingDistance)
  const maxX = Number(options.maxX ?? structureRight + rearMargin)
  if (![rearMargin, minX, maxX].every(Number.isFinite)
    || rearMargin < 0 || minX > maxX) {
    throw new RangeError('boss spawn preference bounds are invalid')
  }

  const bandStart = Math.max(
    structureLeft + structureWidth * rearStartRatio,
    slingX + minimumSlingDistance,
    minX,
  )
  const bandEnd = Math.min(structureRight + rearMargin, maxX)
  if (bandStart > bandEnd) return Object.freeze([])

  const focusX = clamp(
    structureLeft + structureWidth * focusRatio,
    bandStart,
    bandEnd,
  )
  const candidateY = grounded ? groundY - radius : circle.y
  const maximumOffset = Math.max(focusX - bandStart, bandEnd - focusX)
  const steps = Math.ceil(maximumOffset / step)
  const candidates = []
  const seen = new Set()
  const appendCandidate = (x) => {
    const boundedX = clamp(x, bandStart, bandEnd)
    const key = boundedX.toFixed(8)
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(Object.freeze({ x: boundedX, y: candidateY }))
  }

  // Prefer the rearward side on equal offsets. If it is occupied, gradually
  // search toward the centre before using the small rear apron behind the
  // final wall. Four-to-eight pixel sampling remains tight enough for the
  // narrow passages in authored special maps without coupling this helper to
  // their block arrangement.
  appendCandidate(focusX)
  for (let index = 1; index <= steps; index += 1) {
    const offset = index * step
    if (focusX + offset <= bandEnd) appendCandidate(focusX + offset)
    if (focusX - offset >= bandStart) appendCandidate(focusX - offset)
  }
  appendCandidate(bandEnd)
  appendCandidate(bandStart)
  return Object.freeze(candidates)
}

export function findSafeCircleSpawnPosition(circle, rectangles, options = {}) {
  finitePoint(circle, 'circle')
  if (!Array.isArray(rectangles)) throw new TypeError('rectangles must be an array')
  const radius = radiusOf(circle)
  const padding = Number(options.padding ?? 2)
  const minX = Number(options.minX ?? -Infinity)
  const maxX = Number(options.maxX ?? Infinity)
  const minY = Number(options.minY ?? -Infinity)
  const maxY = Number(options.maxY ?? Infinity)
  const step = Number(options.step ?? Math.max(6, Math.min(12, radius * 0.5)))
  const maxSearch = Number(options.maxSearch ?? 420)
  const groundY = Number(options.groundY ?? GROUND_Y)
  const preferGround = options.preferGround !== false
  const preferred = Array.isArray(options.preferred) ? options.preferred : []
  const avoidCircles = Array.isArray(options.avoidCircles) ? options.avoidCircles : []
  const requireSupport = options.requireSupport === true
  const supportRectangles = Array.isArray(options.supportRectangles)
    ? options.supportRectangles : rectangles
  if (![padding, step, maxSearch, groundY].every(Number.isFinite)
    || Number.isNaN(minX) || Number.isNaN(maxX) || Number.isNaN(minY) || Number.isNaN(maxY)
    || padding < 0 || step <= 0 || maxSearch < 0 || minX > maxX || minY > maxY) {
    throw new RangeError('safe-spawn bounds and search values must be valid')
  }
  for (const obstacle of avoidCircles) {
    finitePoint(obstacle, 'avoid circle')
    radiusOf(obstacle)
  }

  const paddedRadius = radius + padding
  const isClear = (point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return false
    const candidate = { x: point.x, y: point.y, radius: paddedRadius }
    if (rectangles.some((rectangle) => {
      const manifold = circleRectCollisionManifold(candidate, rectangle)
      return Boolean(manifold && manifold.overlap > 1e-6)
    })) return false
    if (requireSupport && Math.abs(point.y + radius - groundY) > 1) {
      // A clear point above a sloping brace is not a safe standing position.
      // A short downward probe accepts a real upper face while rejecting side
      // faces and steep ramps that would slide a guard to its death at spawn.
      const feetProbe = { x: point.x, y: point.y + padding + 1, radius }
      if (!supportRectangles.some((rectangle) => {
        const support = circleRectCollisionManifold(feetProbe, rectangle)
        return support && support.normalY < -0.9 && support.overlap <= padding + 2
      })) return false
    }
    return avoidCircles.every((obstacle) => {
      const clearance = paddedRadius + radiusOf(obstacle)
      return distanceSquared(candidate, obstacle) > clearance * clearance
    })
  }

  for (const point of preferred) {
    if (isClear(point)) return { x: point.x, y: point.y }
  }

  // Large bosses authored inside a fortress must not be ejected onto a roof:
  // a roof-clear point can still turn into a lethal opening fall on frame one.
  // Search the ground outwards from the authored x coordinate first, while
  // respecting both the final body radius and enemies already placed there.
  if (preferGround) {
    const groundCenterY = clamp(groundY - radius, minY, maxY)
    const steps = Math.ceil(maxSearch / step)
    for (let index = 0; index <= steps; index += 1) {
      const offset = index * step
      const candidates = index === 0
        ? [{ x: circle.x, y: groundCenterY }]
        : [
          { x: circle.x - offset, y: groundCenterY },
          { x: circle.x + offset, y: groundCenterY },
        ]
      for (const candidate of candidates) if (isClear(candidate)) return candidate
    }
  }

  if (isClear(circle)) return { x: circle.x, y: circle.y }

  const rings = Math.ceil(maxSearch / step)
  for (let ring = 1; ring <= rings; ring += 1) {
    const extent = ring * step
    for (let offset = -ring; offset <= ring; offset += 1) {
      const delta = offset * step
      const candidates = [
        { x: circle.x + delta, y: circle.y - extent },
        { x: circle.x + delta, y: circle.y + extent },
      ]
      if (Math.abs(offset) < ring) {
        candidates.push(
          { x: circle.x - extent, y: circle.y + delta },
          { x: circle.x + extent, y: circle.y + delta },
        )
      }
      for (const candidate of candidates) if (isClear(candidate)) return candidate
    }
  }
  return null
}

function rectangleRotation(rectangle) {
  const rotation = Number(rectangle.rotation ?? 0)
  if (!Number.isFinite(rotation)) throw new TypeError('rectangle rotation must be finite')
  return rotation * Math.PI / 180
}

function rectangleAxes(rectangle) {
  const radians = rectangleRotation(rectangle)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return [
    { x: cosine, y: sine },
    { x: -sine, y: cosine },
  ]
}

export function rotatedRectBounds(rectangle) {
  finitePoint(rectangle, 'rectangle')
  const { width, height } = rectSize(rectangle)
  const radians = rectangleRotation(rectangle)
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const rotatedWidth = width * cosine + height * sine
  const rotatedHeight = width * sine + height * cosine
  return {
    left: rectangle.x - rotatedWidth / 2,
    right: rectangle.x + rotatedWidth / 2,
    top: rectangle.y - rotatedHeight / 2,
    bottom: rectangle.y + rotatedHeight / 2,
    width: rotatedWidth,
    height: rotatedHeight,
  }
}

export function rectCollisionManifold(first, second) {
  finitePoint(first, 'first rectangle')
  finitePoint(second, 'second rectangle')
  const firstSize = rectSize(first)
  const secondSize = rectSize(second)
  const firstAxes = rectangleAxes(first)
  const secondAxes = rectangleAxes(second)
  const delta = { x: second.x - first.x, y: second.y - first.y }
  let smallestOverlap = Infinity
  let collisionAxis = firstAxes[0]

  for (const axis of [...firstAxes, ...secondAxes]) {
    const distance = Math.abs(delta.x * axis.x + delta.y * axis.y)
    const firstRadius = firstSize.width / 2 * Math.abs(firstAxes[0].x * axis.x + firstAxes[0].y * axis.y)
      + firstSize.height / 2 * Math.abs(firstAxes[1].x * axis.x + firstAxes[1].y * axis.y)
    const secondRadius = secondSize.width / 2 * Math.abs(secondAxes[0].x * axis.x + secondAxes[0].y * axis.y)
      + secondSize.height / 2 * Math.abs(secondAxes[1].x * axis.x + secondAxes[1].y * axis.y)
    const overlap = firstRadius + secondRadius - distance
    if (overlap < -1e-8) return null
    if (overlap < smallestOverlap) {
      smallestOverlap = Math.max(0, overlap)
      const direction = delta.x * axis.x + delta.y * axis.y < 0 ? -1 : 1
      collisionAxis = { x: axis.x * direction, y: axis.y * direction }
    }
  }

  return {
    overlap: smallestOverlap,
    normalX: collisionAxis.x,
    normalY: collisionAxis.y,
  }
}

export function rectsOverlap(first, second) {
  return rectCollisionManifold(first, second) !== null
}

function signedRightAngleError(rotation) {
  return ((rotation + 45) % 90 + 90) % 90 - 45
}

export function analyzeBlockSupport(block, supports = [], options = {}) {
  finitePoint(block, 'block')
  if (!Array.isArray(supports)) throw new TypeError('supports must be an array')
  const groundY = Number(options.groundY ?? GROUND_Y)
  const contactTolerance = Number(options.contactTolerance ?? 3)
  const angleTolerance = Number(options.angleTolerance ?? 2)
  const edgeInset = Number(options.edgeInset ?? 1)
  if (![groundY, contactTolerance, angleTolerance, edgeInset].every(Number.isFinite)
    || contactTolerance < 0 || angleTolerance < 0 || edgeInset < 0) {
    throw new RangeError('support options must contain finite non-negative tolerances')
  }

  const bounds = rotatedRectBounds(block)
  const rotation = Number(block.rotation ?? 0)
  const structuralRestRotation = Number(block.structuralRestRotation ?? 0)
  const angleError = signedRightAngleError(rotation - structuralRestRotation)
  if (Math.abs(bounds.bottom - groundY) <= contactTolerance) {
    return {
      hasContact: true,
      supported: true,
      settled: Math.abs(angleError) <= angleTolerance,
      supportLeft: -Infinity,
      supportRight: Infinity,
      leverArm: 0,
      tippingDirection: 0,
      angleError,
    }
  }

  const intervals = []
  const explicitJointMode = Array.isArray(options.joints)
  for (const support of supports) {
    if (support === block) continue
    const supportBounds = rotatedRectBounds(support)
    if (Math.abs(bounds.bottom - supportBounds.top) > contactTolerance) continue
    const authoredWeakPoint = support.critical || support.weakPoint
      || support.cableAnchor || support.weakFloat
    const joint = explicitJointMode ? activeStructureJoint(options.joints, block, support) : null
    const authoredBearingAllowance = Math.max(0, finiteNumber(support.structuralBearingAllowance))
    const materialBearingAllowance = Math.max(
      0,
      STRUCTURE_STABILITY_RULES.materials[support.type]?.bearingAllowance || 0,
    )
    const bearingAllowance = authoredWeakPoint ? 0
      : Math.max(
        materialBearingAllowance,
        authoredBearingAllowance,
        explicitJointMode ? joint?.bearingAllowance || 0 : 0,
      )
    const left = Math.max(bounds.left, supportBounds.left - bearingAllowance)
    const right = Math.min(bounds.right, supportBounds.right + bearingAllowance)
    if (right - left > 0.25) intervals.push({ left, right })
  }

  if (intervals.length === 0) {
    return {
      hasContact: false,
      supported: false,
      settled: false,
      supportLeft: null,
      supportRight: null,
      leverArm: 0,
      tippingDirection: 0,
      angleError,
    }
  }

  const supportLeft = Math.min(...intervals.map((interval) => interval.left))
  const supportRight = Math.max(...intervals.map((interval) => interval.right))
  const usableInset = Math.min(edgeInset, Math.max(0, (supportRight - supportLeft) / 2 - 0.01))
  const stableLeft = supportLeft + usableInset
  const stableRight = supportRight - usableInset
  const leverArm = block.x < stableLeft
    ? block.x - stableLeft
    : block.x > stableRight ? block.x - stableRight : 0
  const supported = leverArm === 0

  return {
    hasContact: true,
    supported,
    settled: supported && Math.abs(angleError) <= angleTolerance,
    supportLeft,
    supportRight,
    leverArm,
    tippingDirection: Math.sign(leverArm),
    angleError,
  }
}

export function analyzeStructureStability(blocks, platforms = [], options = {}) {
  if (!Array.isArray(blocks) || !Array.isArray(platforms)) {
    throw new TypeError('blocks and platforms must be arrays')
  }
  const keys = blocks.map((block, index) => block.id ?? block.key ?? index)
  if (new Set(keys).size !== keys.length) throw new RangeError('blocks must have unique identities')

  const supportedIds = new Set()
  const supportById = new Map()
  const blockKeySet = new Set(keys)
  const jointNeighbors = new Map(keys.map((key) => [key, []]))
  if (Array.isArray(options.joints)) {
    for (const joint of options.joints) {
      if (!joint || joint.broken
        || !blockKeySet.has(joint.firstId) || !blockKeySet.has(joint.secondId)) continue
      jointNeighbors.get(joint.firstId).push({ otherId: joint.secondId, joint })
      jointNeighbors.get(joint.secondId).push({ otherId: joint.firstId, joint })
    }
  }
  const suspendedSupport = (key, analysis) => {
    const tether = jointNeighbors.get(key)?.find(({ otherId }) => supportedIds.has(otherId))
    if (!tether) return null
    const angleTolerance = Number(options.angleTolerance ?? 2)
    return {
      ...analysis,
      hasContact: false,
      supported: true,
      settled: Math.abs(analysis.angleError) <= angleTolerance,
      supportMode: 'joint',
      suspended: true,
      jointId: tether.joint.id,
      jointKind: tether.joint.kind,
      supportedById: tether.otherId,
    }
  }
  let changed = true
  while (changed) {
    changed = false
    for (let index = 0; index < blocks.length; index += 1) {
      const key = keys[index]
      if (supportedIds.has(key)) continue
      const groundedBlocks = blocks.filter((candidate, candidateIndex) => (
        candidateIndex !== index && supportedIds.has(keys[candidateIndex])
      ))
      const physical = analyzeBlockSupport(blocks[index], [...platforms, ...groundedBlocks], options)
      const analysis = physical.supported
        ? { ...physical, supportMode: 'bearing', suspended: false }
        : suspendedSupport(key, physical) || physical
      supportById.set(key, analysis)
      if (analysis.supported) {
        supportedIds.add(key)
        changed = true
      }
    }
  }

  // Refresh details with the final grounded support graph so callers receive
  // the actual pivot span even for blocks that could not join the graph.
  const groundedBlocks = blocks.filter((block, index) => supportedIds.has(keys[index]))
  for (let index = 0; index < blocks.length; index += 1) {
    const key = keys[index]
    const physical = analyzeBlockSupport(
      blocks[index],
      [...platforms, ...groundedBlocks.filter((candidate) => candidate !== blocks[index])],
      options,
    )
    supportById.set(key, physical.supported
      ? { ...physical, supportMode: 'bearing', suspended: false }
      : suspendedSupport(key, physical) || physical)
  }

  const unstableIds = new Set(keys.filter((key) => {
    const analysis = supportById.get(key)
    return !supportedIds.has(key) || !analysis?.settled
  }))
  return { supportedIds, unstableIds, supportById }
}

export function circleLandsOnPlatform(circle, platform, velocityY, previousY = circle.y - velocityY) {
  finitePoint(circle, 'circle')
  finitePoint(platform, 'platform')
  const radius = radiusOf(circle)
  const { width, height } = rectSize(platform)
  if (!Number.isFinite(velocityY) || !Number.isFinite(previousY)) {
    throw new TypeError('velocityY and previousY must be finite')
  }
  if (velocityY <= 0) return false

  const platformLeft = platform.x - width / 2
  const platformRight = platform.x + width / 2
  const platformTop = platform.y - height / 2
  const overlapsHorizontally = circle.x + radius >= platformLeft && circle.x - radius <= platformRight
  const previousBottom = previousY + radius
  const currentBottom = circle.y + radius
  return overlapsHorizontally && previousBottom <= platformTop && currentBottom >= platformTop
}
