/**
 * CAKRAWALA Digital Library - Modul Meja Sirkulasi: Antrean Pra-Pinjam & Verifikasi Tiket
 * File: public/petugas/modules/2-sirkulasi/prapinjam.js
 * 
 * FUNGSI:
 * - Menampilkan daftar antrean reservasi daring siswa & guru (Status 'Menunggu')
 * - Filter pills kesiapan buku di meja ("Semua", "Perlu Diambil", "Siap di Meja")
 * - Mengubah status persiapan buku ('Belum Diambil' <-> 'Siap Diambil')
 * - Memverifikasi kesesuaian tiket booking QR Code 2D sebelum penyerahan buku fisik
 * - Menyetujui (Approve) atau membatalkan (Reject) reservasi pra-pinjam
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import {
  formatTanggalIndo,
  getTodayDateString,
  addDaysToDate,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../core/petugasHelper.js';

let filterPersiapanPrapinjam = 'semua'; // 'semua' | 'belum' | 'siap'
let currentVerifyingLoan = null;
let isCurrentLoanVerified = false;

/**
 * Filter kesiapan buku yang sedang aktif
 */
export function getFilterPersiapanPrapinjam() {
  return filterPersiapanPrapinjam;
}

export function setFilterPersiapanPrapinjam(val) {
  filterPersiapanPrapinjam = val;
}

/**
 * Setup event listeners filter antrean prapinjam (pencarian & pills)
 */
export function setupPrapinjamFilters() {
  const searchPrapinjam = document.getElementById('inputSearchPrapinjam');
  if (searchPrapinjam) {
    searchPrapinjam.addEventListener('input', e => {
      state.searchPrapinjamQuery = e.target.value.trim().toLowerCase();
      renderPrapinjamOnlyTable();
    });
  }

  const btnFilterSemua = document.getElementById('btnFilterPrapinjamSemua');
  const btnFilterBelum = document.getElementById('btnFilterPrapinjamBelum');
  const btnFilterSiap = document.getElementById('btnFilterPrapinjamSiap');

  function updateFilterPillsPrapinjam() {
    const pills = [
      { el: btnFilterSemua, key: 'semua' },
      { el: btnFilterBelum, key: 'belum' },
      { el: btnFilterSiap, key: 'siap' }
    ];
    pills.forEach(({ el, key }) => {
      if (!el) return;
      if (key === filterPersiapanPrapinjam) {
        el.className = 'pill-filter-prapinjam px-3 py-1.5 rounded-lg bg-white text-navy shadow-xs font-bold transition flex items-center gap-1';
      } else {
        el.className = 'pill-filter-prapinjam px-3 py-1.5 rounded-lg text-slate-600 hover:text-navy transition flex items-center gap-1';
      }
    });
  }

  if (btnFilterSemua) btnFilterSemua.addEventListener('click', () => { filterPersiapanPrapinjam = 'semua'; updateFilterPillsPrapinjam(); renderPrapinjamOnlyTable(); });
  if (btnFilterBelum) btnFilterBelum.addEventListener('click', () => { filterPersiapanPrapinjam = 'belum'; updateFilterPillsPrapinjam(); renderPrapinjamOnlyTable(); });
  if (btnFilterSiap) btnFilterSiap.addEventListener('click', () => { filterPersiapanPrapinjam = 'siap'; updateFilterPillsPrapinjam(); renderPrapinjamOnlyTable(); });
}

/**
 * Merender antrean pra-pinjam online (status 'Menunggu')
 */
