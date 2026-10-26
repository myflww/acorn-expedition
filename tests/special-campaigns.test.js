// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { MAIN_LEVELS } from '../src/game-core.js'
import { SPECIAL_ACORN_BY_TYPE, SPECIAL_SQUIRREL_BY_TYPE } from '../src/special-roster.js'
import {
  SPECIAL_CAMPAIGNS,
  SPECIAL_CAMPAIGN_COUNT,
  SPECIAL_CAMPAIGN_IDS,
  SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL,
  SPECIAL_STAGE_COUNT_PER_CAMPAIGN,
  SPECIAL_STAGE_IDS,
  SPECIAL_STAGE_TOTAL,
  getSpecialCampaign,
  getSpecialStage,
  isSpecialCampaignUnlocked,
  listUnlockedSpecialCampaigns,
  specialStageSeed,
  validateSpecialCampaigns,
} from '../src/special-campaigns.js'

test('five independent post-main campaigns each contain four high-difficulty stages', () => {
  assert.equal(SPECIAL_CAMPAIGN_COUNT, 5)
  assert.equal(SPECIAL_STAGE_COUNT_PER_CAMPAIGN, 4)
  assert.equal(SPECIAL_STAGE_TOTAL, 20)
  assert.equal(SPECIAL_CAMPAIGNS.length, 5)
  assert.equal(SPECIAL_STAGE_IDS.length, 20)
  assert.equal(new Set(SPECIAL_CAMPAIGN_IDS).size, 5)
  assert.equal(new Set(SPECIAL_STAGE_IDS).size, 20)

  for (const [campaignIndex, campaign] of SPECIAL_CAMPAIGNS.entries()) {
    assert.equal(campaign.order, campaignIndex + 1)
    assert.deepEqual(campaign.unlock, {
      kind: 'main-complete',
      requiredMainLevel: 18,
      prerequisiteCampaignIds: [],
    })
    assert.equal(campaign.stages.length, 4)
    assert.ok(campaign.story.opening.length > 45)
    assert.ok(campaign.story.ending.length > 35)
    assert.ok(campaign.stages.every((stage) => stage.difficulty >= 7))
    assert.ok(campaign.stages.every((stage, index) => index === 0
      || stage.difficulty >= campaign.stages[index - 1].difficulty))
    assert.equal(campaign.stages.at(-1).difficulty, 10)
  }
})

test('every campaign has a signature acorn, special squirrels, and machine-readable map art rules', () => {
  const signatureBirds = new Set()
  const enemyVariants = new Set()
  const backgrounds = new Set()

  for (const campaign of SPECIAL_CAMPAIGNS) {
    assert.ok(campaign.birdTypes.includes(campaign.signatureBird.id))
    assert.equal(campaign.signatureBird.name, SPECIAL_ACORN_BY_TYPE[campaign.signatureBird.id]?.title)
    assert.match(campaign.signatureBird.ability, /激活|接触/u)
    assert.ok(campaign.signatureBird.visualCue.length >= 14)
    signatureBirds.add(campaign.signatureBird.id)

    assert.equal(campaign.enemyVariants.length, 2)
    for (const enemyVariant of campaign.enemyVariants) {
      assert.equal(campaign.enemyProfiles[enemyVariant].name, SPECIAL_SQUIRREL_BY_TYPE[enemyVariant]?.title)
      assert.ok(campaign.enemyProfiles[enemyVariant].name)
      assert.ok(campaign.enemyProfiles[enemyVariant].behavior.length >= 20)
      enemyVariants.add(enemyVariant)
    }

    assert.equal(campaign.mapRules.length, 3)
    assert.ok(campaign.mapRules.every((entry) => Object.keys(entry.parameters).length > 0))
    assert.ok(campaign.theme.background.layers.length >= 4)
    assert.ok(Object.keys(campaign.theme.background.parameters).length >= 4)
    backgrounds.add(campaign.theme.background.id)

    const ruleIds = new Set(campaign.mapRules.map((entry) => entry.id))
    for (const stage of campaign.stages) {
      assert.ok(stage.activeRuleIds.every((id) => ruleIds.has(id)))
      assert.ok(stage.availableBirdTypes.every((id) => campaign.birdTypes.includes(id)))
      assert.ok(stage.layoutModifiers.length >= 3)
      assert.ok(stage.objective.shotLimit <= 5)
      assert.ok(stage.objective.parScore >= 7_500)
      assert.ok(stage.encounter.targetCount >= 6)
    }
  }

  assert.equal(signatureBirds.size, 5)
  assert.deepEqual(signatureBirds, new Set(['frost', 'vine', 'boomerang', 'drill', 'quake']))
  assert.deepEqual(enemyVariants, new Set(['shaman', 'shield', 'engineer', 'burrower', 'glider']))
  assert.equal(backgrounds.size, 5)
})

