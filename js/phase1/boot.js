/* Phase 1 - 内核启动 (安全版，不自动修改DOM) */
(function() {
    'use strict';
    window._bcosPhase1 = {
        version: '8.2.0-phase1',
        bootTime: Date.now(),
        ready: false
    };
    // 仅标记就绪，不操作DOM，避免干扰现有站点
    function _ready() {
        window._bcosPhase1.ready = true;
        console.log('[Phase1] 内核就绪 v8.2.0-phase1');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _ready);
    } else {
        setTimeout(_ready, 50);
    }
})();
