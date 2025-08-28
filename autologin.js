const TokenManager = require('./tokenManager');
const DeviceInfoManager = require('./deviceInfoManager');

/**
 * Make an axios POST request with automatic token refresh on 401 responses
 * @param {string} url - The URL to make the request to
 * @param {Object} data - The data to send in the request body
 * @param {Object} config - Axios request configuration
 * @param {Object} context - Context containing retry information
 * @returns {Promise<AxiosResponse>} The axios response
 */
async function axiosPostWithTokenRefresh(url, data, config = {}, context = {}) {
    const axios = require('axios');
    
    try {
        const response = await axios.post(url, data, config);
        return response;
    } catch (error) {
        // If we get a 401 and haven't retried yet, try to refresh the token
        if (error.response && error.response.status === 401 && context.retryCount !== 1) {
            console.log('Received 401 response, attempting to refresh token...');
            
            try {
                // Get userDataPath - this should be passed from main process or obtained somehow
                const userDataPath = process.env.USER_DATA_PATH || require('os').homedir() + '/.worthier-desktop';
                
                // Get current token data from token manager
                const tokenManager = new TokenManager(userDataPath);
                const currentTokenData = await tokenManager.getTokens();
                
                if (currentTokenData) {
                    // Create a temporary AutoLogin instance to refresh token
                    const tempAutoLogin = new AutoLogin(null, userDataPath);
                    const refreshedTokenData = await tempAutoLogin.refreshToken(currentTokenData);
                    
                    if (refreshedTokenData && refreshedTokenData.accessToken) {
                        console.log('Token refreshed successfully, retrying request...');
                        
                        // Update the request data with the new token
                        const updatedData = { ...data };
                        if (updatedData.token) {
                            updatedData.token = refreshedTokenData.accessToken;
                        }
                        if (updatedData.accessToken) {
                            updatedData.accessToken = refreshedTokenData.accessToken;
                        }
                        
                        // Retry the request once with the new token
                        return await axiosPostWithTokenRefresh(url, updatedData, config, { retryCount: 1 });
                    }
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
            }
        }
        
        // If refresh failed or it's not a 401, throw the original error
        throw error;
    }
}

class AutoLogin {
    constructor(mainWindow, userDataPath) {
        this.mainWindow = mainWindow;
        this.userDataPath = userDataPath;
        this.tokenManager = new TokenManager(userDataPath);
        this.deviceInfoManager = new DeviceInfoManager();
    }

    // Check for stored tokens and auto-login on app startup
    async checkAutoLogin() {
        try {
            const tokenData = await this.tokenManager.getTokens();

            if (tokenData) {
                console.log('Retrieved token data:', JSON.stringify({
                    user: tokenData.user,
                    hasAccessToken: !!tokenData.accessToken,
                    accessTokenValue: tokenData.accessToken
                }, null, 2));

                // Send accessToken, username, and email to server for validation
                const axios = require('axios');
                try {
                    const response = await axiosPostWithTokenRefresh('https://login.worthier.app/quickLogin', {
                        token: tokenData.accessToken,
                        username: tokenData.user?.username,
                        email: tokenData.user?.email
                    }, {
                        timeout: 10000, // 10 second timeout
                        headers: {
                            'Content-Type': 'application/json'
                        }
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

                    // Handle different types of errors
                    if (error.response) {
                        const status = error.response.status;

                        if (status === 401) {
                            // Token expired, try to refresh
                            const refreshResult = await this.refreshToken(tokenData);
                            if (refreshResult) {
                                // Retry validation with new token
                                try {
                                    const response = await axiosPostWithTokenRefresh('https://login.worthier.app/quickLogin', {
                                        token: refreshResult.accessToken,
                                        username: refreshResult.user?.username,
                                        email: refreshResult.user?.email
                                    }, {
                                        timeout: 10000, // 10 second timeout
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    });

                                    if (response.data && response.data.success) {
                                        this.mainWindow.webContents.send('login-success', {
                                            info: refreshResult
                                        });
                                        return true;
                                    }
                                } catch (retryError) {
                                    console.error('Retry validation failed after refresh:', retryError);
                                }
                            }
                        } else if (status >= 500) {
                            // Server errors (500, 502, 503, etc.) - proceed with offline mode
                            console.warn(`Server error (${status}): ${error.response.statusText}. Proceeding with offline mode using cached credentials.`);

                            // Use cached token data for offline mode
                            this.mainWindow.webContents.send('login-success', {
                                info: tokenData,
                                offline: true,
                                serverError: `Server temporarily unavailable (${status})`
                            });
                            return true;
                        } else {
                            // Other client errors (400, 403, etc.)
                            console.error(`Client error (${status}): ${error.response.statusText}`);
                        }
                    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                        // Network connectivity issues
                        console.warn(`Network error (${error.code}): Unable to reach server. Proceeding with offline mode using cached credentials.`);

                        // Use cached token data for offline mode
                        this.mainWindow.webContents.send('login-success', {
                            info: tokenData,
                            offline: true,
                            serverError: 'Unable to connect to server'
                        });
                        return true;
                    } else if (error.code === 'EABORTED' || error.message?.includes('timeout')) {
                        // Request timeout
                        console.warn('Request timeout: Server response too slow. Proceeding with offline mode using cached credentials.');

                        // Use cached token data for offline mode
                        this.mainWindow.webContents.send('login-success', {
                            info: tokenData,
                            offline: true,
                            serverError: 'Server response timeout'
                        });
                        return true;
                    } else {
                        // Other errors
                        console.error('Unexpected error during validation:', error.message);
                    }

                    return false;
                }
            } else {
                console.log('No valid profile found, user needs to login manually');
                return false;
            }
        } catch (error) {
            console.error('Error during auto-login check:', error);
            return false;
        }
    }

    // Refresh token when access token expires
    async refreshToken(tokenData) {
        try {
            if (!tokenData.user?.refreshToken) {
                console.log('No refresh token available');
                console.log('Token data user object:', JSON.stringify(tokenData.user, null, 2));
                return null;
            }

            const refreshToken = tokenData.user?.refreshToken;
            console.log('Attempting to refresh token for user:', tokenData.user.username);
            console.log('Refresh token:', refreshToken);

            const axios = require('axios');
            const refreshPayload = {
                id: tokenData.user.id,
                refreshToken: refreshToken,
                deviceId: this.deviceInfoManager.getDeviceInfo().deviceId
            };
            
            console.log('Sending refresh payload:', JSON.stringify(refreshPayload, null, 2));
            
            const response = await axios.post('https://login.worthier.app/refresh', refreshPayload, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                // Update stored tokens with new credentials
                const newTokenData = {
                    user: response.data.user,
                    accessToken: response.data.accessToken
                };

                await this.tokenManager.storeTokens(newTokenData);
                console.log('Tokens refreshed successfully');
                return newTokenData;
            } else {
                console.log('Token refresh failed:', response.data?.error);
                return null;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            
            // Handle different types of refresh errors
            if (error.response) {
                const status = error.response.status;
                console.log(`Server response (${status}):`, error.response.data);
                
                if (status >= 500) {
                    console.warn(`Server error during token refresh (${status}). Token refresh skipped due to server issues.`);
                } else if (status === 401 || status === 403) {
                    console.warn('Refresh token is invalid or expired. User will need to login again.');
                } else {
                    console.error(`Client error during token refresh (${status}):`, error.response.statusText);
                }
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                console.warn(`Network error during token refresh (${error.code}): Unable to reach server.`);
            } else if (error.code === 'EABORTED' || error.message?.includes('timeout')) {
                console.warn('Request timeout during token refresh: Server response too slow.');
            } else {
                console.error('Unexpected error during token refresh:', error.message);
            }
            
            return null;
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
    async hasValidTokens() {
        const tokenData = await this.tokenManager.getTokens();
        return tokenData;
    }

    // Get user info (if valid)
    async getUserInfo() {
        const tokenData = await this.tokenManager.getTokens();
        if (tokenData) {
            return tokenData.user;
        }
        return null;
    }

    // Force refresh - clear expired tokens
    async refreshTokens() {
        const tokenData = await this.tokenManager.getTokens();
        if (tokenData) {
            this.tokenManager.clearTokens();
            console.log('Cleared expired profile');
        }
    }

    // Get login statistics
    async getLoginStats() {
        const tokenData = await this.tokenManager.getTokens();
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

let autoLoginInstance = null;
function getAutoLogin(mainWindow = null, userDataPath = null) {
    if (!autoLoginInstance) {
        if (!userDataPath) {
            // Try to get userDataPath from environment or use fallback
            userDataPath = process.env.USER_DATA_PATH || require('os').homedir() + '/.worthier-desktop';
        }
        autoLoginInstance = new AutoLogin(mainWindow, userDataPath);
    }
    return autoLoginInstance;
}
module.exports = getAutoLogin;
