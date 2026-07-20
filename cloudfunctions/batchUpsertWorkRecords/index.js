const cloud = require('@cloudbase/node-sdk');

const BATCH_SIZE = 100;

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
    if (result.data && typeof result.data === 'object') return result.data;
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

async function upsertOne(db, uid, record) {
    const coll = db.collection('work_records');
    const payload = {
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        workName: record.workName || '',
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt || null
    };

    async function verifyDeleted() {
        if (!record.deletedAt) return;
        const verifyRes = await coll.doc(record.id).field({ deletedAt: true }).get();
        const doc = extractDoc(verifyRes);
        if (!doc || !doc.deletedAt) {
            throw new Error(`删除未生效：${record.id}`);
        }
    }

    // 服务端 admin：按 doc id 更新，避免 _openid 条件不匹配导致静默 0 行更新
    try {
        await coll.doc(record.id).update(payload);
        await verifyDeleted();
        return;
    } catch (e) {
        if (/删除未生效/.test(e.message || '')) throw e;
        if (!isMissingDocError(e)) throw e;
    }

    try {
        await coll.add({ _id: record.id, _openid: uid, ...payload });
        await verifyDeleted();
    } catch (e) {
        if (!isDuplicateError(e)) throw e;
        await coll.doc(record.id).update(payload);
        await verifyDeleted();
    }
}

async function upsertChunk(db, uid, chunk, assumeNew) {
    let uploaded = 0;
    const failed = [];

    if (assumeNew && chunk.length > 1 && !chunk.some((record) => record.deletedAt)) {
        try {
            const docs = chunk.map((record) => ({
                _id: record.id,
                _openid: uid,
                startTime: record.startTime,
                endTime: record.endTime,
                duration: record.duration,
                workName: record.workName || '',
                updatedAt: record.updatedAt,
                deletedAt: record.deletedAt || null
            }));
            await db.collection('work_records').add(docs);
            return { uploaded: chunk.length, failed: [] };
        } catch (e) {
            console.warn('batch add fallback to single upsert:', e.message || e);
        }
    }

    for (const record of chunk) {
        try {
            await upsertOne(db, uid, record);
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
            chunk = slice.map(normalizeRecord);
        } catch (e) {
            slice.forEach((record) => {
                failed.push({ id: (record && record.id) || 'unknown', error: e.message });
            });
            continue;
        }

        const result = await upsertChunk(db, uid, chunk, assumeNew);
        uploaded += result.uploaded;
        failed.push(...result.failed);
    }

    return { ok: true, uploaded, failed };
};
