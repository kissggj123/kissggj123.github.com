/* Phase 2 - Launchpad (应用抽屉) */
(function() {
    'use strict';
    const APPS = [
        {id:'finder', icon:'📁', name:'Finder'},
        {id:'terminal', icon:'💻', name:'终端'},
        {id:'settings', icon:'⚙️', name:'系统设置'},
        {id:'textedit', icon:'📝', name:'文本编辑'},
        {id:'calculator', icon:'🧮', name:'计算器'},
        {id:'about', icon:'🐰', name:'关于本机'},
    ];
    BCOS.launchpad = BCOS.launchpad || {};
    BCOS.launchpad.toggle = function() {
        const lp = document.getElementById('bcos-launchpad');
        if (lp && lp.classList.contains('open')) BCOS.launchpad.close();
        else BCOS.launchpad.open();
    };
    BCOS.launchpad.open = function() {
        let lp = document.getElementById('bcos-launchpad');
        if (!lp) {
            lp = document.createElement('div');
            lp.id = 'bcos-launchpad';
            lp.innerHTML = '<div class="lp-search"><input id="lp-q" placeholder="搜索" autocomplete="off"></div><div class="lp-grid" id="lp-grid"></div>';
            document.body.appendChild(lp);
            document.getElementById('lp-q').addEventListener('input', function(e) { BCOS.launchpad.render(e.target.value); });
            lp.addEventListener('click', function(e) { if (e.target === lp) BCOS.launchpad.close(); });
        }
        lp.classList.add('open');
        BCOS.launchpad.render('');
    };
    BCOS.launchpad.close = function() {
        const lp = document.getElementById('bcos-launchpad');
        if (lp) lp.classList.remove('open');
    };
    BCOS.launchpad.render = function(q) {
        const grid = document.getElementById('lp-grid');
        if (!grid) return;
        q = (q || '').toLowerCase();
        const apps = APPS.filter(function(a) { return !q || a.name.toLowerCase().includes(q); });
        grid.innerHTML = apps.map(function(a) {
            return '<div class="lp-app" data-id="' + a.id + '"><div class="lp-icon">' + a.icon + '</div><div class="lp-label">' + a.name + '</div></div>';
        }).join('');
        grid.querySelectorAll('.lp-app').forEach(function(el) {
            el.addEventListener('click', function() {
                BCOS.launchpad.close();
                if (BCOS.apps && BCOS.apps[el.dataset.id]) BCOS.apps[el.dataset.id].open();
            });
        });
    };
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') BCOS.launchpad.close(); });
    console.log('[Launchpad] Phase 2 已就绪');
})();
