import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastVariant = 'success' | 'warning' | 'error'

interface ToastMessage {
  id: number
  text: string
  variant: ToastVariant
  onRetry?: () => void
}

interface ToastContextValue {
  /** Show a toast. Errors auto-dismiss in 5 s, success/warning in 4 s. */
  push: (text: string, variant?: ToastVariant, onRetry?: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const push = useCallback((text: string, variant: ToastVariant = 'success', onRetry?: () => void) => {
    const id = Date.now()
    setMessages((prev) => [...prev, { id, text, variant, onRetry }])
    const ms = variant === 'error' ? 5_000 : 4_000
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), ms)
  }, [])

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {messages.map((msg) => (
          <div key={msg.id} className={`toast toast--${msg.variant}`}>
            <span>{msg.text}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
              {msg.onRetry ? (
                <button
                  type="button"
                  className="btn-text"
                  style={{ fontSize: 12, fontWeight: 700, color: 'inherit', opacity: 0.9 }}
                  onClick={() => { msg.onRetry?.(); dismiss(msg.id) }}
                >
                  Retry
                </button>
              ) : null}
              <button
                type="button"
                className="btn-text"
                style={{ fontSize: 12, opacity: 0.6, lineHeight: 1 }}
                onClick={() => dismiss(msg.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
