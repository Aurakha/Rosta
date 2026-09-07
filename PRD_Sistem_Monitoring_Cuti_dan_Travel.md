# PRD — Sistem Monitoring Roster Cuti & Travel Lapangan

**Nama kerja aplikasi:** ROSTA (Roster & Travel Assistant)
**Versi dokumen:** 1.0 — Draft untuk Review
**Tanggal:** 3 September 2026
**Cakupan entitas:** PT KTA · PT KAI · PT KMB
**Lokasi operasi:** Site Tambang Musi Rawas Utara, Sumatera Selatan
**Sumber analisis:** `Monitoring_Cuti_Lapangan.xlsm` (10 sheet, 40 karyawan aktif terdata)

---

## 1. Ringkasan Eksekutif

### 1.1 Masalah inti

PIC travel tidak punya satu tempat untuk menjawab dua pertanyaan operasional harian:

1. **Siapa yang berangkat cuti hari ini** — sehingga harus diantar ke bandara/stasiun.
2. **Siapa yang kembali dari cuti hari ini** — sehingga harus dijemput.

Saat ini jawabannya tersebar di 10 sheet Excel yang saling merujuk, sebagian rumusnya sudah putus, dan hanya bisa dibuka dari laptop yang punya file versi terbaru.

### 1.2 Solusi yang diusulkan

Aplikasi web yang bisa dipasang di HP (installable), dipegang **satu admin utama** sebagai PIC travel & cuti untuk ketiga perusahaan. Aplikasi menampilkan papan harian "Hari Ini", membuat manifest & surat jalan otomatis, dan mengirim notifikasi terjadwal ke PIC serta karyawan.

### 1.3 Keputusan desain yang sudah ditetapkan pemilik produk

| Keputusan | Isi |
|---|---|
| **Multi-perusahaan** | Satu aplikasi melayani KTA, KAI, dan KMB dalam satu basis data |
| **Tidak ada alur approval** | Tidak ada level atasan/HRGA/final approval. Kolom approval di Excel dihapus |
| **Notifikasi, bukan persetujuan** | Sistem hanya memberi tahu; tidak menahan proses menunggu klik siapa pun |
| **Satu PIC** | Satu orang admin utama mengelola tiket pesawat/kereta dan travel bandara ⇄ tambang |

### 1.4 Nilai bisnis yang dikejar

- Tidak ada lagi karyawan telat dijemput atau tertinggal pesawat karena manifest terlambat.
- Tiket dibeli **H-14**, bukan H-2 — harga rute Silampari/Lubuklinggau jauh lebih murah bila dibeli awal.
- Satu carter travel bisa diisi beberapa penumpang karena sistem otomatis mengelompokkan orang dengan tanggal + pool shelter yang sama.
- Kepala departemen tahu lebih awal siapa anak buahnya yang akan kosong, sehingga bisa siapkan pengganti.

---

## 2. Kondisi Saat Ini (Analisis File Terlampir)

### 2.1 Apa yang sudah ada dan layak dipertahankan

File Excel yang ada sebenarnya sudah memuat logika bisnis yang benar. Ini aset, bukan sampah — konsepnya dipindahkan utuh ke aplikasi.

| Sheet | Fungsi | Nasib di aplikasi |
|---|---|---|
| `Database Karyawan` | Master 40 karyawan: NIK, nama, jabatan, departemen, grade, tanggal masuk kerja, tanggal terakhir masuk site, status, atasan, No. HP, hak cuti tahunan, **POH** | Jadi tabel `karyawan` |
| `Master Roster` | Aturan siklus per grade | Jadi tabel `master_roster`, dibuat per perusahaan |
| `Monitoring Roster` | Perhitungan status roster 40 orang | Jadi **view terhitung**, bukan tabel manual |
| `Dashboard` | Ringkasan hitungan per status | Jadi layar "Hari Ini" |
| `Rekap` | Rekap per grade dan per departemen | Jadi layar "Rekap" |
| `CUTI` | Log pemesanan travel: tanggal, tujuan, jam, pool shelter berangkat & pulang, cost bearer | Jadi tabel `perjalanan` |
| `Passenger List` | Cetak SPK + manifest penumpang berangkat & pulang | Jadi generator dokumen otomatis |
| `SJ` | Surat jalan driver: rute, jam, no. polisi, harga carter, harga tiket, over plafon | Jadi tabel `surat_jalan` + `biaya` |
| `Form Pengajuan Cuti Tahunan` | Pengajuan cuti tahunan + 3 kolom approval | **Approval dibuang.** Form disederhanakan |
| `Saldo Cuti Tahunan` | Hak cuti − terpakai = sisa | Jadi view terhitung |

### 2.2 Aturan siklus roster yang terbaca di file

| Grade | Hari Kerja | Hari Libur | Total Siklus |
|---|---|---|---|
| Grade 6 Up | 42 | 14 | 56 |
| Grade 5 | 49 | 14 | 63 |
| Grade 4 | 56 | 14 | 70 |
| Grade 3 | 70 | 14 | 84 |
| Grade 1–2 | 90 | 14 | 104 |

### 2.3 Temuan masalah — dengan bukti dari file

Ini bagian yang perlu dibaca tanpa disaring. Kondisi file sekarang **tidak bisa dipakai mengambil keputusan**, dan angkanya membuktikan itu.

#### Temuan 1 — Seluruh 40 karyawan salah status

Dashboard menampilkan: `NORMAL = 0`, `SEGERA CUTI = 0`, `OVERDUE = 0`, `SEDANG CUTI = 0`, **`BELUM KEMBALI = 40`**.

Artinya sistem menyatakan seluruh karyawan site sedang telat pulang. Ini jelas tidak sesuai kenyataan lapangan.

**Akar masalah:** rumus status di `Monitoring Roster` kolom N menentukan seseorang sedang cuti dengan mengecek apakah kolom "Aktual Keluar" kosong:

```
=IF(J2<>"", IF(TODAY()<=M2,"SEDANG CUTI","BELUM KEMBALI"), ...)
```

Kolom J (Aktual Keluar) ternyata tidak benar-benar kosong — isinya nilai waktu `00:00:00` (serial angka 0), bukan sel kosong. Excel membaca `J2<>""` sebagai **TRUE** untuk semua orang, sehingga semuanya jatuh ke cabang "sudah berangkat cuti".

#### Temuan 2 — Perhitungan hari meledak

Akibat lanjutan dari Temuan 1:

| Kolom | Nilai yang muncul | Nilai yang seharusnya |
|---|---|---|
| Hari Kerja Berjalan | **−46.208** | 0–90 |
| Sisa Hari Kerja | **46.250** | 0–90 |
| Target Kembali | **14 Januari 1900** | tanggal 2026 |
| Total Hari Terlambat (Dashboard) | **1.849.440 hari** | 0 |

1,8 juta hari ≈ 5.067 tahun. Angka ini muncul di dashboard yang dipakai rapat.

#### Temuan 3 — Rumus merujuk ke file lain yang tidak ada

File ini hasil ekspor dari Google Sheets (terdeteksi named range `Google_Sheet_Link_558349294` dkk). Beberapa rumus masih menunjuk workbook eksternal yang tidak ikut terbawa:

