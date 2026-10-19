# PRD.md: Product Requirement Document — Sistem Perpustakaan Digital "CAKRAWALA"

> **Dokumen Spesifikasi Kebutuhan Perangkat Lunak, Arsitektur Modular, & Panduan Vibe Coding AI Agent (Updated & Modularized Architecture)**
> Proyek: **CAKRAWALA** (*“Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara”*)
> Arsitektur: Modern Client-Side Web Architecture (Vite Multi-Page App (MPA) with HTML Component Includer, Environment Variables (.env), HTML5, Tailwind CSS, Vanilla JavaScript ES6+ Feature-Driven Modules, Supabase PostgreSQL, `html5-qrcode`, QRCode.js, GSAP, & AOS)

---

## 1. Visi Produk & Ringkasan Eksekutif

**CAKRAWALA** adalah sistem otomasi perpustakaan terintegrasi yang menjembatani layanan digital daring dan operasional meja sirkulasi fisik. Sistem ini dibangun untuk memenuhi 4 pilar utama:

1. **Katalog Publik & Kiosk Anjungan Mandiri (`public/index.html`):** Memfasilitasi pengunjung/siswa mencari buku, mengecek ketersediaan stok, melihat nomor rak fisik, dan membaca pengumuman kampus secara transparan tanpa kewajiban login.
2. **Portal Anggota Siswa & Guru (`public/siswa-guru/`):** Pemesanan buku mandiri (pra-pinjam), pemantauan buku aktif, cek sisa hari jatuh tempo, tiket bukti booking resmi (QR Code 2D), kartu anggota digital resmi, dan rekap denda mandiri.
3. **Meja Operasional Petugas (`public/petugas/`):** Pemrosesan sirkulasi cepat (penyortiran antrean pra-pinjam dengan status kesiapan rak *"Perlu Diambil"* vs *"Buku Siap di Meja"*, verifikasi QR tiket, peminjaman langsung *walk-in*, pengembalian cerdas berbasis nama peminjam, pemisahan meja tunggakan denda + verifikasi 2 lapis pelunasan tunai), modul **CRUD Buku (dengan cetak stiker QR)**, **Master Kategori Koleksi**, dan **CRUD Pengumuman**.
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
| **QR Code Engine** | `QRCode.js` | Menghasilkan QR Code 2D resolusi tinggi untuk tiket booking daring, kartu anggota digital, dan stiker label fisik buku. |
| **Pemindai Kamera** | Library `html5-qrcode` | Membaca stiker QR fisik buku dan QR tiket langsung melalui webcam/kamera laptop di meja sirkulasi. |

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

## 4. Alur Bisnis & Spesifikasi Operasional Dashboard Petugas

Dashboard Petugas dirancang dengan pendekatan **5 Meja Kerja Terintegrasi (*Feature-Driven Desk*)** ditambah **1 Modul Pemindai Universal (Scanner)** untuk memastikan layanan meja sirkulasi fisik berjalan cepat, akurat, dan bebas kertas (*paperless*):

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

### 4.1. Meja 1: Overview & KPI Operasional Perpustakaan
1. **Kartu Ringkasan Indikator Kinerja Utama (KPI Cards):**
   - **Peminjaman Aktif:** Jumlah total buku fisik yang saat ini sedang dibawa pulang oleh anggota (status `'Dipinjam'`).
   - **Antrean Pra-Pinjam:** Jumlah reservasi buku online yang sedang menunggu pengambilan dari rak dan verifikasi meja (status `'Menunggu'`).
   - **Pengembalian Hari Ini:** Akumulasi buku yang berhasil dikembalikan ke perpustakaan pada tanggal kalender hari ini.
   - **Kas Denda Tertunda:** Total akumulasi nominal rupiah denda yang masih menunggak (status `'Belum Lunas'`).
2. **Indikator Jam Layanan & Operasional Real-Time:**
   - Menampilkan status dinamis perpustakaan (*"Layanan Meja Buka"* vs *"Layanan Meja Tutup"*) berdasarkan jam lokal (07.30 – 15.30 WIB).
3. **Antrean Cepat Prapinjam (Quick Desk):**
   - Panel ringkas di beranda yang menampilkan daftar buku yang harus segera diambil petugas dari rak fisik tanpa perlu membuka tab sirkulasi.
4. **Pintasan Aksi Cepat (Quick Actions):**
   - Tombol shortcut satu-klik langsung menuju: *Peminjaman Walk-in Langsung*, *Buka Pemindai Barcode/QR Kamera*, *Tambah Buku Baru*, dan *Buat Pengumuman Agenda*.

---

### 4.2. Meja 2: Sirkulasi Peminjaman Buku Fisik

#### A. Aturan Kuota Peminjaman Aktif (Maksimal 2 Buku)
1. Setiap anggota (Siswa maupun Guru) dibatasi maksimal **2 buku aktif sekaligus**.
2. Yang dihitung dalam kuota aktif:
   - Buku dalam antrean reservasi online (status `'Menunggu'`).
   - Buku fisik yang sedang dipinjam (status `'Dipinjam'`).
3. Jika kuota telah mencapai 2/2, sistem otomatis mengunci permohonan pinjaman baru (*disabled*) hingga anggota mengembalikan buku yang dipinjam atau membatalkan reservasi.

#### B. Sub-tab 1: Verifikasi Pra-Pinjam (Reservasi Daring)
1. **Penyortiran Buku dari Rak Fisik:**
   - Petugas memantau daftar pesanan buku yang dilengkapi lokasi rak fisik (contoh: *Rak 3B - Sains*).
   - Dilengkapi filter kesiapan: *Semua*, *Perlu Diambil dari Rak*, dan *Buku Siap di Meja*.
   - Petugas mengklik tombol **"Tandai Siap di Meja"** setelah mengambil buku dari rak, yang otomatis memperbarui status tiket di dashboard peminjam menjadi badge hijau (*"Buku Siap Diambil"*).
2. **Verifikasi Tiket & Serah Terima Buku:**
   - Peminjam datang membawa Tiket Barcode (Code-128 / QR Code).
   - Petugas memindai tiket atau menekan tombol **"Verifikasi Tiket"** $\rightarrow$ Muncul pop-up modal `#modalVerifyPrapinjam`.
   - Petugas memvalidasi identitas peminjam dan menekan tombol **"Serahkan Buku"**:
     - Status transaksi beralih dari `'Menunggu'` $\rightarrow$ `'Dipinjam'`.
     - Stok buku fisik di database dipotong 1.
3. **Pembatalan / Penolakan Reservasi:**
   - Petugas dapat menolak pesanan jika fisik buku di rak mengalami kerusakan tak terduga, dengan dialog konfirmasi pembatalan.

#### C. Sub-tab 2: Antrean Pinjaman Aktif
1. Menampilkan seluruh daftar buku fisik yang sedang beredar di tangan siswa dan guru.
2. Dilengkapi badge status jatuh tempo: *Tepat Waktu*, *Batas Tempo Hari Ini*, atau *Terlambat X Hari*.
3. **Pintasan Cepat:** Tombol **"Kembalikan Buku Ini"** langsung mengarahkan dan memilihkan transaksi peminjaman ke Meja Pengembalian tanpa perlu mengetik ulang ID.

#### D. Sub-tab 3: Peminjaman Langsung di Tempat (Walk-In Desk)
1. **Pemilih Anggota Cerdas (Member Picker):**
   - Dropdown autocomplete pencarian nama, NISN siswa, kelas, atau NIP guru.
   - Sistem otomatis memeriksa kuota aktif anggota sebelum transaksi dimulai.
2. **Keranjang Peminjaman Walk-In:**
   - Petugas memilih 1 hingga 2 buku dari koleksi perpustakaan atau memindai barcode stiker buku.
   - Sistem otomatis menghitung estimasi batas kembali default (+7 hari kalender).
