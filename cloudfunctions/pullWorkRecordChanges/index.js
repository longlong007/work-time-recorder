const cloud = require('@cloudbase/node-sdk');

const PAGE_SIZE = 100;
const DEFAULT_OVERLAP_MS = 5 * 60 * 1000;
const MAX_RECORDS = 5000;

function extractDocs(result) {
    if (!result) return [];
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.list)) return result.data.list;
    return [];
}

function toIso(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function mapRecord(doc) {
    return {
        id: doc._id || doc.id,
        startTime: doc.startTime,
        endTime: doc.endTime,
        duration: doc.duration,
        workName: doc.workName || '',
        updatedAt: toIso(doc.updatedAt) || doc.updatedAt,
        deletedAt: doc.deletedAt ? toIso(doc.deletedAt) || doc.deletedAt : null
    };
}

/**
 * 增量拉取工时变更 + 返回服务端时间（A+D）
 * event.since: ISO 游标（客户端 lastSyncedAt）
 * event.overlapMs: 可选，回拨毫秒数，默认 5 分钟
 */
exports.main = async (event) => {
    const app = cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = app.database();
    const _ = db.command;
    const { uid } = app.auth().getUserInfo();

    const serverNow = new Date().toISOString();

    if (!uid) {
        return { ok: false, error: '未登录，无法拉取变更', serverNow, records: [] };
    }

    const overlapMs =
        typeof event.overlapMs === 'number' && event.overlapMs >= 0
            ? event.overlapMs
            : DEFAULT_OVERLAP_MS;

    let since = (event && event.since) || '1970-01-01T00:00:00.000Z';
    const sinceMs = new Date(since).getTime();
    if (!Number.isNaN(sinceMs)) {
        since = new Date(Math.max(0, sinceMs - overlapMs)).toISOString();
    } else {
        since = '1970-01-01T00:00:00.000Z';
    }

    const records = [];
    let skip = 0;

    while (records.length < MAX_RECORDS) {
        const result = await db
            .collection('work_records')
            .where({
                _openid: uid,
                updatedAt: _.gt(since)
            })
            .orderBy('updatedAt', 'asc')
            .skip(skip)
            .limit(PAGE_SIZE)
            .get();

        const docs = extractDocs(result);
        if (docs.length === 0) break;

        docs.forEach((doc) => records.push(mapRecord(doc)));
        if (docs.length < PAGE_SIZE) break;
        skip += docs.length;
    }

    return {
        ok: true,
        serverNow,
        since,
        truncated: records.length >= MAX_RECORDS,
        records
    };
};
