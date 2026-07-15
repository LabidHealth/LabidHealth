import React, { useEffect, useRef, useState } from 'react'
import { priceRepo } from '@/lib/repositories'
import { Plus } from 'lucide-react'
import { Button, Input, Modal, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatNaira } from '@/lib/formatters'
import { offlineWrite } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import type { PriceListItem } from '@/types'

const CATEGORIES = [
  'Haematology', 'Biochemistry', 'Microbiology',
  'Urinalysis', 'Hormones', 'Other'
]

// Inline-editable price cell
function PriceCell({
  value,
  onSave
}: {
  value: number
  onSave: (kobo: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setRaw(String(value / 100))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    const naira = parseFloat(raw)
    if (!Number.isFinite(naira) || naira < 0) { setEditing(false); return }
    onSave(Math.round(naira * 100))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="form-input"
        style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
        type="number"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Click to edit"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-text-primary)', fontSize: 13, padding: '4px 2px',
        borderBottom: '1px dashed var(--color-border)'
      }}
    >
      {formatNaira(value)}
    </button>
  )
}

export function PriceListPage() {
  const toast = useToast()
  const { labId } = useAuthContext()
  const [items, setItems] = useState<PriceListItem[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState(CATEGORIES[0])
  const [newStandard, setNewStandard] = useState('')
  const [newHmo, setNewHmo] = useState('')
  const [newCorporate, setNewCorporate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!labId) return
    void priceRepo.listByLab(labId).then(setItems)
  }, [labId])

  async function updatePrice(item: PriceListItem, field: 'standard_price' | 'hmo_price' | 'corporate_price', kobo: number) {
    const updated: PriceListItem = { ...item, [field]: kobo, updated_at: new Date().toISOString() }
    const message = await offlineWrite('price_list', 'UPDATE', updated, item, `${item.test_name} price updated`)
    setItems((prev) => prev.map((p) => (p.id === item.id ? updated : p)))
    toast.push(message)
  }

  async function handleAddTest() {
    if (!labId || !newName.trim()) { toast.push('Test name is required', 'error'); return }
    const standard = Math.round(parseFloat(newStandard) * 100) || 0
    const hmo = Math.round(parseFloat(newHmo) * 100) || 0
    const corporate = Math.round(parseFloat(newCorporate) * 100) || 0
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const newItem: PriceListItem = {
        id: crypto.randomUUID(),
        lab_id: labId,
        test_code: newName.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 20),
        test_name: newName.trim(),
        category: newCategory,
        standard_price: standard,
        hmo_price: hmo,
        corporate_price: corporate,
        is_active: true,
        created_at: now,
        updated_at: now
      }
      const message = await offlineWrite('price_list', 'INSERT', newItem, null, `${newItem.test_name} added to price list`)
      setItems((prev) => [...prev, newItem])
      setAddOpen(false)
      setNewName(''); setNewCategory(CATEGORIES[0])
      setNewStandard(''); setNewHmo(''); setNewCorporate('')
      toast.push(message)
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    rows: items.filter((i) => i.category === cat && i.is_active)
  })).filter((g) => g.rows.length > 0)

  const uncategorised = items.filter(
    (i) => i.is_active && !CATEGORIES.includes(i.category)
  )
  if (uncategorised.length > 0) byCategory.push({ cat: 'Other', rows: uncategorised })

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Price List</h2>
          <p className="list-subtitle">Click any price to edit inline — saves automatically</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          Add custom test
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="detail-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>No tests in price list yet.</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
            Add tests above, or seed from Settings → Sync.
          </p>
        </div>
      ) : (
        byCategory.map(({ cat, rows }) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {cat}
            </h3>
            <div className="detail-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Test Name</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Standard ₦</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>HMO ₦</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Corporate ₦</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div>{item.test_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>{item.test_code}</div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <PriceCell value={item.standard_price} onSave={(k) => void updatePrice(item, 'standard_price', k)} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <PriceCell value={item.hmo_price} onSave={(k) => void updatePrice(item, 'hmo_price', k)} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <PriceCell value={item.corporate_price} onSave={(k) => void updatePrice(item, 'corporate_price', k)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Add custom test modal */}
      <Modal
        open={addOpen}
        title="Add custom test"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => void handleAddTest()}>Add Test</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Test name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. D-Dimer" />
          <label className="form-label">
            Category
            <select className="form-input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Input label="Standard price (₦)" type="number" value={newStandard} onChange={(e) => setNewStandard(e.target.value)} placeholder="0" />
          <Input label="HMO price (₦)" type="number" value={newHmo} onChange={(e) => setNewHmo(e.target.value)} placeholder="0" />
          <Input label="Corporate price (₦)" type="number" value={newCorporate} onChange={(e) => setNewCorporate(e.target.value)} placeholder="0" />
        </div>
      </Modal>
    </section>
  )
}
