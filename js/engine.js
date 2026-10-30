/* =========================================================================
 * engine.js — 兔可可的魔塔档案馆 · 游戏引擎
 * 消费 window.STORY（内容层）与 window.AI（可选增强）。
 * 模块：状态存档 / 地图渲染 / 移动交互 / 战斗 / 事件 / 商店 /
 *       充值开箱 / 图鉴成就 / 二周目 / 作弊 API / 皮肤
 * ========================================================================= */
'use strict';

/* ==================== 基础引用 ==================== */
const $ = id => document.getElementById(id);
const STORY = window.STORY;
const REPO_URL = 'https://github.com/kissggj123/';
const SAVE_KEY = 'rpg_save_v1';

/* 地图原始副本：重开 / 二周目时还原运行时被挖开的格子 */
const ORIG_MAPS = JSON.parse(JSON.stringify(STORY.MAPS));

/* ==================== 图鉴数据 ==================== */
let CODEX = null;   /* { total, originals, featured, codex:[{name,desc,url,language,isFork}] } */

async function loadCodex() {
  try {
    const res = await fetch('./data/projects.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    CODEX = await res.json();
  } catch (e) {
    CODEX = {
      total: STORY.FALLBACK_CODEX.length, originals: STORY.FALLBACK_CODEX.length,
      featured: [], codex: STORY.FALLBACK_CODEX
    };
  }
}
function codexTotal() { return (CODEX && CODEX.total) || STORY.FALLBACK_CODEX.length; }

/* ==================== 状态 ==================== */
let G = null;

function newGame(ng) {
  const prev = ng ? G : null;
  /* 还原地图（上一周目可能挖开了格子） */
  for (let i = 0; i < STORY.MAPS.length; i++) STORY.MAPS[i] = ORIG_MAPS[i].slice();
  return {
    cycle: prev ? prev.cycle + 1 : 1, floor: 0, pos: null,
    maxHp: 1000, hp: 1000, atk: 60, def: 40,
    gem: 0, xp: 0, keys: { y: 1, b: 0, r: 0 },
    coins: 1288, vip: {}, vipExp: 0, coinLog: [], wish: 0, credit: { active: false, debt: 0 },
    cheated: 0, diffAdj: 0,
    equip: { weapon: null, armor: null, accessory: null },
    skills: [], cds: {}, shopped: false,
    flags: {}, achs: {}, codex: [], codexSeen: [], killed: {},
    gachaLog: [], gachaSeq: 0,
    name: prev ? prev.name : '访客', cls: null,
    ai: {
      baseUrl: localStorage.getItem('bcos_ai_baseUrl') || 'https://api.qnaigc.com',
      model: localStorage.getItem('bcos_ai_model') || 'qiniu/conatus-free',
      key: localStorage.getItem('bcos_ai_key') || ''
    }
  };
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 隐私模式静默 */ } }
function load() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return null;
    const g = JSON.parse(s);
    if (!g || typeof g.cycle !== 'number') throw new Error('corrupt');
    return g;
  } catch (e) {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { }
    return null;
  }
}

/* ==================== 属性计算 ==================== */
function totalAtk() { let a = G.atk; for (const s of ['weapon', 'armor', 'accessory']) { const e = G.equip[s]; if (e && e.atk) a += e.atk; } if (vipLv() >= 9) a = Math.round(a * 1.1); return a; }
function totalDef() { let d = G.def; for (const s of ['weapon', 'armor', 'accessory']) { const e = G.equip[s]; if (e && e.def) d += e.def; } if (vipLv() >= 9) d = Math.round(d * 1.1); return d; }
function monsterScale() { return 1 + 0.5 * (G.cycle - 1); }
/* 无限轮回奖励：周目越深，XP / 宝石收益越高（魔塔式无限轮回的补偿） */
function loopBonus() { return 1 + 0.1 * (G.cycle - 1); }

/* ==================== DDA 动态难度 ====================
 * 游戏会暗中观察你，随机调整难度——否则太简单、太容易通关：
 *   · 氪金越多（vipExp 成长值越高）怪物越强 —— 氪佬买挑战
 *   · 用过控制台作弊 → 难度永久 +0.30（作弊税）
 *   · 战斗零伤/轻取 → 难度微升；惨胜 → 微降
 *   · 每次上楼随机抖动 ±0.02
 * 怪物最终属性 = 基础 × monsterScale(周目) × diffTotal(动态) */
function baseDiff() {
  let d = 1;
  d += Math.min(0.5, (G.vipExp || 0) / 20000);  /* 氪金强度：2 万成长值封顶 +0.5 */
  if (G.cheated) d += 0.3;                       /* 作弊税（永久） */
  return d;
}
function diffTotal() {
  const base = baseDiff();
  return Math.max(0.5, Math.min(3.0, Math.round((base + (G.diffAdj || 0)) * 100) / 100));
}
function foeScale() { return Math.round(monsterScale() * diffTotal() * 100) / 100; }
function bumpDiff(delta, why, silent) {
  const base = baseDiff(), oldT = diffTotal();
  G.diffAdj = Math.max(0.5 - base, Math.min(3.0 - base, (G.diffAdj || 0) + delta));
  const nv = diffTotal();
  if (nv === oldT) return;
  save();
  if (!silent) toast('⚖️ ' + (why || '难度调整') + '：难度系数 ' + oldT.toFixed(2) + ' → ' + nv.toFixed(2) + (nv > oldT ? ' ↑' : ' ↓'));
}
/* 战后反馈：受伤占比驱动难度升降 */
function fightFeedback(hpBefore, hpAfter) {
  const ratio = Math.max(0, hpBefore - hpAfter) / Math.max(1, hpBefore);
  if (ratio <= 0.0001) bumpDiff(0.05, '无伤碾压，怪物强化');
  else if (ratio < 0.1) bumpDiff(0.03, '轻松获胜，怪物强化');
  else if (ratio > 0.6) bumpDiff(-0.05, '惨胜，怪物弱化');
}
/* 作弊检测：一经使用，本存档永久加税 */
function markCheat() {
  if (G.cheated) return;
  G.cheated = 1;
  toast('🔥 检测到作弊行为：动态难度永久 +0.30');
  save();
}
function hasSkill(id) { return G.skills.includes(id); }
function equipEffect(key) {
  let v = 0;
  for (const s of ['weapon', 'armor', 'accessory']) { const e = G.equip[s]; if (e && e.effect && e.effect[key]) v += e.effect[key]; }
  return v;
}

/* ==================== VIP 会员体系 ==================== */
/* 等级：成长值（累计实付）达到 VIP_LEVELS 门槛即晋升 */
function vipLv() {
  let lv = 0;
  if (G && G.vipExp !== undefined) for (const v of STORY.VIP_LEVELS) if (G.vipExp >= v.exp) lv = v.lv;
  return lv;
}
/* 特权门槛表：V1 客服 / V2 利息 / V3 商店折扣 / V4 折扣重摇 / V5 领币 / V6 加成+减负 / V7 保底 / V8 领币+事件翻倍 / V9 称号+属性 / V10 返现 */
function hasPerk(minLv) { return vipLv() >= minLv; }
/* 订阅类权益是否在有效期内（旧档 true = 永久有效；新档存到期时间戳） */
function vipOn(k) {
  const v = G.vip && G.vip[k];
  if (!v) return false;
  return v === true || v > Date.now();
}
function vipExpireText(k) {
  const v = G.vip && G.vip[k];
  if (!v) return '';
  return v === true ? '永久有效' : '有效期至 ' + new Date(v).toLocaleDateString('zh-CN');
}
/* 白条还款：从余额还债（余额不够则部分还款） */
function repayBill() {
  if (!G.credit || G.credit.debt <= 0) return;
  const pay = Math.min(Math.max(G.coins || 0, 0), G.credit.debt);
  if (pay <= 0) { toast('🥕 余额为 0，先去充值或等兔子银行发工资吧'); return; }
  addCoins(-pay, '白条还款');
  G.credit.debt = Number((G.credit.debt - pay).toFixed(6));
  if (G.credit.debt <= 0) { G.credit.debt = 0; toast('🎉 白条已还清！兔可可：信用分 +1'); }
  else toast('🥕 已还款 ' + pay + ' 币，剩余欠款 ' + G.credit.debt + ' 币');
  save(); UI.charge();
}
/* 统一入账：记银行流水 */
function addCoins(n, reason) {
  G.coins = Number((((G.coins || 0) + n)).toFixed(6));
  G.coinLog.unshift({ n: Number(n.toFixed ? n.toFixed(6) : n), reason: reason || '', t: Date.now() });
  if (G.coinLog.length > 15) G.coinLog.length = 15;
}
/* 晋升检查：等级提升时庆祝 */
function checkVip() {
  const lv = vipLv();
  if (G._lv === undefined) { G._lv = lv; return; }
  if (lv > G._lv) {
    G._lv = lv;
    const v = STORY.VIP_LEVELS[lv - 1];
    toast('👑 恭喜晋升 ' + v.name + '！解锁特权：' + v.perk, 'ach');
    confetti(); save();
  }
}
/* 随机收支事件：模拟现实发工资 / 消费。V6+ 坏消息减半、V9+ 再减半；V8+ 好事件概率翻倍 */
function randomCoinEvent() {
  const lv = vipLv();
  const chance = hasPerk(8) ? 0.6 : 0.3;
  if (Math.random() >= chance) return;
  const good = [
    () => { const n = 50 + Math.floor(Math.random() * 450); addCoins(n, '🐇 兔子银行发工资'); return '🐇 发工资 +' + n + ' 币'; },
    () => { const n = 88 + Math.floor(Math.random() * 800); addCoins(n, '所得税退税到账'); return '🎁 退税 +' + n + ' 币'; },
    () => { const n = 200 + Math.floor(Math.random() * 1800); addCoins(n, '基金大涨'); return '📈 基金大涨 +' + n + ' 币'; },
    () => { const n = 10 + Math.floor(Math.random() * 90); addCoins(n, '路上捡到红包'); return '🧧 捡到红包 +' + n + ' 币'; }
  ];
  const bad = [
    () => { const n = 20 + Math.floor(Math.random() * 180); addCoins(-n, '档案馆物业费'); return '🧾 物业费 -' + n + ' 币'; },
    () => { const n = 10 + Math.floor(Math.random() * 90); addCoins(-n, '钓鱼执法罚单'); return '🚨 罚单 -' + n + ' 币'; },
    () => { const n = 100 + Math.floor(Math.random() * 900); addCoins(-n, '理财亏损'); return '💸 理财亏损 -' + n + ' 币'; },
    () => { const n = 30 + Math.floor(Math.random() * 270); addCoins(-n, '猫粮被兔可可偷吃赔偿'); return '🐱 赔偿 -' + n + ' 币'; }
  ];
  const mul = hasPerk(9) ? 0.25 : hasPerk(6) ? 0.5 : 1;
  const run = arr => arr[Math.floor(Math.random() * arr.length)]();
  let msg;
  if (Math.random() < 0.55) {
    msg = run(good);
    if (hasPerk(8)) msg += '　' + run(good) + '（V8 好运翻倍）';
  } else {
    const before = G.coins;
    msg = run(bad);
    const delta = G.coins - before;
    if (mul < 1 && delta < 0) {
      const refund = Math.round(-delta * (1 - mul));
      addCoins(refund, 'VIP 坏消息减免');
      msg += '（VIP 特权减免 ' + refund + ' 币）';
    }
  }
  toast(msg);
}

