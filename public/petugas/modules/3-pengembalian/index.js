/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian Buku & Denda (Koordinator Fitur)
 * Path: public/petugas/modules/3-pengembalian/index.js
 * 
 * Struktur Modular Bersih (2 Sub-meja Terintegrasi):
 * - pengembalian/ : Sub-folder operasional formulir pengembalian, seleksi peminjam, kalkulator denda, dan struk
 * - denda/        : Sub-folder operasional kasir tunggakan denda, arsip riwayat, dan kebijakan tarif denda
 */

// 1. Re-export modul Pengembalian Buku langsung dari sumbernya
export {
  setupReceiptModal,
  showReceiptModal,
  printReceipt
} from './pengembalian/modalStruk.js';

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
} from './pengembalian/formPengembalian.js';

// 2. Re-export modul Operasional Denda & Riwayat langsung dari sumbernya
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
  setupKasirTunggakanListeners
} from './denda/kasirTunggakan.js';

export {
  arsipRiwayatState,
  renderSemuaRiwayatList,
  filterRiwayatPengembalian,
  setupArsipRiwayatListeners
} from './denda/arsipRiwayat.js';

export {
  subtabDendaState,
  renderRiwayatPengembalian,
  switchFineSubtab,
  setupSubtabDendaListeners,
  syncTarifDendaUI,
  setupTarifDendaListeners
} from './denda/subtabDenda.js';

import {
  setupReceiptModal,
  showReceiptModal,
  printReceipt
} from './pengembalian/modalStruk.js';

import {
  setupPengembalianForm,
  filterPengembalianByName,
  selectBorrowerForReturn,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  recalculateDenda,
  handleSubmitPengembalian
} from './pengembalian/formPengembalian.js';

import {
  kasirTunggakanState,
  renderTunggakanDendaList,
  openModalKonfirmasiLunasiDenda,
  executePelunasanDenda,
  handleBatalkanLunasDenda,
  sendWhatsAppReminder
} from './denda/kasirTunggakan.js';

import {
  renderSemuaRiwayatList
} from './denda/arsipRiwayat.js';

import {
  renderRiwayatPengembalian,
  switchFineSubtab,
  setupSubtabDendaListeners
} from './denda/subtabDenda.js';

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
