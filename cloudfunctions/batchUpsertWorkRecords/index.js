const cloud = require('@cloudbase/node-sdk');

const BATCH_SIZE = 100;
const ALLOWED_COLLECTIONS = {
    work_records: {
        name: 'work_records',
        normalize: normalizeRecord,
        toDoc: recordToDoc
    },
    todos: {
        name: 'todos',
        normalize: normalizeTodo,
        toDoc: todoToDoc
    }
};

function isDuplicateError(err) {
    const code = err && (err.code || err.errCode || err.error);
    if (code === 'DATABASE_DUPLICATE_KEY') return true;
    const msg = (err && err.message) || String(err || '');
    return /duplicate|already exist|exists/i.test(msg);
}

function isMissingDocError(err) {
    const msg = (err && err.message) || String(err || '');
    return /not exist|not found|does not exist|502007|DOCUMENT_NOT_EXIST/i.test(msg);
}

function extractDoc(result) {
    if (!result) return null;
    if (Array.isArray(result.data)) return result.data[0] || null;
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        return result.data;
    }
    return null;
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

function resolveCollection(name) {
    const key = name || 'work_records';
    const config = ALLOWED_COLLECTIONS[key];
    if (!config) {
        throw new Error(`不支持的集合: ${key}`);
    }
    return config;
}

async function removeOne(db, uid, collectionName, recordId) {
    const coll = db.collection(collectionName);
    let doc = null;
    try {
        const getRes = await coll.doc(recordId).get();
        doc = extractDoc(getRes);
    } catch (e) {
        if (isMissingDocError(e)) return;
        throw e;
    }

    if (!doc) return;

    if (doc._openid && doc._openid !== uid) {
        throw new Error(`无权删除：${recordId}`);
    }

    try {
        await coll.doc(recordId).remove();
    } catch (e) {
        if (isMissingDocError(e)) return;
        throw e;
    }
}

async function upsertOne(db, uid, config, record) {
    const coll = db.collection(config.name);
    const payload = config.toDoc(record);

    try {
        await coll.doc(record.id).update(payload);
        return;
    } catch (e) {
        if (!isMissingDocError(e)) throw e;
    }

    try {
        await coll.add({ _id: record.id, _openid: uid, ...payload });
    } catch (e) {
        if (!isDuplicateError(e)) throw e;
        await coll.doc(record.id).update(payload);
    }
}

async function processOne(db, uid, config, record) {
    if (record.deletedAt) {
        await removeOne(db, uid, config.name, record.id);
        return;
    }
    await upsertOne(db, uid, config, record);
}

async function upsertChunk(db, uid, config, chunk, assumeNew) {
    let uploaded = 0;
    const failed = [];

    const toDelete = chunk.filter((r) => r.deletedAt);
    const toUpsert = chunk.filter((r) => !r.deletedAt);

    if (assumeNew && toUpsert.length > 1 && toDelete.length === 0) {
        try {
            const docs = toUpsert.map((record) => ({
                _id: record.id,
                _openid: uid,
                ...config.toDoc(record)
            }));
            await db.collection(config.name).add(docs);
            return { uploaded: toUpsert.length, failed: [] };
        } catch (e) {
            console.warn('batch add fallback to single upsert:', e.message || e);
        }
    }

    for (const record of chunk) {
        try {
            await processOne(db, uid, config, record);
            uploaded += 1;
        } catch (e) {
            failed.push({ id: record.id, error: (e && e.message) || String(e) });
        }
    }

    return { uploaded, failed };
}

exports.main = async (event) => {
    const app = cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = app.database();
    const { uid } = app.auth().getUserInfo();

    if (!uid) {
        return { ok: false, error: '未登录，无法批量上传' };
    }

    let config;
    try {
        config = resolveCollection(event && event.collection);
    } catch (e) {
        return { ok: false, error: e.message };
    }

    const rawRecords = event && event.records;
    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
        return { ok: true, uploaded: 0, failed: [] };
    }

    const assumeNew = Boolean(event.assumeNew);
    let uploaded = 0;
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
        failed.push(...result.failed);
    }

    return { ok: true, uploaded, failed, collection: config.name };
};
