const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    globalShortcut,
    ipcMain,
    nativeImage,
    dialog,
    shell
} = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DEFAULT_PORT = 8080;
const ROOT = path.join(__dirname, '..');
const SHORTCUT = 'CommandOrControl+Shift+T';

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let staticServer = null;
let serverPort = DEFAULT_PORT;
let isQuitting = false;
let overlayVisible = false;
let timerStatus = {
    running: false,
    elapsed: '00:00:00',
    workName: ''
};
let lastMenuRunning = null;
let lastMenuWorkName = null;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.map': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function getMime(filePath) {
    return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function tryListen(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            try {
                const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
                const rel = urlPath === '/' ? '/index.html' : urlPath;
                const filePath = path.normalize(path.join(ROOT, rel));
                if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('Not found');
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': getMime(filePath),
                        'Cache-Control': 'no-cache'
                    });
                    res.end(data);
                });
            } catch (e) {
                res.writeHead(500);
                res.end('Server error');
            }
        });

        const onError = (err) => {
            server.removeListener('listening', onListening);
            server.close();
            reject(err);
        };
        const onListening = () => {
            server.removeListener('error', onError);
            staticServer = server;
            serverPort = port;
            resolve(port);
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '127.0.0.1');
    });
}

async function startStaticServer() {
    for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 30; port += 1) {
        try {
            return await tryListen(port);
        } catch (err) {
            if (err.code !== 'EADDRINUSE') {
                throw err;
            }
        }
    }
    throw new Error('无法找到可用的本地端口（8080–8109）');
}

function loadTrayIcon() {
    const templatePath = path.join(__dirname, 'icons', 'trayTemplate.png');
    const fallbackPath = path.join(__dirname, 'icons', 'tray.png');
    const iconPath = fs.existsSync(templatePath) ? templatePath : fallbackPath;
    let image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
        // 1x1 透明占位，避免托盘创建失败
        image = nativeImage.createEmpty();
    }
    if (process.platform === 'darwin') {
        image.setTemplateImage(true);
    }
    return image;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 820,
        minWidth: 720,
        minHeight: 560,
        show: false,
        title: '工作时间记录器',
        icon: path.join(__dirname, 'icons', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.session.on('will-download', (event, item) => {
        const fileName = item.getFilename() || 'download.csv';
        const result = dialog.showSaveDialogSync(mainWindow, {
            defaultPath: fileName,
            filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }]
        });
        if (!result) {
            item.cancel();
            return;
        }
        item.setSavePath(result);
    });
}

function createOverlayWindow() {
    overlayWindow = new BrowserWindow({
        width: 280,
        height: 72,
        frame: false,
        transparent: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        show: false,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    if (process.platform === 'darwin') {
        overlayWindow.setAlwaysOnTop(true, 'floating');
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    overlayWindow.loadURL(`http://127.0.0.1:${serverPort}/electron/overlay.html`);

    overlayWindow.on('closed', () => {
        overlayWindow = null;
        overlayVisible = false;
        rebuildTrayMenu();
    });
}

function showOverlay() {
    if (!overlayWindow) {
        createOverlayWindow();
    }
    broadcastStatus();
    overlayWindow.show();
    overlayVisible = true;
    rebuildTrayMenu();
}

function hideOverlay() {
    if (overlayWindow) {
        overlayWindow.hide();
    }
    overlayVisible = false;
    rebuildTrayMenu();
}

function toggleOverlay() {
    if (overlayVisible && overlayWindow && overlayWindow.isVisible()) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

function toggleMainWindow() {
    if (!mainWindow) {
        createMainWindow();
        return;
    }
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
    }
}

function sendToggleTimer() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tray:toggle-timer');
    }
}

function broadcastStatus() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('timer:status-broadcast', timerStatus);
    }
}

