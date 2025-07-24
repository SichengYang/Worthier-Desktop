const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  startTimer: (callback) => ipcRenderer.on('start', callback),
  startBreak: (callback) => ipcRenderer.on('break', callback),

  // login functionality
  loginWithMicrosoft: () => ipcRenderer.send('login-microsoft'),
  loginWithGoogle: () => ipcRenderer.send('login-google'),

  onLoginSuccess: (callback) => ipcRenderer.on('login-success', callback),
  onLoginFailed: (callback) => ipcRenderer.on('login-failed', callback),
});