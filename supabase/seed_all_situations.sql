-- ==============================================================================
-- ROSTA — SEED DATA DENGAN SEMUA SITUASI OPERASIONAL
-- (Menyediakan data lengkap untuk setiap skenario yang diatur di PRD & Spesifikasi)
-- ==============================================================================

do $$
declare
  v_kta_id  uuid;
  v_kai_id  uuid;
  v_kmb_id  uuid;
  v_bintel  uuid;
  v_transit uuid;
  v_pit1    uuid;
  v_latif_v uuid;
  v_ratu_v  uuid;
  v_latif_d uuid;
  v_hendra  uuid;
  v_dedi    uuid;

  v_siklus_id uuid;
  v_perj_1    uuid;
  v_perj_2    uuid;
  v_perj_3    uuid;
  v_perj_4    uuid;
  v_perj_5    uuid;
  v_sj_id     uuid;
  tbl         text;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Master Perusahaan (KTA, KAI, KMB)
  -- ---------------------------------------------------------------------------
  insert into perusahaan (kode, nama_lengkap, prefix_surat) values
    ('KTA', 'PT Karunia Tirta Agung', 'KTA'),
    ('KAI', 'PT Karya Abadi Indotech', 'KAI'),
    ('KMB', 'PT KMB', 'KMB')
  on conflict (kode) do update set aktif = true;

  select id into v_kta_id from perusahaan where kode = 'KTA';
  select id into v_kai_id from perusahaan where kode = 'KAI';
  select id into v_kmb_id from perusahaan where kode = 'KMB';

  -- ---------------------------------------------------------------------------
  -- 2. Kebijakan & Master Roster
  -- ---------------------------------------------------------------------------
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

  insert into pengaturan_kebijakan (perusahaan_id, hari_perjalanan, maks_tambahan_cuti_tahunan, kompensasi_remote_default)
  select id, 0, 2, 1
  from perusahaan
  on conflict (perusahaan_id) do nothing;

  -- ---------------------------------------------------------------------------
  -- 3. Shelter Point, Vendor Travel & Driver
  -- ---------------------------------------------------------------------------
  insert into pool_shelter (nama, alamat) values
    ('Bintel', 'Pool Shelter Bintel Site Tambang Muratara'),
    ('Camp Pit 1', 'Camp Barat Pit Tambang Muratara'),
    ('Transit Lubuklinggau', 'Mess Transit Jl. Yos Sudarso Lubuklinggau')
  on conflict (nama) do nothing;

  select id into v_bintel  from pool_shelter where nama = 'Bintel';
  select id into v_transit from pool_shelter where nama = 'Transit Lubuklinggau';
  select id into v_pit1    from pool_shelter where nama = 'Camp Pit 1';

  insert into vendor_travel (nama, kontak) values
    ('Latif Travel', '082177450720'),
    ('Ratu Travel Musi', '081278901234')
  on conflict do nothing;

  select id into v_latif_v from vendor_travel where nama = 'Latif Travel' limit 1;
  select id into v_ratu_v  from vendor_travel where nama = 'Ratu Travel Musi' limit 1;

  insert into driver (vendor_travel_id, nama, no_hp, no_polisi_default) values
    (v_latif_v, 'Abdul Latif', '082177450720', 'BG 1234 XY'),
    (v_ratu_v,  'Hendra Saputra', '081367890123', 'BG 7890 AB'),
    (v_latif_v, 'Dedi Kurniawan', '085277889900', 'BG 4567 CD')
  on conflict do nothing;

  select id into v_latif_d from driver where nama = 'Abdul Latif' limit 1;
  select id into v_hendra  from driver where nama = 'Hendra Saputra' limit 1;
  select id into v_dedi    from driver where nama = 'Dedi Kurniawan' limit 1;

  -- ---------------------------------------------------------------------------
  -- 4. Plafon Tiket Berbagai POH & Moda
  -- ---------------------------------------------------------------------------
  insert into plafon_tiket (perusahaan_id, poh, moda, plafon, berlaku_dari)
  select p.id, t.poh, t.moda::moda_transportasi, t.plafon, '2026-01-01'::date
  from perusahaan p
  cross join (values
    ('Jakarta',     'PESAWAT',      1800000),
    ('Jakarta',     'KERETA',        500000),
    ('Palembang',   'TRAVEL_DARAT',  250000),
    ('Palembang',   'KERETA',        200000),
    ('Yogyakarta',  'PESAWAT',      2200000),
    ('Yogyakarta',  'KERETA',        600000),
    ('Surabaya',    'PESAWAT',      2500000),
    ('Semarang',    'PESAWAT',      2100000),
    ('Banjarbaru',  'PESAWAT',      2800000),
    ('Lahat',       'TRAVEL_DARAT',  200000),
    ('Padang',      'TRAVEL_DARAT',  400000)
  ) as t(poh, moda, plafon)
  on conflict (perusahaan_id, poh, moda, berlaku_dari) do nothing;

  -- ---------------------------------------------------------------------------
  -- 5. Data Karyawan (22 Karyawan untuk Seluruh Situasi Roster & Operasional)
  -- ---------------------------------------------------------------------------
  insert into karyawan (nik, perusahaan_id, nama, jabatan, departemen, grade, tanggal_mulai_kerja, poh, no_hp, atasan, hak_cuti_tahunan, status_karyawan) values
    -- SITUASI 1: NORMAL (Di Site, Sisa Hari > 7)
    ('KTA-001', v_kta_id, 'Budi Pratama', 'Supervisor Tambang', 'Produksi', 'Grade 4', '2023-01-15', 'Palembang', '081271112233', 'Pak Joko', 12, 'AKTIF'),
    ('KAI-002', v_kai_id, 'Eko Wahyudi', 'Mine Plan Engineer', 'Engineering', 'Grade 5', '2022-06-10', 'Yogyakarta', '081372223344', 'Pak Agung', 12, 'AKTIF'),
    ('KMB-003', v_kmb_id, 'Ahmad Fauzi', 'Mekanik Alat Berat', 'Plant', 'Grade 1-2', '2024-03-01', 'Lahat', '082173334455', 'Pak Rusdi', 12, 'AKTIF'),
    ('KTA-004', v_kta_id, 'Dian Permata', 'Officer HRGA Site', 'HRGA', 'Grade 4', '2023-08-20', 'Jakarta', '081274445566', 'Ibu Maya', 12, 'AKTIF'),

    -- SITUASI 2: SEGERA CUTI (Di Site, Sisa Hari <= 7 dan >= 0 - Waktunya pesan tiket/carter!)
    ('KTA-005', v_kta_id, 'Rian Hidayat', 'Foreman Pit Control', 'Produksi', 'Grade 4', '2023-05-12', 'Jakarta', '081275556677', 'Budi Pratama', 12, 'AKTIF'),
    ('KAI-006', v_kai_id, 'Bambang Setiawan', 'Safety Inspector', 'HSE', 'Grade 3', '2022-11-05', 'Palembang', '081376667788', 'Pak Hendra', 12, 'AKTIF'),
    ('KMB-007', v_kmb_id, 'Surya Darma', 'Admin Gudang & BBM', 'Logistik', 'Grade 1-2', '2024-01-10', 'Semarang', '082177778899', 'Pak Anton', 12, 'AKTIF'),

    -- SITUASI 3: OVERDUE (Di Site, Hari Kerja Berjalan > Roster - Perlu Tindakan Segera!)
    ('KTA-008', v_kta_id, 'Hendra Gunawan', 'Chief Surveyor', 'Engineering', 'Grade 5', '2021-04-01', 'Surabaya', '081278889900', 'Pak Joko', 12, 'AKTIF'),
    ('KMB-009', v_kmb_id, 'Rudi Hartono', 'Operator Excavator 800', 'Produksi', 'Grade 1-2', '2023-09-15', 'Palembang', '082179990011', 'Budi Pratama', 12, 'AKTIF'),

    -- SITUASI 4: SEDANG CUTI (Di Rumah / POH, Hari Ini <= Target Kembali)
    ('KTA-010', v_kta_id, 'Aris Munandar', 'Foreman Auto Electric', 'Plant', 'Grade 3', '2022-02-18', 'Banjarbaru', '081280001122', 'Pak Rusdi', 12, 'AKTIF'),
    ('KAI-011', v_kai_id, 'Teguh Wibowo', 'Supervisor CPP & Hauling', 'CPP', 'Grade 4', '2021-07-25', 'Yogyakarta', '081381112233', 'Pak Agung', 12, 'AKTIF'),

    -- SITUASI 5: BELUM KEMBALI (Terlambat Pulang ke Site! Hari Ini > Target Kembali - Perlu Tindakan!)
    ('KTA-012', v_kta_id, 'Fajar Nugroho', 'Operator Dozer D85', 'Produksi', 'Grade 1-2', '2023-11-01', 'Lahat', '081282223344', 'Budi Pratama', 12, 'AKTIF'),
    ('KAI-013', v_kai_id, 'Yudi Santoso', 'Geologist', 'Engineering', 'Grade 5', '2022-09-14', 'Jakarta', '081383334455', 'Pak Joko', 12, 'AKTIF'),

    -- SITUASI 6: NON-AKTIF (Karyawan Resign / Pensiun)
    ('KTA-014', v_kta_id, 'Doni Saputra', 'Helper Mekanik', 'Plant', 'Grade 1-2', '2024-02-01', 'Palembang', '081284445566', 'Pak Rusdi', 12, 'NON_AKTIF'),

    -- SITUASI 7: BERANGKAT HARI INI (Layar Hari Ini - Kartu Berangkat)
    ('KTA-015', v_kta_id, 'Andi Wijaya', 'Mine Superintendent', 'Produksi', 'Grade 6 Up', '2020-03-10', 'Jakarta', '081285556677', 'General Manager', 12, 'AKTIF'),
    ('KAI-016', v_kai_id, 'M. Yusuf', 'Senior Surveyor', 'Engineering', 'Grade 4', '2022-01-15', 'Palembang', '081386667788', 'Hendra Gunawan', 12, 'AKTIF'),
    ('KMB-017', v_kmb_id, 'Agus Triyono', 'Environmental Officer', 'HSE', 'Grade 4', '2023-04-18', 'Yogyakarta', '082187778899', 'Pak Hendra', 12, 'AKTIF'),

    -- SITUASI 8: DATANG HARI INI (Layar Hari Ini - Kartu Datang / Jemput)
    ('KTA-018', v_kta_id, 'Rahmat Hidayat', 'Specialist Hydraulic', 'Plant', 'Grade 4', '2022-08-01', 'Jakarta', '081288889900', 'Pak Rusdi', 12, 'AKTIF'),
    ('KAI-019', v_kai_id, 'Indra Gunawan', 'Dispatcher Radio Tambang', 'Produksi', 'Grade 3', '2023-06-20', 'Palembang', '081389990011', 'Budi Pratama', 12, 'AKTIF'),

    -- SITUASI 9 & 10: OVER PLAFON & TIKET PENDING
    ('KTA-020', v_kta_id, 'Bayu Samudra', 'Pit Supervisor', 'Produksi', 'Grade 4', '2022-10-10', 'Surabaya', '081290001122', 'Andi Wijaya', 12, 'AKTIF'),
    ('KAI-021', v_kai_id, 'Heri Purwanto', 'Welder Specialist', 'Plant', 'Grade 1-2', '2023-12-05', 'Jakarta', '081391112233', 'Pak Rusdi', 12, 'AKTIF'),
    ('KMB-022', v_kmb_id, 'Wahyu Pratama', 'Geotechnical Engineer', 'Engineering', 'Grade 5', '2023-02-14', 'Yogyakarta', '082192223344', 'Eko Wahyudi', 12, 'AKTIF')
  on conflict (nik) do update set
    nama = excluded.nama,
    jabatan = excluded.jabatan,
    departemen = excluded.departemen,
    grade = excluded.grade,
    poh = excluded.poh,
    no_hp = excluded.no_hp,
    status_karyawan = excluded.status_karyawan;

  -- ---------------------------------------------------------------------------
  -- 6. Siklus Roster Sesuai Setiap Situasi Relatif terhadap hari_ini()
  -- ---------------------------------------------------------------------------
  delete from perjalanan;
  delete from siklus_roster;

  -- Situasi 1: NORMAL (Di Site, baru masuk 20 hari lalu, sisa > 7)
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, status) values
    ('KTA-001', hari_ini() - 20, 56, 14, 'BERJALAN'),
    ('KAI-002', hari_ini() - 15, 49, 14, 'BERJALAN'),
    ('KMB-003', hari_ini() - 30, 90, 14, 'BERJALAN'),
    ('KTA-004', hari_ini() - 10, 56, 14, 'BERJALAN');

  -- Situasi 2: SEGERA CUTI (Di Site, sisa hari <= 7)
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, status) values
    ('KTA-005', hari_ini() - 53, 56, 14, 'BERJALAN'), -- sisa 2 hari
    ('KAI-006', hari_ini() - 65, 70, 14, 'BERJALAN'), -- sisa 4 hari
    ('KMB-007', hari_ini() - 88, 90, 14, 'BERJALAN'); -- sisa 1 hari

  -- Situasi 3: OVERDUE (Di Site, hari kerja berjalan > hari kerja roster)
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, status) values
    ('KTA-008', hari_ini() - 58, 49, 14, 'BERJALAN'), -- terlambat 9 hari keluar
    ('KMB-009', hari_ini() - 98, 90, 14, 'BERJALAN'); -- terlambat 8 hari keluar

  -- Situasi 4: SEDANG CUTI (Sudah keluar site, hari_ini <= target_kembali)
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, tanggal_aktual_keluar, kompensasi_remote, tambahan_cuti_tahunan, status) values
    ('KTA-010', hari_ini() - 76, 70, 14, hari_ini() - 6, 1, 0, 'BERJALAN'), -- kembali hari_ini + 9
    ('KAI-011', hari_ini() - 66, 56, 14, hari_ini() - 10, 1, 2, 'BERJALAN'); -- tambahan 2 hari cuti tahunan, kembali hari_ini + 7

  -- Situasi 5: BELUM KEMBALI (Sudah keluar site, hari_ini > target_kembali)
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, tanggal_aktual_keluar, status) values
    ('KTA-012', hari_ini() - 110, 90, 14, hari_ini() - 18, 'BERJALAN'), -- target kembali hari_ini - 4 (telat 4 hari!)
    ('KAI-013', hari_ini() - 75,  49, 14, hari_ini() - 21, 'BERJALAN'); -- target kembali hari_ini - 7 (telat 7 hari!)

  -- Situasi 7: BERANGKAT HARI INI
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, tanggal_aktual_keluar, status) values
    ('KTA-015', hari_ini() - 41, 42, 14, hari_ini(), 'BERJALAN'),
    ('KAI-016', hari_ini() - 55, 56, 14, hari_ini(), 'BERJALAN'),
    ('KMB-017', hari_ini() - 55, 56, 14, hari_ini(), 'BERJALAN');

  -- Situasi 8: DATANG HARI INI
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, tanggal_aktual_keluar, status) values
    ('KTA-018', hari_ini() - 70, 56, 14, hari_ini() - 14, 'BERJALAN'),
    ('KAI-019', hari_ini() - 85, 70, 14, hari_ini() - 15, 'BERJALAN');

  -- Situasi 9 & 10: OVER PLAFON & TIKET PENDING
  insert into siklus_roster (nik, tanggal_masuk_site, hari_kerja_snapshot, hari_libur_snapshot, tanggal_aktual_keluar, status) values
    ('KTA-020', hari_ini() - 56, 56, 14, hari_ini() - 2, 'BERJALAN'),
    ('KAI-021', hari_ini() - 90, 90, 14, hari_ini() - 3, 'BERJALAN'),
    ('KMB-022', hari_ini() - 45, 49, 14, null, 'BERJALAN');

  -- ---------------------------------------------------------------------------
  -- 7. Transaksi Perjalanan & Dokumen Surat Jalan / Manifest
  -- ---------------------------------------------------------------------------
  -- Ambil siklus ID untuk referensi
  select id into v_siklus_id from siklus_roster where nik = 'KTA-015' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, jam_jemput, titik_tujuan, moda, jam_berangkat, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KTA-015', 'KELUAR', hari_ini(), v_bintel, '08:00', 'Bandara Silampari', 'PESAWAT', '14:30', 'Batik Air', 'BTK-9988', 1750000, 1800000, v_kta_id, 'Cuti lapangan reguler')
  returning id into v_perj_1;

  select id into v_siklus_id from siklus_roster where nik = 'KAI-016' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, jam_jemput, titik_tujuan, moda, jam_berangkat, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KAI-016', 'KELUAR', hari_ini(), v_bintel, '08:00', 'Stasiun Lubuklinggau', 'TRAVEL_DARAT', '11:00', 'Latif Travel', 'LT-5544', 250000, 250000, v_kai_id, 'Shared travel carter ke Lubuklinggau')
  returning id into v_perj_2;

  select id into v_siklus_id from siklus_roster where nik = 'KMB-017' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, jam_jemput, titik_tujuan, moda, jam_berangkat, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KMB-017', 'KELUAR', hari_ini(), v_bintel, '13:00', 'Stasiun Lubuklinggau', 'KERETA', '18:00', 'KA Sindang Marga', 'KA-7721', 550000, 600000, v_kmb_id, 'POH Yogyakarta transit Palembang')
  returning id into v_perj_3;

  select id into v_siklus_id from siklus_roster where nik = 'KTA-018' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, jam_jemput, titik_tujuan, moda, jam_tiba, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KTA-018', 'MASUK', hari_ini(), v_bintel, '11:20', 'Pool Bintel Site', 'PESAWAT', '11:20', 'Wings Air', 'WA-3321', 1650000, 1800000, v_kta_id, 'Jemput Bandara Silampari')
  returning id into v_perj_4;

  select id into v_siklus_id from siklus_roster where nik = 'KAI-019' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, jam_jemput, titik_tujuan, moda, jam_tiba, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KAI-019', 'MASUK', hari_ini(), v_bintel, '14:15', 'Pool Bintel Site', 'KERETA', '14:15', 'KA Bukit Serelo', 'KA-4411', 200000, 200000, v_kai_id, 'Jemput Stasiun Lubuklinggau')
  returning id into v_perj_5;

  -- Situasi Over Plafon (Bayu Samudra: Tiket Surabaya Rp 3.200.000 vs Plafon Rp 2.500.000 -> Over Plafon Rp 700.000)
  select id into v_siklus_id from siklus_roster where nik = 'KTA-020' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, titik_tujuan, moda, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KTA-020', 'KELUAR', hari_ini() - 2, v_bintel, 'Bandara Silampari', 'PESAWAT', 'Batik Air', 'BTK-9901', 3200000, 2500000, v_kta_id, 'Tiket mendadak H-1 Over Plafon Rp 700.000');

  -- Situasi Pengecualian Jakarta (Heri Purwanto: Tiket Jakarta Rp 2.350.000 vs Plafon Rp 1.800.000 -> Sesuai PRD Jakarta Over Plafon = 0)
  select id into v_siklus_id from siklus_roster where nik = 'KAI-021' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, titik_tujuan, moda, maskapai_ka, kode_booking, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KAI-021', 'KELUAR', hari_ini() - 3, v_bintel, 'Bandara Silampari', 'PESAWAT', 'Batik Air', 'BTK-8812', 2350000, 1800000, v_kai_id, 'Rute Jakarta dikecualikan dari over plafon');

  -- Situasi Tiket Pending (Wahyu Pratama: 5 hari lagi keluar site, tiket belum dibeli!)
  select id into v_siklus_id from siklus_roster where nik = 'KMB-022' and status = 'BERJALAN';
  insert into perjalanan (siklus_id, nik, arah, tanggal_travel, pool_shelter_id, titik_tujuan, moda, harga_tiket, plafon, penanggung_biaya, catatan)
  values (v_siklus_id, 'KMB-022', 'KELUAR', hari_ini() + 4, v_bintel, 'Bandara Silampari', 'PESAWAT', null, 2200000, v_kmb_id, 'Peringatan: Tiket belum dibeli!');

  -- ---------------------------------------------------------------------------
  -- 8. Dokumen Surat Jalan Resmi & Manifest Gabungan KTA + KAI
  -- ---------------------------------------------------------------------------
  delete from manifest_penumpang;
  delete from surat_jalan;

  insert into surat_jalan (
    nomor_surat, jenis, perusahaan_penerbit, tanggal, vendor_travel_id, driver_id, no_polisi, rute_dari, rute_tujuan, harga_carter
  ) values (
    '001/KTA/SPK/IX/2026', 'SPK', v_kta_id, hari_ini(), v_latif_v, v_latif_d, 'BG 1234 XY', 'Shelter Bintel', 'Bandara & Stasiun Lubuklinggau', 1200000
  ) returning id into v_sj_id;

  -- Gabungkan Andi Wijaya (KTA) dan M. Yusuf (KAI) ke dalam 1 Mobil Carter Latif Travel
  insert into manifest_penumpang (surat_jalan_id, perjalanan_id, urutan) values
    (v_sj_id, v_perj_1, 1),
    (v_sj_id, v_perj_2, 2);

  -- ---------------------------------------------------------------------------
  -- 9. Riwayat Cuti Tahunan (Untuk Verifikasi Saldo Cuti)
  -- ---------------------------------------------------------------------------
  delete from cuti_tahunan;
  insert into cuti_tahunan (nik, jenis, tanggal_mulai, tanggal_selesai, alasan) values
    ('KTA-001', 'CUTI_TAHUNAN', hari_ini() - 100, hari_ini() - 98, 'Urusan keluarga di Palembang (3 hari)'),
    ('KAI-011', 'CUTI_TAHUNAN', hari_ini() - 10, hari_ini() - 9, 'Tambahan 2 hari cuti tahunan pada siklus aktif');

  -- ---------------------------------------------------------------------------
  -- 10. Pastikan Izin Baca (SELECT) Terbuka untuk Anon & Authenticated
  -- ---------------------------------------------------------------------------
  for tbl in select unnest(array[
    'perusahaan', 'karyawan', 'master_roster', 'pool_shelter', 'vendor_travel',
    'driver', 'plafon_tiket', 'pengaturan_kebijakan', 'siklus_roster',
    'perjalanan', 'surat_jalan', 'manifest_penumpang', 'cuti_tahunan',
    'notifikasi_log', 'counter_dokumen'
  ]) loop
    execute format('drop policy if exists %I on %I;', 'baca_' || tbl, tbl);
    execute format('create policy %I on %I for select using (true);', 'baca_' || tbl, tbl);
  end loop;

end $$;
