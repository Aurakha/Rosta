# Spesifikasi Teknis Implementasi — ROSTA

**Dokumen pendamping:** `PRD_Sistem_Monitoring_Cuti_dan_Travel.md`
**Peruntukan:** Handoff ke AI coding agent
**Versi:** 1.0
**Tanggal:** 3 September 2026

> **Cara pakai dokumen ini.** PRD menjelaskan *apa* dan *kenapa*. Dokumen ini menjelaskan *bagaimana*, dalam bentuk yang bisa langsung dieksekusi. Berikan **kedua** file ke AI pembangun. Bagian 8 berisi prompt handoff siap salin.

---

## 1. Stack yang Dikunci

Keputusan berikut sudah final. AI pembangun tidak perlu mengevaluasi ulang.

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Server Components mengurangi payload; PWA didukung penuh |
| Basis data | Supabase (PostgreSQL 15+) | Tier gratis cukup; RLS bawaan; ekspor mudah |
| Autentikasi | Supabase Auth (email + password) | Pengguna sedikit, tidak perlu SSO |
| UI | Tailwind CSS + shadcn/ui | Cepat, konsisten, mudah dimodifikasi AI |
| Ikon | lucide-react | — |
| Form | react-hook-form + zod | Validasi tipe aman ujung ke ujung |
| Tabel | TanStack Table | Sorting & filtering sisi klien untuk 500 baris |
| PDF | `@react-pdf/renderer` | **Jangan pakai Puppeteer** — terlalu berat untuk serverless Vercel |
| Tanggal | `date-fns` + `date-fns/locale/id` | Format Indonesia |
| PWA | `next-pwa` atau service worker manual | Wajib: manifest + offline cache |
| Deploy | Vercel | Gratis untuk penggunaan internal |
| Penjadwal | Supabase `pg_cron` + Edge Function | Untuk notifikasi terjadwal |

**Zona waktu:** seluruh sistem memakai WIB (`Asia/Jakarta`). Lihat Bagian 3.1 — ini sumber bug paling sering.

---

## 2. Skema Basis Data

Jalankan berurutan di Supabase SQL Editor.

### 2.1 Enum

```sql
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
```

### 2.2 Fungsi tanggal WIB

**Ini harus dibuat lebih dulu.** Seluruh perhitungan status bergantung padanya.

```sql
create or replace function hari_ini()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;
```

**Jangan pernah memakai `current_date` di mana pun.** Server Supabase berjalan pada UTC. Antara pukul 00.00 dan 07.00 WIB, `current_date` masih menunjukkan tanggal kemarin. Untuk aplikasi yang seluruh gunanya menjawab "siapa berangkat hari ini", kesalahan sehari adalah kegagalan total.

### 2.3 Tabel master

```sql
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
  tanggal_mulai_kerja date,
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

-- Angka kebijakan yang bisa berubah. Diatur lewat menu Pengaturan,
-- bukan dikeraskan di kode. Satu baris per perusahaan.
create table pengaturan_kebijakan (
  perusahaan_id              uuid primary key references perusahaan(id) on delete cascade,
  hari_perjalanan            integer not null default 0 check (hari_perjalanan between 0 and 2),
  maks_tambahan_cuti_tahunan integer not null default 2 check (maks_tambahan_cuti_tahunan between 0 and 5),
  kompensasi_remote_default  integer not null default 1 check (kompensasi_remote_default between 0 and 2),
  updated_at                 timestamptz not null default now()
);
```

### 2.4 Siklus roster — inti sistem

```sql
create table siklus_roster (
  id                     uuid primary key default gen_random_uuid(),
  nik                    text not null references karyawan(nik) on delete cascade,
  tanggal_masuk_site     date not null,
  hari_kerja_snapshot    integer not null,
  hari_libur_snapshot    integer not null,   -- cuti lapangan dasar per grade, mis. 14
  tambahan_cuti_tahunan  integer not null default 0,
  kompensasi_remote      integer not null default 0,
  hari_perjalanan_snapshot integer not null default 0,
  tanggal_aktual_keluar  date,
  tanggal_aktual_kembali date,
  status                 status_siklus not null default 'BERJALAN',
  catatan                text,
  created_at             timestamptz not null default now(),

  target_keluar  date generated always as
                 (tanggal_masuk_site + (hari_kerja_snapshot - 1)) stored,

  -- Durasi cuti BUKAN nilai tetap. Lihat Bagian 3.5.
  total_hari_libur integer generated always as
                 (hari_libur_snapshot + tambahan_cuti_tahunan
                  + kompensasi_remote + hari_perjalanan_snapshot) stored,

  target_kembali date generated always as
                 (tanggal_aktual_keluar
                  + hari_libur_snapshot
                  + tambahan_cuti_tahunan
                  + kompensasi_remote
                  + hari_perjalanan_snapshot) stored,

  -- Batas longgar di sini hanya penjaga nilai ngawur.
  -- Batas kebijakan yang sebenarnya ditegakkan di RPC dari tabel pengaturan.
  constraint chk_tambahan_cuti check (tambahan_cuti_tahunan between 0 and 5),
  constraint chk_kompensasi    check (kompensasi_remote between 0 and 2),
  constraint chk_perjalanan    check (hari_perjalanan_snapshot between 0 and 2),
  constraint chk_urutan_tanggal check (
    tanggal_aktual_keluar is null
    or tanggal_aktual_keluar >= tanggal_masuk_site
  )
);

-- Satu karyawan hanya boleh punya SATU siklus berjalan.
-- Ini mencegah kelas bug yang membuat file Excel lama menampilkan
-- status ganda dan perhitungan hari yang tidak masuk akal.
create unique index uq_siklus_berjalan
  on siklus_roster (nik)
  where status = 'BERJALAN';

create index idx_siklus_nik on siklus_roster(nik);
```

