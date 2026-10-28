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
| 9 | 游戏机制 | **魔塔式楼层 RPG**：走格子/数值战斗/钥匙开门/宝石成长/商店/资源规划，项目内容作为关卡奖励嵌入；不做"直接通"的对话直达 |
| 10 | 作弊与氪金 | 官方控制台作弊 API（`TOWER.cheat`，彩蛋成就）+ **模拟支付**（订单号/支付动画/价格划掉显示 FREE，纯假支付不接真实接口） |
| 11 | RPG 深度 | 融合**随机角色**（职业决定初始属性/初始装备/技能）+ **装备**（武器/护甲/饰品词条掉落）+ **技能**（被动与战斗前主动技，影响战斗结算）；职业档案/装备命名词条/技能文案由 AI 生成（Schema 钳制，无 Key 用预写池） |

## 3. 文件结构（推翻旧站后新建）

```
index.html                    # 唯一入口；内联旧 SW 注销 + 缓存清理引导
css/style.css                 # 双皮肤：粉彩治愈（NG1）/ CRT（NG2），CSS 变量切换
js/engine.js                  # 对话状态机引擎：打字机、选项、事件卡、存档、图鉴、成就
js/story.js                   # 剧情脚本：章节/对话树/事件/成就定义/二周目差异 + 精简兜底数据
js/ai.js                      # 可复用 LLM 模块：AI.chat(messages, opts) + 设置面板
data/projects.json            # 仓库数据（脚本生成，勿手改）
tools/fetch-repos.mjs         # node 拉取 GitHub API → data/projects.json
tools/validate-maps.mjs       # 地图连通性/死路校验（flood-fill + 死胡同检测）
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

## 5. 游戏结构（魔塔式楼层 RPG）

### 5.1 状态机

```
BOOT → PROLOGUE(1F 教学层) → FLOOR(2..7)[走格子 → 战斗/开箱 → 楼层剧情] → EPILOGUE
     → [NG+ 解锁] BASEMENT(B1..B3 档案馆暗线) → TRUE_END
```

### 5.2 序章（BOOT）

CRT 黑屏打字机启动序列（`BUNNY_OS v10 ... MEM:OK`，致敬旧站）→ 系统上线 →
兔可可登场 → 皮肤切入粉彩治愈 → 玩家输入名字（可跳过，默认「访客」）→
**职业选择**：三选一或「随机 roll」（见 5.5 角色系统）。
**控制台彩蛋**：boot 时 `console.log` 打印 ASCII 兔子横幅 + 提示
「`TOWER.cheat` 已挂载，按 F12 的你是被选中的访客」。

### 5.3 楼层 = 章节

| 楼层 | 主题 | 内容 |
|---|---|---|
| 1F | 教学层 | 移动/战斗/开门教学，兔可可引导，1~2 个简单项目宝箱 |
| 2F | 座舱与车机 | Bunny-Cockpit-OS 主线宝箱、NIO 支线 |
| 3F | 桌宠与 AI | YumikoToys 系列 |
| 4F | 游戏研发 | DarkSouls_Work / MineTraft / UGame / Asahi-Steam-M1 |
| 5F | 极客工具箱 | MenglolitaHost / MOBS / MoRecall / Twist / WiFi-Assistant… |
| 6F | 生活与创意 | Perler_beads / profile 等其余原创 |
| 7F | 终章 | 守关 Boss「Bug 之王」→ EPILOGUE（档案柜绿光悬念钩子） |
| B1~B3 | 二周目地下档案馆 | CRT 皮肤、暗线楼层文案、记忆碎片（AI 随机事件）、B3 真结局 |

### 5.4 地图数据格式（story.js 内）

每层 = 字符画数组（经典魔塔做法）+ 附属表。tile 图例：
`#` 墙 · `.` 地板 · `P` 出生点 · `N` 兔可可 NPC · `M` 怪 · `B` Boss ·
`y/b/r` 黄/蓝/红门 · `C` 项目宝箱 · `G` 宝石（红攻/蓝防）· `H` 血瓶 ·
`U/D` 上下楼梯 · `S` 商店 · `$` 机关踏板 · `T` 传送点。
附属：`monsters`（本层怪物引用）、`events`（宝箱坐标 → projectId 映射）、
`onEnter`（进层剧情钩子）。每层地图 15×11 左右，2~3 屏内可通关。

