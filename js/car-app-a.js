/* ===== js/car-app-a.js — 车机锁屏 核心 (自 car.html 内联抽取 v9.1.0)
 * 职责: polyfill/安全存储/纪念日数据/主题/伴侣语录/toast/时钟/壁纸核心
 * 依赖: modules.json carLoadOrder 中位于 wallpaper.js 之后加载
 * ============================================================ */
        // Global resilience polyfills
        if (typeof Element !== 'undefined' && !Element.prototype.remove) {
            Element.prototype.remove = function() {
                if (this.parentNode) this.parentNode.removeChild(this);
            };
        }
        function isStandaloneMode() {
            try {
                return (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator && window.navigator.standalone) || false;
            } catch(e) { return false; }
        }
        function safeSetItem(key, value) {
            try { localStorage.setItem(key, value); return true; }
            catch(e) { console.warn('[localStorage] Failed to save:', key, e); return false; }
        }
        function safeGetItem(key, fallback) {
            try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
            catch(e) { return fallback; }
        }
        function safeRemoveItem(key) {
            try { localStorage.removeItem(key); return true; }
            catch(e) { console.warn('[localStorage] Failed to remove:', key, e); return false; }
        }
        window.safeSetItem = safeSetItem;
        window.safeGetItem = safeGetItem;
        window.safeRemoveItem = safeRemoveItem;

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
        function showToast(msg) {
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

        // --- Theme Management ---
        let currentThemeIdx = 0;
        function loadSavedTheme() {
            const saved = localStorage.getItem('bcos_car_theme');
            const idx = THEMES.findIndex(t => t.id === saved);
            if (idx !== -1) currentThemeIdx = idx;
            applyTheme();
        }
        function applyTheme() {
            const carRoot = document.getElementById('car-root') || document.getElementById('bcos-car-lockscreen');
            if (carRoot) {
                THEMES.forEach(theme => carRoot.classList.remove(theme.id));
                carRoot.classList.add(THEMES[currentThemeIdx].id);
            }
            // Safely update body theme class using classList without replacing existing classes (like bcos-carlock-active)
            THEMES.forEach(theme => document.body.classList.remove(theme.id));
            document.body.classList.add(THEMES[currentThemeIdx].id);
            const badge = document.getElementById('car-theme-name');
            if (badge) badge.textContent = THEMES[currentThemeIdx].name;
            localStorage.setItem('bcos_car_theme', THEMES[currentThemeIdx].id);
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
            const lockEl = document.getElementById('car-root') || document.getElementById('bcos-car-lockscreen');
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
            const lockEl = document.getElementById('car-root') || document.getElementById('bcos-car-lockscreen');
            const current = lockEl ? lockEl.classList.contains('show-top-actions') : (localStorage.getItem('car_show_top_actions') === 'true');
            const next = !current;
            localStorage.setItem('car_show_top_actions', next ? 'true' : 'false');
            applyTopActionsState(next);
            showToast(next ? '✓ 顶部操作按键已常驻显示' : '✓ 顶部操作按键已隐藏（可在设置中随时恢复）');
        }

        // --- Lockscreen Avatar Management (Sync with Sidebar Avatar style: Emoji / Photo) ---
        function updateLockscreenAvatar(targetMode) {
            const mode = targetMode || localStorage.getItem('sidebarAvatar') || 'emoji';
            
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
            const current = safeGetItem('sidebarAvatar', 'emoji');
            const next = current === 'photo' ? 'emoji' : 'photo';
            if (typeof window.setSidebarAvatar === 'function') {
                window.setSidebarAvatar(next);
            } else {
                safeSetItem('sidebarAvatar', next);
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
        const BUILTIN_WALLPAPERS = [
        {
                "id": "starlight",
                "name": "星空原野 · 银河漫步",
                "file": "wallpaper/Starlight210128.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1706,
                "aspectRatio": 1.501,
                "orientation": "landscape",
                "size": 983363,
                "edgeColors": {
                        "dominant": "rgb(121,135,145)",
                        "dominantRgb": "121,135,145",
                        "top": "rgb(148,174,208)",
                        "topRgb": "148,174,208",
                        "bottom": "rgb(113,119,113)",
                        "bottomRgb": "113,119,113",
                        "left": "rgb(108,115,109)",
                        "leftRgb": "108,115,109",
                        "right": "rgb(117,133,152)",
                        "rightRgb": "117,133,152"
                },
                "b64_fallback": "wallpaper/Starlight210128.min.b64"
        },
        {
                "id": "illustration",
                "name": "梦幻插画 · 浪漫次元",
                "file": "wallpaper/1126942.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1440,
                "aspectRatio": 1.778,
                "orientation": "landscape",
                "size": 757748,
                "edgeColors": {
                        "dominant": "rgb(35,48,65)",
                        "dominantRgb": "35,48,65",
                        "top": "rgb(30,51,70)",
                        "topRgb": "30,51,70",
                        "bottom": "rgb(80,85,101)",
                        "bottomRgb": "80,85,101",
                        "left": "rgb(15,29,45)",
                        "leftRgb": "15,29,45",
                        "right": "rgb(17,28,44)",
                        "rightRgb": "17,28,44"
                },
                "b64_fallback": "wallpaper/1126942.min.b64"
        },
        {
                "id": "bunny_snow",
                "name": "兔可可 · 纯真雪白",
                "file": "wallpaper/IMG_2833.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1440,
                "aspectRatio": 1.778,
                "orientation": "landscape",
                "size": 1215569,
                "edgeColors": {
                        "dominant": "rgb(98,93,84)",
                        "dominantRgb": "98,93,84",
                        "top": "rgb(105,99,83)",
                        "topRgb": "105,99,83",
                        "bottom": "rgb(102,99,93)",
                        "bottomRgb": "102,99,93",
                        "left": "rgb(75,73,66)",
                        "leftRgb": "75,73,66",
                        "right": "rgb(110,103,96)",
                        "rightRgb": "110,103,96"
                },
                "b64_fallback": "wallpaper/IMG_2833.min.b64"
        },
        {
                "id": "wp_1204143",
                "name": "原野星辉 · 宁静之夜",
                "file": "wallpaper/1204143.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1440,
                "aspectRatio": 1.778,
                "orientation": "landscape",
                "size": 290896,
                "edgeColors": {
                        "dominant": "rgb(1,1,2)",
                        "dominantRgb": "1,1,2",
                        "top": "rgb(2,2,3)",
                        "topRgb": "2,2,3",
                        "bottom": "rgb(3,2,3)",
                        "bottomRgb": "3,2,3",
                        "left": "rgb(1,1,2)",
                        "leftRgb": "1,1,2",
                        "right": "rgb(1,1,1)",
                        "rightRgb": "1,1,1"
                }
        },
        {
                "id": "wp_1770022526",
                "name": "相伴日常 · 甜蜜时光",
                "file": "wallpaper/177002252600796.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1974,
                "aspectRatio": 1.297,
                "orientation": "landscape",
                "size": 1860794,
                "edgeColors": {
                        "dominant": "rgb(133,123,131)",
                        "dominantRgb": "133,123,131",
                        "top": "rgb(105,88,91)",
                        "topRgb": "105,88,91",
                        "bottom": "rgb(167,162,177)",
                        "bottomRgb": "167,162,177",
                        "left": "rgb(144,134,148)",
                        "leftRgb": "144,134,148",
                        "right": "rgb(118,108,110)",
                        "rightRgb": "118,108,110"
                }
        },
        {
                "id": "wp_1770022545",
                "name": "温暖守候 · 兔兔温情",
                "file": "wallpaper/177002254500-200.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1892,
                "aspectRatio": 1.353,
                "orientation": "landscape",
                "size": 1416086,
                "edgeColors": {
                        "dominant": "rgb(128,118,124)",
                        "dominantRgb": "128,118,124",
                        "top": "rgb(95,79,80)",
                        "topRgb": "95,79,80",
                        "bottom": "rgb(166,161,176)",
                        "bottomRgb": "166,161,176",
                        "left": "rgb(134,121,129)",
                        "leftRgb": "134,121,129",
                        "right": "rgb(119,111,113)",
                        "rightRgb": "119,111,113"
                }
        },
        {
                "id": "it_takes_two_1",
                "name": "双人成行 · 奇幻冒险",
                "file": "wallpaper/2560x1600-61829-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1600,
                "aspectRatio": 1.6,
                "orientation": "landscape",
                "size": 503408,
                "edgeColors": {
                        "dominant": "rgb(105,66,40)",
                        "dominantRgb": "105,66,40",
                        "top": "rgb(76,41,17)",
                        "topRgb": "76,41,17",
                        "bottom": "rgb(123,80,48)",
                        "bottomRgb": "123,80,48",
                        "left": "rgb(88,46,27)",
                        "leftRgb": "88,46,27",
                        "right": "rgb(136,98,69)",
                        "rightRgb": "136,98,69"
                }
        },
        {
                "id": "it_takes_two_2",
                "name": "双人成行 · 携手同行",
                "file": "wallpaper/2560x1600-61834-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1600,
                "aspectRatio": 1.6,
                "orientation": "landscape",
                "size": 806978,
                "edgeColors": {
                        "dominant": "rgb(116,100,65)",
                        "dominantRgb": "116,100,65",
                        "top": "rgb(128,107,78)",
                        "topRgb": "128,107,78",
                        "bottom": "rgb(130,112,64)",
                        "bottomRgb": "130,112,64",
                        "left": "rgb(100,88,59)",
                        "leftRgb": "100,88,59",
                        "right": "rgb(109,95,59)",
                        "rightRgb": "109,95,59"
                }
        },
        {
                "id": "wp_61b5bd7f",
                "name": "唯美意境 · 梦幻霞光",
                "file": "wallpaper/61b5bd7f37541.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1600,
                "aspectRatio": 1.6,
                "orientation": "landscape",
                "size": 538689,
                "edgeColors": {
                        "dominant": "rgb(116,99,65)",
                        "dominantRgb": "116,99,65",
                        "top": "rgb(130,110,80)",
                        "topRgb": "130,110,80",
                        "bottom": "rgb(129,110,65)",
                        "bottomRgb": "129,110,65",
                        "left": "rgb(100,87,60)",
                        "leftRgb": "100,87,60",
                        "right": "rgb(106,92,58)",
                        "rightRgb": "106,92,58"
                }
        },
        {
                "id": "wp_61b5bd7f2",
                "name": "绚丽晨曦 · 光影随行",
                "file": "wallpaper/61b5bd7f375412.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1600,
                "aspectRatio": 1.6,
                "orientation": "landscape",
                "size": 482204,
                "edgeColors": {
                        "dominant": "rgb(119,104,73)",
                        "dominantRgb": "119,104,73",
                        "top": "rgb(134,117,93)",
                        "topRgb": "134,117,93",
                        "bottom": "rgb(124,106,62)",
                        "bottomRgb": "124,106,62",
                        "left": "rgb(106,94,70)",
                        "leftRgb": "106,94,70",
                        "right": "rgb(112,100,70)",
                        "rightRgb": "112,100,70"
                }
        },
        {
                "id": "wp_8736",
                "name": "旅途风景 · 旷野纪行",
                "file": "wallpaper/8736.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1920,
                "aspectRatio": 1.333,
                "orientation": "landscape",
                "size": 1533175,
                "edgeColors": {
                        "dominant": "rgb(173,162,169)",
                        "dominantRgb": "173,162,169",
                        "top": "rgb(182,180,195)",
                        "topRgb": "182,180,195",
                        "bottom": "rgb(158,145,151)",
                        "bottomRgb": "158,145,151",
                        "left": "rgb(147,140,149)",
                        "leftRgb": "147,140,149",
                        "right": "rgb(205,183,182)",
                        "rightRgb": "205,183,182"
                }
        },
        {
                "id": "wp_9f794a",
                "name": "深邃星云 · 苍穹之境",
                "file": "wallpaper/9f794a9a-d3cb-46ec-9dcd-6bbfc0bff027.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1440,
                "aspectRatio": 1.778,
                "orientation": "landscape",
                "size": 433620,
                "edgeColors": {
                        "dominant": "rgb(40,28,25)",
                        "dominantRgb": "40,28,25",
                        "top": "rgb(28,25,28)",
                        "topRgb": "28,25,28",
                        "bottom": "rgb(48,35,34)",
                        "bottomRgb": "48,35,34",
                        "left": "rgb(18,17,18)",
                        "leftRgb": "18,17,18",
                        "right": "rgb(66,36,23)",
                        "rightRgb": "66,36,23"
                }
        },
        {
                "id": "hollow_knight_1",
                "name": "空洞骑士 · 圣巢幽光",
                "file": "wallpaper/hollow_knight.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1675,
                "aspectRatio": 1.528,
                "orientation": "landscape",
                "size": 1795590,
                "edgeColors": {
                        "dominant": "rgb(106,106,108)",
                        "dominantRgb": "106,106,108",
                        "top": "rgb(124,125,128)",
                        "topRgb": "124,125,128",
                        "bottom": "rgb(106,102,102)",
                        "bottomRgb": "106,102,102",
                        "left": "rgb(101,103,111)",
                        "leftRgb": "101,103,111",
                        "right": "rgb(96,97,93)",
                        "rightRgb": "96,97,93"
                }
        },
        {
                "id": "hollow_knight_2",
                "name": "空洞骑士 · 泪水之城",
                "file": "wallpaper/hollow_knight_2.opt.jpg",
                "b64": false,
                "width": 2560,
                "height": 1440,
                "aspectRatio": 1.778,
                "orientation": "landscape",
                "size": 758270,
                "edgeColors": {
                        "dominant": "rgb(88,43,27)",
                        "dominantRgb": "88,43,27",
                        "top": "rgb(38,17,14)",
                        "topRgb": "38,17,14",
                        "bottom": "rgb(149,83,47)",
                        "bottomRgb": "149,83,47",
                        "left": "rgb(56,23,15)",
                        "leftRgb": "56,23,15",
                        "right": "rgb(112,52,32)",
                        "rightRgb": "112,52,32"
                }
        }
];

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
        const WP_PLACEHOLDER = {"wallpaper/Starlight210128.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC5ZXrR/LIS0eOG5JrRW5jk5Rx9O9crb3AuFJjV9y9T0x/k1I1yXYop5xkErgA/41pCq0ZOCZe1TxCllJFHtba7jMq4wBn+ftV6C8a5tY5XTyy4ztzn9a89uob5HHnl7jdkq6kuBz6dq6SG6eKGKONt2AAMdPQVs6iWpmot6Ee0LGrKNpPJKnGe1WLa3WS4V3Zid5U5PUBeM/nRRXGjcabOLzbqQAq0S/KQfxqO6GZowDjzYfmx+NFFUgP/2Q==", "wallpaper/Starlight210128.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC5ZXrR/LIS0eOG5JrRW5jk5Rx9O9crb3AuFJjV9y9T0x/k1I1yXYop5xkErgA/41pCq0ZOCZe1TxCllJFHtba7jMq4wBn+ftV6C8a5tY5XTyy4ztzn9a89uob5HHnl7jdkq6kuBz6dq6SG6eKGKONt2AAMdPQVs6iWpmot6Ee0LGrKNpPJKnGe1WLa3WS4V3Zid5U5PUBeM/nRRXGjcabOLzbqQAq0S/KQfxqO6GZowDjzYfmx+NFFUgP/2Q==", "wallpaper/Starlight210128.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC5ZXrR/LIS0eOG5JrRW5jk5Rx9O9crb3AuFJjV9y9T0x/k1I1yXYop5xkErgA/41pCq0ZOCZe1TxCllJFHtba7jMq4wBn+ftV6C8a5tY5XTyy4ztzn9a89uob5HHnl7jdkq6kuBz6dq6SG6eKGKONt2AAMdPQVs6iWpmot6Ee0LGrKNpPJKnGe1WLa3WS4V3Zid5U5PUBeM/nRRXGjcabOLzbqQAq0S/KQfxqO6GZowDjzYfmx+NFFUgP/2Q==", "wallpaper/1126942.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzmBS7gDvXTaGbSyuv9Kt4py8ZAWTBA5HPPeudtITOcdv51NLGbEJiRvMDNwOOOMHP5/lW7vY57Xla5t+IIYrm7MttaxWyBQu2MjBPrxXNzMyuQxJq6plu8HznBXjlskKc55/HH41TuY2hO08ihN2Ha0rF7SxkL9a6LxHZwWlrZtHEheaMhmZQTj0GelFFVL4TOPxMZp1rbW2mSXSW8ZeQKhDDgAnHHcfnWVfoJdIuWf70EyhD3w3UUUVlB6HdiopTVl0P/9k=", "wallpaper/1126942.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzmBS7gDvXTaGbSyuv9Kt4py8ZAWTBA5HPPeudtITOcdv51NLGbEJiRvMDNwOOOMHP5/lW7vY57Xla5t+IIYrm7MttaxWyBQu2MjBPrxXNzMyuQxJq6plu8HznBXjlskKc55/HH41TuY2hO08ihN2Ha0rF7SxkL9a6LxHZwWlrZtHEheaMhmZQTj0GelFFVL4TOPxMZp1rbW2mSXSW8ZeQKhDDgAnHHcfnWVfoJdIuWf70EyhD3w3UUUVlB6HdiopTVl0P/9k=", "wallpaper/1126942.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzmBS7gDvXTaGbSyuv9Kt4py8ZAWTBA5HPPeudtITOcdv51NLGbEJiRvMDNwOOOMHP5/lW7vY57Xla5t+IIYrm7MttaxWyBQu2MjBPrxXNzMyuQxJq6plu8HznBXjlskKc55/HH41TuY2hO08ihN2Ha0rF7SxkL9a6LxHZwWlrZtHEheaMhmZQTj0GelFFVL4TOPxMZp1rbW2mSXSW8ZeQKhDDgAnHHcfnWVfoJdIuWf70EyhD3w3UUUVlB6HdiopTVl0P/9k=", "wallpaper/IMG_2833.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDg4GliABzgDHBrt/Bt3/xM3RZSsZgPDNxkdBz3qnaaejebA3mBWOWA2qOuef8A65q1Hp9hCzIRGQRkHeB/M5/Ss3OKku47Ow1LQ3ivOAgXzCCZM7R1Oc9PwqETWLlVuJfJDg7ZGHD4OCQPTOfyrQga1EDwO6qkuRuWQDt/ntVOXRLa9VUimD7PuhJASq59/wAO9RBxXqXK4xJS0CrhVVRwqjAFPgjSQnco5B/lRRWqIZVPMTDPSqHmyRPmNyp9qKKTGf/Z", "wallpaper/IMG_2833.PNG": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDg4GliABzgDHBrt/Bt3/xM3RZSsZgPDNxkdBz3qnaaejebA3mBWOWA2qOuef8A65q1Hp9hCzIRGQRkHeB/M5/Ss3OKku47Ow1LQ3ivOAgXzCCZM7R1Oc9PwqETWLlVuJfJDg7ZGHD4OCQPTOfyrQga1EDwO6qkuRuWQDt/ntVOXRLa9VUimD7PuhJASq59/wAO9RBxXqXK4xJS0CrhVVRwqjAFPgjSQnco5B/lRRWqIZVPMTDPSqHmyRPmNyp9qKKTGf/Z", "wallpaper/IMG_2833.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDg4GliABzgDHBrt/Bt3/xM3RZSsZgPDNxkdBz3qnaaejebA3mBWOWA2qOuef8A65q1Hp9hCzIRGQRkHeB/M5/Ss3OKku47Ow1LQ3ivOAgXzCCZM7R1Oc9PwqETWLlVuJfJDg7ZGHD4OCQPTOfyrQga1EDwO6qkuRuWQDt/ntVOXRLa9VUimD7PuhJASq59/wAO9RBxXqXK4xJS0CrhVVRwqjAFPgjSQnco5B/lRRWqIZVPMTDPSqHmyRPmNyp9qKKTGf/Z", "wallpaper/1204143.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDyi2tzPIF6Cu+8OeDLK9svPnjLklwOePlQsc/+O/nXJ6LJbhwGgEkn+25x+Qwf1rvbXxLNpOkSWcECKLgtgKpOAV2nknr93H0NapJRuEVdmRceF7KW2aVLbyxuwCjHPQnp+Fclq+lNpcsXzh45k8xCD2yRz+II/CvRNH8Tf2ZcmSfyfsxKrJ5gyE5GTxn5tpbHua47xfqsWsag92JlaRsKEjUhAAO2eg6n8aJWsVJJOyOcVirAqSCO4rQi12/iUKJtwHTcM0UVmmJDLrV7u7/1rjt0GOnSqJJJyaKKGI//2Q==", "wallpaper/1204143.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDyi2tzPIF6Cu+8OeDLK9svPnjLklwOePlQsc/+O/nXJ6LJbhwGgEkn+25x+Qwf1rvbXxLNpOkSWcECKLgtgKpOAV2nknr93H0NapJRuEVdmRceF7KW2aVLbyxuwCjHPQnp+Fclq+lNpcsXzh45k8xCD2yRz+II/CvRNH8Tf2ZcmSfyfsxKrJ5gyE5GTxn5tpbHua47xfqsWsag92JlaRsKEjUhAAO2eg6n8aJWsVJJOyOcVirAqSCO4rQi12/iUKJtwHTcM0UVmmJDLrV7u7/1rjt0GOnSqJJJyaKKGI//2Q==", "wallpaper/177002252600796.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDP02GS2Z4pSJAwyCpzzV2GykitJzGjkSSESrJkjJOVx7dvrXQQabFboGSJmkkO12IwFP0pt3IkSZDqsROJGGM7h1AH4/zrX2Ta3K9pqcC5W0urpIQDB5p8tQeVH+BqKGQpKZJCQWHAPIrpL7QIvsgmhBWTaHKtyCCfXv0H5UXOn2zQLC8SsyjJ2DDITz/WodNofOmdczNLdsXY5GMcnjHp6Vg6rIZYXLdBIMKOmOmPpRRWv2SS9ZANZSwOA6xW4ZC3JGaZ4f0+K+ku2nLkrKyAhucDAH6UUVFRvlYluf/Z", "wallpaper/177002252600796.JPG": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDP02GS2Z4pSJAwyCpzzV2GykitJzGjkSSESrJkjJOVx7dvrXQQabFboGSJmkkO12IwFP0pt3IkSZDqsROJGGM7h1AH4/zrX2Ta3K9pqcC5W0urpIQDB5p8tQeVH+BqKGQpKZJCQWHAPIrpL7QIvsgmhBWTaHKtyCCfXv0H5UXOn2zQLC8SsyjJ2DDITz/WodNofOmdczNLdsXY5GMcnjHp6Vg6rIZYXLdBIMKOmOmPpRRWv2SS9ZANZSwOA6xW4ZC3JGaZ4f0+K+ku2nLkrKyAhucDAH6UUVFRvlYluf/Z", "wallpaper/177002254500-200.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDAfSn2yQeZ5iSAhcHLDuD/AJ9a0tVs0a08t1JtmAKyEEMRxyR2YV0Om2ObCO8mgzOygnPAANTXyxNbeVP5bxFir7hwCAOg/LrWip3V7lc+tjibJpXj8hF86ROhB5IzxnPSjEdtJmdzJM+cxKchfxro30cPaR3VkxjZiSVwq8emQPTOazbjTbabCBQePmUABkYHnkCpcGtR8yZ2bAz3MSMxAXaBtOMZ54/KsW+kNz8jgBDKFIXI4ORj9M/WiitV8JL3LcRMVhsUn5DtBJ5xg1X8MWcNzZGSZS7Su7Eljwdx6UUVnWbURR3P/9k=", "wallpaper/177002254500-200.JPG": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDAfSn2yQeZ5iSAhcHLDuD/AJ9a0tVs0a08t1JtmAKyEEMRxyR2YV0Om2ObCO8mgzOygnPAANTXyxNbeVP5bxFir7hwCAOg/LrWip3V7lc+tjibJpXj8hF86ROhB5IzxnPSjEdtJmdzJM+cxKchfxro30cPaR3VkxjZiSVwq8emQPTOazbjTbabCBQePmUABkYHnkCpcGtR8yZ2bAz3MSMxAXaBtOMZ54/KsW+kNz8jgBDKFIXI4ORj9M/WiitV8JL3LcRMVhsUn5DtBJ5xg1X8MWcNzZGSZS7Su7Eljwdx6UUVnWbURR3P/9k=", "wallpaper/2560x1600-61829-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzqWxwzyEkrnt2zXT+FbOGSz810BxJsbdzwOf6mo7+xWDTPLW5WVjLmOJAHLgdTnqOtWfCtw8NhPCVAHmZIZeRx/8AWrzq0r07noxSua9xZaetv5j2kJydvEYPf6cVQOhWkjfaNsIiPGzdj8sVedoXgaOWBDEuWAAxg+orH0rVDdXDwjy0lGBDk7Qe20nB+uT3FRh5RadwqJvVHO6LdStqwBbjniuzEjcUUV01lsZ0dn6j9xCgDvWFPaRW+rWjxrzLNlgTweRRRXLBWnobSP/Z", "wallpaper/2560x1600-61829-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzqWxwzyEkrnt2zXT+FbOGSz810BxJsbdzwOf6mo7+xWDTPLW5WVjLmOJAHLgdTnqOtWfCtw8NhPCVAHmZIZeRx/8AWrzq0r07noxSua9xZaetv5j2kJydvEYPf6cVQOhWkjfaNsIiPGzdj8sVedoXgaOWBDEuWAAxg+orH0rVDdXDwjy0lGBDk7Qe20nB+uT3FRh5RadwqJvVHO6LdStqwBbjniuzEjcUUV01lsZ0dn6j9xCgDvWFPaRW+rWjxrzLNlgTweRRRXLBWnobSP/Z", "wallpaper/2560x1600-61834-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDGa7upbhvLSFM9FjGB+tI010Mkxxk55ye9UIJ2acAZ3E7TkfpVqTyvOJNwmCQuT6+3PSuOTXU3i+xE090hdgqcckDtVvTtSngPmExliMAY6VVlmt7O1Jfc88oPy/dwvTniqCrJEvnK2I25A/u+3/16d00Gq1Omjt43QOVHHYKOf0zUT2tuMFYI1Ld1XFFFc63LQSqYDuRmOeu/5s/nVqGQukEfADIckdeOlFFNmcz/2Q==", "wallpaper/2560x1600-61834-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDGa7upbhvLSFM9FjGB+tI010Mkxxk55ye9UIJ2acAZ3E7TkfpVqTyvOJNwmCQuT6+3PSuOTXU3i+xE090hdgqcckDtVvTtSngPmExliMAY6VVlmt7O1Jfc88oPy/dwvTniqCrJEvnK2I25A/u+3/16d00Gq1Omjt43QOVHHYKOf0zUT2tuMFYI1Ld1XFFFc63LQSqYDuRmOeu/5s/nVqGQukEfADIckdeOlFFNmcz/2Q==", "wallpaper/61b5bd7f37541.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHlvLiSWNY0hXC4Gxcbvr70jTXQ6pGT7ms1Lkl1PII9quyiMS/POgOADnsfTr+dccmupvFkL3F1HuYKnB5x0Gav2GqTQQsD5bGQc8Vn3E9va2uGDSTTDJX7oC547ex/OqYEtsBl8q33eP6dqd00Gx0cFvG8fKgbfRR/hTZLaDORBGCT1C4NFFYdS0MmUw52sxDDnd82fxPPerrOZQVPy/ID8vfiiihrUznuf/Z", "wallpaper/61b5bd7f37541.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHlvLiSWNY0hXC4Gxcbvr70jTXQ6pGT7ms1Lkl1PII9quyiMS/POgOADnsfTr+dccmupvFkL3F1HuYKnB5x0Gav2GqTQQsD5bGQc8Vn3E9va2uGDSTTDJX7oC547ex/OqYEtsBl8q33eP6dqd00Gx0cFvG8fKgbfRR/hTZLaDORBGCT1C4NFFYdS0MmUw52sxDDnd82fxPPerrOZQVPy/ID8vfiiihrUznuf/Z", "wallpaper/61b5bd7f375412.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwChJczO8YjSFcLj5RjP1prS3AJykZYdc1nR3mWU85HtU0rxrdbmnUcBTk9D+dcsmupvEV57iMkhE98dBWhZ6hJDAwPlsXHPFZN5dwWtuF+Z5pBkrnAA7dvY/nVcSvAoO75WHy8UXTQtjYggR4+QBt9FH+FNktoM5EKAk9QuDRRWHU0GzL5JO1iQw53fNn8TzV0sZgVJ2jYD8vfiiih7mctz/9k=", "wallpaper/61b5bd7f375412.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwChJczO8YjSFcLj5RjP1prS3AJykZYdc1nR3mWU85HtU0rxrdbmnUcBTk9D+dcsmupvEV57iMkhE98dBWhZ6hJDAwPlsXHPFZN5dwWtuF+Z5pBkrnAA7dvY/nVcSvAoO75WHy8UXTQtjYggR4+QBt9FH+FNktoM5EKAk9QuDRRWHU0GzL5JO1iQw53fNn8TzV0sZgVJ2jYD8vfiiih7mctz/9k=", "wallpaper/8736.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDRW3uZvnJSdPvEJJ/M1PGWjcJkJnJJznFNsVtpiomWPJPJCc/p0q5e20MIhmV2MayDqecVUm+UuKXNcfY30MoWMFmGCfMxkcHHWug09I4UMglVgw4INcesnk3JZH4PygA9BmpTKvIZQwbk1km2rM1cFe6KttEmM4qa8kY2jgniiitpfCc6+IqliiPjkqMgntxR99Ax60UVkdET/9k=", "wallpaper/8736.JPG": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDRW3uZvnJSdPvEJJ/M1PGWjcJkJnJJznFNsVtpiomWPJPJCc/p0q5e20MIhmV2MayDqecVUm+UuKXNcfY30MoWMFmGCfMxkcHHWug09I4UMglVgw4INcesnk3JZH4PygA9BmpTKvIZQwbk1km2rM1cFe6KttEmM4qa8kY2jgniiitpfCc6+IqliiPjkqMgntxR99Ax60UVkdET/9k=", "wallpaper/9f794a9a-d3cb-46ec-9dcd-6bbfc0bff027.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzW2iORkd6uFcdqq290CQFiyWOBk1allkj2ts2sDkFT0/WmmJo0tK8MyeIHVw/lpHnJxnPp39qtap4Mm02HzwRLGOGIXBX61a8Kf2+yqNLjtGzG2FlPUDB9etZl9491crcWdzFbEElGxGcgg9ua4pOpKfuvQ74qnGC5lqc9uMcYCcZNaCHMeDzx3+tFFdvQ4VujVtmaBVaElGU8FTgiuTvHaS7ldyWZpGJJPJ5oorJfEdM/gR//9k=", "wallpaper/9f794a9a-d3cb-46ec-9dcd-6bbfc0bff027.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzW2iORkd6uFcdqq290CQFiyWOBk1allkj2ts2sDkFT0/WmmJo0tK8MyeIHVw/lpHnJxnPp39qtap4Mm02HzwRLGOGIXBX61a8Kf2+yqNLjtGzG2FlPUDB9etZl9491crcWdzFbEElGxGcgg9ua4pOpKfuvQ74qnGC5lqc9uMcYCcZNaCHMeDzx3+tFFdvQ4VujVtmaBVaElGU8FTgiuTvHaS7ldyWZpGJJPJ5oorJfEdM/gR//9k=", "wallpaper/hollow_knight.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDCuVuEu553kD+a7IyuGJHzYBHbv+ldNomreTazrLMbmJAJV5+bJ255OMYweK559t5czRCQBWkywYkKvOPc+mD9cVImqSWtkkKos8MW4fMvEoJJ+YDoBx0qnqNIueJdRivI7VLVGAhDFpNpIXcc9c4xx39/Tig90kgtfIlljkjIT5pMeY3GTgen4/hUdxqL6rMzGL7PasQihI/4c5yAe55H1qK1t7eLU7CJmVWklyQ54C5wMrnrx+OfYVPQTNi90uMNNiaYBp24BGBz2446VU/saHccTTDPHDAcenTnoKKKBoll0iBlRQ8qgoTwR6k9x7VHbaPGl5b4ubgkyK2Sw65Ht7UUUugH/9k=", "wallpaper/hollow_knight.jpeg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDCuVuEu553kD+a7IyuGJHzYBHbv+ldNomreTazrLMbmJAJV5+bJ255OMYweK559t5czRCQBWkywYkKvOPc+mD9cVImqSWtkkKos8MW4fMvEoJJ+YDoBx0qnqNIueJdRivI7VLVGAhDFpNpIXcc9c4xx39/Tig90kgtfIlljkjIT5pMeY3GTgen4/hUdxqL6rMzGL7PasQihI/4c5yAe55H1qK1t7eLU7CJmVWklyQ54C5wMrnrx+OfYVPQTNi90uMNNiaYBp24BGBz2446VU/saHccTTDPHDAcenTnoKKKBoll0iBlRQ8qgoTwR6k9x7VHbaPGl5b4ubgkyK2Sw65Ht7UUUugH/9k=", "wallpaper/hollow_knight_2.opt.jpg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDhtJs0vJDEDGtz1jEv3H9Vb09j/wDrDdd01NPvVEOPLkQPtDBhG38SbhwcHIqsqlcSIxUjqCKsGX7aRGzhWBwmfTPT2rG9jtST3IbG3WYEOBjcBn04P+FXXsbaOEnYCp745FaEfh+9hTIhPUHG4Dpn1PvTZLGeKLyruFgTyBGwJI/I1k6ib3NY0rboznHlocfw/MMgcVd0mGGSchoI8lidwGCKKKU9IjpK8lc7K0uGhhHCuPu4cZwKZramG382NiGCOy552kLnqeeehBoorh+2jpqaPQ//2Q==", "wallpaper/hollow_knight_2.jpeg": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAUACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDhtJs0vJDEDGtz1jEv3H9Vb09j/wDrDdd01NPvVEOPLkQPtDBhG38SbhwcHIqsqlcSIxUjqCKsGX7aRGzhWBwmfTPT2rG9jtST3IbG3WYEOBjcBn04P+FXXsbaOEnYCp745FaEfh+9hTIhPUHG4Dpn1PvTZLGeKLyruFgTyBGwJI/I1k6ib3NY0rboznHlocfw/MMgcVd0mGGSchoI8lidwGCKKKU9IjpK8lc7K0uGhhHCuPu4cZwKZramG382NiGCOy552kLnqeeehBoorh+2jpqaPQ//2Q=="};
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
            if (isUserAction) showToast(`切换壁纸: ${allWallpapers[currentWallpaperIdx].name}`);
        }

        function prevWallpaper(isUserAction) {
            if (!isUserAction && document.hidden) return;
            if (allWallpapers.length <= 1) return;
            currentWallpaperIdx = (currentWallpaperIdx - 1 + allWallpapers.length) % allWallpapers.length;
            localStorage.setItem('car_wp_current_idx', currentWallpaperIdx);
            applyCurrentWallpaper();
            if (isUserAction) showToast(`切换壁纸: ${allWallpapers[currentWallpaperIdx].name}`);
        }

        function selectWallpaperByIdx(idx) {
            currentWallpaperIdx = idx;
            localStorage.setItem('car_wp_current_idx', currentWallpaperIdx);
            applyCurrentWallpaper();
            highlightActiveThumbnail();
            showToast(`已选择壁纸: ${allWallpapers[idx].name}`);
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
