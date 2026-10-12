/**
 * CAKRAWALA Digital Library - Modul Kasir Tunggakan Denda
 * Path: public/petugas/modules/3-pengembalian/denda/kasirTunggakan.js
 * 
 * FUNGSI:
 * - Menampilkan daftar tagihan denda siswa/guru yang berstatus 'Belum Lunas'
 * - Pencarian cepat berdasarkan nama peminjam, ID pinjam, atau judul buku
 * - Modal verifikasi 2 lapis penerimaan uang kas tunai di meja sirkulasi
 * - Fitur pengembalian darurat (Safety Net Rollback) jika salah catat lunas
 */

import { db } from '../../../../assets/js/supabaseClient.js';
import { state } from '../../core/state.js';
import {
  formatRupiah,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../../core/petugasHelper.js';
import { syncAllData } from '../../core/syncData.js';

let targetPaymentItem = null;
let searchQueryTunggakan = '';
let isKasirSetup = false;

export const kasirTunggakanState = {
  get targetPaymentItem() { return targetPaymentItem; },
  set targetPaymentItem(val) { targetPaymentItem = val; },
  get searchQuery() { return searchQueryTunggakan; },
  set searchQuery(val) { searchQueryTunggakan = val; }
};

export function getSearchQueryTunggakan() {
  return searchQueryTunggakan;
}

export function setSearchQueryTunggakan(query) {
  searchQueryTunggakan = (query || '').trim().toLowerCase();
}

/**
 * Setup event listener untuk pencarian tunggakan dan modal pelunasan
 */
export function setupKasirTunggakanHandlers() {
  if (isKasirSetup) return;
  isKasirSetup = true;

  // Search input tunggakan
  const inputSearch = document.getElementById('inputSearchTunggakanDenda');
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      setSearchQueryTunggakan(inputSearch.value);
      renderTunggakanDendaList();
    });
  }

  // Setup Modal Lunasi Denda 2 Lapis
  const modalLunasi = document.getElementById('modalKonfirmasiLunasiDenda');
  const modalLunasiContent = document.getElementById('modalKonfirmasiLunasiDendaContent');
  const checkUangDiterima = document.getElementById('checkUangDiterima');
  const btnBatalLunasiModal = document.getElementById('btnBatalLunasiModal');
  const btnEksekusiLunasiModal = document.getElementById('btnEksekusiLunasiModal');

  if (checkUangDiterima && btnEksekusiLunasiModal) {
    checkUangDiterima.addEventListener('change', () => {
      btnEksekusiLunasiModal.disabled = !checkUangDiterima.checked;
    });
  }

  if (btnBatalLunasiModal) {
    btnBatalLunasiModal.addEventListener('click', () => {
      hideModal(modalLunasi, modalLunasiContent);
      targetPaymentItem = null;
    });
  }

  if (modalLunasi) {
    modalLunasi.addEventListener('click', e => {
      if (e.target === modalLunasi) {
        hideModal(modalLunasi, modalLunasiContent);
        targetPaymentItem = null;
      }
    });
  }

  if (btnEksekusiLunasiModal) {
    btnEksekusiLunasiModal.addEventListener('click', async () => {
      if (!targetPaymentItem) return;
      await executePelunasanDenda(targetPaymentItem);
      hideModal(modalLunasi, modalLunasiContent);
      targetPaymentItem = null;
    });
  }
}

export const setupKasirTunggakanListeners = setupKasirTunggakanHandlers;

/**
 * Merender daftar khusus tunggakan denda (status 'Belum Lunas')
 */
export function renderTunggakanDendaList() {
  const container = document.getElementById('listTunggakanDenda');
  if (!container) return;

  const allPengembalian = state.cache.pengembalian || [];
  let tunggakanList = allPengembalian.filter(item => item.status_denda === 'Belum Lunas');

  if (searchQueryTunggakan) {
    tunggakanList = tunggakanList.filter(item => {
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;
      const nama = (borrower?.nama || '').toLowerCase();
      const borrowerId = (borrower?.id || '').toLowerCase();
      const idPeminjaman = (item?.id_peminjaman || '').toLowerCase();
      const idPengembalian = (item?.id_pengembalian || '').toLowerCase();
      const judul = (buku?.judul_buku || '').toLowerCase();

      return (
        nama.includes(searchQueryTunggakan) ||
        borrowerId.includes(searchQueryTunggakan) ||
        idPeminjaman.includes(searchQueryTunggakan) ||
        idPengembalian.includes(searchQueryTunggakan) ||
        judul.includes(searchQueryTunggakan)
      );
    });
  }

  if (tunggakanList.length === 0) {
    const isSearching = searchQueryTunggakan.length > 0;
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-check-circle text-3xl inline-block mb-1 text-emerald-500"></i>
        <h5 class="text-xs font-bold text-slate-700">${isSearching ? 'Tunggakan denda tidak ditemukan' : 'Tidak ada tagihan tunggakan denda!'}</h5>
        <p class="text-[11px] text-slate-400 mt-0.5">${isSearching ? 'Coba ubah kata kunci pencarian.' : 'Semua peminjam tertib atau denda telah lunas.'}</p>
      </div>
    `;
    return;
  }

  let html = '';
  tunggakanList.forEach(item => {
    const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? `${borrower.nama} (${borrower.badge})` : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

    let rincianPelanggaran = [];
    if (item.keterlambatan > 0) rincianPelanggaran.push(`Terlambat ${item.keterlambatan} Hari`);
    if (item.kondisi_buku && item.kondisi_buku !== 'Baik') rincianPelanggaran.push(`Kondisi: ${item.kondisi_buku}`);
    const rincianText = rincianPelanggaran.join(' &bull; ') || 'Denda Operasional';

    html += `
      <div class="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50/60 to-white p-3.5 transition hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">${item.id_pengembalian}</span>
            <span class="text-xs font-extrabold text-slate-900">${namaSiswa}</span>
            <span class="text-[10px] text-slate-500">${borrower.sub}</span>
          </div>
          <p class="text-xs font-medium text-slate-700 line-clamp-1">
            <i class="ph ph-book-open text-slate-400 mr-1"></i>${judulBuku}
          </p>
          <div class="flex items-center gap-2 text-[10px] text-rose-600 font-semibold">
            <i class="ph ph-warning-circle"></i>
            <span>${rincianText}</span>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-100">
          <div class="text-left sm:text-right">
            <span class="text-[10px] text-slate-400 block font-medium">Tagihan Denda</span>
            <span class="text-base font-black text-rose-600">${formatRupiah(item.denda)}</span>
          </div>
          <button type="button" data-id="${item.id_pengembalian}"
            class="btn-trigger-lunasi-tunggakan inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs">
            <i class="ph ph-hand-coins text-sm"></i>
            <span>Lunasi Tunai</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Pasang listener pada tombol Lunasi
  container.querySelectorAll('.btn-trigger-lunasi-tunggakan').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = tunggakanList.find(i => i.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });
}

