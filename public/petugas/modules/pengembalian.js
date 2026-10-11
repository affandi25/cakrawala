/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian & Kalkulator Denda
 * File: public/petugas/modules/pengembalian.js
 * 
 * FUNGSI:
 * - Menangani pengembalian buku dari siswa / guru
 * - Menghitung keterlambatan pengembalian secara otomatis (Rp 1.000 / hari)
 * - Menilai kondisi buku (Baik = Rp 0, Rusak = 50% harga buku, Hilang = 100% harga buku)
 * - Menerbitkan struk resi pengembalian resmi
 * - Menampilkan riwayat transaksi pengembalian dan pelunasan denda tertunda
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayDateString,
  generateRandomId,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from './petugasHelper.js';

// Local state khusus sub-panel denda & riwayat
export const fineSubtabState = {
  activeTab: 'tunggakan', // 'tunggakan' | 'riwayat'
  searchTunggakan: '',
  searchRiwayat: '',
  filterRiwayatStatus: 'semua', // 'semua' | 'lunas' | 'tanpa-denda'
  targetPaymentItem: null
};

/**
 * Memasang pendengar peristiwa (event listener) pada modul pengembalian
 */
export function setupPengembalianModule() {
  const inputSearch = document.getElementById('inputSearchPeminjamPengembalian');
  const btnClearSearch = document.getElementById('btnClearSearchPeminjam');
  const btnResetBorrower = document.getElementById('btnResetSelectedBorrower');
  const dropdownResults = document.getElementById('dropdownSearchResultsPeminjam');

  const selectPeminjamanLegacy = document.getElementById('selectPeminjamanPengembalian');
  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const kondisiRadios = document.querySelectorAll('input[name="kondisiBuku"]');
  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnRefresh = document.getElementById('btnRefreshPengembalian');
  const btnCloseReceipt = document.getElementById('btnCloseReceipt');

  // Sub-tab Denda Switcher
  const tabBtnTunggakan = document.getElementById('tabBtnTunggakanDenda');
  const tabBtnRiwayat = document.getElementById('tabBtnSemuaRiwayat');
  const viewTunggakan = document.getElementById('viewTunggakanDenda');
  const viewRiwayat = document.getElementById('viewSemuaRiwayat');

  function switchFineSubtab(tab) {
    fineSubtabState.activeTab = tab;
    if (tab === 'tunggakan') {
      if (tabBtnTunggakan) {
        tabBtnTunggakan.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-rose-700 shadow-xs transition';
      }
      if (tabBtnRiwayat) {
        tabBtnRiwayat.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition';
      }
      if (viewTunggakan) viewTunggakan.classList.remove('hidden');
      if (viewRiwayat) viewRiwayat.classList.add('hidden');
    } else {
      if (tabBtnRiwayat) {
        tabBtnRiwayat.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-navy shadow-xs transition';
      }
      if (tabBtnTunggakan) {
        tabBtnTunggakan.className = 'tab-btn-fine flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition';
      }
      if (viewRiwayat) viewRiwayat.classList.remove('hidden');
      if (viewTunggakan) viewTunggakan.classList.add('hidden');
    }
  }

  if (tabBtnTunggakan) tabBtnTunggakan.addEventListener('click', () => switchFineSubtab('tunggakan'));
  if (tabBtnRiwayat) tabBtnRiwayat.addEventListener('click', () => switchFineSubtab('riwayat'));

  // Input Search Tunggakan Denda
  const inputSearchTunggakan = document.getElementById('inputSearchTunggakanDenda');
  if (inputSearchTunggakan) {
    inputSearchTunggakan.addEventListener('input', () => {
      fineSubtabState.searchTunggakan = inputSearchTunggakan.value.trim().toLowerCase();
      renderTunggakanDendaList();
    });
  }

  // Input Search Riwayat
  const inputSearchRiwayat = document.getElementById('inputSearchRiwayatPengembalian');
  if (inputSearchRiwayat) {
    inputSearchRiwayat.addEventListener('input', () => {
      fineSubtabState.searchRiwayat = inputSearchRiwayat.value.trim().toLowerCase();
      renderSemuaRiwayatList();
    });
  }

  // Pills Filter Status Riwayat
  const pillsRiwayat = document.querySelectorAll('.pill-filter-riwayat');
  pillsRiwayat.forEach(pill => {
    pill.addEventListener('click', () => {
      pillsRiwayat.forEach(p => {
        p.className = 'pill-filter-riwayat rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition';
      });
      pill.className = 'pill-filter-riwayat active rounded-lg bg-navy px-2.5 py-1 text-white transition';
      fineSubtabState.filterRiwayatStatus = pill.getAttribute('data-filter') || 'semua';
      renderSemuaRiwayatList();
    });
  });

  // Modal Verifikasi Pelunasan Denda Tunai
  const checkUangDiterima = document.getElementById('checkUangDiterima');
  const btnBatalLunasiModal = document.getElementById('btnBatalLunasiModal');
  const btnEksekusiLunasiModal = document.getElementById('btnEksekusiLunasiModal');
  const modalLunasi = document.getElementById('modalKonfirmasiLunasiDenda');
  const modalLunasiContent = document.getElementById('modalKonfirmasiLunasiDendaContent');

  if (checkUangDiterima && btnEksekusiLunasiModal) {
    checkUangDiterima.addEventListener('change', () => {
      btnEksekusiLunasiModal.disabled = !checkUangDiterima.checked;
    });
  }

  if (btnBatalLunasiModal) {
    btnBatalLunasiModal.addEventListener('click', () => {
      hideModal(modalLunasi, modalLunasiContent);
      fineSubtabState.targetPaymentItem = null;
    });
  }

  if (btnEksekusiLunasiModal) {
    btnEksekusiLunasiModal.addEventListener('click', async () => {
      if (!fineSubtabState.targetPaymentItem) return;
      await executePelunasanDenda(fineSubtabState.targetPaymentItem.id_pengembalian);
    });
  }

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
      const loan = state.cache.peminjaman.find(p => p.id_peminjaman === idPinjam);
      if (loan) {
        selectBorrowerForReturn(loan.nisn_siswa, loan.id_peminjaman);
      }
    });
  }

  kondisiRadios.forEach(radio => {
    radio.addEventListener('change', recalculateDenda);
  });

  if (btnSubmit) {
    btnSubmit.addEventListener('click', handleSubmitPengembalian);
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      showToast('Memperbarui data pengembalian...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  if (btnCloseReceipt) {
    btnCloseReceipt.addEventListener('click', () => {
      const modalReceipt = document.getElementById('modalReceipt');
      const modalContent = document.getElementById('modalReceiptContent');
      hideModal(modalReceipt, modalContent);
    });
  }
}

