/* Phase 2 - 桌面 (Liquid Glass, GPU) */
(function() {
    'use strict';
    BCOS.desktop = BCOS.desktop || {};
    BCOS.desktop.init = async function() {
        let bg = document.getElementById('bcos-desktop-bg');
        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'bcos-desktop-bg';
            document.body.insertBefore(bg, document.body.firstChild);
        }
        // 默认渐变
        bg.style.background = 'linear-gradient(135deg,#0B1026,#1a2a4a)';
        // 恢复壁纸
        if (BCOS.wallpaper && BCOS.wallpaper.restore) {
            try { await BCOS.wallpaper.restore(); } catch(e) {}
        }
        console.log('[Desktop] Phase 2 桌面已初始化 (GPU)');
    };
})();
