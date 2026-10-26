// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

/** Pure, engine-independent rules for ranked talents, fusions, and rare acorns. */
export const TALENT_PROGRESSION_VERSION = 1
export const TALENT_MAX_RANK = 3

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const level = (powerMultiplier, description, effects) => ({ powerMultiplier, description, effects })

// Rank one mirrors the existing TALENTS table exactly. Higher ranks improve
// useful breakpoints rather than merely inflating every number by one ratio.
export const TALENT_RANK_DATA = deepFreeze({
  feather: { icon: 'feather', name: '轻羽', category: 'trajectory', ranks: [
    level(1, '重力降低20%，弹道更飘。', { gravityMultiplier: 0.8 }),
    level(1.55, '重力降低28%，空中滞留更久。', { gravityMultiplier: 0.72 }),
    level(2.2, '重力降低36%，高弧射击额外保留15%速度。', { gravityMultiplier: 0.64, highArcVelocityRetention: 1.15 }),
  ] },
  power: { icon: 'power', name: '巨力', category: 'impact', ranks: [
    level(1, '橡果直接撞击伤害+1。', { damageBonus: 1 }),
    level(1.65, '橡果直接撞击伤害+2。', { damageBonus: 2 }),
    level(2.35, '直接撞击伤害+3，对Boss首次命中再+1。', { damageBonus: 3, firstBossHitDamageBonus: 1 }),
  ] },
  pack: { icon: 'pack', name: '备战', category: 'reserves', ranks: [
    level(1, '每关额外+1只橡宝，不计余弹星级与奖励；满仓装不下时，改为1枚基础弹直击+1。', { extraShots: 1, overflowDirectDamageBonus: 1, countsForReserveStars: false, countsForReserveBonus: false }),
    level(1.5, '每关额外+2只橡宝，不计余弹评价；每少装1枚，改为不同的1枚基础弹直击+1，最多强化2枚。', { extraShots: 2, overflowDirectDamageBonus: 1, countsForReserveStars: false, countsForReserveBonus: false }),
    level(2.05, '每关额外+3只橡宝，不计余弹评价；每少装1枚，改为不同的1枚基础弹直击+1，最多强化3枚。', { extraShots: 3, overflowDirectDamageBonus: 1, countsForReserveStars: false, countsForReserveBonus: false }),
  ] },
  flame: { icon: 'flame', name: '烈焰尾迹', category: 'structure', ranks: [
    level(1, '航迹首次擦过建材造1点伤害，木材再受1点灼烧。', { trailBlockDamage: 1, woodBurnDamage: 1, trailRadius: 28, trailSpawnInterval: 3, trailLifeTicks: 45, burnDurationTicks: 72 }),
    level(1.6, '火带半径提高，木材灼烧伤害提高到2。', { trailBlockDamage: 1, woodBurnDamage: 2, trailRadius: 36, trailSpawnInterval: 3, trailLifeTicks: 54, burnDurationTicks: 90 }),
    level(2.3, '火带首触伤害提高到2，木材灼烧提高到3。', { trailBlockDamage: 2, woodBurnDamage: 3, trailRadius: 44, trailSpawnInterval: 2, trailLifeTicks: 62, burnDurationTicks: 108 }),
  ] },
  frost: { icon: 'frost', name: '极寒体质', category: 'control', ranks: [
    level(1, '霜环范围+35%，永久脆化倍率再提高25%。', { frostRadiusMultiplier: 1.35, brittleDamageMultiplier: 1.25 }),
    level(1.65, '霜环范围+60%，永久脆化倍率再提高45%。', { frostRadiusMultiplier: 1.6, brittleDamageMultiplier: 1.45 }),
    level(2.35, '霜环范围+90%，脆化+70%，并传递至相邻1块建材。', { frostRadiusMultiplier: 1.9, brittleDamageMultiplier: 1.7, brittleSpreadTargets: 1 }),
  ] },
  leech: { icon: 'leech', name: '能量回收', category: 'reserves', ranks: [
    level(1, '击倒松鼠35%概率返还橡果。', { refundChance: 0.35 }),
    level(1.5, '击倒松鼠50%概率返还橡果。', { refundChance: 0.5 }),
    level(2.05, '击倒松鼠65%概率返还，首次失败后获得保底。', { refundChance: 0.65, pityAfterFailedRefunds: 1 }),
  ] },
  shock: { icon: 'shock', name: '共振', category: 'structure', ranks: [
    level(1, '冲击波范围+60%。', { shockwaveRadiusMultiplier: 1.6 }),
    level(1.55, '冲击波范围+90%，对连接件推力+15%。', { shockwaveRadiusMultiplier: 1.9, jointImpulseMultiplier: 1.15 }),
    level(2.2, '冲击波范围+125%，对连接件推力+30%。', { shockwaveRadiusMultiplier: 2.25, jointImpulseMultiplier: 1.3 }),
  ] },
  lucky: { icon: 'lucky', name: '幸运星', category: 'score', ranks: [
    level(1, '金橡果出现率×3，更快解锁天赋。', { goldenEggChanceMultiplier: 3 }),
    level(1.45, '金橡果出现率×4，拾取得分+25%。', { goldenEggChanceMultiplier: 4, goldenAcornScoreMultiplier: 1.25 }),
    level(1.95, '金橡果出现率×5，拾取得分+50%，每关仍只判定一次。', { goldenEggChanceMultiplier: 5, goldenAcornScoreMultiplier: 1.5 }),
  ] },
  comboM: { icon: 'comboM', name: '连击大师', category: 'score', ranks: [
    level(1, '连击加分×2，更快解锁天赋。', { comboScoreMultiplier: 2 }),
    level(1.5, '连击加分×2.75，连击容错时间+20%。', { comboScoreMultiplier: 2.75, comboWindowMultiplier: 1.2 }),
    level(2.1, '连击加分×3.5，容错+40%，五连击触发震荡。', { comboScoreMultiplier: 3.5, comboWindowMultiplier: 1.4, comboPulseAt: 5 }),
  ] },
  stonebreaker: { icon: 'stonebreaker', name: '破甲尖锥', category: 'structure', ranks: [
    level(1, '对石块伤害+1，向附近最多2块石材扩散1点裂纹伤害。', { stoneDamageBonus: 1, stoneCrackRadius: 64, stoneCrackDamage: 1, stoneCrackMaxTargets: 2 }),
    level(1.65, '对石块伤害+2，裂纹扩散至82范围内最多3块。', { stoneDamageBonus: 2, stoneCrackRadius: 82, stoneCrackDamage: 1, stoneCrackMaxTargets: 3 }),
    level(2.4, '对石块伤害+3，向104范围内最多4块扩散2点裂纹。', { stoneDamageBonus: 3, stoneCrackRadius: 104, stoneCrackDamage: 2, stoneCrackMaxTargets: 4 }),
  ] },
  blastCore: { icon: 'blastCore', name: '爆破核心', category: 'ability', ranks: [
    level(1, '爆炸橡果的爆炸半径+25%。', { explosionRadiusMultiplier: 1.25 }),
    level(1.55, '爆炸半径+45%，中心区域伤害+1。', { explosionRadiusMultiplier: 1.45, explosionCoreDamageBonus: 1 }),
    level(2.25, '爆炸半径+70%，中心伤害+2，对护盾再+1。', { explosionRadiusMultiplier: 1.7, explosionCoreDamageBonus: 2, shieldExplosionDamageBonus: 1 }),
  ] },
  tailwind: { icon: 'tailwind', name: '定风羽', category: 'trajectory', ranks: [
    level(1, '风力对橡果的影响降低50%。', { windMultiplier: 0.5 }),
    level(1.5, '风力影响降低70%，强风中的飞行速度损失减少30%。', { windMultiplier: 0.3, strongWindVelocityLossMultiplier: 0.7 }),
    level(2.05, '风力影响降低85%，强风速度损失减少55%，迎风命中额外+1伤害。', { windMultiplier: 0.15, strongWindVelocityLossMultiplier: 0.45, headwindDamageBonus: 1 }),
  ] },
  secondWind: { icon: 'secondWind', name: '绝境补给', category: 'reserves', ranks: [
    level(1, '首次耗尽时从本关弹药池补给1只伤害+1的橡宝。', { rescueShots: 1, rescuesPerLevel: 1, rescueBirdType: 'current-pool', rescueDamageBonus: 1, countsForReserveStars: false, countsForReserveBonus: false }),
    level(1.55, '补给橡宝伤害+2，优先本关未发射过的类型。', { rescueShots: 1, rescuesPerLevel: 1, rescueBirdType: 'current-pool-unplayed', rescueDamageBonus: 2, countsForReserveStars: false, countsForReserveBonus: false }),
    level(2.2, '耗尽时补给2只伤害+2的本关未发射类型橡宝。', { rescueShots: 2, rescuesPerLevel: 1, rescueBirdType: 'current-pool-unplayed', rescueDamageBonus: 2, countsForReserveStars: false, countsForReserveBonus: false }),
  ] },
  tacticalMagazine: { icon: 'tacticalMagazine', name: '战术弹仓', category: 'reserves', ranks: [
    level(1, '解锁待发序列换位，可在瞄准前把任意待发橡宝换到发射位。', { queueSelectionEnabled: true }),
    level(1.55, '换位后的下一发获得战术装填，直接撞击伤害+1。', { queueSelectionEnabled: true, queueSwapDirectDamageBonus: 1 }),
    level(2.25, '战术装填进一步使下一发发射动能+12%，主动技能威力+18%。', { queueSelectionEnabled: true, queueSwapDirectDamageBonus: 1, queueSwapVelocityMultiplier: 1.12, queueSwapAbilityPowerMultiplier: 1.18 }),
  ] },
  windTrace: { icon: 'windTrace', name: '风迹推演', category: 'trajectory', ranks: [
    level(1, '横风关显示金色风偏落点与风廊趋势；不替代设置中的蓝色精确弹道。', { windTraceGuideEnabled: true, windTraceLandingMarkerEnabled: true, windCorridorPreviewEnabled: true }),
    level(1.45, '保留金色推演；首次接触横风提醒。风力≥0.035时首次直击伤害+0.5，保留速度+4%。', { windTraceGuideEnabled: true, windTraceLandingMarkerEnabled: true, windCorridorPreviewEnabled: true, windTraceFirstContactHintEnabled: true, windPrecisionMinimumWind: 0.035, windPrecisionDirectDamageBonus: 0.5, windPrecisionVelocityRetention: 1.04 }),
    level(2.1, '风力达到0.035时完成风中直击，伤害+1并额外保留8%飞行速度。', { windTraceGuideEnabled: true, windTraceLandingMarkerEnabled: true, windCorridorPreviewEnabled: true, windTraceFirstContactHintEnabled: true, windPrecisionMinimumWind: 0.035, windPrecisionDirectDamageBonus: 1, windPrecisionVelocityRetention: 1.08 }),
  ] },
})