export function renderPrapinjamOnlyTable() {
  const tbody = document.getElementById('tablePrapinjamOnlyBody');
  const badgeSubtab = document.getElementById('badgeSubtabPrapinjam');
  const countDisplay = document.getElementById('countPrapinjamDisplay');
  const badgePendingApprovals = document.getElementById('badgePendingApprovalsCount');
  if (!tbody) return;

  const rawPendingList = (state.cache.peminjaman || []).filter(p => p.status === 'Menunggu');

  // Update badge jumlah total prapinjam
  if (badgeSubtab) badgeSubtab.textContent = rawPendingList.length;
  if (countDisplay) countDisplay.textContent = `${rawPendingList.length} Antrean`;
  if (badgePendingApprovals) badgePendingApprovals.textContent = rawPendingList.length;

  // Hitung jumlah masing-masing status persiapan untuk pills
  const countBelum = rawPendingList.filter(p => (p.status_persiapan || 'Belum Diambil') === 'Belum Diambil').length;
  const countSiap = rawPendingList.filter(p => p.status_persiapan === 'Siap Diambil').length;

  const countPillSemua = document.getElementById('countFilterPrapinjamSemua');
  const countPillBelum = document.getElementById('countFilterPrapinjamBelum');
  const countPillSiap = document.getElementById('countFilterPrapinjamSiap');

  if (countPillSemua) countPillSemua.textContent = rawPendingList.length;
  if (countPillBelum) countPillBelum.textContent = countBelum;
  if (countPillSiap) countPillSiap.textContent = countSiap;

  let pendingList = [...rawPendingList];

  // Filter Pills Persiapan
  if (filterPersiapanPrapinjam === 'belum') {
    pendingList = pendingList.filter(p => (p.status_persiapan || 'Belum Diambil') === 'Belum Diambil');
  } else if (filterPersiapanPrapinjam === 'siap') {
    pendingList = pendingList.filter(p => p.status_persiapan === 'Siap Diambil');
  }

  // Filter Pencarian Search Query
  if (state.searchPrapinjamQuery) {
    const q = state.searchPrapinjamQuery;
    pendingList = pendingList.filter(p => {
      const borrower = getBorrowerInfo(p.nisn_siswa);
      const buku = (state.cache.buku || []).find(b => b.id_buku === p.id_buku);

      const matchId = (p.id_peminjaman || '').toLowerCase().includes(q);
      const matchNisn = (p.nisn_siswa || '').toLowerCase().includes(q);
      const matchNama = (borrower.nama || '').toLowerCase().includes(q);
      const matchJudul = buku && (buku.judul_buku || '').toLowerCase().includes(q);

      return matchId || matchNisn || matchNama || matchJudul;
    });
  }

  if (pendingList.length === 0) {
    const emptyMsg = filterPersiapanPrapinjam === 'belum'
      ? 'Semua buku reservasi telah disiapkan di meja sirkulasi.'
      : (filterPersiapanPrapinjam === 'siap'
        ? 'Belum ada buku yang ditandai siap di meja sirkulasi.'
        : 'Tidak ada antrean prapinjam yang menunggu.');

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-check-circle text-3xl text-emerald-500 inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-700">${emptyMsg}</p>
          <p class="text-[11px] text-slate-400">Daftar buku reservasi akan muncul di sini saat ada pesanan online baru.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  pendingList.forEach(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);

    const namaSiswa = borrower.nama;
    const kelasSiswa = borrower.sub;
    const kontakSiswa = borrower.kontak;
    const judulBuku = buku ? buku.judul_buku : item.id_buku;
    const penulisBuku = buku ? buku.penulis : '-';
    const rakBuku = buku ? (buku.keterangan || 'Rak Umum') : '-';
    const sisaStok = buku ? buku.stok : 0;
    const coverUrl = buku && buku.cover_url ? buku.cover_url : null;
    const isReady = item.status_persiapan === 'Siap Diambil';

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition ${isReady ? 'bg-emerald-50/20' : ''}">
        <td class="px-5 py-3 font-mono font-bold text-navy text-xs">
          ${item.id_peminjaman}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-800 text-xs">${namaSiswa}</span>
            <span class="rounded-full ${borrower.type === 'guru' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-navy'} px-1.5 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
          </div>
          <p class="text-[11px] text-slate-500">${kelasSiswa}</p>
          <p class="text-[10px] text-slate-400">Kontak: ${kontakSiswa}</p>
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-11 w-8 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-800 text-xs line-clamp-1">${judulBuku}</p>
              <p class="text-[11px] text-slate-500">${penulisBuku} &bull; <span class="text-navy font-bold">Rak: ${rakBuku}</span></p>
              <p class="text-[10px] text-slate-400">Stok Inventaris: <strong class="text-slate-700">${sisaStok}</strong></p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-xs">
          <p class="text-slate-600">Booking: ${formatTanggalIndo(item.tanggal_pinjam)}</p>
          <p class="text-[11px] font-bold text-amber-700">Tempo: ${formatTanggalIndo(item.batas_kembali)}</p>
        </td>
        <td class="px-5 py-3">
          ${isReady ? `
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
              <span class="h-2 w-2 rounded-full bg-emerald-600"></span>
              <span>Siap di Meja</span>
            </span>
            <span class="block text-[10px] text-emerald-600 font-semibold mt-0.5">Buku siap diserahkan</span>
          ` : `
            <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Perlu Diambil</span>
            </span>
            <span class="block text-[10px] text-slate-500 mt-0.5">Ambil di: <strong class="text-navy">${rakBuku}</strong></span>
          `}
        </td>
        <td class="px-5 py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" data-action="toggle-ready" data-id="${item.id_peminjaman}"
              title="${isReady ? 'Klik untuk membatalkan status siap di meja' : 'Tandai buku sudah diambil dari rak dan ditaruh di meja sirkulasi'}"
              class="btn-toggle-ready inline-flex items-center gap-1 rounded-xl ${isReady ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'} px-2.5 py-2 text-xs font-bold transition shadow-2xs">
              <i class="ph ${isReady ? 'ph-check-circle-fill text-emerald-600 text-base' : 'ph-package text-base'}"></i>
              <span>${isReady ? 'Siap' : 'Siapkan'}</span>
            </button>
            <button type="button" data-action="reject-loan" data-id="${item.id_peminjaman}"
              title="Batalkan booking (siswa tidak kunjung datang)"
              class="btn-reject-loan inline-flex items-center justify-center h-8 w-8 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
              <i class="ph ph-trash text-base"></i>
            </button>
            <button type="button" data-action="verify-loan" data-id="${item.id_peminjaman}"
              title="Pindai barcode / verifikasi tiket siswa sebelum serah terima"
              class="btn-verify-loan inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-light transition shadow-sm">
              <i class="ph ph-qr-code text-base"></i>
              <span>Verifikasi Tiket</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  // Pasang listener pada tombol toggle kesiapan buku
  tbody.querySelectorAll('.btn-toggle-ready').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === id);
      if (!item) return;
      const target = item.status_persiapan === 'Siap Diambil' ? 'Belum Diambil' : 'Siap Diambil';
      await togglePersiapanBuku(id, target);
    });
  });

  tbody.querySelectorAll('.btn-reject-loan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRejectPrapinjam(id);
    });
  });

  tbody.querySelectorAll('.btn-verify-loan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === id);
      if (item) openPrapinjamVerifyModal(item, false);
    });
  });
}

