// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  ACORN_LIFECYCLE_RULES,
  ACORN_AFFINITY_TYPES,
  ACORN_HITBOX_BONUS,
  ACHIEVEMENT_REWARDS,
  AIM_GUIDE_MODE_LABELS,
  AIM_GUIDE_MODES,
  AIM_GUIDE_STYLE,
  AUDIO_VOLUME_DEFAULTS,
  BLOCK_MATERIALS,
  BIRD_TYPE_UNLOCKS,
  CLEAR_STAR_RULES,
  CONSTANTS,
  DEFAULT_SAVE_DATA,
  EPILOGUE,
  FALLING_DEBRIS_RULES,
  FIRE_ACORN,
  FORTRESS_START_X,
  GROUND_Y,
  GOLDEN_ACORN_RULES,
  INTEGRAL_TRUSS_JOINT_RULES,
  MAIN_BOSS_LEVELS,
  MAIN_LEVELS,
  MAX_PULL,
  MAX_ZOOM,
  MIN_ZOOM,
  MAX_NON_BOSS_TARGETS,
  MAX_WIND_MAGNITUDE,
  MOVING_PLATFORM_RULES,
  ORDINARY_ACORN_IMPACT_RULES,
  POWER,
  Rng,
  STORY,
  STRONGHOLD_RULES,
  STRONGHOLD_MODULE_RULES,
  STRUCTURE_FAMILY_RULES,
  STRUCTURE_JOINT_COUNT_RULES,
  STRUCTURE_JOINT_RULES,
  STRUCTURE_JOINT_UNLOCKS,
  STRUCTURE_STABILITY_RULES,
  STRUCTURE_WIND_RULES,
  SLING_X,
  SHOT_BUDGET_RULES,
  TALENTS,
  TALENT_AFFINITIES,
  TALENT_SCORE_MILESTONES,
  VIEWPORT,
  advanceAcornLifecycleCounters,
  advanceTalentUnlockOnClear,
  aimGuideVisualMetrics,
  analyzeBlockSupport,
  analyzeStructureStability,
  awardAchievement,
  birdTypePool,
  bossProfileForEncounter,
  buildMainAmmoQueue,
  buildStructureJoints,
  calculateVerticalDrillActivation,
  calculateClearResult,
  calculateCrushDamage,
  calculateReserveEligibility,
  calculateShotBudget,
  calculateOverviewCamera,
  calculateStructureComponentStats,
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
  distanceSquared,
  evaluateAcornLifecycle,
  evaluateAcornStructureImpact,
  evaluateTalentAffinity,
  evaluateFallingDebrisDamage,
  evaluateLevelClear,
  endlessEnvironmentThemeLevel,
  fallingDebrisHitKey,
  findNearestCircleClearPosition,
  generateLevel,
  mixSeed,
  levelWindMagnitude,
  movingPlatformProfileForLevel,
  nextAimGuideMode,
  normalizeAchievementRecords,
  normalizeAimGuideMode,
  normalizeSaveData,
  pointInRect,
  rectCollisionManifold,
  rectsOverlap,
  resolveCircleRectCollision,
  resolveSquirrelSolidCollision,
  resolveSweptCircleRectCollision,
  rollGoldenAcornForLevel,
  rotatedRectBounds,
  shouldWakeStructureBlock,
  strongholdTierForLevel,
  strongholdModuleProfileForLevel,
  structureFamilyProfileForLevel,
  structureContactPairKey,
  structureJointCountsForLevel,
  structureJointKindsForLevel,
  verticalPlatformMotionEnvelope,
  windForPendingLaunch,
} from '../src/game-core.js'
import { TALENT_ICON_IDS, talentIconMarkup } from '../src/talent-icons.js'

test('exports the source game constants and content tables', () => {
  assert.deepEqual(VIEWPORT, { width: 900, height: 600, fps: 30 })
  assert.equal(CONSTANTS.mainLevels, 18)
  assert.deepEqual(CONSTANTS.mainBossLevels, [6, 12, 17, 18])
  assert.equal(CONSTANTS.groundY, 520)
  assert.equal(Object.keys(TALENTS).length, 15)
  assert.deepEqual(STORY.map((chapter) => chapter.level), [1, 4, 6, 7, 10, 12, 13, 16, 17, 18])
  assert.deepEqual(MAIN_BOSS_LEVELS, [6, 12, 17, 18])
  assert.ok(Object.isFrozen(MAIN_BOSS_LEVELS))
  assert.equal(MAX_NON_BOSS_TARGETS, 12)
  assert.equal(STRONGHOLD_RULES.maximumPhysicalBlocks, 84)
  assert.equal(MAX_PULL, 118)
  assert.equal(POWER, 0.265)
  assert.equal(Number((MAX_PULL * POWER).toFixed(2)), 31.27)
  assert.equal(ACORN_HITBOX_BONUS, 2.5)
  assert.equal(CONSTANTS.acornHitboxBonus, ACORN_HITBOX_BONUS)
  assert.equal(EPILOGUE.length, 5)
  assert.equal(BLOCK_MATERIALS.stone.hp, 8)
  assert.deepEqual(ACHIEVEMENT_REWARDS, {
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
  assert.equal(Object.values(ACHIEVEMENT_REWARDS).reduce((sum, reward) => sum + reward, 0), 17)
  assert.ok(Object.isFrozen(ACHIEVEMENT_REWARDS))
})

test('the three trajectory modes share one visible blue line and differ only by wind prediction', () => {
  assert.deepEqual(AIM_GUIDE_MODES, ['standard', 'beginner', 'off'])
  assert.deepEqual(AIM_GUIDE_MODE_LABELS, {
    standard: '有弹道', beginner: '新手弹道', off: '无弹道',
  })
  assert.equal(normalizeAimGuideMode('standard'), 'standard')
  assert.equal(normalizeAimGuideMode('beginner'), 'beginner')
  assert.equal(normalizeAimGuideMode('off'), 'off')
  assert.equal(normalizeAimGuideMode('invalid'), 'standard')
  assert.equal(normalizeAimGuideMode(undefined, true), 'standard')
  assert.equal(normalizeAimGuideMode(undefined, false), 'off')
  assert.equal(nextAimGuideMode('standard'), 'beginner')
  assert.equal(nextAimGuideMode('beginner'), 'off')
  assert.equal(nextAimGuideMode('off'), 'standard')
  assert.ok(Object.isFrozen(AIM_GUIDE_STYLE))
  assert.ok(AIM_GUIDE_STYLE.lineScreenWidth >= 3.5)
  assert.match(AIM_GUIDE_STYLE.color, /rgba\(87,195,235/u)

  for (const zoom of [MIN_ZOOM, 1, MAX_ZOOM]) {
    const metrics = aimGuideVisualMetrics(zoom)
    assert.equal(Number((metrics.lineWidth * zoom).toFixed(3)), AIM_GUIDE_STYLE.lineScreenWidth)
    assert.equal(Number((metrics.dashLength * zoom).toFixed(3)), AIM_GUIDE_STYLE.dashScreenLength)
    assert.equal(Number((metrics.shadowBlur * zoom).toFixed(3)), AIM_GUIDE_STYLE.shadowScreenBlur)
  }

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const renderSource = runtime.slice(runtime.indexOf('  render() {'), runtime.indexOf('  drawDecoy('))
  const guideSource = runtime.slice(runtime.indexOf('  drawAimGuide('), runtime.indexOf('  drawWindTraceGuide('))
  const talentGuideSource = runtime.slice(runtime.indexOf('  drawWindTraceGuide('), runtime.indexOf('  drawFlame('))
  assert.ok(renderSource.indexOf('this.drawSpecialMapOverlay()') < renderSource.indexOf('this.drawAimGuide('),
    '秘境覆盖层必须先画，蓝色弹道后画')
  assert.match(renderSource, /this\.save\.settings\.aimGuideMode !== 'off'/u)
  assert.match(guideSource, /this\.save\.settings\.aimGuideMode === 'beginner'[\s\S]*?this\.pendingLaunchWind\(\)[\s\S]*?: 0/u)
  assert.match(guideSource, /const points = this\.predictAimPath\(bird, previewWind\)/u)
  assert.match(guideSource, /ctx\.strokeStyle = AIM_GUIDE_STYLE\.color/u)
  assert.match(guideSource, /ctx\.lineWidth = metrics\.lineWidth/u)
  assert.doesNotMatch(guideSource, /neutralPoints|rgba\(255,248,218|#e2b24f|ellipse\(/u)
  assert.match(talentGuideSource, /windTraceGuideProfile\(\)/u)
  assert.match(talentGuideSource, /#f2cd68|ellipse\(/u)
  assert.doesNotMatch(talentGuideSource, /AIM_GUIDE_STYLE\.color/u)
})

test('settings cycle through standard, beginner, and no trajectory and can restart a live level', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(html, /<b>弹道模式<\/b><small>有弹道忽略横风；新手弹道显示实际轨迹<\/small>/u)
  assert.match(html, /id="settings-aim-value">有弹道</u)
  assert.match(html, /id="settings-restart-button"[^>]*>重开本关<\/button>/u)
  assert.match(runtime, /dom\.settingsAimButton\.addEventListener\('click', \(\) => this\.cycleAimGuideMode\(\)\)/u)
  assert.match(runtime, /this\.save\.settings\.aimGuideMode = nextAimGuideMode\(this\.save\.settings\.aimGuideMode\)/u)
  assert.match(runtime, /const aimGuideLabel = AIM_GUIDE_MODE_LABELS\[aimGuideMode\]/u)
  assert.doesNotMatch(runtime, /settingsAimButton, 'aria-pressed'/u)
  assert.match(runtime, /settingsRestartButton: document\.querySelector\('#settings-restart-button'\)/u)
  assert.match(runtime, /dom\.settingsRestartButton\.addEventListener\('click', \(\) => this\.restartLevel\(\)\)/u)
  assert.match(runtime, /dom\.settingsRestartButton\.hidden = this\.state !== 'play'/u)
  assert.match(runtime, /if \(this\.settingsOpen && event\.code === 'KeyR'\) \{[\s\S]*?this\.restartLevel\(\)/u)
  assert.doesNotMatch(runtime, /请先关闭设置，再按 R 重开关卡/u)
  assert.match(runtime, /if \(!retry\) this\.levelGoldenEggClaimed = false/u)
  assert.match(runtime, /this\.goldenEgg = generated\.goldenEgg\s*\?/u)
  assert.match(runtime, /this\.goldenEgg = null\s+this\.levelGoldenEggClaimed = true/u)
})

test('crosswind grows visibly and pending clocktower wind is deterministic before launch', () => {
  assert.equal(levelWindMagnitude('main', 4), 0.06)
  assert.equal(levelWindMagnitude('endless', MAIN_LEVELS + 4), 0.056)
  assert.equal(levelWindMagnitude('endless', MAIN_LEVELS + 30), MAX_WIND_MAGNITUDE)
  assert.equal(levelWindMagnitude('main', 18, 0.2), MAX_WIND_MAGNITUDE)

  const sequence = [-0.08, 0.04, 0.09]
  assert.equal(windForPendingLaunch({ sequence, completedLaunches: 0 }), -0.08)
  assert.equal(windForPendingLaunch({ sequence, completedLaunches: 1 }), 0.04)
  assert.equal(windForPendingLaunch({ sequence, completedLaunches: 1, advanceSteps: 2 }), 0.09)
  assert.equal(windForPendingLaunch({
    currentWind: -0.03, sequence, completedLaunches: 2, keeperAlive: false,
  }), -0.03)

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /const previewWind = this\.pendingLaunchWind\(\)/u)
  assert.match(runtime, /const points = this\.predictAimPath\(bird, previewWind\)/u)
  assert.match(runtime, /const committedWind = this\.pendingLaunchWind\(\)/u)
  assert.match(runtime, /this\.windX = committedWind[\s\S]*?this\.advanceSpecialRulesOnLaunch\(\)/u)
})

test('structure sound triggers ignore persistent joint sway and require real surface travel', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /!this\.structureContactPairs\.has\(contactPair\)/u)
  assert.match(runtime, /!activeJointPairs\.has\(contactPair\)/u)
  assert.match(runtime, /!hadSurfaceContact && impact > 4\.5/u)
  assert.match(runtime, /support\?\.supportMode === 'bearing' && support\.settled/u)
  assert.match(runtime, /Math\.abs\(block\.vr\) < 0\.22/u)
  assert.match(runtime, /slideDistance >= 8/u)
  assert.doesNotMatch(runtime, /const slideSpeed = Math\.abs\(block\.vx\) \+ Math\.abs\(block\.vr\)/u)
})

test('block materials expose distinct stability, damping, and bounce coefficients', () => {
  assert.deepEqual(BLOCK_MATERIALS.wood, {
    hp: 3,
    color: 0xb8860b,
    massMultiplier: 1.4,
    friction: 0.62,
    supportStability: 0.84,
    angularDamping: 0.2,
    restitution: 0.1,
  })
  assert.deepEqual(BLOCK_MATERIALS.stone, {
    hp: 8,
    color: 0x888888,
    massMultiplier: 3.2,
    friction: 0.9,
    supportStability: 1.2,
    angularDamping: 0.34,
    restitution: 0.04,
  })
  assert.deepEqual(BLOCK_MATERIALS.ice, {
    hp: 2,
    color: 0x9fe8ff,
    massMultiplier: 1.15,
    friction: 0.1,
    supportStability: 0.3,
    angularDamping: 0.06,
    restitution: 0.28,
  })

  assert.ok(BLOCK_MATERIALS.stone.massMultiplier > BLOCK_MATERIALS.wood.massMultiplier)
  assert.ok(BLOCK_MATERIALS.wood.massMultiplier > BLOCK_MATERIALS.ice.massMultiplier)
  assert.ok(BLOCK_MATERIALS.stone.hp >= BLOCK_MATERIALS.wood.hp * 2)
  assert.ok(BLOCK_MATERIALS.wood.hp > BLOCK_MATERIALS.ice.hp)
  assert.ok(BLOCK_MATERIALS.stone.friction > BLOCK_MATERIALS.wood.friction)
  assert.ok(BLOCK_MATERIALS.wood.friction > BLOCK_MATERIALS.ice.friction)
  assert.ok(BLOCK_MATERIALS.stone.supportStability > BLOCK_MATERIALS.wood.supportStability)
  assert.ok(BLOCK_MATERIALS.wood.supportStability > BLOCK_MATERIALS.ice.supportStability)
  assert.ok(BLOCK_MATERIALS.stone.angularDamping > BLOCK_MATERIALS.wood.angularDamping)
  assert.ok(BLOCK_MATERIALS.wood.angularDamping > BLOCK_MATERIALS.ice.angularDamping)
  assert.ok(BLOCK_MATERIALS.ice.restitution > BLOCK_MATERIALS.wood.restitution)
  assert.ok(BLOCK_MATERIALS.wood.restitution > BLOCK_MATERIALS.stone.restitution)
  assert.ok(Object.values(BLOCK_MATERIALS).every(Object.isFrozen))
})

test('material bearing keeps masonry braced without welding weak supports', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(STRUCTURE_STABILITY_RULES.materials)
      .map(([type, profile]) => [type, profile.bearingAllowance])),
    { wood: 6, stone: 24, ice: 0 },
  )
  assert.ok(STRUCTURE_STABILITY_RULES.materials.stone.shockWakeSpeed
    > STRUCTURE_STABILITY_RULES.materials.wood.shockWakeSpeed)
  assert.ok(STRUCTURE_STABILITY_RULES.materials.wood.shockWakeSpeed
    > STRUCTURE_STABILITY_RULES.materials.ice.shockWakeSpeed)

  const beam = { id: 'beam', type: 'wood', x: 0, y: 55, width: 100, height: 10, rotation: 0 }
  const woodPost = { id: 'wood-post', type: 'wood', x: 30, y: 80, width: 20, height: 40, rotation: 0 }
  const stonePost = { id: 'stone-post', type: 'stone', x: 30, y: 80, width: 20, height: 40, rotation: 0 }
  const criticalStone = { ...stonePost, id: 'critical-stone', critical: true }
  const options = { groundY: 100, contactTolerance: 0.01 }

  assert.equal(analyzeBlockSupport(beam, [woodPost], options).supported, false)
  assert.equal(analyzeBlockSupport(beam, [stonePost], options).supported, true)
  assert.equal(analyzeBlockSupport(beam, [criticalStone], options).supported, false)

  // Supplying the runtime joint list must not erase the stone's inherent
  // bearing. Masonry adds reinforcement; breaking it falls back to stone
  // rather than turning the same contact into a frictionless stack.
  const stoneBeam = { ...beam, id: 'stone-beam', type: 'stone' }
  const noJointSupport = analyzeBlockSupport(stoneBeam, [stonePost], {
    ...options,
    joints: [],
  })
  assert.equal(noJointSupport.supported, true)
  assert.equal(noJointSupport.supportLeft, -4)

  const masonry = buildStructureJoints([stonePost, stoneBeam], {
    contactTolerance: 0.01,
  })
  assert.equal(masonry.length, 1)
  assert.equal(masonry[0].kind, 'masonry')
  const reinforcedMasonrySupport = analyzeBlockSupport(stoneBeam, [stonePost], {
    ...options,
    joints: masonry,
  })
  assert.equal(reinforcedMasonrySupport.supported, true)
  assert.ok(reinforcedMasonrySupport.supportLeft < noJointSupport.supportLeft)
  masonry[0].broken = true
  const brokenMasonrySupport = analyzeBlockSupport(stoneBeam, [stonePost], {
    ...options,
    joints: masonry,
  })
  assert.equal(brokenMasonrySupport.supported, true)
  assert.equal(brokenMasonrySupport.supportLeft, -4)
  assert.equal(analyzeBlockSupport(stoneBeam, [criticalStone], {
    ...options,
    joints: [],
  }).supported, false)
})

