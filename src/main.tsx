import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FocusStyleManager } from '@blueprintjs/core'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/index.scss'

// Import Blueprint.js styles
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/select/lib/css/blueprint-select.css'

// Only show focus outlines when navigating via keyboard, not mouse clicks
FocusStyleManager.onlyShowFocusOnTabs()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
