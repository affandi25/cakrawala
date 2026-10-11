# PRD.md: Product Requirement Document — Sistem Perpustakaan Digital "CAKRAWALA"

> **Dokumen Spesifikasi Kebutuhan Perangkat Lunak, Arsitektur Modular, & Panduan Vibe Coding AI Agent (Updated & Modularized Architecture)**
> Proyek: **CAKRAWALA** (*“Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara”*)
> Arsitektur: Modern Client-Side Web Architecture (Vite Multi-Page App (MPA) with HTML Component Includer, Environment Variables (.env), HTML5, Tailwind CSS, Vanilla JavaScript ES6+ Feature-Driven Modules, Supabase PostgreSQL, `html5-qrcode`, JsBarcode, QRCode.js, GSAP, & AOS)

---

## 1. Visi Produk & Ringkasan Eksekutif

**CAKRAWALA** adalah sistem otomasi perpustakaan terintegrasi yang menjembatani layanan digital daring dan operasional meja sirkulasi fisik. Sistem ini dibangun untuk memenuhi 4 pilar utama:

1. **Katalog Publik & Kiosk Anjungan Mandiri (`public/index.html`):** Memfasilitasi pengunjung/siswa mencari buku, mengecek ketersediaan stok, melihat nomor rak fisik, dan membaca pengumuman kampus secara transparan tanpa kewajiban login.
2. **Portal Anggota Siswa & Guru (`public/siswa-guru/`):** Pemesanan buku mandiri (pra-pinjam), pemantauan buku aktif, cek sisa hari jatuh tempo, tiket bukti booking (Barcode Code-128 & QR Code 2D), kartu anggota digital resmi, dan rekap denda mandiri.
3. **Meja Operasional Petugas (`public/petugas/`):** Pemrosesan sirkulasi cepat (penyortiran antrean pra-pinjam dengan status kesiapan rak *"Perlu Diambil"* vs *"Buku Siap di Meja"*, verifikasi barcode tiket, peminjaman langsung *walk-in*, pengembalian cerdas berbasis nama peminjam, pemisahan meja tunggakan denda + verifikasi 2 lapis pelunasan tunai), modul **CRUD Buku (dengan cetak stiker QR)**, **Master Kategori Koleksi**, dan **CRUD Pengumuman**.
4. **Pusat Kendali Admin (`public/admin/`):** Pengelolaan hak akses pengguna (*Role-Based Access Control*) dan **CRUD Manajemen Pengguna** murni untuk entitas Siswa, Guru, dan Petugas perpustakaan.

---

## 2. Arsitektur Teknologi & Prinsip Modularitas

Untuk mencegah file kode raksasa (*monolithic files* > 1.000 baris) yang sulit di-maintain, proyek ini menerapkan **Feature-Driven Architecture & HTML Component Partials**:

| Layer / Komponen | Teknologi | Peran & Detail Implementasi |
| --- | --- | --- |
| **Bundler & Build Tool** | Vite (`vite.config.js`) | Mengatur Multi-Page App (MPA), HMR dev server kilat, dan **`htmlIncludePlugin`** yang memungkinkan tag `<include src="./components/..." />`. |
| **Modular HTML** | HTML Partials (`components/`) | File `dashboard.html` di setiap portal hanya berupa *Master Layout* ringkas (< 100 baris), menyusun komponen modular dari folder `components/`. |
| **Modular JavaScript** | ES6+ Feature Modules (`modules/<fitur>/`) | Setiap fitur memiliki folder mandiri dengan file rata-rata 50–250 baris (*Single Responsibility Principle*). |
| **Environment Secrets** | Vite Env (`.env` & `.env.example`) | Menyimpan kredensial `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` via `import.meta.env`. |
| **Database & Client** | Supabase Cloud via JS Client | Menggunakan instance client tersentralisasi dari `public/assets/js/supabaseClient.js`. |
| **Styling & Tema** | Tailwind CSS (CDN / Config) | Palet utama: Navy (`#000C4F`), Slate-50 (`#F8FAFC`), Putih (`#FFFFFF`), Emerald-600 (Tersedia), Amber-500 (Booking/Tempo), dan Rose-600 (Denda/Terlambat). |
| **Barcode & QR Engine** | `JsBarcode` & `QRCode.js` | Menghasilkan Barcode 1D (Code 128) dan QR Code 2D untuk tiket booking daring serta kartu anggota digital. |
| **Pemindai Kamera** | Library `html5-qrcode` | Membaca stiker QR fisik buku langsung melalui webcam/kamera laptop di meja sirkulasi. |

