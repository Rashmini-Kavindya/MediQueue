import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicScreen from './PublicScreen.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {window.location.pathname === '/' || window.location.pathname === '/public-screen'
      ? <PublicScreen />
      : <App />}
  </StrictMode>,
)
