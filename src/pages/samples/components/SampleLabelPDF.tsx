import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

interface SampleLabelPDFProps {
  labels: Array<{
    labName: string
    sampleId: string
    patientName: string
    lapid: string
    tests: string[]
    collectedAtLabel: string
    isStat: boolean
    qrDataUrl: string
  }>
  labelsPerPage: 1 | 2 | 4
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  label: {
    border: '1 solid #E0E0E0',
    padding: 12,
    marginBottom: 10
  },
  labelGrid2: {
    flexDirection: 'row',
    gap: 10
  },
  labelGrid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  labelHalf: {
    width: '48%'
  },
  labelQuarter: {
    width: '48%'
  },
  header: {
    marginBottom: 6
  },
  labName: {
    fontSize: 9,
    color: '#003D28'
  },
  sampleId: {
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Courier',
    color: '#0A0A0A'
  },
  meta: {
    fontSize: 8,
    color: '#4A4A4A',
    marginTop: 3
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 6
  },
  qr: {
    width: 60,
    height: 60
  },
  tests: {
    flex: 1
  },
  testItem: {
    fontSize: 7,
    marginBottom: 2
  },
  stat: {
    marginTop: 4,
    fontSize: 7,
    color: '#FFB800'
  }
})

function SingleLabel({ label }: { label: SampleLabelPDFProps['labels'][0] }) {
  const { labName, sampleId, patientName, lapid, tests, collectedAtLabel, isStat, qrDataUrl } = label
  return (
    <View style={styles.label}>
      <View style={styles.header}>
        <Text style={styles.labName}>{labName}</Text>
        <Text style={styles.sampleId}>{sampleId}</Text>
        <Text style={styles.meta}>{patientName}</Text>
        <Text style={styles.meta}>{lapid}</Text>
        <Text style={styles.meta}>{collectedAtLabel}</Text>
        {isStat ? <Text style={styles.stat}>STAT</Text> : null}
      </View>

      <View style={styles.row}>
        <Image src={qrDataUrl} style={styles.qr} />
        <View style={styles.tests}>
          <Text style={styles.meta}>Tests</Text>
          {tests.map((test: string) => (
            <Text key={test} style={styles.testItem}>
              - {test}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

export function SampleLabelPDF({ labels, labelsPerPage }: SampleLabelPDFProps) {
  // A5 size: 595 x 842 points
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {labelsPerPage === 1 ? (
          labels.map((label, i) => <SingleLabel key={i} label={label} />)
        ) : labelsPerPage === 2 ? (
          <View style={styles.labelGrid2}>
            {labels.map((label, i) => (
              <View key={i} style={styles.labelHalf}>
                <SingleLabel label={label} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.labelGrid4}>
            {labels.map((label, i) => (
              <View key={i} style={styles.labelQuarter}>
                <SingleLabel label={label} />
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}

