/**
 * CAKRAWALA Digital Library - Modul Form Booking Pra-Pinjam
 * File: public/siswa-guru/modules/prapinjam/modalBooking.js
 * 
 * Tanggung Jawab:
 * - Menangani formulir pengajuan reservasi pra-pinjam daring (#modalBooking)
 * - Menerapkan aturan kuota maksimal 2 buku aktif per siswa/guru
 * - Mencegah peminjaman ganda untuk buku yang sama
 * - Menyimpan transaksi 'Menunggu' ke database Supabase & mengunci stok fisik
 * - Memanggil modal tiket bukti reservasi QR Code
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import {
  formatTanggalIndo,
  getTodayDateString,
  addDaysToDate,
  generateRandomId,
  showModal,
  hideModal,
  showToast
} from '../siswaHelper.js';
import { showTicketSuccessModal } from './modalTiket.js';

export const MAX_ACTIVE_LOANS = 2;

/**
 * Menghitung total peminjaman aktif pengguna saat ini (buku yang sedang dipinjam + antrean booking)
 * @returns {number}
 */
export function getUserActiveLoansCount() {
  if (!state.memberId) return 0;
  return (state.cache.peminjaman || []).filter(p => 
    p.nisn_siswa === state.memberId &&
    (p.status === 'Menunggu' || p.status === 'Dipinjam')
  ).length;
}

/**
 * Memeriksa apakah peminjam (siswa/guru) saat ini sedang memiliki transaksi aktif
 * (antrean booking 'Menunggu' atau sedang dipinjam 'Dipinjam') untuk buku tertentu
 * @param {string} bookId 
 * @returns {object|null}
 */
export function getActiveUserLoanForBook(bookId) {
  if (!state.memberId) return null;
  return (state.cache.peminjaman || []).find(p => 
    p.nisn_siswa === state.memberId &&
    p.id_buku === bookId &&
    (p.status === 'Menunggu' || p.status === 'Dipinjam')
  );
}

let isBookingModalSetup = false;

/**
 * Setup formulir modal pra-pinjam (input tanggal, tombol submit, dan modal tiket)
 */
