// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  SPECIAL_ACORN_DISCOVERIES,
  SPECIAL_SQUIRREL_DISCOVERIES,
} from './special-roster.js'
import { CONSTRUCTION_MATERIALS } from './main-architecture-blueprints.js'

const DISCOVERY_RECORDS = {
  'bird:red': {
    category: '基础橡果', title: '橡宝', art: 'bird-red',
    summary: '均衡可靠，没有主动技能。利用反弹和建筑坍塌完成连锁攻击。',
    action: '拖拽 · 松开发射', tip: '先观察支撑结构，再决定力量和角度。',
  },
  'bird:bomb': {
    category: '特殊橡果', title: '爆裂橡宝', art: 'bird-bomb',
    summary: '飞行中主动引爆，对周围的松鼠与建筑造成范围伤害。',
    action: '点击画面 · 空格引爆', tip: '飞到塔楼中心再发动，能同时破坏多层防线。',
  },
  'bird:split': {
    category: '特殊橡果', title: '双叶橡宝', art: 'bird-split',
    summary: '飞行中分裂出两枚幼芽橡果，扩大上下方向的覆盖。',
    action: '点击画面 · 空格分裂', tip: '接近多座塔或成排目标时发动最有效。',
  },
  'bird:dash': {
    category: '特殊橡果', title: '疾风橡宝', art: 'bird-dash',
    summary: '飞行中瞬间提速，显著提高撞击力度；超强动量命中长木梁或长石梁时，会从撞击点将横梁断开。',
    action: '点击画面 · 空格冲刺', tip: '对准长跨梁中段或关键承重点再冲刺；断成两段不会额外生成耐久。',
  },
  'bird:fire': {
    category: '特殊橡果', title: '烈焰橡果', art: 'bird-fire', firstLevel: 8,
    summary: '点燃熔芯后，下一次接触会附着在建材上，持续灼烧该承重点和最多两处相邻构件。',
    action: '点击画面 · 空格点燃熔芯', tip: '瞄准树脂木或关键支柱；它专注拆解结构，不会像爆裂橡宝那样伤及松鼠。',
  },
  ...SPECIAL_ACORN_DISCOVERIES,
  'bird:talent-emberheart': {
    category: '天赋专属橡宝', title: '熔心橡宝', art: 'bird-talent-emberheart',
    summary: '命中建材后自动附着，在 72 范围内连续释放 4 次熔心脉冲，每次造成 3 点伤害。',
    action: '命中自动附着 · 内燃四次', tip: '在普通弹药 8 发上限外每关额外加入 1 枚，不计余弹星级与余弹奖励；瞄准树脂木群或堡垒核心。',
  },
  'bird:talent-prism-bell': {
    category: '天赋专属橡宝', title: '镜霜橡宝', art: 'bird-talent-prism-bell',
    summary: '释放半径 140 的棱镜霜环，墙面折返后最远可延伸至 1.9 倍触达距离；永久冻结建材并施加 2.3 倍脆化。',
    action: '点击画面 · 空格折射霜环', tip: '在普通弹药 8 发上限外每关额外加入 1 枚，不计余弹星级与余弹奖励；让霜环经墙面折返，可以覆盖堡垒的正反两面。',
  },
  'bird:talent-thunder-root': {
    category: '天赋专属橡宝', title: '雷根橡宝', art: 'bird-talent-thunder-root',
    summary: '扎入地面后会在 185 范围内沿承重路径追踪 5 个连接点，对连接件造成 3 点、对建材造成 2 点雷根伤害。',
    action: '点击画面 · 空格引雷扎根', tip: '在普通弹药 8 发上限外每关额外加入 1 枚，不计余弹星级与余弹奖励；优先落在多条承重链交汇的地基。',
  },
  'enemy:general': {
    category: '特殊松鼠', title: '披甲将军', art: 'enemy-general',
    summary: '叶铁肩甲、高血量和抗击退让它能承受多次正面攻击，且会在受伤后切换战斗阶段。',
    action: '保留高伤害橡宝 · 连续重击', tip: '首领免疫建材压杀；先清理射线和护卫，再用爆破、冲刺集中输出。',
  },
  'enemy:king': {
    category: '特殊松鼠', title: '松鼠大王', art: 'enemy-king',
    summary: '王冠与王庭重甲下是全游戏最厚的首领血量，受伤后会号令机关加速并释放局部震地。',
    action: '保留技能 · 集中攻击', tip: '建筑坍塌可以打开射线，但不能直接压杀大王；把最强橡宝留给王座。',
  },
  ...SPECIAL_SQUIRREL_DISCOVERIES,
  'object:stone': {
    category: '特殊建材', title: '石块', art: 'object-stone',
    summary: '石块耐久、质量、抓地力与结构稳定性最高，普通撞击很难直接撼动。',
    action: '爆炸 · 钻击 · 破坏支撑', tip: '先拆除相邻木架；长石梁可被疾风级强动量从命中点断开，但两段总耐久不变。',
  },
  'object:ice': {
    category: '特殊建材', title: '冰块', art: 'object-ice',
    summary: '冰块非常脆、摩擦最低且容易滑移，命中后会触发一段冰霜慢动作。',
    action: '一次命中即可打碎', tip: '优先击碎冰支点，让上层在低稳定表面上整体失衡。',
  },
  'object:wood-nails': {
    category: '王城工事', title: '叶铁钉接', art: 'object-wood-nails',
    summary: '王城木梁以叶铁钉互相承拉；只要连接链仍接在地面支点上，即使下方被掏空也能悬挂相邻构件。',
    action: '撕开钉接 · 再拆承重梁', tip: '高速直击、爆炸或藤锁可拉断连接；连接断裂或任一端构件破坏后，悬挂部分会立即失去牵引。',
  },
  'object:stone-masonry': {
    category: '王城工事', title: '根灰砌合', art: 'object-stone-masonry',
    summary: '内城石板以根灰砌缝锁合，能把承重沿相邻石块传到根基，也比叶铁钉接更难被冲击拆开。',
    action: '破坏砌缝 · 打开承重链', tip: '优先使用破甲、钻击或爆破橡宝；正面硬撞完整石墙往往会浪费弹药。',
  },
  'object:canvas-screen': {
    category: '特殊建材', title: '风帆布', art: 'object-canvas-screen',
    summary: '质量轻且耐久很低，却会大幅承风；横风越强，越容易把它推离支点或掀倒。',
    action: '观察风力 · 撕开风障', tip: '布幕不承担刚性牵引；强风局可等它自行偏移，静风局则先击穿挡在承重点前的布幕。',
  },
  'object:resin-timber': {
    category: '特殊建材', title: '树脂木', art: 'object-resin-timber',
    summary: '琥珀树脂会沿真实接缝把相邻木件粘成一组，即使下方短暂悬空也能继续承拉。',
    action: '烧断树脂缝 · 再拆承重', tip: '先找橙金色滴胶缝；烈焰或集中重击破坏任一端，才能解开整组黏合。',
  },
  'object:packed-earth': {
    category: '特殊建材', title: '根土夯砖', art: 'object-packed-earth',
    summary: '古树细根会穿过夯砖接缝继续传力，让相邻根土砖成为沉重的连体基座。',
    action: '破甲钻击 · 切断根束', tip: '辨认跨缝绿色根束；先断开边缘连接，再借重量反压下方目标。',
  },
  'object:resin-glass': {
    category: '特殊建材', title: '松脂晶板', art: 'object-resin-glass',
    summary: '树脂包固的透明晶板耐久更高、抓地更稳，表面会产生强烈反弹。',
    action: '计算入射角 · 借板折射', tip: '晶板不形成承拉连接，也不会触发冰块减速；把它当成第二座发射器，能绕过厚重正门。',
  },
  'object:leaf-iron-plate': {
    category: '王城工事', title: '叶铁护板', art: 'object-leaf-iron-plate',
    summary: '包覆在木石表面的重甲会先吸收两点伤害；跨缝叶铁夹板还会把相邻构件锁成一体。',
    action: '先破护板 · 再击本体', tip: '爆破、钻击和高速重撞最适合剥甲；看见护板脱落提示后再追加第二击。',
  },
  'item:golden-acorn': {
    category: '稀有物品', title: '金橡果', art: 'item-golden-acorn',
    summary: '飞行中碰到即可获得 5000 分，并计入营地收藏。',
    action: '改变弹道 · 主动收集', tip: '高分会更快填满天赋进度，直接增强本次远征。',
  },
  'map:polar-clocktower': {
    category: '秘境地图', title: '极夜钟楼', art: 'map-polar-clocktower',
    summary: '钟摆平台与钟面风向会按回合改变，冰结接缝受力后更容易连锁断裂。',
    action: '观察钟摆 · 利用霜环', tip: '每次发射前重新检查风向和平台高度。',
  },
  'map:tidebound-undercity': {
    category: '秘境地图', title: '潮缚下城', art: 'map-tidebound-undercity',
    summary: '水位每回合轮换，淹没建材获得浮力并降低摩擦，整座塔可能滑移重组。',
    action: '借潮水拉动支点', tip: '涨潮时抽掉配重，退潮时再追击落点。',
  },
  'map:mirrorwood-labyrinth': {
    category: '秘境地图', title: '镜林迷宫', art: 'map-mirrorwood-labyrinth',
    summary: '镜面横梁拥有极高反弹，虚像没有碰撞体，真实目标需要从弹道和尾巴判断。',
    action: '反弹 · 绕后 · 回旋', tip: '把镜面当作第二个弹弓，不要直追虚像。',
  },
  'map:deep-root-fault': {
    category: '秘境地图', title: '地心根脉', art: 'map-deep-root-fault',
    summary: '断层会在支点破坏后延迟传递冲量，顶部建材也会随发射被唤醒坠落。',
    action: '钻穿承重链', tip: '主动留出断层的发作时间，让落石替你完成后续攻击。',
  },
  'map:stormline-skyport': {
    category: '秘境地图', title: '雷云航站', art: 'map-stormline-skyport',
    summary: '上升气流带会改写弹道，雷击周期性冲击建筑，悬索支点失衡后会快速翻转。',
    action: '借气流抬高 · 震地断缆', tip: '在雷击到来前削弱同一支点，把环境脉冲变成助力。',
  },
  'map:wind': {
    category: '环境机制', title: '横风区', art: 'map-wind',
    summary: '横风会持续推移飞行中的橡果。“有弹道”显示不受风影响的基准轨迹，实际落点会产生风偏。',
    action: '设置 → 弹道模式 → 新手弹道', tip: '第一次接触横风时，建议切换“新手弹道”查看风偏；熟悉后可改回“有弹道”。',
  },
  'map:moving-platform': {
    category: '环境机制', title: '飞鼠搬运挡板', art: 'map-moving-platform',
    summary: '两只搬运飞鼠拉着实体木板往返巡航，木板会真实挡住飞行中的橡果；木板与两侧搬运者都可被破坏。',
    action: '击碎木板 · 击落任一搬运飞鼠', tip: '直接拆板可打通弹道；命中任一侧飞鼠会让挡板失去升力坠落，不再继续巡航。',
  },
}

