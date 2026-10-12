/**
 * CAKRAWALA Digital Library - Modul Suara Pemindai Barcode / QR (Web Audio API)
 * File: public/petugas/modules/scanner/soundFeedback.js
 * 
 * FUNGSI:
 * - Sintesis nada audio "beep" tanpa file eksternal .mp3 menggunakan Web Audio API murni
 * - Nada sukses (frekuensi tinggi 960Hz - 1200Hz) & nada peringatan jika kode tak dikenal
 */

let sharedAudioContext = null;

function getAudioContext() {
  if (!sharedAudioContext) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioContext = new AudioCtxClass();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Memainkan nada bip sukses (ding!) saat barcode/QR berhasil terdeteksi
 */
export function playScanBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frekuensi 1050 Hz (nada khas mesin kasir modern)
    osc.frequency.setValueAtTime(1050, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Abaikan jika browser membatasi audio autoplay
    console.debug('Audio beep feedback skipped:', e);
  }
}

/**
 * Memainkan nada bip peringatan/gagal pendek
 */
export function playErrorBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.debug('Error beep skipped:', e);
  }
}

if (typeof window !== 'undefined') {
  window.playScanBeep = playScanBeep;
  window.playErrorBeep = playErrorBeep;
}
