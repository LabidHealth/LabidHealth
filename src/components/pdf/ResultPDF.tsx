import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Result, ResultParameter } from '@/types'

// ── Design tokens (design.md §6.3) ──────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  textPrimary: '#0A0A0A',
  textSecondary: '#4A4A4A',
  outOfRange: '#CC0000',
  forest: '#003D28',
  border: '#E0E0E0',
  amber: '#B36B00'
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    padding: 40,
    fontFamily: 'Helvetica'
  },
  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: C.forest,
    paddingBottom: 12,
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 40,
    height: 40
  },
  labName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.forest
  },
  labMeta: {
    fontSize: 9,
    color: C.textSecondary,
    marginTop: 2
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.textPrimary
  },
  reportId: {
    fontSize: 9,
    color: C.textSecondary,
    marginTop: 2,
    fontFamily: 'Courier'
  },
  // ── Patient section ───────────────────────────────────────────────────────
  patientSection: {
    backgroundColor: '#F5F5F0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 14
  },
  patientName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.textPrimary,
    letterSpacing: 1
  },
  patientLabid: {
    fontSize: 10,
    fontFamily: 'Courier',
    color: C.forest,
    marginTop: 3
  },
  patientMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6
  },
  patientMetaItem: {
    fontSize: 9,
    color: C.textSecondary
  },
  patientMetaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.textPrimary
  },
  // ── Section heading ───────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.forest,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 6,
    marginBottom: 10,
    marginTop: 14
  },
  // ── Parameters table ──────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    padding: '6 8',
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE'
  },
  colParam: { flex: 2, fontSize: 9, color: C.textPrimary },
  colResult: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.textPrimary },
  colUnit: { flex: 1, fontSize: 9, color: C.textSecondary },
  colRef: { flex: 2, fontSize: 9, color: C.textSecondary },
  colHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textSecondary, textTransform: 'uppercase' },
  outOfRangeText: { color: C.outOfRange, fontFamily: 'Helvetica-Bold' },
  lowText: { color: C.amber, fontFamily: 'Helvetica-Bold' },
  // ── Comments ──────────────────────────────────────────────────────────────
  commentsSection: {
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.outOfRange,
    paddingLeft: 10
  },
  commentsLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  commentsText: {
    fontSize: 10,
    color: C.textPrimary,
    lineHeight: 1.5
  },
  // ── Bottom row ────────────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24
  },
  qrCode: {
    width: 72,
    height: 72
  },
  qrLabel: {
    fontSize: 7,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 3
  },
  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 16,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    fontSize: 8,
    color: C.textSecondary
  },
  signatureBlock: {
    marginBottom: 24
  },
  signatureLabel: {
    fontSize: 8,
    color: C.textSecondary
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.textSecondary,
    width: 160,
    marginTop: 20,
    marginBottom: 4
  }
})

// Reference ranges — same source of truth as ResultEntryPage
const REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string }> = {
  haemoglobin: { low: 12.0, high: 17.5, unit: 'g/dL' },
  wbc: { low: 4.0, high: 11.0, unit: '×10⁹/L' },
  platelets: { low: 150, high: 400, unit: '×10⁹/L' },
  pcv: { low: 36, high: 52, unit: '%' },
  mcv: { low: 80, high: 100, unit: 'fL' },
  mch: { low: 27, high: 33, unit: 'pg' },
  mchc: { low: 32, high: 36, unit: 'g/dL' },
  glucose: { low: 3.9, high: 5.5, unit: 'mmol/L' },
  total_bilirubin: { low: 0, high: 21, unit: 'µmol/L' },
  direct_bilirubin: { low: 0, high: 7, unit: 'µmol/L' },
  alt: { low: 0, high: 40, unit: 'U/L' },
  ast: { low: 0, high: 40, unit: 'U/L' },
  alp: { low: 44, high: 147, unit: 'U/L' },
  total_protein: { low: 60, high: 80, unit: 'g/L' },
  albumin: { low: 35, high: 50, unit: 'g/L' },
  urea: { low: 2.5, high: 7.8, unit: 'mmol/L' },
  creatinine: { low: 44, high: 106, unit: 'µmol/L' },
  egfr: { low: 60, high: 200, unit: 'mL/min/1.73m²' },
  sodium: { low: 135, high: 145, unit: 'mmol/L' },
  potassium: { low: 3.5, high: 5.1, unit: 'mmol/L' },
  chloride: { low: 98, high: 107, unit: 'mmol/L' },
  bicarbonate: { low: 22, high: 29, unit: 'mmol/L' }
}

