/**
 * CAKRAWALA Digital Library - Modul Meja Pengembalian: Riwayat & Kasir Tunggakan Denda
 * File: public/petugas/modules/pengembalian/riwayatDenda.js
 * 
 * FUNGSI:
 * - Menampilkan daftar tunggakan denda siswa/guru (status 'Belum Lunas')
 * - Menampilkan histori arsip seluruh pengembalian buku
 * - Menangani dialog konfirmasi pelunasan uang kas denda tunai
 * - Menangani pembatalan pelunasan (safety net / rollback)
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../petugasHelper.js';

// Local state khusus sub-panel denda & riwayat
export const fineSubtabState = {
  activeTab: 'tunggakan', // 'tunggakan' | 'riwayat'
  searchTunggakan: '',
  searchRiwayat: '',
  filterRiwayatStatus: 'semua', // 'semua' | 'lunas' | 'tanpa-denda'
  targetPaymentItem: null
};

let isRiwayatDendaSetup = false;

/**
 * Setup seluruh pendengar event pada sub-tab denda dan modal pelunasan
 */
export function setupRiwayatDendaHandlers() {
  if (isRiwayatDendaSetup) return;
  isRiwayatDendaSetup = true;

  const tabBtnTunggakan = document.getElementById('tabBtnTunggakanDenda');
  const tabBtnRiwayat = document.getElementById('tabBtnSemuaRiwayat');
  const viewTunggakan = document.getElementById('viewTunggakanDenda');
  const viewRiwayat = document.getElementById('viewSemuaRiwayat');

  function switchFineSubtab(tab) {
    fineSubtabState.activeTab = tab;
    if (tab === 'tunggakan') {
      if (tabBtnTunggakan) {
        tabBtnTunggakan.className = 'tab-denda-btn flex-1 py-2 px-3 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs flex items-center justify-center gap-1.5';
      }
      if (tabBtnRiwayat) {
        tabBtnRiwayat.className = 'tab-denda-btn flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition text-slate-500 hover:text-navy flex items-center justify-center gap-1.5';
      }
      if (viewTunggakan) viewTunggakan.classList.remove('hidden');
      if (viewRiwayat) viewRiwayat.classList.add('hidden');
    } else {
      if (tabBtnRiwayat) {
        tabBtnRiwayat.className = 'tab-denda-btn flex-1 py-2 px-3 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs flex items-center justify-center gap-1.5';
      }
      if (tabBtnTunggakan) {
        tabBtnTunggakan.className = 'tab-denda-btn flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition text-slate-500 hover:text-navy flex items-center justify-center gap-1.5';
      }
      if (viewRiwayat) viewRiwayat.classList.remove('hidden');
      if (viewTunggakan) viewTunggakan.classList.add('hidden');
    }
  }

  if (tabBtnTunggakan) tabBtnTunggakan.addEventListener('click', () => switchFineSubtab('tunggakan'));
  if (tabBtnRiwayat) tabBtnRiwayat.addEventListener('click', () => switchFineSubtab('riwayat'));

  // Search input tunggakan
  const inputSearchTunggakan = document.getElementById('inputSearchTunggakanDenda');
  if (inputSearchTunggakan) {
    inputSearchTunggakan.addEventListener('input', () => {
      fineSubtabState.searchTunggakan = inputSearchTunggakan.value.trim().toLowerCase();
      renderTunggakanDendaList();
    });
  }

  // Search input semua riwayat
  const inputSearchRiwayat = document.getElementById('inputSearchRiwayatAll');
  if (inputSearchRiwayat) {
    inputSearchRiwayat.addEventListener('input', () => {
      fineSubtabState.searchRiwayat = inputSearchRiwayat.value.trim().toLowerCase();
      renderSemuaRiwayatList();
    });
  }

  // Filter status riwayat
  const filterPillSemua = document.getElementById('filterRiwayatSemua');
  const filterPillLunas = document.getElementById('filterRiwayatLunas');
  const filterPillTanpaDenda = document.getElementById('filterRiwayatTanpaDenda');

  function updateRiwayatPills(activePillKey) {
    fineSubtabState.filterRiwayatStatus = activePillKey;
    const pills = [
      { el: filterPillSemua, key: 'semua' },
      { el: filterPillLunas, key: 'lunas' },
      { el: filterPillTanpaDenda, key: 'tanpa-denda' }
    ];
    pills.forEach(({ el, key }) => {
      if (!el) return;
      if (key === activePillKey) {
        el.className = 'filter-riwayat-pill px-2.5 py-1 text-[11px] font-bold rounded-md transition bg-navy text-white';
      } else {
        el.className = 'filter-riwayat-pill px-2.5 py-1 text-[11px] font-semibold rounded-md transition text-slate-500 hover:text-navy hover:bg-slate-100';
      }
    });
    renderSemuaRiwayatList();
  }

  if (filterPillSemua) filterPillSemua.addEventListener('click', () => updateRiwayatPills('semua'));
  if (filterPillLunas) filterPillLunas.addEventListener('click', () => updateRiwayatPills('lunas'));
  if (filterPillTanpaDenda) filterPillTanpaDenda.addEventListener('click', () => updateRiwayatPills('tanpa-denda'));

  // Setup Modal Lunasi Denda
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
      fineSubtabState.targetPaymentItem = null;
    });
  }

  if (modalLunasi) {
    modalLunasi.addEventListener('click', e => {
      if (e.target === modalLunasi) {
        hideModal(modalLunasi, modalLunasiContent);
        fineSubtabState.targetPaymentItem = null;
      }
    });
  }

  if (btnEksekusiLunasiModal) {
    btnEksekusiLunasiModal.addEventListener('click', async () => {
      if (!fineSubtabState.targetPaymentItem) return;
      await executePelunasanDenda(fineSubtabState.targetPaymentItem.id_pengembalian);
    });
  }
}

