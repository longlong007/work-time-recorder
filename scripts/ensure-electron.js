#!/usr/bin/env node
/**
 * 确保 Electron 二进制完整（Frameworks 存在）。
 * 国内网络下 postinstall 常会留下残缺 dist，这里从缓存解压或强制重装。
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const frameworks = path.join(
    electronDir,
    'dist',
    'Electron.app',
    'Contents',
    'Frameworks',
    'Electron Framework.framework'
);

if (!fs.existsSync(electronDir)) {
    console.log('electron 未安装，跳过 ensure-electron');
    process.exit(0);
}

if (fs.existsSync(frameworks)) {
    process.exit(0);
}

console.warn('检测到 Electron 二进制不完整，尝试修复…');
const dist = path.join(electronDir, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
try {
    fs.unlinkSync(path.join(electronDir, 'path.txt'));
} catch (_) {
    /* ignore */
}

const env = {
    ...process.env,
    ELECTRON_MIRROR:
        process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
    force_no_cache: process.env.force_no_cache || 'false'
};

try {
    execSync('node install.js', { cwd: electronDir, env, stdio: 'inherit' });
} catch (err) {
    console.error('ensure-electron 失败：请手动设置 ELECTRON_MIRROR 后执行 npm install electron');
    process.exit(1);
}

if (!fs.existsSync(frameworks)) {
    console.error('修复后仍缺少 Electron Framework，请检查网络或镜像');
    process.exit(1);
}

console.log('Electron 二进制已修复');
