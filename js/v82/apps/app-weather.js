/* v8.2 app-weather.js - 天气 */
(function(){'use strict';
window._bcosAppWeather={id:'weather',name:'天气',icon:'🌤️',
render:function(){return '<div style="padding:24px;color:#fff;text-align:center"><div style="font-size:64px">🌤️</div><h3>天气</h3><div id="w-info" style="margin-top:12px;opacity:.8">加载中...</div></div>';},
onOpen:function(win){const el=win.querySelector('#w-info');if(el)el.innerHTML='大阪<br><span style="font-size:36px">18°C</span><br>多云';}};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['weather']=window._bcosAppWeather;console.log('[App] weather 已注册');})();
