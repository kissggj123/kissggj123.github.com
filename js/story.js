/* =========================================================================
 * story.js — 兔可可的魔塔档案馆 · 内容层
 * 地图 / 怪物 / 装备 / 技能 / 商店 / 成就 / 剧情台词
 * 由 engine.js 消费。改动地图后必须跑 node tools/validate-maps.mjs js/story.js
 * ========================================================================= */
'use strict';

/* -------------------------------------------------------------------------
 * 一、地图
 * 图例：
 *   #  墙          .  地板        S  出生点      T  上传送门(下一层)
 *   N  兔可可NPC    M  怪物        B  Boss        C  项目宝箱
 *   E  装备箱      G  宝石        H  血瓶        K  黄钥匙
 *   L  蓝钥匙      Y  黄门        D  蓝门        R  红门
 *   $  商店        P  车库传送门(彩蛋)
 * 尺寸统一 15 宽 × 11 高
 * ---------------------------------------------------------------------- */
const MAPS = [
  /* ---------- 1F 教学层 ---------- */
  [ '###############',
    '#S........#..K#',
    '#.#.#.#.#G#C#.#',
    '#...#...#.#...#',
    '#H#######.###.#',
    '#.....H..K#...#',
    '#.#.#.#.#...#.#',
    '#KY.....#.#.#.#',
    '#.####.##.#.#.#',
    '#....N.....G.T#',
    '###############' ],
  /* ---------- 2F 座舱与车机 ---------- */
  [ '###############',
    '#S.......M.K..#',
    '#.#.###N#K#...#',
    '#.#.G...#.#L..#',
    '#.#######.###.#',
    '#.G.....C.D...#',
    '#.###H..#.#.#.#',
    '#.............#',
    '#.#E###.####M.#',
    '#............T#',
    '###############' ],
  /* ---------- 3F 桌宠与 AI ---------- */
  [ '###############',
    '#S..#MNH......#',
    '#.#MKL###M#.#.#',
    '#....G#.....#.#',
    '#.#.#.#.#.#.#.#',
    '#.C.....#.#...#',
    '#.....#.#.#.K.#',
    '#...........#.#',
    '#.#.#.#.#..G#.#',
    '#.E.#..$.....T#',
    '###############' ],
  /* ---------- 4F 游戏研发 ---------- */
  [ '###############',
    '#S.....H..#..L#',
    '#..G##.##.#.#.#',
    '#C..#M..#.....#',
    '##KE..#.#D#$#Y#',
    '#..M....#.K...#',
    '#.#####.#.###.#',
    '#G#G......#..H#',
    '#..ML#.##N#.#.#',
    '#............T#',
    '###############' ],
  /* ---------- 5F 极客工具箱 ---------- */
  [ '###############',
    '#S..#.....M...#',
    '#.#.#.C.#L#.#.#',
    '#.#.K.#.#...#.#',
    '#.##..#.#.#$.E#',
    '#NG.GM#.#.#G..#',
    '#.#####.#.#.L##',
    '#.#...#K..#MH.#',
    '#.#...##M.##..#',
    '#...#........T#',
    '###############' ],
  /* ---------- 6F 生活与创意 ---------- */
  [ '###############',
    '#S.H#.....#...#',
    '#.#.#.#.#.#.#.#',
    '#K#..P#.#...#G#',
    '#.###M.G#.KL#.#',
    '#..N......C.#.#',
    '#..H.####L###.#',
    '#M#.......#M..#',
    '#.#.#####.G.#.#',
    '#...EM.......T#',
    '###############' ],
  /* ---------- 7F 终章 Boss ---------- */
  [ '###############',
    '#S..#.........#',
    '#.#.#.#.#.#.#.#',
    '#.#...#.......#',
    '#G#.#C###.###M#',
    '#.K......K....#',
    '#H##....#H.M#.#',
    '#.DM..B.....#.#',
    '#.#.#####..##.#',
    '#NG.......L..T#',
    '###############' ]
];

/* -------------------------------------------------------------------------
 * 二、怪物表
 * ---------------------------------------------------------------------- */
