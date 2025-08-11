# Rest Window

A small, focused React application that provides a dedicated rest timer window within the Worthier Desktop app.

## Features

- **Focus Timer**: Configurable focus sessions (15, 20, 25, 30, 45 minutes, or 1 hour)
- **Break Timer**: Automatic 5-minute break periods after focus sessions
- **Visual Progress**: Circular progress indicator showing timer completion
- **Always on Top**: Rest window stays visible above other applications
- **Compact Design**: Small, unobtrusive window (280x320 pixels)
- **Gradient Theme**: Beautiful gradient background for a calming effect

## How to Use

### Opening the Rest Window
1. **Via Tray Menu**: Click on the Worthier tray icon in your system tray, then click "Rest Timer"
2. **Via IPC**: Use the electron API: `window.electronAPI.toggleRestWindow()`

### Using the Timer
1. **Select Focus Duration**: Use the dropdown to choose your preferred focus time
2. **Start Timer**: Click the "Start" button to begin your focus session
3. **Pause/Resume**: Click "Pause" during a session to pause, then "Start" to resume
4. **Reset**: Click "Reset" to return to the original time setting

### Timer Flow
1. **Focus Phase**: Timer counts down from your selected duration
2. **Break Phase**: After focus ends, automatically starts a 5-minute break
3. **Reset**: After break ends, returns to focus phase ready to start again

## Technical Details

### File Structure
```
rest-react/
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite build configuration
├── index.html           # Main HTML file
├── eslint.config.js     # ESLint configuration
└── src/
    ├── main.jsx         # React app entry point
    ├── App.jsx          # Main React component
    ├── App.css          # Styling for the rest timer
    └── index.css        # Global styles
```

### Integration Files
- `restWindow.js` - Electron window management class
- `restPreload.js` - Preload script for secure IPC communication
- Updated `main.js` - Added rest window IPC handlers
- Updated `preload.js` - Added toggleRestWindow API
- Updated `TrayMenu.jsx` - Added "Rest Timer" menu option

### Dependencies
- React 19.1.0
- Bootstrap 5.3.7 (for styling and icons)
- Vite 7.0.0 (for building)

## Development

### Building the Rest Window
```bash
cd rest-react
npm install
npm run build
```

### Development Mode
For development, you can run the rest-react app in dev mode:
```bash
cd rest-react
npm run dev
```

Then update the `restWindow.js` to point to `http://localhost:5174` instead of the built files.

## Customization

### Changing Timer Durations
Edit the `restTime` options in `rest-react/src/App.jsx`:
```jsx
<option value={15 * 60}>15 min</option>
<option value={20 * 60}>20 min</option>
// Add more options as needed
```

### Styling
Modify `rest-react/src/App.css` to change:
- Background gradient colors
- Timer circle colors
- Button styles
- Font sizes

### Window Properties
Modify `restWindow.js` to change:
- Window dimensions (`windowWidth`, `windowHeight`)
- Window behavior (`alwaysOnTop`, `resizable`, etc.)
- Window positioning

## API Reference

### Main Process (IPC Handlers)
- `show-rest-window` - Show the rest window
- `close-rest-window` - Close the rest window
- `minimize-rest-window` - Minimize the rest window
- `toggle-rest-window` - Toggle rest window visibility

### Renderer Process (Electron API)
- `window.electronAPI.toggleRestWindow()` - Toggle rest window visibility

## Browser Compatibility
The rest window uses modern React and CSS features. It's designed to run in the latest Electron environment with Chromium support.