/**
 * Field-journal passages are kept separate from the mechanical summaries so
 * archive views can tell the kingdom's story without changing the concise
 * first-encounter cards. Every registered discovery must have exactly one
 * passage; the integrity guard below deliberately fails fast when new content
 * is added without archive lore.
 */
export const DISCOVERY_LORE = Object.freeze({
  'bird:red': '粮仓失守的第一夜，橡心王国的果园学徒把训练用的红布系在壳顶，排成了最早的守备队。橡宝没有符文捷径，却凭可靠的重量与一次次反弹证明：看懂一根承重木梁，也能把冬粮夺回来。',
  'bird:bomb': '旧炭窑的守火人发现，松鼠军团遗下的树脂粉遇到橡壳热气会猛烈膨胀，于是为爆裂橡宝装上了可控火捻。它胸前的焦痕不是勋章，而是提醒每位远征者把爆炸留给堡垒中心，别让火星落进王国的果园。',
  'bird:split': '橡心育苗院曾用双叶纹记录同一颗种子长出的两株幼苗，双叶橡宝由此学会在空中释放两枚幼芽分身。三道弹迹象征散落各地的守粮队重新会合，专门撕开松鼠军团横向铺开的多重哨线。',
  'bird:dash': '林冠驿道被占领后，送信橡宝只能借山谷阵风穿越断桥，久而久之练成了瞬间收叶冲刺。疾风橡宝壳上的闪电纹来自第一封送抵王庭的求援信，也让远处石墙再不能成为松鼠斥候的安全屏障。',
  'bird:fire': '锯轮工坊失守后，树脂匠把最后一枚恒温炭芯藏进厚橡壳，交给负责拆除敌军梁柱的烈焰橡果。它不会把火撒向整片森林，只在选中的承重点安静附着，让热力沿相邻榫口扩散；壳顶三道金红焰冠，记录着从王国粮仓救出的三盏炉火。',
  'bird:drill': '王都根匠从古树根部取下一枚自然脱落的橡钢节，为钻岩橡宝磨出三段钻头。它原本用于疏通被松鼠矿车堵死的根脉水道，如今每穿透一层石防，都在替橡心王国重新接上一段地下呼吸。',
  'bird:frost': '极夜钟楼失去晨光后，守钟人从冻结的报时铃上剥下薄冰，制成霜铃橡宝头顶的双叶铃。铃声会让建筑接缝回想起严冬的脆弱，霜纹在战斗结束前都不会融化；它也会短暂拖慢施法松鼠，好让北境的第一缕日光赶上远征队。',
  'bird:vine': '橡心古树的须根会在地下彼此传递受力方向，藤锁橡宝便照着这种根语编成腰间长索，又用旧运粮车的黄铜轴造出绞盘。它拉动的从来不只是某根横梁，而是定点拔开堡垒互相依赖的榫结，让被截断的森林脉络重新成为王国的力量。',
  'bird:boomerang': '镜林的第一支王国侦察队曾被无数倒影困住，只有一枚弯月叶片绕过镜墙又回到主人手中。回旋橡宝依照那条归途展开双翼，从防线背面击中藏起的支点，也替后来者标出一条不会迷失的林间航线。',
  'bird:quake': '地心根脉的矿轨昼夜震动时，震地橡宝伏在土层上记住了每一种回声，并为沉重橡壳装上撞锤足。它从高处落下的震波能沿承重链奔走，像古树深处的一次心跳，唤醒被矿石压住的王国根系。',
  'bird:talent-emberheart': '王都熔种师把从失守炉心抢回的四簇火种封入橡壳，让熔心橡宝学会在敌军堡垒内部呼吸。它的火红熔核每跳动一次，就替橡心王国燃回一盏被松鼠夺走的守夜灯。',
  'bird:talent-prism-bell': '极夜钟楼重鸣前，守钟人从第一束晨光照亮的冰棱中磨出了镜霜铃冠。镜霜橡宝会把霜环经堡垒镜面送往反侧，让王国的寒光永久留在每一道被占领的承重缝上。',
  'bird:talent-thunder-root': '地心根脉最深处，勘察队在古树断根里找到一缕仍在奔走的金色雷光。雷根橡宝将它编入紫色根冠，每次扎地都会沿敌军承重链寻回五处节点，为橡心王国重新接通地下的脉搏。',
  'enemy:general': '披甲将军把橡心城门上拆下的叶铁熔成肩甲，宣称没有橡果能第二次撞开他的阵线。守备队后来把倒塌只用来清理射线：将军的重甲会挡住压杀，真正的胜负必须由爆破、冲刺和一次次准确重击写下。',
  'enemy:king': '松鼠大王以千年寒冬将至为借口搬空王国粮仓，又把风机、升降桥和重甲王座层层锁在冬粮之前。他的王冠镶着各地仓门的铜钉，因此击倒他不仅是一场胜利，也是把十八座粮仓的钥匙逐一归还给橡心居民。',
  'enemy:shield': '盾尾卫士的巨叶取自王庭粮仓外那株百年门树，叶脉经过树脂浸泡后能吞下一次正面重击。松鼠只顾把盾面朝向弹弓，却忘了门树的枝叶本为遮护天空而生；来自背后和头顶的攻击仍能越过这道防线。',
  'enemy:engineer': '榫木工匠随身携带从橡心桥梁工坊掠走的榫印图纸，能在战斗间隙把开裂建材重新扣紧。每修好一块木料，他的工具箱便盖下一枚倒置树纹；摧毁工位或用寒霜打断动作，就能阻止被盗手艺继续加固松鼠堡垒。',
  'enemy:glider': '飞膜斥候沿着被占领的林冠邮路巡航，把远征队的弹道写成密报送往王庭。它双翼上的蓝灰条纹模仿黄昏云层，却会在折返点短暂停顿；那一瞬正是橡心神射手截断情报线的最好机会。',
  'enemy:shaman': '霜枝祭司在极夜钟楼下收集停摆时刻的寒雾，将它缠上权杖，试图让所有来袭橡宝提前坠落。档案员发现寒雾与施术者共鸣，只要祭司离场便会散去，因此王国把击破霜环列为北境远征的首要口令。',
  'enemy:burrower': '地道伏兵把古树根旁的松软土穴连成暗道，替矿队搬走粮食，也不断切断橡心王国的细根。它潜地时避得开直接撞击，却躲不过大地传来的震波；土堆突然隆起，往往就是下一条运输线暴露的信号。',
  'object:stone': '橡心王国最老的桥墩以根山石砌成，耐久与重量原本用来保护运粮车队，后来却被松鼠军团搬进堡垒。石块难以正面击碎，但一旦失去木架支撑，高处坠落的重量会替远征队完成最有力的一击。',
  'object:ice': '北境储藏洞用透光冰砖保存秋收，松鼠占领后把它们垒成光滑的塔脚，企图让橡宝无法借力。冰块只需一次准确命中便会破裂，低摩擦表面还会把上层重量悄悄送离平衡点，成为夺回冬粮的意外捷径。',
  'object:wood-nails': '抵达王城外墙时，侦察队第一次见到从橡心仓门上熔下的叶铁钉。松鼠工务营把它们钉进每处木梁交界，让轻微摇晃无法传成整塔坍塌。钉帽上残留的树纹仍属于王国；逐枚撕开这些连接，也是在把被掠走的城门一点点取回。',
  'object:stone-masonry': '进入内城后，松鼠以古树细根烧成根灰，填进根山石之间的砌缝，筑起守护王座与冬粮的沉重石垒。砌合能把冲击分散到整面墙，却也把每块石板连成同一条承重链；找准关键接缝，最坚固的王城仍会沿自己的重量裂开。',
  'object:canvas-screen': '风峡守旗人曾把旧运粮帆缝成林道风标，帮橡心王国的车队在雾里辨认山口。松鼠抢走风帆做成堡垒屏障，却也留下会被横风放大的弱点，飘动的布边仍在为远征队指路。',
  'object:resin-timber': '林场树脂匠原本用浸油木梁加固橡心粮仓，好让秋收熬过连绵雨季。松鼠工务营照着被盗的配方筑起韧性支柱，但树脂的然点也被写在王国老匠人的手记中，一缕火光就能让坚梁露出破绽。',
  'object:packed-earth': '松坡驿卒把湿土、石粉与古树细根层层夿紧，曾为王国修成不怕寒风的存粮基座。内城被占后，夯砖成了压住城墙的重锚；它们不会轻易移动，却能在支撑断裂时把敌人的高台压成归路。',
  'object:resin-glass': '镜林育光师发现透明松脂能把薄晶片包成导光长板，让林冠下的幼苗也能分到阳光。松鼠将它倒转成王庭弹墙，但每一次强烈反射都会继续奔向别处，懂得计算角度的橡宝便能把被夺走的光变成远征航线。',
  'object:leaf-iron-plate': '王庭工务营熔下仓门铰叶与巡林铃，把铸成的叶铁护板包在最后几座冬粮堡垒外。铁面能替木石挡住先到的冲击，却没法永远隐藏下方接缝；当树纹甲片脱落，便是橡心守备队夺回王城铁料的时刻。',
  'item:golden-acorn': '传说古树每记住一次守护者的勇气，树冠就会凝成一枚金橡果，里面封存着温暖季节的微光。远征营地把收回的金橡果用于重绘天赋路线；它既是珍贵筹码，也是橡心王国没有忘记任何一场战斗的证明。',
  'map:polar-clocktower': '北境居民曾用极夜钟楼的春晨发条校准播种日，司钟松鼠偷走它后，整片雪原永远停在黎明之前。摆锤、轮转风向与冰结齿轮仍依照旧时刻运作，远征队必须借这些失控机关登顶，把第一声晨钟还给王国。',
  'map:tidebound-undercity': '潮缚下城原是橡心王国储存雨季种子的水渠仓，闸门失守后，松鼠把浮台改成搬粮航道。涨落水位会改变每块建材的重量与抓地力，读懂潮汐就能让敌人的运输设施自行解体。',
  'map:mirrorwood-labyrinth': '镜林的树脂晶面本用于把微弱阳光引向林下幼苗，松鼠军团却扭转镜片，制造出真假难辨的守卫迷宫。真实目标的尾巴和弹道不会说谎；每次巧妙反弹，都像把一束被盗走的光重新折回橡心森林。',
  'map:deep-root-fault': '主树根系枯黄后，勘察队在地心根脉发现了压断细根的运矿轨道，松鼠正把根山石一车车运往地面堡垒。断层冲击会延迟传遍支撑链，懂得等待回声的远征者，能让整条矿线替王国清除自己。',
  'map:stormline-skyport': '雷云航站曾用树脂悬索把药草送往橡心王国最偏远的枝镇，如今航道被松鼠改造成空中军港。上升气流、翻转吊台与周期雷击仍听从天空而非王冠，削弱正确的钢索便能让风暴站到远征队一边。',
  'map:wind': '橡心森林的横风原有固定林道，松鼠大王架设巨型风机后，风向开始绕着堡垒反复改变。守备队把飘叶和尘线纳入观测记录：它们不只是景色，而是每枚橡宝起飞前都能读懂的无声路标。',
  'map:moving-platform': '王庭工务营拆下旧货梯木板，让两只飞鼠用绳索拉成巡航挡墙，专门截断橡心守备队的弹道。他们忘了，搬运者也是机关的承重点：破坏木板能开路，击落任一侧飞鼠也会让整块挡板坠落。',
})

