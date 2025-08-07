const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronNotification', {
    // Receive notification data from main process
    onData: (callback) => {
        ipcRenderer.on('notification-data', (event, data) => callback(data));
    },
    
    // Send button clicks to main process
    button1Click: async () => {
        const notificationId = await ipcRenderer.invoke('get-notification-id');
        if (notificationId) {
            ipcRenderer.invoke('notification-button1-click', notificationId);
        }
    },
    
    button2Click: async () => {
        const notificationId = await ipcRenderer.invoke('get-notification-id');
        if (notificationId) {
            ipcRenderer.invoke('notification-button2-click', notificationId);
        }
    },
    
    // Send close event to main process
    close: async () => {
        const notificationId = await ipcRenderer.invoke('get-notification-id');
        if (notificationId) {
            ipcRenderer.invoke('notification-close', notificationId);
        }
    }
});
