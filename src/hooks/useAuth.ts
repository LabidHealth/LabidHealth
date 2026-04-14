import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

const ROLE_STORAGE_KEY = 'labora-ai-user-role'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [labId, setLabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('lab_staff')
      .select('role, lab_id')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Failed to resolve role', error)
      return
    }

    const remoteRole = data.role as UserRole
    setRole(remoteRole)
    setLabId(data.lab_id)
    localStorage.setItem(ROLE_STORAGE_KEY, remoteRole)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session?.user) {
      setSession(data.session)
      setUser(data.session.user)
      await loadRole(data.session.user.id)
    }
    setLoading(false)
    return data
  }, [loadRole])

  const signOut = useCallback(async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setRole(null)
    setLabId(null)
    localStorage.removeItem(ROLE_STORAGE_KEY)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        if (data.session?.user) {
          await loadRole(data.session.user.id)
        } else {
          const cached = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null
          if (cached) setRole(cached)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    bootstrap()

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        loadRole(currentSession.user.id)
      }
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [loadRole])

  return { user, session, role, labId, loading, signIn, signOut }
}
