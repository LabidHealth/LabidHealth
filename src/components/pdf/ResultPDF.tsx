import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ResultParameterStatus } from '@/types'

const C = {
  bg: '#FFFFFF',
  ink: '#0F172A',
  sub: '#475569',
  red: '#C0392B',
  amber: '#B45309',
  navy: '#0F172A',
  blue: '#2563EB',
  border: '#E2E8F0',
  tint: '#F1F5F9'
}

export interface ResultPDFRow {
  name: string
  value: string
  unit: string
  ref: string
  status: ResultParameterStatus
}

export interface ResultPDFProps {
  testName: string
  patientName: string
  patientLabid: string
  patientAge: string
  patientGender: string
  referringDoctor: string
  collectionDate: string
  resultDate: string
  labName: string
  labAddress: string
  labPhone: string
  mlscnNo: string
  logoUrl?: string | null
  qrDataUrl: string
  reportId: string
  rows: ResultPDFRow[]
  narrativeText?: string | null
  comments?: string | null
  criticalAcknowledged?: boolean
  scientistName?: string | null
  scientistRa?: string | null
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 40, fontFamily: 'Helvetica', color: C.ink },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: C.blue, paddingBottom: 12, marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38 },
  labName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.navy },
  labMeta: { fontSize: 9, color: C.sub, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  reportTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.ink },
  reportId: { fontSize: 9, color: C.sub, marginTop: 2, fontFamily: 'Courier' },
  patientSection: { backgroundColor: C.tint, padding: 12, borderRadius: 6, marginBottom: 14 },
  patientName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: C.ink, letterSpacing: 1 },
  patientLabid: { fontSize: 10, fontFamily: 'Courier', color: C.blue, marginTop: 3 },
  patientMeta: { flexDirection: 'row', gap: 20, marginTop: 8 },
  patientMetaItem: { fontSize: 8, color: C.sub, textTransform: 'uppercase' },
  patientMetaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 1 },
  sectionHeading: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.navy, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6, marginBottom: 10, marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.tint, padding: '6 8', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 0.5, borderBottomColor: '#EEF1F5' },
  colParam: { flex: 2.2, fontSize: 9, color: C.ink },
  colResult: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink },
  colUnit: { flex: 1, fontSize: 9, color: C.sub },
  colRef: { flex: 1.8, fontSize: 9, color: C.sub },
  colHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.sub, textTransform: 'uppercase' },
  hiText: { color: C.red, fontFamily: 'Helvetica-Bold' },
  loText: { color: C.amber, fontFamily: 'Helvetica-Bold' },
  narrative: { fontSize: 10, color: C.ink, lineHeight: 1.6, padding: '4 2' },
  commentsSection: { marginTop: 14, borderLeftWidth: 3, borderLeftColor: C.blue, paddingLeft: 10 },
  commentsLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.sub, textTransform: 'uppercase', marginBottom: 4 },
  commentsText: { fontSize: 10, color: C.ink, lineHeight: 1.5 },
  critBox: { marginTop: 10, padding: '6 10', backgroundColor: '#FDECEC', borderRadius: 4 },
  critText: { fontSize: 8, color: C.red, fontFamily: 'Helvetica-Bold' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 26 },
  qrCode: { width: 70, height: 70 },
  qrLabel: { fontSize: 7, color: C.sub, textAlign: 'center', marginTop: 3 },
  signatureBlock: { marginBottom: 8 },
  signatureName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 20 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: C.sub, width: 180, marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: C.sub },
  footer: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.sub }
})

function indicator(s: ResultParameterStatus) {
  if (s === 'high' || s === 'critical_high') return ' ↑'
  if (s === 'low' || s === 'critical_low') return ' ↓'
  return ''
}

export function ResultPDF(props: ResultPDFProps) {
  const {
    testName, patientName, patientLabid, patientAge, patientGender, referringDoctor,
    collectionDate, resultDate, labName, labAddress, labPhone, mlscnNo, logoUrl, qrDataUrl,
    reportId, rows, narrativeText, comments, criticalAcknowledged, scientistName, scientistRa
  } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.labName}>{labName}</Text>
              <Text style={styles.labMeta}>{labAddress}</Text>
              <Text style={styles.labMeta}>{labPhone}</Text>
              <Text style={styles.labMeta}>MLSCN Reg: {mlscnNo}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>LABORATORY RESULT</Text>
            <Text style={styles.reportId}>{reportId}</Text>
            <Text style={styles.labMeta}>Generated: {resultDate}</Text>
          </View>
        </View>

        <View style={styles.patientSection}>
          <Text style={styles.patientName}>{patientName.toUpperCase()}</Text>
          <Text style={styles.patientLabid}>{patientLabid}</Text>
          <View style={styles.patientMeta}>
            <View><Text style={styles.patientMetaItem}>Age</Text><Text style={styles.patientMetaValue}>{patientAge}</Text></View>
            <View><Text style={styles.patientMetaItem}>Gender</Text><Text style={styles.patientMetaValue}>{patientGender || '—'}</Text></View>
            <View><Text style={styles.patientMetaItem}>Referring Doctor</Text><Text style={styles.patientMetaValue}>{referringDoctor || '—'}</Text></View>
            <View><Text style={styles.patientMetaItem}>Collection Date</Text><Text style={styles.patientMetaValue}>{collectionDate}</Text></View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>{testName}</Text>

        {narrativeText != null ? (
          <Text style={styles.narrative}>{narrativeText || '—'}</Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.colParam, styles.colHeaderText]}>Parameter</Text>
              <Text style={[styles.colResult, styles.colHeaderText]}>Result</Text>
              <Text style={[styles.colUnit, styles.colHeaderText]}>Unit</Text>
              <Text style={[styles.colRef, styles.colHeaderText]}>Reference</Text>
            </View>
            {rows.map((r, i) => {
              const hi = r.status === 'high' || r.status === 'critical_high'
              const lo = r.status === 'low' || r.status === 'critical_low'
              const resultStyle = hi ? [styles.colResult, styles.hiText] : lo ? [styles.colResult, styles.loText] : [styles.colResult]
              return (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colParam}>{r.name}</Text>
                  <Text style={resultStyle}>{r.value || '—'}{indicator(r.status)}</Text>
                  <Text style={styles.colUnit}>{r.unit}</Text>
                  <Text style={styles.colRef}>{r.ref}</Text>
                </View>
              )
            })}
          </>
        )}

        {comments ? (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsLabel}>Interpretation / Comments</Text>
            <Text style={styles.commentsText}>{comments}</Text>
          </View>
        ) : null}

        {criticalAcknowledged ? (
          <View style={styles.critBox}>
            <Text style={styles.critText}>Critical value acknowledged by the scientist before sign-out.</Text>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{scientistName || ''}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signed by Medical Laboratory Scientist{scientistRa ? ` · ${scientistRa}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Image src={qrDataUrl} style={styles.qrCode} />
            <Text style={styles.qrLabel}>Scan to verify</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Report ID: {reportId}</Text>
          <Text style={styles.footerText}>Confidential — intended for the named patient and their physician.</Text>
        </View>
      </Page>
    </Document>
  )
}