test('campaign briefings expose release-ready recommendation, rule, enemy, and material metadata', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const briefing = campaign.briefing
    assert.equal(briefing.recommendedOrder, campaign.order)
    assert.ok(briefing.difficulty.rating >= 7 && briefing.difficulty.rating <= 10)
    assert.ok(briefing.difficulty.label.length >= 2)
    assert.ok(briefing.difficulty.note.length >= 18)
    assert.deepEqual(
      new Set(briefing.enemyPreview.map((entry) => entry.type)),
      new Set(campaign.enemyVariants),
    )
    assert.ok(briefing.enemyPreview.every((entry) => entry.role.length >= 6))
    assert.ok(briefing.coreRuleIds.every((id) => campaign.mapRules.some((rule) => rule.id === id)))
    assert.ok(briefing.materialPalette.includes('wood'))
    assert.ok(briefing.materialPalette.length >= 3)
  }
  assert.deepEqual(
    SPECIAL_CAMPAIGNS.map((campaign) => campaign.briefing.recommendedOrder),
    [1, 2, 3, 4, 5],
  )
  assert.ok(SPECIAL_CAMPAIGNS.find((campaign) => campaign.id === 'mirrorwood-labyrinth')
    .briefing.materialPalette.includes('mirror-surface'))
})

test('stage objectives break the repeated clear-collapse-collapse-boss template', () => {
  const challengeTypes = new Set()
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const first = campaign.stages[0]
    assert.equal(first.tutorialStage, true)
    assert.ok(first.objective.shotLimit >= 5 || first.objective.requiredCollapseRatio <= 0.3)
    assert.ok(campaign.stages.slice(1).every((stage) => stage.tutorialStage !== true))
    assert.ok(new Set(campaign.stages.map((stage) => stage.objective.type)).size >= 3)
    assert.notDeepEqual(
      campaign.stages.map((stage) => stage.objective.type),
      ['eliminate-all', 'collapse-and-clear', 'collapse-and-clear', 'defeat-boss'],
    )
    for (const stage of campaign.stages) {
      if (!stage.objective.challenge) continue
      challengeTypes.add(stage.objective.challenge.kind)
      assert.equal(stage.objective.challenge.kind, stage.objective.type)
      assert.equal(stage.objective.challenge.requiredForClear, false)
      assert.ok(stage.objective.challenge.label.length >= 4)
      assert.ok(stage.objective.challenge.description.length >= 18)
      assert.ok(Object.keys(stage.objective.challenge.parameters).length >= 2)
    }
  }
  assert.deepEqual(challengeTypes, new Set([
    'ordered-demolition', 'precision-strike', 'score-rush', 'identify-target',
  ]))
})

test('秘境移动机关按战术价值分阶段投放，而非每关堆叠', () => {
  const expectedCounts = new Map([
    ['polar-clocktower', [0, 0, 1, 2]],
    ['tidebound-undercity', [0, 1, 0, 2]],
    ['mirrorwood-labyrinth', [0, 1, 1, 0]],
    ['deep-root-fault', [0, 1, 0, 3]],
    ['stormline-skyport', [0, 3, 0, 2]],
  ])
  const countKinds = ['platform-count', 'raft-count', 'cart-count', 'moving-mirror-count']
  const declaredCount = (campaign, stage) => {
    const activeRules = stage.activeRuleIds
      .map((id) => campaign.mapRules.find((rule) => rule.id === id))
      .filter(Boolean)
    if (!activeRules.some((rule) => rule.kind === 'moving-platform' || rule.kind === 'breakable-support')) return 0
    for (const kind of countKinds) {
      const value = stage.layoutModifiers.find((entry) => entry.kind === kind)?.value
      if (Number.isInteger(value)) return value
    }
    const anchors = stage.layoutModifiers.find((entry) => entry.kind === 'anchor-count')?.value
    return Number.isInteger(anchors) ? Math.max(1, Math.ceil(anchors / 2)) : 2
  }

  for (const campaign of SPECIAL_CAMPAIGNS) {
    const counts = campaign.stages.map((stage) => declaredCount(campaign, stage))
    assert.deepEqual(counts, expectedCounts.get(campaign.id), campaign.id)
    assert.equal(counts[0], 0, `${campaign.id}/signature tutorial must stay clear`)
    assert.ok(counts.filter((count) => count === 0).length >= 2, `${campaign.id}/quiet stages`)
    assert.ok(Math.max(...counts) <= 3, `${campaign.id}/platform cap`)
    const firstDeployment = campaign.stages[counts.findIndex((count) => count > 0)]
    assert.ok(firstDeployment.number > 1)
    assert.match(firstDeployment.storyBeat, /先|等/u)
  }

  const storm = SPECIAL_CAMPAIGNS.find((campaign) => campaign.id === 'stormline-skyport')
  assert.ok(storm.stages[0].activeRuleIds.includes('storm-cable-anchor'))
  assert.equal(storm.stages[0].layoutModifiers.find((entry) => entry.kind === 'platform-count')?.value, 0)
  assert.equal(storm.stages[1].layoutModifiers.find((entry) => entry.kind === 'platform-count')?.value, 3)
})