---

## 3. Matriks Peran & Hak Akses Pengguna

| Fitur / Modul | Tamu (Guest) | Siswa | Guru | Petugas | Admin |
| --- | --- | --- | --- | --- | --- |
| Akses Landing Page, Pengumuman & Cari Buku | Ya | Ya | Ya | Ya | Ya |
| Cek Lokasi Rak Fisik Buku | Ya | Ya | Ya | Ya | Ya |
| Login Akun Sistem | Tidak | Ya | Ya | Ya | Ya |
| Booking Daring (Pra-Pinjam, Max 2 Buku) | Redirect Login | Ya | Ya | Tidak | Tidak |
| Dashboard Pribadi (Buku Aktif, Barcode Tiket & Denda) | Tidak | Ya | Ya | Tidak | Tidak |
| Kartu Anggota Digital (QR Code NISN/NIP) | Tidak | Ya | Ya | Tidak | Tidak |
| Peminjaman Langsung (*Walk-in*) | Tidak | Tidak | Tidak | Ya | Ya |
| Penyiapan Rak & Validasi Tiket Pra-Pinjam | Tidak | Tidak | Tidak | Ya | Ya |
| Meja Pengembalian (Cari Nama $\rightarrow$ Buku Aktif) | Tidak | Tidak | Tidak | Ya | Ya |
| Meja Khusus Tunggakan Denda & Verifikasi Lunas Tunai | Tidak | Tidak | Tidak | Ya | Ya |
| **CRUD Katalog Buku & Cetak Stiker QR** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **Master Kategori Koleksi Buku** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **CRUD Pengumuman (Sinkron ke Landing Page)** | Tidak | Tidak | Tidak | **Ya** | Tidak |
| **CRUD Manajemen User (Siswa, Guru, Petugas)** | Tidak | Tidak | Tidak | Tidak | **Ya** |

---

## 4. Alur Bisnis & Aturan Operasional Sirkulasi

### A. Aturan Kuota Peminjaman Aktif (Maksimal 2 Buku)
1. Setiap anggota (Siswa maupun Guru) memiliki kuota maksimal **2 buku aktif sekaligus**.
2. Yang dihitung sebagai buku aktif:
   - Buku yang sedang dalam antrean pesanan online (status `'Menunggu'`).
   - Buku fisik yang sedang dibawa pulang (status `'Dipinjam'`).
3. Jika kuota sudah mencapai 2/2:
   - Tombol **Booking Buku** di katalog otomatis terkunci (*disabled*) dengan label `Kuota Penuh (2/2)`.
   - Anggota wajib mengembalikan buku fisik atau membatalkan booking sebelum dapat meminjam buku lain.
4. Anggota tidak dapat mengajukan booking ganda untuk buku yang sama.

### B. Alur Pra-Pinjam, Penyiapan Buku dari Rak, & Tiket Booking Daring
1. **Pengajuan Booking Mandiri (Siswa/Guru):**
   - Pengguna mencari buku di Katalog $\rightarrow$ Klik **"Booking Buku"**.
   - Pengguna memilih estimasi batas pengembalian (+7 hari kalender) $\rightarrow$ Klik **Konfirmasi**.
   - Sistem membuat transaksi di `data_peminjaman` dengan `status = 'Menunggu'`, metode `'Pra Pinjam'`, dan status kesiapan default `'Perlu Diambil'`.
