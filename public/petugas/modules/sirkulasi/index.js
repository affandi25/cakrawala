/**
 * CAKRAWALA Digital Library - Modul Meja 2: Sirkulasi & Pra-Pinjam (Koordinator Fitur)
 * File: public/petugas/modules/sirkulasi/index.js
 * 
 * Sub-modul:
 * - memberPicker.js  : Pencarian cerdas & combobox peminjam (Siswa & Guru)
 * - walkIn.js        : Form transaksi peminjaman langsung di tempat & validasi kuota
 * - prapinjam.js     : Antrean reservasi daring, filter kesiapan meja, & verifikasi tiket QR 2D
 * - pinjamanAktif.js : Daftar buku sedang dipinjam & shortcut pengembalian
 */

import { state } from '../state.js';
import { showToast } from '../petugasHelper.js';

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
import { setupWalkInForm, setupWalkInModal, openWalkInModal } from './walkIn.js';
import {
  renderPrapinjamOnlyTable,
  setupPrapinjamFilters,
  setupPrapinjamVerifyModal,
  openPrapinjamVerifyModal
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

  const selectBuku = document.getElementById('selectMejaBuku');
  if (selectBuku && state.cache.buku) {
    const currentVal = selectBuku.value;
    let opts = '<option value="">-- Atau Pilih Judul dari Daftar Koleksi Tersedia --</option>';
    const availableBooks = state.cache.buku.filter(b => (Number(b.stok) || 0) > 0);
    availableBooks.forEach(b => {
      opts += `<option value="${b.id_buku}">${b.id_buku} &bull; ${b.judul_buku} (Stok: ${b.stok} | Rak: ${b.keterangan || '-'})</option>`;
    });
    selectBuku.innerHTML = opts;
    if (currentVal) selectBuku.value = currentVal;
  }
}

/**
 * Merender seluruh komponen meja sirkulasi
 */
export function renderSirkulasi() {
  renderMejaDropdowns();
  renderPrapinjamOnlyTable();
  renderDipinjamOnlyTable();
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

  const subtabs = [
    { id: 'subTabBtnPrapinjam', key: 'prapinjam' },
    { id: 'subTabBtnWalkIn', key: 'walkin' },
    { id: 'subTabBtnDipinjam', key: 'dipinjam' }
  ];

  subtabs.forEach(item => {
    const btn = document.getElementById(item.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      switchSirkulasiSubtab(item.key);
    });
  });

  const refreshBtn = document.getElementById('btnRefreshSirkulasi');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui data sirkulasi...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }
}

// Buka akses global ke window
if (typeof window !== 'undefined') {
  window.switchSirkulasiSubtab = switchSirkulasiSubtab;
  window.openWalkInModal = openWalkInModal;
}