test('秘境移动挡板统一声明可击碎板体或击落搬运飞鼠', () => {
  const movingRules = SPECIAL_CAMPAIGNS.flatMap((campaign) => (
    campaign.mapRules.filter((rule) => rule.kind === 'moving-platform')
  ))
  assert.equal(movingRules.length, 4)
  for (const rule of movingRules) {
    assert.equal(rule.parameters.carrierType, 'flying-squirrel')
    assert.equal(rule.parameters.carrierCount, 2)
    assert.equal(rule.parameters.carrierHp, 2)
    assert.equal(rule.parameters.boardHp, 3)
    assert.deepEqual(rule.parameters.breakTargets, ['board', 'carrier'])
    assert.match(rule.description, /飞鼠/u)
    assert.match(rule.description, /击破|击碎/u)
    assert.match(rule.description, /击落/u)
  }
})

test('each campaign first stage authors a signature-specific tutorial contract and activates every referenced rule', () => {
  const kinds = new Set()
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const first = campaign.stages[0]
    const contract = first.tutorialContract
    assert.ok(contract)
    assert.equal(contract.signatureBirdType, campaign.signatureBird.id)
    assert.equal(first.availableBirdTypes[0], campaign.signatureBird.id)
    assert.ok(contract.instruction.length >= 24)
    assert.ok(contract.requiredRuleIds.length >= 1)
    assert.ok(contract.requiredRuleIds.every((id) => first.activeRuleIds.includes(id)))
    kinds.add(contract.kind)
    assert.ok(campaign.stages.slice(1).every((stage) => stage.tutorialContract === undefined))
  }
  assert.deepEqual(kinds, new Set([
    'frost-cluster', 'vine-tether', 'boomerang-return',
    'vertical-drill-column', 'quake-drop-zone',
  ]))
})

test('every campaign finale defines descending boss phases with active rule changes', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const finale = campaign.stages.at(-1)
    assert.equal(finale.objective.type, 'defeat-boss')
    assert.ok(finale.encounter.bossPhases.length >= 2)
    let previousThreshold = 1
    for (const phase of finale.encounter.bossPhases) {
      assert.ok(phase.hpThreshold > 0 && phase.hpThreshold < previousThreshold)
      previousThreshold = phase.hpThreshold
      assert.ok(phase.telegraph.length >= 12)
      assert.ok(phase.activateRuleIds.every((id) => finale.activeRuleIds.includes(id)))
      assert.ok(Object.keys(phase.changes).length >= 1)
    }
  }
})

test('campaign data is recursively frozen and passes its public validator', () => {
  const result = validateSpecialCampaigns()
  assert.deepEqual(result, { valid: true, errors: [] })
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.errors))
  assert.ok(Object.isFrozen(SPECIAL_CAMPAIGNS))
  assert.ok(Object.isFrozen(SPECIAL_CAMPAIGNS[0].theme.colors))
  assert.ok(Object.isFrozen(SPECIAL_CAMPAIGNS[0].mapRules[0].parameters))
  assert.ok(Object.isFrozen(SPECIAL_CAMPAIGNS[0].stages[0].layoutModifiers[0]))
})

