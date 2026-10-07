import re, os

with open('index.html', 'r') as f:
    content = f.read()

new_log = """        { ver:'v7.8.3.9375', title:'BCOS 开机动画 & 深度审计修复', items:[
            '🚀 BCOS 专属开机动画：现在每次点击"Reboot"或首次进入 BCOS，都会看到优雅的黑底开机动画。内含兔可可头像、版本号、渐变进度条与跳动呼吸光点。开机期间同步在后台进行壁纸库预热、IndexedDB 初始化、自定义壁纸预解码，保证桌面出现时一切已就绪。',
            '🔍 代码深度审计：系统性扫描所有 onclick/ontouchstart 事件引用的函数，验证 44 个关键函数均已正确定义与全局导出，零漏洞',
            '🐛 overscroll 作用域修正：将 overscroll-behavior:none 从 body 全局移至 #bcos-overlay，避免在 BCOS 外部的原始网页区域也无法正常滚动',
            '🖼️ 壁纸初始化顺序修正：_bcosLaunchDesktop 不再硬编码 localStorage 壁纸作为 background inline style，改为完全交由 _bcosApplyDesktopTheme 统一管理，避免 b64 壁纸路径被当作 URL 直接使用',
        ]},
"""

pattern = re.compile(r"    const CHANGELOG = \[\n")
content = pattern.sub(f"    const CHANGELOG = [\n{new_log}", content)

with open('index.html', 'w') as f:
    f.write(content)

os.system("sed -i '' 's/v7[.]8[.]3[.]9374/v7.8.3.9375/g' index.html car.html service-worker.js")
print("✅ Version bumped to v7.8.3.9375")