test('reinforced contacts unlock in staged royal strongholds instead of early levels', () => {
  assert.deepEqual(STRUCTURE_JOINT_UNLOCKS, {
    nail: { mainLevel: 13, endlessDepth: 30 },
    masonry: { mainLevel: 15, endlessDepth: 50 },
  })
  assert.deepEqual(STRUCTURE_JOINT_COUNT_RULES, {
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
  assert.deepEqual(structureJointKindsForLevel('main', 12), [])
  assert.deepEqual(structureJointKindsForLevel('main', 13), ['nail'])
  assert.deepEqual(structureJointKindsForLevel('main', 14), ['nail'])
  assert.deepEqual(structureJointKindsForLevel('main', 15), ['nail', 'masonry'])
  assert.deepEqual(structureJointKindsForLevel('endless', MAIN_LEVELS + 29), [])
  assert.deepEqual(structureJointKindsForLevel('endless', MAIN_LEVELS + 30), ['nail'])
  assert.deepEqual(structureJointKindsForLevel('endless', MAIN_LEVELS + 49), ['nail'])
  assert.deepEqual(structureJointKindsForLevel('endless', MAIN_LEVELS + 50), ['nail', 'masonry'])
  assert.deepEqual(structureJointKindsForLevel('daily', 999), [])
  assert.deepEqual(structureJointKindsForLevel('special', 4), [])
  assert.deepEqual(structureJointCountsForLevel('main', 12), { nail: 0, masonry: 0 })
  assert.deepEqual(structureJointCountsForLevel('main', 13), { nail: 4, masonry: 0 })
  assert.deepEqual(structureJointCountsForLevel('main', 14), { nail: 8, masonry: 0 })
  assert.deepEqual(structureJointCountsForLevel('main', 15), { nail: 12, masonry: 10 })
  assert.deepEqual(structureJointCountsForLevel('main', 18), { nail: 16, masonry: 58 })
  assert.deepEqual(
    structureJointCountsForLevel('endless', MAIN_LEVELS + 30),
    { nail: 4, masonry: 0 },
  )
  assert.deepEqual(
    structureJointCountsForLevel('endless', MAIN_LEVELS + 35),
    { nail: 5, masonry: 0 },
  )
  assert.deepEqual(
    structureJointCountsForLevel('endless', MAIN_LEVELS + 50),
    { nail: 8, masonry: 10 },
  )
  assert.deepEqual(
    structureJointCountsForLevel('endless', MAIN_LEVELS + 100),
    { nail: 18, masonry: 40 },
  )
  assert.deepEqual(
    structureJointCountsForLevel('endless', MAIN_LEVELS + 120),
    { nail: 18, masonry: 48 },
  )
  assert.ok(Object.isFrozen(structureJointKindsForLevel('main', 13)))
  assert.ok(Object.isFrozen(structureJointCountsForLevel('main', 13)))
})

test('generated stages contain no hidden early joints and visibly exercise each late unlock', () => {
  const jointsAt = (mode, level, seed = 91) => {
    const generated = generateLevel({ mode, level, seed })
    return buildStructureJoints(generated.blocks, {
      allowedKinds: structureJointKindsForLevel(mode, level),
      desiredCounts: structureJointCountsForLevel(mode, level),
    })
  }

  const counts = (joints) => ({
    nail: joints.filter((joint) => joint.kind === 'nail').length,
    masonry: joints.filter((joint) => joint.kind === 'masonry').length,
  })
  assert.deepEqual(counts(jointsAt('main', 1)), { nail: 0, masonry: 0 })
  assert.deepEqual(counts(jointsAt('main', 12)), { nail: 0, masonry: 0 })
  for (const seed of [1, 7, 19, 43, 91, 0xffff_ffff]) {
    for (const level of [13, 14, 15, 16, 17, 18]) {
      const generated = generateLevel({ mode: 'main', level, seed })
      const available = counts(buildStructureJoints(generated.blocks, {
        allowedKinds: structureJointKindsForLevel('main', level),
      }))
      const actual = counts(jointsAt('main', level, seed))
      const quota = structureJointCountsForLevel('main', level)
      assert.ok(actual.nail <= quota.nail)
      assert.ok(actual.masonry <= quota.masonry)
      if (quota.nail > 0 && available.nail > 0) assert.ok(actual.nail > 0)
      if (quota.masonry > 0 && available.masonry > 0) assert.ok(actual.masonry > 0)
    }
  }
  assert.deepEqual(counts(jointsAt('endless', MAIN_LEVELS + 29)), { nail: 0, masonry: 0 })
  // Keep the formerly sparse-masonry seeds in the regression set: authored
  // lower-storey stone modules must satisfy the quota for every layout roll.
  for (const seed of [2, 11, 37, 91, 185, 565, 867, 1371, 1463, 1868]) {
    for (const depth of [30, 35, 49, 50, 55, 75, 99, 100, 101]) {
      const level = MAIN_LEVELS + depth
      const generated = generateLevel({ mode: 'endless', level, seed })
      const actual = counts(jointsAt('endless', level, seed))
      const quota = structureJointCountsForLevel('endless', level)
      assert.ok(actual.nail <= quota.nail)
      assert.ok(actual.masonry <= quota.masonry)
      assert.equal(
        generated.blocks.filter((block) => block.type === 'stone').length,
        generated.stoneCount,
      )
      assert.ok(generated.stoneCount <= generated.maxStoneCount)
    }
  }

  assert.deepEqual(
    jointsAt('endless', MAIN_LEVELS + 100, 1463),
    jointsAt('endless', MAIN_LEVELS + 100, 1463),
  )

  const mainTotals = [13, 14, 15, 16, 17, 18]
    .map((level) => Object.values(structureJointCountsForLevel('main', level))
      .reduce((sum, value) => sum + value, 0))
  assert.deepEqual(mainTotals, [4, 8, 22, 42, 58, 74])
  for (let depth = 31; depth <= 120; depth += 1) {
    const previous = structureJointCountsForLevel('endless', MAIN_LEVELS + depth - 1)
    const current = structureJointCountsForLevel('endless', MAIN_LEVELS + depth)
    assert.ok(current.nail >= previous.nail)
    assert.ok(current.masonry >= previous.masonry)
  }
})

test('the final royal city retains every authored building bond outside sparse joint quotas', () => {
  const level = 18
  const generated = generateLevel({ mode: 'main', level, seed: 20260828 })
  const allowedKinds = structureJointKindsForLevel('main', level)
  const candidates = buildStructureJoints(generated.blocks, { allowedKinds })
    .filter((joint) => joint.authoredBuildingBond)
  const selected = buildStructureJoints(generated.blocks, {
    allowedKinds,
    desiredCounts: structureJointCountsForLevel('main', level),
  }).filter((joint) => joint.authoredBuildingBond)

  assert.ok(candidates.length > 0)
  assert.equal(selected.length, candidates.length)
  assert.ok(selected.every((joint) => joint.autoRetain === true))
  assert.ok(selected.some((joint) => joint.contact === 'bearing'))
  assert.ok(selected.some((joint) => joint.contact === 'side'))
})

test('one ordinary royal-city component cannot arbitrarily cascade the whole fortress', () => {
  for (const seed of [1, 7, 31, 91, 20260828]) {
    const generated = generateLevel({ mode: 'main', level: 18, seed })
    const joints = buildStructureJoints(generated.blocks, {
      allowedKinds: structureJointKindsForLevel('main', 18),
      desiredCounts: structureJointCountsForLevel('main', 18),
    })
    const maximumLocalFailure = Math.max(4, Math.ceil(generated.blocks.length * 0.08))
    for (const removed of generated.blocks.filter((block) => (
      !block.critical && !block.weakPoint && !block.cableAnchor && !block.weakFloat
        && !block.structuralSpine
    ))) {
      const remaining = generated.blocks.filter((block) => block !== removed)
      const liveJoints = joints.filter((joint) => (
        joint.firstId !== removed.id && joint.secondId !== removed.id
      ))
      const unstableCount = analyzeStructureStability(remaining, generated.platforms, {
        joints: liveJoints,
      }).unstableIds.size
      assert.ok(
        unstableCount <= maximumLocalFailure,
        `main-18 seed ${seed}: removing ${removed.role} destabilized ${unstableCount} blocks`,
      )
    }
  }
})

test('same-material joints create finite wood nails and stronger stone masonry bonds', () => {
  const woodPost = {
    id: 'wood-post', type: 'wood', x: 0, y: 80, width: 20, height: 40, rotation: 0,
  }
  const woodBeam = {
    id: 'wood-beam', type: 'wood', x: 20, y: 55, width: 80, height: 10, rotation: 0,
  }
  const stonePost = { ...woodPost, id: 'stone-post', type: 'stone' }
  const stoneBeam = { ...woodBeam, id: 'stone-beam', type: 'stone' }

  const woodJoints = buildStructureJoints([woodPost, woodBeam], { contactTolerance: 0.01 })
  const stoneJoints = buildStructureJoints([stonePost, stoneBeam], { contactTolerance: 0.01 })
  assert.equal(woodJoints.length, 1)
  assert.equal(stoneJoints.length, 1)
  assert.deepEqual(
    [woodJoints[0].material, woodJoints[0].kind],
    ['wood', 'nail'],
  )
  assert.deepEqual(
    [stoneJoints[0].material, stoneJoints[0].kind],
    ['stone', 'masonry'],
  )
  assert.equal(woodJoints[0].strength, STRUCTURE_JOINT_RULES.wood.strength)
  assert.equal(stoneJoints[0].strength, STRUCTURE_JOINT_RULES.stone.strength)
  assert.ok(stoneJoints[0].strength > woodJoints[0].strength)
  assert.ok(stoneJoints[0].bearingAllowance > woodJoints[0].bearingAllowance)
  assert.ok(
    stoneJoints[0].strength / stoneJoints[0].damageScale
      > woodJoints[0].strength / woodJoints[0].damageScale,
    'stone masonry must require more incoming block damage to break than a wood nail',
  )

  assert.deepEqual(
    buildStructureJoints([woodPost, woodBeam], { contactTolerance: 0.01 }),
    woodJoints,
  )
  assert.deepEqual(buildStructureJoints([
    woodPost,
    { ...woodBeam, id: 'mixed-beam', type: 'stone' },
    { ...woodBeam, id: 'ice-beam', type: 'ice', x: 0 },
  ], { contactTolerance: 0.01 }), [])
  assert.deepEqual(buildStructureJoints([
    { ...woodPost, id: 'weak-post', critical: true },
    woodBeam,
  ], { contactTolerance: 0.01 }), [])

  assert.deepEqual(
    buildStructureJoints([woodPost, woodBeam, stonePost, stoneBeam], {
      contactTolerance: 0.01,
      allowedKinds: [],
    }),
    [],
  )
  assert.deepEqual(
    buildStructureJoints([woodPost, woodBeam, stonePost, stoneBeam], {
      contactTolerance: 0.01,
      allowedKinds: new Set(['nail']),
    }).map((joint) => joint.kind),
    ['nail'],
  )
  assert.deepEqual(
    buildStructureJoints([woodPost, woodBeam, stonePost, stoneBeam], {
      contactTolerance: 0.01,
      desiredCounts: { nail: 0, masonry: 1 },
    }).map((joint) => joint.kind),
    ['masonry'],
  )
  assert.throws(
    () => buildStructureJoints([woodPost, woodBeam], { allowedKinds: 'nail' }),
    /allowedKinds/u,
  )
  assert.throws(
    () => buildStructureJoints([woodPost, woodBeam], { desiredCounts: { nail: -1 } }),
    /desiredCounts\.nail/u,
  )
})

test('rooted structural joints carry suspended members until the connection breaks', () => {
  const root = {
    id: 'root', type: 'wood', x: 0, y: 80, width: 20, height: 40, rotation: 0,
  }
  const hanging = {
    id: 'hanging', type: 'wood', x: 25, y: 80, width: 30, height: 10, rotation: 0,
  }
  const joints = buildStructureJoints([root, hanging], { contactTolerance: 0.01 })
  assert.equal(joints.length, 1)
  const intact = analyzeStructureStability([root, hanging], [], {
    groundY: 100, contactTolerance: 0.01, joints,
  })
  assert.equal(intact.supportedIds.has('hanging'), true)
  assert.equal(intact.supportById.get('hanging').supportMode, 'joint')
  assert.equal(intact.supportById.get('hanging').suspended, true)

  joints[0].broken = true
  const broken = analyzeStructureStability([root, hanging], [], {
    groundY: 100, contactTolerance: 0.01, joints,
  })
  assert.equal(broken.supportedIds.has('hanging'), false)

  joints[0].broken = false
  const floating = analyzeStructureStability([
    { ...root, y: 35 }, { ...hanging, y: 35 },
  ], [], { groundY: 100, contactTolerance: 0.01, joints })
  assert.equal(floating.supportedIds.size, 0, 'a joint cannot create support without a rooted endpoint')
})

test('adhesive construction materials retain their own bonds outside late joint quotas', () => {
  const root = { id: 'root', type: 'wood', x: 0, y: 80, width: 20, height: 40, rotation: 0 }
  const beam = { id: 'beam', type: 'wood', x: 20, y: 55, width: 80, height: 10, rotation: 0 }
  for (const constructionId of ['canvas-screen', 'resin-glass']) {
    assert.deepEqual(buildStructureJoints([
      { ...root, constructionId }, beam,
    ], { allowedKinds: ['nail'] }), [], constructionId)
  }
  const specialKinds = {
    'resin-timber': 'resin-bond',
    'packed-earth': 'root-bond',
    'leaf-iron-plate': 'iron-clamp',
  }
  for (const [constructionId, expectedKind] of Object.entries(specialKinds)) {
    const joints = buildStructureJoints([
      { ...root, constructionId }, beam,
    ], {
      allowedKinds: [],
      desiredCounts: { nail: 0, masonry: 0 },
    })
    assert.deepEqual(joints.map((joint) => joint.kind), [expectedKind], constructionId)

    for (const weakness of [{ critical: true }, { weakPoint: true }, { weakFloat: true }]) {
      assert.deepEqual(buildStructureJoints([
        { ...root, ...weakness, constructionId }, beam,
      ], { allowedKinds: [] }), [], `${constructionId} must not weld authored weak points`)
    }
  }
  assert.equal(structureContactPairKey('beam', 'root'), structureContactPairKey('root', 'beam'))
})

test('a broken joint immediately loses its extra bearing support and runtime wires both break paths', () => {
  const post = {
    id: 'post', type: 'wood', x: 0, y: 80, width: 20, height: 40, rotation: 0,
  }
  const beam = {
    id: 'beam', type: 'wood', x: 20, y: 55, width: 80, height: 10, rotation: 0,
  }
  const joints = buildStructureJoints([post, beam], { contactTolerance: 0.01 })
  const options = { groundY: 100, contactTolerance: 0.01, joints }
  assert.equal(analyzeBlockSupport(beam, [post], options).supported, true)

  joints[0].broken = true
  joints[0].strength = 0
  assert.equal(analyzeBlockSupport(beam, [post], options).supported, false)

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const jointDamageMethod = runtime.match(
    /damageStructureJoints\(block, damage\) \{[\s\S]*?\n  \}/u,
  )?.[0]
  assert.ok(jointDamageMethod)
  assert.match(jointDamageMethod, /Math\.sqrt\([^\n)]*\.length\)/u)
  assert.match(jointDamageMethod, /joint\.strength -= [^\n]*joint\.damageScale/u)
  assert.match(runtime, /if \(joint\.strength <= 0\) this\.breakStructureJoint\(joint\)/u)
  assert.match(runtime, /stretch > joint\.breakDistance/u)
  assert.match(runtime, /joint\.broken = true/u)
  assert.match(runtime, /joints: this\.structureJoints/u)
  assert.match(runtime, /structureJointKindsForLevel\(this\.mode, this\.level\)/u)
  assert.match(runtime, /structureJointCountsForLevel\(this\.mode, this\.level\)/u)
  assert.match(runtime, /allowedKinds: this\.unlockedStructureJointKinds/u)
  assert.match(runtime, /desiredCounts: this\.structureJointCounts/u)
  assert.match(runtime, /joint\.kind === 'nail'\)\) discoveries\.push\('object:wood-nails'\)/u)
  assert.match(runtime, /joint\.kind === 'masonry'\)\) discoveries\.push\('object:stone-masonry'\)/u)
  assert.match(runtime, /const structuralRestRotation = Number\(block\.structuralRestRotation \|\| 0\)[\s\S]*?Math\.round\(\(block\.rotation - structuralRestRotation\) \/ 90\) \* 90/u)
})

test('material wake thresholds ignore harmless contact but preserve demolition force', () => {
  const wood = { type: 'wood' }
  const stone = { type: 'stone' }
  const ice = { type: 'ice' }

  assert.equal(shouldWakeStructureBlock(wood, { source: 'shock', speed: 0 }), false)
  assert.equal(shouldWakeStructureBlock(wood, { source: 'shock', speed: 0.5 }), false)
  assert.equal(shouldWakeStructureBlock(ice, { source: 'shock', speed: 0.5 }), true)
  assert.equal(shouldWakeStructureBlock(stone, { source: 'shock', speed: 0.9 }), false)
  assert.equal(shouldWakeStructureBlock(stone, { source: 'shock', speed: 1.2, force: true }), true)
  assert.equal(shouldWakeStructureBlock(stone, {
    source: 'collision', speed: 0.1, penetration: 0.4,
  }), false)
  assert.equal(shouldWakeStructureBlock(wood, {
    source: 'collision', speed: 0.1, penetration: 0.9,
  }), true)
  assert.equal(shouldWakeStructureBlock(stone, {
    source: 'collision', speed: 0.1, penetration: 0.9,
  }), false)
  assert.throws(() => shouldWakeStructureBlock(wood, { source: 'wind' }), /source/u)
})

test('every material stability coefficient is consumed by the runtime solver', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  for (const coefficient of ['friction', 'supportStability', 'angularDamping', 'restitution']) {
    assert.ok(runtime.includes(`.${coefficient}`), `${coefficient} is not connected to stepBlocks`)
  }
  assert.match(runtime, /calculateStructureWindLoad\(block,/u)
  assert.match(runtime, /evaluateFallingDebrisDamage\(\{/u)
  assert.match(runtime, /settledDebrisPairs\.add\(debrisHit\.pairKey\)/u)
  assert.match(runtime, /STRUCTURE_STABILITY_RULES\.regularImpact/u)
  assert.match(runtime, /shouldWakeStructureBlock\(first,/u)
  assert.match(runtime, /shouldWakeStructureBlock\(block,/u)
  assert.match(runtime, /STRUCTURE_IMPULSE_BY_BIRD/u)
  assert.match(runtime, /bird\.type === 'dash' && bird\.used/u)
  assert.match(runtime, /bird\.type === 'drill' && bird\.pierceRemaining > 0/u)
  assert.doesNotMatch(runtime, /shockwave\(block\.x, block\.y, 70, 7\)/u)
})

test('钻岩橡宝在空中发动后从当前列高速垂直下钻', () => {
  const activation = calculateVerticalDrillActivation({
    vx: 13.5, vy: -4.2, damage: 1.25, baseDamage: 1.25,
  }, {
    diveSpeed: 21,
    horizontalVelocityRetention: 0,
    maxPierces: 4,
    durationMs: 960,
    damageMultiplier: 1.85,
  }, 1000 / 30)

  assert.equal(activation.vx, 0)
  assert.equal(activation.vy, 21)
  assert.equal(activation.rotation, 0)
  assert.equal(activation.pierceRemaining, 4)
  assert.equal(activation.abilityTicks, 29)
  assert.equal(activation.damage, 2.3125)
  assert.ok(Object.isFrozen(activation))

  const crossedThinStone = resolveSweptCircleRectCollision(
    { x: 420, y: 230, radius: 5, vx: 0, vy: 21 },
    { x: 420, y: 218, width: 90, height: 4, rotation: 0 },
    {
      previousCircle: { x: 420, y: 209, radius: 5 },
      previousRectangle: { x: 420, y: 218, width: 90, height: 4, rotation: 0 },
      restitution: 0,
    },
  )
  assert.ok(crossedThinStone, '高速垂直钻击不得穿过薄石板而漏判')
  assert.ok(crossedThinStone.time > 0 && crossedThinStone.time < 1)

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /Object\.assign\(bird, calculateVerticalDrillActivation\(bird, poweredAbility, STEP_MS\)\)/u)
  assert.match(runtime, /bird\.type === 'drill'.*GROUND_Y - 2/u)
  assert.match(runtime, /drillAbility\?\.activeWindMultiplier/u)
  assert.match(runtime, /drillAbility\?\.activeGravityMultiplier/u)
  assert.match(runtime, /resolveSweptCircleRectCollision\(birdCollider, block,/u)
  assert.match(runtime, /bird\.piercedBlockIds\.has\(block\.id\)/u)
  assert.match(runtime, /bird\.used\) return/u)
})

test('score milestones begin with one opening pick and widen over the run', () => {
  assert.deepEqual(
    TALENT_SCORE_MILESTONES.map((milestone) => milestone.score),
    [0, 5_000, 12_000, 22_000, 35_000, 50_000, 70_000, 95_000, 125_000,
      160_000, 200_000, 245_000, 295_000, 355_000, 425_000, 505_000, 595_000,
      695_000, 805_000, 925_000, 1_055_000, 1_195_000, 1_345_000, 1_505_000,
      1_675_000, 1_855_000, 2_045_000, 2_245_000, 2_455_000, 2_675_000],
  )
  assert.ok(TALENT_SCORE_MILESTONES.length > Object.keys(TALENTS).length)
  assert.equal(TALENT_SCORE_MILESTONES.length, 30)
  assert.equal(TALENT_SCORE_MILESTONES[0].id, 'opening')
  assert.equal(new Set(TALENT_SCORE_MILESTONES.map((milestone) => milestone.id)).size,
    TALENT_SCORE_MILESTONES.length)

  const gaps = TALENT_SCORE_MILESTONES.slice(1).map((milestone, index) => (
    milestone.score - TALENT_SCORE_MILESTONES[index].score
  ))
  assert.ok(gaps.every((gap, index) => index === 0 || gap >= gaps[index - 1]))
  assert.ok(Object.isFrozen(TALENT_SCORE_MILESTONES))
  assert.ok(Object.isFrozen(TALENT_SCORE_MILESTONES[0]))
})

test('talent unlock progress grants the opening pick exactly once', () => {
  const unclaimed = calculateTalentUnlockProgress(0, 0)
  assert.equal(unclaimed.earnedCount, 1)
  assert.equal(unclaimed.pendingCount, 1)
  assert.equal(unclaimed.nextPendingMilestone.id, 'opening')
  assert.equal(unclaimed.nextMilestone.score, 5_000)
  assert.equal(unclaimed.pointsToNext, 5_000)

  const claimed = calculateTalentUnlockProgress(0, 1)
  assert.equal(claimed.pendingCount, 0)
  assert.equal(claimed.nextPendingMilestone, null)
  assert.equal(claimed.nextMilestone.score, 5_000)
})

test('talent unlock progress queues every crossed score milestone without duplicates', () => {
  const before = calculateTalentUnlockProgress(4_999, 1)
  assert.equal(before.pendingCount, 0)
  assert.equal(before.pointsToNext, 1)

  const atThreshold = calculateTalentUnlockProgress(5_000, 1)
  assert.deepEqual(atThreshold.pendingMilestones.map((milestone) => milestone.score), [5_000])
  assert.equal(atThreshold.nextMilestone.score, 12_000)

  const crossedThree = calculateTalentUnlockProgress(22_999, 1)
  assert.deepEqual(
    crossedThree.pendingMilestones.map((milestone) => milestone.score),
    [5_000, 12_000, 22_000],
  )
  assert.equal(crossedThree.earnedCount, 4)
  assert.equal(crossedThree.pendingCount, 3)
  assert.equal(crossedThree.nextPendingMilestone.score, 5_000)
  assert.equal(crossedThree.nextMilestone.score, 35_000)
  assert.equal(crossedThree.pointsToNext, 12_001)
  assert.deepEqual(calculateTalentUnlockProgress(22_999, 1), crossedThree)

  const oneClaimed = calculateTalentUnlockProgress(22_999, 2)
  assert.deepEqual(oneClaimed.pendingMilestones.map((milestone) => milestone.score), [12_000, 22_000])
})

test('talent unlock progress safely handles retries, invalid values, and completion', () => {
  const retryRollback = calculateTalentUnlockProgress(4_000, 3)
  assert.equal(retryRollback.earnedCount, 1)
  assert.equal(retryRollback.claimedCount, 3)
  assert.equal(retryRollback.pendingCount, 0)
  assert.equal(retryRollback.nextMilestone.score, 22_000)
  assert.equal(retryRollback.pointsToNext, 18_000)

  assert.equal(calculateTalentUnlockProgress('12000.9', '1').pendingCount, 2)
  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, '', null, undefined, Symbol('score')]) {
    assert.equal(calculateTalentUnlockProgress(invalid, invalid).score, 0)
    assert.equal(calculateTalentUnlockProgress(invalid, invalid).claimedCount, 0)
  }

  const complete = calculateTalentUnlockProgress(Number.MAX_VALUE, Number.MAX_VALUE)
  assert.equal(complete.earnedCount, TALENT_SCORE_MILESTONES.length)
  assert.equal(complete.claimedCount, TALENT_SCORE_MILESTONES.length)
  assert.equal(complete.pendingCount, 0)
  assert.equal(complete.nextMilestone, null)
  assert.equal(complete.pointsToNext, 0)
})

test('each successful clear unlocks at most one reached talent milestone', () => {
  const firstClear = advanceTalentUnlockOnClear(50_000, 1)
  assert.equal(firstClear.eligibleCount, 2)
  assert.equal(firstClear.unlockedMilestone.score, 5_000)

  const secondClear = advanceTalentUnlockOnClear(50_000, firstClear.eligibleCount)
  assert.equal(secondClear.eligibleCount, 3)
  assert.equal(secondClear.unlockedMilestone.score, 12_000)

  const belowNext = advanceTalentUnlockOnClear(4_999, 1)
  assert.equal(belowNext.eligibleCount, 1)
  assert.equal(belowNext.unlockedMilestone, null)

  const complete = advanceTalentUnlockOnClear(Number.MAX_VALUE, TALENT_SCORE_MILESTONES.length)
  assert.equal(complete.eligibleCount, TALENT_SCORE_MILESTONES.length)
  assert.equal(complete.unlockedMilestone, null)
})

test('direct-progression talents expose balanced effect parameters', () => {
  assert.deepEqual(TALENTS.pack.effects, {
    extraShots: 1,
    overflowDirectDamageBonus: 1,
    countsForReserveStars: false,
    countsForReserveBonus: false,
  })
  assert.deepEqual(TALENTS.stonebreaker.effects, {
    stoneDamageBonus: 1,
    stoneCrackRadius: 64,
    stoneCrackDamage: 1,
    stoneCrackMaxTargets: 2,
  })
  assert.deepEqual(TALENTS.blastCore.effects, { explosionRadiusMultiplier: 1.25 })
  assert.deepEqual(TALENTS.frost.effects, {
    frostRadiusMultiplier: 1.35,
    brittleDamageMultiplier: 1.25,
  })
  assert.deepEqual(TALENTS.tailwind.effects, { windMultiplier: 0.5 })
  assert.deepEqual(TALENTS.secondWind.effects, {
    rescueShots: 1,
    rescuesPerLevel: 1,
    rescueBirdType: 'current-pool',
    rescueDamageBonus: 1,
    countsForReserveStars: false,
    countsForReserveBonus: false,
  })
  assert.match(TALENTS.pack.desc, /不计入余弹/u)
  assert.match(TALENTS.stonebreaker.desc, /裂纹/u)
  assert.match(TALENTS.secondWind.desc, /本关弹药池/u)
  assert.match(TALENTS.lucky.desc, /解锁天赋/u)
  assert.match(TALENTS.comboM.desc, /解锁天赋/u)
  assert.ok(Object.values(TALENTS).every((talent) => Object.isFrozen(talent.effects)))
})

test('talent affinity data audits every talent and all eleven acorn content types', () => {
  assert.deepEqual(Object.keys(TALENT_AFFINITIES), Object.keys(TALENTS))
  assert.deepEqual(ACORN_AFFINITY_TYPES, [
    'red', 'bomb', 'split', 'dash', 'fire', 'drill',
    'frost', 'vine', 'boomerang', 'quake', 'golden',
  ])
  assert.equal(new Set(ACORN_AFFINITY_TYPES).size, 11)
  assert.ok(Object.isFrozen(ACORN_AFFINITY_TYPES))
  assert.ok(Object.isFrozen(TALENT_AFFINITIES))
  for (const affinity of Object.values(TALENT_AFFINITIES)) {
    assert.ok(Object.isFrozen(affinity))
    assert.ok(Object.isFrozen(affinity.requiresAll))
    assert.ok(Object.isFrozen(affinity.requiresAny))
    assert.ok(Object.isFrozen(affinity.directAny))
    assert.ok(Object.isFrozen(affinity.birdAny))
    assert.ok(Object.isFrozen(affinity.signatureBirdTypes))
    assert.ok(Object.isFrozen(affinity.preferredTokens))
    assert.ok(affinity.baseWeight > 0)
  }
})

test('contextual talent draft guarantees two effective encounter-linked cards', () => {
  const context = {
    birdTypes: ['dash', 'red', 'split'],
    materialTypes: ['wood', 'stone'],
    enemyTypes: ['normal', 'shield'],
    mapType: 'moving',
    windX: 0,
    rules: [{ id: 'lift-rail', kind: 'moving-platform' }],
    objectiveType: 'collapse-and-clear',
    blockCount: 24,
    targetCount: 7,
    shotLimit: 5,
    difficulty: 8,
  }
  const choices = chooseContextualTalentOptions({
    seed: 0x51a7,
    milestone: { id: 'opening', index: 0 },
    ownedTalentIds: ['pack'],
    context,
  })
  assert.equal(choices.length, 3)
  assert.equal(new Set(choices).size, choices.length)
  assert.ok(!choices.includes('pack'))
  const evaluations = choices.map((talentId) => evaluateTalentAffinity(talentId, {
    ...context,
    ownedTalentIds: ['pack'],
  }))
  assert.ok(evaluations.every((entry) => entry.eligible))
  assert.ok(evaluations.filter((entry) => entry.direct).length >= 2)
  assert.ok(evaluations.every((entry) => entry.birdLinked))
  assert.ok(evaluations.every(Object.isFrozen))
})

test('every special-stage signature acorn receives a matching talent card', () => {
  const scenarios = [
    {
      signatureBirdType: 'frost',
      birdTypes: ['frost', 'bomb'], materialTypes: ['ice', 'stone'],
      enemyTypes: ['shaman', 'shield'], rules: [{ kind: 'wind-cycle', id: 'polar-wind-dial' }],
      expected: ['frost'],
    },
    {
      signatureBirdType: 'vine',
      birdTypes: ['vine', 'split'], materialTypes: ['wood', 'stone'],
      enemyTypes: ['engineer', 'burrower'], rules: [{ kind: 'water-cycle', id: 'tide-waterline' }],
      expected: ['feather', 'flame'],
    },
    {
      signatureBirdType: 'boomerang',
      birdTypes: ['boomerang', 'red'], materialTypes: ['wood'],
      enemyTypes: ['shield', 'shaman'], rules: [{ kind: 'surface-restitution', id: 'mirror-ricochet' }],
      expected: ['feather', 'flame'],
    },
    {
      signatureBirdType: 'drill',
      birdTypes: ['drill', 'dash'], materialTypes: ['stone', 'wood'],
      enemyTypes: ['burrower', 'engineer'], rules: [{ kind: 'delayed-collapse', id: 'root-fault-chain' }],
      expected: ['stonebreaker'],
    },
    {
      signatureBirdType: 'quake',
      birdTypes: ['quake', 'dash'], materialTypes: ['stone', 'wood'],
      enemyTypes: ['glider', 'engineer'], rules: [{ kind: 'wind-zone', id: 'storm-updraft' }],
      expected: ['shock'],
    },
  ]

  for (const [index, scenario] of scenarios.entries()) {
    const context = {
      ...scenario,
      mapType: `special:test-${index}`,
      objectiveType: 'collapse-and-clear',
      blockCount: 30,
      targetCount: 8,
      shotLimit: 4,
      difficulty: 9,
    }
    const choices = chooseContextualTalentOptions({
      seed: 700 + index,
      milestone: { id: 'opening', index: 0 },
      context,
    })
    assert.equal(choices.length, 3, scenario.signatureBirdType)
    assert.ok(choices.some((talentId) => scenario.expected.includes(talentId)), scenario.signatureBirdType)
    assert.ok(choices.some((talentId) => (
      evaluateTalentAffinity(talentId, context).signatureMatch
    )), scenario.signatureBirdType)
    assert.ok(choices.map((talentId) => evaluateTalentAffinity(talentId, context))
      .filter((entry) => entry.direct).length >= 2, scenario.signatureBirdType)
  }
})

test('contextual draft excludes talents with no possible runtime effect in the stage', () => {
  const quietContext = {
    birdTypes: ['red', 'split', 'dash'],
    materialTypes: ['wood'],
    enemyTypes: ['normal'],
    mapType: 'normal',
    windX: 0,
    rules: [],
    objectiveType: 'eliminate-all',
    blockCount: 18,
    targetCount: 5,
    shotLimit: 4,
  }
  assert.equal(evaluateTalentAffinity('blastCore', quietContext).eligible, false)
  assert.equal(evaluateTalentAffinity('tailwind', quietContext).eligible, false)
  assert.equal(evaluateTalentAffinity('frost', { ...quietContext, materialTypes: ['wood', 'ice'] }).eligible, false)
  assert.equal(evaluateTalentAffinity('frost', quietContext).eligible, false)
  assert.equal(evaluateTalentAffinity('stonebreaker', quietContext).eligible, false)

  for (let seed = 1; seed <= 48; seed += 1) {
    const choices = chooseContextualTalentOptions({ seed, context: quietContext })
    assert.ok(!choices.includes('blastCore'), `blastCore at seed ${seed}`)
    assert.ok(!choices.includes('tailwind'), `tailwind at seed ${seed}`)
    assert.ok(!choices.includes('frost'), `frost at seed ${seed}`)
    assert.ok(!choices.includes('stonebreaker'), `stonebreaker at seed ${seed}`)
  }

  assert.equal(evaluateTalentAffinity('blastCore', {
    ...quietContext,
    ownedTalentIds: ['secondWind'],
  }).eligible, false)
  assert.equal(evaluateTalentAffinity('blastCore', {
    ...quietContext,
    birdTypes: [...quietContext.birdTypes, 'bomb'],
  }).eligible, true)
  assert.equal(evaluateTalentAffinity('tailwind', {
    ...quietContext,
    mapType: 'wind',
  }).eligible, true)
  assert.equal(evaluateTalentAffinity('frost', {
    ...quietContext,
    birdTypes: [...quietContext.birdTypes, 'frost'],
    materialTypes: ['wood', 'ice'],
  }).eligible, true)
  assert.equal(evaluateTalentAffinity('stonebreaker', {
    ...quietContext,
    materialTypes: ['wood', 'stone'],
  }).eligible, true)
})

test('contextual talent options are deterministic per opening or score milestone while retaining variety', () => {
  const context = {
    signatureBirdType: 'vine',
    birdTypes: ['vine', 'split', 'bomb'],
    materialTypes: ['wood', 'stone'],
    enemyTypes: ['engineer', 'burrower'],
    mapType: 'special:tidebound-undercity',
    windX: 0,
    rules: [{ id: 'tide-waterline', kind: 'water-cycle' }],
    objectiveType: 'collapse-and-clear',
    blockCount: 30,
    targetCount: 8,
    shotLimit: 5,
    difficulty: 9,
  }
  const opening = chooseContextualTalentOptions({
    seed: 0xc0ffee,
    milestone: { id: 'opening', index: 0 },
    context,
  })
  assert.deepEqual(chooseContextualTalentOptions({
    seed: 0xc0ffee,
    milestone: { id: 'opening', index: 0 },
    context: {
      ...context,
      birdTypes: [...context.birdTypes].reverse(),
      materialTypes: [...context.materialTypes].reverse(),
      enemyTypes: [...context.enemyTypes].reverse(),
    },
  }), opening)

  const later = chooseContextualTalentOptions({
    seed: 0xc0ffee,
    milestone: { id: 'score-22000', index: 3 },
    ownedTalentIds: [opening[0]],
    context,
  })
  assert.deepEqual(chooseContextualTalentOptions({
    seed: 0xc0ffee,
    milestone: { id: 'score-22000', index: 3 },
    ownedTalentIds: [opening[0]],
    context,
  }), later)
  assert.ok(!later.includes(opening[0]))

  const explored = new Set()
  for (let seed = 1; seed <= 24; seed += 1) {
    for (const talentId of chooseContextualTalentOptions({ seed, context })) explored.add(talentId)
  }
  assert.ok(explored.size >= 7, `only explored ${[...explored].join(', ')}`)
})

test('every talent description has a matching runtime branch', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  for (const id of Object.keys(TALENTS)) {
    assert.ok(runtime.includes(`hasTalent('${id}')`) || runtime.includes(`talentEffect('${id}'`),
      `${id} has no runtime implementation`)
  }
})

