# 数据迁移指南

从 Supabase 迁移到 CloudBase 的一次性操作说明。

## 场景 A：本地有完整数据（推荐）

若本机 localStorage 中已有全部工时记录：

1. 完成 [cloudbase/SETUP.md](../cloudbase/SETUP.md) 配置
2. 在 `config.js` 填入 CloudBase 环境 ID
3. 启动应用，注册/登录 CloudBase 账户
4. 登录后会弹出「迁移本地数据」对话框
5. 选择 **上传到云端** 或 **合并两边数据**

App 内置迁移流程（`cloud-ui.js`）会自动将 localStorage 数据写入 CloudBase。

## 场景 B：数据仅在 Supabase 云端

若历史数据只存在于 Supabase、本机没有：

1. 从 Supabase Dashboard → Table Editor → `work_records` 导出 CSV/JSON
2. 在 CloudBase 控制台或使用脚本导入到 `work_records` 集合
3. 字段映射（Supabase 蛇形 → CloudBase 驼峰）：

| Supabase 字段 | CloudBase 字段 |
|--------------|----------------|
| `id` | 文档 `_id` |
| `start_time` | `startTime` |
| `end_time` | `endTime` |
| `duration_ms` | `duration` |
| `work_name` | `workName` |
| `updated_at` | `updatedAt` |
| `deleted_at` | `deletedAt` |

4. 导入时需确保每条记录带有对应用户的 `_openid`（等于该用户的 `uid`）

## 场景 C：切换后端后清空重来

若数据量不大，可接受从零开始：

1. 导出 CSV 备份（App 内「导出」按钮）
2. 登录 CloudBase 新账户
3. 使用「导入」功能重新导入 CSV

## 验证

- [ ] 登录后历史记录数量正确
- [ ] 新建/编辑/删除记录可同步
- [ ] 标签、主题、闹钟预设已同步
- [ ] 跨设备「进行中计时」实时同步正常
