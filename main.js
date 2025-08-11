const {
  app,
  BrowserWindow,
  Tray,
  Notification,
  ipcMain,
} = require("electron/main");
const path = require("node:path");
const { fork } = require("child_process");
const AutoLogin = require('./autologin');
const NotificationManager = require('./notificationManager');
const NotificationWindow = require('./notificationWindow');
const SettingsManager = require('./settingsManager');
const TrayWindow = require('./trayWindow');
const RestWindow = require('./restWindow');

let timeRecorder;
let mainWindow;
let tray;
let isQuitting = false;
let working_time = 30; // Default working time in minutes (will be loaded from settings)
let extendedWorkingTime = 10; // Default extended working time in minutes
let working = false;
let timerProcess;
let autoLogin;
let notificationManager;
let notificationWindow;
let settingsManager;
let trayWindow;
let restWindow;

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
    settingsManager.sendThemeToRenderer(mainWindow);

    mainWindow.webContents.send('recent-records', timeRecorder.getRecentRecords(7));
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Hide the window instead of closing it
    }
  });
};

function cancelTimerProcess() {
  if (timerProcess) {
    console.log("Canceling timer process...");
    try {
      timerProcess.send("cancel");
    } catch (error) {
      console.error("Error sending cancel to timer process:", error);
      // If sending cancel fails, just kill the process
      timerProcess.kill();
    }
    timerProcess = null;
    working = false;
  }
}

function userNotResponding() {
  if (timerProcess) {
    console.log("Handler for user not responding to break notification...");
    try {
      timerProcess.send("no-response");
    } catch (error) {
      console.error("Error sending no-response to timer process:", error);
      // If sending no-response fails, just kill the process
      timerProcess.kill();
    }
    timerProcess = null;
    working = false;
  }
}

