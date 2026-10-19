/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian Buku & Denda (Koordinator Fitur)
 * Path: public/petugas/modules/3-pengembalian/index.js
 * 
 * Struktur Modular Bersih (2 Sub-meja Terintegrasi):
 * - pengembalian/ : Sub-folder operasional formulir pengembalian, seleksi peminjam, kalkulator denda, dan struk
 * - denda/        : Sub-folder operasional kasir tunggakan denda, arsip riwayat, dan kebijakan tarif denda
 */

// 1. Re-export modul Pengembalian Buku
export {
  setupReceiptModal,
  showReceiptModal,
  printReceipt,
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
} from './pengembalian/index.js';

// 2. Re-export modul Operasional Denda & Riwayat
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
  setupSubtabDendaListeners,
  syncTarifDendaUI,
  setupTarifDendaListeners
} from './denda/index.js';

import {
  setupReceiptModal,
  showReceiptModal,
  printReceipt,
  setupPengembalianForm,
  filterPengembalianByName,
  selectBorrowerForReturn,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  recalculateDenda,
  handleSubmitPengembalian
} from './pengembalian/index.js';

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
