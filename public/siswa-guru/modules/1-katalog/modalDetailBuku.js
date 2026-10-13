/**
 * CAKRAWALA Digital Library - Modul Pop-up Detail Buku
 * File: public/siswa-guru/modules/1-katalog/modalDetailBuku.js
 * 
 * Tanggung Jawab:
 * - Menampilkan modal informasi lengkap buku (sinopsis, penerbit, nomor rak, estimasi nilai buku)
 * - Menerapkan dual-ID compatibility (#modalDetailBuku & #modalBookDetail)
 * - Memeriksa kuota aktif peminjaman (maksimal 2 buku)
 * - Menangani tombol cepat menuju pengajuan pra-pinjam / booking
 */

import { state } from '../state.js';
import { formatRupiah, showModal, hideModal, showToast } from '../../../assets/js/sharedUtils.js';
import { MAX_ACTIVE_LOANS, getUserActiveLoansCount, getActiveUserLoanForBook } from './katalogBuku.js';

let isDetailModalSetup = false;

/**
 * Mendapatkan elemen modal dan konten dengan kompatibilitas dual ID
 */
function getModalElements() {
  const modal = document.getElementById('modalDetailBuku') || document.getElementById('modalBookDetail');
  const content = document.getElementById('modalDetailBukuContent') || document.getElementById('modalBookDetailContent');
  const closeBtn = document.getElementById('btnCloseDetailModal');
  const bookBtn = document.getElementById('btnDetailToBooking');
  return { modal, content, closeBtn, bookBtn };
}

/**
 * Setup pendengar klik (event listeners) untuk modal detail buku
 * @param {Function} [onNavigateToBooking] Callback ketika tombol booking di modal ditekan
 */
export function setupDetailModal(onNavigateToBooking) {
  if (isDetailModalSetup) return;
  isDetailModalSetup = true;

  const { modal, content, closeBtn, bookBtn } = getModalElements();

  function closeDetailModal() {
    if (modal && content) {
      hideModal(modal, content);
    }
    state.selectedBukuDetail = null;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDetailModal();
    });
  }

  if (bookBtn) {
    bookBtn.addEventListener('click', () => {
      if (state.selectedBukuDetail) {
        const id = state.selectedBukuDetail.id_buku;
        closeDetailModal();
        if (typeof onNavigateToBooking === 'function') {
          onNavigateToBooking(id);
        } else if (window.openBookingModal) {
          window.openBookingModal(id);
        }
      }
    });
  }
}

/**
 * Membuka jendela pop-up detail buku
 * @param {string} bookId ID Buku (misal: BK-001)
 */
export function openDetailModal(bookId) {
  const { modal, content, bookBtn } = getModalElements();
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) {
    console.warn(`[modalDetailBuku] Buku dengan ID ${bookId} tidak ditemukan.`);
    return;
  }

  state.selectedBukuDetail = book;

  const imgEl = document.getElementById('detailCoverImg');
  const iconDefault = document.getElementById('detailCoverDefault');
  const idEl = document.getElementById('detailBookId');
  const titleEl = document.getElementById('detailBookTitle');
  const authorEl = document.getElementById('detailBookAuthor');
  const publisherEl = document.getElementById('detailBookPublisher');
  const yearEl = document.getElementById('detailBookYear');
  const categoryEl = document.getElementById('detailBookCategory');
  const shelfEl = document.getElementById('detailBookShelf');
  const stockEl = document.getElementById('detailBookStock');
  const priceEl = document.getElementById('detailBookPrice');

  const kategori = (state.cache.kategori || []).find(k => k.id_kategori === book.id_kategori);

  if (idEl) idEl.textContent = book.id_buku;
  if (titleEl) titleEl.textContent = book.judul_buku;
  if (authorEl) authorEl.textContent = book.penulis || '-';
  if (publisherEl) publisherEl.textContent = book.penerbit || '-';
  if (yearEl) yearEl.textContent = book.tahun_terbit || '-';
  if (categoryEl) categoryEl.textContent = kategori ? kategori.nama_kategori : 'Koleksi Umum';
  if (shelfEl) shelfEl.textContent = book.keterangan || 'Rak Umum';
  if (priceEl) priceEl.textContent = formatRupiah(book.harga_buku || 50000);

  const stok = Number(book.stok) || 0;
  if (stockEl) {
    stockEl.textContent = stok > 0 ? `${stok} Eksemplar Tersedia` : 'Stok Habis';
    stockEl.className = stok > 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600';
  }

  // Cover thumbnail
  if (imgEl && iconDefault) {
    if (book.cover_url) {
      imgEl.src = book.cover_url;
      imgEl.onload = () => {
        imgEl.classList.remove('hidden');
        iconDefault.classList.add('hidden');
      };
      imgEl.onerror = () => {
        imgEl.classList.add('hidden');
        iconDefault.classList.remove('hidden');
      };
    } else {
      imgEl.classList.add('hidden');
      iconDefault.classList.remove('hidden');
    }
  }

  // Validasi Tombol Booking di dalam Modal
  const activeLoan = getActiveUserLoanForBook(book.id_buku);
  const activeCount = getUserActiveLoansCount();
  const isQuotaFull = activeCount >= MAX_ACTIVE_LOANS;

  if (bookBtn) {
    if (activeLoan) {
      bookBtn.disabled = true;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
      bookBtn.innerHTML = activeLoan.status === 'Menunggu'
        ? '<i class="ph ph-hourglass-high"></i><span>Anda Sudah Booking Buku Ini</span>'
        : '<i class="ph ph-book-open"></i><span>Sedang Anda Pinjam</span>';
    } else if (isQuotaFull) {
      bookBtn.disabled = true;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
      bookBtn.innerHTML = '<i class="ph ph-lock-key"></i><span>Kuota Penuh (Maks. 2 Buku)</span>';
    } else if (stok > 0) {
      bookBtn.disabled = false;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-navy text-white font-bold text-xs hover:bg-navy-light transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer';
      bookBtn.innerHTML = '<i class="ph ph-bookmark-simple"></i><span>Ajukan Pra-Pinjam Buku Ini</span>';
    } else {
      bookBtn.disabled = true;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
      bookBtn.innerHTML = '<i class="ph ph-x-circle"></i><span>Stok Buku Sedang Kosong</span>';
    }
  }

  if (modal && content) {
    showModal(modal, content);
  }
}
