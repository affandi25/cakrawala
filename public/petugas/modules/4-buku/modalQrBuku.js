/**
 * CAKRAWALA Digital Library - Modul Stiker & Cetak QR Code Buku
 * File: public/petugas/modules/4-buku/modalQrBuku.js
 * 
 * FUNGSI:
 * - Menampilkan dialog pratinjau QR Code buku (#modalQrCode)
 * - Render QR Code interaktif menggunakan QRCode.js
 * - Fitur cetak langsung (window.print) untuk label stiker fisik
 * - Generator unduh gambar PNG dengan bingkai label resmi perpustakaan
 */

import { state } from '../core/state.js';
import { showModal, hideModal, showToast } from '../core/petugasHelper.js';

let isQrModalSetup = false;

/**
 * Setup modal preview dan cetak/unduh label QR stiker buku
 */
export function setupQrCodeModal() {
  if (isQrModalSetup) return;
  isQrModalSetup = true;

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
      printQrLabel();
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadQrPng();
    });
  }
}

/**
 * Fungsi print label stiker fisik
 */
export function printQrLabel() {
  window.print();
}

/**
 * Fungsi download stiker label dalam format PNG
 */
export function downloadQrPng() {
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
}

/**
 * Menampilkan kode QR buku pada modal
 */
export function openQrCodeModal(bookId) {
  const modal = document.getElementById('modalQrCode');
  const content = document.getElementById('modalQrContent');
  const book = (state.cache.buku || []).find(b => b.id_buku === bookId);
  if (!book) return;

  state.currentQrBook = book;

  const idEl = document.getElementById('qrModalBookId');
  const titleEl = document.getElementById('qrModalBookTitle');
  const authorEl = document.getElementById('qrModalBookAuthor');
  const catEl = document.getElementById('qrModalCategory');
  const shelfEl = document.getElementById('qrModalShelf');
  const qrContainer = document.getElementById('qrcodeCanvasContainer');

  const kategori = (state.cache.kategori || []).find(k => k.id_kategori === book.id_kategori);

  if (idEl) idEl.textContent = book.id_buku;
  if (titleEl) titleEl.textContent = book.judul_buku;
  if (authorEl) authorEl.textContent = `${book.penulis} (${book.tahun_terbit})`;
  if (catEl) catEl.textContent = kategori ? kategori.nama_kategori : 'Koleksi Umum';
  if (shelfEl) shelfEl.textContent = book.keterangan || 'Rak Umum';

  if (qrContainer) {
    qrContainer.innerHTML = '';
    const qrText = book.kode_qr || book.id_buku;

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(qrContainer, {
          text: qrText,
          width: 150,
          height: 150,
          colorDark: '#000C4F',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
        });
      } catch (err) {
        console.error('Gagal merender QRCode:', err);
        qrContainer.innerHTML = `<p class="text-xs text-rose-500 font-bold p-4">Gagal generate QR Code</p>`;
      }
    } else {
      qrContainer.innerHTML = `<div class="p-4 text-xs font-mono text-navy font-bold">${qrText}</div>`;
    }
  }

  showModal(modal, content);
}

// Window bindings
if (typeof window !== 'undefined') {
  window.openQrCodeModal = openQrCodeModal;
  window.setupQrCodeModal = setupQrCodeModal;
  window.printQrLabel = printQrLabel;
  window.downloadQrPng = downloadQrPng;
}