/* ==================== UI 基础 ==================== */
function toast(msg, cls) {
  const t = $('toast'); t.textContent = msg; t.className = 'show ' + (cls || '');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.className = '', 2600);
}
function ach(id) {
  if (!STORY.ACHS[id] || G.achs[id]) return;
  G.achs[id] = true;
  toast('🏆 解锁成就「' + STORY.ACHS[id].name + '」', 'ach'); save();
  /* allach：其余全部解锁时自动点亮 */
  if (id !== 'allach') {
    const rest = Object.keys(STORY.ACHS).filter(k => k !== 'allach' && !G.achs[k]);
    if (!rest.length) ach('allach');
  }
}

/* ---- 皮肤 ---- */
function applySkin(s) {
  document.body.classList.toggle('crt', s === 'crt');
  try { localStorage.setItem('bcos_skin', s); } catch (e) { }
  const b = $('skinToggle'); if (b) b.textContent = s === 'crt' ? '🌸 粉彩' : '🖥 CRT';
}
function toggleSkin() { applySkin(document.body.classList.contains('crt') ? 'pink' : 'crt'); }

/* ==================== 对话引擎（打字机） ==================== */
const Dlg = {
  q: [], typing: false, done: null, _opts: null,
  say(lines, opts, done) { this.q = lines.slice(); this._opts = opts || null; this.done = done || null; this.next(); },
  next() {
    if (!this.q.length) {
      if (this._opts) { this.renderOpts(this._opts); this._opts = null; return; }
      if (this.done) { const d = this.done; this.done = null; d(); }
      return;
    }
    const item = this.q.shift();
    if (typeof item === 'function') { item(); this.next(); return; }
    this.type(item);
  },
  type(text) {
    this.typing = true; const el = $('dlgTxt'); el.textContent = ''; el._full = text; let i = 0;
    clearInterval(this._tm);
    this._tm = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(this._tm); this.typing = false; } }, 18);
  },
  skip() {
    if (this.typing) { $('dlgTxt').textContent = $('dlgTxt')._full; this.typing = false; }
    else this.next();
  },
  renderOpts(opts) {
    const box = $('dlgOpts'); box.innerHTML = '';
    for (const o of opts) {
      const b = document.createElement('button');
      b.textContent = o[0]; if (o[2]) b.className = 'alt';
      b.onclick = e => { e.stopPropagation(); box.innerHTML = ''; o[1](); };
      box.appendChild(b);
    }
  }
};

/* ==================== 地图渲染 ==================== */
const TILES = {
  '#': 'w', '.': 'f', 'S': 'f', 'T': 'portal', 'N': 'npc', '$': 'shop', 'P': 'car',
  'M': 'f', 'B': 'f boss', 'C': 'f item', 'E': 'f item', 'G': 'f item', 'H': 'f item',
  'K': 'f item', 'L': 'f item',
  'Y': 'door-y', 'D': 'door-b', 'R': 'door-r'
};
const ICONS = { 'S': '', 'T': '🌀', 'N': '🐰', '$': '🛒', 'P': '🚗', 'C': '📦', 'E': '🎁', 'G': '💎', 'H': '🍓', 'K': '🔑', 'L': '🗝️', 'Y': '', 'D': '', 'R': '' };
const RARITY = ['', '普通', '稀有', '史诗'];

function floorName() {
  return (STORY.FLOOR_NAMES[G.floor] || (G.floor + 1 + 'F')) + ' · ' + G.cycle + '周目';
}
function renderMap() {
  const m = STORY.MAPS[G.floor], el = $('map'); el.innerHTML = '';
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
    const ch = m[y][x], d = document.createElement('div');
    let cls = TILES[ch] || 'f', ic = ICONS[ch] || '';
    if (ch === 'M' || ch === 'B') { const mo = monsterAt(ch); if (mo) ic = mo.icon; }
    if (G.pos && G.pos.x === x && G.pos.y === y) { cls = 'hero'; ic = '🐰'; }
    d.className = 'tile ' + cls; d.textContent = ic;
    el.appendChild(d);
  }
  renderStatus();
}
function renderStatus() {
  const dt = diffTotal();
  $('status').innerHTML =
    '<span class="st" id="floorTag">' + floorName() + '</span>' +
    (dt !== 1 ? '<span class="st">🔥 难度<b>×' + dt.toFixed(2) + '</b></span>' : '') +
    '<span class="st">❤️ <b>' + G.hp + '</b>/' + G.maxHp + '</span>' +
    '<span class="st">⚔️ <b>' + totalAtk() + '</b></span>' +
    '<span class="st">🛡️ <b>' + totalDef() + '</b></span>' +
    '<span class="st">🔑<b>' + G.keys.y + '</b> 🗝️<b>' + G.keys.b + '</b> 🟥<b>' + G.keys.r + '</b></span>' +
    '<span class="st">💎<b>' + G.gem + '</b></span>' +
    '<span class="st">💰<b>' + (G.coins || 0) + '</b></span>' +
    '<span class="st">⭐<b>' + G.xp + '</b></span>' +
    '<span class="st">📖<b>' + G.codex.length + '/' + codexTotal() + '</b></span>';
}

/* ==================== 地图工具 ==================== */
function tileAt(x, y) { const m = STORY.MAPS[G.floor]; return (m[y] && m[y][x]) || '#'; }
function setTile(x, y, ch) { const r = STORY.MAPS[G.floor]; r[y] = r[y].substring(0, x) + ch + r[y].substring(x + 1); }

/* 地图字符 → 怪物对象（含 id）。地下阶段 M 依序映射 g1/g2/g3 */
function monsterAt(ch) {
  if (ch === 'B') return Object.assign({ id: G.flags.basement ? 'g3' : 'boss' }, STORY.MONSTERS[G.flags.basement ? 'g3' : 'boss']);
  if (ch === 'M') {
    let id;
    if (G.flags.basement) { const seq = ['g1', 'g2', 'g3']; id = seq[Math.min(G.flags.bKill || 0, 2)]; }
    else id = STORY.FLOOR_MONSTERS[G.floor] || 'm1';
    return Object.assign({ id }, STORY.MONSTERS[id]);
  }
  return null;
}

