# Standar Desain & UI/UX — CAKRAWALA

> **Panduan Sistem Desain, Token Warna, Tipografi, Standar Komponen, & Identitas Visual**  
> Proyek: **CAKRAWALA** (*Cerdas Akses Koleksi Referensi, Wujudkan Aspirasi Literasi Aksara*)  
> Kerangka Styling: **Tailwind CSS Utility-First Framework & Phosphor Icons**

---

## 1. Visi Desain & Identitas Visual

Antarmuka **CAKRAWALA** mengusung konsep **Modern Academic Minimalism**: memadukan kehangatan literasi dengan presisi sistem operasional digital. Desain difokuskan pada keterbacaan tinggi (*high legibility*), interaksi cepat bebas hambatan (*frictionless UX*), serta kenyamanan mata bagi petugas dan siswa yang menggunakan sistem dalam durasi lama.

### 4 Pilar Desain Utama:
1. **Kejelasan Informasi (Information Clarity):** Menghindari dekorasi visual yang tidak fungsional; setiap angka, label rak, dan status pinjaman langsung dapat dipindai mata (*scannable*).
2. **Umpan Balik Instan (Immediate Feedback):** Setiap interaksi kritis (scan barcode, klik simpan, peringatan denda) selalu disertai respons visual terarah (animasi mikro, toast notifikasi, atau suara nada *beep*).
3. **Standar Aksesibilitas:** Kontras teks terhadap latar belakang memenuhi standar WCAG 2.1 Level AA.
4. **Bebas Kertas (Paperless-First):** Format digital untuk tiket booking, kartu anggota, dan struk dirancang ramah cetak jika diperlukan (*print-ready CSS*).

---

## 2. Palet Warna & Token Semantik

Sistem mengadopsi palet warna berbasis Tailwind CSS dengan saturasi yang disesuaikan untuk konteks akademis:

```text
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Navy Brand    │  Emerald Green  │   Amber Warn    │    Rose Alert   │
│     #000C4F     │     #059669     │     #D97706     │     #DC2626     │
│   (Brand Utama) │ (Tersedia/Lunas)│(Menunggu/Tempo) │ (Terlambat/Denda│
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Tabel Rincian Warna Semantik:

| Token Warna | Nilai Hex | Penerapan Antarmuka | Makna Semantik |
| --- | --- | --- | --- |
| **Navy Brand** | `#000C4F` | Topbar dashboard, kartu anggota digital, tombol aksi utama (*CTA*). | Identitas resmi, otoritas, integritas institusi. |
| **Emerald-600** | `#059669` | Badge status *"Tersedia"*, *"Buku Siap di Meja"*, badge *"Lunas"*. | Status sukses, aman, siap diambil, kas diterima. |
| **Amber-500** | `#D97706` | Badge *"Menunggu Verifikasi"*, sisa batas tempo $\le 2$ hari, kuota aktif penuh. | Perhatian, dalam proses, mendekati batas waktu. |
| **Rose-600** | `#DC2626` | Banner keterlambatan, kasir tunggakan denda, dialog konfirmasi hapus data. | Kritis, denda menunggak, tindakan destruktif. |
| **Slate-50** | `#F8FAFC` | Latar belakang kanvas utama dashboard dan modal pop-up. | Latar belakang bersih, tidak menyilaukan mata. |
| **Slate-900** | `#0F172A` | Teks judul utama, angka metrik KPI, header tabel. | Kontras tinggi, keterbacaan tajam. |
| **Slate-500** | `#64748B` | Teks sekunder, label formulir, keterangan sub-judul, breadcrumb. | Hirarki visual sekunder yang tenang. |

---

## 3. Tipografi & Hirarki Teks

Menggunakan jenis huruf Sans-Serif modern (`Inter` atau `Plus Jakarta Sans`) dengan fallback `system-ui, -apple-system, BlinkMacSystemFont`:

| Tingkatan Teks | Ukuran / Bobot | Kegunaan | Contoh Teks |
| --- | --- | --- | --- |
| **Display / H1** | `2rem (32px)` / Bold (`font-bold`) | Judul utama halaman landing page & cover portal | *"Jelajahi Ribuan Koleksi Referensi"* |
| **Heading 2** | `1.5rem (24px)` / Semi-Bold (`font-semibold`) | Judul meja kerja & tab aktif dashboard | *"Meja 3: Pengembalian Buku & Denda"* |
| **Heading 3** | `1.125rem (18px)` / Medium (`font-medium`) | Judul kartu ringkasan KPI & header modal pop-up | *"Antrean Pra-Pinjam Hari Ini"* |
| **Body Teks** | `0.875rem (14px)` / Regular (`font-normal`) | Isi tabel, sinopsis buku, form input field | *"Rak 3B - Bagian Koleksi Sains & Fisika"* |
| **Caption / Badge**| `0.75rem (12px)` / Medium (`font-medium`) | Status chip, tag kategori, tanggal transaksi | *"Buku Siap di Meja"*, *"Denda Lunas"* |
| **Monospace Kode** | `0.8125rem (13px)` / Semibold (`font-mono`) | ID buku fisik, nomor resi pengembalian, barcode | `BK-0042`, `PJ-20261029-A7B8`, `KB-992144` |

