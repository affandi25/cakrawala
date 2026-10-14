/**
 * CAKRAWALA Digital Library - Modul Meja 4: Inventaris Koleksi Buku & QR Code
 * File: public/petugas/modules/4-buku/index.js
 * 
 * Sub-modul:
 * - katalogBuku.js  : Daftar tabel katalog inventaris buku & filter
 * - modalFormBuku.js: Dialog formulir tambah & edit buku
 * - modalQrBuku.js  : Dialog pratinjau & cetak/unduh stiker label QR buku
 * - modalHapusBuku.js: Dialog konfirmasi hapus buku dengan proteksi peminjaman aktif
 */

export {
  renderCategoryDropdowns,
  renderBooksInventory,
  setupBooksHandlers
} from './katalogBuku.js';

export {
  openBookModal,
  setupBookFormModal,
  generateSequentialBookId
} from './modalFormBuku.js';

export {
  openQrCodeModal,
  setupQrCodeModal,
  printQrLabel,
  downloadQrPng
} from './modalQrBuku.js';

export {
  openDeleteBookModal,
  setupDeleteBookModal
} from './modalHapusBuku.js';

import {
  renderCategoryDropdowns,
  renderBooksInventory,
  setupBooksHandlers
} from './katalogBuku.js';
import { openBookModal, generateSequentialBookId } from './modalFormBuku.js';
import { openQrCodeModal, printQrLabel, downloadQrPng } from './modalQrBuku.js';
import { openDeleteBookModal } from './modalHapusBuku.js';

/**
 * Render seluruh tampilan Meja 4 (Inventaris Buku & Kategori)
 */
export function renderInventarisTab() {
  renderCategoryDropdowns();
  renderBooksInventory();
}

/**
 * Setup modul inventaris buku dan seluruh event modal
 */
export function setupInventarisModule() {
  setupBooksHandlers();
}

// Window Bindings Lengkap untuk Meja 4
if (typeof window !== 'undefined') {
  window.renderInventarisTab = renderInventarisTab;
  window.setupInventarisModule = setupInventarisModule;
  window.renderCategoryDropdowns = renderCategoryDropdowns;
  window.renderBooksInventory = renderBooksInventory;
  window.openBookModal = openBookModal;
  window.generateSequentialBookId = generateSequentialBookId;
  window.openQrCodeModal = openQrCodeModal;
  window.openDeleteBookModal = openDeleteBookModal;
  window.printQrLabel = printQrLabel;
  window.downloadQrPng = downloadQrPng;
}
