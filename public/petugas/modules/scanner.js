/**
 * CAKRAWALA Digital Library - Modul Pemindai Kamera & File Barcode / QR (Dual Engine)
 * File: public/petugas/modules/scanner.js
 * 
 * FUNGSI:
 * - Mengakses webcam laptop / kamera HP untuk membaca barcode/QR secara live
 * - Dual Engine: Html5Qrcode untuk streaming kamera, jsQR untuk pemindaian 60fps
 * - Mendukung upload file gambar barcode/QR statis dengan auto Quiet-Zone padding (40px)
 * - Memicu suara kasir 'BEEP!' saat barcode terbaca
 * - Otomatis mencocokkan hasil scan ke: Tiket Booking, Kode Buku, atau Kartu Anggota (Siswa & Guru)
 */

import { state } from './state.js';
import { showModal, hideModal, showToast } from './utils.js';
import {
  setMejaSelectedBuku,
  switchSirkulasiSubtab,
  selectMember,
  renderPrapinjamOnlyTable
} from './sirkulasi.js';

let html5QrScannerInstance = null;
let isCameraScanning = false;
let activeScanContextMode = 'walkin';
let jsQrVideoTimer = null;

/**
 * Menghasilkan bunyi "BEEP!" frekuensi 880Hz saat barcode sukses dibaca
 */
export function playScanBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // Abaikan jika browser membatasi audio autoplay
  }
}

/**
 * Menyiapkan tombol modal kamera scanner & upload file
 */
export function setupCameraScannerModule() {
  const modal = document.getElementById('modalCameraScanner');
  const content = document.getElementById('modalCameraScannerContent');
  const closeBtn = document.getElementById('btnCloseCameraScanner');
  const cancelBtn = document.getElementById('btnCancelCameraScanner');
  const btnOpenWalkIn = document.getElementById('btnOpenScannerCamera');
  const btnOpenPrapinjam = document.getElementById('btnScanCameraPrapinjam');
  const fileInput = document.getElementById('inputScanImageFile');
  const btnUploadScan = document.getElementById('btnUploadScanImage');

  if (closeBtn) closeBtn.addEventListener('click', stopAndCloseCameraScanner);
  if (cancelBtn) cancelBtn.addEventListener('click', stopAndCloseCameraScanner);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) stopAndCloseCameraScanner();
    });
  }

  if (btnOpenWalkIn) {
    btnOpenWalkIn.addEventListener('click', () => {
      startLiveCameraScanner('walkin');
    });
  }

  if (btnOpenPrapinjam) {
    btnOpenPrapinjam.addEventListener('click', () => {
      startLiveCameraScanner('prapinjam');
    });
  }

  if (btnUploadScan && fileInput) {
    btnUploadScan.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        showToast('Membaca Barcode dari file gambar...', 'info');
        const decodedText = await decodeQrFromFile(file);
        if (decodedText) {
          handleCameraScanSuccess(decodedText, activeScanContextMode);
        } else {
          throw new Error('Barcode tidak ditemukan');
        }
      } catch (err) {
        console.error('Gagal scan file gambar barcode:', err);
        showToast('Barcode/QR tidak terdeteksi pada file tersebut. Pastikan file berisi gambar QR yang jelas.', 'error');
      } finally {
        fileInput.value = '';
      }
    });
  }
}

/**
 * Membaca kode QR dari file gambar statis dengan padding Quiet Zone 40px
 */
export async function decodeQrFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const pad = 40;
          const canvas = document.createElement('canvas');
          canvas.width = img.width + (pad * 2);
          canvas.height = img.height + (pad * 2);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, pad, pad);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (window.jsQR) {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (code && code.data) {
              return resolve(code.data);
            }

            const rawCanvas = document.createElement('canvas');
            rawCanvas.width = img.width;
            rawCanvas.height = img.height;
            const rawCtx = rawCanvas.getContext('2d');
            rawCtx.drawImage(img, 0, 0);
            const rawData = rawCtx.getImageData(0, 0, img.width, img.height);
            const rawCode = window.jsQR(rawData.data, rawData.width, rawData.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (rawCode && rawCode.data) {
              return resolve(rawCode.data);
            }
          }

          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
            detector.detect(canvas).then(barcodes => {
              if (barcodes && barcodes.length > 0) {
                return resolve(barcodes[0].rawValue);
              }
              fallbackHtml5Qrcode();
            }).catch(() => {
              fallbackHtml5Qrcode();
            });
            return;
          }

          fallbackHtml5Qrcode();

          function fallbackHtml5Qrcode() {
            if (window.Html5Qrcode) {
              if (!html5QrScannerInstance) {
                html5QrScannerInstance = new window.Html5Qrcode('cameraScannerTarget');
              }
              html5QrScannerInstance.scanFile(file, true)
                .then(text => resolve(text))
                .catch(() => reject(new Error('Barcode tidak terdeteksi')));
            } else {
              reject(new Error('Barcode tidak terdeteksi'));
            }
          }
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Menyalakan live camera scanner
 */
