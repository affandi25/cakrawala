/**
 * CAKRAWALA Digital Library - Modul Meja 4: Inventaris Koleksi Buku & QR Sticker
 * File: public/petugas/modules/buku.js
 * 
 * FUNGSI:
 * - Menampilkan katalog koleksi buku beserta status ketersediaan dan filter rak/kategori
 * - Formulir Tambah & Edit Buku dengan drag-and-drop cover upload ke Supabase Storage (bucket 'buku')
 * - Pembuat stiker QR Code (QRCode.js) dengan Quiet-Zone label untuk dicetak maupun diunduh PNG
 * - Sistem konfirmasi hapus buku dengan proteksi transaksi aktif (tidak bisa hapus jika buku sedang dipinjam)
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatRupiah,
  generateRandomId,
  fileToDataUrl,
  showModal,
  hideModal,
  showToast
} from './utils.js';

/**
 * Mengisi opsi dropdown kategori buku pada filter pencarian dan formulir modal
 */
export function renderCategoryDropdowns() {
  const filterSelect = document.getElementById('selectFilterKategori');
  const modalSelect = document.getElementById('selectKategoriBuku');

  let filterOptions = '<option value="">Semua Kategori</option>';
  let modalOptions = '<option value="">-- Pilih Kategori --</option>';

  state.cache.kategori.forEach(kat => {
    filterOptions += `<option value="${kat.id_kategori}">${kat.nama_kategori}</option>`;
    modalOptions += `<option value="${kat.id_kategori}">${kat.nama_kategori}</option>`;
  });

  if (filterSelect) filterSelect.innerHTML = filterOptions;
  if (modalSelect) modalSelect.innerHTML = modalOptions;
}

/**
 * Memasang pendengar peristiwa (event listener) pada modul inventaris buku
 */
export function setupBooksHandlers() {
  const searchInput = document.getElementById('inputSearchBooks');
  const clearSearchBtn = document.getElementById('btnClearSearchBooks');
  const filterKatSelect = document.getElementById('selectFilterKategori');
  const filterStatusSelect = document.getElementById('selectFilterStatusBuku');
  const refreshBtn = document.getElementById('btnRefreshBooks');
  const openAddBtn = document.getElementById('btnOpenAddBookModal');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchBooksQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        if (state.searchBooksQuery) {
          clearSearchBtn.classList.remove('hidden');
        } else {
          clearSearchBtn.classList.add('hidden');
        }
      }
      renderBooksInventory();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchBooksQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderBooksInventory();
    });
  }

  if (filterKatSelect) {
    filterKatSelect.addEventListener('change', e => {
      state.filterCategoryBook = e.target.value;
      renderBooksInventory();
    });
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', e => {
      state.filterStatusBook = e.target.value;
      renderBooksInventory();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui inventaris buku...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => openBookModal('add'));
  }

  setupBookFormModal();
  setupQrCodeModal();
  setupDeleteBookModal();
}

/**
 * Merender daftar tabel katalog inventaris buku
 */