- `Form Pengajuan Cuti Tahunan` → `'[6]Database Karyawan'!$A:$J`
- `Saldo Cuti Tahunan` → `'[6]Form Pengajuan'!$G:$G`
- Named range `kaka` → `[2]CUTI!$B$1:$T$1`
- Named range `Tabel_Bantu` → `[5]COVER!$O$8:$O$17`
- Named range `MP` → `#REF!`

Konsekuensinya: **saldo cuti tahunan tidak bisa dipercaya**, karena rumus SUMIFS-nya memanggil sumber yang hilang.

#### Temuan 4 — Sheet SJ (Surat Jalan) rusak total

Seluruh VLOOKUP di sheet `SJ` menunjuk `#REF!`:

```
=IF(D8>0, VLOOKUP(D8, #REF!, 2, 0), "")
```

Nama, jabatan, dan nomor HP di surat jalan **tidak akan pernah terisi otomatis**. Harus diketik manual satu per satu. Ditambah lagi, sel `J3` dan `J4` berisi tanggal `28–29 Juli 2014` — sisa template lama yang tidak pernah dibersihkan.

#### Temuan 5 — Manifest penumpang menampilkan data yang sama berulang

Di `Passenger List`, baris 19–29 mengambil nomor HP, tujuan, dan jam keberangkatan dengan referensi terkunci ke penumpang pertama:

```
Baris 19: =IF(C19>$K$16,"",OFFSET(CUTI!$D$1,$D$18,4))   ← $D$18, bukan D19
Baris 20: =IF(C20>$K$16,"",OFFSET(CUTI!$D$1,$D$18,4))   ← $D$18 lagi
```

Hanya kolom Nama yang benar (memakai `D19`, `D20`). Artinya **manifest yang dicetak menampilkan nama berbeda tetapi nomor HP, tujuan, dan jam berangkat milik orang pertama untuk semua penumpang.** Untuk dokumen yang dipegang driver di lapangan, ini kesalahan operasional yang berbahaya.

#### Temuan 6 — Tidak ada dimensi perusahaan sama sekali

Tidak ada satu pun kolom yang membedakan KTA, KAI, dan KMB. Kolom `COST` di sheet `CUTI` berisi teks bebas `"KTA"` sebagai penanggung biaya, tetapi itu bukan struktur — tidak bisa difilter, direkap, atau dibagi biaya per entitas. Semua penomoran surat juga hardcode `KTA`:

- `059/KTA/SPK/IV/2026`
- `001/KTA/HRGA-TRA/PL/VIII/2026`

#### Temuan 7 — POH sudah ada tapi tidak dipakai

Kolom M `Database Karyawan` berisi **Point of Hire**: Semarang, Berau, Yogyakarta, Palembang, Surabaya, Banjar Baru, Lahat, Jambi. Ini adalah penentu tujuan tiket, tetapi tidak terhubung sama sekali ke sheet `CUTI` maupun `SJ`. PIC harus mengingat sendiri siapa pulang ke mana.

### 2.4 Kesimpulan analisis

File Excel ini **konsepnya benar, implementasinya sudah tidak bisa diselamatkan**. Memperbaikinya berarti membetulkan 6 kelas bug lintas 10 sheet dengan referensi eksternal yang sumbernya sudah hilang — lalu masalah yang sama akan muncul lagi begitu file di-copy, dikirim WhatsApp, atau dibuka di Google Sheets.

Rekomendasi: **bangun ulang sebagai aplikasi**, dan pakai file ini sebagai spesifikasi logika bisnis serta sumber data awal.

---

## 3. Tujuan Produk

### 3.1 Tujuan (In Scope)

| No | Tujuan | Ukuran keberhasilan |
|---|---|---|
| T1 | PIC bisa tahu siapa berangkat & siapa datang hari ini dalam ≤ 10 detik | Layar "Hari Ini" jadi halaman pembuka |
| T2 | Satu aplikasi melayani KTA, KAI, KMB | Filter perusahaan di semua layar; penomoran surat mengikuti entitas |
| T3 | Manifest & surat jalan dibuat otomatis tanpa ketik ulang | Nol pengetikan manual nama/HP/tujuan |
| T4 | Peringatan datang lebih awal, bukan mendadak | Notifikasi H-14, H-7, H-3, H-1, dan hari-H |
| T5 | Bisa dibuka dari HP di area site | Terpasang sebagai app; daftar hari ini tetap terbaca saat sinyal buruk |
| T6 | Status roster terhitung sendiri dan tidak bisa rusak seperti Excel | Status adalah hasil turunan dari tanggal, bukan input manual |
| T7 | Biaya travel & tiket terekam per perusahaan | Rekap biaya per entitas dapat diekspor per bulan |

### 3.2 Non-Tujuan (Out of Scope)

Ditegaskan agar tidak melebar saat pembangunan:

- **Tidak ada alur approval berjenjang.** Tidak ada kolom Status Atasan, Status HRGA, Approval Akhir. Diputuskan pemilik produk.
- Tidak menghitung payroll, lembur, atau absensi harian.
- Tidak melakukan pemesanan tiket otomatis ke maskapai/KAI. PIC tetap membeli manual; aplikasi hanya mencatat.
- Tidak melacak posisi kendaraan secara langsung (GPS tracking).
- Tidak menggantikan sistem HRIS induk bila nanti ada.
- Tidak ada aplikasi terpisah untuk karyawan pada tahap MVP. Karyawan menerima informasi lewat notifikasi.

---

## 4. Pengguna & Hak Akses

Model hak akses sengaja dibuat sangat sederhana — hanya 3 peran.

| Peran | Jumlah | Yang bisa dilakukan | Yang tidak bisa |
|---|---|---|---|
| **Admin PIC** (peran utama) | 1 orang | Semua: kelola karyawan, catat keberangkatan & kedatangan, input tiket & travel, cetak manifest/SPK/surat jalan, atur notifikasi, ekspor biaya | — |
| **Viewer** | 3–10 orang (Spt HRGA, PM, kepala departemen) | Lihat papan Hari Ini, lihat daftar roster, lihat rekap, ekspor PDF | Tidak bisa mengubah data apa pun |
| **Backup Admin** | 1 orang | Sama dengan Admin PIC | — |

**Catatan penting:** Backup Admin bukan tambahan opsional. Model satu PIC tanpa approval berarti bila PIC cuti, sakit, atau resign, tidak ada seorang pun yang bisa menerbitkan surat jalan. Satu akun cadangan yang jarang dipakai jauh lebih murah daripada berhentinya rotasi karyawan. Detail risiko ini dibahas di Bagian 14.

---

## 5. Konsep & Aturan Bisnis

### 5.1 Siklus roster

Setiap karyawan menjalani siklus berulang:

```
Masuk Site ──► Bekerja (sesuai grade) ──► Berangkat Cuti ──► Libur 14 hari ──► Masuk Site lagi
```

**Rumus turunan:**

