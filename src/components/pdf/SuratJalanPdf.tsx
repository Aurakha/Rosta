import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  nomorSurat: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: '45%',
    color: '#64748b',
  },
  val: {
    width: '55%',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 8,
    marginBottom: 14,
  },
  th: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    padding: 5,
    fontSize: 8,
    alignItems: 'center',
  },
  trEven: {
    backgroundColor: '#f8fafc',
  },
  colNo: { width: '6%', textAlign: 'center' },
  colNama: { width: '30%' },
  colJabatan: { width: '24%' },
  colHp: { width: '20%' },
  colPerush: { width: '20%', textAlign: 'center' },

  biayaBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  biayaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  signSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 10,
  },
  signBox: {
    width: '30%',
    textAlign: 'center',
  },
  signSpace: {
    height: 45,
  },
  signName: {
    fontWeight: 'bold',
    borderTopWidth: 0.5,
    borderTopColor: '#94a3b8',
    paddingTop: 3,
  },
});

export interface SuratJalanPdfProps {
  nomorSurat: string;
  perusahaanPenerbit: string;
  tanggal: string;
  vendorNama: string;
  driverNama: string;
  driverHp: string;
  noPolisi: string;
  ruteDari: string;
  ruteTujuan: string;
  hargaCarter: number | null;
  penumpang: {
    no: number;
    nama: string;
    jabatan: string;
    noHp: string;
    perusahaan: string;
  }[];
}

export function SuratJalanPdfDocument({ data }: { data: SuratJalanPdfProps }) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SURAT JALAN DRIVER OPERASIONAL</Text>
            <Text style={styles.subtitle}>
              {data.perusahaanPenerbit} · Site Tambang Musi Rawas Utara
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.nomorSurat}>No: {data.nomorSurat}</Text>
            <Text style={styles.subtitle}>Tgl: {data.tanggal}</Text>
          </View>
        </View>

        <View style={styles.cardGrid}>
          {/* Armada & Driver */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Data Driver & Kendaraan</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Vendor Travel:</Text>
              <Text style={styles.val}>{data.vendorNama}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama Driver:</Text>
              <Text style={styles.val}>{data.driverNama}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Handphone:</Text>
              <Text style={styles.val}>{data.driverHp || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Polisi Armada:</Text>
              <Text style={styles.val}>{data.noPolisi}</Text>
            </View>
          </View>

          {/* Rute Perjalanan */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rincian Rute Perjalanan</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Asal Keberangkatan:</Text>
              <Text style={styles.val}>{data.ruteDari}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tujuan Perjalanan:</Text>
              <Text style={styles.val}>{data.ruteTujuan}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jumlah Penumpang:</Text>
              <Text style={styles.val}>{data.penumpang.length} Orang</Text>
            </View>
          </View>
        </View>

        {/* TABEL PENUMPANG */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.colNo}>No</Text>
            <Text style={styles.colNama}>Nama Penumpang</Text>
            <Text style={styles.colJabatan}>Jabatan</Text>
            <Text style={styles.colHp}>No. HP / WA</Text>
            <Text style={styles.colPerush}>Entitas</Text>
          </View>

          {data.penumpang.map((p, idx) => (
            <View
              key={idx}
              style={[styles.tr, idx % 2 === 1 ? styles.trEven : {}]}
            >
              <Text style={styles.colNo}>{p.no}</Text>
              <Text style={[styles.colNama, { fontWeight: 'bold' }]}>{p.nama}</Text>
              <Text style={styles.colJabatan}>{p.jabatan || '-'}</Text>
              <Text style={styles.colHp}>{p.noHp || '-'}</Text>
              <Text style={styles.colPerush}>{p.perusahaan}</Text>
            </View>
          ))}
        </View>

        {/* BIAYA CARTER */}
        {data.hargaCarter && data.hargaCarter > 0 && (
          <View style={styles.biayaBox}>
            <View style={styles.biayaRow}>
              <Text style={{ fontWeight: 'bold' }}>Tarif Carter Travel:</Text>
              <Text style={{ fontWeight: 'bold' }}>
                Rp {Math.round(data.hargaCarter).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
        )}

        {/* TANDA TANGAN */}
        <View style={styles.signSection}>
          <View style={styles.signBox}>
            <Text>Diberikan Oleh,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>PIC Travel Lapangan</Text>
          </View>

          <View style={styles.signBox}>
            <Text>Diterima Driver,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>{data.driverNama}</Text>
          </View>

          <View style={styles.signBox}>
            <Text>Mengetahui,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>Dept. HRGA</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