function startTimerProcess(minutes = working_time) {
  console.log("Starting timer process...");

  // Clean up any existing timer process first
  cancelTimerProcess();

  // Hide the rest window if it's showing (user is finishing break)
  if (restWindow) {
    console.log("Hiding break window - starting work...");
    restWindow.close();
    
    // Reset always on top setting
    if (restWindow.window) {
      restWindow.window.setAlwaysOnTop(false);
    }
  }

  // Pass the userData path to the timer process
  const userDataPath = app.getPath('userData');
  timerProcess = fork(path.join(__dirname, "timer.js"), [minutes.toString(), userDataPath]);

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
      // Periodically check if notification should be shown
      const notificationCheckInterval = setInterval(async () => {
        const shouldShow = await notificationManager.shouldShowNotification();
        if (shouldShow) {
          clearInterval(notificationCheckInterval); // Stop further checks

          try {
            console.log("Showing timer complete notification with extended time:", extendedWorkingTime, " minutes");
            notificationWindow.showTimerComplete(
              () => {
                console.log("Taking break from notification...");

                // Cancel the timer process
                cancelTimerProcess();

                mainWindow.webContents.send("break");
                
                // Show the break/rest window and keep it visible until break is finished
                if (restWindow) {
                  console.log("Showing break window...");
                  restWindow.show();
                  
                  // Make sure the window stays on top during break
                  if (restWindow.window) {
                    restWindow.window.setAlwaysOnTop(true);
                    restWindow.window.focus();
                  }
                }
                
                // Notify all windows about working state change
                BrowserWindow.getAllWindows().forEach((win) => {
                  if (!win.isDestroyed()) {
                    win.webContents.send('working-state-changed', working);
                  }
                });
              },
              () => {
                let extendCount = timeRecorder.addExtendedSession(); // Record extended session
                console.log("Extending work session with current count:", extendCount);

                // Start another timer session
                startTimerProcess(extendedWorkingTime);
              },
              extendedWorkingTime,
              () => {
                // onClose handler - assume user went to rest if they don't respond
                console.log("Timer complete notification auto-closed - assuming user went to rest");

                // Cancel the timer process
                userNotResponding();

                mainWindow.webContents.send("break");
                
                // Show the break/rest window and keep it visible until break is finished
                if (restWindow) {
                  console.log("Showing break window (auto-close scenario)...");
                  restWindow.show();
                  
                  // Make sure the window stays on top during break
                  if (restWindow.window) {
                    restWindow.window.setAlwaysOnTop(true);
                    restWindow.window.focus();
                  }
                }
                
                // Notify all windows about working state change
                BrowserWindow.getAllWindows().forEach((win) => {
                  if (!win.isDestroyed()) {
                    win.webContents.send('working-state-changed', working);
                  }
                });
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

              // Cancel the timer process
              cancelTimerProcess();

              mainWindow.webContents.send("break");
              
              // Show the break/rest window and keep it visible until break is finished
              if (restWindow) {
                console.log("Showing break window (fallback notification)...");
                restWindow.show();
                
                // Make sure the window stays on top during break
                if (restWindow.window) {
                  restWindow.window.setAlwaysOnTop(true);
                  restWindow.window.focus();
                }
              }
              
              // Notify all windows about working state change
              BrowserWindow.getAllWindows().forEach((win) => {
                if (!win.isDestroyed()) {
                  win.webContents.send('working-state-changed', working);
                }
              });
            });

            notification.show();
          }
        }
        else {
          console.log("No notification shown, user is focusing on tasks.");
        }
      }, 5000); // Check every 5 seconds
    }
  });

  // Clean up timerProcess reference when it exits
  timerProcess.on('exit', (code, signal) => {
    console.log(`Timer process exited with code ${code} and signal ${signal}`);
    timerProcess = null;
    working = false; // Update working state when timer process exits

    // Notify all windows about working state change
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('working-state-changed', working);
      }
    });
  });

  // Handle timer process errors
  timerProcess.on('error', (error) => {
    console.error('Timer process error:', error);
    timerProcess = null;
    working = false; // Update working state when timer process has an error

    // Notify all windows about working state change
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('working-state-changed', working);
      }
    });
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
  restWindow = new RestWindow(settingsManager);

  const getTimeRecorder = require('./recordTime');
  timeRecorder = getTimeRecorder();

  // Load timer settings
  const settings = settingsManager.loadSettings();
  working_time = settingsManager.getFocusTimeInMinutes(settings);
  extendedWorkingTime = settingsManager.getExtendedFocusTimeInMinutes(settings);
  console.log(`Loaded working time: ${working_time} minutes`);
  console.log(`Loaded extended working time: ${extendedWorkingTime} minutes`);

  createWindow();
  createStartUpNotification();

  tray = new Tray(path.join(__dirname, "iconTemplate.png")); // icon path
  tray.setToolTip("Worthier App");

  // Set the tray reference in trayWindow for proper positioning
  trayWindow.setTray(tray);

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
  if (['light', 'dark', 'pink', 'system'].includes(theme)) {
    settingsManager.saveTheme(theme);
    // Send the updated theme to all renderer processes
    mainWindow.webContents.send('theme-changed', theme);
    console.log(`Theme changed to: ${theme}`);
  }
});

// Get current theme settings
ipcMain.handle('get-theme-settings', async (event) => {
  return settingsManager.getThemeSettings();
});

// Start at login settings handlers
ipcMain.handle('get-start-at-login', async (event) => {
  return {
    enabled: settingsManager.getStartAtLogin(),
    systemStatus: settingsManager.getSystemLoginItemStatus()
  };
});