| Nilai | Rumus | Contoh (Grade 4, masuk 7 Agu 2026) |
|---|---|---|
| Hari Kerja Roster | dari `master_roster` sesuai grade + perusahaan | 56 |
| Cuti Lapangan Dasar | dari `master_roster` | 14 |
| Target Keluar | Tanggal Masuk Site + Hari Kerja − 1 | 1 Okt 2026 |
| Hari Kerja Berjalan | HariIni − Tanggal Masuk Site + 1 | 28 (per 3 Sep 2026) |
| Sisa Hari Kerja | Hari Kerja Roster − Hari Kerja Berjalan | 28 |
| Total Hari Cuti | Cuti Lapangan + Tambahan Cuti Tahunan + Kompensasi Remote | 14–17 hari |
| Target Kembali | Tanggal Aktual Keluar + Total Hari Cuti | Aktual Keluar + 14…17 |

### 5.1a Durasi cuti bersifat variabel

**Cuti tidak selalu 14 hari.** Ini aturan bisnis yang wajib diikuti sejak MVP, bukan penyempurnaan yang bisa ditunda.

| Komponen | Sumber | Default | Diatur di |
|---|---|---|---|
| Cuti lapangan dasar | Grade karyawan | 14 hari | Master Roster |
| Tambahan cuti tahunan | Diisi saat keberangkatan | 0 hari | Batas maksimalnya di Pengaturan |
| Kompensasi remote area | Kebijakan perusahaan | 1 hari | Pengaturan |
| Hari perjalanan | Kebijakan perusahaan | 0 hari | Pengaturan |

**Tiga komponen terakhir tidak dikeraskan di kode.** Ketiganya diubah lewat menu Pengaturan per perusahaan, tanpa perlu deploy ulang. Ini menjawab pertanyaan yang belum final — apakah hari perjalanan dihitung 0, 1, atau 2 hari, dan apakah batas tambahan cuti tahunan 1, 2, atau 3 hari. Jawabannya tidak perlu ditunggu sebelum membangun; cukup diisi perkiraan yang berlaku sekarang lalu disesuaikan kapan saja.

Nilai ditentukan saat mencatat keberangkatan, bukan saat siklus dibuat — karyawan baru memutuskan menjelang berangkat. Nilai yang terpakai disalin ke siklus tersebut, sehingga perubahan kebijakan di kemudian hari tidak menggeser tanggal kembali siklus yang sedang berjalan.

**Saldo cuti tahunan direset per tanggal masuk kerja karyawan, bukan per 1 Januari.** Karyawan yang masuk 8 Desember 2025 menjalani periode 8 Des 2025 – 7 Des 2026. Ini konsekuensi langsung dari tambahan cuti tahunan yang memotong saldo, dan salah satu hal yang paling mudah dibuat keliru bila tidak dinyatakan eksplisit.

**Kenapa ini tidak boleh ditunda ke fase berikutnya.** `Target Kembali` adalah nilai turunan paling penting di seluruh sistem; dari situ lahir tanggal jemput, jadwal travel, dan notifikasi kepulangan. Bila durasi dikunci 14 hari:

- Karyawan yang mengambil 17 hari muncul sebagai `BELUM_KEMBALI` selama 3 hari padahal jadwalnya normal.
- PIC menerima notifikasi jemput 3 hari terlalu cepat dan memesan travel di tanggal yang salah.
- Aplikasi tidak menampilkan error apa pun. Hanya jawabannya yang salah — kegagalan senyap yang sama seperti pada file Excel lama.

Menambahkannya sekarang berarti 3 kolom basis data dan 2 kotak input pada satu form. Menambahkannya setelah aplikasi berisi data berarti mengubah kolom terhitung yang sudah terpakai dan mengoreksi seluruh riwayat siklus.

**Konsekuensi lanjutan:** karena tambahan cuti tahunan memotong saldo, perhitungan sisa cuti tahunan ikut naik menjadi P0. Tanpa itu, batas maksimal tidak bisa divalidasi terhadap apa pun. Pengelolaan pengajuan cuti tahunan secara penuh (F11) tetap P1 — yang masuk MVP hanya perhitungan saldonya.

### 5.2 Definisi status — enam status, saling eksklusif

Status **tidak pernah diinput manual**. Status dihitung dari tanggal dan siklus aktif. Ini perbaikan langsung atas Temuan 1 dan 2.

| Status | Kondisi | Warna | Tindakan yang diminta ke PIC |
|---|---|---|---|
| `NORMAL` | Di site, sisa hari kerja > 7 | Abu-abu | Tidak ada |
| `SEGERA CUTI` | Di site, sisa hari kerja ≤ 7 dan ≥ 0 | Kuning | Beli tiket, jadwalkan travel |
| `OVERDUE` | Di site, hari kerja berjalan > hari kerja roster | Merah | Segera jadwalkan keberangkatan |
| `SEDANG CUTI` | Sudah keluar site, HariIni ≤ Target Kembali | Biru | Siapkan jemputan menjelang tanggal kembali |
| `BELUM KEMBALI` | Sudah keluar site, HariIni > Target Kembali | Merah tua | Follow up kepulangan |
| `NON-AKTIF` | Status karyawan bukan Aktif | Pudar | Dikecualikan dari semua hitungan |

**Aturan anti-bug:** sistem menentukan seseorang sedang cuti dari **keberadaan record perjalanan berstatus aktif**, bukan dari kosong/tidaknya sebuah kolom tanggal. Sel kosong yang berisi nol tidak lagi bisa merusak status siapa pun.

### 5.3 Perjalanan (Trip)

Setiap perpindahan karyawan adalah satu record `perjalanan` dengan **arah** yang jelas:

| Arah | Rute | Dokumen yang dibutuhkan |
|---|---|---|
| `KELUAR` (berangkat cuti) | Site → Pool Shelter → Bandara/Stasiun → POH | Manifest Awal Cuti, Surat Jalan, Tiket |
| `MASUK` (kembali cuti) | POH → Bandara/Stasiun → Pool Shelter → Site | Manifest Akhir Cuti, Surat Jalan, Tiket |

**Moda transportasi** yang dicatat: Pesawat, Kereta Api, Travel Darat, Kendaraan Perusahaan.

**Titik simpul yang terbaca di file** (perlu dilengkapi PIC saat setup):

- Bandara Silampari (Lubuklinggau)
- Stasiun Lubuklinggau
- Pool Shelter: Bintel

### 5.4 Aturan pengelompokan manifest

Ini yang menghasilkan penghematan carter. Sistem otomatis menggabungkan penumpang ke dalam satu manifest bila **ketiga hal** ini sama:

1. Tanggal travel
2. Arah (KELUAR atau MASUK)
3. Pool shelter / titik jemput-antar

Satu manifest bisa memuat penumpang lintas perusahaan (KTA + KAI dalam satu mobil), dengan **kolom penanggung biaya per penumpang** sehingga rekap biaya tetap terpisah per entitas.

### 5.5 Aturan biaya

Diambil dari logika sheet `SJ` yang sudah ada:

| Komponen | Aturan |
|---|---|
| Harga Carter | Biaya travel per trip, dibagi rata ke jumlah penumpang atau dibebankan ke satu entitas — **perlu konfirmasi, lihat Bagian 15** |
| Harga Tiket | Harga aktual tiket pesawat/kereta per orang |
| Plafon Tiket | Batas maksimum per POH, ditetapkan HRGA |
| Over Plafon | `IF(tujuan = "JAKARTA", 0, IF(harga_tiket > plafon, harga_tiket − plafon, 0))` |
| Penanggung Biaya | KTA / KAI / KMB, wajib diisi per penumpang |

