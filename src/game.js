// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { objectiveBeacons } from './desktop-tactics.js'
import {
  ACORN_HITBOX_BONUS,
  ACHIEVEMENT_REWARDS,
  AIM_GUIDE_MODE_LABELS,
  AIM_GUIDE_STYLE,
  BLOCK_MATERIALS,
  CONSTRUCTION_MATERIALS,
  EPILOGUE,
  FRICTION,
  FIRE_ACORN,
  GRAVITY,
  GROUND_Y,
  MAIN_LEVELS,
  MAX_PULL,
  MAX_WIND_MAGNITUDE,
  MAX_ZOOM,
  MIN_ZOOM,
  ORDINARY_ACORN_IMPACT_RULES,
  POWER,
  Rng,
  SLING_X,
  SLING_Y,
  STORY,
  STRUCTURE_STABILITY_RULES,
  TALENTS,
  TALENT_SCORE_MILESTONES,
  VIEWPORT,
  advanceAcornLifecycleCounters,
  advanceTalentUnlockOnClear,
  aimGuideVisualMetrics,
  analyzeBlockSupport,
  analyzeStructureStability,
  awardAchievement,
  birdTypePool,
  buildBossSpawnPreferences,
  buildMainAmmoQueue,
  buildStructureJoints,
  calculateVerticalDrillActivation,
  calculateClearResult,
  calculateOverviewCamera,
  calculateShotBudget,
  calculateStructureWindLoad,
  calculateTalentUnlockProgress,
  chooseContextualTalentOptions,
  circleIntersectsRect,
  circleLandsOnPlatform,
  circleRectCollisionManifold,
  circlesOverlap,
  clamp,
  createDefaultSaveData,
  dateSeed,
  evaluateTalentAffinity,
  evaluateAcornLifecycle,
  evaluateAcornStructureImpact,
  evaluateFallingDebrisDamage,
  evaluateLevelClear,
  findNearestCircleClearPosition,
  findSafeCircleSpawnPosition,
  generateLevel,
  isHardStructureMaterial,
  mixSeed,
  nextAimGuideMode,
  normalizeSaveData,
  rectCollisionManifold,
  resolveSquirrelSolidCollision,
  resolveSweptCircleRectCollision,
  rotatedRectBounds,
  shouldWakeStructureBlock,
  structureContactPairKey,
  structureJointCountsForLevel,
  structureJointKindsForLevel,
  windForPendingLaunch,
} from './game-core.js'
import { AUDIO_MUSIC_THEME, SoundFX } from './audio.js'
import { DISCOVERIES, discoveryArtMarkup } from './discoveries.js'
import {
  SPECIAL_ACORN_BY_TYPE,
  SPECIAL_ACORNS,
  SPECIAL_SQUIRREL_BY_TYPE,
  SPECIAL_SQUIRRELS,
  calculateVineWinchVelocity,
  evaluateVineWinchDisplacement,
  evaluateVineWinchLineOfSight,
  planVineWinchActivation,
  selectVineWinchTarget,
} from './special-roster.js'
import {
  SPECIAL_CAMPAIGNS,
  SPECIAL_STAGE_COUNT_PER_CAMPAIGN,
  getSpecialCampaign,
  getSpecialStage,
} from './special-campaigns.js'
import {
  buildSpecialShotQueue,
  calculateStructuralCollapseRatio,
  evaluateSpecialObjective,
  generateSpecialLevel,
} from './special-levels.js'
import { talentIconMarkup } from './talent-icons.js'
import {
  SPECIAL_ACORN_TALENTS,
  TALENT_FUSIONS,
  TALENT_RANK_DATA,
  applyTalentChoice,
  buildTalentCandidates,
  normalizeTalentProgression,
  resolveTalentProgression,
} from './talent-progression.js'
import {
  createRunCheckpoint,
} from './run-checkpoint.js'
import {
  RUN_SLOT_IDS,
  clearRunSlot,
  createRunSlots,
  getLastActiveRunCheckpoint,
  getRunSlot,
  normalizeRunSlots,
  runSlotIdFor,
  updateRunSlot,
} from './run-slots.js'
import {
  consumeSpecialChallengeEvent,
  createSpecialChallengeState,
  normalizeSpecialChallengeRecords,
  recordSpecialChallengeCompletion,
  summarizeSpecialChallenge,
} from './special-challenges.js'
import {
  buildDailyChallenge,
  claimDailyChallengeReward,
  getDailyChallengeStatus,
  normalizeDailyChallengeState,
  recordDailyChallengeSegment,
} from './daily-challenges.js'
import {
  claimElderAid,
  createFailureAidState,
  normalizeFailureAidState,
  recordLevelFailure,
  syncFailureAidLevel,
} from './failure-aid.js'
import { claimGoldenAcornReward, normalizeEncounterRewards } from './encounter-rewards.js'
import {
  evaluateEmergencySupplyEligibility,
  purchaseEmergencySupply,
  quoteEmergencySupply,
} from './emergency-supply.js'
import { getMainEnvironmentTheme } from './main-environment-themes.js'
import {
  DEFAULT_TERRAIN_PROFILE,
  resolveTerrainGroundContact,
  terrainRuleAtX,
} from './terrain-rules.js'
import { buildSpecialBackgroundScene } from './special-backgrounds.js'
import { swapLoadedAmmoWithQueue } from './ammo-queue.js'
import {
  applyDestructiblePlatformImpact,
  destructiblePlatformCarrierHitboxes,
  initializeDestructiblePlatform,
} from './destructible-platforms.js'
import {
  createArchitectureMechanismBindings,
  resolveArchitectureMechanismModel,
} from './architecture-mechanisms.js'
import { planSpanFracture } from './span-fracture.js'

const SAVE_KEY = 'acorn-expedition:save:v1'
const CHECKPOINT_KEY = 'acorn-expedition:checkpoint:v1'
const LEGACY_SAVE_KEYS = ['acorn-expedition.save.v1', 'acorn-expedition.save', 'acornSave']
const SAVE_VERSION = 1
const QA_MODE = new URLSearchParams(window.location.search).get('qa') === '1'
const STEP_MS = 1000 / VIEWPORT.fps
const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
let prefersReducedMotion = reducedMotionPreference.matches
let reducedMotionOverride = null
reducedMotionPreference.addEventListener?.('change', (event) => {
  prefersReducedMotion = reducedMotionOverride ?? event.matches
  document.body.dataset.reducedMotion = String(prefersReducedMotion)
})
const ANCHOR_Y = SLING_Y - 55
const MENU_SKY = 0x2c3e66
const STORY_SKY = 0x1b2440
const TALENT_SKY = 0x24304f
const VICTORY_SKY = 0xffb347
const EXIT_SKY = 0x162b24
const WORLD_MIN_X = -350
const WORLD_MAX_X = 1450
const STRUCTURE_CONTACT_TOLERANCE = 4
const STRUCTURE_ANGLE_TOLERANCE = 3
const BLOCK_SLEEP_TICKS = 6
const DAILY_LEVELS = 3
const DAILY_CONTENT_LEVELS = Object.freeze([6, 11, 16])
const BOSS_SPAWN_PROTECTION_TICKS = Math.round(900 / STEP_MS)
const BOMB_ABILITY = Object.freeze({ radius: 130, structureDamage: 4 })
const STRUCTURE_IMPULSE_BY_BIRD = Object.freeze({
  red: 0.16,
  bomb: 0.28,
  split: 0.16,
  dash: 0.22,
  fire: 0.2,
  drill: 0.28,
  frost: 0.18,
  vine: 0.32,
  boomerang: 0.26,
  quake: 0.32,
  'talent-emberheart': 0.22,
  'talent-prism-bell': 0.2,
  'talent-thunder-root': 0.34,
})

const ART = Object.freeze({
  ink: '#08150f',
  pine: '#12281e',
  pineLight: '#1c382a',
  parchment: '#ead9b4',
  ivory: '#faf3df',
  brass: '#d7aa55',
  moss: '#728b55',
  oak: '#bc6842',
  danger: '#c85343',
  ice: '#a4dce1',
})

const ACHIEVEMENTS = Object.freeze({
  first_blood: '徽章 · 首次击倒',
  ten_kills: '徽章 · 松鼠收割者（累计50）',
  egg_hunter: '徽章 · 金橡果猎人',
  combo5: '徽章 · 五连击',
  reach_lv10: '徽章 · 主线通关',
  boss_slayer: '徽章 · 首领终结者',
  daily_win: '徽章 · 每日挑战首胜',
  special_first: '徽章 · 秘境踏足者',
  special_all: '徽章 · 五境归来',
})

const SPECIAL_BIRD_STYLES = Object.fromEntries(SPECIAL_ACORNS.map((entry) => [entry.type, {
  shell: entry.visual.palette.shell,
  cap: entry.visual.palette.cap,
  accent: entry.visual.palette.accent,
  outline: entry.visual.palette.outline,
  radius: entry.stats.radius,
  name: entry.title,
  ability: entry.action.replace(/^飞行中点击 · /u, '点击 / 空格：'),
  trail: entry.visual.palette.accent,
}]))

const TALENT_ACORN_CONTRACT_BY_TYPE = Object.freeze(Object.fromEntries(
  Object.values(SPECIAL_ACORN_TALENTS).map((entry) => [entry.contract.type, entry.contract]),
))
const TALENT_ACORN_STYLES = Object.freeze({
  'talent-emberheart': {
    shell: '#b83d2d', cap: '#3c201c', accent: '#ffcf58', outline: '#351512', radius: 17,
    name: '熔心橡宝', ability: '点击 / 空格：唤醒熔核，命中后附着并脉冲灼烧', trail: '#ff7440',
  },
  'talent-prism-bell': {
    shell: '#87d5df', cap: '#315b78', accent: '#effdff', outline: '#203d5b', radius: 16,
    name: '镜霜橡宝', ability: '点击 / 空格：释放双重折射霜环', trail: '#a9f3ff',
  },
  'talent-thunder-root': {
    shell: '#69509a', cap: '#34294f', accent: '#f5d66f', outline: '#261d3e', radius: 17,
    name: '雷根橡宝', ability: '点击 / 空格：雷根追踪五处承重点', trail: '#d6b9ff',
  },
})

const BIRD_STYLE = Object.freeze({
  red: { shell: '#a9673e', cap: '#54331f', accent: '#728b55', outline: '#40241a', radius: 15, name: '橡宝', ability: '无主动技能', trail: '#faf3df' },
  bomb: { shell: '#b94f43', cap: '#2b2523', accent: '#f5b94c', outline: '#3a211d', radius: 17, name: '爆裂橡宝', ability: '点击 / 空格：引爆', trail: '#e16845' },
  split: { shell: '#718d51', cap: '#35492e', accent: '#d9e9b6', outline: '#35452d', radius: 15, name: '双叶橡宝', ability: '点击 / 空格：分裂', trail: '#cde5a5' },
  dash: { shell: '#c99734', cap: '#6b4b1d', accent: '#fff0a8', outline: '#523b1c', radius: 15, name: '疾风橡宝', ability: '点击 / 空格：冲刺并强化撞击', trail: '#f4d46a' },
  fire: { shell: '#d96835', cap: '#5b2c24', accent: '#ffd35a', outline: '#4b211b', radius: FIRE_ACORN.stats.radius, name: FIRE_ACORN.title, ability: '点击 / 空格：点燃熔芯，接触后附着', trail: '#ff8b3d' },
  ...SPECIAL_BIRD_STYLES,
  ...TALENT_ACORN_STYLES,
})

const dom = {
  shell: document.querySelector('#game-shell'),
  canvas: document.querySelector('#game-canvas'),
  modeBadge: document.querySelector('#mode-badge'),
  muteButton: document.querySelector('#mute-button'),
  pauseButton: document.querySelector('#pause-button'),
  restartButton: document.querySelector('#restart-button'),
  settingsButton: document.querySelector('#settings-button'),
  topRail: document.querySelector('.top-rail'),
  viewportWrap: document.querySelector('.viewport-wrap'),
  controlDeck: document.querySelector('.control-deck'),
  hud: document.querySelector('#hud'),
  hudLevel: document.querySelector('#hud-level'),
  hudScore: document.querySelector('#hud-score'),
  hudBirds: document.querySelector('#hud-birds'),
  hudCondition: document.querySelector('#hud-condition'),
  hudTalents: document.querySelector('#hud-talents'),
  shotSelector: document.querySelector('#shot-selector'),
  shotSelectorHint: document.querySelector('#shot-selector-hint'),
  shotSelectorList: document.querySelector('#shot-selector-list'),
  shotSelectorToggle: document.querySelector('#shot-selector-toggle'),
  missionCard: document.querySelector('#mission-status-card'),
  missionBody: document.querySelector('#mission-status-body'),
  missionToggleButton: document.querySelector('#mission-toggle-button'),
  missionTitle: document.querySelector('#mission-status-title'),
  missionObjective: document.querySelector('#mission-objective'),
  missionObjectiveDetail: document.querySelector('#mission-objective-detail'),
  missionContract: document.querySelector('#mission-contract'),
  missionContractLabel: document.querySelector('#mission-contract-label'),
  missionContractDetail: document.querySelector('#mission-contract-detail'),
  missionContractProgress: document.querySelector('#mission-contract-progress'),
  missionContractFill: document.querySelector('#mission-contract-fill'),
  missionSquirrelProgress: document.querySelector('#mission-squirrel-progress'),
  missionSquirrelMeter: document.querySelector('#mission-squirrel-meter'),
  missionStructureRow: document.querySelector('#mission-structure-row'),
  missionStructureLabel: document.querySelector('#mission-structure-label'),
  missionStructureProgress: document.querySelector('#mission-structure-progress'),
  missionStructureMeter: document.querySelector('#mission-structure-meter'),
  missionStructureRequirement: document.querySelector('#mission-structure-requirement'),
  missionShotsRemaining: document.querySelector('#mission-shots-remaining'),
  missionStar1: document.querySelector('#mission-star-1'),
  missionStar2: document.querySelector('#mission-star-2'),
  missionStar3: document.querySelector('#mission-star-3'),
  missionStar1Condition: document.querySelector('#mission-star-1-condition'),
  missionStar2Condition: document.querySelector('#mission-star-2-condition'),
  missionStar3Condition: document.querySelector('#mission-star-3-condition'),
  missionStarTooltip: document.querySelector('#mission-star-tooltip'),
  missionStarTooltipTitle: document.querySelector('#mission-star-tooltip-title'),
  missionStarTooltipCopy: document.querySelector('#mission-star-tooltip-copy'),
  missionWindArrow: document.querySelector('#mission-wind-arrow'),
  missionWindDirection: document.querySelector('#mission-wind-direction'),
  missionWindLevel: document.querySelector('#mission-wind-level'),
  panel: document.querySelector('#screen-panel'),
  banner: document.querySelector('#banner'),
  achievement: document.querySelector('#achievement'),
  coachmark: document.querySelector('#coachmark'),
  coachmarkStep: document.querySelector('#coachmark-step'),
  coachmarkTitle: document.querySelector('#coachmark-title'),
  coachmarkCopy: document.querySelector('#coachmark-copy'),
  discoveryCard: document.querySelector('#discovery-card'),
  discoveryArt: document.querySelector('#discovery-art'),
  discoveryCategory: document.querySelector('#discovery-category'),
  discoveryTitle: document.querySelector('#discovery-title'),
  discoverySummary: document.querySelector('#discovery-summary'),
  discoveryAction: document.querySelector('#discovery-action'),
  discoveryTip: document.querySelector('#discovery-tip'),
  discoveryLore: document.querySelector('#discovery-lore'),
  discoveryPage: document.querySelector('#discovery-page'),
  discoveryContinueButton: document.querySelector('#discovery-continue-button'),
  emergencySupplyCard: document.querySelector('#emergency-supply-card'),
  emergencySupplyBalance: document.querySelector('#emergency-supply-balance'),
  emergencySupplySmall: document.querySelector('#emergency-supply-small'),
  emergencySupplyLarge: document.querySelector('#emergency-supply-large'),
  emergencySupplyDecline: document.querySelector('#emergency-supply-decline'),
  talentLibraryCard: document.querySelector('#talent-library-card'),
  talentLibraryTitle: document.querySelector('#talent-library-title'),
  talentLibrarySummary: document.querySelector('#talent-library-summary'),
  talentLibraryList: document.querySelector('#talent-library-list'),
  talentLibraryCloseButton: document.querySelector('#talent-library-close-button'),
  pauseCard: document.querySelector('#pause-card'),
  pauseTitle: document.querySelector('#pause-title'),
  pauseSubtitle: document.querySelector('#pause-subtitle'),
  resumeButton: document.querySelector('#resume-button'),
  settingsRestartButton: document.querySelector('#settings-restart-button'),
  settingsSoundButton: document.querySelector('#settings-sound-button'),
  settingsSoundValue: document.querySelector('#settings-sound-value'),
  settingsMusicVolume: document.querySelector('#settings-music-volume'),
  settingsMusicVolumeValue: document.querySelector('#settings-music-volume-value'),
  settingsSfxVolume: document.querySelector('#settings-sfx-volume'),
  settingsSfxVolumeValue: document.querySelector('#settings-sfx-volume-value'),
  settingsAimButton: document.querySelector('#settings-aim-button'),
  settingsAimValue: document.querySelector('#settings-aim-value'),
  settingsShakeButton: document.querySelector('#settings-shake-button'),
  settingsMotionButton: document.querySelector('#settings-motion-button'),
  settingsMotionValue: document.querySelector('#settings-motion-value'),
  settingsShakeValue: document.querySelector('#settings-shake-value'),
  fullscreenButton: document.querySelector('#fullscreen-button'),
  fullscreenValue: document.querySelector('#fullscreen-value'),
  returnMenuButton: document.querySelector('#return-menu-button'),
  exitGameButton: document.querySelector('#exit-game-button'),
  resetButton: document.querySelector('#reset-save-button'),
  settingsStoryButton: document.querySelector('#settings-story-button'),
  settingsStoryValue: document.querySelector('#settings-story-value'),
  skillControlTitle: document.querySelector('#skill-control-title'),
  skillControlCopy: document.querySelector('#skill-control-copy'),
  buildChipTitle: document.querySelector('#build-chip-title'),
  buildChipStatus: document.querySelector('#build-chip-status'),
  saveStatusNote: document.querySelector('#save-status-note'),
  statusText: document.querySelector('#game-status-text'),
}

for (const [name, node] of Object.entries(dom)) {
  if (!node) throw new Error(`Missing required DOM node: ${name}`)
}

function setText(node, value) {
  const text = String(value)
  if (node.textContent !== text) node.textContent = text
}

function setAttribute(node, name, value) {
  const text = String(value)
  if (node.getAttribute(name) !== text) node.setAttribute(name, text)
}

function setProgress(node, value, maximum = 1) {
  const max = Math.max(1, Number(maximum) || 1)
  const next = clamp(Number(value) || 0, 0, max)
  if (node.max !== max) node.max = max
  if (node.value !== next) node.value = next
}

const markupCache = new WeakMap()

function setMarkup(node, markup) {
  if (markupCache.get(node) === markup) return
  node.innerHTML = markup
  markupCache.set(node, markup)
}

function escapeMarkup(value) {
  return String(value).replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[character])
}

function formatArchiveDate(value) {
  if (!value) return '旧版记录 · 日期未留存'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '达成日期未留存'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2)
dom.canvas.width = VIEWPORT.width * pixelRatio
dom.canvas.height = VIEWPORT.height * pixelRatio
// Character thumbnails intentionally reuse the battlefield renderer. JavaScript
// runs each paint synchronously, so swapping the active context inside a
// try/finally block keeps one authoritative acorn art implementation without
// duplicating it into a second, inevitably drifting CSS portrait system.
let ctx = dom.canvas.getContext('2d', { alpha: false })

function withDrawingContext(nextContext, callback) {
  const previousContext = ctx
  ctx = nextContext
  try {
    return callback()
  } finally {
    ctx = previousContext
  }
}
if (!ctx) throw new Error('Canvas 2D is unavailable')

function cssColor(value) {
  return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`
}

function mixColor(first, second, amount) {
  const t = clamp(amount, 0, 1)
  const a = [(first >> 16) & 255, (first >> 8) & 255, first & 255]
  const b = [(second >> 16) & 255, (second >> 8) & 255, second & 255]
  return (Math.round(a[0] + (b[0] - a[0]) * t) << 16)
    | (Math.round(a[1] + (b[1] - a[1]) * t) << 8)
    | Math.round(a[2] + (b[2] - a[2]) * t)
}

function rightAngleError(rotation = 0) {
  return ((rotation + 45) % 90 + 90) % 90 - 45
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

let storageWritable = true
let storageProbeComplete = false

function safeStorage() {
  try {
    const storage = window.localStorage
    if (!storageProbeComplete && !QA_MODE) {
      const probeKey = 'acorn-expedition:storage-probe'
      storage.setItem(probeKey, '1')
      storage.removeItem(probeKey)
      storageProbeComplete = true
      storageWritable = true
    }
    return storage
  } catch {
    storageProbeComplete = true
    storageWritable = false
    return null
  }
}

function loadSave() {
  if (QA_MODE) return {
    ...createExtendedDefaultSaveData(),
    level: MAIN_LEVELS,
    endlessUnlocked: true,
    specialUnlocked: true,
  }
  const storage = safeStorage()
  if (!storage) return createExtendedDefaultSaveData()
  const candidateKeys = [SAVE_KEY, ...LEGACY_SAVE_KEYS]
  for (const key of candidateKeys) {
    try {
      const raw = storage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      return normalizeExtendedSaveData(parsed?.version ? parsed.data : parsed)
    } catch {
      // Try the next legacy key; corrupt data should not stop the game boot.
    }
  }
  return createExtendedDefaultSaveData()
}

function normalizeFailureAidStates(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(RUN_SLOT_IDS.map((slotId) => [
    slotId,
    normalizeFailureAidState(source[slotId]),
  ]))
}

function normalizeExtendedSaveData(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const core = normalizeSaveData(source)
  return {
    ...core,
    specialChallengeRecords: normalizeSpecialChallengeRecords(
      source.specialChallengeRecords || source.specialContracts,
    ),
    dailyChallenge: normalizeDailyChallengeState({
      ...(source.dailyChallenge && typeof source.dailyChallenge === 'object'
        ? source.dailyChallenge : {}),
      dailyBest: core.dailyBest,
    }),
    failureAidStates: normalizeFailureAidStates(source.failureAidStates),
    encounterRewards: normalizeEncounterRewards(source.encounterRewards),
  }
}

function createExtendedDefaultSaveData() {
  return normalizeExtendedSaveData(createDefaultSaveData())
}

function loadRunSlots() {
  if (QA_MODE) return createRunSlots()
  const storage = safeStorage()
  if (!storage) return createRunSlots()
  let runSlots
  try {
    const raw = storage.getItem(CHECKPOINT_KEY)
    if (!raw) return createRunSlots()
    runSlots = normalizeRunSlots(JSON.parse(raw), { dailySeed: dateSeed(new Date()) })
  } catch {
    return createRunSlots()
  }
  // Migration/pruning is best-effort. A quota failure must not discard the
  // valid checkpoint that was already read and normalized in memory.
  try { storage.setItem(CHECKPOINT_KEY, JSON.stringify(runSlots)) } catch { /* keep normalized slots */ }
  return runSlots
}

function entropySeed() {
  const forced = new URLSearchParams(window.location.search).get('seed')
  if (forced !== null && Number.isFinite(Number(forced))) return Number(forced) >>> 0 || 1
  try {
    const data = new Uint32Array(1)
    window.crypto.getRandomValues(data)
    return data[0] || 1
  } catch {
    return mixSeed(Date.now(), performance.now())
  }
}

class AcornGame {
  constructor() {
    this.save = loadSave()
    this.syncMotionPreference()
    if (this.save.level >= MAIN_LEVELS && this.save.endlessUnlocked) this.save.specialUnlocked = true
    this.audio = new SoundFX({
      muted: this.save.muted,
      musicVolume: this.save.settings.musicVolume,
      sfxVolume: this.save.settings.sfxVolume,
    })
    this.audio.requestMusic(AUDIO_MUSIC_THEME.EXPEDITION)
    this.state = 'menu'
    this.mode = 'main'
    this.specialCampaignId = null
    this.specialStageNumber = 0
    this.specialRules = []
    this.specialTheme = null
    this.specialBackgroundScene = null
    this.mainEnvironmentTheme = null
    this.fortressStyle = null
    this.structureFamily = null
    this.architectureBlueprint = null
    this.architectureSilhouetteFrame = null
    this.architectureSilhouetteBaseline = null
    this.movingPlatformProfile = null
    this.specialArchitecture = null
    this.terrainProfile = DEFAULT_TERRAIN_PROFILE
    this.specialObjective = null
    this.specialChallengeState = null
    this.specialChallengeLastScore = 0
    this.specialChallengeShotStartCollapse = 0
    this.specialChallengeCeilingDropsThisShot = 0
    this.specialChallengeSettledLaunchCount = 0
    this.specialSettlementStartTick = null
    this.specialRuleStartTick = null
    this.bossPhases = []
    this.bossPhaseEffects = {}
    this.triggeredBossPhases = new Set()
    this.specialInitialBlockCount = 0
    this.levelPeakCollapseRatio = 0
    this.levelInitialTargetCount = 0
    this.specialLaunchCount = 0
    this.specialFirstImpactTick = null
    this.specialWaterY = null
    this.pendingMapEvents = []
    this.lightningTargetId = null
    this.level = 1
    this.score = 0
    this.levelStartScore = 0
    this.levelScoreBreakdown = { blocks: 0, targets: 0, golden: 0, combo: 0 }
    this.runSeed = 1
    this.levelSeed = 1
    this.levelRng = new Rng(1)
    this.loadoutRng = new Rng(2)
    this.lootRng = new Rng(3)
    this.visualRng = new Rng(4)
    this.talentProgression = normalizeTalentProgression()
    this.talentResolution = resolveTalentProgression(this.talentProgression)
    this.talents = this.talentProgression.ranks
    this.talentClaimedCount = 0
    this.talentEligibleCount = 1
    this.activeTalentMilestone = null
    this.talentResume = 'start-level'
    this.pendingVictoryResult = null
    this.replayLevelOnly = false
    this.practiceSpecial = false
    this.talentRerollCount = 0
    this.runSlots = loadRunSlots()
    this.runCheckpoint = getLastActiveRunCheckpoint(this.runSlots, {
      dailySeed: dateSeed(new Date()),
    })
    this.dailyChallenge = null
    this.dailySegment = null
    this.dailyEffects = {}
    this.pendingElderAid = []
    this.failureAidState = createFailureAidState()
    this.talentChoices = []
    this.currentSky = MENU_SKY
    this.mapType = 'normal'
    this.strongholdTier = 0
    this.windX = 0
    this.blocks = []
    this.structureJoints = []
    this.structureContactPairs = new Set()
    this.structureJointCounts = { nail: 0, masonry: 0 }
    this.unlockedStructureJointKinds = []
    this.squirrels = []
    this.platforms = []
    this.architectureMechanisms = []
    this.decoys = []
    this.birds = []
    this.currentBird = null
    this.shotQueue = []
    this.shotQueueBonus = []
    this.shotQueueDamageBonus = []
    this.shotQueueAce = []
    this.baseShotBudget = 0
    this.bonusShotsGranted = 0
    this.bonusShotsRemaining = 0
    this.levelRescuesUsed = 0
    this.levelPlayedBirdTypes = new Set()
    this.levelRefundFailures = 0
    this.fusionFracturedBlockIds = new Set()
    this.fusionHeatwaveBlockIds = new Set()
    this.frozenShockBlockIds = new Set()
    this.thermalShockBlockIds = new Set()
    this.goldenCadenceTriggered = false
    this.chainBlastsThisShot = 0
    this.comboWindowTicks = 0
    this.goldenEgg = null
    this.levelGoldenEggClaimed = false
    this.particles = []
    this.fireTrail = []
    this.moltenPulseSequences = []
    this.levelFlameIgnitions = 0
    this.levelFlameBlockIds = new Set()
    this.settledDebrisPairs = new Set()
    this.trail = []
    this.shotsRemaining = 0
    this.turnActive = false
    this.dragging = false
    this.dragPointerId = null
    this.keyboardAiming = false
    this.combo = 0
    this.slowTimer = 0
    this.mapPulseTick = 0
    this.resolutionRequested = false
    this.transitionTicks = 0
    this.fixedTick = 0
    this.stateTick = 0
    this.nextId = 1
    this.paused = false
    this.settingsOpen = false
    this.tutorialStep = 0
    this.tutorialCompleteTick = 0
    this.discoveryQueue = []
    this.activeDiscovery = null
    this.discoveryOpen = false
    this.discoveryFromArchive = false
    this.discoverySequenceTotal = 0
    this.discoverySequenceIndex = 0
    this.discoveryDigestCount = 0
    this.focusBeforeDiscovery = null
    this.emergencySupplyOpen = false
    this.emergencySupplyUsed = false
    this.focusBeforeEmergencySupply = null
    this.missionCollapsed = true
    this.shotSelectorCollapsed = true
    this.windTraceHintShown = false
    this.talentLibraryOpen = false
    this.talentLibrarySelectedId = null
    this.focusBeforeTalentLibrary = null
    this.levelResult = null
    this.zoomPref = 1
    this.camera = { x: 450, y: 300, zoom: 1, shakeX: 0, shakeY: 0, shakePower: 0 }
    this.bannerUntil = 0
    this.achievementUntil = 0
    this.achievementQueue = []
    this.pendingReset = false
    this.pendingResetUntil = 0
    this.pendingReturn = false
    this.pendingReturnUntil = 0
    this.focusBeforePause = null
    this.wasFullscreen = Boolean(document.fullscreenElement)
    this.lastFrame = performance.now()
    this.lastRender = 0
    this.renderWhenFrozen = true
    this.accumulator = 0
    this.raf = 0

    this.bindEvents()
    this.showMenu()
    this.raf = requestAnimationFrame((time) => this.frame(time))
  }

  bindEvents() {
    document.addEventListener('pointerdown', (event) => {
      if (event.target instanceof Element
        && event.target.closest('#mute-button, #settings-sound-button')) return
      if (!this.save.muted) void this.audio.unlock()
    }, { capture: true })
    dom.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event))
    dom.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event))
    dom.canvas.addEventListener('pointerup', (event) => this.onPointerUp(event))
    dom.canvas.addEventListener('pointercancel', (event) => this.onPointerCancel(event))
    dom.canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false })
    dom.panel.addEventListener('click', (event) => this.onPanelClick(event))
    dom.muteButton.addEventListener('click', () => this.toggleMute())
    dom.pauseButton.addEventListener('click', () => this.togglePause())
    dom.restartButton.addEventListener('click', () => this.restartLevel())
    dom.settingsButton.addEventListener('click', () => this.openSettings())
    dom.missionToggleButton.addEventListener('click', () => this.toggleMissionStatus())
    dom.shotSelectorToggle.addEventListener('click', () => {
      this.shotSelectorCollapsed = !this.shotSelectorCollapsed
      this.audio.ui()
      this.syncUI()
    })
    for (const star of [dom.missionStar1, dom.missionStar2, dom.missionStar3]) {
      star.addEventListener('mouseenter', () => this.showMissionStarTooltip(star))
      star.addEventListener('mouseleave', () => this.hideMissionStarTooltip())
      star.addEventListener('focus', () => this.showMissionStarTooltip(star))
      star.addEventListener('blur', () => this.hideMissionStarTooltip())
    }
    dom.missionCard.addEventListener('scroll', () => this.hideMissionStarTooltip(), { passive: true })
    dom.hudTalents.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-talent]') : null
      if (target) this.openTalentLibrary(target.dataset.talent)
    })
    dom.shotSelectorList.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-queue-index]') : null
      if (!target || target.disabled) return
      this.selectQueuedBird(Number(target.dataset.queueIndex))
    })
    dom.discoveryContinueButton.addEventListener('click', () => this.confirmDiscovery())
    dom.emergencySupplySmall.addEventListener('click', () => this.buyEmergencySupply('two-acorns'))
    dom.emergencySupplyLarge.addEventListener('click', () => this.buyEmergencySupply('six-acorns'))
    dom.emergencySupplyDecline.addEventListener('click', () => this.declineEmergencySupply())
    dom.talentLibraryCloseButton.addEventListener('click', () => this.closeTalentLibrary())
    dom.talentLibraryCard.addEventListener('click', (event) => {
      if (event.target === dom.talentLibraryCard) this.closeTalentLibrary()
    })
    dom.resumeButton.addEventListener('click', () => this.closeSettings())
    dom.settingsRestartButton.addEventListener('click', () => this.restartLevel())
    dom.settingsSoundButton.addEventListener('click', () => this.toggleMute())
    dom.settingsMusicVolume.addEventListener('input', () => {
      this.setAudioVolume('music', dom.settingsMusicVolume.value)
    })
    dom.settingsMusicVolume.addEventListener('change', () => {
      this.setAudioVolume('music', dom.settingsMusicVolume.value, true)
    })
    dom.settingsSfxVolume.addEventListener('input', () => {
      this.setAudioVolume('sfx', dom.settingsSfxVolume.value)
    })
    dom.settingsSfxVolume.addEventListener('change', () => {
      this.setAudioVolume('sfx', dom.settingsSfxVolume.value, true)
    })
    dom.settingsAimButton.addEventListener('click', () => this.cycleAimGuideMode())
    dom.settingsShakeButton.addEventListener('click', () => this.togglePreference('shake'))
    dom.settingsMotionButton.addEventListener('click', () => this.togglePreference('reducedMotion'))
    dom.settingsStoryButton.addEventListener('click', () => this.togglePreference('skipStory'))
    dom.fullscreenButton.addEventListener('click', () => void this.toggleFullscreen())
    dom.returnMenuButton.addEventListener('click', () => this.requestReturnToMenu())
    dom.exitGameButton.addEventListener('click', () => this.exitGame())
    dom.resetButton.addEventListener('click', () => this.resetSaveRequest())
    window.addEventListener('keydown', (event) => this.onKeyDown(event))
    document.addEventListener('visibilitychange', () => {
      this.lastFrame = performance.now()
      this.accumulator = 0
      if (document.hidden && this.state === 'play') this.openSettings('visibility')
    })
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = Boolean(document.fullscreenElement)
      if (this.wasFullscreen && !isFullscreen && this.state === 'play') this.openSettings('fullscreen-exit')
      this.wasFullscreen = isFullscreen
      this.syncUI()
    })
    window.addEventListener('pagehide', () => {
      this.commitRunScore()
      this.persist()
      this.persistCheckpoint()
    })
  }

  persist() {
    if (QA_MODE) return
    const storage = safeStorage()
    if (!storage) return
    try {
      storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data: this.save }))
    } catch {
      storageWritable = false
      this.showBanner('本地记录暂时无法写入', 1800)
      this.syncUI()
    }
  }

  persistCheckpoint() {
    if (QA_MODE || this.replayLevelOnly || this.practiceSpecial) return
    // Endless defeat ends that expedition. `pagehide` also calls this method,
    // so explicitly refuse to resurrect a slot after the failure screen.
    if (this.mode === 'endless' && this.state === 'over') return
    if (!['story', 'talent', 'play', 'between', 'over'].includes(this.state)) return
    const storage = safeStorage()
    if (!storage) return
    try {
      const checkpoint = createRunCheckpoint({
        mode: this.mode,
        level: this.level,
        campaign: this.specialCampaignId,
        runSeed: this.runSeed,
        score: this.levelStartScore,
        levelStartScore: this.levelStartScore,
        talentProgression: this.talentProgression,
        talents: this.talents,
        talentClaimedCount: this.talentClaimedCount,
        talentEligibleCount: this.talentEligibleCount,
        talentRerollCount: this.talentRerollCount,
        zoomPref: this.zoomPref,
        missionCollapsed: this.missionCollapsed,
      })
      this.runSlots = updateRunSlot(this.runSlots, checkpoint, {
        dailySeed: dateSeed(new Date()),
      })
      storage.setItem(CHECKPOINT_KEY, JSON.stringify(this.runSlots))
      this.runCheckpoint = checkpoint
    } catch {
      storageWritable = false
    }
  }

  currentRunSlotId() {
    return runSlotIdFor(this.mode, this.specialCampaignId)
  }

  clearCheckpoint(slotId = this.currentRunSlotId()) {
    if (!slotId) return
    this.runSlots = clearRunSlot(this.runSlots, slotId, { dailySeed: dateSeed(new Date()) })
    this.runCheckpoint = getLastActiveRunCheckpoint(this.runSlots, {
      dailySeed: dateSeed(new Date()),
    })
    if (QA_MODE) return
    try { safeStorage()?.setItem(CHECKPOINT_KEY, JSON.stringify(this.runSlots)) } catch { /* storage may be unavailable */ }
  }

  resumeRun() {
    const slotId = this.requestedResumeSlotId || null
    this.requestedResumeSlotId = null
    this.runSlots = loadRunSlots()
    const checkpoint = slotId
      ? getRunSlot(this.runSlots, slotId, { dailySeed: dateSeed(new Date()) })
      : getLastActiveRunCheckpoint(this.runSlots, { dailySeed: dateSeed(new Date()) })
    if (!checkpoint) {
      this.showBanner('没有可继续的远征检查点', 1600)
      this.showMenu()
      return
    }
    this.runSlots = updateRunSlot(this.runSlots, checkpoint, { dailySeed: dateSeed(new Date()) })
    if (!QA_MODE) {
      try { safeStorage()?.setItem(CHECKPOINT_KEY, JSON.stringify(this.runSlots)) } catch { /* no-op */ }
    }
    this.runCheckpoint = checkpoint
    this.mode = checkpoint.mode
    this.specialCampaignId = checkpoint.campaign
    this.specialStageNumber = checkpoint.mode === 'special' ? checkpoint.level : 0
    this.specialTheme = checkpoint.mode === 'special'
      ? getSpecialCampaign(checkpoint.campaign)?.theme || null
      : null
    const checkpointCampaign = checkpoint.mode === 'special'
      ? getSpecialCampaign(checkpoint.campaign)
      : null
    this.specialBackgroundScene = checkpointCampaign
      ? buildSpecialBackgroundScene(checkpointCampaign, getSpecialStage(checkpoint.campaign, checkpoint.level))
      : null
    this.level = checkpoint.level
    this.runSeed = checkpoint.runSeed
    this.score = checkpoint.score
    this.levelStartScore = checkpoint.levelStartScore
    this.setTalentProgression(checkpoint.talentProgression || { ranks: checkpoint.talents })
    this.talentClaimedCount = checkpoint.talentClaimedCount
    this.talentEligibleCount = checkpoint.talentEligibleCount
    this.talentRerollCount = checkpoint.talentRerollCount || 0
    this.zoomPref = checkpoint.zoomPref
    // A restored run always re-enters with the compact edge tab. The player
    // can expand it on demand without an old UI preference covering the map.
    this.missionCollapsed = true
    this.replayLevelOnly = false
    this.practiceSpecial = false
    this.pendingVictoryResult = null
    this.levelResult = null
    this.pendingReturn = false
    const failureSlot = runSlotIdFor(this.mode, this.specialCampaignId)
    this.failureAidState = normalizeFailureAidState(this.save.failureAidStates?.[failureSlot])
    void this.audio.unlock()
    this.audio.ui()
    this.enterPreLevelFlow()
  }

  resumeRunSlot(slotId) {
    this.requestedResumeSlotId = slotId || null
    this.resumeRun()
  }

  commitRunScore() {
    this.save.score = Math.max(this.save.score, Math.max(0, Math.floor(this.score)))
    if (this.mode === 'daily') {
      const key = String(this.runSeed)
      this.save.dailyBest[key] = Math.max(this.save.dailyBest[key] || 0, Math.max(0, Math.floor(this.score)))
    }
  }

  setState(next) {
    this.state = next
    this.stateTick = 0
    if (next !== 'play') {
      this.paused = false
      this.settingsOpen = false
      dom.pauseCard.hidden = true
    }
    dom.shell.dataset.state = next
    this.syncUI()
  }

  clearWorld() {
    this.blocks = []
    this.structureJoints = []
    this.structureContactPairs = new Set()
    this.structureJointCounts = { nail: 0, masonry: 0 }
    this.unlockedStructureJointKinds = []
    this.squirrels = []
    this.platforms = []
    this.architectureMechanisms = []
    this.decoys = []
    this.birds = []
    this.currentBird = null
    this.shotQueue = []
    this.shotQueueBonus = []
    this.shotQueueDamageBonus = []
    this.shotQueueAce = []
    this.baseShotBudget = 0
    this.bonusShotsGranted = 0
    this.bonusShotsRemaining = 0
    this.levelRescuesUsed = 0
    this.levelPlayedBirdTypes = new Set()
    this.levelRefundFailures = 0
    this.fusionFracturedBlockIds = new Set()
    this.fusionHeatwaveBlockIds = new Set()
    this.frozenShockBlockIds = new Set()
    this.thermalShockBlockIds = new Set()
    this.goldenCadenceTriggered = false
    this.chainBlastsThisShot = 0
    this.comboWindowTicks = 0
    this.goldenEgg = null
    this.particles = []
    this.fireTrail = []
    this.moltenPulseSequences = []
    this.levelFlameIgnitions = 0
    this.levelFlameBlockIds = new Set()
    this.settledDebrisPairs = new Set()
    this.trail = []
    this.turnActive = false
    this.dragging = false
    this.dragPointerId = null
    this.keyboardAiming = false
    this.combo = 0
    this.levelScoreBreakdown = { blocks: 0, targets: 0, golden: 0, combo: 0 }
    this.slowTimer = 0
    this.specialRules = []
    this.specialBackgroundScene = null
    this.fortressStyle = null
    this.structureFamily = null
    this.architectureBlueprint = null
    this.architectureSilhouetteFrame = null
    this.architectureSilhouetteBaseline = null
    this.movingPlatformProfile = null
    this.specialArchitecture = null
    this.terrainProfile = DEFAULT_TERRAIN_PROFILE
    this.specialObjective = null
    this.specialChallengeState = null
    this.specialChallengeLastScore = 0
    this.specialChallengeShotStartCollapse = 0
    this.specialChallengeCeilingDropsThisShot = 0
    this.specialChallengeSettledLaunchCount = 0
    this.specialSettlementStartTick = null
    this.specialRuleStartTick = null
    this.bossPhases = []
    this.bossPhaseEffects = {}
    this.triggeredBossPhases = new Set()
    this.specialInitialBlockCount = 0
    this.levelPeakCollapseRatio = 0
    this.levelInitialTargetCount = 0
    this.specialLaunchCount = 0
    this.specialFirstImpactTick = null
    this.mapPulseTick = 0
    this.specialWaterY = null
    this.pendingMapEvents = []
    this.lightningTargetId = null
    this.dailyChallenge = null
    this.dailySegment = null
    this.dailyEffects = {}
    this.resolutionRequested = false
    this.discoveryQueue = []
    this.activeDiscovery = null
    this.discoveryOpen = false
    this.discoveryFromArchive = false
    this.discoverySequenceTotal = 0
    this.discoverySequenceIndex = 0
    this.discoveryDigestCount = 0
    this.focusBeforeDiscovery = null
    dom.discoveryCard.hidden = true
    this.emergencySupplyOpen = false
    this.emergencySupplyUsed = false
    this.focusBeforeEmergencySupply = null
    dom.emergencySupplyCard.hidden = true
    this.talentLibraryOpen = false
    this.talentLibrarySelectedId = null
    this.focusBeforeTalentLibrary = null
    dom.talentLibraryCard.hidden = true
    this.camera.shakePower = 0
    this.camera.shakeX = 0
    this.camera.shakeY = 0
    this.camera.x = 450
    this.camera.y = 300
    this.camera.zoom = this.zoomPref
    this.hideCoachmark()
  }

  showMenu() {
    this.runSlots = loadRunSlots()
    this.runCheckpoint = getLastActiveRunCheckpoint(this.runSlots, {
      dailySeed: dateSeed(new Date()),
    })
    this.clearWorld()
    this.currentSky = MENU_SKY
    this.mode = 'main'
    this.specialCampaignId = null
    this.specialStageNumber = 0
    this.specialTheme = null
    this.specialBackgroundScene = null
    this.levelResult = null
    this.pendingReturn = false
    this.setState('menu')
    this.audio.requestMusic(AUDIO_MUSIC_THEME.EXPEDITION)
    const endlessDisabled = !this.save.endlessUnlocked
    const specialDisabled = !this.save.specialUnlocked
    const totalStars = Object.values(this.save.bestStars || {}).reduce((sum, value) => sum + value, 0)
    const specialClears = SPECIAL_CAMPAIGNS.filter((campaign) =>
      (this.save.specialProgress?.[campaign.id] || 0) >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN).length
    const runCards = RUN_SLOT_IDS.map((slotId) => {
      const checkpoint = getRunSlot(this.runSlots, slotId, { dailySeed: dateSeed(new Date()) })
      if (!checkpoint) return ''
      const modeLabel = checkpoint.mode === 'special'
        ? getSpecialCampaign(checkpoint.campaign)?.title || '秘境'
        : checkpoint.mode === 'endless' ? '无尽远征'
          : checkpoint.mode === 'daily' ? '每日挑战' : '主线远征'
      const levelLabel = checkpoint.mode === 'special'
        ? `第 ${checkpoint.level}/4 小关`
        : checkpoint.mode === 'endless'
          ? `第 ${checkpoint.level - MAIN_LEVELS} 层`
          : `第 ${checkpoint.level} 关`
      return `<button class="run-slot-card${this.runSlots.lastActive === slotId ? ' is-latest' : ''}"
        type="button" data-action="resume-slot" data-slot="${escapeMarkup(slotId)}">
        <b>${escapeMarkup(modeLabel)}</b><span>${levelLabel} · ${checkpoint.score.toLocaleString('zh-CN')} 分</span>
        <small>从关卡起点继续${this.runSlots.lastActive === slotId ? ' · 最近游玩' : ''}</small>
      </button>`
    }).filter(Boolean).join('')
    const todaySeed = dateSeed(new Date())
    const todayBest = this.save.dailyBest?.[String(todaySeed)] || 0
    const todayContract = buildDailyChallenge(todaySeed)
    const todayStatus = getDailyChallengeStatus(this.save.dailyChallenge, todaySeed)
    dom.panel.innerHTML = `
      <div class="panel-card camp-menu">
        <header class="camp-intro">
        <span class="panel-kicker">橡心王国 · 远征营地</span>
        <h2>橡果远征</h2>
        <p class="panel-subtitle">拉满树枝弹射器，把王国的冬粮从松鼠军团手里夺回来。</p>
        <canvas class="camp-party" width="360" height="150" role="img" aria-label="橡心守备队的远征伙伴"></canvas>
        </header>
        ${runCards ? `<section class="camp-resume"><h3>接着上次的冒险</h3><div class="run-slots-grid" aria-label="可继续的远征">${runCards}</div></section>` : ''}
        <div class="menu-actions camp-mode-grid">
          <button class="menu-button" type="button" data-action="main">${this.save.level ? '开始新主线' : '出发 · 夺回冬粮'}<span>十八关故事远征 · 天赋成长与融合</span></button>
          ${this.save.level > 0 ? '<button class="menu-button" type="button" data-action="main-map">主线关卡地图<span>已通关即可练习 · 补齐星章</span></button>' : ''}
          <button class="menu-button featured" type="button" data-action="special-select" ${specialDisabled ? 'disabled' : ''}>${specialDisabled ? '秘境未解锁' : '秘境篇章'}<span>${specialDisabled ? '完成十八关主线后开放' : `5 章 · 20 个高难小关 · 已完成 ${specialClears}/5`}</span></button>
          <button class="menu-button" type="button" data-action="endless" ${endlessDisabled ? 'disabled' : ''}>${endlessDisabled ? '无尽未解锁' : '无尽模式'}<span>${endlessDisabled ? '通关主线后开放' : `最高第 ${this.save.endlessBestStage || 0} 层 · 周期首领战`}</span></button>
          <button class="menu-button" type="button" data-action="daily" title="今日规则：${todayContract.modifiers.boon.name} / ${todayContract.modifiers.pressure.name}">每日挑战<span>${this.todayLabel()} · 已完成 ${todayStatus.completedSegments}/3 · 最佳 ${todayBest.toLocaleString('zh-CN')}</span></button>
          <button class="menu-button" type="button" data-action="archive">远征档案<span>星章、徽章、图鉴与缺失记录</span></button>
        </div>
        <div class="menu-stats">
          <span>最高分 ${this.save.score.toLocaleString('zh-CN')}</span>
          <span>主线进度 ${Math.min(MAIN_LEVELS, this.save.level)}/${MAIN_LEVELS}</span>
          <span>无尽最高 ${this.save.endlessBestStage || 0} 层</span>
          <span>累计击倒 ${this.save.kills}</span>
          <span>金橡果 ${this.save.eggs}</span>
          <span>远征星章 ${totalStars}</span>
        </div>
      </div>`
    this.renderCampParty()
    this.focusPanelButton()
  }

  renderCampParty() {
    const canvas = dom.panel.querySelector('.camp-party')
    if (!canvas) return
    const surface = canvas.getContext('2d')
    if (!surface) return
    surface.clearRect(0, 0, canvas.width, canvas.height)
    withDrawingContext(surface, () => {
      for (const [index, type] of ['dash', 'red', 'frost'].entries()) {
        const x = 82 + index * 94
        const y = index === 1 ? 92 : 102
        ctx.fillStyle = 'rgba(43,79,58,.1)'
        ctx.beginPath(); ctx.ellipse(x, 135, 36, 6, 0, 0, Math.PI * 2); ctx.fill()
        this.drawBird({ id: `camp-${type}`, type, x, y,
          radius: BIRD_STYLE[type].radius, rotation: 0, launched: false,
          used: false, splitClone: false, abilityTicks: 0,
        }, { queued: true, scale: index === 1 ? 2.35 : 1.95 })
      }
    })
  }

  todayLabel() {
    const now = new Date()
    return `${now.getMonth() + 1}月${now.getDate()}日`
  }

  requestNewExpedition(mode, campaignId = null) {
    if (!['main', 'endless', 'daily', 'special'].includes(mode)) return
    if (mode === 'special' && !getSpecialCampaign(campaignId)) return
    const slotId = runSlotIdFor(mode, campaignId)
    const checkpoint = getRunSlot(loadRunSlots(), slotId, { dailySeed: dateSeed(new Date()) })
    if (!checkpoint) {
      if (mode === 'special') this.beginSpecialCampaign(campaignId)
      else this.beginRun(mode)
      return
    }
    this.clearWorld()
    this.setState('menu')
    const title = mode === 'special' ? getSpecialCampaign(campaignId).title
      : mode === 'endless' ? '无尽远征' : mode === 'daily' ? '每日挑战' : '主线远征'
    const stage = mode === 'endless' ? checkpoint.level - MAIN_LEVELS : checkpoint.level
    dom.panel.innerHTML = `<div class="panel-card compact">
      <span class="panel-kicker">远征营地 · 保存的足迹</span>
      <h2 class="small-title">还有一场冒险未完</h2>
      <p class="story-copy">${escapeMarkup(title)}已抵达第 ${stage} ${mode === 'endless' ? '层' : '关'}。\n开始新的远征将替换这场冒险的进度与天赋；图鉴、金橡果、星章及其他模式进度不受影响。</p>
      <div class="menu-actions two-up">
        <button class="primary-button" type="button" data-action="resume-slot" data-slot="${escapeMarkup(slotId)}">继续上次远征</button>
        <button class="secondary-button" type="button" data-action="confirm-new-expedition" data-mode="${mode}" data-campaign="${escapeMarkup(campaignId || '')}">开始新的远征</button>
      </div><button class="secondary-button" type="button" data-action="menu">返回营地</button>
    </div>`
    this.focusPanelButton()
  }

  showSpecialSelect() {
    if (!this.save.specialUnlocked) {
      this.showBanner('完成十八关主线后才能进入秘境', 1900)
      return
    }
    this.clearWorld()
    this.currentSky = STORY_SKY
    this.mode = 'special'
    this.specialCampaignId = null
    this.specialStageNumber = 0
    this.setState('special-select')
    this.audio.requestMusic(AUDIO_MUSIC_THEME.MYSTIC)
    const cards = SPECIAL_CAMPAIGNS.map((campaign) => {
      const cleared = Math.min(SPECIAL_STAGE_COUNT_PER_CAMPAIGN, this.save.specialProgress[campaign.id] || 0)
      const complete = cleared >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN
      const briefing = campaign.briefing
      const availableStages = complete ? SPECIAL_STAGE_COUNT_PER_CAMPAIGN : Math.min(SPECIAL_STAGE_COUNT_PER_CAMPAIGN, cleared + 1)
      const stageButtons = campaign.stages.map((stage) => {
        const stars = this.save.bestStars[`special:${campaign.id}:${stage.number}`] || 0
        const locked = stage.number > availableStages
        const hasContract = Boolean(stage.objective?.challenge)
        const contractComplete = Boolean(this.save.specialChallengeRecords?.[stage.id])
        const contractBadge = hasContract
          ? `<em class="contract-badge ${contractComplete ? 'completed' : 'active'}"
            data-status="${contractComplete ? 'completed' : 'active'}">${contractComplete ? '契约完成' : '契约待解'}</em>`
          : ''
        return `<button class="stage-node" type="button" data-action="special-stage"
          data-campaign="${campaign.id}" data-level="${stage.number}" ${locked ? 'disabled' : ''}>
          <b>${stage.number}</b><span>${stage.title}</span><small>${locked ? '未解锁' : `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`}</small>${contractBadge}
        </button>`
      }).join('')
      const campaignSlotId = runSlotIdFor('special', campaign.id)
      const campaignCheckpoint = getRunSlot(this.runSlots, campaignSlotId, {
        dailySeed: dateSeed(new Date()),
      })
      return `<article class="campaign-entry campaign-theme-${escapeMarkup(campaign.id)}">
        <button class="campaign-card" type="button" data-action="special-campaign" data-campaign="${campaign.id}">
          <span class="campaign-order">0${campaign.order}</span>
          <span class="campaign-copy"><strong>${campaign.title}</strong><small>${campaign.subtitle}</small></span>
          <span class="campaign-meta">${briefing?.difficulty?.label || '高难'} ${briefing?.difficulty?.rating || campaign.stages[0].difficulty}/10 · ${complete ? '已通关' : `进度 ${cleared}/4`}</span>
        </button>
        <div class="campaign-brief"><span>核心橡宝：${campaign.signatureBird.name}</span><span>${briefing?.difficulty?.note || ''}</span></div>
        ${campaignCheckpoint ? `<button class="secondary-button" type="button" data-action="resume-slot" data-slot="${escapeMarkup(campaignSlotId)}">继续本章 · 第 ${campaignCheckpoint.level}/4 小关</button>` : ''}
        <div class="stage-node-grid" aria-label="${campaign.title}关卡节点">${stageButtons}</div>
      </article>`
    }).join('')
    dom.panel.innerHTML = `
      <div class="panel-card campaign-panel">
        <span class="panel-kicker">主线后日谈 · 高难挑战</span>
        <h2 class="small-title">五大秘境</h2>
        <p class="panel-subtitle">每章 4 个小关，拥有独立剧情、专属橡宝、特殊松鼠与地图规则。五章可独立选择。</p>
        <div class="campaign-grid">${cards}</div>
        <button class="secondary-button" type="button" data-action="menu">返回远征营地</button>
      </div>`
    this.focusPanelButton()
  }

  showMainMap() {
    if (this.save.level < 1) return this.showMenu()
    this.clearWorld()
    this.currentSky = STORY_SKY
    this.mode = 'main'
    this.setState('menu')
    const nodes = Array.from({ length: MAIN_LEVELS }, (_, index) => {
      const level = index + 1
      const stars = this.save.bestStars[`main:${level}`] || 0
      const story = STORY.find((entry) => entry.level === level)
      return `<button class="level-node" type="button" data-action="main-replay" data-level="${level}" ${level > this.save.level ? 'disabled' : ''}>
        <b>${String(level).padStart(2, '0')}</b><span>${story?.title || `主线节点 ${level}`}</span>
        <small>${level > this.save.level ? '尚未抵达' : `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`}</small>
      </button>`
    }).join('')
    dom.panel.innerHTML = `
      <div class="panel-card archive-panel">
        <span class="panel-kicker">橡心王国 · 已探索的足迹</span>
        <h2 class="small-title">十八关战略地图</h2>
        <p class="panel-subtitle">单关演练会使用新随机种子和一次开局天赋；记录最佳星级，不改变已保存的远征检查点。</p>
        <div class="level-node-grid">${nodes}</div>
        <button class="secondary-button" type="button" data-action="menu">返回远征营地</button>
      </div>`
    this.focusPanelButton()
  }

  beginMainReplay(levelValue) {
    if (this.save.level < 1 || Number(levelValue) > this.save.level) return
    this.mode = 'main'
    this.specialCampaignId = null
    this.specialStageNumber = 0
    this.specialTheme = null
    this.specialBackgroundScene = null
    this.level = clamp(Math.floor(Number(levelValue) || 1), 1, MAIN_LEVELS)
    this.score = 0
    this.levelStartScore = 0
    this.setTalentProgression()
    this.talentClaimedCount = 0
    this.talentEligibleCount = 1
    this.activeTalentMilestone = null
    this.pendingVictoryResult = null
    this.runSeed = mixSeed('main-replay', this.level, entropySeed())
    this.replayLevelOnly = true
    this.practiceSpecial = false
    this.talentRerollCount = 0
    this.windTraceHintShown = false
    this.enterPreLevelFlow()
  }

  beginSpecialStage(campaignId, levelValue) {
    const campaign = getSpecialCampaign(campaignId)
    if (!campaign || !this.save.specialUnlocked) return
    const cleared = Math.min(SPECIAL_STAGE_COUNT_PER_CAMPAIGN, this.save.specialProgress[campaign.id] || 0)
    const maxAvailable = cleared >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN ? SPECIAL_STAGE_COUNT_PER_CAMPAIGN : cleared + 1
    const level = clamp(Math.floor(Number(levelValue) || 1), 1, maxAvailable)
    const isPractice = level <= cleared
    this.mode = 'special'
    this.specialCampaignId = campaign.id
    this.specialStageNumber = level
    this.specialTheme = campaign.theme
    this.specialBackgroundScene = buildSpecialBackgroundScene(campaign, getSpecialStage(campaign.id, level))
    this.level = level
    this.score = 0
    this.levelStartScore = 0
    this.setTalentProgression()
    this.talentClaimedCount = 0
    this.talentEligibleCount = 1
    this.activeTalentMilestone = null
    this.pendingVictoryResult = null
    this.runSeed = mixSeed(isPractice ? 'special-practice' : 'special-node', campaign.id, level, entropySeed())
    this.replayLevelOnly = false
    this.practiceSpecial = isPractice
    this.talentRerollCount = 0
    this.windTraceHintShown = false
    if (!isPractice) this.clearCheckpoint()
    this.failureAidState = createFailureAidState({
      mode: this.mode, campaignId: this.specialCampaignId, level: this.level, runSeed: this.runSeed,
    })
    if (!isPractice) {
      this.save.failureAidStates[runSlotIdFor(this.mode, this.specialCampaignId)] = this.failureAidState
    }
    this.enterPreLevelFlow()
  }

  showArchive() {
    this.clearWorld()
    this.currentSky = STORY_SKY
    this.setState('menu')
    const mainStars = Array.from({ length: MAIN_LEVELS }, (_, index) => this.save.bestStars[`main:${index + 1}`] || 0)
    const earnedStars = mainStars.reduce((sum, stars) => sum + stars, 0)
    const specialStars = SPECIAL_CAMPAIGNS.flatMap((campaign) => campaign.stages.map((stage) => (
      this.save.bestStars[`special:${campaign.id}:${stage.number}`] || 0
    )))
    const earnedSpecialStars = specialStars.reduce((sum, stars) => sum + stars, 0)
    const contractCount = Object.keys(this.save.specialChallengeRecords || {}).length
    const dailyState = normalizeDailyChallengeState(this.save.dailyChallenge)
    const dailyStatus = getDailyChallengeStatus(dailyState, dateSeed(new Date()))
    const completedDailyDays = Object.values(dailyState.days)
      .filter((day) => day.completedSegments >= DAILY_LEVELS).length
    const discovered = Object.keys(DISCOVERIES).filter((id) => this.save.seenDiscoveries[id]).length
    const badges = Object.entries(ACHIEVEMENTS).map(([id, label]) => {
      const earned = Boolean(this.save.ach[id])
      const reward = ACHIEVEMENT_REWARDS[id] || 0
      const history = earned
        ? `${formatArchiveDate(this.save.achievementDates?.[id])} · 奖励 ${reward} 枚金橡果`
        : `未达成 · 奖励 ${reward} 枚金橡果`
      return `<li data-earned="${earned}"><span>${earned ? '◆' : '◇'}</span><span class="badge-copy"><b>${label.replace(/^\u5fbd\u7ae0\s*·\s*/u, '')}</b><small>${history}</small></span></li>`
    }).join('')
    const fieldGuide = Object.entries(DISCOVERIES).map(([id, entry]) => {
      const earned = Boolean(this.save.seenDiscoveries[id])
      return `<li data-earned="${earned}">${earned
        ? `<button type="button" data-action="archive-discovery" data-discovery="${escapeMarkup(id)}" aria-haspopup="dialog" aria-controls="discovery-card"><span>●</span><span><b>${escapeMarkup(entry.title)}</b><small>${escapeMarkup(entry.category)}</small></span></button>`
        : '<span>○</span><b>未知记录</b>'}</li>`
    }).join('')
    const contractArchive = SPECIAL_CAMPAIGNS.flatMap((campaign) => campaign.stages
      .filter((stage) => stage.objective?.challenge)
      .map((stage) => {
        const record = this.save.specialChallengeRecords?.[stage.id]
        return `<li data-earned="${Boolean(record)}"><span>${record ? '◆' : '◇'}</span><span class="badge-copy"><b>${escapeMarkup(stage.objective.challenge.label)}</b><small>${escapeMarkup(campaign.title)} · ${record ? `${formatArchiveDate(record.completedAt)} · 最佳 ${record.bestStageScore.toLocaleString('zh-CN')} 分` : '尚未完成'}</small></span></li>`
      })).join('')
    const missing = mainStars.map((stars, index) => stars < 3 ? index + 1 : null).filter(Boolean)
    dom.panel.innerHTML = `
      <div class="panel-card archive-panel">
        <span class="panel-kicker">OAKHEART FIELD ARCHIVE</span>
        <h2 class="small-title">远征档案</h2>
        <div class="archive-stats">
          <span><b>${earnedStars}/${MAIN_LEVELS * 3}</b>主线星章</span>
          <span><b>${earnedSpecialStars}/${SPECIAL_CAMPAIGNS.length * SPECIAL_STAGE_COUNT_PER_CAMPAIGN * 3}</b>秘境星章</span>
          <span><b>${contractCount}/11</b>秘境契约</span>
          <span><b>${this.save.eggs}</b>金橡果</span>
          <span><b>${this.save.imprints || 0}</b>远征印记</span>
          <span><b>${this.save.endlessBestStage || 0}</b>无尽最高层</span>
          <span><b>${completedDailyDays}</b>每日完成天数</span>
          <span><b>${discovered}/${Object.keys(DISCOVERIES).length}</b>图鉴</span>
        </div>
        <p class="archive-gap">${missing.length ? `尚未三星：主线 ${missing.join('、')} 关` : '主线星章已全部收集。'}</p>
        <p class="archive-gap">本周每日契约：完成 ${dailyStatus.week.completedDays} 天 · 周最佳 ${dailyStatus.week.bestScore.toLocaleString('zh-CN')}。秘境契约首次完成各奖励 1 枚金橡果。</p>
        <ul class="badge-list">${badges}</ul>
        <details class="field-guide-archive"><summary>展开秘境契约记录（${contractCount}/11）</summary><ul class="badge-list">${contractArchive}</ul></details>
        <details class="field-guide-archive"><summary>展开已解锁图鉴</summary><ul>${fieldGuide}</ul></details>
        <div class="menu-actions two-up">
          ${this.save.level > 0 ? '<button class="menu-button" type="button" data-action="main-map">前往关卡地图<span>补齐缺失星章</span></button>' : ''}
          <button class="menu-button" type="button" data-action="menu">返回远征营地<span>继续游戏</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  beginSpecialCampaign(campaignId, { startAtFirst = false } = {}) {
    const campaign = getSpecialCampaign(campaignId)
    if (!campaign || !this.save.specialUnlocked) return
    this.mode = 'special'
    this.specialCampaignId = campaign.id
    const cleared = Math.min(SPECIAL_STAGE_COUNT_PER_CAMPAIGN, this.save.specialProgress[campaign.id] || 0)
    this.level = startAtFirst || cleared >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN ? 1 : cleared + 1
    this.specialStageNumber = this.level
    this.score = 0
    this.levelStartScore = 0
    this.setTalentProgression()
    this.talentClaimedCount = 0
    this.talentEligibleCount = 1
    this.activeTalentMilestone = null
    this.talentResume = 'start-level'
    this.pendingVictoryResult = null
    this.replayLevelOnly = false
    this.practiceSpecial = false
    this.talentRerollCount = 0
    this.windTraceHintShown = false
    this.clearCheckpoint()
    this.runSeed = mixSeed('special', campaign.id, entropySeed())
    this.failureAidState = createFailureAidState({
      mode: this.mode, campaignId: this.specialCampaignId, level: this.level, runSeed: this.runSeed,
    })
    this.save.failureAidStates[runSlotIdFor(this.mode, this.specialCampaignId)] = this.failureAidState
    this.zoomPref = 1
    this.levelResult = null
    this.pendingReturn = false
    void this.audio.unlock()
    this.audio.ui()
    this.enterPreLevelFlow()
  }

  beginRun(mode) {
    if (!['main', 'endless', 'daily'].includes(mode)) return
    if (mode === 'endless' && !this.save.endlessUnlocked) return
    this.mode = mode
    this.specialCampaignId = null
    this.clearCheckpoint(runSlotIdFor(mode))
    this.specialStageNumber = 0
    this.specialTheme = null
    this.specialBackgroundScene = null
    this.level = mode === 'endless' ? MAIN_LEVELS + 1 : 1
    this.score = 0
    this.levelStartScore = 0
    this.setTalentProgression()
    this.talentClaimedCount = 0
    this.talentEligibleCount = 1
    this.activeTalentMilestone = null
    this.talentResume = 'start-level'
    this.pendingVictoryResult = null
    this.replayLevelOnly = false
    this.practiceSpecial = false
    this.talentRerollCount = 0
    this.windTraceHintShown = false
    this.runSeed = mode === 'daily' ? dateSeed(new Date()) : mixSeed(mode, entropySeed())
    this.failureAidState = createFailureAidState({ mode, level: this.level, runSeed: this.runSeed })
    this.save.failureAidStates[runSlotIdFor(mode)] = this.failureAidState
    this.zoomPref = 1
    this.levelResult = null
    this.pendingReturn = false
    void this.audio.unlock()
    this.audio.ui()
    this.enterPreLevelFlow()
  }

  storyForCurrentLevel() {
    if (this.mode === 'main') return STORY.find((entry) => entry.level === this.level) || null
    if (this.mode === 'special') {
      const campaign = getSpecialCampaign(this.specialCampaignId)
      const stage = getSpecialStage(this.specialCampaignId, this.level)
      if (!campaign || !stage) return null
      return {
        title: `${campaign.title} · ${stage.title}`,
        text: `${this.level === 1 ? `${campaign.story.opening}\n\n` : ''}${stage.storyBeat}`,
        special: true,
        campaign,
        stage,
      }
    }
    if (this.mode === 'endless') {
      const depth = this.level - MAIN_LEVELS
      if (depth > 0 && depth % 5 === 0) {
        const index = (Math.floor(depth / 5) - 1) % EPILOGUE.length
        return { title: '旅途见闻', text: EPILOGUE[index] }
      }
    }
    if (this.mode === 'daily') {
      const contract = buildDailyChallenge(this.runSeed)
      const segment = contract.segments[this.level - 1]
      if (!segment) return null
      return {
        title: `${contract.title} · ${segment.title}`,
        text: `${segment.summary}\n\n今日助力「${contract.modifiers.boon.name}」：${contract.modifiers.boon.description}\n今日压力「${contract.modifiers.pressure.name}」：${contract.modifiers.pressure.description}`,
      }
    }
    return null
  }

  storyKeyForCurrentLevel() {
    if (this.mode === 'main') return `main:${this.level}`
    if (this.mode === 'special') return `special:${this.specialCampaignId}:${this.level}`
    if (this.mode === 'endless') return `endless:${this.level}`
    return null
  }

  enterPreLevelFlow() {
    this.levelStartScore = this.score
    this.persistCheckpoint()
    const story = this.storyForCurrentLevel()
    const storyKey = this.storyKeyForCurrentLevel()
    const alreadyRead = storyKey && this.save.seenStories?.[storyKey]
    if (story && !(this.save.settings.skipStory && alreadyRead)) this.showStory(story)
    else this.continuePreLevelFlow()
  }

  continuePreLevelFlow() {
    if (this.talentClaimedCount < this.talentEligibleCount
      && this.showTalentPick({ resume: 'start-level' })) return
    this.startLevel({ retry: false })
  }

  continueAfterResult() {
    if (!this.showTalentPick({ resume: 'after-level' })) this.enterPreLevelFlow()
  }

  showStory(story) {
    this.clearWorld()
    this.currentSky = STORY_SKY
    this.setState('story')
    const storyKey = this.storyKeyForCurrentLevel()
    if (storyKey) {
      this.save.seenStories[storyKey] = true
      this.persist()
    }
    const briefing = story.special && story.campaign?.briefing
      ? `<div class="mission-briefing">
          <span><b>推荐难度</b>${story.campaign.briefing.difficulty.label} ${story.campaign.briefing.difficulty.rating}/10</span>
          <span><b>核心橡宝</b>${story.campaign.signatureBird.name}</span>
          <span><b>材质组成</b>${story.campaign.briefing.materialPalette.map((type) => ({ wood: '木材', stone: '石材', ice: '冰块' })[type] || type).join(' · ')}</span>
          <span><b>敌人预览</b>${story.campaign.briefing.enemyPreview.map((enemy) => SPECIAL_SQUIRREL_BY_TYPE[enemy.type]?.title || enemy.type).join(' · ')}</span>
          ${story.stage?.objective?.challenge ? `<span class="briefing-challenge"><b>额外挑战</b>${story.stage.objective.challenge.label}：${story.stage.objective.challenge.description}</span>` : ''}
          ${story.stage?.tutorialStage ? '<small>本节点为机制教学关：5枚橡宝，坠塌门槛已降低。</small>' : ''}
        </div>` : ''
    dom.panel.innerHTML = `
      <div class="panel-card compact">
        <span class="panel-kicker">${story.special ? `秘境剧情 · ${this.level}/4` : this.mode === 'daily' ? `每日契约 · ${this.level}/3` : `主线故事 · ${this.level}`}</span>
        <h2 class="small-title">${story.title}</h2>
        <p class="story-copy">${story.text}</p>
        ${briefing}
        <button class="primary-button" type="button" data-action="story-next">继续远征</button>
      </div>`
    this.focusPanelButton()
  }

  setTalentProgression(value = {}) {
    this.talentProgression = normalizeTalentProgression(value)
    this.talentResolution = resolveTalentProgression(this.talentProgression)
    this.talents = this.talentProgression.ranks
  }

  talentRank(id) {
    return this.talents[id] || 0
  }

  hasFusion(id) {
    return this.talentProgression.fusionIds.includes(id)
  }

  fusionEffect(id, key, fallback) {
    if (!this.hasFusion(id)) return fallback
    const value = this.talentResolution.fusionBonuses[id]?.effects?.[key]
    return value === undefined ? fallback : value
  }

  specialAcornContracts() {
    return this.talentResolution.specialAcornGrants
  }

  windTraceGuideProfile() {
    return {
      enabled: this.talentEffect('windTrace', 'windTraceGuideEnabled', false),
      landingMarker: this.talentEffect('windTrace', 'windTraceLandingMarkerEnabled', false),
      corridor: this.talentEffect('windTrace', 'windCorridorPreviewEnabled', false),
    }
  }

  forecastQueueSlots() {
    return this.fusionEffect('windchartArsenal', 'forecastQueueSlots', 0)
  }

  shotAllocationForGenerated(generated) {
    const authoredShotBudget = this.mode === 'special'
      ? generated.objective?.shotLimit ?? generated.birdsAvailable + 1
      : generated.baseShotBudget ?? generated.birdsAvailable + 1
    const talentContracts = this.specialAcornContracts()
    const requestedContractShots = talentContracts.reduce(
      (sum, contract) => sum + Math.max(0, Math.floor(contract.copiesPerLevel || 0)), 0,
    )
    const authoredBudgetWithinModeCap = calculateShotBudget({
      mode: this.mode,
      baseShotBudget: authoredShotBudget,
      bonusShotsGranted: 0,
    }).baseShotBudget
    const requestedPackShots = this.talentEffect('pack', 'extraShots', 0)
    const shotBudget = calculateShotBudget({
      mode: this.mode,
      baseShotBudget: authoredBudgetWithinModeCap,
      bonusShotsGranted: requestedPackShots,
    })
    // The eight-shot endless ceiling governs the ordinary magazine only.
    // Talent contracts are a late-build reward and are appended outside that
    // ceiling; their bonus flag still excludes them from reserve-star scoring.
    const grantedContractShots = requestedContractShots
    const grantedPackShots = shotBudget.bonusShotsGranted
    // A full ordinary magazine must not erase a ranked talent reward. Convert
    // each clipped Pack round into +1 direct damage on a different base round;
    // this adds neither ammo nor bonus-star credit and never stacks one round.
    const overflowPackReinforcements = Math.min(
      shotBudget.baseShotBudget,
      Math.max(0, requestedPackShots - grantedPackShots),
    )
    const overflowPackDirectDamageBonus = this.talentEffect('pack', 'overflowDirectDamageBonus', 0)
    const initialShotTotal = shotBudget.baseShotBudget + grantedPackShots
    return {
      talentContracts,
      baseShotBudget: shotBudget.baseShotBudget,
      grantedPackShots,
      overflowPackReinforcements,
      overflowPackDirectDamageBonus,
      grantedContractShots,
      initialShotTotal,
      totalShotBudget: initialShotTotal + grantedContractShots,
      maximumTotalShotBudget: shotBudget.maximumTotalShotBudget,
      maximumEffectiveShotBudget: shotBudget.maximumTotalShotBudget === null
        ? null
        : shotBudget.maximumTotalShotBudget + grantedContractShots,
    }
  }

  talentContextForCurrentLevel() {
    const contentLevel = this.contentLevelForCurrentStage()
    const dailySegment = this.dailyProfileForCurrentStage()
    let generated = this.mode === 'special'
      ? generateSpecialLevel({
        campaignId: this.specialCampaignId,
        stageNumber: this.level,
        runSeed: this.runSeed,
        lucky: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1) > 1,
        luckyMultiplier: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1),
      })
      : generateLevel({
        level: contentLevel,
        seed: dailySegment?.generation?.seed
          ?? mixSeed(mixSeed(this.runSeed, 'level', this.level), 'layout'),
        mode: this.mode,
        lucky: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1) > 1,
        luckyMultiplier: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1),
      })
    generated = this.applyDailyProfile(generated)
    const specialStage = this.mode === 'special'
      ? getSpecialStage(this.specialCampaignId, this.level)
      : null
    const plannedLevelSeed = mixSeed(this.runSeed, 'level', this.level)
    const enemyTypes = new Set(generated.targets.map((target, index) =>
      this.chooseEnemyVariant(target, index, plannedLevelSeed)))
    const allocation = this.shotAllocationForGenerated(generated)
    const birdPool = this.birdPoolForCurrentLevel()
    const plannedQueue = this.mode === 'special'
      ? buildSpecialShotQueue({
        birdTypes: birdPool,
        signatureBirdType: generated.campaign?.signatureBird?.id,
        totalShots: allocation.initialShotTotal,
        seed: mixSeed(plannedLevelSeed, 'loadout'),
      })
      : buildMainAmmoQueue({
        level: contentLevel,
        seed: mixSeed(plannedLevelSeed, 'loadout'),
        totalShots: allocation.initialShotTotal,
        availableTypes: birdPool,
      })
    const magazineBirdTypes = new Set(plannedQueue)
    const birdTypes = new Set(plannedQueue)
    let remainingContractShots = allocation.grantedContractShots
    for (const contract of allocation.talentContracts) {
      const copies = Math.min(remainingContractShots, Math.max(0, Math.floor(contract.copiesPerLevel || 0)))
      if (copies <= 0) continue
      magazineBirdTypes.add(contract.type)
      birdTypes.add(contract.type)
      birdTypes.add(contract.baseType || contract.fallbackType)
      remainingContractShots -= copies
      if (remainingContractShots <= 0) break
    }
    return {
      birdTypes: [...birdTypes].filter(Boolean),
      magazineBirdTypes: [...magazineBirdTypes].filter(Boolean),
      signatureBirdType: specialStage ? getSpecialCampaign(this.specialCampaignId)?.signatureBird?.id || '' : '',
      materialTypes: [...new Set(generated.blocks.map((block) => block.type))],
      enemyTypes: [...enemyTypes],
      mapType: generated.mapType,
      windX: generated.windX,
      rules: generated.rules || [],
      objectiveType: generated.objective?.type || (generated.isBossLevel ? 'defeat-boss' : 'eliminate-all'),
      blockCount: generated.blocks.length,
      targetCount: generated.targets.length,
      shotLimit: allocation.totalShotBudget,
      difficulty: generated.stage?.difficulty || contentLevel,
      hasGoldenAcorn: Boolean(generated.goldenEgg),
      ownedTalentIds: Object.keys(this.talents),
    }
  }

  chooseTalentOptions(milestone) {
    this.activeTalentContext = this.talentContextForCurrentLevel()
    const draftMilestone = this.talentRerollCount > 0
      ? { ...milestone, id: `${milestone.id}-reroll-${this.talentRerollCount}` }
      : milestone
    const contextualTalentIds = [...chooseContextualTalentOptions({
      seed: this.runSeed,
      milestone: draftMilestone,
      ownedTalentIds: [],
      limit: Object.keys(TALENTS).length,
      context: this.activeTalentContext,
    })]
    const talentWeights = Object.fromEntries(contextualTalentIds.map((id) => [
      id,
      evaluateTalentAffinity(id, this.activeTalentContext).weight,
    ]))
    const buildCandidates = (eligibleTalentIds, weights = talentWeights) => [...buildTalentCandidates({
      progression: this.talentProgression,
      eligibleTalentIds,
      acornTypes: this.activeTalentContext.birdTypes,
      count: 3,
      seed: mixSeed(this.runSeed, draftMilestone.id, 'ranked-talent-draft'),
      specialAcornChance: milestone.index < 2 ? 0 : 0.24,
      talentWeights: weights,
    })]
    const contextualCandidates = buildCandidates(contextualTalentIds)
    if (contextualCandidates.length > 0) return contextualCandidates
    // A narrow map can temporarily exhaust its exact counters. Offer only
    // universally useful fallbacks; never burn the earned milestone because a
    // later level may expose a valid material, wind, ability, fusion, or contract.
    const universalIds = ['feather', 'power', 'pack', 'flame', 'leech', 'lucky', 'comboM', 'secondWind']
    return buildCandidates(universalIds, Object.fromEntries(universalIds.map((id) => [id, 1])))
  }

  showTalentPick({ resume = 'start-level' } = {}) {
    const milestone = this.talentClaimedCount < this.talentEligibleCount
      ? TALENT_SCORE_MILESTONES[this.talentClaimedCount]
      : null
    if (!milestone) return false
    this.clearWorld()
    this.currentSky = TALENT_SKY
    this.activeTalentMilestone = milestone
    this.talentResume = resume
    this.talentChoices = this.chooseTalentOptions(milestone)
    if (this.talentChoices.length === 0) {
      this.activeTalentMilestone = null
      this.showBanner('本关暂无新的适配天赋 · 领取名额保留至下一关', 1800)
      return false
    }
    this.setState('talent')
    const opening = milestone.id === 'opening'
    const cards = this.talentChoices.map((choice) => {
      if (choice.kind === 'fusion') {
        const fusion = TALENT_FUSIONS[choice.fusionId]
        const icons = fusion.talentIds.map((id) => talentIconMarkup(TALENTS[id].icon)).join('')
        return `<button class="talent-card talent-card-fusion" type="button"
          data-talent="${fusion.talentIds[0]}" data-talent-choice="${escapeMarkup(choice.selectionId)}">
          <span class="talent-icon talent-fusion-icons">${icons}</span><strong>${escapeMarkup(choice.title)}</strong>
          <span class="talent-fit">三级融合 · 双效保留</span><small>${escapeMarkup(choice.description)}</small></button>`
      }
      if (choice.kind === 'special-acorn') {
        const contract = choice.acornContract
        const style = BIRD_STYLE[contract.type] || BIRD_STYLE[contract.fallbackType] || BIRD_STYLE.red
        return `<button class="talent-card talent-card-contract" type="button"
          data-talent="${escapeMarkup(contract.baseType)}" data-talent-choice="${escapeMarkup(choice.selectionId)}"
          style="--talent-accent:${escapeMarkup(style.accent)};--talent-soft:${escapeMarkup(style.shell)}22">
          <span class="talent-icon talent-contract-icon" aria-hidden="true">✦</span><strong>${escapeMarkup(choice.title)}</strong>
          <span class="talent-fit">稀有契约 · 每关 1 枚</span><small>${escapeMarkup(choice.description)}</small></button>`
      }
      const id = choice.talentId
      const talent = TALENTS[id]
      const affinity = evaluateTalentAffinity(id, this.activeTalentContext)
      const matchLabel = affinity.signatureMatch
        ? '专属橡宝联动'
        : affinity.birdLinked ? '橡宝联动'
          : affinity.matchingDirectTokens.some((token) => token.startsWith('material:')) ? '材质克制'
            : affinity.matchingDirectTokens.some((token) => token.startsWith('map:') || token.startsWith('rule:') || token === 'feature:wind') ? '地图克制'
              : affinity.category === 'score' ? '得分构筑'
                : affinity.category === 'reserves' ? '弹药续航' : '泛用构筑'
      const rankPips = Array.from({ length: 3 }, (_, index) => `<i data-filled="${index < choice.targetRank}"></i>`).join('')
      return `<button class="talent-card" type="button" data-talent="${id}"
        data-talent-choice="${escapeMarkup(choice.selectionId)}">
        <span class="talent-icon">${talentIconMarkup(talent.icon)}</span><strong>${escapeMarkup(choice.title)}</strong>
        <span class="talent-rank-pips" aria-label="升级到${choice.targetRank}级">${rankPips}</span>
        <span class="talent-fit">${matchLabel} · ${choice.currentRank ? '强化' : '新获得'}</span><small>${escapeMarkup(choice.description)}</small></button>`
    }).join('')
    const loadoutNames = (this.activeTalentContext.magazineBirdTypes || this.activeTalentContext.birdTypes)
      .map((type) => BIRD_STYLE[type]?.name || SPECIAL_ACORN_BY_TYPE[type]?.title || type)
      .join('、')
    dom.panel.innerHTML = `
      <div class="panel-card">
        <span class="panel-kicker">${opening ? '远征启程' : `分数里程碑 · ${milestone.score.toLocaleString('zh-CN')}`}</span>
        <h2 class="small-title">选择一项天赋</h2>
        <p class="panel-subtitle">${opening
          ? '同一天赋可升至 3 级；两项 3 级天赋可融合，稀有契约还会带来专属橡宝。之后分数达标并过关时，每关最多解锁一项。'
          : `累计 ${this.score.toLocaleString('zh-CN')} 分已达到里程碑；可继续升级、完成融合或签订专属橡宝契约。`}</p>
        <p class="talent-loadout"><strong>本关橡宝</strong><span>${loadoutNames}</span>普通强化优先匹配本关弹药、材质与地图规则。</p>
        <div class="talent-grid">${cards}</div>
        <p class="talent-wallet" aria-label="天赋刷新资源"><span>金橡果 <b>${this.save.eggs}</b></span><span>远征印记 <b>${this.save.imprints || 0}</b></span></p>
        <button class="secondary-button talent-reroll" type="button" data-action="reroll-talents"
          ${(this.save.eggs >= 3 || this.save.imprints > 0) ? '' : 'disabled'}>更换本次候选<span>${this.save.eggs >= 3
            ? `花费 3 枚金橡果 · 余额 ${this.save.eggs}`
            : this.save.imprints > 0 ? `花费 1 枚远征印记 · 金橡果余额 ${this.save.eggs}` : `需要 3 枚金橡果 · 当前 ${this.save.eggs}`}</span></button>
      </div>`
    this.focusPanelButton()
    return true
  }

  selectTalent(selectionId) {
    const choice = this.talentChoices.find((candidate) => candidate.selectionId === selectionId)
    if (this.state !== 'talent' || !choice) return
    this.setTalentProgression(applyTalentChoice(this.talentProgression, choice))
    const milestone = this.activeTalentMilestone
    if (milestone) this.talentClaimedCount = Math.max(this.talentClaimedCount, milestone.index + 1)
    const resume = this.talentResume
    this.activeTalentMilestone = null
    this.talentRerollCount = 0
    this.persistCheckpoint()
    this.audio.ui()
    if (resume === 'victory') {
      const result = this.pendingVictoryResult || calculateClearResult(this.shotsRemaining)
      this.pendingVictoryResult = null
      this.showVictory(result)
    } else if (resume === 'special-victory') {
      const result = this.pendingVictoryResult || calculateClearResult(this.shotsRemaining)
      this.pendingVictoryResult = null
      this.showSpecialVictory(result)
    } else if (resume === 'after-level') this.enterPreLevelFlow()
    else this.startLevel({ retry: false })
  }

  hasTalent(id) {
    return this.talentRank(id) > 0
  }

  rerollTalentChoices() {
    if (this.state !== 'talent' || !this.activeTalentMilestone) return
    if (this.save.eggs >= 3) this.save.eggs -= 3
    else if (this.save.imprints > 0) this.save.imprints -= 1
    else return
    this.talentRerollCount += 1
    const resume = this.talentResume
    this.persist()
    this.persistCheckpoint()
    this.audio.ui()
    if (!this.showTalentPick({ resume })) {
      if (resume === 'after-level') this.enterPreLevelFlow()
      else this.startLevel({ retry: false })
    }
  }

  talentEffect(id, key, fallback) {
    if (!this.hasTalent(id)) return fallback
    const value = this.talentResolution.talentEffects[id]?.[key]
    return value === undefined ? fallback : value
  }

  talentDescription(id) {
    const rank = this.talentRank(id)
    return rank > 0
      ? TALENT_RANK_DATA[id]?.ranks[rank - 1]?.description || TALENTS[id]?.desc || ''
      : TALENT_RANK_DATA[id]?.ranks[0]?.description || TALENTS[id]?.desc || ''
  }

  specialRule(kindOrId) {
    return this.specialRules.find((rule) => rule.id === kindOrId || rule.kind === kindOrId) || null
  }

  specialRuleParameter(kindOrId, key, fallback = null) {
    const value = this.specialRule(kindOrId)?.parameters?.[key]
    return value === undefined ? fallback : value
  }

  terrainAt(x) {
    return terrainRuleAtX(this.terrainProfile, x)
  }

  materialPhysics(block) {
    const base = BLOCK_MATERIALS[block?.type] || BLOCK_MATERIALS.wood
    const construction = CONSTRUCTION_MATERIALS[block?.constructionId] || null
    let friction = base.friction
    let restitution = base.restitution
    const wetSurface = this.specialRule('friction-zone')
    const submerged = this.specialWaterY !== null
      && block.y + block.height / 2 > this.specialWaterY
    if (wetSurface && submerged && wetSurface.parameters.material === block.type) {
      friction *= wetSurface.parameters.frictionScale || 1
      restitution *= wetSurface.parameters.restitutionScale || 1
    }
    const materialRule = this.specialRule('material-modifier')
    if (materialRule?.parameters?.material === block.type) {
      friction *= materialRule.parameters.frictionScale || 1
    }
    if ((block.winchSlipTicks || 0) > 0) friction *= 0.34
    friction *= this.bossPhaseEffects.frictionScale || 1
    friction *= construction?.frictionMultiplier ?? 1
    restitution *= construction?.restitutionMultiplier ?? 1
    return {
      ...base,
      friction: clamp(friction, 0.02, 1),
      restitution: clamp(restitution, 0, 0.8),
      supportStability: base.supportStability * (construction?.supportMultiplier ?? 1),
      angularDamping: clamp(
        base.angularDamping * (construction?.angularDampingMultiplier ?? 1),
        0,
        0.92,
      ),
    }
  }

  structureImpulseScale(bird) {
    if (!bird) return STRUCTURE_IMPULSE_BY_BIRD.red
    if (bird.type === 'dash' && bird.used) return 1.15
    if (bird.type === 'drill' && bird.pierceRemaining > 0) return 1.1
    if (bird.type === 'quake' && bird.quakeArmed) return 1.2
    return STRUCTURE_IMPULSE_BY_BIRD[bird.type] ?? STRUCTURE_IMPULSE_BY_BIRD.red
  }

  structureWindExposure(block) {
    const heightExposure = clamp((GROUND_Y - block.y) / 360, 0.18, 1)
    const sheltered = this.blocks.some((other) => other !== block
      && other.y + other.height / 2 < block.y - block.height * 0.15
      && Math.abs(other.x - block.x) < (other.width + block.width) * 0.42)
    return clamp((0.38 + heightExposure) * (sheltered ? 0.42 : 1), 0.12, 1.35)
  }

  breakStructureJoint(joint) {
    if (!joint || joint.broken) return
    joint.broken = true
    joint.strength = 0
    const first = this.blocks.find((block) => block.id === joint.firstId)
    const second = this.blocks.find((block) => block.id === joint.secondId)
    for (const block of [first, second]) {
      if (!block) continue
      const stillJoined = this.structureJoints.some((candidate) => !candidate.broken
        && candidate.kind === joint.kind
        && (candidate.firstId === block.id || candidate.secondId === block.id))
      if (!stillJoined) block.jointKinds = block.jointKinds.filter((kind) => kind !== joint.kind)
    }
    if (!first && !second) return
    const x = ((first?.x ?? second.x) + (second?.x ?? first.x)) / 2
    const y = ((first?.y ?? second.y) + (second?.y ?? first.y)) / 2
    const breakColor = joint.kind === 'masonry' ? '#aab0aa'
      : joint.kind === 'resin-bond' ? '#e0aa3f'
        : joint.kind === 'root-bond' ? '#728b55'
          : joint.kind === 'iron-clamp' ? '#3f6259'
            : joint.kind === 'integral-truss' ? '#6f8e88' : '#d6b06d'
    this.spawnBurst(x, y, breakColor, 7)
  }

  damageStructureJoints(block, damage) {
    if (!(damage > 0)) return
    const liveJoints = this.structureJoints.filter((joint) => !joint.broken
      && (joint.firstId === block.id || joint.secondId === block.id))
    if (!liveJoints.length) return
    // One impact has one finite damage budget. Without this distribution, a
    // well-connected stone in the new city wall copied the same hit into every
    // incident seam and paradoxically made the reinforced network fail faster.
    const sharedDamage = damage / Math.sqrt(liveJoints.length)
    for (const joint of liveJoints) {
      joint.strength -= sharedDamage * joint.damageScale
      if (joint.strength <= 0) this.breakStructureJoint(joint)
    }
  }

  applyStructureJoints(timeScale) {
    if (!this.structureJoints.length) return
    const blocksById = new Map(this.blocks.map((block) => [block.id, block]))
    for (const joint of this.structureJoints) {
      if (joint.broken) continue
      const first = blocksById.get(joint.firstId)
      const second = blocksById.get(joint.secondId)
      if (!first || !second) {
        this.breakStructureJoint(joint)
        continue
      }
      const errorX = (second.x - first.x) - joint.restDx
      const errorY = (second.y - first.y) - joint.restDy
      const stretch = Math.hypot(errorX, errorY)
      const angleError = ((
        (second.rotation - first.rotation - joint.restRotation) + 180
      ) % 360 + 360) % 360 - 180
      const relativeVx = second.vx - first.vx
      const relativeVy = second.vy - first.vy
      const relativeSpeed = Math.hypot(relativeVx, relativeVy)
      const stress = stretch + Math.abs(angleError) * 0.12 + relativeSpeed * 0.7
      if (stretch > joint.breakDistance
        || stress > joint.breakDistance + joint.strength * 0.72) {
        this.breakStructureJoint(joint)
        continue
      }
      if (first.asleep && second.asleep) continue
      const inverseFirstMass = first.asleep ? 0 : 1 / Math.max(0.35, first.mass)
      const inverseSecondMass = second.asleep ? 0 : 1 / Math.max(0.35, second.mass)
      const inverseMassSum = inverseFirstMass + inverseSecondMass
      if (inverseMassSum <= 0) continue
      const correctionScale = Math.min(1, joint.stiffness * timeScale)
      const correctionX = errorX * correctionScale / inverseMassSum
      const correctionY = errorY * correctionScale / inverseMassSum
      first.x += correctionX * inverseFirstMass
      first.y += correctionY * inverseFirstMass
      second.x -= correctionX * inverseSecondMass
      second.y -= correctionY * inverseSecondMass
      const damping = Math.min(0.45, joint.velocityDamping * timeScale)
      const velocityX = relativeVx * damping / inverseMassSum
      const velocityY = relativeVy * damping / inverseMassSum
      first.vx += velocityX * inverseFirstMass
      first.vy += velocityY * inverseFirstMass
      second.vx -= velocityX * inverseSecondMass
      second.vy -= velocityY * inverseSecondMass
      const angularCorrection = angleError * joint.angularStiffness * timeScale
      first.vr += angularCorrection * inverseFirstMass
      second.vr -= angularCorrection * inverseSecondMass
    }
  }

  shamanAuraStrength(squirrel, tickOffset = 0) {
    if (!squirrel || squirrel.variant !== 'shaman') return 0
    const ability = SPECIAL_SQUIRREL_BY_TYPE.shaman.ability
    const pulseTicks = Math.max(1, Math.round(ability.pulseMs / STEP_MS))
    const phase = ((squirrel.behaviorTick + tickOffset) % pulseTicks + pulseTicks) % pulseTicks
    const pulse = 0.84 + 0.16 * (Math.sin(phase / pulseTicks * Math.PI * 2) * 0.5 + 0.5)
    return pulse * (squirrel.chilledTicks > 0 ? 0.35 : 1)
  }

  specialUpdraftAt(x) {
    const updraft = this.specialRule('wind-zone')
    if (!updraft) return 0
    const lanes = updraft.parameters.lanes || 3
    const width = updraft.parameters.width || 82
    const pulsePeriod = Math.max(1, updraft.parameters.pulsePeriodTicks || 1)
    const pulseStrength = updraft.parameters.pulsePeriodTicks
      ? 0.65 + 0.35 * (Math.sin(this.mapPulseTick / pulsePeriod * Math.PI * 2) * 0.5 + 0.5)
      : 1
    for (let lane = 0; lane < lanes; lane += 1) {
      if (Math.abs(x - (600 + lane * 190)) <= width / 2) {
        return (updraft.parameters.accelerationY || -0.18) * pulseStrength
      }
    }
    return 0
  }

  separateBirdFromSquirrel(bird, squirrel, restitution = 0.38) {
    let dx = bird.x - squirrel.x
    let dy = bird.y - squirrel.y
    let distance = Math.hypot(dx, dy)
    if (distance < 0.001) {
      dx = bird.vx >= 0 ? -1 : 1
      dy = -0.15
      distance = Math.hypot(dx, dy)
    }
    const normalX = dx / distance
    const normalY = dy / distance
    const minimumDistance = (bird.hitRadius || bird.radius) + squirrel.radius + 1
    if (distance < minimumDistance) {
      bird.x += normalX * (minimumDistance - distance)
      bird.y += normalY * (minimumDistance - distance)
    }
    const normalSpeed = bird.vx * normalX + bird.vy * normalY
    if (normalSpeed < 0) {
      bird.vx -= (1 + restitution) * normalSpeed * normalX
      bird.vy -= (1 + restitution) * normalSpeed * normalY
    } else {
      bird.vx *= 0.82
      bird.vy *= 0.82
    }
  }

  resolveBirdPlatformCollision(bird, platform) {
    return this.resolveBirdPlatformPartCollision(bird, platform, platform)
  }

  resolveBirdPlatformPartCollision(bird, rectangle, hostPlatform = rectangle) {
    const collider = {
      x: bird.x,
      y: bird.y,
      radius: bird.hitRadius || bird.radius,
      vx: bird.vx,
      vy: bird.vy,
      mass: bird.mass,
    }
    const restitution = hostPlatform.reflective
      ? hostPlatform.surfaceRestitution || 0.88
      : 0.45
    const previousCollider = {
      ...collider,
      x: Number.isFinite(bird.previousX) ? bird.previousX : bird.x,
      y: Number.isFinite(bird.previousY) ? bird.previousY : bird.y,
    }
    const previousRectangle = {
      ...rectangle,
      x: Number.isFinite(rectangle.previousX) ? rectangle.previousX : rectangle.x,
      y: Number.isFinite(rectangle.previousY) ? rectangle.previousY : rectangle.y,
      rotation: Number.isFinite(rectangle.previousRotation)
        ? rectangle.previousRotation
        : rectangle.rotation,
    }
    const response = resolveSweptCircleRectCollision(collider, rectangle, {
      previousCircle: previousCollider,
      previousRectangle,
      restitution,
      // Track endpoints flip the planned velocity after clamping. Use the
      // velocity that actually moved the wall this tick, so the impact never
      // receives an impulse from the next leg of its route.
      surfaceVx: Number.isFinite(hostPlatform.collisionVx)
        ? hostPlatform.collisionVx : hostPlatform.vx || 0,
      surfaceVy: Number.isFinite(hostPlatform.collisionVy)
        ? hostPlatform.collisionVy : hostPlatform.vy || 0,
      mass: bird.mass,
      padding: 0.08,
    })
    if (!response) return null
    bird.x = response.x
    bird.y = response.y
    bird.vx = response.vx
    bird.vy = response.vy
    return response
  }

  platformImpactDamage(bird, collision) {
    if ((collision?.closingMomentum || 0) < ORDINARY_ACORN_IMPACT_RULES.minimumMomentum) return 0
    const directPower = bird.damage + bird.flatDamageBonus + bird.tacticalSwapDamageBonus
    const forcefulType = ['bomb', 'dash', 'drill', 'quake',
      'talent-emberheart', 'talent-thunder-root'].includes(bird.type)
    return Math.max(1, Math.floor(directPower),
      forcefulType && collision.closingMomentum >= 7 ? 2 : 1)
  }

  applyPlatformDamage(platform, impact) {
    const wasDerailed = Boolean(platform.derailed)
    const result = applyDestructiblePlatformImpact(platform, impact)
    Object.assign(platform, result.platform, {
      carrierHp: [...result.platform.carrierHp],
      carrierMaxHp: [...result.platform.carrierMaxHp],
    })
    const outcome = result.outcome
    if (outcome.carrierDestroyed) {
      this.spawnBurst(platform.x, platform.y - platform.height / 2 - 26, '#e4c878', 15)
      this.showBanner('搬运飞鼠失去升力 · 挡板开始坠落', 1250)
    } else if (outcome.boardDestroyed) {
      platform.boardBreakTicks = 90
      this.spawnBurst(platform.x, platform.y, '#b77743', 18)
      this.showBanner('活动木墙断裂 · 弹道已经打开', 1200)
    }
    if (!wasDerailed && platform.derailed) {
      this.emitSpecialChallenge('platform-derailed', {
        platformId: platform.id,
        tags: platform.objectiveTags || [],
      })
    }
    return outcome
  }

  architectureMechanismModels(tick = this.mapPulseTick) {
    const category = this.architectureBlueprint?.buildingPlan?.category
    return this.architectureMechanisms.map((binding) => {
      const radiansPerTick = /sawwheel/u.test(binding.mechanism)
        ? 0.014
        : /wind|rotor/u.test(binding.mechanism)
          ? category === 'royal' ? 0.008 : 0.012
          : 0
      const degreesPerTick = radiansPerTick * 180 / Math.PI
      return resolveArchitectureMechanismModel({
        binding,
        blocks: this.blocks,
        spinDegrees: tick * degreesPerTick,
        previousSpinDegrees: Math.max(0, tick - 1) * degreesPerTick,
      })
    })
  }

  resolveBirdArchitectureMechanismCollisions(bird) {
    const circle = {
      x: bird.x, y: bird.y, radius: bird.hitRadius || bird.radius,
      vx: bird.vx, vy: bird.vy, mass: bird.mass,
    }
    const previousCircle = {
      ...circle,
      x: Number.isFinite(bird.previousX) ? bird.previousX : bird.x,
      y: Number.isFinite(bird.previousY) ? bird.previousY : bird.y,
    }
    for (const model of this.architectureMechanismModels()) {
      if (!model.active) continue
      const host = this.blocks.find((block) => (
        block?.[model.binding.hostIdentityKey] === model.binding.hostId
      ))
      if (!host) continue
      for (const part of model.collisionParts) {
        const rectangle = part.shape === 'circle'
          ? { ...part, width: part.radius * 2, height: part.radius * 2 }
          : part
        const response = resolveSweptCircleRectCollision(circle, rectangle, {
          previousCircle,
          previousRectangle: {
            ...rectangle,
            x: rectangle.previousX,
            y: rectangle.previousY,
            rotation: rectangle.previousRotation,
          },
          restitution: bird.restitution,
          surfaceVx: host.vx || 0,
          surfaceVy: host.vy || 0,
          mass: bird.mass,
          padding: 0.08,
        })
        if (!response) continue
        bird.x = response.x; bird.y = response.y
        bird.vx = response.vx; bird.vy = response.vy
        const hitKey = `${model.binding.id}:${part.role}`
        if ((bird.lastHits.get(hitKey) ?? -99) + 7 <= this.fixedTick) {
          bird.lastHits.set(hitKey, this.fixedTick)
          bird.lastHits.set(host.id, this.fixedTick)
          const damage = this.platformImpactDamage(bird, response)
          if (damage > 0) {
            this.damageBlock(host, damage)
            if (this.blocks.includes(host)) {
              host.vx += -response.normalX * response.closingMomentum * 0.08 / Math.max(1, host.mass)
              host.vy += -response.normalY * response.closingMomentum * 0.06 / Math.max(1, host.mass)
              host.asleep = false
            }
          }
          this.spawnBurst(part.x, part.y, '#d8ba6a', 9)
        }
        return true
      }
    }
    return false
  }

  specialObjectiveProgress(stageScore = this.score - this.levelStartScore) {
    const remainingTargetCount = this.squirrels.length
    const initialTargetCount = Math.max(this.levelInitialTargetCount, remainingTargetCount)
    const eliminatedTargetCount = Math.max(0, initialTargetCount - remainingTargetCount)
    if (this.mode !== 'special') {
      const collapseRatio = calculateStructuralCollapseRatio(this.specialInitialBlockCount, this.blocks)
      this.levelPeakCollapseRatio = Math.max(this.levelPeakCollapseRatio, collapseRatio)
      const dailyObjective = this.mode === 'daily' ? this.dailySegment?.objective : null
      const requiredCollapseRatio = dailyObjective?.minimumCollapseRatio || 0
      const targetsMet = remainingTargetCount === 0
      const collapseMet = collapseRatio >= requiredCollapseRatio
      const bossMet = !dailyObjective?.bossRequired
        || !this.squirrels.some((squirrel) => squirrel.isBoss)
      return {
        type: dailyObjective?.type || 'eliminate-all',
        met: targetsMet && collapseMet && bossMet,
        targetsMet,
        collapseMet,
        bossMet,
        collapseRatio,
        requiredCollapseRatio,
        parScore: 0,
        parScoreMet: true,
        stageScore: Math.max(0, Math.floor(stageScore)),
        initialTargetCount,
        remainingTargetCount,
        eliminatedTargetCount,
      }
    }
    const objective = evaluateSpecialObjective({
      objective: this.specialObjective,
      initialBlockCount: this.specialInitialBlockCount,
      blocks: this.blocks,
      remainingTargetCount,
      remainingBossCount: this.squirrels.filter((squirrel) => squirrel.isBoss).length,
      stageScore,
    })
    this.levelPeakCollapseRatio = Math.max(this.levelPeakCollapseRatio, objective.collapseRatio)
    return {
      ...objective,
      initialTargetCount,
      remainingTargetCount,
      eliminatedTargetCount,
    }
  }

  currentClearEvaluation(stageScore = null) {
    const objective = this.specialObjectiveProgress(stageScore ?? this.score - this.levelStartScore)
    const evaluation = evaluateLevelClear({
      shotsRemaining: this.shotsRemaining,
      baseShotBudget: this.baseShotBudget,
      bonusShotsGranted: this.bonusShotsGranted,
      bonusShotsRemaining: this.bonusShotsRemaining,
      targetsMet: objective.targetsMet,
      remainingTargetCount: objective.remainingTargetCount,
      collapseRatio: objective.collapseRatio,
      requiredCollapseRatio: objective.requiredCollapseRatio,
      mode: this.mode,
    })
    if (this.mode === 'special' && evaluation.stars >= 3 && objective.parScore > 0 && !objective.parScoreMet) {
      return Object.freeze({ ...evaluation, stars: 2, parScoreMet: false })
    }
    return Object.freeze({ ...evaluation, parScoreMet: objective.parScoreMet })
  }

  triggerQuakeBird(bird) {
    if (!bird?.quakeArmed) return
    bird.quakeArmed = false
    const ability = SPECIAL_ACORN_BY_TYPE.quake.ability
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    const shockRadius = ability.shockRadius * abilityPower
    const wakeRadius = ability.blockWakeRadius * abilityPower
    const shockDamage = ability.shockDamage * abilityPower
    this.spawnExplosion(bird.x, bird.y, shockRadius)
    this.audio.boom()
    this.addShake(14)
    for (const block of [...this.blocks]) {
      if (Math.hypot(block.x - bird.x, block.y - bird.y) > wakeRadius) continue
      block.asleep = false
      block.restTicks = 0
      if (Math.hypot(block.x - bird.x, block.y - bird.y) <= shockRadius) {
        this.damageBlock(block, shockDamage)
      }
    }
    for (const squirrel of [...this.squirrels]) {
      if (Math.hypot(squirrel.x - bird.x, squirrel.y - bird.y) > shockRadius) continue
      squirrel.submerged = false
      if (squirrel.variant === 'burrower') {
        squirrel.burrowStunTicks = Math.round(SPECIAL_SQUIRREL_BY_TYPE.burrower.ability.quakeStunMs / STEP_MS)
      }
      this.damageSquirrel(squirrel, shockDamage)
    }
    this.shockwave(bird.x, bird.y, wakeRadius, 11 * abilityPower, { forceWake: true })
    this.removeBird(bird)
    this.resolutionRequested = true
  }

  triggerFireAcorn(bird, primaryBlock) {
    if (!bird?.fireArmed || !this.blocks.includes(primaryBlock)) return false
    bird.fireArmed = false
    const ability = FIRE_ACORN.ability
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    const spreadRadius = ability.spreadRadius * abilityPower
    const maximumNeighbors = Math.max(1, Math.round(ability.maximumNeighbors * abilityPower))
    const connectedIds = new Set()
    for (const joint of this.structureJoints) {
      if (joint.broken) continue
      if (joint.firstId === primaryBlock.id) connectedIds.add(joint.secondId)
      if (joint.secondId === primaryBlock.id) connectedIds.add(joint.firstId)
    }
    const neighbors = this.blocks
      .filter((block) => block !== primaryBlock
        && Math.hypot(block.x - primaryBlock.x, block.y - primaryBlock.y) <= spreadRadius)
      .sort((first, second) => {
        const connectionDelta = Number(connectedIds.has(second.id)) - Number(connectedIds.has(first.id))
        if (connectionDelta) return connectionDelta
        return Math.hypot(first.x - primaryBlock.x, first.y - primaryBlock.y)
          - Math.hypot(second.x - primaryBlock.x, second.y - primaryBlock.y)
      })
      .slice(0, maximumNeighbors)
    const targets = [primaryBlock, ...neighbors]
    for (const block of targets) {
      this.damageBlock(block, ability.ignitionDamage * abilityPower, { sound: false })
      if (!this.blocks.includes(block)) continue
      this.igniteBlock(block, {
        durationTicks: Math.round(ability.burnDurationTicks * abilityPower),
        pulseDamage: block.type === 'wood'
          ? ability.woodBurnDamage
          : ability.otherBurnDamage,
      })
    }
    this.particles.push({
      id: this.id('ring'), kind: 'ring', x: primaryBlock.x, y: primaryBlock.y,
      color: BIRD_STYLE.fire.accent, radius: 12,
      grow: spreadRadius / 11, life: 11, maxLife: 11,
    })
    this.spawnBurst(primaryBlock.x, primaryBlock.y, BIRD_STYLE.fire.accent, 30)
    this.addShake(5)
    this.showBanner(`熔芯附着 · 灼烧 ${targets.length} 处结构节点`, 1400)
    this.audio.fireBurst()
    this.removeBird(bird)
    this.resolutionRequested = true
    return true
  }

  pendingLaunchWind() {
    if (this.mode !== 'special') return this.windX
    const windRule = this.specialRule('wind-cycle')
    const sequence = windRule?.parameters?.sequence
    const keeperAlive = this.specialCampaignId !== 'polar-clocktower'
      || this.squirrels.some((squirrel) => squirrel.variant === 'shaman')
    return windForPendingLaunch({
      currentWind: this.windX,
      sequence,
      completedLaunches: this.specialLaunchCount,
      advanceSteps: this.bossPhaseEffects.windAdvanceSteps || 1,
      keeperAlive,
    })
  }

  displayedWind() {
    return this.state === 'play' && !this.turnActive && this.currentBird && !this.currentBird.launched
      ? this.pendingLaunchWind()
      : this.windX
  }

  advanceSpecialRulesOnLaunch() {
    if (this.mode !== 'special') return
    const windRule = this.specialRule('wind-cycle')
    const sequence = windRule?.parameters?.sequence
    if (Array.isArray(sequence) && sequence.length) {
      const windKeeperAlive = this.specialCampaignId !== 'polar-clocktower'
        || this.squirrels.some((squirrel) => squirrel.variant === 'shaman')
      if (windKeeperAlive) {
        this.showBanner(`钟面风向切换 · ${this.windX < 0 ? '←' : '→'} ${Math.abs(this.windX).toFixed(2)}`, 1100)
      } else this.showBanner('司钟祭司已倒下 · 风向锁定', 1050)
    }
    const waterRule = this.specialRule('water-cycle')
    const levels = waterRule?.parameters?.levels
    if (Array.isArray(levels) && levels.length) {
      const startPhase = getSpecialStage(this.specialCampaignId, this.level)?.layoutModifiers
        ?.find((entry) => entry.kind === 'water-start-phase')?.value || 0
      const waterSteps = this.bossPhaseEffects.waterAdvanceSteps || 1
      this.specialWaterY = levels[(startPhase + this.specialLaunchCount * waterSteps) % levels.length]
      this.showBanner(`潮位变化 · ${this.specialWaterY < 455 ? '涨潮' : '退潮'}`, 1050)
    }
    const ceilingRule = this.specialRule('shot-triggered-blocks')
    if (ceilingRule) {
      const allMarked = this.blocks.filter((block) => block.ceilingDrop)
      const availableMarked = allMarked.filter((block) => !block.ceilingDropScheduled)
      const count = this.bossPhaseEffects.ceilingGroupSize || ceilingRule.parameters.groupSize || 2
      const candidates = (allMarked.length
        ? availableMarked
        : [...this.blocks].sort((first, second) => first.y - second.y)).slice(0, count)
      if (candidates.length) {
        for (const block of candidates) block.ceilingDropScheduled = true
        this.pendingMapEvents.push({
          kind: 'ceiling-drop',
          at: this.mapPulseTick + (ceilingRule.parameters.wakeDelayTicks || 20),
          ids: candidates.map((block) => block.id),
          impact: ceilingRule.parameters.impactDamage || 2,
        })
      }
    }
  }

  stepSpecialMapRules() {
    if (this.mode !== 'special') return
    for (let index = this.pendingMapEvents.length - 1; index >= 0; index -= 1) {
      const event = this.pendingMapEvents[index]
      if (event.at > this.mapPulseTick) continue
      this.pendingMapEvents.splice(index, 1)
      if (event.kind === 'ceiling-drop') {
        for (const id of event.ids) {
          const block = this.blocks.find((candidate) => candidate.id === id)
          if (!block) continue
          block.asleep = false
          block.vy += event.impact
          block.vr += this.levelRng.range(-0.8, 0.8)
        }
        this.showBanner('地层松动 · 顶部块落下', 1200)
        this.addShake(5)
        this.specialChallengeCeilingDropsThisShot += 1
      } else if (event.kind === 'lightning-chain-check') {
        const collapseGain = Math.max(
          0,
          this.specialObjectiveProgress().collapseRatio - (event.collapseRatio || 0),
        )
        if (collapseGain >= 0.035) {
          this.emitSpecialChallenge('collapse-chain-complete', {
            chainId: event.chainId,
            collapseGain,
          })
        }
      } else if (event.kind === 'fault-transfer') {
        this.shockwave(event.x, event.y, event.radius, event.power, { forceWake: true, source: 'environment' })
      }
    }
    const pulse = this.specialRule('timed-impulse')
    const interval = this.bossPhaseEffects.lightningIntervalTicks || pulse?.parameters?.intervalTicks
    const warningTicks = pulse?.parameters?.warningTicks || 0
    const timedRuleTick = this.specialRuleStartTick === null
      ? -1
      : Math.max(0, this.mapPulseTick - this.specialRuleStartTick)
    const pulsePhase = interval && timedRuleTick >= 0 ? timedRuleTick % interval : -1
    if (interval && this.blocks.length && warningTicks > 0 && pulsePhase === interval - warningTicks) {
      const candidates = this.blocks.filter((block) => block.lightningRod || block.critical || block.reflective)
      const pool = candidates.length ? candidates : this.blocks
      const target = pool[this.levelRng.integer(0, pool.length)]
      this.lightningTargetId = target.id
      target.magnetizedTicks = warningTicks + (pulse.parameters.polarityTicks || 0)
      this.showBanner('雷击预警 · 发光建材即将受冲击', 1050)
    }
    if (interval && this.mapPulseTick > 0 && pulsePhase === 0 && this.blocks.length) {
      const pulseNumber = Math.max(1, Math.floor(timedRuleTick / interval))
      const collapseRatioBeforePulse = this.specialObjectiveProgress().collapseRatio
      const target = this.blocks.find((block) => block.id === this.lightningTargetId)
        || this.blocks[this.levelRng.integer(0, this.blocks.length)]
      const polarity = pulseNumber % 2 ? -1 : 1
      target.asleep = false
      target.vy -= pulse.parameters.impulse || 5
      target.vx += polarity * (pulse.parameters.impulse || 5) * 0.45
      target.vr += this.levelRng.range(-1.2, 1.2)
      target.magnetizedTicks = pulse.parameters.polarityTicks || 0
      this.lightningTargetId = null
      this.emitSpecialChallenge('map-rule-pulse', {
        ruleId: pulse.id || 'storm-lightning-pulse',
        pulseCount: pulseNumber,
      })
      this.pendingMapEvents.push({
        kind: 'lightning-chain-check',
        at: this.mapPulseTick + 42,
        collapseRatio: collapseRatioBeforePulse,
        chainId: `lightning-pulse-${pulseNumber}`,
      })
      this.spawnBurst(target.x, target.y, this.specialTheme?.colors?.accent || '#f6d069', 18)
      this.showBanner('雷击脉冲 · 建筑支点已受冲击', 1150)
      this.addShake(7)
    }
  }

  contentLevelForCurrentStage() {
    if (this.mode !== 'daily') return this.level
    return DAILY_CONTENT_LEVELS[clamp(this.level - 1, 0, DAILY_CONTENT_LEVELS.length - 1)]
  }

  dailyProfileForCurrentStage() {
    if (this.mode !== 'daily') return null
    this.dailyChallenge = buildDailyChallenge(this.runSeed)
    this.dailySegment = this.dailyChallenge.segments[this.level - 1] || this.dailyChallenge.segments[0]
    this.dailyEffects = {
      ...(this.dailyChallenge.modifiers.boon.effects || {}),
      ...(this.dailyChallenge.modifiers.pressure.effects || {}),
    }
    return this.dailySegment
  }

  applyDailyProfile(generated) {
    if (this.mode !== 'daily') return generated
    const segment = this.dailyProfileForCurrentStage()
    const effects = this.dailyEffects
    const hpMultiplier = effects.structureHpMultiplier || 1
    const targetHpMultiplier = effects.targetHpMultiplier || 1
    const blocks = generated.blocks.map((block) => ({
      ...block,
      hp: Math.max(1, Math.ceil(block.hp * hpMultiplier)),
      mass: (Number.isFinite(block.mass) ? block.mass : 1) * (hpMultiplier > 1 ? 1.08 : 1),
    }))
    let targets = generated.targets.map((target) => ({
      ...target,
      hp: Math.max(1, Math.ceil(target.hp * targetHpMultiplier)),
    }))
    if (effects.extraTargets > 0 && targets.length) {
      const source = targets.at(-1)
      const size = Math.max(12, Number(source.size) || 14)
      const radius = size * 0.78
      const groundY = GROUND_Y - radius
      const candidates = Array.from({ length: 35 }, (_, index) => 470 + index * 25)
        .filter((x) => blocks.every((block) => (
          Math.abs(x - block.x) > block.width / 2 + radius + 5
          || Math.abs(groundY - block.y) > block.height / 2 + radius + 5
        )))
        .filter((x) => targets.every((target) => (
          Math.hypot(x - target.x, groundY - target.y)
            > radius + Math.max(12, Number(target.size) || 14) * 0.78 + 6
        )))
        .map((x) => ({
          x,
          clearance: Math.min(
            ...blocks.map((block) => Math.abs(x - block.x) - block.width / 2),
            ...targets.map((target) => Math.hypot(x - target.x, groundY - target.y)),
          ),
        }))
        .sort((first, second) => second.clearance - first.clearance || first.x - second.x)
      if (candidates.length) {
        targets = [...targets, {
          ...source,
          x: candidates[0].x,
          y: groundY,
          size,
          boss: false,
          variant: 'normal',
          role: 'daily-pressure-ground-guard',
          spawnClass: 'ground',
          hp: Math.max(1, Math.ceil(source.hp * 0.82)),
          reward: 650,
        }]
      }
    }
    if (segment.objective.bossRequired && targets.length) {
      targets[0] = {
        ...targets[0],
        boss: true,
        variant: 'king',
        title: '今日守将',
        hp: Math.max(18, Math.ceil(targets[0].hp * 2.4)),
        size: Math.max(48, targets[0].size || 0),
        mass: Math.max(2.4, targets[0].mass || 0),
        knockbackMultiplier: 0.38,
        reward: Math.max(2400, targets[0].reward || 0),
      }
    }
    const shotDelta = (effects.bonusShots || 0) + (effects.baseShotBudgetDelta || 0)
    const authoredBudget = generated.baseShotBudget ?? generated.birdsAvailable + 1
    const adjustedBudget = Math.max(3, authoredBudget + shotDelta)
    return {
      ...generated,
      blocks,
      targets,
      windX: clamp(generated.windX * (effects.windMultiplier || 1),
        -MAX_WIND_MAGNITUDE, MAX_WIND_MAGNITUDE),
      birdsAvailable: Math.max(2, adjustedBudget - 1),
      baseShotBudget: adjustedBudget,
    }
  }

  failureAidContext(extra = {}) {
    const boss = this.squirrels.find((squirrel) => squirrel.isBoss)
    const objective = this.specialObjectiveProgress()
    return {
      mode: this.mode,
      campaignId: this.specialCampaignId,
      level: this.mode === 'endless' ? Math.max(1, this.level - MAIN_LEVELS) : this.level,
      runSeed: this.runSeed,
      remainingTargetCount: objective.remainingTargetCount,
      collapseRatio: Math.max(objective.collapseRatio, this.levelPeakCollapseRatio),
      requiredCollapseRatio: objective.requiredCollapseRatio,
      stageScore: Math.max(0, this.score - this.levelStartScore),
      parScore: objective.parScore,
      bossAlive: Boolean(boss),
      bossHpRemaining: Math.max(0, Math.ceil(boss?.hp || 0)),
      bossMaxHp: Math.max(0, Math.ceil(boss?.maxHp || 0)),
      ammoDepleted: this.shotsRemaining <= 0,
      ...extra,
    }
  }

  persistFailureAidState() {
    if (this.practiceSpecial || this.replayLevelOnly) return
    const slotId = this.currentRunSlotId()
    if (!slotId) return
    this.save.failureAidStates[slotId] = normalizeFailureAidState(this.failureAidState)
    this.persist()
  }

  claimCurrentElderAid() {
    const claim = claimElderAid(this.failureAidState, {
      ...this.failureAidContext(),
      availableBirdTypes: this.birdPoolForCurrentLevel(),
    })
    if (!claim.ok) {
      this.showBanner('长老援助当前不可领取', 1500)
      return
    }
    this.failureAidState = claim.state
    this.pendingElderAid = [...claim.queue]
    this.persistFailureAidState()
    this.audio.ui()
    this.startLevel({ retry: true })
  }

  emitSpecialChallenge(type, payload = {}) {
    if (!this.specialChallengeState) return null
    const previousStatus = this.specialChallengeState.status
    this.specialChallengeState = consumeSpecialChallengeEvent(this.specialChallengeState, {
      type,
      tick: this.mapPulseTick,
      stageScore: Math.max(0, Math.floor(this.score - this.levelStartScore)),
      ...payload,
    })
    if (previousStatus === 'active' && this.specialChallengeState.status === 'completed') {
      this.showBanner(`秘境契约完成 · ${this.specialChallengeState.label}`, 1800)
    } else if (previousStatus === 'active' && this.specialChallengeState.status === 'failed') {
      const summary = summarizeSpecialChallenge(this.specialChallengeState)
      this.showBanner(`秘境契约未达成 · ${summary?.detail || '可继续完成基础目标'}`, 1800)
    }
    return this.specialChallengeState
  }

  syncSpecialChallengeScore() {
    if (!this.specialChallengeState) return
    const stageScore = Math.max(0, Math.floor(this.score - this.levelStartScore))
    if (stageScore === this.specialChallengeLastScore) return
    this.specialChallengeLastScore = stageScore
    this.emitSpecialChallenge('score-changed', { stageScore })
  }

  settleSpecialChallengeShot() {
    if (!this.specialChallengeState || !this.turnActive || this.birds.length > 0
      || this.specialChallengeSettledLaunchCount >= this.specialLaunchCount) return
    const collapseRatio = this.specialObjectiveProgress().collapseRatio
    const collapseGain = Math.max(0, collapseRatio - this.specialChallengeShotStartCollapse)
    const acceptsDirectShotChain = this.specialChallengeState.metric === 'stage-score-before-rule-pulses'
    if ((this.specialChallengeCeilingDropsThisShot > 0 || acceptsDirectShotChain) && collapseGain >= 0.035) {
      this.emitSpecialChallenge('collapse-chain-complete', {
        chainId: `shot-${this.specialLaunchCount}-${this.specialChallengeCeilingDropsThisShot > 0 ? 'ceiling' : 'storm'}-chain`,
        collapseGain,
      })
    }
    this.emitSpecialChallenge('shot-settled', {
      shotId: `shot-${this.specialLaunchCount}`,
      collapseGain,
    })
    this.specialChallengeSettledLaunchCount = this.specialLaunchCount
  }

  birdPoolForCurrentLevel() {
    if (this.mode === 'special') {
      const stage = getSpecialStage(this.specialCampaignId, this.level)
      return stage ? [...stage.availableBirdTypes] : ['red']
    }
    const contentLevel = this.contentLevelForCurrentStage()
    const pool = [...birdTypePool(contentLevel)]
    for (const entry of SPECIAL_ACORNS) {
      if (entry.firstLevel <= contentLevel) pool.push(entry.type)
    }
    return [...new Set(pool)]
  }

  enemyPoolForCurrentLevel() {
    if (this.mode === 'special') {
      const campaign = getSpecialCampaign(this.specialCampaignId)
      return campaign ? campaign.enemyVariants.map((type) => SPECIAL_SQUIRREL_BY_TYPE[type]).filter(Boolean) : []
    }
    const contentLevel = this.contentLevelForCurrentStage()
    return SPECIAL_SQUIRRELS.filter((entry) => entry.firstLevel <= contentLevel)
  }

  chooseEnemyVariant(target, index, levelSeed = this.levelSeed) {
    if (target.boss) return target.variant || 'general'
    if (this.mode === 'special' && SPECIAL_SQUIRREL_BY_TYPE[target.variant]) return target.variant
    const pool = this.enemyPoolForCurrentLevel()
    if (!pool.length) return 'normal'
    const rng = new Rng(mixSeed(levelSeed, 'enemy-roster', index))
    const earliest = Math.min(...pool.map((entry) => entry.firstLevel))
    const chance = clamp(0.18 + Math.max(0, this.contentLevelForCurrentStage() - earliest) * 0.025, 0.18, 0.52)
    return rng.chance(chance) ? rng.pick(pool).type : 'normal'
  }

  startLevel({ retry }) {
    if (retry) this.score = this.levelStartScore
    else this.levelStartScore = this.score
    if (!retry) this.levelGoldenEggClaimed = false
    this.missionCollapsed = true
    this.clearWorld()
    this.levelSeed = mixSeed(this.runSeed, 'level', this.level)
    this.levelRng = new Rng(mixSeed(this.levelSeed, 'physics'))
    this.loadoutRng = new Rng(mixSeed(this.levelSeed, 'loadout'))
    this.lootRng = new Rng(mixSeed(this.levelSeed, 'loot'))
    this.visualRng = new Rng(mixSeed(this.levelSeed, 'visual'))
    const contentLevel = this.contentLevelForCurrentStage()
    const dailySegment = this.dailyProfileForCurrentStage()
    let generated = this.mode === 'special'
      ? generateSpecialLevel({
        campaignId: this.specialCampaignId,
        stageNumber: this.level,
        runSeed: this.runSeed,
        lucky: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1) > 1,
        luckyMultiplier: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1),
      })
      : generateLevel({
        level: contentLevel,
        seed: dailySegment?.generation?.seed ?? mixSeed(this.levelSeed, 'layout'),
        mode: this.mode,
        lucky: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1) > 1,
        luckyMultiplier: this.talentEffect('lucky', 'goldenEggChanceMultiplier', 1),
      })
    generated = this.applyDailyProfile(generated)
    this.mapType = generated.mapType
    this.terrainProfile = generated.terrainProfile || DEFAULT_TERRAIN_PROFILE
    this.windX = generated.windX
    this.currentSky = generated.skyColor
    this.mainEnvironmentTheme = this.mode === 'main' || this.mode === 'endless'
      ? getMainEnvironmentTheme(generated.environmentThemeLevel || this.level)
      : null
    this.strongholdTier = generated.strongholdTier || 0
    this.fortressStyle = generated.fortressStyle || null
    this.structureFamily = generated.structureFamily || null
    this.architectureBlueprint = generated.architectureBlueprint || null
    this.movingPlatformProfile = generated.movingPlatformProfile || null
    this.specialArchitecture = generated.specialArchitecture || null
    this.audio.requestMusic(this.mode === 'special'
      ? AUDIO_MUSIC_THEME.MYSTIC
      : this.strongholdTier > 0 ? AUDIO_MUSIC_THEME.STRONGHOLD : AUDIO_MUSIC_THEME.EXPEDITION)
    this.specialStageNumber = this.mode === 'special' ? this.level : 0
    this.specialRules = [...(generated.rules || [])]
    this.specialTheme = generated.theme || null
    this.specialBackgroundScene = this.mode === 'special'
      ? buildSpecialBackgroundScene(generated.campaign, generated.stage)
      : null
    this.specialObjective = generated.objective || null
    this.specialChallengeState = this.mode === 'special'
      ? createSpecialChallengeState({ campaignId: this.specialCampaignId, stageNumber: this.level })
      : null
    this.specialChallengeLastScore = 0
    this.specialChallengeShotStartCollapse = 0
    this.specialChallengeCeilingDropsThisShot = 0
    this.specialChallengeSettledLaunchCount = 0
    this.bossPhases = generated.bossPhases || []
    this.bossPhaseEffects = {}
    this.triggeredBossPhases = new Set()
    const waterRule = this.specialRule('water-cycle')
    const startPhase = generated.stage?.layoutModifiers
      ?.find((entry) => entry.kind === 'water-start-phase')?.value || 0
    this.specialWaterY = Array.isArray(waterRule?.parameters?.levels)
      ? waterRule.parameters.levels[startPhase % waterRule.parameters.levels.length]
      : null
    this.specialInitialBlockCount = generated.blocks.length
    this.levelInitialTargetCount = generated.targets.length
    this.specialLaunchCount = 0
    this.specialFirstImpactTick = null
    this.decoys = (generated.decoys || []).map((decoy) => ({
      ...decoy,
      id: decoy.id || this.id('decoy'),
      revealed: Boolean(decoy.revealed),
    }))
    this.blocks = generated.blocks.map((block) => ({
      ...block,
      id: this.id('block'),
      maxHp: block.hp,
      w: block.width,
      h: block.height,
      vx: 0,
      vy: 0,
      rotation: Number.isFinite(block.rotation) ? block.rotation : 0,
      vr: 0,
      asleep: true,
      restTicks: 0,
      permanentlyFrozen: false,
      brittleDamageMultiplier: 1,
      initialX: block.x,
      initialY: block.y,
      initialRotation: Number.isFinite(block.rotation) ? block.rotation : 0,
      previousX: block.x,
      previousY: block.y,
      previousRotation: Number.isFinite(block.rotation) ? block.rotation : 0,
      initialHp: block.hp,
      materialRulePrimed: false,
      faultPrimed: false,
      frameImpactSpeed: 0,
      fallStartY: block.y,
      minimumY: block.y,
      windStress: 0,
      burningTicks: 0,
      burnDurationTotal: 0,
      burnPulseDamage: 0,
      burnPulseApplied: false,
      surfaceContactLastTick: true,
      slideSoundAnchorX: block.x,
      jointKinds: [],
    }))
    this.architectureSilhouetteFrame = this.captureArchitectureSilhouetteFrame()
    this.architectureSilhouetteBaseline = this.captureArchitectureSilhouetteBaseline()
    const mechanismAnchors = this.architectureBlueprint
      ?.buildingPlan?.silhouetteSpec?.mechanismAnchors || []
    this.architectureMechanisms = this.architectureSilhouetteFrame && mechanismAnchors.length
      ? [...createArchitectureMechanismBindings({
        anchors: mechanismAnchors,
        blocks: this.blocks,
        frame: this.architectureSilhouetteFrame,
        idPrefix: `level-${this.level}-mechanism`,
      })]
      : []
    this.structureContactPairs = new Set()
    this.structureJointCounts = structureJointCountsForLevel(this.mode, this.level)
    this.unlockedStructureJointKinds = structureJointKindsForLevel(this.mode, this.level)
    if (this.mode === 'daily') {
      this.structureJointCounts = structureJointCountsForLevel(this.mode, contentLevel)
      this.unlockedStructureJointKinds = structureJointKindsForLevel(this.mode, contentLevel)
    }
    this.structureJoints = buildStructureJoints(this.blocks, {
      contactTolerance: STRUCTURE_CONTACT_TOLERANCE,
      allowedKinds: this.unlockedStructureJointKinds,
      desiredCounts: this.structureJointCounts,
    })
    for (const joint of this.structureJoints) {
      const first = this.blocks.find((block) => block.id === joint.firstId)
      const second = this.blocks.find((block) => block.id === joint.secondId)
      if (first && !first.jointKinds.includes(joint.kind)) first.jointKinds.push(joint.kind)
      if (second && !second.jointKinds.includes(joint.kind)) second.jointKinds.push(joint.kind)
    }
    this.squirrels = generated.targets.map((target, index) => {
      const variant = this.chooseEnemyVariant(target, index)
      const roster = SPECIAL_SQUIRREL_BY_TYPE[variant]
      const hp = target.boss ? target.hp : Math.max(target.hp, roster?.stats.hp || 1)
      const size = target.boss
        ? Math.max(target.size, roster?.stats.size || 0)
        : roster?.stats.size || target.size
      const targetY = variant === 'glider' ? Math.min(target.y, 270 + (index % 3) * 52) : target.y
      return {
      ...target,
      y: targetY,
      id: this.id('squirrel'),
      isBoss: target.boss,
      variant,
      hp,
      maxHp: hp,
      size,
      reward: target.reward || roster?.stats.score || (target.boss ? 2000 : 500),
      vx: 0,
      vy: 0,
      asleep: variant !== 'glider',
      radius: size * 0.78,
      homeX: target.x,
      homeY: targetY,
      behaviorTick: 0,
      repairsUsed: 0,
      lastRepairCycle: -1,
      shieldHp: variant === 'shield' ? SPECIAL_SQUIRREL_BY_TYPE.shield.ability.charges : 0,
      mass: target.boss
        ? Math.max(target.mass || 1, roster?.stats.mass || 1, 2.1)
        : roster?.stats.mass || 1,
      knockbackMultiplier: target.boss
        ? target.knockbackMultiplier ?? 0.45
        : 1,
      bossTitle: target.boss ? target.title || '松鼠首领' : null,
      bossPhaseStage: 0,
      submerged: false,
      chilledTicks: 0,
      burrowStunTicks: 0,
      repairTargetId: null,
      repairChannelTicks: 0,
      spawnProtectionTicks: target.boss ? BOSS_SPAWN_PROTECTION_TICKS : 0,
      unresolvedTicks: 0,
      recoveryCount: 0,
      pinnedTicks: 0,
      pinned: false,
      wasSubmerged: false,
    }})
    this.platforms = generated.platforms.map((platform) => {
      const runtimePlatform = {
        ...platform,
        id: this.id('platform'),
        vx: platform.velocityX || 0,
        vy: platform.velocityY || 0,
        rotation: platform.rotation || 0,
        vr: 0,
        derailed: false,
        previousX: platform.x,
        previousY: platform.y,
        previousRotation: platform.rotation || 0,
      }
      const destructible = initializeDestructiblePlatform(runtimePlatform, {
        carrierKind: platform.cablePlatform ? 'storm-glider' : 'flying-squirrel',
      })
      return {
        ...destructible,
        carrierHp: [...destructible.carrierHp],
        carrierMaxHp: [...destructible.carrierMaxHp],
      }
    })
    const placedSquirrels = []
    // The encounter owns the boss composition. Reserve its authored court
    // before guards claim every doorway, then distribute guards around it.
    const spawnOrder = [...this.squirrels].sort((first, second) => Number(second.isBoss) - Number(first.isBoss))
    for (const squirrel of spawnOrder) {
      const clearPosition = this.findClearSquirrelPosition(squirrel, [], {
        safeSpawn: true,
        avoidCircles: placedSquirrels,
      })
      if (clearPosition) {
        squirrel.x = clearPosition.x
        squirrel.y = clearPosition.y
        if (squirrel.variant === 'glider' || squirrel.variant === 'burrower') {
          squirrel.homeX = clearPosition.x
          squirrel.homeY = clearPosition.y
        }
      }
      squirrel.lastSafeX = squirrel.x
      squirrel.lastSafeY = squirrel.y
      squirrel.spawnX = squirrel.x
      squirrel.spawnY = squirrel.y
      placedSquirrels.push(squirrel)
    }
    // Replays restore the collectible's score opportunity. The persistent
    // reward receipt in collectEgg prevents a retry from minting currency.
    this.goldenEgg = generated.goldenEgg
      ? { ...generated.goldenEgg, id: this.id('egg'), radius: 14 }
      : null
    // Endless keeps its ordinary magazine at eight; rare talent-contract
    // acorns are injected afterward as clearly marked, non-rating ammunition.
    const shotAllocation = this.shotAllocationForGenerated(generated)
    const totalShots = shotAllocation.initialShotTotal
    this.baseShotBudget = shotAllocation.baseShotBudget
    this.bonusShotsGranted = shotAllocation.grantedPackShots
    this.bonusShotsRemaining = shotAllocation.grantedPackShots
    this.shotsRemaining = totalShots
    const birdPool = this.birdPoolForCurrentLevel()
    if (this.mode === 'special') {
      const signatureBird = generated.campaign?.signatureBird?.id
      this.shotQueue = [...buildSpecialShotQueue({
        birdTypes: birdPool,
        signatureBirdType: signatureBird,
        totalShots,
        seed: mixSeed(this.levelSeed, 'loadout'),
      })]
    } else this.shotQueue = [...buildMainAmmoQueue({
      level: contentLevel,
      seed: mixSeed(this.levelSeed, 'loadout'),
      totalShots,
      availableTypes: birdPool,
    })]
    this.shotQueueBonus = this.shotQueue.map((_, index) => index >= this.baseShotBudget)
    this.shotQueueDamageBonus = this.shotQueue.map(() => 0)
    for (let index = 0; index < (shotAllocation.overflowPackReinforcements || 0); index += 1) {
      this.shotQueueDamageBonus[index] += shotAllocation.overflowPackDirectDamageBonus || 0
    }
    this.shotQueueAce = this.shotQueue.map(() => false)
    this.injectTalentAcorns(shotAllocation.grantedContractShots)
    if (this.hasFusion('expeditionArsenal')) {
      const count = this.fusionEffect('expeditionArsenal', 'aceSupplyCount', 1)
      const bonusIndexes = this.shotQueueBonus
        .map((bonus, index) => bonus ? index : -1)
        .filter((index) => index >= 0)
        .slice(-count)
      for (const index of bonusIndexes) {
        this.shotQueueDamageBonus[index] += this.fusionEffect(
          'expeditionArsenal', 'aceSupplyDamageBonus', 2,
        )
        this.shotQueueAce[index] = true
      }
    }
    const failureSlotId = this.currentRunSlotId()
    this.failureAidState = syncFailureAidLevel(
      (this.practiceSpecial || this.replayLevelOnly)
        ? this.failureAidState
        : this.save.failureAidStates?.[failureSlotId] || this.failureAidState,
      this.failureAidContext(),
    )
    if (failureSlotId && !this.practiceSpecial && !this.replayLevelOnly) {
      this.save.failureAidStates[failureSlotId] = this.failureAidState
    }
    if (this.pendingElderAid.length) {
      const aidQueue = [...this.pendingElderAid]
      this.pendingElderAid = []
      for (const type of [...aidQueue].reverse()) this.grantQueuedBird(type, { front: true })
      queueMicrotask(() => this.showBanner(
        `长老援助抵达 · ${aidQueue.length} 枚增援橡宝（不计余弹星）`,
        2200,
      ))
    }
    this.levelRescuesUsed = 0
    this.mapPulseTick = 0
    this.lightningTargetId = null
    this.combo = 0
    this.spawnBird()
    this.setState('play')
    this.persistCheckpoint()
    const overview = this.overviewCameraTarget()
    this.camera.x = overview.x
    this.camera.y = overview.y
    this.camera.zoom = overview.zoom
    dom.panel.innerHTML = ''
    dom.canvas.focus({ preventScroll: true })
    this.showBanner(this.levelLabel(), 1400)
    if (!this.windTraceHintShown
      && this.talentEffect('windTrace', 'windTraceFirstContactHintEnabled', false)
      && Math.abs(this.pendingLaunchWind()) >= 0.005) {
      this.windTraceHintShown = true
      this.showBanner('风迹推演已显示金色风偏落点 · 蓝色新手弹道仍由设置控制', 2400)
    }
    const discoveries = []
    for (const type of new Set(this.shotQueue)) discoveries.push(`bird:${type}`)
    for (const squirrel of this.squirrels) {
      if (SPECIAL_SQUIRREL_BY_TYPE[squirrel.variant]) discoveries.push(`enemy:${squirrel.variant}`)
      else if (squirrel.isBoss) discoveries.push(squirrel.variant === 'king' ? 'enemy:king' : 'enemy:general')
    }
    if (this.mapType === 'wind') discoveries.push('map:wind')
    if (this.mapType === 'moving') discoveries.push('map:moving-platform')
    if (this.mode === 'special' && this.specialCampaignId) discoveries.push(`map:${this.specialCampaignId}`)
    if (this.blocks.some((block) => block.type === 'stone')) discoveries.push('object:stone')
    if (this.blocks.some((block) => block.type === 'ice')) discoveries.push('object:ice')
    for (const constructionId of new Set(
      this.blocks.map((block) => block.constructionId).filter(Boolean),
    )) {
      const discoveryId = CONSTRUCTION_MATERIALS[constructionId]?.discoveryId
      if (discoveryId) discoveries.push(discoveryId)
    }
    if (this.structureJoints.some((joint) => joint.kind === 'nail')) discoveries.push('object:wood-nails')
    if (this.structureJoints.some((joint) => joint.kind === 'masonry')) discoveries.push('object:stone-masonry')
    if (this.goldenEgg) discoveries.push('item:golden-acorn')
    if (this.mode === 'special' || this.mode === 'daily') {
      const unseen = [...new Set(discoveries)].filter((id) => DISCOVERIES[id] && !this.save.seenDiscoveries[id])
      const campaign = this.mode === 'special' ? getSpecialCampaign(this.specialCampaignId) : null
      const priorities = [
        campaign ? `bird:${campaign.signatureBird.id}` : null,
        this.mode === 'daily' ? unseen.find((id) => id.startsWith('bird:')) : null,
        unseen.find((id) => id.startsWith('enemy:')),
      ].filter(Boolean)
      const blocking = [...new Set([...priorities, ...unseen])].filter((id) => unseen.includes(id)).slice(0, 2)
      const digest = unseen.filter((id) => !blocking.includes(id))
      for (const id of digest) this.save.seenDiscoveries[id] = true
      this.discoveryDigestCount = digest.length
      if (digest.length) this.persist()
      this.queueDiscoveries(blocking)
    } else this.queueDiscoveries(discoveries)
    queueMicrotask(() => {
      if (!this.showNextDiscovery() && !this.save.tutorialSeen) this.showCoachmark(1)
    })
  }

  id(prefix) {
    return `${prefix}-${this.nextId++}`
  }

  makeBird(type, x = SLING_X, y = ANCHOR_Y) {
    const style = BIRD_STYLE[type] || BIRD_STYLE.red
    const roster = SPECIAL_ACORN_BY_TYPE[type]
    const talentContract = TALENT_ACORN_CONTRACT_BY_TYPE[type]
    const baseType = talentContract?.baseType || type
    const authored = baseType === FIRE_ACORN.type
      ? FIRE_ACORN
      : SPECIAL_ACORN_BY_TYPE[baseType] || roster
    let damage = authored?.stats.baseDamage || 1
    if (type === 'bomb' || type === 'dash') damage += 1
    return {
      id: this.id('bird'), type, x, y, previousX: x, previousY: y, vx: 0, vy: 0,
      radius: style.radius,
      hitRadius: style.radius + ACORN_HITBOX_BONUS,
      damage, baseDamage: damage,
      flatDamageBonus: this.talentEffect('power', 'damageBonus', 0),
      rotation: 0, used: false, launched: false,
      age: 0, stillTicks: 0, groundContactTicks: 0, lastHits: new Map(), splitClone: false,
      blockContactIds: new Set(), structureStillTicks: 0, platformStillTicks: 0,
      bossHitIds: new Set(),
      stalledTicks: 0, outsideWorldTicks: 0,
      flameHitIds: new Set(), flameIgnitionCount: 0,
      mass: authored?.stats.mass || 1,
      launchSpeed: (authored?.stats.launchSpeed || 1) * (this.dailyEffects.launchPowerMultiplier || 1),
      gravityScale: authored?.stats.gravityScale || 1,
      windMultiplier: (authored?.stats.windMultiplier || 1) * (this.dailyEffects.acornWindMultiplier || 1),
      restitution: authored?.stats.restitution || 0.42,
      pierceRemaining: 0,
      piercedBlockIds: new Set(),
      abilityTicks: 0,
      fireArmed: false,
      moltenHeartArmed: false,
      quakeArmed: false,
      thunderRootArmed: false,
      windborneStrikeReady: false,
      windTraceStrikeReady: false,
      tacticalSwap: false,
      tacticalSwapDamageBonus: 0,
      abilityPowerMultiplier: 1,
      windPrecisionVelocityRetention: 1,
      pendingWindPrecisionRetention: 1,
      specialRicochetCount: 0,
      tetherTargetId: null,
      tetherTargetKind: null,
      tetherTicks: 0,
      tetherStartX: null,
      tetherStartY: null,
      tetherDisplacement: 0,
      tetherReleaseTriggered: false,
      tetherAbilityPower: 1,
      lifecycleReason: 'ready',
      talentContractId: talentContract?.abilityId || null,
    }
  }

  spawnBird() {
    if (this.state === 'play' && this.specialObjectiveProgress().met) return
    if (this.shotsRemaining <= 0) {
      this.currentBird = null
      return
    }
    const type = this.shotQueue.shift() || this.loadoutRng.pick(this.birdPoolForCurrentLevel())
    const bonusShot = Boolean(this.shotQueueBonus.shift())
    const grantedDamageBonus = Number(this.shotQueueDamageBonus.shift()) || 0
    const aceSupply = Boolean(this.shotQueueAce.shift())
    this.currentBird = this.makeBird(type)
    this.currentBird.bonusShot = bonusShot
    this.currentBird.flatDamageBonus += grantedDamageBonus
    this.currentBird.grantedDamageBonus = grantedDamageBonus
    this.currentBird.aceSupply = aceSupply
    this.turnActive = false
    this.dragging = false
    this.keyboardAiming = false
    this.queueDiscoveries([`bird:${type}`])
    if (this.state === 'play') queueMicrotask(() => this.showNextDiscovery())
    this.syncUI()
  }

  canSelectQueuedBird() {
    return this.state === 'play'
      && this.talentEffect('tacticalMagazine', 'queueSelectionEnabled', false)
      && !this.paused
      && !this.settingsOpen
      && !this.discoveryOpen
      && !this.talentLibraryOpen
      && !this.emergencySupplyOpen
      && !this.turnActive
      && !this.dragging
      && Boolean(this.currentBird)
      && !this.currentBird.launched
  }

  cancelCurrentAim({ announce = false } = {}) {
    if (!this.currentBird || this.currentBird.launched) return false
    const wasAiming = this.dragging || this.keyboardAiming
    if (this.dragPointerId !== null && dom.canvas.hasPointerCapture(this.dragPointerId)) {
      dom.canvas.releasePointerCapture(this.dragPointerId)
    }
    this.dragging = false
    this.dragPointerId = null
    this.keyboardAiming = false
    this.currentBird.x = SLING_X
    this.currentBird.y = ANCHOR_Y
    if (announce && wasAiming) this.showBanner('已取消瞄准 · 可重新选择待发橡果', 1300)
    this.syncUI()
    return wasAiming
  }

  selectQueuedBird(index) {
    if (!this.canSelectQueuedBird() || !Number.isInteger(index)
      || index < 0 || index >= this.shotQueue.length) return false

    const previousType = this.currentBird.type
    const result = swapLoadedAmmoWithQueue({
      loaded: {
        type: previousType,
        bonusShot: this.currentBird.bonusShot,
        damageBonus: this.currentBird.grantedDamageBonus,
        aceSupply: this.currentBird.aceSupply,
      },
      queue: this.shotQueue,
      bonusFlags: this.shotQueueBonus,
      damageBonuses: this.shotQueueDamageBonus,
      aceFlags: this.shotQueueAce,
      selectedIndex: index,
    })
    this.shotQueue = [...result.queue]
    this.shotQueueBonus = [...result.bonusFlags]
    this.shotQueueDamageBonus = [...result.damageBonuses]
    this.shotQueueAce = [...result.aceFlags]
    this.currentBird = this.makeBird(result.loaded.type)
    this.currentBird.bonusShot = result.loaded.bonusShot
    const tacticalDamageBonus = this.talentEffect(
      'tacticalMagazine', 'queueSwapDirectDamageBonus', 0,
    )
    const tacticalVelocity = this.talentEffect(
      'tacticalMagazine', 'queueSwapVelocityMultiplier', 1,
    )
    const tacticalAbilityPower = this.talentEffect(
      'tacticalMagazine', 'queueSwapAbilityPowerMultiplier', 1,
    )
    this.currentBird.flatDamageBonus += result.loaded.damageBonus + tacticalDamageBonus
    this.currentBird.grantedDamageBonus = result.loaded.damageBonus
    this.currentBird.tacticalSwapDamageBonus = tacticalDamageBonus
    this.currentBird.aceSupply = result.loaded.aceSupply
    this.currentBird.tacticalSwap = true
    this.currentBird.launchSpeed *= tacticalVelocity
    this.currentBird.abilityPowerMultiplier = tacticalAbilityPower
    this.keyboardAiming = false
    this.audio.ui()
    const selectedName = (BIRD_STYLE[result.loaded.type] || BIRD_STYLE.red).name
    const returnedName = (BIRD_STYLE[previousType] || BIRD_STYLE.red).name
    const tacticalCopy = tacticalDamageBonus > 0
      ? ` · 战术装填+伤${tacticalDamageBonus}` : ''
    this.showBanner(`已换装 ${selectedName} · ${returnedName}回到待发位${tacticalCopy}`, 1300)
    this.syncUI()
    queueMicrotask(() => dom.canvas.focus({ preventScroll: true }))
    return true
  }

  grantQueuedBird(type = null, { front = false, damageBonus = 0 } = {}) {
    const grantedType = type || this.loadoutRng.pick(this.birdPoolForCurrentLevel())
    if (front) {
      this.shotQueue.unshift(grantedType)
      this.shotQueueBonus.unshift(true)
      this.shotQueueDamageBonus.unshift(damageBonus)
      this.shotQueueAce.unshift(false)
    } else {
      this.shotQueue.push(grantedType)
      this.shotQueueBonus.push(true)
      this.shotQueueDamageBonus.push(damageBonus)
      this.shotQueueAce.push(false)
    }
    this.shotsRemaining += 1
    this.bonusShotsGranted += 1
    this.bonusShotsRemaining += 1
    const addedDiscovery = this.queueDiscoveries([`bird:${grantedType}`])
    if (addedDiscovery && this.state === 'play') queueMicrotask(() => this.showNextDiscovery())
    return grantedType
  }

  emergencySupplyContext() {
    return {
      mode: this.mode,
      shotsRemaining: this.shotsRemaining,
      shotQueue: this.shotQueue,
      shotInFlight: this.birds.length > 0 || Boolean(this.currentBird?.launched),
      levelCleared: this.specialObjectiveProgress().met,
      opportunityUsed: this.emergencySupplyUsed,
      automaticRescuePending: false,
      ammoPool: this.birdPoolForCurrentLevel(),
      goldenAcorns: this.save.eggs,
      seed: this.levelSeed,
      level: this.level,
      campaignId: this.specialCampaignId || '',
    }
  }

  openEmergencySupply() {
    const eligibility = evaluateEmergencySupplyEligibility(this.emergencySupplyContext())
    if (!eligibility.eligible) return false
    const quote = quoteEmergencySupply({ goldenAcorns: this.save.eggs })
    const small = quote.offers.find((offer) => offer.id === 'two-acorns')
    const large = quote.offers.find((offer) => offer.id === 'six-acorns')
    this.cancelDrag()
    this.focusBeforeEmergencySupply = document.activeElement
    this.emergencySupplyOpen = true
    this.renderWhenFrozen = true
    setText(dom.emergencySupplyBalance, `持有 ${quote.goldenAcorns} 枚金橡果`)
    dom.emergencySupplySmall.disabled = !small?.affordable
    dom.emergencySupplyLarge.disabled = !large?.affordable
    setAttribute(dom.emergencySupplySmall, 'aria-label', small?.affordable
      ? '花费1枚金橡果购买2枚当前关卡随机橡果'
      : `应急小袋，金橡果不足，还差${small?.shortfall || 1}枚`)
    setAttribute(dom.emergencySupplyLarge, 'aria-label', large?.affordable
      ? '花费5枚金橡果购买6枚当前关卡随机橡果'
      : `远征补给箱，金橡果不足，还差${large?.shortfall || 5}枚`)
    dom.emergencySupplyCard.hidden = false
    this.syncUI()
    const focusTarget = small?.affordable
      ? dom.emergencySupplySmall
      : large?.affordable ? dom.emergencySupplyLarge : dom.emergencySupplyDecline
    queueMicrotask(() => focusTarget.focus({ preventScroll: true }))
    return true
  }

  closeEmergencySupply({ restoreFocus = false } = {}) {
    if (!this.emergencySupplyOpen) return
    this.emergencySupplyOpen = false
    dom.emergencySupplyCard.hidden = true
    this.renderWhenFrozen = true
    this.syncUI()
    if (restoreFocus) {
      const target = this.focusBeforeEmergencySupply instanceof HTMLElement
        ? this.focusBeforeEmergencySupply
        : dom.canvas
      queueMicrotask(() => target.focus({ preventScroll: true }))
    }
    this.focusBeforeEmergencySupply = null
  }

  buyEmergencySupply(offerId) {
    if (!this.emergencySupplyOpen) return
    const purchase = purchaseEmergencySupply({ ...this.emergencySupplyContext(), offerId })
    if (!purchase.ok) {
      this.showBanner(purchase.reason === 'insufficient-golden-acorns'
        ? '金橡果不足，无法购买这份补给'
        : '当前无法呼叫补给', 1600)
      return
    }
    this.emergencySupplyUsed = true
    this.save.eggs = purchase.goldenAcornsRemaining
    for (const type of purchase.queue) this.grantQueuedBird(type)
    this.closeEmergencySupply()
    this.persist()
    this.audio.ui()
    this.showBanner(`紧急补给抵达 · ${purchase.addedAcorns} 枚橡果 · 余额 ${this.save.eggs}`, 1900)
    this.spawnBird()
    queueMicrotask(() => dom.canvas.focus({ preventScroll: true }))
  }

  declineEmergencySupply() {
    if (!this.emergencySupplyOpen) return
    this.emergencySupplyUsed = true
    this.closeEmergencySupply()
    this.gameOver()
  }

  launchCurrent() {
    const bird = this.currentBird
    if (!bird || bird.launched || this.shotsRemaining <= 0) return
    const committedWind = this.pendingLaunchWind()
    bird.vx = (SLING_X - bird.x) * POWER * bird.launchSpeed
    bird.vy = (ANCHOR_Y - bird.y) * POWER * bird.launchSpeed
    if (Math.hypot(bird.vx, bird.vy) < 0.8) {
      bird.x = SLING_X
      bird.y = ANCHOR_Y
      return
    }
    if (bird.vy < -4) {
      const retention = this.talentEffect('feather', 'highArcVelocityRetention', 1)
      bird.vx *= retention
      bird.vy *= retention
    }
    bird.launched = true
    // The mission drawer is useful before aiming, but should never cover the
    // flight path once the player commits to a shot.
    this.missionCollapsed = true
    this.keyboardAiming = false
    this.birds.push(bird)
    this.shotsRemaining -= 1
    if (bird.bonusShot) this.bonusShotsRemaining = Math.max(0, this.bonusShotsRemaining - 1)
    this.windX = committedWind
    const windPrecisionThreshold = this.talentEffect(
      'windTrace', 'windPrecisionMinimumWind', Number.POSITIVE_INFINITY,
    )
    if (Math.abs(this.windX) >= windPrecisionThreshold) {
      bird.windTraceStrikeReady = true
      bird.windPrecisionVelocityRetention = this.talentEffect(
        'windTrace', 'windPrecisionVelocityRetention', 1,
      ) * (bird.tacticalSwap
        ? this.fusionEffect('windchartArsenal', 'forecastSwapVelocityRetention', 1)
        : 1)
    }
    this.specialLaunchCount += 1
    if (this.mode === 'special' && this.specialRuleStartTick === null) {
      this.specialRuleStartTick = this.mapPulseTick
    }
    this.specialSettlementStartTick = null
    this.specialChallengeShotStartCollapse = this.specialObjectiveProgress().collapseRatio
    this.specialChallengeCeilingDropsThisShot = 0
    this.emitSpecialChallenge('shot-launched', { shotId: bird.id, birdType: bird.type })
    this.levelPlayedBirdTypes.add(bird.type)
    this.chainBlastsThisShot = 0
    if (this.hasFusion('windSovereign') && Math.abs(this.windX) >= 0.045) {
      bird.windborneTicks = this.fusionEffect('windSovereign', 'windborneDurationTicks', 180)
      bird.windborneStrikeReady = true
    }
    this.advanceSpecialRulesOnLaunch()
    this.turnActive = true
    this.combo = 0
    this.trail = []
    this.audio.launch()
    if (!this.save.tutorialSeen) this.showCoachmark(3)
    else if (bird.type !== 'red' && !this.save.abilityTutorialSeen) this.showAbilityCoachmark(bird)
    this.syncUI()
  }

  injectTalentAcorns(maximumCopies = Number.POSITIVE_INFINITY) {
    let insertedCopies = 0
    for (const contract of this.specialAcornContracts()) {
      const copies = Math.max(0, Math.floor(contract.copiesPerLevel || 0))
      for (let copy = 0; copy < copies && insertedCopies < maximumCopies; copy += 1) {
        const index = contract.queuePolicy === 'insert-middle'
          ? Math.max(0, Math.min(this.shotQueue.length, Math.floor(this.shotQueue.length / 2)))
          : this.shotQueue.length
        this.shotQueue.splice(index, 0, contract.type)
        this.shotQueueBonus.splice(index, 0, true)
        this.shotQueueDamageBonus.splice(index, 0, 0)
        this.shotQueueAce.splice(index, 0, false)
        this.shotsRemaining += 1
        this.bonusShotsGranted += 1
        this.bonusShotsRemaining += 1
        insertedCopies += 1
      }
      if (insertedCopies >= maximumCopies) break
    }
    return insertedCopies
  }

  freezeArea(x, y, radius, brittleMultiplier, spreadTargets = 0, permanentBlockFreeze = true) {
    const frozen = this.blocks.filter((block) => Math.hypot(block.x - x, block.y - y) <= radius)
    if (spreadTargets > 0 && frozen.length) {
      const frozenIds = new Set(frozen.map((block) => block.id))
      const spread = this.blocks
        .filter((block) => !frozenIds.has(block.id))
        .map((block) => ({
          block,
          distance: Math.min(...frozen.map((source) => Math.hypot(block.x - source.x, block.y - source.y))),
        }))
        .filter((entry) => entry.distance <= 72)
        .sort((first, second) => first.distance - second.distance)
        .slice(0, spreadTargets)
      for (const entry of spread) frozen.push(entry.block)
    }
    for (const block of frozen) {
      block.permanentlyFrozen = Boolean(permanentBlockFreeze)
      block.brittleDamageMultiplier = Math.max(block.brittleDamageMultiplier || 1, brittleMultiplier)
      block.vx *= 0.25
      block.vy *= 0.25
      block.vr *= 0.2
      block.asleep = false
    }
    const frostAbility = SPECIAL_ACORN_BY_TYPE.frost.ability
    for (const squirrel of this.squirrels) {
      if (Math.hypot(squirrel.x - x, squirrel.y - y) > radius) continue
      squirrel.chilledTicks = Math.round(frostAbility.enemySlowMs / STEP_MS)
      squirrel.vx *= frostAbility.enemySpeedMultiplier
      squirrel.vy *= frostAbility.enemySpeedMultiplier
    }
    return frozen.length
  }

  triggerMoltenHeart(bird, primaryBlock) {
    const ability = TALENT_ACORN_CONTRACT_BY_TYPE['talent-emberheart'].ability
    if (!ability.attachOnImpact || !primaryBlock || !this.blocks.includes(primaryBlock)) return false
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    const pulseRadius = ability.pulseRadius * abilityPower
    const candidates = this.blocks
      .filter((block) => Math.hypot(block.x - primaryBlock.x, block.y - primaryBlock.y) <= pulseRadius)
      .sort((first, second) => Math.hypot(first.x - primaryBlock.x, first.y - primaryBlock.y)
        - Math.hypot(second.x - primaryBlock.x, second.y - primaryBlock.y))
    this.moltenPulseSequences.push({
      id: this.id('molten-sequence'),
      targetIds: candidates.map((block) => block.id),
      centerX: primaryBlock.x,
      centerY: primaryBlock.y,
      radius: pulseRadius,
      damage: ability.pulseDamage * abilityPower,
      pulsesRemaining: Math.max(1, Math.round((ability.pulseCount || 1) * abilityPower)),
      ticksUntil: 0,
      intervalTicks: Math.max(1, Math.floor(ability.pulseIntervalTicks || 1)),
    })
    this.showBanner(`熔心附着 · ${ability.pulseCount} 轮脉冲锁定 ${candidates.length} 处承重点`, 1550)
    this.removeBird(bird)
    return true
  }

  stepMoltenPulseSequences() {
    for (let index = this.moltenPulseSequences.length - 1; index >= 0; index -= 1) {
      const sequence = this.moltenPulseSequences[index]
      if (sequence.ticksUntil > 0) {
        sequence.ticksUntil -= 1
        continue
      }
      const targets = sequence.targetIds
        .map((id) => this.blocks.find((block) => block.id === id))
        .filter(Boolean)
      for (const block of targets) {
        this.damageBlock(block, sequence.damage, { sound: false })
        if (!this.blocks.includes(block)) continue
        this.igniteBlock(block, {
          durationTicks: this.talentEffect('flame', 'burnDurationTicks', 90),
          pulseDamage: block.type === 'wood' ? 2 : 1,
        })
        this.spawnBurst(block.x, block.y, BIRD_STYLE['talent-emberheart'].accent, 8)
      }
      this.particles.push({
        id: this.id('ring'), kind: 'ring', x: sequence.centerX, y: sequence.centerY,
        color: '#ffcf58', radius: 14, grow: sequence.radius / 9, life: 9, maxLife: 9,
      })
      sequence.pulsesRemaining -= 1
      if (sequence.pulsesRemaining <= 0) {
        this.moltenPulseSequences.splice(index, 1)
        this.resolutionRequested = true
      } else sequence.ticksUntil = sequence.intervalTicks
    }
  }

  triggerPrismBell(bird) {
    const ability = TALENT_ACORN_CONTRACT_BY_TYPE['talent-prism-bell'].ability
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    const radius = ability.ringRadius * this.talentEffect('frost', 'frostRadiusMultiplier', 1)
      * abilityPower
    const brittleMultiplier = ability.brittleDamageMultiplier
      * this.talentEffect('frost', 'brittleDamageMultiplier', 1) * abilityPower
    const spreadTargets = this.talentEffect('frost', 'brittleSpreadTargets', 0)
    const firstCount = this.freezeArea(
      bird.x, bird.y, radius, brittleMultiplier, spreadTargets,
      ability.permanentBlockFreeze,
    )
    const reflectionReach = radius * ability.reflectionReachMultiplier
    const secondAnchor = [...this.blocks, ...this.platforms]
      .map((surface) => ({
        surface,
        distance: Math.hypot(surface.x - bird.x, surface.y - bird.y),
      }))
      .filter((entry) => entry.distance > radius * 0.7 && entry.distance <= reflectionReach)
      .sort((first, second) => first.distance - second.distance)[0]
    let reflectedCount = 0
    if (secondAnchor && ability.reflectedRings > 0) {
      const directionX = (secondAnchor.surface.x - bird.x) / Math.max(1, secondAnchor.distance)
      const directionY = (secondAnchor.surface.y - bird.y) / Math.max(1, secondAnchor.distance)
      const reflectedRadius = radius * ability.reflectedRingScale
      const reflectedX = secondAnchor.surface.x + directionX * reflectedRadius * 0.42
      const reflectedY = secondAnchor.surface.y + directionY * reflectedRadius * 0.42
      reflectedCount = this.freezeArea(
        reflectedX, reflectedY, reflectedRadius,
        brittleMultiplier, spreadTargets, ability.permanentBlockFreeze,
      )
      this.particles.push({
        id: this.id('ring'), kind: 'ring', x: reflectedX, y: reflectedY,
        color: '#effdff', radius: 14, grow: reflectedRadius / 12, life: 12, maxLife: 12,
      })
    }
    this.particles.push({
      id: this.id('ring'), kind: 'ring', x: bird.x, y: bird.y,
      color: BIRD_STYLE['talent-prism-bell'].accent, radius: 18,
      grow: radius / 13, life: 13, maxLife: 13,
    })
    this.spawnBurst(bird.x, bird.y, BIRD_STYLE['talent-prism-bell'].accent, 30)
    this.showBanner(`镜霜${secondAnchor ? '折射' : '霜环'} · 永久冻脆 ${firstCount + reflectedCount} 块建材`, 1500)
    this.audio.slowmo()
  }

  triggerThunderRoot(bird) {
    const ability = TALENT_ACORN_CONTRACT_BY_TYPE['talent-thunder-root'].ability
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    const chainTargets = Math.max(1, Math.round(ability.chainTargets * abilityPower))
    const chainRadius = ability.chainRadius * abilityPower
    const selected = []
    const traversedJointIds = new Set()
    let anchor = { x: bird.x, y: bird.y, id: null }
    for (let index = 0; index < chainTargets; index += 1) {
      const connectedOptions = anchor.id ? this.structureJoints
        .filter((joint) => !joint.broken
          && (joint.firstId === anchor.id || joint.secondId === anchor.id))
        .map((joint) => {
          const otherId = joint.firstId === anchor.id ? joint.secondId : joint.firstId
          return { joint, block: this.blocks.find((block) => block.id === otherId) }
        })
        .filter((entry) => entry.block && !selected.includes(entry.block))
        .sort((first, second) => {
          const criticalDelta = Number(Boolean(second.block.critical)) - Number(Boolean(first.block.critical))
          if (criticalDelta) return criticalDelta
          return (second.joint.strength / Math.max(1, second.joint.maxStrength))
            - (first.joint.strength / Math.max(1, first.joint.maxStrength))
        }) : []
      let next = connectedOptions[0]?.block
      if (next) traversedJointIds.add(connectedOptions[0].joint.id)
      else next = this.blocks
        .filter((block) => !selected.includes(block)
          && Math.hypot(block.x - anchor.x, block.y - anchor.y) <= chainRadius)
        .sort((first, second) => Math.hypot(first.x - anchor.x, first.y - anchor.y)
          - Math.hypot(second.x - anchor.x, second.y - anchor.y))[0]
      if (!next) break
      selected.push(next)
      anchor = next
    }
    for (const block of selected) {
      this.damageBlock(block, ability.blockDamage * abilityPower, { damageJoints: false })
      this.spawnBurst(block.x, block.y, BIRD_STYLE['talent-thunder-root'].accent, 12)
    }
    for (const joint of this.structureJoints) {
      if (!traversedJointIds.has(joint.id) || joint.broken) continue
      joint.strength -= ability.jointDamage * abilityPower
      if (joint.strength <= 0) this.breakStructureJoint(joint)
    }
    this.shockwave(bird.x, bird.y, 92 * abilityPower, 4 * abilityPower, { forceWake: true })
    this.showBanner(`雷根追索 · 沿承重链击穿 ${selected.length} 处节点`, 1400)
    this.audio.ui()
  }

  triggerFaultCrown(primaryBlock) {
    if (!this.hasFusion('faultCrown') || this.fusionFracturedBlockIds.has(primaryBlock.id)) return
    this.fusionFracturedBlockIds.add(primaryBlock.id)
    const radius = this.fusionEffect('faultCrown', 'structuralFractureRadius', 128)
    const maximum = this.fusionEffect('faultCrown', 'structuralFractureMaxTargets', 3)
    const damage = this.fusionEffect('faultCrown', 'structuralFractureDamage', 2)
    const targets = this.blocks
      .filter((block) => block !== primaryBlock && isHardStructureMaterial(block)
        && Math.hypot(block.x - primaryBlock.x, block.y - primaryBlock.y) <= radius)
      .sort((first, second) => Math.hypot(first.x - primaryBlock.x, first.y - primaryBlock.y)
        - Math.hypot(second.x - primaryBlock.x, second.y - primaryBlock.y))
      .slice(0, maximum)
    for (const block of targets) {
      this.damageBlock(block, damage)
      this.spawnBurst(block.x, block.y, '#e9bd68', 8)
    }
    if (targets.length) this.showBanner(`破城王冠 · 承重地裂贯穿 ${targets.length} 块坚材`, 1250)
  }

  useAbility() {
    const bird = this.currentBird
    if (this.state !== 'play' || this.paused || this.settingsOpen || this.discoveryOpen
      || this.talentLibraryOpen || this.emergencySupplyOpen || !bird?.launched || bird.used) return
    if (bird.type === 'red') {
      this.showBanner('基础橡宝没有主动技能 · 专心调整弹道', 1350)
      return
    }
    if (bird.type === 'drill' && bird.y + (bird.hitRadius || bird.radius) >= GROUND_Y - 2) {
      this.showBanner('钻地需要在空中发动', 1100)
      return
    }
    const abilityPower = Math.max(1, Number(bird.abilityPowerMultiplier) || 1)
    bird.used = true
    if (bird.type === 'talent-emberheart') {
      bird.moltenHeartArmed = true
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE[bird.type].accent, 26)
      this.showBanner('熔核已苏醒 · 下一次命中会附着并连续脉冲', 1350)
      this.audio.fireBurst()
    } else if (bird.type === 'talent-prism-bell') {
      this.triggerPrismBell(bird)
    } else if (bird.type === 'talent-thunder-root') {
      bird.thunderRootArmed = true
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE[bird.type].accent, 20)
      this.showBanner('雷根已蓄电 · 落地后沿承重连接追索', 1350)
      this.audio.ui()
    } else if (bird.type === 'bomb') {
      const radius = BOMB_ABILITY.radius * this.talentEffect('blastCore', 'explosionRadiusMultiplier', 1)
        * abilityPower
      this.explode(bird.x, bird.y, radius, BOMB_ABILITY.structureDamage * abilityPower, { source: 'bomb' })
      this.removeBird(bird)
      this.resolveRound()
    } else if (bird.type === 'split') {
      for (const direction of [-1, 1]) {
        const clone = this.makeBird('red', bird.x, bird.y)
        clone.used = true
        clone.launched = true
        clone.splitClone = true
        clone.vx = bird.vx
        clone.vy = bird.vy + direction * 3
        clone.damage *= abilityPower
        this.birds.push(clone)
      }
      this.spawnBurst(bird.x, bird.y, '#e6f6bb', 14)
      this.audio.ui()
    } else if (bird.type === 'dash') {
      bird.vx *= 1.8 * abilityPower
      bird.vy *= 1.8 * abilityPower
      bird.damage = bird.baseDamage + abilityPower
      bird.abilityTicks = 18
      this.spawnBurst(bird.x, bird.y, '#fff36b', 18)
      this.addShake(4)
      this.showBanner('疾风冲刺 · 短时间撞击伤害 +1', 1100)
      this.audio.ui()
    } else if (bird.type === 'fire') {
      bird.fireArmed = true
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE.fire.accent, 28)
      this.showBanner('熔芯已点燃 · 下一次接触会附着并灼烧承重点', 1350)
      this.audio.fireBurst()
    } else if (bird.type === 'drill') {
      const ability = SPECIAL_ACORN_BY_TYPE.drill.ability
      const poweredAbility = {
        ...ability,
        maxPierces: Math.max(1, Math.round(ability.maxPierces * abilityPower)),
        damageMultiplier: ability.damageMultiplier * abilityPower,
      }
      Object.assign(bird, calculateVerticalDrillActivation(bird, poweredAbility, STEP_MS))
      bird.piercedBlockIds.clear()
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE.drill.accent, 20)
      this.addShake(5)
      this.showBanner(`垂直钻击 · 可穿透 ${poweredAbility.maxPierces} 块建材`, 1250)
      this.audio.ui()
    } else if (bird.type === 'frost') {
      const ability = SPECIAL_ACORN_BY_TYPE.frost.ability
      const radius = ability.radius * this.talentEffect('frost', 'frostRadiusMultiplier', 1)
        * abilityPower
      const brittleMultiplier = ability.brittleDamageMultiplier
        * this.talentEffect('frost', 'brittleDamageMultiplier', 1) * abilityPower
      const frozenCount = this.freezeArea(
        bird.x, bird.y, radius, brittleMultiplier,
        this.talentEffect('frost', 'brittleSpreadTargets', 0),
        ability.permanentBlockFreeze,
      )
      this.particles.push({
        id: this.id('ring'), kind: 'ring', x: bird.x, y: bird.y, color: BIRD_STYLE.frost.accent,
        radius: 18, grow: radius / 13, life: 13, maxLife: 13,
      })
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE.frost.accent, 24)
      this.showBanner(`永久霜封 · ${frozenCount} 块建材已脆化`, 1300)
      this.audio.slowmo()
    } else if (bird.type === 'vine') {
      const ability = SPECIAL_ACORN_BY_TYPE.vine.ability
      const poweredAbility = {
        ...ability,
        range: ability.range * abilityPower,
        initialPullImpulse: ability.initialPullImpulse * abilityPower,
        maxTargetSpeed: ability.maxTargetSpeed * abilityPower,
        displacementThreshold: ability.displacementThreshold / abilityPower,
      }
      const plan = planVineWinchActivation({
        bird,
        blocks: this.blocks,
        platforms: this.platforms,
        ability: poweredAbility,
      })
      if (!plan.consumeUse || poweredAbility.maxTargets < 1) {
        // useAbility marks an acorn as used before dispatching its branch.
        // A dry winch cast is explicitly free, so roll the flag back before
        // returning and leave the first-use tutorial unconsumed as well.
        bird.used = false
        this.showBanner('绞盘范围内无可锁定建材或平台 · 技能未消耗', 1450)
        return
      }
      const { target, entityKind } = plan.selection
      const activationPull = calculateVineWinchVelocity({
        target,
        anchor: bird,
        force: poweredAbility.initialPullImpulse,
        maxSpeed: poweredAbility.maxTargetSpeed,
      })
      target.vx = activationPull.vx
      target.vy = activationPull.vy
      target.vr = (target.vr || 0) + activationPull.directionX
        * poweredAbility.initialPullImpulse * activationPull.massNormalization * 0.18
      if ('asleep' in target) target.asleep = false
      bird.vx *= poweredAbility.selfVelocityRetention
      bird.vy *= poweredAbility.selfVelocityRetention
      bird.tetherTargetId = target.id
      bird.tetherTargetKind = entityKind
      bird.tetherTicks = Math.max(1, Math.round(poweredAbility.tetherMs * abilityPower / STEP_MS))
      bird.tetherStartX = target.x
      bird.tetherStartY = target.y
      bird.tetherDisplacement = 0
      bird.tetherReleaseTriggered = false
      bird.tetherAbilityPower = abilityPower
      this.spawnBurst(target.x, target.y, BIRD_STYLE.vine.accent, 20)
      this.addShake(3)
      this.showBanner('藤锁绞盘启动 · 拉移 18 格可定点拔榫', 1350)
      this.audio.ui()
    } else if (bird.type === 'boomerang') {
      const ability = SPECIAL_ACORN_BY_TYPE.boomerang.ability
      bird.vx *= 1 + (ability.horizontalVelocityMultiplier - 1) * abilityPower
      bird.vy += ability.verticalLift * abilityPower
      bird.damage *= 1 + (ability.damageMultiplier - 1) * abilityPower
      bird.abilityTicks = Math.max(1, Math.round(ability.controlMs * abilityPower / STEP_MS))
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE.boomerang.accent, 22)
      this.audio.ui()
    } else if (bird.type === 'quake') {
      const ability = SPECIAL_ACORN_BY_TYPE.quake.ability
      if (GROUND_Y - bird.y < ability.minHeight) {
        bird.used = false
        this.showBanner(`高度不足 · 再拉高 ${Math.ceil(ability.minHeight - (GROUND_Y - bird.y))} 格`, 1250)
        return
      }
      bird.vx *= 0.32
      bird.vy = Math.max(ability.downwardSpeed * abilityPower, bird.vy)
      bird.quakeArmed = true
      this.spawnBurst(bird.x, bird.y, BIRD_STYLE.quake.accent, 18)
      this.audio.ui()
    }
    if (bird.aceSupply && this.birds.includes(bird)) {
      const retention = this.fusionEffect('expeditionArsenal', 'aceSupplyVelocityRetention', 1)
      bird.vx *= retention
      bird.vy *= retention
      this.showBanner('王牌补给 · 技能后保留额外动能', 1050)
    }
    if (bird.type !== 'red') this.completeAbilityTutorial()
  }

  frame(now) {
    const elapsed = Math.min(250, Math.max(0, now - this.lastFrame))
    this.lastFrame = now
    this.accumulator += elapsed
    let steps = 0
    while (this.accumulator >= STEP_MS && steps < 8) {
      if (!this.paused && !this.settingsOpen && !this.discoveryOpen && !this.talentLibraryOpen
        && !this.emergencySupplyOpen) this.stepFixed()
      this.accumulator -= STEP_MS
      steps += 1
    }
    if (steps === 8) this.accumulator = 0
    this.updateNotices(now)
    const frozen = this.paused || this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen
      || this.emergencySupplyOpen
    if (now - this.lastRender >= STEP_MS * 0.8 && (!frozen || this.renderWhenFrozen)) {
      this.render()
      this.lastRender = now
      this.renderWhenFrozen = false
    }
    this.raf = requestAnimationFrame((time) => this.frame(time))
  }

  stepFixed() {
    this.fixedTick += 1
    this.stateTick += 1
    if (this.state === 'play') this.stepGame()
    else if (this.state === 'between' && this.transitionTicks > 0 && --this.transitionTicks <= 0) this.enterPreLevelFlow()
    this.stepCamera()
  }

  stepGame() {
    this.mapPulseTick += 1
    if (this.comboWindowTicks > 0 && --this.comboWindowTicks <= 0) this.combo = 0
    const timeScale = this.slowTimer > 0 ? 0.35 : 1
    if (this.slowTimer > 0) this.slowTimer -= 1
    this.resolutionRequested = false
    this.stepSpecialMapRules()

    for (const platform of this.platforms) {
      platform.previousX = platform.x
      platform.previousY = platform.y
      platform.previousRotation = platform.rotation || 0
      if (platform.boardBreakTicks > 0 && --platform.boardBreakTicks <= 0) {
        platform.expired = true
      }
      if (platform.winchSlipTicks > 0) platform.winchSlipTicks -= 1
      if (platform.derailed) {
        platform.vy += GRAVITY * timeScale
        platform.x += platform.vx * timeScale
        platform.y += platform.vy * timeScale
        platform.rotation += platform.vr * timeScale
        platform.vx *= 0.99
        platform.vr *= 0.985
        if (platform.y + platform.height / 2 >= GROUND_Y) {
          platform.y = GROUND_Y - platform.height / 2
          platform.vy *= -0.12
          platform.vx *= 0.72
          platform.vr *= 0.8
        }
        platform.collisionVx = (platform.x - platform.previousX) / Math.max(0.001, timeScale)
        platform.collisionVy = (platform.y - platform.previousY) / Math.max(0.001, timeScale)
        continue
      }
      platform.x += (platform.vx || 0) * timeScale
      platform.y += platform.vy * timeScale
      platform.rotation += platform.vr * timeScale
      platform.vr *= 0.97
      if (platform.minX !== undefined && (platform.x <= platform.minX || platform.x >= platform.maxX)) {
        platform.x = clamp(platform.x, platform.minX, platform.maxX)
        platform.vx *= -1
      }
      if (platform.y <= platform.minY || platform.y >= platform.maxY) {
        platform.y = clamp(platform.y, platform.minY, platform.maxY)
        platform.vy *= -1
      }
      if (platform.affectsStructures !== false && platform.loadSinkPerMass > 0) {
        const boundsLeft = platform.x - platform.width / 2
        const boundsRight = platform.x + platform.width / 2
        const supportedMass = this.blocks
          .filter((block) => block.x + block.width / 2 >= boundsLeft
            && block.x - block.width / 2 <= boundsRight
            && Math.abs(block.y + block.height / 2 - (platform.y - platform.height / 2)) <= 16)
          .reduce((sum, block) => sum + block.mass, 0)
        const previousSink = platform.loadSinkOffset || 0
        const targetSink = Math.min(24, supportedMass * platform.loadSinkPerMass)
        platform.loadSinkOffset = previousSink + (targetSink - previousSink) * 0.12
        platform.y += platform.loadSinkOffset - previousSink
      }
      platform.collisionVx = (platform.x - platform.previousX) / Math.max(0.001, timeScale)
      platform.collisionVy = (platform.y - platform.previousY) / Math.max(0.001, timeScale)
    }
    this.platforms = this.platforms.filter((platform) => !platform.expired)
    for (const bird of [...this.birds]) if (this.birds.includes(bird)) this.stepBird(bird, timeScale)
    this.stepMoltenPulseSequences()
    this.stepBlocks(timeScale)
    this.stepSquirrels(timeScale)
    this.stepFireTrail()
    this.stepParticles()
    this.syncSpecialChallengeScore()
    if (!this.save.tutorialSeen && this.currentBird?.launched && this.currentBird.age >= 55) this.completeTutorial()
    const objectiveMet = this.specialObjectiveProgress().met
    if (objectiveMet) {
      // All modes preserve the shot's final collapse, fire and score. Secret
      // contracts additionally wait for the projectile's complete flight.
      this.resolutionRequested = true
      if (this.mode !== 'special'
        || (this.birds.length === 0 && this.moltenPulseSequences.length === 0)) this.resolveRound()
    } else if (this.resolutionRequested
      || (this.turnActive && this.birds.length === 0 && this.moltenPulseSequences.length === 0)) {
      this.resolveRound()
    }
    this.syncUI()
  }

  stepBird(bird, timeScale) {
    bird.age += 1
    bird.previousX = bird.x
    bird.previousY = bird.y
    if (bird.abilityTicks > 0 && --bird.abilityTicks <= 0) {
      if (bird.type === 'drill') bird.pierceRemaining = 0
      if (bird.type === 'drill' || bird.type === 'boomerang' || bird.type === 'dash') {
        bird.damage = bird.baseDamage
      }
    }
    if (bird.tetherTicks > 0) {
      bird.tetherTicks -= 1
      const targetPool = bird.tetherTargetKind === 'platform' ? this.platforms : this.blocks
      const target = targetPool.find((entry) => entry.id === bird.tetherTargetId)
        || [...this.blocks, ...this.platforms].find((entry) => entry.id === bird.tetherTargetId)
      if (target) {
        const lineOfSight = evaluateVineWinchLineOfSight({
          origin: bird,
          target,
          blocks: this.blocks,
          platforms: this.platforms,
        })
        if (!lineOfSight.clear) {
          bird.tetherTicks = 0
          bird.tetherTargetId = null
          bird.tetherTargetKind = null
          this.showBanner('藤锁被实体阻挡 · 绞盘已断开', 1050)
        } else {
          const ability = SPECIAL_ACORN_BY_TYPE.vine.ability
          const abilityPower = Math.max(1, Number(bird.tetherAbilityPower) || 1)
          const pull = calculateVineWinchVelocity({
            target,
            anchor: bird,
            force: ability.winchForce * abilityPower,
            maxSpeed: ability.maxTargetSpeed * abilityPower,
            timeScale,
          })
          target.vx = pull.vx
          target.vy = pull.vy
          target.vr = (target.vr || 0) + pull.directionX * ability.winchForce * abilityPower
            * pull.massNormalization * 0.045 * timeScale
          if ('asleep' in target) target.asleep = false
          const release = evaluateVineWinchDisplacement({
            targetId: target.id,
            startX: bird.tetherStartX,
            startY: bird.tetherStartY,
            currentX: target.x,
            currentY: target.y,
            threshold: ability.displacementThreshold / abilityPower,
            joints: this.structureJoints,
            alreadyTriggered: bird.tetherReleaseTriggered,
          })
          bird.tetherDisplacement = release.displacement
          if (release.reached) {
            bird.tetherReleaseTriggered = true
            if (release.connectedJointIds.length) {
              const connectedIds = new Set(release.connectedJointIds)
              for (const joint of this.structureJoints) {
                if (!connectedIds.has(joint.id) || joint.broken) continue
                joint.strength -= ability.jointDamage * abilityPower
                if (joint.strength <= 0) this.breakStructureJoint(joint)
              }
              this.showBanner(`定点拔榫 · ${release.connectedJointIds.length} 处连接受损`, 1200)
            } else if (release.applySlip) {
              target.winchSlipTicks = Math.max(
                target.winchSlipTicks || 0,
                Math.round(ability.slipMs * abilityPower / STEP_MS),
              )
              this.showBanner('绞盘拉脱 · 目标短暂失去抓地力', 1200)
            }
            this.spawnBurst(target.x, target.y, BIRD_STYLE.vine.accent, 15)
            this.addShake(4)
          }
          if (bird.tetherTicks <= 0) {
            bird.tetherTargetId = null
            bird.tetherTargetKind = null
          }
        }
      } else {
        // The grabbed block may have been destroyed by the opening tug. End
        // cleanly instead of searching a new target or touching stale data.
        bird.tetherTicks = 0
        bird.tetherTargetId = null
        bird.tetherTargetKind = null
      }
    }
    const shaman = this.squirrels.find((squirrel) => squirrel.variant === 'shaman'
      && Math.hypot(squirrel.x - bird.x, squirrel.y - bird.y) <= SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.radius)
    const auraStrength = this.shamanAuraStrength(shaman)
    const shamanGravity = 1 + (SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdGravityMultiplier - 1) * auraStrength
    const specialGravity = this.specialRuleParameter('low-gravity', 'gravityScale', 1)
    const activeDrill = bird.type === 'drill' && bird.abilityTicks > 0 && bird.pierceRemaining > 0
    const drillAbility = activeDrill ? SPECIAL_ACORN_BY_TYPE.drill.ability : null
    bird.vy += GRAVITY * bird.gravityScale * specialGravity * shamanGravity
      * (drillAbility?.activeGravityMultiplier || 1)
      * this.talentEffect('feather', 'gravityMultiplier', 1) * timeScale
    bird.vx += this.windX * bird.windMultiplier * (drillAbility?.activeWindMultiplier || 1)
      * this.talentEffect('tailwind', 'windMultiplier', 1) * timeScale
    bird.vy += this.specialUpdraftAt(bird.x)
    if (this.specialWaterY !== null && bird.y > this.specialWaterY) {
      const water = this.specialRule('water-cycle')
      bird.vy -= (water?.parameters?.buoyancy || 0.58) * GRAVITY
      bird.vx *= water?.parameters?.drag || 0.86
      bird.vy *= water?.parameters?.drag || 0.86
    }
    if (bird.windborneTicks > 0) bird.windborneTicks -= 1
    const velocityLossMultiplier = bird.windborneTicks > 0
      ? this.fusionEffect('windSovereign', 'windborneVelocityLossMultiplier', 1)
      : 1
    const strongWindVelocityLossMultiplier = Math.abs(this.windX) >= 0.045
      ? this.talentEffect('tailwind', 'strongWindVelocityLossMultiplier', 1) : 1
    const activeFriction = 1 - (1 - FRICTION)
      * velocityLossMultiplier * strongWindVelocityLossMultiplier
    bird.vx *= activeFriction
    bird.vy *= activeFriction
    const shamanSpeed = 1 - (1 - SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdSpeedMultiplier) * auraStrength
    bird.x += bird.vx * timeScale * shamanSpeed
    bird.y += bird.vy * timeScale * shamanSpeed
    if (activeDrill) bird.rotation = 0
    else bird.rotation += bird.vx * 2 * timeScale

    if (activeDrill && bird.age % 2 === 0) {
      this.particles.push({
        id: this.id('drill-chip'), kind: 'chip',
        x: bird.x + Math.sin(bird.age * 2.35) * 7,
        y: bird.y - bird.radius * 0.9,
        vx: -bird.vx * 0.06, vy: -1.35, gravity: 0.08,
        color: bird.age % 4 === 0 ? '#f4b95d' : '#d7dde0',
        size: 2.2, life: 10, maxLife: 10,
      })
    }

    const flameInterval = this.talentEffect('flame', 'trailSpawnInterval', 0)
    if (flameInterval > 0 && bird.age % flameInterval === 0) {
      const flameLife = this.talentEffect('flame', 'trailLifeTicks', 45)
      this.fireTrail.push({
        id: this.id('fire'),
        sourceBirdId: bird.id,
        x: bird.x,
        y: bird.y,
        radius: this.talentEffect('flame', 'trailRadius', 28),
        life: flameLife,
        maxLife: flameLife,
        hit: bird.flameHitIds,
      })
    }
    if (bird === this.currentBird) {
      this.trail.push({
        x: bird.x,
        y: bird.y,
        type: bird.splitClone ? 'split' : bird.type,
        windX: this.windX * bird.windMultiplier * this.talentEffect('tailwind', 'windMultiplier', 1),
      })
      if (this.trail.length > 42) this.trail.shift()
    }

    let restingOnStablePlatform = false
    for (const platform of this.platforms) {
      let struckCarrier = false
      for (const carrier of destructiblePlatformCarrierHitboxes(platform)) {
        if (!carrier.active) continue
        const carrierCollision = this.resolveBirdPlatformPartCollision(bird, carrier, platform)
        if (!carrierCollision) continue
        struckCarrier = true
        const carrierHitKey = `${platform.id}:carrier:${carrier.carrierIndex}`
        if ((bird.lastHits.get(carrierHitKey) ?? -99) + 6 <= this.fixedTick) {
          bird.lastHits.set(carrierHitKey, this.fixedTick)
          const damage = this.platformImpactDamage(bird, carrierCollision)
          if (damage > 0) {
            this.applyPlatformDamage(platform, {
              target: 'carrier', carrierIndex: carrier.carrierIndex, damage,
            })
            this.audio.playStructureImpact('wood', clamp(damage / 2, 0.35, 1.15))
          }
          this.spawnBurst(carrier.x, carrier.y, '#e4c878', 8)
        }
        break
      }
      if (struckCarrier || platform.blocksBirds === false) continue
      let collision = this.resolveBirdPlatformCollision(bird, platform)
      // Retain a swept top-face fallback for a very fast downward shot whose
      // final centre has already crossed the thin board in a single tick.
      if (!collision && circleLandsOnPlatform(bird, platform, bird.vy, bird.previousY)) {
        bird.y = platform.y - platform.height / 2 - (bird.hitRadius || bird.radius)
        collision = this.resolveBirdPlatformCollision(bird, platform)
      }
      if (!collision) continue

      const platformVx = Number.isFinite(platform.collisionVx)
        ? platform.collisionVx : platform.vx || 0
      const platformVy = Number.isFinite(platform.collisionVy)
        ? platform.collisionVy : platform.vy || 0
      const platformRelativeSpeed = Math.hypot(bird.vx - platformVx, bird.vy - platformVy)
      const stableCarrier = !platform.derailed
        && Math.abs(platformVy) <= ORDINARY_ACORN_IMPACT_RULES.restingRelativeSpeed
        && Math.abs(platform.vr || 0) <= 0.45
      if (collision.normalY <= ORDINARY_ACORN_IMPACT_RULES.restingSurfaceNormalY
        && platformRelativeSpeed <= ORDINARY_ACORN_IMPACT_RULES.restingRelativeSpeed
        && stableCarrier) restingOnStablePlatform = true

      // Cooldown suppresses only repeated audiovisual feedback. Physical
      // separation above is intentionally unconditional so moving walls can
      // never push an acorn through themselves between effects.
      const boardHitKey = `${platform.id}:board`
      if ((bird.lastHits.get(boardHitKey) ?? -99) + 6 <= this.fixedTick) {
        bird.lastHits.set(boardHitKey, this.fixedTick)
        if (platform.reflective) {
          bird.specialRicochetCount = (bird.specialRicochetCount || 0) + 1
          this.emitSpecialChallenge('mirror-ricochet', {
            shotId: bird.id,
            sourceId: platform.id,
            ricochetCount: bird.specialRicochetCount,
          })
        }
        const damage = this.platformImpactDamage(bird, collision)
        if (damage > 0) {
          this.applyPlatformDamage(platform, { target: 'board', damage })
          this.audio.playStructureImpact(
            platform.reflective ? 'ice' : 'wood', clamp(damage / 2, 0.35, 1.15),
          )
        }
        this.spawnBurst(bird.x, bird.y, platform.reflective ? '#d7f4f4' : '#bd8a51', 6)
      }
    }

    this.resolveBirdArchitectureMechanismCollisions(bird)

    let groundedThisTick = false
    const pendingDrillGroundImpact = bird.type === 'drill' && bird.abilityTicks > 0
      && bird.y + bird.radius >= GROUND_Y
    if (bird.y + bird.radius >= GROUND_Y) {
      groundedThisTick = true
      bird.y = GROUND_Y - bird.radius
      if (bird.thunderRootArmed) {
        bird.thunderRootArmed = false
        this.triggerThunderRoot(bird)
      }
      if (bird.quakeArmed) {
        this.triggerQuakeBird(bird)
        return
      }
      // A drill that crosses the lowest support and the floor in one fixed
      // tick must resolve that final support before its bore is disarmed.
      if (!pendingDrillGroundImpact) {
        const groundResponse = resolveTerrainGroundContact(bird, this.terrainAt(bird.x), {
          body: 'acorn', bodyRestitution: bird.restitution,
        })
        bird.vx = groundResponse.vx
        bird.vy = groundResponse.vy
      }
    }

    const birdCollider = { x: bird.x, y: bird.y, radius: bird.hitRadius || bird.radius }
    const previousBlockContactIds = bird.blockContactIds instanceof Set
      ? bird.blockContactIds
      : new Set()
    const currentBlockContactIds = new Set()
    let restingOnStructure = false
    if (this.goldenEgg && circlesOverlap(birdCollider, this.goldenEgg)) this.collectEgg()
    for (const decoy of [...this.decoys]) {
      if (decoy.revealed || !circlesOverlap(birdCollider, decoy)) continue
      decoy.revealed = true
      this.emitSpecialChallenge('decoy-hit', {
        targetId: decoy.id,
        shotId: bird.id,
        tags: decoy.objectiveTags || [],
      })
      this.spawnBurst(decoy.x, decoy.y, '#b7d9e4', 16)
      bird.vx *= 0.82
      bird.vy *= 0.82
      this.decoys.splice(this.decoys.indexOf(decoy), 1)
    }

    for (const block of [...this.blocks]) {
      if (!this.blocks.includes(block)) continue
      if (bird.type === 'drill' && bird.pierceRemaining > 0 && bird.piercedBlockIds.has(block.id)) continue
      let collision = circleRectCollisionManifold(birdCollider, block)
      if (!collision && bird.type === 'drill' && bird.pierceRemaining > 0) {
        const swept = resolveSweptCircleRectCollision(birdCollider, block, {
          previousCircle: {
            x: bird.previousX, y: bird.previousY,
            radius: bird.hitRadius || bird.radius,
          },
          // Blocks are stepped after birds, so they remain at the current pose
          // for this sweep even when they moved during the previous fixed tick.
          previousRectangle: {
            x: block.x, y: block.y, width: block.width, height: block.height,
            rotation: block.rotation || 0,
          },
          restitution: 0,
        })
        if (swept) {
          collision = {
            normalX: swept.normalX,
            normalY: swept.normalY,
            overlap: Math.max(0.01, swept.overlap),
            contactX: swept.contactX,
            contactY: swept.contactY,
            swept: true,
          }
        }
      }
      if (!collision) continue
      currentBlockContactIds.add(block.id)
      if (bird.moltenHeartArmed && this.triggerMoltenHeart(bird, block)) return
      if (bird.fireArmed && this.triggerFireAcorn(bird, block)) return
      const hitCoolingDown = (bird.lastHits.get(block.id) ?? -99) + 8 > this.fixedTick
      const oldVx = bird.vx
      const oldVy = bird.vy
      const blockVx = Number(block.vx) || 0
      const blockVy = Number(block.vy) || 0
      const relativeVx = oldVx - blockVx
      const relativeVy = oldVy - blockVy
      const relativeNormalVelocity = relativeVx * collision.normalX + relativeVy * collision.normalY
      const impact = evaluateAcornStructureImpact({
        type: bird.type,
        splitClone: bird.splitClone,
        enteringContact: !previousBlockContactIds.has(block.id),
        birdVx: oldVx,
        birdVy: oldVy,
        blockVx,
        blockVy,
        normalX: collision.normalX,
        normalY: collision.normalY,
        mass: bird.mass,
      })
      const effectiveImpact = !hitCoolingDown && impact.eligible

      if (effectiveImpact) {
        bird.lastHits.set(block.id, this.fixedTick)
        if (this.mode === 'special' && this.specialFirstImpactTick === null) {
          this.specialFirstImpactTick = this.mapPulseTick
        }
        const hardMaterial = isHardStructureMaterial(block)
        const stoneBonus = hardMaterial
          ? this.talentEffect('stonebreaker', 'stoneDamageBonus', 0) : 0
        const drillStoneMultiplier = hardMaterial && bird.type === 'drill' && bird.pierceRemaining > 0
          ? SPECIAL_ACORN_BY_TYPE.drill.ability.stoneDamageMultiplier
          : 1
        const brittleMultiplier = block.permanentlyFrozen
          ? Math.max(1, block.brittleDamageMultiplier)
          : 1
        const headwindBonus = bird.vx * this.windX < -0.01
          ? this.talentEffect('tailwind', 'headwindDamageBonus', 0) : 0
        const windborneBonus = bird.windborneTicks > 0 && bird.windborneStrikeReady
          ? this.fusionEffect('windSovereign', 'windborneDamageBonus', 0) : 0
        const windTraceBonus = bird.windTraceStrikeReady
          ? this.talentEffect('windTrace', 'windPrecisionDirectDamageBonus', 0)
            + (bird.tacticalSwap
              ? this.fusionEffect('windchartArsenal', 'forecastSwapWindDamageBonus', 0)
              : 0)
          : 0
        let directDamage = (bird.damage * brittleMultiplier * drillStoneMultiplier
          + bird.flatDamageBonus + stoneBonus + headwindBonus + windborneBonus + windTraceBonus
        ) * (this.dailyEffects.structureDamageMultiplier || 1)
        const precisionBreaker = block.precisionWeakPoint === true && (
          (bird.type === 'dash' && bird.abilityTicks > 0)
          || (bird.type === 'bomb' && impact.momentum >= 8)
          || (bird.type === 'drill' && bird.abilityTicks > 0)
        )
        if (precisionBreaker) {
          directDamage = Math.max(directDamage, block.hp + Math.max(0, block.armorHp || 0))
          this.showBanner('精准断轴 · 强动力击碎金色弱点', 1050)
        }
        block.pendingDamageCause = 'direct'
        this.damageBlock(block, directDamage)
        const destroyed = !this.blocks.includes(block)
        const impactSide = bird.x >= block.x ? 'rear' : 'front'
        this.emitSpecialChallenge('block-direct-hit', {
          targetId: block.id,
          blockId: block.id,
          tags: block.objectiveTags || [],
          destroyed,
          shotId: bird.id,
          birdType: bird.type,
          ricochetCount: bird.specialRicochetCount || 0,
          impactSide,
        })
        if (bird.type === 'drill' && bird.abilityTicks > 0) {
          this.emitSpecialChallenge('ability-hit', {
            targetId: block.id,
            blockId: block.id,
            tags: block.objectiveTags || [],
            activationId: `${bird.id}:drill`,
            birdType: 'drill',
          })
        }
        if (windborneBonus > 0) bird.windborneStrikeReady = false
        if (windTraceBonus > 0) {
          bird.windTraceStrikeReady = false
          bird.pendingWindPrecisionRetention = bird.windPrecisionVelocityRetention
          this.spawnBurst(block.x, block.y, '#e2b956', 9)
        }
        if (stoneBonus > 0) {
          this.spawnBurst(block.x, block.y, '#f0bf69', 6)
          const crackRadius = this.talentEffect('stonebreaker', 'stoneCrackRadius', 64)
          const crackDamage = this.talentEffect('stonebreaker', 'stoneCrackDamage', 1)
          const crackTargets = this.talentEffect('stonebreaker', 'stoneCrackMaxTargets', 2)
          const neighbors = this.blocks
            .filter((candidate) => candidate !== block && isHardStructureMaterial(candidate)
              && Math.hypot(candidate.x - block.x, candidate.y - block.y) <= crackRadius)
            .sort((first, second) => Math.hypot(first.x - block.x, first.y - block.y)
              - Math.hypot(second.x - block.x, second.y - block.y))
            .slice(0, crackTargets)
          for (const neighbor of neighbors) {
            this.damageBlock(neighbor, crackDamage)
            this.spawnBurst(neighbor.x, neighbor.y, '#f0bf69', 4)
          }
          if (neighbors.length) this.showBanner(`破甲裂纹 · 扩散至 ${neighbors.length} 块坚材`, 950)
          this.triggerFaultCrown(block)
        }
        this.addCombo()
        const material = this.materialPhysics(block)
        const impactMass = Math.max(0.8, block.mass)
        const structureImpulseScale = this.structureImpulseScale(bird)
        block.vx += oldVx * 0.18 * bird.mass / impactMass * structureImpulseScale
        block.vy += oldVy * 0.13 * bird.mass / impactMass * structureImpulseScale
        block.vr += oldVx * STRUCTURE_STABILITY_RULES.regularImpact.angularImpulseScale
          * bird.mass / Math.sqrt(impactMass) / Math.max(0.45, material.supportStability)
          * structureImpulseScale
        block.asleep = false
        if (bird.quakeArmed) {
          this.triggerQuakeBird(bird)
          return
        }
        const impactEnergy = Math.hypot(oldVx, oldVy) * bird.mass * structureImpulseScale
        if (impactEnergy >= STRUCTURE_STABILITY_RULES.regularImpact.minimumEnergy) {
          const shockPower = clamp(
            (impactEnergy - STRUCTURE_STABILITY_RULES.regularImpact.minimumEnergy)
              * STRUCTURE_STABILITY_RULES.regularImpact.powerPerEnergy,
            0,
            STRUCTURE_STABILITY_RULES.regularImpact.maximumPower,
          )
          if (shockPower > 0.01) {
            this.shockwave(
              block.x,
              block.y,
              STRUCTURE_STABILITY_RULES.regularImpact.radius,
              shockPower,
            )
          }
        }
        if (this.blocks.includes(block)) {
          this.fractureSpanFromImpact(block, bird, collision, impact.momentum)
        }
      }

      const horizontal = Math.abs((bird.x - block.x) / Math.max(1, block.width))
        > Math.abs((bird.y - block.y) / Math.max(1, block.height))
      const collisionRestitution = block.reflective
        ? this.specialRuleParameter('surface-restitution', 'restitution', 0.88)
        : bird.restitution
      if (bird.pierceRemaining > 0) {
        bird.piercedBlockIds.add(block.id)
        bird.pierceRemaining -= 1
        bird.vx *= SPECIAL_ACORN_BY_TYPE.drill.ability.velocityRetention
        bird.vy *= SPECIAL_ACORN_BY_TYPE.drill.ability.velocityRetention
        this.spawnBurst(block.x, block.y, BIRD_STYLE.drill.accent, isHardStructureMaterial(block) ? 12 : 7)
        if (bird.pierceRemaining <= 0) {
          bird.abilityTicks = 0
          bird.damage = bird.baseDamage
        }
      } else {
        const separation = collision.overlap + 0.05
        bird.x += collision.normalX * separation
        bird.y += collision.normalY * separation
        birdCollider.x = bird.x
        birdCollider.y = bird.y
        if (relativeNormalVelocity < 0) {
          const bounceImpulse = -(1 + collisionRestitution) * relativeNormalVelocity
          bird.vx += bounceImpulse * collision.normalX
          bird.vy += bounceImpulse * collision.normalY
        }
        if (block.reflective && !previousBlockContactIds.has(block.id)) {
          bird.specialRicochetCount = (bird.specialRicochetCount || 0) + 1
          this.emitSpecialChallenge('mirror-ricochet', {
            shotId: bird.id,
            sourceId: block.id,
            ricochetCount: bird.specialRicochetCount,
          })
        }
        const relativeSpeed = Math.hypot(relativeVx, relativeVy)
        const stableCarrier = block.asleep || (
          Math.hypot(blockVx, blockVy) <= ORDINARY_ACORN_IMPACT_RULES.restingRelativeSpeed
          && Math.abs(block.vr || 0) <= 0.24
        )
        if (!impact.eligible
          && collision.normalY <= ORDINARY_ACORN_IMPACT_RULES.restingSurfaceNormalY
          && relativeSpeed <= ORDINARY_ACORN_IMPACT_RULES.restingRelativeSpeed
          && stableCarrier) {
          restingOnStructure = true
        }
      }
      if (block.type === 'ice'
        && !CONSTRUCTION_MATERIALS[block.constructionId]?.suppressIceSlow) this.triggerSlow()
      if (bird.pendingWindPrecisionRetention > 1) {
        bird.vx *= bird.pendingWindPrecisionRetention
        bird.vy *= bird.pendingWindPrecisionRetention
        bird.pendingWindPrecisionRetention = 1
        this.showBanner('风迹精准命中 · 保留额外动能', 950)
      }
    }

    bird.blockContactIds = currentBlockContactIds
    if (pendingDrillGroundImpact) {
      bird.abilityTicks = 0
      bird.pierceRemaining = 0
      bird.damage = bird.baseDamage
      const groundResponse = resolveTerrainGroundContact(bird, this.terrainAt(bird.x), {
        body: 'acorn', bodyRestitution: bird.restitution,
      })
      bird.vx = groundResponse.vx
      bird.vy = groundResponse.vy
      this.spawnBurst(bird.x, bird.y, '#a7794f', 12)
    }
    for (const squirrel of [...this.squirrels]) {
      if (!this.squirrels.includes(squirrel) || !circlesOverlap(birdCollider, squirrel)) continue
      if ((bird.lastHits.get(squirrel.id) ?? -99) + 8 > this.fixedTick) continue
      bird.lastHits.set(squirrel.id, this.fixedTick)
      if (this.mode === 'special' && this.specialFirstImpactTick === null) this.specialFirstImpactTick = this.mapPulseTick
      if (squirrel.variant === 'burrower' && squirrel.submerged && bird.type !== 'quake') continue
      const shieldAbility = SPECIAL_SQUIRREL_BY_TYPE.shield.ability
      const firstBossHitBonus = squirrel.isBoss && !bird.bossHitIds.has(squirrel.id)
        ? this.talentEffect('power', 'firstBossHitDamageBonus', 0) : 0
      const headwindBonus = bird.vx * this.windX < -0.01
        ? this.talentEffect('tailwind', 'headwindDamageBonus', 0) : 0
      const windborneBonus = bird.windborneTicks > 0 && bird.windborneStrikeReady
        ? this.fusionEffect('windSovereign', 'windborneDamageBonus', 0) : 0
      const windTraceBonus = bird.windTraceStrikeReady
        ? this.talentEffect('windTrace', 'windPrecisionDirectDamageBonus', 0)
          + (bird.tacticalSwap
            ? this.fusionEffect('windchartArsenal', 'forecastSwapWindDamageBonus', 0)
            : 0)
        : 0
      const windDirectBonus = headwindBonus + windborneBonus + windTraceBonus
      if (windborneBonus > 0) bird.windborneStrikeReady = false
      if (windTraceBonus > 0) bird.windTraceStrikeReady = false
      if (squirrel.isBoss) bird.bossHitIds.add(squirrel.id)
      const shieldDistance = Math.max(1, Math.hypot(bird.x - squirrel.x, bird.y - squirrel.y))
      const insideShieldArc = (squirrel.x - bird.x) / shieldDistance
        >= Math.cos(shieldAbility.arcDegrees / 2 * Math.PI / 180)
      if (squirrel.variant === 'shield' && squirrel.shieldHp > 0 && insideShieldArc
        && !(bird.type === 'boomerang' && bird.used && bird.vx < 0) && bird.pierceRemaining <= 0) {
        const guard = shieldAbility
        squirrel.shieldHp -= 1
        this.damageSquirrel(squirrel,
          (bird.damage + bird.flatDamageBonus + firstBossHitBonus + windDirectBonus)
            * guard.damageMultiplier * (this.dailyEffects.targetDamageMultiplier || 1))
        this.addCombo()
        squirrel.vx += bird.vx * 0.3 * bird.mass * guard.knockbackMultiplier
          * squirrel.knockbackMultiplier / squirrel.mass
        squirrel.vy += bird.vy * 0.3 * bird.mass * guard.knockbackMultiplier
          * squirrel.knockbackMultiplier / squirrel.mass
        bird.vx *= -0.5
        bird.vy *= 0.65
        this.separateBirdFromSquirrel(bird, squirrel, 0.5)
        this.spawnBurst(squirrel.x - squirrel.radius, squirrel.y, SPECIAL_SQUIRREL_BY_TYPE.shield.visual.palette.accent, 16)
        if (windTraceBonus > 0) {
          bird.vx *= bird.windPrecisionVelocityRetention
          bird.vy *= bird.windPrecisionVelocityRetention
        }
        this.showBanner('叶盾挡住了正面冲击', 1100)
        this.audio.hitStone()
        continue
      }
      this.damageSquirrel(squirrel,
        bird.damage + bird.flatDamageBonus + firstBossHitBonus + windDirectBonus)
      const dailyTargetBonus = (bird.damage + bird.flatDamageBonus + firstBossHitBonus + windDirectBonus)
        * Math.max(0, (this.dailyEffects.targetDamageMultiplier || 1) - 1)
      if (dailyTargetBonus > 0) this.damageSquirrel(squirrel, dailyTargetBonus)
      this.addCombo()
      squirrel.vx += bird.vx * 0.3 * bird.mass * squirrel.knockbackMultiplier / squirrel.mass
      squirrel.vy += bird.vy * 0.3 * bird.mass * squirrel.knockbackMultiplier / squirrel.mass
      squirrel.asleep = false
      this.separateBirdFromSquirrel(bird, squirrel)
      if (windTraceBonus > 0) {
        bird.vx *= bird.windPrecisionVelocityRetention
        bird.vy *= bird.windPrecisionVelocityRetention
        this.spawnBurst(squirrel.x, squirrel.y, '#e2b956', 9)
        this.showBanner('风迹精准命中 · 保留额外动能', 950)
      }
      this.addShake(squirrel.isBoss ? 8 : 5)
    }

    const abilityActive = bird.tetherTicks > 0 || bird.abilityTicks > 0 || bird.quakeArmed
      || bird.thunderRootArmed
    const displacement = Math.hypot(bird.x - bird.previousX, bird.y - bird.previousY)
    const speed = Math.hypot(bird.vx, bird.vy)
    const outsideWorld = bird.x > WORLD_MAX_X || bird.x < WORLD_MIN_X || bird.y > 850
    const counters = advanceAcornLifecycleCounters({
      groundedStillTicks: bird.stillTicks,
      groundedTicks: bird.groundContactTicks,
      structureStillTicks: bird.structureStillTicks,
      platformStillTicks: bird.platformStillTicks,
      stalledTicks: bird.stalledTicks,
      outsideWorldTicks: bird.outsideWorldTicks,
    }, {
      grounded: groundedThisTick,
      groundedStable: Math.abs(bird.vy) < 1.2 && Math.abs(bird.vx) < 1.1,
      restingOnStructure,
      restingOnPlatform: restingOnStablePlatform,
      speed,
      displacement,
      outsideWorld,
      abilityActive,
    })
    bird.stillTicks = counters.groundedStillTicks
    bird.groundContactTicks = counters.groundedTicks
    bird.structureStillTicks = counters.structureStillTicks
    bird.platformStillTicks = counters.platformStillTicks
    bird.stalledTicks = counters.stalledTicks
    bird.outsideWorldTicks = counters.outsideWorldTicks
    const lifecycle = evaluateAcornLifecycle({
      age: bird.age,
      groundedStillTicks: bird.stillTicks,
      groundedTicks: bird.groundContactTicks,
      structureStillTicks: bird.structureStillTicks,
      platformStillTicks: bird.platformStillTicks,
      stalledTicks: bird.stalledTicks,
      abilityActive,
      outsideWorldTicks: bird.outsideWorldTicks,
      farOutsideWorld: bird.x > WORLD_MAX_X + 150 || bird.x < WORLD_MIN_X - 150 || bird.y > 1000,
    })
    bird.lifecycleReason = lifecycle.reason
    if (lifecycle.shouldSettle) this.settleBird(bird)
  }

  stepBlocks(timeScale) {
    const supportOptions = {
      groundY: GROUND_Y,
      contactTolerance: STRUCTURE_CONTACT_TOLERANCE,
      angleTolerance: STRUCTURE_ANGLE_TOLERANCE,
      edgeInset: 1,
      joints: this.structureJoints,
    }
    // Secret-stage shutters, pendulums and rafts are gameplay obstacles for
    // acorns and squirrels, not invisible moving foundations. Excluding them
    // from the structure solver keeps their full sweep from lifting, pinning
    // or destabilising authored buildings.
    const structuralPlatforms = this.platforms.filter((platform) => platform.affectsStructures !== false)

    // Sleeping is an optimization, never a permanent weld. Rebuild the
    // ground-connected support graph every fixed tick so removing one post
    // wakes the beam above it and every storey that depended on that beam.
    const initialStability = analyzeStructureStability(this.blocks, structuralPlatforms, supportOptions)
    for (const block of [...this.blocks]) {
      if (!initialStability.unstableIds.has(block.id)) continue
      block.asleep = false
      block.restTicks = 0
    }

    for (const block of [...this.blocks]) {
      if (!this.blocks.includes(block)) continue
      block.previousX = block.x
      block.previousY = block.y
      block.previousRotation = block.rotation || 0
      if (block.winchSlipTicks > 0) block.winchSlipTicks -= 1
      if (block.magnetizedTicks > 0) block.magnetizedTicks -= 1
      if (block.burningTicks > 0) {
        block.burningTicks -= 1
        block.asleep = false
        const burnDuration = Math.max(1, block.burnDurationTotal || block.burningTicks || 1)
        if (!CONSTRUCTION_MATERIALS[block.constructionId]?.suppressFlame
          && !block.burnPulseApplied
          && (block.burnPulseDamage || 0) > 0
          && block.burningTicks <= Math.floor(burnDuration / 2)) {
          block.burnPulseApplied = true
          this.damageBlock(block, block.burnPulseDamage, { sound: false })
          if (!this.blocks.includes(block)) continue
          this.spawnBurst(block.x, block.y - block.height * 0.25, '#ffb43f', 6)
        } else if (block.burningTicks % 12 === 0) {
          this.spawnBurst(block.x, block.y - block.height * 0.35, '#d96b32', 2)
        }
        if (block.burningTicks <= 0) {
          block.burnDurationTotal = 0
          block.burnPulseDamage = 0
        }
      }
      const material = this.materialPhysics(block)
      const hadSurfaceContact = Boolean(block.surfaceContactLastTick)
      let surfaceContactThisTick = false
      const exposure = this.structureWindExposure(block)
      const gust = 0.82 + Math.sin(this.mapPulseTick * 0.075 + block.initialX * 0.013) * 0.18
      const windLoad = calculateStructureWindLoad(block, this.windX * gust, { exposure })
      block.windStress = Math.max(0, (block.windStress || 0) * 0.96 + Math.abs(windLoad.angularAcceleration))
      const windWakeThreshold = 0.2 + material.supportStability * 0.06
      if (block.asleep && Math.abs(this.windX) >= 0.055 && exposure >= 0.72
        && block.windStress >= windWakeThreshold) {
        block.asleep = false
        block.restTicks = 0
      }
      if (block.asleep) continue
      block.vx += windLoad.accelerationX * timeScale
      block.vr += windLoad.angularAcceleration * timeScale
      block.vy += GRAVITY * timeScale
      block.vy += this.specialUpdraftAt(block.x) * timeScale
      if (this.specialWaterY !== null && block.y + block.height / 2 > this.specialWaterY) {
        const water = this.specialRule('water-cycle')
        const drag = water?.parameters?.drag || 0.86
        block.vy -= (water?.parameters?.buoyancy || 0.58) * GRAVITY * timeScale
        block.vx *= drag
        block.vy *= drag
        block.vr *= drag
      }
      block.x += block.vx * timeScale
      block.y += block.vy * timeScale
      block.minimumY = Math.min(block.minimumY ?? block.y, block.y)
      block.fallStartY = Math.min(block.fallStartY ?? block.y, block.y)
      block.rotation += block.vr * timeScale
      block.frameImpactSpeed = Math.max(
        block.frameImpactSpeed || 0,
        Math.hypot(block.vx, block.vy) + Math.abs(block.vr) * 0.55,
      )
      // Keep angles numerically bounded without changing the rendered pose.
      block.rotation = ((block.rotation + 180) % 360 + 360) % 360 - 180
      block.vx *= 0.985
      block.vr *= 1 - material.angularDamping

      let bounds = rotatedRectBounds(block)
      if (bounds.bottom >= GROUND_Y) {
        surfaceContactThisTick = true
        const impact = Math.max(0, block.vy)
        if (!hadSurfaceContact && impact > 4.5
          && (block.lastDropSoundTick ?? -99) + 5 <= this.fixedTick) {
          this.audio.playStructureDrop(
            block.constructionId || block.type,
            clamp(impact * Math.sqrt(Math.max(0.5, block.mass)) / 14, 0.25, 1.3),
          )
          block.lastDropSoundTick = this.fixedTick
        }
        block.y -= bounds.bottom - GROUND_Y
        const terrain = this.terrainAt(block.x)
        const groundResponse = resolveTerrainGroundContact(block, terrain, {
          body: 'structure',
          bodyRestitution: material.restitution,
          materialFriction: material.friction,
        })
        block.vx = groundResponse.vx
        block.vy = groundResponse.vy
        block.vr *= 1 - material.angularDamping
        const groundSupport = analyzeBlockSupport(block, [], supportOptions)
        block.vr -= groundSupport.angleError * 0.035 * material.supportStability
          * terrain.structureGrip * timeScale
        if (impact > 4.5) this.addShake(3)
        bounds = rotatedRectBounds(block)
      }

      for (const platform of structuralPlatforms) {
        const platformBounds = rotatedRectBounds(platform)
        const overlapsX = bounds.right > platformBounds.left && bounds.left < platformBounds.right
        const approachesTop = block.y < platform.y && bounds.bottom >= platformBounds.top
        if (!overlapsX || !approachesTop || block.vy < platform.vy - 0.25) continue
        surfaceContactThisTick = true
        const platformImpact = Math.max(0, block.vy - platform.vy)
        if (!hadSurfaceContact && platformImpact > 4.5
          && (block.lastDropSoundTick ?? -99) + 5 <= this.fixedTick) {
          this.audio.playStructureDrop(
            block.constructionId || block.type,
            clamp(platformImpact * Math.sqrt(Math.max(0.5, block.mass)) / 14, 0.25, 1.3),
          )
          block.lastDropSoundTick = this.fixedTick
        }
        block.y -= bounds.bottom - platformBounds.top
        block.vy = platform.vy
        block.vx *= 1 - material.friction * 0.28
        block.vr *= 1 - material.angularDamping
        bounds = rotatedRectBounds(block)
      }
      block.surfaceContactLastTick = surfaceContactThisTick
    }

    // Finite nails and masonry bonds pull same-material contacts back toward
    // their authored pose before the general collision solver runs. They can
    // still tear out under damage or a sufficiently large displacement.
    this.applyStructureJoints(timeScale)

    // Resolve each pair once per pass with oriented rectangles. Three small
    // solver passes are enough for the largest generated tower and avoid the
    // old order-dependent loop that could pin one block inside another.
    const currentStructureContactPairs = new Set()
    const activeJointPairs = new Set(this.structureJoints
      .filter((joint) => !joint.broken)
      .map((joint) => structureContactPairKey(joint.firstId, joint.secondId)))
    for (let pass = 0; pass < 3; pass += 1) {
      for (let firstIndex = 0; firstIndex < this.blocks.length; firstIndex += 1) {
        const first = this.blocks[firstIndex]
        for (let secondIndex = firstIndex + 1; secondIndex < this.blocks.length; secondIndex += 1) {
          const second = this.blocks[secondIndex]
          const manifold = rectCollisionManifold(first, second)
          if (!manifold || manifold.overlap <= 0.001) continue
          const contactPair = structureContactPairKey(first.id, second.id)
          currentStructureContactPairs.add(contactPair)
          if (first.asleep && second.asleep) continue

          const firstMaterial = this.materialPhysics(first)
          const secondMaterial = this.materialPhysics(second)
          const relativeX = second.vx - first.vx
          const relativeY = second.vy - first.vy
          const closingSpeed = relativeX * manifold.normalX + relativeY * manifold.normalY
          const impactSpeed = Math.max(0, -closingSpeed)
          if (impactSpeed > 2.2
            && !this.structureContactPairs.has(contactPair)
            && !activeJointPairs.has(contactPair)
            && (first.lastMaterialSoundTick ?? -99) + 7 <= this.fixedTick
            && (second.lastMaterialSoundTick ?? -99) + 7 <= this.fixedTick) {
            const audible = first.mass >= second.mass ? first : second
            const reducedMass = (first.mass * second.mass) / Math.max(0.001, first.mass + second.mass)
            this.audio.playStructureImpact(
              audible.constructionId || audible.type,
              clamp(impactSpeed * Math.sqrt(reducedMass) / 10, 0.2, 1.35),
            )
            first.lastMaterialSoundTick = this.fixedTick
            second.lastMaterialSoundTick = this.fixedTick
          }
          const firstWake = !first.asleep || shouldWakeStructureBlock(first, {
            source: 'collision', speed: impactSpeed, penetration: manifold.overlap,
          })
          const secondWake = !second.asleep || shouldWakeStructureBlock(second, {
            source: 'collision', speed: impactSpeed, penetration: manifold.overlap,
          })
          if (firstWake && first.asleep) {
            first.asleep = false
            first.restTicks = 0
          }
          if (secondWake && second.asleep) {
            second.asleep = false
            second.restTicks = 0
          }

          // Shallow numerical contact treats an unwoken block as a braced
          // support. A genuine impact crosses its material wake threshold and
          // restores the usual two-body response.
          const inverseFirstMass = first.asleep ? 0 : 1 / Math.max(0.35, first.mass)
          const inverseSecondMass = second.asleep ? 0 : 1 / Math.max(0.35, second.mass)
          const inverseMassSum = inverseFirstMass + inverseSecondMass
          if (inverseMassSum <= 0) continue
          const correction = (manifold.overlap + 0.01) / inverseMassSum
          first.x -= manifold.normalX * correction * inverseFirstMass
          first.y -= manifold.normalY * correction * inverseFirstMass
          second.x += manifold.normalX * correction * inverseSecondMass
          second.y += manifold.normalY * correction * inverseSecondMass

          if (closingSpeed >= 0) continue
          const restitution = (firstMaterial.restitution + secondMaterial.restitution) / 2
          const normalImpulse = -((1 + restitution) * closingSpeed) / inverseMassSum
          first.vx -= manifold.normalX * normalImpulse * inverseFirstMass
          first.vy -= manifold.normalY * normalImpulse * inverseFirstMass
          second.vx += manifold.normalX * normalImpulse * inverseSecondMass
          second.vy += manifold.normalY * normalImpulse * inverseSecondMass

          const tangentX = -manifold.normalY
          const tangentY = manifold.normalX
          const tangentSpeed = relativeX * tangentX + relativeY * tangentY
          const contactFriction = Math.sqrt(firstMaterial.friction * secondMaterial.friction)
          const frictionImpulse = clamp(
            -tangentSpeed / inverseMassSum,
            -normalImpulse * contactFriction,
            normalImpulse * contactFriction,
          )
          first.vx -= tangentX * frictionImpulse * inverseFirstMass
          first.vy -= tangentY * frictionImpulse * inverseFirstMass
          second.vx += tangentX * frictionImpulse * inverseSecondMass
          second.vy += tangentY * frictionImpulse * inverseSecondMass

          const offsetX = second.x - first.x
          const offsetY = second.y - first.y
          const torqueLever = offsetX * manifold.normalY - offsetY * manifold.normalX
          const angularKick = clamp(torqueLever * normalImpulse * 0.0025, -1.1, 1.1)
          first.vr -= angularKick * inverseFirstMass
          second.vr += angularKick * inverseSecondMass
        }
      }
    }
    this.structureContactPairs = currentStructureContactPairs

    const finalStability = analyzeStructureStability(this.blocks, structuralPlatforms, supportOptions)
    for (const block of [...this.blocks]) {
      if (!this.blocks.includes(block)) continue
      const support = finalStability.supportById.get(block.id)
      const material = this.materialPhysics(block)
      if (block.asleep && finalStability.unstableIds.has(block.id)) {
        block.asleep = false
        block.restTicks = 0
      }
      const finalBounds = rotatedRectBounds(block)
      const groundGrip = Math.abs(finalBounds.bottom - GROUND_Y) <= STRUCTURE_CONTACT_TOLERANCE + 1
        ? this.terrainAt(block.x).structureGrip
        : 1
      if (!block.asleep && support?.hasContact) {
        if (!support.supported && support.tippingDirection !== 0) {
          const tippingTorque = 0.12 + Math.min(0.55, Math.abs(support.leverArm) * 0.018)
          const stabilityFactor = clamp(1.35 - material.supportStability * groundGrip, 0.26, 1.15)
          block.vr += support.tippingDirection * tippingTorque * stabilityFactor * timeScale
        } else if (support.supported) {
          block.vr -= support.angleError * 0.025 * material.supportStability * groundGrip * timeScale
        }
      }

      const linearSpeed = Math.hypot(block.vx, block.vy)
      const impactSpeed = Math.max(
        linearSpeed + Math.abs(block.vr) * 0.55,
        block.frameImpactSpeed || 0,
      )
      block.frameImpactSpeed = 0
      const slideSpeed = Math.abs(block.vx)
      const cleanSurfaceSlide = !block.asleep
        && support?.supportMode === 'bearing' && support.settled
        && Math.abs(block.vy) < 0.38 && Math.abs(block.vr) < 0.22
      if (cleanSurfaceSlide) {
        const slideDistance = Math.abs(block.x - Number(block.slideSoundAnchorX ?? block.x))
        if (slideSpeed > 0.58 && slideDistance >= 8
          && (block.lastSlideSoundTick ?? -99) + 12 <= this.fixedTick) {
          this.audio.playStructureSlide(
            block.constructionId || block.type,
            clamp((slideSpeed - 0.5) / 4.5, 0.15, 0.58),
          )
          block.lastSlideSoundTick = this.fixedTick
          block.slideSoundAnchorX = block.x
        }
      } else block.slideSoundAnchorX = block.x
      if (!block.asleep && finalStability.supportedIds.has(block.id) && support?.settled
        && linearSpeed < 0.32 && Math.abs(block.vr) < 0.18) {
        block.restTicks += 1
        if (block.restTicks >= BLOCK_SLEEP_TICKS) {
          block.vx = 0
          block.vy = 0
          block.vr = 0
          const structuralRestRotation = Number(block.structuralRestRotation || 0)
          block.rotation = structuralRestRotation
            + Math.round((block.rotation - structuralRestRotation) / 90) * 90
          block.asleep = true
        }
      } else if (!block.asleep) {
        block.restTicks = 0
      }

      const verticalFall = Math.max(0, block.y - (block.minimumY ?? block.initialY ?? block.y))
      const structuralRestRotation = Number(block.structuralRestRotation || 0)
      const rotationFall = Math.sin(Math.min(Math.PI / 2,
        Math.abs(rightAngleError(block.rotation - structuralRestRotation)) * Math.PI / 180))
        * Math.max(block.width, block.height) * 0.5
      const fallDistance = Math.max(verticalFall, rotationFall)
      for (const squirrel of [...this.squirrels]) {
        if (!this.squirrels.includes(squirrel) || !circleIntersectsRect(squirrel, block)) continue
        // Boss encounters must be won with the acorn loadout, not by an
        // opening lintel settling onto the authored courtyard. Ordinary
        // squirrels still take the deliberately reduced one-shot debris hit.
        if (squirrel.isBoss || this.squirrelHasSpawnProtection(squirrel)) continue
        const debrisHit = evaluateFallingDebrisDamage({
          block,
          target: squirrel,
          fallDistance,
          impactSpeed,
          settledPairKeys: this.settledDebrisPairs,
        })
        if (!debrisHit.eligible) continue
        if (debrisHit.consumePair) this.settledDebrisPairs.add(debrisHit.pairKey)
        this.damageSquirrel(squirrel, debrisHit.damage)
        if (this.squirrels.includes(squirrel)) {
          squirrel.vx += block.vx * 0.35 / squirrel.mass
          squirrel.vy += (block.vy * 0.25 - 1) / squirrel.mass
          squirrel.asleep = false
        }
        this.spawnBurst(squirrel.x, squirrel.y, block.type === 'stone' ? '#9da49d' : '#d18a47', 10)
        this.showBanner(block.type === 'stone'
          ? `岩石重砸 · ${debrisHit.damage} 点伤害`
          : `高空坠物 · ${debrisHit.damage} 点伤害`, 900)
      }
      if (block.x < WORLD_MIN_X || block.x > WORLD_MAX_X || block.y > 780) this.destroyBlock(block, false)
    }
  }

  squirrelSupported(squirrel) {
    if (squirrel.submerged || squirrel.y + squirrel.radius >= GROUND_Y - 1) return true
    const restsOn = (solid) => {
      const manifold = circleRectCollisionManifold(squirrel, solid)
      return Boolean(manifold && manifold.overlap <= 1 && manifold.normalY < -0.45)
    }
    return this.blocks.some((block) => block.asleep && restsOn(block))
      || this.platforms.some(restsOn)
  }

  squirrelHasSpawnProtection(squirrel) {
    return Boolean(squirrel?.isBoss && (squirrel.spawnProtectionTicks || 0) > 0)
  }

  moveSquirrelWithSubsteps(squirrel, targetX, targetY) {
    const deltaX = targetX - squirrel.x
    const deltaY = targetY - squirrel.y
    const distance = Math.hypot(deltaX, deltaY)
    const maximumStep = Math.max(3, squirrel.radius * 0.38)
    const steps = clamp(Math.ceil(distance / maximumStep), 1, 12)
    const stepX = deltaX / steps
    const stepY = deltaY / steps
    let contact = false
    let supported = false
    let resolved = true
    for (let step = 0; step < steps; step += 1) {
      squirrel.x += stepX
      squirrel.y += stepY
      const collision = this.resolveSquirrelStructureCollisions(squirrel)
      contact = contact || collision.contact
      supported = supported || collision.supported
      resolved = resolved && collision.resolved !== false
      if (!resolved || collision.contact) break
    }
    return { contact, supported, resolved }
  }

  recoverTrappedSquirrel(squirrel) {
    const avoidCircles = this.squirrels.filter((other) => (
      other !== squirrel && !other.submerged
    ))
    const preferred = [
      { x: squirrel.lastSafeX, y: squirrel.lastSafeY },
      { x: squirrel.spawnX, y: squirrel.spawnY },
      { x: Math.max(SLING_X + 260, 430), y: GROUND_Y - squirrel.radius },
    ].filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    let clear = this.findClearSquirrelPosition(squirrel, preferred, {
      safeSpawn: squirrel.isBoss,
      avoidCircles,
    })
    if (!clear) {
      clear = findSafeCircleSpawnPosition(squirrel, [...this.blocks, ...this.platforms], {
        minX: WORLD_MIN_X + squirrel.radius + 2,
        maxX: WORLD_MAX_X - squirrel.radius - 2,
        minY: squirrel.radius + 2,
        maxY: GROUND_Y - squirrel.radius,
        groundY: GROUND_Y,
        preferGround: squirrel.variant !== 'glider',
        preferred,
        avoidCircles,
        padding: 3,
        maxSearch: 900,
      })
    }
    if (!clear) return false
    squirrel.x = clear.x
    squirrel.y = clear.y
    squirrel.vx = 0
    squirrel.vy = 0
    squirrel.asleep = squirrel.variant !== 'glider'
    squirrel.lastSafeX = clear.x
    squirrel.lastSafeY = clear.y
    squirrel.unresolvedTicks = 0
    squirrel.recoveryCount = (squirrel.recoveryCount || 0) + 1
    if (squirrel.isBoss) {
      squirrel.spawnProtectionTicks = Math.max(squirrel.spawnProtectionTicks || 0, 12)
    }
    return true
  }

  stepSpecialSquirrel(squirrel, timeScale) {
    const roster = SPECIAL_SQUIRREL_BY_TYPE[squirrel.variant]
    if (!roster) return false
    if (squirrel.chilledTicks > 0) squirrel.chilledTicks -= 1
    const chilledScale = squirrel.chilledTicks > 0
      ? SPECIAL_ACORN_BY_TYPE.frost.ability.enemySpeedMultiplier
      : 1
    squirrel.behaviorTick += timeScale * chilledScale

    if (squirrel.variant === 'engineer') {
      const ability = roster.ability
      const cooldownTicks = Math.max(1, Math.round(ability.cooldownMs / STEP_MS))
      const repairCycle = Math.floor(squirrel.behaviorTick / cooldownTicks)
      const standingStill = squirrel.asleep && Math.hypot(squirrel.vx, squirrel.vy) < 0.35
      if (squirrel.repairChannelTicks > 0) {
        const target = this.blocks.find((block) => block.id === squirrel.repairTargetId)
        const valid = standingStill && squirrel.chilledTicks <= 0 && target
          && target.hp < target.maxHp
          && Math.hypot(target.x - squirrel.x, target.y - squirrel.y) <= ability.range
        if (!valid) {
          squirrel.repairChannelTicks = 0
          squirrel.repairTargetId = null
        } else if (--squirrel.repairChannelTicks <= 0) {
          target.hp = Math.min(target.maxHp, target.hp + ability.repairAmount)
          squirrel.repairsUsed += 1
          squirrel.repairTargetId = null
          this.spawnBurst(target.x, target.y, roster.visual.palette.accent, 10)
          this.showBanner('榫木工匠完成了一次修复', 1050)
        }
        return false
      }
      if (standingStill && squirrel.chilledTicks <= 0 && squirrel.repairsUsed < ability.maxRepairs
        && repairCycle > 0 && repairCycle !== squirrel.lastRepairCycle) {
        squirrel.lastRepairCycle = repairCycle
        const damaged = this.blocks
          .filter((block) => block.hp < block.maxHp
            && Math.hypot(block.x - squirrel.x, block.y - squirrel.y) <= ability.range)
          .sort((first, second) => Number(second.repairableFloat) - Number(first.repairableFloat)
            || first.hp / first.maxHp - second.hp / second.maxHp)[0]
        if (damaged) {
          squirrel.repairTargetId = damaged.id
          squirrel.repairChannelTicks = Math.max(1, Math.round(ability.channelMs / STEP_MS))
          this.showBanner('榫木工匠正在引导修复', 900)
        }
      }
      return false
    }

    if (squirrel.variant === 'glider') {
      const ability = roster.ability
      const mobility = Math.max(0.1, roster.stats.moveSpeed)
      const pauseTicks = Math.max(0, ability.turnPauseMs / STEP_MS)
      const travelTicks = Math.max(1, (ability.cycleMs / STEP_MS - pauseTicks * 2) / 2)
      const cycleTicks = travelTicks * 2 + pauseTicks * 2
      const cyclePosition = ((squirrel.behaviorTick % cycleTicks) + cycleTicks) % cycleTicks
      let progress
      if (cyclePosition < travelTicks) progress = cyclePosition / travelTicks
      else if (cyclePosition < travelTicks + pauseTicks) progress = 1
      else if (cyclePosition < travelTicks * 2 + pauseTicks) {
        progress = 1 - (cyclePosition - travelTicks - pauseTicks) / travelTicks
      } else progress = 0
      const phase = progress * Math.PI - Math.PI / 2
      squirrel.vx *= 0.84
      squirrel.vy *= 0.84
      const desiredX = squirrel.homeX + Math.sin(phase) * ability.range * mobility + squirrel.vx
      const desiredY = squirrel.homeY + Math.sin(progress * Math.PI * 2) * ability.waveHeight
        + squirrel.vy + this.specialUpdraftAt(desiredX) * 36
      const movement = this.moveSquirrelWithSubsteps(squirrel, desiredX, desiredY)
      if (movement.contact || !movement.resolved) {
        // Re-anchor the patrol curve at the resolved point. Without this, the
        // next authored frame overwrites collision separation and repeatedly
        // teleports the scout back into the same wall.
        squirrel.homeX += clamp(squirrel.x - desiredX, -squirrel.radius, squirrel.radius)
        squirrel.homeY += clamp(squirrel.y - desiredY, -squirrel.radius, squirrel.radius)
        squirrel.vx = 0
        squirrel.vy = 0
      }
      squirrel.asleep = false
      return true
    }

    if (squirrel.variant === 'burrower') {
      const ability = roster.ability
      const mobility = Math.max(0.1, roster.stats.moveSpeed)
      if (squirrel.burrowStunTicks > 0) {
        squirrel.burrowStunTicks -= 1
        squirrel.submerged = false
        squirrel.y = GROUND_Y - squirrel.radius
        squirrel.vx = 0
        squirrel.vy = 0
        squirrel.asleep = true
        return true
      }
      const burrowTicks = Math.round(ability.burrowMs / STEP_MS)
      const exposedTicks = Math.round(ability.exposedMs / STEP_MS)
      const cycle = Math.max(1, burrowTicks + exposedTicks)
      const phase = ((Math.floor(squirrel.behaviorTick) % cycle) + cycle) % cycle
      const nextSubmerged = phase < burrowTicks
      const wasSubmerged = squirrel.submerged
      const travel = Math.sin(phase / cycle * Math.PI * 2) * ability.relocateRange * mobility * 0.5
      const desiredX = clamp(squirrel.homeX + travel, 500, WORLD_MAX_X - 80)
      const desiredY = GROUND_Y - squirrel.radius
      if (nextSubmerged) {
        squirrel.submerged = true
        squirrel.x = desiredX
        squirrel.y = GROUND_Y - squirrel.radius * 0.18
      } else if (wasSubmerged) {
        squirrel.submerged = false
        const emergence = this.findClearSquirrelPosition(squirrel, [{ x: desiredX, y: desiredY }], {
          avoidCircles: this.squirrels.filter((other) => other !== squirrel && !other.submerged),
        })
        if (!emergence) {
          // Delay emergence instead of materialising inside a wall.
          squirrel.submerged = true
          squirrel.y = GROUND_Y - squirrel.radius * 0.18
          return true
        }
        squirrel.x = emergence.x
        squirrel.y = emergence.y
        squirrel.homeX += emergence.x - desiredX
      } else {
        squirrel.submerged = false
        this.moveSquirrelWithSubsteps(squirrel, desiredX, desiredY)
      }
      squirrel.vx = 0
      squirrel.vy = 0
      squirrel.asleep = true
      return true
    }

    return false
  }

  findClearSquirrelPosition(squirrel, preferred = [], options = {}) {
    if (options.safeSpawn) {
      const grounded = squirrel.variant !== 'glider'
      const bounds = {
        minX: WORLD_MIN_X + squirrel.radius + 2,
        maxX: WORLD_MAX_X - squirrel.radius - 2,
      }
      const authoredOnGround = grounded
        && Math.abs(squirrel.y - (GROUND_Y - squirrel.radius)) < 0.01
      const authored = {
        x: squirrel.x,
        y: squirrel.y - (grounded && !authoredOnGround ? 3 : 0),
      }
      const tacticalPreferences = squirrel.isBoss
        ? buildBossSpawnPreferences(squirrel, this.blocks, {
          ...bounds,
          grounded,
        })
        : []
      return findSafeCircleSpawnPosition(squirrel, [...this.blocks, ...this.platforms], {
        ...bounds,
        minY: squirrel.radius + 2,
        maxY: GROUND_Y - squirrel.radius,
        groundY: GROUND_Y,
        preferGround: grounded,
        requireSupport: grounded,
        supportRectangles: this.blocks,
        preferred: [authored, ...preferred, ...tacticalPreferences],
        avoidCircles: options.avoidCircles || [],
        padding: 3,
        maxSearch: 520,
      })
    }
    const nearest = findNearestCircleClearPosition(squirrel, [...this.blocks, ...this.platforms], {
      minX: WORLD_MIN_X + squirrel.radius + 2,
      maxX: WORLD_MAX_X - squirrel.radius - 2,
      minY: squirrel.radius + 2,
      maxY: GROUND_Y - squirrel.radius,
      preferred,
      avoidCircles: options.avoidCircles || [],
      padding: 2,
      maxSearch: 420,
    })
    if (nearest) return nearest
    return findSafeCircleSpawnPosition(squirrel, [...this.blocks, ...this.platforms], {
      minX: WORLD_MIN_X + squirrel.radius + 2,
      maxX: WORLD_MAX_X - squirrel.radius - 2,
      minY: squirrel.radius + 2,
      maxY: GROUND_Y - squirrel.radius,
      groundY: GROUND_Y,
      preferGround: squirrel.variant !== 'glider',
      preferred,
      avoidCircles: options.avoidCircles || [],
      padding: 2,
      maxSearch: 520,
    })
  }

  squirrelOverlapsStructure(squirrel) {
    return [...this.blocks, ...this.platforms].some((solid) => {
      const manifold = circleRectCollisionManifold(squirrel, solid)
      return Boolean(manifold && manifold.overlap > 1e-6)
    })
  }

  resolveSquirrelStructureCollisions(squirrel) {
    if (squirrel.submerged) return {
      contact: false, supported: false, resolved: true, pinned: false,
    }
    let contact = false
    let supported = false
    let pinned = false

    const resolveAgainst = (solid, kind) => {
      const manifold = circleRectCollisionManifold(squirrel, solid)
      const surfaceAngularVelocity = (solid.vr || 0) * Math.PI / 180
      const contactOffsetX = manifold ? manifold.contactX - solid.x : 0
      const contactOffsetY = manifold ? manifold.contactY - solid.y : 0
      const centerVx = Number.isFinite(solid.collisionVx) ? solid.collisionVx : solid.vx || 0
      const centerVy = Number.isFinite(solid.collisionVy) ? solid.collisionVy : solid.vy || 0
      const surfaceVx = centerVx - surfaceAngularVelocity * contactOffsetY
      const surfaceVy = centerVy + surfaceAngularVelocity * contactOffsetX

      const grounded = squirrel.y + squirrel.radius >= GROUND_Y - 0.5
      const previousSolid = {
        ...solid,
        x: Number.isFinite(solid.previousX) ? solid.previousX : solid.x,
        y: Number.isFinite(solid.previousY) ? solid.previousY : solid.y,
        rotation: Number.isFinite(solid.previousRotation) ? solid.previousRotation : solid.rotation,
      }
      const response = resolveSquirrelSolidCollision(squirrel, solid, {
        grounded,
        previousSolid,
        surfaceVx,
        surfaceVy,
        solidCanYield: true,
        restitution: 0.06,
        padding: 0.08,
      })
      if (!response) return false
      contact = true
      if (response.pinned) {
        // A grounded squirrel is a real collision body.  The falling solid
        // stops on it instead of projecting the squirrel through the beam or
        // searching for a clear point above the collapse.
        pinned = true
        squirrel.pinnedTicks = Math.max(squirrel.pinnedTicks || 0, 2)
        squirrel.vx = 0
        squirrel.vy = 0
        solid.x = response.solidX
        solid.y = response.solidY
        solid.rotation = response.solidRotation
        solid.vx = response.solidVx
        solid.vy = response.solidVy
        solid.vr = 0
        // The remaining local solver passes must start at the accepted
        // first-contact pose. Replaying the old swept path would otherwise
        // discover the same impact repeatedly and could choose a later face.
        solid.previousX = solid.x
        solid.previousY = solid.y
        solid.previousRotation = solid.rotation
        if (kind === 'platform' && !solid.derailed) {
          if (Math.abs(surfaceVy) > 0.01) solid.vy = -Math.sign(surfaceVy) * Math.max(0.45, Math.abs(surfaceVy))
        }
        if ('asleep' in solid) {
          solid.asleep = false
          solid.restTicks = 0
        }
      } else {
        squirrel.x = response.squirrelX
        squirrel.y = response.squirrelY
        squirrel.vx = response.squirrelVx
        squirrel.vy = response.squirrelVy
      }

      if (response.normalY < -0.45) {
        supported = true
        if (squirrel.vy > surfaceVy) squirrel.vy = surfaceVy
        squirrel.vx += (surfaceVx - squirrel.vx) * 0.18
      }

      const surfaceSpeed = Math.hypot(surfaceVx, surfaceVy)
      if (!pinned && (surfaceSpeed > 0.08 || Math.abs(response.normalX) > 0.35
        || response.normalY > 0.25)) squirrel.asleep = false
      return true
    }

    // Several local passes are intentional: resolving a circle out of one post
    // can put it against an adjacent beam.  Every correction is a contact-sized
    // displacement; no branch is allowed to replace the squirrel coordinates
    // with a remote spawn or roof position.
    for (let pass = 0; pass < 10; pass += 1) {
      let changed = false
      for (const block of this.blocks) changed = resolveAgainst(block, 'block') || changed
      for (const platform of this.platforms) changed = resolveAgainst(platform, 'platform') || changed
      if (!changed) break
    }

    // If several pieces close an impossibly narrow pocket in the same frame,
    // locally yield the overlapping debris.  This preserves the no-overlap
    // invariant without moving the squirrel to another floor of the map.
    if (this.squirrelOverlapsStructure(squirrel)) {
      for (const solid of [...this.blocks, ...this.platforms]) {
        const manifold = circleRectCollisionManifold(squirrel, solid)
        if (!manifold || manifold.overlap <= 1e-6) continue
        const correction = manifold.overlap + 0.08
        solid.x -= manifold.normalX * correction
        solid.y -= manifold.normalY * correction
        const approach = (Number(solid.vx) || 0) * manifold.normalX
          + (Number(solid.vy) || 0) * manifold.normalY
        if (approach > 0) {
          solid.vx -= approach * manifold.normalX
          solid.vy -= approach * manifold.normalY
        }
        if ('asleep' in solid) {
          solid.asleep = false
          solid.restTicks = 0
        }
        pinned = true
      }
    }
    const resolved = !this.squirrelOverlapsStructure(squirrel)
    if (resolved) {
      squirrel.lastSafeX = squirrel.x
      squirrel.lastSafeY = squirrel.y
    }
    if (pinned) {
      squirrel.pinnedTicks = Math.max(squirrel.pinnedTicks || 0, 2)
      squirrel.vx = 0
      squirrel.vy = 0
      squirrel.asleep = true
    }
    return { contact, supported, resolved, pinned }
  }

  stepSquirrels(timeScale) {
    for (const squirrel of [...this.squirrels]) {
      if (!this.squirrels.includes(squirrel)) continue
      const spawnProtected = this.squirrelHasSpawnProtection(squirrel)
      const pinnedAtFrameStart = (squirrel.pinnedTicks || 0) > 0
      if (pinnedAtFrameStart) {
        squirrel.pinnedTicks -= 1
        squirrel.vx = 0
        squirrel.vy = 0
        squirrel.asleep = true
      }
      const managedMovement = pinnedAtFrameStart
        ? true
        : this.stepSpecialSquirrel(squirrel, timeScale)
      if (squirrel.submerged) {
        if (squirrel.spawnProtectionTicks > 0) squirrel.spawnProtectionTicks -= 1
        continue
      }
      const wasResting = squirrel.asleep && this.squirrelSupported(squirrel)
      let collision = { contact: false, supported: false, resolved: true }
      if (!managedMovement && !wasResting) {
        squirrel.asleep = false
        squirrel.vy += GRAVITY * timeScale
        squirrel.vy += this.specialUpdraftAt(squirrel.x) * timeScale
        collision = this.moveSquirrelWithSubsteps(
          squirrel,
          squirrel.x + squirrel.vx * timeScale,
          squirrel.y + squirrel.vy * timeScale,
        )
        squirrel.vx *= 0.98
      }

      const immediateCollision = this.resolveSquirrelStructureCollisions(squirrel)
      collision = {
        contact: collision.contact || immediateCollision.contact,
        supported: collision.supported || immediateCollision.supported,
        resolved: collision.resolved !== false && immediateCollision.resolved !== false,
      }
      if (squirrel.y + squirrel.radius >= GROUND_Y) {
        const impact = squirrel.vy
        squirrel.y = GROUND_Y - squirrel.radius
        // A boss can be displaced by a collapse, but environmental fall speed
        // never defeats it. Direct acorn and explosion damage continue through
        // damageSquirrel() without consulting this branch.
        if (impact > 6 && !squirrel.isBoss && !spawnProtected) {
          this.killSquirrel(squirrel)
          continue
        }
        if (impact > 6) {
          squirrel.vx *= 0.25
          squirrel.vy = 0
        }
        const groundResponse = resolveTerrainGroundContact(squirrel, this.terrainAt(squirrel.x), {
          body: 'squirrel', bodyRestitution: 0.28,
        })
        squirrel.vx = groundResponse.vx
        squirrel.vy = groundResponse.vy
        if (Math.abs(squirrel.vy) < 0.8 && Math.abs(squirrel.vx) < 0.3) {
          squirrel.vx = 0
          squirrel.vy = 0
          squirrel.asleep = true
        }
      }
      if (!this.squirrels.includes(squirrel)) continue

      // Ground clamping may bring a squirrel back against the lower edge of a
      // tilted/falling block. A second pass resolves that constrained contact
      // sideways and preserves the no-overlap invariant.
      const constrainedCollision = this.resolveSquirrelStructureCollisions(squirrel)
      collision = {
        contact: collision.contact || constrainedCollision.contact,
        supported: collision.supported || constrainedCollision.supported,
        resolved: collision.resolved !== false && constrainedCollision.resolved !== false,
      }
      if (squirrel.y + squirrel.radius > GROUND_Y) squirrel.y = GROUND_Y - squirrel.radius
      const fullyResolved = collision.resolved !== false && !this.squirrelOverlapsStructure(squirrel)
      if (fullyResolved) squirrel.unresolvedTicks = 0
      else {
        squirrel.unresolvedTicks = (squirrel.unresolvedTicks || 0) + 1
        squirrel.pinnedTicks = Math.max(squirrel.pinnedTicks || 0, 2)
        squirrel.vx = 0
        squirrel.vy = 0
        squirrel.asleep = true
      }
      squirrel.pinned = (squirrel.pinnedTicks || 0) > 0
      const onGround = squirrel.y + squirrel.radius >= GROUND_Y - 0.5
      if (onGround) {
        // Terrain changes traction, not the playable boundary. In particular,
        // ice must not turn a surviving enemy into an accidental ring-out.
        squirrel.x = clamp(
          squirrel.x,
          WORLD_MIN_X + squirrel.radius,
          WORLD_MAX_X - squirrel.radius,
        )
      }
      if (!managedMovement && (collision.supported || onGround)
        && Math.abs(squirrel.vy) < 0.8 && Math.abs(squirrel.vx) < 0.3) {
        squirrel.vx = 0
        squirrel.vy = 0
        squirrel.asleep = true
      }
      if (managedMovement && squirrel.variant === 'glider' && !squirrel.pinned) squirrel.asleep = false
      const outsideWorld = squirrel.x < WORLD_MIN_X || squirrel.x > WORLD_MAX_X || squirrel.y > 760
      if (outsideWorld && squirrel.isBoss) {
        if (!this.recoverTrappedSquirrel(squirrel)) {
          // A total fortress collapse can temporarily leave no clear search
          // candidate. Keep the fight alive at its authored court and let the
          // bounded collision solver separate any remaining debris next tick.
          squirrel.x = clamp(squirrel.spawnX, WORLD_MIN_X + squirrel.radius, WORLD_MAX_X - squirrel.radius)
          squirrel.y = squirrel.variant === 'glider'
            ? squirrel.spawnY
            : GROUND_Y - squirrel.radius
          squirrel.vx = 0
          squirrel.vy = 0
          squirrel.asleep = squirrel.variant !== 'glider'
        }
      } else if (outsideWorld) {
        this.killSquirrel(squirrel)
        continue
      }
      if (squirrel.spawnProtectionTicks > 0) squirrel.spawnProtectionTicks -= 1
    }
  }

  stepFireTrail() {
    for (const flame of [...this.fireTrail]) {
      flame.life -= 1
      for (const block of [...this.blocks]) {
        if (!this.blocks.includes(block) || flame.hit.has(block.id)) continue
        const flameCircle = { x: flame.x, y: flame.y, radius: flame.radius || 28 }
        if (!circleIntersectsRect(flameCircle, block)) continue
        flame.hit.add(block.id)
        this.damageBlock(block, this.talentEffect('flame', 'trailBlockDamage', 1), { sound: false })
        this.levelFlameBlockIds.add(block.id)
        this.levelFlameIgnitions = this.levelFlameBlockIds.size
        if (this.blocks.includes(block)) {
          this.igniteBlock(block, {
            durationTicks: this.talentEffect('flame', 'burnDurationTicks', 72),
            pulseDamage: block.type === 'wood'
              ? this.talentEffect('flame', 'woodBurnDamage', 1)
              : 0,
          })
        }
        this.spawnBurst(flame.x, flame.y, '#ff8c35', 8)
        if (this.levelFlameIgnitions === 1) {
          this.showBanner('烈焰尾迹 · 建材已点燃，木材会追加灼烧', 1450)
        }
      }
      if (flame.life <= 0) this.fireTrail.splice(this.fireTrail.indexOf(flame), 1)
    }
  }

  igniteBlock(block, { durationTicks, pulseDamage }) {
    if (!this.blocks.includes(block)) return false
    const thermalOnce = this.fusionEffect('thermalRift', 'thermalShockOncePerBlock', true)
    if (block.permanentlyFrozen && this.hasFusion('thermalRift')
      && (!thermalOnce || !this.thermalShockBlockIds.has(block.id))) {
      this.thermalShockBlockIds.add(block.id)
      const jointScale = this.fusionEffect('thermalRift', 'thermalJointStrengthMultiplier', 0.8)
      for (const joint of this.structureJoints) {
        if (joint.broken || (joint.firstId !== block.id && joint.secondId !== block.id)) continue
        joint.strength *= jointScale
        if (joint.strength <= 0) this.breakStructureJoint(joint)
      }
      this.damageBlock(block, this.fusionEffect('thermalRift', 'thermalShockDamage', 3), { sound: false })
      this.spawnBurst(block.x, block.y, '#d8fbff', 12)
      if (!this.blocks.includes(block)) return true
      this.showBanner('霜火裂变 · 冻脆连接受热冲击', 1050)
    }
    const duration = Math.max(1, Math.round(Number(durationTicks) || 1))
    block.burningTicks = Math.max(block.burningTicks || 0, duration)
    block.burnDurationTotal = Math.max(block.burnDurationTotal || 0, duration)
    block.burnPulseDamage = Math.max(block.burnPulseDamage || 0, Number(pulseDamage) || 0)
    block.burnPulseApplied = false
    block.asleep = false
    return true
  }

  stepParticles() {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index]
      particle.life -= 1
      if (particle.kind === 'ring') {
        particle.radius += particle.grow
      } else {
        particle.vy += particle.gravity
        particle.x += particle.vx
        particle.y += particle.vy
      }
      if (particle.life <= 0) this.particles.splice(index, 1)
    }
  }

  fractureSpanFromImpact(block, bird, collision, closingMomentum) {
    const hitRadius = bird.hitRadius || bird.radius
    const contactX = Number.isFinite(collision.contactX)
      ? collision.contactX : bird.x - collision.normalX * hitRadius
    const contactY = Number.isFinite(collision.contactY)
      ? collision.contactY : bird.y - collision.normalY * hitRadius
    const plan = planSpanFracture({
      block,
      impact: { contactX, contactY, closingMomentum },
      impactType: bird.type,
      fragmentIds: { left: this.id('span-left'), right: this.id('span-right') },
    })
    if (!plan) return false
    const index = this.blocks.indexOf(block)
    if (index < 0) return false
    const sourceCollapseWeight = Number.isFinite(block.collapseWeight) ? block.collapseWeight : 1
    const materialScore = (block.type === 'stone' ? 125 : block.type === 'ice' ? 75 : 50)
      + (CONSTRUCTION_MATERIALS[block.constructionId]?.scoreBonus || 0)
    const leftRatio = plan.fragments[0].width / block.width
    const leftScore = Math.round(materialScore * leftRatio)
    const fragments = plan.fragments.map((fragment, fragmentIndex) => ({
      ...fragment,
      w: fragment.width,
      h: fragment.height,
      asleep: false,
      restTicks: 0,
      jointKinds: [],
      collapseWeight: sourceCollapseWeight * fragment.width / block.width,
      scoreValue: fragmentIndex === 0 ? leftScore : materialScore - leftScore,
      surfaceContactLastTick: false,
      frameImpactSpeed: Math.max(block.frameImpactSpeed || 0, closingMomentum),
    }))
    this.blocks.splice(index, 1, ...fragments)

    // Preserve every exterior bond on the nearest new half. Only the newly
    // opened cut loses connection, avoiding an arbitrary whole-castle collapse.
    for (const joint of this.structureJoints) {
      if (joint.broken || (joint.firstId !== block.id && joint.secondId !== block.id)) continue
      const otherId = joint.firstId === block.id ? joint.secondId : joint.firstId
      const other = this.blocks.find((candidate) => candidate.id === otherId)
      const replacement = other
        ? [...fragments].sort((first, second) => (
          Math.hypot(first.x - other.x, first.y - other.y)
            - Math.hypot(second.x - other.x, second.y - other.y)
        ))[0]
        : fragments[0]
      if (joint.firstId === block.id) joint.firstId = replacement.id
      else joint.secondId = replacement.id
      const first = this.blocks.find((candidate) => candidate.id === joint.firstId)
      const second = this.blocks.find((candidate) => candidate.id === joint.secondId)
      if (first && second) {
        joint.restDx = second.x - first.x
        joint.restDy = second.y - first.y
        joint.restRotation = (second.rotation || 0) - (first.rotation || 0)
        joint.id = `${joint.id}:fracture:${replacement.fractureSide}`
        if (!replacement.jointKinds.includes(joint.kind)) replacement.jointKinds.push(joint.kind)
      }
    }
    this.spawnBurst(contactX, contactY, block.type === 'stone' ? '#b9b8ad' : '#c7884b', 22)
    this.audio.playStructureBreak(block.constructionId || block.type, 1.15)
    this.showBanner(block.type === 'stone'
      ? '强动量断石 · 长石梁从撞击点裂开'
      : '强动量断梁 · 长木梁从撞击点折断', 1300)
    return true
  }

  damageBlock(block, amount, { sound = true, damageJoints = true, cause = 'environment' } = {}) {
    if (!this.blocks.includes(block)) return
    if (block.pendingDamageCause) {
      cause = block.pendingDamageCause
      delete block.pendingDamageCause
    }
    const construction = CONSTRUCTION_MATERIALS[block.constructionId] || null
    const materialRule = this.specialRule('material-modifier')
    let actualDamage = amount
    if (materialRule?.parameters?.material === block.type && amount > 0) {
      if (!block.materialRulePrimed) {
        block.materialRulePrimed = true
        // A permanent frost seal has already completed the campaign rule's
        // "first load" step, so the next acorn must receive the promised
        // brittle multiplier instead of being silently reduced to zero.
        actualDamage = block.permanentlyFrozen
          ? amount
          : materialRule.parameters.firstHitDamage ?? amount
      } else {
        block.materialRulePrimed = false
        actualDamage += materialRule.parameters.nextLoadDamage || 0
      }
    }
    if (actualDamage > 0 && block.armorHp > 0) {
      const absorbed = Math.min(block.armorHp, actualDamage)
      block.armorHp -= absorbed
      actualDamage -= absorbed
      if (sound && absorbed > 0) {
        this.audio.playStructureImpact('leaf-iron-plate', clamp(absorbed / 2, 0.3, 1.1))
      }
      this.spawnBurst(block.x, block.y, '#d2bb79', 5)
      if (block.armorHp <= 0) this.showBanner('叶铁护板脱落 · 本体暴露', 900)
    }
    const willBreak = actualDamage > 0 && block.hp - actualDamage <= 0
    if (actualDamage > 0 && sound && !willBreak) {
      this.audio.playStructureImpact(
        block.constructionId || construction?.soundMaterial || block.type,
        clamp(actualDamage / Math.max(1, block.maxHp), 0.2, 1.35),
      )
    }
    block.hp -= actualDamage
    if (damageJoints) this.damageStructureJoints(block, actualDamage)
    const fault = this.specialRule('delayed-collapse')
    if (fault && actualDamage > 0 && !block.faultPrimed) {
      block.faultPrimed = true
      this.pendingMapEvents.push({
        kind: 'fault-transfer',
        at: this.mapPulseTick + (this.bossPhaseEffects.faultDelayTicks || fault.parameters.delayTicks || 48),
        x: block.x,
        y: block.y,
        radius: fault.parameters.transferRadius || 72,
        power: fault.parameters.transferredImpulse || 3.2,
      })
    }
    this.spawnBurst(block.x, block.y, cssColor(BLOCK_MATERIALS[block.type].color), 6)
    if (block.hp <= 0) {
      if (sound) this.audio.playStructureBreak(
        block.constructionId || construction?.soundMaterial || block.type,
        clamp(actualDamage / 3, 0.45, 1.5),
      )
      this.destroyBlock(block, true, cause)
    }
  }

  destroyBlock(block, awardScore, cause = 'environment') {
    const index = this.blocks.indexOf(block)
    if (index < 0) return
    for (const joint of this.structureJoints) {
      if (!joint.broken && (joint.firstId === block.id || joint.secondId === block.id)) {
        this.breakStructureJoint(joint)
      }
    }
    this.blocks.splice(index, 1)
    const objectiveTags = Array.isArray(block.objectiveTags) ? block.objectiveTags : []
    this.emitSpecialChallenge('block-destroyed', {
      targetId: block.id,
      blockId: block.id,
      tags: objectiveTags,
      cause,
      isAnchor: Boolean(block.cableAnchor),
    })
    for (const tag of objectiveTags) {
      if (this.blocks.some((candidate) => candidate.objectiveTags?.includes(tag))) continue
      this.emitSpecialChallenge('tag-group-completed', {
        targetId: block.id,
        blockId: block.id,
        tags: [tag],
        cause,
      })
    }
    if (block.cableAnchor) {
      const platform = this.platforms
        .filter((candidate) => candidate.cablePlatform && candidate.cableIntegrity > 0)
        .sort((first, second) => Math.abs(first.x - block.x) - Math.abs(second.x - block.x))[0]
      if (platform) {
        platform.cableIntegrity -= 1
        const direction = block.x < platform.x ? 1 : -1
        platform.vr += direction * platform.cableAngularImpulse * 180 / Math.PI
        platform.vy += 1.4
        if (platform.cableIntegrity <= 0) {
          platform.derailed = true
          this.emitSpecialChallenge('platform-derailed', {
            platformId: platform.id,
            tags: platform.objectiveTags || [],
          })
        }
        this.showBanner(platform.derailed ? '钢索全断 · 平台坠落' : '单侧钢索断裂 · 平台倾斜', 1150)
      }
    }
    this.spawnBurst(block.x, block.y, cssColor(BLOCK_MATERIALS[block.type].color), 12)
    if (awardScore) {
      const blockScore = Number.isFinite(block.scoreValue)
        ? block.scoreValue
        : (block.type === 'stone' ? 125 : block.type === 'ice' ? 75 : 50)
          + (CONSTRUCTION_MATERIALS[block.constructionId]?.scoreBonus || 0)
      this.score += blockScore
      this.levelScoreBreakdown.blocks += blockScore
    }
    for (const squirrel of this.squirrels) {
      if (Math.abs(squirrel.x - block.x) < block.width / 2 + squirrel.radius + 15) squirrel.asleep = false
    }
  }

  damageSquirrel(squirrel, amount) {
    if (!this.squirrels.includes(squirrel)) return
    squirrel.hp -= amount
    if (squirrel.hp <= 0) this.killSquirrel(squirrel)
    else if (squirrel.isBoss) this.activateBossPhases(squirrel)
  }

  activateBossPhases(squirrel) {
    const authoredPhases = this.mode === 'special' && this.bossPhases.length
      ? this.bossPhases
      : [
          { id: 'boss-rally', name: '护卫号令', hpThreshold: 0.66, telegraph: '首领号令机关加速，但不会凭空震塌整座要塞。', changes: { platformSpeedScale: 1.08 } },
          { id: 'boss-fury', name: '王庭震地', hpThreshold: 0.33, telegraph: '首领踏地释放局部冲击，远处石城保持稳定。', changes: { shockPower: 3.4 } },
        ]
    const ratio = squirrel.hp / Math.max(1, squirrel.maxHp)
    for (const phase of authoredPhases) {
      if (ratio > phase.hpThreshold || this.triggeredBossPhases.has(phase.id)) continue
      this.triggeredBossPhases.add(phase.id)
      squirrel.bossPhaseStage = Math.min(2, (squirrel.bossPhaseStage || 0) + 1)
      Object.assign(this.bossPhaseEffects, phase.changes || {})
      if (this.mode === 'special' && Array.isArray(phase.activateRuleIds)) {
        const campaignRules = getSpecialCampaign(this.specialCampaignId)?.mapRules || []
        for (const ruleId of phase.activateRuleIds) {
          const rule = campaignRules.find((candidate) => candidate.id === ruleId)
          if (rule && !this.specialRule(ruleId)) this.specialRules.push(rule)
        }
      }
      const changes = phase.changes || {}
      const platformScale = changes.pendulumSpeedScale || changes.shutterSpeedScale
        || changes.cartSpeedScale || changes.platformSpeedScale || 1
      if (platformScale !== 1) {
        for (const platform of this.platforms) {
          platform.vx *= platformScale
          platform.vy *= platformScale
        }
      }
      if (changes.brittleAllIceJoints) {
        for (const block of this.blocks) if (block.type === 'ice') {
          block.permanentlyFrozen = true
          block.brittleDamageMultiplier = Math.max(
            block.brittleDamageMultiplier || 1,
            SPECIAL_ACORN_BY_TYPE.frost.ability.brittleDamageMultiplier,
          )
          block.asleep = false
        }
      }
      if (changes.additionalDecoys) {
        for (let index = 0; index < changes.additionalDecoys; index += 1) {
          this.decoys.push({
            id: this.id('decoy'), x: squirrel.x + (index ? 90 : -90), y: squirrel.y,
            radius: squirrel.radius, opacity: 0.32, revealed: false,
          })
        }
      }
      if (changes.restitution) {
        for (const block of this.blocks) if (block.reflective) block.surfaceRestitution = changes.restitution
        for (const platform of this.platforms) if (platform.reflective) platform.surfaceRestitution = changes.restitution
      }
      if (changes.wakeStructure) {
        for (const block of this.blocks) {
          block.asleep = false
          block.restTicks = 0
        }
      }
      if (changes.shockPower) {
        this.shockwave(squirrel.x, squirrel.y, 180, changes.shockPower, { forceWake: true, source: 'boss' })
      }
      this.spawnExplosion(squirrel.x, squirrel.y, 72)
      this.addShake(8)
      this.showBanner(`首领阶段 · ${phase.name} — ${phase.telegraph}`, 2600)
    }
  }

  killSquirrel(squirrel) {
    const index = this.squirrels.indexOf(squirrel)
    if (index < 0) return
    this.squirrels.splice(index, 1)
    const targetScore = squirrel.reward || (squirrel.isBoss ? 2000 : 500)
    this.score += targetScore
    this.levelScoreBreakdown.targets += targetScore
    this.save.kills += 1
    this.spawnExplosion(squirrel.x, squirrel.y, squirrel.isBoss ? 85 : 58)
    this.addShake(squirrel.isBoss ? 13 : 8)
    this.audio.squirrelPop()
    this.unlock('first_blood')
    if (this.save.kills >= 50) this.unlock('ten_kills')
    if (squirrel.isBoss) this.unlock('boss_slayer')
    if (this.hasTalent('leech')) {
      const pityAfter = this.talentEffect('leech', 'pityAfterFailedRefunds', Number.POSITIVE_INFINITY)
      const refunded = this.levelRefundFailures >= pityAfter
        || this.lootRng.chance(this.talentEffect('leech', 'refundChance', 0))
      if (refunded) {
        this.levelRefundFailures = 0
        this.grantQueuedBird()
        this.showBanner('能量回收 · +1 橡果', 1500)
      } else this.levelRefundFailures += 1
    }
    this.persist()
    this.resolutionRequested = true
  }

  collectEgg() {
    if (!this.goldenEgg) return
    const { x, y } = this.goldenEgg
    this.goldenEgg = null
    this.levelGoldenEggClaimed = true
    const goldenScore = Math.round(5000 * this.talentEffect('lucky', 'goldenAcornScoreMultiplier', 1))
    this.score += goldenScore
    this.levelScoreBreakdown.golden += goldenScore
    const reward = claimGoldenAcornReward(this.save.encounterRewards, {
      mode: this.mode,
      campaignId: this.specialCampaignId,
      level: this.level,
      runSeed: this.runSeed,
    })
    this.save.encounterRewards = reward.records
    this.save.eggs += reward.amount
    this.unlock('egg_hunter')
    this.spawnBurst(x, y, '#ffda67', 38)
    this.audio.egg()
    this.showBanner(`金橡果 · +${goldenScore} 分${reward.granted ? ' · +1 枚金橡果' : ' · 本关金果奖励已领取'}`, 1900)
    this.persist()
  }

  addCombo() {
    this.combo += 1
    this.comboWindowTicks = Math.round(75 * this.talentEffect('comboM', 'comboWindowMultiplier', 1))
    if (this.combo >= 2) {
      const comboScore = this.combo * 25 * this.talentEffect('comboM', 'comboScoreMultiplier', 1)
      this.score += comboScore
      this.levelScoreBreakdown.combo += comboScore
      this.audio.combo(this.combo)
      if (this.combo >= 5) this.unlock('combo5')
    }
    const pulseAt = this.talentEffect('comboM', 'comboPulseAt', Number.POSITIVE_INFINITY)
    if (this.combo === pulseAt) {
      const bird = this.currentBird
      if (bird) {
        this.shockwave(bird.x, bird.y, 105, 3.2)
        this.showBanner('五连共振 · 追加一次局部震荡', 1100)
      }
    }
    const cadenceAt = this.fusionEffect('goldenCadence', 'comboPickupAt', Number.POSITIVE_INFINITY)
    const cadenceTriggers = this.fusionEffect('goldenCadence', 'triggersPerLevel', 0)
    if (!this.goldenCadenceTriggered && cadenceTriggers > 0 && this.combo >= cadenceAt) {
      this.goldenCadenceTriggered = true
      const value = this.fusionEffect('goldenCadence', 'scorePickupValue', 3500)
      this.score += value
      this.levelScoreBreakdown.combo += value
      this.save.eggs += this.fusionEffect('goldenCadence', 'currencyReward', 0)
      this.showBanner(`金色连奏 · 额外得分 +${value}`, 1350)
    }
  }

  triggerSlow() {
    this.slowTimer = 90
    this.audio.slowmo()
  }

  shockwave(x, y, radius, power, { forceWake = false, source = 'player' } = {}) {
    const playerSource = source === 'player'
    const actualRadius = radius * (playerSource
      ? this.talentEffect('shock', 'shockwaveRadiusMultiplier', 1) : 1)
    if (actualRadius > radius + 0.5) {
      this.particles.push({
        id: this.id('ring'), kind: 'ring', x, y, color: '#78d7c2',
        radius: Math.max(10, actualRadius * 0.12), grow: actualRadius / 11,
        life: 11, maxLife: 11,
      })
    }
    for (const block of [...this.blocks]) {
      const dx = block.x - x
      const dy = block.y - y
      const distance = Math.hypot(dx, dy)
      if (distance > actualRadius) continue
      const jointImpulse = playerSource && block.jointKinds?.length
        ? this.talentEffect('shock', 'jointImpulseMultiplier', 1) : 1
      const strength = power * (1 - distance / actualRadius) * jointImpulse
      if (strength <= 0.01) continue
      const frozenChainsOnce = this.fusionEffect('frozenThunder', 'frozenShockChainsOnce', true)
      if (playerSource && block.permanentlyFrozen && this.hasFusion('frozenThunder')
        && (!frozenChainsOnce || !this.frozenShockBlockIds.has(block.id))) {
        this.frozenShockBlockIds.add(block.id)
        const frozenDamage = this.fusionEffect('frozenThunder', 'frozenShockDamage', 2)
        this.damageBlock(block, frozenDamage, { sound: false })
        const chainTargets = this.fusionEffect('frozenThunder', 'frozenShockChainTargets', 2)
        const neighbors = this.blocks
          .filter((candidate) => candidate !== block && candidate.permanentlyFrozen
            && !this.frozenShockBlockIds.has(candidate.id)
            && Math.hypot(candidate.x - block.x, candidate.y - block.y) <= 82)
          .slice(0, chainTargets)
        for (const neighbor of neighbors) {
          this.frozenShockBlockIds.add(neighbor.id)
          this.damageBlock(neighbor, frozenDamage, { sound: false })
        }
        this.spawnBurst(block.x, block.y, '#bff7ff', 10)
        if (!this.blocks.includes(block)) continue
      }
      const nx = distance > 0.001 ? dx / distance : 0
      const ny = distance > 0.001 ? dy / distance : -1
      const material = this.materialPhysics(block)
      const normalizedMass = Math.max(0.7, block.mass)
      const deltaVx = nx * strength / normalizedMass
      const deltaVy = (ny - 0.18) * strength / normalizedMass
      if (block.asleep && !shouldWakeStructureBlock(block, {
        source: 'shock', speed: Math.hypot(deltaVx, deltaVy), force: forceWake,
      })) continue
      block.vx += deltaVx
      block.vy += deltaVy
      block.vr += nx * strength * 0.45 / Math.sqrt(normalizedMass)
        / Math.max(0.45, material.supportStability)
      block.asleep = false
      block.restTicks = 0
    }
    for (const squirrel of this.squirrels) {
      const dx = squirrel.x - x
      const dy = squirrel.y - y
      const distance = Math.hypot(dx, dy)
      if (distance > actualRadius) continue
      const strength = power * (1 - distance / actualRadius)
      squirrel.vx += (distance ? dx / distance : 0) * strength / squirrel.mass
      squirrel.vy += ((distance ? dy / distance : -1) - 0.25) * strength / squirrel.mass
      squirrel.asleep = false
    }
  }

  explode(x, y, radius, damage, { source = 'generic', allowChain = true } = {}) {
    this.spawnExplosion(x, y, radius)
    this.audio.boom()
    this.addShake(16)
    const blocksHit = this.blocks.filter((block) => Math.hypot(block.x - x, block.y - y) <= radius)
    const squirrelsHit = this.squirrels.filter((squirrel) => Math.hypot(squirrel.x - x, squirrel.y - y) <= radius)
    for (const block of blocksHit) {
      const distance = Math.hypot(block.x - x, block.y - y)
      const coreBonus = source === 'bomb' && distance <= radius * 0.45
        ? this.talentEffect('blastCore', 'explosionCoreDamageBonus', 0) : 0
      const wasBurning = block.burningTicks > 0
      this.damageBlock(block, damage + coreBonus)
      if (!this.blocks.includes(block)
        || !this.fusionEffect('sunforgeCore', 'explosionsIgnite', false)) continue
      this.igniteBlock(block, {
        durationTicks: this.talentEffect('flame', 'burnDurationTicks', 90),
        pulseDamage: block.type === 'wood' ? this.talentEffect('flame', 'woodBurnDamage', 1) : 1,
      })
      const heatwaveOnce = this.fusionEffect('sunforgeCore', 'heatwaveOncePerTarget', true)
      if (wasBurning && (!heatwaveOnce || !this.fusionHeatwaveBlockIds.has(block.id))) {
        this.fusionHeatwaveBlockIds.add(block.id)
        this.damageBlock(
          block,
          this.fusionEffect('sunforgeCore', 'burningTargetHeatwaveDamage', 2),
          { sound: false },
        )
      }
    }
    for (const squirrel of squirrelsHit) {
      const shieldBonus = source === 'bomb' && squirrel.variant === 'shield'
        ? this.talentEffect('blastCore', 'shieldExplosionDamageBonus', 0) : 0
      if (shieldBonus > 0 && squirrel.shieldHp > 0) {
        squirrel.shieldHp = Math.max(0, squirrel.shieldHp - shieldBonus)
        this.spawnBurst(squirrel.x, squirrel.y, SPECIAL_SQUIRREL_BY_TYPE.shield.visual.palette.accent, 8)
      }
      this.damageSquirrel(squirrel, damage)
    }
    // Explosion damage already removes weak nearby supports. Let the remaining
    // shock respect material wake resistance so one blast creates a local
    // breach instead of arbitrarily waking every connected tower at its edge.
    this.shockwave(x, y, radius + 40, damage * 7)
    const totalHits = blocksHit.length + squirrelsHit.length
    const minimumHits = this.fusionEffect('chainBombard', 'chainBlastMinimumHits', Number.POSITIVE_INFINITY)
    const maximumChains = this.fusionEffect('chainBombard', 'chainBlastsPerShot', 0)
    if (allowChain && totalHits >= minimumHits && this.chainBlastsThisShot < maximumChains) {
      this.chainBlastsThisShot += 1
      const survivors = [...this.blocks, ...this.squirrels]
        .filter((entity) => Math.hypot(entity.x - x, entity.y - y) > radius * 0.35)
        .sort((first, second) => Math.hypot(first.x - x, first.y - y)
          - Math.hypot(second.x - x, second.y - y))
      const anchor = survivors[0] || { x: x + radius * 0.45, y }
      this.showBanner('连锁爆幕 · 追加定点爆破', 1050)
      this.explode(
        anchor.x,
        anchor.y,
        radius * this.fusionEffect('chainBombard', 'chainBlastRadiusMultiplier', 0.55),
        this.fusionEffect('chainBombard', 'chainBlastDamage', 2),
        { source: 'chain', allowChain: false },
      )
    }
  }

  spawnBurst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        id: this.id('particle'), kind: ['chip', 'leaf', 'spark'][index % 3], x, y, color,
        vx: this.visualRng.range(-4.5, 4.5),
        vy: this.visualRng.range(-6, 2),
        gravity: 0.24,
        size: this.visualRng.range(2, 5),
        life: this.visualRng.integer(18, 34), maxLife: 34,
      })
    }
    if (this.particles.length > 120) this.particles.splice(0, this.particles.length - 120)
  }

  spawnExplosion(x, y, radius) {
    this.spawnBurst(x, y, '#ff6a32', 20)
    this.spawnBurst(x, y, '#ffd34e', 16)
    this.particles.push({
      id: this.id('ring'), kind: 'ring', x, y, color: '#fff4c4',
      radius: radius * 0.18, grow: radius / 13, life: 13, maxLife: 13,
    })
  }

  settleBird(bird) {
    this.removeBird(bird)
    this.resolutionRequested = true
  }

  removeBird(bird) {
    const index = this.birds.indexOf(bird)
    if (index >= 0) this.birds.splice(index, 1)
    if (bird === this.currentBird) this.currentBird = null
  }

  resolveRound() {
    if (this.state !== 'play') return
    if (this.moltenPulseSequences.length > 0) return
    const objective = this.specialObjectiveProgress()
    if (this.turnActive && (this.birds.length === 0 || objective.met)) {
      if (this.specialSettlementStartTick === null) {
        this.specialSettlementStartTick = this.mapPulseTick
        if (objective.met) this.showBanner('目标完成 · 正在结算连锁与余弹', 1600)
      }
      const settleTicks = Math.max(0, this.mapPulseTick - this.specialSettlementStartTick)
      const structuresMoving = this.blocks.some((block) => !block.asleep && (
        Math.hypot(Number(block.vx) || 0, Number(block.vy) || 0) > 0.16
        || Math.abs(Number(block.vr) || 0) > 0.012
      )) || this.platforms.some((platform) => platform.derailed && (
        Math.hypot(Number(platform.vx) || 0, Number(platform.vy) || 0) > 0.16
        || Math.abs(Number(platform.vr) || 0) > 0.012
      ))
      const shotEventPending = this.pendingMapEvents.some((event) => (
        ['ceiling-drop', 'fault-transfer', 'lightning-chain-check'].includes(event.kind)
          && event.at <= this.mapPulseTick + 60
      ))
      const damagePending = this.blocks.some((block) => block.burningTicks > 0
        && !block.burnPulseApplied && block.burnPulseDamage > 0)
        || this.fireTrail.length > 0
      const finalSettlement = objective.met || this.shotsRemaining <= 0 || this.mode === 'special'
      const minimumWait = finalSettlement ? 12 : 6
      const maximumWait = finalSettlement ? 75 : 36
      // Settle meaningful motion, not an endless decorative wobble. Ordinary
      // reloads remain short; the final shot has up to 2.5 seconds to finish
      // damage that was already in flight before scoring or declaring defeat.
      if (settleTicks < minimumWait
        || ((structuresMoving || shotEventPending || damagePending || this.birds.length > 0)
          && settleTicks < maximumWait)) return
    }
    this.settleSpecialChallengeShot()
    if (objective.met) {
      this.completeLevel()
      return
    }
    if (objective.targetsMet && !objective.collapseMet && this.birds.length > 0) return
    if (this.birds.length > 0) return
    if (!this.turnActive && this.currentBird) return
    this.turnActive = false
    this.specialSettlementStartTick = null
    this.currentBird = null
    if (objective.targetsMet && !objective.collapseMet) {
      const remaining = Math.max(0, Math.ceil((objective.requiredCollapseRatio - objective.collapseRatio) * 100))
      this.showBanner(`建筑坍塌还差 ${remaining}% · 继续破坏支点`, 1800)
    }
    if (this.shotsRemaining > 0) this.spawnBird()
    else if (this.hasTalent('secondWind')
      && this.levelRescuesUsed < this.talentEffect('secondWind', 'rescuesPerLevel', 0)) {
      this.levelRescuesUsed += 1
      const rescueShots = this.talentEffect('secondWind', 'rescueShots', 1)
      const configuredRescueType = this.talentEffect('secondWind', 'rescueBirdType', 'current-pool')
      const rescuePool = this.birdPoolForCurrentLevel()
      const unplayedPool = rescuePool.filter((type) => !this.levelPlayedBirdTypes.has(type))
      const rescueBirdType = configuredRescueType === 'current-pool-unplayed'
        ? this.loadoutRng.pick(unplayedPool.length ? unplayedPool : rescuePool)
        : configuredRescueType === 'current-pool'
          ? this.loadoutRng.pick(rescuePool)
          : configuredRescueType
      const rescueDamageBonus = this.talentEffect('secondWind', 'rescueDamageBonus', 1)
      for (let index = 0; index < rescueShots; index += 1) {
        this.grantQueuedBird(rescueBirdType, { front: true, damageBonus: rescueDamageBonus })
      }
      this.showBanner(`绝境补给 · ${BIRD_STYLE[rescueBirdType]?.name || '橡宝'} ×${rescueShots} · 直伤 +${rescueDamageBonus}`, 1700)
      this.spawnBird()
    } else if (!this.openEmergencySupply()) this.gameOver()
  }

  completeLevel() {
    if (this.state !== 'play' || !this.specialObjectiveProgress().met) return
    this.syncSpecialChallengeScore()
    if (this.mode === 'special') this.emitSpecialChallenge('base-objective-completed')
    const clearedLevel = this.level
    const previousMainBest = this.save.level
    const previousSpecialProgress = this.mode === 'special'
      ? this.save.specialProgress[this.specialCampaignId] || 0
      : 0
    const provisionalResult = this.currentClearEvaluation()
    const stageScore = Math.max(0, this.score - this.levelStartScore) + provisionalResult.totalBonus
    const objective = this.specialObjectiveProgress(stageScore)
    const result = this.currentClearEvaluation(stageScore)
    let contractSettlement = null
    if (this.mode === 'special' && this.specialChallengeState) {
      const recording = recordSpecialChallengeCompletion(
        this.save.specialChallengeRecords,
        this.specialChallengeState,
        { stageScore, shotsUsed: this.specialLaunchCount },
      )
      this.save.specialChallengeRecords = recording.records
      if (recording.rewardGold > 0) this.save.eggs += recording.rewardGold
      contractSettlement = {
        ...summarizeSpecialChallenge(this.specialChallengeState),
        firstCompletion: recording.firstCompletion,
        rewardGold: recording.rewardGold,
      }
    }
    this.levelResult = {
      ...result,
      clearedLevel,
      mode: this.mode,
      objective: this.mode === 'special' ? { ...objective } : null,
      contract: contractSettlement,
    }
    this.score += result.totalBonus
    this.commitRunScore()
    let dailySettlement = null
    if (this.mode === 'daily') {
      dailySettlement = recordDailyChallengeSegment(this.save.dailyChallenge, {
        dateSeed: this.runSeed,
        segment: clearedLevel,
        cleared: true,
        score: this.score,
      })
      if (dailySettlement.ok) this.save.dailyChallenge = dailySettlement.state
    }
    if (this.mode === 'main' || this.mode === 'endless') this.save.level = Math.max(this.save.level, clearedLevel)
    if (this.mode === 'endless') {
      this.save.endlessBestStage = Math.max(
        this.save.endlessBestStage || 0,
        Math.max(0, clearedLevel - MAIN_LEVELS),
      )
    }
    const starKey = this.mode === 'special'
      ? `special:${this.specialCampaignId}:${clearedLevel}`
      : `${this.mode}:${clearedLevel}`
    this.save.bestStars[starKey] = Math.max(this.save.bestStars[starKey] || 0, result.stars)
    if (this.replayLevelOnly || this.practiceSpecial) {
      this.persist()
      this.showPracticeResult(result, objective, contractSettlement)
      return
    }
    const talentSettlement = advanceTalentUnlockOnClear(this.score, this.talentEligibleCount)
    this.talentEligibleCount = talentSettlement.eligibleCount
    const talentPending = this.talentEligibleCount > this.talentClaimedCount
    const nextTalentMilestone = TALENT_SCORE_MILESTONES[this.talentEligibleCount] ?? null
    if (this.mode === 'special') {
      const campaign = getSpecialCampaign(this.specialCampaignId)
      this.save.specialProgress[this.specialCampaignId] = Math.max(
        this.save.specialProgress[this.specialCampaignId] || 0,
        clearedLevel,
      )
      if (clearedLevel >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN) {
        this.unlock('special_first')
        const completedCampaigns = SPECIAL_CAMPAIGNS.filter((entry) =>
          (this.save.specialProgress?.[entry.id] || 0) >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN).length
        if (completedCampaigns >= SPECIAL_CAMPAIGNS.length) this.unlock('special_all')
        if (talentPending && previousSpecialProgress < SPECIAL_STAGE_COUNT_PER_CAMPAIGN) {
          this.save.imprints += 1
          this.showBanner('终章天赋已转化为永久远征印记', 1900)
        }
        this.clearCheckpoint()
        this.persist()
        this.showSpecialVictory(result, contractSettlement)
        return
      }
      this.persist()
      this.audio.win()
      this.level += 1
      this.specialStageNumber = this.level
      this.levelStartScore = this.score
      this.persistCheckpoint()
      this.setState('between')
      this.transitionTicks = 0
      const nextStage = getSpecialStage(this.specialCampaignId, this.level)
      const talentLine = talentPending
        ? '已解锁 1 项新天赋 · 超额分数保留'
        : nextTalentMilestone
          ? `距下次天赋 ${Math.max(0, nextTalentMilestone.score - this.score).toLocaleString('zh-CN')} 分`
          : '本次构筑已封顶'
      dom.panel.innerHTML = `
        <div class="panel-card compact result-card">
          <span class="panel-kicker">${campaign.title} · ${clearedLevel}/4</span>
          <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
          <h2 class="small-title">秘境节点已突破</h2>
          <div class="score-breakdown">
            <span>过关奖励 <b>+${result.clearBonus}</b></span>
            <span>计星余弹 ${result.starEligibleShotsRemaining} <b>+${result.reserveBonus}</b></span>
            <span>松鼠 / 建材 / 连击 / 金果 <b>${this.levelScoreBreakdown.targets} / ${this.levelScoreBreakdown.blocks} / ${this.levelScoreBreakdown.combo} / ${this.levelScoreBreakdown.golden}</b></span>
            <span>本关评分 <b>${objective.stageScore.toLocaleString('zh-CN')} / ${objective.parScore.toLocaleString('zh-CN')}</b></span>
            ${contractSettlement ? `<span>秘境契约 <b>${contractSettlement.status === 'completed' ? `完成${contractSettlement.rewardGold ? ` · +${contractSettlement.rewardGold} 金橡果` : ''}` : contractSettlement.detail}</b></span>` : ''}
            <span>当前总分 <b>${this.score.toLocaleString('zh-CN')}</b></span>
            <span>天赋进度 <b>${talentLine}</b></span>
          </div>
          <button class="primary-button" type="button" data-action="next-level">${talentPending ? '领取天赋 · ' : ''}前往 ${nextStage.title}</button>
        </div>`
      this.focusPanelButton()
      return
    }
    if (this.mode === 'main' && clearedLevel >= MAIN_LEVELS) {
      this.save.endlessUnlocked = true
      this.save.specialUnlocked = true
      this.unlock('reach_lv10')
      if (talentPending && previousMainBest < MAIN_LEVELS) {
        this.save.imprints += 1
        this.showBanner('终章天赋已转化为永久远征印记', 1900)
      }
      this.clearCheckpoint()
      this.persist()
      this.showVictory(result)
      return
    }
    if (this.mode === 'daily' && clearedLevel >= DAILY_LEVELS) {
      this.unlock('daily_win')
      const dailyReward = claimDailyChallengeReward(this.save.dailyChallenge, {
        dateSeed: this.runSeed,
      })
      if (dailyReward.ok) {
        this.save.dailyChallenge = dailyReward.state
        this.save.eggs += dailyReward.reward.goldenAcorns
        if (talentPending) {
          this.save.imprints += 1
          this.showBanner('每日终章天赋已转化为永久远征印记', 1900)
        }
      }
      this.clearCheckpoint()
      this.persist()
      this.showDailyVictory(result, dailyReward)
      return
    }
    this.persist()
    this.audio.win()
    this.level += 1
    this.levelStartScore = this.score
    this.persistCheckpoint()
    this.setState('between')
    this.transitionTicks = 0
    const nextLabel = this.mode === 'endless'
      ? `深入第 ${this.level - MAIN_LEVELS} 层`
      : this.mode === 'daily'
        ? `继续今日契约 · ${this.dailyChallenge?.segments[this.level - 1]?.title || `第 ${this.level} 关`}`
        : `前往第 ${this.level} 关`
    const talentLine = talentPending
      ? '已解锁 1 项新天赋 · 超额分数保留'
      : nextTalentMilestone
        ? `距下次天赋 ${Math.max(0, nextTalentMilestone.score - this.score).toLocaleString('zh-CN')} 分`
        : '本次构筑已封顶'
    const nextAction = talentPending ? `领取天赋 · ${nextLabel}` : nextLabel
    dom.panel.innerHTML = `
      <div class="panel-card compact result-card">
        <span class="panel-kicker">第 ${clearedLevel} 关结算</span>
        <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
        <h2 class="small-title">防线已攻破</h2>
        <div class="score-breakdown">
          <span>过关奖励 <b>+${result.clearBonus}</b></span>
          <span>计星余弹 ${result.starEligibleShotsRemaining} <b>+${result.reserveBonus}</b></span>
          <span>松鼠 / 建材 / 连击 / 金果 <b>${this.levelScoreBreakdown.targets} / ${this.levelScoreBreakdown.blocks} / ${this.levelScoreBreakdown.combo} / ${this.levelScoreBreakdown.golden}</b></span>
          <span>当前总分 <b>${this.score.toLocaleString('zh-CN')}</b></span>
          <span>天赋进度 <b>${talentLine}</b></span>
        </div>
        <button class="primary-button" type="button" data-action="next-level">${nextAction}</button>
      </div>`
    this.focusPanelButton()
  }

  showPracticeResult(result, objective, contractSettlement = null) {
    const breakdown = { ...this.levelScoreBreakdown }
    const wasSpecial = this.practiceSpecial
    const level = this.level
    const campaignId = this.specialCampaignId
    this.clearWorld()
    this.currentSky = VICTORY_SKY
    this.setState('menu')
    dom.panel.innerHTML = `
      <div class="panel-card compact result-card">
        <span class="panel-kicker">单关演练完成</span>
        <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
        <h2 class="small-title">最佳星级已更新</h2>
        <div class="score-breakdown">
          <span>松鼠得分 <b>${breakdown.targets.toLocaleString('zh-CN')}</b></span>
          <span>建材得分 <b>${breakdown.blocks.toLocaleString('zh-CN')}</b></span>
          <span>连击 / 金橡果 <b>${breakdown.combo.toLocaleString('zh-CN')} / ${breakdown.golden.toLocaleString('zh-CN')}</b></span>
          <span>计星余弹 <b>${result.starEligibleShotsRemaining}</b></span>
          ${wasSpecial && objective?.parScore ? `<span>标准分 <b>${objective.stageScore.toLocaleString('zh-CN')} / ${objective.parScore.toLocaleString('zh-CN')}</b></span>` : ''}
          ${contractSettlement ? `<span>秘境契约 <b>${contractSettlement.status === 'completed' ? `完成${contractSettlement.rewardGold ? ` · +${contractSettlement.rewardGold} 金橡果` : ''}` : contractSettlement.detail}</b></span>` : ''}
        </div>
        <div class="menu-actions two-up">
          <button class="menu-button" type="button" data-action="${wasSpecial ? 'special-stage' : 'main-replay'}"
            ${wasSpecial ? `data-campaign="${campaignId}"` : ''} data-level="${level}">再试一次<span>新布局与弹药序列</span></button>
          <button class="menu-button" type="button" data-action="${wasSpecial ? 'special-select' : 'main-map'}">返回${wasSpecial ? '秘境地图' : '主线地图'}<span>选择其他节点</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  showDailyVictory(result, rewardResult = null) {
    const todayBest = this.save.dailyBest[String(this.runSeed)] || this.score
    const status = getDailyChallengeStatus(this.save.dailyChallenge, this.runSeed)
    this.clearWorld()
    this.currentSky = VICTORY_SKY
    this.setState('victory')
    this.audio.win()
    dom.panel.innerHTML = `
      <div class="panel-card compact">
        <span class="panel-kicker">${this.todayLabel()} · 每日终点</span>
        <h2 class="small-title">今日三关已完成</h2>
        <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
        <p class="story-copy">今日最佳：${todayBest.toLocaleString('zh-CN')}\n${rewardResult?.ok ? `今日薪酬：+${rewardResult.reward.goldenAcorns} 枚金橡果` : '今日薪酬已领取'}\n本周完成 ${status.week.completedDays} 天 · 周最佳 ${status.week.bestScore.toLocaleString('zh-CN')}。</p>
        <div class="menu-actions two-up">
          <button class="menu-button" type="button" data-action="daily">再战今日<span>重新从第1关开始</span></button>
          <button class="menu-button" type="button" data-action="menu">返回远征营地<span>查看全部档案</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  showVictory(result = calculateClearResult(this.shotsRemaining)) {
    this.clearCheckpoint()
    this.clearWorld()
    this.currentSky = VICTORY_SKY
    this.setState('victory')
    this.audio.win()
    dom.panel.innerHTML = `
      <div class="panel-card compact">
        <span class="panel-kicker">主线完成</span>
        <h2 class="small-title">春天回来了</h2>
        <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
        <p class="story-copy">主线通关，无尽模式与五大秘境已经解锁。\n本关奖励：+${result.totalBonus}\n最终得分：${this.score.toLocaleString('zh-CN')}</p>
        <div class="menu-actions">
          <button class="menu-button" type="button" data-action="special-select">进入秘境<span>5 章 · 20 个高难挑战</span></button>
          <button class="menu-button" type="button" data-action="endless">进入无尽<span>继续这场远征</span></button>
          <button class="menu-button" type="button" data-action="menu">返回营地<span>查看本地记录</span></button>
          <button class="menu-button" type="button" data-action="main">再走主线<span>重新开始故事</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  showSpecialVictory(result = calculateClearResult(this.shotsRemaining), contractSettlement = null) {
    const campaign = getSpecialCampaign(this.specialCampaignId)
    if (!campaign) return this.showSpecialSelect()
    this.clearCheckpoint()
    this.clearWorld()
    this.currentSky = Number.parseInt(campaign.theme.colors.skyTop.slice(1), 16)
    this.specialTheme = campaign.theme
    this.specialBackgroundScene = buildSpecialBackgroundScene(campaign, campaign.stages.at(-1))
    this.setState('special-victory')
    this.audio.win()
    const completed = SPECIAL_CAMPAIGNS.filter((entry) =>
      (this.save.specialProgress?.[entry.id] || 0) >= SPECIAL_STAGE_COUNT_PER_CAMPAIGN).length
    dom.panel.innerHTML = `
      <div class="panel-card compact special-finale campaign-theme-${escapeMarkup(campaign.id)}">
        <span class="panel-kicker">秘境完成 · ${completed}/5</span>
        <h2 class="small-title">${campaign.title}</h2>
        <div class="result-stars" aria-label="${result.stars}星过关">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</div>
        <p class="story-copy">${campaign.story.ending}\n\n章节得分：${this.score.toLocaleString('zh-CN')}${contractSettlement ? `\n秘境契约：${contractSettlement.status === 'completed' ? '完成' : contractSettlement.detail}` : ''}</p>
        <div class="menu-actions">
          <button class="menu-button" type="button" data-action="special-select">选择其他秘境<span>保留每章进度与星章</span></button>
          <button class="menu-button" type="button" data-action="special-campaign" data-campaign="${campaign.id}">再战本章<span>从第一小关开始</span></button>
          <button class="menu-button" type="button" data-action="menu">返回远征营地<span>查看全部记录</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  gameOver() {
    if (this.state !== 'play') return
    const objective = this.specialObjectiveProgress()
    const collapsePercent = Math.round(this.levelPeakCollapseRatio * 100)
    const requiredPercent = Math.round(objective.requiredCollapseRatio * 100)
    const failureContext = this.failureAidContext()
    const failure = recordLevelFailure(this.failureAidState, failureContext)
    this.failureAidState = failure.state
    this.persistFailureAidState()
    const advice = failure.hint?.recommendations?.join(' ') || (objective.remainingTargetCount > 0
      ? `还有 ${objective.remainingTargetCount} 只松鼠：优先瞄准支柱与高处目标，让一次倒塌同时清场。`
      : `松鼠已清除，但坠塌仅 ${collapsePercent}%：优先破坏底层偏心支点。`)
    this.commitRunScore()
    if (this.mode === 'daily') {
      const dailyAttempt = recordDailyChallengeSegment(this.save.dailyChallenge, {
        dateSeed: this.runSeed,
        segment: this.level,
        cleared: false,
        score: this.score,
      })
      if (dailyAttempt.ok) this.save.dailyChallenge = dailyAttempt.state
    }
    this.persist()
    if (this.mode === 'endless') this.clearCheckpoint()
    this.setState('over')
    this.audio.lose()
    const failureActions = this.mode === 'endless'
      ? `<button class="menu-button" type="button" data-action="restart-run">重新挑战无尽<span>从第 1 层建立新远征</span></button>
          <button class="menu-button" type="button" data-action="menu">返回营地<span>本次无尽远征已结束</span></button>`
      : `<button class="menu-button" type="button" data-action="retry">重试本关<span>相同布局与鸟序</span></button>
          <button class="menu-button" type="button" data-action="menu">返回营地<span>保留本关起点检查点</span></button>
          <button class="menu-button" type="button" data-action="restart-run">重开本局<span>从第一关开始</span></button>`
    const elderAidAction = failure.aidEligible
      ? `<button class="menu-button featured" type="button" data-action="elder-aid">领取长老援助<span>本关 +2 枚当前弹药池橡宝 · 不计余弹星 · 仅一次</span></button>`
      : ''
    dom.panel.innerHTML = `
      <div class="panel-card compact">
        <span class="panel-kicker">远征结束</span>
        <h2 class="small-title">远征受阻</h2>
        <p class="panel-subtitle">${failure.hint?.reasonLabel || '目标未完成'} · 本关得分 ${failureContext.stageScore.toLocaleString('zh-CN')}\n剩余松鼠 ${objective.remainingTargetCount} 只 · 最高坠塌 ${collapsePercent}%${requiredPercent ? ` / 过关 ${requiredPercent}%` : ''}</p>
        <p class="failure-tip">${advice}</p>
        <div class="menu-actions">
          ${elderAidAction}
          ${failureActions}
        </div>
      </div>`
    this.focusPanelButton()
  }

  restartLevel() {
    if (this.state === 'play' || this.state === 'over') {
      if (this.state === 'over' && this.mode === 'endless') {
        this.restartRun()
        return
      }
      this.audio.ui()
      this.cancelDrag()
      this.settingsOpen = false
      this.paused = false
      dom.pauseCard.hidden = true
      this.startLevel({ retry: true })
    }
  }

  restartRun() {
    if (this.mode === 'special') this.beginSpecialCampaign(this.specialCampaignId, { startAtFirst: true })
    else this.beginRun(this.mode)
  }

  unlock(id) {
    if (!ACHIEVEMENTS[id]) return false
    const extended = {
      specialChallengeRecords: this.save.specialChallengeRecords,
      dailyChallenge: this.save.dailyChallenge,
      failureAidStates: this.save.failureAidStates,
      encounterRewards: this.save.encounterRewards,
    }
    const result = awardAchievement(this.save, id)
    this.save = { ...result.save, ...extended }
    if (!result.unlocked) return false
    this.achievementQueue.push(`${ACHIEVEMENTS[id]} · +${result.reward} 枚金橡果`)
    this.persist()
    return true
  }

  showBanner(text, duration = 1500) {
    dom.banner.textContent = text
    dom.banner.classList.add('visible')
    this.bannerUntil = performance.now() + duration
  }

  updateNotices(now) {
    if (this.bannerUntil && now >= this.bannerUntil) {
      this.bannerUntil = 0
      dom.banner.classList.remove('visible')
    }
    if (this.achievementUntil && now >= this.achievementUntil) {
      this.achievementUntil = 0
      dom.achievement.classList.remove('visible')
    }
    if (!this.achievementUntil && this.achievementQueue.length) {
      dom.achievement.textContent = this.achievementQueue.shift()
      dom.achievement.classList.add('visible')
      this.achievementUntil = now + 2400
    }
    if (this.pendingReset && now >= this.pendingResetUntil) {
      this.pendingReset = false
      dom.resetButton.textContent = '重置本地记录'
    }
    if (this.pendingReturn && now >= this.pendingReturnUntil) {
      this.pendingReturn = false
      dom.returnMenuButton.textContent = '退出本局'
    }
  }

  showCoachmark(step) {
    if (this.save.tutorialSeen) return
    const content = {
      1: ['01', '向后拉动橡宝', '松手后沿预测轨迹飞行'],
      2: ['02', '拉出曲线', '拉得越远，飞行力量越大'],
      3: ['03', '观察弹道', '碰撞建筑或松鼠，尽量一击多破'],
    }[step]
    if (!content) return
    this.tutorialStep = step
    ;[dom.coachmarkStep.textContent, dom.coachmarkTitle.textContent, dom.coachmarkCopy.textContent] = content
    dom.coachmark.hidden = false
  }

  showAbilityCoachmark(bird) {
    if (this.save.abilityTutorialSeen || !bird || bird.type === 'red') return
    const style = BIRD_STYLE[bird.type] || BIRD_STYLE.red
    this.tutorialStep = 4
    setText(dom.coachmarkStep, '技能')
    setText(dom.coachmarkTitle, `${style.name}正在飞行`)
    setText(dom.coachmarkCopy, style.ability || '点击或按空格发动主动技能')
    dom.coachmark.hidden = false
  }

  hideCoachmark() {
    dom.coachmark.hidden = true
  }

  completeTutorial() {
    if (this.save.tutorialSeen) return
    this.save.tutorialSeen = true
    this.tutorialCompleteTick = this.fixedTick
    this.hideCoachmark()
    this.persist()
    this.showBanner('训练完成 · 祝你弹道顺利', 1500)
  }

  completeAbilityTutorial() {
    if (this.save.abilityTutorialSeen) return
    this.save.abilityTutorialSeen = true
    this.hideCoachmark()
    this.persist()
    this.showBanner('技能已掌握', 1200)
  }

  queueDiscoveries(ids) {
    const queued = new Set(this.discoveryQueue)
    if (this.activeDiscovery) queued.add(this.activeDiscovery)
    let added = 0
    for (const id of ids) {
      if (!DISCOVERIES[id] || this.save.seenDiscoveries[id] || queued.has(id)) continue
      this.discoveryQueue.push(id)
      queued.add(id)
      added += 1
    }
    if (added && !this.discoveryOpen) {
      this.discoverySequenceIndex = 0
      this.discoverySequenceTotal = this.discoveryQueue.length
    } else if (added) this.discoverySequenceTotal += added
    return added
  }

  showNextDiscovery() {
    if (this.discoveryOpen || this.state !== 'play' || this.settingsOpen || this.talentLibraryOpen
      || this.emergencySupplyOpen) {
      return this.discoveryOpen
    }
    while (this.discoveryQueue.length && this.save.seenDiscoveries[this.discoveryQueue[0]]) {
      this.discoveryQueue.shift()
    }
    const id = this.discoveryQueue.shift()
    const entry = DISCOVERIES[id]
    if (!entry) return false
    this.cancelDrag()
    this.hideCoachmark()
    if (!(this.focusBeforeDiscovery instanceof HTMLElement)) this.focusBeforeDiscovery = document.activeElement
    this.activeDiscovery = id
    this.discoveryOpen = true
    this.discoveryFromArchive = false
    this.renderWhenFrozen = true
    if (!this.discoverySequenceTotal) this.discoverySequenceTotal = this.discoveryQueue.length + 1
    dom.discoveryCard.dataset.kind = id.split(':')[0]
    setMarkup(dom.discoveryArt, discoveryArtMarkup(id))
    setText(dom.discoveryCategory, `新图鉴 · ${entry.category}`)
    setText(dom.discoveryTitle, entry.title)
    setText(dom.discoverySummary, entry.summary)
    setText(dom.discoveryAction, entry.action)
    setText(dom.discoveryTip, entry.tip)
    setText(dom.discoveryLore, entry.lore || '')
    setText(dom.discoveryPage, `图鉴 ${this.discoverySequenceIndex + 1} / ${this.discoverySequenceTotal}`)
    setText(dom.discoveryContinueButton, this.discoveryQueue.length ? '下一条' : '知道了')
    dom.discoveryCard.hidden = false
    queueMicrotask(() => dom.discoveryContinueButton.focus({ preventScroll: true }))
    this.syncUI()
    return true
  }

  openArchiveDiscovery(id, trigger = null) {
    const entry = DISCOVERIES[id]
    if (!entry || !this.save.seenDiscoveries[id] || this.discoveryOpen) return
    this.cancelDrag()
    this.focusBeforeDiscovery = trigger instanceof HTMLElement ? trigger : document.activeElement
    this.activeDiscovery = id
    this.discoveryOpen = true
    this.discoveryFromArchive = true
    this.renderWhenFrozen = true
    dom.discoveryCard.dataset.kind = id.split(':')[0]
    setMarkup(dom.discoveryArt, discoveryArtMarkup(id))
    setText(dom.discoveryCategory, `远征档案 · ${entry.category}`)
    setText(dom.discoveryTitle, entry.title)
    setText(dom.discoverySummary, entry.summary)
    setText(dom.discoveryAction, entry.action)
    setText(dom.discoveryTip, entry.tip)
    setText(dom.discoveryLore, entry.lore || '')
    setText(dom.discoveryPage, '橡心王国 · 已解锁记录')
    setText(dom.discoveryContinueButton, '关闭档案')
    dom.discoveryCard.hidden = false
    this.syncUI()
    queueMicrotask(() => dom.discoveryContinueButton.focus({ preventScroll: true }))
  }

  confirmDiscovery() {
    if (!this.discoveryOpen || !this.activeDiscovery) return
    if (this.discoveryFromArchive) {
      const focusTarget = this.focusBeforeDiscovery instanceof HTMLElement
        ? this.focusBeforeDiscovery
        : dom.panel.querySelector('[data-action="archive"]')
      this.activeDiscovery = null
      this.discoveryOpen = false
      this.discoveryFromArchive = false
      this.focusBeforeDiscovery = null
      dom.discoveryCard.hidden = true
      this.renderWhenFrozen = true
      this.syncUI()
      queueMicrotask(() => focusTarget?.focus({ preventScroll: true }))
      return
    }
    this.save.seenDiscoveries[this.activeDiscovery] = true
    this.persist()
    this.activeDiscovery = null
    this.discoveryOpen = false
    this.discoveryFromArchive = false
    this.discoverySequenceIndex += 1
    dom.discoveryCard.hidden = true
    if (this.discoveryQueue.length && this.showNextDiscovery()) return
    this.discoverySequenceTotal = 0
    this.discoverySequenceIndex = 0
    const focusTarget = this.focusBeforeDiscovery instanceof HTMLElement ? this.focusBeforeDiscovery : dom.canvas
    this.focusBeforeDiscovery = null
    this.renderWhenFrozen = true
    this.syncUI()
    queueMicrotask(() => focusTarget.focus({ preventScroll: true }))
    if (this.discoveryDigestCount > 0) {
      const count = this.discoveryDigestCount
      this.discoveryDigestCount = 0
      this.showBanner(`另有 ${count} 项任务资料已收录至远征档案`, 2200)
    }
    if (!this.save.tutorialSeen) this.showCoachmark(1)
  }

  toggleMissionStatus(force) {
    if (this.state !== 'play') return
    this.hideMissionStarTooltip()
    this.missionCollapsed = force === undefined ? !this.missionCollapsed : Boolean(force)
    this.renderWhenFrozen = true
    this.persistCheckpoint()
    this.syncMissionStatus()
  }

  showMissionStarTooltip(star) {
    if (this.state !== 'play' || this.missionCollapsed || !star?.dataset.tooltip) return
    setText(dom.missionStarTooltipTitle, star.dataset.tooltipTitle || '星级条件')
    setText(dom.missionStarTooltipCopy, star.dataset.tooltip)
    dom.missionStarTooltip.hidden = false
  }

  hideMissionStarTooltip() {
    if (dom.missionStarTooltip.hidden) return
    dom.missionStarTooltip.hidden = true
  }

  talentRuntimeDetail(id) {
    switch (id) {
      case 'feather':
        return `重力降低 ${Math.round((1 - this.talentEffect(id, 'gravityMultiplier', 0.8)) * 100)}%`
          + (this.talentEffect(id, 'highArcVelocityRetention', 1) > 1
            ? `，高弧初速保留 +${Math.round((this.talentEffect(id, 'highArcVelocityRetention', 1) - 1) * 100)}%` : '')
      case 'power':
        return `所有橡果的直接撞击伤害 +${this.talentEffect(id, 'damageBonus', 1)}`
          + (this.talentEffect(id, 'firstBossHitDamageBonus', 0)
            ? `，每枚橡果首次命中首领再 +${this.talentEffect(id, 'firstBossHitDamageBonus', 0)}` : '')
      case 'pack':
        return `每关弹仓额外补充 ${this.talentEffect(id, 'extraShots', 1)} 枚橡果`
          + (!this.talentEffect(id, 'countsForReserveStars', true)
            && !this.talentEffect(id, 'countsForReserveBonus', true) ? '，不计入余弹星级与奖励' : '')
          + '。无尽满仓时，每枚溢出补给改为强化一枚现有橡宝，直接撞击伤害 +1。'
      case 'flame':
        return `擦过建材造成 ${this.talentEffect(id, 'trailBlockDamage', 1)} 点伤害，木材再灼烧 ${this.talentEffect(id, 'woodBurnDamage', 1)} 点；本关已点燃 ${this.levelFlameBlockIds.size} 块`
      case 'frost':
        return `霜环半径 ${SPECIAL_ACORN_BY_TYPE.frost.ability.radius} → ${Math.round(SPECIAL_ACORN_BY_TYPE.frost.ability.radius * this.talentEffect(id, 'frostRadiusMultiplier', 1.35))}；永久冻脆直击倍率 ${SPECIAL_ACORN_BY_TYPE.frost.ability.brittleDamageMultiplier.toFixed(1)}× → ${(SPECIAL_ACORN_BY_TYPE.frost.ability.brittleDamageMultiplier * this.talentEffect(id, 'brittleDamageMultiplier', 1.25)).toFixed(2)}×`
      case 'leech':
        return `每次击倒松鼠有 ${Math.round(this.talentEffect(id, 'refundChance', 0.35) * 100)}% 概率返还 1 枚橡果`
          + (Number.isFinite(this.talentEffect(id, 'pityAfterFailedRefunds', Infinity)) ? '，一次落空后下次保底' : '')
      case 'shock':
        return `冲击波半径扩大 ${Math.round((this.talentEffect(id, 'shockwaveRadiusMultiplier', 1.6) - 1) * 100)}%`
      case 'lucky':
        return `金橡果出现率 ×${this.talentEffect(id, 'goldenEggChanceMultiplier', 3)}`
          + (this.talentEffect(id, 'goldenAcornScoreMultiplier', 1) > 1
            ? `，拾取得分 ×${this.talentEffect(id, 'goldenAcornScoreMultiplier', 1)}` : '')
      case 'comboM':
        return `连击获得的分数 ×${this.talentEffect(id, 'comboScoreMultiplier', 2)}`
          + (this.talentEffect(id, 'comboWindowMultiplier', 1) > 1
            ? `，容错时间 +${Math.round((this.talentEffect(id, 'comboWindowMultiplier', 1) - 1) * 100)}%` : '')
      case 'stonebreaker':
        return `直接撞击石材、根土夯砖或叶铁护板时额外造成 ${this.talentEffect(id, 'stoneDamageBonus', 1)} 点伤害`
      case 'blastCore':
        return `爆炸范围扩大 ${Math.round((this.talentEffect(id, 'explosionRadiusMultiplier', 1.25) - 1) * 100)}%`
          + (this.talentEffect(id, 'explosionCoreDamageBonus', 0)
            ? `，爆心伤害 +${this.talentEffect(id, 'explosionCoreDamageBonus', 0)}` : '')
      case 'tailwind':
        return `橡果只承受 ${Math.round(this.talentEffect(id, 'windMultiplier', 0.5) * 100)}% 的关卡风力`
          + (this.talentEffect(id, 'strongWindVelocityLossMultiplier', 1) < 1
            ? `，强风速度损失减少 ${Math.round((1 - this.talentEffect(id, 'strongWindVelocityLossMultiplier', 1)) * 100)}%` : '')
          + (this.talentEffect(id, 'headwindDamageBonus', 0) ? '，迎风命中伤害 +1' : '')
      case 'secondWind': {
        const uses = this.talentEffect(id, 'rescuesPerLevel', 1)
        const shots = this.talentEffect(id, 'rescueShots', 1)
        const damage = this.talentEffect(id, 'rescueDamageBonus', 1)
        const excluded = !this.talentEffect(id, 'countsForReserveStars', true)
          && !this.talentEffect(id, 'countsForReserveBonus', true)
        return `每关最多触发 ${uses} 次，从本关弹药池补给 ${shots} 枚强化橡宝，直伤 +${damage}`
          + `${excluded ? '，不计余弹评价' : ''}；本关已用 ${this.levelRescuesUsed}/${uses} 次`
      }
      default:
        return TALENTS[id]?.desc || '本局已生效'
    }
  }

  renderTalentLibrary(selectedId = this.talentLibrarySelectedId) {
    const ownedTalentIds = Object.keys(this.talents).filter((id) => TALENTS[id])
    const fusionIds = this.talentProgression.fusionIds
    const specialTalentIds = this.talentProgression.specialTalentIds
    const requestedKey = ownedTalentIds.includes(selectedId) ? `rank:${selectedId}` : selectedId
    const validKeys = [
      ...ownedTalentIds.map((id) => `rank:${id}`),
      ...fusionIds.map((id) => `fusion:${id}`),
      ...specialTalentIds.map((id) => `contract:${id}`),
    ]
    const selected = validKeys.includes(requestedKey) ? requestedKey : validKeys[0] ?? null
    const totalEntries = ownedTalentIds.length + fusionIds.length + specialTalentIds.length
    this.talentLibrarySelectedId = selected
    setText(dom.talentLibraryTitle, `本次远征构筑 · ${totalEntries}`)
    setText(dom.talentLibrarySummary, totalEntries
      ? '等级、融合与专属橡宝均已在当前关卡生效；下方显示准确效果。'
      : '本次远征尚未获得天赋。')
    const rankedMarkup = ownedTalentIds.map((id) => {
      const talent = TALENTS[id]
      const isSelected = selected === `rank:${id}`
      return `<article class="talent-library-item" role="listitem" data-selected="${isSelected}">
        <span class="talent-library-icon">${talentIconMarkup(talent.icon)}</span>
        <span class="talent-library-copy"><strong>${escapeMarkup(talent.name)} · ${this.talentRank(id)}级</strong>
          <small>${escapeMarkup(this.talentDescription(id))}。${escapeMarkup(this.talentRuntimeDetail(id))}</small></span>
        <span class="talent-library-meta">${isSelected ? '当前查看' : `${this.talentRank(id)}级`}</span>
      </article>`
    }).join('')
    const fusionMarkup = fusionIds.map((id) => {
      const fusion = TALENT_FUSIONS[id]
      const isSelected = selected === `fusion:${id}`
      return `<article class="talent-library-item talent-library-fusion" role="listitem" data-selected="${isSelected}">
        <span class="talent-library-icon talent-fusion-icons">${fusion.talentIds.map((talentId) => talentIconMarkup(TALENTS[talentId].icon)).join('')}</span>
        <span class="talent-library-copy"><strong>${escapeMarkup(fusion.name)}</strong>
          <small>保留${fusion.talentIds.map((talentId) => TALENTS[talentId].name).join('与')}的三级效果。${escapeMarkup(fusion.bonusDescription)}</small></span>
        <span class="talent-library-meta">${isSelected ? '当前查看' : '融合'}</span>
      </article>`
    }).join('')
    const specialMarkup = specialTalentIds.map((id) => {
      const entry = SPECIAL_ACORN_TALENTS[id]
      const style = BIRD_STYLE[entry.contract.type]
      const isSelected = selected === `contract:${id}`
      return `<article class="talent-library-item talent-library-contract" role="listitem" data-selected="${isSelected}">
        <span class="talent-library-icon talent-contract-icon" style="--talent-accent:${escapeMarkup(style.accent)}">✦</span>
        <span class="talent-library-copy"><strong>${escapeMarkup(entry.name)} · ${escapeMarkup(entry.contract.title)}</strong>
          <small>${escapeMarkup(entry.description)}每关额外注入 ${entry.contract.copiesPerLevel} 枚，不计余弹星级与奖励。</small></span>
        <span class="talent-library-meta">${isSelected ? '当前查看' : '契约'}</span>
      </article>`
    }).join('')
    setMarkup(dom.talentLibraryList, rankedMarkup + fusionMarkup + specialMarkup)
  }

  openTalentLibrary(selectedId) {
    const ownedTalentIds = Object.keys(this.talents).filter((id) => TALENTS[id])
    const entryCount = ownedTalentIds.length + this.talentProgression.fusionIds.length
      + this.talentProgression.specialTalentIds.length
    if (!entryCount || this.talentLibraryOpen || this.discoveryOpen || this.settingsOpen
      || this.emergencySupplyOpen) return
    this.cancelDrag()
    this.focusBeforeTalentLibrary = document.activeElement
    this.talentLibraryOpen = true
    this.renderWhenFrozen = true
    this.renderTalentLibrary(selectedId)
    dom.talentLibraryCard.hidden = false
    this.syncUI()
    queueMicrotask(() => dom.talentLibraryCloseButton.focus({ preventScroll: true }))
  }

  closeTalentLibrary({ restoreFocus = true } = {}) {
    if (!this.talentLibraryOpen) return
    this.talentLibraryOpen = false
    this.talentLibrarySelectedId = null
    dom.talentLibraryCard.hidden = true
    this.renderWhenFrozen = true
    this.syncUI()
    if (restoreFocus) {
      const target = this.focusBeforeTalentLibrary instanceof HTMLElement
        ? this.focusBeforeTalentLibrary
        : dom.canvas
      this.focusBeforeTalentLibrary = null
      queueMicrotask(() => target.focus({ preventScroll: true }))
    } else {
      this.focusBeforeTalentLibrary = null
    }
    if (this.discoveryQueue.length) queueMicrotask(() => this.showNextDiscovery())
  }

  cancelDrag() {
    if (this.dragPointerId !== null && dom.canvas.hasPointerCapture(this.dragPointerId)) {
      dom.canvas.releasePointerCapture(this.dragPointerId)
    }
    this.dragging = false
    this.dragPointerId = null
    this.keyboardAiming = false
    if (this.currentBird && !this.currentBird.launched) {
      this.currentBird.x = SLING_X
      this.currentBird.y = ANCHOR_Y
    }
  }

  addShake(power) {
    if (!this.save.settings.shake || prefersReducedMotion) {
      this.camera.shakePower = 0
      this.camera.shakeX = 0
      this.camera.shakeY = 0
      return
    }
    this.camera.shakePower = Math.max(this.camera.shakePower, power)
  }

  openSettings(reason = 'manual') {
    if (this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen || this.emergencySupplyOpen) return
    this.cancelDrag()
    this.focusBeforePause = document.activeElement
    this.settingsOpen = true
    if (this.state === 'play') this.paused = true
    this.audio.pauseMusic()
    this.renderWhenFrozen = true
    dom.pauseCard.hidden = false
    dom.pauseCard.dataset.reason = reason
    this.syncUI()
    queueMicrotask(() => dom.settingsSoundButton.focus({ preventScroll: true }))
  }

  syncModalIsolation() {
    const modalOpen = this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen
      || this.emergencySupplyOpen
    for (const node of [dom.topRail, dom.viewportWrap, dom.controlDeck]) node.inert = modalOpen
  }

  closeSettings({ restoreFocus = true } = {}) {
    if (!this.settingsOpen && !this.paused) return
    this.settingsOpen = false
    if (this.state === 'play') this.paused = false
    void this.audio.resumeMusic()
    dom.pauseCard.hidden = true
    this.pendingReturn = false
    dom.returnMenuButton.textContent = '返回营地'
    this.syncUI()
    if (restoreFocus) {
      const target = this.focusBeforePause instanceof HTMLElement ? this.focusBeforePause : dom.canvas
      this.focusBeforePause = null
      queueMicrotask(() => target.focus({ preventScroll: true }))
    }
  }

  togglePreference(key) {
    if (!['shake', 'skipStory', 'reducedMotion'].includes(key)) return
    this.save.settings[key] = key === 'reducedMotion' ? !prefersReducedMotion : !this.save.settings[key]
    if (key === 'reducedMotion') this.syncMotionPreference()
    if (key === 'shake' && !this.save.settings.shake) this.addShake(0)
    this.persist()
    this.syncUI()
  }

  syncMotionPreference() {
    reducedMotionOverride = typeof this.save.settings.reducedMotion === 'boolean'
      ? this.save.settings.reducedMotion : null
    prefersReducedMotion = reducedMotionOverride ?? reducedMotionPreference.matches
    document.body.dataset.reducedMotion = String(prefersReducedMotion)
    if (prefersReducedMotion && this.camera) this.addShake(0)
  }

  cycleAimGuideMode() {
    this.save.settings.aimGuideMode = nextAimGuideMode(this.save.settings.aimGuideMode)
    this.persist()
    this.syncUI()
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (dom.shell.requestFullscreen) await dom.shell.requestFullscreen()
      else this.showBanner('当前浏览器不支持全屏', 1800)
    } catch {
      this.showBanner('全屏请求被浏览器拦截', 1800)
    }
    this.syncUI()
  }

  requestReturnToMenu() {
    if (!['story', 'talent', 'play', 'between'].includes(this.state)) {
      this.closeSettings({ restoreFocus: false })
      this.showMenu()
      return
    }
    const now = performance.now()
    if (!this.pendingReturn || now >= this.pendingReturnUntil) {
      this.pendingReturn = true
      this.pendingReturnUntil = now + 3500
      dom.returnMenuButton.textContent = '再次点击确认退出'
      this.persistCheckpoint()
      this.showBanner('已保存至本关起点 · 再次点击返回营地', 1900)
      return
    }
    this.commitRunScore()
    this.persist()
    this.closeSettings({ restoreFocus: false })
    this.showMenu()
  }

  exitGame() {
    this.commitRunScore()
    this.persist()
    this.persistCheckpoint()
    this.closeSettings({ restoreFocus: false })
    this.clearWorld()
    this.currentSky = EXIT_SKY
    this.setState('exit')
    const saveConfirmed = storageWritable && !QA_MODE
    dom.panel.innerHTML = `
      <div class="panel-card compact exit-card">
        <span class="panel-kicker">${saveConfirmed ? '安全退出' : '存档提醒'}</span>
        <h2 class="small-title">${saveConfirmed ? '远征已保存' : QA_MODE ? '测试远征已结束' : '本次进度未能保存'}</h2>
        <p class="story-copy">${saveConfirmed
          ? '战绩、设置与当前关卡起点已保存在这台设备。\n下次打开可从营地继续远征；现在可安全关闭游戏窗口（⌘W / Ctrl+W）。'
          : QA_MODE ? '当前是测试模式，不会修改真实存档。现在可以关闭测试窗口。'
            : '本地存储无法写入，关闭窗口可能丢失本次进度。请先检查存储权限或磁盘空间；不要把这次退出当作保存成功。'}</p>
        <div class="menu-actions two-up">
          <button class="menu-button" type="button" data-action="menu">返回营地<span>继续游戏</span></button>
          <button class="menu-button" type="button" data-action="close-tab">关闭标签<span>浏览器可能需手动关闭</span></button>
        </div>
      </div>`
    this.focusPanelButton()
  }

  toggleMute() {
    if (!this.save.muted && this.audio.ready) {
      this.save.muted = true
      this.audio.setMuted(true)
      this.persist()
      this.showBanner('声音已关闭', 1100)
      this.syncUI()
      return
    }

    // If the UI says sound is enabled while AudioContext is still locked,
    // clicking the control repairs the connection instead of muting it.
    this.save.muted = false
    this.audio.setMuted(false)
    this.persist()
    this.syncUI()
    this.showBanner('正在连接声音…', 900)
    void this.audio.unlock().then((ready) => {
      if (!ready || this.save.muted) {
        if (!this.save.muted) this.showBanner('声音暂未启用 · 请再点击一次', 1800)
        return
      }
      this.audio.ui()
      this.audio.playStructureImpact('wood', 0.58)
      this.showBanner('声音已开启 · 试听正常', 1250)
      this.syncUI()
    })
  }

  setAudioVolume(kind, rawPercent, preview = false) {
    if (!['music', 'sfx'].includes(kind)) return
    const volume = clamp(Number(rawPercent) / 100, 0, 1)
    const key = kind === 'music' ? 'musicVolume' : 'sfxVolume'
    this.save.settings[key] = volume
    if (kind === 'music') this.audio.setMusicVolume(volume)
    else this.audio.setSfxVolume(volume)
    this.persist()
    this.syncUI()
    if (!preview) return

    const label = kind === 'music' ? '背景音乐' : '游戏音效'
    const percent = Math.round(volume * 100)
    if (this.save.muted) {
      this.showBanner(`${label} ${percent}% · 开启声音后生效`, 1400)
      return
    }
    void this.audio.unlock().then((ready) => {
      if (!ready) {
        this.showBanner(`${label} ${percent}% · 请再试一次`, 1400)
        return
      }
      if (kind === 'sfx' && volume > 0) {
        this.audio.ui()
        this.audio.playStructureImpact('wood', 0.62)
      }
      this.showBanner(`${label} ${percent}%`, 1050)
    })
  }

  setPaused(value) {
    const next = Boolean(value) && this.state === 'play'
    if (next) this.openSettings('pause')
    else this.closeSettings()
  }

  togglePause(force) {
    if (this.state !== 'play' || this.talentLibraryOpen) return
    const shouldPause = force === undefined ? !(this.paused || this.settingsOpen) : Boolean(force)
    this.setPaused(shouldPause)
  }

  resetSaveRequest() {
    const now = performance.now()
    if (!this.pendingReset || now >= this.pendingResetUntil) {
      this.pendingReset = true
      this.pendingResetUntil = now + 3500
      dom.resetButton.textContent = '再次点击确认重置'
      this.showBanner('再次点击将清空当前浏览器记录', 1800)
      return
    }
    const storage = QA_MODE ? null : safeStorage()
    if (storage) {
      for (const key of [SAVE_KEY, CHECKPOINT_KEY, ...LEGACY_SAVE_KEYS]) storage.removeItem(key)
    }
    this.runSlots = createRunSlots()
    this.runCheckpoint = null
    this.save = createExtendedDefaultSaveData()
    this.syncMotionPreference()
    this.audio.setMuted(false)
    this.audio.setMusicVolume(this.save.settings.musicVolume)
    this.audio.setSfxVolume(this.save.settings.sfxVolume)
    this.pendingReset = false
    dom.resetButton.textContent = '重置本地记录'
    this.showMenu()
    this.showBanner('本地记录已重置', 1400)
  }

  onPanelClick(event) {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    void this.audio.unlock()
    const talentChoice = button.dataset.talentChoice
    if (talentChoice) {
      this.selectTalent(talentChoice)
      return
    }
    switch (button.dataset.action) {
      case 'resume-run': this.resumeRun(); break
      case 'resume-slot': this.resumeRunSlot(button.dataset.slot); break
      case 'main': this.requestNewExpedition('main'); break
      case 'main-map': this.showMainMap(); break
      case 'main-replay': this.beginMainReplay(button.dataset.level); break
      case 'endless': this.requestNewExpedition('endless'); break
      case 'daily': this.requestNewExpedition('daily'); break
      case 'confirm-new-expedition':
        if (button.dataset.mode === 'special') this.beginSpecialCampaign(button.dataset.campaign)
        else if (['main', 'endless', 'daily'].includes(button.dataset.mode)) this.beginRun(button.dataset.mode)
        break
      case 'archive': this.showArchive(); break
      case 'archive-discovery': this.openArchiveDiscovery(button.dataset.discovery, button); break
      case 'reroll-talents': this.rerollTalentChoices(); break
      case 'special-select': this.showSpecialSelect(); break
      case 'special-campaign': this.requestNewExpedition('special', button.dataset.campaign); break
      case 'special-stage': this.beginSpecialStage(button.dataset.campaign, button.dataset.level); break
      case 'story-next': this.continuePreLevelFlow(); break
      case 'next-level':
        dom.panel.innerHTML = ''
        this.continueAfterResult()
        break
      case 'retry': this.restartLevel(); break
      case 'elder-aid': this.claimCurrentElderAid(); break
      case 'restart-run': this.restartRun(); break
      case 'menu': this.showMenu(); break
      case 'close-tab':
        // Script-opened game windows remain closable after the security boot
        // sequence deliberately clears window.opener.
        window.close()
        window.setTimeout(() => this.showBanner('请用 ⌘W / Ctrl+W 关闭当前标签页', 3200), 120)
        break
      default: break
    }
  }

  pointerToWorld(event) {
    const rect = dom.canvas.getBoundingClientRect()
    const screenX = (event.clientX - rect.left) * VIEWPORT.width / rect.width
    const screenY = (event.clientY - rect.top) * VIEWPORT.height / rect.height
    return {
      x: (screenX - VIEWPORT.width / 2 - this.camera.shakeX) / this.camera.zoom + this.camera.x,
      y: (screenY - VIEWPORT.height / 2 - this.camera.shakeY) / this.camera.zoom + this.camera.y,
    }
  }

  onPointerDown(event) {
    if (this.state !== 'play' || this.paused || this.settingsOpen || this.discoveryOpen
      || this.talentLibraryOpen || this.emergencySupplyOpen) return
    event.preventDefault()
    void this.audio.unlock()
    dom.canvas.focus({ preventScroll: true })
    const point = this.pointerToWorld(event)
    const canvasRect = dom.canvas.getBoundingClientRect()
    const cssScale = Math.max(0.001, canvasRect.width / VIEWPORT.width * this.camera.zoom)
    const minimumTouchRadius = 22 / cssScale
    const birdHitRadius = Math.max((this.currentBird?.radius || 0) + 14, minimumTouchRadius)
    if (this.currentBird && !this.currentBird.launched
      && Math.hypot(point.x - this.currentBird.x, point.y - this.currentBird.y) <= birdHitRadius) {
      if (!this.missionCollapsed) this.toggleMissionStatus(true)
      this.dragging = true
      this.keyboardAiming = false
      this.dragPointerId = event.pointerId
      dom.canvas.setPointerCapture(event.pointerId)
      this.audio.stretch()
      if (!this.save.tutorialSeen) this.showCoachmark(2)
      this.syncUI()
    } else if (this.turnActive) {
      this.useAbility()
    }
  }

  onPointerMove(event) {
    if (this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen || this.emergencySupplyOpen
      || !this.dragging || event.pointerId !== this.dragPointerId || !this.currentBird) return
    event.preventDefault()
    const point = this.pointerToWorld(event)
    let dx = point.x - SLING_X
    let dy = point.y - ANCHOR_Y
    const distance = Math.hypot(dx, dy)
    if (distance > MAX_PULL) {
      dx *= MAX_PULL / distance
      dy *= MAX_PULL / distance
    }
    this.currentBird.x = SLING_X + dx
    this.currentBird.y = ANCHOR_Y + dy
  }

  onPointerUp(event) {
    if (this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen || this.emergencySupplyOpen
      || !this.dragging || event.pointerId !== this.dragPointerId) return
    event.preventDefault()
    this.dragging = false
    this.dragPointerId = null
    if (dom.canvas.hasPointerCapture(event.pointerId)) dom.canvas.releasePointerCapture(event.pointerId)
    this.launchCurrent()
  }

  onPointerCancel(event) {
    if (event.pointerId !== this.dragPointerId) return
    this.cancelCurrentAim()
  }

  onWheel(event) {
    if (this.state !== 'play' || this.settingsOpen || this.discoveryOpen || this.talentLibraryOpen
      || this.emergencySupplyOpen) return
    event.preventDefault()
    this.zoomPref *= event.deltaY < 0 ? 1.15 : 0.87
    this.zoomPref = clamp(this.zoomPref, MIN_ZOOM, MAX_ZOOM)
  }

  aimCurrentBird(code) {
    const bird = this.currentBird
    if (this.state !== 'play' || this.paused || this.settingsOpen || this.discoveryOpen
      || this.talentLibraryOpen || this.emergencySupplyOpen || !bird || bird.launched) return false
    let dx = bird.x - SLING_X
    let dy = bird.y - ANCHOR_Y
    const amount = 7
    if (code === 'ArrowLeft') dx -= amount
    else if (code === 'ArrowRight') dx = Math.min(0, dx + amount)
    else if (code === 'ArrowUp') dy -= amount
    else if (code === 'ArrowDown') dy += amount
    else return false
    if (!this.missionCollapsed) this.toggleMissionStatus(true)
    const distance = Math.hypot(dx, dy)
    if (distance > MAX_PULL) {
      dx *= MAX_PULL / distance
      dy *= MAX_PULL / distance
    }
    bird.x = SLING_X + dx
    bird.y = ANCHOR_Y + dy
    this.keyboardAiming = Math.hypot(dx, dy) > 0
    if (!this.save.tutorialSeen) this.showCoachmark(2)
    this.syncUI()
    return true
  }

  onKeyDown(event) {
    // App/browser shortcuts and text editing must not fire combat commands.
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
    if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea, [contenteditable="true"]')
      && !['Escape', 'Tab'].includes(event.code)) return
    if (event.repeat && ['Enter', 'Space', 'KeyR', 'KeyP', 'KeyM', 'KeyG', 'Escape'].includes(event.code)) return
    if (!this.save.muted && event.code !== 'KeyM') void this.audio.unlock()
    const interactive = event.target instanceof HTMLElement
      && Boolean(event.target.closest('button, input, select, textarea, a[href]'))
    if (event.code === 'Escape') {
      event.preventDefault()
      if ((this.dragging || this.keyboardAiming) && this.state === 'play' && !this.settingsOpen) {
        this.cancelCurrentAim({ announce: true })
      } else if (this.emergencySupplyOpen) {
        this.showBanner('请选择补给，或点击“放弃补给”结束本局', 1500)
        dom.emergencySupplyDecline.focus({ preventScroll: true })
      } else if (this.discoveryOpen) this.confirmDiscovery()
      else if (this.talentLibraryOpen) this.closeTalentLibrary()
      else if (this.settingsOpen || this.paused) this.closeSettings()
      else if (this.state === 'play' && !this.missionCollapsed) this.toggleMissionStatus(true)
      else if (this.state === 'play') this.openSettings('escape')
      return
    }
    if (this.emergencySupplyOpen) {
      if (event.code === 'Tab') {
        const focusable = [...dom.emergencySupplyCard.querySelectorAll('button:not(:disabled)')]
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
      return
    }
    if (this.discoveryOpen) {
      if (event.code === 'Tab') {
        event.preventDefault()
        dom.discoveryContinueButton.focus({ preventScroll: true })
      }
      return
    }
    if (this.talentLibraryOpen) {
      if (event.code === 'Tab') {
        const focusable = [...dom.talentLibraryCard.querySelectorAll('button:not(:disabled):not([hidden])')]
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus({ preventScroll: true })
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus({ preventScroll: true })
        }
      }
      return
    }
    if (this.settingsOpen && event.code === 'Tab') {
      const focusable = [...dom.pauseCard.querySelectorAll(
        'button:not(:disabled):not([hidden]), input:not(:disabled):not([hidden])',
      )]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
      return
    }
    if (this.settingsOpen && event.code === 'KeyR') {
      event.preventDefault()
      this.restartLevel()
      return
    }
    if (event.code === 'KeyG' && this.state === 'play' && !this.settingsOpen) {
      event.preventDefault()
      this.toggleMissionStatus()
      return
    }
    if (event.code === 'KeyP' && this.state === 'play') {
      event.preventDefault()
      this.togglePause()
      return
    }
    if (event.code === 'KeyR' && ['play', 'over'].includes(this.state)) {
      event.preventDefault()
      this.restartLevel()
      return
    }
    if (event.code === 'KeyM') {
      this.toggleMute()
      return
    }
    if (this.settingsOpen || this.talentLibraryOpen || this.emergencySupplyOpen || interactive) return
    void this.audio.unlock()
    if (this.aimCurrentBird(event.code)) {
      event.preventDefault()
    } else if (event.code === 'Enter' && this.state === 'play' && this.currentBird && !this.currentBird.launched) {
      event.preventDefault()
      this.launchCurrent()
    } else if (event.code === 'Space') {
      if (this.state === 'play') {
        event.preventDefault()
        this.useAbility()
      }
    } else if (event.code === 'KeyD' && this.state === 'menu') this.requestNewExpedition('daily')
  }

  stepCamera() {
    const target = this.state === 'play' && this.birds.length
      ? this.birds[this.birds.length - 1]
      : null
    const overview = this.overviewCameraTarget()
    const targetX = target ? target.x + clamp(target.vx * 7, -80, 130) : overview.x
    const targetY = target ? clamp(target.y, 210, 390) : overview.y
    const targetZoom = target ? clamp(this.zoomPref * 0.92, MIN_ZOOM, 1.15) : overview.zoom
    this.camera.x += (targetX - this.camera.x) * 0.06
    this.camera.y += (targetY - this.camera.y) * 0.06
    this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05
    if (!this.save.settings.shake || prefersReducedMotion) {
      this.camera.shakePower = 0
      this.camera.shakeX = 0
      this.camera.shakeY = 0
    } else if (this.camera.shakePower > 0.1) {
      this.camera.shakeX = (this.visualRng.next() - 0.5) * this.camera.shakePower
      this.camera.shakeY = (this.visualRng.next() - 0.5) * this.camera.shakePower
      this.camera.shakePower *= 0.84
    } else {
      this.camera.shakePower = 0
      this.camera.shakeX = 0
      this.camera.shakeY = 0
    }
  }

  overviewCameraTarget() {
    if (this.state !== 'play' || (!this.blocks.length && !this.squirrels.length && !this.platforms.length)) {
      return { x: 450, y: 300, zoom: this.zoomPref }
    }

    let left = SLING_X - MAX_PULL - 38
    let right = SLING_X + 68
    const include = (x, halfWidth = 0) => {
      left = Math.min(left, x - halfWidth)
      right = Math.max(right, x + halfWidth)
    }
    for (const squirrel of this.squirrels) include(squirrel.x, squirrel.radius)
    for (const platform of this.platforms) include(platform.x, platform.width / 2)
    if (this.goldenEgg) include(this.goldenEgg.x, this.goldenEgg.radius)
    const objectiveRight = right
    for (const block of this.blocks) {
      if (block.x - block.width / 2 <= objectiveRight + 180) include(block.x, block.width / 2)
    }

    left -= 28
    right += 54
    return calculateOverviewCamera({ left, right, preferredZoom: this.zoomPref })
  }

  levelLabel() {
    if (this.mode === 'daily') return `每日挑战 · 第 ${this.level} 关`
    if (this.mode === 'endless') return `无尽 · 第 ${this.level - MAIN_LEVELS} 层`
    if (this.mode === 'special') {
      const campaign = getSpecialCampaign(this.specialCampaignId)
      return `${campaign?.title || '秘境'} · ${this.level}/4`
    }
    return `主线 · ${this.level}/${MAIN_LEVELS}`
  }

  modeLabel() {
    if (this.mode === 'daily') return '每日挑战'
    if (this.mode === 'endless') return '无尽模式'
    if (this.mode === 'special') return getSpecialCampaign(this.specialCampaignId)?.title || '秘境篇章'
    return '主线'
  }

  focusPanelButton() {
    queueMicrotask(() => dom.panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true }))
  }

  windPresentation(windX = this.displayedWind()) {
    const speed = Math.abs(windX)
    const level = speed < 0.005 ? 0 : speed < 0.035 ? 1 : speed < 0.065 ? 2 : 3
    const names = ['静风', '微风', '劲风', '强风']
    return {
      speed,
      value: windX,
      level,
      name: names[level],
      arrow: level === 0 ? '—' : windX < 0 ? '←' : '→',
      direction: level === 0 ? '无明显风向' : windX < 0 ? '向左吹' : '向右吹',
    }
  }

  activeAbilityStatus() {
    const bird = this.currentBird
    if (!bird || bird.type === 'red') return null
    if (!bird.used) return (BIRD_STYLE[bird.type] || BIRD_STYLE.red).ability
    if (bird.type === 'drill' && bird.abilityTicks > 0) return `垂直钻击中 · 还能穿透 ${bird.pierceRemaining} 块`
    if (bird.type === 'boomerang' && bird.abilityTicks > 0) {
      return `回旋强化 · ${(bird.abilityTicks * STEP_MS / 1000).toFixed(1)} 秒`
    }
    if (bird.type === 'dash' && bird.abilityTicks > 0) return '疾风强化 · 撞击伤害 +1'
    if (bird.type === 'vine' && bird.tetherTicks > 0) return '藤索牵引中'
    if (bird.type === 'quake' && bird.quakeArmed) return '震地锁定 · 落地触发'
    if (bird.type === 'fire' && bird.fireArmed) return '熔芯已点燃 · 接触建材后附着灼烧'
    if (bird.type === 'frost') return '霜域已释放 · 建材永久冻脆，敌人暂时减速'
    if (bird.type === 'talent-emberheart' && bird.moltenHeartArmed) return '熔心已激活 · 命中建材后从内部连续灼烧'
    if (bird.type === 'talent-prism-bell') return '镜霜双环已释放 · 建材永久冻脆'
    if (bird.type === 'talent-thunder-root' && bird.thunderRootArmed) return '雷根蓄电中 · 落地后沿承重连接追索'
    if (bird.type === 'talent-thunder-root') return '雷根追索已完成 · 承重连接受损'
    if (bird.type === 'split') return '双叶分裂已完成'
    return '主动能力已释放'
  }

  syncMissionStatus() {
    const visible = this.state === 'play'
    if (dom.missionCard.hidden === visible) dom.missionCard.hidden = !visible
    if (!visible) {
      this.hideMissionStarTooltip()
      return
    }

    const objective = this.specialObjectiveProgress()
    const rating = this.currentClearEvaluation()
    const actualPercent = Math.round(objective.collapseRatio * 100)
    const passPercent = Math.round(objective.requiredCollapseRatio * 100)
    const threeStarPercent = Math.round(rating.threeStarCollapseRatio * 100)
    const objectiveTitle = objective.type === 'defeat-boss'
      ? '击败首领并清除护卫'
      : objective.requiredCollapseRatio > 0
        ? '消灭松鼠并摧毁防线'
        : '消灭全部松鼠'
    const objectiveDetail = objective.requiredCollapseRatio > 0
      ? `全部目标归零，建筑坍塌至少 ${passPercent}%`
      : '据点内所有松鼠都必须被击倒'
    const wind = this.windPresentation()
    const compactWind = wind.level === 0 ? '静风' : `风${wind.arrow}${wind.level}`
    const compactCollapse = objective.requiredCollapseRatio > 0 ? ` · 坍${actualPercent}%` : ''
    const contract = summarizeSpecialChallenge(this.specialChallengeState)
    const compactContract = contract
      ? ` · 契约${contract.status === 'completed' ? '✓' : contract.status === 'failed' ? '×' : `${contract.current}/${contract.total}`}`
      : ''

    setAttribute(dom.missionCard, 'data-collapsed', this.missionCollapsed)
    if (dom.missionBody.hidden !== this.missionCollapsed) dom.missionBody.hidden = this.missionCollapsed
    setAttribute(dom.missionToggleButton, 'aria-expanded', !this.missionCollapsed)
    const accessibleMissionSummary = `任务${objective.eliminatedTargetCount}/${objective.initialTargetCount}`
      + `${objective.requiredCollapseRatio > 0 ? `，坍塌${actualPercent}%` : ''}，${wind.direction}，${wind.name}`
    setAttribute(dom.missionToggleButton, 'aria-label', this.missionCollapsed
      ? `${accessibleMissionSummary}。展开本关战况与星级条件`
      : '收起本关战况与星级条件')
    setAttribute(dom.missionToggleButton, 'title', this.missionCollapsed
      ? '展开任务、星级与风况详情'
      : '收起任务指引')
    setText(dom.missionToggleButton, this.missionCollapsed
      ? `任务 ${objective.eliminatedTargetCount}/${objective.initialTargetCount}${compactCollapse}${compactContract} · ${compactWind}`
      : '收起')

    setText(dom.missionTitle, this.levelLabel())
    setText(dom.missionObjective, objectiveTitle)
    setText(dom.missionObjectiveDetail, objectiveDetail)
    dom.missionContract.hidden = !contract || this.missionCollapsed
    if (contract) {
      const ratio = clamp(contract.current / Math.max(1, contract.total), 0, 1)
      setAttribute(dom.missionContract, 'data-status', contract.status)
      setText(dom.missionContractLabel, contract.label)
      setText(dom.missionContractDetail, contract.detail)
      if (['precision-strike', 'ordered-demolition'].includes(this.specialObjective?.challenge?.kind)) {
        setText(dom.missionContractDetail, `${contract.detail} · 金色标记是当前目标${this.specialObjective.challenge.kind === 'ordered-demolition' ? '，按数字顺序拆除' : '，“击”为关键受力点'}`)
      }
      setText(dom.missionContractProgress, `${contract.current} / ${contract.total}`)
      dom.missionContractFill.style.width = `${Math.round(ratio * 100)}%`
      const meter = dom.missionContractFill.parentElement
      setAttribute(meter, 'aria-valuemax', contract.total)
      setAttribute(meter, 'aria-valuenow', contract.current)
    }
    setText(dom.missionSquirrelProgress, `${objective.eliminatedTargetCount} / ${objective.initialTargetCount}`)
    setProgress(dom.missionSquirrelMeter, objective.eliminatedTargetCount, objective.initialTargetCount)
    setText(dom.missionStructureLabel, objective.requiredCollapseRatio > 0 ? '建筑坍塌' : '建筑破坏')
    setText(dom.missionStructureProgress, `${actualPercent}%`)
    setProgress(dom.missionStructureMeter, objective.collapseRatio, 1)
    setText(dom.missionStructureRequirement, objective.requiredCollapseRatio > 0
      ? `过关需 ${passPercent}% · 三星需 ${threeStarPercent}%`
      : `过关无硬性要求 · 三星需 ${threeStarPercent}%`)
    const starEligibleShots = rating.starEligibleShotsRemaining
    setText(dom.missionShotsRemaining, rating.excludedBonusShots > 0
      ? `剩余 ${this.shotsRemaining} 枚 · 计星 ${starEligibleShots} 枚`
      : `剩余 ${this.shotsRemaining} 枚`)
    setText(dom.missionStar1Condition, '完成全部过关目标')
    setText(dom.missionStar2Condition, '完成目标 · 余弹 ≥ 1')
    setText(dom.missionStar3Condition, `余弹 ≥ 2 · 建筑 ≥ ${threeStarPercent}%${this.mode === 'special' && objective.parScore ? ' · 达标准分' : ''}`)
    const starRequirements = [
      {
        star: dom.missionStar1,
        title: '1 星条件',
        copy: `完成本关全部过关目标：${objectiveTitle}。${objectiveDetail}。`,
      },
      {
        star: dom.missionStar2,
        title: '2 星条件',
        copy: '完成全部过关目标，并在结算时至少保留 1 枚计星橡宝。天赋额外弹、返还弹和救援弹不计入。',
      },
      {
        star: dom.missionStar3,
        title: '3 星条件',
        copy: `完成全部过关目标，至少保留 2 枚计星橡宝，建筑破坏或坍塌达到 ${threeStarPercent}%`
          + `${this.mode === 'special' && objective.parScore ? `，并达到标准分 ${objective.parScore.toLocaleString('zh-CN')}` : ''}。`,
      },
    ]
    for (const requirement of starRequirements) {
      setAttribute(requirement.star, 'data-tooltip-title', requirement.title)
      setAttribute(requirement.star, 'data-tooltip', requirement.copy)
      setAttribute(requirement.star, 'title', `${requirement.title}：${requirement.copy}`)
      setAttribute(requirement.star, 'aria-label', `${requirement.title}。${requirement.copy}`)
    }
    setAttribute(dom.missionStar1, 'data-earned', objective.met)
    setAttribute(dom.missionStar2, 'data-earned', rating.stars >= 2)
    setAttribute(dom.missionStar3, 'data-earned', rating.stars >= 3)

    const acornWindMultiplier = this.talentEffect('tailwind', 'windMultiplier', 1)
    setText(dom.missionWindArrow, wind.arrow)
    setText(dom.missionWindDirection, `${wind.direction}${wind.level ? ` · ${wind.speed.toFixed(2)}` : ''}`
      + (acornWindMultiplier < 1 ? ` · 橡果受风 ${Math.round(acornWindMultiplier * 100)}%` : ''))
    setText(dom.missionWindLevel, `${wind.level} 级 · ${wind.name}`)
    setAttribute(dom.missionCard, 'data-wind-level', wind.level)
    setAttribute(dom.missionCard, 'aria-label', `${this.levelLabel()}。过关目标：${objectiveTitle}。`
      + `松鼠已消灭${objective.eliminatedTargetCount}只，共${objective.initialTargetCount}只。`
      + `建筑坍塌${actualPercent}%。余弹${this.shotsRemaining}枚。${wind.direction}，${wind.name}。`)
  }

  syncUI() {
    dom.shell.dataset.state = this.state
    this.syncModalIsolation()
    const hudHidden = !['play', 'between'].includes(this.state)
    if (dom.hud.hidden !== hudHidden) dom.hud.hidden = hudHidden
    this.syncMissionStatus()
    setText(dom.hudLevel, this.levelLabel())
    setText(dom.hudScore, String(Math.max(0, Math.floor(this.score))).padStart(6, '0'))
    const talentPending = this.talentEligibleCount > this.talentClaimedCount
    const nextTalent = TALENT_SCORE_MILESTONES[this.talentEligibleCount] ?? null
    const previousThreshold = nextTalent && nextTalent.index > 0
      ? TALENT_SCORE_MILESTONES[nextTalent.index - 1].score
      : 0
    const talentRatio = nextTalent
      ? clamp((this.score - previousThreshold) / Math.max(1, nextTalent.score - previousThreshold), 0, 1)
      : 1
    setAttribute(dom.hudScore, 'data-talent-progress', Math.round(talentRatio * 10))
    const talentProgressLabel = talentPending
      ? '待领天赋 ×1'
      : nextTalent && this.score >= nextTalent.score
        ? '已达标 · 过关解锁'
        : nextTalent ? `距天赋 ${Math.max(0, nextTalent.score - this.score).toLocaleString('zh-CN')}` : '本次构筑已封顶'
    setAttribute(dom.hudScore, 'data-progress-label', talentProgressLabel)
    setAttribute(dom.hudScore, 'aria-label', `当前得分 ${Math.floor(this.score)}，${talentProgressLabel}`)
    const currentStyle = BIRD_STYLE[this.currentBird?.type] || BIRD_STYLE.red
    const currentAmmoLabel = this.currentBird?.aceSupply
      ? ' · 王牌补给'
      : this.currentBird?.bonusShot ? ' · 增援弹' : ''
    const reinforcedLabel = this.currentBird?.grantedDamageBonus > 0 ? ` · 撞击 +${this.currentBird.grantedDamageBonus}` : ''
    setText(dom.hudBirds, `橡果 × ${this.shotsRemaining} · ${currentStyle.name}${currentAmmoLabel}${reinforcedLabel}`)
    const hasActiveAbility = this.currentBird?.type && this.currentBird.type !== 'red'
    setText(dom.skillControlTitle, hasActiveAbility ? '点击 · 空格' : '基础橡宝')
    setText(dom.skillControlCopy, hasActiveAbility
      ? currentStyle.ability.replace(/^点击\s*\/\s*空格：/u, '')
      : '无主动技能 · 专心调整弹道')
    const queuedNames = this.shotQueue.slice(0, 3).map((type) => BIRD_STYLE[type]?.name || BIRD_STYLE.red.name)
    setAttribute(dom.hudBirds, 'aria-label', `剩余${this.shotsRemaining}只，当前${currentStyle.name}${queuedNames.length ? `，接下来${queuedNames.join('、')}` : ''}`)
    const selectorVisible = this.state === 'play' && this.shotQueue.length > 0
    if (dom.shotSelector.hidden === selectorVisible) dom.shotSelector.hidden = !selectorVisible
    const selectorEnabled = this.canSelectQueuedBird()
    const queueTalentUnlocked = this.talentEffect(
      'tacticalMagazine', 'queueSelectionEnabled', false,
    )
    const selectorHint = !queueTalentUnlocked
      ? '待发预览 · 获取“战术弹仓”后可换位'
      : this.turnActive || this.currentBird?.launched
      ? '橡果飞行中 · 下回合可调整'
      : this.dragging
        ? '按 Esc 取消瞄准后可调整'
        : selectorEnabled
          ? '点击任意橡果换到发射位'
          : '当前暂不可调整序列'
    setAttribute(dom.shotSelector, 'data-collapsed', this.shotSelectorCollapsed)
    setAttribute(dom.shotSelectorToggle, 'aria-expanded', !this.shotSelectorCollapsed)
    setAttribute(dom.shotSelectorToggle, 'aria-label', this.shotSelectorCollapsed
      ? `展开待发弹仓，共${this.shotQueue.length}枚`
      : '收起待发弹仓')
    setText(dom.shotSelectorToggle, this.shotSelectorCollapsed
      ? `弹仓 ${this.shotQueue.length} · 展开` : '收起')
    if (dom.shotSelectorList.hidden !== this.shotSelectorCollapsed) {
      dom.shotSelectorList.hidden = this.shotSelectorCollapsed
    }
    setText(dom.shotSelectorHint, selectorHint)
    setAttribute(dom.shotSelector, 'aria-label', `待发序列，共${this.shotQueue.length}枚。${selectorHint}`)
    const forecastQueueSlots = this.forecastQueueSlots()
    const forecastDirection = this.pendingLaunchWind() < -0.005 ? '←'
      : this.pendingLaunchWind() > 0.005 ? '→' : '·'
    setMarkup(dom.shotSelectorList, this.shotQueue.map((type, index) => {
      const style = BIRD_STYLE[type] || BIRD_STYLE.red
      const shortName = style.name.replace(/橡宝|橡果/gu, '') || '普通'
      const bonusShot = Boolean(this.shotQueueBonus[index])
      const damageBonus = Number(this.shotQueueDamageBonus[index]) || 0
      const aceSupply = Boolean(this.shotQueueAce[index])
      const metadataLabel = `${bonusShot ? '，额外弹药' : ''}${aceSupply ? '，王牌补给' : ''}${damageBonus ? `，伤害加成${damageBonus}` : ''}`
      return `<button class="shot-select-button" type="button" data-queue-index="${index}"
        style="--shot-shell:${escapeMarkup(style.shell)};--shot-cap:${escapeMarkup(style.cap)};--shot-accent:${escapeMarkup(style.accent)}"
        ${selectorEnabled ? '' : 'disabled'}
        title="第 ${index + 1} 位：${escapeMarkup(style.name)}${escapeMarkup(metadataLabel)}"
        aria-label="将待发第${index + 1}枚${escapeMarkup(style.name)}换到发射位${escapeMarkup(metadataLabel)}">
        <span class="shot-order" aria-hidden="true">${index + 1}</span>
        <canvas class="shot-acorn-portrait-canvas" data-bird-type="${escapeMarkup(type)}"
          data-shot-index="${index}" width="112" height="124" aria-hidden="true"></canvas>
        <span class="shot-short-name" aria-hidden="true">${escapeMarkup(shortName)}</span>
        ${index < forecastQueueSlots
          ? `<span class="shot-forecast-badge" title="风算弹仓预演" aria-hidden="true">风${forecastDirection}</span>`
          : ''}
        ${bonusShot ? '<span class="shot-meta-badge" aria-hidden="true">加</span>' : ''}
        ${aceSupply ? '<span class="shot-ace-badge" aria-hidden="true">王</span>' : ''}
        ${damageBonus ? `<span class="shot-damage-badge" aria-hidden="true">+${damageBonus}</span>` : ''}
      </button>`
    }).join(''))
    this.renderShotSelectorPortraits()
    const conditions = []
    if (this.architectureBlueprint?.name && this.mode !== 'special') {
      conditions.push(this.architectureBlueprint.name)
    }
    if (this.mapType === 'moving') conditions.push('升降平台')
    if (this.mode === 'endless') conditions.push(`无尽纪录 ${this.save.endlessBestStage || 0} 层`)
    if (this.mode === 'daily' && this.dailyChallenge) {
      conditions.push(`${this.dailyChallenge.modifiers.boon.name} / ${this.dailyChallenge.modifiers.pressure.name}`)
    }
    if (this.slowTimer > 0) conditions.push('冰霜减速')
    if (this.combo >= 2) conditions.push(`连击 ×${this.combo}`)
    if (this.squirrels.some((squirrel) => squirrel.isBoss)) conditions.push('首领战')
    if (this.mode === 'special') {
      const stage = getSpecialStage(this.specialCampaignId, this.level)
      if (stage) conditions.unshift(`秘境 ${stage.difficulty}/10`)
      if (this.specialWaterY !== null) conditions.push('潮位循环')
      if (this.specialRule('surface-restitution')) conditions.push('镜面高反弹')
      if (this.specialRule('delayed-collapse')) conditions.push('延迟断层')
      if (this.specialRule('timed-impulse')) conditions.push('雷击脉冲')
    }
    const abilityStatus = this.activeAbilityStatus()
    if (abilityStatus) conditions.push(abilityStatus)
    if (this.currentBird?.aceSupply) {
      conditions.push(`王牌补给 · 直伤 +${this.currentBird.grantedDamageBonus || 0}`)
    }
    if (this.hasTalent('flame')) conditions.push(this.levelFlameIgnitions > 0
      ? `烈焰尾迹 · 已点燃 ${this.levelFlameIgnitions} 块`
      : '烈焰尾迹待命')
    if (this.hasTalent('tailwind') && Math.abs(this.windX) > 0.001) conditions.push('定风羽生效')
    if (!conditions.length) conditions.push('准备发射')
    setText(dom.hudCondition, conditions.join(' · '))
    const ownedTalentIds = Object.keys(this.talents).filter((id) => TALENTS[id])
    const rankedButtons = ownedTalentIds
      .map((id) => {
        const talent = TALENTS[id]
        return `<button class="talent-mini-button" type="button" data-talent="${escapeMarkup(id)}"
          data-tooltip="${escapeMarkup(talent.name)} · ${this.talentRank(id)}级"
          aria-haspopup="dialog" aria-controls="talent-library-card"
          aria-label="${escapeMarkup(talent.name)}${this.talentRank(id)}级。${escapeMarkup(this.talentDescription(id))}。点击查看本局全部天赋">
          ${talentIconMarkup(talent.icon, 'talent-mini-symbol')}<b class="talent-mini-rank">${this.talentRank(id)}</b></button>`
      })
      .join('')
    const fusionButtons = this.talentProgression.fusionIds.map((id) => {
      const fusion = TALENT_FUSIONS[id]
      return `<button class="talent-mini-button talent-mini-fusion" type="button" data-talent="fusion:${escapeMarkup(id)}"
        data-tooltip="${escapeMarkup(fusion.name)} · 融合" aria-haspopup="dialog" aria-controls="talent-library-card"
        aria-label="已融合${escapeMarkup(fusion.name)}。点击查看全部天赋">✦</button>`
    }).join('')
    const contractButtons = this.talentProgression.specialTalentIds.map((id) => {
      const entry = SPECIAL_ACORN_TALENTS[id]
      return `<button class="talent-mini-button talent-mini-contract" type="button" data-talent="contract:${escapeMarkup(id)}"
        data-tooltip="${escapeMarkup(entry.contract.title)} · 契约" aria-haspopup="dialog" aria-controls="talent-library-card"
        aria-label="已签订${escapeMarkup(entry.name)}，每关获得${escapeMarkup(entry.contract.title)}。点击查看全部天赋">◈</button>`
    }).join('')
    setMarkup(dom.hudTalents, rankedButtons + fusionButtons + contractButtons)
    const talentEntryCount = ownedTalentIds.length + this.talentProgression.fusionIds.length
      + this.talentProgression.specialTalentIds.length
    const talentEntryLabels = [
      ...ownedTalentIds.map((id) => `${TALENTS[id].name}${this.talentRank(id)}级`),
      ...this.talentProgression.fusionIds.map((id) => `${TALENT_FUSIONS[id].name}融合`),
      ...this.talentProgression.specialTalentIds.map((id) => `${SPECIAL_ACORN_TALENTS[id].contract.title}契约`),
    ]
    setAttribute(dom.hudTalents, 'aria-label', talentEntryCount
      ? `已获得天赋：${talentEntryLabels.join('、')}`
      : '尚未获得天赋')
    setAttribute(dom.hudTalents, 'data-count', talentEntryCount)
    setText(dom.modeBadge, this.state === 'menu' ? '橡果远征'
      : this.state === 'exit' ? '记录已保存'
        : this.modeLabel())
    dom.pauseButton.disabled = this.state !== 'play'
    dom.restartButton.disabled = !['play', 'over'].includes(this.state)
    setAttribute(dom.settingsButton, 'aria-expanded', this.settingsOpen)
    const playPaused = this.state === 'play' && (this.paused || this.settingsOpen)
    setAttribute(dom.pauseButton, 'aria-label', playPaused ? '继续游戏' : '暂停游戏')
    setAttribute(dom.muteButton, 'aria-label', this.save.muted ? '开启声音' : '关闭声音')
    dom.pauseButton.dataset.paused = String(playPaused)
    dom.muteButton.dataset.muted = String(this.save.muted)
    const muteCopy = dom.muteButton.querySelector('.button-copy')
    if (muteCopy) setText(muteCopy, this.save.muted ? '静音' : '声音')
    const pauseCopy = dom.pauseButton.querySelector('.button-copy')
    if (pauseCopy) setText(pauseCopy, playPaused ? '继续' : '暂停')
    setText(dom.settingsSoundValue, this.save.muted ? '关闭' : '开启')
    const musicPercent = Math.round(this.save.settings.musicVolume * 100)
    const sfxPercent = Math.round(this.save.settings.sfxVolume * 100)
    if (Number(dom.settingsMusicVolume.value) !== musicPercent) dom.settingsMusicVolume.value = String(musicPercent)
    if (Number(dom.settingsSfxVolume.value) !== sfxPercent) dom.settingsSfxVolume.value = String(sfxPercent)
    setText(dom.settingsMusicVolumeValue, `${musicPercent}%`)
    setText(dom.settingsSfxVolumeValue, `${sfxPercent}%`)
    const aimGuideMode = this.save.settings.aimGuideMode
    const aimGuideLabel = AIM_GUIDE_MODE_LABELS[aimGuideMode] || AIM_GUIDE_MODE_LABELS.standard
    setText(dom.settingsAimValue, aimGuideLabel)
    setText(dom.settingsShakeValue, this.save.settings.shake ? '开启' : '关闭')
    setText(dom.settingsMotionValue, prefersReducedMotion ? '已减弱' : '完整动态')
    setAttribute(dom.settingsMotionButton, 'aria-pressed', prefersReducedMotion)
    setText(dom.settingsStoryValue, this.save.settings.skipStory ? '跳过' : '播放')
    setText(dom.fullscreenValue, document.fullscreenElement ? '退出' : '进入')
    setAttribute(dom.settingsSoundButton, 'aria-pressed', !this.save.muted)
    dom.settingsAimButton.dataset.mode = aimGuideMode
    setAttribute(dom.settingsAimButton, 'aria-label', `弹道模式：${aimGuideLabel}。点击切换`)
    setAttribute(dom.settingsShakeButton, 'aria-pressed', this.save.settings.shake)
    setAttribute(dom.settingsStoryButton, 'aria-pressed', this.save.settings.skipStory)
    setAttribute(dom.fullscreenButton, 'aria-pressed', Boolean(document.fullscreenElement))
    if (QA_MODE) {
      setText(dom.buildChipTitle, '测试营地')
      setText(dom.buildChipStatus, '临时模式 · 不写入记录')
      setText(dom.saveStatusNote, '测试模式不保存战绩')
    } else if (!storageWritable) {
      setText(dom.buildChipTitle, '存档不可写')
      setText(dom.buildChipStatus, '请检查浏览器隐私设置')
      setText(dom.saveStatusNote, '当前记录可能无法保存')
    } else {
      setText(dom.buildChipTitle, '本地存档')
      setText(dom.buildChipStatus, '关卡起点 · 自动封存')
      setText(dom.saveStatusNote, '战绩、设置与当前远征已保存')
    }
    setText(dom.pauseTitle, this.state === 'play' ? '远征已暂停' : '远征设置')
    setText(dom.pauseSubtitle, this.state === 'play'
      ? '物理与计时已冻结，本关随时可继续'
      : '战绩与偏好会自动保存在这台设备')
    setText(dom.resumeButton, this.state === 'play' ? '继续远征' : '返回')
    dom.settingsRestartButton.hidden = this.state !== 'play'
    dom.returnMenuButton.hidden = !['story', 'talent', 'play', 'between'].includes(this.state)
    let status = '当前位于远征营地主菜单。'
    if (this.state === 'story') status = `剧情：${this.levelLabel()}。`
    else if (this.state === 'talent') status = `正在为${this.levelLabel()}选择天赋。`
    else if (this.state === 'play') {
      const birdName = (BIRD_STYLE[this.currentBird?.type] || {}).name || '无'
      if (this.keyboardAiming && this.currentBird && !this.currentBird.launched) {
        const pullX = SLING_X - this.currentBird.x
        const pullY = this.currentBird.y - ANCHOR_Y
        const strength = Math.round(Math.hypot(pullX, pullY) / MAX_PULL * 100)
        const angle = Math.round(Math.atan2(pullY, Math.max(0.001, pullX)) * 180 / Math.PI)
        status = `键盘瞄准，力度${strength}%，发射角${angle}度。按 Enter 发射。`
      } else {
        const nextBirds = this.shotQueue.slice(0, 3).map((type) => BIRD_STYLE[type]?.name || '橡宝')
        const boss = this.squirrels.find((squirrel) => squirrel.isBoss)
        const bossHealth = boss ? `，首领生命${boss.hp}/${boss.maxHp}` : ''
        status = `${this.levelLabel()}，剩余${this.shotsRemaining}只橡果，敌人${this.squirrels.length}只${bossHealth}，当前橡果${birdName}${nextBirds.length ? `，后续${nextBirds.join('、')}` : ''}。`
      }
    } else if (this.state === 'between') status = `${this.levelLabel()}已完成，正在前往下一关。`
    else if (this.state === 'over') status = `远征受阻，本局得分${this.score}。`
    else if (this.state === 'victory') status = `主线通关，最终得分${this.score}。`
    else if (this.state === 'special-victory') status = `${this.modeLabel()}已通关，章节得分${this.score}。`
    else if (this.state === 'special-select') status = '正在选择主线通关后的秘境篇章。'
    else if (this.state === 'exit') status = '远征记录已保存，可以安全关闭标签页。'
    if (this.settingsOpen) status = `${this.state === 'play' ? '游戏已暂停，' : ''}设置已打开。`
    if (this.discoveryOpen && this.activeDiscovery) status = this.discoveryFromArchive
      ? `正在查看图鉴档案：${DISCOVERIES[this.activeDiscovery]?.title || '远征发现'}。`
      : `新图鉴：${DISCOVERIES[this.activeDiscovery]?.title || '远征发现'}。`
    if (this.talentLibraryOpen) status = `天赋档案已打开，本局已获得${ownedTalentIds.length}项天赋。`
    if (this.emergencySupplyOpen) status = `橡果已耗尽。持有${this.save.eggs}枚金橡果，可选择一次紧急补给或结束本局。`
    if (dom.statusText.textContent !== status) dom.statusText.textContent = status
    if (QA_MODE && this.fixedTick % 5 === 0) {
      dom.canvas.dataset.qaDiagnostics = JSON.stringify({
        fixedTick: this.fixedTick,
        state: this.state,
        mode: this.mode,
        level: this.level,
        birdLifecycle: this.birds.map((bird) => ({
          id: bird.id,
          type: bird.type,
          age: bird.age,
          x: round3(bird.x),
          y: round3(bird.y),
          vx: round3(bird.vx),
          vy: round3(bird.vy),
          groundedStillTicks: bird.stillTicks,
          groundedTicks: bird.groundContactTicks,
          structureStillTicks: bird.structureStillTicks,
          platformStillTicks: bird.platformStillTicks,
          stalledTicks: bird.stalledTicks,
          outsideWorldTicks: bird.outsideWorldTicks,
          reason: bird.lifecycleReason,
        })),
        audio: this.audio.getStatus(),
        aimGuide: {
          mode: this.save.settings.aimGuideMode,
          enabled: this.save.settings.aimGuideMode !== 'off',
          windAware: this.save.settings.aimGuideMode === 'beginner',
          active: Boolean(this.save.settings.aimGuideMode !== 'off'
            && (this.dragging || this.keyboardAiming) && this.currentBird),
          metrics: aimGuideVisualMetrics(this.camera.zoom),
        },
        architecture: this.architectureBlueprint?.buildingPlan ? {
          formId: this.architectureBlueprint.buildingPlan.formId,
          appliedComplexity: this.architectureBlueprint.buildingPlan.appliedComplexity,
          envelopePieceCount: this.architectureBlueprint.buildingPlan.envelopePieceCount,
          physicalGrammar: this.architectureBlueprint.buildingPlan.physicalLayout?.grammar || null,
          physicalModuleKinds: [...new Set(this.blocks
            .map((block) => block.physicalModuleKind)
            .filter(Boolean))],
          physicalModuleCount: this.blocks
            .filter((block) => block.physicalModuleId).length,
          silhouetteIntegrity: round3(this.architectureSilhouetteIntegrity()),
          roofShapes: [...new Set(this.blocks
            .filter((block) => block.role === 'roof')
            .map((block) => block.architecturalShape)
            .filter(Boolean))],
          towerForms: [...new Set(this.blocks
            .map((block) => block.completeBuildingTowerForm)
            .filter(Boolean))],
          windMechanismBlocks: this.blocks
            .filter((block) => block.role === 'roof'
              && /windmill-head|wind-engine-tower/u.test(block.completeBuildingTowerForm || ''))
            .map((block) => ({
              id: block.id,
              x: round3(block.x),
              y: round3(block.y),
              width: round3(block.width),
              shape: block.architecturalShape || null,
            })),
          connectionBlocks: this.blocks
            .filter((block) => block.moduleKind === 'complete-building-connection')
            .map((block) => ({
              id: block.id,
              kind: block.connectionKind || null,
              supportTowers: [...(block.supportTowers || [])],
              x: round3(block.x),
              y: round3(block.y),
              width: round3(block.width),
              height: round3(block.height),
            })),
        } : null,
        jointCount: this.structureJoints.filter((joint) => !joint.broken).length,
        ...this.getCollisionDiagnostics(),
      })
    }
  }

  render() {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height)
    this.drawBackground()
    this.drawWindField(false)
    ctx.save()
    ctx.translate(VIEWPORT.width / 2 + this.camera.shakeX, VIEWPORT.height / 2 + this.camera.shakeY)
    ctx.scale(this.camera.zoom, this.camera.zoom)
    ctx.translate(-this.camera.x, -this.camera.y)
    this.drawGround()
    this.drawRoyalCitadelBackdrop()
    this.drawBirdQueue()
    this.drawSling(false)
    for (const platform of this.platforms) this.drawPlatform(platform)
    for (const block of this.blocks) this.drawBlock(block)
    // Authored mechanisms use the blueprint's normalized anchors and are
    // painted exactly once. Older buildings without a silhouette contract
    // retain the block-local wind-machine fallback.
    const drewAuthoredMechanisms = this.drawAuthoredBuildingMechanisms()
    if (!drewAuthoredMechanisms) {
      for (const block of this.blocks) this.drawCompleteBuildingMechanism(block)
    }
    this.drawStructureJointHardware()
    this.drawObjectiveBeacons()
    if (this.goldenEgg) this.drawEgg(this.goldenEgg)
    for (const decoy of this.decoys) this.drawDecoy(decoy)
    for (const squirrel of this.squirrels) this.drawSquirrel(squirrel)
    this.drawTrail()
    this.drawVineTargetPreview()
    this.drawTethers()
    for (const flame of this.fireTrail) this.drawFlame(flame)
    for (const bird of this.birds) this.drawBird(bird)
    if (this.currentBird && !this.currentBird.launched) {
      const loadedScale = this.loadedBirdDisplayScale()
      this.drawLoadedBirdFocus(this.currentBird, loadedScale)
      this.drawBird(this.currentBird, { scale: loadedScale })
    }
    for (const particle of this.particles) this.drawParticle(particle)
    this.drawSpecialMapOverlay()
    if (this.save.settings.aimGuideMode !== 'off'
      && (this.dragging || this.keyboardAiming) && this.currentBird) this.drawAimGuide(this.currentBird)
    if (this.windTraceGuideProfile().enabled
      && (this.dragging || this.keyboardAiming) && this.currentBird) {
      this.drawWindTraceGuide(this.currentBird)
    }
    this.drawSling(true)
    ctx.restore()
    this.drawWindField(true)
    this.drawVignette()
  }

  drawObjectiveBeacons() {
    if (this.mode !== 'special') return
    const markers = objectiveBeacons({
      blocks: this.blocks, squirrels: this.squirrels, platforms: this.platforms,
      objective: this.specialObjective, challengeState: this.specialChallengeState,
    })
    const scale = 1 / Math.max(0.55, this.camera.zoom)
    ctx.save()
    for (const marker of markers) {
      ctx.save()
      ctx.translate(marker.x, marker.y)
      ctx.scale(scale, scale)
      ctx.fillStyle = marker.active ? '#f4d084' : '#dbe1d5'
      ctx.strokeStyle = marker.active ? '#674627' : '#54675d'
      ctx.lineWidth = 1.7
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#203c30'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.fillText(marker.label, 0, 0.5)
      if (marker.weakPoint) {
        ctx.beginPath(); ctx.moveTo(-13, -5); ctx.lineTo(-16, 0); ctx.lineTo(-13, 5)
        ctx.moveTo(13, -5); ctx.lineTo(16, 0); ctx.lineTo(13, 5); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  }

  drawDecoy(decoy) {
    const revealTicks = Math.max(1, decoy.revealAfterImpactTicks || 24)
    const elapsed = this.specialFirstImpactTick === null ? 0 : this.mapPulseTick - this.specialFirstImpactTick
    if (elapsed >= revealTicks) return
    const roster = SPECIAL_SQUIRREL_BY_TYPE[decoy.variant]
    const size = decoy.radius ? decoy.radius / 0.78 : (roster?.stats.size || 16)
    const ghost = {
      id: decoy.id || `mirror-${decoy.variant || 'normal'}`,
      x: decoy.x,
      y: decoy.y,
      size,
      variant: decoy.variant || 'normal',
      hp: 1,
      maxHp: 1,
      isBoss: false,
      asleep: false,
      chilledTicks: 0,
      shieldHp: decoy.variant === 'shield' ? SPECIAL_SQUIRREL_BY_TYPE.shield.ability.charges : 0,
      behaviorTick: this.mapPulseTick,
      bossPhaseStage: 0,
    }
    ctx.save()
    ctx.globalAlpha = (decoy.opacity || 0.52) * (1 - elapsed / revealTicks)
    ctx.translate(decoy.x, 0)
    ctx.scale(-1, 1)
    ctx.translate(-decoy.x, 0)
    this.drawSquirrel(ghost)
    ctx.translate(decoy.x, 0)
    ctx.scale(-1, 1)
    ctx.translate(-decoy.x, 0)
    ctx.strokeStyle = this.specialTheme?.colors?.accent || '#7a71d8'
    ctx.lineWidth = Math.max(1.2, size * 0.075)
    ctx.setLineDash([5, 5])
    for (const offset of [-0.62, 0.08, 0.58]) {
      ctx.beginPath(); ctx.moveTo(decoy.x - size * 1.35, decoy.y + size * offset)
      ctx.lineTo(decoy.x + size * 1.55, decoy.y + size * (offset - 0.08)); ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  drawSpecialMapOverlay() {
    if (this.mode !== 'special') return
    const updraft = this.specialRule('wind-zone')
    if (updraft) {
      const lanes = updraft.parameters.lanes || 3
      const width = updraft.parameters.width || 82
      ctx.save(); ctx.globalAlpha = 0.12
      for (let lane = 0; lane < lanes; lane += 1) {
        const x = 600 + lane * 190
        const gradient = ctx.createLinearGradient(x, GROUND_Y, x, 150)
        gradient.addColorStop(0, 'rgba(255,255,255,0)')
        gradient.addColorStop(1, this.specialTheme?.colors?.accent || '#d7ecff')
        ctx.fillStyle = gradient
        ctx.fillRect(x - width / 2, 150, width, GROUND_Y - 150)
      }
      ctx.restore()
    }
    if (this.specialWaterY !== null) {
      ctx.save()
      ctx.globalAlpha = 0.34
      ctx.fillStyle = this.specialTheme?.colors?.accent || '#78c8c0'
      ctx.fillRect(WORLD_MIN_X - 200, this.specialWaterY, WORLD_MAX_X - WORLD_MIN_X + 400, 720 - this.specialWaterY)
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = '#e9fff8'; ctx.lineWidth = 3
      ctx.beginPath()
      for (let x = WORLD_MIN_X - 200; x <= WORLD_MAX_X + 200; x += 18) {
        const y = this.specialWaterY + Math.sin((x + this.fixedTick * 2) * 0.045) * 3
        if (x === WORLD_MIN_X - 200) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  drawWindField(foreground = false) {
    if (this.state !== 'play') return
    const wind = this.windPresentation()
    const direction = wind.value < 0 ? -1 : 1
    const strength = clamp(wind.speed / MAX_WIND_MAGNITUDE, 0, 1)
    const phase = prefersReducedMotion ? 0
      : this.mapPulseTick * (0.7 + wind.level * 1.55 + wind.speed * 18) * direction
    const wrap = VIEWPORT.width + 260
    ctx.save()
    ctx.lineCap = 'round'

    if (wind.level === 0) {
      if (!foreground) {
        ctx.fillStyle = 'rgba(250,243,223,.25)'
        for (let index = 0; index < 7; index += 1) {
          const x = 75 + (index * 139) % 790
          const y = 88 + (index * 71) % 330
          const floatY = prefersReducedMotion ? 0 : Math.sin(this.mapPulseTick * 0.025 + index) * 3
          ctx.beginPath(); ctx.arc(x, y + floatY, index % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.restore()
      return
    }

    if (!foreground) {
      const streakCount = 12 + wind.level * 9
      ctx.strokeStyle = `rgba(244,248,231,${0.17 + strength * 0.17})`
      ctx.lineWidth = 1.1 + strength * 1.55
      for (let index = 0; index < streakCount; index += 1) {
        const raw = index * 137 + phase * (0.72 + (index % 4) * 0.13)
        const x = ((raw % wrap) + wrap) % wrap - 130
        const y = 48 + (index * 67) % 410
        const length = 28 + strength * 58 + (index % 5) * 8
        const bend = prefersReducedMotion ? 0 : Math.sin(this.mapPulseTick * 0.04 + index) * (2 + wind.level)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x - direction * length * 0.48, y + bend,
          x - direction * length, y + bend * 0.35)
        ctx.stroke()
      }
      if (!prefersReducedMotion && strength >= 0.52) {
        const gustRaw = phase * 2.15
        const gustX = ((gustRaw % wrap) + wrap) % wrap - 130
        const gustY = 118 + (Math.floor(this.mapPulseTick / 96) * 83) % 290
        ctx.strokeStyle = `rgba(220,244,239,${0.12 + strength * 0.13})`
        ctx.lineWidth = 12 + strength * 12
        ctx.beginPath()
        ctx.moveTo(gustX, gustY)
        ctx.lineTo(gustX - direction * (150 + strength * 105), gustY + direction * 5)
        ctx.stroke()
        ctx.strokeStyle = `rgba(255,250,225,${0.24 + strength * 0.16})`
        ctx.lineWidth = 2.2 + strength * 1.8
        ctx.beginPath()
        ctx.moveTo(gustX + direction * 8, gustY)
        ctx.lineTo(gustX - direction * (162 + strength * 112), gustY + direction * 5)
        ctx.stroke()
      }
    } else {
      const leafCount = 2 + wind.level * 2
      for (let index = 0; index < leafCount; index += 1) {
        const raw = index * 233 + phase * (1.2 + (index % 3) * 0.18)
        const x = ((raw % wrap) + wrap) % wrap - 130
        const y = 285 + (index * 53) % 205 + Math.sin(this.mapPulseTick * 0.09 + index) * 14
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(direction * (0.25 + Math.sin(this.mapPulseTick * 0.12 + index) * 0.55))
        ctx.fillStyle = index % 2 ? 'rgba(121,146,82,.55)' : 'rgba(214,170,85,.48)'
        ctx.beginPath(); ctx.ellipse(0, 0, 5 + wind.level, 2.2, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
    }
    ctx.restore()
  }

  drawBackground() {
    if (this.specialTheme && this.mode === 'special') {
      this.drawSpecialBackground()
      return
    }
    if (this.mainEnvironmentTheme
      && (this.mode === 'main' || this.mode === 'endless')
      && this.state === 'play') {
      this.drawMainEnvironmentBackground(this.mainEnvironmentTheme)
      return
    }
    const sky = this.currentSky
    const top = mixColor(sky, 0x789fab, 0.23)
    const bottom = mixColor(sky, 0xd8ba96, 0.42)
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height)
    gradient.addColorStop(0, cssColor(top))
    gradient.addColorStop(0.62, cssColor(mixColor(sky, bottom, 0.52)))
    gradient.addColorStop(1, cssColor(bottom))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height)

    const dark = (((sky >> 16) & 255) + ((sky >> 8) & 255) + (sky & 255)) < 280
    if (dark) {
      ctx.fillStyle = 'rgba(250,243,223,.62)'
      for (let index = 0; index < 34; index += 1) {
        const x = (index * 137 + 41) % VIEWPORT.width
        const y = 22 + (index * 67) % 230
        ctx.fillRect(x, y, index % 5 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1)
      }
    }
    const sunX = 724
    const sunY = 92 + (prefersReducedMotion ? 0 : Math.sin(this.fixedTick * 0.012) * 3)
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 62)
    glow.addColorStop(0, dark ? 'rgba(250,243,223,.9)' : 'rgba(255,221,145,.9)')
    glow.addColorStop(1, 'rgba(255,224,120,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(sunX, sunY, 62, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = dark ? '#f8e9bb' : '#f5c96f'
    ctx.beginPath()
    ctx.arc(sunX, sunY, dark ? 21 : 25, 0, Math.PI * 2)
    ctx.fill()

    const hasPhysicalWind = Math.abs(this.windX) >= 0.005
    const ambientWindDirection = hasPhysicalWind ? Math.sign(this.windX) : 0
    const ambientWindSpeed = 0.035 + Math.abs(this.windX) * 2.2
    const drift = prefersReducedMotion ? 0
      : hasPhysicalWind
        ? this.mapPulseTick * ambientWindSpeed * ambientWindDirection
        : Math.sin(this.mapPulseTick * 0.006) * 5
    ctx.fillStyle = dark ? 'rgba(222,232,232,.12)' : 'rgba(250,243,223,.27)'
    for (let index = 0; index < 5; index += 1) {
      const x = ((index * 205 + drift) % 1120) - 110
      const y = 80 + (index % 3) * 58
      ctx.beginPath()
      ctx.ellipse(x, y, 48, 14, 0, 0, Math.PI * 2)
      ctx.ellipse(x + 29, y - 8, 31, 18, 0, 0, Math.PI * 2)
      ctx.ellipse(x - 30, y - 5, 27, 13, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const farOffset = -((this.camera.x - 450) * 0.025) % 180
    ctx.fillStyle = dark ? '#243b3a' : '#567260'
    ctx.beginPath()
    ctx.moveTo(-120, 405)
    ctx.bezierCurveTo(30 + farOffset, 310, 150 + farOffset, 365, 270 + farOffset, 322)
    ctx.bezierCurveTo(410 + farOffset, 270, 520 + farOffset, 360, 650 + farOffset, 308)
    ctx.bezierCurveTo(760 + farOffset, 270, 850 + farOffset, 335, 1020, 292)
    ctx.lineTo(900, 600)
    ctx.lineTo(0, 600)
    ctx.fill()

    ctx.fillStyle = dark ? 'rgba(30,52,46,.74)' : 'rgba(64,96,76,.78)'
    ctx.beginPath()
    ctx.moveTo(-80, 445)
    ctx.bezierCurveTo(90, 370, 190, 448, 350, 382)
    ctx.bezierCurveTo(515, 320, 620, 445, 785, 370)
    ctx.bezierCurveTo(850, 342, 930, 360, 980, 350)
    ctx.lineTo(900, 600)
    ctx.lineTo(0, 600)
    ctx.fill()

    const treeOffset = -((this.camera.x - 450) * 0.055) % 82
    ctx.fillStyle = dark ? '#12271f' : '#294b38'
    for (let x = -90 + treeOffset; x < 1010; x += 44) {
      const height = 38 + (Math.abs(Math.round(x * 7)) % 42)
      const baseY = 465
      ctx.fillRect(x - 2, baseY - height * 0.32, 4, height * 0.45)
      for (let tier = 0; tier < 3; tier += 1) {
        const y = baseY - height + tier * height * 0.22
        const half = height * (0.24 + tier * 0.08)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - half, y + height * 0.48)
        ctx.lineTo(x + half, y + height * 0.48)
        ctx.closePath()
        ctx.fill()
      }
    }

    const haze = ctx.createLinearGradient(0, 330, 0, 500)
    haze.addColorStop(0, 'rgba(234,217,180,0)')
    haze.addColorStop(1, dark ? 'rgba(164,188,173,.08)' : 'rgba(234,217,180,.18)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 320, VIEWPORT.width, 190)

    ctx.globalAlpha = 0.055
    ctx.fillStyle = ART.ivory
    for (let index = 0; index < 76; index += 1) {
      const x = (index * 83 + 17) % VIEWPORT.width
      const y = (index * 47 + 29) % VIEWPORT.height
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.globalAlpha = 1
  }

  drawMainEnvironmentBackground(theme) {
    const { palette, weather, environmentElements, architecture } = theme
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height)
    gradient.addColorStop(0, palette.skyTop)
    gradient.addColorStop(0.62, palette.skyBottom)
    gradient.addColorStop(1, palette.horizonGlow)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height)

    const night = /night|moon|frost-night/u.test(weather.kind)
    const celestialX = theme.level <= 2 ? 690 : 720
    const celestialY = 82 + (prefersReducedMotion ? 0 : Math.sin(this.mapPulseTick * 0.012) * 3)
    const glow = ctx.createRadialGradient(celestialX, celestialY, 3, celestialX, celestialY, 68)
    glow.addColorStop(0, night ? 'rgba(244,239,212,.76)' : `${palette.horizonGlow}cc`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(celestialX, celestialY, 68, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = night ? '#eee7cd' : palette.horizonGlow
    ctx.beginPath(); ctx.arc(celestialX, celestialY, night ? 20 : 25, 0, Math.PI * 2); ctx.fill()
    if (night) {
      ctx.fillStyle = palette.skyTop
      ctx.beginPath(); ctx.arc(celestialX + 8, celestialY - 6, 20, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(246,241,217,.58)'
      for (let index = 0; index < 28; index += 1) {
        const x = (index * 137 + theme.level * 29) % VIEWPORT.width
        const y = 24 + (index * 61) % 220
        ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1)
      }
    }

    const hasPhysicalWind = Math.abs(this.windX) >= 0.005
    const weatherMotion = this.mapPulseTick * (0.02 + weather.ambientMotion * 0.16)
    const motion = prefersReducedMotion ? 0
      : hasPhysicalWind ? weatherMotion * Math.sign(this.windX) : Math.sin(weatherMotion * 0.025) * 8
    if (hasPhysicalWind && weather.windVisual > 0.28) {
      ctx.strokeStyle = `${palette.ambient}${Math.round((0.08 + weather.windVisual * 0.18) * 255).toString(16).padStart(2, '0')}`
      ctx.lineWidth = 1 + weather.windVisual * 1.5
      for (let index = 0; index < 9 + Math.round(weather.windVisual * 8); index += 1) {
        const x = ((index * 127 + motion * 14) % 1080) - 90
        const y = 48 + (index * 47) % 330
        const length = 28 + weather.windVisual * 72
        ctx.beginPath(); ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x - length * 0.5, y + Math.sin(index + motion) * 4, x - length, y)
        ctx.stroke()
      }
    }

    const farOffset = -((this.camera.x - 450) * 0.022) % 210
    ctx.fillStyle = palette.mountainFar
    ctx.beginPath(); ctx.moveTo(-120, 410)
    ctx.bezierCurveTo(40 + farOffset, 285, 190 + farOffset, 375, 340 + farOffset, 300)
    ctx.bezierCurveTo(500 + farOffset, 235, 630 + farOffset, 360, 790 + farOffset, 285)
    ctx.bezierCurveTo(850 + farOffset, 260, 930, 300, 1040, 270)
    ctx.lineTo(980, 560); ctx.lineTo(-80, 560); ctx.closePath(); ctx.fill()

    ctx.fillStyle = palette.mountainNear
    ctx.beginPath(); ctx.moveTo(-90, 458)
    ctx.bezierCurveTo(100, 360, 240, 455, 390, 382)
    ctx.bezierCurveTo(545, 318, 675, 450, 825, 365)
    ctx.bezierCurveTo(875, 340, 930, 360, 990, 345)
    ctx.lineTo(970, 560); ctx.lineTo(-80, 560); ctx.closePath(); ctx.fill()

    for (let elementIndex = 0; elementIndex < environmentElements.length; elementIndex += 1) {
      const element = environmentElements[elementIndex]
      const kind = element.kind
      const drift = motion * element.motion * (1 + element.parallax)
      ctx.save()
      ctx.globalAlpha = element.opacity
      ctx.fillStyle = element.color
      ctx.strokeStyle = element.color

      if (/capital|citadel|rampart|keep|throne|granary|gate|redoubt|wall|quarry|yard|mill|lift|elevator/u.test(kind)) {
        const royal = /capital|citadel|rampart|keep|throne|royal|redoubt/u.test(kind)
        const count = royal ? 5 : 3
        const baseY = 420
        const startX = royal ? 430 : 520
        const span = royal ? 92 : 112
        for (let index = 0; index < count; index += 1) {
          const width = (royal ? 54 : 42) * element.scale
          const height = (royal ? 105 + (index % 3) * 46 : 62 + (index % 2) * 36) * element.scale
          const x = startX + index * span - ((this.camera.x - 450) * element.parallax * 0.04)
          ctx.fillRect(x - width / 2, baseY - height, width, height)
          if (royal || index % 2 === 0) {
            ctx.beginPath(); ctx.moveTo(x - width * 0.65, baseY - height)
            ctx.lineTo(x, baseY - height - width * 0.55)
            ctx.lineTo(x + width * 0.65, baseY - height); ctx.closePath(); ctx.fill()
          }
          if (royal) {
            ctx.fillRect(x - width * 0.7, baseY - height - 7, width * 0.22, 10)
            ctx.fillRect(x + width * 0.48, baseY - height - 7, width * 0.22, 10)
          }
        }
      } else if (/pine|spruce|oak|canopy|ridge|slope/u.test(kind)) {
        const count = Math.max(5, Math.round(8 + element.density * 12))
        for (let index = 0; index < count; index += 1) {
          const x = ((index * 79 + drift) % 1040) - 70
          const height = (42 + (index % 4) * 16) * element.scale
          const baseY = 455
          ctx.fillRect(x - 2, baseY - height * 0.25, 4, height * 0.35)
          for (let tier = 0; tier < 3; tier += 1) {
            const y = baseY - height + tier * height * 0.22
            const half = height * (0.22 + tier * 0.08)
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - half, y + height * 0.45)
            ctx.lineTo(x + half, y + height * 0.45); ctx.closePath(); ctx.fill()
          }
        }
      } else if (/banner|standard|pennant|flag/u.test(kind)) {
        const count = Math.max(2, Math.round(2 + element.density * 6))
        ctx.lineWidth = 2
        for (let index = 0; index < count; index += 1) {
          const x = 500 + index * 92
          const y = 330 - (index % 2) * 32
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 68 * element.scale); ctx.stroke()
          const lean = hasPhysicalWind ? Math.sign(this.windX) * (14 + weather.windVisual * 18) : 0
          ctx.beginPath(); ctx.moveTo(x, y - 64 * element.scale)
          ctx.lineTo(x + lean, y - 55 * element.scale); ctx.lineTo(x, y - 43 * element.scale)
          ctx.closePath(); ctx.fill()
        }
      } else if (/bridge|cable|ramp|viaduct|arcade|wheel|gear/u.test(kind)) {
        ctx.lineWidth = Math.max(2, 5 * element.scale)
        ctx.beginPath(); ctx.moveTo(430, 360); ctx.quadraticCurveTo(650, 270 - drift * 0.04, 910, 350); ctx.stroke()
        if (/wheel|gear/u.test(kind)) {
          for (let index = 0; index < 3; index += 1) {
            ctx.beginPath(); ctx.arc(570 + index * 120, 378, 24 * element.scale, 0, Math.PI * 2); ctx.stroke()
          }
        }
      } else if (/cloud|smoke|mist|fog/u.test(kind)) {
        const count = Math.max(3, Math.round(3 + element.density * 6))
        for (let index = 0; index < count; index += 1) {
          const x = ((index * 183 + drift * 4) % 1100) - 100
          const y = 78 + (index % 3) * 70
          ctx.beginPath(); ctx.ellipse(x, y, 54 * element.scale, 14 * element.scale, 0, 0, Math.PI * 2)
          ctx.ellipse(x + 30 * element.scale, y - 7, 33 * element.scale, 18 * element.scale, 0, 0, Math.PI * 2); ctx.fill()
        }
      } else if (!/moon|sunrise|light-ray/u.test(kind)) {
        const count = Math.max(5, Math.round(8 + element.density * 22))
        for (let index = 0; index < count; index += 1) {
          const x = ((index * 151 + drift * 8) % 980) - 40
          const y = 115 + (index * 71) % 340
          ctx.beginPath(); ctx.ellipse(x, y, 2.4 * element.scale, 1.2 * element.scale, drift * 0.02, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.restore()
    }

    if (environmentElements.some((element) => /light-ray/u.test(element.kind))) {
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = palette.horizonGlow
      ctx.beginPath(); ctx.moveTo(640, 0); ctx.lineTo(780, 0); ctx.lineTo(650, 440); ctx.lineTo(500, 440); ctx.closePath(); ctx.fill(); ctx.restore()
    }

    const haze = ctx.createLinearGradient(0, 310, 0, 500)
    haze.addColorStop(0, 'rgba(255,255,255,0)')
    haze.addColorStop(1, `${palette.ambient}1f`)
    ctx.fillStyle = haze
    ctx.fillRect(0, 300, VIEWPORT.width, 210)

    ctx.save()
    ctx.globalAlpha = 0.78
    ctx.fillStyle = palette.ambient
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textAlign = 'right'
    const environmentLabel = this.mode === 'endless'
      ? `无尽地带 · ${theme.sceneName}`
      : `${theme.chapterName} · ${theme.sceneName}`
    ctx.fillText(environmentLabel, VIEWPORT.width - 18, 576)
    ctx.restore()
  }

  drawSpecialBackground() {
    const campaign = getSpecialCampaign(this.specialCampaignId)
    const stage = campaign ? getSpecialStage(campaign.id, this.specialStageNumber || this.level) : null
    const scene = this.specialBackgroundScene || buildSpecialBackgroundScene(campaign, stage)
    if (!scene) return
    const colors = scene.colors
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height)
    gradient.addColorStop(0, colors.skyTop)
    gradient.addColorStop(0.64, colors.skyBottom)
    gradient.addColorStop(1, colors.terrain)
    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height)
    const hasPhysicalWind = Math.abs(this.windX) >= 0.005
    const ambientWindDirection = hasPhysicalWind ? Math.sign(this.windX) : 0
    const ambientWindSpeed = 0.035 + Math.abs(this.windX) * 2.2
    const drift = prefersReducedMotion ? 0
      : hasPhysicalWind
        ? this.mapPulseTick * ambientWindSpeed * ambientWindDirection
        : Math.sin(this.mapPulseTick * 0.006) * 5

    if (scene.silhouette === 'frozen-clock-spire') this.drawPolarSpecialBackground(scene, drift)
    else if (scene.silhouette === 'drowned-harbor-arcade') this.drawTideSpecialBackground(scene, drift)
    else if (scene.silhouette === 'silver-trunk-labyrinth') this.drawMirrorSpecialBackground(scene, drift)
    else if (scene.silhouette === 'root-cavern-vault') this.drawRootSpecialBackground(scene, drift)
    else if (scene.silhouette === 'suspended-skyport') this.drawStormSpecialBackground(scene, drift)

    this.drawSpecialStageProgress(scene)

    // A very soft central wash suppresses high-frequency background detail in
    // the shared projectile/target band without hiding the chapter landmark.
    ctx.fillStyle = scene.readability.combatWash
    ctx.fillRect(72, 112, 722, 345)
    ctx.globalAlpha = 1
    const haze = ctx.createLinearGradient(0, 260, 0, 500)
    haze.addColorStop(0, 'rgba(255,255,255,0)')
    haze.addColorStop(1, `rgba(255,255,255,${scene.weather === 'thundercloud-and-rain' ? scene.parameters.depthFog ?? 0.3 : 0.1})`)
    ctx.fillStyle = haze
    ctx.fillRect(0, 250, VIEWPORT.width, 260)

    ctx.globalAlpha = 0.58
    ctx.fillStyle = colors.light
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${scene.locationLabel} · ${scene.stageTitle}`, VIEWPORT.width - 18, 497)
    ctx.restore()
  }

  drawSpecialStageProgress(scene) {
    const progress = clamp((Number(scene.stageNumber) - 1) / 3, 0, 1)
    if (progress <= 0) return
    ctx.save()
    if (scene.silhouette === 'frozen-clock-spire') {
      const dawn = ctx.createRadialGradient(90, 310, 4, 90, 310, 260)
      dawn.addColorStop(0, `rgba(255,217,143,${0.12 + progress * 0.24})`)
      dawn.addColorStop(1, 'rgba(255,217,143,0)')
      ctx.fillStyle = dawn; ctx.fillRect(0, 120, 390, 330)
      ctx.strokeStyle = `rgba(246,243,210,${0.18 + progress * 0.2})`; ctx.lineWidth = 2
      for (let index = 0; index < Math.ceil(progress * 3); index += 1) {
        ctx.beginPath(); ctx.arc(112, 318, 46 + index * 22, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
      }
    } else if (scene.silhouette === 'drowned-harbor-arcade') {
      const tideTop = 452 - progress * 72
      const tide = ctx.createLinearGradient(0, tideTop, 0, 510)
      tide.addColorStop(0, `rgba(108,212,213,${0.08 + progress * 0.09})`)
      tide.addColorStop(1, `rgba(18,74,91,${0.2 + progress * 0.12})`)
      ctx.fillStyle = tide; ctx.fillRect(0, tideTop, VIEWPORT.width, 510 - tideTop)
      ctx.strokeStyle = `rgba(219,252,245,${0.15 + progress * 0.16})`; ctx.lineWidth = 2
      for (let wave = 0; wave < 1 + Math.ceil(progress * 2); wave += 1) {
        ctx.beginPath()
        for (let x = -20; x <= VIEWPORT.width + 20; x += 30) {
          const y = tideTop + wave * 24 + Math.sin(x * 0.035 + wave) * 6
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    } else if (scene.silhouette === 'silver-trunk-labyrinth') {
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + progress * 0.2})`; ctx.lineWidth = 2
      const crackCount = 2 + Math.ceil(progress * 5)
      for (let crack = 0; crack < crackCount; crack += 1) {
        const x = 120 + crack * 118
        ctx.beginPath(); ctx.moveTo(x, 82 + (crack % 2) * 26)
        ctx.lineTo(x - 15, 152); ctx.lineTo(x + 10, 205); ctx.lineTo(x - 6, 270); ctx.stroke()
      }
    } else if (scene.silhouette === 'root-cavern-vault') {
      ctx.strokeStyle = `rgba(239,195,111,${0.12 + progress * 0.18})`; ctx.lineWidth = 2
      for (let stratum = 0; stratum < Math.ceil(progress * 4); stratum += 1) {
        const y = 92 + stratum * 58
        ctx.beginPath(); ctx.moveTo(0, y)
        for (let x = 40; x <= VIEWPORT.width; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.028 + stratum) * 9)
        ctx.stroke()
      }
      ctx.fillStyle = `rgba(15,10,17,${progress * 0.07})`; ctx.fillRect(0, 0, VIEWPORT.width, 510)
    } else if (scene.silhouette === 'suspended-skyport') {
      ctx.strokeStyle = `rgba(207,238,255,${0.12 + progress * 0.2})`; ctx.lineWidth = 2.2
      for (let chain = 0; chain < Math.ceil(progress * 4); chain += 1) {
        const x = 470 + chain * 95
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 42, 118, x - 8, 252); ctx.stroke()
      }
      const storm = ctx.createRadialGradient(760, 135, 8, 760, 135, 210)
      storm.addColorStop(0, `rgba(126,142,226,${progress * 0.13})`)
      storm.addColorStop(1, 'rgba(43,54,101,0)')
      ctx.fillStyle = storm; ctx.fillRect(510, 0, 390, 350)
    }
    ctx.restore()
  }

  drawPolarSpecialBackground(scene, drift) {
    const { colors, parameters, landmarkPlacement } = scene
    ctx.save()
    ctx.fillStyle = 'rgba(246,243,210,.72)'
    const starCount = Math.round(58 * (parameters.starDensity ?? 0.72))
    for (let index = 0; index < starCount; index += 1) {
      const x = (index * 113 + 31) % VIEWPORT.width
      const y = (index * 59 + 17) % 280
      ctx.fillRect(x, y, index % 6 ? 1 : 2, index % 6 ? 1 : 2)
    }
    const auroraShift = prefersReducedMotion ? 0
      : Math.sin(this.fixedTick * (parameters.auroraSpeed ?? 0.18) * 0.012) * 22
    for (let ribbon = 0; ribbon < 3; ribbon += 1) {
      ctx.strokeStyle = [colors.accent, '#8bb8ff', '#d79cff'][ribbon]
      ctx.globalAlpha = 0.16 + ribbon * 0.018
      ctx.lineWidth = 25 - ribbon * 5
      ctx.beginPath(); ctx.moveTo(-80 + auroraShift, 92 + ribbon * 38)
      ctx.bezierCurveTo(170 + auroraShift, 8 + ribbon * 52, 430 - auroraShift, 205 - ribbon * 18, 980, 62 + ribbon * 32); ctx.stroke()
    }

    ctx.globalAlpha = 0.36
    ctx.fillStyle = '#182847'
    ctx.beginPath(); ctx.moveTo(0, 415)
    for (let x = 0; x <= VIEWPORT.width; x += 72) {
      ctx.lineTo(x, 365 - Math.abs(Math.sin(x * 0.019)) * 72 - (x % 5) * 2)
    }
    ctx.lineTo(VIEWPORT.width, 510); ctx.lineTo(0, 510); ctx.closePath(); ctx.fill()
    ctx.globalAlpha = 0.24
    ctx.fillStyle = '#cfdeeb'
    ctx.beginPath(); ctx.moveTo(0, 438)
    for (let x = 0; x <= VIEWPORT.width; x += 90) ctx.lineTo(x, 395 - Math.abs(Math.sin(x * 0.014 + 1.2)) * 44)
    ctx.lineTo(VIEWPORT.width, 510); ctx.lineTo(0, 510); ctx.closePath(); ctx.fill()

    const scale = landmarkPlacement.scale * ((parameters.clockScale ?? 1.25) / 1.25)
    const clockX = landmarkPlacement.x * VIEWPORT.width
    const clockY = landmarkPlacement.y * VIEWPORT.height
    ctx.globalAlpha = landmarkPlacement.opacity
    ctx.fillStyle = '#0d1730'
    ctx.fillRect(clockX - 40 * scale, clockY + 52 * scale, 80 * scale, 235 * scale)
    ctx.beginPath(); ctx.moveTo(clockX - 54 * scale, clockY - 8 * scale)
    ctx.lineTo(clockX, clockY - 76 * scale); ctx.lineTo(clockX + 54 * scale, clockY - 8 * scale); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.arc(clockX, clockY + 25 * scale, 55 * scale, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = colors.light; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(clockX, clockY + 25 * scale, 40 * scale, 0, Math.PI * 2); ctx.stroke()
    for (let mark = 0; mark < 12; mark += 1) {
      const angle = mark / 12 * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(clockX + Math.cos(angle) * 33 * scale, clockY + 25 * scale + Math.sin(angle) * 33 * scale)
      ctx.lineTo(clockX + Math.cos(angle) * 38 * scale, clockY + 25 * scale + Math.sin(angle) * 38 * scale); ctx.stroke()
    }
    ctx.beginPath(); ctx.moveTo(clockX, clockY + 25 * scale); ctx.lineTo(clockX, clockY - 7 * scale)
    ctx.moveTo(clockX, clockY + 25 * scale); ctx.lineTo(clockX + 25 * scale, clockY + 39 * scale); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(clockX, clockY + 78 * scale); ctx.lineTo(clockX - 13 * scale, clockY + 190 * scale); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(clockX - 13 * scale, clockY + 196 * scale, 18 * scale, 9 * scale, -0.12, 0, Math.PI * 2); ctx.fillStyle = colors.accent; ctx.fill()
    for (const [offsetX, offsetY, radius] of [[-57, 90, 22], [55, 112, 28]]) {
      ctx.strokeStyle = 'rgba(143,240,223,.5)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(clockX + offsetX * scale, clockY + offsetY * scale, radius * scale, 0, Math.PI * 2); ctx.stroke()
    }

    ctx.globalAlpha = 0.27
    ctx.fillStyle = colors.light
    const snowCount = Math.round(48 * (parameters.snowRate ?? 0.34))
    for (let index = 0; index < snowCount; index += 1) {
      const rawX = index * 157 + drift * 4
      const x = ((rawX % VIEWPORT.width) + VIEWPORT.width) % VIEWPORT.width
      const y = (index * 83 + Math.abs(drift) * 1.4) % 448
      ctx.beginPath(); ctx.arc(x, y, index % 3 ? 1.2 : 1.8, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  drawTideSpecialBackground(scene, drift) {
    const { colors, parameters, landmarkPlacement } = scene
    ctx.save()
    const lanternGlow = parameters.lanternGlow ?? 0.66
    const moon = ctx.createRadialGradient(120, 92, 4, 120, 92, 72)
    moon.addColorStop(0, `rgba(233,255,248,${lanternGlow})`); moon.addColorStop(1, 'rgba(233,255,248,0)')
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(120, 92, 72, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(233,255,248,.62)'; ctx.beginPath(); ctx.arc(120, 92, 24, 0, Math.PI * 2); ctx.fill()

    ctx.globalAlpha = 0.34
    ctx.strokeStyle = '#123d4e'; ctx.lineWidth = 32
    ctx.beginPath(); ctx.arc(450, 94, 405, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = '#104657'
    for (let index = 0; index < 7; index += 1) {
      const x = 35 + index * 145 - (drift % 38)
      const height = 44 + (index % 3) * 27
      ctx.fillRect(x, 400 - height, 88, height)
      ctx.beginPath(); ctx.moveTo(x - 10, 400 - height); ctx.lineTo(x + 44, 352 - height)
      ctx.lineTo(x + 98, 400 - height); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(255,211,122,.62)'; ctx.fillRect(x + 18, 382 - height, 7, 10)
      ctx.fillStyle = '#104657'
    }

    const bellX = landmarkPlacement.x * VIEWPORT.width
    const bellY = landmarkPlacement.y * VIEWPORT.height
    const scale = landmarkPlacement.scale
    ctx.globalAlpha = landmarkPlacement.opacity
    ctx.strokeStyle = '#0f394a'; ctx.lineWidth = 13 * scale
    ctx.beginPath(); ctx.arc(bellX, bellY + 70 * scale, 62 * scale, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = '#183f4c'; ctx.fillRect(bellX - 70 * scale, bellY + 70 * scale, 140 * scale, 170 * scale)
    ctx.fillStyle = '#d7aa55'; ctx.beginPath(); ctx.arc(bellX, bellY + 103 * scale, 27 * scale, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(bellX - 5 * scale, bellY + 100 * scale, 10 * scale, 56 * scale)
    ctx.beginPath(); ctx.ellipse(bellX, bellY + 159 * scale, 14 * scale, 7 * scale, 0, 0, Math.PI * 2); ctx.fill()

    const waveAmplitude = parameters.waveAmplitude ?? 12
    const wavePhase = prefersReducedMotion ? 0
      : this.fixedTick / Math.max(1, parameters.wavePeriodTicks ?? 180) * Math.PI * 2
    ctx.globalAlpha = 0.26; ctx.strokeStyle = colors.light; ctx.lineWidth = 2.5
    for (let wave = 0; wave < 5; wave += 1) {
      ctx.beginPath()
      for (let x = -30; x <= 930; x += 30) {
        const y = 330 + wave * 28 + Math.sin(x * 0.04 + wave + wavePhase) * waveAmplitude
        if (x === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = colors.light
    const bubbleCount = Math.round(34 * (parameters.bubbleDensity ?? 0.38))
    for (let index = 0; index < bubbleCount; index += 1) {
      const x = (index * 173 + 45) % VIEWPORT.width
      const rawY = 455 - ((index * 47 + Math.abs(drift) * 3) % 170)
      ctx.beginPath(); ctx.arc(x, rawY, 2 + index % 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  drawMirrorSpecialBackground(scene, drift) {
    const { colors, parameters, landmarkPlacement } = scene
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.moveTo(0, 420); ctx.quadraticCurveTo(220, 300, 430, 405)
    ctx.quadraticCurveTo(680, 285, 900, 390); ctx.lineTo(900, 510); ctx.lineTo(0, 510); ctx.closePath(); ctx.fill()
    const trunkDrift = prefersReducedMotion ? 0 : drift * (parameters.trunkParallax ?? 0.42)
    ctx.globalAlpha = 0.42; ctx.fillStyle = '#ffffff'
    for (let index = 0; index < 13; index += 1) {
      const x = 18 + index * 77 - (trunkDrift % 77)
      const top = 76 + (index % 4) * 25
      ctx.fillRect(x, top, 8 + index % 3, 365 - top)
      ctx.fillRect(x + 17, top + 42, 3, 310 - top)
      ctx.strokeStyle = 'rgba(122,113,216,.24)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(x + 4, top + 56); ctx.lineTo(x - 20, top + 18)
      ctx.moveTo(x + 4, top + 104); ctx.lineTo(x + 34, top + 57); ctx.stroke()
    }

    const mirrorX = landmarkPlacement.x * VIEWPORT.width
    const mirrorY = landmarkPlacement.y * VIEWPORT.height
    const scale = landmarkPlacement.scale
    ctx.globalAlpha = landmarkPlacement.opacity
    const facet = ctx.createLinearGradient(mirrorX - 70, 0, mirrorX + 70, 0)
    facet.addColorStop(0, 'rgba(122,113,216,.54)'); facet.addColorStop(0.5, 'rgba(255,255,255,.8)'); facet.addColorStop(1, 'rgba(86,185,197,.48)')
    ctx.fillStyle = facet; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(mirrorX - 66 * scale, mirrorY - 44 * scale)
    ctx.lineTo(mirrorX - 8 * scale, mirrorY - 72 * scale); ctx.lineTo(mirrorX - 17 * scale, mirrorY + 190 * scale)
    ctx.lineTo(mirrorX - 78 * scale, mirrorY + 164 * scale); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(mirrorX + 8 * scale, mirrorY - 72 * scale)
    ctx.lineTo(mirrorX + 70 * scale, mirrorY - 38 * scale); ctx.lineTo(mirrorX + 81 * scale, mirrorY + 165 * scale)
    ctx.lineTo(mirrorX + 17 * scale, mirrorY + 190 * scale); ctx.closePath(); ctx.fill(); ctx.stroke()

    const prismColors = ['#7a71d8', '#56b9c5', '#e7598b']
    const reflectionCount = Math.max(1, Math.round(parameters.reflectionCount ?? 5))
    const causticShift = prefersReducedMotion ? 0
      : Math.sin(this.fixedTick * (parameters.causticSpeed ?? 0.12) * 0.015) * 18
    for (let index = 0; index < reflectionCount; index += 1) {
      ctx.globalAlpha = 0.105
      ctx.fillStyle = prismColors[index % prismColors.length]
      ctx.beginPath(); ctx.moveTo(70 + index * 165 + causticShift, 105)
      ctx.lineTo(10 + index * 165 - causticShift, 430); ctx.lineTo(156 + index * 165 + causticShift, 430); ctx.closePath(); ctx.fill()
    }
    ctx.globalAlpha = parameters.fogOpacity ?? 0.28
    const fog = ctx.createLinearGradient(0, 245, 0, 445)
    fog.addColorStop(0, 'rgba(255,255,255,0)'); fog.addColorStop(0.5, '#ffffff'); fog.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = fog; ctx.fillRect(0, 235, VIEWPORT.width, 220)
    ctx.restore()
  }

  drawRootSpecialBackground(scene, drift) {
    const { colors, parameters, landmarkPlacement } = scene
    ctx.save()
    ctx.fillStyle = '#211d25'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VIEWPORT.width, 0); ctx.lineTo(VIEWPORT.width, 126)
    for (let x = VIEWPORT.width; x >= 0; x -= 65) ctx.lineTo(x, 94 + Math.abs(Math.floor(x * 7)) % 78)
    ctx.closePath(); ctx.fill()
    ctx.globalAlpha = 0.4
    ctx.fillStyle = '#302830'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(84, 0); ctx.lineTo(38, 470); ctx.lineTo(0, 510); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(900, 0); ctx.lineTo(824, 0); ctx.lineTo(868, 470); ctx.lineTo(900, 510); ctx.closePath(); ctx.fill()

    ctx.strokeStyle = `rgba(239,195,111,${parameters.veinGlow ?? 0.26})`; ctx.lineWidth = 8
    const rootCount = Math.ceil(VIEWPORT.width / Math.max(80, parameters.lampSpacing ?? 140))
    for (let root = 0; root < rootCount; root += 1) {
      const x = 30 + root * (parameters.lampSpacing ?? 140)
      ctx.beginPath(); ctx.moveTo(x, -20); ctx.bezierCurveTo(x + 46, 135, x - 56, 245, x + 16, 438); ctx.stroke()
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 3, 95); ctx.lineTo(x + 52, 155); ctx.stroke(); ctx.lineWidth = 8
    }
    ctx.globalAlpha = 0.55; ctx.strokeStyle = '#c58a49'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, 430); ctx.lineTo(900, 430); ctx.moveTo(0, 456); ctx.lineTo(900, 456); ctx.stroke()
    for (let x = 24; x < 900; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, 424); ctx.lineTo(x + 13, 463); ctx.stroke()
    }

    const frameX = landmarkPlacement.x * VIEWPORT.width
    const frameY = landmarkPlacement.y * VIEWPORT.height
    const scale = landmarkPlacement.scale
    ctx.globalAlpha = landmarkPlacement.opacity; ctx.strokeStyle = '#2a2022'; ctx.lineWidth = 9 * scale
    ctx.beginPath(); ctx.moveTo(frameX - 60 * scale, frameY + 220 * scale); ctx.lineTo(frameX - 43 * scale, frameY - 25 * scale)
    ctx.lineTo(frameX + 44 * scale, frameY - 25 * scale); ctx.lineTo(frameX + 62 * scale, frameY + 220 * scale)
    ctx.moveTo(frameX - 70 * scale, frameY + 44 * scale); ctx.lineTo(frameX + 72 * scale, frameY + 44 * scale)
    ctx.moveTo(frameX - 43 * scale, frameY - 25 * scale); ctx.lineTo(frameX, frameY - 72 * scale); ctx.lineTo(frameX + 44 * scale, frameY - 25 * scale); ctx.stroke()
    ctx.fillStyle = '#423033'; ctx.fillRect(frameX - 54 * scale, frameY + 169 * scale, 108 * scale, 36 * scale)
    ctx.fillStyle = '#d9a95b'; ctx.beginPath(); ctx.arc(frameX - 31 * scale, frameY + 207 * scale, 12 * scale, 0, Math.PI * 2)
    ctx.arc(frameX + 31 * scale, frameY + 207 * scale, 12 * scale, 0, Math.PI * 2); ctx.fill()

    const lampSpacing = Math.max(80, parameters.lampSpacing ?? 140)
    for (let lamp = 0; lamp < 5; lamp += 1) {
      const x = 92 + lamp * lampSpacing
      const glow = ctx.createRadialGradient(x, 310, 1, x, 310, 34)
      glow.addColorStop(0, 'rgba(243,223,174,.48)'); glow.addColorStop(1, 'rgba(243,223,174,0)')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, 310, 34, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = colors.accent; ctx.fillRect(x - 4, 304, 8, 13)
    }
    ctx.globalAlpha = 0.22; ctx.fillStyle = colors.light
    const dustCount = Math.round(60 * (parameters.dustDensity ?? 0.44))
    for (let index = 0; index < dustCount; index += 1) {
      const rawX = index * 97 + drift
      const x = ((rawX % VIEWPORT.width) + VIEWPORT.width) % VIEWPORT.width
      const y = (index * 53 + Math.abs(drift) * 0.5) % 445
      ctx.fillRect(x, y, 1.5, 1.5)
    }
    const vignetteStrength = parameters.vignetteStrength ?? 0.62
    ctx.fillStyle = `rgba(19,13,19,${vignetteStrength * 0.17})`; ctx.fillRect(0, 0, VIEWPORT.width, 96)
    ctx.restore()
  }

  drawStormSpecialBackground(scene, drift) {
    const { colors, parameters, landmarkPlacement } = scene
    ctx.save()
    const cloudDrift = prefersReducedMotion ? 0
      : this.fixedTick * (parameters.cloudSpeed ?? 0.36) * 0.45 + drift * 0.35
    ctx.fillStyle = 'rgba(20,28,55,.4)'
    for (let cloud = 0; cloud < 9; cloud += 1) {
      const rawX = cloud * 143 + cloudDrift * (1 + (cloud % 2) * (parameters.airshipParallax ?? 0.18))
      const x = ((rawX % 1100) + 1100) % 1100 - 120
      const y = 62 + (cloud % 3) * 76
      ctx.beginPath(); ctx.ellipse(x, y, 88, 28, 0, 0, Math.PI * 2)
      ctx.ellipse(x + 60, y + 8, 64, 24, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 0.24; ctx.fillStyle = '#e5edf7'
    for (let cloud = 0; cloud < 7; cloud += 1) {
      const x = 30 + cloud * 155 - (cloudDrift * 0.12 % 90)
      const y = 392 + (cloud % 2) * 28
      ctx.beginPath(); ctx.ellipse(x, y, 100, 31, 0, 0, Math.PI * 2); ctx.fill()
    }

    const airshipX = landmarkPlacement.x * VIEWPORT.width
    const airshipY = landmarkPlacement.y * VIEWPORT.height
    const scale = landmarkPlacement.scale
    ctx.globalAlpha = landmarkPlacement.opacity
    ctx.fillStyle = '#303958'; ctx.strokeStyle = '#d8dfef'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(airshipX, airshipY, 72 * scale, 25 * scale, -0.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(airshipX - 57 * scale, airshipY - 5 * scale); ctx.lineTo(airshipX - 92 * scale, airshipY - 35 * scale)
    ctx.lineTo(airshipX - 82 * scale, airshipY + 12 * scale); ctx.closePath(); ctx.fill()
    ctx.fillRect(airshipX - 31 * scale, airshipY + 28 * scale, 62 * scale, 17 * scale)
    ctx.beginPath(); ctx.moveTo(airshipX - 36 * scale, airshipY + 12 * scale); ctx.lineTo(airshipX - 23 * scale, airshipY + 28 * scale)
    ctx.moveTo(airshipX + 36 * scale, airshipY + 12 * scale); ctx.lineTo(airshipX + 23 * scale, airshipY + 28 * scale); ctx.stroke()
    ctx.fillStyle = colors.accent
    for (let windowIndex = -2; windowIndex <= 2; windowIndex += 1) {
      ctx.beginPath(); ctx.arc(airshipX + windowIndex * 11 * scale, airshipY + 36 * scale, 2.3 * scale, 0, Math.PI * 2); ctx.fill()
    }

    ctx.globalAlpha = 0.31; ctx.strokeStyle = '#303958'; ctx.lineWidth = 7
    for (let mast = 0; mast < 3; mast += 1) {
      const x = 585 + mast * 112
      const top = 244 - mast * 25
      ctx.beginPath(); ctx.moveTo(x, 462); ctx.lineTo(x, top); ctx.stroke()
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top + 20); ctx.quadraticCurveTo(x + 56, top + 70, x + 112, top + 25); ctx.stroke(); ctx.lineWidth = 7
    }
    ctx.globalAlpha = 0.42
    const lightningInterval = Math.max(1, parameters.lightningIntervalTicks ?? 210)
    const flash = this.mapPulseTick % lightningInterval < 8 ? 0.82 : 0.28
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 3; ctx.globalAlpha = flash
    for (let bolt = 0; bolt < 4; bolt += 1) {
      const x = 150 + bolt * 220
      ctx.beginPath(); ctx.moveTo(x, 84); ctx.lineTo(x - 18, 174); ctx.lineTo(x + 8, 165); ctx.lineTo(x - 22, 276); ctx.stroke()
    }
    ctx.globalAlpha = 0.16; ctx.strokeStyle = colors.light; ctx.lineWidth = 1.3
    const rainLean = Math.sign(this.windX) * Math.min(8, Math.abs(this.windX) * 85)
    for (let index = 0; index < 42; index += 1) {
      const x = (index * 97 + Math.abs(drift) * 4) % VIEWPORT.width
      const y = (index * 61 + this.fixedTick * 2.6) % 410
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rainLean, y + 13); ctx.stroke()
    }
    ctx.restore()
  }

  drawGround() {
    const groundLeft = WORLD_MIN_X - 500
    const groundRight = WORLD_MAX_X + 500
    const mainPalette = (this.mode === 'main' || this.mode === 'endless') && this.state === 'play'
      ? this.mainEnvironmentTheme?.palette
      : null
    const boundaries = [groundLeft, groundRight]
    for (const zone of this.terrainProfile?.zones || []) {
      if (zone.endX <= groundLeft || zone.startX >= groundRight) continue
      boundaries.push(clamp(zone.startX, groundLeft, groundRight))
      boundaries.push(clamp(zone.endX, groundLeft, groundRight))
    }
    const ordered = [...new Set(boundaries)].sort((first, second) => first - second)
    const segments = []
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = ordered[index]
      const right = ordered[index + 1]
      if (right - left <= 0.01) continue
      segments.push({ left, right, terrain: this.terrainAt((left + right) / 2) })
    }

    const grassLean = clamp(this.windX / 0.09, -1, 1) * 10
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const { left, right, terrain } = segments[segmentIndex]
      const width = right - left
      const colors = terrain.id === 'meadow-dirt' && mainPalette ? {
        ...terrain.colors,
        surface: mainPalette.groundSoil || terrain.colors.surface,
        rim: mainPalette.groundRim || terrain.colors.rim,
      } : terrain.colors
      const texture = terrain.texture.kind
      const spacing = terrain.texture.spacing
      ctx.save()
      ctx.beginPath(); ctx.rect(left, GROUND_Y - 24, width, 330); ctx.clip()

      const gradient = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 210)
      gradient.addColorStop(0, colors.subsoil)
      gradient.addColorStop(0.42, colors.deep)
      gradient.addColorStop(1, '#141315')
      ctx.fillStyle = gradient
      ctx.fillRect(left, GROUND_Y, width, 290)
      ctx.fillStyle = colors.surface
      ctx.fillRect(left, GROUND_Y - 10, width, 17)
      ctx.fillStyle = colors.rim
      ctx.fillRect(left, GROUND_Y - 12, width, 4)

      if (texture === 'roots-and-pebbles') {
        ctx.strokeStyle = 'rgba(28,48,28,.62)'; ctx.lineWidth = 2.1
        for (let x = left - 10; x < right + 10; x += 23) {
          const height = 5 + Math.abs(Math.floor(x * 13)) % 7
          ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 7)
          ctx.quadraticCurveTo(x + grassLean * 0.48 - 2, GROUND_Y - 12,
            x + grassLean - 4, GROUND_Y - 7 - height); ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(31,25,17,.34)'; ctx.lineWidth = 2
        for (let x = left + 28; x < right; x += spacing) {
          ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 8)
          ctx.bezierCurveTo(x - 16, GROUND_Y + 24, x + 15, GROUND_Y + 38, x - 5, GROUND_Y + 58); ctx.stroke()
          ctx.fillStyle = 'rgba(218,187,126,.24)'
          ctx.beginPath(); ctx.ellipse(x + 26, GROUND_Y + 28 + Math.abs(Math.floor(x)) % 20, 5, 2.8, -0.2, 0, Math.PI * 2); ctx.fill()
        }
      } else if (texture === 'woodchips-and-pools') {
        ctx.fillStyle = 'rgba(40,77,67,.34)'
        for (let x = left + 18; x < right; x += spacing * 2.2) {
          ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 5, 28, 5.5, 0, 0, Math.PI * 2); ctx.fill()
        }
        ctx.strokeStyle = colors.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'
        for (let x = left + 9; x < right; x += spacing * 0.47) {
          const y = GROUND_Y + 13 + Math.abs(Math.floor(x * 7)) % 45
          const lean = (Math.abs(Math.floor(x)) % 3 - 1) * 5
          ctx.beginPath(); ctx.moveTo(x - 7, y - lean * 0.2); ctx.lineTo(x + 7, y + lean * 0.2); ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(185,216,196,.25)'; ctx.lineWidth = 1.4
        for (let x = left + 40; x < right; x += spacing * 2.2) {
          ctx.beginPath(); ctx.arc(x, GROUND_Y + 2, 18, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
        }
      } else if (texture === 'snow-ridges-and-cracks') {
        ctx.fillStyle = '#eef6f4'; ctx.fillRect(left, GROUND_Y - 14, width, 11)
        ctx.fillStyle = 'rgba(255,255,255,.72)'
        for (let x = left - 18; x < right + 18; x += 42) {
          ctx.beginPath(); ctx.ellipse(x, GROUND_Y - 11, 25, 7, 0, 0, Math.PI * 2); ctx.fill()
        }
        ctx.strokeStyle = 'rgba(74,126,143,.46)'; ctx.lineWidth = 1.8
        for (let x = left + 34; x < right; x += spacing) {
          const y = GROUND_Y + 12 + Math.abs(Math.floor(x)) % 28
          ctx.beginPath(); ctx.moveTo(x - 16, y - 7); ctx.lineTo(x, y)
          ctx.lineTo(x - 7, y + 13); ctx.moveTo(x, y); ctx.lineTo(x + 18, y + 8); ctx.stroke()
        }
        const shine = ctx.createLinearGradient(left, 0, right, 0)
        shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(0.5, 'rgba(255,255,255,.38)'); shine.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = shine; ctx.fillRect(left, GROUND_Y - 8, width, 18)
      } else if (texture === 'royal-pavers') {
        ctx.fillStyle = colors.surface; ctx.fillRect(left, GROUND_Y - 13, width, 54)
        ctx.strokeStyle = 'rgba(31,35,34,.48)'; ctx.lineWidth = 2
        for (let y = GROUND_Y - 12; y <= GROUND_Y + 43; y += 18) {
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
          const row = Math.round((y - GROUND_Y) / 18)
          for (let x = left + (row % 2 ? spacing / 2 : 0); x < right; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke()
          }
        }
        ctx.fillStyle = 'rgba(224,211,170,.12)'; ctx.fillRect(left, GROUND_Y - 9, width, 5)
      } else if (texture === 'mirror-facets') {
        ctx.fillStyle = 'rgba(226,252,255,.64)'; ctx.fillRect(left, GROUND_Y - 13, width, 22)
        ctx.strokeStyle = 'rgba(244,255,255,.62)'; ctx.lineWidth = 2
        for (let x = left - spacing; x < right + spacing; x += spacing) {
          ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 8); ctx.lineTo(x + spacing * 0.45, GROUND_Y - 12)
          ctx.lineTo(x + spacing, GROUND_Y + 8); ctx.stroke()
        }
        ctx.fillStyle = 'rgba(221,155,232,.16)'
        for (let x = left; x < right; x += spacing * 1.7) {
          ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 9); ctx.lineTo(x + 58, GROUND_Y + 9)
          ctx.lineTo(x + 86, GROUND_Y + 75); ctx.lineTo(x + 30, GROUND_Y + 54); ctx.closePath(); ctx.fill()
        }
      } else if (texture === 'fault-strata') {
        ctx.strokeStyle = 'rgba(224,168,91,.34)'; ctx.lineWidth = 3
        for (let y = GROUND_Y + 22; y < GROUND_Y + 190; y += 35) {
          ctx.beginPath()
          for (let x = left - 20; x <= right + 20; x += 36) {
            const offsetY = Math.sin((x + y) * 0.035) * 6
            if (x === left - 20) ctx.moveTo(x, y + offsetY); else ctx.lineTo(x, y + offsetY)
          }
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(239,195,111,.28)'
        for (let x = left + 18; x < right; x += spacing) {
          ctx.beginPath(); ctx.arc(x, GROUND_Y + 28 + Math.abs(Math.floor(x)) % 60, 3, 0, Math.PI * 2); ctx.fill()
        }
      } else if (texture === 'deck-planks-and-rivets') {
        ctx.fillStyle = colors.surface; ctx.fillRect(left, GROUND_Y - 13, width, 70)
        ctx.strokeStyle = 'rgba(48,31,21,.66)'; ctx.lineWidth = 2
        for (let y = GROUND_Y - 12; y < GROUND_Y + 58; y += 18) {
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
          for (let x = left + ((y - GROUND_Y) % 36 ? spacing / 2 : 0); x < right; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke()
          }
        }
        ctx.fillStyle = '#d8b36e'
        for (let x = left + 18; x < right; x += spacing) {
          ctx.beginPath(); ctx.arc(x, GROUND_Y - 4, 2.2, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = 'rgba(24,31,37,.46)'; ctx.fillRect(left, GROUND_Y + 58, width, 18)
      }

      if (segmentIndex > 0) {
        ctx.fillStyle = colors.rim
        ctx.beginPath(); ctx.moveTo(left - 5, GROUND_Y - 13); ctx.lineTo(left + 5, GROUND_Y - 13)
        ctx.lineTo(left + 2, GROUND_Y + 25); ctx.lineTo(left - 2, GROUND_Y + 25); ctx.closePath(); ctx.fill()
      }
      ctx.restore()
    }
  }

  captureArchitectureSilhouetteFrame() {
    const spec = this.architectureBlueprint?.buildingPlan?.silhouetteSpec
    if (!spec) return null
    const authoredBlocks = this.blocks.filter((block) => block.completeBuilding)
    if (!authoredBlocks.length) return null
    const bounds = authoredBlocks.map((block) => rotatedRectBounds({
      ...block,
      x: Number.isFinite(block.initialX) ? block.initialX : block.x,
      y: Number.isFinite(block.initialY) ? block.initialY : block.y,
      rotation: Number.isFinite(block.initialRotation) ? block.initialRotation : block.rotation,
    }))
    const rawLeft = Math.min(...bounds.map((entry) => entry.left))
    const rawRight = Math.max(...bounds.map((entry) => entry.right))
    const rawTop = Math.min(...bounds.map((entry) => entry.top))
    const footprintRatio = clamp(spec.footprint?.spanRatio ?? 1, 0.55, 1)
    const centerX = (rawLeft + rawRight) / 2
    const width = Math.max(360, (rawRight - rawLeft) * footprintRatio)
    const height = clamp(GROUND_Y - rawTop + 24, 280, 480)
    return Object.freeze({
      left: centerX - width / 2,
      right: centerX + width / 2,
      top: GROUND_Y - height,
      groundY: GROUND_Y,
      width,
      height,
    })
  }

  captureArchitectureSilhouetteBaseline() {
    const authoredBlocks = this.blocks.filter((block) => block.completeBuilding)
    if (!authoredBlocks.length) return null
    return Object.freeze({
      totalArea: authoredBlocks.reduce((sum, block) => (
        sum + Math.max(1, block.width * block.height)
      ), 0),
    })
  }

  architectureSilhouetteIntegrity() {
    const totalArea = this.architectureSilhouetteBaseline?.totalArea || 0
    if (!totalArea) return 0
    const liveArea = this.blocks
      .filter((block) => block.completeBuilding)
      .reduce((sum, block) => {
        const area = Math.max(1, block.width * block.height)
        const hpRatio = clamp(block.hp / Math.max(1, block.initialHp || block.hp), 0, 1)
        const displacement = Math.hypot(
          block.x - (block.initialX ?? block.x),
          block.y - (block.initialY ?? block.y),
        )
        const rotationDelta = Math.abs(
          block.rotation - (block.initialRotation ?? block.rotation),
        )
        const poseRatio = clamp(1 - displacement / 90 - rotationDelta / 75, 0, 1)
        return sum + area * hpRatio * poseRatio
      }, 0)
    return clamp(liveArea / totalArea, 0, 1)
  }

  architectureSilhouetteLayout() {
    const plan = this.architectureBlueprint?.buildingPlan
    const spec = plan?.silhouetteSpec
    const frame = this.architectureSilhouetteFrame
    if (!spec || !frame) return null
    const masses = new Map()
    for (const mass of spec.massing || []) {
      const width = Math.max(18, frame.width * mass.widthRatio)
      const height = Math.max(12, frame.height * mass.heightRatio)
      const x = frame.left + frame.width * mass.xRatio
      const bottom = frame.groundY - frame.height * (mass.baseRatio || 0)
      masses.set(mass.id, {
        ...mass,
        x,
        y: bottom - height,
        width,
        height,
        bottom,
      })
    }
    return {
      plan,
      spec,
      frame,
      masses,
      integrity: this.architectureSilhouetteIntegrity(),
    }
  }

  architectureSilhouettePalette(plan) {
    if (plan.category === 'royal') {
      return {
        fill: 'rgba(34,52,48,.36)', secondary: 'rgba(58,73,65,.3)',
        outline: 'rgba(232,217,178,.58)', detail: 'rgba(232,217,178,.34)',
        roof: 'rgba(43,58,53,.48)', void: 'rgba(12,22,21,.7)', accent: '#d2ad59',
      }
    }
    if (plan.category === 'infrastructure' || plan.category === 'bridge') {
      return {
        fill: 'rgba(52,61,57,.3)', secondary: 'rgba(82,71,56,.26)',
        outline: 'rgba(236,218,178,.5)', detail: 'rgba(231,214,181,.3)',
        roof: 'rgba(75,61,45,.4)', void: 'rgba(16,26,25,.62)', accent: '#cfa554',
      }
    }
    return {
      fill: 'rgba(43,61,54,.27)', secondary: 'rgba(73,79,62,.24)',
      outline: 'rgba(225,216,181,.46)', detail: 'rgba(225,216,181,.28)',
      roof: 'rgba(61,62,48,.37)', void: 'rgba(15,25,23,.58)', accent: '#c7a762',
    }
  }

  drawSilhouetteMass(mass, palette) {
    const left = mass.x - mass.width / 2
    const top = mass.y
    const isPier = /pier|buttress|standard/u.test(mass.kind)
    const isDeck = /roadway|leaf|wall|gallery|walk|rampart/u.test(mass.kind)
    ctx.save()
    const isKeep = /great-citadel-keep|command-keep|great-gatehouse/u.test(mass.kind)
    const isGranary = /domed-royal-granary|royal-tollhouse/u.test(mass.kind)
    ctx.fillStyle = isGranary
      ? 'rgba(83,65,44,.38)'
      : isKeep ? 'rgba(29,47,44,.46)'
        : isDeck ? palette.secondary : palette.fill
    ctx.strokeStyle = palette.outline
    ctx.lineWidth = 1.5
    if (isPier) {
      const taper = Math.min(7, mass.width * 0.1)
      ctx.beginPath()
      ctx.moveTo(left + taper, top)
      ctx.lineTo(left + mass.width - taper, top)
      ctx.lineTo(left + mass.width, mass.bottom)
      ctx.lineTo(left, mass.bottom)
      ctx.closePath()
    } else {
      roundedRect(ctx, left, top, mass.width, mass.height, Math.min(5, mass.width * 0.05))
    }
    ctx.fill()
    ctx.stroke()

    if (!isDeck && mass.height > 64) {
      ctx.strokeStyle = palette.detail
      ctx.lineWidth = 1
      for (let y = top + 24; y < mass.bottom - 8; y += 24) {
        ctx.beginPath(); ctx.moveTo(left + 5, y); ctx.lineTo(left + mass.width - 5, y); ctx.stroke()
      }
    }
    if (/tower|keep|redoubt|gatehouse|bastion/u.test(mass.kind) && mass.width > 34) {
      // Heavy corner quoins make each authored mass read as one tower or keep
      // rather than another stack of narrow posts behind the gameplay bodies.
      ctx.fillStyle = 'rgba(225,210,171,.16)'
      const quoinWidth = Math.max(4, Math.min(9, mass.width * 0.055))
      ctx.fillRect(left + 2, top + 3, quoinWidth, mass.height - 6)
      ctx.fillRect(left + mass.width - quoinWidth - 2, top + 3, quoinWidth, mass.height - 6)
    }
    if (/tower|keep|redoubt|gatehouse|bastion/u.test(mass.kind)) {
      ctx.fillStyle = palette.void
      const slitCount = Math.max(1, Math.min(3, Math.round(mass.width / 80)))
      for (let index = 0; index < slitCount; index += 1) {
        const slitX = left + mass.width * (index + 1) / (slitCount + 1)
        roundedRect(ctx, slitX - 2.5, top + Math.min(44, mass.height * 0.25), 5, 18, 2.5)
        ctx.fill()
      }
    }
    if (/granary|tollhouse/u.test(mass.kind)) {
      ctx.strokeStyle = palette.detail
      for (const ratio of [0.3, 0.5, 0.7]) {
        ctx.beginPath(); ctx.moveTo(left + mass.width * ratio, top + 7)
        ctx.lineTo(left + mass.width * ratio, mass.bottom - 7); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawSilhouetteConnection(connection, layout, palette) {
    const first = layout.masses.get(connection.fromMass)
    const second = layout.masses.get(connection.toMass)
    if (!first || !second) return
    const leftMass = first.x <= second.x ? first : second
    const rightMass = first.x <= second.x ? second : first
    let left = leftMass.x + leftMass.width * 0.34
    let right = rightMass.x - rightMass.width * 0.34
    if (right <= left) {
      left = leftMass.x
      right = rightMass.x
    }
    const y = layout.frame.groundY - layout.frame.height * connection.elevationRatio
    ctx.save()
    ctx.strokeStyle = palette.outline
    ctx.fillStyle = palette.secondary
    ctx.lineWidth = 2
    if (connection.openBelow) {
      ctx.fillRect(left, y - 6, right - left, 12)
      const rise = Math.min(42, Math.max(14, (right - left) * 0.2))
      ctx.beginPath(); ctx.moveTo(left, y + 7)
      ctx.quadraticCurveTo((left + right) / 2, y - rise, right, y + 7)
      ctx.stroke()
    } else {
      ctx.globalAlpha = 0.72
      ctx.fillRect(left, y - 5, right - left, layout.frame.groundY - y + 5)
      ctx.globalAlpha = 1
      ctx.strokeRect(left, y - 5, right - left, layout.frame.groundY - y + 5)
    }
    ctx.restore()
  }

  drawSilhouetteOpening(opening, frame, palette) {
    const centerX = frame.left + frame.width * opening.xRatio
    const width = Math.max(18, frame.width * opening.widthRatio)
    const height = Math.max(22, frame.height * opening.heightRatio)
    const bottom = frame.groundY - frame.height * (opening.baseRatio || 0)
    const top = bottom - height
    const radius = Math.min(width / 2, Math.max(9, height * 0.34))
    const springY = top + radius
    ctx.save()
    ctx.fillStyle = palette.void
    ctx.strokeStyle = palette.outline
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(centerX - width / 2, bottom)
    ctx.lineTo(centerX - width / 2, springY)
    ctx.arc(centerX, springY, radius, Math.PI, 0)
    ctx.lineTo(centerX + width / 2, bottom)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = palette.detail
    ctx.beginPath(); ctx.arc(centerX, springY, Math.max(4, radius - 6), Math.PI, 0); ctx.stroke()
    ctx.restore()
  }

  drawSilhouetteRoofSegment(segment, frame, palette) {
    const left = frame.left + frame.width * segment.fromXRatio
    const right = frame.left + frame.width * segment.toXRatio
    const width = right - left
    const y = frame.groundY - frame.height * segment.elevationRatio
    const kind = segment.kind || ''
    ctx.save()
    ctx.fillStyle = palette.roof
    ctx.strokeStyle = palette.outline
    ctx.lineWidth = 1.7
    if (/dome/u.test(kind)) {
      ctx.fillStyle = 'rgba(88,70,50,.38)'
      ctx.strokeStyle = 'rgba(236,207,145,.62)'
      ctx.lineWidth = 2.2
      const rise = Math.max(18, Math.min(58, width * 0.56 * Math.max(0.5, Math.abs(segment.pitch || 0.7))))
      ctx.beginPath()
      if ((segment.pitch || 0) >= 0) {
        ctx.moveTo(left, y + 9); ctx.lineTo(left, y)
        ctx.quadraticCurveTo(left + width * 0.72, y - rise, right, y - rise)
        ctx.lineTo(right, y + 9)
      } else {
        ctx.moveTo(left, y + 9); ctx.lineTo(left, y - rise)
        ctx.quadraticCurveTo(left + width * 0.28, y - rise, right, y)
        ctx.lineTo(right, y + 9)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (/roadway|open-bridge|viaduct/u.test(kind)) {
      ctx.fillRect(left, y - 4, width, 11)
      ctx.beginPath(); ctx.moveTo(left, y - 11); ctx.lineTo(right, y - 11); ctx.stroke()
      const posts = Math.max(3, Math.round(width / 82))
      for (let index = 0; index <= posts; index += 1) {
        const x = left + width * index / posts
        ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - 13); ctx.stroke()
      }
    } else if (/battlement|crenellation|parapet|crown/u.test(kind)) {
      ctx.fillRect(left, y - 3, width, 12)
      const merlons = Math.max(2, Math.min(10, Math.round(width / 31)))
      const merlonWidth = width / (merlons * 1.8)
      for (let index = 0; index < merlons; index += 1) {
        const x = left + width * (index + 0.5) / merlons - merlonWidth / 2
        ctx.fillRect(x, y - 13, merlonWidth, 11)
        ctx.strokeRect(x, y - 13, merlonWidth, 11)
      }
    } else {
      const rise = Math.max(12, Math.min(42, width * (0.12 + Math.abs(segment.pitch || 0.16) * 0.18)))
      ctx.beginPath(); ctx.moveTo(left - 4, y + 5)
      ctx.lineTo((left + right) / 2, y - rise)
      ctx.lineTo(right + 4, y + 5)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    }
    ctx.restore()
  }

  drawSilhouetteWings(layout, palette) {
    for (const wing of layout.spec.wings || []) {
      const width = Math.max(26, layout.frame.width * wing.widthRatio)
      const height = Math.max(28, layout.frame.height * wing.heightRatio)
      const left = wing.side === 'left' ? layout.frame.left - width * 0.14 : layout.frame.right - width * 0.86
      ctx.save()
      ctx.globalAlpha = 0.84
      ctx.fillStyle = palette.secondary
      ctx.strokeStyle = palette.outline
      roundedRect(ctx, left, layout.frame.groundY - height, width, height, 4)
      ctx.fill(); ctx.stroke()
      ctx.restore()
    }
  }

  drawAuthoredArchitectureBackdrop(layout) {
    if (layout.integrity <= 0.025) return
    const palette = this.architectureSilhouettePalette(layout.plan)
    ctx.save()
    // The silhouette is a visual skin for the live physical building, not a
    // permanent background castle. As modules break, fall or rotate away from
    // their authored load path, the corresponding architectural skin fades so
    // no intact "ghost building" remains after a collapse.
    ctx.globalAlpha = Math.pow(layout.integrity, 1.35)
    this.drawSilhouetteWings(layout, palette)
    for (const connection of layout.spec.connections || []) {
      this.drawSilhouetteConnection(connection, layout, palette)
    }
    for (const mass of layout.masses.values()) this.drawSilhouetteMass(mass, palette)
    for (const opening of layout.spec.openings || []) {
      this.drawSilhouetteOpening(opening, layout.frame, palette)
    }
    for (const roof of layout.spec.roofSegments || []) {
      this.drawSilhouetteRoofSegment(roof, layout.frame, palette)
    }
    ctx.restore()
  }

  drawGenericRoyalCitadelBackdrop() {
    const tier = this.strongholdTier
    const left = 548
    const right = 1328
    const wallTop = 392 - tier * 22
    const towerCount = 2 + tier
    const flagLean = clamp(this.windX / 0.09, -1, 1) * 14
    ctx.save()
    ctx.globalAlpha = 0.1 + tier * 0.025
    ctx.fillStyle = '#283b35'
    ctx.strokeStyle = 'rgba(223,210,178,.42)'
    ctx.lineWidth = 2
    ctx.fillRect(left, wallTop, right - left, GROUND_Y - wallTop)
    for (let x = left; x < right; x += 42) ctx.fillRect(x, wallTop - 12, 24, 14)
    for (let index = 0; index < towerCount; index += 1) {
      const ratio = towerCount <= 1 ? 0.5 : index / (towerCount - 1)
      const x = left + 42 + ratio * (right - left - 84)
      const width = tier >= 3 && index === Math.floor(towerCount / 2) ? 116 : 78
      const height = 112 + ((index + tier) % 2) * 34 + tier * 16
      const top = GROUND_Y - height
      ctx.fillRect(x - width / 2, top, width, height)
      for (let merlon = -width / 2; merlon < width / 2; merlon += 24) {
        ctx.fillRect(x + merlon, top - 13, 14, 15)
      }
      ctx.beginPath(); ctx.moveTo(x, top - 13); ctx.lineTo(x, top - 60)
      ctx.lineTo(x + 26 + flagLean, top - 48); ctx.lineTo(x, top - 36)
      ctx.closePath(); ctx.fill(); ctx.strokeRect(x - 13, top + 28, 26, 34)
    }
    ctx.beginPath(); ctx.moveTo(left, wallTop); ctx.lineTo(right, wallTop); ctx.stroke()
    ctx.restore()
  }

  drawRoyalCitadelBackdrop() {
    if (this.state !== 'play' || this.mode === 'special' || this.strongholdTier <= 0) return
    const layout = this.architectureSilhouetteLayout()
    if (layout) this.drawAuthoredArchitectureBackdrop(layout)
    else this.drawGenericRoyalCitadelBackdrop()
  }

  drawSling(front) {
    const bird = this.currentBird && !this.currentBird.launched ? this.currentBird : null
    const leftFork = { x: SLING_X - 25, y: ANCHOR_Y - 8 }
    const rightFork = { x: SLING_X + 25, y: ANCHOR_Y - 8 }
    const baseY = GROUND_Y - 16
    const loadedRadius = bird ? bird.radius * this.loadedBirdDisplayScale() : 0
    const frontAttach = bird
      ? { x: bird.x - loadedRadius * 0.78, y: bird.y + loadedRadius * 0.08 }
      : null
    const rearAttach = bird
      ? { x: bird.x + loadedRadius * 0.78, y: bird.y + loadedRadius * 0.08 }
      : null
    ctx.lineCap = 'round'
    if (!front) {
      ctx.fillStyle = 'rgba(8,21,15,.24)'
      ctx.beginPath(); ctx.ellipse(SLING_X, GROUND_Y - 8, 39, 9, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#3a2118'
      ctx.lineWidth = 13
      ctx.beginPath()
      ctx.moveTo(SLING_X, baseY - 2)
      ctx.lineTo(SLING_X, SLING_Y - 28)
      ctx.moveTo(SLING_X, SLING_Y - 20)
      ctx.lineTo(leftFork.x, leftFork.y)
      ctx.moveTo(SLING_X, SLING_Y - 20)
      ctx.lineTo(rightFork.x, rightFork.y)
      ctx.stroke()
      ctx.strokeStyle = '#895334'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(SLING_X - 1, baseY - 3)
      ctx.lineTo(SLING_X - 2, SLING_Y - 25)
      ctx.moveTo(SLING_X - 2, SLING_Y - 19)
      ctx.lineTo(leftFork.x, leftFork.y)
      ctx.moveTo(SLING_X + 2, SLING_Y - 19)
      ctx.lineTo(rightFork.x, rightFork.y)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(245,201,111,.45)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(SLING_X - 4, baseY - 10); ctx.lineTo(SLING_X - 5, SLING_Y - 24); ctx.stroke()
      if (bird) {
        ctx.strokeStyle = '#2c1b16'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(rightFork.x, rightFork.y)
        ctx.lineTo(rearAttach.x, rearAttach.y)
        ctx.stroke()
        // Keep the leather cradle behind the loaded acorn so its face and
        // ability mark remain readable at rest and while aiming.
        ctx.save()
        ctx.translate(bird.x, bird.y)
        ctx.fillStyle = '#573526'
        roundedRect(ctx, -loadedRadius * 0.82, loadedRadius * 0.42, loadedRadius * 1.64, loadedRadius * 0.48, loadedRadius * 0.2)
        ctx.fill()
        ctx.strokeStyle = '#aa7650'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.restore()
      }
    } else {
      if (bird) {
        ctx.strokeStyle = '#41241b'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(leftFork.x, leftFork.y)
        ctx.lineTo(frontAttach.x, frontAttach.y)
        ctx.stroke()
      }
      ctx.strokeStyle = '#ad7250'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(leftFork.x, leftFork.y)
      ctx.lineTo(SLING_X - 20, ANCHOR_Y - 21)
      ctx.moveTo(rightFork.x, rightFork.y)
      ctx.lineTo(SLING_X + 20, ANCHOR_Y - 21)
      ctx.stroke()
      ctx.strokeStyle = '#d0aa70'
      ctx.lineWidth = 1.4
      for (const fork of [leftFork, rightFork]) {
        ctx.beginPath(); ctx.arc(fork.x, fork.y - 2, 6, 0.15, Math.PI - 0.15); ctx.stroke()
      }
      ctx.fillStyle = '#6b4932'
      for (const x of [SLING_X - 18, SLING_X + 15]) {
        ctx.beginPath(); ctx.arc(x, baseY, 5, 0, Math.PI * 2); ctx.fill()
      }
    }
  }

  loadedBirdDisplayScale() {
    return dom.canvas.clientWidth > 0 && dom.canvas.clientWidth < 520 ? 1.45 : 1.14
  }

  drawLoadedBirdFocus(bird, scale) {
    const style = BIRD_STYLE[bird.type] || BIRD_STYLE.red
    const radius = bird.radius * scale
    ctx.save()
    ctx.translate(bird.x, bird.y)
    const glow = ctx.createRadialGradient(0, 0, radius * 0.45, 0, 0, radius + 8)
    glow.addColorStop(0, 'rgba(255,255,255,.84)')
    glow.addColorStop(0.72, 'rgba(255,255,255,.68)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = mixCss(style.accent, '#ffffff', 0.2)
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, radius + 4, 0.2, Math.PI * 1.76); ctx.stroke()

    if (!this.dragging && !this.keyboardAiming) {
      const compact = dom.canvas.clientWidth > 0 && dom.canvas.clientWidth < 520
      const label = `当前 · ${style.name}`
      ctx.font = `750 ${compact ? 18 : 11}px ui-sans-serif, system-ui, sans-serif`
      const width = Math.ceil(ctx.measureText(label).width) + 25
      const height = compact ? 31 : 23
      const y = -radius - height - 13
      ctx.fillStyle = 'rgba(255,255,255,.94)'
      roundedRect(ctx, -width / 2, y, width, height, height / 2); ctx.fill()
      ctx.strokeStyle = 'rgba(22,50,37,.2)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = style.accent
      ctx.beginPath(); ctx.arc(-width / 2 + 10, y + height / 2, compact ? 4.2 : 3.2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = ART.ink
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(label, -width / 2 + 17, y + height / 2 + 0.5)
    }
    ctx.restore()
  }

  renderShotSelectorPortraits() {
    const portraits = dom.shotSelectorList.querySelectorAll('.shot-acorn-portrait-canvas[data-shot-index]')
    for (const portrait of portraits) {
      const index = Number(portrait.dataset.shotIndex)
      const type = this.shotQueue[index] || portrait.dataset.birdType || 'red'
      const style = BIRD_STYLE[type] || BIRD_STYLE.red
      const portraitContext = portrait.getContext('2d')
      if (!portraitContext) continue
      portraitContext.setTransform(1, 0, 0, 1, 0, 0)
      portraitContext.clearRect(0, 0, portrait.width, portrait.height)
      portraitContext.imageSmoothingEnabled = true
      portraitContext.imageSmoothingQuality = 'high'
      withDrawingContext(portraitContext, () => {
        this.drawBird({
          id: `selector-${index}-${type}`,
          type,
          x: portrait.width / 2,
          y: portrait.height * 0.57,
          radius: style.radius,
          rotation: 0,
          launched: false,
          used: false,
          splitClone: false,
          fireArmed: false,
          moltenHeartArmed: false,
          abilityTicks: 0,
        }, { queued: true, scale: 1.42 })
      })
    }
  }

  drawBirdQueue() {
    if (!this.shotQueue.length || !['play', 'between'].includes(this.state)) return
    const compactQueue = dom.canvas.clientWidth < 520
    const visibleLimit = compactQueue ? 3 : 6
    const visible = this.shotQueue.slice(0, visibleLimit)
    const spacing = compactQueue ? 30 : 22
    const y = GROUND_Y - (compactQueue ? 20 : 14)
    for (let index = visible.length - 1; index >= 0; index -= 1) {
      const type = visible[index]
      const x = SLING_X - 44 - index * spacing
      const scale = compactQueue
        ? (index === 0 ? 1.04 : Math.max(0.9, 0.98 - index * 0.04))
        : (index === 0 ? 0.69 : Math.max(0.57, 0.63 - index * 0.012))
      ctx.fillStyle = 'rgba(8,21,15,.18)'
      ctx.beginPath(); ctx.ellipse(x, GROUND_Y - 5, 12 * scale, 3.3 * scale, 0, 0, Math.PI * 2); ctx.fill()
      if (index === 0) {
        ctx.strokeStyle = 'rgba(250,243,223,.88)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(x, y, compactQueue ? 21 : 15, 0, Math.PI * 2); ctx.stroke()
      }
      this.drawBird({
        id: `queue-${index}-${type}`, type, x, y, radius: BIRD_STYLE[type]?.radius || 15,
        rotation: 0, launched: false, used: false, splitClone: false,
      }, { queued: true, scale })
    }
    const hiddenCount = this.shotQueue.length - visible.length
    if (hiddenCount > 0) {
      const x = compactQueue
        ? SLING_X - 44 - (visible.length - 1) * spacing
        : SLING_X - 48 - visible.length * spacing
      const badgeY = compactQueue ? GROUND_Y - 63 : GROUND_Y - 31
      ctx.fillStyle = 'rgba(62,43,34,.9)'
      roundedRect(ctx, x - 16, badgeY, 32, 22, 7); ctx.fill()
      ctx.strokeStyle = 'rgba(234,217,180,.65)'; ctx.lineWidth = 1.2; ctx.stroke()
      ctx.fillStyle = ART.ivory
      ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(`+${hiddenCount}`, x, badgeY + 11)
    }
  }

  drawPlatformCarrier(carrier, platform) {
    const active = carrier.active
    const scale = platform.carrierKind === 'storm-glider' ? 1.08 : 1
    const carrierHp = platform.carrierHp?.[carrier.carrierIndex] ?? 0
    const carrierMaxHp = Math.max(1, platform.carrierMaxHp?.[carrier.carrierIndex] ?? 1)
    const damageRatio = 1 - clamp(carrierHp / carrierMaxHp, 0, 1)
    ctx.save()
    ctx.translate(carrier.x, carrier.y)
    ctx.rotate((carrier.rotation || 0) * Math.PI / 180)
    ctx.scale(scale, scale)
    ctx.globalAlpha = active ? 1 : 0.42
    ctx.strokeStyle = '#34261f'
    ctx.lineWidth = 2
    const tail = ctx.createLinearGradient(0, 10, 18, -8)
    tail.addColorStop(0, active ? '#6f4933' : '#514943')
    tail.addColorStop(0.55, active ? '#956f4f' : '#61564d')
    tail.addColorStop(1, active ? '#c39a6b' : '#766d64')
    ctx.fillStyle = tail
    ctx.beginPath(); ctx.ellipse(9, 1, 12, 9, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = 'rgba(247,224,185,.35)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(9, 1, 8, -1.2, 1.1); ctx.stroke()
    const body = ctx.createLinearGradient(-10, -8, 7, 10)
    body.addColorStop(0, active ? '#9f7653' : '#635c56')
    body.addColorStop(1, active ? '#65422f' : '#49433f')
    ctx.fillStyle = body; ctx.strokeStyle = '#34261f'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(-2, 2, 10, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = active ? '#e5d3ad' : '#9d9488'
    ctx.beginPath(); ctx.ellipse(-4, 4, 5.5, 4.2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#34261f'
    ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-7, -13); ctx.lineTo(-2, -6); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(5, -13); ctx.lineTo(7, -4); ctx.closePath(); ctx.fill()
    ctx.fillStyle = active ? '#f5f0df' : '#a8a39a'
    ctx.beginPath(); ctx.arc(-7, 0, 2.4, 0, Math.PI * 2); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1c2420'
    ctx.beginPath(); ctx.arc(-7, 0, 1.1, 0, Math.PI * 2); ctx.arc(0, 0, 1.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7.35, -0.35, .48, 0, Math.PI * 2); ctx.arc(-.35, -.35, .48, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f6e7ca'; ctx.strokeStyle = '#34261f'; ctx.lineWidth = 1
    ctx.fillRect(-5.2, 4.2, 2.3, 3.3); ctx.strokeRect(-5.2, 4.2, 2.3, 3.3)
    ctx.fillRect(-2.5, 4.2, 2.3, 3.3); ctx.strokeRect(-2.5, 4.2, 2.3, 3.3)
    const wingColor = platform.carrierKind === 'storm-glider' ? '#b9dce8' : '#d8c47d'
    ctx.fillStyle = platform.carrierKind === 'storm-glider' ? 'rgba(118,173,188,.54)' : 'rgba(170,153,94,.5)'
    ctx.strokeStyle = wingColor
    ctx.lineWidth = 1.6
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 4, 4)
      ctx.lineTo(side * 18, 1); ctx.lineTo(side * 15, 11); ctx.lineTo(side * 5, 7); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(235,247,232,.58)'; ctx.lineWidth = 0.9
      ctx.beginPath(); ctx.moveTo(side * 5, 5); ctx.lineTo(side * 15, 3)
      ctx.moveTo(side * 7, 6); ctx.lineTo(side * 14, 9); ctx.stroke()
      ctx.strokeStyle = wingColor; ctx.lineWidth = 1.6
    }
    ctx.strokeStyle = '#d0aa62'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-9, 5); ctx.quadraticCurveTo(-2, 10, 6, 6); ctx.stroke()
    if (damageRatio > 0) {
      ctx.strokeStyle = '#f0d9bd'; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(10, 3); ctx.lineTo(14, 6); ctx.lineTo(10, 9); ctx.stroke()
    }
    ctx.restore()
  }

  drawBrokenPlatformBoard(platform) {
    const alpha = clamp((platform.boardBreakTicks || 0) / 90, 0, 1)
    if (alpha <= 0) return
    ctx.save()
    ctx.translate(platform.x, platform.y)
    ctx.rotate((platform.rotation || 0) * Math.PI / 180)
    ctx.globalAlpha = alpha
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * platform.width * 0.27, Math.abs(side) * 3)
      ctx.rotate(side * 0.16)
      ctx.fillStyle = '#8d5935'; ctx.strokeStyle = '#3c281f'; ctx.lineWidth = 2
      roundedRect(ctx, -platform.width * 0.24, -platform.height / 2,
        platform.width * 0.48, platform.height, 3)
      ctx.fill(); ctx.stroke(); ctx.restore()
    }
    ctx.restore()
  }

  drawPlatform(platform) {
    const carriers = destructiblePlatformCarrierHitboxes(platform)
    const radians = (platform.rotation || 0) * Math.PI / 180
    for (const carrier of carriers) {
      if (carrier.active && !platform.destroyed) {
        const side = carrier.carrierIndex === 0 ? -1 : 1
        const attachX = platform.x + side * platform.width * 0.3 * Math.cos(radians)
          + platform.height * 0.5 * Math.sin(radians)
        const attachY = platform.y + side * platform.width * 0.3 * Math.sin(radians)
          - platform.height * 0.5 * Math.cos(radians)
        ctx.save(); ctx.strokeStyle = 'rgba(76,53,38,.82)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(carrier.x, carrier.y + carrier.height * 0.35)
        ctx.lineTo(attachX, attachY); ctx.stroke(); ctx.restore()
      }
      this.drawPlatformCarrier(carrier, platform)
    }
    if (platform.destroyed) {
      this.drawBrokenPlatformBoard(platform)
      return
    }
    ctx.save()
    ctx.translate(platform.x, platform.y)
    const visualKind = platform.specialVisualKind || 'wooden-platform'
    if (platform.cablePlatform && platform.cableIntegrity > 0) {
      ctx.strokeStyle = 'rgba(232,223,184,.72)'
      ctx.lineWidth = 2.2
      const intact = Math.min(2, platform.cableIntegrity)
      for (let index = 0; index < intact; index += 1) {
        const direction = index === 0 ? -1 : 1
        ctx.beginPath()
        ctx.moveTo(direction * platform.width * 0.34, -platform.height / 2)
        ctx.lineTo(direction * platform.width * 0.48, -platform.cableLength)
        ctx.stroke()
      }
    }
    ctx.rotate((platform.rotation || 0) * Math.PI / 180)
    ctx.shadowColor = 'rgba(8,21,15,.38)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 7
    roundedRect(ctx, -platform.width / 2, -platform.height / 2, platform.width, platform.height, 4)
    const body = ctx.createLinearGradient(0, -platform.height / 2, 0, platform.height / 2)
    const platformPalette = {
      'clock-pendulum': ['#d6b66b', '#756344', '#303d43'],
      'buoyant-raft': ['#b98452', '#4f6e69', '#2e4341'],
      'mirror-gate': ['#e9fbfa', '#85c7cf', '#6e72aa'],
      'mine-cart': ['#727b77', '#434b48', '#242b2a'],
      'skyport-deck': ['#7887a2', '#45516b', '#283247'],
      'wooden-platform': ['#bd7e48', '#8d5935', '#4f3427'],
    }[visualKind] || ['#bd7e48', '#8d5935', '#4f3427']
    body.addColorStop(0, platformPalette[0])
    body.addColorStop(0.48, platformPalette[1])
    body.addColorStop(1, platformPalette[2])
    ctx.fillStyle = body
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = visualKind === 'wooden-platform' || visualKind === 'buoyant-raft'
      ? '#3c281f' : '#263335'
    ctx.lineWidth = 2
    ctx.stroke()
    if (platform.reflective || visualKind === 'mirror-gate') {
      ctx.fillStyle = 'rgba(212,245,247,.48)'
      roundedRect(ctx, -platform.width / 2 + 4, -platform.height / 2 + 3, platform.width - 8, platform.height - 6, 3)
      ctx.fill()
    }
    ctx.fillStyle = visualKind === 'mirror-gate' ? '#dff8f6'
      : visualKind === 'mine-cart' ? '#b99755'
        : visualKind === 'skyport-deck' ? '#9fb1ca' : '#6f8d55'
    roundedRect(ctx, -platform.width / 2 + 2, -platform.height / 2 - 2, platform.width - 4, 5, 2)
    ctx.fill()
    if (visualKind === 'clock-pendulum') {
      ctx.strokeStyle = '#eed78d'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(0, 0, Math.min(7, platform.height * 0.32), 0, Math.PI * 2); ctx.stroke()
      for (let mark = 0; mark < 4; mark += 1) {
        const angle = mark * Math.PI / 2
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 3, Math.sin(angle) * 3)
        ctx.lineTo(Math.cos(angle) * 6, Math.sin(angle) * 6); ctx.stroke()
      }
    } else if (visualKind === 'buoyant-raft') {
      ctx.fillStyle = '#78a5a0'; ctx.strokeStyle = '#d5c17f'; ctx.lineWidth = 1
      for (const floatX of [-platform.width * 0.28, platform.width * 0.28]) {
        ctx.beginPath(); ctx.ellipse(floatX, platform.height / 2 + 2, 15, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(222,245,235,.62)'
      ctx.beginPath(); ctx.moveTo(-platform.width * 0.38, 1)
      ctx.quadraticCurveTo(-platform.width * 0.18, -4, 0, 1)
      ctx.quadraticCurveTo(platform.width * 0.18, 6, platform.width * 0.38, 1); ctx.stroke()
    } else if (visualKind === 'mirror-gate') {
      ctx.strokeStyle = 'rgba(255,255,255,.78)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(-platform.width * 0.35, platform.height * 0.28)
      ctx.lineTo(-platform.width * 0.08, -platform.height * 0.3)
      ctx.lineTo(platform.width * 0.18, platform.height * 0.28)
      ctx.lineTo(platform.width * 0.38, -platform.height * 0.22); ctx.stroke()
    } else if (visualKind === 'mine-cart') {
      ctx.strokeStyle = '#d0b16d'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(-platform.width * 0.42, -1); ctx.lineTo(platform.width * 0.42, -1); ctx.stroke()
      ctx.fillStyle = '#202725'
      for (const wheelX of [-platform.width * 0.28, platform.width * 0.28]) {
        ctx.beginPath(); ctx.arc(wheelX, platform.height / 2 + 2, 4, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#d0b16d'; ctx.stroke()
      }
    } else if (visualKind === 'skyport-deck') {
      ctx.fillStyle = 'rgba(29,38,54,.7)'
      for (const bandX of [-platform.width * 0.27, 0, platform.width * 0.27]) {
        roundedRect(ctx, bandX - 3, -platform.height / 2 + 1, 6, platform.height - 2, 1); ctx.fill()
      }
    } else {
      ctx.strokeStyle = 'rgba(245,201,111,.28)'
      ctx.lineWidth = 1
      for (let x = -platform.width / 2 + 18; x < platform.width / 2; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, -platform.height / 2 + 2); ctx.lineTo(x + 9, platform.height / 2 - 2); ctx.stroke()
      }
    }
    ctx.fillStyle = visualKind === 'mirror-gate' ? '#ffffff' : '#d7aa55'
    for (const boltX of [-platform.width / 2 + 9, platform.width / 2 - 9]) {
      ctx.beginPath(); ctx.arc(boltX, 0, 2, 0, Math.PI * 2); ctx.fill()
    }
    if (platform.boardHp < platform.boardMaxHp) {
      const damageRatio = 1 - platform.boardHp / Math.max(1, platform.boardMaxHp)
      ctx.strokeStyle = '#422b22'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(-platform.width * 0.12, -platform.height * 0.45)
      ctx.lineTo(-platform.width * (0.04 + damageRatio * 0.12), 0)
      ctx.lineTo(platform.width * 0.08, platform.height * 0.42); ctx.stroke()
    }
    ctx.restore()
  }

  drawSpecialArchitectureAccent(block, x, y) {
    const realm = block.architectureTheme
    if (!realm) return
    const role = String(block.architectureRole || '')
    const halfWidth = block.width / 2
    const halfHeight = block.height / 2
    ctx.save()
    ctx.shadowColor = 'transparent'
    if (realm === 'polar') {
      ctx.strokeStyle = 'rgba(244,215,135,.72)'; ctx.fillStyle = 'rgba(79,96,98,.74)'; ctx.lineWidth = 1.35
      const radius = Math.max(3, Math.min(9, Math.min(block.width, block.height) * 0.22))
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      if (/gear|bell|clock|escapement|pendulum/u.test(role)) {
        for (let mark = 0; mark < 6; mark += 1) {
          const angle = mark / 6 * Math.PI * 2
          ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
          ctx.lineTo(Math.cos(angle) * (radius + 3), Math.sin(angle) * (radius + 3)); ctx.stroke()
        }
      }
    } else if (realm === 'tide') {
      ctx.strokeStyle = 'rgba(167,229,216,.68)'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(x + 5, 1)
      ctx.quadraticCurveTo(-halfWidth * 0.35, -4, 0, 1)
      ctx.quadraticCurveTo(halfWidth * 0.35, 6, -x - 5, 1); ctx.stroke()
      ctx.fillStyle = '#d9b66e'
      for (const rivetX of [-halfWidth + 7, halfWidth - 7]) {
        ctx.beginPath(); ctx.arc(rivetX, Math.min(halfHeight - 5, 0), 1.7, 0, Math.PI * 2); ctx.fill()
      }
    } else if (realm === 'mirror') {
      const facet = ctx.createLinearGradient(x, y, -x, -y)
      facet.addColorStop(0, 'rgba(255,255,255,.06)')
      facet.addColorStop(0.52, 'rgba(216,255,252,.48)')
      facet.addColorStop(1, 'rgba(191,154,238,.12)')
      ctx.fillStyle = facet
      ctx.beginPath(); ctx.moveTo(x + 4, halfHeight - 5); ctx.lineTo(0, y + 4)
      ctx.lineTo(-x - 5, -halfHeight + 5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.66)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(x + 5, -halfHeight * 0.2); ctx.lineTo(0, halfHeight * 0.26); ctx.lineTo(-x - 5, -halfHeight * 0.16); ctx.stroke()
    } else if (realm === 'root') {
      ctx.strokeStyle = 'rgba(224,177,94,.66)'; ctx.fillStyle = 'rgba(38,45,42,.72)'; ctx.lineWidth = 1.2
      const railY = Math.max(y + 4, -2)
      ctx.beginPath(); ctx.moveTo(x + 5, railY); ctx.lineTo(-x - 5, railY); ctx.stroke()
      if (/cart|rail|mine|fault|pit/u.test(role)) {
        for (const wheelX of [-Math.min(halfWidth * 0.42, 10), Math.min(halfWidth * 0.42, 10)]) {
          ctx.beginPath(); ctx.arc(wheelX, Math.min(halfHeight - 4, 5), 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        }
      }
    } else if (realm === 'storm') {
      ctx.fillStyle = 'rgba(35,49,67,.68)'; ctx.strokeStyle = 'rgba(183,211,222,.58)'; ctx.lineWidth = 1
      const bandWidth = Math.max(4, Math.min(8, block.width * 0.12))
      roundedRect(ctx, -bandWidth / 2, y + 3, bandWidth, block.height - 6, 1); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#d2b36e'
      for (const rivetY of [-Math.min(halfHeight * 0.42, 8), Math.min(halfHeight * 0.42, 8)]) {
        ctx.beginPath(); ctx.arc(0, rivetY, 1.6, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }

  drawConstructionMaterialAccent(block, x, y) {
    const constructionId = block.constructionId
    const construction = CONSTRUCTION_MATERIALS[constructionId]
    const visual = construction?.visual
    if (!visual) return
    const inset = clamp(Math.min(block.width, block.height) * 0.04, 0.8, 2)
    const left = x + inset
    const top = y + inset
    const width = Math.max(1, block.width - inset * 2)
    const height = Math.max(1, block.height - inset * 2)
    const right = left + width
    const bottom = top + height

    ctx.save()
    ctx.shadowColor = 'transparent'
    roundedRect(ctx, left, top, width, height, Math.min(3, inset))
    ctx.clip()

    if (constructionId === 'canvas-screen') {
      const fabric = ctx.createLinearGradient(left, top, right, bottom)
      fabric.addColorStop(0, visual.highlight)
      fabric.addColorStop(0.52, visual.fill)
      fabric.addColorStop(1, visual.shadow)
      ctx.fillStyle = fabric
      ctx.fillRect(left, top, width, height)
      const weaveStep = Math.max(5, Math.min(9, Math.min(width, height) * 0.28))
      ctx.strokeStyle = 'rgba(255,246,211,.28)'
      ctx.lineWidth = 0.8
      for (let offset = left - height; offset < right; offset += weaveStep) {
        ctx.beginPath(); ctx.moveTo(offset, top); ctx.lineTo(offset + height, bottom); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(91,65,42,.36)'
      ctx.setLineDash([2, 2.5])
      for (const seamY of [top + height * 0.28, top + height * 0.72]) {
        ctx.beginPath(); ctx.moveTo(left + 2, seamY); ctx.lineTo(right - 2, seamY); ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(255,247,217,.48)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(left + 2, top + height * 0.5)
      ctx.bezierCurveTo(left + width * 0.34, top + height * 0.37,
        left + width * 0.66, top + height * 0.63, right - 2, top + height * 0.48)
      ctx.stroke()
    } else if (constructionId === 'resin-timber') {
      const resin = ctx.createLinearGradient(left, bottom, right, top)
      resin.addColorStop(0, visual.shadow)
      resin.addColorStop(0.42, visual.fill)
      resin.addColorStop(0.68, visual.highlight)
      resin.addColorStop(1, visual.shadow)
      ctx.fillStyle = resin
      ctx.fillRect(left, top, width, height)
      ctx.strokeStyle = 'rgba(255,220,137,.56)'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(left + 3, top + height * 0.28)
      ctx.bezierCurveTo(left + width * 0.32, top + height * 0.08,
        left + width * 0.62, top + height * 0.48, right - 3, top + height * 0.2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(83,39,21,.44)'
      ctx.lineWidth = 0.9
      for (const ratio of [0.46, 0.72]) {
        ctx.beginPath()
        ctx.moveTo(left + 3, top + height * ratio)
        ctx.bezierCurveTo(left + width * 0.3, top + height * (ratio - 0.12),
          left + width * 0.7, top + height * (ratio + 0.1), right - 3, top + height * ratio)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,206,96,.58)'
      for (const [dropX, dropY, radius] of [
        [left + width * 0.24, top + height * 0.64, 2.2],
        [left + width * 0.78, top + height * 0.38, 1.55],
      ]) {
        ctx.beginPath(); ctx.arc(dropX, dropY, Math.min(radius, height * 0.12), 0, Math.PI * 2); ctx.fill()
      }
    } else if (constructionId === 'packed-earth') {
      const earth = ctx.createLinearGradient(left, top, right, bottom)
      earth.addColorStop(0, visual.shadow)
      earth.addColorStop(0.52, visual.fill)
      earth.addColorStop(1, visual.shadow)
      ctx.fillStyle = earth
      ctx.fillRect(left, top, width, height)
      const courseStep = Math.max(6, Math.min(12, height / 3))
      ctx.strokeStyle = 'rgba(70,45,32,.52)'
      ctx.lineWidth = 1.1
      for (let courseY = top + courseStep; courseY < bottom; courseY += courseStep) {
        ctx.beginPath()
        ctx.moveTo(left, courseY)
        ctx.quadraticCurveTo(left + width * 0.28, courseY - 1.8,
          left + width * 0.53, courseY + 0.8)
        ctx.quadraticCurveTo(left + width * 0.76, courseY + 2, right, courseY - 0.7)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(226,178,105,.48)'
      for (const [pebbleX, pebbleY, radius] of [
        [0.18, 0.24, 1.5], [0.68, 0.2, 1.1], [0.39, 0.58, 1.3], [0.82, 0.73, 1.65],
      ]) {
        ctx.beginPath()
        ctx.ellipse(left + width * pebbleX, top + height * pebbleY,
          Math.min(radius * 1.45, width * 0.06), Math.min(radius, height * 0.08), 0.25, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(66,42,30,.42)'
      ctx.beginPath()
      ctx.moveTo(left + width * 0.58, top)
      ctx.lineTo(left + width * 0.54, top + height * 0.2)
      ctx.lineTo(left + width * 0.61, top + height * 0.34)
      ctx.stroke()
    } else if (constructionId === 'resin-glass') {
      const glass = ctx.createLinearGradient(left, bottom, right, top)
      glass.addColorStop(0, visual.shadow)
      glass.addColorStop(0.44, visual.fill)
      glass.addColorStop(0.72, 'rgba(221,247,235,.86)')
      glass.addColorStop(1, visual.shadow)
      ctx.fillStyle = glass
      ctx.fillRect(left, top, width, height)
      ctx.fillStyle = 'rgba(255,248,209,.17)'
      ctx.beginPath()
      ctx.moveTo(left, bottom)
      ctx.lineTo(left + width * 0.42, top)
      ctx.lineTo(left + width * 0.68, top)
      ctx.lineTo(left + width * 0.28, bottom)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(236,255,240,.7)'
      ctx.lineWidth = 1.15
      ctx.beginPath()
      ctx.moveTo(left + 3, bottom - 3)
      ctx.lineTo(left + width * 0.42, top + 3)
      ctx.lineTo(right - 3, top + height * 0.58)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(116,75,43,.42)'
      ctx.beginPath()
      ctx.moveTo(left + width * 0.42, top + 3)
      ctx.lineTo(left + width * 0.55, bottom - 3)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,218,130,.62)'
      for (const [bubbleX, bubbleY, radius] of [
        [0.2, 0.3, 1.6], [0.72, 0.72, 2.1], [0.82, 0.22, 1.1],
      ]) {
        ctx.beginPath(); ctx.arc(left + width * bubbleX, top + height * bubbleY,
          Math.min(radius, Math.min(width, height) * 0.09), 0, Math.PI * 2); ctx.fill()
      }
    } else if (constructionId === 'leaf-iron-plate') {
      const intact = !block.maxArmorHp || block.armorHp > 0
      if (!intact) {
        ctx.restore()
        return
      }
      const plate = ctx.createLinearGradient(left, top, right, bottom)
      plate.addColorStop(0, intact ? visual.shadow : 'rgba(65,68,61,.75)')
      plate.addColorStop(0.5, intact ? visual.fill : 'rgba(93,83,68,.72)')
      plate.addColorStop(1, intact ? visual.shadow : 'rgba(49,49,45,.75)')
      ctx.fillStyle = plate
      ctx.fillRect(left, top, width, height)
      ctx.strokeStyle = intact ? 'rgba(197,205,169,.62)' : 'rgba(156,139,106,.45)'
      ctx.lineWidth = 1.25
      roundedRect(ctx, left + 1.5, top + 1.5, width - 3, height - 3, 2); ctx.stroke()
      const leafWidth = Math.max(4, Math.min(14, width * 0.24))
      const leafHeight = Math.max(4, Math.min(14, height * 0.32))
      ctx.strokeStyle = intact ? 'rgba(196,214,160,.72)' : 'rgba(158,145,112,.46)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(-leafWidth, leafHeight * 0.35)
      ctx.quadraticCurveTo(-leafWidth * 0.35, -leafHeight, 0, -leafHeight)
      ctx.quadraticCurveTo(leafWidth * 0.85, -leafHeight * 0.42, leafWidth, leafHeight * 0.35)
      ctx.quadraticCurveTo(leafWidth * 0.25, leafHeight, 0, leafHeight)
      ctx.quadraticCurveTo(-leafWidth * 0.7, leafHeight * 0.82, -leafWidth, leafHeight * 0.35)
      ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-leafWidth * 0.75, leafHeight * 0.28); ctx.lineTo(leafWidth * 0.78, -leafHeight * 0.42); ctx.stroke()
      ctx.fillStyle = intact ? '#d2b96c' : '#826f50'
      const rivetInset = Math.min(5, Math.min(width, height) * 0.2)
      for (const rivetX of [left + rivetInset, right - rivetInset]) {
        for (const rivetY of [top + rivetInset, bottom - rivetInset]) {
          ctx.beginPath(); ctx.arc(rivetX, rivetY, 1.45, 0, Math.PI * 2); ctx.fill()
        }
      }
      if (!intact) {
        ctx.strokeStyle = 'rgba(39,33,28,.72)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(left + width * 0.18, top); ctx.lineTo(left + width * 0.48, bottom)
        ctx.lineTo(left + width * 0.76, top + height * 0.34); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawConstructionIdentityMark(block, x, y) {
    const constructionId = block.constructionId
    const visual = CONSTRUCTION_MATERIALS[constructionId]?.visual
    if (!visual) return
    const inset = clamp(Math.min(block.width, block.height) * 0.1, 2, 4.5)
    const left = x + inset
    const top = y + inset
    const right = -x - inset
    const bottom = -y - inset
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    const detailScale = clamp(Math.min(width, height) / 18, 0.56, 1.2)
    const leafPath = (centerX, centerY, direction = 1, scale = 1) => {
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(-0.52 * direction)
      ctx.scale(direction, 1)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(3.4 * scale, -6.4 * scale, 9 * scale, -5.5 * scale, 10 * scale, 0)
      ctx.bezierCurveTo(6.7 * scale, 4.6 * scale, 2.2 * scale, 4 * scale, 0, 0)
      ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(1 * scale, 0); ctx.lineTo(8 * scale, -1.1 * scale); ctx.stroke()
      ctx.restore()
    }
    const sparkPath = (centerX, centerY, radius) => {
      ctx.beginPath()
      for (let point = 0; point < 8; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 4
        const reach = point % 2 === 0 ? radius : radius * 0.34
        const sparkX = centerX + Math.cos(angle) * reach
        const sparkY = centerY + Math.sin(angle) * reach
        if (point === 0) ctx.moveTo(sparkX, sparkY)
        else ctx.lineTo(sparkX, sparkY)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
    }

    ctx.save()
    ctx.shadowColor = 'transparent'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (constructionId === 'canvas-screen') {
      const capWidth = clamp(width * 0.07, 2, 4.5)
      ctx.fillStyle = visual.accent
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 1
      for (const capX of [left, right - capWidth]) {
        roundedRect(ctx, capX, top, capWidth, height, Math.min(2, capWidth * 0.45)); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = visual.line
      ctx.lineWidth = 1.2 * detailScale
      ctx.beginPath()
      ctx.moveTo(left + capWidth + 1, top + 1); ctx.lineTo(right - capWidth - 1, bottom - 1)
      ctx.moveTo(right - capWidth - 1, top + 1); ctx.lineTo(left + capWidth + 1, bottom - 1)
      ctx.stroke()
      ctx.strokeStyle = visual.highlight
      ctx.setLineDash([2, 2.8])
      roundedRect(ctx, left + capWidth + 1, top + 1,
        Math.max(1, width - capWidth * 2 - 2), Math.max(1, height - 2), 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = visual.line
      ctx.beginPath(); ctx.moveTo(left + capWidth + 1, top + height * 0.5)
      ctx.bezierCurveTo(left + width * 0.34, top + height * 0.36,
        left + width * 0.66, top + height * 0.64, right - capWidth - 1, top + height * 0.48); ctx.stroke()
    } else if (constructionId === 'resin-timber') {
      ctx.fillStyle = visual.accent
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 0.8
      for (const [dropX, dropHeight] of [
        [left + width * 0.25, clamp(height * 0.34, 3, 7)],
        [left + width * 0.76, clamp(height * 0.24, 2.5, 5.5)],
      ]) {
        const dropWidth = clamp(dropHeight * 0.5, 1.5, 3.5)
        ctx.beginPath(); ctx.moveTo(dropX - dropWidth, bottom - 2); ctx.lineTo(dropX + dropWidth, bottom - 2)
        ctx.quadraticCurveTo(dropX + dropWidth * 0.75, bottom + dropHeight * 0.65, dropX, bottom + dropHeight)
        ctx.quadraticCurveTo(dropX - dropWidth * 0.75, bottom + dropHeight * 0.65, dropX - dropWidth, bottom - 2)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.fillStyle = visual.secondary
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 0.75
      leafPath(left + width * 0.58, top + height * 0.55, 1, clamp(detailScale * 0.62, 0.38, 0.72))
    } else if (constructionId === 'packed-earth') {
      const courses = Math.max(2, Math.min(4, Math.round(height / 9)))
      const courseHeight = height / courses
      ctx.strokeStyle = visual.line
      ctx.lineWidth = 1.15
      for (let course = 1; course < courses; course += 1) {
        const courseY = top + courseHeight * course
        ctx.beginPath(); ctx.moveTo(left, courseY); ctx.lineTo(right, courseY); ctx.stroke()
      }
      for (let course = 0; course < courses; course += 1) {
        const seamX = left + width * (course % 2 === 0 ? 0.42 : 0.66)
        ctx.beginPath(); ctx.moveTo(seamX, top + courseHeight * course)
        ctx.lineTo(seamX, top + courseHeight * (course + 1)); ctx.stroke()
      }
      ctx.strokeStyle = visual.accent
      ctx.fillStyle = visual.accent
      ctx.beginPath(); ctx.moveTo(left + width * 0.18, bottom - 1)
      ctx.bezierCurveTo(left + width * 0.34, top + height * 0.68,
        left + width * 0.38, top + height * 0.46, left + width * 0.5, top + height * 0.34); ctx.stroke()
      leafPath(left + width * 0.5, top + height * 0.34, 1, clamp(detailScale * 0.48, 0.32, 0.58))
    } else if (constructionId === 'resin-glass') {
      const bandHeight = clamp(height * 0.17, 2.2, 5)
      ctx.fillStyle = visual.accent
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 0.8
      for (const bandY of [top, bottom - bandHeight]) {
        roundedRect(ctx, left + 1, bandY, Math.max(1, width - 2), bandHeight, 1.4); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = visual.line
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(left + 2, top + height * 0.52); ctx.lineTo(right - 2, top + height * 0.52); ctx.stroke()
      ctx.strokeStyle = visual.highlight
      ctx.lineWidth = 1.7
      ctx.beginPath(); ctx.moveTo(left + 3, bottom - 3); ctx.lineTo(left + width * 0.42, top + 3)
      ctx.moveTo(left + width * 0.62, bottom - 3); ctx.lineTo(right - 3, top + height * 0.28); ctx.stroke()
      ctx.fillStyle = visual.secondary
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 0.65
      sparkPath(right - clamp(width * 0.12, 4, 8), top + clamp(height * 0.23, 3.5, 7),
        clamp(detailScale * 3.1, 2.2, 4.1))
    } else if (constructionId === 'leaf-iron-plate') {
      const armorRatio = block.maxArmorHp ? clamp(block.armorHp / block.maxArmorHp, 0, 1) : 1
      ctx.globalAlpha = armorRatio > 0 ? 0.9 : 0.45
      ctx.fillStyle = armorRatio > 0 ? visual.fill : '#6b6252'
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 1.55
      ctx.beginPath(); ctx.moveTo(left + 1, top); ctx.lineTo(right - 1, top)
      ctx.lineTo(right, top + height * 0.62); ctx.lineTo(left + width * 0.5, bottom)
      ctx.lineTo(left, top + height * 0.62); ctx.closePath()
      if (armorRatio > 0) ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.strokeStyle = armorRatio > 0 ? visual.line : '#9a8767'
      ctx.lineWidth = 1.1
      ctx.beginPath(); ctx.moveTo(left + width * 0.5, top + 1); ctx.lineTo(left + width * 0.5, bottom - 1)
      ctx.moveTo(left + 1, top + 1); ctx.lineTo(left + width * 0.5, top + height * 0.42); ctx.lineTo(right - 1, top + 1)
      ctx.moveTo(left + 1, top + height * 0.64); ctx.lineTo(right - 1, top + height * 0.64); ctx.stroke()
      ctx.fillStyle = armorRatio > 0 ? visual.secondary : '#756a55'
      leafPath(left + width * 0.5, top + height * 0.48, 1, clamp(detailScale * 0.52, 0.34, 0.64))
      leafPath(left + width * 0.5, top + height * 0.48, -1, clamp(detailScale * 0.52, 0.34, 0.64))
      const rivets = [
        [left + clamp(width * 0.14, 3.5, 7), top + clamp(height * 0.16, 3, 6)],
        [right - clamp(width * 0.14, 3.5, 7), top + clamp(height * 0.16, 3, 6)],
        [left + width * 0.5, bottom - clamp(height * 0.14, 3, 6)],
      ]
      const visibleRivets = armorRatio >= 0.75 ? 3 : armorRatio > 0 ? 2 : 0
      ctx.fillStyle = visual.accent
      ctx.strokeStyle = visual.outline
      ctx.lineWidth = 0.75
      for (let index = 0; index < rivets.length; index += 1) {
        const [rivetX, rivetY] = rivets[index]
        ctx.beginPath(); ctx.arc(rivetX, rivetY, clamp(detailScale * 1.5, 1.2, 2.1), 0, Math.PI * 2)
        if (index < visibleRivets) { ctx.fill(); ctx.stroke() }
        else { ctx.fillStyle = 'rgba(34,31,27,.62)'; ctx.fill(); ctx.fillStyle = visual.accent }
      }
      if (armorRatio <= 0) {
        ctx.strokeStyle = 'rgba(39,33,28,.82)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(left + width * 0.18, top); ctx.lineTo(left + width * 0.48, bottom)
        ctx.lineTo(left + width * 0.76, top + height * 0.34); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawStructureJointHardware() {
    if (!this.structureJoints.length) return
    const blocksById = new Map(this.blocks.map((block) => [block.id, block]))
    for (const joint of this.structureJoints) {
      if (joint.broken || ![
        'nail', 'masonry', 'resin-bond', 'root-bond', 'iron-clamp',
      ].includes(joint.kind)) continue
      const first = blocksById.get(joint.firstId)
      const second = blocksById.get(joint.secondId)
      if (!first || !second) continue
      const firstBounds = rotatedRectBounds(first)
      const secondBounds = rotatedRectBounds(second)
      const overlapCenter = (firstMin, firstMax, secondMin, secondMax, fallback) => {
        const overlapStart = Math.max(firstMin, secondMin)
        const overlapEnd = Math.min(firstMax, secondMax)
        return overlapEnd >= overlapStart ? (overlapStart + overlapEnd) / 2 : fallback
      }
      let jointX
      let jointY
      let seamAngle
      if (joint.contact === 'bearing') {
        const upperBounds = first.y <= second.y ? firstBounds : secondBounds
        const lowerBounds = first.y <= second.y ? secondBounds : firstBounds
        jointX = overlapCenter(
          firstBounds.left, firstBounds.right, secondBounds.left, secondBounds.right,
          (first.x + second.x) / 2,
        )
        jointY = (upperBounds.bottom + lowerBounds.top) / 2
        seamAngle = 0
      } else {
        const leftBounds = first.x <= second.x ? firstBounds : secondBounds
        const rightBounds = first.x <= second.x ? secondBounds : firstBounds
        jointX = (leftBounds.right + rightBounds.left) / 2
        jointY = overlapCenter(
          firstBounds.top, firstBounds.bottom, secondBounds.top, secondBounds.bottom,
          (first.y + second.y) / 2,
        )
        seamAngle = Math.PI / 2
      }
      ctx.save()
      ctx.translate(jointX, jointY)
      ctx.rotate(seamAngle)
      ctx.shadowColor = 'rgba(22,25,21,.28)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1.5
      const contactSpan = joint.contact === 'bearing'
        ? Math.min(first.width, second.width)
        : Math.min(first.height, second.height)
      const mortarLength = clamp(contactSpan * 0.9, 16, 44)
      if (joint.kind === 'nail') {
        // A leaf-iron strap makes the two nails read as one physical clamp at
        // battle zoom, matching the much larger field-guide silhouette.
        ctx.fillStyle = '#536e55'
        ctx.strokeStyle = '#3e2b22'
        ctx.lineWidth = 1.2
        roundedRect(ctx, -11, -3.2, 22, 6.4, 2.6); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#f2b84d'
        ctx.strokeStyle = '#3e2b22'
        ctx.lineWidth = 1.2
        for (const rivetX of [-4, 4]) {
          ctx.beginPath(); ctx.arc(rivetX, 0, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
          ctx.strokeStyle = '#74512c'
          ctx.lineWidth = 0.9
          ctx.beginPath(); ctx.moveTo(rivetX - 1.3, 0); ctx.lineTo(rivetX + 1.3, 0); ctx.stroke()
          ctx.strokeStyle = '#3e2b22'
          ctx.lineWidth = 1.2
        }
      } else if (joint.kind === 'resin-bond') {
        const amber = '#e0aa3f'
        const resinDropXs = [-mortarLength * 0.3, mortarLength * 0.22]
        ctx.fillStyle = 'rgba(224,170,63,.9)'
        ctx.strokeStyle = '#6b3d22'
        ctx.lineWidth = 1.2
        roundedRect(ctx, -mortarLength / 2, -3.8, mortarLength, 7.6, 3.4); ctx.fill(); ctx.stroke()
        ctx.fillStyle = amber
        for (const resinDropX of resinDropXs) {
          ctx.beginPath()
          ctx.moveTo(resinDropX - 2.6, 2)
          ctx.quadraticCurveTo(resinDropX, 8.8, resinDropX + 2.8, 2)
          ctx.closePath(); ctx.fill(); ctx.stroke()
        }
        ctx.fillStyle = '#728b55'
        ctx.beginPath(); ctx.ellipse(0, -1, 4.4, 2.2, -0.35, 0, Math.PI * 2); ctx.fill()
      } else if (joint.kind === 'root-bond') {
        const rootStrands = [-0.3, 0, 0.3]
        ctx.fillStyle = '#b18b69'
        ctx.strokeStyle = '#4e5556'
        ctx.lineWidth = 1.1
        roundedRect(ctx, -mortarLength / 2, -4, mortarLength, 8, 3); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#637853'
        ctx.lineWidth = 1.5
        for (const rootStrand of rootStrands) {
          const rootX = mortarLength * rootStrand
          ctx.beginPath(); ctx.moveTo(rootX - 5, -4.2)
          ctx.bezierCurveTo(rootX - 2, -0.5, rootX + 2, 0.5, rootX + 5, 4.2)
          ctx.stroke()
        }
      } else if (joint.kind === 'iron-clamp') {
        const clampLength = clamp(contactSpan * 0.82, 22, 40)
        const rivetXs = [-clampLength * 0.31, 0, clampLength * 0.31]
        ctx.fillStyle = '#3f6259'
        ctx.strokeStyle = '#2b3834'
        ctx.lineWidth = 1.5
        roundedRect(ctx, -clampLength / 2, -4.6, clampLength, 9.2, 3); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#f2b84d'
        for (const rivetX of rivetXs) {
          ctx.beginPath(); ctx.arc(rivetX, 0, 2.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        }
        ctx.strokeStyle = '#d8dfbd'; ctx.lineWidth = 0.9
        ctx.beginPath(); ctx.moveTo(-clampLength * 0.4, -2)
        ctx.lineTo(clampLength * 0.4, -2); ctx.stroke()
      } else if (joint.kind === 'masonry') {
        ctx.fillStyle = '#d6d0bb'
        ctx.strokeStyle = '#4e5556'
        ctx.lineWidth = 1.2
        roundedRect(ctx, -mortarLength / 2, -4, mortarLength, 8, 3); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#8b8069'
        ctx.lineWidth = 1
        for (const fiberX of [-mortarLength * 0.28, 0, mortarLength * 0.28]) {
          ctx.beginPath(); ctx.moveTo(fiberX - 3, -3.2)
          ctx.quadraticCurveTo(fiberX, 0.8, fiberX + 3, 3.2); ctx.stroke()
        }
      }
      ctx.restore()
    }
  }

  drawArchitectureLandmarkAccent(block, x, y) {
    const kind = block.landmarkKind
    if (!kind) return
    const left = x
    const right = -x
    const top = y
    const bottom = -y
    const width = block.width
    const height = block.height
    const reach = Math.min(14, Math.max(6, Math.min(width, height) * 0.48))
    const outline = '#303b35'
    const timber = '#75462c'
    const darkTimber = '#4f3024'
    const brass = '#d3b568'
    const parchment = '#ead8a3'
    const pine = '#446858'
    const banner = '#9e4f43'
    const stone = '#79817a'
    const frost = '#d8f1ec'

    ctx.save()
    ctx.shadowColor = 'rgba(18,27,23,.24)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.6
    ctx.strokeStyle = outline

    if (kind === 'granary-ridge') {
      ctx.fillStyle = darkTimber
      ctx.beginPath()
      ctx.moveTo(left - reach * 0.45, top + 3)
      ctx.lineTo(0, top - reach)
      ctx.lineTo(right + reach * 0.45, top + 3)
      ctx.lineTo(right - 2, bottom - 2)
      ctx.lineTo(left + 2, bottom - 2)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(231,190,115,.72)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(0, top - reach + 2); ctx.lineTo(0, bottom - 2); ctx.stroke()
      ctx.fillStyle = brass
      ctx.beginPath(); ctx.ellipse(0, top - reach - 1, 3.5, 4.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    } else if (kind === 'loading-sign') {
      ctx.strokeStyle = darkTimber; ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(left - reach * 0.55, top - 3); ctx.lineTo(right + reach * 0.55, top - 3); ctx.stroke()
      ctx.strokeStyle = 'rgba(77,54,35,.82)'; ctx.lineWidth = 1.2
      for (const chainX of [-width * 0.27, width * 0.27]) {
        ctx.beginPath(); ctx.moveTo(chainX, top - 3); ctx.lineTo(chainX, top + height * 0.22); ctx.stroke()
      }
      ctx.fillStyle = parchment
      roundedRect(ctx, left - 2, top + height * 0.18, width + 4, height * 0.7, 3); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = '#79553a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(left + 4, height * 0.08); ctx.lineTo(right - 6, height * 0.08)
      ctx.moveTo(right - 10, height * 0.08 - 4); ctx.lineTo(right - 5, height * 0.08); ctx.lineTo(right - 10, height * 0.08 + 4); ctx.stroke()
    } else if (kind === 'slope-marker') {
      ctx.fillStyle = '#caa15e'
      ctx.beginPath()
      ctx.moveTo(left - reach * 0.35, bottom)
      ctx.lineTo(right + reach * 0.35, bottom)
      ctx.lineTo(right - 1, top - reach * 0.5)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = '#f2dfaa'; ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(left + 3, bottom - 4); ctx.lineTo(right - 5, top + 3)
      ctx.lineTo(right - 10, top + 4); ctx.moveTo(right - 5, top + 3); ctx.lineTo(right - 5, top + 8); ctx.stroke()
    } else if (kind === 'wind-vane') {
      ctx.strokeStyle = darkTimber; ctx.lineWidth = 2.4
      ctx.beginPath(); ctx.moveTo(0, bottom + 3); ctx.lineTo(0, top - reach); ctx.stroke()
      const vaneY = top - reach * 0.58
      ctx.strokeStyle = brass; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.moveTo(-reach - 5, vaneY); ctx.lineTo(reach + 6, vaneY); ctx.stroke()
      ctx.fillStyle = brass
      ctx.beginPath(); ctx.moveTo(reach + 7, vaneY); ctx.lineTo(reach, vaneY - 4); ctx.lineTo(reach, vaneY + 4); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = banner
      ctx.beginPath(); ctx.moveTo(-reach - 5, vaneY); ctx.lineTo(-reach + 1, vaneY - 5)
      ctx.lineTo(-reach + 2, vaneY + 5); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, vaneY, 2.5, 0, Math.PI * 2); ctx.fill()
    } else if (kind === 'hoist-hook') {
      const wheelRadius = Math.max(4, Math.min(8, width * 0.32))
      ctx.fillStyle = darkTimber
      ctx.beginPath(); ctx.arc(0, top + wheelRadius + 1, wheelRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, top + wheelRadius + 1, wheelRadius * 0.36, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#55463a'; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.moveTo(wheelRadius * 0.52, top + wheelRadius + 2); ctx.lineTo(2, bottom + reach * 0.55); ctx.stroke()
      ctx.strokeStyle = brass; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(2, bottom + reach * 0.48, reach * 0.38, -Math.PI / 2, Math.PI * 0.8); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(2 - reach * 0.28, bottom + reach * 0.76); ctx.lineTo(2 - reach * 0.42, bottom + reach * 0.42); ctx.stroke()
    } else if (kind === 'command-crest') {
      ctx.fillStyle = banner
      ctx.beginPath()
      ctx.moveTo(left - reach * 0.35, top - 3); ctx.lineTo(right + reach * 0.35, top - 3)
      ctx.lineTo(right - 1, bottom * 0.42); ctx.quadraticCurveTo(0, bottom + reach * 0.48, left + 1, bottom * 0.42)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(4, width * 0.16), Math.max(5, height * 0.24), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = parchment; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(0, -height * 0.18); ctx.lineTo(0, height * 0.2)
      ctx.moveTo(0, -height * 0.05); ctx.lineTo(-4, height * 0.08)
      ctx.moveTo(0, height * 0.02); ctx.lineTo(4, height * 0.16); ctx.stroke()
    } else if (kind === 'gantry-boom') {
      const boomLeft = left - reach * 0.55
      const boomRight = right + reach
      ctx.fillStyle = darkTimber
      ctx.beginPath(); ctx.moveTo(boomLeft, bottom - 2); ctx.lineTo(boomRight, top + 2)
      ctx.lineTo(boomRight - 2, bottom - 2); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = brass; ctx.lineWidth = 1.1
      for (let trussX = boomLeft + 8; trussX < boomRight - 3; trussX += 12) {
        ctx.beginPath(); ctx.moveTo(trussX, bottom - 3); ctx.lineTo(trussX + 7, top + 3); ctx.stroke()
      }
      ctx.strokeStyle = '#5a4a3d'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(boomRight - 2, bottom - 3); ctx.lineTo(boomRight - 2, bottom + reach * 0.7); ctx.stroke()
      ctx.strokeStyle = brass; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(boomRight - 2, bottom + reach * 0.66, 3, -Math.PI / 2, Math.PI * 0.8); ctx.stroke()
    } else if (kind === 'saw-bearing') {
      const radius = Math.max(6, Math.min(width, height) * 0.36)
      ctx.fillStyle = '#68736e'; ctx.strokeStyle = outline; ctx.lineWidth = 1.4
      for (let tooth = 0; tooth < 12; tooth += 1) {
        const angle = tooth / 12 * Math.PI * 2
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        ctx.lineTo(Math.cos(angle - 0.08) * (radius + 4), Math.sin(angle - 0.08) * (radius + 4))
        ctx.lineTo(Math.cos(angle + 0.08) * (radius + 4), Math.sin(angle + 0.08) * (radius + 4)); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(231,224,191,.52)'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2); ctx.stroke()
    } else if (kind === 'lift-pulley') {
      const pulleyRadius = Math.max(4, Math.min(6.5, width * 0.36))
      ctx.strokeStyle = '#594a3e'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(-pulleyRadius, top - reach * 0.25); ctx.lineTo(-pulleyRadius, bottom + reach * 0.4)
      ctx.moveTo(pulleyRadius, top - reach * 0.25); ctx.lineTo(pulleyRadius, bottom + reach * 0.18); ctx.stroke()
      for (const pulleyY of [top + pulleyRadius, bottom - pulleyRadius]) {
        ctx.fillStyle = darkTimber; ctx.beginPath(); ctx.arc(0, pulleyY, pulleyRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, pulleyY, 1.8, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = stone
      roundedRect(ctx, -pulleyRadius - 3, bottom + reach * 0.1, pulleyRadius * 2 + 6, reach * 0.48, 2); ctx.fill(); ctx.stroke()
    } else if (kind === 'lock-crystal') {
      const crystalTop = top - reach * 0.7
      const crystalBottom = bottom + reach * 0.35
      const crystalWidth = Math.min(width * 0.48, 12)
      const crystal = ctx.createLinearGradient(-crystalWidth, crystalBottom, crystalWidth, crystalTop)
      crystal.addColorStop(0, 'rgba(76,161,169,.92)'); crystal.addColorStop(0.5, frost); crystal.addColorStop(1, '#dfbe72')
      ctx.fillStyle = crystal
      ctx.beginPath(); ctx.moveTo(0, crystalTop); ctx.lineTo(crystalWidth, -2)
      ctx.lineTo(0, crystalBottom); ctx.lineTo(-crystalWidth, -2); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,238,.82)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(0, crystalTop + 3); ctx.lineTo(-crystalWidth * 0.25, crystalBottom - 3)
      ctx.moveTo(0, crystalTop + 3); ctx.lineTo(crystalWidth * 0.62, -2); ctx.stroke()
      ctx.shadowColor = 'rgba(178,236,230,.62)'; ctx.shadowBlur = 8
      ctx.strokeStyle = 'rgba(210,250,244,.5)'; ctx.beginPath(); ctx.arc(0, 0, crystalWidth + 3, 0, Math.PI * 2); ctx.stroke()
    } else if (kind === 'ore-cap') {
      ctx.fillStyle = '#665a52'
      ctx.beginPath(); ctx.moveTo(left - reach * 0.35, bottom - 2); ctx.lineTo(left + 3, top + 2)
      ctx.lineTo(-width * 0.12, top - reach * 0.6); ctx.lineTo(width * 0.12, top + 1)
      ctx.lineTo(width * 0.32, top - reach * 0.38); ctx.lineTo(right + reach * 0.3, bottom - 2)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#b88a59'
      for (const [oreX, oreY, oreR] of [[-width * 0.24, 2, 3], [0, -2, 4], [width * 0.26, 3, 2.7]]) {
        ctx.beginPath(); ctx.arc(oreX, oreY, oreR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = brass; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(left + 3, bottom - 3); ctx.lineTo(right - 3, bottom - 3); ctx.stroke()
    } else if (kind === 'avalanche-crown') {
      ctx.fillStyle = '#566361'
      ctx.beginPath(); ctx.moveTo(left - reach * 0.25, bottom); ctx.lineTo(-width * 0.28, top + 2)
      ctx.lineTo(0, top - reach * 0.72); ctx.lineTo(width * 0.32, top + 1)
      ctx.lineTo(right + reach * 0.25, bottom); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = frost; ctx.strokeStyle = 'rgba(255,255,255,.88)'
      ctx.beginPath(); ctx.moveTo(left - reach * 0.18, top + 5)
      ctx.quadraticCurveTo(-width * 0.28, top - 2, 0, top - reach * 0.72)
      ctx.quadraticCurveTo(width * 0.32, top - 2, right + reach * 0.18, top + 5)
      ctx.lineTo(right - 3, top + 9); ctx.lineTo(width * 0.22, top + 5)
      ctx.lineTo(0, top + 10); ctx.lineTo(-width * 0.24, top + 5); ctx.lineTo(left + 3, top + 9)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (kind === 'mile-standard') {
      ctx.strokeStyle = '#4f5853'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, bottom + reach * 0.35); ctx.lineTo(0, top - reach * 0.7); ctx.stroke()
      ctx.fillStyle = stone
      ctx.beginPath(); ctx.moveTo(-width * 0.45, top + 5); ctx.lineTo(0, top - reach)
      ctx.lineTo(width * 0.45, top + 5); ctx.lineTo(width * 0.35, bottom - 2)
      ctx.lineTo(-width * 0.35, bottom - 2); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, 0, Math.max(3, width * 0.19), 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = parchment; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke()
    } else if (kind === 'redoubt-cap') {
      ctx.fillStyle = stone
      ctx.beginPath(); ctx.moveTo(left - reach * 0.25, bottom); ctx.lineTo(left - reach * 0.25, top - reach * 0.4)
      const merlonWidth = (width + reach * 0.5) / 5
      for (let merlon = 0; merlon < 5; merlon += 1) {
        const merlonX = left - reach * 0.25 + merlon * merlonWidth
        ctx.lineTo(merlonX, top - reach * (merlon % 2 === 0 ? 0.75 : 0.18))
        ctx.lineTo(merlonX + merlonWidth * 0.62, top - reach * (merlon % 2 === 0 ? 0.75 : 0.18))
      }
      ctx.lineTo(right + reach * 0.25, bottom); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = 'rgba(31,42,39,.68)'
      for (const slitX of [-width * 0.25, 0, width * 0.25]) {
        roundedRect(ctx, slitX - 1.7, -2, 3.4, Math.max(7, height * 0.42), 1.7); ctx.fill()
      }
    } else if (kind === 'portcullis-crown') {
      ctx.strokeStyle = '#3b4a45'; ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.arc(0, bottom * 0.72, width * 0.38, Math.PI, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#4b5c55'
      const toothWidth = Math.max(3, width * 0.12)
      for (const toothX of [-width * 0.27, 0, width * 0.27]) {
        ctx.beginPath(); ctx.moveTo(toothX - toothWidth / 2, top - reach * 0.35)
        ctx.lineTo(toothX + toothWidth / 2, top - reach * 0.35)
        ctx.lineTo(toothX + toothWidth / 2, bottom + reach * 0.25)
        ctx.lineTo(toothX, bottom + reach * 0.7)
        ctx.lineTo(toothX - toothWidth / 2, bottom + reach * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = brass; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(left - 3, -height * 0.1); ctx.lineTo(right + 3, -height * 0.1); ctx.stroke()
    } else if (kind === 'wind-engine-shaft') {
      const hubY = top + height * 0.3
      ctx.strokeStyle = '#455751'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, bottom + 3); ctx.lineTo(0, hubY); ctx.stroke()
      // The silhouette contract owns the one visible windwheel. This landmark
      // is only its axle bed and gear housing, so it cannot create a second
      // set of sails on the opposite side of the gate.
      ctx.fillStyle = '#60736a'; ctx.strokeStyle = '#3d4d48'; ctx.lineWidth = 1.8
      roundedRect(ctx, -width * 0.34, hubY - 9, width * 0.68, 18, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#56645f'; ctx.strokeStyle = brass
      ctx.beginPath(); ctx.arc(0, hubY, Math.max(6, width * 0.2), 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, hubY, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(231,224,191,.52)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(-width * 0.27, hubY - 5); ctx.lineTo(width * 0.27, hubY + 5)
      ctx.moveTo(-width * 0.27, hubY + 5); ctx.lineTo(width * 0.27, hubY - 5); ctx.stroke()
    } else if (kind === 'general-standard') {
      const poleX = left - reach * 0.28
      ctx.strokeStyle = darkTimber; ctx.lineWidth = 2.6
      ctx.beginPath(); ctx.moveTo(poleX, bottom + reach * 0.45); ctx.lineTo(poleX, top - reach * 0.65); ctx.stroke()
      ctx.fillStyle = banner
      ctx.beginPath(); ctx.moveTo(poleX, top - reach * 0.45); ctx.lineTo(right + reach * 0.45, top - reach * 0.2)
      ctx.lineTo(right + reach * 0.12, height * 0.12)
      ctx.lineTo(right + reach * 0.42, bottom + reach * 0.2)
      ctx.lineTo(poleX, bottom - 1); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = brass
      ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.lineTo(7, 0); ctx.lineTo(0, bottom - 1); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = parchment; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill()
    } else if (kind === 'throne-granary-seal') {
      ctx.fillStyle = '#6d4030'
      ctx.beginPath(); ctx.moveTo(left - reach * 0.28, bottom); ctx.lineTo(left - reach * 0.16, top + 2)
      ctx.quadraticCurveTo(0, top - reach, right + reach * 0.16, top + 2)
      ctx.lineTo(right + reach * 0.28, bottom); ctx.closePath(); ctx.fill(); ctx.stroke()
      const sealRadius = Math.max(6, Math.min(width, height) * 0.3)
      ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, 0, sealRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = '#fff0bc'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(0, 0, sealRadius * 0.7, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#80513a'
      ctx.beginPath(); ctx.ellipse(0, 1, sealRadius * 0.35, sealRadius * 0.48, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = pine
      ctx.beginPath(); ctx.moveTo(0, -sealRadius * 0.35); ctx.quadraticCurveTo(3, -sealRadius - 2, 6, -sealRadius - 4)
      ctx.quadraticCurveTo(4, -sealRadius * 0.15, 0, -sealRadius * 0.05); ctx.fill()
      ctx.strokeStyle = brass; ctx.lineWidth = 1.4
      for (const rayX of [-width * 0.34, width * 0.34]) {
        ctx.beginPath(); ctx.moveTo(rayX, top + 2); ctx.lineTo(rayX * 1.22, top - reach * 0.42); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawCompleteBuildingAccent(block, x, y) {
    if (!block.completeBuilding || !block.buildingFormId) return
    const role = block.architectureRole || ''
    const shape = block.architecturalShape || ''
    const towerForm = block.completeBuildingTowerForm || ''
    const width = block.width
    const height = block.height
    const top = y
    const bottom = -y
    const royal = block.buildingCategory === 'royal'
    const frost = block.buildingCategory === 'frost'
    const industrial = block.buildingCategory === 'industrial'
    const outline = block.type === 'stone' ? '#35413d' : '#4a2c20'
    const light = block.type === 'ice' ? '#efffff' : royal ? '#e9d89e' : '#ecd39a'
    const accent = royal ? '#d3a843' : frost ? '#aee7e7' : industrial ? '#b98a55' : '#768f5b'
    ctx.save()
    ctx.shadowColor = 'transparent'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (role === 'foundation') {
      ctx.fillStyle = block.type === 'stone' ? 'rgba(47,58,55,.72)' : 'rgba(83,50,31,.68)'
      const plinthHeight = Math.max(5, Math.min(10, height * 0.34))
      roundedRect(ctx, x - 3, bottom - plinthHeight, width + 6, plinthHeight, 3)
      ctx.fill(); ctx.strokeStyle = light; ctx.globalAlpha = 0.48; ctx.lineWidth = 1; ctx.stroke()
      ctx.globalAlpha = 1
      if (/continuous|citadel|courtyard|machine-bed/u.test(shape)) {
        ctx.strokeStyle = 'rgba(229,218,185,.42)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x + 3, 0); ctx.lineTo(-x - 3, 0); ctx.stroke()
      }
    }

    if (role === 'envelope') {
      const inset = Math.max(3, Math.min(6, Math.min(width, height) * 0.12))
      if (/masonry|stone|citadel|curtain|arcade|bastion/u.test(shape)) {
        ctx.strokeStyle = 'rgba(235,226,197,.48)'; ctx.lineWidth = 1
        const rows = Math.max(2, Math.min(4, Math.round(height / 9)))
        for (let row = 1; row < rows; row += 1) {
          const rowY = y + inset + (height - inset * 2) * row / rows
          ctx.beginPath(); ctx.moveTo(x + inset, rowY); ctx.lineTo(-x - inset, rowY); ctx.stroke()
        }
        ctx.fillStyle = 'rgba(26,36,34,.55)'
        const archWidth = Math.max(7, Math.min(width * 0.42, 16))
        const archHeight = Math.max(10, Math.min(height * 0.68, 25))
        ctx.beginPath(); ctx.moveTo(-archWidth / 2, bottom - inset)
        ctx.lineTo(-archWidth / 2, bottom - archHeight)
        ctx.arc(0, bottom - archHeight, archWidth / 2, Math.PI, 0)
        ctx.lineTo(archWidth / 2, bottom - inset); ctx.closePath(); ctx.fill()
        if (royal) {
          ctx.fillStyle = '#d2ad52'
          ctx.beginPath(); ctx.arc(0, top + inset + 3, 2.2, 0, Math.PI * 2); ctx.fill()
        }
      } else if (/ice|frost/u.test(shape)) {
        ctx.strokeStyle = 'rgba(242,255,255,.78)'; ctx.lineWidth = 1.3
        ctx.beginPath(); ctx.moveTo(x + inset, bottom - inset)
        ctx.lineTo(0, top + inset); ctx.lineTo(-x - inset, bottom - inset)
        ctx.moveTo(x + inset, top + inset); ctx.lineTo(0, bottom - inset)
        ctx.lineTo(-x - inset, top + inset); ctx.stroke()
        ctx.fillStyle = 'rgba(205,249,247,.3)'
        ctx.beginPath(); ctx.moveTo(0, top + 3); ctx.lineTo(5, 0); ctx.lineTo(0, bottom - 3); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill()
      } else {
        ctx.strokeStyle = 'rgba(65,38,24,.68)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x + inset, y + inset); ctx.lineTo(-x - inset, bottom - inset)
        ctx.moveTo(-x - inset, y + inset); ctx.lineTo(x + inset, bottom - inset); ctx.stroke()
        ctx.strokeStyle = 'rgba(246,220,157,.42)'; ctx.lineWidth = 1
        for (let seam = 1; seam < 3; seam += 1) {
          const seamX = x + width * seam / 3
          ctx.beginPath(); ctx.moveTo(seamX, y + inset); ctx.lineTo(seamX, bottom - inset); ctx.stroke()
        }
        if (/granary|grain|loading/u.test(`${shape} ${block.buildingFormId}`)) {
          ctx.fillStyle = 'rgba(91,54,31,.68)'
          roundedRect(ctx, -Math.min(6, width * 0.16), bottom - Math.min(17, height * 0.58), Math.min(12, width * 0.32), Math.min(17, height * 0.58), 4); ctx.fill()
        }
      }
    }

    if (role === 'frame-sill') {
      ctx.strokeStyle = 'rgba(246,218,151,.58)'; ctx.lineWidth = 1.2
      const step = Math.max(10, width / 4)
      for (let lineX = x + 4; lineX < -x - 3; lineX += step) {
        ctx.beginPath(); ctx.moveTo(lineX, y + 2); ctx.lineTo(Math.min(-x - 3, lineX + 8), bottom - 2); ctx.stroke()
      }
      ctx.fillStyle = accent
      for (const boltX of [x + 5, -x - 5]) {
        ctx.beginPath(); ctx.arc(boltX, 0, 1.6, 0, Math.PI * 2); ctx.fill()
      }
    }

    if (role === 'frame') {
      if (/lift|counterweight|hoist/u.test(towerForm)) {
        ctx.strokeStyle = light; ctx.globalAlpha = 0.5; ctx.lineWidth = 1
        const rungStep = Math.max(8, Math.min(13, height / 4))
        for (let rungY = y + 6; rungY < bottom - 4; rungY += rungStep) {
          ctx.beginPath(); ctx.moveTo(x + 4, rungY); ctx.lineTo(-x - 4, rungY); ctx.stroke()
        }
        ctx.globalAlpha = 1
      } else if (/bastion|tower|keep|citadel|gatehouse/u.test(towerForm) && block.type === 'stone') {
        ctx.fillStyle = 'rgba(24,34,32,.62)'
        const slitWidth = Math.max(2.5, Math.min(5, width * 0.16))
        const slitHeight = Math.max(7, Math.min(13, height * 0.26))
        roundedRect(ctx, -slitWidth / 2, -slitHeight / 2, slitWidth, slitHeight, slitWidth / 2); ctx.fill()
      } else if (/tripod|a-frame|gantry/u.test(towerForm)) {
        ctx.strokeStyle = 'rgba(58,34,23,.68)'; ctx.lineWidth = Math.max(2, width * 0.08)
        ctx.beginPath(); ctx.moveTo(x + 4, bottom - 4); ctx.lineTo(-x - 4, y + 4); ctx.stroke()
      }
    }

    if (role === 'roofline' && block.role === 'roof') {
      const roofRise = Math.max(15, Math.min(34, width * 0.23))
      if (/gabled|granary-dome/u.test(shape)) {
        if (/dome/u.test(shape)) {
          ctx.fillStyle = royal ? 'rgba(87,70,51,.96)' : 'rgba(111,70,38,.94)'
          ctx.beginPath(); ctx.moveTo(x + 4, top + 2)
          ctx.quadraticCurveTo(0, top - roofRise * 1.22, -x - 4, top + 2)
          ctx.closePath(); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke()
          ctx.strokeStyle = light; ctx.globalAlpha = 0.45; ctx.lineWidth = 1
          for (const ratio of [-0.5, 0, 0.5]) {
            ctx.beginPath(); ctx.moveTo(ratio * width * 0.42, top)
            ctx.quadraticCurveTo(ratio * width * 0.18, top - roofRise * 0.8, 0, top - roofRise * 1.1); ctx.stroke()
          }
          ctx.globalAlpha = 1
        } else {
          ctx.fillStyle = block.type === 'ice' ? 'rgba(137,214,218,.82)' : 'rgba(111,64,35,.94)'
          ctx.beginPath(); ctx.moveTo(x - 5, top + 2); ctx.lineTo(0, top - roofRise)
          ctx.lineTo(-x + 5, top + 2); ctx.closePath(); ctx.fill()
          ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke()
          ctx.strokeStyle = light; ctx.globalAlpha = 0.38; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(x, top - 1); ctx.lineTo(0, top - roofRise + 3); ctx.lineTo(-x, top - 1); ctx.stroke(); ctx.globalAlpha = 1
        }
      } else if (/lean-to/u.test(shape)) {
        ctx.fillStyle = 'rgba(126,86,47,.9)'; ctx.strokeStyle = outline; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x - 5, top + 2); ctx.lineTo(x + 4, top - roofRise * 0.72)
        ctx.lineTo(-x + 5, top - 3); ctx.lineTo(-x + 5, top + 4); ctx.closePath(); ctx.fill(); ctx.stroke()
      } else if (/windmill-cap|wind-engine-crown/u.test(shape)) {
        ctx.fillStyle = block.type === 'stone' ? '#68736e' : '#84502f'
        ctx.strokeStyle = outline; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x - 4, top + 2); ctx.lineTo(0, top - roofRise * 0.72)
        ctx.lineTo(-x + 4, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke()
      } else if (/stepped-flat/u.test(shape)) {
        ctx.fillStyle = block.type === 'stone' ? '#626d68' : '#8d5732'
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5
        const stepWidth = width / 3
        for (let step = 0; step < 3; step += 1) {
          const stepHeight = step === 1 ? 11 : 7
          roundedRect(ctx, x + step * stepWidth + 1, top - stepHeight, stepWidth - 2, stepHeight + 2, 2)
          ctx.fill(); ctx.stroke()
        }
      } else if (/crenellated|battlement|parapet/u.test(shape)) {
        ctx.fillStyle = block.type === 'stone' ? '#626d68' : '#8c542f'; ctx.strokeStyle = outline; ctx.lineWidth = 1.5
        const maximumMerlons = block.modulePart === 'monolithic-carrier' ? 18 : 7
        const merlonCount = Math.max(3, Math.min(maximumMerlons, Math.round(width / 42)))
        const merlonWidth = width / (merlonCount * 1.65)
        for (let index = 0; index < merlonCount; index += 1) {
          const merlonX = x + (index + 0.5) * width / merlonCount - merlonWidth / 2
          roundedRect(ctx, merlonX, top - 10, merlonWidth, 12, 2); ctx.fill(); ctx.stroke()
        }
      } else if (/frost|snow/u.test(shape)) {
        ctx.fillStyle = 'rgba(201,244,244,.7)'; ctx.strokeStyle = '#efffff'; ctx.lineWidth = 1.3
        for (const ratio of [-0.32, 0, 0.32]) {
          const shardX = ratio * width
          ctx.beginPath(); ctx.moveTo(shardX - 7, top + 2); ctx.lineTo(shardX, top - roofRise * (ratio ? 0.62 : 0.9))
          ctx.lineTo(shardX + 7, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke()
        }
      } else if (/open-bridge|viaduct-roadway/u.test(shape)) {
        ctx.strokeStyle = outline; ctx.lineWidth = 2
        for (const railX of [x + 5, 0, -x - 5]) {
          ctx.beginPath(); ctx.moveTo(railX, top + 1); ctx.lineTo(railX, top - 11); ctx.stroke()
        }
        ctx.beginPath(); ctx.moveTo(x + 5, top - 9); ctx.quadraticCurveTo(0, top - 3, -x - 5, top - 9); ctx.stroke()
      }

    }

    if (role === 'long-span' && block.role === 'bridge-span') {
      ctx.strokeStyle = 'rgba(52,40,31,.82)'; ctx.lineWidth = 1.5
      const postCount = Math.max(3, Math.min(8, Math.round(width / 34)))
      for (let index = 0; index <= postCount; index += 1) {
        const railX = x + width * index / postCount
        ctx.beginPath(); ctx.moveTo(railX, y + 2); ctx.lineTo(railX, y - 8); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.quadraticCurveTo(0, y + 2, -x, y - 7); ctx.stroke()
    }

    if (block.moduleKind === 'complete-building-connection') {
      const kind = block.connectionKind || ''
      const inset = Math.max(3, Math.min(7, height * 0.18))
      ctx.lineWidth = 1.4
      if (block.type === 'stone') {
        // A connected castle reads as coursed wall or an elevated arcade,
        // never as another isolated horizontal plank.
        ctx.strokeStyle = 'rgba(236,225,191,.5)'
        for (let row = 1; row < Math.max(2, Math.round(height / 10)); row += 1) {
          const rowY = y + height * row / Math.max(2, Math.round(height / 10))
          ctx.beginPath(); ctx.moveTo(x + inset, rowY); ctx.lineTo(-x - inset, rowY); ctx.stroke()
        }
        const maximumArches = block.modulePart === 'monolithic-carrier' ? 12 : 5
        const archCount = Math.max(1, Math.min(maximumArches, Math.round(width / 68)))
        const bayWidth = (width - inset * 2) / archCount
        ctx.fillStyle = 'rgba(25,35,33,.72)'
        for (let bay = 0; bay < archCount; bay += 1) {
          const centerX = x + inset + bayWidth * (bay + 0.5)
          const archRadius = Math.max(5, Math.min(bayWidth * 0.27, height * 0.3))
          const archBase = bottom - inset
          const archCrown = Math.max(top + inset + archRadius, archBase - height * 0.48)
          ctx.beginPath(); ctx.moveTo(centerX - archRadius, archBase)
          ctx.lineTo(centerX - archRadius, archCrown)
          ctx.arc(centerX, archCrown, archRadius, Math.PI, 0)
          ctx.lineTo(centerX + archRadius, archBase); ctx.closePath(); ctx.fill()
        }
        if (/gate|drawbridge|portcullis/u.test(kind)) {
          ctx.strokeStyle = '#d1a64f'; ctx.lineWidth = 2
          for (const chainX of [x + width * 0.22, -x - width * 0.22]) {
            ctx.beginPath(); ctx.moveTo(chainX, top + 2); ctx.lineTo(chainX, bottom - 2); ctx.stroke()
          }
        }
      } else if (block.type === 'ice') {
        ctx.strokeStyle = 'rgba(237,255,255,.84)'; ctx.lineWidth = 1.5
        const bayCount = Math.max(2, Math.min(6, Math.round(width / 48)))
        for (let bay = 0; bay < bayCount; bay += 1) {
          const left = x + width * bay / bayCount
          const right = x + width * (bay + 1) / bayCount
          ctx.beginPath(); ctx.moveTo(left + 2, bottom - 2); ctx.lineTo((left + right) / 2, top + 2)
          ctx.lineTo(right - 2, bottom - 2); ctx.stroke()
        }
      } else {
        ctx.strokeStyle = 'rgba(57,34,23,.8)'; ctx.lineWidth = Math.max(1.8, height * 0.1)
        const bayCount = Math.max(
          2,
          Math.min(block.modulePart === 'monolithic-carrier' ? 14 : 7, Math.round(width / 58)),
        )
        const leftEdge = x + inset
        const rightEdge = -x - inset
        const bayWidth = (rightEdge - leftEdge) / bayCount
        // Repeat engineered X-braces bay by bay. One enormous diagonal across
        // the entire fortress still looked like a stretched plank instead of
        // a connected timber hall.
        for (let bay = 0; bay < bayCount; bay += 1) {
          const left = leftEdge + bay * bayWidth
          const right = left + bayWidth
          ctx.beginPath(); ctx.moveTo(left, top + inset); ctx.lineTo(right, bottom - inset)
          ctx.moveTo(left, bottom - inset); ctx.lineTo(right, top + inset); ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(244,213,143,.6)'; ctx.lineWidth = 1.2
        for (let post = 1; post < bayCount; post += 1) {
          const postX = leftEdge + bayWidth * post
          ctx.beginPath(); ctx.moveTo(postX, top + 2); ctx.lineTo(postX, bottom - 2); ctx.stroke()
        }
        ctx.fillStyle = '#d0a24b'
        for (let bolt = 0; bolt <= bayCount; bolt += 1) {
          const boltX = leftEdge + bayWidth * bolt
          ctx.beginPath(); ctx.arc(boltX, 0, 2.2, 0, Math.PI * 2); ctx.fill()
        }
      }
    }

    ctx.restore()
  }

  drawAuthoredPhysicalModuleAccent(block, x, y) {
    if (!block.physicalModuleId) return
    const moduleKind = block.physicalModuleKind || ''
    const moduleClass = block.physicalModuleClass || ''
    const feature = block.physicalFeature || ''
    const identity = `${moduleKind} ${moduleClass} ${feature}`
    const width = block.width
    const height = block.height
    const top = y
    const bottom = -y
    const left = x
    const right = -x
    ctx.save()
    ctx.shadowColor = 'transparent'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (/masonry|stone|wall|tower|keep|redoubt|gatehouse|pier|citadel/u.test(identity)) {
      ctx.strokeStyle = 'rgba(239,228,195,.48)'
      ctx.lineWidth = 1
      const rowCount = Math.max(2, Math.min(8, Math.round(height / 22)))
      for (let row = 1; row < rowCount; row += 1) {
        const rowY = top + height * row / rowCount
        ctx.beginPath(); ctx.moveTo(left + 3, rowY); ctx.lineTo(right - 3, rowY); ctx.stroke()
      }
      if (/tower|keep|redoubt|gatehouse/u.test(identity) && width >= 42) {
        ctx.fillStyle = 'rgba(22,31,29,.7)'
        const slitCount = Math.max(1, Math.min(4, Math.round(width / 68)))
        for (let index = 0; index < slitCount; index += 1) {
          const slitX = left + width * (index + 1) / (slitCount + 1)
          roundedRect(ctx, slitX - 2.2, top + Math.min(15, height * 0.18), 4.4, Math.min(16, height * 0.3), 2.2)
          ctx.fill()
        }
      }
    }

    if (/arch-spandrel|masonry-arch|arcade-arch|three-arch-run|three-bay-arcade/u.test(identity)) {
      ctx.strokeStyle = 'rgba(245,224,174,.82)'
      ctx.lineWidth = 2
      const archCount = /three-/u.test(identity)
        ? Math.max(1, Math.min(3, Math.round(width / 42)))
        : 1
      const bayWidth = width / archCount
      for (let bay = 0; bay < archCount; bay += 1) {
        const centerX = left + bayWidth * (bay + 0.5)
        const radius = Math.max(5, Math.min(bayWidth * 0.3, height * 0.72))
        ctx.beginPath(); ctx.arc(centerX, bottom - 2, radius, Math.PI, 0); ctx.stroke()
      }
    }

    if (/road-deck|continuous-road/u.test(identity)) {
      ctx.strokeStyle = 'rgba(232,211,160,.76)'
      ctx.lineWidth = 1.4
      const bayCount = Math.max(4, Math.min(14, Math.round(width / 54)))
      ctx.beginPath(); ctx.moveTo(left + 3, top + 5); ctx.lineTo(right - 3, top + 5); ctx.stroke()
      for (let bay = 0; bay <= bayCount; bay += 1) {
        const postX = left + width * bay / bayCount
        ctx.beginPath(); ctx.moveTo(postX, top + 3); ctx.lineTo(postX, top - 8); ctx.stroke()
      }
    }

    if (/covered-gallery|gear-gallery/u.test(identity)) {
      ctx.strokeStyle = 'rgba(65,37,23,.78)'
      ctx.lineWidth = Math.max(1.5, Math.min(3, height * 0.12))
      const bays = Math.max(1, Math.min(5, Math.round(width / 38)))
      for (let bay = 0; bay < bays; bay += 1) {
        const bayLeft = left + width * bay / bays + 3
        const bayRight = left + width * (bay + 1) / bays - 3
        ctx.beginPath(); ctx.moveTo(bayLeft, top + 3); ctx.lineTo(bayRight, bottom - 3)
        ctx.moveTo(bayLeft, bottom - 3); ctx.lineTo(bayRight, top + 3); ctx.stroke()
      }
    }

    if (/portcullis|destructible-gate|locked-granary-gate/u.test(identity)) {
      ctx.strokeStyle = '#d1aa55'
      ctx.lineWidth = 1.8
      const columns = Math.max(3, Math.min(8, Math.round(width / 12)))
      for (let column = 1; column < columns; column += 1) {
        const columnX = left + width * column / columns
        ctx.beginPath(); ctx.moveTo(columnX, top + 3); ctx.lineTo(columnX, bottom - 4); ctx.stroke()
      }
      const rows = Math.max(2, Math.min(7, Math.round(height / 16)))
      for (let row = 1; row < rows; row += 1) {
        const rowY = top + height * row / rows
        ctx.beginPath(); ctx.moveTo(left + 3, rowY); ctx.lineTo(right - 3, rowY); ctx.stroke()
      }
    }

    if (/stepped-dome|dome-drum|granary-dome/u.test(identity)) {
      ctx.strokeStyle = 'rgba(244,211,137,.9)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(left + 2, bottom - 2)
      ctx.quadraticCurveTo(0, top - Math.min(22, width * 0.22), right - 2, bottom - 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(105,75,47,.7)'; ctx.lineWidth = 1
      for (const ratio of [-0.48, 0, 0.48]) {
        ctx.beginPath(); ctx.moveTo(ratio * width * 0.42, bottom - 2)
        ctx.quadraticCurveTo(ratio * width * 0.15, top - Math.min(17, width * 0.16), 0, top + 2)
        ctx.stroke()
      }
    }

    if (/mechanical|machine|counterweight|wind-engine|drawbridge/u.test(identity)) {
      ctx.strokeStyle = 'rgba(216,175,91,.86)'
      ctx.lineWidth = 1.6
      const gearRadius = Math.max(4, Math.min(12, Math.min(width, height) * 0.24))
      ctx.beginPath(); ctx.arc(0, 0, gearRadius, 0, Math.PI * 2); ctx.stroke()
      for (let tooth = 0; tooth < 8; tooth += 1) {
        const angle = tooth * Math.PI / 4
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * gearRadius, Math.sin(angle) * gearRadius)
        ctx.lineTo(Math.cos(angle) * (gearRadius + 4), Math.sin(angle) * (gearRadius + 4)); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawAuthoredBuildingMechanisms() {
    const layout = this.architectureSilhouetteLayout()
    if (!layout || !this.architectureMechanisms.length) return false
    const palette = this.architectureSilhouettePalette(layout.plan)
    for (const model of this.architectureMechanismModels()) {
      if (!model.active) continue
      const { pose, binding } = model
      const mechanism = binding.mechanism || ''
      const scale = clamp(binding.scale || 1, 0.55, 1.65)
      const x = pose.x
      const y = pose.y
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((pose.rotation || 0) * Math.PI / 180)
      ctx.shadowColor = 'rgba(17,22,20,.3)'
      ctx.shadowBlur = 5
      ctx.shadowOffsetY = 2
      if (/wind|rotor/u.test(mechanism)) {
        const radius = Math.max(34, Math.min(76, 38 * scale))
        ctx.strokeStyle = '#53432f'
        ctx.lineWidth = 4
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, radius * 0.88); ctx.stroke()
        ctx.strokeStyle = palette.accent
        ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2); ctx.stroke()
        for (let blade = 0; blade < 4; blade += 1) {
          ctx.save(); ctx.rotate(blade * Math.PI / 2)
          ctx.fillStyle = layout.plan.category === 'royal'
            ? 'rgba(231,211,143,.88)'
            : 'rgba(224,205,157,.88)'
          ctx.strokeStyle = '#53432f'; ctx.lineWidth = 2
          ctx.beginPath(); ctx.moveTo(5, -4)
          ctx.lineTo(radius * 0.86, -radius * 0.16)
          ctx.lineTo(radius, radius * 0.12)
          ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.stroke()
          ctx.restore()
        }
        ctx.fillStyle = palette.accent; ctx.strokeStyle = '#4d3d2c'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      } else if (/sawwheel/u.test(mechanism)) {
        const radius = 30 * scale
        ctx.fillStyle = 'rgba(92,108,103,.88)'; ctx.strokeStyle = '#3f4744'; ctx.lineWidth = 2
        ctx.beginPath()
        for (let tooth = 0; tooth < 20; tooth += 1) {
          const angle = tooth / 20 * Math.PI * 2
          const toothRadius = tooth % 2 ? radius * 0.88 : radius
          const px = Math.cos(angle) * toothRadius
          const py = Math.sin(angle) * toothRadius
          if (tooth === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = palette.accent
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill()
      } else if (/drawbridge/u.test(mechanism)) {
        const width = Math.min(156, layout.frame.width * 0.2) * scale
        const chainRise = Math.min(100, layout.frame.height * 0.2)
        ctx.strokeStyle = palette.accent; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-width * 0.44, -chainRise); ctx.lineTo(-width * 0.5, 0)
        ctx.moveTo(width * 0.44, -chainRise); ctx.lineTo(width * 0.5, 0); ctx.stroke()
        ctx.rotate(-0.08)
        ctx.fillStyle = 'rgba(117,76,42,.88)'; ctx.strokeStyle = '#4e3426'; ctx.lineWidth = 2.4
        roundedRect(ctx, -width / 2, -9, width, 18, 4); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = 'rgba(237,207,143,.48)'; ctx.lineWidth = 1
        for (let plank = -width / 2 + 15; plank < width / 2; plank += 18) {
          ctx.beginPath(); ctx.moveTo(plank, -7); ctx.lineTo(plank, 7); ctx.stroke()
        }
      } else if (/counterweight/u.test(mechanism)) {
        const chainLength = Math.min(82, layout.frame.height * 0.18) * scale
        ctx.strokeStyle = palette.accent; ctx.lineWidth = 2.2
        ctx.beginPath(); ctx.moveTo(0, -chainLength); ctx.lineTo(0, 0); ctx.stroke()
        ctx.fillStyle = 'rgba(77,86,82,.9)'; ctx.strokeStyle = '#3d4844'; ctx.lineWidth = 2
        const size = 24 * scale
        ctx.beginPath(); ctx.moveTo(-size * 0.58, -size * 0.25)
        ctx.lineTo(size * 0.58, -size * 0.25); ctx.lineTo(size * 0.42, size * 0.65)
        ctx.lineTo(-size * 0.42, size * 0.65); ctx.closePath(); ctx.fill(); ctx.stroke()
      } else if (/portcullis|granary-gate/u.test(mechanism)) {
        const width = Math.min(128, layout.frame.width * 0.16) * scale
        const height = Math.max(76, Math.min(150, (layout.frame.groundY - y) * 1.15))
        ctx.translate(0, layout.frame.groundY - y - 5)
        ctx.strokeStyle = mechanism.includes('granary') ? '#d2a84f' : 'rgba(173,185,169,.9)'
        ctx.lineWidth = 3
        for (let bar = -width / 2; bar <= width / 2; bar += Math.max(12, width / 7)) {
          ctx.beginPath(); ctx.moveTo(bar, 0); ctx.lineTo(bar, -height); ctx.stroke()
        }
        for (let row = 1; row <= 3; row += 1) {
          const rowY = -height * row / 4
          ctx.beginPath(); ctx.moveTo(-width / 2, rowY); ctx.lineTo(width / 2, rowY); ctx.stroke()
        }
        ctx.fillStyle = palette.accent; ctx.strokeStyle = '#4d3d2c'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(0, -height * 0.52, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      } else if (/beacon/u.test(mechanism)) {
        const radius = 17 * scale
        ctx.fillStyle = '#5b3b2a'; ctx.strokeStyle = '#3c2a21'; ctx.lineWidth = 2
        roundedRect(ctx, -14, 3, 28, 10, 3); ctx.fill(); ctx.stroke()
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 2.2)
        glow.addColorStop(0, 'rgba(255,224,118,.8)'); glow.addColorStop(1, 'rgba(255,164,65,0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#f0ae45'; ctx.beginPath(); ctx.moveTo(0, -radius)
        ctx.quadraticCurveTo(radius * 0.8, -2, 0, 6)
        ctx.quadraticCurveTo(-radius * 0.75, -3, 0, -radius); ctx.fill()
      } else if (/roadway|ramp|chute|gallery/u.test(mechanism)) {
        const width = Math.min(120, layout.frame.width * 0.16) * scale
        ctx.strokeStyle = palette.accent; ctx.fillStyle = 'rgba(54,66,61,.76)'; ctx.lineWidth = 2
        roundedRect(ctx, -width / 2, -7, width, 14, 4); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-width * 0.36, -8); ctx.lineTo(-width * 0.36, -23)
        ctx.moveTo(width * 0.36, -8); ctx.lineTo(width * 0.36, -23)
        ctx.moveTo(-width * 0.36, -20); ctx.lineTo(width * 0.36, -20); ctx.stroke()
      } else if (/hoist|lift|crane|pulley|cable/u.test(mechanism)) {
        const radius = 10 * scale
        ctx.strokeStyle = palette.accent; ctx.lineWidth = 2.2
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, radius); ctx.lineTo(0, radius + 42 * scale); ctx.stroke()
        ctx.fillStyle = 'rgba(104,70,42,.86)'; ctx.strokeStyle = '#4e3426'
        roundedRect(ctx, -11 * scale, radius + 38 * scale, 22 * scale, 15 * scale, 3)
        ctx.fill(); ctx.stroke()
      } else {
        const radius = 12 * scale
        ctx.fillStyle = 'rgba(77,92,85,.84)'; ctx.strokeStyle = palette.accent; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = palette.accent
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }
    return true
  }

  drawCompleteBuildingMechanism(block) {
    if (!block.completeBuilding || block.role !== 'roof') return
    const towerForm = block.completeBuildingTowerForm || ''
    const shape = block.architecturalShape || ''
    const mechanisms = (block.buildingMechanisms || []).join(' ')
    const windMachine = /windmill-head|wind-engine-tower/u.test(towerForm)
      && /wind|wheel/u.test(`${mechanisms} ${shape}`)
    if (!windMachine) return

    const width = block.width
    const top = -block.height / 2
    const radius = Math.max(34, Math.min(50, width * 0.42))
    // Mount the axle on the upper facade instead of treating it as a tiny
    // weather vane above the roof. The non-colliding sails can cross the
    // masonry while the physical roof remains the only collision surface.
    const hubY = Math.max(4, Math.min(14, block.height * 0.32))
    const royal = block.buildingCategory === 'royal'
    const sail = royal ? 'rgba(231,211,143,.9)' : 'rgba(224,205,157,.92)'
    const frame = royal ? '#55432e' : '#3d3229'

    ctx.save()
    ctx.translate(block.x, block.y)
    ctx.rotate(block.rotation * Math.PI / 180)
    ctx.shadowColor = 'rgba(27,25,20,.32)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2
    ctx.strokeStyle = frame
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, hubY); ctx.lineTo(0, top + 3); ctx.stroke()

    ctx.translate(0, hubY)
    ctx.rotate(this.mapPulseTick * (royal ? 0.009 : 0.013))
    ctx.strokeStyle = royal ? 'rgba(224,184,91,.9)' : 'rgba(230,216,174,.86)'
    ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2); ctx.stroke()
    for (let blade = 0; blade < 4; blade += 1) {
      ctx.save()
      ctx.rotate(blade * Math.PI / 2)
      ctx.fillStyle = sail
      ctx.strokeStyle = frame
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(4, -3.5)
      ctx.lineTo(radius * 0.9, -radius * 0.16)
      ctx.lineTo(radius, radius * 0.12)
      ctx.lineTo(5, 3.5)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = royal ? 'rgba(179,139,61,.85)' : 'rgba(119,82,47,.78)'
      ctx.lineWidth = 1
      for (const ratio of [0.36, 0.58, 0.8]) {
        ctx.beginPath()
        ctx.moveTo(radius * ratio, -radius * 0.095)
        ctx.lineTo(radius * ratio, radius * 0.075)
        ctx.stroke()
      }
      ctx.restore()
    }
    ctx.fillStyle = royal ? '#d7ae4d' : '#798e58'
    ctx.strokeStyle = frame
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  drawBlock(block) {
    ctx.save()
    ctx.translate(block.x, block.y)
    ctx.rotate(block.rotation * Math.PI / 180)
    ctx.shadowColor = 'rgba(0,0,0,.25)'
    ctx.shadowBlur = block.asleep ? 4 : 8
    ctx.shadowOffsetY = 4
    const x = -block.width / 2
    const y = -block.height / 2
    const isTrussMember = block.role === 'truss-brace' || block.moduleKind === 'tri-truss'
    const isWallPanel = block.role === 'wall-panel' || block.moduleKind === 'wall-panel'
    const isLongBeam = block.role === 'long-beam' || block.moduleKind === 'long-beam'
    const isFoundationPier = block.role === 'foundation-pier' || block.moduleKind === 'foundation-pier'
    if (block.type === 'wood') {
      const wood = ctx.createLinearGradient(x, y, -x, -y)
      wood.addColorStop(0, '#734124')
      wood.addColorStop(0.24, '#b96e35')
      wood.addColorStop(0.62, '#c8843f')
      wood.addColorStop(1, '#704126')
      ctx.fillStyle = wood
    } else if (block.type === 'stone') {
      const stone = ctx.createLinearGradient(x, y, -x, -y)
      stone.addColorStop(0, '#555f5d')
      stone.addColorStop(0.45, '#929a94')
      stone.addColorStop(1, '#59635f')
      ctx.fillStyle = stone
    } else {
      const ice = ctx.createLinearGradient(x, y, -x, -y)
      ice.addColorStop(0, 'rgba(102,177,193,.9)')
      ice.addColorStop(0.42, 'rgba(190,239,241,.92)')
      ice.addColorStop(1, 'rgba(89,160,181,.86)')
      ctx.fillStyle = ice
    }
    roundedRect(ctx, x, y, block.width, block.height, 5)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = block.type === 'ice' ? '#dff8f6' : block.type === 'stone' ? '#3d4844' : '#4f2e20'
    ctx.lineWidth = 2
    ctx.stroke()
    roundedRect(ctx, x + 3, y + 3, block.width - 6, block.height - 6, 3)
    ctx.strokeStyle = block.type === 'ice' ? 'rgba(255,255,255,.45)' : 'rgba(250,243,223,.18)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    if (block.type === 'wood') {
      ctx.strokeStyle = 'rgba(65,35,20,.48)'
      ctx.lineWidth = 1
      for (let line = -1; line <= 1; line += 1) {
        ctx.beginPath()
        ctx.moveTo(x + 5, line * block.height / 4)
        ctx.bezierCurveTo(0, line * block.height / 4 - 4, 0, line * block.height / 4 + 4, -x - 5, line * block.height / 4)
        ctx.stroke()
      }
      ctx.beginPath(); ctx.ellipse(x * 0.38, y * 0.2, 5, 3.2, 0.2, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(-x * 0.34, -y * 0.28, 3.5, 2.2, -0.3, 0, Math.PI * 2); ctx.stroke()
    } else if (block.type === 'stone') {
      ctx.fillStyle = 'rgba(34,43,40,.3)'
      ctx.beginPath(); ctx.arc(x * 0.45, y * 0.4, 4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(-x * 0.35, -y * 0.35, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(250,243,223,.16)'
      ctx.beginPath(); ctx.arc(-x * 0.52, y * 0.16, 2.5, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.2)'
      ctx.beginPath(); ctx.moveTo(x + 5, y + 4); ctx.lineTo(-x - 8, y + 4); ctx.lineTo(x + 9, -y - 5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.72)'
      ctx.beginPath()
      ctx.moveTo(x + 5, -y - 5)
      ctx.lineTo(-x - 5, y + 5)
      ctx.stroke()
    }
    if (block.familyId === 'royal-stone-city' && block.type === 'stone') {
      ctx.save()
      ctx.strokeStyle = 'rgba(224,216,190,.34)'
      ctx.lineWidth = 1.1
      const courseStep = Math.max(11, Math.min(18, block.height / 3))
      for (let courseY = y + courseStep; courseY < -y - 3; courseY += courseStep) {
        ctx.beginPath(); ctx.moveTo(x + 3, courseY); ctx.lineTo(-x - 3, courseY); ctx.stroke()
      }
      if (block.role === 'post' && block.height > block.width * 1.35) {
        ctx.fillStyle = 'rgba(24,33,31,.54)'
        const slitWidth = Math.max(3, Math.min(6, block.width * 0.18))
        const slitHeight = Math.max(8, Math.min(15, block.height * 0.24))
        roundedRect(ctx, -slitWidth / 2, -slitHeight / 2, slitWidth, slitHeight, slitWidth / 2); ctx.fill()
      }
      ctx.restore()
    } else if (block.familyId === 'triangular-rock-fort' && block.type === 'stone') {
      ctx.save()
      ctx.strokeStyle = 'rgba(221,211,177,.32)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(x + block.width * 0.28, y + 4)
      ctx.lineTo(-block.width * 0.08, -block.height * 0.08)
      ctx.lineTo(block.width * 0.1, block.height * 0.24)
      ctx.lineTo(-x - 4, -y - 5); ctx.stroke()
      ctx.restore()
    }
    this.drawConstructionMaterialAccent(block, x, y)
    this.drawCompleteBuildingAccent(block, x, y)
    this.drawAuthoredPhysicalModuleAccent(block, x, y)
    this.drawArchitectureLandmarkAccent(block, x, y)
    if (isWallPanel) {
      ctx.save()
      const inset = Math.max(4, Math.min(8, Math.min(block.width, block.height) * 0.13))
      roundedRect(ctx, x + inset, y + inset, block.width - inset * 2, block.height - inset * 2, 2)
      ctx.strokeStyle = block.type === 'stone' ? 'rgba(226,219,194,.5)' : 'rgba(56,39,28,.58)'
      ctx.lineWidth = block.type === 'stone' ? 1.35 : 1.15
      ctx.stroke()
      if (block.type === 'stone') {
        const courseCount = Math.max(2, Math.min(5, Math.round(block.height / 20)))
        const courseHeight = (block.height - inset * 2) / courseCount
        for (let course = 1; course < courseCount; course += 1) {
          const courseY = y + inset + courseHeight * course
          ctx.beginPath(); ctx.moveTo(x + inset, courseY); ctx.lineTo(-x - inset, courseY); ctx.stroke()
        }
        for (let course = 0; course < courseCount; course += 1) {
          const courseTop = y + inset + courseHeight * course
          const courseBottom = courseTop + courseHeight
          const offset = course % 2 === 0 ? 0 : block.width * 0.13
          for (let seamX = x + inset + block.width * 0.26 + offset; seamX < -x - inset; seamX += block.width * 0.34) {
            ctx.beginPath(); ctx.moveTo(seamX, courseTop); ctx.lineTo(seamX, courseBottom); ctx.stroke()
          }
        }
      } else {
        const panelCount = Math.max(2, Math.min(6, Math.round(block.width / 24)))
        for (let panel = 1; panel < panelCount; panel += 1) {
          const seamX = x + inset + (block.width - inset * 2) * panel / panelCount
          ctx.beginPath(); ctx.moveTo(seamX, y + inset); ctx.lineTo(seamX, -y - inset); ctx.stroke()
        }
        ctx.strokeStyle = block.type === 'ice' ? 'rgba(255,255,255,.45)' : 'rgba(74,45,27,.38)'
        ctx.beginPath(); ctx.moveTo(x + inset, y + inset); ctx.lineTo(-x - inset, -y - inset)
        ctx.moveTo(-x - inset, y + inset); ctx.lineTo(x + inset, -y - inset); ctx.stroke()
      }
      ctx.restore()
    }
    if (isLongBeam) {
      ctx.save()
      const bandWidth = Math.max(5, Math.min(10, block.height * 0.42))
      const bandHeight = Math.max(6, block.height - 4)
      for (const bandX of [-block.width * 0.3, 0, block.width * 0.3]) {
        ctx.fillStyle = 'rgba(47,62,59,.76)'
        roundedRect(ctx, bandX - bandWidth / 2, -bandHeight / 2, bandWidth, bandHeight, 2); ctx.fill()
        ctx.strokeStyle = 'rgba(218,210,176,.48)'; ctx.lineWidth = 0.9; ctx.stroke()
        ctx.fillStyle = '#c7b46f'
        for (const rivetY of [-bandHeight * 0.27, bandHeight * 0.27]) {
          ctx.beginPath(); ctx.arc(bandX, rivetY, 1.35, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.restore()
    }
    if (isTrussMember) {
      ctx.save()
      const plateWidth = Math.max(8, Math.min(17, block.height * 0.82))
      const plateHeight = Math.max(7, Math.min(14, block.height * 0.72))
      const endInset = Math.max(5, Math.min(10, block.width * 0.07))
      for (const plateX of [x + endInset, -x - endInset]) {
        ctx.fillStyle = 'rgba(48,65,62,.9)'
        roundedRect(ctx, plateX - plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, 3); ctx.fill()
        ctx.strokeStyle = 'rgba(215,207,176,.62)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = '#c8b369'
        for (const rivetX of [-plateWidth * 0.22, plateWidth * 0.22]) {
          ctx.beginPath(); ctx.arc(plateX + rivetX, 0, 1.45, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.restore()
    }
    if (isFoundationPier) {
      ctx.save()
      const footerHeight = Math.max(7, Math.min(14, block.height * 0.26))
      const footerY = -y - footerHeight - 1
      ctx.fillStyle = block.type === 'stone' ? 'rgba(48,58,55,.76)' : 'rgba(66,45,31,.78)'
      roundedRect(ctx, x + 2, footerY, block.width - 4, footerHeight, 3); ctx.fill()
      ctx.strokeStyle = block.type === 'stone' ? 'rgba(218,211,186,.42)' : 'rgba(224,184,117,.4)'
      ctx.lineWidth = 1.2; ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + block.width * 0.22, y + 4)
      ctx.lineTo(x + block.width * 0.12, footerY)
      ctx.moveTo(-x - block.width * 0.22, y + 4)
      ctx.lineTo(-x - block.width * 0.12, footerY)
      ctx.stroke()
      ctx.fillStyle = '#bba566'
      for (const boltX of [x + Math.max(7, block.width * 0.2), -x - Math.max(7, block.width * 0.2)]) {
        ctx.beginPath(); ctx.arc(boltX, footerY + footerHeight * 0.54, 1.7, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }
    this.drawSpecialArchitectureAccent(block, x, y)
    if (block.moduleKind === 'royal-gatehouse' && block.role === 'citadel-gate-beam') {
      ctx.save()
      const archRadius = Math.max(16, Math.min(34, block.width * 0.31))
      const archCenterY = block.height / 2 + archRadius * 0.82
      ctx.strokeStyle = 'rgba(226,213,172,.78)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, archCenterY, archRadius, Math.PI, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = 'rgba(35,44,41,.48)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(0, archCenterY, archRadius - 5, Math.PI, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
    this.drawConstructionIdentityMark(block, x, y)
    if (block.hp < block.maxHp) {
      const damage = 1 - block.hp / block.maxHp
      ctx.strokeStyle = block.type === 'ice' ? 'rgba(36,103,122,.78)' : 'rgba(35,26,17,.72)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(-4, -5)
      ctx.lineTo(5, 4)
      ctx.lineTo(1, -y)
      ctx.stroke()
      if (damage > 0.38) {
        ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(x * 0.6, y * 0.32); ctx.moveTo(5, 4); ctx.lineTo(-x * 0.55, -y * 0.4); ctx.stroke()
      }
      if (damage > 0.65) {
        ctx.fillStyle = 'rgba(8,21,15,.18)'
        roundedRect(ctx, x, y, block.width, block.height, 5); ctx.fill()
      }
    }
    if (block.reflective) {
      const prism = ctx.createLinearGradient(x, y, -x, -y)
      prism.addColorStop(0, 'rgba(122,113,216,.18)')
      prism.addColorStop(0.5, 'rgba(255,255,255,.54)')
      prism.addColorStop(1, 'rgba(231,89,139,.2)')
      ctx.fillStyle = prism
      roundedRect(ctx, x + 2, y + 2, block.width - 4, block.height - 4, 4); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(x + 5, -y - 4); ctx.lineTo(-x - 5, y + 4); ctx.stroke()
    }
    if (block.critical) {
      ctx.fillStyle = this.specialTheme?.colors?.hazard || '#ff8d78'
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke()
    }
    if (block.magnetizedTicks > 0) {
      ctx.strokeStyle = this.specialTheme?.colors?.accent || '#f6d069'
      ctx.lineWidth = 3
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur = 12
      roundedRect(ctx, x - 2, y - 2, block.width + 4, block.height + 4, 6)
      ctx.stroke()
      ctx.shadowColor = 'transparent'
    }
    if (block.permanentlyFrozen) {
      ctx.fillStyle = 'rgba(191,242,244,.24)'
      roundedRect(ctx, x, y, block.width, block.height, 5); ctx.fill()
      ctx.strokeStyle = 'rgba(230,255,255,.78)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(-x, 0); ctx.moveTo(0, y); ctx.lineTo(0, -y); ctx.stroke()
    }
    if (block.burningTicks > 0) {
      const burnAlpha = clamp(block.burningTicks / Math.max(1, block.burnDurationTotal || 1), 0.28, 1)
      ctx.shadowColor = '#ff7a27'
      ctx.shadowBlur = 12
      ctx.strokeStyle = `rgba(239,91,35,${0.5 + burnAlpha * 0.35})`
      ctx.lineWidth = 3
      roundedRect(ctx, x - 1, y - 1, block.width + 2, block.height + 2, 6); ctx.stroke()
      ctx.shadowColor = 'transparent'
      for (const offset of [-block.width * 0.22, block.width * 0.2]) {
        const flicker = Math.sin(this.mapPulseTick * 0.31 + offset) * 2
        ctx.fillStyle = '#f26a32'
        ctx.beginPath()
        ctx.moveTo(offset - 5, y + 3)
        ctx.quadraticCurveTo(offset + flicker, y - 13 - burnAlpha * 5, offset + 5, y + 3)
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#ffd45a'
        ctx.beginPath(); ctx.ellipse(offset, y - 1, 2.4, 5 + burnAlpha * 2, 0, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }

  drawAcornFinishDetails(bird, visualType, style, r, queued) {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // A crisp cap rim, shell contour and eye catchlights survive both the
    // battlefield camera and the high-density magazine portrait.
    ctx.globalAlpha = 0.68
    ctx.strokeStyle = mixCss(style.cap, '#f7dfad', 0.34)
    ctx.lineWidth = Math.max(0.9, r * 0.075)
    ctx.beginPath(); ctx.moveTo(-r * 0.68, -r * 1.06)
    ctx.quadraticCurveTo(0, -r * 0.84, r * 0.68, -r * 1.06); ctx.stroke()
    ctx.strokeStyle = mixCss(style.shell, '#fff5d7', 0.4)
    ctx.lineWidth = Math.max(0.8, r * 0.065)
    ctx.beginPath(); ctx.arc(-r * 0.02, r * 0.08, r * 0.78, 2.2, 3.85); ctx.stroke()
    ctx.globalAlpha = 1

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-r * 0.32, -r * 0.23, Math.max(0.75, r * 0.055), 0, Math.PI * 2)
    ctx.arc(r * 0.36, -r * 0.23, Math.max(0.75, r * 0.055), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mixCss(style.shell, '#eaa071', 0.48)
    ctx.globalAlpha = queued ? 0.34 : 0.44
    ctx.beginPath(); ctx.ellipse(-r * 0.61, r * 0.11, r * 0.14, r * 0.08, -0.2, 0, Math.PI * 2)
    ctx.ellipse(r * 0.61, r * 0.11, r * 0.14, r * 0.08, 0.2, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = style.outline
    ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.095, r * 0.07, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,244,211,.34)'
    ctx.lineWidth = Math.max(0.65, r * 0.045)
    for (const direction of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(direction * r * 0.82, r * 0.36)
      ctx.quadraticCurveTo(direction * r * 0.72, r * 0.7, direction * r * 0.4, r * 0.93); ctx.stroke()
    }

    // Small geometric finish marks reinforce material and function without
    // replacing the larger silhouette-defining parts already drawn below.
    ctx.strokeStyle = mixCss(style.accent, '#fff8dc', 0.18)
    ctx.fillStyle = style.accent
    ctx.lineWidth = Math.max(1, r * 0.085)
    if (visualType === 'red') {
      ctx.globalAlpha = 0.72
      ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.66); ctx.quadraticCurveTo(0, r * 0.84, r * 0.3, r * 0.66); ctx.stroke()
      for (const x of [-0.34, 0, 0.34]) {
        ctx.beginPath(); ctx.arc(x * r, r * 1.02, r * 0.055, 0, Math.PI * 2); ctx.fill()
      }
    } else if (visualType === 'bomb') {
      ctx.strokeStyle = '#d9a94a'; ctx.globalAlpha = 0.82
      ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.73, 0.26, Math.PI - 0.26); ctx.stroke()
      for (const x of [-0.58, 0.58]) {
        ctx.beginPath(); ctx.arc(x * r, r * 0.5, r * 0.085, 0, Math.PI * 2); ctx.fill()
      }
    } else if (visualType === 'split') {
      ctx.globalAlpha = 0.74
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.44, -r * 0.88)
        ctx.quadraticCurveTo(direction * r * 0.7, -r * 0.22, direction * r * 0.62, r * 0.52); ctx.stroke()
      }
    } else if (visualType === 'dash') {
      ctx.globalAlpha = 0.82
      for (const direction of [-1, 1]) {
        for (let stripe = 0; stripe < 3; stripe += 1) {
          const y = (-0.48 + stripe * 0.37) * r
          ctx.beginPath(); ctx.moveTo(direction * r * 0.32, y)
          ctx.lineTo(direction * r * (0.56 + stripe * 0.1), y + direction * r * 0.05); ctx.stroke()
        }
      }
    } else if (visualType === 'fire') {
      ctx.globalAlpha = 0.84
      for (const [x, y, radius] of [[-0.58, 0.58, 0.08], [0.53, 0.36, 0.06], [0.38, 0.82, 0.045]]) {
        ctx.beginPath(); ctx.arc(x * r, y * r, radius * r, 0, Math.PI * 2); ctx.fill()
      }
    } else if (visualType === 'drill') {
      ctx.strokeStyle = '#f0c169'; ctx.globalAlpha = 0.82
      for (const y of [0.28, 0.62, 0.94]) {
        ctx.beginPath(); ctx.moveTo(-r * (0.46 - y * 0.13), r * y)
        ctx.lineTo(r * (0.46 - y * 0.13), r * y); ctx.stroke()
      }
      ctx.fillStyle = '#f9db8d'; ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.075, 0, Math.PI * 2); ctx.fill()
    } else if (visualType === 'frost') {
      ctx.strokeStyle = '#f1ffff'; ctx.globalAlpha = 0.72
      ctx.beginPath(); ctx.moveTo(-r * 0.72, r * 0.68); ctx.lineTo(0, -r * 0.06); ctx.lineTo(r * 0.72, r * 0.68)
      ctx.moveTo(-r * 0.48, -r * 0.72); ctx.lineTo(0, -r * 0.06); ctx.lineTo(r * 0.48, -r * 0.72); ctx.stroke()
    } else if (visualType === 'vine') {
      ctx.strokeStyle = '#e5efbd'; ctx.globalAlpha = 0.76
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.arc(direction * r * 0.46, r * 0.52, r * 0.24, direction < 0 ? -0.2 : 2.7, direction < 0 ? 4.9 : 7.8); ctx.stroke()
        ctx.beginPath(); ctx.ellipse(direction * r * 0.72, r * 0.73, r * 0.12, r * 0.23, direction * 0.55, 0, Math.PI * 2); ctx.fill()
      }
    } else if (visualType === 'boomerang') {
      ctx.strokeStyle = '#f1dff5'; ctx.globalAlpha = 0.8
      ctx.beginPath(); ctx.arc(0, r * 0.48, r * 0.68, -2.7, -0.34); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(r * 0.63, r * 0.18); ctx.lineTo(r * 0.36, r * 0.07); ctx.lineTo(r * 0.48, r * 0.35); ctx.stroke()
    } else if (visualType === 'quake') {
      ctx.strokeStyle = '#efc36f'; ctx.globalAlpha = 0.72
      for (const y of [-0.32, 0.1, 0.52]) {
        ctx.beginPath(); ctx.moveTo(-r * 0.62, r * y); ctx.lineTo(r * 0.62, r * y); ctx.stroke()
      }
      ctx.fillStyle = '#d99d4e'
      for (const x of [-0.48, 0.48]) { ctx.beginPath(); ctx.arc(x * r, r * 0.92, r * 0.08, 0, Math.PI * 2); ctx.fill() }
    } else if (visualType === 'talent-emberheart') {
      ctx.strokeStyle = '#ffd15a'; ctx.globalAlpha = 0.88
      ctx.beginPath(); ctx.arc(0, r * 0.43, r * 0.52, 0, Math.PI * 2); ctx.stroke()
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        ctx.beginPath(); ctx.arc(Math.cos(angle) * r * 0.68, r * 0.43 + Math.sin(angle) * r * 0.68, r * 0.055, 0, Math.PI * 2); ctx.fill()
      }
    } else if (visualType === 'talent-prism-bell') {
      ctx.strokeStyle = '#f1ffff'; ctx.globalAlpha = 0.82
      ctx.beginPath(); ctx.moveTo(0, -r * 0.52); ctx.lineTo(r * 0.62, r * 0.32)
      ctx.lineTo(0, r * 1.02); ctx.lineTo(-r * 0.62, r * 0.32); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-r * 0.62, r * 0.32); ctx.lineTo(r * 0.62, r * 0.32); ctx.stroke()
    } else if (visualType === 'talent-thunder-root') {
      ctx.strokeStyle = '#f5d66f'; ctx.globalAlpha = 0.86
      ctx.beginPath(); ctx.moveTo(0, -r * 0.02); ctx.lineTo(-r * 0.34, r * 0.4)
      ctx.lineTo(-r * 0.08, r * 0.43); ctx.lineTo(-r * 0.42, r * 0.94)
      ctx.moveTo(-r * 0.08, r * 0.43); ctx.lineTo(r * 0.46, r * 0.7); ctx.stroke()
    }
    ctx.restore()
  }

  drawBird(bird, { queued = false, scale = 1 } = {}) {
    const visualType = bird.splitClone ? 'split' : bird.type
    const style = BIRD_STYLE[visualType] || BIRD_STYLE.red
    const r = bird.radius
    ctx.save()
    ctx.translate(bird.x, bird.y)
    ctx.rotate((bird.rotation || 0) * Math.PI / 180)
    ctx.scale(scale, scale)
    const speedStretch = !queued && bird.launched ? clamp(Math.hypot(bird.vx, bird.vy) / 90, 0, 0.16) : 0
    const breathe = !queued && !bird.launched && !prefersReducedMotion
      ? Math.sin((this.fixedTick + bird.id.length) * 0.09) * 0.012 : 0
    ctx.scale(1 + speedStretch + breathe, 1 - speedStretch * 0.52 - breathe)
    if (visualType === 'bomb') ctx.scale(1.13, 0.95)
    else if (visualType === 'split') ctx.scale(0.96, 1.04)
    else if (visualType === 'dash') ctx.scale(0.88, 1.14)
    else if (visualType === 'fire') ctx.scale(1.04, 1.02)
    else if (visualType === 'drill') ctx.scale(0.82, 1.2)
    else if (visualType === 'boomerang') ctx.scale(0.9, 1.08)
    else if (visualType === 'quake') ctx.scale(1.18, 0.9)
    else if (visualType === 'talent-emberheart') ctx.scale(1.12, 1.04)
    else if (visualType === 'talent-prism-bell') ctx.scale(0.92, 1.14)
    else if (visualType === 'talent-thunder-root') ctx.scale(1.08, 1.02)

    // These back pieces carry each type's silhouette. They stay legible even when
    // the sling pouch covers the face or a reserve bird is rendered very small.
    if (visualType === 'bomb') {
      ctx.fillStyle = '#3a2c28'
      ctx.strokeStyle = style.outline; ctx.lineWidth = 1.7
      for (const direction of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(direction * r * 0.72, -r * 0.55)
        ctx.lineTo(direction * r * 1.22, -r * 0.32)
        ctx.lineTo(direction * r * 1.13, r * 0.22)
        ctx.lineTo(direction * r * 0.72, r * 0.38)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'split') {
      for (const direction of [-1, 1]) {
        const wing = ctx.createLinearGradient(direction * r * 0.45, -r * 0.55, direction * r * 1.62, r * 0.36)
        wing.addColorStop(0, '#edf4cd')
        wing.addColorStop(1, style.accent)
        ctx.fillStyle = wing
        ctx.strokeStyle = style.outline; ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(direction * r * 0.45, -r * 0.45)
        ctx.bezierCurveTo(direction * r * 1.18, -r * 1.02, direction * r * 1.66, -r * 0.28, direction * r * 1.48, r * 0.24)
        ctx.bezierCurveTo(direction * r * 1.05, r * 0.52, direction * r * 0.64, r * 0.18, direction * r * 0.45, -r * 0.45)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#6f8b51'; ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(direction * r * 0.56, -r * 0.3)
        ctx.quadraticCurveTo(direction * r * 1.05, -r * 0.12, direction * r * 1.42, r * 0.18)
        ctx.stroke()
      }
    } else if (visualType === 'dash') {
      ctx.fillStyle = style.accent
      ctx.strokeStyle = style.outline; ctx.lineWidth = 1.7
      for (const direction of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(direction * r * 0.58, -r * 0.5)
        ctx.lineTo(direction * r * 1.6, r * 0.04)
        ctx.lineTo(direction * r * 0.75, r * 0.23)
        ctx.lineTo(direction * r * 1.18, r * 0.72)
        ctx.lineTo(direction * r * 0.45, r * 0.43)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(255,240,168,.82)'; ctx.lineWidth = 2.1; ctx.lineCap = 'round'
      for (const direction of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(direction * r * 1.2, -r * 0.35)
        ctx.lineTo(direction * r * 1.78, -r * 0.62)
        ctx.stroke()
      }
    } else if (visualType === 'fire') {
      ctx.fillStyle = '#7d3327'
      ctx.strokeStyle = style.outline; ctx.lineWidth = 1.7
      for (const direction of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(direction * r * 0.62, -r * 0.38)
        ctx.quadraticCurveTo(direction * r * 1.48, -r * 0.8, direction * r * 1.28, r * 0.18)
        ctx.quadraticCurveTo(direction * r * 1.05, r * 0.72, direction * r * 0.5, r * 0.42)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#ff9a3d'
        ctx.beginPath(); ctx.ellipse(direction * r * 1.08, r * 0.25, r * 0.18, r * 0.4, direction * 0.35, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#7d3327'
      }
    } else if (visualType === 'drill') {
      ctx.fillStyle = style.accent; ctx.strokeStyle = style.outline; ctx.lineWidth = 1.8
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.55, -r * 0.25); ctx.lineTo(direction * r * 1.35, r * 0.05); ctx.lineTo(direction * r * 0.62, r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(0, r * 1.9); ctx.lineTo(-r * 0.55, r * 0.92); ctx.lineTo(r * 0.55, r * 0.92); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'frost') {
      ctx.fillStyle = 'rgba(220,252,250,.78)'; ctx.strokeStyle = style.outline; ctx.lineWidth = 1.5
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.45, -r * 0.45); ctx.lineTo(direction * r * 1.35, -r * 1.05); ctx.lineTo(direction * r * 1.18, -r * 0.15); ctx.lineTo(direction * r * 1.55, r * 0.3); ctx.lineTo(direction * r * 0.5, r * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'vine') {
      ctx.fillStyle = style.accent; ctx.strokeStyle = style.outline; ctx.lineWidth = 1.6
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.45, -r * 0.35); ctx.bezierCurveTo(direction * r * 1.65, -r * 1.1, direction * r * 1.65, r * 0.55, direction * r * 0.5, r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'boomerang') {
      ctx.fillStyle = style.accent; ctx.strokeStyle = style.outline; ctx.lineWidth = 1.8
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.35, -r * 0.6); ctx.quadraticCurveTo(direction * r * 1.65, -r * 1.15, direction * r * 1.6, r * 0.1); ctx.quadraticCurveTo(direction * r * 1.3, r * 0.75, direction * r * 0.58, r * 0.2); ctx.quadraticCurveTo(direction * r * 1.02, r * 0.05, direction * r * 0.35, -r * 0.6); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'quake') {
      ctx.fillStyle = style.cap; ctx.strokeStyle = style.outline; ctx.lineWidth = 2
      for (const direction of [-1, 1]) {
        roundedRect(ctx, direction * r * 0.55 - r * 0.38, r * 0.58, r * 0.76, r * 0.86, r * 0.2); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'talent-emberheart') {
      ctx.fillStyle = '#ff743d'; ctx.strokeStyle = style.outline; ctx.lineWidth = 1.8
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.45, r * 0.42)
        ctx.quadraticCurveTo(direction * r * 1.55, r * 0.22, direction * r * 1.18, -r * 0.8)
        ctx.quadraticCurveTo(direction * r * 0.88, -r * 0.28, direction * r * 0.42, -r * 0.42)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'talent-prism-bell') {
      ctx.fillStyle = 'rgba(221,252,255,.82)'; ctx.strokeStyle = '#315b78'; ctx.lineWidth = 1.8
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.45, -r * 0.55)
        ctx.lineTo(direction * r * 1.52, -r * 0.22)
        ctx.lineTo(direction * r * 0.72, r * 0.72)
        ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'talent-thunder-root') {
      ctx.strokeStyle = '#f5d66f'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * r * 0.4, r * 0.25)
        ctx.lineTo(direction * r * 1.25, r * 0.58)
        ctx.lineTo(direction * r * 1.58, r * 1.12)
        ctx.moveTo(direction * r * 1.12, r * 0.52)
        ctx.lineTo(direction * r * 1.5, r * 0.08); ctx.stroke()
      }
    }

    if (this.hasTalent('power') && !queued) {
      ctx.strokeStyle = 'rgba(255,91,70,.55)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.shadowColor = 'rgba(8,21,15,.34)'
    ctx.shadowBlur = queued ? 4 : 9
    ctx.shadowOffsetY = queued ? 2 : 4
    const body = ctx.createLinearGradient(-r, -r, r, r)
    body.addColorStop(0, mixCss(style.shell, '#ffffff', 0.2))
    body.addColorStop(1, mixCss(style.shell, '#3a1d12', 0.28))
    ctx.fillStyle = body
    ctx.beginPath()
    if (visualType === 'bomb') {
      ctx.moveTo(0, -r * 1.24)
      ctx.lineTo(r * 0.76, -r * 1.02)
      ctx.lineTo(r * 1.14, -r * 0.42)
      ctx.lineTo(r * 1.04, r * 0.52)
      ctx.lineTo(r * 0.48, r * 1.1)
      ctx.lineTo(0, r * 1.26)
      ctx.lineTo(-r * 0.48, r * 1.1)
      ctx.lineTo(-r * 1.04, r * 0.52)
      ctx.lineTo(-r * 1.14, -r * 0.42)
      ctx.lineTo(-r * 0.76, -r * 1.02)
      ctx.closePath()
    } else if (visualType === 'split') {
      ctx.moveTo(0, -r * 1.42)
      ctx.bezierCurveTo(r * 0.92, -r * 0.84, r * 0.93, r * 0.62, 0, r * 1.3)
      ctx.bezierCurveTo(-r * 0.93, r * 0.62, -r * 0.92, -r * 0.84, 0, -r * 1.42)
    } else if (visualType === 'dash') {
      ctx.moveTo(0, -r * 1.5)
      ctx.lineTo(r * 0.72, -r * 0.72)
      ctx.lineTo(r * 0.65, r * 0.58)
      ctx.lineTo(0, r * 1.46)
      ctx.lineTo(-r * 0.65, r * 0.58)
      ctx.lineTo(-r * 0.72, -r * 0.72)
      ctx.closePath()
    } else if (visualType === 'fire') {
      ctx.moveTo(0, -r * 1.36)
      ctx.lineTo(r * 0.9, -r * 0.74)
      ctx.lineTo(r * 0.98, r * 0.42)
      ctx.lineTo(r * 0.46, r * 1.12)
      ctx.lineTo(0, r * 1.3)
      ctx.lineTo(-r * 0.46, r * 1.12)
      ctx.lineTo(-r * 0.98, r * 0.42)
      ctx.lineTo(-r * 0.9, -r * 0.74)
      ctx.closePath()
    } else if (visualType === 'drill') {
      ctx.moveTo(0, -r * 1.52); ctx.lineTo(r * 0.72, -r * 0.72); ctx.lineTo(r * 0.62, r * 0.75); ctx.lineTo(0, r * 1.45); ctx.lineTo(-r * 0.62, r * 0.75); ctx.lineTo(-r * 0.72, -r * 0.72); ctx.closePath()
    } else if (visualType === 'frost') {
      ctx.moveTo(0, -r * 1.45); ctx.lineTo(r * 0.92, -r * 0.72); ctx.lineTo(r * 1.08, r * 0.35); ctx.lineTo(r * 0.45, r * 1.18); ctx.lineTo(-r * 0.45, r * 1.18); ctx.lineTo(-r * 1.08, r * 0.35); ctx.lineTo(-r * 0.92, -r * 0.72); ctx.closePath()
    } else if (visualType === 'vine') {
      // A bound kite-shell gives the winch acorn its own readable profile.
      ctx.moveTo(0, -r * 1.42)
      ctx.lineTo(r * 0.92, -r * 0.62)
      ctx.quadraticCurveTo(r * 0.82, r * 0.28, r * 0.48, r * 0.86)
      ctx.lineTo(0, r * 1.48)
      ctx.lineTo(-r * 0.48, r * 0.86)
      ctx.quadraticCurveTo(-r * 0.82, r * 0.28, -r * 0.92, -r * 0.62)
      ctx.closePath()
    } else if (visualType === 'boomerang') {
      // An intentionally asymmetric crescent keeps it distinct even in silhouette.
      ctx.moveTo(-r * 0.18, -r * 1.4)
      ctx.bezierCurveTo(r * 0.9, -r * 0.88, r * 1.08, r * 0.34, r * 0.2, r * 1.34)
      ctx.bezierCurveTo(-r * 0.24, r * 1.58, -r * 1.12, r * 0.72, -r * 0.94, -r * 0.12)
      ctx.bezierCurveTo(-r * 0.82, -r * 0.72, -r * 0.46, -r * 1.18, -r * 0.18, -r * 1.4)
      ctx.closePath()
    } else if (visualType === 'quake') {
      roundedRect(ctx, -r, -r * 1.08, r * 2, r * 2.18, r * 0.26)
    } else if (visualType === 'talent-emberheart') {
      ctx.moveTo(0, -r * 1.34)
      ctx.bezierCurveTo(r * 1.2, -r * 1.05, r * 1.16, r * 0.34, r * 0.48, r * 1.04)
      ctx.lineTo(0, r * 1.45)
      ctx.lineTo(-r * 0.48, r * 1.04)
      ctx.bezierCurveTo(-r * 1.16, r * 0.34, -r * 1.2, -r * 1.05, 0, -r * 1.34)
      ctx.closePath()
    } else if (visualType === 'talent-prism-bell') {
      ctx.moveTo(0, -r * 1.58)
      ctx.lineTo(r * 0.86, -r * 0.72)
      ctx.lineTo(r * 0.78, r * 0.56)
      ctx.lineTo(0, r * 1.42)
      ctx.lineTo(-r * 0.78, r * 0.56)
      ctx.lineTo(-r * 0.86, -r * 0.72)
      ctx.closePath()
    } else if (visualType === 'talent-thunder-root') {
      ctx.moveTo(0, -r * 1.42)
      ctx.lineTo(r * 0.88, -r * 0.72)
      ctx.lineTo(r * 0.72, r * 0.48)
      ctx.lineTo(r * 0.38, r * 0.86)
      ctx.lineTo(r * 0.62, r * 1.36)
      ctx.lineTo(0, r * 1.08)
      ctx.lineTo(-r * 0.62, r * 1.36)
      ctx.lineTo(-r * 0.38, r * 0.86)
      ctx.lineTo(-r * 0.72, r * 0.48)
      ctx.lineTo(-r * 0.88, -r * 0.72)
      ctx.closePath()
    } else {
      ctx.moveTo(0, -r * 1.28)
      ctx.bezierCurveTo(r * 1.2, -r * 0.55, r * 1.05, r * 0.65, 0, r * 1.25)
      ctx.bezierCurveTo(-r * 1.05, r * 0.65, -r * 1.2, -r * 0.55, 0, -r * 1.28)
    }
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = style.outline
    ctx.lineWidth = 2.3
    ctx.stroke()

    // Each cap is a second, high-positioned cue that stays visible in the sling.
    ctx.fillStyle = style.cap
    ctx.strokeStyle = style.outline; ctx.lineWidth = 1.8
    if (visualType === 'bomb') {
      ctx.beginPath()
      ctx.moveTo(-r * 1.04, -r * 1.03)
      ctx.lineTo(-r * 0.72, -r * 1.38)
      ctx.lineTo(-r * 0.18, -r * 1.5)
      ctx.lineTo(0, -r * 1.34)
      ctx.lineTo(r * 0.18, -r * 1.5)
      ctx.lineTo(r * 0.72, -r * 1.38)
      ctx.lineTo(r * 1.04, -r * 1.03)
      ctx.quadraticCurveTo(0, -r * 0.82, -r * 1.04, -r * 1.03)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = style.accent
      roundedRect(ctx, -r * 0.17, -r * 1.48, r * 0.34, r * 0.42, r * 0.1); ctx.fill()
    } else if (visualType === 'split') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.91, -r * 1.04)
      ctx.quadraticCurveTo(-r * 0.56, -r * 1.55, 0, -r * 1.33)
      ctx.quadraticCurveTo(r * 0.56, -r * 1.55, r * 0.91, -r * 1.04)
      ctx.quadraticCurveTo(0, -r * 0.77, -r * 0.91, -r * 1.04)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'dash') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.78, -r * 1.03)
      ctx.lineTo(0, -r * 1.52)
      ctx.lineTo(r * 0.78, -r * 1.03)
      ctx.lineTo(r * 0.48, -r * 0.9)
      ctx.lineTo(0, -r * 1.18)
      ctx.lineTo(-r * 0.48, -r * 0.9)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'fire') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.92, -r * 1.02)
      ctx.quadraticCurveTo(-r * 0.5, -r * 1.5, 0, -r * 1.3)
      ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.92, -r * 1.02)
      ctx.quadraticCurveTo(0, -r * 0.72, -r * 0.92, -r * 1.02)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'drill') {
      ctx.beginPath(); ctx.moveTo(-r * 0.82, -r * 1.02); ctx.lineTo(0, -r * 1.62); ctx.lineTo(r * 0.82, -r * 1.02); ctx.lineTo(0, -r * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'frost') {
      ctx.beginPath(); ctx.moveTo(-r * 0.88, -r); ctx.lineTo(-r * 0.45, -r * 1.55); ctx.lineTo(0, -r * 1.2); ctx.lineTo(r * 0.45, -r * 1.55); ctx.lineTo(r * 0.88, -r); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'vine') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.92, -r * 1.02)
      ctx.lineTo(-r * 0.58, -r * 1.42)
      ctx.lineTo(0, -r * 1.24)
      ctx.lineTo(r * 0.58, -r * 1.42)
      ctx.lineTo(r * 0.92, -r * 1.02)
      ctx.quadraticCurveTo(0, -r * 0.75, -r * 0.92, -r * 1.02)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#c49a47'; ctx.beginPath(); ctx.arc(0, -r * 1.18, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = style.cap
    } else if (visualType === 'boomerang') {
      ctx.beginPath()
      ctx.moveTo(-r * 1.02, -r * 1.08)
      ctx.quadraticCurveTo(-r * 0.3, -r * 1.58, r * 0.86, -r * 1.22)
      ctx.lineTo(r * 0.62, -r * 0.91)
      ctx.quadraticCurveTo(-r * 0.26, -r * 1.14, -r * 0.88, -r * 0.86)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'quake') {
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.95); ctx.lineTo(-r * 0.62, -r * 1.42); ctx.lineTo(-r * 0.18, -r * 1.12); ctx.lineTo(r * 0.25, -r * 1.5); ctx.lineTo(r, -r * 0.94); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-emberheart') {
      ctx.beginPath(); ctx.moveTo(-r * 0.94, -r)
      ctx.lineTo(-r * 0.58, -r * 1.52); ctx.lineTo(-r * 0.15, -r * 1.24)
      ctx.lineTo(r * 0.28, -r * 1.58); ctx.lineTo(r * 0.96, -r)
      ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.94, -r); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-prism-bell') {
      ctx.beginPath(); ctx.moveTo(-r * 0.88, -r * 1.02); ctx.lineTo(0, -r * 1.64)
      ctx.lineTo(r * 0.88, -r * 1.02); ctx.lineTo(r * 0.46, -r * 0.82)
      ctx.lineTo(0, -r * 1.12); ctx.lineTo(-r * 0.46, -r * 0.82); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-thunder-root') {
      ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 1.02); ctx.lineTo(-r * 0.36, -r * 1.42)
      ctx.lineTo(-r * 0.05, -r * 1.16); ctx.lineTo(r * 0.46, -r * 1.58)
      ctx.lineTo(r * 0.92, -r * 1.02); ctx.lineTo(r * 0.32, -r * 0.84)
      ctx.lineTo(-r * 0.22, -r * 0.86); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.ellipse(0, -r * 1.15, r * 0.82, r * 0.29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(236,213,170,.42)'
    ctx.lineWidth = 1
    for (let line = -2; line <= 2; line += 1) {
      ctx.beginPath(); ctx.moveTo(line * r * 0.28 - r * 0.26, -r * 1.34); ctx.lineTo(line * r * 0.28 + r * 0.2, -r * 1.02); ctx.stroke()
    }

    ctx.fillStyle = style.accent
    ctx.strokeStyle = style.outline; ctx.lineWidth = 1.2
    if (visualType === 'split') {
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(direction * r * 0.26, -r * 1.72, r * 0.2, r * 0.58, direction * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'dash') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.08, -r * 1.37)
      ctx.lineTo(r * 0.5, -r * 2.08)
      ctx.lineTo(r * 0.35, -r * 1.5)
      ctx.lineTo(r * 0.68, -r * 1.55)
      ctx.lineTo(r * 0.02, -r * 1.04)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'fire') {
      ctx.beginPath()
      ctx.moveTo(-r * 0.42, -r * 1.34)
      ctx.quadraticCurveTo(-r * 0.72, -r * 1.92, -r * 0.1, -r * 2.08)
      ctx.quadraticCurveTo(-r * 0.12, -r * 1.63, r * 0.12, -r * 1.45)
      ctx.quadraticCurveTo(r * 0.22, -r * 1.92, r * 0.62, -r * 2.04)
      ctx.quadraticCurveTo(r * 0.76, -r * 1.53, r * 0.38, -r * 1.25)
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'bomb') {
      ctx.beginPath(); ctx.arc(0, -r * 1.28, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    } else if (visualType === 'frost') {
      ctx.beginPath(); ctx.moveTo(0, -r * 2); ctx.lineTo(r * 0.34, -r * 1.48); ctx.lineTo(0, -r * 1.2); ctx.lineTo(-r * 0.34, -r * 1.48); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'vine' || visualType === 'boomerang') {
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(direction * r * 0.2, -r * 1.67, r * 0.2, r * 0.55, direction * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
    } else if (visualType === 'drill') {
      ctx.beginPath(); ctx.moveTo(0, -r * 2.05); ctx.lineTo(r * 0.28, -r * 1.35); ctx.lineTo(-r * 0.28, -r * 1.35); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-emberheart') {
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 1.32); ctx.lineTo(-r * 0.2, -r * 2.02)
      ctx.lineTo(r * 0.05, -r * 1.58); ctx.lineTo(r * 0.38, -r * 2.12)
      ctx.lineTo(r * 0.55, -r * 1.28); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-prism-bell') {
      ctx.beginPath(); ctx.moveTo(0, -r * 2.12); ctx.lineTo(r * 0.48, -r * 1.48)
      ctx.lineTo(0, -r * 1.12); ctx.lineTo(-r * 0.48, -r * 1.48); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (visualType === 'talent-thunder-root') {
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 1.32); ctx.lineTo(r * 0.46, -r * 2.08)
      ctx.lineTo(r * 0.25, -r * 1.5); ctx.lineTo(r * 0.68, -r * 1.58)
      ctx.lineTo(r * 0.04, -r * 1.02); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.ellipse(r * 0.12, -r * 1.69, r * 0.2, r * 0.53, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    }

    ctx.fillStyle = 'rgba(250,243,223,.28)'
    ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.36, r * 0.2, r * 0.55, -0.35, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fffdf0'
    ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.2, r * 0.29, 0, Math.PI * 2); ctx.arc(r * 0.34, -r * 0.2, r * 0.29, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1d211b'
    ctx.beginPath(); ctx.arc(-r * 0.27, -r * 0.18, r * 0.13, 0, Math.PI * 2); ctx.arc(r * 0.41, -r * 0.18, r * 0.13, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#38231b'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-r * 0.62, -r * 0.55); ctx.lineTo(-r * 0.14, -r * 0.4)
    ctx.moveTo(r * 0.14, -r * 0.4); ctx.lineTo(r * 0.62, -r * 0.58)
    ctx.stroke()
    ctx.beginPath(); ctx.arc(r * 0.04, r * 0.28, r * 0.27, 0.25, Math.PI - 0.25); ctx.stroke()

    this.drawAcornFinishDetails(bird, visualType, style, r, queued)

    if (visualType === 'bomb') {
      ctx.fillStyle = '#332a26'
      ctx.strokeStyle = style.accent; ctx.lineWidth = 2.3
      ctx.beginPath()
      for (let point = 0; point < 16; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 8
        const radius = r * (point % 2 ? 0.34 : 0.54)
        const x = Math.cos(angle) * radius
        const y = r * 0.52 + Math.sin(angle) * radius
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = style.accent; ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.13, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#38231b'; ctx.lineWidth = 2.4
      ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 1.43); ctx.quadraticCurveTo(r * 0.9, -r * 1.88, r * 1.13, -r * 1.52); ctx.quadraticCurveTo(r * 1.33, -r * 1.25, r * 1.1, -r * 2.04); ctx.stroke()
      ctx.fillStyle = '#ffd76a'
      ctx.beginPath()
      for (let point = 0; point < 8; point += 1) {
        const angle = point * Math.PI / 4
        const radius = point % 2 ? 2.5 : 5
        const x = r * 1.1 + Math.cos(angle) * radius
        const y = -r * 2.08 + Math.sin(angle) * radius
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill()
    } else if (visualType === 'split') {
      ctx.strokeStyle = '#f3f6d9'; ctx.lineWidth = 3.1
      ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(0, r * 0.24); ctx.lineTo(-r * 0.48, -r * 0.04)
      ctx.moveTo(0, r * 0.24); ctx.lineTo(r * 0.48, -r * 0.04); ctx.stroke()
      ctx.strokeStyle = 'rgba(53,69,45,.58)'; ctx.lineWidth = 1.1
      ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(0, r * 0.93); ctx.stroke()
    } else if (visualType === 'dash') {
      ctx.fillStyle = '#fff0a8'
      ctx.beginPath()
      ctx.moveTo(r * 0.2, -r * 0.02); ctx.lineTo(-r * 0.5, r * 0.56); ctx.lineTo(-r * 0.05, r * 0.56)
      ctx.lineTo(-r * 0.4, r * 1.12); ctx.lineTo(r * 0.58, r * 0.32); ctx.lineTo(r * 0.1, r * 0.32)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#6b4b1d'; ctx.lineWidth = 1.2; ctx.stroke()
    } else if (visualType === 'fire') {
      ctx.fillStyle = '#ffd35a'
      ctx.strokeStyle = '#6f2b20'; ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, r * 1.02)
      ctx.bezierCurveTo(-r * 0.62, r * 0.65, -r * 0.52, r * 0.22, 0, -r * 0.1)
      ctx.bezierCurveTo(r * 0.58, r * 0.36, r * 0.56, r * 0.72, 0, r * 1.02)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#ff7a2c'
      ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.18, r * 0.34, 0, 0, Math.PI * 2); ctx.fill()
    } else if (visualType === 'drill') {
      ctx.strokeStyle = style.accent; ctx.lineWidth = 2.4
      ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.18); ctx.lineTo(0, r * 0.55); ctx.lineTo(r * 0.45, r * 0.18)
      ctx.moveTo(-r * 0.4, r * 0.52); ctx.lineTo(0, r * 0.86); ctx.lineTo(r * 0.4, r * 0.52); ctx.stroke()
    } else if (visualType === 'frost') {
      ctx.strokeStyle = '#f3fbf7'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(0, r * 0.95); ctx.moveTo(-r * 0.48, r * 0.26); ctx.lineTo(r * 0.48, r * 0.75); ctx.moveTo(r * 0.48, r * 0.26); ctx.lineTo(-r * 0.48, r * 0.75); ctx.stroke()
    } else if (visualType === 'vine') {
      ctx.strokeStyle = '#e8f0c8'; ctx.lineWidth = 2.4
      ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.42, -0.5, Math.PI * 1.55); ctx.quadraticCurveTo(r * 0.2, r * 0.3, -r * 0.16, r * 0.48); ctx.stroke()
    } else if (visualType === 'boomerang') {
      ctx.strokeStyle = '#efe0f3'; ctx.lineWidth = 2.3
      ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.42, -2.5, 0.55); ctx.lineTo(r * 0.42, r * 0.12); ctx.moveTo(r * 0.42, r * 0.12); ctx.lineTo(r * 0.1, r * 0.05); ctx.stroke()
    } else if (visualType === 'quake') {
      ctx.strokeStyle = '#efc36f'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(-r * 0.18, r * 0.42); ctx.lineTo(r * 0.12, r * 0.62); ctx.lineTo(-r * 0.12, r); ctx.moveTo(-r * 0.18, r * 0.42); ctx.lineTo(-r * 0.55, r * 0.68); ctx.moveTo(r * 0.12, r * 0.62); ctx.lineTo(r * 0.55, r * 0.82); ctx.stroke()
    } else if (visualType === 'talent-emberheart') {
      ctx.fillStyle = '#ffd15a'; ctx.strokeStyle = '#64231b'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(0, r)
      ctx.bezierCurveTo(-r * 0.58, r * 0.54, -r * 0.5, r * 0.04, 0, -r * 0.28)
      ctx.bezierCurveTo(r * 0.5, r * 0.04, r * 0.58, r * 0.54, 0, r); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#ff6a34'; ctx.beginPath(); ctx.arc(0, r * 0.44, r * 0.22, 0, Math.PI * 2); ctx.fill()
    } else if (visualType === 'talent-prism-bell') {
      ctx.strokeStyle = '#f1ffff'; ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(r * 0.5, r * 0.48)
      ctx.lineTo(0, r * 1.02); ctx.lineTo(-r * 0.5, r * 0.48); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(0, r * 1.02); ctx.stroke()
    } else if (visualType === 'talent-thunder-root') {
      ctx.strokeStyle = '#f5d66f'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.04); ctx.lineTo(-r * 0.22, r * 0.45)
      ctx.lineTo(r * 0.08, r * 0.48); ctx.lineTo(-r * 0.28, r * 1.02); ctx.stroke()
    }
    if (bird.used) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, 0, r + 2, 0.2, 2.8); ctx.stroke()
    }
    if (bird.fireArmed || bird.moltenHeartArmed) {
      ctx.globalAlpha = 0.68 + Math.sin(this.mapPulseTick * 0.5) * 0.16
      ctx.strokeStyle = '#ffb347'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (bird.abilityTicks > 0) {
      const activeColor = visualType === 'drill' ? '#f4b95d'
        : visualType === 'boomerang' ? '#dcb8e8' : '#fff0a8'
      ctx.globalAlpha = 0.55 + Math.sin(this.mapPulseTick * 0.45) * 0.18
      ctx.strokeStyle = activeColor
      ctx.lineWidth = 3
      ctx.setLineDash([5, 4])
      ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  drawSquirrelFinishDetails(squirrel, size, roster, outline, color) {
    const accent = roster?.visual.palette.accent || (squirrel.isBoss ? ART.brass : '#d7ae79')
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Inner ears and layered cheek fur keep the head readable without changing
    // the collision circle or the established face proportions.
    ctx.fillStyle = mixCss(color, '#eab8a2', 0.52)
    ctx.strokeStyle = outline
    ctx.lineWidth = Math.max(0.8, size * 0.055)
    for (const direction of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(direction * size * 0.59, -size * 0.68)
      ctx.lineTo(direction * size * 0.56, -size * 1.01)
      ctx.lineTo(direction * size * 0.38, -size * 0.71)
      ctx.closePath(); ctx.fill(); ctx.stroke()

      ctx.fillStyle = mixCss(color, '#f1d2ac', 0.55)
      ctx.beginPath()
      ctx.moveTo(direction * size * 0.56, size * 0.02)
      ctx.lineTo(direction * size * 0.81, size * 0.16)
      ctx.lineTo(direction * size * 0.59, size * 0.28)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = mixCss(color, '#eab8a2', 0.52)
    }

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-size * 0.31, -size * 0.41, Math.max(0.65, size * 0.045), 0, Math.PI * 2)
    ctx.arc(size * 0.37, -size * 0.41, Math.max(0.65, size * 0.045), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.34)'
    ctx.beginPath(); ctx.ellipse(-size * 0.2, size * 0.18, size * 0.25, size * 0.16, -0.24, 0, Math.PI * 2); ctx.fill()

    // Whiskers, tail rings and paw lines add finish at normal gameplay zoom.
    ctx.strokeStyle = mixCss(outline, '#f7e1c4', 0.38)
    ctx.lineWidth = Math.max(0.7, size * 0.045)
    for (const direction of [-1, 1]) {
      for (const offset of [-0.08, 0.1]) {
        ctx.beginPath(); ctx.moveTo(direction * size * 0.34, size * (0.1 + offset))
        ctx.quadraticCurveTo(direction * size * 0.78, size * (0.02 + offset), direction * size * 1.02, size * (0.13 + offset)); ctx.stroke()
      }
    }
    ctx.strokeStyle = 'rgba(248,224,185,.32)'
    ctx.lineWidth = Math.max(1, size * 0.07)
    for (const ratio of [-0.43, -0.04, 0.33]) {
      ctx.beginPath(); ctx.arc(size * 1.25, -size * 0.45, size * (0.48 + ratio * 0.08), -1.15 + ratio, 0.65 + ratio); ctx.stroke()
    }

    ctx.strokeStyle = outline
    ctx.lineWidth = Math.max(0.8, size * 0.05)
    for (const direction of [-1, 1]) {
      for (const toe of [-0.07, 0.08]) {
        ctx.beginPath(); ctx.moveTo(direction * size * (0.67 + toe), size * 0.48)
        ctx.lineTo(direction * size * (0.78 + toe), size * 0.62); ctx.stroke()
      }
    }

    if (squirrel.isBoss) {
      ctx.fillStyle = accent
      ctx.strokeStyle = outline
      ctx.lineWidth = Math.max(1, size * 0.06)
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * size * 0.38, -size * 0.72)
        ctx.lineTo(direction * size * 0.58, -size * 0.95)
        ctx.lineTo(direction * size * 0.68, -size * 0.64); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
      if ((squirrel.bossPhaseStage || 0) >= 2) {
        ctx.strokeStyle = '#a7493f'; ctx.lineWidth = Math.max(1.1, size * 0.065)
        ctx.beginPath(); ctx.moveTo(-size * 0.08, -size * 0.62); ctx.lineTo(size * 0.13, -size * 0.22)
        ctx.lineTo(-size * 0.03, size * 0.06); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawSquirrel(squirrel) {
    const size = squirrel.size
    const roster = SPECIAL_SQUIRREL_BY_TYPE[squirrel.variant]
    const color = roster?.visual.palette.fur || (squirrel.isBoss
      ? (squirrel.variant === 'king' ? '#7d563b' : '#74634b')
      : '#a96e43')
    const outline = roster?.visual.palette.outline || (squirrel.isBoss ? '#2d201b' : '#3c281f')
    const idle = !prefersReducedMotion && squirrel.asleep ? Math.sin((this.fixedTick + squirrel.id.length) * 0.075) : 0
    ctx.save()
    ctx.translate(squirrel.x, squirrel.y + idle * 0.7)
    if (squirrel.isBoss) {
      const phase = squirrel.bossPhaseStage || 0
      const auraPulse = prefersReducedMotion ? 0 : Math.sin(this.fixedTick * 0.08) * 2
      ctx.fillStyle = phase >= 2 ? 'rgba(177,65,55,.13)' : 'rgba(224,170,63,.1)'
      ctx.strokeStyle = phase >= 2 ? 'rgba(210,91,69,.68)' : 'rgba(224,170,63,.58)'
      ctx.lineWidth = 2 + phase * 0.7
      ctx.beginPath(); ctx.arc(0, -size * 0.08, size * 1.32 + auraPulse, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      for (let marker = 0; marker < Math.max(1, phase); marker += 1) {
        const angle = this.fixedTick * 0.025 + marker * Math.PI
        ctx.fillStyle = phase >= 2 ? '#d9674d' : '#e0aa3f'
        ctx.beginPath(); ctx.arc(
          Math.cos(angle) * size * 1.38,
          -size * 0.1 + Math.sin(angle) * size * 0.72,
          2.8 + phase,
          0,
          Math.PI * 2,
        ); ctx.fill()
      }
    }
    if (squirrel.variant === 'burrower' && squirrel.submerged) {
      const dirt = ctx.createRadialGradient(0, size * 0.2, 1, 0, size * 0.38, size * 1.5)
      dirt.addColorStop(0, '#9b6a3e'); dirt.addColorStop(0.58, '#765033'); dirt.addColorStop(1, '#4e3427')
      ctx.fillStyle = dirt; ctx.strokeStyle = outline; ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(0, size * 0.38, size * 1.42, size * 0.52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath(); ctx.ellipse(0, size * 0.02, size * 0.67, size * 0.44, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke()
      // The exposed helmet and lamp preserve the burrower's authored identity.
      const gear = roster?.visual.palette.gear || '#667254'
      const accent = roster?.visual.palette.accent || '#dca85e'
      ctx.fillStyle = gear
      ctx.beginPath(); ctx.arc(0, -size * 0.03, size * 0.7, Math.PI, Math.PI * 2)
      ctx.lineTo(size * 0.63, size * 0.02); ctx.lineTo(-size * 0.63, size * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, -size * 0.63, size * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff3a4'; ctx.beginPath(); ctx.arc(-size * 0.035, -size * 0.67, size * 0.075, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-size * 0.22, -size * 0.13, size * 0.14, 0, Math.PI * 2); ctx.arc(size * 0.22, -size * 0.13, size * 0.14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1d211b'; ctx.beginPath(); ctx.arc(-size * 0.2, -size * 0.12, size * 0.055, 0, Math.PI * 2); ctx.arc(size * 0.24, -size * 0.12, size * 0.055, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = mixCss(accent, '#f6e4b4', 0.35); ctx.lineWidth = 1.2
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * size * 0.68, size * 0.28)
        ctx.quadraticCurveTo(direction * size * 1.02, size * 0.1, direction * size * 1.28, size * 0.28); ctx.stroke()
      }
      ctx.restore()
      return
    }
    ctx.shadowColor = 'rgba(8,21,15,.34)'
    ctx.shadowBlur = 9
    ctx.shadowOffsetY = 4
    ctx.save()
    ctx.rotate(idle * 0.035)
    const tailFur = ctx.createLinearGradient(size * 0.45, size * 0.4, size * 1.65, -size * 1.25)
    tailFur.addColorStop(0, mixCss(color, outline, 0.16))
    tailFur.addColorStop(0.48, color)
    tailFur.addColorStop(1, mixCss(color, '#f3d0a3', 0.24))
    ctx.fillStyle = tailFur
    ctx.beginPath()
    ctx.moveTo(size * 0.52, size * 0.28)
    ctx.bezierCurveTo(size * 2.25, size * 0.22, size * 2.12, -size * 1.55, size * 1.17, -size * 1.34)
    ctx.bezierCurveTo(size * 0.62, -size * 1.15, size * 1.2, -size * 0.32, size * 0.52, size * 0.28)
    ctx.fill()
    ctx.strokeStyle = outline; ctx.lineWidth = squirrel.isBoss ? 3.2 : 2.2; ctx.stroke()
    ctx.strokeStyle = 'rgba(250,243,223,.2)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(size * 0.86, -size * 0.1); ctx.bezierCurveTo(size * 1.7, -size * 0.2, size * 1.7, -size, size * 1.22, -size * 1.12); ctx.stroke()
    ctx.restore()
    const bodyFur = ctx.createLinearGradient(-size * 0.7, -size * 0.75, size * 0.72, size * 0.75)
    bodyFur.addColorStop(0, mixCss(color, '#f4d6af', 0.2))
    bodyFur.addColorStop(0.52, color)
    bodyFur.addColorStop(1, mixCss(color, outline, 0.18))
    ctx.fillStyle = bodyFur
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.86, 0, 0, Math.PI * 2); ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = outline; ctx.lineWidth = squirrel.isBoss ? 3.2 : 2.2; ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-size * 0.75, -size * 0.57); ctx.lineTo(-size * 0.58, -size * 1.18); ctx.lineTo(-size * 0.22, -size * 0.7)
    ctx.moveTo(size * 0.22, -size * 0.7); ctx.lineTo(size * 0.58, -size * 1.18); ctx.lineTo(size * 0.75, -size * 0.57)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#ebcda4'
    ctx.beginPath(); ctx.ellipse(0, size * 0.18, size * 0.52, size * 0.46, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(-size * 0.34, -size * 0.38, size * 0.24, 0, Math.PI * 2); ctx.arc(size * 0.34, -size * 0.38, size * 0.24, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#171a16'
    ctx.beginPath(); ctx.arc(-size * 0.3, -size * 0.38, size * 0.1, 0, Math.PI * 2); ctx.arc(size * 0.38, -size * 0.38, size * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#3a211b'
    ctx.beginPath(); ctx.ellipse(0, size * 0.02, size * 0.16, size * 0.11, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a211b'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-size * 0.57, -size * 0.62); ctx.lineTo(-size * 0.14, -size * 0.53); ctx.moveTo(size * 0.15, -size * 0.53); ctx.lineTo(size * 0.59, -size * 0.64); ctx.stroke()
    ctx.fillStyle = '#fffdf4'
    ctx.fillRect(-4, size * 0.25, 3.5, size * 0.32)
    ctx.fillRect(0.5, size * 0.25, 3.5, size * 0.32)
    ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-size * 0.55, size * 0.44); ctx.lineTo(-size * 0.85, size * 0.55); ctx.moveTo(size * 0.55, size * 0.44); ctx.lineTo(size * 0.84, size * 0.55); ctx.stroke()
    this.drawSquirrelFinishDetails(squirrel, size, roster, outline, color)
    if (roster) this.drawSpecialSquirrelGear(squirrel, size, roster)
    if (squirrel.isBoss && !roster) {
      ctx.fillStyle = squirrel.variant === 'king' ? '#873f48' : '#52664b'
      ctx.beginPath(); ctx.moveTo(-size, -size * 0.05); ctx.lineTo(-size * 0.55, -size * 0.42); ctx.lineTo(-size * 0.22, size * 0.2); ctx.lineTo(-size * 0.7, size * 0.48); ctx.closePath(); ctx.fill(); ctx.stroke()
      // Broad leaf-iron pauldrons make the boss silhouette read separately
      // from regular squirrels even when the camera is zoomed out.
      ctx.fillStyle = squirrel.variant === 'king' ? '#9a5960' : '#3f6259'
      ctx.strokeStyle = '#2d201b'; ctx.lineWidth = 2.4
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(side * size * 0.42, -size * 0.36)
        ctx.lineTo(side * size * 1.12, -size * 0.25)
        ctx.lineTo(side * size * 0.96, size * 0.18)
        ctx.lineTo(side * size * 0.48, size * 0.08)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = ART.brass
        ctx.beginPath(); ctx.arc(side * size * 0.77, -size * 0.12, size * 0.075, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = squirrel.variant === 'king' ? '#9a5960' : '#3f6259'
      }
      if (squirrel.variant === 'king') {
        ctx.fillStyle = ART.brass
        ctx.beginPath()
        ctx.moveTo(-size * 0.72, -size * 0.9)
        ctx.lineTo(-size * 0.72, -size * 1.4)
        ctx.lineTo(-size * 0.34, -size * 1.08)
        ctx.lineTo(0, -size * 1.55)
        ctx.lineTo(size * 0.34, -size * 1.08)
        ctx.lineTo(size * 0.72, -size * 1.4)
        ctx.lineTo(size * 0.72, -size * 0.9)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = '#6d4b25'; ctx.lineWidth = 2.4; ctx.stroke()
        ctx.fillStyle = '#9f3144'; ctx.beginPath(); ctx.arc(0, -size * 1.34, size * 0.12, 0, Math.PI * 2); ctx.fill()
      } else {
        ctx.fillStyle = '#536e55'
        ctx.strokeStyle = '#2c4032'; ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(-size * 0.82, -size * 0.76)
        ctx.lineTo(-size * 0.58, -size * 1.32)
        ctx.lineTo(0, -size * 1.48)
        ctx.lineTo(size * 0.58, -size * 1.32)
        ctx.lineTo(size * 0.82, -size * 0.76)
        ctx.lineTo(size * 0.38, -size * 0.93)
        ctx.lineTo(0, -size * 0.82)
        ctx.lineTo(-size * 0.38, -size * 0.93)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#8aa55d'
        ctx.beginPath(); ctx.ellipse(0, -size * 1.35, size * 0.14, size * 0.36, 0.25, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#2c4032'; ctx.stroke()
      }
      const width = size * 2.55
      const barY = -size * 1.93
      ctx.fillStyle = 'rgba(18,22,18,.82)'
      roundedRect(ctx, -width / 2, barY, width, 10, 4); ctx.fill()
      ctx.fillStyle = '#ef4d41'
      roundedRect(ctx, -width / 2 + 2, barY + 2,
        (width - 4) * clamp(squirrel.hp / squirrel.maxHp, 0, 1), 6, 2); ctx.fill()
      ctx.strokeStyle = 'rgba(255,245,220,.54)'; ctx.lineWidth = 1
      for (let segment = 1; segment < 5; segment += 1) {
        const segmentX = -width / 2 + width * segment / 5
        ctx.beginPath(); ctx.moveTo(segmentX, barY + 1); ctx.lineTo(segmentX, barY + 9); ctx.stroke()
      }
      ctx.fillStyle = '#fff8e8'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(`${squirrel.bossTitle || '首领'}  ${Math.ceil(squirrel.hp)} / ${squirrel.maxHp}`, 0, barY - 2)
    }
    if (squirrel.isBoss && roster) {
      const width = size * 2.4
      const barY = -size * 1.98
      ctx.fillStyle = 'rgba(18,22,18,.78)'; roundedRect(ctx, -width / 2, barY, width, 8, 3); ctx.fill()
      ctx.fillStyle = roster.visual.palette.accent
      roundedRect(ctx, -width / 2 + 1, barY + 1,
        (width - 2) * clamp(squirrel.hp / squirrel.maxHp, 0, 1), 6, 2); ctx.fill()
    }
    if (squirrel.chilledTicks > 0) {
      ctx.fillStyle = 'rgba(191,242,244,.2)'
      ctx.strokeStyle = 'rgba(225,255,255,.8)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, -size * 0.05, size * 1.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      for (let index = 0; index < 4; index += 1) {
        const angle = this.mapPulseTick * 0.045 + index * Math.PI / 2
        const x = Math.cos(angle) * size * 1.35
        const y = -size * 0.1 + Math.sin(angle) * size * 0.72
        ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawSpecialSquirrelGear(squirrel, size, roster) {
    const { gear, accent, outline } = roster.visual.palette
    ctx.save()
    ctx.strokeStyle = outline; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    if (squirrel.variant === 'shield') {
      const shieldFace = ctx.createLinearGradient(-size * 1.55, -size, -size * 0.45, size)
      shieldFace.addColorStop(0, mixCss(gear, '#d8c58a', 0.28))
      shieldFace.addColorStop(0.5, gear)
      shieldFace.addColorStop(1, mixCss(gear, outline, 0.22))
      ctx.fillStyle = shieldFace
      ctx.beginPath(); ctx.moveTo(-size * 0.55, -size * 1.1); ctx.quadraticCurveTo(-size * 1.65, -size * 0.9, -size * 1.5, size * 0.65); ctx.lineTo(-size * 0.72, size * 1.02); ctx.lineTo(-size * 0.45, size * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = accent; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(-size * 0.85, -size * 0.72); ctx.lineTo(-size * 0.92, size * 0.64); ctx.moveTo(-size * 1.28, -size * 0.2); ctx.lineTo(-size * 0.65, size * 0.18); ctx.stroke()
      ctx.strokeStyle = mixCss(gear, '#f5e6b0', 0.48); ctx.lineWidth = 1.1
      ctx.beginPath(); ctx.moveTo(-size * 0.92, -size * 0.66); ctx.quadraticCurveTo(-size * 1.45, -size * 0.42, -size * 1.34, size * 0.5); ctx.stroke()
      ctx.fillStyle = '#d4a84f'; ctx.strokeStyle = outline; ctx.lineWidth = 0.9
      for (const [x, y] of [[-0.72, -0.72], [-1.37, -0.42], [-1.26, 0.55], [-0.72, 0.66]]) {
        ctx.beginPath(); ctx.arc(x * size, y * size, size * 0.075, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      if (squirrel.shieldHp <= 0) {
        ctx.strokeStyle = '#f5d7be'; ctx.beginPath(); ctx.moveTo(-size * 1.25, -size * 0.42); ctx.lineTo(-size * 0.78, size * 0.06); ctx.lineTo(-size * 1.16, size * 0.46); ctx.stroke()
      }
    } else if (squirrel.variant === 'engineer') {
      const toolbox = ctx.createLinearGradient(size * 0.48, -size * 0.65, size * 1.33, size * 0.53)
      toolbox.addColorStop(0, mixCss(gear, '#d7e1df', 0.24)); toolbox.addColorStop(1, mixCss(gear, outline, 0.18))
      ctx.fillStyle = toolbox
      roundedRect(ctx, size * 0.48, -size * 0.65, size * 0.85, size * 1.18, 4); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = accent; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(size * 0.55, -size * 0.18); ctx.lineTo(size * 1.25, -size * 0.18)
      ctx.moveTo(size * 0.84, -size * 0.57); ctx.lineTo(size * 0.84, size * 0.45); ctx.stroke()
      ctx.strokeStyle = accent; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(size * 0.5, -size * 1.25); ctx.lineTo(size * 0.1, -size * 0.65); ctx.arc(size * 0.56, -size * 1.35, size * 0.28, 0.5, 2.5); ctx.stroke()
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(size * 0.92, 0, size * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#dca84c'; ctx.strokeStyle = outline; ctx.lineWidth = 1.1
      roundedRect(ctx, -size * 0.67, -size * 0.98, size * 1.34, size * 0.28, size * 0.12); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#d7edf0'
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(direction * size * 0.32, -size * 0.82, size * 0.25, size * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.beginPath(); ctx.arc(direction * size * 0.26, -size * 0.87, size * 0.055, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d7edf0'
      }
    } else if (squirrel.variant === 'glider') {
      const membrane = ctx.createLinearGradient(0, -size, 0, size * 0.5)
      membrane.addColorStop(0, mixCss(gear, '#d9f0eb', 0.34)); membrane.addColorStop(1, mixCss(gear, '#31565b', 0.2))
      ctx.globalAlpha = 0.84; ctx.fillStyle = membrane
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * size * 0.55, -size * 0.25); ctx.lineTo(direction * size * 1.8, -size * 0.95); ctx.lineTo(direction * size * 1.45, size * 0.48); ctx.lineTo(direction * size * 0.48, size * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = mixCss(accent, gear, 0.28); ctx.lineWidth = 1.25
        ctx.beginPath(); ctx.moveTo(direction * size * 0.55, -size * 0.22)
        ctx.lineTo(direction * size * 1.53, -size * 0.64)
        ctx.moveTo(direction * size * 0.62, 0); ctx.lineTo(direction * size * 1.4, size * 0.31); ctx.stroke()
      }
      ctx.globalAlpha = 1; ctx.fillStyle = accent
      roundedRect(ctx, -size * 0.48, -size * 0.86, size * 0.96, size * 0.3, 3); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#bcebf0'
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(direction * size * 0.24, -size * 0.71, size * 0.24, size * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.strokeStyle = outline; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(-size * 0.46, -size * 0.72); ctx.lineTo(size * 0.46, -size * 0.72); ctx.stroke()
    } else if (squirrel.variant === 'shaman') {
      ctx.strokeStyle = accent; ctx.globalAlpha = 0.22 + this.shamanAuraStrength(squirrel) * 0.3; ctx.lineWidth = 2
      ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(0, 0, size * 1.45, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      ctx.fillStyle = mixCss(gear, '#d7e7e6', 0.22); ctx.strokeStyle = outline; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.moveTo(-size * 0.82, -size * 0.72); ctx.lineTo(-size * 0.42, -size * 1.38)
      ctx.lineTo(0, -size * 1.08); ctx.lineTo(size * 0.42, -size * 1.38)
      ctx.lineTo(size * 0.82, -size * 0.72); ctx.quadraticCurveTo(0, -size * 0.38, -size * 0.82, -size * 0.72); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2
      for (const direction of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(direction * size * 0.3, -size * 1.08)
        ctx.lineTo(direction * size * 0.52, -size * 1.72)
        ctx.lineTo(direction * size * 0.82, -size * 1.95); ctx.stroke()
        ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(direction * size * 0.82, -size * 2.08)
        ctx.lineTo(direction * size * 0.97, -size * 1.84); ctx.lineTo(direction * size * 0.7, -size * 1.84); ctx.closePath(); ctx.fill()
      }
      ctx.strokeStyle = gear; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(size * 0.85, size * 0.72); ctx.lineTo(size * 1.2, -size * 1.38); ctx.moveTo(size * 1.2, -size * 1.38); ctx.lineTo(size * 0.86, -size * 1.75); ctx.moveTo(size * 1.2, -size * 1.38); ctx.lineTo(size * 1.56, -size * 1.72); ctx.stroke()
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(size * 1.2, -size * 1.38, size * 0.18, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(0, size * 0.12); ctx.lineTo(size * 0.2, size * 0.42); ctx.lineTo(0, size * 0.72); ctx.lineTo(-size * 0.2, size * 0.42); ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (squirrel.variant === 'burrower') {
      const helmet = ctx.createLinearGradient(-size, -size, size, -size * 0.1)
      helmet.addColorStop(0, mixCss(gear, '#d6cf9c', 0.24)); helmet.addColorStop(1, mixCss(gear, outline, 0.2))
      ctx.fillStyle = helmet
      ctx.beginPath(); ctx.arc(0, -size * 0.42, size * 0.92, Math.PI, Math.PI * 2); ctx.lineTo(size * 0.8, -size * 0.18); ctx.lineTo(-size * 0.8, -size * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = accent; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(-size * 0.68, -size * 0.46); ctx.lineTo(size * 0.68, -size * 0.46); ctx.stroke()
      ctx.fillStyle = '#dca85e'; ctx.strokeStyle = outline
      ctx.beginPath(); ctx.arc(0, -size * 1.08, size * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff1a6'; ctx.beginPath(); ctx.arc(-size * 0.04, -size * 1.12, size * 0.09, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(size * 0.76, size * 0.15, size * 0.18, size * 0.78, -0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#707a72'; ctx.beginPath(); ctx.moveTo(size * 0.38, size * 0.65)
      ctx.lineTo(size * 1.08, size * 0.28); ctx.lineTo(size * 1.2, size * 0.55)
      ctx.lineTo(size * 0.56, size * 0.93); ctx.closePath(); ctx.fill(); ctx.stroke()
    }

    if (squirrel.isBoss) {
      const phase = squirrel.bossPhaseStage || 0
      ctx.fillStyle = accent; ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.4, size * 0.075)
      ctx.beginPath(); ctx.moveTo(-size * 0.72, -size * 1.04)
      ctx.lineTo(-size * 0.48, -size * (1.45 + phase * 0.08))
      ctx.lineTo(0, -size * 1.18)
      ctx.lineTo(size * 0.48, -size * (1.45 + phase * 0.08))
      ctx.lineTo(size * 0.72, -size * 1.04)
      ctx.quadraticCurveTo(0, -size * 0.78, -size * 0.72, -size * 1.04)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = phase >= 2 ? '#d5584a' : '#f0d783'
      ctx.beginPath(); ctx.arc(0, -size * 1.23, size * 0.11, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      for (const direction of [-1, 1]) {
        ctx.fillStyle = mixCss(gear, accent, 0.3)
        ctx.beginPath(); ctx.moveTo(direction * size * 0.44, -size * 0.3)
        ctx.lineTo(direction * size * 1.18, -size * 0.18)
        ctx.lineTo(direction * size * 0.96, size * 0.3)
        ctx.lineTo(direction * size * 0.48, size * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawEgg(egg) {
    ctx.save()
    ctx.translate(egg.x, egg.y)
    ctx.shadowColor = '#ffdc69'
    ctx.shadowBlur = 18
    const glow = 1 + (prefersReducedMotion ? 0 : Math.sin(this.fixedTick * 0.11) * 0.055)
    ctx.scale(glow, glow)
    const gold = ctx.createLinearGradient(-10, -12, 10, 13)
    gold.addColorStop(0, '#fff0a8'); gold.addColorStop(0.4, '#e5ad43'); gold.addColorStop(1, '#9b672a')
    ctx.fillStyle = gold
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.bezierCurveTo(12, -7, 11, 8, 0, 15); ctx.bezierCurveTo(-11, 8, -12, -7, 0, -13); ctx.fill()
    ctx.strokeStyle = '#7a4c23'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#6e4c29'; ctx.beginPath(); ctx.ellipse(0, -11, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,245,190,.5)'; ctx.lineWidth = 1
    for (let line = -1; line <= 1; line += 1) { ctx.beginPath(); ctx.moveTo(line * 5 - 3, -13); ctx.lineTo(line * 5 + 3, -9); ctx.stroke() }
    ctx.fillStyle = ART.moss
    ctx.beginPath(); ctx.ellipse(2, -18, 3, 7, 0.35, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.beginPath(); ctx.ellipse(-4, -4, 2, 5, -0.35, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  drawTrail() {
    if (!this.trail.length) return
    for (let index = 0; index < this.trail.length; index += 1) {
      const point = this.trail[index]
      const alpha = (index + 1) / this.trail.length * 0.48
      if (Math.abs(point.windX || 0) >= 0.005) {
        const direction = Math.sign(point.windX)
        const windStrength = clamp(Math.abs(point.windX) / MAX_WIND_MAGNITUDE, 0, 1)
        ctx.globalAlpha = alpha * 0.72
        ctx.strokeStyle = 'rgba(199,239,236,.92)'
        ctx.lineWidth = 1.2 + windStrength
        ctx.beginPath()
        ctx.moveTo(point.x - direction * (7 + windStrength * 13), point.y - 1.5)
        ctx.lineTo(point.x + direction * 3, point.y + 1.5)
        ctx.stroke()
      }
      ctx.globalAlpha = alpha
      ctx.fillStyle = BIRD_STYLE[point.type]?.trail || ART.ivory
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(index * 0.7)
      ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  drawTethers() {
    for (const bird of this.birds) {
      if (bird.tetherTicks <= 0 || !bird.tetherTargetId) continue
      const target = [...this.blocks, ...this.platforms].find((entry) => entry.id === bird.tetherTargetId)
      if (!target) continue
      const ability = SPECIAL_ACORN_BY_TYPE.vine.ability
      const displacementProgress = clamp(
        (bird.tetherDisplacement || 0) / Math.max(1, ability.displacementThreshold),
        0,
        1,
      )
      ctx.save()
      ctx.strokeStyle = mixCss('#5c7f45', '#e9d268', displacementProgress * 0.72)
      ctx.shadowColor = 'rgba(216,231,173,.55)'
      ctx.shadowBlur = 7 + displacementProgress * 7
      ctx.lineWidth = 3.2 + displacementProgress * 2.2
      ctx.beginPath()
      ctx.moveTo(bird.x, bird.y)
      const midpointX = (bird.x + target.x) / 2
      const midpointY = (bird.y + target.y) / 2 + 10 - displacementProgress * 9
      ctx.quadraticCurveTo(midpointX, midpointY, target.x, target.y)
      ctx.stroke()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = '#d8e7ad'
      ctx.beginPath(); ctx.ellipse(midpointX, midpointY, 5, 2.5, -0.35, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      this.drawVineTargetOutline(target, {
        color: mixCss('#719555', '#e3bb54', displacementProgress * 0.7),
        alpha: 0.84,
        width: 2.5 + displacementProgress,
      })
      ctx.save()
      ctx.translate(target.x, target.y)
      ctx.rotate((target.rotation || 0) * Math.PI / 180)
      ctx.strokeStyle = 'rgba(91,126,65,.9)'
      ctx.lineWidth = 2.4
      for (const offset of [-0.22, 0, 0.22]) {
        ctx.beginPath()
        ctx.ellipse(0, offset * target.height, target.width * 0.52 + 3, Math.max(4, target.height * 0.23), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      const gaugeWidth = Math.max(30, Math.min(56, target.width * 0.72))
      const gaugeY = -target.height / 2 - 12
      ctx.fillStyle = 'rgba(20,42,29,.65)'
      roundedRect(ctx, -gaugeWidth / 2, gaugeY, gaugeWidth, 5, 2.5); ctx.fill()
      ctx.fillStyle = displacementProgress >= 1 ? '#f0c75e' : '#d8e7ad'
      roundedRect(ctx, -gaugeWidth / 2, gaugeY, gaugeWidth * displacementProgress, 5, 2.5); ctx.fill()
      ctx.restore()
    }
  }

  vinePreviewHitsSolid({ x, y, previousX, previousY, radius }) {
    const circle = { x, y, radius }
    const previousCircle = { x: previousX, y: previousY, radius }
    const obstacles = [
      ...this.blocks.map((rectangle) => ({ rectangle, solid: true })),
      ...this.platforms.map((rectangle) => ({
        rectangle,
        solid: rectangle.blocksBirds !== false,
      })),
    ]
    for (const { rectangle, solid } of obstacles) {
      if (!solid) continue
      if (circleRectCollisionManifold(circle, rectangle)) return true
      if (resolveSweptCircleRectCollision(circle, rectangle, {
        previousCircle,
        previousRectangle: {
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height,
          rotation: rectangle.rotation || 0,
        },
        restitution: 0,
      })) return true
    }
    return false
  }

  vinePreviewSelection(bird) {
    if (!bird || bird.type !== 'vine' || bird.used) return null
    const ability = SPECIAL_ACORN_BY_TYPE.vine.ability
    if (bird.launched) {
      const selection = selectVineWinchTarget({
        origin: bird,
        blocks: this.blocks,
        platforms: this.platforms,
        range: ability.range,
      })
      return selection ? { ...selection, origin: { x: bird.x, y: bird.y } } : null
    }
    if (!this.dragging && !this.keyboardAiming) return null
    let x = bird.x
    let y = bird.y
    let vx = (SLING_X - bird.x) * POWER * bird.launchSpeed
    let vy = (ANCHOR_Y - bird.y) * POWER * bird.launchSpeed
    const previewWind = this.pendingLaunchWind()
    let best = null
    for (let step = 0; step < 110; step += 1) {
      const previousX = x
      const previousY = y
      const shaman = this.squirrels.find((squirrel) => squirrel.variant === 'shaman'
        && Math.hypot(squirrel.x - x, squirrel.y - y) <= SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.radius)
      const auraStrength = this.shamanAuraStrength(shaman, step)
      const auraGravity = 1 + (SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdGravityMultiplier - 1) * auraStrength
      const auraSpeed = 1 - (1 - SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdSpeedMultiplier) * auraStrength
      vy += GRAVITY * bird.gravityScale * this.specialRuleParameter('low-gravity', 'gravityScale', 1)
        * auraGravity * this.talentEffect('feather', 'gravityMultiplier', 1)
      vx += previewWind * bird.windMultiplier * this.talentEffect('tailwind', 'windMultiplier', 1)
      vy += this.specialUpdraftAt(x)
      if (this.specialWaterY !== null && y > this.specialWaterY) {
        const water = this.specialRule('water-cycle')
        vy -= (water?.parameters?.buoyancy || 0.58) * GRAVITY
        vx *= water?.parameters?.drag || 0.86
        vy *= water?.parameters?.drag || 0.86
      }
      vx *= FRICTION
      vy *= FRICTION
      x += vx * auraSpeed
      y += vy * auraSpeed
      const hitSolid = this.vinePreviewHitsSolid({
        x,
        y,
        previousX,
        previousY,
        radius: bird.hitRadius || bird.radius,
      })
      if (step % 2 === 0) {
        const selection = selectVineWinchTarget({
          origin: { x, y },
          blocks: this.blocks,
          platforms: this.platforms,
          range: ability.range,
        })
        if (selection) {
          const preview = { ...selection, origin: { x, y }, step }
          if (!best || preview.priority < best.priority
            || (preview.priority === best.priority && preview.distance < best.distance)
            || (preview.priority === best.priority && preview.distance === best.distance && step < best.step)) {
            best = preview
          }
        }
      }
      if (hitSolid || y >= GROUND_Y - bird.radius || x > WORLD_MAX_X || x < WORLD_MIN_X) break
    }
    return best
  }

  drawVineTargetOutline(target, { color = '#d8e7ad', alpha = 0.72, width = 2 } = {}) {
    if (!target) return
    ctx.save()
    ctx.translate(target.x, target.y)
    ctx.rotate((target.rotation || 0) * Math.PI / 180)
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 9
    ctx.lineWidth = width
    roundedRect(ctx, -target.width / 2 - 4, -target.height / 2 - 4, target.width + 8, target.height + 8, 7)
    ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.setLineDash([4, 4])
    ctx.globalAlpha = alpha * 0.72
    roundedRect(ctx, -target.width / 2 - 8, -target.height / 2 - 8, target.width + 16, target.height + 16, 9)
    ctx.stroke()
    ctx.restore()
  }

  drawVineTargetPreview() {
    const bird = this.currentBird
    const preview = this.vinePreviewSelection(bird)
    if (!preview) return
    const { target, origin } = preview
    ctx.save()
    ctx.strokeStyle = 'rgba(207,225,158,.78)'
    ctx.lineWidth = 2
    ctx.setLineDash([7, 6])
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    const midpointX = (origin.x + target.x) / 2
    const midpointY = (origin.y + target.y) / 2 + 12
    ctx.quadraticCurveTo(midpointX, midpointY, target.x, target.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(216,231,173,.86)'
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 4.5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(midpointX, midpointY, 5, 2.4, -0.38, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    this.drawVineTargetOutline(target, {
      color: target.tutorialTetherTarget ? '#f0c75e' : '#d8e7ad',
      alpha: target.tutorialTetherTarget ? 0.95 : 0.72,
      width: target.tutorialTetherTarget ? 3 : 2,
    })
  }

  predictAimPath(bird, windX = this.pendingLaunchWind()) {
    let x = bird.x
    let y = bird.y
    let vx = (SLING_X - bird.x) * POWER * bird.launchSpeed
    let vy = (ANCHOR_Y - bird.y) * POWER * bird.launchSpeed
    const points = [{ x, y }]
    for (let step = 0; step < 120; step += 1) {
      const previousX = x
      const previousY = y
      const shaman = this.squirrels.find((squirrel) => squirrel.variant === 'shaman'
        && Math.hypot(squirrel.x - x, squirrel.y - y) <= SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.radius)
      const auraStrength = this.shamanAuraStrength(shaman, step)
      const auraGravity = 1 + (SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdGravityMultiplier - 1) * auraStrength
      const auraSpeed = 1 - (1 - SPECIAL_SQUIRREL_BY_TYPE.shaman.ability.birdSpeedMultiplier) * auraStrength
      vy += GRAVITY * bird.gravityScale * this.specialRuleParameter('low-gravity', 'gravityScale', 1)
        * auraGravity * this.talentEffect('feather', 'gravityMultiplier', 1)
      vx += windX * bird.windMultiplier * this.talentEffect('tailwind', 'windMultiplier', 1)
      vy += this.specialUpdraftAt(x)
      if (this.specialWaterY !== null && y > this.specialWaterY) {
        const water = this.specialRule('water-cycle')
        vy -= (water?.parameters?.buoyancy || 0.58) * GRAVITY
        vx *= water?.parameters?.drag || 0.86
        vy *= water?.parameters?.drag || 0.86
      }
      vx *= FRICTION
      vy *= FRICTION
      x += vx * auraSpeed
      y += vy * auraSpeed
      const vineHitSolid = bird.type === 'vine' && this.vinePreviewHitsSolid({
        x,
        y,
        previousX,
        previousY,
        radius: bird.hitRadius || bird.radius,
      })
      points.push({ x, y })
      if (vineHitSolid || y >= GROUND_Y - bird.radius) break
    }
    return points
  }

  drawAimGuide(bird) {
    const previewWind = this.save.settings.aimGuideMode === 'beginner'
      ? this.pendingLaunchWind()
      : 0
    const points = this.predictAimPath(bird, previewWind)
    const metrics = aimGuideVisualMetrics(this.camera.zoom)

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([metrics.dashLength, metrics.gapLength])
    ctx.strokeStyle = AIM_GUIDE_STYLE.color
    ctx.lineWidth = metrics.lineWidth
    ctx.shadowColor = AIM_GUIDE_STYLE.shadowColor
    ctx.shadowBlur = metrics.shadowBlur
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y)
    }
    ctx.stroke()
    ctx.restore()
  }

  drawWindTraceGuide(bird) {
    const guideProfile = this.windTraceGuideProfile()
    const previewWind = this.pendingLaunchWind()
    if (Math.abs(previewWind) < 0.005) return
    const calmPoints = this.predictAimPath(bird, 0)
    const windPoints = this.predictAimPath(bird, previewWind)
    const pointCount = Math.min(calmPoints.length, windPoints.length)
    if (pointCount < 3) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (guideProfile.corridor) {
      const start = Math.max(1, Math.floor(pointCount * 0.18))
      ctx.fillStyle = 'rgba(224,185,86,.12)'
      ctx.strokeStyle = 'rgba(239,204,111,.58)'
      ctx.lineWidth = 1.35 / Math.max(0.7, this.camera.zoom)
      ctx.beginPath()
      ctx.moveTo(calmPoints[start].x, calmPoints[start].y)
      for (let index = start + 1; index < pointCount; index += 1) {
        ctx.lineTo(calmPoints[index].x, calmPoints[index].y)
      }
      for (let index = pointCount - 1; index >= start; index -= 1) {
        ctx.lineTo(windPoints[index].x, windPoints[index].y)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()

      for (const ratio of [0.36, 0.62, 0.84]) {
        const index = Math.min(pointCount - 1, Math.max(start, Math.floor(pointCount * ratio)))
        const calm = calmPoints[index]
        const winded = windPoints[index]
        ctx.strokeStyle = 'rgba(246,213,120,.82)'
        ctx.beginPath(); ctx.moveTo(calm.x, calm.y); ctx.lineTo(winded.x, winded.y); ctx.stroke()
        const direction = Math.sign(winded.x - calm.x) || Math.sign(previewWind)
        ctx.fillStyle = '#f4d77e'
        ctx.beginPath(); ctx.moveTo(winded.x, winded.y)
        ctx.lineTo(winded.x - direction * 7, winded.y - 4)
        ctx.lineTo(winded.x - direction * 7, winded.y + 4); ctx.closePath(); ctx.fill()
      }
    }

    if (guideProfile.landingMarker) {
      const landing = windPoints[pointCount - 1]
      const pulse = prefersReducedMotion ? 0 : Math.sin(this.mapPulseTick * 0.12) * 3
      ctx.strokeStyle = '#f2cd68'
      ctx.fillStyle = 'rgba(242,205,104,.14)'
      ctx.lineWidth = 2.2 / Math.max(0.7, this.camera.zoom)
      ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.ellipse(landing.x, landing.y, 17 + pulse, 7 + pulse * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#fff2b2'
      ctx.font = '800 10px ui-sans-serif, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText('风迹落点', landing.x, landing.y - 11)
    }
    ctx.restore()
  }

  drawFlame(flame) {
    const alpha = clamp(flame.life / flame.maxLife, 0, 1)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = '#ff6a00'
    ctx.shadowBlur = 12
    ctx.translate(flame.x, flame.y)
    ctx.rotate(-0.25)
    ctx.fillStyle = '#ef6a35'
    ctx.beginPath(); ctx.moveTo(0, -12 * alpha); ctx.bezierCurveTo(9, -4, 8, 7, 0, 10); ctx.bezierCurveTo(-8, 7, -9, -3, 0, -12 * alpha); ctx.fill()
    ctx.fillStyle = '#ffd85b'
    ctx.beginPath(); ctx.moveTo(0, -5 * alpha); ctx.bezierCurveTo(4, 0, 3, 5, 0, 6); ctx.bezierCurveTo(-3, 4, -4, 0, 0, -5 * alpha); ctx.fill()
    ctx.restore()
  }

  drawParticle(particle) {
    if (prefersReducedMotion && ['leaf', 'chip'].includes(particle.kind)) return
    const alpha = clamp(particle.life / particle.maxLife, 0, 1)
    ctx.save()
    ctx.globalAlpha = alpha
    if (particle.kind === 'ring') {
      ctx.strokeStyle = particle.color
      ctx.lineWidth = 4 * alpha
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); ctx.stroke()
    } else if (particle.kind === 'leaf') {
      ctx.fillStyle = particle.color
      ctx.translate(particle.x, particle.y); ctx.rotate((particle.life + particle.id.length) * 0.2)
      ctx.beginPath(); ctx.ellipse(0, 0, particle.size * 1.35, particle.size * 0.55, 0, 0, Math.PI * 2); ctx.fill()
    } else if (particle.kind === 'chip') {
      ctx.fillStyle = particle.color
      ctx.translate(particle.x, particle.y); ctx.rotate((particle.life + particle.id.length) * 0.25)
      ctx.fillRect(-particle.size, -particle.size * 0.45, particle.size * 2, particle.size * 0.9)
    } else {
      ctx.fillStyle = particle.color
      ctx.translate(particle.x, particle.y); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-particle.size * 0.7, -particle.size * 0.7, particle.size * 1.4, particle.size * 1.4)
    }
    ctx.restore()
  }

  drawVignette() {
    const warm = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height)
    warm.addColorStop(0, 'rgba(245,201,111,.08)')
    warm.addColorStop(0.42, 'rgba(245,201,111,0)')
    warm.addColorStop(1, 'rgba(25,48,42,.08)')
    ctx.fillStyle = warm
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height)
    const vignette = ctx.createRadialGradient(450, 290, 280, 450, 290, 630)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(5,13,9,.25)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height)
  }

  getCollisionDiagnostics() {
    const visibleSquirrels = this.squirrels.filter((squirrel) => !squirrel.submerged)
    const structureOverlapPairs = []
    for (const squirrel of visibleSquirrels) {
      for (const solid of [...this.blocks, ...this.platforms]) {
        const manifold = circleRectCollisionManifold(squirrel, solid)
        if (manifold && manifold.overlap > 0.1) {
          structureOverlapPairs.push({
            squirrelId: squirrel.id,
            solidId: solid.id,
            overlap: round3(manifold.overlap),
          })
        }
      }
    }
    const squirrelOverlapPairs = []
    for (let first = 0; first < visibleSquirrels.length; first += 1) {
      for (let second = first + 1; second < visibleSquirrels.length; second += 1) {
        if (circlesOverlap(visibleSquirrels[first], visibleSquirrels[second])) {
          squirrelOverlapPairs.push({
            firstId: visibleSquirrels[first].id,
            secondId: visibleSquirrels[second].id,
          })
        }
      }
    }
    return {
      structureOverlapPairs,
      squirrelOverlapPairs,
      unresolvedSquirrelIds: visibleSquirrels
        .filter((squirrel) => (squirrel.unresolvedTicks || 0) > 0)
        .map((squirrel) => squirrel.id),
      pinnedSquirrelIds: visibleSquirrels
        .filter((squirrel) => squirrel.pinned)
        .map((squirrel) => squirrel.id),
      recoveredSquirrelIds: visibleSquirrels
        .filter((squirrel) => (squirrel.recoveryCount || 0) > 0)
        .map((squirrel) => squirrel.id),
    }
  }

  getSnapshot() {
    const collisionDiagnostics = this.getCollisionDiagnostics()
    const snapshotStability = analyzeStructureStability(
      this.blocks,
      this.platforms.filter((platform) => platform.affectsStructures !== false),
      {
        groundY: GROUND_Y,
        contactTolerance: STRUCTURE_CONTACT_TOLERANCE,
        angleTolerance: STRUCTURE_ANGLE_TOLERANCE,
        edgeInset: 1,
        joints: this.structureJoints,
      },
    )
    const birdSnapshot = (bird) => bird ? {
      id: bird.id, type: bird.type, x: round3(bird.x), y: round3(bird.y),
      vx: round3(bird.vx), vy: round3(bird.vy), used: bird.used, launched: bird.launched,
      age: bird.age, stillTicks: bird.stillTicks, groundContactTicks: bird.groundContactTicks,
      structureStillTicks: bird.structureStillTicks, platformStillTicks: bird.platformStillTicks,
      stalledTicks: bird.stalledTicks, outsideWorldTicks: bird.outsideWorldTicks,
      lifecycleReason: bird.lifecycleReason,
      abilityTicks: bird.abilityTicks, pierceRemaining: bird.pierceRemaining,
      tetherTicks: bird.tetherTicks, tetherTargetId: bird.tetherTargetId,
      tetherTargetKind: bird.tetherTargetKind,
      tetherDisplacement: round3(bird.tetherDisplacement || 0),
      tetherReleaseTriggered: bird.tetherReleaseTriggered,
      quakeArmed: bird.quakeArmed,
      moltenHeartArmed: bird.moltenHeartArmed,
      thunderRootArmed: bird.thunderRootArmed,
      windborneStrikeReady: bird.windborneStrikeReady,
      aceSupply: bird.aceSupply,
      bonusShot: Boolean(bird.bonusShot),
      grantedDamageBonus: bird.grantedDamageBonus || 0,
      flatDamageBonus: bird.flatDamageBonus || 0,
      talentContractId: bird.talentContractId || null,
    } : null
    return {
      version: SAVE_VERSION,
      state: this.state,
      mode: this.mode,
      level: this.level,
      specialCampaignId: this.specialCampaignId,
      specialStageNumber: this.specialStageNumber,
      specialBackgroundScene: this.specialBackgroundScene ? {
        id: this.specialBackgroundScene.id,
        silhouette: this.specialBackgroundScene.silhouette,
        weather: this.specialBackgroundScene.weather,
        landmark: this.specialBackgroundScene.landmark,
        sourceLayers: [...this.specialBackgroundScene.sourceLayers],
      } : null,
      fortressStyle: this.fortressStyle,
      structureFamily: this.structureFamily ? { ...this.structureFamily } : null,
      environmentThemeLevel: this.mainEnvironmentTheme?.level || null,
      architectureBlueprint: this.architectureBlueprint ? {
        ...this.architectureBlueprint,
        geometry: this.architectureBlueprint.geometry
          ? { ...this.architectureBlueprint.geometry } : null,
        towerFloors: [...(this.architectureBlueprint.towerFloors || [])],
        constructionIds: [...(this.architectureBlueprint.constructionIds || [])],
        buildingPlan: this.architectureBlueprint.buildingPlan ? {
          ...this.architectureBlueprint.buildingPlan,
          towerForms: [...(this.architectureBlueprint.buildingPlan.towerForms || [])],
          mechanisms: [...(this.architectureBlueprint.buildingPlan.mechanisms || [])],
          visualParts: [...(this.architectureBlueprint.buildingPlan.visualParts || [])],
        } : null,
      } : null,
      movingPlatformProfile: this.movingPlatformProfile ? { ...this.movingPlatformProfile } : null,
      specialArchitecture: this.specialArchitecture ? { ...this.specialArchitecture } : null,
      specialRuleIds: this.specialRules.map((rule) => rule.id),
      specialObjective: this.specialObjective ? { ...this.specialObjective } : null,
      specialChallenge: this.specialChallengeState
        ? { ...summarizeSpecialChallenge(this.specialChallengeState) }
        : null,
      specialWaterY: this.specialWaterY,
      decoyCount: this.decoys.length,
      specialObjectiveProgress: this.specialObjectiveProgress(),
      score: this.score,
      dailyChallenge: this.dailyChallenge ? {
        id: this.dailyChallenge.id,
        segment: this.dailySegment?.id || null,
        boon: this.dailyChallenge.modifiers.boon.id,
        pressure: this.dailyChallenge.modifiers.pressure.id,
      } : null,
      levelStartScore: this.levelStartScore,
      paused: this.paused,
      muted: this.save.muted,
      audio: this.audio.getStatus(),
      aimGuide: {
        mode: this.save.settings.aimGuideMode,
        enabled: this.save.settings.aimGuideMode !== 'off',
        windAware: this.save.settings.aimGuideMode === 'beginner',
        active: Boolean(this.save.settings.aimGuideMode !== 'off'
          && (this.dragging || this.keyboardAiming) && this.currentBird),
        style: { ...AIM_GUIDE_STYLE },
        metrics: { ...aimGuideVisualMetrics(this.camera.zoom) },
        talentWindTrace: this.windTraceGuideProfile(),
      },
      runSeed: this.runSeed,
      levelSeed: this.levelSeed,
      fixedTick: this.fixedTick,
      mapPulseTick: this.mapPulseTick,
      mapType: this.mapType,
      terrainProfile: this.terrainProfile ? {
        id: this.terrainProfile.id,
        label: this.terrainProfile.label,
        primaryId: this.terrainProfile.primaryId,
        terrainIds: [...this.terrainProfile.terrainIds],
        ruleCount: this.terrainProfile.ruleCount,
        zones: this.terrainProfile.zones.map((zone) => ({ ...zone })),
      } : null,
      windX: this.windX,
      shotsRemaining: this.shotsRemaining,
      shotQueue: [...this.shotQueue],
      shotQueueBonus: [...this.shotQueueBonus],
      shotQueueDamageBonus: [...this.shotQueueDamageBonus],
      shotQueueAce: [...this.shotQueueAce],
      moltenPulseSequences: this.moltenPulseSequences.map((sequence) => ({
        pulsesRemaining: sequence.pulsesRemaining,
        ticksUntil: sequence.ticksUntil,
        targetCount: sequence.targetIds.length,
      })),
      levelRescuesUsed: this.levelRescuesUsed,
      turnActive: this.turnActive,
      combo: this.combo,
      slowTimer: this.slowTimer,
      talents: { ...this.talents },
      talentProgression: {
        version: this.talentProgression.version,
        ranks: { ...this.talentProgression.ranks },
        fusionIds: [...this.talentProgression.fusionIds],
        specialTalentIds: [...this.talentProgression.specialTalentIds],
      },
      talentChoices: this.talentChoices.map((choice) => ({
        selectionId: choice.selectionId,
        kind: choice.kind,
        talentId: choice.talentId || null,
        fusionId: choice.fusionId || null,
        specialTalentId: choice.specialTalentId || null,
        currentRank: choice.currentRank ?? null,
        targetRank: choice.targetRank ?? null,
        title: choice.title,
      })),
      talentClaimedCount: this.talentClaimedCount,
      talentEligibleCount: this.talentEligibleCount,
      talentProgress: {
        ...calculateTalentUnlockProgress(this.score, this.talentClaimedCount),
        eligibleCount: this.talentEligibleCount,
        claimableCount: Math.max(0, this.talentEligibleCount - this.talentClaimedCount),
      },
      missionCollapsed: this.missionCollapsed,
      clearEvaluation: this.currentClearEvaluation(),
      talentLibraryOpen: this.talentLibraryOpen,
      discoveryOpen: this.discoveryOpen,
      discoveryFromArchive: this.discoveryFromArchive,
      activeDiscovery: this.activeDiscovery,
      emergencySupplyOpen: this.emergencySupplyOpen,
      emergencySupplyUsed: this.emergencySupplyUsed,
      endlessBestStage: this.save.endlessBestStage || 0,
      runSlots: JSON.parse(JSON.stringify(this.runSlots)),
      failureAidState: { ...this.failureAidState },
      currentBird: birdSnapshot(this.currentBird),
      birds: this.birds.map(birdSnapshot),
      blocks: this.blocks.map((block) => ({
        id: block.id, type: block.type, x: round3(block.x), y: round3(block.y), hp: block.hp,
        role: block.role, constructionId: block.constructionId || null,
        landmarkKind: block.landmarkKind || null,
        architectureBlueprintId: block.architectureBlueprintId || null,
        buildingFormId: block.buildingFormId || null,
        architectureRole: block.architectureRole || null,
        architecturalShape: block.architecturalShape || null,
        physicalModuleId: block.physicalModuleId || null,
        physicalModuleKind: block.physicalModuleKind || null,
        physicalModuleClass: block.physicalModuleClass || null,
        physicalFeature: block.physicalFeature || null,
        fractureParentId: block.fractureParentId || null,
        fractureSide: block.fractureSide || null,
        spanFractured: Boolean(block.spanFractured),
        collapseWeight: round3(Number.isFinite(block.collapseWeight) ? block.collapseWeight : 1),
        jointKinds: [...(block.jointKinds || [])],
        supportMode: snapshotStability.supportById.get(block.id)?.supportMode || null,
        suspendedByJoint: Boolean(snapshotStability.supportById.get(block.id)?.suspended),
        width: block.width, height: block.height,
        vx: round3(block.vx), vy: round3(block.vy), rotation: round3(block.rotation),
        angularVelocity: round3(block.vr), asleep: block.asleep,
        winchSlipTicks: block.winchSlipTicks || 0,
      })),
      squirrels: this.squirrels.map((squirrel) => ({
        id: squirrel.id, x: round3(squirrel.x), y: round3(squirrel.y),
        radius: round3(squirrel.radius),
        hp: squirrel.hp, boss: squirrel.isBoss, variant: squirrel.variant,
        shieldHp: squirrel.shieldHp, chilledTicks: squirrel.chilledTicks,
        submerged: squirrel.submerged, repairChannelTicks: squirrel.repairChannelTicks,
        unresolvedTicks: squirrel.unresolvedTicks, recoveryCount: squirrel.recoveryCount || 0,
        pinned: squirrel.pinned, pinnedTicks: squirrel.pinnedTicks || 0,
      })),
      structureJoints: this.structureJoints.map((joint) => ({
        id: joint.id,
        firstId: joint.firstId,
        secondId: joint.secondId,
        kind: joint.kind,
        contact: joint.contact,
        material: joint.material,
        strength: round3(joint.strength),
        maxStrength: joint.maxStrength,
        breakDistance: joint.breakDistance,
        broken: joint.broken,
      })),
      unlockedStructureJointKinds: [...this.unlockedStructureJointKinds],
      structureJointCounts: { ...this.structureJointCounts },
      collisionDiagnostics,
      goldenEgg: this.goldenEgg ? { x: round3(this.goldenEgg.x), y: round3(this.goldenEgg.y) } : null,
      platformCount: this.platforms.length,
      platforms: this.platforms.map((platform) => ({
        id: platform.id, x: round3(platform.x), y: round3(platform.y),
        width: platform.width, height: platform.height,
        rotation: round3(platform.rotation), reflective: platform.reflective,
        cableIntegrity: platform.cableIntegrity, derailed: platform.derailed,
        boardHp: platform.boardHp, boardMaxHp: platform.boardMaxHp,
        carrierHp: [...(platform.carrierHp || [])],
        carrierMaxHp: [...(platform.carrierMaxHp || [])],
        powered: platform.powered, destroyed: platform.destroyed,
        winchSlipTicks: platform.winchSlipTicks || 0,
      })),
      architectureMechanisms: this.architectureMechanismModels().map((model) => ({
        id: model.binding.id,
        mechanism: model.binding.mechanism,
        active: model.active,
        collisionMode: model.binding.collisionMode,
        collisionPartCount: model.collisionParts.length,
        hostId: model.binding.hostId,
        x: round3(model.pose.x), y: round3(model.pose.y),
        rotation: round3(model.pose.rotation),
      })),
      particleCount: this.particles.length,
      fireCount: this.fireTrail.length,
      camera: {
        x: round3(this.camera.x), y: round3(this.camera.y), zoom: round3(this.camera.zoom),
      },
      save: JSON.parse(JSON.stringify(this.save)),
    }
  }
}

function mixCss(first, second, amount) {
  const parse = (value) => {
    const clean = value.replace('#', '')
    return parseInt(clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean, 16)
  }
  return cssColor(mixColor(parse(first), parse(second), amount))
}

function round3(value) {
  return Math.round(value * 1000) / 1000
}

const game = new AcornGame()
if (QA_MODE) {
  const configureScenario = ({
    mode = 'main',
    level = 1,
    specialCampaignId = null,
    score = 0,
    progression = {},
    seed = 20260828,
    skipDiscoveries = false,
  } = {}) => {
    const supportedModes = new Set(['main', 'endless', 'special', 'daily'])
    if (!supportedModes.has(mode)) throw new RangeError('unsupported QA mode')
    if (mode === 'special' && !getSpecialCampaign(specialCampaignId)) {
      throw new RangeError('QA special scenario requires a valid campaign id')
    }
    const maximumLevel = mode === 'special' ? SPECIAL_STAGE_COUNT_PER_CAMPAIGN
      : mode === 'daily' ? DAILY_LEVELS : mode === 'main' ? MAIN_LEVELS : Number.MAX_SAFE_INTEGER
    const minimumLevel = mode === 'endless' ? MAIN_LEVELS + 1 : 1
    game.mode = mode
    game.level = clamp(Math.floor(Number(level) || minimumLevel), minimumLevel, maximumLevel)
    game.specialCampaignId = mode === 'special' ? specialCampaignId : null
    game.specialStageNumber = mode === 'special' ? game.level : 0
    game.score = Math.max(0, Number(score) || 0)
    game.levelStartScore = game.score
    game.runSeed = Math.max(1, Math.floor(Number(seed) || 1))
    game.setTalentProgression(progression)
    const acquiredChoices = Object.values(game.talentProgression.ranks)
      .reduce((sum, rank) => sum + rank, 0)
      + game.talentProgression.fusionIds.length
      + game.talentProgression.specialTalentIds.length
    game.talentClaimedCount = clamp(acquiredChoices, 0, TALENT_SCORE_MILESTONES.length)
    game.talentEligibleCount = game.talentClaimedCount
    game.talentRerollCount = 0
    game.pendingVictoryResult = null
    game.replayLevelOnly = false
    game.practiceSpecial = mode === 'special'
    if (skipDiscoveries) {
      for (const id of Object.keys(DISCOVERIES)) game.save.seenDiscoveries[id] = true
    }
    return acquiredChoices
  }
  const qaApi = Object.freeze({
    getSnapshot: () => game.getSnapshot(),
    prepareTalentDraft: (options = {}) => {
      const acquiredChoices = configureScenario(options)
      const maximumMilestone = TALENT_SCORE_MILESTONES.length - 1
      const milestoneIndex = clamp(
        Math.floor(Number(options.milestoneIndex) || acquiredChoices),
        0,
        maximumMilestone,
      )
      game.talentClaimedCount = milestoneIndex
      game.talentEligibleCount = milestoneIndex + 1
      game.score = Math.max(
        game.score,
        TALENT_SCORE_MILESTONES[milestoneIndex]?.score || 0,
      )
      const shown = game.showTalentPick({ resume: 'start-level' })
      return { shown, snapshot: game.getSnapshot() }
    },
    startLevelScenario: (options = {}) => {
      configureScenario(options)
      game.startLevel({ retry: false })
      return game.getSnapshot()
    },
  })
  window.__acornGame = qaApi
  const qaScenario = new URLSearchParams(window.location.search).get('qaScenario')
  if (qaScenario === 'fusion-draft') {
    qaApi.prepareTalentDraft({
      mode: 'main',
      level: 12,
      seed: entropySeed(),
      progression: { ranks: { power: 3, stonebreaker: 3 } },
      milestoneIndex: 6,
    })
  } else if (qaScenario === 'talent-arsenal') {
    qaApi.startLevelScenario({
      mode: 'main',
      level: 12,
      seed: entropySeed(),
      progression: {
        ranks: { power: 3, stonebreaker: 3, pack: 3, secondWind: 3 },
        fusionIds: ['faultCrown', 'expeditionArsenal'],
        specialTalentIds: ['emberheart', 'prismBell', 'thunderRoot'],
      },
    })
  } else if (qaScenario === 'talent-arsenal-endless') {
    qaApi.startLevelScenario({
      mode: 'endless',
      level: MAIN_LEVELS + 100,
      seed: entropySeed(),
      skipDiscoveries: true,
      progression: {
        ranks: { pack: 3, secondWind: 3, frost: 3, shock: 3 },
        fusionIds: ['expeditionArsenal', 'frozenThunder'],
        specialTalentIds: ['emberheart', 'prismBell', 'thunderRoot'],
      },
    })
  } else if (qaScenario === 'command-wind-architecture') {
    qaApi.startLevelScenario({
      mode: 'main',
      level: 16,
      seed: 20260828,
      skipDiscoveries: true,
      progression: {
        ranks: { tacticalMagazine: 3, windTrace: 3 },
        fusionIds: ['windchartArsenal'],
      },
    })
  } else if (qaScenario === 'endless-magazine-draft') {
    qaApi.prepareTalentDraft({
      mode: 'endless',
      level: MAIN_LEVELS + 32,
      seed: entropySeed(),
      skipDiscoveries: true,
      milestoneIndex: 3,
    })
  } else if (qaScenario === 'endless-magazine-level') {
    qaApi.startLevelScenario({
      mode: 'endless',
      level: MAIN_LEVELS + 32,
      seed: entropySeed(),
      skipDiscoveries: true,
    })
  } else if (qaScenario === 'daily-stage-3') {
    qaApi.startLevelScenario({
      mode: 'daily',
      level: 3,
      seed: 20260828,
      skipDiscoveries: true,
    })
  }
}
