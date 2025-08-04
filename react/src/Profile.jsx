
import './Profile.css';
import { useState } from 'react';
import ProfileWindow from './ProfileWindow';
import SettingsWindow from './SettingsWindow';
import FeedbackWindow from './FeedbackWindow';

function Profile({ username, email, onLogout }) {
    const [selected, setSelected] = useState('profile');

    let rightContent;
    if (selected === 'profile') {
        rightContent = <ProfileWindow username={username} email={email} onLogout={onLogout} />;
    } else if (selected === 'settings') {
        rightContent = <SettingsWindow />;
    } else if (selected === 'feedback') {
        rightContent = <FeedbackWindow />;
    }

    return (
        <div className="content-frame">
            <h3>Welcome, {username}!</h3>
            <div id='setting-board'>
                <div id='left-board'>
                    <ul className="profile-menu">
                        <li className={selected==='profile' ? 'active' : ''} onClick={() => setSelected('profile')}>Profile</li>
                        <li className={selected==='settings' ? 'active' : ''} onClick={() => setSelected('settings')}>Settings</li>
                        <li className={selected==='feedback' ? 'active' : ''} onClick={() => setSelected('feedback')}>Feedback</li>
                    </ul>
                </div>
                <div id='right-board'>
                    {rightContent}
                </div>
            </div>
        </div>
    );
}

export default Profile;
