# RPG 作品集重造 · 设计文档

- 日期：2026-10-29
- 状态：设计对话已定稿，待用户审阅
- 仓库：kissggj123.github.com（GitHub Pages，线上域名 so.menglolita.com）

## 1. 背景与目标

现有站点是 bcos 虚拟手机 OS（v9.1.1）。用户决定**彻底推翻重做**：把首页变成一个
「可交互 RPG 文字游戏式作品集」，内容来自 GitHub API 拉取的 180 个公开仓库
（约 31 原创 + 149 fork），要求剧情复杂可玩、支持二周目、可接入大模型增强
（用户自带 API Key，不内嵌）。

## 2. 已确认决策

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 旧站处理 | **A 彻底替换**：bcos 全部下线，新页面是唯一首页 |
| 2 | 玩法形态 | **A+B 融合**：CRT 终端 boot 开场 + 兔可可 NPC 对话冒险导览 |
| 3 | 仓库取舍 | **C 全量图鉴**：原创做主线章节，180 仓库全量进收集图鉴 |
| 4 | 剧情深度 | 复杂可玩，**支持二周目**（继承图鉴/成就，解锁真结局） |
| 5 | 世界观 | **A 为主 B/C 为辅**：兔可可数据王国治愈主线，档案馆悬疑暗线埋二周目 |
| 6 | 视觉基调 | **B 粉彩治愈**（一周目），CRT 荧光绿反转（二周目档案馆暗线） |
| 7 | 技术方案 | **三案融合**：构建时拉数据打底 + 运行时增量校验 + GitHub Actions 定时保鲜 |
| 8 | AI 接入 | OpenAI 兼容网关直连（Modelink/`api.qnaigc.com`），用户自填 Key，不内嵌 |

## 3. 文件结构（推翻旧站后新建）

```
index.html                    # 唯一入口；内联旧 SW 注销 + 缓存清理引导
css/style.css                 # 双皮肤：粉彩治愈（NG1）/ CRT（NG2），CSS 变量切换
js/engine.js                  # 对话状态机引擎：打字机、选项、事件卡、存档、图鉴、成就
js/story.js                   # 剧情脚本：章节/对话树/事件/成就定义/二周目差异 + 精简兜底数据
js/ai.js                      # 可复用 LLM 模块：AI.chat(messages, opts) + 设置面板
data/projects.json            # 仓库数据（脚本生成，勿手改）
tools/fetch-repos.mjs         # node 拉取 GitHub API → data/projects.json
.github/workflows/update-projects.yml   # 每日定时重拉数据并自动提交
```

纯静态、零框架、零图片资产（兔可可形象 = 🐰 + 对话框立绘框，CSS 绘制）。

## 4. 数据层（data/projects.json）

```json
{
  "generatedAt": "2026-10-29T00:00:00Z",
  "featured": [
    {
      "name": "Bunny-Cockpit-OS",
      "title": "剧情标题（手写）",
      "lore": "剧情文案（手写，2~4 段）",
      "chapter": "cockpit",
      "xp": 50,
      "desc": "原始简介",
      "url": "https://github.com/kissggj123/Bunny-Cockpit-OS",
      "language": "JavaScript", "stars": 0, "fork": false, "pushedAt": "2026-10-07"
    }
  ],
  "codex": [
    { "name": "...", "desc": "...", "url": "...", "language": "...", "stars": 0, "fork": true, "pushedAt": "..." }
  ]
}
```

- `featured[]`：全部原创仓库（约 31 个），每条附手写 `title/lore/chapter/xp`
- `codex[]`：**全量 180 条**自动生成（含 fork），图鉴数据源
- 章节代号：`cockpit`（座舱与车机）/ `pet`（桌宠与AI）/ `game`（游戏研发）/ `tool`（极客工具箱）/ `life`（生活与创意）

### 章节归类（初步，以脚本实拉数据为准）

- **第一章 座舱与车机**：Bunny-Cockpit-OS（主线）、kissggj123.github.com（本站）；支线 fork：NIO-Dash-iOS、NIOPlay
- **第二章 桌宠与 AI**：YumikoToys、YumikoToys-Lite、YumikoToys-MTMR、YumikoAnime；支线：YumikoToys-Browser
- **第三章 游戏研发**：DarkSouls_Work、MineTraft、UGame、Asahi-Steam-M1；支线：UE4Cleaner
- **第四章 极客工具箱**：MenglolitaHost、MOBS、MoRecall、Twist、WiFi-Assistant、DNSset-win、Route、ArcPy-multiexport、OpenWrt-AC1750
- **第五章 生活与创意**：Perler_beads、kissggj123（profile）；其余小型原创归第五章可选项

### 运行时增量校验

页面加载后后台 fetch GitHub API（2 页 × per_page=100）对比 `codex` 数量与新仓库名；
发现新仓库 → 图鉴标记 `NEW` 追加（不入存档，下次跑脚本后固化）；**任何失败静默降级**用静态数据。

## 5. 剧情结构

### 5.1 状态机

```
BOOT → PROLOGUE → CHAPTER(1..5)[对话 → 选项 → 项目事件*] → EPILOGUE(周目结局)
     → [NG+ 解锁] ARCHIVE(档案馆暗线) → TRUE_END
```

### 5.2 序章（BOOT）

CRT 黑屏打字机启动序列（`BUNNY_OS v10 ... MEM:OK`，致敬旧站）→ 系统上线 →
兔可可登场 → 皮肤切入粉彩治愈 → 玩家输入名字（可跳过，默认「访客」）。

### 5.3 一周目五章 + 终章

