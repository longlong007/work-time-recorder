// 复制此文件为 config.js 并填入你的 CloudBase 环境 ID
const APP_CONFIG = {
    CLOUDBASE_ENV: 'xxxx-yyy',
    CLOUDBASE_REGION: 'ap-shanghai',
    // 批量上传云函数名（见 cloudbase/SETUP.md 部署说明）
    CLOUDBASE_BATCH_FN: 'batchUpsertWorkRecords',
    // 增量拉取云函数（返回变更 + serverNow，避免本机时钟偏差）
    CLOUDBASE_PULL_FN: 'pullWorkRecordChanges',

    isCloudEnabled() {
        return Boolean(
            this.CLOUDBASE_ENV &&
            this.CLOUDBASE_ENV !== 'your-env-id' &&
            this.CLOUDBASE_ENV !== 'xxxx-yyy'
        );
    }
};