3. **Eksekusi Peminjaman:**
   - Transaksi langsung dicatat sebagai `'Dipinjam'` dengan metode `'Scan QR'` / manual dan stok buku otomatis terpotong.

---

### 4.3. Meja 3: Pengembalian Buku & Denda

#### A. Formulir Penerimaan Pengembalian (Sisi Kiri Meja 3)
1. **Pencarian Peminjam Berbasis Anggota (*Member-First Desk*):**
   - Petugas cukup mengetik nama peminjam pada `#inputSearchPeminjamPengembalian`.
   - Sistem secara otomatis menampilkan 1–2 buku yang saat ini **sedang aktif dipinjam** oleh anggota tersebut. Jika hanya meminjam 1 buku, buku terpilih secara otomatis.
2. **Pencarian Cepat via Barcode Buku Fisik (`filterPengembalianByBook`):**
   - Petugas dapat langsung memindai stiker QR pada buku fisik menggunakan kamera/scanner. Sistem otomatis mencocokkan siapa anggota yang memegang buku tersebut.
3. **Kustomisasi Tarif Denda Harian:**
   - Disediakan input dinamis `#inputTarifDendaPerHari` (default: Rp 1.000 / hari). Petugas berwenang mengubah tarif denda harian sesuai kebijakan perpustakaan.
4. **Aturan Khusus Keterlambatan $\ge$ 1 Bulan (30 Hari):**
   - Jika hari keterlambatan mencapai $\ge$ 30 hari (1 bulan), **penghitungan denda harian dinonaktifkan secara otomatis**.
   - Sistem mengganti denda keterlambatan menjadi nominal **seharga buku fisik** (`harga_buku` dari database atau default Rp 50.000).
   - Di formulir muncul banner peringatan merah khusus dan label tarif berubah menjadi `(Ganti Buku)`.
   - Di dashboard Siswa/Guru, muncul badge peringatan berkedip dan keterangan denda ganti buku fisik.
5. **Kompensasi Kondisi Fisik Buku:**
   - **Baik:** Denda kerusakan Rp 0.
   - **Rusak (Ringan/Sedang):** Denda kompensasi perbaikan sebesar +50% dari harga buku fisik.
   - **Hilang / Rusak Berat:** Denda ganti rugi penuh sebesar +100% dari harga buku fisik.
6. **Eksekusi Transaksi Pengembalian:**
   - Petugas memilih status pembayaran denda: **Lunas (Tunai)** atau **Belum Lunas (Menunggak)**.
   - Klik **"Selesaikan Pengembalian Buku"**:
     - Status transaksi peminjaman diubah menjadi `'Selesai'`.
     - Stok buku fisik di database bertambah kembali (+1), kecuali jika buku dilaporkan Hilang.
     - Diterbitkan pop-up **Struk Tanda Terima Resmi** (`#modalReceipt`) yang memuat nomor resi, rincian denda, dan tombol cetak struk fisik (`window.print()`).
     - Jika denda belum lunas, otomatis masuk ke antrean **Kasir Tunggakan Denda**.

#### B. Operasional Kasir Tunggakan & Riwayat Pengembalian (Sisi Kanan Meja 3)
1. **Sub-tab 1: Kasir Tunggakan Denda (`#tabBtnTunggakanDenda`):**
   - Menampilkan kartu tagihan siswa/guru yang dendanya berstatus `'Belum Lunas'`.
   - Ringkasan total uang denda yang masih tertunda (Rp) dan jumlah transaksi menunggak.
   - Input pencarian khusus kasir untuk menemukan nama siswa yang datang membawa uang tunai.
   - Tombol **"Lunasi Tunai"** membuka modal konfirmasi pelunasan 2 lapis.
2. **Verifikasi 2 Lapis Kas Fisik:**
   - Pada `#modalKonfirmasiLunasiDenda`, petugas **wajib mencentang kotak persetujuan**: *"Saya telah menerima uang tunai dari peminjam"*.
   - Tombol eksekusi pelunasan baru aktif setelah kotak dicentang demi memastikan uang tunai benar-benar ada di meja sirkulasi.
3. **Fitur Darurat Batal Lunas (*Safety Rollback*):**
   - Jika petugas salah mengeklik tombol lunas padahal uang belum diterima, sistem menyediakan tombol **"Batal Lunas"** untuk mengembalikan status denda kembali ke `'Belum Lunas'`.
4. **Sub-tab 2: Semua Riwayat Pengembalian (`#tabBtnSemuaRiwayat`):**
   - Menampilkan seluruh arsip log transaksi pengembalian buku di perpustakaan.
   - Dilengkapi filter pencarian instan berdasarkan nama peminjam (Siswa/Guru), ID NISN/NIP, kode resi pengembalian (`KB-XXXXXX`), atau judul buku.

---

### 4.4. Meja 4: Inventaris Koleksi Buku & Stiker Label QR
1. **Tabel Master Katalog Buku:**
   - Menampilkan foto cover buku, judul, pengarang, penerbit, tahun terbit, stok, nomor rak fisik, dan harga buku.
   - Live search instan dan filter dropdown kategori buku dari database Supabase.
2. **Formulir Tambah & Edit Buku (`#modalBookForm`):**
   - Pembuatan ID Buku unik otomatis (`BK-AUTO`) dan string QR Code otomatis.
   - Pengunggahan foto sampul buku via drag-and-drop / file browser langsung ke Supabase Storage wadah `covers`.
   - Sinkronisasi dinamis pilihan kategori dari tabel `data_kategori`.
3. **Generator & Pencetak Stiker Label QR Code (`#modalQrCode`):**
   - Merender stiker label perpustakaan standar: Logo Cakrawala, judul buku, kode QR 2D resolusi tinggi (`QRCode.js`), dan ID buku.
   - Tombol **"Cetak Label"** untuk mencetak langsung ke printer stiker barcode via `window.print()`.
   - Tombol **"Download PNG"** untuk menyimpan file gambar stiker resolusi tinggi.
4. **Hapus Buku (`#modalDeleteBook`):**
   - Modal konfirmasi penghapusan dengan **proteksi integritas data**: Sistem menolak penghapusan buku jika buku tersebut sedang dalam status aktif dipinjam oleh anggota.

---

### 4.5. Meja 5: Pengumuman & Broadcast Agenda Sekolah
1. **Manajemen Berita & Acara:**
   - Menampilkan daftar pengumuman perpustakaan beserta badge status acara (*Mendatang* / *Selesai*), tanggal event, dan pratinjau thumbnail poster.
   - Seluruh pengumuman otomatis tersinkronisasi secara real-time ke Landing Page publik (`public/index.html`) dan Beranda Siswa/Guru.
2. **Formulir Pengumuman (`#modalPengumumanForm`):**
   - Input judul acara, kategori, tanggal pelaksanaan, dan link informasi eksternal.
   - Pengunggahan gambar poster resmi ke Supabase Storage wadah `posters`.
3. **Hapus Pengumuman (`#modalDeletePengumuman`):**
   - Modal konfirmasi penghapusan pengumuman dari database.

---

### 4.6. Fitur Pendukung Terintegrasi: Pemindai Universal Barcode & QR Scanner
1. **Dual-Engine Pemindai Kamera:**
   - Menggunakan webcam / kamera laptop dengan engine ganda (`Html5QrcodeScanner` dan fallback `jsQR` loop) untuk mendeteksi barcode 1D dan QR Code 2D dalam kondisi pencahayaan rendah.
2. **Pengunggah Berkas Gambar (`fileDecoder.js`):**
   - Petugas dapat mengunggah tangkapan layar atau foto barcode/QR langsung ke dialog modal scanner.
3. **Audio Feedback Real-Time (`soundFeedback.js`):**
   - Menghasilkan nada suara *beep* sukses menggunakan Web Audio API tanpa membutuhkan file audio eksternal (`.mp3`).