const discoveryRecordIds = Object.keys(DISCOVERY_RECORDS)
const missingLoreIds = discoveryRecordIds.filter((id) => !DISCOVERY_LORE[id])
const orphanedLoreIds = Object.keys(DISCOVERY_LORE).filter((id) => !DISCOVERY_RECORDS[id])
if (missingLoreIds.length || orphanedLoreIds.length) {
  throw new Error(`Discovery lore registry mismatch: missing [${missingLoreIds.join(', ')}], orphaned [${orphanedLoreIds.join(', ')}]`)
}

export const DISCOVERIES = Object.freeze(Object.fromEntries(
  Object.entries(DISCOVERY_RECORDS).map(([id, entry]) => [id, Object.freeze({
    id,
    ...entry,
    lore: DISCOVERY_LORE[id],
  })]),
))

const BIRD_DISCOVERY_SHAPES = Object.freeze({
  red: {
    back: '',
    body: '<path class="discovery-shell discovery-shell-red discovery-outline" d="M60 16c20 0 31 18 28 39-3 20-15 31-28 31S35 75 32 55c-3-21 8-39 28-39Z"/>',
    cap: '<path class="discovery-cap discovery-cap-red discovery-outline" d="M35 30c6-12 15-17 25-17s19 5 25 17c-13 8-37 8-50 0Z"/><path class="discovery-bird-accent discovery-bird-accent-red discovery-outline-soft" d="M61 14c1-12 8-13 13-9-1 8-6 12-13 12Z"/>',
    symbol: '',
  },
  bomb: {
    back: '<path class="discovery-bomb-fin discovery-outline" d="m37 34-16 12 4 20 17 6m41-38 16 12-4 20-17 6"/>',
    body: '<path class="discovery-shell discovery-shell-bomb discovery-outline" d="m60 15 22 8 13 24-7 27-28 13-28-13-7-27 13-24Z"/>',
    cap: '<path class="discovery-cap discovery-cap-bomb discovery-outline" d="m31 31 9-14 15-5 5 5 5-5 15 5 9 14c-15 8-43 8-58 0Z"/><path class="discovery-bird-accent discovery-bird-accent-bomb discovery-outline-soft" d="M56 12h8v16h-8Z"/><path class="discovery-fuse" d="M64 14c17-13 25 3 31-6"/><path class="discovery-spark" d="m99 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>',
    symbol: '<path class="discovery-bomb-mark discovery-outline-soft" d="m60 58 3 6 7-2-3 7 6 4-8 1-1 7-5-6-6 4 2-8-7-2 7-4-3-7 7 3Z"/><circle class="discovery-bird-accent-bomb" cx="60" cy="69" r="3"/>',
  },
  split: {
    back: '<path class="discovery-split-wing discovery-outline" d="M43 33C23 17 8 32 16 51c9 9 20 4 31-4m30-14c20-16 35-1 27 18-9 9-20 4-31-4"/><path class="discovery-wing-line" d="M42 38 19 48m59-10 23 10"/>',
    body: '<path class="discovery-shell discovery-shell-split discovery-outline" d="M60 13c17 10 26 26 24 45-2 18-13 29-24 29S38 76 36 58c-2-19 7-35 24-45Z"/>',
    cap: '<path class="discovery-cap discovery-cap-split discovery-outline" d="M37 31c5-14 15-20 23-16 8-4 18 2 23 16-13 7-33 7-46 0Z"/><path class="discovery-bird-accent discovery-bird-accent-split discovery-outline-soft" d="M58 17C45 7 47 0 55 2c7 4 7 10 5 15m2 0C75 7 73 0 65 2c-7 4-7 10-5 15"/>',
    symbol: '<path class="discovery-symbol" d="M60 80V61m0 8L49 58m11 11 11-11"/><path class="discovery-split-seam" d="M60 37v45"/>',
  },
  dash: {
    back: '<path class="discovery-dash-fin discovery-outline" d="m44 31-25 17 17 4-13 18 25-9m28-30 25 17-17 4 13 18-25-9"/><path class="discovery-speed" d="M12 27h23M7 35h20"/>',
    body: '<path class="discovery-shell discovery-shell-dash discovery-outline" d="m60 11 20 25-4 30-16 22-16-22-4-30Z"/>',
    cap: '<path class="discovery-cap discovery-cap-dash discovery-outline" d="m38 32 22-20 22 20-12 7-10-10-10 10Z"/><path class="discovery-bird-accent discovery-bird-accent-dash discovery-outline-soft" d="m59 15 15-14-5 14 9-2-19 18Z"/>',
    symbol: '<path class="discovery-dash-mark discovery-outline-soft" d="m63 54-12 15h9l-5 14 16-20h-9Z"/>',
  },
  fire: {
    back: '<path class="discovery-fire-fin discovery-outline" d="M42 39C28 31 19 38 21 51c5 9 14 10 24 4m33-16c14-8 23-1 21 12-5 9-14 10-24 4"/><path class="discovery-fire-ember" d="M31 73c-7-9 2-15 6-22 5 8 7 15-6 22Zm58 0c7-9-2-15-6-22-5 8-7 15 6 22Z"/>',
    body: '<path class="discovery-shell discovery-shell-fire discovery-outline" d="M60 12c18 7 27 24 25 44-2 19-13 31-25 31S37 75 35 56c-2-20 7-37 25-44Z"/>',
    cap: '<path class="discovery-cap discovery-cap-fire discovery-outline" d="M36 32c6-14 15-20 24-20s18 6 24 20c-13 8-35 8-48 0Z"/><path class="discovery-fire-crown discovery-outline-soft" d="M48 20C41 10 49 4 54 1c-1 8 8 10 6 20C66 12 67 6 64 1c12 5 17 14 8 23Z"/>',
    symbol: '<path class="discovery-fire-core" d="M60 50c10 10 13 17 8 25-4 7-12 7-16 0-5-8-2-15 8-25Zm0 9c-4 6-5 10-2 13 2 2 5 1 6-2 1-3-1-7-4-11Z"/>',
  },
  drill: {
    back: '<path class="discovery-drill-fin discovery-outline" d="m42 38-22 12 20 8m38-20 22 12-20 8"/><path class="discovery-drill-tip discovery-outline" d="m60 89-12-12 6-4-8-7 8-4-6-7 12-6 12 6-6 7 8 4-8 7 6 4Z"/>',
    body: '<path class="discovery-shell discovery-shell-drill discovery-outline" d="M60 10 80 28l-3 35-17 26-17-26-3-35Z"/>',
    cap: '<path class="discovery-cap discovery-cap-drill discovery-outline" d="m39 30 7-14 14-7 14 7 7 14-12 8H51Z"/><path class="discovery-rivet" d="M48 23h4v4h-4zm20 0h4v4h-4z"/>',
    symbol: '<path class="discovery-drill-mark" d="m51 57 9-7 9 7-9 7Zm0 11 9-7 9 7-9 7Z"/>',
  },
  frost: {
    back: '<path class="discovery-frost-wing discovery-outline" d="m42 39-18-17 4 20-13 8 15 8-3 19 18-15m33-23 18-17-4 20 13 8-15 8 3 19-18-15"/>',
    body: '<path class="discovery-shell discovery-shell-frost discovery-outline" d="m60 10 19 15 8 26-9 27-18 11-18-11-9-27 8-26Z"/>',
    cap: '<path class="discovery-cap discovery-cap-frost discovery-outline" d="m37 31 8-17 15 8 15-8 8 17-12 8H49Z"/><path class="discovery-frost-bell discovery-outline-soft" d="M52 15c0-8 4-12 8-12s8 4 8 12l-8 6Z"/>',
    symbol: '<path class="discovery-frost-mark" d="M60 51v27m-12-20 24 13m0-13L48 71m7-17 5 5 5-5m-17 7 7 2-2 7m19-9-7 2 2 7"/>',
  },
  vine: {
    back: '<path class="discovery-vine-wing discovery-outline" d="M43 33C24 15 7 29 14 53c13 8 25 0 34-9m29-11c19-18 36-4 29 20-13 8-25 0-34-9"/><path class="discovery-vine-line" d="M43 38 18 49m59-11 25 11"/>',
    body: '<path class="discovery-shell discovery-shell-vine discovery-outline" d="M60 15c17 5 25 22 23 43-2 18-12 29-23 29S39 76 37 58c-2-21 6-38 23-43Z"/>',
    cap: '<path class="discovery-cap discovery-cap-vine discovery-outline" d="M38 31c5-13 13-19 22-19s17 6 22 19c-11 7-33 7-44 0Z"/><path class="discovery-vine-sprout discovery-outline-soft" d="M60 15C47 10 44 2 51 1c7 0 10 7 9 14Zm1 0c13-5 16-13 9-14-7 0-10 7-9 14Z"/>',
    symbol: '<path class="discovery-vine-mark" d="M50 57c18-11 24 8 9 10-12 1-10 14 4 12 8-1 11-7 9-12"/><path class="discovery-vine-leaf" d="M48 58c-8-7-13-2-10 5 5 4 9 1 10-5Zm24 9c8-7 13-2 10 5-5 4-9 1-10-5Z"/>',
  },
  boomerang: {
    back: '<path class="discovery-boomerang-wing discovery-outline" d="M42 31C18 20 5 39 20 52c8 7 16 8 25 3-13-1-18-8-13-15m46-9c24-11 37 8 22 21-8 7-16 8-25 3 13-1 18-8 13-15"/><path class="discovery-return-arrow" d="M26 68c8 15 25 21 40 15m0 0-8-6m8 6-8 5"/>',
    body: '<path class="discovery-shell discovery-shell-boomerang discovery-outline" d="M60 13c15 8 23 25 20 44-3 19-11 30-20 30S43 76 40 57c-3-19 5-36 20-44Z"/>',
    cap: '<path class="discovery-cap discovery-cap-boomerang discovery-outline" d="M39 31c6-13 13-18 21-18s15 5 21 18c-12 8-30 8-42 0Z"/><path class="discovery-boomerang-feather discovery-outline-soft" d="M59 16 47 4c-2 9 3 14 12 16m2-4L73 4c2 9-3 14-12 16"/>',
    symbol: '<path class="discovery-boomerang-mark" d="M47 63c8-13 24-11 26 1m0 0-1-8m1 8-8 1M73 70c-8 13-24 11-26-1m0 0 1 8m-1-8 8-1"/>',
  },
  quake: {
    back: '<path class="discovery-quake-foot discovery-outline" d="M30 69h20v16H25c-4-9-2-14 5-16Zm60 0H70v16h25c4-9 2-14-5-16Z"/><path class="discovery-quake-wave" d="M15 89h27m36 0h27M22 81h14m48 0h14"/>',
    body: '<path class="discovery-shell discovery-shell-quake discovery-outline" d="m38 25 22-13 22 13 5 42-12 20H45L33 67Z"/>',
    cap: '<path class="discovery-cap discovery-cap-quake discovery-outline" d="m35 31 7-17 12 5 6-12 7 12 11-5 7 17-14 7H49Z"/><path class="discovery-quake-ridge" d="M44 22h32M53 15l-2 19m17-19 2 19"/>',
    symbol: '<path class="discovery-quake-mark" d="m61 50-8 12 8 3-6 14m7-29 7 12-7 3 5 14"/>',
  },
})

