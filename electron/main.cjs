const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.NPS_DEV_URL;
let mainWindow;

function isAllowedNavigation(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (DEV_URL) return url.origin === new URL(DEV_URL).origin;
    return url.protocol === 'file:' && url.pathname.startsWith(path.join(__dirname, '..', 'dist').replaceAll('\\', '/'));
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#10151b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());

  if (DEV_URL) mainWindow.loadURL(DEV_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('app:get-metadata', () => ({ version: app.getVersion(), platform: process.platform }));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
