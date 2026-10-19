/**
 * Modul Koordinator Sub-tab Denda & Riwayat Pengembalian
 * Path: public/petugas/modules/3-pengembalian/denda/subtabDenda.js
 * Deskripsi: Mengatur perpindahan tab antara Kasir Tunggakan Denda dan Arsip Riwayat Pengembalian,
 *            serta mengupdate ringkasan angka & badge kasir.
 */

import { state } from '../../core/state.js';
import { formatRupiah, showToast, getTarifDendaHarian, setTarifDendaHarian } from '../../core/petugasHelper.js';
import { renderTunggakanDendaList, setupKasirTunggakanListeners } from './kasirTunggakan.js';
import { renderSemuaRiwayatList, setupArsipRiwayatListeners } from './arsipRiwayat.js';

export const subtabDendaState = {
  activeSubtab: 'tunggakan' // 'tunggakan' | 'riwayat'
};

/**
 * Menghitung ringkasan kas & badge, serta me-render kedua panel
 */
export function renderRiwayatPengembalian() {
  const list = state.cache.pengembalian || [];

  // Hitung tunggakan denda (status 'Belum Lunas')
  const tunggakanList = list.filter(item => item.status_denda === 'Belum Lunas');
  const totalNominalTunggakan = tunggakanList.reduce((acc, curr) => acc + (Number(curr.denda) || 0), 0);

  // Perbarui Badge & Ringkasan Kas
  const badgeTunggakan = document.getElementById('badgeCountTunggakanDenda');
  const badgeRiwayat = document.getElementById('badgeCountSemuaRiwayat');
  const summaryRupiah = document.getElementById('summaryTotalTunggakanRupiah');
  const summarySiswa = document.getElementById('summaryTotalSiswaTunggakan');

  if (badgeTunggakan) badgeTunggakan.textContent = tunggakanList.length;
  if (badgeRiwayat) badgeRiwayat.textContent = list.length;
  if (summaryRupiah) summaryRupiah.textContent = formatRupiah(totalNominalTunggakan);
  if (summarySiswa) summarySiswa.textContent = `${tunggakanList.length} Transaksi`;

  // Sinkronkan badge tarif denda resmi
  syncTarifDendaUI();

  // Render list masing-masing panel
  renderTunggakanDendaList();
  renderSemuaRiwayatList();
}

/**
 * Berpindah tampilan antara subtab Tunggakan dan subtab Riwayat
 */
export function switchFineSubtab(tabName) {
  subtabDendaState.activeSubtab = tabName;

  const btnTunggakan = document.getElementById('tabBtnTunggakanDenda');
  const btnRiwayat = document.getElementById('tabBtnSemuaRiwayat');
  const panelTunggakan = document.getElementById('viewTunggakanDenda') || document.getElementById('subpanelTunggakanDenda');
  const panelRiwayat = document.getElementById('viewSemuaRiwayat') || document.getElementById('subpanelSemuaRiwayat');

  if (tabName === 'tunggakan') {
    if (btnTunggakan) {
      btnTunggakan.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-rose-700 shadow-xs transition font-bold';
    }
    if (btnRiwayat) {
      btnRiwayat.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition font-medium';
    }
    if (panelTunggakan) panelTunggakan.classList.remove('hidden');
    if (panelRiwayat) panelRiwayat.classList.add('hidden');
    renderTunggakanDendaList();
  } else {
    if (btnTunggakan) {
      btnTunggakan.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition font-medium';
    }
    if (btnRiwayat) {
      btnRiwayat.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-navy shadow-xs transition font-bold';
    }
    if (panelTunggakan) panelTunggakan.classList.add('hidden');
    if (panelRiwayat) panelRiwayat.classList.remove('hidden');
    renderSemuaRiwayatList();
  }
}

/**
 * Setup event listeners untuk tombol navigasi subtab
 */
export function setupSubtabDendaListeners() {
  const btnTunggakan = document.getElementById('tabBtnTunggakanDenda');
  const btnRiwayat = document.getElementById('tabBtnSemuaRiwayat');

  if (btnTunggakan) {
    btnTunggakan.addEventListener('click', () => switchFineSubtab('tunggakan'));
  }
  if (btnRiwayat) {
    btnRiwayat.addEventListener('click', () => switchFineSubtab('riwayat'));
  }

  // Pasang listener modul anak
  setupKasirTunggakanListeners();
  setupArsipRiwayatListeners();
  setupTarifDendaListeners();
}

/**
 * Sinkronkan tampilan badge dan input tarif denda di seluruh meja
 */
export function syncTarifDendaUI() {
  const currentTarif = getTarifDendaHarian();
  const inputTarif = document.getElementById('inputTarifDendaGlobal');
  const badgeTarif = document.getElementById('badgeTarifAktif');
  const displayForm = document.getElementById('displayTarifAktifForm');

  if (inputTarif) inputTarif.value = currentTarif;
  if (badgeTarif) badgeTarif.textContent = `${formatRupiah(currentTarif)} / hari`;
  if (displayForm) displayForm.textContent = `${formatRupiah(currentTarif)} / hari`;
}

/**
 * Pasang listener tombol Simpan Kebijakan Tarif Denda
 */
export function setupTarifDendaListeners() {
  syncTarifDendaUI();

  const btnSimpan = document.getElementById('btnSimpanTarifDenda');
  const inputTarif = document.getElementById('inputTarifDendaGlobal');

  if (btnSimpan && inputTarif) {
    btnSimpan.addEventListener('click', () => {
      const rawVal = parseInt(inputTarif.value, 10);
      if (isNaN(rawVal) || rawVal < 0) {
        showToast('Masukkan nominal tarif denda yang valid (minimal Rp 0).', 'warning');
        return;
      }

      const newTarif = setTarifDendaHarian(rawVal);
      syncTarifDendaUI();

      // Hitung ulang denda jika ada peminjaman yang sedang dipilih di meja pengembalian
      if (window.recalculateDenda) {
        window.recalculateDenda();
      }

      showToast(`Kebijakan tarif denda berhasil disimpan: ${formatRupiah(newTarif)} / hari`, 'success');
    });

    // Dukung pintasan tombol Enter pada input tarif
    inputTarif.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSimpan.click();
      }
    });
  }
}

// Ekspos global jika diperlukan
if (typeof window !== 'undefined') {
  window.renderRiwayatPengembalian = renderRiwayatPengembalian;
  window.switchFineSubtab = switchFineSubtab;
}
