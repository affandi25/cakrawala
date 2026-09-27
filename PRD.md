# PRD.md: Product Requirement Document — Sistem Perpustakaan Digital "CAKRAWALA"

> **Dokumen Spesifikasi Kebutuhan Perangkat Lunak, Arsitektur Basis Data, & Panduan Vibe Coding AI Agent (Final Version)**
> Proyek: **CAKRAWALA** (*“Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara”*)
> Arsitektur: Modern Client-Side Web Architecture (Vite Multi-Page App (MPA), Environment Variables (.env), HTML5, Tailwind CSS, Vanilla JavaScript ES6+ Modules, Supabase PostgreSQL, `html5-qrcode`, GSAP, & AOS)

---

## 1. Visi Produk & Ringkasan Eksekutif

**CAKRAWALA** adalah sistem otomasi perpustakaan terintegrasi yang menjembatani layanan digital daring dan operasional meja sirkulasi fisik. Sistem ini dibangun untuk memenuhi 4 pilar utama:

1. **Katalog Publik & Kiosk Anjungan Mandiri (`public/index.html`):** Memfasilitasi pengunjung/siswa mencari buku, mengecek ketersediaan stok, melihat nomor rak fisik, dan membaca pengumuman kampus secara transparan tanpa kewajiban login.
2. **Layanan Pra-Pinjam Siswa Daring (`public/siswa/dashboard.html`):** Pemesanan buku mandiri sebelum datang ke perpustakaan dengan alur *seamless redirect*.
3. **Meja Operasional Petugas (`public/petugas/dashboard.html`):** Pemrosesan sirkulasi cepat (validasi pra-pinjam, peminjaman langsung *dual-mode* via Scan QR/manual, serta pengembalian dengan aturan denda otomatis), didukung modul **CRUD Buku (dengan cetak stiker QR)**, **Master Kategori Koleksi**, dan **CRUD Pengumuman** yang tersinkronisasi langsung ke landing page.
4. **Pusat Kendali Admin (`public/admin/dashboard.html`):** Pengelolaan hak akses pengguna (*Role-Based Access Control*) dan **CRUD Manajemen Pengguna** murni untuk entitas Siswa, Guru, dan Petugas.

---

## 2. Arsitektur & Spesifikasi Teknologi

| Layer / Komponen | Teknologi | Peran & Detail Implementasi |
| --- | --- | --- |
| **Bundler & Build Tool** | Vite (`vite.config.js`) | Mengatur Multi-Page App (MPA), live-reload HMR instan, dan optimasi build produksi. |
| **Environment Secrets** | Vite Env (`.env` & `.env.example`) | Menyimpan kredensial `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` via `import.meta.env`. |
| **Frontend Platform** | HTML5 Murni, Vanilla JS (ES6+ Modules) | Modul terpisah menggunakan ES Modules (`type="module"`), tanpa framework JS, tanpa PHP. |
| **Database & Client** | Supabase Cloud via JS Client | Menggunakan instance client dari file modul `supabaseClient.js` (`export const db = client; window.db = client;`). |
| **Styling & Tema** | Tailwind CSS (CDN / Config) | Palet utama: Navy (`#000C4F`), Slate-50 (`#F8FAFC`), Putih (`#FFFFFF`), Emerald-600 (Tersedia), dan Amber-500 (Dipinjam). |
| **Ikonografi & Animasi** | Phosphor Icons, GSAP, AOS | Library ikon `@phosphor-icons/web` (`ph`, `ph-fill`), animasi *spread hero cards* (GSAP ScrollTrigger), dan efek scroll AOS. |
| **Pemindai Kamera** | Library `html5-qrcode` | Membaca stiker QR fisik buku langsung melalui kamera/webcam browser tanpa perangkat scanner tambahan. |

---

## 3. Matriks Peran & Hak Akses Pengguna

