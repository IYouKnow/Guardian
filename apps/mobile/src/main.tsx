import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDebugConsoleCapture, isDebugConsoleEnabled } from './utils/debugLog'

installDebugConsoleCapture()

if (import.meta.env.DEV || isDebugConsoleEnabled()) {
  import('eruda').then(({ default: eruda }) => eruda.init())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
