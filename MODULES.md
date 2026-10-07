# index.html 模块化说明 (v7.8.6.9481)

> 原 `index.html` (1.5MB, 内联 71KB CSS + 1.38MB JS) 已拆分为外部模块。
> 拆分方式: 脚本机械提取 (Acorn 语句边界), 零手工复制。
> 验证: 17 个 JS 模块按序拼接与原脚本逐字节一致; 3 个 CSS 文件拼接与原 `<style>` 逐字节一致;
> 3 处"手术"(见下) 有独立 diff 审计; 18/18 JS 文件 `node --check` 通过; 浏览器原版/模块化截图对比通过。

## 加载顺序 (index.html, 不可调换)

### CSS (`<head>`, 级联顺序 = 原文件顺序)
| 文件 | 内容 | 说明 |
|---|---|---|
| `css/base.css` | 主题变量 / 基础 / 背景 / 布局 | 原 `<style>` 第 1 段 |
| `css/ui.css` | UI 组件: 卡片/按钮/统计/周年/设置/抽卡/日志/弹窗/Toast/加载 | 原 `<style>` 第 2 段 (含游戏 UI, 保持原位以保级联) |
| `css/effects.css` | 响应式 / GPU 加速 / 渲染优化 / 触摸动效 | 原 `<style>` 第 3 段 |
| `css/car-lockscreen-a.css` | bcos 车机锁屏样式 (上) | 原 `_bcosInjectCSS()` 运行时注入, 现改为 `<link>` 预加载 |
| `css/car-lockscreen-b.css` | bcos 车机锁屏样式 (下) | 同上 |
| `css/rounded-screen.css` | **新增** 圆角矩形屏适配 | 默认零侵入, 见下 |

### JS (普通 `<script>`, 按序执行 = 原内联顺序)
| 文件 | 内容 |
|---|---|
| `js/screen.js` | **新增** 屏幕形态检测 (`<head>` 同步, 在 CSS 绘制前打标) |
| `js/core.js` | 兼容垫片 / 配置 / 游戏数据 / AI 学习 / 状态 / 初始化 / 存档迁移 |
| `js/game.js` | 大富翁: 初始化 / 实时系统 / 动态经济 / 新闻电视 |
| `js/renderer.js` | **渲染模块**: 大富翁渲染 / 全屏地图 |
| `js/game-logic-a.js` | 自动托管 / 回合逻辑 / 买地 / 银行贷款 / 载具 / 抵押 |
| `js/game-logic-b.js` | 股票 / 拍卖 / 地块升级 / 卡片使用·携带·商店 / 巫师 |
| `js/game-logic-c.js` | 市场交易 / 赌场 (轮盘/老虎机/骰宝) / 下回合&AI / 时代推进 |
| `js/ui.js` | **UI 模块**: 弹窗助手 / bcos 注入垫片(空实现, 兼容历史调用) |
| `js/os.js` | 终端 (cd/ls/pwd) / 路径解析 |
| `js/icons.js` | **图标模块**: 桌面图标状态 / 拖拽 / 重命名 / 右键菜单 |
| `js/os-apps-a/b/c.js` | bcos 系统应用 (启动动画 / macOS 风格应用 / 系统 dialogs) |
| `js/wallpaper-data.js` | **壁纸数据**: 模糊占位图 + 车机锁屏 HTML 模板 + 内置壁纸列表 (须在 wallpaper.js 前加载) |
| `js/ui-systems-c.js` | 鼠标轨迹 / PWA / 更新日志 / 主循环 |
| `js/wallpaper.js` | **壁纸管理模块**: 车机锁屏 IIFE — 壁纸引擎/缓存/预加载/适配/上传管理 |
| `js/apps.js` | 应用: 我的文件夹 / 文本编辑器 |
| `js/ui-systems-a.js` | 抽卡 / 主题 / 导航 / 周年 / 事件日志 |
| `js/ui-systems-b.js` | Toast·Loading / 上帝模式 / 存档槽 / 头像特效 / 触摸动效 |

## 三处"手术" (唯一的手工级改动, 均有脚本审计)
1. `_bcosInjectCSS()` (157KB 静态 CSS): 内容原样提取为 `css/car-lockscreen-a/b.css`,
   原函数替换为空实现 (保留函数名, 2 处历史调用点无需改动)。
   CSS 由运行时注入改为 `<link>` 预加载 —— 生效更早, 无闪烁, 行为等价。
2. `WP_PLACEHOLDER` (34KB 壁纸占位数据): 移入 `js/wallpaper-data.js` 为
   `window.__WP_PLACEHOLDER`, 原处改为 `const WP_PLACEHOLDER = window.__WP_PLACEHOLDER;`。
3. 车机锁屏 HTML 模板 (37.5KB, `el.innerHTML = \`...\``): 移入 `js/wallpaper-data.js` 为
   `window.__WP_HTML`, 原处改为 `el.innerHTML = window.__WP_HTML;`。
   模板经检查: 零 `${}` 插值、零反斜杠转义, 纯静态 HTML。
4. `BUILTIN_WALLPAPERS` (12.8KB 内置壁纸列表): 移入 `js/wallpaper-data.js` 为
   `window.__BUILTIN_WALLPAPERS`, 原处改为 `const BUILTIN_WALLPAPERS = window.__BUILTIN_WALLPAPERS;`。
   经检查为纯数据数组 (无函数/标识符引用)。

## 圆角矩形屏适配
- 启用: URL 加 `?rounded=1`, 或 `localStorage.setItem('bcos-rounded-screen','1')`,
  或 `document.documentElement.setAttribute('data-screen','rounded')`。
- 原理: `body::after` 四角遮罩 (不改布局) + 侧边栏/任务栏/顶栏内收 + 弹窗留边。
- 未启用时 `rounded-screen.css` 不产生任何视觉变化。

## PWA
- `service-worker.js` 预缓存已加入全部 24 个新模块, `CACHE_VERSION` 升至 `v7.8.6.9481`,
  旧版本加入强制清理列表。`manifest.json` 版本同步。