const MONSTERS = {
  m1: { name: '内存泄漏史莱姆', icon: '🟢', hp: 220, atk: 46, def: 8,  xp: 30,  drop: { key: 'y', p: 0.6 } },
  m2: { name: '404 幽灵',      icon: '👻', hp: 320, atk: 62, def: 18, xp: 55,  drop: { gem: 3 } },
  m3: { name: 'NullPointer',   icon: '😈', hp: 460, atk: 84, def: 30, xp: 90,  drop: { gem: 4 } },
  m4: { name: '死循环编织者',   icon: '🕸️', hp: 620, atk: 104, def: 42, xp: 130, drop: { gem: 5 } },
  m5: { name: '未捕获异常',     icon: '💥', hp: 760, atk: 122, def: 52, xp: 170, drop: { key: 'b', p: 0.5 } },
  m6: { name: '合并冲突兽',     icon: '⚔️', hp: 900, atk: 142, def: 62, xp: 220, drop: { gem: 8 } },
  m7: { name: '内存溢出巨兽',   icon: '🐋', hp: 1100, atk: 166, def: 74, xp: 300, drop: { gem: 10 } },
  boss: { name: 'Bug 之王',     icon: '👑', hp: 2200, atk: 210, def: 96, xp: 900, boss: true, drop: { equip: 'e_crown' } },
  /* 二周目地下档案馆怪物（数值由 cycle 系数再上调） */
  g1: { name: '被遗忘的 commit', icon: '📜', hp: 1300, atk: 180, def: 82, xp: 350, drop: { gem: 12 } },
  g2: { name: '快照幽灵',        icon: '🕯️', hp: 1500, atk: 200, def: 92, xp: 420, drop: { key: 'b', p: 0.7 } },
  g3: { name: '归档者',          icon: '🗄️', hp: 1800, atk: 228, def: 106, xp: 520, boss: true, drop: { equip: 'e_ghost' } }
};

/* 楼层 → 怪物引用（地图字符 → 怪物 id） */
const FLOOR_MONSTERS = ['m1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm7'];

/* -------------------------------------------------------------------------
 * 三、装备表（三槽位 + 词条特效）
 * effect 白名单：xpBonus(百分比) / keyPerFloor(每层送黄钥匙) / firstFreePct(首回合免伤%)
 * ---------------------------------------------------------------------- */
const EQUIPS = {
  e_stick:  { name: '胡萝卜短剑',     slot: 'weapon',    rarity: 1, icon: '🥕', atk: 10 },
  e_key:    { name: '传说中的机械键盘', slot: 'weapon',   rarity: 2, icon: '⌨️', atk: 22 },
  e_blade:  { name: 'Bug 之王残刃',   slot: 'weapon',    rarity: 3, icon: '🗡️', atk: 38, def: 6 },
  e_film:   { name: '防烧屏镀膜',     slot: 'armor',     rarity: 1, icon: '🛡️', def: 10 },
  e_head:   { name: '兔耳发带',       slot: 'armor',     rarity: 1, icon: '🎀', def: 8, effect: { keyPerFloor: 1 } },
  e_vest:   { name: '线程安全背心',   slot: 'armor',     rarity: 2, icon: '🧥', def: 20 },
  e_crown:  { name: 'Bug 之王冠冕',   slot: 'armor',     rarity: 3, icon: '👑', def: 36, atk: 8 },
  e_pendant:{ name: '幸运胡萝卜吊坠', slot: 'accessory', rarity: 2, icon: '🌙', effect: { xpBonus: 15 } },
  e_ghost:  { name: '档案幽灵印记',   slot: 'accessory', rarity: 3, icon: '🕯️', effect: { firstFreePct: 100 } },
  e_ring:   { name: '断点项链',       slot: 'accessory', rarity: 1, icon: '💍', effect: { firstFreePct: 30 } }
};

/* 开箱池（按稀有度分组） */
const GACHA_POOL = ['e_stick', 'e_film', 'e_head', 'e_ring', 'e_key', 'e_vest', 'e_pendant', 'e_blade', 'e_crown', 'e_ghost'];

/* -------------------------------------------------------------------------
 * 四、技能表（被动常驻 / 主动冷却）
 * ---------------------------------------------------------------------- */
const SKILLS = {
  s_fluff:  { name: '护体绒毛', type: 'passive', desc: '每场战斗首回合免伤 100%' },
  s_debug:  { name: 'Debug 重击', type: 'active', cd: 3, desc: '本场无视 50% 怪物防御' },
  s_git:    { name: 'Git Revert', type: 'active', cd: 4, desc: '本场取消怪物全部攻击 1 回合' },
  s_review: { name: 'Code Review', type: 'passive', desc: '获得的 XP +20%' },
  s_cache:  { name: '缓存命中', type: 'passive', desc: '宝石收益 +50%' }
};

