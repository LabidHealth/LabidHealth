import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCodeLib from 'qrcode'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { friendlyError } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'
import { supabase } from '@/lib/supabase'
import type { LabStaff } from '@/types'

export function TwoFactorSetupPage() {
  const navigate = useNavigate()
  const { user, role, refreshMfaState } = useAuthContext()

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (role !== 'owner' && role !== 'manager') {
      navigate('/app/dashboard', { replace: true })
      return
    }
    void startEnrollment()
  }, [navigate, role, user])

  async function markTwoFactorEnabled() {
    if (!user) return
    const staffRecord = await db.lab_staff.where('user_id').equals(user.id).first()
    if (!staffRecord || staffRecord.two_factor_enabled) return

    await writeRecord(
      'lab_staff',
      'UPDATE',
      {
        ...staffRecord,
        two_factor_enabled: true,
        updated_at: new Date().toISOString()
      },
      staffRecord as Partial<LabStaff>
    )
  }

  async function startEnrollment() {
    setEnrolling(true)
    setError(null)
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrollError) throw enrollError

      setFactorId(data.id)
      setSecret(data.totp.secret)
      setQrDataUrl(await QRCodeLib.toDataURL(data.totp.uri, { margin: 2, width: 240 }))
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setEnrolling(false)
    }
  }

  async function handleVerify() {
    if (!factorId || code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.trim()
      })
      if (verifyError) throw verifyError

      await markTwoFactorEnabled()
      await refreshMfaState(role, user?.id)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      const message = friendlyError(err)
      setError(message.toLowerCase().includes('permission') ? 'Incorrect code — try again' : message)
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card" style={{ maxWidth: 400 }}>
        <p className="login-tag">Security</p>
        <h1 className="login-title" style={{ fontSize: 22 }}>Set up 2FA</h1>
        <p className="login-subtitle">
          An extra security step that protects your lab data. Scan the code below with Google Authenticator or Authy.
        </p>

        {enrolling ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
            Generating QR code...
          </div>
        ) : qrDataUrl ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img
                src={qrDataUrl}
                alt="TOTP QR code"
                style={{ width: 200, height: 200, borderRadius: 8, border: '2px solid var(--color-border)' }}
              />
            </div>

            {secret ? (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Can&apos;t scan? Enter this key manually:
                </p>
                <code style={{ fontSize: 13, letterSpacing: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {secret}
                </code>
              </div>
            ) : null}

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              I&apos;ve scanned this — enter your 6-digit code to confirm:
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="login-input"
              placeholder="000000"
              value={code}
              autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
            />

            {error ? <p className="login-error">{error}</p> : null}

            <button
              type="button"
              className="login-button"
              disabled={loading || code.length !== 6}
              onClick={() => void handleVerify()}
              style={{ marginTop: 16 }}
            >
              {loading ? <span className="login-spinner" /> : 'Verify & Save'}
            </button>
          </>
        ) : (
          <>
            {error ? <p className="login-error">{error}</p> : null}
            <button type="button" className="login-button" onClick={() => void startEnrollment()}>
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
