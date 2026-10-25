/* ===== js/bcos-pkg.js — BCOS 包管理器 (Cydia 式 A/B 无缝更新) ===== */
(function() {
    'use strict';
    const DB_NAME = 'bcos-pkg-db';
    const DB_VER = 1;
    const STORE = 'modules';
    const REGISTRY_URL = 'modules.json';
    let _db = null;
    function _openDB() {
        return new Promise((resolve, reject) => {
            if (_db) return resolve(_db);
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
            };
            req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror = (e) => reject(e);
        });
    }
    async function _get(id) {
        const db = await _openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }
    async function _put(entry) {
        const db = await _openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const req = tx.objectStore(STORE).put(entry);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }
    async function _getAll() {
        const db = await _openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }
    async function _fetchRegistry() {
        const res = await fetch(REGISTRY_URL + '?_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('Registry HTTP ' + res.status);
        return res.json();
    }
    window._bcosPkgCheck = async function() {
        const reg = await _fetchRegistry();
        const installed = await _getAll();
        const installedMap = {};
        installed.forEach(m => installedMap[m.id] = m);
        const updates = [];
        for (const [id, meta] of Object.entries(reg.modules)) {
            const inst = installedMap[id];
            const curVer = inst ? inst.version : 'none';
            if (curVer !== meta.version) updates.push({ id, ...meta, installedVersion: curVer, staged: !!(inst && inst.staged) });
        }
        return { registry: reg, updates, total: Object.keys(reg.modules).length };
    };
    window._bcosPkgDownload = async function(id, meta) {
        const url = meta.file + '?_t=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const code = await res.text();
        const existing = await _get(id) || { id };
        await _put({ id, version: meta.version, file: meta.file, desc: meta.desc,
            active: existing.active || null, staged: { code, version: meta.version, downloadedAt: Date.now() }, updatedAt: Date.now() });
        return true;
    };
    window._bcosPkgActivateStaged = async function() {
        const all = await _getAll();
        let n = 0;
        for (const m of all) {
            if (m.staged) { m.active = m.staged; m.version = m.staged.version; m.staged = null; await _put(m); n++; }
        }
        return n;
    };
    window._bcosPkgPending = async function() {
        const all = await _getAll();
        return all.filter(m => m.staged);
    };
    window._bcosPkgSetActive = async function(id, meta, code) {
        const existing = await _get(id) || { id };
        await _put({ id, version: meta.version, file: meta.file, desc: meta.desc,
            active: { code, version: meta.version, downloadedAt: Date.now() },
            staged: existing.staged || null, updatedAt: Date.now() });
    };
    window._bcosPkgLoadActive = async function(id, meta) {
        const m = await _get(id);
        // 版本校验: 缓存版本与注册表不一致时返回 null, 触发网络刷新后重存 (热更新链关键)
        if (m && m.active && (!meta || m.version === meta.version)) return m.active.code;
        return null;
    };
    window._bcosPkgInitInstalled = async function(registry) {
        for (const [id, meta] of Object.entries(registry.modules)) {
            const existing = await _get(id);
            if (!existing) await _put({ id, version: meta.version, file: meta.file, desc: meta.desc, active: null, staged: null, updatedAt: Date.now() });
        }
    };
    console.log('[BCOS Pkg] 包管理器已加载 (A/B 无缝更新)');
})();