4. **Smart Routing Hasil Scan (`scanRouter.js`):**
   - **Jika memindai Tiket Pra-Pinjam (`PJ-...`):** Sistem otomatis membuka modal verifikasi serah terima Meja 2 Sirkulasi.
   - **Jika memindai Stiker Buku (`BK-...`):** Sistem secara cerdas mengarahkan ke Meja Pengembalian (jika tab aktif adalah Pengembalian) atau ke Keranjang Walk-In (jika tab aktif adalah Sirkulasi).

---

## 5. Alur Bisnis & Spesifikasi Operasional Portal Siswa & Guru

Portal Siswa & Guru (`public/siswa-guru/`) dirancang dengan pendekatan **Self-Service Library Portal** yang interaktif, ramah perangkat seluler (*mobile-responsive*), dan terintegrasi penuh secara *real-time* dengan Meja Kerja Petugas. Portal ini dibagi menjadi **5 Tab Layanan Mandiri**:

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

---

### 5.1. Tab 1: Beranda & Ringkasan Pribadi

#### A. 4 Kartu Indikator Kinerja Pribadi (Personal KPI Cards)
1. **Buku Sedang Dipinjam:** Menampilkan kuantitas buku fisik yang sedang dibawa pulang oleh anggota (status `'Dipinjam'`).
2. **Reservasi Pra-Pinjam:** Menampilkan kuantitas pesanan booking daring yang sedang diproses atau menunggu serah terima di perpustakaan (status `'Menunggu'`).
3. **Riwayat Selesai:** Total akumulasi buku yang pernah dipinjam dan telah berhasil dikembalikan dengan status `'Kembali'`.
4. **Status Denda:** Indikator visual real-time apakah anggota berstatus *"Bebas Denda"* (badge hijau) atau memiliki tunggakan kasir yang belum diselesaikan (badge merah disertai total nominal denda).

#### B. Sistem Deteksi & Banner Peringatan Denda Interaktif (`banner-denda.html`, `overview.js`)
Sistem secara otomatis menganalisis status transaksi peminjam setiap kali halaman dimuat:
1. **Peringatan Denda Menunggak Belum Lunas (`unpaidFines`):**
   - Muncul otomatis jika anggota memiliki denda yang belum dibayar dari pengembalian sebelumnya.
   - Menampilkan total tagihan rupiah dan arahan untuk segera melunasi ke Meja Kasir Petugas Perpustakaan.
2. **Peringatan Keterlambatan Berjalan (1 – 29 Hari):**
   - Menghitung denda harian berjalan berdasarkan selisih tanggal jatuh tempo dengan hari ini dikalikan tarif harian perpustakaan (default: Rp 1.000 / hari).
3. **Peringatan Kritis Keterlambatan $\ge$ 30 Hari (1 Bulan):**
   - Jika keterlambatan buku fisik telah mencapai atau melampaui 30 hari kalender, sistem **menonaktifkan penghitungan denda per hari** dan menggantinya dengan **nominal denda penuh seharga buku fisik (`harga_buku`)**.
   - Muncul **Red Alert Banner Khusus** di bagian teratas beranda:
     > *"⚠️ Perhatian: Peminjaman buku Anda telah terlambat lebih dari 30 hari. Perhitungan denda harian dinonaktifkan dan nominal denda disesuaikan penuh dengan harga penggantian buku fisik (Rp [harga_buku]). Harap segera temui petugas perpustakaan!"*

#### C. Countdown Jatuh Tempo & Pengumuman Sekolah
1. **Hitung Mundur Jatuh Tempo (Due Date Countdown):**
   - Menghitung sisa hari pengembalian untuk buku pinjaman yang paling dekat dengan batas waktu.
   - Memberikan badge status peringatan: *Aman* (sisa > 3 hari), *Mendekati Batas* ($\le$ 2 hari), *Batas Tempo Hari Ini*, atau *Terlambat X Hari*.
2. **Slider Agenda & Pengumuman Sekolah:**
   - Menampilkan banner pengumuman kegiatan literasi, bedah buku, jam operasional perpustakaan, atau agenda kampus yang dipublikasikan dari Meja 5 Petugas.
3. **Pintasan Akses Cepat (Quick Access):**
   - Tombol langsung untuk melihat rincian buku yang sedang dipinjam atau langsung menelusuri katalog koleksi baru.

---

### 5.2. Tab 2: Eksplorasi Katalog Koleksi Buku & Reservasi Daring

#### A. Mesin Pencarian & Filter Koleksi Cerdas (`katalogGrid.js`)
1. **Live Search Real-Time:**
   - Pencarian instan berdasarkan judul buku, nama pengarang/penulis, atau nomor ISBN.
2. **Filter Multi-Kategori:**
   - Dropdown pemilihan kategori koleksi buku (misal: *Sains & Teknologi*, *Sastra & Fiksi*, *Sejarah*, *Ensiklopedia*, dll.).
3. **Pengurutan Koleksi (Sorting):**
   - Mengurutkan daftar buku berdasarkan *Terbaru Ditambahkan*, *Paling Sering Dipinjam*, atau *Alfabet (A-Z / Z-A)*.

#### B. Kartu Koleksi Buku & Informasi Rak Fisik
1. Setiap kartu buku menampilkan foto sampul berkualitas, judul buku, nama pengarang, kategori, serta badge ketersediaan (*"Tersedia: X Eksemplar"* vs *"Sedang Dipinjam Semua"*).
2. **Penunjuk Lokasi Rak Fisik:**
   - Menampilkan nomor rak spesifik di ruangan perpustakaan (contoh: *Rak 3B - Sains*) sehingga peminjam dapat mengetahui lokasi fisik buku secara transparan sebelum memesan.

#### C. Modal Rincian Koleksi Buku (`#modalDetailBuku`, `modalDetailBuku.js`)
1. **Informasi Lengkap Buku:**
   - Menampilkan sinopsis buku, nomor ISBN, nama penerbit, tahun terbit, nomor rak fisik, serta **Harga Buku Fisik**.
   - Pencantuman harga buku memberikan transparansi penuh kepada siswa/guru mengenai nilai buku dan nilai ganti rugi jika terjadi kehilangan atau keterlambatan $> 30$ hari.
2. **Mekanisme & Validasi Booking Pra-Pinjam:**
   - **Validasi Kuota Peminjaman Aktif (Maksimal 2 Buku):**
     - Sistem menjumlahkan buku yang sedang dibawa pulang (`status = 'Dipinjam'`) + buku yang sedang direservasi (`status = 'Menunggu'`).
     - Jika total kuota aktif telah mencapai $\ge 2$, tombol **"Booking Buku Ini"** otomatis dinonaktifkan (*disabled*) dengan teks penjelas *"Kuota Peminjaman Penuh (Maks. 2 Buku)"*.
   - **Validasi Stok Fisik:**
     - Jika stok buku yang tersedia adalah 0, tombol booking dinonaktifkan dengan status *"Stok Sedang Kosong"*.
   - **Validasi Tunggakan Denda:**
     - Jika anggota memiliki catatan denda yang belum dilunasi, sistem memunculkan konfirmasi peringatan agar anggota menyelesaikan denda terlebih dahulu.

---

### 5.3. Modul Reservasi Mandiri, Tiket Digital Barcode & Pembatalan

#### A. Dialog Konfirmasi Booking (`modalBooking.js`)
1. Mengklik tombol booking pada buku yang valid akan membuka dialog pop-up `#modalBookingKonfirmasi`.
2. Menampilkan informasi ringkasan buku, tanggal reservasi hari ini, batas toleransi pengambilan fisik di meja sirkulasi (maksimal 1x24 jam operasional perpustakaan).
3. Setelah konfirmasi diklik:
   - Data transaksi baru dicatat di database Supabase dengan status `'Menunggu'` dan metode `'Booking'`.
   - Kuota peminjaman aktif anggota seketika terpakai.
   - Sistem langsung menampilkan **Modal Tiket Pra-Pinjam Digital**.

