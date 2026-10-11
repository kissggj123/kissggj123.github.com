/* v8.2 app-anniversary.js - 纪念日 */
(function(){'use strict';
window._bcosAppAnniv={id:'anniversary',name:'纪念日',icon:'💕',
render:function(){return '<div style="padding:24px;color:#fff;text-align:center"><div style="font-size:48px">🐰</div><h3>兔可可纪念日</h3><div id="anniv-days" style="font-size:36px;font-weight:200;margin:16px 0"></div><div style="opacity:.6;font-size:13px">每一天都是思念</div></div>';},
onOpen:function(win){const el=win.querySelector('#anniv-days');if(!el)return;try{const start=new Date(localStorage.getItem('bcos_anniv_start')||'2020-01-01');const days=Math.floor((Date.now()-start.getTime())/86400000);el.textContent=days+' 天';}catch(e){el.textContent='-- 天';}}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['anniversary']=window._bcosAppAnniv;console.log('[App] anniversary 已注册');})();
