/**
 * CAKRAWALA Digital Library - Modul Scanner (Index & Setup Coordinator)
 * File: public/petugas/modules/scanner/index.js
 * 
 * FUNGSI:
 * - Menghubungkan tombol pembuka scanner meja, input upload gambar, drag-and-drop, dan tombol tutup
 * - Tab switcher modal: Kamera Langsung vs Unggah Berkas Gambar
 * - Lifecycle aman: Memastikan kamera dimatikan tuntas pada tombol tutup, backdrop, Escape key, dan scan success
 * - Re-export seluruh fungsi pendukung pemindai kamera & barcode
 * - Global window bindings
 */

import { showToast } from '../core/petugasHelper.js';
import {
  startLiveCameraScanner,
  stopCamera,
  stopAndCloseCameraScanner,
  stopCameraHardwareStream,
  switchCameraFacingMode,
  toggleScannerTorch,
  getActiveScanContextMode,
  isScannerRunning
} from './cameraStream.js';
import { decodeQrFromFile } from './fileDecoder.js';
import { handleCameraScanSuccess } from './scanRouter.js';
import { playScanBeep, playErrorBeep } from './soundFeedback.js';

let isScannerModuleSetup = false;

/**
 * Berpindah mode tab di dalam modal scanner ('camera' | 'file')
 */
export function switchScannerModalTab(mode) {
  const tabCamera = document.getElementById('tabScannerModeCamera');
  const tabFile = document.getElementById('tabScannerModeFile');
  const panelCamera = document.getElementById('panelScannerCamera');
  const panelFile = document.getElementById('panelScannerFile');

  if (mode === 'camera') {
    if (tabCamera) {
      tabCamera.classList.add('border-navy', 'text-navy', 'font-bold');
      tabCamera.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
    }
    if (tabFile) {
      tabFile.classList.remove('border-navy', 'text-navy', 'font-bold');
      tabFile.classList.add('border-transparent', 'text-slate-500', 'font-semibold');
    }
    if (panelCamera) panelCamera.classList.remove('hidden');
    if (panelFile) panelFile.classList.add('hidden');
  } else {
    // Mode File: Matikan hardware stream kamera seketika agar lampu kamera padam & hemat daya
    stopCamera();

    if (tabFile) {
      tabFile.classList.add('border-navy', 'text-navy', 'font-bold');
      tabFile.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
    }
    if (tabCamera) {
      tabCamera.classList.remove('border-navy', 'text-navy', 'font-bold');
      tabCamera.classList.add('border-transparent', 'text-slate-500', 'font-semibold');
    }
    if (panelFile) panelFile.classList.remove('hidden');
    if (panelCamera) panelCamera.classList.add('hidden');
  }
}

/**
 * Memproses berkas gambar dari input file atau drop zone
 */
async function processScanFile(file) {
  if (!file) return;

  const resultStatus = document.getElementById('scannerResultStatus');
  const resultIcon = document.getElementById('scannerResultStatusIcon');
  const resultTitle = document.getElementById('scannerResultStatusTitle');
  const resultDetail = document.getElementById('scannerResultStatusDetail');

  function showResultIndicator(type, title, detail) {
    if (!resultStatus) return;
    resultStatus.classList.remove('hidden', 'bg-blue-50', 'text-blue-900', 'border-blue-200', 'bg-rose-50', 'text-rose-900', 'border-rose-200');
    if (type === 'loading') {
      resultStatus.classList.add('bg-blue-50', 'text-blue-900', 'border-blue-200');
      if (resultIcon) resultIcon.className = 'ph ph-spinner animate-spin text-base text-blue-600 shrink-0';
    } else if (type === 'error') {
      resultStatus.classList.add('bg-rose-50', 'text-rose-900', 'border-rose-200');
      if (resultIcon) resultIcon.className = 'ph ph-warning-circle text-base text-rose-600 shrink-0';
    }
    if (resultTitle) resultTitle.textContent = title;
    if (resultDetail) resultDetail.textContent = detail;
  }

  try {
    showResultIndicator('loading', 'Membaca kode dari gambar...', 'Memproses algoritma multi-pass...');
    showToast('Membaca Barcode / QR dari gambar...', 'info');

    const decodedText = await decodeQrFromFile(file);
    if (decodedText && decodedText.trim()) {
      if (resultStatus) resultStatus.classList.add('hidden');
      handleCameraScanSuccess(decodedText.trim(), getActiveScanContextMode());
    } else {
      throw new Error('Barcode tidak ditemukan');
    }
  } catch (err) {
    console.error('Gagal scan berkas gambar:', err);
    playErrorBeep();
    showResultIndicator('error', 'Barcode Tidak Terdeteksi', 'Pastikan resolusi gambar jelas dan tidak terlalu gelap.');
    showToast('Barcode / QR tidak dapat dibaca dari gambar tersebut.', 'error');
  }
}

/**
 * Menyiapkan tombol modal kamera scanner, upload berkas, drag & drop, tombol kontrol, dan lifecycle
 */
