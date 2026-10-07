/**
 * CAKRAWALA Digital Library - Modul Meja 5: Kelola Pengumuman & Poster Agenda
 * File: public/petugas/modules/pengumuman.js
 * 
 * FUNGSI:
 * - Menampilkan daftar pengumuman & poster agenda perpustakaan
 * - Menangani CRUD (Create, Read, Update, Delete) pengumuman
 * - Unggah file gambar poster langsung ke Supabase Storage (bucket 'pengumuman')
 * - Sinkronisasi otomatis dengan Carousel Landing Page di beranda utama
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import { fileToDataUrl, showModal, hideModal, showToast } from './utils.js';

/**
 * Merender tabel daftar pengumuman & event agenda perpustakaan
 */
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

/**
 * Setup pendengar peristiwa untuk modul pengumuman
 */
export function setupPengumumanModule() {
  const searchInput = document.getElementById('inputSearchPengumuman');
  const clearSearchBtn = document.getElementById('btnClearSearchPengumuman');
  const filterCatSelect = document.getElementById('selectFilterKategoriPengumuman');
  const refreshBtn = document.getElementById('btnRefreshPengumuman');
  const openAddBtn = document.getElementById('btnOpenAddPengumumanModal');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchPengumumanQuery = e.target.value.trim();
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !state.searchPengumumanQuery);
      }
      renderPengumumanTable();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchPengumumanQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderPengumumanTable();
    });
  }

  if (filterCatSelect) {
    filterCatSelect.addEventListener('change', e => {
      state.filterKategoriPengumuman = e.target.value;
      renderPengumumanTable();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui data pengumuman...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      openPengumumanModal('add');
    });
  }

  setupPengumumanFormModal();
  setupDeletePengumumanModal();
}

/**
 * Setup formulir modal tambah / edit pengumuman & upload gambar poster
 */
