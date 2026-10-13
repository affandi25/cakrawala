/**
 * CAKRAWALA Digital Library - Modul Data Guru (Fetch, Filter, & Table Renderer)
 * File: public/admin/modules/2-guru/dataGuru.js
 * 
 * Tanggung Jawab:
 * - Mengambil dataset guru pengajar dari Supabase secara realtime
 * - Merender baris tabel data guru lengkap dengan thumbnail avatar & mapel
 * - Pencarian instan berdasarkan nama guru, NIP, mapel, atau email
 * - Penanganan aksi tombol Tambah, Edit, dan Hapus guru
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { escapeHtml } from '../../../assets/js/sharedUtils.js';
import { state } from '../state.js';
import { openAddModal, openEditModal } from '../modalUser.js';
import { openDeleteModal } from '../modalKonfirmasi.js';
import { updateBadge } from '../table.js';

let searchListenerAttached = false;

/**
 * Render thumbnail pasfoto resmi guru dengan inisial fallback
 */
function renderGuruAvatarThumb(fotoUrl, name) {
  const initials = name ? name.substring(0, 2).toUpperCase() : 'GR';
  if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '') {
    return `
      <div class="h-8 w-8 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
        <img src="${fotoUrl}" alt="${escapeHtml(name)}" class="h-full w-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[11px] font-bold text-white\\'>${initials}</span>'; this.parentElement.className='h-8 w-8 shrink-0 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs';" />
      </div>
    `;
  }
  return `
    <div class="h-8 w-8 shrink-0 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
      ${initials}
    </div>
  `;
}

/**
 * Helper untuk memastikan relasi data_user terhubung dengan aman
 */
async function enrichGuruWithUserData(rows) {
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
    console.warn('[DataGuru] Fallback query data_user error:', err);
  }

  return rows;
}

/**
 * Mengambil data guru dari Supabase
 */
export async function fetchGuru() {
  console.log('[DataGuru] Mengambil data guru dari database Supabase...');
  const { data, error } = await db
    .from('data_guru')
    .select('nip_guru, nama_guru, mata_pelajaran, email_guru, kontak_guru, foto_profil, id_user, data_user(id_user, username, role)')
    .order('nama_guru', { ascending: true });

  if (error) {
    console.error('[DataGuru] Gagal fetch data guru:', error);
    throw error;
  }

  const enriched = await enrichGuruWithUserData(data || []);
  state.cache.guru = enriched;
  updateBadge('guru', enriched.length);
  return enriched;
}

/**
 * Render baris tabel data guru
 */