export function setupCameraScannerModule() {
  if (isScannerModuleSetup) return;
  isScannerModuleSetup = true;

  const modal = document.getElementById('modalCameraScanner') || document.querySelector('[data-modal="modalScannerUniversal"]');
  const closeBtn = document.getElementById('btnCloseCameraScanner');
  const cancelBtn = document.getElementById('btnCancelCameraScanner');
  const btnSwitchFacing = document.getElementById('btnSwitchCameraFacing');
  const btnToggleFlash = document.getElementById('btnToggleFlashLight');

  const tabCamera = document.getElementById('tabScannerModeCamera');
  const tabFile = document.getElementById('tabScannerModeFile');

  const fileInput = document.getElementById('inputScanImageFile');
  const btnUploadScan = document.getElementById('btnUploadScanImage');
  const dropArea = document.getElementById('dropAreaScanImage');

  // Tombol pintasan buka scanner di berbagai meja operasional
  const btnOpenWalkIn = document.getElementById('btnOpenScannerCamera');
  const btnOpenPrapinjam = document.getElementById('btnScanCameraPrapinjam');
  const btnLaunchFromModal = document.getElementById('btnLaunchCameraFromModal');

  // 1. Tombol Tutup / Batal Scanner
  if (closeBtn) {
    closeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await stopAndCloseCameraScanner();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await stopAndCloseCameraScanner();
    });
  }

  // 2. Klik pada Backdrop / Overlay Luar Modal Scanner
  if (modal) {
    modal.addEventListener('click', async (e) => {
      if (e.target === modal) {
        await stopAndCloseCameraScanner();
      }
    });
  }

  // 3. Tombol Keyboard 'Escape' (Esc) untuk Menutup Modal & Mematikan Kamera
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const currentModal = document.getElementById('modalCameraScanner') || document.querySelector('[data-modal="modalScannerUniversal"]');
      if (currentModal && !currentModal.classList.contains('hidden')) {
        await stopAndCloseCameraScanner();
      }
    }
  });

  // 4. Delegasi Tutup Scanner via atribut data-action="close-scanner"
  document.addEventListener('click', async (e) => {
    const closeTrigger = e.target.closest('[data-action="close-scanner"]');
    if (closeTrigger) {
      await stopAndCloseCameraScanner();
    }
  });

  // Kontrol Kamera: Switch Depan/Belakang & Lampu Kilat
  if (btnSwitchFacing) {
    btnSwitchFacing.addEventListener('click', switchCameraFacingMode);
  }
  if (btnToggleFlash) {
    btnToggleFlash.addEventListener('click', toggleScannerTorch);
  }

  // Switch Tab Modal (Kamera vs File)
  if (tabCamera) {
    tabCamera.addEventListener('click', () => {
      switchScannerModalTab('camera');
      startLiveCameraScanner(getActiveScanContextMode());
    });
  }
  if (tabFile) {
    tabFile.addEventListener('click', () => {
      switchScannerModalTab('file');
    });
  }

  // Tombol Pemicu Buka Scanner
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
  if (btnLaunchFromModal) {
    btnLaunchFromModal.addEventListener('click', () => {
      startLiveCameraScanner('prapinjam');
    });
  }

  // Delegasi klik elemen dengan atribut data-action="open-scanner"
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action="open-scanner"]');
    if (trigger) {
      const mode = trigger.getAttribute('data-scanner-mode') || 'walkin';
      startLiveCameraScanner(mode);
    }
  });

  // Upload File & Drag and Drop Handler
  if (btnUploadScan && fileInput) {
    btnUploadScan.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processScanFile(file);
      }
      fileInput.value = '';
    });
  }

  if (dropArea && fileInput) {
    dropArea.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('border-navy', 'bg-blue-50/70');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('border-navy', 'bg-blue-50/70');
      });
    });

    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        processScanFile(file);
      }
    });
  }
}

// Re-export untuk kenyamanan pemanggilan
export {
  playScanBeep,
  playErrorBeep,
  decodeQrFromFile,
  startLiveCameraScanner,
  stopCamera,
  stopAndCloseCameraScanner,
  stopCameraHardwareStream,
  switchCameraFacingMode,
  toggleScannerTorch,
  handleCameraScanSuccess,
  isScannerRunning
};

// Window Bindings Lengkap
if (typeof window !== 'undefined') {
  window.setupCameraScannerModule = setupCameraScannerModule;
  window.openScannerModal = (mode = 'walkin') => startLiveCameraScanner(mode);
  window.closeScannerModal = stopAndCloseCameraScanner;
  window.stopCamera = stopCamera;
  window.startLiveCameraScanner = startLiveCameraScanner;
  window.stopAndCloseCameraScanner = stopAndCloseCameraScanner;
  window.stopCameraHardwareStream = stopCamera;
  window.switchScannerModalTab = switchScannerModalTab;
  window.switchCameraFacingMode = switchCameraFacingMode;
  window.toggleScannerTorch = toggleScannerTorch;
  window.handleCameraScanSuccess = handleCameraScanSuccess;
  window.decodeQrFromFile = decodeQrFromFile;
}
