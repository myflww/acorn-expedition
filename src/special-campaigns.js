// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/u
const OBJECTIVE_TYPES = new Set([
  'eliminate-all',
  'collapse-and-clear',
  'defeat-boss',
  'precision-strike',
  'score-rush',
  'identify-target',
  'ordered-demolition',
])
const CHALLENGE_OBJECTIVE_TYPES = new Set([
  'precision-strike',
  'score-rush',
  'identify-target',
  'ordered-demolition',
])

export const SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL = 18
export const SPECIAL_CAMPAIGN_COUNT = 5
export const SPECIAL_STAGE_COUNT_PER_CAMPAIGN = 4

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function standardUnlock() {
  return {
    kind: 'main-complete',
    requiredMainLevel: SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL,
    prerequisiteCampaignIds: [],
  }
}

function rule(id, kind, description, parameters) {
  return { id, kind, description, parameters }
}

function carriedBlocker(parameters) {
  return {
    ...parameters,
    carrierType: 'flying-squirrel',
    carrierCount: 2,
    carrierHp: 2,
    boardHp: 3,
    breakTargets: ['board', 'carrier'],
  }
}

function modifier(kind, value) {
  return { kind, value }
}

function challenge(kind, label, description, parameters) {
  return {
    kind,
    label,
    description,
    requiredForClear: false,
    parameters,
  }
}

function bossPhase(id, name, hpThreshold, telegraph, activateRuleIds, changes) {
  return { id, name, hpThreshold, telegraph, activateRuleIds, changes }
}

