# Modul & Spesifikasi Fitur — CAKRAWALA

> **Dokumen Rincian Modul Bisnis, Logika Alur Kerja, & Panduan Fungsional Portal**  
> Proyek: **CAKRAWALA** (*Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara*)

---

## 1. Portal Petugas Perpustakaan (`public/petugas/`)

Dashboard Petugas dirancang dengan pendekatan **5 Meja Kerja Terintegrasi (*Feature-Driven Desk*)** ditambah **1 Modul Pemindai Universal (Scanner)** untuk memastikan layanan meja sirkulasi fisik berjalan cepat, akurat, dan bebas kertas:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD MEJA KERJA PETUGAS PERPUSTAKAAN                       │
├───────────────┬─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│    MEJA 1     │     MEJA 2      │     MEJA 3      │      MEJA 4      │     MEJA 5      │
│   OVERVIEW    │    SIRKULASI    │  PENGEMBALIAN   │    INVENTARIS    │   PENGUMUMAN    │
│ (Statistik &  │  (Prapinjam,    │   (Kalkulator   │ (Katalog Master, │ (Agenda Kampus  │
│  Aksi Cepat)  │   Aktif, Walk)  │ Denda & Kasir)  │ Stiker QR Code)  │ & Broadcast)    │
└───────────────┴─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

### 1.1. Meja 1: Overview & KPI Operasional (`1-overview/overview.js`)
- **Kartu Metrik Utama:**
  - *Peminjaman Aktif:* Total buku fisik yang sedang dibawa pulang oleh anggota (`status = 'Dipinjam'`).
  - *Antrean Pra-Pinjam:* Total reservasi online yang menunggu diambil dari rak (`status = 'Menunggu'`).
  - *Pengembalian Hari Ini:* Akumulasi buku yang berhasil dikembalikan pada hari ini.
  - *Kas Denda Tertunda:* Total rupiah denda menunggak (`status_denda = 'Belum Lunas'`).
- **Indikator Jam Layanan Dinamis:** Menghitung jam operasional (07.30 – 15.30 WIB) dan menampilkan status *"Layanan Meja Buka"* vs *"Layanan Meja Tutup"*.
- **Antrean Cepat Prapinjam (Quick Desk):** Menampilkan daftar buku prioritas yang harus segera diambil dari rak fisik tanpa perlu membuka tab sirkulasi.
- **Pintasan Aksi Cepat (Quick Actions):** Tombol satu klik untuk: *Peminjaman Langsung Walk-in*, *Buka Pemindai Barcode/QR Kamera*, *Tambah Koleksi Buku Baru*, dan *Buat Pengumuman Agenda*.

---

### 1.2. Meja 2: Sirkulasi Peminjaman Buku Fisik (`2-sirkulasi/`)

#### Aturan Kuota Peminjaman Aktif:
- Setiap anggota (Siswa maupun Guru) dibatasi maksimal **2 buku aktif sekaligus**.
- Yang dihitung dalam kuota: Buku berstatus `'Menunggu'` + buku berstatus `'Dipinjam'`.
- Jika kuota mencapai 2/2, sistem otomatis mengunci form pinjaman baru untuk anggota tersebut.

#### Sub-tab 1: Verifikasi Pra-Pinjam (`prapinjam.js`):
1. **Penyortiran Buku dari Rak:** Menampilkan daftar pesanan buku lengkap dengan nomor rak fisik (contoh: *Rak 3B - Sains*).
2. **Filter Kesiapan:** Menyortir antrean berdasarkan *Semua*, *Perlu Diambil dari Rak*, dan *Buku Siap di Meja*.
3. **Tandai Siap di Meja:** Setelah mengambil buku dari rak, petugas menekan tombol ini untuk memperbarui status tiket di dashboard siswa menjadi hijau (*"Buku Siap Diambil"*).
4. **Verifikasi Tiket & Serah Terima:** Membuka dialog `#modalVerifyPrapinjam`. Saat petugas menekan *"Serahkan Buku"*, status beralih menjadi `'Dipinjam'` dan stok buku terpotong 1.
5. **Pembatalan / Penolakan:** Petugas dapat membatalkan reservasi jika kondisi fisik buku di rak rusak tak terduga.

#### Sub-tab 2: Antrean Pinjaman Aktif (`pinjamanAktif.js`):
- Menampilkan seluruh buku yang sedang beredar beserta badge jatuh tempo: *Tepat Waktu*, *Batas Tempo Hari Ini*, atau *Terlambat X Hari*.
- Tombol shortcut *"Kembalikan Buku Ini"* langsung memindahkan data ke Meja 3 Pengembalian.

