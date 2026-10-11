/**
 * CAKRAWALA Digital Library - Router Pengolah Hasil Scan Barcode / QR
 * File: public/petugas/modules/scanner/scanRouter.js
 * 
 * FUNGSI:
 * - Menangani hasil scan teks barcode / QR secara cerdas
 * - Mencocokkan data ke:
 *   1. Meja Pengembalian (Barcode Peminjaman PJ-xxx, Kartu Siswa/Guru, atau Barcode Buku)
 *   2. Tiket Booking Pra-Pinjam (PJ-xxx status 'Menunggu')
 *   3. Stiker Buku Fisik (BK-xxx / kode_qr) untuk Walk-In Desk
 *   4. Kartu Anggota (NISN Siswa / NIP Guru) untuk Walk-In Desk
 *   5. Fallback pencarian input barcode manual
 */

import { state } from '../state.js';
import { showToast } from '../petugasHelper.js';
import { playScanBeep } from './soundFeedback.js';
import { stopAndCloseCameraScanner } from './cameraStream.js';
import {
  setMejaSelectedBuku,
  switchSirkulasiSubtab,
  selectMember,
  renderPrapinjamOnlyTable
} from '../sirkulasi/index.js';

export function handleCameraScanSuccess(decodedText, contextMode) {
  const text = (decodedText || '').trim();
  if (!text) return;

  playScanBeep();
  stopAndCloseCameraScanner();

  const upperText = text.toUpperCase();

  // 0. JIKA SCAN BERASAL DARI MEJA PENGEMBALIAN (atau sedang berada di tab pengembalian)
  if (contextMode === 'pengembalian' || state.activeTab === 'pengembalian') {
    // A. Cek apakah ini Barcode ID Peminjaman (PJ-xxx) yang statusnya 'Dipinjam'
    const activeLoan = (state.cache.peminjaman || []).find(p => 
      p.status === 'Dipinjam' && p.id_peminjaman && (
        p.id_peminjaman.toUpperCase() === upperText ||
        upperText.includes(p.id_peminjaman.toUpperCase())
      )
    );

    if (activeLoan) {
      if (window.switchTab) window.switchTab('pengembalian');
      if (window.selectBorrowerForReturn) {
        window.selectBorrowerForReturn(activeLoan.nisn_siswa, activeLoan.id_peminjaman);
      }
      showToast(`Pinjaman [${activeLoan.id_peminjaman}] siap dikembalikan!`, 'success');
      return;
    }

    // B. Cek apakah ini Barcode Kartu Siswa (NISN) atau Kartu Guru (NIP)
    const scanSiswa = (state.cache.siswa || []).find(s => s.nisn_siswa && (s.nisn_siswa.toUpperCase() === upperText || upperText.includes(s.nisn_siswa.toUpperCase())));
    const scanGuru = !scanSiswa && (state.cache.guru || []).find(g => g.nip_guru && (g.nip_guru.toUpperCase() === upperText || upperText.includes(g.nip_guru.toUpperCase())));

    if (scanSiswa || scanGuru) {
      const borrowerId = scanSiswa ? scanSiswa.nisn_siswa : scanGuru.nip_guru;
      const borrowerName = scanSiswa ? scanSiswa.nama_siswa : scanGuru.nama_guru;
      if (window.switchTab) window.switchTab('pengembalian');
      if (window.selectBorrowerForReturn) {
        window.selectBorrowerForReturn(borrowerId);
      }
      showToast(`Kartu [${borrowerName}] terpilih! Silakan periksa buku yang dikembalikan.`, 'success');
      return;
    }

    // C. Cek apakah ini Barcode Buku Fisik (BK-xxx atau kode_qr)
    const scanBook = (state.cache.buku || []).find(b => 
      (b.id_buku && b.id_buku.toUpperCase() === upperText) || 
      (b.kode_qr && b.kode_qr.toUpperCase() === upperText) ||
      (b.id_buku && upperText.includes(b.id_buku.toUpperCase())) ||
      (b.kode_qr && upperText.includes(b.kode_qr.toUpperCase()))
    );

    if (scanBook) {
      const matchingLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam' && p.id_buku === scanBook.id_buku);
      if (matchingLoans.length === 1) {
        if (window.switchTab) window.switchTab('pengembalian');
        if (window.selectBorrowerForReturn) {
          window.selectBorrowerForReturn(matchingLoans[0].nisn_siswa, matchingLoans[0].id_peminjaman);
        }
        showToast(`Buku "${scanBook.judul_buku}" cocok dengan 1 peminjam aktif! Langsung dipilih.`, 'success');
        return;
      } else if (matchingLoans.length > 1) {
        if (window.switchTab) window.switchTab('pengembalian');
        if (window.filterPengembalianByBook) {
          window.filterPengembalianByBook(scanBook.id_buku);
        }
        showToast(`Buku "${scanBook.judul_buku}" sedang dipinjam oleh ${matchingLoans.length} orang. Pilih peminjamnya di dropdown.`, 'info');
        return;
      } else {
        showToast(`Buku "${scanBook.judul_buku}" tidak tercatat sedang dipinjam saat ini.`, 'warning');
        return;
      }
    }
  }

  // 1. Cek Tiket Pra-Pinjam (status 'Menunggu')
  const pendingBooking = (state.cache.peminjaman || []).find(p => 
    p.status === 'Menunggu' && p.id_peminjaman && (
      p.id_peminjaman.toUpperCase() === upperText ||
      upperText.includes(p.id_peminjaman.toUpperCase())
    )
  );

  if (pendingBooking) {
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('prapinjam');
    showToast(`Tiket Booking [${pendingBooking.id_peminjaman}] terverifikasi! Menyiapkan penyerahan buku.`, 'success');
    const searchPrapinjam = document.getElementById('inputSearchPrapinjam');
    if (searchPrapinjam) {
      searchPrapinjam.value = pendingBooking.id_peminjaman;
      state.searchPrapinjamQuery = pendingBooking.id_peminjaman.toLowerCase();
      renderPrapinjamOnlyTable();
    }
    if (window.openPrapinjamVerifyModal) {
      window.openPrapinjamVerifyModal(pendingBooking, true);
    }
    return;
  }

  // 2. Cek Barcode / QR Stiker Buku Fisik
  const book = (state.cache.buku || []).find(b => 
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
