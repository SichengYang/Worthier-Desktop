
import './ProfileWindow.css';

function ProfileWindow({ username, email, onLogout }) {
    return (
        <div className="profile-window">
            <h2>Profile Information</h2>
            <div className="profile-details">
                <p><strong>Username:</strong> {username}</p>
                <p><strong>Email:</strong> {email}</p>
            </div>
            <button className="logout-btn" onClick={onLogout}>
                Logout
            </button>
        </div>
    );
}

export default ProfileWindow;