export async function startLiveCameraScanner(contextMode = 'walkin') {
  activeScanContextMode = contextMode;
  const modal = document.getElementById('modalCameraScanner');
  const content = document.getElementById('modalCameraScannerContent');
  const placeholder = document.getElementById('cameraLoadingPlaceholder');
  const statusText = document.getElementById('cameraStatusText');

  if (!window.Html5Qrcode) {
    showToast('Pustaka kamera scanner gagal dimuat. Periksa koneksi internet.', 'error');
    return;
  }

  showModal(modal, content);
  if (placeholder) placeholder.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Memulai kamera...';

  try {
    if (html5QrScannerInstance && isCameraScanning) {
      await stopAndCloseCameraScanner();
    }

    html5QrScannerInstance = new window.Html5Qrcode('cameraScannerTarget');

    const config = {
      fps: 20,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(edge * 0.85),
          height: Math.floor(edge * 0.85)
        };
      },
      aspectRatio: 1.0
    };

    await html5QrScannerInstance.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        handleCameraScanSuccess(decodedText, contextMode);
      },
      () => {}
    );

    isCameraScanning = true;
    if (placeholder) placeholder.classList.add('hidden');
    if (statusText) statusText.textContent = 'Kamera Aktif';
    startJsQrVideoScanLoop();
  } catch (err) {
    console.warn('Gagal dengan kamera environment, coba kamera depan/webcam...', err);
    try {
      await html5QrScannerInstance.start(
        { facingMode: 'user' },
        { 
          fps: 20, 
          qrbox: (w, h) => {
            const edge = Math.min(w, h);
            return { width: Math.floor(edge * 0.85), height: Math.floor(edge * 0.85) };
          }, 
          aspectRatio: 1.0 
        },
        (decodedText) => {
          handleCameraScanSuccess(decodedText, contextMode);
        },
        () => {}
      );
      isCameraScanning = true;
      if (placeholder) placeholder.classList.add('hidden');
      if (statusText) statusText.textContent = 'Webcam Laptop Aktif';
      startJsQrVideoScanLoop();
    } catch (err2) {
      console.error('Kamera tidak dapat diakses:', err2);
      showToast('Izin kamera ditolak. Anda tetap dapat menggunakan tombol "Pilih File Gambar" di bawah.', 'warning');
      if (placeholder) placeholder.classList.add('hidden');
      if (statusText) statusText.textContent = 'Kamera Tidak Tersedia';
    }
  }
}

/**
 * Loop pembacaan frame video langsung menggunakan jsQR
 */
export function startJsQrVideoScanLoop() {
  if (jsQrVideoTimer) {
    cancelAnimationFrame(jsQrVideoTimer);
    jsQrVideoTimer = null;
  }

  const videoEl = document.querySelector('#cameraScannerTarget video');
  if (!videoEl || !window.jsQR) return;

  const frameCanvas = document.createElement('canvas');
  const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });

  function tick() {
    if (!isCameraScanning) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      frameCanvas.width = videoEl.videoWidth;
      frameCanvas.height = videoEl.videoHeight;
      frameCtx.drawImage(videoEl, 0, 0, frameCanvas.width, frameCanvas.height);
      const imgData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);

      const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data) {
        handleCameraScanSuccess(code.data, activeScanContextMode);
        return;
      }
    }
    jsQrVideoTimer = requestAnimationFrame(tick);
  }

  jsQrVideoTimer = requestAnimationFrame(tick);
}

/**
 * Mematikan stream kamera dan menutup modal
 */
