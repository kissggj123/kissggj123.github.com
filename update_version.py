import re
import os

with open('index.html', 'r') as f:
    content = f.read()

new_log = """        { ver:'v7.8.3.9373', title:'系统设置重磅升级 & 锁屏无缝互通', items:[
            '🎨 系统设置壁纸库互通：BCOS 系统设置现已全面接入车机锁屏的高清壁纸库！直接在 BCOS 中浏览、预览并一键应用内置的星空/插画/极光等 14 款极品壁纸（完美支持 .b64 离线缓存高速加载）！',
            '🚀 默认直开全屏桌面：听取反馈，去除了繁琐的黑底代码 Boot 动画，现在打开网页或点击重新开机，将以毫秒级速度直接进入 BCOS 全景桌面环境！',
            '🛠️ 全局首选项回归：系统设置中补全了之前精简掉的“Tab 栏模式”、“侧边栏模式”与“头像风格”设置，全面满足自定义需求',
            '🐞 修复了在 BCOS 桌面点击【车机锁屏】图标时偶尔报 CAR_THEMES 变量未定义的错误',
        ]},
"""

pattern = re.compile(r"    const CHANGELOG = \[\n")
content = pattern.sub(f"    const CHANGELOG = [\n{new_log}", content)

with open('index.html', 'w') as f:
    f.write(content)

os.system("sed -i '' 's/v7\.8\.3\.9372/v7.8.3.9373/g' index.html car.html 404.html service-worker.js")
