// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { DISCOVERIES, DISCOVERY_IDS, DISCOVERY_LORE } from '../src/discoveries.js'

const SETTING_TERMS = /(?:橡心|王国|王庭|远征|守备队|粮仓|古树|根脉|林冠|冬粮|松鼠)/u

test('every field-guide discovery owns one complete archive lore passage', () => {
  assert.deepEqual(Object.keys(DISCOVERY_LORE), DISCOVERY_IDS)

  for (const id of DISCOVERY_IDS) {
    const { lore } = DISCOVERIES[id]
    assert.equal(lore, DISCOVERY_LORE[id], `${id} exposes its registered lore`)
    assert.equal(typeof lore, 'string')
    assert.ok(lore.length >= 70, `${id} lore is substantial (${lore.length})`)
    assert.ok(lore.length <= 180, `${id} lore remains suitable for a detail modal (${lore.length})`)
    assert.doesNotMatch(lore, /[\r\n]/u, `${id} lore stays a single paragraph`)
    assert.match(lore, SETTING_TERMS, `${id} lore belongs to the Acornheart setting`)
    assert.match(lore, /。.+。$/u, `${id} lore contains developed narrative rather than a label`)
  }
})

test('archive lore is original per discovery rather than repeated template copy', () => {
  const passages = DISCOVERY_IDS.map((id) => DISCOVERIES[id].lore)
  const openings = passages.map((lore) => lore.slice(0, 12))

  assert.equal(new Set(passages).size, passages.length, 'full passages are unique')
  assert.equal(new Set(openings).size, openings.length, 'each passage begins with a distinct narrative hook')
})

test('lore remains immutable with the rest of the public discovery schema', () => {
  assert.ok(Object.isFrozen(DISCOVERY_LORE))
  assert.ok(Object.isFrozen(DISCOVERIES))
  for (const entry of Object.values(DISCOVERIES)) {
    assert.ok(Object.isFrozen(entry))
    assert.ok(entry.title && entry.category && entry.summary && entry.action && entry.tip && entry.lore)
  }
})
