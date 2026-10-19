/**
 * CAKRAWALA Digital Library - Modul Meja Pengembalian: Struk Resmi & Cetak Bukti
 * File: public/petugas/modules/3-pengembalian/modalStruk.js
 * 
 * FUNGSI:
 * - Menampilkan pop-up dialog struk bukti pengembalian buku (#modalReceipt)
 * - Menangani tombol tutup dan cetak struk (window.print())
 */

import { showModal, hideModal } from '../../core/petugasHelper.js';

let isReceiptModalSetup = false;

/**
 * Menyiapkan interaksi pada modal struk pengembalian
 */
export function setupReceiptModal() {
  if (isReceiptModalSetup) return;
  isReceiptModalSetup = true;

  const modalReceipt = document.getElementById('modalReceipt');
  const modalContent = document.getElementById('modalReceiptContent');
  const btnCloseReceipt = document.getElementById('btnCloseReceipt');
  const btnPrintReceipt = document.getElementById('btnPrintReceipt');

  function closeReceipt() {
    hideModal(modalReceipt, modalContent);
  }

  if (btnCloseReceipt) btnCloseReceipt.addEventListener('click', closeReceipt);
  if (modalReceipt) {
    modalReceipt.addEventListener('click', e => {
      if (e.target === modalReceipt) closeReceipt();
    });
  }

  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', () => {
      printReceipt();
    });
  }
}

/**
 * Fungsi cetak struk pengembalian buku
 */
export function printReceipt() {
  window.print();
}

/**
 * Menampilkan modal pop-up tanda terima pengembalian buku
 */
export function showReceiptModal(data) {
  const modalReceipt = document.getElementById('modalReceipt');
  const modalContent = document.getElementById('modalReceiptContent');
  if (!modalReceipt) return;

  const receiptId = document.getElementById('receiptId');
  const receiptStudent = document.getElementById('receiptStudent');
  const receiptBook = document.getElementById('receiptBook');
  const receiptCondition = document.getElementById('receiptCondition');
  const receiptOverdue = document.getElementById('receiptOverdue');
  const receiptFine = document.getElementById('receiptFine');
  const receiptFineStatus = document.getElementById('receiptFineStatus');

  if (receiptId) receiptId.textContent = data.id || '-';
  if (receiptStudent) receiptStudent.textContent = data.siswa || '-';
  if (receiptBook) receiptBook.textContent = data.buku || '-';
  if (receiptCondition) receiptCondition.textContent = data.kondisi || 'Baik';
  if (receiptOverdue) receiptOverdue.textContent = data.overdue || '0 Hari';
  if (receiptFine) receiptFine.textContent = data.fine || 'Rp 0';
  if (receiptFineStatus) receiptFineStatus.textContent = data.fineStatus || 'Tidak Ada';

  showModal(modalReceipt, modalContent);
}

// Buka akses global
if (typeof window !== 'undefined') {
  window.showReceiptModal = showReceiptModal;
  window.printReceipt = printReceipt;
}
