# fix-02 评审材料

任务：同步时待办输入不丢焦点。实现已完成，验证已做。`requires_eval` 为 true（改了 6 个文件），Evaluator 通过之前不标 `done`。

## 做了什么

同步结束会调用 `DataStore.notifyDataChanged()`，页面监听里无条件 `renderTodos()`，用 `innerHTML` 换掉整个待办列表。正在编辑的标题输入框被拆掉，焦点丢失，写到一半的文字被打断。列表内容没变时也会这样。

刷新改成三档，判断放在 `TodoModel.planTodoListUpdate`：

- 当前列表和存储一致：不碰 DOM。
- 只改了完成状态或其它行的标题：原地更新那一行，不重建正在输入的输入框。
- 增删或排序：重建列表，恢复草稿和光标。重建触发的 `blur` 不把草稿写入存储，真正失焦才保存。

## 改动文件

- `todo-model.js`：`planTodoListUpdate`
- `tests/todo-model.test.js`：无变化、只保草稿、其它行补丁、顺序或成员变化要重建、入参不是数组要重建
- `script.js`：按上面的计划刷新待办列表
- `index.html`：`todo-model.js` 和 `script.js` 的缓存版本号
- `tasks.json`、`progress.md`：任务记录

## 验证

- `npm test` 退出码 0。
- 浏览器打开待办页，在已有标题里改到一半后调用 `DataStore.notifyDataChanged()`：还是同一个输入框，草稿和光标都在，存储里的标题仍是旧的。
- 同步进来新的一行、必须重建时：焦点回到原待办，草稿还在，且没有被提前保存。
- 只改另一行的标题和完成状态：正在编辑的那一行节点不变。
- 添加框获得焦点时再通知一次：添加框不被抢走。
- 标题真正 blur 后会写入存储。

## 请 Evaluator 看的点

- 拖拽排序仍走原来的 `activeTodoDrag` 推迟重绘，没有和这次的计划刷新缠在一起。
- 云读写仍只经过 `DataStore`，`script.js` 没有直接调 CloudBase。
