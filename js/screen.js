/* ===== js/screen.js — 屏幕形态检测 (圆角矩形屏) =====
 * 在 <head> 中同步加载, 于 CSS 绘制前给 <html> 打标 data-screen="rounded",
 * 配合 css/rounded-screen.css 生效。无任何副作用, 未启用时直接返回。
 */
(function () {
    try {
        var enabled = false;
        // 1. URL 参数 ?rounded=1
        if (/(?:\?|&)rounded=1(?:&|$)/.test(location.search)) enabled = true;
        // 2. localStorage 持久开关
        if (!enabled) {
            try { enabled = localStorage.getItem('bcos-rounded-screen') === '1'; } catch (e) {}
        }
        if (enabled) document.documentElement.setAttribute('data-screen', 'rounded');
    } catch (e) { /* 检测失败则保持默认矩形屏, 不影响主流程 */ }
})();
