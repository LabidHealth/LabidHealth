import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { friendlyError } from '@/lib/supabaseQuery'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signIn, loading } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })
  const navigate = useNavigate()

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    try {
      const result = await signIn(values.email, values.password)
      navigate(result.nextPath, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <p className="login-tag">Your pocket lab</p>
        <h1 className="login-title">Labid Health</h1>
        <p className="login-subtitle">Sign in to manage your lab, samples, and results.</p>
        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="login-label">
            Email
            <input type="email" className="login-input" {...register('email', { required: true })} />
          </label>
          {errors.email?.message ? <p className="login-error">{errors.email.message}</p> : null}
          <label className="login-label">
            Password
            <input type="password" className="login-input" {...register('password', { required: true })} />
          </label>
          {errors.password?.message ? <p className="login-error">{errors.password.message}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="login-spinner" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
