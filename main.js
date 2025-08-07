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
const NotificationWindow = require('./notificationWindow');
const SettingsManager = require('./settingsManager');
const TrayWindow = require('./trayWindow');

let mainWindow;
let tray;
let isQuitting = false;
let working_time = 25; // Default working time in minutes (will be loaded from settings)
let working = false;
let timerProcess;
let autoLogin;
let notificationManager;
let notificationWindow;
let settingsManager;
let trayWindow;

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

async function createStartUpNotification() {
  // Startup notification using React notification window
  try {
    await notificationWindow.showStartupNotification(
      () => {
        console.log("Starting timer from startup notification...");
        startTimerProcess(working_time);
      },
      () => {
        console.log("User chose to start timer later...");
      }
    );
  } catch (error) {
    console.error('Error showing startup notification window:', error);
    
    // Fallback to native notification if React notification fails
    let notification = new Notification({
      title: "Worthier Timer Ready",
      body: "Your productivity timer is running. Click to start working!",
    });

    notification.on("click", () => {
      startTimerProcess(working_time);
    });

    notification.on("close", () => {
      console.log("Startup notification closed");
    });

    notification.show();
  }
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
          // Update context menu for non-macOS platforms
          if (process.platform !== "darwin") {
            tray.setContextMenu(createMenu());
          }
        } else {
          mainWindow.webContents.send("break");
          timerProcess.send("cancel");

          working = false; // Reset working state
          // Update context menu for non-macOS platforms
          if (process.platform !== "darwin") {
            tray.setContextMenu(createMenu());
          }
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
  
  // Notify all windows about working state change
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('working-state-changed', working);
    }
  });

  timerProcess.on("message", (msg) => {
    if (msg.type === "break-time") {
      // Check if notification should be shown before creating break notification
      notificationManager.shouldShowNotification().then(async shouldShow => {
        if (shouldShow) {
          try {
            await notificationWindow.showTimerComplete(
              () => {
                console.log("Starting break from notification...");
                mainWindow.webContents.send("break");
                working = false;
                // Notify all windows about working state change
                BrowserWindow.getAllWindows().forEach((win) => {
                  if (!win.isDestroyed()) {
                    win.webContents.send('working-state-changed', working);
                  }
                });
              },
              () => {
                console.log("Continuing work from notification...");
                // Start another timer session
                startTimerProcess(working_time);
              }
            );
          } catch (error) {
            console.error('Error showing break notification window:', error);
            
            // Fallback to native notification
            const notification = new Notification({
              title: "Break Time!",
              body: `You've been working for ${minutes} minutes. Time to take a break.`,
            });

            notification.on("click", () => {
              console.log("Break notification clicked");
              mainWindow.webContents.send("break");
              working = false;
              // Notify all windows about working state change
              BrowserWindow.getAllWindows().forEach((win) => {
                if (!win.isDestroyed()) {
                  win.webContents.send('working-state-changed', working);
                }
              });
            });

            notification.show();
          }
        } else {
          console.log("Break notification blocked by settings");
          // Still send break signal to UI even if notification is blocked
          mainWindow.webContents.send("break");
          working = false;
          // Notify all windows about working state change
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('working-state-changed', working);
            }
          });
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
  notificationWindow = new NotificationWindow();
  trayWindow = new TrayWindow();
  
  // Load timer settings
  const settings = settingsManager.loadSettings();
  working_time = settingsManager.getFocusTimeInMinutes(settings);

  createWindow();
  createStartUpNotification();

  tray = new Tray(path.join(__dirname, "iconTemplate.png")); // icon path
  tray.setToolTip("Worthier App");

  tray.setToolTip("Worthier");
  
  // Set the tray reference in trayWindow for proper positioning
  trayWindow.setTray(tray);
  
  // Set initial context menu for non-macOS platforms
  if (process.platform !== "darwin") {
    tray.setContextMenu(createMenu());
  }

  tray.on("click", () => {
    if (process.platform === "darwin") {
      // On macOS, show React tray menu
      trayWindow.toggle();
    } else {
      // On other platforms, show main window
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // On macOS, also show React menu on right-click
  // On other platforms, show context menu as fallback
  tray.on("right-click", () => {
    if (process.platform === "darwin") {
      trayWindow.toggle();
    } else {
      tray.popUpContextMenu(createMenu());
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

// React NotificationWindow IPC handlers
ipcMain.handle('show-react-notification', async (event, options) => {
  try {
    const notificationId = await notificationWindow.create(options);
    return notificationId;
  } catch (error) {
    console.error('Error creating React notification window:', error);
    throw error;
  }
});

ipcMain.handle('show-timer-complete-notification', async (event, onStartBreak, onContinueWorking) => {
  try {
    return await notificationWindow.showTimerComplete(onStartBreak, onContinueWorking);
  } catch (error) {
    console.error('Error showing timer complete notification:', error);
    throw error;
  }
});

ipcMain.handle('show-startup-notification', async (event, onStartTimer, onLater) => {
  try {
    return await notificationWindow.showStartupNotification(onStartTimer, onLater);
  } catch (error) {
    console.error('Error showing startup notification:', error);
    throw error;
  }
});

ipcMain.handle('show-settings-confirmation', async (event, message, onConfirm, onCancel) => {
  try {
    return await notificationWindow.showSettingsConfirmation(message, onConfirm, onCancel);
  } catch (error) {
    console.error('Error showing settings confirmation:', error);
    throw error;
  }
});

ipcMain.handle('show-permission-request', async (event, permissionType, onGrant, onDeny) => {
  try {
    return await notificationWindow.showPermissionRequest(permissionType, onGrant, onDeny);
  } catch (error) {
    console.error('Error showing permission request:', error);
    throw error;
  }
});

ipcMain.handle('show-error-notification', async (event, title, message, onOk) => {
  try {
    return await notificationWindow.showError(title, message, onOk);
  } catch (error) {
    console.error('Error showing error notification:', error);
    throw error;
  }
});

ipcMain.handle('show-success-notification', async (event, title, message, onOk) => {
  try {
    return await notificationWindow.showSuccess(title, message, onOk);
  } catch (error) {
    console.error('Error showing success notification:', error);
    throw error;
  }
});

ipcMain.handle('show-info-notification', async (event, title, message, buttonText, onButtonClick) => {
  try {
    return await notificationWindow.showInfo(title, message, buttonText, onButtonClick);
  } catch (error) {
    console.error('Error showing info notification:', error);
    throw error;
  }
});

ipcMain.handle('close-notification', async (event, notificationId) => {
  try {
    notificationWindow.closeNotification(notificationId);
    return true;
  } catch (error) {
    console.error('Error closing notification:', error);
    throw error;
  }
});

ipcMain.handle('close-all-notifications', async (event) => {
  try {
    notificationWindow.closeAll();
    return true;
  } catch (error) {
    console.error('Error closing all notifications:', error);
    throw error;
  }
});

ipcMain.handle('get-notification-count', async (event) => {
  try {
    return notificationWindow.getActiveCount();
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
});

// Tray menu IPC handlers
ipcMain.handle('get-working-state', async (event) => {
  return working;
});

ipcMain.on('tray-start-working', (event) => {
  if (!working) {
    // Reuse the existing timer logic - same as startup notification and current tray menu
    startTimerProcess(working_time);
    trayWindow.hide();
  }
});

ipcMain.on('tray-take-break', (event) => {
  if (working) {
    // Reuse the existing break logic - same as current tray menu
    mainWindow.webContents.send("break");
    if (timerProcess) {
      timerProcess.send("cancel");
    }
    working = false;
    // Notify all windows about working state change
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('working-state-changed', working);
      }
    });
    trayWindow.hide();
  }
});

ipcMain.on('tray-open-main', (event) => {
  mainWindow.show();
  if (process.platform === "darwin") {
    app.dock.show();
  }
  trayWindow.hide();
});

ipcMain.on('tray-quit-app', (event) => {
  tray.destroy();
  BrowserWindow.getAllWindows().forEach((win) => win.destroy());
  app.quit();
});