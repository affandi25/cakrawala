/**
 * CAKRAWALA Digital Library - Table & Navigation Admin Module
 * File: public/admin/modules/table.js
 */

import { escapeHtml } from '../../assets/js/sharedUtils.js';
import { state, TAB_CONFIGS, DOM } from './state.js';
import { loadData } from './data.js';
import { openAddModal, openEditModal, openDeleteModal } from './modal.js';

/**
 * Memperbarui badge hitungan jumlah data pada menu tab sidebar
 */
export function updateBadge(tab, count) {
  if (tab === 'siswa' && DOM.badgeCountSiswa) DOM.badgeCountSiswa.textContent = count;
  if (tab === 'guru' && DOM.badgeCountGuru) DOM.badgeCountGuru.textContent = count;
  if (tab === 'petugas' && DOM.badgeCountPetugas) DOM.badgeCountPetugas.textContent = count;
}

/**
 * Render baris tabel sesuai data, status filter, atau state loading
 */
export function renderTable() {
  const config = TAB_CONFIGS[state.activeTab];
  if (!config) return;

  // 1. Render Header Kolom
  if (DOM.tableHeadRow) {
    DOM.tableHeadRow.innerHTML = config.columns.map(col => {
      const isAction = col === 'Aksi';
      const isNumber = col === 'No';
      const alignClass = isAction ? 'text-right' : isNumber ? 'text-center w-14' : 'text-left';
      return `<th scope="col" class="px-6 py-3.5 ${alignClass}">${escapeHtml(col)}</th>`;
    }).join('');
  }

  // 2. Loading State: Skeleton shimmer (Antislop standard)
  if (state.isLoading) {
    if (DOM.tableRecordCount) DOM.tableRecordCount.textContent = 'Memuat...';
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
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
    }
    return;
  }

  // 3. Filter Dataset
  const dataset = state.cache[state.activeTab] || [];
  const query = state.searchQuery.toLowerCase().trim();

  const filtered = dataset.filter(item => {
    if (!query) return true;
    const username = (item.data_user && item.data_user.username) || '';

    if (state.activeTab === 'siswa') {
      return (
        (item.nama_siswa || '').toLowerCase().includes(query) ||
        (item.nisn_siswa || '').toLowerCase().includes(query) ||
        (item.kelas || '').toLowerCase().includes(query) ||
        (item.email_siswa || '').toLowerCase().includes(query) ||
        username.toLowerCase().includes(query)
      );
    } else if (state.activeTab === 'guru') {
      return (
        (item.nama_guru || '').toLowerCase().includes(query) ||
        (item.nip_guru || '').toLowerCase().includes(query) ||
        (item.mata_pelajaran || '').toLowerCase().includes(query) ||
        (item.email_guru || '').toLowerCase().includes(query) ||
        username.toLowerCase().includes(query)
      );
    } else if (state.activeTab === 'petugas') {
      return (
        (item.nama_petugas || '').toLowerCase().includes(query) ||
        (item.id_petugas || '').toLowerCase().includes(query) ||
        (item.email_petugas || '').toLowerCase().includes(query) ||
        (item.kontak_petugas || '').toLowerCase().includes(query) ||
        username.toLowerCase().includes(query)
      );
    }
    return false;
  });

  if (DOM.tableRecordCount) DOM.tableRecordCount.textContent = `${filtered.length} Data`;

  // 4. Empty State
  if (filtered.length === 0) {
    const isSearchActive = query.length > 0;
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = `
        <tr>
          <td colspan="${config.columns.length}" class="py-16 px-6 text-center">
            <div class="max-w-sm mx-auto flex flex-col items-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <i class="${isSearchActive ? 'ph ph-magnifying-glass' : 'ph ph-folder-open'} text-3xl" aria-hidden="true"></i>
              </div>
              <h4 class="text-base font-extrabold text-slate-800">
                ${isSearchActive ? 'Tidak ada hasil yang cocok' : 'Belum ada data ' + config.breadcrumb.toLowerCase()}
              </h4>
              <p class="mt-1.5 text-xs text-slate-500 leading-relaxed">
                ${isSearchActive
                  ? `Pencarian kata kunci "${escapeHtml(query)}" tidak menemukan kecocokan pada daftar saat ini.`
                  : `Mulai kelola sistem dengan menambahkan ${config.breadcrumb.toLowerCase()} baru melalui tombol di bawah.`}
              </p>
              ${isSearchActive ? `
                <button type="button" id="btnResetSearchInEmpty" class="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-navy hover:bg-slate-50 transition-colors">
                  <i class="ph ph-x-circle text-base"></i>
                  <span>Bersihkan Pencarian</span>
                </button>
              ` : `
                <button type="button" id="btnAddInEmpty" class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition-colors">
                  <i class="ph ph-plus-circle text-base"></i>
                  <span>${config.addBtnText}</span>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;

      // Attach event handler untuk tombol di empty state
      const btnReset = document.getElementById('btnResetSearchInEmpty');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (DOM.searchInput) DOM.searchInput.value = '';
          state.searchQuery = '';
          if (DOM.btnClearSearch) DOM.btnClearSearch.classList.add('hidden');
          renderTable();
        });
      }

      const btnAddEmpty = document.getElementById('btnAddInEmpty');
      if (btnAddEmpty) {
        btnAddEmpty.addEventListener('click', () => openAddModal());
      }
    }
    return;
  }

  // 5. Render Data Rows
  if (DOM.tableBody) {
    DOM.tableBody.innerHTML = filtered.map((row, index) => {
      const username = (row.data_user && row.data_user.username) || row.id_user || '-';
      const idUser = row.id_user || '';

      if (state.activeTab === 'siswa') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nisn_siswa)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_siswa)}</td>
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
                  data-entity="Siswa"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password siswa"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_siswa)}" 
                  data-entity="Siswa"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun siswa"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else if (state.activeTab === 'guru') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.nip_guru)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_guru)}</td>
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
                  data-entity="Guru"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password guru"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_guru)}" 
                  data-entity="Guru"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun guru"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } else if (state.activeTab === 'petugas') {
        return `
          <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
            <td class="px-6 py-4 font-mono text-xs font-bold text-navy">${escapeHtml(row.id_petugas)}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHtml(row.nama_petugas)}</td>
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
                  data-entity="Petugas"
                  class="btn-edit-row inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                  title="Edit data dan reset password petugas"
                >
                  <i class="ph ph-note-pencil text-sm" aria-hidden="true"></i>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-iduser="${escapeHtml(idUser)}" 
                  data-name="${escapeHtml(row.nama_petugas)}" 
                  data-entity="Petugas"
                  class="btn-delete-row inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  title="Hapus akun petugas"
                >
                  <i class="ph ph-trash text-sm" aria-hidden="true"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }
      return '';
    }).join('');

    // Pasang listener ke semua tombol edit di baris tabel
    DOM.tableBody.querySelectorAll('.btn-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idUser = btn.dataset.iduser;
        const dataset = state.cache[state.activeTab] || [];
        const item = dataset.find(r => r.id_user === idUser);
        if (item) {
          openEditModal(item);
        }
      });
    });

    // Pasang listener ke semua tombol hapus di baris tabel
    DOM.tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idUser = btn.dataset.iduser;
        const name = btn.dataset.name;
        const entity = btn.dataset.entity;
        openDeleteModal(idUser, name, entity);
      });
    });
  }
}

/**
 * Render Error State jika terjadi kegagalan koneksi Supabase
 */
export function renderTableError(errorMessage) {
  const config = TAB_CONFIGS[state.activeTab];
  if (DOM.tableRecordCount) DOM.tableRecordCount.textContent = 'Error';
  if (DOM.tableBody) {
    DOM.tableBody.innerHTML = `
      <tr>
        <td colspan="${config ? config.columns.length : 8}" class="py-14 px-6 text-center">
          <div class="max-w-sm mx-auto flex flex-col items-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
              <i class="ph ph-cloud-slash text-2xl" aria-hidden="true"></i>
            </div>
            <h4 class="text-base font-extrabold text-slate-900">Gagal Mengambil Data</h4>
            <p class="mt-1 text-xs text-slate-500 leading-relaxed">
              ${escapeHtml(errorMessage)}
            </p>
            <button 
              type="button" 
              id="btnRetryFetch" 
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-light transition-colors"
            >
              <i class="ph ph-arrows-clockwise text-sm"></i>
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        </td>
      </tr>
    `;

    const btnRetry = document.getElementById('btnRetryFetch');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => loadData(state.activeTab));
    }
  }
}

/**
 * Mengganti tampilan tab aktif
 */
export function switchTab(newTab) {
  if (state.activeTab === newTab && state.cache[newTab] && state.cache[newTab].length > 0) return;

  state.activeTab = newTab;
  const config = TAB_CONFIGS[newTab];
  if (!config) return;

  // Update Header Text
  if (DOM.headerPageTitle) DOM.headerPageTitle.textContent = config.title;
  if (DOM.headerSubBreadcrumb) DOM.headerSubBreadcrumb.textContent = config.breadcrumb;
  if (DOM.headerPageDesc) DOM.headerPageDesc.textContent = config.desc;
  if (DOM.tableTitle) DOM.tableTitle.textContent = config.tableTitle;
  if (DOM.btnAddText) DOM.btnAddText.textContent = config.addBtnText;

  // Update Sidebar Navigation Active States
  [DOM.tabBtnSiswa, DOM.tabBtnGuru, DOM.tabBtnPetugas].forEach(btn => {
    if (!btn) return;
    const isTarget = btn.dataset.tab === newTab;
    if (isTarget) {
      btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 bg-navy text-white shadow-sm shadow-navy/20';
      const badge = btn.querySelector('span[id^="badgeCount"]');
      if (badge) badge.className = 'rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white';
    } else {
      btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-navy';
      const badge = btn.querySelector('span[id^="badgeCount"]');
      if (badge) badge.className = 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600';
    }
  });

  // Reset Search
  if (DOM.searchInput) DOM.searchInput.value = '';
  state.searchQuery = '';
  if (DOM.btnClearSearch) DOM.btnClearSearch.classList.add('hidden');

  // Fetch data
  loadData(newTab);
}
