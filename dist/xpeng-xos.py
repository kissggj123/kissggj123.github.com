import tkinter as tk
from tkinter import messagebox
import random

class XOS7otteryTool:
    def __init__(self, root):
        self.root = root
        self.root.title("XOS地鸡内测抽奖工具")
        self.root.geometry("400x400")
        
        # 初始化状态
        self.status = "未开始"
        self.winner = ""
        self.blacklist = False
        self.pool = [
            "OTA等成望车石", "鹏厂韭菜苗", "智驾画龙大师", "G9续航侦探",
            "充电桩常驻嘉宾", "激光雷达清洁工", "NGP人工监工",
            "800V反冲斗士", "鹏翼门夹发侠", "自动泊车救火员",
            "小P复读机", "超充排队王者", "续航焦虑晚期",
            "城市NGP路障", "车机重启专家", "鹏友圈反话王",
            "智能座舱杠精", "辅助驾驶背锅侠", "鹏厂财报分析师",
            "充电地图纠错员", "电池日历党", "车主群阴阳师",
            "软件更新体验官", "韭菜车主代表"
        ]
        self.selected = []
        self.search = ""
        
        # UI Components
        self.create_widgets()

    def create_widgets(self):
        # 搜索框
        self.search_label = tk.Label(self.root, text="搜索:")
        self.search_label.pack(pady=10)
        self.search_entry = tk.Entry(self.root, width=50)
        self.search_entry.pack(pady=10)
        self.search_entry.bind("<KeyRelease>", self.update_search)
        
        # 标题
        self.title_label = tk.Label(self.root, text="XOS地鸡内测名单", font=("Arial", 16))
        self.title_label.pack(pady=10)
        
        # 状态和黑名单
        self.status_label = tk.Label(self.root, text=f"{self.status} | {'黑粉' if self.blacklist else '鹏友'}", font=("Arial", 12))
        self.status_label.pack(pady=10)
        
        # 开始抽奖按钮
        self.start_button = tk.Button(self.root, text="开始抽奖", command=self.start_lottery)
        self.start_button.pack(pady=10)
        
        # 左右两列显示
        self.left_frame = tk.Frame(self.root)
        self.left_frame.pack(side="left", padx=10)
        
        self.right_frame = tk.Frame(self.root)
        self.right_frame.pack(side="right", padx=10)

        # 左侧已抽中
        self.selected_label = tk.Label(self.left_frame, text="韭菜名单", font=("Arial", 12))
        self.selected_label.pack(pady=5)
        self.selected_listbox = tk.Listbox(self.left_frame, height=10, width=30)
        self.selected_listbox.pack(pady=5)

        # 右侧已抽中（加后缀）
        self.selected_with_suffix_label = tk.Label(self.right_frame, text="大冤种", font=("Arial", 12))
        self.selected_with_suffix_label.pack(pady=5)
        self.selected_with_suffix_listbox = tk.Listbox(self.right_frame, height=10, width=30)
        self.selected_with_suffix_listbox.pack(pady=5)
        
    def update_search(self, event=None):
        self.search = self.search_entry.get().lower()
        self.update_pool()

    def update_pool(self):
        # 更新搜索过滤列表，未显示在界面上
        pass

    def start_lottery(self):
        if not self.pool:
            messagebox.showinfo("提示", "没有更多名单可以抽奖了！")
            return
        
        self.status = "进行中"
        random_name = random.choice(self.pool)
        self.winner = random_name
        
        # 随机选择状态，"黑粉" 或 "鹏友"
        self.blacklist = random.choice([True, False])

        # 更新已抽中的名单
        self.selected.append(self.winner)
        
        # 从未抽中的名单中移除已抽中的人
        self.pool.remove(self.winner)
        
        # 更新 UI 左侧和右侧的名单
        self.selected_listbox.delete(0, tk.END)  # 清空左侧名单
        self.selected_with_suffix_listbox.delete(0, tk.END)  # 清空右侧名单

        for name in self.selected:
            self.selected_listbox.insert(tk.END, name)
            self.selected_with_suffix_listbox.insert(tk.END, f"{name}（1）")

        # 更新状态
        self.status_label.config(text=f"{self.status} | {'黑粉' if self.blacklist else '鹏友'}")

# 设置主窗口
root = tk.Tk()
lottery_tool = XOS7otteryTool(root)
root.mainloop()