ipcMain.handle('set-start-at-login', async (event, enable) => {
  try {
    const updatedSettings = settingsManager.setStartAtLogin(enable);
    console.log(`Start at login ${enable ? 'enabled' : 'disabled'}`);
    return {
      success: true,
      enabled: updatedSettings.startAtLogin,
      systemStatus: settingsManager.getSystemLoginItemStatus()
    };
  } catch (error) {
    console.error('Error setting start at login:', error);
    return {
      success: false,
      error: error.message,
      enabled: settingsManager.getStartAtLogin()
    };
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
    extendedFocusTime: settings.extendedFocusTime,
    extendedFocusUnit: settings.extendedFocusUnit,
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

  // Update working_time and extendedWorkingTime for immediate use
  working_time = settingsManager.getFocusTimeInMinutes(updatedSettings);
  extendedWorkingTime = settingsManager.getExtendedFocusTimeInMinutes(updatedSettings);

  console.log('Timer settings updated:', timerSettings);
  console.log('New working time (minutes):', working_time);
  console.log('New extended working time (minutes):', extendedWorkingTime);

  // Send confirmation back to renderer
  mainWindow.webContents.send('timer-settings-updated', {
    focusTime: updatedSettings.focusTime,
    focusUnit: updatedSettings.focusUnit,
    extendedFocusTime: updatedSettings.extendedFocusTime,
    extendedFocusUnit: updatedSettings.extendedFocusUnit,
    restTime: updatedSettings.restTime,
    restUnit: updatedSettings.restUnit
  });

  // Return the updated settings to confirm successful save
  return {
    focusTime: updatedSettings.focusTime,
    focusUnit: updatedSettings.focusUnit,
    extendedFocusTime: updatedSettings.extendedFocusTime,
    extendedFocusUnit: updatedSettings.extendedFocusUnit,
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
    return await notificationWindow.showTimerComplete(onStartBreak, onContinueWorking, extendedWorkingTime);
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

// Rest window IPC handlers
ipcMain.handle('show-rest-window', async (event) => {
  try {
    if (restWindow) {
      restWindow.show();
    }
  } catch (error) {
    console.error('Error showing rest window:', error);
    throw error;
  }
});

ipcMain.handle('close-rest-window', async (event) => {
  try {
    if (restWindow) {
      restWindow.close();
    }
  } catch (error) {
    console.error('Error closing rest window:', error);
    throw error;
  }
});

ipcMain.handle('minimize-rest-window', async (event) => {
  try {
    if (restWindow && restWindow.window) {
      restWindow.window.minimize();
    }
  } catch (error) {
    console.error('Error minimizing rest window:', error);
    throw error;
  }
});

ipcMain.handle('toggle-rest-window', async (event) => {
  try {
    if (restWindow) {
      restWindow.toggle();
    }
  } catch (error) {
    console.error('Error toggling rest window:', error);
    throw error;
  }
});

ipcMain.handle('start-work', async (event) => {
  try {
    // Hide the rest window
    if (restWindow) {
      restWindow.hide();
    }
    
    // Start a new work session
    startTimerProcess();
    
    console.log('Starting new work session from rest window');
  } catch (error) {
    console.error('Error starting work session:', error);
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

// Handle start work from rest window
ipcMain.on('start-work-from-rest', (event) => {
  console.log('Starting work immediately from rest window...');
  
  // Start a new work session regardless of current state
  startTimerProcess(working_time);
  
  // The rest window will be automatically closed by the restPreload.js
});

ipcMain.on('tray-take-break', (event) => {
  if (working) {
    // Reuse the existing break logic - same as current tray menu
    mainWindow.webContents.send("break");

    // Cancel the timer process
    cancelTimerProcess();

    // Show the break/rest window and keep it visible until break is finished
    if (restWindow) {
      console.log("Showing break window (tray action)...");
      restWindow.show();
      
      // Make sure the window stays on top during break
      if (restWindow.window) {
        restWindow.window.setAlwaysOnTop(true);
        restWindow.window.focus();
      }
    }

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
  mainWindow.focus(); // Ensure the main window gains focus
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

// Test handler for debugging notification
ipcMain.on('test-timer-complete-notification', async (event) => {
  console.log('Testing timer complete notification...');
  try {
    await notificationWindow.showTimerComplete(
      () => {
        console.log("Test: Taking break from notification...");
      },
      () => {
        console.log("Test: Extending work session from notification...");
      },
      15 // Test with 15 minutes
    );
  } catch (error) {
    console.error('Error showing test notification:', error);
  }
});