#### Sub-tab 3: Peminjaman Langsung Walk-In (`walkIn.js`, `memberPicker.js`):
- **Autocomplete Pencarian Anggota:** Mencari instan berdasarkan nama, NISN, kelas siswa, atau NIP guru.
- **Validasi Kuota:** Sistem otomatis menolak transaksi jika kuota anggota sudah terpakai 2/2.
- **Pilihan Buku:** Petugas memilih koleksi atau memindai barcode stiker buku. Sistem otomatis menghitung batas kembali default (+7 hari).

---

### 1.3. Meja 3: Pengembalian Buku & Kasir Denda (`3-pengembalian/`)

#### Sisi Kiri: Formulir Penerimaan Pengembalian
1. **Pencarian Peminjam Berbasis Anggota (`seleksiPeminjam.js`):** Petugas cukup mengetik nama peminjam, sistem otomatis menampilkan daftar buku yang sedang dipinjam anggota tersebut.
2. **Pencarian Cepat via Barcode Buku:** Petugas dapat langsung memindai barcode buku fisik; sistem otomatis menemukan siapa peminjamnya.
3. **Kustomisasi Tarif Denda Harian:** Form tarif dinamis (default Rp 1.000 / hari) yang tersinkronisasi ke pengaturan perpustakaan.
4. **Aturan Khusus Keterlambatan $\ge$ 30 Hari (1 Bulan):**
   - Jika keterlambatan mencapai $\ge 30$ hari, **penghitungan denda harian dinonaktifkan otomatis**.
   - Denda diganti dengan nominal **seharga buku fisik** (`harga_buku` dari database atau default Rp 50.000).
   - Tampil banner peringatan merah dan label tarif berubah menjadi `(Ganti Buku)`.
5. **Kompensasi Kerusakan Fisik:**
   - *Baik:* Rp 0.
   - *Rusak (Ringan/Sedang):* +50% dari harga buku fisik.
   - *Hilang / Rusak Berat:* +100% dari harga buku fisik.
6. **Eksekusi Pengembalian:**
   - Pilihan status pembayaran: *Lunas (Tunai)* atau *Belum Lunas (Menunggak)*.
   - Status peminjaman diubah menjadi `'Selesai'`, stok buku dipulihkan (+1), dan struk resmi diterbitkan via `#modalReceipt`.

#### Sisi Kanan: Kasir Tunggakan & Riwayat
1. **Kasir Tunggakan Denda (`kasirTunggakan.js`):** Menampilkan daftar tagihan denda berstatus `'Belum Lunas'`.
2. **Verifikasi 2 Lapis Kas Fisik:** Pada `#modalKonfirmasiLunasiDenda`, petugas wajib mencentang *"Saya telah menerima uang tunai dari peminjam"* sebelum tombol pelunasan aktif.
3. **Fitur Darurat Batal Lunas (Rollback):** Memungkinkan petugas mengembalikan status denda ke `'Belum Lunas'` jika terjadi kekeliruan klik.
4. **Semua Riwayat Pengembalian (`arsipRiwayat.js`):** Menampilkan seluruh arsip log pengembalian dengan pencarian resi `KB-XXXXXX` atau nama peminjam.

---

### 1.4. Meja 4: Inventaris Koleksi Buku & Stiker QR (`4-buku/`)
- **Tabel Master Katalog Buku:** Live search instan dan filter dropdown kategori buku.
- **Formulir Tambah & Edit Buku (`modalFormBuku.js`):** Auto-generate ID unik (`BK-AUTO`), upload cover ke wadah Supabase `covers`.
- **Generator & Pencetak Stiker QR (`modalQrBuku.js`):** Merender stiker label standar (Logo, Judul, QR Code 2D via `QRCode.js`, dan ID Buku) yang dapat dicetak langsung via printer label barcode (`window.print()`) atau diunduh sebagai PNG.
- **Hapus Buku (`modalHapusBuku.js`):** Proteksi integritas menolak penghapusan buku jika sedang aktif dipinjam anggota.

---

### 1.5. Meja 5: Pengumuman & Broadcast Agenda (`5-pengumuman/`)
- **Kelola Berita & Acara:** Menampilkan daftar pengumuman, badge acara (*Mendatang* / *Selesai*), dan thumbnail poster.
- **Sinkronisasi Lintas Layar:** Seluruh pengumuman otomatis tersinkronkan ke Landing Page publik (`public/index.html`) dan Beranda Siswa/Guru.
- **Formulir Pengumuman (`modalFormPengumuman.js`):** Input judul, kategori, tanggal pelaksanaan, dan upload poster ke wadah Supabase `posters`.

---