#### B. Tiket Pra-Pinjam Digital QR Code (`modalTiket.js`)
1. **Format Identitas Unik Tiket:**
   - Memiliki nomor transaksi unik berformat `PJ-[TANGGAL]-[KODE]`.
2. **Rendering QR Code 2D Resolusi Tinggi (`QRCode.js`):**
   - Merender **QR Code 2D** menggunakan pustaka `QRCode.js` (mudah dipindai menggunakan pemindai kamera webcam laptop / smartphone meja petugas).
3. **Indikator Kesiapan Rak Real-Time:**
   - **Badge Oranye (*"Menunggu Diambil Petugas dari Rak"*):** Menandakan pesanan baru masuk dan petugas belum mengambil buku dari rak koleksi.
   - **Badge Hijau (*"Buku Siap Diambil di Meja Sirkulasi"*):** Menandakan petugas Meja 2 telah mengambil buku dari rak dan menyiapkannya di meja serah terima. Anggota dapat langsung mendatangi meja sirkulasi.
4. **Fitur Ekspor Tiket Menjadi Gambar (Download PNG via Canvas):**
   - Disediakan tombol **"Unduh Tiket (PNG)"** yang menggabungkan seluruh elemen visual tiket, QR code, nama buku, dan identitas anggota ke dalam berkas grafis PNG menggunakan HTML5 Canvas.
   - Memungkinkan siswa/guru menyimpan tiket secara luring (*offline*) di galeri handphone atau mencetaknya tanpa bergantung pada koneksi internet sekolah.

#### C. Pembatalan Reservasi Mandiri (`modalBatalBooking.js`)
1. Jika siswa/guru berhalangan atau berubah pikiran, mereka dapat membatalkan pesanan secara mandiri dengan menekan tombol **"Batalkan Reservasi"** selama statusnya masih `'Menunggu'`.
2. Konfirmasi pembatalan akan memperbarui status transaksi menjadi `'Dibatalkan'`.
3. Kuota peminjaman aktif anggota seketika dipulihkan kembali (menjadi 0/2 atau 1/2) sehingga dapat digunakan untuk meminjam buku lain.

---

### 5.4. Tab 3: Pinjaman & Reservasi Saya

#### A. Sub-tab 1: Buku Fisik Sedang Dipinjam (`pinjamanAktif.js`)
1. Menampilkan seluruh koleksi buku fisik yang saat ini sedang dibawa pulang oleh siswa/guru.
2. Rincian data kartu mencakup: Sampul buku, judul, tanggal mulai pinjam, batas akhir jatuh tempo (*due date*), serta nomor rak pengembalian.
3. **Pemantauan Keterlambatan & Denda Berjalan:**
   - **Status Tepat Waktu:** Badge hijau dengan estimasi sisa hari pengembalian.
   - **Terlambat 1 – 29 Hari:** Badge oranye/merah yang menampilkan jumlah hari keterlambatan beserta kalkulasi denda harian berjalan (misal: *Terlambat 5 Hari - Denda Berjalan Rp 5.000*).
   - **Terlambat $\ge$ 30 Hari (1 Bulan):** Badge merah tua pekat dengan notifikasi:
     > *"⚠️ Denda Ditutup: Menunggak $\ge$ 30 Hari. Denda disesuaikan penuh seharga buku fisik (Rp [harga_buku]). Harap segera kembalikan buku ke Meja 3 Petugas."*

#### B. Sub-tab 2: Daftar Reservasi / Pra-Pinjam Aktif (`pinjamanPrapinjam.js`)
1. Menampilkan seluruh antrean booking online yang belum diambil di meja sirkulasi.
2. Setiap kartu pesanan dilengkapi tombol **"Lihat Tiket Barcode"** (membuka kembali dialog modal tiket) dan tombol **"Batalkan Booking"**.

---

### 5.5. Tab 4: Riwayat Peminjaman & Buku Kas Denda Pribadi

#### A. Arsip Historis Pengembalian Buku (`riwayat.js`, `tab-riwayat.html`)
1. Menampilkan seluruh catatan transaksi peminjaman buku yang telah selesai dikembalikan ke perpustakaan (status transaksi `'Kembali'`).
2. Menampilkan tanggal pinjam, batas tempo, tanggal pengembalian aktual, serta catatan kepatuhan (*"Kembali Tepat Waktu"* atau *"Terlambat X Hari"*).

#### B. Transparansi Catatan Kas Denda Transaksi
1. **Status Bebas Denda:**
   - Diberikan pada peminjaman yang kembali tepat waktu dengan nilai denda Rp 0.
2. **Status Denda Lunas:**
   - Menampilkan nominal denda keterlambatan/kerusakan yang telah berhasil dibayarkan dan diverifikasi oleh petugas di Meja Kasir Tunggakan dengan badge hijau bertuliskan *"Lunas"*.
3. **Status Denda Belum Lunas (Tunggakan Aktif):**
   - Menampilkan nominal denda yang dicatat saat pengembalian buku namun pembayarannya ditangguhkan.
   - Badge merah tebal *"Belum Lunas"* mengingatkan anggota untuk segera melunasi kewajiban finansialnya di Meja Petugas.

#### C. Filter & Pencarian Riwayat
1. **Live Search:** Pencarian cepat berdasarkan judul buku atau kode transaksi peminjaman.
2. **Filter Status Denda:** Memilah tampilan riwayat berdasarkan: *Semua Riwayat*, *Bebas Denda*, *Denda Lunas*, atau *Tunggakan Belum Lunas*.

---

### 5.6. Tab 5: Profil Anggota & Kartu Digital Perpustakaan

#### A. Kartu Anggota Digital Resmi (*Smart Digital Library Card*, `kartuAnggota.js`)
1. **Desain Kartu Identitas Perpustakaan:**
   - Didesain menyerupai kartu tanda anggota fisik modern dengan gradien elegan, logo resmi perpustakaan Cakrawala, dan nama institusi sekolah.
   - Menampilkan foto profil pengguna, Nama Lengkap, Nomor Induk (NISN untuk Siswa / NIP untuk Guru), Kelas/Jabatan, dan Status Keanggotaan Aktif.
2. **QR Code Anggota Unik 2D:**
   - Menghasilkan QR Code dinamis berbasis ID Anggota / NISN menggunakan pustaka `QRCode.js`.
   - **Integrasi Meja Sirkulasi:** QR Code pada layar smartphone ini dapat langsung dipindai oleh Petugas Perpustakaan saat siswa/guru melakukan peminjaman langsung di tempat (Walk-In) atau saat check-in kehadiran di kiosk mandiri perpustakaan.
3. **Fitur Unduh Kartu Anggota:**
   - Anggota dapat mengunduh kartu digital dalam format gambar untuk disimpan di ponsel cerdas masing-masing.

#### B. Pengaturan Profil & Keamanan Akun (`pengaturanProfil.js`)
1. **Pembaruan Kontak Pribadi:**
   - Anggota dapat memperbarui nomor kontak WhatsApp aktif dan alamat surel (email) agar memudahkan komunikasi pemberitahuan keterlambatan atau ketersediaan buku.
2. **Manajemen Kata Sandi (Password):**
   - Formulir mandiri untuk memperbarui kata sandi akun dengan validasi: kata sandi saat ini, kata sandi baru, dan konfirmasi kata sandi baru.
3. **Fitur Keluar Sesi (Logout):**
   - Tombol logout aman yang membersihkan token otentikasi sesi di peramban dan mengalihkan pengguna kembali ke halaman utama login.

---

## 6. Alur Bisnis & Spesifikasi Operasional Dashboard Admin

