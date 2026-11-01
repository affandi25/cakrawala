# Dokumentasi Sistem Perpustakaan Digital "CAKRAWALA"

Selamat datang di pusat dokumentasi resmi **CAKRAWALA** (*Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara*). Seluruh spesifikasi teknis, rancangan arsitektur, standar desain antarmuka, kamus data database, dan panduan konfigurasi terangkum secara modular dalam folder ini.

---

## 📚 Peta Navigasi Berkas Dokumentasi

Berikut adalah daftar dokumen yang tersedia beserta fokus pembahasannya:

| Berkas | Judul & Topik | Ringkasan Isi |
| --- | --- | --- |
| 📄 [`prd.md`](file:///c:/xampp/htdocs/cakrawala/docs/prd.md) | **Product Requirements Document (PRD)** | Visi produk, 4 pilar sistem, matriks hak akses 5 peran, aturan batas kuota pinjaman (maks. 2 buku), logika denda $\ge 30$ hari (ganti seharga buku), dan alur bisnis meja sirkulasi. |
| 🏗️ [`architecture.md`](file:///c:/xampp/htdocs/cakrawala/docs/architecture.md) | **Arsitektur Sistem & Perangkat Lunak** | Pola Vite Multi-Page Application (MPA), cara kerja plugin partisi HTML modular `<include src="..." />`, Feature-Driven ES6 Modules (< 300 baris), manajemen state memori reaktif (`state.js`), dan router scanner kamera. |
| 🎨 [`design.md`](file:///c:/xampp/htdocs/cakrawala/docs/design.md) | **Standar Desain & UI/UX Guidelines** | Filosofi Academic Minimalism, palet warna semantik (Navy Brand `#000C4F`, Emerald, Amber, Rose), tipografi, standar avatar netral WhatsApp (`w-9 h-9 rounded-full bg-slate-200`), spesifikasi stiker label QR, dan struk cetak thermal. |
| 🗄️ [`database.md`](file:///c:/xampp/htdocs/cakrawala/docs/database.md) | **Skema Database & Kamus Data** | Diagram Relasi Entitas (ERD), spesifikasi 9 tabel PostgreSQL Supabase, kamus data kolom, tipe data, indeks performa B-Tree, serta wadah Supabase Storage (`covers` & `posters`). |
| 🧩 [`modules.md`](file:///c:/xampp/htdocs/cakrawala/docs/modules.md) | **Rincian Modul & Alur Fungsional** | Spesifikasi mendalam Dashboard Petugas (5 Meja Kerja + Scanner Universal), Portal Siswa & Guru (5 Tab Layanan Mandiri), Portal Admin (Kelola Akun & Import Excel SheetJS), serta alur redirect booking landing page. |
| 🚀 [`setup.md`](file:///c:/xampp/htdocs/cakrawala/docs/setup.md) | **Panduan Instalasi & Deployment** | Prasyarat sistem (Node.js 18+), setup proyek Supabase & storage buckets, konfigurasi `.env`, menjalankan Vite dev server, verifikasi build produksi, deployment ke Vercel/Hosting, dan solusi masalah teknis (FAQ). |

---

## 🗂️ Struktur Direktori Dokumentasi

```text
cakrawala/
└── docs/
    ├── README.md         # Pusat navigasi & indeks seluruh dokumentasi
    ├── prd.md            # Product Requirements Document lengkap
    ├── architecture.md   # Arsitektur sistem MPA, plugin Vite, & state cache
    ├── design.md         # Design system, token warna, avatar WhatsApp, & UI/UX
    ├── database.md       # Skema 9 tabel Supabase, ERD, indeks, & storage
    ├── modules.md        # Logika fungsional Petugas (5 Meja), Siswa-Guru, & Admin
    └── setup.md          # Panduan instalasi lokal, .env, build, & deployment
```

---

## ⚡ Ringkasan Tumpukan Teknologi (Tech Stack)

- **Bundler & Build Tool:** [Vite 6](https://vitejs.dev/) dengan kustom `htmlIncludePlugin`
- **Frontend Core:** HTML5 Partials, Tailwind CSS, Vanilla JavaScript (ES6+ Feature Modules)
- **Database & Storage:** [Supabase Cloud](https://supabase.com/) (PostgreSQL 15+ & Supabase Storage)
- **Barcode & QR Engine:** `html5-qrcode` (Decoder kamera webcam) & `QRCode.js` (Generator stiker QR 2D)
- **Import Engine:** `SheetJS (xlsx)` untuk modul administrasi impor akun massal
- **Audio Feedback:** Web Audio API (*zero-file-dependency beep synthesizer*)

