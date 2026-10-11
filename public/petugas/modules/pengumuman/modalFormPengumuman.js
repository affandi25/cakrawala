/**
 * CAKRAWALA Digital Library - Modul Formulir Tambah & Edit Pengumuman
 * File: public/petugas/modules/pengumuman/modalFormPengumuman.js
 * 
 * FUNGSI:
 * - Menangani dialog formulir pop-up Tambah / Edit Pengumuman (#modalPengumumanForm)
 * - Unggah berkas gambar poster langsung ke Supabase Storage (bucket 'pengumuman')
 * - Drag-and-drop poster upload zone dengan preview real-time
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import { fileToDataUrl, showModal, hideModal, showToast } from '../petugasHelper.js';

let isFormModalSetup = false;

/**
 * Setup formulir modal tambah / edit pengumuman & upload gambar poster
 */
export function setupPengumumanFormModal() {
  if (isFormModalSetup) return;
  isFormModalSetup = true;

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
