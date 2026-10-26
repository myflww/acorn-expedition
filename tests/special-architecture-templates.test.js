// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeStructureStability, rectCollisionManifold, rotatedRectBounds } from '../src/game-core.js'
import { SPECIAL_CAMPAIGNS } from '../src/special-campaigns.js'
import {
  SPECIAL_ARCHITECTURE_FAMILIES,
  SPECIAL_ARCHITECTURE_PROFILE_MAP,
  buildSpecialArchitectureTemplate,
  specialArchitectureProfileIds,
} from '../src/special-architecture-templates.js'

function assertRecursivelyFrozen(value, path = 'value') {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`)
  for (const [key, child] of Object.entries(value)) assertRecursivelyFrozen(child, `${path}.${key}`)
}

function campaignProfiles() {
  return SPECIAL_CAMPAIGNS.flatMap((campaign) => campaign.stages.map((stage) => ({
    profileId: stage.layoutModifiers.find((modifier) => modifier.kind === 'tower-profile')?.value,
    stage: stage.number,
  })))
}

function silhouetteSignature(template) {
  return template.blocks.map((block) => [
    Math.round((block.x - 820) / 4),
    Math.round((block.y - 520) / 4),
    Math.round(block.width / 4),
    Math.round(block.height / 4),
    Math.round(block.rotation),
  ].join(':')).sort().join('|')
}

test('all twenty authored profile ids map to five frozen realms and ten non-stacked variants', () => {
  const authoredIds = campaignProfiles().map((entry) => entry.profileId).sort()
  assert.equal(authoredIds.length, 20)
  assert.deepEqual([...specialArchitectureProfileIds()].sort(), authoredIds)
  assert.equal(Object.keys(SPECIAL_ARCHITECTURE_FAMILIES).length, 5)
  assert.equal(new Set(Object.values(SPECIAL_ARCHITECTURE_PROFILE_MAP).map((entry) => entry.realm)).size, 5)
  assert.equal(Object.values(SPECIAL_ARCHITECTURE_FAMILIES)
    .reduce((count, family) => count + Object.keys(family.variants).length, 0), 10)
  assertRecursivelyFrozen(SPECIAL_ARCHITECTURE_FAMILIES, 'SPECIAL_ARCHITECTURE_FAMILIES')
  assertRecursivelyFrozen(SPECIAL_ARCHITECTURE_PROFILE_MAP, 'SPECIAL_ARCHITECTURE_PROFILE_MAP')
})

test('every authored stage builds grounded finite descriptors with braces, asymmetry, and a local weak point', () => {
  for (const { profileId, stage } of campaignProfiles()) {
    const template = buildSpecialArchitectureTemplate({ profileId, stage, groundY: 520, originX: 820, seed: 71 })
    assert.equal(template.profileId, profileId)
    assert.equal(template.stage, stage)
    assert.ok(template.blocks.length >= 6)
    assert.ok(template.blocks.every((block) => block.architectureTheme === template.metadata.realm),
      `${profileId}: architecture theme must match metadata realm`)
    assert.ok(template.blocks.some((block) => Math.abs(block.rotation) >= 18), `${profileId}: diagonal brace`)
    assert.ok(template.blocks.some((block) => block.critical), `${profileId}: local weak point`)
    assert.ok(template.blocks.some((block) => block.x < 800))
    assert.ok(template.blocks.some((block) => block.x > 840))
    assert.ok(template.blocks.every((block) => (
      [block.x, block.y, block.width, block.height, block.hp, block.mass, block.rotation]
        .every(Number.isFinite)
      && block.type === 'wood'
      && block.width > 0
      && block.height > 0
      && block.hp === 3
      && block.mass > 0
    )), `${profileId}: base block compatibility`)
    const grounded = template.blocks.filter((block) => Math.abs(rotatedRectBounds(block).bottom - 520) <= 0.01)
    assert.ok(grounded.length >= 2, `${profileId}: grounded supports`)
    const stability = analyzeStructureStability(
      template.blocks.map((block, index) => ({ ...block, id: `${profileId}:${index}` })),
      [],
      { groundY: 520 },
    )
    assert.equal(stability.unstableIds.size, 0, `${profileId}: unstable opening geometry`)
    assert.ok(template.metadata.weakPointCount >= 1)
    assert.ok(template.metadata.diagonalCount >= 2)
    assert.ok(template.metadata.bounds.bottom <= 520.01)
    assertRecursivelyFrozen(template.metadata, `${profileId}.metadata`)
  }
})

test('collision-friendly templates contain no meaningful initial penetration', () => {
  for (const { profileId, stage } of campaignProfiles()) {
    const { blocks } = buildSpecialArchitectureTemplate({ profileId, stage, seed: 19 })
    for (let first = 0; first < blocks.length; first += 1) {
      for (let second = first + 1; second < blocks.length; second += 1) {
        const manifold = rectCollisionManifold(blocks[first], blocks[second])
        assert.ok(!manifold || manifold.overlap <= 0.12,
          `${profileId}: blocks ${first}/${second} penetrate by ${manifold?.overlap}`)
      }
    }
  }
})

test('stage difficulty grows each family without reverting to four-column stacking', () => {
  const representatives = ['twin-narrow', 'flooded-alley', 'double-facade', 'low-ceiling', 'quake-training-span']
  for (const profileId of representatives) {
    const opening = buildSpecialArchitectureTemplate({ profileId, stage: 1, seed: 5 })
    const finale = buildSpecialArchitectureTemplate({ profileId, stage: 4, seed: 5 })
    assert.ok(finale.blocks.length >= opening.blocks.length + 5, profileId)
    assert.ok(finale.metadata.bounds.width > opening.metadata.bounds.width, profileId)
    assert.ok(finale.metadata.bounds.height > opening.metadata.bounds.height, profileId)
    assert.equal(opening.metadata.difficultyTier, 1)
    assert.equal(finale.metadata.difficultyTier, 4)
    const verticalPosts = finale.blocks.filter((block) => block.role === 'post' && Math.abs(block.rotation) < 0.01)
    assert.ok(verticalPosts.length < finale.blocks.length * 0.7, `${profileId}: overly columnar silhouette`)
  }
})

test('the twenty current profiles produce many deterministic collision silhouettes', () => {
  const firstPass = campaignProfiles().map(({ profileId, stage }) => (
    buildSpecialArchitectureTemplate({ profileId, stage, seed: 991 })
  ))
  const secondPass = campaignProfiles().map(({ profileId, stage }) => (
    buildSpecialArchitectureTemplate({ profileId, stage, seed: 991 })
  ))
  assert.deepEqual(firstPass, secondPass)
  assert.ok(new Set(firstPass.map(silhouetteSignature)).size >= 15)
  firstPass[0].blocks[0].x = -999
  assert.notEqual(secondPass[0].blocks[0].x, -999, 'callers receive independent mutable descriptors')
})

test('invalid profile and placement inputs fail before emitting malformed geometry', () => {
  assert.throws(() => buildSpecialArchitectureTemplate({ profileId: 'missing-profile' }), RangeError)
  assert.throws(() => buildSpecialArchitectureTemplate({ profileId: 'twin-narrow', groundY: Infinity }), TypeError)
  assert.throws(() => buildSpecialArchitectureTemplate({ profileId: 'twin-narrow', originX: NaN }), TypeError)
})