const birdArt = (type) => {
  const shape = BIRD_DISCOVERY_SHAPES[type]
  return `
  <ellipse class="discovery-shadow" cx="60" cy="82" rx="29" ry="6"/>
  ${shape.back}
  ${shape.body}
  ${shape.cap}
  <path class="discovery-cap-line" d="m43 21 11 15m3-21 11 21m-1-15 9 12"/>
  <circle class="discovery-eye" cx="51" cy="48" r="5"/><circle class="discovery-eye" cx="69" cy="48" r="5"/>
  <circle class="discovery-pupil" cx="52" cy="49" r="2.2"/><circle class="discovery-pupil" cx="70" cy="49" r="2.2"/>
  <path class="discovery-face" d="M51 59c6 5 12 5 18 0"/>
  ${shape.symbol}`
}

const squirrelArt = (king) => `
  <ellipse class="discovery-shadow" cx="60" cy="82" rx="30" ry="6" />
  <path class="discovery-tail discovery-outline" d="M77 67c31 2 32-38 13-39-15-1-6 17-1 22-12-6-19 3-12 17Z" />
  <ellipse class="discovery-squirrel discovery-outline" cx="57" cy="57" rx="24" ry="22" />
  <path class="discovery-squirrel discovery-outline" d="m40 43 4-18 10 14m6 0 10-14 4 18" />
  <ellipse class="discovery-muzzle" cx="57" cy="63" rx="12" ry="9" />
  <circle class="discovery-eye" cx="49" cy="51" r="5"/><circle class="discovery-eye" cx="65" cy="51" r="5"/>
  <circle class="discovery-pupil" cx="50" cy="52" r="2"/><circle class="discovery-pupil" cx="66" cy="52" r="2"/>
  <path class="discovery-face" d="M54 64h6m-3 0v6" />
  ${king
    ? '<path class="discovery-crown discovery-outline" d="M37 35V15l10 8 10-13 10 13 10-8v20Z"/><path class="discovery-cape discovery-outline" d="M38 66 25 86h30l2-17 3 17h30L76 66"/>'
    : '<path class="discovery-armor discovery-outline" d="M36 42 31 26l13-9 13 7 13-7 13 9-6 16-9-7-11 6-11-6Z"/><path class="discovery-armor-line" d="M43 23v12m28-12v12" />'}
  <path class="discovery-teeth" d="M52 69h5v8h-5zm5 0h5v8h-5z" />`