test('every talent has a unique non-text SVG art icon', () => {
  const configuredIcons = Object.values(TALENTS).map((talent) => talent.icon)
  assert.deepEqual(new Set(configuredIcons), new Set(TALENT_ICON_IDS))
  assert.equal(new Set(configuredIcons).size, Object.keys(TALENTS).length)
  for (const icon of configuredIcons) {
    const markup = talentIconMarkup(icon)
    assert.match(markup, /^<svg[^>]+viewBox="0 0 32 32"/u)
    assert.match(markup, /<path|<circle/u)
    assert.doesNotMatch(markup, />[\p{L}\p{N}]+</u)
  }
})

test('Rng reproduces the AS3 linear congruential sequence', () => {
  const first = new Rng(1)
  const second = new Rng(1)
  const zeroFallsBackToOne = new Rng(0)

  const sequence = Array.from({ length: 6 }, () => first.next())
  assert.deepEqual(sequence, Array.from({ length: 6 }, () => second.next()))
  assert.equal(sequence[0], 1_015_568_748 / 0x1_0000_0000)
  assert.equal(zeroFallsBackToOne.next(), sequence[0])

  const clone = first.clone()
  assert.equal(clone.state, first.state)
  assert.equal(clone.next(), first.next())
  assert.equal(new Rng(7).integer(4, 9), 5)
})

test('dateSeed is calendar-stable and rejects impossible dates', () => {
  assert.equal(dateSeed(new Date(2026, 7, 24, 23, 59, 59)), 20260824)
  assert.equal(dateSeed('2026-08-24'), 20260824)
  assert.equal(dateSeed({ year: 2026, month: 8, day: 24 }), 20260824)
  assert.throws(() => dateSeed('2026-02-30'), /invalid calendar/u)
})

test('mixSeed is deterministic, type-aware, and sensitive to every part', () => {
  const first = mixSeed(20260824, 'daily', 7)
  assert.equal(first, mixSeed(20260824, 'daily', 7))
  assert.notEqual(first, mixSeed(20260824, 'daily', 8))
  assert.notEqual(mixSeed(1), mixSeed('1'))
  assert.notEqual(first, 0)
})

test('falling structures need real impact energy and heavier stone hits harder', () => {
  assert.equal(calculateCrushDamage(6, 1), 0)
  assert.equal(calculateCrushDamage(7, 2), 0)
  assert.equal(calculateCrushDamage(10, 2), 1)
  assert.equal(calculateCrushDamage(12, 2), 1)
  assert.equal(calculateCrushDamage(16, 2), 2)
  assert.equal(calculateCrushDamage(20, 0.5), 1)
  for (const invalid of [NaN, Infinity, -1, 0, null, undefined]) {
    assert.equal(calculateCrushDamage(invalid, 1), 0)
  }
})

test('spent acorns of every type cannot grind structure health through low-speed contact', () => {
  assert.deepEqual(ORDINARY_ACORN_IMPACT_RULES, {
    minimumClosingSpeed: 2.2,
    minimumMomentum: 2.5,
    restingRelativeSpeed: 1.2,
    restingSurfaceNormalY: -0.6,
  })
  assert.ok(Object.isFrozen(ORDINARY_ACORN_IMPACT_RULES))

  const ordinaryImpact = (overrides = {}) => evaluateAcornStructureImpact({
    type: 'red',
    splitClone: false,
    enteringContact: true,
    birdVx: 10,
    birdVy: 0,
    blockVx: 0,
    blockVy: 0,
    normalX: -1,
    normalY: 0,
    mass: 1,
    ...overrides,
  })

  assert.equal(ordinaryImpact().eligible, true)
  assert.equal(ordinaryImpact().reason, 'eligible')
  assert.equal(ordinaryImpact({ birdVx: 0.2 }).reason, 'insufficient-closing-speed')
  assert.equal(ordinaryImpact({ birdVx: 2.2 }).reason, 'insufficient-momentum')
  assert.equal(ordinaryImpact({ birdVx: 2.5 }).eligible, true)
  assert.equal(ordinaryImpact({ birdVx: 0, birdVy: 12 }).reason, 'insufficient-closing-speed')
  assert.equal(ordinaryImpact({ enteringContact: false }).reason, 'same-contact')
  assert.equal(ordinaryImpact({ normalX: 0, normalY: 0 }).reason, 'invalid-normal')

  // A moving structure uses relative closing speed instead of the acorn's
  // absolute speed, while a later separated re-entry is eligible again.
  assert.equal(ordinaryImpact({ birdVx: 10, blockVx: 8 }).eligible, false)
  assert.equal(ordinaryImpact({ birdVx: 0, blockVx: -3 }).eligible, true)
  assert.equal(ordinaryImpact({ enteringContact: true, birdVx: 10 }).eligible, true)

  for (const type of ['bomb', 'split', 'dash', 'fire', 'drill', 'frost', 'vine', 'boomerang', 'quake']) {
    const spent = evaluateAcornStructureImpact({
      type, enteringContact: false, birdVx: 0, birdVy: 0, normalX: -1, normalY: 0,
    })
    assert.equal(spent.eligible, false, `${type} cannot damage through the same resting contact`)
    assert.equal(spent.reason, 'same-contact')
    assert.equal(evaluateAcornStructureImpact({
      type, enteringContact: true, birdVx: 7, birdVy: 0, normalX: -1, normalY: 0,
      mass: 1,
    }).eligible, true, `${type} can damage again after a genuine high-speed re-entry`)
  }
  assert.equal(ordinaryImpact({ splitClone: true, enteringContact: false, birdVx: 0 }).eligible, false)
})

