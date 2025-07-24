const { BrowserWindow } = require('electron');

function startLogin(mainWindow, windowUrl, callbackUrl) {
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

  loginWindow.loadURL(windowUrl);

  loginWindow.webContents.on('will-redirect', (event, url) => {
    console.log(`Redirecting to: ${url}`);
    if (url.startsWith(callbackUrl)) {
      event.preventDefault(); // Prevent the redirect from navigating the main window
      
      loginWindow.close();
      const urlObj = new URL(url);
      const email = urlObj.searchParams.get('email');
      const error = urlObj.searchParams.get('error');

      if (email) {
        mainWindow.webContents.send('login-success', { email });
      } else if (error) {
        mainWindow.webContents.send('login-failed', { error });
      }
    }
  });
}

module.exports = { startLogin };