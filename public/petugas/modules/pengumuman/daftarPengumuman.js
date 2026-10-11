/**
 * CAKRAWALA Digital Library - Modul Daftar Pengumuman & Agenda
 * File: public/petugas/modules/pengumuman/daftarPengumuman.js
 * 
 * FUNGSI:
 * - Merender tabel pengumuman perpustakaan dengan filter kategori dan pencarian
 * - Menampilkan status badge kategori, tanggal event, tautan eksternal, dan thumbnail poster
 * - Memicu modal edit dan modal konfirmasi hapus pengumuman
 */

import { state } from '../state.js';
import { openPengumumanModal } from './modalFormPengumuman.js';
import { openDeletePengumumanModal } from './modalHapusPengumuman.js';

export function renderPengumumanTable() {
  const tbody = document.getElementById('tablePengumumanBody');
  const badgeTotalSidebar = document.getElementById('badgeTotalPengumumanCount');
  const recordCountDisplay = document.getElementById('pengumumanRecordCount');
  const tableInfo = document.getElementById('pengumumanTableInfo');
  const filterSelect = document.getElementById('selectFilterKategoriPengumuman');
  if (!tbody) return;

  const allList = state.cache.pengumuman || [];
  if (badgeTotalSidebar) badgeTotalSidebar.textContent = allList.length;

  if (filterSelect) {
    const currentSelected = state.filterKategoriPengumuman || '';
    const defaultCategories = ['Event Kampus', 'Akademik', 'Layanan', 'Pelatihan', 'Info Khusus'];
    const extraCategories = allList.map(p => p.kategori).filter(k => k && !defaultCategories.includes(k));
    const uniqueExtras = [...new Set(extraCategories)];

    let opts = '<option value="">Semua Kategori</option>';
    defaultCategories.forEach(cat => {
      opts += `<option value="${cat}">${cat}</option>`;
    });
    uniqueExtras.forEach(cat => {
      opts += `<option value="${cat}">${cat}</option>`;
    });

    filterSelect.innerHTML = opts;
    filterSelect.value = currentSelected;
  }

  let filtered = allList;
  if (state.filterKategoriPengumuman) {
    filtered = filtered.filter(p => (p.kategori || '').toLowerCase() === state.filterKategoriPengumuman.toLowerCase());
  }

  if (state.searchPengumumanQuery) {
    const q = state.searchPengumumanQuery.toLowerCase();
    filtered = filtered.filter(p => {
      const matchJudul = (p.judul || '').toLowerCase().includes(q);
      const matchKategori = (p.kategori || '').toLowerCase().includes(q);
      const matchTanggal = (p.tanggal_event || '').toLowerCase().includes(q);
      return matchJudul || matchKategori || matchTanggal;
    });
  }

  if (recordCountDisplay) {
    recordCountDisplay.textContent = `${filtered.length} Data`;
  }

  if (tableInfo) {
    tableInfo.textContent = `Menampilkan ${filtered.length} dari ${allList.length} total pengumuman agenda perpustakaan.`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-12 text-center text-slate-400">
          <i class="ph ph-megaphone-simple text-3xl inline-block mb-1 text-slate-300"></i>
          <p class="text-xs font-semibold text-slate-700">Tidak ada pengumuman yang sesuai dengan kriteria.</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau tambah pengumuman baru.</p>
        </td>
      </tr>
    `;
    return;
  }

  const getBadgeStyle = (cat = '') => {
    const lower = cat.toLowerCase();
    if (lower.includes('event')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (lower.includes('akademik')) return 'bg-blue-100 text-navy border-blue-200';
    if (lower.includes('layanan')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (lower.includes('pelatihan')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (lower.includes('khusus')) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  tbody.innerHTML = filtered.map(item => {
    const posterUrl = item.gambar_url || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=300';
    const badgeClass = getBadgeStyle(item.kategori);

    const linkDetailHtml = item.link_detail ? `
      <a href="${item.link_detail}" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-blue-600 transition truncate max-w-[180px]"
        title="${item.link_detail}">
        <i class="ph ph-arrow-square-out text-sm shrink-0"></i>
        <span class="truncate">${item.link_detail.replace(/^https?:\/\/(www\.)?/, '')}</span>
      </a>
    ` : `<span class="text-xs text-slate-400 italic">Tanpa Tautan</span>`;

    return `
      <tr class="hover:bg-slate-50/70 transition">
        <td class="px-5 py-3.5">
          <div class="flex items-center gap-3">
            <div class="h-12 w-16 shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-200/80 shadow-2xs">
              <img src="${posterUrl}" alt="${item.judul}" class="h-full w-full object-cover hover:scale-105 transition duration-300"
                onerror="this.src='https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=300';" />
            </div>
            <div>
              <span class="font-mono text-[10px] font-bold text-slate-400">#${item.id_pengumuman}</span>
            </div>
          </div>
        </td>

        <td class="px-5 py-3.5">
          <p class="font-bold text-slate-800 text-xs line-clamp-2 leading-snug">${item.judul}</p>
        </td>

        <td class="px-5 py-3.5 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
            ${item.kategori || 'Umum'}
          </span>
        </td>

        <td class="px-5 py-3.5 whitespace-nowrap">
          <div class="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <i class="ph ph-calendar text-slate-400 text-sm"></i>
            <span>${item.tanggal_event || '-'}</span>
          </div>
        </td>

        <td class="px-5 py-3.5">
          ${linkDetailHtml}
        </td>

        <td class="px-5 py-3.5 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1">
            <button type="button" data-id="${item.id_pengumuman}"
              class="btn-edit-pengumuman flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-navy transition shadow-2xs"
              title="Edit Pengumuman">
              <i class="ph ph-pencil-simple text-sm"></i>
            </button>
            <button type="button" data-id="${item.id_pengumuman}"
              class="btn-delete-pengumuman flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shadow-2xs"
              title="Hapus Pengumuman">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-pengumuman').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openPengumumanModal('edit', id);
    });
  });

  tbody.querySelectorAll('.btn-delete-pengumuman').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDeletePengumumanModal(id);
    });
  });
}
