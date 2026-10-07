(function(){

    /* ==================== BCOS Car Cockpit Lockscreen (Sync with car.html) ==================== */
const START_DATE = '2024/03/12 00:00:00';
        const MILESTONES = [
            { days: 100, label: '100天纪念' },
            { days: 180, label: '180天纪念' },
            { days: 300, label: '300天纪念' },
            { days: 365, label: '一周年 (365天)' },
            { days: 500, label: '500天纪念' },
            { days: 730, label: '两周年 (730天)' },
            { days: 1000, label: '1000天纪念 (千日里程碑)' },
            { days: 1095, label: '三周年 (1095天)' },
            { days: 1461, label: '四周年 (1461天)' },
            { days: 1500, label: '1500天纪念' },
            { days: 1826, label: '五周年 (1826天)' },
            { days: 2000, label: '2000天纪念' },
            { days: 3652, label: '十周年 (3652天)' },
            { days: 10000, label: '10000天 (万日之约)' }
        ];

        const THEMES = [
            { id: 'theme-xpeng', name: '小鹏赛博 · 霓虹青' },
            { id: 'theme-bunny', name: '棉花糖兔 · 梦幻粉' },
            { id: 'theme-aurora', name: '极光深空 · 翡翠绿' },
            { id: 'theme-carbon', name: '运动竞速 · 烈焰红' },
            { id: 'theme-stealth', name: '极简护眼 · OLED黑' }
        ];

        const COMPANION_QUOTES = [
            "清晨的第一缕阳光洒向车窗，兔可可已为您准备好今日份的元气与好运！",
            "无论驶向繁华都市还是寂静原野，都有兔可可柔软的目光为您导航。",
            "道路千万条，安全第一条。请系好安全带，兔可可与您一路平平安安~",
            "累了就进服务区歇歇脚吧，喝口热茶，也给兔兔喂一根赛博胡萝卜🥕",
            "电量充沛，星光护航！在虚拟与现实的交织中，兔可可是您最忠实的守望者。",
            "车外的世界车水马龙，车内的时光有兔兔静静陪伴。愿您享受每一段旅程。",
            "风扬起发梢，也吹动了兔可可的长耳朵。出发吧，去追逐下一个美好的目的地！",
            "不要着急，按自己的节奏行驶。兔可可在车机里为您放慢时光的脚步。",
            "跨越山海的漫长旅途，因为有兔兔的相伴而不再孤单。✨",
            "夜幕降临，仪表盘的微光与星辰同频。兔可可为您点亮回家的温暖路灯。",
            "每一次启程都是全新的冒险，每一段归途都有兔可可在原地等候您。",
            "雨天路滑，请减速慢行。兔可可为您撑起一把无形的保护伞🌂"
        ];
        let currentQuoteIdx = 0;

        let carToastTimer = null;
        function showCarToast(msg) {
            const t = document.getElementById('car-toast');
            if (!t) return;
            if (carToastTimer) clearTimeout(carToastTimer);
            t.textContent = msg;
            t.classList.add('show');
            carToastTimer = setTimeout(() => {
                t.classList.remove('show');
                carToastTimer = null;
            }, 2400);
        }
        function showToast(msg) { showCarToast(msg); }

        // --- Theme Management ---
        let currentThemeIdx = 0;
        function loadSavedTheme() {
            const saved = localStorage.getItem('bcos_car_theme');
            const idx = THEMES.findIndex(t => t.id === saved);
            if (idx !== -1) currentThemeIdx = idx;
            applyTheme();
        }
        function applyTheme() {
            // Apply theme class to the lockscreen overlay only, NOT to document.body.
            // Mutating body.className causes a full-page CSS variable recalculation
            // on iOS/Android WebKit, which is the root cause of the mobile jitter.
            const lockEl = document.getElementById('bcos-car-lockscreen');
            if (lockEl) {
                // Never replace className here: doing so drops bcos-carlock-active
                // and other state classes, which makes the document briefly reflow.
                THEMES.forEach(theme => lockEl.classList.remove(theme.id));
                lockEl.classList.add(THEMES[currentThemeIdx].id);
            }
            const badge = document.getElementById('car-theme-name');
            if (badge) badge.textContent = THEMES[currentThemeIdx].name;
            localStorage.setItem('bcos_car_theme', THEMES[currentThemeIdx].id);
            if (typeof logEvent === 'function') {
                logEvent(`🎨 [bcos座舱锁屏] 切换座舱主题: ${THEMES[currentThemeIdx].name}`, 'info');
            }
        }
        function cycleTheme() {
            currentThemeIdx = (currentThemeIdx + 1) % THEMES.length;
            applyTheme();
            showToast('已切换氛围主题: ' + THEMES[currentThemeIdx].name);
        }

        // --- Top Bar Buttons Toggle (User Request: Hide top buttons by default) ---
        function initTopActionsToggle() {
            const show = localStorage.getItem('car_show_top_actions') === 'true';
            applyTopActionsState(show);
        }
        function applyTopActionsState(show) {
            const lockEl = document.getElementById('bcos-car-lockscreen');
            if (lockEl) {
                if (show) {
                    lockEl.classList.add('show-top-actions');
                } else {
                    lockEl.classList.remove('show-top-actions');
                }
            }
            const btn = document.getElementById('toggle-top-btn');
            if (btn) btn.textContent = show ? '常驻显示中 (点击隐藏)' : '已隐藏 (点击显示)';
        }
        function toggleTopActions() {
            const lockEl = document.getElementById('bcos-car-lockscreen');
            const current = lockEl ? lockEl.classList.contains('show-top-actions') : (localStorage.getItem('car_show_top_actions') === 'true');
            const next = !current;
            localStorage.setItem('car_show_top_actions', next ? 'true' : 'false');
            applyTopActionsState(next);
            showToast(next ? '✓ 顶部操作按键已常驻显示' : '✓ 顶部操作按键已隐藏（可在设置中随时恢复）');
        }

        // --- Lockscreen Avatar Management (Sync with Sidebar Avatar style: Emoji / Photo) ---
        function updateLockscreenAvatar(targetMode) {
            const mode = targetMode || (typeof safeGetItem === 'function' ? safeGetItem('sidebarAvatar', 'emoji') : localStorage.getItem('sidebarAvatar')) || 'emoji';
            
            // 1. Top Brand bar avatar
            const brandAvatar = document.getElementById('car-brand-avatar');
            if (brandAvatar) {
                if (mode === 'photo') {
                    brandAvatar.innerHTML = '<img src="./dist/Bunny CC_Profile.JPG" alt="兔可可" class="car-avatar-img" onerror="this.parentElement.textContent=\'🐰\'">';
                } else {
                    brandAvatar.textContent = '🐰';
                }
            }

            // 2. Cockpit companion box avatar
            const compAvatar = document.getElementById('car-companion-avatar');
            if (compAvatar) {
                if (mode === 'photo') {
                    compAvatar.classList.add('avatar-photo');
                    compAvatar.innerHTML = '<img src="./dist/Bunny CC_Profile.JPG" alt="兔可可" class="car-companion-avatar-img" onerror="this.onerror=null;this.parentElement.textContent=\'🐰\';this.parentElement.classList.remove(\'avatar-photo\');">';
                } else {
                    compAvatar.classList.remove('avatar-photo');
                    compAvatar.textContent = '🐰';
                }
            }

            // 2.1 Companion title icon
            const compTitleIcon = document.getElementById('car-companion-title-icon');
            if (compTitleIcon) {
                if (mode === 'photo') {
                    compTitleIcon.innerHTML = '<img src="./dist/Bunny CC_Profile.JPG" alt="兔可可" class="car-title-avatar-img" onerror="this.onerror=null;this.parentElement.textContent=\'🐰\';">';
                } else {
                    compTitleIcon.textContent = '🐰';
                }
            }

            // 3. Slider thumb avatar
            const thumbAvatar = document.getElementById('car-thumb');
            if (thumbAvatar) {
                if (mode === 'photo') {
                    thumbAvatar.classList.add('thumb-photo');
                    thumbAvatar.innerHTML = '<img src="./dist/Bunny CC_Profile.JPG" alt="兔可可" class="car-thumb-img" draggable="false" onerror="this.onerror=null;this.parentElement.textContent=\'🐰\';this.parentElement.classList.remove(\'thumb-photo\');">';
                } else {
                    thumbAvatar.classList.remove('thumb-photo');
                    thumbAvatar.textContent = '🐰';
                }
            }

            // 4. Quick Actions toggle button in car navigation modal
            const avatarToggleBtn = document.getElementById('toggle-avatar-btn');
            if (avatarToggleBtn) {
                avatarToggleBtn.textContent = mode === 'photo' ? '📷 照片模式' : '🐰 Emoji模式';
            }

            // 5. Context menu avatar badge
            const ctxAvatarBadge = document.getElementById('ctx-avatar-badge');
            if (ctxAvatarBadge) {
                ctxAvatarBadge.textContent = mode === 'photo' ? '照片' : 'Emoji';
            }
        }

        function toggleLockscreenAvatar() {
            const current = (typeof safeGetItem === 'function' ? safeGetItem('sidebarAvatar', 'emoji') : localStorage.getItem('sidebarAvatar')) || 'emoji';
            const next = current === 'photo' ? 'emoji' : 'photo';
            if (typeof setSidebarAvatar === 'function') {
                setSidebarAvatar(next);
            } else if (typeof window.setSidebarAvatar === 'function') {
                window.setSidebarAvatar(next);
            } else {
                localStorage.setItem('sidebarAvatar', next);
                updateLockscreenAvatar(next);
            }
            showToast(next === 'photo' ? '🐰 已切换为兔可可写真照片头像' : '🐰 已切换为经典 Emoji 头像');
        }

        // --- EV Battery & Range Management ---
        let carBatteryData = {
            soc: 88,
            range: 535,
            standard: 'WLTP', // 'WLTP' or '实估' (Only these two options)
            mode: '🌱 标准节能',
            temp: 22
        };

        function saveCarBatteryData() {
            localStorage.setItem('car_soc', carBatteryData.soc);
            localStorage.setItem('car_range', carBatteryData.range);
            localStorage.setItem('car_range_standard', carBatteryData.standard);
            localStorage.setItem('car_drive_mode', carBatteryData.mode);
            localStorage.setItem('car_cabin_temp', carBatteryData.temp);
            if (typeof logEvent === 'function') {
                logEvent(`⚡ [bcos座舱锁屏] 更新电量遥测: SoC ${carBatteryData.soc}% · 续航 ${carBatteryData.range} km (${carBatteryData.standard}) · 温度 ${carBatteryData.temp}°C`, 'info');
            }
        }

        function quickCycleDriveMode() {
            const modes = ['🌱 标准节能', '⚡ 极速运动', '🛋️ 舒适惬意', '🚀 狂暴弹射'];
            const curIdx = modes.indexOf(carBatteryData.mode);
            const nextIdx = (curIdx + 1) % modes.length;
            carBatteryData.mode = modes[nextIdx];
            saveCarBatteryData();
            renderBatteryUI();
            showToast(`🚗 驾驶模式已切换: ${carBatteryData.mode}`);
        }

        function quickAdjustCabinTemp() {
            const temps = [22, 20, 24, 21.5];
            const curIdx = temps.indexOf(carBatteryData.temp);
            const nextIdx = (curIdx + 1) % temps.length;
            carBatteryData.temp = temps[nextIdx];
            saveCarBatteryData();
            renderBatteryUI();
            showToast(`❄️ 座舱温度已调节: ${carBatteryData.temp}°C`);
        }

        function loadBatteryData() {
            try {
                const s = localStorage.getItem('car_soc');
                if (s !== null) carBatteryData.soc = Math.max(0, Math.min(100, parseInt(s, 10)));
                const r = localStorage.getItem('car_range');
                if (r !== null) carBatteryData.range = Math.max(0, parseInt(r, 10));
                const std = localStorage.getItem('car_range_standard');
                if (std === 'WLTP' || std === '实估') carBatteryData.standard = std;
                const m = localStorage.getItem('car_drive_mode');
                if (m) carBatteryData.mode = m;
                const t = localStorage.getItem('car_cabin_temp');
                if (t !== null) carBatteryData.temp = parseInt(t, 10);
            } catch(e) {}
            renderBatteryUI();
        }

        function renderBatteryUI() {
            // Update numbers
            const socEl = document.getElementById('car-soc-num');
            const rangeEl = document.getElementById('car-range-num');
            const topBatEl = document.getElementById('car-top-battery-txt');
            const fillEl = document.getElementById('car-battery-fill');
            const modeEl = document.getElementById('car-drive-mode');
            const tempEl = document.getElementById('car-temp-status');
            const rangeTypeEl = document.getElementById('car-range-type-label');

            if (socEl) socEl.textContent = carBatteryData.soc;
            if (rangeEl) rangeEl.textContent = carBatteryData.range;
            if (rangeTypeEl) rangeTypeEl.textContent = `${carBatteryData.standard} 预估续航`;
            if (topBatEl) topBatEl.textContent = `🔋 ${carBatteryData.soc}% · ${carBatteryData.range} km (${carBatteryData.standard})`;
            if (modeEl) modeEl.textContent = carBatteryData.mode;
            if (tempEl) tempEl.textContent = `🌤️ ${carBatteryData.temp}°C / 舒适`;

            if (fillEl) {
                fillEl.style.width = carBatteryData.soc + '%';
                fillEl.classList.remove('low', 'mid');
                if (carBatteryData.soc < 20) fillEl.classList.add('low');
                else if (carBatteryData.soc < 50) fillEl.classList.add('mid');
            }
        }

        function openBatteryModal() {
            closeMenuModal();
            document.getElementById('input-car-soc').value = carBatteryData.soc;
            document.getElementById('slider-car-soc').value = carBatteryData.soc;
            document.getElementById('battery-slider-val').textContent = carBatteryData.soc + '%';
            document.getElementById('input-car-range').value = carBatteryData.range;
            document.getElementById('range-display-preview').textContent = `${carBatteryData.range} km (${carBatteryData.standard})`;
            document.getElementById('select-car-mode').value = carBatteryData.mode;
            document.getElementById('input-car-temp').value = carBatteryData.temp;
            updateRangeStandardButtons(carBatteryData.standard);
            document.getElementById('car-battery-modal').classList.add('active');
        }

        function closeBatteryModal() {
            document.getElementById('car-battery-modal').classList.remove('active');
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }

        function selectRangeStandard(std) {
            carBatteryData.standard = (std === '实估') ? '实估' : 'WLTP';
            updateRangeStandardButtons(carBatteryData.standard);
            updateRangePreview(document.getElementById('input-car-range').value);
        }

        function updateRangeStandardButtons(std) {
            document.querySelectorAll('.range-type-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.borderColor = '';
                btn.style.color = '';
            });
            const activeId = (std === '实估') ? 'range-type-est' : 'range-type-wltp';
            const active = document.getElementById(activeId);
            if (active) {
                active.classList.add('active');
            }
        }

        function syncBatterySlider(val) {
            const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
            document.getElementById('slider-car-soc').value = num;
            document.getElementById('battery-slider-val').textContent = num + '%';
        }

        function syncBatteryInput(val) {
            document.getElementById('input-car-soc').value = val;
            document.getElementById('battery-slider-val').textContent = val + '%';
        }

        function quickSetSoc(pct) {
            syncBatteryInput(pct);
            syncBatterySlider(pct);
        }

        function updateRangePreview(val) {
            document.getElementById('range-display-preview').textContent = `${val || 0} km (${carBatteryData.standard})`;
        }

        function stepRange(delta) {
            const el = document.getElementById('input-car-range');
            let current = parseInt(el.value, 10) || 0;
            current = Math.max(0, current + delta);
            el.value = current;
            updateRangePreview(current);
        }

        function quickSetRange(val) {
            const el = document.getElementById('input-car-range');
            el.value = val;
            updateRangePreview(val);
        }

        function saveBatteryModalData() {
            const soc = Math.max(0, Math.min(100, parseInt(document.getElementById('input-car-soc').value, 10) || 0));
            const range = Math.max(0, parseInt(document.getElementById('input-car-range').value, 10) || 0);
            const mode = document.getElementById('select-car-mode').value;
            const temp = parseInt(document.getElementById('input-car-temp').value, 10) || 22;

            carBatteryData = {
                soc,
                range,
                standard: carBatteryData.standard,
                mode,
                temp
            };
            localStorage.setItem('car_soc', soc);
            localStorage.setItem('car_range', range);
            localStorage.setItem('car_range_standard', carBatteryData.standard);
            localStorage.setItem('car_drive_mode', mode);
            localStorage.setItem('car_cabin_temp', temp);

            renderBatteryUI();
            closeBatteryModal();
            showToast(`✓ 车辆动力能耗已更新 (${carBatteryData.standard} 标准)！`);
        }

        // --- Wallpaper Engine ---
        // b64+parts: 壁纸以 base64 文本分片存储(绕开二进制上传限制), 前端并行下载分片后解码显示
        const BUILTIN_WALLPAPERS = window.__BUILTIN_WALLPAPERS;

        let allWallpapers = [...BUILTIN_WALLPAPERS];
        let currentWallpaperIdx = 0;
        let displayTimer = null;
        let wallpaperTimer = null;

        function getCustomWallpapers() {
            try {
                return JSON.parse(safeGetItem('car_custom_wallpapers', '[]'));
            } catch(e) { return []; }
        }

        function saveCustomWallpapers(list) {
            safeSetItem('car_custom_wallpapers', JSON.stringify(list));
        }

        function fetchWallpaperManifest(showNotice) {
            fetch('wallpaper/manifest.json?t=' + Date.now())
                .then(r => r.json())
                .then(data => {
                    if (data && Array.isArray(data.wallpapers) && data.wallpapers.length > 0) {
                        const map = new Map();
                        // Put scanned manifest wallpapers first
                        data.wallpapers.forEach(w => map.set(w.file, w));
                        // Merge builtin fallbacks
                        BUILTIN_WALLPAPERS.forEach(w => { if (!map.has(w.file)) map.set(w.file, w); });
                        // Merge user custom
                        getCustomWallpapers().forEach(w => map.set(w.file, w));
                        allWallpapers = Array.from(map.values());
                    } else {
                        fallbackWallpapers();
                    }
                    if (currentWallpaperIdx >= allWallpapers.length) currentWallpaperIdx = 0;
                    renderWallpaperUI();
                    applyCurrentWallpaper();
                    if (showNotice) showToast(`✓ 已检测到 ${allWallpapers.length} 张壁纸`);
                })
                .catch(err => {
                    fallbackWallpapers();
                    if (currentWallpaperIdx >= allWallpapers.length) currentWallpaperIdx = 0;
                    renderWallpaperUI();
                    applyCurrentWallpaper();
                    if (showNotice) showToast(`已加载默认壁纸库 (${allWallpapers.length} 张)`);
                });
        }

        function fallbackWallpapers() {
            const map = new Map();
            BUILTIN_WALLPAPERS.forEach(w => map.set(w.file, w));
            getCustomWallpapers().forEach(w => map.set(w.file, w));
            allWallpapers = Array.from(map.values());
        }
        // 模糊占位图 (blur-up): 弱网下先显示低清模糊图, 避免黑屏
        const WP_PLACEHOLDER = window.__WP_PLACEHOLDER;
        // --- High-Speed Wallpaper Engine with IndexedDB Local Caching (Optimized for China Network) ---
        const WP_DB_NAME = 'bcos_wp_cache_v2';
        const WP_STORE = 'blobs';

        function openWallpaperDB() {
            return new Promise((resolve) => {
                if (!('indexedDB' in window)) return resolve(null);
                try {
                    const req = indexedDB.open(WP_DB_NAME, 1);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(WP_STORE)) {
                            db.createObjectStore(WP_STORE);
                        }
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = () => resolve(null);
                } catch(e) { resolve(null); }
            });
        }

        async function getStoredWallpaperBlob(fileKey) {
            try {
                const db = await openWallpaperDB();
                if (!db) return null;
                return new Promise((res) => {
                    const tx = db.transaction(WP_STORE, 'readonly');
                    const req = tx.objectStore(WP_STORE).get(fileKey);
                    req.onsuccess = () => res(req.result || null);
                    req.onerror = () => res(null);
                });
            } catch(e) { return null; }
        }

        async function storeWallpaperBlob(fileKey, blob) {
            try {
                const db = await openWallpaperDB();
                if (!db) return;
                const tx = db.transaction(WP_STORE, 'readwrite');
                tx.objectStore(WP_STORE).put(blob, fileKey);
            } catch(e) {}
        }

        // 已预加载的壁纸集合 (轮播切换零等待)
        const wpPreloaded = new Set();
        // 已解码壁纸的 objectURL 缓存: file -> objectURL, 避免重复下载/解码
        const wpBlobCache = window.wpBlobCache || (window.wpBlobCache = {});
        // base64 文本 -> JPEG Blob
        function b64ToJpegBlob(b64Text) {
            try {
                const bin = atob(b64Text.replace(/\s+/g, ''));
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new Blob([bytes], { type: 'image/jpeg' });
            } catch(e) {
                console.warn('b64ToJpegBlob decode error:', e);
                return new Blob([], { type: 'image/jpeg' });
            }
        }
        let wpLoadToken = 0; // 防竞态: 快速切换壁纸时只保留最后一次请求
        let wpAbortCtrl = null; // 取消上一次未完成的壁纸下载

        // 统一壁纸数据加载, 返回 Promise<Blob>
        // ① 先读本地 IndexedDB 缓存 (零网络等待, 离线秒开)
        // ② 无本地缓存则进行并行分片下载, 支持弱网自动重试
        // ③ 下载完成后静默存入 IndexedDB
        async function loadWallpaperBlob(cur, signal, onProgress) {
            try {
                const cached = await getStoredWallpaperBlob(cur.file);
                if (cached && (cached instanceof Blob || cached instanceof File)) {
                    if (onProgress) onProgress(cached.size, cached.size);
                    return cached;
                }
            } catch(e) {}

            const fetchOpts = signal ? { signal } : {};
            if (cur.b64 && cur.parts) {
                const total = cur.size || 0;
                const partLoaded = new Array(cur.parts).fill(0);
                const report = () => {
                    const sum = partLoaded.reduce((a, b) => a + b, 0);
                    if (onProgress) onProgress(sum, total);
                };
                const jobs = [];
                for (let i = 1; i <= cur.parts; i++) {
                    const idx = i - 1;
                    const url = cur.file + '.p' + i;
                    const fetchPart = async (attempt = 0) => {
                        try {
                            const resp = await fetch(url, fetchOpts);
                            if (!resp.ok) throw new Error('HTTP ' + resp.status);
                            if (!resp.body) {
                                const t = await resp.text();
                                partLoaded[idx] = t.length;
                                report();
                                return t;
                            }
                            const reader = resp.body.getReader();
                            const chunks = [];
                            const dec = new TextDecoder();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                chunks.push(value);
                                partLoaded[idx] += value.length;
                                report();
                            }
                            let s = '';
                            chunks.forEach(ch => { s += dec.decode(ch, { stream: true }); });
                            return s + dec.decode();
                        } catch(err) {
                            if (attempt < 2 && (!signal || !signal.aborted)) {
                                await new Promise(r => setTimeout(r, 600));
                                return fetchPart(attempt + 1);
                            }
                            throw err;
                        }
                    };
                    jobs.push(fetchPart());
                }
                const texts = await Promise.all(jobs);
                const blob = b64ToJpegBlob(texts.join(''));
                storeWallpaperBlob(cur.file, blob);
                return blob;
            }
            return fetch(cur.file, fetchOpts).then(resp => {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const total = parseInt(resp.headers.get('Content-Length') || '0', 10);
                if (!resp.body || !total) return resp.blob();
                const reader = resp.body.getReader();
                const chunks = [];
                let loaded = 0;
                const pump = () => reader.read().then(({ done, value }) => {
                    if (done) {
                        const b = new Blob(chunks, { type: resp.headers.get('Content-Type') || 'image/jpeg' });
                        storeWallpaperBlob(cur.file, b);
                        return b;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (onProgress) onProgress(loaded, total);
                    return pump();
                });
                return pump();
            });
        }

        function updateWallpaperBadge(text) {
            const badge = document.getElementById('car-wp-badge-txt');
            if (badge) badge.textContent = text;
            const wpStatus = document.getElementById('car-wp-status');
            if (wpStatus) wpStatus.textContent = text;
        }

        function syncAmbientWallpaper(bgUrl, wpObj) {
            const amb = document.getElementById('car-wallpaper-ambient');
            if (!amb) return;
            if (bgUrl) amb.style.backgroundImage = bgUrl;
            const cur = wpObj || (typeof allWallpapers !== 'undefined' && allWallpapers[currentWallpaperIdx]);
            if (cur && cur.edgeColors) {
                const dom = cur.edgeColors.dominant || '#0d121d';
                const domRgb = cur.edgeColors.dominantRgb || dom.replace(/[^0-9,]/g, '') || '13,18,29';
                const top = cur.edgeColors.top || dom;
                const topRgb = cur.edgeColors.topRgb || top.replace(/[^0-9,]/g, '') || domRgb;
                const bot = cur.edgeColors.bottom || dom;
                const botRgb = cur.edgeColors.bottomRgb || bot.replace(/[^0-9,]/g, '') || domRgb;
                const left = cur.edgeColors.left || dom;
                const leftRgb = cur.edgeColors.leftRgb || left.replace(/[^0-9,]/g, '') || domRgb;
                const right = cur.edgeColors.right || dom;
                const rightRgb = cur.edgeColors.rightRgb || right.replace(/[^0-9,]/g, '') || domRgb;

                amb.style.setProperty('--wp-edge-dominant', dom);
                amb.style.setProperty('--wp-edge-dominant-rgb', domRgb);
                amb.style.setProperty('--wp-edge-top', top);
                amb.style.setProperty('--wp-edge-top-rgb', topRgb);
                amb.style.setProperty('--wp-edge-bottom', bot);
                amb.style.setProperty('--wp-edge-bottom-rgb', botRgb);
                amb.style.setProperty('--wp-edge-left', left);
                amb.style.setProperty('--wp-edge-left-rgb', leftRgb);
                amb.style.setProperty('--wp-edge-right', right);
                amb.style.setProperty('--wp-edge-right-rgb', rightRgb);
            } else {
                amb.style.removeProperty('--wp-edge-dominant');
                amb.style.removeProperty('--wp-edge-dominant-rgb');
                amb.style.removeProperty('--wp-edge-top');
                amb.style.removeProperty('--wp-edge-top-rgb');
                amb.style.removeProperty('--wp-edge-bottom');
                amb.style.removeProperty('--wp-edge-bottom-rgb');
                amb.style.removeProperty('--wp-edge-left');
                amb.style.removeProperty('--wp-edge-left-rgb');
                amb.style.removeProperty('--wp-edge-right');
                amb.style.removeProperty('--wp-edge-right-rgb');
            }
            const fit = typeof getWallpaperFit === 'function' ? getWallpaperFit() : 'smart';
            if (fit === 'smart') {
                const smartRes = typeof computeSmartWallpaperFit === 'function' ? computeSmartWallpaperFit(cur) : { isContain: false };
                amb.classList.toggle('active', smartRes.isContain);
            } else if (fit === 'fit' || fit === 'center') {
                amb.classList.add('active');
            } else {
                amb.classList.remove('active');
            }
        }

        // 国内网络优化: ①模糊占位先行(无黑屏) ②分片并行下载+实时进度 ③预加载下一张(切换零等待) ④SW 离线缓存
        function applyCurrentWallpaper() {
            const mode = localStorage.getItem('car_wp_mode') || 'slideshow';
            const layer = document.getElementById('car-wallpaper-layer');
            const badge = document.getElementById('car-wp-badge-txt');
            if (!layer) return;

            if (mode === 'theme' || allWallpapers.length === 0) {
                layer.classList.remove('active');
                layer.classList.remove('wp-loading');
                const amb = document.getElementById('car-wallpaper-ambient');
                if (amb) amb.classList.remove('active');
                updateWallpaperBadge('🎨 纯净座舱');
                return;
            }

            if (currentWallpaperIdx >= allWallpapers.length) currentWallpaperIdx = 0;
            const cur = allWallpapers[currentWallpaperIdx];
            if (!cur) return;

            // 取消上一次未完成的下载, 只保留最后一次请求
            if (wpAbortCtrl) { try { wpAbortCtrl.abort(); } catch (e) {} }
            const ctrl = new AbortController();
            wpAbortCtrl = ctrl;
            const token = ++wpLoadToken;
            applyWallpaperFit(getWallpaperFit(), cur);

            // 缓存命中: 直接平滑显示，绝不闪现占位图或loading微光，彻底杜绝发抽搐
            if (wpBlobCache[cur.file]) {
                layer.classList.remove('wp-loading');
                layer.style.backgroundImage = `url("${wpBlobCache[cur.file]}")`;
                layer.classList.add('active');
                syncAmbientWallpaper(layer.style.backgroundImage, cur);
                updateWallpaperBadge(`🖼️ ${cur.name}`);
                highlightActiveThumbnail();
                wpPreloaded.add(cur.file);
                preloadNextWallpaper();
                return;
            }

            // ① 仅在未缓存时才显示模糊占位图与微光进度
            const ph = WP_PLACEHOLDER[cur.file];
            if (ph) {
                layer.style.backgroundImage = `url("${ph}")`;
                layer.classList.add('active');
                syncAmbientWallpaper(layer.style.backgroundImage, cur);
            }
            layer.classList.add('wp-loading');
            updateWallpaperBadge(`🖼️ ${cur.name} · 0%`);

            // ② 下载壁纸数据, 实时显示进度
            loadWallpaperBlob(cur, ctrl.signal, (loaded, total) => {
                if (token !== wpLoadToken) return;
                const txt = total > 0
                    ? `🖼️ ${cur.name} · ${Math.min(99, Math.round(loaded / total * 100))}%`
                    : `🖼️ ${cur.name} · ${Math.round(loaded / 1024)}KB`;
                updateWallpaperBadge(txt);
            }).then(blob => {
                if (token !== wpLoadToken || ctrl.signal.aborted) return;
                const objUrl = URL.createObjectURL(blob);
                wpBlobCache[cur.file] = objUrl; // 缓存解码结果
                showWallpaperBlob(layer, badge, cur, token, objUrl);
            }).catch(err => {
                if (ctrl.signal.aborted || token !== wpLoadToken) return;
                // 下载失败 (如用户添加的跨域 URL 无 CORS 头或 file:// 协议): 回退 Image 或本地占位图
                console.warn('Wallpaper fetch failed, fallback to direct Image/placeholder:', cur.file, err);
                const placeholder = WP_PLACEHOLDER[cur.file];
                if (cur.b64 && placeholder) {
                    layer.style.backgroundImage = `url("${placeholder}")`;
                    layer.classList.remove('wp-loading');
                    layer.classList.add('active');
                    syncAmbientWallpaper(layer.style.backgroundImage, cur);
                    updateWallpaperBadge(`🖼️ ${cur.name}`);
                    highlightActiveThumbnail();
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    if (token !== wpLoadToken) return;
                    layer.style.backgroundImage = `url("${cur.file}")`;
                    layer.classList.remove('wp-loading');
                    layer.classList.add('active');
                    syncAmbientWallpaper(layer.style.backgroundImage, cur);
                    updateWallpaperBadge(`🖼️ ${cur.name}`);
                    highlightActiveThumbnail();
                    wpPreloaded.add(cur.file);
                    preloadNextWallpaper();
                };
                img.onerror = () => {
                    layer.classList.remove('wp-loading');
                    if (placeholder) {
                        layer.style.backgroundImage = `url("${placeholder}")`;
                        layer.classList.add('active');
                        syncAmbientWallpaper(layer.style.backgroundImage, cur);
                    }
                    updateWallpaperBadge(`🖼️ ${cur.name}`);
                };
                img.src = cur.file;
            });
        }

        // 把解码后的壁纸显示到锁屏层 (带淡入)
        function showWallpaperBlob(layer, badge, cur, token, objUrl) {
            if (token !== wpLoadToken) return;
            layer.style.backgroundImage = `url("${objUrl}")`;
            layer.classList.remove('wp-loading');
            layer.classList.add('active');
            syncAmbientWallpaper(layer.style.backgroundImage, cur);
            updateWallpaperBadge(`🖼️ ${cur.name}`);
            highlightActiveThumbnail();
            wpPreloaded.add(cur.file);
            preloadNextWallpaper();
        }

        // 后台静默预加载下一张壁纸: 轮播切换时零等待
        function preloadNextWallpaper() {
            if (allWallpapers.length <= 1) return;
            const next = allWallpapers[(currentWallpaperIdx + 1) % allWallpapers.length];
            if (!next || wpPreloaded.has(next.file) || wpBlobCache[next.file]) return;
            if (next.b64 && next.parts) {
                // b64 分片壁纸: 后台下载分片并解码缓存, 切换时直接可用
                loadWallpaperBlob(next, null, null).then(blob => {
                    wpBlobCache[next.file] = URL.createObjectURL(blob);
                    wpPreloaded.add(next.file);
                }).catch(() => {});
                return;
            }
            const img = new Image();
            img.onload = () => wpPreloaded.add(next.file);
            img.onerror = () => {};
            img.src = next.file;
        }

        function nextWallpaper(isUserAction) {
            if (!isUserAction && document.hidden) return;
            if (allWallpapers.length <= 1) return;
            currentWallpaperIdx = (currentWallpaperIdx + 1) % allWallpapers.length;
            localStorage.setItem('car_wp_current_idx', currentWallpaperIdx);
            applyCurrentWallpaper();
            if (isUserAction) {
                showToast(`切换壁纸: ${allWallpapers[currentWallpaperIdx].name}`);
                if (typeof logEvent === 'function') {
                    logEvent(`🖼️ [bcos座舱锁屏] 切换下一张壁纸: ${allWallpapers[currentWallpaperIdx]?.name || '未知壁纸'}`, 'info');
                }
            }
        }

        function prevWallpaper(isUserAction) {
            if (!isUserAction && document.hidden) return;
            if (allWallpapers.length <= 1) return;
            currentWallpaperIdx = (currentWallpaperIdx - 1 + allWallpapers.length) % allWallpapers.length;
            localStorage.setItem('car_wp_current_idx', currentWallpaperIdx);
            applyCurrentWallpaper();
            if (isUserAction) {
                showToast(`切换壁纸: ${allWallpapers[currentWallpaperIdx].name}`);
                if (typeof logEvent === 'function') {
                    logEvent(`🖼️ [bcos座舱锁屏] 切换上一张壁纸: ${allWallpapers[currentWallpaperIdx]?.name || '未知壁纸'}`, 'info');
                }
            }
        }

        function selectWallpaperByIdx(idx) {
            currentWallpaperIdx = idx;
            localStorage.setItem('car_wp_current_idx', currentWallpaperIdx);
            applyCurrentWallpaper();
            highlightActiveThumbnail();
            showToast(`已选择壁纸: ${allWallpapers[idx].name}`);
            if (typeof logEvent === 'function') {
                logEvent(`🖼️ [bcos座舱锁屏] 选择座舱壁纸: ${allWallpapers[idx]?.name || '未知壁纸'}`, 'info');
            }
        }

        function setWallpaperMode(mode) {
            localStorage.setItem('car_wp_mode', mode);
            updateWallpaperModeButtons(mode);
            applyCurrentWallpaper();
            restartWallpaperTimer();
            showToast(`已设为: ${mode === 'slideshow' ? '📁 自动轮播' : (mode === 'single' ? '🖼️ 固定单张' : '🎨 纯净座舱')}`);
        }

        function updateWallpaperModeButtons(mode) {
            document.querySelectorAll('.wp-mode-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.borderColor = '';
                btn.style.color = '';
            });
            const activeBtn = document.getElementById('wp-mode-' + mode);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }

        function updateWallpaperDim(val) {
            const pct = parseInt(val, 10);
            const overlay = document.getElementById('car-wallpaper-overlay');
            const lbl = document.getElementById('wp-dim-val');
            if (lbl) lbl.textContent = pct + '%';
            if (overlay) overlay.style.background = `rgba(5, 8, 17, ${pct / 100})`;
            localStorage.setItem('car_wp_dim', pct);
        }

        function updateWallpaperBlur(val) {
            const px = parseInt(val, 10);
            const overlay = document.getElementById('car-wallpaper-overlay');
            const lbl = document.getElementById('wp-blur-val');
            if (lbl) lbl.textContent = px + 'px';
            if (overlay) {
                overlay.style.backdropFilter = `blur(${px}px)`;
                overlay.style.webkitBackdropFilter = `blur(${px}px)`;
            }
            localStorage.setItem('car_wp_blur', px);
        }

        function changeWallpaperInterval(val) {
            localStorage.setItem('car_wp_interval', val);
            restartWallpaperTimer();
            showToast(`轮播间隔已改为: ${val} 分钟`);
        }

        function restartWallpaperTimer() {
            if (wallpaperTimer) clearInterval(wallpaperTimer);
            const mode = localStorage.getItem('car_wp_mode') || 'slideshow';
            if (mode === 'slideshow') {
                const mins = parseInt(localStorage.getItem('car_wp_interval') || '5', 10);
                wallpaperTimer = setInterval(() => {
                    nextWallpaper(false);
                }, mins * 60 * 1000);
            }
        }

        function renderWallpaperUI() {
            const grid = document.getElementById('car-wp-grid');
            const count = document.getElementById('wp-count');
            if (count) count.textContent = allWallpapers.length;
            if (!grid) return;

            grid.innerHTML = allWallpapers.map((w, idx) => {
                const isActive = (idx === currentWallpaperIdx);
                const thumbSrc = wpBlobCache[w.file] || WP_PLACEHOLDER[w.file] || w.file;
                return `<div class="car-wp-item ${isActive ? 'active' : ''}" onclick="selectWallpaperByIdx(${idx})">
                    <img src="${thumbSrc}" alt="${w.name}" loading="lazy">
                    <div class="label">${w.name}</div>
                    ${isActive ? '<span class="badge">当前</span>' : ''}
                </div>`;
            }).join('');
        }

        function highlightActiveThumbnail() {
            document.querySelectorAll('.car-wp-item').forEach((item, idx) => {
                if (idx === currentWallpaperIdx) {
                    item.classList.add('active');
                    if (!item.querySelector('.badge')) {
                        const b = document.createElement('span');
                        b.className = 'badge';
                        b.textContent = '当前';
                        item.appendChild(b);
                    }
                    const img = item.querySelector('img');
                    const w = allWallpapers[idx];
                    if (img && w && wpBlobCache[w.file] && img.src !== wpBlobCache[w.file]) {
                        img.src = wpBlobCache[w.file];
                    }
                } else {
                    item.classList.remove('active');
                    const b = item.querySelector('.badge');
                    if (b) b.remove();
                }
            });
        }

        // ==========================================
        // Wallpaper Scaling / Fit Engine (macOS Style)
        // Options: smart, fill, fit, stretch, center, tile
        // ==========================================
        const WP_FIT_CONFIGS = {
            smart: {
                title: 'Smart Fit',
                sub: '智能全景自适应 (比例感知无黑边)',
                notice: 'Smart Fit (智能自适应 · 比例感知无黑边)',
                size: 'smart',
                pos: 'center center',
                repeat: 'no-repeat',
                bg: 'transparent'
            },
            fill: {
                title: 'Fill Screen',
                sub: '充满屏幕 (等比裁切铺满)',
                notice: 'Fill Screen (充满屏幕 · 等比铺满)',
                size: 'cover',
                pos: 'center center',
                repeat: 'no-repeat',
                bg: 'transparent'
            },
            fit: {
                title: 'Fit to Screen',
                sub: '适应屏幕 (全景无裁切+光晕)',
                notice: 'Fit to Screen (适应屏幕 · 毛玻璃光晕填充)',
                size: 'contain',
                pos: 'center center',
                repeat: 'no-repeat',
                bg: 'transparent'
            },
            stretch: {
                title: 'Stretch to Fill Screen',
                sub: '拉伸充满屏幕 (强制填满)',
                notice: 'Stretch to Fill Screen (拉伸充满屏幕)',
                size: '100% 100%',
                pos: 'center center',
                repeat: 'no-repeat',
                bg: 'transparent'
            },
            center: {
                title: 'Center',
                sub: '居中 (原始1:1像素+光晕)',
                notice: 'Center (居中 · 原始1:1像素+毛玻璃)',
                size: 'auto',
                pos: 'center center',
                repeat: 'no-repeat',
                bg: 'transparent'
            },
            tile: {
                title: 'Tile',
                sub: '平铺 (阵列网格铺满)',
                notice: 'Tile (平铺 · 横纵重复阵列)',
                size: 'auto',
                pos: 'center center',
                repeat: 'repeat',
                bg: 'transparent'
            }
        };

        function getWallpaperFit() {
            return localStorage.getItem('car_wp_fit') || 'smart';
        }

        function computeSmartWallpaperFit(cur) {
            if (!cur) return { size: 'cover', isContain: false, modeClass: 'wp-fit-fill' };

            const screenW = window.innerWidth || document.documentElement.clientWidth || 1920;
            const screenH = window.innerHeight || document.documentElement.clientHeight || 1080;
            const screenRatio = screenW / (screenH || 1);

            // Determine image aspect ratio
            let imgRatio = cur.aspectRatio || (cur.width && cur.height ? cur.width / cur.height : null);
            if (!imgRatio && wpBlobCache[cur.file]) {
                const testImg = new Image();
                testImg.src = wpBlobCache[cur.file];
                if (testImg.naturalWidth && testImg.naturalHeight) {
                    imgRatio = testImg.naturalWidth / testImg.naturalHeight;
                }
            }
            if (!imgRatio) imgRatio = 16 / 9;

            const isScreenLandscape = screenRatio >= 1.0;
            const isImgLandscape = imgRatio >= 1.0;

            // Cross-orientation (e.g. portrait 9:16 phone wallpaper on landscape screen):
            // Contain mode + luxury ambient edge filling to prevent 70% subject cropping!
            if (isScreenLandscape !== isImgLandscape) {
                return { size: 'contain', isContain: true, modeClass: 'wp-fit-contain' };
            }

            // Same orientation: check ratio discrepancy
            const deviation = Math.abs(screenRatio - imgRatio) / screenRatio;
            if (deviation <= 0.18) {
                // Minor deviation (e.g. 16:9 on 16:10): cover with zero black bars
                return { size: 'cover', isContain: false, modeClass: 'wp-fit-fill' };
            }

            // Significant ratio discrepancy (e.g. 21:9 ultrawide or 4:3 on 16:9):
            // Contain with ambient frosted glass wings
            return { size: 'contain', isContain: true, modeClass: 'wp-fit-contain' };
        }

        function applyWallpaperFit(fitMode, wpObj) {
            const mode = fitMode || getWallpaperFit();
            const cur = wpObj || (typeof allWallpapers !== 'undefined' && allWallpapers[currentWallpaperIdx]);
            const cfg = WP_FIT_CONFIGS[mode] || WP_FIT_CONFIGS.smart || WP_FIT_CONFIGS.fill;
            const layers = document.querySelectorAll('.car-wallpaper-layer');

            let actualSize = cfg.size;
            let actualPos = cfg.pos || 'center center';
            let actualRepeat = cfg.repeat || 'no-repeat';
            let actualBg = cfg.bg || 'transparent';
            let needAmbient = false;
            let activeClass = 'wp-fit-' + mode;

            if (mode === 'smart') {
                const smartRes = computeSmartWallpaperFit(cur);
                actualSize = smartRes.size;
                needAmbient = smartRes.isContain;
                activeClass = smartRes.modeClass;
            } else if (mode === 'fit' || mode === 'center') {
                needAmbient = true;
                activeClass = mode === 'fit' ? 'wp-fit-contain' : 'wp-fit-center';
            }

            layers.forEach(layer => {
                layer.classList.remove('wp-fit-smart', 'wp-fit-fill', 'wp-fit-fit', 'wp-fit-stretch', 'wp-fit-center', 'wp-fit-tile', 'wp-fit-contain');
                layer.classList.add(activeClass);
                layer.style.backgroundSize = actualSize;
                layer.style.backgroundPosition = actualPos;
                layer.style.backgroundRepeat = actualRepeat;
                layer.style.backgroundColor = actualBg;
            });

            const amb = document.getElementById('car-wallpaper-ambient');
            if (amb) {
                amb.classList.toggle('active', needAmbient);
                if (layers[0] && layers[0].style.backgroundImage) {
                    syncAmbientWallpaper(layers[0].style.backgroundImage, cur);
                }
            }
        }

        function setWallpaperFit(mode, showNotice = true) {
            if (!WP_FIT_CONFIGS[mode]) mode = 'fill';
            localStorage.setItem('car_wp_fit', mode);
            applyWallpaperFit(mode);
            updateWallpaperFitUI(mode);
            if (showNotice) {
                const cfg = WP_FIT_CONFIGS[mode];
                showToast(`✓ 壁纸自适应模式: ${cfg.notice}`);
            }
        }

        function selectWallpaperFit(mode) {
            setWallpaperFit(mode, true);
            closeWpFitDropdown();
        }

        function updateWallpaperFitUI(fitMode) {
            const mode = fitMode || getWallpaperFit();
            const cfg = WP_FIT_CONFIGS[mode] || WP_FIT_CONFIGS.fill;

            // Update modal dropdown trigger
            const titleEl = document.getElementById('wp-fit-trigger-title');
            if (titleEl) titleEl.textContent = cfg.title;
            const subEl = document.getElementById('wp-fit-trigger-sub');
            if (subEl) subEl.textContent = cfg.sub;

            // Update modal popover options active checkmark
            document.querySelectorAll('#wp-fit-popover .car-wp-fit-opt').forEach(opt => {
                const isCur = opt.getAttribute('data-fit') === mode;
                opt.classList.toggle('active', isCur);
                const check = opt.querySelector('.opt-check');
                if (check) check.textContent = isCur ? '✓' : '';
            });

            // Update floating popover active checkmark
            document.querySelectorAll('#car-wp-fit-floating-menu .car-wp-fit-opt').forEach(opt => {
                const isCur = opt.getAttribute('data-fit') === mode;
                opt.classList.toggle('active', isCur);
                const check = opt.querySelector('.opt-check');
                if (check) check.textContent = isCur ? '✓' : '';
            });

            // Sync hidden / native select
            const nativeSel = document.getElementById('select-wp-fit');
            if (nativeSel) nativeSel.value = mode;

            // Sync quick menu select
            const quickSel = document.getElementById('car-wp-fit-quick-select');
            if (quickSel) quickSel.value = mode;
        }

        function toggleWpFitDropdown(e) {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            const wrap = document.getElementById('wp-fit-dropdown-wrap');
            if (!wrap) return;
            const isOpen = wrap.classList.contains('open');
            if (isOpen) {
                closeWpFitDropdown();
            } else {
                wrap.classList.add('open');
            }
        }

        function closeWpFitDropdown() {
            const wrap = document.getElementById('wp-fit-dropdown-wrap');
            if (wrap) wrap.classList.remove('open');
        }

        function openWpFitContextMenu(x, y) {
            const menu = document.getElementById('car-wp-fit-floating-menu');
            if (!menu) return;
            updateWallpaperFitUI();
            menu.style.display = 'flex';
            
            const menuW = 250;
            const menuH = 200;
            const maxX = window.innerWidth - menuW - 10;
            const maxY = window.innerHeight - menuH - 10;
            const finalX = Math.max(10, Math.min(x, maxX));
            const finalY = Math.max(10, Math.min(y, maxY));
            
            menu.style.left = finalX + 'px';
            menu.style.top = finalY + 'px';
        }

        function closeWpFitFloatingMenu() {
            const menu = document.getElementById('car-wp-fit-floating-menu');
            if (menu) menu.style.display = 'none';
        }

        function openWallpaperModal() {
            closeMenuModal();
            const mode = localStorage.getItem('car_wp_mode') || 'slideshow';
            updateWallpaperModeButtons(mode);

            const fit = localStorage.getItem('car_wp_fit') || 'fill';
            updateWallpaperFitUI(fit);

            const dim = localStorage.getItem('car_wp_dim') || '45';
            const dimSlider = document.getElementById('slider-wp-dim');
            if (dimSlider) dimSlider.value = dim;
            const dimVal = document.getElementById('wp-dim-val');
            if (dimVal) dimVal.textContent = dim + '%';

            const blur = localStorage.getItem('car_wp_blur') || '1';
            const blurSlider = document.getElementById('slider-wp-blur');
            if (blurSlider) blurSlider.value = blur;
            const blurVal = document.getElementById('wp-blur-val');
            if (blurVal) blurVal.textContent = blur + 'px';

            const intv = localStorage.getItem('car_wp_interval') || '5';
            const intvSelect = document.getElementById('select-wp-interval');
            if (intvSelect) intvSelect.value = intv;

            renderWallpaperUI();
            const modal = document.getElementById('car-wallpaper-modal');
            if (modal) modal.classList.add('active');
        }

        function closeWallpaperModal() {
            const modal = document.getElementById('car-wallpaper-modal');
            if (modal) modal.classList.remove('active');
        }

        function triggerWallpaperFileInput() {
            const inp = document.getElementById('file-upload-wp');
            if (inp) {
                inp.value = '';
                try {
                    if (inp.showPicker) {
                        inp.showPicker();
                    } else {
                        inp.click();
                    }
                } catch(e) {
                    inp.click();
                }
            }
        }

        function handleWallpaperUpload(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            showToast('正在读取并优化图片...');

            const reader = new FileReader();
            reader.onload = (evt) => {
                const rawUrl = evt.target.result;
                const img = new Image();
                img.onload = () => {
                    try {
                        const MAX_W = 1440;
                        const MAX_H = 1440;
                        let w = img.width;
                        let h = img.height;
                        if (w > MAX_W || h > MAX_H) {
                            if (w > h) {
                                h = Math.round((h * MAX_W) / w);
                                w = MAX_W;
                            } else {
                                w = Math.round((w * MAX_H) / h);
                                h = MAX_H;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

                        // Extract 8% edge border RGB colors for seamless ambient frosted glass
                        function extractCanvasEdgeColors(cvs) {
                            try {
                                const cw = cvs.width, ch = cvs.height;
                                const cctx = cvs.getContext('2d');
                                const imgData = cctx.getImageData(0, 0, cw, ch);
                                const d = imgData.data;
                                function getAvg(x0, y0, x1, y1) {
                                    let r = 0, g = 0, b = 0, count = 0;
                                    const step = Math.max(1, Math.floor(Math.sqrt((x1 - x0) * (y1 - y0) / 100)));
                                    for (let y = y0; y < y1; y += step) {
                                        for (let x = x0; x < x1; x += step) {
                                            const idx = (y * cw + x) * 4;
                                            r += d[idx]; g += d[idx + 1]; b += d[idx + 2];
                                            count++;
                                        }
                                    }
                                    if (!count) return 'rgb(16,20,34)';
                                    return `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
                                }
                                const bx = Math.max(2, Math.floor(cw * 0.08));
                                const by = Math.max(2, Math.floor(ch * 0.08));
                                const top = getAvg(0, 0, cw, by);
                                const bottom = getAvg(0, ch - by, cw, ch);
                                const left = getAvg(0, 0, bx, ch);
                                const right = getAvg(cw - bx, 0, cw, ch);
                                const dominant = getAvg(0, 0, cw, ch);
                                return { dominant, top, bottom, left, right };
                            } catch (e) {
                                return null;
                            }
                        }
                        const edgeColors = extractCanvasEdgeColors(canvas);

                        const newId = 'custom_' + Date.now();
                        const newWp = {
                            id: newId,
                            name: (file.name || '自定义壁纸').replace(/\.[^/.]+$/, ""),
                            file: compressedDataUrl,
                            edgeColors: edgeColors
                        };
                        const custom = getCustomWallpapers();
                        custom.push(newWp);
                        saveCustomWallpapers(custom);
                        allWallpapers.push(newWp);

                        canvas.toBlob((b) => {
                            if (b) storeWallpaperBlob(compressedDataUrl, b);
                        }, 'image/jpeg', 0.82);

                        selectWallpaperByIdx(allWallpapers.length - 1);
                        renderWallpaperUI();
                        showToast('✓ 自定义壁纸优化并提取边缘色彩成功！');
                    } catch(err) {
                        const newWp = {
                            id: 'custom_' + Date.now(),
                            name: (file.name || '自定义壁纸').replace(/\.[^/.]+$/, ""),
                            file: rawUrl
                        };
                        const custom = getCustomWallpapers();
                        custom.push(newWp);
                        saveCustomWallpapers(custom);
                        allWallpapers.push(newWp);
                        selectWallpaperByIdx(allWallpapers.length - 1);
                        renderWallpaperUI();
                        showToast('✓ 自定义壁纸添加成功！');
                    }
                };
                img.onerror = () => {
                    showToast('⚠️ 图片解析失败，请检查文件格式');
                };
                img.src = rawUrl;
            };
            reader.onerror = () => {
                showToast('⚠️ 文件读取失败');
            };
            reader.readAsDataURL(file);
        }
        function promptAddWallpaperUrl() {
            const url = prompt('请输入壁纸图片的完整 URL 地址 (https://...):');
            if (!url || !url.trim()) return;
            const name = prompt('为这张壁纸起个名字:', '网络精选壁纸') || '网络壁纸';
            const newWp = {
                id: 'custom_' + Date.now(),
                name: name.trim(),
                file: url.trim()
            };
            const custom = getCustomWallpapers();
            custom.push(newWp);
            saveCustomWallpapers(custom);
            allWallpapers.push(newWp);
            selectWallpaperByIdx(allWallpapers.length - 1);
            renderWallpaperUI();
            showToast('✓ 网络壁纸添加成功！');
        }

        // 后台静默预热壁纸库到 IndexedDB: 国内网络秒开且永久离线可用
        function prefetchRemainingWallpapers() {
            setTimeout(async () => {
                for (const w of allWallpapers) {
                    try {
                        if (!wpBlobCache[w.file]) {
                            const cached = await getStoredWallpaperBlob(w.file);
                            if (cached) {
                                wpBlobCache[w.file] = URL.createObjectURL(cached);
                                wpPreloaded.add(w.file);
                            } else {
                                loadWallpaperBlob(w, null, null).then(blob => {
                                    wpBlobCache[w.file] = URL.createObjectURL(blob);
                                    wpPreloaded.add(w.file);
                                }).catch(() => {});
                            }
                        }
                    } catch(e) {}
                }
            }, 2500);
        }

        // --- WakeLock & Anti-Sleep Heartbeat (Android Car Screen Protection) ---
        let wakeLockObj = null;
        let keepAliveTimer = null;
        
        function releaseWakeLock() {
            if (wakeLockObj) {
                try { wakeLockObj.release(); } catch(e) {}
                wakeLockObj = null;
            }
            if (keepAliveTimer) {
                clearInterval(keepAliveTimer);
                keepAliveTimer = null;
            }
        }

        async function acquireWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    wakeLockObj = await navigator.wakeLock.request('screen');
                    const b = document.getElementById('car-wakelock-badge');
                    if (b) b.textContent = '💡 常亮保持: 开启';
                    if (typeof logEvent === 'function') logEvent('💡 [bcos座舱锁屏] 屏幕常亮唤醒锁 (WakeLock API) 激活成功', 'info');
                    wakeLockObj.addEventListener('release', () => {
                        const b2 = document.getElementById('car-wakelock-badge');
                        if (b2) b2.textContent = '💡 常亮保持: 备用守护';
                        if (typeof logEvent === 'function') logEvent('⚠️ [bcos座舱锁屏] 屏幕常亮锁释放，自动切换为 Canvas 心跳保活守护', 'warn');
                        startKeepAliveHeartbeat();
                    });
                    return;
                } catch(err) {
                    console.warn('WakeLock not granted:', err);
                }
            }
            startKeepAliveHeartbeat();
        }

        function startKeepAliveHeartbeat() {
            if (keepAliveTimer) return;
            const b = document.getElementById('car-wakelock-badge');
            if (b) b.textContent = '💡 防息屏守护: 运行中';
            keepAliveTimer = setInterval(() => {
                const c = document.getElementById('car-keepalive-canvas');
                if (c) {
                    const ctx = c.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = ctx.fillStyle === '#000001' ? '#000002' : '#000001';
                        ctx.fillRect(0, 0, 1, 1);
                    }
                }
            }, 15000);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (document.getElementById('bcos-car-lockscreen')) {
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    updateDisplay();
                }
                acquireWakeLock();
            }
        });

        // --- Fullscreen API (Cross-Vendor for iOS Safari, Mac, and Android Car Browsers) ---
        function toggleFullscreen() {
            const doc = document;
            const el = document.documentElement;
            const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
            const icon = document.getElementById('car-fs-icon');

            if (!isFull) {
                const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
                if (rfs) {
                    const res = rfs.call(el);
                    if (res && typeof res.then === 'function') {
                        res.then(() => {
                            if (icon) icon.textContent = '⛶ 退出全屏';
                            showToast('已进入全屏沉浸模式');
                        }).catch(() => {
                            handleSafariFullscreen();
                        });
                    } else {
                        if (icon) icon.textContent = '⛶ 退出全屏';
                        showToast('已进入全屏模式');
                    }
                } else {
                    handleSafariFullscreen();
                }
            } else {
                const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.webkitCancelFullScreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
                if (efs) {
                    efs.call(doc).catch(() => {});
                }
                document.body.classList.remove('safari-pseudo-fullscreen');
                if (icon) icon.textContent = '⛶ 全屏';
                showToast('已退出全屏');
            }
        }

        function handleSafariFullscreen() {
            const isStandalone = isStandaloneMode();
            const icon = document.getElementById('car-fs-icon');
            if (isStandalone) {
                showToast('📱 当前已作为独立 App 运行，享受 100% 沉浸全屏！');
                return;
            }
            const isPseudo = document.body.classList.toggle('safari-pseudo-fullscreen');
            if (icon) icon.textContent = isPseudo ? '⛶ 退出全屏' : '⛶ 全屏';
            window.scrollTo(0, 1);
            setTimeout(() => window.scrollTo(0, 0), 100);
            showToast('💡 Safari 全屏技巧：点底部分享 ⎋ →「添加到主屏幕」，即可享受真正的全屏 App 体验！');
        }

        // --- Quotes ---
        function nextQuote() {
            currentQuoteIdx = (currentQuoteIdx + 1) % COMPANION_QUOTES.length;
            const q = document.getElementById('car-quote');
            if (q) {
                q.style.opacity = '0';
                setTimeout(() => {
                    q.textContent = `"${COMPANION_QUOTES[currentQuoteIdx]}"`;
                    q.style.opacity = '1';
                }, 200);
            }
        }

        // --- Custom Anniversaries ---
        function getCustomAnniversaries() {
            try {
                return JSON.parse(safeGetItem('bcos_custom_anniversaries', '[]'));
            } catch(e) { return []; }
        }
        function saveCustomAnniversaries(list) {
            safeSetItem('bcos_custom_anniversaries', JSON.stringify(list));
            renderMilestones();
        }

        // --- Time & Calendar Calculation ---
        function updateDisplay() {
            if (document.hidden) return;
            const now = new Date();
            const start = new Date(START_DATE);
            const diff = now - start;

            // 1. Digital Clock (HH:mm:ss)
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            const clockEl = document.getElementById('car-clock');
            const clockStr = `${h}:${m}:${s}`;
            if (clockEl && clockEl.textContent !== clockStr) clockEl.textContent = clockStr;

            // OLED Anti-Burn-In: periodic discrete micro-shift (1-2px) at the start of each minute
            const currentMinute = now.getMinutes();
            if (lastPixelShiftMinute === -1) {
                lastPixelShiftMinute = currentMinute;
            } else if (currentMinute !== lastPixelShiftMinute) {
                lastPixelShiftMinute = currentMinute;
                applyPixelShift();
            }

            // 2. Solar Date + Weekday + Lunar
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const yearStr = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`;
            const weekStr = weekdays[now.getDay()];
            const dateEl = document.getElementById('car-date');
            const dateStr = `${yearStr} ${weekStr}`;
            if (dateEl && dateEl.textContent !== dateStr) dateEl.textContent = dateStr;

            const lunarEl = document.getElementById('car-lunar');
            if (lunarEl && !lunarEl.dataset.init) {
                lunarEl.textContent = getSimpleLunar(now);
                lunarEl.dataset.init = '1';
            }

            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (root && root.classList.contains('car-minimalist-mode')) {
                return; // 极简模式下跳过非显示组件的重绘，彻底杜绝发热与抖动
            }

            // 3. Days Counted & Milliseconds (Precision: 3 decimal places)
            const totalDays = Math.floor(diff / 86400000);
            const rHours = Math.floor((diff % 86400000) / 3600000);
            const rMins = Math.floor((diff % 3600000) / 60000);
            const rSecs = Math.floor((diff % 60000) / 1000);
            const rMs = String(diff % 1000).padStart(3, '0');

            const daysEl = document.getElementById('car-days');
            const totalDaysStr = String(totalDays);
            if (daysEl && daysEl.textContent !== totalDaysStr) daysEl.textContent = totalDaysStr;

            const timeEl = document.getElementById('car-time');
            if (timeEl) {
                timeEl.innerHTML = `${String(rHours).padStart(2,'0')}时 ${String(rMins).padStart(2,'0')}分 ${String(rSecs).padStart(2,'0')}秒 <span class="car-ms-frac">.${rMs}</span>`;
            }

            // 4. Next Milestone Countdown & Progress
            const nextM = MILESTONES.find(item => totalDays < item.days);
            const nextLbl = document.getElementById('car-next-label');
            const nextCnt = document.getElementById('car-next-countdown');
            const fill = document.getElementById('car-progress-fill');
            const gaugeRing = document.getElementById('car-gauge-ring');
            const gaugePct = document.getElementById('car-gauge-pct');
            const vitalPulse = document.getElementById('car-vital-pulse');

            let pct = 100;
            if (nextM) {
                const remainDays = nextM.days - totalDays;
                const nextLblStr = `🎯 目标: ${nextM.label}`;
                if (nextLbl && nextLbl.textContent !== nextLblStr) nextLbl.textContent = nextLblStr;
                const nextCntStr = `还有 ${remainDays} 天`;
                if (nextCnt && nextCnt.textContent !== nextCntStr) nextCnt.textContent = nextCntStr;
                const prevM = MILESTONES.slice().reverse().find(item => totalDays >= item.days);
                const prevDays = prevM ? prevM.days : 0;
                pct = Math.min(100, Math.max(0, ((totalDays - prevDays) / (nextM.days - prevDays)) * 100));
                const pctWidthStr = pct.toFixed(1) + '%';
                if (fill && fill.style.width !== pctWidthStr) fill.style.width = pctWidthStr;
            } else {
                if (nextLbl && nextLbl.textContent !== '🏆 恭喜达成千日万日超级里程碑！') nextLbl.textContent = '🏆 恭喜达成千日万日超级里程碑！';
                if (nextCnt && nextCnt.textContent !== '永远相伴') nextCnt.textContent = '永远相伴';
                if (fill && fill.style.width !== '100%') fill.style.width = '100%';
                pct = 100;
            }

            // HUD Circular Gauge Ring (Circumference = 2 * PI * 40 ≈ 251.33)
            if (gaugeRing) {
                const offset = Math.max(0, Math.min(251.33, 251.33 * (1 - pct / 100)));
                const offsetStr = offset.toFixed(2);
                if (gaugeRing.dataset.lastOffset !== offsetStr) {
                    gaugeRing.dataset.lastOffset = offsetStr;
                    gaugeRing.style.strokeDashoffset = offsetStr;
                }
            }
            if (gaugePct) {
                const pctStr = `${pct.toFixed(0)}%`;
                if (gaugePct.textContent !== pctStr) gaugePct.textContent = pctStr;
            }
            if (vitalPulse) {
                const pulseBpm = 72 + Math.round(Math.sin(now.getTime() / 1500) * 3);
                vitalPulse.innerHTML = `${pulseBpm} <small>BPM</small>`;
            }
        }

        // Approximate Lunar representation (Chinese Almanac)
        function getSimpleLunar(date) {
            try {
                const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
                const lunarDays = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
                                  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
                                  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
                const day = lunarDays[(date.getDate() - 1) % 30];
                const month = lunarMonths[date.getMonth()];
                return `农历 ${month}${day}`;
            } catch(e) {
                return '虚拟纪元吉祥日';
            }
        }

        let showCompletedMilestones = (function() {
            try { return localStorage.getItem('car_show_completed_milestones') === 'true'; } catch(e) { return false; }
        })();

        function toggleCompletedMilestones() {
            showCompletedMilestones = !showCompletedMilestones;
            try {
                localStorage.setItem('car_show_completed_milestones', showCompletedMilestones ? 'true' : 'false');
            } catch(e) {}
            renderMilestones();
        }

        function renderMilestones() {
            const start = new Date(START_DATE);
            const now = new Date();
            const days = Math.floor((now - start) / 86400000);
            const listEl = document.getElementById('car-ms-list');
            if (!listEl) return;

            let reachedHtml = '';
            let unreachedHtml = '';
            let reachedCount = 0;
            let currentGoal = null;

            // Built-in milestones
            MILESTONES.forEach(m => {
                const reached = days >= m.days;
                const isNext = !reached && !currentGoal;
                if (isNext) currentGoal = m;

                const mDate = new Date(start.getTime() + m.days * 86400000);
                const dateStr = `${mDate.getFullYear()}/${String(mDate.getMonth()+1).padStart(2,'0')}/${String(mDate.getDate()).padStart(2,'0')}`;

                if (reached) {
                    reachedCount++;
                    reachedHtml += `<div class="car-ms-row reached">
                        <div class="ms-row-left">
                            <span>✅</span>
                            <span>${m.label}</span>
                        </div>
                        <div class="ms-row-right">
                            <span class="ms-date">${dateStr}</span>
                            <span class="ms-pill">已达成</span>
                        </div>
                    </div>`;
                } else {
                    const statusBadge = isNext 
                        ? `<span class="ms-pill in-progress-pill">进行中 · 剩 ${m.days - days} 天</span>` 
                        : `<span class="ms-pill">剩 ${m.days - days} 天</span>`;
                    unreachedHtml += `<div class="car-ms-row ${isNext ? 'next in-progress' : ''}">
                        <div class="ms-row-left">
                            <span>${isNext ? '🎯' : '⏳'}</span>
                            <span class="${isNext ? 'in-progress-title' : ''}">${m.label}</span>
                        </div>
                        <div class="ms-row-right">
                            <span class="ms-date">${dateStr}</span>
                            ${statusBadge}
                        </div>
                    </div>`;
                }
            });

            // Custom anniversaries
            let customHtml = '';
            const custom = getCustomAnniversaries();
            if (custom.length > 0) {
                custom.forEach((c) => {
                    const cDate = new Date(c.date + ' 00:00:00');
                    const diffDays = Math.floor((now - cDate) / 86400000);
                    const isPast = diffDays >= 0;
                    customHtml += `<div class="car-ms-row" style="border-left-color:var(--car-accent2); background:rgba(255,107,181,0.06);">
                        <div class="ms-row-left">
                            <span>${c.icon || '💖'}</span>
                            <span>${c.name}</span>
                        </div>
                        <div class="ms-row-right">
                            <span class="ms-date">${c.date}</span>
                            <span class="ms-pill" style="background:rgba(255,107,181,0.2); color:var(--car-accent2);">${isPast ? `已过 ${diffDays} 天` : `倒计时 ${-diffDays} 天`}</span>
                        </div>
                    </div>`;
                });
            }

            let fullHtml = '';
            if (reachedCount > 0) {
                fullHtml += `<div class="car-ms-fold-toggle" onclick="toggleCompletedMilestones()" title="点击${showCompletedMilestones ? '收起' : '展开查看'}已达成历程">
                    <div class="fold-left">
                        <span class="fold-icon">🏆</span>
                        <span class="fold-title">已达成历程</span>
                        <span class="fold-badge">${reachedCount} 项</span>
                    </div>
                    <span class="fold-arrow">${showCompletedMilestones ? '收起 ▴' : '展开回顾 ▾'}</span>
                </div>`;
                if (showCompletedMilestones) {
                    fullHtml += `<div class="car-ms-completed-group">${reachedHtml}</div>`;
                }
            }
            fullHtml += unreachedHtml + customHtml;
            listEl.innerHTML = fullHtml;
        }

        // --- Slide to Unlock Gesture ---
        let _carSliderAbortCtrl = null;
        function initSlider() {
            const track = document.getElementById('car-track');
            const thumb = document.getElementById('car-thumb');
            if (!track || !thumb) return;

            if (_carSliderAbortCtrl) {
                try { _carSliderAbortCtrl.abort(); } catch(e) {}
            }
            _carSliderAbortCtrl = new AbortController();
            const signal = _carSliderAbortCtrl.signal;

            let isDragging = false;
            let startX = 0;
            let currentX = 0;
            let maxSlide = 0;

            const onStart = (clientX) => {
                isDragging = true;
                startX = clientX;
                maxSlide = track.clientWidth - thumb.clientWidth - 8;
                thumb.style.transition = 'none';
            };

            const fillEl = document.getElementById('car-slider-fill');
            const textEl = track.querySelector('.car-slider-text');

            const onMove = (clientX) => {
                if (!isDragging) return;
                const deltaX = clientX - startX;
                currentX = Math.max(0, Math.min(deltaX, maxSlide));
                thumb.style.transform = `translate3d(${currentX}px, 0, 0)`;

                if (maxSlide > 0) {
                    const progress = currentX / maxSlide;
                    if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
                    if (textEl) textEl.style.opacity = `${Math.max(0, 1 - progress * 1.6)}`;

                    if (progress > 0.70) {
                        isDragging = false;
                        thumb.style.transform = `translate3d(${maxSlide}px, 0, 0)`;
                        if (fillEl) fillEl.style.width = '100%';
                        if (textEl) textEl.style.opacity = '0';
                        unlockScreen();
                    }
                }
            };

            const onEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                thumb.style.transition = 'transform .28s cubic-bezier(0.2, 0.9, 0.3, 1)';
                thumb.style.transform = 'translate3d(0, 0, 0)';
                if (fillEl) {
                    fillEl.style.transition = 'width .28s cubic-bezier(0.2, 0.9, 0.3, 1)';
                    fillEl.style.width = '0%';
                    setTimeout(() => { if (fillEl) fillEl.style.transition = 'none'; }, 300);
                }
                if (textEl) {
                    textEl.style.transition = 'opacity .28s ease';
                    textEl.style.opacity = '1';
                    setTimeout(() => { if (textEl) textEl.style.transition = 'none'; }, 300);
                }
            };

            let touchStartY = 0;
            thumb.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    if (e.cancelable) e.preventDefault();
                    onStart(e.touches[0].clientX);
                }
            }, { passive: false, signal });

            window.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true, signal });

            window.addEventListener('touchmove', (e) => {
                if (isDragging && e.touches && e.touches[0]) {
                    if (e.cancelable) e.preventDefault();
                    onMove(e.touches[0].clientX);
                    return;
                }
                // Allow unhindered native touch scrolling in any scrollable card, modal, or list
                if (e.target.closest('.car-milestone-scroller, .car-milestone-card, .car-modal, .car-wp-grid, input, textarea, select')) {
                    return;
                }
                if (document.getElementById('bcos-car-lockscreen')) {
                    if (e.cancelable) e.preventDefault();
                }
            }, { passive: false, signal });
            window.addEventListener('touchend', onEnd, { signal });
            window.addEventListener('touchcancel', onEnd, { signal });

            thumb.addEventListener('mousedown', (e) => onStart(e.clientX), { signal });
            window.addEventListener('mousemove', (e) => onMove(e.clientX), { signal });
            window.addEventListener('mouseup', onEnd, { signal });
        }

        // --- Auto Hide Inactive Controls & OLED Protection ---
        let hideTimer = null;
        let lastInteractionTime = Date.now();
        let pixelShiftIdx = 0;
        let lastPixelShiftMinute = -1;
        const PIXEL_SHIFT_COORDS = [
            [0, 0], [1, -1], [-1, 1], [1, 1], [-1, -1], [0, 1], [-1, 0], [1, 0]
        ];

        function applyPixelShift() {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;
            const isInteracting = (Date.now() - lastInteractionTime) < 8000;
            const anyModalActive = document.querySelector('.car-modal-overlay.active');
            if (isInteracting || anyModalActive) {
                resetPixelShift();
                return;
            }
            pixelShiftIdx = (pixelShiftIdx + 1) % PIXEL_SHIFT_COORDS.length;
            const [dx, dy] = PIXEL_SHIFT_COORDS[pixelShiftIdx];
            const clockBox = root.querySelector('.car-clock-box');
            const heroCard = root.querySelector('.car-hero-card');
            if (clockBox) clockBox.style.transform = (dx === 0 && dy === 0) ? '' : `translate3d(${dx}px, ${dy}px, 0)`;
            if (heroCard) heroCard.style.transform = (dx === 0 && dy === 0) ? '' : `translate3d(${-dx}px, ${-dy}px, 0)`;
        }

        function resetPixelShift() {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;
            const clockBox = root.querySelector('.car-clock-box');
            const heroCard = root.querySelector('.car-hero-card');
            if (clockBox && clockBox.style.transform) clockBox.style.transform = '';
            if (heroCard && heroCard.style.transform) heroCard.style.transform = '';
        }

        function resetAutoFade() {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;
            lastInteractionTime = Date.now();
            resetPixelShift();
            if (root.classList.contains('car-idle-dimmed')) {
                root.classList.remove('car-idle-dimmed');
            }

            const topBar = document.getElementById('car-top-bar');
            const bottomBar = document.getElementById('car-bottom-bar');
            if (topBar && topBar.style.opacity !== '1') topBar.style.opacity = '1';
            if (bottomBar && bottomBar.style.opacity !== '1') bottomBar.style.opacity = '1';

            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                const anyModalActive = document.querySelector('.car-modal-overlay.active');
                if (!anyModalActive) {
                    if (topBar) topBar.style.opacity = '0.35';
                    if (bottomBar) bottomBar.style.opacity = '0.15';
                    if (root) root.classList.add('car-idle-dimmed');
                }
            }, 6000);
        }

        window.addEventListener('mousemove', resetAutoFade, { passive: true });
        window.addEventListener('touchstart', resetAutoFade, { passive: true });
        window.addEventListener('touchmove', resetAutoFade, { passive: true });
        window.addEventListener('click', resetAutoFade, { passive: true });
        window.addEventListener('keydown', resetAutoFade, { passive: true });

        // Double-click/tap background to toggle unlock or quick switch
        let lastTap = 0;
        document.addEventListener('click', (e) => {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root || !root.contains(e.target)) return;
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('#car-track') || e.target.closest('.car-modal') || e.target.closest('.clickable')) return;
            const now = Date.now();
            if (now - lastTap < 350) {
                // Double tap opens menu
                unlockScreen();
            }
            lastTap = now;
        });

        // ESC key to unlock
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
                if (root) unlockScreen();
            }
        });

        // --- Modals ---
        function openMenuModal() {
            updateWallpaperFitUI();
            document.getElementById('car-menu-modal').classList.add('active');
        }
        function closeMenuModal() {
            document.getElementById('car-menu-modal').classList.remove('active');
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            const thumb = document.getElementById('car-thumb');
            if (thumb) {
                thumb.style.transition = 'transform .28s cubic-bezier(0.2, 0.9, 0.3, 1)';
                thumb.style.transform = 'translateX(0px)';
            }
            const fillEl = document.getElementById('car-slider-fill');
            if (fillEl) { fillEl.style.transition = 'width .28s ease'; fillEl.style.width = '0%'; }
            const track = document.getElementById('car-track');
            const textEl = track ? track.querySelector('.car-slider-text') : null;
            if (textEl) { textEl.style.transition = 'opacity .28s ease'; textEl.style.opacity = '1'; }
        }
        function openAddAnniversaryModal() {
            closeMenuModal();
            document.getElementById('car-add-modal').classList.add('active');
        }
        function closeAddAnniversaryModal() {
            document.getElementById('car-add-modal').classList.remove('active');
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
        function closeModalOnBg(e) {
            if (e.target.classList.contains('car-modal-overlay')) {
                e.target.classList.remove('active');
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }
        }

        function saveNewAnniversary() {
            const name = document.getElementById('add-anni-name').value.trim();
            const date = document.getElementById('add-anni-date').value;
            const icon = document.getElementById('add-anni-icon').value.trim() || '💖';

            if (!name || !date) {
                alert('请填写纪念日名称和有效日期！');
                return;
            }

            const list = getCustomAnniversaries();
            list.push({ id: 'custom_' + Date.now(), name, date, icon });
            saveCustomAnniversaries(list);
            closeAddAnniversaryModal();
            showToast('✓ 纪念日添加成功！');
            if (typeof logEvent === 'function') {
                logEvent(`💕 [bcos座舱锁屏] 新增自定义纪念日: ${icon} ${name} (${date})`, 'info');
            }
        }

        // --- Minimalist Mode (Clean Time, Date, Lunar, Custom Wallpaper) ---
        function toggleMinimalistMode() {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;
            const isMin = root.classList.toggle('car-minimalist-mode');
            localStorage.setItem('car_minimalist_mode', isMin ? 'true' : 'false');
            updateMinimalistButtonState(isMin);
            showToast(isMin ? '✨ 已开启极简锁屏模式 (纯净时钟与壁纸)' : '🚗 已恢复标准座舱锁屏仪表');
            if (typeof logEvent === 'function') {
                logEvent(`✨ [bcos座舱锁屏] 切换极简模式: ${isMin ? '开启 (聚焦数字时钟/日期)' : '关闭 (恢复标准座舱仪表)'}`, 'info');
            }
        }

        function applyMinimalistMode(enabled) {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;
            if (enabled) {
                root.classList.add('car-minimalist-mode');
            } else {
                root.classList.remove('car-minimalist-mode');
            }
            updateMinimalistButtonState(enabled);
        }

        function updateMinimalistButtonState(enabled) {
            const btn = document.getElementById('toggle-minimal-btn');
            if (btn) btn.textContent = enabled ? '已开启极简 (点击切回标准)' : '已关闭 (点击开启极简)';
            const topBtn = document.getElementById('top-minimal-btn');
            if (topBtn) topBtn.style.color = enabled ? 'var(--car-accent)' : '';
        }

        // --- Smart Cockpit Display Geometry Engine ---
        let _geometryObserver = null;
        let _geometryRaf = null;

        function detectScreenGeometry() {
            try {
                if (window.matchMedia && window.matchMedia('(shape: round)').matches) {
                    return 'circular';
                }
            } catch (e) {}

            const w = window.innerWidth || document.documentElement.clientWidth || 1920;
            const h = window.innerHeight || document.documentElement.clientHeight || 1080;
            const ratio = w / (h || 1);

            // Circular / Square (MINI Cooper 240mm round OLED has ratio ~1:1)
            if (ratio >= 0.82 && ratio <= 1.18) {
                return 'circular';
            }
            // Ultra-Wide Panoramic (21:9 is 2.33, 32:9 is 3.55) - only for actual ultra-wide consoles
            if (ratio >= 2.15 && w >= 1100) {
                return 'ultrawide';
            }
            // Portrait Vertical (9:16 is 0.56, phone or Tesla vertical center console)
            if (ratio < 0.95 || h > w) {
                return 'portrait';
            }
            // Standard Dashboard (16:9 is 1.77, 16:10 is 1.6, 4:3 is 1.33, or mobile landscape)
            return 'standard';
        }

        function setScreenGeometry(mode, silent) {
            const targetMode = mode || 'auto';
            try {
                localStorage.setItem('car_screen_geometry', targetMode);
            } catch (e) {}

            applyScreenGeometry(targetMode);

            if (!silent && typeof showToast === 'function') {
                const toasts = {
                    auto: '🤖 已设为智能屏幕形态自适应',
                    circular: '⚪ 已切换为 MINI Cooper 圆形 OLED 屏专属布局 (1:1 向心对齐)',
                    ultrawide: '📏 已切换为 贯穿带状超宽屏布局 (21:9+ 三列全景)',
                    standard: '💻 已切换为 标准中控横屏布局 (16:9)',
                    portrait: '📱 已切换为 垂直中控竖屏布局 (9:16)'
                };
                showToast(toasts[targetMode] || '✓ 屏幕形态设置已更新');
            }
            if (typeof logEvent === 'function') {
                logEvent(`🖥️ [bcos座舱锁屏] 屏幕形态配置变更: ${targetMode}`, 'info');
            }
        }

        function applyScreenGeometry(savedMode) {
            const root = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
            if (!root) return;

            const mode = savedMode || (function() {
                try {
                    return localStorage.getItem('car_screen_geometry') || 'auto';
                } catch (e) {
                    return 'auto';
                }
            })();

            const effectiveMode = (mode === 'auto') ? detectScreenGeometry() : mode;

            if (root._lastAppliedGeometry === effectiveMode) {
                const selectEl = document.getElementById('car-screen-geometry-select');
                if (selectEl && selectEl.value !== mode) selectEl.value = mode;
                return;
            }
            root._lastAppliedGeometry = effectiveMode;

            root.classList.remove('screen-circular', 'screen-ultrawide', 'screen-standard', 'screen-portrait');
            if (effectiveMode === 'circular') {
                root.classList.add('screen-circular');
            } else if (effectiveMode === 'ultrawide') {
                root.classList.add('screen-ultrawide');
            } else if (effectiveMode === 'portrait') {
                root.classList.add('screen-portrait');
            } else {
                root.classList.add('screen-standard');
            }

            const selectEl = document.getElementById('car-screen-geometry-select');
            if (selectEl && selectEl.value !== mode) {
                selectEl.value = mode;
            }
        }

        let _geometryObserverInitialized = false;
        function initGeometryObserver() {
            applyScreenGeometry();
            if (_geometryObserverInitialized) return;
            _geometryObserverInitialized = true;
            
            const handleGeometryUpdate = () => {
                if (_geometryRaf) cancelAnimationFrame(_geometryRaf);
                _geometryRaf = requestAnimationFrame(() => {
                    const saved = (function() {
                        try { return localStorage.getItem('car_screen_geometry') || 'auto'; } catch(e) { return 'auto'; }
                    })();
                    if (saved === 'auto') {
                        applyScreenGeometry('auto');
                    }
                });
            };

            let _lastGeomW = 0, _lastGeomH = 0;
            const onOrientationOrResize = () => {
                const curW = window.innerWidth;
                const curH = window.innerHeight;
                if (curW === _lastGeomW && curH === _lastGeomH) return;
                _lastGeomW = curW;
                _lastGeomH = curH;
                handleGeometryUpdate();
            };

            // Always listen to window resize and orientation events
            window.addEventListener('resize', onOrientationOrResize, { passive: true });
            window.addEventListener('orientationchange', onOrientationOrResize, { passive: true });
            if (window.screen && window.screen.orientation) {
                try {
                    window.screen.orientation.addEventListener('change', onOrientationOrResize);
                } catch(e) {}
            }
            if (window.visualViewport) {
                try {
                    window.visualViewport.addEventListener('resize', onOrientationOrResize);
                } catch(e) {}
            }

            if (window.ResizeObserver) {
                try {
                    if (!_geometryObserver) {
                        _geometryObserver = new ResizeObserver(onOrientationOrResize);
                        _geometryObserver.observe(document.documentElement);
                    }
                } catch (e) {}
            }
        }

        // --- Init ---
        

    function showBcosCarLockscreen(targetTheme) {
        // Freeze scroll and lock document/body to eliminate iOS/Android viewport resize jitter
        const _lockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.documentElement.dataset.carlockScrollY = String(_lockScrollY);
        document.documentElement.classList.add('bcos-carlock-active');
        document.body.classList.add('bcos-carlock-active');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        _bcosInjectCSS();

        let el = document.getElementById('bcos-car-lockscreen');
        if (!el) {
            el = document.createElement('div');
            el.id = 'bcos-car-lockscreen';
            document.body.appendChild(el);
        }
        el.style.cssText = 'position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;overflow:hidden!important;contain:strict!important;z-index:100000!important;';

        if (typeof _perfMonitor !== 'undefined' && _perfMonitor._rafId) {
            cancelAnimationFrame(_perfMonitor._rafId);
            _perfMonitor._rafId = null;
            _perfMonitor._activeRAF = false;
        }

        const savedTheme = targetTheme || localStorage.getItem('bcos_car_theme') || localStorage.getItem('car_theme') || 'theme-xpeng';
        const tIdx = THEMES.findIndex(t => t.id === savedTheme);
        currentThemeIdx = tIdx !== -1 ? tIdx : 0;
        // Safely update theme classes on lockEl without overwriting existing state classes
        THEMES.forEach(t => el.classList.remove(t.id));
        el.classList.add(THEMES[currentThemeIdx].id);

        window._bcosCarLockOpenTime = Date.now();
        const isMin = localStorage.getItem('car_minimalist_mode') === 'true';
        if (typeof logEvent === 'function') {
            logEvent(`🔒 [bcos座舱锁屏] 启动座舱锁屏界面 (主题: ${THEMES[currentThemeIdx]?.name || '默认'}, 极简模式: ${isMin ? '开启' : '关闭'})`, 'info');
            logEvent(`📱 [bcos座舱锁屏] 视口就绪: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1}, 方向: ${window.innerWidth > window.innerHeight ? '横屏' : '竖屏'})`, 'info');
            logEvent(`🚀 [bcos座舱锁屏] 硬件合成加速: 移动端 GPU 3D Compositing / 图层隔离已就绪`, 'info');
        }

        el.innerHTML = window.__WP_HTML;

        loadSavedTheme();
        initTopActionsToggle();
        loadBatteryData();
        updateDisplay();
        renderMilestones();
        if (displayTimer) clearInterval(displayTimer);
        displayTimer = setInterval(updateDisplay, 30);
        initSlider();
        acquireWakeLock();
        resetAutoFade();

        // Load wallpapers & manifest
        const savedIdx = localStorage.getItem('car_wp_current_idx');
        if (savedIdx !== null) currentWallpaperIdx = parseInt(savedIdx, 10) || 0;
        applyWallpaperFit();
        applyCurrentWallpaper();
        fetchWallpaperManifest(false);
        restartWallpaperTimer();
        prefetchRemainingWallpapers();

        // Initialize dimmer and blur from storage
        const dim = localStorage.getItem('car_wp_dim') || '45';
        updateWallpaperDim(dim);
        const blur = localStorage.getItem('car_wp_blur') || '1';
        updateWallpaperBlur(blur);
        updateLockscreenAvatar();

        // Apply minimalist lockscreen mode if URL param or saved
        const urlParams = new URLSearchParams(location.search);
        const initMin = urlParams.get('minimalist') === '1' || localStorage.getItem('car_minimalist_mode') === 'true';
        applyMinimalistMode(initMin);

        // Initialize Smart Cockpit Display Geometry Engine (Circular OLED, Ultrawide, Curved)
        initGeometryObserver();

        // Double-tap clock to toggle minimalist mode on touch devices
        let _lastClockTap = 0;
        const clockEl = document.querySelector('#bcos-car-lockscreen .car-clock-box');
        if (clockEl) {
            clockEl.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - _lastClockTap < 350) {
                    e.preventDefault();
                    toggleMinimalistMode();
                    _lastClockTap = 0;
                } else {
                    _lastClockTap = now;
                }
            });
        }

        // First touch anywhere attempts to engage wake lock
        const firstInteraction = () => {
            acquireWakeLock();
            window.removeEventListener('click', firstInteraction);
            window.removeEventListener('touchstart', firstInteraction);
        };
        window.addEventListener('click', firstInteraction);
        window.addEventListener('touchstart', firstInteraction);
    }

    function closeBcosCarLockscreen() {
        const el = document.getElementById('bcos-car-lockscreen');
        if (el) el.remove();
        if (_carSliderAbortCtrl) {
            try { _carSliderAbortCtrl.abort(); } catch(e) {}
            _carSliderAbortCtrl = null;
        }
        if (displayTimer) { clearInterval(displayTimer); displayTimer = null; }
        if (wallpaperTimer) { clearInterval(wallpaperTimer); wallpaperTimer = null; }
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        lastPixelShiftMinute = -1;
        resetPixelShift();
        releaseWakeLock();
        document.documentElement.classList.remove('bcos-carlock-active');
        document.body.classList.remove('bcos-carlock-active');
        if (typeof _perfMonitor !== 'undefined' && !_perfMonitor._activeRAF) {
            _perfMonitor.startRAF();
        }
        if (typeof mouseBunnyEnabled !== 'undefined' && mouseBunnyEnabled && typeof _trailRAFRunning !== 'undefined' && !_trailRAFRunning) {
            restartTrailRAF();
        }
        const _savedScrollY = parseInt(document.documentElement.dataset.carlockScrollY || '0', 10);
        if (!isNaN(_savedScrollY) && _savedScrollY > 0) {
            window.scrollTo(0, _savedScrollY);
        }
        if (typeof logEvent === 'function') {
            const dwell = window._bcosCarLockOpenTime ? Math.max(1, Math.round((Date.now() - window._bcosCarLockOpenTime) / 1000)) : 0;
            logEvent(`🔓 [bcos座舱锁屏] 滑块解锁退出锁屏 (锁屏驻留时长: ${dwell}秒)`, 'info');
        }
        showToast('已退出车机锁屏');
    }

    function unlockScreen() {
        closeBcosCarLockscreen();
    }

    // Export aliases to window to ensure all onclick attributes in lockscreen work seamlessly
    window.openWallpaperModal = openWallpaperModal;
    window.closeWallpaperModal = closeWallpaperModal;
    window.openBatteryModal = openBatteryModal;
    window.closeBatteryModal = closeBatteryModal;
    window.saveBatteryModalData = saveBatteryModalData;
    window.syncBatterySlider = syncBatterySlider;
    window.syncBatteryInput = syncBatteryInput;
    window.quickSetSoc = quickSetSoc;
    window.selectRangeStandard = selectRangeStandard;
    window.updateRangePreview = updateRangePreview;
    window.stepRange = stepRange;
    window.quickSetRange = quickSetRange;
    window.openAddAnniversaryModal = openAddAnniversaryModal;
    window.closeAddAnniversaryModal = closeAddAnniversaryModal;
    window.saveNewAnniversary = saveNewAnniversary;
    window.openMenuModal = openMenuModal;
    window.closeMenuModal = closeMenuModal;
    window.toggleTopActions = toggleTopActions;
    window.updateLockscreenAvatar = updateLockscreenAvatar;
    window.toggleLockscreenAvatar = toggleLockscreenAvatar;
    window.toggleMinimalistMode = toggleMinimalistMode;
    window.applyMinimalistMode = applyMinimalistMode;
    window.cycleTheme = cycleTheme;
    window.nextQuote = nextQuote;
    window.unlockScreen = unlockScreen;
    window.toggleFullscreen = toggleFullscreen;
    window.closeModalOnBg = closeModalOnBg;
    window.releaseWakeLock = releaseWakeLock;
    window.acquireWakeLock = acquireWakeLock;
    window.quickCycleDriveMode = quickCycleDriveMode;
    window.quickAdjustCabinTemp = quickAdjustCabinTemp;
    window.triggerWallpaperFileInput = triggerWallpaperFileInput;
    window.handleWallpaperUpload = handleWallpaperUpload;
    window.promptAddWallpaperUrl = promptAddWallpaperUrl;
    window.setWallpaperMode = setWallpaperMode;
    window.updateWallpaperDim = updateWallpaperDim;
    window.updateWallpaperBlur = updateWallpaperBlur;
    window.changeWallpaperInterval = changeWallpaperInterval;
    window.prevWallpaper = prevWallpaper;
    window.nextWallpaper = nextWallpaper;
    window.selectWallpaperByIdx = selectWallpaperByIdx;
    window.fetchWallpaperManifest = fetchWallpaperManifest;

    window.showBcosCarLockscreen = showBcosCarLockscreen;
    window.BUILTIN_WALLPAPERS = BUILTIN_WALLPAPERS;
    window.loadWallpaperBlob = loadWallpaperBlob;
    window.wpBlobCache = wpBlobCache;
    window.WP_PLACEHOLDER = WP_PLACEHOLDER;
    window.closeBcosCarLockscreen = closeBcosCarLockscreen;
    window.detectScreenGeometry = detectScreenGeometry;
    window.setScreenGeometry = setScreenGeometry;
    window.applyScreenGeometry = applyScreenGeometry;
    window.toggleCompletedMilestones = toggleCompletedMilestones;
    window.setWallpaperFit = setWallpaperFit;
    window.selectWallpaperFit = selectWallpaperFit;
    window.applyWallpaperFit = applyWallpaperFit;
    window.getWallpaperFit = getWallpaperFit;
    window.toggleWpFitDropdown = toggleWpFitDropdown;
    window.closeWpFitDropdown = closeWpFitDropdown;
    window.openWpFitContextMenu = openWpFitContextMenu;
    window.closeWpFitFloatingMenu = closeWpFitFloatingMenu;

    // Global click-outside & context menu listeners for macOS wallpaper fit popover in lockscreen
    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('wp-fit-dropdown-wrap');
        if (wrap && !wrap.contains(e.target)) {
            closeWpFitDropdown();
        }
        const floating = document.getElementById('car-wp-fit-floating-menu');
        if (floating && !floating.contains(e.target)) {
            closeWpFitFloatingMenu();
        }
    });

    document.addEventListener('contextmenu', (e) => {
        const lockscreen = document.getElementById('bcos-car-lockscreen');
        if (!lockscreen) return;
        if (e.target.closest('.car-modal') || e.target.closest('input') || e.target.closest('select') || e.target.closest('button')) {
            return;
        }
        e.preventDefault();
        openWpFitContextMenu(e.clientX, e.clientY);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeWpFitDropdown();
            closeWpFitFloatingMenu();
        }
    });

})();

    // === Me folder app ===
    