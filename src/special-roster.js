// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

const acorn = ({
  type, title, role, firstLevel, summary, action, tip, silhouette, palette, stats, ability, drawback,
}) => ({
  id: `acorn:${type}`,
  kind: 'acorn',
  type,
  discoveryId: `bird:${type}`,
  title,
  role,
  firstLevel,
  summary,
  action,
  tip,
  counter: drawback,
  visual: {
    art: `bird-${type}`,
    silhouette,
    palette,
  },
  stats,
  ability,
})

const squirrel = ({
  type, title, role, firstLevel, summary, action, tip, silhouette, palette, stats, ability, counter,
}) => ({
  id: `squirrel:${type}`,
  kind: 'squirrel',
  type,
  discoveryId: `enemy:${type}`,
  title,
  role,
  firstLevel,
  summary,
  action,
  tip,
  counter,
  visual: {
    art: `enemy-${type}`,
    silhouette,
    palette,
  },
  stats,
  ability,
})

const finiteNumber = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
)

const vineTargetRole = (target) => String(target?.role || target?.moduleKind || '').toLowerCase()

function vineWinchTargetPriority(target, entityKind) {
  if (target?.tutorialTetherTarget) return 0
  const role = vineTargetRole(target)
  if (target?.critical || target?.cableAnchor || target?.weakFloat
    || /foundation|pier|anchor|root-wall|critical-support|key-support/u.test(role)) return 1
  if (entityKind === 'platform' || target?.tetherAnchor
    || /beam|lintel|roof|crossbar|crossbeam|raft|platform/u.test(role)
    || finiteNumber(target?.width) > finiteNumber(target?.height) * 1.35) return 2
  return 3
}

function canVineWinchTarget(target, entityKind) {
  if (!target || typeof target !== 'object' || target.tetherable === false) return false
  if (!Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) return false
  if (!(finiteNumber(target.width) > 0) || !(finiteNumber(target.height) > 0)) return false
  if (entityKind === 'platform') return target.tetherable === true || target.blocksBirds !== false
  return target.hp === undefined || finiteNumber(target.hp, 1) > 0
}

function canVineWinchOcclude(target, entityKind) {
  if (!target || typeof target !== 'object') return false
  if (!Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) return false
  if (!(finiteNumber(target.width) > 0) || !(finiteNumber(target.height) > 0)) return false
  if (entityKind === 'platform') return target.blocksBirds !== false
  return target.hp === undefined || finiteNumber(target.hp, 1) > 0
}

function segmentRectangleEntryRatio(origin, endpoint, rectangle) {
  const originX = finiteNumber(origin?.x)
  const originY = finiteNumber(origin?.y)
  const endpointX = finiteNumber(endpoint?.x)
  const endpointY = finiteNumber(endpoint?.y)
  const centreX = finiteNumber(rectangle?.x)
  const centreY = finiteNumber(rectangle?.y)
  const halfWidth = finiteNumber(rectangle?.width) / 2
  const halfHeight = finiteNumber(rectangle?.height) / 2
  if (!(halfWidth > 0) || !(halfHeight > 0)) return null

  const angle = -finiteNumber(rectangle?.rotation) * Math.PI / 180
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const relativeOriginX = originX - centreX
  const relativeOriginY = originY - centreY
  const relativeEndX = endpointX - centreX
  const relativeEndY = endpointY - centreY
  const localOriginX = relativeOriginX * cosine - relativeOriginY * sine
  const localOriginY = relativeOriginX * sine + relativeOriginY * cosine
  const localEndX = relativeEndX * cosine - relativeEndY * sine
  const localEndY = relativeEndX * sine + relativeEndY * cosine
  const directionX = localEndX - localOriginX
  const directionY = localEndY - localOriginY
  let near = 0
  let far = 1

  for (const [position, direction, extent] of [
    [localOriginX, directionX, halfWidth],
    [localOriginY, directionY, halfHeight],
  ]) {
    if (Math.abs(direction) <= 1e-9) {
      if (position < -extent || position > extent) return null
      continue
    }
    let entry = (-extent - position) / direction
    let exit = (extent - position) / direction
    if (entry > exit) [entry, exit] = [exit, entry]
    near = Math.max(near, entry)
    far = Math.min(far, exit)
    if (near > far) return null
  }
  return near >= 0 && near <= 1 ? near : null
}

