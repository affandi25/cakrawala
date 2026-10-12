/**
 * CAKRAWALA Digital Library - Modul Meja Sirkulasi: Peminjaman Langsung (Walk-In Desk)
 * File: public/petugas/modules/2-sirkulasi/walkIn.js
 * 
 * FUNGSI:
 * - Sistem Keranjang Peminjaman Walk-In (Maksimal 2 Buku per Anggota)
 * - Input pencarian cepat ID Buku (BK-xxx) & scanner barcode langsung tanpa dropdown
 * - Null-Safety ketat pada seluruh interaksi elemen DOM
 * - Memeriksa kuota pinjam (maks. 2 buku aktif per siswa/guru)
 * - Mencegah peminjaman ganda buku yang sama
 * - Window bindings lengkap untuk integrasi global
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import {
  getTodayDateString,
  addDaysToDate,
  generateRandomId,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../core/petugasHelper.js';
import { clearSelectedMember } from './memberPicker.js';

// State internal keranjang peminjaman walk-in
let walkInCart = [];

/**
 * Mengambil isi keranjang walk-in saat ini
 */
export function getWalkInCart() {
  return [...walkInCart];
}

/**
 * Membersihkan seluruh isi keranjang walk-in
 */
export function clearWalkInCart() {
  walkInCart = [];
  renderWalkInCart();
  checkMejaBorrowEligibility();
}

/**
 * Menambahkan buku ke keranjang walk-in berdasarkan ID / Objek Buku
 * @param {Object|string} bookOrId - Objek buku atau ID buku (contoh: BK-001)
 */
export async function addBookToCart(bookOrId) {
  if (!bookOrId) return;

  let book = null;
  if (typeof bookOrId === 'object' && bookOrId.id_buku) {
    book = bookOrId;
  } else if (typeof bookOrId === 'string') {
    const query = bookOrId.trim().toUpperCase();
    if (!query) return;

    // 1. Cari di local state cache
    book = (state.cache.buku || []).find(b => 
      (b.id_buku && b.id_buku.toUpperCase() === query) ||
      (b.kode_qr && b.kode_qr.toUpperCase() === query) ||
      (b.id_buku && query.includes(b.id_buku.toUpperCase())) ||
      (b.kode_qr && query.includes(b.kode_qr.toUpperCase()))
    );

    // 2. Jika tidak ada di cache lokal, query langsung ke Supabase
    if (!book && db) {
      try {
        const { data, error } = await db
          .from('data_buku')
          .select('*')
          .or(`id_buku.ilike.${query},kode_qr.ilike.${query}`)
          .limit(1);

        if (!error && data && data.length > 0) {
          book = data[0];
          // Tambahkan ke cache buku jika belum ada
          if (state.cache.buku && !state.cache.buku.some(b => b.id_buku === book.id_buku)) {
            state.cache.buku.push(book);
          }
        }
      } catch (errDb) {
        console.warn('Gagal query buku langsung ke DB:', errDb);
      }
    }
  }

  if (!book) {
    showToast(`Buku dengan ID "${typeof bookOrId === 'string' ? bookOrId : 'tersebut'}" tidak ditemukan.`, 'error');
    return;
  }

  const stok = Number(book.stok) || 0;
  if (stok <= 0) {
    showToast(`Stok buku fisik "${book.judul_buku}" sedang habis!`, 'error');
    return;
  }

  // 1. Cek apakah buku sudah ada di dalam keranjang
  const isAlreadyInCart = walkInCart.some(item => item.id_buku === book.id_buku);
  if (isAlreadyInCart) {
    showToast(`Buku "${book.judul_buku}" sudah ada di dalam keranjang.`, 'warning');
    return;
  }

  // 2. Cek batas maksimal keranjang transaksi (maks 2 buku)
  if (walkInCart.length >= 2) {
    showToast('Batas keranjang terpenuhi: Maksimal 2 buku dalam satu transaksi peminjaman!', 'warning');
    return;
  }

  // 3. Cek batas kuota jika anggota sudah dipilih
  const memberId = state.selectedMember?.id || document.getElementById('inputSelectedMemberId')?.value;
  if (memberId) {
    const totalActive = (state.cache.peminjaman || []).filter(p => 
      p.nisn_siswa === memberId && 
      (p.status === 'Dipinjam' || p.status === 'Menunggu')
    ).length;

    if (totalActive + walkInCart.length >= 2) {
      const borrower = getBorrowerInfo(memberId);
      showToast(`Peringatan: ${borrower.nama} sudah memiliki ${totalActive} pinjaman aktif. Kuota maksimal adalah 2 buku!`, 'warning');
      return;
    }

    // Cek apakah anggota sedang meminjam atau booking buku ini
    const activeBorrow = (state.cache.peminjaman || []).find(p => 
      p.nisn_siswa === memberId && 
      p.id_buku === book.id_buku && 
      (p.status === 'Dipinjam' || p.status === 'Menunggu')
    );
    if (activeBorrow) {
      const borrower = getBorrowerInfo(memberId);
      if (activeBorrow.status === 'Dipinjam') {
        showToast(`${borrower.nama} masih meminjam buku "${book.judul_buku}" (${activeBorrow.id_peminjaman}) dan belum mengembalikannya!`, 'warning');
      } else {
        showToast(`${borrower.nama} sudah memesan buku ini secara online (Tiket: ${activeBorrow.id_peminjaman})!`, 'warning');
      }
      return;
    }
  }

  // Masukkan ke keranjang
  walkInCart.push(book);
  renderWalkInCart();
  checkMejaBorrowEligibility();

  // Bersihkan input teks pencarian agar siap di-scan/diketik ulang
  const barcodeInput = document.getElementById('inputWalkInBookId') || document.getElementById('inputMejaBarcode');
  if (barcodeInput) {
    barcodeInput.value = '';
    barcodeInput.focus();
  }

  showToast(`Buku "${book.judul_buku}" (${book.id_buku}) ditambahkan ke keranjang!`, 'success');
}

