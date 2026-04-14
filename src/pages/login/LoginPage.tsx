import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'

interface LoginFormValues {
  email: string
  password: string
}

export function LoginPage() {
  const { signIn, loading } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit } = useForm<LoginFormValues>()
  const navigate = useNavigate()

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    try {
      await signIn(values.email, values.password)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <p className="login-tag">Lab Infrastructure for Africa</p>
        <h1 className="login-title">Labora AI</h1>
        <p className="login-subtitle">Sign in to manage your lab, samples, and results.</p>
        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="login-label">
            Email
            <input type="email" className="login-input" {...register('email', { required: true })} />
          </label>
          <label className="login-label">
            Password
            <input type="password" className="login-input" {...register('password', { required: true })} />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="login-spinner" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