const CAMPAIGNS = [
  {
    id: 'polar-clocktower',
    order: 1,
    title: '极夜钟楼',
    subtitle: '让被冻住的黎明重新走动',
    briefing: {
      recommendedOrder: 1,
      difficulty: { rating: 7, label: '进阶', note: '先熟悉脆化接缝，再学习变风与钟摆时机。' },
      coreRuleIds: ['polar-frost-joint', 'polar-wind-dial', 'polar-pendulum'],
      enemyPreview: [
        { type: 'shaman', role: '控风与干扰弹道' },
        { type: 'shield', role: '正面减伤，惧怕坠物与绕后' },
      ],
      materialPalette: ['wood', 'ice', 'stone'],
    },
    story: {
      opening: '主线战争结束后，王国仍没有迎来日出。司钟松鼠偷走了“春晨发条”，把北境锁在永恒的十二点前。你必须沿着悬摆和冰结齿轮攀上钟楼。',
      ending: '最后一枚冰齿崩落时，分针终于越过十二。极光被初日撕开，那只一直敲钟的小松鼠放下锤子，第一次听见了雪融的声音。',
    },
    unlock: standardUnlock(),
    theme: {
      colors: {
        skyTop: '#111b3c', skyBottom: '#5164a4', terrain: '#263956',
        accent: '#8ff0df', light: '#f6f3d2', hazard: '#ff8d78',
      },
      background: {
        id: 'aurora-clock-ridge',
        layers: ['starfield', 'aurora-ribbons', 'snow-ridge', 'clock-silhouette'],
        parameters: { starDensity: 0.72, auroraSpeed: 0.18, snowRate: 0.34, clockScale: 1.25 },
      },
    },
    birdTypes: ['frost', 'bomb', 'dash'],
    signatureBird: {
      id: 'frost', name: '霜铃橡宝',
      ability: '飞行中激活会摇响冰叶铃，让范围内建材在本场战斗中永久冻结、脆化，并短暂减速特殊松鼠。',
      visualCue: '六角冰晶壳、顶部铃铛状双叶和高亮冰雾尾迹。',
    },
    enemyVariants: ['shaman', 'shield'],
    enemyProfiles: {
      shaman: { name: '霜枝祭司', behavior: '寒雾领域会干扰弹道，而钟楼风向会在每次发射后切换；祭司倒地后风向锁定。' },
      shield: { name: '盾尾卫士', behavior: '正面叶盾先抵消大部分撞击，但被倒塌方块压中时可直接绕过防御。' },
    },
    mapRules: [
      rule('polar-pendulum', 'moving-platform', '两只搬运飞鼠悬吊钟摆木板垂直往复，木板可被击破，任一搬运者也可被击落；机关只改变弹道与松鼠落脚，不托举或抽走建筑支点。',
        carriedBlocker({ axis: 'vertical', amplitude: 86, periodTicks: 150, phaseStep: 0.25 })),
      rule('polar-wind-dial', 'wind-cycle', '每发射一枚橡果，风向依钟面刻度轮转。',
        { sequence: [-0.08, 0.04, 0.09, -0.03], advanceOn: 'launch' }),
      rule('polar-frost-joint', 'material-modifier', '未霜封的冰缝需先承受一次载荷；霜铃可直接完成永久冻脆，让下一次撞击立即生效。',
        { material: 'ice', firstHitDamage: 0, nextLoadDamage: 2, frictionScale: 0.72 }),
    ],
    stages: [
      {
        id: 'polar-clocktower-1', number: 1, title: '霜齿之门',
        storyBeat: '入口钟齿被三枚冰销冻在一起：先听清霜铃的范围，不必同时追赶摆锤。',
        difficulty: 7, tutorialStage: true, seedSalt: 0x1a7c0101, availableBirdTypes: ['frost', 'bomb'],
        tutorialContract: {
          kind: 'frost-cluster', signatureBirdType: 'frost',
          instruction: '在三块紧密冰结件中间摇铃；蓝白霜纹会保留至战斗结束，后续橡宝可随时利用永久脆化。',
          minimumTargets: 3, radius: 110, targetMaterial: 'ice',
          requiredRuleIds: ['polar-frost-joint'],
        },
        objective: { type: 'eliminate-all', shotLimit: 5, parScore: 7_500, requiredCollapseRatio: 0.24 },
        encounter: { targetCount: 6, bossVariant: null },
        activeRuleIds: ['polar-frost-joint'],
        layoutModifiers: [modifier('tower-profile', 'twin-narrow'), modifier('support-count', 5), modifier('ice-ratio', 0.35)],
      },
      {
        id: 'polar-clocktower-2', number: 2, title: '逆风刻度',
        storyBeat: '风标与钟针联动，同一条弹道再也不会出现第二次。',
        difficulty: 8, seedSalt: 0x1a7c0202, availableBirdTypes: ['frost', 'dash'],
        objective: {
          type: 'ordered-demolition', shotLimit: 5, parScore: 9_000, requiredCollapseRatio: 0.42,
          challenge: challenge('ordered-demolition', '顺时拆钟', '按钟面顺序拆掉三处承重点，可额外获得秘境徽记。', {
            sequence: ['left-gear', 'center-needle', 'right-gear'], metric: 'tagged-support-order',
          }),
        },
        encounter: { targetCount: 7, bossVariant: null },
        activeRuleIds: ['polar-wind-dial', 'polar-frost-joint'],
        layoutModifiers: [modifier('tower-profile', 'offset-needle'), modifier('elevated-targets', 4), modifier('stone-ratio', 0.28)],
      },
      {
        id: 'polar-clocktower-3', number: 3, title: '十二点坠落',
        storyBeat: '搬运飞鼠悬着一块钟摆木板切过低空射线。先看完它的单次升降，等挡板离开，或直接击落一侧搬运者再出手。',
        difficulty: 9, seedSalt: 0x1a7c0303, availableBirdTypes: ['frost', 'bomb', 'dash'],
        objective: {
          type: 'precision-strike', shotLimit: 5, parScore: 11_500, requiredCollapseRatio: 0.58,
          challenge: challenge('precision-strike', '精准拆轴', '两块配重轴带有金色精准弱点：先削弱石壳，再用疾风等强动力直击各打断一处，最多只允许两次直接撞击。', {
            targetTag: 'counterweight', requiredTaggedBlocks: 2, maximumDirectHits: 2, metric: 'tagged-blocks-within-direct-hits',
          }),
        },
        encounter: { targetCount: 8, bossVariant: null },
        activeRuleIds: ['polar-pendulum', 'polar-wind-dial', 'polar-frost-joint'],
        layoutModifiers: [modifier('tower-profile', 'single-spine'), modifier('platform-count', 1), modifier('floor-count', 5), modifier('counterweight-count', 3)],
      },
      {
        id: 'polar-clocktower-4', number: 4, title: '永夜司钟',
        storyBeat: '钟楼顶层的巨钟下，司钟者用最后一枚冰销卡住了黎明。',
        difficulty: 10, seedSalt: 0x1a7c0404, availableBirdTypes: ['frost', 'bomb', 'dash'],
        objective: { type: 'defeat-boss', shotLimit: 5, parScore: 14_500, bossVariant: 'shaman', clearGuards: true },
        encounter: {
          targetCount: 7,
          bossVariant: 'shaman',
          bossPhases: [
            bossPhase('frozen-dial', '冻结钟盘', 0.66, '钟面凝霜，风标开始加速轮转。', ['polar-wind-dial'], { windAdvanceSteps: 2 }),
            bossPhase('last-chime', '末日钟鸣', 0.33, '巨钟发光，所有冰接缝同时脆化。', ['polar-frost-joint', 'polar-pendulum'], { brittleAllIceJoints: true, pendulumSpeedScale: 1.25 }),
          ],
        },
        activeRuleIds: ['polar-pendulum', 'polar-wind-dial', 'polar-frost-joint'],
        layoutModifiers: [modifier('tower-profile', 'clock-crown'), modifier('platform-count', 2), modifier('boss-armor', 3), modifier('critical-supports', 2), modifier('ice-ratio', 0.22)],
      },
    ],
  },
  {
    id: 'tidebound-undercity',
    order: 2,
    title: '潮缚下城',
    subtitle: '在海水淹没记忆之前找回港口',
    briefing: {
      recommendedOrder: 2,
      difficulty: { rating: 8, label: '困难', note: '建议掌握牵引与分裂，关注潮位而非只看当前弹道。' },
      coreRuleIds: ['tide-waterline', 'tide-wet-surface', 'tide-raft-platform'],
      enemyPreview: [
        { type: 'engineer', role: '持续修复受损结构' },
        { type: 'burrower', role: '随潮潜地，需抓住暴露窗口' },
      ],
      materialPalette: ['wood', 'ice', 'stone'],
    },
    story: {
      opening: '南岸港口每夜都在下沉。潜水松鼠把旧城的浮力钟改成了潮汐武器，让木堡在海浪上重组。弹射器被搬到一艘小船上，这一次，地面也不可信。',
      ending: '浮力钟停下后，潮水退出街道，被盐结封住的门牌一块块露出。港口人把第一网新鲜海藻送给了橡宝，尽管没有谁知道橡果能不能吃它。',
    },
    unlock: standardUnlock(),
    theme: {
      colors: {
        skyTop: '#16465b', skyBottom: '#78c8c0', terrain: '#295968',
        accent: '#ffd37a', light: '#e9fff8', hazard: '#ff7669',
      },
      background: {
        id: 'moon-tide-ruins',
        layers: ['moon-haze', 'drowned-rooftops', 'waterline', 'harbor-lanterns'],
        parameters: { waveAmplitude: 12, wavePeriodTicks: 180, bubbleDensity: 0.38, lanternGlow: 0.66 },
      },
    },
    birdTypes: ['vine', 'split', 'bomb'],
    signatureBird: {
      id: 'vine', name: '藤锁橡宝',
      ability: '飞行中激活藤锁绞盘，优先缠住浮筏横梁或浸水支点，拉移后定点拔开相连榫结。',
      visualCue: '宽叶翼、纸鸢形胸壳和腰部鲜明的黄铜藤锁绞盘。',
    },
    enemyVariants: ['engineer', 'burrower'],
    enemyProfiles: {
      engineer: { name: '榫木工匠', behavior: '站稳后引导修复附近受损建材；冰冻、位移或超出距离都会打断修理。' },
      burrower: { name: '地道伏兵', behavior: '在涨落潮间周期潜地，潜地时避开直接撞击，但震地可强制令其暴露。' },
    },
    mapRules: [
      rule('tide-waterline', 'water-cycle', '水位在四个阶段循环，没入水中的方块受浮力和阻力。',
        { levels: [516, 470, 425, 480], advanceOn: 'launch', buoyancy: 0.58, drag: 0.86 }),
      rule('tide-wet-surface', 'friction-zone', '浸水木块的摩擦降低，斜面会更容易整体滑移。',
        { material: 'wood', frictionScale: 0.52, restitutionScale: 0.82 }),
      rule('tide-raft-platform', 'moving-platform', '两只潮翼搬运飞鼠拉着浮筏木板跟随波峰升降；击碎木板或击落任一搬运者都能让挡板退场，但它不承托或推挤建筑。',
        carriedBlocker({ axis: 'vertical', amplitude: 34, periodTicks: 180, loadSinkPerMass: 0.018 })),
    ],
    stages: [
      {
        id: 'tidebound-undercity-1', number: 1, title: '满水街巷',
        storyBeat: '第一道防线藏在半淹的木屋间，水面是新跳板，也是新陷阱。',
        difficulty: 7, tutorialStage: true, seedSalt: 0x2b8d0101, availableBirdTypes: ['vine', 'split', 'bomb'],
        tutorialContract: {
          kind: 'vine-tether', signatureBirdType: 'vine',
          instruction: '从左上方启动绞盘，锁定唯一的叶纹浮筏横梁，拉移足够距离拔开它的榫结。',
          minimumTargets: 1, range: 230, targetTag: 'tutorial-tether-target',
          uniqueNearestTarget: true,
          requiredRuleIds: ['tide-waterline', 'tide-wet-surface'],
        },
        objective: { type: 'eliminate-all', shotLimit: 5, parScore: 8_000, requiredCollapseRatio: 0.22 },
        encounter: { targetCount: 6, bossVariant: null },
        activeRuleIds: ['tide-waterline', 'tide-wet-surface'],
        layoutModifiers: [modifier('tower-profile', 'flooded-alley'), modifier('water-start-phase', 1), modifier('ice-ratio', 0.18)],
      },
      {
        id: 'tidebound-undercity-2', number: 2, title: '潮头转轨',
        storyBeat: '第一座巡游浮筏会慢速切过三座矮塔前的射线；等它升至波峰，低空窗口就会完整打开。',
        difficulty: 8, seedSalt: 0x2b8d0202, availableBirdTypes: ['vine', 'bomb'],
        objective: {
          type: 'score-rush', shotLimit: 5, parScore: 9_800, requiredCollapseRatio: 0.3,
          challenge: challenge('score-rush', '一潮高分', '在第四枚橡宝落地前达到标准分，奖励一枚潮汐徽记。', {
            targetScore: 9_800, withinShots: 4, metric: 'stage-score-within-shots',
          }),
        },
        encounter: { targetCount: 7, bossVariant: null },
        activeRuleIds: ['tide-waterline', 'tide-raft-platform'],
        layoutModifiers: [modifier('tower-profile', 'three-rafts'), modifier('raft-count', 1), modifier('ballast-blocks', 4)],
      },
      {
        id: 'tidebound-undercity-3', number: 3, title: '浮力钟室',
        storyBeat: '工程师们用石块压住浮筒，只有在潮水最高时抽掉配重才能连锁翻转。',
        difficulty: 9, seedSalt: 0x2b8d0303, availableBirdTypes: ['vine', 'split', 'bomb'],
        objective: {
          type: 'ordered-demolition', shotLimit: 5, parScore: 12_200, requiredCollapseRatio: 0.56,
          challenge: challenge('ordered-demolition', '先浮后沉', '先破坏浮筒、再移除石制配重，倒序操作会让钟室卡死。', {
            sequence: ['weak-floats', 'stone-ballast'], metric: 'tag-group-order', resetOnWrongTag: true,
          }),
        },
        encounter: { targetCount: 8, bossVariant: null },
        activeRuleIds: ['tide-waterline', 'tide-wet-surface'],
        layoutModifiers: [modifier('tower-profile', 'ballast-ring'), modifier('stone-ratio', 0.4), modifier('weak-floats', 3)],
      },
      {
        id: 'tidebound-undercity-4', number: 4, title: '贝壳引擎',
        storyBeat: '城底巨型贝壳包住了浮力钟，工程师正站在每次都会改变高度的核心架上。',
        difficulty: 10, seedSalt: 0x2b8d0404, availableBirdTypes: ['vine', 'split', 'bomb'],
        objective: { type: 'defeat-boss', shotLimit: 5, parScore: 15_000, bossVariant: 'engineer', clearGuards: true },
        encounter: {
          targetCount: 8,
          bossVariant: 'engineer',
          bossPhases: [
            bossPhase('repair-tide', '抢修潮', 0.66, '贝壳打开，工匠开始同时修复两处浮筒。', ['tide-waterline'], { repairTargets: 2, waterAdvanceSteps: 2 }),
            bossPhase('sinking-core', '沉没核心', 0.33, '浮力钟过载，潮位快速变换且木面更滑。', ['tide-waterline', 'tide-wet-surface'], { waterAdvanceEveryTicks: 150, frictionScale: 0.42 }),
          ],
        },
        activeRuleIds: ['tide-waterline', 'tide-wet-surface', 'tide-raft-platform'],
        layoutModifiers: [modifier('tower-profile', 'shell-engine'), modifier('raft-count', 2), modifier('boss-armor', 3), modifier('repairable-floats', 4), modifier('stone-ratio', 0.22)],
      },
    ],
  },
  {
    id: 'mirrorwood-labyrinth',
    order: 3,
    title: '镜林迷宫',
    subtitle: '打破每一条看似正确的弹道',
    briefing: {
      recommendedOrder: 3,
      difficulty: { rating: 8, label: '专家', note: '需要主动判断真假目标，并能利用反弹和回旋绕后。' },
      coreRuleIds: ['mirror-false-image', 'mirror-ricochet', 'mirror-shutter'],
      enemyPreview: [
        { type: 'shield', role: '正面镜盾，强迫绕后或反弹' },
        { type: 'shaman', role: '雾中制造视觉假身' },
      ],
      materialPalette: ['wood', 'ice', 'stone', 'mirror-surface'],
    },
    story: {
      opening: '一片从未出现在地图上的白色树林拦住了商队。棱镜松鼠将枝干磨成镜面，让路、敌人甚至阴影都多出一份。只有能穿过第一层假象的橡果，才能找到真正的出口。',
      ending: '棱镜心脏裂成细小的彩虹，所有重复的路重合为一条。林中的镜片没有被扔掉，它们被挂在树上，从此只用来把日光送到林底。',
    },
    unlock: standardUnlock(),
    theme: {
      colors: {
        skyTop: '#f4f6f8', skyBottom: '#d8e9e5', terrain: '#a7bbb1',
        accent: '#7a71d8', light: '#ffffff', hazard: '#e7598b',
      },
      background: {
        id: 'white-mirror-grove',
        layers: ['mist-paper', 'silver-trunks', 'mirror-shards', 'prism-caustics'],
        parameters: { fogOpacity: 0.28, reflectionCount: 5, causticSpeed: 0.12, trunkParallax: 0.42 },
      },
    },
    birdTypes: ['boomerang', 'red', 'split'],
    signatureBird: {
      id: 'boomerang', name: '回旋橡宝',
      ability: '飞行中激活会翻转水平动量，以回旋弹道绕过镜门或从建筑背面命中支点。',
      visualCue: '弯月形叶刃、高对比紫白分区和环形回旋尾迹。',
    },
    enemyVariants: ['shield', 'shaman'],
    enemyProfiles: {
      shield: { name: '盾尾卫士', behavior: '正面镜盾会卸去直线撞击，但无法防住回旋背击、反弹或倒塌伤害。' },
      shaman: { name: '霜枝祭司', behavior: '寒雾会降低橡宝速度，镜林雾气还会生成一个无碰撞的视觉倒影诱导瞄准。' },
    },
    mapRules: [
      rule('mirror-ricochet', 'surface-restitution', '斜置镜板会保留大部分速度并反射橡果。',
        { material: 'mirror', restitution: 0.88, durability: 2, angleSnapDegrees: 15 }),
      rule('mirror-shutter', 'moving-platform', '两只镜翼搬运飞鼠抬着可破坏镜门在两条轨迹间往复；可击碎镜板或击落任一搬运者打开弹道，它不作为建筑支点。',
        carriedBlocker({ axis: 'horizontal', amplitude: 74, periodTicks: 132, phaseStep: 0.5 })),
      rule('mirror-false-image', 'target-decoy', '特殊松鼠在水平镜像位置生成不参与物理的视觉倒影。',
        { offsetX: 92, opacity: 0.52, revealAfterImpactTicks: 24 }),
    ],
    stages: [
      {
        id: 'mirrorwood-labyrinth-1', number: 1, title: '第二条直线',
        storyBeat: '一面镜板标出了正面弹道的尽头：飞过目标后折返，才是第二条直线。',
        difficulty: 7, tutorialStage: true, seedSalt: 0x3c9e0101, availableBirdTypes: ['boomerang', 'red'],
        tutorialContract: {
          kind: 'boomerang-return', signatureBirdType: 'boomerang',
          instruction: '从盾尾卫士上方飞过，在唯一的立镜前折返，从背面完成命中。',
          mirrorSurfaceCount: 1, decoyCount: 0, targetTag: 'tutorial-return-target',
          requiredRuleIds: ['mirror-ricochet'],
        },
        objective: { type: 'eliminate-all', shotLimit: 5, parScore: 8_500, requiredCollapseRatio: 0.18 },
        encounter: { targetCount: 6, bossVariant: null },
        activeRuleIds: ['mirror-ricochet'],
        layoutModifiers: [modifier('tower-profile', 'double-facade'), modifier('mirror-count', 1), modifier('decoy-count', 0), modifier('ice-ratio', 0.18), modifier('stone-ratio', 0.14)],
      },
      {
        id: 'mirrorwood-labyrinth-2', number: 2, title: '折返庭院',
        storyBeat: '唯一一扇镜门会在背墙前慢速往返。先等它走到轨道端点，再借斜镜完成第二次转折。',
        difficulty: 8, seedSalt: 0x3c9e0202, availableBirdTypes: ['boomerang', 'split'],
        objective: {
          type: 'precision-strike', shotLimit: 5, parScore: 10_500, requiredCollapseRatio: 0.4,
          challenge: challenge('precision-strike', '镜面借力', '先经镜面反弹，再从背面命中两个标记支点。', {
            targetTag: 'rear-support', requiredTaggedBlocks: 2, minimumRicochets: 1, metric: 'tagged-blocks-after-ricochet',
          }),
        },
        encounter: { targetCount: 7, bossVariant: null },
        activeRuleIds: ['mirror-ricochet', 'mirror-shutter'],
        layoutModifiers: [modifier('tower-profile', 'backstop-court'), modifier('moving-mirror-count', 1), modifier('mirror-count', 4), modifier('rear-targets', 4), modifier('ice-ratio', 0.14), modifier('stone-ratio', 0.2)],
      },
      {
        id: 'mirrorwood-labyrinth-3', number: 3, title: '无限回廊',
        storyBeat: '会移动的镜门不断改写可用弹道，过早的倒塌反而会挡住后续角度。',
        difficulty: 9, seedSalt: 0x3c9e0303, availableBirdTypes: ['boomerang', 'red', 'split'],
        objective: {
          type: 'identify-target', shotLimit: 5, parScore: 12_800, requiredCollapseRatio: 0.5,
          challenge: challenge('identify-target', '真影辨识', '假身会在首次撞击后破碎；不浪费橡宝命中假身即完成挑战。', {
            decoyRuleId: 'mirror-false-image', targetKind: 'physical-target', maximumDecoyHits: 0, metric: 'decoy-hits',
          }),
        },
        encounter: { targetCount: 8, bossVariant: null },
        activeRuleIds: ['mirror-ricochet', 'mirror-shutter', 'mirror-false-image'],
        layoutModifiers: [modifier('tower-profile', 'alternating-gates'), modifier('moving-mirror-count', 1), modifier('floor-count', 5), modifier('ice-ratio', 0.16), modifier('stone-ratio', 0.2)],
      },
      {
        id: 'mirrorwood-labyrinth-4', number: 4, title: '棱镜心脏',
        storyBeat: '守门人站在六面镜构成的核心中，只有绕过它自己布下的直线才能命中。',
        difficulty: 10, seedSalt: 0x3c9e0404, availableBirdTypes: ['boomerang', 'red', 'split'],
        objective: { type: 'defeat-boss', shotLimit: 5, parScore: 15_800, bossVariant: 'shield', clearGuards: true },
        encounter: {
          targetCount: 8,
          bossVariant: 'shield',
          bossPhases: [
            bossPhase('split-reflection', '分裂镜影', 0.66, '棱镜核心投出两个新假身，真实身位只在碎光间短暂显露。', ['mirror-false-image'], { additionalDecoys: 2 }),
            bossPhase('prism-overload', '棱镜过载', 0.33, '六面镜板全部发光，反弹保留更多速度。', ['mirror-ricochet'], { restitution: 0.96, revealRealTargetTicks: 36 }),
          ],
        },
        activeRuleIds: ['mirror-ricochet', 'mirror-false-image'],
        layoutModifiers: [modifier('tower-profile', 'hex-prism'), modifier('boss-armor', 2), modifier('mirror-count', 6), modifier('ice-ratio', 0.18), modifier('stone-ratio', 0.24)],
      },
    ],
  },
  {
    id: 'deep-root-fault',
    order: 4,
    title: '地心根脉',
    subtitle: '听见大地断裂前的那一声',
    briefing: {
      recommendedOrder: 4,
      difficulty: { rating: 9, label: '专家+', note: '石材与低顶压缩弹道，需精准穿透与延迟坠落计划。' },
      coreRuleIds: ['root-fault-chain', 'root-rail-cart', 'root-ceiling-fall'],
      enemyPreview: [
        { type: 'burrower', role: '潜地规避直击，需震出地面' },
        { type: 'engineer', role: '修复矿堡，可被脱轨与坠落打断' },
      ],
      materialPalette: ['wood', 'stone', 'ice'],
    },
    story: {
      opening: '主树的根系忽然开始枯黄。地底松鼠把古老根脉挖成了运矿轨道，每一辆满载石块的矿车都在压断王国的呼吸。这里没有远景，只有头顶摇摇欲坠的土层。',
      ending: '最后一辆矿车脱轨后，新生的根须从裂缝里探出。挖掘队留下的坑道被改成地下水道，小松鼠们开始用矿车运送种子，而不是石头。',
    },
    unlock: standardUnlock(),
    theme: {
      colors: {
        skyTop: '#17151d', skyBottom: '#403641', terrain: '#4c3428',
        accent: '#d9a95b', light: '#f3dfae', hazard: '#e66b4e',
      },
      background: {
        id: 'root-cavern-rail',
        layers: ['rock-vignette', 'root-web', 'ore-veins', 'mine-lamps'],
        parameters: { lampSpacing: 140, dustDensity: 0.44, veinGlow: 0.26, vignetteStrength: 0.62 },
      },
    },
    birdTypes: ['drill', 'bomb', 'dash'],
    signatureBird: {
      id: 'drill', name: '钻岩橡宝',
      ability: '飞行中激活会立即收束水平动量，从当前位置高速垂直下钻，最多穿透四块建材，对石块与护甲格外有效。',
      visualCue: '长菱形重甲壳、前端三段钻头和短小稳定翼。',
    },
    enemyVariants: ['burrower', 'engineer'],
    enemyProfiles: {
      burrower: { name: '地道伏兵', behavior: '周期潜入坑道避开直击；震地能把它从地下震出，并延长暴露时间。' },
      engineer: { name: '榫木工匠', behavior: '站稳后引导修复附近建材；先让矿车脱轨或用位移打断其工作。' },
    },
    mapRules: [
      rule('root-fault-chain', 'delayed-collapse', '根系支点受损后进入裂化倒计时，到期时将冲击传给相邻支点。',
        { delayTicks: 48, transferRadius: 72, transferredImpulse: 3.2 }),
      rule('root-rail-cart', 'moving-platform', '两只矿翼搬运飞鼠拉着矿车板高速横越坑道；可直接击破车板，也可击落任一搬运者使其脱轨，坠落后不再推挤建筑。',
        carriedBlocker({ axis: 'horizontal', speed: 2.1, minX: 540, maxX: 1080, derailImpulse: 8.5 })),
      rule('root-ceiling-fall', 'shot-triggered-blocks', '每次发射后会有一组标记顶岩解除静态，成为可利用的落石。',
        { groupSize: 2, wakeDelayTicks: 22, impactDamage: 2 }),
    ],
    stages: [
      {
        id: 'deep-root-fault-1', number: 1, title: '根须缺口',
        storyBeat: '狭窄坑道把正面弹道切碎，钻岩橡宝必须先越过岩脊，再从根墙上方垂直开孔。',
        difficulty: 7, tutorialStage: true, seedSalt: 0x4daf0101, availableBirdTypes: ['drill', 'bomb'],
        tutorialContract: {
          kind: 'vertical-drill-column', signatureBirdType: 'drill',
          instruction: '飞到金色钻点上方再启动，沿同一条垂线贯穿三层高耐久石制根壁。',
          minimumLayers: 3, targetMaterial: 'stone', minimumHp: 8,
          columnTolerance: 2, targetTag: 'root-wall',
          requiredRuleIds: ['root-fault-chain'],
        },
        objective: {
          type: 'precision-strike', shotLimit: 5, parScore: 8_800, requiredCollapseRatio: 0.24,
          challenge: challenge('precision-strike', '垂线穿根', '在根壁上方发动一次垂直钻击，穿过至少两个标记根壁。', {
            targetTag: 'root-wall', requiredTaggedBlocks: 2, withinSingleActivation: true, metric: 'tagged-blocks-per-activation',
          }),
        },
        encounter: { targetCount: 6, bossVariant: null },
        activeRuleIds: ['root-fault-chain'],
        layoutModifiers: [modifier('tower-profile', 'low-ceiling'), modifier('root-wall-count', 3), modifier('critical-supports', 4), modifier('stone-ratio', 0.2)],
      },
      {
        id: 'deep-root-fault-2', number: 2, title: '脱轨时刻',
        storyBeat: '第一组矿翼飞鼠拉着矿车板巡航坑道上方；先看清完整往返，再选择击破车板，或击落一侧搬运者使其脱轨。',
        difficulty: 8, seedSalt: 0x4daf0202, availableBirdTypes: ['drill', 'dash'],
        objective: {
          type: 'ordered-demolition', shotLimit: 5, parScore: 10_800, requiredCollapseRatio: 0.4,
          challenge: challenge('ordered-demolition', '先车后堡', '先使巡逻矿车脱轨，再破坏堡垒中心支柱。', {
            sequence: ['rail-cart', 'center-support'], metric: 'prop-and-support-order',
          }),
        },
        encounter: { targetCount: 7, bossVariant: null },
        activeRuleIds: ['root-fault-chain', 'root-rail-cart'],
        layoutModifiers: [modifier('tower-profile', 'rail-supported'), modifier('cart-count', 1), modifier('elevated-targets', 5), modifier('stone-ratio', 0.18)],
      },
      {
        id: 'deep-root-fault-3', number: 3, title: '头顶的答案',
        storyBeat: '矿堡的地基无法正面击穿，但每次发射都在唤醒一层顶岩。',
        difficulty: 9, seedSalt: 0x4daf0303, availableBirdTypes: ['drill', 'bomb', 'dash'],
        objective: {
          type: 'score-rush', shotLimit: 5, parScore: 13_200, requiredCollapseRatio: 0.58,
          challenge: challenge('score-rush', '落石连锁', '在五发内用顶岩造成两次连锁坠落并达到标准分。', {
            targetScore: 13_200, withinShots: 5, minimumCollapseChains: 2, metric: 'stage-score-and-collapse-chains',
          }),
        },
        encounter: { targetCount: 8, bossVariant: null },
        activeRuleIds: ['root-fault-chain', 'root-ceiling-fall'],
        layoutModifiers: [modifier('tower-profile', 'armored-bunker'), modifier('ceiling-group-count', 4), modifier('stone-ratio', 0.46)],
      },
      {
        id: 'deep-root-fault-4', number: 4, title: '监工末班车',
        storyBeat: '监工的重甲平台在三条轨道间换线，整片顶岩已经开始松动。',
        difficulty: 10, seedSalt: 0x4daf0404, availableBirdTypes: ['drill', 'bomb', 'dash'],
        objective: { type: 'defeat-boss', shotLimit: 5, parScore: 16_200, bossVariant: 'burrower', clearGuards: true },
        encounter: {
          targetCount: 8,
          bossVariant: 'burrower',
          bossPhases: [
            bossPhase('switch-track', '换轨潜行', 0.66, '监工钻入中层轨道，矿车改变巡航方向。', ['root-rail-cart'], { switchTrackOnTurn: true, cartSpeedScale: 1.2 }),
            bossPhase('cave-in', '全域塌方', 0.33, '顶岩警示纹连成一片，每发都会唤醒额外落石。', ['root-ceiling-fall', 'root-fault-chain'], { ceilingGroupSize: 3, faultDelayTicks: 32 }),
          ],
        },
        activeRuleIds: ['root-fault-chain', 'root-rail-cart', 'root-ceiling-fall'],
        layoutModifiers: [modifier('tower-profile', 'switchyard-fort'), modifier('boss-armor', 4), modifier('cart-count', 3), modifier('stone-ratio', 0.25)],
      },
    ],
  },
  {
    id: 'stormline-skyport',
    order: 5,
    title: '雷云航站',
    subtitle: '在没有地面的地方打一场攻坚战',
    briefing: {
      recommendedOrder: 5,
      difficulty: { rating: 10, label: '大师', note: '建议完成其他秘境后挑战；风场、断缆与雷击会同时改写局面。' },
      coreRuleIds: ['storm-updraft', 'storm-cable-anchor', 'storm-lightning-pulse'],
      enemyPreview: [
        { type: 'glider', role: '空中巡航，命中窗口短' },
        { type: 'engineer', role: '修复悬空锚点，需用位移打断' },
      ],
      materialPalette: ['wood', 'stone', 'ice'],
    },
    story: {
      opening: '春天的第一封远方来信从云里掉下来：空中邮路被飞鼠解缆队占领，一整座航站被钢索悬在雷暴眼中。橡宝的弹射器被绑上了热气球，每一次后坐都会让云层摇晃。',
      ending: '共振核停转时，整座航站没有坠落，而是被剩下的钢索缓缓放到山巅。邮路重开，第一个包裹里是一枚献给“会飞的橡果”的纸风筝。',
    },
    unlock: standardUnlock(),
    theme: {
      colors: {
        skyTop: '#28315f', skyBottom: '#9aa9d4', terrain: '#525f78',
        accent: '#ffe66f', light: '#f7fbff', hazard: '#ff5f78',
      },
      background: {
        id: 'thunderhead-skyport',
        layers: ['high-clouds', 'storm-wall', 'distant-airships', 'lightning-veins'],
        parameters: { cloudSpeed: 0.36, lightningIntervalTicks: 210, depthFog: 0.3, airshipParallax: 0.18 },
      },
    },
    birdTypes: ['quake', 'dash', 'bomb'],
    signatureBird: {
      id: 'quake', name: '震地橡宝',
      ability: '飞行中激活会收拢叶翼垂直下坠，落地或命中建材时放出传向钢索锚点与支撑链的短程震波。',
      visualCue: '宽矮方橡壳、岩层状重冠和底部两枚撞锤足。',
    },
    enemyVariants: ['glider', 'engineer'],
    enemyProfiles: {
      glider: { name: '飞膜斥候', behavior: '在上升气流间波浪巡航，并在两端短暂停顿；冰冻可显著扩大命中窗口。' },
      engineer: { name: '榫木工匠', behavior: '站稳后引导修复附近建材；雷击、坠落与震波造成的位移都能打断。' },
    },
    mapRules: [
      rule('storm-updraft', 'wind-zone', '三条可视上升气流对橡果、松鼠和脱落方块施加向上加速度。',
        { lanes: 3, accelerationY: -0.18, width: 82, pulsePeriodTicks: 96 }),
      rule('storm-cable-anchor', 'breakable-support', '悬空平台由两个可破坏钢索锚点维持，单侧断裂后平台会旋转下坠。',
        { anchorsPerPlatform: 2, anchorHp: 3, cableLength: 118, oneAnchorAngularImpulse: 0.045 }),
      rule('storm-lightning-pulse', 'timed-impulse', '闪电按固定间隔命中发光的避雷建材，并交替施加左右冲量。',
        { intervalTicks: 300, warningTicks: 36, impulse: 5.4, polarityTicks: 90 }),
    ],
    stages: [
      {
        id: 'stormline-skyport-1', number: 1, title: '云间货台',
        storyBeat: '第一批飞鼠把货箱叠在上升气流之间，落下的方块不一定会落地。',
        difficulty: 8, tutorialStage: true, seedSalt: 0x5eb00101, availableBirdTypes: ['quake', 'dash'],
        tutorialContract: {
          kind: 'quake-drop-zone', signatureBirdType: 'quake',
          instruction: '先高抛越过云廊，再对准两座发光锚点中间俯冲，一次震波同时命中两处支撑链。',
          minimumAnchors: 2, shockRadius: 130, minimumDropHeight: 180,
          corridorWidth: 60, targetTag: 'tutorial-shock-anchor',
          requiredRuleIds: ['storm-updraft', 'storm-cable-anchor'],
        },
        objective: { type: 'eliminate-all', shotLimit: 5, parScore: 9_500, requiredCollapseRatio: 0.24 },
        encounter: { targetCount: 6, bossVariant: null },
        activeRuleIds: ['storm-updraft', 'storm-cable-anchor'],
        layoutModifiers: [modifier('tower-profile', 'quake-training-span'), modifier('platform-count', 0), modifier('metal-ratio', 0.35)],
      },
      {
        id: 'stormline-skyport-2', number: 2, title: '断缆风廊',
        storyBeat: '首关的静态锚点现在托起三座慢速悬台。先看清三条轨迹的错峰，再按对角顺序断缆。',
        difficulty: 8, seedSalt: 0x5eb00202, availableBirdTypes: ['quake', 'bomb'],
        objective: {
          type: 'precision-strike', shotLimit: 5, parScore: 11_500, requiredCollapseRatio: 0.42,
          challenge: challenge('precision-strike', '对角断缆', '只切断左上与右下两枚标记锚点，使风廊朝敌人方向旋转。', {
            targetTag: 'cable-anchor-diagonal', requiredTaggedBlocks: 2, maximumAnchorBreaks: 2, metric: 'tagged-anchor-precision',
          }),
        },
        encounter: { targetCount: 7, bossVariant: null },
        activeRuleIds: ['storm-updraft', 'storm-cable-anchor'],
        layoutModifiers: [modifier('tower-profile', 'cable-bridge'), modifier('platform-count', 3), modifier('anchor-count', 6), modifier('critical-supports', 3), modifier('stone-ratio', 0.22)],
      },
      {
        id: 'stormline-skyport-3', number: 3, title: '雷暴眼中',
        storyBeat: '闪电周期与上升气流错峰，震地橡宝要把落石送进下一个共振场。',
        difficulty: 9, seedSalt: 0x5eb00303, availableBirdTypes: ['quake', 'dash', 'bomb'],
        objective: {
          type: 'score-rush', shotLimit: 5, parScore: 14_000, requiredCollapseRatio: 0.58,
          challenge: challenge('score-rush', '两次雷鸣', '在第二次雷击脉冲前制造连锁倒塌并达到标准分。', {
            targetScore: 14_000, deadlineRuleId: 'storm-lightning-pulse', deadlinePulses: 2, metric: 'stage-score-before-rule-pulses',
          }),
        },
        encounter: { targetCount: 8, bossVariant: null },
        activeRuleIds: ['storm-updraft', 'storm-lightning-pulse'],
        layoutModifiers: [modifier('tower-profile', 'storm-ring'), modifier('platform-count', 0), modifier('lightning-rods', 5)],
      },
      {
        id: 'stormline-skyport-4', number: 4, title: '引雷舰桥',
        storyBeat: '舰长把自己锁在巨型避雷针下，整座舰桥只靠四根交叉钢索悬空。',
        difficulty: 10, seedSalt: 0x5eb00404, availableBirdTypes: ['quake', 'dash', 'bomb'],
        objective: { type: 'defeat-boss', shotLimit: 5, parScore: 17_500, bossVariant: 'glider', clearGuards: true },
        encounter: {
          targetCount: 9,
          bossVariant: 'glider',
          bossPhases: [
            bossPhase('crosswind-dive', '交叉俯冲', 0.66, '舰长收翼俯冲，上升气流开始交替脉冲。', ['storm-updraft'], { gliderDiveEveryTicks: 150, alternateUpdraftLanes: true }),
            bossPhase('overcharge-bridge', '舰桥过载', 0.33, '交叉钢索全部带电，雷击脉冲更快但会暴露锚点。', ['storm-lightning-pulse', 'storm-cable-anchor'], { lightningIntervalTicks: 150, exposeAnchorsOnPulseTicks: 42 }),
          ],
        },
        activeRuleIds: ['storm-updraft', 'storm-cable-anchor', 'storm-lightning-pulse'],
        layoutModifiers: [modifier('tower-profile', 'suspended-bridge'), modifier('platform-count', 2), modifier('boss-armor', 4), modifier('anchor-count', 4), modifier('stone-ratio', 0.25)],
      },
    ],
  },
]

