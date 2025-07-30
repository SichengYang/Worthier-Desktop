const TokenManager = require('./tokenManager');

class AutoLogin {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tokenManager = new TokenManager();
    }

    // Check for stored tokens and auto-login on app startup
    checkAutoLogin() {
        const validProviders = this.tokenManager.getValidProviders();

        if (validProviders.length > 0) {
            console.log('Valid tokens found for:', validProviders);

            // Auto-login with the first valid provider (or implement user preference)
            const provider = validProviders[0];
            const tokenData = this.tokenManager.getTokens(provider);
            console.log(`Auto-logging in with ${provider}:`, tokenData);

            // Send auto-login success to renderer in the same format as manual login
            this.mainWindow.webContents.send('login-success', {
                info: tokenData.info
            });
            return true;
        } else {
            console.log('No valid tokens found, user needs to login manually');
            return false;
        }
    }

    // Handle logout - clear tokens for specific provider or all
    handleLogout() {
        try {
            this.tokenManager.clearTokens(); // Clear all tokens
            console.log('Logged out from all providers');

            this.mainWindow.webContents.send('logout-success');
        } catch (error) {
            console.error('Error during logout:', error);
            this.mainWindow.webContents.send('logout-failed', {
                error: 'Failed to logout'
            });
        }
    }

    // Get all valid providers (useful for UI)
    getValidProviders() {
        return this.tokenManager.getValidProviders();
    }

    // Check if a specific provider has valid tokens
    hasValidTokens(provider) {
        const tokenData = this.tokenManager.getTokens(provider);
        return tokenData && !this.tokenManager.isTokenExpired(tokenData);
    }

    // Get user info for a specific provider (if valid)
    getUserInfo(provider) {
        if (this.hasValidTokens(provider)) {
            const tokenData = this.tokenManager.getTokens(provider);
            return tokenData.user;
        }
        return null;
    }

    // Force refresh - clear expired tokens
    refreshTokens() {
        const allTokens = this.tokenManager.getTokens();
        if (allTokens) {
            ['microsoft', 'google', 'apple'].forEach(provider => {
                const tokens = allTokens[provider];
                if (tokens && this.tokenManager.isTokenExpired(tokens)) {
                    this.tokenManager.clearTokens(provider);
                    console.log(`Cleared expired tokens for ${provider}`);
                }
            });
        }
    }

    // Set custom token expiry time (in milliseconds)
    setTokenExpiry(expiryTime) {
        this.tokenExpiry = expiryTime;
    }

    // Get login statistics
    getLoginStats() {
        const allTokens = this.tokenManager.getTokens();
        const stats = {
            totalProviders: 0,
            validProviders: 0,
            expiredProviders: 0,
            providers: {}
        };

        if (allTokens) {
            ['microsoft', 'google', 'apple'].forEach(provider => {
                const tokens = allTokens[provider];
                if (tokens) {
                    stats.totalProviders++;
                    stats.providers[provider] = {
                        hasTokens: true,
                        isValid: !this.tokenManager.isTokenExpired(tokens),
                        lastLogin: new Date(tokens.timestamp).toISOString(),
                        user: tokens.user
                    };

                    if (this.tokenManager.isTokenExpired(tokens)) {
                        stats.expiredProviders++;
                    } else {
                        stats.validProviders++;
                    }
                } else {
                    stats.providers[provider] = {
                        hasTokens: false,
                        isValid: false
                    };
                }
            });
        }

        return stats;
    }
}

module.exports = AutoLogin;
