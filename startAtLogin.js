const { app } = require('electron');

class StartAtLoginManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
    }

    /**
     * Initialize start at login functionality
     * This should be called when the app is ready to ensure system settings
     * are synchronized with user preferences
     */
    async initialize() {
        try {
            const userPreference = this.settingsManager.getStartAtLogin();
            const systemStatus = this.settingsManager.getSystemLoginItemStatus();
            
            console.log('Start at login - User preference:', userPreference);
            console.log('Start at login - System status:', systemStatus);

            // Sync system settings with user preference if they differ
            if (systemStatus.openAtLogin !== userPreference) {
                console.log('Synchronizing start at login settings with user preference...');
                this.settingsManager.setStartAtLogin(userPreference);
            }

            // Log whether the app was opened at login
            if (systemStatus.wasOpenedAtLogin) {
                console.log('App was opened at login');
                if (systemStatus.wasOpenedAsHidden) {
                    console.log('App was opened hidden at login');
                }
            }

            return {
                success: true,
                userPreference,
                systemStatus: this.settingsManager.getSystemLoginItemStatus()
            };
        } catch (error) {
            console.error('Error initializing start at login:', error);
            return {
                success: false,
                error: error.message,
                userPreference: false,
                systemStatus: { openAtLogin: false, openAsHidden: false }
            };
        }
    }

    /**
     * Check if the app was opened at login
     * @returns {boolean} True if app was opened at login
     */
    wasOpenedAtLogin() {
        try {
            const systemStatus = this.settingsManager.getSystemLoginItemStatus();
            return systemStatus.wasOpenedAtLogin;
        } catch (error) {
            console.error('Error checking if opened at login:', error);
            return false;
        }
    }

    /**
     * Check if the app was opened hidden at login
     * @returns {boolean} True if app was opened hidden at login
     */
    wasOpenedAsHidden() {
        try {
            const systemStatus = this.settingsManager.getSystemLoginItemStatus();
            return systemStatus.wasOpenedAsHidden;
        } catch (error) {
            console.error('Error checking if opened as hidden:', error);
            return false;
        }
    }

    /**
     * Enable or disable start at login
     * @param {boolean} enable - Whether to enable start at login
     * @returns {Object} Result object with success status and settings
     */
    async setStartAtLogin(enable) {
        try {
            const updatedSettings = this.settingsManager.setStartAtLogin(enable);
            console.log(`Start at login ${enable ? 'enabled' : 'disabled'}`);
            
            return {
                success: true,
                enabled: updatedSettings.startAtLogin,
                systemStatus: this.settingsManager.getSystemLoginItemStatus()
            };
        } catch (error) {
            console.error('Error setting start at login:', error);
            return {
                success: false,
                error: error.message,
                enabled: this.settingsManager.getStartAtLogin(),
                systemStatus: this.settingsManager.getSystemLoginItemStatus()
            };
        }
    }

    /**
     * Get current start at login status
     * @returns {Object} Current start at login status
     */
    getStatus() {
        try {
            return {
                enabled: this.settingsManager.getStartAtLogin(),
                systemStatus: this.settingsManager.getSystemLoginItemStatus()
            };
        } catch (error) {
            console.error('Error getting start at login status:', error);
            return {
                enabled: false,
                systemStatus: { openAtLogin: false, openAsHidden: false }
            };
        }
    }
}

module.exports = StartAtLoginManager;
