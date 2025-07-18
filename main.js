const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
} = require("electron/main");
const path = require("node:path");

let mainWindow;
let tray;
let isQuitting = false;

function createNotification() {
  // Create a notification
  let notification = new Notification({
    title: "Worthier",
    body: "Ready to Work? Click to start!",
  });

  // Listen for button click
  notification.on("click", () => {
    console.log("Notification clicked");
  });

  // Listen for close
  notification.on("close", () => {
    console.log("Notification closed");
  });

  notification.show();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    frame: false, // Removes window edges and title bar
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webPreferences: {
        contextIsolation: true, // Prevent direct access to Electron APIs
        nodeIntegration: false, // Prevent using Node.js in renderer
      },
    },
  });

  mainWindow.loadFile(path.join(__dirname, "react/dist/index.html"));

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Hide the window instead of closing it
    }
  });
};

app.whenReady().then(() => {
  app.setAppUserModelId("com.worthier.app");
  app.setAsDefaultProtocolClient("worthier");

  createWindow();
  createNotification();

  tray = new Tray(path.join(__dirname, "icon.png")); // icon path
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: "Quit",
      click: () => {
        tray.destroy();
        // Destroy all windows
        BrowserWindow.getAllWindows().forEach((win) => win.destroy());
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Worthier");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("close-window", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on("custom-message", (event, arg) => {
  switch (arg) {
    case "start":

    default:
      console.log(`Unknown message: ${arg}`);
  }
});
