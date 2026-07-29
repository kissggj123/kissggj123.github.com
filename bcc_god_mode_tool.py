#!/usr/bin/env python3
"""
Bunny CC 上帝模式激活码工具 v6.0 (ECDSA Challenge-Response)
============================================================
安全架构:
  - 浏览器生成 32 字符十六进制挑战码 (16 随机字节)
  - 本工具用 ECDSA P-256 私钥对挑战码 UTF-8 编码签名 (SHA-256)
  - 签名以十六进制 raw r||s 格式输出 (128 字符 = 64 字节)
  - 浏览器用内嵌的公钥验证签名

安全保证:
  - 每次激活挑战码不同 (含随机 nonce)
  - 私钥仅存在于此工具中，浏览器只有公钥
  - 无法通过查看网页源码伪造激活码

用法:
  GUI:    python3 bcc_god_mode_tool.py
  CLI:    python3 bcc_god_mode_tool.py --cli
  签名:   python3 bcc_god_mode_tool.py sign <32-char-hex-challenge>
"""

import sys
import json
import base64
import hashlib
import argparse
from datetime import datetime

# ============================================================
# ECDSA 私钥 (PKCS#8 PEM 格式, P-256 曲线)
# 对应公钥已硬编码在 index.html 的 CONFIG.GOD_MODE_PUBLIC_KEY 中
# ============================================================
PRIVATE_KEY_PEM = b"""-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgsaV3i1qRx8KcBNPf
RMHuQpYmqLMw7WPsC95YmacYFVahRANCAARoNbDOW9COtes7MifLrYTLX8uuvRwD
qGYn6w1nUPPptauovlMMeiolhAG75DYqOm+9TPRUOtm3TNWnJT0GRe7n
-----END PRIVATE KEY-----"""

# 对应的公钥 (JWK 格式, 用于验证)
PUBLIC_JWK = {
    "kty": "EC",
    "crv": "P-256",
    "x": "aDWwzlvQjrXrOzIny62Ey1_Lrr0cA6hmJ-sNZ1Dz6bU",
    "y": "q6i-Uwx6KiWEAbvkNio6b71M9FQ62bdM1aclPQZF7uc",
}

# ============================================================
# Base32 编解码 (与 JavaScript 实现完全一致)
# ============================================================
B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
B32_INDEX = {c: i for i, c in enumerate(B32_ALPHABET)}


def b32_decode(s: str) -> bytes:
    """Base32 解码 — 匹配 JS b32decode()"""
    s = s.upper().replace("-", "").replace(" ", "")
    s = "".join(c for c in s if c in B32_INDEX)
    result = bytearray()
    buf = 0
    bits = 0
    for c in s:
        v = B32_INDEX[c]
        buf = (buf << 5) | v
        bits += 5
        if bits >= 8:
            result.append((buf >> (bits - 8)) & 0xFF)
            bits -= 8
    return bytes(result)


def b32_encode(data: bytes) -> str:
    """Base32 编码 — 匹配 JS b32encode()"""
    result = []
    buf = 0
    bits = 0
    for b in data:
        buf = (buf << 8) | b
        bits += 8
        while bits >= 5:
            result.append(B32_ALPHABET[(buf >> (bits - 5)) & 31])
            bits -= 5
    if bits > 0:
        result.append(B32_ALPHABET[(buf << (5 - bits)) & 31])
    return "".join(result)


# ============================================================
# Base64URL 编解码
# ============================================================
def b64url_encode(data: bytes) -> str:
    """Base64URL 编码 (无填充)"""
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_decode(s: str) -> bytes:
    """Base64URL 解码"""
    s = s.replace("-", "+").replace("_", "/")
    pad = len(s) % 4
    if pad:
        s += "=" * (4 - pad)
    return base64.b64decode(s)


# ============================================================
# 挑战码解析
# ============================================================
def parse_challenge(challenge_str: str) -> bytes:
    """
    解析挑战码字符串，返回 UTF-8 编码字节

    网页端 generateChallenge() 生成 32 字符 hex 字符串，
    验证时使用 TextEncoder().encode(challenge) 即 UTF-8 编码。
    本函数保持一致：直接将挑战码字符串编码为 UTF-8 字节。
    """
    s = challenge_str.strip()
    # 移除可能的前缀和分隔符 (兼容旧格式 BCC-CHL-...)
    if s.upper().startswith("BCC-CHL-"):
        s = s[len("BCC-CHL-"):]
    elif s.upper().startswith("BCC-CHL"):
        s = s[len("BCC-CHL"):]
    s = s.replace("-", "").replace(" ", "")
    # 网页端直接将 hex 字符串作为 UTF-8 编码后签名
    return s.encode("utf-8")


