const cloud = require('@cloudbase/node-sdk');

const BATCH_SIZE = 100;

function isDuplicateError(err) {
    const code = err && (err.code || err.errCode || err.error);
    if (code === 'DATABASE_DUPLICATE_KEY') return true;
    const msg = (err && err.message) || String(err || '');
    return /duplicate|already exist|exists/i.test(msg);
}

function extractDoc(result) {
    if (!result) return null;
    if (Array.isArray(result.data)) return result.data[0] || null;
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        return result.data;
    }
    return null;
}

// CloudBase 的 update 命中 0 条时返回 { updated: 0 } 而非抛错，
// 因此判断「文档不存在」必须看计数，不能依赖异常。
function getUpdatedCount(res) {
    if (!res) return 0;
    if (typeof res.updated === 'number') return res.updated;
    if (res.stats && typeof res.stats.updated === 'number') return res.stats.updated;
    if (res.data && typeof res.data.updated === 'number') return res.data.updated;
    return 0;
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

function payloadOf(record) {
    return {
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        workName: record.workName || '',
        updatedAt: record.updatedAt,
        deletedAt: null
    };
}

function docOf(uid, record) {
    return { _id: record.id, _openid: uid, ...payloadOf(record) };
}

async function removeOne(db, uid, recordId) {
    const coll = db.collection('work_records');
    let doc = null;
    try {
        const getRes = await coll.doc(recordId).get();
        doc = extractDoc(getRes);
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

async function insertOne(db, uid, record) {
    const coll = db.collection('work_records');
    try {
        await coll.add(docOf(uid, record));
        return 'inserted';
    } catch (e) {
        if (!isDuplicateError(e)) throw e;
        const res = await coll.doc(record.id).update(payloadOf(record));
        if (getUpdatedCount(res) === 0) {
            throw new Error(`写入未生效：${record.id}`);
        }
        return 'updated';
    }
}

async function upsertOne(db, uid, record) {
    const coll = db.collection('work_records');
    const res = await coll.doc(record.id).update(payloadOf(record));
    if (getUpdatedCount(res) > 0) return 'updated';
    return insertOne(db, uid, record);
}

async function processOne(db, uid, record) {
    if (record.deletedAt) {
        return removeOne(db, uid, record.id);
    }
    return upsertOne(db, uid, record);
}

async function upsertChunk(db, uid, chunk, assumeNew) {
    const failed = [];
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    const toDelete = chunk.filter((r) => r.deletedAt);
    const toUpsert = chunk.filter((r) => !r.deletedAt);

    // 仅「全新插入」批可走批量 add；删除与更新必须逐条
    if (assumeNew && toUpsert.length > 1 && toDelete.length === 0) {
        try {
            await db.collection('work_records').add(toUpsert.map((r) => docOf(uid, r)));
            return {
                uploaded: toUpsert.length,
                inserted: toUpsert.length,
                updated: 0,
                deleted: 0,
                failed: []
            };
        } catch (e) {
            console.warn('batch add fallback to single upsert:', e.message || e);
        }
    }

    for (const record of chunk) {
        try {
            const outcome = await processOne(db, uid, record);
            if (outcome === 'inserted') inserted += 1;
            else if (outcome === 'updated') updated += 1;
            else deleted += 1;
        } catch (e) {
            failed.push({ id: record.id, error: (e && e.message) || String(e) });
        }
    }

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
            chunk = slice.map(normalizeRecord);
        } catch (e) {
            slice.forEach((record) => {
                failed.push({ id: (record && record.id) || 'unknown', error: e.message });
            });
            continue;
        }

        const result = await upsertChunk(db, uid, chunk, assumeNew);
        uploaded += result.uploaded;
        inserted += result.inserted;
        updated += result.updated;
        deleted += result.deleted;
        failed.push(...result.failed);
    }

    console.log(
        JSON.stringify({ received: rawRecords.length, uploaded, inserted, updated, deleted, failedCount: failed.length })
    );

    return { ok: true, uploaded, inserted, updated, deleted, failed };
};

exports._test = { upsertChunk, upsertOne, extractIncomingRecords, getUpdatedCount };
