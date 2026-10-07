import os
import re
import json
import base64
from io import BytesIO
from PIL import Image, ImageFilter

wp_dir = 'wallpaper'
manifest_path = os.path.join(wp_dir, 'manifest.json')
placeholders_path = os.path.join(wp_dir, 'placeholders.json')

# Target Retina 2.5K Ultra-HD resolution
MAX_DIM = 2560
JPEG_QUALITY = 88

# Master Wallpaper Registry (All 14 wallpapers)
METADATA = {
    'Starlight210128.jpg': {
        'id': 'starlight',
        'name': '星空原野 · 银河漫步',
        'b64_fallback': 'wallpaper/Starlight210128.min.b64'
    },
    '1126942.jpg': {
        'id': 'illustration',
        'name': '梦幻插画 · 浪漫次元',
        'b64_fallback': 'wallpaper/1126942.min.b64'
    },
    'IMG_2833.PNG': {
        'id': 'bunny_snow',
        'name': '兔可可 · 纯真雪白',
        'b64_fallback': 'wallpaper/IMG_2833.min.b64'
    },
    '1204143.jpg': { 'id': 'wp_1204143', 'name': '原野星辉 · 宁静之夜' },
    '177002252600796.JPG': { 'id': 'wp_1770022526', 'name': '相伴日常 · 甜蜜时光' },
    '177002254500-200.JPG': { 'id': 'wp_1770022545', 'name': '温暖守候 · 兔兔温情' },
    '2560x1600-61829-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.jpg': { 'id': 'it_takes_two_1', 'name': '双人成行 · 奇幻冒险' },
    '2560x1600-61834-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.jpg': { 'id': 'it_takes_two_2', 'name': '双人成行 · 携手同行' },
    '61b5bd7f37541.jpg': { 'id': 'wp_61b5bd7f', 'name': '唯美意境 · 梦幻霞光' },
    '61b5bd7f375412.jpg': { 'id': 'wp_61b5bd7f2', 'name': '绚丽晨曦 · 光影随行' },
    '8736.JPG': { 'id': 'wp_8736', 'name': '旅途风景 · 旷野纪行' },
    '9f794a9a-d3cb-46ec-9dcd-6bbfc0bff027.jpg': { 'id': 'wp_9f794a', 'name': '深邃星云 · 苍穹之境' },
    'hollow_knight.jpeg': { 'id': 'hollow_knight_1', 'name': '空洞骑士 · 圣巢幽光' },
    'hollow_knight_2.jpeg': { 'id': 'hollow_knight_2', 'name': '空洞骑士 · 泪水之城' }
}

