import re

with open('index.html', 'r') as f:
    content = f.read()

new_log = """        { ver:'v7.8.3.9372', title:'系统设置重构与纯净开机体验升级', items:[
            '🎨 重构系统设置布局：彻底废弃老旧的设置页面粗暴移植，为 bcos 量身定制了全新的系统设置窗口，支持自定义壁纸 URL，可随时切换 10 款内置主题或应用专属壁纸！',
            '🚀 纯净开机体验：彻底移除老旧的 Classic UI 入口及相关的 "关于作者" 入口，解决了重复点击导致系统多次挂载产生重复弹窗的严重漏洞',
            '✨ 完美全屏启动：修复了开机强制触发全屏导致的浏览器安全告警，现在将在关机后通过友好的系统已停止界面，以用户点击“重新开机”按钮的方式平滑获取全屏权限',
            '📏 桌面图标完美对齐：修复了桌面图标文字过长换行时导致的列不对齐与排版错乱问题',
        ]},
"""

pattern = re.compile(r"    const CHANGELOG = \[\n")
content = pattern.sub(f"    const CHANGELOG = [\n{new_log}", content)

with open('index.html', 'w') as f:
    f.write(content)

# Update version to 9372
import os
os.system("sed -i '' 's/v7\.8\.3\.9371/v7.8.3.9372/g' index.html car.html 404.html service-worker.js")
