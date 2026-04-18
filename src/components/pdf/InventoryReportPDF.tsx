import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { InventoryItem, InventoryEvent } from '@/types'

const C = {
  bg: '#FFFFFF',
  textPrimary: '#0A0A0A',
  textSecondary: '#4A4A4A',
  forest: '#003D28',
  mint: '#00875A',
  amber: '#B36B00',
  danger: '#CC0000',
  border: '#E0E0E0'
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 40, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 2, borderBottomColor: C.forest, paddingBottom: 12, marginBottom: 16
  },
  labName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.forest },
  labMeta: { fontSize: 9, color: C.textSecondary, marginTop: 2 },
  reportTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  reportPeriod: { fontSize: 9, color: C.textSecondary, marginTop: 2 },
  sectionHeading: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.textSecondary,
    textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: C.border,
    paddingBottom: 4, marginBottom: 8, marginTop: 14
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: '5 8', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRow: { flexDirection: 'row', padding: '4 8', borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE' },
  col1: { flex: 3, fontSize: 9, color: C.textPrimary },
  col2: { flex: 2, fontSize: 9, color: C.textPrimary },
  col3: { flex: 1, fontSize: 9, color: C.textPrimary, textAlign: 'right' },
  colH: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textSecondary, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 10, color: C.textSecondary },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  footer: {
    borderTopWidth: 1, borderTopColor: C.border, marginTop: 24,
    paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between'
  },
  footerText: { fontSize: 8, color: C.textSecondary }
})

export interface InventoryReportPDFProps {
  items: InventoryItem[]
  events: InventoryEvent[]
  labName: string
  labAddress: string
  month: string
  generatedAt: string
}

export function InventoryReportPDF({ items, events, labName, labAddress, month, generatedAt }: InventoryReportPDFProps) {
  // Usage events this month
  const usageEvents = events.filter((e) => e.event_type === 'usage')
  const usageByItem = new Map<string, number>()
  for (const e of usageEvents) {
    usageByItem.set(e.item_id, (usageByItem.get(e.item_id) ?? 0) + e.quantity)
  }

  const lowStock = items.filter((i) => i.current_stock < i.minimum_level)

  const totalUsageCost = usageEvents.reduce((sum, e) => sum + e.unit_cost * e.quantity, 0)
  const formatKobo = (k: number) => `\u20A6${(k / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.labName}>{labName}</Text>
            <Text style={styles.labMeta}>{labAddress}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.reportTitle}>INVENTORY USAGE REPORT</Text>
            <Text style={styles.reportPeriod}>{month}</Text>
            <Text style={styles.labMeta}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={styles.sectionHeading}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Items Tracked</Text>
          <Text style={styles.summaryValue}>{items.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Low Stock Items</Text>
          <Text style={[styles.summaryValue, { color: lowStock.length > 0 ? C.amber : C.mint }]}>{lowStock.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Usage Cost This Month</Text>
          <Text style={styles.summaryValue}>{formatKobo(totalUsageCost)}</Text>
        </View>

        {/* Usage table */}
        <Text style={styles.sectionHeading}>Usage This Month</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, styles.colH]}>Item</Text>
          <Text style={[styles.col2, styles.colH]}>Category</Text>
          <Text style={[styles.col3, styles.colH]}>Qty Used</Text>
        </View>
        {items.map((item) => {
          const used = usageByItem.get(item.id) ?? 0
          if (used === 0) return null
          return (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.col1}>{item.item_name}</Text>
              <Text style={styles.col2}>{item.category}</Text>
              <Text style={styles.col3}>{used} {item.unit}</Text>
            </View>
          )
        })}

        {/* Low stock */}
        {lowStock.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Low Stock Alert</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.col1, styles.colH]}>Item</Text>
              <Text style={[styles.col2, styles.colH]}>Current Stock</Text>
              <Text style={[styles.col3, styles.colH]}>Min Level</Text>
            </View>
            {lowStock.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.col1, { color: C.danger }]}>{item.item_name}</Text>
                <Text style={styles.col2}>{item.current_stock} {item.unit}</Text>
                <Text style={styles.col3}>{item.minimum_level}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated: {generatedAt}</Text>
          <Text style={styles.footerText}>{labName} — Inventory Report</Text>
        </View>
      </Page>
    </Document>
  )
}
