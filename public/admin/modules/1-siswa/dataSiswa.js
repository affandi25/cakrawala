/**
 * CAKRAWALA Digital Library - Modul Data Siswa (Fetch, Filter, & Table Renderer)
 * File: public/admin/modules/1-siswa/dataSiswa.js
 * 
 * Tanggung Jawab:
 * - Mengambil dataset siswa dari Supabase secara realtime
 * - Merender baris tabel data siswa lengkap dengan thumbnail avatar
 * - Pencarian instan berdasarkan nama, NISN, kelas, atau username akun
 * - Penanganan aksi tombol Tambah, Edit, dan Hapus siswa
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { escapeHtml } from '../../../assets/js/sharedUtils.js';
import { state } from '../core/state.js';
import { openAddModal, openEditModal } from '../modals/modalUser.js';
import { openDeleteModal } from '../modals/modalKonfirmasi.js';
import { updateBadge } from '../core/table.js';

let searchListenerAttached = false;

/**
 * Render thumbnail pasfoto siswa (Foto Profil Asli jika ada, atau Ikon Default WhatsApp)
 */
function renderSiswaAvatarThumb(fotoUrl, name) {
  if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '') {
    return `
      <div class="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
        <img src="${fotoUrl}" alt="${escapeHtml(name || '')}" class="h-full w-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'ph-fill ph-user text-base text-slate-400\\'></i>'; this.parentElement.className='h-8 w-8 shrink-0 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shadow-2xs';" />
      </div>
    `;
  }
  return `
    <div class="h-8 w-8 shrink-0 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shadow-2xs" title="${escapeHtml(name || '')}">
      <i class="ph-fill ph-user text-base text-slate-400"></i>
    </div>
  `;
}

/**
 * Helper untuk memastikan relasi data_user terhubung dengan aman
 */
async function enrichSiswaWithUserData(rows) {
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
    console.warn('[DataSiswa] Fallback query data_user error:', err);
  }

  return rows;
}

/**
 * Mengambil data siswa dari Supabase
 */
export async function fetchSiswa() {
  console.log('[DataSiswa] Mengambil data siswa dari database Supabase...');
  const { data, error } = await db
    .from('data_siswa')
    .select('nisn_siswa, nama_siswa, kelas, email_siswa, kontak_siswa, foto_profil, id_user, data_user(id_user, username, role)')
    .order('nama_siswa', { ascending: true });

  if (error) {
    console.error('[DataSiswa] Gagal fetch data siswa:', error);
    throw error;
  }

  const enriched = await enrichSiswaWithUserData(data || []);
  state.cache.siswa = enriched;
  updateBadge('siswa', enriched.length);
  return enriched;
}

/**
 * Render baris tabel data siswa
 */
