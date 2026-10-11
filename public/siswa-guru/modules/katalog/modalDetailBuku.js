/**
 * CAKRAWALA Digital Library - Modul Pop-up Detail Buku
 * File: public/siswa-guru/modules/katalog/modalDetailBuku.js
 * 
 * Tanggung Jawab:
 * - Menampilkan modal informasi lengkap buku (sinopsis, penerbit, nomor rak, ketersediaan)
 * - Menangani tombol cepat menuju pengajuan pra-pinjam
 */

import { state } from '../state.js';
import { formatRupiah, showModal, hideModal } from '../siswaHelper.js';
import { MAX_ACTIVE_LOANS, getUserActiveLoansCount, getActiveUserLoanForBook } from '../prapinjam/index.js';

let isDetailModalSetup = false;

/**
 * Setup pendengar klik (event listeners) untuk modal detail buku
 * @param {Function} onNavigateToBooking Callback ketika tombol booking di modal ditekan
 */
export function setupDetailModal(onNavigateToBooking) {
  if (isDetailModalSetup) return;
  isDetailModalSetup = true;

  const modal = document.getElementById('modalBookDetail');
  const content = document.getElementById('modalBookDetailContent');
  const closeBtn = document.getElementById('btnCloseDetailModal');
  const bookBtn = document.getElementById('btnDetailToBooking');

  function closeDetailModal() {
    hideModal(modal, content);
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
  const modal = document.getElementById('modalBookDetail');
  const content = document.getElementById('modalBookDetailContent');
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) return;

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
  const bookBtn = document.getElementById('btnDetailToBooking');

  const kategori = (state.cache.kategori || []).find(k => k.id_kategori === book.id_kategori);

  if (idEl) idEl.textContent = book.id_buku;
  if (titleEl) titleEl.textContent = book.judul_buku;
  if (authorEl) authorEl.textContent = book.penulis;
  if (publisherEl) publisherEl.textContent = book.penerbit;
  if (yearEl) yearEl.textContent = book.tahun_terbit;
  if (categoryEl) categoryEl.textContent = kategori ? kategori.nama_kategori : '-';
  if (shelfEl) shelfEl.textContent = book.keterangan || 'Rak Umum';
  if (priceEl) priceEl.textContent = formatRupiah(book.harga_buku || 50000);

  const stok = Number(book.stok) || 0;
  if (stockEl) {
    stockEl.textContent = stok > 0 ? `${stok} Eksemplar Tersedia` : 'Stok Habis';
    stockEl.className = stok > 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600';
  }

  const activeLoan = getActiveUserLoanForBook(book.id_buku);
  const activeCount = getUserActiveLoansCount();
  const isQuotaFull = activeCount >= MAX_ACTIVE_LOANS;

  if (bookBtn) {
    if (activeLoan) {
      bookBtn.disabled = true;
      if (activeLoan.status === 'Menunggu') {
        bookBtn.className = 'w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
        bookBtn.innerHTML = '<i class="ph ph-hourglass-high text-base"></i> Anda Memiliki Tiket Booking Belum Diambil';
      } else {
        bookBtn.className = 'w-full py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-navy font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
        bookBtn.innerHTML = '<i class="ph ph-book-open text-base"></i> Buku Sedang Anda Pinjam (Belum Dikembalikan)';
      }
    } else if (isQuotaFull) {
      bookBtn.disabled = true;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5';
      bookBtn.innerHTML = '<i class="ph ph-lock-key text-base"></i> Kuota Penuh (Maksimal 2 Buku Aktif Tercapai)';
    } else if (stok <= 0) {
      bookBtn.disabled = true;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed';
      bookBtn.textContent = 'Stok Buku Habis';
    } else {
      bookBtn.disabled = false;
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-navy text-white font-bold text-xs hover:bg-navy-light transition shadow-sm flex items-center justify-center gap-1.5';
      bookBtn.innerHTML = '<i class="ph ph-bookmark-simple text-base"></i> Ajukan Pra-Pinjam Buku Ini';
    }
  }

  if (imgEl && iconDefault) {
    if (book.cover_url) {
      imgEl.src = book.cover_url;
      imgEl.classList.remove('hidden');
      iconDefault.classList.add('hidden');
    } else {
      imgEl.classList.add('hidden');
      iconDefault.classList.remove('hidden');
    }
  }

  showModal(modal, content);
}
