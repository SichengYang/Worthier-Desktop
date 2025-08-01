import './Content.css';

function Profile({ username, onLogout }) {
    return (
        <div className="content-frame">
            <h3>Welcome, {username}!</h3>
            <div className='main-content'>
                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Profile;
