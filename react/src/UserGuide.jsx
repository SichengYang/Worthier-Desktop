import { useState, useEffect } from 'react';
import './UserGuide.css';

function UserGuide({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState({
        theme: 'system',
        focusTime: 60,
        focusUnit: 'minutes',
        restTime: 10,
        restUnit: 'minutes',
        extendTime: 15,
        extendUnit: 'minutes',
        disableFullscreenNotifications: false,
        disableMeetingNotifications: false,
        startAtLogin: true
    });

    // Apply theme immediately for preview (temporarily saved, will be confirmed when user completes guide)
    const handleThemeChange = (newTheme) => {
        setSettings({...settings, theme: newTheme});
        // Apply theme for preview - this saves temporarily but will be overridden if user exits without completing
        if (window.electronAPI?.setTheme) {
            console.log(`Applying theme ${newTheme} for preview (temporarily saved)`);
            window.electronAPI.setTheme(newTheme);
        }
    };

    // Handle permission requests for notification features
    const handleFullscreenToggle = async (checked) => {
        if (checked) {
            // Request fullscreen detection permission
            try {
                const granted = await window.electronAPI.requestFullscreenPermission();
                if (granted) {
                    setSettings({...settings, disableFullscreenNotifications: true});
                } else {
                    // Permission denied, keep toggle off
                    console.log('Fullscreen detection permission denied');
                }
            } catch (error) {
                console.error('Error requesting fullscreen permission:', error);
            }
        } else {
            setSettings({...settings, disableFullscreenNotifications: false});
        }
    };

    const handleMeetingToggle = async (checked) => {
        if (checked) {
            // Request meeting detection permission
            try {
                const granted = await window.electronAPI.requestMeetingPermission();
                if (granted) {
                    setSettings({...settings, disableMeetingNotifications: true});
                } else {
                    // Permission denied, keep toggle off
                    console.log('Meeting detection permission denied');
                }
            } catch (error) {
                console.error('Error requesting meeting permission:', error);
            }
        } else {
            setSettings({...settings, disableMeetingNotifications: false});
        }
    };

    const handleStartAtLoginToggle = async (checked) => {
        // Only update local state, don't save to system until user completes the guide
        setSettings({...settings, startAtLogin: checked});
        console.log(`Start at login setting updated locally: ${checked} (will be saved when guide completes)`);
    };

    // Don't apply default start at login setting until user completes the guide
    // useEffect(() => {
    //     if (settings.startAtLogin) {
    //         handleStartAtLoginToggle(true);
    //     }
    // }, []); // Commented out - don't auto-apply until completion

    // Function to resolve system theme to actual theme
    const getResolvedTheme = (theme) => {
        if (theme === 'system') {
            // Detect system theme preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        return theme;
    };

    const steps = [
        {
            title: "Choose Your Theme",
            subtitle: "Select a theme that matches your style",
            content: (
                <div className="guide-theme-settings">
                    <div className="theme-options">
                        <div 
                            className={`theme-option ${settings.theme === 'system' ? 'selected' : ''}`}
                            onClick={() => handleThemeChange('system')}
                        >
                            <div className="theme-preview theme-preview-system"></div>
                            <span className="theme-name">System</span>
                        </div>
                        
                        <div 
                            className={`theme-option ${settings.theme === 'light' ? 'selected' : ''}`}
                            onClick={() => handleThemeChange('light')}
                        >
                            <div className="theme-preview theme-preview-light"></div>
                            <span className="theme-name">Light</span>
                        </div>
                        
                        <div 
                            className={`theme-option ${settings.theme === 'dark' ? 'selected' : ''}`}
                            onClick={() => handleThemeChange('dark')}
                        >
                            <div className="theme-preview theme-preview-dark"></div>
                            <span className="theme-name">Dark</span>
                        </div>
                        
                        <div 
                            className={`theme-option ${settings.theme === 'pink' ? 'selected' : ''}`}
                            onClick={() => handleThemeChange('pink')}
                        >
                            <div className="theme-preview theme-preview-pink"></div>
                            <span className="theme-name">Pink</span>
                        </div>
                    </div>
                    <div className="setting-preview">
                        You've selected the {settings.theme} theme{settings.theme === 'system' ? ' (follows your system preference)' : ''}. You can change this anytime in settings.
                    </div>
                </div>
            )
        },
        {
            title: "Set Your Focus Time",
            subtitle: "How long do you want to work before taking a break?",
            content: (
                <div className="guide-timer-settings">
                    <div className="setting-group">
                        <label>Focus Duration:</label>
                        <div className="time-input-group">
                            <input
                                type="number"
                                min="1"
                                max="120"
                                value={settings.focusTime}
                                onChange={(e) => setSettings({...settings, focusTime: parseInt(e.target.value) || 60})}
                                className="time-input"
                            />
                            <select
                                value={settings.focusUnit}
                                onChange={(e) => setSettings({...settings, focusUnit: e.target.value})}
                                className="unit-select"
                            >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                            </select>
                        </div>
                    </div>
                    <div className="setting-preview">
                        You'll work for {settings.focusTime} {settings.focusUnit} before each break.
                    </div>
                </div>
            )
        },
        {
            title: "Set Your Break Time",
            subtitle: "How long should your breaks be?",
            content: (
                <div className="guide-timer-settings">
                    <div className="setting-group">
                        <label>Break Duration:</label>
                        <div className="time-input-group">
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={settings.restTime}
                                onChange={(e) => setSettings({...settings, restTime: parseInt(e.target.value) || 10})}
                                className="time-input"
                            />
                            <select
                                value={settings.restUnit}
                                onChange={(e) => setSettings({...settings, restUnit: e.target.value})}
                                className="unit-select"
                            >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                            </select>
                        </div>
                    </div>
                    <div className="setting-preview">
                        You'll take {settings.restTime} {settings.restUnit} breaks between work sessions.
                    </div>
                </div>
            )
        },
        {
            title: "Set Your Extend Time",
            subtitle: "How long would you like to extend work sessions when needed?",
            content: (
                <div className="guide-timer-settings">
                    <div className="setting-group">
                        <label>Extend Duration:</label>
                        <div className="time-input-group">
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={settings.extendTime}
                                onChange={(e) => setSettings({...settings, extendTime: parseInt(e.target.value) || 15})}
                                className="time-input"
                            />
                            <select
                                value={settings.extendUnit}
                                onChange={(e) => setSettings({...settings, extendUnit: e.target.value})}
                                className="unit-select"
                            >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                            </select>
                        </div>
                    </div>
                    <div className="setting-preview">
                        When you're in flow, you can extend your work session by {settings.extendTime} {settings.extendUnit}.
                    </div>
                    <div className="setting-info">
                        <p>💡 This gives you flexibility to continue working when you're productive, without breaking your concentration.</p>
                    </div>
                </div>
            )
        },
        {
            title: "App Settings & Permissions",
            subtitle: "Configure smart features and app behavior",
            content: (
                <div className="guide-notification-settings">
                    <div className="setting-item">
                        <div className="setting-header">
                            <span className="setting-emoji">🖥️</span>
                            <div className="setting-info">
                                <h4>Fullscreen Detection</h4>
                                <p>Disable notifications when you're in fullscreen (presentations, videos, games, etc.)</p>
                            </div>
                        </div>
                        <label className="setting-toggle">
                            <input
                                type="checkbox"
                                checked={settings.disableFullscreenNotifications}
                                onChange={(e) => handleFullscreenToggle(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div className="setting-item">
                        <div className="setting-header">
                            <span className="setting-emoji">📞</span>
                            <div className="setting-info">
                                <h4>Meeting Detection</h4>
                                <p>Disable notifications when you're in video calls or meetings</p>
                            </div>
                        </div>
                        <label className="setting-toggle">
                            <input
                                type="checkbox"
                                checked={settings.disableMeetingNotifications}
                                onChange={(e) => handleMeetingToggle(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div className="setting-item">
                        <div className="setting-header">
                            <span className="setting-emoji">🚀</span>
                            <div className="setting-info">
                                <h4>Start at Login</h4>
                                <p>Start Worthier when you log into your computer</p>
                            </div>
                        </div>
                        <label className="setting-toggle">
                            <input
                                type="checkbox"
                                checked={settings.startAtLogin}
                                onChange={(e) => handleStartAtLoginToggle(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div className="guide-note">
                        <p>💡 Fullscreen and meeting detection will request system permissions when first used. You can always change these settings later.</p>
                    </div>
                </div>
            )
        },
        {
            title: "You're All Set! 🎉",
            subtitle: "Your Worthier timer is ready to boost your productivity",
            content: (
                <div className="guide-completion">
                    <div className="settings-summary">
                        <h4>Your Settings:</h4>
                        <div className="summary-item">
                            <span className="summary-label">Theme:</span>
                            <span className="summary-value">{settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Focus Time:</span>
                            <span className="summary-value">{settings.focusTime} {settings.focusUnit}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Break Time:</span>
                            <span className="summary-value">{settings.restTime} {settings.restUnit}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Fullscreen Detection:</span>
                            <span className="summary-value">{settings.disableFullscreenNotifications ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Meeting Detection:</span>
                            <span className="summary-value">{settings.disableMeetingNotifications ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Start at Login:</span>
                            <span className="summary-value">{settings.startAtLogin ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                    <div className="guide-completion-message">
                        <p>Click "Start Using Worthier" to save your settings and begin your first productive session!</p>
                    </div>
                </div>
            )
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            console.log('Starting to save settings:', settings);
            
            // Save theme setting
            await window.electronAPI.setTheme(settings.theme);
            console.log('Theme saved successfully');

            // Save timer settings
            console.log('Saving timer settings:', {
                focusTime: settings.focusTime,
                focusUnit: settings.focusUnit,
                restTime: settings.restTime,
                restUnit: settings.restUnit,
                extendTime: settings.extendTime,
                extendUnit: settings.extendUnit
            });
            
            const savedTimerSettings = await window.electronAPI.updateTimerSettings({
                focusTime: settings.focusTime,
                focusUnit: settings.focusUnit,
                restTime: settings.restTime,
                restUnit: settings.restUnit,
                extendTime: settings.extendTime,
                extendUnit: settings.extendUnit
            });
            console.log('Timer settings saved successfully:', savedTimerSettings);

            // Save notification settings
            console.log('Saving notification settings:', {
                disableFullscreenNotifications: settings.disableFullscreenNotifications,
                disableMeetingNotifications: settings.disableMeetingNotifications
            });
            
            await window.electronAPI.updateNotificationSettings({
                disableFullscreenNotifications: settings.disableFullscreenNotifications,
                disableMeetingNotifications: settings.disableMeetingNotifications
            });
            console.log('Notification settings saved successfully');

            // Save start at login setting
            console.log('Saving start at login setting:', settings.startAtLogin);
            const startAtLoginResult = await window.electronAPI.setStartAtLogin(settings.startAtLogin);
            if (startAtLoginResult.success) {
                console.log(`Start at login ${startAtLoginResult.enabled ? 'enabled' : 'disabled'} successfully`);
            } else {
                console.error('Failed to set start at login:', startAtLoginResult.error);
            }

            console.log('All settings saved successfully. Completing user guide.');
            
            // Call the completion callback to hide the guide
            onComplete();
        } catch (error) {
            console.error('Error saving initial settings:', error);
            // Still complete the guide even if there's an error
            onComplete();
        }
    };

    const currentStepData = steps[currentStep];
    const resolvedTheme = getResolvedTheme(settings.theme);
    console.log('UserGuide - Current theme:', settings.theme, 'Resolved theme:', resolvedTheme);
    
    return (
        <div className={`user-guide-overlay app-theme-${resolvedTheme}`}>
            <div className={`user-guide-container app-theme-${resolvedTheme}`}>
                <div className="guide-header">
                    <h1>{currentStepData.title}</h1>
                    <p className="guide-subtitle">{currentStepData.subtitle}</p>
                    <div className="guide-progress">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                    </div>
                </div>

                <div className="guide-content">
                    {currentStepData.content}
                </div>

                <div className="guide-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                    >
                        Previous
                    </button>
                    
                    {currentStep < steps.length - 1 ? (
                        <button 
                            className="btn btn-primary"
                            onClick={handleNext}
                        >
                            Next
                        </button>
                    ) : (
                        <button 
                            className="btn btn-success"
                            onClick={handleComplete}
                        >
                            Start Using Worthier
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserGuide;