export const SPECIAL_CAMPAIGNS = deepFreeze(CAMPAIGNS)
export const SPECIAL_CAMPAIGN_IDS = deepFreeze(SPECIAL_CAMPAIGNS.map((campaign) => campaign.id))
export const SPECIAL_STAGE_IDS = deepFreeze(SPECIAL_CAMPAIGNS.flatMap((campaign) => (
  campaign.stages.map((stage) => stage.id)
)))
export const SPECIAL_STAGE_TOTAL = SPECIAL_STAGE_IDS.length

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateUniqueSlugList(value, path, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    addError(errors, path, 'must be a non-empty array')
    return
  }
  const seen = new Set()
  value.forEach((item, index) => {
    if (!nonEmptyString(item) || !SLUG_PATTERN.test(item)) addError(errors, `${path}[${index}]`, 'must be a kebab-case id')
    if (seen.has(item)) addError(errors, `${path}[${index}]`, 'must be unique')
    seen.add(item)
  })
}

function validateTheme(theme, path, errors) {
  if (!isRecord(theme)) {
    addError(errors, path, 'must be an object')
    return
  }
  const requiredColors = ['skyTop', 'skyBottom', 'terrain', 'accent', 'light', 'hazard']
  for (const key of requiredColors) {
    if (!HEX_COLOR_PATTERN.test(theme.colors?.[key] ?? '')) addError(errors, `${path}.colors.${key}`, 'must be a six-digit hex color')
  }
  if (!nonEmptyString(theme.background?.id)) addError(errors, `${path}.background.id`, 'is required')
  if (!Array.isArray(theme.background?.layers) || theme.background.layers.length < 3) {
    addError(errors, `${path}.background.layers`, 'must define at least three parallax layers')
  }
  if (!isRecord(theme.background?.parameters) || Object.keys(theme.background.parameters).length === 0) {
    addError(errors, `${path}.background.parameters`, 'must define render parameters')
  }
}

