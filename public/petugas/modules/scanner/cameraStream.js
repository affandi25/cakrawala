/**
 * CAKRAWALA Digital Library - Modul Live Streaming Kamera Pemindai (Dual Engine)
 * File: public/petugas/modules/scanner/cameraStream.js
 * 
 * FUNGSI:
 * - Menghubungkan webcam laptop / kamera HP ke viewfinder modal
 * - Dual Engine: Html5Qrcode untuk streaming kamera, jsQR untuk real-time 60fps loop
 * - Fallback cerdas: jika kamera environment (belakang) gagal, otomatis switch ke user (webcam)
 */

import { showModal, hideModal, showToast } from '../petugasHelper.js';
import { handleCameraScanSuccess } from './scanRouter.js';

let html5QrScannerInstance = null;
let isCameraScanning = false;
let activeScanContextMode = 'walkin';
let jsQrVideoTimer = null;

export function getActiveScanContextMode() {
  return activeScanContextMode;
}

export function setActiveScanContextMode(mode) {
  activeScanContextMode = mode;
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
