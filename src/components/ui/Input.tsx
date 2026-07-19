import React, { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

// forwardRef is required so react-hook-form's register() ref attaches to the
// real <input>; without it RHF cannot read the value and every field validates
// as empty (which silently broke patient registration).
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <label className="form-label" aria-live="polite">
      {label}
      <input ref={ref} data-error={Boolean(error)} className={`form-input ${className}`} {...props} />
      {error && <span className="form-input-error">{error}</span>}
    </label>
  )
})