/* -------------------------------------------------------------------------
 * 五、商店商品（S 格）
 * ---------------------------------------------------------------------- */
const SHOP_ITEMS = [
  { id: 'atk',  name: '⚔️ 攻击 +6',      cost: 20, unit: 'gem', apply: g => { g.atk += 6; } },
  { id: 'def',  name: '🛡️ 防御 +6',      cost: 20, unit: 'gem', apply: g => { g.def += 6; } },
  { id: 'hp',   name: '❤️ 生命上限 +300', cost: 30, unit: 'gem', apply: g => { g.maxHp += 300; g.hp += 300; } },
  { id: 'ky',   name: '🔑 黄钥匙 ×1',    cost: 12, unit: 'gem', apply: g => { g.keys.y += 1; } },
  { id: 'kb',   name: '🔵 蓝钥匙 ×1',    cost: 30, unit: 'gem', apply: g => { g.keys.b += 1; } },
  { id: 'kr',   name: '🔴 红钥匙 ×1',    cost: 50, unit: 'gem', apply: g => { g.keys.r += 1; } },
  { id: 'sk_debug', name: '📘 研习「Debug 重击」', cost: 120, unit: 'xp', once: 's_debug', apply: g => { g.skills.push('s_debug'); } },
  { id: 'sk_git',   name: '📘 研习「Git Revert」',  cost: 180, unit: 'xp', once: 's_git',   apply: g => { g.skills.push('s_git'); } }
];

/* -------------------------------------------------------------------------
 * 六、充值档位 SKU
 * ---------------------------------------------------------------------- */
const SKUS = {
  /* —— 直购礼包（price 显示价 / coins 参与随机折扣结算的标价数字） —— */
  c6:      { name: '🥕 首充礼包',       price: '¥ 6.00',   coins: 6,    desc: '宝石 ×60　黄钥匙 ×2',                 apply: g => { g.gem += 60; g.keys.y += 2; } },
  c30:     { name: '🧧 胡萝卜福袋',     price: '¥ 30.00',  coins: 30,   desc: '宝石 ×300',                           apply: g => { g.gem += 300; } },
  c98:     { name: '📦 档案补给箱',     price: '¥ 98.00',  coins: 98,   desc: '宝石 ×1000 + 稀有装备 ×1',            apply: g => { g.gem += 1000; }, gachaMin: 2 },
  c328:    { name: '💎 至尊礼包',       price: '¥ 328.00', coins: 328,  desc: '宝石 ×4000 + 三色钥匙 + 史诗 ×1',     apply: g => { g.gem += 4000; g.keys.y += 3; g.keys.b += 3; }, gachaMin: 3 },
  c648:    { name: '🧧 超级氪金礼包',   price: '¥ 648.00', coins: 648,  desc: '生命上限 +1000　攻击 +60　防御 +60　三色钥匙各 5', apply: g => { g.maxHp += 1000; g.hp += 1000; g.atk += 60; g.def += 60; g.keys.y += 5; g.keys.b += 5; } },
  box:     { name: '🎁 神秘装备箱 ×1',  price: '¥ 88.00',  coins: 88,   desc: '随机开出一件装备（普通 60% / 稀有 30% / 史诗 10%）', isBox: true },

  /* —— 订阅 / 通行证（权益类，购买后持续生效） —— */
  monthly: { name: '🌙 兔可可月卡',     price: '¥ 30.00',  coins: 30,   desc: '立即返 288 币 · 之后每层额外领 88 币（30 天）',  vip: 'monthly' },
  yearly:  { name: '🎫 年费大会员',     price: '¥ 328.00', coins: 328,  desc: '每层额外领 200 币 · 战斗 XP +10% · 金框头像',    vip: 'yearly' },
  season:  { name: '🎃 Season Pass',    price: '¥ 98.00',  coins: 98,   desc: '本赛季通行证：开箱保底稀有 · 宝石获取 +50%',      vip: 'season' },
  sub:     { name: '📺 连续订阅套餐',   price: '¥ 18.00',  coins: 18,   desc: '自动续订（并不会）· 每层额外领 38 币',            vip: 'sub' },

  /* —— 奇趣氪金项目（效果玄学，纯属自愿） —— */
  nail:    { name: '🍼 意义不明的猫粮', price: '¥ 6.00',   coins: 6,    type: 'weird', desc: '喂给兔可可。什么都不会发生（也不应该发生）' },
  koi:     { name: '🐟 放生锦鲤',       price: '¥ 20.00',  coins: 20,   type: 'weird', desc: '心诚则灵。转发的锦鲤终于轮到你了（结果随机）', apply: g => { const r = Math.random(); if (r < 0.3) { g.coins = (g.coins || 0) + 50; toast('🐟 锦鲤显灵！兔可可币 +50'); } else if (r < 0.6) { g.gem += 2; toast('🐟 锦鲤吐了个泡泡：宝石 +2'); } else toast('🐟 锦鲤看了你一眼，游走了……'); } },
  wish:    { name: '🧧 抽卡祈愿券',     price: '¥ 45.00',  coins: 45,   type: 'weird', desc: '下次开箱必定提升一个品质档（可叠加）', apply: g => { g.wish = (g.wish || 0) + 1; toast('🧧 祈愿已记录：下次开箱品质 +1 档'); } },
  rescue:  { name: '🚑 感动兔可可急救包', price: '¥ 88.00', coins: 88,  type: 'weird', desc: '兔可可推着担架赶来，立即恢复 50% HP', apply: g => { g.hp = Math.min(g.maxHp, g.hp + Math.round(g.maxHp * 0.5)); toast('🚑 急救完成！HP 回复 50%'); } },
  reroll:  { name: '🐾 命运重摇费',     price: '¥ 50.00',  coins: 50,   type: 'weird', desc: '向档案馆缴纳手续费，重置全部技能冷却', apply: g => { g.cds = {}; toast('🐾 技能冷却已全部重置'); } },
  rocket:  { name: '🚀 火箭心意',       price: '¥ 666.00', coins: 666,  type: 'weird', desc: '给铲屎官送上火箭，全档案馆广播（并没有全服）', apply: g => { toast('🚀 ' + (g.name || '访客') + ' 送出了火箭！兔可可：谢谢老板！！', 'ach'); } }
};

