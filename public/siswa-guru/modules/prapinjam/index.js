/**
 * CAKRAWALA Digital Library - Modul Siklus Pra-Pinjam (Booking, Tiket QR, Pembatalan)
 * File: public/siswa-guru/modules/prapinjam/index.js
 * 
 * Tanggung Jawab:
 * - Menyediakan satu titik akses (single entry-point) untuk semua fitur Pra-Pinjam siswa/guru
 * - Menangani pendaftaran reservasi (modalBooking)
 * - Menangani tampilan tiket QR Code 2D & export (modalTiket)
 * - Menangani pembatalan reservasi pra-pinjam (modalBatalBooking)
 */

export {
  MAX_ACTIVE_LOANS,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  setupBookingModal,
  openBookingModal
} from './modalBooking.js';

export {
  setupTicketModalElements,
  showTicketSuccessModal,
  exportTicketAsPng
} from './modalTiket.js';

export {
  setupCancelBookingModal,
  openCancelBookingModal
} from './modalBatalBooking.js';

import { setupBookingModal } from './modalBooking.js';
import { setupTicketModalElements } from './modalTiket.js';
import { setupCancelBookingModal } from './modalBatalBooking.js';

/**
 * Menginisialisasi seluruh event listener modal dalam siklus Pra-Pinjam
 */
export function setupPrapinjamModule() {
  setupBookingModal();
  setupTicketModalElements();
  setupCancelBookingModal();
}
