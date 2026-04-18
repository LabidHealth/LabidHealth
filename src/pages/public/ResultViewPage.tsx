import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, FileText, X } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export function ResultViewPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    async function loadResult() {
      if (!token) {
        setError('No token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/verify-result?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (data.error === 'Token expired') {
            setExpired(true)
            setError('This link has expired. Please contact the lab for a new result link.')
          } else {
            setError(data.error || 'Failed to load result')
          }
          setLoading(false)
          return
        }

        setResult(data.result)
        setLoading(false)
      } catch (err) {
        setError('Failed to connect to server')
        setLoading(false)
      }
    }

    void loadResult()
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>Loading result...</div>
        </div>
      </div>
    )
  }

  if (error || expired) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <EmptyState
          icon={expired ? <X size={48} /> : <AlertTriangle size={48} />}
          headline={expired ? 'Link Expired' : 'Error'}
          description={error || 'Failed to load result'}
          cta={
            <Button variant="secondary" onClick={() => window.location.href = 'https://laboraai.com'}>
              Return to Labora AI
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
          icon={<FileText size={48} />}
          headline="Result not found"
          description="This result could not be found or may have been deleted."
          cta={
            <Button variant="secondary" onClick={() => window.location.href = 'https://laboraai.com'}>
              Return to Labora AI
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: 32, borderBottom: '2px solid #003D28', paddingBottom: 16 }}>
        <h1 style={{ fontSize: 24, color: '#003D28', margin: 0 }}>Labora AI Laboratory Result</h1>
        <p style={{ fontSize: 14, color: '#4A4A4A', margin: '8px 0 0 0' }}>Official Laboratory Report</p>
      </header>

      <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, color: '#0A0A0A', marginBottom: 16 }}>Patient Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Patient Name</strong>
            <div style={{ fontSize: 16, marginTop: 4 }}>{result.patient_name || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>LAPID</strong>
            <div style={{ fontSize: 16, marginTop: 4, fontFamily: 'monospace' }}>{result.lapid || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Test Type</strong>
            <div style={{ fontSize: 16, marginTop: 4 }}>{result.test_type || '—'}</div>
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase' }}>Sample ID</strong>
            <div style={{ fontSize: 16, marginTop: 4, fontFamily: 'monospace' }}>{result.sample_id || '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, color: '#0A0A0A', marginBottom: 16 }}>Test Results</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F0' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0' }}>Parameter</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0' }}>Value</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0' }}>Unit</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#4A4A4A', textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.parameters || {}).map(([key, param]: [string, any]) => {
                const isHigh = param.status === 'high' || param.status === 'critical_high'
                const isLow = param.status === 'low' || param.status === 'critical_low'
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #EEEEEE' }}>
                    <td style={{ padding: 12, fontSize: 14 }}>{key.replace(/_/g, ' ')}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: isHigh || isLow ? 600 : 400, color: isHigh ? '#FF4D4D' : isLow ? '#FFB800' : '#0A0A0A' }}>
                      {param.value} {isHigh ? '↑' : isLow ? '↓' : ''}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, color: '#4A4A4A' }}>{param.unit || '—'}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 12, textTransform: 'uppercase', color: isHigh || isLow ? '#FF4D4D' : '#00875A' }}>
                      {param.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {result.comments ? (
        <div style={{ background: '#FFF8F0', border: '1px solid #FFB800', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: '#B36B00', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Comments</h3>
          <p style={{ fontSize: 14, margin: 0 }}>{result.comments}</p>
        </div>
      ) : null}

      <div style={{ background: '#F5F5F0', padding: 16, borderRadius: 8, fontSize: 12, color: '#4A4A4A', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>Approved on {new Date(result.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <p style={{ margin: '4px 0 0 0' }}>This is an official laboratory result. For questions, please contact the laboratory directly.</p>
      </div>

      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #E0E0E0', fontSize: 12, color: '#4A4A4A', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>Generated by Labora AI Laboratory Management System</p>
      </footer>
    </div>
  )
}
