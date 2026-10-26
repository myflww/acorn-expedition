// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

// Visual storytelling stays data-driven and deliberately avoids gameplay
// concepts such as target positions or projectile paths. The renderer combines
// these scene signatures with the campaign's existing theme layers and numeric
// parameters, so authored campaign data remains the source of truth.
export const SPECIAL_BACKGROUND_BLUEPRINTS = deepFreeze({
  'polar-clocktower': {
    silhouette: 'frozen-clock-spire',
    weather: 'snow-and-aurora',
    landmark: 'midnight-clockface',
    horizon: 'glacier-ridge',
    locationLabel: '北境永夜高台',
    narrativeCues: ['冻结齿轮', '停在十二点前的钟面', '被极光撕开的雪岭'],
    landmarkPlacement: { x: 0.87, y: 0.31, scale: 1.08, opacity: 0.48 },
    readability: { combatWash: 'rgba(17,27,60,.10)', maximumDetailOpacity: 0.5 },
  },
  'tidebound-undercity': {
    silhouette: 'drowned-harbor-arcade',
    weather: 'tide-mist-and-bubbles',
    landmark: 'sunken-bell-harbor',
    horizon: 'flooded-rooftops',
    locationLabel: '南岸潮缚旧港',
    narrativeCues: ['半淹拱廊', '水下浮力钟', '潮雾中的港灯'],
    landmarkPlacement: { x: 0.84, y: 0.28, scale: 1.04, opacity: 0.43 },
    readability: { combatWash: 'rgba(22,70,91,.08)', maximumDetailOpacity: 0.46 },
  },
  'mirrorwood-labyrinth': {
    silhouette: 'silver-trunk-labyrinth',
    weather: 'prism-mist',
    landmark: 'split-mirror-gate',
    horizon: 'white-paper-grove',
    locationLabel: '无图镜林白径',
    narrativeCues: ['重复树影', '裂成两条路的镜门', '棱镜彩虹'],
    landmarkPlacement: { x: 0.82, y: 0.3, scale: 1.02, opacity: 0.36 },
    readability: { combatWash: 'rgba(248,252,251,.18)', maximumDetailOpacity: 0.4 },
  },
  'deep-root-fault': {
    silhouette: 'root-cavern-vault',
    weather: 'ore-dust',
    landmark: 'abandoned-mine-headframe',
    horizon: 'fault-strata',
    locationLabel: '主树根下断层',
    narrativeCues: ['压低的顶岩', '被挖成轨道的根脉', '废弃矿灯'],
    landmarkPlacement: { x: 0.85, y: 0.33, scale: 1.05, opacity: 0.46 },
    readability: { combatWash: 'rgba(23,21,29,.08)', maximumDetailOpacity: 0.48 },
  },
  'stormline-skyport': {
    silhouette: 'suspended-skyport',
    weather: 'thundercloud-and-rain',
    landmark: 'distant-mail-airship',
    horizon: 'storm-cloud-sea',
    locationLabel: '雷暴眼邮路航站',
    narrativeCues: ['悬空缆塔', '远方邮船', '雷云后的交叉锁链'],
    landmarkPlacement: { x: 0.83, y: 0.27, scale: 1.08, opacity: 0.45 },
    readability: { combatWash: 'rgba(40,49,95,.08)', maximumDetailOpacity: 0.48 },
  },
})

const sceneCache = new WeakMap()

export function buildSpecialBackgroundScene(campaign, stage = null) {
  const campaignId = campaign?.id
  const blueprint = SPECIAL_BACKGROUND_BLUEPRINTS[campaignId]
  if (!blueprint) return null
  const stageNumber = clamp(Math.floor(Number(stage?.number) || 1), 1, 4)
  const cachedStages = sceneCache.get(campaign)
  if (cachedStages?.has(stageNumber)) return cachedStages.get(stageNumber)
  const theme = campaign.theme || {}
  const background = theme.background || {}
  const scene = deepFreeze({
    id: `${background.id || campaignId}-scene-${stageNumber}`,
    campaignId,
    stageNumber,
    stageTitle: stage?.title || campaign.title,
    storyBeat: stage?.storyBeat || campaign.story?.opening || '',
    progress: stageNumber / 4,
    colors: { ...(theme.colors || {}) },
    sourceBackgroundId: background.id || '',
    sourceLayers: [...(background.layers || [])],
    parameters: { ...(background.parameters || {}) },
    ...blueprint,
  })
  const stages = cachedStages || new Map()
  stages.set(stageNumber, scene)
  if (!cachedStages) sceneCache.set(campaign, stages)
  return scene
}

export function validateSpecialBackgroundScenes(campaigns) {
  const errors = []
  const silhouettes = new Set()
  const weatherKinds = new Set()
  const landmarks = new Set()
  for (const campaign of campaigns || []) {
    const scene = buildSpecialBackgroundScene(campaign, campaign.stages?.[0])
    if (!scene) {
      errors.push(`${campaign?.id || 'unknown'}: missing special background blueprint`)
      continue
    }
    if (scene.sourceLayers.length < 4) errors.push(`${campaign.id}: theme layers were not consumed`)
    if (Object.keys(scene.parameters).length < 4) errors.push(`${campaign.id}: theme parameters were not consumed`)
    if (!scene.storyBeat) errors.push(`${campaign.id}: stage narrative is missing`)
    if (scene.narrativeCues.length < 3) errors.push(`${campaign.id}: insufficient narrative cues`)
    const placement = scene.landmarkPlacement
    if (![placement.x, placement.y, placement.scale, placement.opacity].every(Number.isFinite)) {
      errors.push(`${campaign.id}: landmark placement must be finite`)
    }
    if (placement.x < 0.72 || placement.x > 0.94 || placement.y < 0.12 || placement.y > 0.42) {
      errors.push(`${campaign.id}: landmark must stay at the upper-right edge of the combat field`)
    }
    if (placement.opacity > scene.readability.maximumDetailOpacity) {
      errors.push(`${campaign.id}: landmark exceeds the combat readability opacity`)
    }
    silhouettes.add(scene.silhouette)
    weatherKinds.add(scene.weather)
    landmarks.add(scene.landmark)
  }
  if (silhouettes.size !== (campaigns?.length || 0)) errors.push('silhouettes must be unique per campaign')
  if (weatherKinds.size !== (campaigns?.length || 0)) errors.push('weather must be unique per campaign')
  if (landmarks.size !== (campaigns?.length || 0)) errors.push('landmarks must be unique per campaign')
  return deepFreeze({ valid: errors.length === 0, errors })
}