/**
 * Mengubah status kesiapan pengambilan buku fisik ('Belum Diambil' <-> 'Siap Diambil')
 */
export async function togglePersiapanBuku(idPeminjaman, targetStatus) {
  try {
    const { error } = await db
      .from('data_peminjaman')
      .update({ status_persiapan: targetStatus })
      .eq('id_peminjaman', idPeminjaman);

    if (error) throw error;

    // Update di state lokal agar antarmuka responsif seketika
    const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === idPeminjaman);
    if (item) item.status_persiapan = targetStatus;

    if (targetStatus === 'Siap Diambil') {
      showToast(`Buku untuk tiket [${idPeminjaman}] ditandai Siap di Meja Sirkulasi!`, 'success');
    } else {
      showToast(`Status buku [${idPeminjaman}] dikembalikan menjadi Perlu Diambil dari rak.`, 'info');
    }

    renderPrapinjamOnlyTable();
  } catch (err) {
    console.error('Gagal memperbarui status persiapan:', err);
    showToast('Gagal mengubah status buku: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Setup modal verifikasi tiket barcode prapinjam
 */
export function setupPrapinjamVerifyModal() {
  const modal = document.getElementById('modalVerifyPrapinjam');
  const content = document.getElementById('modalVerifyPrapinjamContent');
  const closeBtn = document.getElementById('btnCloseVerifyPrapinjam');
  const cancelBtn = document.getElementById('btnCancelVerifyModal');
  const checkBtn = document.getElementById('btnCheckTicketCode');
  const inputCode = document.getElementById('inputVerifyTicketCode');
  const launchCameraBtn = document.getElementById('btnLaunchCameraFromModal');
  const confirmBtn = document.getElementById('btnConfirmHandoverLoan');

  function closeModal() {
    hideModal(modal, content);
    currentVerifyingLoan = null;
    isCurrentLoanVerified = false;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  if (launchCameraBtn) {
    launchCameraBtn.addEventListener('click', () => {
      hideModal(modal, content);
      if (window.startLiveCameraScanner) {
        window.startLiveCameraScanner('prapinjam');
      }
    });
  }

  function validateTicketCode() {
    if (!currentVerifyingLoan) return;
    const inputVal = (inputCode.value || '').trim().toUpperCase();
    const targetId = (currentVerifyingLoan.id_peminjaman || '').toUpperCase();

    if (!inputVal) {
      showToast('Arahkan scanner atau masukkan ID tiket peminjaman.', 'warning');
      return;
    }

    if (inputVal === targetId || inputVal.includes(targetId) || targetId.includes(inputVal)) {
      setLoanVerificationState(true);
      showToast('Tiket booking terverifikasi cocok! Kunci penyerahan buku terbuka.', 'success');
    } else {
      showToast(`Kode tiket tidak cocok! (Harus sesuai tiket booking: ${targetId})`, 'error');
    }
  }

  if (checkBtn) checkBtn.addEventListener('click', validateTicketCode);
  if (inputCode) {
    inputCode.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateTicketCode();
      }
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!isCurrentLoanVerified || !currentVerifyingLoan) {
        showToast('Wajib verifikasi tiket barcode sebelum menyerahkan buku.', 'warning');
        return;
      }
      const id = currentVerifyingLoan.id_peminjaman;
      closeModal();
      await handleApprovePrapinjam(id);
    });
  }
}

