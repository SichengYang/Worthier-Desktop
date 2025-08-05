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
    }

    const displayTitle = isLoggedIn && userInfo 
        ? `Worthier - Welcome, ${userInfo.username || userInfo.name || 'User'}!`
        : 'Worthier - Work Healthier';
    
    return (
        <div className="titlebar">
            <h5>{displayTitle}</h5>
            <div className="buttons">
                <button>
                    <i className="bi bi-dash-lg" onClick={handleMinimize}></i>
                </button>
                <button>
                    <i className="bi bi-x-lg" onClick={handleClose}></i>
                </button>
            </div>
        </div>
    )
}


export default Title