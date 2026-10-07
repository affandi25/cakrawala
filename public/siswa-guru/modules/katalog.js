/**
 * CAKRAWALA Digital Library - Modul Tab 2: Katalog Koleksi & Booking Pra-Pinjam
 * File: public/siswa-guru/modules/katalog.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayDateString,
  addDaysToDate,
  generateRandomId,
  showModal,
  hideModal,
  showToast
} from './siswaHelper.js';

/**
 * Setup event listeners untuk katalog dan modal pra-pinjam
 */
export function setupKatalogModule() {
  const searchInput = document.getElementById('inputSearchKatalog');
  const clearSearchBtn = document.getElementById('btnClearSearchKatalog');
  const filterKategoriSelect = document.getElementById('selectFilterKategoriKatalog');
  const filterStokSelect = document.getElementById('selectFilterStokKatalog');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchKatalogQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !state.searchKatalogQuery);
      }
      renderKatalogGrid();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchKatalogQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderKatalogGrid();
    });
  }

  if (filterKategoriSelect) {
    filterKategoriSelect.addEventListener('change', e => {
      state.filterKategori = e.target.value;
      renderKatalogGrid();
    });
  }

  if (filterStokSelect) {
    filterStokSelect.addEventListener('change', e => {
      state.filterKetersediaan = e.target.value;
      renderKatalogGrid();
    });
  }

  setupBookingModal();
  setupDetailModal();
  checkUrlRedirectBooking();
}

/**
 * Mengisi opsi filter kategori buku
 */
export function renderKategoriOptions() {
  const select = document.getElementById('selectFilterKategoriKatalog');
  if (!select) return;

  const current = state.filterKategori || '';
  let opts = '<option value="">Semua Kategori</option>';

  (state.cache.kategori || []).forEach(kat => {
    opts += `<option value="${kat.id_kategori}">${kat.nama_kategori}</option>`;
  });

  select.innerHTML = opts;
  select.value = current;
}

/**
 * Merender kartu-kartu buku di halaman katalog
 */
