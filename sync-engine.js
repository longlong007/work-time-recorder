// 同步引擎 — 离线优先，Last-Write-Wins 合并
const SyncEngine = (function () {
    const PENDING_OPS_KEY = 'pendingSyncOps';
    const LAST_SYNCED_KEY = 'lastSyncedAt';
    const ACTIVE_SESSION_KEY = 'currentRecord';

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
    let realtimeChannel = null;
    let remoteActiveSessionHandler = null;
    let syncInProgress = false;
    let syncDebounceTimer = null;

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

    function canSync() {
        return APP_CONFIG.isCloudEnabled() && Auth.isLoggedIn() && isOnline();
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

    function recordToRow(record, userId) {
        return {
            id: record.id,
            user_id: userId,
            start_time: record.startTime,
            end_time: record.endTime,
            duration_ms: record.duration,
            work_name: record.workName || '',
            updated_at: record.updatedAt,
            deleted_at: record.deletedAt || null
        };
    }

    function rowToRecord(row) {
        return {
            id: row.id,
            startTime: row.start_time,
            endTime: row.end_time,
            duration: row.duration_ms,
            workName: row.work_name || '',
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at || null
        };
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

    async function pushPendingOps() {
        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return;

        const ops = getPendingOps();
        if (ops.length === 0) return;

        const remaining = [];

        for (const op of ops) {
            try {
                if (op.type === 'upsert') {
                    const row = recordToRow(op.record, userId);
                    const { error } = await client.from('work_records').upsert(row);
                    if (error) throw error;
                } else if (op.type === 'delete') {
                    const { error } = await client.from('work_records').upsert({
                        id: op.id,
                        user_id: userId,
                        start_time: op.record.startTime,
                        end_time: op.record.endTime,
                        duration_ms: op.record.duration,
                        work_name: op.record.workName || '',
                        updated_at: op.record.updatedAt,
                        deleted_at: op.record.deletedAt
                    });
                    if (error) throw error;
                } else if (op.type === 'settings') {
                    const { error } = await client.from('user_settings').upsert({
                        user_id: userId,
                        tags: op.settings.tags,
                        alarm_presets: op.settings.alarmPresets,
                        theme: op.settings.theme,
                        updated_at: op.settings.updatedAt
                    });
                    if (error) throw error;
                } else if (op.type === 'active_session') {
                    const { error } = await client.from('active_sessions').upsert({
                        user_id: userId,
                        start_time: op.session.startTime,
                        work_name: op.session.workName || '',
                        is_active: op.session.isActive,
                        updated_at: op.session.updatedAt
                    });
                    if (error) throw error;
                } else if (op.type === 'clear_all') {
                    const records = op.records || [];
                    for (const rec of records) {
                        const row = recordToRow(rec, userId);
                        const { error } = await client.from('work_records').upsert(row);
                        if (error) throw error;
                    }
                }
            } catch (e) {
                console.error('Push op failed:', op, e);
                remaining.push(op);
                continue;
            }
        }

        setPendingOps(remaining);
    }

    async function pullRemoteChanges() {
        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return null;

        const lastSynced = getLastSyncedAt();

        const { data, error } = await client
            .from('work_records')
            .select('*')
            .eq('user_id', userId)
            .gt('updated_at', lastSynced)
            .order('updated_at', { ascending: true });

        if (error) throw error;
        return (data || []).map(rowToRecord);
    }

    async function pullSettings() {
        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return null;

        const { data, error } = await client
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            tags: data.tags,
            alarmPresets: data.alarm_presets,
            theme: data.theme,
            updatedAt: data.updated_at
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
        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return 0;

        const { count, error } = await client
            .from('work_records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null);

        if (error) throw error;
        return count || 0;
    }

    function scheduleSync(delayMs = 800) {
        if (!canSync()) {
            if (!APP_CONFIG.isCloudEnabled()) {
                setStatus(STATUS.NOT_CONFIGURED);
            } else if (!Auth.isLoggedIn()) {
                setStatus(STATUS.IDLE);
            } else {
                setStatus(STATUS.OFFLINE);
            }
            return;
        }
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => syncNow(), delayMs);
    }

    async function syncNow() {
        if (!canSync()) {
            if (!isOnline()) setStatus(STATUS.OFFLINE);
            return false;
        }
        if (syncInProgress) return false;

        syncInProgress = true;
        setStatus(STATUS.SYNCING);

        try {
            await pushPendingOps();

            const remoteRecords = await pullRemoteChanges();
            if (remoteRecords && remoteRecords.length > 0) {
                const localRecords = DataStore.getAllRecordsIncludingDeleted();
                const merged = mergeRecords(localRecords, remoteRecords);
                DataStore.setRecordsInternal(merged);
            }

            const remoteSettings = await pullSettings();
            if (remoteSettings) {
                DataStore.applyRemoteSettings(remoteSettings);
            }

            await pullActiveSession();

            setLastSyncedAt(new Date().toISOString());
            setStatus(STATUS.SYNCED);
            DataStore.notifyDataChanged();
            return true;
        } catch (e) {
            console.error('Sync failed:', e);
            setStatus(STATUS.ERROR);
            return false;
        } finally {
            syncInProgress = false;
        }
    }

    async function migrateLocalToCloud(strategy) {
        if (!canSync()) throw new Error('请先登录并确保网络连接');

        const client = Auth.getClient();
        const userId = Auth.getUserId();
        const localRecords = DataStore.getAllRecordsRaw();

        if (strategy === 'cloud') {
            const remote = await client
                .from('work_records')
                .select('*')
                .eq('user_id', userId)
                .is('deleted_at', null)
                .order('start_time', { ascending: false });

            if (remote.error) throw remote.error;
            const records = (remote.data || []).map(rowToRecord);
            DataStore.setRecordsInternal(records.filter((r) => !r.deletedAt));
            setLastSyncedAt(new Date().toISOString());
            setPendingOps([]);
            DataStore.notifyDataChanged();
            return records.length;
        }

        if (strategy === 'local') {
            const normalized = localRecords.map((r) => DataStore.normalizeRecord(r));
            for (const record of normalized) {
                const row = recordToRow(record, userId);
                const { error } = await client.from('work_records').upsert(row);
                if (error) throw error;
            }
            await DataStore.syncSettingsToCloud();
            setLastSyncedAt(new Date().toISOString());
            setPendingOps([]);
            return normalized.length;
        }

        // merge: upload local then full sync
        const normalized = localRecords.map((r) => DataStore.normalizeRecord(r));
        for (const record of normalized) {
            const row = recordToRow(record, userId);
            const { error } = await client.from('work_records').upsert(row);
            if (error) throw error;
        }
        setLastSyncedAt('1970-01-01T00:00:00.000Z');
        await syncNow();
        return normalized.length;
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
        scheduleSync(300);
    }

    async function pullActiveSession() {
        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return;

        const { data, error } = await client
            .from('active_sessions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data || !data.is_active || !data.start_time) return;

        const localRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
        let localActive = false;
        if (localRaw) {
            try {
                localActive = JSON.parse(localRaw).isActive;
            } catch (e) {
                localActive = false;
            }
        }

        if (!localActive && remoteActiveSessionHandler) {
            remoteActiveSessionHandler({
                startTime: data.start_time,
                workName: data.work_name || '',
                isActive: true,
                updatedAt: data.updated_at
            });
        }
    }

    function subscribeActiveSession(onRemoteSession) {
        remoteActiveSessionHandler = onRemoteSession;

        if (!APP_CONFIG.isCloudEnabled() || !Auth.isLoggedIn()) return;

        const client = Auth.getClient();
        const userId = Auth.getUserId();
        if (!client || !userId) return;

        if (realtimeChannel) {
            client.removeChannel(realtimeChannel);
        }

        realtimeChannel = client
            .channel(`active_session:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'active_sessions',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const row = payload.new;
                    if (!row) return;
                    if (row.is_active && row.start_time) {
                        const localRaw = localStorage.getItem(ACTIVE_SESSION_KEY);
                        let localActive = false;
                        if (localRaw) {
                            try {
                                localActive = JSON.parse(localRaw).isActive;
                            } catch (e) {
                                localActive = false;
                            }
                        }
                        if (!localActive && remoteActiveSessionHandler) {
                            remoteActiveSessionHandler({
                                startTime: row.start_time,
                                workName: row.work_name || '',
                                isActive: true,
                                updatedAt: row.updated_at
                            });
                        }
                    }
                }
            )
            .subscribe();
    }

    function unsubscribeActiveSession() {
        remoteActiveSessionHandler = null;
        if (realtimeChannel && Auth.getClient()) {
            Auth.getClient().removeChannel(realtimeChannel);
            realtimeChannel = null;
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
                subscribeActiveSession(remoteActiveSessionHandler);
                scheduleSync(500);
            } else {
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
        getCloudRecordCount,
        migrateLocalToCloud,
        pushActiveSession,
        clearActiveSessionRemote,
        subscribeActiveSession,
        unsubscribeActiveSession,
        getPendingOps
    };
})();
