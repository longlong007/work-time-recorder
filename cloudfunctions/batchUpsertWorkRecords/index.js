const cloud = require('@cloudbase/node-sdk');

const BATCH_SIZE = 100;

// CloudBase 的 update 命中 0 条时返回 { updated: 0 } 而非抛错，
// 因此判断「文档不存在」必须看计数，不能依赖异常。
function getUpdatedCount(res) {
    if (!res) return 0;
    if (typeof res.updated === 'number') return res.updated;
    if (res.stats && typeof res.stats.updated === 'number') return res.stats.updated;
    if (res.data && typeof res.data.updated === 'number') return res.data.updated;
    return 0;
}

function isDuplicateError(err) {
    const code = err && (err.code || err.errCode || err.error);
    if (code === 'DATABASE_DUPLICATE_KEY') return true;
    const msg = (err && err.message) || String(err || '');
    return /duplicate key|already exist|E11000/i.test(msg);
}

// 只有 _id 冲突才代表「文档已存在，改用 update」。其他唯一索引冲突
// （例如误建在 updatedAt / startTime 上的唯一索引）必须原样抛出，
// 否则会退化成一句无信息量的「写入未生效」，把真正的约束错误藏起来。
function isIdDuplicateError(err) {
    if (!isDuplicateError(err)) return false;
    const msg = (err && err.message) || String(err || '');
    const named = msg.match(/index:\s*(\S+)/);
    if (!named) return true;
    return named[1] === '_id_';
}

function normalizeRecord(record) {
    if (!record || !record.id) {
        throw new Error('记录缺少 id');
    }
    return {
        id: record.id,
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        workName: record.workName || '',
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt || null
    };
}

function recordToDoc(record) {
    return {
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        workName: record.workName || '',
        updatedAt: record.updatedAt,
        deletedAt: null
    };
}

function normalizeTodo(todo) {
    if (!todo || !todo.id) {
        throw new Error('待办缺少 id');
    }
    return {
        id: todo.id,
        date: todo.date,
        title: todo.title || '',
        done: Boolean(todo.done),
        order: Number.isFinite(Number(todo.order)) ? Number(todo.order) : 0,
        updatedAt: todo.updatedAt,
        deletedAt: todo.deletedAt || null
    };
}

function todoToDoc(todo) {
    return {
        date: todo.date,
        title: todo.title || '',
        done: Boolean(todo.done),
        order: Number.isFinite(Number(todo.order)) ? Number(todo.order) : 0,
        updatedAt: todo.updatedAt,
        deletedAt: null
    };
}

const ALLOWED_COLLECTIONS = {
    work_records: { name: 'work_records', normalize: normalizeRecord, toDoc: recordToDoc },
    todos: { name: 'todos', normalize: normalizeTodo, toDoc: todoToDoc }
};

function resolveCollection(name) {
    const config = ALLOWED_COLLECTIONS[name || 'work_records'];
    if (!config) {
        throw new Error(`不支持的集合: ${name}`);
    }
    return config;
}

function docOf(uid, config, record) {
    return { _id: record.id, _openid: uid, ...config.toDoc(record) };
}

function extractDoc(result) {
    if (!result) return null;
    if (Array.isArray(result.data)) return result.data[0] || null;
    if (result.data && typeof result.data === 'object') return result.data;
    return null;
}

async function removeOne(db, uid, config, recordId) {
    const coll = db.collection(config.name);

    let doc = null;
    try {
        doc = extractDoc(await coll.doc(recordId).get());
    } catch (e) {
        doc = null;
    }

    // 文档已不存在，视为删除成功
    if (!doc) return 'deleted';

    if (doc._openid && doc._openid !== uid) {
        throw new Error(`无权删除：${recordId}`);
    }

    await coll.doc(recordId).remove();
    return 'deleted';
}

async function updateOwnedDoc(coll, uid, config, record) {
    const existing = extractDoc(await coll.doc(record.id).get());
    if (!existing) return null;
    if (existing._openid && existing._openid !== uid) {
        throw new Error(`无权更新：${record.id}`);
    }
    await coll.doc(record.id).update(config.toDoc(record));
    // 字段完全一致时 CloudBase 返回 updated:0，文档在库中即视为成功
    return 'updated';
}

async function insertOne(db, uid, config, record) {
    const coll = db.collection(config.name);
    try {
        await coll.add(docOf(uid, config, record));
        return 'inserted';
    } catch (e) {
        if (!isIdDuplicateError(e)) throw e;
        const outcome = await updateOwnedDoc(coll, uid, config, record);
        if (!outcome) {
            throw new Error(`写入未生效（_id 已被占用）：${record.id}`);
        }
        return outcome;
    }
}

