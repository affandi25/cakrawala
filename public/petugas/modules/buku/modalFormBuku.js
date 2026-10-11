/**
 * CAKRAWALA Digital Library - Modul Formulir Tambah & Edit Buku
 * File: public/petugas/modules/buku/modalFormBuku.js
 * 
 * FUNGSI:
 * - Menangani dialog formulir pop-up Tambah / Edit Buku (#modalBookForm)
 * - Unggah berkas gambar sampul langsung ke Supabase Storage (bucket 'buku')
 * - Drag-and-drop cover upload zone dengan validasi ukuran maks 5 MB
 * - Auto-generate ID buku (BK-xxx) dan QR Code
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import {
  generateRandomId,
  fileToDataUrl,
  showModal,
  hideModal,
  showToast
} from '../petugasHelper.js';

let isBookFormModalSetup = false;

/**
 * Setup modal formulir tambah / edit buku
 */
export function setupBookFormModal() {
  if (isBookFormModalSetup) return;
  isBookFormModalSetup = true;

  const modal = document.getElementById('modalBookForm');
  const content = document.getElementById('modalBookContent');
  const closeBtn = document.getElementById('btnCloseBookModal');
  const cancelBtn = document.getElementById('btnCancelBookModal');
  const form = document.getElementById('formBook');

  const dropzone = document.getElementById('dropzoneCover');
  const fileInput = document.getElementById('inputCoverFile');
  const placeholder = document.getElementById('coverUploadPlaceholder');
  const previewContainer = document.getElementById('coverPreviewContainer');
  const previewImg = document.getElementById('imgCoverPreview');
  const fileNameEl = document.getElementById('coverFileName');
  const fileSizeEl = document.getElementById('coverFileSize');
  const removeCoverBtn = document.getElementById('btnRemoveCover');
  const manualUrlInput = document.getElementById('inputCoverUrl');

  function closeBookModal() {
    hideModal(modal, content);
    resetCoverUploadState();
  }

  function resetCoverUploadState() {
    state.selectedCoverFile = null;
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (manualUrlInput) manualUrlInput.value = '';
    const finalUrlInput = document.getElementById('inputFinalCoverUrl');
    if (finalUrlInput) finalUrlInput.value = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeBookModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBookModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeBookModal();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', e => {
      if (e.target !== removeCoverBtn && !removeCoverBtn.contains(e.target)) {
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
        handleCoverFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleCoverFileSelected(fileInput.files[0]);
      }
    });
  }

  function handleCoverFileSelected(file) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      showToast('Format file harus berupa gambar (JPG, PNG, atau WEBP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal adalah 5 MB.', 'warning');
      return;
    }

    state.selectedCoverFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) previewImg.src = e.target.result;
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;

      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetCoverUploadState();
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const mode = document.getElementById('bookFormMode').value;
      const editId = document.getElementById('editBookId').value;

      const judul = document.getElementById('inputJudulBuku').value.trim();
      const penulis = document.getElementById('inputPenulisBuku').value.trim();
      const penerbit = document.getElementById('inputPenerbitBuku').value.trim();
      const tahun = parseInt(document.getElementById('inputTahunTerbit').value, 10);
      const kategori = document.getElementById('selectKategoriBuku').value;
      const stok = parseInt(document.getElementById('inputStokBuku').value, 10) || 0;
      const lokasiRak = document.getElementById('inputLokasiRak').value.trim();
      const harga = parseFloat(document.getElementById('inputHargaBuku').value) || 50000;
      const existingCoverUrl = document.getElementById('inputFinalCoverUrl').value;
      const manualCoverUrl = manualUrlInput ? manualUrlInput.value.trim() : '';

      if (!judul || !penulis || !penerbit || !tahun || !kategori || !lokasiRak) {
        showToast('Harap lengkapi semua isian wajib buku bertanda (*).', 'warning');
        return;
      }

      const saveBtn = document.getElementById('btnSaveBook');
      const saveBtnText = document.getElementById('btnSaveBookText');

      try {
        if (saveBtn) saveBtn.disabled = true;

        let finalCoverUrl = existingCoverUrl || manualCoverUrl || null;

        if (state.selectedCoverFile) {
          if (saveBtnText) saveBtnText.textContent = 'Mengunggah Cover ke Storage...';

          const file = state.selectedCoverFile;
          const fileExt = file.name.split('.').pop() || 'jpg';
          const cleanFileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const storagePath = `covers/${cleanFileName}`;

          try {
            const { data: uploadData, error: uploadErr } = await db.storage
              .from('buku')
              .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadErr) {
              console.warn('Pemberitahuan unggah storage Supabase:', uploadErr.message);
              finalCoverUrl = await fileToDataUrl(file);
            } else {
              const { data: publicData } = db.storage
                .from('buku')
                .getPublicUrl(uploadData.path || storagePath);

              if (publicData && publicData.publicUrl) {
                finalCoverUrl = publicData.publicUrl;
              }
            }
          } catch (storageException) {
            console.warn('Terjadi kendala storage, menggunakan cadangan data URL:', storageException);
            finalCoverUrl = await fileToDataUrl(file);
          }
        }

        if (saveBtnText) saveBtnText.textContent = 'Menyimpan Buku...';

        if (mode === 'add') {
          const generatedBookId = generateRandomId('BK', 5);
          const generatedQrCode = generatedBookId;
          const statusBuku = stok > 0 ? 'Tersedia' : 'Dipinjam';

          const { error } = await db
            .from('data_buku')
            .insert({
              id_buku: generatedBookId,
              judul_buku: judul,
              penulis: penulis,
              penerbit: penerbit,
              tahun_terbit: tahun,
              id_kategori: kategori,
              kode_qr: generatedQrCode,
              stok: stok,
              status: statusBuku,
              keterangan: lokasiRak,
              cover_url: finalCoverUrl,
              harga_buku: harga
            });

          if (error) throw error;
          showToast(`Buku baru berhasil ditambahkan (${generatedBookId})!`, 'success');
        } else {
          const statusBuku = stok > 0 ? 'Tersedia' : 'Dipinjam';

          const { error } = await db
            .from('data_buku')
            .update({
              judul_buku: judul,
              penulis: penulis,
              penerbit: penerbit,
              tahun_terbit: tahun,
              id_kategori: kategori,
              stok: stok,
              status: statusBuku,
              keterangan: lokasiRak,
              cover_url: finalCoverUrl,
              harga_buku: harga
            })
            .eq('id_buku', editId);

          if (error) throw error;
          showToast(`Perubahan buku ${editId} berhasil disimpan!`, 'success');
        }

        closeBookModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menyimpan buku:', err);
        showToast('Gagal menyimpan data buku: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (saveBtnText) saveBtnText.textContent = 'Simpan Buku';
      }
    });
  }
}

