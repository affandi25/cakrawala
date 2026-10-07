/**
 * CAKRAWALA Digital Library - State Management Dashboard Siswa & Guru
 * File: public/siswa-guru/modules/state.js
 * 
 * FUNGSI:
 * Menyimpan memori lokal sentral dashboard siswa & guru:
 * - Data login aktif (Siswa / Guru) dan profil dari data_siswa / data_guru
 * - Cache data buku, kategori, transaksi peminjaman pribadi, dan riwayat pengembalian
 * - State filter dan tab yang sedang dibuka
 */

export const state = {
  currentUser: null,           // Sesi user dari auth (id_user, username, role)
  memberProfile: null,        // Profil lengkap dari data_siswa atau data_guru
  memberType: 'siswa',         // 'siswa' atau 'guru'
  memberId: '',               // NISN siswa atau NIP guru
  activeTab: 'beranda',       // Tab aktif: 'beranda' | 'katalog' | 'pinjaman' | 'riwayat' | 'profil'
  cache: {
    kategori: [],              // Kategori buku
    buku: [],                  // Semua koleksi buku perpustakaan
    peminjaman: [],            // Transaksi peminjaman pribadi milik siswa/guru ini
    pengembalian: []           // Riwayat pengembalian dan denda milik siswa/guru ini
  },
  unpaidFines: [],             // Daftar denda yang belum lunas
  searchKatalogQuery: '',      // Kata kunci pencarian buku
  filterKategori: '',          // Kategori buku yang dipilih
  filterKetersediaan: '',      // 'semua' | 'tersedia' | 'dipinjam'
  activePinjamanSubtab: 'aktif', // 'aktif' (buku dibawa) | 'prapinjam' (antrean booking)
  selectedBukuForBooking: null,  // Buku yang dipilih untuk diajukan pra-pinjam
  selectedBukuDetail: null,      // Buku yang sedang dibuka detailnya
  cancelTargetBooking: null      // Prapinjam yang akan dibatalkan
};

// Konfigurasi header judul & subjudul untuk masing-masing tab
export const TAB_CONFIGS = {
  beranda: {
    breadcrumb: 'Beranda',
    title: 'Portal Literasi & Aktivitas Peminjaman',
    desc: 'Pantau buku yang sedang kamu baca, batas tempo pengembalian, dan informasi perpustakaan.'
  },
  katalog: {
    breadcrumb: 'Katalog Koleksi',
    title: 'Jelajahi Koleksi Buku Perpustakaan',
    desc: 'Cari referensi bacaan fisik, cek ketersediaan stok, nomor rak, atau ajukan booking pra-pinjam daring.'
  },
  pinjaman: {
    breadcrumb: 'Peminjaman Saya',
    title: 'Buku Aktif & Antrean Pra-Pinjam',
    desc: 'Periksa buku yang sedang dipinjam beserta kode tiket booking prapinjam untuk diambil di meja sirkulasi.'
  },
  riwayat: {
    breadcrumb: 'Riwayat & Denda',
    title: 'Catatan Pengembalian & Status Denda',
    desc: 'Arsip buku yang pernah kamu selesaikan dan rincian denda keterlambatan/kondisi fisik.'
  },
  profil: {
    breadcrumb: 'Kartu Anggota',
    title: 'Kartu Identitas Digital Perpustakaan',
    desc: 'Tunjukkan kartu anggota digital ini ke petugas perpustakaan saat meminjam buku fisik di tempat.'
  }
};
