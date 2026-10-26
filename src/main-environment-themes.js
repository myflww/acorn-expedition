// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

/**
 * Render-ready art direction for the eighteen main-campaign environments.
 *
 * This module deliberately contains no canvas or game-state dependencies. A
 * renderer can consume the colors, layered elements and architecture metadata
 * directly, while level generation can separately use the material bias and
 * rule cues without creating a game-core <-> presentation dependency.
 */

export const MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION = 1
export const MAIN_ENVIRONMENT_THEME_COUNT = 18

const BOSS_LEVELS = Object.freeze([6, 12, 17, 18])
const STORY_LEVELS = Object.freeze([1, 4, 6, 7, 10, 12, 13, 16, 17, 18])
const MATERIAL_KEYS = Object.freeze(['wood', 'ice', 'stone'])
const PALETTE_KEYS = Object.freeze([
  'skyTop',
  'skyBottom',
  'horizonGlow',
  'mountainFar',
  'mountainNear',
  'groundRim',
  'groundGrass',
  'groundSoil',
  'ambient',
  'accent',
])
const ELEMENT_LAYERS = new Set(['far', 'middle', 'near', 'foreground'])
const HINT_PRIORITIES = new Set(['ambient', 'gameplay', 'boss'])
const HEX_COLOR = /^#[0-9a-f]{6}$/iu

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function element(kind, label, layer, color, options = {}) {
  return {
    kind,
    label,
    layer,
    color,
    opacity: options.opacity ?? 1,
    density: options.density ?? 0.5,
    parallax: options.parallax ?? 0.2,
    scale: options.scale ?? 1,
    motion: options.motion ?? 0,
  }
}

function hint(id, label, description, cue, priority = 'gameplay') {
  return { id, label, description, cue, priority }
}

function theme(config) {
  return {
    schemaVersion: MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION,
    storyNode: STORY_LEVELS.includes(config.level),
    bossNode: BOSS_LEVELS.includes(config.level),
    ...config,
  }
}

