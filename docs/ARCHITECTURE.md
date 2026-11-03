# 架构说明

## 整体结构

两层运行时，中间没有打包器。

1. **桌面壳**（`electron/`）：主进程起一个只监听 `127.0.0.1` 的静态文件服务，用 `BrowserWindow` 打开页面，并用托盘、全局快捷键 `CommandOrControl+Shift+T`、悬浮窗和系统「登录时打开」。关窗口不退出，退出只走托盘菜单。
2. **页面**（仓库根目录的 HTML/JS/CSS）：计时、待办、统计、登录和同步都在浏览器上下文里跑。同一套页面也可以放到大陆 Nginx 上当网站用（见 `docs/DOMESTIC_DEPLOY.md`）。Electron 里检测到 `window.electronAPI` 时不注册 Service Worker。

业务脚本不是 ES module，靠 `index.html` 里的 `<script>` 顺序变成全局对象。顺序是硬依赖，不能随便调：

```
config.js          → APP_CONFIG
vendor/cloudbase.js → CloudBase SDK（禁止当业务代码改）
auth.js            → Auth
todo-model.js      → TodoModel
data-store.js      → DataStore
sync-logic.js      → SyncLogic
sync-engine.js     → SyncEngine
cloud-ui.js        → CloudUI
stats-charts.js    → StatsCharts
script.js          → 页面控制器，bootstrap()
```

已用 `index.html` 的 script 标签和源码调用核对过，不是按文件名猜的。

```
electron/main.js          静态服务 + 窗口/托盘/快捷键
electron/preload.js       contextBridge → window.electronAPI
index.html / style.css    页面结构与样式
script.js                 计时、历史、待办、闹钟、主题的 DOM 逻辑
data-store.js             localStorage 与同步队列的唯一入口
sync-engine.js            上传、增量拉取、进行中会话
sync-logic.js             同步纯函数（可在 Node 里测）
todo-model.js             待办纯函数（可在 Node 里测）
auth.js                   CloudBase 邮箱登录
cloud-ui.js               账户栏、登录框、同步状态
stats-charts.js           周/月/年柱状图（Canvas）
cloudfunctions/           batchUpsertWorkRecords、pullWorkRecordChanges
cloudbase/                控制台配置说明与集合模型
supabase/migrations/      已废弃的旧后端 SQL，运行时不引用
```

`script.js`（约 2400 行）和 `sync-engine.js`（约 1500 行）是两个大文件。新逻辑优先放进已有边界（纯函数进 `todo-model.js` / `sync-logic.js`，存储进 `DataStore`），不要继续往这两个文件里堆无关功能。

## 依赖方向规则

```
electron 主进程 ──IPC──▶ preload.electronAPI ◀── script.js
                              （主进程不 require 任何业务脚本）

script.js / cloud-ui.js / stats-charts.js
        │  只通过下面这些全局对象协作
        ▼
DataStore ──▶ Auth、SyncEngine、TodoModel、SyncLogic、APP_CONFIG
SyncEngine ──▶ Auth、SyncLogic、APP_CONFIG、CloudBase SDK、云函数
Auth ──▶ APP_CONFIG、CloudBase SDK
todo-model.js、sync-logic.js ──▶ 无 DOM、无 localStorage、无 CloudBase
```

关键约束：

- **页面不直接写 CloudBase。** `script.js` 改数据只调 `DataStore.*`。存储层在已登录且 `APP_CONFIG.isCloudEnabled()` 时自己 `SyncEngine.queueOp` / `scheduleSync`。这样离线队列和云端格式不会散落在点击处理函数里。
- **纯函数模块保持可测。** `TodoModel`、`SyncLogic` 用 IIFE，并在 Node 里 `module.exports`。不要在这两个文件里访问 `document`、`localStorage`、`window`。
- **主进程不碰业务数据。** 计时状态由页面 `electronAPI.reportStatus` 推上来，托盘只负责展示和发 `tray:toggle-timer`。主进程不要读 localStorage 或云端。
- **云函数按集合白名单写。** `batchUpsertWorkRecords` 只接受代码里列出的集合。新集合要同时改云函数、`cloudbase/schema.md` 和安全规则，不能只改前端。
- **删除是软删除。** 记录和待办用 `deletedAt`，同步靠 `updatedAt` 做后写覆盖（Last-Write-Wins）。硬删本地行会导致别的设备拉不回删除。

## 主要数据流

### 一次计时

1. `script.js` 的 `bootstrap()`：`Auth.init()` → `DataStore.init()` → `SyncEngine.init()` → `CloudUI.init()` → `init()`。
2. 开始：页面记下进行中记录，`DataStore.saveCurrentRecord`。已登录时 `SyncEngine.pushActiveSession` 写到集合 `active_sessions`（文档 ID = 用户 uid）。
3. 结束：`DataStore.clearCurrentRecord`，再 `DataStore.saveRecord`。存储层把记录放进 `localStorage` 键 `workTimeRecords`，并排队 `upsert`。
4. `SyncEngine` 把队列打成批（默认 100 条）调用云函数 `batchUpsertWorkRecords`；增量变更走 `pullWorkRecordChanges`（带 `serverNow`，避免本机时钟把游标推错）。合并规则是比较 `updatedAt`。
5. 页面订阅 `DataStore.onDataChanged`，刷新历史、待办、统计和标签。

标签、闹钟预设、主题走另一条路：`saveTags` / `saveAlarmPresets` / `saveTheme` 都调用 `syncSettingsToCloud()`，已登录时把 `getSettingsSnapshot()` 交给 `SyncEngine.pushSettings`，写入集合 `user_settings`。远端更新时间不比本地旧，才覆盖本地。

### 按天待办

待办存在 `localStorage` 键 `todos`。规范化、排序、CSV、某天未完成项如何变成「工作名称」下拉，都在 `TodoModel`。`script.js` 只负责列表 DOM 和拖拽，写入仍经 `DataStore.saveTodo` / `updateTodo` / `reorderTodosForDate`。云端集合名是 `todos`。

### 桌面状态

页面每秒（计时中）调用 `electronAPI.reportStatus({ running, elapsed, workName })`。主进程更新托盘 tooltip，并广播给悬浮窗。托盘「开始/结束」通过 `tray:toggle-timer` 回到页面，由 `initElectronBridge` 调用现有的 `startWork` / `endWork`。

## 待补充

- [ ] 待补充：多设备同时计时时 `active_sessions` 的冲突提示文案，以及忽略窗口 `CLEARED_SESSION_IGNORE_MS`（60 秒）是不是产品想要的行为。代码里有这套逻辑，产品说明里没有写清