Pengecualian Jakarta pada rumus asli dipertahankan apa adanya sampai dikonfirmasi (Bagian 15).

---

## 6. Ruang Lingkup Fitur

### P0 — Wajib ada di MVP

---

#### F1. Papan "Hari Ini"

**User story:** Sebagai PIC travel, saya ingin membuka aplikasi dan langsung melihat siapa yang berangkat dan siapa yang datang hari ini, supaya saya bisa memastikan kendaraan sudah siap.

Halaman pembuka aplikasi. Tiga kartu besar, tanpa perlu klik apa pun.

**Kartu 1 — Berangkat Hari Ini (Antar)**
Nama · Perusahaan · Departemen · Jam jemput dari pool shelter · Tujuan (bandara/stasiun) · Jam terbang/berangkat · POH · No. HP (tap untuk telepon/WhatsApp) · Driver & no. polisi

**Kartu 2 — Datang Hari Ini (Jemput)**
Nama · Perusahaan · Jam tiba · Titik jemput · Tujuan pool shelter · No. HP · Driver & no. polisi

**Kartu 3 — Perlu Tindakan**
Daftar `OVERDUE` dan `BELUM KEMBALI` — orang yang jadwalnya sudah lewat.

Di bawahnya, baris ringkasan angka: Total Aktif · Normal · Segera Cuti · Overdue · Sedang Cuti · Belum Kembali. Setiap angka bisa diklik untuk melihat daftar orangnya.

**Kriteria penerimaan:**
- Halaman terbuka dalam < 3 detik pada koneksi 3G.
- Angka status di papan ini identik dengan hasil hitung ulang manual dari tabel karyawan.
- Tombol geser tanggal: kemarin / hari ini / besok / +7 hari.
- Tanpa filter apa pun, papan menampilkan gabungan KTA + KAI + KMB.

---

#### F2. Daftar Roster & Detail Karyawan

**User story:** Sebagai PIC, saya ingin melihat semua karyawan beserta status rosternya dan mencari orang dengan cepat.

Tabel/kartu berisi: NIK · Nama · Perusahaan · Departemen · Jabatan · Grade · Tanggal Masuk Site · Target Keluar · Sisa Hari · Status · POH.

**Filter:** perusahaan, departemen, grade, status. **Urutkan:** sisa hari kerja (menaik) sebagai default — yang paling mendesak di atas.
**Pencarian:** nama atau NIK, cocok sebagian.

Halaman detail per karyawan menampilkan: data pribadi, riwayat siklus roster, riwayat perjalanan, dokumen terkait, dan sisa cuti tahunan.

**Kriteria penerimaan:**
- Pencarian memberi hasil < 1 detik untuk 500 karyawan.
- Status di daftar selalu sama dengan status di papan Hari Ini (satu sumber perhitungan).

---

#### F3. Catat Keberangkatan & Kedatangan

**User story:** Sebagai PIC, saya ingin mencatat bahwa seseorang benar-benar sudah berangkat atau sudah kembali, dengan tiga ketukan.

**Alur Berangkat Cuti:**
1. Pilih karyawan (atau pilih dari daftar `SEGERA CUTI` / `OVERDUE`)
2. Isi: tanggal keluar site, pool shelter, jam jemput, tujuan (bandara/stasiun), moda, jam berangkat, penanggung biaya
3. Opsional: nomor tiket, harga tiket, maskapai/KA
4. Simpan → status berubah `SEDANG CUTI`, Target Kembali otomatis dihitung (tanggal keluar + hari libur grade)

**Alur Kembali Cuti:**
1. Pilih dari daftar `SEDANG CUTI` yang mendekati Target Kembali
2. Isi: tanggal tiba, titik jemput, jam tiba, pool shelter tujuan, moda
3. Simpan → status berubah `NORMAL`, siklus roster baru dimulai otomatis dengan Tanggal Masuk Site = tanggal tiba

**Kriteria penerimaan:**
- Menyimpan tidak lebih dari 3 layar.
- Data karyawan (nama, jabatan, No. HP, POH) terisi otomatis dari master — tidak diketik ulang.
- Perubahan status langsung tercermin di papan Hari Ini tanpa refresh manual.
- Semua perubahan tercatat di log audit: siapa, kapan, dari nilai apa ke nilai apa.

---

#### F4. Generator Manifest & Surat Perintah Kerja

**User story:** Sebagai PIC, saya ingin mencetak manifest penumpang dan SPK travel dalam bentuk PDF siap tanda tangan, tanpa mengetik ulang satu pun nama.

Pilih tanggal + arah + pool shelter → sistem menampilkan daftar penumpang → cetak PDF.

**Isi Manifest** (mengikuti format `Passenger List` yang sudah ada):
- Kop dan nomor SPK
- Nama travel, nama driver, nomor telepon driver
- Tanggal, hari keberangkatan, pool shelter
- Jumlah penumpang
- Tabel: No · Nama · Perusahaan · No. HP · Antar ke / Jemput dari · Jam · Cost By · Remark
- Blok tanda tangan: Dibuat Oleh / Diperiksa Oleh / Diketahui Oleh
- Catatan kaki: larangan driver mengantar ke tujuan lain tanpa izin Dept. HRGA

**Kriteria penerimaan — ini perbaikan langsung Temuan 5:**
- Setiap baris penumpang menampilkan No. HP, tujuan, dan jam **miliknya sendiri**. Diuji dengan minimal 5 penumpang berbeda tujuan dalam satu manifest.
- Nol pengetikan manual. Semua kolom terisi dari basis data.
- PDF bisa dibagikan langsung ke WhatsApp driver.

---

#### F5. Surat Jalan Driver

Dokumen terpisah untuk driver, menggantikan sheet `SJ` yang rusak (Temuan 4).

**Isi:** Nomor surat jalan · Tanggal · Nama & No. HP driver · No. Polisi · Rute (Dari → Tujuan) · Jam berangkat & jam kedatangan · Daftar penumpang · Harga carter · Harga tiket · Over plafon · Blok tanda tangan.

**Kriteria penerimaan:**
- Nama, jabatan, dan No. HP penumpang terisi otomatis — tidak ada `#REF!` dalam bentuk apa pun.
- Nomor surat jalan tergenerate otomatis, unik, tidak pernah bentrok.

---

#### F6. Notifikasi Terjadwal

Karena tidak ada approval, **notifikasi adalah satu-satunya mekanisme penggerak proses**. Bagian ini karena itu tidak boleh dianggap fitur pelengkap.

Rincian lengkap ada di Bagian 9.

**Kriteria penerimaan:**
- Notifikasi terkirim otomatis pada jadwalnya tanpa ada yang membuka aplikasi.
- Setiap pengiriman tercatat: kepada siapa, kapan, isi apa, berhasil atau gagal.
- Notifikasi gagal dicoba ulang, dan kegagalan berulang muncul sebagai peringatan di papan Hari Ini.

---

#### F7. Manajemen Data Master

Kelola: Karyawan · Perusahaan · Master Roster per grade · Pool Shelter · Vendor Travel & Driver · Plafon Tiket per POH · **Kebijakan Cuti** (hari perjalanan, batas tambahan cuti tahunan, kompensasi remote area — per perusahaan).