test('acorn lifetime keeps landings readable and retires stalled physics loops promptly', () => {
  assert.deepEqual(ACORN_LIFECYCLE_RULES, {
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
  assert.ok(Object.isFrozen(ACORN_LIFECYCLE_RULES))

  let counters = advanceAcornLifecycleCounters({}, {
    grounded: true, groundedStable: true, speed: 0.6, displacement: 0.4,
  })
  assert.deepEqual(counters, {
    groundedStillTicks: 1,
    groundedTicks: 1,
    structureStillTicks: 0,
    platformStillTicks: 0,
    stalledTicks: 1,
    outsideWorldTicks: 0,
  })
  counters = advanceAcornLifecycleCounters(counters, {
    grounded: false, speed: 2.5, displacement: 2.5,
  })
  assert.equal(counters.groundedStillTicks, 0, 'a bounce clears the stable-ground counter')
  assert.equal(counters.groundedTicks, 0, 'a bounce clears the continuous-ground counter')
  counters = advanceAcornLifecycleCounters(counters, {
    grounded: true, groundedStable: true, speed: 0.6, displacement: 0.4,
  })
  assert.equal(counters.groundedStillTicks, 1, 'the second landing starts a new window')
  counters = advanceAcornLifecycleCounters({
    ...counters, structureStillTicks: 9, platformStillTicks: 7, stalledTicks: 12,
  }, {
    grounded: true, groundedStable: true, restingOnStructure: true,
    restingOnPlatform: true, speed: 0.2, displacement: 0.1, abilityActive: true,
    outsideWorld: true,
  })
  assert.equal(counters.groundedStillTicks, 0)
  assert.equal(counters.structureStillTicks, 0)
  assert.equal(counters.platformStillTicks, 0)
  assert.equal(counters.stalledTicks, 0)
  assert.equal(counters.outsideWorldTicks, 1, 'an ability does not suppress the boundary grace counter')

  const active = (overrides = {}) => evaluateAcornLifecycle({
    age: 120,
    groundedStillTicks: 0,
    groundedTicks: 0,
    structureStillTicks: 0,
    platformStillTicks: 0,
    stalledTicks: 0,
    outsideWorldTicks: 0,
    farOutsideWorld: false,
    abilityActive: false,
    ...overrides,
  })
  assert.deepEqual(active({ age: 14, groundedStillTicks: 99 }), {
    shouldSettle: false, reason: 'minimum-visible-time',
  })
  assert.deepEqual(active({ groundedStillTicks: 17 }), {
    shouldSettle: false, reason: 'active',
  })
  assert.deepEqual(active({ groundedStillTicks: 18 }), {
    shouldSettle: true, reason: 'grounded',
  })
  assert.deepEqual(active({ groundedTicks: 89 }), {
    shouldSettle: false, reason: 'active',
  })
  assert.deepEqual(active({ groundedTicks: 90 }), {
    shouldSettle: true, reason: 'grounded-timeout',
  })
  assert.deepEqual(active({ structureStillTicks: 24 }), {
    shouldSettle: true, reason: 'resting-on-structure',
  })
  assert.deepEqual(active({ platformStillTicks: 24 }), {
    shouldSettle: true, reason: 'resting-on-platform',
  })
  assert.deepEqual(active({ stalledTicks: 54 }), {
    shouldSettle: true, reason: 'stalled',
  })
  assert.deepEqual(active({ groundedStillTicks: 99, abilityActive: true }), {
    shouldSettle: false, reason: 'ability-active',
  })
  assert.deepEqual(active({ outsideWorldTicks: 5, abilityActive: true }), {
    shouldSettle: false, reason: 'ability-active',
  })
  assert.deepEqual(active({ outsideWorldTicks: 6, abilityActive: true }), {
    shouldSettle: true, reason: 'out-of-bounds',
  })
  assert.deepEqual(active({ farOutsideWorld: true, abilityActive: true }), {
    shouldSettle: true, reason: 'out-of-bounds',
  })
  assert.deepEqual(active({ age: 360, abilityActive: true }), {
    shouldSettle: true, reason: 'maximum-lifetime',
  })

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /blockContactIds: new Set\(\), structureStillTicks: 0, platformStillTicks: 0/u)
  assert.match(runtime, /const lifecycle = evaluateAcornLifecycle\(\{/u)
  assert.match(runtime, /const counters = advanceAcornLifecycleCounters\(\{/u)
  assert.match(runtime, /if \(lifecycle\.shouldSettle\) this\.settleBird\(bird\)/u)
  assert.doesNotMatch(runtime, /bird\.stillTicks >= 2/u)
  assert.doesNotMatch(runtime, /bird\.age > 900/u)
})

test('runtime gates all direct structure damage while authored abilities stay independent', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /evaluateAcornStructureImpact\(\{/u)
  assert.match(runtime, /blockContactIds: new Set\(\), structureStillTicks: 0/u)
  assert.match(runtime, /const effectiveImpact = !hitCoolingDown && impact\.eligible/u)
  const gatedStart = runtime.indexOf('if (effectiveImpact) {')
  const collisionResponseStart = runtime.indexOf('const horizontal =', gatedStart)
  const gatedSection = runtime.slice(gatedStart, collisionResponseStart)
  assert.match(gatedSection, /this\.damageBlock\(block, directDamage\)/u)
  assert.match(gatedSection, /this\.addCombo\(\)/u)
  assert.match(gatedSection, /block\.asleep = false/u)
  assert.doesNotMatch(runtime, /if \(!ordinaryBird && hitCoolingDown\) continue/u)
  assert.match(runtime, /advanceAcornLifecycleCounters\(\{/u)
  assert.match(runtime, /restingOnStructure,/u)

  const flameStart = runtime.indexOf('  stepFireTrail() {')
  const particlesStart = runtime.indexOf('  stepParticles() {', flameStart)
  const flameSection = runtime.slice(flameStart, particlesStart)
  assert.match(flameSection, /this\.damageBlock\(block, this\.talentEffect\('flame'/u)
  assert.doesNotMatch(flameSection, /evaluateAcornStructureImpact/u)
  const quakeStart = runtime.indexOf('  triggerQuakeBird(bird) {')
  const specialRuleStart = runtime.indexOf('  advanceSpecialRulesOnLaunch() {', quakeStart)
  const quakeSection = runtime.slice(quakeStart, specialRuleStart)
  assert.match(quakeSection, /const shockDamage = ability\.shockDamage \* abilityPower[\s\S]*?this\.damageBlock\(block, shockDamage\)/u)
  assert.match(quakeSection, /triggerFireAcorn\(bird, primaryBlock\)/u)
  assert.match(quakeSection, /this\.igniteBlock\(block/u)
  assert.doesNotMatch(quakeSection, /evaluateAcornStructureImpact/u)
})

test('霜铃永久冻脆链路不再依赖倒计时，天赋只扩大范围与倍率', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /freezeArea\([\s\S]*?ability\.permanentBlockFreeze/u)
  assert.match(runtime, /block\.brittleDamageMultiplier = Math\.max/u)
  assert.match(runtime, /const brittleMultiplier = block\.permanentlyFrozen/u)
  assert.match(runtime, /if \(block\.permanentlyFrozen\) \{/u)
  assert.match(runtime, /actualDamage = block\.permanentlyFrozen/u)
  assert.doesNotMatch(runtime, /frozenTicks|slowDurationMultiplier|blockBrittleMs/u)
  assert.match(TALENTS.frost.desc, /范围/u)
  assert.match(TALENTS.frost.desc, /倍率/u)
  assert.doesNotMatch(TALENTS.frost.desc, /时间/u)
})

test('烈焰橡果使用熔芯附着与独立灼烧，不依赖烈焰尾迹天赋', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const fireStart = runtime.indexOf('  triggerFireAcorn(bird, primaryBlock) {')
  const fireEnd = runtime.indexOf('  advanceSpecialRulesOnLaunch() {', fireStart)
  const fireSection = runtime.slice(fireStart, fireEnd)
  assert.match(fireSection, /connectedIds/u)
  assert.match(fireSection, /ability\.maximumNeighbors/u)
  assert.match(fireSection, /ability\.burnDurationTicks/u)
  assert.match(fireSection, /ability\.woodBurnDamage/u)
  assert.match(fireSection, /ability\.otherBurnDamage/u)
  assert.doesNotMatch(fireSection, /talentEffect\('flame'/u)
  assert.match(runtime, /block\.burnDurationTotal/u)
  assert.match(runtime, /block\.burnPulseDamage/u)
  assert.match(runtime, /if \(bird\.fireArmed && this\.triggerFireAcorn\(bird, block\)\) return/u)
})

test('calculateClearResult awards stars and reserve bonuses at every threshold', () => {
  assert.deepEqual(calculateClearResult(0), {
    stars: 1,
    clearBonus: 1000,
    reserveBonus: 0,
    totalBonus: 1000,
  })
  assert.deepEqual(calculateClearResult(1), {
    stars: 2,
    clearBonus: 1000,
    reserveBonus: 250,
    totalBonus: 1250,
  })
  assert.deepEqual(calculateClearResult(2), {
    stars: 3,
    clearBonus: 1000,
    reserveBonus: 500,
    totalBonus: 1500,
  })
  assert.deepEqual(calculateClearResult(7), {
    stars: 3,
    clearBonus: 1000,
    reserveBonus: 1750,
    totalBonus: 2750,
  })
})

test('calculateClearResult normalizes fractional, coercible, and invalid reserves', () => {
  assert.deepEqual(calculateClearResult(3.9), calculateClearResult(3))
  assert.deepEqual(calculateClearResult('2'), calculateClearResult(2))

  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, '', null, undefined, 'invalid', Symbol('shots')]) {
    assert.deepEqual(calculateClearResult(invalid), calculateClearResult(0))
  }

  const clamped = calculateClearResult(Number.MAX_VALUE)
  assert.equal(clamped.stars, 3)
  assert.equal(clamped.reserveBonus, Number.MAX_SAFE_INTEGER * 250)
  assert.equal(clamped.totalBonus, 1000 + Number.MAX_SAFE_INTEGER * 250)
})

test('shot budgets cap the complete endless loadout at eight without changing authored main reserves', () => {
  assert.deepEqual(SHOT_BUDGET_RULES, { endlessMaximumTotalShots: 8 })
  assert.equal(CONSTANTS.endlessMaximumTotalShots, 8)
  assert.ok(Object.isFrozen(SHOT_BUDGET_RULES))

  assert.deepEqual(calculateShotBudget({
    mode: 'endless', baseShotBudget: 44, bonusShotsGranted: 2,
  }), {
    mode: 'endless',
    requestedBaseShotBudget: 44,
    baseShotBudget: 8,
    requestedBonusShots: 2,
    bonusShotsGranted: 0,
    totalShotBudget: 8,
    maximumTotalShotBudget: 8,
  })
  assert.equal(calculateShotBudget({
    mode: 'endless', baseShotBudget: 6, bonusShotsGranted: 3,
  }).totalShotBudget, 8)
  assert.equal(calculateShotBudget({
    mode: 'main', baseShotBudget: 11, bonusShotsGranted: 1,
  }).totalShotBudget, 12)

  for (const level of [1, 50, 100, 200, 10_000]) {
    const generated = generateLevel({ level, seed: 91, mode: 'endless' })
    assert.ok(generated.totalShotBudget <= 8, `endless ${level} exceeded the total-shot cap`)
    assert.equal(generated.baseShotBudget, generated.totalShotBudget)
    assert.equal(generated.birdsAvailable + 1, generated.totalShotBudget)
    assert.equal(generated.maximumTotalShotBudget, 8)
  }

  for (const [level, totalShots] of [[13, 6], [14, 7], [15, 8], [16, 9], [17, 10], [18, 11]]) {
    const generated = generateLevel({ level, seed: 91, mode: 'main' })
    assert.equal(generated.baseShotBudget, totalShots)
    assert.equal(generated.totalShotBudget, totalShots)
    assert.equal(generated.birdsAvailable + 1, totalShots)
    assert.equal(generated.maximumTotalShotBudget, null)
  }
})

test('bonus, refund, and rescue shots never count toward reserve stars or reserve score', () => {
  assert.deepEqual(calculateReserveEligibility({
    shotsRemaining: 3,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
    bonusShotsRemaining: 2,
  }), {
    shotsRemaining: 3,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
    bonusShotsRemaining: 2,
    excludedBonusShots: 2,
    starEligibleShotsRemaining: 1,
  })

  const unspentExtras = calculateClearResult({
    shotsRemaining: 3,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
    bonusShotsRemaining: 2,
  })
  assert.equal(unspentExtras.stars, 2)
  assert.equal(unspentExtras.reserveBonus, 250)
  assert.equal(unspentExtras.starEligibleShotsRemaining, 1)
  assert.ok(Object.isFrozen(unspentExtras))

  const extrasWereUsed = calculateClearResult({
    shotsRemaining: 2,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
    bonusShotsRemaining: 0,
  })
  assert.equal(extrasWereUsed.stars, 3)
  assert.equal(extrasWereUsed.reserveBonus, 500)
  assert.equal(extrasWereUsed.starEligibleShotsRemaining, 2)

  const conservativeWithoutRemainingProvenance = calculateClearResult({
    shotsRemaining: 2,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
  })
  assert.equal(conservativeWithoutRemainingProvenance.stars, 1)
  assert.equal(conservativeWithoutRemainingProvenance.reserveBonus, 0)

  const impossibleOverflowCannotScore = calculateClearResult({
    shotsRemaining: 7,
    baseShotBudget: 4,
    bonusShotsGranted: 0,
    bonusShotsRemaining: 0,
  })
  assert.equal(impossibleOverflowCannotScore.starEligibleShotsRemaining, 4)
  assert.equal(impossibleOverflowCannotScore.reserveBonus, 1_000)

  const objectiveAware = evaluateLevelClear({
    shotsRemaining: 3,
    baseShotBudget: 4,
    bonusShotsGranted: 2,
    bonusShotsRemaining: 2,
    targetsMet: true,
    collapseRatio: 1,
  })
  assert.equal(objectiveAware.stars, 2)
  assert.equal(objectiveAware.shotsRemaining, 3)
  assert.equal(objectiveAware.starEligibleShotsRemaining, 1)
  assert.equal(objectiveAware.reserveBonus, 250)
})

test('objective-aware star rules require elimination and collapse before reserve stars', () => {
  assert.deepEqual(CLEAR_STAR_RULES, {
    twoStarMinimumReserve: 1,
    threeStarMinimumReserve: 2,
    standardThreeStarCollapseRatio: 0.25,
    specialThreeStarCollapseMargin: 0.08,
    clearBonus: 1000,
    reserveBonusPerShot: 250,
  })
  assert.ok(Object.isFrozen(CLEAR_STAR_RULES))

  const targetsRemain = evaluateLevelClear({
    shotsRemaining: 5, remainingTargetCount: 1, collapseRatio: 1, requiredCollapseRatio: 0.5,
  })
  assert.equal(targetsRemain.cleared, false)
  assert.equal(targetsRemain.stars, 0)
  assert.equal(targetsRemain.totalBonus, 0)

  const structureStanding = evaluateLevelClear({
    shotsRemaining: 5, remainingTargetCount: 0, collapseRatio: 0.49, requiredCollapseRatio: 0.5,
  })
  assert.equal(structureStanding.eliminationMet, true)
  assert.equal(structureStanding.collapseMet, false)
  assert.equal(structureStanding.stars, 0)

  assert.equal(evaluateLevelClear({ shotsRemaining: 0, collapseRatio: 0.5, requiredCollapseRatio: 0.5 }).stars, 1)
  assert.equal(evaluateLevelClear({ shotsRemaining: 1, collapseRatio: 0.5, requiredCollapseRatio: 0.5 }).stars, 2)
  assert.equal(evaluateLevelClear({ shotsRemaining: 2, collapseRatio: 0.5, requiredCollapseRatio: 0.5 }).stars, 3)
})

test('every non-special three-star clear requires the configurable structure line', () => {
  const oneStar = evaluateLevelClear({
    shotsRemaining: 0, targetsMet: true, collapseRatio: 0.1, requiredCollapseRatio: 0,
  })
  assert.equal(oneStar.cleared, true)
  assert.equal(oneStar.stars, 1)
  assert.equal(oneStar.threeStarCollapseRatio, 0.25)

  const twoStar = evaluateLevelClear({
    shotsRemaining: 1, targetsMet: true, collapseRatio: 0.1, requiredCollapseRatio: 0,
  })
  assert.equal(twoStar.stars, 2)

  const structureShort = evaluateLevelClear({
    shotsRemaining: 2, targetsMet: true, collapseRatio: 0.249, requiredCollapseRatio: 0,
  })
  assert.equal(structureShort.cleared, true)
  assert.equal(structureShort.stars, 2)
  assert.equal(structureShort.threeStarCollapseMet, false)

  const defaultLineMet = evaluateLevelClear({
    shotsRemaining: 2, targetsMet: true, collapseRatio: 0.25, requiredCollapseRatio: 0,
  })
  assert.equal(defaultLineMet.stars, 3)
  assert.equal(defaultLineMet.threeStarCollapseMet, true)

  assert.equal(evaluateLevelClear({
    shotsRemaining: 2, targetsMet: true, collapseRatio: 0.39, requiredCollapseRatio: 0,
    standardThreeStarCollapseRatio: 0.4,
  }).stars, 2)
  assert.equal(evaluateLevelClear({
    shotsRemaining: 2, targetsMet: true, collapseRatio: 0.4, requiredCollapseRatio: 0,
    standardThreeStarCollapseRatio: 0.4,
  }).stars, 3)

  const authoredHigherLine = evaluateLevelClear({
    shotsRemaining: 2, targetsMet: true, collapseRatio: 0.49, requiredCollapseRatio: 0.5,
  })
  assert.equal(authoredHigherLine.cleared, false)
  assert.equal(authoredHigherLine.threeStarCollapseRatio, 0.5)
})

test('special three-star clears require an eight-point collapse margin', () => {
  const belowMargin = evaluateLevelClear({
    mode: 'special', shotsRemaining: 2, targetsMet: true,
    collapseRatio: 0.729, requiredCollapseRatio: 0.65,
  })
  assert.equal(belowMargin.cleared, true)
  assert.equal(belowMargin.stars, 2)
  assert.equal(belowMargin.threeStarCollapseRatio, 0.73)
  assert.equal(belowMargin.threeStarCollapseMet, false)

  const atMargin = evaluateLevelClear({
    mode: 'special', shotsRemaining: 2, targetsMet: true,
    collapseRatio: 0.73, requiredCollapseRatio: 0.65,
  })
  assert.equal(atMargin.stars, 3)
  assert.equal(atMargin.totalBonus, 1500)
  assert.ok(Object.isFrozen(atMargin))

  const cappedMargin = evaluateLevelClear({
    mode: 'special', shotsRemaining: 3, targetsMet: true,
    collapseRatio: 1, requiredCollapseRatio: 0.96,
  })
  assert.equal(cappedMargin.threeStarCollapseRatio, 1)
  assert.equal(cappedMargin.stars, 3)
  assert.equal(evaluateLevelClear({
    mode: 'special', shotsRemaining: 2, targetsMet: true,
    collapseRatio: 0.65, requiredCollapseRatio: 0.65, specialCollapseMargin: 0,
  }).stars, 3)
})

test('structure wind load varies deterministically by material, mass, dimensions, and orientation', () => {
  assert.ok(Object.isFrozen(STRUCTURE_WIND_RULES))
  assert.ok(Object.isFrozen(STRUCTURE_WIND_RULES.materials.wood))
  const tall = { type: 'wood', width: 20, height: 100, mass: 2, rotation: 0 }
  const repeat = calculateStructureWindLoad(tall, 0.08)
  assert.deepEqual(repeat, calculateStructureWindLoad(tall, 0.08))
  assert.equal(repeat.active, true)
  assert.ok(repeat.forceX > 0)
  assert.ok(repeat.angularAcceleration > 0)
  assert.ok(Object.isFrozen(repeat))

  const reverse = calculateStructureWindLoad(tall, -0.08)
  assert.equal(reverse.forceX, -repeat.forceX)
  assert.equal(reverse.accelerationX, -repeat.accelerationX)
  assert.equal(reverse.angularAcceleration, -repeat.angularAcceleration)

  const heavy = calculateStructureWindLoad({ ...tall, mass: 8 }, 0.08)
  assert.equal(heavy.forceX, repeat.forceX)
  assert.equal(heavy.accelerationX, repeat.accelerationX / 4)
  assert.equal(heavy.angularAcceleration, repeat.angularAcceleration / 4)

  const wide = calculateStructureWindLoad({ ...tall, width: 100, height: 20 }, 0.08)
  assert.ok(repeat.forceX > wide.forceX)
  assert.ok(repeat.angularAcceleration > wide.angularAcceleration * 20)
  const rotated = calculateStructureWindLoad({ ...tall, rotation: 90 }, 0.08)
  assert.ok(Math.abs(rotated.projectedHeight - 20) < 1e-10)
  assert.ok(Math.abs(rotated.projectedWidth - 100) < 1e-10)

  const wood = calculateStructureWindLoad({ ...tall, type: 'wood' }, 0.08)
  const stone = calculateStructureWindLoad({ ...tall, type: 'stone' }, 0.08)
  const ice = calculateStructureWindLoad({ ...tall, type: 'ice' }, 0.08)
  assert.ok(wood.forceX > ice.forceX && ice.forceX > stone.forceX)
  assert.ok(ice.angularAcceleration > wood.angularAcceleration)
  assert.ok(wood.angularAcceleration > stone.angularAcceleration)
})

test('structure wind load safely handles calm, sheltered, and malformed blocks', () => {
  const block = { type: 'wood', width: 26, height: 46, mass: 1.2 }
  assert.equal(calculateStructureWindLoad(block, 0).active, false)
  assert.equal(calculateStructureWindLoad(block, 0.09, { exposure: 0 }).forceX, 0)
  assert.equal(
    calculateStructureWindLoad(block, 0.09, { exposure: 99 }).exposure,
    STRUCTURE_WIND_RULES.maximumExposure,
  )
  const invalid = calculateStructureWindLoad({ type: 'wood', width: 0, height: Number.NaN }, Number.NaN)
  assert.equal(invalid.active, false)
  assert.ok(Object.values(invalid).filter((value) => typeof value === 'number').every(Number.isFinite))
})

test('falling debris requires material-specific drop height and effective impact', () => {
  assert.ok(Object.isFrozen(FALLING_DEBRIS_RULES))
  assert.ok(FALLING_DEBRIS_RULES.wood.minimumFallDistance > FALLING_DEBRIS_RULES.stone.minimumFallDistance)
  assert.ok(FALLING_DEBRIS_RULES.ice.minimumFallDistance > FALLING_DEBRIS_RULES.stone.minimumFallDistance)

  const common = { blockId: 'block-1', targetId: 'squirrel-1', mass: 2 }
  assert.equal(evaluateFallingDebrisDamage({
    ...common, materialType: 'wood', fallDistance: 83.999, impactSpeed: 40,
  }).reason, 'insufficient-fall')
  assert.equal(evaluateFallingDebrisDamage({
    ...common, materialType: 'wood', fallDistance: 84, impactSpeed: 8.499,
  }).reason, 'insufficient-impact')
  const woodBoundary = evaluateFallingDebrisDamage({
    ...common, materialType: 'wood', fallDistance: 84, impactSpeed: 8.5,
  })
  assert.equal(woodBoundary.eligible, true)
  assert.equal(woodBoundary.damage, 1)

  assert.equal(evaluateFallingDebrisDamage({
    ...common, materialType: 'stone', fallDistance: 27.999, impactSpeed: 40,
  }).reason, 'insufficient-fall')
  assert.equal(evaluateFallingDebrisDamage({
    ...common, materialType: 'stone', fallDistance: 28, impactSpeed: 6.499,
  }).reason, 'insufficient-impact')
  const stoneBoundary = evaluateFallingDebrisDamage({
    ...common, materialType: 'stone', fallDistance: 28, impactSpeed: 6.5,
  })
  assert.equal(stoneBoundary.eligible, true)
  assert.equal(stoneBoundary.damage, 1)
  assert.equal(stoneBoundary.consumePair, true)

  const severe = evaluateFallingDebrisDamage({
    ...common, materialType: 'stone', fallDistance: 60, impactSpeed: 15, mass: 2,
  })
  assert.equal(severe.damage, 2)
})

test('falling debris pair keys enforce one damage settlement without consuming harmless touches', () => {
  const pairKey = fallingDebrisHitKey('block-7', 'target-2')
  assert.notEqual(pairKey, fallingDebrisHitKey('block-7', 'target-3'))
  assert.notEqual(fallingDebrisHitKey('a,b', 'c'), fallingDebrisHitKey('a', 'b,c'))
  const settledPairKeys = new Set([pairKey])
  const repeated = evaluateFallingDebrisDamage({
    blockId: 'block-7', targetId: 'target-2', materialType: 'stone',
    fallDistance: 100, impactSpeed: 20, mass: 3, settledPairKeys,
  })
  assert.equal(repeated.reason, 'pair-already-settled')
  assert.equal(repeated.damage, 0)
  assert.equal(repeated.consumePair, false)
  assert.equal(settledPairKeys.size, 1)

  const harmless = evaluateFallingDebrisDamage({
    blockId: 'block-8', targetId: 'target-2', materialType: 'wood',
    fallDistance: 10, impactSpeed: 2, mass: 1,
  })
  assert.equal(harmless.consumePair, false)
  const laterFall = evaluateFallingDebrisDamage({
    blockId: 'block-8', targetId: 'target-2', materialType: 'wood',
    fallDistance: 100, impactSpeed: 10, mass: 1,
  })
  assert.equal(laterFall.eligible, true)
  assert.equal(laterFall.pairKey, harmless.pairKey)

  assert.equal(evaluateFallingDebrisDamage({ materialType: 'wood', fallDistance: 100, impactSpeed: 10 }).reason,
    'missing-pair-id')
  assert.equal(evaluateFallingDebrisDamage({
    blockId: 1, targetId: 2, materialType: 'metal', fallDistance: 100, impactSpeed: 10,
  }).reason, 'unsupported-material')
  assert.throws(() => fallingDebrisHitKey('', 'target'), /blockId/u)
})

test('overview camera keeps generated objectives and structures inside the idle view', () => {
  for (let level = 1; level <= MAIN_LEVELS; level += 1) {
    for (let seed = 1; seed <= 40; seed += 1) {
      const blueprint = generateLevel({ level, seed, mode: 'main' })
      let left = SLING_X - MAX_PULL - 38
      let right = SLING_X + 68
      const include = (x, halfWidth = 0) => {
        left = Math.min(left, x - halfWidth)
        right = Math.max(right, x + halfWidth)
      }
      for (const target of blueprint.targets) include(target.x, target.size * 0.78)
      for (const platform of blueprint.platforms) include(platform.x, platform.width / 2)
      if (blueprint.goldenEgg) include(blueprint.goldenEgg.x, 14)
      const objectiveRight = right
      for (const block of blueprint.blocks) {
        if (block.x - block.width / 2 <= objectiveRight + 180) include(block.x, block.width / 2)
      }
      left -= 28
      right += 54
      const camera = calculateOverviewCamera({ left, right })
      const halfView = VIEWPORT.width / camera.zoom / 2
      assert.ok(camera.x - halfView <= left + 1e-9)
      assert.ok(camera.x + halfView >= right - 1e-9)
    }
  }
  assert.throws(() => calculateOverviewCamera({ left: 5, right: 5 }), /ascending bounds/u)
})

test('default save creation returns independent nested records', () => {
  const first = createDefaultSaveData()
  const second = createDefaultSaveData()
  assert.deepEqual(first, DEFAULT_SAVE_DATA)
  first.ach.first_blood = true
  first.achievementDates.first_blood = '2026-08-25T01:00:00.000Z'
  first.achievementRewardsClaimed.first_blood = true
  first.dailyBest['20260824'] = 100
  first.bestStars['main:1'] = 3
  first.seenStories['main:1'] = true
  first.seenDiscoveries['bird:bomb'] = true
  first.settings.aimGuideMode = 'off'
  assert.deepEqual(second.ach, {})
  assert.deepEqual(second.achievementDates, {})
  assert.deepEqual(second.achievementRewardsClaimed, {})
  assert.deepEqual(second.dailyBest, {})
  assert.deepEqual(second.bestStars, {})
  assert.deepEqual(second.seenStories, {})
  assert.deepEqual(second.seenDiscoveries, {})
  assert.deepEqual(second.settings, {
    aimGuideMode: 'standard',
    shake: true,
    reducedMotion: null,
    skipStory: true,
    musicVolume: AUDIO_VOLUME_DEFAULTS.music,
    sfxVolume: AUDIO_VOLUME_DEFAULTS.sfx,
  })
  assert.equal(second.abilityTutorialSeen, false)
  assert.ok(Object.isFrozen(DEFAULT_SAVE_DATA))
  assert.ok(Object.isFrozen(DEFAULT_SAVE_DATA.ach))
  assert.ok(Object.isFrozen(DEFAULT_SAVE_DATA.achievementDates))
  assert.ok(Object.isFrozen(DEFAULT_SAVE_DATA.achievementRewardsClaimed))
})

test('achievement records keep canonical dates and valid claimed rewards only', () => {
  assert.deepEqual(normalizeAchievementRecords(
    { first_blood: true, combo5: 1, special_all: false, 'bad id': true },
    {
      first_blood: '2026-08-25T09:00:00+08:00',
      combo5: 'not-a-date',
      special_all: '2026-08-25T01:00:00.000Z',
      orphan: '2026-08-25T01:00:00.000Z',
    },
    { first_blood: 'true', combo5: 0, orphan: true },
  ), {
    ach: { first_blood: true, combo5: true },
    achievementDates: { first_blood: '2026-08-25T01:00:00.000Z' },
    achievementRewardsClaimed: { first_blood: true },
  })
})

test('achievement awards pay golden acorns once and record the first unlock time', () => {
  const source = { eggs: 4, ach: {} }
  const first = awardAchievement(source, 'boss_slayer', '2026-08-25T10:30:00+08:00')
  assert.deepEqual(source, { eggs: 4, ach: {} })
  assert.equal(first.unlocked, true)
  assert.equal(first.reward, 2)
  assert.equal(first.achievedAt, '2026-08-25T02:30:00.000Z')
  assert.equal(first.save.eggs, 6)
  assert.equal(first.save.ach.boss_slayer, true)
  assert.equal(first.save.achievementDates.boss_slayer, first.achievedAt)
  assert.equal(first.save.achievementRewardsClaimed.boss_slayer, true)

  const repeated = awardAchievement(first.save, 'boss_slayer', '2027-01-01T00:00:00.000Z')
  assert.equal(repeated.unlocked, false)
  assert.equal(repeated.reward, 0)
  assert.equal(repeated.save.eggs, 6)
  assert.equal(repeated.achievedAt, first.achievedAt)

  const unknown = awardAchievement(first.save, 'not_an_achievement', '2027-01-01T00:00:00.000Z')
  assert.equal(unknown.unlocked, false)
  assert.equal(unknown.reward, 0)
  assert.equal(unknown.save.eggs, 6)
})

test('legacy achievements migrate without invented dates or retroactive rewards', () => {
  const legacy = normalizeSaveData({ eggs: 5, achievements: { first_blood: true } })
  assert.deepEqual(legacy.achievementDates, {})
  assert.deepEqual(legacy.achievementRewardsClaimed, {})

  const repeated = awardAchievement(legacy, 'first_blood', '2026-08-25T00:00:00.000Z')
  assert.equal(repeated.unlocked, false)
  assert.equal(repeated.reward, 0)
  assert.equal(repeated.save.eggs, 5)
  assert.equal(repeated.achievedAt, null)

  const invalidTime = awardAchievement({}, 'daily_win', 'not-a-date')
  assert.equal(invalidTime.unlocked, true)
  assert.equal(Number.isFinite(Date.parse(invalidTime.achievedAt)), true)
  assert.equal(invalidTime.achievedAt, new Date(invalidTime.achievedAt).toISOString())
})

test('normalizeSaveData migrates legacy aliases and sanitizes corrupt fields', () => {
  const legacy = {
    best: {
      highScore: '1234.9',
      maxLevel: '13',
      totalKills: 50,
      goldenEggs: '2',
      expeditionImprints: '3',
      achievements: { first_blood: 1, combo5: 'true', ignored: false },
      achievementDates: {
        first_blood: '2026-08-25T09:00:00+08:00',
        combo5: 'corrupt',
        orphan: '2026-08-25T01:00:00.000Z',
      },
      achievementRewardsClaimed: { first_blood: true, combo5: 'false', orphan: true },
      daily_best: { 20260824: '9000.8', 20260230: 500, invalid: 80, 20260825: -5 },
      soundMuted: 1,
      endless: 'true',
      endlessHighLevel: '9.8',
      tutorialComplete: true,
      abilityTutorialComplete: true,
      seenContent: { 'bird:bomb': true, 'enemy:king': 'true', invalid: true, 'object:ice': false },
      levelStars: { 'main:1': 3, 'main:18': 2, 'daily:20260824': 2, invalid: 3, 'main:2': 9 },
      settings: {
        aimGuide: 'false', shake: 0, skipStory: 'false', musicVolume: '1.7', sfxVolume: '-0.2',
      },
      storyHistory: { 'main:1': true, 'special:bad slug:1': true },
      unknown: 'discard me',
    },
  }

  assert.deepEqual(normalizeSaveData(legacy), {
    score: 1234,
    level: 13,
    endlessBestStage: 9,
    kills: 50,
    eggs: 2,
    imprints: 3,
    ach: { first_blood: true, combo5: true },
    achievementDates: { first_blood: '2026-08-25T01:00:00.000Z' },
    achievementRewardsClaimed: { first_blood: true },
    dailyBest: { 20260824: 9000 },
    muted: true,
    endlessUnlocked: true,
    specialUnlocked: false,
    specialProgress: {},
    tutorialSeen: true,
    abilityTutorialSeen: true,
    seenDiscoveries: { 'bird:bomb': true, 'enemy:king': true },
    bestStars: { 'main:1': 3, 'main:18': 2, 'daily:20260824': 2 },
    seenStories: { 'main:1': true },
    settings: {
      aimGuideMode: 'off',
      shake: false,
      reducedMotion: null,
      skipStory: false,
      musicVolume: 1,
      sfxVolume: 0,
    },
  })
  assert.equal(legacy.best.highScore, '1234.9')
  assert.deepEqual(normalizeSaveData(null), createDefaultSaveData())
  assert.equal(normalizeSaveData({ score: -5, kills: Number.NaN }).score, 0)
  assert.equal(normalizeSaveData({ level: MAIN_LEVELS + 7 }).endlessBestStage, 7)
})

test('expanded campaign saves preserve finale stars without inventing completion achievements', () => {
  const restored = normalizeSaveData({
    level: MAIN_LEVELS,
    endlessUnlocked: false,
    ach: { first_blood: true, unfinished: false },
    bestStars: { [`main:${MAIN_LEVELS}`]: 3 },
  })
  assert.equal(restored.level, 18)
  assert.equal(restored.endlessUnlocked, false)
  assert.deepEqual(restored.ach, { first_blood: true })
  assert.deepEqual(restored.bestStars, { 'main:18': 3 })
})

test('level generation is deterministic without sharing mutable output', () => {
  const options = { level: 8, seed: mixSeed(20260824, 'level', 8), mode: 'main', lucky: true }
  const first = generateLevel(options)
  const second = generateLevel(options)
  assert.deepEqual(first, second)

  first.blocks[0].x = -999
  assert.notEqual(first.blocks[0].x, second.blocks[0].x)
  assert.notDeepEqual(generateLevel({ ...options, seed: options.seed + 1 }), second)
})

test('generated levels keep target and stone guarantees across seeds and difficulty', () => {
  for (let level = 1; level <= 60; level += 1) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const generated = generateLevel({ level, seed, mode: 'daily' })
      const actualStones = generated.blocks.filter((block) => block.type === 'stone').length
      assert.ok(generated.targets.length >= 2, `level ${level}, seed ${seed} has too few targets`)
      assert.equal(actualStones, generated.stoneCount)
      assert.ok(actualStones <= generated.maxStoneCount)
      assert.ok(actualStones / generated.blocks.length <= 0.3)
      assert.ok(generated.blocks.every((block) => BLOCK_MATERIALS[block.type]))
      const nonBossTargets = generated.targets.filter((target) => !target.boss)
      assert.ok(nonBossTargets.length <= MAX_NON_BOSS_TARGETS)
      const nearestTargetX = Math.min(...generated.targets.map((target) => target.x))
      assert.ok(nearestTargetX - SLING_X >= 360, `level ${level}, seed ${seed} starts too close`)
      assert.ok(generated.blocks[0].x >= FORTRESS_START_X - 50)

      const towerCount = Math.min(1 + Math.floor(level / 2), 4)
      if (generated.strongholdTier === 0 && !generated.isBossLevel) {
        for (let tower = 0; tower < towerCount; tower += 1) {
          assert.ok(nonBossTargets.some((target) => (
            target.role === 'ground-guard'
            && target.towerIndex === tower
            && target.y === GROUND_Y - 18
          )), `level ${level}, seed ${seed}, tower ${tower} lost its ground target`)
        }
      }

      const maximumBlockExtent = Math.max(...generated.blocks.map(
        (block) => block.x + block.width / 2,
      ))
      const maximumTargetExtent = Math.max(...generated.targets.map(
        (target) => target.x + target.size,
      ))
      assert.ok(maximumBlockExtent < 1_350, `level ${level}, seed ${seed} blocks exceed world bounds`)
      assert.ok(maximumTargetExtent < 1_350, `level ${level}, seed ${seed} targets exceed world bounds`)
    }
  }
})

test('main moving cover is taught once, then returns in bounded authored sets', () => {
  assert.deepEqual(
    Array.from({ length: MAIN_LEVELS }, (_, index) => generateLevel({ level: index + 1, seed: 3 }).mapType),
    [
      'normal', 'normal', 'normal', 'wind', 'wind', 'wind',
      'normal', 'normal', 'moving', 'normal', 'normal', 'normal',
      'normal', 'wind', 'moving', 'wind', 'moving', 'wind',
    ],
  )

  const calm = generateLevel({ level: 3, seed: 1 })
  const windy = generateLevel({ level: 4, seed: 1 })
  const preTutorial = generateLevel({ level: 8, seed: 1 })
  const moving = generateLevel({ level: 9, seed: 1 })
  assert.equal(calm.windX, 0)
  assert.equal(Math.abs(windy.windX), levelWindMagnitude('main', 4))
  assert.equal(windy.platforms.length, 0)
  assert.equal(preTutorial.platforms.length, 0)
  assert.equal(moving.windX, 0)
  assert.equal(moving.platforms.length, 1)
  assert.deepEqual(moving.platforms.map((platform) => platform.velocityY), [1])
  assert.deepEqual(MOVING_PLATFORM_RULES.mainCounts, { 9: 1, 15: 2, 17: 3 })
})

test('main and endless moving platforms keep their complete travel envelopes clear of structures and targets', () => {
  const scenarios = [
    {
      mode: 'main',
      levels: Array.from({ length: MAIN_LEVELS }, (_, index) => index + 1),
    },
    {
      mode: 'endless',
      levels: Array.from({ length: 120 }, (_, index) => MAIN_LEVELS + index + 1),
    },
  ]
  const seeds = [1, 2, 7, 19, 41, 0xffff_ffff]
  const platformCounts = { main: 0, endless: 0 }

  for (const scenario of scenarios) {
    for (const level of scenario.levels) {
      for (const seed of seeds) {
        const generated = generateLevel({ level, seed, mode: scenario.mode })
        for (let platformIndex = 0; platformIndex < generated.platforms.length; platformIndex += 1) {
          const platform = generated.platforms[platformIndex]
          const label = `${scenario.mode}-${level}/seed-${seed}/platform-${platformIndex}`
          const envelope = verticalPlatformMotionEnvelope(platform, 8)
          platformCounts[scenario.mode] += 1

          assert.equal(platform.affectsStructures, false, `${label}: platform can move structures`)
          assert.ok(generated.blocks.every((block) => !rectsOverlap(envelope, block)),
            `${label}: travel envelope intersects a building block`)
          assert.ok(generated.targets.every((target) => !circleIntersectsRect({
            x: target.x,
            y: target.y,
            radius: target.size * 0.78 + 8,
          }, envelope)), `${label}: travel envelope intersects a target`)
          assert.ok(generated.platforms.slice(0, platformIndex).every((other) => (
            !rectsOverlap(envelope, verticalPlatformMotionEnvelope(other, 8))
          )), `${label}: travel envelope intersects another moving platform`)

          const endpointHeight = platform.height + 16
          const expectedTop = Math.min(platform.minY, platform.maxY) - endpointHeight / 2
          const expectedBottom = Math.max(platform.minY, platform.maxY) + endpointHeight / 2
          const envelopeBounds = rotatedRectBounds(envelope)
          assert.ok(Math.abs(envelopeBounds.top - expectedTop) < 1e-9,
            `${label}: envelope omits its upper endpoint clearance`)
          assert.ok(Math.abs(envelopeBounds.bottom - expectedBottom) < 1e-9,
            `${label}: envelope omits its lower endpoint clearance`)
        }
      }
    }
  }

  assert.ok(platformCounts.main > 0, 'main campaign sample did not exercise moving platforms')
  assert.ok(platformCounts.endless > 0, 'endless sample did not exercise moving platforms')
})

test('endless moving cover unlocks at depth 12 and grows from one to four on a fixed cadence', () => {
  const profileAt = (depth) => movingPlatformProfileForLevel('endless', MAIN_LEVELS + depth)
  assert.deepEqual(profileAt(11), {
    active: false, count: 0, interval: null, tierMinimumDepth: null,
  })
  assert.deepEqual(profileAt(12), {
    active: true, count: 1, interval: 5, tierMinimumDepth: 12,
  })
  assert.equal(profileAt(13).count, 0)
  assert.deepEqual(profileAt(30), {
    active: true, count: 2, interval: 4, tierMinimumDepth: 30,
  })
  assert.deepEqual(profileAt(60), {
    active: true, count: 3, interval: 3, tierMinimumDepth: 60,
  })
  assert.deepEqual(profileAt(100), {
    active: true, count: 4, interval: 2, tierMinimumDepth: 100,
  })

  for (const depth of [12, 17, 30, 34, 60, 63, 100, 102]) {
    const expected = profileAt(depth).count
    for (const seed of [1, 91, 0xffff_ffff]) {
      const generated = generateLevel({ mode: 'endless', level: MAIN_LEVELS + depth, seed })
      assert.equal(generated.platforms.length, expected, `depth ${depth}, seed ${seed}`)
      assert.deepEqual(generated.movingPlatformProfile, profileAt(depth))
      assert.equal(generated.mapType, 'moving')
    }
  }
  assert.ok(Object.isFrozen(MOVING_PLATFORM_RULES))
})

test('every endless floor keeps the authored moving-cover profile and generated platforms in lockstep', () => {
  for (let depth = 1; depth <= 200; depth += 1) {
    const tier = [...MOVING_PLATFORM_RULES.endlessTiers]
      .reverse()
      .find((candidate) => depth >= candidate.minimumDepth)
    const expectedActive = Boolean(
      tier && (depth - tier.minimumDepth) % tier.interval === 0,
    )
    const expectedCount = expectedActive ? tier.count : 0
    const expectedProfile = {
      active: expectedActive,
      count: expectedCount,
      interval: tier?.interval ?? null,
      tierMinimumDepth: tier?.minimumDepth ?? null,
    }
    const level = MAIN_LEVELS + depth
    const profile = movingPlatformProfileForLevel('endless', level)
    const generated = generateLevel({ mode: 'endless', level, seed: 31 })

    assert.deepEqual(profile, expectedProfile, `depth ${depth}: cadence profile`)
    assert.deepEqual(generated.movingPlatformProfile, expectedProfile,
      `depth ${depth}: generated profile`)
    assert.equal(generated.platforms.length, expectedCount,
      `depth ${depth}: moving platform count`)
    assert.equal(generated.mapType === 'moving', expectedActive,
      `depth ${depth}: moving map activation`)
  }
})

test('the final six main stages form a bounded authored difficulty ramp', () => {
  const expected = {
    13: { targets: 6, birds: 5, platforms: 0, wind: 0 },
    14: { targets: 7, birds: 6, platforms: 0, wind: 0.075 },
    15: { targets: 8, birds: 7, platforms: 2, wind: 0 },
    16: { targets: 9, birds: 8, platforms: 0, wind: 0.085 },
    17: { targets: 6, birds: 9, platforms: 3, wind: 0 },
    18: { targets: 7, birds: 10, platforms: 0, wind: 0.09 },
  }
  const seeds = [...Array.from({ length: 60 }, (_, index) => index + 1), 0xffff_ffff]

  for (let level = 13; level <= MAIN_LEVELS; level += 1) {
    for (const seed of seeds) {
      const generated = generateLevel({ level, seed, mode: 'main' })
      const rule = expected[level]
      assert.equal(generated.targets.length, rule.targets, `level ${level}, seed ${seed} target count`)
      assert.equal(generated.birdsAvailable, rule.birds, `level ${level}, seed ${seed} reserves`)
      assert.equal(generated.platforms.length, rule.platforms, `level ${level}, seed ${seed} platform count`)
      assert.ok(Math.abs(Math.abs(generated.windX) - rule.wind) < 1e-12)
      assert.ok(generated.targets.length <= MAX_NON_BOSS_TARGETS)
      const totalObjectiveHp = generated.targets.reduce((sum, target) => sum + target.hp, 0)
      const effectiveDirectDamageBudget = (generated.birdsAvailable + 1) * 2
      assert.ok(
        effectiveDirectDamageBudget >= totalObjectiveHp,
        `level ${level}, seed ${seed} lacks ability-adjusted direct damage budget`,
      )

      const maximumBlockExtent = Math.max(...generated.blocks.map(
        (block) => block.x + block.width / 2,
      ))
      const maximumTargetExtent = Math.max(...generated.targets.map(
        (target) => target.x + target.size,
      ))
      // Authored late landmarks and asymmetric roofs may extend beyond the
      // old generic 1350px stack cap, but remain inside the 1400px encounter
      // composition envelope.
      assert.ok(maximumBlockExtent < 1_400)
      assert.ok(maximumTargetExtent < 1_350)
      const physicalBlocks = generated.blocks.map((block, index) => ({
        ...block,
        id: `late-ramp-${level}-${seed}-${index}`,
      }))
      const joints = buildStructureJoints(physicalBlocks, {
        allowedKinds: structureJointKindsForLevel('main', level),
        desiredCounts: structureJointCountsForLevel('main', level),
      })
      assert.equal(analyzeStructureStability(
        physicalBlocks,
        generated.platforms,
        { joints },
      ).unstableIds.size, 0)
    }
  }

  const lateWind = generateLevel({ level: 16, seed: 9, mode: 'main' })
  assert.equal(lateWind.mapType, 'wind')
  assert.notEqual(lateWind.windX, 0)
  assert.equal(lateWind.platforms.length, 0)
})

test('late authored layouts replace family trusses with their exact physical module inventory', () => {
  for (const level of [13, 14, 15, 16, 17, 18]) {
    const generated = generateLevel({ level, seed: 11, mode: 'main' })
    const plan = generated.architectureBlueprint.buildingPlan
    const modules = generated.blocks.filter((block) => block.physicalModuleId)
    assert.ok(plan.physicalLayout)
    assert.equal(modules.length, plan.physicalModules.length)
    assert.deepEqual(
      new Set(modules.map((block) => block.physicalModuleId)),
      new Set(plan.physicalModules.map((descriptor) => descriptor.id)),
    )
    assert.equal(generated.blocks.filter((block) => block.moduleKind === 'tri-truss').length, 0)
    assert.ok(modules.every((block) => (
      block.familyPart === 'authored-physical-layout'
      && ['authored-building-mass', 'authored-building-span'].includes(block.moduleKind)
      && block.hp > 0 && block.mass > 0
    )))
    assert.equal(
      generated.stoneCount,
      generated.blocks.filter((block) => block.type === 'stone').length,
    )
    assert.ok(generated.stoneCount <= generated.maxStoneCount)
  }
})

test('late main and endless stages become bounded connected structure families', () => {
  assert.equal(strongholdTierForLevel('main', 12), 0)
  assert.equal(strongholdTierForLevel('main', 13), 1)
  assert.equal(strongholdTierForLevel('main', 15), 2)
  assert.equal(strongholdTierForLevel('main', 17), 3)
  assert.equal(strongholdTierForLevel('endless', MAIN_LEVELS + 9), 0)
  assert.equal(strongholdTierForLevel('endless', MAIN_LEVELS + 10), 1)
  assert.equal(strongholdTierForLevel('endless', MAIN_LEVELS + 30), 2)
  assert.equal(strongholdTierForLevel('endless', MAIN_LEVELS + 50), 3)

  for (const [mode, levels] of [
    ['main', [13, 15, 17, 18]],
    ['endless', [MAIN_LEVELS + 10, MAIN_LEVELS + 31, MAIN_LEVELS + 51, MAIN_LEVELS + 100]],
  ]) {
    for (const level of levels) {
      for (const seed of [1, 7, 39, 0xffff_ffff]) {
        const generated = generateLevel({ level, seed, mode })
        assert.equal(generated.fortressStyle, generated.structureFamily.id)
        assert.ok(Object.values(STRUCTURE_FAMILY_RULES.ids).includes(generated.fortressStyle))
        const physicalModules = generated.architectureBlueprint?.buildingPlan?.physicalModules || []
        if (physicalModules.length) {
          assert.equal(
            generated.blocks.filter((block) => block.physicalModuleId).length,
            physicalModules.length,
          )
        } else {
          assert.ok(generated.blocks.length >= 30)
        }
        assert.ok(generated.blocks.length <= STRONGHOLD_RULES.maximumPhysicalBlocks)
        assert.ok(generated.blocks.some((block) => block.type === 'stone' && block.width > 26))
        const physicalBlocks = generated.blocks.map((block, index) => ({
          ...block,
          id: `bounded-${mode}-${level}-${seed}-${index}`,
        }))
        const joints = buildStructureJoints(physicalBlocks, {
          allowedKinds: structureJointKindsForLevel(mode, level),
          desiredCounts: structureJointCountsForLevel(mode, level),
        })
        assert.equal(analyzeStructureStability(
          physicalBlocks,
          generated.platforms,
          { joints },
        ).unstableIds.size, 0)
        assert.ok(generated.platforms.every((platform) => (
          platform.affectsStructures === false
          && generated.blocks.every((block) => !rectsOverlap(platform, block))
        )))
      }
    }
  }

  const endlessOuter = generateLevel({ level: MAIN_LEVELS + 11, seed: 4, mode: 'endless' })
  const endlessInner = generateLevel({ level: MAIN_LEVELS + 31, seed: 4, mode: 'endless' })
  const endlessCore = generateLevel({ level: MAIN_LEVELS + 51, seed: 4, mode: 'endless' })
  assert.equal(endlessOuter.targets.length, 7)
  assert.equal(endlessInner.targets.length, 8)
  assert.equal(endlessCore.targets.length, 9)
})

test('every story and sampled endless encounter is one stable complete building within the body budget', () => {
  const seeds = [1, 20260828]
  const scenarios = [
    ...Array.from({ length: MAIN_LEVELS }, (_, index) => ({
      mode: 'main', level: index + 1, label: `main-${index + 1}`,
    })),
    ...[1, 10, 30, 50, 80, 120, 200].map((depth) => ({
      mode: 'endless', level: MAIN_LEVELS + depth, label: `endless-${depth}`,
    })),
  ]

  for (const scenario of scenarios) {
    for (const seed of seeds) {
      const generated = generateLevel({
        mode: scenario.mode,
        level: scenario.level,
        seed,
      })
      const label = `${scenario.label}/seed-${seed}`
      const plan = generated.architectureBlueprint?.buildingPlan
      assert.ok(plan?.completeBuilding, `${label}: missing complete-building plan`)
      assert.ok(plan.formId && plan.name && plan.structuralSystem,
        `${label}: incomplete building identity`)
      assert.ok(plan.appliedComplexity >= plan.complexity,
        `${label}: runtime complexity regressed below its authored plan`)
      assert.ok(generated.blocks.length <= STRONGHOLD_RULES.maximumPhysicalBlocks,
        `${label}: ${generated.blocks.length} bodies exceed the physics budget`)
      assert.ok(generated.blocks.every((block) => (
        block.completeBuilding === true
        && block.buildingFormId === plan.formId
        && block.buildingStructuralSystem === plan.structuralSystem
        && Number.isFinite(block.buildingComplexity)
      )), `${label}: a physical body escaped the complete-building identity`)

      const explicitLayout = Array.isArray(plan.physicalModules) && plan.physicalModules.length > 0
      const authoredPieces = generated.blocks.filter((block) => explicitLayout
        ? Boolean(block.physicalModuleId)
        : ['complete-building-envelope', 'complete-building-connection']
          .includes(block.moduleKind))
      assert.equal(authoredPieces.length, plan.envelopePieceCount,
        `${label}: reported complete-building piece count differs from physical bodies`)
      assert.ok(authoredPieces.length >= 1,
        `${label}: no physical envelope, sill, wall, or gallery exists`)
      assert.ok(authoredPieces.every((block) => {
        if (!block.moduleId?.startsWith(`complete-building:${scenario.mode}:`)) return false
        if (explicitLayout) {
          const descriptor = plan.physicalModules.find((entry) => (
            entry.id === block.physicalModuleId
          ))
          return Boolean(descriptor)
            && block.physicalModuleKind === descriptor.kind
            && block.physicalModuleClass === descriptor.moduleClass
            && block.physicalRole === descriptor.role
            && block.type === descriptor.material
            && block.completeBuildingMassId === descriptor.massId
            && block.completeBuildingMassKind === descriptor.massKind
            && Number.isFinite(block.completeBuildingXRatio)
            && ['authored-building-mass', 'authored-building-span'].includes(block.moduleKind)
        }
        if (block.moduleKind === 'complete-building-envelope') {
          return ['ground-wall', 'ground-sill', 'solid-bay-wall'].includes(block.modulePart)
            && ['facade-panel', 'frame-sill'].includes(block.role)
            && (block.modulePart !== 'solid-bay-wall' || block.consolidatedStorey === true)
        }
        if (block.modulePart === 'monolithic-carrier') {
          return block.supportTowers?.length >= 2
            && ['building-carrier', 'roof'].includes(block.role)
            && block.structuralSpine === true
            && block.critical !== true
            && [
              'windmill-gallery', 'continuous-roadway', 'machine-transfer-beam',
              'citadel-cornice', 'long-timber-carrier',
            ].includes(block.connectionKind)
        }
        return Number.isInteger(block.gapIndex)
          && block.supportTowers?.length === 2
          && ['high-gallery', 'gate-superstructure', 'curtain-rise']
            .includes(block.connectionKind)
          && ['building-span', 'building-wall', 'gate-roof'].includes(block.role)
      }), `${label}: complete-building pieces lack authored module metadata`)

      const physicalBlocks = generated.blocks.map((block, index) => ({
        ...block,
        id: `complete-building-${index}`,
      }))
      const joints = buildStructureJoints(physicalBlocks, {
        allowedKinds: structureJointKindsForLevel(scenario.mode, scenario.level),
        desiredCounts: structureJointCountsForLevel(scenario.mode, scenario.level),
      })
      const stability = analyzeStructureStability(
        physicalBlocks,
        generated.platforms,
        { joints },
      )
      assert.equal(stability.unstableIds.size, 0,
        `${label}: complete building starts with unsupported bodies`)

      for (const envelope of authoredPieces) {
        for (const other of generated.blocks) {
          if (other === envelope) continue
          const manifold = rectCollisionManifold(envelope, other)
          assert.ok(!manifold || manifold.overlap <= 0.12,
            `${label}: ${envelope.moduleId} penetrates ${other.moduleKind || other.role}`
            + ` by ${manifold?.overlap}`)
        }
      }
    }
  }
})

test('explicit complete-building layouts contain no legacy tower-storey bodies', () => {
  for (const seed of [1, 20260828]) {
    for (const level of [13, 14, 15, 16, 17, 18]) {
      const generated = generateLevel({ mode: 'main', level, seed })
      const modules = generated.blocks.filter((block) => block.physicalModuleId)
      assert.equal(modules.length, generated.architectureBlueprint.buildingPlan.physicalModules.length)
      assert.equal(generated.blocks.filter((block) => (
        ['post', 'lintel'].includes(block.role)
        || ['tri-truss', 'complete-building-envelope', 'complete-building-connection']
          .includes(block.moduleKind)
      )).length, 0, `main-${level}/seed-${seed}: legacy tower grammar survived replacement`)
      assert.ok(modules.every((block) => (
        block.physicalLayoutVersion === 'normalized-rect-v1'
        && block.physicalGrammar === generated.architectureBlueprint.buildingPlan.physicalLayout.grammar
      )))
    }
  }
})

test('every non-boss guard in an explicit physical layout rests on ground or a real module top', () => {
  const scenarios = [
    ...[13, 14, 15, 16, 17, 18].map((level) => ({ mode: 'main', level })),
    ...[20, 30, 40, 50, 75, 100].map((depth) => ({
      mode: 'endless', level: MAIN_LEVELS + depth,
    })),
  ]
  for (const scenario of scenarios) {
    for (const seed of [1, 7, 20260828]) {
      const generated = generateLevel({ ...scenario, seed })
      const label = `${scenario.mode}-${scenario.level}/seed-${seed}`
      assert.ok(generated.architectureBlueprint.buildingPlan.physicalModules.length > 0,
        `${label}: encounter did not select an explicit layout`)
      for (const target of generated.targets.filter((candidate) => !candidate.boss)) {
        const radius = target.size * 0.78
        const bottom = target.y + radius
        const grounded = Math.abs(bottom - GROUND_Y) <= 1e-6
        const supportedByModule = generated.blocks.some((block) => {
          const bounds = rotatedRectBounds(block)
          return Math.abs(bottom - bounds.top) <= 1e-6
            && target.x - radius >= bounds.left - 1e-6
            && target.x + radius <= bounds.right + 1e-6
        })
        assert.ok(grounded || supportedByModule,
          `${label}: non-boss target at ${target.x},${target.y} is suspended`)
        assert.ok(generated.blocks.every((block) => {
          const manifold = circleRectCollisionManifold({
            x: target.x, y: target.y, radius,
          }, block)
          return !manifold || manifold.overlap <= 1e-6
        }), `${label}: supported target penetrates a module`)
      }
    }
  }
})

test('authored late story bosses stand on their explicit open-court marker', () => {
  for (const level of [17, 18]) {
    for (const seed of [1, 11, 20260828]) {
      const generated = generateLevel({ mode: 'main', level, seed })
      const marker = generated.blocks.find((block) => (
        block.physicalFeature === 'open-boss-court'
      ))
      const boss = generated.targets.find((target) => target.boss)
      assert.ok(marker && boss)
      assert.equal(boss.x, marker.x)
      assert.ok(Math.abs(
        boss.y + boss.size * 0.78 - rotatedRectBounds(marker).top,
      ) <= 1e-9)
      assert.ok(generated.blocks.every((block) => {
        const manifold = circleRectCollisionManifold({
          x: boss.x, y: boss.y, radius: boss.size * 0.78,
        }, block)
        return !manifold || manifold.overlap <= 1e-6
      }))
    }
  }
})

test('each late chapter instantiates every required building kind as a real collider', () => {
  for (const seed of [1, 20260828]) {
    for (const level of [13, 14, 15, 16, 17, 18]) {
      const generated = generateLevel({ mode: 'main', level, seed })
      const label = `main-${level}/seed-${seed}`
      const plan = generated.architectureBlueprint.buildingPlan
      const modules = generated.blocks.filter((block) => block.physicalModuleId)
      const actualKinds = new Set(modules.map((block) => block.physicalModuleKind))
      for (const requiredKind of plan.physicalLayout.requiredKinds) {
        assert.ok(actualKinds.has(requiredKind), `${label}: missing physical ${requiredKind}`)
      }
      assert.equal(modules.length, plan.physicalModules.length)
      assert.ok(modules.every((block) => (
        block.width > 0 && block.height > 0 && block.hp > 0 && block.mass > 0
        && Number.isFinite(block.x) && Number.isFinite(block.y)
        && Number.isInteger(block.towerIndex)
      )), `${label}: authored descriptor did not become a physical body`)
    }
  }
})

test('terminal royal city is a physical keep, throne court, domed granary, and two guard towers', () => {
  const generated = generateLevel({ mode: 'main', level: 18, seed: 20260828 })
  const modules = generated.blocks.filter((block) => block.physicalModuleId)
  const byKind = (kind) => modules.filter((block) => block.physicalModuleKind === kind)
  assert.ok(generated.blocks.length <= STRONGHOLD_RULES.maximumPhysicalBlocks)
  assert.equal(modules.length, 20)
  assert.equal(byKind('guard-tower').length, 2)
  assert.equal(byKind('citadel-keep-pier').length, 2)
  assert.equal(byKind('citadel-upper-keep').length, 1)
  assert.equal(byKind('granary-wall').length, 2)
  assert.equal(byKind('granary-dome-course').length, 2)
  assert.equal(byKind('royal-granary-gate').length, 1)
  assert.equal(byKind('boss-forecourt-threshold').length, 1)
  assert.ok(byKind('citadel-wall-link').every((block) => block.structuralSpine))

  const boss = generated.targets.find((target) => target.boss)
  const threshold = byKind('boss-forecourt-threshold')[0]
  assert.equal(generated.bossCourtyard.physicalLayout, true)
  assert.equal(generated.bossCourtyard.centerX, threshold.x)
  assert.ok(Math.abs(boss.y + boss.size * 0.78 - rotatedRectBounds(threshold).top) <= 1e-6)
  assert.ok(generated.blocks.every((block) => {
    const manifold = circleRectCollisionManifold({
      x: boss.x, y: boss.y, radius: boss.size * 0.78,
    }, block)
    return !manifold || manifold.overlap <= 1e-6
  }))

  const physicalBlocks = generated.blocks.map((block, index) => ({ ...block, id: `final-${index}` }))
  const joints = buildStructureJoints(physicalBlocks, {
    allowedKinds: structureJointKindsForLevel('main', 18),
    desiredCounts: structureJointCountsForLevel('main', 18),
  })
  assert.equal(analyzeStructureStability(
    physicalBlocks, generated.platforms, { joints },
  ).unstableIds.size, 0)
})

test('late physical bays follow authored silhouette masses and the outer castle keeps its central gate', () => {
  const expectedMassKinds = new Map([
    [13, ['viaduct-pier']],
    [14, ['redoubt-tower']],
    [15, ['castle-corner-tower', 'great-gatehouse']],
    [16, ['wind-engine-tower', 'drawbridge-gatehouse', 'counterweight-tower']],
    [17, ['low-forecourt-wall', 'stone-arcade-gallery', 'command-keep']],
    [18, ['royal-guard-tower', 'great-citadel-keep', 'domed-royal-granary']],
  ])
  for (const seed of [1, 7, 31, 91, 20260828, 0xffff_ffff]) {
    for (const [level, requiredKinds] of expectedMassKinds) {
      const generated = generateLevel({ mode: 'main', level, seed })
      const kinds = new Set(generated.blocks
        .map((block) => block.completeBuildingMassKind)
        .filter(Boolean))
      for (const kind of requiredKinds) {
        assert.ok(kinds.has(kind), `main-${level}/seed-${seed}: missing ${kind}`)
      }
      assert.ok(generated.blocks
        .filter((block) => block.physicalModuleId)
        .every((block) => Number.isFinite(block.completeBuildingXRatio)))
    }
    const barbican = generateLevel({ mode: 'main', level: 15, seed })
    const gatePieces = barbican.blocks.filter((block) => (
      block.completeBuildingMassId === 'central-gatehouse'
    ))
    assert.equal(gatePieces.length, 6)
    const lintel = gatePieces.find((block) => block.physicalModuleKind === 'great-gate-lintel')
    const portcullis = gatePieces.find((block) => block.physicalModuleKind === 'portcullis')
    assert.ok(lintel && portcullis)
    assert.equal(lintel.completeBuildingXRatio, 0.5)
    assert.equal(portcullis.completeBuildingXRatio, 0.5)
    assert.ok(lintel.width > portcullis.width,
      `main-15/seed-${seed}: central gate is not a real wide opening`)
  }
})

test('late compounds form one authored physical graph instead of four labelled tower stacks', () => {
  for (const scenario of [
    ...[13, 14, 15, 16, 17, 18].map((level) => ({ mode: 'main', level })),
    ...[50, 80, 120, 200].map((depth) => ({
      mode: 'endless', level: MAIN_LEVELS + depth,
    })),
  ]) {
    for (const seed of [1, 20260828]) {
      const generated = generateLevel({ ...scenario, seed })
      const plan = generated.architectureBlueprint.buildingPlan
      if (!plan.physicalModules?.length) continue
      const label = `${scenario.mode}-${scenario.level}/seed-${seed}`
      const blocks = generated.blocks.map((block, index) => ({
        ...block,
        id: `authored-graph-${index}`,
      }))
      const modules = blocks.filter((block) => block.physicalModuleId)
      const joints = buildStructureJoints(blocks, {
        allowedKinds: structureJointKindsForLevel(scenario.mode, scenario.level),
        desiredCounts: structureJointCountsForLevel(scenario.mode, scenario.level),
      })
      const moduleKeys = new Set(modules.map((block) => block.id))
      const neighbours = new Map(modules.map((block) => [block.id, new Set()]))
      for (const joint of joints.filter((entry) => (
        moduleKeys.has(entry.firstId) && moduleKeys.has(entry.secondId)
      ))) {
        neighbours.get(joint.firstId).add(joint.secondId)
        neighbours.get(joint.secondId).add(joint.firstId)
      }
      const visited = new Set([modules[0].id])
      const queue = [modules[0].id]
      while (queue.length) {
        const id = queue.shift()
        for (const neighbour of neighbours.get(id)) {
          if (visited.has(neighbour)) continue
          visited.add(neighbour)
          queue.push(neighbour)
        }
      }
      assert.equal(visited.size, modules.length, `${label}: authored building is disconnected`)
      assert.ok(joints.some((joint) => joint.authoredBuildingBond),
        `${label}: connected facade has no finite physical bonds`)
      assert.equal(analyzeStructureStability(
        blocks, generated.platforms, { joints },
      ).unstableIds.size, 0, `${label}: authored building begins unstable`)
      for (let first = 0; first < modules.length; first += 1) {
        for (let second = first + 1; second < modules.length; second += 1) {
          const manifold = rectCollisionManifold(modules[first], modules[second])
          assert.ok(!manifold || manifold.overlap <= 0.12,
            `${label}: ${modules[first].physicalModuleId}/${modules[second].physicalModuleId}`
              + ` penetrate by ${manifold?.overlap}`)
        }
      }
      const boss = generated.targets.find((target) => target.boss)
      if (boss) {
        const bossCircle = { x: boss.x, y: boss.y, radius: boss.size * 0.78 }
        assert.ok(modules.every((block) => {
          const manifold = circleRectCollisionManifold(bossCircle, block)
          return !manifold || manifold.overlap <= 1e-6
        }), `${label}: boss begins inside an authored collider`)
      }
    }
  }
  return

  const crossTowerRoles = new Set([
    'bridge-span',
    'long-beam',
    'wall-panel',
    'gate-cap',
    'citadel-gate-column',
    'citadel-gate-beam',
    'citadel-keystone',
    'outer-rock-buttress',
  ])
  const crossTowerModuleKinds = new Set([
    'asymmetric-bridge',
    'long-beam',
    'wall-panel',
    'wall-panel-cap',
    'royal-upper-curtain',
    'royal-upper-curtain-cap',
    'royal-gatehouse',
    'complete-building-connection',
    'rock-silhouette-buttress',
  ])
  const coveredTowerGaps = (block, towerCount) => {
    let firstTower
    let secondTower
    if (Array.isArray(block.supportTowers) && block.supportTowers.length >= 2) {
      firstTower = Math.min(...block.supportTowers)
      secondTower = Math.max(...block.supportTowers)
    } else if (Number.isInteger(block.gapIndex)
      && (crossTowerRoles.has(block.role) || crossTowerModuleKinds.has(block.moduleKind))) {
      firstTower = block.gapIndex
      secondTower = block.gapIndex + 1
    } else return []
    const gaps = []
    for (let gap = firstTower; gap < secondTower; gap += 1) {
      if (gap >= 0 && gap < towerCount - 1) gaps.push(gap)
    }
    return gaps
  }
  const physicalGateClearance = (blocks) => {
    const columnsByGap = new Map()
    for (const block of blocks.filter((entry) => entry.role === 'citadel-gate-column')) {
      const columns = columnsByGap.get(block.gapIndex) || []
      columns.push(block)
      columnsByGap.set(block.gapIndex, columns)
    }
    let maximum = 0
    for (const columns of columnsByGap.values()) {
      if (columns.length < 2) continue
      columns.sort((first, second) => first.x - second.x)
      const left = rotatedRectBounds(columns[0])
      const right = rotatedRectBounds(columns.at(-1))
      maximum = Math.max(maximum, right.left - left.right)
    }
    return maximum
  }
  const scenarios = [
    ...[13, 14, 15, 16, 17, 18].map((level) => ({
      mode: 'main', level, progression: level,
    })),
    ...[50, 80, 120, 200].map((depth) => ({
      mode: 'endless', level: MAIN_LEVELS + depth, progression: depth,
    })),
  ]

  for (const scenario of scenarios) {
    for (const seed of [1, 20260828]) {
      const generated = generateLevel({ ...scenario, seed })
      const label = `${scenario.mode}-${scenario.progression}/seed-${seed}`
      const towerCount = generated.structureFamily.towerCount
      const crossTowerBlocks = generated.blocks.filter((block) => (
        coveredTowerGaps(block, towerCount).length > 0
      ))
      const monolithicCarriers = crossTowerBlocks.filter((block) => (
        block.modulePart === 'monolithic-carrier'
          || block.supportTowers?.length > 2
      ))
      // A whole-width beam is useful structure, but it cannot let four
      // otherwise independent tower stacks masquerade as one authored keep.
      // Every non-courtyard gap still needs a local wall, gate, bridge, or
      // gallery belonging to that neighbouring tower pair.
      const localCrossTowerBlocks = crossTowerBlocks.filter((block) => (
        !monolithicCarriers.includes(block)
          && !['citadel-gate-column', 'outer-rock-buttress'].includes(block.role)
      ))
      // Viaduct roadways and engineered transfer decks are complete spans by
      // definition: their towers are piers, not four miniature keeps. Dense
      // castles and redoubts still need local walls/gates/galleries in every
      // bay so the full-width cornice cannot disguise repeated stacks.
      const compositionDefiningCarriers = monolithicCarriers.filter((block) => (
        ['continuous-roadway', 'machine-transfer-beam', 'windmill-gallery', 'long-timber-carrier']
          .includes(block.connectionKind)
      ))
      const locallyCoveredGaps = new Set([
        ...localCrossTowerBlocks,
        ...compositionDefiningCarriers,
      ].flatMap((block) => (
        coveredTowerGaps(block, towerCount)
      )))
      const requiredGaps = Array.from({ length: towerCount - 1 }, (_, gap) => gap)
        .filter((gap) => gap !== generated.bossCourtyard?.gapIndex)
      const missingGaps = requiredGaps.filter((gap) => !locallyCoveredGaps.has(gap))
      assert.deepEqual(missingGaps, [],
        `${label}: independent tower gaps remain at ${missingGaps.join(', ')}; `
          + 'a monolithic carrier cannot be the only connection')

      for (const carrier of monolithicCarriers) {
        const carrierBounds = rotatedRectBounds(carrier)
        const declaredSupports = [...new Set(carrier.supportTowers || [])].sort()
        const bearingSupports = declaredSupports.filter((towerIndex) => (
          generated.blocks.some((block) => {
            if (block === carrier || block.towerIndex !== towerIndex) return false
            const blockBounds = rotatedRectBounds(block)
            const horizontalBearing = Math.min(blockBounds.right, carrierBounds.right)
              - Math.max(blockBounds.left, carrierBounds.left)
            return Math.abs(blockBounds.top - carrierBounds.bottom) <= 3
              && horizontalBearing > 0.25
          })
        ))
        assert.deepEqual(bearingSupports, declaredSupports,
          `${label}: whole-building carrier declares tower support without physical bearing`)
      }

      const groundedConnectorGaps = new Set(crossTowerBlocks.flatMap((block) => {
        const grounded = Math.abs(rotatedRectBounds(block).bottom - GROUND_Y) <= 3
        return grounded ? coveredTowerGaps(block, towerCount) : []
      }))
      const minimumGroundedConnections = scenario.mode === 'main' && scenario.level < 15
        ? 1
        : Math.min(2, requiredGaps.length)
      assert.ok(groundedConnectorGaps.size >= minimumGroundedConnections,
        `${label}: only ${groundedConnectorGaps.size} tower gaps have a continuous grounded wall base`)

      const roofs = generated.blocks.filter((block) => block.role === 'roof')
      const roofHeightBands = new Set(roofs.map((block) => (
        Math.round(rotatedRectBounds(block).top / 12)
      )))
      const roofForms = new Set(roofs
        .map((block) => block.completeBuildingTowerForm)
        .filter(Boolean))
      for (const segment of generated.architectureBlueprint?.buildingPlan
        ?.silhouetteSpec?.roofSegments || []) {
        if (segment.kind) roofForms.add(`authored:${segment.kind}`)
      }
      assert.ok(roofHeightBands.size >= 2,
        `${label}: all roofs collapse to one repeated tower height`)
      assert.ok(roofForms.size >= 2,
        `${label}: all towers reuse one building form`)

      const hasMonumentalSpan = generated.blocks.some((block) => (
        Math.abs(block.rotation || 0) <= 5
        && ['bridge-span', 'long-beam', 'building-carrier', 'roof'].includes(block.role)
        && block.width >= 180
      ))
      const gateClearance = physicalGateClearance(generated.blocks)
      assert.ok(hasMonumentalSpan || gateClearance >= 28,
        `${label}: compound has neither a readable horizontal span nor a usable gate opening`)

      assert.ok(generated.blocks.length <= STRONGHOLD_RULES.maximumPhysicalBlocks,
        `${label}: compound exceeds the ${STRONGHOLD_RULES.maximumPhysicalBlocks}-body budget`)
      const overlapSubjects = new Set([
        ...crossTowerBlocks,
        ...generated.blocks.filter((block) => (
          ['complete-building-envelope', 'complete-building-connection']
            .includes(block.moduleKind)
        )),
      ])
      for (let firstIndex = 0; firstIndex < generated.blocks.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < generated.blocks.length; secondIndex += 1) {
          const first = generated.blocks[firstIndex]
          const second = generated.blocks[secondIndex]
          if (!overlapSubjects.has(first) && !overlapSubjects.has(second)) continue
          const manifold = rectCollisionManifold(first, second)
          assert.ok(!manifold || manifold.overlap <= 0.12,
            `${label}: authored compound members ${first.role}/${second.role}`
            + ` penetrate by ${manifold?.overlap}`)
        }
      }

      const boss = generated.targets.find((target) => target.boss)
      if (!boss) continue
      assert.ok(generated.bossCourtyard, `${label}: boss has no reserved courtyard`)
      assert.ok(generated.bossCourtyard.clearWidth >= generated.bossCourtyard.minimumClearance,
        `${label}: boss courtyard is narrower than its authored clearance`)
      const bossRadius = boss.size * 0.78
      assert.ok(
        Math.abs(boss.x - generated.bossCourtyard.centerX) + bossRadius
          <= generated.bossCourtyard.clearWidth / 2,
        `${label}: boss starts outside the reserved courtyard`,
      )
      assert.ok(generated.blocks.every((block) => {
        const manifold = circleRectCollisionManifold({
          x: boss.x,
          y: boss.y,
          radius: bossRadius,
        }, block)
        return !manifold || manifold.overlap <= 1e-6
      }), `${label}: boss starts pinned inside the compound`)
    }
  }
})

test('endless environments advance through deterministic story geography belts', () => {
  const belts = [
    { depth: 1, minimum: 1, maximum: 3 },
    { depth: 3, minimum: 2, maximum: 4 },
    { depth: 5, minimum: 3, maximum: 5 },
    { depth: 7, minimum: 4, maximum: 6 },
    { depth: 10, minimum: 7, maximum: 9 },
    { depth: 30, minimum: 10, maximum: 12 },
    { depth: 50, minimum: 13, maximum: 15 },
    { depth: 80, minimum: 15, maximum: 18 },
    { depth: 120, minimum: 15, maximum: 18 },
    { depth: 200, minimum: 15, maximum: 18 },
  ]
  for (let index = 1; index < belts.length; index += 1) {
    assert.ok(belts[index].minimum >= belts[index - 1].minimum,
      'authored endless geography belts must never move backwards')
  }

  for (const seed of [1, 7, 20260828, 0xffff_ffff]) {
    for (const belt of belts) {
      const level = MAIN_LEVELS + belt.depth
      const first = endlessEnvironmentThemeLevel(level, seed)
      const second = endlessEnvironmentThemeLevel(level, seed)
      assert.equal(first, second, `depth-${belt.depth}/seed-${seed}: non-deterministic belt`)
      assert.ok(first >= belt.minimum && first <= belt.maximum,
        `depth-${belt.depth}/seed-${seed}: theme ${first} left its story belt`)
      const generated = generateLevel({ mode: 'endless', level, seed })
      assert.equal(generated.environmentThemeLevel, first,
        `depth-${belt.depth}/seed-${seed}: generator ignored the endless story belt`)
    }
  }
})

test('battlefield renderer consumes complete-building forms for roofs, wind rotors, and arches', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const accentStart = runtime.indexOf('  drawCompleteBuildingAccent(')
  const accentEnd = runtime.indexOf('  drawBlock(', accentStart)
  const accent = runtime.slice(accentStart, accentEnd)
  assert.ok(accentStart >= 0 && accentEnd > accentStart)
  assert.match(accent, /block\.buildingFormId/u)
  assert.match(accent, /block\.architecturalShape/u)
  assert.match(accent, /role === 'roofline'/u)
  assert.match(accent, /gabled\|granary-dome/u)
  assert.match(accent, /windmill-head\|wind-engine-tower/u)
  assert.match(accent, /ctx\.rotate\(this\.mapPulseTick/u)
  assert.match(accent, /ctx\.arc\(0, bottom - archHeight/u)
  assert.match(accent, /masonry\|stone\|citadel\|curtain\|arcade\|bastion/u)

  const drawBlockStart = runtime.indexOf('  drawBlock(')
  const drawBlockEnd = runtime.indexOf('  drawSquirrel(', drawBlockStart)
  const drawBlock = runtime.slice(drawBlockStart, drawBlockEnd)
  assert.match(drawBlock, /this\.drawCompleteBuildingAccent\(block, x, y\)/u)
})

test('main and endless structure families unlock progressively and remain in the late pool', () => {
  const ids = STRUCTURE_FAMILY_RULES.ids
  assert.equal(structureFamilyProfileForLevel('main', 6, 1).id, ids.frontier)
  assert.equal(structureFamilyProfileForLevel('main', 7, 1).id, ids.bridge)
  assert.equal(structureFamilyProfileForLevel('main', 10, 1).id, ids.rock)
  assert.equal(structureFamilyProfileForLevel('main', 15, 1).id, ids.royal)

  assert.equal(structureFamilyProfileForLevel('endless', MAIN_LEVELS + 9, 1).id, ids.frontier)
  assert.equal(structureFamilyProfileForLevel('endless', MAIN_LEVELS + 10, 1).id, ids.bridge)
  const middleIds = new Set(Array.from({ length: 300 }, (_, seed) => (
    structureFamilyProfileForLevel('endless', MAIN_LEVELS + 30, seed + 1).id
  )))
  assert.deepEqual(middleIds, new Set([ids.bridge, ids.rock]))
  const lateIds = new Set(Array.from({ length: 300 }, (_, seed) => (
    structureFamilyProfileForLevel('endless', MAIN_LEVELS + 100, seed + 1).id
  )))
  assert.deepEqual(lateIds, new Set([ids.bridge, ids.rock, ids.royal]))

  const firstRoyalDepth = structureFamilyProfileForLevel('endless', MAIN_LEVELS + 50, 7)
  const deepRoyalPool = structureFamilyProfileForLevel('endless', MAIN_LEVELS + 150, 7)
  assert.ok(deepRoyalPool.weights.royal > firstRoyalDepth.weights.royal)
  assert.ok(deepRoyalPool.weights.bridge >= 0.15)
  assert.ok(deepRoyalPool.weights.rock >= 0.23)
  assert.ok(Object.isFrozen(STRUCTURE_FAMILY_RULES))
})

test('bridge gates, rock forts, and royal cities expose distinct grounded silhouettes', () => {
  const ids = STRUCTURE_FAMILY_RULES.ids
  const bridge = generateLevel({ mode: 'main', level: 13, seed: 11 })
  assert.equal(bridge.structureFamily.id, ids.bridge)
  assert.ok(new Set(bridge.structureFamily.towerFloorCounts).size > 1)
  const piers = bridge.blocks.filter((block) => block.physicalModuleKind === 'bridge-pier')
  const arches = bridge.blocks.filter((block) => block.physicalModuleKind === 'arch-spandrel')
  const roadway = bridge.blocks.find((block) => block.physicalModuleKind === 'continuous-roadway')
  assert.equal(piers.length, 4)
  assert.equal(arches.length, 3)
  assert.ok(roadway?.structuralSpine && roadway.role === 'building-span')

  const rock = generateLevel({ mode: 'main', level: 12, seed: 11 })
  assert.equal(rock.structureFamily.id, ids.rock)
  assert.ok(new Set(rock.structureFamily.towerFloorCounts).size > 2)
  const buttresses = rock.blocks.filter((block) => block.moduleKind === 'rock-buttress')
  assert.equal(new Set(buttresses.map((block) => block.moduleId)).size, 4)
  assert.ok(buttresses.filter((block) => block.role === 'rock-buttress')
    .every((block) => block.type === 'stone' && Math.abs(block.rotation) > 1))
  assert.equal(buttresses.filter((block) => block.weakPoint && block.type === 'ice').length, 1)

  const royal = generateLevel({ mode: 'main', level: 16, seed: 11 })
  assert.equal(royal.structureFamily.id, ids.royal)
  assert.deepEqual(
    [...royal.structureFamily.towerFloorCounts].sort(),
    [...royal.architectureBlueprint.towerFloors].sort(),
  )
  const royalCore = royal.blocks.filter((block) => block.physicalModuleId)
  assert.equal(royalCore.length, royal.architectureBlueprint.buildingPlan.physicalModules.length)
  assert.equal(royalCore.filter((block) => block.physicalModuleKind === 'wind-engine-tower').length, 1)
  assert.equal(royalCore.filter((block) => block.physicalModuleKind === 'lift-gate-pier').length, 2)
  assert.equal(royalCore.filter((block) => block.physicalModuleKind === 'counterweight-tower').length, 1)

  for (const generated of [bridge, rock, royal]) {
    const physicalBlocks = generated.blocks.map((block, index) => ({
      ...block, id: `family-${generated.level}-${index}`,
    }))
    const joints = buildStructureJoints(physicalBlocks, {
      allowedKinds: structureJointKindsForLevel('main', generated.level),
      desiredCounts: structureJointCountsForLevel('main', generated.level),
    })
    assert.equal(analyzeStructureStability(
      physicalBlocks, generated.platforms, { joints },
    ).unstableIds.size, 0)
    if (generated.architectureBlueprint.buildingPlan.physicalModules.length) continue
    for (let towerIndex = 0; towerIndex < generated.structureFamily.towerCount; towerIndex += 1) {
      const piers = generated.blocks.filter((block) => (
        block.role === 'foundation-pier' && block.towerIndex === towerIndex
      ))
      if (generated.strongholdTier > 0) {
        assert.equal(piers.length, 2)
        assert.ok(piers.every((pier) => pier.hp >= 12 && pier.type === 'stone'))
      }
    }
  }
})

test('physical family silhouettes exist with matching metadata and material contracts', () => {
  const ids = STRUCTURE_FAMILY_RULES.ids
  const scenarios = [
    { mode: 'main', level: 8, seed: 11, family: ids.bridge },
    { mode: 'main', level: 11, seed: 11, family: ids.rock },
    { mode: 'main', level: 12, seed: 11, family: ids.rock },
    { mode: 'main', level: 16, seed: 11, family: ids.royal },
    { mode: 'main', level: 17, seed: 11, family: ids.royal },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 2, family: ids.bridge },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 3, family: ids.rock },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 1, family: ids.royal },
  ]

  for (const scenario of scenarios) {
    const generated = generateLevel(scenario)
    const label = `${scenario.mode}-${scenario.level}/seed-${scenario.seed}`
    assert.equal(generated.structureFamily.id, scenario.family, `${label}: family`)

    const bridgeSpans = generated.blocks.filter((block) => (
      block.moduleKind === 'asymmetric-bridge'
    ))
    const rockSilhouette = generated.blocks.filter((block) => (
      ['a-frame-crown', 'rock-silhouette-buttress'].includes(block.moduleKind)
    ))
    const royalSilhouette = generated.blocks.filter((block) => (
      ['royal-upper-curtain', 'royal-upper-curtain-cap', 'royal-gatehouse']
        .includes(block.moduleKind)
    ))
    const physicalModules = generated.blocks.filter((block) => block.physicalModuleId)

    if (generated.architectureBlueprint.buildingPlan.physicalModules.length) {
      assert.equal(
        physicalModules.length,
        generated.architectureBlueprint.buildingPlan.physicalModules.length,
        `${label}: explicit physical module inventory`,
      )
      assert.ok(physicalModules.some((block) => block.physicalRole === 'support'))
      assert.ok(physicalModules.some((block) => block.physicalRole === 'carrier'))
      assert.ok(physicalModules.some((block) => block.physicalRole === 'roof'))
      assert.ok(physicalModules.every((block) => (
        block.completeBuildingMassId && block.completeBuildingMassKind
      )), `${label}: explicit mass identity`)
      continue
    }

    if (scenario.family === ids.bridge) {
      assert.equal(bridgeSpans.length, generated.structureFamily.bridgeSpanCount,
        `${label}: bridge span metadata`)
      assert.ok(bridgeSpans.every((block) => (
        block.type === 'wood' && block.role === 'bridge-span' && block.weakPoint
      )), `${label}: bridge span material contract`)
      assert.ok(bridgeSpans.length > 0 || generated.architectureBlueprint.landmarkAdded,
        `${label}: compact bridge blueprint lacks its landmark`)
    } else if (scenario.family === ids.rock) {
      assert.equal(rockSilhouette.length, generated.structureFamily.silhouetteModuleCount,
        `${label}: rock silhouette metadata`)
      assert.ok(rockSilhouette.every((block) => block.type === 'stone'),
        `${label}: rock silhouette material contract`)
      const crown = rockSilhouette.filter((block) => block.moduleKind === 'a-frame-crown')
      assert.equal(crown.filter((block) => block.role === 'a-frame-rafter').length, 2,
        `${label}: A-frame rafters`)
      assert.equal(crown.filter((block) => block.role === 'a-frame-keystone').length, 1,
        `${label}: A-frame keystone`)
      if (generated.structureFamily.complexity >= 3) {
        assert.ok(rockSilhouette.filter((block) => (
          block.moduleKind === 'rock-silhouette-buttress'
        )).length >= 1, `${label}: high-tier inner buttress`)
      }
    } else {
      assert.equal(royalSilhouette.length, generated.structureFamily.silhouetteModuleCount,
        `${label}: royal silhouette metadata`)
      assert.ok(royalSilhouette.length >= 6, `${label}: incomplete royal silhouette`)
    }
  }
})

test('new physical silhouettes never begin meaningfully embedded in another structure block', () => {
  const ids = STRUCTURE_FAMILY_RULES.ids
  const scenarios = [
    { mode: 'main', level: 8, seed: 11, family: ids.bridge },
    { mode: 'main', level: 11, seed: 11, family: ids.rock },
    { mode: 'main', level: 12, seed: 11, family: ids.rock },
    { mode: 'main', level: 16, seed: 11, family: ids.royal },
    { mode: 'main', level: 17, seed: 11, family: ids.royal },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 2, family: ids.bridge },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 3, family: ids.rock },
    { mode: 'endless', level: MAIN_LEVELS + 50, seed: 1, family: ids.royal },
  ]
  const silhouetteKinds = new Set([
    'asymmetric-bridge',
    'a-frame-crown',
    'rock-silhouette-buttress',
    'royal-upper-curtain',
    'royal-upper-curtain-cap',
    'royal-gatehouse',
    'authored-building-mass',
    'authored-building-span',
  ])

  for (const scenario of scenarios) {
    const generated = generateLevel(scenario)
    const label = `${scenario.mode}-${scenario.level}/seed-${scenario.seed}`
    for (let first = 0; first < generated.blocks.length; first += 1) {
      for (let second = first + 1; second < generated.blocks.length; second += 1) {
        const firstBlock = generated.blocks[first]
        const secondBlock = generated.blocks[second]
        if (!silhouetteKinds.has(firstBlock.moduleKind)
          && !silhouetteKinds.has(secondBlock.moduleKind)) continue
        const manifold = rectCollisionManifold(firstBlock, secondBlock)
        assert.ok(!manifold || manifold.overlap <= 0.12,
          `${label}: blocks ${first}/${second} (${firstBlock.moduleKind || firstBlock.role}`
          + ` / ${secondBlock.moduleKind || secondBlock.role}) penetrate by ${manifold?.overlap}`)
      }
    }
  }
})

test('family weak points fail locally instead of triggering an arbitrary global collapse', () => {
  const bridge = generateLevel({ mode: 'main', level: 13, seed: 7 })
  const bridgeBlocks = bridge.blocks.map((block, index) => ({ ...block, id: `bridge-${index}` }))
  const weakSpan = bridgeBlocks.find((block) => block.physicalModuleId === 'tollhouse-roof-cap')
  assert.ok(weakSpan, 'viaduct lacks its locally destructible timber tollhouse roof')
  const bridgeJoints = buildStructureJoints(bridgeBlocks, {
    allowedKinds: structureJointKindsForLevel('main', 13),
    desiredCounts: structureJointCountsForLevel('main', 13),
  })
  const bridgeRemaining = bridgeBlocks.filter((block) => block !== weakSpan)
  const bridgeStability = analyzeStructureStability(
    bridgeRemaining,
    bridge.platforms,
    { joints: bridgeJoints.filter((joint) => (
      joint.firstId !== weakSpan.id && joint.secondId !== weakSpan.id
    )) },
  )
  const bridgeUnstable = bridgeRemaining.filter((block) => (
    bridgeStability.unstableIds.has(block.id)
  ))
  assert.ok(bridgeUnstable.length <= 1)
  assert.ok(bridgeUnstable.every((block) => block.role === 'blueprint-landmark'))

  const rock = generateLevel({ mode: 'main', level: 12, seed: 7 })
  const rockBlocks = rock.blocks.map((block, index) => ({ ...block, id: `rock-${index}` }))
  const keystone = rockBlocks.find((block) => block.moduleKind === 'rock-buttress' && block.weakPoint)
  assert.ok(keystone)
  const remaining = rockBlocks.filter((block) => block !== keystone)
  const stability = analyzeStructureStability(remaining, rock.platforms)
  const unstable = remaining.filter((block) => stability.unstableIds.has(block.id))
  assert.ok(unstable.length > 0 && unstable.length <= 6)
  assert.ok(unstable.every((block) => block.towerIndex === keystone.towerIndex))
})

test('stronghold modules persist, grow, and scale durability with their physical size', () => {
  assert.deepEqual(strongholdModuleProfileForLevel('main', 12), {
    trussCount: 0, stoneTrussCount: 0, wallPanelCount: 0, longBeamCount: 0,
  })
  assert.deepEqual(strongholdModuleProfileForLevel('main', 13), STRONGHOLD_MODULE_RULES.main[13])
  assert.deepEqual(strongholdModuleProfileForLevel('main', 18), STRONGHOLD_MODULE_RULES.main[18])
  assert.deepEqual(strongholdModuleProfileForLevel('endless', MAIN_LEVELS + 9), {
    trussCount: 0, stoneTrussCount: 0, wallPanelCount: 0, longBeamCount: 0,
  })
  const endlessMilestones = [10, 30, 50, 80, 120]
    .map((depth) => strongholdModuleProfileForLevel('endless', MAIN_LEVELS + depth))
  for (let index = 1; index < endlessMilestones.length; index += 1) {
    assert.ok(endlessMilestones[index].trussCount >= endlessMilestones[index - 1].trussCount)
    assert.ok(endlessMilestones[index].stoneTrussCount >= endlessMilestones[index - 1].stoneTrussCount)
    assert.ok(endlessMilestones[index].wallPanelCount >= endlessMilestones[index - 1].wallPanelCount)
    assert.ok(endlessMilestones[index].longBeamCount >= endlessMilestones[index - 1].longBeamCount)
  }

  const regularWood = calculateStructureComponentStats({
    type: 'wood', width: 26, height: 46, role: 'post',
  })
  const woodTruss = calculateStructureComponentStats({
    type: 'wood', width: 18, height: 58, role: 'truss-brace', moduleKind: 'tri-truss',
  })
  const stoneTruss = calculateStructureComponentStats({
    type: 'stone', width: 18, height: 58, role: 'truss-brace', moduleKind: 'tri-truss',
  })
  const stonePanel = calculateStructureComponentStats({
    type: 'stone', width: 82, height: 52, role: 'wall-panel',
  })
  const stonePier = calculateStructureComponentStats({
    type: 'stone', width: 48, height: 20, role: 'foundation-pier',
  })
  const longWood = calculateStructureComponentStats({
    type: 'wood', width: 360, height: 26, role: 'long-beam',
  })
  assert.equal(regularWood.hp, 3)
  assert.equal(woodTruss.hp, 4)
  assert.equal(stoneTruss.hp, 10)
  assert.equal(stonePanel.hp, 13)
  assert.equal(stonePier.hp, 12)
  assert.ok(longWood.hp >= 7)
  assert.ok(longWood.mass > regularWood.mass * 7)
  assert.ok(Object.isFrozen(STRONGHOLD_MODULE_RULES))
  assert.ok(Object.isFrozen(INTEGRAL_TRUSS_JOINT_RULES))
})

test('authored mixed-material joints and hinges survive ordinary joint quotas', () => {
  const generated = generateLevel({ level: 16, seed: 17, mode: 'main' })
  const blocks = generated.blocks.map((block, index) => ({ ...block, id: `block-${index}` }))
  const joints = buildStructureJoints(blocks, {
    allowedKinds: [],
    desiredCounts: { nail: 0, masonry: 0 },
  })
  const authored = joints.filter((joint) => joint.authoredBuildingBond)
  assert.ok(authored.length >= 8)
  assert.ok(authored.every((joint) => joint.autoRetain === true))
  assert.ok(authored.some((joint) => joint.material === 'mixed'))
  const drawbridge = blocks.find((block) => block.physicalModuleId === 'lift-gate-drawbridge')
  assert.equal(authored.filter((joint) => (
    joint.firstId === drawbridge.id || joint.secondId === drawbridge.id
  )).length, 2)
  assert.equal(analyzeStructureStability(blocks, generated.platforms, { joints }).unstableIds.size, 0)
})

test('dual foundation piers localize support loss and carrier beams are not global failure points', () => {
  for (const [mode, levels] of [
    ['main', [13, 15, 17, 18]],
    ['endless', [MAIN_LEVELS + 10, MAIN_LEVELS + 30, MAIN_LEVELS + 50, MAIN_LEVELS + 100]],
  ]) {
    for (const level of levels) {
      for (const seed of [1, 7, 31, 91]) {
        const generated = generateLevel({ mode, level, seed })
        const blocks = generated.blocks.map((block, index) => ({ ...block, id: `block-${index}` }))
        const joints = buildStructureJoints(blocks, {
          allowedKinds: structureJointKindsForLevel(mode, level),
          desiredCounts: structureJointCountsForLevel(mode, level),
        })
        assert.equal(analyzeStructureStability(blocks, generated.platforms, { joints }).unstableIds.size, 0)
        const authoredModules = blocks.filter((block) => block.physicalModuleId)
        if (authoredModules.length) {
          assert.equal(
            authoredModules.length,
            generated.architectureBlueprint.buildingPlan.physicalModules.length,
          )
          const groundedSupports = authoredModules.filter((block) => (
            ['support', 'wall', 'threshold'].includes(block.physicalRole)
            && Math.abs(rotatedRectBounds(block).bottom - GROUND_Y) <= 3
          ))
          assert.ok(groundedSupports.length >= 2)
          assert.ok(authoredModules.filter((block) => block.structuralSpine).every((block) => (
            ['building-span', 'roof'].includes(block.role)
          )))
          continue
        }
        for (let towerIndex = 0; towerIndex < generated.structureFamily.towerCount; towerIndex += 1) {
          const pier = blocks.find((block) => (
            block.role === 'foundation-pier' && block.towerIndex === towerIndex && block.side === 'left'
          ))
          assert.ok(pier)
          const remaining = blocks.filter((block) => block !== pier)
          const stability = analyzeStructureStability(remaining, generated.platforms, { joints })
          const unstable = remaining.filter((block) => stability.unstableIds.has(block.id))
          assert.ok(unstable.length <= 7, `${mode}-${level}/seed-${seed}/tower-${towerIndex}`)
          assert.ok(unstable.every((block) => (
            block.towerIndex === towerIndex || !Number.isInteger(block.towerIndex)
          )))
        }
        const carrier = blocks.find((block) => block.role === 'long-beam')
        if (carrier) {
          const withoutCarrier = blocks.filter((block) => block !== carrier)
          assert.equal(
            analyzeStructureStability(withoutCarrier, generated.platforms, { joints }).unstableIds.size,
            0,
          )
        }
      }
    }
  }
})

test('late module geometry keeps guards clear, boss courts open, and wind loads finite', () => {
  for (const level of [14, 16, 17, 18]) {
    for (const seed of [1, 7, 31]) {
      const generated = generateLevel({ level, seed, mode: 'main' })
      assert.ok(generated.blocks.length <= STRONGHOLD_RULES.maximumPhysicalBlocks)
      for (const target of generated.targets) {
        const circle = { x: target.x, y: target.y, radius: target.size * 0.78 }
        assert.ok(generated.blocks.every((block) => {
          const manifold = circleRectCollisionManifold(circle, block)
          return !manifold || manifold.overlap <= 1e-6
        }), `level-${level}/seed-${seed}: target intersects a module`)
      }
      if (generated.bossCourtyard) {
        assert.ok(generated.bossCourtyard.clearWidth >= generated.bossCourtyard.minimumClearance)
        const courtLeft = generated.bossCourtyard.centerX - generated.bossCourtyard.minimumClearance / 2
        const courtRight = generated.bossCourtyard.centerX + generated.bossCourtyard.minimumClearance / 2
        for (const carrier of generated.blocks.filter((block) => (
          block.structuralSpine && block.physicalFeature !== 'open-boss-court'
        ))) {
          const bounds = rotatedRectBounds(carrier)
          assert.ok(bounds.bottom <= generated.bossCourtyard.surfaceY - 1
            || bounds.right <= courtLeft || bounds.left >= courtRight)
        }
      }
      const modules = generated.blocks.filter((block) => (
        Boolean(block.physicalModuleId)
        || ['truss-brace', 'wall-panel', 'long-beam'].includes(block.role)
      ))
      assert.ok(modules.length > 0)
      for (const block of modules) {
        const calm = calculateStructureWindLoad(block, 0)
        const windy = calculateStructureWindLoad(block, generated.windX || 0.08)
        assert.equal(calm.active, false)
        assert.ok(windy.active)
        assert.ok(Number.isFinite(windy.accelerationX) && Number.isFinite(windy.angularAcceleration))
      }
    }
  }
})

test('high endless floors cap wind at a finite playable magnitude', () => {
  const highWind = generateLevel({ level: MAIN_LEVELS + 40, seed: 1, mode: 'endless' })
  assert.equal(highWind.mapType, 'wind')
  assert.equal(Math.abs(highWind.windX), MAX_WIND_MAGNITUDE)

  for (let level = 1; level <= 300; level += 1) {
    for (const seed of [1, 2, 0xffff_ffff]) {
      const generated = generateLevel({ level, seed, mode: 'endless' })
      assert.ok(Number.isFinite(generated.windX))
      assert.ok(Math.abs(generated.windX) <= MAX_WIND_MAGNITUDE)
    }
  }
})

test('golden acorns use one deterministic level-wide roll and preserve the lucky multiplier', () => {
  assert.deepEqual(GOLDEN_ACORN_RULES, {
    baseChancePerLevel: 0.06,
    luckyChanceMultiplier: 3,
  })
  assert.ok(Object.isFrozen(GOLDEN_ACORN_RULES))

  let normalEggs = 0
  let luckyEggs = 0
  let example = null
  const sampleSize = 2_000
  const incidenceByLevel = new Map([[1, 0], [8, 0], [18, 0]])
  for (let seed = 1; seed <= sampleSize; seed += 1) {
    const normal = generateLevel({ level: 8, seed, lucky: false })
    const lucky = generateLevel({ level: 8, seed, lucky: true })
    if (normal.goldenEgg) normalEggs += 1
    if (lucky.goldenEgg) {
      luckyEggs += 1
      example ??= { seed, egg: lucky.goldenEgg }
    }
    for (const level of incidenceByLevel.keys()) {
      if (generateLevel({ level, seed, lucky: false }).goldenEgg) {
        incidenceByLevel.set(level, incidenceByLevel.get(level) + 1)
      }
    }
  }

  assert.ok(normalEggs / sampleSize > 0.045 && normalEggs / sampleSize < 0.075)
  assert.ok(luckyEggs / sampleSize > 0.15 && luckyEggs / sampleSize < 0.21)
  assert.ok(luckyEggs > normalEggs * 2.4 && luckyEggs < normalEggs * 3.8)
  for (const count of incidenceByLevel.values()) {
    assert.ok(count / sampleSize > 0.045 && count / sampleSize < 0.075)
  }
  assert.ok(Math.max(...incidenceByLevel.values()) - Math.min(...incidenceByLevel.values()) < sampleSize * 0.02)

  const baseRoll = rollGoldenAcornForLevel({ level: 8, seed: example.seed })
  const luckyRoll = rollGoldenAcornForLevel({ level: 8, seed: example.seed, lucky: true })
  assert.equal(baseRoll.roll, luckyRoll.roll)
  assert.equal(baseRoll.placementRoll, luckyRoll.placementRoll)
  assert.equal(baseRoll.chance, 0.06)
  assert.ok(Math.abs(luckyRoll.chance - 0.18) < 1e-12)
  assert.ok(Object.isFrozen(baseRoll))
  assert.deepEqual(
    generateLevel({ level: 8, seed: example.seed, lucky: true }).goldenEgg,
    example.egg,
  )
  assert.equal(generateLevel({ level: 1, seed: 99 }).goldenAcornChance, 0.06)
  assert.ok(Math.abs(generateLevel({ level: 18, seed: 99, lucky: true }).goldenAcornChance - 0.18) < 1e-12)
})

test('main boss gates escalate their guards before the king finale', () => {
  const expectedBosses = new Map([[6, 3], [12, 4], [17, 5], [18, 6]])
  for (const [level, guards] of expectedBosses) {
    const generated = generateLevel({ level, seed: 9, mode: 'main' })
    assert.equal(generated.isBossLevel, true)
    assert.equal(generated.targets.filter((target) => !target.boss).length, guards)
    assert.equal(generated.targets.filter((target) => target.boss).length, 1)
  }
  assert.equal(generateLevel({ level: 16, seed: 9, mode: 'main' }).isBossLevel, false)

  const general = generateLevel({ level: MAIN_LEVELS - 1, seed: 9, mode: 'main' })
  assert.equal(general.isBossLevel, true)
  assert.equal(general.targets.find((target) => target.boss).variant, 'general')
  const finale = generateLevel({ level: MAIN_LEVELS, seed: 9, mode: 'main' })
  assert.equal(finale.isBossLevel, true)
  assert.equal(finale.targets.filter((target) => target.boss).length, 1)
  assert.equal(finale.targets.filter((target) => !target.boss).length, 6)
  assert.ok(new Set(finale.targets.filter((target) => !target.boss)
    .map((target) => Math.round(target.x / 120))).size >= 3)
  assert.ok(finale.targets.filter((target) => !target.boss && target.y < GROUND_Y - 18).length >= 4)
  assert.equal(finale.targets[0].hp, bossProfileForEncounter('main', MAIN_LEVELS, 'king').hp)
  assert.ok(finale.targets[0].hp >= 14)
  assert.equal(finale.targets[0].variant, 'king')

  assert.equal(generateLevel({ level: MAIN_LEVELS + 9, seed: 9, mode: 'endless' }).isBossLevel, false)
  const endlessBoss = generateLevel({ level: MAIN_LEVELS + 10, seed: 9, mode: 'endless' })
  assert.equal(endlessBoss.isBossLevel, true)
  assert.equal(endlessBoss.targets.find((target) => target.boss).variant, 'general')
  assert.equal(generateLevel({ level: MAIN_LEVELS + 20, seed: 9, mode: 'endless' }).isBossLevel, true)
})

test('bird type pool is driven by a frozen, forward-compatible unlock table', () => {
  assert.deepEqual(birdTypePool(1), ['red'])
  assert.deepEqual(birdTypePool(2), ['red', 'bomb'])
  assert.deepEqual(birdTypePool(4), ['red', 'bomb', 'split'])
  assert.deepEqual(birdTypePool(6), ['red', 'bomb', 'split', 'dash'])
  assert.deepEqual(birdTypePool(7), ['red', 'bomb', 'split', 'dash'])
  assert.deepEqual(birdTypePool(8), ['red', 'bomb', 'split', 'dash', 'fire'])
  assert.deepEqual(birdTypePool(MAIN_LEVELS), ['red', 'bomb', 'split', 'dash', 'fire'])
  assert.equal(FIRE_ACORN.unlockLevel, 8)
  assert.equal(FIRE_ACORN.ability.id, 'ember-anchor')
  assert.equal(FIRE_ACORN.ability.maximumNeighbors, 2)
  assert.ok(Object.isFrozen(FIRE_ACORN))
  assert.equal(new Set(BIRD_TYPE_UNLOCKS.map((unlock) => unlock.type)).size, BIRD_TYPE_UNLOCKS.length)
  assert.ok(BIRD_TYPE_UNLOCKS.every((unlock, index) => index === 0 || unlock.level >= BIRD_TYPE_UNLOCKS[index - 1].level))
  assert.ok(Object.isFrozen(BIRD_TYPE_UNLOCKS))
  assert.ok(BIRD_TYPE_UNLOCKS.every(Object.isFrozen))
  assert.throws(() => birdTypePool(0), /positive safe integer/u)
})

test('main ammunition queues deterministically cover every unlocked type before repeating', () => {
  for (const level of [1, 2, 4, 6, 8, 13, 18]) {
    const pool = birdTypePool(level)
    const generated = generateLevel({ level, seed: 701, mode: 'main' })
    for (const seed of [1, 2, 701, 0xffff_ffff]) {
      const queue = buildMainAmmoQueue({
        level,
        seed,
        totalShots: generated.baseShotBudget,
      })
      assert.deepEqual(queue, buildMainAmmoQueue({
        level,
        seed,
        totalShots: generated.baseShotBudget,
      }))
      assert.equal(queue.length, generated.baseShotBudget)
      assert.ok(Object.isFrozen(queue))
      assert.ok(queue.every((type) => pool.includes(type)))
      if (queue.length >= pool.length) {
        assert.deepEqual([...new Set(queue.slice(0, pool.length))].sort(), [...pool].sort())
        assert.ok(pool.every((type) => queue.includes(type)))
      }
      if (pool.length > 1) {
        assert.ok(queue.every((type, index) => index === 0 || type !== queue[index - 1]))
      }
      const counts = pool.map((type) => queue.filter((entry) => entry === type).length)
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 1)
    }
  }

  for (const [level, type] of [[2, 'bomb'], [4, 'split'], [6, 'dash'], [8, 'fire']]) {
    assert.equal(buildMainAmmoQueue({ level, seed: 701, totalShots: 6 })[0], type,
      `${type} is introduced as the first shot of its teaching battle`)
  }

  assert.deepEqual(buildMainAmmoQueue({ level: 6, seed: 1, totalShots: 0 }), [])
  assert.throws(() => buildMainAmmoQueue({ level: 6, seed: 1, totalShots: 2, availableTypes: [] }), /launchable/u)
  assert.deepEqual(
    [...buildMainAmmoQueue({
      level: 6, seed: 1, totalShots: 4, availableTypes: ['golden', 'red', 'red', 'bomb'],
    })].sort(),
    ['bomb', 'bomb', 'red', 'red'],
  )
})

