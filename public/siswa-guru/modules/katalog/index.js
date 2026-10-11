/**
 * CAKRAWALA Digital Library - Modul Fitur Katalog (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/katalog/index.js
 * 
 * Sub-modul:
 * - katalogGrid.js      : Render kartu buku, live search & penyaringan kategori/stok
 * - modalDetailBuku.js  : Pop-up sinopsis, letak rak buku, & informasi detail
 */

import {
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking
} from './katalogGrid.js';

import {
  setupDetailModal,
  openDetailModal
} from './modalDetailBuku.js';

import { openBookingModal } from '../prapinjam/index.js';

export {
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking,
  setupDetailModal,
  openDetailModal
};

/**
 * Setup seluruh pendengar event dan modal di Tab Katalog
 */
export function setupKatalogModule() {
  setupKatalogFilters();
  setupDetailModal((bookId) => openBookingModal(bookId));
  checkUrlRedirectBooking();
}

// Buka akses global ke window untuk modal detail buku
if (typeof window !== 'undefined') {
  window.openDetailModal = openDetailModal;
}
