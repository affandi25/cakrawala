/**
 * CAKRAWALA Digital Library - Modul Meja 4: Inventaris Koleksi Buku (Index Coordinator)
 * File: public/petugas/modules/buku/index.js
 * 
 * FUNGSI:
 * - Menyatukan sub-modul katalog, form buku, label QR, dan hapus buku
 * - Re-export seluruh fungsi publik modul buku
 */

import {
  renderCategoryDropdowns,
  renderBooksInventory,
  setupBooksHandlers
} from './katalogBuku.js';

import {
  setupBookFormModal,
  openBookModal
} from './modalFormBuku.js';

import {
  setupQrCodeModal,
  openQrCodeModal
} from './modalQrBuku.js';

import {
  setupDeleteBookModal,
  openDeleteBookModal
} from './modalHapusBuku.js';

export {
  renderCategoryDropdowns,
  renderBooksInventory,
  setupBooksHandlers,
  setupBookFormModal,
  openBookModal,
  setupQrCodeModal,
  openQrCodeModal,
  setupDeleteBookModal,
  openDeleteBookModal
};
