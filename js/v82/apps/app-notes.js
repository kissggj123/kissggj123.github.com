/* v8.2 app-notes.js - 便签 */
(function(){'use strict';
window._bcosAppNotes={id:'notes',name:'便签',icon:'📝',
render:function(){return '<div style="padding:16px;height:100%;display:flex;flex-direction:column"><textarea id="notes-t" placeholder="写点什么..." style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:14px;resize:none"></textarea><button onclick="_bcosNotesSave()" style="margin-top:12px;padding:10px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">💾 保存</button></div>';},
onOpen:function(win){try{win.querySelector('#notes-t').value=localStorage.getItem('bcos_notes')||'';}catch(e){}}};
window._bcosNotesSave=function(){const t=document.getElementById('notes-t');if(!t)return;try{localStorage.setItem('bcos_notes',t.value);alert('已保存');}catch(e){}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['notes']=window._bcosAppNotes;console.log('[App] notes 已注册');})();
