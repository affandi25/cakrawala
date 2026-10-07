/**
 * CAKRAWALA Digital Library - Modul Meja 1: Overview Operasional
 * File: public/petugas/modules/overview.js
 */

import { state } from './state.js';
import { formatRupiah, formatTanggalIndo, getBorrowerInfo } from './utils.js';
import { handleApprovePrapinjam, handleRejectPrapinjam } from './sirkulasi.js';

/**
 * Menghitung dan menampilkan angka-angka statistik di Meja 1 (Overview)
 */
export function renderOverview() {
  // 1. Total Judul Buku & Total Eksemplar Stok Fisik
  const totalJudul = state.cache.buku.length;
  const totalEksemplar = state.cache.buku.reduce((acc, b) => acc + (Number(b.stok) || 0), 0);

  const statTotalBuku = document.getElementById('statTotalBuku');
  const statTotalEksemplar = document.getElementById('statTotalEksemplar');
  const badgeTotalBooks = document.getElementById('badgeTotalBooksCount');

  if (statTotalBuku) statTotalBuku.textContent = totalJudul;
  if (statTotalEksemplar) statTotalEksemplar.textContent = `${totalEksemplar} eksemplar tersedia`;
  if (badgeTotalBooks) badgeTotalBooks.textContent = totalJudul;

  // 2. Koleksi yang Sedang Aktif Dipinjam (Status = 'Dipinjam')
  const sedangDipinjam = state.cache.peminjaman.filter(p => p.status === 'Dipinjam').length;
  const statSedangDipinjam = document.getElementById('statSedangDipinjam');
  const badgeActiveBorrowCount = document.getElementById('badgeActiveBorrowCount');

  if (statSedangDipinjam) statSedangDipinjam.textContent = sedangDipinjam;
  if (badgeActiveBorrowCount) badgeActiveBorrowCount.textContent = sedangDipinjam;

  // 3. Prapinjam yang Menunggu Verifikasi Penyerahan (Status = 'Menunggu')
  const pendingPrapinjam = state.cache.peminjaman.filter(p => p.status === 'Menunggu');
  const statMenungguVerifikasi = document.getElementById('statMenungguVerifikasi');
  const countPrapinjamFilter = document.getElementById('countPrapinjamFilter');
  const badgePendingCount = document.getElementById('badgePendingCount');

  if (statMenungguVerifikasi) statMenungguVerifikasi.textContent = pendingPrapinjam.length;
  if (countPrapinjamFilter) countPrapinjamFilter.textContent = pendingPrapinjam.length;
  if (badgePendingCount) badgePendingCount.textContent = pendingPrapinjam.length;

  // 4. Kalkulasi Total Denda yang Belum Dilunasi
  const unpaidFines = state.cache.pengembalian.filter(r => r.status_denda === 'Belum Lunas');
  const totalUnpaidNominal = unpaidFines.reduce((acc, r) => acc + (Number(r.denda) || 0), 0);

  const statTotalDendaBelumLunas = document.getElementById('statTotalDendaBelumLunas');
  const statJumlahKasusDenda = document.getElementById('statJumlahKasusDenda');

  if (statTotalDendaBelumLunas) statTotalDendaBelumLunas.textContent = formatRupiah(totalUnpaidNominal);
  if (statJumlahKasusDenda) statJumlahKasusDenda.textContent = `${unpaidFines.length} transaksi tertunda`;

  // 5. Gambar Tabel Kilat 5 Prapinjam Terbaru
  renderQuickPrapinjamTable(pendingPrapinjam.slice(0, 5));
}

/**
 * Menggambar tabel ringkas antrean prapinjam di Overview
 */
export function renderQuickPrapinjamTable(list) {
  const tbody = document.getElementById('tableQuickPrapinjamBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-8 text-center text-slate-400">
          <i class="ph ph-check-circle text-2xl text-emerald-500 inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada antrean prapinjam yang menunggu verifikasi.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = state.cache.buku.find(b => b.id_buku === item.id_buku);

    const badgeRoleClass = borrower.type === 'guru'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-navy';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-xs text-navy">${item.id_peminjaman}</td>
        <td class="px-5 py-3">
          <div class="font-bold text-xs text-slate-900">${borrower.nama}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="rounded-full ${badgeRoleClass} px-2 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
            <span class="text-[10px] text-slate-500">${borrower.id} &bull; ${borrower.kelas}</span>
          </div>
        </td>
        <td class="px-5 py-3">
          <div class="text-xs font-semibold text-slate-800">${buku ? buku.judul_buku : item.id_buku}</div>
          <div class="text-[11px] text-slate-400">Rak: ${buku ? (buku.keterangan || '-') : '-'}</div>
        </td>
        <td class="px-5 py-3 text-xs whitespace-nowrap">
          <span class="text-slate-600">${formatTanggalIndo(item.tanggal_pinjam)}</span>
          <span class="block text-[10px] text-slate-400">Tempo: ${formatTanggalIndo(item.batas_kembali)}</span>
        </td>
        <td class="px-5 py-3 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Menunggu
          </span>
        </td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" data-action="approve" data-id="${item.id_peminjaman}"
              class="btn-quick-approve inline-flex items-center gap-1 rounded-xl bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-light transition shadow-2xs">
              <i class="ph ph-check text-sm"></i>
              <span>Serahkan</span>
            </button>
            <button type="button" data-action="reject" data-id="${item.id_peminjaman}"
              class="btn-quick-reject inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition">
              <i class="ph ph-x text-sm"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Event Listeners tombol serahkan dan tolak di overview
  tbody.querySelectorAll('.btn-quick-approve').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleApprovePrapinjam(id);
    });
  });

  tbody.querySelectorAll('.btn-quick-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRejectPrapinjam(id);
    });
  });
}
