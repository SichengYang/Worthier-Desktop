
import './Profile.css';
import { useState, useEffect } from 'react';
import ProfileWindow from './ProfileWindow';
import SettingsWindow from './SettingsWindow';
import FeedbackWindow from './FeedbackWindow';

function Profile() {
    // Load the last selected tab from localStorage, default to 'profile'
    const [selected, setSelected] = useState(() => {
        const savedTab = localStorage.getItem('profileSelectedTab');
        return savedTab || 'profile';
    });

    // Save the selected tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('profileSelectedTab', selected);
    }, [selected]);

    return (
        <div className="profile-content-frame">
            <h3>Profile & Settings</h3>
            <div id='setting-board'>
                <div id='left-board'>
                    <ul className="profile-menu">
                        <li className={selected==='profile' ? 'active' : ''} onClick={() => setSelected('profile')}>Profile</li>
                        <li className={selected==='settings' ? 'active' : ''} onClick={() => setSelected('settings')}>Settings</li>
                        <li className={selected==='feedback' ? 'active' : ''} onClick={() => setSelected('feedback')}>Feedback</li>
                    </ul>
                </div>
                <div id='right-board'>
                    {selected === 'profile' && <ProfileWindow />}
                    {selected === 'settings' && <SettingsWindow />}
                    {selected === 'feedback' && <FeedbackWindow />}
                </div>
            </div>
        </div>
    );
}

export default Profile;