export const MAIN_ENVIRONMENT_THEMES = deepFreeze([
  theme({
    id: 'granary-moonfall', level: 1,
    chapterName: '序章 · 失窃之夜', sceneName: '粮仓月落',
    palette: {
      skyTop: '#18213a', skyBottom: '#59647a', horizonGlow: '#d9d0ae',
      mountainFar: '#34435a', mountainNear: '#293c45', groundRim: '#62744f',
      groundGrass: '#445e3e', groundSoil: '#4d3528', ambient: '#e8dfc1', accent: '#d9aa58',
    },
    weather: { kind: 'frost-night', label: '初霜寒夜', intensity: 0.24, windVisual: 0.04, ambientMotion: 0.12 },
    environmentElements: [
      element('crescent-moon', '象牙色弯月', 'far', '#eee6cf', { opacity: 0.82, density: 0.08, parallax: 0.02, scale: 0.8 }),
      element('oak-ridge', '橡树村屋脊', 'middle', '#263d3b', { opacity: 0.88, density: 0.56, parallax: 0.12 }),
      element('frost-motes', '粮仓霜尘', 'near', '#f3ebd0', { opacity: 0.34, density: 0.32, parallax: 0.42, scale: 0.55, motion: 0.08 }),
    ],
    architecture: {
      style: '橡树村粮仓', scale: 0.28, fortification: 0.08,
      silhouette: '低矮木仓、草绳门架与被搬空的橡果篮。',
      materialBias: { wood: 0.9, ice: 0.07, stone: 0.03 },
      motifs: ['空粮篮', '断绳', '长老灯火'],
      realmLayer: 'oakheart-home',
      description: '建筑应像临时被掠过的家园，结构简单、弱点直白，为第一次拖拽教学留出干净弹道。',
      bossArena: null,
    },
    narrative: {
      summary: '月光照着被搬空的粮仓，玩家从王国最熟悉、也最脆弱的地方出发。',
      continuity: '寒冬尚未降临，霜尘和冷色月光先预告了粮食失窃的后果。',
    },
    ruleHints: [hint('clean-drag', '第一条弹道', '场景不用大风或移动机关分散注意力。', '霜尘沿预计抛物线缓慢漂移。', 'ambient')],
  }),
  theme({
    id: 'moonlit-cart-trail', level: 2,
    chapterName: '序章 · 失窃之夜', sceneName: '月下车辙',
    palette: {
      skyTop: '#1e2942', skyBottom: '#68738a', horizonGlow: '#d7cba8',
      mountainFar: '#3c4b61', mountainNear: '#30484b', groundRim: '#66794e',
      groundGrass: '#49613d', groundSoil: '#513827', ambient: '#ddd7bc', accent: '#d4964e',
    },
    weather: { kind: 'cold-mist', label: '月下薄雾', intensity: 0.3, windVisual: 0.08, ambientMotion: 0.16 },
    environmentElements: [
      element('moon-clouds', '掠月薄云', 'far', '#c8cad0', { opacity: 0.24, density: 0.28, parallax: 0.04, motion: 0.06 }),
      element('cart-ruts', '湿土车辙', 'foreground', '#35261f', { opacity: 0.72, density: 0.48, parallax: 0.82, scale: 0.9 }),
      element('lantern-stumps', '追踪路灯', 'near', '#dfad59', { opacity: 0.68, density: 0.2, parallax: 0.5, scale: 0.7 }),
    ],
    architecture: {
      style: '林缘转运架', scale: 0.32, fortification: 0.12,
      silhouette: '松枝搭成的两层临时仓架，底层留有匆忙掩盖的车辙。',
      materialBias: { wood: 0.86, ice: 0.09, stone: 0.05 },
      motifs: ['松枝车棚', '橡果袋', '临时瞭望梯'], realmLayer: 'oakheart-border',
      description: '保留村落木构语言，但开始出现松鼠军团的标识和第一批竖直支撑。', bossArena: null,
    },
    narrative: {
      summary: '车辙将远征引向王国边缘，还能望见家园的灯，但粮车已进入黑松林。',
      continuity: '夜色仍与第一关相连，地面道具开始明确指向东侧边境。',
    },
    ruleHints: [hint('support-preview', '第一处支点', '用深色绑绳强调低层支柱。', '绑绳会在拉弓时轻微摇动。')],
  }),
  theme({
    id: 'dawn-pine-slope', level: 3,
    chapterName: '序章 · 失窃之夜', sceneName: '破晓松坡',
    palette: {
      skyTop: '#586a86', skyBottom: '#d3a66c', horizonGlow: '#f2d59a',
      mountainFar: '#6c7480', mountainNear: '#40584f', groundRim: '#748653',
      groundGrass: '#526c42', groundSoil: '#5c3d29', ambient: '#ead6ad', accent: '#bf7142',
    },
    weather: { kind: 'dawn-haze', label: '破晓山岚', intensity: 0.34, windVisual: 0.14, ambientMotion: 0.2 },
    environmentElements: [
      element('sunrise-band', '金色日出带', 'far', '#f4cf88', { opacity: 0.54, density: 0.16, parallax: 0.02, scale: 1.2 }),
      element('pine-slope', '黑松斜坡', 'middle', '#324b43', { opacity: 0.9, density: 0.68, parallax: 0.16 }),
      element('track-dust', '车辙尘粒', 'near', '#d6b883', { opacity: 0.27, density: 0.38, parallax: 0.46, scale: 0.6, motion: 0.12 }),
    ],
    architecture: {
      style: '山坡路卡', scale: 0.38, fortification: 0.18,
      silhouette: '依山势错开的木架和短墙，第一次让高低差参与构图。',
      materialBias: { wood: 0.8, ice: 0.1, stone: 0.1 },
      motifs: ['坡道短墙', '粮车轮', '山口方向牌'], realmLayer: 'oakheart-border',
      description: '从临时搬运点过渡到有防守意图的路卡，为风峡的高塔剪影做铺垫。', bossArena: null,
    },
    narrative: {
      summary: '天将亮时，车辙在山坡分成了多条假路，真正的粮车已靠近风峡。',
      continuity: '暖色天光不代表危机过去，远山上第一座松鼠瞭望塔已经出现。',
    },
    ruleHints: [hint('height-reading', '坡势预演', '用地形剪影教玩家提前阅读高低弹道。', '车辙尘向峡口方向漂移。', 'ambient')],
  }),
  theme({
    id: 'windscar-canyon', level: 4,
    chapterName: '第一章 · 风峡追踪', sceneName: '风刻峡口',
    palette: {
      skyTop: '#786aa6', skyBottom: '#c49ad0', horizonGlow: '#e8c8c5',
      mountainFar: '#57667b', mountainNear: '#375d51', groundRim: '#71854b',
      groundGrass: '#4b663f', groundSoil: '#624128', ambient: '#ead6c4', accent: '#e2ad5d',
    },
    weather: { kind: 'crosswind', label: '横穿峡风', intensity: 0.58, windVisual: 0.62, ambientMotion: 0.52 },
    environmentElements: [
      element('wind-ribbons', '可视风带', 'far', '#d9d8e8', { opacity: 0.24, density: 0.48, parallax: 0.06, scale: 1.2, motion: 0.68 }),
      element('canyon-walls', '风蚀岩壁', 'middle', '#465867', { opacity: 0.86, density: 0.72, parallax: 0.14, scale: 1.14 }),
      element('flying-leaves', '横向飞叶', 'near', '#d6bd68', { opacity: 0.56, density: 0.5, parallax: 0.52, scale: 0.48, motion: 0.84 }),
    ],
    architecture: {
      style: '峡口瞭望塔', scale: 0.46, fortification: 0.28,
      silhouette: '细高木塔、绷紧的防风索与藏在塔后的粮袋。',
      materialBias: { wood: 0.76, ice: 0.12, stone: 0.12 },
      motifs: ['风标', '防风索', '峡口粮堆'], realmLayer: 'windscar-march',
      description: '竖向建筑与横向风带形成对抗，建筑轻、窄、受风面大，强化风的可见性。', bossArena: null,
    },
    narrative: {
      summary: '车辙在狂风里消失，松鼠军把粮食藏到高塔背风面，追踪变成对风的阅读。',
      continuity: '山坡上的短墙被拉长成塔，远景地形也从松林转为狭窄峡谷。',
    },
    ruleHints: [hint('wind-direction', '让风有形', '叶片、云带和索绳同时指向实际风向。', '风力增大时飞叶更密，防风索倾角更大。')],
  }),
  theme({
    id: 'gale-rope-bridge', level: 5,
    chapterName: '第一章 · 风峡追踪', sceneName: '风索运粮桥',
    palette: {
      skyTop: '#69769f', skyBottom: '#c8a5c7', horizonGlow: '#f0cfb1',
      mountainFar: '#536375', mountainNear: '#35574c', groundRim: '#6d8149',
      groundGrass: '#48623d', groundSoil: '#614029', ambient: '#e8d8c8', accent: '#d59649',
    },
    weather: { kind: 'gusts', label: '阵风转强', intensity: 0.72, windVisual: 0.78, ambientMotion: 0.66 },
    environmentElements: [
      element('bridge-cables', '跨峡运粮索', 'middle', '#59483b', { opacity: 0.72, density: 0.42, parallax: 0.22, scale: 1.16, motion: 0.32 }),
      element('cloud-shadows', '疾走云影', 'far', '#474f72', { opacity: 0.22, density: 0.38, parallax: 0.04, scale: 1.3, motion: 0.74 }),
      element('grain-chaff', '橡壳糠屑', 'foreground', '#d4a85d', { opacity: 0.48, density: 0.44, parallax: 0.78, scale: 0.42, motion: 0.9 }),
    ],
    architecture: {
      style: '风索桥垒', scale: 0.52, fortification: 0.38,
      silhouette: '两座桥头木垒夹着运粮索桥，底层用少量岩块压住索锨。',
      materialBias: { wood: 0.7, ice: 0.12, stone: 0.18 },
      motifs: ['索桥', '压索石', '黑松军旗'], realmLayer: 'windscar-march',
      description: '比上一关更宽、更稳，却依赖数个可读的桥头锨点，为首个Boss要塞做结构预告。', bossArena: null,
    },
    narrative: {
      summary: '峡谷另一端已能看见边境要塞，粮袋正沿索桥源源不断送入关内。',
      continuity: '风峡的临时高塔开始出现石锨和军旗，松鼠军的组织性逐渐可见。',
    },
    ruleHints: [hint('gust-rhythm', '阵风节奏', '远云和粠屑先于强阵风加速，给玩家视觉预警。', '强风到来前一拍，索桥上的旗帜先绷直。')],
  }),
  theme({
    id: 'border-general-gate', level: 6,
    chapterName: '关隘战 · 边境守将', sceneName: '黑松锁口',
    palette: {
      skyTop: '#4e587b', skyBottom: '#b68fa7', horizonGlow: '#e5b98d',
      mountainFar: '#4b5968', mountainNear: '#304a42', groundRim: '#687747',
      groundGrass: '#415a39', groundSoil: '#563826', ambient: '#ddcbb8', accent: '#c45f45',
    },
    weather: { kind: 'siege-wind', label: '关隘长风', intensity: 0.64, windVisual: 0.7, ambientMotion: 0.58 },
    environmentElements: [
      element('gate-cliffs', '封口峭壁', 'far', '#3e4c59', { opacity: 0.92, density: 0.74, parallax: 0.06, scale: 1.28 }),
      element('war-banners', '黑松战旗', 'middle', '#8f3e3c', { opacity: 0.76, density: 0.34, parallax: 0.22, scale: 0.86, motion: 0.62 }),
      element('watch-braziers', '关城火盆', 'near', '#e5a04f', { opacity: 0.74, density: 0.18, parallax: 0.5, scale: 0.68, motion: 0.2 }),
    ],
    architecture: {
      style: '边境双塔门堡', scale: 0.62, fortification: 0.56,
      silhouette: '左右双塔夹住中门，守将位于关内而非弹射器前的空地。',
      materialBias: { wood: 0.56, ice: 0.1, stone: 0.34 },
      motifs: ['双塔门', '黑松将旗', '运粮闸'], realmLayer: 'windscar-fortress',
      description: '第一座真正要塞：前置弱支柱与后部石基分层明确，使“拆支点”比直接打Boss更有价值。',
      bossArena: {
        label: '关内将台', focalPoint: { x: 0.72, y: 0.79 }, minimumClearance: 88,
        framing: '双塔与后方闸门形成框景，Boss前保留一道可拆低墙。',
      },
    },
    narrative: {
      summary: '追踪在边境双塔前变成攻坚，粮车已被送过闸门，守将必须在关内被击败。',
      continuity: '风峡的木架、索桥和石锨在此组成完整军事建筑，结束第一段追击。',
    },
    ruleHints: [hint('first-boss-frame', '守将在关内', 'Boss应被要塞框住，不应成为靠近弹射器的最前排单位。', '将旗、火盆和门洞光线共同指向Boss。', 'boss')],
  }),
  theme({
    id: 'liftwood-yard', level: 7,
    chapterName: '第二章 · 升降林场', sceneName: '升降原木场',
    palette: {
      skyTop: '#5f8290', skyBottom: '#b8c7a0', horizonGlow: '#e5d6a0',
      mountainFar: '#58766e', mountainNear: '#365b48', groundRim: '#71834d',
      groundGrass: '#4d6c42', groundSoil: '#60442d', ambient: '#dfe0bb', accent: '#d28b43',
    },
    weather: { kind: 'forest-breeze', label: '林间湿风', intensity: 0.3, windVisual: 0.2, ambientMotion: 0.3 },
    environmentElements: [
      element('spruce-canopy', '云杉树冠', 'far', '#36584a', { opacity: 0.9, density: 0.78, parallax: 0.08, scale: 1.18 }),
      element('lift-cages', '远景原木笼', 'middle', '#6f583c', { opacity: 0.62, density: 0.28, parallax: 0.22, scale: 0.8, motion: 0.22 }),
      element('sawdust', '金色木屑', 'near', '#d6b06d', { opacity: 0.36, density: 0.42, parallax: 0.48, scale: 0.42, motion: 0.16 }),
    ],
    architecture: {
      style: '林场升降架', scale: 0.48, fortification: 0.22,
      silhouette: '原木柱、滑轮桥和分层货台组成宽阔的产业空间。',
      materialBias: { wood: 0.84, ice: 0.08, stone: 0.08 },
      motifs: ['原木笼', '滑轮', '工号牌'], realmLayer: 'liftwood-industry',
      description: '从军事关隘切换到松鼠王国的生产腹地，建筑更宽、更开放，移动平台首次成为景观主角。', bossArena: null,
    },
    narrative: {
      summary: '粮食被转运进一座昼夜不停的林场，这里的机关原本用于运木，如今成了防线。',
      continuity: '越过关隘后空间重新开阔，但黑松军旗与运粮印记保持追踪线索。',
    },
    ruleHints: [hint('platform-preview', '机关不分敌我', '用远景同步运作的货笼预告平台循环。', '货笼到达顶点时铃片反光一次。')],
  }),
  theme({
    id: 'sawmill-switchback', level: 8,
    chapterName: '第二章 · 升降林场', sceneName: '锯轮折返线',
    palette: {
      skyTop: '#668798', skyBottom: '#c6b887', horizonGlow: '#efd492',
      mountainFar: '#5d756d', mountainNear: '#3b5c47', groundRim: '#78824a',
      groundGrass: '#536b3e', groundSoil: '#69482e', ambient: '#e5d6ab', accent: '#d8793e',
    },
    weather: { kind: 'warm-draft', label: '锅炉暖流', intensity: 0.36, windVisual: 0.18, ambientMotion: 0.38 },
    environmentElements: [
      element('sawmill-smoke', '锯木炉烟', 'far', '#9da19b', { opacity: 0.3, density: 0.34, parallax: 0.05, scale: 1.1, motion: 0.18 }),
      element('gear-wheels', '远景锯轮', 'middle', '#70533a', { opacity: 0.68, density: 0.34, parallax: 0.2, scale: 0.9, motion: 0.26 }),
      element('amber-sawdust', '暖色锯末', 'foreground', '#e0b568', { opacity: 0.4, density: 0.5, parallax: 0.76, scale: 0.4, motion: 0.22 }),
    ],
    architecture: {
      style: '锯轮转运楼', scale: 0.54, fortification: 0.28,
      silhouette: '错层工棚与外露齿轮将两条升降线连成折返路径。',
      materialBias: { wood: 0.78, ice: 0.08, stone: 0.14 },
      motifs: ['大锯轮', '皮带轮', '料斗'], realmLayer: 'liftwood-industry',
      description: '木构仍占主导，但石基与金属色机械件让林场比自然村落更有工业感。', bossArena: null,
    },
    narrative: {
      summary: '粮袋被混进原木料斗，每一条直路都被升降机改写成折返路径。',
      continuity: '上一关的货台扩展为整条生产线，高低时机从单一机关变为场景节奏。',
    },
    ruleHints: [hint('moving-lanes', '折返窗口', '各层机关使用不同相位，但轮轴标记保持可读。', '玩家可从大齿轮上的白点判断循环进度。')],
  }),
  theme({
    id: 'canopy-freight-rise', level: 9,
    chapterName: '第二章 · 升降林场', sceneName: '树冠货梯',
    palette: {
      skyTop: '#748da2', skyBottom: '#c8c5a0', horizonGlow: '#ebddae',
      mountainFar: '#667a74', mountainNear: '#3e5f4d', groundRim: '#71814b',
      groundGrass: '#4b693f', groundSoil: '#61432c', ambient: '#dfe0c1', accent: '#bd8245',
    },
    weather: { kind: 'canopy-mist', label: '树冠水雾', intensity: 0.44, windVisual: 0.26, ambientMotion: 0.34 },
    environmentElements: [
      element('canopy-bridges', '树冠运输桥', 'far', '#40594b', { opacity: 0.76, density: 0.46, parallax: 0.08, scale: 1.08 }),
      element('freight-elevators', '绳网货梯', 'middle', '#6d573f', { opacity: 0.7, density: 0.3, parallax: 0.22, scale: 0.88, motion: 0.3 }),
      element('mist-drops', '漂浮水滴', 'near', '#d8e7dc', { opacity: 0.3, density: 0.38, parallax: 0.52, scale: 0.46, motion: 0.12 }),
    ],
    architecture: {
      style: '树冠货梯站', scale: 0.58, fortification: 0.34,
      silhouette: '高度拉长的双平台货站，上层开始出现送往霜石关的冰箱。',
      materialBias: { wood: 0.7, ice: 0.18, stone: 0.12 },
      motifs: ['绳网货梯', '冰藏箱', '高架桥'], realmLayer: 'liftwood-industry',
      description: '作为林场终点，建筑高度与密度接近关隘，冰材质开始有叙事性地进入物料系统。', bossArena: null,
    },
    narrative: {
      summary: '最后一批粮袋登上树冠货梯，运输线不再沿地面前进，而是通向雪线。',
      continuity: '远山首次变白，货台上的冰藏箱将林场的木色与下一章冷色连接起来。',
    },
    ruleHints: [hint('material-foreshadow', '霜石预告', '少量冰箱先作为视觉物料出现，再在下一关成为主要建材。', '冰箱边缘比木材更亮，雾滴接近时凝结。', 'ambient')],
  }),
  theme({
    id: 'froststone-threshold', level: 10,
    chapterName: '第三章 · 霜石关', sceneName: '冰木咬合门',
    palette: {
      skyTop: '#536b87', skyBottom: '#a9c5cc', horizonGlow: '#e1e5d4',
      mountainFar: '#6f8290', mountainNear: '#4e6567', groundRim: '#6e8158',
      groundGrass: '#526c50', groundSoil: '#574536', ambient: '#e1ebe5', accent: '#9fdde3',
    },
    weather: { kind: 'snow-flurry', label: '关前飞雪', intensity: 0.5, windVisual: 0.38, ambientMotion: 0.46 },
    environmentElements: [
      element('snow-peaks', '霜峰重影', 'far', '#8294a0', { opacity: 0.82, density: 0.72, parallax: 0.04, scale: 1.22 }),
      element('frozen-pines', '挂霜云杉', 'middle', '#465e5c', { opacity: 0.82, density: 0.58, parallax: 0.16, scale: 0.96 }),
      element('snow-flakes', '斜飞雪粒', 'near', '#f0f3ea', { opacity: 0.54, density: 0.56, parallax: 0.5, scale: 0.42, motion: 0.52 }),
    ],
    architecture: {
      style: '冰木霜石堡', scale: 0.62, fortification: 0.52,
      silhouette: '石脚、冰榫与木横梁彼此咬合，建筑像一把锁在山口的大锁。',
      materialBias: { wood: 0.4, ice: 0.32, stone: 0.28 },
      motifs: ['冰榫', '霜石脚', '雪线关灯'], realmLayer: 'froststone-pass',
      description: '三种材质首次同等重要：石材提供防御，冰材制造连锁失衡，木材连接两者。', bossArena: null,
    },
    narrative: {
      summary: '运粮线的第二道门横在雪线上，这里不再只考验弹道，还考验对材料的判断。',
      continuity: '林场终点的冰箱在此扩展为建筑系统，土地与远山都进入雪线色谱。',
    },
    ruleHints: [hint('material-language', '一眼看懂材质', '冰、木、石在边缘、高光和风雪反应上必须明显不同。', '雪粒经过冰面时更亮，经过石面时突然下沉。')],
  }),
  theme({
    id: 'ice-quarry-terraces', level: 11,
    chapterName: '第三章 · 霜石关', sceneName: '冰矿阶城',
    palette: {
      skyTop: '#485f7c', skyBottom: '#9dbbc7', horizonGlow: '#dce4df',
      mountainFar: '#6c8090', mountainNear: '#4a6267', groundRim: '#657b5b',
      groundGrass: '#4d6750', groundSoil: '#514336', ambient: '#d9e8e6', accent: '#8fd1df',
    },
    weather: { kind: 'ice-dust', label: '矿场冰尘', intensity: 0.58, windVisual: 0.34, ambientMotion: 0.5 },
    environmentElements: [
      element('quarry-cuts', '层叠冰矿壁', 'far', '#708695', { opacity: 0.84, density: 0.7, parallax: 0.06, scale: 1.2 }),
      element('haul-ramps', '矿车斜道', 'middle', '#536261', { opacity: 0.66, density: 0.42, parallax: 0.2, scale: 0.95 }),
      element('ice-splinters', '冰晶碎屑', 'foreground', '#d9f4f2', { opacity: 0.48, density: 0.48, parallax: 0.78, scale: 0.4, motion: 0.4 }),
    ],
    architecture: {
      style: '矿坑阶式防线', scale: 0.66, fortification: 0.58,
      silhouette: '建筑沿冰矿切面层层上升，重石柱压在冰梁上制造危险张力。',
      materialBias: { wood: 0.28, ice: 0.36, stone: 0.36 },
      motifs: ['矿坑切面', '运石斜道', '冰晶灯'], realmLayer: 'froststone-pass',
      description: '比入口更重、更高，用阶梯式高差提醒玩家：强度更高的材料也可以被重力变成武器。', bossArena: null,
    },
    narrative: {
      summary: '松鼠军从山体里挖出霜石加固后路，运粮车就藏在阶梯式矿城最上层。',
      continuity: '霜石关的混合材质被放大成矿坑地貌，远景已能看见黑松将军的要塞火光。',
    },
    ruleHints: [hint('collapse-as-weapon', '让石头替你攻击', '高处重石下方用冰榫和暖色绑绳标出可观察的坍落路径。', '冰榫受损时，附近石面落下少量冰尘预警。')],
  }),
  theme({
    id: 'blackpine-redoubt', level: 12,
    chapterName: '关隘战 · 黑松将军', sceneName: '黑松霜堡',
    palette: {
      skyTop: '#35465f', skyBottom: '#829eac', horizonGlow: '#ccd6d3',
      mountainFar: '#586d7a', mountainNear: '#3d5559', groundRim: '#5d7053',
      groundGrass: '#435c48', groundSoil: '#493c32', ambient: '#cedfdf', accent: '#b64e48',
    },
    weather: { kind: 'black-snow', label: '黑松风雪', intensity: 0.72, windVisual: 0.56, ambientMotion: 0.62 },
    environmentElements: [
      element('redoubt-wall', '霜堡外廓', 'far', '#44545e', { opacity: 0.9, density: 0.7, parallax: 0.05, scale: 1.24 }),
      element('blackpine-standards', '将军黑旗', 'middle', '#702f35', { opacity: 0.8, density: 0.3, parallax: 0.22, scale: 0.92, motion: 0.5 }),
      element('ember-snow', '火星与飞雪', 'near', '#e1b46d', { opacity: 0.46, density: 0.48, parallax: 0.52, scale: 0.42, motion: 0.6 }),
    ],
    architecture: {
      style: '黑松重甲霜堡', scale: 0.72, fortification: 0.72,
      silhouette: '厚石基上叠着冰木城楼，将台深藏在两层防线与石拱门之后。',
      materialBias: { wood: 0.24, ice: 0.28, stone: 0.48 },
      motifs: ['黑松将台', '霜石拱门', '双层城垛'], realmLayer: 'froststone-redoubt',
      description: '将霜石关的材质知识合成一座高耐久Boss堡，但依然保留冰榫与木连接的明确解题口。',
      bossArena: {
        label: '霜堡后院将台', focalPoint: { x: 0.74, y: 0.76 }, minimumClearance: 92,
        framing: '前景石拱门和高位冰梁形成两条攻击路径，Boss不站在城外。',
      },
    },
    narrative: {
      summary: '黑松将军在霜石关后收拢残部，这座堡垒是进入王国运输主干线前的最后门槛。',
      continuity: '冰矿阶城的重石和冰榫在此变成严整军堡，胜利后色彩将从雪线转向王城运输线。',
    },
    ruleHints: [hint('boss-material-routes', '将军不是唯一目标', '一条路径利用冰榫坍落，另一条路径绕过石拱直击Boss。', '两簇火盆分别照亮两条路线的第一个支点。', 'boss')],
  }),
  theme({
    id: 'spruce-royal-road', level: 13,
    chapterName: '第四章 · 云杉运输线', sceneName: '王城里程碑',
    palette: {
      skyTop: '#536b77', skyBottom: '#b1b99f', horizonGlow: '#dbc98f',
      mountainFar: '#66756e', mountainNear: '#3d584b', groundRim: '#6b7b4c',
      groundGrass: '#48643e', groundSoil: '#5b422f', ambient: '#d8d6b5', accent: '#c99b51',
    },
    weather: { kind: 'highland-overcast', label: '高地层云', intensity: 0.46, windVisual: 0.34, ambientMotion: 0.38 },
    environmentElements: [
      element('capital-silhouette', '王城初见', 'far', '#4b5652', { opacity: 0.42, density: 0.28, parallax: 0.02, scale: 1.34 }),
      element('royal-mileposts', '王家里程碑', 'middle', '#777464', { opacity: 0.7, density: 0.24, parallax: 0.24, scale: 0.78 }),
      element('spruce-seeds', '高地云杉种翼', 'near', '#d8c17a', { opacity: 0.4, density: 0.36, parallax: 0.5, scale: 0.44, motion: 0.3 }),
    ],
    architecture: {
      style: '王家运输驿垒', scale: 0.72, fortification: 0.62,
      silhouette: '加固石脚托起高位运输桥，每座驿垒都带有王家松果章。',
      materialBias: { wood: 0.46, ice: 0.2, stone: 0.34 },
      motifs: ['里程碑', '王家松果章', '高架运粮桥'], realmLayer: 'capital-approach',
      description: '从边关军堡转为标准化的王家基建：结构更宽、石脚更整齐，建筑上出现反复的王国徽记。', bossArena: null,
    },
    narrative: {
      summary: '关后六枚里程印一直指向王城，粮车进入了松鼠王国为战争维持的主运输线。',
      continuity: '冷色霜堡退到远山，天际线首次出现连续城墙和高大中央塔。',
    },
    ruleHints: [hint('capital-first-sight', '王城不再是台词', '远景王城剪影必须从此关起持续放大，不能下一关消失。', '每过一关，王城中央塔在远景中增大并下移。', 'ambient')],
  }),
  theme({
    id: 'highland-convoy-wall', level: 14,
    chapterName: '第四章 · 云杉运输线', sceneName: '高地护粮墙',
    palette: {
      skyTop: '#4d6372', skyBottom: '#a9b29d', horizonGlow: '#d9c58d',
      mountainFar: '#606f69', mountainNear: '#3a5348', groundRim: '#667649',
      groundGrass: '#435f3c', groundSoil: '#58402f', ambient: '#d4d3b4', accent: '#c18743',
    },
    weather: { kind: 'ridge-wind', label: '高地侧风', intensity: 0.62, windVisual: 0.66, ambientMotion: 0.56 },
    environmentElements: [
      element('capital-ramparts', '王城连续城垛', 'far', '#46504e', { opacity: 0.54, density: 0.4, parallax: 0.02, scale: 1.42 }),
      element('convoy-viaduct', '护粮高架路', 'middle', '#64645a', { opacity: 0.72, density: 0.44, parallax: 0.2, scale: 1.02 }),
      element('royal-pennants', '金褐色路旗', 'near', '#bd8746', { opacity: 0.64, density: 0.36, parallax: 0.5, scale: 0.54, motion: 0.62 }),
    ],
    architecture: {
      style: '高地石基护粮墙', scale: 0.78, fortification: 0.7,
      silhouette: '连续石基墙串起三座驿塔，木制运粮廊架在墙后通向王城。',
      materialBias: { wood: 0.4, ice: 0.18, stone: 0.42 },
      motifs: ['护粮石墙', '王家路旗', '驿塔火台'], realmLayer: 'capital-approach',
      description: '石材从局部加固转为连续基座，但上层运输廊仍使用木材，保留可被撬动的弱点。', bossArena: null,
    },
    narrative: {
      summary: '王城利用高地侧风建起一道护粮墙，这里不是边关，而是王国日常运转的一部分。',
      continuity: '远景城墙比上一关更高、更连续，场景中的里程碑被王家路旗取代。',
    },
    ruleHints: [hint('wind-on-stone', '王城也会被风撼动', '旗帜和尘带展示实时风力，高处木廊的摇动要明显强于低处石基。', '强风中木廊落尘，石墙只有旗来回响应。')],
  }),
  theme({
    id: 'capital-outer-rampart', level: 15,
    chapterName: '第四章 · 云杉运输线', sceneName: '松鼠王城外郭',
    palette: {
      skyTop: '#465b69', skyBottom: '#a0aa98', horizonGlow: '#d8bf80',
      mountainFar: '#596761', mountainNear: '#374c43', groundRim: '#5f7045',
      groundGrass: '#3f5938', groundSoil: '#533c2e', ambient: '#d0cdae', accent: '#bd7740',
    },
    weather: { kind: 'wall-gusts', label: '外郭城风', intensity: 0.7, windVisual: 0.74, ambientMotion: 0.64 },
    environmentElements: [
      element('royal-citadel', '王国中央城堡', 'far', '#3f4948', { opacity: 0.66, density: 0.48, parallax: 0.015, scale: 1.54 }),
      element('outer-rampart', '庞大石质外郭', 'middle', '#5a5d56', { opacity: 0.86, density: 0.62, parallax: 0.14, scale: 1.16 }),
      element('kingdom-banners', '密集松果旗', 'near', '#a84d3f', { opacity: 0.68, density: 0.52, parallax: 0.48, scale: 0.58, motion: 0.7 }),
    ],
    architecture: {
      style: '松鼠王国外郭石城', scale: 0.88, fortification: 0.82,
      silhouette: '巨型石墙、拱门、城垛和四座缩小远塔共同构成第一次完整的王城地平线。',
      materialBias: { wood: 0.32, ice: 0.16, stone: 0.52 },
      motifs: ['巨型石拱门', '松果王徽', '多层城垛', '密集守军岗位'], realmLayer: 'squirrel-kingdom-core',
      description: '前景物理建筑使用60左右可互动块，庞大尺度主要由远景石城延伸；石墙中保留木门榫和冰接缝作为解题口。', bossArena: null,
    },
    narrative: {
      summary: '运输线终于汇入松鼠王国的巨型外郭，粮车被无数守军和石墙包围，王城不再只是背景。',
      continuity: '第13、14关的里程碑、高架路和连续城垙在此汇入一个完整王国核心。',
    },
    ruleHints: [hint('citadel-scale', '大不等于更多刚体', '用非物理远景城墙、城旗和守军剪影表达规模，互动块仍聚焦于可读防线。', '背景石城有数层慢速视差，但不参与碰撞。', 'ambient')],
  }),
  theme({
    id: 'royal-mechanism-gate', level: 16,
    chapterName: '第五章 · 王城机关阵', sceneName: '王城风机门',
    palette: {
      skyTop: '#3d5061', skyBottom: '#909d94', horizonGlow: '#d5b975',
      mountainFar: '#505e5b', mountainNear: '#334740', groundRim: '#596b43',
      groundGrass: '#3b5336', groundSoil: '#4e392d', ambient: '#cac9ad', accent: '#d6a14d',
    },
    weather: { kind: 'engine-wind', label: '王城机械风', intensity: 0.78, windVisual: 0.82, ambientMotion: 0.72 },
    environmentElements: [
      element('citadel-inner-wall', '内城巨墙', 'far', '#394342', { opacity: 0.78, density: 0.56, parallax: 0.018, scale: 1.62 }),
      element('royal-windwheels', '王家巨型风轮', 'middle', '#737064', { opacity: 0.7, density: 0.32, parallax: 0.16, scale: 1.08, motion: 0.66 }),
      element('mechanism-sparks', '机关铜火花', 'near', '#efb35c', { opacity: 0.56, density: 0.34, parallax: 0.54, scale: 0.38, motion: 0.54 }),
    ],
    architecture: {
      style: '王城机关门阵', scale: 0.94, fortification: 0.88,
      silhouette: '石制内城门上嵌着风轮、升降桥和配重塔，林场的机关语言被王城收编。',
      materialBias: { wood: 0.26, ice: 0.19, stone: 0.55 },
      motifs: ['巨型风轮', '王庭升降桥', '石制配重塔', '铜色齿轮'], realmLayer: 'squirrel-kingdom-core',
      description: '将风峡、林场和霜石关的三类考验合并进王城建筑：风轮显风，升降桥改弹道，石塔承担防御。', bossArena: null,
    },
    narrative: {
      summary: '王城外垒把远征路上遇到的所有机关集成了一道门，这是松鼠王国的工程心脏。',
      continuity: '外郭的纯石制轮廓在此加入金属色机械和王家金色，王庭已在门后可见。',
    },
    ruleHints: [
      hint('combined-rules', '三种旧知识，一座新城门', '不引入第四种视觉语言，而是让风、机关和材质线索同屏可读。', '风轮、升降桥指示灯和冰缝高光使用三种不冲突的节奏。'),
      hint('moving-props-clear', '移动机关不推动城墙', '机关运动包络与建筑保持可见间隙。', '机关轨道在墙面前有一圈暗色净空槽。'),
    ],
  }),
  theme({
    id: 'generals-inner-court', level: 17,
    chapterName: '决战前夜 · 将军之怒', sceneName: '松果将军内庭',
    palette: {
      skyTop: '#303e50', skyBottom: '#7f8984', horizonGlow: '#caa766',
      mountainFar: '#485552', mountainNear: '#2e403a', groundRim: '#53633f',
      groundGrass: '#354c33', groundSoil: '#49342b', ambient: '#c4c1a7', accent: '#b4473d',
    },
    weather: { kind: 'war-calm', label: '决战前的停风', intensity: 0.4, windVisual: 0.2, ambientMotion: 0.34 },
    environmentElements: [
      element('royal-keep', '王庭主堡', 'far', '#343c3c', { opacity: 0.86, density: 0.6, parallax: 0.012, scale: 1.72 }),
      element('inner-court-arcades', '内庭石拱廊', 'middle', '#54554e', { opacity: 0.88, density: 0.58, parallax: 0.12, scale: 1.18 }),
      element('guard-banners', '近卫红旗', 'near', '#983d3a', { opacity: 0.76, density: 0.46, parallax: 0.5, scale: 0.66, motion: 0.18 }),
    ],
    architecture: {
      style: '王庭石质内廷', scale: 1, fortification: 0.94,
      silhouette: '前庭守军、中庭拱廊与后部将台构成三层深度，王庭主堡仍在Boss之后延伸。',
      materialBias: { wood: 0.22, ice: 0.16, stone: 0.62 },
      motifs: ['三层内庭', '松果将军徽', '近卫列阵', '王庭拱廊'], realmLayer: 'squirrel-kingdom-core',
      description: '石城规模达到高潮，但Boss必须站在两道防线之后的内庭净空区，不能被通用避障搜索挪到弹射器前。',
      bossArena: {
        label: '王庭前将台', focalPoint: { x: 0.73, y: 0.8 }, minimumClearance: 96,
        framing: '两侧石柱与远处王堡构成纵深；Boss前方有前庭与城垛守军，身后仍有建筑。',
      },
    },
    narrative: {
      summary: '松鼠将军在王庭前收缩所有守军，这里必须看起来像王国的军事核心，而非又一组野外塔楼。',
      continuity: '第16关的风轮和机关门退到两侧，场景节奏改为庄重的石庭与近卫列阵。',
    },
    ruleHints: [
      hint('general-depth', '将军在防线深处', '将军前至少有一道庭墙与一层守军，后方保留王堡轮廓。', '火盆与主堡门光把视线引向画面右侧约73%的Boss位。', 'boss'),
      hint('guard-spacing', '近卫不贴在Boss身上', '守军列阵使用前、中、后三层，最近守军与Boss保持清晰剪影间隙。', '地面铺装线标出守军站位。', 'boss'),
    ],
  }),
  theme({
    id: 'acorn-throne-citadel', level: 18,
    chapterName: '终章 · 大王与春天', sceneName: '橡心王座城',
    palette: {
      skyTop: '#273746', skyBottom: '#737f79', horizonGlow: '#e0b95e',
      mountainFar: '#414d4b', mountainNear: '#293a35', groundRim: '#4c5d3b',
      groundGrass: '#31472f', groundSoil: '#443027', ambient: '#d2c59d', accent: '#d5a83e',
    },
    weather: { kind: 'winter-breaking', label: '冬云裂光', intensity: 0.66, windVisual: 0.72, ambientMotion: 0.62 },
    environmentElements: [
      element('throne-citadel', '橡心王座主城', 'far', '#2e3737', { opacity: 0.94, density: 0.66, parallax: 0.01, scale: 1.84 }),
      element('royal-granary', '王家巨型粮仓', 'middle', '#5e5746', { opacity: 0.78, density: 0.4, parallax: 0.1, scale: 1.24 }),
      element('spring-light-rays', '穿云春光', 'far', '#f0cf75', { opacity: 0.42, density: 0.24, parallax: 0.015, scale: 1.6, motion: 0.08 }),
      element('royal-standards', '大王金红旗', 'near', '#a64338', { opacity: 0.8, density: 0.5, parallax: 0.48, scale: 0.7, motion: 0.68 }),
    ],
    architecture: {
      style: '橡心王座石质主堡', scale: 1, fortification: 1,
      silhouette: '巨型石拱、王座湾、粮仓圆穹与两翼近卫塔构成王国核心，城堡在Boss背后仍有完整纵深。',
      materialBias: { wood: 0.18, ice: 0.14, stone: 0.68 },
      motifs: ['橡心王徽', '王座湾', '巨型粮仓圆穹', '金红近卫旗', '冬云裂光'], realmLayer: 'squirrel-kingdom-core',
      description: '终章的庞大感由背景主城、中景粮仓与前景可互动王庭共同组成；物理建材封顶84块，不用无限叠石砖代替美术层次。',
      bossArena: {
        label: '橡心王座湾', focalPoint: { x: 0.75, y: 0.79 }, minimumClearance: 104,
        framing: '左右石柱框住大王，王座后是锁住的粮仓大门；前景三层守军形成最终攻坚深度。',
      },
    },
    narrative: {
      summary: '远征的终点不是一座孤塔，而是松鼠王国的石质心脏：王座、军队、机关和被锁住的粮仓同在画面中。',
      continuity: '从第1关的空粮仓到第18关的王家粮仓，月夜冷光终于被云后的春光取代，使环境本身完成叙事闭环。',
    },
    ruleHints: [
      hint('finale-focal-depth', '大王必须位于王城内', '大王站在画面右侧约75%的王座湾，前方有守军，后方有粮仓与主城。', '春光与王座后的粮仓门形成单一视觉焦点。', 'boss'),
      hint('winter-breaks', '胜利目标可见', '冬云裂缝和粮仓暖光随Boss阶段逐步增强，但不依赖英文文字。', '大王体力降到66%、33%时，各打开一道云缝与粮仓窗光。', 'boss'),
    ],
  }),
])

