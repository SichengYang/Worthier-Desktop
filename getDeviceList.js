const getAutoLogin = require('./autologin');
const axios = require('axios');

/**
 * Make an axios POST request with automatic token refresh on 401 responses
 * @param {string} url - The URL to make the request to
 * @param {Object} data - The data to send in the request body
 * @param {Object} config - Axios request configuration
 * @param {Object} context - Context containing retry information
 * @returns {Promise<AxiosResponse>} The axios response
 */
async function axiosPostWithTokenRefresh(url, data, config = {}, context = {}) {
    try {
        const response = await axios.post(url, data, config);
        return response;
    } catch (error) {
        // If we get a 401 and haven't retried yet, try to refresh the token
        if (error.response && error.response.status === 401 && context.retryCount !== 1) {
            console.log('Received 401 response, attempting to refresh token...');
            
            try {
                // Get fresh token data - use userDataPath from context
                const userDataPath = context.userDataPath || process.env.USER_DATA_PATH || require('os').homedir() + '/.worthier-desktop';
                const autoLogin = getAutoLogin(null, userDataPath);
                const currentTokenData = await autoLogin.hasValidTokens();
                
                if (currentTokenData) {
                    const refreshedTokenData = await autoLogin.refreshToken(currentTokenData);
                    
                    if (refreshedTokenData && refreshedTokenData.accessToken) {
                        console.log('Token refreshed successfully, retrying request...');
                        
                        // Update the request data with the new token
                        const updatedData = { ...data };
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

/**
 * Fetches the device list for the current user using auto login credentials.
 * @param {string} [userDataPath] - Optional userData path for token storage
 * @returns {Promise<Object>} - JSON object containing devices or error info
 */
async function getDeviceList(userDataPath = null) {
    const autoLogin = getAutoLogin(null, userDataPath);
    const userInfo = await autoLogin.getUserInfo();
    const tokenData = await autoLogin.hasValidTokens();

    if (!userInfo || !tokenData || !tokenData.accessToken) {
        throw new Error('No valid user or access token found');
    }

    try {
        const response = await axiosPostWithTokenRefresh('https://login.worthier.app/deviceList', {
            userID: userInfo.id,
            username: userInfo.username,
            email: userInfo.email,
            accessToken: tokenData.accessToken
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.data && response.data.devices) {
            return response.data.devices;
        } else {
            throw new Error(response.data?.error || 'No devices found');
        }
    } catch (error) {
        console.error('Error fetching device list:', error);
        throw error;
    }
}

module.exports = getDeviceList;
