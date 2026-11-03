# 工作时间记录器 — Agent 工作指南

## 这是什么项目
个人用的工作计时工具。桌面端是 Electron（托盘、全局快捷键），页面本身是无打包的 HTML/JS。可选登录腾讯云 CloudBase，把工时和按天待办离线优先同步到云端。

## 快速定向
- **我在哪个目录？** 运行 `pwd`，应在仓库根目录
- **技术栈**：浏览器 JavaScript（无打包）+ Electron 33 + CloudBase 文档库；测试用 Node 内置 `node:test`
- **入口文件**：`electron/main.js`（桌面壳）；页面是 `index.html`，业务启动在 `script.js` 的 `bootstrap()`
- **启动命令**：`npm start`（本机静态服务，默认 `http://127.0.0.1:8080`，占用则试到 8109）
- **测试命令**：`npm test`
- **打包**：`npm run pack`（.app），`npm run dist`（.dmg），产物在 `dist-electron/`

云同步需要根目录 `config.js`（从 `config.example.js` 复制）。没有它也能当纯本地应用用。

## 知识库地图
在做任何修改前，先阅读相关文档：

| 我想了解... | 去读这个文件 |
|------------|-------------|
| 整体架构、模块划分 | `docs/ARCHITECTURE.md` |
| 命名规则、代码风格 | `docs/CONVENTIONS.md` |
| 技术选型原因 | `docs/TECH_DECISIONS.md` |
| 什么叫"完成" | `docs/QUALITY.md` |
| 当前进行中的计划 | `docs/exec-plans/active/` |
| 待开发功能列表 | `docs/exec-plans/backlog.md` |
| 已知技术债务 | `docs/exec-plans/tech-debt-tracker.md` |
| 功能怎么用 | `docs/USER_GUIDE.md` |
| Mac 打包与启动 | `docs/MAC_APP.md` |
| 国内服务器部署 | `docs/DOMESTIC_DEPLOY.md` |
| 云端集合字段 | `cloudbase/schema.md` |
| 产品远景（非承诺） | `docs/ROADMAP.md` |

## 工作规范
1. **改之前先读**：修改任何模块前，先读 `docs/ARCHITECTURE.md` 里该模块的依赖方向
2. **完成即提交**：每个功能完成后立即 git commit，写清楚做了什么
3. **更新文档**：如果修改影响了架构或约定，同步更新 docs/
4. **不要猜**：看不懂的地方先读文档，文档没有再问

### 新增任务时，必须：
1. 填写 `tasks.json` 里的所有字段，不能省略
2. 对照以下标准判断 `requires_eval`，不能默认填 false 不加思考：
   - 新功能 / 涉及安全权限 / 改动超过 3 个文件 / 重构 → true
   - 纯 bug 修复 / 文档更新 / 配置调整 → false

### 每次完成一个任务后，必须按顺序执行：
1. 执行 `tasks.json` 里该任务 `verify` 字段描述的验证步骤
2. 若该任务 `requires_eval` 为 `true`：填写 `sprint_output.md`，等待 Evaluator 评审通过后才能标记 `done`；若为 `false`：验证通过即可标记 `done`
3. git commit，格式：`type: 做了什么，遗留了什么（如有）`
4. 在 `progress.md` 顶部追加本次记录

**禁止**：跳过 verify 步骤自行判断任务已完成。
**禁止**：不经判断直接把 `requires_eval` 设为 false。

## 禁止事项
- 不要提交 `config.js`、`.cloudbaserc.json`（含 CloudBase 环境 ID，已在 `.gitignore`）
- 不要修改 `vendor/cloudbase.js`（自托管 SDK，不是业务代码）
- 不要给 `work_records` / `todos` 的 `updatedAt` 或 `startTime` 建唯一索引（补传会静默失败，见 `cloudbase/schema.md`）
- 不要在 `script.js` 里直接调 CloudBase SDK；云读写走 `DataStore` → `SyncEngine`
- 不要删 `supabase/` 里的历史 SQL，除非任务明确要求清理