/**
 * Membuka jendela modal formulir buku untuk Tambah atau Edit
 */
export function openBookModal(mode = 'add', bookId = null) {
  const modal = document.getElementById('modalBookForm');
  const content = document.getElementById('modalBookContent');
  if (!modal) return;

  const modalTitle = document.getElementById('modalBookTitle');
  const modalSubtitle = document.getElementById('modalBookSubtitle');
  const formMode = document.getElementById('bookFormMode');
  const editIdInput = document.getElementById('editBookId');
  const previewAutoBookId = document.getElementById('previewAutoBookId');
  const previewAutoQrCode = document.getElementById('previewAutoQrCode');
  const finalCoverInput = document.getElementById('inputFinalCoverUrl');

  const placeholder = document.getElementById('coverUploadPlaceholder');
  const previewContainer = document.getElementById('coverPreviewContainer');
  const previewImg = document.getElementById('imgCoverPreview');
  const fileNameEl = document.getElementById('coverFileName');
  const fileSizeEl = document.getElementById('coverFileSize');

  state.selectedCoverFile = null;

  if (mode === 'add') {
    if (modalTitle) modalTitle.textContent = 'Tambah Buku Baru';
    if (modalSubtitle) modalSubtitle.textContent = 'ID Buku dan kode QR digenerate otomatis, cover diunggah ke Supabase Storage.';
    if (formMode) formMode.value = 'add';
    if (editIdInput) editIdInput.value = '';
    if (finalCoverInput) finalCoverInput.value = '';

    if (previewAutoBookId) previewAutoBookId.textContent = 'BK-AUTO (Auto-Generated)';
    if (previewAutoQrCode) previewAutoQrCode.textContent = 'AUTO';

    document.getElementById('inputJudulBuku').value = '';
    document.getElementById('inputPenulisBuku').value = '';
    document.getElementById('inputPenerbitBuku').value = '';
    document.getElementById('inputTahunTerbit').value = new Date().getFullYear();
    document.getElementById('selectKategoriBuku').value = '';
    document.getElementById('inputStokBuku').value = '1';
    document.getElementById('inputLokasiRak').value = '';
    document.getElementById('inputHargaBuku').value = '50000';
    document.getElementById('inputCoverUrl').value = '';

    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg) previewImg.src = '';
  } else {
    const book = state.cache.buku.find(b => b.id_buku === bookId);
    if (!book) return;

    if (modalTitle) modalTitle.textContent = 'Edit Data Buku';
    if (modalSubtitle) modalSubtitle.textContent = `Memperbarui rincian koleksi buku ${book.id_buku}.`;
    if (formMode) formMode.value = 'edit';
    if (editIdInput) editIdInput.value = book.id_buku;
    if (finalCoverInput) finalCoverInput.value = book.cover_url || '';

    if (previewAutoBookId) previewAutoBookId.textContent = book.id_buku;
    if (previewAutoQrCode) previewAutoQrCode.textContent = book.kode_qr || book.id_buku;

    document.getElementById('inputJudulBuku').value = book.judul_buku || '';
    document.getElementById('inputPenulisBuku').value = book.penulis || '';
    document.getElementById('inputPenerbitBuku').value = book.penerbit || '';
    document.getElementById('inputTahunTerbit').value = book.tahun_terbit || new Date().getFullYear();
    document.getElementById('selectKategoriBuku').value = book.id_kategori || '';
    document.getElementById('inputStokBuku').value = book.stok || 0;
    document.getElementById('inputLokasiRak').value = book.keterangan || '';
    document.getElementById('inputHargaBuku').value = book.harga_buku || 50000;
    document.getElementById('inputCoverUrl').value = book.cover_url || '';

    if (book.cover_url) {
      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (previewImg) previewImg.src = book.cover_url;
      if (fileNameEl) fileNameEl.textContent = 'Cover Tersimpan';
      if (fileSizeEl) fileSizeEl.textContent = 'Supabase Storage';
    } else {
      if (placeholder) placeholder.classList.remove('hidden');
      if (previewContainer) previewContainer.classList.add('hidden');
      if (previewImg) previewImg.src = '';
    }
  }

  showModal(modal, content);
}
