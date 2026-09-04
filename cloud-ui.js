// 云端同步 UI — 登录、静默同步、同步状态
const CloudUI = (function () {
    const BOUND_ACCOUNT_KEY = 'cloudAccountBound';
    let pendingVerificationInfo = null;
    let syncAfterLoginInFlight = false;
    let lastSyncedUserId = null;

    function $(id) {
        return document.getElementById(id);
    }

    function showModal(modal) {
        if (modal) modal.style.display = 'flex';
    }

    function hideModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    function getBoundUserId() {
        return localStorage.getItem(BOUND_ACCOUNT_KEY) || '';
    }

    function isAccountBound(userId) {
        return Boolean(userId && getBoundUserId() === userId);
    }

    function markAccountBound(userId) {
        if (userId) {
            localStorage.setItem(BOUND_ACCOUNT_KEY, userId);
        }
    }

    function updateAccountBar(user) {
        const accountBar = $('accountBar');
        const accountEmail = $('accountEmail');
        const loginBtn = $('loginBtn');
        const logoutBtn = $('logoutBtn');
        const syncBar = $('syncBar');

        if (!accountBar) return;

        accountBar.style.display = 'flex';

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
        const authModal = $('authModal');
        const authTitle = $('authTitle');
        const authSubmitBtn = $('authSubmitBtn');
        const authConfirmGroup = $('authConfirmGroup');
        const authCodeGroup = $('authCodeGroup');
        if (!authModal || !authTitle || !authSubmitBtn) return;

        const isLogin = mode === 'login';
        authTitle.textContent = isLogin ? '登录账户' : '注册账户';
        authSubmitBtn.textContent = isLogin ? '登录' : '注册';
        if (authConfirmGroup) {
            authConfirmGroup.style.display = isLogin ? 'none' : 'block';
        }
        if (authCodeGroup) {
            authCodeGroup.style.display = isLogin ? 'none' : 'block';
        }
        if (!isLogin) {
            pendingVerificationInfo = null;
            const codeInput = $('authVerificationCode');
            if (codeInput) codeInput.value = '';
        }
        const authSwitchText = $('authSwitchText');
        if (authSwitchText) {
            authSwitchText.innerHTML = isLogin
                ? '还没有账户？<button type="button" class="link-btn" id="authSwitchBtn">立即注册</button>'
                : '已有账户？<button type="button" class="link-btn" id="authSwitchBtn">去登录</button>';
        }
        authModal.dataset.mode = mode;
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

    async function sendVerificationCode() {
        const email = $('authEmail').value.trim();
        const sendBtn = $('authSendCodeBtn');
        if (!email) {
            showAuthError('请先填写邮箱');
            return;
        }
        if (sendBtn) sendBtn.disabled = true;
        showAuthError('');
        try {
            pendingVerificationInfo = await Auth.sendEmailVerificationCode(email);
            showAuthError('验证码已发送，请查收邮箱（含垃圾箱）');
        } catch (err) {
            pendingVerificationInfo = null;
            showAuthError(Auth.formatAuthError(err));
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const mode = $('authModal').dataset.mode || 'login';
        const email = $('authEmail').value.trim();
        const password = $('authPassword').value;
        const confirm = $('authConfirmPassword').value;
        const verificationCode = $('authVerificationCode') ? $('authVerificationCode').value.trim() : '';
        const submitBtn = $('authSubmitBtn');

        if (!email || !password) {
            showAuthError('请填写邮箱和密码');
            return;
        }
        if (mode === 'register' && password !== confirm) {
            showAuthError('两次输入的密码不一致');
            return;
        }
        if (password.length < 8) {
            showAuthError('密码至少 8 位');
            return;
        }
        const pwdError = Auth.validatePassword(password);
        if (pwdError) {
            showAuthError(pwdError);
            return;
        }
        if (mode === 'register' && !verificationCode) {
            showAuthError('请先获取并填写邮箱验证码');
            return;
        }

        submitBtn.disabled = true;
        showAuthError('');

        try {
            if (mode === 'register') {
                if (!pendingVerificationInfo) {
                    throw new Error('请先点击「获取验证码」');
                }
                await Auth.signUp(email, password, verificationCode, pendingVerificationInfo);
                pendingVerificationInfo = null;
                hideModal($('authModal'));
                $('authForm').reset();
                await ensureSyncedAfterLogin();
            } else {
                await Auth.signIn(email, password);
                hideModal($('authModal'));
                $('authForm').reset();
                await ensureSyncedAfterLogin();
            }
        } catch (err) {
            showAuthError(Auth.formatAuthError(err));
        } finally {
            submitBtn.disabled = false;
        }
    }

    /**
     * 登录后静默同步（印象笔记式）：
     * - 本机首次绑定该账号：重置同步游标 + 差集补传，本地∪云端
     * - 已绑定过：仅增量 syncNow
     * 不再弹出合并/覆盖对话框。
     */
    async function ensureSyncedAfterLogin() {
        if (syncAfterLoginInFlight) return;
        if (!Auth.isLoggedIn()) return;

        syncAfterLoginInFlight = true;
        const userId = Auth.getUserId();

        try {
            if (userId && !isAccountBound(userId) && typeof SyncEngine.resetSyncCursorForFirstBind === 'function') {
                SyncEngine.resetSyncCursorForFirstBind();
            }

            const ok = await DataStore.syncNow();
            // 成功或「已无待重试」都视为完成本机绑定；失败则下次登录再走首次全量
            if (ok && userId) {
                markAccountBound(userId);
            }
            refreshAppData();
        } catch (e) {
            console.error('登录后同步失败:', e);
        } finally {
            syncAfterLoginInFlight = false;
            updateSyncStatus(SyncEngine.getStatus());
        }
    }

    // 兼容旧调用名
    async function checkMigrationAfterLogin() {
        return ensureSyncedAfterLogin();
    }

    function refreshAppData() {
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof updateStatistics === 'function') updateStatistics();
        if (typeof loadTags === 'function') loadTags();
        if (typeof renderQuickTags === 'function') renderQuickTags();
        if (typeof initTheme === 'function') initTheme();
        if (typeof renderAlarmPresets === 'function') renderAlarmPresets();
        if (typeof initAlarmPresetButtons === 'function') initAlarmPresetButtons();
        if (typeof StatsCharts !== 'undefined' && StatsCharts.refresh) {
            StatsCharts.refresh();
        }
    }

    function setMigrationProgressVisible(visible, total) {
        const progress = $('migrationProgress');
        const actions = $('migrationActions');
        const progressText = $('migrationProgressText');
        const progressBar = $('migrationProgressBar');
        if (progress) progress.style.display = visible ? 'block' : 'none';
        if (actions) actions.style.display = visible ? 'none' : 'flex';
        if (visible && progressText) {
            progressText.textContent = `上传中 0 / ${total}`;
        }
        if (progressBar) progressBar.style.width = '0%';
    }

    function updateMigrationProgress(done, total) {
        const progressText = $('migrationProgressText');
        const progressBar = $('migrationProgressBar');
        if (progressText) {
            progressText.textContent = `上传中 ${done} / ${total}`;
        }
        if (progressBar && total > 0) {
            progressBar.style.width = `${Math.round((done / total) * 100)}%`;
        }
    }

    /** 保留给特殊场景手动调用；登录路径不再自动弹出 */
    async function runMigration(strategy) {
        const modal = $('migrationModal');
        const needsUpload = strategy === 'local' || strategy === 'merge';
        const total = needsUpload ? DataStore.getAllRecordsRaw().length : 0;

        if (needsUpload && total > 0) {
            setMigrationProgressVisible(true, total);
            updateSyncStatus(SyncEngine.STATUS.SYNCING);
        }

        try {
            const count = await DataStore.migrateLocalToCloud(strategy, {
                onProgress: updateMigrationProgress
            });
            hideModal(modal);
            setMigrationProgressVisible(false, 0);
            const userId = Auth.getUserId();
            if (userId) markAccountBound(userId);
            let msg = '数据同步完成';
            if (strategy === 'merge') msg = '已合并本地与云端数据';
            else if (strategy === 'cloud') msg = '已使用云端数据覆盖本地';
            else if (strategy === 'local') msg = `已将 ${count} 条本地记录上传到云端`;
            else msg = `已上传 ${count} 条记录到云端`;
            alert(msg);
            refreshAppData();
        } catch (e) {
            setMigrationProgressVisible(false, 0);
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

        updateAccountBar(Auth.getUser());
        updateSyncStatus(SyncEngine.getStatus());

        Auth.onAuthStateChange(async (user) => {
            updateAccountBar(user);
            if (user) {
                SyncEngine.subscribeActiveSession(handleRemoteActiveSession);
                const uid = user.id || user.uid;
                if (uid !== lastSyncedUserId) {
                    lastSyncedUserId = uid;
                    await ensureSyncedAfterLogin();
                }
            } else {
                lastSyncedUserId = null;
                SyncEngine.unsubscribeActiveSession();
            }
        });

        DataStore.onSyncStatusChange(updateSyncStatus);

        if (typeof SyncEngine.onUploadProgress === 'function') {
            SyncEngine.onUploadProgress((done, total) => {
                const syncStatus = $('syncStatus');
                if (!syncStatus || !total) return;
                syncStatus.textContent = `同步中 ${done}/${total}`;
            });
        }

        const loginBtn = $('loginBtn');
        const logoutBtn = $('logoutBtn');
        const closeAuthBtn = $('closeAuthModalBtn');
        const authForm = $('authForm');
        const authSendCodeBtn = $('authSendCodeBtn');
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

        if (authSendCodeBtn) {
            authSendCodeBtn.addEventListener('click', sendVerificationCode);
        }

        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                syncNowBtn.disabled = true;
                try {
                    await DataStore.syncNow({ manual: true });
                    refreshAppData();
                } finally {
                    updateSyncStatus(SyncEngine.getStatus());
                }
            });
        }

        // 迁移弹窗按钮保留（不自动弹出）；便于控制台/调试手动触发
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
    }

    return { init, refreshAppData, checkMigrationAfterLogin, ensureSyncedAfterLogin };
})();
