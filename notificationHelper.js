const { BrowserWindow, Notification, app } = require("electron");
const { fork } = require("child_process");
const path = require("path");
const NotificationManager = require('./notificationManager');
const NotificationWindow = require('./notificationWindow');

class NotificationHelper {
  constructor(dependencies) {
    // Initialize notification-related components
    this.notificationManager = new NotificationManager();
    this.notificationWindow = new NotificationWindow();
    
    // Store dependencies from main
    this.mainWindow = dependencies.mainWindow;
    this.restWindow = dependencies.restWindow;
    this.timeRecorder = dependencies.timeRecorder;
    this.workingTime = dependencies.workingTime;
    this.extendedWorkingTime = dependencies.extendedWorkingTime;
    this.setWorkingState = dependencies.setWorkingState; // Callback to update main.js working state
    
    // Timer process state
    this.timerProcess = null;
    this.working = false;
  }

  /**
   * Updates the working time and extended working time
   */
  updateTimerSettings(workingTime, extendedWorkingTime) {
    this.workingTime = workingTime;
    this.extendedWorkingTime = extendedWorkingTime;
  }

  /**
   * Helper function to send updated working records to all frontend windows
   */
  sendUpdatedRecordsToFrontend() {
    try {
      if (this.timeRecorder) {
        const recentRecords = this.timeRecorder.getRecentRecords(7);
        console.log('📊 Sending updated records to frontend after timer event');
        
        // Send to all windows
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('recent-records', recentRecords);
          }
        });
      }
    } catch (error) {
      console.error('Error sending updated records to frontend:', error);
    }
  }

  /**
   * Notify all windows about working state change and sync with main.js
   */
  notifyWorkingStateChange() {
    // Update main.js working state
    if (this.setWorkingState) {
      this.setWorkingState(this.working);
    }
    
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('working-state-changed', this.working);
      }
    });
  }

  /**
   * Cancel the timer process
   */
  async cancelTimerProcess() {
    if (this.timerProcess) {
      console.log("Canceling timer process...");
      try {
        this.timerProcess.send("cancel");
      } catch (error) {
        console.error("Error sending cancel to timer process:", error);
        // If sending cancel fails, just kill the process
        this.timerProcess.kill();
      }
      this.timerProcess = null;
      this.working = false;
      
      // Sync working state with main.js and notify windows
      this.notifyWorkingStateChange();
      
      // Send updated records to frontend after canceling
      this.sendUpdatedRecordsToFrontend();
    }
  }

  /**
   * Handle user not responding to break notification
   */
  async userNotResponding() {
    if (this.timerProcess) {
      console.log("Handler for user not responding to break notification...");
      try {
        this.timerProcess.send("no-response");
      } catch (error) {
        console.error("Error sending no-response to timer process:", error);
        // If sending no-response fails, just kill the process
        this.timerProcess.kill();
      }
      this.timerProcess = null;
      this.working = false;
      
      // Sync working state with main.js and notify windows
      this.notifyWorkingStateChange();
      
      // Send updated records to frontend after no response
      this.sendUpdatedRecordsToFrontend();
    }
  }

  /**
   * Start the timer process
   */
  async startTimerProcess(minutes = this.workingTime) {
    console.log("Starting timer process...");

    // Clean up any existing timer process first
    await this.cancelTimerProcess();

    // Hide the rest window if it's showing (user is finishing break)
    if (this.restWindow) {
      console.log("Hiding break window - starting work...");
      this.restWindow.close();

      // Reset always on top setting
      if (this.restWindow.window) {
        this.restWindow.window.setAlwaysOnTop(false);
      }
    }

    // Pass the userData path to the timer process
    const userDataPath = app.getPath('userData');
    this.timerProcess = fork(path.join(__dirname, "timer.js"), [minutes.toString(), userDataPath]);

    this.mainWindow.webContents.send("start");

    //change menu content
    this.working = true; // Set working state

    // Notify all windows about working state change
    this.notifyWorkingStateChange();

    this.timerProcess.on("message", (msg) => {
      if (msg.type === "break-time") {
        // Handle timer completion through notification handlers
        this.handleTimerComplete(minutes);
      }
    });

    // Clean up timerProcess reference when it exits
    this.timerProcess.on('exit', async (code, signal) => {
      console.log(`Timer process exited with code ${code} and signal ${signal}`);
      this.timerProcess = null;
      this.working = false; // Update working state when timer process exits

      // Sync working state with main.js and notify windows
      this.notifyWorkingStateChange();
      
      // Send updated records to frontend after timer exits
      this.sendUpdatedRecordsToFrontend();
    });

    // Handle timer process errors
    this.timerProcess.on('error', async (error) => {
      console.error('Timer process error:', error);
      this.timerProcess = null;
      this.working = false; // Update working state when timer process has an error

      // Sync working state with main.js and notify windows
      this.notifyWorkingStateChange();
      
      // Send updated records to frontend after timer error
      this.sendUpdatedRecordsToFrontend();
    });
  }

  /**
   * Creates and shows the startup notification
   */
  /**
   * Creates and shows the startup notification
   */
  async createStartUpNotification() {
    // Startup notification using React notification window
    try {
      await this.notificationWindow.showStartupNotification(
        () => {
          console.log("Starting timer from startup notification...");
          this.startTimerProcess(this.workingTime); // Fire and forget - user doesn't need to wait
        },
        () => {
          console.log("User chose to start timer later...");
        }
      );
    } catch (error) {
      console.error('Error showing startup notification window:', error);

      // Fallback to native notification if React notification fails
      let notification = new Notification({
        title: "Worthier Timer Ready",
        body: "Your productivity timer is running. Click to start working!",
      });

      notification.on("click", () => {
        this.startTimerProcess(this.workingTime); // Fire and forget - user doesn't need to wait
      });

      notification.on("close", () => {
        console.log("Startup notification closed");
      });

      notification.show();
    }
  }

  /**
   * Handles timer completion and shows break notification
   */
  async handleTimerComplete(minutes) {
    console.log("Timer completed naturally - break time!");
    
    // Send updated records to frontend immediately when timer completes
    this.sendUpdatedRecordsToFrontend();
    
    // Periodically check if notification should be shown
    const notificationCheckInterval = setInterval(async () => {
      const shouldShow = await this.notificationManager.shouldShowNotification();
      if (shouldShow) {
        clearInterval(notificationCheckInterval); // Stop further checks

        try {
          console.log("Showing timer complete notification with extended time:", this.extendedWorkingTime, " minutes");
          this.notificationWindow.showTimerComplete(
            () => {
              console.log("Taking break from notification...");

              // Cancel the timer process
              this.cancelTimerProcess(); // Fire and forget - user action doesn't need to wait

              this.mainWindow.webContents.send("break");

              // Show the break/rest window and keep it visible until break is finished
              if (this.restWindow) {
                console.log("Showing break window...");
                this.restWindow.show();

                // Make sure the window stays on top during break
                if (this.restWindow.window) {
                  this.restWindow.window.setAlwaysOnTop(true);
                  this.restWindow.window.focus();
                }
              }

              // Note: working state is already updated by cancelTimerProcess
            },
            () => {
              let extendCount = this.timeRecorder.addExtendedSession(); // Record extended session
              console.log("Extending work session with current count:", extendCount);

              // Start another timer session
              this.startTimerProcess(this.extendedWorkingTime); // Fire and forget - user action doesn't need to wait
            },
            this.extendedWorkingTime,
            () => {
              // onClose handler - assume user went to rest if they don't respond
              console.log("Timer complete notification auto-closed - assuming user went to rest");

              // Cancel the timer process
              this.userNotResponding();

              this.mainWindow.webContents.send("break");

              // Show the break/rest window and keep it visible until break is finished
              if (this.restWindow) {
                console.log("Showing break window (auto-close scenario)...");
                this.restWindow.show();

                // Make sure the window stays on top during break
                if (this.restWindow.window) {
                  this.restWindow.window.setAlwaysOnTop(true);
                  this.restWindow.window.focus();
                }
              }

              // Note: working state is already updated by userNotResponding
            }
          );
        } catch (error) {
          console.error('Error showing break notification window:', error);

          // Fallback to native notification
          this._showFallbackBreakNotification(minutes);
        }
      }
      else {
        console.log("No notification shown, user is focusing on tasks.");
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Shows fallback native notification for break time
   */
  _showFallbackBreakNotification(minutes) {
    const notification = new Notification({
      title: "Break Time!",
      body: `You've been working for ${minutes} minutes. Time to take a break.`,
    });

    notification.on("click", () => {
      console.log("Break notification clicked");

      // Cancel the timer process
      this.cancelTimerProcess(); // Fire and forget - user action doesn't need to wait

      this.mainWindow.webContents.send("break");

      // Show the break/rest window and keep it visible until break is finished
      if (this.restWindow) {
        console.log("Showing break window (fallback notification)...");
        this.restWindow.show();

        // Make sure the window stays on top during break
        if (this.restWindow.window) {
          this.restWindow.window.setAlwaysOnTop(true);
          this.restWindow.window.focus();
        }
      }

      // Note: working state is already updated by cancelTimerProcess
    });

    notification.show();
  }

  /**
   * Get the notification manager instance
   */
  getNotificationManager() {
    return this.notificationManager;
  }

  /**
   * Get the notification window instance
   */
  getNotificationWindow() {
    return this.notificationWindow;
  }

  /**
   * Get the current working state
   */
  getWorking() {
    return this.working;
  }

  /**
   * Get the timer process instance
   */
  getTimerProcess() {
    return this.timerProcess;
  }
}

module.exports = NotificationHelper;
