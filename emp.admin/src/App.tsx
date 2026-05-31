import { AppProvider } from './app/providers/app-provider'
import { AppRouter } from './app/router'

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

export default App
