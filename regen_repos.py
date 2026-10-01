import urllib.request
import json
import re

username = "kissggj123"
repos = []
page = 1

try:
    while True:
        req = urllib.request.Request(f"https://api.github.com/users/{username}/repos?per_page=100&page={page}")
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            if not data:
                break
            repos.extend(data)
            page += 1
except Exception as e:
    print(f"Error fetching repos: {e}")

if repos:
    repos.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    
    js_array = "    const _bcosRepos = [\n"
    for idx, r in enumerate(repos):
        name = json.dumps(r.get('name', ''))
        desc = json.dumps((r.get('description') or '').replace('\n', ' '))
        lang = json.dumps(r.get('language') or 'N/A')
        stars = r.get('stargazers_count') or 0
        forks = r.get('forks_count') or 0
        updated = json.dumps((r.get('updated_at') or '')[:10])
        url = json.dumps(r.get('html_url', ''))
        is_fork = 'true' if r.get('fork') else 'false'
        size = r.get('size') or 0
        homepage = json.dumps(r.get('homepage') or '')
        
        comma = "," if idx < len(repos) - 1 else ""
        js_array += f"  [{name},{desc},{lang},{stars},{forks},{updated},{url},{is_fork},{size},{homepage}]{comma}\n"
    js_array += "    ];\n"
    
    with open('index.html', 'r') as f:
        content = f.read()
    
    pattern = re.compile(r"    const _bcosRepos = \[\n.*?    \];\n", re.DOTALL)
    content = pattern.sub(lambda m: js_array, content)
    
    with open('index.html', 'w') as f:
        f.write(content)