Dashboard Admin (`public/admin/`) dirancang sebagai **Pusat Kendali Pengguna Terpusat (User Management Control Center)** yang bertindak sebagai otoritas tertinggi (*Super Administrator*) dalam mengelola akun autentikasi dan master profil dari seluruh entitas sistem: Siswa, Guru, dan Petugas Perpustakaan.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PUSAT KENDALI ADMINISTRATOR (SUPER ADMIN)                       │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│           TAB 1            │           TAB 2            │            TAB 3             │
│      MANAJEMEN SISWA       │       MANAJEMEN GURU       │      MANAJEMEN PETUGAS       │
│  (NISN, Kelas, Kredensial, │  (NIP, Mapel, Kredensial,  │ (ID Petugas, Otorisasi Meja, │
│     Reset Kata Sandi)      │     Reset Kata Sandi)      │      Reset Kata Sandi)       │
└────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

---

### 6.1. Otorisasi Akses & Keamanan Sesi Super Administrator (`auth.js`)
1. **Pemeriksaan Sesi & Role Guard:**
   - Setiap kali halaman dashboard admin dimuat, sistem memanggil fungsi `initSessionAndAdmin()` dari modul `auth.js`.
   - Mengambil identitas sesi dari `sessionStorage` / `localStorage` dan memverifikasi kolom `role === 'Admin'`.
   - Jika pengguna belum terotentikasi atau mencoba masuk dengan hak akses selain Administrator (misal: Siswa atau Guru), sistem secara otomatis menghentikan akses dan mengarahkan (*redirect*) ke `login.html` disertai notifikasi toast peringatan keamanan.
2. **Kapsul Identitas Administrator:**
   - Bagian bawah sidebar menampilkan avatar inisial (*AD*), nama pengguna administrator aktif, dan indikator status *Online* berdenyut (*pulse*).
3. **Modal Keluar Sesi Universal (Logout Controller):**
   - Tombol keluar memicu dialog modal konfirmasi keluar. Setelah dikonfirmasi, seluruh token otentikasi dibersihkan secara aman.

---

### 6.2. Tab 1: Manajemen Data Siswa (`state.activeTab = 'siswa'`)
1. **Penyajian Data Tabel Terstruktur:**
   - Menampilkan daftar seluruh siswa yang terdaftar di sistem dengan kolom:
     *No, NISN Siswa, Nama Siswa, Kelas, Email, No. Kontak / WA, Username Akun, dan Tombol Aksi*.
2. **Formulir Tambah Siswa Baru (`openAddModal`):**
   - **NISN Siswa:** Input numerik maksimal 10 digit (kunci primer entitas siswa).
   - **Kelas:** Tingkat dan rombongan belajar (contoh: *XII MIPA 1*).
   - **Nama Lengkap Siswa:** Nama resmi siswa (maksimal 50 karakter).
   - **Email & Kontak Siswa:** Surel aktif dan nomor WhatsApp untuk keperluan notifikasi peminjaman.
   - **Kredensial Akun:** Input Username unik dan Password akun login awal (minimal 6 karakter).
3. **Formulir Edit Data Siswa (`openEditModal`):**
   - Field **NISN Siswa** otomatis dikunci dalam mode *Read-Only* (*disabled*) untuk menjaga integritas relasi data transaksi peminjaman di database.
   - Administrator dapat memperbarui nama, kelas, email, nomor kontak, serta username akun siswa.
   - **Reset Password Mandiri:** Disediakan field password opsional. Jika diisi $\ge$ 6 karakter, password siswa langsung di-reset. Jika dikosongkan, password akun yang lama tetap dipertahankan.

---

### 6.3. Tab 2: Manajemen Data Guru (`state.activeTab = 'guru'`)
1. **Penyajian Data Tabel Guru:**
   - Menampilkan daftar guru terdaftar dengan kolom:
     *No, NIP Guru, Nama Guru & Gelar, Mata Pelajaran, Email, No. Kontak / WA, Username Akun, dan Tombol Aksi*.
2. **Formulir Tambah Guru Baru:**
   - **NIP Guru:** Nomor Induk Pegawai 20 digit (kunci primer entitas guru).
   - **Mata Pelajaran:** Bidang studi yang diampu (contoh: *Bahasa Indonesia*, *Fisika*).
   - **Nama Lengkap & Gelar:** Nama resmi beserta gelar akademik (contoh: *Dr. Budi Santoso, M.Pd.*).
   - **Email & Kontak Guru:** Kontak resmi guru pengajar.
   - **Kredensial Akun:** Pembuatan username dan password awal.
3. **Formulir Edit Data Guru:**
   - Field **NIP Guru** dikunci dalam mode *Read-Only*.
   - Admin dapat memperbarui biodata, mata pelajaran, kontak, username, serta melakukan reset password akun guru kapan saja jika guru mengalami kendala lupa kata sandi.

---

### 6.4. Tab 3: Manajemen Data Petugas Perpustakaan (`state.activeTab = 'petugas'`)
1. **Penyajian Data Tabel Petugas:**
   - Menampilkan staf pustakawan yang memiliki otorisasi operasional sirkulasi dengan kolom:
     *No, ID Petugas, Nama Petugas, Email, No. Kontak / WA, Username Akun, dan Tombol Aksi*.
2. **Formulir Tambah Petugas Baru:**
   - **ID Petugas Otomatis:** Sistem secara cerdas mengisikan format ID petugas standar perpustakaan secara otomatis (contoh: `PTG...`).
   - **Nama Lengkap & Kontak:** Identitas staf sirkulasi perpustakaan.
   - **Kredensial Otorisasi:** Username dan password untuk mengakses 5 Meja Kerja Petugas.
3. **Formulir Edit Data Petugas:**
   - Field **ID Petugas** dikunci dalam mode *Read-Only*.
   - Admin dapat memperbarui identitas, kontak, username, dan me-reset password akun petugas sirkulasi.

---

### 6.5. Logika Transaksi Data Relasional & Keamanan (Two-Phase Commit & Rollback)

Untuk menjaga konsistensi database Supabase tanpa meninggalkan *ghost/orphan account*, modul admin menerapkan arsitektur transaksi bertahap (*two-phase execution*):

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 ALUR TRANSAKSI PENAMBAHAN PENGGUNA BARU (2-PHASE COMMIT)               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. VALIDASI INPUT    ──> Cek kelengkapan field, panjang password min. 6 karakter        │
│ 2. GENERATE ID_USER  ──> Buat ID acak unik (contoh: U9XYZ12345) muat dalam VARCHAR(10) │
│ 3. INSERT TAHAP 1    ──> Simpan kredensial ke tabel sentral 'data_user' (role diset)   │
│                          │                                                             │
│                          ├── GAGAL: Batalkan & tampilkan pesan username duplikat       │
│                          └── SUKSES: Lanjut ke Tahap 2                                 │
│                                                                                        │
│ 4. INSERT TAHAP 2    ──> Simpan profil ke 'data_siswa' / 'data_guru' / 'data_petugas'  │
│                          │                                                             │
│                          ├── SUKSES: Tutup modal & tampilkan notifikasi toast sukses   │
│                          └── GAGAL:  [KOMPENSASI ROLLBACK OTOMATIS]                    │
│                                      Sistem seketika menghapus baris 'data_user' yang  │
│                                      baru dibuat agar database tetap bersih & higienis │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Alur Perubahan Data & Reset Password Cerdas (`handleAddUserSubmit`):**
   - Dalam mode edit, sistem memperbarui record `data_user` (username dan password baru bila diisi) sekaligus memperbarui tabel entitas profil terkait dalam satu proses terkoordinasi.
   - Jika username yang dimasukkan telah dipakai pengguna lain, sistem menangkap kode error unique constraint (`23505`) dan memunculkan peringatan yang ramah pengguna.
2. **Alur Penghapusan Pengguna Aman (Cascading Deletion, `handleConfirmDelete`):**
   - Menghindari penghapusan tidak sengaja dengan menampilkan modal konfirmasi bahaya `#modalDeleteConfirm` yang mencantumkan nama dan peran entitas secara jelas.
   - Eksekusi penghapusan dilakukan langsung pada entitas induk `data_user` (`.eq('id_user', id_user)`). Relasi foreign key di database secara otomatis membersihkan profil siswa, guru, atau petugas secara bersih (*clean cascade*).