/**
 * Tests the actual rope segment from the acorn to the target's near outer
 * boundary. Other live blocks and solid platforms occlude that segment, while
 * the target itself remains legal even when it is the front-most blocker.
 */
export function evaluateVineWinchLineOfSight({
  origin, target, blocks = [], platforms = [],
} = {}) {
  if (!origin || !target
    || !Number.isFinite(Number(origin.x)) || !Number.isFinite(Number(origin.y))
    || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))
    || !(finiteNumber(target.width) > 0) || !(finiteNumber(target.height) > 0)) {
    return { clear: false, targetPoint: null, blocker: null, distance: Number.POSITIVE_INFINITY }
  }
  const targetCentre = { x: finiteNumber(target.x), y: finiteNumber(target.y) }
  const centreDistance = Math.hypot(
    targetCentre.x - finiteNumber(origin.x),
    targetCentre.y - finiteNumber(origin.y),
  )
  const targetEntry = segmentRectangleEntryRatio(origin, targetCentre, target)
  if (targetEntry === null) {
    return { clear: false, targetPoint: null, blocker: null, distance: centreDistance }
  }
  const targetPoint = {
    x: finiteNumber(origin.x) + (targetCentre.x - finiteNumber(origin.x)) * targetEntry,
    y: finiteNumber(origin.y) + (targetCentre.y - finiteNumber(origin.y)) * targetEntry,
  }
  const obstacles = [
    ...blocks.map((obstacle) => ({ obstacle, entityKind: 'block' })),
    ...platforms.map((obstacle) => ({ obstacle, entityKind: 'platform' })),
  ]
  for (const { obstacle, entityKind } of obstacles) {
    const sameId = target.id !== undefined && target.id !== null && obstacle?.id === target.id
    if (obstacle === target || sameId || !canVineWinchOcclude(obstacle, entityKind)) continue
    const entry = segmentRectangleEntryRatio(origin, targetPoint, obstacle)
    if (entry !== null && entry < 1 - 1e-6) {
      return {
        clear: false,
        targetPoint,
        blocker: obstacle,
        distance: centreDistance,
      }
    }
  }
  return { clear: true, targetPoint, blocker: null, distance: centreDistance }
}

/**
 * Chooses one deterministic winch target. Authored tutorial hooks and genuine
 * structural weak points always outrank a merely closer decorative block.
 */
export function selectVineWinchTarget({ origin, blocks = [], platforms = [], range = 230 } = {}) {
  const originX = finiteNumber(origin?.x)
  const originY = finiteNumber(origin?.y)
  const maximumRange = Math.max(0, finiteNumber(range, 230))
  const candidates = [
    ...blocks.map((target) => ({ target, entityKind: 'block' })),
    ...platforms.map((target) => ({ target, entityKind: 'platform' })),
  ].filter(({ target, entityKind }) => canVineWinchTarget(target, entityKind))
    .map(({ target, entityKind }) => {
      const lineOfSight = evaluateVineWinchLineOfSight({ origin, target, blocks, platforms })
      return {
        target,
        entityKind,
        priority: vineWinchTargetPriority(target, entityKind),
        distance: Math.hypot(finiteNumber(target.x) - originX, finiteNumber(target.y) - originY),
        lineOfSight,
      }
    })
    .filter((candidate) => candidate.lineOfSight.clear)
    .filter((candidate) => candidate.distance <= maximumRange)
    .sort((first, second) => first.priority - second.priority
      || first.distance - second.distance
      || finiteNumber(first.target.x) - finiteNumber(second.target.x)
      || finiteNumber(first.target.y) - finiteNumber(second.target.y)
      || String(first.target.id || '').localeCompare(String(second.target.id || '')))
  return candidates[0] || null
}

/** Pure activation decision used to make a failed cast explicitly free. */
export function planVineWinchActivation({ bird, blocks = [], platforms = [], ability = {} } = {}) {
  const selection = selectVineWinchTarget({
    origin: bird,
    blocks,
    platforms,
    range: ability.range,
  })
  return {
    consumeUse: Boolean(selection),
    selection,
  }
}

/**
 * Applies a mass-aware pull and clamps the resulting velocity. This helper is
 * deliberately mutation-free so malformed authoring data cannot create NaN
 * velocities in the fixed-step simulation.
 */
