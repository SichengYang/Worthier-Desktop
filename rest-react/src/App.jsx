import { useState, useEffect } from 'react'
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

function App() {
  const [elapsedTime, setElapsedTime] = useState(0) // Time elapsed in seconds
  const [restTimeMinutes, setRestTimeMinutes] = useState(10) // Target rest time in minutes
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Get URL parameters on component mount
    if (window.electronAPI) {
      const params = window.electronAPI.getUrlParams();
      setRestTimeMinutes(params.restTime);
      setTheme(params.theme);

      // Auto-start timer when component mounts
      setStartTime(Date.now());
      setIsTimerActive(true);
      setElapsedTime(0);
    }
  }, []);

  useEffect(() => {
    let interval = null
    if (isTimerActive && startTime) {
      interval = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerActive, startTime])

  useEffect(() => {
    // Listen for timer start events from main process (backup)
    if (window.electronAPI) {
      window.electronAPI.onStartTimer((event, data) => {
        setRestTimeMinutes(data.restTimeMinutes)
        setStartTime(data.startTime)
        setElapsedTime(0)
        setIsTimerActive(true)
      })

      window.electronAPI.onStopTimer(() => {
        setIsTimerActive(false)
        setElapsedTime(0)
        setStartTime(null)
      })

      return () => {
        window.electronAPI.removeAllListeners('start-rest-timer')
        window.electronAPI.removeAllListeners('stop-rest-timer')
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const targetRestTimeSeconds = restTimeMinutes * 60
  const isRestTimeComplete = elapsedTime >= targetRestTimeSeconds

  const getMessage = () => {
    if (isRestTimeComplete) {
      return "Ready to dive back in? Let's get productive!"
    }
    return "Rest time! Time to recharge!"
  }

  const getMessageClass = () => {
    return isRestTimeComplete ? "text-complete" : "text-rest"
  }

  const handleStartWork = () => {
    if (window.electronAPI) {
      window.electronAPI.startWork()
    }
  }

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    }
  }

  return (
    <div className={`app theme-${theme}`}>
      <div className="container-fluid h-100 p-3">
        {/* Close button */}
        <div className="close-button-container">
          <button
            className="close-button"
            onClick={handleClose}
            title="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="row h-100 align-items-center">
          <div className="col-12">
            <div className="text-center">
              {/* Timer Display */}
              <div className="mb-2">
                <h4 className="mb-1">{formatTime(elapsedTime)}</h4>
              </div>

              {/* Message */}
              <div className="mb-2">
                <p className={`mb-0 fw-bold ${getMessageClass()}`}>
                  {getMessage()}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="progress">
                  <div
                    className={`progress-bar ${isRestTimeComplete ? 'progress-complete' : 'progress-active'}`}
                    role="progressbar"
                    style={{
                      width: `${Math.min((elapsedTime / targetRestTimeSeconds) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Start Work Button */}
              <div>
                <button
                  className={`btn btn-start-work btn-sm ${!isRestTimeComplete ? 'not-recommended' : ''}`}
                  onClick={handleStartWork}
                  title={!isRestTimeComplete ? 'Consider resting a bit more for better productivity' : 'Start working now'}
                >
                  <i className="bi bi-play-fill"></i>
                  {isRestTimeComplete ? 'Start Work' : 'Start Early'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
