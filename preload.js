const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  startTimer: (callback) => {
    ipcRenderer.on('start', callback);
    return () => ipcRenderer.removeListener('start', callback);
  },
  startBreak: (callback) => {
    ipcRenderer.on('break', callback);
    return () => ipcRenderer.removeListener('break', callback);
  },

  // login functionality
  loginWithMicrosoft: () => ipcRenderer.send('login-microsoft'),
  loginWithGoogle: () => ipcRenderer.send('login-google'),
  loginWithApple: () => ipcRenderer.send('login-apple'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),

  onLoginSuccess: (callback) => {
    ipcRenderer.on('login-success', callback);
    return () => ipcRenderer.removeListener('login-success', callback);
  },
  onLoginFailed: (callback) => {
    ipcRenderer.on('login-failed', callback);
    return () => ipcRenderer.removeListener('login-failed', callback);
  },
  
  // logout functionality
  logout: () => ipcRenderer.send('logout'),
  onLogoutSuccess: (callback) => {
    ipcRenderer.on('logout-success', callback);
    return () => ipcRenderer.removeListener('logout-success', callback);
  },
  
  // login statistics (optional)
  getLoginStats: () => ipcRenderer.send('get-login-stats'),
  onLoginStats: (callback) => {
    ipcRenderer.on('login-stats', callback);
    return () => ipcRenderer.removeListener('login-stats', callback);
  },

  // theme setting
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', callback);
    return () => ipcRenderer.removeListener('theme-changed', callback);
  },

  // notification settings
  getNotificationSettings: () => ipcRenderer.invoke('get-notification-settings'),
  checkRequiredPermissions: (settings) => ipcRenderer.invoke('check-required-permissions', settings),
  requestPermissionsImmediately: (settings) => ipcRenderer.invoke('request-permissions-immediately', settings),
  // Backward compatibility functions for UserGuide
  requestFullscreenPermission: async () => {
    const results = await ipcRenderer.invoke('request-permissions-immediately', { disableFullscreenNotifications: true });
    return results.fullscreen;
  },
  requestMeetingPermission: async () => {
    const results = await ipcRenderer.invoke('request-permissions-immediately', { disableMeetingNotifications: true });
    return results.meeting;
  },
  updateNotificationSettings: (settings) => ipcRenderer.send('update-notification-settings', settings),
  onNotificationSettingsUpdated: (callback) => {
    ipcRenderer.on('notification-settings-updated', callback);
    return () => ipcRenderer.removeListener('notification-settings-updated', callback);
  },
  onNotificationPermissionWarnings: (callback) => {
    ipcRenderer.on('notification-permission-warnings', callback);
    return () => ipcRenderer.removeListener('notification-permission-warnings', callback);
  },
  onPermissionRequestInfo: (callback) => {
    ipcRenderer.on('permission-request-info', callback);
    return () => ipcRenderer.removeListener('permission-request-info', callback);
  },

  // timer settings
  checkSettingsExist: () => ipcRenderer.invoke('check-settings-exist'),
  getTimerSettings: () => ipcRenderer.invoke('get-timer-settings'),
  updateTimerSettings: (settings) => ipcRenderer.invoke('update-timer-settings', settings),
  onTimerSettingsUpdated: (callback) => {
    ipcRenderer.on('timer-settings-updated', callback);
    return () => ipcRenderer.removeListener('timer-settings-updated', callback);
  },
});