**Kriteria penerimaan:**
- Impor karyawan dari Excel/CSV, dengan pratinjau dan laporan baris yang gagal beserta alasannya.
- NIK unik lintas perusahaan; duplikat ditolak dengan pesan jelas.
- Nomor HP disimpan format lokal `08xxxxxxxxxx`. Sel kosong dibiarkan kosong, tanpa karakter pengganti seperti `-` atau `N/A`.

---

### P1 — Setelah MVP berjalan stabil

---

#### F8. Perencana Tiket (D+30)

Daftar semua karyawan yang akan mencapai Target Keluar dalam 30 hari ke depan, dikelompokkan per minggu dan per POH. Ini alat kerja untuk memborong tiket sekaligus.

Kolom: Nama · Perusahaan · POH · Target Keluar · Status Tiket (Belum Dibeli / Sudah Dibeli / Perlu Reschedule) · Harga · Kode Booking.

Nilai konkret: rute Silampari sangat sensitif terhadap waktu pembelian. Melihat 30 hari ke depan sekaligus adalah cara langsung menekan biaya tiket.

---

#### F9. Rekap & Ekspor

- Rekap status per grade dan per departemen (menggantikan sheet `Rekap`)
- Rekap biaya travel & tiket per perusahaan per bulan
- Rekap ketepatan roster: rata-rata hari keterlambatan berangkat dan pulang
- Ekspor Excel dan PDF

---

#### F10. Kalender Roster

Tampilan kalender bulanan: keberangkatan (panah keluar) dan kedatangan (panah masuk) per hari, diberi warna per perusahaan. Berguna untuk melihat penumpukan — hari di mana 8 orang berangkat bersamaan butuh 2 kendaraan, bukan 1.

---

#### F11. Cuti Tahunan (Disederhanakan)

Menggantikan `Form Pengajuan Cuti Tahunan` dan `Saldo Cuti Tahunan`, **tanpa tiga kolom approval**.

Catat: NIK, jenis cuti, tanggal mulai, tanggal selesai, jumlah hari, alasan. Sistem menghitung: Hak Cuti − Terpakai = Sisa.

Peringatan bila pengajuan melebihi sisa saldo — sebagai informasi, bukan penghalang.

---

### P2 — Pengembangan lanjutan

- **F12.** Portal karyawan hanya-baca (lihat jadwal & sisa cuti sendiri lewat tautan pribadi)
- **F13.** Optimasi carter: usulan penggabungan trip berdasarkan tanggal & kapasitas kendaraan
- **F14.** Unggah bukti (foto tiket, boarding pass, kuitansi travel)
- **F15.** Prakiraan kebutuhan manpower: berapa orang per departemen yang kosong pada minggu tertentu

---

## 7. Rancangan Layar

### 7.1 Struktur navigasi

```
┌─ Hari Ini            ← halaman pembuka
├─ Roster              ← daftar semua karyawan + status
├─ Perjalanan          ← catat berangkat / kembali, riwayat trip
├─ Dokumen             ← manifest, SPK, surat jalan
├─ Rekap               ← angka per grade, departemen, perusahaan, biaya
└─ Pengaturan          ← data master, notifikasi, pengguna
```

Navigasi bawah (bottom tab) untuk HP; sidebar untuk desktop.

### 7.2 Sketsa layar "Hari Ini"

```
╔══════════════════════════════════════════════════╗
║  ROSTA          Kamis, 3 September 2026     [⚙]  ║
║  [ Semua ] [ KTA ] [ KAI ] [ KMB ]               ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  ✈  BERANGKAT HARI INI                       3   ║
║  ┌────────────────────────────────────────────┐  ║
║  │ Diego Caesar Nasution          [KTA]       │  ║
║  │ Supervisor Produksi · Grade 4              │  ║
║  │ 10:00  Bintel → Stasiun Lubuklinggau       │  ║
║  │ POH Palembang · Kereta Api                 │  ║
║  │ Driver: Abdul Latif · BG 1234 XY           │  ║
║  │                            [ 📞 ] [ Detail ]│  ║
║  └────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────┐  ║
║  │ Immanuel                       [KTA]       │  ║
║  │ Spt. HRGA & Finance · Grade 5              │  ║
║  │ 10:00  Bintel → Bandara Silampari          │  ║
║  │ POH Yogyakarta · Pesawat                   │  ║
║  └────────────────────────────────────────────┘  ║
║                                                  ║
║  🏠 DATANG HARI INI                          2   ║
║  ┌────────────────────────────────────────────┐  ║
║  │ Doly Anugrah Siregar           [KAI]       │  ║
║  │ 16:00  Bandara Silampari → Bintel          │  ║
║  └────────────────────────────────────────────┘  ║
║                                                  ║
║  ⚠  PERLU TINDAKAN                           4   ║
║  ┌────────────────────────────────────────────┐  ║
║  │ 🔴 Kausa Satrio W.  OVERDUE  12 hari       │  ║
║  │ 🔴 Adityo Purwo K.  BELUM KEMBALI  5 hari  │  ║
║  │                              [ Lihat semua ]│  ║
║  └────────────────────────────────────────────┘  ║
║                                                  ║
║  ── Ringkasan ─────────────────────────────────  ║
║  Aktif 40 │ Normal 24 │ Segera 6 │ Overdue 2     ║
║  Sedang Cuti 6 │ Belum Kembali 2                 ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

Angka pada sketsa adalah ilustrasi tampilan, bukan data aktual.

---

## 8. Model Data

### 8.1 Diagram relasi

```
perusahaan ──┬──< karyawan ──┬──< siklus_roster ──< perjalanan ──┬──< manifest_penumpang
             │               │                                   │
             └──< master_roster                                   └──> surat_jalan
                             └──< cuti_tahunan
