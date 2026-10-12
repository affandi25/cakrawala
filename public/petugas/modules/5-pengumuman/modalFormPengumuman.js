/**
 * CAKRAWALA Digital Library - Modul Formulir Tambah & Edit Pengumuman
 * File: public/petugas/modules/5-pengumuman/modalFormPengumuman.js
 * 
 * FUNGSI:
 * - Menangani dialog formulir pop-up Tambah / Edit Pengumuman (#modalPengumumanForm)
 * - Unggah berkas gambar poster langsung ke Supabase Storage (bucket 'pengumuman')
 * - Drag-and-drop poster upload zone dengan preview real-time
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import { fileToDataUrl, showModal, hideModal, showToast } from '../core/petugasHelper.js';
import { syncAllTables } from '../core/syncData.js';

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

  if (removePosterBtn) {
    removePosterBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetPosterUploadState();
    });
  }

  if (manualUrlInput) {
    manualUrlInput.addEventListener('input', () => {
      const url = manualUrlInput.value.trim();
      if (finalUrlInput) finalUrlInput.value = url;

      if (url) {
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (previewImg) previewImg.src = url;
        if (fileNameEl) fileNameEl.textContent = 'URL Gambar Eksternal';
        if (fileSizeEl) fileSizeEl.textContent = 'Web Link';
      } else if (!state.selectedPosterFile) {
        if (placeholder) placeholder.classList.remove('hidden');
        if (previewContainer) previewContainer.classList.add('hidden');
      }
    });
  }

  if (selectKategori && inputCustomKategori) {
    selectKategori.addEventListener('change', () => {
      if (selectKategori.value === '__custom__') {
        inputCustomKategori.classList.remove('hidden');
        inputCustomKategori.focus();
      } else {
        inputCustomKategori.classList.add('hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await handlePengumumanFormSubmit();
    });
  }
}

/**
 * Menangani pemilihan berkas gambar poster
 */
async function handlePosterFileSelected(file) {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    showToast('Ukuran file poster terlalu besar! Maksimal 5 MB.', 'warning');
    return;
  }

  state.selectedPosterFile = file;

  const placeholder = document.getElementById('posterUploadPlaceholder');
  const previewContainer = document.getElementById('posterPreviewContainer');
  const previewImg = document.getElementById('imgPosterPreview');
  const fileNameEl = document.getElementById('posterFileName');
  const fileSizeEl = document.getElementById('posterFileSize');

  try {
    const dataUrl = await fileToDataUrl(file);
    if (placeholder) placeholder.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (previewImg) previewImg.src = dataUrl;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
  } catch (err) {
    console.error('Gagal membaca pratinjau poster:', err);
    showToast('Gagal memproses pratinjau gambar poster.', 'error');
  }
}

/**
 * Membuka formulir modal untuk menambah atau mengedit pengumuman
 */
export function openPengumumanModal(mode = 'add', pengumumanId = null) {
  const modal = document.getElementById('modalPengumumanForm');
  const content = document.getElementById('modalPengumumanContent');
  const titleEl = document.getElementById('modalPengumumanTitle');
  const subtitleEl = document.getElementById('modalPengumumanSubtitle');
  const idInput = document.getElementById('inputPengumumanId');
  const judulInput = document.getElementById('inputPengumumanJudul');
  const kategoriSelect = document.getElementById('selectPengumumanKategori');
  const customKategoriInput = document.getElementById('inputCustomPengumumanKategori');
  const tanggalInput = document.getElementById('inputPengumumanTanggal');
  const linkInput = document.getElementById('inputPengumumanLink');
  const manualUrlInput = document.getElementById('inputPengumumanGambarUrl');
  const finalUrlInput = document.getElementById('inputFinalPosterUrl');

  const placeholder = document.getElementById('posterUploadPlaceholder');
  const previewContainer = document.getElementById('posterPreviewContainer');
  const previewImg = document.getElementById('imgPosterPreview');
  const fileNameEl = document.getElementById('posterFileName');
  const fileSizeEl = document.getElementById('posterFileSize');
  const fileInput = document.getElementById('inputPosterFile');

  if (!modal) return;

  const form = document.getElementById('formPengumuman');
  if (form) form.reset();

  state.selectedPosterFile = null;
  if (fileInput) fileInput.value = '';
  if (customKategoriInput) customKategoriInput.classList.add('hidden');

  if (placeholder) placeholder.classList.remove('hidden');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (previewImg) previewImg.src = '';
  if (finalUrlInput) finalUrlInput.value = '';

  if (mode === 'add') {
    state.currentEditPengumuman = null;
    if (idInput) idInput.value = '';
    if (titleEl) titleEl.textContent = 'Tambah Pengumuman Baru';
    if (subtitleEl) subtitleEl.textContent = 'Pengumuman akan langsung tampil di beranda utama perpustakaan.';
    if (kategoriSelect) kategoriSelect.value = 'Event Kampus';
  } else {
    const item = (state.cache.pengumuman || []).find(p => String(p.id_pengumuman) === String(pengumumanId));
    if (!item) {
      showToast('Data pengumuman tidak ditemukan.', 'error');
      return;
    }

    state.currentEditPengumuman = item;
    if (idInput) idInput.value = item.id_pengumuman;
    if (titleEl) titleEl.textContent = 'Edit Data Pengumuman';
    if (subtitleEl) subtitleEl.textContent = `Memperbarui agenda #${item.id_pengumuman}.`;

    if (judulInput) judulInput.value = item.judul || '';
    if (tanggalInput) tanggalInput.value = item.tanggal_event || '';
    if (linkInput) linkInput.value = item.link_detail || '';

    // Handle Kategori
    if (kategoriSelect) {
      const predefined = ['Event Kampus', 'Akademik', 'Layanan', 'Pelatihan', 'Info Khusus'];
      if (predefined.includes(item.kategori)) {
        kategoriSelect.value = item.kategori;
        if (customKategoriInput) customKategoriInput.classList.add('hidden');
      } else {
        kategoriSelect.value = '__custom__';
        if (customKategoriInput) {
          customKategoriInput.classList.remove('hidden');
          customKategoriInput.value = item.kategori || '';
        }
      }
    }

    // Handle Foto Poster yang Ada
    if (item.gambar_url) {
      if (finalUrlInput) finalUrlInput.value = item.gambar_url;
      if (manualUrlInput) manualUrlInput.value = item.gambar_url;
      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (previewImg) previewImg.src = item.gambar_url;
      if (fileNameEl) fileNameEl.textContent = 'Poster Tersimpan';
      if (fileSizeEl) fileSizeEl.textContent = 'Supabase Storage';
    }
  }

  showModal(modal, content);
}

