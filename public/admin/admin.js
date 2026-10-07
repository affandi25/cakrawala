/**
 * CAKRAWALA Digital Library - Master Coordinator Dashboard Admin
 * File: public/admin/admin.js
 * 
 * FUNGSI UTAMA:
 * Sebagai entry point utama yang mengorkestrasi modul-modul terpisah:
 * 1. modules/state.js       - Sentral state, tab configs, dan DOM getters
 * 2. modules/data.js        - Sinkronisasi data Siswa, Guru, Petugas via Supabase
 * 3. modules/table.js       - Rendering tabel, skeleton, filtering, dan tab switcher
 * 4. modules/modal.js       - Modal form tambah/edit pengguna, reset password, & konfirmasi hapus
 * 5. ../assets/js/auth.js   - Verifikasi sesi admin terpusat & kontroler modal logout
 * 6. ../assets/js/sharedUtils.js  - Shared helper toast & format utilities
 */

import { initSessionAndAdmin, setupLogout } from '../assets/js/auth.js';
import { showToast } from '../assets/js/sharedUtils.js';
import { state, TAB_CONFIGS, DOM } from './modules/state.js';
import { loadData, refreshAllBadges } from './modules/data.js';
import { renderTable, switchTab } from './modules/table.js';
import {
  openAddModal,
  closeAddModal,
  handleAddUserSubmit,
  closeDeleteModal,
  handleConfirmDelete
} from './modules/modal.js';

// ========================================================
// 1. MOBILE SIDEBAR CONTROLLER
// ========================================================
function openMobileSidebar() {
  if (DOM.adminSidebar) DOM.adminSidebar.classList.remove('-translate-x-full');
  if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove('hidden');
}

function closeMobileSidebar() {
  if (DOM.adminSidebar) DOM.adminSidebar.classList.add('-translate-x-full');
  if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add('hidden');
}

// ========================================================
// 2. EVENT LISTENERS INITIALIZATION
// ========================================================
function initEventListeners() {
  // 1. Tab Navigation Events
  if (DOM.tabBtnSiswa) DOM.tabBtnSiswa.addEventListener('click', () => switchTab('siswa'));
  if (DOM.tabBtnGuru) DOM.tabBtnGuru.addEventListener('click', () => switchTab('guru'));
  if (DOM.tabBtnPetugas) DOM.tabBtnPetugas.addEventListener('click', () => switchTab('petugas'));

  // 2. Real-time Search Input
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
      if (DOM.searchInput) DOM.searchInput.value = '';
      state.searchQuery = '';
      DOM.btnClearSearch.classList.add('hidden');
      if (DOM.searchInput) DOM.searchInput.focus();
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

  // 4. Modal Add User Events
  if (DOM.btnOpenAddModal) DOM.btnOpenAddModal.addEventListener('click', openAddModal);
  if (DOM.btnCancelAddModal) DOM.btnCancelAddModal.addEventListener('click', closeAddModal);
  if (DOM.btnCloseAddModal) DOM.btnCloseAddModal.addEventListener('click', closeAddModal);

  // Toggle Password Visibility in Modal
  if (DOM.btnToggleModalPassword && DOM.inputPassword && DOM.iconToggleModalPassword) {
    DOM.btnToggleModalPassword.addEventListener('click', () => {
      const isPassword = DOM.inputPassword.type === 'password';
      DOM.inputPassword.type = isPassword ? 'text' : 'password';
      DOM.iconToggleModalPassword.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
  }

  // Submit User Form
  if (DOM.formAddUser) DOM.formAddUser.addEventListener('submit', handleAddUserSubmit);

  // 5. Modal Delete Confirm Actions
  if (DOM.btnCancelDelete) DOM.btnCancelDelete.addEventListener('click', closeDeleteModal);
  if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

  // 6. Mobile Sidebar Events
  if (DOM.btnToggleMobileSidebar) DOM.btnToggleMobileSidebar.addEventListener('click', openMobileSidebar);
  if (DOM.btnCloseMobileSidebar) DOM.btnCloseMobileSidebar.addEventListener('click', closeMobileSidebar);
  if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // 7. Modal Logout Universal Controller
  setupLogout();

  // 8. Keyboard Accessibility (Escape to close modals)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.modalAddUser && !DOM.modalAddUser.classList.contains('hidden')) {
        closeAddModal();
      }
      if (DOM.modalDeleteConfirm && !DOM.modalDeleteConfirm.classList.contains('hidden')) {
        closeDeleteModal();
      }
      if (DOM.adminSidebar && !DOM.adminSidebar.classList.contains('-translate-x-full')) {
        closeMobileSidebar();
      }
    }
  });

  // Close modals on clicking backdrop area outside the content box
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
// 3. INITIALIZATION ON DOM READY
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verifikasi Sesi Admin Terpusat
  const isAuthorized = await initSessionAndAdmin(state);
  if (!isAuthorized) return;

  // 2. Pasang Semua Event Listener
  initEventListeners();

  // 3. Render Header Awal Sesuai Tab Aktif
  const config = TAB_CONFIGS[state.activeTab];
  if (config && DOM.tableHeadRow) {
    DOM.tableHeadRow.innerHTML = config.columns.map(col => {
      const isAction = col === 'Aksi';
      const isNumber = col === 'No';
      const alignClass = isAction ? 'text-right' : isNumber ? 'text-center w-14' : 'text-left';
      return `<th scope="col" class="px-6 py-3.5 ${alignClass}">${col}</th>`;
    }).join('');
  }

  // 4. Muat Data Tab Awal & Sinkronkan Ringkasan Badge
  loadData(state.activeTab);
  refreshAllBadges();
});
