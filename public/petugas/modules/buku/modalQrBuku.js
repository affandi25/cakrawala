/**
 * CAKRAWALA Digital Library - Modul Stiker & Cetak QR Code Buku
 * File: public/petugas/modules/buku/modalQrBuku.js
 * 
 * FUNGSI:
 * - Menampilkan dialog pratinjau QR Code buku (#modalQrCode)
 * - Render QR Code interaktif menggunakan QRCode.js
 * - Fitur cetak langsung (window.print) untuk label stiker fisik
 * - Generator unduh gambar PNG dengan bingkai label resmi perpustakaan
 */

import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../petugasHelper.js';

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
