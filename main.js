const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 750,
        frame: false, // Removes window edges and title bar
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webPreferences: {
                contextIsolation: true,    // Prevent direct access to Electron APIs
                nodeIntegration: false,    // Prevent using Node.js in renderer
            }
        }
    })

    mainWindow.loadFile(path.join(__dirname, 'react/dist/index.html'));
}

app.whenReady().then(() => {
    createWindow()
})

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});