/* ==================== 移动与交互 ==================== */
const Game = {
  blocked() {
    return ['mBattle', 'mEvent', 'mShop', 'mPay', 'mInfo', 'mEnd'].some(id => $(id).classList.contains('show'));
  },
  tryMove(dx, dy) {
    if (!G || !G.pos || Game.blocked()) return;
    const nx = G.pos.x + dx, ny = G.pos.y + dy, ch = tileAt(nx, ny);
    if (ch === '#') return;
    /* 门 */
    if (ch === 'Y' || ch === 'D' || ch === 'R') {
      const k = ch === 'Y' ? 'y' : ch === 'D' ? 'b' : 'r';
      const kn = ch === 'Y' ? '黄' : ch === 'D' ? '蓝' : '红';
      if (G.keys[k] > 0) { G.keys[k]--; setTile(nx, ny, '.'); toast('使用' + kn + '钥匙开门'); }
      else { toast('需要' + kn + '钥匙！可在商店 🛒 购买'); return; }
      save(); renderMap(); return;
    }
    if (ch === 'M' || ch === 'B') { Battle.preview(nx, ny, ch); return; }
    if (ch === 'N') { G.pos = { x: nx, y: ny }; Events.npcTalk(); save(); renderMap(); return; }
    if (ch === '$') { G.pos = { x: nx, y: ny }; Shop.open(); save(); renderMap(); return; }
    if (ch === 'C') { Events.repoChest(nx, ny); return; }
    if (ch === 'E') { Events.equipBox(nx, ny); return; }
    if (ch === 'P') { Events.carPortal(); return; }
    if (ch === 'T') { Game.ascend(); return; }
    /* 拾取 */
    const cacheMul = (hasSkill('s_cache') || vipOn('season')) ? 1.5 : 1;
    if (ch === 'G') { const n = Math.round(2 * cacheMul); G.gem += n; setTile(nx, ny, '.'); toast('💎 宝石 +' + n); Game.loot(nx, ny); }
    if (ch === 'H') { G.hp = Math.min(G.maxHp, G.hp + 250); setTile(nx, ny, '.'); toast('🍓 HP +250'); Game.loot(nx, ny); }
    if (ch === 'K') { G.keys.y++; setTile(nx, ny, '.'); toast('🔑 黄钥匙 +1'); Game.loot(nx, ny); }
    if (ch === 'L') { G.keys.b++; setTile(nx, ny, '.'); toast('🗝️ 蓝钥匙 +1'); Game.loot(nx, ny); }
    G.pos = { x: nx, y: ny }; save(); renderMap();
  },
  /* 1F 全收集 → curious 成就 */
  loot(x, y) {
    if (G.floor === 0) {
      G.flags.f1loot = (G.flags.f1loot || 0) + 1;
      if (G.flags.f1loot >= 8) ach('curious');
    }
    G.pos = { x, y };
  },
  ascend() {
    if (G.floor >= STORY.MAPS.length - 1) { toast('🌀 上面没有楼层了'); return; }
    ach('f' + (G.floor + 1));
    Game.fadeIn(() => {
      G.floor++; G.pos = Game.findTile('S') || Game.findTile('T') || { x: 1, y: 1 };
      const kp = equipEffect('keyPerFloor');
      if (kp) { G.keys.y += kp; toast('🎀 装备特效：黄钥匙 +' + kp); }
      /* VIP 权益：利息 + 每层领币 + 随机收支事件 */
      {
        const gains = [];
        if (vipOn('monthly')) { addCoins(88, '月卡福利'); gains.push('🌙 月卡 +88'); }
        if (vipOn('sub')) { addCoins(38, '订阅福利'); gains.push('📺 订阅 +38'); }
        if (vipOn('yearly')) { addCoins(200, '年费福利'); gains.push('🎫 年费 +200'); }
        if (gains.length) toast('VIP 权益到账：' + gains.join('　'));
      }
      if (hasPerk(2)) { const n = Math.max(1, Math.floor((G.coins || 0) * 0.01)); addCoins(n, 'V2 余额利息'); toast('💰 V2 利息 +' + n + ' 币'); }
      if (hasPerk(5)) { addCoins(66, 'V5 土豪特权'); toast('💰 V5 特权 +66 币'); }
      if (hasPerk(8)) { addCoins(233, 'V8 王者特权'); toast('💰 V8 特权 +233 币'); }
      randomCoinEvent();
      bumpDiff(Math.random() * 0.04 - 0.02, null, true);  /* 楼层随机抖动 ±0.02 */
      save();
      renderMap();
      Dlg.say(STORY.FLOOR_INTRO[G.floor] || ['……'], null, () => { save(); });
    });
  },
  findTile(ch) {
    const m = STORY.MAPS[G.floor];
    for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === ch) return { x, y };
    return null;
  },
  fadeIn(mid) { const f = $('fade'); f.style.opacity = 1; setTimeout(() => { mid(); f.style.opacity = 0; }, 420); },

  /* ---- Boss 击败后：一周目结算 / 二周目地下档案馆 ---- */
  victory() {
    ach('f7');
    if (G.cycle === 1) {
      Dlg.say([STORY.FLOOR_CLEAR[6], '……不过，档案柜深处好像还有绿光在闪。'], null, () => Game.showEnd(false));
    } else if (!G.flags.trueEnd) {
      Game.beginBasement();
    } else {
      Game.showEnd(false);
    }
  },
  beginBasement() {
    G.flags.basement = 1; G.flags.bKill = 0;
    /* 在 7F 三个空地放下档案馆守卫 */
    const spots = [[5, 1], [8, 1], [5, 9]];
    for (const [x, y] of spots) setTile(x, y, 'M');
    save(); renderMap();
    Dlg.say(STORY.BASEMENT_INTRO[0], null, () => {
      toast('🕯️ 地下档案馆开启：击败 3 名守卫（已讨伐 ' + (G.flags.bKill) + '/3）');
    });
  },
  basementProgress() {
    G.flags.bKill = (G.flags.bKill || 0) + 1;
    if (G.flags.bKill >= 3) {
      ach('archive');
      G.flags.trueEnd = 1; save();
      Dlg.say(STORY.TRUE_END, null, () => { ach('trueend'); Game.showEnd(true); });
    } else {
      toast('🕯️ 档案馆守卫 ' + G.flags.bKill + '/3 已讨伐');
      save();
    }
  },
  showEnd(trueEnd) {
    if (!G.shopped) ach('thrifty');
    $('endBtns').innerHTML = '';
    $('endBody').innerHTML =
      '<div style="font-size:40px">' + (trueEnd ? '🕯️' : '🏆') + '</div>' +
      (trueEnd ? '真结局达成 —— 档案馆不会关闭，灯会一直亮着。' : '恭喜，' + G.name + '！这座档案馆又亮了一层。') +
      '<br><br><b>统计</b><br>周目：' + G.cycle +
      '<br>动态难度：×' + diffTotal().toFixed(2) + '（氪金 / 作弊 / 战斗表现综合）' +
      '<br>XP：' + G.xp + '<br>图鉴收录：' + G.codex.length + '/' + codexTotal() +
      '<br>成就：' + Object.keys(G.achs).length + '/' + Object.keys(STORY.ACHS).length;
    const b1 = document.createElement('button'); b1.className = 'btn-main';
    b1.textContent = '🌀 无限轮回 · 进入第' + (G.cycle + 1) + '周目（怪物×' + (1 + 0.5 * G.cycle).toFixed(1) + ' · 轮回加成 XP/宝石×' + (1 + 0.1 * G.cycle).toFixed(1) + '）';
    b1.onclick = () => { UI.close('mEnd'); startNG(); };
    const b2 = document.createElement('button'); b2.className = 'btn-alt'; b2.textContent = '重新开始';
    b2.onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); };
    $('endBtns').append(b1, b2);
    $('mEnd').classList.add('show');
  }
};

/* ==================== 战斗 ==================== */
const Battle = {
  cur: null, pendingSkill: null,
  /* 模拟结算：skipFirst=首回合免伤；skipRound=该回合怪物不攻击(s_git)；defCut=无视防御比例(s_debug) */
  simulate(foe, opts) {
    const { skipFirst, skipRound, defCut } = opts;
    let myhp = G.hp, foehp = foe.hp, round = 0, hurt = 0;
    const myAtk = totalAtk(), myDef = totalDef();
    while (foehp > 0 && myhp > 0 && round < 500) {
      round++;
      const def = Math.round(foe.def * (1 - (defCut || 0)));
      foehp -= Math.max(myAtk - def, 0);
      if (!(round === 1 && skipFirst) && round !== skipRound) { const dmg = Math.max(foe.atk - myDef, 0); myhp -= dmg; hurt += dmg; }
    }
    return { win: foehp <= 0, hurt, round };
  },
  preview(x, y, ch) {
    const m = monsterAt(ch), sc = foeScale();
    const foe = { id: m.id, name: m.name, icon: m.icon, hp: Math.round(m.hp * sc), atk: Math.round(m.atk * sc), def: Math.round(m.def * sc), xp: Math.round(m.xp * sc), drop: m.drop, boss: m.boss };
    this.cur = { x, y, ch, foe }; this.pendingSkill = null;
    this.renderPreview();
  },
  renderPreview() {
    const { foe } = this.cur;
    const firstFree = this.firstFreeChance();
    const opts = { skipFirst: Math.random() < firstFree, skipRound: this.pendingSkill === 's_git' ? 2 : 0, defCut: this.pendingSkill === 's_debug' ? 0.5 : 0 };
    /* 模拟取期望：免伤视为必触发与必不触发的较小受伤值 */
    const rYes = this.simulate(foe, Object.assign({}, opts, { skipFirst: true }));
    const rNo = this.simulate(foe, Object.assign({}, opts, { skipFirst: false }));
    const r = rYes.win && rNo.win ? (rYes.hurt < rNo.hurt ? rYes : rNo) : (rYes.win ? rYes : rNo);
    $('bName').textContent = foe.icon + ' ' + foe.name + (foeScale() !== 1 ? ' (×' + foeScale().toFixed(2) + ')' : '');
    $('bMe').innerHTML = '❤️' + G.hp + '/' + G.maxHp + ' ⚔️' + totalAtk() + ' 🛡️' + totalDef();
    $('bFoe').innerHTML = '❤️' + foe.hp + ' ⚔️' + foe.atk + ' 🛡️' + foe.def;
    $('bCalc').innerHTML = r.win ? ('预计受伤 -' + r.hurt + '（' + r.round + '回合）') : '<span style="color:var(--bad)">打不过！预计重伤</span>';
    /* 主动技能按钮 */
    let sh = '';
    for (const id of G.skills) {
      const s = STORY.SKILLS[id];
      if (!s || s.type !== 'active') continue;
      const cd = G.cds[id] || 0;
      const on = this.pendingSkill === id;
      sh += '<button class="badge' + (on ? ' rarity3' : '') + '" data-sk="' + id + '" ' + (cd > 0 ? 'disabled style="opacity:.45"' : '') + '>' +
        '⚡ ' + s.name + (cd > 0 ? '（冷却' + cd + '）' : '（就绪）') + '</button> ';
    }
    $('bSkill').innerHTML = sh;
    document.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => {
      this.pendingSkill = this.pendingSkill === b.dataset.sk ? null : b.dataset.sk;
      this.renderPreview();
    });
    $('bGo').style.display = r.win ? '' : 'none';
    $('bGo').onclick = () => this.fight();
    $('mBattle').classList.add('show');
  },
  firstFreeChance() {
    if (hasSkill('s_fluff')) return 1;
    return Math.min(1, equipEffect('firstFreePct') / 100);
  },
  fight() {
    const { x, y, foe } = this.cur; UI.close('mBattle');
    const skipFirst = Math.random() < this.firstFreeChance();
    const skipRound = this.pendingSkill === 's_git' ? 2 : 0;
    const defCut = this.pendingSkill === 's_debug' ? 0.5 : 0;
    const hpBefore = G.hp;
    let myhp = G.hp, foehp = foe.hp, round = 0;
    const myAtk = totalAtk(), myDef = totalDef();
    while (foehp > 0 && myhp > 0 && round < 500) {
      round++;
      const def = Math.round(foe.def * (1 - defCut));
      foehp -= Math.max(myAtk - def, 0);
      if (!(round === 1 && skipFirst) && round !== skipRound) myhp -= Math.max(foe.atk - myDef, 0);
    }
    /* 消耗主动技冷却 */
    for (const id of G.skills) { const s = STORY.SKILLS[id]; if (s && s.type === 'active') G.cds[id] = Math.max(0, (G.cds[id] || 0) - 1); }
    if (this.pendingSkill) G.cds[this.pendingSkill] = STORY.SKILLS[this.pendingSkill].cd;
    this.pendingSkill = null;

    G.hp = Math.max(1, myhp);
    fightFeedback(hpBefore, myhp);  /* DDA：按受伤占比调整难度 */
    const xpMul = (hasSkill('s_review') ? 1.2 : 1) * (1 + equipEffect('xpBonus') / 100) * (vipOn('yearly') ? 1.1 : 1) * (hasPerk(6) ? 1.15 : 1) * loopBonus();
    const xpGain = Math.round(foe.xp * xpMul);
    G.xp += xpGain; G.killed[foe.id] = (G.killed[foe.id] || 0) + 1;
    setTile(x, y, '.'); G.pos = { x, y };
    const drops = [];
    const gemMul = ((hasSkill('s_cache') || vipOn('season')) ? 1.5 : 1) * (hasPerk(6) ? 1.1 : 1) * loopBonus();
    const m = STORY.MONSTERS[foe.id];
    if (m.drop && m.drop.key && Math.random() < m.drop.p) { G.keys[m.drop.key]++; drops.push('🔑 钥匙'); }
    if (m.drop && m.drop.gem) { const g = Math.round(m.drop.gem * gemMul); G.gem += g; drops.push('💎 宝石×' + g); }
    /* V10：击败 Boss 返现 */
    if (m.boss && hasPerk(10)) { const n = Math.round(foe.xp * 2); addCoins(n, 'V10 Boss 返现'); drops.push('💰 Boss 返现×' + n); }
    if (m.drop && m.drop.equip) { setTimeout(() => Events.giveEquip(m.drop.equip), 400); }
    toast('⚔️ 击败' + m.name + '！XP+' + xpGain + (drops.length ? '　' + drops.join(' ') : ''));
    save(); renderMap();
    if (m.boss) {
      if (foe.id === 'g3') setTimeout(() => Game.basementProgress(), 600);
      else setTimeout(() => Game.victory(), 600);
    } else if (G.flags.basement) {
      /* 地下阶段普通守卫也计数（g1/g2 标 boss=false，这里统一处理） */
      if (['g1', 'g2'].includes(foe.id)) setTimeout(() => Game.basementProgress(), 400);
    }
  }
};

