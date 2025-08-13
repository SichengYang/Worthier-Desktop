const { app } = require('electron');

/**
 * Single Instance Manager
 * Ensures only one instance of the application can run at a time
 */
class SingleInstanceManager {
  constructor() {
    this.mainWindow = null;
    this.gotTheLock = false;
  }

  /**
   * Initialize single instance control
   * @param {BrowserWindow} mainWindow - The main application window
   * @returns {boolean} - True if this is the primary instance, false if should quit
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    this.gotTheLock = app.requestSingleInstanceLock();

    if (!this.gotTheLock) {
      console.log("Another instance is already running. Quitting this instance.");
      app.quit();
      return false;
    }

    // Handle second instance attempts
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      console.log("Second instance detected, focusing main window.");
      this.focusMainWindow();
    });

    console.log("Single instance lock acquired successfully.");
    return true;
  }

  /**
   * Focus and restore the main window
   */
  focusMainWindow() {
    if (this.mainWindow) {
      try {
        // Restore if minimized
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        
        // Show if hidden
        if (!this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        
        // Bring to front and focus
        this.mainWindow.moveTop();
        this.mainWindow.focus();
        
        // Brief always-on-top to ensure visibility (especially on Windows/Linux)
        this.mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.setAlwaysOnTop(false);
          }
        }, 100);
        
        console.log("Main window focused successfully.");
      } catch (error) {
        console.error("Error focusing main window:", error);
      }
    } else {
      console.warn("Main window reference not available for focusing.");
    }
  }

  /**
   * Check if this instance has the lock
   * @returns {boolean}
   */
  hasLock() {
    return this.gotTheLock;
  }
}

module.exports = SingleInstanceManager;