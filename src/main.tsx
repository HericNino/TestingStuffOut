import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MarketProvider } from './lib/MarketProvider'
import { StoreProvider } from './lib/StoreProvider'
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-400-italic.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <MarketProvider>
        <App />
      </MarketProvider>
    </StoreProvider>
  </StrictMode>,
)
