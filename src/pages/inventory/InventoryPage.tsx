import React, { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Badge, Button, EmptyState, Input, Modal, Table, TableBody, TableCell, TableHead, TableRow, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatNaira, formatDate } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError, supabaseQuery } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'
import { supabase } from '@/lib/supabase'
import type { InventoryEvent, InventoryItem } from '@/types'

type CategoryFilter = 'all' | 'reagent' | 'consumable' | 'control' | 'equipment'

async function syncInventoryFromSupabase() {
  if (!navigator.onLine) return
  const [{ data: items }, { data: events }] = await Promise.all([
    supabaseQuery<InventoryItem[]>(
      supabase.from('inventory').select('*').eq('is_active', true)
    ),
    supabaseQuery<InventoryEvent[]>(
      supabase.from('inventory_events').select('*').order('created_at', { ascending: false }).limit(500)
    )
  ])
  if (items) await db.inventory.bulkPut(items)
  if (events) await db.inventory_events.bulkPut(events)
}

function expiryBadge(expiryDate: string | null | undefined): React.ReactNode {
  if (!expiryDate) return null
  const now = Date.now()
  const exp = new Date(expiryDate).getTime()
  const diffDays = (exp - now) / 86_400_000
  if (diffDays < 0) return <Badge status="CRITICAL">EXPIRED</Badge>
  if (diffDays < 7) return <Badge status="CRITICAL">EXP &lt;7d</Badge>
  if (diffDays < 30) return <Badge status="WARNING">EXP &lt;30d</Badge>
  return null
}

function rowBorderStyle(item: InventoryItem): React.CSSProperties {
  const isLow = item.current_stock < item.minimum_level
  const isExpired = item.expiry_date ? new Date(item.expiry_date).getTime() < Date.now() : false
  if (isExpired) return { borderLeft: '3px solid var(--color-status-danger)' }
  if (isLow) return { borderLeft: '3px solid var(--color-status-warning)' }
  return {}
}

interface AddItemForm {
  item_name: string
  category: InventoryItem['category']
  current_stock: string
  unit: string
  minimum_level: string
  expiry_date: string
  supplier: string
  supplier_phone: string
  cost_per_unit: string
}

const EMPTY_ADD: AddItemForm = {
  item_name: '', category: 'reagent', current_stock: '', unit: '', minimum_level: '',
  expiry_date: '', supplier: '', supplier_phone: '', cost_per_unit: ''
}

