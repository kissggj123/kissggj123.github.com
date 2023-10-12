#!/bin/bash

# 定义开发者信息函数
print_developer_info() {
    echo "开发@杭鹏客_泡菜老司机"
    echo "冷萃yyds"
    echo "版本号@0.1.1"
    sleep 3
}

# 显示猫咪字符画及更新日志
display_cat() {
    echo " /\_/\\"
    echo "( o.o )"
    echo " > ^ <"
    echo -e "脚本实现了一键越狱功能\n仅供研究学习使用"
    sleep 3
}

# 显示标题
display_title() {
    echo "操蛋的小鹏越狱工具"
    sleep 3
}

# 显示菜单栏并获取用户选择
show_menu() {
        echo "~o( =∩ω∩= )m"
        echo "1. 开始越狱"
	echo "2. adb连接"
	echo "3. adb测试"
	echo "4. 查询ip"
	echo "5. 启动shizuku"
	echo "6. 安装APP"
	echo "7. 大屏截图"
	echo "8. 仪表盘截图"
	echo "99. 工具信息"
	echo "0. 退出"
	read choice
}

# 执行越狱操作
execute_jailbreak() {
    export PATH=$PATH:/sbin:/system/sbin:/system/bin:/system/xbin:/vendor/bin:/vendor/xbin
    echo "正在执行步骤一..."
    setprop service.adb.tcp.port 5050
    sleep 1
    setprop ctl.restart adbd
    echo "步骤一完成，等待5秒..."
    sleep 5

    # 连接 adb 并尝试最多 3 次
    max_connect_attempts=3
    connect_attempts=0
    success=0
    while [ $connect_attempts -lt $max_connect_attempts ]; do
	last_message=$(adb connect 127.0.0.1:5050)
        #last_message=$(adb devices | tail -n 1)
        if [[ $last_message == *already\ connected* ]]; then
            echo "步骤二已操作完成。"
	    success=1
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
    # if [[ $last_message == *already\ connected* ]]; then
    if [[ $success == 1 ]]; then
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
}

capture_screen() {
  echo "正在执行仪表盘截屏..."
  current_time=$(TZ='Asia/Shanghai' date +'%Y%m%d%H%M%S')
  idx="$1"
  save_dir="/sdcard/xpscreen"
  screenshot_file="${save_dir}/screen_${current_time}_${idx}.png"
  
  adb shell "mkdir -p $save_dir"
  
  adb shell screencap -d "$idx" -p "$screenshot_file"

  if [ $? -eq 0 ]; then
    echo "截图已保存为 $screenshot_file"
  else
    echo "无法保存截图"
  fi
}

adb_connect() {
    echo "请输入端口号："
    read port
    if [ -z "$port" ]; then
        port=5050
    fi
    result=$(adb connect 127.0.0.1:$port)
    echo "$result"
}

adb_devices() {
    result=$(adb devices)
    echo "$result"
}


query_ip() {
    ifconfig
}

start_shizuku() {
    echo "启动shizuku"
    result=$(adb shell sh /storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh)
    echo "$result"
}

install_app() {
    echo "默认安装下载目录下base.apk"
    result=$(adb install ~/storage/downloads/base.apk)
    echo "$result"
}

update_and_install() {
    echo "开始安装环境"
    pkg update -y && pkg upgrade -y && pkg install android-tools -y 
}

# 主程序
main() {
	while true
	do
                echo "~o( =∩ω∩= )m"
		echo -e "这是一个操蛋的小鹏越狱工具\n用于获取操蛋的wifi adb功能"
		echo "请选择以下操作："
		echo "1. 开始越狱"
		echo "2. adb连接"
		echo "3. adb测试"
		echo "4. 查询ip"
		echo "5. 启动shizuku"
		echo "6. 安装脚本环境"
		echo "7. 大屏截图"
		echo "8. 仪表盘截图"
		echo "99. 更新日志"
                echo "100. 关于脚本"
		echo "0. 退出"
		read -p "请输入数字: " choice  # 加入-p参数以显示提示信息

		# 使用正则表达式检查输入是否为数字
		if [[ $choice =~ ^[0-9]+$ ]]; then
			case $choice in
		         1) execute_jailbreak ;;
			 2) adb_connect ;;
			 3) adb_devices ;;
			 4) query_ip ;;
			 5) start_shizuku ;;
			 6) update_and_install ;;
			 7) capture_screen 0 ;;
			 8) capture_screen 1 ;;
                        99) display_cat ;;
		       100) print_developer_info ;;
			 0) exit 0 ;;
			 *) echo "无效的选择，请重新输入" ;;
		esac
                        else
			echo "输入无效，请输入一个数字。"
               fi
	done
}

# 调用主程序函数
main