---

### 6.6. Fitur Pendukung Produktivitas & Antarmuka Responsif Admin

1. **Mesin Filter & Live Search Multi-Field (`table.js`):**
   - Pencarian real-time tanpa perlu me-reload peramban.
   - Mencari kecocokan secara simultan di seluruh field: Nama Lengkap, Nomor Induk (NISN/NIP/ID), Kelas/Mata Pelajaran, Email, dan Username akun.
   - Dilengkapi tombol reset pencarian (*clear button*) dengan pintasan tombol `Esc`.
2. **Animasi Skeleton Loading Shimmer:**
   - Saat proses pengambilan data dari cloud Supabase berlangsung, tabel menampilkan animasi placeholder skeleton 5 baris yang halus, menggantikan penggunaan spinner generik yang kaku.
3. **Indikator Jumlah Data Dinamis (Badge Counters):**
   - Menghitung dan menyinkronkan total kuantitas siswa, guru, dan petugas secara otomatis pada tab navigasi.
4. **Pembaruan Data Cepat (Force Refresh Button):**
   - Tombol sinkronisasi cepat (`btnRefreshData`) yang menarik data terbaru dari Supabase tanpa kehilangan posisi tab aktif saat ini.
5. **Sidebar Kapsul Responsif Seluler:**
   - Navigasi samping yang dapat disembunyikan (*collapsible off-canvas drawer*) dengan lapisan latar belakang blur (*backdrop overlay*) agar mudah dioperasikan pada perangkat layar sentuh, tablet, dan laptop layar kecil.

---

## 7. Standar Struktur Folder Proyek (Current Implemented Architecture)