/**
 * Membuka Modal Konfirmasi Pelunasan Denda 2 Lapis
 */
export function openModalKonfirmasiLunasiDenda(item) {
  targetPaymentItem = item;

  const modalLunasi = document.getElementById('modalKonfirmasiLunasiDenda');
  const modalLunasiContent = document.getElementById('modalKonfirmasiLunasiDendaContent');
  if (!modalLunasi) return;

  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
  const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
  const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

  const elId = document.getElementById('lunasiIdPengembalian');
  const elNama = document.getElementById('lunasiNamaPeminjam');
  const elBuku = document.getElementById('lunasiJudulBuku');
  const elRincian = document.getElementById('lunasiRincianDenda');
  const elNominal = document.getElementById('lunasiNominalDenda');
  const elCheckRupiah = document.getElementById('lunasiCheckRupiah');
  const checkUang = document.getElementById('checkUangDiterima');
  const btnEksekusi = document.getElementById('btnEksekusiLunasiModal');

  if (elId) elId.textContent = item.id_pengembalian;
  if (elNama) elNama.textContent = `${borrower.nama} (${borrower.badge}) - ${borrower.sub}`;
  if (elBuku) elBuku.textContent = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

  let rincian = [];
  if (item.keterlambatan > 0) rincian.push(`Terlambat ${item.keterlambatan} Hari`);
  if (item.kondisi_buku && item.kondisi_buku !== 'Baik') rincian.push(`Kondisi: ${item.kondisi_buku}`);
  if (elRincian) elRincian.textContent = rincian.join(', ') || 'Denda Operasional';

  const nominalFmt = formatRupiah(item.denda);
  if (elNominal) elNominal.textContent = nominalFmt;
  if (elCheckRupiah) elCheckRupiah.textContent = nominalFmt;

  // Reset checkbox pengaman & disable tombol
  if (checkUang) checkUang.checked = false;
  if (btnEksekusi) btnEksekusi.disabled = true;

  showModal(modalLunasi, modalLunasiContent);
}

/**
 * Mengeksekusi perubahan status denda menjadi 'Lunas' di Supabase
 */
export async function executePelunasanDenda(item) {
  try {
    showToast('Memproses pelunasan denda...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Lunas' })
      .eq('id_pengembalian', item.id_pengembalian);

    if (error) throw error;

    showToast(`Denda sebesar ${formatRupiah(item.denda)} berhasil dilunasi!`, 'success');

    // Sinkronisasi data ulang
    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllData();
    }
  } catch (err) {
    console.error('Gagal melunasi denda:', err);
    showToast('Gagal memproses pelunasan: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Fitur Keselamatan Rollback: Membatalkan status Lunas jika ada salah catat oleh petugas
 */
export async function handleBatalkanLunasDenda(idPengembalian) {
  const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
  if (!item) return;

  const konfirmasi = confirm(`Batalkan status lunas untuk ${idPengembalian} (${formatRupiah(item.denda)})? Status akan kembali menjadi 'Belum Lunas'.`);
  if (!konfirmasi) return;

  try {
    showToast('Mengembalikan status denda...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Belum Lunas' })
      .eq('id_pengembalian', idPengembalian);

    if (error) throw error;

    showToast('Status denda berhasil dikembalikan menjadi Belum Lunas!', 'warning');

    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllData();
    }
  } catch (err) {
    console.error('Gagal membatalkan status lunas:', err);
    showToast('Gagal membatalkan lunas: ' + (err.message || 'Error Supabase'), 'error');
  }
}

// Buka akses global
if (typeof window !== 'undefined') {
  window.openModalKonfirmasiLunasiDenda = openModalKonfirmasiLunasiDenda;
  window.executePelunasanDenda = executePelunasanDenda;
  window.handleBatalkanLunasDenda = handleBatalkanLunasDenda;
  window.renderTunggakanDendaList = renderTunggakanDendaList;
}