function validateBriefing(briefing, campaign, path, errors) {
  if (!isRecord(briefing)) {
    addError(errors, path, 'must be an object')
    return
  }
  if (briefing.recommendedOrder !== campaign.order) {
    addError(errors, `${path}.recommendedOrder`, 'must match campaign order')
  }
  if (!Number.isInteger(briefing.difficulty?.rating)
    || briefing.difficulty.rating < 1 || briefing.difficulty.rating > 10) {
    addError(errors, `${path}.difficulty.rating`, 'must be an integer from 1 to 10')
  }
  for (const key of ['label', 'note']) {
    if (!nonEmptyString(briefing.difficulty?.[key])) addError(errors, `${path}.difficulty.${key}`, 'is required')
  }
  validateUniqueSlugList(briefing.coreRuleIds, `${path}.coreRuleIds`, errors)
  const campaignRuleIds = new Set(Array.isArray(campaign.mapRules)
    ? campaign.mapRules.map((entry) => entry?.id)
    : [])
  for (const ruleId of Array.isArray(briefing.coreRuleIds) ? briefing.coreRuleIds : []) {
    if (!campaignRuleIds.has(ruleId)) addError(errors, `${path}.coreRuleIds`, `${ruleId} does not exist in mapRules`)
  }
  if (!Array.isArray(briefing.enemyPreview) || briefing.enemyPreview.length !== campaign.enemyVariants?.length) {
    addError(errors, `${path}.enemyPreview`, 'must preview every campaign enemy variant')
  } else {
    const previewedTypes = new Set()
    briefing.enemyPreview.forEach((preview, index) => {
      if (!isRecord(preview) || !campaign.enemyVariants.includes(preview.type) || !nonEmptyString(preview.role)) {
        addError(errors, `${path}.enemyPreview[${index}]`, 'must reference a campaign enemy and describe its role')
      }
      previewedTypes.add(preview?.type)
    })
    for (const enemyType of campaign.enemyVariants) {
      if (!previewedTypes.has(enemyType)) addError(errors, `${path}.enemyPreview`, `missing ${enemyType}`)
    }
  }
  validateUniqueSlugList(briefing.materialPalette, `${path}.materialPalette`, errors)
}