pool_shelter ──< perjalanan
vendor_travel ──< driver ──< surat_jalan
```

### 8.2 Definisi tabel

**`perusahaan`**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | PK | |
| kode | text | KTA / KAI / KMB |
| nama_lengkap | text | PT Karunia Tirta Agung, dst. |
| prefix_surat | text | untuk penomoran dokumen |
| aktif | boolean | |

**`karyawan`**

| Kolom | Tipe | Keterangan |
|---|---|---|
| nik | PK, text | Unik lintas perusahaan |
| perusahaan_id | FK | **kolom baru — memperbaiki Temuan 6** |
| nama | text | |
| jabatan | text | |
| departemen | text | |
| grade | text | Grade 1-2 … Grade 6 Up |
| tanggal_mulai_kerja | date | |
| poh | text | Point of Hire — kota tujuan tiket |
| no_hp | text | Format `08xxxxxxxxxx` |
| atasan | text | Untuk tujuan notifikasi, bukan approval |
| hak_cuti_tahunan | integer | Default 12 |
| status_karyawan | enum | Aktif / Non-Aktif |

**`master_roster`**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | PK | |
| perusahaan_id | FK | Memungkinkan siklus berbeda antar entitas |
| grade | text | |
| hari_kerja | integer | |
| hari_libur | integer | |

**`siklus_roster`**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | PK | |
| nik | FK | |
| tanggal_masuk_site | date | |
| hari_kerja_snapshot | integer | Disalin saat siklus dibuat, agar perubahan master tidak mengubah sejarah |
| hari_libur_snapshot | integer | |
| target_keluar | date | Terhitung |
| tanggal_aktual_keluar | date, nullable | |
| target_kembali | date, nullable | Terhitung |
| tanggal_aktual_kembali | date, nullable | |
| status | enum | Berjalan / Selesai |

Status roster (NORMAL, SEGERA CUTI, dst.) **tidak disimpan sebagai kolom.** Status dihitung saat dibaca dari siklus aktif. Ini yang membuat Temuan 1 tidak bisa terulang.

**`perjalanan`**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | PK | |
| siklus_id | FK | |
| nik | FK | |
| arah | enum | KELUAR / MASUK |
| tanggal_travel | date | |
| pool_shelter_id | FK | |
| jam_jemput | time | |
| titik_tujuan | text | Bandara Silampari / Stasiun Lubuklinggau / lainnya |
| moda | enum | Pesawat / Kereta / Travel Darat / Kendaraan Perusahaan |
| jam_berangkat | time | |
| jam_tiba | time, nullable | |
| kode_booking | text, nullable | |
| harga_tiket | decimal, nullable | |
| plafon | decimal, nullable | |
| over_plafon | decimal | Terhitung |
| penanggung_biaya | FK perusahaan | Bisa berbeda dari perusahaan karyawan |
| catatan | text | |

**`surat_jalan`**

| Kolom | Tipe |
|---|---|
| id | PK |
| nomor_surat | text, unik |
| tanggal | date |
| vendor_travel_id | FK |
| driver_id | FK |
| no_polisi | text |
| rute_dari | text |
| rute_tujuan | text |
| harga_carter | decimal |
| perusahaan_penerbit | FK |

**`manifest_penumpang`** — tabel penghubung `surat_jalan` ⇄ `perjalanan` (satu surat jalan memuat banyak penumpang).

**`notifikasi_log`**

| Kolom | Tipe |
|---|---|
| id | PK |
| jenis | enum |
| penerima | text |
| kanal | enum (WhatsApp / Email) |
| isi_pesan | text |
| waktu_kirim | timestamp |
| status | enum (Terkirim / Gagal / Dicoba Ulang) |

**`audit_log`** — mencatat setiap perubahan data: `pengguna`, `tabel`, `record_id`, `nilai_lama`, `nilai_baru`, `waktu`.

Karena tidak ada approval, audit log **menjadi satu-satunya pengendali internal**. Ini bukan fitur tambahan.

---

## 9. Notifikasi

### 9.1 Jadwal notifikasi

| Kode | Pemicu | Penerima | Isi |
|---|---|---|---|
| N1 | H-14 sebelum Target Keluar | Admin PIC | Daftar karyawan yang perlu dibelikan tiket, dikelompokkan per POH |
| N2 | H-7 sebelum Target Keluar | Admin PIC + Atasan karyawan | Karyawan akan cuti; siapkan pengganti |
| N3 | H-3 sebelum tanggal travel | Admin PIC + Karyawan | Konfirmasi jadwal & jam jemput |
| N4 | H-1 sebelum tanggal travel | Admin PIC + Karyawan + Driver | Manifest final, jam jemput, titik kumpul |
| N5 | Hari-H, pukul 06.00 | Admin PIC | Ringkasan hari ini: siapa diantar, siapa dijemput |
| N6 | H-3 sebelum Target Kembali | Admin PIC + Karyawan | Konfirmasi jadwal kepulangan ke site |
| N7 | Setiap hari saat status `OVERDUE` | Admin PIC + Atasan | Karyawan melewati batas hari kerja |
| N8 | Setiap hari saat status `BELUM KEMBALI` | Admin PIC + Atasan + Spt HRGA | Karyawan belum kembali ke site |
| N9 | Mingguan, Senin pukul 07.00 | Admin PIC + Viewer | Ringkasan roster minggu ini |

### 9.2 Kanal

**Utama: WhatsApp.** Alasannya praktis — di area site, WhatsApp adalah kanal yang benar-benar dibaca. Email sering tidak dibuka berhari-hari.

Opsi implementasi WhatsApp, dari yang paling murah:
1. **Deep link manual** — sistem menyiapkan pesan siap kirim, PIC menekan tombol untuk mengirim. Gratis, tetapi perlu satu ketukan manusia.
2. **WhatsApp Business API resmi** — otomatis penuh, berbayar per percakapan, butuh verifikasi bisnis Meta.
3. **Gateway pihak ketiga** — lebih murah dari API resmi, tetapi berisiko akun diblokir dan datanya melewati pihak ketiga.

**Rekomendasi:** mulai dari opsi 1 untuk MVP, karena volume pesan kecil (± 40 karyawan) dan risikonya nol. Naik ke opsi 2 bila volume bertambah atau cakupan meluas ke KAI/KMB dengan jumlah karyawan besar.

**Kanal cadangan: Email**, otomatis penuh sejak MVP, gratis.

### 9.3 Format pesan

Contoh N4 (H-1 ke karyawan):

```
Yth. Bapak Diego Caesar Nasution

Jadwal keberangkatan cuti Anda:
Tanggal    : Jumat, 4 September 2026
Jam jemput : 10.00 WIB
Titik jemput : Pool Shelter Bintel
Tujuan     : Stasiun Lubuklinggau
Driver     : Abdul Latif (082177450720)

Mohon siap 15 menit sebelum jam jemput.

