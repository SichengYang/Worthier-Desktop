const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
} = require("electron/main");
const path = require("node:path");
const { fork } = require("child_process");

let mainWindow;
let tray;
let isQuitting = false;
let working_time = 1; // Default working time in seconds
let working = false;
let timerProcess;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Another instance is already running.");
  app.quit(); // A second instance was launched — quit this one
} else {
  app.on("second-instance", () => {
    // A second instance was launched — focus the main window
    console.log("Second instance detected, focusing main window.");
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
  });
}

function createNotification() {
  // Create a notification
  let notification = new Notification({
    title: "Worthier",
    body: "Ready to Work? Click to start!",
  });

  // Listen for button click
  notification.on("click", () => {
    startTimerProcess(working_time);
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
    show: false, // Don't show the window on creation
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

function createMenu() {
  return Menu.buildFromTemplate([
    {
      label: working ? "Take a Break" : "Start Working",
      click: () => {
        if (!working) {
          startTimerProcess(working_time); // Start timer

          working = true;
          tray.setContextMenu(createMenu());
        } else {
          mainWindow.webContents.send("break");
          timerProcess.send("cancel");

          working = false; // Reset working state
          tray.setContextMenu(createMenu());
        }
      },
    },
    {
      label: "Open",
      click: () => {
        mainWindow.show();
        if (process.platform === "darwin") {
          app.dock.show();
        }
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
}

function startTimerProcess(minutes = working_time) {
  console.log("Starting timer process...");
  timerProcess = fork(path.join(__dirname, "timer.js"), [minutes.toString()]);

  mainWindow.webContents.send("start");

  //change menu content
  working = true; // Set working state
  tray.setContextMenu(createMenu());

  timerProcess.on("message", (msg) => {
    if (msg.type === "break-time") {
      const notification = new Notification({
        title: "Break Time!",
        body: `You've been working for ${minutes} minutes. Time to take a break.`,
      });

      // Listen for break notification click
      notification.on("click", () => {
        console.log("Break notification clicked");
        mainWindow.webContents.send("break");
        working = false; // Reset working state
        tray.setContextMenu(createMenu());
      });

      notification.show();
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.worthier.app");
  app.setAsDefaultProtocolClient("worthier");

  createWindow();
  createNotification();

  tray = new Tray(path.join(__dirname, "iconTemplate.png")); // icon path
  tray.setToolTip("Worthier App");

  tray.setToolTip("Worthier");
  tray.setContextMenu(createMenu());

  tray.on("click", () => {
    if (process.platform != "darwin") {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (process.platform === "darwin") {
    app.dock.hide();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    app.dock.hide();
  }
});

ipcMain.on("close-window", () => {
  if (mainWindow) {
    mainWindow.hide();
    if (process.platform === "darwin") {
      app.dock.hide();
    }
  }
});

ipcMain.on("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("custom-message", (event, arg) => {
  switch (arg) {
    case "start":

    default:
      console.log(`Unknown message: ${arg}`);
  }
});

// Listen for login-microsoft event
ipcMain.on('login-microsoft', (event) => {
  const { startMicrosoftLogin } = require('./microsoftLogin');
  startMicrosoftLogin(mainWindow);
});