import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

interface DailySummaryPDFProps {
  labName: string
  labAddress: string
  date: string
  samplesProcessed: Array<{
    sampleId: string
    patientName: string
    labid: string
    tests: string[]
    status: string
  }>
  resultsIssued: Array<{
    sampleId: string
    patientName: string
    labid: string
    testType: string
    approvedAt: string
  }>
  totalRevenue: number // in kobo
  showRevenue: boolean // owner only
}

const C = {
  bg: '#FFFFFF',
  textPrimary: '#0A0A0A',
  textSecondary: '#4A4A4A',
  forest: '#003D28',
  mint: '#00875A',
  border: '#E0E0E0'
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: C.bg,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: C.forest,
    paddingBottom: 12
  },
  labName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.forest,
    marginBottom: 4
  },
  labMeta: {
    fontSize: 10,
    color: C.textSecondary
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.textPrimary,
    marginTop: 16,
    marginBottom: 4
  },
  date: {
    fontSize: 12,
    color: C.textSecondary
  },
  section: {
    marginTop: 20
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.forest,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F0',
    padding: '8 12',
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 12',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE'
  },
  colSampleId: {
    flex: 1.5,
    fontSize: 9,
    fontFamily: 'Courier',
    color: C.textPrimary
  },
  colPatient: {
    flex: 2,
    fontSize: 9,
    color: C.textPrimary
  },
  colLabid: {
    flex: 1.5,
    fontSize: 9,
    fontFamily: 'Courier',
    color: C.forest
  },
  colTests: {
    flex: 2,
    fontSize: 9,
    color: C.textPrimary
  },
  colStatus: {
    flex: 1,
    fontSize: 9,
    color: C.textPrimary,
    textAlign: 'right'
  },
  colApprovedAt: {
    flex: 1.5,
    fontSize: 9,
    color: C.textSecondary,
    textAlign: 'right'
  },
  colHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.textSecondary,
    textTransform: 'uppercase'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 16
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.textPrimary
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.mint
  },
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    fontSize: 9,
    color: C.textSecondary
  },
  empty: {
    fontSize: 10,
    color: C.textSecondary,
    fontStyle: 'italic',
    padding: 12
  }
})

function formatKobo(kobo: number): string {
  const naira = kobo / 100
  return `\u20A6${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function DailySummaryPDF({
  labName,
  labAddress,
  date,
  samplesProcessed,
  resultsIssued,
  totalRevenue,
  showRevenue
}: DailySummaryPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.labName}>{labName}</Text>
          <Text style={styles.labMeta}>{labAddress}</Text>
          <Text style={styles.title}>Daily Summary Report</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        {/* Samples Processed */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Samples Processed Today</Text>
          {samplesProcessed.length === 0 ? (
            <Text style={styles.empty}>No samples processed today</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.colSampleId, styles.colHeader]}>Sample ID</Text>
                <Text style={[styles.colPatient, styles.colHeader]}>Patient</Text>
                <Text style={[styles.colLabid, styles.colHeader]}>LABID</Text>
                <Text style={[styles.colTests, styles.colHeader]}>Tests</Text>
                <Text style={[styles.colStatus, styles.colHeader]}>Status</Text>
              </View>
              {samplesProcessed.map((sample) => (
                <View key={sample.sampleId} style={styles.tableRow}>
                  <Text style={styles.colSampleId}>{sample.sampleId}</Text>
                  <Text style={styles.colPatient}>{sample.patientName}</Text>
                  <Text style={styles.colLabid}>{sample.labid}</Text>
                  <Text style={styles.colTests}>{sample.tests.join(', ')}</Text>
                  <Text style={styles.colStatus}>{sample.status.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Results Issued */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Results Issued Today</Text>
          {resultsIssued.length === 0 ? (
            <Text style={styles.empty}>No results issued today</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.colSampleId, styles.colHeader]}>Sample ID</Text>
                <Text style={[styles.colPatient, styles.colHeader]}>Patient</Text>
                <Text style={[styles.colLabid, styles.colHeader]}>LABID</Text>
                <Text style={[styles.colTests, styles.colHeader]}>Test Type</Text>
                <Text style={[styles.colApprovedAt, styles.colHeader]}>Approved At</Text>
              </View>
              {resultsIssued.map((result) => (
                <View key={result.sampleId} style={styles.tableRow}>
                  <Text style={styles.colSampleId}>{result.sampleId}</Text>
                  <Text style={styles.colPatient}>{result.patientName}</Text>
                  <Text style={styles.colLabid}>{result.labid}</Text>
                  <Text style={styles.colTests}>{result.testType}</Text>
                  <Text style={styles.colApprovedAt}>{result.approvedAt}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Revenue (owner only) */}
        {showRevenue ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Revenue Summary</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Revenue Today</Text>
              <Text style={styles.totalValue}>{formatKobo(totalRevenue)}</Text>
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Labid Health</Text>
          <Text style={styles.footerText}>End-of-Day Report</Text>
        </View>
      </Page>
    </Document>
  )
}
