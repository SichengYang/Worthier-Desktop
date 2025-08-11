const { BrowserWindow, screen } = require('electron');
const path = require('path');

class RestWindow {
  constructor(settingsManager) {
    this.window = null;
    this.settingsManager = settingsManager;
    this.timerStartTime = null;
  }

  create() {
    if (this.window) {
      this.window.focus();
      return;
    }

    // Get the primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Match notification window dimensions
    const windowWidth = 400;
    const windowHeight = 150;
    
    // Position at top-right like notification window
    const x = screenWidth - windowWidth - 20;
    const y = 60;

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      show: false,
      frame: false,
      resizable: false,
      maximizable: false,
      minimizable: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      transparent: true,
      title: 'Rest Timer',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        webSecurity: true,
        preload: path.join(__dirname, 'restPreload.js')
      },
      icon: path.join(__dirname, 'icon.png')
    });

    // Load the React app with URL parameters
    const restTimeMinutes = this.settingsManager ? this.settingsManager.getRestTimeInMinutes() : 10;
    const theme = this.settingsManager ? this.settingsManager.loadTheme() : 'light';
    
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      const url = new URL('http://localhost:5174');
      url.searchParams.set('restTime', restTimeMinutes.toString());
      url.searchParams.set('theme', theme);
      this.window.loadURL(url.toString());
    } else {
      this.window.loadFile(path.join(__dirname, 'rest-react/dist/index.html'), {
        query: {
          restTime: restTimeMinutes.toString(),
          theme: theme
        }
      });
    }

    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window.show();
    });

    // Handle window closed
    this.window.on('closed', () => {
      this.window = null;
    });

    // Prevent navigation away from the app
    this.window.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      if (parsedUrl.origin !== 'http://localhost:5174' && !navigationUrl.startsWith('file://')) {
        event.preventDefault();
      }
    });

    // Open external links in default browser
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  show() {
    if (this.window) {
      if (this.window.isMinimized()) {
        this.window.restore();
      }
      this.window.show();
      this.window.focus();
      this.startTimer();
    } else {
      this.create();
    }
  }

  hide() {
    if (this.window) {
      this.window.hide();
      this.stopTimer();
    }
  }

  close() {
    if (this.window) {
      this.window.close();
      this.window = null;
      this.stopTimer();
    }
  }

  startTimer() {
    this.timerStartTime = Date.now();
    if (this.window && this.window.webContents) {
      const restTimeMinutes = this.settingsManager ? this.settingsManager.getRestTimeInMinutes() : 10;
      this.window.webContents.send('start-rest-timer', {
        restTimeMinutes: restTimeMinutes,
        startTime: this.timerStartTime
      });
    }
  }

  stopTimer() {
    this.timerStartTime = null;
    if (this.window && this.window.webContents) {
      this.window.webContents.send('stop-rest-timer');
    }
  }

  isVisible() {
    return this.window && this.window.isVisible();
  }

  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
}

module.exports = RestWindow;
