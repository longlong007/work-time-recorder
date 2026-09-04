# 按天 Todolist 设计

日期：2026-09-04

## 背景

工作时间记录器右侧已有「历史记录 / 统计」两个 Tab。需要增加按天待办，并让开始计时时可以从当天待办下拉填入工作名称。数据走与工时记录相同的本地优先 + CloudBase 同步。

## 数据模型

每条待办一条文档，本地 `localStorage` 键 `todos`，云端集合 `todos`。

```json
{
  "id": "uuid",
  "date": "2026-09-04",
  "title": "写同步逻辑",
  "done": false,
  "order": 0,
  "updatedAt": "2026-09-04T09:00:00.000Z",
  "deletedAt": null
}
```

- `date`：本地日历日 `YYYY-MM-DD`（与工时历史的本地日期口径一致）
- `title`：必填，trim 后最长 80 字
- `done`：是否完成
- `order`：同一天内排序，新增时取当天 `max(order)+1`
- 删除：本地移除该条，同步队列带 `deletedAt` 做云端物理删除（与工时记录相同）
- 冲突：Last-Write-Wins（`updatedAt`），待同步本地 op 不覆盖

工作记录不绑定 `todoId`：下拉只把标题写入 `workName`。

## UI

右侧第三个 Tab「待办」，默认显示今天。日期选择器用于查看历史某天。

当天列表：勾选完成、改标题、删除；顶部输入框新增。工具栏：导出 / 导入 / 清空当天。

左侧「工作名称」旁增加下拉：当天未完成优先，已完成列在后面；选中后填入输入框，仍可手输。无待办时下拉禁用。

## 导入导出

CSV（BOM + UTF-8），表头：`日期,标题,完成,排序`

- 完成：`是` / `否`
- 导出全部未删除待办
- 导入合并（无 id，一律新 id），最多 5000 条，文件 ≤ 2MB

## 同步

- 集合 `todos`，安全规则与 `work_records` 相同：`doc._openid == auth.uid`
- 索引：`_openid` ↑ + `updatedAt` ↑
- `pullWorkRecordChanges` 用同一 `since` 再查 `todos`，返回 `{ records, todos, serverNow }`
- `batchUpsertWorkRecords` 增加 `collection`：默认 `work_records`，允许 `todos`
- pending 类型：`todo_upsert` / `todo_delete` / `todo_clear_all`
- 首次同步差集补传、迁移策略同时覆盖 todos

未登录 / 云未配置：仅本地。

## 非目标

- 不自动把待办标完成
- 不做拖拽排序、子任务、提醒
- 不做独立云函数名（复用现有两个函数）
