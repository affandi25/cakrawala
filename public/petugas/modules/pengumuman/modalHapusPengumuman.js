/**
 * CAKRAWALA Digital Library - Modul Konfirmasi Hapus Pengumuman
 * File: public/petugas/modules/pengumuman/modalHapusPengumuman.js
 * 
 * FUNGSI:
 * - Menangani dialog konfirmasi pop-up Hapus Pengumuman (#modalDeletePengumuman)
 * - Menghapus data dari tabel 'data_pengumuman' di Supabase
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../petugasHelper.js';

let isDeleteModalSetup = false;

/**
 * Setup modal konfirmasi hapus pengumuman
 */
export function setupDeletePengumumanModal() {
  if (isDeleteModalSetup) return;
  isDeleteModalSetup = true;

  const modal = document.getElementById('modalDeletePengumuman');
  const content = document.getElementById('modalDeletePengumumanContent');
  const cancelBtn = document.getElementById('btnCancelDeletePengumuman');
  const confirmBtn = document.getElementById('btnConfirmDeletePengumuman');

  function closeDeleteModal() {
    hideModal(modal, content);
    state.deleteTargetPengumuman = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDeleteModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.deleteTargetPengumuman) return;
      const targetId = state.deleteTargetPengumuman.id_pengumuman;

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> <span>Menghapus...</span>';

        const { error } = await db
          .from('data_pengumuman')
          .delete()
          .eq('id_pengumuman', Number(targetId));

        if (error) throw error;

        showToast(`Pengumuman #${targetId} berhasil dihapus dari sistem.`, 'success');
        closeDeleteModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus pengumuman:', err);
        showToast('Gagal menghapus pengumuman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="ph ph-trash text-sm"></i> <span>Ya, Hapus Pengumuman</span>';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi hapus pengumuman
 */
export function openDeletePengumumanModal(pengumumanId) {
  const modal = document.getElementById('modalDeletePengumuman');
  const content = document.getElementById('modalDeletePengumumanContent');
  const titleEl = document.getElementById('deletePengumumanTitle');

  const item = (state.cache.pengumuman || []).find(p => String(p.id_pengumuman) === String(pengumumanId));
  if (!item) return;

  state.deleteTargetPengumuman = item;
  if (titleEl) titleEl.textContent = `"${item.judul}" (#${item.id_pengumuman})`;

  showModal(modal, content);
}