# ============================================================
# ECDSA 签名
# ============================================================
def sign_challenge(challenge_data: bytes) -> str:
    """
    用 ECDSA P-256 私钥签名挑战数据

    返回: 十六进制 raw r||s 签名 (128 字符 = 64 字节)
    网页端 sigHex.match(/.{1,2}/g) 解析此格式
    """
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
    except ImportError:
        raise ImportError(
            "需要 cryptography 库。请运行:\n"
            "  pip3 install cryptography --break-system-packages\n"
            "或:\n"
            "  pip3 install cryptography"
        )

    # 加载私钥
    private_key = serialization.load_pem_private_key(PRIVATE_KEY_PEM, password=None)

    # 用 ECDSA + SHA-256 签名 (产生 DER 编码的签名)
    der_signature = private_key.sign(challenge_data, ec.ECDSA(hashes.SHA256()))

    # 将 DER 签名转换为 raw r||s 格式 (64 字节)
    # Web Crypto API 的 verify() 期望 raw 格式
    raw_signature = der_to_raw(der_signature)

    # 返回十六进制格式 (网页端 sigHex.match(/.{1,2}/g) 解析)
    return raw_signature.hex()


def der_to_raw(der_sig: bytes) -> bytes:
    """
    将 DER 编码的 ECDSA 签名转换为 raw r||s 格式

    DER 格式: SEQUENCE { INTEGER r, INTEGER s }
    Raw 格式: r (32 bytes) || s (32 bytes) = 64 bytes total
    """
    try:
        from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    except ImportError:
        raise ImportError("需要 cryptography 库")

    r, s = decode_dss_signature(der_sig)

    # 将 r 和 s 转换为 32 字节大端整数
    r_bytes = r.to_bytes(32, "big")
    s_bytes = s.to_bytes(32, "big")

    return r_bytes + s_bytes