test('clamp and collision helpers include touching edges', () => {
  assert.equal(clamp(12, 0, 10), 10)
  assert.equal(clamp(-1, 0, 10), 0)
  assert.equal(clamp(4, 0, 10), 4)
  assert.equal(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 }), 25)

  assert.equal(circlesOverlap(
    { x: 0, y: 0, radius: 5 },
    { x: 10, y: 0, radius: 5 },
  ), true)
  assert.equal(circlesOverlap(
    { x: 0, y: 0, radius: 5 },
    { x: 10.01, y: 0, radius: 5 },
  ), false)

  const rectangle = { x: 10, y: 10, width: 10, height: 6 }
  assert.equal(pointInRect({ x: 5, y: 7 }, rectangle), true)
  assert.equal(pointInRect({ x: 4.99, y: 7 }, rectangle), false)
  assert.equal(circleIntersectsRect({ x: 3, y: 10, radius: 2 }, rectangle), true)
  assert.equal(circleIntersectsRect({ x: 2.99, y: 10, radius: 2 }, rectangle), false)
  assert.equal(rectsOverlap(rectangle, { x: 20, y: 10, width: 10, height: 2 }), true)
  assert.equal(rectsOverlap(rectangle, { x: 20.01, y: 10, width: 10, height: 2 }), false)
})

