import './Login.css';

function Login({ errorRef }) {
    return (
        <div className="content-frame login-frame">
            <h3>Login to Save Data Online!</h3>
            <div className='main-content'>
                <button
                    className="login-btn"
                    onClick={() => window.electronAPI?.loginWithMicrosoft?.()}
                >
                    <i className="bi bi-microsoft" style={{ marginRight: 8 }}></i>
                    Login with Microsoft
                </button>
                <button
                    className="login-btn"
                    onClick={() => window.electronAPI?.loginWithGoogle?.()}
                >
                    <i className="bi bi-google" style={{ marginRight: 8 }}></i>
                    Login with Google
                </button>
                <button
                    className="login-btn"
                    onClick={() => window.electronAPI?.loginWithApple?.()}
                >
                    <i className="bi bi-apple" style={{ marginRight: 8 }}></i>
                    Login with Apple
                </button>
                <p ref={errorRef} className="error-message"></p>
            </div>
        </div>
    );
}

export default Login;
