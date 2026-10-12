/**
 * CAKRAWALA Digital Library - Modul Formulir Tambah & Edit Buku
 * File: public/petugas/modules/4-buku/modalFormBuku.js
 * 
 * FUNGSI:
 * - Menangani dialog formulir pop-up Tambah / Edit Buku (#modalBookForm)
 * - Unggah berkas gambar sampul langsung ke Supabase Storage (bucket 'buku')
 * - Drag-and-drop cover upload zone dengan validasi ukuran maks 5 MB
 * - Auto-generate ID buku (BK-xxx) dan QR Code
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import {
  generateRandomId,
  fileToDataUrl,
  showModal,
  hideModal,
  showToast
} from '../core/petugasHelper.js';
import { syncAllTables } from '../core/syncData.js';

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

  if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetCoverUploadState();
    });
  }

  if (manualUrlInput) {
    manualUrlInput.addEventListener('input', () => {
      const url = manualUrlInput.value.trim();
      const finalUrlInput = document.getElementById('inputFinalCoverUrl');
      if (finalUrlInput) finalUrlInput.value = url;

      if (url) {
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (previewImg) previewImg.src = url;
        if (fileNameEl) fileNameEl.textContent = 'URL Gambar Eksternal';
        if (fileSizeEl) fileSizeEl.textContent = 'Web Link';
      } else if (!state.selectedCoverFile) {
        if (placeholder) placeholder.classList.remove('hidden');
        if (previewContainer) previewContainer.classList.add('hidden');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await handleBookFormSubmit();
    });
  }
}

/**
 * Menangani pemilihan berkas gambar cover dari file dialog atau drag and drop
 */
async function handleCoverFileSelected(file) {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    showToast('Ukuran file cover terlalu besar! Maksimal 5 MB.', 'warning');
    return;
  }

  state.selectedCoverFile = file;

  const placeholder = document.getElementById('coverUploadPlaceholder');
  const previewContainer = document.getElementById('coverPreviewContainer');
  const previewImg = document.getElementById('imgCoverPreview');
  const fileNameEl = document.getElementById('coverFileName');
  const fileSizeEl = document.getElementById('coverFileSize');

  try {
    const dataUrl = await fileToDataUrl(file);
    if (placeholder) placeholder.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (previewImg) previewImg.src = dataUrl;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
  } catch (err) {
    console.error('Gagal membaca data URL file:', err);
    showToast('Gagal memuat pratinjau gambar.', 'error');
  }
}

/**
 * Menghasilkan ID Buku sekuensial terstandarisasi dengan padding 3 digit (contoh: BK-001, BK-002, BK-010)
 * berdasarkan nilai numerik tertinggi yang ada di database Supabase / cache lokal
 */
