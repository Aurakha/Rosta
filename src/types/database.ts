// ==============================================================================
// ROSTA Database Types (PostgreSQL 15+ / Supabase)
// ==============================================================================

export type PeranPengguna = 'ADMIN' | 'BACKUP_ADMIN' | 'VIEWER';
export type StatusKaryawan = 'AKTIF' | 'NON_AKTIF';
export type StatusSiklus = 'BERJALAN' | 'SELESAI';
export type StatusRoster = 'NORMAL' | 'SEGERA_CUTI' | 'OVERDUE' | 'SEDANG_CUTI' | 'BELUM_KEMBALI' | 'NON_AKTIF';
export type ArahPerjalanan = 'KELUAR' | 'MASUK';
export type ModaTransportasi = 'PESAWAT' | 'KERETA' | 'TRAVEL_DARAT' | 'KENDARAAN_PERUSAHAAN';
export type JenisDokumen = 'SPK' | 'SURAT_JALAN';
export type KanalNotifikasi = 'WHATSAPP' | 'EMAIL';
export type StatusNotifikasi = 'MENUNGGU' | 'TERKIRIM' | 'GAGAL';
export type JenisCuti = 'CUTI_TAHUNAN' | 'CUTI_LAPANGAN' | 'CUTI_KHUSUS' | 'IZIN';

export interface Perusahaan {
  id: string;
  kode: string; // KTA, KAI, KMB
  nama_lengkap: string;
  prefix_surat: string;
  aktif: boolean;
  created_at: string;
}

export interface Karyawan {
  nik: string;
  perusahaan_id: string;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  grade: string;
  tanggal_mulai_kerja: string;
  poh: string | null;
  no_hp: string | null;
  atasan: string | null;
  hak_cuti_tahunan: number;
  status_karyawan: StatusKaryawan;
  created_at: string;
  updated_at: string;
}

export interface MasterRoster {
  id: string;
  perusahaan_id: string;
  grade: string;
  hari_kerja: number;
  hari_libur: number;
}

export interface PengaturanKebijakan {
  perusahaan_id: string;
  hari_perjalanan: number;
  maks_tambahan_cuti_tahunan: number;
  kompensasi_remote_default: number;
  updated_at: string;
}

export interface PoolShelter {
  id: string;
  nama: string;
  alamat: string | null;
  aktif: boolean;
}

export interface VendorTravel {
  id: string;
  nama: string;
  kontak: string | null;
  aktif: boolean;
}

export interface Driver {
  id: string;
  vendor_travel_id: string;
  nama: string;
  no_hp: string | null;
  no_polisi_default: string | null;
  aktif: boolean;
}

export interface PlafonTiket {
  id: string;
  perusahaan_id: string;
  poh: string;
  moda: ModaTransportasi;
  plafon: number;
  berlaku_dari: string;
}

export interface SiklusRoster {
  id: string;
  nik: string;
  tanggal_masuk_site: string;
  hari_kerja_snapshot: number;
  hari_libur_snapshot: number;
  tambahan_cuti_tahunan: number;
  kompensasi_remote: number;
  hari_perjalanan_snapshot: number;
  tanggal_aktual_keluar: string | null;
  tanggal_aktual_kembali: string | null;
  status: StatusSiklus;
  catatan: string | null;
  created_at: string;
  target_keluar: string;
  total_hari_libur: number;
  target_kembali: string | null;
}

export interface Perjalanan {
  id: string;
  siklus_id: string;
  nik: string;
  arah: ArahPerjalanan;
  tanggal_travel: string;
  pool_shelter_id: string | null;
  jam_jemput: string | null;
  titik_tujuan: string | null;
  moda: ModaTransportasi | null;
  jam_berangkat: string | null;
  jam_tiba: string | null;
  maskapai_ka: string | null;
  kode_booking: string | null;
  harga_tiket: number | null;
  plafon: number | null;
  over_plafon: number;
  penanggung_biaya: string | null;
  catatan: string | null;
  created_at: string;
}

export interface SuratJalan {
  id: string;
  nomor_surat: string;
  jenis: JenisDokumen;
  perusahaan_penerbit: string;
  tanggal: string;
  vendor_travel_id: string | null;
  driver_id: string | null;
  no_polisi: string | null;
  rute_dari: string | null;
  rute_tujuan: string | null;
  harga_carter: number | null;
  created_at: string;
}

export interface ManifestPenumpang {
  surat_jalan_id: string;
  perjalanan_id: string;
  urutan: number;
}

export interface CutiTahunan {
  id: string;
  nik: string;
  jenis: JenisCuti;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string | null;
  jumlah_hari: number;
  created_at: string;
}

export interface NotifikasiLog {
  id: string;
  kode_jenis: string;
  penerima: string;
  kanal: KanalNotifikasi;
  isi_pesan: string;
  status: StatusNotifikasi;
  percobaan: number;
  waktu_kirim: string | null;
  pesan_error: string | null;
  created_at: string;
}

export interface ProfilPengguna {
  id: string;
  nama: string;
  peran: PeranPengguna;
  created_at: string;
}

// ------------------------------------------------------------------------------
// Views Types
// ------------------------------------------------------------------------------
export interface VStatusRoster {
  nik: string;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  grade: string;
  poh: string | null;
  no_hp: string | null;
  atasan: string | null;
  perusahaan_id: string;
  perusahaan_kode: string;
  siklus_id: string | null;
  tanggal_masuk_site: string | null;
  hari_kerja_snapshot: number | null;
  hari_libur_snapshot: number | null;
  target_keluar: string | null;
  tanggal_aktual_keluar: string | null;
  tambahan_cuti_tahunan: number | null;
  kompensasi_remote: number | null;
  total_hari_libur: number | null;
  target_kembali: string | null;
  hari_kerja_berjalan: number;
  sisa_hari_kerja: number;
  hari_terlambat_keluar: number;
  hari_terlambat_kembali: number;
  status_roster: StatusRoster;
}

export interface VHariIni {
  perjalanan_id: string;
  arah: ArahPerjalanan;
  tanggal_travel: string;
  jam_jemput: string | null;
  jam_berangkat: string | null;
  jam_tiba: string | null;
  titik_tujuan: string | null;
  moda: ModaTransportasi | null;
  kode_booking: string | null;
  nik: string;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  no_hp: string | null;
  poh: string | null;
  perusahaan_kode: string;
  pool_shelter: string | null;
  driver_nama: string | null;
  driver_hp: string | null;
  no_polisi: string | null;
  nomor_surat: string | null;
}

export interface VSaldoCuti {
  nik: string;
  nama: string;
  perusahaan_id: string;
  tanggal_mulai_kerja: string;
  periode_mulai: string;
  periode_selesai: string;
  hak_cuti_tahunan: number;
  cuti_terpakai: number;
  sisa_cuti: number;
}