/**
 * Mengatur tampilan modal sesuai status verifikasi barcode
 */
function setLoanVerificationState(isVerified) {
  isCurrentLoanVerified = isVerified;
  const statusBanner = document.getElementById('verifyStatusBanner');
  const statusIcon = document.getElementById('verifyStatusIcon');
  const statusText = document.getElementById('verifyStatusText');
  const iconBadge = document.getElementById('verifyIconBadge');
  const inputContainer = document.getElementById('verifyInputContainer');
  const successBox = document.getElementById('verifySuccessBox');
  const confirmBtn = document.getElementById('btnConfirmHandoverLoan');

  if (isVerified) {
    if (statusBanner) statusBanner.className = 'flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 transition-all';
    if (statusIcon) statusIcon.className = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white text-xl shadow-xs';
    if (statusText) statusText.innerHTML = '<span class="font-extrabold text-xs block text-emerald-950">Barcode Tiket Terverifikasi Cocok!</span><span class="text-[11px] text-emerald-700">Identitas tiket sah. Silakan periksa buku fisik dan lakukan serah terima.</span>';
    if (iconBadge) iconBadge.className = 'ph-fill ph-check-circle text-xl text-emerald-500';

    if (inputContainer) inputContainer.classList.add('hidden');
    if (successBox) successBox.classList.remove('hidden');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.className = 'flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer';
    }
  } else {
    if (statusBanner) statusBanner.className = 'flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 transition-all';
    if (statusIcon) statusIcon.className = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white text-xl shadow-xs';
    if (statusText) statusText.innerHTML = '<span class="font-extrabold text-xs block text-amber-950">Menunggu Scan Barcode / QR Tiket</span><span class="text-[11px] text-amber-700">Minta peminjam menunjukkan tiket peminjaman di HP mereka.</span>';
    if (iconBadge) iconBadge.className = 'ph ph-qr-code text-xl text-amber-500';

    if (inputContainer) inputContainer.classList.remove('hidden');
    if (successBox) successBox.classList.add('hidden');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.className = 'flex-1 py-3 px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs transition flex items-center justify-center gap-2 cursor-not-allowed';
    }
  }
}

/**
 * Membuka modal verifikasi serah-terima buku pra-pinjam
 */
export function openPrapinjamVerifyModal(loan, isBarcodeVerified = false) {
  const modal = document.getElementById('modalVerifyPrapinjam');
  const content = document.getElementById('modalVerifyPrapinjamContent');
  if (!modal) return;

  currentVerifyingLoan = loan;
  const borrower = getBorrowerInfo(loan.nisn_siswa);
  const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);

  const nama = borrower.nama;
  const sub = borrower.sub;
  const badge = borrower.badge;
  const isGuru = borrower.type === 'guru';

  const judul = buku ? buku.judul_buku : loan.id_buku;
  const penulis = buku ? buku.penulis : '-';
  const rak = buku ? (buku.keterangan || 'Rak Umum') : '-';
  const stok = buku ? buku.stok : 0;
  const coverUrl = buku && buku.cover_url ? buku.cover_url : null;

  const ticketBadge = document.getElementById('verifyBadgeId');
  const inputCode = document.getElementById('inputVerifyTicketCode');
  const borrowerName = document.getElementById('verifyBorrowerName');
  const borrowerSub = document.getElementById('verifyBorrowerSub');
  const borrowerBadge = document.getElementById('verifyBorrowerBadge');
  const borrowerContact = document.getElementById('verifyBorrowerContact');

  const coverContainer = document.getElementById('verifyBookCoverContainer');
  const bookTitle = document.getElementById('verifyBookTitle');
  const bookAuthor = document.getElementById('verifyBookAuthor');
  const bookRak = document.getElementById('verifyBookRak');
  const bookStock = document.getElementById('verifyBookStock');
  const tglPinjam = document.getElementById('verifyTanggalPinjam');
  const batasKembali = document.getElementById('verifyBatasKembali');

  if (ticketBadge) ticketBadge.textContent = loan.id_peminjaman;
  if (inputCode) inputCode.value = isBarcodeVerified ? loan.id_peminjaman : '';

  if (borrowerName) borrowerName.textContent = nama;
  if (borrowerSub) borrowerSub.innerHTML = sub;
  if (borrowerContact) borrowerContact.textContent = `Kontak: ${borrower.kontak || '-'}`;
  if (borrowerBadge) {
    borrowerBadge.textContent = badge;
    borrowerBadge.className = isGuru 
      ? 'rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold'
      : 'rounded-full bg-blue-100 text-navy px-1.5 py-0.2 text-[9px] font-bold';
  }

  if (bookTitle) bookTitle.textContent = judul;
  if (bookAuthor) bookAuthor.textContent = penulis;
  if (bookRak) bookRak.textContent = `Rak: ${rak}`;
  if (bookStock) bookStock.textContent = `Stok: ${stok}`;

  if (tglPinjam) tglPinjam.textContent = formatTanggalIndo(loan.tanggal_pinjam);
  if (batasKembali) batasKembali.textContent = formatTanggalIndo(loan.batas_kembali);

  if (coverContainer) {
    coverContainer.innerHTML = coverUrl 
      ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" />`
      : '<i class="ph ph-book text-2xl text-slate-400"></i>';
  }

  setLoanVerificationState(isBarcodeVerified);
  showModal(modal, content);
}

