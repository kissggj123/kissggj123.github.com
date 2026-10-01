import re

with open('index.html', 'r') as f:
    content = f.read()

# Remove the 3 lines injected inside the wallpaper mode buttons HTML template
content = content.replace(
    '    window.loadWallpaperBlob = loadWallpaperBlob;\n    window.wpBlobCache = wpBlobCache;\n    window.WP_PLACEHOLDER = WP_PLACEHOLDER;\n\n',
    ''
)

# Remove the BUILTIN_WALLPAPERS export injected inside select > option template
content = content.replace(
    '    window.BUILTIN_WALLPAPERS = BUILTIN_WALLPAPERS;\n\n',
    ''
)

# Now find the proper place to export: just after the IIFE closing of the car lockscreen block
# The car lockscreen IIFE ends with: })(); and then we have window.showBcosCarLockscreen
target = 'window.showBcosCarLockscreen = showBcosCarLockscreen;'
replacement = '''window.showBcosCarLockscreen = showBcosCarLockscreen;
        window.BUILTIN_WALLPAPERS = BUILTIN_WALLPAPERS;
        window.loadWallpaperBlob = loadWallpaperBlob;
        window.wpBlobCache = wpBlobCache;
        window.WP_PLACEHOLDER = WP_PLACEHOLDER;'''

if target in content:
    content = content.replace(target, replacement, 1)
    print("✅ Exports inserted correctly after showBcosCarLockscreen export")
else:
    print("❌ Could not find target export line")

with open('index.html', 'w') as f:
    f.write(content)