### 1.6. Modul Pemindai Barcode / QR Kamera Universal (`scanner/`)
- **Dual-Engine Detection:** Kamera webcam laptop (`Html5QrcodeScanner`) dengan fallback decoding gambar file (`fileDecoder.js`).
- **Audio Feedback (`soundFeedback.js`):** Bunyi nada konfirmasi *beep* berbasis Web Audio API tanpa berkas `.mp3`.
- **Smart Scan Routing (`scanRouter.js`):**
  - Prefix `PJ-...` $\rightarrow$ membuka modal verifikasi Meja 2 (Sirkulasi).
  - Prefix `BK-...` $\rightarrow$ membuka Meja 3 (Pengembalian) atau Keranjang Walk-In.

---

## 2. Portal Siswa & Guru (`public/siswa-guru/`)

Portal layanan mandiri ramah perangkat seluler (*mobile-responsive*) yang dibagi menjadi **5 Tab Layanan Mandiri**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      PORTAL LAYANAN MANDIRI SISWA & GURU (ANGGOTA)                     │
├───────────────┬─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│     TAB 1     │      TAB 2      │      TAB 3      │      TAB 4       │      TAB 5      │
│    BERANDA    │     KATALOG     │  PINJAMAN SAYA  │  RIWAYAT & DENDA │  PROFIL & KARTU │
│  (KPI Pribadi,│ (Pencarian Rak, │ (Buku Aktif &   │  (Log Transaksi  │ (Kartu Anggota  │
│  Alert Denda) │  Booking Kuota) │  Tiket Barcode) │   & Kas Denda)   │  Digital & QR)  │
└───────────────┴─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

1. **Tab 1: Beranda & Ringkasan Pribadi (`0-beranda/`):**
   - 4 Kartu KPI: Buku Dipinjam, Reservasi Pra-Pinjam, Riwayat Selesai, dan Status Bebas/Menunggak Denda.
   - Banner Deteksi Denda Interaktif: Peringatan denda berjalan, peringatan kritis keterlambatan $\ge 30$ hari (ganti seharga buku fisik).
   - Countdown jatuh tempo buku terdekat & slider pengumuman agenda sekolah.
2. **Tab 2: Katalog Koleksi & Reservasi Daring (`1-katalog/`):**
   - Live search buku berdasarkan judul, pengarang, dan ISBN. Filter multi-kategori dan sorting.
   - Penunjuk lokasi rak fisik pada setiap kartu buku (contoh: *Rak 3B - Sains*).
   - Modal detail buku menampilkan sinopsis, harga buku fisik, dan validasi kuota (maksimal 2 buku).
3. **Tab 3: Pinjaman Saya & Tiket Digital (`2-prapinjam/`):**
   - Monitoring buku fisik yang sedang dibawa pulang beserta hitung mundur hari jatuh tempo.
   - Tiket Digital Barcode & QR Code 2D resmi untuk antrean pra-pinjam (ditunjukkan ke petugas meja).
   - Fitur pembatalan reservasi mandiri sebelum buku diserahkan petugas.
4. **Tab 4: Riwayat & Rekap Denda (`3-riwayat/`):**
   - Catatan arsip seluruh buku yang pernah selesai dipinjam.
   - Rekapitulasi transparansi denda beserta nomor resi pengembalian resmi.
5. **Tab 5: Profil Anggota & Kartu Digital (`4-profil/`):**
   - Kartu Anggota Digital resmi dengan styling Navy Brand, identitas NISN/NIP, kelas/mata pelajaran, dan QR Code identitas untuk pemindaian di perpustakaan.

---

## 3. Portal Administrator (`public/admin/`)

Pusat kendali hak akses pengguna (*User Access Control*) dan manajemen master data akun:

1. **Tab 0: Overview & Rasio Pengguna (`0-overview/`):**
   - Ringkasan total akun terdaftar, distribusi peran Siswa, Guru, dan Petugas, serta rasio status akun aktif.
2. **Tab 1, 2, 3: Manajemen Akun Siswa, Guru, Petugas (`1-siswa/`, `2-guru/`, `3-petugas/`):**
   - Tabel dinamis dengan avatar profil netral WhatsApp (`w-9 h-9 rounded-full bg-slate-200`).
   - Pencarian instan (NISN/NIP, nama, kelas/mata pelajaran).
   - Form Tambah & Edit Akun Terpadu (`modals/modalUser.js`) dengan transaksi 2-fase ke `data_user` dan tabel entitas profil terkait.
3. **Modul Import Massal Excel (`import/importExcel.js`):**
   - Menggunakan library SheetJS (`xlsx`) untuk membaca berkas `.xlsx`, `.xls`, atau `.csv`.
   - Validasi skema kolom otomatis, verifikasi duplikasi username/NISN/NIP, dan batch insert langsung ke database Supabase.
4. **Modal Konfirmasi Tindakan Kritis (`modals/modalKonfirmasi.js`):**
   - Dialog peringatan untuk aksi penghapusan akun atau reset kata sandi demi mencegah kesalahan operasional admin.

