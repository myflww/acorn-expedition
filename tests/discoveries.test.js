// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import test from 'node:test'
import assert from 'node:assert/strict'

import { DISCOVERIES, DISCOVERY_IDS, discoveryArtMarkup } from '../src/discoveries.js'
import { SPECIAL_ROSTER } from '../src/special-roster.js'

test('the field guide registers every current special content type with vector art', () => {
  assert.deepEqual(DISCOVERY_IDS, [
    'bird:red', 'bird:bomb', 'bird:split', 'bird:dash',
    'bird:fire',
    'bird:drill', 'bird:frost', 'bird:vine', 'bird:boomerang', 'bird:quake',
    'bird:talent-emberheart', 'bird:talent-prism-bell', 'bird:talent-thunder-root',
    'enemy:general', 'enemy:king',
    'enemy:shield', 'enemy:engineer', 'enemy:glider', 'enemy:shaman', 'enemy:burrower',
    'object:stone', 'object:ice', 'object:wood-nails', 'object:stone-masonry',
    'object:canvas-screen', 'object:resin-timber', 'object:packed-earth',
    'object:resin-glass', 'object:leaf-iron-plate',
    'item:golden-acorn',
    'map:polar-clocktower', 'map:tidebound-undercity', 'map:mirrorwood-labyrinth',
    'map:deep-root-fault', 'map:stormline-skyport',
    'map:wind', 'map:moving-platform',
  ])
  assert.equal(new Set(Object.values(DISCOVERIES).map((entry) => entry.art)).size, DISCOVERY_IDS.length)
  for (const id of DISCOVERY_IDS) {
    const entry = DISCOVERIES[id]
    assert.equal(entry.id, id)
    assert.ok(entry.category && entry.title && entry.summary && entry.action && entry.tip)
    assert.ok(Object.isFrozen(entry))
    assert.match(discoveryArtMarkup(id), /^<svg[^>]+viewBox="0 0 120 96"/u)
  }
  assert.throws(() => discoveryArtMarkup('unknown'), /Unknown discovery/u)
  assert.ok(Object.isFrozen(DISCOVERIES))
  assert.ok(Object.isFrozen(DISCOVERY_IDS))
})

test('烈焰橡果的首遇卡与档案故事解释精准附着，而不是重复爆炸定位', () => {
  const fire = DISCOVERIES['bird:fire']
  assert.equal(fire.firstLevel, 8)
  assert.match(fire.summary, /附着/u)
  assert.match(fire.summary, /相邻构件/u)
  assert.match(fire.tip, /不会像爆裂/u)
  assert.match(fire.lore, /锯轮工坊/u)
  assert.match(discoveryArtMarkup('bird:fire'), /discovery-fire-core/u)
})

test('三枚天赋专属橡宝拥有与实战契约一致的首遇卡和独立美术', () => {
  const expected = {
    'bird:talent-emberheart': {
      title: '熔心橡宝', mechanic: /72 .*4 次熔心脉冲.*3 点/u,
      action: /命中自动附着/u, art: /discovery-talent-ember-core/u,
      palette: /#ff5438/u, lore: /王都熔种师/u,
    },
    'bird:talent-prism-bell': {
      title: '镜霜橡宝', mechanic: /半径 140.*1\.9 倍.*永久冻结.*2\.3 倍/u,
      action: /空格折射霜环/u, art: /discovery-talent-prism-facet/u,
      palette: /#8ce9f7/u, lore: /极夜钟楼重鸣/u,
    },
    'bird:talent-thunder-root': {
      title: '雷根橡宝', mechanic: /185 .*追踪 5 个连接点.*3 点.*2 点/u,
      action: /空格引雷扎根/u, art: /discovery-talent-thunder-root/u,
      palette: /#71419a.*#f2c14e/us, lore: /地心根脉最深处/u,
    },
  }

  const titles = []
  const illustrations = []
  for (const [id, rules] of Object.entries(expected)) {
    const discovery = DISCOVERIES[id]
    const art = discoveryArtMarkup(id)
    assert.equal(discovery.category, '天赋专属橡宝')
    assert.equal(discovery.title, rules.title)
    assert.match(discovery.summary, rules.mechanic)
    assert.match(discovery.action, rules.action)
    assert.match(discovery.tip, /普通弹药 8 发上限外.*每关额外加入 1 枚/u)
    assert.match(discovery.tip, /不计余弹星级与余弹奖励/u)
    assert.match(discovery.lore, rules.lore)
    assert.match(art, rules.art)
    assert.match(art, rules.palette)
    titles.push(discovery.title)
    illustrations.push(art)
  }

  assert.equal(new Set(titles).size, 3, '三枚专属橡宝标题不重复')
  assert.equal(new Set(illustrations).size, 3, '三枚专属橡宝使用独立轮廓')
})

