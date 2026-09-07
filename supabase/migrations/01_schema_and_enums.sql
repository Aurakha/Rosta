-- ==============================================================================
-- ROSTA (Roster & Travel Assistant)
-- Migration 01: Enums, Extensions, Functions Dasar, dan Tabel-Tabel Skema
-- ==============================================================================

-- Ekstensi yang dibutuhkan
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUM DEFINITIONS
-- ------------------------------------------------------------------------------
create type peran_pengguna      as enum ('ADMIN','BACKUP_ADMIN','VIEWER');
create type status_karyawan     as enum ('AKTIF','NON_AKTIF');
create type status_siklus       as enum ('BERJALAN','SELESAI');
create type status_roster       as enum ('NORMAL','SEGERA_CUTI','OVERDUE','SEDANG_CUTI','BELUM_KEMBALI','NON_AKTIF');
create type arah_perjalanan     as enum ('KELUAR','MASUK');
create type moda_transportasi   as enum ('PESAWAT','KERETA','TRAVEL_DARAT','KENDARAAN_PERUSAHAAN');
create type jenis_dokumen       as enum ('SPK','SURAT_JALAN');
create type kanal_notifikasi    as enum ('WHATSAPP','EMAIL');
create type status_notifikasi   as enum ('MENUNGGU','TERKIRIM','GAGAL');
create type jenis_cuti          as enum ('CUTI_TAHUNAN','CUTI_LAPANGAN','CUTI_KHUSUS','IZIN');

