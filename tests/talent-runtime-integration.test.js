// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { DISCOVERIES, discoveryArtMarkup } from '../src/discoveries.js'
import { TALENT_SCORE_MILESTONES } from '../src/game-core.js'
import { swapLoadedAmmoWithQueue } from '../src/ammo-queue.js'
import {
  RUN_CHECKPOINT_VERSION,
  createRunCheckpoint,
  normalizeRunCheckpoint,
} from '../src/run-checkpoint.js'
import {
  SPECIAL_ACORN_TALENTS,
  TALENT_FUSIONS,
  TALENT_PROGRESSION_IDS,
  TALENT_PROGRESSION_VERSION,
  TALENT_RANK_DATA,
} from '../src/talent-progression.js'

const gameSource = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`)
  return source.slice(start, end)
}

function literalEffectCalls(source, methodName) {
  const calls = new Set()
  const pattern = new RegExp(
    `this\\.${methodName}\\(\\s*['\"]([^'\"]+)['\"]\\s*,\\s*['\"]([^'\"]+)['\"]`,
    'gu',
  )
  for (const match of source.matchAll(pattern)) calls.add(`${match[1]}:${match[2]}`)
  return calls
}

test('ranked drafts use structured choices and expose upgrades, fusions, and contracts in the HUD', () => {
  assert.equal(TALENT_PROGRESSION_IDS.length, 15, 'all fifteen base talents remain rankable')

  const draftRuntime = sourceSection(gameSource, '\n  chooseTalentOptions(', '\n  showTalentPick(')
  const pickerRuntime = sourceSection(gameSource, '\n  showTalentPick(', '\n  selectTalent(')
  const selectionRuntime = sourceSection(gameSource, '\n  selectTalent(', '\n  hasTalent(')
  const hudRuntime = sourceSection(gameSource, '    const rankedButtons = ownedTalentIds', "    setText(dom.modeBadge")

  assert.match(draftRuntime, /buildTalentCandidates\(\{/u)
  assert.match(draftRuntime, /progression:\s*this\.talentProgression/u)
  assert.match(pickerRuntime, /choice\.kind === 'fusion'/u)
  assert.match(pickerRuntime, /choice\.kind === 'special-acorn'/u)
  assert.match(pickerRuntime, /choice\.targetRank/u)
  assert.match(pickerRuntime, /data-talent-choice=/u)
  assert.match(selectionRuntime, /candidate\.selectionId === selectionId/u)
  assert.match(selectionRuntime, /applyTalentChoice\(this\.talentProgression, choice\)/u)

  assert.match(hudRuntime, /talent-mini-rank/u)
  assert.match(hudRuntime, /this\.talentProgression\.fusionIds/u)
  assert.match(hudRuntime, /talent-mini-fusion/u)
  assert.match(hudRuntime, /this\.talentProgression\.specialTalentIds/u)
  assert.match(hudRuntime, /talent-mini-contract/u)
  for (const className of [
    'talent-rank-pips', 'talent-card-fusion', 'talent-card-contract',
    'talent-mini-rank', 'talent-mini-fusion', 'talent-mini-contract',
  ]) assert.match(cssSource, new RegExp(`\\.${className}\\b`, 'u'), `${className} needs visible styling`)
})

test('every gameplay effect declared by all fifteen ranked talents is consumed by the runtime', () => {
  // Runtime-detail copy lives after this boundary. Looking only before it prevents
  // a tooltip mention from falsely satisfying a missing gameplay implementation.
  const gameplaySource = gameSource.slice(0, gameSource.indexOf('\n  talentRuntimeDetail('))
  const consumed = literalEffectCalls(gameplaySource, 'talentEffect')
  const declarativeFairnessFields = new Set([
    'pack:countsForReserveStars',
    'pack:countsForReserveBonus',
    'secondWind:countsForReserveStars',
    'secondWind:countsForReserveBonus',
  ])

  for (const talentId of TALENT_PROGRESSION_IDS) {
    const effectKeys = new Set(TALENT_RANK_DATA[talentId].ranks.flatMap((rank) => Object.keys(rank.effects)))
    for (const effectKey of effectKeys) {
      const identity = `${talentId}:${effectKey}`
      assert.ok(
        consumed.has(identity) || declarativeFairnessFields.has(identity),
        `${identity} is described by a rank but never consumed during gameplay`,
      )
    }
  }

  // The four declarative fields are implemented by marking those granted shots
  // as bonus ammo; rating and reserve rewards read the shared bonus metadata.
  const levelSetup = sourceSection(gameSource, '    const talentContracts = this.specialAcornContracts()', '\n    this.levelRescuesUsed = 0')
  const rescueRuntime = sourceSection(gameSource, "    else if (this.hasTalent('secondWind')", '\n    } else if (!this.openEmergencySupply())')
  assert.match(levelSetup, /requestedPackShots = this\.talentEffect\('pack', 'extraShots'/u)
  assert.match(levelSetup, /bonusShotsGranted:\s*requestedPackShots/u)
  assert.match(levelSetup, /grantedContractShots = requestedContractShots/u)
  assert.match(levelSetup, /totalShotBudget:\s*initialShotTotal \+ grantedContractShots/u)
  assert.match(levelSetup, /this\.shotQueueBonus = this\.shotQueue\.map\(\(_, index\) => index >= this\.baseShotBudget\)/u)
  assert.match(rescueRuntime, /grantQueuedBird\(rescueBirdType, \{ front: true, damageBonus: rescueDamageBonus \}\)/u)
  assert.match(gameSource, /grantQueuedBird\([\s\S]*?this\.shotQueueBonus\.(?:unshift|push)\(true\)/u)
})

test('all nine fusion bonus records have live runtime consumers', () => {
  assert.equal(Object.keys(TALENT_FUSIONS).length, 9)
  const gameplaySource = gameSource.slice(0, gameSource.indexOf('\n  talentRuntimeDetail('))
  const consumed = literalEffectCalls(gameplaySource, 'fusionEffect')

  for (const [fusionId, fusion] of Object.entries(TALENT_FUSIONS)) {
    assert.ok(Object.keys(fusion.bonusEffects).length > 0, `${fusionId} must add a real fusion effect`)
    for (const effectKey of Object.keys(fusion.bonusEffects)) {
      assert.ok(
        consumed.has(`${fusionId}:${effectKey}`),
        `${fusionId}:${effectKey} is declared but never consumed during gameplay`,
      )
    }
  }
})

test('three talent-exclusive acorns are injected fairly and each has ability, combat art, and field-guide coverage', () => {
  const contracts = Object.values(SPECIAL_ACORN_TALENTS).map((entry) => entry.contract)
  assert.equal(contracts.length, 3)
  assert.equal(new Set(contracts.map((contract) => contract.type)).size, 3)

  const injectionRuntime = sourceSection(gameSource, '\n  injectTalentAcorns(', '\n  freezeArea(')
  assert.match(injectionRuntime, /this\.specialAcornContracts\(\)/u)
  assert.match(injectionRuntime, /contract\.copiesPerLevel/u)
  assert.match(injectionRuntime, /contract\.queuePolicy === 'insert-middle'/u)
  assert.match(injectionRuntime, /this\.shotQueue\.splice\(index, 0, contract\.type\)/u)
  assert.match(injectionRuntime, /this\.shotQueueBonus\.splice\(index, 0, true\)/u)
  assert.match(injectionRuntime, /this\.shotQueueDamageBonus\.splice\(index, 0, 0\)/u)
  assert.match(injectionRuntime, /this\.shotQueueAce\.splice\(index, 0, false\)/u)

  const abilityKeysConsumed = new Set(
    [...gameSource.matchAll(/\bability\.([A-Za-z][A-Za-z0-9]*)/gu)].map((match) => match[1]),
  )
  const abilityDispatch = sourceSection(gameSource, '\n  useAbility()', '\n  frame(')
  const drawRuntime = sourceSection(gameSource, '\n  drawBird(', '\n  drawSquirrel(')
  const expectedAbilityMethods = {
    'talent-emberheart': 'triggerMoltenHeart',
    'talent-prism-bell': 'triggerPrismBell',
    'talent-thunder-root': 'triggerThunderRoot',
  }
  const discoveryArt = []

  for (const contract of contracts) {
    assert.equal(contract.copiesPerLevel, 1)
    assert.equal(contract.exclusiveToTalent, true)
    assert.equal(contract.countsForReserveStars, false)
    assert.equal(contract.countsForReserveBonus, false)
    assert.match(gameSource, new RegExp(`['\"]${contract.type}['\"]\\s*:\\s*\\{`, 'u'), `${contract.type} needs its own combat palette`)
    assert.match(abilityDispatch, new RegExp(`bird\\.type === ['\"]${contract.type}['\"]`, 'u'))
    assert.match(gameSource, new RegExp(`${expectedAbilityMethods[contract.type]}\\(`, 'u'))
    assert.match(drawRuntime, new RegExp(`visualType === ['\"]${contract.type}['\"]`, 'u'), `${contract.type} needs bespoke combat drawing`)

    for (const abilityKey of Object.keys(contract.ability)) {
      assert.ok(abilityKeysConsumed.has(abilityKey), `${contract.type} ability.${abilityKey} is never consumed`)
    }

    const discoveryId = `bird:${contract.type}`
    const discovery = DISCOVERIES[discoveryId]
    assert.equal(discovery?.category, '天赋专属橡宝')
    assert.equal(discovery?.title, contract.title)
    assert.ok(discovery.summary && discovery.action && discovery.tip && discovery.lore)
    const art = discoveryArtMarkup(discoveryId)
    assert.match(art, /^<svg[^>]+viewBox="0 0 120 96"/u)
    discoveryArt.push(art)
  }
  assert.equal(new Set(discoveryArt).size, 3, 'exclusive acorns may not share one field-guide illustration')
})

test('desktop queue selection preserves ordering and fairness metadata as one transaction', () => {
  assert.match(htmlSource, /id="shot-selector"[\s\S]*aria-labelledby="shot-selector-title"/u)
  assert.match(htmlSource, /id="shot-selector-list"[\s\S]*role="group"/u)

  const result = swapLoadedAmmoWithQueue({
    loaded: { type: 'red', bonusShot: false, damageBonus: 0, aceSupply: false },
    queue: ['bomb', 'talent-emberheart', 'frost'],
    bonusFlags: [false, true, false],
    damageBonuses: [0, 2, 0],
    aceFlags: [false, true, false],
    selectedIndex: 1,
  })
  assert.deepEqual(result.loaded, {
    type: 'talent-emberheart', bonusShot: true, damageBonus: 2, aceSupply: true,
  })
  assert.deepEqual(result.queue, ['bomb', 'red', 'frost'])
  assert.deepEqual(result.bonusFlags, [false, false, false])
  assert.deepEqual(result.damageBonuses, [0, 0, 0])
  assert.deepEqual(result.aceFlags, [false, false, false])

  const selectionRuntime = sourceSection(gameSource, '\n  selectQueuedBird(index)', '\n  grantQueuedBird(')
  assert.match(selectionRuntime, /swapLoadedAmmoWithQueue\(\{/u)
  assert.match(selectionRuntime, /bonusShot:\s*this\.currentBird\.bonusShot/u)
  assert.match(selectionRuntime, /damageBonus:\s*this\.currentBird\.grantedDamageBonus/u)
  assert.match(selectionRuntime, /aceSupply:\s*this\.currentBird\.aceSupply/u)
  assert.match(selectionRuntime, /aceFlags:\s*this\.shotQueueAce/u)
  assert.match(selectionRuntime, /this\.currentBird\.bonusShot = result\.loaded\.bonusShot/u)
  assert.match(selectionRuntime, /this\.currentBird\.grantedDamageBonus = result\.loaded\.damageBonus/u)
  assert.match(selectionRuntime, /this\.currentBird\.aceSupply = result\.loaded\.aceSupply/u)
  assert.doesNotMatch(selectionRuntime, /(?:shotsRemaining|bonusShotsRemaining)\s*[+\-=]/u)
  assert.match(gameSource, /data-queue-index="\$\{index\}"/u)
  assert.match(gameSource, /aria-label="将待发第/u)
  assert.match(cssSource, /\.shot-select-button:focus-visible/u)
})

test('checkpoint v2 round-trips ranks, fusion, and exclusive-acorn contracts and game runtime restores them', () => {
  const score = TALENT_SCORE_MILESTONES.at(-1).score
  const checkpoint = createRunCheckpoint({
    mode: 'main',
    level: 12,
    runSeed: 0x31c0ffee,
    score,
    talentProgression: {
      version: TALENT_PROGRESSION_VERSION,
      ranks: { power: 3, stonebreaker: 3, frost: 2 },
      fusionIds: ['faultCrown'],
      specialTalentIds: ['emberheart'],
    },
    talentClaimedCount: 10,
    talentEligibleCount: 10,
  })

  assert.equal(checkpoint.version, RUN_CHECKPOINT_VERSION)
  assert.equal(RUN_CHECKPOINT_VERSION, 2)
  assert.deepEqual(checkpoint.talentProgression, {
    version: TALENT_PROGRESSION_VERSION,
    ranks: { power: 3, frost: 2, stonebreaker: 3 },
    fusionIds: ['faultCrown'],
    specialTalentIds: ['emberheart'],
  })
  assert.equal(checkpoint.talents, checkpoint.talentProgression.ranks)
  assert.ok(Object.isFrozen(checkpoint.talentProgression))
  assert.deepEqual(normalizeRunCheckpoint(JSON.parse(JSON.stringify(checkpoint))), checkpoint)

  const persistRuntime = sourceSection(gameSource, '\n  persistCheckpoint()', '\n  clearCheckpoint(')
  const resumeRuntime = sourceSection(gameSource, '\n  resumeRun()', '\n  commitRunScore(')
  assert.match(persistRuntime, /createRunCheckpoint\(\{/u)
  assert.match(persistRuntime, /talentProgression:\s*this\.talentProgression/u)
  assert.match(resumeRuntime, /this\.setTalentProgression\(checkpoint\.talentProgression/u)
})
