const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require("path");
const { getPlaylist, getLocalAdObject } = require("./server/videos");
require("./server/videos");

let controlWindow;
let win;

const createPlayerWindow = async () => {
  const adObject = await getLocalAdObject();
  const playlist = await getPlaylist();

  win = new BrowserWindow({
    width: adObject.specs.screen.width,
    height: adObject.specs.screen.height,
    x: 0,
    y: 0,
    frame: false,
    // frame: true,
    titleBarStyle: "default",
    alwaysOnTop: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [`default-src 'self'; script-src 'self'; connect-src 'self' ${process.env.SERVER_URL}/api ${process.env.SERVER_URL}`]
      }
    })
  });

  win.loadFile('renderer/index.html');
  // win.webContents.openDevTools();
}

const createControlWindow = async () => {
  controlWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Панель управления',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  controlWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [`connect-src 'self' ${process.env.SERVER_URL}/api ${process.env.SERVER_URL}`]
      }
    })
  });

  controlWindow.loadFile('renderer/control.html');
  controlWindow.webContents.openDevTools();
  controlWindow.webContents.on('did-finish-load', () => {
    controlWindow.webContents.send('display-window-id', win.id);
  });

  // Обрабатываем закрытие окна управления
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function setupIpcHandlers() {
  ipcMain.handle('get-playlist', async (event) => {
    return await getPlaylist();
  });

  ipcMain.handle('get-local-ad-object', async (event) => {
    return await getLocalAdObject();
  });

  // Настраиваем IPC обработчики для управления окном отображения
  ipcMain.on('resize-display-window', (event, width, height) => {
    win.setSize(width, height);
  });

  ipcMain.on('move-display-window', (event, x, y) => {
    win.setPosition(x, y);
  });

  ipcMain.on('toggle-fullscreen', (event) => {
    win.setFullScreen(!win.isFullScreen());
  });

  ipcMain.on('set-always-on-top', (event, flag) => {
    win.setAlwaysOnTop(flag);
  });

  ipcMain.on('set-background-color', (event, color) => {
    win.setBackgroundColor(color);
  });

  ipcMain.on('reload-display-window', (event) => {
    win.reload();
  });

  // Добавляем обработчик для скрытия окна управления
  ipcMain.on('hide-control-window', (event) => {
    if (controlWindow) {
      controlWindow.hide();
    }
  });

  ipcMain.on('get-env', (event) => {
    return process.env;
  });

  ipcMain.on('set-ad-object', (event) => {
    return process.env;
  });
}

app.whenReady().then(async () => {
  await createPlayerWindow();

  // Регистрируем глобальное сочетание клавиш для открытия окна управления
  globalShortcut.register('CommandOrControl+P', () => {
    createControlWindow();
  });

  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Очищаем регистрацию глобальных сочетаний клавиш при выходе
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
})