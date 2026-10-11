/**
 * CAKRAWALA Digital Library - Modul Meja Sirkulasi: Peminjaman Langsung (Walk-In Desk)
 * File: public/petugas/modules/sirkulasi/walkIn.js
 * 
 * FUNGSI:
 * - Menampilkan pratinjau buku fisik yang dipilih / discan
 * - Memeriksa kuota pinjam (maks. 2 buku aktif per siswa/guru)
 * - Mencegah peminjaman ganda buku yang sama
 * - Menangani formulir walk-in dan legacy walk-in modal
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import {
  getTodayDateString,
  addDaysToDate,
  generateRandomId,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../petugasHelper.js';
import { clearSelectedMember } from './memberPicker.js';

/**
 * Menampilkan pratinjau buku yang dipilih ke dalam kartu hijau di Meja Walk-In
 */
export function setMejaSelectedBuku(book) {
  if (!book) return;
  state.selectedMejaBuku = book;

  const barcodeInput = document.getElementById('inputMejaBarcode');
  const selectBuku = document.getElementById('selectMejaBuku');

  if (barcodeInput && barcodeInput.value !== book.id_buku) {
    barcodeInput.value = book.id_buku;
  }
  if (selectBuku && selectBuku.value !== book.id_buku) {
    selectBuku.value = book.id_buku;
  }

  const previewBox = document.getElementById('previewBukuMejaBox');
  const badgeId = document.getElementById('badgeMejaIdBuku');
  const textJudul = document.getElementById('textMejaJudulBuku');
  const textPenulisRak = document.getElementById('textMejaPenulisRak');
  const textStok = document.getElementById('textMejaStokBuku');
  const imgCover = document.getElementById('imgMejaCover');
  const iconDefault = document.getElementById('iconMejaCoverDefault');

  if (badgeId) badgeId.textContent = book.id_buku;
  if (textJudul) textJudul.textContent = book.judul_buku;
  if (textPenulisRak) textPenulisRak.innerHTML = `${book.penulis || '-'} &bull; <strong class="text-navy">${book.keterangan || 'Rak Umum'}</strong>`;

  const stok = Number(book.stok) || 0;
  if (textStok) {
    textStok.textContent = `${stok} Eksemplar`;
    textStok.className = stok > 0 ? 'text-base font-extrabold text-emerald-700' : 'text-base font-extrabold text-rose-600';
  }

  if (imgCover && iconDefault) {
    if (book.cover_url) {
      imgCover.src = book.cover_url;
      imgCover.classList.remove('hidden');
      iconDefault.classList.add('hidden');
    } else {
      imgCover.classList.add('hidden');
      iconDefault.classList.remove('hidden');
    }
  }

  if (previewBox) {
    previewBox.classList.remove('hidden');
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  checkMejaBorrowEligibility();
}

/**
 * Memvalidasi apakah siswa/guru yang dipilih di meja Walk-In berhak meminjam buku terpilih
 */
export function checkMejaBorrowEligibility() {
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const book = state.selectedMejaBuku;
  const memberId = state.selectedMember?.id || selectSiswa?.value;

  if (!submitBtn) return;

  if (!book || !memberId) {
    submitBtn.disabled = true;
    return;
  }

  const stok = Number(book.stok) || 0;
  if (stok <= 0) {
    submitBtn.disabled = true;
    showToast('Stok buku fisik ini habis.', 'error');
    return;
  }

  // Cek batas kuota maksimal peminjaman (maks. 2 buku aktif per anggota)
  const totalActive = (state.cache.peminjaman || []).filter(p => 
    p.nisn_siswa === memberId && 
    (p.status === 'Dipinjam' || p.status === 'Menunggu')
  ).length;

  if (totalActive >= 2) {
    submitBtn.disabled = true;
    const borrower = getBorrowerInfo(memberId);
    showToast(`Peringatan: ${borrower.nama} sudah mencapai batas kuota maksimal (${totalActive}/2 buku aktif)!`, 'warning');
    return;
  }

  // Cek apakah peminjam masih memegang buku ini atau sedang dalam antrean prapinjam
  const activeBorrow = (state.cache.peminjaman || []).find(p => 
    p.nisn_siswa === memberId && 
    p.id_buku === book.id_buku && 
    (p.status === 'Dipinjam' || p.status === 'Menunggu')
  );

  if (activeBorrow) {
    submitBtn.disabled = true;
    const borrower = getBorrowerInfo(memberId);
    if (activeBorrow.status === 'Dipinjam') {
      showToast(`Peringatan: ${borrower.nama} masih tercatat meminjam buku "${book.judul_buku}" (${activeBorrow.id_peminjaman}) dan belum mengembalikannya!`, 'warning');
    } else {
      showToast(`Peringatan: ${borrower.nama} sudah memiliki tiket booking [${activeBorrow.id_peminjaman}] untuk buku ini yang belum diambil di perpustakaan!`, 'warning');
    }
    return;
  }

  submitBtn.disabled = false;
}

/**
 * Membersihkan kotak pratinjau buku di formulir walk-in
 */
export function clearMejaBukuPreview() {
  state.selectedMejaBuku = null;
  const previewBox = document.getElementById('previewBukuMejaBox');
  if (previewBox) previewBox.classList.add('hidden');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');
  if (submitBtn) submitBtn.disabled = true;
}

/**
 * Menyiapkan form walk-in meja sirkulasi
 * @param {Function} onSwitchSubtab Callback untuk berpindah subtab
 * @param {Function} onOpenVerifyModal Callback untuk membuka verifikasi tiket prapinjam
 */
export function setupWalkInForm(onSwitchSubtab, onOpenVerifyModal) {
  const barcodeInput = document.getElementById('inputMejaBarcode');
  const selectBuku = document.getElementById('selectMejaBuku');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const formWalkIn = document.getElementById('formMejaWalkIn');
  const resetBtn = document.getElementById('btnResetMejaForm');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');

  const today = getTodayDateString();
  const tglPinjamInput = document.getElementById('inputMejaTglPinjam');
  const batasKembaliInput = document.getElementById('inputMejaBatasKembali');
  if (tglPinjamInput) tglPinjamInput.value = today;
  if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);

  if (barcodeInput) {
    barcodeInput.addEventListener('input', () => {
      const val = barcodeInput.value.trim().toUpperCase();
      if (!val) {
        clearMejaBukuPreview();
        return;
      }

      // Cek tiket booking daring
      const pendingBooking = state.cache.peminjaman.find(p => 
        p.status === 'Menunggu' && p.id_peminjaman && p.id_peminjaman.toUpperCase() === val
      );
      if (pendingBooking) {
        if (typeof onSwitchSubtab === 'function') onSwitchSubtab('prapinjam');
        showToast(`Tiket Booking ${pendingBooking.id_peminjaman} terdeteksi! Membuka verifikasi serah-terima.`, 'success');
        if (typeof onOpenVerifyModal === 'function') onOpenVerifyModal(pendingBooking, true);
        barcodeInput.value = '';
        return;
      }

      // Cek stiker barcode buku fisik
      const book = state.cache.buku.find(b => 
        (b.id_buku && b.id_buku.toUpperCase() === val) || 
        (b.kode_qr && b.kode_qr.toUpperCase() === val)
      );

      if (book) {
        setMejaSelectedBuku(book);
        if (selectBuku) selectBuku.value = book.id_buku;
      } else {
        clearMejaBukuPreview();
      }
    });
  }

  if (selectBuku) {
    selectBuku.addEventListener('change', () => {
      const idBuku = selectBuku.value;
      const book = state.cache.buku.find(b => b.id_buku === idBuku);
      if (book) {
        setMejaSelectedBuku(book);
        if (barcodeInput) barcodeInput.value = book.id_buku;
      } else {
        clearMejaBukuPreview();
        if (barcodeInput) barcodeInput.value = '';
      }
    });
  }

  if (selectSiswa) {
    selectSiswa.addEventListener('change', () => {
      if (submitBtn) {
        const hasMember = state.selectedMember || (selectSiswa && selectSiswa.value);
        submitBtn.disabled = !(hasMember && state.selectedMejaBuku && (Number(state.selectedMejaBuku.stok) || 0) > 0);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearMejaBukuPreview();
      clearSelectedMember();
      if (tglPinjamInput) tglPinjamInput.value = today;
      if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);
    });
  }

  if (formWalkIn) {
    formWalkIn.addEventListener('submit', async e => {
      e.preventDefault();
      const memberId = document.getElementById('inputSelectedMemberId')?.value || (selectSiswa ? selectSiswa.value : '');
      const book = state.selectedMejaBuku;
      const tglPinjam = tglPinjamInput ? tglPinjamInput.value : today;
      const batasKembali = batasKembaliInput ? batasKembaliInput.value : addDaysToDate(today, 7);

      if (!memberId) {
        showToast('Pilih identitas siswa/guru peminjam terlebih dahulu.', 'warning');
        const searchInput = document.getElementById('inputCariPeminjam');
        if (searchInput) searchInput.focus();
        return;
      }

      if (!book || (Number(book.stok) || 0) <= 0) {
        showToast('Pilih atau scan buku fisik yang memiliki stok tersedia.', 'warning');
        return;
      }

      // Validasi Kuota: Cek batas maksimal 2 buku aktif per anggota
      const totalActive = (state.cache.peminjaman || []).filter(p => 
        p.nisn_siswa === memberId && 
        (p.status === 'Dipinjam' || p.status === 'Menunggu')
      ).length;
      if (totalActive >= 2) {
        const borrower = getBorrowerInfo(memberId);
        showToast(`Batas tercapai: ${borrower.nama} sudah memiliki ${totalActive}/2 buku aktif! Harap kembalikan buku terlebih dahulu.`, 'warning');
        return;
      }

      // Validasi: Cek apakah peminjam masih memiliki peminjaman aktif atau antrean booking untuk buku ini
      const activeBorrow = (state.cache.peminjaman || []).find(p => 
        p.nisn_siswa === memberId && 
        p.id_buku === book.id_buku && 
        (p.status === 'Dipinjam' || p.status === 'Menunggu')
      );
      if (activeBorrow) {
        const borrower = getBorrowerInfo(memberId);
        if (activeBorrow.status === 'Dipinjam') {
          showToast(`${borrower.nama} masih tercatat sedang meminjam buku "${book.judul_buku}" (${activeBorrow.id_peminjaman}) dan belum mengembalikannya!`, 'warning');
        } else {
          showToast(`${borrower.nama} sudah memiliki tiket booking [${activeBorrow.id_peminjaman}] untuk buku ini. Silakan proses via antrean Pra-Pinjam.`, 'warning');
        }
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> <span>Menerbitkan Peminjaman...</span>';
        }

        const newIdPeminjaman = generateRandomId('PJ', 6);

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

        const stokBaru = Math.max(0, (Number(book.stok) || 1) - 1);
        const statusBaru = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

        const { error: errBook } = await db
          .from('data_buku')
          .update({ stok: stokBaru, status: statusBaru })
          .eq('id_buku', book.id_buku);
        if (errBook) throw errBook;

        const borrower = getBorrowerInfo(memberId);
        showToast(`Peminjaman langsung berhasil diterbitkan (${newIdPeminjaman}) untuk ${borrower.nama}! Buku telah aktif dipinjam.`, 'success');

        formWalkIn.reset();
        clearMejaBukuPreview();
        clearSelectedMember();
        if (tglPinjamInput) tglPinjamInput.value = today;
        if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);

        if (window.fetchAllData) await window.fetchAllData();
        if (typeof onSwitchSubtab === 'function') onSwitchSubtab('dipinjam');
      } catch (err) {
        console.error('Gagal menerbitkan peminjaman meja:', err);
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
 * Modal Walk-In Direct Peminjaman (Legacy fallback modal)
 */
export function setupWalkInModal() {
  const modal = document.getElementById('modalWalkIn');
  const content = document.getElementById('modalWalkInContent');
  const closeBtn = document.getElementById('btnCloseWalkInModal');
  const cancelBtn = document.getElementById('btnCancelWalkInModal');
  const form = document.getElementById('formWalkIn');

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
      const nisn = document.getElementById('selectWalkInSiswa').value;
      const idBuku = document.getElementById('selectWalkInBuku').value;
      const tglPinjam = document.getElementById('inputWalkInTanggalPinjam').value;
      const batasKembali = document.getElementById('inputWalkInBatasKembali').value;
      const metodeRadio = form.querySelector('input[name="walkInMetode"]:checked');
      const metode = metodeRadio ? metodeRadio.value : 'Scan QR';

      if (!nisn || !idBuku || !tglPinjam || !batasKembali) {
        showToast('Harap lengkapi semua isian formulir peminjaman.', 'warning');
        return;
      }

      const book = state.cache.buku.find(b => b.id_buku === idBuku);
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
    const availableBooks = state.cache.buku.filter(b => (Number(b.stok) || 0) > 0);
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
