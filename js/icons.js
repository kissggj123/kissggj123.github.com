const _BCOS_ICON_STATE_KEY = 'bcos_desktop_icon_state_v3';
    // Purge legacy corrupt coordinates (captured while icons collided with menubar/dock)
    try {
        localStorage.removeItem('bcos_desktop_icon_state_v1');
        localStorage.removeItem('bcos_desktop_icon_state_v2');
    } catch(e) {}
    const _BCOS_STORE_APP_IDS = ['calculator', 'weather', 'notes', 'radio', 'snake', 'paint'];
    let _bcosIconSeq = 0;
    let _bcosIconJustDragged = false;
    let _bcosIconResizeBound = false;
    let _bcosIconResizeTimer = null;

    function _bcosIconStateLoad() {
        try {
            const raw = localStorage.getItem(_BCOS_ICON_STATE_KEY);
            if (raw) {
                const st = JSON.parse(raw);
                if (st && typeof st === 'object') { st.icons = st.icons || {}; return st; }
            }
        } catch(e) {}
        return { frozen: false, icons: {} };
    }
    function _bcosIconStateSave(st) {
        try { localStorage.setItem(_BCOS_ICON_STATE_KEY, JSON.stringify(st)); } catch(e) {}
    }
    function _bcosIconKind(id) {
        if (String(id).indexOf('custom_app_') === 0) return 'custom';
        if (_BCOS_STORE_APP_IDS.indexOf(id) >= 0) return 'store';
        return 'system';
    }
    function _bcosIconEl(id) {
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall) return null;
        const list = wall.querySelectorAll('.bcos-desktop-icon');
        for (let i = 0; i < list.length; i++) { if (list[i].dataset.iconId === id) return list[i]; }
        return null;
    }

    function _bcosTagDesktopIcons() {
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall) return;
        wall.querySelectorAll('.bcos-desktop-icon').forEach(el => {
            if (el.dataset.iconId) return;
            let id = '';
            if (el.id && el.id.indexOf('bcos-desk-icon-') === 0) {
                id = el.id.slice('bcos-desk-icon-'.length);
            } else {
                const oc = el.getAttribute('onclick') || '';
                const m = oc.match(/_bcosOpenApp\('([\w-]+)'\)/);
                if (m) id = m[1];
                else if (oc.indexOf('showBcosCarLockscreen') >= 0) id = 'carlock';
            }
            if (!id) id = 'icon_' + (_bcosIconSeq + 1);
            el.dataset.iconId = id;
            el.dataset.iconOrder = String(++_bcosIconSeq);
            el.dataset.origStyle = el.getAttribute('style') || '';
            const lb = el.querySelector('.bcos-desktop-icon-label');
            el.dataset.origName = lb ? lb.textContent : id;
            el._iconHome = el.parentNode;
            el.addEventListener('pointerdown', _bcosIconPointerDown);
        });
        if (!wall._bcosIconClickGuard) {
            wall._bcosIconClickGuard = true;
            // Swallow the click that browsers fire right after a drag-release so the app does not launch
            wall.addEventListener('click', (e) => {
                if (_bcosIconJustDragged) { e.stopPropagation(); e.preventDefault(); }
            }, true);
        }
        if (!_bcosIconResizeBound) {
            _bcosIconResizeBound = true;
            window.addEventListener('resize', () => {
                clearTimeout(_bcosIconResizeTimer);
                _bcosIconResizeTimer = setTimeout(_bcosApplyDesktopIconState, 150);
            });
        }
    }

    function _bcosIconFindFreeSlot(wall, st, w, h, selfId, present) {
        const wr = wall.getBoundingClientRect();
        const cw = w + 12, ch = h + 12;
        const menuH = (window.innerWidth <= 768) ? 28 : 30;
        const startY = menuH + 8;
        const dockReserve = (window.innerWidth <= 768) ? 78 : 84;
        const maxY = Math.max(startY + h, (wr.height || 600) - dockReserve);
        const occupied = [];
        Object.keys(st.icons).forEach(k => {
            const s = st.icons[k];
            if (k !== selfId && present[k] && !s.hidden && typeof s.x === 'number' && typeof s.y === 'number') occupied.push(s);
        });
        const maxX = Math.max(16, (wr.width || 800) - w);
        for (let x = 16; x <= maxX; x += cw) {
            for (let y = startY; y + h <= maxY; y += ch) {
                const clash = occupied.some(o => Math.abs(o.x - x) < w && Math.abs(o.y - y) < h);
                if (!clash) return { x: x, y: y };
            }
        }
        return { x: 16, y: startY };
    }

    // Guard against overlapping icons in the same column (e.g. coordinates saved while icons were squashed)
    function _bcosIconSeparate(items) {
        const cols = {};
        items.forEach(it => {
            const key = Math.round(it.s.x / 40);
            (cols[key] = cols[key] || []).push(it);
        });
        let changed = false;
        const menuH = (window.innerWidth <= 768) ? 28 : 30;
        const startY = menuH + 8;
        Object.keys(cols).forEach(k => {
            const col = cols[k].sort((a, b) => a.s.y - b.s.y);
            if (col.length > 0 && col[0].s.y < startY) {
                col[0].s.y = startY;
                changed = true;
            }
            for (let i = 1; i < col.length; i++) {
                const minY = col[i - 1].s.y + col[i - 1].h + 6;
                if (col[i].s.y < minY) { col[i].s.y = minY; changed = true; }
            }
        });
        return changed;
    }

    function _bcosApplyDesktopIconState() {
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall) return;
        const st = _bcosIconStateLoad();
        const els = Array.from(wall.querySelectorAll('.bcos-desktop-icon')).filter(el => el.dataset.iconId);
        const present = {};
        els.forEach(el => { present[el.dataset.iconId] = true; });
        let dirty = false;

        els.forEach(el => {
            const s = st.icons[el.dataset.iconId] || {};
            const lb = el.querySelector('.bcos-desktop-icon-label');
            if (lb) {
                const nm = s.name || el.dataset.origName;
                if (lb.textContent !== nm) lb.textContent = nm;
                lb.title = nm;
            }
            el.style.display = s.hidden ? 'none' : '';
        });

        if (st.frozen) {
            const wr = wall.getBoundingClientRect();
            const _sepItems = [];
            els.forEach(el => {
                const _s = st.icons[el.dataset.iconId];
                if (_s && !_s.hidden && typeof _s.x === 'number' && typeof _s.y === 'number') _sepItems.push({ s: _s, h: Math.max(el.offsetHeight || 0, 80) });
            });
            if (_bcosIconSeparate(_sepItems)) dirty = true;
            els.forEach(el => {
                const id = el.dataset.iconId;
                const s = st.icons[id] || (st.icons[id] = {});
                if (s.hidden) return;
                const iw = el.offsetWidth || 70, ih = el.offsetHeight || 85;
                if (typeof s.x !== 'number' || typeof s.y !== 'number') {
                    const slot = _bcosIconFindFreeSlot(wall, st, iw, ih, id, present);
                    s.x = slot.x; s.y = slot.y; dirty = true;
                }
                if (el.parentNode !== wall) wall.insertBefore(el, document.getElementById('bcos-windows'));
                el.style.position = 'absolute';
                el.style.right = 'auto';
                el.style.bottom = 'auto';
                el.style.zIndex = '1';
                const menuH = (window.innerWidth <= 768) ? 28 : 30;
                const minY = menuH + 8;
                const dockReserve = (window.innerWidth <= 768) ? 78 : 84;
                const maxY = Math.max(minY, wr.height - ih - dockReserve);
                let x = s.x, y = s.y;
                if (wr.width > 0 && wr.height > 0) {
                    x = Math.min(Math.max(8, x), Math.max(8, wr.width - iw - 8));
                    y = Math.min(Math.max(minY, y), maxY);
                }
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            });
        }
        if (dirty) _bcosIconStateSave(st);
    }

    // Switch the whole desktop from auto-flow to free layout the first time any icon is moved,
    // so the remaining icons do not jump around when one is dragged out of the flow.
    function _bcosFreezeDesktopLayout() {
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall) return;
        const st = _bcosIconStateLoad();
        if (st.frozen) return;
        const wr = wall.getBoundingClientRect();
        const menuH = (window.innerWidth <= 768) ? 28 : 30;
        const minY = menuH + 8;
        const dockReserve = (window.innerWidth <= 768) ? 78 : 84;
        const maxY = Math.max(minY, wr.height - 85 - dockReserve);
        wall.querySelectorAll('.bcos-desktop-icon').forEach(el => {
            const id = el.dataset.iconId;
            if (!id) return;
            const s = st.icons[id] || (st.icons[id] = {});
            if (s.hidden) return;
            const r = el.getBoundingClientRect();
            s.x = Math.round(r.left - wr.left);
            s.y = Math.min(Math.max(minY, Math.round(r.top - wr.top)), maxY);
        });
        (function() {
            const items = [];
            wall.querySelectorAll('.bcos-desktop-icon').forEach(el => {
                const s = el.dataset.iconId && st.icons[el.dataset.iconId];
                if (s && !s.hidden) items.push({ s: s, h: Math.max(el.offsetHeight || 0, 80) });
            });
            _bcosIconSeparate(items);
        })();
        st.frozen = true;
        _bcosIconStateSave(st);
        _bcosApplyDesktopIconState();
    }

    function _bcosResetDesktopIcons(silent) {
        try { localStorage.removeItem(_BCOS_ICON_STATE_KEY); } catch(e) {}
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall) return;
        const els = Array.from(wall.querySelectorAll('.bcos-desktop-icon'))
            .filter(el => el.dataset.iconId)
            .sort((a, b) => (+a.dataset.iconOrder) - (+b.dataset.iconOrder));
        const fallbackHome = wall.querySelector('.bcos-desktop-icons');
        els.forEach(el => {
            el.setAttribute('style', el.dataset.origStyle || '');
            el.classList.remove('bcos-icon-dragging');
            const home = (el._iconHome && el._iconHome.isConnected) ? el._iconHome : fallbackHome;
            if (home) home.appendChild(el);
        });
        _bcosApplyDesktopIconState();
        if (!silent && typeof showToast === 'function') showToast('🧩 已恢复默认桌面图标');
    }

    function _bcosIconPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const el = e.currentTarget;
        const wall = document.getElementById('bcos-desktop-bg');
        if (!wall || !el.dataset.iconId) return;
        const startX = e.clientX, startY = e.clientY, pid = e.pointerId;
        let dragging = false, baseX = 0, baseY = 0, curX = 0, curY = 0;

        const move = (ev) => {
            if (ev.pointerId !== pid) return;
            const dx = ev.clientX - startX, dy = ev.clientY - startY;
            if (!dragging) {
                if (Math.hypot(dx, dy) < 6) return;
                dragging = true;
                clearTimeout(_bcosTouchTimer);
                _bcosHideCtxMenu();
                _bcosFreezeDesktopLayout();
                const wr = wall.getBoundingClientRect(), r = el.getBoundingClientRect();
                baseX = r.left - wr.left; baseY = r.top - wr.top;
                el.classList.add('bcos-icon-dragging');
                try { el.setPointerCapture(pid); } catch(_) {}
                _bcosBeginInteract();
            }
            const wr2 = wall.getBoundingClientRect();
            const iw = el.offsetWidth || 70, ih = el.offsetHeight || 85;
            const menuH = (window.innerWidth <= 768) ? 28 : 30;
            const minY = menuH + 8;
            const dockReserve = (window.innerWidth <= 768) ? 78 : 84;
            const maxY = Math.max(minY, wr2.height - ih - dockReserve);
            curX = Math.min(Math.max(8, baseX + dx), Math.max(8, wr2.width - iw - 8));
            curY = Math.min(Math.max(minY, baseY + dy), maxY);
            el.style.left = curX + 'px';
            el.style.top = curY + 'px';
            ev.preventDefault();
        };
        const up = (ev) => {
            if (ev.pointerId !== pid) return;
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            if (!dragging) return;
            _bcosEndInteract();
            el.classList.remove('bcos-icon-dragging');
            const menuH = (window.innerWidth <= 768) ? 28 : 30;
            const minY = menuH + 8;
            const dockReserve = (window.innerWidth <= 768) ? 78 : 84;
            const maxY = Math.max(minY, (wall.offsetHeight || 600) - (el.offsetHeight || 85) - dockReserve);
            // Light 10px grid snap keeps the desktop tidy
            const sx = Math.min(Math.max(8, Math.round(curX / 10) * 10), Math.max(8, (wall.offsetWidth || 800) - (el.offsetWidth || 70) - 8));
            const sy = Math.min(Math.max(minY, Math.round(curY / 10) * 10), maxY);
            el.style.left = sx + 'px';
            el.style.top = sy + 'px';
            const st = _bcosIconStateLoad();
            const s = st.icons[el.dataset.iconId] || (st.icons[el.dataset.iconId] = {});
            s.x = sx; s.y = sy;
            _bcosIconStateSave(st);
            _bcosIconJustDragged = true;
            setTimeout(() => { _bcosIconJustDragged = false; }, 80);
        };
        document.addEventListener('pointermove', move, { passive: false });
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    // ---- In-app modal dialog (no native prompt/confirm: they break fullscreen & are blocked in car webviews)
    function _bcosDesktopDialog(opts) {
        const host = document.getElementById('bcos-desktop') || document.getElementById('bcos-overlay') || document.body;
        const old = document.getElementById('bcos-ui-dialog');
        if (old) old.remove();
        const mask = document.createElement('div');
        mask.id = 'bcos-ui-dialog';
        mask.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        const hasInput = typeof opts.input === 'string';
        mask.innerHTML = '<div style="width:min(360px,100%);background:rgba(24,28,42,.96);border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.65);padding:18px 18px 14px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:#e2e8f0;">' +
            '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;word-break:break-all;">' + _bcosEscape(opts.title || '') + '</div>' +
            (opts.message ? '<div style="font-size:12px;line-height:1.5;color:#94a3b8;margin-bottom:12px;">' + _bcosEscape(opts.message) + '</div>' : '') +
            (hasInput ? '<input id="bcos-ui-dialog-input" type="text" maxlength="40" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:9px 11px;color:#fff;font-size:14px;outline:none;margin-bottom:14px;">' : '') +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="bcos-ui-dialog-cancel" style="background:rgba(255,255,255,.1);color:#e2e8f0;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">取消</button>' +
            '<button id="bcos-ui-dialog-ok" style="background:' + (opts.danger ? '#ef4444' : 'var(--accent,#ff6b9d)') + ';color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">' + _bcosEscape(opts.okText || '确定') + '</button>' +
            '</div></div>';
        ['mousedown', 'click', 'touchstart', 'contextmenu', 'pointerdown'].forEach(t => {
            mask.addEventListener(t, ev => { ev.stopPropagation(); if (t === 'contextmenu') ev.preventDefault(); });
        });
        const close = () => { mask.remove(); };
        const submit = () => {
            const v = hasInput ? mask.querySelector('#bcos-ui-dialog-input').value : undefined;
            close();
            try { if (opts.onOk) opts.onOk(v); } catch(err) { console.error('dialog onOk error', err); }
        };
        mask.addEventListener('keydown', ev => {
            ev.stopPropagation();
            if (ev.key === 'Escape') close();
            else if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
        });
        host.appendChild(mask);
        mask.querySelector('#bcos-ui-dialog-ok').onclick = submit;
        mask.querySelector('#bcos-ui-dialog-cancel').onclick = close;
        if (hasInput) {
            const inp = mask.querySelector('#bcos-ui-dialog-input');
            inp.value = opts.input;
            setTimeout(() => { try { inp.focus(); inp.select(); } catch(_) {} }, 30);
        }
    }

    function _bcosShowIconMenuAt(x, y, el) {
        const id = el.dataset.iconId;
        const lb = el.querySelector('.bcos-desktop-icon-label');
        const em = el.querySelector('.bcos-desktop-icon-emoji');
        const name = lb ? lb.textContent : id;
        const kind = _bcosIconKind(id);
        const delText = kind === 'custom' ? '删除应用' : (kind === 'store' ? '卸载应用' : '从桌面移除');
        const badge = kind === 'custom' ? '自定义' : (kind === 'store' ? '应用' : '系统');
        const item = (act, icon, text, cls) => '<div class="bcos-context-menu-item' + (cls ? ' ' + cls : '') + '" onclick="event.stopPropagation();event.preventDefault();_bcosIconMenuAction(\'' + act + '\',\'' + id + '\')"><span class="ctx-icon">' + icon + '</span><span class="ctx-text">' + text + '</span></div>';
        const html = '<div class="bcos-ctx-header"><span>' + _bcosEscape((em ? em.textContent : '') + ' ' + name) + '</span><span class="bcos-ctx-ver">' + badge + '</span></div>' +
            item('open', '📂', '打开') +
            item('rename', '✏️', '重命名') +
            item('delete', '🗑️', delText, 'ctx-danger') +
            '<div class="bcos-ctx-separator"></div>' +
            item('reset', '🧩', '恢复默认桌面图标');
        _bcosShowContextMenuAt(x, y, html);
    }

    function _bcosIconMenuAction(action, id) {
        _bcosHideCtxMenu();
        if (action === 'open') _bcosOpenApp(id);
        else if (action === 'rename') _bcosRenameDesktopIcon(id);
        else if (action === 'delete') _bcosDeleteDesktopIcon(id);
        else if (action === 'reset') _bcosResetDesktopIcons();
    }

    function _bcosRenameDesktopIcon(id) {
        const el = _bcosIconEl(id);
        if (!el) return;
        const lb = el.querySelector('.bcos-desktop-icon-label');
        const cur = lb ? lb.textContent : id;
        _bcosDesktopDialog({
            title: '重命名',
            message: '为该桌面图标输入新名称（留空则恢复默认名称）',
            input: cur,
            okText: '确定',
            onOk: (val) => {
                const nm = _bcosCleanAppName(val);
                const st = _bcosIconStateLoad();
                const s = st.icons[id] || (st.icons[id] = {});
                if (!nm || nm === el.dataset.origName) delete s.name; else s.name = nm;
                if (_bcosIconKind(id) === 'custom' && nm) {
                    const apps = _bcosGetCustomApps();
                    const a = apps.find(x => x.id === id);
                    if (a) { a.name = nm; _bcosSaveCustomApps(apps); }
                }
                _bcosIconStateSave(st);
                _bcosApplyDesktopIconState();
                if (typeof _bcosRenderDock === 'function') { _bcosRenderDock(); _bcosUpdateDock(); }
                showToast('✏️ 已重命名为：' + (nm || el.dataset.origName));
            }
        });
    }

    