每章流程：兔可可引导对话 → 2~3 个选项（分支对话/进入项目/跳章）→ 项目事件卡
（lore 剧情文案 + 真实 GitHub 链接按钮 + 经验值入账）→ 章节完成成就。
**终章**：庆功 → 兔可可欲言又止 → 档案柜闪过一抹绿光（悬念钩子）→ 一周目结局（EPILOGUE）。

### 5.4 二周目（New Game+）

通关后主菜单出现「档案馆」入口，点击进入：全程 CRT 皮肤、兔可可"想起前世记忆"
（隐藏对话差异）、章节重访配暗线文案。真结局（TRUE_END）揭示：王国由铲屎官的
记忆筑成（悬疑收束，回归治愈）。二周目继承：图鉴收录、成就、玩家名字。

### 5.5 成就系统（24 枚）

生成规则：章节通关 7（五章+终章+二周目）+ 图鉴里程碑 5（10/50/100/150/180 收录）+
剧情选择 4（特定隐藏选项）+ 二周目 3 + 全项目浏览/全成就/隐藏彩蛋 5。
示例命名：「初来乍到」「座舱检修员」「图鉴·百连收藏」「记忆修复师」「真相之下」。

## 6. 引擎与交互（js/engine.js）

- 渲染：打字机文本（点击跳过）、选项按钮、项目事件卡（翻出动效）、对话历史回看
- 界面：状态栏（周目/章节/成就计数）、图鉴（搜索 + fork 筛选 + 收录计数）、成就墙、
  设置面板（AI 配置）、重开一周目按钮（保留图鉴）
- 存档：`localStorage['rpg_save_v1']` = `{ name, cycle, chapter, flags, xp, achievements[], codexSeen[], ai: {baseUrl, model, key} }`，每步自动存
- 视觉：CSS 变量双皮肤（粉彩 `#FF6B9D` 系 / CRT `#33ff66` 系），全 CSS 动效，零图片
- 响应式：手机竖屏 / 桌面 / 车机横屏均可用（延续旧站使用场景）

## 7. AI 增强层（js/ai.js）

- 接口：`AI.chat(messages, opts)`，OpenAI 兼容 `POST {baseUrl}/v1/chat/completions`，
  `Authorization: Bearer <key>`，`stream:false`；本地逐字渲染模拟打字机
- 设置面板默认值：`baseUrl=https://api.qnaigc.com`、`model=qiniu/conatus-free`、key 空；
  三项均可改（任何 OpenAI 兼容网关可用）；key 仅存 localStorage，**不进代码库**
- 解锁玩法（story.js 声明 `ai:true` 的事件自动走 LLM）：
  1. **兔可可自由对话**：任意时刻召唤，system prompt 注入角色设定 + 当前章节/项目上下文 + 玩家图鉴进度
  2. **即兴点评**：项目事件通关后基于 `desc` 现挂点评（每次不同）
  3. **记忆碎片**（二周目）：AI 随机生成小事件/小故事，二周目体验不重复
- 兜底：失败/超时（15s）→ 落回预写文案 + 「兔可可走神了一会…」提示
- **无 Key 完全可玩**：所有 AI 事件均有预写文案版本，离线体验完整

## 8. 旧站下线与 SW 处理（第一优先级）

- `index.html` `<head>` 内联引导脚本：`navigator.serviceWorker.getRegistrations()` 全量
  `unregister()`；`caches.keys()` 删除 `bunny-cc-*` / `bcos-*` 前缀缓存 —— 保证老访客
  首次访问即脱离旧 SW 控制、看到新站
- 新站**不注册新 SW**
- 删除旧文件（git 历史可找回）：`js/`（bcos 全部）、`modules.json`、`service-worker.js`、
  `car.html`、`manifest.json`、`manifest-car.json`、`wallpaper/`、`dist/` 等所有新站不引用的旧资产
- 保留：`.git/`、`.gitignore`、`icon/`（新站 favicon 复用其中一档尺寸）、
  `README.md`（存在则同步更新为作品集说明）

## 9. 数据管线

- `tools/fetch-repos.mjs`：拉 `https://api.github.com/users/kissggj123/repos?per_page=100&page=1..2`
  → 合并去重 → 分离 featured/codex → 与 `tools/featured-meta.json`（手写 title/lore/chapter/xp）
  合并 → 写 `data/projects.json`；`--check` 参数仅校验 schema
- `.github/workflows/update-projects.yml`：每日 UTC 22:00 + 手动触发，跑脚本后若有 diff
  自动 commit（`chore(data): refresh projects`）
- featured-meta.json 的剧情文案为实施期手写产物，不随脚本覆盖

## 10. 错误处理

| 场景 | 行为 |
|------|------|
| projects.json 加载失败 | 用 story.js 内置精简兜底数据（≤8 个代表项目），游戏照玩 + 顶部提示 |
| 运行时 API 校验失败 | 静默（console.warn），不弹窗 |
| AI 请求失败/超时 | 落回预写文案，标记「兔可可走神了一会…」 |
| localStorage 不可用 | 内存态运行 + 顶部提示「进度不会被保存」 |
| 存档损坏（JSON.parse 失败） | 备份后重置为全新进度 |

## 11. 验证方式

1. 本地：`node tools/fetch-repos.mjs --check` 校验 JSON；本地起静态服务器
2. 浏览器全流程：boot → 一周目通关 → 二周目 → 真结局；图鉴/成就/存档重开
3. AI 层：实测 qnaigc 端点 CORS（实施第一个任务）；无 key / 错 key / 超时三态
4. 线上（Tabbit）：部署后验证老访客 SW 注销生效、新站可玩、移动端视口

## 12. 非目标（明确不做）

- 不做新 service-worker、不做 PWA manifest（纯静态页）
- 不做后端/数据库（存档全在 localStorage）
- 不做音乐 BGM、像素立绘图片资产（后续可加）
- 不做多语言（中文为主）
- 不做游客云同步、排行榜
