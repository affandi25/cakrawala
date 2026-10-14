/**
 * CAKRAWALA Digital Library - Modul Meja 2: Sirkulasi & Pra-Pinjam (Koordinator Fitur)
 * File: public/petugas/modules/2-sirkulasi/index.js
 * 
 * Sub-modul:
 * - memberPicker.js  : Pencarian cerdas & combobox peminjam (Siswa & Guru)
 * - walkIn.js        : Form transaksi peminjaman langsung di tempat & validasi kuota
 * - prapinjam.js     : Antrean reservasi daring, filter kesiapan meja, & verifikasi tiket QR 2D
 * - pinjamanAktif.js : Daftar buku sedang dipinjam & shortcut pengembalian
 */

import { state } from '../core/state.js';
import { showToast } from '../core/petugasHelper.js';

// Ekspor dari sub-modul
export {
  getCombinedMembersList,
  getFilteredMembers,
  setupMemberPicker,
  renderMemberDropdownResults,
  selectMember,
  clearSelectedMember
} from './memberPicker.js';

export {
  addBookToCart,
  addBookToWalkInCart,
  handleWalkInScan,
  addWalkInBookManual,
  removeWalkInCartItem,
  removeBookFromCart,
  clearWalkInCart,
  getWalkInCart,
  renderWalkInCart,
  setMejaSelectedBuku,
  checkMejaBorrowEligibility,
  clearMejaBukuPreview,
  setupWalkInForm,
  setupWalkInModal,
  openWalkInModal
} from './walkIn.js';

export {
  renderPrapinjamOnlyTable,
  setupPrapinjamFilters,
  setupPrapinjamVerifyModal,
  openPrapinjamVerifyModal,
  handleApprovePrapinjam,
  handleRejectPrapinjam,
  togglePersiapanBuku,
  getFilterPersiapanPrapinjam,
  setFilterPersiapanPrapinjam
} from './prapinjam.js';

export {
  renderDipinjamOnlyTable,
  setupDipinjamFilters
} from './pinjamanAktif.js';

import { setupMemberPicker } from './memberPicker.js';
import { 
  setupWalkInForm, 
  openWalkInModal,
  addBookToCart,
  addBookToWalkInCart,
  addWalkInBookManual,
  handleWalkInScan,
  removeBookFromCart,
  removeWalkInCartItem,
  clearWalkInCart,
  renderWalkInCart
} from './walkIn.js';
import {
  renderPrapinjamOnlyTable,
  setupPrapinjamFilters,
  setupPrapinjamVerifyModal,
  openPrapinjamVerifyModal,
  handleApprovePrapinjam,
  handleRejectPrapinjam
} from './prapinjam.js';
import { renderDipinjamOnlyTable, setupDipinjamFilters } from './pinjamanAktif.js';

/**
 * Berpindah sub-meja sirkulasi ('prapinjam' | 'walkin' | 'dipinjam')
 */
export function switchSirkulasiSubtab(subtabKey) {
  state.activeSirkulasiSubtab = subtabKey;

  const subtabs = [
    { id: 'subTabBtnPrapinjam', panelId: 'subPanelPrapinjam', key: 'prapinjam' },
    { id: 'subTabBtnWalkIn', panelId: 'subPanelWalkIn', key: 'walkin' },
    { id: 'subTabBtnDipinjam', panelId: 'subPanelDipinjam', key: 'dipinjam' }
  ];

  subtabs.forEach(item => {
    const btn = document.getElementById(item.id);
    const panel = document.getElementById(item.panelId);

    if (btn && panel) {
      if (item.key === subtabKey) {
        btn.className = 'subtab-sirkulasi-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
        panel.classList.remove('hidden');
      } else {
        btn.className = 'subtab-sirkulasi-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
        panel.classList.add('hidden');
      }
    }
  });

  renderSirkulasi();
}

/**
 * Mengisi dropdown pilihan siswa, guru, dan buku di form Walk-In
 */
