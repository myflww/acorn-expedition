// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

function freezeAmmoEntry(entry) {
  return Object.freeze({
    type: entry.type,
    bonusShot: Boolean(entry.bonusShot),
    damageBonus: Number(entry.damageBonus) || 0,
    aceSupply: Boolean(entry.aceSupply),
  })
}

/**
 * Atomically swaps the loaded acorn with one queued slot.
 *
 * Keeping type, bonus-shot eligibility, granted damage, and the exact ace
 * identity in one transaction prevents a visual reorder from changing
 * reserve-star fairness or silently transferring a reinforcement bonus.
 */
export function swapLoadedAmmoWithQueue({
  loaded,
  queue,
  bonusFlags,
  damageBonuses,
  aceFlags,
  selectedIndex,
}) {
  if (!loaded || typeof loaded.type !== 'string') {
    throw new TypeError('loaded ammo must provide a type')
  }
  if (!Array.isArray(queue) || !Array.isArray(bonusFlags)
    || !Array.isArray(damageBonuses) || !Array.isArray(aceFlags)) {
    throw new TypeError('queue metadata must use parallel arrays')
  }
  if (queue.length !== bonusFlags.length || queue.length !== damageBonuses.length
    || queue.length !== aceFlags.length) {
    throw new RangeError('queue metadata arrays must stay aligned')
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= queue.length) {
    throw new RangeError('selected queue index is out of bounds')
  }

  const selected = freezeAmmoEntry({
    type: queue[selectedIndex],
    bonusShot: bonusFlags[selectedIndex],
    damageBonus: damageBonuses[selectedIndex],
    aceSupply: aceFlags[selectedIndex],
  })
  const nextQueue = [...queue]
  const nextBonusFlags = [...bonusFlags]
  const nextDamageBonuses = [...damageBonuses]
  const nextAceFlags = [...aceFlags]
  nextQueue[selectedIndex] = loaded.type
  nextBonusFlags[selectedIndex] = Boolean(loaded.bonusShot)
  nextDamageBonuses[selectedIndex] = Number(loaded.damageBonus) || 0
  nextAceFlags[selectedIndex] = Boolean(loaded.aceSupply)

  return Object.freeze({
    loaded: selected,
    queue: Object.freeze(nextQueue),
    bonusFlags: Object.freeze(nextBonusFlags),
    damageBonuses: Object.freeze(nextDamageBonuses),
    aceFlags: Object.freeze(nextAceFlags),
  })
}
