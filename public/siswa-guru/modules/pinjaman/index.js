/**
 * CAKRAWALA Digital Library - Modul Tab 3: Peminjaman Saya (Koordinator Fitur)
 * File: public/siswa-guru/modules/pinjaman/index.js
 * 
 * Sub-modul:
 * - pinjamanAktif.js     : Render daftar buku yang sedang aktif dipinjam
 * - pinjamanPrapinjam.js : Render antrean pra-pinjam & trigger barcode tiket
 * - modalBatalBooking.js : Dialog & aksi pembatalan reservasi pinjaman
 */

import { state } from '../state.js';
import { renderActiveLoansTable } from './pinjamanAktif.js';
import { renderPendingReservationsTable, showTicketDetails } from './pinjamanPrapinjam.js';
import { setupCancelBookingModal, openCancelBookingModal } from '../prapinjam/index.js';

// Re-ekspor seluruh fungsi agar kompatibel ke semua pemanggil
export {
  renderActiveLoansTable,
  renderPendingReservationsTable,
  showTicketDetails,
  setupCancelBookingModal,
  openCancelBookingModal
};

/**
 * Setup pendengar sub-tab dan modal pembatalan booking
 */
export function setupPinjamanModule() {
  const btnSubtabAktif = document.getElementById('subTabBtnPinjamanAktif');
  const btnSubtabPrapinjam = document.getElementById('subTabBtnPinjamanPrapinjam');

  if (btnSubtabAktif) {
    btnSubtabAktif.addEventListener('click', () => {
      switchPinjamanSubtab('aktif');
    });
  }

  if (btnSubtabPrapinjam) {
    btnSubtabPrapinjam.addEventListener('click', () => {
      switchPinjamanSubtab('prapinjam');
    });
  }
}

/**
 * Berpindah sub-tab pinjaman ('aktif' atau 'prapinjam')
 */
export function switchPinjamanSubtab(subtabKey) {
  state.activePinjamanSubtab = subtabKey;

  const btnAktif = document.getElementById('subTabBtnPinjamanAktif');
  const btnPrapinjam = document.getElementById('subTabBtnPinjamanPrapinjam');
  const panelAktif = document.getElementById('subPanelPinjamanAktif');
  const panelPrapinjam = document.getElementById('subPanelPinjamanPrapinjam');

  if (subtabKey === 'aktif') {
    if (btnAktif) btnAktif.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
    if (btnPrapinjam) btnPrapinjam.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
    if (panelAktif) panelAktif.classList.remove('hidden');
    if (panelPrapinjam) panelPrapinjam.classList.add('hidden');
  } else {
    if (btnPrapinjam) btnPrapinjam.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
    if (btnAktif) btnAktif.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
    if (panelPrapinjam) panelPrapinjam.classList.remove('hidden');
    if (panelAktif) panelAktif.classList.add('hidden');
  }

  renderPinjamanTables();
}

/**
 * Merender kedua tabel/kartu peminjaman (aktif & prapinjam)
 */
export function renderPinjamanTables() {
  renderActiveLoansTable();
  renderPendingReservationsTable();
}

// Buka akses global ke window
if (typeof window !== 'undefined') {
  window.switchPinjamanSubtab = switchPinjamanSubtab;
  window.showTicketDetails = showTicketDetails;
}
