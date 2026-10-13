/**
 * CAKRAWALA Digital Library - Modul Tiket Pra-Pinjam & Reservasi Online
 * File: public/siswa-guru/modules/2-prapinjam/tiketPraPinjam.js
 * 
 * Tanggung Jawab:
 * - Menangani pengiriman tiket ke tabel Supabase 'data_peminjaman' (status awal 'Menunggu')
 * - Pembuatan kode reservasi tiket berawalan 'PJ-' (misal: PJ-XXXXXX)
 * - Validasi batas kuota peminjaman: Maksimal 2 buku aktif (buku dipinjam + tiket menunggu <= 2)
 * - Membuka pop-up modal tiket pra-pinjam (#modalTiketPraPinjam / #modalTicketSuccess)
 * - Me-render QR Code resmi 2D dari kode 'PJ-XXXXXX' menggunakan QRCode.js
 * - Fitur salin kode ke clipboard dan ekspor tiket sebagai gambar PNG via Canvas
 * - Menangani dialog konfirmasi pembatalan reservasi antrean (#modalCancelBooking)
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
  showToast,
  MAX_ACTIVE_LOANS,
  getUserActiveLoansCount,
  getActiveUserLoanForBook
} from '../siswaHelper.js';
import { removeFromCart } from './keranjang.js';

export { MAX_ACTIVE_LOANS, getUserActiveLoansCount, getActiveUserLoanForBook };

let currentTicketData = null;
let isPrapinjamModuleSetup = false;

/**
 * Helper untuk mendapatkan elemen modal tiket dengan null-checking & dual-ID compatibility
 */
function getTicketModalElements() {
  const modal = document.getElementById('modalTiketPraPinjam') || document.getElementById('modalTicketSuccess');
  const content = document.getElementById('modalTiketPraPinjamContent') || document.getElementById('modalTicketSuccessContent');
  return { modal, content };
}

/**
 * Helper untuk mendapatkan elemen modal booking pengajuan pra-pinjam
 */
function getBookingModalElements() {
  const modal = document.getElementById('modalBooking') || document.getElementById('modalPraPinjam');
  const content = document.getElementById('modalBookingContent') || document.getElementById('modalPraPinjamContent');
  return { modal, content };
}

/**
 * Menutup modal tiket bukti pra-pinjam dengan aman
 */
export function closeTicketModal() {
  const { modal, content } = getTicketModalElements();
  if (modal && content) {
    hideModal(modal, content);
  }
}

/**
 * Menutup modal formulir booking pra-pinjam
 */
export function closeBookingModal() {
  const { modal, content } = getBookingModalElements();
  if (modal && content) {
    hideModal(modal, content);
  }
  state.selectedBukuForBooking = null;
}

/**
 * Membuka formulir modal booking pra-pinjam untuk buku yang dipilih
 * @param {string} bookId ID Buku yang hendak dipinjam
 */