| Fitur / Modul | Tamu (Guest) | Siswa | Guru | Petugas | Admin |
| --- | --- | --- | --- | --- | --- |
| Akses Landing Page, Banner Pengumuman & Cari Buku | Ya | Ya | Ya | Ya | Ya |
| Cek Lokasi Rak Fisik Buku | Ya | Ya | Ya | Ya | Ya |
| Login Akun Sistem | Tidak | Ya | Ya | Ya | Ya |
| Booking Daring (Pra-Pinjam) | Redirect Login | Ya | Ya | Tidak | Tidak |
| Dashboard Pribadi (Riwayat Pinjam & Status Denda) | Tidak | Ya | Ya | Tidak | Tidak |
| Peminjaman Langsung (*Walk-in* Scan QR / Manual) | Tidak | Tidak | Tidak | Ya | Ya |
| Validasi Pengambilan Pra-Pinjam | Tidak | Tidak | Tidak | Ya | Ya |
| Proses Pengembalian, Cek Denda & Pelunasan *Offline* | Tidak | Tidak | Tidak | Ya | Ya |
| **CRUD Katalog Buku & Cetak Stiker QR** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **Master Kategori Koleksi Buku** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **CRUD Pengumuman (Sinkron ke Landing Page)** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **CRUD Manajemen User (Siswa, Guru, Petugas)** | Tidak | Tidak | Tidak | Tidak | **Ya** |

---

## 4. Rincian Antarmuka Pengguna (UI/UX Guidelines)

Merujuk pada cetak biru wireframe dan halaman yang sudah berjalan:

### A. Landing Page (`public/index.html`)

* **Header Dinamis:** Posisi *fixed*, transparan blur di atas hero section, dan berganti menjadi solid Navy `#000C4F` setelah di-scroll melewati hero section. Menu navigasi (Pengumuman, Katalog, dan Tombol Login) diposisikan di sisi kanan.
* **Hero Section Interaktif:** Menampilkan tumpukan kartu buku (GSAP), teks visi misi, dan *Search Bar* besar.
* **Section Pengumuman:** Menampilkan data dari `data_pengumuman` dengan kartu bergaya horizontal poster dalam wadah *horizontal scroll snap*. Link detail mengarah ke platform media sosial resmi (Instagram/TikTok).
* **Section Katalog Koleksi Fisik:**
* Tombol filter kategori dinamis (*fetch* langsung dari `data_kategori`).
* Grid kartu buku dengan info stok, lokasi rak fisik, tombol "Pra Pinjam", dan tombol "Detail".
* Tombol **"Muat Lebih Banyak" (Show More)** untuk membatasi tampilan awal hanya 8 buku.


* **Modal Detail & Pra-Pinjam (Split Layout Card):**
* Sisi Kiri: Latar navy solid `#000C4F`, tombol kembali, cover buku berbayang, dan judul buku.
* Sisi Kanan: Metadata penerbit, tahun, kategori, lokasi rak fisik, deskripsi, form tanggal pinjam & tempo, serta tombol aksi.



### B. Halaman Login Multi-Role (`public/login.html`)

* **Layout Split 2 Kolom:**
* Sisi Kiri: Background Navy pekat `#000C4F` dengan ilustrasi siswa membaca buku dan sambutan hangat.
* Sisi Kanan: Form putih bersih dengan input NIS/NIP/Username, input password, tombol intip sandi, dan tombol "Log In".


* **Logika Pengalihan Berdasarkan Peran & URL Redirect:**
* Jika memiliki parameter `?buku_id=...` dan role adalah `Siswa`: dialihkan langsung ke form konfirmasi buku tersebut di `public/siswa/dashboard.html?action=pinjam&buku_id=...`.
* Role `Siswa` reguler $\rightarrow$ `public/siswa/dashboard.html`.
* Role `Petugas` $\rightarrow$ `public/petugas/dashboard.html`.
* Role `Admin` $\rightarrow$ `public/admin/dashboard.html`.



### C. Dashboard Siswa (`public/siswa/dashboard.html`)

* **Sidebar Kapsul Minimalis (Kiri):** Ikon vertikal untuk Beranda, Katalog Buku, Peminjaman Saya, Riwayat & Denda, Profil, serta Logout.
* **Banner Peringatan Denda (Red Alert Banner):** Tampil otomatis di posisi teratas jika siswa memiliki denda dengan status `'Belum Lunas'`. Banner otomatis hilang setelah petugas memvalidasi pelunasan denda.
* **Tabel Sirkulasi Siswa:** Menampilkan daftar buku yang berstatus `'Menunggu'` (pra-pinjam), buku aktif (`'Dipinjam'`), tanggal tempo kembali, dan riwayat selesai.

### D. Dashboard Petugas (`public/petugas/dashboard.html`)

