(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TodoModel = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const TITLE_MAX = 80;
    const MAX_IMPORT = 5000;

    function generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function localDateString(date) {
        const d = date instanceof Date ? date : new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseDone(value) {
        if (value === true || value === 1) return true;
        const text = String(value == null ? '' : value).trim().toLowerCase();
        return text === 'true' || text === 'yes' || text === '1' || text === '是' || text === 'done';
    }

    function normalizeTodo(todo) {
        const title = String((todo && todo.title) || '').trim();
        if (!title) {
            throw new Error('标题不能为空');
        }
        const date = String((todo && todo.date) || '').trim();
        if (!DATE_RE.test(date)) {
            throw new Error('日期格式无效');
        }
        const orderRaw = todo && todo.order;
        const order = Number.isFinite(Number(orderRaw)) ? Math.max(0, Math.floor(Number(orderRaw))) : 0;
        const now = new Date().toISOString();
        return {
            id: (todo && todo.id) || generateId(),
            date,
            title: title.slice(0, TITLE_MAX),
            done: parseDone(todo && todo.done),
            order,
            updatedAt: (todo && todo.updatedAt) || now,
            deletedAt: (todo && todo.deletedAt) || null
        };
    }

    function todosForDate(todos, dateStr) {
        return (todos || [])
            .filter((t) => t && !t.deletedAt && t.date === dateStr)
            .slice()
            .sort((a, b) => a.order - b.order || String(a.title).localeCompare(String(b.title), 'zh'));
    }

    function workNameOptions(todos, dateStr) {
        return todosForDate(todos, dateStr)
            .filter((t) => !t.done)
            .map((t) => ({
                id: t.id,
                title: t.title,
                done: false
            }));
    }

    function nextOrder(todos, dateStr) {
        const items = todosForDate(todos, dateStr);
        if (items.length === 0) return 0;
        return Math.max(...items.map((t) => t.order)) + 1;
    }

    function mergeTodos(localTodos, remoteTodos, pendingIds) {
        const map = new Map();
        const pending = pendingIds instanceof Set ? pendingIds : new Set(pendingIds || []);

        (localTodos || []).forEach((t) => {
            if (t && t.id) map.set(t.id, t);
        });

        (remoteTodos || []).forEach((remote) => {
            if (!remote || !remote.id) return;
            const local = map.get(remote.id);
            if (!local) {
                if (!remote.deletedAt) map.set(remote.id, remote);
                return;
            }
            if (pending.has(remote.id)) return;
            const localTime = new Date(local.updatedAt || 0).getTime();
            const remoteTime = new Date(remote.updatedAt || 0).getTime();
            if (remoteTime >= localTime) {
                if (remote.deletedAt) map.delete(remote.id);
                else map.set(remote.id, remote);
            }
        });

        return Array.from(map.values()).filter((t) => !t.deletedAt);
    }

    function escapeCsvField(value) {
        const text = String(value == null ? '' : value);
        if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    function parseCsvLine(text) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    function toTodoCsv(todos) {
        const lines = ['日期,标题,完成,排序'];
        (todos || [])
            .filter((t) => t && !t.deletedAt)
            .forEach((t) => {
                lines.push(
                    [
                        escapeCsvField(t.date),
                        escapeCsvField(t.title),
                        t.done ? '是' : '否',
                        String(t.order == null ? 0 : t.order)
                    ].join(',')
                );
            });
        return lines.join('\n');
    }

    function parseTodoCsv(text) {
        const clean = String(text || '').replace(/^\ufeff/, '');
        const lines = clean.split(/\r?\n/);
        const todos = [];
        for (let i = 1; i < lines.length; i++) {
            if (todos.length >= MAX_IMPORT) break;
            const line = lines[i].trim();
            if (!line) continue;
            const columns = parseCsvLine(line);
            if (columns.length < 2) continue;
            const date = columns[0];
            const title = columns[1];
            const done = columns[2];
            const order = columns[3];
            try {
                todos.push(
                    normalizeTodo({
                        date,
                        title,
                        done,
                        order
                    })
                );
            } catch (e) {
                continue;
            }
        }
        return todos;
    }

    return {
        TITLE_MAX,
        MAX_IMPORT,
        generateId,
        localDateString,
        normalizeTodo,
        todosForDate,
        workNameOptions,
        nextOrder,
        mergeTodos,
        toTodoCsv,
        parseTodoCsv
    };
});
