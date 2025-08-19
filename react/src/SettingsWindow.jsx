
import React, { useState, useEffect } from 'react';
import './SettingsWindow.css';
import { useTheme } from './ThemeContext';

function SettingsWindow() {
    const [focusTime, setFocusTime] = useState(60);
    const [focusUnit, setFocusUnit] = useState('minutes');
    const [restTime, setRestTime] = useState(10);
    const [restUnit, setRestUnit] = useState('minutes');
    const [extendTime, setExtendTime] = useState(15);
    const [extendUnit, setExtendUnit] = useState('minutes');
    const [disableFullscreenNotifications, setDisableFullscreenNotifications] = useState(false);
    const [disableMeetingNotifications, setDisableMeetingNotifications] = useState(false);
    const [startAtLogin, setStartAtLogin] = useState(false);
    const [permissionWarnings, setPermissionWarnings] = useState([]);
    const [showFullscreenTooltip, setShowFullscreenTooltip] = useState(false);
    const [showMeetingTooltip, setShowMeetingTooltip] = useState(false);
    const { theme, changeTheme } = useTheme();

    // Load settings on component mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Load notification settings
                const notificationSettings = await window.electronAPI.getNotificationSettings();
                setDisableFullscreenNotifications(notificationSettings.disableFullscreenNotifications || false);
                setDisableMeetingNotifications(notificationSettings.disableMeetingNotifications || false);

                // Load timer settings
                const timerSettings = await window.electronAPI.getTimerSettings();
                setFocusTime(timerSettings.focusTime || 60);
                setFocusUnit(timerSettings.focusUnit || 'minutes');
                setRestTime(timerSettings.restTime || 10);
                setRestUnit(timerSettings.restUnit || 'minutes');
                setExtendTime(timerSettings.extendedFocusTime || 15);
                setExtendUnit(timerSettings.extendedFocusUnit || 'minutes');

                // Load start at login setting
                const startAtLoginData = await window.electronAPI.getStartAtLogin();
                setStartAtLogin(startAtLoginData.enabled || false);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };

        loadSettings();

        // Listen for settings updates
        const notificationCleanup = window.electronAPI.onNotificationSettingsUpdated((event, data) => {
            // Handle both old format (just settings) and new format (with permissions)
            const settings = data.settings || data;
            setDisableFullscreenNotifications(settings.disableFullscreenNotifications || false);
            setDisableMeetingNotifications(settings.disableMeetingNotifications || false);
            
            // Clear previous warnings when settings are successfully updated
            setPermissionWarnings([]);
        });

        // Listen for permission warnings
        const permissionWarningCleanup = window.electronAPI.onNotificationPermissionWarnings ? 
            window.electronAPI.onNotificationPermissionWarnings((event, warnings) => {
                setPermissionWarnings(warnings);
                console.warn('Permission warnings received:', warnings);
            }) : null;

        const timerCleanup = window.electronAPI.onTimerSettingsUpdated((event, settings) => {
            setFocusTime(settings.focusTime || 60);
            setFocusUnit(settings.focusUnit || 'minutes');
            setRestTime(settings.restTime || 10);
            setRestUnit(settings.restUnit || 'minutes');
            setExtendTime(settings.extendedFocusTime || 15);
            setExtendUnit(settings.extendedFocusUnit || 'minutes');
        });

        return () => {
            if (typeof notificationCleanup === 'function') {
                notificationCleanup();
            }
            if (typeof permissionWarningCleanup === 'function') {
                permissionWarningCleanup();
            }
            if (typeof timerCleanup === 'function') {
                timerCleanup();
            }
        };
    }, []);

    // Update notification settings when state changes
    const updateNotificationSettings = (newSettings) => {
        window.electronAPI.updateNotificationSettings(newSettings);
    };

    // Update timer settings when state changes
    const updateTimerSettings = async (newSettings) => {
        try {
            await window.electronAPI.updateTimerSettings(newSettings);
            console.log('Timer settings updated successfully:', newSettings);
        } catch (error) {
            console.error('Error updating timer settings:', error);
        }
    };

    const handleFocusTimeChange = async (time) => {
        setFocusTime(time);
        await updateTimerSettings({
            focusTime: time,
            focusUnit,
            restTime,
            restUnit,
            extendedFocusTime: extendTime,
            extendedFocusUnit: extendUnit
        });
    };

    const handleFocusUnitChange = async (unit) => {
        setFocusUnit(unit);
        await updateTimerSettings({
            focusTime,
            focusUnit: unit,
            restTime,
            restUnit,
            extendedFocusTime: extendTime,
            extendedFocusUnit: extendUnit
        });
    };

    const handleRestTimeChange = async (time) => {
        setRestTime(time);
        await updateTimerSettings({
            focusTime,
            focusUnit,
            restTime: time,
            restUnit,
            extendedFocusTime: extendTime,
            extendedFocusUnit: extendUnit
        });
    };

    const handleRestUnitChange = async (unit) => {
        setRestUnit(unit);
        await updateTimerSettings({
            focusTime,
            focusUnit,
            restTime,
            restUnit: unit,
            extendedFocusTime: extendTime,
            extendedFocusUnit: extendUnit
        });
    };

    const handleExtendTimeChange = async (time) => {
        setExtendTime(time);
        await updateTimerSettings({
            focusTime,
            focusUnit,
            restTime,
            restUnit,
            extendedFocusTime: time,
            extendedFocusUnit: extendUnit
        });
    };

    const handleExtendUnitChange = async (unit) => {
        setExtendUnit(unit);
        await updateTimerSettings({
            focusTime,
            focusUnit,
            restTime,
            restUnit,
            extendedFocusTime: extendTime,
            extendedFocusUnit: unit
        });
    };

    const handleFullscreenToggle = async (checked) => {
        setDisableFullscreenNotifications(checked);
        const newSettings = {
            disableFullscreenNotifications: checked,
            disableMeetingNotifications
        };
        
        // If user is enabling fullscreen notifications, request permissions immediately
        if (checked) {
            try {
                console.log('Requesting fullscreen permissions immediately...');
                const permissionResults = await window.electronAPI.requestPermissionsImmediately(newSettings);
                if (!permissionResults.fullscreen) {
                    console.warn('Fullscreen permissions denied');
                    // You could show a warning to the user here if needed
                }
            } catch (error) {
                console.error('Error requesting fullscreen permissions:', error);
            }
        }
        
        updateNotificationSettings(newSettings);
    };

    const handleMeetingToggle = async (checked) => {
        setDisableMeetingNotifications(checked);
        const newSettings = {
            disableFullscreenNotifications,
            disableMeetingNotifications: checked
        };
        
        // If user is enabling meeting notifications, request permissions immediately
        if (checked) {
            try {
                console.log('Requesting meeting detection permissions immediately...');
                const permissionResults = await window.electronAPI.requestPermissionsImmediately(newSettings);
                if (!permissionResults.meeting) {
                    console.warn('Meeting detection permissions denied');
                    // You could show a warning to the user here if needed
                }
            } catch (error) {
                console.error('Error requesting meeting detection permissions:', error);
            }
        }
        
        updateNotificationSettings(newSettings);
    };

    const handleStartAtLoginChange = async (checked) => {
        try {
            console.log(`Setting start at login: ${checked}`);
            const result = await window.electronAPI.setStartAtLogin(checked);
            if (result.success) {
                setStartAtLogin(result.enabled);
                console.log(`Start at login ${result.enabled ? 'enabled' : 'disabled'} successfully`);
            } else {
                console.error('Failed to set start at login:', result.error);
                // Revert the state if it failed
                setStartAtLogin(!checked);
            }
        } catch (error) {
            console.error('Error setting start at login:', error);
            // Revert the state if there was an error
            setStartAtLogin(!checked);
        }
    };

    const toggleFullscreenTooltip = () => {
        setShowFullscreenTooltip(!showFullscreenTooltip);
        setShowMeetingTooltip(false); // Close other tooltip
    };

    const toggleMeetingTooltip = () => {
        setShowMeetingTooltip(!showMeetingTooltip);
        setShowFullscreenTooltip(false); // Close other tooltip
    };

    // Close tooltips when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.setting-label-with-help')) {
                setShowFullscreenTooltip(false);
                setShowMeetingTooltip(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="settings-window">
            <h2>Settings</h2>
            <div className="settings-details">
                <div className="setting-group">
                    <label>Focus Time:</label>
                    <input
                        type="number"
                        min="1"
                        value={focusTime}
                        onChange={e => handleFocusTimeChange(e.target.value)}
                        style={{ width: '50px', marginRight: '6px' }}
                    />
                    <select value={focusUnit} onChange={e => handleFocusUnitChange(e.target.value)}>
                        <option value="minutes">Min</option>
                        <option value="hours">Hrs</option>
                    </select>
                </div>
                <div className="setting-group">
                    <label>Rest Time:</label>
                    <input
                        type="number"
                        min="1"
                        value={restTime}
                        onChange={e => handleRestTimeChange(e.target.value)}
                        style={{ width: '50px', marginRight: '6px' }}
                    />
                    <select value={restUnit} onChange={e => handleRestUnitChange(e.target.value)}>
                        <option value="minutes">Min</option>
                        <option value="hours">Hrs</option>
                    </select>
                </div>
                <div className="setting-group">
                    <label>Extend Time:</label>
                    <input
                        type="number"
                        min="1"
                        value={extendTime}
                        onChange={e => handleExtendTimeChange(e.target.value)}
                        style={{ width: '50px', marginRight: '6px' }}
                    />
                    <select value={extendUnit} onChange={e => handleExtendUnitChange(e.target.value)}>
                        <option value="minutes">Min</option>
                        <option value="hours">Hrs</option>
                    </select>
                </div>
                
                {/* Show permission warnings if any */}
                {permissionWarnings.length > 0 && (
                    <div className="permission-warnings" style={{
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        border: '1px solid #ffeaa7',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '15px',
                        fontSize: '12px'
                    }}>
                        <strong>Permission Issues:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                            {permissionWarnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                            ))}
                        </ul>
                        <small>Some notification features may not work as expected.</small>
                    </div>
                )}
                <div className="setting-group setting-with-checkbox">
                    <div className="setting-label-with-help">
                        <label>No notifications during meetings:</label>
                        <button 
                            type="button"
                            className="help-button"
                            onClick={toggleMeetingTooltip}
                            aria-label="Help about meeting detection"
                        >
                            ?
                        </button>
                    </div>
                    <input
                        type="checkbox"
                        checked={disableMeetingNotifications}
                        onChange={e => handleMeetingToggle(e.target.checked)}
                        style={{ width: 'auto' }}
                    />
                    {showMeetingTooltip && (
                        <div className="tooltip">
                            <div className="tooltip-content">
                                <h4>Meeting Detection</h4>
                                <p><strong>How we detect:</strong></p>
                                <ul>
                                    <li>Checks if video apps (Zoom, Teams, etc.) are actively focused</li>
                                    <li>Looks for active meeting processes and screen sharing</li>
                                    <li>Analyzes browser tabs for meeting domains and call indicators</li>
                                </ul>
                                <p><strong>Permission needed:</strong> No special permissions required - uses standard process monitoring.</p>
                                <small>Only detects active meetings, not apps running in background.</small>
                            </div>
                        </div>
                    )}
                </div>
                <div className="setting-group setting-with-checkbox">
                    <div className="setting-label-with-help">
                        <label>No notifications in fullscreen:</label>
                        <button 
                            type="button"
                            className="help-button"
                            onClick={toggleFullscreenTooltip}
                            aria-label="Help about fullscreen detection"
                        >
                            ?
                        </button>
                    </div>
                    <input
                        type="checkbox"
                        checked={disableFullscreenNotifications}
                        onChange={e => handleFullscreenToggle(e.target.checked)}
                        style={{ width: 'auto' }}
                    />
                    {showFullscreenTooltip && (
                        <div className="tooltip">
                            <div className="tooltip-content">
                                <h4>Fullscreen Detection</h4>
                                <p><strong>How we detect:</strong> Uses macOS System Events to check if the current app window is in fullscreen mode.</p>
                                <p><strong>Permission needed:</strong> macOS will ask for permission to control "System Events" to read window properties.</p>
                                <small>Permission is only requested when you first enable this feature and a notification appears.</small>
                            </div>
                        </div>
                    )}
                </div>
                <div className="setting-group setting-with-checkbox">
                    <label>Start at Login:</label>
                    <input
                        type="checkbox"
                        checked={startAtLogin}
                        onChange={(e) => handleStartAtLoginChange(e.target.checked)}
                    />
                </div>
                <div className="setting-group">
                    <label>Theme:</label>
                    <div className="theme-circles">
                        <button
                            type="button"
                            className={`theme-circle${theme==='system' ? ' selected' : ''} system-theme`}
                            onClick={() => changeTheme('system')}
                            aria-label="System Theme"
                        />
                        <button
                            type="button"
                            className={`theme-circle${theme==='light' ? ' selected' : ''} light-theme`}
                            onClick={() => changeTheme('light')}
                            aria-label="Light Theme"
                        />
                        <button
                            type="button"
                            className={`theme-circle${theme==='dark' ? ' selected' : ''} dark-theme`}
                            onClick={() => changeTheme('dark')}
                            aria-label="Dark Theme"
                        />
                        <button
                            type="button"
                            className={`theme-circle${theme==='pink' ? ' selected' : ''} pink-theme`}
                            onClick={() => changeTheme('pink')}
                            aria-label="Pink Theme"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsWindow;
