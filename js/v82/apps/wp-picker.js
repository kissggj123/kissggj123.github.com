/* v8.2 apps/wp-picker.js - 壁纸选择器 */
(function() {
    'use strict';
    window._bcosWpPickerOpen = function(containerId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const wps = window.BUILTIN_WALLPAPERS || [];
        const cur = localStorage.getItem('bcosCustomBg') || '';
        let html = '<div class="wp-grid-v82">';
        for (let i=0; i<wps.length; i++) {
            const w = wps[i];
            const sel = (w.file === cur) ? ' sel' : '';
            const thumb = (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[w.file]) || w.file;
            html += '<div class="wp-tile-v82' + sel + '" data-file="' + w.file + '">' +
                '<img src="' + thumb + '" loading="lazy" alt="' + w.name + '">' +
                '<span>' + w.name + '</span></div>';
        }
        html += '</div>';
        c.innerHTML = html;
        const tiles = c.querySelectorAll('.wp-tile-v82');
        for (let i=0; i<tiles.length; i++) {
            (function(tile){
                tile.addEventListener('click', function(){
                    const f = tile.getAttribute('data-file');
                    if (window._bcosSetWallpaper) window._bcosSetWallpaper(f);
                    for (let j=0; j<tiles.length; j++) tiles[j].classList.remove('sel');
                    tile.classList.add('sel');
                    console.log('[WpPicker] 已选择:', f);
                });
            })(tiles[i]);
        }
    };
    console.log('[WpPicker] v8.2 壁纸选择器已加载');
})();
