// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { CONSTRUCTION_MATERIALS } from '../src/main-architecture-blueprints.js'
import { DISCOVERIES, discoveryArtMarkup } from '../src/discoveries.js'

const EXPECTED_VISUALS = Object.freeze({
  'canvas-screen': { fill: '#d8c59b', motif: 'cross-laced-fabric' },
  'resin-timber': { fill: '#b87435', motif: 'resin-drips-leaf' },
  'packed-earth': { fill: '#9e6849', motif: 'staggered-bricks-root-leaf' },
  'resin-glass': { fill: '#77bdb3', motif: 'gold-bands-glint-spark' },
  'leaf-iron-plate': { fill: '#3f6259', motif: 'shield-ribs-double-leaf' },
})

test('field guide and battlefield share one immutable visual contract for every special material', () => {
  const fills = new Set()
  const motifs = new Set()
  for (const [constructionId, expected] of Object.entries(EXPECTED_VISUALS)) {
    const construction = CONSTRUCTION_MATERIALS[constructionId]
    const visual = construction.visual
    assert.ok(visual && Object.isFrozen(visual), `${constructionId}: frozen visual contract`)
    assert.equal(visual.fill, expected.fill, `${constructionId}: field-guide fill`)
    assert.equal(visual.motif, expected.motif, `${constructionId}: identity motif`)
    assert.match(visual.outline, /^#[0-9a-f]{6}$/iu)
    assert.match(visual.line, /^#[0-9a-f]{6}$/iu)
    assert.match(visual.accent, /^#[0-9a-f]{6}$/iu)
    assert.match(visual.secondary, /^#[0-9a-f]{6}$/iu)
    fills.add(visual.fill)
    motifs.add(visual.motif)

    const discovery = DISCOVERIES[construction.discoveryId]
    assert.equal(discovery.title, construction.name, `${constructionId}: matching field-guide name`)
    const art = discoveryArtMarkup(construction.discoveryId)
    assert.match(art, new RegExp(`data-construction-id="${constructionId}"`, 'u'))
    assert.match(art, new RegExp(`data-visual-motif="${visual.motif}"`, 'u'))
    assert.match(art, new RegExp(`--construction-fill:${visual.fill}`, 'u'))
  }
  assert.equal(fills.size, Object.keys(EXPECTED_VISUALS).length)
  assert.equal(motifs.size, Object.keys(EXPECTED_VISUALS).length)
})

test('battlefield renderer preserves every field-guide signature above generic structure decoration', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const identityStart = runtime.indexOf('  drawConstructionIdentityMark(')
  const identityEnd = runtime.indexOf('  drawStructureJointHardware(', identityStart)
  const identity = runtime.slice(identityStart, identityEnd)
  assert.ok(identityStart >= 0 && identityEnd > identityStart)

  const ids = Object.keys(EXPECTED_VISUALS)
  const branch = (id, nextId) => {
    const start = identity.indexOf(`constructionId === '${id}'`)
    const end = nextId ? identity.indexOf(`constructionId === '${nextId}'`, start) : identity.length
    assert.ok(start >= 0 && end > start, `${id}: independent battlefield branch`)
    return identity.slice(start, end)
  }
  const canvas = branch(ids[0], ids[1])
  const resin = branch(ids[1], ids[2])
  const earth = branch(ids[2], ids[3])
  const glass = branch(ids[3], ids[4])
  const armor = branch(ids[4])

  assert.match(canvas, /setLineDash/u)
  assert.match(canvas, /lineTo/u)
  assert.match(canvas, /bezierCurveTo/u)
  assert.match(resin, /dropHeight[\s\S]*?quadraticCurveTo[\s\S]*?leafPath/u)
  assert.match(earth, /courses[\s\S]*?seamX[\s\S]*?bezierCurveTo[\s\S]*?leafPath/u)
  assert.match(glass, /bandHeight[\s\S]*?visual\.highlight[\s\S]*?sparkPath/u)
  assert.match(armor, /armorRatio/u)
  assert.match(armor, /visibleRivets/u)
  assert.match(armor, /leafPath/u)
  assert.match(armor, /if \(armorRatio > 0\) ctx\.fill\(\)/u)

  const surfaceStart = runtime.indexOf('  drawConstructionMaterialAccent(')
  const surfaceEnd = runtime.indexOf('  drawConstructionIdentityMark(', surfaceStart)
  const surface = runtime.slice(surfaceStart, surfaceEnd)
  assert.match(surface, /if \(!intact\) \{[\s\S]*?ctx\.restore\(\)[\s\S]*?return/u)

  const drawBlock = runtime.slice(runtime.indexOf('  drawBlock('), runtime.indexOf('  drawSquirrel('))
  assert.ok(drawBlock.indexOf('this.drawConstructionMaterialAccent(')
    < drawBlock.indexOf('this.drawConstructionIdentityMark('))
  assert.ok(drawBlock.indexOf('this.drawConstructionIdentityMark(')
    < drawBlock.indexOf('if (block.hp < block.maxHp)'))
})

test('leaf-iron nails and root-gray masonry render only at live physical contacts', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const start = runtime.indexOf('  drawStructureJointHardware(')
  const end = runtime.indexOf('  drawArchitectureLandmarkAccent(', start)
  const hardware = runtime.slice(start, end)
  const render = runtime.slice(runtime.indexOf('  render() {'), runtime.indexOf('  drawDecoy('))

  assert.match(hardware, /for \(const joint of this\.structureJoints\)/u)
  assert.match(hardware, /joint\.broken/u)
  assert.match(hardware, /blocksById\.get\(joint\.firstId\)/u)
  assert.match(hardware, /blocksById\.get\(joint\.secondId\)/u)
  assert.match(hardware, /rotatedRectBounds\(first\)/u)
  assert.match(hardware, /overlapCenter/u)
  assert.match(hardware, /upperBounds\.bottom \+ lowerBounds\.top/u)
  assert.match(hardware, /leftBounds\.right \+ rightBounds\.left/u)
  assert.match(hardware, /joint\.kind === 'nail'/u)
  assert.match(hardware, /joint\.contact === 'bearing'/u)
  assert.doesNotMatch(hardware, /jointKinds/u)
  assert.doesNotMatch(runtime, /block\.jointKinds\?\.includes\('(nail|masonry)'\)/u)
  assert.ok(render.indexOf('for (const block of this.blocks) this.drawBlock(block)')
    < render.indexOf('this.drawStructureJointHardware()'))
})

test('connected construction seams expose resin, root, and iron-clamp identities at readable scale', () => {
  const runtime = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8')
  const start = runtime.indexOf('  drawStructureJointHardware(')
  const end = runtime.indexOf('  drawArchitectureLandmarkAccent(', start)
  const hardware = runtime.slice(start, end)
  assert.ok(start >= 0 && end > start)

  const allowedKinds = hardware.match(/!\[([\s\S]*?)\]\.includes\(joint\.kind\)/u)
  assert.ok(allowedKinds, 'joint renderer must retain an explicit live-kind allow list')
  for (const kind of ['nail', 'masonry', 'resin-bond', 'root-bond', 'iron-clamp']) {
    assert.match(allowedKinds[1], new RegExp(`['"]${kind}['"]`, 'u'), `${kind}: renderable joint kind`)
  }

  const branch = (kind) => {
    const marker = `joint.kind === '${kind}'`
    const branchStart = hardware.indexOf(marker)
    assert.ok(branchStart >= 0, `${kind}: independent visual branch`)
    const nextBranch = hardware.indexOf("joint.kind === '", branchStart + marker.length)
    return hardware.slice(branchStart, nextBranch < 0 ? hardware.length : nextBranch)
  }
  const resin = branch('resin-bond')
  const root = branch('root-bond')
  const iron = branch('iron-clamp')

  assert.match(resin, /amber|glue|resinDrop|\u80f6\u6ef4|\u6ef4\u80f6/iu,
    'resin bond needs an explicit amber/glue-drop identity')
  assert.match(resin, /quadraticCurveTo|bezierCurveTo|ellipse/u,
    'resin bond needs a curved or droplet silhouette')
  assert.match(root, /tendril|root(?:Fiber|Strand|Curve|Path)|\u6839\u675f|\u6839\u4e1d/iu,
    'root bond needs visible root or tendril marks')
  assert.match(root, /quadraticCurveTo|bezierCurveTo/u,
    'root bond tendrils must visibly cross the contact seam')
  assert.match(iron, /rivet|bolt|\u94c6\u9489/iu,
    'iron clamp needs visible rivet heads')
  assert.match(iron, /roundedRect[\s\S]*?arc/u,
    'iron clamp needs a plate silhouette plus rivets')

  const mortarSize = hardware.match(
    /const mortarLength\s*=\s*clamp\(\s*contactSpan\s*\*\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/u,
  )
  assert.ok(mortarSize, 'masonry must derive its visible seam length from the physical contact span')
  const [, coverageRatio, minimumLength, maximumLength] = mortarSize.map(Number)
  assert.ok(coverageRatio >= 0.85, `masonry contact coverage ${coverageRatio} is still too short`)
  assert.ok(minimumLength >= 16, `masonry minimum length ${minimumLength} is still too small`)
  assert.ok(maximumLength >= 42, `masonry maximum length ${maximumLength} is still too small`)

  const mortarBody = hardware.match(
    /roundedRect\(\s*ctx\s*,\s*-mortarLength\s*\/\s*2\s*,\s*-[\d.]+\s*,\s*mortarLength\s*,\s*([\d.]+)\s*,/u,
  )
  assert.ok(mortarBody, 'masonry must render a measurable full-width seam body')
  assert.ok(Number(mortarBody[1]) >= 7,
    `masonry seam thickness ${mortarBody[1]} must be visibly larger than the old 4.8px strip`)
})

test('field-guide CSS consumes the shared palette variables instead of duplicating five colors', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
  assert.match(css, /\.discovery-canvas-screen,[\s\S]*?\.discovery-leaf-iron-plate \{ fill:var\(--construction-fill\); \}/u)
  assert.match(css, /\.discovery-svg\[data-construction-id\][\s\S]*?stroke:var\(--construction-line\)/u)
  assert.match(css, /\.discovery-rivet \{ fill:var\(--construction-accent,#f2b84d\); \}/u)
  assert.match(css, /\.discovery-leaf \{ fill:var\(--construction-secondary,#728b55\); \}/u)
})
