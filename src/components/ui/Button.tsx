import React, { type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'text'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <span className="btn-spinner" /> : icon ? <span className="btn-icon">{icon}</span> : null}
      {typeof children === 'string' ? <span>{children}</span> : children}
    </button>
  )
}
