/* Kernel - 启动 (安全版，不自动修改DOM) */
(function() {
    'use strict';
    window._bcosPhase1 = {
        version: '8.2.0-phase1',
        bootTime: Date.now(),
        ready: false
    };
    function _ready() {
        window._bcosPhase1.ready = true;
        console.log('[Kernel] 就绪 v8.2.0-phase1');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _ready);
    } else {
        setTimeout(_ready, 50);
    }
})();
