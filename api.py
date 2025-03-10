# 你的高德 API Key"f5be8cdf1391fe2323abc034220d2676"

import requests

# 你的高德 API Key
API_KEY = "f5be8cdf1391fe2323abc034220d2676"

# 你的小区中心点坐标（需要自己查找）
LOCATION = "121.318905,30.745233"

# 搜索范围（单位：米）
RADIUS = 10000  # 10公里

# 你想要搜索的充电站关键词（可自定义）
KEYWORDS = "小鹏充电"

# 高德 POI 搜索 API URL
SEARCH_URL = "https://restapi.amap.com/v3/place/around"

# 请求参数
params = {
    "key": API_KEY,
    "location": LOCATION,  # 以小区为中心
    "radius": RADIUS,  # 10公里范围
    "keywords": KEYWORDS,  # 关键词搜索
    "types": "011100|011102|011103|073000|073001|073002",  # 充电站类别
    "offset": 10,  # 每页返回10个
    "page": 1,  # 第1页
    "extensions": "all",  # 获取全部扩展信息
    "output": "json"
}

# 发送请求
response = requests.get(SEARCH_URL, params=params)

# 解析返回结果
if response.status_code == 200:
    data = response.json()
    if "pois" in data and len(data["pois"]) > 0:
        for i, poi in enumerate(data["pois"]):
            print(f"\n[{i+1}] 充电站信息：")
            print(f"名称: {poi.get('name', '未知')}")
            print(f"地址: {poi.get('address', '未知')}")
            print(f"坐标: {poi.get('location', '未知')}")
            print(f"联系方式: {poi.get('tel', '无')}")
            
            # 获取图片信息
            photos = poi.get("photos", [])
            if photos:
                print("📷 充电站图片：")
                for photo in photos:
                    print(photo.get("url", "无图片"))
            else:
                print("⚠️ 该充电站没有提供图片")

            # 其他信息
            biz_ext = poi.get("biz_ext", {})
            if biz_ext:
                print(f"额外信息: {biz_ext}")
            parking_info = poi.get("parking_type", "未知")
            print(f"停车类型: {parking_info}")
            if "rating" in biz_ext:
                print(f"评分: {biz_ext.get('rating', '暂无')}")
            if "cost" in biz_ext:
                print(f"费用: {biz_ext.get('cost', '暂无')}")
    else:
        print("❌ 未找到充电站信息")
else:
    print("❌ API 请求失败:", response.status_code)