/**
 * Menampilkan riwayat pengembalian dan tunggakan denda pada Meja 3
 */
export function renderRiwayatPengembalian() {
  const list = state.cache.pengembalian || [];
  
  // Hitung tunggakan denda (status 'Belum Lunas')
  const tunggakanList = list.filter(item => item.status_denda === 'Belum Lunas');
  const totalNominalTunggakan = tunggakanList.reduce((acc, curr) => acc + (Number(curr.denda) || 0), 0);
  
  // Perbarui Badge & Ringkasan Kas
  const badgeTunggakan = document.getElementById('badgeCountTunggakanDenda');
  const badgeRiwayat = document.getElementById('badgeCountSemuaRiwayat');
  const summaryRupiah = document.getElementById('summaryTotalTunggakanRupiah');
  const summarySiswa = document.getElementById('summaryTotalSiswaTunggakan');

  if (badgeTunggakan) badgeTunggakan.textContent = tunggakanList.length;
  if (badgeRiwayat) badgeRiwayat.textContent = list.length;
  if (summaryRupiah) summaryRupiah.textContent = formatRupiah(totalNominalTunggakan);
  if (summarySiswa) summarySiswa.textContent = `${tunggakanList.length} Transaksi`;

  // Render kedua list
  renderTunggakanDendaList();
  renderSemuaRiwayatList();
}

/**
 * Merender daftar khusus tunggakan denda (status 'Belum Lunas')
 */
