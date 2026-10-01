import re

with open('index.html', 'r') as f:
    content = f.read()

func = """
    window._bcosApplyDesktopTheme = function() {
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        let customBg = localStorage.getItem('bcosCustomBg');
        if (customBg) {
            bg.style.background = `url(${customBg}) center/cover no-repeat`;
        } else {
            const dt = _bcosGetDesktopTheme();
            bg.style.background = dt.wallpaper;
        }
    };
"""

pattern = re.compile(r"    function _bcosLaunchDesktop\(\) \{")
content = pattern.sub(func + "    function _bcosLaunchDesktop() {", content)

# Also apply it inside _bcosLaunchDesktop
launch_pattern = re.compile(r'style="background:\$\{dt.wallpaper\};"')
content = launch_pattern.sub(r'style="background:${localStorage.getItem(\'bcosCustomBg\') ? `url(${localStorage.getItem(\'bcosCustomBg\')}) center/cover no-repeat` : dt.wallpaper};"', content)

with open('index.html', 'w') as f:
    f.write(content)
