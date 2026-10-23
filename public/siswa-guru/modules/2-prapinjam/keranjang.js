/**
 * CAKRAWALA Digital Library - Modul Pengelolaan Keranjang Pra-Pinjam
 * File: public/siswa-guru/modules/2-prapinjam/keranjang.js
 * 
 * Tanggung Jawab:
 * - Mengelola daftar item buku di dalam keranjang pra-pinjam
 * - Menerapkan batas maksimal kuota 2 buku aktif (buku aktif di database + item di keranjang <= 2)
 * - Mencegah duplikasi buku yang sama di keranjang
 * - Memperbarui badge indikator jumlah di navigasi/sidebar
 */

import { state } from '../core/state.js';
import {
  showToast,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  MAX_ACTIVE_LOANS
} from '../core/siswaHelper.js';

// Memori internal keranjang pra-pinjam
if (!state.cart) {
  state.cart = [];
}

/**
 * Menambahkan buku ke dalam keranjang pra-pinjam
 * @param {object|string} bookOrId Objek buku atau ID buku
 * @returns {boolean} Status keberhasilan
 */
export function addToCart(bookOrId) {
  let book = typeof bookOrId === 'string'
    ? (state.cache.buku || []).find(b => b.id_buku === bookOrId)
    : bookOrId;

  if (!book) {
    showToast('Buku tidak ditemukan di katalog perpustakaan.', 'error');
    return false;
  }

  // 1. Validasi Stok Fisik
  const stok = Number(book.stok) || 0;
  if (stok <= 0) {
    showToast(`Maaf, stok fisik buku "${book.judul_buku}" sedang kosong.`, 'error');
    return false;
  }

  // 2. Validasi Transaksi Aktif yang Sedang Berjalan untuk Buku Ini
  const activeLoan = getActiveUserLoanForBook(book.id_buku);
  if (activeLoan) {
    if (activeLoan.status === 'Menunggu') {
      showToast(`Anda sudah memiliki tiket booking [${activeLoan.id_peminjaman}] untuk buku ini.`, 'warning');
    } else {
      showToast(`Buku "${book.judul_buku}" sedang aktif Anda pinjam. Harap kembalikan terlebih dahulu.`, 'warning');
    }
    return false;
  }

  // 3. Validasi Duplikasi di Keranjang
  const isAlreadyInCart = state.cart.some(item => item.id_buku === book.id_buku);
  if (isAlreadyInCart) {
    showToast(`Buku "${book.judul_buku}" sudah ada di dalam keranjang pra-pinjam Anda.`, 'info');
    return false;
  }

  // 4. Validasi Batas Kuota Maksimal 2 Buku Aktif
  const activeCount = getUserActiveLoansCount();
  const currentCartCount = state.cart.length;

  if (activeCount + currentCartCount >= MAX_ACTIVE_LOANS) {
    showToast(
      `Batas kuota tercapai! Anda memiliki ${activeCount} transaksi aktif dan ${currentCartCount} buku di keranjang (Maksimal ${MAX_ACTIVE_LOANS} buku sekaligus).`,
      'warning'
    );
    return false;
  }

  // 5. Tambahkan ke Keranjang
  state.cart.push(book);
  updateCartBadge();
  showToast(`Buku "${book.judul_buku}" berhasil ditambahkan ke keranjang pra-pinjam.`, 'success');
  return true;
}

/**
 * Menghapus buku dari keranjang pra-pinjam
 * @param {string} bookId ID Buku yang akan dihapus
 */
export function removeFromCart(bookId) {
  const initialLength = state.cart.length;
  state.cart = state.cart.filter(item => item.id_buku !== bookId);

  if (state.cart.length < initialLength) {
    updateCartBadge();
    showToast('Buku telah dihapus dari keranjang pra-pinjam.', 'info');
  }
}

/**
 * Mengosongkan seluruh isi keranjang
 */
export function clearCart() {
  state.cart = [];
  updateCartBadge();
}

/**
 * Mendapatkan seluruh daftar item di keranjang saat ini
 * @returns {Array}
 */
export function getCartItems() {
  return state.cart || [];
}

/**
 * Memperbarui angka indikator badge keranjang di DOM
 */
export function updateCartBadge() {
  const badgeCount = (state.cart || []).length;
  ['badgeCartCount', 'badgeNavCart', 'badgeCart'].forEach(id => {
    const badgeEl = document.getElementById(id);
    if (badgeEl) {
      badgeEl.textContent = badgeCount;
      badgeEl.classList.toggle('hidden', badgeCount === 0);
    }
  });
}

/**
 * Membuka tampilan keranjang atau beralih ke tab peminjaman
 */
export function openCart() {
  if (typeof window.switchTab === 'function') {
    window.switchTab('pinjaman');
  }
}
