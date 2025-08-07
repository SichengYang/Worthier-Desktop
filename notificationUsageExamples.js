/**
 * Usage Examples for React NotificationWindow System
 * 
 * This file demonstrates how to use the React notification window system
 * from both the main process and renderer process.
 */

// ========================================
// MAIN PROCESS USAGE (main.js or other main process files)
// ========================================

const NotificationWindow = require('./notificationWindow');

// Initialize the notification window system
const notificationWindow = new NotificationWindow();

// Example 1: Basic notification with custom JSON data
async function showBasicNotification() {
    const notificationId = await notificationWindow.create({
        title: "Timer Complete!",
        content: "Your 25-minute focus session has ended. What would you like to do next?",
        button1: {
            text: "Start Break",
            handler: () => {
                console.log("User chose to start break");
                // Add your break logic here
            }
        },
        button2: {
            text: "Keep Working",
            handler: () => {
                console.log("User chose to continue working");
                // Add your continue working logic here
            }
        },
        theme: 'light', // 'light', 'dark', or 'pink'
        context: 'timer-complete',
        autoClose: 30000, // Auto-close after 30 seconds
        onClose: () => {
            console.log("Notification was closed");
        }
    });
    
    console.log(`Created notification with ID: ${notificationId}`);
    return notificationId;
}

// Example 2: Using predefined notification types
async function showPredefinedNotifications() {
    // Startup notification
    await notificationWindow.showStartupNotification(
        () => console.log("Starting timer..."),
        () => console.log("Maybe later...")
    );
    
    // Timer complete notification
    await notificationWindow.showTimerComplete(
        () => console.log("Starting break..."),
        () => console.log("Continuing work...")
    );
    
    // Settings confirmation
    await notificationWindow.showSettingsConfirmation(
        "Your settings will be updated and may require permissions.",
        () => console.log("Settings confirmed"),
        () => console.log("Settings cancelled")
    );
    
    // Permission request
    await notificationWindow.showPermissionRequest(
        'fullscreen',
        () => console.log("Permission granted"),
        () => console.log("Permission denied")
    );
    
    // Error notification
    await notificationWindow.showError(
        "Connection Failed",
        "Unable to connect to the server.",
        () => console.log("Error acknowledged")
    );
    
    // Success notification
    await notificationWindow.showSuccess(
        "Settings Saved",
        "Your preferences have been updated successfully.",
        () => console.log("Success acknowledged")
    );
    
    // Info notification
    await notificationWindow.showInfo(
        "Update Available",
        "A new version of the app is available for download.",
        "Download",
        () => console.log("Download initiated")
    );
}

// Example 3: Custom styled notification with specific positioning
async function showCustomNotification() {
    return await notificationWindow.create({
        title: "Custom Notification",
        content: "This notification has custom styling and positioning.",
        button1: {
            text: "Acknowledge",
            handler: () => console.log("Custom notification acknowledged")
        },
        style: {
            width: 450,
            height: 200,
            x: 100,  // Custom X position
            y: 100   // Custom Y position
        },
        theme: 'dark',
        context: 'custom',
        autoClose: 15000
    });
}

// Example 4: Multiple stacked notifications
async function showMultipleNotifications() {
    const notifications = [];
    
    // Show notifications with different Y positions to stack them
    notifications.push(await notificationWindow.create({
        title: "Notification 1",
        content: "This is the first notification",
        button1: { text: "OK", handler: () => console.log("Notification 1 OK") },
        style: { y: 20 }
    }));
    
    notifications.push(await notificationWindow.create({
        title: "Notification 2", 
        content: "This is the second notification",
        button1: { text: "OK", handler: () => console.log("Notification 2 OK") },
        style: { y: 240 }
    }));
    
    notifications.push(await notificationWindow.create({
        title: "Notification 3",
        content: "This is the third notification",
        button1: { text: "OK", handler: () => console.log("Notification 3 OK") },
        style: { y: 460 }
    }));
    
    return notifications;
}

// ========================================
// RENDERER PROCESS USAGE (from React components or renderer scripts)
// ========================================