---

## 4. Standar Avatar Pengguna Netral (WhatsApp Style)

Untuk menghadirkan keseragaman visual dan mencegah kendala tampilan nama (seperti inisial nama yang terpotong aneh, karakter simbol, atau spasi ganda), seluruh dashboard menerapkan **Avatar Profil Netral Bergaya WhatsApp**:

```html
<!-- Spesifikasi Komponen Avatar Netral Default -->
<div class="w-9 h-9 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center border border-slate-200/80 shadow-xs flex-shrink-0">
  <i class="ph-fill ph-user text-xl"></i>
</div>
```

### Keuntungan Arsitektural & Visual:
- **Konsistensi Universal:** Tampilan konsisten di seluruh tabel Admin (Siswa, Guru, Petugas), sidebar navigasi, dan header profil.
- **Bebas Komputasi String:** Tidak membutuhkan fungsi JS regex pemotong inisial nama (*first character extraction*) yang rentan galat jika nama berformat titel atau angka.
- **Privasi & Netralitas:** Tampilan antarmuka tampak rapi dan formal tanpa terpengaruh ada/tidaknya foto profil individual di database.

---

## 5. Spesifikasi Komponen Inti

### 5.1. Kartu Metrik KPI (KPI Statistic Cards)
- **Struktur:** Wadah berlatar putih (`bg-white rounded-2xl border border-slate-150 p-5 shadow-xs`).
- **Elemen:**
  - Ikon fitur berwadah lingkaran dengan warna semantik lembut (misal: `bg-blue-50 text-blue-600`).
  - Label metrik kecil abu-abu di atas (`text-xs font-medium text-slate-500 uppercase tracking-wider`).
  - Angka metrik berukuran besar (`text-2xl font-bold text-slate-800`).
  - Keterangan tren atau status tambahan di bagian dasar kartu.

### 5.2. Tabel Data Interaktif
- **Header:** Latar `bg-slate-50/80`, teks uppercase kecil `text-xs font-semibold text-slate-500`, sticky top.
- **Baris:** Hover effect halus (`hover:bg-slate-50/60 transition-colors`), garis pembatas tipis `border-b border-slate-100`.
- **Sel:** Teks sejajar vertikal tengah (`align-middle py-3 px-4`).
- **Aksi Cepat:** Tombol aksi berbentuk *pill* atau ikon ringkas dengan tooltip teks penjelas.

### 5.3. Modal Dialog & Jendela Pop-up
- **Desain Bebas Wrapper:** Di-include langsung ke dalam `dashboard.html` untuk memangkas *DOM depth*.
- **Backdrop:** Latar semi-transparan dengan efek blur halus (`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4`).
- **Transisi:** Muncul dengan animasi skala mikro (`scale-95 to scale-100`) berdurasi 150ms.
- **Aksesibilitas:** Menutup otomatis jika pengguna menekan tombol `ESC` atau mengklik area luar backdrop.

### 5.4. Stiker Label QR Buku & Kartu Anggota Fisik
- **Dimensi Standar Cetak:** Rasio 2:1 (lebar 7 cm x tinggi 3.5 cm) untuk stiker barcode buku fisik.
- **Komponen Stiker:**
  - Header logo instansi dan nama sistem *"CAKRAWALA"*.
  - Judul buku (maksimal 2 baris terpotong rapi).
  - Gambar QR Code resolusi tinggi (hasil render `QRCode.js` minimal 256x256 piksel).
  - Teks kode ID fisik (`BK-XXXX`) di bawah kode QR.
- **Mode Cetak:** Menggunakan stylesheet `@media print` khusus yang otomatis menyembunyikan navigasi, sidebar, dan header dashboard saat `window.print()` dipanggil.

---

## 6. Tata Letak Responsif & Breakpoints

Antarmuka dirancang *mobile-first* dan responsif di seluruh dimensi layar perangkat:

```text
┌─────────────────┬─────────────────┬──────────────────────────────────┐
│ Breakpoint      │ Dimensi Layar   │ Perilaku Tata Letak              │
├─────────────────┼─────────────────┼──────────────────────────────────┤
│ Mobile (< 768px)│ Layar HP        │ Sidebar tersembunyi (Drawer),    │
│                 │ (360px - 767px) │ Header hamburger, tabel scrollable│
├─────────────────┼─────────────────┼──────────────────────────────────┤
│ Tablet (768px)  │ Layar iPad      │ Grid KPI 2 kolom, form pop-up    │
│                 │ (768px - 1023px)│ memenuhi 90% lebar viewport      │
├─────────────────┼─────────────────┼──────────────────────────────────┤
│ Desktop (1024px)│ Layar Laptop &  │ Sidebar permanen di sisi kiri,   │
│                 │ Monitor Meja    │ Grid KPI 4 kolom, multi-pane view│
└─────────────────┴─────────────────┴──────────────────────────────────┘
```

