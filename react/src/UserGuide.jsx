import { useState, useEffect } from 'react';
import './UserGuide.css';

function UserGuide({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState({
        theme: 'light',
        focusTime: 60,
        focusUnit: 'minutes',
        restTime: 10,
        restUnit: 'minutes',
        disableFullscreenNotifications: false,
        disableMeetingNotifications: false
    });

    // Apply theme immediately when user selects it
    const handleThemeChange = (newTheme) => {
        setSettings({...settings, theme: newTheme});
        // Apply theme to the app immediately for preview
        window.electronAPI.setTheme(newTheme);
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

    const steps = [
        {
            title: "Choose Your Theme",
            subtitle: "Select a theme that matches your style",
            content: (
                <div className="guide-theme-settings">
                    <div className="theme-options">
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
                        You've selected the {settings.theme} theme. You can change this anytime in settings.
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
            title: "App Permissions",
            subtitle: "Configure smart notification features",
            content: (
                <div className="guide-notification-settings">
                    <div className="setting-item">
                        <div className="setting-header">
                            <span className="setting-emoji">🖥️</span>
                            <div className="setting-info">
                                <h4>Fullscreen Detection</h4>
                                <p>Disable notifications when you're in fullscreen mode (presentations, videos, etc.)</p>
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
                    
                    <div className="guide-note">
                        <p>💡 These features will request system permissions when first used. You can always change these settings later.</p>
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
            
            // Theme is already set when user selects it, but let's ensure it's saved
            await window.electronAPI.setTheme(settings.theme);
            console.log('Theme saved successfully');

            // Save timer settings
            console.log('Saving timer settings:', {
                focusTime: settings.focusTime,
                focusUnit: settings.focusUnit,
                restTime: settings.restTime,
                restUnit: settings.restUnit
            });
            
            const savedTimerSettings = await window.electronAPI.updateTimerSettings({
                focusTime: settings.focusTime,
                focusUnit: settings.focusUnit,
                restTime: settings.restTime,
                restUnit: settings.restUnit
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

    return (
        <div className="user-guide-overlay">
            <div className="user-guide-container">
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
