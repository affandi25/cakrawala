/**
 * CAKRAWALA Digital Library - Modul Tab 3: Peminjaman Saya (Buku Aktif & Antrean Prapinjam)
 * File: public/siswa-guru/modules/pinjaman.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatTanggalIndo,
  getRemainingDays,
  showModal,
  hideModal,
  showToast
} from './siswaHelper.js';

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

  setupCancelBookingModal();
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

/**
 * Merender daftar buku yang sedang aktif dipinjam
 */
export function renderActiveLoansTable() {
  const container = document.getElementById('containerListPinjamanAktif');
  const badgeCount = document.getElementById('badgeCountPinjamanAktif');
  if (!container) return;

  const list = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');
  if (badgeCount) badgeCount.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <i class="ph ph-book-open text-4xl inline-block mb-2 text-slate-300"></i>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada buku yang sedang kamu pinjam</h4>
        <p class="text-xs text-slate-400 mt-1">Jelajahi koleksi kami di menu Katalog untuk meminjam buku fisik.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
    const judul = book ? book.judul_buku : item.id_buku;
    const penulis = book ? book.penulis : '-';
    const rak = book ? (book.keterangan || 'Rak Umum') : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;
    const dueInfo = getRemainingDays(item.batas_kembali);

    return `
      <div class="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-navy">${item.id_peminjaman}</span>
                <span class="rounded-md bg-slate-100 text-slate-600 px-2 py-0.2 text-[10px] font-bold">${item.metode_peminjaman || 'Scan QR'}</span>
              </div>
              <h4 class="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">${judul}</h4>
              <p class="text-xs text-slate-500">${penulis} &bull; <span class="text-navy font-bold">${rak}</span></p>
            </div>
          </div>

          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${dueInfo.badgeClass}">
              ${dueInfo.text}
            </span>
            <div class="text-right text-[11px] text-slate-500 mt-1">
              <span>Pinjam: <strong>${formatTanggalIndo(item.tanggal_pinjam)}</strong></span>
              <span class="block text-slate-700 font-semibold">Batas Tempo: ${formatTanggalIndo(item.batas_kembali)}</span>
            </div>
          </div>
        </div>

        <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60 -mx-5 -mb-5 px-5 py-2.5 rounded-b-2xl">
          <span class="flex items-center gap-1.5 text-[11px]">
            <i class="ph ph-info text-navy text-sm"></i>
            <span>Kembalikan buku fisik tepat waktu ke meja sirkulasi untuk menghindari denda.</span>
          </span>
          <span class="font-semibold text-emerald-600 text-[11px]">&bull; Sedang Dipinjam</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Merender daftar antrean booking pra-pinjam (Status 'Menunggu')
 */
export function renderPendingReservationsTable() {
  const container = document.getElementById('containerListPinjamanPrapinjam');
  const badgeCount = document.getElementById('badgeCountPinjamanPrapinjam');
  if (!container) return;

  const list = (state.cache.peminjaman || []).filter(p => p.status === 'Menunggu');
  if (badgeCount) badgeCount.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <i class="ph ph-ticket text-4xl inline-block mb-2 text-slate-300"></i>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada antrean pra-pinjam yang menunggu</h4>
        <p class="text-xs text-slate-400 mt-1">Semua pesanan buku online telah diambil di perpustakaan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
    const judul = book ? book.judul_buku : item.id_buku;
    const penulis = book ? book.penulis : '-';
    const rak = book ? (book.keterangan || 'Rak Umum') : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;

    return `
      <div class="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 hover:border-amber-300 transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-extrabold text-navy px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  TIKET: ${item.id_peminjaman}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                  Menunggu Pengambilan
                </span>
              </div>
              <h4 class="font-bold text-slate-800 text-sm mt-1.5 line-clamp-1">${judul}</h4>
              <p class="text-xs text-slate-500">${penulis} &bull; Lokasi: <strong class="text-navy">${rak}</strong></p>
            </div>
          </div>

            <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-amber-200/50">
              <div class="text-left sm:text-right text-[11px] text-slate-600">
                <span>Waktu Booking: ${formatTanggalIndo(item.tanggal_pinjam)}</span>
                <span class="block text-amber-800 font-semibold">Batas Ambil: ${formatTanggalIndo(item.batas_kembali)}</span>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" onclick="window.showTicketDetails('${item.id_peminjaman}')"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white hover:bg-navy-light px-3 py-1.5 text-xs font-bold transition shadow-xs">
                  <i class="ph ph-barcode text-base"></i>
                  <span>Lihat Barcode</span>
                </button>
                <button type="button" onclick="window.openCancelBookingModal('${item.id_peminjaman}')"
                  class="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs">
                  <i class="ph ph-trash"></i>
                  <span>Batalkan</span>
                </button>
              </div>
            </div>
        </div>

        <div class="mt-3.5 pt-2.5 border-t border-amber-200/50 flex items-center justify-between text-[11px] text-amber-800 font-medium">
          <span>*Tunjukkan kode tiket di atas kepada petugas di meja sirkulasi perpustakaan untuk mengambil buku fisikmu.</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Setup modal konfirmasi pembatalan antrean pra-pinjam
 */
export function setupCancelBookingModal() {
  const modal = document.getElementById('modalCancelBooking');
  const content = document.getElementById('modalCancelBookingContent');
  const cancelBtn = document.getElementById('btnDismissCancelBooking');
  const confirmBtn = document.getElementById('btnConfirmCancelBooking');

  function closeModal() {
    hideModal(modal, content);
    state.cancelTargetBooking = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.cancelTargetBooking) return;
      const loanId = state.cancelTargetBooking;

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> <span>Membatalkan...</span>';

        const { error } = await db
          .from('data_peminjaman')
          .delete()
          .eq('id_peminjaman', loanId);

        if (error) throw error;

        showToast(`Pesanan booking [${loanId}] berhasil dibatalkan.`, 'success');
        closeModal();

        if (window.fetchAllMemberData) {
          await window.fetchAllMemberData();
        }
      } catch (err) {
        console.error('Gagal membatalkan booking:', err);
        showToast('Gagal membatalkan pemesanan: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="ph ph-trash text-sm"></i> <span>Ya, Batalkan Pesanan</span>';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi pembatalan booking
 */
export function openCancelBookingModal(loanId) {
  const modal = document.getElementById('modalCancelBooking');
  const content = document.getElementById('modalCancelBookingContent');
  const idEl = document.getElementById('cancelBookingIdDisplay');

  state.cancelTargetBooking = loanId;
  if (idEl) idEl.textContent = loanId;

  showModal(modal, content);
}

if (typeof window !== 'undefined') {
  window.openCancelBookingModal = openCancelBookingModal;
  window.showTicketDetails = function(loanId) {
    const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === loanId);
    if (!item) {
      showToast('Data peminjaman tidak ditemukan.', 'error');
      return;
    }
    const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
    if (window.showTicketSuccessModal) {
      window.showTicketSuccessModal({
        id: item.id_peminjaman,
        buku: book ? book.judul_buku : (item.id_buku || 'Buku'),
        rak: book?.keterangan || 'Rak Umum',
        tempo: formatTanggalIndo(item.batas_kembali),
        peminjam: state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId,
        nisn: state.memberId
      });
    }
  };
}
