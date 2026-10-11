/* v8.2 app-me.js - me 文件夹 */
(function(){'use strict';
window._bcosAppMe={id:'me',name:'me',icon:'📁',
render:function(){return '<div style="padding:16px;color:#fff"><h3>📁 me</h3><div id="me-list" style="margin-top:12px"></div></div>';},
onOpen:function(win){const el=win.querySelector('#me-list');if(!el)return;try{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('bcos_file_'))keys.push(k.replace('bcos_file_',''));}el.innerHTML=keys.length?keys.map(function(k){return '<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08)">📄 '+k+'</div>';}).join(''):'<div style="opacity:.6">空文件夹</div>';}catch(e){}}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['me']=window._bcosAppMe;console.log('[App] me 已注册');})();
