const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nuroDesktop', Object.freeze({
  getMetadata: () => ipcRenderer.invoke('app:get-metadata'),
}));
