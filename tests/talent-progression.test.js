// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { ACORN_AFFINITY_TYPES, TALENTS, TALENT_AFFINITIES } from '../src/game-core.js'
import { TALENT_ICON_IDS, talentIconMarkup } from '../src/talent-icons.js'
import {
  SPECIAL_ACORN_TALENTS, SPECIAL_ACORN_TALENT_IDS, TALENT_FUSIONS, TALENT_FUSION_IDS,
  TALENT_MAX_RANK, TALENT_PROGRESSION_IDS, TALENT_PROGRESSION_SCHEMA, TALENT_RANK_DATA,
  applyTalentChoice, availableTalentFusions, buildTalentCandidatePool, buildTalentCandidates,
  canOfferTalentUpgrade, deserializeTalentProgression, fusionForTalents, getTalentRankData,
  isTalentCandidateLegal, normalizeTalentProgression, resolveTalentProgression,
  serializeTalentProgression, talentRankOf,
} from '../src/talent-progression.js'

test('all live talents own three frozen ranks and rank one preserves current effects', () => {
  assert.equal(TALENT_MAX_RANK, 3)
  assert.deepEqual(TALENT_PROGRESSION_IDS, Object.keys(TALENTS))
  assert.deepEqual(TALENT_PROGRESSION_IDS, Object.keys(TALENT_AFFINITIES))
  assert.ok(Object.isFrozen(TALENT_RANK_DATA))
  assert.ok(Object.isFrozen(TALENT_PROGRESSION_SCHEMA))
  for (const id of TALENT_PROGRESSION_IDS) {
    const ranks = TALENT_RANK_DATA[id].ranks
    assert.equal(ranks.length, 3, id)
    assert.deepEqual(ranks[0].effects, TALENTS[id].effects, id)
    assert.ok(ranks[1].powerMultiplier > ranks[0].powerMultiplier, id)
    assert.ok(ranks[2].powerMultiplier > ranks[1].powerMultiplier, id)
    assert.ok(Object.isFrozen(ranks[2].effects), id)
    assert.equal(getTalentRankData(id, 0), null)
  }
})

test('a normal talent can be chosen three times and never a fourth time', () => {
  let state = normalizeTalentProgression()
  assert.equal(isTalentCandidateLegal(state, 'upgrade/power/999'), false)
  assert.throws(() => applyTalentChoice(state, 'upgrade/power/999'), /illegal/u)
  for (let target = 1; target <= 3; target += 1) {
    assert.equal(canOfferTalentUpgrade(state, 'power'), true)
    assert.equal(isTalentCandidateLegal(state, `upgrade/power/${target}`), true)
    state = applyTalentChoice(state, `upgrade/power/${target}`)
    assert.equal(talentRankOf(state, 'power'), target)
  }
  assert.equal(canOfferTalentUpgrade(state, 'power'), false)
  assert.equal(isTalentCandidateLegal(state, 'upgrade/power/3'), false)
  assert.throws(() => applyTalentChoice(state, 'upgrade/power/3'), /illegal/u)
  assert.ok(Object.isFrozen(state.ranks))
})

test('tactical magazine ranks turn queue choice into one-shot impact, launch, and ability bonuses', () => {
  const ranks = TALENT_RANK_DATA.tacticalMagazine.ranks
  assert.deepEqual(ranks[0].effects, { queueSelectionEnabled: true })
  assert.deepEqual(ranks[1].effects, {
    queueSelectionEnabled: true,
    queueSwapDirectDamageBonus: 1,
  })
  assert.deepEqual(ranks[2].effects, {
    queueSelectionEnabled: true,
    queueSwapDirectDamageBonus: 1,
    queueSwapVelocityMultiplier: 1.12,
    queueSwapAbilityPowerMultiplier: 1.18,
  })
  assert.match(ranks[0].description, /待发序列换位/u)
  assert.match(ranks[1].description, /下一发/u)
  assert.match(ranks[2].description, /动能\+12%/u)
})

test('wind trace ranks expose a separate gold forecast, first-contact hint, and strong-wind precision reward', () => {
  const ranks = TALENT_RANK_DATA.windTrace.ranks
  assert.deepEqual(ranks[0].effects, {
    windTraceGuideEnabled: true,
    windTraceLandingMarkerEnabled: true,
    windCorridorPreviewEnabled: true,
  })
  assert.equal(ranks[1].effects.windTraceFirstContactHintEnabled, true)
  assert.equal(ranks[2].effects.windPrecisionMinimumWind, 0.035)
  assert.equal(ranks[2].effects.windPrecisionDirectDamageBonus, 1)
  assert.equal(ranks[2].effects.windPrecisionVelocityRetention, 1.08)
  assert.match(ranks[0].description, /金色风偏/u)
  assert.match(ranks[0].description, /不替代.*蓝色精确弹道/u)
  assert.match(ranks[1].description, /首次接触横风/u)
})

