/**
 * CAKRAWALA Digital Library - Modul Scanner (Index & Setup Coordinator)
 * File: public/petugas/modules/scanner/index.js
 * 
 * FUNGSI:
 * - Menghubungkan tombol pembuka scanner meja, input upload gambar, dan tombol tutup
 * - Re-export seluruh fungsi pendukung pemindai kamera & barcode
 */

import { showToast } from '../petugasHelper.js';
import {
  startLiveCameraScanner,
  stopAndCloseCameraScanner,
  getActiveScanContextMode
} from './cameraStream.js';
import { decodeQrFromFile } from './fileDecoder.js';
import { handleCameraScanSuccess } from './scanRouter.js';
import { playScanBeep } from './soundFeedback.js';

let isScannerModuleSetup = false;

/**
 * Menyiapkan tombol modal kamera scanner & upload file
 */
export function setupCameraScannerModule() {
  if (isScannerModuleSetup) return;
  isScannerModuleSetup = true;

  const modal = document.getElementById('modalCameraScanner');
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
          handleCameraScanSuccess(decodedText, getActiveScanContextMode());
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

// Re-export untuk kenyamanan import dari luar
export {
  playScanBeep,
  decodeQrFromFile,
  startLiveCameraScanner,
  stopAndCloseCameraScanner,
  handleCameraScanSuccess
};

if (typeof window !== 'undefined') {
  window.startLiveCameraScanner = startLiveCameraScanner;
}
