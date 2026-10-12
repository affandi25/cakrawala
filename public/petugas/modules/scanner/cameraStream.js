/**
 * CAKRAWALA Digital Library - Modul Live Streaming Kamera Pemindai (Dual Engine)
 * File: public/petugas/modules/scanner/cameraStream.js
 * 
 * FUNGSI:
 * - Menghubungkan webcam laptop / kamera HP ke viewfinder modal
 * - Dual Engine: Html5Qrcode untuk streaming kamera, jsQR untuk real-time frame scanning loop
 * - Kamera Switcher: Berganti kamera depan (user) dan belakang (environment) secara mulus
 * - Senter / Torch Toggle (jika didukung perangkat keras)
 * - Safe Lifecycle: Penghentian stream kamera tuntas tanpa kebocoran memori (memory leak)
 *   dan menjamin lampu indikator kamera laptop/HP langsung mati.
 */

import { showModal, hideModal, showToast } from '../core/petugasHelper.js';
import { handleCameraScanSuccess } from './scanRouter.js';

let html5QrScannerInstance = null;
let isCameraScanning = false;
let activeScanContextMode = 'walkin';
let jsQrVideoTimer = null;
let currentFacingMode = 'environment'; // 'environment' | 'user'
let isTorchOn = false;
let currentActiveMediaStream = null;

export function getActiveScanContextMode() {
  return activeScanContextMode;
}

export function setActiveScanContextMode(mode) {
  activeScanContextMode = mode;
}

export function isScannerRunning() {
  return isCameraScanning;
}

/**
 * Menyalakan live camera scanner
 * @param {string} contextMode - 'walkin' | 'prapinjam' | 'pengembalian' | 'inventaris'
 */
export async function startLiveCameraScanner(contextMode = 'walkin') {
  activeScanContextMode = contextMode;
  const modal = document.getElementById('modalCameraScanner');
  const content = document.getElementById('modalCameraScannerContent');
  const placeholder = document.getElementById('cameraLoadingPlaceholder');
  const statusText = document.getElementById('cameraStatusText');
  const sensorDot = document.getElementById('cameraSensorDot');
  const sensorLabel = document.getElementById('cameraSensorLabel');

  // Pastikan tab "Kamera Langsung" aktif di modal
  if (window.switchScannerModalTab) {
    window.switchScannerModalTab('camera');
  }

  if (!window.Html5Qrcode) {
    showToast('Pustaka kamera scanner gagal dimuat. Periksa koneksi internet.', 'error');
    return;
  }

  showModal(modal, content);
  if (placeholder) placeholder.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Memulai kamera...';
  if (sensorDot) {
    sensorDot.classList.remove('bg-emerald-500', 'bg-rose-500');
    sensorDot.classList.add('bg-amber-500', 'animate-pulse');
  }
  if (sensorLabel) sensorLabel.textContent = 'Menghubungkan sensor optik...';

  try {
    // Bersihkan sesi kamera sebelumnya secara tuntas jika ada
    await stopCamera();

    html5QrScannerInstance = new window.Html5Qrcode('cameraScannerTarget');

    const config = {
      fps: 25,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(edge * 0.85),
          height: Math.floor(edge * 0.85)
        };
      },
      aspectRatio: 1.0
    };

    const onScanSuccessCallback = (decodedText) => {
      handleCameraScanSuccess(decodedText, activeScanContextMode);
    };

    // Coba mulai dengan facing mode yang diinginkan
    try {
      await html5QrScannerInstance.start(
        { facingMode: currentFacingMode },
        config,
        onScanSuccessCallback,
        () => {}
      );
    } catch (errFacing) {
      // Fallback: Jika 'environment' gagal, beralih ke 'user' (atau sebaliknya)
      currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      await html5QrScannerInstance.start(
        { facingMode: currentFacingMode },
        config,
        onScanSuccessCallback,
        () => {}
      );
    }

    isCameraScanning = true;

    // Simpan referensi native MediaStream dari elemen video yang dibuat Html5Qrcode
    const videoEl = document.querySelector('#cameraScannerTarget video');
    if (videoEl && videoEl.srcObject) {
      currentActiveMediaStream = videoEl.srcObject;
    }

    if (placeholder) placeholder.classList.add('hidden');
    if (statusText) {
      statusText.textContent = currentFacingMode === 'environment' ? 'Kamera Belakang' : 'Webcam Depan';
    }
    if (sensorDot) {
      sensorDot.classList.remove('bg-amber-500', 'bg-rose-500');
      sensorDot.classList.add('bg-emerald-500', 'animate-pulse');
    }
    if (sensorLabel) sensorLabel.textContent = 'Sensor aktif mendeteksi kode...';

    // Nyalakan loop jsQR untuk mendeteksi QR code berkecepatan tinggi jika engine jsQR tersedia
    startJsQrVideoScanLoop();
  } catch (err) {
    console.error('Kamera tidak dapat diakses:', err);
    showToast('Izin kamera ditolak atau perangkat tidak mendukung. Anda dapat menggunakan tab "Unggah Gambar".', 'warning');
    if (placeholder) placeholder.classList.add('hidden');
    if (statusText) statusText.textContent = 'Kamera Tidak Tersedia';
    if (sensorDot) {
      sensorDot.classList.remove('bg-amber-500', 'bg-emerald-500');
      sensorDot.classList.add('bg-rose-500');
    }
    if (sensorLabel) sensorLabel.textContent = 'Sensor optik mati (izin ditolak)';
    await stopCamera();
  }
}