test('疾风橡宝与石材卡说明长跨梁断裂不会凭空增加总耐久', () => {
  const dash = DISCOVERIES['bird:dash']
  assert.match(dash.summary, /长木梁.*长石梁.*撞击点.*断开/u)
  assert.match(dash.tip, /不会额外生成耐久/u)
  assert.match(DISCOVERIES['object:stone'].tip, /长石梁.*总耐久不变/u)
})

test('移动挡板资料卡展示可破坏木板与两只搬运飞鼠', () => {
  const platform = DISCOVERIES['map:moving-platform']
  assert.equal(platform.title, '飞鼠搬运挡板')
  assert.match(platform.summary, /两只搬运飞鼠.*实体木板.*挡住.*橡果/u)
  assert.match(platform.summary, /木板.*两侧搬运者.*都可被破坏/u)
  assert.match(platform.action, /击碎木板.*击落任一搬运飞鼠/u)
  assert.match(platform.tip, /失去升力坠落/u)
  assert.match(discoveryArtMarkup('map:moving-platform'), /discovery-platform-carrier/u)
})

test('首次横风资料卡提醒玩家按需切换新手弹道', () => {
  const wind = DISCOVERIES['map:wind']
  assert.match(wind.summary, /有弹道/u)
  assert.match(wind.summary, /基准轨迹/u)
  assert.match(wind.action, /设置.*弹道模式.*新手弹道/u)
  assert.match(wind.tip, /第一次接触横风/u)
})

test('new campaign construction materials have distinct mechanics and field-guide silhouettes', () => {
  const expected = {
    'object:canvas-screen': ['风帆布', /承风/u, /discovery-canvas-screen/u],
    'object:resin-timber': ['树脂木', /粘成一组/u, /discovery-resin-timber/u],
    'object:packed-earth': ['根土夯砖', /连体基座/u, /discovery-packed-earth/u],
    'object:resin-glass': ['松脂晶板', /强烈反弹/u, /discovery-resin-glass/u],
    'object:leaf-iron-plate': ['叶铁护板', /锁成一体/u, /discovery-leaf-iron-plate/u],
  }

  for (const [id, [title, mechanic, artMarker]] of Object.entries(expected)) {
    assert.equal(DISCOVERIES[id].title, title)
    assert.match(DISCOVERIES[id].summary, mechanic)
    assert.match(discoveryArtMarkup(id), artMarker)
  }
})

test('late royal construction cards explain each reinforced contact with distinct art', () => {
  assert.match(DISCOVERIES['object:wood-nails'].summary, /钉/u)
  assert.match(DISCOVERIES['object:wood-nails'].tip, /连接断裂/u)
  assert.match(discoveryArtMarkup('object:wood-nails'), /discovery-rivet/u)

  assert.match(DISCOVERIES['object:stone-masonry'].summary, /砌/u)
  assert.match(DISCOVERIES['object:stone-masonry'].tip, /破甲/u)
  assert.match(discoveryArtMarkup('object:stone-masonry'), /discovery-stone/u)
})

test('every special roster entry has a complete first-encounter field-guide card', () => {
  for (const entry of SPECIAL_ROSTER) {
    const discovery = DISCOVERIES[entry.discoveryId]
    assert.ok(discovery, `${entry.discoveryId} is registered`)
    assert.equal(discovery.title, entry.title)
    assert.equal(discovery.firstLevel, entry.firstLevel)
    assert.equal(discovery.role, entry.role)
    assert.match(discoveryArtMarkup(entry.discoveryId), /discovery-outline/u)
  }
})