export function openBookingModal(bookId) {
  const { modal, content } = getBookingModalElements();
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) {
    showToast('Buku tidak ditemukan di katalog perpustakaan.', 'error');
    return;
  }

  // 1. Validasi Batas Kuota Maksimal 2 Buku Aktif
  const activeCount = getUserActiveLoansCount();
  if (activeCount >= MAX_ACTIVE_LOANS) {
    showToast(
      `Batas peminjaman tercapai! Anda sudah memiliki ${activeCount} transaksi aktif (maksimal ${MAX_ACTIVE_LOANS} buku). Harap kembalikan buku terlebih dahulu.`,
      'warning'
    );
    return;
  }

  // 2. Validasi Transaksi Aktif untuk Buku yang Sama
  const activeLoan = getActiveUserLoanForBook(bookId);
  if (activeLoan) {
    if (activeLoan.status === 'Menunggu') {
      showToast(`Anda sudah memiliki tiket booking [${activeLoan.id_peminjaman}] untuk buku ini yang belum diambil di meja perpustakaan.`, 'warning');
    } else {
      showToast(`Buku "${book.judul_buku}" sedang aktif Anda pinjam. Harap kembalikan terlebih dahulu.`, 'warning');
    }
    return;
  }

  // 3. Validasi Ketersediaan Stok Fisik
  if ((Number(book.stok) || 0) <= 0) {
    showToast('Maaf, stok fisik buku ini sedang habis dipinjam.', 'error');
    return;
  }

  state.selectedBukuForBooking = book;

  // Isi data buku ke dalam formulir modal
  const bookIdEl = document.getElementById('bookingBookId');
  const titleEl = document.getElementById('bookingBookTitle');
  const authorEl = document.getElementById('bookingBookAuthor');
  const rakEl = document.getElementById('bookingBookRak');
  const stokEl = document.getElementById('bookingBookStok');
  const coverImg = document.getElementById('bookingCoverImg') || document.getElementById('bookingBookCoverImg');
  const coverDefault = document.getElementById('bookingCoverDefault') || document.getElementById('bookingBookCoverDefault');
  const memberNameEl = document.getElementById('bookingMemberName');
  const memberRoleEl = document.getElementById('bookingMemberRole');
  const quotaBadgeEl = document.getElementById('bookingQuotaBadge');

  if (bookIdEl) bookIdEl.textContent = book.id_buku || 'BK-000';
  if (titleEl) titleEl.textContent = book.judul_buku || 'Judul Buku';
  if (authorEl) authorEl.textContent = `${book.penulis || '-'} • ${book.penerbit || '-'}`;
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

  if (modal && content) {
    showModal(modal, content);
  }
}

/**
 * Menampilkan modal tiket sukses pra-pinjam dengan QR Code resmi
 * @param {object} data Objek informasi tiket ({ id, buku, rak, tempo, peminjam, nisn, statusPersiapan })
 */