export function calculateVineWinchVelocity({
  target, anchor, force = 0, maxSpeed = 8.8, timeScale = 1,
} = {}) {
  const targetX = finiteNumber(target?.x)
  const targetY = finiteNumber(target?.y)
  const dx = finiteNumber(anchor?.x) - targetX
  const dy = finiteNumber(anchor?.y) - targetY
  const distance = Math.hypot(dx, dy)
  const mass = Math.max(0.2, finiteNumber(
    target?.mass,
    Math.max(0.2, finiteNumber(target?.width) * finiteNumber(target?.height) / 1_000),
  ))
  const massNormalization = 1 / Math.min(4, Math.max(0.8, Math.sqrt(mass)))
  const pull = Math.max(0, finiteNumber(force)) * Math.min(4, Math.max(0, finiteNumber(timeScale, 1)))
    * massNormalization
  const directionX = distance > 0.0001 ? dx / distance : 0
  const directionY = distance > 0.0001 ? dy / distance : 0
  let vx = finiteNumber(target?.vx) + directionX * pull
  let vy = finiteNumber(target?.vy) + directionY * pull
  const speedLimit = Math.max(0.1, finiteNumber(maxSpeed, 8.8))
  const speed = Math.hypot(vx, vy)
  if (speed > speedLimit) {
    const scale = Math.max(0, speedLimit - 1e-9) / speed
    vx *= scale
    vy *= scale
  }
  return {
    vx,
    vy,
    directionX,
    directionY,
    distance,
    massNormalization,
    speed: Math.hypot(vx, vy),
  }
}

/**
 * Plans the one-shot "pull the tenon" event. Only live joints directly
 * connected to the grabbed target are returned; isolated blocks instead get
 * a temporary low-friction window in the runtime.
 */
export function evaluateVineWinchDisplacement({
  targetId, startX, startY, currentX, currentY, threshold = 18,
  joints = [], alreadyTriggered = false,
} = {}) {
  const displacement = Math.hypot(
    finiteNumber(currentX) - finiteNumber(startX),
    finiteNumber(currentY) - finiteNumber(startY),
  )
  const reached = !alreadyTriggered && displacement >= Math.max(0, finiteNumber(threshold, 18))
  const connectedJointIds = reached
    ? joints.filter((joint) => joint && !joint.broken
      && (joint.firstId === targetId || joint.secondId === targetId))
      .map((joint) => joint.id)
    : []
  return {
    displacement,
    reached,
    connectedJointIds,
    applySlip: reached && connectedJointIds.length === 0,
  }
}

/**
 * New playable acorns. Numeric fields intentionally use the same rough scale as
 * the existing Canvas simulation, so the game can consume this module without
 * translating design-document percentages at runtime.
 */