export function renderMejaDropdowns() {
  const selectSiswa = document.getElementById('selectMejaSiswa');
  if (selectSiswa) {
    const currentVal = selectSiswa.value;
    let opts = '<option value="">-- Cari / Pilih Siswa atau Guru --</option>';
    (state.cache.siswa || []).forEach(s => {
      opts += `<option value="${s.nisn_siswa}">[Siswa] ${s.nama_siswa} (${s.nisn_siswa} &bull; ${s.kelas})</option>`;
    });
    (state.cache.guru || []).forEach(g => {
      opts += `<option value="${g.nip_guru}">[Guru] ${g.nama_guru} (${g.nip_guru} &bull; ${g.mata_pelajaran || 'Pengajar'})</option>`;
    });
    selectSiswa.innerHTML = opts;
    if (currentVal) selectSiswa.value = currentVal;
  }
}

/**
 * Merender seluruh komponen meja sirkulasi
 */
export function renderSirkulasi() {
  renderMejaDropdowns();
  renderPrapinjamOnlyTable();
  renderDipinjamOnlyTable();
  renderWalkInCart();
}

let isSirkulasiSetup = false;

/**
 * Inisialisasi seluruh event listener meja sirkulasi
 */
export function setupSirkulasiHandlers() {
  if (isSirkulasiSetup) return;
  isSirkulasiSetup = true;

  state.activeSirkulasiSubtab = 'prapinjam';
  state.selectedMejaBuku = null;

  setupPrapinjamVerifyModal();
  setupPrapinjamFilters();
  setupDipinjamFilters();
  setupMemberPicker();
  setupWalkInForm(
    (subtab) => switchSirkulasiSubtab(subtab),
    (loan, isVerified) => openPrapinjamVerifyModal(loan, isVerified)
  );

  // Setup tombol navigasi sub-tab
  const btnPrapinjam = document.getElementById('subTabBtnPrapinjam');
  const btnWalkIn = document.getElementById('subTabBtnWalkIn');
  const btnDipinjam = document.getElementById('subTabBtnDipinjam');
  const btnRefresh = document.getElementById('btnRefreshSirkulasi');

  if (btnPrapinjam) btnPrapinjam.addEventListener('click', () => switchSirkulasiSubtab('prapinjam'));
  if (btnWalkIn) btnWalkIn.addEventListener('click', () => switchSirkulasiSubtab('walkin'));
  if (btnDipinjam) btnDipinjam.addEventListener('click', () => switchSirkulasiSubtab('dipinjam'));

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      showToast('Memperbarui data sirkulasi...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  // Tombol buka scanner kamera langsung dari meja walk-in
  const btnScanCamera = document.getElementById('btnOpenScannerCamera');
  if (btnScanCamera) {
    btnScanCamera.addEventListener('click', () => {
      if (window.startLiveCameraScanner) {
        window.startLiveCameraScanner('walkin');
      } else {
        showToast('Modul scanner kamera sedang dimuat...', 'info');
      }
    });
  }
}

// Window bindings untuk seluruh aksi sirkulasi
if (typeof window !== 'undefined') {
  window.switchSirkulasiSubtab = switchSirkulasiSubtab;
  window.renderSirkulasi = renderSirkulasi;
  window.setupSirkulasiHandlers = setupSirkulasiHandlers;
  window.openWalkInModal = openWalkInModal;
  window.openPrapinjamVerifyModal = openPrapinjamVerifyModal;
  window.handleApprovePrapinjam = handleApprovePrapinjam;
  window.handleRejectPrapinjam = handleRejectPrapinjam;
  window.addBookToWalkInCart = addBookToWalkInCart;
  window.addBookToCart = addBookToCart;
  window.addWalkInBookManual = addWalkInBookManual;
  window.handleWalkInScan = handleWalkInScan;
  window.removeBookFromCart = removeBookFromCart;
  window.removeWalkInCartItem = removeWalkInCartItem;
  window.clearWalkInCart = clearWalkInCart;
  window.renderWalkInCart = renderWalkInCart;
}