HRGA PT Karunia Tirta Agung
```

---

## 10. Penomoran Dokumen

Penomoran otomatis, unik, dan mengikuti entitas penerbit — memperbaiki Temuan 6.

| Dokumen | Format | Contoh |
|---|---|---|
| SPK Travel | `{urut}/{PERUSAHAAN}/SPK/{ROMAWI}/{TAHUN}` | `060/KTA/SPK/IX/2026` |
| Surat Jalan | `{urut}/{PERUSAHAAN}/HRGA-TRA/PL/{ROMAWI}/{TAHUN}` | `002/KAI/HRGA-TRA/PL/IX/2026` |

Nomor urut berjalan terpisah per perusahaan per tahun. Sistem menolak penerbitan nomor ganda.

---

## 11. Arsitektur & Opsi Teknologi

### 11.1 Kebutuhan yang menentukan pilihan

1. Bisa dipasang di HP sebagai aplikasi (permintaan eksplisit)
2. Pengguna sangat sedikit (1 admin + 1 backup + beberapa viewer)
3. Data kecil (< 500 karyawan, < 10.000 perjalanan per tahun)
4. Sinyal di site tidak selalu bagus
5. Biaya operasional harus minimal

### 11.2 Perbandingan opsi

| Kriteria | A. Google Apps Script | B. AppSheet | C. Next.js + Supabase |
|---|---|---|---|
| Waktu bangun MVP | 2–3 minggu | 1–2 minggu | 5–7 minggu |
| Biaya bulanan | Rp 0 | ± USD 5–10/pengguna | Rp 0–300 ribu |
| **Bisa dipasang jadi app** | **Tidak andal** | **Ya, native** | **Ya, PWA penuh** |
| Bekerja saat sinyal buruk | Buruk | Cukup baik | Baik |
| Kualitas cetak PDF | Cukup | Terbatas | Sangat baik |
| Kendali penuh atas tampilan | Terbatas | Sangat terbatas | Penuh |
| Kemudahan pindah/ekspor data | Mudah (Sheets) | Sedang | Mudah (PostgreSQL) |

### 11.3 Catatan jujur soal Google Apps Script

Anda sudah punya pengalaman membangun aplikasi reimbursement dengan Apps Script, sehingga wajar bila opsi itu terasa paling aman. Tetapi ada satu batasan teknis yang perlu diketahui sebelum memilih:

**Apps Script Web App tidak bisa dijadikan aplikasi terpasang yang sesungguhnya.** HTML Service menyajikan halaman di dalam iframe tersandbox pada domain `googleusercontent.com`, sehingga service worker dan web app manifest tidak berfungsi. Hasilnya hanya pintasan browser, bukan aplikasi yang bisa dibuka saat sinyal hilang.

Bila "bisa dipasang jadi app" adalah syarat mutlak, Apps Script gugur pada syarat itu. Bila yang dimaksud cukup "bisa dibuka dari HP lewat tautan", Apps Script tetap pilihan tercepat dan termurah.

### 11.4 Rekomendasi

**Opsi C — Next.js + Supabase**, dengan alasan:

- Memenuhi syarat aplikasi terpasang secara penuh (PWA dengan service worker).
- Daftar "Hari Ini" tetap terbaca saat sinyal hilang di area pit — ini justru kondisi paling sering saat PIC butuh data.
- PostgreSQL memberi jaminan integritas data yang tidak dimiliki Sheets: NIK ganda dan status tidak konsisten ditolak di tingkat basis data, bukan di tingkat rumus.
- Supabase tier gratis lebih dari cukup untuk skala ini. Hosting Vercel gratis untuk penggunaan internal.
- Pembuatan PDF berkualitas cetak jauh lebih baik daripada dua opsi lain.

**Alternatif bila waktu lebih mendesak daripada kualitas:** AppSheet. MVP bisa jalan dalam 1–2 minggu di atas data Google Sheets yang sudah ada, dengan aplikasi mobile asli. Kelemahannya biaya per pengguna dan tampilan yang kaku — tetapi dengan hanya 5–10 pengguna, biayanya masih di bawah Rp 1 juta per bulan.

### 11.5 Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Waktu muat halaman utama | < 3 detik pada 3G |
| Ketersediaan | 99% jam kerja |
| Cadangan data | Otomatis harian, disimpan 30 hari |
| Autentikasi | Email + kata sandi, sesi 30 hari |
| Log audit | Semua perubahan data tercatat permanen |
| Kapasitas | 500 karyawan, 10.000 perjalanan/tahun tanpa penurunan performa |
| Bahasa | Indonesia sepenuhnya |
| Zona waktu | WIB (UTC+7) tetap |

---

## 12. Pengisian Data Awal

> **Keputusan pemilik produk:** data karyawan **tidak diimpor dari Excel**. Data yang ada baru mencakup satu perusahaan dan itu pun belum lengkap. Karyawan diinput lewat menu aplikasi setelah MVP jalan.

### 12.0 Konsekuensi terhadap desain

Keputusan ini mengubah dua hal:

1. **Aplikasi harus bisa dipakai dari basis data kosong.** Tidak boleh error, dan harus menampilkan ajakan menambah karyawan alih-alih layar kosong.
2. **Menu input karyawan naik prioritas.** Sebelumnya ditempatkan di akhir urutan pembangunan; sekarang harus selesai sebelum papan Hari Ini dibangun, karena tanpa data tidak ada yang bisa ditampilkan atau diuji.

**Aturan input yang tidak boleh dilewat:** setiap karyawan wajib disertai **tanggal masuk site terakhir**. Dari situ sistem membentuk siklus roster pertamanya. Karyawan tanpa tanggal ini tidak akan muncul di papan Hari Ini.

Impor CSV massal tetap dibangun, tetapi sebagai fitur akhir untuk penambahan karyawan dalam jumlah besar — bukan sebagai jalur migrasi.

Bagian 12.1–12.4 di bawah dipertahankan sebagai rujukan bila suatu saat impor massal dari Excel benar-benar dilakukan.

### 12.1 Yang dipindahkan

| Sumber | Tujuan | Jumlah | Catatan |
|---|---|---|---|
| `Database Karyawan` A2:M41 | `karyawan` | 40 baris | Perlu tambah kolom perusahaan secara manual |
| `Master Roster` A3:D7 | `master_roster` | 5 baris | Digandakan untuk 3 perusahaan bila aturannya sama |
| `CUTI` C3:R… | `perjalanan` | Data historis | Opsional; hanya bila diperlukan untuk rekap biaya |

### 12.2 Yang tidak dipindahkan

- Seluruh sheet `Monitoring Roster` — nilainya rusak (Temuan 1 & 2), dan akan dihitung ulang oleh sistem
- Seluruh sheet `SJ` — rumusnya `#REF!` (Temuan 4)
- `Saldo Cuti Tahunan` — bergantung pada workbook eksternal yang hilang (Temuan 3)
- Kolom `Status Atasan`, `Status HRGA`, `Approval Akhir` — dihapus sesuai keputusan produk

### 12.3 Pembersihan wajib sebelum impor

1. **Isi kolom perusahaan** untuk 40 karyawan — KTA, KAI, atau KMB. Ini tidak bisa ditebak sistem.
2. **Perbaiki tanggal terakhir masuk site.** Ditemukan satu baris bernilai `18 April 2027` (Benny Sinambela) dan satu baris kosong (Henri Manurung).
3. **Ubah rumus jadi nilai.** Baris M. Darun Nafis berisi `=F13+56`, bukan tanggal.
4. **Bersihkan sel `00:00:00`** pada kolom Aktual Keluar. Harus benar-benar kosong.
5. **Seragamkan nomor HP** ke format `08xxxxxxxxxx` tanpa tanda hubung dan tanpa `+62`.
6. **Rapikan spasi jabatan.** Ditemukan ` Superintendent Produksi` dengan spasi di depan.
7. **Lengkapi POH** yang kosong.
8. **Konfirmasi status terkini** setiap karyawan: sedang di site atau sedang cuti, dan sejak kapan. Ini menentukan titik awal seluruh perhitungan siklus.

Langkah 8 adalah pekerjaan manual yang tidak bisa dihindari. Data status saat ini seluruhnya salah, jadi tidak ada yang bisa dipercaya sebagai titik mulai.

### 12.4 Verifikasi setelah impor

- Jumlah karyawan aktif per perusahaan cocok dengan hitungan manual HRGA.
- Total karyawan aktif = 40 (atau angka terbaru yang disepakati).
- Tidak ada NIK ganda.
- Tidak ada status `BELUM KEMBALI` selain yang memang benar-benar telat.
- Tidak ada angka hari di luar rentang 0–120.

---

## 13. Metrik Keberhasilan

| Metrik | Baseline sekarang | Target 3 bulan |
|---|---|---|
| Waktu menjawab "siapa cuti hari ini" | 10–30 menit (buka file, cek beberapa sheet) | < 30 detik |
| Kejadian karyawan telat dijemput/diantar | Tidak terukur | 0 per bulan |
| Rata-rata jarak pembelian tiket dari tanggal berangkat | Tidak terukur | ≥ 14 hari |
| Manifest dibuat manual | 100% | 0% |
| Akurasi status roster | 0% (40 dari 40 salah) | 100% |
| Karyawan `BELUM KEMBALI` yang tidak terpantau | Tidak terukur | 0 |
| Rekap biaya travel per perusahaan | Tidak ada | Tersedia bulanan |

