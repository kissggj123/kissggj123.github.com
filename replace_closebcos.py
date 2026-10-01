import re

with open('index.html', 'r') as f:
    content = f.read()

new_close = """    function closeBcosOS() {
        const doc = window.document;
        const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (efs && doc.fullscreenElement) {
            efs.call(doc).catch(()=>{});
        }
        
        const ov = document.getElementById('bcos-overlay');
        if (ov) { 
            ov.classList.remove('bcos-desktop-mode');
            ov.innerHTML = `
                <div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;z-index:999999;">
                    <img src="./dist/Bunny CC_Profile.JPG" style="width:120px;height:120px;border-radius:50%;object-fit:cover;box-shadow:0 0 20px rgba(255,255,255,0.2);margin-bottom:2rem;border:3px solid #333;" onerror="this.src=''" alt="avatar"/>
                    <h2 style="margin:0 0 2rem;font-weight:400;color:#aaa;">System Halted.</h2>
                    <button onclick="showBcosOS(); tryAutoFullscreen();" style="background:#222;color:#fff;border:1px solid #555;padding:12px 32px;border-radius:24px;font-size:1.1rem;cursor:pointer;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
                        ⏻ Reboot (重新开机)
                    </button>
                </div>
            `;
            ov.classList.add('active'); // Keep overlay active to cover the hidden .app
        }
        if (_bcos.clockInterval) { clearInterval(_bcos.clockInterval); _bcos.clockInterval = null; }
        if (_bcosMonitorTimer) { clearInterval(_bcosMonitorTimer); _bcosMonitorTimer = null; }
        if (_bcosAnniversaryTimer) { clearInterval(_bcosAnniversaryTimer); _bcosAnniversaryTimer = null; }
        if (_bcosTeHlTimer) { clearTimeout(_bcosTeHlTimer); _bcosTeHlTimer = null; }
        _bcosBooting = false; // Allow re-boot after close
        _bcosActiveOutput = null;
        _bcosCwd = '~'; // Reset working directory on exit
        _bcos.wins = {}; _bcos.activeWin = null; _bcos.mode = 'closed';
        _bcosUnbindEsc();
    }"""

# Using regex to replace the function
pattern = re.compile(r'    function closeBcosOS\(\) \{.*?(?=    const _bcosThemeDesktop = \{)', re.DOTALL)
content = pattern.sub(new_close + '\n\n', content)

with open('index.html', 'w') as f:
    f.write(content)
