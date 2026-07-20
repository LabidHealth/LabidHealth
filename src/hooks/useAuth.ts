import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, hasBackend } from '@/lib/supabase'
import { DEV_LAB_ID, DEV_USERS, devRoleFromEmail } from '@/lib/devMode'
import { db } from '@/lib/db'
import { writeRecord } from '@/lib/writeRecord'
import { identify, resetAnalytics } from '@/lib/analytics'
import type { LabStaff, UserRole } from '@/types'

const ROLE_STORAGE_KEY = 'labid-health-user-role'
const LAB_STORAGE_KEY = 'labid-health-lab-id'
const MFA_STORAGE_KEY = 'labid-health-mfa-verified'
const DEV_SESSION_KEY = 'labid-health-dev-session'

export type MfaState = 'checking' | 'not_required' | 'setup_required' | 'verify_required' | 'verified'

interface ResolvedStaffContext {
  role: UserRole
  labId: string
}

async function resolveStaffContextFromCache(): Promise<ResolvedStaffContext | null> {
  const cachedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null
  const cachedLab = localStorage.getItem(LAB_STORAGE_KEY)
  if (!cachedRole || !cachedLab) return null
  return { role: cachedRole, labId: cachedLab }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [labId, setLabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaState, setMfaState] = useState<MfaState>('checking')

  const persistTwoFactorFlag = useCallback(async (userId: string, enabled: boolean) => {
    const staffRecord = await db.lab_staff.where('user_id').equals(userId).first()
    if (!staffRecord || staffRecord.two_factor_enabled === enabled) return

    const updated: LabStaff = {
      ...staffRecord,
      two_factor_enabled: enabled,
      updated_at: new Date().toISOString()
    }
    await writeRecord('lab_staff', 'UPDATE', updated, staffRecord)
  }, [])

  const loadRole = useCallback(async (userId: string): Promise<ResolvedStaffContext | null> => {
    const { data, error } = await supabase
      .from('lab_staff' as never)
      .select('role, lab_id')
      .eq('user_id', userId)
      .single()

    if (error) {
      const fallback = await resolveStaffContextFromCache()
      if (fallback) {
        setRole(fallback.role)
        setLabId(fallback.labId)
      }
      return fallback
    }

    const resolved = data as { role: UserRole; lab_id: string }
    setRole(resolved.role)
    setLabId(resolved.lab_id)
    localStorage.setItem(ROLE_STORAGE_KEY, resolved.role)
    localStorage.setItem(LAB_STORAGE_KEY, resolved.lab_id)
    return { role: resolved.role, labId: resolved.lab_id }
  }, [])

  const refreshMfaState = useCallback(async (nextRole?: UserRole | null, userId?: string | null) => {
    const effectiveRole = nextRole ?? role
    const effectiveUserId = userId ?? session?.user?.id ?? null

    if (effectiveRole !== 'owner' && effectiveRole !== 'manager') {
      setMfaState('not_required')
      localStorage.removeItem(MFA_STORAGE_KEY)
      return 'not_required' as const
    }

    try {
      const [{ data: factorsData, error: factorsError }, { data: aalData, error: aalError }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      ])

      if (factorsError) throw factorsError
      if (aalError) throw aalError

      const hasVerifiedTotp = (factorsData?.totp?.length ?? 0) > 0
      const nextState: MfaState = !hasVerifiedTotp
        ? 'setup_required'
        : aalData?.currentLevel === 'aal2'
        ? 'verified'
        : 'verify_required'

      if (nextState === 'verified') {
        localStorage.setItem(MFA_STORAGE_KEY, 'true')
        if (effectiveUserId) {
          await persistTwoFactorFlag(effectiveUserId, true)
        }
      } else {
        localStorage.removeItem(MFA_STORAGE_KEY)
        if (effectiveUserId && nextState === 'setup_required') {
          await persistTwoFactorFlag(effectiveUserId, false)
        }
      }

      setMfaState(nextState)
      return nextState
    } catch {
      const cachedVerified = localStorage.getItem(MFA_STORAGE_KEY) === 'true'
      const fallbackState: MfaState = cachedVerified ? 'verified' : 'verify_required'
      setMfaState(fallbackState)
      return fallbackState
    }
  }, [persistTwoFactorFlag, role, session?.user?.id])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!hasBackend) {
      const devRole = devRoleFromEmail(email)
      const devUser = DEV_USERS[devRole]
      localStorage.setItem(DEV_SESSION_KEY, JSON.stringify({ userId: devUser.userId, role: devRole, labId: DEV_LAB_ID }))
      localStorage.setItem(ROLE_STORAGE_KEY, devRole)
      localStorage.setItem(LAB_STORAGE_KEY, DEV_LAB_ID)
      const devSession = { user: { id: devUser.userId } } as unknown as Session
      setSession(devSession)
      setUser(devSession.user)
      setRole(devRole)
      setLabId(DEV_LAB_ID)
      identify(devUser.userId, devRole, DEV_LAB_ID)
      setMfaState('not_required')
      setLoading(false)
      return { nextPath: '/app/dashboard' }
    }

    try {
      setLoading(true)
      setMfaState('checking')

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      let nextPath = '/app/dashboard'
      if (data.session?.user) {
        setSession(data.session)
        setUser(data.session.user)
        const resolved = await loadRole(data.session.user.id)
        if (resolved) identify(data.session.user.id, resolved.role, resolved.labId)
        const nextMfaState = await refreshMfaState(resolved?.role ?? null, data.session.user.id)

        if (nextMfaState === 'setup_required') nextPath = '/2fa/setup'
        if (nextMfaState === 'verify_required') nextPath = '/2fa/verify'
      }

      return { data, nextPath }
    } finally {
      setLoading(false)
    }
  }, [loadRole, refreshMfaState])

  const signOut = useCallback(async () => {
    if (!hasBackend) {
      resetAnalytics()
      localStorage.removeItem(DEV_SESSION_KEY)
      localStorage.removeItem(ROLE_STORAGE_KEY)
      localStorage.removeItem(LAB_STORAGE_KEY)
      setSession(null)
      setUser(null)
      setRole(null)
      setLabId(null)
      setMfaState('not_required')
      return
    }

    setLoading(true)
    resetAnalytics()
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setRole(null)
    setLabId(null)
    setMfaState('not_required')
    localStorage.removeItem(ROLE_STORAGE_KEY)
    localStorage.removeItem(LAB_STORAGE_KEY)
    localStorage.removeItem(MFA_STORAGE_KEY)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!hasBackend) {
      const raw = localStorage.getItem(DEV_SESSION_KEY)
      if (raw) {
        try {
          const dev = JSON.parse(raw) as { userId: string; role: UserRole; labId: string }
          setSession({ user: { id: dev.userId } } as unknown as Session)
          setUser({ id: dev.userId } as unknown as User)
          setRole(dev.role)
          setLabId(dev.labId)
        } catch {
          /* ignore malformed dev session */
        }
      }
      setMfaState('not_required')
      setLoading(false)
      return () => {
        isMounted = false
      }
    }

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(data.session)
        setUser(data.session?.user ?? null)

        if (data.session?.user) {
          const resolved = await loadRole(data.session.user.id)
          if (!isMounted) return
          if (resolved) identify(data.session.user.id, resolved.role, resolved.labId)
          await refreshMfaState(resolved?.role ?? null, data.session.user.id)
        } else {
          const fallback = await resolveStaffContextFromCache()
          if (fallback) {
            setRole(fallback.role)
            setLabId(fallback.labId)
          }
          setMfaState('not_required')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void bootstrap()

    const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        const resolved = await loadRole(currentSession.user.id)
        if (resolved) identify(currentSession.user.id, resolved.role, resolved.labId)
        await refreshMfaState(resolved?.role ?? null, currentSession.user.id)
      } else {
        resetAnalytics()
        setRole(null)
        setLabId(null)
        setMfaState('not_required')
        localStorage.removeItem(MFA_STORAGE_KEY)
      }

      if (event === 'MFA_CHALLENGE_VERIFIED' && currentSession?.user) {
        await refreshMfaState(role, currentSession.user.id)
      }
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [loadRole, refreshMfaState, role])

  return { user, session, role, labId, loading, mfaState, refreshMfaState, signIn, signOut }
}