/**
 * Menyetujui prapinjam dan menyerahkan buku kepada peminjam
 */
export async function handleApprovePrapinjam(idPeminjaman) {
  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === idPeminjaman);
  if (!loan) {
    showToast('Data peminjaman tidak ditemukan.', 'error');
    return;
  }

  try {
    showToast('Memproses penyerahan buku...', 'info');

    const today = getTodayDateString();
    const returnDue = addDaysToDate(today, 7);

    const { error: errLoan } = await db
      .from('data_peminjaman')
      .update({
        status: 'Dipinjam',
        tanggal_pinjam: today,
        batas_kembali: returnDue
      })
      .eq('id_peminjaman', idPeminjaman);

    if (errLoan) throw errLoan;

    showToast(`Buku fisik berhasil diserahkan! Peminjaman aktif (${idPeminjaman}) berlaku hingga ${formatTanggalIndo(returnDue)}.`, 'success');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal menyetujui peminjaman:', err);
    showToast('Gagal memproses penyerahan buku: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Membatalkan antrean prapinjam (jika siswa tidak datang / expired)
 */
export async function handleRejectPrapinjam(idPeminjaman) {
  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === idPeminjaman);
  if (!loan) return;

  const konfirmasi = confirm(`Batalkan antrean booking pra-pinjam [${idPeminjaman}]?\n\nPeringatan: Permohonan akan dihapus dan stok buku yang dikunci akan dikembalikan ke rak perpustakaan.`);
  if (!konfirmasi) return;

  try {
    showToast('Membatalkan pemesanan pra-pinjam...', 'info');

    const { error } = await db
      .from('data_peminjaman')
      .delete()
      .eq('id_peminjaman', idPeminjaman);

    if (error) throw error;

    const idBuku = loan.id_buku;
    if (idBuku) {
      const bookInCache = (state.cache.buku || []).find(b => b.id_buku === idBuku);
      let currentStock = bookInCache ? (Number(bookInCache.stok) || 0) : 0;

      const { data: dbBook } = await db
        .from('data_buku')
        .select('stok')
        .eq('id_buku', idBuku)
        .single();

      if (dbBook && dbBook.stok !== undefined) {
        currentStock = Number(dbBook.stok) || 0;
      }

      const { error: errStock } = await db
        .from('data_buku')
        .update({
          stok: currentStock + 1,
          status: 'Tersedia'
        })
        .eq('id_buku', idBuku);

      if (errStock) {
        console.warn('Gagal memulihkan stok buku saat reject:', errStock);
      }
    }

    showToast(`Permohonan ${idPeminjaman} dibatalkan. Stok buku fisik berhasil dipulihkan ke inventaris.`, 'success');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal membatalkan pra-pinjam:', err);
    showToast('Gagal membatalkan pra-pinjam: ' + (err.message || 'Error Supabase'), 'error');
  }
}

// Buka akses global ke window
if (typeof window !== 'undefined') {
  window.openPrapinjamVerifyModal = openPrapinjamVerifyModal;
  window.handleApprovePrapinjam = handleApprovePrapinjam;
  window.handleRejectPrapinjam = handleRejectPrapinjam;
}
