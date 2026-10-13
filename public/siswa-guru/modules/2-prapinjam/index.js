/**
 * CAKRAWALA Digital Library - Modul Pra-Pinjam & Tiket Reservasi (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/2-prapinjam/index.js
 * 
 * Tanggung Jawab:
 * - Titik masuk terpadu (single entry-point) untuk siklus pra-pinjam & tiket reservasi
 * - Ekspor fungsionalitas keranjang pra-pinjam (keranjang.js)
 * - Ekspor fungsionalitas tiket reservasi Supabase & QR Code (tiketPraPinjam.js)
 * - Binding fungsi ke window secara aman dengan null-safety checking:
 *   (window.openCart, window.removeFromCart, window.submitPraPinjam, window.closeTicketModal)
 */

import {
  addToCart,
  removeFromCart,
  clearCart,
  getCartItems,
  updateCartBadge,
  openCart
} from './keranjang.js';

import {
  submitPraPinjam,
  openBookingModal,
  closeBookingModal,
  showTicketSuccessModal,
  showTicketModal,
  closeTicketModal,
  exportTicketAsPng,
  openCancelBookingModal,
  setupPrapinjamModule,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  MAX_ACTIVE_LOANS
} from './tiketPraPinjam.js';

// Ekspor semua fungsi dan konstanta
export {
  // Keranjang
  addToCart,
  removeFromCart,
  clearCart,
  getCartItems,
  updateCartBadge,
  openCart,
  // Tiket & Booking
  submitPraPinjam,
  openBookingModal,
  closeBookingModal,
  showTicketSuccessModal,
  showTicketModal,
  closeTicketModal,
  exportTicketAsPng,
  openCancelBookingModal,
  setupPrapinjamModule,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  MAX_ACTIVE_LOANS
};

// Bind fungsi ke window secara global dengan null-safety checking
if (typeof window !== 'undefined') {
  window.openCart = openCart;
  window.removeFromCart = removeFromCart;
  window.submitPraPinjam = submitPraPinjam;
  window.closeTicketModal = closeTicketModal;

  // Interoperabilitas dengan modul lain
  window.addToCart = addToCart;
  window.openBookingModal = openBookingModal;
  window.showTicketSuccessModal = showTicketSuccessModal;
  window.openCancelBookingModal = openCancelBookingModal;
}
