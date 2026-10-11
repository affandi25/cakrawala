/**
 * CAKRAWALA Digital Library - Modul Tiket Bukti Booking Pra-Pinjam
 * File: public/siswa-guru/modules/katalog/modalTiket.js
 * 
 * Tanggung Jawab:
 * - Menampilkan pop-up modal bukti tiket booking pra-pinjam
 * - Menghasilkan Barcode 1D (Code 128) via JsBarcode
 * - Menghasilkan QR Code 2D via QRCode.js
 * - Menyalin kode tiket ke clipboard
 * - Mengekspor & mengunduh gambar tiket berkualitas tinggi (PNG) via Canvas
 */

import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../siswaHelper.js';

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
 * @param {object} data Data tiket ({ id, buku, rak, tempo, peminjam, nisn })
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

/**
 * Mengekspor tiket pra-pinjam sebagai gambar PNG beresolusi tajam
 * @param {object} data Data tiket yang sedang aktif
 */
export function exportTicketAsPng(data) {
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

// Buka akses global
if (typeof window !== 'undefined') {
  window.showTicketSuccessModal = showTicketSuccessModal;
}
