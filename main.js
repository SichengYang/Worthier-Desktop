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
const AutoLogin = require('./autologin');
const { saveTheme, loadTheme, sendThemeToRenderer } = require('./theme');
const NotificationManager = require('./notificationManager');
const SettingsManager = require('./settingsManager');

let mainWindow;
let tray;
let isQuitting = false;
let working_time = 25; // Default working time in minutes (will be loaded from settings)
let working = false;
let timerProcess;
let autoLogin;
let notificationManager;
let settingsManager;

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
}

async function createNotification() {
  // Startup notification - don't check advanced permissions that might trigger browser access
  // Only show basic notification without checking fullscreen or meeting detection
  
  // Create a notification to indicate the timer app is ready
  let notification = new Notification({
    title: "Worthier Timer Ready",
    body: "Your productivity timer is running. Click to start working!",
  });

  // Listen for button click
  notification.on("click", () => {
    startTimerProcess(working_time);
  });

  // Listen for close
  notification.on("close", () => {
    console.log("Startup notification closed");
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
    icon: path.join(__dirname, "icon.png"), // Path to your app icon
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webPreferences: {
        contextIsolation: true, // Prevent direct access to Electron APIs
        nodeIntegration: false, // Prevent using Node.js in renderer
      },
    },
  });

  // Initialize autoLogin with the created mainWindow
  autoLogin = new AutoLogin(mainWindow);

  mainWindow.loadFile(path.join(__dirname, "react/dist/index.html"));

  // Check for auto-login after window loads
  mainWindow.webContents.once('did-finish-load', async () => {
    await autoLogin.checkAutoLogin();
    // Send the current theme to the renderer when it's ready
    sendThemeToRenderer(mainWindow);
  });

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
      // Check if notification should be shown before creating break notification
      notificationManager.shouldShowNotification().then(shouldShow => {
        if (shouldShow) {
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
        } else {
          console.log("Break notification blocked by settings");
          // Still send break signal to UI even if notification is blocked
          mainWindow.webContents.send("break");
          working = false;
          tray.setContextMenu(createMenu());
        }
      });
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.worthier.app");
  app.setAsDefaultProtocolClient("Worthier");

  // Initialize managers
  settingsManager = new SettingsManager();
  notificationManager = new NotificationManager();
  
  // Load timer settings
  const settings = settingsManager.loadSettings();
  working_time = settingsManager.getFocusTimeInMinutes(settings);

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

// Listen for login events
ipcMain.on('login-microsoft', (event) => {
  const { startLogin } = require('./login');
  const windowUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
  'client_id=a0772969-add5-4e73-80fe-a4015a43c0e8' +
  '&response_type=code' +
  '&redirect_uri=https://login.worthier.app/microsoft' +
  '&scope=openid%20profile%20email' +
  '&response_mode=form_post';
  const callbackUrl = 'https://login.worthier.app/microsoft';
  startLogin(mainWindow, windowUrl, callbackUrl);
});

ipcMain.on('login-google', (event) => {
  const { startLogin } = require('./login');
  const windowUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=899665986783-tf93v1oi9tt140vrt0ib1lbplra4lka8.apps.googleusercontent.com' +
    '&response_type=code' +
    '&redirect_uri=https://login.worthier.app/google' +
    '&scope=openid%20profile%20email' +
    '&response_mode=form_post';
  const callbackUrl = 'https://login.worthier.app/google';
  startLogin(mainWindow, windowUrl, callbackUrl);
});

ipcMain.on('login-apple', (event) => {
  const { startLogin } = require('./login');
  const windowUrl = 'https://appleid.apple.com/auth/authorize' +
  '?client_id=com.worthier.worthier' +
  '&response_type=code' +
  '&redirect_uri=https://login.worthier.app/apple' +
  '&scope=name%20email' +
  '&response_mode=form_post';
  const callbackUrl = 'https://login.worthier.app/apple';

  startLogin(mainWindow, windowUrl, callbackUrl);
});

// Handle logout
ipcMain.on('logout', (event) => {
  autoLogin.handleLogout();
});

