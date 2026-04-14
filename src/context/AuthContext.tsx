import React, { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuth()
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider')
  }
  return context
}
