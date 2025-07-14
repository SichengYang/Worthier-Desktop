import { useState } from 'react'
import './App.css'

function App() {
  const start = () => {
    window.electronAPI?.sendMessage('custom-message', 'start');
  }

  const rest = () => {

  }

  return (
    <>
      <div id="notification_window">
        <h2>Ready to Work?</h2>
        <h2>Start Your Healthy Schedule!</h2>
        <div className="start-button">
          <button onClick={start}>
            Start Working
          </button>
          <button onClick={rest}>
            Rest!
          </button>
        </div>
      </div>
    </>
  )
}

export default App
