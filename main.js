const {
  app,
  BrowserWindow,
  Tray,
  nativeTheme
} = require("electron");
const fs = require('fs');
const path = require("node:path");

const getAutoLogin = require('./autologin');
const NotificationHandlers = require('./notificationHandlers');
const SettingsManager = require('./settingsManager');
const StartAtLoginManager = require('./startAtLogin');
const TrayWindow = require('./trayWindow');
const RestWindow = require('./restWindow');
const { setupIpcHandlers } = require('./ipcHandlers');
const SingleInstanceManager = require('./singleInstance');
const getTimeRecorder = require('./recordTime');
const uploadWorkLog = require('./uploadWorkingLog');
const getDeviceList = require('./getDeviceList');

let timeRecorder;
let mainWindow;
let tray;
let autoLogin;
let notificationHandlers;
let settingsManager;
let startAtLoginManager;
let trayWindow;
let restWindow;
let singleInstanceManager;

let isQuitting = false;
let workingTime = 30; // Default working time in minutes (will be loaded from settings)
let extendedWorkingTime = 10; // Default extended working time in minutes
let working = false; // Keep this for other resources that need access to working state

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    frame: false, // Removes window edges and title bar
    useContentSize: true,
    show: false, // Don't show the window on creation
    icon: path.join(__dirname, "icon.png"), // Path to your app icon
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webPreferences: {
        contextIsolation: true, // Prevent direct access to Electron APIs
        nodeIntegration: false, // Prevent using Node.js in renderer
      },
    },
  });

  mainWindow.loadFile(path.join(__dirname, "react/dist/index.html"));

  // Check for auto-login and theme settings after window loads
  mainWindow.webContents.once('did-finish-load', async () => {
    await autoLogin.checkAutoLogin();
    uploadWorkLog();
    settingsManager.sendThemeToRenderer(mainWindow);
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Hide the window instead of closing it
    }
  });
};

app.whenReady().then(async () => {
  app.setAppUserModelId("com.worthier.app");
  app.setAsDefaultProtocolClient("Worthier");
  app.dock.hide();

  createWindow();
  singleInstanceManager = new SingleInstanceManager();
  const shouldContinue = singleInstanceManager.initialize(mainWindow);
  if (!shouldContinue) {
    return; // Another instance is running, this one will quit
  }

  // Initialize settings
  settingsManager = new SettingsManager();
  const settings = settingsManager.loadSettings();
  workingTime = settingsManager.getFocusTimeInMinutes(settings);
  extendedWorkingTime = settingsManager.getExtendedFocusTimeInMinutes(settings);

  // Initialize start at login manager and sync settings
  startAtLoginManager = new StartAtLoginManager(settingsManager);
  await startAtLoginManager.initialize();

  // Set up system theme change listener
  nativeTheme.on('updated', () => {
    const currentThemeSettings = settingsManager.getThemeSettings();
    if (currentThemeSettings.theme === 'system') {
      const resolvedTheme = settingsManager.loadTheme();
      console.log('System theme changed, resolved theme:', resolvedTheme);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('theme-changed', resolvedTheme);
      }
      // Also send to tray window if it exists
      if (trayWindow && trayWindow.window && !trayWindow.window.isDestroyed()) {
        trayWindow.window.webContents.send('theme-changed', resolvedTheme);
      }
    }
  });

  trayWindow = new TrayWindow(null, settingsManager);
  restWindow = new RestWindow(settingsManager);
  timeRecorder = getTimeRecorder(); // Remove mainWindow parameter, let TimeRecorder use app.getPath('userData')

  // create instances that requires mainWindow
  autoLogin = getAutoLogin(mainWindow);
  notificationHandlers = new NotificationHandlers({
    mainWindow,
    restWindow,
    timeRecorder,
    workingTime,
    extendedWorkingTime,
    setWorkingState: (newWorkingState) => {
      working = newWorkingState;
    }
  });

  const settingsPath = path.join(process.env.HOME, 'Library', 'Application Support', 'worthier-desktop', 'app-settings.json');
  
  // Check if app was opened at login
  const wasOpenedAtLogin = startAtLoginManager.wasOpenedAtLogin();
  console.log('App was opened at login:', wasOpenedAtLogin);
  
  if (!fs.existsSync(settingsPath)) {
    // No settings file - show main window (UserGuide will appear)
    // But only if not opened at login (when opened at login, stay hidden)
    if (!wasOpenedAtLogin) {
      mainWindow.show();
    }
  } else {
    // Settings file exists - setup is complete, create startup notification
    notificationHandlers.createStartUpNotification(); // Fire and forget - app can continue initializing while notification shows
  }

  tray = new Tray(path.join(__dirname, "iconTemplate.png")); // icon path
  tray.setToolTip("Worthier App");
  trayWindow.setTray(tray);

  tray.on("click", () => {
    trayWindow.toggle();
  });

  tray.on("right-click", () => {
    trayWindow.toggle();
  });

  // Setup all IPC handlers
  setupIpcHandlers({
    mainWindow,
    autoLogin,
    timeRecorder,
    settingsManager,
    startAtLoginManager,
    notificationManager: notificationHandlers.getNotificationManager(),
    notificationWindow: notificationHandlers.getNotificationWindow(),
    notificationHandlers,
    restWindow,
    trayWindow,
    tray,
    getWorking,
    getWorkingTime,
    getExtendedWorkingTime,
    updateTimerSettings,
    startTimerProcess: (minutes) => notificationHandlers.startTimerProcess(minutes),
    cancelTimerProcess: () => notificationHandlers.cancelTimerProcess(),
    getDeviceList
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  
  // Cancel any running timer process when quitting the app
  if (notificationHandlers) {
    console.log('App is quitting - canceling any running timer process...');
    notificationHandlers.cancelTimerProcess().catch(error => {
      console.error('Error canceling timer process during quit:', error);
    });
  }
});

app.on("window-all-closed", async () => {
  if (process.platform === "darwin") {
    app.dock.hide();
  }
});

// Helper functions to access mutable variables
function getWorking() {
  return working;
}

function getWorkingTime() {
  return workingTime;
}

function getExtendedWorkingTime() {
  return extendedWorkingTime;
}

function updateTimerSettings(updatedSettings) {
  workingTime = settingsManager.getFocusTimeInMinutes(updatedSettings);
  extendedWorkingTime = settingsManager.getExtendedFocusTimeInMinutes(updatedSettings);
  console.log('New working time (minutes):', workingTime);
  console.log('New extended working time (minutes):', extendedWorkingTime);

  // Update notification handlers with new timer settings
  if (notificationHandlers) {
    notificationHandlers.updateTimerSettings(workingTime, extendedWorkingTime);
  }
}