// CloudBase 的 where({ _id }) 更新经常命中 0 条；单文档必须走 doc(id).update。
// 内容未变化时 updated 也是 0，必须再 get 确认文档是否已在库中。
async function upsertOne(db, uid, config, record) {
    const coll = db.collection(config.name);
    const res = await coll.doc(record.id).update(config.toDoc(record));
    if (getUpdatedCount(res) > 0) return 'updated';

    const existing = extractDoc(await coll.doc(record.id).get());
    if (existing) {
        if (existing._openid && existing._openid !== uid) {
            throw new Error(`无权更新：${record.id}`);
        }
        return 'updated';
    }
    return insertOne(db, uid, config, record);
}

async function processOne(db, uid, config, record) {
    if (record.deletedAt) {
        return removeOne(db, uid, config, record.id);
    }
    return upsertOne(db, uid, config, record);
}

// 逐条 upsert 每条要 1~2 次数据库往返，100 条串行会跑到 20s 以上，
// 客户端还没等到响应就超时了。用有界并发把一批压到秒级。
const CONCURRENCY = 20;

async function runPool(items, worker) {
    const results = new Array(items.length);
    let cursor = 0;

    async function run() {
        while (cursor < items.length) {
            const i = cursor++;
            results[i] = await worker(items[i]);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, items.length) }, run)
    );
    return results;
}

async function upsertChunk(db, uid, config, chunk, assumeNew) {
    const failed = [];
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    const toDelete = chunk.filter((r) => r.deletedAt);
    const toUpsert = chunk.filter((r) => !r.deletedAt);

    // 仅「全新插入」批可走批量 add。注意批量 add 只要有一条冲突就整批回滚，
    // 因此失败后必须逐条重试，不能当作已写入。
    if (assumeNew && toUpsert.length > 1 && toDelete.length === 0) {
        try {
            await db.collection(config.name).add(toUpsert.map((r) => docOf(uid, config, r)));
            return {
                uploaded: toUpsert.length,
                inserted: toUpsert.length,
                updated: 0,
                deleted: 0,
                failed: []
            };
        } catch (e) {
            console.warn('批量 add 失败，回退逐条 upsert:', (e && e.message) || e);
        }
    }

    await runPool(chunk, async (record) => {
        try {
            const outcome = await processOne(db, uid, config, record);
            if (outcome === 'inserted') inserted += 1;
            else if (outcome === 'updated') updated += 1;
            else deleted += 1;
        } catch (e) {
            failed.push({ id: record.id, error: (e && e.message) || String(e) });
        }
    });

    return { uploaded: inserted + updated + deleted, inserted, updated, deleted, failed };
}

function extractIncomingRecords(event) {
    if (!event) return [];
    if (Array.isArray(event.records)) return event.records;
    if (event.data && Array.isArray(event.data.records)) return event.data.records;
    if (typeof event.body === 'string') {
        try {
            const parsed = JSON.parse(event.body);
            if (Array.isArray(parsed.records)) return parsed.records;
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return [];
        }
    }
    if (Array.isArray(event)) return event;
    return [];
}

function resolveCollectionName(event) {
    if (!event) return 'work_records';
    if (event.collection) return event.collection;
    if (event.data && event.data.collection) return event.data.collection;
    return 'work_records';
}

function resolveUid(app) {
    const info = (app.auth().getUserInfo && app.auth().getUserInfo()) || {};
    return info.uid || info.openId || info.customUserId || info.sub || '';
}

exports.main = async (event) => {
    const app = cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = app.database();
    const uid = resolveUid(app);

    if (!uid) {
        return { ok: false, error: '未登录，无法批量上传' };
    }

    let config;
    try {
        config = resolveCollection(resolveCollectionName(event));
    } catch (e) {
        return { ok: false, error: e.message };
    }

    const rawRecords = extractIncomingRecords(event);
    if (rawRecords.length === 0) {
        return { ok: false, error: '未收到 records', uploaded: 0, failed: [] };
    }

    const assumeNew = Boolean(event && event.assumeNew);
    let uploaded = 0;
    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    const failed = [];

    for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
        const slice = rawRecords.slice(i, i + BATCH_SIZE);
        let chunk;
        try {
            chunk = slice.map(config.normalize);
        } catch (e) {
            slice.forEach((record) => {
                failed.push({ id: (record && record.id) || 'unknown', error: e.message });
            });
            continue;
        }

        const result = await upsertChunk(db, uid, config, chunk, assumeNew);
        uploaded += result.uploaded;
        inserted += result.inserted;
        updated += result.updated;
        deleted += result.deleted;
        failed.push(...result.failed);
    }

    console.log(
        JSON.stringify({
            collection: config.name,
            received: rawRecords.length,
            uploaded,
            inserted,
            updated,
            deleted,
            failedCount: failed.length,
            firstError: failed[0] ? failed[0].error : null
        })
    );

    return { ok: true, uploaded, inserted, updated, deleted, failed, collection: config.name };
};

exports._test = { upsertChunk, upsertOne, extractIncomingRecords, getUpdatedCount, isIdDuplicateError };
