import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

interface LabidCardPDFProps {
  patientName: string
  labid: string
  qrDataUrl: string
  labName?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    backgroundColor: '#FFFFFF'
  },
  card: {
    border: '1px solid #E0E0E0',
    borderRadius: 10,
    padding: 16,
    width: 320
  },
  labName: {
    fontSize: 12,
    color: '#003D28',
    marginBottom: 8
  },
  name: {
    fontSize: 14,
    color: '#0A0A0A',
    marginBottom: 10,
    textTransform: 'uppercase'
  },
  labid: {
    fontSize: 18,
    fontFamily: 'Courier',
    color: '#003D28',
    marginBottom: 10
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  qr: {
    width: 96,
    height: 96
  },
  hint: {
    fontSize: 10,
    color: '#4A4A4A',
    flex: 1
  }
})

export function LabidCardPDF({ patientName, labid, qrDataUrl, labName = 'Labid Health Lab' }: LabidCardPDFProps) {
  return (
    <Document>
      <Page size={{ width: 360, height: 220 }} style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.labName}>{labName}</Text>
          <Text style={styles.name}>{patientName}</Text>
          <Text style={styles.labid}>{labid}</Text>
          <View style={styles.row}>
            <Image src={qrDataUrl} style={styles.qr} />
            <Text style={styles.hint}>Bring this card to any Labid Health lab for faster registration.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