export const SPECIAL_ACORNS = deepFreeze([
  acorn({
    type: 'drill',
    title: '钻岩橡宝',
    role: '垂直破甲',
    firstLevel: 14,
    summary: '飞行中启动后会在原位转为高速垂直钻击，可连续穿透四块建材，对石块和护甲格外有效。',
    action: '飞行中点击 · 垂直钻地',
    tip: '先飞到重叠支柱或石墙上方，再垂直钻穿整条承重链。',
    drawback: '启动后会放弃原有水平弹道，范围伤害低，不适合追击分散目标。',
    silhouette: '长菱形重甲壳，前端三段钻头，侧面短稳定翼。',
    palette: { shell: '#66747a', cap: '#30383c', accent: '#f2b84d', outline: '#263036' },
    stats: { radius: 16, mass: 1.3, launchSpeed: 0.98, gravityScale: 1, restitution: 0.23, baseDamage: 1.25 },
    ability: {
      id: 'vertical-bore', trigger: 'active', uses: 1, durationMs: 960,
      diveSpeed: 21, horizontalVelocityRetention: 0,
      activeWindMultiplier: 0.18, activeGravityMultiplier: 1.15,
      damageMultiplier: 1.85, stoneDamageMultiplier: 2.35,
      maxPierces: 4, velocityRetention: 0.88,
    },
  }),
  acorn({
    type: 'frost',
    title: '霜铃橡宝',
    role: '控场脆化',
    firstLevel: 19,
    summary: '摇响冰叶铃，将附近建材永久冻结并脆化，同时短暂减慢特殊松鼠的移动与技能。',
    action: '飞行中点击 · 释放霜环',
    tip: '先永久冻住石塔中心，再从已脆化的承重链安排后续撞击。',
    drawback: '直接撞击偏弱，霜环本身无法摧毁完好的高耐久建材。',
    silhouette: '六角冰晶壳，双侧霜翼，顶部铃铛状双叶。',
    palette: { shell: '#8ecbd2', cap: '#476f79', accent: '#f3fbf7', outline: '#35545d' },
    stats: { radius: 15, mass: 0.92, launchSpeed: 0.96, gravityScale: 0.96, restitution: 0.36, baseDamage: 0.8 },
    ability: {
      id: 'frost-ring', trigger: 'active', uses: 1, radius: 110,
      enemySlowMs: 3200, enemySpeedMultiplier: 0.56,
      permanentBlockFreeze: true, brittleDamageMultiplier: 1.8,
    },
  }),
  acorn({
    type: 'vine',
    title: '藤锁橡宝',
    role: '定点拔榫',
    firstLevel: 25,
    summary: '展开藤锁绞盘，优先锁定关键支点、钢索锚与横梁，持续拉移后定点拔开相连榫结。',
    action: '飞行中点击 · 锁定绞拉两秒',
    tip: '贴近叶纹提示的关键梁再发动；拉移足够距离会仅伤及它相连的榫结。',
    drawback: '绞盘只抓取单一建材或可拉平台，不会伤及周围；范围内无目标时不消耗技能。',
    silhouette: '宽叶翼与纸鸢形胸壳，腰部的黄铜绞盘缠着两圈鲜明藤锁。',
    palette: { shell: '#78985d', cap: '#3f5f3f', accent: '#d8e7ad', outline: '#314934' },
    stats: { radius: 15, mass: 1, launchSpeed: 0.91, gravityScale: 0.92, restitution: 0.32, baseDamage: 0.75 },
    ability: {
      id: 'vine-winch', trigger: 'active', uses: 1, range: 230,
      initialPullImpulse: 7.6, winchForce: 0.44, maxTargetSpeed: 8.8,
      selfVelocityRetention: 0.58, tetherMs: 2000, displacementThreshold: 18,
      jointDamage: 2, slipMs: 1200, maxTargets: 1,
    },
  }),
  acorn({
    type: 'boomerang',
    title: '回旋橡宝',
    role: '背面绕击',
    firstLevel: 33,
    summary: '展开月轮叶翼后立即反转水平速度，从建筑背面打击盾牌敌人或内侧支点。',
    action: '飞行中点击 · 回旋一次',
    tip: '先飞过目标再折返，弯曲弹道可绕过正面钢盾和高墙。',
    drawback: '轻质壳不适合推动重块，过早回旋往往会飞回发射区。',
    silhouette: '明显的新月型双翼，细长水滴壳，背部带回旋箭羽。',
    palette: { shell: '#a47bb2', cap: '#564563', accent: '#efe0f3', outline: '#45374e' },
    stats: { radius: 14, mass: 0.86, launchSpeed: 1.04, gravityScale: 0.85, restitution: 0.58, baseDamage: 0.9 },
    ability: {
      id: 'return-turn', trigger: 'active', uses: 1,
      horizontalVelocityMultiplier: -1.12, verticalLift: -2.4, damageMultiplier: 1.25, controlMs: 520,
    },
  }),
  acorn({
    type: 'quake',
    title: '震地橡宝',
    role: '落地冲击',
    firstLevel: 42,
    summary: '收拢叶翼垂直下坠，落地或撞到建材时释放传向支撑链的短程震波。',
    action: '飞行中点击 · 俯冲震地',
    tip: '先拉高弹道，再对准塔楼根部或地道松鼠上方俯冲。',
    drawback: '弹道仍比轻型橡宝低沉；震波需要足够的下落高度才能达到完整威力。',
    silhouette: '宽矮方橡壳，岩层状重冠，底部有两枚撞锤足。',
    palette: { shell: '#9b6745', cap: '#50423b', accent: '#efc36f', outline: '#3d322e' },
    stats: {
      radius: 18, mass: 1.55, launchSpeed: 1.06, gravityScale: 1.08,
      windMultiplier: 0.55, restitution: 0.12, baseDamage: 1.35,
    },
    ability: {
      id: 'ground-pound', trigger: 'active', uses: 1, minHeight: 60,
      downwardSpeed: 10.8, shockRadius: 130, shockDamage: 2, blockWakeRadius: 175,
    },
  }),
])