**Kenapa `hari_kerja_snapshot` disalin, bukan di-join ke `master_roster`:** bila suatu saat aturan roster Grade 4 berubah dari 56 ke 60 hari, siklus yang sudah berjalan tidak boleh ikut berubah. Riwayat harus tetap mencerminkan aturan yang berlaku saat itu.

**Batasan PostgreSQL yang perlu diketahui:** generated column tidak boleh mereferensikan generated column lain. Karena itu `target_kembali` menuliskan ulang penjumlahan ketiga komponen, bukan memakai `total_hari_libur`. Terlihat duplikatif, tetapi memang begitu satu-satunya cara. Bila salah satu komponen ditambah di kemudian hari, **kedua** ekspresi harus diubah bersamaan.

### 2.5 Perjalanan & dokumen

```sql
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
```

### 2.6 Cuti tahunan, notifikasi, audit

```sql
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
  kode_jenis   text not null,            -- N1..N9, lihat PRD Bagian 9.1
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
```

### 2.7 Trigger audit generik

```sql
create or replace function fn_audit()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into audit_log (pengguna_id, aksi, nama_tabel, record_id, nilai_lama, nilai_baru)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Pasang pada tabel yang perubahannya perlu dilacak
create trigger trg_audit_siklus
  after insert or update or delete on siklus_roster
  for each row execute function fn_audit();

create trigger trg_audit_perjalanan
  after insert or update or delete on perjalanan
  for each row execute function fn_audit();

create trigger trg_audit_surat_jalan
  after insert or update or delete on surat_jalan
  for each row execute function fn_audit();
```

Untuk `karyawan`, primary key-nya `nik` bukan `id`, jadi buat varian trigger tersendiri yang memakai `new.nik`.

---

## 3. Logika Turunan

### 3.1 View status roster — jangan tulis ulang logika ini di TypeScript

Status **tidak pernah menjadi kolom**. Status selalu dibaca dari view berikut. Satu sumber kebenaran, tidak bisa tidak sinkron.

```sql
create or replace view v_status_roster as
select
  k.nik,
  k.nama,
  k.jabatan,
  k.departemen,
  k.grade,
  k.poh,
  k.no_hp,
  k.atasan,
  k.perusahaan_id,
  p.kode as perusahaan_kode,
  s.id   as siklus_id,
  s.tanggal_masuk_site,
  s.hari_kerja_snapshot,
  s.hari_libur_snapshot,
  s.target_keluar,
  s.tanggal_aktual_keluar,
  s.tambahan_cuti_tahunan,
  s.kompensasi_remote,
  s.total_hari_libur,
  s.target_kembali,

  case
    when s.tanggal_aktual_keluar is not null
      then (s.tanggal_aktual_keluar - s.tanggal_masuk_site) + 1
    else greatest(0, (hari_ini() - s.tanggal_masuk_site) + 1)
  end as hari_kerja_berjalan,

  case
    when s.tanggal_aktual_keluar is not null then 0
    else s.hari_kerja_snapshot - ((hari_ini() - s.tanggal_masuk_site) + 1)
  end as sisa_hari_kerja,

  case
    when s.tanggal_aktual_keluar is null
      then greatest(0, ((hari_ini() - s.tanggal_masuk_site) + 1) - s.hari_kerja_snapshot)
    else 0
  end as hari_terlambat_keluar,

  case
    when s.tanggal_aktual_keluar is not null and s.tanggal_aktual_kembali is null
      then greatest(0, hari_ini() - s.target_kembali)
    else 0
  end as hari_terlambat_kembali,

  case
    when k.status_karyawan = 'NON_AKTIF' then 'NON_AKTIF'
    when s.id is null then 'NON_AKTIF'
    when s.tanggal_aktual_keluar is not null and hari_ini() <= s.target_kembali
      then 'SEDANG_CUTI'
    when s.tanggal_aktual_keluar is not null and hari_ini() >  s.target_kembali
      then 'BELUM_KEMBALI'
    when ((hari_ini() - s.tanggal_masuk_site) + 1) > s.hari_kerja_snapshot
      then 'OVERDUE'
    when (s.target_keluar - hari_ini()) <= 7
      then 'SEGERA_CUTI'
    else 'NORMAL'
  end::status_roster as status_roster

from karyawan k
join perusahaan p on p.id = k.perusahaan_id
left join siklus_roster s on s.nik = k.nik and s.status = 'BERJALAN';
```

**Urutan `case` tidak boleh diubah.** Cabang paling spesifik harus di atas. Membalik urutannya menghasilkan status yang salah tanpa error apa pun — persis kegagalan senyap yang terjadi di file Excel lama.

### 3.2 View papan Hari Ini

