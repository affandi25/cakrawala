/**
 * CAKRAWALA Digital Library - Modul Meja Pengembalian Buku
 * Path: public/petugas/modules/3-pengembalian/pengembalian/index.js
 * 
 * Tanggung Jawab:
 * - Mengorkestrasi formulir pengembalian buku (formPengembalian.js)
 * - Pencarian dan seleksi peminjam serta buku aktif (seleksiPeminjam.js)
 * - Kalkulasi denda dan keterlambatan (kalkulatorDenda.js)
 * - Eksekusi pengembalian ke Supabase & pemulihan stok (eksekusiPengembalian.js)
 * - Modal struk tanda terima pengembalian resmi (modalStruk.js)
 */

export {
  setupReceiptModal,
  showReceiptModal,
  printReceipt
} from './modalStruk.js';

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
