-- ==============================================================================
-- ROSTA (Roster & Travel Assistant)
-- Migration 03: Row Level Security (RLS) & Seed Data Awal
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
alter table perusahaan          enable row level security;
alter table karyawan            enable row level security;
alter table master_roster       enable row level security;
alter table pool_shelter        enable row level security;
alter table vendor_travel       enable row level security;
alter table driver              enable row level security;
alter table plafon_tiket        enable row level security;
alter table pengaturan_kebijakan enable row level security;
alter table siklus_roster       enable row level security;
alter table perjalanan          enable row level security;
alter table surat_jalan         enable row level security;
alter table manifest_penumpang  enable row level security;
alter table cuti_tahunan        enable row level security;
alter table notifikasi_log      enable row level security;
alter table audit_log           enable row level security;
alter table profil_pengguna     enable row level security;
alter table counter_dokumen     enable row level security;

-- Fungsi pembantu hak akses Admin
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

-- Policy Tabel Master: Akses baca publik/anon & authenticated; modifikasi oleh Admin
create policy baca_perusahaan on perusahaan for select using (true);
create policy tulis_perusahaan on perusahaan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_karyawan on karyawan for select using (true);
create policy tulis_karyawan on karyawan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_master_roster on master_roster for select using (true);
create policy tulis_master_roster on master_roster for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_pool_shelter on pool_shelter for select using (true);
create policy tulis_pool_shelter on pool_shelter for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_vendor_travel on vendor_travel for select using (true);
create policy tulis_vendor_travel on vendor_travel for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_driver on driver for select using (true);
create policy tulis_driver on driver for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_plafon_tiket on plafon_tiket for select using (true);
create policy tulis_plafon_tiket on plafon_tiket for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_pengaturan_kebijakan on pengaturan_kebijakan for select using (true);
create policy tulis_pengaturan_kebijakan on pengaturan_kebijakan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_counter_dokumen on counter_dokumen for select using (true);
create policy tulis_counter_dokumen on counter_dokumen for all to authenticated using (is_admin()) with check (is_admin());

-- Policy Tabel Operasional
create policy baca_siklus_roster on siklus_roster for select using (true);
create policy tulis_siklus_roster on siklus_roster for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_perjalanan on perjalanan for select using (true);
create policy tulis_perjalanan on perjalanan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_surat_jalan on surat_jalan for select using (true);
create policy tulis_surat_jalan on surat_jalan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_manifest_penumpang on manifest_penumpang for select using (true);
create policy tulis_manifest_penumpang on manifest_penumpang for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_cuti_tahunan on cuti_tahunan for select using (true);
create policy tulis_cuti_tahunan on cuti_tahunan for all to authenticated using (is_admin()) with check (is_admin());

create policy baca_notifikasi_log on notifikasi_log for select using (true);
create policy tulis_notifikasi_log on notifikasi_log for all to authenticated using (is_admin()) with check (is_admin());

-- Policy Khusus: Audit Log & Profil Pengguna
create policy baca_audit_log on audit_log for select to authenticated using (is_admin());
-- Insert audit_log dilakukan oleh security definer trigger, tidak perlu insert policy publik

create policy baca_profil on profil_pengguna for select to authenticated using (true);
create policy update_profil_sendiri on profil_pengguna for update to authenticated using (id = auth.uid());
create policy kelola_profil_admin on profil_pengguna for all to authenticated using (is_admin()) with check (is_admin());

-- Aktifkan security_invoker pada Views agar RLS tetap ditegakkan
alter view v_status_roster set (security_invoker = on);
alter view v_hari_ini set (security_invoker = on);
alter view v_saldo_cuti set (security_invoker = on);

-- ------------------------------------------------------------------------------
-- 2. SEED DATA AWAL (Setup Entitas, Aturan Roster, & Kebijakan)
-- ------------------------------------------------------------------------------
-- Catatan: Data karyawan TIDAK diisi awal. Karyawan diinput lewat menu aplikasi.

-- Perusahaan
insert into perusahaan (kode, nama_lengkap, prefix_surat) values
  ('KTA', 'PT Karunia Tirta Agung', 'KTA'),
  ('KAI', 'PT Karya Abadi Indotech', 'KAI'),
  ('KMB', 'PT KMB', 'KMB')
on conflict (kode) do nothing;

-- Master Roster (Grade 1 s/d Grade 6 Up per perusahaan)
insert into master_roster (perusahaan_id, grade, hari_kerja, hari_libur)
select p.id, g.grade, g.hari_kerja, g.hari_libur
from perusahaan p
cross join (values
  ('Grade 6 Up', 42, 14),
  ('Grade 5',    49, 14),
  ('Grade 4',    56, 14),
  ('Grade 3',    70, 14),
  ('Grade 1-2',  90, 14)
) as g(grade, hari_kerja, hari_libur)
on conflict (perusahaan_id, grade) do nothing;

-- Kebijakan Cuti Awal
insert into pengaturan_kebijakan (perusahaan_id, hari_perjalanan, maks_tambahan_cuti_tahunan, kompensasi_remote_default)
select id, 0, 2, 1
from perusahaan
on conflict (perusahaan_id) do nothing;

-- Pool Shelter Awal
insert into pool_shelter (nama, alamat) values
  ('Bintel', 'Pool Shelter Bintel Site Tambang Muratara')
on conflict (nama) do nothing;

-- Vendor Travel & Driver
insert into vendor_travel (nama, kontak) values
  ('Latif Travel', '082177450720')
on conflict do nothing;

insert into driver (vendor_travel_id, nama, no_hp, no_polisi_default)
select id, 'Abdul Latif', '082177450720', 'BG 1234 XY'
from vendor_travel
where nama = 'Latif Travel'
limit 1;
