/**
 * CAKRAWALA Digital Library - Modul Tiket Bukti Booking Pra-Pinjam
 * File: public/siswa-guru/modules/prapinjam/modalTiket.js
 * 
 * Tanggung Jawab:
 * - Menampilkan pop-up modal bukti tiket booking pra-pinjam
 * - Menghasilkan QR Code 2D resmi via QRCode.js
 * - Menyalin kode tiket ke clipboard
 * - Mengekspor & mengunduh gambar tiket berkualitas tinggi (PNG) via Canvas
 */

import { state } from '../state.js';
import { showModal, hideModal, showToast } from '../siswaHelper.js';

let currentTicketData = null;

let isTicketModalSetup = false;

/**
 * Menyiapkan interaksi pada modal tiket booking (Salin, Unduh PNG)
 */
export function setupTicketModalElements() {
  if (isTicketModalSetup) return;
  isTicketModalSetup = true;

  const modalTicket = document.getElementById('modalTicketSuccess');
  const contentTicket = document.getElementById('modalTicketSuccessContent');
  const btnCloseTicket = document.getElementById('btnCloseTicketModal');
  const btnCloseTicketX = document.getElementById('btnCloseTicketModalX');
  const btnCopy = document.getElementById('btnCopyTicketCode');
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
 * Menampilkan modal tiket sukses prapinjam dengan QR Code 2D
 * @param {object} data Data tiket ({ id, buku, rak, tempo, peminjam, nisn, statusPersiapan })
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

  // Update Status Badge Tiket
  const statusBadge = document.getElementById('ticketStatusBadge');
  if (statusBadge) {
    if (data.statusPersiapan === 'Siap Diambil') {
      statusBadge.className = 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200';
      statusBadge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span><span>Siap di Meja</span>';
    } else {
      statusBadge.className = 'inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200';
      statusBadge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Menunggu Penyiapan</span>';
    }
  }

  // Render QR Code 2D dengan QRCode.js
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

  showModal(modal, content);
}

/**
 * Mengekspor tiket pra-pinjam sebagai gambar PNG beresolusi tajam dengan QR Code 2D
 * @param {object} data Data tiket yang sedang aktif
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

    // Box Putih untuk Quiet Zone QR Code
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

        // QRCode.js bisa menghasilkan <canvas> atau <img>
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

    // Kode Tiket Heading & Teks
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

// Buka akses global
if (typeof window !== 'undefined') {
  window.showTicketSuccessModal = showTicketSuccessModal;
}