export function renderKatalogGrid() {
  const container = document.getElementById('gridKatalogBuku');
  const recordCount = document.getElementById('katalogRecordCount');
  const tableInfo = document.getElementById('katalogTableInfo');
  if (!container) return;

  let filtered = [...state.cache.buku];

  if (state.filterKategori) {
    filtered = filtered.filter(b => b.id_kategori === state.filterKategori);
  }

  if (state.filterKetersediaan === 'tersedia') {
    filtered = filtered.filter(b => (Number(b.stok) || 0) > 0);
  } else if (state.filterKetersediaan === 'dipinjam') {
    filtered = filtered.filter(b => (Number(b.stok) || 0) <= 0);
  }

  if (state.searchKatalogQuery) {
    const q = state.searchKatalogQuery;
    filtered = filtered.filter(b => {
      const matchTitle = (b.judul_buku || '').toLowerCase().includes(q);
      const matchAuthor = (b.penulis || '').toLowerCase().includes(q);
      const matchPublisher = (b.penerbit || '').toLowerCase().includes(q);
      const matchId = (b.id_buku || '').toLowerCase().includes(q);
      const matchRak = (b.keterangan || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchPublisher || matchId || matchRak;
    });
  }

  if (recordCount) recordCount.textContent = `${filtered.length} Koleksi`;
  if (tableInfo) {
    tableInfo.textContent = `Menampilkan ${filtered.length} dari ${state.cache.buku.length} total koleksi buku perpustakaan.`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i class="ph ph-books text-4xl inline-block mb-2 text-slate-300"></i>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada buku yang ditemukan</h4>
        <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter kategori.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const coverUrl = b.cover_url || null;
    const kategori = (state.cache.kategori || []).find(k => k.id_kategori === b.id_kategori);
    const namaKat = kategori ? kategori.nama_kategori : 'Koleksi Umum';
    const stok = Number(b.stok) || 0;
    const isAvailable = stok > 0;

    let stokBadge = '';
    if (isAvailable) {
      stokBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Tersedia (${stok})
        </span>
      `;
    } else {
      stokBadge = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600"></span> Dipinjam Habis
        </span>
      `;
    }

    return `
      <div class="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-navy/40 hover:shadow-lg transition duration-200">
        <div>
          <!-- Sampul Buku -->
          <div class="relative h-48 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-3 shadow-2xs cursor-pointer"
            onclick="window.openDetailModal('${b.id_buku}')">
            ${coverUrl ? `<img src="${coverUrl}" alt="${b.judul_buku}" class="h-full w-full object-cover group-hover:scale-105 transition duration-300" />` : '<i class="ph ph-book text-3xl"></i>'}
            <span class="absolute top-2.5 left-2.5 rounded-full bg-navy/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5">
              ${namaKat}
            </span>
            <span class="absolute top-2.5 right-2.5 rounded-md bg-white/95 backdrop-blur-xs text-navy font-mono text-[9px] font-bold px-1.5 py-0.5 shadow-2xs">
              ${b.id_buku}
            </span>
          </div>

          <!-- Metadata -->
          <div class="cursor-pointer" onclick="window.openDetailModal('${b.id_buku}')">
            <h4 class="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-navy transition">${b.judul_buku}</h4>
            <p class="text-[11px] text-slate-500 mt-1 truncate">${b.penulis} &bull; ${b.tahun_terbit}</p>
            <p class="text-[10px] font-semibold text-navy mt-0.5 flex items-center gap-1 truncate">
              <i class="ph ph-map-pin"></i>
              <span>${b.keterangan || 'Rak Umum'}</span>
            </p>
          </div>
        </div>

        <!-- Bagian Bawah: Status & Aksi -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>${stokBadge}</div>

          <div class="inline-flex items-center gap-1.5">
            <button type="button" onclick="window.openDetailModal('${b.id_buku}')"
              class="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-navy transition"
              title="Lihat Rincian Buku">
              <i class="ph ph-info text-base"></i>
            </button>

            ${isAvailable ? `
              <button type="button" onclick="window.openBookingModal('${b.id_buku}')"
                class="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-light transition shadow-2xs">
                <i class="ph ph-bookmark-simple"></i>
                <span>Pra-Pinjam</span>
              </button>
            ` : `
              <button type="button" disabled
                class="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed">
                <span>Habis</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Setup modal booking pra-pinjam
 */
export function setupBookingModal() {
  const modal = document.getElementById('modalBooking');
  const content = document.getElementById('modalBookingContent');
  const closeBtn = document.getElementById('btnCloseBookingModal');
  const cancelBtn = document.getElementById('btnCancelBookingModal');
  const form = document.getElementById('formBooking');

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

  // Tombol tutup modal sukses tiket & setup interaksi tiket
  setupTicketModalElements();

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

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-base"></i> <span>Mengajukan Booking...</span>';
        }

        const newIdPeminjaman = generateRandomId('PJ', 6);

        // 1. Simpan ke database data_peminjaman dengan status 'Menunggu'
        const { error: errLoan } = await db
          .from('data_peminjaman')
          .insert({
            id_peminjaman: newIdPeminjaman,
            nisn_siswa: state.memberId,
            id_buku: book.id_buku,
            tanggal_pinjam: tglPinjam,
            batas_kembali: batasKembali,
            metode_peminjaman: 'Pra Pinjam',
            status: 'Menunggu'
          });

        if (errLoan) throw errLoan;

        closeBookingModal();
        showToast('Pengajuan pra-pinjam berhasil diterbitkan!', 'success');

        // Tampilkan modal tiket bukti booking dengan barcode & QR
        showTicketSuccessModal({
          id: newIdPeminjaman,
          buku: book.judul_buku,
          rak: book.keterangan || 'Rak Umum',
          tempo: formatTanggalIndo(batasKembali),
          peminjam: state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId,
          nisn: state.memberId
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
 */
export function openBookingModal(bookId) {
  const modal = document.getElementById('modalBooking');
  const content = document.getElementById('modalBookingContent');
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) {
    showToast('Buku tidak ditemukan.', 'error');
    return;
  }

  state.selectedBukuForBooking = book;

  const imgEl = document.getElementById('bookingCoverImg');
  const iconDefault = document.getElementById('bookingCoverDefault');
  const idEl = document.getElementById('bookingBookId');
  const judulEl = document.getElementById('bookingBookTitle');
  const penulisEl = document.getElementById('bookingBookAuthor');
  const rakEl = document.getElementById('bookingBookRak');
  const stokEl = document.getElementById('bookingBookStok');

  const inputTglPinjam = document.getElementById('inputBookingTglPinjam');
  const inputBatasKembali = document.getElementById('inputBookingBatasKembali');

  const today = getTodayDateString();
  if (inputTglPinjam) inputTglPinjam.value = today;
  if (inputBatasKembali) inputBatasKembali.value = addDaysToDate(today, 7);

  if (idEl) idEl.textContent = book.id_buku;
  if (judulEl) judulEl.textContent = book.judul_buku;
  if (penulisEl) penulisEl.textContent = book.penulis || '-';
  if (rakEl) rakEl.textContent = book.keterangan || 'Rak Umum';
  if (stokEl) stokEl.textContent = `${book.stok} Tersedia`;

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

/**
 * Variabel penyimpan data tiket aktif yang sedang dibuka
 */
let currentTicketData = null;

/**
 * Menyiapkan interaksi pada modal tiket booking (Salin, Switcher Barcode/QR, Unduh)
 */
export function setupTicketModalElements() {
  const modalTicket = document.getElementById('modalTicketSuccess');
  const contentTicket = document.getElementById('modalTicketSuccessContent');
  const btnCloseTicket = document.getElementById('btnCloseTicketModal');
  const btnCloseTicketX = document.getElementById('btnCloseTicketModalX');
  const btnCopy = document.getElementById('btnCopyTicketCode');
  const btnTabBarcode1D = document.getElementById('btnTabBarcode1D');
  const btnTabBarcodeQR = document.getElementById('btnTabBarcodeQR');
  const barcodeSection = document.getElementById('ticketBarcodeSection');
  const qrSection = document.getElementById('ticketQrSection');
  const btnDownload = document.getElementById('btnDownloadTicketPng');

  function closeTicket() {
    hideModal(modalTicket, contentTicket);
  }

  if (btnCloseTicket) btnCloseTicket.addEventListener('click', closeTicket);
  if (btnCloseTicketX) btnCloseTicketX.addEventListener('click', closeTicket);
  if (modalTicket) {
    modalTicket.addEventListener('click', e => {
      if (e.target === modalTicket) closeTicket();
    });
  }

  // Switcher Tab Barcode 1D / QR Code 2D
  if (btnTabBarcode1D && btnTabBarcodeQR && barcodeSection && qrSection) {
    btnTabBarcode1D.addEventListener('click', () => {
      barcodeSection.classList.remove('hidden');
      qrSection.classList.add('hidden');
      btnTabBarcode1D.className = 'py-1.5 rounded-lg bg-white text-navy shadow-xs transition flex items-center justify-center gap-1.5';
      btnTabBarcodeQR.className = 'py-1.5 rounded-lg hover:text-navy transition flex items-center justify-center gap-1.5 text-slate-500';
    });

    btnTabBarcodeQR.addEventListener('click', () => {
      qrSection.classList.remove('hidden');
      barcodeSection.classList.add('hidden');
      btnTabBarcodeQR.className = 'py-1.5 rounded-lg bg-white text-navy shadow-xs transition flex items-center justify-center gap-1.5';
      btnTabBarcode1D.className = 'py-1.5 rounded-lg hover:text-navy transition flex items-center justify-center gap-1.5 text-slate-500';
    });
  }

  // Tombol Salin Kode Tiket ke Clipboard
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

  // Tombol Unduh Tiket Gambar (PNG)
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!currentTicketData) {
        showToast('Data tiket belum siap.', 'warning');
        return;
      }
      exportTicketAsPng(currentTicketData);
    });
  }
}

/**
 * Menampilkan modal tiket sukses prapinjam dengan Barcode 1D (Code 128) & QR Code 2D
 */
export function showTicketSuccessModal(data) {
  currentTicketData = data;
  const modal = document.getElementById('modalTicketSuccess');
  const content = document.getElementById('modalTicketSuccessContent');
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

  // 1. Render Barcode 1D (Code 128) dengan JsBarcode
  const barcodeSvg = document.getElementById('ticketBarcodeSvg');
  if (barcodeSvg && window.JsBarcode) {
    try {
      barcodeSvg.innerHTML = '';
      window.JsBarcode('#ticketBarcodeSvg', data.id, {
        format: 'CODE128',
        lineColor: '#000836',
        width: 2.2,
        height: 65,
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        textMargin: 6,
        margin: 8,
        background: '#ffffff'
      });
    } catch (err) {
      console.error('Gagal render JsBarcode:', err);
    }
  }

  // 2. Render QR Code 2D dengan QRCode.js
  const qrContainer = document.getElementById('ticketQrContainer');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    new window.QRCode(qrContainer, {
      text: data.id,
      width: 130,
      height: 130,
      colorDark: '#000836',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }

  // Reset tampilan ke tab Barcode 1D
  const btnTabBarcode1D = document.getElementById('btnTabBarcode1D');
  if (btnTabBarcode1D) btnTabBarcode1D.click();

  showModal(modal, content);
}

// Buka akses global agar dapat dipanggil dari modul lain
window.showTicketSuccessModal = showTicketSuccessModal;

/**
 * Mengekspor tiket pra-pinjam sebagai gambar PNG beresolusi tajam
 */
function exportTicketAsPng(data) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 460;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background kartu putih bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 460, 620);

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
      ctx.roundRect(24, 104, 412, 480, 16);
    } else {
      ctx.rect(24, 104, 412, 480);
    }
    ctx.fill();
    ctx.stroke();

    // Kode Tiket Heading
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KODE TIKET PEMINJAMAN', 230, 132);

    ctx.fillStyle = '#000C4F';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(data.id, 230, 160);

    // Render Barcode ke Offscreen Canvas untuk digambar ke gambar PNG
    if (window.JsBarcode) {
      try {
        const offCanvas = document.createElement('canvas');
        window.JsBarcode(offCanvas, data.id, {
          format: 'CODE128',
          lineColor: '#000C4F',
          width: 2.2,
          height: 65,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          textMargin: 6,
          margin: 10,
          background: '#ffffff'
        });
        const bcW = Math.min(offCanvas.width, 350);
        const bcH = (offCanvas.height * bcW) / offCanvas.width;
        ctx.drawImage(offCanvas, (460 - bcW) / 2, 178, bcW, bcH);
      } catch (err) {
        console.error('Error drawing barcode to export canvas:', err);
      }
    }

    // Garis putus-putus
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, 305);
    ctx.lineTo(416, 305);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data Peminjaman
    ctx.textAlign = 'left';
    const startY = 340;
    const lineHeight = 30;

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

    // 4. Batas Pengambilan
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Batas Ambil:', 48, startY + (lineHeight * 3));
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(data.tempo || '-', 164, startY + (lineHeight * 3));

    // Note Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('*Tunjukkan tiket ini kepada petugas sirkulasi untuk scan barcode', 230, 520);
    ctx.fillText('Status: Menunggu Pengambilan di Perpustakaan', 230, 540);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Tiket-Prapinjam-${data.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Tiket ${data.id} berhasil diunduh sebagai gambar PNG!`, 'success');
  } catch (err) {
    console.error('Gagal export tiket PNG:', err);
    showToast('Gagal mengunduh gambar tiket: ' + err.message, 'error');
  }
}

/**
 * Setup modal detail lengkap buku
 */
export function setupDetailModal() {
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
        openBookingModal(id);
      }
    });
  }
}

/**
 * Membuka jendela pop-up detail buku
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

  if (bookBtn) {
    bookBtn.disabled = stok <= 0;
    if (stok <= 0) {
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed';
      bookBtn.textContent = 'Stok Buku Habis';
    } else {
      bookBtn.className = 'w-full py-2.5 rounded-xl bg-navy text-white font-bold text-xs hover:bg-navy-light transition shadow-sm';
      bookBtn.innerHTML = '<i class="ph ph-bookmark-simple"></i> Ajukan Pra-Pinjam Buku Ini';
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

/**
 * Pengecekan otomatis parameter URL: ?action=pinjam&buku_id=BK-xxx
 * (Sesuai spesifikasi PRD.md Section 6.A)
 */
export function checkUrlRedirectBooking() {
  if (typeof window === 'undefined' || !window.location) return;
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const bukuId = params.get('buku_id');

  if (action === 'pinjam' && bukuId) {
    // Beri jeda kecil agar data buku selesai termuat
    setTimeout(() => {
      openBookingModal(bukuId);
      // Bersihkan parameter URL agar tidak memicu pop-up saat di-refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 600);
  }
}

// Daftarkan ke window agar bisa dipanggil dari inline HTML onclick
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
  window.openDetailModal = openDetailModal;
}
