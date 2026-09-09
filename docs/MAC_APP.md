# Mac 桌面应用：打包与启动

本应用是 Electron 桌面版，开发时用 `npm start` 启动；分发时用 `electron-builder` 打出 `.app` 或 `.dmg`。

> 相关文档：[使用手册](USER_GUIDE.md)

---

## 环境要求

- macOS
- Node.js 18+（建议 LTS）
- npm

国内网络建议先配镜像，再装依赖（仓库已有 `.npmrc` 时可跳过）：

```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

---

## 安装依赖

在项目根目录执行：

```bash
npm install
```

`postinstall` 会跑 `scripts/ensure-electron.js`，检查 Electron 二进制是否完整。若安装后启动报缺 Framework，可再执行：

```bash
npm run ensure-electron
```

云同步需要本地有 `config.js`（从 `config.example.js` 复制后填环境信息）。不配也能当纯本地应用用。

---

## 开发启动

```bash
npm start
```

等价命令：`npm run electron`。

启动后会：

1. 在本机起静态服务，默认 `http://127.0.0.1:8080`
2. 打开主窗口「工作时间记录器」
3. 在菜单栏放托盘图标

关闭主窗口不会退出，应用会藏到托盘。彻底退出：托盘右键 → **退出**。

全局快捷键：`⌘⇧T` 显示/隐藏主窗口。

### 端口被占用

默认端口 `8080` 被占用时，会自动尝试 `8081`–`8109`。若用到 CloudBase 登录，需把实际端口加到云开发控制台的安全域名，例如：

- `http://127.0.0.1:8081`
- `http://localhost:8081`

---

## 打包

两种产物，按需要选一种。

| 命令 | 产物 | 用途 |
|------|------|------|
| `npm run pack` | 未打包目录（含 `.app`） | 本机试跑、调试安装包内容 |
| `npm run dist` | `.dmg` 安装盘 | 发给别人安装 |

输出目录：`dist-electron/`（已在 `.gitignore`）。

### 本机试跑（推荐先 pack）

```bash
npm run pack
```

完成后打开：

```
dist-electron/mac/工作时间记录器.app
```

Apple Silicon 机器路径可能是：

```
dist-electron/mac-arm64/工作时间记录器.app
```

双击即可启动，行为与 `npm start` 相同（托盘、快捷键、关窗进托盘）。

### 打成 DMG

```bash
npm run dist
```

产物大致为：

```
dist-electron/工作时间记录器-1.0.0.dmg
```

双击 DMG，把「工作时间记录器」拖到「应用程序」，再到启动台或 `/Applications` 打开。

---

## 首次打开被拦截

当前打包未做 Apple 公证（`hardenedRuntime` / `gatekeeperAssess` 已关）。本机或别人电脑第一次打开可能提示「无法验证开发者」。

处理：

1. 系统设置 → 隐私与安全性 → 仍要打开
2. 或在访达中 **右键应用 → 打开**

只建议在自己信任的机器上这样用，不要对外公开发布未签名安装包。

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 启动报缺 Electron Framework | `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run ensure-electron` |
| `npm install` 很慢或失败 | 确认用了 npmmirror，再重装 |
| 打不开窗口 / 启动失败弹窗 | 看控制台；确认 `8080`–`8109` 有可用端口 |
| CloudBase 登录失败 | 把当前端口加入安全域名；确认根目录有正确的 `config.js` |
| 关窗口后找不到应用 | 看菜单栏托盘；右键可显示主窗口或退出 |
| pack / dist 找不到图标 | 确认存在 `electron/icons/icon.icns` |

---

## 脚本一览

| 脚本 | 作用 |
|------|------|
| `npm start` / `npm run electron` | 开发模式启动 |
| `npm run pack` | 打出未压缩 `.app` 目录 |
| `npm run dist` | 打出 `.dmg` |
| `npm run ensure-electron` | 修复残缺的 Electron 二进制 |
