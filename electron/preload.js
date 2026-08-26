const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    reportStatus(status) {
        ipcRenderer.send('timer:status', status);
    },
    onToggleTimer(callback) {
        const handler = () => {
            try {
                callback();
            } catch (err) {
                console.error('toggle timer handler error:', err);
            }
        };
        ipcRenderer.on('tray:toggle-timer', handler);
        return () => ipcRenderer.removeListener('tray:toggle-timer', handler);
    },
    onStatus(callback) {
        const handler = (_event, status) => {
            try {
                callback(status);
            } catch (err) {
                console.error('status handler error:', err);
            }
        };
        ipcRenderer.on('timer:status-broadcast', handler);
        return () => ipcRenderer.removeListener('timer:status-broadcast', handler);
    },
    getOpenAtLogin() {
        return ipcRenderer.invoke('settings:get-open-at-login');
    },
    setOpenAtLogin(enabled) {
        return ipcRenderer.invoke('settings:set-open-at-login', enabled);
    },
    toggleOverlay() {
        ipcRenderer.send('overlay:toggle');
    },
    requestToggleTimer() {
        ipcRenderer.send('timer:request-toggle');
    },
    showMainWindow() {
        ipcRenderer.send('window:show-main');
    },
    platform: process.platform
});