**地图质量硬约束（拒绝死路/断头路/死循环）**：
- 从出生点 flood-fill，所有地板/门后区域/楼梯/宝箱必须可达（无孤岛）
- 无封闭死胡同（进入后无法折返继续推进的支路）；机关/传送路径不得构成死循环
- `tools/validate-maps.mjs` 自动校验（node 下加载 story.js 导出的地图数据跑
  flood-fill + 死胡同检测），不通过则报出坐标，CI 与本地 `--check` 都跑；
  AI 生成的新地图同样必须过此校验器才允许注入
- 视觉规格见第 6 节（地板微差棋盘纹理、墙面立体感、装饰 tile）

### 5.5 核心机制

- **角色系统（随机职业）**：序章三选一或随机 roll，职业 = 初始属性/初始装备/技能的组合：
  ① **铲屎官**（均衡型 HP650/攻55/防35，被动「治愈之心」战斗后回 5% HP）
  ② **秃头程序员**（速攻型 HP550/攻68/防26，主动「Debug 重击」本场无视 50% 怪防，
  冷却 3 场）③ **兔可可近卫**（铁壁型 HP800/攻48/防46，被动「护体绒毛」每场首回合免伤）
  ——各职业剧情对话有专属差异台词；二周目解锁第四隐藏职业「档案幽灵」（CRT 皮肤专属）
- **装备系统**：三槽位（武器/护甲/饰品），来源：Boss 必掉、项目宝箱 40% 概率、
  商店出售、隐藏格；词条制——武器+攻、护甲+防、饰品带特效（「XP +10%」「每层送 1 黄钥匙」
  「首回合免伤 +5%」）；稀有度 3 档（普通/稀有/史诗，史诗带彩色光效边框）；
  命名玩梗（「传说中的机械键盘 · 攻+15」「防烧屏镀膜 · 防+8」）；换装即时重算属性
- **技能系统**：被动技常驻参与战斗结算；主动技在战斗预览卡勾选发动（有冷却场数）；
  战斗预览卡实时显示技能/装备影响后的预期数值；技能升级：XP 购买（商店内「技能研习」）
- **战斗**：经典魔塔公式——玩家先攻，每回合伤害 = `max(怪攻 - 玩家防, 0)`，
  怪物伤害 = `max(玩家攻 - 怪防, 0)` 决定回合数；技能/装备作为修正项叠加
  （无视防御、免伤、吸血等）；踩上怪格前弹战斗预览卡
  （预期损耗/收益），全怪物表可在图鉴查询（数值规划是玩法的一部分）；
  胜利掉 XP，概率掉宝石，Boss 掉装备。程序员梗怪物：内存泄漏史莱姆、404 幽灵、NullPointerException 等
- **钥匙与门**：黄/蓝/红三色；项目宝箱区、Boss 区需对应钥匙 → 资源规划构成「不直接通」的阻力
- **成长**：红宝石 +攻、蓝宝石 +防、血瓶 +HP；XP 在商店消费
- **商店**（`S` 格，2F 起每隔一层出现）：XP 购买钥匙/血瓶/宝石
- **模拟支付（虚拟氪金，不接任何真实支付接口）**：商店内「648 氪金礼包」→ 弹出
  模拟收银台：生成订单号（`BC + 时间戳 + 随机位`）、商品名、支付方式选择
  （**全部为虚构渠道**：兔可可币 / 胡萝卜信用卡 / 月光宝盒钱包——
  **不出现任何真实支付品牌**）、大额价格展示 → 点击「支付订单」→
  加载转圈 → **价格划掉动画 + 「FREE」标签弹出** → 支付成功动画（彩带/toast）→
  到账（大额 XP + 三色钥匙 + 宝石）→ 成就「💎 氪金玩家」；成功页放「顺手去给
  作者点个 Star」彩蛋链接。开发者通道 `TOWER.cheat.pay()` 跳过动画直接到账
- **控制台作弊（官方彩蛋）**：`window.TOWER.cheat = { god, hp, atk, def, key, xp, tp, reveal, pay, win }`
  （无敌/加属性/加钥匙/加XP/传送楼层/全图显示/模拟支付/直接通关）；
  首次调用解锁隐藏成就「⌨ 开挂的人生」——F12 是给开发者的专属入口

### 5.6 二周目（New Game+）

7F 通关后主菜单出现「地下档案馆」：全程 CRT 皮肤、兔可可「想起前世记忆」
（隐藏对话差异）、暗线楼层文案、AI 记忆碎片随机事件。B3 真结局（TRUE_END）
揭示：王国由铲屎官的记忆筑成（悬疑收束，回归治愈）。
继承：数值/图鉴/成就/玩家名字；地下层怪物数值随周目上调。

