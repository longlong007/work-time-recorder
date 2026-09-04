// 数据存储抽象层 — localStorage 缓存 + 云端同步队列
const DataStore = (function () {
    const STORAGE_KEY = 'workTimeRecords';
    const TODOS_STORAGE_KEY = 'todos';
    const TAGS_STORAGE_KEY = 'workTags';
    const ALARM_PRESETS_KEY = 'alarmPresets';
    const CURRENT_RECORD_KEY = 'currentRecord';
    const THEME_KEY = 'theme';
    const DEFAULT_TAGS = ['开发', '学习', '调试', '文档', '休息'];
    const DEFAULT_ALARM_PRESETS = [5, 10, 15, 30, 45];

    const dataListeners = [];

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

    function normalizeRecord(record) {
        const now = new Date().toISOString();
        return {
            id: record.id || generateId(),
            startTime: record.startTime,
            endTime: record.endTime,
            duration: record.duration,
            workName: record.workName || '',
            updatedAt: record.updatedAt || record.endTime || record.startTime || now,
            deletedAt: record.deletedAt || null
        };
    }

    function readRawRecords() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeRecord);
        } catch (e) {
            console.warn('历史记录数据损坏，已重置');
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    }

    function writeRawRecords(records) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function notifyDataChanged() {
        dataListeners.forEach((cb) => {
            try {
                cb();
            } catch (e) {
                console.error('DataStore listener error:', e);
            }
        });
    }

    function onDataChanged(callback) {
        dataListeners.push(callback);
        return () => {
            const idx = dataListeners.indexOf(callback);
            if (idx >= 0) dataListeners.splice(idx, 1);
        };
    }

    function queueRecordUpsert(record) {
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.queueOp({
                type: 'upsert',
                id: record.id,
                record
            });
            SyncEngine.scheduleSync();
        }
    }

    function queueRecordDelete(record) {
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.queueOp({
                type: 'delete',
                id: record.id,
                record
            });
            SyncEngine.scheduleSync();
        }
    }

    function init() {
        const records = readRawRecords();
        const needsWrite = records.some((r, i) => {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')[i];
            return raw && !raw.id;
        });
        if (needsWrite) {
            writeRawRecords(records);
        }
    }

    function getRecords() {
        return readRawRecords()
            .filter((r) => !r.deletedAt)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    function getAllRecordsIncludingDeleted() {
        return readRawRecords();
    }

    function getAllRecordsRaw() {
        return readRawRecords().filter((r) => !r.deletedAt);
    }

    function setRecordsInternal(records) {
        writeRawRecords(records.map(normalizeRecord));
    }

    function saveRecord(record) {
        const normalized = normalizeRecord({
            ...record,
            updatedAt: new Date().toISOString()
        });
        const records = readRawRecords().filter((r) => !r.deletedAt);
        records.push(normalized);
        records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        writeRawRecords(records);
        queueRecordUpsert(normalized);
        notifyDataChanged();
        return normalized;
    }

    function updateRecord(idOrStartTime, patch) {
        const records = readRawRecords();
        const idx = records.findIndex(
            (r) => r.id === idOrStartTime || r.startTime === idOrStartTime
        );
        if (idx === -1) return null;

        const updated = normalizeRecord({
            ...records[idx],
            ...patch,
            id: records[idx].id,
            updatedAt: new Date().toISOString()
        });
        records[idx] = updated;
        writeRawRecords(records.filter((r) => !r.deletedAt));
        queueRecordUpsert(updated);
        notifyDataChanged();
        return updated;
    }

    function findRecord(idOrStartTime) {
        return getRecords().find(
            (r) => r.id === idOrStartTime || r.startTime === idOrStartTime
        );
    }

    function deleteRecord(idOrStartTime) {
        const records = readRawRecords();
        const record = records.find(
            (r) => r.id === idOrStartTime || r.startTime === idOrStartTime
        );
        if (!record) return false;

        const deleted = {
            ...record,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const remaining = records.filter((r) => r.id !== record.id);
        writeRawRecords(remaining);
        queueRecordDelete(deleted);
        notifyDataChanged();
        return true;
    }

    function importRecords(newRecords) {
        const existing = readRawRecords().filter((r) => !r.deletedAt);
        const normalized = newRecords.map((r) =>
            normalizeRecord({ ...r, updatedAt: new Date().toISOString() })
        );
        const all = [...existing, ...normalized];
        all.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        writeRawRecords(all);
        normalized.forEach(queueRecordUpsert);
        notifyDataChanged();
        return normalized.length;
    }

    function queueTodoUpsert(todo) {
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.queueOp({
                type: 'todo_upsert',
                id: todo.id,
                record: todo
            });
            SyncEngine.scheduleSync();
        }
    }

    function queueTodoDelete(todo) {
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.queueOp({
                type: 'todo_delete',
                id: todo.id,
                record: todo
            });
            SyncEngine.scheduleSync();
        }
    }

    function readRawTodos() {
        const raw = localStorage.getItem(TODOS_STORAGE_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map((t) => {
                try {
                    return TodoModel.normalizeTodo(t);
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
        } catch (e) {
            console.warn('待办数据损坏，已重置');
            localStorage.removeItem(TODOS_STORAGE_KEY);
            return [];
        }
    }

    function writeRawTodos(todos) {
        localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    }

    function getTodos() {
        return readRawTodos().filter((t) => !t.deletedAt);
    }

    function getAllTodosIncludingDeleted() {
        return readRawTodos();
    }

    function getTodosByDate(dateStr) {
        return TodoModel.todosForDate(getTodos(), dateStr);
    }

    function setTodosInternal(todos) {
        writeRawTodos(
            (todos || [])
                .map((t) => {
                    try {
                        return TodoModel.normalizeTodo(t);
                    } catch (e) {
                        return null;
                    }
                })
                .filter(Boolean)
        );
    }

    function saveTodo(todo) {
        const existing = getTodos();
        const date = todo.date || TodoModel.localDateString(new Date());
        const normalized = TodoModel.normalizeTodo({
            ...todo,
            date,
            order: todo.order == null ? TodoModel.nextOrder(existing, date) : todo.order,
            updatedAt: new Date().toISOString()
        });
        existing.push(normalized);
        writeRawTodos(existing);
        queueTodoUpsert(normalized);
        notifyDataChanged();
        return normalized;
    }

    function updateTodo(id, patch) {
        const todos = readRawTodos();
        const idx = todos.findIndex((t) => t.id === id);
        if (idx === -1) return null;
        const updated = TodoModel.normalizeTodo({
            ...todos[idx],
            ...patch,
            id: todos[idx].id,
            updatedAt: new Date().toISOString()
        });
        todos[idx] = updated;
        writeRawTodos(todos.filter((t) => !t.deletedAt));
        queueTodoUpsert(updated);
        notifyDataChanged();
        return updated;
    }

    function findTodo(id) {
        return getTodos().find((t) => t.id === id) || null;
    }

    function deleteTodo(id) {
        const todos = readRawTodos();
        const todo = todos.find((t) => t.id === id);
        if (!todo) return false;
        const deleted = {
            ...todo,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        writeRawTodos(todos.filter((t) => t.id !== id));
        queueTodoDelete(deleted);
        notifyDataChanged();
        return true;
    }

    function importTodos(newTodos) {
        const existing = getTodos();
        const normalized = [];
        (newTodos || []).forEach((t) => {
            try {
                normalized.push(
                    TodoModel.normalizeTodo({
                        ...t,
                        id: TodoModel.generateId(),
                        updatedAt: new Date().toISOString()
                    })
                );
            } catch (e) {
                // skip invalid rows
            }
        });
        writeRawTodos(existing.concat(normalized));
        normalized.forEach(queueTodoUpsert);
        notifyDataChanged();
        return normalized.length;
    }

    function clearTodosByDate(dateStr) {
        const todos = getTodos();
        const now = new Date().toISOString();
        const kept = [];
        const removed = [];
        todos.forEach((t) => {
            if (t.date === dateStr) {
                removed.push({ ...t, deletedAt: now, updatedAt: now });
            } else {
                kept.push(t);
            }
        });
        writeRawTodos(kept);
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled() && removed.length > 0) {
            SyncEngine.queueOp({
                type: 'todo_clear_all',
                id: `todo_clear_${dateStr}`,
                records: removed
            });
            SyncEngine.scheduleSync();
        }
        notifyDataChanged();
        return removed.length;
    }

    function clearAllRecords() {
        const records = readRawRecords().filter((r) => !r.deletedAt);
        const now = new Date().toISOString();
        writeRawRecords([]);
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.queueOp({
                type: 'clear_all',
                id: 'clear_all',
                records: records.map((r) => ({
                    ...r,
                    deletedAt: now,
                    updatedAt: now
                }))
            });
            SyncEngine.scheduleSync();
        }
        notifyDataChanged();
    }

    function getTags() {
        const raw = localStorage.getItem(TAGS_STORAGE_KEY);
        if (!raw) return [...DEFAULT_TAGS];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_TAGS];
        } catch (e) {
            return [...DEFAULT_TAGS];
        }
    }

    function saveTags(tags) {
        localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
        syncSettingsToCloud();
    }

    function getAlarmPresets() {
        try {
            const raw = localStorage.getItem(ALARM_PRESETS_KEY);
            if (!raw) return [...DEFAULT_ALARM_PRESETS];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [...DEFAULT_ALARM_PRESETS];
            const valid = parsed
                .map((n) => parseInt(n, 10))
                .filter((n) => Number.isInteger(n) && n >= 1 && n <= 480);
            return valid.length ? valid : [...DEFAULT_ALARM_PRESETS];
        } catch (e) {
            return [...DEFAULT_ALARM_PRESETS];
        }
    }

    function saveAlarmPresets(presets) {
        localStorage.setItem(ALARM_PRESETS_KEY, JSON.stringify(presets));
        syncSettingsToCloud();
    }

    function getTheme() {
        return localStorage.getItem(THEME_KEY);
    }

    function saveTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
        syncSettingsToCloud();
    }

    function getSettingsSnapshot() {
        return {
            tags: getTags(),
            alarmPresets: getAlarmPresets(),
            theme: getTheme(),
            updatedAt: new Date().toISOString()
        };
    }

    function syncSettingsToCloud() {
        if (Auth.isLoggedIn() && APP_CONFIG.isCloudEnabled()) {
            SyncEngine.pushSettings(getSettingsSnapshot());
        }
    }

    function applyRemoteSettings(remote) {
        if (!remote) return;
        const localUpdated = localStorage.getItem('settingsUpdatedAt');
        const remoteTime = new Date(remote.updatedAt || 0).getTime();
        const localTime = localUpdated ? new Date(localUpdated).getTime() : 0;

        if (remoteTime >= localTime) {
            if (remote.tags) {
                localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(remote.tags));
            }
            if (remote.alarmPresets) {
                localStorage.setItem(ALARM_PRESETS_KEY, JSON.stringify(remote.alarmPresets));
            }
            if (remote.theme) {
                localStorage.setItem(THEME_KEY, remote.theme);
            }
            localStorage.setItem('settingsUpdatedAt', remote.updatedAt);
            notifyDataChanged();
        }
    }

    function getCurrentRecord() {
        const saved = localStorage.getItem(CURRENT_RECORD_KEY);
        if (!saved) {
            return {
                startTime: null,
                endTime: null,
                isActive: false,
                workName: ''
            };
        }
        try {
            return JSON.parse(saved);
        } catch (e) {
            localStorage.removeItem(CURRENT_RECORD_KEY);
            return {
                startTime: null,
                endTime: null,
                isActive: false,
                workName: ''
            };
        }
    }

    function saveCurrentRecord(record) {
        localStorage.setItem(CURRENT_RECORD_KEY, JSON.stringify(record));
        if (record.isActive) {
            SyncEngine.pushActiveSession(record);
        }
    }

    function clearCurrentRecord() {
        const current = getCurrentRecord();
        if (current.isActive && current.startTime) {
            SyncEngine.markActiveSessionCleared(current);
        }
        localStorage.removeItem(CURRENT_RECORD_KEY);
        SyncEngine.clearActiveSessionRemote();
    }

    function hasLocalRecords() {
        return getAllRecordsRaw().length > 0 || getTodos().length > 0;
    }

    async function migrateLocalToCloud(strategy, options) {
        return SyncEngine.migrateLocalToCloud(strategy, options);
    }

    async function syncNow(options) {
        return SyncEngine.syncNow(options);
    }

    function onSyncStatusChange(callback) {
        return SyncEngine.onStatusChange(callback);
    }

    return {
        init,
        normalizeRecord,
        generateId,
        getRecords,
        getAllRecordsIncludingDeleted,
        getAllRecordsRaw,
        setRecordsInternal,
        saveRecord,
        updateRecord,
        findRecord,
        deleteRecord,
        importRecords,
        clearAllRecords,
        normalizeTodo: TodoModel.normalizeTodo,
        getTodos,
        getAllTodosIncludingDeleted,
        getTodosByDate,
        setTodosInternal,
        saveTodo,
        updateTodo,
        findTodo,
        deleteTodo,
        importTodos,
        clearTodosByDate,
        getTags,
        saveTags,
        getAlarmPresets,
        saveAlarmPresets,
        getTheme,
        saveTheme,
        getSettingsSnapshot,
        syncSettingsToCloud,
        applyRemoteSettings,
        getCurrentRecord,
        saveCurrentRecord,
        clearCurrentRecord,
        hasLocalRecords,
        migrateLocalToCloud,
        syncNow,
        onSyncStatusChange,
        onDataChanged,
        notifyDataChanged
    };
})();
