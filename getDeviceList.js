const getAutoLogin = require('./autologin');
const axios = require('axios');

/**
 * Fetches the device list for the current user using auto login credentials.
 * @returns {Promise<Object>} - JSON object containing devices or error info
 */
async function getDeviceList() {
    const autoLogin = getAutoLogin();
    const userInfo = await autoLogin.getUserInfo();
    const tokenData = await autoLogin.hasValidTokens();

    if (!userInfo || !tokenData || !tokenData.accessToken) {
        throw new Error('No valid user or access token found');
    }

    try {
        const response = await axios.post('https://login.worthier.app/deviceList', {
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
