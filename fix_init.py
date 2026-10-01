import re

with open('index.html', 'r') as f:
    content = f.read()

new_init = """            const isCar = sp.has('car') || sp.get('mode') === 'car' || sp.has('lock') || sp.has('lockscreen') || sp.get('bcos') === 'car';
            
            // Auto enter fullscreen on supported browsers / devices
            tryAutoFullscreen();

            if (isCar) {
                setTimeout(() => showBcosCarLockscreen(), 100);
            } else {
                // Default: Direct Boot into Full-Screen bcos Operating System Desktop
                setTimeout(() => showBcosOS(), 100);
            }"""

pattern = re.compile(r"            const isClassic = .*?setTimeout\(\(\) => showBcosOS\(\), 100\);\n            \} else \{\n[^\n]*\n[^\n]*\n            \}", re.DOTALL)
content = pattern.sub(new_init, content)

with open('index.html', 'w') as f:
    f.write(content)
