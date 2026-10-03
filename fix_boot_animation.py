import re

with open('index.html', 'r') as f:
    content = f.read()

# =================== BOOT ANIMATION CSS ===================
boot_css = """
            /* ===== BCOS Boot Animation ===== */
            #bcos-boot-screen {
                position: absolute;
                inset: 0;
                background: #0a0a12;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: #fff;
                transition: opacity 0.6s ease;
            }
            #bcos-boot-screen.fade-out {
                opacity: 0;
                pointer-events: none;
            }
            .bcos-boot-logo {
                width: 90px;
                height: 90px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255,255,255,0.2);
                box-shadow: 0 0 36px rgba(167,139,250,0.5);
                margin-bottom: 1.5rem;
                animation: bcos-boot-pulse 2.5s ease-in-out infinite;
                transform: translate3d(0, 0, 0);
                -webkit-transform: translate3d(0, 0, 0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                will-change: opacity, filter;
            }
            @keyframes bcos-boot-pulse {
                0%, 100% {
                    opacity: 0.88;
                    filter: drop-shadow(0 0 8px rgba(167,139,250,0.3));
                }
                50% {
                    opacity: 1;
                    filter: drop-shadow(0 0 22px rgba(167,139,250,0.85));
                }
            }
            .bcos-boot-title {
                font-size: 1.4rem;
                font-weight: 300;
                letter-spacing: 0.15em;
                color: rgba(255,255,255,0.9);
                margin-bottom: 0.4rem;
            }
            .bcos-boot-ver {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.3);
                letter-spacing: 0.1em;
                margin-bottom: 2.5rem;
            }
            .bcos-boot-progress-wrap {
                width: 200px;
                height: 3px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 1rem;
            }
            .bcos-boot-progress-bar {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #a78bfa, #06FFA5);
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            .bcos-boot-status {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.4);
                letter-spacing: 0.05em;
                min-height: 1em;
                text-align: center;
            }
            /* Apple-style dots spinner */
            .bcos-boot-dots {
                display: flex;
                gap: 6px;
                margin-top: 2.5rem;
            }
            .bcos-boot-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                animation: bcos-dot-blink 1.2s ease-in-out infinite;
            }
            .bcos-boot-dot:nth-child(2) { animation-delay: 0.2s; }
            .bcos-boot-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes bcos-dot-blink {
                0%, 80%, 100% { background: rgba(255,255,255,0.15); transform: scale(0.8); }
                40%            { background: rgba(167,139,250,0.9); transform: scale(1.2); }
            }
"""

# Insert boot CSS after bcos-context-menu CSS
target_css = "            .bcos-window-resize {"
content = content.replace(target_css, boot_css + "\n            .bcos-window-resize {", 1)