export function setupBookingModal() {
  if (isBookingModalSetup) return;
  isBookingModalSetup = true;

  const modal = document.getElementById('modalBooking');
  const content = document.getElementById('modalBookingContent');
  const closeBtn = document.getElementById('btnCloseBookingModal');
  const cancelBtn = document.getElementById('btnCancelBookingModal');
  const form = document.getElementById('formBooking');
  const tglPinjamInput = document.getElementById('inputBookingTglPinjam');
  const batasKembaliInput = document.getElementById('inputBookingBatasKembali');

  function closeBookingModal() {
    hideModal(modal, content);
    state.selectedBukuForBooking = null;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeBookingModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBookingModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeBookingModal();
    });
  }

  if (tglPinjamInput && batasKembaliInput) {
    tglPinjamInput.addEventListener('change', () => {
      const selected = tglPinjamInput.value;
      if (selected) {
        batasKembaliInput.value = addDaysToDate(selected, 7);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      if (!state.selectedBukuForBooking) {
        showToast('Buku belum dipilih.', 'warning');
        return;
      }

      const book = state.selectedBukuForBooking;
      const tglPinjam = document.getElementById('inputBookingTglPinjam').value;
      const batasKembali = document.getElementById('inputBookingBatasKembali').value;
      const submitBtn = document.getElementById('btnSubmitBooking');

      if ((Number(book.stok) || 0) <= 0) {
        showToast('Maaf, stok buku ini sedang habis dipinjam.', 'error');
        return;
      }

      // Validasi Kuota: Cek batas maksimal 2 buku aktif
      const activeCount = getUserActiveLoansCount();
      if (activeCount >= MAX_ACTIVE_LOANS) {
        showToast(`Batas peminjaman tercapai! Anda sudah memiliki ${activeCount} buku aktif (maksimal ${MAX_ACTIVE_LOANS} buku). Harap kembalikan buku terlebih dahulu.`, 'warning');
        return;
      }

      // Validasi: Cek apakah peminjam masih memiliki transaksi aktif untuk buku ini
      const activeLoan = getActiveUserLoanForBook(book.id_buku);
      if (activeLoan) {
        if (activeLoan.status === 'Menunggu') {
          showToast(`Anda sudah memiliki tiket booking [${activeLoan.id_peminjaman}] untuk buku ini yang belum diambil di perpustakaan.`, 'warning');
        } else {
          showToast(`Anda sedang meminjam buku "${book.judul_buku}" dan belum mengembalikannya. Kembalikan buku terlebih dahulu sebelum meminjam lagi.`, 'warning');
        }
        return;
      }

      // Validasi langsung ke Supabase untuk keamanan integritas data
      const { data: userActiveLoans, error: errQuota } = await db
        .from('data_peminjaman')
        .select('id_peminjaman, id_buku, status')
        .eq('nisn_siswa', state.memberId)
        .in('status', ['Menunggu', 'Dipinjam']);

      if (!errQuota && userActiveLoans) {
        if (userActiveLoans.length >= MAX_ACTIVE_LOANS) {
          showToast(`Batas peminjaman tercapai! Anda sudah memiliki ${userActiveLoans.length} buku aktif di sistem (maksimal ${MAX_ACTIVE_LOANS} buku).`, 'warning');
          return;
        }
        const hasSameBook = userActiveLoans.some(l => l.id_buku === book.id_buku);
        if (hasSameBook) {
          showToast(`Buku ini masih tercatat aktif di akun Anda dan belum dikembalikan.`, 'warning');
          return;
        }
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-base"></i> <span>Mengajukan Booking...</span>';
        }

        const newIdPeminjaman = generateRandomId('PJ', 6);

        // 1. Simpan ke database data_peminjaman dengan status 'Menunggu' & 'Belum Diambil'
        const { error: errLoan } = await db
          .from('data_peminjaman')
          .insert({
            id_peminjaman: newIdPeminjaman,
            nisn_siswa: state.memberId,
            id_buku: book.id_buku,
            tanggal_pinjam: tglPinjam,
            batas_kembali: batasKembali,
            metode_peminjaman: 'Pra Pinjam',
            status: 'Menunggu',
            status_persiapan: 'Belum Diambil'
          });

        if (errLoan) throw errLoan;

        // 2. Kunci / Kurangi stok buku fisik secara instan agar tidak diambil peminjam lain
        const sisaStok = Math.max(0, (Number(book.stok) || 1) - 1);
        const statusBaruBuku = sisaStok === 0 ? 'Dipinjam' : 'Tersedia';

        const { error: errStock } = await db
          .from('data_buku')
          .update({
            stok: sisaStok,
            status: statusBaruBuku
          })
          .eq('id_buku', book.id_buku);

        if (errStock) {
          console.warn('Peringatan: Gagal memotong stok buku otomatis:', errStock);
        }

        closeBookingModal();
        showToast('Pengajuan pra-pinjam berhasil! Stok buku telah diamankan untuk Anda.', 'success');

        // Tampilkan modal tiket bukti booking dengan barcode & QR
        showTicketSuccessModal({
          id: newIdPeminjaman,
          buku: book.judul_buku,
          rak: book.keterangan || 'Rak Umum',
          tempo: formatTanggalIndo(batasKembali),
          peminjam: state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId,
          nisn: state.memberId,
          statusPersiapan: 'Belum Diambil'
        });

        // Sinkronkan data terbaru
        if (window.fetchAllMemberData) {
          await window.fetchAllMemberData();
        }
      } catch (err) {
        console.error('Gagal mengajukan pra-pinjam:', err);
        showToast('Gagal mengajukan pra-pinjam: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ph ph-check-circle text-base"></i> <span>Konfirmasi Pengajuan</span>';
        }
      }
    });
  }
}

