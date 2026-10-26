// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIRD_TYPE_UNLOCKS } from '../src/game-core.js'
import { SPECIAL_ACORNS, SPECIAL_SQUIRRELS } from '../src/special-roster.js'
import { SPECIAL_ACORN_TALENTS } from '../src/talent-progression.js'

const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')

const campaignAcornTypes = BIRD_TYPE_UNLOCKS.map(({ type }) => type)
const specialAcornTypes = SPECIAL_ACORNS.map(({ type }) => type)
const talentAcornTypes = Object.values(SPECIAL_ACORN_TALENTS)
  .map(({ contract }) => contract.type)
const launchableAcornTypes = Object.freeze([
  ...campaignAcornTypes,
  ...specialAcornTypes,
  ...talentAcornTypes,
])

function classMethodSource(name) {
  const start = runtime.indexOf(`  ${name}(`)
  assert.ok(start >= 0, `${name}() is missing from the battlefield renderer`)
  const remaining = runtime.slice(start + 2)
  const nextHeader = /\n  [A-Za-z_$][\w$]*\([^\n]*\) \{/gu.exec(remaining)
  const end = nextHeader ? start + 2 + nextHeader.index : runtime.length
  assert.ok(end > start, `${name}() has no readable method boundary`)
  return runtime.slice(start, end)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

test('reserve magazine portraits reuse the battlefield acorn renderer instead of glyph stand-ins', () => {
  const renderPortraits = classMethodSource('renderShotSelectorPortraits')
  const selectorMarkup = classMethodSource('syncUI')

  assert.match(selectorMarkup, /<canvas[^>]*class="[^"]*shot-acorn[^"]*canvas[^"]*"/u,
    'each reserve slot needs a real canvas portrait surface')
  assert.match(selectorMarkup, /data-bird-type=/u,
    'the portrait surface must preserve the exact runtime acorn type')
  assert.match(selectorMarkup, /this\.renderShotSelectorPortraits\(\)/u,
    'new reserve markup must be painted after it is attached to the DOM')

  assert.match(renderPortraits, /(?:this\.)?withDrawingContext\(/u,
    'portrait drawing must temporarily target each reserve canvas')
  assert.match(renderPortraits, /this\.drawBird\(/u,
    'reserve portraits and battlefield acorns must share drawBird()')
  assert.match(renderPortraits, /queued:\s*true/u,
    'portrait rendering should use the settled, non-flight art pose')

  assert.doesNotMatch(runtime, /SHOT_QUEUE_PORTRAITS/u,
    'a separate glyph portrait map will drift away from battlefield art')
  const portraitMarkup = runtime.match(/function shotQueuePortraitMarkup\([^)]*\) \{[\s\S]*?\n\}/u)?.[0] || ''
  if (portraitMarkup) {
    assert.match(portraitMarkup, /<canvas/u,
      'the reserve helper may create a drawing surface but not separate artwork')
    assert.doesNotMatch(portraitMarkup, /<b>|sigil|[\u25cf\u2739\u25c6]|>\s*[\p{Script=Han}]\s*</u,
      'the reserve helper must not substitute a glyph for the shared renderer')
  }
  assert.doesNotMatch(selectorMarkup, /shot-acorn-body[^>]*>[\s\S]{0,24}<b>/u,
    'single characters and symbols cannot be the reserve portrait artwork')
})

test('every launchable runtime acorn has a non-text silhouette branch and receives finish details', () => {
  assert.equal(new Set(launchableAcornTypes).size, launchableAcornTypes.length,
    'the assembled runtime roster must not contain duplicate type ids')
  assert.equal(launchableAcornTypes.length, 13,
    'new launchable types must join this complete visual contract intentionally')

  const drawBird = classMethodSource('drawBird')
  const finishDetails = classMethodSource('drawAcornFinishDetails')
  const completeArtSource = `${drawBird}\n${finishDetails}`

  assert.match(drawBird, /this\.drawAcornFinishDetails\(/u,
    'the shared battlefield/portrait renderer must apply the final detail pass')
  assert.match(drawBird, /ctx\.(?:bezierCurveTo|quadraticCurveTo|ellipse|arc|lineTo)\(/u,
    'the base acorn must be drawn as geometry rather than a text glyph')
  assert.match(finishDetails, /ctx\.(?:bezierCurveTo|quadraticCurveTo|ellipse|arc|lineTo)\(/u,
    'the finish pass must add real contour or material geometry')
  assert.doesNotMatch(finishDetails, /fillText|strokeText/u,
    'finish details must remain readable without relying on a letter or symbol')

  assert.match(runtime, /SPECIAL_ACORNS\.map\([\s\S]{0,280}entry\.visual\.palette/u,
    'special acorn styles must be derived from the complete authored roster')
  assert.match(runtime, /\.\.\.SPECIAL_BIRD_STYLES/u,
    'the generated special-acorn style registry must feed BIRD_STYLE')
  for (const type of [...campaignAcornTypes, ...talentAcornTypes]) {
    assert.match(runtime, new RegExp(`(?:^|\\n)\\s*(?:'${escapeRegExp(type)}'|${escapeRegExp(type)}):\\s*\\{`, 'u'),
      `${type} has no BIRD_STYLE registration`)
  }
  for (const type of launchableAcornTypes) {
    if (type === 'red') continue
    assert.match(completeArtSource, new RegExp(`visualType === '${escapeRegExp(type)}'`, 'u'),
      `${type} has no type-specific non-text silhouette/detail branch`)
  }
})

test('ordinary, boss, and every special squirrel variant retain distinct non-text finish art', () => {
  const drawSquirrel = classMethodSource('drawSquirrel')
  const specialGear = classMethodSource('drawSpecialSquirrelGear')
  const finishDetails = classMethodSource('drawSquirrelFinishDetails')

  assert.match(drawSquirrel, /this\.drawSquirrelFinishDetails\(/u,
    'all squirrels must pass through the shared facial/material finish pass')
  assert.match(drawSquirrel, /if \(squirrel\.isBoss && !roster\)/u,
    'non-roster generals and kings need a visibly separate boss treatment')
  assert.match(drawSquirrel, /squirrel\.variant === 'king'/u,
    'the king needs a silhouette distinct from other bosses')
  assert.match(drawSquirrel, /ctx\.(?:bezierCurveTo|quadraticCurveTo|ellipse|arc|lineTo)\(/u,
    'the ordinary squirrel body must be geometric artwork')
  assert.match(finishDetails, /ctx\.(?:bezierCurveTo|quadraticCurveTo|ellipse|arc|lineTo)\(/u,
    'the final squirrel art pass must add non-text contours or equipment detail')
  assert.doesNotMatch(finishDetails, /fillText|strokeText/u,
    'squirrel identity cannot depend on a written variant label')

  for (const entry of SPECIAL_SQUIRRELS) {
    assert.match(specialGear, new RegExp(`squirrel\\.variant === '${escapeRegExp(entry.type)}'`, 'u'),
      `${entry.type} has no dedicated equipment silhouette`)
    assert.ok(entry.visual.silhouette.length >= 20, `${entry.type} needs an authored silhouette contract`)
    assert.ok(new Set(Object.values(entry.visual.palette)).size >= 4,
      `${entry.type} needs a distinct material palette, not a recoloured normal squirrel`)
  }
})