/**
 * Alias untuk addBookToCart
 */
export const addBookToWalkInCart = addBookToCart;

/**
 * Handler penambahan buku manual dari input teks
 */
export function addWalkInBookManual() {
  const barcodeInput = document.getElementById('inputWalkInBookId') || document.getElementById('inputMejaBarcode');
  if (!barcodeInput) return;
  const val = barcodeInput.value.trim();
  if (!val) {
    showToast('Ketik atau scan ID Buku terlebih dahulu (contoh: BK-001).', 'warning');
    barcodeInput.focus();
    return;
  }
  addBookToCart(val);
}

/**
 * Handler hasil scan barcode kamera untuk Walk-In
 */
export function handleWalkInScan(code) {
  if (code) {
    addBookToCart(code);
  }
}

/**
 * Menghapus buku dari keranjang walk-in
 * @param {string} bookId 
 */
export function removeBookFromCart(bookId) {
  walkInCart = walkInCart.filter(b => b.id_buku !== bookId);
  renderWalkInCart();
  checkMejaBorrowEligibility();
  showToast('Buku dihapus dari keranjang peminjaman.', 'info');
}

/**
 * Alias untuk removeBookFromCart
 */
export const removeWalkInCartItem = removeBookFromCart;

/**
 * Render visual daftar item keranjang walk-in secara aman
 */
