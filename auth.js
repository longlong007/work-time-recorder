// 认证模块 — CloudBase Auth v1（统一版本，避免 v1/v2 混用）
const Auth = (function () {
    let app = null;
    let auth = null;
    let currentUser = null;
    const listeners = [];

    function mapUser(cloudUser) {
        if (!cloudUser) return null;
        const uid = cloudUser.uid || cloudUser.customUserId || cloudUser.sub || cloudUser.id;
        if (!uid) return null;
        return {
            id: uid,
            uid,
            email: cloudUser.email || cloudUser.emailAddress || null
        };
    }

    function formatAuthError(err) {
        if (!err) return '操作失败，请重试';
        if (typeof err === 'string') return err;
        const msg =
            err.error_description ||
            err.message ||
            err.msg ||
            err.error ||
            err.code;
        if (typeof msg === 'string' && msg) return msg;
        try {
            return JSON.stringify(err);
        } catch (e) {
            return '操作失败，请重试';
        }
    }

    function validatePassword(password) {
        if (password.length < 8 || password.length > 32) {
            return '密码长度需 8–32 位';
        }
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            return '密码需同时包含字母和数字';
        }
        return null;
    }

    function normalizeVerificationInfo(raw) {
        if (!raw) return null;
        if (raw.verification_id) return raw;
        if (raw.verificationInfo) return normalizeVerificationInfo(raw.verificationInfo);
        if (raw.data) return normalizeVerificationInfo(raw.data);
        return raw;
    }

    function notify(user) {
        currentUser = user;
        listeners.forEach((cb) => {
            try {
                cb(user);
            } catch (e) {
                console.error('Auth listener error:', e);
            }
        });
    }

    function getDb() {
        return app ? app.database() : null;
    }

    function getApp() {
        return app;
    }

    async function callFunction(name, data) {
        if (!app) throw new Error('云端服务未配置');
        const res = await app.callFunction({ name, data });
        if (!res || res.result === undefined) {
            throw new Error('云函数无响应');
        }
        return res.result;
    }

    function isLoggedIn() {
        return Boolean(currentUser);
    }

    function getUser() {
        return currentUser;
    }

    function getUserId() {
        return currentUser ? currentUser.id : null;
    }

    function getUserEmail() {
        return currentUser ? currentUser.email : null;
    }

    function onAuthStateChange(callback) {
        listeners.push(callback);
        callback(currentUser);
        return () => {
            const idx = listeners.indexOf(callback);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }

    function userFromLoginState(loginState) {
        if (!loginState) return null;
        const raw = loginState.user;
        if (!raw) return null;
        if (typeof raw === 'object') {
            return mapUser(raw.user || raw);
        }
        return null;
    }

    async function resolveCurrentUser(fallbackEmail) {
        const loginState = await auth.getLoginState();
        let user = userFromLoginState(loginState);
        if (user) return user;

        try {
            const info = await auth.getUserInfo();
            user = mapUser(info);
            if (user) return user;
        } catch (e) {
            // getUserInfo 在未登录时会失败，忽略
        }

        if (fallbackEmail) {
            const stateUser = loginState && loginState.user;
            const uid =
                (stateUser && (stateUser.uid || stateUser.sub || stateUser.id)) ||
                null;
            if (uid) {
                return { id: uid, uid, email: fallbackEmail };
            }
        }

        return null;
    }

    async function init() {
        if (!APP_CONFIG.isCloudEnabled()) {
            notify(null);
            return null;
        }

        if (!window.cloudbase || typeof window.cloudbase.init !== 'function') {
            console.warn('CloudBase JS 未加载，云端功能不可用');
            notify(null);
            return null;
        }

        app = window.cloudbase.init({
            env: APP_CONFIG.CLOUDBASE_ENV,
            region: APP_CONFIG.CLOUDBASE_REGION || 'ap-shanghai'
        });
        auth = app.auth({ persistence: 'local' });

        try {
            const loginState = await auth.getLoginState();
            notify(userFromLoginState(loginState));
        } catch (e) {
            const code = e && (e.error || e.code);
            if (code !== 'unauthenticated') {
                console.warn('读取登录状态失败:', e);
            }
            notify(null);
        }

        return app;
    }

    async function sendEmailVerificationCode(email) {
        if (!auth) throw new Error('云端服务未配置');
        const address = email.trim();
        if (!address) throw new Error('请填写邮箱');

        const raw = await auth.getVerification({ email: address });
        const info = normalizeVerificationInfo(raw);
        if (!info || !info.verification_id) {
            throw new Error('验证码发送失败，请检查控制台邮箱验证码配置');
        }
        return info;
    }

    async function signUp(email, password, verificationCode, verificationInfo) {
        if (!auth) throw new Error('云端服务未配置');

        const address = email.trim();
        const pwdError = validatePassword(password);
        if (pwdError) throw new Error(pwdError);

        const info = normalizeVerificationInfo(verificationInfo);
        if (!verificationCode || !info || !info.verification_id) {
            throw new Error('请先获取并填写邮箱验证码');
        }

        const verifyResult = await auth.verify({
            verification_id: info.verification_id,
            verification_code: verificationCode.trim()
        });

        const verificationToken =
            verifyResult.verification_token ||
            verifyResult.verificationToken ||
            verifyResult.token;

        if (!verificationToken) {
            throw new Error('验证码错误或已过期，请重新获取');
        }

        // v1 注册：email + verification_token + password（username 可选，省略以免格式冲突）
        await auth.signUp({
            email: address,
            password,
            verification_token: verificationToken
        });

        const user = await resolveCurrentUser(address);
        notify(user);
        return { user: user || { email: address } };
    }

    async function signIn(email, password) {
        if (!auth) throw new Error('云端服务未配置');

        const account = email.trim();
        if (!account) throw new Error('请填写邮箱');

        // v1 账号密码登录：username 字段可填邮箱/手机号/用户名
        await auth.signIn({
            username: account,
            password
        });

        const user = await resolveCurrentUser(account);
        if (!user) {
            throw new Error('登录成功但未获取到用户信息，请刷新页面重试');
        }
        notify(user);
        return { user };
    }

    async function signOut() {
        if (!auth) return;
        await auth.signOut();
        notify(null);
    }

    return {
        init,
        getApp,
        getDb,
        callFunction,
        isLoggedIn,
        getUser,
        getUserId,
        getUserEmail,
        onAuthStateChange,
        sendEmailVerificationCode,
        signUp,
        signIn,
        signOut,
        formatAuthError,
        validatePassword
    };
})();