export async function generateSequentialBookId() {
  try {
    let bookRecords = [];

    // 1. Ambil data id_buku dari tabel data_buku via Supabase
    if (db) {
      const { data, error } = await db
        .from('data_buku')
        .select('id_buku')
        .order('id_buku', { ascending: false });

      if (!error && Array.isArray(data)) {
        bookRecords = data;
      }
    }

    // 2. Jika DB kosong atau offline, gunakan fallback state.cache.buku
    if (bookRecords.length === 0 && Array.isArray(state.cache.buku)) {
      bookRecords = state.cache.buku;
    }

    // Ekstraksi angka menggunakan regex aman sesuai panduan
    const existingIds = bookRecords
      .map(b => b && b.id_buku)
      .filter(id => id && /^BK-\d+$/i.test(id));

    let maxNum = 0;
    existingIds.forEach(id => {
      const num = parseInt(id.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const nextId = `BK-${String(maxNum + 1).padStart(3, '0')}`;
    return nextId;
  } catch (err) {
    console.warn('Gagal generate ID sekuensial dari DB, menggunakan fallback aman:', err);
    return 'BK-001';
  }
}

/**
 * Membuka formulir modal untuk menambah atau mengedit buku
 */
export async function openBookModal(mode = 'add', bookId = null) {
  const modal = document.getElementById('modalBookForm');
  const content = document.getElementById('modalBookContent');
  const titleEl = document.getElementById('modalBookTitle');
  const subTitleEl = document.getElementById('modalBookSubtitle');
  const formModeInput = document.getElementById('bookFormMode');
  const editIdInput = document.getElementById('editBookId');
  const autoIdEl = document.getElementById('previewAutoBookId');
  const autoQrEl = document.getElementById('previewAutoQrCode');
  const inputDisplay = document.getElementById('inputBookIdDisplay');

  if (!modal) return;

  const form = document.getElementById('formBook');
  if (form) form.reset();

  const fileInput = document.getElementById('inputCoverFile');
  if (fileInput) fileInput.value = '';
  state.selectedCoverFile = null;

  const placeholder = document.getElementById('coverUploadPlaceholder');
  const previewContainer = document.getElementById('coverPreviewContainer');
  const previewImg = document.getElementById('imgCoverPreview');
  const finalUrlInput = document.getElementById('inputFinalCoverUrl');

  if (placeholder) placeholder.classList.remove('hidden');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (previewImg) previewImg.src = '';
  if (finalUrlInput) finalUrlInput.value = '';

  if (mode === 'add') {
    if (formModeInput) formModeInput.value = 'add';
    if (editIdInput) editIdInput.value = '';
    if (titleEl) titleEl.textContent = 'Tambah Buku Baru';
    if (subTitleEl) subTitleEl.textContent = 'ID Buku dan string QR Code terstandarisasi sekuensial (BK-001, BK-002, dst).';

    // Inisialisasi awal nilai default aman
    let newId = 'BK-001';
    if (autoIdEl) autoIdEl.textContent = newId;
    if (autoQrEl) autoQrEl.textContent = newId;
    if (inputDisplay) inputDisplay.value = newId;

    // Hitung nomor sekuensial dari database secara asinkron
    try {
      newId = await generateSequentialBookId();
      if (autoIdEl) autoIdEl.textContent = newId;
      if (autoQrEl) autoQrEl.textContent = newId;
      if (inputDisplay) inputDisplay.value = newId;
    } catch (e) {
      console.warn('Fallback ID buku digunakan:', e);
    }

    const hargaInput = document.getElementById('inputHargaBuku');
    if (hargaInput) hargaInput.value = 50000;

    const stokInput = document.getElementById('inputStokBuku');
    if (stokInput) stokInput.value = 1;

    const tahunInput = document.getElementById('inputTahunTerbit');
    if (tahunInput) tahunInput.value = new Date().getFullYear();
  } else {
    // Mode Edit
    const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
    if (!book) {
      showToast('Data buku tidak ditemukan.', 'error');
      return;
    }

    if (formModeInput) formModeInput.value = 'edit';
    if (editIdInput) editIdInput.value = book.id_buku;
    if (titleEl) titleEl.textContent = 'Edit Data Buku';
    if (subTitleEl) subTitleEl.textContent = `Memperbarui rincian koleksi ${book.id_buku}.`;

    if (autoIdEl) autoIdEl.textContent = book.id_buku;
    if (autoQrEl) autoQrEl.textContent = book.kode_qr || book.id_buku;
    if (inputDisplay) inputDisplay.value = book.id_buku;

    const inputJudul = document.getElementById('inputJudulBuku');
    const inputPenulis = document.getElementById('inputPenulisBuku');
    const inputPenerbit = document.getElementById('inputPenerbitBuku');
    const inputTahun = document.getElementById('inputTahunTerbit');
    const selectKategori = document.getElementById('selectKategoriBuku');
    const inputStok = document.getElementById('inputStokBuku');
    const inputRak = document.getElementById('inputLokasiRak');
    const inputHarga = document.getElementById('inputHargaBuku');
    const inputManualUrl = document.getElementById('inputCoverUrl');

    if (inputJudul) inputJudul.value = book.judul_buku || '';
    if (inputPenulis) inputPenulis.value = book.penulis || '';
    if (inputPenerbit) inputPenerbit.value = book.penerbit || '';
    if (inputTahun) inputTahun.value = book.tahun_terbit || '';
    if (selectKategori) selectKategori.value = book.id_kategori || '';
    if (inputStok) inputStok.value = book.stok || 0;
    if (inputRak) inputRak.value = book.keterangan || '';
    if (inputHarga) inputHarga.value = book.harga_buku || 50000;

    if (book.cover_url) {
      if (finalUrlInput) finalUrlInput.value = book.cover_url;
      if (inputManualUrl) inputManualUrl.value = book.cover_url;
      if (placeholder) placeholder.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (previewImg) previewImg.src = book.cover_url;
      const fileNameEl = document.getElementById('coverFileName');
      const fileSizeEl = document.getElementById('coverFileSize');
      if (fileNameEl) fileNameEl.textContent = 'Cover Tersimpan';
      if (fileSizeEl) fileSizeEl.textContent = 'Supabase Storage';
    }
  }

  showModal(modal, content);
}

/**
 * Menyimpan data formulir buku ke database Supabase
 */
async function handleBookFormSubmit() {
  const formMode = document.getElementById('bookFormMode')?.value || 'add';
  const editId = document.getElementById('editBookId')?.value;
  let autoId = document.getElementById('previewAutoBookId')?.textContent?.trim();
  if (!autoId || autoId === 'BK-AUTO') {
    autoId = document.getElementById('inputBookIdDisplay')?.value?.trim();
  }
  if (!autoId || autoId === 'BK-AUTO') {
    autoId = await generateSequentialBookId();
  }
  const autoQr = autoId;

  const judul = document.getElementById('inputJudulBuku')?.value.trim();
  const penulis = document.getElementById('inputPenulisBuku')?.value.trim();
  const penerbit = document.getElementById('inputPenerbitBuku')?.value.trim();
  const tahun = parseInt(document.getElementById('inputTahunTerbit')?.value, 10);
  const idKategori = document.getElementById('selectKategoriBuku')?.value;
  const stok = parseInt(document.getElementById('inputStokBuku')?.value, 10);
  const keterangan = document.getElementById('inputLokasiRak')?.value.trim();
  const hargaBuku = parseInt(document.getElementById('inputHargaBuku')?.value, 10) || 50000;
  let finalCoverUrl = document.getElementById('inputFinalCoverUrl')?.value.trim() || null;

  if (!judul || !penulis || !penerbit || !idKategori) {
    showToast('Harap lengkapi seluruh kolom bertanda bintang (*)!', 'warning');
    return;
  }

  const saveBtn = document.getElementById('btnSaveBook');
  const saveText = document.getElementById('btnSaveBookText');
  const spinnerIcon = document.getElementById('iconSaveBookSpinner');

  try {
    if (saveBtn) saveBtn.disabled = true;
    if (saveText) saveText.textContent = 'Menyimpan...';
    if (spinnerIcon) spinnerIcon.className = 'ph ph-spinner animate-spin text-lg';

    // 1. Jika ada file foto cover baru yang dipilih, unggah ke Supabase Storage bucket 'buku'
    if (state.selectedCoverFile) {
      const fileExt = state.selectedCoverFile.name.split('.').pop();
      const fileName = `${formMode === 'add' ? autoId : editId}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await db.storage
        .from('buku')
        .upload(fileName, state.selectedCoverFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        console.warn('Gagal upload ke Storage, menggunakan fallback jika ada:', uploadErr);
      } else {
        const { data: publicUrlData } = db.storage.from('buku').getPublicUrl(fileName);
        if (publicUrlData && publicUrlData.publicUrl) {
          finalCoverUrl = publicUrlData.publicUrl;
        }
      }
    }

    const statusBuku = stok > 0 ? 'Tersedia' : 'Dipinjam';

    if (formMode === 'add') {
      const { error: insertErr } = await db
        .from('data_buku')
        .insert({
          id_buku: autoId,
          judul_buku: judul,
          penulis: penulis,
          penerbit: penerbit,
          tahun_terbit: tahun,
          id_kategori: idKategori,
          stok: stok,
          status: statusBuku,
          keterangan: keterangan,
          cover_url: finalCoverUrl,
          harga_buku: hargaBuku,
          kode_qr: autoId // Disinkronkan sama persis dengan id_buku (contoh: BK-001)
        });

      if (insertErr) throw insertErr;
      showToast(`Buku baru "${judul}" berhasil ditambahkan!`, 'success');
    } else {
      const updatePayload = {
        judul_buku: judul,
        penulis: penulis,
        penerbit: penerbit,
        tahun_terbit: tahun,
        id_kategori: idKategori,
        stok: stok,
        status: statusBuku,
        keterangan: keterangan,
        harga_buku: hargaBuku
      };
      if (finalCoverUrl) {
        updatePayload.cover_url = finalCoverUrl;
      }

      const { error: updateErr } = await db
        .from('data_buku')
        .update(updatePayload)
        .eq('id_buku', editId);

      if (updateErr) throw updateErr;
      showToast(`Buku "${judul}" berhasil diperbarui!`, 'success');
    }

    const modal = document.getElementById('modalBookForm');
    const content = document.getElementById('modalBookContent');
    hideModal(modal, content);

    // Sinkronisasi data ulang
    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllTables();
    }
  } catch (err) {
    console.error('Gagal menyimpan buku:', err);
    showToast('Gagal menyimpan buku: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveText) saveText.textContent = 'Simpan Buku';
    if (spinnerIcon) spinnerIcon.className = 'ph ph-check-circle text-lg';
  }
}

// Window bindings
if (typeof window !== 'undefined') {
  window.openBookModal = openBookModal;
  window.setupBookFormModal = setupBookFormModal;
}
