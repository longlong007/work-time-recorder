// 认证模块 — Supabase Email/Password
const Auth = (function () {
    let supabase = null;
    let currentUser = null;
    const listeners = [];

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

    function getClient() {
        return supabase;
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
        if (currentUser !== null) {
            callback(currentUser);
        }
        return () => {
            const idx = listeners.indexOf(callback);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }

    async function init() {
        if (!APP_CONFIG.isCloudEnabled()) {
            notify(null);
            return null;
        }

        if (!window.supabase || !window.supabase.createClient) {
            console.warn('Supabase JS 未加载，云端功能不可用');
            notify(null);
            return null;
        }

        supabase = window.supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );

        const { data: { session } } = await supabase.auth.getSession();
        notify(session ? session.user : null);

        supabase.auth.onAuthStateChange((_event, session) => {
            notify(session ? session.user : null);
        });

        return supabase;
    }

    async function signUp(email, password) {
        if (!supabase) throw new Error('云端服务未配置');
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async function signIn(email, password) {
        if (!supabase) throw new Error('云端服务未配置');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    return {
        init,
        getClient,
        isLoggedIn,
        getUser,
        getUserId,
        getUserEmail,
        onAuthStateChange,
        signUp,
        signIn,
        signOut
    };
})();
