// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import {
  MAX_PULL,
  POWER,
  analyzeStructureStability,
  rectsOverlap,
} from '../src/game-core.js'
import { SPECIAL_ACORN_BY_TYPE, selectVineWinchTarget } from '../src/special-roster.js'
import {
  blockCountsAsCollapsed,
  buildSpecialObjectiveMarkers,
  buildSpecialShotQueue,
  buildSpecialReachabilityContract,
  calculateStructuralCollapseRatio,
  estimateSpecialBirdReach,
  evaluateSpecialObjective,
  generateSpecialLevel,
  platformMotionEnvelope,
} from '../src/special-levels.js'

function targetHasInitialSupport(target, blocks) {
  if (target.variant === 'glider') return true
  const radius = target.size * 0.78
  if (Math.abs(target.y + radius - 520) <= 0.5) return true
  return blocks.some((block) => {
    if (block.width <= block.height) return false
    const top = block.y - block.height / 2
    const horizontalOverlap = target.x + radius * 0.55 >= block.x - block.width / 2
      && target.x - radius * 0.55 <= block.x + block.width / 2
    return horizontalOverlap && Math.abs(target.y + radius - top) <= 0.5
  })
}

test('all twenty authored stages compile into deterministic playable blueprints', () => {
  const layoutSignatures = new Set()
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      const options = { campaignId: campaign.id, stageNumber: stage.number, runSeed: 20260824, lucky: true }
      const first = generateSpecialLevel(options)
      const second = generateSpecialLevel(options)
      assert.deepEqual(first, second)
      assert.notEqual(first.blocks, second.blocks)
      assert.equal(first.mode, 'special')
      assert.equal(first.stageId, stage.id)
      assert.deepEqual(first.briefing, campaign.briefing)
      assert.equal(first.tutorialStage, stage.number === 1)
      assert.equal(first.objectiveChallenge, stage.objective.challenge || null)
      assert.deepEqual(first.bossPhases, stage.encounter.bossPhases || [])
      assert.equal(first.targets.length, stage.encounter.targetCount)
      assert.equal(first.birdsAvailable + 1, stage.objective.shotLimit)
      assert.deepEqual(first.birdTypes, stage.availableBirdTypes)
      assert.ok(first.blocks.length > 0)
      assert.ok(first.targets.every((target) => Number.isFinite(target.x) && Number.isFinite(target.y)))
      assert.ok(first.targets.every((target) => campaign.enemyVariants.includes(target.variant)))
      assert.ok(first.targets.every((target) => target.x > 480 && target.x < 1350))
      assert.ok(first.targets.every((target) => targetHasInitialSupport(target, first.blocks)))
      assert.ok(first.platforms.every((platform) => (
        first.blocks.every((block) => !rectsOverlap(platform, block))
      )))
      assert.equal(first.reachability.deadlockFree, true)
      assert.ok(first.reachability.minimumGuaranteedShots >= 1)
      assert.ok(stage.availableBirdTypes.includes(first.reachability.guaranteedBirdType))
      assert.ok(first.rules.every(Boolean))
      layoutSignatures.add(JSON.stringify(first.blocks.map((block) => [block.x, block.y, block.width, block.height])))
      const runtimeBlocks = first.blocks.map((block, index) => ({
        ...block,
        id: `special-${index}`,
        rotation: Number.isFinite(block.rotation) ? block.rotation : 0,
        structuralRestRotation: Number.isFinite(block.structuralRestRotation)
          ? block.structuralRestRotation
          : (Number.isFinite(block.rotation) ? block.rotation : 0),
      }))
      const stability = analyzeStructureStability(runtimeBlocks, [], {
        groundY: 520, contactTolerance: 4, angleTolerance: 2, edgeInset: 1,
      })
      assert.equal(stability.unstableIds.size, 0)
    }
  }
  assert.equal(layoutSignatures.size, 20)
})