test('rotated blocks use their visible orientation for bounds and collisions', () => {
  const verticalBeam = { x: 0, y: 0, width: 100, height: 20, rotation: 90 }
  const bounds = rotatedRectBounds(verticalBeam)
  assert.ok(Math.abs(bounds.width - 20) < 1e-9)
  assert.ok(Math.abs(bounds.height - 100) < 1e-9)

  // This circle sat inside the old invisible horizontal hit box, but is far
  // outside the visibly vertical beam.
  assert.equal(circleIntersectsRect({ x: 45, y: 0, radius: 3 }, verticalBeam), false)
  assert.equal(circleIntersectsRect({ x: 0, y: 45, radius: 3 }, verticalBeam), true)

  const diagonal = { x: 20, y: 0, width: 30, height: 10, rotation: 45 }
  const manifold = rectCollisionManifold(
    { x: 0, y: 0, width: 30, height: 10, rotation: -45 },
    diagonal,
  )
  assert.ok(manifold)
  assert.ok(manifold.overlap > 0)
  assert.ok(Number.isFinite(manifold.normalX) && Number.isFinite(manifold.normalY))
})

test('circle-to-building manifolds separate side, top, inside, and rotated contacts', () => {
  const wall = { x: 10, y: 10, width: 10, height: 20, rotation: 0 }
  const side = circleRectCollisionManifold({ x: 4, y: 10, radius: 2 }, wall)
  assert.ok(side)
  assert.ok(Math.abs(side.overlap - 1) < 1e-9)
  assert.ok(Math.abs(side.normalX + 1) < 1e-9)
  assert.ok(Math.abs(side.normalY) < 1e-9)

  const top = circleRectCollisionManifold({ x: 10, y: -0.5, radius: 2 }, wall)
  assert.ok(top)
  assert.ok(Math.abs(top.overlap - 1.5) < 1e-9)
  assert.ok(Math.abs(top.normalX) < 1e-9)
  assert.ok(Math.abs(top.normalY + 1) < 1e-9)

  const inside = circleRectCollisionManifold({ x: 10, y: 10, radius: 2 }, wall)
  assert.ok(inside)
  assert.ok(Number.isFinite(inside.overlap) && inside.overlap > 2)
  assert.ok(Number.isFinite(inside.normalX) && Number.isFinite(inside.normalY))
  const escapedInside = {
    x: 10 + inside.normalX * (inside.overlap + 1e-6),
    y: 10 + inside.normalY * (inside.overlap + 1e-6),
    radius: 2,
  }
  assert.equal(circleRectCollisionManifold(escapedInside, wall)?.overlap ?? 0, 0)

  const diagonal = { x: 20, y: 15, width: 40, height: 8, rotation: 45 }
  const penetrating = { x: 18, y: 10, radius: 5 }
  const rotated = circleRectCollisionManifold(penetrating, diagonal)
  assert.ok(rotated)
  assert.ok(rotated.overlap > 0)
  const separated = {
    ...penetrating,
    x: penetrating.x + rotated.normalX * (rotated.overlap + 1e-6),
    y: penetrating.y + rotated.normalY * (rotated.overlap + 1e-6),
  }
  assert.equal(circleRectCollisionManifold(separated, diagonal)?.overlap ?? 0, 0)
  assert.equal(circleRectCollisionManifold({ x: -20, y: -20, radius: 2 }, diagonal), null)
})

