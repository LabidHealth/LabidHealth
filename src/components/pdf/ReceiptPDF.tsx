import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Invoice, Payment } from '@/types'

const C = {
  bg: '#FFFFFF',
  textPrimary: '#0A0A0A',
  textSecondary: '#4A4A4A',
  forest: '#003D28',
  mint: '#00875A',
  amber: '#B36B00',
  border: '#E0E0E0'
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 20, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: C.forest, paddingBottom: 8, marginBottom: 12
  },
  labName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.forest },
  labMeta: { fontSize: 8, color: C.textSecondary, marginTop: 1 },
  receiptTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  receiptId: { fontSize: 8, color: C.textSecondary, marginTop: 1, fontFamily: 'Courier' },
  patientSection: { backgroundColor: '#F5F5F0', padding: 8, borderRadius: 2, marginBottom: 10 },
  patientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  patientLabid: { fontSize: 8, fontFamily: 'Courier', color: C.forest, marginTop: 2 },
  sectionHeading: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textSecondary,
    textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: C.border,
    paddingBottom: 2, marginBottom: 6, marginTop: 10
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: '3 5', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRow: { flexDirection: 'row', padding: '3 5', borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE' },
  colDesc: { flex: 3, fontSize: 8, color: C.textPrimary },
  colAmt: { flex: 1, fontSize: 8, color: C.textPrimary, textAlign: 'right' },
  colHeaderText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.textSecondary, textTransform: 'uppercase' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 30,
    marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border
  },
  totalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  totalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  stamp: {
    alignSelf: 'center', marginTop: 16, padding: '8 16',
    borderWidth: 1.5, borderRadius: 3
  },
  stampText: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  footer: {
    borderTopWidth: 1, borderTopColor: C.border, marginTop: 16,
    paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between'
  },
  footerText: { fontSize: 7, color: C.textSecondary }
})

function formatKobo(kobo: number): string {
  const naira = kobo / 100
  return `\u20A6${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export interface ReceiptPDFProps {
  invoice: Invoice
  payments: Payment[]
  patientName: string
  labName: string
  labAddress: string
  mlscnNo: string
  generatedAt: string
}

export function ReceiptPDF({
  invoice, payments, patientName, labName, labAddress, mlscnNo, generatedAt
}: ReceiptPDFProps) {
  const isPaid = invoice.status === 'paid'
  const stampColor = isPaid ? C.mint : C.amber
  const stampText = isPaid ? 'PAID IN FULL' : 'PARTIAL PAYMENT'

  return (
    <Document>
      <Page size={[301, 600]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.labName}>{labName}</Text>
            <Text style={styles.labMeta}>{labAddress}</Text>
            <Text style={styles.labMeta}>MLSCN: {mlscnNo}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
            <Text style={styles.receiptId}>#{invoice.invoice_id}</Text>
            <Text style={styles.labMeta}>{generatedAt}</Text>
          </View>
        </View>

        {/* Patient */}
        <View style={styles.patientSection}>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.patientLabid}>{invoice.labid}</Text>
        </View>

        {/* Line items */}
        <Text style={styles.sectionHeading}>Tests</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.colHeaderText]}>Description</Text>
          <Text style={[styles.colAmt, styles.colHeaderText]}>Amount</Text>
        </View>
        {invoice.line_items.map((item) => (
          <View key={item.test_code} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.test_name}</Text>
            <Text style={styles.colAmt}>{formatKobo(item.price)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalValue}>{formatKobo(invoice.amount_paid)}</Text>
        </View>
        {invoice.outstanding > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 40, marginTop: 4 }}>
            <Text style={{ fontSize: 9, color: '#CC0000' }}>Outstanding</Text>
            <Text style={{ fontSize: 9, color: '#CC0000', fontFamily: 'Helvetica-Bold' }}>{formatKobo(invoice.outstanding)}</Text>
          </View>
        ) : null}

        {/* Payment method */}
        <Text style={styles.sectionHeading}>Payments Recorded</Text>
        {payments.map((p) => (
          <View key={p.id} style={styles.tableRow}>
            <Text style={styles.colDesc}>{p.method.toUpperCase()}{p.reference ? ` — ${p.reference}` : ''}</Text>
            <Text style={styles.colAmt}>{formatKobo(p.amount)}</Text>
          </View>
        ))}

        {/* Stamp */}
        <View style={[styles.stamp, { borderColor: stampColor }]}>
          <Text style={[styles.stampText, { color: stampColor }]}>{stampText}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated: {generatedAt}</Text>
          <Text style={styles.footerText}>Thank you for choosing {labName}</Text>
        </View>
      </Page>
    </Document>
  )
}
