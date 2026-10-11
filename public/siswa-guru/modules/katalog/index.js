/**
 * CAKRAWALA Digital Library - Modul Fitur Katalog (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/katalog/index.js
 * 
 * Sub-modul:
 * - katalogGrid.js      : Render kartu buku, live search & penyaringan kategori/stok
 * - modalBooking.js     : Dialog booking, validasi kuota 2 buku, submit pinjaman
 * - modalTiket.js       : Tiket bukti booking, barcode 1D/2D, unduh PNG tiket
 * - modalDetailBuku.js  : Pop-up sinopsis, letak rak buku, & informasi detail
 */

import {
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking
} from './katalogGrid.js';
import {
  MAX_ACTIVE_LOANS,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  setupBookingModal,
  openBookingModal
} from './modalBooking.js';
import {
  setupTicketModalElements,
  showTicketSuccessModal,
  exportTicketAsPng
} from './modalTiket.js';
import {
  setupDetailModal,
  openDetailModal
} from './modalDetailBuku.js';

// Re-ekspor seluruh fungsi agar kompatibel ke semua pemanggil
export {
  MAX_ACTIVE_LOANS,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  setupKatalogFilters,
  renderKategoriOptions,
  renderKatalogGrid,
  checkUrlRedirectBooking,
  setupBookingModal,
  openBookingModal,
  setupTicketModalElements,
  showTicketSuccessModal,
  exportTicketAsPng,
  setupDetailModal,
  openDetailModal
};

/**
 * Setup seluruh pendengar event dan modal di Tab Katalog
 */
export function setupKatalogModule() {
  setupKatalogFilters();
  setupBookingModal();
  setupDetailModal((bookId) => openBookingModal(bookId));
  checkUrlRedirectBooking();
}

// Buka akses global ke window untuk atribut onclick di HTML
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
  window.openDetailModal = openDetailModal;
  window.showTicketSuccessModal = showTicketSuccessModal;
}
