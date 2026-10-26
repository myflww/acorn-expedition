// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const sourceRoot = path.join(projectRoot, 'src')

function projectFiles(directory = projectRoot, relativeRoot = '') {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(relativeRoot, entry.name)
    if (entry.isDirectory()) files.push(...projectFiles(path.join(directory, entry.name), relative))
    else files.push(relative)
  }
  return files
}

function importedModules(relativeFile) {
  const source = readFileSync(path.join(projectRoot, relativeFile), 'utf8')
  return [...source.matchAll(
    /(?:import|export)\s+(?:[^"']*?\sfrom\s*)?["'](\.\.?\/[^"']+)["']/gu,
  )].map((match) => path.posix.normalize(
    path.posix.join(path.posix.dirname(relativeFile), match[1]),
  ))
}

test('project tree contains no generated QA art, backups, or build caches', () => {
  const files = projectFiles()
  const staleFiles = files.filter((file) => (
    /(?:^|\/)(?:qa-|design-qa)/iu.test(file)
    || /(?:\.bak|\.old|\.orig|\.tmp|~)$/iu.test(file)
    || /(?:^|\/)\.DS_Store$/u.test(file)
  ))
  assert.deepEqual(staleFiles, [])

  const rootDirectories = readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const generatedDirectories = rootDirectories.filter((name) => (
    ['node_modules', 'coverage', 'dist', 'build', '.cache'].includes(name)
  ))
  assert.deepEqual(generatedDirectories, [])
})

test('every production source module is reachable from a browser entry point', () => {
  const reachable = new Set()
  const visit = (relativeFile) => {
    if (reachable.has(relativeFile)) return
    reachable.add(relativeFile)
    for (const imported of importedModules(relativeFile)) visit(imported)
  }
  visit('src/boot-check.js')
  visit('src/game.js')

  const productionModules = readdirSync(sourceRoot)
    .filter((name) => name.endsWith('.js'))
    .map((name) => `src/${name}`)
    .sort()
  assert.deepEqual([...reachable].sort(), productionModules)
})