### 5.7 成就系统（26 枚）

楼层通关 8（1F~7F + 真结局）+ 图鉴里程碑 5（10/50/100/150/180 收录）+
剧情隐藏选择 4 + 二周目 3 + 全项目浏览/全成就/隐藏彩蛋 4 +
作弊「⌨ 开挂的人生」+ 氪金「💎 氪金玩家」= 26。
示例命名：「初来乍到」「座舱检修员」「图鉴·百连收藏」「记忆修复师」「真相之下」。

## 6. 引擎与交互（js/engine.js）

- 模块内部分区：`Map`（CSS grid tile 渲染 / 碰撞 / 逐步移动）、`Battle`（公式 / 预览 /
  结算 / 技能与装备修正）、`Bag`（钥匙 / 宝石 / XP）、`Equip`（三槽位 / 词条 / 换装重算）、
  `Skill`（被动常驻 / 主动冷却）、`Shop`（含氪金礼包与技能研习）、`Cheat`（`window.TOWER`）、
  `UI`（对话框 / 项目事件卡 / 图鉴 / 成就墙 / 角色面板 / 设置面板）、`Save`
- 操作：方向键 / WASD / 触屏虚拟方向键 / 点击相邻格；对话框打字机（点击跳过）、
  对话历史回看、项目事件卡（lore + GitHub 链接按钮 + 掉落结算，翻出动效）
- 界面：状态栏（楼层 / HP / 攻 / 防 / 三色钥匙 / XP / 图鉴计数）、角色面板
  （职业立绘框 / 装备三槽 / 技能列表与冷却）、图鉴（怪物表 +
  项目搜索 + fork 筛选 + 收录计数）、成就墙、设置面板（AI 配置）、重开一周目（保留图鉴）
- 存档：`localStorage['rpg_save_v1']` = `{ name, cycle, class, floor, pos,
  stats{hp,atk,def,god}, equip{weapon,armor,accessory}, skills[], cds{}, 
  keys{y,b,r}, xp, flags[], achievements[], codexSeen[], monstersKilled[],
  ai: {baseUrl, model, key} }`，每步自动存
- 数值设计：怪物表、成长曲线、装备词条收益、技能强度集中在 story.js，
  保证三职业均可 7F 通关且资源留约 20% 冗余（友好难度）
- 视觉：CSS 变量双皮肤（粉彩 `#FF6B9D` 系 / CRT `#33ff66` 系），全 CSS 动效，零图片；
  **地图美化规格**——地板用微差双色棋盘纹理（同色系两档明度交替），墙面带 inset
  立体投影与顶边高光，装饰 tile（灌木🌸/地毯/书架📚 纯 CSS+emoji 点缀在楼层角落），
  tile 悬停/选中微光，楼层切换整屏淡入淡出
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
  4. **辅助生成（适当使用）**：AI 按固定 JSON Schema 生成① 剧情参数
     （记忆碎片的怪物数值/奖励/台词）② 新楼层地图（字符画 + 附属表）
     ③ RPG 内容文案——职业档案描述、装备命名与词条、技能说明
     （数值钳制在设计区间 ±10%，特效词条仅允许白名单组合）；
     生成结果一律先过校验器（地图用 `tools/validate-maps.mjs` 同款逻辑：
     连通性/死路/数值区间），不合格自动重试 1 次后回退预写内容池——
     **AI 只做增量内容，永不接管主流程**
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

1. 本地：`node tools/fetch-repos.mjs --check` 校验 JSON；`node tools/validate-maps.mjs`
   校验全部楼层（连通性/死路/死循环）；本地起静态服务器
2. 浏览器全流程：boot → 1F~7F 通关 → 二周目地下层 → 真结局；图鉴/成就/存档重开/
   控制作弊 API/模拟支付收银台动画（价格划掉 + FREE）
3. AI 层：实测 qnaigc 端点 CORS（实施第一个任务）；无 key / 错 key / 超时三态
4. 线上（Tabbit）：部署后验证老访客 SW 注销生效、新站可玩、移动端视口

## 12. 非目标（明确不做）

- 不做新 service-worker、不做 PWA manifest（纯静态页）
- 不做后端/数据库（存档全在 localStorage）
- 不做音乐 BGM、像素立绘图片资产（后续可加）
- 不做多语言（中文为主）
- 不做游客云同步、排行榜
