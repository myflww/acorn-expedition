// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { GROUND_Y } from '../../src/game-core.js'
import { SPECIAL_CAMPAIGNS, getSpecialCampaign } from '../../src/special-campaigns.js'
import { buildSpecialShotQueue, generateSpecialLevel } from '../../src/special-levels.js'

export const SPECIAL_FEASIBILITY_CONTRACT_VERSION = 2

/**
 * A deliberately varied, stable sample. These are run seeds, not compiled
 * stage seeds, so failures can be reproduced through generateSpecialLevel().
 */
export const DEFAULT_SPECIAL_FEASIBILITY_SEEDS = Object.freeze([
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233,
])

/**
 * Upper-bound action budgets used by the conservative deadlock detector.
 *
 * This table is NOT a physics simulation and does not promise that a player
 * can realise every point. It answers the narrower question: "even with a
 * competent use of this magazine, is there enough authored resource to make
 * the objective plausible?" A stage only fails when it exceeds this generous
 * ceiling, which keeps the contract conservative about declaring deadlocks.
 *
 * targetDirect: direct or repeat-path damage that can be aimed at targets.
 * targetArea: target damage exposed by an active area ability.
 * targetIndirect: one-shot displacement/route leverage before falling debris.
 * supportDisruption: ground-support durability that can plausibly be removed,
 *                    pulled, pierced, made brittle, or shock-loaded.
 * bossDamage: damage that can be focused into one elite target.
 */
const BIRD_ACTION_BUDGETS = Object.freeze({
  red: Object.freeze({
    targetDirect: 1, targetArea: 0, targetIndirect: 0.5,
    supportDisruption: 3, bossDamage: 1,
    roles: Object.freeze(['direct']),
  }),
  bomb: Object.freeze({
    targetDirect: 2, targetArea: 6, targetIndirect: 0,
    supportDisruption: 12, bossDamage: 3,
    roles: Object.freeze(['direct', 'area', 'structure', 'armor']),
  }),
  split: Object.freeze({
    targetDirect: 1, targetArea: 2, targetIndirect: 0,
    supportDisruption: 6, bossDamage: 3,
    roles: Object.freeze(['direct', 'multi-path', 'structure']),
  }),
  dash: Object.freeze({
    targetDirect: 3, targetArea: 0, targetIndirect: 0,
    supportDisruption: 4, bossDamage: 3,
    roles: Object.freeze(['direct', 'armor', 'structure']),
  }),
  drill: Object.freeze({
    targetDirect: 2.3, targetArea: 0, targetIndirect: 1.6,
    supportDisruption: 15, bossDamage: 2.3,
    roles: Object.freeze(['direct', 'multi-path', 'structure', 'armor']),
  }),
  frost: Object.freeze({
    targetDirect: 0.8, targetArea: 0, targetIndirect: 0.2,
    supportDisruption: 4, bossDamage: 0.8,
    roles: Object.freeze(['direct', 'control', 'structure']),
  }),
  vine: Object.freeze({
    targetDirect: 0.75, targetArea: 0, targetIndirect: 1.75,
    supportDisruption: 8, bossDamage: 0.75,
    roles: Object.freeze(['direct', 'control', 'structure']),
  }),
  boomerang: Object.freeze({
    targetDirect: 1.125, targetArea: 0, targetIndirect: 1.375,
    supportDisruption: 6, bossDamage: 2.5,
    roles: Object.freeze(['direct', 'multi-path', 'armor', 'structure']),
  }),
  quake: Object.freeze({
    targetDirect: 1.35, targetArea: 3.75, targetIndirect: 0,
    supportDisruption: 16, bossDamage: 2.6,
    roles: Object.freeze(['direct', 'area', 'control', 'structure', 'armor']),
  }),
})

const FALLBACK_BUDGET = BIRD_ACTION_BUDGETS.red
const HIGH_COLLAPSE_RATIO = 0.4
const LARGE_ENCOUNTER_TARGET_COUNT = 5
const EPSILON = 1e-6

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function round(value, precision = 2) {
  const multiplier = 10 ** precision
  return Math.round((finite(value) + Number.EPSILON) * multiplier) / multiplier
}

function sum(values) {
  return values.reduce((total, value) => total + finite(value), 0)
}

function authoredStage(level) {
  if (level?.stage && level?.campaign) return { stage: level.stage, campaign: level.campaign }
  const campaign = getSpecialCampaign(level?.campaignId)
  const stage = campaign?.stages.find((candidate) => candidate.id === level?.stageId)
    || campaign?.stages.find((candidate) => candidate.number === level?.level)
  return { stage, campaign }
}

