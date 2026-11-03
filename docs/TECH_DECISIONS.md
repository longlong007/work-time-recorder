# 技术决策记录

原因写得出处的，标明是从哪份文档或哪段代码看出来的。看不出来的标「待补充」，不编故事。

## Electron 33 + 本机静态服务

**用途**：Mac 桌面壳。托盘常驻、全局快捷键、悬浮窗、登录时打开。`electron-builder` 打 `.app` / `.dmg`。  
**选择原因**：从 `docs/MAC_APP.md` 和 `electron/main.js` 看，页面仍是原来的静态文件。主进程自己 `http.createServer` 托管仓库根目录，是为了不引入打包器，又让 CloudBase 登录有一个稳定的 `http://127.0.0.1:端口` 源（安全域名按这个配）。  
**替代方案**：直接 `file://` 打开 `index.html`。没有采用。代码注释和部署文档都要求 http 源；Service Worker 和云登录在 `file://` 下不可用。  
**注意事项**：默认端口 8080，占用时改试到 8109。换端口后 CloudBase 控制台要加新的安全域名。关窗口不退出。打包未做 Apple 公证（`package.json` 里 `hardenedRuntime` 与 `gatekeeperAssess` 为 false）。

## 无打包的浏览器脚本

**用途**：全部 UI 和同步逻辑。  
**选择原因**：待补充：原始选型原因不明。现状是 `index.html` 按顺序引入全局 IIFE，`package.json` 的 dependencies 为空，devDependencies 只有 Electron 和 electron-builder。  
**替代方案**：Vite / webpack。仓库 `.gitignore` 里有一条「前端子项目（Vite）」路径 `工作时间记录器 UI 设计/`，说明曾经有过独立 UI 工程，当前运行入口不是它。  
**注意事项**：改脚本后若网站有缓存，要改 `index.html` 里对应的 `?v=`。Electron 开发态响应头是 `Cache-Control: no-cache`。

## 腾讯云 CloudBase（替代 Supabase）

**用途**：邮箱登录、文档库存工时/待办/设置/进行中会话、两个云函数做批量写和增量拉。  
**选择原因**：`docs/DOMESTIC_DEPLOY.md` 写明目标是从 GitHub Pages / Supabase 迁到大陆备案服务器 + CloudBase（上海 `ap-shanghai`），让国内访问不跨境。`cloudbase/schema.md` 写明文档模型替代 `supabase/migrations/001_init.sql`。  
**替代方案**：继续用 Supabase。迁移文档把它标成旧后端。`supabase/` 仍留在仓库，部署脚本明确 `--exclude 'supabase'`，运行时代码不引用。  
**注意事项**：

- SDK 用仓库里的 `vendor/cloudbase.js`，不从 CDN 拉。`auth.js` 注释写明只用 Auth v1，避免 v1/v2 混用。
- 客户端上传刻意低并发（`UPLOAD_CONCURRENCY = 4`），失败不在上传循环里立刻重试，避免打满写 QPS。批量请求超时对齐云函数 60 秒，防止「服务端已写入、客户端当失败」造成重复推送。
- 安全规则是 `doc._openid == auth.uid`。集合字段见 `cloudbase/schema.md`。

## 离线优先 + Last-Write-Wins

**用途**：本地 `localStorage` 是缓存和离线队列，云端是多设备副本。  
**选择原因**：`sync-engine.js` 文件头注释就是这个策略。登录后静默增量同步，不再弹合并对话框（见提交 `fix: 登录后改为静默增量同步` 与 `docs/DATA_MIGRATION.md`）。  
**替代方案**：待补充：没有写过别的冲突策略（例如按字段合并）的对比记录。  
**注意事项**：冲突只看 `updatedAt`。软删除必须带更新的 `deletedAt`，不能只从数组里 splice 后指望别的设备跟着删。

## node:test，只测纯函数

**用途**：`npm test` → `node --test tests/*.test.js`。  
**选择原因**：待补充：原始选型原因不明。现状能测的只有同时 `module.exports` 的 `TodoModel` 和 `SyncLogic`。  
**替代方案**：浏览器测试或 jsdom。当前没有这类依赖。  
**注意事项**：`DataStore`、`SyncEngine`、`script.js` 依赖 `localStorage` / `document`，不能直接丢进现有测试命令。要测它们，先把规则抽到纯函数模块。

## 自绘 Canvas 统计图

**用途**：周/月/年工时柱状图，可按工作 / 休息 / 全部切换。  
**选择原因**：待补充：为什么不用图表库不明。`stats-charts.js` 自己拿 2d context 画，`package.json` 没有 chart 依赖。  
**注意事项**：数据仍从 `DataStore.getRecords()` 来，图表模块不写存储。

## 待补充

- [ ] 待补充：CloudBase 环境 ID、备案域名、服务器供应商的具体账号信息不要写进仓库；运维步骤以 `docs/DOMESTIC_DEPLOY.md` 为准
- [ ] 待补充：PWA / `sw.js` 还要不要保留。Electron 路径已经跳过 Service Worker，网站部署是否仍依赖它，需人工确认
