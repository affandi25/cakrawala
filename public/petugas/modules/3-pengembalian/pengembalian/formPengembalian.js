/**
 * CAKRAWALA Digital Library - Modul Koordinator Formulir Meja Pengembalian
 * Path: public/petugas/modules/3-pengembalian/formPengembalian.js
 * 
 * Partisi Sub-modul:
 * - seleksiPeminjam.js     : Pencarian siswa/guru & pemilihan buku yang dipinjam
 * - kalkulatorDenda.js     : Perhitungan denda harian, aturan >= 1 bulan, dan kondisi fisik
 * - eksekusiPengembalian.js: Penyimpanan pengembalian ke Supabase & pemulihan stok
 */

import { state } from '../../core/state.js';
import { getTodayDateString, showToast, formatRupiah, getTarifDendaHarian } from '../../core/petugasHelper.js';
import { syncAllData } from '../../core/syncData.js';
import {
  renderBorrowerSearchResults,
  filterPengembalianByName,
  selectBorrowerForReturn,
  renderActiveLoansCards,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  updatePreviewPeminjamanBox
} from './seleksiPeminjam.js';
import { recalculateDenda } from './kalkulatorDenda.js';
import { handleSubmitPengembalian } from './eksekusiPengembalian.js';

// Re-export untuk konsumen modul
export {
  renderBorrowerSearchResults,
  filterPengembalianByName,
  selectBorrowerForReturn,
  renderActiveLoansCards,
  selectLoanForReturn,
  resetPengembalianSelection,
  filterPengembalianByBook,
  renderPengembalianFormOptions,
  updatePreviewPeminjamanBox,
  recalculateDenda,
  handleSubmitPengembalian
};

let isPengembalianFormSetup = false;

/**
 * Memasang pendengar peristiwa (event listener) pada formulir pengembalian
 */
export function setupPengembalianForm() {
  if (isPengembalianFormSetup) return;
  isPengembalianFormSetup = true;

  const inputSearch = document.getElementById('inputSearchPeminjamPengembalian');
  const btnClearSearch = document.getElementById('btnClearSearchPeminjam');
  const btnResetBorrower = document.getElementById('btnResetSelectedBorrower');
  const dropdownResults = document.getElementById('dropdownSearchResultsPeminjam');

  const selectPeminjamanLegacy = document.getElementById('selectPeminjamanPengembalian');
  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const kondisiRadios = document.querySelectorAll('input[name="kondisiBuku"]');
  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnRefresh = document.getElementById('btnRefreshPengembalian');

  if (inputTglKembali) {
    inputTglKembali.value = getTodayDateString();
    inputTglKembali.addEventListener('change', recalculateDenda);
  }

  // Pencarian Siswa / Peminjam
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      const query = inputSearch.value.trim();
      if (btnClearSearch) {
        btnClearSearch.classList.toggle('hidden', query.length === 0);
      }
      renderBorrowerSearchResults(query);
    });

    inputSearch.addEventListener('focus', () => {
      renderBorrowerSearchResults(inputSearch.value.trim());
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      resetPengembalianSelection();
      if (inputSearch) inputSearch.focus();
    });
  }

  if (btnResetBorrower) {
    btnResetBorrower.addEventListener('click', () => {
      resetPengembalianSelection();
      if (inputSearch) inputSearch.focus();
    });
  }

  // Tutup dropdown saat klik di luar
  document.addEventListener('click', (e) => {
    if (dropdownResults && !dropdownResults.contains(e.target) && e.target !== inputSearch) {
      dropdownResults.classList.add('hidden');
    }
  });

  // Fallback sinkronisasi select legacy jika masih digunakan
  if (selectPeminjamanLegacy) {
    selectPeminjamanLegacy.addEventListener('change', () => {
      const idPinjam = selectPeminjamanLegacy.value;
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === idPinjam);
      if (loan) {
        selectBorrowerForReturn(loan.nisn_siswa, loan.id_peminjaman);
      }
    });
  }

  kondisiRadios.forEach(radio => {
    radio.addEventListener('change', recalculateDenda);
  });

  // Inisialisasi teks tampilan tarif kebijakan aktif pada formulir pengembalian
  const displayTarifAktifForm = document.getElementById('displayTarifAktifForm');
  if (displayTarifAktifForm) {
    displayTarifAktifForm.textContent = `${formatRupiah(getTarifDendaHarian())} / hari`;
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', handleSubmitPengembalian);
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      showToast('Memperbarui data pengembalian...', 'info');
      if (window.fetchAllData) {
        await window.fetchAllData();
      } else {
        await syncAllData();
      }
    });
  }
}

// Window binding
if (typeof window !== 'undefined') {
  window.setupPengembalianForm = setupPengembalianForm;
}