* **1. Meja Sirkulasi Cepat (Tabs Navigasi):**
* **Tab Pra-Pinjam:** Daftar antrean booking daring. Petugas memindai QR buku fisik untuk menyerahkan buku $\rightarrow$ status berganti menjadi `'Dipinjam'` dan stok berkurang.
* **Tab Peminjaman Langsung (Walk-In Dual-Mode):** Input NISN/NIP peminjam (otomatis memvalidasi nama peminjam), opsi input buku via **Mode Scan QR** (kamera scanner via `html5-qrcode`) ATAU **Mode Manual** (input ID buku / cari judul), penentuan `batas_kembali`, dan tombol simpan transaksi aktif (`status = 'Dipinjam'`).
* **Tab Pengembalian & Denda:** Pindai stiker QR buku fisik, verifikasi transaksi aktif, pengecekan kondisi buku (Baik / Rusak / Hilang), perhitungan denda otomatis, serta tombol **"Selesaikan Denda / Konfirmasi Lunas"** untuk pelunasan offline tunai.


* **2. Modul CRUD Kelola Buku (Terkoneksi ke Landing Page):**
* Form modal Tambah/Edit buku lengkap dengan harga buku, lokasi rak fisik, kategori dinamis, dan stok.
* Fitur **Generate & Cetak Stiker QR** per buku secara instan.


* **3. Modul Master Kategori Buku:**
* Penambahan dan pengelolaan kategori buku fisik pada tabel `data_kategori`.
* Menjadi sumber data dropdown formulir buku dan filter kategori landing page secara dinamis.


* **4. Modul CRUD Pengumuman (Terkoneksi ke Landing Page):**
* Manajemen poster event, kategori badge, tanggal event, dan tautan sosial media resmi yang tersinkronisasi ke carousel `public/index.html`.



### E. Dashboard Admin (`public/admin/dashboard.html`)

* **Pusat Kendali Pengguna (CRUD Manajemen Pengguna Murni):**
* Sub-menu **Data Siswa**: CRUD NISN, Nama, Kelas, Email, Kontak, dan akun user.
* Sub-menu **Data Guru**: CRUD NIP, Nama Guru, Mata Pelajaran, Email, Kontak, dan akun user.
* Sub-menu **Data Petugas**: CRUD ID Petugas, Nama, Email, Kontak, dan akun user.
* Setiap penambahan/penghapusan otomatis tersinkronisasi ke tabel autentikasi `data_user` (menggunakan relasi ON DELETE CASCADE).



---

## 5. Kamus Data & Skema Database Supabase (PostgreSQL DDL)

Eksekusi seluruh DDL berikut pada menu **SQL Editor** di panel Supabase:

