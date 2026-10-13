/**
 * CAKRAWALA Digital Library - Modul Data Petugas (Fetch, Filter, & Table Renderer)
 * File: public/admin/modules/3-petugas/dataPetugas.js
 * 
 * Tanggung Jawab:
 * - Mengambil dataset pustakawan/petugas sirkulasi dari Supabase secara realtime
 * - Merender baris tabel data petugas lengkap dengan thumbnail avatar & kontak
 * - Pencarian instan berdasarkan nama petugas, ID, email, atau username
 * - Penanganan aksi tombol Tambah, Edit, dan Hapus petugas
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { escapeHtml } from '../../../assets/js/sharedUtils.js';
import { state } from '../state.js';
import { openAddModal, openEditModal } from '../modalUser.js';
import { openDeleteModal } from '../modalKonfirmasi.js';
import { updateBadge } from '../table.js';

let searchListenerAttached = false;

/**
 * Render thumbnail pasfoto resmi petugas dengan inisial fallback
 */
function renderPetugasAvatarThumb(fotoUrl, name) {
  const initials = name ? name.substring(0, 2).toUpperCase() : 'PT';
  if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '') {
    return `
      <div class="h-8 w-8 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
        <img src="${fotoUrl}" alt="${escapeHtml(name)}" class="h-full w-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[11px] font-bold text-white\\'>${initials}</span>'; this.parentElement.className='h-8 w-8 shrink-0 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs';" />
      </div>
    `;
  }
  return `
    <div class="h-8 w-8 shrink-0 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
      ${initials}
    </div>
  `;
}

/**
 * Helper untuk memastikan relasi data_user terhubung dengan aman
 */
async function enrichPetugasWithUserData(rows) {
  if (!rows || rows.length === 0) return rows;

  const needsFallback = rows.some(r => r.id_user && (!r.data_user || typeof r.data_user !== 'object'));
  if (!needsFallback) return rows;

  try {
    const userIds = rows.map(r => r.id_user).filter(Boolean);
    if (userIds.length === 0) return rows;

    const { data: users, error } = await db
      .from('data_user')
      .select('id_user, username, role')
      .in('id_user', userIds);

    if (!error && users) {
      const userMap = {};
      users.forEach(u => { userMap[u.id_user] = u; });

      rows.forEach(r => {
        if (!r.data_user && r.id_user && userMap[r.id_user]) {
          r.data_user = userMap[r.id_user];
        }
      });
    }
  } catch (err) {
    console.warn('[DataPetugas] Fallback query data_user error:', err);
  }

  return rows;
}

/**
 * Mengambil data petugas dari Supabase
 */
export async function fetchPetugas() {
  console.log('[DataPetugas] Mengambil data petugas dari database Supabase...');
  const { data, error } = await db
    .from('data_petugas')
    .select('id_petugas, nama_petugas, email_petugas, kontak_petugas, foto_profil, id_user, data_user(id_user, username, role)')
    .order('nama_petugas', { ascending: true });

  if (error) {
    console.error('[DataPetugas] Gagal fetch data petugas:', error);
    throw error;
  }

  const enriched = await enrichPetugasWithUserData(data || []);
  state.cache.petugas = enriched;
  updateBadge('petugas', enriched.length);
  return enriched;
}

/**
 * Render baris tabel data petugas
 */