# =================== BOOT ANIMATION JS ===================
boot_js = """
    // ===== BCOS Boot Animation =====
    async function _bcosBootAnimation(ov) {
        return new Promise(resolve => {
            const dt = _bcosGetDesktopTheme();
            const bootHtml = `<div id="bcos-boot-screen">
                <img class="bcos-boot-logo" src="./dist/Bunny CC_Profile.JPG" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="BCOS"/>
                <div style="display:none;width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#06FFA5);align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1.5rem;">🐰</div>
                <div class="bcos-boot-title">BCOS</div>
                <div class="bcos-boot-ver">Bunny OS · v7.8.3</div>
                <div class="bcos-boot-progress-wrap">
                    <div class="bcos-boot-progress-bar" id="bcos-boot-bar"></div>
                </div>
                <div class="bcos-boot-status" id="bcos-boot-status">Initializing kernel...</div>
                <div class="bcos-boot-dots">
                    <div class="bcos-boot-dot"></div>
                    <div class="bcos-boot-dot"></div>
                    <div class="bcos-boot-dot"></div>
                </div>
            </div>`;
            ov.innerHTML = bootHtml;

            const bar = document.getElementById('bcos-boot-bar');
            const status = document.getElementById('bcos-boot-status');

            function setProgress(pct, msg) {
                if (bar) bar.style.width = pct + '%';
                if (status) status.textContent = msg;
            }

            const steps = [
                { pct: 10,  msg: 'Initializing kernel...', delay: 80 },
                { pct: 22,  msg: 'Mounting file system...', delay: 120 },
                { pct: 35,  msg: 'Loading wallpaper engine...', delay: 100 },
                { pct: 50,  msg: 'Preloading wallpapers from cache...', delay: 150 },
                { pct: 65,  msg: 'Starting window manager...', delay: 100 },
                { pct: 78,  msg: 'Loading user preferences...', delay: 80 },
                { pct: 90,  msg: 'Starting desktop...', delay: 100 },
                { pct: 100, msg: 'Ready.', delay: 200 },
            ];

            // Run background tasks in parallel while showing animation
            const bgTasks = [];
            
            // Task 1: Fetch wallpaper manifest
            if (window.fetchWallpaperManifest) {
                bgTasks.push(new Promise(r => {
                    try { window.fetchWallpaperManifest(false); } catch(e) {}
                    setTimeout(r, 500);
                }));
            }

            // Task 2: Pre-warm IndexedDB
            if (typeof openWallpaperDB !== 'undefined') {
                bgTasks.push(openWallpaperDB().catch(() => {}));
            }

            // Task 3: Load custom bg from cache if needed
            bgTasks.push(new Promise(r => {
                const customBg = localStorage.getItem('bcosCustomBg');
                if (customBg && window.BUILTIN_WALLPAPERS && window.loadWallpaperBlob && window.wpBlobCache) {
                    const wp = window.BUILTIN_WALLPAPERS.find(w => w.file === customBg);
                    if (wp && wp.b64 && !window.wpBlobCache[wp.file]) {
                        window.loadWallpaperBlob(wp, null, null).then(blob => {
                            window.wpBlobCache[wp.file] = URL.createObjectURL(blob);
                            r();
                        }).catch(r);
                        return;
                    }
                }
                r();
            }));

            // Animate progress steps
            let stepIdx = 0;
            let totalDelay = 0;
            steps.forEach((step, i) => {
                totalDelay += step.delay;
                setTimeout(() => {
                    setProgress(step.pct, step.msg);
                    if (i === steps.length - 1) {
                        // Animation done - wait for bg tasks then finish
                        Promise.allSettled(bgTasks).then(() => {
                            setTimeout(() => {
                                const bootScreen = document.getElementById('bcos-boot-screen');
                                if (bootScreen) {
                                    bootScreen.classList.add('fade-out');
                                    setTimeout(() => {
                                        if (bootScreen.parentNode) bootScreen.remove();
                                        resolve();
                                    }, 600);
                                } else {
                                    resolve();
                                }
                            }, 150);
                        });
                    }
                }, totalDelay);
            });
        });
    }
"""

# Insert before _bcosLaunchDesktop
target_launch = "    function _bcosLaunchDesktop() {"
content = content.replace(target_launch, boot_js + "\n    function _bcosLaunchDesktop() {", 1)

# =================== MODIFY showBcosOS to use boot animation ===================
old_showbcos = """    function showBcosOS() {
        closeModal();
        _bcosInjectCSS();
        _bcosActiveOutput = null; // Clear any stale reference from previous session
        let ov = document.getElementById('bcos-overlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'bcos-overlay'; document.body.appendChild(ov); }
        if (_bcos.clockInterval) { clearInterval(_bcos.clockInterval); _bcos.clockInterval = null; }
        _bcos.history = []; _bcos.histIdx = -1; _bcos.mode = 'boot'; _bcos.winZ = 100; _bcos.wins = {}; _bcos.activeWin = null;
        _bcosInitMeFolder();
        _bcosLaunchDesktop();
        ov.classList.add('active');
    }"""

new_showbcos = """    function showBcosOS() {
        closeModal();
        _bcosInjectCSS();
        _bcosActiveOutput = null;
        let ov = document.getElementById('bcos-overlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'bcos-overlay'; document.body.appendChild(ov); }
        if (_bcos.clockInterval) { clearInterval(_bcos.clockInterval); _bcos.clockInterval = null; }
        _bcos.history = []; _bcos.histIdx = -1; _bcos.mode = 'boot'; _bcos.winZ = 100; _bcos.wins = {}; _bcos.activeWin = null;
        ov.classList.add('active');
        _bcosInitMeFolder();
        // Show boot animation, then launch desktop
        _bcosBootAnimation(ov).then(() => {
            _bcosLaunchDesktop();
        });
    }"""

content = content.replace(old_showbcos, new_showbcos)

with open('index.html', 'w') as f:
    f.write(content)
print("✅ Boot animation injected")