```sql
create or replace view v_hari_ini as
select
  pj.id            as perjalanan_id,
  pj.arah,
  pj.tanggal_travel,
  pj.jam_jemput,
  pj.jam_berangkat,
  pj.jam_tiba,
  pj.titik_tujuan,
  pj.moda,
  pj.kode_booking,
  k.nik,
  k.nama,
  k.jabatan,
  k.departemen,
  k.no_hp,
  k.poh,
  p.kode           as perusahaan_kode,
  ps.nama          as pool_shelter,
  d.nama           as driver_nama,
  d.no_hp          as driver_hp,
  sj.no_polisi,
  sj.nomor_surat
from perjalanan pj
join karyawan k     on k.nik = pj.nik
join perusahaan p   on p.id  = k.perusahaan_id
left join pool_shelter ps on ps.id = pj.pool_shelter_id
left join manifest_penumpang mp on mp.perjalanan_id = pj.id
left join surat_jalan sj on sj.id = mp.surat_jalan_id
left join driver d       on d.id  = sj.driver_id;
```

Filter tanggal dilakukan di aplikasi (`where tanggal_travel = <tanggal terpilih>`), supaya tombol geser kemarin/besok berfungsi.

### 3.3 Penomoran dokumen otomatis

```sql
create table counter_dokumen (
  perusahaan_id uuid not null references perusahaan(id),
  jenis         jenis_dokumen not null,
  tahun         integer not null,
  nomor_terakhir integer not null default 0,
  primary key (perusahaan_id, jenis, tahun)
);

create or replace function generate_nomor_dokumen(
  p_perusahaan_id uuid,
  p_jenis jenis_dokumen
) returns text
language plpgsql
as $$
declare
  v_tahun    integer := extract(year from hari_ini());
  v_bulan    integer := extract(month from hari_ini());
  v_nomor    integer;
  v_prefix   text;
  v_romawi   text;
  v_romawi_arr text[] := array['I','II','III','IV','V','VI',
                               'VII','VIII','IX','X','XI','XII'];
begin
  select prefix_surat into v_prefix
  from perusahaan where id = p_perusahaan_id;

  insert into counter_dokumen (perusahaan_id, jenis, tahun, nomor_terakhir)
  values (p_perusahaan_id, p_jenis, v_tahun, 1)
  on conflict (perusahaan_id, jenis, tahun)
  do update set nomor_terakhir = counter_dokumen.nomor_terakhir + 1
  returning nomor_terakhir into v_nomor;

  v_romawi := v_romawi_arr[v_bulan];

  if p_jenis = 'SPK' then
    return lpad(v_nomor::text, 3, '0') || '/' || v_prefix
           || '/SPK/' || v_romawi || '/' || v_tahun;
  else
    return lpad(v_nomor::text, 3, '0') || '/' || v_prefix
           || '/HRGA-TRA/PL/' || v_romawi || '/' || v_tahun;
  end if;
end;
$$;
```

Menghasilkan `060/KTA/SPK/IX/2026` dan `002/KAI/HRGA-TRA/PL/IX/2026`. `on conflict do update ... returning` bersifat atomik, jadi nomor ganda tidak mungkin terjadi meski dua permintaan datang bersamaan.

### 3.4 Otomatisasi siklus

Saat kedatangan dicatat, siklus lama ditutup dan siklus baru dibuka dalam satu transaksi.

```sql
create or replace function catat_kedatangan(
  p_siklus_id uuid,
  p_tanggal_tiba date
) returns uuid
language plpgsql
as $$
declare
  v_nik           text;
  v_perusahaan_id uuid;
  v_grade         text;
  v_hari_kerja    integer;
  v_hari_libur    integer;
  v_siklus_baru   uuid;
begin
  update siklus_roster
     set tanggal_aktual_kembali = p_tanggal_tiba,
         status = 'SELESAI'
   where id = p_siklus_id
  returning nik into v_nik;

  if v_nik is null then
    raise exception 'Siklus tidak ditemukan: %', p_siklus_id;
  end if;

  select k.perusahaan_id, k.grade into v_perusahaan_id, v_grade
  from karyawan k where k.nik = v_nik;

  select mr.hari_kerja, mr.hari_libur into v_hari_kerja, v_hari_libur
  from master_roster mr
  where mr.perusahaan_id = v_perusahaan_id and mr.grade = v_grade;

  if v_hari_kerja is null then
    raise exception 'Master roster belum diatur untuk grade % pada perusahaan ini', v_grade;
  end if;

  insert into siklus_roster (
    nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, status
  ) values (
    v_nik, p_tanggal_tiba, v_hari_kerja, v_hari_libur, 'BERJALAN'
  ) returning id into v_siklus_baru;

  return v_siklus_baru;
end;
$$;
```

Panggil dari aplikasi lewat `supabase.rpc('catat_kedatangan', {...})`. Jangan implementasikan alur ini sebagai dua panggilan terpisah dari klien — bila panggilan kedua gagal, karyawan tersebut hilang dari sistem tanpa siklus aktif.

### 3.5 Durasi cuti variabel — jangan dikunci 14 hari

Ini aturan yang paling mudah disalahimplementasikan, dan akibatnya paling fatal karena langsung merusak fungsi utama aplikasi.

**Durasi cuti bukan angka tetap.** Total hari cuti tersusun dari empat komponen, tiga di antaranya diatur lewat menu Pengaturan:

| Komponen | Sumber | Default | Dapat diubah admin |
|---|---|---|---|
| Cuti lapangan dasar | `master_roster.hari_libur` per grade | 14 | Ya, lewat master roster |
| Tambahan cuti tahunan | Diisi saat keberangkatan | 0 | Batas maksimalnya diatur: `maks_tambahan_cuti_tahunan` |
| Kompensasi remote area | `pengaturan_kebijakan` | 1 | Ya, 0–2 |
| Hari perjalanan | `pengaturan_kebijakan` | 0 | Ya, 0–2 |

