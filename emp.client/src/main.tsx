import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ColorModeScript } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { theme } from './shared/theme'
import { AppProvider } from './app/providers/app-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
