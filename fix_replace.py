import re

with open('index.html', 'r') as f:
    content = f.read()

pattern = re.compile(r"    const _bcosRepos = \[\n.*?    \];\n", re.DOTALL)

with open('regen_repos.py', 'r') as f:
    regen_code = f.read()

# Modify regen_repos.py to use function replacement
new_regen = regen_code.replace("content = pattern.sub(js_array, content)", "content = pattern.sub(lambda m: js_array, content)")
with open('regen_repos.py', 'w') as f:
    f.write(new_regen)

