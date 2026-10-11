/* v8.2 app-browser.js - 浏览器 */
(function(){'use strict';
window._bcosAppBrowser={id:'browser',name:'Browser',icon:'🌐',
render:function(){return '<div style="display:flex;flex-direction:column;height:100%"><div style="display:flex;gap:8px;padding:10px;border-bottom:1px solid rgba(255,255,255,.1)"><input id="br-url" placeholder="输入网址..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff"><button onclick="_bcosBrGo()" style="padding:8px 16px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">前往</button></div><iframe id="br-frame" style="flex:1;border:none;background:#fff"></iframe></div>';},
onOpen:function(win){win.querySelector('#br-url').addEventListener('keydown',function(e){if(e.key==='Enter')window._bcosBrGo();});}};
window._bcosBrGo=function(){const u=document.getElementById('br-url');const f=document.getElementById('br-frame');if(!u||!f)return;let v=u.value.trim();if(!v)return;if(!v.startsWith('http'))v='https://'+v;f.src=v;};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['browser']=window._bcosAppBrowser;console.log('[App] browser 已注册');})();