```sql
-- 1. TABEL AKUN USER (Autentikasi & Multi-Role)
CREATE TABLE IF NOT EXISTS data_user (
    id_user VARCHAR(10) PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(15) NOT NULL CHECK (role IN ('Admin', 'Petugas', 'Siswa', 'Guru'))
);

-- 2. TABEL DATA SISWA
CREATE TABLE IF NOT EXISTS data_siswa (
    nisn_siswa VARCHAR(10) PRIMARY KEY,
    nama_siswa VARCHAR(50) NOT NULL,
    kelas VARCHAR(20) NOT NULL,
    email_siswa VARCHAR(50) NOT NULL,
    kontak_siswa VARCHAR(15) NOT NULL,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 3. TABEL DATA GURU
CREATE TABLE IF NOT EXISTS data_guru (
    nip_guru VARCHAR(20) PRIMARY KEY,
    nama_guru VARCHAR(50) NOT NULL,
    mata_pelajaran VARCHAR(50) NOT NULL,
    email_guru VARCHAR(50) NOT NULL,
    kontak_guru VARCHAR(15) NOT NULL,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 4. TABEL DATA PETUGAS
CREATE TABLE IF NOT EXISTS data_petugas (
    id_petugas VARCHAR(10) PRIMARY KEY,
    nama_petugas VARCHAR(50) NOT NULL,
    email_petugas VARCHAR(50) NOT NULL,
    kontak_petugas VARCHAR(15) NOT NULL,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 5. TABEL KATEGORI BUKU
CREATE TABLE IF NOT EXISTS data_kategori (
    id_kategori VARCHAR(10) PRIMARY KEY,
    nama_kategori VARCHAR(30) NOT NULL
);

-- 6. TABEL DATA BUKU (Dilengkapi Kolom Harga Buku untuk Denda Hilang)
CREATE TABLE IF NOT EXISTS data_buku (
    id_buku VARCHAR(10) PRIMARY KEY,
    judul_buku VARCHAR(100) NOT NULL,
    penulis VARCHAR(50) NOT NULL,
    penerbit VARCHAR(50) NOT NULL,
    tahun_terbit INT NOT NULL,
    id_kategori VARCHAR(10) REFERENCES data_kategori(id_kategori) ON DELETE SET NULL,
    kode_qr VARCHAR(100) NOT NULL, -- Menyimpan string ID Buku untuk QR
    stok INT DEFAULT 1,
    status VARCHAR(15) NOT NULL DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Dipinjam')),
    keterangan VARCHAR(150), -- Lokasi rak fisik buku (contoh: Rak 3B - Sains)
    cover_url TEXT,
    harga_buku DECIMAL(10, 2) DEFAULT 50000.00 -- Nilai penggantian jika buku hilang
);

-- 7. TABEL PEMINJAMAN (Prapinjam & Pinjam Langsung)
CREATE TABLE IF NOT EXISTS data_peminjaman (
    id_peminjaman VARCHAR(10) PRIMARY KEY,
    nisn_siswa VARCHAR(10) REFERENCES data_siswa(nisn_siswa) ON DELETE CASCADE,
    id_buku VARCHAR(10) REFERENCES data_buku(id_buku) ON DELETE CASCADE,
    tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
    batas_kembali DATE NOT NULL,
    metode_peminjaman VARCHAR(20) NOT NULL CHECK (metode_peminjaman IN ('Pra Pinjam', 'Scan QR')),
    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Dipinjam', 'Selesai'))
);

-- 8. TABEL PENGEMBALIAN & DENDA
CREATE TABLE IF NOT EXISTS data_pengembalian (
    id_pengembalian VARCHAR(10) PRIMARY KEY,
    id_peminjaman VARCHAR(10) REFERENCES data_peminjaman(id_peminjaman) ON DELETE CASCADE,
    tanggal_kembali DATE NOT NULL DEFAULT CURRENT_DATE,
    keterlambatan INT DEFAULT 0,
    kondisi_buku VARCHAR(20) NOT NULL DEFAULT 'Baik' CHECK (kondisi_buku IN ('Baik', 'Rusak', 'Hilang')),
    denda DECIMAL(10, 2) DEFAULT 0.00,
    status_denda VARCHAR(15) NOT NULL DEFAULT 'Tidak Ada' CHECK (status_denda IN ('Tidak Ada', 'Belum Lunas', 'Lunas'))
);

-- 9. TABEL DATA PENGUMUMAN (LANDING PAGE)
CREATE TABLE IF NOT EXISTS data_pengumuman (
    id_pengumuman SERIAL PRIMARY KEY,
    judul VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    tanggal_event VARCHAR(50) NOT NULL,
    gambar_url TEXT,
    link_detail TEXT
);

-- PENGATURAN POLISI AKSES PUBLIK (ROW LEVEL SECURITY)
ALTER TABLE data_kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bebas baca kategori" ON data_kategori FOR SELECT USING (true);

ALTER TABLE data_buku ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bebas baca buku" ON data_buku FOR SELECT USING (true);

ALTER TABLE data_pengumuman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bebas baca pengumuman" ON data_pengumuman FOR SELECT USING (true);

```

---

## 6. Alur Bisnis & Logika Operasional Sirkulasi

### A. Alur Pra-Pinjam dengan Seamless Redirect (Guest $\rightarrow$ Siswa)

1. Tamu mengklik tombol **"Pra Pinjam"** pada kartu buku di `public/index.html`.
2. Sistem mengecek status sesi: jika belum login, sistem mengarahkan ke `public/login.html?buku_id=BK-001`.
3. Siswa login dengan akunnya.
4. Sistem membaca parameter `buku_id` dan langsung mengarahkan ke `public/siswa/dashboard.html?action=pinjam&buku_id=BK-001`.
5. Sistem menampilkan modal konfirmasi prapinjam untuk buku tersebut.
6. Siswa memeriksa rincian, mengisi tanggal pengembalian, lalu menekan **"Ajukan Peminjaman"**. Transaksi masuk ke `data_peminjaman` dengan `status = 'Menunggu'`.

### B. Alur Peminjaman Langsung di Tempat (Walk-in Dual-Mode)

1. Siswa datang membawa buku ke meja petugas tanpa melakukan booking online sebelumnya.
2. Petugas membuka menu **Peminjaman Langsung**:
* Memasukkan NISN peminjam (nama siswa tampil otomatis).
* Menginput buku melalui **Scan QR** (kamera membaca kode stiker) ATAU **Input Manual** (mengetik ID buku / judul).
* Menentukan tanggal batas pengembalian (`batas_kembali`).