/* ==================== 事件 ==================== */
const Events = {
  cur: null,
  /* 项目宝箱：按 FLOOR_REPOS 顺序弹出 */
  repoChest(x, y) {
    const list = STORY.FLOOR_REPOS[G.floor] || [];
    const idx = G.flags['chest' + G.floor] || 0;
    if (idx >= list.length) { toast('📦 宝箱空了'); G.pos = { x, y }; renderMap(); return; }
    G.flags['chest' + G.floor] = idx + 1;
    const repo = list[idx];
    this.cur = { x, y };
    const meta = (CODEX && CODEX.codex.find(r => r.name === repo)) ||
      { name: repo, desc: '铲屎官的一个项目。', url: REPO_URL + repo };
    const feat = (CODEX && CODEX.featured.find(f => f.name === repo));
    $('evIcon').textContent = '📦';
    $('evName').textContent = meta.name + (feat ? ' · 章节' + feat.chapter : '');
    $('evBody').innerHTML = '<i style="color:var(--dim)">' + (feat && feat.lore ? feat.lore : meta.desc) + '</i>';
    const btns = $('evBtns'); btns.innerHTML = '';
    const gh = document.createElement('button'); gh.className = 'btn-gh'; gh.textContent = '🔗 GitHub';
    gh.onclick = () => window.open(meta.url || REPO_URL + repo, '_blank');
    const take = document.createElement('button'); take.className = 'btn-main'; take.textContent = '收录图鉴';
    take.onclick = () => this.collect(meta);
    btns.append(gh, take);
    $('mEvent').classList.add('show');
    AI.comment(meta.name, meta.desc).then(t => { if (t) toast('🐰 AI点评：' + t); }).catch(() => { });
  },
  collect(meta) {
    if (!G.codex.includes(meta.name)) {
      G.codex.push(meta.name);
      G.xp += 80;
      toast('📖 收录「' + meta.name + '」 XP+80');
      const n = G.codex.length;
      if (n >= 180) ach('c180'); else if (n >= 150) ach('c150'); else if (n >= 100) ach('c100'); else if (n >= 50) ach('c50'); else if (n >= 10) ach('c10');
    }
    if (this.cur) { setTile(this.cur.x, this.cur.y, '.'); G.pos = { x: this.cur.x, y: this.cur.y }; this.cur = null; }
    UI.close('mEvent'); save(); renderMap();
  },
  /* 装备箱：按 FLOOR_EQUIP_DROPS 顺序给出 */
  equipBox(x, y) {
    const list = STORY.FLOOR_EQUIP_DROPS[G.floor] || [];
    const idx = G.flags['equip' + G.floor] || 0;
    if (idx >= list.length) { toast('🎁 装备箱空了'); G.pos = { x, y }; renderMap(); return; }
    G.flags['equip' + G.floor] = idx + 1;
    this.cur = { x, y };
    this.giveEquip(list[idx], true);
  },
  giveEquip(id, fromTile) {
    const e = STORY.EQUIPS[id]; if (!e) return;
    $('evIcon').textContent = e.icon; $('evName').textContent = '获得装备！';
    let eff = '';
    if (e.effect) {
      if (e.effect.xpBonus) eff = 'XP +' + e.effect.xpBonus + '%';
      if (e.effect.keyPerFloor) eff = '每层送黄钥匙×' + e.effect.keyPerFloor;
      if (e.effect.firstFreePct) eff = '首回合免伤 ' + e.effect.firstFreePct + '%';
    }
    $('evBody').innerHTML = '<div class="badge rarity' + e.rarity + '">' + e.name + '</div><br>' +
      (e.atk ? '攻 +' + e.atk + '　' : '') + (e.def ? '防 +' + e.def + '　' : '') + (eff ? '<br>✨ ' + eff : '') +
      '<br><span style="font-size:12px;color:var(--dim)">品质：' + RARITY[e.rarity] + ' · 槽位：' +
      ({ weapon: '武器', armor: '防具', accessory: '饰品' })[e.slot] + '</span>';
    const btns = $('evBtns'); btns.innerHTML = '';
    const ok = document.createElement('button'); ok.className = 'btn-main'; ok.textContent = '装备！';
    ok.onclick = () => {
      G.equip[e.slot] = e;
      if (fromTile && this.cur) { setTile(this.cur.x, this.cur.y, '.'); G.pos = { x: this.cur.x, y: this.cur.y }; this.cur = null; }
      UI.close('mEvent'); toast('已装备 ' + e.icon + e.name);
      const eq = G.equip; if (eq.weapon && eq.armor && eq.accessory && eq.weapon.rarity === 3 && eq.armor.rarity === 3 && eq.accessory.rarity === 3) ach('collector');
      save(); renderMap();
    };
    const later = document.createElement('button'); later.className = 'btn-alt'; later.textContent = '先收着';
    later.onclick = () => { if (fromTile && this.cur) { setTile(this.cur.x, this.cur.y, '.'); G.pos = { x: this.cur.x, y: this.cur.y }; this.cur = null; } UI.close('mEvent'); save(); renderMap(); };
    btns.append(ok, later);
    $('mEvent').classList.add('show');
  },
  /* 兔可可 NPC 对话 */
  npcTalk() {
    const key = 'npc' + G.floor;
    if (!G.flags[key]) {
      G.flags[key] = 1;
      Dlg.say(STORY.FLOOR_INTRO[G.floor] || ['兔可可：加油喵！'], null, () => save());
    } else {
      const chat = ['兔可可：钥匙要省着用喵。', '兔可可：打不过就去商店买属性，宝石别攒着发霉。', '兔可可：档案馆的每个角落都值得看一眼哦。', '兔可可：铲屎官写这些项目的时候，可认真了。'];
      Dlg.say([chat[Math.floor(Math.random() * chat.length)]], null, () => save());
    }
  },
  /* 车库传送门彩蛋 → car.html */
  carPortal() {
    ach('ghostdoor');
    Dlg.say(['兔可可：咦，你发现了车库的暗门！', '那扇门后面停着这台档案馆的「原点」——车机锁屏。', '要现在去看看吗？（将打开 car.html）'], [
      ['🚗 出发', () => { location.href = './car.html'; }],
      ['留在档案馆', () => { }, true]
    ]);
  }
};