function isGroundSupport(block) {
  return finite(block?.height) > finite(block?.width)
    && Math.abs(finite(block?.y) + finite(block?.height) / 2 - GROUND_Y) <= 4
}

function queueRoleSet(queue) {
  const roles = new Set()
  for (const type of queue) {
    for (const role of (BIRD_ACTION_BUDGETS[type] || FALLBACK_BUDGET).roles) roles.add(role)
  }
  return roles
}

function failure(code, message, details = {}) {
  return { code, message, ...details }
}

function shotBudgetBreakdown(queue) {
  return queue.map((type, shotIndex) => {
    const budget = BIRD_ACTION_BUDGETS[type] || FALLBACK_BUDGET
    return {
      shotIndex,
      type,
      targetDirect: budget.targetDirect,
      targetArea: budget.targetArea,
      targetIndirect: budget.targetIndirect,
      supportDisruption: budget.supportDisruption,
      bossDamage: budget.bossDamage,
      roles: [...budget.roles],
    }
  })
}

/**
 * Builds a conservative feasibility contract for one already-generated secret
 * stage. It is a deterministic resource/deadlock audit, not an automatic
 * aiming solver and not proof of completion under the live physics engine.
 */
export function analyzeConservativeSpecialFeasibility(level, {
  runSeed = level?.seed ?? 1,
  shotQueue = null,
} = {}) {
  if (!level || typeof level !== 'object') throw new TypeError('level must be a generated special level')
  const { stage, campaign } = authoredStage(level)
  if (!stage || !campaign) throw new RangeError('level must reference an authored special campaign stage')

  const targetList = Array.isArray(level.targets) ? level.targets : []
  const blockList = Array.isArray(level.blocks) ? level.blocks : []
  const birdTypes = Array.isArray(level.birdTypes) && level.birdTypes.length
    ? [...new Set(level.birdTypes)]
    : [...new Set(stage.availableBirdTypes || [])]
  const shotLimit = Math.max(0, Math.floor(finite(stage.objective?.shotLimit, level.birdsAvailable + 1)))
  const queue = Array.isArray(shotQueue)
    ? shotQueue.slice(0, shotLimit)
    : [...buildSpecialShotQueue({
      birdTypes,
      signatureBirdType: campaign.signatureBird.id,
      totalShots: shotLimit,
      seed: runSeed,
    })]
  const breakdown = shotBudgetBreakdown(queue)
  const roles = queueRoleSet(queue)
  const failures = []

  const tutorial = level.tutorialStage === true ? level.tutorialContract : null
  if (level.tutorialStage === true && tutorial?.passed !== true) {
    failures.push(failure(
      'tutorial-geometry-contract',
      '首遇教学地图未通过专属能力几何契约。',
      {
        failedChecks: Array.isArray(tutorial?.checks)
          ? tutorial.checks.filter((entry) => !entry.passed).map((entry) => entry.id)
          : ['missing-contract'],
      },
    ))
  }

  const missingAuthoredTypes = birdTypes.filter((type) => !queue.includes(type))
  const queueCanCoverAllTypes = shotLimit >= birdTypes.length
  const targetCapableTypes = level.reachability?.targetCapableBirdTypes
    || level.reachability?.capableBirdTypes
    || birdTypes
  const reachableQueue = queue.filter((type) => targetCapableTypes.includes(type))
  if (queue.length !== shotLimit || shotLimit <= 0) {
    failures.push(failure(
      'magazine-size',
      `弹药队列仅有 ${queue.length} 枚，但关卡预算为 ${shotLimit} 枚。`,
      { actual: queue.length, required: shotLimit },
    ))
  }
  if (queueCanCoverAllTypes && missingAuthoredTypes.length) {
    failures.push(failure(
      'magazine-role-coverage',
      `弹药预算足够，但未保底出现：${missingAuthoredTypes.join('、')}。`,
      { missingTypes: missingAuthoredTypes },
    ))
  }
  if (!reachableQueue.length) {
    failures.push(failure(
      'no-target-reachable-shot',
      '弹药队列中没有任何一枚被射程契约判定为能作用于最远目标。',
      { capableTypes: targetCapableTypes, queue },
    ))
  }
  if (targetList.length >= LARGE_ENCOUNTER_TARGET_COUNT
    && !['area', 'multi-path', 'control'].some((role) => roles.has(role))) {
    failures.push(failure(
      'missing-crowd-answer',
      `关卡有 ${targetList.length} 个目标，但弹药中没有范围、多路径或控场角色。`,
      { targetCount: targetList.length },
    ))
  }

  const targetHp = sum(targetList.map((target) => target.hp))
  const targetDirect = sum(breakdown.map((entry) => entry.targetDirect))
  const targetArea = sum(breakdown.map((entry) => entry.targetArea))
  const targetIndirect = sum(breakdown.map((entry) => entry.targetIndirect))
  const stoneShare = blockList.length
    ? blockList.filter((block) => block.type === 'stone').length / blockList.length
    : 0
  // Gliders do not offer a dependable one-hit falling-debris window. Other
  // targets receive at most one such opportunity in this feasibility ceiling.
  const debrisEligibleTargets = targetList.filter((target) => target.variant !== 'glider').length
  const debrisDamagePerTarget = Math.min(2, 1.4 + stoneShare * 0.6)
  const fallingDebris = debrisEligibleTargets * debrisDamagePerTarget
  const targetDamageCeiling = targetDirect + targetArea + targetIndirect + fallingDebris
  if (targetDamageCeiling + EPSILON < targetHp) {
    failures.push(failure(
      'target-damage-budget',
      `目标总耐久 ${round(targetHp)} 高于弹药与一次坠物机会的保守能力上限 ${round(targetDamageCeiling)}。`,
      { actual: round(targetDamageCeiling), required: round(targetHp) },
    ))
  }

  const requiredCollapseRatio = Math.max(0, Math.min(1, finite(stage.objective?.requiredCollapseRatio)))
  const requiredCollapsedBlocks = blockList.length * requiredCollapseRatio
  const groundSupports = blockList.filter(isGroundSupport)
  const groundSupportHp = sum(groundSupports.map((block) => block.hp))
  const supportDisruption = sum(breakdown.map((entry) => entry.supportDisruption))
  const collapseBlockCeiling = requiredCollapseRatio <= 0
    ? blockList.length
    : Math.min(
      blockList.length,
      groundSupportHp > 0
        ? supportDisruption / groundSupportHp * blockList.length
        : supportDisruption,
    )
  if (requiredCollapseRatio >= HIGH_COLLAPSE_RATIO && !roles.has('structure')) {
    failures.push(failure(
      'missing-collapse-answer',
      `关卡要求 ${Math.round(requiredCollapseRatio * 100)}% \u574d塌，但弹药中没有结构干预角色。`,
      { requiredCollapseRatio },
    ))
  }
  if (collapseBlockCeiling + EPSILON < requiredCollapsedBlocks) {
    failures.push(failure(
      'collapse-capacity',
      `要求至少影响 ${round(requiredCollapsedBlocks)} 块建材，但支点干预上限仅约 ${round(collapseBlockCeiling)} 块。`,
      { actual: round(collapseBlockCeiling), required: round(requiredCollapsedBlocks) },
    ))
  }

  const boss = targetList.find((target) => target.boss) || null
  const bossPhases = Array.isArray(level.bossPhases) ? level.bossPhases : []
  const bossDamageCeiling = sum(breakdown.map((entry) => entry.bossDamage))
  const tacticalBossRoles = [...roles].filter((role) => role !== 'direct')
  if (stage.objective?.type === 'defeat-boss') {
    if (!boss) {
      failures.push(failure('missing-boss', 'Boss 目标未编译进关卡。'))
    }
    const minimumPhaseShots = bossPhases.length + 2
    if (shotLimit < minimumPhaseShots) {
      failures.push(failure(
        'boss-phase-window',
        `Boss 有 ${bossPhases.length} 个阶段，至少需 ${minimumPhaseShots} 枚弹药留出阶段应对窗口。`,
        { actual: shotLimit, required: minimumPhaseShots },
      ))
    }
    if (tacticalBossRoles.length < 2) {
      failures.push(failure(
        'boss-role-variety',
        'Boss 弹药只提供单一战术角色，无法应对分阶段规则。',
        { roles: [...roles] },
      ))
    }
    if (boss && bossDamageCeiling + EPSILON < finite(boss.hp)) {
      failures.push(failure(
        'boss-damage-budget',
        `Boss 耐久 ${round(boss.hp)} 高于队列可集中的伤害上限 ${round(bossDamageCeiling)}。`,
        { actual: round(bossDamageCeiling), required: round(boss.hp) },
      ))
    }
  }

  return deepFreeze({
    version: SPECIAL_FEASIBILITY_CONTRACT_VERSION,
    kind: 'conservative-resource-feasibility',
    disclaimer: '只筛查明显资源型死局；不是完整物理解算器，也不承诺实战必然通关。',
    campaignId: campaign.id,
    stageId: stage.id,
    runSeed,
    passed: failures.length === 0,
    failures,
    tutorial: tutorial ? {
      kind: tutorial.kind,
      passed: tutorial.passed,
      targetCount: tutorial.targets?.length || 0,
      failedChecks: tutorial.checks.filter((entry) => !entry.passed).map((entry) => entry.id),
    } : null,
    magazine: {
      shotLimit,
      queue,
      authoredTypes: birdTypes,
      missingAuthoredTypes,
      reachableShots: reachableQueue.length,
      roles: [...roles].sort(),
      breakdown,
    },
    targets: {
      count: targetList.length,
      totalHp: round(targetHp),
      directBudget: round(targetDirect),
      areaBudget: round(targetArea),
      indirectBudget: round(targetIndirect),
      debrisEligibleTargets,
      fallingDebrisBudget: round(fallingDebris),
      damageCeiling: round(targetDamageCeiling),
      margin: round(targetDamageCeiling - targetHp),
    },
    structure: {
      blockCount: blockList.length,
      groundSupportCount: groundSupports.length,
      groundSupportHp: round(groundSupportHp),
      requiredCollapseRatio: round(requiredCollapseRatio, 4),
      requiredCollapsedBlocks: round(requiredCollapsedBlocks),
      supportDisruptionBudget: round(supportDisruption),
      collapseBlockCeiling: round(collapseBlockCeiling),
      margin: round(collapseBlockCeiling - requiredCollapsedBlocks),
    },
    boss: {
      present: Boolean(boss),
      hp: round(boss?.hp),
      phaseCount: bossPhases.length,
      focusedDamageCeiling: round(bossDamageCeiling),
      tacticalRoles: tacticalBossRoles.sort(),
    },
  })
}

