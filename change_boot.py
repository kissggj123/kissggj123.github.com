import re

with open('index.html', 'r') as f:
    content = f.read()

pattern = re.compile(r"        _bcosBoot\(ov\);\n    \}")
content = pattern.sub("        _bcosLaunchDesktop();\n        ov.classList.add('active');\n    }", content)

with open('index.html', 'w') as f:
    f.write(content)