/**
 * Merender daftar hasil pencarian peminjam yang memiliki buku berstatus 'Dipinjam'
 */
export function renderBorrowerSearchResults(query = '') {
  const dropdown = document.getElementById('dropdownSearchResultsPeminjam');
  if (!dropdown) return;

  const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');
  if (activeLoans.length === 0) {
    dropdown.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        <i class="ph ph-info text-base mb-1 inline-block"></i>
        <p>Tidak ada transaksi buku yang sedang dipinjam saat ini.</p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }

  // Kumpulkan daftar unik peminjam yang sedang memegang buku aktif
  const borrowersMap = new Map();
  activeLoans.forEach(loan => {
    if (!borrowersMap.has(loan.nisn_siswa)) {
      const info = getBorrowerInfo(loan.nisn_siswa);
      borrowersMap.set(loan.nisn_siswa, {
        id: loan.nisn_siswa,
        nama: info.nama,
        badge: info.badge,
        sub: info.sub,
        loans: []
      });
    }
    borrowersMap.get(loan.nisn_siswa).loans.push(loan);
  });

  const q = query.toLowerCase();
  let filtered = Array.from(borrowersMap.values());

  if (q) {
    filtered = filtered.filter(b => {
      const matchName = b.nama.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      const matchSub = (b.sub || '').toLowerCase().includes(q);
      const matchLoan = b.loans.some(l => 
        (l.id_peminjaman && l.id_peminjaman.toLowerCase().includes(q)) ||
        (l.id_buku && l.id_buku.toLowerCase().includes(q))
      );
      return matchName || matchId || matchSub || matchLoan;
    });
  }

  if (filtered.length === 0) {
    dropdown.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        <i class="ph ph-magnifying-glass text-base mb-1 inline-block"></i>
        <p>Tidak ditemukan peminjam aktif dengan kata kunci "<strong>${query}</strong>".</p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }

  let html = '';
  filtered.slice(0, 10).forEach(b => {
    const loanCount = b.loans.length;
    const initial = (b.nama || 'A').charAt(0).toUpperCase();
    const loanIds = b.loans.map(l => l.id_peminjaman).join(', ');

    html += `
      <button type="button" data-borrower-id="${b.id}"
        class="btn-select-borrower w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50/80 transition group">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy font-bold text-xs group-hover:bg-navy group-hover:text-white transition">
            ${initial}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-800 group-hover:text-navy transition">${b.nama}</span>
              <span class="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">${b.badge}</span>
            </div>
            <p class="text-[11px] text-slate-400">${b.sub} &bull; <span class="font-mono">${b.id}</span></p>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            ${loanCount} Buku
          </span>
          <p class="text-[9px] text-slate-400 font-mono mt-0.5">${loanIds}</p>
        </div>
      </button>
    `;
  });

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.btn-select-borrower').forEach(btn => {
    btn.addEventListener('click', () => {
      const borrowerId = btn.getAttribute('data-borrower-id');
      selectBorrowerForReturn(borrowerId);
    });
  });
}

/**
 * Memilih siswa/guru di Meja Pengembalian & menampilkan buku-buku aktif miliknya
 */