/* ==================== 开箱抽装备 ==================== */
const Gacha = {
  pickTier() {
    const r = Math.random() * 100;
    let t;
    if (hasPerk(7)) t = r < 30 ? 3 : 2;              /* V7：保底史诗 */
    else if (vipOn('season')) t = r < 10 ? 3 : 2;  /* Season：保底稀有 */
    else t = r < 10 ? 3 : r < 40 ? 2 : 1;
    /* 祈愿券：品质 +1 档（可叠加，最多叠 3） */
    if (G.wish > 0 && t < 3) {
      const up = Math.min(G.wish, 3 - t);
      t += up; G.wish -= up;
      toast('🧧 祈愿生效：品质 +' + up + ' 档');
    }
    return t;
  },
  logLine(prefix, e) {
    G.gachaSeq++;
    G.gachaLog.unshift('#' + G.gachaSeq + ' ' + prefix + ' ' + e.icon + ' ' + e.name + ' · ' + RARITY[e.rarity]);
    if (G.gachaLog.length > 20) G.gachaLog.length = 20;
  },
  roll() {
    const tier = this.pickTier();
    const pool = STORY.GACHA_POOL.filter(id => STORY.EQUIPS[id].rarity === tier);
    const id = pool[Math.floor(Math.random() * pool.length)] || STORY.GACHA_POOL[0];
    this.logLine('开箱开出', STORY.EQUIPS[id]);
    this.showResult(id); save();
  },
  give(minTier) {
    const pool = STORY.GACHA_POOL.filter(id => STORY.EQUIPS[id].rarity >= minTier);
    const id = pool[Math.floor(Math.random() * pool.length)];
    this.logLine('充值赠品', STORY.EQUIPS[id]);
    this.showResult(id); save();
  },
  showResult(id) {
    const e = STORY.EQUIPS[id];
    Events.cur = null;
    $('evIcon').textContent = e.icon;
    $('evName').textContent = e.rarity === 3 ? '✨✨ 金光一闪！' : '开箱获得！';
    let eff = '';
    if (e.effect) {
      if (e.effect.xpBonus) eff = 'XP +' + e.effect.xpBonus + '%';
      if (e.effect.keyPerFloor) eff = '每层送黄钥匙×' + e.effect.keyPerFloor;
      if (e.effect.firstFreePct) eff = '首回合免伤 ' + e.effect.firstFreePct + '%';
    }
    $('evBody').innerHTML = '<div class="badge rarity' + e.rarity + '">' + e.name + '</div><br>' +
      (e.atk ? '攻 +' + e.atk + '　' : '') + (e.def ? '防 +' + e.def + '　' : '') + (eff ? '<br>✨ ' + eff : '') +
      '<br><span style="font-size:12px;color:var(--dim)">品质：' + RARITY[e.rarity] + '</span>';
    const btns = $('evBtns'); btns.innerHTML = '';
    const ok = document.createElement('button'); ok.className = 'btn-main'; ok.textContent = '装备！';
    ok.onclick = () => { G.equip[e.slot] = e; UI.close('mEvent'); toast('已装备 ' + e.icon + e.name); save(); renderMap(); };
    const later = document.createElement('button'); later.className = 'btn-alt'; later.textContent = '收进图鉴';
    later.onclick = () => UI.close('mEvent');
    btns.append(ok, later);
    $('mEvent').classList.add('show');
  }
};

/* ==================== 商店 ==================== */
const Shop = {
  open() {
    $('shopGem').textContent = G.gem; $('shopXp').textContent = G.xp;
    const disc = hasPerk(3) ? 0.95 : 1;   /* V3：全场 95 折 */
    if (hasPerk(3)) $('shopGem').textContent = G.gem + '（V3 95折）';
    let h = '';
    STORY.SHOP_ITEMS.forEach((it, i) => {
      const cost = Math.ceil(it.cost * disc);
      const owned = it.once && G.skills.includes(it.once);
      const afford = it.unit === 'gem' ? G.gem >= cost : G.xp >= cost;
      const priceTxt = (disc < 1 ? '<s style="opacity:.5">' + it.cost + '</s>' : '') + (it.unit === 'gem' ? '💎' + cost : '⭐' + cost);
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0;gap:6px">' +
        '<span style="flex:1;text-align:left;font-size:13px">' + it.name + '</span>' +
        '<button class="btn-main" data-buy="' + i + '" ' + (owned ? 'disabled style="opacity:.45"' : (afford ? '' : 'style="opacity:.6"')) + '>' +
        priceTxt + '</button></div>';
    });
    $('shopList').innerHTML = h;
    document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const it = STORY.SHOP_ITEMS[+b.dataset.buy];
      const cost = Math.ceil(it.cost * disc);
      if (it.once && G.skills.includes(it.once)) return;
      if (it.unit === 'gem' && G.gem < cost) { toast('宝石不够啦，去攒攒～'); return; }
      if (it.unit === 'xp' && G.xp < cost) { toast('XP 不够啦～'); return; }
      if (it.unit === 'gem') G.gem -= cost; else G.xp -= cost;
      it.apply(G);
      G.shopped = true;
      if (it.once) toast('✅ 习得「' + STORY.SKILLS[it.once].name + '」');
      else toast('✅ 购买成功');
      save(); Shop.open(); renderMap();
    });
    $('mShop').classList.add('show');
  }
};

/* ==================== 充值中心 + 模拟收银台 ==================== */
const Checkout = {
  channel: 'rabbit', sku: 'c6',
  open(skuId) {
    this.sku = STORY.SKUS[skuId] ? skuId : 'c6';
    const s = STORY.SKUS[this.sku];
    this.channel = 'rabbit';
    $('payTitle').textContent = s.name;
    $('payDesc').innerHTML = s.desc +
      '<br><span style="font-size:11px">兔可可币余额：<b>' + (G.coins || 0) + '</b> 币' +
      ' · 本单折扣在 -10000.000000% ~ +10000.000000% 之间随机，负数 = 免单返现，可能倒赚也可能天价</span>';
    $('payNo').textContent = 'BC' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
    const p = $('price'); p.className = ''; p.style.cssText = ''; p.textContent = s.price;
    $('free').style.display = 'none'; $('paySpin').style.display = 'none'; $('payMsg').textContent = '';
    const btns = $('payBtns'); btns.innerHTML = '';
    const credit = G.credit || { active: false, debt: 0 };
    const chans = [
      ['rabbit', '🐰 兔可可币', '可用余额 ' + (G.coins || 0) + ' 币', true],
      ['bill', '🥕 胡萝卜白条', credit.active ? '已激活 · 欠款 ' + credit.debt + ' 币 · 可透支' : '未激活（余额不足时自动开通）', credit.active],
      ['carrot', '💳 胡萝卜信用卡', '储蓄卡 · 尾号 8848', true],
      ['moon', '🌙 月光宝盒钱包', '人脸支付 · 极速到账', true]
    ];
    const wrap = document.createElement('div'); wrap.className = 'chan';
    for (const [id, name, sub, ok] of chans) {
      const b = document.createElement('button');
      b.className = 'chan-btn' + (id === this.channel ? ' sel' : '');
      if (!ok) { b.disabled = true; b.style.opacity = .55; }
      b.innerHTML = '<span style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<b style="white-space:nowrap">' + name + '</b>' +
        '<span style="font-size:11px;color:var(--dim);text-align:right">' + sub + '</span></span>';
      b.onclick = () => {
        if (!ok) { toast('🥕 白条尚未激活——余额不足时会自动帮你开通'); return; }
        wrap.querySelectorAll('.chan-btn').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel'); Checkout.channel = id;
      };
      wrap.appendChild(b);
    }
    btns.appendChild(wrap);
    const pay = document.createElement('button'); pay.className = 'btn-pay'; pay.textContent = '立即支付 ' + s.price;
    pay.onclick = () => this.pay(pay); btns.appendChild(pay);
    $('mPay').classList.add('show');
  },
  /* 折扣抽取：-10000.000000% ~ +10000.000000% 均匀随机（因子 -100 ~ +100，6 位小数）
   * 正数 = 实付标价×折扣；负数 = 免单并返现；-200% 即倒赔双倍 */
  rollDiscount() {
    return Number((Math.random() * 200 - 100).toFixed(6));
  },
  pay(btn) {
    const names = { rabbit: '兔可可币', carrot: '胡萝卜信用卡', moon: '月光宝盒钱包' };
    $('payBtns').querySelectorAll('button').forEach(b => b.style.pointerEvents = 'none');
    btn.style.opacity = .7;
    $('payMsg').textContent = '正在跳转到 ' + names[this.channel] + ' …';
    $('paySpin').style.display = 'block';
    setTimeout(() => { $('payMsg').textContent = '支付处理中，正在为你摇折扣…'; }, 900);
    setTimeout(() => {
      $('paySpin').style.display = 'none';
      const s = STORY.SKUS[this.sku];
      /* 折扣抽取（V4 特权：摇两次取更优，"更优" = 实付更少） */
      let d = this.rollDiscount();
      if (hasPerk(4)) {
        const d2 = this.rollDiscount();
        if (Math.abs(d2) < Math.abs(d)) d = d2;
      }
      const before = G.coins || 0;
      const payCoins = Number((s.coins * d).toFixed(6));   /* 实付金额（负 = 返现） */
      const dPct = (d * 100).toFixed(6);                   /* 折扣百分比，6 位小数 */
      $('price').classList.add('strike');
      $('free').style.display = 'block';
      if (payCoins > 0) {
        if (this.channel === 'bill') {
          /* 白条支付：不动余额，欠款挂账 */
          if (!G.credit) G.credit = { active: false, debt: 0 };
          G.credit.active = true;
          G.credit.debt = Number((G.credit.debt + payCoins).toFixed(6));
          addCoins(0, '白条支付 ' + s.name);
          $('free').innerHTML = '折扣 +' + dPct + '% · 白条透支 <b>' + payCoins + '</b> 币';
          $('payMsg').innerHTML = '白条支付成功，欠款 +<b>' + payCoins + '</b> 币' +
            '<br>当前白条欠款 <b>' + G.credit.debt + '</b> 币（充值中心可还款）';
        } else {
          addCoins(-payCoins, '充值 ' + s.name);
          G.vipExp = (G.vipExp || 0) + payCoins;             /* 成长值 = 累计实付 */
          $('free').innerHTML = '折扣 +' + dPct + '% · 实付 <b>' + payCoins + '</b> 币';
          $('payMsg').innerHTML = '支付成功，权益已发放' + ((G.coins || 0) < 0 ? '（透支 ' + (-G.coins) + ' 币）' : '') +
            '<br>余额 ' + before + ' → <b>' + G.coins + '</b> 币' +
            (hasPerk(4) ? '<span style="font-size:11px">（V4 已重摇取优）</span>' : '');
          if ((G.coins || 0) < 0) {
            /* 透支 → 自动激活白条挂账 */
            if (!G.credit) G.credit = { active: false, debt: 0 };
            G.credit.active = true;
            G.credit.debt = Number((G.credit.debt - G.coins).toFixed(6));
            G.coins = 0;
            setTimeout(() => toast('🥕 余额不足，「胡萝卜白条」已自动激活，欠款 ' + G.credit.debt + ' 币（充值中心可还款）'), 1200);
          }
        }
      } else if (payCoins === 0) {
        addCoins(0, '0 元购 ' + s.name);
        $('free').innerHTML = '🎉 折扣 +0.000000% · 免单！';
        $('payMsg').textContent = '支付成功（0 元购），权益已发放 🎉';
      } else {
        addCoins(-payCoins, '充值返现 ' + s.name);          /* 负实付 = 返现入余额 */
        $('free').innerHTML = '🎉 折扣 -' + dPct.replace('-', '') + '% · 免单还返现 <b>' + (-payCoins) + '</b> 币';
        $('payMsg').innerHTML = '兔可可倒贴了 ' + (-payCoins) + ' 币，请查收<br>余额 ' + before + ' → <b>' + G.coins + '</b> 币';
      }
      if (this.sku === 'nail') ach('silly');
      checkVip(); save(); this.success();
    }, 2000);
  },
  success() {
    const s = STORY.SKUS[this.sku];
    if (s.isBox) Gacha.roll();
    else {
      if (s.apply) s.apply(G);
      /* 订阅类：记录到期时间（月卡/订阅 30 天、Season 90 天、年费 365 天） */
      if (s.vip) {
        const days = { monthly: 30, sub: 30, season: 90, yearly: 365 }[s.vip] || 30;
        const prev = vipOn(s.vip) ? (G.vip[s.vip] === true ? Date.now() : G.vip[s.vip]) : Date.now();
        G.vip[s.vip] = (prev > Date.now() ? prev : Date.now()) + days * 86400000;
        toast('✅ ' + s.name + ' 已开通，' + vipExpireText(s.vip));
        if (s.vip === 'monthly') addCoins(288, '月卡开通礼');
      }
      if (s.gachaMin) Gacha.give(s.gachaMin);
    }
    ach('whale'); save(); renderMap(); confetti();
    setTimeout(() => {
      const btns = $('payBtns'); btns.innerHTML = '';
      const b1 = document.createElement('button'); b1.className = 'btn-main'; b1.textContent = '🎉 已到账，返回游戏';
      b1.onclick = () => UI.close('mPay');
      const b2 = document.createElement('button'); b2.className = 'btn-gh'; b2.textContent = '⭐ 顺手 Star 作者';
      b2.onclick = () => window.open('https://github.com/kissggj123', '_blank');
      btns.append(b1, b2);
    }, 1500);
  }
};

