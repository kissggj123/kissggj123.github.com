import re

with open('index.html', 'r') as f:
    content = f.read()

# Add touchmove preventDefault to desktop background
pattern = re.compile(r"        const bg = document.getElementById\('bcos-desktop-bg'\);\n        if \(bg\) bg.addEventListener\('click'")
if pattern.search(content):
    content = pattern.sub("        const bg = document.getElementById('bcos-desktop-bg');\n        if (bg) { bg.addEventListener('touchmove', e => e.preventDefault(), {passive:false}); bg.addEventListener('click'", content)
    content = content.replace("        if (bg) { bg.addEventListener('touchmove', e => e.preventDefault(), {passive:false}); bg.addEventListener('click'", "        if (bg) {\n            bg.addEventListener('touchmove', e => e.preventDefault(), {passive:false});\n            bg.addEventListener('click'")

with open('index.html', 'w') as f:
    f.write(content)
