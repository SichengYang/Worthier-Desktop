const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onNotify: (callback) => ipcRenderer.on('notify', (event, message) => callback(message))
});
