// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import { generateSpecialLevel } from '../src/special-levels.js'
import {
  DEFAULT_SPECIAL_FEASIBILITY_SEEDS,
  SPECIAL_FEASIBILITY_CONTRACT_VERSION,
  analyzeConservativeSpecialFeasibility,
  auditAllConservativeSpecialStages,
  auditConservativeSpecialStage,
} from './helpers/special-playability.js'

test('20 个秘境在 12 个固定种子下均通过保守资源可行性契约', () => {
  const audit = auditAllConservativeSpecialStages()
  assert.equal(SPECIAL_CAMPAIGNS.length, 5)
  assert.equal(audit.stageCount, 20)
  assert.equal(DEFAULT_SPECIAL_FEASIBILITY_SEEDS.length, 12)
  assert.equal(audit.caseCount, 240)
  assert.equal(
    audit.passed,
    true,
    audit.failures.map((entry) => `${entry.stageId}/${entry.runSeed}: ${entry.message}`).join('\n'),
  )
  assert.deepEqual(audit.failures, [])
  assert.ok(audit.stages.every((stage) => stage.worstMargins.targetDamage >= 0))
  assert.ok(audit.stages.every((stage) => stage.worstMargins.collapsedBlocks >= 0))
  const tutorialStages = audit.stages.filter((stage) => stage.stageNumber === 1)
  assert.equal(tutorialStages.length, 5)
  assert.ok(tutorialStages.every((stage) => stage.cases.every((entry) => (
    entry.tutorial?.passed === true && entry.tutorial.targetCount >= 1
  ))))
})

test('保守可行性审计会拒绝专属教学几何退化', () => {
  const source = generateSpecialLevel({
    campaignId: 'deep-root-fault', stageNumber: 1, runSeed: 8,
  })
  const broken = {
    ...source,
    tutorialContract: {
      ...source.tutorialContract,
      passed: false,
      checks: source.tutorialContract.checks.map((entry, index) => (
        index === 0 ? { ...entry, passed: false } : entry
      )),
    },
  }
  const result = analyzeConservativeSpecialFeasibility(broken, { runSeed: 8 })
  assert.equal(result.passed, false)
  assert.ok(result.failures.some((entry) => entry.code === 'tutorial-geometry-contract'))
  assert.deepEqual(result.tutorial.failedChecks, ['signature-first-shot'])
})

test('新轮廓下的逆风刻度与无限回廊保留正向坍塌资源余量', () => {
  for (const [campaignId, stageNumber] of [
    ['polar-clocktower', 2],
    ['mirrorwood-labyrinth', 3],
  ]) {
    const audit = auditConservativeSpecialStage({ campaignId, stageNumber })
    assert.equal(audit.passed, true, audit.failures.map((entry) => entry.message).join('\n'))
    assert.equal(audit.seedCount, DEFAULT_SPECIAL_FEASIBILITY_SEEDS.length)
    assert.ok(audit.cases.every((entry) => entry.structure.margin > 0))
    assert.ok(audit.worstMargins.collapsedBlocks > 0)
  }
})

test('契约显式拆分弹药角色、目标耐久、范围能力、坠物与\u574d塌余量', () => {
  const level = generateSpecialLevel({
    campaignId: 'polar-clocktower',
    stageNumber: 3,
    runSeed: 34,
  })
  const result = analyzeConservativeSpecialFeasibility(level, { runSeed: 34 })
  assert.equal(result.version, SPECIAL_FEASIBILITY_CONTRACT_VERSION)
  assert.equal(result.kind, 'conservative-resource-feasibility')
  assert.match(result.disclaimer, /不是完整物理解算器/u)
  assert.equal(result.magazine.queue.length, level.objective.shotLimit)
  assert.ok(level.birdTypes.every((type) => result.magazine.queue.includes(type)))
  assert.ok(result.magazine.reachableShots >= 1)
  assert.ok(result.magazine.breakdown.every((shot) => Number.isFinite(shot.supportDisruption)))
  assert.ok(result.targets.totalHp > 0)
  assert.ok(result.targets.directBudget > 0)
  assert.ok(result.targets.areaBudget > 0)
  assert.ok(result.targets.fallingDebrisBudget > 0)
  assert.ok(result.targets.margin >= 0)
  assert.equal(result.structure.requiredCollapseRatio, level.objective.requiredCollapseRatio)
  assert.ok(result.structure.groundSupportCount >= 1)
  assert.ok(result.structure.margin >= 0)
  assert.equal(Object.isFrozen(result), true)
})

test('Boss 关会检查分阶段弹药窗口、战术角色与集中伤害', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const stage = campaign.stages.at(-1)
    const audit = auditConservativeSpecialStage({
      campaignId: campaign.id,
      stageNumber: stage.number,
      seeds: [2, 13, 89],
    })
    assert.equal(audit.passed, true, audit.failures.map((entry) => entry.message).join('\n'))
    for (const result of audit.cases) {
      assert.equal(result.boss.present, true)
      assert.equal(result.boss.phaseCount, 2)
      assert.ok(result.boss.focusedDamageCeiling >= result.boss.hp)
      assert.ok(result.boss.tacticalRoles.length >= 2)
    }
  }
})

test('人工构造的资源型死局会返回可诊断的全部失败原因', () => {
  const source = generateSpecialLevel({
    campaignId: 'polar-clocktower',
    stageNumber: 4,
    runSeed: 1,
  })
  const impossible = {
    ...source,
    birdTypes: ['red', 'bomb'],
    birdsAvailable: 0,
    reachability: { targetCapableBirdTypes: [] },
    targets: source.targets.map((target, index) => ({
      ...target,
      boss: index === 0,
      hp: index === 0 ? 50 : 12,
    })),
    blocks: source.blocks.map((block) => ({ ...block, hp: 50, type: 'stone' })),
  }
  const result = analyzeConservativeSpecialFeasibility(impossible, {
    runSeed: 1,
    shotQueue: ['red'],
  })
  const codes = new Set(result.failures.map((entry) => entry.code))
  assert.equal(result.passed, false)
  assert.ok(codes.has('magazine-size'))
  assert.ok(codes.has('magazine-role-coverage'))
  assert.ok(codes.has('no-target-reachable-shot'))
  assert.ok(codes.has('missing-crowd-answer'))
  assert.ok(codes.has('target-damage-budget'))
  assert.ok(codes.has('boss-role-variety'))
  assert.ok(codes.has('boss-damage-budget'))
  assert.ok(result.failures.every((entry) => entry.message.length > 0))
})

test('同一种子的可行性分析完全确定', () => {
  const options = { campaignId: 'stormline-skyport', stageNumber: 3, runSeed: 55 }
  const first = analyzeConservativeSpecialFeasibility(generateSpecialLevel(options), { runSeed: 55 })
  const second = analyzeConservativeSpecialFeasibility(generateSpecialLevel(options), { runSeed: 55 })
  assert.deepEqual(first, second)
})
