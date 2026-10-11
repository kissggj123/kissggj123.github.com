/* ===== js/desktop.js — v8.1.0.8910 =====
 * 7.8.6 负责桌面主体 (壁纸/图标), 此文件只做 Aurora 增强
 * 壁纸: 使用 7.8.6 的 _bcosApplyDesktopTheme (稳定)
 */
function _bcosSyncDesktopAppIcons() {
    // 8.0 需求: 桌面不显示普通图标 (抽屉是唯一入口)
    // 但保留图标 DOM 供抽屉收集
    const container = document.querySelector('.bcos-desktop-icons');
    if (container) {
        // 隐藏而非删除, 抽屉需要收集
        container.style.display = 'none';
        console.log('[Desktop] 桌面图标已隐藏 (抽屉模式)');
    }
}

function _bcosDesktopRender() {
    console.log('[Desktop] v8.1.0 渲染…');
    // 壁纸由 7.8.6 的 _bcosApplyDesktopTheme 处理
    if (window._bcosApplyDesktopTheme) {
        window._bcosApplyDesktopTheme();
    }
    _bcosSyncDesktopAppIcons();
    console.log('[Desktop] ✅ 完成');
}

// 兼容旧调用
window._bcosDesktopSetWallpaper = function(file) {
    try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
    if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
};
window._bcosDesktopRender = _bcosDesktopRender;
console.log('[Desktop] v8.1.0 已加载');
