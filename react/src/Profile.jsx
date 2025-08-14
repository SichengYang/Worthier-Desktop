
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

    // Handle tab switching with transition animation
    const handleTabSwitch = (newTab) => {
        if (newTab === selected) return;
        
        setSelected(newTab);
    };

    return (
        <div className="profile-content-frame">
            <h3>Profile & Settings</h3>
            <div id='setting-board'>
                <div id='left-board'>
                    <ul className="profile-menu">
                        <li className={selected==='profile' ? 'active' : ''} onClick={() => handleTabSwitch('profile')}>Profile</li>
                        <li className={selected==='settings' ? 'active' : ''} onClick={() => handleTabSwitch('settings')}>Settings</li>
                        <li className={selected==='feedback' ? 'active' : ''} onClick={() => handleTabSwitch('feedback')}>Feedback</li>
                    </ul>
                </div>
                <div id='right-board'>
                    <div className="content-wrapper">
                        <div className={`tab-content ${selected === 'profile' ? 'active' : 'hidden'}`}>
                            <ProfileWindow />
                        </div>
                        <div className={`tab-content ${selected === 'settings' ? 'active' : 'hidden'}`}>
                            <SettingsWindow />
                        </div>
                        <div className={`tab-content ${selected === 'feedback' ? 'active' : 'hidden'}`}>
                            <FeedbackWindow />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