-- ------------------------------------------------------------------------------
-- 2. FUNGSI TANGGAL WIB (Asia/Jakarta)
-- ------------------------------------------------------------------------------
-- PENTING: Dilarang memakai current_date karena server Supabase berjalan pada UTC.
create or replace function hari_ini()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- ------------------------------------------------------------------------------
-- 3. TABEL MASTER
-- ------------------------------------------------------------------------------
create table perusahaan (
  id            uuid primary key default gen_random_uuid(),
  kode          text not null unique,           -- KTA, KAI, KMB
  nama_lengkap  text not null,
  prefix_surat  text not null,                  -- dipakai penomoran dokumen
  aktif         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table karyawan (
  nik                 text primary key,
  perusahaan_id       uuid not null references perusahaan(id),
  nama                text not null,
  jabatan             text,
  departemen          text,
  grade               text not null,
  tanggal_mulai_kerja date not null,            -- Wajib untuk perhitungan awal_periode_cuti
  poh                 text,                     -- Point of Hire, kota tujuan tiket
  no_hp               text,                     -- format 08xxxxxxxxxx
  atasan              text,                     -- teks bebas, untuk notifikasi
  hak_cuti_tahunan    integer not null default 12,
  status_karyawan     status_karyawan not null default 'AKTIF',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_no_hp check (no_hp is null or no_hp ~ '^0[0-9]{8,13}$')
);

create index idx_karyawan_perusahaan on karyawan(perusahaan_id);
create index idx_karyawan_status     on karyawan(status_karyawan);

create table master_roster (
  id            uuid primary key default gen_random_uuid(),
  perusahaan_id uuid not null references perusahaan(id),
  grade         text not null,
  hari_kerja    integer not null check (hari_kerja between 1 and 365),
  hari_libur    integer not null check (hari_libur between 1 and 90),
  unique (perusahaan_id, grade)
);

create table pool_shelter (
  id        uuid primary key default gen_random_uuid(),
  nama      text not null unique,
  alamat    text,
  aktif     boolean not null default true
);

create table vendor_travel (
  id        uuid primary key default gen_random_uuid(),
  nama      text not null,
  kontak    text,
  aktif     boolean not null default true
);

create table driver (
  id                uuid primary key default gen_random_uuid(),
  vendor_travel_id  uuid not null references vendor_travel(id),
  nama              text not null,
  no_hp             text,
  no_polisi_default text,
  aktif             boolean not null default true
);

create table plafon_tiket (
  id            uuid primary key default gen_random_uuid(),
  perusahaan_id uuid not null references perusahaan(id),
  poh           text not null,
  moda          moda_transportasi not null,
  plafon        numeric(12,2) not null,
  berlaku_dari  date not null default hari_ini(),
  unique (perusahaan_id, poh, moda, berlaku_dari)
);

create table pengaturan_kebijakan (
  perusahaan_id              uuid primary key references perusahaan(id) on delete cascade,
  hari_perjalanan            integer not null default 0 check (hari_perjalanan between 0 and 2),
  maks_tambahan_cuti_tahunan integer not null default 2 check (maks_tambahan_cuti_tahunan between 0 and 5),
  kompensasi_remote_default  integer not null default 1 check (kompensasi_remote_default between 0 and 2),
  updated_at                 timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 4. TABEL OPERASIONAL SIKLUS ROSTER
-- ------------------------------------------------------------------------------
create table siklus_roster (
  id                       uuid primary key default gen_random_uuid(),
  nik                      text not null references karyawan(nik) on delete cascade,
  tanggal_masuk_site       date not null,
  hari_kerja_snapshot      integer not null,
  hari_libur_snapshot      integer not null,   -- cuti lapangan dasar per grade, mis. 14
  tambahan_cuti_tahunan    integer not null default 0,
  kompensasi_remote        integer not null default 0,
  hari_perjalanan_snapshot integer not null default 0,
  tanggal_aktual_keluar    date,
  tanggal_aktual_kembali   date,
  status                   status_siklus not null default 'BERJALAN',
  catatan                  text,
  created_at               timestamptz not null default now(),

  target_keluar date generated always as
                (tanggal_masuk_site + (hari_kerja_snapshot - 1)) stored,

  -- Durasi cuti BUKAN nilai tetap (14 hari). Generated column tidak boleh panggil generated column lain.
  total_hari_libur integer generated always as
                (hari_libur_snapshot + tambahan_cuti_tahunan
                 + kompensasi_remote + hari_perjalanan_snapshot) stored,

  target_kembali date generated always as
                (tanggal_aktual_keluar
                 + hari_libur_snapshot
                 + tambahan_cuti_tahunan
                 + kompensasi_remote
                 + hari_perjalanan_snapshot) stored,

  constraint chk_tambahan_cuti check (tambahan_cuti_tahunan between 0 and 5),
  constraint chk_kompensasi    check (kompensasi_remote between 0 and 2),
  constraint chk_perjalanan    check (hari_perjalanan_snapshot between 0 and 2),
  constraint chk_urutan_tanggal check (
    tanggal_aktual_keluar is null
    or tanggal_aktual_keluar >= tanggal_masuk_site
  )
);

-- Hanya boleh 1 siklus berstatus BERJALAN per karyawan
create unique index uq_siklus_berjalan
  on siklus_roster (nik)
  where status = 'BERJALAN';

create index idx_siklus_nik on siklus_roster(nik);

-- ------------------------------------------------------------------------------
-- 5. TABEL PERJALANAN & DOKUMEN (MANIFEST & SURAT JALAN)
-- ------------------------------------------------------------------------------
create table perjalanan (
  id               uuid primary key default gen_random_uuid(),
  siklus_id        uuid not null references siklus_roster(id) on delete cascade,
  nik              text not null references karyawan(nik),
  arah             arah_perjalanan not null,
  tanggal_travel   date not null,
  pool_shelter_id  uuid references pool_shelter(id),
  jam_jemput       time,
  titik_tujuan     text,                   -- Bandara Silampari / Stasiun Lubuklinggau / dll
  moda             moda_transportasi,
  jam_berangkat    time,
  jam_tiba         time,
  maskapai_ka      text,
  kode_booking     text,
  harga_tiket      numeric(12,2),
  plafon           numeric(12,2),
  penanggung_biaya uuid references perusahaan(id),
  catatan          text,
  created_at       timestamptz not null default now(),

  over_plafon numeric(12,2) generated always as (
    case
      when harga_tiket is not null and plafon is not null and harga_tiket > plafon
      then harga_tiket - plafon
      else 0
    end
  ) stored
);

create index idx_perjalanan_tanggal on perjalanan(tanggal_travel);
create index idx_perjalanan_arah    on perjalanan(arah, tanggal_travel);
create index idx_perjalanan_nik     on perjalanan(nik);

create table surat_jalan (
  id                    uuid primary key default gen_random_uuid(),
  nomor_surat           text not null unique,
  jenis                 jenis_dokumen not null,
  perusahaan_penerbit   uuid not null references perusahaan(id),
  tanggal               date not null,
  vendor_travel_id      uuid references vendor_travel(id),
  driver_id             uuid references driver(id),
  no_polisi             text,
  rute_dari             text,
  rute_tujuan           text,
  harga_carter          numeric(12,2),
  created_at            timestamptz not null default now()
);

create table manifest_penumpang (
  surat_jalan_id uuid not null references surat_jalan(id) on delete cascade,
  perjalanan_id  uuid not null references perjalanan(id) on delete cascade,
  urutan         integer not null,
  primary key (surat_jalan_id, perjalanan_id)
);

-- ------------------------------------------------------------------------------
-- 6. TABEL CUTI TAHUNAN, NOTIFIKASI, AUDIT, & PROFIL
-- ------------------------------------------------------------------------------
create table cuti_tahunan (
  id              uuid primary key default gen_random_uuid(),
  nik             text not null references karyawan(nik) on delete cascade,
  jenis           jenis_cuti not null default 'CUTI_TAHUNAN',
  tanggal_mulai   date not null,
  tanggal_selesai date not null,
  alasan          text,
  created_at      timestamptz not null default now(),

  jumlah_hari integer generated always as
              ((tanggal_selesai - tanggal_mulai) + 1) stored,

  constraint chk_rentang check (tanggal_selesai >= tanggal_mulai)
);

create table notifikasi_log (
  id           uuid primary key default gen_random_uuid(),
  kode_jenis   text not null,            -- N1..N9 (PRD Bagian 9.1)
  penerima     text not null,
  kanal        kanal_notifikasi not null,
  isi_pesan    text not null,
  status       status_notifikasi not null default 'MENUNGGU',
  percobaan    integer not null default 0,
  waktu_kirim  timestamptz,
  pesan_error  text,
  created_at   timestamptz not null default now()
);

create table audit_log (
  id          bigserial primary key,
  pengguna_id uuid,
  aksi        text not null,             -- INSERT / UPDATE / DELETE
  nama_tabel  text not null,
  record_id   text,
  nilai_lama  jsonb,
  nilai_baru  jsonb,
  waktu       timestamptz not null default now()
);

create index idx_audit_tabel on audit_log(nama_tabel, waktu desc);

create table profil_pengguna (
  id         uuid primary key references auth.users(id) on delete cascade,
  nama       text not null,
  peran      peran_pengguna not null default 'VIEWER',
  created_at timestamptz not null default now()
);

create table counter_dokumen (
  perusahaan_id  uuid not null references perusahaan(id),
  jenis          jenis_dokumen not null,
  tahun          integer not null,
  nomor_terakhir integer not null default 0,
  primary key (perusahaan_id, jenis, tahun)
);
