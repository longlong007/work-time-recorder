// Supabase 配置
// 1. 在 https://supabase.com 创建项目
// 2. 将 Project URL 和 anon public key 填入下方
// 3. 在 SQL Editor 执行 supabase/migrations/001_init.sql
const APP_CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',

    isCloudEnabled() {
        return Boolean(
            this.SUPABASE_URL &&
            this.SUPABASE_ANON_KEY &&
            this.SUPABASE_URL !== 'https://your-project.supabase.co' &&
            this.SUPABASE_ANON_KEY !== 'your-anon-key'
        );
    }
};
