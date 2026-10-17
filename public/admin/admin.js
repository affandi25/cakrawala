/**
 * CAKRAWALA Digital Library - Master Coordinator Dashboard Admin
 * File: public/admin/admin.js
 * 
 * FUNGSI UTAMA:
 * Sebagai entry point utama yang mengorkestrasi modul-modul modular:
 * 1. modules/core/          - Sentral state, data sync, dan table engine
 * 2. modules/modals/        - Form tambah/edit pengguna, upload foto, & konfirmasi hapus
 * 3. modules/0-overview/    - Metrik KPI & koneksi Supabase
 * 4. modules/1-siswa/       - Dataset & table renderer Siswa
 * 5. modules/2-guru/        - Dataset & table renderer Guru
 * 6. modules/3-petugas/     - Dataset & table renderer Petugas
 * 7. modules/import/        - Import massal Excel/CSV terstandarisasi
 * 8. ../assets/js/auth.js   - Verifikasi sesi admin terpusat & kontroler modal logout
 * 9. ../assets/js/sharedUtils.js  - Shared helper toast & format utilities
 */

import { initSessionAndAdmin, setupLogout } from '../assets/js/auth.js';
import { showToast } from '../assets/js/sharedUtils.js';
import {
  state,
  TAB_CONFIGS,
  DOM,
  loadData,
  refreshAllBadges,
  loadKpiStats,
  renderTable,
  switchTab
} from './modules/core/index.js';
import {
  initModalUser,
  initModalKonfirmasi,
  closeAddModal,
  closeDeleteModal
} from './modules/modals/index.js';
import { initKpiMetrics } from './modules/0-overview/index.js';
import { setupSiswaEventListeners } from './modules/1-siswa/index.js';
import { setupGuruEventListeners } from './modules/2-guru/index.js';
import { setupPetugasEventListeners } from './modules/3-petugas/index.js';
import { initImportExcel, closeImportModal } from './modules/import/index.js';

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
  if (DOM.tabBtnBeranda) DOM.tabBtnBeranda.addEventListener('click', () => switchTab('beranda'));
  if (DOM.tabBtnSiswa) DOM.tabBtnSiswa.addEventListener('click', () => switchTab('siswa'));
  if (DOM.tabBtnGuru) DOM.tabBtnGuru.addEventListener('click', () => switchTab('guru'));
  if (DOM.tabBtnPetugas) DOM.tabBtnPetugas.addEventListener('click', () => switchTab('petugas'));

  // Quick Action Buttons dari Tab Beranda
  const quickSiswa = document.getElementById('btnQuickTabSiswa');
  const quickGuru = document.getElementById('btnQuickTabGuru');
  const quickPetugas = document.getElementById('btnQuickTabPetugas');
  const btnRefreshKpi = document.getElementById('btnRefreshKpiStats');

  if (quickSiswa) quickSiswa.addEventListener('click', () => switchTab('siswa'));
  if (quickGuru) quickGuru.addEventListener('click', () => switchTab('guru'));
  if (quickPetugas) quickPetugas.addEventListener('click', () => switchTab('petugas'));

  if (btnRefreshKpi) {
    btnRefreshKpi.addEventListener('click', async () => {
      const icon = btnRefreshKpi.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      try {
        await loadKpiStats();
        showToast('Ringkasan metrik berhasil diperbarui!', 'success');
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 300);
      }
    });
  }

  // 2. Real-time Search Input (Dukungan seluruh tab)
  document.querySelectorAll('.admin-search-input').forEach(input => {
    input.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      const clearBtn = e.target.parentElement ? e.target.parentElement.querySelector('.btn-clear-search') : null;
      if (clearBtn) {
        if (state.searchQuery.length > 0) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }
      renderTable();
    });
  });

  document.querySelectorAll('.btn-clear-search').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = btn.closest('div');
      const input = container ? container.querySelector('.admin-search-input') : null;
      if (input) input.value = '';
      state.searchQuery = '';
      btn.classList.add('hidden');
      if (input) input.focus();
      renderTable();
    });
  });

  // 3. Refresh Data Buttons (Dukungan seluruh tab)
  document.querySelectorAll('.btn-refresh-data').forEach(btn => {
    btn.addEventListener('click', () => {
      loadData(state.activeTab, false);
      refreshAllBadges();
      showToast('Memperbarui data dari database...', 'info');
    });
  });

  // 4. Catatan: Seluruh event modal (User, Konfirmasi Hapus, Import)
  // diinisialisasi secara modular via initModalUser, initModalKonfirmasi, & initImportExcel.

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
      const modalImport = document.getElementById('modalImportExcel');
      if (modalImport && !modalImport.classList.contains('hidden')) {
        closeImportModal();
      }
      if (DOM.adminSidebar && !DOM.adminSidebar.classList.contains('-translate-x-full')) {
        closeMobileSidebar();
      }
    }
  });

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

  // 4. Inisialisasi Modul Modular (0-Overview KPI, Event Listener Siswa, Guru, Petugas)
  initKpiMetrics();
  setupSiswaEventListeners();
  setupGuruEventListeners();
  setupPetugasEventListeners();

  // 5. Inisialisasi Modul Interaktif (Form User, Konfirmasi Hapus, & Import Excel)
  initModalUser();
  initModalKonfirmasi();
  initImportExcel();

  // 6. Sinkronisasi tampilan awal tab
  switchTab(state.activeTab);
});
