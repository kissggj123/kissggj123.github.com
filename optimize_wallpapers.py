import os
import re
import json
import base64
from io import BytesIO
from PIL import Image

wp_dir = 'wallpaper'
manifest_path = os.path.join(wp_dir, 'manifest.json')
placeholders_path = os.path.join(wp_dir, 'placeholders.json')

existing_manifest = {}
if os.path.exists(manifest_path):
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            existing_manifest = json.load(f)
    except Exception:
        existing_manifest = {}

existing_placeholders = {}
if os.path.exists(placeholders_path):
    try:
        with open(placeholders_path, 'r', encoding='utf-8') as f:
            existing_placeholders = json.load(f)
    except Exception:
        existing_placeholders = {}

existing_by_file = {w.get('file'): w for w in existing_manifest.get('wallpapers', []) if w.get('file')}
existing_by_id = {w.get('id'): w for w in existing_manifest.get('wallpapers', []) if w.get('id')}

# Mapping of base64 split wallpapers to raw files and parts
BASE_B64 = {
    'Starlight210128.jpg': {
        'id': 'starlight',
        'name': '星空原野 · 银河漫步',
        'file': 'wallpaper/Starlight210128.min.b64',
        'b64': True,
        'parts': 3,
        'size': 296020
    },
    '1126942.jpg': {
        'id': 'illustration',
        'name': '梦幻插画 · 浪漫次元',
        'file': 'wallpaper/1126942.min.b64',
        'b64': True,
        'parts': 1,
        'size': 111336
    },
    'IMG_2833.PNG': {
        'id': 'bunny_snow',
        'name': '兔可可 · 纯真雪白',
        'file': 'wallpaper/IMG_2833.min.b64',
        'b64': True,
        'parts': 3,
        'size': 334780
    }
}

