/**
 * CAKRAWALA Digital Library - Modul Grid Katalog, Pencarian & Filter
 * File: public/siswa-guru/modules/katalog/katalogGrid.js
 * 
 * Tanggung Jawab:
 * - Menangani input pencarian kata kunci buku
 * - Menangani dropdown penyaringan kategori dan status stok
 * - Merender kartu-kartu buku pada elemen grid #gridKatalogBuku
 * - Memeriksa kuota aktif pinjaman dan badge status ketersediaan
 * - Mendeteksi URL redirect (?action=pinjam&buku_id=...)
 */

import { state } from '../state.js';
import {
  MAX_ACTIVE_LOANS,
  getUserActiveLoansCount,
  getActiveUserLoanForBook,
  openBookingModal
} from './modalBooking.js';

/**
 * Setup event listeners untuk input pencarian dan dropdown filter
 */
export function setupKatalogFilters() {
  const searchInput = document.getElementById('inputSearchKatalog');
  const clearSearchBtn = document.getElementById('btnClearSearchKatalog');
  const filterKategoriSelect = document.getElementById('selectFilterKategoriKatalog');
  const filterStokSelect = document.getElementById('selectFilterStokKatalog');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchKatalogQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !state.searchKatalogQuery);
      }
      renderKatalogGrid();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchKatalogQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderKatalogGrid();
    });
  }

  if (filterKategoriSelect) {
    filterKategoriSelect.addEventListener('change', e => {
      state.filterKategori = e.target.value;
      renderKatalogGrid();
    });
  }

  if (filterStokSelect) {
    filterStokSelect.addEventListener('change', e => {
      state.filterKetersediaan = e.target.value;
      renderKatalogGrid();
    });
  }
}

/**
 * Mengisi opsi filter dropdown kategori buku
 */
export function renderKategoriOptions() {
  const select = document.getElementById('selectFilterKategoriKatalog');
  if (!select) return;

  const list = state.cache.kategori || [];
  let html = '<option value="">Semua Kategori</option>';

  list.forEach(item => {
    html += `<option value="${item.id_kategori}">${item.nama_kategori}</option>`;
  });

  select.innerHTML = html;
  if (state.filterKategori) {
    select.value = state.filterKategori;
  }
}

/**
 * Merender kartu grid buku perpustakaan berdasarkan kata kunci dan filter
 */