/* ==================== 彩带 ==================== */
function confetti() {
  const cv = $('confetti'); cv.style.display = 'block'; cv.width = innerWidth; cv.height = innerHeight;
  const ctx = cv.getContext('2d'); const parts = [];
  for (let i = 0; i < 80; i++) parts.push({
    x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4,
    c: ['#ff6b9d', '#ffc94d', '#5aa9ff', '#3fc380'][i % 4], r: Math.random() * 6 + 3, life: 60
  });
  let n = 0; const tm = setInterval(() => {
    ctx.clearRect(0, 0, cv.width, cv.height); let alive = 0;
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += .4; p.life--; if (p.life > 0) alive++; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    if (!alive || ++n > 90) { clearInterval(tm); ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
  }, 33);
}

/* ==================== UI 面板 ==================== */
const UI = {
  close(id) { $(id).classList.remove('show'); },
  codex() {
    const total = codexTotal();
    $('infoTitle').textContent = '📖 项目图鉴 (' + G.codex.length + '/' + total + ')';
    const all = (CODEX && CODEX.codex) || STORY.FALLBACK_CODEX;
    const featMap = {}; (CODEX && CODEX.featured || []).forEach(f => featMap[f.name] = f);
    let h = '<div style="font-size:12px;color:var(--dim);margin-bottom:6px">共 ' + total + ' 个仓库 · 点击条目展开详情</div>';
    all.forEach((r, i) => {
      const got = G.codex.includes(r.name);
      const seen = G.codexSeen.includes(r.name);
      const feat = featMap[r.name];
      h += '<div class="codex-item' + (seen ? ' seen' : '') + '" data-ci="' + i + '">' +
        '<span class="ci-icon">' + (got ? '📦' : '❔') + '</span>' +
        '<span class="ci-body"><span class="ci-name">' + (got ? r.name : '？？？') +
        (feat ? ' <span class="badge">章节' + feat.chapter + '</span>' : '') + '</span>' +
        '<span class="ci-desc">' + (got ? (r.desc || '') : '尚未收录的记忆碎片') + '</span>' +
        (got && !seen ? '<span class="ci-link">点击展开 ▾</span>' : '') + '</span></div>';
    });
    $('infoBody').innerHTML = h;
    document.querySelectorAll('[data-ci]').forEach(el => el.onclick = () => {
      const r = all[+el.dataset.ci];
      if (!G.codex.includes(r.name)) { toast('先在塔里找到它的宝箱吧'); return; }
      if (!G.codexSeen.includes(r.name)) {
        G.codexSeen.push(r.name);
        if (G.codexSeen.length >= 20) ach('browse');
        save();
      }
      el.querySelector('.ci-desc').innerHTML = (r.desc || '') +
        (r.language ? ' · ' + r.language : '') + (r.isFork ? ' · fork' : '') +
        '　<a class="ci-link" href="' + r.url + '" target="_blank" rel="noopener">GitHub ↗</a>';
      el.classList.add('seen');
    });
    $('mInfo').classList.add('show');
  },
  ach() {
    $('infoTitle').textContent = '🏆 成就墙 (' + Object.keys(G.achs).length + '/' + Object.keys(STORY.ACHS).length + ')';
    let h = '';
    for (const k in STORY.ACHS) {
      const got = G.achs[k];
      h += '<div style="margin-bottom:6px;opacity:' + (got ? 1 : .4) + '">' + (got ? '✅' : '⬜') + ' <b>' + STORY.ACHS[k].name + '</b> <span style="font-size:12px;color:var(--dim)">' + STORY.ACHS[k].desc + '</span></div>';
    }
    $('infoBody').innerHTML = h; $('mInfo').classList.add('show');
  },
  bag() {
    const c = G.cls || STORY.FALLBACK_CLASS;
    let h = '<div style="text-align:center;margin-bottom:8px"><b style="font-size:16px">' + c.name + '</b> · ' + G.name + ' · ' + G.cycle + '周目</div>' +
      '<div style="font-size:12px;color:var(--dim);text-align:center;margin-bottom:8px">' + c.desc + '</div>';
    h += '<div style="margin-top:6px">❤️ ' + G.hp + '/' + G.maxHp + '　⚔️ ' + totalAtk() + '　🛡️ ' + totalDef() + '　💎 ' + G.gem + '　💰 ' + (G.coins || 0) + '　⭐ XP ' + G.xp + '</div>';
    h += '<div style="margin-top:6px">👑 会员：' + (vipLv() > 0 ? STORY.VIP_LEVELS[vipLv() - 1].name + '（成长值 ' + Math.floor(G.vipExp || 0) + '）' : '未开通') + '</div>';
    h += '<div style="margin-top:6px">🔑 黄×' + G.keys.y + '　🔵 蓝×' + G.keys.b + '　🟥 红×' + G.keys.r + '</div>';
    if (G.vip) {
      const vips = [];
      if (vipOn('monthly')) vips.push('🌙 月卡（' + vipExpireText('monthly') + '）');
      if (vipOn('yearly')) vips.push('🎫 年费（' + vipExpireText('yearly') + '）');
      if (vipOn('season')) vips.push('🎃 Season Pass（' + vipExpireText('season') + '）');
      if (vipOn('sub')) vips.push('📺 订阅（' + vipExpireText('sub') + '）');
      if (vips.length) h += '<div style="margin-top:6px">' + vips.join('<br>') + '</div>';
    }
    if (G.credit && G.credit.active && G.credit.debt > 0) {
      h += '<div style="margin-top:6px;color:#e05575">🥕 胡萝卜白条欠款：<b>' + G.credit.debt + '</b> 币（充值中心可还款）</div>';
    }
    h += '<div style="margin-top:8px"><b>装备</b><br>';
    for (const s of ['weapon', 'armor', 'accessory']) {
      const e = G.equip[s];
      h += e ? '<span class="badge rarity' + e.rarity + '">' + e.icon + ' ' + e.name + (e.atk ? ' 攻+' + e.atk : '') + (e.def ? ' 防+' + e.def : '') + '</span>'
        : '<span class="badge">空(' + ({ weapon: '武器', armor: '防具', accessory: '饰品' })[s] + ')</span>';
    }
    h += '</div><div style="margin-top:8px"><b>技能</b><br>';
    for (const id of G.skills) { const s = STORY.SKILLS[id]; if (s) h += '<span class="badge">' + (s.type === 'passive' ? '🛡️被动' : '⚡主动') + ' ' + s.name + '：' + s.desc + '</span> '; }
    h += '</div><div style="margin-top:8px"><b>击杀统计</b><br>';
    const ks = Object.keys(G.killed);
    h += ks.length ? ks.map(k => (STORY.MONSTERS[k] ? STORY.MONSTERS[k].icon + ' ' + STORY.MONSTERS[k].name : k) + '×' + G.killed[k]).join('　') : '暂无';
    $('infoTitle').textContent = '🎒 角色面板'; $('infoBody').innerHTML = h; $('mInfo').classList.add('show');
  },
  charge() {
    const lv = vipLv();
    const cur = STORY.VIP_LEVELS[Math.max(0, lv - 1)];
    const next = STORY.VIP_LEVELS[lv] || null;
    let h = '<div style="font-size:12px;color:var(--dim);margin-bottom:4px">所有充值均可享受随机折扣（-10000.000000% ~ +10000.000000% 均匀随机，含小数），负折扣免单返现、正折扣可能天价，一切看脸</div>' +
      '<div style="font-size:13px;margin-bottom:8px">当前余额：💰 <b>' + (G.coins || 0) + '</b> 兔可可币</div>' +
      (G.credit && G.credit.active && G.credit.debt > 0
        ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#ffe4e9;border-radius:10px;margin-bottom:8px;font-size:12px">' +
          '<span>🥕 胡萝卜白条欠款：<b>' + G.credit.debt + '</b> 币</span>' +
          '<button class="btn-main" id="btnRepay" style="background:#e05575;color:#fff;padding:4px 12px;font-size:12px">一键还款</button></div>'
        : '');

    /* VIP 等级面板 */
    const exp = G.vipExp || 0;
    const prog = next ? Math.min(100, Math.round((exp - (cur ? cur.exp : 0)) / (next.exp - (cur ? cur.exp : 0)) * 100)) : 100;
    h += '<div style="padding:10px;background:linear-gradient(135deg,#fff0f6,#ffe0ec);border-radius:12px;border:1px solid var(--accent);margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;font-size:13px"><b>👑 ' + (lv > 0 ? cur.name : '未开通会员') + '</b>' +
      '<span style="font-size:11px;color:var(--dim)">成长值 ' + Math.floor(exp) + (next ? ' / ' + next.exp : '') + '</span></div>' +
      '<div style="height:8px;background:var(--panel2);border-radius:4px;margin:6px 0;overflow:hidden"><div style="height:100%;width:' + prog + '%;background:linear-gradient(90deg,#ffb6c9,#ff6b9d)"></div></div>' +
      (next ? '<div style="font-size:11px;color:var(--dim)">再充 ' + Math.max(0, Math.ceil(next.exp - exp)) + ' 币晋升 ' + next.name + '：' + next.perk + '</div>'
            : '<div style="font-size:11px">🎉 已满级！兔可可改口叫你老板</div>') + '</div>';

    /* 特权总览 */
    h += '<div style="font-size:12px;color:var(--dim);margin-bottom:4px">👑 VIP 特权一览（成长值越高等级越高）</div>' +
      '<div style="font-size:11px;line-height:1.9;margin-bottom:10px">' +
      STORY.VIP_LEVELS.map(v => '<div style="' + (v.lv <= lv ? 'color:var(--accent)' : 'opacity:.45') + '">' +
        (v.lv <= lv ? '✅' : '🔒') + ' <b>' + v.name + '</b>（' + v.exp + '）' + v.perk + '</div>').join('') + '</div>';

    /* 分组商品 */
    const group = (title, filter, btnStyle) => {
      let gh = '<div style="font-size:12px;color:var(--dim);margin:8px 0 4px">' + title + '</div>';
      let any = false;
      for (const k in STORY.SKUS) {
        const s = STORY.SKUS[k];
        if (!filter(s)) continue;
        any = true;
        const isSub = !!s.vip;
        const owned = isSub && vipOn(s.vip);
        const ownedTxt = owned ? ' <span class="badge rarity3">已开通 · ' + vipExpireText(s.vip) + '</span>' : '';
        gh += '<div style="display:flex;justify-content:space-between;align-items:center;margin:5px 0;gap:6px' + (s.type === 'weird' || isSub ? ';padding:10px;background:var(--panel2);border-radius:10px' : '') + '">' +
          '<span style="font-size:13px"><b>' + s.name + '</b>' + ownedTxt +
          '<br><span style="font-size:11px;color:var(--dim)">' + s.desc + '</span></span>' +
          '<button class="btn-main" data-sku="' + k + '" style="' + (s.isBox ? 'background:linear-gradient(135deg,#7b5cff,#ff6b9d);color:#fff' : btnStyle) + ';white-space:nowrap' + (owned ? ';opacity:.55' : '') + '">' + s.price + '</button></div>';
      }
      return any ? gh : '';
    };
    h += group('💰 充值礼包（随机折扣 · 看脸）', s => !s.vip && !s.type && !s.isBox, 'background:var(--gold);color:#5a3a00');
    h += group('🎁 会员商店', s => s.isBox, 'background:linear-gradient(135deg,#7b5cff,#ff6b9d);color:#fff');
    h += group('📺 订阅 / 通行证', s => s.vip, 'background:linear-gradient(135deg,#7b5cff,#ff6b9d);color:#fff');
    h += group('🤪 奇趣氪金项目（玄学效果，纯属自愿）', s => s.type === 'weird', 'background:linear-gradient(135deg,#66c2a5,#41a0c8);color:#fff');

    /* 银行流水 */
    const log = (G.coinLog || []).slice(0, 12);
    h += '<div style="margin-top:10px;font-size:12px;color:var(--dim)">🏦 兔子银行流水' + (log.length ? '（最近 ' + log.length + ' 笔）' : '') + '</div>' +
      '<div style="font-size:11px;line-height:1.9;margin-top:4px">' +
      (log.length ? log.map(l => '· ' + new Date(l.t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + '　' +
        (l.n > 0 ? '<b style="color:#2fa26b">+' + l.n + '</b>' : '<b style="color:#e05575">' + l.n + '</b>') + '　' + l.reason).join('<br>')
        : '暂无流水，去充值或等兔子银行发工资？') + '</div>';

    /* 抽取日志 */
    const gl = (G.gachaLog || []).slice(0, 8);
    h += '<div style="margin-top:10px;font-size:12px;color:var(--dim)">📜 开箱记录' + (gl.length ? '（最近 ' + gl.length + ' 条）' : '') + '</div>' +
      '<div style="font-family:Consolas,monospace;font-size:11px;line-height:1.9;margin-top:4px">' +
      (gl.length ? gl.map(l => '· ' + l).join('<br>') : '暂无记录，去开一箱试试？') + '</div>';

    $('chargeList').innerHTML = h;
    const rp = $('btnRepay'); if (rp) rp.onclick = repayBill;
    document.querySelectorAll('[data-sku]').forEach(b => b.onclick = () => { UI.close('mCharge'); Checkout.open(b.dataset.sku); });
    $('mCharge').classList.add('show');
  },
  settings() {
    $('infoTitle').textContent = '⚙️ AI 设置（可选）';
    $('infoBody').innerHTML = '<div style="font-size:12px;color:var(--dim);margin-bottom:8px">' +
      '填入 OpenAI 兼容网关 Key 可解锁 AI 职业召唤与即兴点评。Key 仅存本机 localStorage。不填也能玩完整游戏。</div>' +
      '<label style="font-size:12px">API Key</label><input id="aiKey" style="width:100%;padding:6px;border-radius:8px;border:1px solid #ccc;margin:2px 0 8px" value="' + (G.ai.key || '') + '" placeholder="sk-...">' +
      '<label style="font-size:12px">OpenAI BaseURL</label><input id="aiUrl" style="width:100%;padding:6px;border-radius:8px;border:1px solid #ccc;margin:2px 0 8px" value="' + G.ai.baseUrl + '">' +
      '<label style="font-size:12px">Model ID</label><input id="aiModel" style="width:100%;padding:6px;border-radius:8px;border:1px solid #ccc;margin:2px 0 8px" value="' + G.ai.model + '">' +
      '<div style="font-size:11px;color:var(--dim)">实际请求端点：' + G.ai.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions</div>';
    $('mInfo').classList.add('show');
    const bind = (id, k) => { $(id).addEventListener('change', e => { G.ai[k] = e.target.value.trim(); try { localStorage.setItem('bcos_ai_' + k, G.ai[k]); } catch (_) { } }); };
    bind('aiKey', 'key'); bind('aiUrl', 'baseUrl'); bind('aiModel', 'model');
    $('aiKey').addEventListener('change', () => { toast(G.ai.key ? '✅ AI 增强已开启' : '已清除 Key'); save(); });
  }
};

/* ==================== 作弊 API ==================== */
window.TOWER = {
  cheat: {
    get state() { return JSON.parse(JSON.stringify(Object.assign({}, G, { clsName: G.cls && G.cls.name }))); },
    _c() { markCheat(); ach('cheat'); save(); renderMap(); },
    god() { G.hp = G.maxHp = 99999; G.atk = 999; G.def = 999; toast('💥 Cheat ON'); window.TOWER.cheat._c(); },
    hp(n) { G.hp = G.maxHp = n || 99999; window.TOWER.cheat._c(); },
    atk(n) { G.atk = n || 200; window.TOWER.cheat._c(); },
    def(n) { G.def = n || 200; window.TOWER.cheat._c(); },
    key(n) { G.keys.y = G.keys.b = G.keys.r = n || 9; window.TOWER.cheat._c(); },
    gem(n) { G.gem = n || 9999; window.TOWER.cheat._c(); },
    xp(n) { G.xp = n || 1000; window.TOWER.cheat._c(); },
    tp(f) { G.floor = (f || 1) - 1; G.pos = Game.findTile('S') || Game.findTile('T') || { x: 1, y: 1 }; renderMap(); window.TOWER.cheat._c(); },
    codex() { (CODEX && CODEX.codex || STORY.FALLBACK_CODEX).forEach(r => { if (!G.codex.includes(r.name)) G.codex.push(r.name); }); toast('📖 图鉴全收录'); window.TOWER.cheat._c(); },
    pay() { markCheat(); ach('cheat'); Checkout.open('c648'); },
    win() { markCheat(); ach('cheat'); Game.victory(); },
    banner() { ach('easter'); console.log('%c🐰 档案馆向你眨了眨眼。', 'color:#ff6b9d;font-size:16px'); }
  }
};
console.log('%c🐰 兔可可的魔塔档案馆%c\nTOWER.cheat 已挂载 —— 按 F12 的你是被选中的访客\n试试 TOWER.cheat.god() / TOWER.cheat.win() / TOWER.cheat.banner()\n⚠️ 注意：游戏会根据氪金与作弊情况动态调整难度，作弊将永久上调怪物强度 +30%',
  'font-size:20px;background:#ff6b9d;color:#fff;padding:4px 10px;border-radius:6px', 'color:#ff6b9d');

/* ==================== 二周目 ==================== */
function startNG() {
  const keep = {
    hp: G.hp, maxHp: G.maxHp, atk: G.atk, def: G.def, gem: G.gem, xp: G.xp, keys: G.keys,
    coins: G.coins, vip: G.vip, vipExp: G.vipExp, coinLog: G.coinLog, wish: G.wish, _lv: G._lv, credit: G.credit,
    cheated: G.cheated, diffAdj: G.diffAdj,
    equip: G.equip, skills: G.skills, cds: G.cds, shopped: false,
    achs: G.achs, codex: G.codex, codexSeen: G.codexSeen, killed: G.killed,
    name: G.name, ai: G.ai, gachaLog: G.gachaLog, gachaSeq: G.gachaSeq, cls: null
  };
  G = newGame(true); Object.assign(G, keep);
  G.cycle = (G.cycle || 1);  /* newGame(true) 已 +1 */
  G.floor = 0; G.pos = null; G.flags = {};
  if (G.cycle === 2) ach('ng2');
  if (G.cycle === 3) ach('ng3');
  if (G.cycle >= 2) applySkin('crt');   /* 二周目 CRT 暗线 */
  save();
  summonClass(true);
}

/* ==================== 职业召唤 ==================== */
function summonClass(ng) {
  const wrap = document.createElement('div'); wrap.className = 'modal show'; wrap.id = 'mSummon';
  wrap.innerHTML = '<div class="card" id="summonCard"><h3>✨ 召唤职业档案</h3>' +
    '<div class="sub">正在从档案馆检索你的角色…</div>' +
    '<div id="sumBody" style="min-height:60px;font-size:14px;color:var(--dim)">…</div></div>';
  document.body.appendChild(wrap);
  const finish = c => {
    G.cls = c; wrap.remove();
    const lines = ['叮——你的职业档案生成好了！', '【' + c.name + '】' + c.desc];
    if (c.quip) lines.push('「' + c.quip + '」');
    lines.push('技能：' + c.skills.map(id => STORY.SKILLS[id].name).join('、'));
    Dlg.say(lines, null, enterFloor1);
  };
  const fallback = () => finish(ng ? STORY.FALLBACK_GHOST : STORY.FALLBACK_CLASS);
  if (!AI.hasKey()) { setTimeout(fallback, 900); return; }
  $('sumBody').textContent = G.ai.key ? '兔可可正在请求 AI 撰写你的命运…' : '兔可可正在翻档案…';
  AI.summonClass(ng).then(finish).catch(() => { toast('AI 走神了，使用兜底职业'); fallback(); });
}

/* ==================== 开场流程 ==================== */
function enterFloor1() {
  const c = G.cls || STORY.FALLBACK_CLASS;
  G.maxHp = c.maxHp; G.hp = c.maxHp; G.atk = c.atk; G.def = c.def;
  for (const id of (c.skills || [])) if (!G.skills.includes(id)) G.skills.push(id);
  Game.fadeIn(() => {
    const sm = $('mSummon'); if (sm) sm.remove();
    G.pos = Game.findTile('S');
    renderMap();
    const intro = G.cycle > 1
      ? ['欢迎回来，' + G.name + '。', '这一次，档案馆的灯光是冷的。怪物们也变强了（×' + foeScale().toFixed(2) + '）——但你的力量被完整继承，轮回加成让 XP / 宝石收益 ×' + loopBonus().toFixed(1) + '。', '轮回没有尽头，去揭开上次没说完的故事吧。']
      : ['欢迎来到「兔可可的魔塔档案馆」，' + G.name + '！',
         '这里收藏着铲屎官写过的每一个项目。打开 📦 宝箱、阅读记忆碎片，就能把它们收录进图鉴！',
         '绿色的是怪物、金色的是门——钥匙要省着用。右下角的 🌀 传送门通往下一层。'];
    Dlg.say(intro, null, () => { save(); });
  });
}

function bootSequence() {
  const lines = [
    'BUNNY_TOWER BIOS v2.0 ......... OK',
    'MEM CHECK 640K ................ OK',
    'LOADING ARCHIVE ............... ' + codexTotal() + ' FILES',
    'WALLPAPER DRIVER .............. SKIPPED (PINK)',
    '',
    'WELCOME TO BUNNY TOWER.',
    'PRESS ANY KEY_'
  ];
  const el = $('boot'); let i = 0;
  const tm = setInterval(() => {
    if (i < lines.length) { el.innerHTML = lines.slice(0, ++i).join('\n') + '<span class="cur">█</span>'; }
    else {
      clearInterval(tm); el.innerHTML = lines.join('\n') + '<span class="cur">█</span>';
      const go = () => {
        removeEventListener('keydown', go); removeEventListener('pointerdown', go);
        $('boot').style.display = 'none'; $('game').style.display = 'flex'; mainMenu();
      };
      addEventListener('keydown', go); addEventListener('pointerdown', go);
    }
  }, 260);
}

function mainMenu() {
  const saved = load();
  if (saved && saved.cycle) {
    G = saved;
    /* 旧存档兼容：补齐虚拟币 / VIP / 流水字段 */
    if (G.coins === undefined) G.coins = 1288;
    if (!G.vip) G.vip = {};
    if (G.vipExp === undefined) G.vipExp = 0;
    if (!G.coinLog) G.coinLog = [];
    if (G.wish === undefined) G.wish = 0;
    if (!G.credit) G.credit = { active: false, debt: 0 };
    if (G.cheated === undefined) G.cheated = 0;
    if (G.diffAdj === undefined) G.diffAdj = 0;
    /* 恢复地图进度：地图状态存在 STORY.MAPS 运行时对象里，重开浏览器后需按存档重建。
       简化：重进时还原整层原始地图（已拾取物品会刷新——以重开本层为代价换取简单可靠） */
    for (let i = 0; i < STORY.MAPS.length; i++) STORY.MAPS[i] = ORIG_MAPS[i].slice();
    if (G.cycle >= 2) applySkin('crt');
    renderMap();
    Dlg.say(['欢迎回来，' + G.name + '！存档已恢复（' + G.cycle + '周目 · ' + STORY.FLOOR_NAMES[G.floor] + '）。'], [
      ['继续冒险', () => { }],
      ['重新开始（清空存档）', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); }, true]
    ]);
    return;
  }
  G = newGame(false);
  Dlg.say(['RSS 探测完成。检测到新访客接入。', '我是兔可可，这座魔塔档案馆的管理员。这里收藏了铲屎官的 ' + codexTotal() + ' 个项目。在正式参观之前——'], [
    ['召唤我的职业', () => summonClass(false)],
    ['随便玩玩（跳过职业）', () => { G.cls = STORY.FALLBACK_CLASS; enterFloor1(); }, true]
  ]);
}

