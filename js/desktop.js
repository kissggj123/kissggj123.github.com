/* ===== js/desktop.js — BCOS 桌面渲染引擎 (v8.0.2 重写) =====
 *
 * 真实背景元素: #bg-layer (index.html)
 * 桌面只渲染: 壁纸 + me 文件夹
 */
function _bcosSyncDesktopAppIcons() {
    const container = document.querySelector('.bcos-desktop-icons');
    if (container) container.innerHTML = '';
    document.querySelectorAll('.bcos-desktop-icon').forEach(el => {
        if (el.id !== 'bcos-me-folder') el.remove();
    });
}

function _bcosDesktopRender() {
    console.log('[Desktop] 渲染桌面…');
    _bcosSyncDesktopAppIcons();
    _bcosDesktopApplyWallpaper();
    _bcosDesktopRenderMe();
    console.log('[Desktop] ✅ 桌面渲染完成');
}

// v8.0.2: 使用壁纸管理器
function _bcosDesktopApplyWallpaper() {
    if (window._bcosWallpaperRestore) {
        window._bcosWallpaperRestore();
    } else {
        console.warn('[Desktop] 壁纸管理器未加载');
    }
}

function _bcosDesktopRenderMe() {
    if (document.getElementById('bcos-me-folder')) return;
    const me = document.createElement('div');
    me.id = 'bcos-me-folder';
    me.className = 'bcos-desktop-icon';
    me.innerHTML = '<div style="font-size:44px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4));">📁</div>' +
                   '<div style="color:#fff;font-size:12px;margin-top:6px;text-shadow:0 1px 4px rgba(0,0,0,.6);">me</div>';
    me.style.cssText = 'position:fixed;bottom:104px;left:50%;transform:translateX(-50%);z-index:10;' +
                       'display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:12px 16px;';
    me.onclick = () => { if (typeof _bcosOpenApp === 'function') _bcosOpenApp('me'); };
    document.body.appendChild(me);
    console.log('[Desktop] me 文件夹已渲染');
}

window._bcosDesktopSetWallpaper = function(file) {
    if (window._bcosWallpaperSet) {
        // 检查缓存
        const cache = window.wpBlobCache || {};
        const url = (cache[file] && cache[file].startsWith('blob:')) ? cache[file] : file;
        window._bcosWallpaperSet(url);
    } else {
        console.warn('[Desktop] 壁纸管理器未加载');
    }
};
window._bcosDesktopRender = _bcosDesktopRender;
console.log('[Desktop] 桌面渲染引擎 v8.0.2 已加载');
