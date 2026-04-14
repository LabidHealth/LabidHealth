import React, { type ChangeEvent } from 'react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
}

function formatInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
  return parts.filter(Boolean).join(' ')
}

export function PhoneInput({ value, onChange, label, error }: PhoneInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    onChange(raw)
  }

  return (
    <label className="form-label">
      {label}
      <div className="phone-input-wrapper">
        <span className="phone-prefix">+234</span>
        <input
          value={formatInput(value)}
          onChange={handleChange}
          className={`form-input phone-input ${error ? 'form-input--error' : ''}`}
          placeholder="803 123 4567"
        />
      </div>
      {error && <span className="form-input-error">{error}</span>}
    </label>
  )
}
