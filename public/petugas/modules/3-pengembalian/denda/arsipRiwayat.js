/**
 * Modul Arsip Riwayat Pengembalian Perpustakaan
 * Path: public/petugas/modules/3-pengembalian/denda/arsipRiwayat.js
 * Deskripsi: Menampilkan arsip log transaksi pengembalian buku dengan pencarian nama peminjam / ID buku.
 */

import { state } from '../../core/state.js';
import { formatTanggalIndo, formatRupiah, getBorrowerInfo } from '../../core/petugasHelper.js';
import { openModalKonfirmasiLunasiDenda, handleBatalkanLunasDenda } from './kasirTunggakan.js';

export const arsipRiwayatState = {
  searchQuery: ''
};

/**
 * Merender daftar arsip seluruh riwayat pengembalian
 */
export function renderSemuaRiwayatList() {
  const container = document.getElementById('listRiwayatPengembalian');
  if (!container) return;

  const list = state.cache.pengembalian || [];
  let filtered = [...list];

  // Pencarian berbasis nama peminjam, ID, kode pengembalian, atau judul buku
  if (arsipRiwayatState.searchQuery && arsipRiwayatState.searchQuery.trim().length > 0) {
    const q = arsipRiwayatState.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(item => {
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;
      const nama = (borrower?.nama || '').toLowerCase();
      const borrowerId = (borrower?.id || '').toLowerCase();
      const idPeminjaman = (item?.id_peminjaman || '').toLowerCase();
      const idPengembalian = (item?.id_pengembalian || '').toLowerCase();
      const judul = (buku?.judul_buku || '').toLowerCase();

      return (
        nama.includes(q) ||
        borrowerId.includes(q) ||
        idPeminjaman.includes(q) ||
        idPengembalian.includes(q) ||
        judul.includes(q)
      );
    });
  }

  if (filtered.length === 0) {
    const isSearching = arsipRiwayatState.searchQuery.trim().length > 0;
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-receipt text-3xl inline-block mb-1 text-slate-300"></i>
        <h5 class="text-xs font-bold text-slate-700">${isSearching ? 'Nama peminjam / kata kunci tidak ditemukan' : 'Belum ada riwayat pengembalian'}</h5>
        <p class="text-[11px] text-slate-400 mt-0.5">${isSearching ? 'Pastikan ejaan nama siswa/guru sudah sesuai.' : 'Riwayat akan muncul saat buku selesai dikembalikan.'}</p>
      </div>
    `;
    return;
  }

  let html = '';
  // Ambil hingga 50 transaksi terbaru
  filtered.slice(0, 50).forEach(item => {
    const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

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
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 hover:shadow-xs space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-2.5 min-w-0">
            ${borrower.foto && typeof borrower.foto === 'string' && borrower.foto.trim() !== ''
              ? `<img src="${borrower.foto}" class="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200/80 shadow-2xs mt-0.5" alt="${borrower.nama}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white text-[11px] font-bold mt-0.5\\'>${(borrower.nama || 'A').charAt(0).toUpperCase()}</div>';"/>`
              : `<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white text-[11px] font-bold mt-0.5">${(borrower.nama || 'A').charAt(0).toUpperCase()}</div>`}
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-[10px] font-bold text-navy bg-navy/10 px-1.5 py-0.5 rounded">${item.id_pengembalian}</span>
                <span class="text-xs font-bold text-slate-900 truncate">${namaSiswa}</span>
              </div>
              <p class="text-xs text-slate-700 mt-1 line-clamp-1">
                <i class="ph ph-book text-slate-400 mr-1"></i>${judulBuku}
              </p>
            </div>
          </div>
          <div class="text-right">
            ${badgeDenda}
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <div class="flex items-center gap-3">
            <span>Kembali: <strong>${formatTanggalIndo(item.tanggal_kembali)}</strong></span>
            <span>Kondisi: <strong class="${item.kondisi_buku === 'Baik' ? 'text-emerald-600' : 'text-amber-600'}">${item.kondisi_buku || 'Baik'}</strong></span>
          </div>
          <div>
            <span>Telat: <strong>${item.keterlambatan || 0} Hari</strong></span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Pasang listener tombol Lunasi dari riwayat
  container.querySelectorAll('.btn-trigger-lunasi-from-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });

  // Pasang listener tombol Rollback Batal Lunas
  container.querySelectorAll('.btn-rollback-lunas').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      handleBatalkanLunasDenda(idPengembalian);
    });
  });
}

/**
 * Filter live search untuk riwayat
 */
export function filterRiwayatPengembalian(keyword = '') {
  arsipRiwayatState.searchQuery = keyword;
  renderSemuaRiwayatList();
}

/**
 * Setup event listener input search riwayat pengembalian
 */
export function setupArsipRiwayatListeners() {
  const inputSearch = document.getElementById('inputSearchRiwayatPengembalian');
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      arsipRiwayatState.searchQuery = inputSearch.value.trim();
      renderSemuaRiwayatList();
    });
  }
}

// Buka akses global
if (typeof window !== 'undefined') {
  window.renderSemuaRiwayatList = renderSemuaRiwayatList;
  window.filterRiwayatPengembalian = filterRiwayatPengembalian;
}