export const TALENT_PROGRESSION_IDS = deepFreeze(Object.keys(TALENT_RANK_DATA))
const TALENT_IDS = new Set(TALENT_PROGRESSION_IDS)
const fusion = (id, name, talentIds, bonusDescription, bonusEffects) => ({
  id, name, talentIds: [...talentIds].sort((a, b) => a.localeCompare(b, 'en')),
  rankRequired: TALENT_MAX_RANK, bonusDescription, bonusEffects,
})

// Fusions retain both rank-three effects. A source talent can be used by only
// one fusion, preventing exponential fusion chains.
export const TALENT_FUSIONS = deepFreeze({
  faultCrown: fusion('faultCrown', '破城王冠', ['power', 'stonebreaker'], '重击石材会沿承重链引爆定向地裂。', { structuralFractureDamage: 2, structuralFractureMaxTargets: 3, structuralFractureRadius: 128 }),
  sunforgeCore: fusion('sunforgeCore', '日铸爆心', ['blastCore', 'flame'], '爆炸点燃建材，已燃目标触发一次热浪。', { explosionsIgnite: true, burningTargetHeatwaveDamage: 2, heatwaveOncePerTarget: true }),
  frozenThunder: fusion('frozenThunder', '冻雷共鸣', ['frost', 'shock'], '冲击波命中冻脆建材时追加碎冰并传递。', { frozenShockDamage: 2, frozenShockChainTargets: 2, frozenShockChainsOnce: true }),
  windSovereign: fusion('windSovereign', '巡风之翼', ['feather', 'tailwind'], '穿越强风区后获得3秒御风并强化下次直击。', { windborneDurationTicks: 180, windborneVelocityLossMultiplier: 0.5, windborneDamageBonus: 1 }),
  expeditionArsenal: fusion('expeditionArsenal', '远征军械库', ['pack', 'secondWind'], '每关最后一只额外橡宝变为王牌补给：直伤+2且技能后额外保留速度。', { aceSupplyDamageBonus: 2, aceSupplyVelocityRetention: 1.18, aceSupplyCount: 1 }),
  goldenCadence: fusion('goldenCadence', '金色连奏', ['comboM', 'lucky'], '每关首次5连击直接获得3500额外分数。', { comboPickupAt: 5, scorePickupValue: 3500, currencyReward: 0, triggersPerLevel: 1 }),
  thermalRift: fusion('thermalRift', '霜火裂变', ['flame', 'frost'], '冻脆建材首次被点燃时引发热冲击并削弱连接。', { thermalShockDamage: 3, thermalJointStrengthMultiplier: 0.8, thermalShockOncePerBlock: true }),
  chainBombard: fusion('chainBombard', '连锁爆幕', ['blastCore', 'comboM'], '爆炸同时命中3个目标时追加一枚小型定点爆破。', { chainBlastMinimumHits: 3, chainBlastRadiusMultiplier: 0.55, chainBlastDamage: 2, chainBlastsPerShot: 1 }),
  windchartArsenal: fusion('windchartArsenal', '风算弹仓', ['tacticalMagazine', 'windTrace'], '预演待发前三枚的风偏；换位强化弹在横风中直击时再获得风算增幅。', { forecastQueueSlots: 3, forecastSwapWindDamageBonus: 1, forecastSwapVelocityRetention: 1.08 }),
})
export const TALENT_FUSION_IDS = deepFreeze(Object.keys(TALENT_FUSIONS))
const FUSION_IDS = new Set(TALENT_FUSION_IDS)
const FUSION_BY_PAIR = new Map(TALENT_FUSION_IDS.map((id) => [TALENT_FUSIONS[id].talentIds.join('+'), TALENT_FUSIONS[id]]))

