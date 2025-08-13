const { screen } = require('electron');
const { exec } = require('child_process');
const { promisify } = require('util');
const SettingsManager = require('./settingsManager');

const execAsync = promisify(exec);

class NotificationManager {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.settings = this.settingsManager.loadSettings();
        this.permissionGranted = {
            fullscreen: null,
            meeting: null
        };
    }

    updateSettings(newNotificationSettings) {
        // Load current settings to preserve timer settings
        const currentSettings = this.settingsManager.loadSettings();
        
        // Only update notification-related fields
        const updatedSettings = {
            ...currentSettings,
            disableFullscreenNotifications: newNotificationSettings.disableFullscreenNotifications,
            disableMeetingNotifications: newNotificationSettings.disableMeetingNotifications
        };
        
        this.settings = this.settingsManager.saveSettings(updatedSettings);
        
        // Return only the notification settings, not all settings
        return {
            disableFullscreenNotifications: this.settings.disableFullscreenNotifications,
            disableMeetingNotifications: this.settings.disableMeetingNotifications
        };
    }

    async getSettings() {
        // Reload settings to ensure we have the latest
        this.settings = this.settingsManager.loadSettings();
        
        // Return only notification-related settings
        return {
            disableFullscreenNotifications: this.settings.disableFullscreenNotifications,
            disableMeetingNotifications: this.settings.disableMeetingNotifications
        };
    }

    async shouldShowNotification() {
        // Only check fullscreen if the user has ENABLED the "No notifications in fullscreen" feature
        if (this.settings.disableFullscreenNotifications === true) {
            console.log('Checking fullscreen status...');
            
            // If we haven't tested permissions yet, test them now (only when actually needed)
            if (this.permissionGranted.fullscreen === null) {
                try {
                    const fullscreenResult = await this.isInFullscreen();
                    this.permissionGranted.fullscreen = true;
                } catch (error) {
                    console.log('Fullscreen detection failed, disabling feature');
                    this.permissionGranted.fullscreen = false;
                    return true; // Allow notification since feature failed
                }
            }
            
            // Only check if we have confirmed permissions
            if (this.permissionGranted.fullscreen === true) {
                try {
                    const isFullscreen = await this.isInFullscreen();
                    
                    if (isFullscreen) {
                        console.log('🚫 Notification blocked: In fullscreen mode');
                        return false;
                    }
                } catch (error) {
                    console.log('Fullscreen detection failed, allowing notification');
                    this.permissionGranted.fullscreen = false;
                }
            }
        }

        // Only check meeting software if the user has ENABLED the "No notifications during meetings" feature
        if (this.settings.disableMeetingNotifications === true) {
            // If we haven't tested permissions yet, test them now (only when actually needed)
            if (this.permissionGranted.meeting === null) {
                try {
                    await this.isMeetingSoftwareRunning();
                    this.permissionGranted.meeting = true;
                } catch (error) {
                    console.log('Meeting detection failed, disabling feature');
                    this.permissionGranted.meeting = false;
                    return true; // Allow notification since feature failed
                }
            }
            
            // Only check if we have confirmed permissions
            if (this.permissionGranted.meeting === true) {
                try {
                    if (await this.isMeetingSoftwareRunning()) {
                        console.log('🚫 Notification blocked: Meeting software detected');
                        return false;
                    }
                } catch (error) {
                    console.log('Meeting detection failed, allowing notification');
                    this.permissionGranted.meeting = false;
                }
            }
        }

        return true;
    }

    getPermissionStatus() {
        return {
            fullscreen: this.permissionGranted.fullscreen,
            meeting: this.permissionGranted.meeting
        };
    }

    // Check if enabling these features will require new permissions (when notification appears)
    willRequirePermissions(settings) {
        const needsPermissions = {
            fullscreen: settings.disableFullscreenNotifications === true && this.permissionGranted.fullscreen === null,
            meeting: settings.disableMeetingNotifications === true && this.permissionGranted.meeting === null
        };
        
        return needsPermissions.fullscreen || needsPermissions.meeting ? needsPermissions : null;
    }

    async requestPermissionsIfNeeded(settings) {
        const results = {
            fullscreen: true,
            meeting: true,
            errors: []
        };

        // Reset permission status when user changes settings
        // This allows re-testing permissions if user re-enables features
        if (settings.disableFullscreenNotifications === true && this.settings.disableFullscreenNotifications !== true) {
            // User is enabling fullscreen detection for the first time
            this.permissionGranted.fullscreen = null;
            console.log('Fullscreen detection enabled - permissions will be requested when first notification appears');
        }

        if (settings.disableMeetingNotifications === true && this.settings.disableMeetingNotifications !== true) {
            // User is enabling meeting detection for the first time
            this.permissionGranted.meeting = null;
            console.log('Meeting detection enabled - permissions will be requested when first notification appears');
        }

        // If user is disabling features, mark permissions as not needed
        if (settings.disableFullscreenNotifications !== true && this.settings.disableFullscreenNotifications === true) {
            this.permissionGranted.fullscreen = null;
            console.log('Fullscreen detection disabled');
        }

        if (settings.disableMeetingNotifications !== true && this.settings.disableMeetingNotifications === true) {
            this.permissionGranted.meeting = null;
            console.log('Meeting detection disabled');
        }

        return results;
    }

    // New method to immediately request permissions when user enables features
    async requestPermissionsImmediately(settings) {
        const results = {
            fullscreen: true,
            meeting: true,
            errors: []
        };

        // Test fullscreen permissions immediately if user is enabling the feature
        if (settings.disableFullscreenNotifications === true && this.settings.disableFullscreenNotifications !== true) {
            console.log('Testing fullscreen permissions immediately...');
            try {
                await this.isInFullscreen();
                this.permissionGranted.fullscreen = true;
                console.log('Fullscreen permissions granted');
            } catch (error) {
                console.log('Fullscreen permissions denied:', error.message);
                this.permissionGranted.fullscreen = false;
                results.fullscreen = false;
                results.errors.push('Fullscreen detection permission was denied');
            }
        }

        // Test meeting permissions immediately if user is enabling the feature
        if (settings.disableMeetingNotifications === true && this.settings.disableMeetingNotifications !== true) {
            console.log('Testing meeting detection permissions immediately...');
            try {
                await this.isMeetingSoftwareRunning();
                this.permissionGranted.meeting = true;
                console.log('Meeting detection permissions granted');
            } catch (error) {
                console.log('Meeting detection permissions denied:', error.message);
                this.permissionGranted.meeting = false;
                results.meeting = false;
                results.errors.push('Meeting detection permission was denied');
            }
        }

        // If user is disabling features, mark permissions as not needed
        if (settings.disableFullscreenNotifications !== true && this.settings.disableFullscreenNotifications === true) {
            this.permissionGranted.fullscreen = null;
            console.log('Fullscreen detection disabled');
        }

        if (settings.disableMeetingNotifications !== true && this.settings.disableMeetingNotifications === true) {
            this.permissionGranted.meeting = null;
            console.log('Meeting detection disabled');
        }

        return results;
    }

    async isInFullscreen() {
        try {
            console.log('🔍 Checking fullscreen status...');
            
            // Method 1: Standard AppleScript fullscreen detection
            const { stdout } = await execAsync(`osascript -e "
                try
                    tell application \\"System Events\\"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        try
                            set isFullScreen to value of attribute \\"AXFullScreen\\" of window 1 of frontApp
                            return appName & \\"|\\" & isFullScreen as string
                        on error
                            return appName & \\"|false\\"
                        end try
                    end tell
                on error
                    return \\"unknown|false\\"
                end try
            "`);

            const [appName, isFullScreen] = stdout.trim().split('|');
            console.log(`App: ${appName}, AXFullScreen: ${isFullScreen}`);

            // If standard fullscreen detection works, use it
            if (isFullScreen && isFullScreen.trim().toLowerCase() === 'true') {
                console.log('✅ Fullscreen detected via AXFullScreen');
                return true;
            }
            
            console.log('❌ No fullscreen detected');
            return false;
        } catch (error) {
            console.error('Error checking fullscreen status:', error);
            return false;
        }
    }

    async isMeetingSoftwareRunning() {
        try {
            // First, check if any video conferencing app has focus (indicates active use)
            const { stdout: frontApp } = await execAsync(`osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true" || echo ""`);
            const currentApp = frontApp.trim().toLowerCase();
            
            const videoApps = ['zoom', 'microsoft teams', 'skype', 'discord', 'webex'];
            const isVideoAppFocused = videoApps.some(app => currentApp.includes(app));
            
            if (isVideoAppFocused) {
                console.log(`Video conferencing app in focus: ${currentApp} - likely in active meeting`);
                return true;
            }

            // Check for specific meeting indicators (not just running processes)
            try {
                // Look for active meeting processes (not just any process)
                const { stdout: activeMeetingCheck } = await execAsync(`ps aux | grep -E "(zoom.*meeting|teams.*call|skype.*call|discord.*voice|webex.*meeting)" | grep -v grep || true`);
                
                if (activeMeetingCheck && activeMeetingCheck.trim()) {
                    console.log('Active meeting process detected');
                    return true;
                }

                // Check for meeting-specific screen sharing (indicates active presentation)
                const { stdout: screenSharing } = await execAsync(`ps aux | grep -E "(zoom.*screenshare|teams.*share|webex.*share)" | grep -v grep || true`);
                if (screenSharing && screenSharing.trim()) {
                    console.log('Meeting-specific screen sharing detected');
                    return true;
                }
            } catch (processError) {
                console.log('Process check failed, continuing with other detection methods');
            }

            // Check browser-based meetings with more specific detection
            try {
                const browserChecks = [
                    { name: 'Chrome', script: 'tell application "Google Chrome" to get URL of active tab of first window', process: 'Google Chrome' },
                    { name: 'Safari', script: 'tell application "Safari" to get URL of current tab of first window', process: 'Safari' },
                    { name: 'Edge', script: 'tell application "Microsoft Edge" to get URL of active tab of first window', process: 'Microsoft Edge' },
                    { name: 'Firefox', script: 'tell application "Firefox" to get URL of active tab of first window', process: 'Firefox' }
                ];

                for (const browser of browserChecks) {
                    try {
                        // Only check browsers if they are the frontmost application
                        // This prevents triggering browsers that are just running in background
                        const { stdout: frontApp } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null || echo ""`);
                        const frontAppName = frontApp.trim();
                        
                        if (frontAppName !== browser.process) {
                            continue; // This browser is not the active app, skip it
                        }

                        // Only now check the URL since we know this browser is actively being used
                        const { stdout } = await execAsync(`osascript -e '${browser.script}' 2>/dev/null || echo ""`);
                        const url = stdout.trim().toLowerCase();
                        
                        if (url && url !== '') {
                            const meetingDomains = [
                                'zoom.us', 'teams.microsoft.com', 'meet.google.com', 
                                'webex.com', 'gotomeeting.com', 'bluejeans.com',
                                'whereby.com', 'meet.jit.si', 'discord.com/channels'
                            ];
                            
                            const hasMeetingDomain = meetingDomains.some(domain => url.includes(domain));
                            
                            if (hasMeetingDomain) {
                                // Additional check: verify if actually in a meeting call
                                const { stdout: tabTitle } = await execAsync(`osascript -e 'tell application "${browser.name === 'Chrome' ? 'Google Chrome' : browser.name}" to get title of active tab of first window' 2>/dev/null || echo ""`);
                                const title = tabTitle.trim().toLowerCase();
                                
                                // Look for specific indicators of active meetings
                                const meetingIndicators = [
                                    'meeting', 'call', 'zoom meeting', 'teams meeting',
                                    'in call', 'joining', 'conference', 'webinar',
                                    'live', 'participants', 'microphone', 'camera'
                                ];
                                
                                const isInActiveMeeting = meetingIndicators.some(indicator => title.includes(indicator));
                                
                                if (isInActiveMeeting) {
                                    console.log(`Active meeting detected in ${browser.name}: ${title}`);
                                    return true;
                                } else {
                                    console.log(`Meeting domain found but no active meeting indicators in title: ${title}`);
                                }
                            }
                        }
                    } catch (browserError) {
                        // Browser not running or no active tab, continue to next
                        continue;
                    }
                }
            } catch (browserCheckError) {
                console.log('Browser check failed, continuing with other checks');
            }

            return false;
        } catch (error) {
            console.error('Error checking meeting software:', error);
            return false;
        }
    }
}

module.exports = NotificationManager;
