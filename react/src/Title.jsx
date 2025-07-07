import './Title.css'
import 'bootstrap-icons/font/bootstrap-icons.css';

function Title() {
    const handleClose = () => {
        window.electronAPI?.closeWindow(); // safely call close
    };
    
    return (
        <div className="titlebar">
            <h5>Worthier - Work Healthier</h5>
            <div className="buttons">
                <button>
                    <i className="bi bi-dash-lg"></i>
                </button>
                <button>
                    <i className="bi bi-x-lg" onClick={handleClose}></i>
                </button>
            </div>
        </div>
    )
}


export default Title