export function setupPengumumanFormModal() {
  const modal = document.getElementById('modalPengumumanForm');
  const content = document.getElementById('modalPengumumanContent');
  const closeBtn = document.getElementById('btnClosePengumumanModal');
  const cancelBtn = document.getElementById('btnCancelPengumumanModal');
  const form = document.getElementById('formPengumuman');

  const dropzone = document.getElementById('dropzonePoster');
  const fileInput = document.getElementById('inputPosterFile');
  const placeholder = document.getElementById('posterUploadPlaceholder');
  const previewContainer = document.getElementById('posterPreviewContainer');
  const previewImg = document.getElementById('imgPosterPreview');
  const fileNameEl = document.getElementById('posterFileName');
  const fileSizeEl = document.getElementById('posterFileSize');
  const removePosterBtn = document.getElementById('btnRemovePoster');
  const finalUrlInput = document.getElementById('inputFinalPosterUrl');
  const manualUrlInput = document.getElementById('inputPengumumanGambarUrl');

  const selectKategori = document.getElementById('selectPengumumanKategori');
  const inputCustomKategori = document.getElementById('inputCustomPengumumanKategori');

  function closePengumumanModal() {
    hideModal(modal, content);
    resetPosterUploadState();
    state.currentEditPengumuman = null;
  }

  function resetPosterUploadState() {
    state.selectedPosterFile = null;
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (manualUrlInput) manualUrlInput.value = '';
    if (finalUrlInput) finalUrlInput.value = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closePengumumanModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePengumumanModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closePengumumanModal();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', e => {
      if (e.target !== removePosterBtn && !removePosterBtn?.contains(e.target)) {
        fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-navy', 'bg-slate-100');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-navy', 'bg-slate-100');
      });
    });

    dropzone.addEventListener('drop', e => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePosterFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handlePosterFileSelected(fileInput.files[0]);
      }
    });
  }

  function handlePosterFileSelected(file) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      showToast('Format file harus berupa gambar (JPG, PNG, atau WEBP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal adalah 5 MB.', 'warning');
      return;
    }

    state.selectedPosterFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) previewImg.src = e.target.result;
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB (Siap diunggah)`;

      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  if (removePosterBtn) {
    removePosterBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetPosterUploadState();
    });
  }

  if (selectKategori && inputCustomKategori) {
    selectKategori.addEventListener('change', () => {
      if (selectKategori.value === '__custom__') {
        inputCustomKategori.classList.remove('hidden');
        inputCustomKategori.required = true;
        inputCustomKategori.focus();
      } else {
        inputCustomKategori.classList.add('hidden');
        inputCustomKategori.required = false;
      }
    });
  }

  if (manualUrlInput && previewImg) {
    manualUrlInput.addEventListener('input', () => {
      const val = manualUrlInput.value.trim();
      if (val && !state.selectedPosterFile) {
        previewImg.src = val;
        if (fileNameEl) fileNameEl.textContent = 'Link URL Online';
        if (fileSizeEl) fileSizeEl.textContent = 'Gambar Eksternal';
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const idInput = document.getElementById('inputPengumumanId');
      const judulInput = document.getElementById('inputPengumumanJudul');
      const tanggalInput = document.getElementById('inputPengumumanTanggal');
      const linkInput = document.getElementById('inputPengumumanLink');
      const submitBtn = document.getElementById('btnSavePengumuman');
      const spinnerIcon = document.getElementById('iconSavePengumumanSpinner');
      const submitText = document.getElementById('btnSavePengumumanText');

      const judul = judulInput ? judulInput.value.trim() : '';
      const tanggalEvent = tanggalInput ? tanggalInput.value.trim() : '';
      const manualUrl = manualUrlInput ? manualUrlInput.value.trim() : '';
      const existingFinalUrl = finalUrlInput ? finalUrlInput.value.trim() : '';
      const linkDetail = linkInput ? linkInput.value.trim() : '';

      let kategori = selectKategori ? selectKategori.value : 'Event Kampus';
      if (kategori === '__custom__') {
        kategori = inputCustomKategori ? inputCustomKategori.value.trim() : 'Event Kampus';
      }

      if (!judul || !kategori || !tanggalEvent) {
        showToast('Harap lengkapi judul, kategori, dan tanggal event.', 'warning');
        return;
      }

      const isEdit = Boolean(idInput && idInput.value);

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (spinnerIcon) spinnerIcon.className = 'ph ph-spinner animate-spin text-lg';

        let finalPosterUrl = existingFinalUrl || manualUrl || null;

        if (state.selectedPosterFile) {
          if (submitText) submitText.textContent = 'Mengunggah Poster ke Storage...';
          const file = state.selectedPosterFile;
          const fileExt = file.name.split('.').pop() || 'jpg';
          const cleanFileName = `poster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const storagePath = `posters/${cleanFileName}`;

          try {
            const { data: uploadData, error: uploadErr } = await db.storage
              .from('pengumuman')
              .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadErr) {
              console.warn('Pemberitahuan storage Supabase, memakai fallback:', uploadErr.message);
              finalPosterUrl = await fileToDataUrl(file);
            } else {
              const { data: publicData } = db.storage
                .from('pengumuman')
                .getPublicUrl(uploadData.path || storagePath);

              if (publicData && publicData.publicUrl) {
                finalPosterUrl = publicData.publicUrl;
              }
            }
          } catch (storageException) {
            console.warn('Kendala storage, memakai data URL:', storageException);
            finalPosterUrl = await fileToDataUrl(file);
          }
        }

        if (submitText) submitText.textContent = isEdit ? 'Menyimpan Perubahan...' : 'Menerbitkan Pengumuman...';

        if (isEdit) {
          const editId = Number(idInput.value);
          const { error } = await db
            .from('data_pengumuman')
            .update({
              judul: judul,
              kategori: kategori,
              tanggal_event: tanggalEvent,
              gambar_url: finalPosterUrl,
              link_detail: linkDetail || null
            })
            .eq('id_pengumuman', editId);

          if (error) throw error;
          showToast(`Pengumuman #${editId} berhasil diperbarui dengan poster baru!`, 'success');
        } else {
          const { error } = await db
            .from('data_pengumuman')
            .insert({
              judul: judul,
              kategori: kategori,
              tanggal_event: tanggalEvent,
              gambar_url: finalPosterUrl,
              link_detail: linkDetail || null
            });

          if (error) throw error;
          showToast('Pengumuman baru dan poster berhasil diterbitkan ke landing page!', 'success');
        }

        closePengumumanModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menyimpan pengumuman:', err);
        showToast('Gagal menyimpan pengumuman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinnerIcon) spinnerIcon.className = 'ph ph-check-circle text-lg';
        if (submitText) submitText.textContent = isEdit ? 'Simpan Perubahan' : 'Simpan Pengumuman';
      }
    });
  }
}

/**
 * Membuka modal form pengumuman (Tambah / Edit)
 */