/** Audit one authored stage across stable run seeds and retain every reason. */
export function auditConservativeSpecialStage({
  campaignId,
  stageNumber,
  seeds = DEFAULT_SPECIAL_FEASIBILITY_SEEDS,
} = {}) {
  const campaign = getSpecialCampaign(campaignId)
  const stage = campaign?.stages.find((candidate) => candidate.number === stageNumber)
  if (!campaign || !stage) throw new RangeError(`Unknown special stage: ${campaignId}/${stageNumber}`)
  const cases = [...seeds].map((runSeed) => {
    const level = generateSpecialLevel({ campaignId, stageNumber, runSeed })
    return analyzeConservativeSpecialFeasibility(level, { runSeed })
  })
  const failures = cases.flatMap((entry) => entry.failures.map((reason) => ({
    runSeed: entry.runSeed,
    stageId: entry.stageId,
    ...reason,
  })))
  return deepFreeze({
    kind: 'conservative-stage-feasibility-audit',
    campaignId,
    stageId: stage.id,
    stageNumber,
    seedCount: cases.length,
    passed: failures.length === 0,
    failures,
    cases,
    worstMargins: {
      targetDamage: round(Math.min(...cases.map((entry) => entry.targets.margin))),
      collapsedBlocks: round(Math.min(...cases.map((entry) => entry.structure.margin))),
      bossDamage: round(Math.min(...cases.map((entry) => (
        entry.boss.present ? entry.boss.focusedDamageCeiling - entry.boss.hp : Number.POSITIVE_INFINITY
      )))),
    },
  })
}

/** Audit all 20 authored stages. The return value is suitable for CI output. */
export function auditAllConservativeSpecialStages({
  seeds = DEFAULT_SPECIAL_FEASIBILITY_SEEDS,
} = {}) {
  const stages = SPECIAL_CAMPAIGNS.flatMap((campaign) => campaign.stages.map((stage) => (
    auditConservativeSpecialStage({ campaignId: campaign.id, stageNumber: stage.number, seeds })
  )))
  const failures = stages.flatMap((stage) => stage.failures)
  return deepFreeze({
    kind: 'conservative-all-special-feasibility-audit',
    stageCount: stages.length,
    caseCount: stages.reduce((total, stage) => total + stage.seedCount, 0),
    passed: failures.length === 0,
    failureCount: failures.length,
    failures,
    stages,
  })
}
