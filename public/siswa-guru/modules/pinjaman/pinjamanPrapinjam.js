/**
 * CAKRAWALA Digital Library - Modul Antrean Booking Pra-Pinjam
 * File: public/siswa-guru/modules/pinjaman/pinjamanPrapinjam.js
 * 
 * Tanggung Jawab:
 * - Merender kartu antrean pesanan buku pra-pinjam (status 'Menunggu')
 * - Menampilkan trigger lihat detail barcode tiket
 */

import { state } from '../state.js';
import { formatTanggalIndo, showToast } from '../siswaHelper.js';

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
 * Menampilkan detail modal tiket booking dari daftar antrean
 */
export function showTicketDetails(loanId) {
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
}