export function openPengumumanModal(mode = 'add', pengumumanId = null) {
  const modal = document.getElementById('modalPengumumanForm');
  const content = document.getElementById('modalPengumumanContent');
  const titleEl = document.getElementById('modalPengumumanTitle');
  const subtitleEl = document.getElementById('modalPengumumanSubtitle');
  const idInput = document.getElementById('inputPengumumanId');
  const judulInput = document.getElementById('inputPengumumanJudul');
  const selectKategori = document.getElementById('selectPengumumanKategori');
  const inputCustomKategori = document.getElementById('inputCustomPengumumanKategori');
  const tanggalInput = document.getElementById('inputPengumumanTanggal');
  const manualUrlInput = document.getElementById('inputPengumumanGambarUrl');
  const finalUrlInput = document.getElementById('inputFinalPosterUrl');
  const linkInput = document.getElementById('inputPengumumanLink');
  const placeholder = document.getElementById('posterUploadPlaceholder');
  const previewContainer = document.getElementById('posterPreviewContainer');
  const previewImg = document.getElementById('imgPosterPreview');
  const fileNameEl = document.getElementById('posterFileName');
  const fileSizeEl = document.getElementById('posterFileSize');
  const fileInput = document.getElementById('inputPosterFile');
  const submitText = document.getElementById('btnSavePengumumanText');

  if (!modal) return;

  state.selectedPosterFile = null;
  if (fileInput) fileInput.value = '';

  if (mode === 'add') {
    state.currentEditPengumuman = null;
    if (titleEl) titleEl.textContent = 'Tambah Pengumuman Baru';
    if (subtitleEl) subtitleEl.textContent = 'Pengumuman akan langsung tampil di beranda utama perpustakaan.';
    if (submitText) submitText.textContent = 'Simpan Pengumuman';

    if (idInput) idInput.value = '';
    if (judulInput) judulInput.value = '';
    if (tanggalInput) tanggalInput.value = '';
    if (manualUrlInput) manualUrlInput.value = '';
    if (finalUrlInput) finalUrlInput.value = '';
    if (linkInput) linkInput.value = '';

    if (inputCustomKategori) {
      inputCustomKategori.value = '';
      inputCustomKategori.classList.add('hidden');
      inputCustomKategori.required = false;
    }
    if (selectKategori) selectKategori.value = 'Event Kampus';

    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg) previewImg.src = '';
  } else {
    const item = (state.cache.pengumuman || []).find(p => String(p.id_pengumuman) === String(pengumumanId));
    if (!item) {
      showToast('Data pengumuman tidak ditemukan.', 'error');
      return;
    }

    state.currentEditPengumuman = item;
    if (titleEl) titleEl.textContent = 'Edit Pengumuman';
    if (subtitleEl) subtitleEl.textContent = `Memperbarui data pengumuman #${item.id_pengumuman}`;
    if (submitText) submitText.textContent = 'Simpan Perubahan';

    if (idInput) idInput.value = item.id_pengumuman;
    if (judulInput) judulInput.value = item.judul || '';
    if (tanggalInput) tanggalInput.value = item.tanggal_event || '';
    if (manualUrlInput) manualUrlInput.value = item.gambar_url || '';
    if (finalUrlInput) finalUrlInput.value = item.gambar_url || '';
    if (linkInput) linkInput.value = item.link_detail || '';

    const standardCats = ['Event Kampus', 'Akademik', 'Layanan', 'Pelatihan', 'Info Khusus'];
    if (selectKategori && inputCustomKategori) {
      if (standardCats.includes(item.kategori)) {
        selectKategori.value = item.kategori;
        inputCustomKategori.classList.add('hidden');
        inputCustomKategori.required = false;
      } else {
        selectKategori.value = '__custom__';
        inputCustomKategori.classList.remove('hidden');
        inputCustomKategori.value = item.kategori || '';
        inputCustomKategori.required = true;
      }
    }

    if (item.gambar_url) {
      if (previewImg) previewImg.src = item.gambar_url;
      if (fileNameEl) fileNameEl.textContent = 'Poster Aktif';
      if (fileSizeEl) fileSizeEl.textContent = 'Tersimpan di Cloud Supabase';
      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
    } else {
      if (placeholder) placeholder.classList.remove('hidden');
      if (previewContainer) previewContainer.classList.add('hidden');
    }
  }

  showModal(modal, content);
}

/**
 * Setup modal konfirmasi hapus pengumuman
 */
export function setupDeletePengumumanModal() {
  const modal = document.getElementById('modalDeletePengumuman');
  const content = document.getElementById('modalDeletePengumumanContent');
  const cancelBtn = document.getElementById('btnCancelDeletePengumuman');
  const confirmBtn = document.getElementById('btnConfirmDeletePengumuman');

  function closeDeleteModal() {
    hideModal(modal, content);
    state.deleteTargetPengumuman = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDeleteModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.deleteTargetPengumuman) return;
      const targetId = state.deleteTargetPengumuman.id_pengumuman;

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> <span>Menghapus...</span>';

        const { error } = await db
          .from('data_pengumuman')
          .delete()
          .eq('id_pengumuman', Number(targetId));

        if (error) throw error;

        showToast(`Pengumuman #${targetId} berhasil dihapus dari sistem.`, 'success');
        closeDeleteModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus pengumuman:', err);
        showToast('Gagal menghapus pengumuman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="ph ph-trash text-sm"></i> <span>Ya, Hapus Pengumuman</span>';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi hapus pengumuman
 */
export function openDeletePengumumanModal(pengumumanId) {
  const modal = document.getElementById('modalDeletePengumuman');
  const content = document.getElementById('modalDeletePengumumanContent');
  const titleEl = document.getElementById('deletePengumumanTitle');

  const item = (state.cache.pengumuman || []).find(p => String(p.id_pengumuman) === String(pengumumanId));
  if (!item) return;

  state.deleteTargetPengumuman = item;
  if (titleEl) titleEl.textContent = `"${item.judul}" (#${item.id_pengumuman})`;

  showModal(modal, content);
}
