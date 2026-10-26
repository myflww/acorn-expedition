// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { MAIN_BOSS_LEVELS, MAIN_LEVELS, STORY, generateLevel } from '../src/game-core.js'
import {
  MAIN_ENVIRONMENT_THEME_BY_LEVEL,
  MAIN_ENVIRONMENT_THEME_COUNT,
  MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION,
  MAIN_ENVIRONMENT_THEMES,
  getMainEnvironmentTheme,
  validateMainEnvironmentThemes,
} from '../src/main-environment-themes.js'

test('main environment themes cover every one of the eighteen campaign levels', () => {
  assert.equal(MAIN_ENVIRONMENT_THEME_COUNT, MAIN_LEVELS)
  assert.equal(MAIN_ENVIRONMENT_THEMES.length, MAIN_LEVELS)
  assert.deepEqual(MAIN_ENVIRONMENT_THEMES.map((entry) => entry.level),
    Array.from({ length: MAIN_LEVELS }, (_, index) => index + 1))
  assert.equal(new Set(MAIN_ENVIRONMENT_THEMES.map((entry) => entry.id)).size, MAIN_LEVELS)
  assert.equal(new Set(MAIN_ENVIRONMENT_THEMES.map((entry) => entry.sceneName)).size, MAIN_LEVELS)
  assert.ok(Object.isFrozen(MAIN_ENVIRONMENT_THEMES))
  assert.ok(Object.isFrozen(MAIN_ENVIRONMENT_THEME_BY_LEVEL))
  for (const entry of MAIN_ENVIRONMENT_THEMES) {
    assert.equal(entry.schemaVersion, MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION)
    assert.equal(getMainEnvironmentTheme(entry.level), entry)
    assert.ok(Object.isFrozen(entry))
    assert.ok(Object.isFrozen(entry.palette))
    assert.ok(Object.isFrozen(entry.environmentElements))
    assert.ok(Object.isFrozen(entry.architecture.materialBias))
  }
  assert.equal(getMainEnvironmentTheme(0), null)
  assert.equal(getMainEnvironmentTheme(MAIN_LEVELS + 1), null)
  assert.equal(getMainEnvironmentTheme('not-a-level'), null)
})

test('themes align chapter names and story nodes with the authored main STORY milestones', () => {
  assert.deepEqual(
    MAIN_ENVIRONMENT_THEMES.filter((entry) => entry.storyNode).map((entry) => entry.level),
    STORY.map((entry) => entry.level),
  )
  for (const story of STORY) {
    const theme = getMainEnvironmentTheme(story.level)
    assert.equal(theme.chapterName, story.title)
    assert.ok(theme.narrative.summary.length >= 28)
    assert.ok(theme.narrative.continuity.length >= 25)
  }
  for (let level = 2; level <= MAIN_LEVELS; level += 1) {
    const current = getMainEnvironmentTheme(level)
    const previous = getMainEnvironmentTheme(level - 1)
    assert.ok(current.narrative.continuity.length > 0, `level ${level} lacks a continuity bridge from ${previous.sceneName}`)
  }
})

test('render contract supplies complete palettes, weather, layered elements, architecture, and rule cues', () => {
  assert.deepEqual(validateMainEnvironmentThemes(), { valid: true, errors: [] })
  const hex = /^#[0-9a-f]{6}$/iu
  for (const entry of MAIN_ENVIRONMENT_THEMES) {
    assert.equal(Object.keys(entry.palette).length, 10)
    assert.ok(Object.values(entry.palette).every((color) => hex.test(color)))
    assert.ok(entry.weather.intensity >= 0 && entry.weather.intensity <= 1)
    assert.ok(entry.weather.windVisual >= 0 && entry.weather.windVisual <= 1)
    assert.ok(entry.environmentElements.length >= 3)
    assert.ok(new Set(entry.environmentElements.map((element) => element.layer)).size >= 2)
    assert.ok(entry.architecture.motifs.length >= 3)
    assert.ok(entry.architecture.description.length >= 30)
    const materialTotal = Object.values(entry.architecture.materialBias).reduce((sum, value) => sum + value, 0)
    assert.ok(Math.abs(materialTotal - 1) < 1e-9)
    assert.ok(entry.ruleHints.length >= 1)
  }
})