2. **Penerbitan Tiket Digital:**
   - Sistem otomatis menerbitkan **Tiket Bukti Pra-Pinjam**:
     - Dilengkapi Barcode 1D (Code 128) dan QR Code 2D.
     - Pratinjau status penyiapan buku secara live (*"Menunggu Disiapkan"* vs *"Buku Siap Diambil"*).
     - Dapat diunduh sebagai gambar PNG resmi perpustakaan via Canvas HTML5.
3. **Penyortiran & Pengambilan Buku oleh Petugas (Meja 2 Sirkulasi):**
   - Petugas menerima antrean pra-pinjam dengan info lokasi rak buku (contoh: *Rak 3B - Sains*).
   - Meja Petugas dilengkapi **Filter Kesiapan**:
     - *Semua Kesiapan*: Menampilkan seluruh antrean reservasi aktif.
     - *Perlu Diambil dari Rak*: Daftar buku yang masih harus diambil petugas dari rak fisik.
     - *Buku Siap di Meja*: Daftar buku yang sudah diambil dan siap diserahkan kepada peminjam.
   - Petugas mengklik tombol toggle **"Tandai Siap di Meja"** setelah mengambil buku dari rak.
4. **Notifikasi Status di Portal Pengguna:**
   - Setelah petugas menandai buku siap, status di dashboard Siswa/Guru otomatis berubah menjadi **"Buku Siap Diambil di Meja Sirkulasi"** (badge hijau).
   - Pengguna datang ke meja perpustakaan membawa tiket booking fisik / digital.
5. **Verifikasi & Serah Terima Buku:**
   - Petugas memindai barcode tiket via kamera/upload gambar atau tombol **"Verifikasi Tiket"**.
   - Petugas memvalidasi identitas anggota dan klik **"Serahkan Buku"**:
     - Status transaksi beralih dari `'Menunggu'` $\rightarrow$ `'Dipinjam'`.
     - Stok buku fisik dipotong 1.
6. **Batas Waktu Booking:**
   - Buku disimpan di meja sirkulasi selama maksimal **2x24 jam** sebelum otomatis hangus/dibatalkan jika tidak diambil. Pengguna juga dapat membatalkan booking mandiri melalui tab *Peminjaman Saya*.

### C. Alur Pengembalian Cerdas & Bebas Kerumitan (*Member-First Desk*)
1. Petugas membuka menu **Meja Pengembalian**.
2. Petugas cukup mengetik nama siswa/guru di kotak pencarian peminjam (`#inputSearchPeminjamPengembalian`).
3. Sistem secara otomatis menampilkan 1–2 buku yang saat ini **sedang aktif dipinjam** oleh anggota tersebut.
4. Jika anggota hanya meminjam 1 buku, buku otomatis terpilih secara instan.
5. Petugas memilih kondisi buku (**Baik**, **Rusak**, atau **Hilang**):
   - Jika ada keterlambatan, denda otomatis dihitung per hari (Rp 1.000 / hari).
   - Jika buku rusak/hilang, denda ganti rugi ditambahkan sesuai tarif `harga_buku`.
6. Klik **"Proses Pengembalian"**:
   - Status transaksi menjadi `'Selesai'`.
   - Stok buku fisik otomatis kembali bertambah 1 (kecuali jika kondisi Hilang).
   - Jika ada denda yang belum dibayar, transaksi masuk ke daftar **Tunggakan Denda**.

### D. Manajemen Denda Terpisah & Verifikasi 2 Lapis Kas Fisik
1. Meja riwayat pengembalian dipisahkan menjadi 2 sub-tab:
   - **Sub-tab Tunggakan Denda (`#tabBtnTunggakanDenda`):** Menampilkan kartu tagihan siswa yang berstatus `'Belum Lunas'`, nominal total uang kas tertunda, dan tombol `[Lunasi Denda]`.
   - **Sub-tab Semua Riwayat (`#tabBtnSemuaRiwayat`):** Seluruh log pengembalian dengan filter Bebas Denda, Belum Lunas, dan Lunas.
2. **Verifikasi 2 Lapis Pelunasan Denda Tunai:**
   - Saat tombol *Lunasi Denda* ditekan, muncul modal konfirmasi `#modalKonfirmasiLunasiDenda`.
   - Petugas **wajib mencentang kotak verifikasi fisik**: *"Saya telah menerima uang tunai dari peminjam"*.
   - Tombol eksekusi lunas baru dapat diklik setelah kotak tercentang.
