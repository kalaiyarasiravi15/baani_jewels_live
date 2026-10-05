import { ensureSession, migrateBrowserStorage } from './sessionClient';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './admin-global-overrides.css'
import App from './App.jsx'

try {
  await ensureSession();
  await migrateBrowserStorage();
} catch (err) {
  console.warn('Session initialization warning:', err.message);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
