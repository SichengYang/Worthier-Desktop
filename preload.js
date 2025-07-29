const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  startTimer: (callback) => ipcRenderer.on('start', callback),
  startBreak: (callback) => ipcRenderer.on('break', callback),

  // login functionality
  loginWithMicrosoft: () => ipcRenderer.send('login-microsoft'),
  loginWithGoogle: () => ipcRenderer.send('login-google'),
  loginWithApple: () => ipcRenderer.send('login-apple'),

  onLoginSuccess: (callback) => ipcRenderer.on('login-success', callback),
  onLoginFailed: (callback) => ipcRenderer.on('login-failed', callback),
  
  // logout functionality
  logout: (provider) => ipcRenderer.send('logout', provider),
  onLogoutSuccess: (callback) => ipcRenderer.on('logout-success', callback),
});