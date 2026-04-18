import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'

interface QRScannerProps {
  onScan: (value: string) => void
  onClose: () => void
  scannerId?: string
  title?: string
}

type ScannerInstance = {
  start: (
    cameraId: string,
    config: { fps?: number; qrbox?: number },
    onSuccess: (decodedText: string) => void,
    onError: (errorMessage: string) => void
  ) => Promise<unknown>
  stop: () => Promise<unknown>
  clear: () => void
}

export function QRScanner({ onScan, onClose, scannerId = 'qr-scanner-view', title = 'Scan QR Code' }: QRScannerProps) {
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const scannerRef = useRef<ScannerInstance | null>(null)

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      setError(null)
      await new Promise<void>((resolve) => setTimeout(resolve, 120))
      if (cancelled) return

      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const devices = await Html5Qrcode.getCameras()
        if (!devices.length) throw new Error('No camera found on this device')

        const scanner = new Html5Qrcode(scannerId) as unknown as ScannerInstance
        scannerRef.current = scanner
        await scanner.start(
          devices[0].id,
          { fps: 10, qrbox: 220 },
          (decoded) => {
            if (cancelled) return
            void stopScanner().then(() => onScan(decoded.trim()))
          },
          () => {}
        )

        if (!cancelled) setActive(true)
      } catch (scannerError) {
        if (!cancelled) setError((scannerError as Error).message)
      }
    }

    void start()
    return () => {
      cancelled = true
      void stopScanner()
    }
  }, [onScan, scannerId])

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      try {
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setActive(false)
  }

  async function handleClose() {
    await stopScanner()
    onClose()
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = manual.trim()
    if (!trimmed) return
    void stopScanner().then(() => onScan(trimmed))
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn-text" onClick={() => void handleClose()} aria-label="Close scanner">
            X
          </button>
        </div>

        <div className="modal-body">
          <div
            id={scannerId}
            style={{
              width: '100%',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#000',
              minHeight: active ? undefined : 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {!active && !error ? (
              <span style={{ color: '#888', fontSize: 13 }}>Starting camera...</span>
            ) : null}
          </div>

          {error ? (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: 8, fontSize: 13, color: 'var(--color-status-danger)' }}>
              {error}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Or enter a code manually:
            </p>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="e.g. LAPID or Sample ID"
                style={{ flex: 1 }}
              />
              <Button type="submit" variant="primary" size="sm" disabled={!manual.trim()}>
                Go
              </Button>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="text" onClick={() => void handleClose()}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
