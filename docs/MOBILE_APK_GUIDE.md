# Panduan Instalasi & Build Aplikasi Mobile ROSTA 📱

Dokumen ini menjelaskan cara mengunduh, memasang, dan membagikan aplikasi mobile **ROSTA (Roster & Travel Assistant)** untuk Site Tambang Musi Rawas Utara.

---

## 🚀 Metode 1: 1-Klik Unduh / Instal Langsung dari Web (PWA — Direkomendasikan)

Aplikasi ROSTA telah dilengkapi dengan standar **Progressive Web App (PWA)** dengan Service Worker dan Manifest resmi. Pengguna tidak perlu membuka Google Play Store atau Apple App Store.

### A. Untuk Pengguna Android (Chrome / Samsung Internet / Edge)
1. Buka tautan ROSTA di browser HP (contoh: `https://rosta.vercel.app`).
2. Di pojok kanan atas Header atau di menu samping (Drawer), ketuk tombol **"Instal App"** (ikon unduh 📥).
3. Browser akan memunculkan dialog konfirmasi: **"Pasang aplikasi ROSTA?"**.
4. Ketuk **Pasang (Install)**.
5. Selesai! Aplikasi ROSTA akan langsung terpasang di Layar Utama (Home Screen) smartphone Anda dengan logo ROSTA dan berjalan dalam mode *standalone full-screen* tanpa bilah alamat browser.

> **Opsi Alternatif Android:**
> Ketuk tombol titik tiga (⋮) di pojok kanan atas Chrome ➔ pilih **"Pasang Aplikasi"** atau **"Tambahkan ke Layar Utama"**.

---

### B. Untuk Pengguna iPhone / iPad (Safari iOS)
1. Buka tautan ROSTA di browser **Safari**.
2. Ketuk tombol **"Instal App"** di Header untuk melihat panduan cepat, ATAU:
   - Ketuk ikon **Bagikan (Share 📤)** di bilah bawah browser Safari.
   - Gulir ke bawah lalu pilih menu **"Tambahkan ke Layar Utama" (Add to Home Screen ⊞)**.
   - Ketuk **Tambah (Add)** di pojok kanan atas.
3. Ikon ROSTA akan langsung muncul di halaman aplikasi iPhone Anda.

---

## 📦 Metode 2: Membuat File Mentah Installer Android (.APK)

Jika PIC atau Admin lapangan ingin membagikan file mentah **`rosta.apk`** secara offline (misalnya dikirim melalui grup WhatsApp atau ditransfer via kabel USB ke smartphone operasional tambang), Anda memiliki 2 opsi resmi:

### Opsi A: Menggunakan Bubblewrap CLI (Google Official TWA)
Metode ini membungkus URL web ROSTA yang sudah aktif (misalnya Vercel) ke dalam paket native Android `.apk` dan `.aab`:

1. Pastikan Java JDK (17+) dan Android SDK sudah terpasang.
2. Jalankan Bubblewrap CLI:
   ```bash
   npx @bubblewrap/cli init --manifest=https://rosta.vercel.app/manifest.json
   ```
3. Bangun file APK:
   ```bash
   npx @bubblewrap/cli build
   ```
4. File `app-release-signed.apk` akan dihasilkan dan siap dibagikan langsung.

---

### Opsi B: Menggunakan Capacitor Android
Jika ingin menjadikan ROSTA sebagai aplikasi native Android terisolasi:

1. Pasang dependensi Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/android
   npm install -D @capacitor/cli
   ```
2. Inisialisasi konfigurasi:
   ```bash
   npx cap init ROSTA com.aurakha.rosta --web-dir=out
   ```
3. Tambahkan platform Android:
   ```bash
   npx cap add android
   ```
4. Buka di Android Studio:
   ```bash
   npx cap open android
   ```
5. Di Android Studio, pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** untuk menghasilkan file `.apk`.

---

## 📋 Ringkasan File Terkait Mobile di Project:
- `public/manifest.json`: Konfigurasi nama aplikasi, tema gelap (`#0f172a`), dan mode `standalone`.
- `public/sw.js`: Service worker untuk caching dan syarat installability browser.
- `public/icon-192.png`: Ikon standar Android (192x192 px).
- `public/icon-512.png`: Ikon resolusi tinggi / splash screen (512x512 px).
- `src/components/common/PwaInstallButton.tsx`: Komponen tombol 1-klik unduh/pasang dengan deteksi otomatis Android & panduan modal iOS.
- `src/components/layout/ServiceWorkerRegister.tsx`: Registrasi otomatis Service Worker di browser klien.
