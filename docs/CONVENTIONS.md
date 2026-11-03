# 代码约定

从现有代码归纳。不一致的地方照实写，没有发明新规范。

## 文件命名

- 可复用模块用 kebab-case：`data-store.js`、`sync-engine.js`、`sync-logic.js`、`cloud-ui.js`、`stats-charts.js`、`todo-model.js`。
- 早期入口仍是单词文件：`script.js`、`auth.js`、`style.css`、`index.html`。新模块不要再仿 `script.js` 这种名字。
- 测试：`tests/<模块名>.test.js`，例如 `tests/todo-model.test.js`、`tests/sync-logic.test.js`。
- 云函数目录用 camelCase，与 `config.example.js` 里的函数名一致：`cloudfunctions/batchUpsertWorkRecords/`、`cloudfunctions/pullWorkRecordChanges/`。
- 文档用大写主题名：`docs/ARCHITECTURE.md`。已有专题文档保持原名（`USER_GUIDE.md`、`MAC_APP.md`）。

## 变量和函数命名

- 全局模块是 PascalCase 单例：`DataStore`、`Auth`、`SyncEngine`、`SyncLogic`、`CloudUI`、`StatsCharts`、`TodoModel`、`APP_CONFIG`。
- 函数和局部变量用 camelCase：`saveCurrentRecord`、`normalizeTodo`、`isSilentBatchFailure`。
- 模块内常量用 UPPER_SNAKE：`STORAGE_KEY`、`PAGE_SIZE`、`SHORTCUT`。页面级常量同样，例如 `script.js` 的 `REST_TAG = '休息'`。
- DOM 查找用元素 id 的 camelCase 变量接住：`workNameInput` 对应 `id="workNameInput"`。`cloud-ui.js` 内部用 `$('accountBar')` 包一层 `getElementById`。
- CSS class 用 kebab-case：`account-bar`、`timer-card`、`btn-primary`。
- localStorage 键用 camelCase 字符串：`workTimeRecords`、`todos`、`pendingSyncOps`、`currentRecord`、`workTags`。
- 云端字段用 camelCase（`startTime`、`updatedAt`、`deletedAt`），不是 Supabase 时期的蛇形。文档 ID 等于记录 UUID；用户隔离字段是 CloudBase 的 `_openid`。
- IPC 频道用 `域:动作`：`timer:status`、`tray:toggle-timer`、`settings:get-open-at-login`。

## 目录组织

- 仓库根目录放页面和业务脚本。没有 `src/`。
- `electron/` 只放主进程、preload、悬浮窗和图标。
- `tests/` 只放不依赖 DOM 的 Node 测试。
- `cloudfunctions/<函数名>/` 各自有 `package.json`，依赖装在函数目录里，不要提升到仓库根的 `package.json`。
- `vendor/` 只放第三方浏览器脚本。
- `deploy/` 放大陆机的 nginx 与部署脚本；`.github/workflows/deploy-mainland.yml` 是推 `main` 后的部署。
- 配置样例提交，真配置不提交：提交 `config.example.js`、`.cloudbaserc.example.json`；不提交 `config.js`、`.cloudbaserc.json`。

## 模块写法

浏览器脚本用 IIFE，把 API 挂到一个全局对象上：

```javascript
const SyncLogic = (function () {
    function computeMissingRecords() { /* ... */ }
    return { computeMissingRecords };
})();
```

需要被 `npm test` 加载的文件，在 IIFE 之后加：

```javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncLogic;
}
```

`todo-model.js` 用的是 UMD 形态（`root.TodoModel = factory()`），效果相同。新的纯函数模块二选一，优先跟 `sync-logic.js` 一样短的写法。

注释用中文，解释「为什么」而不是复述语句。文件顶部用一行注释说明模块职责，例如 `sync-engine.js` 的「离线优先，Last-Write-Wins」。

## Git Commit 格式

现有历史是中文、带类型前缀、多数不写 scope：

```
feat: 待办列表支持拖拽排序
fix: 用指针拖拽修复待办排序无法拖动
docs: 补充 Mac 桌面应用打包与启动说明
chore: 将「开始/结束工作」文案改为「开始/结束」
```

继续用 `feat` / `fix` / `docs` / `chore` / `refactor` / `test`。一句话写结果。Harness 任务完成时在同一句里补上遗留项（如有）：`fix: 做了什么，遗留了什么`。

## 待补充

- [ ] 待补充：没有 ESLint / Prettier 配置，缩进和分号目前靠人工保持（现有文件是 4 空格 + 分号）
- [ ] 当前不一致：`auth.js` 是单词文件名，其它后期模块是 kebab-case。建议新认证相关文件用 kebab-case，不要为了统一去重命名 `auth.js`（`index.html` 和缓存版本号都引用它）
