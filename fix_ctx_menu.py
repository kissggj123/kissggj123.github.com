import re

with open('index.html', 'r') as f:
    content = f.read()

pattern = re.compile(r"    function _bcosInitContextMenu\(\) \{")
content = pattern.sub("    let _bcosCtxMenuBound = false;\n    function _bcosInitContextMenu() {\n        if (_bcosCtxMenuBound) return;\n        _bcosCtxMenuBound = true;", content)

with open('index.html', 'w') as f:
    f.write(content)
