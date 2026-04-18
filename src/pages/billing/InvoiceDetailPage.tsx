import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatNaira, formatDateTime } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { openAndPrintPdfBlob } from '@/lib/printPdf'
import { friendlyError } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'
import type { Invoice, Lab, Patient, Payment, PaymentMethod } from '@/types'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'pos', 'bank_transfer', 'opay', 'palmpay']
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  pos: 'POS',
  bank_transfer: 'Bank Transfer',
  opay: 'OPay',
  palmpay: 'PalmPay'
}

function invoiceStatusBadge(status: Invoice['status']): 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INFO' {
  if (status === 'paid') return 'SUCCESS'
  if (status === 'partial') return 'WARNING'
  if (status === 'unpaid') return 'CRITICAL'
  return 'INFO'
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { role, user } = useAuthContext()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [recording, setRecording] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!invoiceId) return
    let mounted = true

    const load = async () => {
      const inv = await db.invoices.get(invoiceId)
      if (!mounted || !inv) return

      setInvoice(inv)
      const [patientRecord, paymentRecords] = await Promise.all([
        db.patients.where('lapid').equals(inv.lapid).first(),
        db.payments.where('invoice_id').equals(inv.id).toArray()
      ])

      if (!mounted) return
      setPatient(patientRecord ?? null)
      setPayments(paymentRecords)

      if (inv.lab_id) {
        const labRecord = await db.labs.get(inv.lab_id)
        if (mounted) setLab(labRecord ?? null)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [invoiceId])

  async function handleRecordPayment() {
    if (!invoice) return
    const kobo = Math.round(parseFloat(amount) * 100)
    if (!kobo || kobo <= 0) {
      toast.push('Enter a valid amount', 'error')
      return
    }
    if (kobo > invoice.outstanding) {
      toast.push('Amount exceeds outstanding balance', 'error')
      return
    }

    setRecording(true)
    try {
      const now = new Date().toISOString()
      const payment: Payment = {
        id: crypto.randomUUID(),
        invoice_id: invoice.id,
        lab_id: invoice.lab_id,
        amount: kobo,
        method,
        reference: reference.trim() || null,
        recorded_by: user?.id ?? null,
        voided: false,
        void_reason: null,
        voided_by: null,
        created_at: now
      }

      await writeRecord('payments', 'INSERT', payment)
      setPayments((prev) => [...prev, payment])

      const newPaid = invoice.amount_paid + kobo
      const newOutstanding = invoice.total - newPaid
      const newStatus: Invoice['status'] = newOutstanding <= 0 ? 'paid' : 'partial'
      const updated: Invoice = {
        ...invoice,
        amount_paid: newPaid,
        outstanding: Math.max(0, newOutstanding),
        status: newStatus,
        updated_at: now
      }

      await writeRecord('invoices', 'UPDATE', updated, invoice)
      setInvoice(updated)
      setAmount('')
      setReference('')
      toast.push(
        offlineSuccessMessage(
          newStatus === 'paid' ? 'Invoice fully paid' : `Payment recorded — ${formatNaira(newOutstanding)} outstanding`
        )
      )
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setRecording(false)
    }
  }

  async function handlePrintReceipt() {
    if (!invoice) return
    setPrinting(true)
    try {
      const [{ pdf }, { ReceiptPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/ReceiptPDF')
      ])

      const blob = await pdf(
        <ReceiptPDF
          invoice={invoice}
          payments={payments}
          patientName={patient?.full_name ?? 'Unknown Patient'}
          labName={lab?.name ?? 'Labora AI Laboratory'}
          labAddress={lab?.address ?? ''}
          mlscnNo={lab?.mlscn_no ?? '—'}
          generatedAt={formatDateTime(new Date().toISOString())}
        />
      ).toBlob()

      await openAndPrintPdfBlob(blob)
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setPrinting(false)
    }
  }

  if (!invoice) {
    return (
      <EmptyState
        icon="?"
        headline="Invoice not found"
        description="This invoice is not cached locally."
        cta={<Button variant="secondary" onClick={() => navigate('/app/billing')}>Back to billing</Button>}
      />
    )
  }

  const isOwner = role === 'owner'

  return (
    <section className="patient-detail">
      <header className="patient-detail__header">
        <div>
          <h2 className="table-id">#{invoice.invoice_id}</h2>
          <p className="list-subtitle">{patient?.full_name ?? invoice.lapid} · <span className="table-id">{invoice.lapid}</span></p>
        </div>
        <div className="patient-detail__actions">
          <Badge status={invoiceStatusBadge(invoice.status)}>{invoice.status.toUpperCase()}</Badge>
          <Button variant="secondary" loading={printing} onClick={() => void handlePrintReceipt()}>
            Print Receipt
          </Button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }} className="sample-detail-columns">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <article className="detail-card">
            <h3>Line Items</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, color: 'var(--color-text-secondary)' }}>Test</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 11, color: 'var(--color-text-secondary)' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item) => (
                  <tr key={item.test_code} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 0' }}>{item.test_name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatNaira(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 40 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                <span>{formatNaira(invoice.subtotal)}</span>
              </div>
              {isOwner && invoice.platform_fee > 0 ? (
                <div style={{ display: 'flex', gap: 40 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Platform fee</span>
                  <span>{formatNaira(invoice.platform_fee)}</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 40, fontWeight: 600, fontSize: 16 }}>
                <span>Total</span>
                <span>{formatNaira(invoice.total)}</span>
              </div>
              <div style={{ display: 'flex', gap: 40 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Amount Paid</span>
                <span style={{ color: 'var(--color-status-success)' }}>{formatNaira(invoice.amount_paid)}</span>
              </div>
              {invoice.outstanding > 0 ? (
                <div style={{ display: 'flex', gap: 40, fontWeight: 600, color: 'var(--color-status-danger)' }}>
                  <span>Outstanding</span>
                  <span>{formatNaira(invoice.outstanding)}</span>
                </div>
              ) : null}
            </div>
          </article>

          {payments.length > 0 ? (
            <article className="detail-card">
              <h3>Payment History</h3>
              <div className="detail-timeline">
                {payments.map((payment) => (
                  <div key={payment.id} className="detail-timeline__row">
                    <strong>{METHOD_LABELS[payment.method]}</strong>
                    {payment.reference ? <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{payment.reference}</span> : null}
                    <span style={{ color: 'var(--color-status-success)' }}>{formatNaira(payment.amount)}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatDateTime(payment.created_at)}</span>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        {invoice.status !== 'paid' ? (
          <article className="detail-card">
            <h3>Record Payment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label={`Amount (₦) — outstanding: ${formatNaira(invoice.outstanding)}`}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Payment method</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PAYMENT_METHODS.map((paymentMethod) => (
                    <button
                      key={paymentMethod}
                      type="button"
                      onClick={() => setMethod(paymentMethod)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${method === paymentMethod ? 'var(--color-mint)' : 'var(--color-border)'}`,
                        background: method === paymentMethod ? 'rgba(0,229,160,0.12)' : 'transparent',
                        color: method === paymentMethod ? 'var(--color-mint)' : 'var(--color-text-secondary)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {METHOD_LABELS[paymentMethod]}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Reference (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="POS slip no., transfer ref…"
              />

              <Button variant="primary" loading={recording} onClick={() => void handleRecordPayment()}>
                Record Payment
              </Button>
            </div>
          </article>
        ) : (
          <article className="detail-card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-status-success)', fontSize: 20, fontWeight: 700 }}>✓ PAID IN FULL</p>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{formatNaira(invoice.amount_paid)} received</p>
          </article>
        )}
      </div>
    </section>
  )
}
