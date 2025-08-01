const TokenManager = require('./tokenManager');

class AutoLogin {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tokenManager = new TokenManager();
    }

    // Check for stored tokens and auto-login on app startup
    async checkAutoLogin() {
        const tokenData = this.tokenManager.getTokens();

        if (tokenData) {
            // Send access_token, username, and email to server for validation
            const axios = require('axios');
            try {
                const response = await axios.post('https://login.worthier.app/quickLogin', {
                    token: tokenData.access_token,
                    username: tokenData.user?.username,
                    email: tokenData.user?.email
                });

                if (response.data && response.data.success) {
                    // Server validated, proceed with auto-login
                    this.mainWindow.webContents.send('login-success', {
                        info: tokenData
                    });
                    return true;
                } else {
                    console.log('Server validation failed: ', response.data.error);
                    return false;
                }
            } catch (error) {
                console.error('Error validating with server:', error);
                return false;
            }
        } else {
            console.log('No valid profile found, user needs to login manually');
            return false;
        }
    }

    // Handle logout - clear tokens for specific provider or all
    async handleLogout() {
        try {
            this.tokenManager.clearTokens(); // Clear all tokens

            this.mainWindow.webContents.send('logout-success');
        } catch (error) {
            console.error('Error during logout:', error);
            this.mainWindow.webContents.send('logout-failed', {
                error: 'Failed to logout'
            });
        }
    }

    // Check if there's a valid profile
    hasValidTokens() {
        const tokenData = this.tokenManager.getTokens();
        return tokenData;
    }

    // Get user info (if valid)
    getUserInfo() {
        const tokenData = this.tokenManager.getTokens();
        if (tokenData) {
            return tokenData.user;
        }
        return null;
    }

    // Force refresh - clear expired tokens
    refreshTokens() {
        const tokenData = this.tokenManager.getTokens();
        if (tokenData) {
            this.tokenManager.clearTokens();
            console.log('Cleared expired profile');
        }
    }

    // Get login statistics
    getLoginStats() {
        const tokenData = this.tokenManager.getTokens();
        const stats = {
            hasProfile: false,
            user: null
        };

        if (tokenData) {
            stats.hasProfile = true;
            stats.user = tokenData.user;
        }

        return stats;
    }
}

module.exports = AutoLogin;