test('validator reports structural and integration-contract errors without mutating input', () => {
  const malformed = structuredClone(SPECIAL_CAMPAIGNS)
  malformed[0].id = 'Not a slug'
  malformed[0].unlock.prerequisiteCampaignIds.push('another-campaign')
  malformed[0].signatureBird.id = 'missing-bird'
  malformed[0].stages[0].difficulty = 4
  malformed[0].stages[0].activeRuleIds.push('missing-rule')
  malformed[0].briefing.recommendedOrder = 5
  malformed[0].stages[1].objective.challenge.kind = 'score-rush'
  malformed[0].stages[3].encounter.bossPhases[1].hpThreshold = 0.9
  const snapshot = structuredClone(malformed)

  const result = validateSpecialCampaigns(malformed)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('.id: must be a kebab-case id')))
  assert.ok(result.errors.some((error) => error.includes('.unlock: must unlock independently')))
  assert.ok(result.errors.some((error) => error.includes('.signatureBird.id: must be in birdTypes')))
  assert.ok(result.errors.some((error) => error.includes('.difficulty: must be an integer from 7 to 10')))
  assert.ok(result.errors.some((error) => error.includes('missing-rule does not exist in mapRules')))
  assert.ok(result.errors.some((error) => error.includes('.briefing.recommendedOrder: must match campaign order')))
  assert.ok(result.errors.some((error) => error.includes('.objective.challenge.kind: must match')))
  assert.ok(result.errors.some((error) => error.includes('.bossPhases[1].hpThreshold')))
  assert.deepEqual(malformed, snapshot)

  assert.deepEqual(validateSpecialCampaigns(null), {
    valid: false,
    errors: ['campaigns: must be an array'],
  })

  const badlyShaped = structuredClone(SPECIAL_CAMPAIGNS)
  badlyShaped[0].birdTypes = null
  badlyShaped[0].mapRules = null
  badlyShaped[0].stages[0].availableBirdTypes = {}
  assert.doesNotThrow(() => validateSpecialCampaigns(badlyShaped))
  assert.equal(validateSpecialCampaigns(badlyShaped).valid, false)
})

test('query helpers resolve campaigns and stages by id or one-based stage number', () => {
  const clocktower = getSpecialCampaign('polar-clocktower')
  assert.equal(clocktower.title, '极夜钟楼')
  assert.equal(getSpecialStage('polar-clocktower', 1).id, 'polar-clocktower-1')
  assert.equal(getSpecialStage('polar-clocktower', 4).title, '永夜司钟')
  assert.equal(getSpecialStage('polar-clocktower', 'polar-clocktower-2').number, 2)
  assert.equal(getSpecialCampaign('unknown'), null)
  assert.equal(getSpecialCampaign(null), null)
  assert.equal(getSpecialStage('unknown', 1), null)
  assert.equal(getSpecialStage('polar-clocktower', 0), null)
  assert.equal(getSpecialStage('polar-clocktower', 'unknown'), null)
})

test('all five campaigns unlock together only after all current main levels are cleared', () => {
  assert.equal(MAIN_LEVELS, 18)
  assert.equal(SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL, MAIN_LEVELS)
  for (const campaignId of SPECIAL_CAMPAIGN_IDS) {
    assert.equal(isSpecialCampaignUnlocked(campaignId), false)
    assert.equal(isSpecialCampaignUnlocked(campaignId, { highestClearedMainLevel: MAIN_LEVELS - 1 }), false)
    assert.equal(isSpecialCampaignUnlocked(campaignId, { highestClearedMainLevel: MAIN_LEVELS }), true)
    assert.equal(isSpecialCampaignUnlocked(campaignId, { mainCompleted: true }), true)
  }
  assert.equal(isSpecialCampaignUnlocked('unknown', { mainCompleted: true }), false)
  assert.deepEqual(listUnlockedSpecialCampaigns({ highestClearedMainLevel: MAIN_LEVELS - 1 }), [])
  assert.deepEqual(
    listUnlockedSpecialCampaigns({ mainCleared: true }).map((campaign) => campaign.id),
    SPECIAL_CAMPAIGN_IDS,
  )
  assert.ok(Object.isFrozen(listUnlockedSpecialCampaigns({ mainCompleted: true })))
})

test('special stage seeds are deterministic, run-sensitive, stage-specific uint32 values', () => {
  const first = specialStageSeed('stormline-skyport', 4, 20260824)
  assert.equal(first, specialStageSeed('stormline-skyport', 'stormline-skyport-4', 20260824))
  assert.notEqual(first, specialStageSeed('stormline-skyport', 4, 20260825))
  assert.notEqual(first, specialStageSeed('stormline-skyport', 3, 20260824))
  assert.ok(Number.isSafeInteger(first))
  assert.ok(first >= 1 && first <= 0xffff_ffff)

  const seeds = SPECIAL_CAMPAIGNS.flatMap((campaign) => campaign.stages.map((stage) => (
    specialStageSeed(campaign.id, stage.id, 77)
  )))
  assert.equal(new Set(seeds).size, SPECIAL_STAGE_TOTAL)
  assert.throws(() => specialStageSeed('unknown', 1), /Unknown special stage/u)
  assert.throws(() => specialStageSeed('polar-clocktower', 1, Number.NaN), /finite number/u)
})