test('boss story nodes expose an authored arena instead of relying on generic safe-spawn composition', () => {
  assert.deepEqual(MAIN_ENVIRONMENT_THEMES.filter((entry) => entry.bossNode).map((entry) => entry.level), MAIN_BOSS_LEVELS)
  for (const level of MAIN_BOSS_LEVELS) {
    const theme = getMainEnvironmentTheme(level)
    const arena = theme.architecture.bossArena
    assert.ok(arena)
    assert.ok(arena.minimumClearance >= 80)
    assert.ok(arena.focalPoint.x >= 0.7 && arena.focalPoint.x <= 0.78)
    assert.ok(arena.focalPoint.y >= 0.7 && arena.focalPoint.y <= 0.85)
    assert.ok(theme.ruleHints.some((entry) => entry.priority === 'boss'))
  }
  for (const theme of MAIN_ENVIRONMENT_THEMES.filter((entry) => !entry.bossNode)) {
    assert.equal(theme.architecture.bossArena, null)
  }
})

test('levels thirteen through eighteen visibly approach and enter the stone squirrel-kingdom core', () => {
  const lateThemes = MAIN_ENVIRONMENT_THEMES.slice(12)
  assert.deepEqual(lateThemes.map((entry) => entry.level), [13, 14, 15, 16, 17, 18])
  assert.ok(lateThemes.every((entry) => entry.architecture.materialBias.stone >= 0.34))
  assert.ok(lateThemes.every((entry) => entry.architecture.scale >= 0.72))
  assert.deepEqual(lateThemes.map((entry) => entry.architecture.materialBias.stone), [0.34, 0.42, 0.52, 0.55, 0.62, 0.68])
  assert.deepEqual(lateThemes.slice(2).map((entry) => entry.architecture.realmLayer),
    Array.from({ length: 4 }, () => 'squirrel-kingdom-core'))
  for (const theme of lateThemes.slice(2)) {
    const combinedCopy = [theme.sceneName, theme.architecture.style, ...theme.architecture.motifs,
      theme.narrative.summary].join('')
    assert.match(combinedCopy, /王|城|国/u)
    assert.ok(theme.environmentElements.some((element) => /citadel|capital|royal|rampart|court|throne/u.test(element.kind)))
  }
})

test('main level generation and the Canvas renderer consume the authored environment contract', () => {
  for (const level of [1, 4, 6, 10, 13, 18]) {
    const theme = getMainEnvironmentTheme(level)
    const generated = generateLevel({ level, seed: 29, mode: 'main' })
    assert.equal(generated.environmentThemeId, theme.id)
    assert.equal(generated.architectureStyle, theme.architecture.style)
    assert.deepEqual(generated.materialBias, theme.architecture.materialBias)
    assert.notEqual(generated.materialBias, theme.architecture.materialBias)
  }

  const earlyStones = Array.from({ length: 30 }, (_, index) => (
    generateLevel({ level: 1, seed: index + 1, mode: 'main' }).stoneCount
  )).reduce((sum, count) => sum + count, 0)
  const finaleStones = Array.from({ length: 30 }, (_, index) => (
    generateLevel({ level: 18, seed: index + 1, mode: 'main' }).stoneCount
  )).reduce((sum, count) => sum + count, 0)
  assert.ok(finaleStones > earlyStones * 5, 'the final stone citadel should materially differ from the village')

  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(runtime, /this\.mode === 'main' \|\| this\.mode === 'endless'/u)
  assert.match(runtime, /getMainEnvironmentTheme\(generated\.environmentThemeLevel \|\| this\.level\)/u)
  assert.match(runtime, /drawMainEnvironmentBackground\(this\.mainEnvironmentTheme\)/u)
  assert.match(runtime, /mainEnvironmentTheme\?\.palette/u)
})

test('validator reports incomplete, duplicated, and malformed custom theme data without throwing', () => {
  const malformed = structuredClone(MAIN_ENVIRONMENT_THEMES)
  malformed[0].id = malformed[1].id
  malformed[0].palette.skyTop = 'navy'
  malformed[0].architecture.materialBias.wood = 0.2
  malformed[5].architecture.bossArena = null
  malformed.pop()
  const result = validateMainEnvironmentThemes(malformed)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('.id: must be unique')))
  assert.ok(result.errors.some((error) => error.includes('.palette.skyTop')))
  assert.ok(result.errors.some((error) => error.includes('.materialBias: must sum to 1')))
  assert.ok(result.errors.some((error) => error.includes('.bossArena: is required for a boss node')))
  assert.ok(result.errors.some((error) => error.includes('is missing level 18')))
  assert.deepEqual(validateMainEnvironmentThemes(null), { valid: false, errors: ['themes must be an array'] })
})