```
Target Kembali = Tanggal Aktual Keluar
               + hari_libur_snapshot        (dari grade)
               + tambahan_cuti_tahunan      (0 s/d batas pengaturan)
               + kompensasi_remote          (dari pengaturan, bisa ditimpa)
               + hari_perjalanan_snapshot   (dari pengaturan)
```

**Semua angka di atas diambil dari tabel, bukan dari konstanta di kode.** Kebijakan perusahaan berubah tanpa perlu deploy ulang. Nilai disalin sebagai snapshot ke `siklus_roster` saat keberangkatan dicatat, sehingga perubahan kebijakan tidak menggeser tanggal kembali siklus yang sudah berjalan.

**Konsekuensi bila dikunci 14 hari:** karyawan yang mengambil 17 hari akan muncul sebagai `BELUM_KEMBALI` selama 3 hari padahal jadwalnya normal, dan sistem akan memberi tahu PIC untuk menjemput pada tanggal yang salah. Notifikasi N6 juga terkirim 3 hari terlalu awal. Aplikasi tetap berjalan tanpa error — hanya jawabannya yang salah.

**Kapan nilainya ditentukan:** saat mencatat keberangkatan, bukan saat siklus dibuat. Karyawan baru memutuskan mau menambah cuti tahunan atau tidak menjelang berangkat.

#### RPC pencatatan keberangkatan

```sql
create or replace function catat_keberangkatan(
  p_siklus_id             uuid,
  p_tanggal_keluar        date,
  p_tambahan_cuti_tahunan integer default 0,
  p_kompensasi_remote     integer default null   -- null = pakai default pengaturan
) returns void
language plpgsql
as $$
declare
  v_nik             text;
  v_perusahaan_id   uuid;
  v_maks            integer;
  v_hari_perjalanan integer;
  v_kompensasi      integer;
  v_sisa            integer;
begin
  select sr.nik, k.perusahaan_id
    into v_nik, v_perusahaan_id
  from siklus_roster sr
  join karyawan k on k.nik = sr.nik
  where sr.id = p_siklus_id;

  if v_nik is null then
    raise exception 'Siklus tidak ditemukan: %', p_siklus_id;
  end if;

  select maks_tambahan_cuti_tahunan, hari_perjalanan, kompensasi_remote_default
    into v_maks, v_hari_perjalanan, v_kompensasi
  from pengaturan_kebijakan
  where perusahaan_id = v_perusahaan_id;

  if v_maks is null then
    raise exception 'Pengaturan kebijakan belum diisi untuk perusahaan ini';
  end if;

  if p_tambahan_cuti_tahunan < 0 or p_tambahan_cuti_tahunan > v_maks then
    raise exception 'Tambahan cuti tahunan maksimal % hari', v_maks;
  end if;

  if p_tambahan_cuti_tahunan > 0 then
    select sisa_cuti into v_sisa from v_saldo_cuti where nik = v_nik;
    if coalesce(v_sisa, 0) < p_tambahan_cuti_tahunan then
      raise exception 'Sisa cuti tahunan tidak mencukupi. Sisa: % hari', coalesce(v_sisa, 0);
    end if;
  end if;

  update siklus_roster
     set tanggal_aktual_keluar    = p_tanggal_keluar,
         tambahan_cuti_tahunan    = p_tambahan_cuti_tahunan,
         kompensasi_remote        = coalesce(p_kompensasi_remote, v_kompensasi),
         hari_perjalanan_snapshot = v_hari_perjalanan
   where id = p_siklus_id;
end;
$$;
```

#### View saldo cuti tahunan — reset per tanggal masuk kerja

Tambahan cuti tahunan memotong saldo, jadi saldo harus terhitung sejak MVP. Tanpa ini, batas maksimal tidak bisa divalidasi terhadap apa pun.

**Saldo cuti tahunan tidak direset per 1 Januari.** Saldo direset pada tanggal ulang tahun masuk kerja (*date of hire*) masing-masing karyawan. Seseorang yang masuk 8 Desember 2025 menjalani periode 8 Des 2025 – 7 Des 2026, bukan Jan–Des.

Memakai `extract(year from ...)` untuk ini adalah kesalahan yang menghasilkan saldo salah untuk hampir semua karyawan.

```sql
-- Awal periode cuti berjalan = ulang tahun masuk kerja terakhir
create or replace function awal_periode_cuti(p_tanggal_mulai_kerja date)
returns date
language sql
stable
as $$
  select case
    when p_tanggal_mulai_kerja is null then null
    else (p_tanggal_mulai_kerja
          + make_interval(years => extract(year from age(hari_ini(), p_tanggal_mulai_kerja))::int)
         )::date
  end;
$$;

create or replace view v_saldo_cuti as
with periode as (
  select
    k.nik,
    k.nama,
    k.perusahaan_id,
    k.hak_cuti_tahunan,
    k.tanggal_mulai_kerja,
    awal_periode_cuti(k.tanggal_mulai_kerja) as periode_mulai
  from karyawan k
  where k.status_karyawan = 'AKTIF'
)
select
  p.nik,
  p.nama,
  p.perusahaan_id,
  p.tanggal_mulai_kerja,
  p.periode_mulai,
  (p.periode_mulai + interval '1 year' - interval '1 day')::date as periode_selesai,
  p.hak_cuti_tahunan,
  coalesce(s.total, 0) + coalesce(c.total, 0) as cuti_terpakai,
  p.hak_cuti_tahunan - coalesce(s.total, 0) - coalesce(c.total, 0) as sisa_cuti
from periode p
left join lateral (
  select sum(sr.tambahan_cuti_tahunan) as total
  from siklus_roster sr
  where sr.nik = p.nik
    and sr.tanggal_aktual_keluar >= p.periode_mulai
) s on true
left join lateral (
  select sum(ct.jumlah_hari) as total
  from cuti_tahunan ct
  where ct.nik = p.nik
    and ct.jenis = 'CUTI_TAHUNAN'
    and ct.tanggal_mulai >= p.periode_mulai
) c on true;
```