/* ==================== 启动 ==================== */
document.addEventListener('DOMContentLoaded', async () => {
  applySkin(localStorage.getItem('bcos_skin') || 'pink');
  await loadCodex();
  bootSequence();
});

/* ==================== 全局导出 ====================
 * const 声明不挂 window —— 内联 onclick 依赖全局词法环境可用，
 * 但控制台 / 外部调试需要显式挂在 window 上。G 用 getter 取实时值。 */
Object.assign(window, {
  get G() { return G; },
  Game, UI, Dlg, Battle, Events, Shop, Checkout, Gacha,
  toggleSkin, applySkin, summonClass, startNG, enterFloor1,
  ach, save, loadCodex
});

/* 对话框点击推进 */
document.addEventListener('DOMContentLoaded', () => {
  $('dialog').addEventListener('click', () => {
    if (Dlg.typing) Dlg.skip();
    else if (!Dlg.q.length && !$('dlgOpts').children.length && Dlg.done) Dlg.next();
    else Dlg.skip();
  });
  /* 键盘移动 */
  addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w') Game.tryMove(0, -1);
    else if (k === 'ArrowDown' || k === 's') Game.tryMove(0, 1);
    else if (k === 'ArrowLeft' || k === 'a') Game.tryMove(-1, 0);
    else if (k === 'ArrowRight' || k === 'd') Game.tryMove(1, 0);
    else if (k === 'Enter' || k === ' ') { if (!Game.blocked()) { if (Dlg.typing || Dlg.q.length) Dlg.skip(); } }
  });
});
