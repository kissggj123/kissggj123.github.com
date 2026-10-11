/* ===== js/desktop.js — BCOS 桌面渲染引擎 (v8.0.2 重写) =====
 *
 * 设计原则:
 * - 桌面只渲染两样东西: 壁纸 + me 文件夹
 * - 应用图标永不渲染到桌面 (应用抽屉是唯一入口)
 * - 壁纸选择立即生效并持久化
 */

// v8.0.2: 禁用旧的桌面图标同步 (应用抽屉模式)
function _bcosSyncDesktopAppIcons() {
    // 不再在桌面渲染应用图标
    // 清理可能残留的图标
    const container = document.querySelector('.bcos-desktop-icons');
    if (container) container.innerHTML = '';
    document.querySelectorAll('#bcos-desktop-bg > .bcos-desktop-icon').forEach(el => {
        if (el.id !== 'bcos-me-folder') el.remove();
    });
}

// 桌面主渲染
function _bcosDesktopRender() {
    const bg = document.getElementById('bcos-desktop-bg');
    if (!bg) return;

    // 1. 清理旧图标
    _bcosSyncDesktopAppIcons();

    // 2. 应用壁纸
    _bcosDesktopApplyWallpaper();

    // 3. 渲染 me 文件夹
    _bcosDesktopRenderMe();
}

// 壁纸应用
function _bcosDesktopApplyWallpaper() {
    const bg = document.getElementById('bcos-desktop-bg');
    if (!bg) return;

    const wp = localStorage.getItem('bcosCustomBg');
    const cache = window.wpBlobCache || {};

    // 优先用缓存的 blob URL (全分辨率)
    if (wp && cache[wp] && cache[wp].startsWith('blob:')) {
        bg.style.backgroundImage = `url("${cache[wp]}")`;
    } else if (wp) {
        // 直接用文件路径
        bg.style.backgroundImage = `url("${wp}")`;
    } else {
        // 默认渐变
        bg.style.backgroundImage = '';
    }
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
    bg.style.backgroundRepeat = 'no-repeat';
}

// me 文件夹渲染
function _bcosDesktopRenderMe() {
    const bg = document.getElementById('bcos-desktop-bg');
    if (!bg || document.getElementById('bcos-me-folder')) return;

    const me = document.createElement('div');
    me.id = 'bcos-me-folder';
    me.className = 'bcos-desktop-icon';
    me.innerHTML = '<div class="bcos-desktop-icon-emoji" style="font-size:44px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4));">📁</div>' +
                   '<div class="bcos-desktop-icon-label" style="color:#fff;font-size:12px;margin-top:6px;text-shadow:0 1px 4px rgba(0,0,0,.6);">me</div>';
    me.style.cssText = 'position:fixed;bottom:104px;left:50%;transform:translateX(-50%);z-index:10;' +
                       'display:flex;flex-direction:column;align-items:center;cursor:pointer;' +
                       'padding:12px 16px;border-radius:16px;transition:transform .2s;';
    me.onmouseenter = () => me.style.transform = 'translateX(-50%) scale(1.08)';
    me.onmouseleave = () => me.style.transform = 'translateX(-50%) scale(1)';
    me.onclick = () => { if (typeof _bcosOpenApp === 'function') _bcosOpenApp('me'); };
    me.ondblclick = () => { if (typeof _bcosOpenApp === 'function') _bcosOpenApp('me'); };
    bg.appendChild(me);
}

// 壁纸选择 (供设置调用)
window._bcosDesktopSetWallpaper = function(file) {
    try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
    _bcosDesktopApplyWallpaper();
};

// 导出给 loader
window._bcosDesktopRender = _bcosDesktopRender;

console.log('[Desktop] 桌面渲染引擎 v8.0.2 已加载');
