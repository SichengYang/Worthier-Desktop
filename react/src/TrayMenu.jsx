import { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext.jsx';
import './TrayMenu.css';

const TrayMenu = () => {
  const [isWorking, setIsWorking] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Listen for working state changes from main process
    const handleWorkingStateChange = (event, working) => {
      setIsWorking(working);
    };

    window.electronAPI.onWorkingStateChange(handleWorkingStateChange);

    // Get initial working state
    window.electronAPI.getWorkingState().then(setIsWorking);

    return () => {
      window.electronAPI.removeWorkingStateListener(handleWorkingStateChange);
    };
  }, []);

  const handleWorkToggle = () => {
    if (isWorking) {
      window.electronAPI.takeBreak();
    } else {
      window.electronAPI.startWorking();
    }
  };

  const handleOpenApp = () => {
    window.electronAPI.openMainWindow();
  };

  const handleOpenRestTimer = () => {
    window.electronAPI.toggleRestWindow();
  };

  const handleQuit = () => {
    window.electronAPI.quitApp();
  };

  return (
    <div className={`tray-menu ${theme}`}>
      <div className="tray-menu-header">
        <h4>Worthier</h4>
      </div>

      <div className="tray-menu-content">
        <button
          className={`menu-item primary ${isWorking ? 'break' : 'work'}`}
          onClick={handleWorkToggle}
        >
          <i className={`bi ${isWorking ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
          {isWorking ? 'Take a Break' : 'Start Working'}
        </button>

        <button className="menu-item" onClick={handleOpenApp}>
          <i className="bi bi-window"></i>
          Open App
        </button>

        <div className="menu-divider"></div>

        <button className="menu-item danger" onClick={handleQuit}>
          <i className="bi bi-x-circle"></i>
          Quit
        </button>
      </div>
    </div>
  );
};

export default TrayMenu;
