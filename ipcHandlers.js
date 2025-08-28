const { ipcMain, BrowserWindow, app, dialog } = require('electron');
const axios = require('axios');

/**
 * Setup all IPC handlers for the application
 * @param {Object} dependencies - Object containing all necessary dependencies
 */
function setupIpcHandlers({
  mainWindow,
  autoLogin,
  timeRecorder,
  settingsManager,
  startAtLoginManager,
  notificationManager,
  notificationWindow,
  restWindow,
  trayWindow,
  tray,
  getWorking,
  getWorkingTime,
  getExtendedWorkingTime,
  updateTimerSettings,
  startTimerProcess,
  cancelTimerProcess,
  getDeviceList
}) {

  // Window control handlers
  ipcMain.on("close-window", async () => {
    if (mainWindow) {
      mainWindow.hide();
      if (process.platform === "darwin") {
        app.dock.hide();
      }
    }
  });

  ipcMain.on("minimize-window", async () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  // Feedback submission handler
  ipcMain.handle('submit-feedback', async (event, feedbackData) => {
    try {
      console.log('📝 Submitting feedback:', feedbackData);
      
      const response = await axios.post('https://login.worthier.app/feedback', {
        feedback: feedbackData.feedback,
        email: feedbackData.email || null,
        timestamp: new Date().toISOString(),
        userAgent: process.platform,
        appVersion: app.getVersion()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Worthier-Desktop/${app.getVersion()}`
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ Feedback submitted successfully:', response.status);
      return { success: true, message: 'Feedback submitted successfully!' };
      
    } catch (error) {
      console.error('❌ Error submitting feedback:', error.message);
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return { success: false, message: 'Network error. Please check your internet connection and try again.' };
      } else if (error.response) {
        return { success: false, message: `Server error: ${error.response.status}. Please try again later.` };
      } else {
        return { success: false, message: 'Failed to submit feedback. Please try again later.' };
      }
    }
  });

    // Authentication handlers
  ipcMain.on('login-microsoft', async (event) => {
    const { startLogin } = require('./login');
    const windowUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
      'client_id=a0772969-add5-4e73-80fe-a4015a43c0e8' +
      '&response_type=code' +
      '&redirect_uri=https://login.worthier.app/microsoft' +
      '&scope=openid%20profile%20email' +
      '&response_mode=form_post';
    const callbackUrl = 'https://login.worthier.app/microsoft';
    startLogin(mainWindow, windowUrl, callbackUrl, app.getPath('userData'));
  });

  ipcMain.on('login-google', async (event) => {
    const { startLogin } = require('./login');
    const windowUrl = 'https://accounts.google.com/o/oauth2/v2.0/auth' +
      '?client_id=899665986783-tf93v1oi9tt140vrt0ib1lbplra4lka8.apps.googleusercontent.com' +
      '&response_type=code' +
      '&redirect_uri=https://login.worthier.app/google' +
      '&scope=openid%20profile%20email' +
      '&response_mode=form_post';
    const callbackUrl = 'https://login.worthier.app/google';
    startLogin(mainWindow, windowUrl, callbackUrl, app.getPath('userData'));
  });

  ipcMain.on('login-apple', async (event) => {
    const { startLogin } = require('./login');
    const windowUrl = 'https://appleid.apple.com/auth/authorize' +
      '?client_id=com.worthier.worthier' +
      '&response_type=code' +
      '&redirect_uri=https://login.worthier.app/apple' +
      '&scope=name%20email' +
      '&response_mode=form_post';
    const callbackUrl = 'https://login.worthier.app/apple';

    startLogin(mainWindow, windowUrl, callbackUrl, app.getPath('userData'));
  });

  // Handle logout
  ipcMain.on('logout', async (event) => {
    console.log('🚪 Logout requested');
    autoLogin.handleLogout();
    // Re-send recent records after logout to refresh the UI
    // Add a small delay to ensure the frontend processes the logout-success event first
    setTimeout(() => {
      const recentRecords = timeRecorder.getRecentRecords(7);
      console.log('Re-sending recent records after logout:', JSON.stringify(recentRecords, null, 2));
      mainWindow.webContents.send('recent-records', recentRecords);
    }, 100);
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

  // Get recent records
  ipcMain.handle('get-recent-records', async (event) => {
    try {    
      if (!timeRecorder) {
        console.log('⚠️ timeRecorder not initialized yet, returning empty array');
        return [];
      }
      
      const recentRecords = timeRecorder.getRecentRecords(7);
      return recentRecords || [];
    } catch (error) {
      console.error('❌ Main process: Error getting recent records:', error);
      return [];
    }
  });

  // Get all records
  ipcMain.handle('get-all-records', async (event) => {
    try {    
      if (!timeRecorder) {
        console.log('⚠️ timeRecorder not initialized yet, returning empty object');
        return {};
      }
      
      const allRecords = timeRecorder.getAllRecords();
      return allRecords || {};
    } catch (error) {
      console.error('❌ Main process: Error getting all records:', error);
      return {};
    }
  });

  // Get login statistics (optional, for debugging)
  ipcMain.on('get-login-stats', async (event) => {
    const stats = await autoLogin.getLoginStats();
    mainWindow.webContents.send('login-stats', stats);
  });

  // Theme handlers
  ipcMain.on('set-theme', async (event, theme) => {
    if (['light', 'dark', 'pink', 'system'].includes(theme)) {
      settingsManager.saveTheme(theme);
      // Get the resolved theme (resolves 'system' to actual light/dark)
      const resolvedTheme = settingsManager.loadTheme();
      // Send the resolved theme to all renderer processes
      mainWindow.webContents.send('theme-changed', resolvedTheme);
      // Also send to tray window if it exists
      if (trayWindow && trayWindow.window && !trayWindow.window.isDestroyed()) {
        trayWindow.window.webContents.send('theme-changed', resolvedTheme);
      }
      console.log(`Theme changed and saved to: ${theme}, resolved to: ${resolvedTheme}`);
    }
  });

  ipcMain.on('apply-theme', async (event, theme) => {
    if (['light', 'dark', 'pink', 'system'].includes(theme)) {
      // Get the resolved theme (resolves 'system' to actual light/dark)
      const resolvedTheme = settingsManager.loadTheme();
      // Send the resolved theme to all renderer processes
      mainWindow.webContents.send('theme-changed', resolvedTheme);
      // Also send to tray window if it exists
      if (trayWindow && trayWindow.window && !trayWindow.window.isDestroyed()) {
        trayWindow.window.webContents.send('theme-changed', resolvedTheme);
      }
      console.log(`Theme applied: ${theme}, resolved to: ${resolvedTheme}`);
    }
  });

  // Get current theme settings
  ipcMain.handle('get-theme-settings', async (event) => {
    return settingsManager.getThemeSettings();
  });

  // Start at login settings handlers
  ipcMain.handle('get-start-at-login', async (event) => {
    return startAtLoginManager.getStatus();
  });

  ipcMain.handle('set-start-at-login', async (event, enable) => {
    try {
      const result = await startAtLoginManager.setStartAtLogin(enable);
      console.log(`Start at login ${enable ? 'enabled' : 'disabled'}`);
      return result;
    } catch (error) {
      console.error('Error setting start at login:', error);
      return {
        success: false,
        error: error.message,
        enabled: startAtLoginManager.getStatus().enabled
      };
    }
  });

  // Notification settings handlers
  ipcMain.handle('get-notification-settings', async (event) => {
    const settings = await notificationManager.getSettings();
    const permissionStatus = notificationManager.getPermissionStatus();
    const result = { ...settings, permissionStatus };
    console.log('IPC: get-notification-settings returning:', result);
    return result;
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
    updateTimerSettings(updatedSettings);

    console.log('Timer settings updated:', timerSettings);

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
      return await notificationWindow.showTimerComplete(onStartBreak, onContinueWorking, getExtendedWorkingTime());
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
      startTimerProcess(getWorkingTime()); // Fire and forget - UI doesn't need to wait for timer to fully start

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
    return getWorking();
  });

  ipcMain.on('tray-start-working', async (event) => {
    if (!getWorking()) {
      // Reuse the existing timer logic - same as startup notification and current tray menu
      startTimerProcess(getWorkingTime()); // Fire and forget - tray action doesn't need to wait
      trayWindow.hide();
    }
  });

  // Handle start work from rest window
  ipcMain.on('start-work-from-rest', async (event) => {
    console.log('Starting work immediately from rest window...');

    // Start a new work session regardless of current state
    startTimerProcess(getWorkingTime()); // Fire and forget - user action doesn't need to wait

    // The rest window will be automatically closed by the restPreload.js
  });

  ipcMain.on('tray-take-break', async (event) => {
    if (getWorking()) {
      // Handle break state internally without sending message to main window
      // This prevents the main window from potentially showing up
      // mainWindow.webContents.send("break"); // Commented out to prevent main window activation

      // Cancel the timer process
      cancelTimerProcess(); // Fire and forget - tray action doesn't need to wait

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
          win.webContents.send('working-state-changed', getWorking());
        }
      });
      trayWindow.hide();
    }
  });

  ipcMain.on('tray-open-main', async (event) => {
    console.log('🖥️ Tray: Opening main window...');
    
    try {
      // Comprehensive window restoration
      if (mainWindow.isMinimized()) {
        console.log('🖥️ Window is minimized, restoring...');
        mainWindow.restore();
      }
      
      if (!mainWindow.isVisible()) {
        console.log('🖥️ Window is not visible, showing...');
        mainWindow.show();
      }
      
      // Force the window to the front
      console.log('🖥️ Bringing window to front...');
      mainWindow.moveTop();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      
      // Remove always on top after a brief moment to prevent sticking
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 100);
      
      if (process.platform === "darwin") {
        console.log('🖥️ macOS: Showing dock and activating app...');
        app.dock.show();
        app.focus(); // Activate the entire application
      }
      
      trayWindow.hide();
      
      // Trigger device list refresh when opening main window
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('device-refresh');
        }
      }, 200); // Small delay to ensure window is fully loaded
      
      console.log('✅ Main window should now be visible and focused');
    } catch (error) {
      console.error('❌ Error opening main window from tray:', error);
    }
  });

  ipcMain.on('tray-quit-app', async (event) => {
    tray.destroy();
    BrowserWindow.getAllWindows().forEach((win) => win.destroy());
    app.quit();
  });

  ipcMain.handle('get-device-list', async (event) => {
    try {
      const devices = await getDeviceList(app.getPath('userData'));
      return devices;
    } catch (error) {
      console.error('Error getting device list:', error);
      return [];
    }
  });

  // File dialog handlers
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Calendar Image',
        defaultPath: options.defaultPath || 'calendar.png',
        filters: [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return result;
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { canceled: true };
    }
  });

  ipcMain.handle('write-file', async (event, filePath, buffer) => {
    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return { success: true };
    } catch (error) {
      console.error('Error writing file:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupIpcHandlers };
