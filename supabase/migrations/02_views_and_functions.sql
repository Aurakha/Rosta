-- ==============================================================================
-- ROSTA (Roster & Travel Assistant)
-- Migration 02: Functions, RPCs, Triggers Audit, dan Views Terhitung
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIGGER AUDIT OTOMATIS
-- ------------------------------------------------------------------------------
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

create or replace function fn_audit_karyawan()
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
    coalesce(new.nik, old.nik),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_karyawan
  after insert or update or delete on karyawan
  for each row execute function fn_audit_karyawan();

create trigger trg_audit_siklus
  after insert or update or delete on siklus_roster
  for each row execute function fn_audit();

create trigger trg_audit_perjalanan
  after insert or update or delete on perjalanan
  for each row execute function fn_audit();

create trigger trg_audit_surat_jalan
  after insert or update or delete on surat_jalan
  for each row execute function fn_audit();

-- ------------------------------------------------------------------------------
-- 2. VIEW STATUS ROSTER (v_status_roster)
-- ------------------------------------------------------------------------------
-- PENTING: Urutan cabang CASE tidak boleh diubah.
-- Status tidak disimpan di kolom fisik melainkan murni terhitung dari view ini.
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

-- ------------------------------------------------------------------------------
-- 3. VIEW PAPAN HARI INI (v_hari_ini)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. VIEW SALDO CUTI TAHUNAN (Reset per Tanggal Mulai Kerja)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. GENERATOR PENOMORAN DOKUMEN OTOMATIS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. RPC TRANSAKSIONAL OPERASIONAL
-- ------------------------------------------------------------------------------

-- 6a. Catat Keberangkatan
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

-- 6b. Catat Kedatangan
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