3. Petugas menekan **"Terbitkan Peminjaman"**:
* Transaksi langsung tercatat dengan `metode_peminjaman = 'Scan QR'`, `status = 'Dipinjam'` (tanpa melewati status 'Menunggu').
* Stok buku berkurang 1 dan riwayat otomatis muncul di dashboard siswa.



### C. Logika Perhitungan Denda & Pembayaran Offline (Di Meja Petugas)

1. **Pengecekan Keterlambatan**:
* Sistem membandingkan `tanggal_kembali` dengan `batas_kembali` yang diinput saat peminjaman.
* Keterlambatan $\le 0$ hari: Denda = Rp 0, `status_denda = 'Tidak Ada'`.


2. **Kalkulasi Nilai Denda**:
* **Terlambat $\le$ 7 hari (seminggu / kurang):** Denda flat sebesar **Rp 5.000**.
* **Terlambat $>$ 7 hari:** Denda dihitung:

$$\text{Denda} = 5000 + ((\text{Hari Keterlambatan} - 7) \times 1000)$$


* **Buku Hilang:** Denda dihitung senilai ganti rugi fisik buku (`harga_buku` pada tabel `data_buku`), dan stok buku tidak ditambah kembali.


3. **Penyelesaian Denda (Offline di Tempat)**:
* Selama `status_denda = 'Belum Lunas'`, banner peringatan denda merah muncul di dashboard siswa peminjam.
* Siswa datang ke perpustakaan membawa buku fisik dan membayar denda secara tunai ke petugas.
* Petugas menekan tombol **"Konfirmasi Lunas"** di dashboard petugas $\rightarrow$ `status_denda` berubah menjadi `'Lunas'`.
* Peringatan denda di dashboard siswa seketika hilang.
* Transaksi peminjaman dinyatakan `'Selesai'` dan stok buku fisik bertambah kembali 1.



---

## 7. Standar Struktur Folder Proyek

```text
cakrawala/
├── .env                         # Kredensial lokal (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── .env.example                 # Template environment variables
├── vite.config.js               # Konfigurasi Multi-Page App (MPA) Vite
├── package.json                 # Skrip dependencies & build
├── PRD.md                       # Dokumen acuan utama AI Agent & Developer
├── public/
│   ├── index.html               # Landing page publik & kiosk display
│   ├── login.html               # Login multi-role
│   ├── siswa/
│   │   ├── dashboard.html       # Dashboard siswa (Prapinjam, riwayat, banner denda)
│   │   └── siswa.js             # ES Module logika siswa
│   ├── petugas/
│   │   ├── dashboard.html       # Dashboard petugas (Sirkulasi, CRUD Buku, Kategori, Pengumuman)
│   │   └── petugas.js           # ES Module logika petugas
│   ├── admin/
│   │   ├── dashboard.html       # Dashboard admin (CRUD User: Siswa, Guru, Petugas)
│   │   └── admin.js             # ES Module logika admin
│   └── assets/
│       ├── css/
│       │   └── style.css        # Custom CSS, scrollbar, utilities
│       └── js/
│           ├── supabaseClient.js # Konfigurasi client Supabase (import.meta.env)
│           ├── hero.js          # Skrip animasi GSAP ScrollTrigger
│           └── main.js          # Skrip katalog dinamis, search filter, show more

```

---

## 8. Panduan Teknis & Sintaks Wajib AI Agent (Vite & ES Modules)

1. **Tag Script HTML Selalu Berupa Modul**:
Setiap pemanggilan file JavaScript di seluruh berkas `.html` wajib menyertakan atribut `type="module"`:
```html
<script type="module" src="/assets/js/supabaseClient.js"></script>
<script type="module" src="./admin.js"></script>

```


2. **Koneksi Supabase (Tanpa PHP, Tanpa Hardcoded Keys)**:
* Seluruh komunikasi database wajib mengimpor `db` dari `supabaseClient.js` atau memanggil `window.db`:
```javascript
import { db } from '../assets/js/supabaseClient.js';

```


* Dilarang menulis URL atau Anon Key Supabase secara langsung di dalam file logika JavaScript.


3. **Standar Kode Client-Side Murni**:
* Jangan gunakan sintaks backend Node/CommonJS (`require(...)`, `module.exports`).
* Jangan gunakan PHP atau framework komponen (React/Vue/Svelte). Gunakan Vanilla JS ES6+ murni.