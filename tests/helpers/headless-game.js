// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { readFileSync } from 'node:fs'

// A deterministic simulation of the real game class. Only DOM, presentation,
// audio and the animation scheduler are replaced; world creation, motion,
// collisions, abilities and win/loss decisions execute the shipped code.
export async function createHeadlessGame() {
  const gameUrl = new URL('../../src/game.js', import.meta.url)
  const source = readFileSync(gameUrl, 'utf8')
  const imports = [...source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)'/gu)]
  const dependencies = {}
  for (const [, names, specifier] of imports) {
    const module = await import(new URL(specifier, gameUrl))
    for (const entry of names.split(',').map((name) => name.trim()).filter(Boolean)) {
      const [exportName, localName = exportName] = entry.split(/\s+as\s+/u)
      dependencies[localName] = module[exportName]
    }
  }
  const noOp = () => {}
  const node = {
    hidden: false, dataset: {}, style: { setProperty: noOp },
    classList: { add: noOp, remove: noOp, toggle: noOp },
    focus: noOp, querySelectorAll: () => [], setAttribute: noOp,
    getContext: () => new Proxy({}, { get: () => noOp }),
    getAttribute: () => null, getBoundingClientRect: () => ({ width: 1280, height: 720 }),
  }
  Object.assign(dependencies, {
    SoundFX: class { constructor() { return new Proxy({}, { get: () => noOp }) } },
    window: {
      location: { search: '?qa=1&seed=20260907' },
      matchMedia: () => ({ matches: false, addEventListener: noOp }),
    },
    document: { querySelector: () => node, fullscreenElement: null, documentElement: node },
    requestAnimationFrame: noOp, queueMicrotask: noOp,
  })
  const code = source.replace(/import\s*\{[\s\S]*?\}\s*from\s*'[^']+'\s*/gu, '')
    .split('const game = new AcornGame()')[0]
  const Game = new Function(...Object.keys(dependencies), `${code}\nreturn AcornGame`)(...Object.values(dependencies))
  for (const name of ['bindEvents', 'showMenu', 'syncUI', 'syncMotionPreference',
    'showBanner', 'focusPanelButton', 'showCoachmark', 'hideCoachmark',
    'openDiscovery', 'showNextDiscovery', 'updateNotices']) Game.prototype[name] = noOp
  const game = new Game()
  for (const id of Object.keys(dependencies.DISCOVERIES)) game.save.seenDiscoveries[id] = true
  return game
}