/**
 * Berganti antara kamera depan dan kamera belakang
 */
export async function switchCameraFacingMode() {
  if (!isCameraScanning) return;
  showToast('Mengalihkan kamera...', 'info');
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  await startLiveCameraScanner(activeScanContextMode);
}

/**
 * Nyalakan atau matikan lampu kilat / torch
 */
export async function toggleScannerTorch() {
  if (!isCameraScanning || !html5QrScannerInstance) {
    showToast('Kamera belum aktif.', 'warning');
    return;
  }

  try {
    const videoEl = document.querySelector('#cameraScannerTarget video');
    if (videoEl && videoEl.srcObject) {
      const track = videoEl.srcObject.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      if (capabilities.torch) {
        isTorchOn = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: isTorchOn }]
        });
        showToast(isTorchOn ? 'Lampu kilat dinyalakan' : 'Lampu kilat dimatikan', 'info');
        return;
      }
    }
    showToast('Lampu senter/flash tidak didukung pada kamera ini.', 'warning');
  } catch (err) {
    console.warn('Gagal mengontrol lampu kilat:', err);
    showToast('Lampu kilat tidak dapat dinyalakan.', 'warning');
  }
}

/**
 * Loop pembacaan frame video langsung menggunakan jsQR untuk akurasi super tinggi
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

      if (code && code.data && code.data.trim()) {
        handleCameraScanSuccess(code.data.trim(), activeScanContextMode);
        return;
      }
    }
    jsQrVideoTimer = requestAnimationFrame(tick);
  }

  jsQrVideoTimer = requestAnimationFrame(tick);
}

/**
 * Pembersihan tuntas seluruh stream kamera (Html5Qrcode + native WebRTC tracks)
 * Memastikan lampu indikator kamera laptop/HP langsung mati seketika tanpa memory leak.
 */
export async function stopCamera() {
  // 1. Hentikan loop animasi requestAnimationFrame
  if (jsQrVideoTimer) {
    cancelAnimationFrame(jsQrVideoTimer);
    jsQrVideoTimer = null;
  }

  // 2. Matikan seluruh native WebRTC MediaStreamTrack secara eksplisit (Paling penting untuk mematikan lampu webcam)
  if (currentActiveMediaStream && typeof currentActiveMediaStream.getTracks === 'function') {
    try {
      currentActiveMediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
    } catch (e) {}
    currentActiveMediaStream = null;
  }

  // 3. Cari dan hentikan semua MediaStream dari elemen <video> di dalam DOM
  try {
    const targetEl = document.getElementById('cameraScannerTarget');
    if (targetEl) {
      const videos = targetEl.querySelectorAll('video');
      videos.forEach(video => {
        if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
          video.srcObject.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {}
          });
          video.srcObject = null;
        }
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
      });
      // Bersihkan isi container target agar tidak ada elemen dangling
      targetEl.innerHTML = '';
    }
  } catch (e) {
    console.debug('Pembersihan elemen video DOM:', e);
  }

  // 4. Hentikan instance Html5Qrcode dengan penanganan try-catch aman
  if (html5QrScannerInstance) {
    try {
      // Periksa apakah scanner masih dalam status running sebelum memanggil stop()
      if (isCameraScanning) {
        await html5QrScannerInstance.stop().catch(err => {
          // Tangani secara tenang jika scanner sudah terhenti
          console.debug('Catatan aman html5QrScannerInstance.stop():', err);
        });
      }
    } catch (err) {
      console.debug('Error stopping html5QrScannerInstance:', err);
    }

    try {
      html5QrScannerInstance.clear();
    } catch (e) {}

    html5QrScannerInstance = null;
  }

  // 5. Reset semua variabel state internal
  isCameraScanning = false;
  isTorchOn = false;

  // 6. Reset indikator visual di UI jika elemen tersedia
  const statusText = document.getElementById('cameraStatusText');
  const sensorDot = document.getElementById('cameraSensorDot');
  const sensorLabel = document.getElementById('cameraSensorLabel');
  if (statusText) statusText.textContent = 'Mati';
  if (sensorDot) {
    sensorDot.classList.remove('bg-emerald-500', 'bg-amber-500');
    sensorDot.classList.add('bg-slate-400');
  }
  if (sensorLabel) sensorLabel.textContent = 'Kamera tidak aktif';
}

/**
 * Alias untuk stopCamera (kompatibilitas kode lama)
 */
export async function stopCameraHardwareStream() {
  return await stopCamera();
}

/**
 * Mematikan stream kamera dan menutup dialog modal secara tuntas
 */
export async function stopAndCloseCameraScanner() {
  const modal = document.getElementById('modalCameraScanner');
  const content = document.getElementById('modalCameraScannerContent');

  // Matikan hardware kamera terlebih dahulu
  await stopCamera();

  // Sembunyikan dialog modal
  hideModal(modal, content);
}

// Bindings ke objek window untuk aksesibilitas global
if (typeof window !== 'undefined') {
  window.stopCamera = stopCamera;
  window.stopCameraHardwareStream = stopCamera;
  window.startLiveCameraScanner = startLiveCameraScanner;
  window.stopAndCloseCameraScanner = stopAndCloseCameraScanner;
  window.switchCameraFacingMode = switchCameraFacingMode;
  window.toggleScannerTorch = toggleScannerTorch;
}
