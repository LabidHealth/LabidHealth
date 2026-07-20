import React from 'react'
import { captureError } from '@/lib/analytics'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Global error boundary wrapping the entire app.
 * Catches uncaught render errors and shows a recovery screen instead of a
 * blank white page. Logs details to console in development.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to Sentry (dormant until configured).
    captureError(error, { componentStack: info.componentStack })
    // In development, surface the full stack so engineers can debug quickly.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: 24,
          background: 'var(--color-background, #0A0A0A)',
          color: 'var(--color-text-primary, #F5F5F0)',
          textAlign: 'center',
          gap: 16
        }}
      >
        <div style={{ fontSize: 40 }}>⚠</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #A0A0A0)', maxWidth: 360, margin: 0 }}>
          An unexpected error occurred. Your unsaved data is safe in local storage.
        </p>
        {import.meta.env.DEV && this.state.error ? (
          <pre
            style={{
              fontSize: 11,
              color: '#FF6B6B',
              background: 'rgba(255,77,77,0.08)',
              padding: 12,
              borderRadius: 8,
              maxWidth: 480,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left'
            }}
          >
            {this.state.error.message}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--color-mint, #2563EB)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary, #A0A0A0)',
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
