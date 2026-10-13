/**
 * CAKRAWALA Digital Library - Modul Riwayat & Status Peminjaman (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/3-riwayat/index.js
 * 
 * Tanggung Jawab:
 * - Titik masuk tunggal untuk fitur Riwayat Transaksi & Status Peminjaman
 * - Ekspor fungsionalitas fetch dan render data peminjaman/riwayat
 * - Mendaftarkan fungsi ke objek window secara aman (window.loadRiwayatData, dsb.)
 */

import {
  loadRiwayatData,
  renderActiveLoansTable,
  renderPendingReservationsTable,
  renderPinjamanTables,
  switchPinjamanSubtab,
  renderRiwayatTable,
  setupRiwayatModule,
  showTicketDetails,
  getRemainingDaysInfo,
  calculateDendaEstimasi
} from './riwayatPeminjaman.js';

export {
  loadRiwayatData,
  renderActiveLoansTable,
  renderPendingReservationsTable,
  renderPinjamanTables,
  switchPinjamanSubtab,
  renderRiwayatTable,
  setupRiwayatModule,
  showTicketDetails,
  getRemainingDaysInfo,
  calculateDendaEstimasi
};

// Bind ke window dengan null-safety checking
if (typeof window !== 'undefined') {
  window.loadRiwayatData = loadRiwayatData;
  window.renderRiwayatTable = renderRiwayatTable;
  window.renderPinjamanTables = renderPinjamanTables;
  window.switchPinjamanSubtab = switchPinjamanSubtab;
  window.showTicketDetails = showTicketDetails;
}