/**
 * Membuka formulir modal booking pra-pinjam
 * @param {string} bookId ID Buku yang hendak dibooking
 */
export function openBookingModal(bookId) {
  const modal = document.getElementById('modalBooking');
  const content = document.getElementById('modalBookingContent');
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) {
    showToast('Buku tidak ditemukan.', 'error');
    return;
  }

  // Validasi Kuota: Cek apakah peminjam sudah mencapai batas maksimal 2 buku aktif
  const activeCount = getUserActiveLoansCount();
  if (activeCount >= MAX_ACTIVE_LOANS) {
    showToast(`Batas peminjaman tercapai! Anda sudah memiliki ${activeCount} buku aktif (maksimal ${MAX_ACTIVE_LOANS} buku). Harap kembalikan buku terlebih dahulu.`, 'warning');
    return;
  }

  // Validasi: Cek apakah peminjam masih memiliki antrean booking atau buku belum dikembalikan
  const activeLoan = getActiveUserLoanForBook(bookId);
  if (activeLoan) {
    if (activeLoan.status === 'Menunggu') {
      showToast(`Anda sudah memiliki tiket booking [${activeLoan.id_peminjaman}] untuk buku ini yang belum diambil di perpustakaan.`, 'warning');
    } else {
      showToast(`Buku "${book.judul_buku}" sedang Anda pinjam dan belum dikembalikan. Harap kembalikan terlebih dahulu.`, 'warning');
    }
    return;
  }

  if ((Number(book.stok) || 0) <= 0) {
    showToast('Maaf, stok buku ini sedang habis dipinjam.', 'error');
    return;
  }

  state.selectedBukuForBooking = book;

  const titleEl = document.getElementById('bookingBookTitle');
  const authorEl = document.getElementById('bookingBookAuthor');
  const rakEl = document.getElementById('bookingBookRak');
  const stokEl = document.getElementById('bookingBookStok');
  const coverImg = document.getElementById('bookingBookCoverImg');
  const coverDefault = document.getElementById('bookingBookCoverDefault');
  const memberNameEl = document.getElementById('bookingMemberName');
  const memberRoleEl = document.getElementById('bookingMemberRole');
  const quotaBadgeEl = document.getElementById('bookingQuotaBadge');

  if (titleEl) titleEl.textContent = book.judul_buku;
  if (authorEl) authorEl.textContent = `${book.penulis} &bull; ${book.penerbit}`;
  if (rakEl) rakEl.textContent = book.keterangan || 'Rak Umum';
  if (stokEl) stokEl.textContent = `${book.stok} Tersedia`;

  if (quotaBadgeEl) {
    quotaBadgeEl.textContent = `Kuota Anda: ${activeCount}/${MAX_ACTIVE_LOANS} Buku`;
  }

  if (memberNameEl) {
    memberNameEl.textContent = state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId;
  }
  if (memberRoleEl) {
    memberRoleEl.textContent = state.userRole === 'guru' ? 'Guru / Pengajar' : 'Siswa Sekolah';
  }

  if (coverImg && coverDefault) {
    if (book.cover_url) {
      coverImg.src = book.cover_url;
      coverImg.classList.remove('hidden');
      coverDefault.classList.add('hidden');
    } else {
      coverImg.classList.add('hidden');
      coverDefault.classList.remove('hidden');
    }
  }

  const today = getTodayDateString();
  const returnDue = addDaysToDate(today, 7);

  const tglPinjamInput = document.getElementById('inputBookingTglPinjam');
  const batasKembaliInput = document.getElementById('inputBookingBatasKembali');

  if (tglPinjamInput) {
    tglPinjamInput.value = today;
    tglPinjamInput.min = today;
  }
  if (batasKembaliInput) {
    batasKembaliInput.value = returnDue;
  }

  showModal(modal, content);
}

// Buka akses global agar dapat dipanggil dari mana saja
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
}
