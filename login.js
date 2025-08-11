const { BrowserWindow } = require('electron');
const { randomUUID } = require('crypto');

function startLogin(mainWindow, windowUrl, callbackUrl) {
  let windowClosed = false;

  // Generate a unique session ID for polling
  const sessionId = randomUUID();
  console.log('Generated sessionId:', sessionId);

  // Add sessionId to the login URL as state parameter
  const urlWithSession = windowUrl.includes('?')
    ? `${windowUrl}&state=${sessionId}`
    : `${windowUrl}?state=${sessionId}`;

  const loginWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: BrowserWindow.getFocusedWindow(),
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  function safeClose() {
    if (!windowClosed) {
      windowClosed = true;
      loginWindow.close();
    }
  }

  loginWindow.loadURL(urlWithSession);

  // In your did-finish-load handler:
  loginWindow.webContents.on('did-finish-load', async () => {
    const currentUrl = loginWindow.webContents.getURL();
    if (currentUrl.startsWith(callbackUrl)) {
      safeClose();
      console.log('Login window finished loading callback URL:', currentUrl);

      // Poll your backend for the result using the sessionId
      try {
        let info = null;
        for (let i = 0; i < 10; i++) {
          console.log(`Polling attempt ${i + 1} for sessionId: ${sessionId}`);
          try {
            const res = await fetch(`https://login.worthier.app/poll/${sessionId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              // Add a timeout for individual poll requests
              signal: AbortSignal.timeout(8000) // 8 second timeout per request
            });
            if (res.ok) {
              info = await res.json();
              console.log('Poll result:', info);
              if (info) break;
            } else if (res.status >= 500) {
              console.warn(`Server error during polling (${res.status}). Will retry...`);
              // Continue polling for server errors
            } else if (res.status !== 202) {
              console.log('Poll failed with status:', res.status);
              break;
            }
          } catch (pollError) {
            console.warn(`Polling error on attempt ${i + 1}:`, pollError.message);
            if (pollError.name === 'TimeoutError') {
              console.warn('Poll request timed out, retrying...');
            }
            // Continue to next iteration for network errors
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        if (info && info.success) {
          // Auto-login feature: Save tokens securely for quick login next time
          try {
            const TokenManager = require('./tokenManager');
            const tokenManager = new TokenManager();

            // Store the login data securely with encryption
            await tokenManager.storeTokens({
              user: info.user,
              accessToken: info.accessToken
            });

            console.log(`Auto-login tokens stored securely:`, info.user.username || 'Unknown User', `accessToken: ${info.accessToken} `);
          } catch (err) {
            console.error('Error storing auto-login tokens:', err);
          }
          
          mainWindow.webContents.send('login-success', { info });
        } else {
          mainWindow.webContents.send('login-failed', { error: 'Login timeout or failed.' });
        }
      } catch (err) {
        console.error('Polling error:', err);
        mainWindow.webContents.send('login-failed', { error: err.message });
      }
    }
  });
}

module.exports = { startLogin };