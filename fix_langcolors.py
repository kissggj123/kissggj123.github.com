import re

with open('index.html', 'r') as f:
    content = f.read()

lang_colors = """
    const _bcosLangColors = {
        'C#': '#178600', 'JavaScript': '#f1e05a', 'Python': '#3572A5', 'C++': '#f34b7d',
        'C': '#555555', 'Java': '#b07219', 'HTML': '#e34c26', 'Shell': '#89e051',
        'PHP': '#4F5D95', 'Ruby': '#701516', 'Swift': '#F05138', 'Dart': '#00B4AB',
        'TypeScript': '#3178c6', 'Objective-C': '#438eff', 'Go': '#00ADD8', 'ASP': '#6a40fd',
        'TeX': '#3D6117', 'Smarty': '#f0c040', 'MATLAB': '#e16737', 'Batchfile': '#C1F12E',
        'N/A': '#00ff41'
    };
"""

content = content.replace("    ];\n    const _BCOS_VER", "    ];" + lang_colors + "    const _BCOS_VER")

with open('index.html', 'w') as f:
    f.write(content)