// `type` is the persistent exclusive id. `fallbackType` keeps old runtimes
// playable until bespoke art/ability support lands; it must never overwrite type.
export const SPECIAL_ACORN_TALENTS = deepFreeze({
  emberheart: {
    id: 'emberheart', name: '燃冠契约', unlockAtTotalRanks: 3,
    requiresAnyAcornTypes: ['red', 'bomb', 'fire'],
    description: '获得天赋专属的熔心橡宝，命中后附着并从建材内部引燃。',
    contract: { type: 'talent-emberheart', baseType: 'fire', fallbackType: 'fire', title: '熔心橡宝', abilityId: 'talent-molten-heart', copiesPerLevel: 1, grantTiming: 'each-level-start', queuePolicy: 'insert-middle', exclusiveToTalent: true, countsForReserveStars: false, countsForReserveBonus: false, ability: { attachOnImpact: true, pulseDamage: 3, pulseCount: 4, pulseIntervalTicks: 8, pulseRadius: 72 } },
  },
  prismBell: {
    id: 'prismBell', name: '冰镜契约', unlockAtTotalRanks: 4,
    requiresAnyAcornTypes: ['frost', 'boomerang'],
    description: '获得镜霜橡宝，霜环可被墙面反射一次。',
    contract: { type: 'talent-prism-bell', baseType: 'frost', fallbackType: 'frost', title: '镜霜橡宝', abilityId: 'talent-prismatic-frost', copiesPerLevel: 1, grantTiming: 'each-level-start', queuePolicy: 'insert-middle', exclusiveToTalent: true, countsForReserveStars: false, countsForReserveBonus: false, ability: { reflectedRings: 1, ringRadius: 140, reflectedRingScale: 0.88, reflectionReachMultiplier: 1.9, permanentBlockFreeze: true, brittleDamageMultiplier: 2.3 } },
  },
  thunderRoot: {
    id: 'thunderRoot', name: '雷根契约', unlockAtTotalRanks: 5,
    requiresAnyAcornTypes: ['dash', 'drill', 'quake'],
    description: '获得雷根橡宝，扎地后沿承重路径追踪三个连接点。',
    contract: { type: 'talent-thunder-root', baseType: 'quake', fallbackType: 'quake', title: '雷根橡宝', abilityId: 'talent-root-lightning', copiesPerLevel: 1, grantTiming: 'each-level-start', queuePolicy: 'insert-middle', exclusiveToTalent: true, countsForReserveStars: false, countsForReserveBonus: false, ability: { chainTargets: 5, jointDamage: 3, blockDamage: 2, chainRadius: 185 } },
  },
})
export const SPECIAL_ACORN_TALENT_IDS = deepFreeze(Object.keys(SPECIAL_ACORN_TALENTS))
const SPECIAL_IDS = new Set(SPECIAL_ACORN_TALENT_IDS)

