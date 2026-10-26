// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { SPECIAL_CAMPAIGN_IDS } from './special-campaigns.js'
import {
  isRunCheckpointResumable,
  normalizeRunCheckpoint,
} from './run-checkpoint.js'

export const RUN_SLOTS_VERSION = 1
export const RUN_SLOT_IDS = Object.freeze([
  'main',
  'endless',
  'daily',
  ...SPECIAL_CAMPAIGN_IDS.map((campaignId) => `special:${campaignId}`),
])

const RUN_SLOT_ID_SET = new Set(RUN_SLOT_IDS)

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function emptySlotRecords() {
  const slots = {}
  for (const slotId of RUN_SLOT_IDS) slots[slotId] = null
  return slots
}

function canonicalRunSlots(slots = emptySlotRecords(), lastActive = null) {
  return deepFreeze({
    version: RUN_SLOTS_VERSION,
    lastActive: RUN_SLOT_ID_SET.has(lastActive) && slots[lastActive] ? lastActive : null,
    slots,
  })
}

function dailySeedOption(options) {
  if (!isRecord(options) || options.dailySeed === undefined) return {}
  return { dailySeed: options.dailySeed }
}

function resumableInContext(checkpoint, options) {
  return isRunCheckpointResumable(
    checkpoint,
    checkpoint.mode === 'daily' ? dailySeedOption(options) : {},
  )
}

export function runSlotIdFor(mode, campaign = null) {
  if (mode === 'special') {
    const slotId = typeof campaign === 'string' ? `special:${campaign}` : null
    return RUN_SLOT_ID_SET.has(slotId) ? slotId : null
  }
  return ['main', 'endless', 'daily'].includes(mode) ? mode : null
}

export function runSlotIdForCheckpoint(value) {
  const checkpoint = normalizeRunCheckpoint(value)
  return checkpoint ? runSlotIdFor(checkpoint.mode, checkpoint.campaign) : null
}

export function createRunSlots() {
  return canonicalRunSlots()
}

/**
 * Canonicalizes a multi-run envelope. Only the eight authored slot ids are
 * read, and a checkpoint must normalize back to the slot that contains it.
 * Completed, malformed, misplaced, or stale-daily checkpoints are discarded.
 *
 * A legacy single checkpoint (including the old runCheckpoint/checkpoint/data
 * wrappers accepted by normalizeRunCheckpoint) is migrated into its derived
 * slot and becomes lastActive.
 */
export function normalizeRunSlots(value, options = {}) {
  if (isRecord(value) && Object.hasOwn(value, 'slots')) {
    if (value.version !== RUN_SLOTS_VERSION || !isRecord(value.slots)) return createRunSlots()

    const slots = emptySlotRecords()
    for (const slotId of RUN_SLOT_IDS) {
      if (!Object.hasOwn(value.slots, slotId)) continue
      const checkpoint = normalizeRunCheckpoint(value.slots[slotId])
      if (!checkpoint || runSlotIdFor(checkpoint.mode, checkpoint.campaign) !== slotId) continue
      if (!resumableInContext(checkpoint, options)) continue
      slots[slotId] = checkpoint
    }

    const requestedLastActive = Object.hasOwn(value, 'lastActive') ? value.lastActive : null
    return canonicalRunSlots(slots, requestedLastActive)
  }

  const checkpoint = normalizeRunCheckpoint(value)
  if (!checkpoint || !resumableInContext(checkpoint, options)) return createRunSlots()
  const slotId = runSlotIdFor(checkpoint.mode, checkpoint.campaign)
  if (!slotId) return createRunSlots()
  const slots = emptySlotRecords()
  slots[slotId] = checkpoint
  return canonicalRunSlots(slots, slotId)
}

export function setRunSlot(value, slotId, checkpointValue, options = {}) {
  const current = normalizeRunSlots(value, options)
  if (!RUN_SLOT_ID_SET.has(slotId)) return current
  const checkpoint = normalizeRunCheckpoint(checkpointValue)
  if (!checkpoint || runSlotIdFor(checkpoint.mode, checkpoint.campaign) !== slotId) return current
  if (!resumableInContext(checkpoint, options)) return current

  return canonicalRunSlots({ ...current.slots, [slotId]: checkpoint }, slotId)
}

export function updateRunSlot(value, checkpointValue, options = {}) {
  const slotId = runSlotIdForCheckpoint(checkpointValue)
  if (!slotId) return normalizeRunSlots(value, options)
  return setRunSlot(value, slotId, checkpointValue, options)
}

export function clearRunSlot(value, slotId, options = {}) {
  const current = normalizeRunSlots(value, options)
  if (!RUN_SLOT_ID_SET.has(slotId) || !current.slots[slotId]) return current
  const lastActive = current.lastActive === slotId ? null : current.lastActive
  return canonicalRunSlots({ ...current.slots, [slotId]: null }, lastActive)
}

export function getRunSlot(value, slotId, options = {}) {
  if (!RUN_SLOT_ID_SET.has(slotId)) return null
  return normalizeRunSlots(value, options).slots[slotId]
}

export function getLastActiveRunCheckpoint(value, options = {}) {
  const runSlots = normalizeRunSlots(value, options)
  return runSlots.lastActive ? runSlots.slots[runSlots.lastActive] : null
}

/**
 * Reports date expiry only for an otherwise valid active daily checkpoint.
 * Without a caller-supplied current dailySeed there is no clock context, so
 * the result is false. A complete run is non-resumable, not date-expired.
 */
export function isDailyRunSlotExpired(value, options = {}) {
  if (!isRecord(options) || options.dailySeed === undefined) return false
  let checkpoint = normalizeRunCheckpoint(value)
  if (!checkpoint) checkpoint = normalizeRunSlots(value).slots.daily
  if (!checkpoint || checkpoint.mode !== 'daily' || checkpoint.status !== 'active') return false
  return !isRunCheckpointResumable(checkpoint, { dailySeed: options.dailySeed })
}
