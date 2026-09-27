/**
 * CAKRAWALA Digital Library - Admin Dashboard Controller
 * Client-Side Architecture: Vanilla JS (ES6+), Supabase Cloud, Tailwind CSS
 * Standard: UI/UX Promax & Antislop (DURING mode)
 */

(function () {
  'use strict';

  // ========================================================
  // 1. AUTHENTICATION & ACCESS GUARD
  // ========================================================
  function verifyAdminAuth() {
    const isLoggedIn = sessionStorage.getItem('cakrawala_logged_in');
    const role = sessionStorage.getItem('cakrawala_role');

    if (isLoggedIn !== 'true' || role !== 'Admin') {
      window.location.replace('../login.html');
      return false;
    }

    // Set admin display name if available in session
    syncAdminProfileUI();

    return true;
  }

  if (!verifyAdminAuth()) return;

  // ========================================================
  // 2. STATE MANAGEMENT
  // ========================================================
  const state = {
    activeTab: 'siswa', // 'siswa' | 'guru' | 'petugas'
    searchQuery: '',
    isLoading: false,
    modalMode: 'add', // 'add' | 'edit'
    editingRecord: null, // Objek yang sedang diedit
    cache: {
      siswa: [],
      guru: [],
      petugas: []
    },
    deleteTarget: null // { id_user, name, entity }
  };

  // Tab UI Configurations
  const TAB_CONFIGS = {
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

  // ========================================================
  // 3. DOM ELEMENT REFERENCES
  // ========================================================
  const DOM = {
    // Mobile Sidebar
    btnToggleMobileSidebar: document.getElementById('btnToggleMobileSidebar'),
    btnCloseMobileSidebar: document.getElementById('btnCloseMobileSidebar'),
    adminSidebar: document.getElementById('adminSidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),

    // Nav Tabs
    tabBtnSiswa: document.getElementById('tabBtnSiswa'),
    tabBtnGuru: document.getElementById('tabBtnGuru'),
    tabBtnPetugas: document.getElementById('tabBtnPetugas'),
    badgeCountSiswa: document.getElementById('badgeCountSiswa'),
    badgeCountGuru: document.getElementById('badgeCountGuru'),
    badgeCountPetugas: document.getElementById('badgeCountPetugas'),

    // Top Bar Headers
    headerBreadcrumb: document.getElementById('headerBreadcrumb'),
    headerSubBreadcrumb: document.getElementById('headerSubBreadcrumb'),
    headerPageTitle: document.getElementById('headerPageTitle'),
    headerPageDesc: document.getElementById('headerPageDesc'),

    // Controls
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    btnRefreshData: document.getElementById('btnRefreshData'),
    iconRefresh: document.getElementById('iconRefresh'),
    btnOpenAddModal: document.getElementById('btnOpenAddModal'),
    btnAddText: document.getElementById('btnAddText'),

    // Table
    tableTitle: document.getElementById('tableTitle'),
    tableRecordCount: document.getElementById('tableRecordCount'),
    tableHeadRow: document.getElementById('tableHeadRow'),
    tableBody: document.getElementById('tableBody'),

    // Add User Modal
    modalAddUser: document.getElementById('modalAddUser'),
    modalAddContent: document.getElementById('modalAddContent'),
    modalAddTitle: document.getElementById('modalAddTitle'),
    modalAddSubtitle: document.getElementById('modalAddSubtitle'),
    modalAddIcon: document.getElementById('modalAddIcon'),
    btnCancelAddModal: document.getElementById('btnCancelAddModal'),
    btnCloseAddModal: document.getElementById('btnCloseAddModal'),
    formAddUser: document.getElementById('formAddUser'),
    dynamicFormFields: document.getElementById('dynamicFormFields'),
    inputUsername: document.getElementById('inputUsername'),
    inputPassword: document.getElementById('inputPassword'),
    passwordRequiredStar: document.getElementById('passwordRequiredStar'),
    passwordHelpText: document.getElementById('passwordHelpText'),
    btnToggleModalPassword: document.getElementById('btnToggleModalPassword'),
    iconToggleModalPassword: document.getElementById('iconToggleModalPassword'),
    modalFormError: document.getElementById('modalFormError'),
    modalFormErrorText: document.getElementById('modalFormErrorText'),
    btnSubmitAddUser: document.getElementById('btnSubmitAddUser'),
    iconSubmitSpinner: document.getElementById('iconSubmitSpinner'),
    textBtnSubmit: document.getElementById('textBtnSubmit'),

    // Delete Modal
    modalDeleteConfirm: document.getElementById('modalDeleteConfirm'),
    modalDeleteContent: document.getElementById('modalDeleteContent'),
    deleteTargetName: document.getElementById('deleteTargetName'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),
    iconDeleteSpinner: document.getElementById('iconDeleteSpinner'),
    textBtnDelete: document.getElementById('textBtnDelete'),

    // Global
    btnLogout: document.getElementById('btnLogout'),
    toastContainer: document.getElementById('toastContainer'),

    // Admin Profile Settings Modal & Capsule
    btnAdminProfile: document.getElementById('btnAdminProfile'),
    adminAvatarInitials: document.getElementById('adminAvatarInitials'),
    modalAdminProfile: document.getElementById('modalAdminProfile'),
    modalAdminProfileContent: document.getElementById('modalAdminProfileContent'),
    btnCancelAdminProfileModal: document.getElementById('btnCancelAdminProfileModal'),
    btnCloseAdminProfileModal: document.getElementById('btnCloseAdminProfileModal'),
    formAdminProfile: document.getElementById('formAdminProfile'),
    modalAdminAvatarPreview: document.getElementById('modalAdminAvatarPreview'),
    modalAdminDisplayId: document.getElementById('modalAdminDisplayId'),
    inputAdminUsername: document.getElementById('inputAdminUsername'),
    inputAdminNewPassword: document.getElementById('inputAdminNewPassword'),
    inputAdminConfirmPassword: document.getElementById('inputAdminConfirmPassword'),
    btnToggleAdminNewPassword: document.getElementById('btnToggleAdminNewPassword'),
    iconToggleAdminNewPassword: document.getElementById('iconToggleAdminNewPassword'),
    btnToggleAdminConfirmPassword: document.getElementById('btnToggleAdminConfirmPassword'),
    iconToggleAdminConfirmPassword: document.getElementById('iconToggleAdminConfirmPassword'),
    modalAdminProfileError: document.getElementById('modalAdminProfileError'),
    modalAdminProfileErrorText: document.getElementById('modalAdminProfileErrorText'),
    btnSubmitAdminProfile: document.getElementById('btnSubmitAdminProfile'),
    iconSubmitAdminProfileSpinner: document.getElementById('iconSubmitAdminProfileSpinner'),
    textBtnSubmitAdminProfile: document.getElementById('textBtnSubmitAdminProfile')
  };

  // ========================================================
  // 4. UTILITIES & TOAST NOTIFICATION
  // ========================================================

  /**
   * Tampilkan notifikasi toast mengambang (Clean antislop feedback)
   */
  function showToast(message, type = 'success') {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';

    toast.className = `flex items-center gap-3 rounded-xl border p-4 shadow-lg transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto ${isSuccess
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-slate-900 border-slate-800 text-white'
      }`;

    const iconClass = isSuccess
      ? 'ph ph-check-circle text-emerald-600'
      : isError
        ? 'ph ph-warning-circle text-rose-600'
        : 'ph ph-info text-blue-400';

    toast.innerHTML = `
      <i class="${iconClass} text-xl flex-shrink-0" aria-hidden="true"></i>
      <div class="flex-1 text-xs font-semibold leading-relaxed">${escapeHtml(message)}</div>
      <button type="button" aria-label="Tutup notifikasi" class="text-slate-400 hover:text-slate-600 p-1">
        <i class="ph ph-x text-sm"></i>
      </button>
    `;

    DOM.toastContainer.appendChild(toast);

    // Trigger animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      dismissToast(toast);
    }, 4000);

    // Close button handler
    const closeBtn = toast.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearTimeout(timer);
        dismissToast(toast);
      });
    }
  }

  function dismissToast(toast) {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate ID User unik yang muat dalam VARCHAR(10)
   */
  function generateUserId() {
    const timestampStr = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 5).toUpperCase();
    return ('U' + timestampStr + randomHex).slice(0, 10);
  }

  // ========================================================
  // 5. DATABASE QUERIES & DATA SYNCHRONIZATION
  // ========================================================

  /**
   * Helper untuk memastikan relasi data_user terhubung dengan aman
   */
  async function enrichWithUserData(rows, fkColumn = 'id_user') {
    if (!rows || rows.length === 0) return rows;

    // Cek apakah data_user sudah terisi dengan baik
    const needsFallback = rows.some(r => r[fkColumn] && (!r.data_user || typeof r.data_user !== 'object'));
    if (!needsFallback) return rows;

    try {
      const userIds = rows.map(r => r[fkColumn]).filter(Boolean);
      if (userIds.length === 0) return rows;

      const { data: users, error } = await db
        .from('data_user')
        .select('id_user, username, role')
        .in('id_user', userIds);

      if (!error && users) {
        const userMap = {};
        users.forEach(u => { userMap[u.id_user] = u; });

        rows.forEach(r => {
          if (!r.data_user && r[fkColumn] && userMap[r[fkColumn]]) {
            r.data_user = userMap[r[fkColumn]];
          }
        });
      }
    } catch (err) {
      console.warn('Fallback user data query error:', err);
    }

    return rows;
  }

  /**
   * Mengambil data siswa dari Supabase
   */
  async function fetchSiswa() {
    const { data, error } = await db
      .from('data_siswa')
      .select('nisn_siswa, nama_siswa, kelas, email_siswa, kontak_siswa, id_user, data_user(id_user, username, role)')
      .order('nama_siswa', { ascending: true });

    if (error) throw error;
    return await enrichWithUserData(data, 'id_user');
  }

  /**
   * Mengambil data guru dari Supabase
   */
  async function fetchGuru() {
    const { data, error } = await db
      .from('data_guru')
      .select('nip_guru, nama_guru, mata_pelajaran, email_guru, kontak_guru, id_user, data_user(id_user, username, role)')
      .order('nama_guru', { ascending: true });

    if (error) throw error;
    return await enrichWithUserData(data, 'id_user');
  }

  /**
   * Mengambil data petugas dari Supabase
   */
  async function fetchPetugas() {
    const { data, error } = await db
      .from('data_petugas')
      .select('id_petugas, nama_petugas, email_petugas, kontak_petugas, id_user, data_user(id_user, username, role)')
      .order('nama_petugas', { ascending: true });

    if (error) throw error;
    return await enrichWithUserData(data, 'id_user');
  }

  /**
   * Muat seluruh data untuk tab aktif dan perbarui badge hitungan
   */
  async function loadData(tab = state.activeTab, isSilent = false) {
    if (!isSilent) {
      state.isLoading = true;
      renderTable();
    }

    if (DOM.iconRefresh) DOM.iconRefresh.classList.add('animate-spin');

    try {
      if (tab === 'siswa') {
        const data = await fetchSiswa();
        state.cache.siswa = data || [];
        updateBadge('siswa', state.cache.siswa.length);
      } else if (tab === 'guru') {
        const data = await fetchGuru();
        state.cache.guru = data || [];
        updateBadge('guru', state.cache.guru.length);
      } else if (tab === 'petugas') {
        const data = await fetchPetugas();
        state.cache.petugas = data || [];
        updateBadge('petugas', state.cache.petugas.length);
      }
      state.isLoading = false;
      renderTable();
    } catch (err) {
      console.error('Error saat mengambil data Supabase:', err);
      state.isLoading = false;
      renderTableError(err.message || 'Gagal tersambung ke database Supabase.');
    } finally {
      if (DOM.iconRefresh) {
        setTimeout(() => DOM.iconRefresh.classList.remove('animate-spin'), 300);
      }
    }
  }

  /**
   * Refresh semua hitungan badge entitas di background
   */
  async function refreshAllBadges() {
    try {
      const [siswaRes, guruRes, petugasRes] = await Promise.all([
        db.from('data_siswa').select('nisn_siswa', { count: 'exact', head: true }),
        db.from('data_guru').select('nip_guru', { count: 'exact', head: true }),
        db.from('data_petugas').select('id_petugas', { count: 'exact', head: true })
      ]);

      if (siswaRes.count !== null && siswaRes.count !== undefined) updateBadge('siswa', siswaRes.count);
      if (guruRes.count !== null && guruRes.count !== undefined) updateBadge('guru', guruRes.count);
      if (petugasRes.count !== null && petugasRes.count !== undefined) updateBadge('petugas', petugasRes.count);
    } catch (err) {
      console.warn('Gagal memuat ringkasan badge:', err);
    }
  }

  function updateBadge(tab, count) {
    if (tab === 'siswa' && DOM.badgeCountSiswa) DOM.badgeCountSiswa.textContent = count;
    if (tab === 'guru' && DOM.badgeCountGuru) DOM.badgeCountGuru.textContent = count;
    if (tab === 'petugas' && DOM.badgeCountPetugas) DOM.badgeCountPetugas.textContent = count;
  }

  // ========================================================
  // 6. RENDER LOGIC: TABLE, SKELETON, EMPTY, & ERROR STATES
  // ========================================================

  /**
   * Render baris tabel sesuai data, status filter, atau state loading
   */
  function renderTable() {
    const config = TAB_CONFIGS[state.activeTab];
    if (!config) return;

    // 1. Render Header Kolom
    DOM.tableHeadRow.innerHTML = config.columns.map((col, index) => {
      const isAction = col === 'Aksi';
      const isNumber = col === 'No';
      const alignClass = isAction ? 'text-right' : isNumber ? 'text-center w-14' : 'text-left';
      return `<th scope="col" class="px-6 py-3.5 ${alignClass}">${escapeHtml(col)}</th>`;
    }).join('');

    // 2. Loading State: Skeleton shimmer (Antislop R-27)
    if (state.isLoading) {
      DOM.tableRecordCount.textContent = 'Memuat...';
      DOM.tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
        <tr class="animate-pulse">
          <td class="px-6 py-4 text-center"><div class="h-4 w-6 bg-slate-200 rounded mx-auto"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-28 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-36 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-32 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4"><div class="h-4 w-20 bg-slate-200 rounded"></div></td>
          <td class="px-6 py-4 text-right"><div class="h-8 w-16 bg-slate-200 rounded ml-auto"></div></td>
        </tr>
      `).join('');
      return;
    }

    // 3. Filter Dataset
    const dataset = state.cache[state.activeTab] || [];
    const query = state.searchQuery.toLowerCase().trim();

    const filtered = dataset.filter(item => {
      if (!query) return true;
      const username = (item.data_user && item.data_user.username) || '';

      if (state.activeTab === 'siswa') {
        return (
          (item.nama_siswa || '').toLowerCase().includes(query) ||
          (item.nisn_siswa || '').toLowerCase().includes(query) ||
          (item.kelas || '').toLowerCase().includes(query) ||
          (item.email_siswa || '').toLowerCase().includes(query) ||
          username.toLowerCase().includes(query)
        );
      } else if (state.activeTab === 'guru') {
        return (
          (item.nama_guru || '').toLowerCase().includes(query) ||
          (item.nip_guru || '').toLowerCase().includes(query) ||
          (item.mata_pelajaran || '').toLowerCase().includes(query) ||
          (item.email_guru || '').toLowerCase().includes(query) ||
          username.toLowerCase().includes(query)
        );
      } else if (state.activeTab === 'petugas') {
        return (
          (item.nama_petugas || '').toLowerCase().includes(query) ||
          (item.id_petugas || '').toLowerCase().includes(query) ||
          (item.email_petugas || '').toLowerCase().includes(query) ||
          (item.kontak_petugas || '').toLowerCase().includes(query) ||
          username.toLowerCase().includes(query)
        );
      }
      return false;
    });

    DOM.tableRecordCount.textContent = `${filtered.length} Data`;

    // 4. Empty State (Antislop R-27)
    if (filtered.length === 0) {
      const isSearchActive = query.length > 0;
      DOM.tableBody.innerHTML = `
        <tr>
          <td colspan="${config.columns.length}" class="py-16 px-6 text-center">
            <div class="max-w-sm mx-auto flex flex-col items-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <i class="${isSearchActive ? 'ph ph-magnifying-glass' : 'ph ph-folder-open'} text-3xl" aria-hidden="true"></i>
              </div>
              <h4 class="text-base font-extrabold text-slate-800">
                ${isSearchActive ? 'Tidak ada hasil yang cocok' : 'Belum ada data ' + config.breadcrumb.toLowerCase()}
              </h4>
              <p class="mt-1.5 text-xs text-slate-500 leading-relaxed">
                ${isSearchActive
          ? `Pencarian kata kunci "${escapeHtml(query)}" tidak menemukan kecocokan pada daftar saat ini.`
          : `Mulai kelola sistem dengan menambahkan ${config.breadcrumb.toLowerCase()} baru melalui tombol di bawah.`}
              </p>
              ${isSearchActive ? `
                <button type="button" id="btnResetSearchInEmpty" class="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-navy hover:bg-slate-50 transition-colors">
                  <i class="ph ph-x-circle text-base"></i>
                  <span>Bersihkan Pencarian</span>
                </button>
              ` : `
                <button type="button" id="btnAddInEmpty" class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition-colors">
                  <i class="ph ph-plus-circle text-base"></i>
                  <span>${config.addBtnText}</span>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;

      // Attach event handler untuk tombol di empty state
      const btnReset = document.getElementById('btnResetSearchInEmpty');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          DOM.searchInput.value = '';
          state.searchQuery = '';
          if (DOM.btnClearSearch) DOM.btnClearSearch.classList.add('hidden');
          renderTable();
        });
      }

      const btnAddEmpty = document.getElementById('btnAddInEmpty');
      if (btnAddEmpty) {
        btnAddEmpty.addEventListener('click', () => openAddModal());
      }
      return;
    }

    // 5. Render Data Rows (Clean modern zebra-hover, no thick borders)
    DOM.tableBody.innerHTML = filtered.map((row, index) => {
      const username = (row.data_user && row.data_user.username) || row.id_user || '-';
      const idUser = row.id_user || '';

      if (state.activeTab === 'siswa') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nisn_siswa)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_siswa)}</td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-navy border border-blue-100">
                ${escapeHtml(row.kelas)}
              </span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_siswa)}</td>
            <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_siswa)}</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                <i class="ph ph-user text-[11px] text-slate-400"></i>
                ${escapeHtml(username)}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-entity="Siswa"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password siswa"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_siswa)}" 
                  data-entity="Siswa"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun siswa"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else if (state.activeTab === 'guru') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nip_guru)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_guru)}</td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-100">
                ${escapeHtml(row.mata_pelajaran)}
              </span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_guru)}</td>
            <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_guru)}</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                <i class="ph ph-user text-[11px] text-slate-400"></i>
                ${escapeHtml(username)}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-entity="Guru"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password guru"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_guru)}" 
                  data-entity="Guru"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun guru"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else if (state.activeTab === 'petugas') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.id_petugas)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_petugas)}</td>
            <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_petugas)}</td>
            <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_petugas)}</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                <i class="ph ph-user text-[11px] text-slate-400"></i>
                ${escapeHtml(username)}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-entity="Petugas"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password petugas"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_petugas)}" 
                  data-entity="Petugas"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun petugas"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }
      return '';
    }).join('');

    // Attach listener ke semua tombol edit di tabel
    DOM.tableBody.querySelectorAll('.btn-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idUser = btn.dataset.iduser;
        const dataset = state.cache[state.activeTab] || [];
        const item = dataset.find(r => r.id_user === idUser);
        if (item) {
          openEditModal(item);
        }
      });
    });

    // Attach listener ke semua tombol delete di tabel
    DOM.tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idUser = btn.dataset.iduser;
        const name = btn.dataset.name;
        const entity = btn.dataset.entity;
        openDeleteModal(idUser, name, entity);
      });
    });
  }

  /**
   * Render Error State jika terjadi kegagalan koneksi Supabase (Antislop R-27)
   */
  function renderTableError(errorMessage) {
    const config = TAB_CONFIGS[state.activeTab];
    DOM.tableRecordCount.textContent = 'Error';
    DOM.tableBody.innerHTML = `
      <tr>
        <td colspan="${config ? config.columns.length : 8}" class="py-14 px-6 text-center">
          <div class="max-w-sm mx-auto flex flex-col items-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
              <i class="ph ph-cloud-slash text-2xl" aria-hidden="true"></i>
            </div>
            <h4 class="text-base font-extrabold text-slate-900">Gagal Mengambil Data</h4>
            <p class="mt-1 text-xs text-slate-500 leading-relaxed">
              ${escapeHtml(errorMessage)}
            </p>
            <button 
              type="button" 
              id="btnRetryFetch" 
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition-colors"
            >
              <i class="ph ph-arrows-clockwise text-sm"></i>
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        </td>
      </tr>
    `;

    const btnRetry = document.getElementById('btnRetryFetch');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => loadData(state.activeTab));
    }
  }

  // ========================================================
  // 7. TAB NAVIGATION HANDLER
  // ========================================================
  function switchTab(newTab) {
    if (state.activeTab === newTab && state.cache[newTab].length > 0) return;

    state.activeTab = newTab;
    const config = TAB_CONFIGS[newTab];

    // Update Header Text
    DOM.headerPageTitle.textContent = config.title;
    DOM.headerSubBreadcrumb.textContent = config.breadcrumb;
    DOM.headerPageDesc.textContent = config.desc;
    DOM.tableTitle.textContent = config.tableTitle;
    DOM.btnAddText.textContent = config.addBtnText;

    // Update Sidebar Navigation Active States
    [DOM.tabBtnSiswa, DOM.tabBtnGuru, DOM.tabBtnPetugas].forEach(btn => {
      if (!btn) return;
      const isTarget = btn.dataset.tab === newTab;
      if (isTarget) {
        btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 bg-navy text-white shadow-sm shadow-navy/20';
        const badge = btn.querySelector('span[id^="badgeCount"]');
        if (badge) badge.className = 'rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white';
      } else {
        btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-navy';
        const badge = btn.querySelector('span[id^="badgeCount"]');
        if (badge) badge.className = 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600';
      }
    });

    // Close Mobile Sidebar if opened
    closeMobileSidebar();

    // Reset Search
    DOM.searchInput.value = '';
    state.searchQuery = '';
    if (DOM.btnClearSearch) DOM.btnClearSearch.classList.add('hidden');

    // Fetch data if cache empty or reload
    loadData(newTab);
  }

  // ========================================================
  // 8. MODAL FORM: TAMBAH & EDIT PENGGUNA (DYNAMIC PER ENTITY)
  // ========================================================

  /**
   * Buka modal form tambah user baru
   */
  function openAddModal() {
    state.modalMode = 'add';
    state.editingRecord = null;

    const config = TAB_CONFIGS[state.activeTab];
    DOM.modalAddTitle.textContent = config.modalTitle;
    DOM.modalAddSubtitle.textContent = config.modalSubtitle;
    DOM.modalFormError.classList.add('hidden');
    DOM.formAddUser.reset();

    // Reset password mode untuk tambah
    if (DOM.passwordRequiredStar) DOM.passwordRequiredStar.classList.remove('hidden');
    if (DOM.inputPassword) {
      DOM.inputPassword.required = true;
      DOM.inputPassword.placeholder = 'Minimal 6 karakter';
    }
    if (DOM.passwordHelpText) {
      DOM.passwordHelpText.textContent = 'Password autentikasi pengguna.';
    }
    if (DOM.textBtnSubmit) {
      DOM.textBtnSubmit.textContent = 'Simpan Pengguna';
    }

    // Generate Dynamic Form Fields based on tab
    if (state.activeTab === 'siswa') {
      DOM.modalAddIcon.className = 'ph ph-student';
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNisn" class="block text-xs font-bold text-slate-700 mb-1">
              NISN Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNisn" 
              name="nisn_siswa" 
              required 
              maxlength="10" 
              placeholder="Contoh: 0051234567" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputKelas" class="block text-xs font-bold text-slate-700 mb-1">
              Kelas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputKelas" 
              name="kelas" 
              required 
              maxlength="20" 
              placeholder="Contoh: XII MIPA 1" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaSiswa" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Siswa <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaSiswa" 
            name="nama_siswa" 
            required 
            maxlength="50" 
            placeholder="Masukkan nama lengkap siswa" 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              Email Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailSiswa" 
              name="email_siswa" 
              required 
              maxlength="50" 
              placeholder="siswa@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakSiswa" 
              name="kontak_siswa" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    } else if (state.activeTab === 'guru') {
      DOM.modalAddIcon.className = 'ph ph-chalkboard-teacher';
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNip" class="block text-xs font-bold text-slate-700 mb-1">
              NIP Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNip" 
              name="nip_guru" 
              required 
              maxlength="20" 
              placeholder="Contoh: 198501012010011001" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputMapel" class="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputMapel" 
              name="mata_pelajaran" 
              required 
              maxlength="50" 
              placeholder="Contoh: Bahasa Indonesia" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaGuru" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Guru & Gelar <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaGuru" 
            name="nama_guru" 
            required 
            maxlength="50" 
            placeholder="Contoh: Dr. Budi Santoso, M.Pd." 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailGuru" class="block text-xs font-bold text-slate-700 mb-1">
              Email Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailGuru" 
              name="email_guru" 
              required 
              maxlength="50" 
              placeholder="guru@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakGuru" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakGuru" 
              name="kontak_guru" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    } else if (state.activeTab === 'petugas') {
      DOM.modalAddIcon.className = 'ph ph-user-gear';
      const autoId = 'PTG' + Math.floor(100 + Math.random() * 900);
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputIdPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              ID Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputIdPetugas" 
              name="id_petugas" 
              required 
              maxlength="10" 
              value="${autoId}" 
              placeholder="Contoh: PTG001" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputNamaPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNamaPetugas" 
              name="nama_petugas" 
              required 
              maxlength="50" 
              placeholder="Masukkan nama lengkap petugas" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Email Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailPetugas" 
              name="email_petugas" 
              required 
              maxlength="50" 
              placeholder="petugas@cakrawala.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakPetugas" 
              name="kontak_petugas" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }

    // Tampilkan Modal dengan animasi halus
    DOM.modalAddUser.classList.remove('hidden');
    requestAnimationFrame(() => {
      DOM.modalAddUser.classList.remove('opacity-0');
      DOM.modalAddContent.classList.remove('scale-95');
    });

    // Auto focus ke input pertama
    setTimeout(() => {
      const firstInput = DOM.dynamicFormFields.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 150);
  }

  /**
   * Buka modal form edit user dan reset password jika lupa sandi
   */
  function openEditModal(item) {
    state.modalMode = 'edit';
    state.editingRecord = item;

    const config = TAB_CONFIGS[state.activeTab];
    DOM.modalAddTitle.textContent = `Edit Data ${config.breadcrumb}`;
    DOM.modalAddSubtitle.textContent = 'Perbarui data profil atau reset kata sandi jika pengguna lupa password login.';
    DOM.modalFormError.classList.add('hidden');
    DOM.formAddUser.reset();

    // Atur field kredensial akun untuk edit (password opsional untuk reset)
    if (DOM.passwordRequiredStar) DOM.passwordRequiredStar.classList.add('hidden');
    if (DOM.inputPassword) {
      DOM.inputPassword.required = false;
      DOM.inputPassword.value = '';
      DOM.inputPassword.placeholder = 'Kosongkan jika tidak ingin mengubah password';
    }
    if (DOM.passwordHelpText) {
      DOM.passwordHelpText.textContent = 'Isi password baru untuk mereset sandi jika pengguna lupa, atau kosongkan jika tetap.';
    }
    if (DOM.inputUsername) {
      DOM.inputUsername.value = (item.data_user && item.data_user.username) || '';
    }
    if (DOM.textBtnSubmit) {
      DOM.textBtnSubmit.textContent = 'Simpan Perubahan';
    }

    // Render Dynamic Form Fields terisi data yang ada
    if (state.activeTab === 'siswa') {
      DOM.modalAddIcon.className = 'ph ph-note-pencil';
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNisn" class="block text-xs font-bold text-slate-700 mb-1">
              NISN Siswa <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputNisn" 
              name="nisn_siswa" 
              readonly
              value="${escapeHtml(item.nisn_siswa)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputKelas" class="block text-xs font-bold text-slate-700 mb-1">
              Kelas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputKelas" 
              name="kelas" 
              required 
              maxlength="20" 
              value="${escapeHtml(item.kelas)}" 
              placeholder="Contoh: XII MIPA 1" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaSiswa" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Siswa <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaSiswa" 
            name="nama_siswa" 
            required 
            maxlength="50" 
            value="${escapeHtml(item.nama_siswa)}" 
            placeholder="Masukkan nama lengkap siswa" 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              Email Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailSiswa" 
              name="email_siswa" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_siswa)}" 
              placeholder="siswa@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakSiswa" 
              name="kontak_siswa" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_siswa)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    } else if (state.activeTab === 'guru') {
      DOM.modalAddIcon.className = 'ph ph-note-pencil';
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNip" class="block text-xs font-bold text-slate-700 mb-1">
              NIP Guru <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputNip" 
              name="nip_guru" 
              readonly 
              value="${escapeHtml(item.nip_guru)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputMapel" class="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputMapel" 
              name="mata_pelajaran" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.mata_pelajaran)}" 
              placeholder="Contoh: Bahasa Indonesia" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaGuru" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Guru & Gelar <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaGuru" 
            name="nama_guru" 
            required 
            maxlength="50" 
            value="${escapeHtml(item.nama_guru)}" 
            placeholder="Contoh: Dr. Budi Santoso, M.Pd." 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailGuru" class="block text-xs font-bold text-slate-700 mb-1">
              Email Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailGuru" 
              name="email_guru" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_guru)}" 
              placeholder="guru@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakGuru" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakGuru" 
              name="kontak_guru" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_guru)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    } else if (state.activeTab === 'petugas') {
      DOM.modalAddIcon.className = 'ph ph-note-pencil';
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputIdPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              ID Petugas <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputIdPetugas" 
              name="id_petugas" 
              readonly 
              value="${escapeHtml(item.id_petugas)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputNamaPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNamaPetugas" 
              name="nama_petugas" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.nama_petugas)}" 
              placeholder="Masukkan nama lengkap petugas" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Email Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailPetugas" 
              name="email_petugas" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_petugas)}" 
              placeholder="petugas@cakrawala.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakPetugas" 
              name="kontak_petugas" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_petugas)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }

    // Tampilkan Modal dengan animasi halus
    DOM.modalAddUser.classList.remove('hidden');
    requestAnimationFrame(() => {
      DOM.modalAddUser.classList.remove('opacity-0');
      DOM.modalAddContent.classList.remove('scale-95');
    });

    // Auto focus ke field pertama yang dapat diedit
    setTimeout(() => {
      const inputs = DOM.dynamicFormFields.querySelectorAll('input:not([readonly])');
      if (inputs.length > 0) inputs[0].focus();
    }, 150);
  }

  function closeAddModal() {
    DOM.modalAddUser.classList.add('opacity-0');
    DOM.modalAddContent.classList.add('scale-95');
    setTimeout(() => {
      DOM.modalAddUser.classList.add('hidden');
      DOM.formAddUser.reset();
      state.modalMode = 'add';
      state.editingRecord = null;
    }, 200);
  }

  /**
   * Alur Transaksi Tambah & Edit Pengguna Otomatis (Termasuk Reset Password)
   */
  async function handleAddUserSubmit(event) {
    event.preventDefault();
    DOM.modalFormError.classList.add('hidden');

    const formData = new FormData(DOM.formAddUser);
    const username = (formData.get('username') || '').trim();
    const password = (formData.get('password') || '').trim();

    // ========================================================
    // MODE EDIT PENGGUNA & RESET PASSWORD
    // ========================================================
    if (state.modalMode === 'edit') {
      const editingRecord = state.editingRecord;
      if (!editingRecord || !editingRecord.id_user) {
        showModalFormError('Data akun pengguna tidak ditemukan.');
        return;
      }

      if (!username) {
        showModalFormError('Username wajib diisi.');
        return;
      }

      if (password && password.length < 6) {
        showModalFormError('Password baru minimal harus 6 karakter.');
        return;
      }

      setModalSubmitLoading(true);

      try {
        // 1. Update data_user (Username dan opsional Reset Password)
        const userUpdatePayload = { username: username };
        if (password) {
          userUpdatePayload.password = password;
        }

        const { error: userError } = await db
          .from('data_user')
          .update(userUpdatePayload)
          .eq('id_user', editingRecord.id_user);

        if (userError) {
          if (userError.code === '23505' || userError.message.includes('unique')) {
            throw new Error(`Username "${username}" sudah digunakan oleh akun lain.`);
          }
          throw new Error(userError.message || 'Gagal memperbarui akun user.');
        }

        // 2. Update tabel profil masing-masing
        let profileError = null;
        let displayName = '';

        if (state.activeTab === 'siswa') {
          const nama = (formData.get('nama_siswa') || '').trim();
          const kelas = (formData.get('kelas') || '').trim();
          const email = (formData.get('email_siswa') || '').trim();
          const kontak = (formData.get('kontak_siswa') || '').trim();
          displayName = nama;

          const { error } = await db
            .from('data_siswa')
            .update({
              nama_siswa: nama,
              kelas: kelas,
              email_siswa: email,
              kontak_siswa: kontak
            })
            .eq('nisn_siswa', editingRecord.nisn_siswa);
          profileError = error;

        } else if (state.activeTab === 'guru') {
          const nama = (formData.get('nama_guru') || '').trim();
          const mapel = (formData.get('mata_pelajaran') || '').trim();
          const email = (formData.get('email_guru') || '').trim();
          const kontak = (formData.get('kontak_guru') || '').trim();
          displayName = nama;

          const { error } = await db
            .from('data_guru')
            .update({
              nama_guru: nama,
              mata_pelajaran: mapel,
              email_guru: email,
              kontak_guru: kontak
            })
            .eq('nip_guru', editingRecord.nip_guru);
          profileError = error;

        } else if (state.activeTab === 'petugas') {
          const nama = (formData.get('nama_petugas') || '').trim();
          const email = (formData.get('email_petugas') || '').trim();
          const kontak = (formData.get('kontak_petugas') || '').trim();
          displayName = nama;

          const { error } = await db
            .from('data_petugas')
            .update({
              nama_petugas: nama,
              email_petugas: email,
              kontak_petugas: kontak
            })
            .eq('id_petugas', editingRecord.id_petugas);
          profileError = error;
        }

        if (profileError) {
          throw new Error(profileError.message || 'Gagal memperbarui profil pengguna.');
        }

        setModalSubmitLoading(false);
        closeAddModal();

        if (password) {
          showToast(`Data profil dan password baru untuk ${displayName} berhasil diperbarui!`, 'success');
        } else {
          showToast(`Data profil ${displayName} berhasil diperbarui.`, 'success');
        }

        // Refresh Data
        await loadData(state.activeTab, false);

      } catch (err) {
        console.error('Error saat memperbarui user:', err);
        setModalSubmitLoading(false);
        showModalFormError(err.message || 'Terjadi kesalahan sistem saat memperbarui data.');
      }
      return;
    }

    // ========================================================
    // MODE TAMBAH PENGGUNA BARU
    // ========================================================

    // Validasi Dasar
    if (!username || !password) {
      showModalFormError('Username dan password wajib diisi.');
      return;
    }

    if (password.length < 6) {
      showModalFormError('Password minimal harus terdiri dari 6 karakter.');
      return;
    }

    // Role mapping
    const roleMapping = {
      siswa: 'Siswa',
      guru: 'Guru',
      petugas: 'Petugas'
    };
    const role = roleMapping[state.activeTab];

    // Status UI Loading
    setModalSubmitLoading(true);

    const idUser = generateUserId();

    try {
      // 1. TAHAP 1: Insert akun ke tabel data_user
      const { error: userError } = await db
        .from('data_user')
        .insert([
          {
            id_user: idUser,
            username: username,
            password: password,
            role: role
          }
        ]);

      if (userError) {
        if (userError.code === '23505' || userError.message.includes('unique')) {
          throw new Error(`Username "${username}" sudah digunakan. Silakan gunakan username lain.`);
        }
        throw new Error(userError.message || 'Gagal membuat akun user.');
      }

      // 2. TAHAP 2: Insert profil ke tabel masing-masing
      let profileError = null;

      if (state.activeTab === 'siswa') {
        const nisn = (formData.get('nisn_siswa') || '').trim();
        const nama = (formData.get('nama_siswa') || '').trim();
        const kelas = (formData.get('kelas') || '').trim();
        const email = (formData.get('email_siswa') || '').trim();
        const kontak = (formData.get('kontak_siswa') || '').trim();

        const { error } = await db.from('data_siswa').insert([
          {
            nisn_siswa: nisn,
            nama_siswa: nama,
            kelas: kelas,
            email_siswa: email,
            kontak_siswa: kontak,
            id_user: idUser
          }
        ]);
        profileError = error;

      } else if (state.activeTab === 'guru') {
        const nip = (formData.get('nip_guru') || '').trim();
        const nama = (formData.get('nama_guru') || '').trim();
        const mapel = (formData.get('mata_pelajaran') || '').trim();
        const email = (formData.get('email_guru') || '').trim();
        const kontak = (formData.get('kontak_guru') || '').trim();

        const { error } = await db.from('data_guru').insert([
          {
            nip_guru: nip,
            nama_guru: nama,
            mata_pelajaran: mapel,
            email_guru: email,
            kontak_guru: kontak,
            id_user: idUser
          }
        ]);
        profileError = error;

      } else if (state.activeTab === 'petugas') {
        const idPetugas = (formData.get('id_petugas') || '').trim();
        const nama = (formData.get('nama_petugas') || '').trim();
        const email = (formData.get('email_petugas') || '').trim();
        const kontak = (formData.get('kontak_petugas') || '').trim();

        const { error } = await db.from('data_petugas').insert([
          {
            id_petugas: idPetugas,
            nama_petugas: nama,
            email_petugas: email,
            kontak_petugas: kontak,
            id_user: idUser
          }
        ]);
        profileError = error;
      }

      // Jika insert profil gagal, lakukan ROLLBACK pada data_user
      if (profileError) {
        console.warn('Tahap 2 gagal, melakukan kompensasi rollback data_user...');
        await db.from('data_user').delete().eq('id_user', idUser);

        if (profileError.code === '23505' || profileError.message.includes('unique') || profileError.message.includes('primary')) {
          throw new Error('Nomor induk / ID entitas sudah terdaftar di sistem.');
        }
        throw new Error(profileError.message || 'Gagal menyimpan profil pengguna.');
      }

      // Berhasil
      setModalSubmitLoading(false);
      closeAddModal();
      showToast(`Berhasil menambahkan akun ${role} baru: ${username}`, 'success');

      // Refresh Data
      await loadData(state.activeTab, false);
      refreshAllBadges();

    } catch (err) {
      console.error('Error proses simpan user:', err);
      setModalSubmitLoading(false);
      showModalFormError(err.message || 'Terjadi kesalahan sistem saat memproses data.');
    }
  }

  function showModalFormError(msg) {
    DOM.modalFormErrorText.textContent = msg;
    DOM.modalFormError.classList.remove('hidden');
  }

  function setModalSubmitLoading(isLoading) {
    if (isLoading) {
      DOM.btnSubmitAddUser.disabled = true;
      DOM.iconSubmitSpinner.className = 'ph ph-circle-notch animate-spin text-lg';
      DOM.textBtnSubmit.textContent = 'Menyimpan...';
    } else {
      DOM.btnSubmitAddUser.disabled = false;
      DOM.iconSubmitSpinner.className = 'ph ph-check-circle text-lg';
      DOM.textBtnSubmit.textContent = 'Simpan Pengguna';
    }
  }

  // ========================================================
  // 9. MODAL KONFIRMASI HAPUS PENGGUNA (CASCADE DELETE)
  // ========================================================
  function openDeleteModal(idUser, name, entity) {
    if (!idUser) {
      showToast('ID Pengguna tidak valid untuk dihapus.', 'error');
      return;
    }

    state.deleteTarget = { id_user: idUser, name: name, entity: entity };
    DOM.deleteTargetName.textContent = `${name} (${entity})`;

    DOM.modalDeleteConfirm.classList.remove('hidden');
    requestAnimationFrame(() => {
      DOM.modalDeleteConfirm.classList.remove('opacity-0');
      DOM.modalDeleteContent.classList.remove('scale-95');
    });
  }

  function closeDeleteModal() {
    DOM.modalDeleteConfirm.classList.add('opacity-0');
    DOM.modalDeleteContent.classList.add('scale-95');
    setTimeout(() => {
      DOM.modalDeleteConfirm.classList.add('hidden');
      state.deleteTarget = null;
    }, 200);
  }

  async function handleConfirmDelete() {
    if (!state.deleteTarget || !state.deleteTarget.id_user) return;

    const { id_user, name, entity } = state.deleteTarget;

    DOM.btnConfirmDelete.disabled = true;
    DOM.iconDeleteSpinner.className = 'ph ph-circle-notch animate-spin text-base';
    DOM.textBtnDelete.textContent = 'Menghapus...';

    try {
      // Menghapus akun di data_user. Relasi ON DELETE CASCADE akan otomatis menghapus profil di data_siswa/data_guru/data_petugas.
      const { error } = await db
        .from('data_user')
        .delete()
        .eq('id_user', id_user);

      if (error) throw error;

      DOM.btnConfirmDelete.disabled = false;
      DOM.iconDeleteSpinner.className = 'ph ph-trash-simple text-base';
      DOM.textBtnDelete.textContent = 'Ya, Hapus Pengguna';

      closeDeleteModal();
      showToast(`Akun ${entity} "${name}" berhasil dihapus dari sistem.`, 'success');

      // Refresh table
      await loadData(state.activeTab, false);
      refreshAllBadges();

    } catch (err) {
      console.error('Error saat menghapus user:', err);
      DOM.btnConfirmDelete.disabled = false;
      DOM.iconDeleteSpinner.className = 'ph ph-trash-simple text-base';
      DOM.textBtnDelete.textContent = 'Ya, Hapus Pengguna';
      showToast(`Gagal menghapus pengguna: ${err.message || 'Koneksi bermasalah'}`, 'error');
    }
  }

  // ========================================================
  // 10. ADMIN PROFILE SETTINGS CONTROLLER
  // ========================================================

  /**
   * Sinkronisasi Tampilan Nama & Avatar Inisial Admin di Sidebar & Modal
   */
  function syncAdminProfileUI(user) {
    if (!user) {
      try {
        const raw = sessionStorage.getItem('cakrawala_user');
        if (raw) user = JSON.parse(raw);
      } catch (_) {}
    }
    const username = (user && (user.username || user.identifier)) || 'Administrator';
    const nameEl = document.getElementById('adminUserName');
    if (nameEl) {
      nameEl.textContent = username;
    }

    // Buat 2 huruf inisial kapital untuk avatar
    let initials = 'AD';
    if (username && username.trim().length >= 2) {
      const parts = username.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = username.trim().substring(0, 2).toUpperCase();
      }
    }
    const avatarEl = document.getElementById('adminAvatarInitials');
    if (avatarEl) {
      avatarEl.textContent = initials;
    }
    const modalAvatarEl = document.getElementById('modalAdminAvatarPreview');
    if (modalAvatarEl) {
      modalAvatarEl.textContent = initials;
    }
  }

  /**
   * Buka Modal Pengaturan Profil Admin
   */
  async function openAdminProfileModal() {
    if (!DOM.modalAdminProfile) return;

    let currentUser = null;
    try {
      const raw = sessionStorage.getItem('cakrawala_user');
      if (raw) currentUser = JSON.parse(raw);
    } catch (_) {}

    if (!currentUser) {
      currentUser = { username: 'admin', role: 'Admin' };
    }

    if (DOM.inputAdminUsername) {
      DOM.inputAdminUsername.value = currentUser.username || currentUser.identifier || '';
    }
    if (DOM.inputAdminNewPassword) {
      DOM.inputAdminNewPassword.value = '';
    }
    if (DOM.inputAdminConfirmPassword) {
      DOM.inputAdminConfirmPassword.value = '';
    }
    if (DOM.modalAdminProfileError) {
      DOM.modalAdminProfileError.classList.add('hidden');
    }

    const displayId = currentUser.id_user || currentUser.identifier || 'ADM001';
    if (DOM.modalAdminDisplayId) {
      DOM.modalAdminDisplayId.innerHTML = `ID Akun: <span class="font-bold text-slate-800">${escapeHtml(displayId)}</span>`;
    }

    syncAdminProfileUI(currentUser);

    // Jika Supabase terhubung, segarkan data user admin terkini dari database
    if (window.db && (currentUser.id_user || currentUser.username)) {
      try {
        const query = currentUser.id_user 
          ? window.db.from('data_user').select('id_user, username, role').eq('id_user', currentUser.id_user).maybeSingle()
          : window.db.from('data_user').select('id_user, username, role').eq('username', currentUser.username).maybeSingle();
        const { data: dbUser } = await query;
        if (dbUser) {
          currentUser = { ...currentUser, ...dbUser };
          sessionStorage.setItem('cakrawala_user', JSON.stringify(currentUser));
          if (DOM.inputAdminUsername) DOM.inputAdminUsername.value = dbUser.username;
          if (DOM.modalAdminDisplayId) {
            DOM.modalAdminDisplayId.innerHTML = `ID Akun: <span class="font-bold text-slate-800">${escapeHtml(dbUser.id_user || displayId)}</span>`;
          }
          syncAdminProfileUI(currentUser);
        }
      } catch (err) {
        console.warn('Gagal memuat detail admin terkini:', err);
      }
    }

    // Animasi muncul modal
    DOM.modalAdminProfile.classList.remove('hidden');
    requestAnimationFrame(() => {
      DOM.modalAdminProfile.classList.remove('opacity-0');
      DOM.modalAdminProfileContent.classList.remove('scale-95');
    });

    setTimeout(() => {
      if (DOM.inputAdminUsername) DOM.inputAdminUsername.focus();
    }, 150);
  }

  /**
   * Tutup Modal Pengaturan Profil Admin
   */
  function closeAdminProfileModal() {
    if (!DOM.modalAdminProfile) return;
    DOM.modalAdminProfile.classList.add('opacity-0');
    DOM.modalAdminProfileContent.classList.add('scale-95');
    setTimeout(() => {
      DOM.modalAdminProfile.classList.add('hidden');
      if (DOM.formAdminProfile) DOM.formAdminProfile.reset();
      if (DOM.modalAdminProfileError) DOM.modalAdminProfileError.classList.add('hidden');
    }, 200);
  }

  function showAdminProfileError(message) {
    if (DOM.modalAdminProfileError && DOM.modalAdminProfileErrorText) {
      DOM.modalAdminProfileErrorText.textContent = message;
      DOM.modalAdminProfileError.classList.remove('hidden');
    }
  }

  /**
   * Submit Formulir Pengaturan Profil Admin (Update Username & Password)
   */
  async function handleAdminProfileSubmit(event) {
    event.preventDefault();
    if (!DOM.btnSubmitAdminProfile) return;
    if (DOM.modalAdminProfileError) DOM.modalAdminProfileError.classList.add('hidden');

    const newUsername = (DOM.inputAdminUsername ? DOM.inputAdminUsername.value : '').trim();
    const newPassword = (DOM.inputAdminNewPassword ? DOM.inputAdminNewPassword.value : '').trim();
    const confirmPassword = (DOM.inputAdminConfirmPassword ? DOM.inputAdminConfirmPassword.value : '').trim();

    // 1. Validasi Username
    if (!newUsername) {
      showAdminProfileError('Username admin tidak boleh kosong.');
      return;
    }
    if (newUsername.length < 3) {
      showAdminProfileError('Username admin minimal 3 karakter.');
      return;
    }
    if (newUsername.length > 20) {
      showAdminProfileError('Username admin maksimal 20 karakter.');
      return;
    }

    // 2. Validasi Password (jika diisi)
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        showAdminProfileError('Password baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAdminProfileError('Konfirmasi password tidak cocok dengan password baru.');
        return;
      }
    }

    let currentUser = null;
    try {
      const raw = sessionStorage.getItem('cakrawala_user');
      if (raw) currentUser = JSON.parse(raw);
    } catch (_) {}
    if (!currentUser) {
      currentUser = { username: 'admin', role: 'Admin' };
    }

    const oldUsername = currentUser.username || currentUser.identifier || 'admin';
    const isUsernameChanged = (newUsername.toLowerCase() !== oldUsername.toLowerCase());

    // Indikator Loading
    DOM.btnSubmitAdminProfile.disabled = true;
    if (DOM.iconSubmitAdminProfileSpinner) {
      DOM.iconSubmitAdminProfileSpinner.className = 'ph ph-spinner animate-spin text-lg';
    }
    if (DOM.textBtnSubmitAdminProfile) {
      DOM.textBtnSubmitAdminProfile.textContent = 'Menyimpan...';
    }

    try {
      // Dapatkan password lokal saat ini jika ada
      let currentLocalPassword = 'password123';
      try {
        const localAdminRaw = localStorage.getItem('cakrawala_local_admin');
        if (localAdminRaw) {
          const parsed = JSON.parse(localAdminRaw);
          if (parsed && parsed.password) currentLocalPassword = parsed.password;
        }
      } catch (_) {}

      const activePassword = newPassword || currentLocalPassword;

      // Jika terhubung ke database Supabase, coba simpan ke Supabase
      if (window.db) {
        try {
          if (isUsernameChanged) {
            const { data: existingUser, error: checkErr } = await window.db
              .from('data_user')
              .select('id_user')
              .eq('username', newUsername)
              .maybeSingle();

            if (!checkErr && existingUser && (!currentUser.id_user || existingUser.id_user !== currentUser.id_user)) {
              throw new Error(`Username "${newUsername}" sudah digunakan oleh pengguna lain. Silakan pilih username lain.`);
            }
          }

          const updatePayload = { username: newUsername };
          if (newPassword) {
            updatePayload.password = newPassword;
          }

          let updateSuccess = false;
          if (currentUser.id_user) {
            const { error: updErr } = await window.db
              .from('data_user')
              .update(updatePayload)
              .eq('id_user', currentUser.id_user);

            if (!updErr) {
              updateSuccess = true;
            }
          }

          if (!updateSuccess) {
            const { error: updErr2 } = await window.db
              .from('data_user')
              .update(updatePayload)
              .eq('username', oldUsername);

            if (!updErr2) {
              updateSuccess = true;
            } else if (updErr2.code === '23505' || (updErr2.message && updErr2.message.includes('unique'))) {
              throw new Error(`Username "${newUsername}" sudah digunakan oleh pengguna lain.`);
            } else {
              console.warn('Database update error (mungkin tabel data_user belum dibuat):', updErr2);
            }
          }
        } catch (dbErr) {
          if (dbErr.message && dbErr.message.includes('sudah digunakan')) {
            throw dbErr;
          }
          console.warn('Supabase sync skipped / table missing:', dbErr);
        }
      }

      // Selalu simpan ke localStorage agar perubahan tetap bekerja offline / sebelum tabel dibuat
      try {
        localStorage.setItem('cakrawala_local_admin', JSON.stringify({
          id_user: currentUser.id_user || 'ADM001',
          username: newUsername,
          password: activePassword,
          role: 'Admin'
        }));
      } catch (_) {}

      // Update data di sessionStorage
      const updatedUser = {
        ...currentUser,
        username: newUsername
      };
      sessionStorage.setItem('cakrawala_user', JSON.stringify(updatedUser));

      // Perbarui tampilan antarmuka
      syncAdminProfileUI(updatedUser);

      // Tutup modal
      closeAdminProfileModal();

      // Notifikasi Toast
      if (newPassword) {
        showToast(`Profil dan password admin (${newUsername}) berhasil diperbarui!`, 'success');
      } else {
        showToast(`Profil admin (${newUsername}) berhasil diperbarui!`, 'success');
      }
    } catch (err) {
      console.error('Error saat memperbarui profil admin:', err);
      showAdminProfileError(err.message || 'Terjadi gangguan saat menyimpan profil admin.');
    } finally {
      DOM.btnSubmitAdminProfile.disabled = false;
      if (DOM.iconSubmitAdminProfileSpinner) {
        DOM.iconSubmitAdminProfileSpinner.className = 'ph ph-check-circle text-lg';
      }
      if (DOM.textBtnSubmitAdminProfile) {
        DOM.textBtnSubmitAdminProfile.textContent = 'Simpan Profil Admin';
      }
    }
  }

  // ========================================================
  // 11. MOBILE SIDEBAR CONTROLLER
  // ========================================================
  function openMobileSidebar() {
    DOM.adminSidebar.classList.remove('-translate-x-full');
    DOM.sidebarBackdrop.classList.remove('hidden');
  }

  function closeMobileSidebar() {
    DOM.adminSidebar.classList.add('-translate-x-full');
    DOM.sidebarBackdrop.classList.add('hidden');
  }

  // ========================================================
  // 11. EVENT LISTENERS INITIALIZATION
  // ========================================================
  function initEventListeners() {
    // 1. Tab Navigation Events
    if (DOM.tabBtnSiswa) DOM.tabBtnSiswa.addEventListener('click', () => switchTab('siswa'));
    if (DOM.tabBtnGuru) DOM.tabBtnGuru.addEventListener('click', () => switchTab('guru'));
    if (DOM.tabBtnPetugas) DOM.tabBtnPetugas.addEventListener('click', () => switchTab('petugas'));

    // 2. Real-time Instant Search
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (DOM.btnClearSearch) {
          if (state.searchQuery.length > 0) {
            DOM.btnClearSearch.classList.remove('hidden');
          } else {
            DOM.btnClearSearch.classList.add('hidden');
          }
        }
        renderTable();
      });
    }

    if (DOM.btnClearSearch) {
      DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        DOM.btnClearSearch.classList.add('hidden');
        DOM.searchInput.focus();
        renderTable();
      });
    }

    // 3. Refresh Data Button
    if (DOM.btnRefreshData) {
      DOM.btnRefreshData.addEventListener('click', () => {
        loadData(state.activeTab, false);
        refreshAllBadges();
        showToast('Memperbarui data dari database...', 'info');
      });
    }

    // 4. Modal Add User Open & Close
    if (DOM.btnOpenAddModal) DOM.btnOpenAddModal.addEventListener('click', openAddModal);
    if (DOM.btnCancelAddModal) DOM.btnCancelAddModal.addEventListener('click', closeAddModal);
    if (DOM.btnCloseAddModal) DOM.btnCloseAddModal.addEventListener('click', closeAddModal);

    // Toggle Modal Password Visibility
    if (DOM.btnToggleModalPassword && DOM.inputPassword && DOM.iconToggleModalPassword) {
      DOM.btnToggleModalPassword.addEventListener('click', () => {
        const isPassword = DOM.inputPassword.type === 'password';
        DOM.inputPassword.type = isPassword ? 'text' : 'password';
        DOM.iconToggleModalPassword.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
      });
    }

    // Submit Add Form
    if (DOM.formAddUser) DOM.formAddUser.addEventListener('submit', handleAddUserSubmit);

    // 5. Modal Delete Confirm Actions
    if (DOM.btnCancelDelete) DOM.btnCancelDelete.addEventListener('click', closeDeleteModal);
    if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

    // 6. Admin Profile Settings Modal Actions
    if (DOM.btnAdminProfile) DOM.btnAdminProfile.addEventListener('click', openAdminProfileModal);
    if (DOM.btnCancelAdminProfileModal) DOM.btnCancelAdminProfileModal.addEventListener('click', closeAdminProfileModal);
    if (DOM.btnCloseAdminProfileModal) DOM.btnCloseAdminProfileModal.addEventListener('click', closeAdminProfileModal);
    if (DOM.formAdminProfile) DOM.formAdminProfile.addEventListener('submit', handleAdminProfileSubmit);

    // Toggle Password Visibility in Admin Profile Modal
    if (DOM.btnToggleAdminNewPassword && DOM.inputAdminNewPassword && DOM.iconToggleAdminNewPassword) {
      DOM.btnToggleAdminNewPassword.addEventListener('click', () => {
        const isPass = DOM.inputAdminNewPassword.type === 'password';
        DOM.inputAdminNewPassword.type = isPass ? 'text' : 'password';
        DOM.iconToggleAdminNewPassword.className = isPass ? 'ph ph-eye-slash' : 'ph ph-eye';
      });
    }
    if (DOM.btnToggleAdminConfirmPassword && DOM.inputAdminConfirmPassword && DOM.iconToggleAdminConfirmPassword) {
      DOM.btnToggleAdminConfirmPassword.addEventListener('click', () => {
        const isPass = DOM.inputAdminConfirmPassword.type === 'password';
        DOM.inputAdminConfirmPassword.type = isPass ? 'text' : 'password';
        DOM.iconToggleAdminConfirmPassword.className = isPass ? 'ph ph-eye-slash' : 'ph ph-eye';
      });
    }

    // 7. Mobile Sidebar Toggle
    if (DOM.btnToggleMobileSidebar) DOM.btnToggleMobileSidebar.addEventListener('click', openMobileSidebar);
    if (DOM.btnCloseMobileSidebar) DOM.btnCloseMobileSidebar.addEventListener('click', closeMobileSidebar);
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // 8. Logout Action
    if (DOM.btnLogout) {
      DOM.btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('cakrawala_logged_in');
        sessionStorage.removeItem('cakrawala_role');
        sessionStorage.removeItem('cakrawala_user');
        window.location.replace('../login.html');
      });
    }

    // 9. Keyboard Accessibility (Escape to close modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (DOM.modalAdminProfile && !DOM.modalAdminProfile.classList.contains('hidden')) {
          closeAdminProfileModal();
        }
        if (!DOM.modalAddUser.classList.contains('hidden')) {
          closeAddModal();
        }
        if (!DOM.modalDeleteConfirm.classList.contains('hidden')) {
          closeDeleteModal();
        }
        if (!DOM.adminSidebar.classList.contains('-translate-x-full')) {
          closeMobileSidebar();
        }
      }
    });

    // Close modals on clicking backdrop area outside the content box
    if (DOM.modalAdminProfile) {
      DOM.modalAdminProfile.addEventListener('click', (e) => {
        if (e.target === DOM.modalAdminProfile) closeAdminProfileModal();
      });
    }

    if (DOM.modalAddUser) {
      DOM.modalAddUser.addEventListener('click', (e) => {
        if (e.target === DOM.modalAddUser) closeAddModal();
      });
    }

    if (DOM.modalDeleteConfirm) {
      DOM.modalDeleteConfirm.addEventListener('click', (e) => {
        if (e.target === DOM.modalDeleteConfirm) closeDeleteModal();
      });
    }
  }

  // ========================================================
  // 12. INITIALIZATION ON DOM READY
  // ========================================================
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    // Render initial header according to active tab
    const config = TAB_CONFIGS[state.activeTab];
    if (config) {
      DOM.tableHeadRow.innerHTML = config.columns.map((col, index) => {
        const isAction = col === 'Aksi';
        const isNumber = col === 'No';
        const alignClass = isAction ? 'text-right' : isNumber ? 'text-center w-14' : 'text-left';
        return `<th scope="col" class="px-6 py-3.5 ${alignClass}">${escapeHtml(col)}</th>`;
      }).join('');
    }
    // Load initial tab data & badge counters
    loadData(state.activeTab);
    refreshAllBadges();
  });

})();
