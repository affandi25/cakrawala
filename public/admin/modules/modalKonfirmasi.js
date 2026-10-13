/**
 * CAKRAWALA Digital Library - Modul Modal Konfirmasi Hapus & Logout
 * File: public/admin/modules/modalKonfirmasi.js
 * 
 * Tanggung Jawab:
 * - Menampilkan dialog konfirmasi penghapusan pengguna (Cascade Delete)
 * - Menangani eksekusi penghapusan akun di Supabase (data_user)
 * - Otomatis me-refresh tabel data dan metrik KPI setelah penghapusan
 * - Interaksi keyboard accessibility (Escape / backdrop click)
 */

import { db } from '../../assets/js/supabaseClient.js';
import { showToast } from '../../assets/js/sharedUtils.js';
import { state, DOM } from './state.js';
import { loadData, refreshAllBadges } from './data.js';
import { loadKpiStats } from './0-overview/kpiMetrics.js';

let listenersInitialized = false;

/**
 * Buka modal konfirmasi hapus pengguna
 */
export function openDeleteModal(idUser, name, entity) {
  if (!idUser) {
    showToast('ID Pengguna tidak valid untuk dihapus.', 'error');
    return;
  }

  state.deleteTarget = { id_user: idUser, name: name, entity: entity };

  const targetNameEl = DOM.deleteTargetName || document.getElementById('deleteTargetName');
  if (targetNameEl) {
    targetNameEl.textContent = `${name} (${entity})`;
  }

  const modalEl = DOM.modalDeleteConfirm || document.getElementById('modalDeleteConfirm');
  const contentEl = DOM.modalDeleteContent || document.getElementById('modalDeleteContent');

  if (modalEl) {
    modalEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalEl.classList.remove('opacity-0');
      if (contentEl) contentEl.classList.remove('scale-95');
    });
  }
}

/**
 * Tutup modal konfirmasi hapus pengguna
 */
export function closeDeleteModal() {
  const modalEl = DOM.modalDeleteConfirm || document.getElementById('modalDeleteConfirm');
  const contentEl = DOM.modalDeleteContent || document.getElementById('modalDeleteContent');

  if (modalEl) modalEl.classList.add('opacity-0');
  if (contentEl) contentEl.classList.add('scale-95');

  setTimeout(() => {
    if (modalEl) modalEl.classList.add('hidden');
    state.deleteTarget = null;
  }, 200);
}

/**
 * Eksekusi penghapusan pengguna (Cascade Delete via data_user)
 */
export async function handleConfirmDelete() {
  if (!state.deleteTarget || !state.deleteTarget.id_user) return;

  const { id_user, name, entity } = state.deleteTarget;
  const btnConfirm = DOM.btnConfirmDelete || document.getElementById('btnConfirmDelete');
  const iconSpinner = DOM.iconDeleteSpinner || document.getElementById('iconDeleteSpinner');
  const textBtn = DOM.textBtnDelete || document.getElementById('textBtnDelete');

  if (btnConfirm) btnConfirm.disabled = true;
  if (iconSpinner) iconSpinner.className = 'ph ph-circle-notch animate-spin text-base';
  if (textBtn) textBtn.textContent = 'Menghapus...';

  try {
    const { error } = await db
      .from('data_user')
      .delete()
      .eq('id_user', id_user);

    if (error) throw error;

    if (btnConfirm) btnConfirm.disabled = false;
    if (iconSpinner) iconSpinner.className = 'ph ph-trash-simple text-base';
    if (textBtn) textBtn.textContent = 'Ya, Hapus Pengguna';

    closeDeleteModal();
    showToast(`Akun ${entity} "${name}" berhasil dihapus dari sistem.`, 'success');

    // Refresh tabel & sinkronisasi metrik KPI secara menyeluruh
    await loadData(state.activeTab, false);
    refreshAllBadges();
    loadKpiStats().catch(err => console.warn('[ModalKonfirmasi] Refresh KPI gagal:', err));

  } catch (err) {
    console.error('[ModalKonfirmasi] Error saat menghapus user:', err);
    if (btnConfirm) btnConfirm.disabled = false;
    if (iconSpinner) iconSpinner.className = 'ph ph-trash-simple text-base';
    if (textBtn) textBtn.textContent = 'Ya, Hapus Pengguna';
    showToast(`Gagal menghapus pengguna: ${err.message || 'Koneksi bermasalah'}`, 'error');
  }
}

/**
 * Pasang event listener modal konfirmasi
 */
export function setupModalKonfirmasiListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  const btnCancel = DOM.btnCancelDelete || document.getElementById('btnCancelDelete');
  const btnConfirm = DOM.btnConfirmDelete || document.getElementById('btnConfirmDelete');
  const modalEl = DOM.modalDeleteConfirm || document.getElementById('modalDeleteConfirm');

  if (btnCancel) btnCancel.addEventListener('click', closeDeleteModal);
  if (btnConfirm) btnConfirm.addEventListener('click', handleConfirmDelete);

  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeDeleteModal();
    });
  }
}

/**
 * Inisialisasi Modul Modal Konfirmasi
 */
export function initModalKonfirmasi() {
  setupModalKonfirmasiListeners();
}

// Interoperabilitas global
if (typeof window !== 'undefined') {
  window.openDeleteModal = openDeleteModal;
  window.closeDeleteModal = closeDeleteModal;
  window.handleConfirmDelete = handleConfirmDelete;
}
