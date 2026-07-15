import React, { useState } from 'react'
import { invoiceRepo, labRepo, patientRepo, sampleRepo, visitRepo } from '@/lib/repositories'
import { format, parseISO } from 'date-fns'
import { Button, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatDate } from '@/lib/formatters'
import { friendlyError } from '@/lib/supabaseQuery'

type ReportType = 'revenue' | 'test_volume' | 'patient'

interface ReportCard {
  type: ReportType
  title: string
  description: string
  ownerOnly?: boolean
}

const REPORT_CARDS: ReportCard[] = [
  { type: 'revenue', title: 'Revenue Report', description: 'Total income, outstanding, and payment method breakdown for the selected period.', ownerOnly: true },
  { type: 'test_volume', title: 'Test Volume Report', description: 'Number of tests performed by type and category for the selected period.' },
  { type: 'patient', title: 'Patient Report', description: 'New patient registrations and visit frequency for the selected period.' }
]

function inRange(ds: string, from: Date, to: Date) {
  const time = new Date(ds).getTime()
  return time >= from.getTime() && time <= to.getTime()
}

function toEndOfDay(d: Date) {
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return end
}

function formatKobo(kobo: number) {
  return `N${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadBlob(filename, new Blob([content], { type: 'text/csv' }))
}

async function loadPdfTools() {
  const { pdf, Document, Page, StyleSheet, Text, View } = await import('@react-pdf/renderer')
  const palette = {
    bg: '#FFFFFF',
    textPrimary: '#0A0A0A',
    textSecondary: '#4A4A4A',
    forest: '#003D28',
    mint: '#00875A',
    border: '#E0E0E0'
  }

  const styles = StyleSheet.create({
    page: { backgroundColor: palette.bg, padding: 40, fontFamily: 'Helvetica' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 2,
      borderBottomColor: palette.forest,
      paddingBottom: 10,
      marginBottom: 14
    },
    labName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: palette.forest },
    meta: { fontSize: 9, color: palette.textSecondary, marginTop: 2 },
    title: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: palette.textPrimary },
    section: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.textSecondary,
      textTransform: 'uppercase',
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      paddingBottom: 4,
      marginBottom: 8,
      marginTop: 12
    },
    tableHead: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: '4 6', borderBottomWidth: 1, borderBottomColor: palette.border },
    tableRow: { flexDirection: 'row', padding: '3 6', borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE' },
    c1: { flex: 3, fontSize: 8 },
    c2: { flex: 2, fontSize: 8 },
    c3: { flex: 1, fontSize: 8, textAlign: 'right' },
    cHead: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: palette.textSecondary, textTransform: 'uppercase' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    summaryLabel: { fontSize: 10, color: palette.textSecondary },
    summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    footer: { borderTopWidth: 1, borderTopColor: palette.border, marginTop: 20, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 8, color: palette.textSecondary }
  })

  function PdfHeader(props: { labName: string; labAddress: string; reportTitle: string; period: string; generatedAt: string }) {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.labName}>{props.labName}</Text>
          <Text style={styles.meta}>{props.labAddress}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.title}>{props.reportTitle}</Text>
          <Text style={styles.meta}>{props.period}</Text>
          <Text style={styles.meta}>Generated: {props.generatedAt}</Text>
        </View>
      </View>
    )
  }

  function PdfFooter(props: { labName: string; generatedAt: string }) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated: {props.generatedAt}</Text>
        <Text style={styles.footerText}>{props.labName}</Text>
      </View>
    )
  }

  return { pdf, Document, Page, Text, View, styles, palette, PdfHeader, PdfFooter }
}

export function ReportsPage() {
  const toast = useToast()
  const { role } = useAuthContext()
  const isOwner = role === 'owner'

  const defaultFrom = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  const defaultTo = format(new Date(), 'yyyy-MM-dd')

  const [dates, setDates] = useState<Record<ReportType, { from: string; to: string }>>({
    revenue: { from: defaultFrom, to: defaultTo },
    test_volume: { from: defaultFrom, to: defaultTo },
    patient: { from: defaultFrom, to: defaultTo }
  })
  const [generating, setGenerating] = useState<ReportType | null>(null)

  function setDate(type: ReportType, field: 'from' | 'to', value: string) {
    setDates((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  async function getLabInfo() {
    const labs = await labRepo.all()
    return { labName: labs[0]?.name ?? 'Lab', labAddress: labs[0]?.address ?? '' }
  }

  async function generateRevenue(from: Date, to: Date) {
    const invoices = (await invoiceRepo.all()).filter((invoice) => inRange(invoice.created_at, from, toEndOfDay(to)))
    const patients = await patientRepo.all()
    const patientMap = new Map(patients.map((patient) => [patient.labid, patient.full_name]))
    const { labName, labAddress } = await getLabInfo()
    const period = `${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`
    const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a')
    const byStatus = { paid: 0, partial: 0, unpaid: 0 }

    for (const invoice of invoices) {
      if (invoice.status in byStatus) byStatus[invoice.status as keyof typeof byStatus]++
    }

    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0)
    const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0)
    const { pdf, Document, Page, Text, View, styles, palette, PdfHeader, PdfFooter } = await loadPdfTools()

    const blob = await pdf(
      <Document>
        <Page size="A4" style={styles.page}>
          <PdfHeader labName={labName} labAddress={labAddress} reportTitle="REVENUE REPORT" period={period} generatedAt={generatedAt} />
          <Text style={styles.section}>Summary</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Invoiced</Text><Text style={styles.summaryValue}>{formatKobo(totalRevenue)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Collected</Text><Text style={[styles.summaryValue, { color: palette.mint }]}>{formatKobo(totalCollected)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Outstanding</Text><Text style={[styles.summaryValue, { color: '#CC0000' }]}>{formatKobo(totalOutstanding)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Invoices: Paid / Partial / Unpaid</Text><Text style={styles.summaryValue}>{byStatus.paid} / {byStatus.partial} / {byStatus.unpaid}</Text></View>
          <Text style={styles.section}>Invoices</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.c1, styles.cHead]}>Invoice ID</Text>
            <Text style={[styles.c2, styles.cHead]}>Patient</Text>
            <Text style={[styles.c3, styles.cHead]}>Total</Text>
            <Text style={[styles.c3, styles.cHead]}>Paid</Text>
            <Text style={[styles.c2, styles.cHead]}>Status</Text>
          </View>
          {invoices.slice(0, 100).map((invoice) => (
            <View key={invoice.id} style={styles.tableRow}>
              <Text style={styles.c1}>#{invoice.invoice_id}</Text>
              <Text style={styles.c2}>{patientMap.get(invoice.labid) ?? invoice.labid}</Text>
              <Text style={styles.c3}>{formatKobo(invoice.total)}</Text>
              <Text style={styles.c3}>{formatKobo(invoice.amount_paid)}</Text>
              <Text style={styles.c2}>{invoice.status}</Text>
            </View>
          ))}
          <PdfFooter labName={labName} generatedAt={generatedAt} />
        </Page>
      </Document>
    ).toBlob()

    return { blob, filename: `revenue-report-${format(from, 'yyyy-MM-dd')}.pdf` }
  }

  async function generateTestVolume(from: Date, to: Date) {
    const samples = (await sampleRepo.all()).filter((sample) => inRange(sample.collected_at, from, toEndOfDay(to)))
    const { labName, labAddress } = await getLabInfo()
    const period = `${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`
    const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a')
    const testCounts = new Map<string, number>()

    for (const sample of samples) {
      for (const test of sample.tests_ordered) testCounts.set(test, (testCounts.get(test) ?? 0) + 1)
    }

    const sorted = Array.from(testCounts.entries()).sort((a, b) => b[1] - a[1])
    const { pdf, Document, Page, Text, View, styles, PdfHeader, PdfFooter } = await loadPdfTools()

    const blob = await pdf(
      <Document>
        <Page size="A4" style={styles.page}>
          <PdfHeader labName={labName} labAddress={labAddress} reportTitle="TEST VOLUME REPORT" period={period} generatedAt={generatedAt} />
          <Text style={styles.section}>Summary</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Samples</Text><Text style={styles.summaryValue}>{samples.length}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Unique Test Types</Text><Text style={styles.summaryValue}>{sorted.length}</Text></View>
          <Text style={styles.section}>Test Breakdown</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.c1, styles.cHead]}>Test Name</Text>
            <Text style={[styles.c3, styles.cHead]}>Count</Text>
          </View>
          {sorted.map(([test, count]) => (
            <View key={test} style={styles.tableRow}>
              <Text style={styles.c1}>{test}</Text>
              <Text style={styles.c3}>{count}</Text>
            </View>
          ))}
          <PdfFooter labName={labName} generatedAt={generatedAt} />
        </Page>
      </Document>
    ).toBlob()

    return { blob, filename: `test-volume-${format(from, 'yyyy-MM-dd')}.pdf` }
  }

  async function generatePatient(from: Date, to: Date) {
    const patients = (await patientRepo.all()).filter((patient) => inRange(patient.created_at, from, toEndOfDay(to)))
    const visits = await visitRepo.all()
    const { labName, labAddress } = await getLabInfo()
    const period = `${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`
    const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a')
    const visitCounts = new Map<string, number>()

    for (const visit of visits) visitCounts.set(visit.labid, (visitCounts.get(visit.labid) ?? 0) + 1)

    const { pdf, Document, Page, Text, View, styles, PdfHeader, PdfFooter } = await loadPdfTools()
    const blob = await pdf(
      <Document>
        <Page size="A4" style={styles.page}>
          <PdfHeader labName={labName} labAddress={labAddress} reportTitle="PATIENT REPORT" period={period} generatedAt={generatedAt} />
          <Text style={styles.section}>Summary</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>New Registrations</Text><Text style={styles.summaryValue}>{patients.length}</Text></View>
          <Text style={styles.section}>Patients Registered</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.c1, styles.cHead]}>Full Name</Text>
            <Text style={[styles.c2, styles.cHead]}>LABID</Text>
            <Text style={[styles.c3, styles.cHead]}>Visits</Text>
            <Text style={[styles.c2, styles.cHead]}>Registered</Text>
          </View>
          {patients.slice(0, 100).map((patient) => (
            <View key={patient.id} style={styles.tableRow}>
              <Text style={styles.c1}>{patient.full_name}</Text>
              <Text style={styles.c2}>{patient.labid}</Text>
              <Text style={styles.c3}>{visitCounts.get(patient.labid) ?? 0}</Text>
              <Text style={styles.c2}>{format(new Date(patient.created_at), 'dd MMM yyyy')}</Text>
            </View>
          ))}
          <PdfFooter labName={labName} generatedAt={generatedAt} />
        </Page>
      </Document>
    ).toBlob()

    return { blob, filename: `patient-report-${format(from, 'yyyy-MM-dd')}.pdf` }
  }

  async function handleGenerate(type: ReportType, exportType: 'pdf' | 'csv') {
    const { from: fromStr, to: toStr } = dates[type]
    if (!fromStr || !toStr) {
      toast.push('Select a date range', 'error')
      return
    }

    const from = parseISO(fromStr)
    const to = parseISO(toStr)
    if (from > to) {
      toast.push('From date must be before To date', 'error')
      return
    }

    setGenerating(type)
    try {
      if (exportType === 'pdf') {
        const result =
          type === 'revenue'
            ? await generateRevenue(from, to)
            : type === 'test_volume'
            ? await generateTestVolume(from, to)
            : await generatePatient(from, to)

        downloadBlob(result.filename, result.blob)
        toast.push('PDF downloaded')
      } else {
        const rangeEnd = toEndOfDay(to)

        if (type === 'revenue') {
          const invoices = (await invoiceRepo.all()).filter((invoice) => inRange(invoice.created_at, from, rangeEnd))
          const patients = await patientRepo.all()
          const patientMap = new Map(patients.map((patient) => [patient.labid, patient.full_name]))
          const rows: string[][] = [['Invoice ID', 'Patient', 'LABID', 'Total (N)', 'Paid (N)', 'Outstanding (N)', 'Status', 'Date']]
          for (const invoice of invoices) {
            rows.push([
              invoice.invoice_id,
              patientMap.get(invoice.labid) ?? invoice.labid,
              invoice.labid,
              String(invoice.total / 100),
              String(invoice.amount_paid / 100),
              String(invoice.outstanding / 100),
              invoice.status,
              formatDate(invoice.created_at)
            ])
          }
          downloadCsv(`revenue-${fromStr}.csv`, rows)
        } else if (type === 'test_volume') {
          const samples = (await sampleRepo.all()).filter((sample) => inRange(sample.collected_at, from, rangeEnd))
          const testCounts = new Map<string, number>()
          for (const sample of samples) {
            for (const test of sample.tests_ordered) testCounts.set(test, (testCounts.get(test) ?? 0) + 1)
          }
          const rows: string[][] = [['Test Name', 'Count']]
          for (const [test, count] of Array.from(testCounts.entries()).sort((a, b) => b[1] - a[1])) rows.push([test, String(count)])
          downloadCsv(`test-volume-${fromStr}.csv`, rows)
        } else {
          const patients = (await patientRepo.all()).filter((patient) => inRange(patient.created_at, from, rangeEnd))
          const rows: string[][] = [['Full Name', 'LABID', 'Gender', 'Phone', 'Registered']]
          for (const patient of patients) {
            rows.push([patient.full_name, patient.labid, patient.gender ?? '', patient.phone, formatDate(patient.created_at)])
          }
          downloadCsv(`patients-${fromStr}.csv`, rows)
        }

        toast.push('CSV downloaded')
      }
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setGenerating(null)
    }
  }

  const visibleCards = REPORT_CARDS.filter((card) => !card.ownerOnly || isOwner)

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Reports</h2>
          <p className="list-subtitle">Generate and export lab reports</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginTop: 8 }}>
        {visibleCards.map((card) => {
          const isLoading = generating === card.type

          return (
            <div key={card.type} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{card.title}</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{card.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="form-label">From</label>
                  <input type="date" className="form-input" value={dates[card.type].from} onChange={(e) => setDate(card.type, 'from', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">To</label>
                  <input type="date" className="form-input" value={dates[card.type].to} onChange={(e) => setDate(card.type, 'to', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" loading={isLoading} onClick={() => void handleGenerate(card.type, 'pdf')}>
                  Export PDF
                </Button>
                <Button variant="secondary" size="sm" loading={isLoading} onClick={() => void handleGenerate(card.type, 'csv')}>
                  Export CSV
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
