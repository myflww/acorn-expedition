// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import {
  SPECIAL_BACKGROUND_BLUEPRINTS,
  buildSpecialBackgroundScene,
  validateSpecialBackgroundScenes,
} from '../src/special-backgrounds.js'

function assertRecursivelyFrozen(value, path = 'value') {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`)
  for (const [key, child] of Object.entries(value)) assertRecursivelyFrozen(child, `${path}.${key}`)
}

test('five special background contracts have unique silhouettes, weather, landmarks, and narrative cues', () => {
  assert.equal(Object.keys(SPECIAL_BACKGROUND_BLUEPRINTS).length, 5)
  assertRecursivelyFrozen(SPECIAL_BACKGROUND_BLUEPRINTS, 'SPECIAL_BACKGROUND_BLUEPRINTS')
  const scenes = SPECIAL_CAMPAIGNS.map((campaign) => buildSpecialBackgroundScene(campaign, campaign.stages[0]))
  assert.equal(new Set(scenes.map((scene) => scene.silhouette)).size, 5)
  assert.equal(new Set(scenes.map((scene) => scene.weather)).size, 5)
  assert.equal(new Set(scenes.map((scene) => scene.landmark)).size, 5)
  assert.equal(new Set(scenes.map((scene) => scene.horizon)).size, 5)
  assert.ok(scenes.every((scene) => scene.narrativeCues.length >= 3))
  assert.ok(scenes.every((scene) => scene.locationLabel.length >= 6))
})

test('scene compilation reuses campaign theme layers, parameters, colors, and stage story', () => {
  for (const campaign of SPECIAL_CAMPAIGNS) {
    for (const stage of campaign.stages) {
      const scene = buildSpecialBackgroundScene(campaign, stage)
      assert.equal(scene.campaignId, campaign.id)
      assert.equal(scene.stageNumber, stage.number)
      assert.equal(scene.stageTitle, stage.title)
      assert.equal(scene.storyBeat, stage.storyBeat)
      assert.equal(scene.sourceBackgroundId, campaign.theme.background.id)
      assert.deepEqual(scene.sourceLayers, campaign.theme.background.layers)
      assert.notEqual(scene.sourceLayers, campaign.theme.background.layers)
      assert.deepEqual(scene.parameters, campaign.theme.background.parameters)
      assert.notEqual(scene.parameters, campaign.theme.background.parameters)
      assert.deepEqual(scene.colors, campaign.theme.colors)
      assert.notEqual(scene.colors, campaign.theme.colors)
      assert.equal(scene.progress, stage.number / 4)
      assertRecursivelyFrozen(scene, `${campaign.id}-${stage.number}`)
    }
  }
})

test('desktop landmark placement stays edge-biased and below the authored readability ceiling', () => {
  const canvas = { width: 900, height: 600 }
  for (const campaign of SPECIAL_CAMPAIGNS) {
    const scene = buildSpecialBackgroundScene(campaign, campaign.stages.at(-1))
    const placement = scene.landmarkPlacement
    const pixelX = placement.x * canvas.width
    const pixelY = placement.y * canvas.height
    assert.ok(pixelX >= 648 && pixelX <= 846, `${campaign.id} landmark x ${pixelX}`)
    assert.ok(pixelY >= 72 && pixelY <= 252, `${campaign.id} landmark y ${pixelY}`)
    assert.ok(placement.opacity <= scene.readability.maximumDetailOpacity)
    assert.ok(scene.readability.maximumDetailOpacity <= 0.5)
    assert.match(scene.readability.combatWash, /^rgba\(/u)
  }
  assert.deepEqual(validateSpecialBackgroundScenes(SPECIAL_CAMPAIGNS), { valid: true, errors: [] })
})

test('background validator rejects missing chapter art without mutating campaign data', () => {
  const malformed = structuredClone(SPECIAL_CAMPAIGNS)
  malformed[0].id = 'unknown-special-place'
  malformed[1].theme.background.layers = ['only-one-layer']
  const before = structuredClone(malformed)
  const result = validateSpecialBackgroundScenes(malformed)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('missing special background blueprint')))
  assert.ok(result.errors.some((error) => error.includes('theme layers were not consumed')))
  assert.deepEqual(malformed, before)
})

test('Canvas runtime consumes the scene contract and exposes it to QA snapshots', () => {
  const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(source, /buildSpecialBackgroundScene\(generated\.campaign, generated\.stage\)/u)
  assert.match(source, /const scene = this\.specialBackgroundScene \|\| buildSpecialBackgroundScene/u)
  for (const signature of [
    'frozen-clock-spire',
    'drowned-harbor-arcade',
    'silver-trunk-labyrinth',
    'root-cavern-vault',
    'suspended-skyport',
  ]) assert.match(source, new RegExp(signature, 'u'))
  for (const renderer of [
    'drawPolarSpecialBackground',
    'drawTideSpecialBackground',
    'drawMirrorSpecialBackground',
    'drawRootSpecialBackground',
    'drawStormSpecialBackground',
  ]) assert.match(source, new RegExp(`${renderer}\\(scene, drift\\)`, 'u'))
  assert.match(source, /scene\.readability\.combatWash/u)
  assert.match(source, /scene\.locationLabel/u)
  assert.match(source, /specialBackgroundScene: this\.specialBackgroundScene/u)
})
