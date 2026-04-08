import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './store/useAppStore'
import App from './App'

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
