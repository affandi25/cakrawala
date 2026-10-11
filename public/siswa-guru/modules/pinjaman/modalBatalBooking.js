/**
 * CAKRAWALA Digital Library - Modul Konfirmasi Batal Booking
 * File: public/siswa-guru/modules/pinjaman/modalBatalBooking.js
 * 
 * Tanggung Jawab:
 * - Menangani dialog konfirmasi pembatalan antrean pra-pinjam (#modalCancelBooking)
 * - Menghapus transaksi pinjaman status 'Menunggu' dari Supabase
 * - Memperbarui state dan memicu fetch data ulang
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../siswaHelper.js';

/**
 * Setup modal konfirmasi pembatalan antrean pra-pinjam
 */
export function setupCancelBookingModal() {
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

        const { error } = await db
          .from('data_peminjaman')
          .delete()
          .eq('id_peminjaman', loanId);

        if (error) throw error;

        showToast(`Pesanan booking [${loanId}] berhasil dibatalkan.`, 'success');
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