export function InventoryPage() {
  const toast = useToast()
  const { labId } = useAuthContext()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [events, setEvents] = useState<InventoryEvent[]>([])
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState(false)

  // Usage modal
  const [usageTarget, setUsageTarget] = useState<InventoryItem | null>(null)
  const [usageQty, setUsageQty] = useState('')
  const [usageReason, setUsageReason] = useState('')
  const [savingUsage, setSavingUsage] = useState(false)

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockSupplier, setRestockSupplier] = useState('')
  const [restockCost, setRestockCost] = useState('')
  const [restockExpiry, setRestockExpiry] = useState('')
  const [restockBatch, setRestockBatch] = useState('')
  const [savingRestock, setSavingRestock] = useState(false)

  // Add item modal
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddItemForm>(EMPTY_ADD)
  const [savingAdd, setSavingAdd] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [localItems, localEvents] = await Promise.all([
        db.inventory.where('is_active').equals(1).toArray(),
        db.inventory_events.orderBy('created_at').reverse().limit(500).toArray()
      ])
      if (mounted) { setItems(localItems); setEvents(localEvents) }
      await syncInventoryFromSupabase()
      const [fresh, freshE] = await Promise.all([
        db.inventory.where('is_active').equals(1).toArray(),
        db.inventory_events.orderBy('created_at').reverse().limit(500).toArray()
      ])
      if (mounted) { setItems(fresh); setEvents(freshE) }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const stats = useMemo(() => {
    const now = Date.now()
    const lowStock = items.filter((i) => i.current_stock < i.minimum_level)
    const expiringSoon = items.filter((i) => {
      if (!i.expiry_date) return false
      const diff = (new Date(i.expiry_date).getTime() - now) / 86_400_000
      return diff >= 0 && diff < 30
    })
    return { total: items.length, lowStock: lowStock.length, expiringSoon: expiringSoon.length }
  }, [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((i) => {
      if (category !== 'all' && i.category !== category) return false
      if (q && !i.item_name.toLowerCase().includes(q) && !(i.supplier ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [items, category, search])

  async function handleRecordUsage() {
    if (!usageTarget) return
    const qty = parseInt(usageQty, 10)
    if (!qty || qty <= 0) { toast.push('Enter a valid quantity', 'error'); return }
    if (qty > usageTarget.current_stock) { toast.push('Quantity exceeds current stock', 'error'); return }
    setSavingUsage(true)
    try {
      const now = new Date().toISOString()
      const event: InventoryEvent = {
        id: crypto.randomUUID(),
        lab_id: labId ?? '',
        item_id: usageTarget.id,
        event_type: 'usage',
        quantity: qty,
        reason: usageReason.trim() || null,
        unit_cost: usageTarget.cost_per_unit,
        batch_number: null,
        performed_by: null,
        created_at: now
      }
      await writeRecord('inventory_events', 'INSERT', event)
      const updated: InventoryItem = { ...usageTarget, current_stock: usageTarget.current_stock - qty, updated_at: now }
      await writeRecord('inventory', 'UPDATE', updated, usageTarget)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setEvents((prev) => [event, ...prev])
      toast.push(offlineSuccessMessage('Usage recorded'))
      setUsageTarget(null); setUsageQty(''); setUsageReason('')
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally { setSavingUsage(false) }
  }

  async function handleRestock() {
    if (!restockTarget) return
    const qty = parseInt(restockQty, 10)
    if (!qty || qty <= 0) { toast.push('Enter a valid quantity', 'error'); return }
    setSavingRestock(true)
    try {
      const now = new Date().toISOString()
      const costKobo = Math.round(parseFloat(restockCost || '0') * 100)
      const event: InventoryEvent = {
        id: crypto.randomUUID(),
        lab_id: labId ?? '',
        item_id: restockTarget.id,
        event_type: 'restock',
        quantity: qty,
        reason: null,
        unit_cost: costKobo,
        batch_number: restockBatch.trim() || null,
        performed_by: null,
        created_at: now
      }
      await writeRecord('inventory_events', 'INSERT', event)
      const updated: InventoryItem = {
        ...restockTarget,
        current_stock: restockTarget.current_stock + qty,
        supplier: restockSupplier.trim() || restockTarget.supplier,
        expiry_date: restockExpiry || restockTarget.expiry_date,
        cost_per_unit: costKobo || restockTarget.cost_per_unit,
        updated_at: now
      }
      await writeRecord('inventory', 'UPDATE', updated, restockTarget)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setEvents((prev) => [event, ...prev])
      toast.push(offlineSuccessMessage('Restock recorded'))
      setRestockTarget(null); setRestockQty(''); setRestockSupplier(''); setRestockCost(''); setRestockExpiry(''); setRestockBatch('')
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally { setSavingRestock(false) }
  }

  async function handleAddItem() {
    if (!addForm.item_name.trim() || !addForm.unit.trim()) {
      toast.push('Item name and unit are required', 'error'); return
    }
    setSavingAdd(true)
    try {
      const now = new Date().toISOString()
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        lab_id: labId ?? '',
        item_name: addForm.item_name.trim(),
        category: addForm.category,
        current_stock: parseInt(addForm.current_stock, 10) || 0,
        unit: addForm.unit.trim(),
        minimum_level: parseInt(addForm.minimum_level, 10) || 0,
        expiry_date: addForm.expiry_date || null,
        supplier: addForm.supplier.trim() || null,
        supplier_phone: addForm.supplier_phone.trim() || null,
        cost_per_unit: Math.round(parseFloat(addForm.cost_per_unit || '0') * 100),
        is_active: true,
        created_at: now,
        updated_at: now
      }
      await writeRecord('inventory', 'INSERT', item)
      setItems((prev) => [item, ...prev])
      toast.push(offlineSuccessMessage('Item added'))
      setAddOpen(false); setAddForm(EMPTY_ADD)
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally { setSavingAdd(false) }
  }

  async function handleMonthlyReport() {
    setGenerating(true)
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthLabel = format(now, 'MMMM yyyy')
      const monthEvents = events.filter((e) => new Date(e.created_at) >= monthStart)
      const lab = await db.labs.toArray()
      const labName = lab[0]?.name ?? 'Lab'
      const labAddress = lab[0]?.address ?? ''

      const [{ pdf }, { InventoryReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/InventoryReportPDF')
      ])
      const blob = await pdf(
        <InventoryReportPDF
          items={items}
          events={monthEvents}
          labName={labName}
          labAddress={labAddress}
          month={monthLabel}
          generatedAt={format(now, 'dd MMM yyyy, hh:mm a')}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-report-${format(now, 'yyyy-MM')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally { setGenerating(false) }
  }

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Inventory</h2>
          <p className="list-subtitle">{items.length} items tracked</p>
        </div>
        <div className="list-actions">
          <Button variant="secondary" loading={generating} onClick={() => void handleMonthlyReport()}>
            Monthly Report
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add Item
          </Button>
        </div>
      </header>

      {/* Stat row */}
      <div className="dashboard-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card__label">Total Items</div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className={`stat-card${stats.lowStock > 0 ? ' stat-card--warning' : ''}`}>
          <div className="stat-card__label">Low Stock</div>
          <div className="stat-card__value">{stats.lowStock}</div>
        </div>
        <div className={`stat-card${stats.expiringSoon > 0 ? ' stat-card--warning' : ''}`}>
          <div className="stat-card__label">Expiring (&lt;30 days)</div>
          <div className="stat-card__value">{stats.expiringSoon}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ marginBottom: 12 }}>
        {(['all', 'reagent', 'consumable', 'control', 'equipment'] as CategoryFilter[]).map((c) => (
          <button
            key={c}
            type="button"
            className={`filter-chip${category === c ? ' filter-chip--active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <Input
            placeholder="Search item, supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="-" headline="No inventory items" description="Add items to start tracking stock levels." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Min Level</th>
              <th>Expiry</th>
              <th>Supplier</th>
              <th>Cost/Unit</th>
              <th>Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} style={rowBorderStyle(item)}>
                <TableCell>
                  <strong style={{ fontSize: 13 }}>{item.item_name}</strong>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                    {item.category}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{
                    fontWeight: 600,
                    color: item.current_stock < item.minimum_level
                      ? 'var(--color-status-danger)'
                      : 'var(--color-text-primary)'
                  }}>
                    {item.current_stock} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {item.minimum_level} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{item.expiry_date ? formatDate(item.expiry_date) : '—'}</span>
                    {expiryBadge(item.expiry_date)}
                  </div>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {item.supplier ?? '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12 }}>{formatNaira(item.cost_per_unit)}</span>
                </TableCell>
                <TableCell onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setUsageTarget(item); setUsageQty(''); setUsageReason('') }}
                    >
                      Use
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRestockTarget(item)
                        setRestockQty(''); setRestockSupplier(item.supplier ?? ''); setRestockCost('')
                        setRestockExpiry(item.expiry_date ?? ''); setRestockBatch('')
                      }}
                    >
                      Restock
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Record Usage Modal */}
      <Modal
        open={Boolean(usageTarget)}
        title={`Record Usage — ${usageTarget?.item_name ?? ''}`}
        onClose={() => setUsageTarget(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setUsageTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={savingUsage} onClick={() => void handleRecordUsage()}>
              Record Usage
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Current stock: <strong>{usageTarget?.current_stock} {usageTarget?.unit}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Quantity used"
            type="number"
            min={1}
            value={usageQty}
            onChange={(e) => setUsageQty(e.target.value)}
            placeholder="e.g. 5"
          />
          <Input
            label="Reason (optional)"
            value={usageReason}
            onChange={(e) => setUsageReason(e.target.value)}
            placeholder="e.g. CBC panel batch"
          />
        </div>
      </Modal>

      {/* Restock Modal */}
      <Modal
        open={Boolean(restockTarget)}
        title={`Restock — ${restockTarget?.item_name ?? ''}`}
        onClose={() => setRestockTarget(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setRestockTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={savingRestock} onClick={() => void handleRestock()}>
              Save Restock
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Quantity received"
            type="number"
            min={1}
            value={restockQty}
            onChange={(e) => setRestockQty(e.target.value)}
            placeholder="e.g. 100"
          />
          <Input
            label="Supplier"
            value={restockSupplier}
            onChange={(e) => setRestockSupplier(e.target.value)}
            placeholder="Supplier name"
          />
          <Input
            label="Unit cost (₦)"
            type="number"
            min={0}
            value={restockCost}
            onChange={(e) => setRestockCost(e.target.value)}
            placeholder="e.g. 500"
          />
          <Input
            label="New expiry date"
            type="date"
            value={restockExpiry}
            onChange={(e) => setRestockExpiry(e.target.value)}
          />
          <Input
            label="Batch number (optional)"
            value={restockBatch}
            onChange={(e) => setRestockBatch(e.target.value)}
            placeholder="e.g. BATCH-2024-001"
          />
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        open={addOpen}
        title="Add Inventory Item"
        onClose={() => { setAddOpen(false); setAddForm(EMPTY_ADD) }}
        footer={
          <>
            <Button variant="text" onClick={() => { setAddOpen(false); setAddForm(EMPTY_ADD) }}>Cancel</Button>
            <Button variant="primary" loading={savingAdd} onClick={() => void handleAddItem()}>
              Add Item
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Item name"
            value={addForm.item_name}
            onChange={(e) => setAddForm((f) => ({ ...f, item_name: e.target.value }))}
            placeholder="e.g. Haemoglobin Reagent"
          />
          <div>
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={addForm.category}
              onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value as InventoryItem['category'] }))}
            >
              <option value="reagent">Reagent</option>
              <option value="consumable">Consumable</option>
              <option value="control">Control</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Current stock"
              type="number"
              min={0}
              value={addForm.current_stock}
              onChange={(e) => setAddForm((f) => ({ ...f, current_stock: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Unit"
              value={addForm.unit}
              onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="e.g. mL, vials, pcs"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Minimum level"
              type="number"
              min={0}
              value={addForm.minimum_level}
              onChange={(e) => setAddForm((f) => ({ ...f, minimum_level: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Cost per unit (₦)"
              type="number"
              min={0}
              value={addForm.cost_per_unit}
              onChange={(e) => setAddForm((f) => ({ ...f, cost_per_unit: e.target.value }))}
              placeholder="0"
            />
          </div>
          <Input
            label="Expiry date (optional)"
            type="date"
            value={addForm.expiry_date}
            onChange={(e) => setAddForm((f) => ({ ...f, expiry_date: e.target.value }))}
          />
          <Input
            label="Supplier (optional)"
            value={addForm.supplier}
            onChange={(e) => setAddForm((f) => ({ ...f, supplier: e.target.value }))}
            placeholder="Supplier name"
          />
          <Input
            label="Supplier phone (optional)"
            value={addForm.supplier_phone}
            onChange={(e) => setAddForm((f) => ({ ...f, supplier_phone: e.target.value }))}
            placeholder="+234 xxx xxx xxxx"
          />
        </div>
      </Modal>
    </section>
  )
}
