const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.defaultSettings = {
            // Notification settings - features disabled by default to avoid permission requests
            // User must explicitly enable these in settings
            disableFullscreenNotifications: false, // false = don't use fullscreen detection
            disableMeetingNotifications: false, // false = don't use meeting detection
            // Timer settings
            focusTime: 60,
            focusUnit: 'minutes',
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
}

module.exports = SettingsManager;