test('五个首遇关都保底专属橡宝第一发，且几何教学契约通过', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const runSeed of [1, 34, 233]) {
      const level = generateSpecialLevel({ campaignId: campaign.id, stageNumber: 1, runSeed })
      const queue = buildSpecialShotQueue({
        birdTypes: level.birdTypes,
        signatureBirdType: campaign.signatureBird.id,
        totalShots: level.objective.shotLimit,
        seed: runSeed,
      })
      assert.equal(queue[0], campaign.signatureBird.id)
      assert.equal(level.tutorialContract.firstShotBirdType, campaign.signatureBird.id)
      assert.equal(level.tutorialContract.passed, true, `${campaign.id}/${runSeed}`)
      assert.ok(level.tutorialContract.checks.every((entry) => entry.passed))
      assert.ok(level.tutorialTargets.length >= 1)
      assert.deepEqual(level.tutorialTargets, level.tutorialContract.targets)
    }
  }
})

test('霜铃首关在一次霜环内布置三块真实冰材教学簇', () => {
  const level = generateSpecialLevel({ campaignId: 'polar-clocktower', stageNumber: 1, runSeed: 89 })
  const { activationPoint, radius } = level.tutorialContract
  const cluster = level.blocks.filter((block) => block.tutorialFrostTarget)
  assert.equal(cluster.length, 3)
  assert.ok(cluster.every((block) => block.type === 'ice'))
  assert.ok(cluster.every((block) => (
    Math.hypot(block.x - activationPoint.x, block.y - activationPoint.y) <= radius
  )))
  assert.ok(new Set(cluster.map((block) => `${block.x}:${block.y}`)).size === 3)
})

test('藤索首关的叶纹浮筏横梁是范围内唯一且最近的抓取目标', () => {
  const level = generateSpecialLevel({ campaignId: 'tidebound-undercity', stageNumber: 1, runSeed: 55 })
  const targets = level.blocks.filter((block) => block.tutorialTetherTarget)
  assert.equal(targets.length, 1)
  assert.equal(targets[0].role, 'tutorial-raft-beam')
  assert.ok(targets[0].width > targets[0].height)
  assert.equal(level.rules.some((rule) => rule.id === 'tide-raft-platform'), false)
  assert.equal(level.platforms.length, 0)
  const { activationPoint, range } = level.tutorialContract
  const ordered = level.blocks.map((block) => ({
    block,
    distance: Math.hypot(block.x - activationPoint.x, block.y - activationPoint.y),
  })).sort((first, second) => first.distance - second.distance)
  assert.equal(ordered[0].block, targets[0])
  assert.ok(ordered[0].distance <= range)
  assert.ok(ordered[1].distance - ordered[0].distance >= 8)

  for (const runSeed of [1, 13, 55, 89, 233, 923, 0xffffffff]) {
    const seeded = generateSpecialLevel({
      campaignId: 'tidebound-undercity', stageNumber: 1, runSeed,
    })
    const selection = selectVineWinchTarget({
      origin: seeded.tutorialContract.activationPoint,
      blocks: seeded.blocks,
      platforms: seeded.platforms,
      range: SPECIAL_ACORN_BY_TYPE.vine.ability.range,
    })
    assert.equal(selection?.target?.tutorialTetherTarget, true, `seed ${runSeed}`)
  }
})

test('回旋首关只留一面折返镜且不投放假身，假身延后到高阶关', () => {
  const tutorial = generateSpecialLevel({ campaignId: 'mirrorwood-labyrinth', stageNumber: 1, runSeed: 13 })
  const surfaces = [
    ...tutorial.blocks.filter((block) => block.reflective),
    ...tutorial.platforms.filter((platform) => platform.reflective),
  ]
  const target = tutorial.targets.find((entry) => entry.tutorialReturnTarget)
  assert.equal(surfaces.length, 1)
  assert.equal(tutorial.decoys.length, 0)
  assert.ok(target)
  assert.ok(target.x < surfaces[0].x && surfaces[0].x < tutorial.tutorialContract.turnPoint.x)
  const later = generateSpecialLevel({ campaignId: 'mirrorwood-labyrinth', stageNumber: 3, runSeed: 13 })
  assert.ok(later.decoys.length >= 3)
  assert.ok(later.rules.some((rule) => rule.id === 'mirror-false-image'))
})

