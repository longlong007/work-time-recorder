const assert = require('assert');
const fn = require('../cloudfunctions/batchUpsertWorkRecords/index.js');

function test(name, body) {
    return body().then(
        () => console.log(`ok ${name}`),
        (err) => {
            console.error(`FAIL ${name}`);
            throw err;
        }
    );
}

// 模拟 CloudBase 文档数据库语义：
// doc(id).update() 命中 0 条时【返回 updated:0，不抛异常】——这是本 bug 的核心
function makeFakeDb({ existing = [], batchAddThrows = false } = {}) {
    const docs = new Map(existing.map((d) => [d._id, d]));
    const db = {
        collection() {
            return {
                doc(id) {
                    return {
                        async get() {
                            const d = docs.get(id);
                            return { data: d ? [d] : [] };
                        },
                        async update(payload) {
                            const d = docs.get(id);
                            if (!d) return { updated: 0 };
                            docs.set(id, { ...d, ...payload });
                            return { updated: 1 };
                        },
                        async remove() {
                            docs.delete(id);
                            return { deleted: 1 };
                        }
                    };
                },
                async add(data) {
                    const arr = Array.isArray(data) ? data : [data];
                    if (Array.isArray(data) && batchAddThrows) {
                        throw new Error('batch add not supported');
                    }
                    arr.forEach((d) => docs.set(d._id, d));
                    return { ids: arr.map((d) => d._id) };
                }
            };
        }
    };
    return { db, docs };
}

function record(id) {
    return {
        id,
        startTime: '2026-03-01T00:00:00.000Z',
        endTime: '2026-03-01T01:00:00.000Z',
        duration: 3600000,
        workName: '历史记录',
        updatedAt: '2026-03-01T01:00:00.000Z',
        deletedAt: null
    };
}

async function main() {
    await test('新记录必须真正写入，即使 update 静默返回 updated:0', async () => {
        const { db, docs } = makeFakeDb({ batchAddThrows: true });
        const result = await fn._test.upsertChunk(db, 'uid-1', [record('a')], false);

        assert.strictEqual(docs.size, 1, '记录应被插入数据库');
        assert.strictEqual(result.uploaded, 1);
        assert.deepStrictEqual(result.failed, []);
    });

    await test('批量 add 不可用时逐条回退仍要落库', async () => {
        const chunk = [record('a'), record('b'), record('c')];
        const { db, docs } = makeFakeDb({ batchAddThrows: true });
        const result = await fn._test.upsertChunk(db, 'uid-1', chunk, true);

        assert.strictEqual(docs.size, 3, '三条都应插入');
        assert.strictEqual(result.uploaded, 3);
    });

    await test('插入的文档必须带 _openid，否则用户读不到', async () => {
        const { db, docs } = makeFakeDb({ batchAddThrows: true });
        await fn._test.upsertChunk(db, 'uid-42', [record('a')], false);

        assert.strictEqual(docs.get('a')._openid, 'uid-42');
    });

    await test('已存在的记录走更新，不重复插入', async () => {
        const { db, docs } = makeFakeDb({
            existing: [{ _id: 'a', _openid: 'uid-1', workName: '旧' }]
        });
        const result = await fn._test.upsertChunk(db, 'uid-1', [record('a')], false);

        assert.strictEqual(docs.size, 1);
        assert.strictEqual(docs.get('a').workName, '历史记录');
        assert.strictEqual(result.uploaded, 1);
    });

    await test('返回值需区分 inserted/updated 供客户端校验', async () => {
        const { db } = makeFakeDb({
            existing: [{ _id: 'a', _openid: 'uid-1', workName: '旧' }],
            batchAddThrows: true
        });
        const result = await fn._test.upsertChunk(db, 'uid-1', [record('a'), record('b')], false);

        assert.strictEqual(result.updated, 1);
        assert.strictEqual(result.inserted, 1);
    });

    console.log('all tests passed');
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
