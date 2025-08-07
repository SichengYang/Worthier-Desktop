const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class NotificationWindow {
    constructor() {
        this.activeNotifications = new Map(); // Track active notification windows
        this.notificationCounter = 0; // Unique ID for each notification
        this.setupIpcHandlers();
    }

    setupIpcHandlers() {
        // Handle button clicks from notification windows
        ipcMain.handle('notification-button1-click', (event, notificationId) => {
            const notification = this.activeNotifications.get(notificationId);
            if (notification && notification.button1Handler) {
                notification.button1Handler();
                this.closeNotification(notificationId);
            }
        });

        ipcMain.handle('notification-button2-click', (event, notificationId) => {
            const notification = this.activeNotifications.get(notificationId);
            if (notification && notification.button2Handler) {
                notification.button2Handler();
                this.closeNotification(notificationId);
            }
        });

        // Handle notification window close
        ipcMain.handle('notification-close', (event, notificationId) => {
            this.closeNotification(notificationId);
        });

        // Handle getting notification ID from renderer
        ipcMain.handle('get-notification-id', (event) => {
            // Find the notification ID for the current window
            const webContents = event.sender;
            const window = BrowserWindow.fromWebContents(webContents);
            
            for (const [id, notification] of this.activeNotifications) {
                if (notification.window === window) {
                    return id;
                }
            }
            return null;
        });
    }

    /**
     * Create a React-based notification window
     * @param {Object} options - Notification configuration
     * @param {string} options.title - Notification title
     * @param {string} options.content - Notification content/message
     * @param {Object} options.button1 - First button configuration {text, handler}
     * @param {Object} options.button2 - Second button configuration {text, handler}
     * @param {Function} options.onClose - Optional callback when notification is closed
     * @param {Object} options.style - Optional styling options
     * @param {number} options.autoClose - Optional auto-close timer in milliseconds
     * @param {string} options.theme - Optional theme ('light', 'dark', 'pink')
     * @param {string} options.context - Optional context identifier
     */
    async create(options) {
        const notificationId = ++this.notificationCounter;
        
        // Validate required options
        if (!options.title || !options.content) {
            throw new Error('Notification requires both title and content');
        }

        // Default styling options
        const defaultStyle = {
            width: 400,
            height: 150,
            x: null, // Will be calculated
            y: null  // Will be calculated
        };

        const style = { ...defaultStyle, ...options.style };

        // Create the notification window
        const notificationWindow = new BrowserWindow({
            width: style.width,
            height: style.height,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            movable: true,
            minimizable: false,
            maximizable: false,
            closable: true,
            skipTaskbar: true,
            show: false,
            transparent: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'notificationPreload.js')
            }
        });

        // Position the window (default to center-right of screen)
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        
        // Position notification in the top-right corner with some padding
        const x = style.x !== null ? style.x : (screenWidth - style.width - 20);
        const y = style.y !== null ? style.y : 20;
        
        notificationWindow.setPosition(x, y);

        // Store notification data
        const notificationData = {
            id: notificationId,
            window: notificationWindow,
            title: options.title,
            content: options.content,
            button1: options.button1 || null,
            button2: options.button2 || null,
            button1Handler: options.button1?.handler,
            button2Handler: options.button2?.handler,
            onClose: options.onClose,
            theme: options.theme || 'light',
            context: options.context || 'general'
        };

        this.activeNotifications.set(notificationId, notificationData);

        // Load the React notification HTML with theme as query parameter
        const notificationReactPath = path.join(__dirname, 'notification-react/dist/index.html');
        const theme = options.theme || 'light';
        await notificationWindow.loadFile(notificationReactPath, { query: { theme: theme } });

        // Send notification data to the renderer
        notificationWindow.webContents.once('did-finish-load', () => {
            const dataToSend = {
                id: notificationId,
                title: options.title,
                content: options.content,
                button1: options.button1 ? { text: options.button1.text } : null,
                button2: options.button2 ? { text: options.button2.text } : null,
                theme: options.theme || 'light',
                context: options.context || 'general'
            };
            
            notificationWindow.webContents.send('notification-data', dataToSend);
        });

        // Handle window close
        notificationWindow.on('closed', () => {
            this.closeNotification(notificationId);
        });

        // Show the window with animation
        notificationWindow.once('ready-to-show', () => {
            notificationWindow.show();
            
            // Add slide-in animation
            const startX = x + style.width;
            notificationWindow.setPosition(startX, y);
            
            const animateIn = () => {
                // Check if window still exists and is not destroyed
                if (notificationWindow.isDestroyed()) {
                    return;
                }
                
                try {
                    const currentPos = notificationWindow.getPosition();
                    const targetX = x;
                    const distance = currentPos[0] - targetX;
                    
                    // If we're close enough to the target or have reached/passed it, snap to final position
                    if (Math.abs(distance) <= 2 || distance <= 0) {
                        notificationWindow.setPosition(targetX, y);
                        return; // Animation complete
                    }
                    
                    // Calculate step size (faster at the beginning, slower near the end)
                    const step = Math.max(3, Math.ceil(distance / 8));
                    const newX = currentPos[0] - step;
                    
                    notificationWindow.setPosition(newX, y);
                    setTimeout(animateIn, 16); // ~60fps
                    
                } catch (error) {
                    // Window might have been destroyed during animation
                    console.warn('Animation stopped due to window destruction:', error.message);
                }
            };
            
            animateIn();
        });

        // Auto-close if specified
        if (options.autoClose && options.autoClose > 0) {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, options.autoClose);
        }

        return notificationId;
    }

    /**
     * Close a specific notification
     * @param {number} notificationId - The ID of the notification to close
     */
    closeNotification(notificationId) {
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            if (notification.onClose) {
                notification.onClose();
            }
            
            if (notification.window && !notification.window.isDestroyed()) {
                notification.window.close();
            }
            
            this.activeNotifications.delete(notificationId);
        }
    }

    /**
     * Close all active notifications
     */
    closeAll() {
        for (const [id] of this.activeNotifications) {
            this.closeNotification(id);
        }
    }

    /**
     * Get count of active notifications
     */
    getActiveCount() {
        return this.activeNotifications.size;
    }

    /**
     * Predefined notification types for common use cases
     */
    
    // Get current theme from theme.js (same as main app)
    getCurrentTheme() {
        try {
            const { loadTheme } = require('./theme');
            return loadTheme();
        } catch (error) {
            console.warn('Could not load theme from theme.js, defaulting to light:', error);
            return 'light';
        }
    }
    
    // Timer completion notification
    async showTimerComplete(onStartBreak, onContinueWorking) {
        return this.create({
            title: "Break Time!",
            content: "You've completed your focus session. Time to take a break!",
            button1: { 
                text: "Start Break", 
                handler: onStartBreak || (() => console.log('Starting break...'))
            },
            button2: { 
                text: "Keep Working", 
                handler: onContinueWorking || (() => console.log('Continuing work...'))
            },
            theme: this.getCurrentTheme(),
            context: 'timer-complete',
            autoClose: 30000 // Auto-close after 30 seconds
        });
    }

    // Startup notification
    async showStartupNotification(onStartTimer, onLater) {
        return this.create({
            title: "Worthier Timer Ready",
            content: "Your productivity timer is running. Ready to start working?",
            button1: { 
                text: "Start Timer", 
                handler: onStartTimer || (() => console.log('Starting timer...'))
            },
            button2: { 
                text: "Later", 
                handler: onLater || (() => console.log('Maybe later...'))
            },
            theme: this.getCurrentTheme(),
            context: 'startup',
            autoClose: 10000 // Auto-close after 10 seconds
        });
    }

    // Settings confirmation notification
    async showSettingsConfirmation(message, onConfirm, onCancel) {
        return this.create({
            title: "Confirm Settings",
            content: message || "Are you sure you want to apply these changes?",
            button1: { 
                text: "Cancel", 
                handler: onCancel || (() => console.log('Settings cancelled'))
            },
            button2: { 
                text: "Apply", 
                handler: onConfirm || (() => console.log('Settings applied'))
            },
            theme: this.getCurrentTheme(),
            context: 'settings-confirmation'
        });
    }

    // Permission request notification
    async showPermissionRequest(permissionType, onGrant, onDeny) {
        const messages = {
            fullscreen: "Grant permission to detect fullscreen applications for smart notifications?",
            meeting: "Grant permission to detect meeting software for smart notifications?",
            both: "Grant permissions to detect fullscreen and meeting applications for smart notifications?"
        };

        return this.create({
            title: "Permission Required",
            content: messages[permissionType] || "Permission is required for this feature.",
            button1: { 
                text: "Not Now", 
                handler: onDeny || (() => console.log('Permission denied'))
            },
            button2: { 
                text: "Grant", 
                handler: onGrant || (() => console.log('Permission granted'))
            },
            theme: this.getCurrentTheme(),
            context: 'permission-request'
        });
    }

    // Error notification
    async showError(title, message, onOk) {
        return this.create({
            title: title || "Error",
            content: message || "An error occurred.",
            button1: { 
                text: "OK", 
                handler: onOk || (() => console.log('Error acknowledged'))
            },
            theme: this.getCurrentTheme(),
            context: 'error',
            autoClose: 8000
        });
    }

    // Success notification
    async showSuccess(title, message, onOk) {
        return this.create({
            title: title || "Success",
            content: message || "Operation completed successfully.",
            button1: { 
                text: "OK", 
                handler: onOk || (() => console.log('Success acknowledged'))
            },
            theme: this.getCurrentTheme(),
            context: 'success',
            autoClose: 5000
        });
    }

    // Information notification with single button
    async showInfo(title, message, buttonText, onButtonClick) {
        return this.create({
            title: title || "Information",
            content: message || "Here's some information for you.",
            button1: { 
                text: buttonText || "OK", 
                handler: onButtonClick || (() => console.log('Info acknowledged'))
            },
            theme: this.getCurrentTheme(),
            context: 'info',
            autoClose: 7000
        });
    }
}

module.exports = NotificationWindow;
