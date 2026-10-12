/**
 * CAKRAWALA Digital Library - Modul Konfirmasi Hapus Buku
 * File: public/petugas/modules/4-buku/modalHapusBuku.js
 * 
 * FUNGSI:
 * - Menangani dialog konfirmasi pop-up Hapus Buku (#modalDeleteBook)
 * - Proteksi keamanan: melarang hapus jika buku sedang aktif berstatus 'Dipinjam' atau 'Menunggu'
 * - Menghapus data dari tabel 'data_buku' di Supabase
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import { showModal, hideModal, showToast } from '../core/petugasHelper.js';
import { syncAllTables } from '../core/syncData.js';

let isDeleteBookModalSetup = false;

/**
 * Setup modal konfirmasi hapus buku
 */
export function setupDeleteBookModal() {
  if (isDeleteBookModalSetup) return;
  isDeleteBookModalSetup = true;

  const modal = document.getElementById('modalDeleteBook');
  const content = document.getElementById('modalDeleteBookContent');
  const cancelBtn = document.getElementById('btnCancelDeleteBook');
  const confirmBtn = document.getElementById('btnConfirmDeleteBook');

  function closeDeleteModal() {
    hideModal(modal, content);
    state.deleteTargetBook = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDeleteModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.deleteTargetBook) return;
      const bookId = state.deleteTargetBook.id_buku;

      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Menghapus...';

        const { error } = await db
          .from('data_buku')
          .delete()
          .eq('id_buku', bookId);

        if (error) throw error;

        showToast(`Buku ${bookId} berhasil dihapus dari sistem.`, 'success');
        closeDeleteModal();
        if (window.fetchAllData) {
          await window.fetchAllData();
        } else {
          await syncAllTables();
        }
      } catch (err) {
        console.error('Gagal menghapus buku:', err);
        showToast('Gagal menghapus buku: ' + (err.message || 'Buku memiliki riwayat relasi data'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Ya, Hapus Buku';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi hapus buku dengan proteksi integritas peminjaman aktif
 */
export function openDeleteBookModal(bookId) {
  const modal = document.getElementById('modalDeleteBook');
  const content = document.getElementById('modalDeleteBookContent');
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) return;

  // Proteksi: periksa ke data_peminjaman apakah sedang aktif dipinjam atau menunggu
  const activeBorrow = (state.cache.peminjaman || []).some(
    p => p.id_buku === bookId && (p.status === 'Dipinjam' || p.status === 'Menunggu')
  );

  if (activeBorrow) {
    showToast('Buku sedang aktif berstatus Dipinjam atau Menunggu verifikasi! Tidak dapat dihapus.', 'warning');
    return;
  }

  state.deleteTargetBook = book;
  const titleEl = document.getElementById('deleteBookTitle');
  if (titleEl) titleEl.textContent = `"${book.judul_buku}" (${book.id_buku})`;

  showModal(modal, content);
}

// Window bindings
if (typeof window !== 'undefined') {
  window.openDeleteBookModal = openDeleteBookModal;
  window.setupDeleteBookModal = setupDeleteBookModal;
}