test('new talents own distinct text-free vector icons', () => {
  assert.ok(TALENT_ICON_IDS.includes('tacticalMagazine'))
  assert.ok(TALENT_ICON_IDS.includes('windTrace'))
  const magazine = talentIconMarkup('tacticalMagazine')
  const forecast = talentIconMarkup('windTrace')
  assert.match(magazine, /^<svg[^>]+viewBox="0 0 32 32"/u)
  assert.match(forecast, /^<svg[^>]+viewBox="0 0 32 32"/u)
  assert.notEqual(magazine, forecast)
  assert.doesNotMatch(magazine + forecast, /<text\b/u)
})

test('fusion pairs are deterministic, unique, frozen, and carry meaningful bonuses', () => {
  assert.ok(TALENT_FUSION_IDS.length >= 4)
  assert.ok(Object.isFrozen(TALENT_FUSIONS))
  const pairs = new Set()
  for (const id of TALENT_FUSION_IDS) {
    const entry = TALENT_FUSIONS[id]
    assert.equal(entry.talentIds.length, 2)
    assert.equal(entry.rankRequired, 3)
    assert.ok(Object.keys(entry.bonusEffects).length >= 2)
    assert.equal(fusionForTalents(...entry.talentIds), entry)
    assert.equal(fusionForTalents(...entry.talentIds.toReversed()), entry)
    assert.equal(pairs.has(entry.talentIds.join('+')), false)
    pairs.add(entry.talentIds.join('+'))
  }
  assert.equal(fusionForTalents('power', 'power'), null)
})

test('fusion needs two free rank-three talents, keeps both effects, and consumes sources once', () => {
  let state = normalizeTalentProgression({ ranks: { power: 3, stonebreaker: 2 } })
  assert.deepEqual(availableTalentFusions(state), [])
  state = applyTalentChoice(state, 'upgrade/stonebreaker/3')
  assert.deepEqual(availableTalentFusions(state).map((item) => item.id), ['faultCrown'])
  state = applyTalentChoice(state, 'fusion/faultCrown')
  assert.equal(state.ranks.power, 3)
  assert.equal(state.ranks.stonebreaker, 3)
  assert.equal(isTalentCandidateLegal(state, 'fusion/faultCrown'), false)
  const conflicting = availableTalentFusions({ ranks: { power: 3, stonebreaker: 3, leech: 3 }, fusionIds: ['faultCrown'] })
  assert.equal(conflicting.some((item) => item.talentIds.includes('power')), false)
  const resolved = resolveTalentProgression(state)
  assert.equal(resolved.talentEffects.power.damageBonus, 3)
  assert.equal(resolved.talentEffects.stonebreaker.stoneDamageBonus, 3)
  assert.equal(resolved.fusionBonuses.faultCrown.effects.structuralFractureDamage, 2)
})

test('windchart arsenal fuses two free rank-three sources and forecasts three queued shots', () => {
  const pair = fusionForTalents('windTrace', 'tacticalMagazine')
  assert.equal(pair?.id, 'windchartArsenal')
  assert.deepEqual(pair?.bonusEffects, {
    forecastQueueSlots: 3,
    forecastSwapWindDamageBonus: 1,
    forecastSwapVelocityRetention: 1.08,
  })

  let state = normalizeTalentProgression({ ranks: { tacticalMagazine: 3, windTrace: 3 } })
  assert.deepEqual(availableTalentFusions(state).map((entry) => entry.id), ['windchartArsenal'])
  const pool = buildTalentCandidatePool({
    progression: state,
    eligibleTalentIds: ['tacticalMagazine', 'windTrace'],
    includeSpecialAcorns: false,
  })
  assert.equal(pool.at(-1)?.selectionId, 'fusion/windchartArsenal')

  state = applyTalentChoice(state, 'fusion/windchartArsenal')
  const resolved = resolveTalentProgression(state)
  assert.equal(resolved.talentEffects.tacticalMagazine.queueSwapAbilityPowerMultiplier, 1.18)
  assert.equal(resolved.talentEffects.windTrace.windPrecisionDirectDamageBonus, 1)
  assert.equal(resolved.fusionBonuses.windchartArsenal.effects.forecastQueueSlots, 3)
  assert.equal(availableTalentFusions(state).some((entry) => entry.id === 'windchartArsenal'), false)
})

