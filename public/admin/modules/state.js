/**
 * CAKRAWALA Digital Library - State Management Admin Dashboard
 * File: public/admin/modules/state.js
 */

export const state = {
  activeTab: 'siswa', // 'siswa' | 'guru' | 'petugas'
  searchQuery: '',
  isLoading: false,
  modalMode: 'add', // 'add' | 'edit'
  editingRecord: null, // Objek baris data yang sedang diedit
  cache: {
    siswa: [],
    guru: [],
    petugas: []
  },
  deleteTarget: null // { id_user, name, entity }
};

// Konfigurasi Metadata Tab Admin
export const TAB_CONFIGS = {
  siswa: {
    title: 'Manajemen Data Siswa',
    breadcrumb: 'Manajemen Siswa',
    desc: 'Kelola data pokok siswa dan autentikasi akun perpustakaan secara terintegrasi.',
    tableTitle: 'Daftar Siswa Terdaftar',
    addBtnText: 'Tambah Siswa Baru',
    modalTitle: 'Tambah Siswa Baru',
    modalSubtitle: 'Lengkapi data profil siswa dan kredensial akun login sistem perpustakaan.',
    columns: ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Email', 'Kontak', 'Username', 'Aksi']
  },
  guru: {
    title: 'Manajemen Data Guru',
    breadcrumb: 'Manajemen Guru',
    desc: 'Kelola data guru pengajar dan hak akses sistem perpustakaan digital.',
    tableTitle: 'Daftar Guru Terdaftar',
    addBtnText: 'Tambah Guru Baru',
    modalTitle: 'Tambah Guru Baru',
    modalSubtitle: 'Lengkapi data profil guru dan kredensial akun login sistem perpustakaan.',
    columns: ['No', 'NIP', 'Nama Guru', 'Mata Pelajaran', 'Email', 'Kontak', 'Username', 'Aksi']
  },
  petugas: {
    title: 'Manajemen Data Petugas',
    breadcrumb: 'Manajemen Petugas',
    desc: 'Kelola data staf pustakawan dan otorisasi sirkulasi perpustakaan.',
    tableTitle: 'Daftar Petugas Perpustakaan',
    addBtnText: 'Tambah Petugas Baru',
    modalTitle: 'Tambah Petugas Baru',
    modalSubtitle: 'Lengkapi data profil petugas dan kredensial akun login sirkulasi perpustakaan.',
    columns: ['No', 'ID Petugas', 'Nama Petugas', 'Email', 'Kontak', 'Username', 'Aksi']
  }
};

// Referensi Elemen DOM (Lazy-evaluated agar aman dipanggil saat DOM siap)
export const DOM = {
  get btnToggleMobileSidebar() { return document.getElementById('btnToggleMobileSidebar'); },
  get btnCloseMobileSidebar() { return document.getElementById('btnCloseMobileSidebar'); },
  get adminSidebar() { return document.getElementById('adminSidebar'); },
  get sidebarBackdrop() { return document.getElementById('sidebarBackdrop'); },

  get tabBtnSiswa() { return document.getElementById('tabBtnSiswa'); },
  get tabBtnGuru() { return document.getElementById('tabBtnGuru'); },
  get tabBtnPetugas() { return document.getElementById('tabBtnPetugas'); },
  get badgeCountSiswa() { return document.getElementById('badgeCountSiswa'); },
  get badgeCountGuru() { return document.getElementById('badgeCountGuru'); },
  get badgeCountPetugas() { return document.getElementById('badgeCountPetugas'); },

  get headerBreadcrumb() { return document.getElementById('headerBreadcrumb'); },
  get headerSubBreadcrumb() { return document.getElementById('headerSubBreadcrumb'); },
  get headerPageTitle() { return document.getElementById('headerPageTitle'); },
  get headerPageDesc() { return document.getElementById('headerPageDesc'); },

  get searchInput() { return document.getElementById('searchInput'); },
  get btnClearSearch() { return document.getElementById('btnClearSearch'); },
  get btnRefreshData() { return document.getElementById('btnRefreshData'); },
  get iconRefresh() { return document.getElementById('iconRefresh'); },
  get btnOpenAddModal() { return document.getElementById('btnOpenAddModal'); },
  get btnAddText() { return document.getElementById('btnAddText'); },

  get tableTitle() { return document.getElementById('tableTitle'); },
  get tableRecordCount() { return document.getElementById('tableRecordCount'); },
  get tableHeadRow() { return document.getElementById('tableHeadRow'); },
  get tableBody() { return document.getElementById('tableBody'); },

  get modalAddUser() { return document.getElementById('modalAddUser'); },
  get modalAddContent() { return document.getElementById('modalAddContent'); },
  get modalAddTitle() { return document.getElementById('modalAddTitle'); },
  get modalAddSubtitle() { return document.getElementById('modalAddSubtitle'); },
  get modalAddIcon() { return document.getElementById('modalAddIcon'); },
  get btnCancelAddModal() { return document.getElementById('btnCancelAddModal'); },
  get btnCloseAddModal() { return document.getElementById('btnCloseAddModal'); },
  get formAddUser() { return document.getElementById('formAddUser'); },
  get dynamicFormFields() { return document.getElementById('dynamicFormFields'); },
  get inputUsername() { return document.getElementById('inputUsername'); },
  get inputPassword() { return document.getElementById('inputPassword'); },
  get passwordRequiredStar() { return document.getElementById('passwordRequiredStar'); },
  get passwordHelpText() { return document.getElementById('passwordHelpText'); },
  get btnToggleModalPassword() { return document.getElementById('btnToggleModalPassword'); },
  get iconToggleModalPassword() { return document.getElementById('iconToggleModalPassword'); },
  get modalFormError() { return document.getElementById('modalFormError'); },
  get modalFormErrorText() { return document.getElementById('modalFormErrorText'); },
  get btnSubmitAddUser() { return document.getElementById('btnSubmitAddUser'); },
  get iconSubmitSpinner() { return document.getElementById('iconSubmitSpinner'); },
  get textBtnSubmit() { return document.getElementById('textBtnSubmit'); },

  get modalDeleteConfirm() { return document.getElementById('modalDeleteConfirm'); },
  get modalDeleteContent() { return document.getElementById('modalDeleteContent'); },
  get deleteTargetName() { return document.getElementById('deleteTargetName'); },
  get btnCancelDelete() { return document.getElementById('btnCancelDelete'); },
  get btnConfirmDelete() { return document.getElementById('btnConfirmDelete'); },
  get iconDeleteSpinner() { return document.getElementById('iconDeleteSpinner'); },
  get textBtnDelete() { return document.getElementById('textBtnDelete'); },

  get btnLogout() { return document.getElementById('btnLogout'); },
  get toastContainer() { return document.getElementById('toastContainer'); },
  get adminAvatarInitials() { return document.getElementById('adminAvatarInitials'); },
  get adminUserName() { return document.getElementById('adminUserName'); }
};