export function renderTableGuru(customData = null) {
  const container = document.getElementById('tabGuru');
  if (!container) return;

  const tableBody = container.querySelector('#tableBodyGuru') || container.querySelector('tbody');
  const recordCount = container.querySelector('#tableRecordCountGuru') || container.querySelector('.table-record-count');
  const headRow = container.querySelector('#tableHeadRowGuru') || container.querySelector('thead tr');

  if (!tableBody) return;

  // Render Header Kolom jika belum ada
  if (headRow && headRow.children.length === 0) {
    headRow.innerHTML = `
      <th scope="col" class="px-6 py-3.5 text-center w-14">No</th>
      <th scope="col" class="px-6 py-3.5 text-left">NIP</th>
      <th scope="col" class="px-6 py-3.5 text-left">Nama Guru</th>
      <th scope="col" class="px-6 py-3.5 text-left">Mata Pelajaran</th>
      <th scope="col" class="px-6 py-3.5 text-left">Email</th>
      <th scope="col" class="px-6 py-3.5 text-left">Kontak</th>
      <th scope="col" class="px-6 py-3.5 text-left">Username</th>
      <th scope="col" class="px-6 py-3.5 text-right">Aksi</th>
    `;
  }

  // Loading State
  if (state.isLoading && (!state.cache.guru || state.cache.guru.length === 0)) {
    if (recordCount) recordCount.textContent = 'Memuat...';
    tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
      <tr class="animate-pulse">
        <td class="px-6 py-4 text-center"><div class="h-4 w-6 bg-slate-200 rounded mx-auto"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-28 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-36 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-32 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-20 bg-slate-200 rounded"></div></td>
        <td class="px-6 py-4 text-right"><div class="h-8 w-16 bg-slate-200 rounded ml-auto"></div></td>
      </tr>
    `).join('');
    return;
  }

  // Filter Data
  const dataset = customData || state.cache.guru || [];
  const searchInput = container.querySelector('#searchInputGuru');
  const query = (searchInput ? searchInput.value : state.searchQuery || '').toLowerCase().trim();

  const filtered = query
    ? dataset.filter(r => {
        const username = (r.data_user && r.data_user.username) || '';
        return (
          (r.nama_guru || '').toLowerCase().includes(query) ||
          (r.nip_guru || '').toLowerCase().includes(query) ||
          (r.mata_pelajaran || '').toLowerCase().includes(query) ||
          (r.email_guru || '').toLowerCase().includes(query) ||
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
        <td colspan="8" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <i class="ph ph-chalkboard-teacher text-3xl"></i>
            </div>
            <h4 class="text-base font-extrabold text-slate-800">Tidak Ada Data Guru</h4>
            <p class="mt-1 text-xs text-slate-500 leading-relaxed">
              ${query ? `Pencarian untuk "${escapeHtml(query)}" tidak menemukan hasil cocok.` : 'Belum ada data guru pengajar yang tersimpan di sistem.'}
            </p>
            ${!query ? `
              <button type="button" class="btn-tambah-guru-empty mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition">
                <i class="ph ph-plus-circle text-base"></i>
                <span>Tambah Guru Baru</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;

    const btnEmpty = tableBody.querySelector('.btn-tambah-guru-empty');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', () => {
        state.activeTab = 'guru';
        openAddModal();
      });
    }
    return;
  }

  // Render Baris Data Guru
  tableBody.innerHTML = filtered.map((row, index) => {
    const username = (row.data_user && row.data_user.username) || row.id_user || '-';
    const idUser = row.id_user || '';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors group">
        <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
        <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nip_guru)}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${renderGuruAvatarThumb(row.foto_profil, row.nama_guru)}
            <span class="font-bold text-slate-800">${escapeHtml(row.nama_guru)}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-100">
            ${escapeHtml(row.mata_pelajaran)}
          </span>
        </td>
        <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_guru)}</td>
        <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_guru)}</td>
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
              data-nip="${escapeHtml(row.nip_guru)}"
              class="btn-edit-guru inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
              title="Edit data dan reset password guru"
            >
              <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
              <span>Edit</span>
            </button>
            <button 
              type="button" 
              data-iduser="${escapeHtml(idUser)}" 
              data-name="${escapeHtml(row.nama_guru)}" 
              class="btn-delete-guru inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Hapus akun guru"
            >
              <i class="ph ph-trash text-sm" aria-hidden="true"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Pasang Event Listeners untuk Tombol Edit & Hapus Guru
  tableBody.querySelectorAll('.btn-edit-guru').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nip = btn.dataset.nip;
      const targetRecord = (state.cache.guru || []).find(r => r.nip_guru === nip);
      if (targetRecord) {
        state.activeTab = 'guru';
        openEditModal(targetRecord);
      }
    });
  });

  tableBody.querySelectorAll('.btn-delete-guru').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idUser = btn.dataset.iduser;
      const name = btn.dataset.name;
      openDeleteModal(idUser, name, 'Guru');
    });
  });
}

/**
 * Setup Event Listener Pencarian & Aksi Tab Guru
 */
export function setupGuruEventListeners() {
  if (searchListenerAttached) return;
  searchListenerAttached = true;

  const tabContainer = document.getElementById('tabGuru');
  if (!tabContainer) return;

  const searchInput = tabContainer.querySelector('#searchInputGuru');
  const btnClear = tabContainer.querySelector('#btnClearSearchGuru');
  const btnRefresh = tabContainer.querySelector('#btnRefreshDataGuru');
  const btnAdd = tabContainer.querySelector('#btnOpenAddModalGuru');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (btnClear) {
        if (searchInput.value.trim().length > 0) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
      }
      renderTableGuru();
    });
  }

  if (btnClear && searchInput) {
    btnClear.addEventListener('click', () => {
      searchInput.value = '';
      btnClear.classList.add('hidden');
      searchInput.focus();
      renderTableGuru();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const icon = btnRefresh.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      try {
        await fetchGuru();
        renderTableGuru();
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 300);
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      state.activeTab = 'guru';
      openAddModal();
    });
  }
}

/**
 * Inisialisasi Modul 2-Guru
 */
export async function initModulGuru() {
  console.log('[DataGuru] Menginisialisasi Modul 2-Guru...');
  setupGuruEventListeners();
  try {
    await fetchGuru();
    renderTableGuru();
    console.log('[DataGuru] Modul 2-Guru siap!');
  } catch (err) {
    console.error('[DataGuru] Gagal memuat data guru saat inisialisasi:', err);
  }
}
