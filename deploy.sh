#!/bin/bash

echo "========================================"
echo "GitHub Pages 部署脚本"
echo "========================================"
echo ""

# 检查是否已初始化Git仓库
if [ ! -d ".git" ]; then
    echo "正在初始化 Git 仓库..."
    git init
    echo ""
fi

# 添加所有文件
echo "正在添加文件..."
git add .
echo ""

# 提交更改
echo "正在提交更改..."
read -p "请输入提交信息（直接回车使用默认信息）: " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Update work time recorder"
fi
git commit -m "$commit_msg"
echo ""

# 检查是否已设置远程仓库
if git remote get-url origin >/dev/null 2>&1; then
    echo "正在推送到 GitHub..."
    git branch -M main
    git push -u origin main
    echo ""
    echo "========================================"
    echo "部署完成！"
    echo ""
    echo "请在 GitHub 仓库的 Settings > Pages 中启用 GitHub Pages"
    echo "========================================"
else
    echo "请先设置远程仓库地址："
    echo "git remote add origin https://github.com/YOUR_USERNAME/work-time-recorder.git"
    echo ""
    echo "然后运行以下命令推送："
    echo "git branch -M main"
    echo "git push -u origin main"
fi


