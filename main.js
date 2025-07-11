const { app, BrowserWindow, Tray, Menu, screen, ipcMain } = require('electron/main')
const path = require('node:path')

let mainWindow;
let notification;
let tray;

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

    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });
}

const startNotification = () => {
    notification = new BrowserWindow({
        width: 300,
        height: 80,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        webPreferences: {
            preload: path.join(__dirname, 'notificationPreload.js'),
            webPreferences: {
                contextIsolation: true,    // Prevent direct access to Electron APIs
                nodeIntegration: false,    // Prevent using Node.js in renderer
            }
        }
    });

    notification.loadFile(path.join(__dirname, 'notification/dist/index.html'));
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    notification.setBounds({
        x: width - 310, // 300 width + 10px margin
        y: height - 90, // 80 height + 10px margin
        width: 300,
        height: 80
    });
}

app.whenReady().then(() => {
    createWindow();
    startNotification();

    tray = new Tray(path.join(__dirname, 'icon.png')); // icon path
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            click: () => {
                mainWindow.show();
            },
        },
        {
            label: 'Quit',
            click: () => {
                tray.destroy();
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Worthier');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });
})

app.on('window-all-closed', () => {
    // Do nothing — prevent quitting the app
});

ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});