function validateTutorialContract(contract, stage, campaign, path, errors) {
  if (!isRecord(contract)) {
    addError(errors, path, 'must be an object on the first stage')
    return
  }
  if (!SLUG_PATTERN.test(contract.kind ?? '')) addError(errors, `${path}.kind`, 'must be a kebab-case id')
  if (contract.signatureBirdType !== campaign.signatureBird?.id
    || !Array.isArray(stage.availableBirdTypes)
    || !stage.availableBirdTypes.includes(contract.signatureBirdType)) {
    addError(errors, `${path}.signatureBirdType`, 'must match the campaign signature bird and be available')
  }
  if (!nonEmptyString(contract.instruction)) addError(errors, `${path}.instruction`, 'is required')
  validateUniqueSlugList(contract.requiredRuleIds, `${path}.requiredRuleIds`, errors)
  for (const ruleId of Array.isArray(contract.requiredRuleIds) ? contract.requiredRuleIds : []) {
    if (!stage.activeRuleIds?.includes(ruleId)) {
      addError(errors, `${path}.requiredRuleIds`, `${ruleId} must be active in the tutorial stage`)
    }
  }
}

function validateStage(stage, campaign, stageIndex, errors) {
  const path = `campaigns[${campaign.order - 1}].stages[${stageIndex}]`
  if (!isRecord(stage)) {
    addError(errors, path, 'must be an object')
    return
  }
  if (stage.number !== stageIndex + 1) addError(errors, `${path}.number`, 'must be consecutive and one-based')
  if (!nonEmptyString(stage.id) || !SLUG_PATTERN.test(stage.id) || !stage.id.startsWith(`${campaign.id}-`)) {
    addError(errors, `${path}.id`, 'must be a campaign-prefixed kebab-case id')
  }
  for (const key of ['title', 'storyBeat']) {
    if (!nonEmptyString(stage[key])) addError(errors, `${path}.${key}`, 'is required')
  }
  if (!Number.isInteger(stage.difficulty) || stage.difficulty < 7 || stage.difficulty > 10) {
    addError(errors, `${path}.difficulty`, 'must be an integer from 7 to 10')
  }
  if (!Number.isSafeInteger(stage.seedSalt) || stage.seedSalt <= 0 || stage.seedSalt > 0xffff_ffff) {
    addError(errors, `${path}.seedSalt`, 'must be a positive uint32')
  }
  if ((stageIndex === 0) !== (stage.tutorialStage === true)) {
    addError(errors, `${path}.tutorialStage`, 'must be true only for the first stage')
  }
  validateUniqueSlugList(stage.availableBirdTypes, `${path}.availableBirdTypes`, errors)
  const availableBirdTypes = Array.isArray(stage.availableBirdTypes) ? stage.availableBirdTypes : []
  const campaignBirdTypes = Array.isArray(campaign.birdTypes) ? campaign.birdTypes : []
  for (const birdType of availableBirdTypes) {
    if (!campaignBirdTypes.includes(birdType)) addError(errors, `${path}.availableBirdTypes`, `${birdType} is not in campaign birdTypes`)
  }
  const objective = stage.objective
  if (!isRecord(objective) || !OBJECTIVE_TYPES.has(objective.type)) addError(errors, `${path}.objective.type`, 'is unsupported')
  if (!Number.isInteger(objective?.shotLimit) || objective.shotLimit < 1 || objective.shotLimit > 8) {
    addError(errors, `${path}.objective.shotLimit`, 'must be an integer from 1 to 8')
  }
  if (!Number.isSafeInteger(objective?.parScore) || objective.parScore <= 0) addError(errors, `${path}.objective.parScore`, 'must be positive')
  if (stageIndex === 0 && objective?.shotLimit < 5
    && Number(objective?.requiredCollapseRatio || 0) > 0.3) {
    addError(errors, `${path}.objective`, 'tutorial stage must grant five shots or require at most 30% collapse')
  }
  if (CHALLENGE_OBJECTIVE_TYPES.has(objective?.type)) {
    if (!isRecord(objective.challenge) || objective.challenge.kind !== objective.type) {
      addError(errors, `${path}.objective.challenge.kind`, 'must match the authored challenge objective type')
    }
    for (const key of ['label', 'description']) {
      if (!nonEmptyString(objective.challenge?.[key])) addError(errors, `${path}.objective.challenge.${key}`, 'is required')
    }
    if (objective.challenge?.requiredForClear !== false) {
      addError(errors, `${path}.objective.challenge.requiredForClear`, 'must remain false until runtime enforcement is integrated')
    }
    if (!isRecord(objective.challenge?.parameters) || Object.keys(objective.challenge.parameters).length < 2) {
      addError(errors, `${path}.objective.challenge.parameters`, 'must define a machine-readable metric and requirement')
    }
  }
  const enemyVariants = Array.isArray(campaign.enemyVariants) ? campaign.enemyVariants : []
  if (objective?.type === 'defeat-boss' && !enemyVariants.includes(objective.bossVariant)) {
    addError(errors, `${path}.objective.bossVariant`, 'must reference a campaign enemy variant')
  }
  if (!Number.isInteger(stage.encounter?.targetCount) || stage.encounter.targetCount < 1) {
    addError(errors, `${path}.encounter.targetCount`, 'must be positive')
  }
  validateUniqueSlugList(stage.activeRuleIds, `${path}.activeRuleIds`, errors)
  const mapRules = Array.isArray(campaign.mapRules) ? campaign.mapRules : []
  const campaignRuleIds = new Set(mapRules.map((entry) => entry?.id))
  const activeRuleIds = Array.isArray(stage.activeRuleIds) ? stage.activeRuleIds : []
  for (const ruleId of activeRuleIds) {
    if (!campaignRuleIds.has(ruleId)) addError(errors, `${path}.activeRuleIds`, `${ruleId} does not exist in mapRules`)
  }
  if (stageIndex === 0) {
    validateTutorialContract(stage.tutorialContract, stage, campaign, `${path}.tutorialContract`, errors)
  } else if (stage.tutorialContract !== undefined) {
    addError(errors, `${path}.tutorialContract`, 'is only valid for the first stage')
  }
  const bossPhases = stage.encounter?.bossPhases
  if (objective?.type === 'defeat-boss') {
    if (!Array.isArray(bossPhases) || bossPhases.length < 2) {
      addError(errors, `${path}.encounter.bossPhases`, 'must define at least two boss phases')
    } else {
      let previousThreshold = 1
      const phaseIds = new Set()
      bossPhases.forEach((phase, index) => {
        const phasePath = `${path}.encounter.bossPhases[${index}]`
        if (!isRecord(phase) || !SLUG_PATTERN.test(phase?.id ?? '') || !nonEmptyString(phase?.name)
          || !nonEmptyString(phase?.telegraph)) {
          addError(errors, phasePath, 'must define id, name, and telegraph')
        }
        if (phaseIds.has(phase?.id)) addError(errors, `${phasePath}.id`, 'must be unique')
        phaseIds.add(phase?.id)
        if (!Number.isFinite(phase?.hpThreshold) || phase.hpThreshold <= 0
          || phase.hpThreshold >= previousThreshold) {
          addError(errors, `${phasePath}.hpThreshold`, 'must be between 0 and the previous phase threshold')
        }
        previousThreshold = phase?.hpThreshold
        validateUniqueSlugList(phase?.activateRuleIds, `${phasePath}.activateRuleIds`, errors)
        for (const ruleId of Array.isArray(phase?.activateRuleIds) ? phase.activateRuleIds : []) {
          if (!activeRuleIds.includes(ruleId)) addError(errors, `${phasePath}.activateRuleIds`, `${ruleId} must be active in this stage`)
        }
        if (!isRecord(phase?.changes) || Object.keys(phase.changes).length === 0) {
          addError(errors, `${phasePath}.changes`, 'must define at least one rule change')
        }
      })
    }
  } else if (bossPhases !== undefined) {
    addError(errors, `${path}.encounter.bossPhases`, 'is only valid for boss stages')
  }
  if (!Array.isArray(stage.layoutModifiers) || stage.layoutModifiers.length < 3) {
    addError(errors, `${path}.layoutModifiers`, 'must contain at least three layout controls')
  } else {
    const modifierKinds = new Set()
    stage.layoutModifiers.forEach((entry, index) => {
      if (!isRecord(entry) || !nonEmptyString(entry.kind) || entry.value === undefined) {
        addError(errors, `${path}.layoutModifiers[${index}]`, 'must define kind and value')
      }
      if (modifierKinds.has(entry?.kind)) addError(errors, `${path}.layoutModifiers[${index}].kind`, 'must be unique per stage')
      modifierKinds.add(entry?.kind)
    })
  }
}