/**
 * Menyimpan data formulir pengumuman ke database Supabase
 */
async function handlePengumumanFormSubmit() {
  const id = document.getElementById('inputPengumumanId')?.value;
  const judul = document.getElementById('inputPengumumanJudul')?.value.trim();
  const selectKat = document.getElementById('selectPengumumanKategori');
  const customKatInput = document.getElementById('inputCustomPengumumanKategori');
  const tanggal = document.getElementById('inputPengumumanTanggal')?.value.trim();
  const linkDetail = document.getElementById('inputPengumumanLink')?.value.trim();
  let finalPosterUrl = document.getElementById('inputFinalPosterUrl')?.value.trim() || null;

  let kategori = selectKat ? selectKat.value : 'Event Kampus';
  if (kategori === '__custom__') {
    kategori = customKatInput ? customKatInput.value.trim() : 'Event Kampus';
  }

  if (!judul || !tanggal || !kategori) {
    showToast('Harap lengkapi judul, kategori, dan tanggal pengumuman!', 'warning');
    return;
  }

  const saveBtn = document.getElementById('btnSavePengumuman');
  const saveText = document.getElementById('btnSavePengumumanText');
  const spinnerIcon = document.getElementById('iconSavePengumumanSpinner');

  try {
    if (saveBtn) saveBtn.disabled = true;
    if (saveText) saveText.textContent = 'Menyimpan...';
    if (spinnerIcon) spinnerIcon.className = 'ph ph-spinner animate-spin text-lg';

    // 1. Upload berkas poster jika petugas memilih file lokal baru
    if (state.selectedPosterFile) {
      const fileExt = state.selectedPosterFile.name.split('.').pop();
      const fileName = `poster-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await db.storage
        .from('pengumuman')
        .upload(fileName, state.selectedPosterFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        console.warn('Gagal upload ke Storage, gunakan URL fallback:', uploadErr);
      } else {
        const { data: publicUrlData } = db.storage.from('pengumuman').getPublicUrl(fileName);
        if (publicUrlData && publicUrlData.publicUrl) {
          finalPosterUrl = publicUrlData.publicUrl;
        }
      }
    }

    const payload = {
      judul: judul,
      kategori: kategori,
      tanggal_event: tanggal,
      link_detail: linkDetail || null
    };

    if (finalPosterUrl) {
      payload.gambar_url = finalPosterUrl;
    }

    if (!id) {
      // TAMBAH BARU
      const { error: insertErr } = await db
        .from('data_pengumuman')
        .insert(payload);

      if (insertErr) throw insertErr;
      showToast(`Pengumuman "${judul}" berhasil diterbitkan!`, 'success');
    } else {
      // EDIT DATA
      const { error: updateErr } = await db
        .from('data_pengumuman')
        .update(payload)
        .eq('id_pengumuman', Number(id));

      if (updateErr) throw updateErr;
      showToast(`Pengumuman "${judul}" berhasil diperbarui!`, 'success');
    }

    const modal = document.getElementById('modalPengumumanForm');
    const content = document.getElementById('modalPengumumanContent');
    hideModal(modal, content);

    // Sinkronisasi data realtime
    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllTables();
    }
  } catch (err) {
    console.error('Gagal menyimpan pengumuman:', err);
    showToast('Gagal menyimpan pengumuman: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveText) saveText.textContent = 'Simpan Pengumuman';
    if (spinnerIcon) spinnerIcon.className = 'ph ph-check-circle text-lg';
  }
}

// Window bindings
if (typeof window !== 'undefined') {
  window.openPengumumanModal = openPengumumanModal;
  window.setupPengumumanFormModal = setupPengumumanFormModal;
}
