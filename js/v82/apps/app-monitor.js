/* v8.2 app-monitor.js - 监视器 */
(function(){'use strict';
window._bcosAppMonitor={id:'monitor',name:'Monitor',icon:'📊',
render:function(){return '<div style="padding:16px;color:#fff"><h3>系统监视器</h3><div id="mon-info">加载中...</div><div style="margin-top:12px"><button onclick="_bcosMonRefresh()" style="padding:8px 16px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">刷新</button></div></div>';},
onOpen:function(){window._bcosMonRefresh();}};
window._bcosMonRefresh=function(){const el=document.getElementById('mon-info');if(!el)return;const mem=performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(1)+' MB':'未知';el.innerHTML='CPU核心: '+(navigator.hardwareConcurrency||'未知')+'<br>内存: '+mem+'<br>DOM节点: '+document.getElementsByTagName('*').length+'<br>运行时间: '+Math.floor((Date.now()-(window._bcosBootTime||Date.now()))/1000)+'s';};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['monitor']=window._bcosAppMonitor;console.log('[App] monitor 已注册');})();
