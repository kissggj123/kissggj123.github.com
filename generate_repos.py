import urllib.request, json
url = 'https://api.github.com/users/kissggj123/repos?per_page=100&type=owner'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    
    # Sort by updated_at descending
    data.sort(key=lambda r: r.get('pushed_at') or r.get('updated_at') or '1970-01-01', reverse=True)
    
    repos = []
    for r in data:
        lang = r.get('language') or 'N/A'
        date = (r.get('pushed_at') or r.get('updated_at') or r.get('created_at') or '2020-01-01')[:10]
        desc = (r.get('description') or '').replace("'", "\\'")
        name = r.get('name')
        stars = r.get('stargazers_count', 0)
        forks = r.get('forks_count', 0)
        url = r.get('html_url')
        is_fork = 'true' if r.get('fork') else 'false'
        size = r.get('size', 0)
        homepage = r.get('homepage') or ''
        repos.append(f"  ['{name}','{desc}','{lang}',{stars},{forks},'{date}','{url}',{is_fork},{size},'{homepage}']")
    
    with open('generated_repos.js', 'w') as f:
        f.write('    const _bcosRepos = [\n')
        f.write(',\n'.join(repos))
        f.write('\n    ];')
