#!/usr/bin/env node
/**
 * tools/fetch-repos.mjs — 拉取 GitHub 仓库 → data/projects.json
 * 结构：
 *   generatedAt: ISO 时间
 *   featured[]:  精选原创仓库（章节归类 + 手写 lore，由 CURATED 映射驱动，未命中自动进 codex）
 *   codex[]:     全量仓库（含 fork），自动生成图鉴条目
 * 用法：node tools/fetch-repos.mjs [--check]
 * 环境变量 GITHUB_TOKEN 可选（提升限流额度）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'projects.json');
const USER = 'kissggj123';
const PER_PAGE = 100;

/** 精选仓库 → 章节 + 剧情文案（新增精选在这里登记） */
const CURATED = {
  'Bunny-Cockpit-OS': { chapter: 1, lore: '兔可可王国的车机锁屏系统，一切的开始。为新能源车座舱大屏而设计——这座档案馆的第一块记忆碎片，也是所有故事的起点。' },
  'NIO-Dash-iOS':     { chapter: 1, lore: '蔚来车况仪表的 iOS 移植实验。把一台车的呼吸搬进手机屏幕，支线记忆：关于速度与电量的浪漫。' },
  'NIOPlay':          { chapter: 1, lore: '蔚来场景化播放器概念作。车机不只是仪表，也可以是移动的音乐厅。' },
  'YumikoToys':       { chapter: 2, lore: 'AI 桌宠玩具系列，会撒娇也会顶嘴。据说夜深时会偷偷整理主人的 commit 历史。' },
  'DarkSouls_Work':   { chapter: 3, lore: '上着班写黑魂同人战斗系统。受苦是会传染的，代码也是。' },
  'MineTraft':        { chapter: 3, lore: '方块世界的复刻练习。每一个像素都是一块砖，每一帧都是一次挖矿。' },
  'UGame':            { chapter: 3, lore: '游戏研发的练兵场：原型、demo 与被砍掉的想法都躺在这里安息。' },
  'MenglolitaHost':   { chapter: 4, lore: '个人主页主机配置与部署脚本——档案馆本身的地基，你现在站的地方就是它。' },
  'MOBS':             { chapter: 4, lore: '极客工具箱计划：把日常重复劳动全部自动化，让兔子有更多时间摸鱼。' },
  'MoRecall':         { chapter: 4, lore: '记忆回想工具。灵感来自档案馆本身——如果代码能帮人记住一切呢？' },
  'Twist':            { chapter: 4, lore: '小巧的扭转式创意工具。名字很怪，功能很直。' },
  'WiFi-Assistant':   { chapter: 4, lore: 'WiFi 助手：扫描、诊断、一键修复。断网是世界上第二难过的事。' },
  'DNSset-win':       { chapter: 4, lore: 'Windows DNS 一键切换工具。面对污染，最快的反抗就是换一条路。' },
  'Perler_beads':     { chapter: 5, lore: '拼豆图纸生成器。代码之外的指尖浪漫，兔可可的头像就是这样拼出来的。' },
  'Asahi-Steam-M1':   { chapter: 5, lore: 'Apple Silicon 上跑 Steam 的折腾记录。违和感满分，成就感也是。' },
  'kissggj123.github.com': { chapter: 5, lore: '你正在玩的这个网站。recursive：档案馆收录了它自己。' }
};

async function gh(url) {
  const headers = { 'User-Agent': 'bunny-tower-portfolio', 'Accept': 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const check = process.argv.includes('--check');
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`https://api.github.com/users/${USER}/repos?per_page=${PER_PAGE}&page=${page}&sort=pushed`);
    repos.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  const all = repos.map(r => ({
    name: r.name,
    desc: r.description || '',
    url: r.html_url,
    homepage: r.homepage || '',
    language: r.language || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    isFork: r.fork,
    topics: r.topics || [],
    createdAt: r.created_at,
    pushedAt: r.pushed_at
  }));
  const featured = all
    .filter(r => CURATED[r.name]) // 手写精选表为权威来源，fork 不排除（如 NIO 移植系列）
    .map(r => ({ ...r, chapter: CURATED[r.name].chapter, lore: CURATED[r.name].lore }));
  const curatedMissing = Object.keys(CURATED).filter(n => !all.find(r => r.name === n));
  const data = {
    generatedAt: new Date().toISOString(),
    total: all.length,
    originals: all.filter(r => !r.isFork).length,
    featured: featured.sort((a, b) => a.chapter - b.chapter),
    codex: all
  };
  if (check) {
    if (!Array.isArray(data.codex) || !data.codex.length) throw new Error('codex 为空');
    console.log(`check ok: ${data.total} repos, ${data.featured.length} featured, ${curatedMissing.length} curated missing`);
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ ${data.total} 个仓库 → ${path.relative(ROOT, OUT)}`);
    console.log(`  原创 ${data.originals} · 精选入章 ${data.featured.length} · 未命中 CURATED: ${curatedMissing.join(', ') || '无'}`);
  }
}
main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
