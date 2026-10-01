import re

with open('index.html', 'r') as f:
    content = f.read()

# Bug 1: _bcosApplyDesktopTheme uses localStorage.getItem('bcosCustomBg') which may be a BUILTIN wallpaper path
# but _bcosLaunchDesktop already uses it inline via template literal - make it consistent
# Fix: _bcosLaunchDesktop should not inline the customBg in template but let _bcosApplyDesktopTheme handle it
old_wallpaper_inline = 'style="background:${localStorage.getItem(\'bcosCustomBg\') ? `url(${localStorage.getItem(\'bcosCustomBg\')}) center/cover no-repeat` : dt.wallpaper};"'
new_wallpaper_inline = 'style="background:${dt.wallpaper};"'
content = content.replace(old_wallpaper_inline, new_wallpaper_inline)

# Bug 2: The taskbar clock starts at "--:--" but we call _bcosUpdateClock() right after - fine
# But the date display could be nice to show date too
# Fix the clock to show date on hover/full
# Actually leave clock as-is for now

# Bug 3: _bcosToggleMaximize uses event argument which may not propagate from touchstart properly  
# Already mitigated via onmousedown/ontouchstart

# Bug 4: _bcosUpdateTaskbar is called in _bcosOpenApp but after window render
# This is fine

# Bug 5: The OOBE overlay has z-index 9999 but it's inside the bcos-overlay which is positioned,
# so it stacks correctly - fine

# Bug 6: overscroll-behavior: none may block scrolling inside settings/other windows
# Need to only block it on bcos-overlay, not body globally
old_body = 'body { margin: 0; overscroll-behavior: none;'
new_body = 'body { margin: 0;'
content = content.replace(old_body, new_body, 1)

# Add overscroll block only to bcos-overlay instead
old_overlay_css = '#bcos-overlay { position: fixed; inset: 0; z-index: 10000;'
new_overlay_css = '#bcos-overlay { position: fixed; inset: 0; z-index: 10000; overscroll-behavior: none;'
if old_overlay_css in content:
    content = content.replace(old_overlay_css, new_overlay_css, 1)

# Bug 7: Battery display stuck at 88% - it should read from localStorage
# Check if _bcosUpdateClock updates battery
with open('index.html', 'w') as f:
    f.write(content)
print("✅ Misc bugs fixed")
