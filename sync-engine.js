// 同步引擎 — 离线优先，Last-Write-Wins 合并（CloudBase 文档数据库）
const SyncEngine = (function () {
    const PENDING_OPS_KEY = 'pendingSyncOps';
    const LAST_SYNCED_KEY = 'lastSyncedAt';
    const ACTIVE_SESSION_KEY = 'currentRecord';
    const PAGE_SIZE = 100;
    // 增量拉取回拨窗口：默认 5 分钟；「立即同步」用更大窗口纠偏漏拉
    const PULL_OVERLAP_MS = 5 * 60 * 1000;
    const MANUAL_PULL_OVERLAP_MS = 24 * 60 * 60 * 1000;
    // 上传节流：低并发 + 单请求超时，避免突发请求打满 CloudBase 写 QPS 导致卡死。
    // 限流/超时不在此处自动重试（会火上浇油），失败的 op 留在队列由 sync 层稍后重调。
    const UPLOAD_CONCURRENCY = 4;
    const REQUEST_TIMEOUT_MS = 15000;
    const SYNC_WATCHDOG_MS = 90000;
    const CLEARED_SESSION_IGNORE_MS = 60000;
    const CLOUD_BATCH_SIZE = 100;
    const CLOUD_BATCH_THRESHOLD = 5;

    const STATUS = {
        IDLE: 'idle',
        SYNCING: 'syncing',
        SYNCED: 'synced',
        OFFLINE: 'offline',
        ERROR: 'error',
        NOT_CONFIGURED: 'not_configured'
    };

    let status = STATUS.IDLE;
    let statusListeners = [];
    let activeSessionWatcher = null;
    let remoteActiveSessionHandler = null;
    let syncInProgress = false;
    let syncStartedAt = 0;
    let syncDebounceTimer = null;
    // 补传（全量差集）仅在每次登录会话首次同步时做一次，之后靠 pending 队列增量
    let backfillDone = false;
    let uploadProgressListeners = [];
    // 本机刚结束的计时：忽略云端残留 active_session，避免误报「另一台设备正在计时」
    let recentlyClearedActiveSession = null;

    function setStatus(next) {
        status = next;
        statusListeners.forEach((cb) => {
            try {
                cb(next);
            } catch (e) {
                console.error('Sync status listener error:', e);
            }
        });
    }

    function onStatusChange(callback) {
        statusListeners.push(callback);
        callback(status);
        return () => {
            const idx = statusListeners.indexOf(callback);
            if (idx >= 0) statusListeners.splice(idx, 1);
        };
    }

    function getStatus() {
        return status;
    }

    function isOnline() {
        return navigator.onLine;
    }

    // 不依赖 navigator.onLine：PWA/部分浏览器会误报 offline，但 CloudBase WebSocket 仍可用
    function canSync() {
        return APP_CONFIG.isCloudEnabled() && Auth.isLoggedIn();
    }

    function isLikelyNetworkError(e) {
        if (!navigator.onLine) return true;
        const text = errorText(e).toLowerCase();
        return /network|fetch|timeout|超时|failed to fetch|net::|econnrefused|websocket|offline/i.test(text);
    }

    function getDb() {
        return Auth.getDb();
    }

    function getPendingOps() {
        try {
            const raw = localStorage.getItem(PENDING_OPS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function setPendingOps(ops) {
        localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
    }

    function queueOp(op) {
        const ops = getPendingOps();
        const existing = ops.findIndex((o) => o.id === op.id && o.type === op.type);
        if (existing >= 0) {
            ops[existing] = op;
        } else {
            ops.push(op);
        }
        setPendingOps(ops);
        scheduleSync();
    }

    function getLastSyncedAt() {
        return localStorage.getItem(LAST_SYNCED_KEY) || '1970-01-01T00:00:00.000Z';
    }

    function setLastSyncedAt(iso) {
        localStorage.setItem(LAST_SYNCED_KEY, iso);
    }

    /**
     * 本机首次绑定某云账号时调用：重置增量游标并允许再做一次差集补传，
     * 使紧接着的 syncNow 等价于「本地∪云端」静默并集（印象笔记式首次同步）。
     */
    function resetSyncCursorForFirstBind() {
        setLastSyncedAt('1970-01-01T00:00:00.000Z');
        backfillDone = false;
    }

    function recordForCloud(record) {
        return {
            startTime: record.startTime,
            endTime: record.endTime,
            duration: record.duration,
            workName: record.workName || '',
            updatedAt: record.updatedAt,
            deletedAt: record.deletedAt || null
        };
    }

    function recordPayloadForCloud(record) {
        return {
            id: record.id,
            ...recordForCloud(record)
        };
    }

    function todoForCloud(todo) {
        return {
            date: todo.date,
            title: todo.title || '',
            done: Boolean(todo.done),
            order: Number.isFinite(Number(todo.order)) ? Number(todo.order) : 0,
            updatedAt: todo.updatedAt,
            deletedAt: todo.deletedAt || null
        };
    }

    function todoPayloadForCloud(todo) {
        return {
            id: todo.id,
            ...todoForCloud(todo)
        };
    }

    function notifyUploadProgress(done, total) {
        uploadProgressListeners.forEach((cb) => {
            try {
                cb(done, total);
            } catch (e) {
                console.error('Upload progress listener error:', e);
            }
        });
    }

    function onUploadProgress(callback) {
        uploadProgressListeners.push(callback);
        return () => {
            const idx = uploadProgressListeners.indexOf(callback);
            if (idx >= 0) uploadProgressListeners.splice(idx, 1);
        };
    }

    function getBatchFunctionName() {
        return APP_CONFIG.CLOUDBASE_BATCH_FN || 'batchUpsertWorkRecords';
    }

    function getPullFunctionName() {
        return APP_CONFIG.CLOUDBASE_PULL_FN || 'pullWorkRecordChanges';
    }

    function normalizePulledRecord(raw) {
        if (!raw) return null;
        const id = raw.id || raw._id;
        if (!id) return null;
        return {
            id,
            startTime: raw.startTime,
            endTime: raw.endTime,
            duration: raw.duration,
            workName: raw.workName || '',
            updatedAt: raw.updatedAt,
            deletedAt: raw.deletedAt || null
        };
    }

    function normalizePulledTodo(raw) {
        if (!raw) return null;
        const id = raw.id || raw._id;
        if (!id) return null;
        try {
            return TodoModel.normalizeTodo({
                id,
                date: raw.date,
                title: raw.title || '',
                done: raw.done,
                order: raw.order,
                updatedAt: raw.updatedAt,
                deletedAt: raw.deletedAt || null
            });
        } catch (e) {
            return {
                id,
                date: raw.date,
                title: raw.title || '',
                done: Boolean(raw.done),
                order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
                updatedAt: raw.updatedAt,
                deletedAt: raw.deletedAt || null
            };
        }
    }

    function maxUpdatedAtIso(records) {
        let maxMs = 0;
        (records || []).forEach((r) => {
            const t = new Date(r && r.updatedAt).getTime();
            if (!Number.isNaN(t) && t > maxMs) maxMs = t;
        });
        return maxMs > 0 ? new Date(maxMs).toISOString() : null;
    }

    function shouldUseCloudBatch(records) {
        if (!records || records.length === 0 || typeof Auth.callFunction !== 'function') {
            return false;
        }
        // 删除必须走云函数物理删除；单条删除也强制走云函数
        if (records.some((r) => r && r.deletedAt)) return true;
        return records.length >= CLOUD_BATCH_THRESHOLD;
    }

    function docToRecord(doc) {
        return {
            id: doc._id,
            startTime: doc.startTime,
            endTime: doc.endTime,
            duration: doc.duration,
            workName: doc.workName || '',
            updatedAt: doc.updatedAt,
            deletedAt: doc.deletedAt || null
        };
    }

    function docToTodo(doc) {
        return {
            id: doc._id,
            date: doc.date,
            title: doc.title || '',
            done: Boolean(doc.done),
            order: Number.isFinite(Number(doc.order)) ? Number(doc.order) : 0,
            updatedAt: doc.updatedAt,
            deletedAt: doc.deletedAt || null
        };
    }

    function isActiveRecord(doc) {
        return !doc.deletedAt;
    }

    // CloudBase 安全规则要求查询条件包含 _openid，不能直接用 doc(id).get/set
    function whereOwned(docId) {
        const query = { _openid: '{openid}' };
        if (docId) query._id = docId;
        return query;
    }

    function extractDocs(result) {
        if (!result) return [];
        if (Array.isArray(result.data)) return result.data;
        if (result.data && Array.isArray(result.data.list)) return result.data.list;
        return [];
    }

    function throwIfDbError(result) {
        if (result && result.error) throw result.error;
    }

    // 有界并发执行：同时最多 concurrency 个 worker，保持结果顺序
    async function runPool(items, worker, concurrency) {
        const results = new Array(items.length);
        let cursor = 0;

        async function runner() {
            while (cursor < items.length) {
                const index = cursor;
                cursor += 1;
                results[index] = await worker(items[index], index);
            }
        }

        const size = Math.max(1, Math.min(concurrency, items.length));
        const runners = [];
        for (let i = 0; i < size; i++) runners.push(runner());
        await Promise.all(runners);
        return results;
    }

    function errorText(e) {
        const code = e && (e.code || e.errCode || e.error);
        const msg = (e && e.message) || e || '';
        return `${code || ''} ${msg}`;
    }

    function isDuplicateError(e) {
        const code = e && (e.code || e.errCode || e.error);
        if (code === 'DATABASE_DUPLICATE_KEY') return true;
        return /duplicate|already exist|exists/i.test(errorText(e));
    }

    // 给每个 CloudBase 请求套超时：SDK 默认无超时，被打满时请求会永久挂起，
    // 拖住 Promise.all 导致 syncInProgress 永远卡在 true。超时后 reject，
    // 让该 op 失败留在队列，由 scheduleSync 稍后重调（天然限速）。
    function withTimeout(promise, label) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`${label || 'request'} 超时（${REQUEST_TIMEOUT_MS}ms）`)),
                REQUEST_TIMEOUT_MS
            );
        });
        return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
    }

    function getUpdatedCount(res) {
        if (!res) return 0;
        if (typeof res.updated === 'number') return res.updated;
        if (res.stats && typeof res.stats.updated === 'number') return res.stats.updated;
        if (res.data && typeof res.data.updated === 'number') return res.data.updated;
        return 0;
    }

    async function fetchAllDocs(db, collectionName, buildQuery) {
        const all = [];
        let skip = 0;

        while (true) {
            let query = db.collection(collectionName);
            query = buildQuery(query);
            const result = await withTimeout(query.skip(skip).limit(PAGE_SIZE).get(), 'get');
            throwIfDbError(result);

            const docs = extractDocs(result);
            if (docs.length === 0) break;

            all.push(...docs);
            if (docs.length < PAGE_SIZE) break;
            skip += docs.length;
        }

        return all;
    }

    async function uploadWorkRecordsViaCloudFunction(records, { assumeNew = false, onProgress } = {}) {
        const failed = [];
        let uploaded = 0;
        let networkFailure = false;
        const total = records.length;
        const fnName = getBatchFunctionName();

        for (let i = 0; i < records.length; i += CLOUD_BATCH_SIZE) {
            const chunk = records.slice(i, i + CLOUD_BATCH_SIZE);
            let result;
            try {
                result = await withTimeout(
                    Auth.callFunction(fnName, {
                        records: chunk.map(recordPayloadForCloud),
                        assumeNew,
                        collection: 'work_records'
                    }),
                    'callFunction'
                );
            } catch (e) {
                console.error('Cloud function batch upload failed:', e);
                if (isLikelyNetworkError(e)) networkFailure = true;
                chunk.forEach((record) => failed.push(record));
                continue;
            }

            if (!result || result.ok === false) {
                throw new Error((result && result.error) || '云函数批量上传失败');
            }

            uploaded += result.uploaded || 0;
            if (Array.isArray(result.failed) && result.failed.length > 0) {
                const failedIds = new Set(result.failed.map((f) => f.id));
                chunk.forEach((record) => {
                    if (failedIds.has(record.id)) failed.push(record);
                });
            }

            const done = Math.min(i + chunk.length, total);
            notifyUploadProgress(done, total);
            if (onProgress) onProgress(done, total);
        }

        return { uploaded, failed, networkFailure };
    }

    async function uploadWorkRecordsClient(db, records, { assumeNew = false, onProgress } = {}) {
        const failed = [];
        let uploaded = 0;
        let networkFailure = false;
        const total = records.length;
        if (!records || records.length === 0) return { uploaded, failed, networkFailure };

        const results = await runPool(
            records,
            async (record) => {
                try {
                    await syncWorkRecordToCloud(db, record, assumeNew);
                    return { ok: true };
                } catch (e) {
                    console.error('Upload record failed:', record.id, e);
                    return { ok: false, record, networkFailure: isLikelyNetworkError(e) };
                }
            },
            UPLOAD_CONCURRENCY
        );

        results.forEach((r, index) => {
            if (r.ok) uploaded += 1;
            else {
                failed.push(r.record);
                if (r.networkFailure) networkFailure = true;
            }
            const done = index + 1;
            notifyUploadProgress(done, total);
            if (onProgress) onProgress(done, total);
        });

        return { uploaded, failed, networkFailure };
    }

    async function uploadWorkRecordsBatched(db, records, { assumeNew = false, onProgress } = {}) {
        if (!records || records.length === 0) return { uploaded: 0, failed: [], networkFailure: false };

        if (shouldUseCloudBatch(records)) {
            try {
                return await uploadWorkRecordsViaCloudFunction(records, { assumeNew, onProgress });
            } catch (e) {
                console.warn('云函数批量上传不可用，回退逐条模式:', e.message || e);
                if (isLikelyNetworkError(e)) {
                    return { uploaded: 0, failed: records.slice(), networkFailure: true };
                }
            }
        }

        return uploadWorkRecordsClient(db, records, { assumeNew, onProgress });
    }

    async function uploadTodosViaCloudFunction(todos, { assumeNew = false, onProgress } = {}) {
        const failed = [];
        let uploaded = 0;
        let networkFailure = false;
        const total = todos.length;
        const fnName = getBatchFunctionName();

        for (let i = 0; i < todos.length; i += CLOUD_BATCH_SIZE) {
            const chunk = todos.slice(i, i + CLOUD_BATCH_SIZE);
            let result;
            try {
                result = await withTimeout(
                    Auth.callFunction(fnName, {
                        records: chunk.map(todoPayloadForCloud),
                        assumeNew,
                        collection: 'todos'
                    }),
                    'callFunction'
                );
            } catch (e) {
                console.error('Cloud function todo batch upload failed:', e);
                if (isLikelyNetworkError(e)) networkFailure = true;
                chunk.forEach((todo) => failed.push(todo));
                continue;
            }

            if (!result || result.ok === false) {
                throw new Error((result && result.error) || '云函数批量上传待办失败');
            }

            uploaded += result.uploaded || 0;
            if (Array.isArray(result.failed) && result.failed.length > 0) {
                const failedIds = new Set(result.failed.map((f) => f.id));
                chunk.forEach((todo) => {
                    if (failedIds.has(todo.id)) failed.push(todo);
                });
            }

            const done = Math.min(i + chunk.length, total);
            notifyUploadProgress(done, total);
            if (onProgress) onProgress(done, total);
        }

        return { uploaded, failed, networkFailure };
    }

    async function hardDeleteTodo(db, todo) {
        if (!todo || !todo.id) throw new Error('删除待办缺少 id');
        const coll = db.collection('todos');
        const query = whereOwned(todo.id);
        const removeRes = await withTimeout(coll.where(query).remove(), 'remove');
        throwIfDbError(removeRes);
    }

    async function upsertTodo(db, todo, assumeNew = false) {
        const payload = todoForCloud(todo);
        const coll = db.collection('todos');
        const query = whereOwned(todo.id);

        async function addThenUpdateOnDup() {
            try {
                const addRes = await withTimeout(coll.add({ _id: todo.id, ...payload }), 'add');
                throwIfDbError(addRes);
            } catch (e) {
                if (!isDuplicateError(e)) throw e;
                const updateRes = await withTimeout(coll.where(query).update(payload), 'update');
                throwIfDbError(updateRes);
                if (getUpdatedCount(updateRes) === 0) {
                    throw new Error(`待办更新同步失败：${todo.id}`);
                }
            }
        }

        async function updateThenAddOnMiss() {
            const updateRes = await withTimeout(coll.where(query).update(payload), 'update');
            throwIfDbError(updateRes);
            if (getUpdatedCount(updateRes) > 0) return;
            await addThenUpdateOnDup();
        }

        return assumeNew ? addThenUpdateOnDup() : updateThenAddOnMiss();
    }

    async function syncTodoToCloud(db, todo, assumeNew = false) {
        if (todo.deletedAt) {
            return hardDeleteTodo(db, todo);
        }
        return upsertTodo(db, todo, assumeNew);
    }

    async function uploadTodosClient(db, todos, { assumeNew = false, onProgress } = {}) {
        const failed = [];
        let uploaded = 0;
        let networkFailure = false;
        const total = todos.length;
        if (!todos || todos.length === 0) return { uploaded, failed, networkFailure };

        const results = await runPool(
            todos,
            async (todo) => {
                try {
                    await syncTodoToCloud(db, todo, assumeNew);
                    return { ok: true };
                } catch (e) {
                    console.error('Upload todo failed:', todo.id, e);
                    return { ok: false, record: todo, networkFailure: isLikelyNetworkError(e) };
                }
            },
            UPLOAD_CONCURRENCY
        );

        results.forEach((r, index) => {
            if (r.ok) uploaded += 1;
            else {
                failed.push(r.record);
                if (r.networkFailure) networkFailure = true;
            }
            const done = index + 1;
            notifyUploadProgress(done, total);
            if (onProgress) onProgress(done, total);
        });

        return { uploaded, failed, networkFailure };
    }

    async function uploadTodosBatched(db, todos, { assumeNew = false, onProgress } = {}) {
        if (!todos || todos.length === 0) return { uploaded: 0, failed: [], networkFailure: false };

        if (shouldUseCloudBatch(todos)) {
            try {
                return await uploadTodosViaCloudFunction(todos, { assumeNew, onProgress });
            } catch (e) {
                console.warn('云函数批量上传待办不可用，回退逐条模式:', e.message || e);
                if (isLikelyNetworkError(e)) {
                    return { uploaded: 0, failed: todos.slice(), networkFailure: true };
                }
            }
        }

        return uploadTodosClient(db, todos, { assumeNew, onProgress });
    }

    async function fetchAllCloudRecordIds(db) {
        const docs = await fetchAllDocs(db, 'work_records', (query) =>
            query.where({ _openid: '{openid}' }).field({ deletedAt: true })
        );
        const ids = new Set();
        docs.forEach((doc) => {
            if (!doc.deletedAt) ids.add(doc._id);
        });
        return ids;
    }

    async function fetchAllCloudTodoIds(db) {
        const docs = await fetchAllDocs(db, 'todos', (query) =>
            query.where({ _openid: '{openid}' }).field({ deletedAt: true })
        );
        const ids = new Set();
        docs.forEach((doc) => {
            if (!doc.deletedAt) ids.add(doc._id);
        });
        return ids;
    }

    // 仅在每次登录会话的首次同步做一次「云端全量差集」补传，
    // 用于捕获登出期间创建、未进入 pending 队列的本地记录。
    // 之后所有本地增删改都会入队增量同步，无需每次全表扫描。
    async function backfillMissingOnce(db) {
        if (backfillDone) return null;

        const localRecords = DataStore.getAllRecordsRaw();
        const localTodos = DataStore.getTodos();
        if (localRecords.length === 0 && localTodos.length === 0) {
            backfillDone = true;
            return null;
        }

        let cloudRecordIds;
        let cloudTodoIds;
        try {
            cloudRecordIds = localRecords.length > 0 ? await fetchAllCloudRecordIds(db) : new Set();
            try {
                cloudTodoIds = localTodos.length > 0 ? await fetchAllCloudTodoIds(db) : new Set();
            } catch (e) {
                console.warn('补传待办差集检查失败，下次同步重试', e);
                cloudTodoIds = null;
            }
        } catch (e) {
            console.warn('补传差集检查失败，下次同步重试', e);
            return null;
        }

        if (cloudTodoIds === null) return null;

        backfillDone = true;
        const pendingIds = new Set(getPendingOps().map((o) => o.id));
        const missingRecords = localRecords.filter((r) => !cloudRecordIds.has(r.id) && !pendingIds.has(r.id));
        const missingTodos = localTodos.filter((t) => !cloudTodoIds.has(t.id) && !pendingIds.has(t.id));

        let networkFailure = false;
        const failed = [];

        if (missingRecords.length > 0) {
            console.info(`补传本地记录：${missingRecords.length} 条`);
            const result = await uploadWorkRecordsBatched(db, missingRecords, { assumeNew: true });
            if (result.networkFailure) networkFailure = true;
            failed.push(...result.failed);
        }

        if (missingTodos.length > 0) {
            console.info(`补传本地待办：${missingTodos.length} 条`);
            const result = await uploadTodosBatched(db, missingTodos, { assumeNew: true });
            if (result.networkFailure) networkFailure = true;
            failed.push(...result.failed);
        }

        if (failed.length === 0 && !networkFailure) return null;
        return { failed, networkFailure };
    }

    async function upsertOwnedDoc(db, collectionName, docId, data) {
        const coll = db.collection(collectionName);
        const query = whereOwned(docId);
        const getRes = await withTimeout(coll.where(query).limit(1).get(), 'get');
        throwIfDbError(getRes);

        if (extractDocs(getRes).length > 0) {
            const updateRes = await withTimeout(coll.where(query).update(data), 'update');
            throwIfDbError(updateRes);
            return;
        }

        const addRes = await withTimeout(coll.add({ _id: docId, ...data }), 'add');
        throwIfDbError(addRes);
    }

    async function getOwnedDoc(db, collectionName, docId) {
        const res = await withTimeout(
            db.collection(collectionName).where(whereOwned(docId)).limit(1).get(),
            'get'
        );
        throwIfDbError(res);
        const docs = extractDocs(res);
        return docs.length > 0 ? docs[0] : null;
    }

    function mergeRecords(localRecords, remoteRecords) {
        const map = new Map();
        const pendingIds = new Set(getPendingOps().map((o) => o.id));

        localRecords.forEach((r) => map.set(r.id, r));

        remoteRecords.forEach((remote) => {
            const local = map.get(remote.id);
            if (!local) {
                if (!remote.deletedAt) {
                    map.set(remote.id, remote);
                }
                return;
            }
            if (pendingIds.has(remote.id)) {
                return;
            }
            const localTime = new Date(local.updatedAt || 0).getTime();
            const remoteTime = new Date(remote.updatedAt || 0).getTime();
            if (remoteTime >= localTime) {
                if (remote.deletedAt) {
                    map.delete(remote.id);
                } else {
                    map.set(remote.id, remote);
                }
            }
        });

        return Array.from(map.values())
            .filter((r) => !r.deletedAt)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    // 物理删除：控制台文档应直接消失。优先用 where(_openid+_id).remove()
    async function hardDeleteWorkRecord(db, record) {
        if (!record || !record.id) throw new Error('删除记录缺少 id');

        const coll = db.collection('work_records');
        const query = whereOwned(record.id);

        const removeRes = await withTimeout(coll.where(query).remove(), 'remove');
        throwIfDbError(removeRes);

        const getRes = await withTimeout(
            coll.where(query).limit(1).get(),
            'get'
        );
        throwIfDbError(getRes);
        if (extractDocs(getRes).length > 0) {
            throw new Error(`删除未生效：${record.id}`);
        }
    }

    async function syncWorkRecordToCloud(db, record, assumeNew = false) {
        if (record.deletedAt) {
            return hardDeleteWorkRecord(db, record);
        }
        return upsertWorkRecord(db, record, assumeNew);
    }

    // upsert（安全规则要求 where 带 _openid，故不用 doc(id).set）：
    // - 迁移/补传（assumeNew）：先 add，命中重复再 update —— 新记录 1 次往返
    // - 常规增量：先 update，命中 0 条再 add —— 已存在记录 1 次往返
    async function upsertWorkRecord(db, record, assumeNew = false) {
        const payload = recordForCloud(record);
        const coll = db.collection('work_records');
        const query = whereOwned(record.id);

        async function addThenUpdateOnDup() {
            try {
                const addRes = await withTimeout(coll.add({ _id: record.id, ...payload }), 'add');
                throwIfDbError(addRes);
            } catch (e) {
                if (!isDuplicateError(e)) throw e;
                const updateRes = await withTimeout(coll.where(query).update(payload), 'update');
                throwIfDbError(updateRes);
                if (getUpdatedCount(updateRes) === 0) {
                    throw new Error(`更新同步失败：${record.id}`);
                }
            }
        }

        async function updateThenAddOnMiss() {
            const updateRes = await withTimeout(coll.where(query).update(payload), 'update');
            throwIfDbError(updateRes);
            if (getUpdatedCount(updateRes) > 0) return;
            await addThenUpdateOnDup();
        }

        return assumeNew ? addThenUpdateOnDup() : updateThenAddOnMiss();
    }

    async function upsertSettings(db, userId, settings) {
        await upsertOwnedDoc(db, 'user_settings', userId, {
            tags: settings.tags,
            alarmPresets: settings.alarmPresets,
            theme: settings.theme,
            updatedAt: settings.updatedAt
        });
    }

    async function upsertActiveSession(db, userId, session) {
        await upsertOwnedDoc(db, 'active_sessions', userId, {
            startTime: session.startTime,
            workName: session.workName || '',
            isActive: session.isActive,
            updatedAt: session.updatedAt
        });
    }

    async function pushPendingOps() {
        const db = getDb();
        const userId = Auth.getUserId();
        if (!db || !userId) return { failed: 0, networkFailure: false };

        const ops = getPendingOps();
        if (ops.length === 0) return { failed: 0, networkFailure: false };

        const recordOps = ops.filter((o) => o.type === 'upsert' || o.type === 'delete');
        const todoOps = ops.filter((o) => o.type === 'todo_upsert' || o.type === 'todo_delete');
        const otherOps = ops.filter(
            (o) =>
                o.type !== 'upsert' &&
                o.type !== 'delete' &&
                o.type !== 'todo_upsert' &&
                o.type !== 'todo_delete'
        );
        const remaining = [];
        let networkFailure = false;

        if (recordOps.length > 0) {
            const records = recordOps.map((op) => op.record);
            const result = await uploadWorkRecordsBatched(db, records);
            if (result.networkFailure) networkFailure = true;
            const failedIds = new Set(result.failed.map((r) => r.id));
            recordOps.forEach((op) => {
                if (failedIds.has(op.id)) remaining.push(op);
            });
        }

        if (todoOps.length > 0) {
            const todos = todoOps.map((op) => op.record);
            const result = await uploadTodosBatched(db, todos);
            if (result.networkFailure) networkFailure = true;
            const failedIds = new Set(result.failed.map((r) => r.id));
            todoOps.forEach((op) => {
                if (failedIds.has(op.id)) remaining.push(op);
            });
        }

        // settings / active_session / clear_all：量少，顺序处理
        for (const op of otherOps) {
            try {
                if (op.type === 'settings') {
                    await upsertSettings(db, userId, op.settings);
                } else if (op.type === 'active_session') {
                    await upsertActiveSession(db, userId, op.session);
                } else if (op.type === 'todo_clear_all') {
                    const result = await uploadTodosBatched(db, op.records || []);
                    if (result.networkFailure) networkFailure = true;
                    if (result.failed.length > 0) {
                        remaining.push({ ...op, records: result.failed });
                    }
                } else if (op.type === 'clear_all') {
                    const result = await uploadWorkRecordsBatched(db, op.records || []);
                    if (result.networkFailure) networkFailure = true;
                    if (result.failed.length > 0) {
                        remaining.push({ ...op, records: result.failed });
                    }
                }
            } catch (e) {
                console.error('Push op failed:', op, e);
                if (isLikelyNetworkError(e)) networkFailure = true;
                remaining.push(op);
            }
        }

        setPendingOps(remaining);
        return { failed: remaining.length, networkFailure };
    }

    /**
     * 增量拉取（A+D）：
     * 优先走云函数，用 serverNow 推进游标；失败时回退客户端查询（不应用本机 now 推进游标）。
     * @returns {{ records: Array, todos: Array, serverNow: string|null }}
     */
    async function pullRemoteChanges(options = {}) {
        const overlapMs =
            typeof options.overlapMs === 'number' ? options.overlapMs : PULL_OVERLAP_MS;
        const since = getLastSyncedAt();

        if (typeof Auth.callFunction === 'function') {
            try {
                const result = await withTimeout(
                    Auth.callFunction(getPullFunctionName(), {
                        since,
                        overlapMs
                    }),
                    'pullWorkRecordChanges'
                );
                if (result && result.ok !== false) {
                    const records = (result.records || [])
                        .map(normalizePulledRecord)
                        .filter(Boolean);
                    const todos = (result.todos || [])
                        .map(normalizePulledTodo)
                        .filter(Boolean);
                    return {
                        records,
                        todos,
                        serverNow: result.serverNow || null
                    };
                }
                console.warn('增量拉取云函数返回异常，回退客户端拉取:', result && result.error);
            } catch (e) {
                console.warn('增量拉取云函数不可用，回退客户端拉取:', e.message || e);
            }
        }

        const db = getDb();
        if (!db) return { records: [], todos: [], serverNow: null };

        const sinceMs = new Date(since).getTime();
        const pullSince = Number.isNaN(sinceMs)
            ? '1970-01-01T00:00:00.000Z'
            : new Date(Math.max(0, sinceMs - overlapMs)).toISOString();
        const _ = db.command;

        const docs = await fetchAllDocs(db, 'work_records', (query) =>
            query
                .where({
                    _openid: '{openid}',
                    updatedAt: _.gt(pullSince)
                })
                .orderBy('updatedAt', 'asc')
        );

        let todoDocs = [];
        try {
            todoDocs = await fetchAllDocs(db, 'todos', (query) =>
                query
                    .where({
                        _openid: '{openid}',
                        updatedAt: _.gt(pullSince)
                    })
                    .orderBy('updatedAt', 'asc')
            );
        } catch (e) {
            console.warn('客户端拉取待办失败:', e.message || e);
        }

        return {
            records: docs.map(docToRecord),
            todos: todoDocs.map(docToTodo),
            serverNow: null
        };
    }

    async function pullSettings() {
        const db = getDb();
        const userId = Auth.getUserId();
        if (!db || !userId) return null;

        const doc = await getOwnedDoc(db, 'user_settings', userId);
        if (!doc) return null;

        return {
            tags: doc.tags,
            alarmPresets: doc.alarmPresets,
            theme: doc.theme,
            updatedAt: doc.updatedAt
        };
    }

    async function pushSettings(settings) {
        queueOp({
            type: 'settings',
            id: 'settings',
            settings
        });
    }

    async function getCloudRecordCount() {
        const db = getDb();
        if (!db) return 0;

        const ids = await fetchAllCloudRecordIds(db);
        return ids.size;
    }

    function scheduleSync(delayMs = 800) {
        if (!APP_CONFIG.isCloudEnabled()) {
            setStatus(STATUS.NOT_CONFIGURED);
            return;
        }
        if (!Auth.isLoggedIn()) {
            setStatus(STATUS.IDLE);
            return;
        }
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => syncNow(), delayMs);
    }

    async function syncNow(options = {}) {
        const manual = Boolean(options && options.manual);
        const overlapMs = manual ? MANUAL_PULL_OVERLAP_MS : PULL_OVERLAP_MS;

        if (!APP_CONFIG.isCloudEnabled()) {
            setStatus(STATUS.NOT_CONFIGURED);
            return false;
        }
        if (!Auth.isLoggedIn()) {
            setStatus(STATUS.IDLE);
            return false;
        }
        if (syncInProgress) {
            // 看门狗：正常同步有单请求超时兜底，若仍超过阈值多半是上一轮卡死，强制放行
            if (Date.now() - syncStartedAt < SYNC_WATCHDOG_MS) return false;
            console.warn('上一轮同步疑似卡住，强制重置后重试');
        }

        syncInProgress = true;
        syncStartedAt = Date.now();
        setStatus(STATUS.SYNCING);

        let hasFailure = false;
        let networkFailure = false;
        let pullResult = { records: [], todos: [], serverNow: null };

        try {
            const pushResult = await pushPendingOps();
            if (pushResult.failed > 0) hasFailure = true;
            if (pushResult.networkFailure) networkFailure = true;

            const backfillResult = await backfillMissingOnce(getDb());
            if (backfillResult && backfillResult.failed.length > 0) {
                hasFailure = true;
                if (backfillResult.networkFailure) networkFailure = true;
                backfillResult.failed.forEach((record) => {
                    if (record && record.date && !record.startTime) {
                        queueOp({ type: 'todo_upsert', id: record.id, record });
                    } else {
                        queueOp({ type: 'upsert', id: record.id, record });
                    }
                });
            }

            pullResult = await pullRemoteChanges({ overlapMs });
            if (pullResult.records && pullResult.records.length > 0) {
                const localRecords = DataStore.getAllRecordsIncludingDeleted();
                const merged = mergeRecords(localRecords, pullResult.records);
                DataStore.setRecordsInternal(merged);
            }
            if (pullResult.todos && pullResult.todos.length > 0) {
                const localTodos = DataStore.getAllTodosIncludingDeleted();
                const pendingTodoIds = new Set(
                    getPendingOps()
                        .filter((o) => o.type === 'todo_upsert' || o.type === 'todo_delete' || o.type === 'todo_clear_all')
                        .flatMap((o) => (o.type === 'todo_clear_all' ? (o.records || []).map((r) => r.id) : [o.id]))
                );
                const mergedTodos = TodoModel.mergeTodos(localTodos, pullResult.todos, pendingTodoIds);
                DataStore.setTodosInternal(mergedTodos);
            }

            const remoteSettings = await pullSettings();
            if (remoteSettings) {
                DataStore.applyRemoteSettings(remoteSettings);
            }

            await pullActiveSession();

            const pendingLeft = getPendingOps().length;
            if (pendingLeft === 0 && !hasFailure) {
                // D：优先用服务端时间推进游标；无 serverNow 时仅用变更集 max(updatedAt)
                // 空拉取且无 serverNow 时不推进，避免本机时钟超前造成永久漏拉
                const cursor =
                    pullResult.serverNow ||
                    maxUpdatedAtIso([...(pullResult.records || []), ...(pullResult.todos || [])]) ||
                    null;
                if (cursor) {
                    setLastSyncedAt(cursor);
                }
                setStatus(STATUS.SYNCED);
            } else {
                setStatus(networkFailure ? STATUS.OFFLINE : STATUS.ERROR);
                console.warn(`同步未完成：待重试 ${pendingLeft} 项`);
                scheduleSync(3000);
            }

            DataStore.notifyDataChanged();
            return pendingLeft === 0 && !hasFailure;
        } catch (e) {
            console.error('Sync failed:', e);
            setStatus(isLikelyNetworkError(e) ? STATUS.OFFLINE : STATUS.ERROR);
            scheduleSync(5000);
            return false;
        } finally {
            syncInProgress = false;
        }
    }

    async function fetchAllActiveRecords(db) {
        const docs = await fetchAllDocs(db, 'work_records', (query) =>
            query.where({ _openid: '{openid}' }).orderBy('startTime', 'desc')
        );
        return docs.map(docToRecord).filter(isActiveRecord);
    }

    async function fetchAllActiveTodos(db) {
        const docs = await fetchAllDocs(db, 'todos', (query) =>
            query.where({ _openid: '{openid}' }).orderBy('updatedAt', 'desc')
        );
        return docs.map(docToTodo).filter(isActiveRecord);
    }

    async function migrateLocalToCloud(strategy, { onProgress } = {}) {
        if (!canSync()) throw new Error('请先登录并确保网络连接');

        const db = getDb();
        const userId = Auth.getUserId();
        const localRecords = DataStore.getAllRecordsRaw();
        const localTodos = DataStore.getTodos();

        if (strategy === 'cloud') {
            const records = await fetchAllActiveRecords(db);
            DataStore.setRecordsInternal(records);
            try {
                const todos = await fetchAllActiveTodos(db);
                DataStore.setTodosInternal(todos);
            } catch (e) {
                console.warn('拉取云端待办失败:', e.message || e);
            }
            setLastSyncedAt(new Date().toISOString());
            setPendingOps([]);
            DataStore.notifyDataChanged();
            return records.length;
        }

        if (strategy === 'local') {
            const normalized = localRecords.map((r) => DataStore.normalizeRecord(r));
            const result = await uploadWorkRecordsBatched(db, normalized, {
                assumeNew: true,
                onProgress
            });
            const todoResult = await uploadTodosBatched(db, localTodos, { assumeNew: true });
            await DataStore.syncSettingsToCloud();
            if (result.failed.length > 0 || todoResult.failed.length > 0) {
                result.failed.forEach((record) => {
                    queueOp({ type: 'upsert', id: record.id, record });
                });
                todoResult.failed.forEach((todo) => {
                    queueOp({ type: 'todo_upsert', id: todo.id, record: todo });
                });
                throw new Error(
                    `已上传 ${result.uploaded + todoResult.uploaded} 条，${result.failed.length + todoResult.failed.length} 条失败，将自动重试`
                );
            }
            setLastSyncedAt(new Date().toISOString());
            setPendingOps([]);
            backfillDone = true;
            return normalized.length + localTodos.length;
        }

        const normalized = localRecords.map((r) => DataStore.normalizeRecord(r));
        const result = await uploadWorkRecordsBatched(db, normalized, {
            assumeNew: true,
            onProgress
        });
        if (result.failed.length > 0) {
            result.failed.forEach((record) => {
                queueOp({ type: 'upsert', id: record.id, record });
            });
        }
        const todoResult = await uploadTodosBatched(db, localTodos, { assumeNew: true });
        if (todoResult.failed.length > 0) {
            todoResult.failed.forEach((todo) => {
                queueOp({ type: 'todo_upsert', id: todo.id, record: todo });
            });
        }
        setLastSyncedAt('1970-01-01T00:00:00.000Z');
        backfillDone = true;
        await syncNow();
        return normalized.length + localTodos.length;
    }

    async function pushActiveSession(session) {
        if (!canSync()) return;
        queueOp({
            type: 'active_session',
            id: 'active_session',
            session: {
                startTime: session.startTime,
                workName: session.workName || '',
                isActive: session.isActive,
                updatedAt: new Date().toISOString()
            }
        });
        scheduleSync(300);
    }

    async function clearActiveSessionRemote() {
        if (!canSync()) return;
        queueOp({
            type: 'active_session',
            id: 'active_session',
            session: {
                startTime: null,
                workName: '',
                isActive: false,
                updatedAt: new Date().toISOString()
            }
        });
        scheduleSync(0);
    }

    function markActiveSessionCleared(session) {
        if (!session || !session.startTime) return;
        recentlyClearedActiveSession = {
            startTime: session.startTime,
            workName: session.workName || '',
            at: Date.now()
        };
    }

    function shouldIgnoreRemoteActiveSession(data) {
        if (!recentlyClearedActiveSession) return false;
        const { startTime, workName, at } = recentlyClearedActiveSession;
        if (Date.now() - at > CLEARED_SESSION_IGNORE_MS) {
            recentlyClearedActiveSession = null;
            return false;
        }
        return data.startTime === startTime && (data.workName || '') === workName;
    }

    function isLocalSessionActive() {
        const localRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!localRaw) return false;
        try {
            return Boolean(JSON.parse(localRaw).isActive);
        } catch (e) {
            return false;
        }
    }

    function notifyRemoteActiveSession(data) {
        if (!data || !data.isActive || !data.startTime) return;
        if (isLocalSessionActive()) return;
        if (shouldIgnoreRemoteActiveSession(data)) return;
        if (!remoteActiveSessionHandler) return;

        remoteActiveSessionHandler({
            startTime: data.startTime,
            workName: data.workName || '',
            isActive: true,
            updatedAt: data.updatedAt
        });
    }

    async function pullActiveSession() {
        const db = getDb();
        const userId = Auth.getUserId();
        if (!db || !userId) return;

        const doc = await getOwnedDoc(db, 'active_sessions', userId);
        if (!doc) return;

        notifyRemoteActiveSession(doc);
    }

    function subscribeActiveSession(onRemoteSession) {
        remoteActiveSessionHandler = onRemoteSession;

        if (!APP_CONFIG.isCloudEnabled() || !Auth.isLoggedIn()) return;

        const db = getDb();
        if (!db) return;

        if (activeSessionWatcher) {
            activeSessionWatcher.close();
            activeSessionWatcher = null;
        }

        activeSessionWatcher = db
            .collection('active_sessions')
            .where({ _openid: '{openid}' })
            .watch({
                onChange(snapshot) {
                    const docs = snapshot.docs || [];
                    if (docs.length === 0) return;
                    notifyRemoteActiveSession(docs[0]);
                },
                onError(err) {
                    console.error('Active session watch error:', err);
                }
            });
    }

    function unsubscribeActiveSession() {
        remoteActiveSessionHandler = null;
        if (activeSessionWatcher) {
            activeSessionWatcher.close();
            activeSessionWatcher = null;
        }
    }

    function init() {
        if (!APP_CONFIG.isCloudEnabled()) {
            setStatus(STATUS.NOT_CONFIGURED);
            return;
        }

        window.addEventListener('online', () => {
            setStatus(STATUS.SYNCING);
            syncNow();
        });
        window.addEventListener('offline', () => setStatus(STATUS.OFFLINE));

        Auth.onAuthStateChange((user) => {
            if (user) {
                backfillDone = false;
                scheduleSync(500);
            } else {
                backfillDone = false;
                unsubscribeActiveSession();
                setStatus(STATUS.IDLE);
            }
        });
    }

    return {
        STATUS,
        init,
        onStatusChange,
        getStatus,
        canSync,
        isOnline,
        scheduleSync,
        syncNow,
        queueOp,
        pushSettings,
        resetSyncCursorForFirstBind,
        getCloudRecordCount,
        migrateLocalToCloud,
        onUploadProgress,
        pushActiveSession,
        clearActiveSessionRemote,
        markActiveSessionCleared,
        subscribeActiveSession,
        unsubscribeActiveSession,
        getPendingOps
    };
})();