/** Distinct enemy roles designed to combine, but never duplicate, one another. */
export const SPECIAL_SQUIRRELS = deepFreeze([
  squirrel({
    type: 'shield',
    title: '盾尾卫士',
    role: '正面防线',
    firstLevel: 15,
    summary: '用巨大叶盾抵挡一次正面撞击，盾面承伤后碎裂，后续攻击恢复正常伤害。',
    action: '被动 · 一次性正面叶盾',
    tip: '用回旋橡宝绕后，或砸落头顶的建材忽略叶盾。',
    counter: '背面与头顶没有防护；范围爆炸和坠物不受正面减伤影响。',
    silhouette: '身前一枚高过头顶的不对称橡叶盾，尾巴收在盾后。',
    palette: { fur: '#9a6545', gear: '#617553', accent: '#e7d8ae', outline: '#352b25' },
    stats: { hp: 3, size: 19, mass: 1.3, score: 800, moveSpeed: 0 },
    ability: { id: 'front-guard', charges: 1, arcDegrees: 132, damageMultiplier: 0.22, knockbackMultiplier: 0.35 },
  }),
  squirrel({
    type: 'engineer',
    title: '榫木工匠',
    role: '建筑维修',
    firstLevel: 22,
    summary: '携带榫印工具箱，周期性修复附近受损但尚未碎裂的建材。',
    action: '每隔数秒 · 修复最低耐久块',
    tip: '先用爆炸或藤索把工匠移出工作区，再处理高耐久建筑。',
    counter: '修理需要站立不动且不能复活已碎建材；冰冻可打断当次修理。',
    silhouette: '方正工具背包、双耳间的金属扳手与右侧齿轮尾套。',
    palette: { fur: '#a66c41', gear: '#657378', accent: '#e3a94c', outline: '#352b27' },
    stats: { hp: 2, size: 18, mass: 1.05, score: 900, moveSpeed: 0 },
    ability: { id: 'repair', cooldownMs: 3200, range: 105, repairAmount: 1, maxRepairs: 3, channelMs: 720 },
  }),
  squirrel({
    type: 'glider',
    title: '飞膜斥候',
    role: '空中机动',
    firstLevel: 29,
    summary: '在塔楼上空呈波浪轨迹滑翔，迫使玩家同时判断弹道和目标时机。',
    action: '持续 · 水平巡航',
    tip: '在斥候换向的瞬间发射，或用霜铃橡宝扩大命中窗口。',
    counter: '转向点速度低，冰冻和大范围技能对空中目标尤其有效。',
    silhouette: '两侧展开宽大三角飞膜，身体居中成小尖锥。',
    palette: { fur: '#8e644c', gear: '#75a2a8', accent: '#e9f4ed', outline: '#34464a' },
    stats: { hp: 1, size: 16, mass: 0.72, score: 1000, moveSpeed: 1.15 },
    ability: { id: 'glide-patrol', range: 170, waveHeight: 34, cycleMs: 4600, turnPauseMs: 340 },
  }),
  squirrel({
    type: 'shaman',
    title: '霜枝祭司',
    role: '弹道干扰',
    firstLevel: 37,
    summary: '以霜枝权杖维持寒雾领域，进入领域的橡宝会减速并更快下坠。',
    action: '持续 · 寒雾领域',
    tip: '从领域上方俯冲，或让钻岩橡宝在祭司头顶启动垂直钻击。',
    counter: '领域随祭司移除立即消失；射程外的坠物和震波不受影响。',
    silhouette: '高耸分叉霜枝冠、长权杖和环绕身体的六角雾环。',
    palette: { fur: '#866c70', gear: '#668596', accent: '#d9f0ed', outline: '#3f3943' },
    stats: { hp: 2, size: 18, mass: 0.96, score: 1200, moveSpeed: 0 },
    ability: { id: 'cold-aura', radius: 140, birdSpeedMultiplier: 0.72, birdGravityMultiplier: 1.2, pulseMs: 1200 },
  }),
  squirrel({
    type: 'burrower',
    title: '地道伏兵',
    role: '周期隐匿',
    firstLevel: 46,
    summary: '在两个土穴之间往返，潜地时无法被直接命中，现身后会短暂观察战场。',
    action: '循环 · 潜地与现身',
    tip: '记住土堆位置并等它露头，震地橡宝可将潜地状态提前打断。',
    counter: '现身期间没有额外护甲；地面震波可无视潜地无敌并延长现身时间。',
    silhouette: '低矮椭圆地鼠盔，只有上半身与铲子露出齿状土堆。',
    palette: { fur: '#9a6a43', gear: '#667254', accent: '#dca85e', outline: '#3d3025' },
    stats: { hp: 2, size: 17, mass: 1.12, score: 1300, moveSpeed: 0.82 },
    ability: { id: 'burrow-cycle', burrowMs: 2200, exposedMs: 1500, relocateRange: 160, quakeStunMs: 2100 },
  }),
])