test('钻岩首关给出同一 X 轴的三层高耐久石制根壁，不被脆弱支点覆盖', () => {
  const level = generateSpecialLevel({ campaignId: 'deep-root-fault', stageNumber: 1, runSeed: 21 })
  const layers = level.blocks.filter((block) => block.tutorialDrillLayer)
  assert.equal(layers.length, 3)
  assert.equal(new Set(layers.map((block) => block.x)).size, 1)
  assert.equal(new Set(layers.map((block) => block.y)).size, 3)
  assert.ok(layers.every((block) => block.type === 'stone' && block.hp >= 8))
  assert.ok(layers.every((block) => block.rootWall && !block.critical))
  assert.ok(level.tutorialContract.activationPoint.y < Math.min(...layers.map((block) => block.y - block.height / 2)))
})

test('震地首关有无挡板高抛下落通道，落点一次覆盖两枚锚点且无全局横风', () => {
  const level = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 1, runSeed: 144 })
  const { activationPoint, impactPoint, shockRadius, corridorWidth } = level.tutorialContract
  const anchors = level.blocks.filter((block) => block.tutorialShockAnchor)
  assert.equal(level.windX, 0)
  assert.equal(anchors.length, 2)
  assert.ok(anchors.every((block) => (
    Math.hypot(block.x - impactPoint.x, block.y - impactPoint.y) <= shockRadius
  )))
  assert.ok(impactPoint.y - activationPoint.y >= level.tutorialContract.minimumDropHeight)
  const halfWidth = corridorWidth / 2
  assert.ok(level.blocks.every((block) => (
    block.x + block.width / 2 <= impactPoint.x - halfWidth
      || block.x - block.width / 2 >= impactPoint.x + halfWidth
      || block.y - block.height / 2 >= impactPoint.y - 12
  )))
  assert.equal(level.platforms.length, 0)
  assert.ok(level.rules.some((rule) => rule.id === 'storm-updraft'))
})

test('all stages mix materials and mirrorwood exposes ice, stone, and real mirror surfaces', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      for (const runSeed of [1, 7, 37]) {
        const level = generateSpecialLevel({
          campaignId: campaign.id,
          stageNumber: stage.number,
          runSeed,
        })
        assert.ok(level.blocks.some((block) => block.type !== 'wood'), `${stage.id}/${runSeed}`)
        if (campaign.id !== 'mirrorwood-labyrinth') continue
        assert.ok(level.blocks.some((block) => block.type === 'ice'), `${stage.id}/${runSeed}/ice`)
        assert.ok(level.blocks.some((block) => block.type === 'stone'), `${stage.id}/${runSeed}/stone`)
        assert.ok(level.blocks.some((block) => (
          block.reflective === true && block.surfaceMaterial === 'mirror'
        )), `${stage.id}/${runSeed}/mirror`)
      }
    }
  }
})

test('high-collapse profiles preserve material quotas while exposing deliberate ground fuses', () => {
  const cases = [
    { campaignId: 'polar-clocktower', stageNumber: 2 },
    { campaignId: 'mirrorwood-labyrinth', stageNumber: 3 },
  ]
  for (const authored of cases) {
    for (const runSeed of [1, 34, 233]) {
      const level = generateSpecialLevel({ ...authored, runSeed })
      const groundSupports = level.blocks.filter((block) => (
        block.role === 'post' && Math.abs(block.y + block.height / 2 - 520) <= 4
      ))
      const groundStones = groundSupports.filter((block) => block.type === 'stone')
      const maximumGroundStones = Math.max(
        1,
        Math.floor(groundSupports.length * (1 - level.objective.requiredCollapseRatio)),
      )
      assert.ok(groundStones.length <= maximumGroundStones, `${level.stageId}/${runSeed}`)
      assert.ok(level.blocks.some((block) => block.collapseFuse || block.critical), `${level.stageId}/${runSeed}/fuse`)
      assert.ok(level.blocks.some((block) => block.type === 'stone'), `${level.stageId}/${runSeed}/stone`)
      assert.ok(level.blocks.some((block) => block.type === 'ice'), `${level.stageId}/${runSeed}/ice`)
      assert.ok(level.blocks.filter((block) => block.relocatedMasonry).every((block) => block.role === 'post'))
    }
  }
})

