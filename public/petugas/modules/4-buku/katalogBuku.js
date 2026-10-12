/**
 * CAKRAWALA Digital Library - Modul Katalog & Inventaris Koleksi Buku
 * File: public/petugas/modules/4-buku/katalogBuku.js
 * 
 * FUNGSI:
 * - Menampilkan daftar buku beserta status ketersediaan, cover, kategori, rak, dan harga
 * - Filter berdasarkan kategori dan status ketersediaan (Tersedia / Dipinjam Habis)
 * - Pencarian multi-kriteria (Judul, Penulis, Penerbit, ID Buku)
 * - Menghubungkan tombol aksi: Lihat QR, Edit Buku, dan Hapus Buku
 */

import { state } from '../core/state.js';
import { formatRupiah, showToast } from '../core/petugasHelper.js';
import { syncAllTables } from '../core/syncData.js';
import { openBookModal, setupBookFormModal } from './modalFormBuku.js';
import { openQrCodeModal, setupQrCodeModal } from './modalQrBuku.js';
import { openDeleteBookModal, setupDeleteBookModal } from './modalHapusBuku.js';

let isBooksHandlersSetup = false;

/**
 * Mengisi opsi dropdown kategori buku pada filter pencarian dan formulir modal
 */
export function renderCategoryDropdowns() {
  const filterSelect = document.getElementById('selectFilterKategori');
  const modalSelect = document.getElementById('selectKategoriBuku');

  let filterOptions = '<option value="">Semua Kategori</option>';
  let modalOptions = '<option value="">-- Pilih Kategori --</option>';

  (state.cache.kategori || []).forEach(kat => {
    filterOptions += `<option value="${kat.id_kategori}">${kat.nama_kategori}</option>`;
    modalOptions += `<option value="${kat.id_kategori}">${kat.nama_kategori}</option>`;
  });

  if (filterSelect) filterSelect.innerHTML = filterOptions;
  if (modalSelect) modalSelect.innerHTML = modalOptions;
}

/**
 * Merender daftar tabel katalog inventaris buku
 */
export function renderBooksInventory() {
  const tbody = document.getElementById('tableBooksBody');
  const recordCount = document.getElementById('booksRecordCount');
  const tableInfo = document.getElementById('booksTableInfo');
  if (!tbody) return;

  let filtered = [...(state.cache.buku || [])];

  if (state.filterCategoryBook) {
    filtered = filtered.filter(b => b.id_kategori === state.filterCategoryBook);
  }

  if (state.filterStatusBook) {
    filtered = filtered.filter(b => b.status === state.filterStatusBook);
  }

  if (state.searchBooksQuery) {
    const q = state.searchBooksQuery.toLowerCase();
    filtered = filtered.filter(b => {
      const matchTitle = (b.judul_buku || '').toLowerCase().includes(q);
      const matchAuthor = (b.penulis || '').toLowerCase().includes(q);
      const matchPublisher = (b.penerbit || '').toLowerCase().includes(q);
      const matchId = (b.id_buku || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchPublisher || matchId;
    });
  }

  if (recordCount) recordCount.textContent = `${filtered.length} Buku`;
  if (tableInfo) {
    tableInfo.textContent = `Menampilkan ${filtered.length} dari ${(state.cache.buku || []).length} total koleksi buku.`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-books text-3xl inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada buku yang ditemukan.</p>
          <p class="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  filtered.forEach(book => {
    const kategori = (state.cache.kategori || []).find(k => k.id_kategori === book.id_kategori);
    const namaKategori = kategori ? kategori.nama_kategori : '-';
    const coverUrl = book.cover_url || null;
    const stok = Number(book.stok) || 0;

    let statusBadge = '';
    if (stok > 0) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Tersedia (${stok})
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600"></span> Dipinjam Habis
        </span>
      `;
    }

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-12 w-9 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" onerror="this.src='';this.parentElement.innerHTML='<i class=\\'ph ph-book text-base\\'></i>'" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div>
              <span class="font-mono text-xs font-bold text-navy">${book.id_buku}</span>
              <p class="text-[10px] text-slate-400">Tahun: ${book.tahun_terbit}</p>
            </div>
          </div>
        </td>

        <td class="px-5 py-3">
          <p class="font-bold text-slate-800 text-xs line-clamp-1">${book.judul_buku}</p>
          <p class="text-[11px] text-slate-500">${book.penulis} &bull; <span class="text-slate-400">${book.penerbit}</span></p>
        </td>

        <td class="px-5 py-3 text-xs">
          <span class="font-semibold text-slate-700 block">${namaKategori}</span>
          <span class="inline-block mt-0.5 rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-navy">${book.keterangan || 'Rak Umum'}</span>
        </td>

        <td class="px-5 py-3">
          ${statusBadge}
        </td>

        <td class="px-5 py-3 text-xs font-bold text-slate-700">
          ${formatRupiah(book.harga_buku)}
        </td>

        <td class="px-5 py-3 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button type="button" data-action="view-qr" data-id="${book.id_buku}" title="Lihat & Cetak Label QR"
              class="btn-view-qr flex h-8 w-8 items-center justify-center rounded-lg bg-navy/10 text-navy hover:bg-navy hover:text-white transition">
              <i class="ph ph-qr-code text-base"></i>
            </button>

            <button type="button" data-action="edit-book" data-id="${book.id_buku}" title="Edit Buku"
              class="btn-edit-book flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-navy transition">
              <i class="ph ph-pencil-simple text-base"></i>
            </button>

            <button type="button" data-action="delete-book" data-id="${book.id_buku}" title="Hapus Buku"
              class="btn-delete-book flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
              <i class="ph ph-trash text-base"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  tbody.querySelectorAll('.btn-view-qr').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openQrCodeModal(id);
    });
  });

  tbody.querySelectorAll('.btn-edit-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openBookModal('edit', id);
    });
  });

  tbody.querySelectorAll('.btn-delete-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDeleteBookModal(id);
    });
  });
}

/**
 * Memasang pendengar peristiwa (event listener) pada modul inventaris buku
 */
export function setupBooksHandlers() {
  if (isBooksHandlersSetup) return;
  isBooksHandlersSetup = true;

  const searchInput = document.getElementById('inputSearchBooks');
  const clearSearchBtn = document.getElementById('btnClearSearchBooks');
  const filterKatSelect = document.getElementById('selectFilterKategori');
  const filterStatusSelect = document.getElementById('selectFilterStatusBuku');
  const refreshBtn = document.getElementById('btnRefreshBooks');
  const openAddBtn = document.getElementById('btnOpenAddBookModal');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchBooksQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        if (state.searchBooksQuery) {
          clearSearchBtn.classList.remove('hidden');
        } else {
          clearSearchBtn.classList.add('hidden');
        }
      }
      renderBooksInventory();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchBooksQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderBooksInventory();
    });
  }

  if (filterKatSelect) {
    filterKatSelect.addEventListener('change', e => {
      state.filterCategoryBook = e.target.value;
      renderBooksInventory();
    });
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', e => {
      state.filterStatusBook = e.target.value;
      renderBooksInventory();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui inventaris buku...', 'info');
      if (window.fetchAllData) {
        await window.fetchAllData();
      } else {
        await syncAllTables();
      }
    });
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => openBookModal('add'));
  }

  setupBookFormModal();
  setupQrCodeModal();
  setupDeleteBookModal();
}

// Window bindings
if (typeof window !== 'undefined') {
  window.renderBooksInventory = renderBooksInventory;
  window.renderCategoryDropdowns = renderCategoryDropdowns;
  window.setupBooksHandlers = setupBooksHandlers;
}