export async function stopAndCloseCameraScanner() {
  const modal = document.getElementById('modalCameraScanner');
  const content = document.getElementById('modalCameraScannerContent');

  if (jsQrVideoTimer) {
    cancelAnimationFrame(jsQrVideoTimer);
    jsQrVideoTimer = null;
  }

  if (html5QrScannerInstance && isCameraScanning) {
    try {
      await html5QrScannerInstance.stop();
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
    isCameraScanning = false;
  }

  hideModal(modal, content);
}

/**
 * Memproses hasil pembacaan barcode/QR yang sukses
 */
export function handleCameraScanSuccess(decodedText, contextMode) {
  const text = (decodedText || '').trim();
  if (!text) return;

  playScanBeep();
  stopAndCloseCameraScanner();

  const upperText = text.toUpperCase();

  // 1. Cek ID Booking Prapinjam
  const pendingBooking = state.cache.peminjaman.find(p => 
    p.status === 'Menunggu' && p.id_peminjaman && (
      p.id_peminjaman.toUpperCase() === upperText ||
      upperText.includes(p.id_peminjaman.toUpperCase())
    )
  );

  if (pendingBooking) {
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('prapinjam');
    showToast(`Tiket Booking [${pendingBooking.id_peminjaman}] terverifikasi! Detail pesanan siap diserahkan.`, 'success');
    const searchPrapinjam = document.getElementById('inputSearchPrapinjam');
    if (searchPrapinjam) {
      searchPrapinjam.value = pendingBooking.id_peminjaman;
      state.searchPrapinjamQuery = pendingBooking.id_peminjaman.toLowerCase();
      renderPrapinjamOnlyTable();
    }
    return;
  }

  // 2. Cek Barcode / QR Stiker Buku Fisik
  const book = state.cache.buku.find(b => 
    (b.id_buku && b.id_buku.toUpperCase() === upperText) || 
    (b.kode_qr && b.kode_qr.toUpperCase() === upperText) ||
    (b.id_buku && upperText.includes(b.id_buku.toUpperCase())) ||
    (b.kode_qr && upperText.includes(b.kode_qr.toUpperCase()))
  );

  if (book) {
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('walkin');
    setMejaSelectedBuku(book);
    showToast(`Buku "${book.judul_buku}" berhasil dipindai! Detail buku langsung ditampilkan di meja peminjaman.`, 'success');
    return;
  }

  // 3. Cek Barcode / QR Kartu Anggota (Siswa atau Guru)
  const matchedSiswa = (state.cache.siswa || []).find(s => s.nisn_siswa && (s.nisn_siswa.toUpperCase() === upperText || upperText.includes(s.nisn_siswa.toUpperCase())));
  const matchedGuru = !matchedSiswa && (state.cache.guru || []).find(g => g.nip_guru && (g.nip_guru.toUpperCase() === upperText || upperText.includes(g.nip_guru.toUpperCase())));

  if (matchedSiswa) {
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('walkin');
    selectMember({
      type: 'siswa',
      id: matchedSiswa.nisn_siswa,
      nama: matchedSiswa.nama_siswa,
      detail: `NISN: ${matchedSiswa.nisn_siswa} &bull; Kelas ${matchedSiswa.kelas || '-'}`,
      badge: 'Siswa'
    });
    showToast(`Kartu Siswa [${matchedSiswa.nama_siswa}] berhasil dipindai dan terpilih!`, 'success');
    return;
  }

  if (matchedGuru) {
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('walkin');
    selectMember({
      type: 'guru',
      id: matchedGuru.nip_guru,
      nama: matchedGuru.nama_guru,
      detail: `NIP: ${matchedGuru.nip_guru} &bull; ${matchedGuru.mata_pelajaran || 'Pengajar'}`,
      badge: 'Guru'
    });
    showToast(`Kartu Guru [${matchedGuru.nama_guru}] berhasil dipindai dan terpilih!`, 'success');
    return;
  }

  // 4. Default: Masukkan ke input barcode di Walk-In Desk
  if (window.switchTab) window.switchTab('sirkulasi');
  switchSirkulasiSubtab('walkin');
  const barcodeInput = document.getElementById('inputMejaBarcode');
  if (barcodeInput) {
    barcodeInput.value = text;
    barcodeInput.dispatchEvent(new Event('input'));
  }
  showToast(`Hasil scan: ${text}`, 'info');
}
