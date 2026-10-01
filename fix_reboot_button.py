import re

with open('index.html', 'r') as f:
    content = f.read()

bad_html = """                    <h2 style="margin:0 0 2rem;font-weight:400;color:#aaa;">System Halted.</h2>
                        ⏻ Reboot (重新开机)
                    </button>"""

good_html = """                    <h2 style="margin:0 0 2rem;font-weight:400;color:#aaa;">System Halted.</h2>
                    <button onclick="tryAutoFullscreen();showBcosOS();" style="padding:10px 24px;background:transparent;color:#fff;border:1px solid #555;border-radius:4px;font-size:16px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
                        ⏻ Reboot (重新开机)
                    </button>"""

content = content.replace(bad_html, good_html)

with open('index.html', 'w') as f:
    f.write(content)
