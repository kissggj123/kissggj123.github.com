#!/usr/bin/env python3
"""
Bunny CC 上帝模式激活码工具 v3.0
================================
功能:
  1. generate  — 从游戏状态生成激活码
  2. decode    — 从激活码逆向解密
  3. verify    — 验证激活码是否匹配指定游戏状态
  4. interactive — 交互式模式
  5. legacy     — 兼容旧版 BCC-GOD-XXXX 格式

用法:
  python3 bcc_god_mode_tool.py generate --year 2025 --pop 1234 --level 5 --funds 50000 --research 23
  python3 bcc_god_mode_tool.py decode BCC-GOD-234567-345678-1234
  python3 bcc_god_mode_tool.py verify BCC-GOD-234567-345678-1234 --year 2025 --pop 1234 --level 5 --funds 50000 --research 23
  python3 bcc_god_mode_tool.py interactive
"""

import argparse
import sys
from datetime import datetime

# ============== 常量（与 JS CONFIG 保持一致）==============
SALT_S1 = 12345        # CONFIG.GOD_MODE_CALC_SALT_S1
JS_ADDON = 5678        # CONFIG.GOD_MODE_JS_ADDON
SALT_S2 = 97531        # CONFIG.GOD_MODE_TIME_SALT_S2
SALT_CHECKSUM = 24680  # CONFIG.GOD_MODE_CHECKSUM_SALT


def get_day_of_year(date=None):
    """获取当年第几天（1-366）"""
    if date is None:
        date = datetime.now()
    return date.timetuple().tm_yday


def calculate_s1_key(year, population_mod, city_level, funds_k, research_mod):
    """
    Stage 1: 状态密钥
    与 JS calculateGodModeKey_Stage1 完全一致
    JS: let key=(y*17+p*3+l*29)^(f*11-r*7+SALT_S1); return Math.abs(key%899999)+100000;
    """
    raw = (year * 17 + population_mod * 3 + city_level * 29) ^ (
        funds_k * 11 - research_mod * 7 + SALT_S1
    )
    return abs(raw % 899999) + 100000


def calculate_s2_key(year, population_mod, city_level, funds_k, research_mod, day_of_year=None):
    """
    Stage 2: 时间密钥（每日变化）
    与 JS calculateGodModeKey_S2 完全一致
    JS: let key=(y*13+p*7+l*23+f*5+r*3+doy*2)^SALT_S2; return Math.abs(key%899999)+100000;
    """
    if day_of_year is None:
        day_of_year = get_day_of_year()
    raw = (year * 13 + population_mod * 7 + city_level * 23 +
           funds_k * 5 + research_mod * 3 + day_of_year * 2) ^ SALT_S2
    return abs(raw % 899999) + 100000


def calculate_checksum(s1_key, s2_key):
    """
    Stage 3: 校验位
    与 JS calculateGodModeChecksum 完全一致
    JS: let key=(s1*3+s2*7+SALT_CHECKSUM)^JS_ADDON; return Math.abs(key%9999)+1;
    """
    raw = (s1_key * 3 + s2_key * 7 + SALT_CHECKSUM) ^ JS_ADDON
    return abs(raw % 9999) + 1


def generate_activation_code(year, population, city_level, funds, research_points,
                             date=None):
    """
    生成完整的上帝模式激活码（四步验证格式）

    Args:
        year: city.year (如 2025)
        population: city.population (会自动取 % 1000)
        city_level: city.cityLevel
        funds: city.funds (会自动取 // 1000)
        research_points: city.researchPoints (会自动取 % 100)
        date: 指定日期（默认今天），用于计算时间密钥

    Returns:
        str: 激活码，如 "BCC-GOD-234567-345678-1234"
    """
    population_mod = population % 1000
    funds_k = funds // 1000
    research_mod = research_points % 100

    s1 = calculate_s1_key(year, population_mod, city_level, funds_k, research_mod)
    s2 = calculate_s2_key(year, population_mod, city_level, funds_k, research_mod,
                          get_day_of_year(date))
    checksum = calculate_checksum(s1, s2)

    code = f"BCC-GOD-{s1}-{s2}-{checksum:04d}"
    return code


def generate_legacy_code(year, population, city_level, funds, research_points):
    """
    生成旧版兼容激活码 (BCC-GOD-XXXX 格式)
    旧格式: (s1 + JS_ADDON) % 10000，4位数字
    """
    population_mod = population % 1000
    funds_k = funds // 1000
    research_mod = research_points % 100

    s1 = calculate_s1_key(year, population_mod, city_level, funds_k, research_mod)
    legacy_num = (s1 + JS_ADDON) % 10000
    return f"BCC-GOD-{legacy_num:04d}"


