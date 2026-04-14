import React, { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <label className="form-label" aria-live="polite">
      {label}
      <input data-error={Boolean(error)} className={`form-input ${className}`} {...props} />
      {error && <span className="form-input-error">{error}</span>}
    </label>
  )
}