Struktur folder proyek menerapkan prinsip **Separation of Concerns**, **Feature-Driven Architecture**, dan **HTML Component Partials** yang 100% seragam pada ketiga portal pengguna (Siswa-Guru, Petugas, dan Admin):

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
    ├── login.html                        # Halaman login multi-peran dengan opsi Remember Me
    │
    ├── assets/                           # Shared assets terpusat
    │   ├── css/
    │   │   ├── style.css                 # Style umum landing page
    │   │   ├── dashboard-siswa-guru.css  # Style portal anggota
    │   │   ├── dashboard-petugas.css     # Style portal petugas
    │   │   └── admin.css                 # Style portal admin
    │   └── js/
    │       ├── supabaseClient.js         # Client Supabase terpusat & env reader
    │       ├── sharedUtils.js            # Utility format rupiah, tanggal, modal, toast
    │       ├── hero.js                   # Interaksi animasi hero section landing page
    │       ├── main.js                   # Logika katalog publik, booking redirect, pengumuman
    │       └── auth.js                   # Manajemen sesi, login, logout, avatar default WhatsApp, & role guard
    │
    │   ─────────────────────────────────────────────────────────────
    │   [1] PORTAL SISWA & GURU (ARSITEKTUR MODULAR FITUR)
    │   ─────────────────────────────────────────────────────────────
    ├── siswa-guru/
    │   ├── dashboard.html                # Master Layout Ringkas (< 100 baris)
    │   ├── siswaGuru.js                  # Router utama tab, auth guard & bridging booking
    │   │
    │   ├── components/                   # Potongan kerangka HTML modular
    │   │   ├── layout/                   # Komponen tata letak utama:
    │   │   │   ├── header.html           # Topbar breadcrumb & judul halaman dinamis
    │   │   │   ├── navbar.html           # Navigasi sidebar & header seluler (avatar WA default)
    │   │   │   └── footer.html           # Footer informasi portal anggota
    │   │   │
    │   │   ├── tabs/                     # Tampilan Layar Utama Sesuai Menu:
    │   │   │   ├── tab-beranda.html      # Tab 0: Ringkasan KPI, buku aktif, slider pengumuman
    │   │   │   ├── tab-katalog.html      # Tab 1: Pencarian buku, filter rak & kategori
    │   │   │   ├── tab-pinjaman.html     # Tab 2: Buku fisik aktif & tiket prapinjam
    │   │   │   ├── tab-riwayat.html      # Tab 3: Arsip log pengembalian & catatan denda
    │   │   │   └── tab-profil.html       # Tab 4: Kartu anggota digital & ganti password/foto
    │   │   │
    │   │   └── modals/                   # Modal Pop-up Terpusat:
    │   │       ├── modal-detail-buku.html     # Pratinjau buku, sinopsis, & stok
    │   │       └── modal-tiket-prapinjam.html # Formulir booking pra-pinjam & tiket QR resmi
    │   │
    │   └── modules/                      # Logika JavaScript berbasis fitur modular
    │       ├── core/                     # Fondasi Sentral Sistem:
    │       │   ├── index.js              # Re-export seluruh fondasi core
    │       │   ├── state.js              # State memori reaktif & cache multi-tabel
    │       │   ├── data.js               # Sinkronisasi fetch data Supabase & auto-cleanup
    │       │   └── siswaHelper.js        # Helper hari, format rupiah, hitung kuota aktif
    │       │
    │       ├── 0-beranda/                # MENU 0: Beranda & KPI
    │       │   ├── index.js              # Koordinator modul beranda
    │       │   └── beranda.js            # Render KPI, quick list buku aktif, banner denda
    │       │
    │       ├── 1-katalog/                # MENU 1: Eksplorasi Katalog Buku
    │       │   ├── index.js              # Koordinator katalog & window bindings
    │       │   ├── katalogBuku.js        # Live search, filter kategori, auto-redirect booking
    │       │   └── modalDetailBuku.js    # Pop-up detail buku & bridging ke booking
    │       │
    │       ├── 2-prapinjam/              # MENU 2: Pra-Pinjam & Reservasi
    │       │   ├── index.js              # Koordinator modul pra-pinjam
    │       │   ├── keranjang.js          # Pengelolaan keranjang pra-pinjam mandiri
    │       │   └── tiketPraPinjam.js     # Form booking, fallback fetch Supabase, tiket QR 2D
    │       │
    │       ├── 3-riwayat/                # MENU 3: Riwayat & Denda
    │       │   ├── index.js              # Koordinator modul riwayat
    │       │   └── riwayatPeminjaman.js  # Tabel pinjaman aktif, subtab prapinjam, arsip pengembalian
    │       │
    │       └── 4-profil/                 # MENU 4: Kartu Anggota & Pengaturan Akun
    │           ├── index.js              # Koordinator modul profil
    │           └── profilUser.js         # Render kartu anggota digital (QRCode.js), form profil
    │
    │   ─────────────────────────────────────────────────────────────
    │   [2] PORTAL PETUGAS (ARSITEKTUR MODULAR MEJA OPERASIONAL)
    │   ─────────────────────────────────────────────────────────────
    ├── petugas/
    │   ├── dashboard.html                # Master Layout Bersih (< 110 baris)
    │   ├── petugas.js                    # Router & koordinator utama aplikasi
    │   │
    │   ├── components/                   # Potongan kerangka HTML modular
    │   │   ├── layout/                   # Komponen tata letak utama:
    │   │   │   ├── header.html           # Header viewport, breadcrumb, & jam operasional
    │   │   │   └── sidebar.html          # Mobile header, backdrop, profil avatar WA, & navigasi
    │   │   │
    │   │   ├── tabs/                     # Tampilan Layar Utama Meja Kerja:
    │   │   │   ├── tab-overview.html     # Meja 1: Statistik ringkasan & KPI operasional
    │   │   │   ├── tab-sirkulasi.html    # Meja 2: Sirkulasi langsung & pra-pinjam
    │   │   │   ├── tab-pengembalian.html # Meja 3: Pengembalian buku & kalkulator denda
    │   │   │   ├── tab-inventaris.html   # Meja 4: Inventaris katalog koleksi buku
    │   │   │   └── tab-pengumuman.html   # Meja 5: Kelola pengumuman & broadcast agenda
    │   │   │
    │   │   └── modals/                   # Modal Pop-up Terpisah Di-include Langsung:
    │   │       ├── modal-buku.html         # Form tambah/edit buku & modal hapus koleksi
    │   │       ├── modal-scanner.html      # Dialog viewfinder scanner kamera webcam
    │   │       ├── modal-sirkulasi.html    # Verifikasi reservasi prapinjam & tiket barcode
    │   │       ├── modal-pengembalian.html # Struk pengembalian & konfirmasi lunas tunai
    │   │       ├── modal-pengumuman.html   # Form tambah/edit pengumuman & dialog hapus
    │   │       └── modal-logout.html       # Dialog konfirmasi keluar sesi & wadah cetak stiker QR
    │   │
    │   └── modules/                      # Logika JavaScript berbasis fitur modular
    │       ├── core/                     # Fondasi Sentral Sistem:
    │       │   ├── state.js              # State memori reaktif & cache multi-tabel
    │       │   ├── syncData.js           # Sinkronisasi fetch 7 tabel Supabase
    │       │   └── petugasHelper.js      # Helper rupiah, tanggal, borrower resolver
    │       │
    │       ├── scanner/                  # Mesin Pemindai Universal Barcode / QR:
    │       │   ├── index.js              # Koordinator scanner & event bindings
    │       │   ├── cameraStream.js       # Manajemen stream webcam/kamera
    │       │   ├── fileDecoder.js        # Decoder barcode file gambar (Html5Qrcode)
    │       │   ├── scanRouter.js         # Router pencocokan hasil scan ke meja kerja
    │       │   └── soundFeedback.js      # Suara 'beep' Web Audio API saat scan sukses
    │       │
    │       ├── 1-overview/               # MEJA 1: Overview & KPI Operasional
    │       │   └── overview.js           # Ringkasan KPI harian & shortcut aksi cepat
    │       │
    │       ├── 2-sirkulasi/              # MEJA 2: Sirkulasi Peminjaman Buku
    │       │   ├── index.js              # Koordinator Meja Sirkulasi
    │       │   ├── memberPicker.js       # Autocomplete pemilih anggota (Siswa & Guru)
    │       │   ├── pinjamanAktif.js      # Monitoring buku aktif berstatus 'Dipinjam'
    │       │   ├── prapinjam.js          # Antrean booking, filter kesiapan rak, verifikasi
    │       │   └── walkIn.js             # Form peminjaman langsung di meja sirkulasi
    │       │
    │       ├── 3-pengembalian/           # MEJA 3: Pengembalian Buku & Denda
    │       │   ├── index.js              # Koordinator Utama Meja 3 (Pengembalian + Denda)
    │       │   ├── pengembalian/         # Sub-modul Meja Pengembalian Buku Fisik:
    │       │   │   ├── index.js          # Re-export sub-modul pengembalian
    │       │   │   ├── formPengembalian.js   # Form penerimaan buku kembali & tampilan tarif aktif
    │       │   │   ├── seleksiPeminjam.js    # Dropdown peminjam, kartu buku aktif, scan lookup
    │       │   │   ├── kalkulatorDenda.js    # Mesin hitung denda, tarif dinamis, aturan 1 bulan
    │       │   │   ├── eksekusiPengembalian.js # Simpan ke Supabase, pulihkan stok (+1), struk
    │       │   │   └── modalStruk.js         # Dialog cetak struk tanda terima pengembalian
    │       │   └── denda/                # Sub-modul Operasional Denda & Riwayat:
    │       │       ├── index.js          # Re-export operasional denda
    │       │       ├── kasirTunggakan.js # Kasir denda belum lunas, modal 2 lapis, rollback
    │       │       ├── arsipRiwayat.js   # Log arsip pengembalian & pencarian nama user
    │       │       └── subtabDenda.js    # Switcher sub-tab, total kas, & widget kebijakan tarif denda
    │       │
    │       ├── 4-buku/                   # MEJA 4: Inventaris Koleksi Buku
    │       │   ├── index.js              # Koordinator inventaris buku
    │       │   ├── katalogBuku.js        # Tabel katalog, filter kategori/rak, live search
    │       │   ├── modalFormBuku.js      # Dialog form Tambah/Edit buku & upload cover
    │       │   ├── modalQrBuku.js        # Stiker QR Code (QRCode.js), cetak & download PNG
    │       │   └── modalHapusBuku.js     # Modal konfirmasi hapus dengan proteksi pinjaman
    │       │
    │       └── 5-pengumuman/             # MEJA 5: Pengumuman Agenda Sekolah
    │           ├── index.js              # Koordinator pengumuman
    │           ├── daftarPengumuman.js   # Tabel pengumuman, filter kategori, badge acara
    │           ├── modalFormPengumuman.js# Form Tambah/Edit pengumuman & upload poster
    │           └── modalHapusPengumuman.js# Dialog konfirmasi hapus pengumuman
    │
    │   ─────────────────────────────────────────────────────────────
    │   [3] PORTAL ADMIN (ARSITEKTUR MODULAR MANAJEMEN PENGGUNA)
    │   ─────────────────────────────────────────────────────────────
    └── admin/
        ├── dashboard.html                # Master Layout Bersih (< 105 baris)
        ├── admin.js                      # Router & koordinator utama admin
        │
        ├── components/                   # Potongan kerangka HTML modular
        │   ├── layout/                   # Komponen tata letak utama:
        │   │   ├── header.html           # Header status server & akun super admin
        │   │   ├── sidebar.html          # Navigasi sidebar kelola akun (avatar WA default)
        │   │   └── footer.html           # Footer status koneksi & sinkronisasi
        │   │
        │   ├── tabs/                     # Layar Master Tabel Sesuai Role:
        │   │   ├── tab-beranda.html      # Ringkasan KPI total user & distribusi peran
        │   │   ├── tab-siswa.html        # Tabel master data akun siswa sekolah
        │   │   ├── tab-guru.html         # Tabel master data akun guru & pengajar
        │   │   └── tab-petugas.html      # Tabel master data akun petugas perpustakaan
        │   │
        │   └── modals/                   # Modal Form CRUD & Import Terpusat:
        │       ├── modal-form-user.html      # Pop-up tambah/edit akun pengguna multi-peran
        │       ├── modal-konfirmasi.html     # Dialog konfirmasi bahaya penghapusan akun
        │       └── modal-import-excel.html   # Dialog import masal Excel (XLSX, XLS, CSV)
        │
        └── modules/                      # Logika JavaScript berbasis fitur modular
            ├── core/                     # Sentral Data & Validasi:
            │   ├── index.js              # Re-export fondasi core admin
            │   ├── state.js              # Cache memori user (siswa, guru, petugas)
            │   ├── data.js               # Sinkronisasi master data user Supabase
            │   └── table.js              # Mesin render tabel dinamis & avatar default WA
            │
            ├── 0-overview/               # TAB 0: Statistik & Ringkasan Akun
            │   ├── index.js              # Koordinator overview admin
            │   └── kpiMetrics.js         # Hitung total siswa, guru, petugas, & rasio akun
            │
            ├── 1-siswa/                  # TAB 1: Manajemen Akun Siswa
            │   ├── index.js              # Koordinator modul siswa
            │   └── dataSiswa.js          # Render tabel siswa, search NISN/nama/kelas
            │
            ├── 2-guru/                   # TAB 2: Manajemen Akun Guru
            │   ├── index.js              # Koordinator modul guru
            │   └── dataGuru.js           # Render tabel guru, search NIP/nama/mapel
            │
            ├── 3-petugas/                # TAB 3: Manajemen Akun Petugas
            │   ├── index.js              # Koordinator modul petugas
            │   └── dataPetugas.js        # Render tabel petugas & monitoring staf
            │
            ├── import/                   # Fitur Unggulan: Import Masal Excel
            │   ├── index.js              # Koordinator fitur import
            │   └── importExcel.js        # Parser SheetJS, validasi skema, & batch insert
            │
            └── modals/                   # Logika Pengendali Seluruh Modal Admin
                ├── index.js              # Koordinator modal admin
                ├── modalUser.js          # Form tambah manual/edit akun (2-phase commit)
                └── modalKonfirmasi.js    # Konfirmasi hapus user & reset password
