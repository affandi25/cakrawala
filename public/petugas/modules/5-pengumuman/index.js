/**
 * CAKRAWALA Digital Library - Modul Meja 5: Kelola Pengumuman (Index & Setup Coordinator)
 * File: public/petugas/modules/5-pengumuman/index.js
 * 
 * FUNGSI:
 * - Mengorkestrasi pencarian, filter kategori, refresh, dan inisialisasi modal formulir & modal hapus
 * - Re-export seluruh fungsi publik modul pengumuman
 */

import { state } from '../core/state.js';
import { showToast } from '../core/petugasHelper.js';
import { syncAllTables } from '../core/syncData.js';
import { renderPengumumanTable } from './daftarPengumuman.js';
import { setupPengumumanFormModal, openPengumumanModal } from './modalFormPengumuman.js';
import { setupDeletePengumumanModal, openDeletePengumumanModal } from './modalHapusPengumuman.js';

let isPengumumanModuleSetup = false;

/**
 * Setup pendengar peristiwa untuk modul pengumuman
 */
export function setupPengumumanModule() {
  if (isPengumumanModuleSetup) return;
  isPengumumanModuleSetup = true;

  const searchInput = document.getElementById('inputSearchPengumuman');
  const clearSearchBtn = document.getElementById('btnClearSearchPengumuman');
  const filterCatSelect = document.getElementById('selectFilterKategoriPengumuman');
  const refreshBtn = document.getElementById('btnRefreshPengumuman');
  const openAddBtn = document.getElementById('btnOpenAddPengumumanModal');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchPengumumanQuery = e.target.value.trim();
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !state.searchPengumumanQuery);
      }
      renderPengumumanTable();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchPengumumanQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderPengumumanTable();
    });
  }

  if (filterCatSelect) {
    filterCatSelect.addEventListener('change', e => {
      state.filterKategoriPengumuman = e.target.value;
      renderPengumumanTable();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui data pengumuman...', 'info');
      if (window.fetchAllData) {
        await window.fetchAllData();
      } else {
        await syncAllTables();
      }
    });
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      openPengumumanModal('add');
    });
  }

  setupPengumumanFormModal();
  setupDeletePengumumanModal();
}

/**
 * Render seluruh tampilan Meja 5 (Pengumuman)
 */
export function renderPengumumanTab() {
  renderPengumumanTable();
}

// Re-export untuk pemanggil eksternal
export {
  renderPengumumanTable,
  openPengumumanModal,
  openDeletePengumumanModal,
  setupPengumumanFormModal,
  setupDeletePengumumanModal
};

// Window Bindings Lengkap untuk Meja 5
if (typeof window !== 'undefined') {
  window.renderPengumumanTab = renderPengumumanTab;
  window.setupPengumumanModule = setupPengumumanModule;
  window.renderPengumumanTable = renderPengumumanTable;
  window.openPengumumanModal = openPengumumanModal;
  window.openDeletePengumumanModal = openDeletePengumumanModal;
}
