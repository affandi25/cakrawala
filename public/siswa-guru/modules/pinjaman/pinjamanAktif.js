/**
 * CAKRAWALA Digital Library - Modul Buku Sedang Aktif Dipinjam
 * File: public/siswa-guru/modules/pinjaman/pinjamanAktif.js
 * 
 * Tanggung Jawab:
 * - Merender daftar kartu buku fisik yang sedang aktif dipinjam (status 'Dipinjam')
 * - Menghitung sisa hari / indikator jatuh tempo pengembalian
 */

import { state } from '../state.js';
import { formatTanggalIndo, formatRupiah, getRemainingDays } from '../siswaHelper.js';

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
    const hargaBuku = book ? (Number(book.harga_buku) || 50000) : 50000;

    return `
      <div class="p-5 rounded-2xl border ${dueInfo.isMonthOverdue ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200/80 bg-white'} hover:border-slate-300 transition shadow-2xs">
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

        ${dueInfo.isMonthOverdue ? `
          <div class="mt-3.5 p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <i class="ph-fill ph-warning-octagon text-rose-600 text-xl shrink-0 mt-0.5"></i>
            <div class="space-y-1">
              <div class="flex items-center gap-2 font-black text-rose-950">
                <span>Peringatan: Keterlambatan Telah Mencapai 1 Bulan (${dueInfo.lateDays} Hari)!</span>
                <span class="rounded bg-rose-700 text-white px-2 py-0.5 text-[10px] font-bold">Denda Seharga Buku</span>
              </div>
              <p class="text-[11px] leading-relaxed text-rose-800">
                Perhitungan denda harian telah <strong>dinonaktifkan</strong>. Sistem menetapkan nominal denda penggantian seharga buku fisik sebesar 
                <strong class="text-rose-950 font-black text-xs underline">${formatRupiah(hargaBuku)}</strong>. 
                Harap segera temui Petugas Perpustakaan untuk menyelesaikan buku ini.
              </p>
            </div>
          </div>
        ` : ''}

        <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60 -mx-5 -mb-5 px-5 py-2.5 rounded-b-2xl">
          <span class="flex items-center gap-1.5 text-[11px]">
            <i class="ph ${dueInfo.isMonthOverdue ? 'ph-warning text-rose-600 font-bold' : 'ph-info text-navy'} text-sm"></i>
            <span class="${dueInfo.isMonthOverdue ? 'text-rose-700 font-semibold' : ''}">${dueInfo.isMonthOverdue ? 'Buku harus segera dikembalikan ke meja sirkulasi.' : 'Kembalikan buku fisik tepat waktu ke meja sirkulasi untuk menghindari denda.'}</span>
          </span>
          <span class="font-semibold text-emerald-600 text-[11px]">&bull; Sedang Dipinjam</span>
        </div>
      </div>
    `;
  }).join('');
}
