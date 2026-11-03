# 质量标准

## Definition of Done（完成的定义）

一个任务算完成，必须满足：

- [ ] 本地 `npm test` 通过（当前会跑 `tests/todo-model.test.js` 和 `tests/sync-logic.test.js`）
- [ ] 改了纯函数（`TodoModel` / `SyncLogic` 或新抽出的同类模块）时，补了正常路径和至少一个拒绝/失败路径
- [ ] 改了计时、待办、同步或登录的用户可见行为时，用 `npm start` 走通对应操作（开始/结束、改一条记录、或登录后看同步状态）。只改文档或测试则不必开窗口
- [ ] 没有把 `config.js`、`.cloudbaserc.json`、密钥写进提交
- [ ] `index.html` 的 script 顺序仍满足 `docs/ARCHITECTURE.md`；新增页面脚本时加了 `?v=` 缓存版本
- [ ] git commit 信息符合 `docs/CONVENTIONS.md`（`type: 中文结果`）
- [ ] 架构或约定变了，对应的 docs/ 已更新
- [ ] `tasks.json` 里该任务的 `verify` 已实际执行；`requires_eval: true` 的还要等 Evaluator 通过才标 `done`

仓库没有 lint 和类型检查命令。不要把「lint 通过」写成完成条件，除非以后真的加上。

## 代码审查检查清单

**正确性**

- [ ] 工时和待办的删除是否仍是软删除（`deletedAt`），并更新了 `updatedAt`
- [ ] 云写入是否只在 `Auth.isLoggedIn()` 且 `APP_CONFIG.isCloudEnabled()` 时发生；未配置时界面保持本地模式
- [ ] 同步是否仍用后写覆盖，而不是按数组下标合并
- [ ] 批量上传是否用云函数返回的 inserted/updated/deleted 判断真写成功（`SyncLogic.isSilentBatchFailure`），避免「ok 但没写库」
- [ ] 新的 CloudBase 查询是否会逼出「唯一索引」。`updatedAt`、`startTime` 只能是普通复合索引
- [ ] Electron：关窗口是否仍然不退出；托盘退出才会停静态服务

**可维护性**

- [ ] 命名是否符合 `docs/CONVENTIONS.md`
- [ ] 业务规则是否进了纯函数模块，而不是又加进 `script.js` / `sync-engine.js`
- [ ] DOM 层有没有直接调用 CloudBase SDK

**数据与安全**

- [ ] 文档是否带当前用户 `_openid`，没有读到别人的记录
- [ ] 密码规则仍在 `Auth.validatePassword`（8–32 位且含字母和数字）这一层校验，没有在 UI 里复制一套不一致的规则

## 测试要求

- 运行：在仓库根目录执行 `npm test`
- 框架：Node 内置测试。`tests/todo-model.test.js` 使用 `node:test` + `node:assert/strict`；`tests/sync-logic.test.js` 自写了薄封装 `test()`。新测试跟 todo 那个文件走，用 `node:test`。
- 覆盖范围：目前只保证待办规范化和同步策略纯函数。UI、`DataStore`、`SyncEngine` 没有自动化测试，改它们时要在验证步骤里写明手工路径。
- 断言用具体值（标题、日期、条数、布尔），不要只断言「不抛错」。

## 待补充

- [ ] 待补充：没有性能基准。`docs/ROADMAP.md` 提到上万条记录的渲染，但代码里没有对应指标
- [ ] 待补充：大陆部署的验收（HTTPS、安全域名、云函数是否部署）没有写进 CI，仍是人工按 `docs/DOMESTIC_DEPLOY.md` 做