`tanggal_mulai_kerja` karena itu menjadi **kolom wajib** pada form tambah karyawan. Tanpa nilai itu, periode cuti tidak bisa ditentukan dan saldo terbaca kosong.

**Karyawan di bawah satu tahun masa kerja:** tidak perlu logika khusus. HRGA cukup mengisi `hak_cuti_tahunan = 0` pada karyawan tersebut sampai haknya terbit.

#### Tampilan di form keberangkatan

```
Tanggal keluar site      [ 04/09/2026 ]

Durasi cuti
  Cuti lapangan (Grade 4)         14 hari   (dari grade)
  Tambah cuti tahunan          [ 0 ▾ ]      maks 2 · sisa 8 hari
                                            periode 8 Des 2025 – 7 Des 2026
  Kompensasi remote area       [ 1 ▾ ]      default dari pengaturan
  Hari perjalanan                  0 hari   (dari pengaturan)

  ─────────────────────────────────────────
  Total cuti                      15 hari
  Target kembali ke site          19 Sep 2026
```

Angka "maks" dan "default" dibaca dari `pengaturan_kebijakan`, tidak ditulis di kode. Total dan target kembali dihitung ulang seketika saat nilai diubah, sebelum disimpan. PIC harus melihat tanggal jemput sebelum menekan simpan — di situlah kesalahan input paling mudah tertangkap.

#### Layar Pengaturan Kebijakan

Satu halaman sederhana, satu blok per perusahaan:

```
Kebijakan Cuti — PT Karunia Tirta Agung

  Hari perjalanan                    [ 0 ▾ ]   0 / 1 / 2 hari
  Maks tambahan cuti tahunan         [ 2 ▾ ]   0 s/d 5 hari
  Kompensasi remote area (default)   [ 1 ▾ ]   0 / 1 / 2 hari

  Perubahan hanya berlaku untuk keberangkatan baru.
  Siklus yang sudah berjalan tidak ikut berubah.

                                     [ Simpan ]
```

**Wajib diaktifkan sebelum go-live.** Supabase membiarkan tabel terbuka bila RLS tidak dinyalakan, dan `anon key` bersifat publik di sisi klien.

```sql
alter table perusahaan          enable row level security;
alter table karyawan            enable row level security;
alter table master_roster       enable row level security;
alter table pool_shelter        enable row level security;
alter table vendor_travel       enable row level security;
alter table driver              enable row level security;
alter table plafon_tiket        enable row level security;
alter table siklus_roster       enable row level security;
alter table perjalanan          enable row level security;
alter table surat_jalan         enable row level security;
alter table manifest_penumpang  enable row level security;
alter table cuti_tahunan        enable row level security;
alter table notifikasi_log      enable row level security;
alter table audit_log           enable row level security;
alter table profil_pengguna     enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from profil_pengguna
    where id = auth.uid()
      and peran in ('ADMIN','BACKUP_ADMIN')
  );
$$;

-- Pola yang diterapkan ke SEMUA tabel operasional:
-- pengguna terautentikasi boleh baca; hanya admin boleh tulis.
create policy baca_semua on karyawan
  for select to authenticated using (true);

create policy tulis_admin on karyawan
  for all to authenticated
  using (is_admin())
  with check (is_admin());
```

Ulangi pola dua policy tersebut untuk setiap tabel. Pengecualian:

- `audit_log` — hanya `select` untuk admin; tidak ada policy insert (trigger memakai `security definer`).
- `profil_pengguna` — pengguna boleh membaca barisnya sendiri; hanya admin boleh mengubah peran.

**Catatan view:** view di PostgreSQL mewarisi hak akses tabel dasarnya bila dibuat dengan `security_invoker`. Pada Supabase, tambahkan `alter view v_status_roster set (security_invoker = on);` agar RLS tetap berlaku.

---

## 5. Struktur Aplikasi

### 5.1 Rute

