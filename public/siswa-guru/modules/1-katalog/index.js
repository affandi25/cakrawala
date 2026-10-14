/**
 * CAKRAWALA Digital Library - Modul Fitur Katalog (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/1-katalog/index.js
 */

import {
  fetchKatalogBuku,
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  MAX_ACTIVE_LOANS
} from './katalogBuku.js';

import {
  setupDetailModal,
  openDetailModal
} from './modalDetailBuku.js';

export {
  fetchKatalogBuku,
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking,
  setupDetailModal,
  openDetailModal,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  MAX_ACTIVE_LOANS
};

/**
 * Setup seluruh pendengar event dan modal di Tab Katalog
 * @param {Function} [onNavigateToBooking] Callback ketika booking diajukan dari detail modal
 */
export function setupKatalogModule(onNavigateToBooking) {
  setupKatalogFilters();
  setupDetailModal(onNavigateToBooking);
}

// Buka akses global ke window untuk kemudahan pemanggilan antar-modul
if (typeof window !== 'undefined') {
  window.openDetailModal = openDetailModal;
  window.openBookDetail = openDetailModal;
  window.renderKatalogGrid = renderKatalogGrid;
  window.fetchKatalogBuku = fetchKatalogBuku;
}
