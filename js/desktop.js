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

// v8.0.2 fix: 操作真实的 #bg-layer
function _bcosDesktopApplyWallpaper() {
    const bg = document.getElementById('bg-layer');
    if (!bg) { console.warn('[Desktop] #bg-layer 不存在!'); return; }
    const wp = localStorage.getItem('bcosCustomBg');
    console.log('[Desktop] 当前壁纸:', wp);
    const cache = window.wpBlobCache || {};
    let imgUrl = null;
    if (wp && cache[wp] && cache[wp].startsWith('blob:')) {
        imgUrl = cache[wp];
        console.log('[Desktop] 使用缓存的全分辨率壁纸');
    } else if (wp) {
        imgUrl = wp;
        console.log('[Desktop] 使用文件路径壁纸:', wp);
    }
    if (imgUrl) {
        bg.style.backgroundImage = `url("${imgUrl}")`;
        bg.style.backgroundSize = 'cover';
        bg.style.backgroundPosition = 'center';
        bg.style.backgroundRepeat = 'no-repeat';
        // 预加载验证
        const testImg = new Image();
        testImg.onload = () => console.log('[Desktop] ✅ 壁纸加载成功');
        testImg.onerror = () => console.warn('[Desktop] ❌ 壁纸加载失败:', imgUrl);
        testImg.src = imgUrl;
    } else {
        bg.style.backgroundImage = '';
        console.log('[Desktop] 无壁纸, 使用默认背景');
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
    console.log('[Desktop] 设置壁纸:', file);
    try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
    _bcosDesktopApplyWallpaper();
};
window._bcosDesktopRender = _bcosDesktopRender;
console.log('[Desktop] 桌面渲染引擎 v8.0.2 已加载');
