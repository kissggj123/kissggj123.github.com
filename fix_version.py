import re
import os

with open('index.html', 'r') as f:
    content = f.read()

new_log = """        { ver:'v7.8.3.9374', title:'桌面体验重构与细节优化', items:[
            '🎨 BCOS 全局右键菜单支持：为 BCOS 桌面环境打造了专属右键菜单，彻底屏蔽浏览器原生右键菜单。一键快速更换壁纸、直达车机锁屏、打开终端或查看系统信息',
            '🍎 深度适配 iOS/iPadOS 沉浸式体验：在 BCOS 桌面屏蔽了向下拖拽导致的弹性回弹 (overscroll) 及系统原生的退出全屏手势，实现了真正的原生应用级沉浸体验',
            '⏱️ 任务栏实时时间升级：任务栏时钟现已支持秒级实时刷新，同时修复了在窄屏移动设备上时钟文字被过度挤压挤出屏幕边缘的排版问题',
            '🖱️ 窗口控制逻辑重构：修复了点击“红黄绿”三个窗口控制按钮时因标题栏拖拽事件覆盖导致失效的问题，现在关闭、最小化、最大化按钮都能精准响应',
            '🔄 修复关机重置界面：修复了“System Halted”界面中点击 Reboot (重新开机) 按钮无反应的 Bug，保障系统的流畅循环启动',
        ]},
"""

pattern = re.compile(r"    const CHANGELOG = \[\n")
content = pattern.sub(f"    const CHANGELOG = [\n{new_log}", content)

with open('index.html', 'w') as f:
    f.write(content)

os.system("sed -i '' 's/v7\.8\.3\.9373/v7.8.3.9374/g' index.html car.html 404.html service-worker.js")
