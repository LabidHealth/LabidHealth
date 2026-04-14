import React, { useEffect } from 'react'

interface ModalProps {
  title?: string
  open: boolean
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handle)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handle)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal>
      <div className="modal">
        <div className="modal-header">
          <div>
            {title && <h3>{title}</h3>}
          </div>
          <button type="button" className="btn-text" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