```
app/
├── (auth)/
│   └── login/page.tsx
├── (app)/
│   ├── layout.tsx                  ← shell + navigasi + pemilih perusahaan
│   ├── page.tsx                    ← F1  Papan Hari Ini (halaman pembuka)
│   ├── roster/
│   │   ├── page.tsx                ← F2  Daftar roster
│   │   └── [nik]/page.tsx          ←     Detail karyawan
│   ├── perjalanan/
│   │   ├── page.tsx                ←     Riwayat perjalanan
│   │   ├── berangkat/page.tsx      ← F3  Catat keberangkatan
│   │   └── kembali/page.tsx        ← F3  Catat kedatangan
│   ├── dokumen/
│   │   ├── page.tsx                ←     Daftar dokumen terbit
│   │   ├── manifest/page.tsx       ← F4  Susun & cetak manifest
│   │   └── surat-jalan/page.tsx    ← F5  Surat jalan driver
│   ├── rekap/page.tsx              ← F9  Rekap & ekspor
│   └── pengaturan/
│       ├── karyawan/page.tsx       ← F7  termasuk impor CSV
│       ├── roster/page.tsx         ←     master_roster per perusahaan
│       ├── travel/page.tsx         ←     vendor, driver, pool shelter
│       ├── plafon/page.tsx         ←     plafon tiket per POH
│       └── pengguna/page.tsx       ←     kelola peran
└── api/
    ├── pdf/manifest/route.ts
    └── pdf/surat-jalan/route.ts
```

### 5.2 Aturan implementasi

1. **Pemilih perusahaan hidup di layout**, disimpan sebagai state global (`Semua` / `KTA` / `KAI` / `KMB`). Setiap halaman membaca nilainya dan menerapkan filter.
2. **Halaman pembuka adalah papan Hari Ini**, bukan halaman selamat datang atau dashboard generik.
3. **Status roster hanya dibaca dari `v_status_roster`.** Dilarang menghitung ulang di TypeScript.
4. **Format tanggal tampilan:** `EEEE, d MMMM yyyy` dengan locale `id`. Contoh: `Kamis, 3 September 2026`.
5. **Format jam:** 24 jam, `HH.mm` dengan titik. Contoh: `10.00 WIB`.
6. **Format rupiah:** `Rp 1.250.000` — pemisah ribuan titik, tanpa desimal.
7. **Nomor HP:** tampilkan apa adanya (`081368964552`), jadikan tautan `wa.me/62...` dengan mengganti `0` di depan menjadi `62`.
8. **Sel kosong dibiarkan kosong.** Dilarang mengisi `-`, `N/A`, atau `null` sebagai teks tampilan.
9. **Aplikasi harus bisa dipakai dari kondisi kosong.** Tidak ada data karyawan awal yang diimpor. Seluruh karyawan diinput lewat aplikasi.
10. **Form tambah karyawan sekaligus membuat siklus pertama.** Selain data pribadi, form wajib meminta *tanggal masuk site terakhir*. Saat disimpan, sistem membuat satu baris `siklus_roster` berstatus `BERJALAN` dengan snapshot hari kerja dan hari libur diambil dari `master_roster` sesuai grade dan perusahaan. Karyawan tanpa siklus aktif akan muncul sebagai `NON_AKTIF` di papan dan tidak berguna.
11. **Durasi cuti tidak boleh dikunci 14 hari.** Lihat Bagian 3.5. Form keberangkatan wajib menampilkan tambahan cuti tahunan, kompensasi remote area, dan target kembali terhitung sebelum disimpan.
12. **Angka kebijakan dibaca dari `pengaturan_kebijakan`, bukan dari konstanta.** Hari perjalanan, batas maksimal tambahan cuti tahunan, dan kompensasi remote area semuanya diatur lewat menu Pengaturan.
13. **Saldo cuti tahunan direset per tanggal masuk kerja, bukan per 1 Januari.** Gunakan `awal_periode_cuti()`. Jangan pakai `extract(year from ...)`.

### 5.3 Warna status

```ts
const WARNA_STATUS = {
  NORMAL:        'bg-slate-100 text-slate-700',
  SEGERA_CUTI:   'bg-amber-100 text-amber-800',
  OVERDUE:       'bg-red-100 text-red-700',
  SEDANG_CUTI:   'bg-blue-100 text-blue-700',
  BELUM_KEMBALI: 'bg-red-200 text-red-900',
  NON_AKTIF:     'bg-slate-50 text-slate-400',
} as const;
```

### 5.4 PWA

`public/manifest.json`:

```json
{
  "name": "ROSTA — Monitoring Roster & Travel",
  "short_name": "ROSTA",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service worker wajib menyimpan cache untuk: papan Hari Ini (H-1 sampai H+7) dan daftar roster lengkap. Saat luring, tampilkan pita peringatan berisi waktu pembaruan terakhir. Halaman input dinonaktifkan saat luring — penulisan luring memerlukan antrean sinkronisasi yang berada di luar lingkup MVP.

---

## 6. Notifikasi

### 6.1 Penjadwal

```sql
select cron.schedule(
  'notifikasi-harian',
  '0 23 * * *',   -- 23.00 UTC = 06.00 WIB
  $$ select net.http_post(
       url     := '<URL_EDGE_FUNCTION>',
       headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
     ); $$
);
```

Perhatikan konversi zona waktu: `pg_cron` berjalan pada UTC. `06.00 WIB` ditulis sebagai `0 23 * * *` pada hari sebelumnya.

### 6.2 Edge Function

Satu fungsi menangani seluruh jenis N1–N9. Alurnya:

1. Ambil `hari_ini()`.
2. Kueri `v_status_roster` dan `v_perjalanan` untuk mencocokkan pemicu tiap kode notifikasi.
3. Susun pesan dari template.
4. Tulis ke `notifikasi_log` dengan status `MENUNGGU`.
5. Untuk kanal email — kirim via Resend, perbarui status.
6. Untuk kanal WhatsApp pada MVP — biarkan berstatus `MENUNGGU`; aplikasi menampilkannya sebagai antrean berisi tombol "Kirim" yang membuka `wa.me` dengan pesan sudah terisi.

**Kenapa WhatsApp tidak otomatis di MVP:** volume hanya ± 40 karyawan. WhatsApp Business API resmi memerlukan verifikasi bisnis Meta dan biaya per percakapan; gateway pihak ketiga berisiko akun diblokir. Pendekatan antrean memberi otomatisasi penyusunan pesan tanpa risiko tersebut, dengan biaya satu ketukan manusia.

---

## 7. Data Awal

```sql
insert into perusahaan (kode, nama_lengkap, prefix_surat) values
  ('KTA','PT Karunia Tirta Agung','KTA'),
  ('KAI','PT Karya Abadi Indotech','KAI'),
  ('KMB','PT KMB','KMB');   -- nama lengkap perlu dikonfirmasi