export function showTicketSuccessModal(data) {
  currentTicketData = data;
  const { modal, content } = getTicketModalElements();
  if (!modal) return;

  const idEl = document.getElementById('ticketIdDisplay');
  const titleEl = document.getElementById('ticketBookTitle');
  const rakEl = document.getElementById('ticketRakDisplay');
  const tempoEl = document.getElementById('ticketTempoDisplay');
  const nameEl = document.getElementById('ticketMemberNameDisplay');

  if (idEl) idEl.textContent = data.id;
  if (titleEl) titleEl.textContent = data.buku;
  if (rakEl) rakEl.textContent = data.rak;
  if (tempoEl) tempoEl.textContent = data.tempo;

  const memberName = data.peminjam || state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId;
  const memberId = data.nisn || state.memberId;
  if (nameEl) nameEl.textContent = `${memberName} (${memberId})`;

  // Update Status Badge Tiket
  const statusBadge = document.getElementById('ticketStatusBadge');
  if (statusBadge) {
    if (data.statusPersiapan === 'Siap Diambil') {
      statusBadge.className = 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200';
      statusBadge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span><span>Siap di Meja</span>';
    } else {
      statusBadge.className = 'inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200';
      statusBadge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Menunggu</span>';
    }
  }

  // Render QR Code 2D menggunakan QRCode.js
  const qrContainer = document.getElementById('ticketQrContainer');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    new window.QRCode(qrContainer, {
      text: data.id,
      width: 160,
      height: 160,
      colorDark: '#000836',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }

  if (modal && content) {
    showModal(modal, content);
  }
}

// Alias fungsi untuk kompatibilitas penamaan
export const showTicketModal = showTicketSuccessModal;

/**
 * Mengirimkan pengajuan pra-pinjam ke Supabase:
 * - Batas kuota: Maksimal 2 buku aktif (buku dipinjam + tiket menunggu <= 2)
 * - Kode reservasi tiket berawalan 'PJ-' (misal: PJ-XXXXXX)
 * - Status awal transaksi di Supabase: 'Menunggu' & 'Belum Diambil'
 * - Membuka modal tiket bukti reservasi & render QR Code
 * 
 * @param {object|string} [bookOrId] Objek buku atau ID buku (opsional, jika kosong mengambil state.selectedBukuForBooking)
 * @param {string} [customTglPinjam] Tanggal pengajuan pinjam (opsional)
 * @returns {Promise<boolean>}
 */
export async function submitPraPinjam(bookOrId, customTglPinjam) {
  let book = null;
  if (bookOrId) {
    book = typeof bookOrId === 'string'
      ? (state.cache.buku || []).find(b => b.id_buku === bookOrId)
      : bookOrId;
  } else {
    book = state.selectedBukuForBooking;
  }

  if (!book) {
    showToast('Buku belum dipilih untuk pengajuan pra-pinjam.', 'warning');
    return false;
  }

  // 1. Validasi Stok Fisik
  if ((Number(book.stok) || 0) <= 0) {
    showToast(`Maaf, stok buku "${book.judul_buku}" sedang kosong.`, 'error');
    return false;
  }

  // 2. Validasi Batas Kuota Lokal (Maksimal 2 buku aktif)
  const activeCount = getUserActiveLoansCount();
  if (activeCount >= MAX_ACTIVE_LOANS) {
    showToast(
      `Batas peminjaman tercapai! Anda memiliki ${activeCount} transaksi aktif (maksimal ${MAX_ACTIVE_LOANS} buku). Harap kembalikan buku terlebih dahulu.`,
      'warning'
    );
    return false;
  }

  // 3. Validasi Transaksi Aktif untuk Buku Ini
  const activeLoan = getActiveUserLoanForBook(book.id_buku);
  if (activeLoan) {
    if (activeLoan.status === 'Menunggu') {
      showToast(`Anda sudah memiliki tiket booking [${activeLoan.id_peminjaman}] untuk buku ini.`, 'warning');
    } else {
      showToast(`Buku "${book.judul_buku}" sedang Anda pinjam dan belum dikembalikan.`, 'warning');
    }
    return false;
  }

  // 4. Validasi Kuota Langsung ke Database Supabase untuk Keamanan Integritas Data
  if (db && state.memberId) {
    try {
      const { data: userActiveLoans, error: errQuota } = await db
        .from('data_peminjaman')
        .select('id_peminjaman, id_buku, status')
        .eq('nisn_siswa', state.memberId)
        .in('status', ['Menunggu', 'Dipinjam']);

      if (!errQuota && userActiveLoans) {
        if (userActiveLoans.length >= MAX_ACTIVE_LOANS) {
          showToast(`Batas peminjaman tercapai! Terdata ${userActiveLoans.length} buku aktif di sistem (maksimal ${MAX_ACTIVE_LOANS} buku).`, 'warning');
          return false;
        }
        const hasSameBook = userActiveLoans.some(l => l.id_buku === book.id_buku);
        if (hasSameBook) {
          showToast(`Buku ini masih tercatat aktif di akun Anda dan belum dikembalikan.`, 'warning');
          return false;
        }
      }
    } catch (e) {
      console.warn('[tiketPraPinjam] Gagal verifikasi kuota online:', e);
    }
  }

  const submitBtn = document.getElementById('btnSubmitBooking');
  const tglInput = document.getElementById('inputBookingTglPinjam');
  const batasInput = document.getElementById('inputBookingBatasKembali');

  const today = getTodayDateString();
  const tglPinjam = customTglPinjam || (tglInput ? tglInput.value : today) || today;
  const batasKembali = (batasInput ? batasInput.value : addDaysToDate(tglPinjam, 7)) || addDaysToDate(tglPinjam, 7);

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-base"></i> <span>Mengajukan Tiket...</span>';
    }

    // Pembuatan kode reservasi tiket berawalan 'PJ-' (misal: PJ-XXXXXX)
    const newIdPeminjaman = generateRandomId('PJ', 6);

    // 1. Simpan transaksi ke tabel 'data_peminjaman' dengan status 'Menunggu' & 'Belum Diambil'
    if (db) {
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

      // 2. Kunci / Potong stok buku fisik di Supabase
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
        console.warn('[tiketPraPinjam] Peringatan: Gagal memotong stok otomatis:', errStock);
      }
    }

    // 3. Hapus item dari keranjang jika buku ada di keranjang
    removeFromCart(book.id_buku);

    // 4. Tutup modal formulir pengajuan booking
    closeBookingModal();

    showToast(`Pengajuan pra-pinjam berhasil! Kode Tiket: [${newIdPeminjaman}].`, 'success');

    // 5. Buka modal tiket reservasi & render QR Code
    showTicketSuccessModal({
      id: newIdPeminjaman,
      buku: book.judul_buku,
      rak: book.keterangan || 'Rak Umum',
      tempo: '7 Hari (Mulai Serah Terima)',
      peminjam: state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId,
      nisn: state.memberId,
      statusPersiapan: 'Belum Diambil'
    });

    // 6. Sinkronisasi data anggota ke seluruh tampilan
    if (window.fetchAllMemberData) {
      await window.fetchAllMemberData();
    }

    return true;
  } catch (err) {
    console.error('[tiketPraPinjam] Gagal mengajukan pra-pinjam:', err);
    showToast('Gagal mengajukan pra-pinjam: ' + (err.message || 'Error Supabase'), 'error');
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ph ph-check-circle text-base"></i> <span>Konfirmasi Pengajuan</span>';
    }
  }
}

