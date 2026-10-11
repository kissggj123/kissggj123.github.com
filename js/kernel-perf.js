/* ===== js/kernel-perf.js — BCOS 8.0.1 内核性能与稳定性模块 =====
 *
 * - 事件委托: 减少 DOM 监听器数量
 * - 节流/防抖: 高频事件优化
 * - 内存管理: 窗口关闭时清理
 * - 性能监控: FPS / 长任务检测
 * - 彩蛋: Konami 代码, 派对模式
 */
(function() {
    'use strict';

    // ---------- 节流 ----------
    window._bcosThrottle = function(fn, ms) {
        let last = 0, timer = null;
        return function() {
            const now = Date.now();
            const args = arguments, ctx = this;
            const remaining = ms - (now - last);
            if (remaining <= 0) {
                if (timer) { clearTimeout(timer); timer = null; }
                last = now;
                fn.apply(ctx, args);
            } else if (!timer) {
                timer = setTimeout(() => { last = Date.now(); timer = null; fn.apply(ctx, args); }, remaining);
            }
        };
    };

    // ---------- 事件委托 ----------
    // 用法: _bcosDelegate(document, 'click', '.my-btn', handler)
    window._bcosDelegate = function(root, event, selector, handler) {
        root.addEventListener(event, function(e) {
            const el = e.target.closest(selector);
            if (el && root.contains(el)) handler.call(el, e);
        });
    };

    // ---------- 内存管理: 窗口清理 ----------
    const _origCloseWin = window._bcosCloseWin;
    if (typeof _origCloseWin === 'function') {
        window._bcosCloseWin = function(app) {
            try {
                // 清理该窗口的定时器
                if (window._bcos && window._bcos.wins && window._bcos.wins[app]) {
                    const win = window._bcos.wins[app];
                    if (win._timers) win._timers.forEach(t => clearInterval(t));
                    if (win._timeouts) win._timeouts.forEach(t => clearTimeout(t));
                }
            } catch(e) {}
            return _origCloseWin(app);
        };
    }

    // ---------- 性能监控 ----------
    window._bcosPerf = {
        fps: 0, longTasks: 0, lastCheck: Date.now(),
        start() {
            let frames = 0, lastT = performance.now();
            const loop = () => {
                frames++;
                const now = performance.now();
                if (now - lastT >= 1000) {
                    this.fps = Math.round(frames * 1000 / (now - lastT));
                    frames = 0; lastT = now;
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
            // 长任务检测
            if ('PerformanceObserver' in window) {
                try {
                    new PerformanceObserver(list => {
                        list.getEntries().forEach(() => this.longTasks++);
                    }).observe({ entryTypes: ['longtask'] });
                } catch(e) {}
            }
        },
        report() {
            return { fps: this.fps, longTasks: this.longTasks,
                     mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : 'N/A' };
        }
    };

    // ---------- 彩蛋: Konami 代码 ----------
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let _ki = 0;
    document.addEventListener('keydown', e => {
        _ki = (e.key === KONAMI[_ki]) ? _ki + 1 : (e.key === KONAMI[0] ? 1 : 0);
        if (_ki === KONAMI.length) {
            _ki = 0;
            _bcosPartyMode();
            if (typeof showToast === 'function') showToast('🎉 Konami 代码激活！派对模式！');
        }
    });

    // ---------- 彩蛋: 派对模式 ----------
    window._bcosPartyMode = function() {
        if (document.getElementById('bcos-party')) return;
        const s = document.createElement('style');
        s.id = 'bcos-party';
        s.textContent = '@keyframes bcos-party-hue { to { filter: hue-rotate(360deg); } }' +
            '.bcos-window { animation: bcos-party-hue 2s linear infinite !important; }';
        document.head.appendChild(s);
        setTimeout(() => { const el = document.getElementById('bcos-party'); if (el) el.remove(); }, 10000);
    };

    // 启动性能监控
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window._bcosPerf.start());
    } else {
        window._bcosPerf.start();
    }

    console.log('[BCOS Kernel] 性能模块已加载 v8.0.1');
})();