// Example 1: Basic notification from renderer process
async function showNotificationFromRenderer() {
    if (window.electronAPI && window.electronAPI.showReactNotification) {
        const notificationId = await window.electronAPI.showReactNotification({
            title: "Renderer Notification",
            content: "This notification was triggered from the renderer process.",
            button1: {
                text: "Got it!",
                handler: () => console.log("Renderer notification acknowledged")
            },
            theme: 'light'
        });
        
        console.log(`Renderer created notification ID: ${notificationId}`);
        return notificationId;
    }
}

// Example 2: Using predefined methods from renderer
async function showPredefinedFromRenderer() {
    if (window.electronAPI) {
        // Show startup notification
        await window.electronAPI.showStartupNotification(
            () => console.log("Timer started from renderer"),
            () => console.log("Timer deferred from renderer")
        );
        
        // Show success notification
        await window.electronAPI.showSuccessNotification(
            "Operation Complete",
            "The operation was completed successfully.",
            () => console.log("Success acknowledged from renderer")
        );
        
        // Show error notification
        await window.electronAPI.showErrorNotification(
            "Error Occurred",
            "An error occurred while processing your request.",
            () => console.log("Error acknowledged from renderer")
        );
    }
}

// Example 3: Managing notifications from renderer
async function manageNotificationsFromRenderer() {
    if (window.electronAPI) {
        // Get notification count
        const count = await window.electronAPI.getNotificationCount();
        console.log(`Active notifications: ${count}`);
        
        // Close all notifications
        await window.electronAPI.closeAllNotifications();
        console.log("All notifications closed");
    }
}

// ========================================
// IPC COMMUNICATION EXAMPLES
// ========================================

// The JSON data structure that gets passed to the React component:
const exampleNotificationData = {
    id: 1,
    title: "Example Notification",
    content: "This is the notification message content.",
    button1: {
        text: "Primary Action"
        // Note: handler functions are not passed to React, only handled in main process
    },
    button2: {
        text: "Secondary Action"
        // Note: handler functions are not passed to React, only handled in main process  
    },
    theme: 'light', // 'light', 'dark', or 'pink'
    context: 'example' // Custom context identifier
};

// ========================================
// INTEGRATION WITH EXISTING TIMER LOGIC
// ========================================

// Example integration with timer completion
function onTimerComplete(minutes) {
    notificationWindow.showTimerComplete(
        () => {
            // Start break logic
            console.log(`Starting break after ${minutes} minutes of work`);
            // Send break signal to UI
            mainWindow.webContents.send("break");
            working = false;
            tray.setContextMenu(createMenu());
        },
        () => {
            // Continue working logic
            console.log("User chose to continue working");
            // Start another timer session
            startTimerProcess(working_time);
        }
    );
}

// Example integration with app startup
function onAppStartup() {
    notificationWindow.showStartupNotification(
        () => {
            // Start timer logic
            console.log("Starting timer from startup notification");
            startTimerProcess(working_time);
        },
        () => {
            // Later logic
            console.log("User chose to start timer later");
        }
    );
}

// Example integration with settings changes
function onSettingsChange(newSettings) {
    notificationWindow.showSettingsConfirmation(
        "Your notification settings will be updated. This may require system permissions.",
        () => {
            // Apply settings logic
            console.log("Applying new settings...");
            settingsManager.saveSettings(newSettings);
            notificationWindow.showSuccess(
                "Settings Applied",
                "Your notification preferences have been updated."
            );
        },
        () => {
            // Cancel settings logic
            console.log("Settings change cancelled");
        }
    );
}

// ========================================
// ERROR HANDLING EXAMPLES
// ========================================

async function notificationWithErrorHandling() {
    try {
        const notificationId = await notificationWindow.create({
            title: "Test Notification",
            content: "Testing error handling",
            button1: {
                text: "OK",
                handler: () => console.log("OK clicked")
            }
        });
        
        console.log(`Notification created successfully: ${notificationId}`);
    } catch (error) {
        console.error('Failed to create notification:', error);
        
        // Fallback to native notification
        const fallbackNotification = new Notification({
            title: "Test Notification",
            body: "Testing error handling (fallback)"
        });
        
        fallbackNotification.show();
    }
}

module.exports = {
    showBasicNotification,
    showPredefinedNotifications,
    showCustomNotification,
    showMultipleNotifications,
    onTimerComplete,
    onAppStartup,
    onSettingsChange,
    notificationWithErrorHandling
};