# ============================================================
# 验证签名 (用于本地测试)
# ============================================================
def verify_signature(challenge_data: bytes, signature_raw: bytes) -> bool:
    """用公钥验证签名 (本地测试用)"""
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
    except ImportError:
        raise ImportError("需要 cryptography 库")

    # 从 raw 签名重建 DER 格式
    r = int.from_bytes(signature_raw[:32], "big")
    s = int.from_bytes(signature_raw[32:], "big")
    der_sig = encode_dss_signature(r, s)

    # 从 JWK 构建公钥
    x_bytes = base64url_decode(PUBLIC_JWK["x"])
    y_bytes = base64url_decode(PUBLIC_JWK["y"])
    pub_numbers = ec.EllipticCurvePublicNumbers(
        x=int.from_bytes(x_bytes, "big"),
        y=int.from_bytes(y_bytes, "big"),
        curve=ec.SECP256R1(),
    )
    public_key = pub_numbers.public_key()

    try:
        public_key.verify(der_sig, challenge_data, ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False


# ============================================================
# CLI 接口
# ============================================================
def cli_sign(challenge_str: str) -> str:
    """签名挑战码并返回激活码"""
    challenge_data = parse_challenge(challenge_str)
    activation_code = sign_challenge(challenge_data)
    return activation_code


def cli_verify(challenge_str: str, activation_str: str) -> dict:
    """验证激活码是否匹配挑战码"""
    challenge_data = parse_challenge(challenge_str)

    # 从激活码提取签名 (十六进制格式)
    act = activation_str.strip()
    # 移除可能的前缀 (兼容旧格式 BCC-ACT-...)
    if act.upper().startswith("BCC-ACT-"):
        act = act[len("BCC-ACT-"):]
    elif act.upper().startswith("BCC-ACT"):
        act = act[len("BCC-ACT"):]
    act = act.replace("-", "").replace(" ", "")

    # 将十六进制字符串转换为字节
    try:
        signature_raw = bytes.fromhex(act)
    except ValueError as e:
        return {"valid": False, "error": f"签名十六进制解析失败: {e}"}

    if len(signature_raw) != 64:
        return {"valid": False, "error": f"签名长度错误: 期望 64 字节, 得到 {len(signature_raw)} 字节"}

    valid = verify_signature(challenge_data, signature_raw)
    return {"valid": valid, "challenge_bytes": challenge_data.hex(), "signature_bytes": signature_raw.hex()}


def cli_info(challenge_str: str) -> dict:
    """解析挑战码信息"""
    data = parse_challenge(challenge_str)
    challenge_text = challenge_str.strip().replace("-", "").replace(" ", "")
    # 移除前缀
    if challenge_text.upper().startswith("BCC-CHL-"):
        challenge_text = challenge_text[len("BCC-CHL-"):]
    elif challenge_text.upper().startswith("BCC-CHL"):
        challenge_text = challenge_text[len("BCC-CHL"):]
    return {
        "challenge_text": challenge_text,
        "utf8_bytes_hex": data.hex(),
        "length": len(data),
    }


def run_cli():
    """命令行模式"""
    parser = argparse.ArgumentParser(
        description="Bunny CC God Mode 激活码工具 v6.0 (ECDSA)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s sign a1a100dc4314e3405dd3ad972f4f2379
  %(prog)s verify <challenge> <activation_hex>
  %(prog)s info a1a100dc4314e3405dd3ad972f4f2379
  %(prog)s                          # 启动 GUI
        """,
    )
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("sign", help="签名挑战码生成激活码(hex格式输出)").add_argument("challenge", help="挑战码 (32字符hex)")
    ver = sub.add_parser("verify", help="验证激活码")
    ver.add_argument("challenge", help="挑战码 (32字符hex)")
    ver.add_argument("activation", help="激活码 (128字符hex)")
    sub.add_parser("info", help="解析挑战码信息").add_argument("challenge", help="挑战码 (32字符hex)")

    args = parser.parse_args()

    if args.cmd == "sign":
        try:
            code = cli_sign(args.challenge)
            print(f"\n✓ 激活码生成成功！\n")
            print(f"  激活码: {code}\n")
            print(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  请将激活码粘贴到浏览器中的「输入十六进制签名」框中")
        except Exception as e:
            print(f"\n✗ 错误: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.cmd == "verify":
        try:
            result = cli_verify(args.challenge, args.activation)
            if result["valid"]:
                print(f"\n✓ 验证通过！签名有效")
                print(f"  挑战数据 (UTF-8 hex): {result['challenge_bytes']}")
                print(f"  签名数据 (hex): {result['signature_bytes']}")
            else:
                print(f"\n✗ 验证失败：签名无效", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"\n✗ 错误: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.cmd == "info":
        try:
            info = cli_info(args.challenge)
            print(f"\n挑战码信息:")
            print(f"  原始文本: {info['challenge_text']}")
            print(f"  UTF-8 字节 (hex): {info['utf8_bytes_hex']}")
            print(f"  数据长度: {info['length']} 字节")
        except Exception as e:
            print(f"\n✗ 错误: {e}", file=sys.stderr)
            sys.exit(1)

    else:
        # No subcommand → launch GUI
        run_gui()


# ============================================================
# Tkinter GUI
# ============================================================
def run_gui():
    """启动 Tkinter 图形界面"""
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
    except ImportError:
        print("错误: 需要 tkinter 模块。请安装 python3-tk")
        print("  macOS: brew install python-tk")
        print("  Ubuntu: sudo apt install python3-tk")
        sys.exit(1)

    # 检查 cryptography 库
    try:
        import cryptography  # noqa
    except ImportError:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "缺少依赖库",
            "需要 cryptography 库来生成激活码。\n\n"
            "请在终端运行:\n"
            "  pip3 install cryptography --break-system-packages\n\n"
            "安装后重新运行本工具。",
        )
        sys.exit(1)

    # 配色方案 — 兔可可主题 (精炼版)
    BG = "#FFF0F5"
    BG2 = "#FFE4EC"
    CARD = "#FFFFFF"
    TEXT = "#5D4E37"
    TEXT2 = "#9B8E7E"
    TEXT3 = "#C4B5A0"
    ACCENT = "#FF6B9D"
    ACCENT_DK = "#E85A87"
    ACCENT2 = "#FFB5BA"
    BORDER = "#FFD0DE"
    BORDER_LT = "#FFE9F0"
    GOOD = "#2E7D32"
    BAD = "#C62828"

    # 字体
    F_TITLE = ("Helvetica", 20, "bold")
    F_SUB = ("Helvetica", 11)
    F_BODY = ("Helvetica", 13)
    F_LABEL = ("Helvetica", 12, "bold")
    F_SMALL = ("Helvetica", 10)
    F_MONO = ("Menlo", 12)
    F_BTN = ("Helvetica", 13, "bold")
    F_BTN_S = ("Helvetica", 11)
    F_STATUS = ("Helvetica", 12)

    root = tk.Tk()
    root.title("🐰 兔可可 God Mode 激活码工具 v6.0")
    root.configure(bg=BG)
    root.resizable(False, False)

    # 窗口尺寸 & 居中
    window_w, window_h = 620, 780
    screen_w = root.winfo_screenwidth()
    screen_h = root.winfo_screenheight()
    x = (screen_w - window_w) // 2
    y = (screen_h - window_h) // 2
    root.geometry(f"{window_w}x{window_h}+{x}+{y}")

    # ttk 样式
    style = ttk.Style()
    style.theme_use("clam")
    style.configure("TFrame", background=BG)

    # 按钮: 主按钮 (粉色, 大号)
    style.configure("Primary.TButton", background=ACCENT, foreground="white",
                    font=F_BTN, borderwidth=0, focusthickness=0, padding=(28, 12))
    style.map("Primary.TButton", background=[("active", ACCENT_DK), ("pressed", ACCENT_DK)])
    # 按钮: 次要按钮 (浅粉底)
    style.configure("Secondary.TButton", background=BG2, foreground=ACCENT_DK,
                    font=F_BTN_S, borderwidth=0, focusthickness=0, padding=(14, 8))
    style.map("Secondary.TButton", background=[("active", ACCENT2), ("pressed", ACCENT2)])
    # 按钮: 幽灵按钮 (白底, 用于清空等)
    style.configure("Ghost.TButton", background=CARD, foreground=TEXT2,
                    font=F_BTN_S, borderwidth=0, focusthickness=0, padding=(14, 8))
    style.map("Ghost.TButton", background=[("active", BG2), ("pressed", BG2)])
    # 输入框
    style.configure("TEntry", fieldbackground=CARD, foreground=TEXT, font=F_MONO,
                    bordercolor=BORDER, lightcolor=BORDER, darkcolor=BORDER, padding=(10, 8))
    style.map("TEntry", bordercolor=[("focus", ACCENT)], lightcolor=[("focus", ACCENT)],
              darkcolor=[("focus", ACCENT)])

    # 卡片辅助函数: 白底 + 细边框
    def make_card(parent, padx=18, pady=14):
        card = tk.Frame(parent, bg=CARD, highlightbackground=BORDER,
                        highlightthickness=1, bd=0)
        inner = tk.Frame(card, bg=CARD, padx=padx, pady=pady)
        inner.pack(fill="both", expand=True)
        return card, inner

    # ===== 顶部装饰条 =====
    tk.Frame(root, bg=ACCENT, height=4).pack(fill="x")

    # ===== 主容器 =====
    main = tk.Frame(root, bg=BG, padx=28, pady=22)
    main.pack(fill="both", expand=True)

    # ===== 头部 (圆形 Logo + 标题) =====
    header = tk.Frame(main, bg=BG)
    header.pack(fill="x", pady=(0, 18))

    # 用 Canvas 绘制圆形 Logo 徽章
    logo_canvas = tk.Canvas(header, width=60, height=60, bg=BG, highlightthickness=0)
    logo_canvas.pack(side="left", padx=(0, 14))
    logo_canvas.create_oval(3, 3, 57, 57, fill=BG2, outline=BORDER, width=1)
    logo_canvas.create_text(30, 31, text="🐰", font=("Helvetica", 26))

    header_text = tk.Frame(header, bg=BG)
    header_text.pack(side="left", fill="x")
    tk.Label(header_text, text="兔可可 God Mode", bg=BG, fg=ACCENT_DK,
             font=F_TITLE).pack(anchor="w")
    tk.Label(header_text, text="ECDSA P-256 挑战-响应激活系统  ·  v6.0",
             bg=BG, fg=TEXT2, font=F_SUB).pack(anchor="w", pady=(2, 0))

    # ===== 步骤卡片 =====
    steps_card, steps_inner = make_card(main)
    steps_card.pack(fill="x", pady=(0, 14))

    tk.Label(steps_inner, text="使用步骤", bg=CARD, fg=ACCENT_DK,
             font=F_LABEL).pack(anchor="w", pady=(0, 8))
    for num, desc in [
        ("①", "在浏览器中点击「刷新挑战码」获取 hex 挑战码"),
        ("②", "将 32 字符挑战码粘贴到下方输入框"),
        ("③", "点击「生成激活码」获取 128 字符 hex 签名"),
        ("④", "将签名粘贴回浏览器并点击验证"),
    ]:
        row = tk.Frame(steps_inner, bg=CARD)
        row.pack(fill="x", pady=2)
        tk.Label(row, text=num, bg=CARD, fg=ACCENT,
                 font=("Helvetica", 12, "bold"), width=3).pack(side="left")
        tk.Label(row, text=desc, bg=CARD, fg=TEXT,
                 font=F_BODY).pack(side="left")

    # ===== 挑战码卡片 =====
    chal_card, chal_inner = make_card(main)
    chal_card.pack(fill="x", pady=(0, 14))

    chal_header = tk.Frame(chal_inner, bg=CARD)
    chal_header.pack(fill="x", pady=(0, 8))
    tk.Label(chal_header, text="挑战码", bg=CARD, fg=ACCENT_DK,
             font=F_LABEL).pack(side="left")
    tk.Label(chal_header, text="32字符 hex", bg=CARD, fg=TEXT3,
             font=F_SMALL).pack(side="left", padx=(8, 0))

    chal_input_row = tk.Frame(chal_inner, bg=CARD)
    chal_input_row.pack(fill="x")
    challenge_var = tk.StringVar()
    challenge_entry = ttk.Entry(chal_input_row, textvariable=challenge_var)
    challenge_entry.pack(side="left", fill="x", expand=True, ipady=2)
    # 粘贴按钮稍后创建 (需先定义 on_paste)
    paste_btn_slot = tk.Frame(chal_input_row, bg=CARD)
    paste_btn_slot.pack(side="left", padx=(8, 0))

    # ===== 生成按钮区 =====
    gen_frame = tk.Frame(main, bg=BG)
    gen_frame.pack(fill="x", pady=(0, 14))

    # ===== 激活码输出卡片 =====
    result_card, result_inner = make_card(main)
    result_card.pack(fill="x", pady=(0, 14))

    result_header = tk.Frame(result_inner, bg=CARD)
    result_header.pack(fill="x", pady=(0, 8))
    tk.Label(result_header, text="激活码", bg=CARD, fg=ACCENT_DK,
             font=F_LABEL).pack(side="left")
    tk.Label(result_header, text="128字符 hex 签名", bg=CARD, fg=TEXT3,
             font=F_SMALL).pack(side="left", padx=(8, 0))

    result_text = tk.Text(result_inner, height=3, bg=BG2, fg=TEXT, font=F_MONO,
                          borderwidth=0, highlightthickness=1,
                          highlightbackground=BORDER, highlightcolor=ACCENT,
                          wrap="word", padx=10, pady=10, relief="flat")
    result_text.pack(fill="x")
    result_text.configure(state="disabled")

    result_actions = tk.Frame(result_inner, bg=CARD)
    result_actions.pack(fill="x", pady=(10, 0))

    # ===== 状态栏 =====
    status_frame = tk.Frame(main, bg=BG)
    status_frame.pack(fill="x", pady=(0, 12))
    status_icon = tk.Label(status_frame, text="●", bg=BG, fg=TEXT3,
                           font=("Helvetica", 11))
    status_icon.pack(side="left", padx=(0, 6))
    status_var = tk.StringVar(value="就绪 — 请粘贴32字符hex挑战码后点击生成 (Enter 快捷生成)")
    status_label = tk.Label(status_frame, textvariable=status_var, bg=BG,
                            fg=TEXT2, font=F_STATUS)
    status_label.pack(side="left")

    # ===== 分隔线 =====
    tk.Frame(main, bg=BORDER_LT, height=1).pack(fill="x", pady=(2, 12))

    # ===== 底部安全说明 =====
    sec_card, sec_inner = make_card(main, padx=14, pady=12)
    sec_card.pack(fill="x")
    tk.Label(sec_inner, text="🔒 安全说明", bg=CARD, fg=ACCENT_DK,
             font=F_LABEL).pack(anchor="w", pady=(0, 6))
    for line in [
        "私钥仅存于此工具中，浏览器只含公钥",
        "无法通过查看网页源码伪造激活码",
        "每次挑战码含随机 nonce，不可重用",
    ]:
        tk.Label(sec_inner, text=f"·  {line}", bg=CARD, fg=TEXT2,
                 font=F_SMALL).pack(anchor="w", pady=1)

    # ===== 功能函数 =====
    def set_result(text: str):
        result_text.configure(state="normal")
        result_text.delete("1.0", "end")
        result_text.insert("1.0", text)
        result_text.configure(state="disabled")

    def get_result() -> str:
        return result_text.get("1.0", "end").strip()

    def set_status(text: str, kind: str = "info"):
        """更新状态栏: kind = 'good' | 'bad' | 'info'"""
        status_var.set(text)
        if kind == "good":
            status_icon.config(foreground=GOOD)
            status_label.config(foreground=GOOD)
        elif kind == "bad":
            status_icon.config(foreground=BAD)
            status_label.config(foreground=BAD)
        else:
            status_icon.config(foreground=TEXT3)
            status_label.config(foreground=TEXT2)

    def on_generate():
        challenge = challenge_var.get().strip()
        if not challenge:
            messagebox.showwarning("提示", "请先输入挑战码")
            return
        # 预检验：期望 32 字符 hex (移除前缀和分隔符后)
        check = challenge.upper()
        if check.startswith("BCC-CHL-"):
            check = check[len("BCC-CHL-"):]
        elif check.startswith("BCC-CHL"):
            check = check[len("BCC-CHL"):]
        check = check.replace("-", "").replace(" ", "")
        if len(check) != 32 or not all(c in "0123456789ABCDEF" for c in check):
            messagebox.showwarning(
                "格式提示",
                f"挑战码应为 32 字符十六进制字符串\n当前: {len(check)} 字符\n示例: a1a100dc4314e3405dd3ad972f4f2379",
            )
            set_status(f"✗ 挑战码格式不符 (当前 {len(check)} 字符)", "bad")
            return
        try:
            activation = cli_sign(challenge)
            set_result(activation)
            set_status("✓ 激活码生成成功！128 字符 hex 签名", "good")
        except ImportError as e:
            messagebox.showerror("缺少依赖", str(e))
            set_status("✗ 缺少依赖库", "bad")
        except ValueError as e:
            messagebox.showerror("格式错误", f"挑战码格式错误:\n{e}")
            set_status(f"✗ 格式错误: {e}", "bad")
        except Exception as e:
            messagebox.showerror("错误", f"生成失败:\n{e}")
            set_status(f"✗ {e}", "bad")

    def on_copy():
        result = get_result()
        if result:
            root.clipboard_clear()
            root.clipboard_append(result)
            set_status("✓ 激活码已复制到剪贴板", "good")
        else:
            set_status("暂无激活码可复制", "bad")

    def on_paste():
        try:
            clip = root.clipboard_get()
            challenge_var.set(clip.strip())
            set_status("已从剪贴板粘贴挑战码", "info")
        except tk.TclError:
            set_status("剪贴板为空或内容不可用", "bad")

    def on_clear():
        challenge_var.set("")
        set_result("")
        set_status("已清空所有字段", "info")

    # ===== 创建按钮 (在函数定义之后) =====
    ttk.Button(paste_btn_slot, text="📥 粘贴", style="Secondary.TButton",
               command=on_paste).pack()
    ttk.Button(gen_frame, text="🔑  生成激活码", style="Primary.TButton",
               command=on_generate).pack()
    ttk.Button(result_actions, text="📋 复制激活码", style="Secondary.TButton",
               command=on_copy).pack(side="left", padx=(0, 8))
    ttk.Button(result_actions, text="🧹 清空", style="Ghost.TButton",
               command=on_clear).pack(side="left")

    # ===== 键盘快捷键 =====
    # Enter 键在挑战码输入框中触发生成
    root.bind("<Return>", lambda e: on_generate())
    root.bind("<KP_Enter>", lambda e: on_generate())
    challenge_entry.focus_set()

    root.mainloop()


# ============================================================
# 入口
# ============================================================
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("--cli", "sign", "verify", "info"):
        if sys.argv[1] == "--cli":
            sys.argv.pop(1)
        run_cli()
    elif len(sys.argv) > 1:
        run_cli()
    else:
        run_gui()
