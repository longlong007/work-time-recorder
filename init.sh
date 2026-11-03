#!/bin/bash
# init.sh — 每次 session 开始时运行，确认仓库能测、依赖在
set -e

echo "=== 检查环境 ==="
echo "工作目录: $(pwd)"

if [ ! -f package.json ]; then
  echo "错误：当前目录没有 package.json，请到仓库根目录再跑"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "错误：未找到 node。需要 Node.js 18+"
  exit 1
fi

if [ ! -d node_modules/electron ]; then
  echo "安装依赖..."
  npm install
fi

echo "运行测试..."
npm test

echo "=== 环境检查完成，可以开始工作 ==="
echo "提示：运行 'git log --oneline -10' 查看最近工作历史"
echo "提示：没有 config.js 时应用仍可本地计时；云同步需从 config.example.js 复制后再填环境 ID"