export function renderTunggakanDendaList() {
  const container = document.getElementById('listTunggakanDenda');
  if (!container) return;

  const list = state.cache.pengembalian || [];
  let unpaid = list.filter(item => item.status_denda === 'Belum Lunas');

  if (fineSubtabState.searchTunggakan) {
    const q = fineSubtabState.searchTunggakan;
    unpaid = unpaid.filter(item => {
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;
      return (
        borrower.nama.toLowerCase().includes(q) ||
        borrower.id.toLowerCase().includes(q) ||
        (item.id_pengembalian && item.id_pengembalian.toLowerCase().includes(q)) ||
        (buku && buku.judul_buku.toLowerCase().includes(q))
      );
    });
  }

  if (unpaid.length === 0) {
    const isSearching = fineSubtabState.searchTunggakan.length > 0;
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-check-circle text-3xl text-emerald-500 inline-block mb-1"></i>
        <h5 class="text-xs font-bold text-slate-700">${isSearching ? 'Tidak ada data tunggakan yang cocok' : 'Tidak Ada Tunggakan Denda!'}</h5>
        <p class="text-[11px] text-slate-400 mt-0.5">${isSearching ? 'Coba cari nama siswa atau kata kunci lain.' : 'Seluruh peminjam telah melunasi denda perpustakaan.'}</p>
      </div>
    `;
    return;
  }

  let html = '';
  unpaid.forEach(item => {
    const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? borrower.nama : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');
    const initial = (namaSiswa || 'S').charAt(0).toUpperCase();

    // Rincian alasan pelanggaran
    const alasan = [];
    if (item.keterlambatan > 0) alasan.push(`Terlambat ${item.keterlambatan} Hari`);
    if (item.kondisi_buku && item.kondisi_buku !== 'Baik') alasan.push(`Kondisi: ${item.kondisi_buku}`);
    const alasanStr = alasan.length > 0 ? alasan.join(' &bull; ') : 'Denda Keterlambatan';

    html += `
      <div class="rounded-xl border border-rose-200 bg-white p-3 hover:shadow-xs transition space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-extrabold text-xs">
              ${initial}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h5 class="text-xs font-extrabold text-slate-900 truncate" title="${namaSiswa}">${namaSiswa}</h5>
                <span class="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">${borrower.badge}</span>
              </div>
              <p class="text-[11px] text-slate-500 truncate mt-0.5">${borrower.sub} &bull; <span class="font-mono">${borrower.id}</span></p>
            </div>
          </div>
          <span class="font-mono text-[10px] text-slate-400 font-bold shrink-0">${item.id_pengembalian}</span>
        </div>

        <div class="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1 border border-slate-100">
          <p class="text-slate-700 font-medium line-clamp-1">Buku: <strong class="text-slate-900">"${judulBuku}"</strong></p>
          <div class="flex items-center justify-between text-slate-500">
            <span>Pelanggaran: <span class="text-rose-700 font-semibold">${alasanStr}</span></span>
            <span>Tgl: ${formatTanggalIndo(item.tanggal_kembali)}</span>
          </div>
        </div>

        <div class="pt-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">Tunggakan Kasir:</span>
            <span class="text-sm font-black text-rose-600">${formatRupiah(item.denda)}</span>
          </div>
          <button type="button" data-id="${item.id_pengembalian}"
            class="btn-trigger-lunasi inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs">
            <i class="ph ph-hand-coins text-sm"></i>
            <span>Lunasi Denda</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-trigger-lunasi').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });
}

/**
 * Merender daftar semua riwayat pengembalian (Arsip / Log)
 */
export function renderSemuaRiwayatList() {
  const container = document.getElementById('listRiwayatPengembalian');
  if (!container) return;

  const list = state.cache.pengembalian || [];
  let filtered = [...list];

  // Filter status pills
  if (fineSubtabState.filterRiwayatStatus === 'lunas') {
    filtered = filtered.filter(item => item.status_denda === 'Lunas');
  } else if (fineSubtabState.filterRiwayatStatus === 'tanpa-denda') {
    filtered = filtered.filter(item => item.status_denda === 'Tidak Ada');
  }

  // Filter search
  if (fineSubtabState.searchRiwayat) {
    const q = fineSubtabState.searchRiwayat;
    filtered = filtered.filter(item => {
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;
      return (
        borrower.nama.toLowerCase().includes(q) ||
        borrower.id.toLowerCase().includes(q) ||
        (item.id_pengembalian && item.id_pengembalian.toLowerCase().includes(q)) ||
        (buku && buku.judul_buku.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <i class="ph ph-receipt text-3xl inline-block mb-1 text-slate-300"></i>
        <p class="text-xs font-semibold text-slate-600">Tidak ada riwayat pengembalian yang cocok.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.slice(0, 30).forEach(item => {
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
      <div class="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-xs transition">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-bold text-slate-800 text-xs">${namaSiswa}</p>
            <p class="text-[11px] text-slate-600 line-clamp-1">"${judulBuku}"</p>
          </div>
          <span class="font-mono text-[10px] text-slate-400 font-bold">${item.id_pengembalian}</span>
        </div>

        <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span class="text-slate-500">Tgl: ${formatTanggalIndo(item.tanggal_kembali)} &bull; Fisik: <strong>${item.kondisi_buku}</strong></span>
          <div>${badgeDenda}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-trigger-lunasi-from-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });

  container.querySelectorAll('.btn-rollback-lunas').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idPengembalian = btn.getAttribute('data-id');
      await handleBatalkanLunasDenda(idPengembalian);
    });
  });
}

/**
 * Membuka Modal Konfirmasi Pelunasan Denda Tunai
 */
export function openModalKonfirmasiLunasiDenda(item) {
  fineSubtabState.targetPaymentItem = item;

  const modal = document.getElementById('modalKonfirmasiLunasiDenda');
  const content = document.getElementById('modalKonfirmasiLunasiDendaContent');
  if (!modal) return;

  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
  const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
  const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

  const elId = document.getElementById('lunasiIdPengembalian');
  const elNama = document.getElementById('lunasiNamaPeminjam');
  const elBuku = document.getElementById('lunasiJudulBuku');
  const elRincian = document.getElementById('lunasiRincianDenda');
  const elNominal = document.getElementById('lunasiNominalDenda');
  const elCheckRupiah = document.getElementById('lunasiCheckRupiah');
  const check = document.getElementById('checkUangDiterima');
  const btnSubmit = document.getElementById('btnEksekusiLunasiModal');

  if (elId) elId.textContent = item.id_pengembalian;
  if (elNama) elNama.textContent = `${borrower.nama} (${borrower.badge}) - ${borrower.id}`;
  if (elBuku) elBuku.textContent = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

  const alasan = [];
  if (item.keterlambatan > 0) alasan.push(`Terlambat ${item.keterlambatan} Hari`);
  if (item.kondisi_buku && item.kondisi_buku !== 'Baik') alasan.push(`Kondisi: ${item.kondisi_buku}`);
  if (elRincian) elRincian.textContent = alasan.length > 0 ? alasan.join(', ') : 'Denda Keterlambatan';

  const rupiahFormatted = formatRupiah(item.denda);
  if (elNominal) elNominal.textContent = rupiahFormatted;
  if (elCheckRupiah) elCheckRupiah.textContent = rupiahFormatted;

  if (check) check.checked = false;
  if (btnSubmit) btnSubmit.disabled = true;

  showModal(modal, content);
}

// Buka akses global
if (typeof window !== 'undefined') {
  window.openModalKonfirmasiLunasiDenda = openModalKonfirmasiLunasiDenda;
}

/**
 * Eksekusi resmi pelunasan denda ke database Supabase setelah uang diterima
 */
export async function executePelunasanDenda(idPengembalian) {
  const modal = document.getElementById('modalKonfirmasiLunasiDenda');
  const content = document.getElementById('modalKonfirmasiLunasiDendaContent');
  const btnSubmit = document.getElementById('btnEksekusiLunasiModal');

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Memproses...';
    }

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Lunas' })
      .eq('id_pengembalian', idPengembalian);
    if (error) throw error;

    hideModal(modal, content);
    fineSubtabState.targetPaymentItem = null;
    showToast(`Denda [${idPengembalian}] berhasil ditandai LUNAS! Uang kas telah dicatat.`, 'success');

    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal melunasi denda:', err);
    showToast('Gagal memproses pelunasan: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="ph ph-check-circle text-base"></i> <span>Ya, Tandai Lunas</span>';
    }
  }
}

/**
 * Safety Net: Mengembalikan status denda dari 'Lunas' ke 'Belum Lunas' jika ada salah klik
 */
export async function handleBatalkanLunasDenda(idPengembalian) {
  const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
  const nominal = item ? formatRupiah(item.denda) : '';

  if (!confirm(`Batalkan status Lunas untuk bukti [${idPengembalian}] (${nominal})?\n\nStatus akan dikembalikan menjadi 'Belum Lunas' dan muncul kembali di daftar tunggakan kasir.`)) {
    return;
  }

  try {
    showToast('Mengembalikan status ke Belum Lunas...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Belum Lunas' })
      .eq('id_pengembalian', idPengembalian);
    if (error) throw error;

    showToast(`Status denda [${idPengembalian}] dikembalikan menjadi Belum Lunas.`, 'info');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal mengembalikan status denda:', err);
    showToast('Gagal mengubah status: ' + (err.message || 'Error Supabase'), 'error');
  }
}