// Get current user information
ipcMain.handle('get-current-user', async (event) => {
  try {
    console.log('📋 Main process: getCurrentUser called');
    const userInfo = await autoLogin.getUserInfo();
    if (userInfo) {
      console.log('✅ Main process: User info retrieved for:', userInfo.username || userInfo.email);
    } else {
      console.log('❌ Main process: No user info found');
    }
    return userInfo;
  } catch (error) {
    console.error('❌ Main process: Error getting current user:', error);
    return null;
  }
});

// Get login statistics (optional, for debugging)
ipcMain.on('get-login-stats', async (event) => {
  const stats = await autoLogin.getLoginStats();
  mainWindow.webContents.send('login-stats', stats);
});

ipcMain.on('set-theme', (event, theme) => {
  if (['light', 'dark', 'pink'].includes(theme)) {
    saveTheme(theme);
    // Send the updated theme to all renderer processes
    mainWindow.webContents.send('theme-changed', theme);
    console.log(`Theme changed to: ${theme}`);
  }
});

// Notification settings handlers
ipcMain.handle('get-notification-settings', async (event) => {
  const settings = notificationManager.getSettings();
  const permissionStatus = notificationManager.getPermissionStatus();
  return { ...settings, permissionStatus };
});

// Check what permissions will be needed before updating settings
ipcMain.handle('check-required-permissions', async (event, settings) => {
  return notificationManager.willRequirePermissions(settings);
});

// New handler for immediate permission requests
ipcMain.handle('request-permissions-immediately', async (event, settings) => {
  try {
    console.log('Requesting permissions immediately for settings:', settings);
    const results = await notificationManager.requestPermissionsImmediately(settings);
    console.log('Permission results:', results);
    return results;
  } catch (error) {
    console.error('Error requesting permissions immediately:', error);
    throw error;
  }
});

ipcMain.on('update-notification-settings', async (event, settings) => {
  try {
    // Check if permissions will be required when notifications appear
    const requiredPermissions = notificationManager.willRequirePermissions(settings);
    
    if (requiredPermissions) {
      console.log('New permissions will be requested when first notification appears for:', requiredPermissions);
      // Send info to user about when permissions will be requested
      mainWindow.webContents.send('permission-request-info', {
        permissions: requiredPermissions,
        message: 'Permissions will be requested when the first notification appears (not now)'
      });
    }
    
    // Update settings and reset permission states as needed
    const permissionResults = await notificationManager.requestPermissionsIfNeeded(settings);
    
    // Update settings
    const updatedSettings = notificationManager.updateSettings(settings);
    console.log('Notification settings updated:', updatedSettings);
    
    // Send confirmation back to renderer
    mainWindow.webContents.send('notification-settings-updated', {
      settings: updatedSettings,
      permissions: permissionResults
    });
    
  } catch (error) {
    console.error('Error updating notification settings:', error);
    mainWindow.webContents.send('notification-settings-error', error.message);
  }
});

// Check if settings file exists (for first-time user detection)
ipcMain.handle('check-settings-exist', async (event) => {
  const fs = require('fs');
  const settingsPath = settingsManager.settingsPath;
  return fs.existsSync(settingsPath);
});

// Timer settings handlers
ipcMain.handle('get-timer-settings', async (event) => {
  const settings = settingsManager.loadSettings();
  return {
    focusTime: settings.focusTime,
    focusUnit: settings.focusUnit,
    restTime: settings.restTime,
    restUnit: settings.restUnit
  };
});

ipcMain.handle('update-timer-settings', async (event, timerSettings) => {
  const currentSettings = settingsManager.loadSettings();
  const updatedSettings = settingsManager.saveSettings({ 
    ...currentSettings, 
    ...timerSettings 
  });
  
  // Update working_time for immediate use
  working_time = settingsManager.getFocusTimeInMinutes(updatedSettings);
  
  console.log('Timer settings updated:', timerSettings);
  console.log('New working time (minutes):', working_time);
  
  // Send confirmation back to renderer
  mainWindow.webContents.send('timer-settings-updated', {
    focusTime: updatedSettings.focusTime,
    focusUnit: updatedSettings.focusUnit,
    restTime: updatedSettings.restTime,
    restUnit: updatedSettings.restUnit
  });
  
  // Return the updated settings to confirm successful save
  return {
    focusTime: updatedSettings.focusTime,
    focusUnit: updatedSettings.focusUnit,
    restTime: updatedSettings.restTime,
    restUnit: updatedSettings.restUnit
  };
});