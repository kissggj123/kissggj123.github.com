import re

with open('index.html', 'r') as f:
    content = f.read()

# Replace onclick with onpointerdown and stopPropagation for window controls
content = content.replace(
    '''<button class="bcos-window-btn bcos-win-btn-close" title="关闭" onclick="_bcosCloseWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-min" title="最小化" onclick="_bcosMinimizeWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-max" title="最大化" onclick="_bcosToggleMaximize('${winId}',event)"></button>''',
    '''<button class="bcos-window-btn bcos-win-btn-close" title="关闭" onmousedown="event.stopPropagation(); _bcosCloseWin('${app}')" ontouchstart="event.stopPropagation(); _bcosCloseWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-min" title="最小化" onmousedown="event.stopPropagation(); _bcosMinimizeWin('${app}')" ontouchstart="event.stopPropagation(); _bcosMinimizeWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-max" title="最大化" onmousedown="event.stopPropagation(); _bcosToggleMaximize('${winId}',event)" ontouchstart="event.stopPropagation(); _bcosToggleMaximize('${winId}',event)"></button>'''
)

with open('index.html', 'w') as f:
    f.write(content)