export function validateSpecialCampaigns(value = SPECIAL_CAMPAIGNS) {
  const errors = []
  if (!Array.isArray(value)) {
    return deepFreeze({ valid: false, errors: ['campaigns: must be an array'] })
  }
  if (value.length !== SPECIAL_CAMPAIGN_COUNT) {
    addError(errors, 'campaigns', `must contain exactly ${SPECIAL_CAMPAIGN_COUNT} campaigns`)
  }
  const campaignIds = new Set()
  const stageIds = new Set()
  value.forEach((campaign, campaignIndex) => {
    const path = `campaigns[${campaignIndex}]`
    if (!isRecord(campaign)) {
      addError(errors, path, 'must be an object')
      return
    }
    if (!nonEmptyString(campaign.id) || !SLUG_PATTERN.test(campaign.id)) addError(errors, `${path}.id`, 'must be a kebab-case id')
    if (campaignIds.has(campaign.id)) addError(errors, `${path}.id`, 'must be unique')
    campaignIds.add(campaign.id)
    if (campaign.order !== campaignIndex + 1) addError(errors, `${path}.order`, 'must be consecutive and one-based')
    for (const key of ['title', 'subtitle']) {
      if (!nonEmptyString(campaign[key])) addError(errors, `${path}.${key}`, 'is required')
    }
    if (!nonEmptyString(campaign.story?.opening) || !nonEmptyString(campaign.story?.ending)) {
      addError(errors, `${path}.story`, 'must define opening and ending copy')
    }
    if (campaign.unlock?.kind !== 'main-complete'
      || campaign.unlock?.requiredMainLevel !== SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL
      || !Array.isArray(campaign.unlock?.prerequisiteCampaignIds)
      || campaign.unlock.prerequisiteCampaignIds.length !== 0) {
      addError(errors, `${path}.unlock`, 'must unlock independently after the complete main campaign')
    }
    validateTheme(campaign.theme, `${path}.theme`, errors)
    validateUniqueSlugList(campaign.birdTypes, `${path}.birdTypes`, errors)
    if (!Array.isArray(campaign.birdTypes) || !campaign.birdTypes.includes(campaign.signatureBird?.id)) {
      addError(errors, `${path}.signatureBird.id`, 'must be in birdTypes')
    }
    for (const key of ['name', 'ability', 'visualCue']) {
      if (!nonEmptyString(campaign.signatureBird?.[key])) addError(errors, `${path}.signatureBird.${key}`, 'is required')
    }
    validateUniqueSlugList(campaign.enemyVariants, `${path}.enemyVariants`, errors)
    const enemyVariants = Array.isArray(campaign.enemyVariants) ? campaign.enemyVariants : []
    for (const enemyVariant of enemyVariants) {
      if (!nonEmptyString(campaign.enemyProfiles?.[enemyVariant]?.name)
        || !nonEmptyString(campaign.enemyProfiles?.[enemyVariant]?.behavior)) {
        addError(errors, `${path}.enemyProfiles.${enemyVariant}`, 'must define name and behavior')
      }
    }
    if (!Array.isArray(campaign.mapRules) || campaign.mapRules.length < 3) {
      addError(errors, `${path}.mapRules`, 'must contain at least three rules')
    } else {
      const ruleIds = new Set()
      campaign.mapRules.forEach((entry, index) => {
        if (!isRecord(entry) || !SLUG_PATTERN.test(entry?.id ?? '') || !nonEmptyString(entry?.kind)
          || !nonEmptyString(entry?.description) || !isRecord(entry?.parameters)) {
          addError(errors, `${path}.mapRules[${index}]`, 'must define id, kind, description, and parameters')
        }
        if (ruleIds.has(entry?.id)) addError(errors, `${path}.mapRules[${index}].id`, 'must be unique')
        ruleIds.add(entry?.id)
      })
    }
    validateBriefing(campaign.briefing, campaign, `${path}.briefing`, errors)
    if (!Array.isArray(campaign.stages) || campaign.stages.length !== SPECIAL_STAGE_COUNT_PER_CAMPAIGN) {
      addError(errors, `${path}.stages`, `must contain exactly ${SPECIAL_STAGE_COUNT_PER_CAMPAIGN} stages`)
      return
    }
    if (new Set(campaign.stages.map((stage) => stage?.objective?.type)).size < 3) {
      addError(errors, `${path}.stages`, 'must contain at least three distinct objective types')
    }
    campaign.stages.forEach((stage, stageIndex) => {
      validateStage(stage, campaign, stageIndex, errors)
      if (stageIds.has(stage?.id)) addError(errors, `${path}.stages[${stageIndex}].id`, 'must be globally unique')
      stageIds.add(stage?.id)
    })
  })
  return deepFreeze({ valid: errors.length === 0, errors })
}