3. **Safety Rollback (*Batal Lunas*):**
   - Jika petugas tidak sengaja melunaskan denda padahal uang belum diterima, sistem menyediakan tombol darurat **"Batalkan Lunas"** untuk mengembalikan status denda ke `'Belum Lunas'`.

---

## 5. Standar Struktur Folder Proyek (Current & Target Architecture)

Struktur folder proyek menerapkan prinsip **Separation of Concerns** dan **Modular Components**:

```text
cakrawala/
├── .env                                  # Kredensial Supabase (URL & Anon Key)
├── .env.example                          # Template environment variables
├── vite.config.js                        # Konfigurasi Vite MPA + htmlIncludePlugin
├── package.json                          # Dependencies & NPM scripts
├── PRD.md                                # Dokumen Spesifikasi Kebutuhan & Arsitektur
│
└── public/
    ├── index.html                        # Landing page katalog publik & kiosk display
    ├── login.html                        # Halaman login multi-peran
    │
    ├── assets/                           # Shared assets terpusat
    │   ├── css/
    │   │   ├── style.css                 # Style umum landing page
    │   │   ├── dashboard-siswa-guru.css  # Style portal anggota
    │   │   └── dashboard-petugas.css     # Style portal petugas
    │   └── js/
    │       ├── supabaseClient.js         # Client Supabase terpusat
    │       ├── sharedUtils.js            # Utility format rupiah, tanggal, modal, toast
    │       └── auth.js                   # Manajemen sesi, login, logout, & role guard
    │
    │   ─────────────────────────────────────────────────────────────
    │   [1] PORTAL SISWA & GURU (SUDAH 100% TERPARTISI & MODULAR)
    │   ─────────────────────────────────────────────────────────────
    ├── siswa-guru/
    │   ├── dashboard.html                # Master Layout (< 100 baris)
    │   ├── siswa-guru.js                 # Router utama tab & inisialisasi sesi
    │   │
    │   ├── components/                   # Potongan kerangka HTML modular (< 200 baris)
    │   │   ├── sidebar.html              # Mobile header & sidebar navigasi
    │   │   ├── header.html               # Header viewport atas & breadcrumb
    │   │   ├── banner-denda.html         # Red alert banner peringatan denda
    │   │   ├── tab-beranda.html          # Tab 1: Beranda sambutan & kartu KPI
    │   │   ├── tab-katalog.html          # Tab 2: Filter pencarian & grid buku
    │   │   ├── tab-pinjaman.html         # Tab 3: Subtab buku aktif & antrean booking
    │   │   ├── tab-riwayat.html          # Tab 4: Riwayat & filter denda
    │   │   ├── tab-profil.html           # Tab 5: Kartu anggota digital & form akun
    │   │   └── modals.html               # Modal pop-up (detail, booking, tiket, logout)
    │   │
    │   └── modules/                      # Logika JavaScript berbasis fitur
    │       ├── state.js                  # State reaktif & konfigurasi tab
    │       ├── data.js                   # Sinkronisasi fetch data Supabase
    │       ├── siswaHelper.js            # Helper kalkulasi hari & ID generator
    │       ├── overview.js               # Logika render beranda & KPI
    │       ├── riwayat.js                # Logika render tabel riwayat & filter denda
    │       │
    │       ├── katalog/                  # Feature Module: Katalog Buku
    │       │   ├── index.js              # Koordinator katalog & window bindings
    │       │   ├── katalogGrid.js        # Filter kategori, live search, & render grid
    │       │   └── modalDetailBuku.js    # Pop-up sinopsis, rak buku, & harga buku
    │       │
    │       ├── pinjaman/                 # Feature Module: Peminjaman Saya
    │       │   ├── index.js              # Switcher subtab Aktif vs Prapinjam
    │       │   ├── pinjamanAktif.js      # Kartu buku fisik aktif & hitung tempo
    │       │   └── pinjamanPrapinjam.js  # Antrean pra-pinjam & status penyiapan buku
    │       │
    │       ├── prapinjam/                # Feature Module: Booking & Tiket Daring
    │       │   ├── index.js              # Koordinator modul reservasi online
    │       │   ├── modalBooking.js       # Validasi kuota 2 buku & submit booking
    │       │   ├── modalTiket.js         # Tiket barcode Code-128, QR Code & ekspor PNG
    │       │   └── modalBatalBooking.js  # Konfirmasi pembatalan reservasi online
    │       │
    │       └── profil/                   # Feature Module: Kartu Anggota & Akun
    │           ├── index.js              # Koordinator profil & update display
    │           ├── kartuAnggota.js       # Render visual kartu anggota & QR Code
    │           └── pengaturanProfil.js   # Kompresi foto canvas, form kontak, & update DB
    │
    │   ─────────────────────────────────────────────────────────────
    │   [2] PORTAL PETUGAS (SUDAH 100% TERPARTISI & MODULAR)
    │   ─────────────────────────────────────────────────────────────
    ├── petugas/
    │   ├── dashboard.html                # Master Layout Bersih (< 110 baris)
    │   ├── petugas.js                    # Router & koordinator utama
    │   │
    │   ├── components/                   # Potongan kerangka HTML modular (< 300 baris)
    │   │   ├── sidebar.html              # Mobile header, backdrop, & navigasi menu
    │   │   ├── header.html               # Header viewport, breadcrumb, & jam operasional
    │   │   ├── tab-overview.html         # Meja 1: Statistik ringkasan & KPI operasional
    │   │   ├── tab-sirkulasi.html        # Meja 2: Sirkulasi langsung & pra-pinjam
    │   │   ├── tab-pengembalian.html     # Meja 3: Pengembalian buku & tunggakan denda
    │   │   ├── tab-inventaris.html       # Meja 4: Inventaris katalog koleksi buku
    │   │   ├── tab-pengumuman.html       # Meja 5: Kelola pengumuman & broadcast agenda
    │   │   └── modals.html               # Jendela pop-up (kamera scanner, struk, QR, buku, dll)
    │   │
    │   └── modules/                      # Logika JavaScript berbasis fitur modular
    │       ├── state.js                  # State memori reaktif & cache operasional petugas
    │       ├── data.js                   # Sinkronisasi fetch data multi-tabel Supabase
    │       ├── petugasHelper.js          # Helper mata uang, tanggal, modal, toast
    │       ├── overview.js               # Visualisasi ringkasan KPI & shortcut aksi cepat
    │       │
    │       ├── sirkulasi/                # Feature Module: Meja 2 Sirkulasi
    │       │   ├── index.js              # Koordinator subtab & re-exports
    │       │   ├── memberPicker.js       # Autocomplete pencarian anggota (Siswa & Guru)
    │       │   ├── walkIn.js             # Form peminjaman langsung di meja sirkulasi
    │       │   ├── prapinjam.js          # Antrean booking, filter kesiapan rak, & verifikasi
    │       │   └── pinjamanAktif.js      # Monitoring buku aktif berstatus 'Dipinjam'
    │       │
    │       ├── pengembalian/             # Feature Module: Meja 3 Pengembalian & Denda
    │       │   ├── index.js              # Koordinator pengembalian & re-exports
    │       │   ├── formPengembalian.js   # Autocomplete peminjam, buku aktif, & kalkulator denda
    │       │   ├── riwayatDenda.js       # Sub-tab tunggakan denda, log pelunasan, & safety rollback
    │       │   └── modalStruk.js         # Dialog cetak struk tanda terima pengembalian buku
    │       │
    │       ├── buku/                     # Feature Module: Meja 4 Inventaris Koleksi Buku
    │       │   ├── index.js              # Koordinator inventaris buku & re-exports
    │       │   ├── katalogBuku.js        # Tabel katalog, filter kategori/rak, & pencarian
    │       │   ├── modalFormBuku.js      # Dialog form Tambah/Edit buku & upload cover ke Storage
    │       │   ├── modalQrBuku.js        # Stiker QR Code (QRCode.js), cetak fisik, & download PNG
    │       │   └── modalHapusBuku.js     # Modal konfirmasi hapus dengan proteksi peminjaman aktif
    │       │
    │       ├── pengumuman/               # Feature Module: Meja 5 Pengumuman Agenda
    │       │   ├── index.js              # Koordinator pengumuman & re-exports
    │       │   ├── daftarPengumuman.js   # Tabel pengumuman, filter kategori, & badge acara
    │       │   ├── modalFormPengumuman.js# Form Tambah/Edit pengumuman & upload poster ke Storage
    │       │   └── modalHapusPengumuman.js# Dialog konfirmasi hapus pengumuman dari database
    │       │
    │       └── scanner/                  # Feature Module: Pemindai Kamera Barcode / QR
    │           ├── index.js              # Koordinator scanner, trigger tombol, & re-exports
    │           ├── soundFeedback.js      # Suara 'beep' audio Web Audio API saat terbaca
    │           ├── fileDecoder.js        # Decoder barcode file gambar (Html5Qrcode & multi-pass jsQR)
    │           ├── cameraStream.js       # Manajemen stream webcam/kamera & jsQR video loop
    │           └── scanRouter.js         # Router pencocokan hasil scan ke entitas yang tepat
    │
    │   ─────────────────────────────────────────────────────────────
    │   [3] PORTAL ADMIN (ROADMAP PARTISI BERIKUTNYA)
    │   ─────────────────────────────────────────────────────────────
    └── admin/
        ├── dashboard.html                # Target: Master Layout (< 100 baris)
        ├── admin.js                      # Router & koordinator utama
        │
        ├── components/                   # Target Partisi HTML:
        │   ├── sidebar.html              # Navigasi sidebar admin
        │   ├── header.html               # Header viewport admin
        │   ├── tab-overview.html         # Statistik jumlah pengguna
        │   ├── tab-siswa.html            # Tabel manajemen siswa
        │   ├── tab-guru.html             # Tabel manajemen guru
        │   ├── tab-petugas.html          # Tabel manajemen petugas
        │   └── modals.html               # Modal tambah/edit akun pengguna
        │
        └── modules/                      # Target Partisi JavaScript:
            ├── state.js                  # State memori admin
            ├── data.js                   # Fetch data user admin
            ├── adminHelper.js            # Helper validasi & hashing
            ├── siswa/                    # Feature Module: CRUD Siswa
            ├── guru/                     # Feature Module: CRUD Guru
            └── petugas/                  # Feature Module: CRUD Petugas
```