export function selectBorrowerForReturn(borrowerId, autoSelectLoanId = null) {
  const borrower = getBorrowerInfo(borrowerId);
  state.selectedReturnBorrower = borrower;

  const cardSelected = document.getElementById('cardSelectedBorrower');
  const sectionDaftarBuku = document.getElementById('sectionDaftarBukuDipinjam');
  const inputSearch = document.getElementById('inputSearchPeminjamPengembalian');
  const btnClearSearch = document.getElementById('btnClearSearchPeminjam');
  const dropdown = document.getElementById('dropdownSearchResultsPeminjam');

  if (dropdown) dropdown.classList.add('hidden');

  if (inputSearch) {
    inputSearch.value = `${borrower.nama} (${borrower.id})`;
  }
  if (btnClearSearch) btnClearSearch.classList.remove('hidden');

  // Isi kartu profil peminjam terpilih
  const avatarEl = document.getElementById('badgeAvatarBorrower');
  const namaEl = document.getElementById('namaBorrowerPengembalian');
  const badgeEl = document.getElementById('badgeTipeBorrowerPengembalian');
  const detailEl = document.getElementById('detailBorrowerPengembalian');

  if (avatarEl) avatarEl.textContent = (borrower.nama || 'A').charAt(0).toUpperCase();
  if (namaEl) namaEl.textContent = borrower.nama;
  if (badgeEl) {
    badgeEl.textContent = borrower.badge;
    badgeEl.className = borrower.badge === 'Guru'
      ? 'rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800'
      : 'rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800';
  }
  if (detailEl) detailEl.innerHTML = `${borrower.sub} &bull; Kontak: ${borrower.kontak}`;

  if (cardSelected) cardSelected.classList.remove('hidden');
  if (sectionDaftarBuku) sectionDaftarBuku.classList.remove('hidden');

  // Ambil transaksi aktif milik peminjam ini
  const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam' && p.nisn_siswa === borrowerId);

  renderActiveLoansCards(activeLoans, autoSelectLoanId);

  // Jika cuma meminjam 1 buku, langsung otomatis pilih buku tersebut!
  if (activeLoans.length === 1) {
    selectLoanForReturn(activeLoans[0]);
    showToast(`Memilih otomatis buku pinjaman [${borrower.nama}]`, 'info');
  } else if (activeLoans.length > 1 && autoSelectLoanId) {
    const targetLoan = activeLoans.find(l => l.id_peminjaman === autoSelectLoanId);
    if (targetLoan) selectLoanForReturn(targetLoan);
  } else if (activeLoans.length === 0) {
    state.selectedPeminjamanForReturn = null;
    updatePreviewPeminjamanBox(null);
    recalculateDenda();
    showToast(`Peminjam ini tidak memiliki buku yang sedang dipinjam.`, 'warning');
  }
}

/**
 * Menampilkan kartu-kartu buku yang sedang dipinjam siswa (1 atau 2 buku)
 */
