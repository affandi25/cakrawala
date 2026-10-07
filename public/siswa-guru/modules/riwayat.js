/**
 * CAKRAWALA Digital Library - Modul Tab 4: Riwayat Pengembalian & Catatan Denda
 * File: public/siswa-guru/modules/riwayat.js
 */

import { state } from './state.js';
import { formatRupiah, formatTanggalIndo } from './siswaHelper.js';

/**
 * Setup pendengar filter riwayat
 */
export function setupRiwayatModule() {
  const filterDendaSelect = document.getElementById('selectFilterStatusDenda');
  if (filterDendaSelect) {
    filterDendaSelect.addEventListener('change', () => {
      renderRiwayatTable();
    });
  }
}

/**
 * Merender daftar riwayat buku yang telah dikembalikan dan rincian denda
 */
export function renderRiwayatTable() {
  const container = document.getElementById('containerListRiwayat');
  const recordCount = document.getElementById('riwayatRecordCount');
  const filterSelect = document.getElementById('selectFilterStatusDenda');
  if (!container) return;

  const finishedLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Selesai');
  const filterVal = filterSelect ? filterSelect.value : '';

  let list = finishedLoans.map(loan => {
    const returnRecord = (state.cache.pengembalian || []).find(r => r.id_peminjaman === loan.id_peminjaman);
    const book = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);

    return {
      loan,
      book,
      returnRecord: returnRecord || {
        tanggal_kembali: loan.batas_kembali,
        keterlambatan: 0,
        kondisi_buku: 'Baik',
        denda: 0,
        status_denda: 'Tidak Ada'
      }
    };
  });

  if (filterVal) {
    list = list.filter(item => item.returnRecord.status_denda === filterVal);
  }

  if (recordCount) recordCount.textContent = `${list.length} Riwayat`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <i class="ph ph-clock-counter-clockwise text-4xl inline-block mb-2 text-slate-300"></i>
        <h4 class="text-sm font-bold text-slate-700">Belum ada catatan riwayat peminjaman</h4>
        <p class="text-xs text-slate-400 mt-1">Buku yang telah selesai kamu kembalikan akan tercatat otomatis di sini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const { loan, book, returnRecord } = item;
    const judul = book ? book.judul_buku : loan.id_buku;
    const penulis = book ? book.penulis : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;
    const nominalDenda = Number(returnRecord.denda) || 0;

    let badgeDenda = '';
    if (returnRecord.status_denda === 'Belum Lunas') {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
          Belum Lunas (${formatRupiah(nominalDenda)})
        </span>
      `;
    } else if (returnRecord.status_denda === 'Lunas') {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
          <i class="ph ph-check-circle text-xs"></i>
          Lunas (${formatRupiah(nominalDenda)})
        </span>
      `;
    } else {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold">
          Bebas Denda (Rp 0)
        </span>
      `;
    }

    return `
      <div class="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-14 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <span class="font-mono text-[10px] font-bold text-slate-400">#${loan.id_peminjaman}</span>
              <h4 class="font-bold text-slate-800 text-sm line-clamp-1">${judul}</h4>
              <p class="text-xs text-slate-500">${penulis}</p>
            </div>
          </div>

          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <div>${badgeDenda}</div>
            <div class="text-right text-[11px] text-slate-500 mt-1">
              <span>Dikembalikan: <strong>${formatTanggalIndo(returnRecord.tanggal_kembali)}</strong></span>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-3 text-[11px]">
            <span>Kondisi Buku: <strong class="text-slate-700">${returnRecord.kondisi_buku || 'Baik'}</strong></span>
            <span>&bull;</span>
            <span>Keterlambatan: <strong class="text-slate-700">${returnRecord.keterlambatan || 0} Hari</strong></span>
          </div>
          <span class="font-semibold text-emerald-600 text-[11px]">&bull; Selesai</span>
        </div>
      </div>
    `;
  }).join('');
}
