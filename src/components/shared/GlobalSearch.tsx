import React, { useEffect, useRef } from 'react'
import { Search, X, Clock, User, Activity, FileText, Receipt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSearch as useSearchHook } from '@/hooks/useSearch'

export { useSearch as useGlobalSearch } from '@/hooks/useSearch'

export function GlobalSearch() {
  const navigate = useNavigate()
  const {
    query,
    setQuery,
    results,
    recent,
    isOpen,
    openSearch,
    closeSearch,
    addToRecent
  } = useSearchHook()
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape') {
        closeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, closeSearch])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  function handleSelect(result: { url: string; title: string }) {
    addToRecent(result.title)
    navigate(result.url)
    closeSearch()
  }

  if (!isOpen) return null

  const grouped = {
    patient: results.filter((r) => r.type === 'patient'),
    sample: results.filter((r) => r.type === 'sample'),
    result: results.filter((r) => r.type === 'result'),
    invoice: results.filter((r) => r.type === 'invoice')
  }

  const typeIcons = {
    patient: <User size={16} />,
    sample: <Activity size={16} />,
    result: <FileText size={16} />,
    invoice: <Receipt size={16} />
  }

  return (
    <div className="modal-overlay" onClick={closeSearch}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Search patients, samples, results, invoices..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ border: 'none', padding: 0, fontSize: 14 }}
            />
          </div>
          <button type="button" className="btn-text" onClick={closeSearch} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {!query && recent.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock size={14} style={{ color: 'var(--color-text-secondary)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recent</span>
              </div>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="btn-text"
                  onClick={() => { setQuery(r); addToRecent(r) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8 12',
                    fontSize: 13,
                    borderRadius: 4
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : null}

          {query && Object.values(grouped).some((g) => g.length > 0) ? (
            <>
              {grouped.patient.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Patients</span>
                  {grouped.patient.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-text"
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        textAlign: 'left',
                        padding: '8 12',
                        fontSize: 13,
                        borderRadius: 4,
                        marginTop: 4
                      }}
                    >
                      {typeIcons[r.type]}
                      <div style={{ flex: 1 }}>
                        <div>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {grouped.sample.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Samples</span>
                  {grouped.sample.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-text"
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        textAlign: 'left',
                        padding: '8 12',
                        fontSize: 13,
                        borderRadius: 4,
                        marginTop: 4
                      }}
                    >
                      {typeIcons[r.type]}
                      <div style={{ flex: 1 }}>
                        <div>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {grouped.result.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Results</span>
                  {grouped.result.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-text"
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        textAlign: 'left',
                        padding: '8 12',
                        fontSize: 13,
                        borderRadius: 4,
                        marginTop: 4
                      }}
                    >
                      {typeIcons[r.type]}
                      <div style={{ flex: 1 }}>
                        <div>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {grouped.invoice.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Invoices</span>
                  {grouped.invoice.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-text"
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        textAlign: 'left',
                        padding: '8 12',
                        fontSize: 13,
                        borderRadius: 4,
                        marginTop: 4
                      }}
                    >
                      {typeIcons[r.type]}
                      <div style={{ flex: 1 }}>
                        <div>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : query ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              No results found
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Press <kbd style={{ padding: '2 6', background: 'var(--color-surface-2)', borderRadius: 3, fontSize: 10 }}>Cmd+K</kbd> to open, <kbd style={{ padding: '2 6', background: 'var(--color-surface-2)', borderRadius: 3, fontSize: 10 }}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