const specialSquirrelFace = (x = 58, y = 53) => `
  <ellipse class="discovery-muzzle" cx="${x}" cy="${y + 10}" rx="11" ry="8"/>
  <circle class="discovery-eye" cx="${x - 8}" cy="${y}" r="4.5"/><circle class="discovery-eye" cx="${x + 8}" cy="${y}" r="4.5"/>
  <circle class="discovery-pupil" cx="${x - 7}" cy="${y + 1}" r="2"/><circle class="discovery-pupil" cx="${x + 9}" cy="${y + 1}" r="2"/>
  <path class="discovery-face" d="M${x - 3} ${y + 10}h6m-3 0v5"/>
  <path class="discovery-teeth" d="M${x - 5} ${y + 15}h5v7h-5zm5 0h5v7h-5z"/>`

const shieldSquirrelArt = `
  <ellipse class="discovery-shadow" cx="61" cy="84" rx="38" ry="6"/>
  <path class="discovery-special-tail discovery-special-tail-shield discovery-outline" d="M76 67c27 0 30-35 13-39-14-3-9 13-2 20-12-6-19 6-11 19Z"/>
  <ellipse class="discovery-special-squirrel discovery-squirrel-shield discovery-outline" cx="65" cy="58" rx="21" ry="22"/>
  <path class="discovery-special-squirrel discovery-squirrel-shield discovery-outline" d="m49 44 3-18 10 14m6 0 10-14 4 19"/>
  ${specialSquirrelFace(65, 53)}
  <path class="discovery-leaf-shield discovery-outline" d="M17 18c25-9 40 8 38 30-2 22-15 34-35 40-13-18-14-52-3-70Z"/>
  <path class="discovery-shield-rib" d="m21 78 24-47M25 66l-9-15m15 4 14-7"/>
  <circle class="discovery-shield-boss discovery-outline-soft" cx="33" cy="55" r="6"/>`

