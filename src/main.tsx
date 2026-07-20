import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { seedDevDataIfNeeded } from './lib/devMode'
import { initAnalytics } from './lib/analytics'
import './styles/globals.css'

async function bootstrap() {
  // Product analytics + error monitoring. Dormant until keys are configured.
  void initAnalytics()

  // In offline dev mode this seeds a local lab, staff, and test menu.
  await seedDevDataIfNeeded()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

void bootstrap()
