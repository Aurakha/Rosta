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
    marginBottom: 16,
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
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
  },
  metaCol: {
    width: '48%',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    width: '40%',
    color: '#64748b',
  },
  metaValue: {
    width: '60%',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    padding: 5,
    fontSize: 8,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  colNo: { width: '5%', textAlign: 'center' },
  colNama: { width: '25%' },
  colPerush: { width: '12%', textAlign: 'center' },
  colHp: { width: '18%' },
  colTujuan: { width: '20%' },
  colJam: { width: '10%', textAlign: 'center' },
  colCost: { width: '10%', textAlign: 'center' },

  footerNote: {
    marginTop: 10,
    padding: 6,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    fontSize: 7.5,
    color: '#991b1b',
  },
  signSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
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

export interface ManifestPdfProps {
  nomorSpk: string;
  perusahaanNama: string;
  perusahaanKode: string;
  tanggalTravel: string;
  arah: string;
  poolShelter: string;
  vendorNama: string;
  driverNama: string;
  driverHp: string;
  noPolisi: string;
  penumpang: {
    no: number;
    nama: string;
    perusahaan: string;
    noHp: string;
    titikTujuan: string;
    jam: string;
    costBy: string;
  }[];
}

export function ManifestPdfDocument({ data }: { data: ManifestPdfProps }) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SURAT PERINTAH KERJA & MANIFEST TRAVEL</Text>
            <Text style={styles.subtitle}>
              {data.perusahaanNama} · Dept. HRGA Site Musi Rawas Utara
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.nomorSurat}>No: {data.nomorSpk}</Text>
            <Text style={styles.subtitle}>Arah: {data.arah === 'KELUAR' ? 'BERANGKAT CUTI' : 'MASUK SITE'}</Text>
          </View>
        </View>

        {/* METADATA INFORMASI PERJALANAN */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tanggal Perjalanan:</Text>
              <Text style={styles.metaValue}>{data.tanggalTravel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Titik Kumpul / Pool:</Text>
              <Text style={styles.metaValue}>{data.poolShelter}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Jumlah Penumpang:</Text>
              <Text style={styles.metaValue}>{data.penumpang.length} Orang</Text>
            </View>
          </View>

          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vendor Travel:</Text>
              <Text style={styles.metaValue}>{data.vendorNama}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Driver / Kontak:</Text>
              <Text style={styles.metaValue}>{data.driverNama} ({data.driverHp})</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Polisi Armada:</Text>
              <Text style={styles.metaValue}>{data.noPolisi}</Text>
            </View>
          </View>
        </View>

        {/* TABEL PENUMPANG (SETIAP BARIS MENAMPILKAN DATA MILIKNYA SENDIRI) */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>No</Text>
            <Text style={styles.colNama}>Nama Penumpang</Text>
            <Text style={styles.colPerush}>Entitas</Text>
            <Text style={styles.colHp}>No. HP / WA</Text>
            <Text style={styles.colTujuan}>Antar / Jemput</Text>
            <Text style={styles.colJam}>Jam</Text>
            <Text style={styles.colCost}>Cost By</Text>
          </View>

          {data.penumpang.map((p, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
            >
              <Text style={styles.colNo}>{p.no}</Text>
              <Text style={[styles.colNama, { fontWeight: 'bold' }]}>{p.nama}</Text>
              <Text style={styles.colPerush}>{p.perusahaan}</Text>
              <Text style={styles.colHp}>{p.noHp || '-'}</Text>
              <Text style={styles.colTujuan}>{p.titikTujuan || '-'}</Text>
              <Text style={styles.colJam}>{p.jam || '-'}</Text>
              <Text style={styles.colCost}>{p.costBy}</Text>
            </View>
          ))}
        </View>

        {/* CATATAN KAKI INSTRUKSI DRIVER */}
        <View style={styles.footerNote}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>PENTING / PERHATIAN DRIVER:</Text>
          <Text>
            1. Driver dilarang keras mengantar / menjemput penumpang ke tujuan di luar yang tertera pada manifest ini tanpa izin tertulis dari Dept. HRGA.
          </Text>
          <Text>
            2. Wajib mematuhi standar keselamatan berkendara (safety belt, batas kecepatan maksimal, dan tidak menggunakan HP saat mengemudi).
          </Text>
        </View>

        {/* BLOK TANDA TANGAN RESMI */}
        <View style={styles.signSection}>
          <View style={styles.signBox}>
            <Text>Dibuat Oleh,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>PIC Travel Lapangan</Text>
          </View>

          <View style={styles.signBox}>
            <Text>Diperiksa Oleh,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>Driver Travel</Text>
          </View>

          <View style={styles.signBox}>
            <Text>Diketahui Oleh,</Text>
            <View style={styles.signSpace} />
            <Text style={styles.signName}>Spt. HRGA & Finance</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