const engineerSquirrelArt = `
  <ellipse class="discovery-shadow" cx="60" cy="84" rx="34" ry="6"/>
  <path class="discovery-wrench discovery-outline" d="M28 72 48 35c-8-8-4-20 6-22l-5 10 7 4 7-9c4 10-3 19-12 20L35 77Z"/>
  <path class="discovery-special-tail discovery-special-tail-engineer discovery-outline" d="M77 68c29 1 32-35 14-40-13-3-9 12-2 20-14-6-20 7-12 20Z"/>
  <ellipse class="discovery-special-squirrel discovery-squirrel-engineer discovery-outline" cx="61" cy="59" rx="22" ry="22"/>
  <path class="discovery-special-squirrel discovery-squirrel-engineer discovery-outline" d="m45 44 3-17 10 13m7 0 10-13 3 18"/>
  ${specialSquirrelFace(61, 54)}
  <path class="discovery-engineer-cap discovery-outline" d="M41 43V27l8-8h23l9 9v15c-13-6-27-6-40 0Z"/>
  <path class="discovery-cap-lamp discovery-outline-soft" d="M56 19h11v10H56Z"/>
  <path class="discovery-toolbox discovery-outline" d="M76 62h27v23H76Zm6 0v-8h14v8"/><path class="discovery-gear-mark" d="M87 69h5l1 4 4 1v5l-4 1-1 4h-5l-1-4-4-1v-5l4-1Z"/>`

const gliderSquirrelArt = `
  <ellipse class="discovery-shadow" cx="60" cy="86" rx="42" ry="4"/>
  <path class="discovery-glider-wing discovery-outline" d="M48 39C31 24 15 20 5 25l15 16L5 55l43 17Zm24 0c17-15 33-19 43-14l-15 16 15 14-43 17Z"/>
  <path class="discovery-glider-rib" d="m45 45-34-17m35 28L12 53m63-8 34-17M74 56l34-3"/>
  <path class="discovery-special-tail discovery-special-tail-glider discovery-outline" d="M73 67c22 6 27-18 14-24-9-4-9 8-3 13-9-4-15 3-11 11Z"/>
  <ellipse class="discovery-special-squirrel discovery-squirrel-glider discovery-outline" cx="60" cy="57" rx="18" ry="21"/>
  <path class="discovery-special-squirrel discovery-squirrel-glider discovery-outline" d="m47 44 3-16 9 12m3 0 9-12 3 16"/>
  ${specialSquirrelFace(60, 53)}
  <path class="discovery-glider-goggles discovery-outline-soft" d="M43 51h12v9H43Zm22 0h12v9H65ZM55 55h10"/>`

const shamanSquirrelArt = `
  <circle class="discovery-shaman-aura" cx="58" cy="52" r="38"/>
  <path class="discovery-shaman-flake" d="M13 26v15m-7-11 14 8m0-8-14 8m91-17v15m-7-11 14 8m0-8-14 8"/>
  <ellipse class="discovery-shadow" cx="58" cy="84" rx="31" ry="6"/>
  <path class="discovery-special-tail discovery-special-tail-shaman discovery-outline" d="M74 68c28 2 31-34 14-38-14-3-8 14-2 20-13-7-20 6-12 18Z"/>
  <ellipse class="discovery-special-squirrel discovery-squirrel-shaman discovery-outline" cx="57" cy="59" rx="21" ry="22"/>
  <path class="discovery-special-squirrel discovery-squirrel-shaman discovery-outline" d="m42 44 3-17 10 13m5 0 10-13 3 17"/>
  ${specialSquirrelFace(57, 54)}
  <path class="discovery-shaman-crown discovery-outline" d="M40 39 31 24l13 5-1-20 13 15L64 5l4 20 13-13-3 22-8 7Z"/>
  <path class="discovery-shaman-staff" d="M89 85 95 25"/><path class="discovery-shaman-crystal discovery-outline" d="m95 12 9 12-9 11-9-11Z"/>`

const burrowerSquirrelArt = `
  <ellipse class="discovery-shadow" cx="60" cy="85" rx="45" ry="6"/>
  <path class="discovery-dirt-mound discovery-outline" d="M7 84c4-15 15-21 28-18 10-14 29-15 39-3 18-5 33 3 39 21Z"/>
  <path class="discovery-dirt-line" d="m14 77 14 2m61-6 17 4M31 69l9 5m42-8 7 5"/>
  <path class="discovery-special-tail discovery-special-tail-burrower discovery-outline" d="M78 69c19 2 25-20 12-25-9-4-9 8-3 12-9-3-14 6-9 13Z"/>
  <path class="discovery-special-squirrel discovery-squirrel-burrower discovery-outline" d="M39 69c0-23 8-34 21-34s22 11 22 34Z"/>
  <path class="discovery-special-squirrel discovery-squirrel-burrower discovery-outline" d="m45 46 1-14 10 8m8 0 10-8 1 14"/>
  ${specialSquirrelFace(60, 53)}
  <path class="discovery-burrower-helmet discovery-outline" d="M40 48c0-18 8-28 20-28s20 10 20 28c-13-6-27-6-40 0Z"/>
  <path class="discovery-helmet-lamp discovery-outline-soft" d="M55 20h10v12H55Z"/>
  <path class="discovery-shovel discovery-outline" d="m91 68 13-36m-7 2 14 5m-10 13 10 4-3 15-13-5Z"/>`

