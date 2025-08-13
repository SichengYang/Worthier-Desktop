import './Login.css';

function Login({ onLoginMicrosoft, onLoginGoogle, onLoginApple, errorRef }) {
    return (
        <div className="content-frame login-frame">
            <h3>Login to Save Data Online!</h3>
            <div className='main-content'>
                <div className="login-buttons">
                    <button
                        className="login-btn microsoft"
                        onClick={onLoginMicrosoft}
                    >
                        <i className="bi bi-microsoft" style={{ marginRight: 8 }}></i>
                        Login with Microsoft
                    </button>
                    <button
                        className="login-btn google"
                        onClick={onLoginGoogle}
                    >
                        <i className="bi bi-google" style={{ marginRight: 8 }}></i>
                        Login with Google
                    </button>
                    <button
                        className="login-btn apple"
                        onClick={onLoginApple}
                    >
                        <i className="bi bi-apple" style={{ marginRight: 8 }}></i>
                        Login with Apple
                    </button>
                </div>
                <div className="login-note">
                    <small>💡 Tip: You can close the login window if you want to choose a different platform</small>
                </div>
                {errorRef && <p ref={errorRef} className="error-message"></p>}
            </div>
        </div>
    );
}

export default Login;
