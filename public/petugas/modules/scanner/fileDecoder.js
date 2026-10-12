/**
 * CAKRAWALA Digital Library - Modul Pembaca Barcode / QR dari File Gambar
 * File: public/petugas/modules/scanner/fileDecoder.js
 * 
 * FUNGSI:
 * - Membaca kode QR / Barcode dari berkas gambar yang diunggah (JPG, PNG, WEBP)
 * - Multi-layer engine:
 *   1. Html5Qrcode (ZXing Core)
 *   2. Multi-pass jsQR (Raw, Scaled-Down, Quiet-Zone Padding, Center-Crop)
 *   3. Native BarcodeDetector API (Browser modern)
 */

/**
 * Ekstraksi kode teks dari file gambar
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function decodeQrFromFile(file) {
  if (!file) throw new Error('Berkas gambar tidak ditemukan');

  // Strategi 1: Coba Html5Qrcode scanFile (berbasis ZXing C++, sangat kuat untuk file statis)
  if (window.Html5Qrcode) {
    try {
      let targetId = 'cameraScannerTarget';
      let targetEl = document.getElementById(targetId);
      let isTemp = false;

      if (!targetEl) {
        targetEl = document.createElement('div');
        targetId = 'tempScannerTarget_' + Date.now();
        targetEl.id = targetId;
        targetEl.style.display = 'none';
        document.body.appendChild(targetEl);
        isTemp = true;
      }

      const scanner = new window.Html5Qrcode(targetId);
      const decodedResult = await scanner.scanFile(file, true);
      if (isTemp && targetEl) targetEl.remove();

      if (decodedResult && typeof decodedResult === 'string' && decodedResult.trim()) {
        return decodedResult.trim();
      }
    } catch (errHtml5) {
      // Jika Html5Qrcode belum mendeteksi, lanjutkan ke multi-pass jsQR
    }
  }

  // Strategi 2: jsQR dengan multi-pass canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          if (window.jsQR) {
            const scanCanvas = (c) => {
              const ctx = c.getContext('2d', { willReadFrequently: true });
              if (!ctx) return null;
              const imgData = ctx.getImageData(0, 0, c.width, c.height);
              const res = window.jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth'
              });
              return res && res.data ? res.data : null;
            };

            // 1. Pass 1: Ukuran asli gambar
            const rawCanvas = document.createElement('canvas');
            rawCanvas.width = img.width;
            rawCanvas.height = img.height;
            const rawCtx = rawCanvas.getContext('2d');
            rawCtx.drawImage(img, 0, 0);
            let code = scanCanvas(rawCanvas);
            if (code && code.trim()) return resolve(code.trim());

            // 2. Pass 2: Downscaled Canvas jika gambar beresolusi sangat besar (misal kamera HP 4K)
            if (img.width > 800 || img.height > 800) {
              const maxDim = 800;
              const scale = Math.min(maxDim / img.width, maxDim / img.height);
              const scaledCanvas = document.createElement('canvas');
              scaledCanvas.width = Math.round(img.width * scale);
              scaledCanvas.height = Math.round(img.height * scale);
              const sCtx = scaledCanvas.getContext('2d');
              sCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);
              code = scanCanvas(scaledCanvas);
              if (code && code.trim()) return resolve(code.trim());
            }

            // 3. Pass 3: Quiet Zone (Border Putih 40px di sekeliling gambar)
            const pad = 40;
            const padCanvas = document.createElement('canvas');
            padCanvas.width = img.width + (pad * 2);
            padCanvas.height = img.height + (pad * 2);
            const padCtx = padCanvas.getContext('2d');
            padCtx.fillStyle = '#ffffff';
            padCtx.fillRect(0, 0, padCanvas.width, padCanvas.height);
            padCtx.drawImage(img, pad, pad);
            code = scanCanvas(padCanvas);
            if (code && code.trim()) return resolve(code.trim());

            // 4. Pass 4: Cropped Center Box (Fokus area tengah tempat QR code tiket berada)
            const cropCanvas = document.createElement('canvas');
            const cropW = Math.round(img.width * 0.7);
            const cropH = Math.round(img.height * 0.7);
            const cropX = Math.round(img.width * 0.15);
            const cropY = Math.round(img.height * 0.15);
            cropCanvas.width = cropW;
            cropCanvas.height = cropH;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            code = scanCanvas(cropCanvas);
            if (code && code.trim()) return resolve(code.trim());
          }

          // Strategi 3: Native Web BarcodeDetector API (Chrome/Edge modern)
          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'] });
            detector.detect(img).then(barcodes => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                return resolve(barcodes[0].rawValue.trim());
              }
              reject(new Error('Barcode tidak terdeteksi pada gambar'));
            }).catch(() => reject(new Error('Barcode tidak terdeteksi pada gambar')));
            return;
          }

          reject(new Error('Barcode tidak terdeteksi pada gambar'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

if (typeof window !== 'undefined') {
  window.decodeQrFromFile = decodeQrFromFile;
}