-- Siklus roster, disalin ke tiga perusahaan.
-- Sesuaikan bila KAI/KMB ternyata berbeda (PRD Bagian 15, pertanyaan 2).
insert into master_roster (perusahaan_id, grade, hari_kerja, hari_libur)
select p.id, g.grade, g.hari_kerja, g.hari_libur
from perusahaan p
cross join (values
  ('Grade 6 Up', 42, 14),
  ('Grade 5',    49, 14),
  ('Grade 4',    56, 14),
  ('Grade 3',    70, 14),
  ('Grade 1-2',  90, 14)
) as g(grade, hari_kerja, hari_libur);

-- Kebijakan awal. Ubah lewat menu Pengaturan, bukan lewat SQL.
insert into pengaturan_kebijakan
  (perusahaan_id, hari_perjalanan, maks_tambahan_cuti_tahunan, kompensasi_remote_default)
select id, 0, 2, 1 from perusahaan;

insert into pool_shelter (nama) values ('Bintel');
insert into vendor_travel (nama, kontak) values ('Latif Travel', '082177450720');
insert into driver (vendor_travel_id, nama, no_hp)
select id, 'Abdul Latif', '082177450720' from vendor_travel where nama = 'Latif Travel';
```

---

## 8. Prompt Handoff

Salin blok berikut ke AI pembangun, sertakan kedua file markdown.

```
Bangun aplikasi web bernama ROSTA — sistem monitoring roster cuti dan travel
karyawan tambang untuk tiga perusahaan (KTA, KAI, KMB).

DOKUMEN
- PRD_Sistem_Monitoring_Cuti_dan_Travel.md  → kebutuhan produk & aturan bisnis
- Spesifikasi_Teknis_ROSTA.md               → skema, logika, dan struktur aplikasi

STACK (sudah final, jangan diganti)
Next.js 15 App Router + TypeScript, Supabase, Tailwind + shadcn/ui,
react-hook-form + zod, TanStack Table, @react-pdf/renderer, date-fns
(locale id), PWA, deploy Vercel.

URUTAN PEMBANGUNAN
M1  Skema basis data — Bagian 2, 3, 4 spesifikasi teknis. Jalankan seluruh
    SQL apa adanya. Aktifkan RLS pada semua tabel. Muat data awal Bagian 7
    (perusahaan, master roster, pool shelter, vendor — TANPA karyawan).
M2  Autentikasi + shell aplikasi — login, navigasi, pemilih perusahaan.
M3  F7 Data master + Pengaturan Kebijakan. Input karyawan manual satu per
    satu, wajib menyertakan tanggal mulai kerja dan tanggal masuk site
    terakhir (yang otomatis membuat siklus pertama). Juga master roster,
    pool shelter, vendor & driver, plafon tiket, dan layar pengaturan
    kebijakan cuti per perusahaan.
    Aplikasi HARUS bisa dipakai dari basis data kosong.
M4  F1 Papan Hari Ini + F2 Daftar Roster.
M5  F3 Catat keberangkatan & kedatangan. Keduanya WAJIB lewat RPC
    catat_keberangkatan() dan catat_kedatangan().
M6  F4 Manifest + F5 Surat Jalan, keduanya menghasilkan PDF.
M7  F6 Notifikasi + impor CSV massal karyawan.

ATURAN YANG TIDAK BOLEH DILANGGAR
1.  Jangan pernah memakai current_date atau now() untuk logika tanggal.
    Gunakan fungsi hari_ini() (WIB). Server berjalan pada UTC — kesalahan
    sehari membuat seluruh aplikasi tidak ada gunanya.
2.  Status roster HANYA dibaca dari view v_status_roster. Dilarang
    menghitung ulang status di TypeScript, dan dilarang menyimpan status
    sebagai kolom.
3.  Urutan cabang CASE pada v_status_roster tidak boleh diubah.
4.  DURASI CUTI BUKAN 14 HARI TETAP. Total = cuti lapangan per grade
    + tambahan cuti tahunan + kompensasi remote area + hari perjalanan.
    Tiga komponen terakhir dibaca dari tabel pengaturan_kebijakan yang
    bisa diubah admin lewat menu Pengaturan. JANGAN tulis angkanya di
    kode. Lihat Bagian 3.5. Mengunci 14 hari membuat tanggal jemput
    salah dan status BELUM_KEMBALI muncul palsu.
4b. SALDO CUTI TAHUNAN DIRESET PER TANGGAL MASUK KERJA karyawan, bukan
    per 1 Januari. Gunakan fungsi awal_periode_cuti(). Memakai
    extract(year from ...) menghasilkan saldo salah untuk hampir semua
    karyawan.
