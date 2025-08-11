const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send notification when timer completes
  sendNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  
  // Close the rest window
  closeWindow: () => ipcRenderer.invoke('close-rest-window'),
  
  // Start working immediately (sends start signal and closes window)
  startWork: () => {
    ipcRenderer.send('start-work-from-rest');
    ipcRenderer.invoke('close-rest-window');
  },
  
  // Listen for timer events
  onStartTimer: (callback) => ipcRenderer.on('start-rest-timer', callback),
  onStopTimer: (callback) => ipcRenderer.on('stop-rest-timer', callback),
  
  // Get URL parameters
  getUrlParams: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      restTime: parseInt(urlParams.get('restTime')) || 10,
      theme: urlParams.get('theme') || 'light'
    };
  }
});