export function renderKatalogGrid() {
  const container = document.getElementById('gridKatalogBuku') || document.getElementById('containerGridKatalog');
  const recordCount = document.getElementById('katalogRecordCount') || document.getElementById('badgeCountTotalKoleksi');
  const tableInfo = document.getElementById('katalogTableInfo') || document.getElementById('infoTotalKatalogKoleksi');
  if (!container) return;

  let filtered = [...(state.cache.buku || [])];

  if (state.filterKategori) {
    filtered = filtered.filter(b => b.id_kategori === state.filterKategori);
  }

  if (state.filterKetersediaan === 'tersedia') {
    filtered = filtered.filter(b => (Number(b.stok) || 0) > 0);
  } else if (state.filterKetersediaan === 'dipinjam') {
    filtered = filtered.filter(b => (Number(b.stok) || 0) <= 0);
  }

  if (state.searchKatalogQuery) {
    const q = state.searchKatalogQuery;
    filtered = filtered.filter(b => {
      const matchTitle = (b.judul_buku || '').toLowerCase().includes(q);
      const matchAuthor = (b.penulis || '').toLowerCase().includes(q);
      const matchPublisher = (b.penerbit || '').toLowerCase().includes(q);
      const matchId = (b.id_buku || '').toLowerCase().includes(q);
      const matchRak = (b.keterangan || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchPublisher || matchId || matchRak;
    });
  }

  const totalBukuCount = (state.cache.buku || []).length;
  if (recordCount) recordCount.textContent = `${filtered.length} Koleksi`;
  if (tableInfo) {
    tableInfo.textContent = `Menampilkan ${filtered.length} dari ${totalBukuCount} total koleksi buku perpustakaan.`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i class="ph ph-books text-4xl inline-block mb-2 text-slate-300"></i>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada buku yang ditemukan</h4>
        <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter kategori.</p>
      </div>
    `;
    return;
  }

  const activeCount = getUserActiveLoansCount();
  const isQuotaFull = activeCount >= MAX_ACTIVE_LOANS;

  container.innerHTML = filtered.map(b => {
    const coverUrl = b.cover_url || null;
    const kategori = (state.cache.kategori || []).find(k => k.id_kategori === b.id_kategori);
    const namaKat = kategori ? kategori.nama_kategori : 'Koleksi Umum';
    const stok = Number(b.stok) || 0;
    const isAvailable = stok > 0;
    const activeLoan = getActiveUserLoanForBook(b.id_buku);

    let stokBadge = '';
    if (activeLoan) {
      if (activeLoan.status === 'Menunggu') {
        stokBadge = `
          <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-600"></span> Anda Sudah Booking
          </span>
        `;
      } else {
        stokBadge = `
          <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span> Sedang Anda Pinjam
          </span>
        `;
      }
    } else if (isQuotaFull) {
      stokBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          <i class="ph ph-lock-key text-xs"></i> Kuota Penuh (2/2)
        </span>
      `;
    } else if (isAvailable) {
      stokBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Tersedia (${stok})
        </span>
      `;
    } else {
      stokBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600"></span> Stok Habis
        </span>
      `;
    }

    let actionBtn = '';
    if (activeLoan) {
      if (activeLoan.status === 'Menunggu') {
        actionBtn = `
          <button type="button" disabled
            class="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
            <i class="ph ph-hourglass-high text-sm"></i>
            <span>Menunggu Diambil</span>
          </button>
        `;
      } else {
        actionBtn = `
          <button type="button" disabled
            class="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-navy font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
            <i class="ph ph-book-open text-sm"></i>
            <span>Sedang Dipinjam</span>
          </button>
        `;
      }
    } else if (isQuotaFull) {
      actionBtn = `
        <button type="button" disabled title="Maksimal 2 buku aktif per siswa/guru. Kembalikan buku terlebih dahulu."
          class="w-full py-2 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
          <i class="ph ph-lock-key text-sm"></i>
          <span>Kuota Penuh (2/2)</span>
        </button>
      `;
    } else if (isAvailable) {
      actionBtn = `
        <button type="button" onclick="if(window.openBookingModal) window.openBookingModal('${b.id_buku}')"
          class="w-full py-2 px-3 rounded-xl bg-navy text-white font-bold text-xs hover:bg-navy-light transition shadow-xs flex items-center justify-center gap-1.5">
          <i class="ph ph-bookmark-simple text-sm"></i>
          <span>Booking Buku</span>
        </button>
      `;
    } else {
      actionBtn = `
        <button type="button" disabled
          class="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
          <span>Stok Habis</span>
        </button>
      `;
    }

    return `
      <div class="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
        <div>
          <!-- Thumbnail Sampul Buku -->
          <div class="relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-[1.02] transition-transform duration-200 shadow-2xs">
            ${coverUrl ? `<img src="${coverUrl}" alt="Sampul ${b.judul_buku}" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-4xl text-slate-300"></i>'}
            <span class="absolute top-2.5 left-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-navy shadow-2xs border border-slate-200/60 font-mono">
              ${b.keterangan || 'Rak Umum'}
            </span>
          </div>

          <!-- Kategori & Status Ketersediaan -->
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <span class="text-[11px] font-bold text-slate-500 truncate max-w-[120px]">${namaKat}</span>
            <div>${stokBadge}</div>
          </div>

          <!-- Judul Buku & Penulis -->
          <h4 class="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-navy transition cursor-pointer"
            onclick="if(window.openDetailModal) window.openDetailModal('${b.id_buku}')" title="${b.judul_buku}">
            ${b.judul_buku}
          </h4>
          <p class="text-xs text-slate-500 mt-1 truncate">${b.penulis || 'Penulis Tidak Diketahui'}</p>
        </div>

        <!-- Tombol Aksi di Bawah Kartu -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          ${actionBtn}
          <button type="button" onclick="if(window.openDetailModal) window.openDetailModal('${b.id_buku}')"
            class="w-full py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-navy transition text-xs font-semibold flex items-center justify-center gap-1">
            <i class="ph ph-info text-sm"></i>
            <span>Lihat Detail</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Pengecekan otomatis parameter URL: ?action=pinjam&buku_id=BK-xxx
 */
export function checkUrlRedirectBooking() {
  if (typeof window === 'undefined' || !window.location) return;
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const bukuId = params.get('buku_id');

  if (action === 'pinjam' && bukuId) {
    setTimeout(() => {
      openBookingModal(bukuId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 600);
  }
}