def decode_activation_code(code):
    """
    解密激活码，提取 S1/S2/校验位

    Args:
        code: 激活码字符串，如 "BCC-GOD-234567-345678-1234"

    Returns:
        dict: 包含 s1, s2, checksum, valid
    """
    code = code.strip().upper()

    # 检查旧格式 BCC-GOD-XXXX
    legacy_match = code.startswith('BCC-GOD-') and not code.replace('BCC-GOD-', '').count('-') >= 2
    if legacy_match and code.replace('BCC-GOD-', '').count('-') == 0:
        parts = code.split('-')
        if len(parts) == 3 and parts[0] == 'BCC' and parts[1] == 'GOD':
            try:
                legacy_num = int(parts[2])
                if 0 <= legacy_num <= 9999:
                    return {
                        'valid': True,
                        'format': 'legacy',
                        'legacy_num': legacy_num,
                        's1': None,
                        's2': None,
                        'checksum': None,
                    }
            except ValueError:
                pass

    # 新格式 BCC-GOD-S1-S2-CHECKSUM
    parts = code.split('-')
    if len(parts) != 5 or parts[0] != 'BCC' or parts[1] != 'GOD':
        return {'valid': False, 'error': '格式错误，应为 BCC-GOD-XXXXXX-XXXXXX-XXXX 或 BCC-GOD-XXXX'}

    try:
        s1 = int(parts[2])
        s2 = int(parts[3])
        checksum = int(parts[4])
    except ValueError:
        return {'valid': False, 'error': '码段必须为数字'}

    if not (100000 <= s1 <= 999999):
        return {'valid': False, 'error': f'S1 超出范围（100000-999999），得到 {s1}'}
    if not (100000 <= s2 <= 999999):
        return {'valid': False, 'error': f'S2 超出范围（100000-999999），得到 {s2}'}
    if not (1 <= checksum <= 9999):
        return {'valid': False, 'error': f'校验位超出范围（1-9999），得到 {checksum}'}

    # 验证校验位
    expected_checksum = calculate_checksum(s1, s2)
    if checksum != expected_checksum:
        return {
            'valid': False,
            'error': f'校验位错误：期望 {expected_checksum:04d}，得到 {checksum:04d}',
            's1': s1, 's2': s2,
            'expected_checksum': expected_checksum
        }

    return {
        'valid': True,
        'format': 'full',
        's1': s1,
        's2': s2,
        'checksum': checksum,
    }


def verify_activation_code(code, year, population, city_level, funds, research_points,
                           date=None):
    """
    验证激活码是否匹配指定游戏状态和日期

    Returns:
        dict: 验证结果
    """
    code = code.strip().upper()
    decoded = decode_activation_code(code)

    if not decoded.get('valid'):
        return {
            'match': False,
            'input_code': code,
            'reason': decoded.get('error', '无效格式')
        }

    # 旧格式验证
    if decoded.get('format') == 'legacy':
        expected_legacy = generate_legacy_code(year, population, city_level, funds, research_points)
        if code == expected_legacy:
            return {'match': True, 'format': 'legacy', 'expected_code': expected_legacy, 'input_code': code}
        return {
            'match': False,
            'format': 'legacy',
            'expected_code': expected_legacy,
            'input_code': code,
            'reason': '旧格式码值不匹配当前游戏状态'
        }

    # 新格式验证
    expected = generate_activation_code(
        year, population, city_level, funds, research_points, date
    )

    if code == expected:
        return {'match': True, 'format': 'full', 'expected_code': expected, 'input_code': code}

    return {
        'match': False,
        'format': 'full',
        'expected_code': expected,
        'input_code': code,
        'decoded': decoded,
        'reason': 'S1 或 S2 不匹配当前游戏状态/日期'
    }


def brute_force_s1(year, population, city_level, funds, research_points):
    """显示 S1 计算的详细步骤"""
    population_mod = population % 1000
    funds_k = funds // 1000
    research_mod = research_points % 100

    step1 = year * 17 + population_mod * 3 + city_level * 29
    step2 = funds_k * 11 - research_mod * 7 + SALT_S1
    step3 = step1 ^ step2
    step4 = abs(step3 % 899999) + 100000

    return {
        'input': {
            'year': year,
            'population': population,
            'population_mod': population_mod,
            'city_level': city_level,
            'funds': funds,
            'funds_k': funds_k,
            'research_points': research_points,
            'research_mod': research_mod,
        },
        'steps': {
            'step1 (Y*17+P*3+L*29)': step1,
            'step2 (F*11-R*7+SALT)': step2,
            'step3 (step1 ^ step2)': step3,
            'step4 (abs(%899999)+100000)': step4,
        },
        's1_key': step4
    }