export const TALENT_PROGRESSION_SCHEMA = deepFreeze({
  version: TALENT_PROGRESSION_VERSION,
  ranks: 'sparse canonical talent id -> integer 1..3',
  fusionIds: 'ordered ids; sources stay rank three and may be consumed once',
  specialTalentIds: 'ordered one-time rare talent ids',
  candidateKinds: ['upgrade', 'fusion', 'special-acorn'],
  selectionIdFormats: ['upgrade/<talent-id>/<target-rank>', 'fusion/<fusion-id>', 'special/<special-id>'],
})

const rankValue = (value) => {
  const number = typeof value === 'string' && /^\d+$/u.test(value.trim()) ? Number(value) : value
  return Number.isFinite(number) ? Math.max(0, Math.min(3, Math.floor(number))) : 0
}
const enabledIds = (value) => Array.isArray(value)
  ? value.filter((id) => typeof id === 'string')
  : isRecord(value) ? Object.entries(value).filter(([, on]) => Boolean(on)).map(([id]) => id) : []

export function normalizeTalentProgression(value = {}) {
  const source = isRecord(value) ? value : {}
  const rawRanks = isRecord(source.ranks) ? source.ranks : isRecord(source.talents) ? source.talents : {}
  const ranks = {}
  for (const id of TALENT_PROGRESSION_IDS) {
    const current = rankValue(rawRanks[id])
    if (current) ranks[id] = current
  }
  const requestedFusions = new Set(enabledIds(source.fusionIds ?? source.fusions))
  const fusionIds = []
  const used = new Set()
  for (const id of TALENT_FUSION_IDS) {
    const entry = TALENT_FUSIONS[id]
    if (!requestedFusions.has(id) || !entry.talentIds.every((talentId) => ranks[talentId] === 3)) continue
    if (entry.talentIds.some((talentId) => used.has(talentId))) continue
    fusionIds.push(id)
    entry.talentIds.forEach((talentId) => used.add(talentId))
  }
  const requestedSpecials = new Set(enabledIds(source.specialTalentIds ?? source.specialTalents))
  const normalizedTotalRanks = Object.values(ranks).reduce((sum, current) => sum + current, 0)
  return deepFreeze({
    version: TALENT_PROGRESSION_VERSION, ranks, fusionIds,
    specialTalentIds: SPECIAL_ACORN_TALENT_IDS.filter((id) => requestedSpecials.has(id)
      && normalizedTotalRanks >= SPECIAL_ACORN_TALENTS[id].unlockAtTotalRanks),
  })
}

