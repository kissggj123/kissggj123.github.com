/* ===== js/car-app-b.js — 车机锁屏 壁纸适配与初始化 (自 car.html 内联抽取 v9.1.0)
 * 职责: 壁纸适配/模态/上传/屏幕几何/头像/极简模式/PWA/全局导出/事件监听
 * 依赖: car-app-a.js 先行加载
 * ============================================================ */
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
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
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
            let overlay = document.getElementById('car-wp-url-modal');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'car-wp-url-modal';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
                overlay.innerHTML = `
                    <div style="background:#1a2030;border:1px solid rgba(255,255,255,0.15);box-shadow:0 16px 40px rgba(0,0,0,0.6);border-radius:14px;padding:1.4rem;width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;color:#fff;">
                        <h3 style="margin:0;font-size:15px;color:var(--car-accent,#00eaff);display:flex;align-items:center;gap:6px;">🔗 添加在线网络壁纸</h3>
                        <div>
                            <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block;">图片完整 URL 地址 (HTTPS)</label>
                            <input type="text" id="car-wp-url-input" placeholder="https://example.com/wallpaper.jpg" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block;">壁纸名称</label>
                            <input type="text" id="car-wp-name-input" placeholder="网络精选壁纸" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;gap:10px;margin-top:6px;">
                            <button onclick="_carSubmitWpUrl()" style="flex:1;background:var(--car-accent,#00eaff);color:#000;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">✓ 确认添加</button>
                            <button onclick="document.getElementById('car-wp-url-modal').style.display='none'" style="background:rgba(255,255,255,0.1);color:#eee;border:none;padding:8px 14px;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
            const urlInp = document.getElementById('car-wp-url-input');
            if (urlInp) { urlInp.value = ''; urlInp.focus(); }
        }

        function _carSubmitWpUrl() {
            const url = (document.getElementById('car-wp-url-input')?.value || '').trim();
            const name = (document.getElementById('car-wp-name-input')?.value || '').trim() || '网络精选壁纸';
            if (!url) {
                showToast('⚠️ 请输入有效的图片 URL');
                return;
            }
            const newWp = {
                id: 'custom_' + Date.now(),
                name: name,
                file: url
            };
            const custom = getCustomWallpapers();
            custom.push(newWp);
            saveCustomWallpapers(custom);
            allWallpapers.push(newWp);
            selectWallpaperByIdx(allWallpapers.length - 1);
            renderWallpaperUI();
            const m = document.getElementById('car-wp-url-modal');
            if (m) m.style.display = 'none';
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
                    wakeLockObj.addEventListener('release', () => {
                        const b2 = document.getElementById('car-wakelock-badge');
                        if (b2) b2.textContent = '💡 常亮保持: 备用守护';
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
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                updateDisplay();
                acquireWakeLock();
            }
        });

        // --- Fullscreen API (Cross-Vendor for iOS Safari & Android Car Browsers) ---
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
        function initSlider() {
            const track = document.getElementById('car-track');
            const thumb = document.getElementById('car-thumb');
            if (!track || !thumb) return;

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
            }, { passive: false });

            window.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

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
                // Disallow dragging/pulling non-scrollable parts of the lockscreen on iOS
                if (e.cancelable) e.preventDefault();
            }, { passive: false });
            window.addEventListener('touchend', onEnd);
            window.addEventListener('touchcancel', onEnd);

            thumb.addEventListener('mousedown', (e) => onStart(e.clientX));
            window.addEventListener('mousemove', (e) => onMove(e.clientX));
            window.addEventListener('mouseup', onEnd);
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
        function unlockScreen() {
            openMenuModal();
        }
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
        }

        // --- Minimalist Mode (Clean Time, Date, Lunar, Custom Wallpaper) ---
        function toggleMinimalistMode() {
            const root = document.getElementById('car-root');
            if (!root) return;
            const isMin = root.classList.toggle('car-minimalist-mode');
            localStorage.setItem('car_minimalist_mode', isMin ? 'true' : 'false');
            updateMinimalistButtonState(isMin);
            showToast(isMin ? '✨ 已开启极简锁屏模式 (双击时钟或滑动唤醒菜单)' : '🚗 已切换回标准座舱锁屏模式');
        }

        function applyMinimalistMode(enabled) {
            const root = document.getElementById('car-root');
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

        function initGeometryObserver() {
            applyScreenGeometry();
            
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

            // Responsive updates on orientation change with immediate + multi-step settle checks
            const onOrientationOrResize = () => {
                handleGeometryUpdate();
                setTimeout(handleGeometryUpdate, 60);
                setTimeout(handleGeometryUpdate, 180);
                setTimeout(handleGeometryUpdate, 360);
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
                        const rootEl = document.getElementById('bcos-car-lockscreen') || document.getElementById('car-root');
                        if (rootEl) _geometryObserver.observe(rootEl);
                    }
                } catch (e) {}
            }
        }

        // --- PWA Installation Support for car.html ---
        let carInstallPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            carInstallPrompt = e;
            const topBtn = document.getElementById('top-install-btn');
            if (topBtn) topBtn.style.display = 'inline-flex';
        });

        function installCarPWA() {
            const isStandalone = isStandaloneMode();
            if (isStandalone) {
                showToast('✓ 当前已作为独立 PWA 应用运行');
                return;
            }
            if (carInstallPrompt) {
                carInstallPrompt.prompt();
                carInstallPrompt.userChoice.then((choice) => {
                    if (choice.outcome === 'accepted') {
                        showToast('✓ 感谢安装兔可可车机锁屏！');
                    }
                    carInstallPrompt = null;
                });
                return;
            }
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showToast('💡 iOS 安装提示：点击 Safari 底部分享图标 ⎋ → 选择「添加到主屏幕」即可安装！');
            } else {
                showToast('💡 安装提示：请点击浏览器右上角菜单 →「安装应用」或「添加到主屏幕」');
            }
        }

        // --- Init ---
        // v9.1: 注册表动态注入时 window load 可能已触发, 用 readyState 兜底
        function _carAppInit() {
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
            const clockEl = document.querySelector('.car-clock-box');
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

            // Offline service worker registration
            if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
                navigator.serviceWorker.register('./service-worker.js').catch(() => {});
            }

            // First touch anywhere attempts to engage wake lock & fullscreen
            const firstInteraction = () => {
                acquireWakeLock();
                window.removeEventListener('click', firstInteraction);
                window.removeEventListener('touchstart', firstInteraction);
            };
            window.addEventListener('click', firstInteraction);
            window.addEventListener('touchstart', firstInteraction);
        }
        if (document.readyState === 'complete') _carAppInit();
        else window.addEventListener('load', _carAppInit);

        // Global click-outside & context menu listeners for macOS wallpaper fit popover
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

        window.updateLockscreenAvatar = updateLockscreenAvatar;
        window.setSidebarAvatar = (mode) => { localStorage.setItem('sidebarAvatar', mode); updateLockscreenAvatar(mode); };
        window.toggleLockscreenAvatar = toggleLockscreenAvatar;
        window.toggleMinimalistMode = toggleMinimalistMode;
        window.installCarPWA = installCarPWA;
        window.detectScreenGeometry = detectScreenGeometry;
        window.setScreenGeometry = setScreenGeometry;
        window.applyScreenGeometry = applyScreenGeometry;
        window.toggleCompletedMilestones = toggleCompletedMilestones;
        window.setWallpaperFit = setWallpaperFit;
        window.selectWallpaperFit = selectWallpaperFit;
        window.applyWallpaperFit = applyWallpaperFit;
        window.toggleWpFitDropdown = toggleWpFitDropdown;
        window.closeWpFitDropdown = closeWpFitDropdown;
        window.openWpFitContextMenu = openWpFitContextMenu;
        window.closeWpFitFloatingMenu = closeWpFitFloatingMenu;

        // v9.1: 版本号注入 (car.html 系统信息栏, 依赖动态加载的 version.js 晚于此静态脚本)
        (function _injectCarVersion() {
            function apply() {
                try {
                    if (window.BCOS_VERSION) {
                        var el = document.getElementById('car-sys-ver');
                        if (el) el.textContent = 'bcos ' + window.BCOS_VERSION;
                    }
                } catch(e) {}
            }
            if (window.BCOS_VERSION) apply();
            else setTimeout(apply, 1500); // 等待注册表动态注入 version.js
        })();
