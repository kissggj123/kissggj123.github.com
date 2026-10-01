import re

with open('index.html', 'r') as f:
    content = f.read()

pattern = re.compile(r"        _bcosShowOOBE\(ov\);\n        setTimeout")
if pattern.search(content):
    content = pattern.sub("        _bcosShowOOBE(ov);\n        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();\n        setTimeout", content)

with open('index.html', 'w') as f:
    f.write(content)
