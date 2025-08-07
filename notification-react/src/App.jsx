import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [theme, setTheme] = useState('light')
  const [notificationData, setNotificationData] = useState({
    title: 'Worthier Timer Ready',
    content: 'Your productivity timer is running. Ready to start working?',
    button1: { text: 'Start Timer' },
    button2: { text: 'Later' },
    context: 'startup'
  })

  useEffect(() => {
    // Listen for notification data from the main process
    if (window.electronNotification) {
      window.electronNotification.onData((data) => {
        setNotificationData(data)
        if (data.theme) {
          setTheme(data.theme)
        }
      })
    }

    // Parse URL parameters for theme and data (fallback)
    const urlParams = new URLSearchParams(window.location.search)
    const themeParam = urlParams.get('theme')
    const dataParam = urlParams.get('data')

    if (themeParam) {
      setTheme(themeParam)
    }
    
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam))
        setNotificationData(data)
      } catch (e) {
        console.error('Failed to parse notification data:', e)
      }
    }
  }, [])

  const handleClose = () => {
    if (window.electronNotification) {
      window.electronNotification.close()
    }
  }

  const handleButton1Click = (e) => {
    e.stopPropagation()
    if (window.electronNotification) {
      window.electronNotification.button1Click()
    }
  }

  const handleButton2Click = (e) => {
    e.stopPropagation()
    if (window.electronNotification) {
      window.electronNotification.button2Click()
    }
  }

  const handleContainerClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div 
      className={`notification-container ${theme}`}
      onClick={handleContainerClick}
    >
      <button className="close-button" onClick={handleClose}>
        ×
      </button>
      
      <div className="notification-header">
        <div className="notification-title">{notificationData.title}</div>
        <div className="notification-content">{notificationData.content}</div>
      </div>
      
      <div className="notification-buttons">
        {notificationData.button1 && (
          <button 
            className="notification-button primary" 
            onClick={handleButton1Click}
          >
            {notificationData.button1.text}
          </button>
        )}
        {notificationData.button2 && (
          <button 
            className="notification-button secondary" 
            onClick={handleButton2Click}
          >
            {notificationData.button2.text}
          </button>
        )}
      </div>
    </div>
  )
}

export default App
