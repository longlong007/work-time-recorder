const { test } = require('node:test');
const assert = require('node:assert/strict');
const TodoModel = require('../todo-model.js');

test('normalizeTodo fills defaults and trims title', () => {
    const todo = TodoModel.normalizeTodo({
        date: '2026-09-04',
        title: '  写同步  ',
        done: 'yes'
    });
    assert.equal(typeof todo.id, 'string');
    assert.ok(todo.id.length > 0);
    assert.equal(todo.date, '2026-09-04');
    assert.equal(todo.title, '写同步');
    assert.equal(todo.done, true);
    assert.equal(todo.order, 0);
    assert.equal(todo.deletedAt, null);
    assert.ok(todo.updatedAt);
});

test('normalizeTodo rejects empty title', () => {
    assert.throws(() => TodoModel.normalizeTodo({ date: '2026-09-04', title: '   ' }), /标题/);
});

test('normalizeTodo truncates title to 80 chars', () => {
    const todo = TodoModel.normalizeTodo({
        date: '2026-09-04',
        title: 'x'.repeat(100)
    });
    assert.equal(todo.title.length, 80);
});

test('todosForDate sorts by order and excludes other days', () => {
    const todos = [
        TodoModel.normalizeTodo({ id: 'b', date: '2026-09-04', title: '后', order: 2 }),
        TodoModel.normalizeTodo({ id: 'a', date: '2026-09-04', title: '前', order: 1 }),
        TodoModel.normalizeTodo({ id: 'c', date: '2026-09-03', title: '昨天', order: 0 })
    ];
    const today = TodoModel.todosForDate(todos, '2026-09-04');
    assert.deepEqual(today.map((t) => t.id), ['a', 'b']);
});

test('workNameOptions excludes completed todos', () => {
    const todos = [
        TodoModel.normalizeTodo({ id: '1', date: '2026-09-04', title: '已完成', done: true, order: 0 }),
        TodoModel.normalizeTodo({ id: '2', date: '2026-09-04', title: '未完成B', done: false, order: 2 }),
        TodoModel.normalizeTodo({ id: '3', date: '2026-09-04', title: '未完成A', done: false, order: 1 })
    ];
    const options = TodoModel.workNameOptions(todos, '2026-09-04');
    assert.deepEqual(options.map((o) => o.title), ['未完成A', '未完成B']);
    assert.ok(options.every((o) => o.done === false));
});

test('mergeTodos uses last-write-wins and skips pending ids', () => {
    const local = [
        TodoModel.normalizeTodo({
            id: 'keep',
            date: '2026-09-04',
            title: '本地新',
            updatedAt: '2026-09-04T12:00:00.000Z'
        }),
        TodoModel.normalizeTodo({
            id: 'pending',
            date: '2026-09-04',
            title: '未上传',
            updatedAt: '2026-09-04T10:00:00.000Z'
        })
    ];
    const remote = [
        TodoModel.normalizeTodo({
            id: 'keep',
            date: '2026-09-04',
            title: '云端旧',
            updatedAt: '2026-09-04T11:00:00.000Z'
        }),
        TodoModel.normalizeTodo({
            id: 'pending',
            date: '2026-09-04',
            title: '云端抢写',
            updatedAt: '2026-09-04T13:00:00.000Z'
        }),
        TodoModel.normalizeTodo({
            id: 'gone',
            date: '2026-09-04',
            title: '已删',
            deletedAt: '2026-09-04T12:00:00.000Z',
            updatedAt: '2026-09-04T12:00:00.000Z'
        }),
        TodoModel.normalizeTodo({
            id: 'new',
            date: '2026-09-04',
            title: '云端新增',
            updatedAt: '2026-09-04T12:00:00.000Z'
        })
    ];
    const merged = TodoModel.mergeTodos(local, remote, new Set(['pending']));
    const byId = Object.fromEntries(merged.map((t) => [t.id, t]));
    assert.equal(byId.keep.title, '本地新');
    assert.equal(byId.pending.title, '未上传');
    assert.equal(byId.new.title, '云端新增');
    assert.equal(byId.gone, undefined);
});

test('CSV roundtrip preserves date title done order', () => {
    const todos = [
        TodoModel.normalizeTodo({
            id: '1',
            date: '2026-09-04',
            title: '含,逗号',
            done: true,
            order: 3
        })
    ];
    const csv = TodoModel.toTodoCsv(todos);
    const parsed = TodoModel.parseTodoCsv(csv);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].date, '2026-09-04');
    assert.equal(parsed[0].title, '含,逗号');
    assert.equal(parsed[0].done, true);
    assert.equal(parsed[0].order, 3);
});

test('parseTodoCsv skips invalid rows', () => {
    const csv = [
        '日期,标题,完成,排序',
        'not-a-date,坏日期,否,0',
        '2026-09-04,,否,0',
        '2026-09-04,正常,是,1'
    ].join('\n');
    const parsed = TodoModel.parseTodoCsv(csv);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].title, '正常');
    assert.equal(parsed[0].done, true);
});