test('rare talents expose exclusive per-level acorn contracts with playable fallbacks', () => {
  assert.ok(SPECIAL_ACORN_TALENT_IDS.length >= 1)
  const types = new Set()
  for (const id of SPECIAL_ACORN_TALENT_IDS) {
    const contract = SPECIAL_ACORN_TALENTS[id].contract
    assert.match(contract.type, /^talent-[a-z][a-z0-9-]+$/u)
    assert.equal(types.has(contract.type), false)
    types.add(contract.type)
    assert.ok(ACORN_AFFINITY_TYPES.includes(contract.fallbackType))
    assert.equal(contract.copiesPerLevel, 1)
    assert.equal(contract.grantTiming, 'each-level-start')
    assert.equal(contract.exclusiveToTalent, true)
    assert.equal(contract.countsForReserveStars, false)
    assert.ok(Object.isFrozen(contract.ability))
  }
})

test('candidate pool keeps only encounter-linked, non-maxed upgrades and gates rare acorns', () => {
  const progression = { ranks: { power: 3, stonebreaker: 3, frost: 2, feather: 1 } }
  const pool = buildTalentCandidatePool({ progression, eligibleTalentIds: ['power', 'stonebreaker', 'frost', 'feather'], acornTypes: ['frost'] })
  assert.deepEqual(pool.filter((item) => item.kind === 'upgrade').map((item) => [item.talentId, item.targetRank]), [['feather', 2], ['frost', 3]])
  assert.ok(pool.some((item) => item.selectionId === 'fusion/faultCrown'))
  assert.ok(pool.some((item) => item.selectionId === 'special/prismBell'))
  assert.equal(pool.some((item) => item.selectionId === 'special/emberheart'), false)
  assert.ok(Object.isFrozen(pool))
})

test('offer selection is deterministic, unique, affinity-weighted, and guarantees a fusion', () => {
  const options = {
    progression: { ranks: { power: 3, stonebreaker: 3, frost: 2, feather: 1, comboM: 1 } },
    eligibleTalentIds: ['power', 'stonebreaker', 'frost', 'feather', 'comboM', 'pack'], acornTypes: ['frost'],
    count: 3, seed: 20260831, specialAcornChance: 1, talentWeights: { frost: 5, feather: 0.2 },
  }
  const first = buildTalentCandidates(options)
  assert.deepEqual(first, buildTalentCandidates(options))
  assert.equal(first.length, 3)
  assert.equal(new Set(first.map((item) => item.selectionId)).size, 3)
  assert.ok(first.some((item) => item.kind === 'fusion'))
  assert.ok(first.some((item) => item.kind === 'special-acorn'))
  assert.ok(Object.isFrozen(first))
})

test('a zero rarity chance never leaks an otherwise eligible special-acorn candidate', () => {
  const candidates = buildTalentCandidates({
    progression: { ranks: { flame: 3 } },
    eligibleTalentIds: ['power', 'feather', 'pack', 'comboM'],
    acornTypes: ['fire'],
    count: 4,
    seed: 20260831,
    specialAcornChance: 0,
  })

  assert.equal(candidates.some((candidate) => candidate.kind === 'special-acorn'), false)
})

test('normalization and serialization migrate legacy data without sharing or corruption', () => {
  const state = normalizeTalentProgression({
    ranks: { stonebreaker: 9, power: '3', frost: 2.9, feather: -2, invented: 3 },
    fusionIds: ['faultCrown', 'faultCrown', 'invented'],
    specialTalentIds: ['thunderRoot', 'invented', 'thunderRoot'],
  })
  assert.deepEqual(state, { version: 1, ranks: { power: 3, frost: 2, stonebreaker: 3 }, fusionIds: ['faultCrown'], specialTalentIds: ['thunderRoot'] })
  const text = serializeTalentProgression(state)
  assert.deepEqual(deserializeTalentProgression(text), state)
  assert.equal(text, serializeTalentProgression({ talents: { frost: 2, stonebreaker: 3, power: 3 }, fusions: { faultCrown: true }, specialTalents: { thunderRoot: true } }))
  assert.equal(deserializeTalentProgression('{bad'), null)
  assert.equal(deserializeTalentProgression('[]'), null)
  assert.equal(deserializeTalentProgression('{"version":99}'), null)
})

test('a rare talent grants its exclusive acorn exactly once', () => {
  assert.equal(isTalentCandidateLegal(normalizeTalentProgression(), 'special/emberheart'), false)
  let state = normalizeTalentProgression({ ranks: { flame: 3 } })
  state = applyTalentChoice(state, 'special/emberheart')
  assert.equal(isTalentCandidateLegal(state, 'special/emberheart'), false)
  assert.deepEqual(resolveTalentProgression(state).specialAcornGrants.map((item) => item.type), ['talent-emberheart'])
  assert.throws(() => applyTalentChoice(state, 'special/emberheart'), /illegal/u)
})