test('moving walls block acorns from the side, underside, top, and their own motion', () => {
  const wall = { x: 100, y: 200, width: 120, height: 16, rotation: 0, vx: 0, vy: 0 }
  const cases = [
    { circle: { x: 35, y: 200, radius: 10, vx: 8, vy: 0, mass: 1 }, axis: 'vx', sign: -1 },
    { circle: { x: 100, y: 214, radius: 10, vx: 0, vy: -6, mass: 1 }, axis: 'vy', sign: 1 },
    { circle: { x: 100, y: 186, radius: 10, vx: 0, vy: 6, mass: 1 }, axis: 'vy', sign: -1 },
  ]
  for (const entry of cases) {
    const response = resolveCircleRectCollision(entry.circle, wall, { restitution: 0.45 })
    assert.ok(response)
    assert.equal(Math.sign(response[entry.axis]), entry.sign)
    const separated = circleRectCollisionManifold({
      x: response.x,
      y: response.y,
      radius: entry.circle.radius,
    }, wall)
    assert.ok(!separated || separated.overlap <= 1e-6)
  }

  const movingWall = { ...wall, vx: -2 }
  const pushed = resolveCircleRectCollision(
    { x: 35, y: 200, radius: 10, vx: 0, vy: 0, mass: 1 },
    movingWall,
    { restitution: 0.45, surfaceVx: movingWall.vx },
  )
  assert.ok(pushed)
  assert.ok(pushed.vx < movingWall.vx)
  assert.ok(pushed.closingMomentum > 0)
  assert.ok(Object.isFrozen(pushed))

  const deepSideImpact = resolveSweptCircleRectCollision(
    { x: 64, y: 200, radius: 10, vx: 29.35, vy: 0, mass: 1 },
    wall,
    { previousCircle: { x: 28, y: 200 }, restitution: 0.45 },
  )
  assert.ok(deepSideImpact)
  assert.ok(deepSideImpact.normalX < -0.8)
  assert.ok(deepSideImpact.vx < 0)
  assert.ok(deepSideImpact.time > 0 && deepSideImpact.time < 1)

  const fullUndersideCrossing = resolveSweptCircleRectCollision(
    { x: 100, y: 165, radius: 10, vx: 0, vy: -52.8, mass: 1 },
    wall,
    { previousCircle: { x: 100, y: 235 }, restitution: 0.45 },
  )
  assert.ok(fullUndersideCrossing)
  assert.ok(fullUndersideCrossing.normalY > 0.8)
  assert.ok(fullUndersideCrossing.vy > 0)
  assert.ok(fullUndersideCrossing.time > 0 && fullUndersideCrossing.time < 1)

  assert.equal(resolveSweptCircleRectCollision(
    { x: 20, y: 200, radius: 10, vx: -10, vy: 0, mass: 1 },
    wall,
    { previousCircle: { x: 30, y: 200 }, restitution: 0.45 },
  ), null)
})