export const talentRankOf = (value, talentId) => TALENT_IDS.has(talentId)
  ? normalizeTalentProgression(value).ranks[talentId] ?? 0 : 0
export const getTalentRankData = (talentId, talentRank) => TALENT_IDS.has(talentId) && rankValue(talentRank) > 0
  ? TALENT_RANK_DATA[talentId].ranks[rankValue(talentRank) - 1] : null
export const canOfferTalentUpgrade = (value, talentId) => TALENT_IDS.has(talentId)
  && talentRankOf(value, talentId) < TALENT_MAX_RANK

export function fusionForTalents(first, second) {
  if (first === second) return null
  const key = [first, second].sort((a, b) => a.localeCompare(b, 'en')).join('+')
  return FUSION_BY_PAIR.get(key) ?? null
}

export function availableTalentFusions(value) {
  const state = normalizeTalentProgression(value)
  const used = new Set(state.fusionIds.flatMap((id) => TALENT_FUSIONS[id].talentIds))
  return deepFreeze(TALENT_FUSION_IDS.map((id) => TALENT_FUSIONS[id]).filter((entry) => (
    entry.talentIds.every((talentId) => state.ranks[talentId] === 3 && !used.has(talentId))
  )))
}

const totalRanks = (state) => Object.values(state.ranks).reduce((sum, current) => sum + current, 0)
const upgradeCandidate = (state, id) => {
  const currentRank = state.ranks[id] ?? 0
  const targetRank = currentRank + 1
  const talent = TALENT_RANK_DATA[id]
  const rankData = talent.ranks[targetRank - 1]
  return deepFreeze({ selectionId: `upgrade/${id}/${targetRank}`, kind: 'upgrade', talentId: id, currentRank, targetRank, title: `${talent.name} · ${targetRank}级`, description: rankData.description, powerMultiplier: rankData.powerMultiplier, effects: rankData.effects })
}
const fusionCandidate = (entry) => deepFreeze({ selectionId: `fusion/${entry.id}`, kind: 'fusion', fusionId: entry.id, sourceTalentIds: entry.talentIds, title: entry.name, description: `保留${entry.talentIds.map((id) => TALENT_RANK_DATA[id].name).join('与')}的三级效果；${entry.bonusDescription}`, bonusEffects: entry.bonusEffects })
const specialCandidate = (entry) => deepFreeze({ selectionId: `special/${entry.id}`, kind: 'special-acorn', specialTalentId: entry.id, title: entry.name, description: entry.description, acornContract: entry.contract })

