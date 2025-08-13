const NotificationHelper = require('./notificationHelper');

class NotificationHandlers {
  constructor(dependencies) {
    // Initialize notification helper with dependencies
    this.notificationHelper = new NotificationHelper(dependencies);
  }

  /**
   * Updates the working time and extended working time
   */
  updateTimerSettings(workingTime, extendedWorkingTime) {
    this.notificationHelper.updateTimerSettings(workingTime, extendedWorkingTime);
  }

  /**
   * Creates and shows the startup notification
   */
  async createStartUpNotification() {
    await this.notificationHelper.createStartUpNotification();
  }

  /**
   * Handles timer completion and shows break notification
   */
  async handleTimerComplete(minutes) {
    await this.notificationHelper.handleTimerComplete(minutes);
  }

  /**
   * Get the notification manager instance (for IPC handlers if needed)
   */
  getNotificationManager() {
    return this.notificationHelper.getNotificationManager();
  }

  /**
   * Get the notification window instance (for IPC handlers if needed)
   */
  getNotificationWindow() {
    return this.notificationHelper.getNotificationWindow();
  }

  /**
   * Get the current working state
   */
  getWorking() {
    return this.notificationHelper.getWorking();
  }

  /**
   * Start timer process
   */
  async startTimerProcess(minutes) {
    await this.notificationHelper.startTimerProcess(minutes);
  }

  /**
   * Cancel timer process
   */
  async cancelTimerProcess() {
    await this.notificationHelper.cancelTimerProcess();
  }

  /**
   * Get timer process instance (for IPC handlers if needed)
   */
  getTimerProcess() {
    return this.notificationHelper.getTimerProcess();
  }
}

module.exports = NotificationHandlers;
