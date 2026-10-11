/**
 * CAKRAWALA Digital Library - Modul Suara Pemindai Barcode / QR
 * File: public/petugas/modules/scanner/soundFeedback.js
 * 
 * FUNGSI:
 * - Menghasilkan bunyi "BEEP!" frekuensi 880Hz via Web Audio API saat barcode sukses terbaca
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
