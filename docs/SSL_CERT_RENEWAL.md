# HTTPS 证书过期与续期

大陆站点（如 `flytime.cloud`）使用 **Let's Encrypt + Certbot** 时，证书约 **90 天**有效。过期后浏览器会提示不安全，GitHub Actions **Deploy Mainland** 的「Verify deployment」也会失败（`curl` 报 SSL 错误，常见 exit code **60**）。

> 首次申请证书见 [DOMESTIC_DEPLOY.md — 阶段七：Nginx + HTTPS](DOMESTIC_DEPLOY.md#82-申请-ssl-证书lets-encrypt)。  
> Nginx 模板：[deploy/nginx.conf](../deploy/nginx.conf)

---

## 1. 如何判断已过期

在任意机器执行（将域名换成你的）：

```bash
curl -I https://flytime.cloud/
```

若出现 `SSL certificate problem: certificate has expired`，说明证书已过期。

查看证书有效期：

```bash
echo | openssl s_client -servername flytime.cloud -connect flytime.cloud:443 2>/dev/null \
  | openssl x509 -noout -dates -subject
```

关注 `notAfter=` 是否早于当前日期。

在服务器上也可查看 Certbot 管理的证书：

```bash
sudo certbot certificates
```

---

## 2. 续期步骤（推荐）

SSH 登录**大陆轻量服务器**（与 [deploy-mainland.yml](../.github/workflows/deploy-mainland.yml) 中 `DEPLOY_HOST` 同一台）。

### 2.1 检查 Nginx 配置

```bash
sudo nginx -t
```

确认站点 `server_name` 与证书域名**完全一致**（例如 `flytime.cloud`，不要多后缀或少一段）。

### 2.2 尝试自动续期

```bash
sudo certbot renew
sudo systemctl reload nginx
```

若 `renew` 报错，可重新签发并写入 Nginx（与初次部署相同）：

```bash
sudo certbot --nginx -d flytime.cloud
sudo nginx -t && sudo systemctl reload nginx
```

将 `flytime.cloud` 换成你的 `DEPLOY_DOMAIN`。

### 2.3 验证

```bash
curl -I https://flytime.cloud/
echo | openssl s_client -servername flytime.cloud -connect flytime.cloud:443 2>/dev/null \
  | openssl x509 -noout -dates
```

应返回 **HTTP/2 200**（或 200），且 `notAfter` 在未来。

---

## 3. 续期失败时常见原因

| 原因 | 处理 |
|------|------|
| **80 端口未开放** | 腾讯云安全组 / 防火墙放行 **TCP 80、443**；Let's Encrypt HTTP-01 需要 80 |
| **DNS 未指向本机** | 域名 A 记录指向当前服务器公网 IP |
| **`server_name` 不一致** | Nginx、`certbot -d`、DNS 域名三者必须相同 |
| **Nginx 无对应 server block** | 参考 [DOMESTIC_DEPLOY.md §12.1](DOMESTIC_DEPLOY.md#121-certbot证书签发成功但无法安装到-nginx) 先补配置再 `certbot install` |
| **自动续期未运行** | 见下文 §4 |

---

## 4. 自动续期（避免再次过期）

Certbot 安装后通常会注册 systemd 定时任务。在服务器上检查：

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

`dry-run` 成功表示自动续期链路正常。建议每月执行一次：

```bash
sudo certbot certificates
```

---

## 5. 与 GitHub 部署的关系

推送 `main` 会触发 **Deploy Mainland**：

1. **Deploy to server** — rsync 静态文件（通常仍会成功）
2. **Verify deployment** — `curl https://${DEPLOY_DOMAIN}/` 要求 **HTTPS 有效且返回 200**

证书过期时，文件可能已更新，但 workflow 会在验证步骤失败。续期完成后，在 GitHub **Actions** 中对该 workflow 点 **Re-run failed jobs** 即可。

---

## 6. 备选：腾讯云免费 SSL 证书

若不想使用 Let's Encrypt，可在腾讯云控制台申请免费 DV 证书，下载 Nginx 格式后上传到服务器（如 `/etc/nginx/ssl/`），并修改站点配置中的 `ssl_certificate` / `ssl_certificate_key`。详见 [DOMESTIC_DEPLOY.md §8.3](DOMESTIC_DEPLOY.md#83-备选腾讯云免费-ssl-证书)。

---

## 7. 快速命令清单（复制用）

```bash
# 登录服务器后
sudo certbot certificates
sudo certbot renew
# 若 renew 失败：
sudo certbot --nginx -d flytime.cloud
sudo nginx -t && sudo systemctl reload nginx
curl -I https://flytime.cloud/
sudo certbot renew --dry-run
```

将 `flytime.cloud` 替换为你的备案域名。
