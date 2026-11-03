# 技术债务追踪

每条格式：`[优先级: 高/中/低] 问题描述 — 影响范围`

扫描日期：2026-11-03。依据是文件行数、引用关系和仓库里的过时说明，不是风格偏好。

## 当前债务

- [优先级: 高] `script.js` 约 2380 行，同时管计时、历史编辑、待办拖拽、标签、闹钟、主题和 Electron 桥 — 改一处容易碰到无关 DOM 逻辑；纯函数测试进不去这个文件
- [优先级: 高] `sync-engine.js` 约 1540 行，队列、补传、增量拉取、进行中会话和看门狗都在一个 IIFE 里 — 同步 bug 难定位，也没法用现有 `npm test` 覆盖
- [优先级: 高] `README.md` 仍把项目写成「双击 index.html + GitHub Pages + 仅 LocalStorage」— 和 `package.json`、`docs/MAC_APP.md`、CloudBase 同步不一致，新人会按错误方式启动
- [优先级: 中] 自动化测试只覆盖 `TodoModel` 和 `SyncLogic` — `DataStore` 的软删除、去重、入队没有回归网
- [优先级: 中] `generateId` 在 `data-store.js` 和 `todo-model.js` 各写了一份 — 以后改 ID 规则容易只改一处
- [优先级: 中] `DEFAULT_ALARM_PRESETS` 在 `script.js` 和 `data-store.js` 各有一份 `[5, 10, 15, 30, 45]` — 改预设默认值可能两边不一致
- [优先级: 中] `supabase/migrations/001_init.sql` 仍在仓库，运行时无引用，部署脚本还要专门排除 — 容易被当成现行数据模型；现行模型是 `cloudbase/schema.md`
- [优先级: 低] `.gitignore` 仍有「GitHub Pages 需要这些文件」的注释 — 和已移除 Pages 部署的提交说明矛盾，只影响读忽略规则的人
- [优先级: 低] CI 只有 `deploy-mainland.yml`，推送不跑 `npm test` — 纯函数测试坏了要到本地才知道
- [优先级: 低] 没有 ESLint / 格式化 — 大文件里风格只能靠阅读维持

## 已解决

（空）
