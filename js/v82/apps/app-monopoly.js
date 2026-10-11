/* v8.2 app-monopoly.js - 大富翁 (简化版) */
(function(){'use strict';
window._bcosAppMonopoly={id:'monopoly',name:'大富翁',icon:'🎲',
render:function(){return '<div style="padding:24px;color:#fff;text-align:center"><div style="font-size:64px" id="mono-dice">🎲</div><div id="mono-res" style="font-size:20px;margin:16px 0">点击掷骰子</div><button onclick="_bcosMonoRoll()" style="padding:12px 32px;border-radius:12px;border:none;background:#7c8cff;color:#fff;font-size:16px;cursor:pointer">🎲 掷骰子</button></div>';},
onOpen:function(){}};
window._bcosMonoRoll=function(){const d=['⚀','⚁','⚂','⚃','⚄','⚅'];const r=Math.floor(Math.random()*6);const dEl=document.getElementById('mono-dice');const rEl=document.getElementById('mono-res');if(dEl)dEl.textContent=d[r];if(rEl)rEl.textContent='掷出了 '+(r+1)+' 点！';};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['monopoly']=window._bcosAppMonopoly;console.log('[App] monopoly 已注册');})();