test('special magazines repeat complete role coverage instead of rolling duplicate filler shots', () => {
  const queue = buildSpecialShotQueue({
    birdTypes: ['boomerang', 'red', 'split'],
    signatureBirdType: 'boomerang',
    totalShots: 8,
    seed: 89,
  })
  assert.equal(queue[0], 'boomerang')
  assert.deepEqual(new Set(queue.slice(0, 3)), new Set(['boomerang', 'red', 'split']))
  assert.deepEqual(new Set(queue.slice(3, 6)), new Set(['boomerang', 'red', 'split']))
  const counts = ['boomerang', 'red', 'split'].map((type) => queue.filter((entry) => entry === type).length)
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1)
})

test('machine-readable objective challenges and boss phase contracts survive level compilation', () => {
  const authoredChallengeKinds = new Set()
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      const level = generateSpecialLevel({ campaignId: campaign.id, stageNumber: stage.number, runSeed: 13 })
      if (stage.objective.challenge) {
        authoredChallengeKinds.add(level.objectiveChallenge.kind)
        assert.equal(level.objectiveChallenge.requiredForClear, false)
        assert.equal(level.objectiveChallenge.parameters.metric.includes('-'), true)
        assert.deepEqual(level.objectiveMarkers, buildSpecialObjectiveMarkers({
          stage,
          blocks: level.blocks,
          targets: level.targets,
          platforms: level.platforms,
          decoys: level.decoys,
        }))
        if (level.objectiveChallenge.kind !== 'score-rush') {
          assert.ok(level.objectiveMarkers.length >= 2, `${stage.id}/markers`)
          assert.ok(level.objectiveMarkers.every((marker) => marker.entityIndex >= 0))
        }
        if (level.objectiveChallenge.kind === 'ordered-demolition') {
          assert.deepEqual(
            [...new Set(level.objectiveMarkers.map((marker) => marker.sequenceIndex))]
              .sort((first, second) => first - second),
            level.objectiveChallenge.parameters.sequence.map((_, index) => index),
          )
          for (const [index, tag] of level.objectiveChallenge.parameters.sequence.entries()) {
            assert.ok(level.objectiveMarkers.some((marker) => (
              marker.tag === tag && marker.sequenceIndex === index
            )), `${stage.id}/${tag}`)
          }
        }
      }
      if (stage.objective.type === 'defeat-boss') {
        assert.equal(level.bossPhases.length, 2)
        assert.ok(level.bossPhases[0].hpThreshold > level.bossPhases[1].hpThreshold)
        assert.ok(level.bossPhases.every((phase) => phase.activateRuleIds.every((id) => (
          level.rules.some((rule) => rule.id === id)
        ))))
      } else {
        assert.deepEqual(level.bossPhases, [])
      }
    }
  }
  assert.deepEqual(authoredChallengeKinds, new Set([
    'ordered-demolition', 'precision-strike', 'score-rush', 'identify-target',
  ]))
})