export function renderActiveLoansCards(loans, selectedLoanId = null) {
  const container = document.getElementById('containerListBukuDipinjam');
  const labelCount = document.getElementById('labelJumlahPinjamanAktif');
  if (!container) return;

  if (labelCount) {
    labelCount.textContent = `${loans.length} buku sedang dipinjam`;
  }

  if (loans.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-check-circle text-2xl text-emerald-500 mb-1 inline-block"></i>
        <p class="font-bold text-slate-700">Semua buku sudah dikembalikan!</p>
        <p class="text-[11px] text-slate-400">Tidak ada tanggungan pinjaman aktif.</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';
  loans.forEach(loan => {
    const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
    const judul = buku ? buku.judul_buku : loan.id_buku;
    const coverUrl = buku && buku.cover_url ? buku.cover_url : null;
    const isSelected = selectedLoanId && loan.id_peminjaman === selectedLoanId;

    const batasDate = new Date(loan.batas_kembali);
    batasDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((today.getTime() - batasDate.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays > 0;

    const statusBadge = isOverdue
      ? `<span class="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
           <i class="ph ph-warning-circle"></i> Terlambat ${diffDays} Hari
         </span>`
      : `<span class="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
           <i class="ph ph-clock"></i> Tepat Waktu
         </span>`;

    const cardBorder = isSelected
      ? 'border-2 border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
      : 'border border-slate-200 bg-white hover:border-navy/40 hover:bg-slate-50/50 shadow-2xs';

    const btnStyle = isSelected
      ? 'bg-emerald-600 text-white font-bold'
      : 'bg-navy text-white hover:bg-navy/90 font-bold';

    const btnText = isSelected
      ? '<i class="ph ph-check-circle text-sm"></i> Terpilih untuk Dikembalikan'
      : '<i class="ph ph-arrow-u-up-left text-sm"></i> Kembalikan Buku Ini';

    html += `
      <div class="rounded-xl ${cardBorder} p-3.5 transition flex flex-col justify-between">
        <div>
          <div class="flex items-start gap-3">
            <div class="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shadow-2xs">
              ${coverUrl 
                ? `<img src="${coverUrl}" alt="Cover" class="h-full w-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'ph ph-book text-slate-400 text-xl\\'></i>';" />`
                : `<i class="ph ph-book text-slate-400 text-xl"></i>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="font-mono text-[10px] font-bold text-navy bg-navy/10 px-1.5 py-0.5 rounded">${loan.id_peminjaman}</span>
                ${statusBadge}
              </div>
              <h5 class="text-xs font-bold text-slate-900 mt-1 line-clamp-2" title="${judul}">${judul}</h5>
              <p class="text-[10px] text-slate-500 mt-0.5">Tempo: <strong>${formatTanggalIndo(loan.batas_kembali)}</strong></p>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100">
          <button type="button" data-loan-id="${loan.id_peminjaman}"
            class="btn-pick-loan-return w-full rounded-lg ${btnStyle} px-3 py-2 text-xs flex items-center justify-center gap-1.5 transition">
            ${btnText}
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-pick-loan-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const loanId = btn.getAttribute('data-loan-id');
      const loan = loans.find(l => l.id_peminjaman === loanId);
      if (loan) selectLoanForReturn(loan);
    });
  });
}

/**
 * Menandai satu peminjaman buku untuk dikembalikan dan menghitung kalkulasi
 */
export function selectLoanForReturn(loan) {
  state.selectedPeminjamanForReturn = loan;

  const selectLegacy = document.getElementById('selectPeminjamanPengembalian');
  if (selectLegacy) selectLegacy.value = loan.id_peminjaman;

  // Re-render kartu buku agar kartu yang dipilih terhighlight
  if (state.selectedReturnBorrower) {
    const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam' && p.nisn_siswa === state.selectedReturnBorrower.id);
    renderActiveLoansCards(activeLoans, loan.id_peminjaman);
  }

  updatePreviewPeminjamanBox(loan);
  recalculateDenda();
}

/**
 * Mengosongkan pilihan di Meja Pengembalian
 */
export function resetPengembalianSelection() {
  state.selectedReturnBorrower = null;
  state.selectedPeminjamanForReturn = null;

  const inputSearch = document.getElementById('inputSearchPeminjamPengembalian');
  const btnClearSearch = document.getElementById('btnClearSearchPeminjam');
  const cardSelected = document.getElementById('cardSelectedBorrower');
  const sectionDaftarBuku = document.getElementById('sectionDaftarBukuDipinjam');
  const previewBox = document.getElementById('previewPeminjamanBox');
  const dropdown = document.getElementById('dropdownSearchResultsPeminjam');
  const selectLegacy = document.getElementById('selectPeminjamanPengembalian');

  if (inputSearch) inputSearch.value = '';
  if (btnClearSearch) btnClearSearch.classList.add('hidden');
  if (cardSelected) cardSelected.classList.add('hidden');
  if (sectionDaftarBuku) sectionDaftarBuku.classList.add('hidden');
  if (previewBox) previewBox.classList.add('hidden');
  if (dropdown) dropdown.classList.add('hidden');
  if (selectLegacy) selectLegacy.value = '';

  recalculateDenda();
}

/**
 * Filter meja pengembalian berdasarkan barcode buku fisik yang di-scan
 */
export function filterPengembalianByBook(idBuku) {
  const matchingLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam' && p.id_buku === idBuku);
  const dropdown = document.getElementById('dropdownSearchResultsPeminjam');
  if (!dropdown) return;

  if (matchingLoans.length === 0) {
    showToast(`Buku ${idBuku} tidak sedang dipinjam siapapun saat ini.`, 'warning');
    return;
  }

  let html = `
    <div class="px-2 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700">
      Pilih Peminjam Buku (${idBuku}):
    </div>
  `;

  matchingLoans.forEach(loan => {
    const borrower = getBorrowerInfo(loan.nisn_siswa);
    html += `
      <button type="button" data-borrower-id="${loan.nisn_siswa}" data-loan-id="${loan.id_peminjaman}"
        class="btn-select-borrower-book w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50 transition">
        <div>
          <p class="text-xs font-bold text-slate-800">${borrower.nama} (${borrower.badge})</p>
          <p class="text-[10px] text-slate-500 font-mono">${loan.nisn_siswa} &bull; ${loan.id_peminjaman}</p>
        </div>
        <span class="rounded bg-navy text-white px-2 py-1 text-[10px] font-bold">Pilih Siswa Ini</span>
      </button>
    `;
  });

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.btn-select-borrower-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const borrowerId = btn.getAttribute('data-borrower-id');
      const loanId = btn.getAttribute('data-loan-id');
      selectBorrowerForReturn(borrowerId, loanId);
    });
  });
}

/**
 * Sinkronisasi data saat cache diperbarui
 */
export function renderPengembalianFormOptions() {
  const select = document.getElementById('selectPeminjamanPengembalian');
  if (select) {
    const activeLoans = state.cache.peminjaman.filter(p => p.status === 'Dipinjam');
    let optionsHtml = '<option value="">-- Pilih Buku yang Sedang Dipinjam --</option>';
    activeLoans.forEach(loan => {
      const borrower = getBorrowerInfo(loan.nisn_siswa);
      const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
      const namaSiswa = `${borrower.nama} [${borrower.badge}]`;
      const judulBuku = buku ? buku.judul_buku : loan.id_buku;

      optionsHtml += `
        <option value="${loan.id_peminjaman}">
          ${loan.id_peminjaman} &bull; ${namaSiswa} ("${judulBuku}") &bull; Tempo: ${formatTanggalIndo(loan.batas_kembali)}
        </option>
      `;
    });
    select.innerHTML = optionsHtml;
  }

  // Jika sedang ada peminjam yang dipilih, perbarui daftar bukunya
  if (state.selectedReturnBorrower) {
    const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam' && p.nisn_siswa === state.selectedReturnBorrower.id);
    if (activeLoans.length > 0) {
      renderActiveLoansCards(activeLoans, state.selectedPeminjamanForReturn ? state.selectedPeminjamanForReturn.id_peminjaman : null);
    } else {
      resetPengembalianSelection();
    }
  }
}

