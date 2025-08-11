const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.defaultSettings = {
            // Theme settings
            theme: 'system', // 'light', 'dark', 'pink', or 'system'
            // General settings
            startAtLogin: true, // Whether app should start automatically at login
            // Notification settings - features disabled by default to avoid permission requests
            // User must explicitly enable these in settings
            disableFullscreenNotifications: false, // false = don't use fullscreen detection
            disableMeetingNotifications: false, // false = don't use meeting detection
            // Timer settings
            focusTime: 60,
            focusUnit: 'minutes',
            extendedFocusTime: 15,
            extendedFocusUnit: 'minutes',
            restTime: 10,
            restUnit: 'minutes'
        };
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf8');
                return { ...this.defaultSettings, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('Error loading app settings:', error);
        }
        return this.defaultSettings;
    }

    saveSettings(settings) {
        try {
            const settingsToSave = { ...this.defaultSettings, ...settings };
            fs.writeFileSync(this.settingsPath, JSON.stringify(settingsToSave, null, 2));
            return settingsToSave;
        } catch (error) {
            console.error('Error saving app settings:', error);
            return this.defaultSettings;
        }
    }

    // Helper method to get focus time in minutes
    getFocusTimeInMinutes(settings = null) {
        const currentSettings = settings || this.loadSettings();
        const time = parseInt(currentSettings.focusTime) || 60;
        const unit = currentSettings.focusUnit || 'minutes';
        return unit === 'hours' ? time * 60 : time;
    }

    // Helper method to get rest time in minutes
    getRestTimeInMinutes(settings = null) {
        const currentSettings = settings || this.loadSettings();
        const time = parseInt(currentSettings.restTime) || 10;
        const unit = currentSettings.restUnit || 'minutes';
        return unit === 'hours' ? time * 60 : time;
    }

    // Helper method to get extended focus time in minutes
    getExtendedFocusTimeInMinutes(settings = null) {
        const currentSettings = settings || this.loadSettings();
        const time = parseInt(currentSettings.extendedFocusTime) || 15;
        const unit = currentSettings.extendedFocusUnit || 'minutes';
        return unit === 'hours' ? time * 60 : time;
    }

    // Theme management methods
    saveTheme(theme) {
        console.log(`Saving theme: ${theme}`);
        const currentSettings = this.loadSettings();
        const updatedSettings = { ...currentSettings, theme };
        return this.saveSettings(updatedSettings);
    }

    loadTheme() {
        try {
            const settings = this.loadSettings();
            const theme = settings.theme;
            console.log(`Loaded theme: ${theme}`);
            if (theme === 'system' || !theme) {
                // Detect system theme
                const { nativeTheme } = require('electron');
                const isDark = nativeTheme.shouldUseDarkColors;
                return isDark ? 'dark' : 'light';
            }
            return theme;
        } catch (error) {
            console.log('Error loading theme, detecting system theme');
            // Fallback to system theme detection
            const { nativeTheme } = require('electron');
            const isDark = nativeTheme.shouldUseDarkColors;
            return isDark ? 'dark' : 'light';
        }
    }

    sendThemeToRenderer(mainWindow) {
        if (mainWindow && mainWindow.webContents) {
            const currentTheme = this.loadTheme();
            console.log(`Sending theme to renderer: ${currentTheme}`);
            mainWindow.webContents.send('theme-changed', currentTheme);
        }
    }

    // Get theme settings for IPC handlers
    getThemeSettings() {
        const settings = this.loadSettings();
        return {
            theme: settings.theme || 'system',
            resolvedTheme: this.loadTheme() // The actual theme being used (resolves 'system' to 'light' or 'dark')
        };
    }

    // Start at login functionality
    setStartAtLogin(enable) {
        console.log(`Setting start at login: ${enable}`);
        try {
            app.setLoginItemSettings({
                openAtLogin: enable,
                openAsHidden: true // Start minimized to tray
            });
            
            // Save to settings
            const currentSettings = this.loadSettings();
            const updatedSettings = { ...currentSettings, startAtLogin: enable };
            return this.saveSettings(updatedSettings);
        } catch (error) {
            console.error('Error setting start at login:', error);
            return this.loadSettings(); // Return current settings on error
        }
    }

    getStartAtLogin() {
        const settings = this.loadSettings();
        return settings.startAtLogin || false;
    }

    // Get the actual system login item status (cross-reference with our setting)
    getSystemLoginItemStatus() {
        try {
            const loginItemSettings = app.getLoginItemSettings();
            return {
                openAtLogin: loginItemSettings.openAtLogin,
                openAsHidden: loginItemSettings.openAsHidden,
                wasOpenedAtLogin: loginItemSettings.wasOpenedAtLogin,
                wasOpenedAsHidden: loginItemSettings.wasOpenedAsHidden
            };
        } catch (error) {
            console.error('Error getting system login item status:', error);
            return { openAtLogin: false, openAsHidden: false };
        }
    }
}

module.exports = SettingsManager;
