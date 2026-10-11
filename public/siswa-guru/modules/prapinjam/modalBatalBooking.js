/**
 * CAKRAWALA Digital Library - Modul Konfirmasi Batal Booking
 * File: public/siswa-guru/modules/prapinjam/modalBatalBooking.js
 * 
 * Tanggung Jawab:
 * - Menangani dialog konfirmasi pembatalan antrean pra-pinjam (#modalCancelBooking)
 * - Menghapus transaksi pinjaman status 'Menunggu' dari Supabase
 * - Memperbarui state dan memicu fetch data ulang
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../siswaHelper.js';

let isCancelBookingModalSetup = false;

/**
 * Setup modal konfirmasi pembatalan antrean pra-pinjam
 */
export function setupCancelBookingModal() {
  if (isCancelBookingModalSetup) return;
  isCancelBookingModalSetup = true;

  const modal = document.getElementById('modalCancelBooking');
  const content = document.getElementById('modalCancelBookingContent');
  const cancelBtn = document.getElementById('btnDismissCancelBooking');
  const confirmBtn = document.getElementById('btnConfirmCancelBooking');

  function closeModal() {
    hideModal(modal, content);
    state.cancelTargetBooking = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.cancelTargetBooking) return;
      const loanId = state.cancelTargetBooking;

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> <span>Membatalkan...</span>';

        // 1. Ambil data peminjaman terlebih dahulu untuk mengetahui id_buku
        const targetLoan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === loanId);
        let idBuku = targetLoan?.id_buku;

        if (!idBuku) {
          const { data: dbLoan } = await db
            .from('data_peminjaman')
            .select('id_buku')
            .eq('id_peminjaman', loanId)
            .single();
          idBuku = dbLoan?.id_buku;
        }

        // 2. Hapus transaksi peminjaman 'Menunggu' dari database
        const { error } = await db
          .from('data_peminjaman')
          .delete()
          .eq('id_peminjaman', loanId);

        if (error) throw error;

        // 3. Kembalikan stok buku fisik (+1) ke inventaris
        if (idBuku) {
          const bookInCache = (state.cache.buku || []).find(b => b.id_buku === idBuku);
          let currentStock = bookInCache ? (Number(bookInCache.stok) || 0) : 0;

          // Ambil stok teraktual dari database untuk konsistensi
          const { data: dbBook } = await db
            .from('data_buku')
            .select('stok')
            .eq('id_buku', idBuku)
            .single();

          if (dbBook && dbBook.stok !== undefined) {
            currentStock = Number(dbBook.stok) || 0;
          }

          const { error: errStock } = await db
            .from('data_buku')
            .update({
              stok: currentStock + 1,
              status: 'Tersedia'
            })
            .eq('id_buku', idBuku);

          if (errStock) {
            console.warn('Gagal memulihkan stok buku:', errStock);
          }
        }

        showToast(`Pesanan booking [${loanId}] berhasil dibatalkan. Stok buku telah dipulihkan.`, 'success');
        closeModal();

        if (window.fetchAllMemberData) {
          await window.fetchAllMemberData();
        }
      } catch (err) {
        console.error('Gagal membatalkan booking:', err);
        showToast('Gagal membatalkan pemesanan: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="ph ph-trash text-sm"></i> <span>Ya, Batalkan Pesanan</span>';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi pembatalan booking
 */
export function openCancelBookingModal(loanId) {
  const modal = document.getElementById('modalCancelBooking');
  const content = document.getElementById('modalCancelBookingContent');
  const idEl = document.getElementById('cancelBookingIdDisplay');

  state.cancelTargetBooking = loanId;
  if (idEl) idEl.textContent = loanId;
  showModal(modal, content);
}

// Buka akses global agar dapat dipanggil dari onclick HTML
if (typeof window !== 'undefined') {
  window.openCancelBookingModal = openCancelBookingModal;
}
