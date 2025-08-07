const { BrowserWindow, screen } = require('electron');
const path = require('path');

class TrayWindow {
  constructor(tray = null) {
    this.window = null;
    this.tray = tray;
  }

  setTray(tray) {
    this.tray = tray;
  }

  create() {
    if (this.window) {
      this.window.close();
    }

    // Get cursor position and screen info
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    
    // Calculate position near tray icon
    const windowWidth = 200;
    const windowHeight = 220; // Increased height to ensure all content is visible
    
    let x, y;
    
    if (this.tray && process.platform === 'darwin') {
      // On macOS, try to get tray bounds and position menu underneath
      try {
        const trayBounds = this.tray.getBounds();
        
        if (trayBounds && trayBounds.width > 0) {
          // Position the window centered under the tray icon
          x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowWidth / 2));
          y = Math.round(trayBounds.y + trayBounds.height + 5); // 5px gap below tray
          
          // Ensure the window stays on screen
          const screenBounds = display.bounds;
          if (x < screenBounds.x) x = screenBounds.x + 10;
          if (x + windowWidth > screenBounds.x + screenBounds.width) {
            x = screenBounds.x + screenBounds.width - windowWidth - 10;
          }
          if (y + windowHeight > screenBounds.y + screenBounds.height) {
            y = trayBounds.y - windowHeight - 5; // Show above tray if no space below
          }
        } else {
          throw new Error('Invalid tray bounds');
        }
      } catch (error) {
        console.log('Could not get tray bounds, using fallback positioning:', error.message);
        // Fallback to top-right positioning
        x = display.bounds.x + display.bounds.width - windowWidth - 10;
        y = display.bounds.y + 30;
      }
    } else {
      // Position near the top-right of the screen (typical tray area on macOS)
      x = display.bounds.x + display.bounds.width - windowWidth - 10;
      y = display.bounds.y + 30; // Below menu bar
      
      // On Windows, tray is usually at bottom-right
      if (process.platform === 'win32') {
        y = display.bounds.y + display.bounds.height - windowHeight - 50;
      }
    }

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      frame: false,
      show: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      focusable: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Load the tray menu React app
    this.window.loadFile(path.join(__dirname, 'react/dist/tray.html'));

    // Hide when clicking outside
    this.window.on('blur', () => {
      this.hide();
    });

    // Handle window closed
    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  show() {
    if (!this.window) {
      this.create();
    }
    
    this.window.show();
    this.window.focus();
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  toggle() {
    if (this.window && this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible() {
    return this.window && this.window.isVisible();
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}

module.exports = TrayWindow;
