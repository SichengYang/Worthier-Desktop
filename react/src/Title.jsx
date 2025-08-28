import './Title.css'
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useUser } from './UserContext';

function Title() {
    const { userInfo, isLoggedIn } = useUser();

    const handleClose = () => {
        window.electronAPI?.closeWindow(); // safely call close
    };

    const handleMinimize = () => {
        window.electronAPI?.minimizeWindow(); // safely call minimize
    };

    const displayTitle = isLoggedIn && userInfo 
        ? `Worthier - Welcome, ${userInfo.username || userInfo.name || 'User'}!`
        : 'Worthier - Work Healthier';
    
    return (
        <div className="titlebar">
            <div className="window-controls">
                <button className="window-control close" onClick={handleClose} title="Close">
                    <span className="control-icon"></span>
                </button>
                <button className="window-control minimize" onClick={handleMinimize} title="Minimize">
                    <span className="control-icon"></span>
                </button>
            </div>
            <h5 className="title-text">{displayTitle}</h5>
            <div className="spacer"></div>
        </div>
    )
}


export default Title