import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn, ShieldCheck, Microscope } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { friendlyError } from '@/lib/supabaseQuery'
import { DEV_MODE } from '@/lib/devMode'
import { LabidLogo } from '@/components/LabidLogo'
import type { UserRole } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormValues = z.infer<typeof loginSchema>

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'owner', label: 'Owner / Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'scientist', label: 'Scientist' },
  { value: 'front_desk', label: 'Front Desk' }
]

export function LoginPage() {
  const { signIn, loading } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | ''>('')
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: DEV_MODE ? { email: 'owner@dev.local', password: 'devpass' } : undefined
  })
  const navigate = useNavigate()

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    try {
      // In dev mode the role selector picks the local account.
      const email = DEV_MODE && role ? `${role}@dev.local` : values.email
      const result = await signIn(email, values.password)
      navigate(result.nextPath, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <div className="signin">
      <div className="signin__topbar">
        <ShieldCheck size={14} />
        <span>Secure clinical environment · NDPA compliant</span>
      </div>

      <div className="signin__body">
        <div className="signin__card">
          {/* Left brand panel */}
          <aside className="signin__brand">
            <div className="signin__brand-head">
              <span className="signin__logo-badge">
                <LabidLogo size={26} />
              </span>
              <span className="signin__wordmark">Labid Health</span>
            </div>

            <div className="signin__brand-copy">
              <h1>Precision diagnostics, managed.</h1>
              <p>
                Registration, results delivery over WhatsApp, and revenue reconciliation — your
                whole lab bench in one offline-first system.
              </p>
            </div>

            <div className="signin__status">
              <Microscope size={18} />
              <div>
                <span className="signin__status-label">Current system status</span>
                <span className="signin__status-value">All nodes operational</span>
              </div>
            </div>
          </aside>

          {/* Right form panel */}
          <section className="signin__form-panel">
            <h2 className="signin__title">Clinical sign-in</h2>
            <p className="signin__subtitle">Sign in to manage your lab, samples, and results.</p>

            {DEV_MODE ? (
              <div className="signin__devnote">
                Dev mode — no backend. Pick a role below (or use an email like <strong>owner@dev.local</strong>) and any
                password.
              </div>
            ) : null}

            <form className="signin__form" onSubmit={handleSubmit(onSubmit)}>
              <label className="signin__field">
                <span className="signin__label">Clinical email / ID</span>
                <span className="signin__input-wrap">
                  <Mail size={16} className="signin__input-icon" />
                  <input type="email" className="signin__input" placeholder="you@labidhealth.com" {...register('email')} />
                </span>
                {errors.email?.message ? <span className="signin__error">{errors.email.message}</span> : null}
              </label>

              <label className="signin__field">
                <span className="signin__label">Password</span>
                <span className="signin__input-wrap">
                  <Lock size={16} className="signin__input-icon" />
                  <input type="password" className="signin__input" placeholder="••••••••" {...register('password')} />
                </span>
                {errors.password?.message ? <span className="signin__error">{errors.password.message}</span> : null}
              </label>

              <label className="signin__field">
                <span className="signin__label">Role / station</span>
                <select className="signin__input signin__select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              {error ? <p className="signin__error">{error}</p> : null}

              <button type="submit" className="signin__button" disabled={loading}>
                {loading ? <span className="signin__spinner" /> : (
                  <>
                    <LogIn size={16} /> Sign in
                  </>
                )}
              </button>
            </form>

            <div className="signin__foot">
              <span>Need access? Book a demo</span>
              <span className="signin__foot-badges">
                <span>NDPA compliant</span>
                <span>·</span>
                <span>Data hosted in Africa</span>
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
