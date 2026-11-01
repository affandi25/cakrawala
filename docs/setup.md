# Panduan Instalasi, Konfigurasi & Deployment — CAKRAWALA

> **Panduan Langkah-demi-Langkah Menyiapkan Lingkungan Lokal, Konfigurasi Supabase, & Deployment Produksi**  
> Proyek: **CAKRAWALA** (*Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara*)

---

## 1. Prasyarat Sistem (Prerequisites)

Sebelum memulai instalasi, pastikan lingkungan pengembangan Anda telah memenuhi spesifikasi berikut:

- **Node.js:** Versi `18.0.0` atau yang lebih baru (disarankan LTS `20.x`).
- **Package Manager:** `npm` (bawaan Node.js) atau `pnpm` / `yarn`.
- **Browser:** Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari versi modern dengan dukungan WebRTC/Kamera (`getUserMedia`) dan Web Audio API.
- **Akun Supabase:** Proyek Supabase aktif (gratis atau berbayar) di [supabase.com](https://supabase.com).

---

## 2. Langkah Instalasi Proyek

### 2.1. Clone Repository & Masuk ke Direktori Proyek
```bash
git clone https://github.com/username/cakrawala.git
cd cakrawala
```

### 2.2. Instalasi Dependensi Node
Jalankan perintah berikut untuk menginstal Vite dan library pendukung seperti SheetJS:

```bash
npm install
```

---

## 3. Konfigurasi Database & Storage di Supabase

### 3.1. Buat Proyek Baru di Supabase
1. Masuk ke dashboard Supabase dan buat proyek baru (misal: *cakrawala-perpus*).
2. Simpan kata sandi database dan tunggu proses *provisioning* selesai (~1-2 menit).

### 3.2. Eksekusi Skema Tabel & Indeks (SQL Editor)
1. Buka menu **SQL Editor** pada dashboard Supabase Anda.
2. Buat kueri baru dan jalankan seluruh script DDL dari dokumen [`database.md`](file:///c:/xampp/htdocs/cakrawala/docs/database.md) (Bagian 2.1 hingga 3).
3. Pastikan ke-9 tabel berikut berhasil dibuat:
   - `data_user`
   - `data_siswa`
   - `data_guru`
   - `data_petugas`
   - `data_kategori`
   - `data_buku`
   - `data_peminjaman`
   - `data_pengembalian`
   - `data_pengumuman`

### 3.3. Buat Wadah Berkas (Storage Buckets)
Buka menu **Storage** di dashboard Supabase dan buat 2 wadah berkas dengan akses publik (*Public Bucket*):
1. **`covers`**: Untuk menyimpan foto sampul katalog buku. Centang opsi *"Public bucket"*.
2. **`posters`**: Untuk menyimpan gambar pamflet/poster pengumuman agenda. Centang opsi *"Public bucket"*.

Atur policy penyimpanan (*Bucket Policies*) agar mengizinkan operasi *Insert*, *Update*, dan *Select* untuk role anon/authenticated sesuai kebutuhan.

---

## 4. Konfigurasi Variabel Lingkungan (`.env`)

1. Salin template konfigurasi `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Buka berkas `.env` dan masukkan kredensial proyek Supabase Anda:
   ```env
   # Template Konfigurasi Supabase untuk CAKRAWALA
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   *(Kredensial URL & Anon Key dapat ditemukan di dashboard Supabase: Project Settings $\rightarrow$ API)*.

---

## 5. Menjalankan Server Pengembangan Lokal (Dev Server)

Jalankan perintah berikut untuk menyalakan Vite Development Server:

```bash
npm run dev
```

- Server akan aktif secara default di URL: `http://localhost:3000/`.
- Vite akan otomatis membuka browser default Anda.
- Fitur *Hot Module Replacement (HMR)* dan plugin partisi HTML modular akan mendeteksi setiap perubahan berkas HTML atau JS tanpa perlu restart manual.

### Daftar Titik Masuk URL Lokal:
- **Katalog Publik & Kiosk:** `http://localhost:3000/`
- **Login Terpadu:** `http://localhost:3000/login.html`
- **Portal Siswa & Guru:** `http://localhost:3000/siswa-guru/dashboard.html`
- **Meja Kerja Petugas:** `http://localhost:3000/petugas/dashboard.html`
- **Pusat Kendali Admin:** `http://localhost:3000/admin/dashboard.html`

---

## 6. Pengujian Build & Produksi (Production Build)

Sebelum melakukan deployment, pastikan seluruh referensi komponen HTML dan bundel JavaScript lulus verifikasi build Rollup:

```bash
# Melakukan build produksi
npm run build

# Menjalankan preview lokal hasil build dist/
npm run preview
```

Hasil kompilasi file yang telah dioptimasi, diminifikasi, dan digabungkan akan berada di direktori `dist/`.

---

## 7. Panduan Deployment ke Platform Cloud

### 7.1. Deployment ke Vercel (Disarankan)
Proyek ini sudah dilengkapi berkas konfigurasi `vercel.json`:
1. Buat repositori di GitHub/GitLab dan push kode Anda.
2. Buka dashboard [Vercel](https://vercel.com) dan impor repositori tersebut.
3. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Vercel akan otomatis mengeksekusi `npm run build` dan memetakan rute MPA secara tepat.

### 7.2. Deployment ke Hosting Tradisional / Apache (XAMPP / cPanel)
Jika mendeploy ke server Apache:
1. Jalankan `npm run build` di komputer lokal.
2. Unggah seluruh isi folder `dist/` ke direktori web server (misal: `public_html/` atau `htdocs/cakrawala/`).
3. Pastikan konfigurasi modul rewrite Apache aktif untuk menangani perutean bersih (*clean URLs*).

---

## 8. Pemecahan Masalah Umum (Troubleshooting & FAQ)

### Q: Kamera scanner tidak dapat diakses di browser?
> **Solusi:** Standar keamanan browser membatasi API `navigator.mediaDevices.getUserMedia` hanya pada origin yang aman: `localhost`, `127.0.0.1`, atau protokol **HTTPS**. Jika aplikasi diakses via IP jaringan lokal (misal: `192.168.x.x`), Anda wajib mengaktifkan SSL/HTTPS atau menambahkan IP tersebut ke flag insecure origins di Chrome (`chrome://flags/#unsafely-treat-insecure-origin-as-secure`).

### Q: Muncul peringatan "[html-include] File komponen tidak ditemukan"?
> **Solusi:** Periksa penulisan path pada atribut tag `<include src="..." />`. Path bersifat relatif terhadap lokasi file HTML induk yang memanggilnya.

### Q: Variabel lingkungan Supabase terbaca undefined?
> **Solusi:** Di Vite, seluruh variabel lingkungan client wajib diawali dengan prefix `VITE_` (contoh: `VITE_SUPABASE_URL`). Jika baru menambahkan berkas `.env`, matikan dev server dan jalankan ulang `npm run dev`.