test('秘境契约编译为可识别的弱点、完整分组与真对角锚点', () => {
  for (const runSeed of [1, 2, 7, 19, 43, 97]) {
    const polar = generateSpecialLevel({
      campaignId: 'polar-clocktower', stageNumber: 3, runSeed,
    })
    const precisionWeights = polar.blocks.filter((block) => block.precisionWeakPoint)
    assert.equal(precisionWeights.length, 2, `polar/${runSeed}/weak-points`)
    assert.ok(precisionWeights.every((block) => (
      block.counterweight && block.objectiveTags?.includes('counterweight')
    )), `polar/${runSeed}/weak-point-tags`)
    assert.match(polar.objectiveChallenge.description, /强动力/u)

    const tide = generateSpecialLevel({
      campaignId: 'tidebound-undercity', stageNumber: 3, runSeed,
    })
    const floats = tide.blocks.filter((block) => block.weakFloat)
    assert.ok(floats.length >= 2, `tide/${runSeed}/float-count`)
    assert.ok(floats.every((block) => block.objectiveTags?.includes('weak-floats')),
      `tide/${runSeed}/float-group`)
    const ballasts = tide.blocks.filter((block) => (
      block.ballast && block.objectiveTags?.includes('stone-ballast')
    ))
    assert.ok(ballasts.length >= 2 && ballasts.length <= 3, `tide/${runSeed}/ballast-count`)
    assert.ok(ballasts.every((block) => block.type === 'stone'), `tide/${runSeed}/ballast-material`)
    assert.equal(
      tide.objectiveMarkers.filter((marker) => marker.tag === 'weak-floats').length,
      floats.length,
    )
    assert.equal(
      tide.objectiveMarkers.filter((marker) => marker.tag === 'stone-ballast').length,
      ballasts.length,
    )

    const storm = generateSpecialLevel({
      campaignId: 'stormline-skyport', stageNumber: 2, runSeed,
    })
    const upperLeft = storm.blocks.find((block) => block.precisionAnchorCorner === 'upper-left')
    const lowerRight = storm.blocks.find((block) => block.precisionAnchorCorner === 'lower-right')
    assert.ok(upperLeft && lowerRight, `storm/${runSeed}/diagonal-corners`)
    assert.ok(upperLeft.x < lowerRight.x, `storm/${runSeed}/left-right`)
    assert.ok(upperLeft.y < lowerRight.y, `storm/${runSeed}/upper-lower`)
    assert.ok(upperLeft.objectiveTags?.includes('cable-anchor-diagonal'))
    assert.ok(lowerRight.objectiveTags?.includes('cable-anchor-diagonal'))
  }

  const stormEye = generateSpecialLevel({
    campaignId: 'stormline-skyport', stageNumber: 3, runSeed: 1,
  })
  assert.equal(
    stormEye.rules.find((rule) => rule.id === 'storm-lightning-pulse')?.parameters.intervalTicks,
    300,
  )
})

test('秘境移动挡板的完整运动包络不与建筑相交', () => {
  const expectedVisualKinds = new Map([
    ['polar-clocktower', 'clock-pendulum'],
    ['tidebound-undercity', 'buoyant-raft'],
    ['mirrorwood-labyrinth', 'mirror-gate'],
    ['deep-root-fault', 'mine-cart'],
    ['stormline-skyport', 'skyport-deck'],
  ])
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      for (const runSeed of [1, 2, 7, 19, 43, 97]) {
        const level = generateSpecialLevel({
          campaignId: campaign.id,
          stageNumber: stage.number,
          runSeed,
        })
        for (let platformIndex = 0; platformIndex < level.platforms.length; platformIndex += 1) {
          const platform = level.platforms[platformIndex]
          assert.equal(platform.blocksBirds, true)
          assert.equal(platform.affectsStructures, false)
          assert.equal(platform.specialVisualKind, expectedVisualKinds.get(campaign.id))
          assert.deepEqual(platform.motionEnvelope, platformMotionEnvelope(platform))
          const envelope = platformMotionEnvelope(platform)
          assert.ok(envelope.x - envelope.width / 2 >= 360, `${stage.id}/${runSeed}/left`)
          assert.ok(envelope.x + envelope.width / 2 <= 1400, `${stage.id}/${runSeed}/right`)
          assert.ok(envelope.y - envelope.height / 2 >= 68, `${stage.id}/${runSeed}/top`)
          assert.ok(envelope.y + envelope.height / 2 <= 516, `${stage.id}/${runSeed}/bottom`)
          assert.ok(level.blocks.every((block) => !rectsOverlap(envelope, block)), `${stage.id}/${runSeed}`)
          assert.ok(level.platforms.slice(0, platformIndex).every((other) => (
            !rectsOverlap(envelope, platformMotionEnvelope(other))
          )), `${stage.id}/${runSeed}/platform-${platformIndex}`)
          for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
            const sample = {
              ...platform,
              x: Math.abs(platform.velocityX) > 0.001
                ? platform.minX + (platform.maxX - platform.minX) * ratio
                : platform.x,
              y: Math.abs(platform.velocityY) > 0.001
                ? platform.minY + (platform.maxY - platform.minY) * ratio
                : platform.y,
            }
            assert.ok(level.blocks.every((block) => !rectsOverlap(sample, block)), `${stage.id}/${runSeed}/${ratio}`)
          }
        }
      }
    }
  }
})