export function getSpecialCampaign(campaignId) {
  if (typeof campaignId !== 'string') return null
  return SPECIAL_CAMPAIGNS.find((campaign) => campaign.id === campaignId) ?? null
}

export function getSpecialStage(campaignId, stageReference) {
  const campaign = getSpecialCampaign(campaignId)
  if (!campaign) return null
  if (Number.isSafeInteger(stageReference)) {
    return campaign.stages[stageReference - 1] ?? null
  }
  if (typeof stageReference !== 'string') return null
  return campaign.stages.find((stage) => stage.id === stageReference) ?? null
}

function clearedMainLevel(progress) {
  if (!isRecord(progress)) return 0
  if (progress.mainCompleted === true || progress.mainCleared === true) return SPECIAL_CAMPAIGN_REQUIRED_MAIN_LEVEL
  const level = Number(progress.highestClearedMainLevel)
  return Number.isSafeInteger(level) && level > 0 ? level : 0
}

export function isSpecialCampaignUnlocked(campaignId, progress = {}) {
  const campaign = getSpecialCampaign(campaignId)
  if (!campaign) return false
  return clearedMainLevel(progress) >= campaign.unlock.requiredMainLevel
}

export function listUnlockedSpecialCampaigns(progress = {}) {
  return Object.freeze(SPECIAL_CAMPAIGNS.filter((campaign) => (
    isSpecialCampaignUnlocked(campaign.id, progress)
  )))
}

function uint32(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new TypeError('runSeed must be a finite number')
  return Math.trunc(number) >>> 0
}

function hashString(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

function avalanche(value) {
  let mixed = value >>> 0
  mixed ^= mixed >>> 16
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0
  mixed ^= mixed >>> 15
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0
  mixed ^= mixed >>> 16
  return mixed >>> 0 || 1
}

export function specialStageSeed(campaignId, stageReference, runSeed = 1) {
  const stage = getSpecialStage(campaignId, stageReference)
  if (!stage) throw new RangeError(`Unknown special stage: ${campaignId}/${stageReference}`)
  return avalanche(uint32(runSeed) ^ hashString(campaignId) ^ hashString(stage.id) ^ stage.seedSalt)
}

const builtInValidation = validateSpecialCampaigns(SPECIAL_CAMPAIGNS)
if (!builtInValidation.valid) {
  throw new Error(`Invalid built-in special campaign data:\n${builtInValidation.errors.join('\n')}`)
}
