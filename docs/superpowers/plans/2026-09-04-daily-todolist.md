# Daily Todolist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 右侧增加按天待办 Tab（增删改查、按日历史、CSV 导入导出、云端同步），开始计时时可下拉选择当天待办作为工作名称。

**Architecture:** 纯函数 `todo-model.js` 负责规范化、合并、CSV；`DataStore` 持久化并入队；`SyncEngine` 把 todos 纳入现有推拉；云函数扩展 `todos` 集合；UI 第三 Tab + 工作名称下拉。

**Tech Stack:** 现有 HTML/CSS/JS IIFE、localStorage、CloudBase 文档库与云函数、Node `node:test`。

## Global Constraints

- 待办按本地日 `YYYY-MM-DD` 分组，不绑定工时 `todoId`
- 标题 trim 后 1–80 字；完成态布尔；同日 `order` 递增
- 同步 Last-Write-Wins；删除语义与工时记录一致
- 不新增云函数名，只扩展现有 `pullWorkRecordChanges` / `batchUpsertWorkRecords`
- 未要求时不 git commit

---

### Task 1: TodoModel 纯函数

**Files:**
- Create: `todo-model.js`
- Test: `tests/todo-model.test.js`
- Modify: `package.json`（`test` 脚本）

**Produces:** `TodoModel.normalizeTodo`, `mergeTodos`, `todosForDate`, `workNameOptions`, `parseTodoCsv`, `toTodoCsv`, `localDateString`

- [ ] 写失败测试并实现，运行 `node --test tests/todo-model.test.js`

---

### Task 2: DataStore CRUD

**Files:**
- Modify: `data-store.js`

**Produces:** `getTodos`, `getAllTodosIncludingDeleted`, `getTodosByDate`, `saveTodo`, `updateTodo`, `deleteTodo`, `importTodos`, `clearTodosByDate`, `setTodosInternal`, `normalizeTodo`

- [ ] 本地键 `todos`；增删改查入 `todo_upsert` / `todo_delete` / `todo_clear_all` 队列

---

### Task 3: 云函数 + SyncEngine

**Files:**
- Modify: `cloudfunctions/pullWorkRecordChanges/index.js`
- Modify: `cloudfunctions/batchUpsertWorkRecords/index.js`
- Modify: `sync-engine.js`
- Modify: `cloudbase/schema.md`, `cloudbase/SETUP.md`

**Produces:** pull 返回 `todos`；batch 支持 `collection: 'todos'`；syncNow 合并/补传/迁移 todos

- [ ] 客户端旧函数无 `todos` 字段时按 `[]` 处理

---

### Task 4: UI Tab + 下拉 + 导入导出

**Files:**
- Modify: `index.html`, `style.css`, `script.js`, `sw.js`, `package.json`（electron files）
- Modify: `docs/USER_GUIDE.md`

**Produces:** 待办 Tab；当天 CRUD；CSV；`#todoWorkSelect` 填入工作名称

- [ ] 刷新待办或同步后更新下拉；无当天项时禁用下拉
