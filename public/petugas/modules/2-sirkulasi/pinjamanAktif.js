/**
 * CAKRAWALA Digital Library - Modul Meja Sirkulasi: Daftar Buku Sedang Dipinjam
 * File: public/petugas/modules/2-sirkulasi/pinjamanAktif.js
 * 
 * FUNGSI:
 * - Menampilkan daftar buku yang sedang aktif dipinjam oleh siswa & guru
 * - Pencarian cepat buku dipinjam
 * - Pintasan langsung ke Meja Pengembalian & Denda
 */

import { state } from '../core/state.js';
import { formatTanggalIndo, getBorrowerInfo } from '../core/petugasHelper.js';

/**
 * Setup event listeners pencarian buku sedang dipinjam
 */
export function setupDipinjamFilters() {
  const searchDipinjam = document.getElementById('inputSearchDipinjam');
  if (searchDipinjam) {
    searchDipinjam.addEventListener('input', e => {
      state.searchDipinjamQuery = e.target.value.trim().toLowerCase();
      renderDipinjamOnlyTable();
    });
  }
}

/**
 * Merender daftar buku yang berstatus 'Dipinjam'
 */
export function renderDipinjamOnlyTable() {
  const tbody = document.getElementById('tableDipinjamOnlyBody');
  const badgeSubtab = document.getElementById('badgeSubtabDipinjam');
  const countDisplay = document.getElementById('countBukuDipinjamDisplay');
  const badgeActiveBorrow = document.getElementById('badgeActiveBorrowCount');
  if (!tbody) return;

  let dipinjamList = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');

  if (badgeSubtab) badgeSubtab.textContent = dipinjamList.length;
  if (countDisplay) countDisplay.textContent = `${dipinjamList.length} Buku`;
  if (badgeActiveBorrow) badgeActiveBorrow.textContent = dipinjamList.length;

  if (state.searchDipinjamQuery) {
    const q = state.searchDipinjamQuery;
    dipinjamList = dipinjamList.filter(p => {
      const borrower = getBorrowerInfo(p.nisn_siswa);
      const buku = (state.cache.buku || []).find(b => b.id_buku === p.id_buku);

      const matchId = (p.id_peminjaman || '').toLowerCase().includes(q);
      const matchNisn = (p.nisn_siswa || '').toLowerCase().includes(q);
      const matchNama = (borrower.nama || '').toLowerCase().includes(q);
      const matchJudul = buku && (buku.judul_buku || '').toLowerCase().includes(q);

      return matchId || matchNisn || matchNama || matchJudul;
    });
  }

  if (dipinjamList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-book-open text-3xl inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada buku yang sedang dipinjam.</p>
          <p class="text-[11px] text-slate-400">Seluruh koleksi perpustakaan saat ini berada di rak inventaris.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  dipinjamList.forEach(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);

    const namaSiswa = borrower.nama;
    const kelasSiswa = borrower.sub;
    const judulBuku = buku ? buku.judul_buku : item.id_buku;
    const penulisBuku = buku ? buku.penulis : '-';
    const coverUrl = buku && buku.cover_url ? buku.cover_url : null;
    const metode = item.metode_peminjaman === 'Pra Pinjam' ? 'Pra-Pinjam Online' : 'Walk-In Meja';

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-navy text-xs">
          ${item.id_peminjaman}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-800 text-xs">${namaSiswa}</span>
            <span class="rounded-full ${borrower.type === 'guru' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-navy'} px-1.5 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
          </div>
          <p class="text-[11px] text-slate-500">${kelasSiswa}</p>
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-11 w-8 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-800 text-xs line-clamp-1">${judulBuku}</p>
              <p class="text-[11px] text-slate-500">${penulisBuku}</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-xs">
          <p class="text-slate-600">Dipinjam: ${formatTanggalIndo(item.tanggal_pinjam)}</p>
          <p class="text-[11px] font-bold text-amber-700">Tempo: ${formatTanggalIndo(item.batas_kembali)}</p>
        </td>
        <td class="px-5 py-3">
          <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">${metode}</span>
          <span class="block mt-0.5 text-[10px] font-bold text-emerald-600">&bull; Aktif Dipinjam</span>
        </td>
        <td class="px-5 py-3 text-right">
          <button type="button" data-action="direct-return" data-id="${item.id_peminjaman}"
            class="btn-direct-return inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs">
            <i class="ph ph-arrow-u-up-left"></i>
            <span>Kembalikan Buku Ini</span>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  tbody.querySelectorAll('.btn-direct-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (typeof window.switchTab === 'function') window.switchTab('pengembalian');
      if (window.filterPengembalianByBook) {
        const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === id);
        if (item) window.filterPengembalianByBook(item.id_buku);
      }
    });
  });
}