// Normal upgrades are supplied by the existing encounter-affinity selector.
// Thus unrelated talents never leak into a level merely because they can rank.
export function buildTalentCandidatePool({ progression, eligibleTalentIds = TALENT_PROGRESSION_IDS, acornTypes = [], includeFusions = true, includeSpecialAcorns = true } = {}) {
  const state = normalizeTalentProgression(progression)
  const eligible = new Set(Array.isArray(eligibleTalentIds) ? eligibleTalentIds : [])
  const candidates = TALENT_PROGRESSION_IDS
    .filter((id) => eligible.has(id) && canOfferTalentUpgrade(state, id))
    .map((id) => upgradeCandidate(state, id))
  if (includeFusions) availableTalentFusions(state)
    .filter((entry) => entry.talentIds.every((id) => eligible.has(id)))
    .forEach((entry) => candidates.push(fusionCandidate(entry)))
  if (includeSpecialAcorns) {
    const types = new Set(Array.isArray(acornTypes) ? acornTypes : [])
    for (const id of SPECIAL_ACORN_TALENT_IDS) {
      const entry = SPECIAL_ACORN_TALENTS[id]
      if (!state.specialTalentIds.includes(id) && totalRanks(state) >= entry.unlockAtTotalRanks
        && entry.requiresAnyAcornTypes.some((type) => types.has(type))) candidates.push(specialCandidate(entry))
    }
  }
  return deepFreeze(candidates)
}

const randomFromSeed = (seed) => {
  let state = (Number.isFinite(Number(seed)) ? Math.trunc(Number(seed)) : 1) >>> 0 || 0x9e3779b9
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}
const weight = (candidate, weights) => {
  if (candidate.kind === 'fusion') return 8
  if (candidate.kind === 'special-acorn') return 1.35
  const contextual = Number(weights?.[candidate.talentId])
  return (Number.isFinite(contextual) && contextual > 0 ? contextual : 1) * (1 + candidate.currentRank * 0.12)
}

// Guarantees one ready fusion. Normal weighted choices still prefer the
// affinity weights passed by the current level; rare acorns are capped at one.
export function buildTalentCandidates(options = {}) {
  const limit = Math.max(0, Math.floor(Number(options.count ?? 3) || 0))
  if (!limit) return deepFreeze([])
  const pool = [...buildTalentCandidatePool(options)]
  const random = randomFromSeed(options.seed ?? 1)
  const selected = []
  const fusionIndexes = pool.map((item, index) => item.kind === 'fusion' ? index : -1).filter((index) => index >= 0)
  if (fusionIndexes.length) selected.push(pool.splice(fusionIndexes[Math.floor(random() * fusionIndexes.length)], 1)[0])
  const chance = Math.max(0, Math.min(1, Number(options.specialAcornChance ?? 0.22) || 0))
  if (selected.length < limit && random() < chance) {
    const indexes = pool.map((item, index) => item.kind === 'special-acorn' ? index : -1).filter((index) => index >= 0)
    if (indexes.length) selected.push(pool.splice(indexes[Math.floor(random() * indexes.length)], 1)[0])
  }
  // A failed rarity roll means no contract this draft. Removing the remaining
  // contracts also guarantees at most one rare offer when the roll succeeds.
  for (let index = pool.length - 1; index >= 0; index -= 1) {
    if (pool[index].kind === 'special-acorn') pool.splice(index, 1)
  }
  while (selected.length < limit && pool.length) {
    const weights = pool.map((item) => weight(item, options.talentWeights))
    let roll = random() * weights.reduce((sum, current) => sum + current, 0)
    let index = weights.length - 1
    for (let cursor = 0; cursor < weights.length; cursor += 1) {
      roll -= weights[cursor]
      if (roll <= 0) { index = cursor; break }
    }
    selected.push(pool.splice(index, 1)[0])
  }
  return deepFreeze(selected)
}

