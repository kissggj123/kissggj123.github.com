/* Phase 2 - 桌面 (Liquid Glass, GPU) */
(function() {
    'use strict';
    BCOS.desktop = BCOS.desktop || {};
    BCOS.desktop.init = function() {
        // 壁纸层 (GPU)
        let bg = document.getElementById('bcos-desktop-bg');
        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'bcos-desktop-bg';
            document.body.insertBefore(bg, document.body.firstChild);
        }
        // 应用壁纸
        const cur = BCOS.wallpaper.current();
        if (cur) bg.style.backgroundImage = 'url(' + cur + ')';
        else bg.style.background = 'linear-gradient(135deg,#0B1026,#1a2a4a)';
        console.log('[Desktop] Phase 2 桌面已初始化 (GPU)');
    };
})();