const DISCOVERY_ART = Object.freeze({
  'bird-red': birdArt('red'),
  'bird-bomb': birdArt('bomb'),
  'bird-split': birdArt('split'),
  'bird-dash': birdArt('dash'),
  'bird-fire': birdArt('fire'),
  'bird-drill': birdArt('drill'),
  'bird-frost': birdArt('frost'),
  'bird-vine': birdArt('vine'),
  'bird-boomerang': birdArt('boomerang'),
  'bird-quake': birdArt('quake'),
  'bird-talent-emberheart': `
    <ellipse class="discovery-shadow" cx="60" cy="84" rx="32" ry="6"/>
    <path class="discovery-talent-ember-flame discovery-outline" style="fill:#f24b32;stroke:#4a1f1a;stroke-width:3" d="M38 35C22 18 37 4 47 19 49 8 56 2 61 18 70 2 79 11 74 24 87 13 98 27 81 41Z"/>
    <path class="discovery-talent-ember-shell discovery-outline" style="fill:#8e3026;stroke:#4a1f1a;stroke-width:3" d="M60 17c19 0 29 16 27 37-2 20-14 32-27 32S35 74 33 54c-2-21 8-37 27-37Z"/>
    <path class="discovery-talent-ember-cap discovery-outline" style="fill:#5f2b22;stroke:#4a1f1a;stroke-width:3" d="M36 31c6-13 14-19 24-19s18 6 24 19c-12 8-36 8-48 0Z"/>
    <circle class="discovery-talent-ember-core discovery-outline-soft" style="fill:#ff5438;stroke:#ffd064;stroke-width:4" cx="60" cy="64" r="12"/>
    <path class="discovery-talent-ember-crack" style="fill:none;stroke:#ffc857;stroke-width:3;stroke-linecap:round" d="m44 44 8 8-5 11m29-20-8 9 5 12M60 39v11"/>
    <circle class="discovery-eye" cx="50" cy="47" r="5"/><circle class="discovery-eye" cx="70" cy="47" r="5"/>
    <circle class="discovery-pupil" cx="51" cy="48" r="2.2"/><circle class="discovery-pupil" cx="71" cy="48" r="2.2"/>
    <path class="discovery-face" d="M53 57c5 4 9 4 14 0"/>`,
  'bird-talent-prism-bell': `
    <ellipse class="discovery-shadow" cx="60" cy="85" rx="31" ry="5"/>
    <path class="discovery-talent-prism-ray" style="fill:none;stroke:#79dff2;stroke-width:4;stroke-linecap:round" d="M18 29h21M81 29h21M14 57h23m46 0h23M28 14l13 13m51-13L79 27"/>
    <path class="discovery-talent-prism discovery-outline" style="fill:#8ce9f7;stroke:#24546f;stroke-width:3" d="m60 7 23 17 9 31-14 28-18 8-18-8-14-28 9-31Z"/>
    <path class="discovery-talent-prism-facet" style="fill:#dffaff;stroke:#4ca9c4;stroke-width:2" d="m60 7 7 31-25-14Zm7 31 25 17-32 8Zm-25-14 18 39-32-8Zm18 39 18 20-18 8-18-8Z"/>
    <path class="discovery-talent-prism-bell discovery-outline-soft" style="fill:#eefcff;stroke:#246b8a;stroke-width:3" d="M47 23c1-13 7-19 13-19s12 6 13 19l-13 8Z"/>
    <circle class="discovery-talent-prism-clapper" style="fill:#61cce2;stroke:#24546f;stroke-width:2" cx="60" cy="29" r="4"/>
    <circle class="discovery-eye" cx="50" cy="48" r="5"/><circle class="discovery-eye" cx="70" cy="48" r="5"/>
    <circle class="discovery-pupil" cx="51" cy="49" r="2.2"/><circle class="discovery-pupil" cx="71" cy="49" r="2.2"/>
    <path class="discovery-face" d="M53 59c5 4 9 4 14 0"/>
    <path class="discovery-talent-prism-snow" style="fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round" d="M60 65v16m-7-12 14 8m0-8-14 8"/>`,
  'bird-talent-thunder-root': `
    <ellipse class="discovery-shadow" cx="60" cy="86" rx="37" ry="6"/>
    <path class="discovery-talent-thunder-bolt discovery-outline-soft" style="fill:#f2c14e;stroke:#4a2d61;stroke-width:3" d="m26 8 25 0-11 23 15 0-28 35 7-26H19Zm68 0H69l11 23H65l28 35-7-26h15Z"/>
    <path class="discovery-talent-thunder-shell discovery-outline" style="fill:#71419a;stroke:#3c254f;stroke-width:3" d="M60 15c18 4 27 20 25 41-2 19-13 30-25 30S37 75 35 56c-2-21 7-37 25-41Z"/>
    <path class="discovery-talent-thunder-cap discovery-outline" style="fill:#4f2f70;stroke:#3c254f;stroke-width:3" d="M37 31c5-13 13-19 23-19s18 6 23 19c-12 8-34 8-46 0Z"/>
    <path class="discovery-talent-thunder-root discovery-outline-soft" style="fill:none;stroke:#f2c14e;stroke-width:5;stroke-linecap:round;stroke-linejoin:round" d="M60 62v19m0-6-15 12m15-8 14 8m-6-16 10-9M52 70 41 61"/>
    <path class="discovery-talent-thunder-rune" style="fill:#f7d66d;stroke:#3c254f;stroke-width:2" d="m60 51-8 12h7l-4 12 13-17h-7l5-7Z"/>
    <circle class="discovery-eye" cx="50" cy="47" r="5"/><circle class="discovery-eye" cx="70" cy="47" r="5"/>
    <circle class="discovery-pupil" cx="51" cy="48" r="2.2"/><circle class="discovery-pupil" cx="71" cy="48" r="2.2"/>
    <path class="discovery-face" d="M53 57c5 4 9 4 14 0"/>`,
  'enemy-general': squirrelArt(false),
  'enemy-king': squirrelArt(true),
  'enemy-shield': shieldSquirrelArt,
  'enemy-engineer': engineerSquirrelArt,
  'enemy-glider': gliderSquirrelArt,
  'enemy-shaman': shamanSquirrelArt,
  'enemy-burrower': burrowerSquirrelArt,
  'object-stone': '<ellipse class="discovery-shadow" cx="60" cy="80" rx="30" ry="6"/><path class="discovery-stone discovery-outline" d="m30 26 23-14 28 8 13 24-8 31-30 10-28-17-6-24Z"/><path class="discovery-crack" d="m58 13-7 23 12 8-9 16 8 24m1-40 17-10m-26 26-17 7"/>',
  'object-ice': '<ellipse class="discovery-shadow" cx="60" cy="82" rx="30" ry="6"/><path class="discovery-ice discovery-outline" d="M32 14h56v68H32Z"/><path class="discovery-ice-glint" d="m43 24 18 0-20 38m38-35-20 41m-13 7 12-4"/>',
  'object-wood-nails': '<ellipse class="discovery-shadow" cx="60" cy="84" rx="42" ry="6"/><path class="discovery-platform discovery-outline" d="M12 31h96v22H12Z"/><path class="discovery-platform discovery-outline" d="M49 8h22v80H49Z"/><path class="discovery-platform-line" d="M20 38h31m18 8h31M56 15v22m8 27v17"/><circle class="discovery-rivet discovery-outline-soft" cx="54" cy="36" r="5"/><circle class="discovery-rivet discovery-outline-soft" cx="66" cy="48" r="5"/>',
  'object-stone-masonry': '<ellipse class="discovery-shadow" cx="60" cy="84" rx="43" ry="6"/><path class="discovery-stone discovery-outline" d="M10 15h46v28H10Z"/><path class="discovery-stone discovery-outline" d="M61 15h49v28H61Z"/><path class="discovery-stone discovery-outline" d="M10 48h30v31H10Z"/><path class="discovery-stone discovery-outline" d="M45 48h65v31H45Z"/><path class="discovery-map-line" d="M58 15v28M42 48v31M10 45h100"/><path class="discovery-crack" d="m58 22-5 7 7 6-5 8m-13 12 6 7-5 9 5 7"/>',
  'object-canvas-screen': '<ellipse class="discovery-shadow" cx="60" cy="85" rx="45" ry="5"/><path class="discovery-platform discovery-outline" d="M19 14h9v70h-9Zm73 0h9v70h-9Z"/><path class="discovery-canvas-screen discovery-flag discovery-outline" d="M28 22c17-10 47 10 64 0v48c-20 11-43-10-64 1Z"/><path class="discovery-map-line" d="m29 23 31 23 31-23M29 70l31-24 31 23"/><path class="discovery-wind" d="M7 32h29m-34 13h25m72-7h16m-20 14h22"/>',
  'object-resin-timber': '<ellipse class="discovery-shadow" cx="60" cy="84" rx="43" ry="6"/><path class="discovery-resin-timber discovery-platform discovery-outline" d="M10 25h100v28H10Z"/><path class="discovery-platform-line" d="M18 34c17 9 28-8 45 0s26-7 39 1M20 45h76"/><path class="discovery-gold discovery-outline-soft" d="M24 52h14v19c0 9-14 9-14 0Zm58 0h13v12c0 8-13 8-13 0Z"/><path class="discovery-leaf" d="M53 25c-2-13 7-19 15-16 1 10-6 17-15 16Z"/>',
  'object-packed-earth': '<ellipse class="discovery-shadow" cx="60" cy="85" rx="44" ry="6"/><path class="discovery-packed-earth discovery-stone discovery-outline" d="M12 22h45v27H12Zm49-7h47v34H61ZM12 54h32v26H12Zm37 0h59v26H49Z"/><path class="discovery-map-line" d="M12 51h96M59 17v32M46 54v26"/><path class="discovery-crack" d="m29 28 8 7-6 9m49-20-9 9 8 10M66 57l-8 9 10 9"/><path class="discovery-leaf" d="M48 48c8-12 17-10 19-3-5 8-12 9-19 3Z"/>',
  'object-resin-glass': '<ellipse class="discovery-shadow" cx="60" cy="83" rx="34" ry="6"/><path class="discovery-resin-glass discovery-ice discovery-outline" d="M24 11h72v70H24Z"/><path class="discovery-gold discovery-outline-soft" d="M28 16h64v8H28Zm0 49h64v12H28Z"/><path class="discovery-ice-glint" d="m40 27 20 0-21 39m43-34-20 38"/><path class="discovery-map-line" d="M26 47h66"/><path class="discovery-spark" d="m100 15 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  'object-leaf-iron-plate': '<ellipse class="discovery-shadow" cx="60" cy="84" rx="40" ry="6"/><path class="discovery-leaf-iron-plate discovery-armor discovery-outline" d="M18 20 60 9l42 11-5 43c-10 14-22 22-37 28-15-6-27-14-37-28Z"/><path class="discovery-armor-line" d="M60 14v71M27 24l33 18 33-18M29 61h62"/><circle class="discovery-rivet discovery-outline-soft" cx="31" cy="27" r="4"/><circle class="discovery-rivet discovery-outline-soft" cx="89" cy="27" r="4"/><circle class="discovery-rivet discovery-outline-soft" cx="60" cy="75" r="4"/><path class="discovery-leaf" d="M60 30c19 6 22 18 13 26-11 2-18-8-13-26Zm0 0c-19 6-22 18-13 26 11 2 18-8 13-26Z"/>',
  'item-golden-acorn': '<ellipse class="discovery-shadow" cx="60" cy="82" rx="25" ry="5"/><path class="discovery-gold discovery-outline" d="M60 20c19 0 28 15 25 33-3 19-13 30-25 30S38 72 35 53c-3-18 6-33 25-33Z"/><path class="discovery-gold-cap discovery-outline" d="M38 32c5-13 13-19 22-19s17 6 22 19c-12 6-32 6-44 0Z"/><path class="discovery-leaf" d="M60 14c1-11 8-13 14-9-1 8-7 12-14 12Z"/><path class="discovery-spark" d="m92 16 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  'map-wind': '<path class="discovery-flagpole" d="M33 82V13"/><path class="discovery-flag discovery-outline" d="M34 17c18-9 31 9 51-1v28c-20 10-33-8-51 1Z"/><path class="discovery-wind" d="M17 56h46c13 0 14 16 2 16-6 0-8-4-6-8m-42-20h71c14 0 15-18 2-18-7 0-9 5-7 9"/>',
  'map-moving-platform': '<ellipse class="discovery-shadow" cx="60" cy="88" rx="42" ry="5"/><path class="discovery-glider-wing discovery-outline" d="M31 24 10 13l8 17-11 9 26 4Zm58 0 21-11-8 17 11 9-26 4Z"/><circle class="discovery-platform-carrier discovery-special-squirrel discovery-outline" cx="34" cy="27" r="12"/><circle class="discovery-platform-carrier discovery-special-squirrel discovery-outline" cx="86" cy="27" r="12"/><circle class="discovery-eye" cx="30" cy="25" r="3"/><circle class="discovery-eye" cx="38" cy="25" r="3"/><circle class="discovery-eye" cx="82" cy="25" r="3"/><circle class="discovery-eye" cx="90" cy="25" r="3"/><path class="discovery-map-line discovery-platform-rope" d="M31 39 25 57m64-18 6 18"/><path class="discovery-platform discovery-outline" d="M13 55h94v18H13Z"/><path class="discovery-platform-line" d="M21 61h78M29 68h42"/><path class="discovery-crack" d="m60 56-5 7 8 3-6 7"/>',
  'map-polar-clocktower': '<circle class="discovery-special-map discovery-outline" cx="60" cy="45" r="31"/><path class="discovery-map-line" d="M60 45V23m0 22 17 10M28 84h64M39 76V45m42 31V45"/><path class="discovery-map-accent" d="M18 18c22-15 43 14 84-4M22 28c27-13 42 14 78-1"/>',
  'map-tidebound-undercity': '<path class="discovery-special-map discovery-outline" d="M23 63h74v21H23Zm11 0V35h20v28m12 0V25h20v38"/><path class="discovery-map-line" d="M14 69c10-8 20 8 30 0s20 8 30 0 20 8 30 0M14 80c10-8 20 8 30 0s20 8 30 0 20 8 30 0"/><circle class="discovery-map-accent" cx="92" cy="22" r="9"/>',
  'map-mirrorwood-labyrinth': '<path class="discovery-special-map discovery-outline" d="m60 8 38 25-14 47H36L22 33Z"/><path class="discovery-map-line" d="m60 8 6 36 32-11M66 44 36 80m30-36 18 36M22 33l44 11"/><path class="discovery-map-accent" d="m60 8 6 36-44-11Z"/>',
  'map-deep-root-fault': '<path class="discovery-special-map discovery-outline" d="M18 18h84v66H18Z"/><path class="discovery-map-line" d="M60 11 49 31l12 11-17 17 12 27m-7-55L27 20m34 22 30-18M44 59 24 75m32 11 32-17"/><path class="discovery-map-accent" d="M18 58h28l9 7 47-4v23H18Z"/>',
  'map-stormline-skyport': '<path class="discovery-special-map discovery-outline" d="M21 57h78v18H21Z"/><path class="discovery-map-line" d="M35 57 49 29h22l14 28M28 75l-8 12m72-12 8 12"/><path class="discovery-map-accent" d="M66 7 47 39h14L50 66l28-37H64Z"/>',
})

export const DISCOVERY_IDS = Object.freeze(Object.keys(DISCOVERIES))

export function discoveryArtMarkup(id) {
  const entry = DISCOVERIES[id]
  if (!entry) throw new RangeError(`Unknown discovery: ${id}`)
  const art = DISCOVERY_ART[entry.art]
  if (!art) throw new RangeError(`Missing discovery art: ${entry.art}`)
  const constructionId = id.startsWith('object:') ? id.slice('object:'.length) : ''
  const visual = CONSTRUCTION_MATERIALS[constructionId]?.visual
  const visualBinding = visual
    ? ` data-construction-id="${constructionId}" data-visual-motif="${visual.motif}" style="--construction-fill:${visual.fill};--construction-outline:${visual.outline};--construction-line:${visual.line};--construction-accent:${visual.accent};--construction-secondary:${visual.secondary}"`
    : ''
  return `<svg class="discovery-svg"${visualBinding} viewBox="0 0 120 96" aria-hidden="true" focusable="false">${art}</svg>`
}