def interactive_mode():
    """交互式命令行界面"""
    print("=" * 55)
    print("  Bunny CC 上帝模式激活码工具 v3.0")
    print("  四步验证 · 时间相关 · 兼容旧版")
    print("=" * 55)

    while True:
        print("\n请选择操作:")
        print("  1. 生成激活码（新格式）")
        print("  2. 生成激活码（旧格式兼容）")
        print("  3. 解密激活码")
        print("  4. 验证激活码")
        print("  5. 显示 S1 计算步骤")
        print("  6. 退出")

        choice = input("\n> ").strip()

        if choice == '1':
            print("\n--- 生成激活码（新格式 BCC-GOD-S1-S2-CHK）---")
            try:
                year = int(input("年份 (city.year): "))
                population = int(input("人口 (city.population): "))
                city_level = int(input("城市等级 (city.cityLevel): "))
                funds = int(input("资金 (city.funds): "))
                research = int(input("科研点 (city.researchPoints): "))

                code = generate_activation_code(year, population, city_level, funds, research)
                print(f"\n✓ 激活码: {code}")
                print(f"  生成日期: {datetime.now().strftime('%Y-%m-%d')} (第 {get_day_of_year()} 天)")
                print(f"  注意: S2 含时间因子，每日不同")

            except ValueError:
                print("✗ 请输入有效数字")

        elif choice == '2':
            print("\n--- 生成激活码（旧格式 BCC-GOD-XXXX）---")
            try:
                year = int(input("年份 (city.year): "))
                population = int(input("人口 (city.population): "))
                city_level = int(input("城市等级 (city.cityLevel): "))
                funds = int(input("资金 (city.funds): "))
                research = int(input("科研点 (city.researchPoints): "))

                code = generate_legacy_code(year, population, city_level, funds, research)
                print(f"\n✓ 旧格式激活码: {code}")
                print(f"  注意: 旧格式不含时间因子，但仅4位安全性低")

            except ValueError:
                print("✗ 请输入有效数字")

        elif choice == '3':
            print("\n--- 解密激活码 ---")
            code = input("激活码: ").strip()
            result = decode_activation_code(code)

            if result['valid']:
                fmt = result.get('format', 'unknown')
                if fmt == 'legacy':
                    print(f"\n✓ 旧格式码值有效")
                    print(f"  格式: BCC-GOD-XXXX (兼容模式)")
                    print(f"  Legacy Num: {result['legacy_num']}")
                else:
                    print(f"\n✓ 新格式码值有效")
                    print(f"  S1 (状态密钥): {result['s1']}")
                    print(f"  S2 (时间密钥): {result['s2']}")
                    print(f"  校验位: {result['checksum']:04d}")
            else:
                print(f"\n✗ {result['error']}")

        elif choice == '4':
            print("\n--- 验证激活码 ---")
            code = input("激活码: ").strip()
            try:
                year = int(input("年份: "))
                population = int(input("人口: "))
                city_level = int(input("城市等级: "))
                funds = int(input("资金: "))
                research = int(input("科研点: "))

                result = verify_activation_code(code, year, population, city_level, funds, research)
                if result['match']:
                    print(f"\n✓ 完全匹配！({result.get('format', '?')} 格式)")
                    print(f"  期望码值: {result['expected_code']}")
                else:
                    print(f"\n✗ 不匹配")
                    print(f"  期望码值: {result.get('expected_code', 'N/A')}")
                    print(f"  输入码值: {result['input_code']}")
                    print(f"  原因: {result['reason']}")
            except ValueError:
                print("✗ 请输入有效数字")

        elif choice == '5':
            print("\n--- S1 计算步骤 ---")
            try:
                year = int(input("年份: "))
                population = int(input("人口: "))
                city_level = int(input("城市等级: "))
                funds = int(input("资金: "))
                research = int(input("科研点: "))

                result = brute_force_s1(year, population, city_level, funds, research)
                print("\n输入参数:")
                for k, v in result['input'].items():
                    print(f"  {k}: {v}")
                print("\n计算步骤:")
                for k, v in result['steps'].items():
                    print(f"  {k} = {v}")
                print(f"\n→ S1 Key = {result['s1_key']}")

            except ValueError:
                print("✗ 请输入有效数字")

        elif choice == '6':
            print("再见！")
            break
        else:
            print("无效选择，请重试")


