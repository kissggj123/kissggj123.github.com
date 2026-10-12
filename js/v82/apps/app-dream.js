/* v8.2 app-dream.js - 梦境日记 (兔可可主题) */
(function() {
    'use strict';
    window._bcosAppDream = {
        id: 'dream', name: '梦境日记', icon: '🌙',
        render: function() {
            return '<div style="display:flex;flex-direction:column;height:100%;color:#fff;background:linear-gradient(135deg,#0B1026,#1a1a3a)">'
                + '<div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.1)"><h3 style="margin:0">🌙 梦境日记</h3><div style="font-size:12px;opacity:.6">记录 IV 级梦境重叠</div></div>'
                + '<div id="dream-list" style="flex:1;overflow-y:auto;padding:12px"></div>'
                + '<div style="padding:12px;border-top:1px solid rgba(255,255,255,.1);display:flex;gap:8px"><input id="dream-input" placeholder="记录梦境..." style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff"><button onclick="_bcosDreamAdd()" style="padding:10px 20px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">记录</button></div></div>';
        },
        onOpen: function() { window._bcosDreamRefresh(); }
    };
    window._bcosDreamRefresh = function() {
        const el = document.getElementById('dream-list');
        if (!el) return;
        try {
            const dreams = JSON.parse(localStorage.getItem('bcos_dreams') || '[]');
            el.innerHTML = dreams.length ? dreams.map(function(d) {
                return '<div style="padding:12px;margin-bottom:8px;background:rgba(255,255,255,.05);border-radius:10px"><div style="font-size:12px;opacity:.5">' + d.date + '</div><div style="margin-top:4px">' + d.text + '</div></div>';
            }).join('') : '<div style="text-align:center;opacity:.5;padding:32px">还没有梦境记录<br><span style="font-size:12px">把鼻子贴在墙缝里，闻闻梦的味道</span></div>';
        } catch(e) {}
    };
    window._bcosDreamAdd = function() {
        const input = document.getElementById('dream-input');
        if (!input || !input.value.trim()) return;
        try {
            const dreams = JSON.parse(localStorage.getItem('bcos_dreams') || '[]');
            dreams.unshift({date: new Date().toLocaleString(), text: input.value.trim()});
            localStorage.setItem('bcos_dreams', JSON.stringify(dreams.slice(0, 100)));
            input.value = '';
            window._bcosDreamRefresh();
        } catch(e) {}
    };
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['dream'] = window._bcosAppDream;
    console.log('[App] dream 已注册');
})();
