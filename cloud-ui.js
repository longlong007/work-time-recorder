// 云端同步 UI — 登录、迁移、同步状态
const CloudUI = (function () {
    let migrationChecked = false;

    function $(id) {
        return document.getElementById(id);
    }

    function showModal(modal) {
        if (modal) modal.style.display = 'flex';
    }

    function hideModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    function updateAccountBar(user) {
        const accountBar = $('accountBar');
        const accountEmail = $('accountEmail');
        const loginBtn = $('loginBtn');
        const logoutBtn = $('logoutBtn');
        const syncBar = $('syncBar');

        if (!accountBar) return;

        if (!APP_CONFIG.isCloudEnabled()) {
            accountBar.style.display = 'none';
            if (syncBar) syncBar.style.display = 'none';
            return;
        }

        accountBar.style.display = 'flex';
        if (syncBar) syncBar.style.display = 'flex';

        if (user) {
            if (accountEmail) accountEmail.textContent = user.email || '已登录';
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        } else {
            if (accountEmail) accountEmail.textContent = '未登录（仅本地存储）';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    function updateSyncStatus(status) {
        const syncStatus = $('syncStatus');
        const syncIcon = $('syncIcon');
        const syncNowBtn = $('syncNowBtn');
        if (!syncStatus) return;

        const labels = {
            idle: { text: '本地模式', icon: '💾' },
            syncing: { text: '同步中…', icon: '🔄' },
            synced: { text: '已同步', icon: '☁️' },
            offline: { text: '离线（稍后同步）', icon: '📴' },
            error: { text: '同步失败', icon: '⚠️' },
            not_configured: { text: '未配置云端', icon: '⚙️' }
        };

        const info = labels[status] || labels.idle;
        syncStatus.textContent = info.text;
        syncStatus.dataset.status = status;
        if (syncIcon) syncIcon.textContent = info.icon;
        if (syncNowBtn) {
            syncNowBtn.disabled = status === 'syncing' || !Auth.isLoggedIn();
        }
    }

    function showAuthError(msg) {
        const el = $('authError');
        if (el) {
            el.textContent = msg;
            el.style.display = msg ? 'block' : 'none';
        }
    }

    function switchAuthTab(mode) {
        const isLogin = mode === 'login';
        $('authTitle').textContent = isLogin ? '登录账户' : '注册账户';
        $('authSubmitBtn').textContent = isLogin ? '登录' : '注册';
        $('authConfirmGroup').style.display = isLogin ? 'none' : 'block';
        $('authSwitchText').innerHTML = isLogin
            ? '还没有账户？<button type="button" class="link-btn" id="authSwitchBtn">立即注册</button>'
            : '已有账户？<button type="button" class="link-btn" id="authSwitchBtn">去登录</button>';
        $('authModal').dataset.mode = mode;
        bindAuthSwitch();
        showAuthError('');
    }

    function bindAuthSwitch() {
        const btn = $('authSwitchBtn');
        if (!btn) return;
        btn.onclick = () => {
            const mode = $('authModal').dataset.mode === 'login' ? 'register' : 'login';
            switchAuthTab(mode);
        };
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const mode = $('authModal').dataset.mode || 'login';
        const email = $('authEmail').value.trim();
        const password = $('authPassword').value;
        const confirm = $('authConfirmPassword').value;
        const submitBtn = $('authSubmitBtn');

        if (!email || !password) {
            showAuthError('请填写邮箱和密码');
            return;
        }
        if (mode === 'register' && password !== confirm) {
            showAuthError('两次输入的密码不一致');
            return;
        }
        if (password.length < 6) {
            showAuthError('密码至少 6 位');
            return;
        }

        submitBtn.disabled = true;
        showAuthError('');

        try {
            if (mode === 'register') {
                await Auth.signUp(email, password);
                alert('注册成功！请使用邮箱和密码登录。');
                switchAuthTab('login');
            } else {
                await Auth.signIn(email, password);
                hideModal($('authModal'));
                $('authForm').reset();
                await checkMigrationAfterLogin();
            }
        } catch (err) {
            showAuthError(err.message || '操作失败，请重试');
        } finally {
            submitBtn.disabled = false;
        }
    }

    async function checkMigrationAfterLogin() {
        if (migrationChecked) return;
        migrationChecked = true;

        if (!DataStore.hasLocalRecords()) {
            await DataStore.syncNow();
            refreshAppData();
            return;
        }

        try {
            const cloudCount = await SyncEngine.getCloudRecordCount();
            if (cloudCount === 0) {
                showMigrationModal('upload');
            } else {
                showMigrationModal('merge');
            }
        } catch (e) {
            console.error('Migration check failed:', e);
        }
    }

    function showMigrationModal(type) {
        const modal = $('migrationModal');
        const title = $('migrationTitle');
        const desc = $('migrationDesc');
        const uploadBtn = $('migrationUploadBtn');
        const mergeBtn = $('migrationMergeBtn');
        const cloudBtn = $('migrationCloudBtn');
        const localBtn = $('migrationLocalBtn');
        const skipBtn = $('migrationSkipBtn');

        if (!modal) return;

        if (type === 'upload') {
            title.textContent = '迁移本地数据';
            desc.textContent = '检测到本地有工时记录，云端为空。是否将本地数据上传到云端？';
            uploadBtn.style.display = 'inline-flex';
            mergeBtn.style.display = 'none';
            cloudBtn.style.display = 'none';
            localBtn.style.display = 'none';
        } else {
            title.textContent = '数据合并';
            desc.textContent = '本地和云端都有数据，请选择如何处理：';
            uploadBtn.style.display = 'none';
            mergeBtn.style.display = 'inline-flex';
            cloudBtn.style.display = 'inline-flex';
            localBtn.style.display = 'inline-flex';
        }
        skipBtn.style.display = 'inline-flex';
        showModal(modal);
    }

    function refreshAppData() {
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof updateStatistics === 'function') updateStatistics();
        if (typeof loadTags === 'function') loadTags();
        if (typeof renderQuickTags === 'function') renderQuickTags();
        if (typeof initTheme === 'function') initTheme();
        if (typeof renderAlarmPresets === 'function') renderAlarmPresets();
        if (typeof initAlarmPresetButtons === 'function') initAlarmPresetButtons();
    }

    async function runMigration(strategy) {
        const modal = $('migrationModal');
        try {
            const count = await DataStore.migrateLocalToCloud(strategy);
            hideModal(modal);
            let msg = '数据同步完成';
            if (strategy === 'merge') msg = '已合并本地与云端数据';
            else if (strategy === 'cloud') msg = '已使用云端数据覆盖本地';
            else if (strategy === 'local') msg = `已将 ${count} 条本地记录上传到云端`;
            else msg = `已上传 ${count} 条记录到云端`;
            alert(msg);
            refreshAppData();
        } catch (e) {
            alert('迁移失败：' + (e.message || '未知错误'));
        }
    }

    function handleRemoteActiveSession(session) {
        if (typeof applyRemoteActiveSession === 'function') {
            applyRemoteActiveSession(session);
        }
    }

    function init() {
        if (!APP_CONFIG.isCloudEnabled()) {
            updateAccountBar(null);
            return;
        }

        Auth.onAuthStateChange(async (user) => {
            updateAccountBar(user);
            if (user) {
                SyncEngine.subscribeActiveSession(handleRemoteActiveSession);
                await DataStore.syncNow();
                refreshAppData();
            } else {
                migrationChecked = false;
                SyncEngine.unsubscribeActiveSession();
            }
        });

        DataStore.onSyncStatusChange(updateSyncStatus);

        const loginBtn = $('loginBtn');
        const logoutBtn = $('logoutBtn');
        const closeAuthBtn = $('closeAuthModalBtn');
        const authForm = $('authForm');
        const syncNowBtn = $('syncNowBtn');
        const migrationUploadBtn = $('migrationUploadBtn');
        const migrationMergeBtn = $('migrationMergeBtn');
        const migrationCloudBtn = $('migrationCloudBtn');
        const migrationLocalBtn = $('migrationLocalBtn');
        const migrationSkipBtn = $('migrationSkipBtn');
        const closeMigrationBtn = $('closeMigrationModalBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                switchAuthTab('login');
                showModal($('authModal'));
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (!confirm('确定要登出吗？登出后仅显示本地缓存数据。')) return;
                try {
                    await Auth.signOut();
                    migrationChecked = false;
                } catch (e) {
                    alert('登出失败：' + e.message);
                }
            });
        }

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => hideModal($('authModal')));
        }

        if (authForm) {
            authForm.addEventListener('submit', handleAuthSubmit);
        }

        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                syncNowBtn.disabled = true;
                await DataStore.syncNow();
                refreshAppData();
            });
        }

        if (migrationUploadBtn) {
            migrationUploadBtn.addEventListener('click', () => runMigration('local'));
        }
        if (migrationMergeBtn) {
            migrationMergeBtn.addEventListener('click', () => runMigration('merge'));
        }
        if (migrationCloudBtn) {
            migrationCloudBtn.addEventListener('click', () => runMigration('cloud'));
        }
        if (migrationLocalBtn) {
            migrationLocalBtn.addEventListener('click', () => runMigration('local'));
        }
        if (migrationSkipBtn) {
            migrationSkipBtn.addEventListener('click', () => hideModal($('migrationModal')));
        }
        if (closeMigrationBtn) {
            closeMigrationBtn.addEventListener('click', () => hideModal($('migrationModal')));
        }

        [$('authModal'), $('migrationModal')].forEach((modal) => {
            if (!modal) return;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) hideModal(modal);
            });
        });

        switchAuthTab('login');
        updateSyncStatus(SyncEngine.getStatus());
    }

    return { init, refreshAppData, checkMigrationAfterLogin };
})();