export const MAIN_ENVIRONMENT_THEME_BY_LEVEL = deepFreeze(Object.fromEntries(
  MAIN_ENVIRONMENT_THEMES.map((entry) => [entry.level, entry]),
))

/** Return a frozen main-campaign theme, or null for a non-main level. */
export function getMainEnvironmentTheme(levelValue) {
  const level = Number(levelValue)
  if (!Number.isSafeInteger(level) || level < 1 || level > MAIN_ENVIRONMENT_THEME_COUNT) return null
  return MAIN_ENVIRONMENT_THEME_BY_LEVEL[level] || null
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`)
}

/** Validate custom or built-in theme records without throwing. */
export function validateMainEnvironmentThemes(records = MAIN_ENVIRONMENT_THEMES) {
  if (!Array.isArray(records)) return { valid: false, errors: ['themes must be an array'] }
  const errors = []
  const ids = new Set()
  const levels = new Set()

  records.forEach((entry, index) => {
    const path = `themes[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      addError(errors, path, 'must be an object')
      return
    }
    if (!nonEmptyString(entry.id)) addError(errors, `${path}.id`, 'is required')
    else if (ids.has(entry.id)) addError(errors, `${path}.id`, 'must be unique')
    else ids.add(entry.id)
    if (!Number.isSafeInteger(entry.level) || entry.level < 1 || entry.level > MAIN_ENVIRONMENT_THEME_COUNT) {
      addError(errors, `${path}.level`, 'must be an integer from 1 to 18')
    } else if (levels.has(entry.level)) addError(errors, `${path}.level`, 'must be unique')
    else levels.add(entry.level)

    for (const key of ['chapterName', 'sceneName']) {
      if (!nonEmptyString(entry[key])) addError(errors, `${path}.${key}`, 'is required')
    }
    if (entry.schemaVersion !== MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION) {
      addError(errors, `${path}.schemaVersion`, `must equal ${MAIN_ENVIRONMENT_THEME_SCHEMA_VERSION}`)
    }
    if (typeof entry.storyNode !== 'boolean') addError(errors, `${path}.storyNode`, 'must be boolean')
    if (typeof entry.bossNode !== 'boolean') addError(errors, `${path}.bossNode`, 'must be boolean')

    for (const key of PALETTE_KEYS) {
      if (!HEX_COLOR.test(entry.palette?.[key] || '')) addError(errors, `${path}.palette.${key}`, 'must be a six-digit hex color')
    }
    if (!nonEmptyString(entry.weather?.kind) || !nonEmptyString(entry.weather?.label)) {
      addError(errors, `${path}.weather`, 'must define kind and label')
    }
    for (const key of ['intensity', 'windVisual', 'ambientMotion']) {
      const value = entry.weather?.[key]
      if (!Number.isFinite(value) || value < 0 || value > 1) addError(errors, `${path}.weather.${key}`, 'must be between 0 and 1')
    }

    if (!Array.isArray(entry.environmentElements) || entry.environmentElements.length < 3) {
      addError(errors, `${path}.environmentElements`, 'must contain at least three layered elements')
    } else {
      entry.environmentElements.forEach((item, elementIndex) => {
        const itemPath = `${path}.environmentElements[${elementIndex}]`
        if (!nonEmptyString(item?.kind) || !nonEmptyString(item?.label)) addError(errors, itemPath, 'must define kind and label')
        if (!ELEMENT_LAYERS.has(item?.layer)) addError(errors, `${itemPath}.layer`, 'is invalid')
        if (!HEX_COLOR.test(item?.color || '')) addError(errors, `${itemPath}.color`, 'must be a six-digit hex color')
        for (const key of ['opacity', 'density', 'parallax', 'motion']) {
          const value = item?.[key]
          if (!Number.isFinite(value) || value < 0 || value > 1) addError(errors, `${itemPath}.${key}`, 'must be between 0 and 1')
        }
        if (!Number.isFinite(item?.scale) || item.scale <= 0) addError(errors, `${itemPath}.scale`, 'must be positive')
      })
    }

    const architecture = entry.architecture
    for (const key of ['style', 'silhouette', 'realmLayer', 'description']) {
      if (!nonEmptyString(architecture?.[key])) addError(errors, `${path}.architecture.${key}`, 'is required')
    }
    for (const key of ['scale', 'fortification']) {
      const value = architecture?.[key]
      if (!Number.isFinite(value) || value < 0 || value > 1) addError(errors, `${path}.architecture.${key}`, 'must be between 0 and 1')
    }
    const weights = MATERIAL_KEYS.map((key) => architecture?.materialBias?.[key])
    if (weights.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      addError(errors, `${path}.architecture.materialBias`, 'must define wood, ice, and stone from 0 to 1')
    } else if (Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) > 1e-9) {
      addError(errors, `${path}.architecture.materialBias`, 'must sum to 1')
    }
    if (!Array.isArray(architecture?.motifs) || architecture.motifs.length < 3
      || architecture.motifs.some((motif) => !nonEmptyString(motif))) {
      addError(errors, `${path}.architecture.motifs`, 'must contain at least three named motifs')
    }
    if (entry.bossNode) {
      const arena = architecture?.bossArena
      if (!arena || !nonEmptyString(arena.label) || !nonEmptyString(arena.framing)) {
        addError(errors, `${path}.architecture.bossArena`, 'is required for a boss node')
      } else {
        if (!Number.isFinite(arena.minimumClearance) || arena.minimumClearance < 80) {
          addError(errors, `${path}.architecture.bossArena.minimumClearance`, 'must be at least 80')
        }
        if (!Number.isFinite(arena.focalPoint?.x) || arena.focalPoint.x < 0 || arena.focalPoint.x > 1
          || !Number.isFinite(arena.focalPoint?.y) || arena.focalPoint.y < 0 || arena.focalPoint.y > 1) {
          addError(errors, `${path}.architecture.bossArena.focalPoint`, 'must use normalized x and y')
        }
      }
    } else if (architecture?.bossArena !== null) {
      addError(errors, `${path}.architecture.bossArena`, 'must be null outside boss nodes')
    }

    if (!nonEmptyString(entry.narrative?.summary) || !nonEmptyString(entry.narrative?.continuity)) {
      addError(errors, `${path}.narrative`, 'must define summary and continuity')
    }
    if (!Array.isArray(entry.ruleHints)) addError(errors, `${path}.ruleHints`, 'must be an array')
    else entry.ruleHints.forEach((item, hintIndex) => {
      const hintPath = `${path}.ruleHints[${hintIndex}]`
      for (const key of ['id', 'label', 'description', 'cue']) {
        if (!nonEmptyString(item?.[key])) addError(errors, `${hintPath}.${key}`, 'is required')
      }
      if (!HINT_PRIORITIES.has(item?.priority)) addError(errors, `${hintPath}.priority`, 'is invalid')
    })
  })

  for (let level = 1; level <= MAIN_ENVIRONMENT_THEME_COUNT; level += 1) {
    if (!levels.has(level)) addError(errors, 'themes', `is missing level ${level}`)
  }
  return { valid: errors.length === 0, errors }
}
