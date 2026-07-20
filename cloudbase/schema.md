# CloudBase 数据模型

替代原 `supabase/migrations/001_init.sql`，使用 CloudBase 文档型数据库集合。

## 集合：work_records

文档 ID = 记录 UUID

```json
{
  "startTime": "2026-06-12T10:00:00.000Z",
  "endTime": "2026-06-12T12:00:00.000Z",
  "duration": 7200000,
  "workName": "开发",
  "updatedAt": "2026-06-12T12:00:00.000Z",
  "deletedAt": null
}
```

## 集合：user_settings

文档 ID = 用户 uid

```json
{
  "tags": ["开发", "会议", "学习"],
  "alarmPresets": [5, 10, 15, 30, 45],
  "theme": "dark",
  "updatedAt": "2026-06-12T12:00:00.000Z"
}
```

## 集合：active_sessions

文档 ID = 用户 uid

```json
{
  "startTime": "2026-06-12T10:00:00.000Z",
  "workName": "开发",
  "isActive": true,
  "updatedAt": "2026-06-12T10:00:00.000Z"
}
```

## 安全规则（每个集合相同）

```json
{
  "read": "doc._openid == auth.uid",
  "write": "doc._openid == auth.uid"
}
```

## 索引建议

若增量同步报错，在 CloudBase 控制台为 `work_records` 添加复合索引：

- 字段：`_openid`（升序）+ `updatedAt`（升序）

若按开始时间排序报错，添加：

- 字段：`_openid`（升序）+ `startTime`（降序）