def main():
    parser = argparse.ArgumentParser(
        description='Bunny CC 上帝模式激活码工具 v3.0',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s generate --year 2025 --pop 1234 --level 5 --funds 50000 --research 23
  %(prog)s generate-legacy --year 2025 --pop 1234 --level 5 --funds 50000 --research 23
  %(prog)s decode BCC-GOD-234567-345678-1234
  %(prog)s verify BCC-GOD-234567-345678-1234 --year 2025 --pop 1234 --level 5 --funds 50000 --research 23
  %(prog)s interactive
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    gen = subparsers.add_parser('generate', help='从游戏状态生成激活码（新格式）')
    gen.add_argument('--year', type=int, required=True, help='city.year')
    gen.add_argument('--pop', type=int, required=True, help='city.population')
    gen.add_argument('--level', type=int, required=True, help='city.cityLevel')
    gen.add_argument('--funds', type=int, required=True, help='city.funds')
    gen.add_argument('--research', type=int, required=True, help='city.researchPoints')
    gen.add_argument('--date', type=str, default=None, help='指定日期 YYYY-MM-DD（默认今天）')

    gen_leg = subparsers.add_parser('generate-legacy', help='生成旧格式激活码 (BCC-GOD-XXXX)')
    gen_leg.add_argument('--year', type=int, required=True, help='city.year')
    gen_leg.add_argument('--pop', type=int, required=True, help='city.population')
    gen_leg.add_argument('--level', type=int, required=True, help='city.cityLevel')
    gen_leg.add_argument('--funds', type=int, required=True, help='city.funds')
    gen_leg.add_argument('--research', type=int, required=True, help='city.researchPoints')

    dec = subparsers.add_parser('decode', help='解密激活码')
    dec.add_argument('code', type=str, help='激活码 BCC-GOD-S1-S2-CHK 或 BCC-GOD-XXXX')

    ver = subparsers.add_parser('verify', help='验证激活码是否匹配游戏状态')
    ver.add_argument('code', type=str, help='激活码')
    ver.add_argument('--year', type=int, required=True)
    ver.add_argument('--pop', type=int, required=True)
    ver.add_argument('--level', type=int, required=True)
    ver.add_argument('--funds', type=int, required=True)
    ver.add_argument('--research', type=int, required=True)
    ver.add_argument('--date', type=str, default=None)

    subparsers.add_parser('interactive', help='交互式模式')

    args = parser.parse_args()

    if args.command == 'generate':
        date = datetime.strptime(args.date, '%Y-%m-%d') if args.date else None
        code = generate_activation_code(
            args.year, args.pop, args.level, args.funds, args.research, date
        )
        print(f"激活码: {code}")
        print(f"生成日期: {datetime.now().strftime('%Y-%m-%d')} (第 {get_day_of_year(date)} 天)")

    elif args.command == 'generate-legacy':
        code = generate_legacy_code(
            args.year, args.pop, args.level, args.funds, args.research
        )
        print(f"旧格式激活码: {code}")

    elif args.command == 'decode':
        result = decode_activation_code(args.code)
        if result['valid']:
            fmt = result.get('format', 'unknown')
            if fmt == 'legacy':
                print(f"✓ 旧格式有效")
                print(f"  Legacy Num: {result['legacy_num']}")
            else:
                print(f"✓ 新格式有效")
                print(f"  S1: {result['s1']}")
                print(f"  S2: {result['s2']}")
                print(f"  校验位: {result['checksum']:04d}")
        else:
            print(f"✗ {result['error']}")
            sys.exit(1)

    elif args.command == 'verify':
        date = datetime.strptime(args.date, '%Y-%m-%d') if args.date else None
        result = verify_activation_code(
            args.code, args.year, args.pop, args.level, args.funds, args.research, date
        )
        if result['match']:
            print(f"✓ 完全匹配 ({result.get('format', '?')} 格式)")
        else:
            print(f"✗ 不匹配: {result['reason']}")
            if 'expected_code' in result:
                print(f"  期望: {result['expected_code']}")
            sys.exit(1)

    elif args.command == 'interactive':
        interactive_mode()

    else:
        parser.print_help()


if __name__ == '__main__':
    main()
