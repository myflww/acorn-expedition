// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

// Derive markers from live entities so destroyed targets leave no floating art.
export function objectiveBeacons({ blocks = [], squirrels = [], platforms = [], objective, challengeState } = {}) {
  const challenge = objective?.challenge
  if (!challenge || challengeState?.status === 'completed') return []
  if (!['precision-strike', 'ordered-demolition'].includes(challenge.kind)) return []
  const sequence = challenge.parameters?.sequence || []
  const current = challengeState?.progress?.sequenceIndex || 0
  const failed = challengeState?.status === 'failed'
  return [...blocks, ...squirrels, ...platforms].flatMap((entity) => {
    if (entity.hp <= 0 || entity.destroyed || entity.dead) return []
    const tags = entity.objectiveTags || []
    const index = sequence.findIndex((tag) => tags.includes(tag))
    const precision = challenge.kind === 'precision-strike'
      && tags.includes(challenge.parameters?.targetTag)
    if (!precision && index < 0) return []
    return [{
      x: entity.x, y: entity.y,
      label: precision ? '击' : String(index + 1),
      active: !failed && (precision || index === current),
      weakPoint: entity.precisionWeakPoint === true,
    }]
  }).slice(0, 14)
}