const parseChoice = (choice) => {
  if (isRecord(choice) && typeof choice.selectionId === 'string') return parseChoice(choice.selectionId)
  if (isRecord(choice)) return choice
  if (typeof choice !== 'string') return null
  const [kind, id, rawRank] = choice.split('/')
  if (kind === 'upgrade' && id && /^[1-3]$/u.test(rawRank || '')) {
    return { kind, talentId: id, targetRank: Number(rawRank) }
  }
  if (kind === 'fusion' && id && !rawRank) return { kind, fusionId: id }
  if (kind === 'special' && id && !rawRank) return { kind: 'special-acorn', specialTalentId: id }
  return null
}

export function isTalentCandidateLegal(value, choice) {
  const state = normalizeTalentProgression(value)
  const selected = parseChoice(choice)
  if (!selected) return false
  if (selected.kind === 'upgrade') return TALENT_IDS.has(selected.talentId)
    && (state.ranks[selected.talentId] ?? 0) < 3
    && selected.targetRank === (state.ranks[selected.talentId] ?? 0) + 1
  if (selected.kind === 'fusion') return FUSION_IDS.has(selected.fusionId)
    && availableTalentFusions(state).some((entry) => entry.id === selected.fusionId)
  if (selected.kind === 'special-acorn') return SPECIAL_IDS.has(selected.specialTalentId)
    && !state.specialTalentIds.includes(selected.specialTalentId)
    && totalRanks(state) >= SPECIAL_ACORN_TALENTS[selected.specialTalentId].unlockAtTotalRanks
  return false
}

export function applyTalentChoice(value, choice) {
  const state = normalizeTalentProgression(value)
  const selected = parseChoice(choice)
  if (!isTalentCandidateLegal(state, selected)) throw new RangeError('illegal talent progression choice')
  const ranks = { ...state.ranks }
  const fusionIds = [...state.fusionIds]
  const specialTalentIds = [...state.specialTalentIds]
  if (selected.kind === 'upgrade') ranks[selected.talentId] = selected.targetRank
  if (selected.kind === 'fusion') fusionIds.push(selected.fusionId)
  if (selected.kind === 'special-acorn') specialTalentIds.push(selected.specialTalentId)
  return normalizeTalentProgression({ ranks, fusionIds, specialTalentIds })
}

export function resolveTalentProgression(value) {
  const state = normalizeTalentProgression(value)
  const talentEffects = Object.fromEntries(Object.entries(state.ranks).map(([id, current]) => [id, getTalentRankData(id, current).effects]))
  const fusionBonuses = Object.fromEntries(state.fusionIds.map((id) => [id, { sourceTalentIds: TALENT_FUSIONS[id].talentIds, effects: TALENT_FUSIONS[id].bonusEffects }]))
  const specialAcornGrants = state.specialTalentIds.map((id) => SPECIAL_ACORN_TALENTS[id].contract)
  return deepFreeze({ talentEffects, fusionBonuses, specialAcornGrants })
}

export const serializeTalentProgression = (value) => JSON.stringify(normalizeTalentProgression(value))
export function deserializeTalentProgression(serialized) {
  if (typeof serialized !== 'string') return null
  try {
    const value = JSON.parse(serialized)
    if (!isRecord(value) || (value.version !== undefined && value.version !== TALENT_PROGRESSION_VERSION)) return null
    return normalizeTalentProgression(value)
  } catch { return null }
}