/* -------------------------------------------------------------------------
 * 七、成就（26 枚）
 * ---------------------------------------------------------------------- */
const ACHS = {
  // 楼层通关 8
  f1:  { name: '初来乍到',     desc: '走出教学层' },
  f2:  { name: '座舱检修员',   desc: '通关 2F 座舱与车机' },
  f3:  { name: '桌宠饲养员',   desc: '通关 3F 桌宠与 AI' },
  f4:  { name: '游戏开发者',   desc: '通关 4F 游戏研发' },
  f5:  { name: '极客工程师',   desc: '通关 5F 极客工具箱' },
  f6:  { name: '生活家',       desc: '通关 6F 生活与创意' },
  f7:  { name: 'Bug 终结者',   desc: '击败 Bug 之王' },
  trueend: { name: '真相之下', desc: '抵达真结局' },
  // 图鉴里程碑 5
  c10:  { name: '图鉴·初探',   desc: '收录 10 个项目' },
  c50:  { name: '图鉴·五十',   desc: '收录 50 个项目' },
  c100: { name: '图鉴·百连收藏', desc: '收录 100 个项目' },
  c150: { name: '图鉴·渊博',   desc: '收录 150 个项目' },
  c180: { name: '图鉴·圆满',   desc: '收录全部 180 个项目' },
  // 剧情隐藏选择 4
  curious:  { name: '好奇心害死兔', desc: '在第一层翻遍了所有角落' },
  thrifty:  { name: '精打细算',     desc: '全程未在商店消费' },
  collector:{ name: '装备控',       desc: '同时装备三件史诗装备' },
  ghostdoor:{ name: '车库传送门',   desc: '找到通往车机锁屏的隐藏入口' },
  // 二周目 3
  ng2:  { name: '记忆回流',     desc: '进入第二周目' },
  ng3:  { name: '三世之影',     desc: '进入第三周目' },
  archive: { name: '记忆修复师', desc: '通关地下档案馆' },
  // 全项目浏览/全成就/隐藏彩蛋 4
  browse:   { name: '逐条通读',   desc: '在图鉴中展开 20 个条目详情' },
  allach:   { name: '全成就',     desc: '解锁其他所有成就' },
  easter:   { name: 'console 的信徒', desc: '在控制台打印 banner' },
  // 作弊 + 氪金
  cheat: { name: '⌨ 开挂的人生', desc: '使用控制台作弊' },
  whale: { name: '💎 氪金玩家',   desc: '完成一次模拟支付' },
  silly: { name: '🥴 人傻钱多',   desc: '购买「意义不明的猫粮」' }
};

