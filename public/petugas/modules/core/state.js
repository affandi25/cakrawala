/**
 * CAKRAWALA Digital Library - State Management Dashboard Petugas
 * File: public/petugas/modules/core/state.js
 * 
 * FUNGSI:
 * Menyimpan seluruh memori reaktif dan cache multi-tabel Supabase:
 * - Kategori, Buku, Siswa, Guru, Peminjaman, Pengembalian, Pengumuman
 * - Filter pencarian, subtab sirkulasi, dan record interaksi aktif
 */

export const state = {
  currentUser: null,           // Data sesi login petugas (role, username, id_user)
  officerProfile: null,        // Data profil petugas dari tabel data_petugas
  activeTab: 'overview',       // Tab meja kerja aktif ('overview' | 'sirkulasi' | 'pengembalian' | 'inventaris' | 'pengumuman')
  cache: {
    kategori: [],              // Arsip kategori buku
    buku: [],                  // Arsip koleksi buku
    siswa: [],                 // Arsip siswa terdaftar
    guru: [],                  // Arsip guru terdaftar
    peminjaman: [],            // Arsip transaksi peminjaman (Menunggu & Dipinjam)
    pengembalian: [],          // Arsip riwayat pengembalian & denda
    pengumuman: []             // Arsip agenda & pengumuman
  },
  selectedMember: null,        // Anggota terpilih di Meja Walk-in
  memberFilterType: 'semua',   // Filter tipe peminjam ('semua' | 'siswa' | 'guru')
  filterSirkulasi: 'Menunggu', // Filter antrean sirkulasi
  searchSirkulasiQuery: '',    // Kata kunci pencarian sirkulasi
  searchBooksQuery: '',        // Kata kunci pencarian buku
  filterCategoryBook: '',      // Filter kategori buku
  filterStatusBook: '',        // Filter ketersediaan buku
  selectedPeminjamanForReturn: null, // Peminjaman aktif yang akan diproses kembali
  selectedReturnBorrower: null,      // Peminjam terpilih di meja pengembalian
  currentQrBook: null,         // Buku yang sedang dibuka jendela stiker QR-nya
  deleteTargetBook: null,      // Buku target hapus
  selectedCoverFile: null,     // File sampul buku
  selectedPosterFile: null,    // File poster pengumuman
  searchPengumumanQuery: '',   // Pencarian pengumuman
  filterKategoriPengumuman: '', // Kategori pengumuman
  currentEditPengumuman: null, // Pengumuman diedit
  deleteTargetPengumuman: null,// Pengumuman target hapus
  activeSirkulasiSubtab: 'prapinjam', // Sub-tab sirkulasi aktif ('prapinjam' | 'walkin' | 'dipinjam')
  searchPrapinjamQuery: '',    // Filter teks prapinjam
  searchDipinjamQuery: ''      // Filter teks buku sedang dipinjam
};

// Konfigurasi Header Breadcrumb & Judul Per Meja Kerja
export const TAB_CONFIGS = {
  overview: {
    breadcrumb: 'Overview',
    title: 'Ringkasan Operasional Meja Sirkulasi',
    desc: 'Pantau antrean prapinjam siswa, validasi pengembalian, kalkulasi denda otomatis, dan kelola inventaris buku.'
  },
  sirkulasi: {
    breadcrumb: 'Prapinjam',
    title: 'Verifikasi Antrean Prapinjam & Sirkulasi',
    desc: 'Konfirmasi penyerahan buku siswa daring atau proses peminjaman langsung (walk-in).'
  },
  pengembalian: {
    breadcrumb: 'Pengembalian',
    title: 'Pengembalian Koleksi & Kalkulator Denda',
    desc: 'Pilih peminjaman aktif, tentukan kondisi fisik buku, dan sistem menghitung denda otomatis.'
  },
  inventaris: {
    breadcrumb: 'Inventaris Buku',
    title: 'Koleksi Inventaris Buku & Stiker QR',
    desc: 'Kelola master buku, upload cover ke Supabase Storage, lokasi rak fisik, dan cetak label stiker QR code.'
  },
  pengumuman: {
    breadcrumb: 'Pengumuman',
    title: 'Pusat Manajemen Pengumuman & Poster Event',
    desc: 'Kelola pengumuman dan poster kegiatan yang tersinkronisasi otomatis dengan beranda publik perpustakaan.'
  }
};
