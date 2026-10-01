import re

with open('index.html', 'r') as f:
    content = f.read()

new_settings = """    function _bcosRenderSettingsApp(content) {
        content.style.padding = '0';
        content.style.overflow = 'auto';
        content.style.height = '100%';
        content.style.background = '#1a1a2e';
        content.style.color = '#fff';
        
        let customBg = localStorage.getItem('bcosCustomBg') || '';
        let html = '<div style="padding:1.5rem;max-width:800px;margin:0 auto;font-family:sans-serif;">';
        html += '<h2 style="color:#a78bfa;margin-top:0;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">⚙️ System Settings (系统设置)</h2>';
        
        // Themes
        html += '<h3 style="margin-bottom:.8rem;color:#ddd;font-size:1rem;">🎨 BCOS 桌面氛围主题</h3>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:2rem;">';
        for (const [id, t] of Object.entries(_bcosThemeDesktop)) {
            const current = document.documentElement.getAttribute('data-theme') || 'bunny';
            const border = current === id ? `3px solid ${t.accent}` : '3px solid transparent';
            html += `<div onclick="setTheme('${id}')" style="width:48px;height:48px;border-radius:12px;background:${t.wallpaper};cursor:pointer;border:${border};box-shadow:0 4px 10px rgba(0,0,0,.4);" title="${t.label}"></div>`;
        }
        html += '</div>';

        // Wallpapers
        html += '<h3 style="margin-bottom:.8rem;color:#ddd;font-size:1rem;">🖼️ 桌面壁纸 (沿用锁屏图库)</h3>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(100px, 1fr));gap:12px;margin-bottom:1rem;">';
        if (window.BUILTIN_WALLPAPERS) {
            window.BUILTIN_WALLPAPERS.forEach(w => {
                let img = w.thumb || (w.b64 ? '' : w.file); // basic handling
                html += `<div onclick="
                    localStorage.setItem('bcosCustomBg', '${w.file}');
                    if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
                " style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid rgba(255,255,255,0.1);aspect-ratio:16/9;background:#222 url(${w.thumb||w.file}) center/cover no-repeat;" title="${w.name}"></div>`;
            });
        }
        html += `<div onclick="
            localStorage.removeItem('bcosCustomBg');
            if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
        " style="cursor:pointer;border-radius:8px;border:2px dashed rgba(255,255,255,0.3);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">恢复默认</div>`;
        html += '</div>';

        html += '<div style="display:flex;gap:8px;margin-bottom:2rem;">';
        html += `<input type="text" id="bcos-custom-bg-input" value="${customBg}" placeholder="或在此输入自定义壁纸 URL (HTTPS网络图片)" style="flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 12px;border-radius:6px;font-size:13px;outline:none;">`;
        html += `<button onclick="
            const val = document.getElementById('bcos-custom-bg-input').value.trim();
            if (val) localStorage.setItem('bcosCustomBg', val);
            else localStorage.removeItem('bcosCustomBg');
            if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
            this.textContent = '已应用'; setTimeout(() => this.textContent = '应用', 1000);
        " style="background:#a78bfa;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">应用</button>`;
        html += '</div>';
        
        // Classic Settings Ported
        html += '<h3 style="margin-bottom:.8rem;color:#ddd;font-size:1rem;">🛠️ 全局首选项 (大富翁生态)</h3>';
        html += '<div style="background:rgba(255,255,255,0.03);padding:1.2rem;border-radius:12px;display:flex;flex-direction:column;gap:16px;font-size:14px;border:1px solid rgba(255,255,255,0.05);">';
        
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>🔤 字体缩放比例 (影响所有应用)</span>';
        html += `<input type="range" min="80" max="200" step="5" value="${localStorage.getItem('fontScale')||100}" oninput="if(window.setFontScale) setFontScale(this.value);" style="width:150px;accent-color:#a78bfa;">`;
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>📱 移动端 Tab 栏模式</span>';
        html += `<select onchange="if(window.setTabBarMode) setTabBarMode(this.value)" style="background:rgba(0,0,0,0.5);color:#fff;border:1px solid #444;padding:4px 8px;border-radius:4px;"><option value="always">始终显示</option><option value="auto-collapse">自动折叠</option><option value="hidden">隐藏</option></select>`;
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>🖥️ PC 侧边栏模式</span>';
        html += `<select onchange="if(window.setSidebarMode) setSidebarMode(this.value)" style="background:rgba(0,0,0,0.5);color:#fff;border:1px solid #444;padding:4px 8px;border-radius:4px;"><option value="auto">自动折叠(悬停展开)</option><option value="auto-hide">自动隐藏(点击恢复)</option><option value="locked-open">始终展开</option><option value="locked-collapsed">始终折叠</option></select>`;
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>🐰 侧边栏头像风格</span>';
        html += `<div><button onclick="if(window.setSidebarAvatar) setSidebarAvatar('emoji')" style="background:#333;color:#fff;border:1px solid #555;padding:4px 10px;border-radius:4px;cursor:pointer;margin-right:6px;">Emoji</button><button onclick="if(window.setSidebarAvatar) setSidebarAvatar('photo')" style="background:#333;color:#fff;border:1px solid #555;padding:4px 10px;border-radius:4px;cursor:pointer;">照片</button></div>`;
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>👾 像素字体模式</span>';
        html += `<button onclick="if(window.togglePixelFont) togglePixelFont(); this.style.opacity=0.5;" style="background:#333;color:#fff;border:1px solid #555;padding:4px 12px;border-radius:4px;cursor:pointer;">切换</button>`;
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>✨ 鼠标光效跟随</span>';
        html += `<button onclick="if(window.toggleMouseBunny) toggleMouseBunny(); this.style.opacity=0.5;" style="background:#333;color:#fff;border:1px solid #555;padding:4px 12px;border-radius:4px;cursor:pointer;">切换</button>`;
        html += '</div>';

        html += '</div></div>';
        
        content.innerHTML = html;
        
        // Restore select values
        setTimeout(() => {
            const tm = localStorage.getItem('tabBarMode') || 'always';
            const sm = localStorage.getItem('sidebarMode') || 'auto';
            const sels = content.querySelectorAll('select');
            if (sels[0]) sels[0].value = tm;
            if (sels[1]) sels[1].value = sm;
        }, 50);
    }"""

pattern = re.compile(r"    function _bcosRenderSettingsApp\(content\) \{.*?(?=    function _bcosRenderLogsApp\(content\) \{)", re.DOTALL)
content = pattern.sub(new_settings + '\n', content)

with open('index.html', 'w') as f:
    f.write(content)
