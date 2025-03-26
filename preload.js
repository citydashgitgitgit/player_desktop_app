// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPlaylist: () => ipcRenderer.invoke('get-playlist'),
    getLocalAdObject: () => ipcRenderer.invoke('get-local-ad-object'),

    // Прослушиваем сообщение с ID окна отображения
    onDisplayWindowId: (callback) => {
        ipcRenderer.on('display-window-id', (event, id) => callback(id))
    },

    // Функции для управления окном отображения
    resizeWindow: (width, height) =>  ipcRenderer.send('resize-display-window', width, height),
    moveWindow: (x, y) => ipcRenderer.send('move-display-window', x, y),
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
    setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
    setBackgroundColor: (color) => ipcRenderer.send('set-background-color', color),
    reloadWindow: () => ipcRenderer.send('reload-display-window'),
    hideControlWindow: () => ipcRenderer.send('hide-control-window'),
    env: () => ipcRenderer.send('get-env'),
    setAdObject: (adObjectUuid) => ipcRenderer.send('set-ad-object', adObjectUuid),
});