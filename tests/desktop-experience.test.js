// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { objectiveBeacons } from '../src/desktop-tactics.js'
import { createDefaultSaveData, normalizeSaveData, evaluateTalentAffinity } from '../src/game-core.js'
import { generateSpecialLevel } from '../src/special-levels.js'
import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'

const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
function runtimeMethod(name, dependencies = {}) {
  const start = source.indexOf(`\n  ${name}(`)
  assert.ok(start >= 0)
  const tail = source.slice(start + 1)
  const next = tail.slice(1).search(/\n  [A-Za-z]\w*\(/u)
  const method = next < 0 ? tail : tail.slice(0, next + 1)
  return new Function(...Object.keys(dependencies), `return ({${method}}).${name}`)(...Object.values(dependencies))
}

test('all precision and sequence contracts have live, non-orphaned visible targets', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) for (const stage of campaign.stages) {
    const generated = generateSpecialLevel({ campaignId: campaign.id, stageNumber: stage.number, runSeed: 20260907 })
    const world = { blocks: generated.blocks, squirrels: generated.targets,
      platforms: generated.platforms, objective: generated.objective }
    const beacons = objectiveBeacons(world)
    if (['precision-strike', 'ordered-demolition'].includes(generated.objective.challenge?.kind)) {
      assert.ok(beacons.length > 0, stage.id)
      assert.ok(beacons.some((b) => b.active), `${stage.id} has a highlighted current target`)
    } else assert.equal(beacons.length, 0, 'do not reveal real squirrels in the mirror puzzle')
    assert.deepEqual(objectiveBeacons({ ...world, blocks: [], squirrels: [], platforms: [] }), [])
    assert.deepEqual(objectiveBeacons({ ...world, challengeState: { status: 'completed' } }), [])
  }
})

test('ordered markers follow entities and the current sequence, without changing geometry', () => {
  const blocks = [{ x: 3, y: 4, hp: 3, objectiveTags: ['a'] }, { x: 6, y: 7, hp: 3, objectiveTags: ['b'] }]
  const world = { blocks, objective: { challenge: { kind: 'ordered-demolition', parameters: { sequence: ['a', 'b'] } } } }
  assert.deepEqual(objectiveBeacons(world).map((b) => [b.label, b.active]), [['1', true], ['2', false]])
  blocks[1].x = 99
  blocks[0].hp = 0
  const markers = objectiveBeacons({ ...world, challengeState: { progress: { sequenceIndex: 1 } } })
  assert.equal(markers.length, 1)
  assert.equal(markers[0].x, 99)
  assert.equal(markers[0].active, true)
})

test('desktop motion preference migrates old saves and persists an explicit choice', () => {
  assert.equal(createDefaultSaveData().settings.reducedMotion, null)
  for (const value of [true, false]) {
    assert.equal(normalizeSaveData({ settings: { reducedMotion: value } }).settings.reducedMotion, value)
  }
  assert.equal(normalizeSaveData({ settings: { reducedMotion: 'false' } }).settings.reducedMotion, null)
})

test('single-type openings never offer a useless first-rank magazine, but useful upgrades remain', () => {
  assert.equal(evaluateTalentAffinity('tacticalMagazine', { birdTypes: ['red'] }).eligible, false)
  assert.equal(evaluateTalentAffinity('tacticalMagazine', { birdTypes: ['red', 'bomb'] }).eligible, true)
  assert.equal(evaluateTalentAffinity('tacticalMagazine', { birdTypes: ['red'], ownedTalentIds: ['tacticalMagazine'] }).eligible, true)
})

test('browser shortcuts, text fields, and held Enter never trigger battle commands', () => {
  class HTMLElement { closest() { return true } }
  const onKey = runtimeMethod('onKeyDown', { HTMLElement })
  for (const event of [
    { code: 'KeyR', ctrlKey: true }, { code: 'KeyR', metaKey: true },
    { code: 'KeyM', altKey: true }, { code: 'KeyR', isComposing: true },
    { code: 'Enter', repeat: true }, { code: 'KeyR', target: new HTMLElement() },
  ]) assert.doesNotThrow(() => onKey.call({}, event))
})

test('a saved expedition opens a choice instead of silently replacing its progress', () => {
  let started = 0
  const panel = { innerHTML: '' }
  const request = runtimeMethod('requestNewExpedition', {
    runSlotIdFor: (mode) => mode, loadRunSlots: () => ({}),
    getRunSlot: () => ({ level: 6 }), dateSeed: () => 20260907,
    MAIN_LEVELS: 18, escapeMarkup: (s) => s, dom: { panel },
  })
  request.call({ clearWorld() {}, setState() {}, focusPanelButton() {}, beginRun() { started++ } }, 'main')
  assert.equal(started, 0)
  assert.match(panel.innerHTML, /继续上次远征/u)
  assert.match(panel.innerHTML, /confirm-new-expedition/u)
  assert.match(panel.innerHTML, /第 6 关/u)
})

test('locked map nodes cannot launch and cleared nodes do not require campaign completion', () => {
  const begin = runtimeMethod('beginMainReplay')
  assert.doesNotThrow(() => begin.call({ save: { level: 5 } }, 6))
  const map = source.slice(source.indexOf('\n  showMainMap('), source.indexOf('\n  beginMainReplay('))
  assert.match(map, /level > this.save.level \? 'disabled'/u)
  assert.doesNotMatch(map, /save.level < MAIN_LEVELS/u)
})

test('safe exit does not claim success when local storage was not writable', () => {
  const panel = { innerHTML: '' }
  const exit = runtimeMethod('exitGame', { storageWritable: false, QA_MODE: false, EXIT_SKY: 0, dom: { panel } })
  exit.call({ commitRunScore() {}, persist() {}, persistCheckpoint() {}, closeSettings() {},
    clearWorld() {}, setState() {}, focusPanelButton() {} })
  assert.match(panel.innerHTML, /本次进度未能保存/u)
  assert.doesNotMatch(panel.innerHTML, /<h2[^>]*>远征已保存/u)
})