```

---

## 8. Kamus Data, Skema Database Supabase & Strategi Skalabilitas (PostgreSQL)

### 8.1. Skema Tabel Relasional Aktif

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
    harga_buku DECIMAL(10, 2) DEFAULT 50000.00 -- Nilai penggantian denda hilang/keterlambatan >= 30 hari
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

### 8.2. Rekomendasi Indeks Performa (Database Indexing)

Ketika data riwayat peminjaman dan pengembalian bertumbuh seiring tahun ajaran sekolah, query pemfilteran status (`status = 'Menunggu'` / `status = 'Dipinjam'`) dan pencarian berdasarkan identitas anggota (`nisn_siswa`) memerlukan indeks B-Tree agar waktu respon query tetap instan (< 10 ms):

```sql
-- Indeks performa query filter status peminjaman aktif & prapinjam
CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON data_peminjaman(status);

-- Indeks performa riwayat transaksi & kartu pinjaman per anggota
CREATE INDEX IF NOT EXISTS idx_peminjaman_nisn ON data_peminjaman(nisn_siswa);

-- Indeks relasi peminjaman ke pengembalian
CREATE INDEX IF NOT EXISTS idx_pengembalian_peminjaman ON data_pengembalian(id_peminjaman);

-- Indeks status denda untuk meja kasir tunggakan
CREATE INDEX IF NOT EXISTS idx_pengembalian_status_denda ON data_pengembalian(status_denda);
```

### 8.3. Analisis Skalabilitas & Kapasitas Data

- **Ukuran Record:** Rata-rata 1 baris transaksi di `data_peminjaman` dan `data_pengembalian` hanya berukuran ~150 sampai 250 bytes.
- **Kapasitas Penyimpanan:** Tier gratis Supabase menyediakan kuota database **500 MB**. 
- **Estimasi Daya Tampung:** Kapasitas tersebut mampu menampung lebih dari **1.500.000 (satu setengah juta) transaksi riwayat sirkulasi**. Untuk perpustakaan sekolah dengan 1.000–3.000 siswa, penumpukan data transaksi selama 5–10 tahun kalender sangat aman dan tidak akan membebani kapasitas kuota.
- **Strategi Pemeliharaan:** Arsip riwayat pengembalian status `'Selesai'` tetap dipertahankan untuk kebutuhan audit laporan tahunan perpustakaan.

---

## 9. Standar UI/UX, Design System & Avatar Pengguna Default

1. **Prinsip Avatar Netral Default WhatsApp:**
   - Seluruh elemen profil pengguna di sidebar Admin, sidebar Petugas, navbar Siswa/Guru, dan tabel daftar pengguna menggunakan **Avatar Default Bergaya WhatsApp**:
     - Wadah lingkaran: `w-9 h-9 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center border border-slate-200/80`.
     - Ikon profil: `<i class="ph-fill ph-user text-xl"></i>`.
   - **Keputusan Desain:** Menghilangkan pemotongan substring inisial nama (seperti *"AD"*, *"BU"*). Desain ikonik WhatsApp memberikan kesan tampilan modern, profesional, konsisten, dan menghindari glitch rendering pada nama dengan karakter spesial atau spasi ganda.
2. **Palet Warna & Status Semantik:**
   - **Navy Brand (`#000C4F`):** Warna primer untuk topbar, tombol aksi utama, dan kartu identitas.
   - **Emerald-600 (`#059669`):** Menandakan buku tersedia, tiket siap diambil, atau denda lunas.
   - **Amber-500 (`#D97706`):** Menandakan status menunggu konfirmasi, mendekati jatuh tempo, atau kuota terpakai.
   - **Rose-600 (`#DC2626`):** Menandakan buku terlambat, denda menunggak, atau konfirmasi penghapusan data.
3. **Komponen Modal Mandiri & Tanpa File Perantara:**
   - Seluruh jendela modal (`modal-buku.html`, `modal-scanner.html`, `modal-sirkulasi.html`, `modal-pengembalian.html`, `modal-pengumuman.html`, `modal-logout.html`) di-include langsung pada file `dashboard.html` masing-masing portal tanpa pembungkus perantara (*no middleman html wrapper*).

---

## 10. Alur Keandalan Booking Pra-Pinjam (Landing Page Redirect Flow)

Sistem mengadopsi mekanisme **Fault-Tolerant Direct Booking** dari landing page ke portal siswa-guru:

```text
Pengunjung klik "Pinjam Sekarang" di Index
  │
  ├── Belum Login ──> Disimpan ke sessionStorage('pending_booking_id') ──> Redirect ke login.html
  │                                                                              │
  │                                                                         Login Sukses
  │                                                                              │
  └── Sudah Login ──> Redirect ke: siswa-guru/dashboard.html?action=prapinjam&bukuId=BK-001
                            │
                            ▼
      Pemeriksaan Asinkronus (checkUrlRedirectBooking)
      ├── 1. Baca parameter 'bukuId' dari window.location.search
      ├── 2. Tunggu kesiapan memori state.cache.buku (Polling 100ms hingga max 3 detik)
      ├── 3. Pencocokan ID Buku (Case-Insensitive & Trimmed)
      │      ├── Ditemukan di cache ──> Langsung buka modal konfirmasi pra-pinjam
      │      └── Belum ada di cache ──> Query darurat langsung ke Supabase:
      │                                 db.from('data_buku').ilike('id_buku', cleanId).maybeSingle()
      │                                 (Berhasil diambil ──> masukkan cache ──> buka modal booking)
      └── 4. Bersihkan query URL (window.history.replaceState) agar bersih dan tidak berulang saat refresh
```

---

## 11. Panduan Teknis & Standar Vibe Coding AI Agent

1. **Prinsip Komponen HTML Bersih:**
   - Jangan menulis ulang kerangka HTML utuh di `dashboard.html`. Gunakan tag `<include src="./components/<nama-komponen>.html" />`.
   - Simpan elemen HTML komponen di folder `components/layout/`, `components/tabs/`, atau `components/modals/`.
2. **Prinsip Modul JavaScript Ramping:**
   - Setiap berkas modul baru wajib menjaga panjang kode di bawah **300 baris**.
   - Kelompokkan logika yang memiliki relasi erat ke dalam sub-folder fitur `modules/<nama-fitur>/` dengan file `index.js` sebagai koordinatornya.
   - Fondasi bersama wajib diletakkan di `modules/core/` (`state.js`, `data.js`, `helper.js`, `index.js`).
3. **Koneksi Supabase Terpusat:**
   - Selalu impor instance database dari `public/assets/js/supabaseClient.js`:
     ```javascript
     import { db } from '../../assets/js/supabaseClient.js';
     ```
   - Dilarang membuat inisialisasi `createClient` baru atau menuliskan API key secara langsung (*hardcoded*) di dalam file modul.
4. **Preservasi Event Handler & Window Globals:**
   - Fungsi-fungsi yang dipanggil melalui atribut HTML `onclick="window.<namaFungsi>(...)"` wajib dipasangkan (*bind*) ke objek `window` di file koordinator `index.js` modul terkait.
5. **Zero Breaking Changes & Production Build Validation:**
   - Setiap kali melakukan perombakan atau refactoring file, agen wajib menjalankan pengujian build produksi (`npm run build`) untuk memverifikasi bahwa seluruh import path, tag `<include>`, dan asset bundling valid tanpa error.