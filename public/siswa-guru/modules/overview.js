/**
 * CAKRAWALA Digital Library - Modul Tab 1: Beranda & Ringkasan Aktivitas Pribadi
 * File: public/siswa-guru/modules/overview.js
 */

import { state } from './state.js';
import { formatRupiah, formatTanggalIndo, getRemainingDays } from './siswaHelper.js';

/**
 * Merender seluruh data di halaman Beranda pribadi siswa/guru
 */
export function renderOverview() {
  renderFineAlertBanner();
  renderKpiCards();
  renderActiveBorrowQuickList();
}

/**
 * Menampilkan atau menyembunyikan Red Alert Banner peringatan denda belum lunas
 * (Sesuai spesifikasi PRD.md Section 4.C)
 */
export function renderFineAlertBanner() {
  const banner = document.getElementById('bannerPeringatanDenda');
  const nominalEl = document.getElementById('bannerNominalDenda');
  const jumlahKasusEl = document.getElementById('bannerJumlahKasusDenda');
  if (!banner) return;

  const unpaid = state.unpaidFines || [];
  const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');

  // Deteksi pinjaman aktif yang terlambat >= 30 hari (denda seharga buku)
  const monthOverdueLoans = activeLoans.filter(loan => {
    const dueInfo = getRemainingDays(loan.batas_kembali);
    return dueInfo.isMonthOverdue;
  });

  const hasUnpaidFines = unpaid.length > 0;
  const hasMonthOverdue = monthOverdueLoans.length > 0;

  if (hasUnpaidFines || hasMonthOverdue) {
    let totalNominal = unpaid.reduce((sum, item) => sum + (Number(item.denda) || 0), 0);

    // Tambahkan nominal seharga buku jika pinjaman aktif terlambat >= 30 hari
    let monthOverdueNote = '';
    if (hasMonthOverdue) {
      const totalHargaBuku = monthOverdueLoans.reduce((sum, loan) => {
        const book = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
        return sum + (book ? (Number(book.harga_buku) || 50000) : 50000);
      }, 0);
      totalNominal += totalHargaBuku;
      monthOverdueNote = ` (termasuk denda seharga buku untuk ${monthOverdueLoans.length} pinjaman terlambat ≥ 1 bulan)`;
    }

    if (nominalEl) nominalEl.textContent = formatRupiah(totalNominal);
    if (jumlahKasusEl) {
      const totalKasus = unpaid.length + monthOverdueLoans.length;
      jumlahKasusEl.textContent = `${totalKasus} transaksi / pinjaman tertunggak${monthOverdueNote}`;
    }
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/**
 * Menghitung dan menampilkan angka pada 4 kartu KPI
 */
export function renderKpiCards() {
  const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');
  const pendingReservations = (state.cache.peminjaman || []).filter(p => p.status === 'Menunggu');
  const finishedLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Selesai');
  const unpaid = state.unpaidFines || [];
  const totalUnpaidNominal = unpaid.reduce((sum, item) => sum + (Number(item.denda) || 0), 0);

  const statActiveLoan = document.getElementById('statActiveLoanCount');
  const statPendingReservation = document.getElementById('statPendingReservationCount');
  const statFinishedLoan = document.getElementById('statFinishedLoanCount');
  const statFineAmount = document.getElementById('statFineAmountDisplay');
  const statFineStatusSub = document.getElementById('statFineStatusSub');

  // Sidebar badge count
  const badgeActiveSidebar = document.getElementById('badgeSidebarActiveCount');
  const badgePendingSidebar = document.getElementById('badgeSidebarPendingCount');

  if (statActiveLoan) statActiveLoan.textContent = activeLoans.length;
  if (statPendingReservation) statPendingReservation.textContent = pendingReservations.length;
  if (statFinishedLoan) statFinishedLoan.textContent = finishedLoans.length;

  if (badgeActiveSidebar) {
    badgeActiveSidebar.textContent = activeLoans.length;
    badgeActiveSidebar.classList.toggle('hidden', activeLoans.length === 0);
  }
  if (badgePendingSidebar) {
    badgePendingSidebar.textContent = pendingReservations.length;
    badgePendingSidebar.classList.toggle('hidden', pendingReservations.length === 0);
  }

  if (statFineAmount) {
    if (totalUnpaidNominal > 0) {
      statFineAmount.textContent = formatRupiah(totalUnpaidNominal);
      statFineAmount.className = 'text-2xl font-extrabold text-rose-600';
      if (statFineStatusSub) {
        statFineStatusSub.textContent = 'Harap segera dilunasi di meja sirkulasi';
        statFineStatusSub.className = 'text-xs font-semibold text-rose-600';
      }
    } else {
      statFineAmount.textContent = 'Rp 0';
      statFineAmount.className = 'text-2xl font-extrabold text-emerald-600';
      if (statFineStatusSub) {
        statFineStatusSub.textContent = 'Bebas denda perpustakaan';
        statFineStatusSub.className = 'text-xs text-slate-500';
      }
    }
  }
}

/**
 * Merender daftar buku yang sedang aktif dipinjam di beranda
 */
export function renderActiveBorrowQuickList() {
  const container = document.getElementById('containerActiveLoansQuick');
  const emptyPlaceholder = document.getElementById('placeholderNoActiveLoans');
  if (!container) return;

  const activeLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');

  if (activeLoans.length === 0) {
    container.innerHTML = '';
    if (emptyPlaceholder) emptyPlaceholder.classList.remove('hidden');
    return;
  }

  if (emptyPlaceholder) emptyPlaceholder.classList.add('hidden');

  container.innerHTML = activeLoans.map(loan => {
    const book = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
    const judul = book ? book.judul_buku : loan.id_buku;
    const penulis = book ? book.penulis : '-';
    const rak = book ? (book.keterangan || 'Rak Umum') : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;
    const dueInfo = getRemainingDays(loan.batas_kembali);
    const hargaBuku = book ? (Number(book.harga_buku) || 50000) : 50000;

    return `
      <div class="p-4 rounded-xl border ${dueInfo.isMonthOverdue ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200/80 bg-white'} hover:border-slate-300 transition shadow-2xs space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="h-14 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              ${coverUrl ? `<img src="${coverUrl}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-lg"></i>'}
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">${judul}</h4>
              <p class="text-[11px] text-slate-500 truncate">${penulis} &bull; <span class="text-navy font-bold">${rak}</span></p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] text-slate-400">Pinjam: ${formatTanggalIndo(loan.tanggal_pinjam)}</span>
                <span class="text-[10px] text-slate-300">&bull;</span>
                <span class="text-[10px] font-semibold text-slate-600">Tempo: ${formatTanggalIndo(loan.batas_kembali)}</span>
              </div>
            </div>
          </div>

          <div class="shrink-0 text-right ml-3">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${dueInfo.badgeClass}">
              ${dueInfo.text}
            </span>
            <span class="block text-[10px] font-mono text-slate-400 mt-1">${loan.id_peminjaman}</span>
          </div>
        </div>

        ${dueInfo.isMonthOverdue ? `
          <div class="px-3 py-2 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-900 text-[11px] flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 font-bold">
              <i class="ph-fill ph-warning-octagon text-rose-600 text-sm"></i>
              <span>Denda Seharga Buku:</span>
            </span>
            <span class="font-extrabold text-rose-950 underline">${formatRupiah(hargaBuku)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

