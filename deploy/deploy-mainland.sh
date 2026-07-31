#!/usr/bin/env bash
# 部署静态文件到大陆服务器（需已配置 SSH 免密登录）
# 用法: ./deploy/deploy-mainland.sh user@your-server your-domain.com

set -euo pipefail

REMOTE="${1:-}"
DOMAIN="${2:-your-domain.com}"
REMOTE_DIR="/var/www/work-time-recorder"

if [[ -z "$REMOTE" ]]; then
  echo "用法: $0 user@server [domain]"
  echo "示例: $0 root@1.2.3.4 timer.example.com"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RSYNC_EXCLUDES=(
  --exclude '.git'
  --exclude '.github'
  --exclude '.cursor'
  --exclude '.vscode'
  --exclude '.specstory'
  --exclude '.worktrees'
  --exclude '.cursorindexingignore'
  --exclude 'node_modules'
  --exclude 'cloudfunctions'
  --exclude 'docs'
  --exclude 'supabase'
  --exclude 'deploy'
  --exclude 'config.js'
  --exclude 'cloudbaserc.json'
)

echo ">>> 同步文件到 ${REMOTE}:${REMOTE_DIR}"
rsync -avz --delete \
  "${RSYNC_EXCLUDES[@]}" \
  "$ROOT/" "$REMOTE:$REMOTE_DIR/"

echo ""
echo ">>> 修复文件权限（避免 Nginx 403）"
ssh "$REMOTE" "bash -s" <<EOF
set -euo pipefail
REMOTE_DIR="$REMOTE_DIR"
if [[ ! -f "\$REMOTE_DIR/index.html" ]]; then
  echo "错误: \$REMOTE_DIR/index.html 不存在，请检查部署目录"
  exit 1
fi
chown -R nginx:nginx "\$REMOTE_DIR"
chmod 755 /var/www
find "\$REMOTE_DIR" -type d -exec chmod 755 {} +
find "\$REMOTE_DIR" -type f -exec chmod 644 {} +
if command -v getenforce >/dev/null 2>&1 && [[ "\$(getenforce)" == "Enforcing" ]]; then
  chcon -R -t httpd_sys_content_t "\$REMOTE_DIR" 2>/dev/null || true
fi
echo "权限已修复: \$(ls -la "\$REMOTE_DIR/index.html")"
EOF

echo ""
echo ">>> 部署完成"
echo "请确保服务器上："
echo "  1. config.js 已手动配置 CLOUDBASE_ENV"
echo "  2. Nginx 已按 deploy/nginx.conf 配置 (域名: ${DOMAIN})"
echo "  3. CloudBase 安全域名已加入 https://${DOMAIN}"
echo ""
echo "验证: curl -I https://${DOMAIN}/"
