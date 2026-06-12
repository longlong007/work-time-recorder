// 复制此文件为 config.js 并填入你的 Supabase 凭据
const APP_CONFIG = {
    SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

    isCloudEnabled() {
        return Boolean(
            this.SUPABASE_URL &&
            this.SUPABASE_ANON_KEY &&
            this.SUPABASE_URL !== 'https://your-project.supabase.co' &&
            this.SUPABASE_ANON_KEY !== 'your-anon-key'
        );
    }
};
