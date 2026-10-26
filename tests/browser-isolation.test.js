// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('static Web entry denies network bridges and runs the disown script before game code', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const policy = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/u)?.[1]

  assert.ok(policy)
  for (const directive of [
    "default-src 'none'",
    "script-src 'self'",
    "connect-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]) assert.match(policy, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))

  const bootIndex = html.indexOf('<script src="./src/boot-check.js"></script>')
  const gameIndex = html.indexOf('<script type="module" src="./src/game.js"></script>')
  assert.ok(bootIndex > 0)
  assert.ok(gameIndex > bootIndex)

  const boot = readFileSync(new URL('../src/boot-check.js', import.meta.url), 'utf8')
  assert.match(boot, /window\.opener = null/u)
  assert.match(boot, /window\.top !== window\.self/u)
  assert.match(boot, /location\.replace\('about:blank'\)/u)
})

test('game save remains local to the isolated game origin', () => {
  const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  assert.match(game, /const storage = window\.localStorage/u)
  assert.doesNotMatch(game, /(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/u)
})