// Ekspos fungsi ke window agar dapat dipanggil dari scanner.js
if (typeof window !== 'undefined') {
  window.selectBorrowerForReturn = selectBorrowerForReturn;
  window.selectLoanForReturn = selectLoanForReturn;
  window.resetPengembalianSelection = resetPengembalianSelection;
  window.filterPengembalianByBook = filterPengembalianByBook;
}

/**
 * Menampilkan kartu informasi peminjaman aktif yang dipilih
 */
export function updatePreviewPeminjamanBox(loan) {
  const previewBox = document.getElementById('previewPeminjamanBox');
  if (!previewBox) return;

  if (!loan) {
    previewBox.classList.add('hidden');
    return;
  }

  const borrower = getBorrowerInfo(loan.nisn_siswa);
  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);

  const prevNisnPeminjam = document.getElementById('prevNisnPeminjam');
  const prevNamaPeminjam = document.getElementById('prevNamaPeminjam');
  const prevKelasPeminjam = document.getElementById('prevKelasPeminjam');
  const prevIdPeminjamanBadge = document.getElementById('prevIdPeminjamanBadge');
  const prevJudulBuku = document.getElementById('prevJudulBuku');
  const prevHargaBuku = document.getElementById('prevHargaBuku');
  const prevTanggalPinjam = document.getElementById('prevTanggalPinjam');
  const prevBatasKembali = document.getElementById('prevBatasKembali');

  if (prevNisnPeminjam) prevNisnPeminjam.textContent = loan.nisn_siswa;
  if (prevNamaPeminjam) prevNamaPeminjam.textContent = `${borrower.nama} (${borrower.badge})`;
  if (prevKelasPeminjam) prevKelasPeminjam.innerHTML = `${borrower.sub} &bull; Kontak: ${borrower.kontak}`;
  if (prevIdPeminjamanBadge) prevIdPeminjamanBadge.textContent = loan.id_peminjaman;
  if (prevJudulBuku) prevJudulBuku.textContent = buku ? buku.judul_buku : loan.id_buku;
  if (prevHargaBuku) prevHargaBuku.textContent = formatRupiah(buku ? buku.harga_buku : 50000);
  if (prevTanggalPinjam) prevTanggalPinjam.textContent = formatTanggalIndo(loan.tanggal_pinjam);
  if (prevBatasKembali) prevBatasKembali.textContent = formatTanggalIndo(loan.batas_kembali);

  previewBox.classList.remove('hidden');
}

/**
 * Mesin kalkulator denda otomatis keterlambatan dan kerusakan fisik
 */
export function recalculateDenda() {
  const loan = state.selectedPeminjamanForReturn;
  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const displayHariTerlambat = document.getElementById('displayHariTerlambat');
  const badgeStatusTerlambat = document.getElementById('badgeStatusTerlambat');
  const calcHariTerlambat = document.getElementById('calcHariTerlambat');
  const calcDendaTerlambat = document.getElementById('calcDendaTerlambat');
  const calcLabelKondisi = document.getElementById('calcLabelKondisi');
  const calcDendaKondisi = document.getElementById('calcDendaKondisi');
  const calcTotalDenda = document.getElementById('calcTotalDenda');
  const sectionStatusDenda = document.getElementById('sectionStatusDenda');

  if (!loan) {
    if (btnSubmit) btnSubmit.disabled = true;
    if (displayHariTerlambat) displayHariTerlambat.textContent = '0 Hari';
    if (calcHariTerlambat) calcHariTerlambat.textContent = '0';
    if (calcDendaTerlambat) calcDendaTerlambat.textContent = 'Rp 0';
    if (calcLabelKondisi) calcLabelKondisi.textContent = 'Baik';
    if (calcDendaKondisi) calcDendaKondisi.textContent = 'Rp 0';
    if (calcTotalDenda) calcTotalDenda.textContent = 'Rp 0';
    if (sectionStatusDenda) sectionStatusDenda.classList.add('hidden');
    return;
  }

  if (btnSubmit) btnSubmit.disabled = false;

  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const tglKembaliStr = inputTglKembali ? inputTglKembali.value : getTodayDateString();

  const dKembali = new Date(tglKembaliStr);
  const dBatas = new Date(loan.batas_kembali);

  const dKembaliMidnight = new Date(dKembali.getFullYear(), dKembali.getMonth(), dKembali.getDate());
  const dBatasMidnight = new Date(dBatas.getFullYear(), dBatas.getMonth(), dBatas.getDate());

  const diffTime = dKembaliMidnight.getTime() - dBatasMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;
  const dendaTerlambat = hariTerlambat * 1000;

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') {
    dendaKondisi = 0.5 * hargaBuku;
  } else if (kondisi === 'Hilang') {
    dendaKondisi = 1.0 * hargaBuku;
  }

  const totalDenda = dendaTerlambat + dendaKondisi;

  if (displayHariTerlambat) displayHariTerlambat.textContent = `${hariTerlambat} Hari`;
  if (badgeStatusTerlambat) {
    if (hariTerlambat > 0) {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700';
      badgeStatusTerlambat.textContent = 'Terlambat';
    } else {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
      badgeStatusTerlambat.textContent = 'Tepat Waktu';
    }
  }

  if (calcHariTerlambat) calcHariTerlambat.textContent = hariTerlambat;
  if (calcDendaTerlambat) calcDendaTerlambat.textContent = formatRupiah(dendaTerlambat);
  if (calcLabelKondisi) calcLabelKondisi.textContent = kondisi;
  if (calcDendaKondisi) calcDendaKondisi.textContent = formatRupiah(dendaKondisi);

  if (calcTotalDenda) {
    calcTotalDenda.textContent = formatRupiah(totalDenda);
    if (totalDenda > 0) {
      calcTotalDenda.className = 'text-xl font-extrabold text-rose-600';
    } else {
      calcTotalDenda.className = 'text-xl font-extrabold text-emerald-600';
    }
  }

  if (sectionStatusDenda) {
    if (totalDenda > 0) {
      sectionStatusDenda.classList.remove('hidden');
    } else {
      sectionStatusDenda.classList.add('hidden');
    }
  }
}

