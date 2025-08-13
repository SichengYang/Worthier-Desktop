import { useState, useEffect } from 'react'
import './App.css'
import Title from './Title.jsx'
import Menu from './Menu.jsx'
import Content from './Content.jsx'
import UserGuide from './UserGuide.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { UserProvider } from './UserContext.jsx'

function App() {
  const [page, setPage] = useState(0);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [isCheckingSettings, setIsCheckingSettings] = useState(true);

  useEffect(() => {
    // Check if settings file exists on app start
    const checkFirstTimeUser = async () => {
      try {
        const settingsExist = await window.electronAPI.checkSettingsExist();
        if (!settingsExist) {
          console.log('First time user detected - showing user guide');
          setShowUserGuide(true);
        } else {
          console.log('Settings file exists - skipping user guide');
        }
      } catch (error) {
        console.error('Error checking settings file:', error);
        // If there's an error, proceed without the guide
      } finally {
        setIsCheckingSettings(false);
      }
    };

    checkFirstTimeUser();
  }, []);

  const handleUserGuideComplete = () => {
    console.log('User guide completed');
    setShowUserGuide(false);
  };

  // Show loading state while checking settings
  if (isCheckingSettings) {
    return (
      <ThemeProvider>
        <UserProvider>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            color: 'var(--text-color)',
            fontSize: '16px'
          }}>
            Loading...
          </div>
        </UserProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        {showUserGuide && (
          <UserGuide onComplete={handleUserGuideComplete} />
        )}
        <div id="header">
          <Title />
        </div>
        <div id="content">
          <Content page={page}/>
        </div>
        <div id="menu">
          <Menu setPage={setPage} currentPage={page}/>
        </div>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App