export function renderTablePetugas(customData = null) {
  const container = document.getElementById('tabPetugas');
  if (!container) return;

  const tableBody = container.querySelector('#tableBodyPetugas') || container.querySelector('tbody');
  const recordCount = container.querySelector('#tableRecordCountPetugas') || container.querySelector('.table-record-count');
  const headRow = container.querySelector('#tableHeadRowPetugas') || container.querySelector('thead tr');

  if (!tableBody) return;

  // Render Header Kolom jika belum ada
  if (headRow && headRow.children.length === 0) {
    headRow.innerHTML = `
      <th scope="col" class="px-6 py-3.5 text-center w-14">No</th>
      <th scope="col" class="px-6 py-3.5 text-left">ID Petugas</th>
      <th scope="col" class="px-6 py-3.5 text-left">Nama Petugas</th>
      <th scope="col" class="px-6 py-3.5 text-left">Email</th>
      <th scope="col" class="px-6 py-3.5 text-left">Kontak</th>
      <th scope="col" class="px-6 py-3.5 text-left">Username</th>
      <th scope="col" class="px-6 py-3.5 text-right">Aksi</th>
    `;
  }

  // Loading State
  if (state.isLoading && (!state.cache.petugas || state.cache.petugas.length === 0)) {
    if (recordCount) recordCount.textContent = 'Memuat...';
    tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
      <tr class="animate-pulse">
        <td class="px-6 py-4 text-center"><div class="h-4 w-6 bg-slate-200 rounded mx-auto"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-28 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-36 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-32 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4 text-right"><div class="h-8 w-16 bg-slate-200 rounded ml-auto"></div></td>
      </tr>
    `).join('');
    return;
  }

  // Filter Data
  const dataset = customData || state.cache.petugas || [];
  const searchInput = container.querySelector('#searchInputPetugas');
  const query = (searchInput ? searchInput.value : state.searchQuery || '').toLowerCase().trim();

  const filtered = query
    ? dataset.filter(r => {
      const username = (r.data_user && r.data_user.username) || '';
      return (
        (r.nama_petugas || '').toLowerCase().includes(query) ||
        (r.id_petugas || '').toLowerCase().includes(query) ||
        (r.email_petugas || '').toLowerCase().includes(query) ||
        username.toLowerCase().includes(query)
      );
    })
    : dataset;

  if (recordCount) {
    recordCount.textContent = `${filtered.length} Data`;
  }

  // Empty State
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <i class="ph ph-user-gear text-3xl"></i>
            </div>
            <h4 class="text-base font-extrabold text-slate-800">Tidak Ada Data Petugas</h4>
            <p class="mt-1 text-xs text-slate-500 leading-relaxed">
              ${query ? `Pencarian untuk "${escapeHtml(query)}" tidak menemukan hasil cocok.` : 'Belum ada data staf pustakawan yang tersimpan di sistem.'}
            </p>
            ${!query ? `
              <button type="button" class="btn-tambah-petugas-empty mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition">
                <i class="ph ph-plus-circle text-base"></i>
                <span>Tambah Petugas Baru</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;

    const btnEmpty = tableBody.querySelector('.btn-tambah-petugas-empty');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', () => {
        state.activeTab = 'petugas';
        openAddModal();
      });
    }
    return;
  }

  // Render Baris Data Petugas
  tableBody.innerHTML = filtered.map((row, index) => {
    const username = (row.data_user && row.data_user.username) || row.id_user || '-';
    const idUser = row.id_user || '';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors group">
        <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
        <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.id_petugas)}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${renderPetugasAvatarThumb(row.foto_profil, row.nama_petugas)}
            <span class="font-bold text-slate-800">${escapeHtml(row.nama_petugas)}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_petugas)}</td>
        <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_petugas)}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            <i class="ph ph-user text-[11px] text-slate-400"></i>
            ${escapeHtml(username)}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="inline-flex items-center justify-end gap-1.5">
            <button 
              type="button" 
              data-iduser="${escapeHtml(idUser)}" 
              data-idpetugas="${escapeHtml(row.id_petugas)}"
              class="btn-edit-petugas inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
              title="Edit data dan reset password petugas"
            >
              <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
              <span>Edit</span>
            </button>
            <button 
              type="button" 
              data-iduser="${escapeHtml(idUser)}" 
              data-name="${escapeHtml(row.nama_petugas)}" 
              class="btn-delete-petugas inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Hapus akun petugas"
            >
              <i class="ph ph-trash text-sm" aria-hidden="true"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Pasang Event Listeners untuk Tombol Edit & Hapus Petugas
  tableBody.querySelectorAll('.btn-edit-petugas').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idPetugas = btn.dataset.idpetugas;
      const targetRecord = (state.cache.petugas || []).find(r => r.id_petugas === idPetugas);
      if (targetRecord) {
        state.activeTab = 'petugas';
        openEditModal(targetRecord);
      }
    });
  });

  tableBody.querySelectorAll('.btn-delete-petugas').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idUser = btn.dataset.iduser;
      const name = btn.dataset.name;
      openDeleteModal(idUser, name, 'Petugas');
    });
  });
}

/**
 * Setup Event Listener Pencarian & Aksi Tab Petugas
 */
export function setupPetugasEventListeners() {
  if (searchListenerAttached) return;
  searchListenerAttached = true;

  const tabContainer = document.getElementById('tabPetugas');
  if (!tabContainer) return;

  const searchInput = tabContainer.querySelector('#searchInputPetugas');
  const btnClear = tabContainer.querySelector('#btnClearSearchPetugas');
  const btnRefresh = tabContainer.querySelector('#btnRefreshDataPetugas');
  const btnAdd = tabContainer.querySelector('#btnOpenAddModalPetugas');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (btnClear) {
        if (searchInput.value.trim().length > 0) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
      }
      renderTablePetugas();
    });
  }

  if (btnClear && searchInput) {
    btnClear.addEventListener('click', () => {
      searchInput.value = '';
      btnClear.classList.add('hidden');
      searchInput.focus();
      renderTablePetugas();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const icon = btnRefresh.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      try {
        await fetchPetugas();
        renderTablePetugas();
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 300);
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      state.activeTab = 'petugas';
      openAddModal();
    });
  }
}

/**
 * Inisialisasi Modul 3-Petugas
 */
export async function initModulPetugas() {
  console.log('[DataPetugas] Menginisialisasi Modul 3-Petugas...');
  setupPetugasEventListeners();
  try {
    await fetchPetugas();
    renderTablePetugas();
    console.log('[DataPetugas] Modul 3-Petugas siap!');
  } catch (err) {
    console.error('[DataPetugas] Gagal memuat data petugas saat inisialisasi:', err);
  }
}
