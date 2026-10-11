/* v8.2 app-texteditor.js - Code Studio */
(function(){'use strict';
window._bcosAppEditor={id:'texteditor',name:'Code Studio',icon:'📝',
render:function(){return '<div style="display:flex;flex-direction:column;height:100%"><div style="padding:8px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;gap:8px"><input id="ed-name" placeholder="文件名" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff"><button onclick="_bcosEdSave()" style="padding:6px 16px;border-radius:6px;border:none;background:#7c8cff;color:#fff;cursor:pointer">保存</button></div><textarea id="ed-text" style="flex:1;padding:12px;background:#0a0c1a;color:#d4d4d4;font-family:monospace;font-size:13px;border:none;resize:none" placeholder="// 写代码..."></textarea></div>';},
onOpen:function(){}};
window._bcosEdSave=function(){const n=document.getElementById('ed-name');const t=document.getElementById('ed-text');if(!n||!t||!n.value.trim())return;try{localStorage.setItem('bcos_file_'+n.value.trim(),t.value);alert('已保存');}catch(e){}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['texteditor']=window._bcosAppEditor;console.log('[App] texteditor 已注册');})();