test('秘境挡板节奏保留空白关、单机关首遇与后期增量', () => {
  const expectedCounts = new Map([
    ['polar-clocktower', [0, 0, 1, 2]],
    ['tidebound-undercity', [0, 1, 0, 2]],
    ['mirrorwood-labyrinth', [0, 1, 1, 0]],
    ['deep-root-fault', [0, 1, 0, 3]],
    ['stormline-skyport', [0, 3, 0, 2]],
  ])
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const runSeed of [1, 2, 7, 19, 43, 97, 233]) {
      const counts = campaign.stages.map((stage) => generateSpecialLevel({
        campaignId: campaign.id,
        stageNumber: stage.number,
        runSeed,
      }).platforms.length)
      assert.deepEqual(counts, expectedCounts.get(campaign.id), `${campaign.id}/${runSeed}`)
    }
  }

  const rootLesson = generateSpecialLevel({ campaignId: 'deep-root-fault', stageNumber: 2, runSeed: 13 })
  assert.deepEqual(rootLesson.objectiveMarkers.map((marker) => marker.entityKind), ['platform', 'block'])
  assert.deepEqual(rootLesson.objectiveMarkers.map((marker) => marker.tag), ['rail-cart', 'center-support'])
  const stormLesson = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 1, runSeed: 13 })
  const stormApplication = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 2, runSeed: 13 })
  assert.equal(stormLesson.platforms.length, 0)
  assert.equal(stormLesson.blocks.filter((block) => block.tutorialShockAnchor).length, 2)
  assert.equal(stormApplication.platforms.length, 3)
  assert.ok(stormApplication.platforms.every((platform) => platform.cablePlatform))
})

test('二十个秘境都暴露可达性契约且保底橡宝能作用于最远目标', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      for (const runSeed of [1, 11, 37, 69]) {
        const level = generateSpecialLevel({ campaignId: campaign.id, stageNumber: stage.number, runSeed })
        const contract = level.reachability
        assert.equal(contract.deadlockFree, true, `${stage.id}/${runSeed}`)
        assert.ok(contract.targetCapableBirdTypes.includes(contract.guaranteedBirdType))
        assert.ok(contract.structureCapableBirdTypes.length >= 1)
        assert.ok(
          contract.reaches[contract.guaranteedBirdType].directDamageReachX >= contract.requiredReachX,
          `${stage.id}/${runSeed}`,
        )
        const queue = buildSpecialShotQueue({
          birdTypes: stage.availableBirdTypes,
          signatureBirdType: campaign.signatureBird.id,
          totalShots: stage.objective.shotLimit,
          seed: runSeed,
        })
        assert.equal(queue[0], campaign.signatureBird.id)
        assert.ok(stage.availableBirdTypes.every((type) => queue.includes(type)))
        assert.ok(queue.slice(0, contract.minimumGuaranteedShots).includes(contract.guaranteedBirdType))
        assert.ok(queue.some((type) => contract.targetCapableBirdTypes.includes(type)))
        assert.deepEqual(contract, buildSpecialReachabilityContract({
          stage,
          campaign,
          targets: level.targets,
          rules: level.rules,
          windX: level.windX,
        }))
      }
    }
  }
})

test('震地橡宝在断缆风廊最强逆风下仍有直达射程余量', () => {
  const storm = SPECIAL_CAMPAIGNS.find((campaign) => campaign.id === 'stormline-skyport')
  const updraft = storm.mapRules.find((rule) => rule.id === 'storm-updraft')
  const quake = estimateSpecialBirdReach('quake', { windX: -0.077, updraft })
  assert.ok(quake.groundReachX >= 1_190)
  assert.ok(quake.interactionReachX >= 1_320)
  assert.ok(quake.bestPullDegrees > 130 && quake.bestPullDegrees < 150)
})

