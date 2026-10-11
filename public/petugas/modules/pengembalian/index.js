/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian Buku & Denda (Koordinator Fitur)
 * File: public/petugas/modules/pengembalian/index.js
 * 
 * Sub-modul:
 * - formPengembalian.js : Form pencarian peminjam, kalkulator denda keterlambatan & kerusakan fisik
 * - modalStruk.js       : Pop-up cetak struk resmi transaksi pengembalian buku
 * - riwayatDenda.js     : Tabel arsip riwayat pengembalian, kasir tunggakan denda & pelunasan tunai
 */

export {
  setupReceiptModal,
  showReceiptModal
} from './modalStruk.js';

export {
  fineSubtabState,
  setupRiwayatDendaHandlers,
  renderRiwayatPengembalian,
  renderTunggakanDendaList,
  renderSemuaRiwayatList,
  openModalKonfirmasiLunasiDenda,
  executePelunasanDenda,
  handleBatalkanLunasDenda
} from './riwayatDenda.js';

export {
  setupPengembalianForm,
  renderBorrowerSearchResults,
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

import { setupReceiptModal } from './modalStruk.js';
import { setupRiwayatDendaHandlers } from './riwayatDenda.js';
import { setupPengembalianForm } from './formPengembalian.js';

let isPengembalianModuleSetup = false;

/**
 * Setup seluruh pendengar event dan modal di Meja Pengembalian & Denda
 */
export function setupPengembalianModule() {
  if (isPengembalianModuleSetup) return;
  isPengembalianModuleSetup = true;

  setupPengembalianForm();
  setupReceiptModal();
  setupRiwayatDendaHandlers();
}
