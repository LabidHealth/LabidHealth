import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'

interface SearchResult {
  type: 'patient' | 'sample' | 'result' | 'invoice'
  id: string
  title: string
  subtitle: string
  url: string
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('labora-recent-searches')
    if (stored) setRecent(JSON.parse(stored))
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const q = query.toLowerCase()
      const hits: SearchResult[] = []

      // Search patients
      const patients = await db.patients
        .filter((p) => p.full_name.toLowerCase().includes(q) || p.labid.toLowerCase().includes(q) || (typeof p.phone === 'string' && p.phone.includes(q)))
        .limit(5)
        .toArray()

      for (const p of patients) {
        hits.push({
          type: 'patient',
          id: p.id,
          title: p.full_name,
          subtitle: p.labid,
          url: `/app/patients/${p.id}`
        })
      }

      // Search samples
      const samples = await db.samples
        .filter((s) => s.sample_id.toLowerCase().includes(q))
        .limit(5)
        .toArray()

      for (const s of samples) {
        hits.push({
          type: 'sample',
          id: s.id,
          title: s.sample_id,
          subtitle: s.labid,
          url: `/app/samples/${s.id}`
        })
      }

      // Search results
      const res = await db.results
        .filter((r) => r.test_type.toLowerCase().includes(q))
        .limit(5)
        .toArray()

      for (const r of res) {
        hits.push({
          type: 'result',
          id: r.id,
          title: r.test_type,
          subtitle: r.labid,
          url: `/app/results/${r.id}`
        })
      }

      // Search invoices
      const invoices = await db.invoices
        .filter((i) => i.invoice_id.toLowerCase().includes(q))
        .limit(5)
        .toArray()

      for (const i of invoices) {
        hits.push({
          type: 'invoice',
          id: i.id,
          title: i.invoice_id,
          subtitle: i.labid,
          url: `/app/billing/${i.id}`
        })
      }

      setResults(hits)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const addToRecent = useCallback((q: string) => {
    if (!q.trim()) return
    setRecent((prev) => {
      const filtered = prev.filter((r) => r !== q)
      const updated = [q, ...filtered].slice(0, 5)
      localStorage.setItem('labora-recent-searches', JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    query,
    setQuery,
    results,
    recent,
    isOpen,
    openSearch,
    closeSearch,
    addToRecent
  }
}
