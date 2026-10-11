/* v8.2 app-music.js - 音乐 */
(function(){'use strict';
window._bcosAppMusic={id:'music',name:'音乐',icon:'🎵',
render:function(){return '<div style="padding:24px;color:#fff;text-align:center"><div style="font-size:64px">🎵</div><h3>音乐</h3><div style="opacity:.6">本地音乐播放器</div><div style="margin-top:16px"><input type="file" accept="audio/*" id="mus-file" style="display:none" onchange="_bcosMusLoad()"><button onclick="document.getElementById(\'mus-file\').click()" style="padding:10px 24px;border-radius:10px;border:none;background:#7c8cff;color:#fff;cursor:pointer">选择音频</button></div><audio id="mus-audio" controls style="width:100%;margin-top:16px"></audio></div>';},
onOpen:function(){}};
window._bcosMusLoad=function(){const f=document.getElementById('mus-file');const a=document.getElementById('mus-audio');if(f.files[0])a.src=URL.createObjectURL(f.files[0]);};
if(!window._bcosV82Apps)window._bcosV82Apps={};window._bcosV82Apps['music']=window._bcosAppMusic;console.log('[App] music 已注册');})();
