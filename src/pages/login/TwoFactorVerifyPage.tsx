import React, { useEffect, useRef, useState } from 'react'
import { staffRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { friendlyError } from '@/lib/supabaseQuery'
import { supabase } from '@/lib/supabase'
import type { LabStaff } from '@/types'

export function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { user, role, refreshMfaState } = useAuthContext()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (role !== 'owner' && role !== 'manager') {
      navigate('/app/dashboard', { replace: true })
      return
    }
    inputRef.current?.focus()
  }, [navigate, role, user])

  async function markTwoFactorEnabled() {
    if (!user) return
    const staffRecord = await staffRepo.byUser(user.id)
    if (!staffRecord || staffRecord.two_factor_enabled) return

    await staffRepo.update({
        ...staffRecord,
        two_factor_enabled: true,
        updated_at: new Date().toISOString()
      },
      staffRecord as Partial<LabStaff>
    )
  }

  async function handleVerify(value: string) {
    if (value.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      const { data: factorsData, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError

      const factor = factorsData?.totp?.[0]
      if (!factor) throw new Error('No 2FA factor found — please contact your administrator')

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: value.trim()
      })
      if (verifyError) throw verifyError

      await markTwoFactorEnabled()
      await refreshMfaState(role, user?.id)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      const message = friendlyError(err)
      setError(message.toLowerCase().includes('permission') ? 'Incorrect code — try again' : message)
      setCode('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (value.length === 6) {
      void handleVerify(value)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card" style={{ maxWidth: 360 }}>
        <p className="login-tag">Security</p>
        <h1 className="login-title" style={{ fontSize: 22 }}>Two-Factor Authentication</h1>
        <p className="login-subtitle">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className="login-input"
          placeholder="000000"
          value={code}
          onChange={handleChange}
          disabled={loading}
          style={{ letterSpacing: 8, fontSize: 24, textAlign: 'center' }}
        />

        {error ? <p className="login-error">{error}</p> : null}

        <button
          type="button"
          className="login-button"
          disabled={loading || code.length !== 6}
          onClick={() => void handleVerify(code)}
          style={{ marginTop: 16 }}
        >
          {loading ? <span className="login-spinner" /> : 'Verify'}
        </button>
      </div>
    </div>
  )
}
