import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

type VerifiedResult = {
  id: string
  patient_name?: string
  labid?: string
  test_type?: string
  status: string
  approved_at: string
}

export function VerifyResultPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [result, setResult] = useState<VerifiedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError('No token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/verify-result?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setVerified(false)
          setError(data.error || 'Verification failed')
          setLoading(false)
          return
        }

        setVerified(true)
        setResult(data.result)
        setLoading(false)
      } catch {
        setVerified(false)
        setError('Failed to connect to verification server')
        setLoading(false)
      }
    }

    void verify()
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#003D28' }} />
          <div style={{ fontSize: 18, marginTop: 16, color: '#4A4A4A' }}>Verifying result...</div>
        </div>
      </div>
    )
  }

  if (verified === false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <EmptyState
          icon={error?.includes('expired') ? <AlertTriangle size={48} /> : <XCircle size={48} />}
          headline={error?.includes('expired') ? 'Link Expired' : 'Verification Failed'}
          description={error || 'This result could not be verified'}
          cta={
            <Button variant="secondary" onClick={() => window.location.href = 'https://labidhealth.com'}>
              Return to Labid Health
            </Button>
          }
        />
      </div>
    )
  }

  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <EmptyState
          icon={<AlertTriangle size={48} />}
          headline="Result Not Found"
          description="This result could not be found or may have been deleted."
          cta={
            <Button variant="secondary" onClick={() => window.location.href = 'https://labidhealth.com'}>
              Return to Labid Health
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, background: '#00875A', borderRadius: '50%', marginBottom: 16 }}>
          <CheckCircle size={48} style={{ color: '#FFFFFF' }} />
        </div>
        <h1 style={{ fontSize: 28, color: '#003D28', margin: '0 0 8px 0' }}>Result Verified</h1>
        <p style={{ fontSize: 16, color: '#4A4A4A', margin: 0 }}>This is an authentic laboratory result from Labid Health</p>
      </div>

      <div style={{ background: '#FFFFFF', border: '2px solid #00875A', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, color: '#0A0A0A', marginBottom: 16, borderBottom: '1px solid #E0E0E0', paddingBottom: 12 }}>
          Result Details
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Patient Name</strong>
            <div style={{ fontSize: 16, marginTop: 4 }}>{result.patient_name || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>LABID</strong>
            <div style={{ fontSize: 16, marginTop: 4, fontFamily: 'monospace' }}>{result.labid || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Test Type</strong>
            <div style={{ fontSize: 16, marginTop: 4 }}>{result.test_type || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Status</strong>
            <div style={{ fontSize: 16, marginTop: 4, color: '#00875A', fontWeight: 600 }}>{result.status.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#F5F5F0', border: '1px solid #E0E0E0', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FileText size={20} style={{ color: '#003D28', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: 14, color: '#003D28', display: 'block', marginBottom: 4 }}>View Full Result</strong>
            <p style={{ fontSize: 13, color: '#4A4A4A', margin: '0 0 8px 0' }}>
              Scan the QR code or click the link below to view the complete laboratory result with all parameters and reference ranges.
            </p>
            <Button variant="primary" onClick={() => window.location.href = `/result/${token}`}>
              View Complete Result
            </Button>
          </div>
        </div>
      </div>

      <div style={{ background: '#E8F5E9', border: '1px solid #00875A', borderRadius: 8, padding: 16, fontSize: 13, color: '#003D28' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Verification Details</p>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#4A4A4A' }}>
          <li>Digitally signed by Labid Health Laboratory</li>
          <li>Result ID: <code style={{ background: '#FFFFFF', padding: '2px 6px', borderRadius: 3 }}>{result.id}</code></li>
          <li>Approved on: {new Date(result.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
        </ul>
      </div>

      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #E0E0E0', fontSize: 12, color: '#4A4A4A', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>Labid Health Laboratory Management System</p>
      </footer>
    </div>
  )
}