---

## 6. Kamus Data & Skema Database Supabase (PostgreSQL)

Skema tabel database Supabase yang aktif digunakan sistem:

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
    foto_profil TEXT,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 3. TABEL DATA GURU
CREATE TABLE IF NOT EXISTS data_guru (
    nip_guru VARCHAR(20) PRIMARY KEY,
    nama_guru VARCHAR(50) NOT NULL,
    mata_pelajaran VARCHAR(50) NOT NULL,
    email_guru VARCHAR(50) NOT NULL,
    kontak_guru VARCHAR(15) NOT NULL,
    foto_profil TEXT,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 4. TABEL DATA PETUGAS
CREATE TABLE IF NOT EXISTS data_petugas (
    id_petugas VARCHAR(10) PRIMARY KEY,
    nama_petugas VARCHAR(50) NOT NULL,
    email_petugas VARCHAR(50) NOT NULL,
    kontak_petugas VARCHAR(15) NOT NULL,
    foto_profil TEXT,
    id_user VARCHAR(10) REFERENCES data_user(id_user) ON DELETE CASCADE
);

-- 5. TABEL KATEGORI BUKU
CREATE TABLE IF NOT EXISTS data_kategori (
    id_kategori VARCHAR(10) PRIMARY KEY,
    nama_kategori VARCHAR(30) NOT NULL
);

-- 6. TABEL DATA BUKU
CREATE TABLE IF NOT EXISTS data_buku (
    id_buku VARCHAR(10) PRIMARY KEY,
    judul_buku VARCHAR(100) NOT NULL,
    penulis VARCHAR(50) NOT NULL,
    penerbit VARCHAR(50) NOT NULL,
    tahun_terbit INT NOT NULL,
    id_kategori VARCHAR(10) REFERENCES data_kategori(id_kategori) ON DELETE SET NULL,
    kode_qr VARCHAR(100) NOT NULL,
    stok INT DEFAULT 1,
    status VARCHAR(15) NOT NULL DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Dipinjam')),
    keterangan VARCHAR(150), -- Lokasi rak fisik buku (contoh: Rak 3B - Sains)
    cover_url TEXT,
    harga_buku DECIMAL(10, 2) DEFAULT 50000.00 -- Nilai penggantian denda hilang
);

-- 7. TABEL PEMINJAMAN (Maksimal 2 Buku Aktif)
CREATE TABLE IF NOT EXISTS data_peminjaman (
    id_peminjaman VARCHAR(20) PRIMARY KEY,
    nisn_siswa VARCHAR(30), -- NISN Siswa atau NIP Guru
    id_buku VARCHAR(10) REFERENCES data_buku(id_buku) ON DELETE CASCADE,
    tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
    batas_kembali DATE NOT NULL,
    metode_peminjaman VARCHAR(20) NOT NULL CHECK (metode_peminjaman IN ('Pra Pinjam', 'Scan QR')),
    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Dipinjam', 'Selesai'))
);

-- 8. TABEL PENGEMBALIAN & DENDA
CREATE TABLE IF NOT EXISTS data_pengembalian (
    id_pengembalian VARCHAR(10) PRIMARY KEY,
    id_peminjaman VARCHAR(20) REFERENCES data_peminjaman(id_peminjaman) ON DELETE CASCADE,
    tanggal_kembali DATE NOT NULL DEFAULT CURRENT_DATE,
    keterlambatan INT DEFAULT 0,
    kondisi_buku VARCHAR(20) NOT NULL DEFAULT 'Baik' CHECK (kondisi_buku IN ('Baik', 'Rusak', 'Hilang')),
    denda DECIMAL(10, 2) DEFAULT 0.00,
    status_denda VARCHAR(15) NOT NULL DEFAULT 'Tidak Ada' CHECK (status_denda IN ('Tidak Ada', 'Belum Lunas', 'Lunas'))
);

-- 9. TABEL DATA PENGUMUMAN
CREATE TABLE IF NOT EXISTS data_pengumuman (
    id_pengumuman SERIAL PRIMARY KEY,
    judul VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    tanggal_event VARCHAR(50) NOT NULL,
    gambar_url TEXT,
    link_detail TEXT
);
```

---

## 7. Panduan Teknis & Standar Kode untuk AI Agent

1. **Prinsip Komponen HTML Bersih:**
   - Jangan menulis ulang kerangka HTML utuh di `dashboard.html`. Gunakan tag `<include src="./components/<nama-komponen>.html" />`.
   - Simpan elemen HTML komponen di folder `components/` yang sesuai.
2. **Prinsip Modul JavaScript Ramping:**
   - Setiap berkas modul baru wajib menjaga panjang kode di bawah **300 baris**.
   - Kelompokkan logika yang memiliki relasi erat ke dalam sub-folder fitur `modules/<nama-fitur>/` dengan file `index.js` sebagai koordinatornya.
3. **Koneksi Supabase Terpusat:**
   - Selalu impor instance database dari `public/assets/js/supabaseClient.js`:
     ```javascript
     import { db } from '../../assets/js/supabaseClient.js';
     ```
   - Dilarang membuat inisialisasi `createClient` baru atau menuliskan API key secara langsung (*hardcoded*) di dalam file modul.
4. **Preservasi Event Handler & Window Globals:**
   - Fungsi-fungsi yang dipanggil melalui atribut HTML `onclick="window.<namaFungsi>(...)"` wajib dipasangkan (*bind*) ke objek `window` di file koordinator `index.js` modul terkait.