/* -------------------------------------------------------------------------
 * VIP 会员等级特权制度（成长值 = 累计实付兔可可币）
 * ---------------------------------------------------------------------- */
const VIP_LEVELS = [
  { lv: 1,  exp: 100,      name: 'V1 萌新兔',       perk: '解锁会员专属客服（兔可可假装在线）' },
  { lv: 2,  exp: 500,      name: 'V2 存钱兔',       perk: '每层结算余额利息 +1%' },
  { lv: 3,  exp: 1500,     name: 'V3 精明兔',       perk: '兔可可商店全场 95 折' },
  { lv: 4,  exp: 5000,     name: 'V4 豪横兔',       perk: '折扣不满意自动重摇一次，取更优' },
  { lv: 5,  exp: 12000,    name: 'V5 土豪兔',       perk: '每层额外领取 66 兔可可币' },
  { lv: 6,  exp: 30000,    name: 'V6 钻石兔',       perk: '战斗 XP +15% · 宝石 +10% · 坏消息减半' },
  { lv: 7,  exp: 80000,    name: 'V7 星耀兔',       perk: '开箱保底史诗品质' },
  { lv: 8,  exp: 200000,   name: 'V8 王者兔',       perk: '每层额外领 233 币 · 随机事件概率翻倍（好事也翻倍）' },
  { lv: 9,  exp: 500000,   name: 'V9 氪金兔皇',     perk: '专属称号「氪金兔皇」· 全属性 +10% · 坏消息再减半' },
  { lv: 10, exp: 1000000,  name: 'V10 档案馆合伙人', perk: '击败 Boss 返现 · 权益永不过期 · 兔可可改口叫你老板' }
];

/* -------------------------------------------------------------------------
 * 八、序章 / 楼层剧情台词
 * ---------------------------------------------------------------------- */
const FLOOR_NAMES = ['1F 教学层', '2F 座舱与车机', '3F 桌宠与 AI', '4F 游戏研发', '5F 极客工具箱', '6F 生活与创意', '7F 终章'];

const FLOOR_INTRO = [
  ['欢迎来到「兔可可的魔塔档案馆」！', '这里收藏着铲屎官写过的每一个项目。打开 📦 宝箱、阅读记忆碎片，就能把它们收录进图鉴。', '绿色的是怪物、金色的是门——钥匙要省着用。右下角的 🌀 楼梯通往下一层。'],
  ['二层是『座舱与车机』。', '兔可可最喜欢的那台车的锁屏，就是从这里开始的。小心 404 幽灵，它总在你找东西时出现。'],
  ['三层『桌宠与 AI』……', '会撒娇也会顶嘴的玩具们住在这里。它们最近学会了自己整理 commit 历史，有点毛骨悚然。'],
  ['四层是『游戏研发』。', '一进门就能听见键盘被按碎的声音。这里住着痛苦，也住着热爱。'],
  ['五层『极客工具箱』。', '每一个小工具都是为了让兔子多摸三分钟鱼。别小看这些脚本，它们在关键时刻会救命。'],
  ['六层『生活与创意』。', '代码之外还有别的东西值得被记住——比如一颗颗拼起来的豆子。'],
  ['七层。空气变冷了。', '👑 Bug 之王就坐在尽头，据说它吞掉过无数个 commit。准备好了就去挑战它吧。']
];

const FLOOR_CLEAR = [
  '教学层通过啦！你已经学会走路、打架和开门了。',
  '座舱的灯亮起来了……兔可可说，那段代码曾经整夜整夜地亮着。',
  '桌宠们围过来蹭你的鞋尖，好像在说「谢谢你来过」。',
  '这一层的键盘声停了。它们好像终于可以睡了。',
  '工具收进抽屉，但那个抽屉永远不会锁上。',
  '拼豆落地的声音很轻，像有人在轻轻鼓掌。',
  '档案柜深处传来一声「咔嗒」。有什么东西被打开了。'
];

const BASEMENT_INTRO = [
  ['你按下了档案柜的绿光。', '楼梯向下延伸，墙壁上浮出不属于这里的文字。', '兔可可的声音变了：「……我好像，记得这里。」']
];

