with open('index.html', 'r') as f:
    content = f.read()

# 1. Add id to content div so re-render target works
old = "    function _bcosRenderSettingsApp(content) {\n        content.style.padding = '0';"
new = "    function _bcosRenderSettingsApp(content) {\n        content.id = 'bcos-settings-host';\n        content.style.padding = '0';"
content = content.replace(old, new)

# 2. Fix the re-render call: .closest('#bcos-settings-host').parentNode -> .closest('#bcos-settings-host')
content = content.replace(
    "window._bcosRenderSettingsApp(this.closest('#bcos-settings-host').parentNode)",
    "window._bcosRenderSettingsApp(document.getElementById('bcos-settings-host'))"
)

with open('index.html', 'w') as f:
    f.write(content)

print("✅ Fixed settings re-render target")
