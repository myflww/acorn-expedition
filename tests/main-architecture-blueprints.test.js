// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COMPLETE_BUILDING_FORM_CATALOG,
  COMPLETE_BUILDING_SILHOUETTES,
  CONSTRUCTION_MATERIALS,
  LATE_CAMPAIGN_PHYSICAL_LAYOUTS,
  MAIN_ARCHITECTURE_BLUEPRINTS,
  architectureBlueprintForEncounter,
  mainArchitectureBlueprintForLevel,
  validateCompleteBuildingFormCatalog,
  validateCompleteBuildingSilhouettes,
  validateMainArchitectureBlueprints,
  validatePhysicalBuildingLayout,
} from '../src/main-architecture-blueprints.js'
import {
  BLOCK_MATERIALS,
  MAIN_LEVELS,
  STRUCTURE_FAMILY_RULES,
  calculateStructureComponentStats,
  calculateStructureWindLoad,
  generateLevel,
  isHardStructureMaterial,
} from '../src/game-core.js'

function assertRecursivelyFrozen(value, path = 'value', seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`)
  for (const [key, child] of Object.entries(value)) {
    assertRecursivelyFrozen(child, `${path}.${key}`, seen)
  }
}

function constructionIdsForBlueprint(blueprint) {
  return new Set([
    ...blueprint.constructionPalette.map((entry) => entry.constructionId),
    blueprint.landmark?.constructionId,
  ].filter(Boolean))
}

test('eighteen main architecture blueprints are unique, immutable, and valid', () => {
  assert.equal(MAIN_ARCHITECTURE_BLUEPRINTS.length, 18)
  assert.deepEqual(validateMainArchitectureBlueprints(), [])
  assertRecursivelyFrozen(MAIN_ARCHITECTURE_BLUEPRINTS, 'MAIN_ARCHITECTURE_BLUEPRINTS')

  assert.deepEqual(
    MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.level),
    Array.from({ length: 18 }, (_, index) => index + 1),
  )
  assert.equal(new Set(MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.id)).size, 18)
  assert.equal(new Set(MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.name)).size, 18)
  assert.equal(new Set(MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.motif)).size, 18)

  const authoredSignatures = new Set(MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => JSON.stringify({
    familyId: entry.familyId,
    towerFloors: entry.towerFloors,
    baseOffsets: entry.baseOffsets,
    geometry: entry.geometry,
    buildingPlan: entry.buildingPlan,
    constructionIds: [...constructionIdsForBlueprint(entry)].sort(),
    landmarkKind: entry.landmark?.kind || null,
  })))
  assert.equal(authoredSignatures.size, 18)

  for (const blueprint of MAIN_ARCHITECTURE_BLUEPRINTS) {
    assert.equal(mainArchitectureBlueprintForLevel(blueprint.level), blueprint)
    assert.ok(Object.values(STRUCTURE_FAMILY_RULES.ids).includes(blueprint.familyId))
    assert.equal(blueprint.baseOffsets.length, blueprint.towerFloors.length)
    assert.ok(blueprint.towerFloors.every((floors) => floors >= 2 && floors <= 5))
    assert.ok(Object.values(blueprint.geometry).every(Number.isFinite))
    assert.equal(blueprint.buildingPlan.completeBuilding, true)
    assert.equal(
      COMPLETE_BUILDING_FORM_CATALOG[blueprint.buildingPlan.formId].name.length > 0,
      true,
    )
    for (const constructionId of constructionIdsForBlueprint(blueprint)) {
      assert.ok(CONSTRUCTION_MATERIALS[constructionId], `${blueprint.id}: ${constructionId}`)
    }
  }

  assert.throws(() => mainArchitectureBlueprintForLevel(0), /between 1 and 18/u)
  assert.throws(() => mainArchitectureBlueprintForLevel(19), /between 1 and 18/u)
  assert.throws(() => mainArchitectureBlueprintForLevel(1.5), /between 1 and 18/u)
})

test('complete building form catalog defines reusable scientific silhouettes', () => {
  assert.equal(Object.keys(COMPLETE_BUILDING_FORM_CATALOG).length, 18)
  assert.deepEqual(validateCompleteBuildingFormCatalog(), [])
  assertRecursivelyFrozen(COMPLETE_BUILDING_FORM_CATALOG, 'COMPLETE_BUILDING_FORM_CATALOG')

  const formNames = new Set()
  for (const [formId, form] of Object.entries(COMPLETE_BUILDING_FORM_CATALOG)) {
    assert.match(formId, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u)
    assert.equal(form.completeBuilding, true)
    assert.ok(form.name.length > 0)
    assert.equal(formNames.has(form.name), false)
    formNames.add(form.name)
    assert.ok(form.towerForms.length >= 1)
    assert.equal(new Set(form.towerForms).size, form.towerForms.length)
    assert.ok(form.visualParts.length >= 3)
    assert.ok(form.complexity >= 1 && form.complexity <= 5)
    assert.ok(form.supportPathCount >= 1 && form.supportPathCount <= 4)
    for (const key of ['roof', 'wall', 'foundation', 'structuralSystem']) {
      assert.ok(form[key].length > 0, `${formId}.${key}`)
    }
  }

  const malformed = structuredClone(COMPLETE_BUILDING_FORM_CATALOG)
  malformed['gabled-granary'].completeBuilding = false
  malformed['lean-to-loading-shed'].towerForms = []
  malformed['terraced-checkpoint'].complexity = 9
  malformed['tripod-windmill-watch'].supportPathCount = 0
  malformed['suspension-freight-bridge'].visualParts = ['bridgeheads']
  const errors = validateCompleteBuildingFormCatalog(malformed)
  assert.ok(errors.some((error) => error.includes('.completeBuilding must be true')))
  assert.ok(errors.some((error) => error.includes('.towerForms')))
  assert.ok(errors.some((error) => error.includes('.complexity')))
  assert.ok(errors.some((error) => error.includes('.supportPathCount')))
  assert.ok(errors.some((error) => error.includes('.visualParts')))
  assert.deepEqual(validateCompleteBuildingFormCatalog(null), [
    'complete building form catalog must be an object',
  ])
})

test('silhouette contracts encode distinct masses, voids, roofs, wings, and mechanisms', () => {
  assert.equal(Object.keys(COMPLETE_BUILDING_SILHOUETTES).length, 18)
  assert.deepEqual(validateCompleteBuildingSilhouettes(), [])
  assertRecursivelyFrozen(COMPLETE_BUILDING_SILHOUETTES, 'COMPLETE_BUILDING_SILHOUETTES')

  assert.equal(
    new Set(Object.values(COMPLETE_BUILDING_SILHOUETTES).map((spec) => spec.composition)).size,
    18,
  )
  assert.equal(
    new Set(Object.values(COMPLETE_BUILDING_SILHOUETTES).map((spec) => JSON.stringify(spec))).size,
    18,
  )
  for (const [formId, spec] of Object.entries(COMPLETE_BUILDING_SILHOUETTES)) {
    assert.equal(COMPLETE_BUILDING_FORM_CATALOG[formId].silhouetteSpec, spec)
    assert.ok(spec.massing.length >= 1, `${formId}: massing`)
    assert.ok(spec.roofSegments.length >= 1, `${formId}: roofs`)
    assert.ok(spec.openings.length >= 1, `${formId}: intentional voids`)
    assert.equal(new Set(spec.massing.map((mass) => mass.id)).size, spec.massing.length)
    const anchored = new Set(spec.mechanismAnchors.map((anchor) => anchor.mechanism))
    assert.deepEqual(
      [...anchored].sort(),
      [...COMPLETE_BUILDING_FORM_CATALOG[formId].mechanisms].sort(),
      `${formId}: mechanism anchors`,
    )
  }

  const granary = COMPLETE_BUILDING_SILHOUETTES['gabled-granary']
  assert.equal(granary.composition, 'single-raised-barn')
  assert.deepEqual(granary.roofSegments.map((roof) => roof.kind), ['gable-left', 'gable-right'])
  assert.equal(granary.openings[0].kind, 'granary-door')

  const loadingShed = COMPLETE_BUILDING_SILHOUETTES['lean-to-loading-shed']
  assert.equal(loadingShed.footprint.symmetry, 'asymmetric')
  assert.ok(loadingShed.wings.some((wing) => wing.kind === 'loading-ramp'))

  const windmill = COMPLETE_BUILDING_SILHOUETTES['tripod-windmill-watch']
  assert.ok(windmill.massing.some((mass) => mass.kind === 'windmill-head'))
  assert.ok(windmill.mechanismAnchors.some((anchor) => anchor.mechanism === 'wind-rotor'))

  const bridge = COMPLETE_BUILDING_SILHOUETTES['suspension-freight-bridge']
  assert.equal(bridge.connections.filter((connection) => connection.openBelow).length, 2)
  assert.equal(bridge.openings[0].kind, 'bridge-under-span')

  const workshop = COMPLETE_BUILDING_SILHOUETTES['sawwheel-workshop']
  assert.ok(workshop.massing.some((mass) => mass.kind === 'wheel-house'))
  assert.ok(workshop.mechanismAnchors.some((anchor) => anchor.mechanism === 'sawwheel'))

  const castle = COMPLETE_BUILDING_SILHOUETTES['outer-castle-gate']
  assert.equal(castle.massing.filter((mass) => mass.kind === 'castle-corner-tower').length, 2)
  assert.equal(castle.openings[0].kind, 'great-castle-arch')

  const finale = COMPLETE_BUILDING_SILHOUETTES['throne-granary-citadel']
  assert.ok(finale.massing.some((mass) => mass.kind === 'great-citadel-keep'))
  assert.ok(finale.massing.some((mass) => mass.kind === 'domed-royal-granary'))
  assert.equal(finale.roofSegments.filter((roof) => roof.kind.startsWith('granary-dome')).length, 2)

  const malformed = structuredClone(COMPLETE_BUILDING_SILHOUETTES)
  malformed['gabled-granary'].massing[0].widthRatio = 2
  malformed['lean-to-loading-shed'].connections[0].fromMass = 'missing-mass'
  malformed['terraced-checkpoint'].openings = []
  malformed['tripod-windmill-watch'].footprint.symmetry = 'random'
  malformed['suspension-freight-bridge'].mechanismAnchors[0].scale = 9
  const errors = validateCompleteBuildingSilhouettes(malformed)
  assert.ok(errors.some((error) => error.includes('.massing[0].widthRatio')))
  assert.ok(errors.some((error) => error.includes('two distinct authored masses')))
  assert.ok(errors.some((error) => error.includes('intentional void')))
  assert.ok(errors.some((error) => error.includes('.footprint.symmetry')))
  assert.ok(errors.some((error) => error.includes('.mechanismAnchors[0].scale')))
  assert.deepEqual(validateCompleteBuildingSilhouettes(null), [
    'complete building silhouettes must be an object',
  ])
})

test('all eighteen story levels resolve to distinct complete-building plans', () => {
  const expectedFormIds = [
    'gabled-granary',
    'lean-to-loading-shed',
    'terraced-checkpoint',
    'tripod-windmill-watch',
    'suspension-freight-bridge',
    'twin-tower-barbican',
    'a-frame-sorting-gantry',
    'sawwheel-workshop',
    'counterweight-lift-station',
    'icewood-lock-gate',
    'quarry-terrace-city',
    'avalanche-fort',
    'royal-viaduct',
    'granary-redoubt',
    'outer-castle-gate',
    'wind-engine-gate',
    'arcaded-inner-court',
    'throne-granary-citadel',
  ]
  assert.deepEqual(
    MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.buildingPlan.formId),
    expectedFormIds,
  )
  assert.deepEqual(
    MAIN_ARCHITECTURE_BLUEPRINTS.map((entry) => entry.buildingPlan.complexity),
    [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5],
  )

  for (const blueprint of MAIN_ARCHITECTURE_BLUEPRINTS) {
    const plan = blueprint.buildingPlan
    const form = COMPLETE_BUILDING_FORM_CATALOG[plan.formId]
    assert.equal(plan.completeBuilding, true)
    for (const key of [
      'name', 'category', 'roof', 'wall', 'foundation', 'complexity',
      'structuralSystem', 'supportPathCount',
    ]) {
      assert.equal(plan[key], form[key], `${blueprint.id}.${key}`)
    }
    for (const key of ['towerForms', 'mechanisms', 'visualParts']) {
      assert.deepEqual(plan[key], form[key], `${blueprint.id}.${key}`)
    }
    assert.deepEqual(plan.silhouetteSpec, form.silhouetteSpec, `${blueprint.id}.silhouetteSpec`)
    for (const key of ['storyFunction', 'loadPath', 'failurePlane', 'signatureFeature']) {
      assert.ok(plan[key].length >= 8, `${blueprint.id}.${key}`)
    }
  }

  assert.ok(MAIN_ARCHITECTURE_BLUEPRINTS[3].buildingPlan.mechanisms.includes('wind-rotor'))
  assert.ok(MAIN_ARCHITECTURE_BLUEPRINTS[7].buildingPlan.mechanisms.includes('sawwheel'))
  assert.ok(MAIN_ARCHITECTURE_BLUEPRINTS[15].buildingPlan.mechanisms.includes('giant-windwheel'))
  assert.ok(MAIN_ARCHITECTURE_BLUEPRINTS[17].buildingPlan.towerForms.includes('citadel-keep'))
  assert.equal(MAIN_ARCHITECTURE_BLUEPRINTS[17].buildingPlan.supportPathCount, 3)
})

test('main levels 13 through 18 author edge-connected physical buildings instead of four-stack grammar', () => {
  const expectedForms = [
    'royal-viaduct',
    'granary-redoubt',
    'outer-castle-gate',
    'wind-engine-gate',
    'arcaded-inner-court',
    'throne-granary-citadel',
  ]
  assert.deepEqual(Object.keys(LATE_CAMPAIGN_PHYSICAL_LAYOUTS), expectedForms)
  assertRecursivelyFrozen(LATE_CAMPAIGN_PHYSICAL_LAYOUTS, 'LATE_CAMPAIGN_PHYSICAL_LAYOUTS')

  for (const blueprint of MAIN_ARCHITECTURE_BLUEPRINTS.slice(0, 12)) {
    assert.equal(blueprint.buildingPlan.physicalLayout, null, `${blueprint.id}: no late physical grammar`)
    assert.deepEqual(blueprint.buildingPlan.physicalModules, [], `${blueprint.id}: no late physical modules`)
  }

  const requiredKindsByLevel = new Map([
    [13, ['bridge-pier', 'arch-spandrel', 'continuous-roadway', 'tollhouse-wall', 'tollhouse-roof']],
    [14, ['redoubt-core', 'continuous-wall-segment', 'convoy-gate-pier', 'covered-gallery-post', 'covered-gallery-roof']],
    [15, ['corner-tower', 'curtain-wall', 'gatehouse-pier', 'great-gate-lintel', 'portcullis']],
    [16, ['wind-engine-tower', 'lift-gate-pier', 'mechanical-gallery', 'drawbridge-leaf', 'counterweight-tower', 'counterweight']],
    [17, ['forecourt-wall', 'forecourt-gate-lintel', 'arcade-pier', 'arcade-arch', 'arcade-roof', 'rear-command-keep']],
    [18, ['guard-tower', 'citadel-keep-pier', 'throne-arch-lintel', 'citadel-upper-keep', 'granary-wall', 'granary-drum', 'granary-dome-course', 'royal-granary-gate', 'boss-forecourt-threshold']],
  ])
  const grammars = new Set()
  for (const blueprint of MAIN_ARCHITECTURE_BLUEPRINTS.slice(12)) {
    const plan = blueprint.buildingPlan
    const authored = LATE_CAMPAIGN_PHYSICAL_LAYOUTS[plan.formId]
    assert.ok(authored, `${blueprint.id}: authored physical layout`)
    assert.deepEqual(plan.physicalLayout, authored.physicalLayout)
    assert.deepEqual(plan.physicalModules, authored.physicalModules)
    assert.equal(plan.physicalLayout.version, 'normalized-rect-v1')
    assert.equal(plan.physicalLayout.coordinateSpace, 'silhouette-footprint')
    assert.equal(plan.physicalLayout.origin, 'ground-left')
    assert.equal(plan.physicalLayout.allowEdgeContact, true)
    assert.equal(grammars.has(plan.physicalLayout.grammar), false, `${blueprint.id}: unique grammar`)
    grammars.add(plan.physicalLayout.grammar)
    assert.deepEqual(validatePhysicalBuildingLayout(plan.physicalLayout, plan.physicalModules, {
      path: blueprint.id,
      silhouetteSpec: plan.silhouetteSpec,
      towerCount: blueprint.towerFloors.length,
    }), [])

    assert.ok(plan.physicalModules.length >= 10, `${blueprint.id}: substantial authored structure`)
    assert.equal(new Set(plan.physicalModules.map((module) => module.id)).size, plan.physicalModules.length)
    assert.ok(plan.physicalModules.some((module) => module.structuralSpine === true))
    const kinds = new Set(plan.physicalModules.map((module) => module.kind))
    for (const kind of requiredKindsByLevel.get(blueprint.level)) {
      assert.ok(kinds.has(kind), `${blueprint.id}: ${kind}`)
    }

    for (const module of plan.physicalModules) {
      assert.ok(module.xRatio - module.widthRatio / 2 >= -1e-9, `${module.id}: left bound`)
      assert.ok(module.xRatio + module.widthRatio / 2 <= 1 + 1e-9, `${module.id}: right bound`)
      assert.ok(module.baseRatio >= 0, `${module.id}: ground bound`)
      assert.ok(module.baseRatio + module.heightRatio <= 1 + 1e-9, `${module.id}: height bound`)
      const mass = plan.silhouetteSpec.massing.find((entry) => entry.id === module.massId)
      assert.ok(mass, `${module.id}: authored mass`)
      assert.equal(module.massKind, mass.kind, `${module.id}: mass identity`)
    }
    for (let leftIndex = 0; leftIndex < plan.physicalModules.length; leftIndex += 1) {
      const left = plan.physicalModules[leftIndex]
      const leftBounds = {
        left: left.xRatio - left.widthRatio / 2,
        right: left.xRatio + left.widthRatio / 2,
        bottom: left.baseRatio,
        top: left.baseRatio + left.heightRatio,
      }
      for (let rightIndex = leftIndex + 1; rightIndex < plan.physicalModules.length; rightIndex += 1) {
        const right = plan.physicalModules[rightIndex]
        const rightBounds = {
          left: right.xRatio - right.widthRatio / 2,
          right: right.xRatio + right.widthRatio / 2,
          bottom: right.baseRatio,
          top: right.baseRatio + right.heightRatio,
        }
        const horizontalPenetration = Math.min(leftBounds.right, rightBounds.right)
          - Math.max(leftBounds.left, rightBounds.left)
        const verticalPenetration = Math.min(leftBounds.top, rightBounds.top)
          - Math.max(leftBounds.bottom, rightBounds.bottom)
        assert.equal(
          horizontalPenetration > 1e-6 && verticalPenetration > 1e-6,
          false,
          `${blueprint.id}: ${left.id} must not penetrate ${right.id}`,
        )
      }
    }
  }
  assert.equal(grammars.size, 6)

  const viaduct = MAIN_ARCHITECTURE_BLUEPRINTS[12].buildingPlan.physicalModules
  assert.equal(viaduct.filter((module) => module.kind === 'bridge-pier').length, 4)
  assert.equal(viaduct.filter((module) => module.kind === 'arch-spandrel').length, 3)
  assert.ok(viaduct.find((module) => module.kind === 'continuous-roadway').widthRatio >= 0.9)
  assert.equal(viaduct.filter((module) => module.kind.startsWith('tollhouse-')).length, 3)

  const redoubt = MAIN_ARCHITECTURE_BLUEPRINTS[13].buildingPlan.physicalModules
  assert.equal(new Set(redoubt.filter((module) => module.kind === 'redoubt-core').map((module) => module.massId)).size, 3)
  assert.equal(redoubt.filter((module) => module.kind === 'covered-gallery-roof').length, 2)

  const castle = MAIN_ARCHITECTURE_BLUEPRINTS[14].buildingPlan.physicalModules
  assert.equal(castle.filter((module) => module.kind === 'corner-tower').length, 2)
  assert.equal(castle.filter((module) => module.kind === 'curtain-wall').length, 2)
  assert.ok(castle.find((module) => module.kind === 'portcullis').widthRatio >= 0.2)

  const windGate = MAIN_ARCHITECTURE_BLUEPRINTS[15].buildingPlan.physicalModules
  assert.equal(windGate.filter((module) => module.kind === 'mechanical-gallery').length, 2)
  assert.ok(windGate.some((module) => module.feature === 'giant-windwheel-anchor'))
  assert.ok(windGate.some((module) => module.kind === 'drawbridge-leaf'))

  const innerCourt = MAIN_ARCHITECTURE_BLUEPRINTS[16].buildingPlan.physicalModules
  assert.equal(innerCourt.filter((module) => module.kind === 'arcade-pier').length, 4)
  assert.equal(innerCourt.filter((module) => module.kind === 'arcade-arch').length, 3)
  assert.equal(innerCourt.filter((module) => module.kind === 'rear-command-keep').length, 1)

  const citadel = MAIN_ARCHITECTURE_BLUEPRINTS[17].buildingPlan.physicalModules
  assert.equal(citadel.filter((module) => module.kind === 'guard-tower').length, 2)
  assert.ok(citadel.find((module) => module.kind === 'citadel-upper-keep').widthRatio >= 0.3)
  assert.equal(citadel.filter((module) => module.kind === 'granary-dome-course').length, 2)
  assert.equal(citadel.find((module) => module.kind === 'boss-forecourt-threshold').feature, 'open-boss-court')
})

test('physical building validator rejects penetration, drift, missing modules, and disconnected dressing', () => {
  const blueprint = MAIN_ARCHITECTURE_BLUEPRINTS[12]
  const layout = structuredClone(blueprint.buildingPlan.physicalLayout)
  const modules = structuredClone(blueprint.buildingPlan.physicalModules)
  modules[1].id = modules[0].id
  modules[2].widthRatio = 2
  modules[3].massId = 'imaginary-mass'
  modules[4].role = 'decoration'
  modules[5].towerIndex = 99
  modules[6].xRatio = modules[5].xRatio
  modules[6].widthRatio = modules[5].widthRatio
  modules[6].baseRatio = modules[5].baseRatio
  modules[6].heightRatio = modules[5].heightRatio
  modules[7].structuralSpine = 'yes'
  modules[10].xRatio = 0.94
  modules[10].widthRatio = 0.06
  layout.requiredKinds.push('imaginary-building-piece')
  const errors = validatePhysicalBuildingLayout(layout, modules, {
    path: 'malformed-viaduct',
    silhouetteSpec: blueprint.buildingPlan.silhouetteSpec,
    towerCount: blueprint.towerFloors.length,
  })
  assert.ok(errors.some((error) => error.includes('.id must be unique')))
  assert.ok(errors.some((error) => error.includes('normalized physical width')))
  assert.ok(errors.some((error) => error.includes('.massId must reference')))
  assert.ok(errors.some((error) => error.includes('.role is unsupported')))
  assert.ok(errors.some((error) => error.includes('.towerIndex')))
  assert.ok(errors.some((error) => error.includes('must not penetrate')))
  assert.ok(errors.some((error) => error.includes('.structuralSpine must be boolean')))
  assert.ok(errors.some((error) => error.includes('required kind imaginary-building-piece')))

  const disconnectedModules = structuredClone(blueprint.buildingPlan.physicalModules)
  disconnectedModules.at(-1).xRatio = 0.94
  disconnectedModules.at(-1).widthRatio = 0.06
  const disconnectedErrors = validatePhysicalBuildingLayout(
    blueprint.buildingPlan.physicalLayout,
    disconnectedModules,
    {
      path: 'disconnected-viaduct',
      silhouetteSpec: blueprint.buildingPlan.silhouetteSpec,
      towerCount: blueprint.towerFloors.length,
    },
  )
  assert.ok(disconnectedErrors.some((error) => error.includes('must form one edge-connected building')))

  assert.deepEqual(validatePhysicalBuildingLayout(null, []), [
    'physicalBuilding.physicalLayout must be an object',
  ])
})

test('blueprint validator diagnoses malformed identities, geometry plans, and materials', () => {
  const malformed = structuredClone(MAIN_ARCHITECTURE_BLUEPRINTS)
  malformed[1].id = malformed[0].id
  malformed[2].level = malformed[1].level
  malformed[3].towerFloors = [1, 6]
  malformed[4].baseOffsets = [0]
  malformed[5].constructionPalette[0].constructionId = 'imaginary-alloy'
  malformed[6].landmark.constructionId = 'missing-landmark-material'
  malformed[7].buildingPlan.formId = 'imaginary-building'
  malformed[8].buildingPlan.towerForms = []
  malformed[9].buildingPlan.loadPath = ''
  malformed[10].buildingPlan.complexity = 2
  malformed[12].buildingPlan.formId = malformed[11].buildingPlan.formId
  malformed[13].buildingPlan.silhouetteSpec.openings = []
  const errors = validateMainArchitectureBlueprints(malformed)

  assert.ok(errors.some((error) => error.includes('.id must be unique')))
  assert.ok(errors.some((error) => error.includes('.level must be unique')))
  assert.ok(errors.some((error) => error.includes('.towerFloors')))
  assert.ok(errors.some((error) => error.includes('.baseOffsets')))
  assert.ok(errors.some((error) => error.includes('unknown construction')))
  assert.ok(errors.some((error) => error.includes('landmark references an unknown construction')))
  assert.ok(errors.some((error) => error.includes('unknown complete building form')))
  assert.ok(errors.some((error) => error.includes('.buildingPlan.towerForms')))
  assert.ok(errors.some((error) => error.includes('.buildingPlan.loadPath')))
  assert.ok(errors.some((error) => error.includes('.buildingPlan.complexity')))
  assert.ok(errors.some((error) => error.includes('.buildingPlan.formId must be unique')))
  assert.ok(errors.some((error) => error.includes('.buildingPlan.silhouetteSpec')))
  assert.ok(errors.some((error) => error.includes('complexity must not decrease')))
  assert.deepEqual(validateMainArchitectureBlueprints([]), [
    'blueprints must contain exactly eighteen records',
  ])
})

test('construction material profiles are complete, immutable, and mechanically distinct', () => {
  assert.deepEqual(Object.keys(CONSTRUCTION_MATERIALS), [
    'canvas-screen',
    'resin-timber',
    'packed-earth',
    'resin-glass',
    'leaf-iron-plate',
  ])
  assertRecursivelyFrozen(CONSTRUCTION_MATERIALS, 'CONSTRUCTION_MATERIALS')
  assert.equal(new Set(Object.values(CONSTRUCTION_MATERIALS).map((entry) => entry.name)).size, 5)
  assert.equal(new Set(Object.values(CONSTRUCTION_MATERIALS).map((entry) => entry.discoveryId)).size, 5)

  const multiplierKeys = [
    'hpMultiplier',
    'massMultiplier',
    'frictionMultiplier',
    'supportMultiplier',
    'angularDampingMultiplier',
    'restitutionMultiplier',
    'windDragMultiplier',
    'windTippingMultiplier',
  ]
  for (const [id, profile] of Object.entries(CONSTRUCTION_MATERIALS)) {
    assert.ok(profile.allowedBaseMaterials.length >= 1, `${id}: allowed base materials`)
    assert.ok(profile.allowedBaseMaterials.every((type) => BLOCK_MATERIALS[type]), `${id}: base material`)
    if (profile.baseMaterial !== null) {
      assert.ok(profile.allowedBaseMaterials.includes(profile.baseMaterial), `${id}: preferred base material`)
    }
    for (const key of multiplierKeys) {
      assert.ok(Number.isFinite(profile[key]) && profile[key] > 0, `${id}.${key}`)
    }
    assert.ok(Number.isFinite(profile.armorHp) && profile.armorHp >= 0, `${id}.armorHp`)
    assert.ok(Number.isFinite(profile.scoreBonus) && profile.scoreBonus > 0, `${id}.scoreBonus`)
    assert.ok(
      ['inherit', 'none', 'adhesive', 'rooted', 'clamped'].includes(profile.jointPolicy),
      `${id}.jointPolicy`,
    )
    if (profile.jointProfile) {
      assert.equal(profile.jointProfile.autoRetain, true, `${id}.jointProfile.autoRetain`)
      assert.match(profile.jointProfile.kind, /^(resin-bond|root-bond|iron-clamp)$/u)
      for (const key of [
        'strength', 'bearingAllowance', 'breakDistance', 'stiffness',
        'velocityDamping', 'angularStiffness', 'damageScale',
      ]) {
        assert.ok(Number.isFinite(profile.jointProfile[key]) && profile.jointProfile[key] > 0,
          `${id}.jointProfile.${key}`)
      }
    }
    assert.match(profile.discoveryId, /^object:/u)
  }

  assert.ok(CONSTRUCTION_MATERIALS['canvas-screen'].hpMultiplier < 1)
  assert.ok(CONSTRUCTION_MATERIALS['canvas-screen'].windDragMultiplier > 1)
  assert.ok(CONSTRUCTION_MATERIALS['resin-timber'].hpMultiplier > 1)
  assert.equal(CONSTRUCTION_MATERIALS['packed-earth'].hardMaterial, true)
  assert.equal(CONSTRUCTION_MATERIALS['packed-earth'].suppressFlame, true)
  assert.equal(CONSTRUCTION_MATERIALS['resin-glass'].suppressFlame, true)
  assert.equal(CONSTRUCTION_MATERIALS['resin-glass'].suppressIceSlow, true)
  assert.equal(CONSTRUCTION_MATERIALS['leaf-iron-plate'].armorHp, 2)
  assert.equal(CONSTRUCTION_MATERIALS['leaf-iron-plate'].hardMaterial, true)
})

test('special construction materials alter component and wind physics and classify hard surfaces', () => {
  const width = 100
  const height = 20
  const windX = 0.07
  for (const [constructionId, construction] of Object.entries(CONSTRUCTION_MATERIALS)) {
    for (const type of construction.allowedBaseMaterials) {
      const base = BLOCK_MATERIALS[type]
      const stats = calculateStructureComponentStats({
        type, width, height, role: 'lintel', constructionId,
      })
      assert.equal(stats.hp, Math.ceil(base.hp * construction.hpMultiplier), `${constructionId}/${type}: hp`)
      assert.ok(Math.abs(
        stats.mass - width * height / 1_000 * base.massMultiplier * construction.massMultiplier
      ) < 1e-10, `${constructionId}/${type}: mass`)

      const plainWind = calculateStructureWindLoad({
        type, width, height, mass: stats.mass,
      }, windX)
      const constructionWind = calculateStructureWindLoad({
        type, width, height, mass: stats.mass, constructionId,
      }, windX)
      assert.ok(Math.abs(
        constructionWind.forceX / plainWind.forceX - construction.windDragMultiplier
      ) < 1e-10, `${constructionId}/${type}: wind drag`)
      assert.ok(Math.abs(
        constructionWind.angularAcceleration / plainWind.angularAcceleration
          - construction.windDragMultiplier * construction.windTippingMultiplier
      ) < 1e-10, `${constructionId}/${type}: wind tipping`)

      assert.equal(
        isHardStructureMaterial({ type, constructionId }),
        type === 'stone' || construction.hardMaterial === true,
        `${constructionId}/${type}: hard material classification`,
      )
    }
  }

  assert.equal(isHardStructureMaterial({ type: 'stone' }), true)
  assert.equal(isHardStructureMaterial({ type: 'wood', constructionId: 'packed-earth' }), true)
  assert.equal(isHardStructureMaterial({ type: 'wood', constructionId: 'leaf-iron-plate' }), true)
  assert.equal(isHardStructureMaterial({ type: 'ice', constructionId: 'resin-glass' }), false)
  assert.equal(isHardStructureMaterial({ type: 'wood', constructionId: 'resin-timber' }), false)
  assert.equal(isHardStructureMaterial(null), false)
  assert.throws(() => calculateStructureComponentStats({
    type: 'wood', width, height, constructionId: 'imaginary-alloy',
  }), /unsupported construction material/u)
})

test('all main stages consume their authored physical blueprint and introduce materials on schedule', () => {
  const generatedSignatures = new Set()
  const firstSeen = new Map()
  const seeds = [1, 7, 20260828]

  for (let level = 1; level <= MAIN_LEVELS; level += 1) {
    const authored = mainArchitectureBlueprintForLevel(level)
    const seenAtLevel = new Set()
    for (const seed of seeds) {
      const generated = generateLevel({ mode: 'main', level, seed })
      assert.equal(generated.architectureBlueprint.id, authored.id)
      assert.equal(generated.architectureBlueprint.name, authored.name)
      assert.equal(generated.architectureBlueprint.motif, authored.motif)
      assert.equal(generated.architectureBlueprint.familyId, authored.familyId)
      assert.equal(generated.structureFamily.id, authored.familyId)
      assert.deepEqual(
        [...generated.structureFamily.towerFloorCounts].sort((a, b) => a - b),
        [...authored.towerFloors].sort((a, b) => a - b),
      )
      assert.ok(generated.blocks.every((block) => block.architectureBlueprintId === authored.id))
      const constructed = generated.blocks.filter((block) => block.constructionId)
      assert.equal(constructed.length, generated.architectureBlueprint.constructionCount)
      assert.ok(constructed.every((block) => CONSTRUCTION_MATERIALS[block.constructionId]))
      for (const block of constructed) seenAtLevel.add(block.constructionId)
      if (generated.architectureBlueprint.landmarkAdded) {
        assert.ok(generated.blocks.some((block) => (
          block.role === 'blueprint-landmark'
          && block.landmarkKind === authored.landmark.kind
          && block.architectureBlueprintId === authored.id
        )))
      }
    }
    for (const constructionId of seenAtLevel) {
      if (!firstSeen.has(constructionId)) firstSeen.set(constructionId, level)
    }
    if (level === 1) assert.equal(seenAtLevel.size, 0)
    else assert.ok(seenAtLevel.size >= 1, `main level ${level} has no special construction material`)

    const sample = generateLevel({ mode: 'main', level, seed: 20260828 })
    generatedSignatures.add(JSON.stringify({
      familyId: sample.structureFamily.id,
      towerFloors: sample.structureFamily.towerFloorCounts,
      dimensions: [...new Set(sample.blocks
        .filter((block) => ['post', 'lintel', 'roof', 'blueprint-landmark'].includes(block.role))
        .map((block) => `${block.role}:${block.width}x${block.height}:${block.landmarkKind || ''}`))]
        .sort(),
      constructionIds: [...new Set(sample.blocks.map((block) => block.constructionId).filter(Boolean))]
        .sort(),
    }))
  }

  assert.equal(generatedSignatures.size, 18)
  assert.deepEqual(Object.fromEntries(firstSeen), {
    'canvas-screen': 2,
    'resin-timber': 3,
    'packed-earth': 6,
    'resin-glass': 8,
    'leaf-iron-plate': 13,
  })
})

test('endless mode preserves early family rotation and switches permanently to physical buildings at depth twenty', () => {
  const ids = STRUCTURE_FAMILY_RULES.ids
  const earlyPools = [
    { id: ids.frontier, depth: 1, expectedLevels: [1, 2, 3] },
    { id: ids.frontier, depth: 7, expectedLevels: [1, 2, 3, 4, 5, 6] },
    { id: ids.bridge, depth: 10, expectedLevels: [7, 8, 9] },
  ]
  for (const pool of earlyPools) {
    const selected = new Set()
    for (let seed = 1; seed <= 64; seed += 1) {
      const first = architectureBlueprintForEncounter({
        mode: 'endless', level: MAIN_LEVELS + pool.depth, seed, familyId: pool.id,
      })
      const second = architectureBlueprintForEncounter({
        mode: 'endless', level: MAIN_LEVELS + pool.depth, seed, familyId: pool.id,
      })
      assert.equal(first, second)
      assert.equal(first.familyId, pool.id)
      assert.equal(first.buildingPlan.physicalModules.length, 0)
      selected.add(first.level)
    }
    assert.deepEqual([...selected].sort((a, b) => a - b), pool.expectedLevels)
  }

  const physicalPools = [
    { id: ids.bridge, depth: 20, expectedLevels: [13, 14] },
    { id: ids.bridge, depth: 50, expectedLevels: [13, 14] },
    { id: ids.royal, depth: 50, expectedLevels: [15, 16, 17, 18] },
    // Rock and frontier have no normalized late layout yet, so they must use
    // the full unlocked physical fallback instead of legacy tower bodies.
    { id: ids.rock, depth: 50, expectedLevels: [13, 14, 15, 16, 17, 18] },
    { id: ids.frontier, depth: 50, expectedLevels: [13, 14, 15, 16, 17, 18] },
  ]
  for (const pool of physicalPools) {
    const selected = new Set()
    for (let seed = 1; seed <= 64; seed += 1) {
      const first = architectureBlueprintForEncounter({
        mode: 'endless', level: MAIN_LEVELS + pool.depth, seed, familyId: pool.id,
      })
      const second = architectureBlueprintForEncounter({
        mode: 'endless', level: MAIN_LEVELS + pool.depth, seed, familyId: pool.id,
      })
      assert.equal(first, second)
      assert.ok(first.minimumEndlessDepth <= pool.depth)
      assert.ok(first.buildingPlan.physicalModules.length > 0)
      selected.add(first.level)
    }
    assert.deepEqual([...selected].sort((a, b) => a - b), pool.expectedLevels)
  }

  // Exercise actual late generation as well as the pure selector. Cross-family
  // fallback intentionally lets the structure family retain its physics while
  // the blueprint supplies a complete authored collider grammar.
  const lateLevels = [
    MAIN_LEVELS + 20,
    MAIN_LEVELS + 30,
    MAIN_LEVELS + 50,
    MAIN_LEVELS + 75,
    MAIN_LEVELS + 100,
    MAIN_LEVELS + 150,
    MAIN_LEVELS + 200,
  ]
  const lateBlueprintIds = new Set()
  for (const level of lateLevels) {
    for (const seed of [1, 7, 16, 31]) {
      const generated = generateLevel({ mode: 'endless', level, seed })
      const blueprint = architectureBlueprintForEncounter({
        mode: 'endless', level, seed, familyId: generated.structureFamily.id,
      })
      assert.equal(generated.architectureBlueprint.id, blueprint.id, `level ${level}, seed ${seed}`)
      assert.ok(blueprint.minimumEndlessDepth <= generated.endlessDepth)
      assert.ok(blueprint.buildingPlan.physicalModules.length > 0)
      assert.equal(
        generated.blocks.filter((block) => block.constructionId).length,
        generated.architectureBlueprint.constructionCount,
      )
      assert.ok(generated.stoneCount <= generated.maxStoneCount)
      assert.ok(generated.blocks.every((block) => (
        block.architectureBlueprintId === generated.architectureBlueprint.id
      )))
      lateBlueprintIds.add(generated.architectureBlueprint.id)
    }
  }
  assert.equal(lateBlueprintIds.size, 6)

  assert.throws(() => architectureBlueprintForEncounter({
    mode: 'endless', level: 0, seed: 1, familyId: ids.frontier,
  }), /positive integer/u)
  assert.equal(architectureBlueprintForEncounter({ mode: 'daily', level: 1 }), null)
})

test('every endless floor from twenty to one hundred instantiates a varied physical grammar with no legacy stacks', () => {
  const familyIds = Object.values(STRUCTURE_FAMILY_RULES.ids)
  const seeds = [1, 7, 31, 20260828]
  for (const seed of seeds) {
    const encounteredForms = new Set()
    let previousForm = null
    for (let depth = 20; depth <= 100; depth += 1) {
      // Every possible family request must resolve to a physical candidate,
      // including the rock-family fallback that previously restored four
      // columns of post/lintel/truss bodies.
      for (const familyId of familyIds) {
        const selected = architectureBlueprintForEncounter({
          mode: 'endless', level: MAIN_LEVELS + depth, seed, familyId,
        })
        assert.ok(selected, `depth ${depth}, seed ${seed}, family ${familyId}: blueprint`)
        assert.ok(selected.buildingPlan.physicalLayout, `depth ${depth}: physical layout`)
        assert.ok(selected.buildingPlan.physicalModules.length > 0, `depth ${depth}: physical modules`)
        assert.ok(selected.minimumEndlessDepth <= depth, `depth ${depth}: unlocked blueprint`)
      }

      const generated = generateLevel({ mode: 'endless', level: MAIN_LEVELS + depth, seed })
      const plan = generated.architectureBlueprint.buildingPlan
      const modules = generated.blocks.filter((block) => block.physicalModuleId)
      const legacyBodies = generated.blocks.filter((block) => (
        ['post', 'lintel'].includes(block.role)
        || ['tri-truss', 'complete-building-envelope', 'complete-building-connection']
          .includes(block.moduleKind)
      ))
      assert.ok(plan.physicalModules.length > 0, `depth ${depth}, seed ${seed}: selected legacy plan`)
      assert.equal(modules.length, plan.physicalModules.length, `depth ${depth}, seed ${seed}: module count`)
      assert.equal(legacyBodies.length, 0, `depth ${depth}, seed ${seed}: legacy tower grammar`)
      assert.notEqual(plan.formId, previousForm, `depth ${depth}, seed ${seed}: adjacent repeat`)
      previousForm = plan.formId
      encounteredForms.add(plan.formId)
    }
    assert.equal(encounteredForms.size, 6, `seed ${seed}: complete late grammar rotation`)
  }
})
