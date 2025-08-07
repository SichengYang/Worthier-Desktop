import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TrayMenu from './TrayMenu.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import './index.css'

createRoot(document.getElementById('tray-root')).render(
  <StrictMode>
    <ThemeProvider>
      <TrayMenu />
    </ThemeProvider>
  </StrictMode>,
)
