const { BrowserWindow } = require('electron');

function startMicrosoftLogin(mainWindow) {
  const callbackUrl = 'https://login.worthier.app/microsoft';

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

  loginWindow.loadURL(
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=a0772969-add5-4e73-80fe-a4015a43c0e8&response_type=code&redirect_uri=https://login.worthier.app/microsoft&scope=openid%20profile%20email'
  );

  loginWindow.webContents.on('will-redirect', (event, url) => {
    if (url.startsWith(callbackUrl)) {
      event.preventDefault();
      loginWindow.close();

      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (code) {
        mainWindow.webContents.send('login-success', { platform: 'Microsoft', code });
      } else if (error) {
        mainWindow.webContents.send('login-failed', { platform: 'Microsoft', error });
      }
    }
  });
}

module.exports = { startMicrosoftLogin };