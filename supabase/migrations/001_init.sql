-- 工作时间记录器 — Supabase 初始化 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- 工时记录
CREATE TABLE IF NOT EXISTS work_records (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ,
    duration_ms   BIGINT,
    work_name     TEXT DEFAULT '',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_work_records_user_updated
    ON work_records (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_records_user_deleted
    ON work_records (user_id, deleted_at);

-- 用户偏好（标签、闹钟预设、主题）
CREATE TABLE IF NOT EXISTS user_settings (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tags          JSONB DEFAULT '[]'::jsonb,
    alarm_presets JSONB DEFAULT '[5,10,15,30,45]'::jsonb,
    theme         TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 进行中的计时（跨设备同步）
CREATE TABLE IF NOT EXISTS active_sessions (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time    TIMESTAMPTZ,
    work_name     TEXT DEFAULT '',
    is_active     BOOLEAN NOT NULL DEFAULT false,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_records_updated_at
    BEFORE UPDATE ON work_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER active_sessions_updated_at
    BEFORE UPDATE ON active_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_records_select ON work_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY work_records_insert ON work_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY work_records_update ON work_records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY work_records_delete ON work_records
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY user_settings_select ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_settings_update ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY active_sessions_select ON active_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY active_sessions_insert ON active_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY active_sessions_update ON active_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY active_sessions_delete ON active_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Realtime（在 Supabase Dashboard → Database → Replication 中确认已启用）
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
