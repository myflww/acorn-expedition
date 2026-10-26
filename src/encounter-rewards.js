// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { SPECIAL_CAMPAIGN_IDS } from './special-campaigns.js'

const modes = new Set(['main', 'endless', 'daily', 'special'])
const campaigns = new Set(SPECIAL_CAMPAIGN_IDS)

// The same authored attempt can be replayed after a retry or a level-start
// restore. Score is replayable; persistent currency is paid once per identity.
export function encounterRewardKey({ mode, campaignId, runSeed, level } = {}) {
  if (!modes.has(mode) || !Number.isInteger(runSeed) || runSeed < 1
    || runSeed > 0xffff_ffff || !Number.isSafeInteger(level) || level < 1) return null
  if (mode === 'special' && !campaigns.has(campaignId)) return null
  return mode === 'special'
    ? `${mode}:${campaignId}:${level}:${runSeed}`
    : `${mode}:${level}:${runSeed}`
}

function isRewardKey(value) {
  if (typeof value !== 'string') return false
  const [mode, first, second, third, extra] = value.split(':')
  if (extra !== undefined) return false
  if (mode !== 'special' && third !== undefined) return false
  const level = mode === 'special' ? second : first
  const seed = mode === 'special' ? third : second
  if (!/^[1-9]\d*$/u.test(level || '') || !/^[1-9]\d*$/u.test(seed || '')) return false
  return encounterRewardKey({
    mode,
    campaignId: mode === 'special' ? first : null,
    level: Number(level),
    runSeed: Number(seed),
  }) === value
}

export function normalizeEncounterRewards(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(Object.entries(source).filter(([key, claimed]) => (
    isRewardKey(key) && claimed === true
  )))
}

export function claimGoldenAcornReward(value, context) {
  const records = normalizeEncounterRewards(value)
  const key = encounterRewardKey(context)
  if (!key || records[key]) return { records, granted: false, amount: 0 }
  return { records: { ...records, [key]: true }, granted: true, amount: 1 }
}