5.  Setiap baris manifest wajib menampilkan nomor HP, tujuan, dan jam
    milik penumpang BARIS ITU SENDIRI. Uji dengan minimal 5 penumpang
    berbeda tujuan dalam satu manifest sebelum menyatakan selesai.
6.  RLS aktif pada semua tabel sebelum deploy.
7.  Tidak ada alur approval di mana pun. Tidak ada kolom status atasan,
    status HRGA, atau approval akhir.
8.  Seluruh antarmuka berbahasa Indonesia. Tanggal "Kamis, 3 September
    2026". Jam "10.00 WIB". Uang "Rp 1.250.000". Nomor HP "081368964552".
9.  Sel kosong dibiarkan kosong. Tanpa "-", "N/A", atau placeholder lain.
10. Halaman pembuka adalah papan Hari Ini, bukan dashboard generik.
11. Jangan pakai Puppeteer untuk PDF. Gunakan @react-pdf/renderer.

MULAI DARI M1. Setelah setiap milestone, berhenti dan laporkan apa yang
sudah jalan sebelum lanjut.
```

---

## 9. Uji Terima Sebelum Go-Live

| # | Uji | Lulus bila |
|---|---|---|
| 1 | Buka aplikasi pukul 01.00 WIB | Papan menampilkan tanggal hari itu, bukan kemarin |
| 2 | Karyawan Grade 4 masuk site 60 hari lalu, belum berangkat | Status `OVERDUE`, hari terlambat = 5 |
| 3 | Karyawan berangkat cuti 20 hari lalu, tanpa tambahan (libur 14) | Status `BELUM_KEMBALI`, hari terlambat = 6 |
| 4 | Karyawan berangkat cuti 5 hari lalu | Status `SEDANG_CUTI` |
| 5 | **Karyawan berangkat 16 hari lalu dengan tambahan 2 hari + remote 1 hari** | **Total 17 hari. Status `SEDANG_CUTI`, target kembali H+17. BUKAN `BELUM_KEMBALI`** |
| 6 | Set maks tambahan = 2, lalu isi tambahan cuti tahunan = 3 | Ditolak dengan pesan batas 2 hari |
| 6b | Ubah maks tambahan jadi 3 di Pengaturan, isi lagi 3 | Diterima, tanpa deploy ulang |
| 6c | Ubah hari perjalanan jadi 1, catat keberangkatan baru | Target kembali maju 1 hari; siklus lama tidak berubah |
| 7 | Ajukan tambahan 2 hari saat sisa cuti tinggal 1 | Ditolak dengan pesan sisa saldo |
| 8 | Ubah tambahan cuti pada form keberangkatan | Target kembali di layar berubah seketika sebelum disimpan |
| 8b | Karyawan masuk kerja 8 Des 2025, cek saldo per 3 Sep 2026 | Periode terbaca 8 Des 2025 – 7 Des 2026, bukan Jan–Des 2026 |
| 8c | Karyawan masuk kerja 15 Jan 2024, pakai cuti Des 2025 dan Feb 2026 | Hanya pemakaian sejak 15 Jan 2026 yang memotong saldo berjalan |
| 9 | Catat kedatangan | Siklus lama `SELESAI`, siklus baru `BERJALAN`, status kembali `NORMAL` |
| 10 | Coba buat dua siklus `BERJALAN` untuk satu NIK | Ditolak basis data |
| 11 | Tambah karyawan baru | Siklus pertama otomatis terbentuk; karyawan langsung muncul di daftar roster dengan status wajar |
| 12 | Buka aplikasi dengan basis data kosong | Tidak error; muncul ajakan menambah karyawan |
| 13 | Manifest 5 penumpang beda tujuan | Setiap baris menampilkan data miliknya sendiri |
| 14 | Terbitkan SPK dari KTA dan KAI di hari sama | Dua nomor berbeda, prefix sesuai entitas |
| 15 | Login sebagai VIEWER, coba ubah data | Ditolak; tombol simpan tidak muncul |
| 16 | Akses tabel dengan anon key tanpa login | Ditolak |
| 17 | Matikan koneksi, buka aplikasi | Papan Hari Ini tetap terbaca, ada pita peringatan luring |

---

## 10. Yang Harus Disiapkan Sebelum Pembangunan Dimulai

1. **Jawaban pertanyaan** di PRD Bagian 15. Minimal pertanyaan 2 dan 4 — tanpa itu, `master_roster` dan `plafon_tiket` tidak bisa diisi.
2. **Nilai awal kebijakan cuti** per perusahaan: hari perjalanan, batas tambahan cuti tahunan, kompensasi remote area. Ketiganya bisa diubah kapan saja lewat menu Pengaturan, jadi cukup isi perkiraan yang berlaku sekarang — tidak perlu ditunggu sampai final.
3. **Akun Supabase** dan **akun Vercel**.
4. **Nama Backup Admin.**

Data karyawan **tidak perlu disiapkan di muka**. Aplikasi dirancang agar bisa dipakai dari basis data kosong; karyawan diinput satu per satu lewat menu setelah MVP jalan. Impor CSV massal tetap dibangun di M7 untuk keperluan penambahan karyawan dalam jumlah besar nanti.

Yang tetap perlu diperhatikan saat mulai mengisi: setiap karyawan wajib disertai **tanggal masuk site terakhir**. Tanpa itu siklus pertama tidak terbentuk dan orang tersebut tidak muncul di papan Hari Ini.