test('增强后的发射弹力在运行时与秘境射程合约中保持一致', () => {
  assert.equal(Number((MAX_PULL * POWER).toFixed(2)), 31.27)

  const ordinary = estimateSpecialBirdReach('red')
  const slowerVine = estimateSpecialBirdReach('vine')
  assert.ok(ordinary.groundReachX >= 1_580 && ordinary.groundReachX <= 1_600)
  assert.ok(slowerVine.groundReachX >= 1_430 && slowerVine.groundReachX <= 1_450)
  assert.ok(ordinary.bestPullDegrees > 130 && ordinary.bestPullDegrees < 150)
  assert.ok(slowerVine.bestPullDegrees > 130 && slowerVine.bestPullDegrees < 150)
})

test('秘境挡板交互标记被运行时结构求解器消费', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.ok(runtime.includes('platform.affectsStructures !== false'))
  assert.ok(runtime.includes('platform.blocksBirds === false'))
  assert.ok(runtime.includes('resolveBirdPlatformCollision(bird, platform)'))
  assert.ok(runtime.includes('resolveBirdPlatformPartCollision(bird, rectangle'))
  assert.ok(runtime.includes('resolveSweptCircleRectCollision(collider, rectangle'))
  assert.ok(runtime.includes('bird.previousX = bird.x'))
  assert.ok(runtime.includes('destructiblePlatformCarrierHitboxes(platform)'))
  assert.ok(runtime.includes("this.applyPlatformDamage(platform, { target: 'board', damage })"))
  assert.ok(runtime.includes("target: 'carrier', carrierIndex: carrier.carrierIndex, damage"))
  assert.ok(runtime.includes('circleLandsOnPlatform(bird, platform'))
})

test('final stages promote the authored special squirrel to an elite objective', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const stage = campaign.stages.at(-1)
    const level = generateSpecialLevel({ campaignId: campaign.id, stageNumber: stage.number, runSeed: 7 })
    assert.equal(level.isBossLevel, true)
    assert.equal(level.targets[0].boss, true)
    assert.equal(level.targets[0].variant, stage.encounter.bossVariant)
    assert.ok(level.targets[0].hp >= 4)
  }
})

test('special material and platform modifiers change the base encounter contract', () => {
  const polar = generateSpecialLevel({ campaignId: 'polar-clocktower', stageNumber: 3, runSeed: 2 })
  assert.ok(polar.blocks.some((block) => block.type === 'ice'))
  assert.ok(polar.platforms.length >= 1)
  assert.ok(polar.blocks.some((block) => block.counterweight && block.type === 'stone'))
  const polarGate = generateSpecialLevel({ campaignId: 'polar-clocktower', stageNumber: 1, runSeed: 2 })
  assert.equal(polarGate.blocks.filter((block) => block.reinforcedSupport).length, 5)
  const rootFinale = generateSpecialLevel({ campaignId: 'deep-root-fault', stageNumber: 4, runSeed: 2 })
  assert.equal(rootFinale.platforms.length, 3)
  const rootEntrance = generateSpecialLevel({ campaignId: 'deep-root-fault', stageNumber: 1, runSeed: 2 })
  assert.ok(rootEntrance.blocks.some((block) => block.critical))
  assert.equal(rootEntrance.blocks.filter((block) => block.rootWall).length, 3)
  const mirrorCorridor = generateSpecialLevel({ campaignId: 'mirrorwood-labyrinth', stageNumber: 3, runSeed: 2 })
  assert.ok(mirrorCorridor.decoys.length >= 3)
  assert.ok(mirrorCorridor.platforms.some((platform) => Math.abs(platform.rotation) === 15))
  const stormCargo = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 1, runSeed: 2 })
  assert.ok(stormCargo.blocks.some((block) => block.cableAnchor && block.critical))
  assert.equal(stormCargo.platforms.length, 0)
  const stormBridge = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 2, runSeed: 2 })
  assert.equal(stormBridge.platforms.length, 3)
  assert.ok(stormBridge.blocks.filter((block) => block.cableAnchor).length >= 6)
  assert.ok(stormBridge.platforms.every((platform) => platform.cablePlatform))
  const stormEye = generateSpecialLevel({ campaignId: 'stormline-skyport', stageNumber: 3, runSeed: 2 })
  assert.equal(stormEye.blocks.filter((block) => block.lightningRod).length, 5)
  assert.equal(stormEye.platforms.length, 0)
  assert.throws(() => generateSpecialLevel({ campaignId: 'missing', stageNumber: 1 }), /Unknown special stage/u)
})

