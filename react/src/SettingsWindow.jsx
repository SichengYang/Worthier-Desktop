
import React, { useState } from 'react';
import './SettingsWindow.css';
import { useTheme } from './ThemeContext';

function SettingsWindow() {
    const [focusTime, setFocusTime] = useState(25);
    const [focusUnit, setFocusUnit] = useState('minutes');
    const [restTime, setRestTime] = useState(5);
    const { theme, changeTheme } = useTheme();

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
                        onChange={e => setFocusTime(e.target.value)}
                        style={{ width: '60px', marginRight: '8px' }}
                    />
                    <select value={focusUnit} onChange={e => setFocusUnit(e.target.value)}>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                    </select>
                </div>
                <div className="setting-group">
                    <label>Rest Time (minutes):</label>
                    <input
                        type="number"
                        min="1"
                        value={restTime}
                        onChange={e => setRestTime(e.target.value)}
                        style={{ width: '60px' }}
                    />
                </div>
                <div className="setting-group">
                    <label>Theme:</label>
                    <div className="theme-circles">
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