export const SPECIAL_ACORN_BY_TYPE = deepFreeze(Object.fromEntries(
  SPECIAL_ACORNS.map((entry) => [entry.type, entry]),
))

export const SPECIAL_SQUIRREL_BY_TYPE = deepFreeze(Object.fromEntries(
  SPECIAL_SQUIRRELS.map((entry) => [entry.type, entry]),
))

export const SPECIAL_ROSTER = deepFreeze([...SPECIAL_ACORNS, ...SPECIAL_SQUIRRELS])

const toDiscoveryRecord = (entry) => deepFreeze({
  category: entry.kind === 'acorn' ? '特殊橡果' : '特殊松鼠',
  title: entry.title,
  art: entry.visual.art,
  summary: entry.summary,
  action: entry.action,
  tip: entry.tip,
  firstLevel: entry.firstLevel,
  role: entry.role,
})

export const SPECIAL_ACORN_DISCOVERIES = deepFreeze(Object.fromEntries(
  SPECIAL_ACORNS.map((entry) => [entry.discoveryId, toDiscoveryRecord(entry)]),
))

export const SPECIAL_SQUIRREL_DISCOVERIES = deepFreeze(Object.fromEntries(
  SPECIAL_SQUIRRELS.map((entry) => [entry.discoveryId, toDiscoveryRecord(entry)]),
))

const SPECIAL_BY_ID = new Map(SPECIAL_ROSTER.flatMap((entry) => [
  [entry.id, entry],
  [entry.discoveryId, entry],
  [`${entry.kind}:${entry.type}`, entry],
]))

export function getSpecialRosterEntry(id) {
  return SPECIAL_BY_ID.get(id) || null
}

export function specialRosterForLevel(level, kind = null) {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('level must be a positive integer')
  if (kind !== null && kind !== 'acorn' && kind !== 'squirrel') throw new RangeError('kind must be acorn, squirrel, or null')
  return SPECIAL_ROSTER.filter((entry) => entry.firstLevel <= level && (!kind || entry.kind === kind))
}

export function validateSpecialRoster(records = SPECIAL_ROSTER) {
  const errors = []
  if (!Array.isArray(records)) return { valid: false, errors: ['roster must be an array'] }
  const ids = new Set()
  const discoveryIds = new Set()
  const typesByKind = { acorn: new Set(), squirrel: new Set() }
  for (const [index, entry] of records.entries()) {
    const at = `roster[${index}]`
    if (!entry || typeof entry !== 'object') { errors.push(`${at} must be an object`); continue }
    if (entry.kind !== 'acorn' && entry.kind !== 'squirrel') errors.push(`${at}.kind is invalid`)
    for (const field of ['id', 'type', 'discoveryId', 'title', 'role', 'summary', 'action', 'tip', 'counter']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) errors.push(`${at}.${field} is required`)
    }
    if (!Number.isInteger(entry.firstLevel) || entry.firstLevel < 1) errors.push(`${at}.firstLevel must be positive`)
    if (ids.has(entry.id)) errors.push(`duplicate id: ${entry.id}`)
    if (discoveryIds.has(entry.discoveryId)) errors.push(`duplicate discoveryId: ${entry.discoveryId}`)
    ids.add(entry.id)
    discoveryIds.add(entry.discoveryId)
    const kindTypes = typesByKind[entry.kind]
    if (kindTypes) {
      if (kindTypes.has(entry.type)) errors.push(`duplicate ${entry.kind} type: ${entry.type}`)
      kindTypes.add(entry.type)
    }
    if (!entry.visual || !entry.visual.art || !entry.visual.silhouette || !entry.visual.palette) errors.push(`${at}.visual is incomplete`)
    if (!entry.stats || Object.values(entry.stats).some((value) => typeof value !== 'number' || !Number.isFinite(value))) errors.push(`${at}.stats must be finite numbers`)
    if (!entry.ability || typeof entry.ability.id !== 'string') errors.push(`${at}.ability is incomplete`)
  }
  return { valid: errors.length === 0, errors }
}
