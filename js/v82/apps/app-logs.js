/* v8.2 app-logs.js - 运行日志 */
(function(){'use strict';
window._bcosAppLogs={id:'logs',name:'运行日志',icon:'📜',
render:function(){return '<div style="padding:16px;color:#fff"><div style="margin-bottom:12px"><button onclick="_bcosLogsRefresh()" style="padding:8px 16px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">刷新</button> <button onclick="_bcosLogsClear()" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;cursor:pointer">清空</button></div><pre id="logs-pre" style="background:rgba(0,0,0,.4);padding:12px;border-radius:8px;font-size:12px;max-height:300px;overflow:auto"></pre></div>';},
onOpen:function(){window._bcosLogsRefresh();}};
window._bcosLogsRefresh=function(){const el=document.getElementById('logs-pre');if(el)el.textContent='[v8.2] 日志系统就绪\n[Boot] 启动完成\n[Theme] 壁纸已应用';};
window._bcosLogsClear=function(){const el=document.getElementById('logs-pre');if(el)el.textContent='';};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['logs']=window._bcosAppLogs;console.log('[App] logs 已注册');})();