---

## 14. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | **PIC tunggal adalah titik kegagalan tunggal.** Bila PIC cuti, sakit, atau resign, tidak ada yang bisa menerbitkan surat jalan | Tinggi | Wajibkan satu akun Backup Admin sejak hari pertama. Semua dokumen tersimpan di sistem, bukan di laptop PIC |
| R2 | **Tanpa approval, tidak ada pengendalian belanja.** Tidak ada seorang pun yang memverifikasi harga tiket atau carter sebelum uang keluar | Menengah | Log audit lengkap + laporan biaya bulanan otomatis ke Spt HRGA & Finance. Pengendalian bergeser dari *sebelum* ke *sesudah*, tetapi tetap ada |
| R3 | Data awal salah dimasukkan saat migrasi | Tinggi | Verifikasi wajib (Bagian 12.4) sebelum go-live. Jalankan paralel dengan Excel selama 2 minggu pertama |
| R4 | Sinyal di site putus saat PIC butuh data | Menengah | PWA menyimpan salinan daftar Hari Ini dan H+7 secara lokal |
| R5 | Notifikasi WhatsApp tidak terkirim tanpa disadari | Menengah | Log status pengiriman; kegagalan muncul sebagai peringatan merah di papan Hari Ini |
| R6 | Cakupan melebar saat pembangunan (permintaan approval, payroll, absensi) | Tinggi | Bagian 3.2 dipakai sebagai acuan penolakan. Perubahan lingkup lewat revisi PRD, bukan permintaan lisan |
| R7 | KAI dan KMB ternyata punya aturan roster berbeda | Menengah | `master_roster` sudah dirancang per perusahaan sejak awal |
| R8 | Aplikasi dipakai beberapa bulan lalu ditinggalkan karena input dianggap merepotkan | Tinggi | Batasi input P0 seminimal mungkin. Setiap tambahan field baru harus dibuktikan dulu manfaatnya |

---

## 15. Hal yang Perlu Dikonfirmasi

Poin-poin berikut belum bisa ditentukan dari file terlampir dan memerlukan keputusan sebelum pembangunan dimulai.

| # | Pertanyaan | Mengapa penting |
|---|---|---|
| 1 | Berapa jumlah karyawan KAI dan KMB? Apakah rosternya juga terpusat di site Muratara? | Menentukan skala dan apakah perlu multi-site |
| 2 | Apakah siklus roster per grade sama untuk ketiga perusahaan? | Menentukan apakah `master_roster` perlu terpisah per entitas |
| 3 | Harga carter dibagi rata ke penumpang, atau dibebankan ke satu perusahaan? | Menentukan rumus alokasi biaya |
| 4 | Berapa plafon tiket per POH? | Rumus over plafon tidak bisa jalan tanpa angka ini |
| 5 | Mengapa tujuan Jakarta dikecualikan dari perhitungan over plafon? Apakah aturan ini masih berlaku? | Aturan diambil dari sheet `SJ`; perlu dipastikan masih relevan |
| 6 | Daftar lengkap pool shelter — file hanya menyebut "Bintel" | Perlu untuk data master |
| 7 | Siapa Backup Admin? | Mitigasi R1 tidak bisa jalan tanpa nama |
| 8 | Apakah vendor travel selalu LATIF TRAVEL, atau ada beberapa vendor? | Menentukan apakah tabel vendor perlu multi-record |
| 9 | Siapa yang menandatangani SPK dan surat jalan pada setiap perusahaan? | Blok tanda tangan harus menyesuaikan entitas penerbit |
| 10 | Apakah tambahan cuti tahunan bisa diambil di tengah cuti berjalan, atau harus ditetapkan saat berangkat? | Menentukan apakah nilai bisa diubah setelah keberangkatan tercatat |

**Tidak lagi menghambat pembangunan.** Tiga pertanyaan berikut sebelumnya masuk daftar ini, dan kini terjawab lewat menu Pengaturan — nilainya bisa diisi perkiraan sekarang lalu diubah kapan saja:

- Hari perjalanan dihitung 0, 1, atau 2 hari
- Batas tambahan cuti tahunan 1, 2, atau 3 hari
- Besaran kompensasi remote area, dan apakah nilainya sama di ketiga perusahaan

Pendekatan yang sama berlaku untuk pertanyaan kebijakan lain yang muncul nanti: bila angkanya mungkin berubah, jadikan pengaturan, jangan tunda pembangunan menunggu kepastiannya.

---

## 16. Roadmap

### Fase 0 — Persiapan (1 minggu)

- Jawab 10 pertanyaan di Bagian 15
- Bersihkan dan lengkapi data karyawan sesuai Bagian 12.3
- Tentukan opsi teknologi
- Kunci lingkup MVP

### Fase 1 — MVP (3–5 minggu, tergantung pilihan teknologi)

F1 Papan Hari Ini · F2 Daftar Roster · F3 Catat Berangkat & Kembali · F4 Manifest & SPK · F5 Surat Jalan · F6 Notifikasi · F7 Data Master

**Definisi selesai:** PIC dapat menjalankan satu siklus penuh — dari melihat siapa akan cuti, mencatat keberangkatan, mencetak manifest, sampai mencatat kepulangan — tanpa membuka Excel sama sekali.

### Fase 2 — Jalan Paralel (2 minggu)

Aplikasi dan Excel dijalankan bersamaan. Setiap selisih angka dicatat dan ditelusuri. Excel baru dipensiunkan setelah dua minggu berturut-turut tanpa selisih.

### Fase 3 — Penyempurnaan (3–4 minggu)

F8 Perencana Tiket · F9 Rekap & Ekspor · F10 Kalender Roster · F11 Cuti Tahunan

### Fase 4 — Lanjutan (sesuai kebutuhan)

F12 Portal Karyawan · F13 Optimasi Carter · F14 Unggah Bukti · F15 Prakiraan Manpower

---

## Lampiran A — Ringkasan Temuan Cepat

| # | Temuan | Tingkat | Diperbaiki oleh |
|---|---|---|---|
| 1 | 40 dari 40 karyawan salah status | Kritis | Status sebagai nilai turunan (5.2) |
| 2 | Perhitungan hari meledak sampai 1,8 juta hari | Kritis | Model data `siklus_roster` (8.2) |
| 3 | Rumus merujuk workbook eksternal yang hilang | Kritis | Basis data tunggal (11.4) |
| 4 | Sheet Surat Jalan seluruhnya `#REF!` | Kritis | F5 Generator Surat Jalan |
| 5 | Manifest menampilkan HP & tujuan orang yang salah | Kritis | F4 + kriteria uji eksplisit |
| 6 | Tidak ada dimensi perusahaan | Tinggi | Kolom `perusahaan_id` + penomoran per entitas (10) |
| 7 | POH tidak terhubung ke perencanaan tiket | Menengah | F8 Perencana Tiket |

---

*Dokumen ini disusun untuk dibahas dan direvisi. Setiap perubahan lingkup dicatat sebagai versi baru.*