export function renderTableSiswa(customData = null) {
  const container = document.getElementById('tabSiswa');
  const tableBody = container ? container.querySelector('#tableBody') : document.getElementById('tableBody');
  const recordCount = container ? container.querySelector('#tableRecordCount') : document.getElementById('tableRecordCount');
  const headRow = container ? container.querySelector('#tableHeadRow') : document.getElementById('tableHeadRow');

  if (!tableBody) return;

  // Render Header Kolom jika kosong
  if (headRow && headRow.children.length === 0) {
    headRow.innerHTML = `
      <th scope="col" class="px-6 py-3.5 text-center w-14">No</th>
      <th scope="col" class="px-6 py-3.5 text-left">NISN</th>
      <th scope="col" class="px-6 py-3.5 text-left">Nama Siswa</th>
      <th scope="col" class="px-6 py-3.5 text-left">Kelas</th>
      <th scope="col" class="px-6 py-3.5 text-left">Email</th>
      <th scope="col" class="px-6 py-3.5 text-left">Kontak</th>
      <th scope="col" class="px-6 py-3.5 text-left">Username</th>
      <th scope="col" class="px-6 py-3.5 text-right">Aksi</th>
    `;
  }

  // Loading State
  if (state.isLoading && (!state.cache.siswa || state.cache.siswa.length === 0)) {
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
  const dataset = customData || state.cache.siswa || [];
  const query = (state.searchQuery || '').toLowerCase().trim();

  const filtered = query
    ? dataset.filter(r => {
        const username = (r.data_user && r.data_user.username) || '';
        return (
          (r.nama_siswa || '').toLowerCase().includes(query) ||
          (r.nisn_siswa || '').toLowerCase().includes(query) ||
          (r.kelas || '').toLowerCase().includes(query) ||
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
              <i class="ph ph-student text-3xl"></i>
            </div>
            <h4 class="text-base font-extrabold text-slate-800">Tidak Ada Data Siswa</h4>
            <p class="mt-1 text-xs text-slate-500 leading-relaxed">
              ${query ? `Pencarian untuk "${escapeHtml(query)}" tidak menemukan hasil cocok.` : 'Belum ada data siswa yang tersimpan di sistem.'}
            </p>
            ${!query ? `
              <button type="button" class="btn-tambah-siswa-empty mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition">
                <i class="ph ph-plus-circle text-base"></i>
                <span>Tambah Siswa Baru</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;

    const btnEmpty = tableBody.querySelector('.btn-tambah-siswa-empty');
    if (btnEmpty) btnEmpty.addEventListener('click', openAddModal);
    return;
  }

  // Render Baris Data Siswa
  tableBody.innerHTML = filtered.map((row, index) => {
    const username = (row.data_user && row.data_user.username) || row.id_user || '-';
    const idUser = row.id_user || '';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors group">
        <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
        <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nisn_siswa)}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${renderSiswaAvatarThumb(row.foto_profil, row.nama_siswa)}
            <span class="font-bold text-slate-800">${escapeHtml(row.nama_siswa)}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-navy border border-blue-100">
            ${escapeHtml(row.kelas)}
          </span>
        </td>
        <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(row.email_siswa)}</td>
        <td class="px-6 py-4 text-xs text-slate-500">${escapeHtml(row.kontak_siswa)}</td>
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
              data-nisn="${escapeHtml(row.nisn_siswa)}"
              class="btn-edit-siswa inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
              title="Edit data dan reset password siswa"
            >
              <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
              <span>Edit</span>
            </button>
            <button 
              type="button" 
              data-iduser="${escapeHtml(idUser)}" 
              data-name="${escapeHtml(row.nama_siswa)}" 
              class="btn-delete-siswa inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Hapus akun siswa"
            >
              <i class="ph ph-trash text-sm" aria-hidden="true"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Pasang Event Listeners untuk Tombol Edit & Hapus
  tableBody.querySelectorAll('.btn-edit-siswa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nisn = btn.dataset.nisn;
      const targetRecord = (state.cache.siswa || []).find(r => r.nisn_siswa === nisn);
      if (targetRecord) {
        state.activeTab = 'siswa';
        openEditModal(targetRecord);
      }
    });
  });

  tableBody.querySelectorAll('.btn-delete-siswa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idUser = btn.dataset.iduser;
      const name = btn.dataset.name;
      openDeleteModal(idUser, name, 'Siswa');
    });
  });
}

/**
 * Setup Event Listener Pencarian & Aksi Tab Siswa
 */
export function setupSiswaEventListeners() {
  if (searchListenerAttached) return;
  searchListenerAttached = true;

  const tabContainer = document.getElementById('tabSiswa');
  if (!tabContainer) return;

  const searchInput = tabContainer.querySelector('#searchInput');
  const btnClear = tabContainer.querySelector('#btnClearSearch');
  const btnRefresh = tabContainer.querySelector('#btnRefreshData');
  const btnAdd = tabContainer.querySelector('#btnOpenAddModal');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (btnClear) {
        if (state.searchQuery.length > 0) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
      }
      renderTableSiswa();
    });
  }

  if (btnClear && searchInput) {
    btnClear.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      btnClear.classList.add('hidden');
      searchInput.focus();
      renderTableSiswa();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const icon = btnRefresh.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      try {
        await fetchSiswa();
        renderTableSiswa();
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 300);
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      state.activeTab = 'siswa';
      openAddModal();
    });
  }
}

/**
 * Inisialisasi Modul 1-Siswa
 */
export async function initModulSiswa() {
  console.log('[DataSiswa] Menginisialisasi Modul 1-Siswa...');
  setupSiswaEventListeners();
  try {
    state.isLoading = true;
    renderTableSiswa();
    await fetchSiswa();
    state.isLoading = false;
    renderTableSiswa();
    console.log('[DataSiswa] Modul 1-Siswa siap!');
  } catch (err) {
    state.isLoading = false;
    console.error('[DataSiswa] Gagal memuat data siswa saat inisialisasi:', err);
  }
}