# Mapping of known files to custom IDs and Names
METADATA = {
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

def extract_edge_colors(img):
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
    dom_col = (
        int((top_col[0] + bottom_col[0] + left_col[0] + right_col[0]) / 4),
        int((top_col[1] + bottom_col[1] + left_col[1] + right_col[1]) / 4),
        int((top_col[2] + bottom_col[2] + left_col[2] + right_col[2]) / 4)
    )
    return {
        'dominant': f'rgb({dom_col[0]},{dom_col[1]},{dom_col[2]})',
        'top': f'rgb({top_col[0]},{top_col[1]},{top_col[2]})',
        'bottom': f'rgb({bottom_col[0]},{bottom_col[1]},{bottom_col[2]})',
        'left': f'rgb({left_col[0]},{left_col[1]},{left_col[2]})',
        'right': f'rgb({right_col[0]},{right_col[1]},{right_col[2]})'
    }

def generate_placeholder_b64(img):
    img = img.convert('RGB')
    thumb = img.resize((32, 20), Image.Resampling.BOX)
    buf = BytesIO()
    thumb.save(buf, format='JPEG', quality=60)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')

# Scan any extra raw images in wallpaper directory
if os.path.exists(wp_dir):
    raw_files = [f for f in os.listdir(wp_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
                 and not f.endswith('.opt.jpg') and not f.endswith('.min.b64')]
    for rf in raw_files:
        if rf not in METADATA and rf not in BASE_B64:
            clean_name = re.sub(r'\.[^.]+$', '', rf).replace('_', ' ').replace('-', ' ').strip()
            METADATA[rf] = {
                'id': 'wp_' + re.sub(r'[^a-zA-Z0-9_]', '', clean_name)[:20].lower(),
                'name': clean_name.title() or '自选座舱壁纸'
            }

placeholders = dict(existing_placeholders)
base_wallpapers = []

# Process the base64 split wallpapers using their raw source files or existing metadata
for raw_name, info in BASE_B64.items():
    raw_path = os.path.join(wp_dir, raw_name)
    b64_entry = dict(info)
    if os.path.exists(raw_path):
        with Image.open(raw_path) as img:
            edge_colors = extract_edge_colors(img)
            b64_ph = generate_placeholder_b64(img)
            b64_entry['edgeColors'] = edge_colors
            placeholders[info['file']] = b64_ph
            placeholders[f"wallpaper/{raw_name}"] = b64_ph
            print(f"Sampled Base B64 {raw_name}: Edge: {edge_colors['dominant']}")
    else:
        # Fallback to existing manifest/placeholders entry
        prev = existing_by_file.get(info['file']) or existing_by_id.get(info['id'])
        if prev and prev.get('edgeColors'):
            b64_entry['edgeColors'] = prev['edgeColors']
        else:
            b64_entry['edgeColors'] = {
                'dominant': 'rgb(20,24,36)',
                'top': 'rgb(20,24,36)',
                'bottom': 'rgb(20,24,36)',
                'left': 'rgb(20,24,36)',
                'right': 'rgb(20,24,36)'
            }
        print(f"Retained Base B64 {info['name']}: Edge: {b64_entry['edgeColors']['dominant']}")
    base_wallpapers.append(b64_entry)

new_wallpapers = []

for raw_name, meta in METADATA.items():
    raw_path = os.path.join(wp_dir, raw_name)
    opt_name = re.sub(r'\.[^/.]+$', '.opt.jpg', raw_name)
    opt_path = os.path.join(wp_dir, opt_name)
    file_key = f"wallpaper/{opt_name}"

    if os.path.exists(raw_path):
        # 1. Optimize image: max 1920 width, progressive JPEG quality 82
        with Image.open(raw_path) as img:
            img = img.convert('RGB')
            w, h = img.size
            MAX_DIM = 1920
            if w > MAX_DIM or h > MAX_DIM:
                if w > h:
                    new_w = MAX_DIM
                    new_h = int(h * MAX_DIM / w)
                else:
                    new_h = MAX_DIM
                    new_w = int(w * MAX_DIM / h)
                img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            else:
                img_resized = img

            img_resized.save(opt_path, 'JPEG', quality=82, progressive=True, optimize=True)
            opt_size = os.path.getsize(opt_path)

            # 2. Extract edge colors for frosted glass ambient filling
            edge_colors = extract_edge_colors(img)

            # 3. Generate 32x20 tiny thumbnail for blur-up placeholder
            b64_ph = generate_placeholder_b64(img)
            placeholders[file_key] = b64_ph
            placeholders[f"wallpaper/{raw_name}"] = b64_ph

            new_entry = {
                "id": meta['id'],
                "name": meta['name'],
                "file": file_key,
                "b64": False,
                "size": opt_size,
                "edgeColors": edge_colors
            }
            new_wallpapers.append(new_entry)
            raw_size = os.path.getsize(raw_path)
            print(f"Optimized {raw_name}: {raw_size/1024:.1f} KB -> {opt_size/1024:.1f} KB (-{(1 - opt_size/raw_size)*100:.1f}%) | Edge: {edge_colors['dominant']}")
    elif os.path.exists(opt_path):
        # Raw file not present, but optimized jpg is present: sample from opt_path
        with Image.open(opt_path) as img:
            edge_colors = extract_edge_colors(img)
            b64_ph = generate_placeholder_b64(img)
            opt_size = os.path.getsize(opt_path)
            placeholders[file_key] = b64_ph
            placeholders[f"wallpaper/{raw_name}"] = b64_ph

            new_entry = {
                "id": meta['id'],
                "name": meta['name'],
                "file": file_key,
                "b64": False,
                "size": opt_size,
                "edgeColors": edge_colors
            }
            new_wallpapers.append(new_entry)
            print(f"Sampled Existing Opt {opt_name}: {opt_size/1024:.1f} KB | Edge: {edge_colors['dominant']}")
    else:
        # Neither raw nor opt file exists in folder, preserve from existing manifest if present
        prev = existing_by_file.get(file_key) or existing_by_id.get(meta['id'])
        if prev:
            new_wallpapers.append(prev)
            print(f"Preserved {meta['name']} from existing manifest")

# Combine all wallpapers
all_wallpapers = base_wallpapers + new_wallpapers
manifest_data = {
    "wallpapers": all_wallpapers,
    "updatedAt": "2026-10-04T22:48:00Z",
    "note": "国内网络 & GitHub Pages 深度优化版: 包含 3 款分片流式壁纸与 11 款 1920px 渐进式 JPEG 壁纸, 支持 IndexedDB 永久本地秒开缓存、模糊占位及四周环境毛玻璃边缘色采样"
}

with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)

print(f"\nManifest successfully updated with {len(all_wallpapers)} wallpapers!")

# Save placeholders mapping to JSON
with open(placeholders_path, 'w', encoding='utf-8') as f:
    json.dump(placeholders, f, ensure_ascii=False, indent=2)

print(f"Placeholders saved ({len(placeholders)} entries)!")

# Synchronize index.html and car.html if present
for html_file in ['index.html', 'car.html']:
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        bw_json = 'const BUILTIN_WALLPAPERS = ' + json.dumps(all_wallpapers, ensure_ascii=False, indent=8) + ';'
        ph_json = 'const WP_PLACEHOLDER = ' + json.dumps(placeholders, ensure_ascii=False) + ';'
        content = re.sub(r'const BUILTIN_WALLPAPERS = \[.*?\];', bw_json, content, flags=re.DOTALL)
        content = re.sub(r'const WP_PLACEHOLDER = \{.*?\};', ph_json, content, flags=re.DOTALL)
        content = re.sub(r'syncAmbientWallpaper\(layer\.style\.backgroundImage\)', 'syncAmbientWallpaper(layer.style.backgroundImage, cur)', content)
        content = content.replace(
            'if (layers[0] && layers[0].style.backgroundImage) {\n                    amb.style.backgroundImage = layers[0].style.backgroundImage;\n                }',
            'if (layers[0] && layers[0].style.backgroundImage) {\n                    syncAmbientWallpaper(layers[0].style.backgroundImage);\n                }'
        )
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Synchronized {html_file}")
