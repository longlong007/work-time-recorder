const assert = require('assert');
const SyncLogic = require('../sync-logic.js');

function test(name, fn) {
    fn();
    console.log(`ok ${name}`);
}

test('months-old local records not in cloud are missing', () => {
    const local = [
        { id: 'old-1', startTime: '2026-01-01T00:00:00.000Z' },
        { id: 'old-2', startTime: '2026-02-01T00:00:00.000Z' },
        { id: 'recent', startTime: '2026-08-01T00:00:00.000Z' }
    ];
    const missing = SyncLogic.computeMissingRecords(local, ['recent'], []);
    assert.deepStrictEqual(
        missing.map((r) => r.id).sort(),
        ['old-1', 'old-2']
    );
});

test('manual sync must re-run backfill even if already done this session', () => {
    assert.strictEqual(SyncLogic.shouldSkipBackfill(true, false), true);
    assert.strictEqual(SyncLogic.shouldSkipBackfill(true, true), false);
    assert.strictEqual(SyncLogic.shouldSkipBackfill(false, true), false);
});

test('backfill fetch failure must not be marked synced', () => {
    assert.strictEqual(
        SyncLogic.canMarkSynced({ pendingLeft: 0, hasFailure: false, backfillIncomplete: true }),
        false
    );
    assert.strictEqual(
        SyncLogic.canMarkSynced({ pendingLeft: 0, hasFailure: false, backfillIncomplete: false }),
        true
    );
});

test('duplicate local ids are reassigned so extras can upload', () => {
    const local = [
        { id: 'same', startTime: '2026-01-01T00:00:00.000Z' },
        { id: 'same', startTime: '2026-03-01T00:00:00.000Z' },
        { id: 'ok', startTime: '2026-08-01T00:00:00.000Z' }
    ];
    let n = 0;
    const result = SyncLogic.reassignDuplicateIds(local, () => `new-${++n}`);
    assert.strictEqual(result.reassigned, 1);
    assert.strictEqual(result.unique, 3);
    assert.deepStrictEqual(result.records.map((r) => r.id), ['same', 'new-1', 'ok']);
});

test('records without id are assigned ids', () => {
    const result = SyncLogic.reassignDuplicateIds(
        [{ startTime: '2026-01-01T00:00:00.000Z' }],
        () => 'gen-1'
    );
    assert.strictEqual(result.reassigned, 1);
    assert.strictEqual(result.records[0].id, 'gen-1');
});

test('uploaded=0 with nonempty chunk is a silent failure', () => {
    assert.strictEqual(
        SyncLogic.isSilentBatchFailure({ ok: true, uploaded: 0, failed: [] }, 100),
        true
    );
    assert.strictEqual(
        SyncLogic.isSilentBatchFailure({ ok: true, uploaded: 100, failed: [] }, 100),
        false
    );
});

test('uploaded count without real writes is a silent failure', () => {
    assert.strictEqual(
        SyncLogic.isSilentBatchFailure(
            { ok: true, uploaded: 100, inserted: 0, updated: 0, deleted: 0, failed: [] },
            100
        ),
        true
    );
    assert.strictEqual(
        SyncLogic.isSilentBatchFailure(
            { ok: true, uploaded: 100, inserted: 100, updated: 0, deleted: 0, failed: [] },
            100
        ),
        false
    );
    assert.strictEqual(
        SyncLogic.isSilentBatchFailure(
            { ok: true, uploaded: 98, inserted: 98, updated: 0, deleted: 0, failed: [{ id: 'x' }, { id: 'y' }] },
            100
        ),
        false
    );
});

console.log('all tests passed');
