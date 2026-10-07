let trailPoints = [];
    let trailParticles = [];
    let mouseX = 0, mouseY = 0;
    let _isOverEggFab = false; // Pause trail when hovering FAB in egg mode
    let _isDraggingEggFab = false; // Pause trail when dragging FAB to prevent trail head following
    let trailCtx = null, fxCtx = null;
    let trailCanvas = null, fxCanvas = null;
    const MAX_TRAIL_POINTS = 50;
    const TRAIL_LIFETIME = 500;
    // Egg whiteout ink-persist mode variables
    let eggInkPersistMode = false;
    let eggInkPersistStart = 0;
    let lastMouseMoveTime = 0;
    let _lastTrailFrameTime = 0;
    let inkPersistEndTimer = null;

    // 10x10 pixel rabbit head map: 1=accent fill, 2=eye/dark, 0=transparent
    const RABBIT_PIXELS = [
        [0,1,0,0,0,0,0,0,1,0],
        [0,1,1,0,0,0,0,0,1,1],
        [0,1,1,0,0,0,0,0,1,1],
        [0,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,2,1,1,1,1,2,1,1],
        [1,1,1,1,2,1,2,1,1,1],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0],
    ];

    // Cached trail config — avoid getComputedStyle() on every frame
    let _trailCfgCache = null;
    let _trailCfgTheme = null;
    function getTrailConfig() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || '';
        if (_trailCfgCache && _trailCfgTheme === currentTheme) return _trailCfgCache;
        _trailCfgTheme = currentTheme;
        const cs = getComputedStyle(document.documentElement);
        _trailCfgCache = {
            style: (cs.getPropertyValue('--trail-style') || '').trim().replace(/['"]/g, '') || 'ribbon',
            width: parseFloat(cs.getPropertyValue('--trail-width')) || 6,
            glow: parseFloat((cs.getPropertyValue('--trail-glow') || '0px').replace('px', '')) || 0,
            accent: (cs.getPropertyValue('--accent') || '').trim() || '#FF6B9D',
            accent2: (cs.getPropertyValue('--accent2') || '').trim() || '#FFB5BA',
        };
        return _trailCfgCache;
    }
    // Invalidate cache when theme changes
    function _invalidateTrailCache() { _trailCfgCache = null; _trailCfgTheme = null; }

    function initMouseTrail() {
        trailCanvas = document.getElementById('trail-canvas');
        fxCanvas = document.getElementById('bunny-canvas');
        trailCtx = trailCanvas.getContext ? trailCanvas.getContext('2d') : null;
        fxCtx = fxCanvas.getContext ? fxCanvas.getContext('2d') : null;
        if (!trailCtx || !fxCtx) return;

        function resize() {
            trailCanvas.width = window.innerWidth;
            trailCanvas.height = window.innerHeight;
            fxCanvas.width = window.innerWidth;
            fxCanvas.height = window.innerHeight;
        }
        resize();
        // Debounced resize — re-render game UI and adjust DPI-aware font scaling
        let _resizeTimer = null;
        window.addEventListener('resize', () => {
            if (typeof window.getWallpaperFit === 'function' && window.getWallpaperFit() === 'smart' && typeof window.applyWallpaperFit === 'function') window.applyWallpaperFit('smart');
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(() => {
                resize();
                // Re-apply DPI-aware font scaling on resolution/DPI change
                if (typeof loadFontScale === 'function') loadFontScale();
                // Re-render game board to fit new dimensions
                if (typeof renderMonopoly === 'function' && mono.started) renderMonopoly();
            }, 200);
        });

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            lastMouseMoveTime = performance.now();
            // Check if mouse is over the egg FAB — pause trail to prevent FAB becoming trail head
            const eggFab = document.getElementById('egg-fab');
            _isOverEggFab = false;
            if (eggFab && eggFab.style.display !== 'none') {
                const rect = eggFab.getBoundingClientRect();
                if (mouseX >= rect.left - 10 && mouseX <= rect.right + 10 &&
                    mouseY >= rect.top - 10 && mouseY <= rect.bottom + 10) {
                    _isOverEggFab = true;
                }
            }
            if (mouseBunnyEnabled && !_isOverEggFab && !_isDraggingEggFab) {
                trailPoints.push({ x: mouseX, y: mouseY, t: performance.now() });
                if (trailPoints.length > _perfConfig.trailMaxPoints) trailPoints.shift();
                spawnTrailParticles(mouseX, mouseY);
                if (!_trailRAFRunning) restartTrailRAF();
            }
            document.documentElement.style.setProperty('--mx', mouseX + 'px');
            document.documentElement.style.setProperty('--my', mouseY + 'px');
        });

        window.addEventListener('touchmove', (e) => {
            if (document.getElementById('bcos-car-lockscreen')) return;
            if (!e.touches[0]) return;
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            lastMouseMoveTime = performance.now();
            // Check if touch is over the egg FAB
            const eggFab = document.getElementById('egg-fab');
            _isOverEggFab = false;
            if (eggFab && eggFab.style.display !== 'none') {
                const rect = eggFab.getBoundingClientRect();
                if (mouseX >= rect.left - 10 && mouseX <= rect.right + 10 &&
                    mouseY >= rect.top - 10 && mouseY <= rect.bottom + 10) {
                    _isOverEggFab = true;
                }
            }
            if (mouseBunnyEnabled && !_isOverEggFab && !_isDraggingEggFab) {
                trailPoints.push({ x: mouseX, y: mouseY, t: performance.now() });
                if (trailPoints.length > _perfConfig.trailMaxPoints) trailPoints.shift();
                spawnTrailParticles(mouseX, mouseY);
                if (!_trailRAFRunning) restartTrailRAF();
            }
        }, { passive: true });

        // Mobile fix: ensure RAF loop continues to fade out trail after touch ends
        window.addEventListener('touchend', () => {
            if (mouseBunnyEnabled && !eggInkPersistMode) {
                lastMouseMoveTime = performance.now(); // Mark last activity time
                if (!_trailRAFRunning) restartTrailRAF();
            }
        }, { passive: true });
        window.addEventListener('pointerup', () => {
            if (mouseBunnyEnabled && !eggInkPersistMode) {
                lastMouseMoveTime = performance.now();
                if (!_trailRAFRunning) restartTrailRAF();
            }
        }, { passive: true });

        // Visibility change: clear stale trail when returning from background
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            if (document.getElementById('bcos-car-lockscreen')) return;
            // Page became visible — clear any stale trail content and restart RAF
            if (mouseBunnyEnabled && !eggInkPersistMode) {
                _lastTrailFrameTime = 0;
                trailPoints = [];
                trailParticles = [];
                if (trailCtx && trailCanvas) trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                if (fxCtx && fxCanvas) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
                if (!_trailRAFRunning) restartTrailRAF();
            }
        });

        // Failsafe timer: periodically ensure stale trails are cleared on mobile
        setInterval(() => {
            if (!mouseBunnyEnabled || eggInkPersistMode) return;
            if (trailPoints.length > 0) return;
            const idle = performance.now() - lastMouseMoveTime;
            if (lastMouseMoveTime > 0 && idle > 3000) {
                // Trail should have faded by now — force clear if RAF stopped
                if (!_trailRAFRunning) {
                    if (trailCtx && trailCanvas) trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                    if (fxCtx && fxCanvas) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
                }
            }
        }, 2000);

        if (!_trailRAFRunning) {
            _trailRAFRunning = true;
            requestAnimationFrame(updateAndDrawTrail);
        }
    }
    function restartTrailRAF() {
        if (_trailRAFRunning) return;
        _trailRAFRunning = true;
        requestAnimationFrame(updateAndDrawTrail);
    }

    // --- Particle spawning per theme ---
    function spawnTrailParticles(x, y) {
        // Skip particle generation entirely in low-perf mode or if disabled
        if (_perfConfig.trailParticleCount === 0) return;
        // Limit total particle count
        if (trailParticles.length > _perfConfig.trailParticleCount * 2) return;
        const cfg = getTrailConfig();
        switch (cfg.style) {
            case 'lightsaber':
                if (Math.random() < 0.35) trailParticles.push({x, y, vx:(Math.random()-.5)*4, vy:(Math.random()-.5)*4, life:1, type:'spark', color:cfg.accent});
                // Signature: pixel cube — digital glitch aesthetic
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*1.5, vy:(Math.random()-.5)*1.5, life:1, type:'pixelCube', color:cfg.accent, rot:0, rotV:(Math.random()-.5)*.2, size:Math.random()*3+3});
                break;
            case 'magic':
                trailParticles.push({x:x+(Math.random()-.5)*12, y:y+(Math.random()-.5)*12, vx:(Math.random()-.5)*1.2, vy:-Math.random()*2-.5, life:1, type:'star', color:Math.random()<.5?cfg.accent:cfg.accent2, size:Math.random()*3+1.5});
                // Signature: crescent moon — dreamy night sky
                if (Math.random() < 0.1) trailParticles.push({x, y, vx:(Math.random()-.5)*.8, vy:-Math.random()*1-.3, life:1, type:'crescent', color:cfg.accent2, size:Math.random()*3+3});
                break;
            case 'flame':
                trailParticles.push({x:x+(Math.random()-.5)*8, y:y+(Math.random()-.5)*4, vx:(Math.random()-.5)*1, vy:-Math.random()*2-.5, life:1, type:'flame', color:Math.random()<.5?'#FFEB3B':'#FF6B35', size:Math.random()*4+2});
                // Signature: tiny sun — warm sunset glow
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*.5, vy:-Math.random()*1.5-.5, life:1, type:'sun', color:'#FFD700', size:Math.random()*3+3});
                break;
            case 'mintBubble':
                if (Math.random() < 0.3) trailParticles.push({x:x+(Math.random()-.5)*10, y:y+(Math.random()-.5)*10, vx:(Math.random()-.5)*.5, vy:-Math.random()*1.2-.3, life:1, type:'bubble', color:cfg.accent, size:Math.random()*4+2});
                // Signature: mint leaf — fresh and natural
                if (Math.random() < 0.1) trailParticles.push({x, y, vx:(Math.random()-.5)*.8, vy:-Math.random()*1-.2, life:1, type:'mintLeaf', color:cfg.accent, size:Math.random()*3+2, rot:Math.random()*6.28, rotV:(Math.random()-.5)*.1});
                break;
            case 'petal':
                if (Math.random() < 0.25) trailParticles.push({x, y, vx:(Math.random()-.5)*1.5, vy:Math.random()*.8+.3, life:1, type:'petal', color:Math.random()<.5?cfg.accent:cfg.accent2, rot:Math.random()*6.28, rotV:(Math.random()-.5)*.15, size:Math.random()*3+2});
                // Signature: butterfly — romantic fluttering
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*1.5, vy:-Math.random()*.8-.2, life:1, type:'butterfly', color:Math.random()<.5?cfg.accent:cfg.accent2, size:Math.random()*3+3, wing:Math.random()*6.28, wingV:.25});
                break;
            case 'ribbon':
                if (Math.random() < 0.15) trailParticles.push({x, y, vx:(Math.random()-.5)*1, vy:-Math.random()*1.2-.3, life:1, type:'heart', color:cfg.accent, size:Math.random()*4+3});
                // Signature: bunny footprint — cute bunny trail
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*.8, vy:-Math.random()*1-.2, life:1, type:'bunnyPrint', color:cfg.accent, size:Math.random()*3+3});
                break;
            case 'leaf':
                if (Math.random() < 0.22) trailParticles.push({x, y, vx:(Math.random()-.5)*1.5, vy:Math.random()*.8+.3, life:1, type:'leaf', color:Math.random()<.5?cfg.accent:cfg.accent2, rot:Math.random()*6.28, rotV:(Math.random()-.5)*.12, size:Math.random()*3+2});
                // Signature: acorn — forest treasure
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:0, vy:-Math.random()*.5-.1, life:1, type:'acorn', color:cfg.accent2, size:Math.random()*3+2});
                break;
            case 'wave':
                if (Math.random() < 0.25) trailParticles.push({x:x+(Math.random()-.5)*10, y:y+(Math.random()-.5)*10, vx:(Math.random()-.5)*.5, vy:-Math.random()*1.2-.2, life:1, type:'bubble', color:cfg.accent, size:Math.random()*4+2});
                // Signature: tiny fish — ocean swimmer
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*.5, life:1, type:'fish', color:Math.random()<.5?cfg.accent:cfg.accent2, size:Math.random()*3+3, facing:Math.random()<.5?1:-1});
                break;
            case 'aurora':
                if (Math.random() < 0.2) trailParticles.push({x:x+(Math.random()-.5)*15, y:y+(Math.random()-.5)*8, vx:(Math.random()-.5)*.3, vy:-Math.random()*.8-.2, life:1, type:'shimmer', color:`hsla(${(140+Math.random()*120)%360},80%,65%,1)`, size:Math.random()*3+1});
                // Signature: snowflake — arctic sparkle
                if (Math.random() < 0.1) trailParticles.push({x, y, vx:(Math.random()-.5)*.5, vy:Math.random()*.5+.1, life:1, type:'snowflake', color:'#E0F7FA', size:Math.random()*3+2, rot:0, rotV:(Math.random()-.5)*.05});
                break;
            case 'galaxy':
                if (Math.random() < 0.3) trailParticles.push({x:x+(Math.random()-.5)*12, y:y+(Math.random()-.5)*12, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, life:1, type:'twinkle', color:Math.random()<.5?cfg.accent:cfg.accent2, size:Math.random()*2+1, twinkle:Math.random()*6.28});
                // Signature: shooting star — cosmic wish
                if (Math.random() < 0.06) trailParticles.push({x, y, vx:Math.random()*3+1, vy:Math.random()*1+.5, life:1, type:'meteor', color:cfg.accent, size:Math.random()*2+1});
                break;
            case 'candy':
                if (Math.random() < 0.2) trailParticles.push({x:x+(Math.random()-.5)*8, y:y+(Math.random()-.5)*8, vx:(Math.random()-.5)*1, vy:-Math.random()*1-.3, life:1, type:'candy', color:[cfg.accent,cfg.accent2,'#FFD740','#FF80AB'][Math.floor(Math.random()*4)], size:Math.random()*3+2});
                // Signature: lollipop — sweet swirl
                if (Math.random() < 0.08) trailParticles.push({x, y, vx:(Math.random()-.5)*.5, vy:-Math.random()*.8-.2, life:1, type:'lollipop', color:[cfg.accent,cfg.accent2,'#FFD740'][Math.floor(Math.random()*3)], size:Math.random()*3+3, rot:0, rotV:(Math.random()-.5)*.15});
                break;
            case 'matrix':
                if (Math.random() < 0.15) trailParticles.push({x:x+(Math.random()-.5)*4, y:y, vx:0, vy:Math.random()*2+1, life:1, type:'code', color:cfg.accent, char:String.fromCharCode(0x30A0+Math.floor(Math.random()*96)), size:Math.random()*3+2});
                // Signature: binary digit — digital core
                if (Math.random() < 0.1) trailParticles.push({x, y, vx:0, vy:Math.random()*1.5+.5, life:1, type:'binary', color:cfg.accent, char:Math.random()<.5?'0':'1', size:Math.random()*3+2});
                break;
        }
    }

    // --- Smooth path drawing (from v5.2) ---
    function drawSmoothPath(ctx, pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i+1].x) / 2;
            const yc = (pts[i].y + pts[i+1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    }

    // --- Main trail update & draw loop ---
    let _trailRAFRunning = false;
    function updateAndDrawTrail() {
        if (!trailCtx || !fxCtx) { _trailRAFRunning = false; return; }
        // Skip all rendering when trail is disabled and no ink-persist mode — saves CPU/GPU
        if (!mouseBunnyEnabled && !eggInkPersistMode) {
            // Only clear once, then sleep until re-enabled
            if (trailPoints.length > 0 || trailParticles.length > 0) {
                fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
                trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                trailPoints = [];
                trailParticles = [];
            }
            _trailRAFRunning = false;
            return; // Stop the loop — restartTrailRAF() will resume when needed
        }
        const now = performance.now();
        const cfg = getTrailConfig();
        // Time-based fade: calculate delta from last frame for consistent fade across variable FPS
        const dt = _lastTrailFrameTime ? Math.min(50, now - _lastTrailFrameTime) : 16;
        _lastTrailFrameTime = now;
        // Failsafe: if no movement for 2s and not in egg mode, aggressively clear stale trail
        if (!eggInkPersistMode && lastMouseMoveTime > 0 && now - lastMouseMoveTime > 2000 && trailPoints.length === 0) {
            trailCtx.globalCompositeOperation = 'destination-out';
            trailCtx.fillStyle = 'rgba(0,0,0,0.3)';
            trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
            trailCtx.globalCompositeOperation = 'source-over';
            if (now - lastMouseMoveTime > 3500) {
                trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
                trailParticles = [];
                _trailRAFRunning = false;
                return;
            }
            _trailRAFRunning = true;
            requestAnimationFrame(updateAndDrawTrail);
            return;
        }
        try {
            // Fade trail canvas
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

            if (eggInkPersistMode) {
                // Ink persist mode: minimal fade, ink stays visible until user clicks "结束绘画"
                trailCtx.globalCompositeOperation = 'destination-out';
                trailCtx.fillStyle = 'rgba(0,0,0,0.005)';
                trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
                trailCtx.globalCompositeOperation = 'source-over';
                // In ink-persist mode, keep trail points longer (don't filter by TRAIL_LIFETIME)
                trailPoints = trailPoints.filter(p => now - p.t < 30000);
            } else {
                // Normal mode: time-based elegant fade (stronger on mobile for quicker cleanup)
                const fadeRate = _isMobile ? 0.02 : 0.012;
                const fadeAlpha = Math.min(0.5, fadeRate * (dt / 16));
                trailCtx.globalCompositeOperation = 'destination-out';
                trailCtx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
                trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
                trailCtx.globalCompositeOperation = 'source-over';
                // Remove old points
                trailPoints = trailPoints.filter(p => now - p.t < TRAIL_LIFETIME);
            }

            if (trailPoints.length >= 2 && mouseBunnyEnabled) {
                switch (cfg.style) {
                    case 'lightsaber': drawLightsaberTrail(cfg); break;
                    case 'magic':      drawMagicWhipTrail(cfg); break;
                    case 'flame':      drawFlameTrail(cfg); break;
                    case 'mintBubble': drawMintBubbleTrail(cfg); break;
                    case 'petal':      drawPetalTrail(cfg); break;
                    case 'ribbon':     drawRibbonTrail(cfg); break;
                    case 'leaf':       drawLeafTrail(cfg); break;
                    case 'wave':      drawWaveTrail(cfg); break;
                    case 'aurora':    drawAuroraTrail(cfg); break;
                    case 'galaxy':    drawGalaxyTrail(cfg); break;
                    case 'candy':     drawCandyTrail(cfg); break;
                    case 'matrix':    drawMatrixTrail(cfg); break;
                    default:           drawRibbonTrail(cfg); break;
                }
            }

            // Draw particles
            drawTrailParticles(cfg);

            // Draw pixel rabbit at the head (only in normal mode, not during ink persist or FAB drag)
            if (trailPoints.length > 0 && mouseBunnyEnabled && !eggInkPersistMode && !_isDraggingEggFab) {
                const head = trailPoints[trailPoints.length - 1];
                drawPixelRabbit(fxCtx, head.x, head.y, cfg.accent, 18);
            }
        } catch(e) {
            console.warn('[Trail] Render error, recovering:', e);
            trailPoints = [];
            trailParticles = [];
            try {
                if (trailCtx && trailCanvas) trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                if (fxCtx && fxCanvas) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
            } catch(e2) {}
        }
        _trailRAFRunning = true;
        requestAnimationFrame(updateAndDrawTrail);
    }

    // --- Individual theme draw functions (gorgeous v5.2 style) ---
    function drawLightsaberTrail(cfg) {
        const pts = trailPoints;
        trailCtx.shadowColor = cfg.accent;
        trailCtx.shadowBlur = cfg.glow;
        trailCtx.strokeStyle = cfg.accent;
        trailCtx.lineWidth = cfg.width;
        trailCtx.lineCap = 'round';
        trailCtx.lineJoin = 'round';
        drawSmoothPath(trailCtx, pts);
        trailCtx.stroke();
        // White core for lightsaber glow
        trailCtx.shadowBlur = 0;
        trailCtx.strokeStyle = '#ffffff';
        trailCtx.lineWidth = Math.max(1, cfg.width * 0.35);
        drawSmoothPath(trailCtx, pts);
        trailCtx.stroke();
    }

    function drawMagicWhipTrail(cfg) {
        const pts = trailPoints;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            trailCtx.shadowColor = cfg.accent;
            trailCtx.shadowBlur = cfg.glow * progress;
            trailCtx.strokeStyle = i % 2 === 0 ? cfg.accent : cfg.accent2;
            trailCtx.lineWidth = cfg.width * progress;
            trailCtx.lineCap = 'round';
            trailCtx.globalAlpha = progress;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y);
            trailCtx.lineTo(pts[i].x, pts[i].y);
            trailCtx.stroke();
        }
        trailCtx.globalAlpha = 1;
        trailCtx.shadowBlur = 0;
    }

    function drawFlameTrail(cfg) {
        const pts = trailPoints;
        for (let i = 0; i < pts.length; i++) {
            const progress = i / pts.length;
            const size = Math.max(1, cfg.width * progress * 1.5);
            const grad = trailCtx.createRadialGradient(pts[i].x, pts[i].y, 0, pts[i].x, pts[i].y, size);
            grad.addColorStop(0, '#FFEB3B');
            grad.addColorStop(0.5, '#FF6B35');
            grad.addColorStop(1, 'rgba(255,107,53,0)');
            trailCtx.fillStyle = grad;
            trailCtx.globalAlpha = progress * 0.8;
            trailCtx.beginPath();
            trailCtx.arc(pts[i].x, pts[i].y, size, 0, Math.PI * 2);
            trailCtx.fill();
        }
        trailCtx.globalAlpha = 1;
    }

    function drawMintBubbleTrail(cfg) {
        const pts = trailPoints;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            const size = Math.max(1, cfg.width * progress * (1 + Math.sin(i * 0.5 + Date.now() * 0.005) * 0.3));
            trailCtx.strokeStyle = cfg.accent;
            trailCtx.lineWidth = 1.5;
            trailCtx.globalAlpha = progress * 0.6;
            trailCtx.beginPath();
            trailCtx.arc(pts[i].x, pts[i].y, size, 0, Math.PI * 2);
            trailCtx.stroke();
            trailCtx.fillStyle = 'rgba(255,255,255,0.3)';
            trailCtx.beginPath();
            trailCtx.arc(pts[i].x - size * 0.3, pts[i].y - size * 0.3, size * 0.3, 0, Math.PI * 2);
            trailCtx.fill();
        }
        trailCtx.globalAlpha = 1;
    }

    function drawPetalTrail(cfg) {
        const pts = trailPoints;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            const size = Math.max(1, cfg.width * progress);
            trailCtx.fillStyle = i % 2 === 0 ? cfg.accent : cfg.accent2;
            trailCtx.globalAlpha = progress * 0.8;
            trailCtx.save();
            trailCtx.translate(pts[i].x, pts[i].y);
            trailCtx.rotate(i * 0.3 + Date.now() * 0.002);
            trailCtx.beginPath();
            trailCtx.ellipse(0, 0, size * 1.2, size * 0.6, 0, 0, Math.PI * 2);
            trailCtx.fill();
            trailCtx.restore();
        }
        trailCtx.globalAlpha = 1;
    }

    function drawRibbonTrail(cfg) {
        const pts = trailPoints;
        trailCtx.shadowColor = cfg.accent;
        trailCtx.shadowBlur = cfg.glow * 0.5;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            trailCtx.strokeStyle = cfg.accent;
            trailCtx.lineWidth = cfg.width * progress;
            trailCtx.lineCap = 'round';
            trailCtx.globalAlpha = progress * 0.8;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y);
            const mx = (pts[i-1].x + pts[i].x) / 2 + (Math.random()-.5) * 2;
            const my = (pts[i-1].y + pts[i].y) / 2 + (Math.random()-.5) * 2;
            trailCtx.quadraticCurveTo(mx, my, pts[i].x, pts[i].y);
            trailCtx.stroke();
        }
        trailCtx.globalAlpha = 1;
        trailCtx.shadowBlur = 0;
    }

    function drawLeafTrail(cfg) {
        const pts = trailPoints;
        trailCtx.shadowColor = cfg.accent;
        trailCtx.shadowBlur = cfg.glow * 0.5;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            trailCtx.strokeStyle = i % 3 === 0 ? cfg.accent2 : cfg.accent;
            trailCtx.lineWidth = cfg.width * progress * 0.8;
            trailCtx.lineCap = 'round';
            trailCtx.globalAlpha = progress * 0.7;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y);
            const mx = (pts[i-1].x + pts[i].x) / 2 + (Math.random()-.5) * 3;
            const my = (pts[i-1].y + pts[i].y) / 2 + (Math.random()-.5) * 3;
            trailCtx.quadraticCurveTo(mx, my, pts[i].x, pts[i].y);
            trailCtx.stroke();
        }
        trailCtx.globalAlpha = 1;
        trailCtx.shadowBlur = 0;
    }

    function drawWaveTrail(cfg) {
        const pts = trailPoints;
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            const wave = Math.sin(i * 0.5 + Date.now() * 0.01) * 4;
            trailCtx.shadowColor = cfg.accent;
            trailCtx.shadowBlur = cfg.glow * progress;
            trailCtx.strokeStyle = cfg.accent;
            trailCtx.lineWidth = cfg.width * progress;
            trailCtx.lineCap = 'round';
            trailCtx.globalAlpha = progress * 0.7;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y + wave);
            trailCtx.lineTo(pts[i].x, pts[i].y - wave);
            trailCtx.stroke();
            // Twin line for ripple effect
            trailCtx.strokeStyle = cfg.accent2;
            trailCtx.lineWidth = cfg.width * progress * 0.5;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y - wave);
            trailCtx.lineTo(pts[i].x, pts[i].y + wave);
            trailCtx.stroke();
        }
        trailCtx.globalAlpha = 1;
        trailCtx.shadowBlur = 0;
    }

    // --- New v9306 trail themes (performance-optimized) ---
    function drawAuroraTrail(cfg) {
        const pts = trailPoints;
        if (pts.length < 2) return;
        const now = Date.now() * 0.002;
        // Multi-layer gradient stroke for aurora effect
        for (let layer = 0; layer < 3; layer++) {
            const hueShift = layer * 60;
            const alpha = 0.3 - layer * 0.08;
            trailCtx.strokeStyle = `hsla(${(140 + hueShift + now * 30) % 360}, 80%, 60%, ${alpha})`;
            trailCtx.shadowColor = `hsla(${(140 + hueShift + now * 30) % 360}, 80%, 60%, 0.5)`;
            trailCtx.shadowBlur = cfg.glow * (1 - layer * 0.2);
            trailCtx.lineWidth = cfg.width * (1 + layer * 0.5);
            trailCtx.lineCap = 'round';
            trailCtx.lineJoin = 'round';
            const wobble = layer * 3;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[0].x, pts[0].y + Math.sin(now + 0) * wobble);
            for (let i = 1; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i+1].x) / 2;
                const yc = (pts[i].y + pts[i+1].y) / 2 + Math.sin(now + i * 0.3) * wobble;
                trailCtx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            trailCtx.stroke();
        }
        trailCtx.shadowBlur = 0;
    }
    function drawGalaxyTrail(cfg) {
        const pts = trailPoints;
        if (pts.length < 2) return;
        // Spiral gradient stroke
        const grad = trailCtx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length-1].x, pts[pts.length-1].y);
        grad.addColorStop(0, cfg.accent + '00');
        grad.addColorStop(0.5, cfg.accent);
        grad.addColorStop(1, cfg.accent2);
        trailCtx.strokeStyle = grad;
        trailCtx.shadowColor = cfg.accent;
        trailCtx.shadowBlur = cfg.glow;
        trailCtx.lineWidth = cfg.width;
        trailCtx.lineCap = 'round';
        trailCtx.lineJoin = 'round';
        drawSmoothPath(trailCtx, pts);
        trailCtx.stroke();
        // Bright core
        trailCtx.shadowBlur = 0;
        trailCtx.strokeStyle = '#ffffff';
        trailCtx.lineWidth = Math.max(1, cfg.width * 0.3);
        trailCtx.globalAlpha = 0.6;
        drawSmoothPath(trailCtx, pts);
        trailCtx.stroke();
        trailCtx.globalAlpha = 1;
    }
    function drawCandyTrail(cfg) {
        const pts = trailPoints;
        if (pts.length < 2) return;
        // Alternating color segments
        const colors = [cfg.accent, cfg.accent2, '#FFD740', '#FF80AB'];
        for (let i = 1; i < pts.length; i++) {
            const progress = i / pts.length;
            trailCtx.strokeStyle = colors[i % colors.length];
            trailCtx.shadowColor = colors[i % colors.length];
            trailCtx.shadowBlur = cfg.glow * progress;
            trailCtx.lineWidth = cfg.width * progress;
            trailCtx.lineCap = 'round';
            trailCtx.globalAlpha = progress * 0.8;
            trailCtx.beginPath();
            trailCtx.moveTo(pts[i-1].x, pts[i-1].y);
            trailCtx.lineTo(pts[i].x, pts[i].y);
            trailCtx.stroke();
        }
        trailCtx.globalAlpha = 1;
        trailCtx.shadowBlur = 0;
    }
    function drawMatrixTrail(cfg) {
        const pts = trailPoints;
        if (pts.length < 2) return;
        // Digital rain: vertical falling segments
        trailCtx.strokeStyle = cfg.accent;
        trailCtx.shadowColor = cfg.accent;
        trailCtx.shadowBlur = cfg.glow;
        trailCtx.lineWidth = cfg.width;
        trailCtx.lineCap = 'round';
        trailCtx.lineJoin = 'round';
        drawSmoothPath(trailCtx, pts);
        trailCtx.stroke();
        // Glitch: occasional offset segments
        trailCtx.shadowBlur = 0;
        trailCtx.strokeStyle = cfg.accent + '60';
        trailCtx.lineWidth = Math.max(1, cfg.width * 0.5);
        for (let i = 0; i < pts.length; i += 3) {
            if (Math.random() < 0.3) {
                trailCtx.fillRect(pts[i].x - 1, pts[i].y, 2, 4 + Math.random() * 6);
            }
        }
    }
    function drawTrailParticles(cfg) {
        trailParticles = trailParticles.filter(p => {
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            if (p.type === 'star')   { p.vy -= 0.02; p.vx *= 0.99; }
            if (p.type === 'leaf')   { p.rot += p.rotV; p.vy += 0.02; }
            if (p.type === 'petal')  { p.rot += p.rotV; p.vy += 0.015; }
            if (p.type === 'bubble') { p.vy -= 0.01; }
            if (p.type === 'spark')  { p.vy += 0.1; p.vx *= 0.95; }
            if (p.type === 'flame')  { p.vy -= 0.03; p.vx *= 0.97; }
            if (p.type === 'heart')  { p.vy -= 0.01; }
            if (p.type === 'shimmer') { p.vy -= 0.005; p.vx *= 0.98; }
            if (p.type === 'twinkle') { p.twinkle += 0.15; p.vx *= 0.97; p.vy *= 0.97; }
            if (p.type === 'candy')  { p.vy += 0.02; p.vx *= 0.98; }
            if (p.type === 'code')   { p.vy += 0.05; }
            // Signature particle physics
            if (p.type === 'pixelCube') { p.rot += p.rotV; p.vx *= 0.97; p.vy *= 0.97; }
            if (p.type === 'crescent')  { p.vy -= 0.008; p.vx *= 0.99; }
            if (p.type === 'sun')       { p.vy -= 0.01; p.vx *= 0.98; }
            if (p.type === 'mintLeaf')  { p.rot += p.rotV; p.vy -= 0.005; p.vx *= 0.99; }
            if (p.type === 'butterfly') { p.wing += p.wingV; p.vy += Math.sin(p.wing * 2) * 0.03; p.vx *= 0.98; }
            if (p.type === 'bunnyPrint'){ p.vy += 0.02; p.vx *= 0.98; }
            if (p.type === 'acorn')     { p.vy += 0.03; p.vx *= 0.98; }
            if (p.type === 'fish')      { p.vx *= 0.99; }
            if (p.type === 'snowflake') { p.rot += p.rotV; p.vy += 0.005; p.vx *= 0.99; }
            if (p.type === 'meteor')    { p.vx *= 0.98; p.vy *= 0.98; }
            if (p.type === 'lollipop')  { p.rot += p.rotV; p.vy += 0.01; p.vx *= 0.98; }
            if (p.type === 'binary')    { p.vy += 0.03; }
            return p.life > 0;
        });
        trailParticles.forEach(p => {
            fxCtx.globalAlpha = p.life;
            if (p.type === 'star') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                const sz = p.size || 2;
                fxCtx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (i * Math.PI) / 2;
                    const x1 = p.x + Math.cos(a) * sz;
                    const y1 = p.y + Math.sin(a) * sz;
                    const x2 = p.x + Math.cos(a + 0.785) * sz * 0.3;
                    const y2 = p.y + Math.sin(a + 0.785) * sz * 0.3;
                    if (i === 0) fxCtx.moveTo(x1, y1); else fxCtx.lineTo(x1, y1);
                    fxCtx.lineTo(x2, y2);
                }
                fxCtx.closePath();
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'heart') {
                fxCtx.fillStyle = p.color;
                const s = (p.size || 3) / 5;
                fxCtx.beginPath();
                fxCtx.moveTo(p.x, p.y + s);
                fxCtx.bezierCurveTo(p.x, p.y, p.x - s*2, p.y, p.x - s*2, p.y - s*2);
                fxCtx.bezierCurveTo(p.x - s*2, p.y - s*4, p.x, p.y - s*4, p.x, p.y - s*2);
                fxCtx.bezierCurveTo(p.x, p.y - s*4, p.x + s*2, p.y - s*4, p.x + s*2, p.y - s*2);
                fxCtx.bezierCurveTo(p.x + s*2, p.y, p.x, p.y, p.x, p.y + s);
                fxCtx.fill();
            } else if (p.type === 'leaf' || p.type === 'petal') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot || 0);
                fxCtx.fillStyle = p.color;
                fxCtx.beginPath();
                fxCtx.ellipse(0, 0, (p.size || 2), (p.size || 2) * 0.5, 0, 0, Math.PI*2);
                fxCtx.fill();
                fxCtx.restore();
            } else if (p.type === 'bubble') {
                fxCtx.strokeStyle = p.color;
                fxCtx.lineWidth = 1.5;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, (p.size || 2), 0, Math.PI*2);
                fxCtx.stroke();
            } else if (p.type === 'spark') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 8;
                fxCtx.fillRect(p.x-1, p.y-1, 2, 2);
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'flame') {
                const grad = fxCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, (p.size || 2));
                grad.addColorStop(0, '#FFEB3B');
                grad.addColorStop(0.5, '#FF6B35');
                grad.addColorStop(1, 'rgba(255,107,53,0)');
                fxCtx.fillStyle = grad;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, (p.size || 2), 0, Math.PI*2);
                fxCtx.fill();
            } else if (p.type === 'shimmer') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 8;
                fxCtx.globalAlpha = p.life * 0.7;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, (p.size || 1.5), 0, Math.PI*2);
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'twinkle') {
                const tw = Math.abs(Math.sin(p.twinkle || 0));
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6 * tw;
                fxCtx.globalAlpha = p.life * tw;
                const sz = (p.size || 1.5) * (0.5 + tw * 0.5);
                // Draw 4-point star
                fxCtx.beginPath();
                fxCtx.moveTo(p.x, p.y - sz);
                fxCtx.lineTo(p.x + sz*0.3, p.y - sz*0.3);
                fxCtx.lineTo(p.x + sz, p.y);
                fxCtx.lineTo(p.x + sz*0.3, p.y + sz*0.3);
                fxCtx.lineTo(p.x, p.y + sz);
                fxCtx.lineTo(p.x - sz*0.3, p.y + sz*0.3);
                fxCtx.lineTo(p.x - sz, p.y);
                fxCtx.lineTo(p.x - sz*0.3, p.y - sz*0.3);
                fxCtx.closePath();
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'candy') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, (p.size || 2), 0, Math.PI*2);
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'code') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                fxCtx.font = `${(p.size || 2) * 3}px monospace`;
                fxCtx.fillText(p.char || '0', p.x, p.y);
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'pixelCube') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot || 0);
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                const s = p.size || 3;
                fxCtx.fillRect(-s, -s, s * 2, s * 2);
                fxCtx.fillStyle = 'rgba(255,255,255,0.35)';
                fxCtx.beginPath();
                fxCtx.moveTo(-s, -s);
                fxCtx.lineTo(-s + s * 0.5, -s - s * 0.5);
                fxCtx.lineTo(s + s * 0.5, -s - s * 0.5);
                fxCtx.lineTo(s, -s);
                fxCtx.closePath();
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'crescent') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 8;
                const s = p.size || 3;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, s, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.globalCompositeOperation = 'destination-out';
                fxCtx.beginPath();
                fxCtx.arc(p.x + s * 0.4, p.y - s * 0.2, s * 0.8, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.globalCompositeOperation = 'source-over';
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'sun') {
                const s = p.size || 3;
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 10;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, s, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.strokeStyle = p.color;
                fxCtx.lineWidth = 1;
                fxCtx.globalAlpha = p.life * 0.6;
                for (let r = 0; r < 8; r++) {
                    const a = (r * Math.PI) / 4;
                    fxCtx.beginPath();
                    fxCtx.moveTo(p.x + Math.cos(a) * s * 1.3, p.y + Math.sin(a) * s * 1.3);
                    fxCtx.lineTo(p.x + Math.cos(a) * s * 1.8, p.y + Math.sin(a) * s * 1.8);
                    fxCtx.stroke();
                }
                fxCtx.globalAlpha = p.life;
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'mintLeaf') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot || 0);
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                const s = p.size || 2;
                fxCtx.beginPath();
                fxCtx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.strokeStyle = 'rgba(255,255,255,0.4)';
                fxCtx.lineWidth = 0.5;
                fxCtx.beginPath();
                fxCtx.moveTo(-s, 0);
                fxCtx.lineTo(s, 0);
                fxCtx.stroke();
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'butterfly') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                const s = p.size || 3;
                const wingAngle = Math.sin(p.wing || 0) * 0.6;
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                fxCtx.save();
                fxCtx.rotate(-wingAngle);
                fxCtx.beginPath();
                fxCtx.ellipse(-s * 0.6, -s * 0.2, s * 0.7, s * 0.5, -0.3, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.beginPath();
                fxCtx.ellipse(-s * 0.5, s * 0.3, s * 0.5, s * 0.4, 0.3, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.restore();
                fxCtx.save();
                fxCtx.rotate(wingAngle);
                fxCtx.beginPath();
                fxCtx.ellipse(s * 0.6, -s * 0.2, s * 0.7, s * 0.5, 0.3, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.beginPath();
                fxCtx.ellipse(s * 0.5, s * 0.3, s * 0.5, s * 0.4, -0.3, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.restore();
                fxCtx.fillStyle = 'rgba(0,0,0,0.4)';
                fxCtx.fillRect(-0.5, -s * 0.5, 1, s);
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'bunnyPrint') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                const s = p.size || 3;
                fxCtx.beginPath();
                fxCtx.ellipse(p.x, p.y + s * 0.3, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
                fxCtx.fill();
                for (let t = -1; t <= 1; t++) {
                    fxCtx.beginPath();
                    fxCtx.ellipse(p.x + t * s * 0.35, p.y - s * 0.2, s * 0.18, s * 0.25, 0, 0, Math.PI * 2);
                    fxCtx.fill();
                }
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'acorn') {
                const s = p.size || 2;
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, s, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.fillStyle = 'rgba(101,67,33,0.6)';
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y - s * 0.3, s * 0.8, Math.PI, 0);
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'fish') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.scale(p.facing || 1, 1);
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                const s = p.size || 3;
                fxCtx.beginPath();
                fxCtx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.beginPath();
                fxCtx.moveTo(-s, 0);
                fxCtx.lineTo(-s * 1.5, -s * 0.4);
                fxCtx.lineTo(-s * 1.5, s * 0.4);
                fxCtx.closePath();
                fxCtx.fill();
                fxCtx.fillStyle = 'rgba(255,255,255,0.8)';
                fxCtx.beginPath();
                fxCtx.arc(s * 0.4, -s * 0.1, s * 0.15, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'snowflake') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot || 0);
                fxCtx.strokeStyle = p.color;
                fxCtx.lineWidth = 1;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 4;
                const s = p.size || 2;
                fxCtx.globalAlpha = p.life * 0.8;
                for (let r = 0; r < 6; r++) {
                    const a = (r * Math.PI) / 3;
                    fxCtx.beginPath();
                    fxCtx.moveTo(0, 0);
                    fxCtx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                    fxCtx.stroke();
                    fxCtx.beginPath();
                    fxCtx.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
                    fxCtx.lineTo(Math.cos(a) * s * 0.5 + Math.cos(a + 0.5) * s * 0.3, Math.sin(a) * s * 0.5 + Math.sin(a + 0.5) * s * 0.3);
                    fxCtx.stroke();
                }
                fxCtx.globalAlpha = p.life;
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'meteor') {
                const s = p.size || 1;
                const tailLen = 8;
                const grad = fxCtx.createLinearGradient(p.x - p.vx * tailLen, p.y - p.vy * tailLen, p.x, p.y);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(1, p.color);
                fxCtx.strokeStyle = grad;
                fxCtx.lineWidth = s;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                fxCtx.beginPath();
                fxCtx.moveTo(p.x - p.vx * tailLen, p.y - p.vy * tailLen);
                fxCtx.lineTo(p.x, p.y);
                fxCtx.stroke();
                fxCtx.fillStyle = '#ffffff';
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, s, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.shadowBlur = 0;
            } else if (p.type === 'lollipop') {
                fxCtx.save();
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot || 0);
                const s = p.size || 3;
                fxCtx.strokeStyle = 'rgba(255,255,255,0.6)';
                fxCtx.lineWidth = 1;
                fxCtx.beginPath();
                fxCtx.moveTo(0, s);
                fxCtx.lineTo(0, s * 2);
                fxCtx.stroke();
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                fxCtx.beginPath();
                fxCtx.arc(0, 0, s, 0, Math.PI * 2);
                fxCtx.fill();
                fxCtx.strokeStyle = 'rgba(255,255,255,0.5)';
                fxCtx.lineWidth = 0.8;
                fxCtx.beginPath();
                for (let a = 0; a < Math.PI * 4; a += 0.2) {
                    const r = (a / (Math.PI * 4)) * s * 0.8;
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r;
                    if (a === 0) fxCtx.moveTo(x, y); else fxCtx.lineTo(x, y);
                }
                fxCtx.stroke();
                fxCtx.shadowBlur = 0;
                fxCtx.restore();
            } else if (p.type === 'binary') {
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 6;
                fxCtx.font = `${(p.size || 2) * 3}px monospace`;
                fxCtx.fillText(p.char || '0', p.x, p.y);
                fxCtx.shadowBlur = 0;
            }
        });
        fxCtx.globalAlpha = 1;
    }

    function drawPixelRabbit(ctx, x, y, color, size) {
        const pxSize = size / 10;
        const offsetX = x - size / 2;
        const offsetY = y - size / 2 - size * 0.4;
        ctx.save();
        for (let row = 0; row < RABBIT_PIXELS.length; row++) {
            for (let col = 0; col < RABBIT_PIXELS[row].length; col++) {
                const val = RABBIT_PIXELS[row][col];
                if (val === 0) continue;
                ctx.fillStyle = val === 2 ? 'rgba(0,0,0,0.8)' : color;
                ctx.fillRect(
                    Math.floor(offsetX + col * pxSize),
                    Math.floor(offsetY + row * pxSize),
                    Math.ceil(pxSize + 0.5),
                    Math.ceil(pxSize + 0.5)
                );
            }
        }
        ctx.restore();
    }

    /* ==================== PWA ==================== */
    let _deferredPrompt = null;

    function initPWA() {
        if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
            navigator.serviceWorker.register('./service-worker.js').catch(() => {});
            // Listen for SW updates and force reload to clear stale cache
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    console.log('Service Worker updated to', event.data.version);
                    // Non-intrusive update: show clean toast instead of freezing page on blank reload
                    if (window.showToast) {
                        showToast(`✓ 已在后台静默就绪 (${event.data.version})，再次打开即为最新版`);
                    }
                }
            });
            // Handle controller change (new SW took over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed');
            });
        }

        // === BeforeInstallPrompt — custom install banner ===
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            _deferredPrompt = e;
            // Show banner only if not previously dismissed and not already installed
            const dismissed = safeGetItem('pwa_install_dismissed', '');
            const standalone = isStandaloneMode();
            if (!dismissed && !standalone) {
                const banner = document.getElementById('pwa-install-banner');
                if (banner) {
                    banner.style.display = 'flex';
                    banner.style.animation = 'slideUp .4s ease';
                }
            }
        });

        // Detect if already installed (PWA mode)
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.style.display = 'none';
            _deferredPrompt = null;
        });

        // === Offline / Online indicator ===
        const offlineEl = document.getElementById('offline-indicator');
        function updateOnlineStatus() {
            if (!offlineEl) return;
            if (navigator.onLine) {
                offlineEl.style.transform = 'translateY(-100%)';
            } else {
                offlineEl.style.transform = 'translateY(0)';
            }
        }
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        // === Push Notification subscription ===
        initPushNotifications();
    }

    async function installPWA() {
        // Check if already in standalone mode (PWA already installed)
        const standalone = isStandaloneMode();
        if (standalone) {
            monoLog('🐰 应用已在 PWA 模式下运行', 'success');
            return;
        }

        // If beforeinstallprompt is supported (Chrome/Edge on Android & Desktop)
        if (_deferredPrompt) {
            _deferredPrompt.prompt();
            const { outcome } = await _deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted PWA install');
            }
            _deferredPrompt = null;
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.style.display = 'none';
            return;
        }

        // Fallback: show platform-specific install instructions
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

        let instructions = '';
        if (isIOS) {
            instructions = `
                <div style="text-align:left;line-height:2;font-size:.85rem;">
                    <p style="color:var(--text2,#888);margin-bottom:.8rem;">iOS Safari 不支持自动安装，请按以下步骤手动添加：</p>
                    <div style="background:var(--bg,#f5f5f5);border-radius:8px;padding:1rem;margin-bottom:.8rem;">
                        <p style="margin:0 0 .5rem;"><strong>步骤 1</strong> — 点击 Safari 底部的 <span style="display:inline-block;background:var(--accent,#FF6B9D);color:#fff;padding:.1rem .4rem;border-radius:4px;font-size:.8rem;">分享 ↗</span> 按钮</p>
                        <p style="margin:0 0 .5rem;"><strong>步骤 2</strong> — 在弹出菜单中找到 <strong>「添加到主屏幕」</strong></p>
                        <p style="margin:0;"><strong>步骤 3</strong> — 点击 <strong>「添加」</strong> 完成安装</p>
                    </div>
                    <p style="color:var(--text2,#888);font-size:.75rem;">💡 安装后从主屏幕图标启动即可获得全屏 PWA 体验</p>
                </div>`;
        } else if (isAndroid) {
            instructions = `
                <div style="text-align:left;line-height:2;font-size:.85rem;">
                    <p style="color:var(--text2,#888);margin-bottom:.8rem;">Android 浏览器手动安装步骤：</p>
                    <div style="background:var(--bg,#f5f5f5);border-radius:8px;padding:1rem;margin-bottom:.8rem;">
                        <p style="margin:0 0 .5rem;"><strong>Chrome：</strong>点击右上角 <span style="font-size:1.1rem;">⋮</span> 菜单 → <strong>「添加到主屏幕」</strong> 或 <strong>「安装应用」</strong></p>
                        <p style="margin:0;"><strong>其他浏览器：</strong>在菜单中找到「添加到主屏幕」选项</p>
                    </div>
                    <p style="color:var(--text2,#888);font-size:.75rem;">💡 建议使用 Chrome 浏览器以获得最佳 PWA 体验</p>
                </div>`;
        } else if (isMacSafari) {
            instructions = `
                <div style="text-align:left;line-height:2;font-size:.85rem;">
                    <p style="color:var(--text2,#888);margin-bottom:.8rem;">macOS Safari 手动安装步骤：</p>
                    <div style="background:var(--bg,#f5f5f5);border-radius:8px;padding:1rem;margin-bottom:.8rem;">
                        <p style="margin:0 0 .5rem;"><strong>步骤 1</strong> — 点击菜单栏 <strong>「文件」</strong></p>
                        <p style="margin:0 0 .5rem;"><strong>步骤 2</strong> — 选择 <strong>「添加到程序坞」</strong></p>
                        <p style="margin:0;"><strong>步骤 3</strong> — 点击 <strong>「添加」</strong> 完成安装</p>
                    </div>
                    <p style="color:var(--text2,#888);font-size:.75rem;">💡 也可使用 Chrome/Edge 地址栏右侧的安装图标快速安装</p>
                </div>`;
        } else {
            instructions = `
                <div style="text-align:left;line-height:2;font-size:.85rem;">
                    <p style="color:var(--text2,#888);margin-bottom:.8rem;">桌面浏览器手动安装步骤：</p>
                    <div style="background:var(--bg,#f5f5f5);border-radius:8px;padding:1rem;margin-bottom:.8rem;">
                        <p style="margin:0 0 .5rem;"><strong>Chrome/Edge：</strong>点击地址栏右侧的 <span style="font-size:1.1rem;">⊕</span> 安装图标</p>
                        <p style="margin:0;"><strong>Firefox：</strong>不支持 PWA 安装，建议使用 Chrome 或 Edge</p>
                    </div>
                </div>`;
        }

        const modalHtml = `
            <div class="modal-drag-handle" style="margin:0 auto .8rem;"></div>
            <h3 style="margin:0 0 1rem;text-align:center;">📲 安装兔可可王国</h3>
            ${instructions}
            <div style="display:flex;gap:.5rem;margin-top:1rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="closeModal()">关闭</button>
            </div>`;
        showModalContent(modalHtml);

        // Also dismiss the banner
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
    }

    function dismissPWAInstall() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        safeSetItem('pwa_install_dismissed', Date.now().toString());
    }

    async function initPushNotifications() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        // Request permission lazily — only when user interacts (not on load)
        // Permission will be requested when user opts in via settings
    }

    function updateNotifyBtn() {
        const btn = document.getElementById('notify-toggle-btn');
        if (!btn) return;
        if (!('Notification' in window)) {
            btn.textContent = '不支持';
            btn.disabled = true;
            return;
        }
        if (Notification.permission === 'granted') {
            btn.textContent = '✅ 已开启';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        } else if (Notification.permission === 'denied') {
            btn.textContent = '❌ 已屏蔽';
            btn.disabled = true;
        } else {
            btn.textContent = '开启';
            btn.disabled = false;
        }
    }

    async function subscribePushNotifications() {
        if (!('Notification' in window)) {
            monoLog('当前浏览器不支持通知', 'error');
            return;
        }
        if (Notification.permission === 'granted') {
            monoLog('通知已开启', 'success');
            updateNotifyBtn();
            return;
        }
        if (Notification.permission === 'denied') {
            monoLog('通知已被浏览器屏蔽，请在设置中手动开启', 'error');
            return;
        }
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            monoLog('✅ 通知已开启，将在重要事件时提醒你', 'success');
            updateNotifyBtn();
            // Send a test notification
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg.showNotification) {
                    reg.showNotification('🐰 兔可可王国', {
                        body: '通知已开启！将在回合轮到你时提醒',
                        icon: './icon/192.png',
                        badge: './icon/96.png',
                        tag: 'bunny-cc-notify',
                    });
                } else {
                    new Notification('🐰 兔可可王国', {
                        body: '通知已开启！将在回合轮到你时提醒',
                        icon: './icon/192.png',
                    });
                }
            } catch(e) { console.warn('Notification error:', e); }
        } else {
            monoLog('通知未开启', 'info');
        }
    }

    /* Notify player when it's their turn (if permission granted) */
    function notifyMyTurn() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            const reg = navigator.serviceWorker.controller;
            if (reg && 'showNotification' in window) {
                navigator.serviceWorker.ready.then(swReg => {
                    swReg.showNotification('🐰 轮到你了！', {
                        body: '兔可可王国 — 你的回合开始了',
                        icon: './icon/192.png',
                        badge: './icon/96.png',
                        tag: 'bunny-cc-turn',
                        vibrate: [200, 100, 200],
                    });
                }).catch(() => {});
            }
        } catch(e) {}
    }

    /* ==================== Changelog ==================== */
    const CHANGELOG = [
        { ver:'v7.8.6.9482', title:'index.html 模块化重构：18 JS + 6 CSS 独立模块、圆角矩形屏适配、PWA 强制刷新', items:[
            '【此改动适用于 index.html】[新增] 模块化架构：1.5MB 单文件 index.html 拆分为 18 个 JS 模块与 6 个 CSS 模块 —— js/core.js（核心/配置/状态）、js/renderer.js（渲染模块）、js/game-logic-a/b/c.js（游戏逻辑）、js/ui.js（UI 模块）、js/icons.js（图标模块）、js/wallpaper.js（壁纸管理模块）、js/os.js/os-apps-a/b/c.js（系统应用）等，CSS 拆分为 css/base.css / ui.css / effects.css / car-lockscreen-a/b.css，附 MODULES.md 模块说明文档，可维护性质变',
            '【此改动适用于 index.html】[新增] 圆角矩形屏适配模块：新增 css/rounded-screen.css 与 js/screen.js，通过 ?rounded=1 参数或 localStorage 开关启用，为车机中控异形屏提供四角遮罩、侧边栏/任务栏安全内收与弹窗留边；默认零侵入，普通矩形屏无任何视觉变化',
            '【此改动适用于 index.html】[优化] 车机锁屏样式由运行时 JS 注入改为 <link> 预加载：原 _bcosInjectCSS() 157KB 样式字符串改为空实现（保留函数名兼容两处历史调用），样式提前至页面解析阶段生效，消除首屏样式闪烁，行为等价',
            '【此改动适用于 index.html】[优化] 壁纸静态数据分离：34KB 模糊占位图、37.5KB 锁屏 HTML 模板、12.8KB 内置壁纸列表移入 js/wallpaper-data.js 独立加载，主逻辑文件瘦身，缓存粒度更细，离线可用性不变',
            '【此改动适用于 index.html】[PWA 强制刷新] Service Worker 缓存升级至 v7.8.6.9482，预缓存全部 24 个新模块，旧版本缓存强制清理，离线客户端自动更新'
        ]},
        { ver:'v7.8.4.9430', title:'壁纸边缘RGB提取与毛玻璃底色融合、右键菜单防退出全屏、顶栏兔可可头像/Emoji、纪念日与应用商店及Code Studio重构', items:[
            '【此改动适用于 index.html / car.html / car.css】[壁纸边缘RGB提取与智能光晕融合] 优化壁纸预处理算法（optimize_wallpapers.py），在生成壁纸元数据时精准提取上下左右四周 8% 边框像素均值及主色 RGB，写入 manifest.json 与 BUILTIN_WALLPAPERS。在「适应屏幕 (Fit to Screen)」及居中模式下，毛玻璃衬底动态注入 --wp-edge-dominant / --wp-edge-top / bottom / left / right 渐变光晕，彻底消除黑边空隙与割裂感；用户本地上传壁纸亦通过 Canvas 自动提取。',
            '【此改动适用于 index.html / car.html】[重构右键菜单与全屏防退出修复] 根除点击右键菜单项及快捷功能时意外退出全屏的浏览器默认行为；移除 closeBcosOS 中强制 exitFullscreen 的限制；在右键菜单中加入实时全屏状态感知徽章与精准切换；彻底消除 window.prompt/alert 对全屏状态的打断。',
            '【此改动适用于 index.html】[macOS 顶栏图标个性化切换] 将顶栏苹果标志升级为多模态标志：支持切换为兔可可高清头像写真（圆角光晕）、可爱萌兔专属 Emoji (🐰) 或经典 Apple 标志 ()；支持顶栏右键快速轮换或在系统菜单中随心挑选。',
            '【此改动适用于 index.html】[重构 BCOS 兔可可纪念日应用] 全面升级为现代 macOS 卡片风格：拥有超大渐变天数计数器、实时毫秒流转时钟、历程里程碑成就树与进度条；添加自定义纪念日全面升级为应用内半透明毛玻璃模态弹窗，杜绝原生 prompt，并支持日期与 Emoji 快速选择。',
            '【此改动适用于 index.html】[新增 BCOS 官方应用商店与工坊] 推出全新 macOS 风格应用商店：涵盖精选推荐、效率工具、娱乐游戏、已安装管理与自定义应用工坊；支持动画进度条模拟下载安装、自动同步生成桌面图标与 Dock 快捷方式；首批上线科学计算器、座舱天气看板、桌面便利贴、兔兔电台 Lo-Fi 白噪音合成器、复古贪吃蛇大冒险、像素画板 Studio；工坊支持单文件 HTML/JS 应用本地预处理与沙盒隔离运行。',
            '【此改动适用于 index.html】[重构 BCOS 文本编辑器为 Code Studio Pro] 升级为专业级开发与写作工作台：支持多标签页并行编辑（带未保存指示）、行号代码槽（Gutter）、多语言语法高亮（JS/TS/HTML/CSS/JSON/Markdown/Python/Shell）、Markdown 实时双栏分栏预览、代码自动排版与格式化、查找/替换工具栏、文件导入/导出至本地电脑。'
        ]},
        { ver:'v7.8.4.9420', title:'BCOS macOS 桌面重构、响应式窗体自适应、移动端触屏流畅滑动、壁纸毛玻璃全景衬底与车机防抽搐重构', items:[
            '【此改动适用于 index.html / car.html / car.css】[BCOS macOS 桌面质感重构] 全面废弃 Windows 风格任务栏，重构为现代 macOS 桌面体系：包含顶部半透明毛玻璃菜单栏（.bcos-menubar）、原生 Apple  菜单下拉面板、底部浮动毛玻璃 Dock 栏（应用呼吸悬停放大、运行状态指示光点）、窗口真实红黄绿三色交通灯控制系统（✕/−/+ 符号动效反馈）及自适应窗口布局。',
            '【此改动适用于 index.html】[移动端设置触屏滑动与全场景响应式自适应] 修复移动端系统设置窗口无法触屏向下滑动的痛点：解除外层拖拽拦截，注入原生 -webkit-overflow-scrolling: touch 与 touch-action: pan-y 动量滚动体系，重构壁纸图库平铺流，设置项切换保存并平滑还原滚动条位置；全端窗口自动适配手机竖屏/横屏模式（卡片式满屏流）。',
            '【此改动适用于 index.html / car.html / car.css】[壁纸 Fit to Screen 智能毛玻璃全景衬底] 彻底根除「适应屏幕 (Fit to Screen)」及居中模式下不同尺寸壁纸因比例不匹配产生的突兀黑边/黑条：引入 .car-wallpaper-ambient 氛围模糊层（超高饱和度与深度毛玻璃弥散），与主体壁纸像素毫秒级联动，使画面四周柔和过渡，呈现浑然一体的座舱沉浸体验。',
            '【此改动适用于 index.html】[车机锁屏切换壁纸与设置防抽搐重构] 彻底根除 BCOS 锁屏下切换壁纸或设置时引起的剧烈抖动与抖搐现象：定位并消除全局 Toast 与 ResizeObserver 循环触发回流振荡链条，增加几何状态防抖锁存，优化关闭模态框无损流，实现与 car.html 一致的极致丝滑性能。',
            '【此改动适用于 index.html】[关于界面链接重定向] 将 BCOS 关于界面与各处外部链接规范重定向至专属开源仓库：https://github.com/kissggj123/Bunny-Cockpit-OS。'
        ]},
        { ver:'v7.8.4.9410', title:'车机锁屏壁纸多维自适应引擎 (Fill/Fit/Stretch/Center/Tile) & macOS 雾面浮层 Popover', items:[
            '【此改动适用于 index.html / car.html / car.css】[锁屏壁纸自适应比例引擎] 全面加入 5 种专业壁纸展示模式：① Fill Screen（充满屏幕 · 等比裁切铺满，默认推荐）② Fit to Screen（适应屏幕 · 等比缩放保留完整画幅，两侧/上下深黑自适应底色）③ Stretch to Fill Screen（拉伸充满屏幕 · 强制拉伸无黑边）④ Center（居中 · 原始1:1像素居中不拉伸）⑤ Tile（平铺 · 横向纵向阵列平铺，完美适配图案纹理与小图壁纸）',
            '【此改动适用于 index.html / car.html / car.css】[macOS 原生级半透明雾面玻璃 Popover] 打造与系统级桌面一致的浮动下拉弹窗体验：暗色超清透毛玻璃背景（blur 28px + 12px 圆角），当前选中项自带优雅勾选指示标记 ✓ 与 macOS 强调蓝高亮反馈；在壁纸管理弹窗与快捷控制中心全端同步，同时支持在锁屏背景右键唤出浮动上下文菜单与键盘 Escape 快捷闭合'
        ]},
        { ver:'v7.8.4.9409', title:'非全屏/小视口「累计航程」与时间对齐修复、微胶囊基线架构升级', items:[
            '【此改动适用于 index.html / car.html / car.css】[根除残留下边距偏移污染] 精准定位并修复在窗口非全屏（如笔记本浏览器窗口、带系统地址栏/标签页状态，视口高度触发 @media (max-height: 760px) 或紧凑横屏 <= 520px）时，历史遗留的 .car-hero-time { margin-bottom: .5rem; } 破坏 Flex 容器对齐的深层缺陷。将外边距正确归宿至父级行容器 .car-hero-time-row，彻底清空 .car-hero-time 自身的下外边距',
            '【此改动适用于 index.html / car.html / car.css】[高精度独立居中微胶囊架构] 重构 .car-hero-time-tag 为标准独立高度微胶囊（height: 20px; line-height: 20px; display: inline-flex; align-items: center; justify-content: center;），同时将 .car-hero-time 设置为 display: inline-flex; align-items: baseline;，毫秒小数 .car-ms-frac 完美嵌合基线，使「累计航程」胶囊与伴行流转时间在全屏、非全屏、任意视口高度下始终保持毫米级水平与垂直对齐'
        ]},
        { ver:'v7.8.4.9408', title:'历程里程碑折叠栏微交互重构、消除文本生硬与左侧弧形括号噪点', items:[
            '【此改动适用于 index.html / car.html / car.css】[已达成历程折叠栏重构] 彻底告别生硬突兀的文本「📜 已达成里程碑 (6项已折叠) ▾ 展开查看」，重构为精致科技座舱胶囊栏：采用成就金杯 🏆 徽标与「已达成历程」专属计数角标，右侧配备优雅的「展开回顾 ▾ / 收起 ▴」微交互动效；补齐全端 CSS 统一毛玻璃胶囊容器样式，消除未样式化裸露文本缺陷',
            '【此改动适用于 index.html / car.html / car.css】[消除左侧弧形括号与图标冗余] 根除当前进行中目标里程碑左边缘因圆角描边渲染异常产生的弧形括号「(」视觉噪点，采用 GPU 独立定位的纯平垂直发光指示条与 1px 全维全息边框；去除进行中徽章内部与左侧图标重复的 🎯 冗余，呈现极致清爽的座舱视觉体验'
        ]},
        { ver:'v7.8.4.9407', title:'纪念日主卡片 UI 重构美化、消除视觉冗余、航空级通透雾面毛玻璃质感升级', items:[
            '【此改动适用于 index.html / car.html / car.css】[纪念日主卡轻量通透雾面重构] 彻底告别原先厚重沉闷的高对比度纯黑底框与粗糙荧光外边框，全面采用 backdrop-filter: blur(28px) saturate(190%) 航空级超清透雾面毛玻璃材质，配合 inset 0 1px 0 顶部镜面高光棱线与柔和立体外阴影，组件完全融于车机动态壁纸，消除突兀感与块面割裂',
            '【此改动适用于 index.html / car.html / car.css】[消除信息冗余与多层嵌套黑框] 移除时钟下重复的时间感官堆叠，为毫秒计数新增精致胶囊角标「累计航程」；消除起始日期的双重标注，右侧仪表信息升级为伴舱心动节律监控 PULSE 与伴行状态；去除了卡片内里程碑容器与药丸徽章嵌套的多层厚黑底框，全维呈现现代轻盈科技质感',
            '【此改动适用于 index.html / car.html / car.css】[HUD达成率环表与脉冲信标精细化] 标题新增呼吸脉冲指示信标（.car-hero-beacon）；右侧环形仪表描边粗细由 7px 细化为 5.5px 优雅刻度环，居中标识升级为凝练的「达成率」，横竖屏全场景无缝自适应'
        ]},
        { ver:'v7.8.4.9406', title:'数字时钟字符间距与冒号留白优化、极简模式排版紧凑化美学升级', items:[
            '【此改动适用于 index.html / car.html / car.css】[数字时钟字符间距与冒号留白优化] 彻底消除数字时钟中冒号两侧过宽的空隙与字符间距过大的问题：将时钟文本字符串从带空格的 `${h} : ${m} : ${s}` 升级为标准且自然的 `${h}:${m}:${s}`，结合等宽字体的天然中置留白，消除等宽空格造成的单侧 1ch 巨大留白空白；同步收敛 CSS letter-spacing（极简模式由 3px 优化至 1.5px，标准模式由 2px 优化至 1px），视觉呈现紧凑凝练且极富科技工业感',
            '【此改动适用于 index.html / car.html / car.css】[极简锁屏微距排版精致化] 优化极简锁屏下时间与下方公历/农历日期的垂直边距（margin-top: clamp(0.4rem, 1.2vh, 0.85rem)），改善异形屏与圆形 OLED 下的字符排版，使锁屏时间与日期呈现浑然一体的现代仪表质感'
        ]},
        { ver:'v7.8.4.9405', title:'移动端下滑浏览修复、横竖屏瞬时响应式自适应、消除PWA头像与开机光晕抽搐、里程碑折叠与高亮', items:[
            '【此改动适用于 index.html / car.html / car.css】[移动端下滑看里程碑修复] 解除祖先节点 touch-action: none 导致的浏览手势抑制，全面重构手势拦截机制；移除了过度侵入性的 touchmove preventDefault，配合 overscroll-behavior: contain 原生动量平滑滚动，确保移动端上下滑动浏览里程碑流畅丝滑',
            '【此改动适用于 index.html / car.html / car.css】[横竖屏瞬时响应式自适应] 重构屏幕形态探测算法与响应式监听体系：修正手机横屏时误判超宽带状中控的问题，增加 orientationchange / screen.orientation / visualViewport 与多帧防抖校准机制；修复 max-width: 900px 媒体查询误伤横屏模式的缺陷，新增 @media (orientation: landscape) and (max-height: 520px) 紧凑横屏专属流式适配，横竖屏秒切布局瞬时无缝重绘',
            '【此改动适用于 index.html / car.html / car.css】[移动端PWA头像光晕防抽搐] 彻底根除 iOS/Android PWA 模式下伴舱头像光圈、开机动画 Logo 及滑块头像周围光晕发抖抖动抽搐现象：废除 mask-image 与 border-radius subpixel 亚像素计算冲突，开机光晕由耗性能的动态 box-shadow 改为 120fps GPU 硬件合成的 opacity/drop-shadow 呼吸动画，滑块轨道移除了强行 contain: paint 导致的阴影重绘剪裁，光晕如丝般静止纯净',
            '【此改动适用于 index.html / car.html】[历程里程碑折叠与当前进行中高亮] 里程碑组件全面升级美化与轻量化：默认自动智能高亮当前正在进行中的目标里程碑（青紫霓虹全息发光边框 + 🎯 进行中标线），已达成的历史里程碑默认智能折叠收起，仅占用极少屏幕高度；支持一键展开查看历史成就，大幅优化竖屏视觉占比与精致科技感'
        ]},
        { ver:'v7.8.4.9405', title:'座舱几何自适应引擎（MINI圆形OLED/贯穿超宽屏/曲面瀑布屏）、消除头像抽搐与重构智能布局算法', items:[
            '【此改动适用于 index.html / car.html / car.css】[智能座舱几何引擎] 全新重构 Smart Cockpit Display Geometry Engine，基于 ResizeObserver 与 RAF 智能纵横比感知，支持智能自动识别或手动中控选择（MINI 圆形 OLED 1:1、贯穿带状超宽屏 21:9+、标准横屏 16:9、垂直中控竖屏 9:16）',
            '【此改动适用于 index.html / car.html / car.css】[MINI Cooper 圆形 OLED 专属适配] 针对 MINI Cooper 240mm 圆形 OLED 屏幕及 1:1 异形屏打造内切安全圆（Inscribed Circle Safe Area），顶部胶囊栏向心内缩防物理圆框切断、仪表与时钟径向居中垂直对齐、智能隐去四角边缘次要徽章、底部滑块缩窄至 280px / 64vmin 规避圆弧底缘碰触，带来沉浸式中控圆盘视效',
            '【此改动适用于 index.html / car.html / car.css】[贯穿带状超宽屏三列全景] 针对 21:9~32:9 超长带状中控屏自动启用 3 列网格全景展开（左侧时钟与诊断、中间纪念日主卡与达成率环表、右侧伴行卡与里程碑时间轴），纵向高度紧凑，横向信息分布开阔均衡',
            '【此改动适用于 index.html / car.html / car.css】[曲面/瀑布屏防边缘死区] 引入 --car-curved-padding 智能安全边距，结合 env(safe-area-inset) 自动补偿双侧曲面屏与瀑布屏的大弧度边缘畸变与触控死区，防止边缘文字模糊或触控失灵',
            '【此改动适用于 index.html / car.html】[头像抽搐根治与硬件图层隔离] 彻底根除竖屏或特定 PWA 尺寸下头像照片圆圈抖动抽搐现象：采用 -webkit-mask-image 与 -webkit-radial-gradient 规避 overflow: hidden 在 subpixel 像素抖动重排计算，结合 contain: paint 隔离与 transform: translateZ(0) 独立硬件图层，实现极致丝滑的圆形抗锯齿呈现',
            '【此改动适用于 index.html / car.html】[中控菜单与设置同步] 在车机锁屏导航中心新增「🖥️ 屏幕形态自适应」快速切换菜单，支持动态保存至本地存储，并向 window 全局暴露 detectScreenGeometry() 与 setScreenGeometry() 接口'
        ]},
        { ver:'v7.8.3.9393', title:'纯净极简锁屏内置切换、消除锁屏抽搐抖动、移除非必要Tab栏、移动端GPU加速与BCOS运行日志深度集成', items:[
            '【此改动适用于 index.html / car.html】[极简锁屏] 废除独立 clean.html，极简锁屏模式作为原生能力内置于 index.html 和 car.html 中，保留顶部胶囊状态栏与底部解锁滑块，隐去中央繁琐仪表与右侧面板，数字时钟与日期农历优雅浮空呈现，去除外层毛玻璃边框，支持中控设置、顶部徽章、双击时钟/触屏双击随时随地秒切',
            '【此改动适用于 index.html / car.html】[消抖除错] 彻底消除锁屏抽搐抖动（Zero-Jitter）：OLED 防烧屏微位移与底部滑块拖拽全面升级为 GPU 硬件级变换（translate3d / translateZ(0) / will-change），极简模式短路跳过隐藏组件 30ms 高频重排，壁纸加载失败增加本地 Base64 降级防闪烁',
            '【此改动适用于 index.html / car.html】[硬件加速] 启用移动端 CPU/GPU 硬件加速与渲染隔离（contain: strict / perspective: 1000px），强制浏览器分配独立硬件图层，杜绝复杂混合模式下的重绘伪影与移动端发热',
            '【此改动适用于 index.html / car.html】[全端自适应] 完美适配横竖屏模式（横屏靠左纵向居中、竖屏全对称居中），适配 iOS Safari 沉浸式伪全屏与 PWA 离线运行，阻断 Chrome/Safari 下拉橡皮筋手势冲突',
            '【此改动适用于 index.html】[性能优化] 彻底从 DOM 中移除初次启动未完全加载完成前的旧版移动端 PWA 底部 Tab 栏（.tab-bar / #tab-fab），消除首屏加载阶段闪烁，精简 DOM 与首屏绘制耗时',
            '【此改动适用于 index.html】[调试日志] bcos 虚拟系统运行日志全面集成座舱锁屏全生命周期事件（logEvent）：记录锁屏启动/退出驻留时长、横竖屏视口参数、GPU 硬件加速状态、主题切换、电量与续航遥测更新、壁纸切换、常亮锁申请与心跳保活等，极大提升排错效率',
            '【此改动适用于 index.html】[窗口触控] 优化 bcos 桌面窗口在移动端下的交互：标题长文本自动省略截断、按钮防挤压并扩展触控热区、支持 touchstart 瞬时响应关闭，增加窗口拖拽严格边界检测防止拖出屏幕外',
            '【此改动适用于 car.html】[独立锁屏] 独立车机端内深度打通极简模式无缝切换，支持桌面快捷参数（car.html?minimalist=1）与 PWA 添加到主屏幕'
        ]},
        { ver:'v7.8.3.9391', title:'车机锁屏错位修复、统一状态栏胶囊与卡片选择器、原生字体回退', items:[
            '【新增】统一胶囊状态徽章设计：顶部状态栏重构为规范的 28px 对称药丸胶囊微组件，左右高度对齐、圆角统一，支持微发光悬浮动效与 Cyber 悬浮提示',
            '【新增】现代化座舱多选卡片选择器（Option Selector）：工况标准（WLTP / 实估）与壁纸模式（自动轮播 / 固定壁纸 / 纯净色彩）重构为网格微拟物卡片，自带状态图标、副标题描述与激活蓝光对勾',
            '【新增】原生系统字体自适应回退引擎：深度优化中国大陆及无谷歌网络环境下的字体呈现，无缝调用 Apple SF Pro / PingFang SC / Windows Segoe UI / HarmonyOS Sans / 微软雅黑等本地高阶字体，确保排版丝滑锐利',
            '【修复】彻底修复主系统 index.html 唤起车机锁屏时的布局错位与缩放异常：通过锁定锁屏挂载期间的 Root rem 基准值（16px），阻断主页流体动态 rem 对车机锁屏固定比例的干扰，关闭锁屏瞬时完美恢复',
            '【修复】修复壁纸设置弹窗第三项（纯净座舱色彩）在小屏/窄屏下的右侧文本超出与右边缘裁剪 bug，自适应网格自动换行与微调间距',
            '【修复】修复弹窗右上角关闭按钮为统一样式的精致圆形半透明悬浮按钮，支持旋转微动效与精准触控热区',
            '【优化】纪念日达成率 HUD 仪表盘居中微调与提示优化：移除默认原生文字提示遮挡，升级为轻量化悬浮气泡，修正仪表文字绝对定位与垂直水平中心对齐',
            '【优化】优化弹窗内各项快速调节开关行与标签组（Quick Tags），触控区域更舒适，层级更清晰',
            '【删除】废弃顶部状态栏凌乱且尺寸不一的旧式触发按钮、不规范内联间距及生硬的原生 title 提示框'
        ]},
        { ver:'v7.8.3.9390', title:'座舱锁屏遥测绑定修复、OLED智能微位移防烧屏与PWA强制刷新', items:[
            '🖼️ 修复座舱锁屏 WALLPAPER 遥测状态错误绑定：重构 DOM ID 绑定为 car-wp-status，阻断电池网络监听器对壁纸卡片的误写覆盖，并实现顶部徽章与中控卡片双向同步显示壁纸模式',
            '⚡ 补全座舱锁屏中控卡片交互绑定：修复 DRIVE MODE 动力模式循环、CABIN TEMP 温度调节与常亮保持在主系统锁屏容器内的作用域导出，杜绝点击报错',
            '🛡️ 优化 OLED 防烧屏微位移机制（Pixel Shift）：废弃旧版全屏持续动画，采用分钟级精准离散微位移（8点循环）与高亮纪念日/时钟平滑过渡，触控、拖拽、操作弹窗即刻瞬时归零，并在静置6秒后启动柔和暗屏保护，零卡顿零重绘抖动',
            '🔄 升级 Service Worker 缓存至 v7.8.3.9390 并更新 Web Manifest，强制刷新离线客户端缓存与 PWA 容器'
        ]}
    ];
    function renderChangelog() {
        const el = document.getElementById('changelog-content');
        if (!el) return;
        // Deduplicate by version number, keeping the first (most recent) entry
        const seen = new Set();
        const deduped = CHANGELOG.filter(v => {
            if (seen.has(v.ver)) return false;
            seen.add(v.ver);
            return true;
        });
        const recent = deduped.slice(0, 6);
        el.innerHTML = recent.map((v, i) => `
            ${i > 0 ? '<div style="margin-top:.6rem;padding-top:.5rem;border-top:1px dashed var(--border);">' : '<div>'}
                <div style="margin-bottom:.5rem;"><strong style="color:var(--accent);">${v.ver}</strong> — ${v.title}</div>
                <ul style="margin-left:1.2rem;font-size:.8rem;line-height:1.7;">
                    ${v.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>`
        ).join('');
    }

    /* ==================== Main Loop ==================== */
    function startLoop() {
        function tick() {
            if (document.hidden) return;
            const start = new Date(CONFIG.START_DATE);
            const now = new Date();
            const diff = now - start;
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);

            // Home view: days and time
            const hd = document.getElementById('home-days');
            const ht = document.getElementById('home-time');
            if (hd) hd.textContent = days;
            if (ht) ht.textContent = `${hours}时 ${mins}分 ${secs}秒`;

            // Home milestones summary
            const hm = document.getElementById('home-milestones');
            if (hm && hm.dataset.lastDays !== String(days)) {
                hm.dataset.lastDays = String(days);
                const next = MILESTONES.find(m => days < m.days);
                if (next) {
                    const nextDate = new Date(start.getTime() + next.days * 86400000);
                    hm.innerHTML = `<div style="font-size:.75rem;color:var(--text2);">下一个：${next.label}</div>
                        <div style="font-size:.7rem;color:var(--text2);">📅 ${formatDate(nextDate)}（还有 ${next.days - days} 天）</div>`;
                } else {
                    hm.innerHTML = '<div style="font-size:.75rem;color:var(--good);">🏆 所有里程碑已达成！</div>';
                }
            }

            // Anniversary view (if active, update time)
            if (currentView === 'anniversary') {
                const ad = document.getElementById('anni-days');
                const at = document.getElementById('anni-time');
                if (ad) ad.textContent = days;
                if (at) at.textContent = `${hours} 时 ${mins} 分 ${secs} 秒`;
            }

            // Update real-time system display on monopoly view (every tick, cheap)
            if (currentView === 'monopoly' && mono && mono.started) {
                const ts = getTimeSystemState();
                const timePhaseEl = document.getElementById('mono-time-phase');
                const timeWeatherEl = document.getElementById('mono-time-weather');
                if (timePhaseEl) {
                    timePhaseEl.textContent = `${ts.phaseIcon} ${ts.phase} ${String(ts.hour).padStart(2,'0')}:${String(ts.minute).padStart(2,'0')} ${ts.isWeekend ? '🗓️ 周末' : '🗓️ 工作日'}`;
                }
                if (timeWeatherEl) {
                    const vol = Math.round(ts.stockVolatilityMult * 100);
                    const evChance = Math.round(ts.eventChanceMult * 100);
                    timeWeatherEl.textContent = `📊 波动${vol}% · 🎲 事件${evChance}% · 🦢${(ts.blackSwanBonus*100).toFixed(0)}%`;
                }
            }
        }
        tick();
        setInterval(tick, 1000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) tick();
        });
    }
    