function updateTrayTooltip() {
    if (!tray) return;
    if (timerStatus.running) {
        const name = timerStatus.workName || '工作中';
        tray.setToolTip(`${name} · ${timerStatus.elapsed}`);
    } else {
        tray.setToolTip('工作时间记录器');
    }
}

function getOpenAtLogin() {
    const settings = app.getLoginItemSettings();
    return Boolean(settings.openAtLogin);
}

function setOpenAtLogin(enabled) {
    app.setLoginItemSettings({
        openAtLogin: Boolean(enabled),
        openAsHidden: true
    });
    return getOpenAtLogin();
}

function rebuildTrayMenu() {
    if (!tray) return;

    const openAtLogin = getOpenAtLogin();
    const toggleLabel = timerStatus.running ? '结束' : '开始';
    const statusLabel = timerStatus.running ? '进行中' : '未开始';

    const menu = Menu.buildFromTemplate([
        { label: statusLabel, enabled: false },
        { type: 'separator' },
        {
            label: toggleLabel,
            click: () => sendToggleTimer()
        },
        {
            label: '显示主窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: overlayVisible ? '隐藏悬浮条' : '显示悬浮条',
            click: () => toggleOverlay()
        },
        { type: 'separator' },
        {
            label: '开机启动',
            type: 'checkbox',
            checked: openAtLogin,
            click: (item) => {
                setOpenAtLogin(item.checked);
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(menu);
    updateTrayTooltip();
}

function createTray() {
    tray = new Tray(loadTrayIcon());
    rebuildTrayMenu();

    tray.on('click', () => {
        toggleMainWindow();
    });

    // macOS 右键已由 context menu 处理；部分系统双击也切窗口
    tray.on('double-click', () => {
        toggleMainWindow();
    });
}

function registerShortcuts() {
    const ok = globalShortcut.register(SHORTCUT, () => {
        toggleMainWindow();
    });
    if (!ok) {
        console.warn(`全局快捷键注册失败: ${SHORTCUT}`);
    }
}

function setupIpc() {
    ipcMain.on('timer:status', (_event, status) => {
        const next = {
            running: Boolean(status && status.running),
            elapsed: (status && status.elapsed) || '00:00:00',
            workName: (status && status.workName) || ''
        };
        const menuNeedsRebuild =
            next.running !== lastMenuRunning || next.workName !== lastMenuWorkName;
        timerStatus = next;
        updateTrayTooltip();
        if (menuNeedsRebuild) {
            lastMenuRunning = next.running;
            lastMenuWorkName = next.workName;
            rebuildTrayMenu();
        }
        broadcastStatus();
    });

    ipcMain.on('overlay:toggle', () => {
        toggleOverlay();
    });

    ipcMain.on('timer:request-toggle', () => {
        sendToggleTimer();
    });

    ipcMain.on('window:show-main', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    ipcMain.handle('settings:get-open-at-login', () => getOpenAtLogin());
    ipcMain.handle('settings:set-open-at-login', (_event, enabled) => setOpenAtLogin(enabled));
}

app.whenReady().then(async () => {
    try {
        await startStaticServer();
        if (serverPort !== DEFAULT_PORT) {
            console.warn(
                `端口 ${DEFAULT_PORT} 被占用，已使用 ${serverPort}。` +
                    '若需 CloudBase 登录，请在云开发控制台安全域名中加入 ' +
                    `http://127.0.0.1:${serverPort} 与 http://localhost:${serverPort}`
            );
        }

        setupIpc();
        createMainWindow();
        createTray();
        registerShortcuts();

        app.on('activate', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            } else {
                createMainWindow();
            }
        });
    } catch (err) {
        console.error(err);
        dialog.showErrorBox('启动失败', err.message || String(err));
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (staticServer) {
        staticServer.close();
        staticServer = null;
    }
});

app.on('window-all-closed', () => {
    // 托盘常驻：不因窗口关闭而退出
    if (process.platform !== 'darwin' && isQuitting) {
        app.quit();
    }
});
