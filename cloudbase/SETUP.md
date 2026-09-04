# CloudBase 控制台配置

在 [云开发控制台](https://console.cloud.tencent.com/tcb) 完成以下配置。

## 1. 创建环境

- 地域：**上海 ap-shanghai**
- 记下 **环境 ID**，填入 `config.js` 的 `CLOUDBASE_ENV`

## 2. 身份认证（Auth v1，与 SDK 一致）

路径：环境 → 身份认证 → 登录方式

| 能力 | 控制台开关 | 应用内用途 |
|------|-----------|-----------|
| **用户名密码登录** | 常规登录 → 开启 | 登录（邮箱作为 username） |
| **邮箱验证码** | 开启 + 配置发信 | 注册时收验证码 |

> **不要混用 Auth v1/v2**。本应用统一走 v1：`/auth/v1/signup`、`/auth/v1/signin`。

### 注册流程

1. 填写邮箱、密码（8–32 位，含字母和数字）
2. 点击 **获取验证码**
3. 填写验证码 → 注册（成功后自动登录）

### 登录流程

- 邮箱 + 密码（邮箱填入 username 字段）

### 发信配置（注册必需）

路径：邮箱验证码 → 配置发信 → 推荐 **内置发信**

## 3. 安全域名

- `localhost:8080`（本地）
- 线上域名如 `flytime.cloud`

## 4. 数据库集合

| 集合 | 文档 ID |
|------|---------|
| `work_records` | 记录 UUID |
| `user_settings` | 用户 uid |
| `active_sessions` | 用户 uid |

## 5. 安全规则（每个集合相同）

```json
{
  "read": "doc._openid == auth.uid",
  "write": "doc._openid == auth.uid"
}
```

## 6. 索引（`work_records`）

- `_openid` ↑ + `updatedAt` ↑
- `_openid` ↑ + `startTime` ↓

## 7. 验证清单

- [ ] 用户名密码登录已开启
- [ ] 邮箱验证码 + 发信已配置
- [ ] 安全域名已添加
- [ ] 三个集合 + 安全规则 + 索引已就绪
- [ ] **云函数 `batchUpsertWorkRecords` 已部署**（637 条以上批量上传必需）
- [ ] 可完成注册（自动登录）→ 同步数据

## 8. 部署批量上传云函数（推荐）

637 条记录若走前端逐条写库，会触发数千 HTTP 请求并被 CloudBase 写 QPS 限流卡死。请部署云函数，客户端改为 **7 次** `callFunction`（每批 100 条）完成上传。

### 8.1 安装 CLI 并登录

```bash
npm i -g @cloudbase/cli
tcb login
```

### 8.2 配置环境 ID

复制示例配置并填入你的环境 ID：

```bash
cp cloudbaserc.example.json cloudbaserc.json
# 编辑 cloudbaserc.json 中的 envId
```

### 8.3 部署云函数

在项目根目录执行：

```bash
cd cloudfunctions/batchUpsertWorkRecords && npm install && cd ../..
tcb fn deploy batchUpsertWorkRecords --dir cloudfunctions/batchUpsertWorkRecords
```

或在控制台手动创建同名云函数，粘贴 `cloudfunctions/batchUpsertWorkRecords/index.js` 内容。

### 8.4 前端配置

`config.js` 中确认：

```js
CLOUDBASE_BATCH_FN: 'batchUpsertWorkRecords',
```

### 8.5 验证

1. 强制刷新页面（`Cmd+Shift+R`）清 Service Worker 缓存
2. 登录后点「立即同步」
3. Network 面板应看到 `callFunction`（批量上传场景）或常规同步请求
4. 不应再出现 6000+ 条 database 写请求

## 9. 部署增量拉取云函数（推荐，修时钟偏差）

客户端增量同步应使用云函数返回的 **serverNow** 推进游标，避免本机时钟超前导致永久漏拉。

```bash
cd cloudfunctions/pullWorkRecordChanges && npm install && cd ../..
tcb fn deploy pullWorkRecordChanges --dir cloudfunctions/pullWorkRecordChanges
```

`config.js` 中确认：

```js
CLOUDBASE_PULL_FN: 'pullWorkRecordChanges',
```

未部署时客户端会回退到直连数据库增量查询，但空拉取时不会用本机时间推进游标。