/* 真结局台词 */
const TRUE_END = [
  'B3 的最深处只有一本书。',
  '翻开它，里面写满了名字和日期——不是项目，是陪伴。',
  '「兔可可王国的每一层，都是用铲屎官的记忆筑成的。」',
  '「他不是在写代码，他是在把喜欢的东西，一件一件存起来。」',
  '兔可可在你身边安静了很久。',
  '然后它说：「谢谢你，愿意一直陪我读完。」',
  '—— 档案馆不会关闭。灯会一直亮着。'
];

/* -------------------------------------------------------------------------
 * 九、兜底职业（无 Key）
 * ---------------------------------------------------------------------- */
const FALLBACK_CLASS = {
  name: '兔可可',
  desc: '档案管理员本兔，均衡型，一手绒毛一手钥匙。',
  maxHp: 1200, atk: 58, def: 42,
  skills: ['s_fluff']
};

const FALLBACK_GHOST = {
  name: '档案幽灵',
  desc: '二周目限定：档案馆里游荡的前代访客，带着上一次的记忆。',
  maxHp: 1400, atk: 72, def: 52,
  skills: ['s_fluff', 's_review']
};

/* -------------------------------------------------------------------------
 * 十、图鉴兜底数据（projects.json 加载失败时）
 * ---------------------------------------------------------------------- */
const FALLBACK_CODEX = [
  { name: 'Bunny-Cockpit-OS', desc: '兔可可王国的车机锁屏系统', url: 'https://github.com/kissggj123/Bunny-Cockpit-OS', language: 'JavaScript', isFork: false },
  { name: 'YumikoToys',       desc: 'AI 桌宠玩具系列',           url: 'https://github.com/kissggj123/YumikoToys',       language: 'JavaScript', isFork: false },
  { name: 'DarkSouls_Work',   desc: '黑魂同人战斗系统',           url: 'https://github.com/kissggj123/DarkSouls_Work',   language: 'JavaScript', isFork: false },
  { name: 'MineTraft',        desc: '方块世界复刻练习',           url: 'https://github.com/kissggj123/MineTraft',        language: 'JavaScript', isFork: false },
  { name: 'Perler_beads',     desc: '拼豆图纸生成器',             url: 'https://github.com/kissggj123/Perler_beads',     language: 'JavaScript', isFork: false },
  { name: 'MOBS',             desc: '极客工具箱计划',             url: 'https://github.com/kissggj123/MOBS',             language: 'JavaScript', isFork: false }
];

/* -------------------------------------------------------------------------
 * 十一、楼层宝箱 → 项目映射（按章节）
 * 每层宝箱顺序对应地图中 C 的先后出现顺序
 * ---------------------------------------------------------------------- */
const FLOOR_REPOS = [
  ['kissggj123', 'kissggj123.github.com'],
  ['Bunny-Cockpit-OS', 'NIO-Dash-iOS', 'NIOPlay'],
  ['YumikoToys', 'YumikoToys-Lite', 'YumikoAnime'],
  ['DarkSouls_Work', 'MineTraft', 'UGame', 'Asahi-Steam-M1'],
  ['MenglolitaHost', 'MOBS', 'MoRecall', 'Twist', 'WiFi-Assistant', 'DNSset-win', 'Route'],
  ['Perler_beads', 'LoungeChairAPI', 'qqrobot'],
  []
];

/* 每层装备箱内容（E 格） */
const FLOOR_EQUIP_DROPS = [
  ['e_stick'],
  ['e_film'],
  ['e_head'],
  ['e_vest'],
  ['e_key'],
  ['e_ring'],
  ['e_pendant', 'e_crown']
];

/* 导出到全局（引擎使用；同时供 tools/validate-maps.mjs 正则提取） */
window.STORY = {
  MAPS, MONSTERS, FLOOR_MONSTERS, EQUIPS, GACHA_POOL, SKILLS, SHOP_ITEMS, SKUS, ACHS, VIP_LEVELS,
  FLOOR_NAMES, FLOOR_INTRO, FLOOR_CLEAR, BASEMENT_INTRO, TRUE_END,
  FALLBACK_CLASS, FALLBACK_GHOST, FALLBACK_CODEX, FLOOR_REPOS, FLOOR_EQUIP_DROPS
};
