#!/bin/bash

# 开发者信息
echo "开发@杭鹏客_泡菜老司机"
echo "冷萃yyds"

# 版本号
echo "版本号@0.1"

# 猫咪字符画
echo " /\_/\\"
echo "( o.o )"
echo " > ^ <"

# 标题
echo "操蛋的小鹏越狱工具"

# 菜单栏
echo "菜单栏："
echo "1. 开始越狱"
echo "2. 仪表盘截屏"
echo "3. 退出工具"
read -p "请输入选项: " choice

case $choice in
1)
    # 开始越狱
    echo "正在执行步骤一..."
    setprop service.adb.tcp.port 5050
    sleep 1
    setprop ctl.restart adbd
    echo "步骤一完成，等待5秒..."
    sleep 5

    # 进行连接，最多重试 3 次
    max_connect_attempts=3
    connect_attempts=0
    while [ $connect_attempts -lt $max_connect_attempts ]; do
        adb connect 127.0.0.1:5050
        last_message=$(adb devices | tail -n 1)
        if [[ $last_message == *already\ connected* ]]; then
            echo "步骤二已操作完成。"
            break
        elif [[ $connect_attempts -lt $((max_connect_attempts - 1)) ]]; then
            echo "重新启动越狱环境..."
            sleep 2  # 等待 2 秒后重试
        else
            echo "越狱失败...."
            break
        fi
        connect_attempts=$((connect_attempts + 1))
    done

    # 如果连接成功，则启动应用
    if [[ $last_message == *already\ connected* ]]; then
        echo "环境启动成功，正在进行步骤三..."
        adb shell am start com.xiaopeng.devtools/.view.usersettings.UserSettingsActivity -f 26846822

        # 使用循环等待，每次检查应用是否已启动
        max_wait_time=8  # 最大等待时间（秒）
        wait_time=0      # 当前等待时间
        while [ $wait_time -lt $max_wait_time ]; do
            # 检查应用是否已经启动
            if adb shell pidof com.xiaopeng.devtools > /dev/null; then
                # 应用已经启动，跳出循环
                break
            else
                # 应用还未启动，等待一段时间
                sleep 3  # 等待 3 秒
                wait_time=$((wait_time + 3))
            fi
        done

        # 如果等待时间超过最大等待时间，输出超时消息
        if [ $wait_time -ge $max_wait_time ]; then
            echo "越狱失败了...."
        else
            # 应用已经启动，输出完成消息
            echo "已拉起 越狱完成。"
        fi
    fi
    ;;
  2)
    # 仪表盘截屏
    echo "正在执行仪表盘截屏..."
    filename="/sdcard/YumikoToys/screenshot-$(date '+%Y%m%d%H%M%S').png"
    adb connect 127.0.0.1:5050
    sleep 3
    adb shell screencap -d 1 -p "$filename"
    echo "截图已保存至 $filename"
    ;;
  3)
    # 退出工具
    echo "退出工具。"
    exit 0
    ;;
  *)
    echo "无效操作。"
    ;;
esac