test('a falling beam yields to a grounded squirrel instead of lifting it onto the roof', () => {
  const squirrel = { x: 100, y: 505, radius: 15, vx: 0, vy: 0, mass: 1 }
  const previousBeam = { x: 100, y: 475, width: 120, height: 20, rotation: 0, vx: 0, vy: 6 }
  const fallingBeam = { ...previousBeam, y: 485 }
  const response = resolveSquirrelSolidCollision(squirrel, fallingBeam, {
    grounded: true,
    previousSolid: previousBeam,
    surfaceVy: fallingBeam.vy,
  })
  assert.ok(response)
  assert.equal(response.pinned, true)
  assert.equal(response.squirrelX, squirrel.x)
  assert.equal(response.squirrelY, squirrel.y)
  assert.ok(response.solidY < fallingBeam.y)
  assert.ok(response.solidVy <= squirrel.vy)
  const separated = circleRectCollisionManifold(squirrel, {
    ...fallingBeam,
    x: response.solidX,
    y: response.solidY,
  })
  assert.ok(!separated || separated.overlap <= 1e-6)
})

test('a rotating falling beam pins at its first contact instead of using the flipped final face', () => {
  const squirrel = { x: 100, y: 505, radius: 15, vx: 0, vy: 0, mass: 1 }
  const previousBeam = {
    x: 45.9258,
    y: 493.4685,
    width: 120,
    height: 20,
    rotation: -15.829,
    vx: 11.1182,
    vy: 13.5321,
    vr: 13.2684,
  }
  const fallingBeam = {
    ...previousBeam,
    x: previousBeam.x + previousBeam.vx,
    y: previousBeam.y + previousBeam.vy,
    rotation: previousBeam.rotation + previousBeam.vr,
  }
  const finalManifold = circleRectCollisionManifold(squirrel, fallingBeam)
  assert.ok(finalManifold)
  assert.ok(finalManifold.normalY < -0.9)

  const response = resolveSquirrelSolidCollision(squirrel, fallingBeam, {
    grounded: true,
    previousSolid: previousBeam,
    surfaceVx: fallingBeam.vx,
    surfaceVy: fallingBeam.vy,
  })
  assert.ok(response)
  assert.equal(response.pinned, true)
  assert.ok(response.normalY > 0.8)
  assert.equal(response.squirrelY, squirrel.y)
  assert.ok(response.solidRotation < fallingBeam.rotation)
  const separated = circleRectCollisionManifold(squirrel, {
    ...fallingBeam,
    x: response.solidX,
    y: response.solidY,
    rotation: response.solidRotation,
  })
  assert.ok(!separated || separated.overlap <= 1e-6)
})

test('a thin beam crossing a grounded squirrel in one tick is stopped at contact', () => {
  const squirrel = { x: 100, y: 505, radius: 15, vx: 0, vy: 0, mass: 1 }
  const previousBeam = {
    x: 100, y: 460, width: 120, height: 10, rotation: 0, vx: 0, vy: 90,
  }
  const fallingBeam = { ...previousBeam, y: 550 }
  assert.equal(circleRectCollisionManifold(squirrel, fallingBeam), null)

  const response = resolveSquirrelSolidCollision(squirrel, fallingBeam, {
    grounded: true,
    previousSolid: previousBeam,
    surfaceVy: fallingBeam.vy,
  })
  assert.ok(response)
  assert.equal(response.pinned, true)
  assert.equal(response.squirrelY, squirrel.y)
  assert.ok(response.solidY < squirrel.y)
  const separated = circleRectCollisionManifold(squirrel, {
    ...fallingBeam,
    x: response.solidX,
    y: response.solidY,
  })
  assert.ok(!separated || separated.overlap <= 1e-6)
})

test('pure beam rotation can pin a grounded squirrel without centre translation', () => {
  const squirrel = { x: 140, y: 505, radius: 15, vx: 0, vy: 0, mass: 1 }
  const previousBeam = {
    x: 100, y: 480, width: 100, height: 10, rotation: -30, vx: 0, vy: 0, vr: 60,
  }
  const rotatingBeam = { ...previousBeam, rotation: 30 }
  const response = resolveSquirrelSolidCollision(squirrel, rotatingBeam, {
    grounded: true,
    previousSolid: previousBeam,
    surfaceVx: 0,
    surfaceVy: 0,
  })
  assert.ok(response)
  assert.equal(response.pinned, true)
  assert.ok(response.normalY > 0.8)
  assert.ok(response.solidRotation > previousBeam.rotation)
  assert.ok(response.solidRotation < rotatingBeam.rotation)
  assert.equal(response.squirrelY, squirrel.y)
})

test('a squirrel trapped in a narrower-than-body building gap gets a deterministic clear position', () => {
  const posts = [
    { x: 0, y: 40, width: 26, height: 46, rotation: 0 },
    { x: 48, y: 40, width: 26, height: 46, rotation: 0 },
    { x: 24, y: 14, width: 90, height: 12, rotation: 8 },
  ]
  const trapped = { x: 24, y: 40, radius: 15 }
  assert.ok(posts.some((post) => (circleRectCollisionManifold(trapped, post)?.overlap ?? 0) > 0))
  const clear = findNearestCircleClearPosition(trapped, posts, {
    minX: -80,
    maxX: 120,
    minY: 0,
    maxY: 85,
    step: 6,
    maxSearch: 120,
  })
  assert.ok(clear)
  assert.ok(posts.every((post) => {
    const manifold = circleRectCollisionManifold({ ...clear, radius: trapped.radius }, post)
    return !manifold || manifold.overlap <= 1e-6
  }))
  assert.deepEqual(
    findNearestCircleClearPosition(trapped, posts, {
      minX: -80, maxX: 120, minY: 0, maxY: 85, step: 6, maxSearch: 120,
    }),
    clear,
  )

  const previousSafe = { x: -32, y: 40 }
  assert.deepEqual(findNearestCircleClearPosition(trapped, posts, {
    minX: -80,
    maxX: 120,
    minY: 0,
    maxY: 85,
    preferred: [previousSafe],
  }), previousSafe)
})

test('runtime pins collapse-trapped squirrels locally and never uses clear-position recovery', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const resolverStart = runtime.indexOf('  resolveSquirrelStructureCollisions(squirrel) {')
  const resolverEnd = runtime.indexOf('\n  stepSquirrels(timeScale) {', resolverStart)
  const resolver = runtime.slice(resolverStart, resolverEnd)
  assert.ok(resolverStart >= 0 && resolverEnd > resolverStart)
  assert.match(resolver, /resolveSquirrelSolidCollision\(squirrel, solid/u)
  assert.match(resolver, /squirrel\.pinnedTicks/u)
  assert.doesNotMatch(resolver, /findClearSquirrelPosition|recoverTrappedSquirrel/u)
  assert.equal((runtime.match(/this\.recoverTrappedSquirrel\(/gu) || []).length, 1)
})

test('support graph wakes a beam and upper storey when one off-centre post disappears', () => {
  const leftPost = { id: 'left', x: -30, y: 80, width: 20, height: 40, rotation: 0 }
  const rightPost = { id: 'right', x: 30, y: 80, width: 20, height: 40, rotation: 0 }
  const beam = { id: 'beam', x: 0, y: 55, width: 100, height: 10, rotation: 0 }
  const upperPost = { id: 'upper', x: 0, y: 30, width: 20, height: 40, rotation: 0 }
  const options = { groundY: 100, contactTolerance: 0.01 }

  const intact = analyzeStructureStability([leftPost, rightPost, beam, upperPost], [], options)
  assert.deepEqual([...intact.unstableIds], [])

  const broken = analyzeStructureStability([leftPost, beam, upperPost], [], options)
  assert.deepEqual([...broken.supportedIds], ['left'])
  assert.equal(broken.unstableIds.has('beam'), true)
  assert.equal(broken.unstableIds.has('upper'), true)
  const beamSupport = broken.supportById.get('beam')
  assert.equal(beamSupport.hasContact, true)
  assert.equal(beamSupport.supported, false)
  assert.equal(beamSupport.tippingDirection, 1)
  assert.ok(beamSupport.leverArm > 0)
})

test('a visibly tilted resting block remains awake until it settles onto a face', () => {
  const tilted = { id: 'tilted', x: 20, y: 0, width: 80, height: 20, rotation: 12 }
  const height = rotatedRectBounds(tilted).height
  tilted.y = 100 - height / 2
  const support = analyzeBlockSupport(tilted, [], { groundY: 100, contactTolerance: 0.01 })
  assert.equal(support.supported, true)
  assert.equal(support.settled, false)
  assert.ok(Math.abs(support.angleError - 12) < 1e-9)

  const structure = analyzeStructureStability([tilted], [], {
    groundY: 100,
    contactTolerance: 0.01,
  })
  assert.equal(structure.supportedIds.has('tilted'), true)
  assert.equal(structure.unstableIds.has('tilted'), true)
})

test('every generated fortress starts face-aligned and structurally grounded', () => {
  for (let level = 1; level <= 24; level += 1) {
    for (const seed of [1, 7, 0xffff_ffff]) {
      const generated = generateLevel({ level, seed, mode: 'endless' })
      const stability = analyzeStructureStability(generated.blocks, generated.platforms)
      assert.equal(
        stability.unstableIds.size,
        0,
        `level ${level}, seed ${seed} generated an unsupported fortress`,
      )
    }
  }
})

test('platform landing requires downward crossing and horizontal overlap', () => {
  const platform = { x: 100, y: 200, width: 120, height: 16 }
  assert.equal(circleLandsOnPlatform(
    { x: 100, y: 190, radius: 10 },
    platform,
    6,
    180,
  ), true)
  assert.equal(circleLandsOnPlatform(
    { x: 100, y: 190, radius: 10 },
    platform,
    -6,
    200,
  ), false)
  assert.equal(circleLandsOnPlatform(
    { x: 171, y: 190, radius: 10 },
    platform,
    6,
    180,
  ), false)
})

test('main 17 arcaded court stays physically joined when no monolithic carrier row fits', () => {
  for (const seed of [1, 11, 20260828]) {
    const generated = generateLevel({ mode: 'main', level: 17, seed })
    const modules = generated.blocks.filter((block) => block.physicalModuleId)
    assert.equal(modules.filter((block) => block.physicalModuleKind === 'arcade-pier').length, 4)
    assert.equal(modules.filter((block) => block.physicalModuleKind === 'arcade-arch').length, 3)
    assert.equal(modules.filter((block) => block.physicalModuleKind === 'arcade-roof').length, 1)
    assert.equal(modules.filter((block) => block.physicalModuleKind === 'rear-command-keep').length, 1)
    assert.equal(modules.filter((block) => block.physicalFeature === 'open-boss-court').length, 1)
    assert.equal(generated.blocks.filter((block) => (
      block.modulePart === 'monolithic-carrier'
    )).length, 0)

    const boss = generated.targets.find((target) => target.boss)
    const bossCircle = { x: boss.x, y: boss.y, radius: boss.size * 0.78 }
    assert.ok(generated.blocks.every((block) => {
      const manifold = circleRectCollisionManifold(bossCircle, block)
      return !manifold || manifold.overlap <= 1e-6
    }), `seed ${seed}: an arcade begins inside the boss collider`)
    const blocks = generated.blocks.map((block, index) => ({ ...block, id: `court-${index}` }))
    const joints = buildStructureJoints(blocks, {
      allowedKinds: structureJointKindsForLevel('main', 17),
      desiredCounts: structureJointCountsForLevel('main', 17),
    })
    assert.equal(analyzeStructureStability(
      blocks,
      generated.platforms,
      { joints },
    ).unstableIds.size, 0, `seed ${seed}: arcaded court begins unsupported`)
  }
})
