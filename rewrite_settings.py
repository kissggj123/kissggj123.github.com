import re

with open('index.html', 'r') as f:
    content = f.read()

new_settings = """    function _bcosRenderSettingsApp(content) {
        content.style.padding = '0';
        content.style.overflow = 'auto';
        content.style.height = '100%';
        
        let customBg = localStorage.getItem('bcosCustomBg') || '';
        let html = '<div style="padding:1rem;color:var(--text);font-family:sans-serif;">';
        html += '<h3 style="color:var(--accent);margin-top:0;">🎨 BCOS 系统设置</h3>';
        
        // Themes
        html += '<div style="margin-bottom:.5rem;">主题风格</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.5rem;">';
        for (const [id, t] of Object.entries(_bcosThemeDesktop)) {
            const current = document.documentElement.getAttribute('data-theme') || 'bunny';
            const border = current === id ? `2px solid ${t.accent}` : '2px solid transparent';
            html += `<div onclick="setTheme('${id}')" style="width:40px;height:40px;border-radius:50%;background:${t.wallpaper};cursor:pointer;border:${border};box-shadow:0 2px 5px rgba(0,0,0,.3);" title="${t.label}"></div>`;
        }
        html += '</div>';

        // Custom Wallpaper
        html += '<div style="margin-bottom:.5rem;">自定义壁纸 URL (覆盖主题自带壁纸)</div>';
        html += '<div style="display:flex;gap:8px;margin-bottom:1.5rem;">';
        html += `<input type="text" id="bcos-custom-bg-input" value="${customBg}" placeholder="https://... 或留空恢复默认" style="flex:1;background:rgba(0,0,0,.3);border:1px solid #444;color:#fff;padding:6px 10px;border-radius:4px;font-size:12px;">`;
        html += `<button onclick="
            const val = document.getElementById('bcos-custom-bg-input').value.trim();
            if (val) {
                localStorage.setItem('bcosCustomBg', val);
            } else {
                localStorage.removeItem('bcosCustomBg');
            }
            if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
            this.textContent = '已保存'; setTimeout(() => this.textContent = '应用', 1000);
        " style="background:var(--accent);color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:12px;">应用</button>`;
        html += '</div>';
        
        // Classic Settings Ported
        html += '<div style="margin-bottom:.5rem;">全局设置</div>';
        html += '<div style="background:rgba(255,255,255,0.05);padding:1rem;border-radius:8px;display:flex;flex-direction:column;gap:12px;font-size:13px;">';
        
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>字体缩放</span>';
        html += `<input type="range" min="80" max="200" step="5" value="${localStorage.getItem('fontScale')||100}" oninput="if(window.setFontScale) setFontScale(this.value);" style="width:50%;accent-color:var(--accent);">`;
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>像素字体模式</span>';
        html += `<button onclick="if(window.togglePixelFont) togglePixelFont(); this.style.opacity=0.5;" style="background:#333;color:#fff;border:1px solid #555;padding:4px 10px;border-radius:4px;cursor:pointer;">切换</button>`;
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>鼠标光效跟随</span>';
        html += `<button onclick="if(window.toggleMouseBunny) toggleMouseBunny(); this.style.opacity=0.5;" style="background:#333;color:#fff;border:1px solid #555;padding:4px 10px;border-radius:4px;cursor:pointer;">切换</button>`;
        html += '</div>';

        html += '</div></div>';
        
        content.innerHTML = html;
    }"""

pattern = re.compile(r"    function _bcosRenderSettingsApp\(content\) \{.*?(?=    function _bcosRenderLogsApp\(content\) \{)", re.DOTALL)
content = pattern.sub(new_settings + '\n', content)

with open('index.html', 'w') as f:
    f.write(content)