/**
 * Menyimpan pengembalian buku dan mengupdate stok serta status denda
 */
export async function handleSubmitPengembalian() {
  const loan = state.selectedPeminjamanForReturn;
  if (!loan) {
    showToast('Pilih transaksi peminjaman terlebih dahulu.', 'warning');
    return;
  }

  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const tglKembali = inputTglKembali ? inputTglKembali.value : getTodayDateString();

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const dKembali = new Date(tglKembali);
  const dBatas = new Date(loan.batas_kembali);
  const diffDays = Math.ceil((dKembali.getTime() - dBatas.getTime()) / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;
  const dendaTerlambat = hariTerlambat * 1000;

  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') dendaKondisi = 0.5 * hargaBuku;
  if (kondisi === 'Hilang') dendaKondisi = 1.0 * hargaBuku;

  const totalDenda = dendaTerlambat + dendaKondisi;

  let statusDenda = 'Tidak Ada';
  if (totalDenda > 0) {
    const radioStatusDenda = document.querySelector('input[name="statusDenda"]:checked');
    statusDenda = radioStatusDenda ? radioStatusDenda.value : 'Lunas';
  }

  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnText = document.getElementById('btnSubmitPengembalianText');

  try {
    if (btnSubmit) btnSubmit.disabled = true;
    if (btnText) btnText.textContent = 'Menyimpan Pengembalian...';

    const newIdPengembalian = generateRandomId('KB', 6);

    const { error: errReturn } = await db
      .from('data_pengembalian')
      .insert({
        id_pengembalian: newIdPengembalian,
        id_peminjaman: loan.id_peminjaman,
        tanggal_kembali: tglKembali,
        keterlambatan: hariTerlambat,
        kondisi_buku: kondisi,
        denda: totalDenda,
        status_denda: statusDenda
      });
    if (errReturn) throw errReturn;

    const { error: errLoan } = await db
      .from('data_peminjaman')
      .update({ status: 'Selesai' })
      .eq('id_peminjaman', loan.id_peminjaman);
    if (errLoan) throw errLoan;

    const stokSekarang = buku ? (Number(buku.stok) || 0) : 0;
    const stokBaru = stokSekarang + 1;

    const { error: errBook } = await db
      .from('data_buku')
      .update({
        stok: stokBaru,
        status: 'Tersedia'
      })
      .eq('id_buku', loan.id_buku);
    if (errBook) throw errBook;

    showToast('Buku berhasil dikembalikan dan stok diperbarui!', 'success');

    const borrower = getBorrowerInfo(loan.nisn_siswa);
    showReceiptModal({
      id: newIdPengembalian,
      siswa: `${borrower.nama} (${borrower.badge})`,
      buku: buku ? buku.judul_buku : loan.id_buku,
      kondisi: kondisi,
      overdue: `${hariTerlambat} Hari`,
      fine: formatRupiah(totalDenda),
      fineStatus: statusDenda
    });

    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal memproses pengembalian:', err);
    showToast('Gagal memproses pengembalian: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Selesaikan Pengembalian Buku';
  }
}

/**
 * Menampilkan modal pop-up tanda terima pengembalian buku
 */
export function showReceiptModal(data) {
  const modalReceipt = document.getElementById('modalReceipt');
  const modalContent = document.getElementById('modalReceiptContent');
  if (!modalReceipt) return;

  const receiptId = document.getElementById('receiptId');
  const receiptStudent = document.getElementById('receiptStudent');
  const receiptBook = document.getElementById('receiptBook');
  const receiptCondition = document.getElementById('receiptCondition');
  const receiptOverdue = document.getElementById('receiptOverdue');
  const receiptFine = document.getElementById('receiptFine');
  const receiptFineStatus = document.getElementById('receiptFineStatus');

  if (receiptId) receiptId.textContent = data.id;
  if (receiptStudent) receiptStudent.textContent = data.siswa;
  if (receiptBook) receiptBook.textContent = data.buku;
  if (receiptCondition) receiptCondition.textContent = data.kondisi;
  if (receiptOverdue) receiptOverdue.textContent = data.overdue;
  if (receiptFine) receiptFine.textContent = data.fine;
  if (receiptFineStatus) receiptFineStatus.textContent = data.fineStatus;

  showModal(modalReceipt, modalContent);
}

/**
 * Menampilkan riwayat pengembalian dan tunggakan denda pada Meja 3
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

  // Render kedua list
  renderTunggakanDendaList();
  renderSemuaRiwayatList();
}

/**
 * Merender daftar khusus tunggakan denda (status 'Belum Lunas')
 */
export function renderTunggakanDendaList() {
  const container = document.getElementById('listTunggakanDenda');
  if (!container) return;

  const list = state.cache.pengembalian || [];
  let unpaid = list.filter(item => item.status_denda === 'Belum Lunas');

  if (fineSubtabState.searchTunggakan) {
    const q = fineSubtabState.searchTunggakan;
    unpaid = unpaid.filter(item => {
      const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;
      return (
        borrower.nama.toLowerCase().includes(q) ||
        borrower.id.toLowerCase().includes(q) ||
        (item.id_pengembalian && item.id_pengembalian.toLowerCase().includes(q)) ||
        (buku && buku.judul_buku.toLowerCase().includes(q))
      );
    });
  }

  if (unpaid.length === 0) {
    const isSearching = fineSubtabState.searchTunggakan.length > 0;
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-check-circle text-3xl text-emerald-500 inline-block mb-1"></i>
        <h5 class="text-xs font-bold text-slate-700">${isSearching ? 'Tidak ada data tunggakan yang cocok' : 'Tidak Ada Tunggakan Denda!'}</h5>
        <p class="text-[11px] text-slate-400 mt-0.5">${isSearching ? 'Coba cari nama siswa atau kata kunci lain.' : 'Seluruh siswa telah melunasi denda perpustakaan.'}</p>
      </div>
    `;
    return;
  }

  let html = '';
  unpaid.forEach(item => {
    const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? borrower.nama : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');
    const initial = (namaSiswa || 'S').charAt(0).toUpperCase();

    // Rincian alasan pelanggaran
    const alasan = [];
    if (item.keterlambatan > 0) alasan.push(`Terlambat ${item.keterlambatan} Hari`);
    if (item.kondisi_buku && item.kondisi_buku !== 'Baik') alasan.push(`Kondisi: ${item.kondisi_buku}`);
    const alasanStr = alasan.length > 0 ? alasan.join(' &bull; ') : 'Denda Keterlambatan';

    html += `
      <div class="rounded-xl border border-rose-200 bg-white p-3 hover:shadow-xs transition space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-extrabold text-xs">
              ${initial}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h5 class="text-xs font-extrabold text-slate-900 truncate" title="${namaSiswa}">${namaSiswa}</h5>
                <span class="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">${borrower.badge}</span>
              </div>
              <p class="text-[11px] text-slate-500 truncate mt-0.5">${borrower.sub} &bull; <span class="font-mono">${borrower.id}</span></p>
            </div>
          </div>
          <span class="font-mono text-[10px] text-slate-400 font-bold shrink-0">${item.id_pengembalian}</span>
        </div>

        <div class="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1 border border-slate-100">
          <p class="text-slate-700 font-medium line-clamp-1">Buku: <strong class="text-slate-900">"${judulBuku}"</strong></p>
          <div class="flex items-center justify-between text-slate-500">
            <span>Pelanggaran: <span class="text-rose-700 font-semibold">${alasanStr}</span></span>
            <span>Tgl: ${formatTanggalIndo(item.tanggal_kembali)}</span>
          </div>
        </div>

        <div class="pt-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">Tunggakan Kasir:</span>
            <span class="text-sm font-black text-rose-600">${formatRupiah(item.denda)}</span>
          </div>
          <button type="button" data-id="${item.id_pengembalian}"
            class="btn-trigger-lunasi inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs">
            <i class="ph ph-hand-coins text-sm"></i>
            <span>Lunasi Denda</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-trigger-lunasi').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });
}

/**
 * Merender daftar semua riwayat pengembalian (Arsip / Log)
 */
export function renderSemuaRiwayatList() {
  const container = document.getElementById('listRiwayatPengembalian');
  if (!container) return;

  const list = state.cache.pengembalian || [];
  let filtered = [...list];

  // Filter status pills
  if (fineSubtabState.filterRiwayatStatus === 'lunas') {
    filtered = filtered.filter(item => item.status_denda === 'Lunas');
  } else if (fineSubtabState.filterRiwayatStatus === 'tanpa-denda') {
    filtered = filtered.filter(item => item.status_denda === 'Tidak Ada');
  }

  // Filter search
  if (fineSubtabState.searchRiwayat) {
    const q = fineSubtabState.searchRiwayat;
    filtered = filtered.filter(item => {
      const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;
      return (
        borrower.nama.toLowerCase().includes(q) ||
        borrower.id.toLowerCase().includes(q) ||
        (item.id_pengembalian && item.id_pengembalian.toLowerCase().includes(q)) ||
        (buku && buku.judul_buku.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-receipt text-3xl inline-block mb-1 text-slate-300"></i>
        <p class="text-xs font-semibold text-slate-600">Tidak ada riwayat pengembalian yang cocok.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.slice(0, 30).forEach(item => {
    const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? `${borrower.nama} (${borrower.badge})` : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

    let badgeDenda = '';
    if (item.status_denda === 'Belum Lunas') {
      badgeDenda = `
        <div class="flex items-center gap-1.5">
          <span class="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            Belum Lunas (${formatRupiah(item.denda)})
          </span>
          <button type="button" data-id="${item.id_pengembalian}"
            class="btn-trigger-lunasi-from-history text-[10px] font-bold text-navy hover:underline">
            Lunasi
          </button>
        </div>
      `;
    } else if (item.status_denda === 'Lunas') {
      badgeDenda = `
        <div class="flex items-center gap-1.5">
          <span class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Lunas (${formatRupiah(item.denda)})
          </span>
          <button type="button" data-id="${item.id_pengembalian}"
            class="btn-rollback-lunas text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline" title="Batalkan status lunas jika salah catat">
            Batal Lunas
          </button>
        </div>
      `;
    } else {
      badgeDenda = `
        <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          Tanpa Denda
        </span>
      `;
    }

    html += `
      <div class="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-xs transition">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-bold text-slate-800 text-xs">${namaSiswa}</p>
            <p class="text-[11px] text-slate-600 line-clamp-1">"${judulBuku}"</p>
          </div>
          <span class="font-mono text-[10px] text-slate-400 font-bold">${item.id_pengembalian}</span>
        </div>

        <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span class="text-slate-500">Tgl: ${formatTanggalIndo(item.tanggal_kembali)} &bull; Fisik: <strong>${item.kondisi_buku}</strong></span>
          <div>${badgeDenda}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-trigger-lunasi-from-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });

  container.querySelectorAll('.btn-rollback-lunas').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idPengembalian = btn.getAttribute('data-id');
      await handleBatalkanLunasDenda(idPengembalian);
    });
  });
}

/**
 * Membuka Modal Konfirmasi Pelunasan Denda Tunai
 */
export function openModalKonfirmasiLunasiDenda(item) {
  fineSubtabState.targetPaymentItem = item;

  const modal = document.getElementById('modalKonfirmasiLunasiDenda');
  const content = document.getElementById('modalKonfirmasiLunasiDendaContent');
  if (!modal) return;

  const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
  const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
  const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;

  const elId = document.getElementById('lunasiIdPengembalian');
  const elNama = document.getElementById('lunasiNamaPeminjam');
  const elBuku = document.getElementById('lunasiJudulBuku');
  const elRincian = document.getElementById('lunasiRincianDenda');
  const elNominal = document.getElementById('lunasiNominalDenda');
  const elCheckRupiah = document.getElementById('lunasiCheckRupiah');
  const check = document.getElementById('checkUangDiterima');
  const btnSubmit = document.getElementById('btnEksekusiLunasiModal');

  if (elId) elId.textContent = item.id_pengembalian;
  if (elNama) elNama.textContent = `${borrower.nama} (${borrower.badge}) - ${borrower.id}`;
  if (elBuku) elBuku.textContent = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

  const alasan = [];
  if (item.keterlambatan > 0) alasan.push(`Terlambat ${item.keterlambatan} Hari`);
  if (item.kondisi_buku && item.kondisi_buku !== 'Baik') alasan.push(`Kondisi: ${item.kondisi_buku}`);
  if (elRincian) elRincian.textContent = alasan.length > 0 ? alasan.join(', ') : 'Denda Keterlambatan';

  const rupiahFormatted = formatRupiah(item.denda);
  if (elNominal) elNominal.textContent = rupiahFormatted;
  if (elCheckRupiah) elCheckRupiah.textContent = rupiahFormatted;

  if (check) check.checked = false;
  if (btnSubmit) btnSubmit.disabled = true;

  showModal(modal, content);
}

/**
 * Eksekusi resmi pelunasan denda ke database Supabase setelah uang diterima
 */
export async function executePelunasanDenda(idPengembalian) {
  const modal = document.getElementById('modalKonfirmasiLunasiDenda');
  const content = document.getElementById('modalKonfirmasiLunasiDendaContent');
  const btnSubmit = document.getElementById('btnEksekusiLunasiModal');

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Memproses...';
    }

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Lunas' })
      .eq('id_pengembalian', idPengembalian);
    if (error) throw error;

    hideModal(modal, content);
    fineSubtabState.targetPaymentItem = null;
    showToast(`Denda [${idPengembalian}] berhasil ditandai LUNAS! Uang kas telah dicatat.`, 'success');

    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal melunasi denda:', err);
    showToast('Gagal memproses pelunasan: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="ph ph-check-circle text-base"></i> <span>Ya, Tandai Lunas</span>';
    }
  }
}

/**
 * Safety Net: Mengembalikan status denda dari 'Lunas' ke 'Belum Lunas' jika ada salah klik
 */
export async function handleBatalkanLunasDenda(idPengembalian) {
  const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
  const nominal = item ? formatRupiah(item.denda) : '';

  if (!confirm(`Batalkan status Lunas untuk bukti [${idPengembalian}] (${nominal})?\n\nStatus akan dikembalikan menjadi 'Belum Lunas' dan muncul kembali di daftar tunggakan kasir.`)) {
    return;
  }

  try {
    showToast('Mengembalikan status ke Belum Lunas...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Belum Lunas' })
      .eq('id_pengembalian', idPengembalian);
    if (error) throw error;

    showToast(`Status denda [${idPengembalian}] dikembalikan menjadi Belum Lunas.`, 'info');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal mengembalikan status denda:', err);
    showToast('Gagal mengubah status: ' + (err.message || 'Error Supabase'), 'error');
  }
}