test('structural collapse counts removed, displaced, and tilted blocks instead of damage alone', () => {
  const standing = { x: 100, y: 400, rotation: 0, initialX: 100, initialY: 400, initialRotation: 0 }
  const damagedButStanding = { ...standing, hp: 1 }
  const displaced = { ...standing, x: 132 }
  const tilted = { ...standing, rotation: 24 }
  assert.equal(blockCountsAsCollapsed(standing), false)
  assert.equal(blockCountsAsCollapsed(damagedButStanding), false)
  assert.equal(blockCountsAsCollapsed(displaced), true)
  assert.equal(blockCountsAsCollapsed(tilted), true)
  assert.equal(calculateStructuralCollapseRatio(5, [standing, damagedButStanding, displaced, tilted]), 0.6)
})

test('collapse objectives require both cleared targets and a fallen structure', () => {
  const standing = { x: 0, y: 0, rotation: 0, initialX: 0, initialY: 0, initialRotation: 0 }
  const fallen = { ...standing, rotation: 30 }
  const objective = { type: 'collapse-and-clear', requiredCollapseRatio: 0.5, parScore: 9000 }
  const blockedByTarget = evaluateSpecialObjective({
    objective, initialBlockCount: 2, blocks: [standing, fallen], remainingTargetCount: 1, stageScore: 9500,
  })
  assert.equal(blockedByTarget.met, false)
  assert.equal(blockedByTarget.collapseMet, true)
  const blockedByStructure = evaluateSpecialObjective({
    objective, initialBlockCount: 2, blocks: [standing, standing], remainingTargetCount: 0, stageScore: 9500,
  })
  assert.equal(blockedByStructure.met, false)
  assert.equal(blockedByStructure.targetsMet, true)
  const cleared = evaluateSpecialObjective({
    objective, initialBlockCount: 2, blocks: [standing, fallen], remainingTargetCount: 0, stageScore: 8500,
  })
  assert.equal(cleared.met, true)
  assert.equal(cleared.parScoreMet, false)
})

test('authored collapse thresholds apply even when a stage labels target elimination first', () => {
  const standing = { x: 0, y: 0, rotation: 0, initialX: 0, initialY: 0, initialRotation: 0 }
  const result = evaluateSpecialObjective({
    objective: { type: 'eliminate-all', requiredCollapseRatio: 0.4 },
    initialBlockCount: 2,
    blocks: [standing, standing],
    remainingTargetCount: 0,
  })
  assert.equal(result.targetsMet, true)
  assert.equal(result.collapseMet, false)
  assert.equal(result.met, false)
})

test('new challenge objective types retain safe clear-target and collapse fallbacks', () => {
  const standing = { x: 0, y: 0, rotation: 0, initialX: 0, initialY: 0, initialRotation: 0 }
  const fallen = { ...standing, rotation: 30 }
  for (const type of ['precision-strike', 'score-rush', 'identify-target', 'ordered-demolition']) {
    const result = evaluateSpecialObjective({
      objective: { type, requiredCollapseRatio: 0.5, parScore: 9_000 },
      initialBlockCount: 2,
      blocks: [standing, fallen],
      remainingTargetCount: 0,
      stageScore: 9_000,
    })
    assert.equal(result.type, type)
    assert.equal(result.targetsMet, true)
    assert.equal(result.collapseMet, true)
    assert.equal(result.parScoreMet, true)
    assert.equal(result.met, true)
  }
})
