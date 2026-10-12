/**
 * CAKRAWALA Digital Library - Modul Seleksi Peminjam & Kartu Pinjaman Aktif
 * Path: public/petugas/modules/3-pengembalian/seleksiPeminjam.js
 * 
 * FUNGSI:
 * - Pencarian cepat peminjam yang sedang memegang buku aktif (dropdown)
 * - Pemilihan kartu profil peminjam & kartu buku yang akan dikembalikan
 * - Lookup pengembalian berbasis barcode buku fisik (scan kamera)
 * - Sinkronisasi preview buku dan opsi pengembalian legacy
 */

import { state } from '../core/state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  showToast,
  getBorrowerInfo
} from '../core/petugasHelper.js';
import { recalculateDenda } from './kalkulatorDenda.js';

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
 * Filter pencarian instan nama peminjam
 */
export function filterPengembalianByName(nameQuery = '') {
  const inputSearch = document.getElementById('inputSearchPeminjamPengembalian');
  if (inputSearch) inputSearch.value = nameQuery;
  renderBorrowerSearchResults(nameQuery);
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
    const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');
    let optionsHtml = '<option value="">-- Pilih Buku yang Sedang Dipinjam --</option>';
    activeLoans.forEach(loan => {
      const borrower = getBorrowerInfo(loan.nisn_siswa);
      const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
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
  const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);

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

// Window Bindings Global
if (typeof window !== 'undefined') {
  window.selectBorrowerForReturn = selectBorrowerForReturn;
  window.selectLoanForReturn = selectLoanForReturn;
  window.resetPengembalianSelection = resetPengembalianSelection;
  window.filterPengembalianByBook = filterPengembalianByBook;
  window.filterPengembalianByName = filterPengembalianByName;
  window.renderPengembalianFormOptions = renderPengembalianFormOptions;
}
