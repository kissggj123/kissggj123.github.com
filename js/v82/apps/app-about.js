/* v8.2 app-about.js - 关于 */
(function(){'use strict';
window._bcosAppAbout={id:'about',name:'About',icon:'🎀',
render:function(){const v=window.BCOS_VERSION||'v8.2.0';return '<div style="padding:24px;color:#fff;text-align:center"><div style="font-size:64px">🐰</div><div style="font-size:24px;font-weight:800;margin:12px 0;background:linear-gradient(90deg,#7c8cff,#b48cff);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Bunny Cockpit OS</div><div style="opacity:.6">'+v+' · Aurora</div><div style="margin-top:20px;font-size:13px;opacity:.5">兔可可纪念日 · 为爱而生</div></div>';},
onOpen:function(){}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['about']=window._bcosAppAbout;console.log('[App] about 已注册');})();
