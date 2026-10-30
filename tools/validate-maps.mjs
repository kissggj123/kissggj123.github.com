#!/usr/bin/env node
/**
 * tools/validate-maps.mjs — 魔塔地图连通性校验器
 * 图例（正式版）：
 *   # 墙   . 地板   S 出生   T 传送门   N NPC   M 怪物   B Boss
 *   C 项目宝箱   E 装备箱   G 宝石   H 血瓶   K 黄钥匙   L 蓝钥匙
 *   Y 黄门   D 蓝门   R 红门   $ 商店   P 车库传送门
 * 规则：
 *   1. 行宽/行高一致性
 *   2. 可达性：从起点（S 优先，其次 T，否则首个通行格）flood-fill，
 *      所有非墙格必须可达（孤岛 = violation）；门算作可通过（但需钥匙，另判）
 *   3. 无死胡同：拾取/空地格（. G H K L）四邻中可通行格数 <2 → violation
 *      （事件格 N M B C E $ P T S 与门 豁免——被交互后消失或本身是终点）
 *   4. 锁死门：门格两侧均不可达 → violation
 * 用法：node tools/validate-maps.mjs js/story.js [demo/index.html]
 */
import fs from 'node:fs';

const WALL = '#';
const ENTITY = new Set(['N', 'M', 'B', 'C', 'E', '$', 'P', 'T', 'S']); // 交互后消失/终点，豁免死胡同
const PICKUP = new Set(['.', 'G', 'H', 'K', 'L']);                      // 判死胡同的格子
const DOORS = new Set(['Y', 'D', 'R']);

function extractMaps(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /const\s+MAPS\s*=\s*(\[[\s\S]*?\n\];)/;
  const m = src.match(re);
  if (!m) throw new Error(`${file}: 未找到 const MAPS 定义`);
  const code = m[1].replace(/;\s*$/, '');
  // eslint-disable-next-line no-eval
  return eval(code);
}

function validate(rows) {
  const H = rows.length, W = rows[0].length;
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] : WALL);
  const problems = [];

  rows.forEach((r, y) => { if (r.length !== W) problems.push(`行 ${y} 宽度 ${r.length} ≠ ${W}`); });
  if (problems.length) return problems;

  // 起点
  let start = null;
  const find = ch => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === ch) return { x, y };
    return null;
  };
  start = find('S') || find('T');
  if (!start) {
    for (let y = 0; y < H && !start; y++) for (let x = 0; x < W; x++)
      if (at(x, y) !== WALL) { start = { x, y }; break; }
  }
  if (!start) { problems.push('无起点（S/T 均未找到）'); return problems; }

  // flood-fill（门视为可通行，钥匙逻辑另判）
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (at(nx, ny) === WALL) continue;
      const k = nx + ',' + ny;
      if (seen.has(k)) continue;
      seen.add(k); q.push({ x: nx, y: ny });
    }
  }

  // 统计
  const count = ch => rows.join('').split(ch).length - 1;

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y);
    if (ch === WALL) continue;
    const key = x + ',' + y;

    // 1. 孤岛
    if (!seen.has(key) && !DOORS.has(ch)) problems.push(`孤岛 (${x},${y}) '${ch}' 不可达`);

    // 2. 死胡同
    if (PICKUP.has(ch) && seen.has(key)) {
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + dx, y + dy) !== WALL) n++;
      if (n < 2) problems.push(`死胡同 (${x},${y}) '${ch}' 仅 ${n} 个通行邻居`);
    }

    // 3. 锁死门
    if (DOORS.has(ch)) {
      const sides = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, c = at(nx, ny);
        if (c !== WALL && !DOORS.has(c)) sides.push(seen.has(nx + ',' + ny));
      }
      if (!sides.some(s => s)) problems.push(`锁死门 (${x},${y}) '${ch}' 两侧均不可达`);
    }
  }

  // 内容检查
  if (count('S') > 1) problems.push(`出生点 S 有 ${count('S')} 个（应 ≤1）`);
  if (count('T') === 0) problems.push('缺少传送门 T');
  if (count('Y') === 0 && count('D') === 0 && count('R') === 0) console.log(`  ⚠ ${rows.length}层无门（可选，非违规）`);

  return problems;
}

let fail = 0;
for (const file of process.argv.slice(2)) {
  let maps;
  try { maps = extractMaps(file); } catch (e) { console.error('✗ ' + e.message); fail = 1; continue; }
  console.log(`▶ ${file}：${maps.length} 层`);
  maps.forEach((rows, i) => {
    const ps = validate(rows);
    const stat = (() => {
      const s = rows.join('');
      const c = ch => s.split(ch).length - 1;
      return `C${c('C')} E${c('E')} G${c('G')} H${c('H')} K${c('K')} L${c('L')} Y${c('Y')} D${c('D')} R${c('R')} M${c('M')} B${c('B')} $${c('$')}`;
    })();
    if (ps.length) { fail = 1; ps.forEach(p => console.error(`  ✗ ${i + 1}F ${p}`)); }
    else console.log(`  ✓ ${i + 1}F 通过（${stat}）`);
  });
}
process.exit(fail);
