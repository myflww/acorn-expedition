// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { swapLoadedAmmoWithQueue } from '../src/ammo-queue.js'

test('selecting any reserve atomically swaps type, fairness metadata, and exact ace identity', () => {
  const input = {
    loaded: { type: 'red', bonusShot: false, damageBonus: 0, aceSupply: false },
    queue: ['bomb', 'frost', 'dash'],
    bonusFlags: [true, false, true],
    damageBonuses: [2, 0, 4],
    aceFlags: [false, false, true],
    selectedIndex: 2,
  }
  const result = swapLoadedAmmoWithQueue(input)

  assert.deepEqual(result.loaded, {
    type: 'dash', bonusShot: true, damageBonus: 4, aceSupply: true,
  })
  assert.deepEqual(result.queue, ['bomb', 'frost', 'red'])
  assert.deepEqual(result.bonusFlags, [true, false, false])
  assert.deepEqual(result.damageBonuses, [2, 0, 0])
  assert.deepEqual(result.aceFlags, [false, false, false])
  assert.deepEqual(input.queue, ['bomb', 'frost', 'dash'], 'selection must not mutate live arrays mid-transaction')
})

test('non-selected reserve acorns retain relative order and complete metadata', () => {
  const result = swapLoadedAmmoWithQueue({
    loaded: { type: 'vine', bonusShot: true, damageBonus: 3, aceSupply: true },
    queue: ['red', 'bomb', 'split', 'frost'],
    bonusFlags: [false, false, true, false],
    damageBonuses: [0, 1, 2, 0],
    aceFlags: [false, false, true, false],
    selectedIndex: 1,
  })
  assert.deepEqual(result.loaded, {
    type: 'bomb', bonusShot: false, damageBonus: 1, aceSupply: false,
  })
  assert.deepEqual(result.queue, ['red', 'vine', 'split', 'frost'])
  assert.deepEqual(result.bonusFlags, [false, true, true, false])
  assert.deepEqual(result.damageBonuses, [0, 3, 2, 0])
  assert.deepEqual(result.aceFlags, [false, true, true, false])
})

test('invalid or desynchronised selection is rejected before any ammo can be lost', () => {
  const base = {
    loaded: { type: 'red' }, queue: ['bomb'], bonusFlags: [false], damageBonuses: [0],
    aceFlags: [false],
  }
  assert.throws(() => swapLoadedAmmoWithQueue({ ...base, selectedIndex: 1 }), /out of bounds/u)
  assert.throws(() => swapLoadedAmmoWithQueue({
    ...base, bonusFlags: [], selectedIndex: 0,
  }), /must stay aligned/u)
  assert.throws(() => swapLoadedAmmoWithQueue({
    ...base, aceFlags: [], selectedIndex: 0,
  }), /must stay aligned/u)
})

test('desktop selector is accessible and runtime gating preserves shot count and bonus count', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

  assert.match(html, /id="shot-selector"[\s\S]*aria-labelledby="shot-selector-title"/u)
  assert.match(html, /id="shot-selector-list"[\s\S]*role="group"/u)
  assert.match(source, /selectQueuedBird\(index\)[\s\S]*swapLoadedAmmoWithQueue/u)
  assert.match(source, /!this\.turnActive[\s\S]*!this\.dragging[\s\S]*!this\.currentBird\.launched/u)
  assert.match(source, /data-queue-index=/u)
  assert.match(source, /aria-label="将待发第/u)
  assert.match(source, /this\.currentBird\.bonusShot = result\.loaded\.bonusShot/u)
  assert.match(source, /this\.currentBird\.grantedDamageBonus = result\.loaded\.damageBonus/u)
  assert.match(source, /aceSupply:\s*this\.currentBird\.aceSupply/u)
  assert.match(source, /aceFlags:\s*this\.shotQueueAce/u)
  assert.match(source, /this\.currentBird\.aceSupply = result\.loaded\.aceSupply/u)
  assert.doesNotMatch(source.match(/selectQueuedBird\(index\) \{[\s\S]*?\n  \}/u)?.[0] || '', /shotsRemaining\s*[+\-=]/u)
  assert.doesNotMatch(source.match(/selectQueuedBird\(index\) \{[\s\S]*?\n  \}/u)?.[0] || '', /bonusShotsRemaining\s*[+\-=]/u)
  assert.match(css, /\.shot-selector-list[\s\S]*flex-wrap:\s*wrap/u)
  assert.match(css, /\.shot-select-button:focus-visible/u)
})
