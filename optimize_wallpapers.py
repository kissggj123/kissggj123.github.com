import os
import re
import json
import base64
from io import BytesIO
from PIL import Image

wp_dir = 'wallpaper'

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

# Scan all raw images in wallpaper directory
raw_files = [f for f in os.listdir(wp_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
             and not f.endswith('.opt.jpg') and not f.endswith('.min.b64')]

for rf in raw_files:
    if rf not in METADATA and rf not in ['Starlight210128.jpg', '1126942.jpg', 'IMG_2833.PNG']:
        clean_name = re.sub(r'\.[^.]+$', '', rf).replace('_', ' ').replace('-', ' ').strip()
        METADATA[rf] = {
            'id': 'wp_' + re.sub(r'[^a-zA-Z0-9_]', '', clean_name)[:20].lower(),
            'name': clean_name.title() or '自选座舱壁纸'
        }

# Read existing manifest
manifest_path = os.path.join(wp_dir, 'manifest.json')
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest_data = json.load(f)

# Keep the 3 original split b64 wallpapers
base_wallpapers = [w for w in manifest_data.get('wallpapers', []) if w.get('b64')]

placeholders = {
    "wallpaper/Starlight210128.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAgADADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaCcqQrlmz05q6DxWVuAA3gfhUySvglXJ59c1cZ23IcS9nFNaVFDbmA2jLZ7Cq/wBqxywGPUVl6hdQzxlWmDMucBQR+B9a0UkyGmjVgu1cKWYASMRH7gVKxrn9MOZgkgACguMDlTn1raMgJwDQtA3M6O5Q4AHOCMbc8+tSZAZgxKk88L1P0qKOPZ+8jbBx/F6+lPMrFDuRSPp0+tc6ZqAcurKrMpztPGMe9ZUttLbfOdrpuxuU5OPWtWGKQyCNlOAuS2/8qZLBJuCIy4z9zPOKpStsJpPcqacdzu2eQOOeaveYSdo5Y8BehpyRDzWRwN4PBI68VDuIVgqsWT7uDkihtt3BKysf/9k=",
    "wallpaper/1126942.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAbADADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwClweanjjyeRUAx9amWaSMDAXB4ya1uZs2dNSzSOUXEQldj8nGccVHqq2bGNbWHy2XO/jFZ8Ny0chI3DPJGcZqeW/dkPykOD1Y54qb6hZlNgyZxkVEWqWSYyDhcLjknuahbFUC8x8KZ5q8sAkQqMcjg1Utq3dHRXm+YA01sQ7tmJOs8rvK0bYAAJC4HHFJAWMmxUYs429M1o6qSb51ydqjgelWdNjR1V3XLKflPpWUnY6aUPaXM+S2KHyyuCOBz1qjcQtC5VwQR2Nad3M86yea27Y5VeMYGKi1EBrC0kIy7ZBPr0q73MbcrP//Z",
    "wallpaper/IMG_2833.min.b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAbADADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDm43ZVAJNXbd9zEljkdAKWC2RpDnzHUHgRr1H1pxsZNxZUKAHjcaTV0BuaDNI0M4ZwwQ5Jqgy+c8rICSCSfQCn2QvLRH8hlAY/MCM5qSzQpKxKhycgZHIzUy1SQ0QBBGhkZTHEOSx6n8KkW1M2VjwcdiR0Ipt6kzXHzIzQoQQCeD7YqhdR3Czu6CUB2JUdMDNNJJaA3qXkVnxIHcJ/efgH6DqamM6KOFdjjktjP4elVkdmUFiSaCTmk433C5OtwAG+WXHXDEU1Z/lJAYH2bFLHyGB9Krr1o5UFywb8AKHiLAf3iDmnxXFu453REHorcVnygZz61CeDx6UKNth3P//Z"
}

new_wallpapers = []

for raw_name, meta in METADATA.items():
    raw_path = os.path.join(wp_dir, raw_name)
    if not os.path.exists(raw_path):
        print(f"Skipping {raw_name}, not found")
        continue

    # 1. Optimize image: max 1920 width, progressive JPEG quality 82
    opt_name = re.sub(r'\.[^/.]+$', '.opt.jpg', raw_name)
    opt_path = os.path.join(wp_dir, opt_name)
    
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
        top_h = max(1, int(h * 0.08))
        bot_y = max(0, h - top_h)
        left_w = max(1, int(w * 0.08))
        right_x = max(0, w - left_w)
        top_col = img.crop((0, 0, w, top_h)).resize((1, 1), Image.Resampling.BOX).getpixel((0,0))
        bottom_col = img.crop((0, bot_y, w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0,0))
        left_col = img.crop((0, 0, left_w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0,0))
        right_col = img.crop((right_x, 0, w, h)).resize((1, 1), Image.Resampling.BOX).getpixel((0,0))
        dom_col = (
            int((top_col[0] + bottom_col[0] + left_col[0] + right_col[0]) / 4),
            int((top_col[1] + bottom_col[1] + left_col[1] + right_col[1]) / 4),
            int((top_col[2] + bottom_col[2] + left_col[2] + right_col[2]) / 4)
        )
        edge_colors = {
            'dominant': f'rgb({dom_col[0]},{dom_col[1]},{dom_col[2]})',
            'top': f'rgb({top_col[0]},{top_col[1]},{top_col[2]})',
            'bottom': f'rgb({bottom_col[0]},{bottom_col[1]},{bottom_col[2]})',
            'left': f'rgb({left_col[0]},{left_col[1]},{left_col[2]})',
            'right': f'rgb({right_col[0]},{right_col[1]},{right_col[2]})'
        }

        # 3. Generate 32x20 tiny thumbnail for blur-up placeholder
        thumb = img.resize((32, 20), Image.Resampling.BOX)
        buf = BytesIO()
        thumb.save(buf, format='JPEG', quality=60)
        b64_ph = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')
        
        file_key = f"wallpaper/{opt_name}"
        placeholders[file_key] = b64_ph
        # Also map raw filename in case raw is referenced
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

# Combine all wallpapers
all_wallpapers = base_wallpapers + new_wallpapers
manifest_data['wallpapers'] = all_wallpapers
manifest_data['updatedAt'] = "2026-10-01T17:25:00Z"
manifest_data['note'] = "国内网络 & GitHub Pages 深度优化版: 包含 3 款分片流式壁纸与 11 款 1920px 渐进式 JPEG 壁纸, 支持 IndexedDB 永久本地秒开缓存与模糊占位"

with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)

print(f"\nManifest successfully updated with {len(all_wallpapers)} wallpapers!")

# Save placeholders mapping to JSON
with open('wallpaper/placeholders.json', 'w', encoding='utf-8') as f:
    json.dump(placeholders, f, ensure_ascii=False, indent=2)

print(f"Placeholders saved ({len(placeholders)} entries)!")
