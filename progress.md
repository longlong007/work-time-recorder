# 项目进度记录

> 每次 session 完成任务后，在顶部追加记录。不要删除历史。
> 格式：## [日期] [任务名]

---

## 2026-11-24 fix-02 改为等待评审

- `fix-02` 改了 6 个文件，按 AGENTS.md 把 `requires_eval` 改为 true，并写了 `sprint_output.md`
- 状态改为 `awaiting_eval`。Evaluator 通过之前不标 `done`
- 下次从这里开始：Evaluator 看 `sprint_output.md`；其它待办仍是 `docs-01`

## 2026-11-24 同步时待办输入不丢焦点

- 完成 fix-02：同步通知不再整表重建待办。未改动的列表直接跳过；只改完成状态或其它行标题时原地更新；增删或排序才重建，并恢复正在编辑的草稿和光标
- 验证：`npm test` 通过。浏览器里在标题输入过程中调用 `DataStore.notifyDataChanged()`，焦点、草稿和光标都还在，未提交文字不会被写进存储；失焦后标题仍会保存
- 下次从这里开始：读 `tasks.json`，选 priority=high 且 status=pending 的任务（当前是 `docs-01`）

## 2026-11-03 初始化 Harness

- 完成 harness-step1：建立 docs/ 骨架（架构、约定、技术决策、质量、backlog、技术债务）
- 完成 harness-step2：按源码引用关系填了知识库，推断处标明了来源，不确定处标了「待补充」
- 完成 harness-step3：建立 `init.sh`、`tasks.json`、`progress.md`，并写入 AGENTS.md 的任务规则
- tasks.json 初始任务数：4 个（其中 `requires_eval: true` 的 2 个：`ui-01`、`sync-01`）
- 下次从这里开始：读 `tasks.json`，选 priority=high 且 status=pending 的任务（当前是 `docs-01`）
