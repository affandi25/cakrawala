/**
 * CAKRAWALA Digital Library - Modul Pembaca Barcode / QR dari File Gambar
 * File: public/petugas/modules/scanner/fileDecoder.js
 * 
 * FUNGSI:
 * - Membaca kode QR/Barcode dari file gambar statis (JPG, PNG, WEBP)
 * - Multi-layer engine: Html5Qrcode (ZXing) + Multi-pass jsQR (Raw, Scaled, Quiet-Zone, Crop) + BarcodeDetector
 */

export async function decodeQrFromFile(file) {
  // Strategi 1: Coba Html5Qrcode scanFile (berbasis ZXing C++, sangat kuat untuk file gambar statis)
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

  // Strategi 2: jsQR dengan multi-pass (Raw, Scaled-Down, Quiet Zone Padding, dan Cropped Center)
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
            if (code) return resolve(code);

            // 2. Pass 2: Downscaled Canvas jika gambar beresolusi tinggi (misal foto HP / screenshot)
            if (img.width > 800 || img.height > 800) {
              const maxDim = 800;
              const scale = Math.min(maxDim / img.width, maxDim / img.height);
              const scaledCanvas = document.createElement('canvas');
              scaledCanvas.width = Math.round(img.width * scale);
              scaledCanvas.height = Math.round(img.height * scale);
              const sCtx = scaledCanvas.getContext('2d');
              sCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);
              code = scanCanvas(scaledCanvas);
              if (code) return resolve(code);
            }

            // 3. Pass 3: Quiet Zone (Border Putih 40px)
            const pad = 40;
            const padCanvas = document.createElement('canvas');
            padCanvas.width = img.width + (pad * 2);
            padCanvas.height = img.height + (pad * 2);
            const padCtx = padCanvas.getContext('2d');
            padCtx.fillStyle = '#ffffff';
            padCtx.fillRect(0, 0, padCanvas.width, padCanvas.height);
            padCtx.drawImage(img, pad, pad);
            code = scanCanvas(padCanvas);
            if (code) return resolve(code);

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
            if (code) return resolve(code);
          }

          // Strategi 3: Native Web BarcodeDetector API (jika browser mendukung)
          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
            detector.detect(img).then(barcodes => {
              if (barcodes && barcodes.length > 0) {
                return resolve(barcodes[0].rawValue);
              }
              reject(new Error('Barcode tidak terdeteksi'));
            }).catch(() => reject(new Error('Barcode tidak terdeteksi')));
            return;
          }

          reject(new Error('Barcode tidak terdeteksi'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}
