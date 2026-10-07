/**
 * CAKRAWALA Digital Library - State Management Dashboard Petugas
 * File: public/petugas/modules/state.js
 * 
 * FUNGSI:
 * Menyimpan seluruh ingatan (memori lokal) dashboard secara terpusat:
 * - Cache data dari database Supabase (Buku, Siswa, Guru, Peminjaman, Pengembalian, Pengumuman)
 * - State filter, pencarian, dan pilihan form aktif
 */

export const state = {
  currentUser: null,           // Data login petugas (role, username, id_user)
  officerProfile: null,        // Data lengkap profil petugas dari tabel data_petugas
  activeTab: 'overview',       // Tab meja kerja yang sedang aktif dilihat petugas
  cache: {
    kategori: [],              // Arsip kategori koleksi buku
    buku: [],                  // Arsip seluruh koleksi buku
    siswa: [],                 // Arsip data siswa
    guru: [],                  // Arsip data guru pengajar
    peminjaman: [],            // Arsip transaksi peminjaman (Menunggu & Dipinjam)
    pengembalian: [],          // Arsip riwayat pengembalian & denda
    pengumuman: []             // Arsip pengumuman & poster event
  },
  selectedMember: null,        // Siswa atau Guru yang dipilih di meja sirkulasi
  memberFilterType: 'semua',   // Filter pencarian peminjam ('semua' | 'siswa' | 'guru')
  filterSirkulasi: 'Menunggu', // Filter antrean sirkulasi
  searchSirkulasiQuery: '',    // Kata kunci pencarian sirkulasi
  searchBooksQuery: '',        // Kata kunci pencarian buku
  filterCategoryBook: '',      // Filter kategori buku
  filterStatusBook: '',        // Filter ketersediaan buku
  selectedPeminjamanForReturn: null, // Peminjaman aktif yang akan diproses kembali
  currentQrBook: null,         // Buku yang sedang dibuka jendela stiker QR-nya
  deleteTargetBook: null,      // Buku yang ditargetkan untuk dihapus
  selectedCoverFile: null,     // Berkas gambar sampul buku yang dipilih untuk diunggah
  selectedPosterFile: null,    // Berkas gambar poster pengumuman yang dipilih untuk diunggah
  searchPengumumanQuery: '',   // Kata kunci pencarian pengumuman
  filterKategoriPengumuman: '', // Filter kategori pengumuman
  currentEditPengumuman: null, // Pengumuman yang sedang diedit
  deleteTargetPengumuman: null,// Pengumuman yang ditargetkan untuk dihapus
  activeSirkulasiSubtab: 'prapinjam', // Sub-meja sirkulasi aktif ('prapinjam' | 'walkin' | 'dipinjam')
  searchPrapinjamQuery: '',    // Pencarian prapinjam
  searchDipinjamQuery: ''      // Pencarian buku sedang dipinjam
};

// Konfigurasi header judul & subjudul untuk masing-masing tab
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