function referenceRangeText(key: string): string {
  const ref = REFERENCE_RANGES[key]
  if (!ref) return '—'
  return `${ref.low}–${ref.high} ${ref.unit}`
}

function resultIndicator(param: ResultParameter): string {
  if (param.status === 'high' || param.status === 'critical_high') return ' ↑'
  if (param.status === 'low' || param.status === 'critical_low') return ' ↓'
  return ''
}

function isAbnormal(param: ResultParameter) {
  return param.status === 'high' || param.status === 'critical_high'
}
function isLow(param: ResultParameter) {
  return param.status === 'low' || param.status === 'critical_low'
}

export interface ResultPDFProps {
  result: Result
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
}

export function ResultPDF(props: ResultPDFProps) {
  const {
    result,
    patientName,
    patientLabid,
    patientAge,
    patientGender,
    referringDoctor,
    collectionDate,
    resultDate,
    labName,
    labAddress,
    labPhone,
    mlscnNo,
    logoUrl,
    qrDataUrl,
    reportId
  } = props

  const paramEntries = Object.entries(result.parameters)
  const hasComments = Boolean(result.comments)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ────────────────────────────────────────────────────── */}
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

        {/* ── Patient section ────────────────────────────────────────────── */}
        <View style={styles.patientSection}>
          <Text style={styles.patientName}>{patientName.toUpperCase()}</Text>
          <Text style={styles.patientLabid}>{patientLabid}</Text>
          <View style={styles.patientMeta}>
            <View>
              <Text style={styles.patientMetaItem}>Age</Text>
              <Text style={styles.patientMetaValue}>{patientAge}</Text>
            </View>
            <View>
              <Text style={styles.patientMetaItem}>Gender</Text>
              <Text style={styles.patientMetaValue}>{patientGender || '—'}</Text>
            </View>
            <View>
              <Text style={styles.patientMetaItem}>Referring Doctor</Text>
              <Text style={styles.patientMetaValue}>{referringDoctor || '—'}</Text>
            </View>
            <View>
              <Text style={styles.patientMetaItem}>Collection Date</Text>
              <Text style={styles.patientMetaValue}>{collectionDate}</Text>
            </View>
          </View>
        </View>

        {/* ── Test section ───────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>{result.test_type}</Text>

        {/* Parameters table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colParam, styles.colHeaderText]}>Parameter</Text>
          <Text style={[styles.colResult, styles.colHeaderText]}>Result</Text>
          <Text style={[styles.colUnit, styles.colHeaderText]}>Unit</Text>
          <Text style={[styles.colRef, styles.colHeaderText]}>Reference Range</Text>
        </View>

        {/* Parameters rows */}
        {paramEntries.map(([key, param]) => {
          const abnormal = isAbnormal(param)
          const low = isLow(param)
          const indicator = resultIndicator(param)
          const resultStyle = abnormal
            ? [styles.colResult, styles.outOfRangeText]
            : low
            ? [styles.colResult, styles.lowText]
            : [styles.colResult]
          return (
            <View key={key} style={styles.tableRow}>
              <Text style={styles.colParam}>{key.replace(/_/g, ' ')}</Text>
              <Text style={resultStyle}>{param.value}{indicator}</Text>
              <Text style={styles.colUnit}>{param.unit}</Text>
              <Text style={styles.colRef}>{referenceRangeText(key)}</Text>
            </View>
          )
        })}

        {/* ── Comments ──────────────────────────────────────────────────── */}
        {hasComments ? (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsLabel}>Interpretation / Comments</Text>
            <Text style={styles.commentsText}>{result.comments}</Text>
          </View>
        ) : null}

        {/* Critical acknowledgment */}
        {result.critical_acknowledged ? (
          <View style={{ marginTop: 10, padding: '6 10', backgroundColor: '#FFF3CD', borderRadius: 4 }}>
            <Text style={{ fontSize: 8, color: C.amber, fontFamily: 'Helvetica-Bold' }}>
              ⚠ Critical value acknowledged by scientist before submission
            </Text>
          </View>
        ) : null}

        {/* ── Signature + QR ────────────────────────────────────────────── */}
        <View style={styles.bottomRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorised Signatory / Lab Manager</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Image src={qrDataUrl} style={styles.qrCode} />
            <Text style={styles.qrLabel}>Scan to verify online</Text>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated: {resultDate}</Text>
          <Text style={styles.footerText}>Report ID: {reportId}</Text>
          <Text style={styles.footerText}>This report is confidential and intended solely for the named patient.</Text>
        </View>
      </Page>
    </Document>
  )
}