export function renderBooksInventory() {
  const tbody = document.getElementById('tableBooksBody');
  const recordCount = document.getElementById('booksRecordCount');
  const tableInfo = document.getElementById('booksTableInfo');
  if (!tbody) return;

  let filtered = [...state.cache.buku];

  if (state.filterCategoryBook) {
    filtered = filtered.filter(b => b.id_kategori === state.filterCategoryBook);
  }

  if (state.filterStatusBook) {
    filtered = filtered.filter(b => b.status === state.filterStatusBook);
  }

  if (state.searchBooksQuery) {
    const q = state.searchBooksQuery;
    filtered = filtered.filter(b => {
      const matchTitle = (b.judul_buku || '').toLowerCase().includes(q);
      const matchAuthor = (b.penulis || '').toLowerCase().includes(q);
      const matchPublisher = (b.penerbit || '').toLowerCase().includes(q);
      const matchId = (b.id_buku || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchPublisher || matchId;
    });
  }

  if (recordCount) recordCount.textContent = `${filtered.length} Buku`;
  if (tableInfo) {
    tableInfo.textContent = `Menampilkan ${filtered.length} dari ${state.cache.buku.length} total koleksi buku.`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-books text-3xl inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada buku yang ditemukan.</p>
          <p class="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  filtered.forEach(book => {
    const kategori = state.cache.kategori.find(k => k.id_kategori === book.id_kategori);
    const namaKategori = kategori ? kategori.nama_kategori : '-';
    const coverUrl = book.cover_url || null;
    const stok = Number(book.stok) || 0;

    let statusBadge = '';
    if (stok > 0) {
      statusBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Tersedia (${stok})
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600"></span> Dipinjam Habis
        </span>
      `;
    }

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-12 w-9 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" onerror="this.src='';this.parentElement.innerHTML='<i class=\\'ph ph-book text-base\\'></i>'" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div>
              <span class="font-mono text-xs font-bold text-navy">${book.id_buku}</span>
              <p class="text-[10px] text-slate-400">Tahun: ${book.tahun_terbit}</p>
            </div>
          </div>
        </td>

        <td class="px-5 py-3">
          <p class="font-bold text-slate-800 text-xs line-clamp-1">${book.judul_buku}</p>
          <p class="text-[11px] text-slate-500">${book.penulis} &bull; <span class="text-slate-400">${book.penerbit}</span></p>
        </td>

        <td class="px-5 py-3 text-xs">
          <span class="font-semibold text-slate-700 block">${namaKategori}</span>
          <span class="inline-block mt-0.5 rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-navy">${book.keterangan || 'Rak Umum'}</span>
        </td>

        <td class="px-5 py-3">
          ${statusBadge}
        </td>

        <td class="px-5 py-3 text-xs font-bold text-slate-700">
          ${formatRupiah(book.harga_buku)}
        </td>

        <td class="px-5 py-3 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button type="button" data-action="view-qr" data-id="${book.id_buku}" title="Lihat & Cetak Label QR"
              class="btn-view-qr flex h-8 w-8 items-center justify-center rounded-lg bg-navy/10 text-navy hover:bg-navy hover:text-white transition">
              <i class="ph ph-qr-code text-base"></i>
            </button>

            <button type="button" data-action="edit-book" data-id="${book.id_buku}" title="Edit Buku"
              class="btn-edit-book flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-navy transition">
              <i class="ph ph-pencil-simple text-base"></i>
            </button>

            <button type="button" data-action="delete-book" data-id="${book.id_buku}" title="Hapus Buku"
              class="btn-delete-book flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
              <i class="ph ph-trash text-base"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  tbody.querySelectorAll('.btn-view-qr').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openQrCodeModal(id);
    });
  });

  tbody.querySelectorAll('.btn-edit-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openBookModal('edit', id);
    });
  });

  tbody.querySelectorAll('.btn-delete-book').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDeleteBookModal(id);
    });
  });
}

/**
 * Setup modal formulir tambah / edit buku
 */
export function setupBookFormModal() {
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

/**
 * Setup modal preview dan cetak/unduh label QR stiker buku
 */
export function setupQrCodeModal() {
  const modal = document.getElementById('modalQrCode');
  const content = document.getElementById('modalQrContent');
  const closeBtn = document.getElementById('btnCloseQrModal');
  const printBtn = document.getElementById('btnPrintQrLabel');
  const downloadBtn = document.getElementById('btnDownloadQrPng');

  function closeQrModal() {
    hideModal(modal, content);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeQrModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeQrModal();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!state.currentQrBook) return;
      
      const container = document.getElementById('qrcodeCanvasContainer');
      const imgOrCanvas = container ? (container.querySelector('img') || container.querySelector('canvas')) : null;

      if (!imgOrCanvas) {
        showToast('Gambar QR Code belum selesai dirender.', 'warning');
        return;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 300;
      exportCanvas.height = 350;
      const ctx = exportCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 350);

      ctx.fillStyle = '#000C4F';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PERPUSTAKAAN CAKRAWALA', 150, 24);

      ctx.drawImage(imgOrCanvas, 35, 35, 230, 230);

      ctx.fillStyle = '#000C4F';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(state.currentQrBook.id_buku, 150, 295);

      ctx.fillStyle = '#475569';
      ctx.font = '500 12px Inter, sans-serif';
      const judul = state.currentQrBook.judul_buku || '';
      ctx.fillText(judul.length > 28 ? judul.slice(0, 28) + '...' : judul, 150, 320);

      const dataUrl = exportCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Stiker-QR-${state.currentQrBook.id_buku}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`QR Code ${state.currentQrBook.id_buku} berhasil diunduh dengan label resmi.`, 'success');
    });
  }
}

/**
 * Menampilkan kode QR buku pada modal
 */
export function openQrCodeModal(bookId) {
  const modal = document.getElementById('modalQrCode');
  const content = document.getElementById('modalQrContent');
  const book = state.cache.buku.find(b => b.id_buku === bookId);
  if (!book) {
    showToast('Buku tidak ditemukan.', 'error');
    return;
  }

  state.currentQrBook = book;
  const kategori = state.cache.kategori.find(k => k.id_kategori === book.id_kategori);

  const qrModalBookId = document.getElementById('qrModalBookId');
  const qrModalBookTitle = document.getElementById('qrModalBookTitle');
  const qrModalBookAuthor = document.getElementById('qrModalBookAuthor');
  const qrModalCategory = document.getElementById('qrModalCategory');
  const qrModalShelf = document.getElementById('qrModalShelf');

  if (qrModalBookId) qrModalBookId.textContent = book.id_buku;
  if (qrModalBookTitle) qrModalBookTitle.textContent = book.judul_buku;
  if (qrModalBookAuthor) qrModalBookAuthor.textContent = book.penulis;
  if (qrModalCategory) qrModalCategory.textContent = `Kategori: ${kategori ? kategori.nama_kategori : '-'}`;
  if (qrModalShelf) qrModalShelf.textContent = `Rak: ${book.keterangan || '-'}`;

  const printBookId = document.getElementById('printBookId');
  const printBookTitle = document.getElementById('printBookTitle');
  const printBookAuthor = document.getElementById('printBookAuthor');
  const printBookCategory = document.getElementById('printBookCategory');
  const printBookShelf = document.getElementById('printBookShelf');

  if (printBookId) printBookId.textContent = book.id_buku;
  if (printBookTitle) printBookTitle.textContent = book.judul_buku;
  if (printBookAuthor) printBookAuthor.textContent = book.penulis;
  if (printBookCategory) printBookCategory.textContent = kategori ? kategori.nama_kategori : '-';
  if (printBookShelf) printBookShelf.textContent = book.keterangan || '-';

  const container = document.getElementById('qrcodeCanvasContainer');
  const printContainer = document.getElementById('printQrTargetCanvas');

  if (container && window.QRCode) {
    container.innerHTML = '';
    new window.QRCode(container, {
      text: book.kode_qr || book.id_buku,
      width: 160,
      height: 160,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  if (printContainer && window.QRCode) {
    printContainer.innerHTML = '';
    new window.QRCode(printContainer, {
      text: book.kode_qr || book.id_buku,
      width: 140,
      height: 140,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  showModal(modal, content);
}

/**
 * Setup modal konfirmasi hapus buku
 */
export function setupDeleteBookModal() {
  const modal = document.getElementById('modalDeleteBook');
  const content = document.getElementById('modalDeleteBookContent');
  const cancelBtn = document.getElementById('btnCancelDeleteBook');
  const confirmBtn = document.getElementById('btnConfirmDeleteBook');

  function closeDeleteModal() {
    hideModal(modal, content);
    state.deleteTargetBook = null;
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDeleteModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.deleteTargetBook) return;
      const bookId = state.deleteTargetBook.id_buku;

      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Menghapus...';

        const { error } = await db
          .from('data_buku')
          .delete()
          .eq('id_buku', bookId);

        if (error) throw error;

        showToast(`Buku ${bookId} berhasil dihapus dari sistem.`, 'success');
        closeDeleteModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus buku:', err);
        showToast('Gagal menghapus buku: ' + (err.message || 'Buku memiliki riwayat relasi peminjaman'), 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Ya, Hapus Buku';
      }
    });
  }
}

/**
 * Membuka modal konfirmasi hapus buku dengan proteksi status peminjaman aktif
 */
export function openDeleteBookModal(bookId) {
  const modal = document.getElementById('modalDeleteBook');
  const content = document.getElementById('modalDeleteBookContent');
  const book = state.cache.buku.find(b => b.id_buku === bookId);
  if (!book) return;

  const activeBorrow = state.cache.peminjaman.some(p => p.id_buku === bookId && p.status === 'Dipinjam');
  if (activeBorrow) {
    showToast('Buku sedang aktif dipinjam oleh siswa! Tidak dapat dihapus.', 'warning');
    return;
  }

  state.deleteTargetBook = book;
  const titleEl = document.getElementById('deleteBookTitle');
  if (titleEl) titleEl.textContent = `"${book.judul_buku}" (${book.id_buku})`;

  showModal(modal, content);
}