def extract_rich_edge_colors(img):
    img = img.convert('RGB')
    w, h = img.size
    top_h = max(1, int(h * 0.08))
    bot_y = max(0, h - top_h)
    left_w = max(1, int(w * 0.08))
    right_x = max(0, w - left_w)
    top_col = img.crop((0, 0, w, top_h)).resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    bottom_col = img.crop((0, bot_y, w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    left_col = img.crop((0, 0, left_w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    right_col = img.crop((right_x, 0, w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    dom = (
        int((top_col[0] + bottom_col[0] + left_col[0] + right_col[0]) / 4),
        int((top_col[1] + bottom_col[1] + left_col[1] + right_col[1]) / 4),
        int((top_col[2] + bottom_col[2] + left_col[2] + right_col[2]) / 4)
    )
    return {
        'dominant': f'rgb({dom[0]},{dom[1]},{dom[2]})',
        'dominantRgb': f'{dom[0]},{dom[1]},{dom[2]}',
        'top': f'rgb({top_col[0]},{top_col[1]},{top_col[2]})',
        'topRgb': f'{top_col[0]},{top_col[1]},{top_col[2]}',
        'bottom': f'rgb({bottom_col[0]},{bottom_col[1]},{bottom_col[2]})',
        'bottomRgb': f'{bottom_col[0]},{bottom_col[1]},{bottom_col[2]}',
        'left': f'rgb({left_col[0]},{left_col[1]},{left_col[2]})',
        'leftRgb': f'{left_col[0]},{left_col[1]},{left_col[2]}',
        'right': f'rgb({right_col[0]},{right_col[1]},{right_col[2]})',
        'rightRgb': f'{right_col[0]},{right_col[1]},{right_col[2]}'
    }

def generate_placeholder_b64(img):
    img = img.convert('RGB')
    thumb = img.resize((32, 20), Image.Resampling.BOX)
    buf = BytesIO()
    thumb.save(buf, format='JPEG', quality=65)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')

def split_and_save_b64(img, base_filename, num_parts=3):
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=86, optimize=True)
    b64_full = base64.b64encode(buf.getvalue()).decode('ascii')
    part_len = (len(b64_full) + num_parts - 1) // num_parts
    for i in range(num_parts):
        chunk = b64_full[i*part_len : (i+1)*part_len]
        part_path = f"{base_filename}.p{i+1}"
        with open(part_path, 'w', encoding='utf-8') as pf:
            pf.write(chunk)
    return len(b64_full)

placeholders = {}
all_wallpapers = []

# Scan extra user wallpapers in folder if any
if os.path.exists(wp_dir):
    for f in os.listdir(wp_dir):
        lf = f.lower()
        if lf.endswith(('.jpg', '.jpeg', '.png', '.webp')) and not f.endswith('.opt.jpg') and not f.endswith('.min.b64'):
            if f not in METADATA:
                clean_name = re.sub(r'\.[^.]+$', '', f).replace('_', ' ').replace('-', ' ').strip()
                METADATA[f] = {
                    'id': 'wp_' + re.sub(r'[^a-zA-Z0-9_]', '', clean_name)[:20].lower(),
                    'name': clean_name.title() or '自选座舱壁纸'
                }

for raw_name, meta in METADATA.items():
    raw_path = os.path.join(wp_dir, raw_name)
    opt_name = re.sub(r'\.[^/.]+$', '.opt.jpg', raw_name)
    opt_path = os.path.join(wp_dir, opt_name)
    file_key = f"wallpaper/{opt_name}"

    if os.path.exists(raw_path):
        with Image.open(raw_path) as img:
            img = img.convert('RGB')
            w, h = img.size

            # Scale to 2.5K Retina while maintaining aspect ratio
            if w > MAX_DIM or h > MAX_DIM:
                if w > h:
                    nw = MAX_DIM
                    nh = int(h * MAX_DIM / w)
                else:
                    nh = MAX_DIM
                    nw = int(w * MAX_DIM / h)
                img_resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
            else:
                nw, nh = w, h
                img_resized = img

            # Micro-contrast preservation filter (eliminates resampling softness)
            img_crisp = img_resized.filter(ImageFilter.UnsharpMask(radius=1.0, percent=35, threshold=2))

            # 1. Save Progressive JPEG (4:4:4 subsampling=0 for razor-sharp color & crisp text)
            img_crisp.save(opt_path, 'JPEG', quality=JPEG_QUALITY, progressive=True, optimize=True, subsampling=0)
            opt_size = os.path.getsize(opt_path)

            # 2. Extract rich edge colors for luxury ambient frosted glass illumination
            edge_colors = extract_rich_edge_colors(img)

            # 3. Generate 32x20 blur-up thumbnail
            b64_ph = generate_placeholder_b64(img)
            placeholders[file_key] = b64_ph
            placeholders[f"wallpaper/{raw_name}"] = b64_ph

            # 4. If this wallpaper has b64 fallback parts, re-encode them at Retina 2.5K
            b64_fallback = meta.get('b64_fallback')
            if b64_fallback:
                num_parts = 3 if opt_size < 900000 else 4
                b64_size = split_and_save_b64(img_crisp, b64_fallback, num_parts)
                placeholders[b64_fallback] = b64_ph
                print(f"Updated 2.5K B64 parts for {raw_name}: {b64_size/1024:.1f} KB in {num_parts} parts")

            aspect_ratio = round(nw / nh, 3)
            orientation = 'landscape' if nw > nh else ('portrait' if nh > nw else 'square')

            entry = {
                "id": meta['id'],
                "name": meta['name'],
                "file": file_key,
                "b64": False,
                "width": nw,
                "height": nh,
                "aspectRatio": aspect_ratio,
                "orientation": orientation,
                "size": opt_size,
                "edgeColors": edge_colors
            }
            if b64_fallback:
                entry["b64_fallback"] = b64_fallback

            all_wallpapers.append(entry)
            print(f"Optimized {raw_name}: {w}x{h} -> {nw}x{nh} ({opt_size/1024:.1f} KB) | Aspect: {aspect_ratio} ({orientation}) | Edge: {edge_colors['dominant']}")

    elif os.path.exists(opt_path):
        with Image.open(opt_path) as img:
            w, h = img.size
            edge_colors = extract_rich_edge_colors(img)
            b64_ph = generate_placeholder_b64(img)
            opt_size = os.path.getsize(opt_path)
            placeholders[file_key] = b64_ph
            placeholders[f"wallpaper/{raw_name}"] = b64_ph
            aspect_ratio = round(w / h, 3)
            orientation = 'landscape' if w > h else ('portrait' if h > w else 'square')

            entry = {
                "id": meta['id'],
                "name": meta['name'],
                "file": file_key,
                "b64": False,
                "width": w,
                "height": h,
                "aspectRatio": aspect_ratio,
                "orientation": orientation,
                "size": opt_size,
                "edgeColors": edge_colors
            }
            all_wallpapers.append(entry)
            print(f"Sampled Existing {opt_name}: {w}x{h} ({opt_size/1024:.1f} KB) | Edge: {edge_colors['dominant']}")

# Save Manifest JSON
manifest_data = {
    "wallpapers": all_wallpapers,
    "updatedAt": "2026-10-04T22:58:00Z",
    "note": "Retina 2.5K Ultra-HD 画质升级版: 包含 14 款 2560px 4:4:4 无损色度渐进式壁纸，支持 Smart Fit 比例感知、四向边缘像素原色毛玻璃氛围弥散及 IndexedDB 永久本地秒开缓存"
}

with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)

print(f"\nManifest successfully updated with {len(all_wallpapers)} Retina 2.5K wallpapers!")

# Save Placeholders JSON
with open(placeholders_path, 'w', encoding='utf-8') as f:
    json.dump(placeholders, f, ensure_ascii=False, indent=2)

print(f"Placeholders saved ({len(placeholders)} entries)!")

# Synchronize index.html and car.html
for html_file in ['index.html', 'car.html']:
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        bw_json = 'const BUILTIN_WALLPAPERS = ' + json.dumps(all_wallpapers, ensure_ascii=False, indent=8) + ';'
        ph_json = 'const WP_PLACEHOLDER = ' + json.dumps(placeholders, ensure_ascii=False) + ';'
        content = re.sub(r'const BUILTIN_WALLPAPERS = \[.*?\];', bw_json, content, flags=re.DOTALL)
        content = re.sub(r'const WP_PLACEHOLDER = \{.*?\};', ph_json, content, flags=re.DOTALL)
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Synchronized {html_file}")
