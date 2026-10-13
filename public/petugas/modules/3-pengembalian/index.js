/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian Buku & Denda (Koordinator Fitur)
 * Path: public/petugas/modules/3-pengembalian/index.js
 * 
 * Struktur Modular:
 * - denda/                 : Sub-folder operasional kasir tunggakan denda, arsip riwayat, dan sub-tab switcher
 * - seleksiPeminjam.js     : Seleksi peminjam & kartu pinjaman aktif
 * - kalkulatorDenda.js     : Kalkulator denda harian dinamis & aturan >= 1 bulan
 * - eksekusiPengembalian.js: Transaksi pengembalian buku & update stok Supabase
 * - formPengembalian.js    : Formulir koordinator meja pengembalian
 * - modalStruk.js          : Cetak bukti struk resmi pengembalian
 */

export {
  setupReceiptModal,
  showReceiptModal,
  printReceipt
} from './modalStruk.js';

export {
  kasirTunggakanState,
  getSearchQueryTunggakan,
  setSearchQueryTunggakan,
  renderTunggakanDendaList,
  openModalKonfirmasiLunasiDenda,
  executePelunasanDenda,
  handleBatalkanLunasDenda,
  formatWhatsAppNumber,
  sendWhatsAppReminder,
  setupKasirTunggakanListeners,
  arsipRiwayatState,
  renderSemuaRiwayatList,
  filterRiwayatPengembalian,
  setupArsipRiwayatListeners,
  subtabDendaState,
  renderRiwayatPengembalian,
  switchFineSubtab,
  setupSubtabDendaListeners
} from './denda/index.js';

export {
  setupPengembalianForm,
  renderBorrowerSearchResults,
  filterPengembalianByName,
  selectBorrowerForReturn,
  renderActiveLoansCards,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  updatePreviewPeminjamanBox,
  recalculateDenda,
  handleSubmitPengembalian
} from './formPengembalian.js';

import { setupReceiptModal, showReceiptModal, printReceipt } from './modalStruk.js';
import {
  setupPengembalianForm,
  renderBorrowerSearchResults,
  filterPengembalianByName,
  selectBorrowerForReturn,
  renderActiveLoansCards,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  updatePreviewPeminjamanBox,
  recalculateDenda,
  handleSubmitPengembalian
} from './formPengembalian.js';
import {
  renderRiwayatPengembalian,
  renderTunggakanDendaList,
  renderSemuaRiwayatList,
  switchFineSubtab,
  openModalKonfirmasiLunasiDenda,
  executePelunasanDenda,
  handleBatalkanLunasDenda,
  sendWhatsAppReminder,
  setupSubtabDendaListeners
} from './denda/index.js';

let isPengembalianModuleSetup = false;

/**
 * Setup seluruh pendengar event dan modal di Meja Pengembalian & Denda
 */
export function setupPengembalianModule() {
  if (isPengembalianModuleSetup) return;
  isPengembalianModuleSetup = true;

  setupPengembalianForm();
  setupReceiptModal();
  setupSubtabDendaListeners();
}

/**
 * Render seluruh data Meja Pengembalian saat tab aktif atau data disinkronkan
 */
export function renderPengembalianTab() {
  renderPengembalianFormOptions();
  renderRiwayatPengembalian();
}

// Window Bindings Lengkap untuk Meja 3
if (typeof window !== 'undefined') {
  window.setupPengembalianModule = setupPengembalianModule;
  window.renderPengembalianTab = renderPengembalianTab;
  window.renderPengembalianFormOptions = renderPengembalianFormOptions;
  window.renderRiwayatPengembalian = renderRiwayatPengembalian;
  window.renderTunggakanDendaList = renderTunggakanDendaList;
  window.renderSemuaRiwayatList = renderSemuaRiwayatList;
  window.switchFineSubtab = switchFineSubtab;
  window.filterPengembalianByBook = filterPengembalianByBook;
  window.filterPengembalianByName = filterPengembalianByName;
  window.selectBorrowerForReturn = selectBorrowerForReturn;
  window.selectLoanForReturn = selectLoanForReturn;
  window.resetPengembalianSelection = resetPengembalianSelection;
  window.recalculateDenda = recalculateDenda;
  window.handleSubmitPengembalian = handleSubmitPengembalian;
  window.openModalKonfirmasiLunasiDenda = openModalKonfirmasiLunasiDenda;
  window.executePelunasanDenda = executePelunasanDenda;
  window.handleBatalkanLunasDenda = handleBatalkanLunasDenda;
  window.sendWhatsAppReminder = sendWhatsAppReminder;
  window.showReceiptModal = showReceiptModal;
  window.printReceipt = printReceipt;
}