/**
 * Mengekspor tiket pra-pinjam sebagai gambar PNG dengan QR Code 2D resolusi tajam
 * @param {object} data 
 */
export function exportTicketAsPng(data) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 460;
    canvas.height = 660;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background kartu putih bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 460, 660);

    // Header Navy Bar
    ctx.fillStyle = '#000C4F';
    ctx.fillRect(0, 0, 460, 84);

    // Header Title & Logo Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PERPUSTAKAAN CAKRAWALA', 230, 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('TIKET RESERVASI PRA-PINJAM BUKU FISIK', 230, 58);

    // Frame Kartu Tiket
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(24, 100, 412, 536, 16);
    } else {
      ctx.rect(24, 100, 412, 536);
    }
    ctx.fill();
    ctx.stroke();

    // Box Putih untuk QR Code
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(120, 118, 220, 220, 12);
    } else {
      ctx.rect(120, 118, 220, 220);
    }
    ctx.fill();
    ctx.stroke();

    // Render QR Code 2D Offscreen untuk digambar ke gambar PNG
    if (window.QRCode) {
      try {
        const offDiv = document.createElement('div');
        new window.QRCode(offDiv, {
          text: data.id,
          width: 196,
          height: 196,
          colorDark: '#000836',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H
        });

        const qrCanvas = offDiv.querySelector('canvas');
        const qrImg = offDiv.querySelector('img');

        if (qrCanvas) {
          ctx.drawImage(qrCanvas, 132, 130, 196, 196);
        } else if (qrImg && qrImg.src) {
          const img = new Image();
          img.src = qrImg.src;
          ctx.drawImage(img, 132, 130, 196, 196);
        }
      } catch (err) {
        console.error('Error drawing QR Code to export canvas:', err);
      }
    }

    // Kode Tiket
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KODE TIKET PEMINJAMAN', 230, 362);

    ctx.fillStyle = '#000C4F';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(data.id, 230, 388);

    // Garis putus-putus
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, 408);
    ctx.lineTo(416, 408);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data Peminjaman
    ctx.textAlign = 'left';
    const startY = 438;
    const lineHeight = 28;

    // 1. Judul Buku
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Judul Buku:', 48, startY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Inter, sans-serif';
    const judul = data.buku || '-';
    ctx.fillText(judul.length > 27 ? judul.slice(0, 27) + '...' : judul, 164, startY);

    // 2. Lokasi Rak
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Lokasi Rak:', 48, startY + lineHeight);
    ctx.fillStyle = '#000C4F';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(data.rak || 'Rak Umum', 164, startY + lineHeight);

    // 3. Peminjam
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Peminjam:', 48, startY + (lineHeight * 2));
    ctx.fillStyle = '#334155';
    ctx.font = '600 11px Inter, sans-serif';
    const namaPeminjam = data.peminjam || '-';
    ctx.fillText(namaPeminjam.length > 25 ? namaPeminjam.slice(0, 25) + '...' : namaPeminjam, 164, startY + (lineHeight * 2));

    // 4. Durasi Peminjaman Resmi
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Durasi Pinjam:', 48, startY + (lineHeight * 3));
    ctx.fillStyle = '#000C4F';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(data.tempo || '7 Hari (Mulai Serah Terima)', 164, startY + (lineHeight * 3));

    // Catatan Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('*Tunjukkan QR Code ini kepada petugas sirkulasi untuk scan dan verifikasi', 230, 580);
    const statusNote = data.statusPersiapan === 'Siap Diambil'
      ? 'Status: Buku Telah Siap di Meja Sirkulasi'
      : 'Status: Menunggu Penyiapan Petugas';
    ctx.fillText(statusNote, 230, 598);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Tiket-Prapinjam-${data.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Tiket ${data.id} berhasil diunduh sebagai gambar PNG dengan QR Code 2D!`, 'success');
  } catch (err) {
    console.error('Gagal export tiket PNG:', err);
    showToast('Gagal mengunduh gambar tiket: ' + err.message, 'error');
  }
}

/**
 * Membuka modal konfirmasi pembatalan reservasi antrean booking
 * @param {string} loanId ID Peminjaman (misal: PJ-123456)
 */
export function openCancelBookingModal(loanId) {
  const modal = document.getElementById('modalCancelBooking');
  const content = document.getElementById('modalCancelBookingContent');
  const idDisplay = document.getElementById('cancelBookingIdDisplay');

  state.cancelTargetBooking = loanId;
  if (idDisplay) idDisplay.textContent = loanId;

  if (modal && content) {
    showModal(modal, content);
  }
}

/**
 * Setup seluruh event listener modal & tombol untuk siklus pra-pinjam
 */
export function setupPrapinjamModule() {
  if (isPrapinjamModuleSetup) return;
  isPrapinjamModuleSetup = true;

  // 1. Setup Form Booking Modal
  const { modal: modalBooking, content: contentBooking } = getBookingModalElements();
  const closeBookingBtn = document.getElementById('btnCloseBookingModal');
  const cancelBookingBtn = document.getElementById('btnCancelBookingModal');
  const formBooking = document.getElementById('formBooking');
  const tglPinjamInput = document.getElementById('inputBookingTglPinjam');
  const batasKembaliInput = document.getElementById('inputBookingBatasKembali');

  if (closeBookingBtn) closeBookingBtn.addEventListener('click', closeBookingModal);
  if (cancelBookingBtn) cancelBookingBtn.addEventListener('click', closeBookingModal);
  if (modalBooking) {
    modalBooking.addEventListener('click', e => {
      if (e.target === modalBooking) closeBookingModal();
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

  if (formBooking) {
    formBooking.addEventListener('submit', async e => {
      e.preventDefault();
      await submitPraPinjam();
    });
  }

  // 2. Setup Modal Tiket Bukti Reservasi
  const { modal: modalTicket } = getTicketModalElements();
  const btnCloseTicket = document.getElementById('btnCloseTicketModal');
  const btnCloseTicketX = document.getElementById('btnCloseTicketModalX');
  const btnCopy = document.getElementById('btnCopyTicketCode');
  const btnDownload = document.getElementById('btnDownloadTicketPng');

  if (btnCloseTicket) btnCloseTicket.addEventListener('click', closeTicketModal);
  if (btnCloseTicketX) btnCloseTicketX.addEventListener('click', closeTicketModal);
  if (modalTicket) {
    modalTicket.addEventListener('click', e => {
      if (e.target === modalTicket) closeTicketModal();
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      if (!currentTicketData || !currentTicketData.id) return;
      try {
        await navigator.clipboard.writeText(currentTicketData.id);
        const textSpan = document.getElementById('copyTicketBtnText');
        if (textSpan) textSpan.textContent = 'Tersalin!';
        showToast(`Kode tiket [${currentTicketData.id}] berhasil disalin!`, 'success');
        setTimeout(() => {
          if (textSpan) textSpan.textContent = 'Salin';
        }, 2000);
      } catch (err) {
        showToast(`Kode tiket: ${currentTicketData.id}`, 'info');
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!currentTicketData) {
        showToast('Data tiket belum siap untuk diunduh.', 'warning');
        return;
      }
      exportTicketAsPng(currentTicketData);
    });
  }

  // 3. Setup Modal Konfirmasi Pembatalan Booking
  const modalCancel = document.getElementById('modalCancelBooking');
  const contentCancel = document.getElementById('modalCancelBookingContent');
  const dismissCancelBtn = document.getElementById('btnDismissCancelBooking');
  const confirmCancelBtn = document.getElementById('btnConfirmCancelBooking');

  function closeCancelModal() {
    if (modalCancel && contentCancel) {
      hideModal(modalCancel, contentCancel);
    }
    state.cancelTargetBooking = null;
  }

  if (dismissCancelBtn) dismissCancelBtn.addEventListener('click', closeCancelModal);
  if (modalCancel) {
    modalCancel.addEventListener('click', e => {
      if (e.target === modalCancel) closeCancelModal();
    });
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', async () => {
      if (!state.cancelTargetBooking) return;
      const loanId = state.cancelTargetBooking;

      try {
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-sm"></i> <span>Membatalkan...</span>';

        // Cari ID Buku dari cache / database
        const targetLoan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === loanId);
        let idBuku = targetLoan?.id_buku;

        if (!idBuku && db) {
          const { data: dbLoan } = await db
            .from('data_peminjaman')
            .select('id_buku')
            .eq('id_peminjaman', loanId)
            .single();
          idBuku = dbLoan?.id_buku;
        }

        // Hapus transaksi status 'Menunggu' dari Supabase
        if (db) {
          const { error } = await db
            .from('data_peminjaman')
            .delete()
            .eq('id_peminjaman', loanId);

          if (error) throw error;

          // Kembalikan stok fisik buku (+1)
          if (idBuku) {
            const { data: dbBook } = await db
              .from('data_buku')
              .select('stok')
              .eq('id_buku', idBuku)
              .single();

            const currentStock = dbBook && dbBook.stok !== undefined ? Number(dbBook.stok) : 0;

            const { error: errStock } = await db
              .from('data_buku')
              .update({
                stok: currentStock + 1,
                status: 'Tersedia'
              })
              .eq('id_buku', idBuku);

            if (errStock) {
              console.warn('[tiketPraPinjam] Gagal memulihkan stok buku:', errStock);
            }
          }
        }

        showToast(`Pesanan antrean [${loanId}] berhasil dibatalkan. Stok buku telah dipulihkan.`, 'success');
        closeCancelModal();

        if (window.fetchAllMemberData) {
          await window.fetchAllMemberData();
        }
      } catch (err) {
        console.error('[tiketPraPinjam] Gagal membatalkan booking:', err);
        showToast('Gagal membatalkan pesanan: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        confirmCancelBtn.disabled = false;
        confirmCancelBtn.innerHTML = '<i class="ph ph-trash text-sm"></i> <span>Ya, Batalkan</span>';
      }
    });
  }
}
