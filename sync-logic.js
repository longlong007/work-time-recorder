// 同步策略纯函数 — 供 SyncEngine 与 Node 测试共用
const SyncLogic = (function () {
    function computeMissingRecords(localRecords, cloudIds, pendingIds) {
        const cloud = cloudIds instanceof Set ? cloudIds : new Set(cloudIds || []);
        const pending = pendingIds instanceof Set ? pendingIds : new Set(pendingIds || []);
        return (localRecords || []).filter(
            (record) => record && record.id && !cloud.has(record.id) && !pending.has(record.id)
        );
    }

    function shouldSkipBackfill(backfillDone, manual) {
        return Boolean(backfillDone) && !manual;
    }

    function canMarkSynced({ pendingLeft, hasFailure, backfillIncomplete }) {
        return pendingLeft === 0 && !hasFailure && !backfillIncomplete;
    }

    function reassignDuplicateIds(records, generateId) {
        const seen = new Set();
        let reassigned = 0;
        const next = (records || []).map((record) => {
            if (record && record.id && !seen.has(record.id)) {
                seen.add(record.id);
                return record;
            }
            reassigned += 1;
            const id = generateId();
            seen.add(id);
            return { ...(record || {}), id };
        });
        return { records: next, reassigned, unique: seen.size };
    }

    // 云函数可能返回 ok:true 却没写库。优先用 inserted/updated/deleted 实际写入数校验，
    // 缺少这些字段（旧版云函数）时退回「uploaded 为 0 却无失败项」的粗判。
    function isSilentBatchFailure(result, chunkLength) {
        if (!result || result.ok === false) return true;
        if (chunkLength <= 0) return false;

        const failedCount = Array.isArray(result.failed) ? result.failed.length : 0;
        const hasStats =
            typeof result.inserted === 'number' ||
            typeof result.updated === 'number' ||
            typeof result.deleted === 'number';

        if (hasStats) {
            const written =
                (result.inserted || 0) + (result.updated || 0) + (result.deleted || 0);
            return written < chunkLength - failedCount;
        }

        return (result.uploaded || 0) === 0 && failedCount === 0;
    }

    return {
        computeMissingRecords,
        shouldSkipBackfill,
        canMarkSynced,
        reassignDuplicateIds,
        isSilentBatchFailure
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncLogic;
}
