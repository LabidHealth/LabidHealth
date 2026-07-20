import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { track } from '@/lib/analytics'

// Patient-facing, no login. Reads the result by secure token from the
// result-view Edge Function, and offers an optional AI explanation via
// explain-result. Self-contained styling so it doesn't depend on the
// authenticated app shell — patients open this on a phone from a WhatsApp link.

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

type Lang = 'en' | 'pcm' | 'ig'

interface ResultParam {
  key: string
  name: string
  value: string
  unit: string | null
  status: string | null
  ref: string | null
}

interface ResultView {
  patient_name: string | null
  labid: string
  test_name: string
  test_type: string
  comments: string | null
  approved_at: string | null
  parameters: ResultParam[]
  lab: { name: string; address: string | null; phone: string | null; mlscn_no: string; disclaimer: string | null } | null
}

const LANG_LABEL: Record<Lang, string> = { en: 'English', pcm: 'Pidgin', ig: 'Igbo' }

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  low: { bg: '#FEF3C7', fg: '#92400E', label: 'Low' },
  high: { bg: '#FEF3C7', fg: '#92400E', label: 'High' },
  critical_low: { bg: '#FEE2E2', fg: '#991B1B', label: 'Critically low' },
  critical_high: { bg: '#FEE2E2', fg: '#991B1B', label: 'Critically high' },
  normal: { bg: '#DCFCE7', fg: '#166534', label: 'Normal' }
}

export function ResultViewPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultView | null>(null)

  const [lang, setLang] = useState<Lang>('en')
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState<{ text: string; disclaimer: string } | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/result-view?token=${encodeURIComponent(token ?? '')}`, {
          headers: ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {}
        })
        const data = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setError(
            data.error === 'expired'
              ? 'This link has expired. Please contact the lab for a new one.'
              : data.error === 'not_available'
              ? 'This result is not ready yet.'
              : 'We could not find this result. Please check your link.'
          )
        } else {
          setResult(data as ResultView)
        }
      } catch {
        if (mounted) setError('Could not connect. Please check your internet and try again.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  async function handleExplain() {
    if (!result) return
    setExplaining(true)
    setExplainError(null)
    setExplanation(null)
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/explain-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {})
        },
        body: JSON.stringify({
          test_name: result.test_name,
          language: lang,
          parameters: result.parameters.map((p) => ({
            name: p.name,
            value: p.value,
            unit: p.unit,
            status: p.status,
            ref: p.ref
          }))
        })
      })
      const data = await res.json()
      track('ai_explanation_requested', { language: lang, ok: res.ok, configured: res.status !== 503 })
      if (res.status === 503) {
        setExplainError('Simple explanations are coming soon. For now, please ask your doctor about your result.')
      } else if (!res.ok) {
        setExplainError(data.message ?? 'Could not generate an explanation right now.')
      } else {
        setExplanation({ text: data.explanation, disclaimer: data.disclaimer })
      }
    } catch {
      setExplainError('Could not connect. Please try again.')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FB', color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: '#2563EB', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>L</span>
          <strong style={{ fontSize: 16 }}>Labid Health</strong>
        </div>

        {loading ? (
          <p style={{ color: '#64748B' }}>Loading your result…</p>
        ) : error ? (
          <div style={card}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : result ? (
          <>
            <div style={card}>
              {result.lab ? (
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>{result.lab.name}</div>
                  {result.lab.address ? <div style={{ fontSize: 13, color: '#64748B' }}>{result.lab.address}</div> : null}
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>MLSCN: {result.lab.mlscn_no}</div>
                </div>
              ) : null}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#64748B' }}>Patient</div>
                <div style={{ fontWeight: 600 }}>{result.patient_name ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{result.labid}</div>
              </div>

              <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>{result.test_name}</h1>
              {result.approved_at ? (
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
                  Reported {new Date(result.approved_at).toLocaleDateString()}
                </div>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.parameters.length === 0 ? (
                  <p style={{ color: '#64748B' }}>{result.comments ?? 'See your report.'}</p>
                ) : (
                  result.parameters.map((p) => {
                    const s = p.status ? STATUS_STYLE[p.status] : null
                    return (
                      <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.ref ? <div style={{ fontSize: 12, color: '#94A3B8' }}>Usual: {p.ref}</div> : null}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>
                            {p.value}
                            {p.unit ? <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400 }}> {p.unit}</span> : null}
                          </div>
                          {s && p.status !== 'normal' ? (
                            <span style={{ fontSize: 11, background: s.bg, color: s.fg, borderRadius: 999, padding: '2px 8px' }}>{s.label}</span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {result.comments ? (
                <div style={{ marginTop: 12, fontSize: 13, color: '#475569', background: '#F8FAFC', borderRadius: 8, padding: 10 }}>
                  <strong>Note from the lab:</strong> {result.comments}
                </div>
              ) : null}
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Understand your result</h2>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 0 }}>Get a simple, plain-language explanation. This is not a diagnosis.</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['en', 'pcm', 'ig'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: lang === l ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      background: lang === l ? '#EFF6FF' : '#fff', color: lang === l ? '#2563EB' : '#334155', fontWeight: lang === l ? 600 : 400
                    }}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleExplain()}
                disabled={explaining}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: explaining ? 0.7 : 1 }}
              >
                {explaining ? 'Explaining…' : 'Explain this simply'}
              </button>

              {explainError ? <p style={{ fontSize: 13, color: '#64748B', marginBottom: 0 }}>{explainError}</p> : null}
              {explanation ? (
                <div style={{ marginTop: 14 }}>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{explanation.text}</p>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 12, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>{explanation.disclaimer}</p>
                </div>
              ) : null}
            </div>

            {result.lab?.disclaimer ? (
              <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>{result.lab.disclaimer}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #E2E8F0',
  padding: 16,
  marginBottom: 14
}