export function renderWalkInCart() {
  const container = document.getElementById('walkInCartContainer');
  const countBadge = document.getElementById('cartCountBadge');
  if (!container) return;

  const count = walkInCart.length;
  if (countBadge) {
    countBadge.textContent = `${count} / 2 Buku`;
    if (count === 2) {
      countBadge.className = 'font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300';
    } else if (count === 1) {
      countBadge.className = 'font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-navy border border-blue-200';
    } else {
      countBadge.className = 'font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700';
    }
  }

  if (count === 0) {
    container.innerHTML = `
      <div id="cartEmptyState" class="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
        <i class="ph ph-books text-2xl text-slate-300 mb-1 mx-auto block"></i>
        <span>Keranjang masih kosong. Scan stiker barcode buku atau ketik ID (contoh: <strong>BK-001</strong>) lalu klik Tambah.</span>
      </div>
    `;
    return;
  }

  let html = '';
  walkInCart.forEach((book, index) => {
    const stok = Number(book.stok) || 0;
    html += `
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-navy/30 transition animate-modal">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-14 w-10 shrink-0 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400">
            ${book.cover_url 
              ? `<img src="${book.cover_url}" class="h-full w-full object-cover" alt="Cover" />`
              : `<i class="ph ph-book text-xl text-navy"></i>`
            }
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] font-extrabold text-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${book.id_buku}</span>
              <span class="text-[10px] text-slate-400 font-semibold">Buku #${index + 1}</span>
            </div>
            <h5 class="text-xs font-extrabold text-slate-900 mt-0.5 truncate">${book.judul_buku}</h5>
            <p class="text-[11px] text-slate-500 truncate">
              ${book.penulis || '-'} &bull; <strong class="text-navy">${book.keterangan || 'Rak Umum'}</strong> &bull; Sisa Stok: <span class="text-emerald-700 font-bold">${stok}</span>
            </p>
          </div>
        </div>
        <button type="button" onclick="window.removeWalkInCartItem('${book.id_buku}')"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
          title="Hapus buku ini dari keranjang">
          <i class="ph ph-trash text-base"></i>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Kompatibilitas fungsi setMejaSelectedBuku lama
 */
export function setMejaSelectedBuku(book) {
  if (book) {
    addBookToCart(book);
  }
}

/**
 * Membersihkan kotak preview buku (kompatibilitas)
 */
export function clearMejaBukuPreview() {
  clearWalkInCart();
}

/**
 * Memvalidasi apakah siswa/guru yang dipilih di meja Walk-In berhak menerbitkan peminjaman
 */
export function checkMejaBorrowEligibility() {
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');
  const memberId = state.selectedMember?.id || document.getElementById('inputSelectedMemberId')?.value;

  if (!submitBtn) return;

  // Harus ada anggota dan minimal 1 buku di keranjang
  if (!memberId || walkInCart.length === 0) {
    submitBtn.disabled = true;
    return;
  }

  // Cek batas kuota maksimal peminjaman (maks. 2 buku aktif per anggota)
  const totalActive = (state.cache.peminjaman || []).filter(p => 
    p.nisn_siswa === memberId && 
    (p.status === 'Dipinjam' || p.status === 'Menunggu')
  ).length;

  if (totalActive + walkInCart.length > 2) {
    submitBtn.disabled = true;
    const borrower = getBorrowerInfo(memberId);
    showToast(`Batas kuota tercapai: ${borrower.nama} memiliki ${totalActive} pinjaman aktif + ${walkInCart.length} di keranjang (Maks. 2 buku)!`, 'warning');
    return;
  }

  submitBtn.disabled = false;
}

/**
 * Menyiapkan form walk-in meja sirkulasi dengan pemeriksaan null-safety
 * @param {Function} onSwitchSubtab Callback untuk berpindah subtab
 * @param {Function} onOpenVerifyModal Callback untuk membuka verifikasi tiket prapinjam
 */
export function setupWalkInForm(onSwitchSubtab, onOpenVerifyModal) {
  const barcodeInput = document.getElementById('inputWalkInBookId') || document.getElementById('inputMejaBarcode');
  const addBtn = document.getElementById('btnWalkInAddBook') || document.getElementById('btnAddBookToCart');
  const formWalkIn = document.getElementById('formMejaWalkIn');
  const resetBtn = document.getElementById('btnResetMejaForm');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');

  const today = getTodayDateString();
  const tglPinjamInput = document.getElementById('inputMejaTglPinjam');
  const batasKembaliInput = document.getElementById('inputMejaBatasKembali');
  if (tglPinjamInput && !tglPinjamInput.value) tglPinjamInput.value = today;
  if (batasKembaliInput && !batasKembaliInput.value) batasKembaliInput.value = addDaysToDate(today, 7);

  // Fungsi memproses input teks barcode / ID buku
  function handleAddInputBook() {
    if (!barcodeInput) return;
    const val = barcodeInput.value.trim().toUpperCase();
    if (!val) {
      showToast('Masukkan ID Buku terlebih dahulu (contoh: BK-001).', 'warning');
      barcodeInput.focus();
      return;
    }

    // Cek apakah ini tiket booking daring
    const pendingBooking = (state.cache.peminjaman || []).find(p => 
      p.status === 'Menunggu' && p.id_peminjaman && p.id_peminjaman.toUpperCase() === val
    );
    if (pendingBooking) {
      if (typeof onSwitchSubtab === 'function') onSwitchSubtab('prapinjam');
      showToast(`Tiket Booking ${pendingBooking.id_peminjaman} terdeteksi! Membuka verifikasi serah-terima.`, 'success');
      if (typeof onOpenVerifyModal === 'function') onOpenVerifyModal(pendingBooking, true);
      barcodeInput.value = '';
      return;
    }

    // Tambahkan buku fisik ke keranjang walk-in
    addBookToCart(val);
  }

  // 1. Tombol Tambah di-klik
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleAddInputBook();
    });
  }

  // 2. Tombol Enter ditekan pada input teks ID buku
  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddInputBook();
      }
    });
  }

  // 3. Tombol Reset Form
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearWalkInCart();
      clearSelectedMember();
      if (tglPinjamInput) tglPinjamInput.value = today;
      if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);
    });
  }

  // 4. Submit Formulir Walk-In
  if (formWalkIn) {
    formWalkIn.addEventListener('submit', async e => {
      e.preventDefault();
      const memberId = state.selectedMember?.id || document.getElementById('inputSelectedMemberId')?.value;
      const tglPinjam = tglPinjamInput ? tglPinjamInput.value : today;
      const batasKembali = batasKembaliInput ? batasKembaliInput.value : addDaysToDate(today, 7);

      if (!memberId) {
        showToast('Pilih identitas siswa/guru peminjam terlebih dahulu.', 'warning');
        const searchInput = document.getElementById('inputCariPeminjam');
        if (searchInput) searchInput.focus();
        return;
      }

      if (walkInCart.length === 0) {
        showToast('Keranjang masih kosong. Tambahkan minimal 1 buku fisik (maksimal 2).', 'warning');
        if (barcodeInput) barcodeInput.focus();
        return;
      }

      // Validasi Kuota Total
      const totalActive = (state.cache.peminjaman || []).filter(p => 
        p.nisn_siswa === memberId && 
        (p.status === 'Dipinjam' || p.status === 'Menunggu')
      ).length;

      if (totalActive + walkInCart.length > 2) {
        const borrower = getBorrowerInfo(memberId);
        showToast(`Batas tercapai: ${borrower.nama} sudah memiliki ${totalActive}/2 buku aktif! Tidak dapat meminjam ${walkInCart.length} buku lagi.`, 'warning');
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> <span>Menerbitkan Peminjaman...</span>';
        }

        const borrower = getBorrowerInfo(memberId);
        const issuedIds = [];

        // Terbitkan peminjaman untuk setiap buku di keranjang
        for (const book of walkInCart) {
          const newIdPeminjaman = generateRandomId('PJ', 6);
          issuedIds.push(newIdPeminjaman);

          // 1. Insert ke data_peminjaman
          const { error: errLoan } = await db
            .from('data_peminjaman')
            .insert({
              id_peminjaman: newIdPeminjaman,
              nisn_siswa: memberId,
              id_buku: book.id_buku,
              tanggal_pinjam: tglPinjam,
              batas_kembali: batasKembali,
              metode_peminjaman: 'Scan QR',
              status: 'Dipinjam'
            });
          if (errLoan) throw errLoan;

          // 2. Kurangi stok buku fisik
          const stokBaru = Math.max(0, (Number(book.stok) || 1) - 1);
          const statusBaru = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

          const { error: errBook } = await db
            .from('data_buku')
            .update({ stok: stokBaru, status: statusBaru })
            .eq('id_buku', book.id_buku);
          if (errBook) throw errBook;
        }

        showToast(`Sukses! ${walkInCart.length} buku berhasil diterbitkan (${issuedIds.join(', ')}) untuk ${borrower.nama}.`, 'success');

        // Reset keranjang & form
        formWalkIn.reset();
        clearWalkInCart();
        clearSelectedMember();
        if (tglPinjamInput) tglPinjamInput.value = today;
        if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);

        // Sinkronisasi data
        if (window.fetchAllData) await window.fetchAllData();
        if (typeof onSwitchSubtab === 'function') onSwitchSubtab('dipinjam');
      } catch (err) {
        console.error('Gagal menerbitkan peminjaman meja walk-in:', err);
        showToast('Gagal menerbitkan peminjaman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ph ph-check-circle text-lg"></i> <span>Terbitkan Peminjaman Langsung</span>';
        }
      }
    });
  }
}

/**
 * Modal Walk-In Direct Peminjaman (Legacy fallback modal) dengan null checks
 */
export function setupWalkInModal() {
  const modal = document.getElementById('modalWalkIn');
  const content = document.getElementById('modalWalkInContent');
  const closeBtn = document.getElementById('btnCloseWalkInModal');
  const cancelBtn = document.getElementById('btnCancelWalkInModal');
  const form = document.getElementById('formWalkIn');

  if (!modal) return;

  function closeWalkInModal() {
    hideModal(modal, content);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeWalkInModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeWalkInModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeWalkInModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nisn = document.getElementById('selectWalkInSiswa')?.value;
      const idBuku = document.getElementById('selectWalkInBuku')?.value;
      const tglPinjam = document.getElementById('inputWalkInTanggalPinjam')?.value;
      const batasKembali = document.getElementById('inputWalkInBatasKembali')?.value;
      const metodeRadio = form.querySelector('input[name="walkInMetode"]:checked');
      const metode = metodeRadio ? metodeRadio.value : 'Scan QR';

      if (!nisn || !idBuku || !tglPinjam || !batasKembali) {
        showToast('Harap lengkapi semua isian formulir peminjaman.', 'warning');
        return;
      }

      const book = (state.cache.buku || []).find(b => b.id_buku === idBuku);
      if (!book || (Number(book.stok) || 0) <= 0) {
        showToast('Buku yang dipilih tidak memiliki stok fisik tersedia.', 'error');
        return;
      }

      // Validasi Kuota
      const totalActive = (state.cache.peminjaman || []).filter(p => 
        p.nisn_siswa === nisn && 
        (p.status === 'Dipinjam' || p.status === 'Menunggu')
      ).length;
      if (totalActive >= 2) {
        showToast(`Batas tercapai: Peminjam sudah memiliki ${totalActive}/2 buku aktif!`, 'warning');
        return;
      }

      const activeBorrow = (state.cache.peminjaman || []).find(p => 
        p.nisn_siswa === nisn && 
        p.id_buku === idBuku && 
        (p.status === 'Dipinjam' || p.status === 'Menunggu')
      );
      if (activeBorrow) {
        showToast(`Peminjam masih memiliki peminjaman aktif (${activeBorrow.id_peminjaman}) untuk buku ini!`, 'warning');
        return;
      }

      try {
        const submitBtn = document.getElementById('btnSubmitWalkIn');
        if (submitBtn) submitBtn.disabled = true;

        const newIdPeminjaman = generateRandomId('PJ', 6);

        const { error: errLoan } = await db
          .from('data_peminjaman')
          .insert({
            id_peminjaman: newIdPeminjaman,
            nisn_siswa: nisn,
            id_buku: idBuku,
            tanggal_pinjam: tglPinjam,
            batas_kembali: batasKembali,
            metode_peminjaman: metode,
            status: 'Dipinjam'
          });
        if (errLoan) throw errLoan;

        const stokBaru = Math.max(0, (Number(book.stok) || 1) - 1);
        const statusBaru = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

        const { error: errBook } = await db
          .from('data_buku')
          .update({ stok: stokBaru, status: statusBaru })
          .eq('id_buku', idBuku);
        if (errBook) throw errBook;

        showToast(`Peminjaman walk-in berhasil diterbitkan (${newIdPeminjaman})!`, 'success');
        closeWalkInModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menerbitkan peminjaman langsung:', err);
        showToast('Gagal menerbitkan peminjaman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        const submitBtn = document.getElementById('btnSubmitWalkIn');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

/**
 * Membuka modal peminjaman langsung (legacy fallback)
 */
export function openWalkInModal() {
  const modal = document.getElementById('modalWalkIn');
  const content = document.getElementById('modalWalkInContent');
  if (!modal) return;

  const selectSiswa = document.getElementById('selectWalkInSiswa');
  if (selectSiswa) {
    let optionsHtml = '<option value="">-- Pilih Siswa atau Guru --</option>';
    (state.cache.siswa || []).forEach(s => {
      optionsHtml += `<option value="${s.nisn_siswa}">[Siswa] ${s.nama_siswa} (${s.nisn_siswa} &bull; ${s.kelas})</option>`;
    });
    (state.cache.guru || []).forEach(g => {
      optionsHtml += `<option value="${g.nip_guru}">[Guru] ${g.nama_guru} (${g.nip_guru} &bull; ${g.mata_pelajaran || 'Pengajar'})</option>`;
    });
    selectSiswa.innerHTML = optionsHtml;
  }

  const selectBuku = document.getElementById('selectWalkInBuku');
  if (selectBuku) {
    let optionsHtml = '<option value="">-- Pilih Buku Tersedia --</option>';
    const availableBooks = (state.cache.buku || []).filter(b => (Number(b.stok) || 0) > 0);
    availableBooks.forEach(b => {
      optionsHtml += `<option value="${b.id_buku}">${b.judul_buku} (Stok: ${b.stok} | Rak: ${b.keterangan || '-'})</option>`;
    });
    selectBuku.innerHTML = optionsHtml;
  }

  const today = getTodayDateString();
  const inputTglPinjam = document.getElementById('inputWalkInTanggalPinjam');
  const inputBatasKembali = document.getElementById('inputWalkInBatasKembali');
  if (inputTglPinjam) inputTglPinjam.value = today;
  if (inputBatasKembali) inputBatasKembali.value = addDaysToDate(today, 7);

  showModal(modal, content);
}

// Window bindings lengkap untuk fungsi keranjang walk-in
if (typeof window !== 'undefined') {
  window.addBookToCart = addBookToCart;
  window.addBookToWalkInCart = addBookToCart;
  window.addWalkInBookManual = addWalkInBookManual;
  window.handleWalkInScan = handleWalkInScan;
  window.removeBookFromCart = removeBookFromCart;
  window.removeWalkInCartItem = removeBookFromCart;
  window.clearWalkInCart = clearWalkInCart;
  window.setMejaSelectedBuku = setMejaSelectedBuku;
  window.renderWalkInCart = renderWalkInCart;
  window.getWalkInCart = getWalkInCart;
}
