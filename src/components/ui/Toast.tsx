import React, { createContext, useContext, useMemo, useState } from 'react'

type ToastVariant = 'success' | 'warning' | 'error'

interface ToastMessage {
  id: number
  text: string
  variant: ToastVariant
}

interface ToastContextValue {
  push: (text: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const push = (text: string, variant: ToastVariant = 'success') => {
    const id = Date.now()
    setMessages((prev) => [...prev, { id, text, variant }])
    setTimeout(() => setMessages((prev) => prev.filter((message) => message.id !== id)), 4000)
  }

  const value = useMemo(() => ({ push }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {messages.map((message) => (
          <div key={message.id} className={`toast toast--${message.variant}`}>
            {message.text}
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
