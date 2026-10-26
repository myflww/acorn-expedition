// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('all content-completion systems are reachable from the live game runtime', () => {
  for (const moduleName of [
    'run-slots.js',
    'special-challenges.js',
    'daily-challenges.js',
    'failure-aid.js',
  ]) assert.match(game, new RegExp(`from './${moduleName.replace('.', '\\.')}'`, 'u'))

  for (const runtimeCall of [
    'updateRunSlot(',
    'clearRunSlot(',
    'createSpecialChallengeState(',
    'consumeSpecialChallengeEvent(',
    'recordSpecialChallengeCompletion(',
    'buildDailyChallenge(',
    'recordDailyChallengeSegment(',
    'claimDailyChallengeReward(',
    'recordLevelFailure(',
    'claimElderAid(',
  ]) assert.match(game, new RegExp(runtimeCall.replace('(', '\\('), 'u'))
})

test('the live secret-contract event surface covers every authored metric family', () => {
  for (const eventType of [
    'shot-launched',
    'shot-settled',
    'score-changed',
    'block-direct-hit',
    'block-destroyed',
    'tag-group-completed',
    'ability-hit',
    'mirror-ricochet',
    'decoy-hit',
    'platform-derailed',
    'collapse-chain-complete',
    'map-rule-pulse',
    'base-objective-completed',
  ]) assert.match(game, new RegExp(`['"]${eventType}['"]`, 'u'), eventType)
})

test('mission UI exposes a dedicated real-time contract region', () => {
  for (const id of [
    'mission-contract',
    'mission-contract-label',
    'mission-contract-detail',
    'mission-contract-progress',
    'mission-contract-fill',
  ]) assert.match(html, new RegExp(`id="${id}"`, 'u'))
  assert.match(game, /summarizeSpecialChallenge\(this\.specialChallengeState\)/u)
})

test('daily completion is three-stage, boss-backed, rewarded once, and archived', () => {
  assert.match(game, /const DAILY_CONTENT_LEVELS = Object\.freeze\(\[6, 11, 16\]\)/u)
  assert.match(game, /boss:\s*true,[\s\S]{0,180}variant:\s*'king'/u)
  assert.match(game, /this\.save\.dailyChallenge = dailySettlement\.state/u)
  assert.match(game, /this\.save\.eggs \+= dailyReward\.reward\.goldenAcorns/u)
  assert.match(game, /每日完成天数/u)
})

test('elder aid is transparent and excluded from reserve-star accounting', () => {
  assert.match(game, /data-action="elder-aid"/u)
  assert.match(game, /不计余弹星/u)
  assert.match(game, /grantQueuedBird\(type, \{ front: true \}\)/u)
  assert.match(game, /failure\.hint\?\.reasonLabel/u)
})
