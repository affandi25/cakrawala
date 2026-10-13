/**
 * CAKRAWALA Digital Library - Router Pengolah Hasil Scan Barcode / QR
 * File: public/petugas/modules/scanner/scanRouter.js
 * 
 * FUNGSI:
 * - Menangani hasil scan teks barcode / QR secara cerdas sesuai PRD Bagian 4.6
 * - Lifecycle aman: Mematikan seluruh hardware camera stream secara tuntas sebelum routing
 * - Smart Routing:
 *   1. Tiket Pra-Pinjam ('PJ-...'): Tutup scanner, buka modal verifikasi prapinjam di Meja 2
 *   2. Stiker Buku ('BK-...' atau ID/QR Buku):
 *      - Jika tab Meja 3 (Pengembalian): Cari peminjaman aktif buku / filter pengembalian
 *      - Jika tab Meja 2 (Sirkulasi): Masukkan ke form walk-in peminjaman langsung
 *      - Jika tab lain: Arahkan ke rincian buku di Meja 4 (Inventaris)
 *   3. Kartu Anggota (NISN Siswa / NIP Guru): Pilih anggota di Walk-In Meja 2 atau Pengembalian Meja 3
 */

import { state } from '../core/state.js';
import { showToast } from '../core/petugasHelper.js';
import { playScanBeep, playErrorBeep } from './soundFeedback.js';
import { stopAndCloseCameraScanner } from './cameraStream.js';
import {
  addBookToWalkInCart,
  switchSirkulasiSubtab,
  selectMember,
  renderPrapinjamOnlyTable,
  openPrapinjamVerifyModal
} from '../2-sirkulasi/index.js';

/**
 * Memproses string hasil scan dari kamera atau upload berkas
 * @param {string} decodedText - Teks hasil dekode barcode / QR
 * @param {string} contextMode - Mode konteks pemanggilan ('walkin' | 'prapinjam' | 'pengembalian' | 'inventaris')
 */
export async function handleCameraScanSuccess(decodedText, contextMode) {
  const text = (decodedText || '').trim();
  if (!text) return;

  const upperText = text.toUpperCase();

  // 1. Cek apakah teks berupa Tiket Pra-Pinjam ('PJ-...')
  const isPrapinjamCode = upperText.startsWith('PJ-') || (
    (state.cache.peminjaman || []).some(p => p.id_peminjaman && upperText.includes(p.id_peminjaman.toUpperCase()))
  );

  if (isPrapinjamCode) {
    const loanItem = (state.cache.peminjaman || []).find(p =>
      p.id_peminjaman && (
        p.id_peminjaman.toUpperCase() === upperText ||
        upperText.includes(p.id_peminjaman.toUpperCase())
      )
    );

    // Jika ini adalah tiket berstatus 'Menunggu' (antrean reservasi pra-pinjam)
    if (loanItem && loanItem.status === 'Menunggu') {
      playScanBeep();
      // Matikan hardware kamera & tutup modal pemindai sebelum routing
      await stopAndCloseCameraScanner();

      if (window.switchTab) window.switchTab('sirkulasi');
      switchSirkulasiSubtab('prapinjam');

      const searchInput = document.getElementById('inputSearchPrapinjam');
      if (searchInput) {
        searchInput.value = loanItem.id_peminjaman;
        state.searchPrapinjamQuery = loanItem.id_peminjaman.toLowerCase();
        renderPrapinjamOnlyTable();
      }

      // Buka modal verifikasi tiket di Meja 2
      if (typeof openPrapinjamVerifyModal === 'function') {
        openPrapinjamVerifyModal(loanItem, true);
      } else if (window.openPrapinjamVerifyModal) {
        window.openPrapinjamVerifyModal(loanItem, true);
      }

      showToast(`Tiket Pra-Pinjam [${loanItem.id_peminjaman}] terdeteksi! Silakan periksa buku dan serahkan.`, 'success');
      return;
    }

    // Jika ini adalah tiket berstatus 'Dipinjam' dan sedang di meja pengembalian
    if (loanItem && loanItem.status === 'Dipinjam') {
      playScanBeep();
      await stopAndCloseCameraScanner();

      if (window.switchTab) window.switchTab('pengembalian');
      if (window.selectBorrowerForReturn) {
        window.selectBorrowerForReturn(loanItem.nisn_siswa, loanItem.id_peminjaman);
      }
      showToast(`Peminjaman aktif [${loanItem.id_peminjaman}] ditemukan! Form pengembalian siap diisi.`, 'success');
      return;
    }
  }

  // 2. Cek apakah teks berupa Kartu Anggota (NISN Siswa atau NIP Guru)
  const matchedSiswa = (state.cache.siswa || []).find(s => 
    s.nisn_siswa && (s.nisn_siswa.toUpperCase() === upperText || upperText.includes(s.nisn_siswa.toUpperCase()))
  );
  const matchedGuru = !matchedSiswa && (state.cache.guru || []).find(g => 
    g.nip_guru && (g.nip_guru.toUpperCase() === upperText || upperText.includes(g.nip_guru.toUpperCase()))
  );

  if (matchedSiswa || matchedGuru) {
    playScanBeep();
    await stopAndCloseCameraScanner();

    const memberId = matchedSiswa ? matchedSiswa.nisn_siswa : matchedGuru.nip_guru;
    const memberName = matchedSiswa ? matchedSiswa.nama_siswa : matchedGuru.nama_guru;

    // Jika sedang di tab pengembalian
    if (state.activeTab === 'pengembalian' || contextMode === 'pengembalian') {
      if (window.switchTab) window.switchTab('pengembalian');
      if (window.selectBorrowerForReturn) {
        window.selectBorrowerForReturn(memberId);
      }
      showToast(`Kartu Anggota [${memberName}] terpilih untuk pengembalian buku!`, 'success');
      return;
    }

    // Default: Meja 2 Sirkulasi Walk-in
    if (window.switchTab) window.switchTab('sirkulasi');
    switchSirkulasiSubtab('walkin');

    if (matchedSiswa) {
      selectMember({
        type: 'siswa',
        id: matchedSiswa.nisn_siswa,
        nama: matchedSiswa.nama_siswa,
        detail: `NISN: ${matchedSiswa.nisn_siswa} &bull; Kelas ${matchedSiswa.kelas || '-'}`,
        badge: 'Siswa',
        foto: matchedSiswa.foto_profil || null
      });
    } else {
      selectMember({
        type: 'guru',
        id: matchedGuru.nip_guru,
        nama: matchedGuru.nama_guru,
        detail: `NIP: ${matchedGuru.nip_guru} &bull; ${matchedGuru.mata_pelajaran || 'Pengajar'}`,
        badge: 'Guru',
        foto: matchedGuru.foto_profil || null
      });
    }
    showToast(`Kartu [${memberName}] berhasil dipindai!`, 'success');
    return;
  }

  // 3. Cek apakah teks berupa Stiker Buku Fisik (BK-... atau kode_qr atau id_buku)
  const matchedBook = (state.cache.buku || []).find(b => 
    (b.id_buku && (b.id_buku.toUpperCase() === upperText || upperText.includes(b.id_buku.toUpperCase()))) ||
    (b.kode_qr && (b.kode_qr.toUpperCase() === upperText || upperText.includes(b.kode_qr.toUpperCase())))
  );

  if (matchedBook) {
    playScanBeep();
    await stopAndCloseCameraScanner();

    // RUTE A: Jika tab aktif adalah Meja 3 (Pengembalian)
    if (state.activeTab === 'pengembalian' || contextMode === 'pengembalian') {
      const activeLoans = (state.cache.peminjaman || []).filter(p => 
        p.status === 'Dipinjam' && p.id_buku === matchedBook.id_buku
      );

      if (activeLoans.length === 1) {
        if (window.switchTab) window.switchTab('pengembalian');
        if (window.selectBorrowerForReturn) {
          window.selectBorrowerForReturn(activeLoans[0].nisn_siswa, activeLoans[0].id_peminjaman);
        }
        showToast(`Buku "${matchedBook.judul_buku}" sedang dipinjam 1 orang. Transaksi pengembalian langsung dipilih!`, 'success');
        return;
      } else if (activeLoans.length > 1) {
        if (window.switchTab) window.switchTab('pengembalian');
        if (window.filterPengembalianByBook) {
          window.filterPengembalianByBook(matchedBook.id_buku);
        }
        showToast(`Buku "${matchedBook.judul_buku}" dipinjam ${activeLoans.length} orang. Pilih peminjam di daftar.`, 'info');
        return;
      } else {
        showToast(`Buku "${matchedBook.judul_buku}" tidak sedang dalam status pinjam aktif.`, 'warning');
        return;
      }
    }

    // RUTE B: Jika tab aktif adalah Meja 2 (Sirkulasi) atau contextMode walkin
    if (state.activeTab === 'sirkulasi' || contextMode === 'walkin') {
      if (window.switchTab) window.switchTab('sirkulasi');
      switchSirkulasiSubtab('walkin');
      addBookToWalkInCart(matchedBook);
      return;
    }

    // RUTE C: Jika di tab lain (Overview, Inventaris Meja 4, Pengumuman Meja 5) -> Buka rincian Meja 4
    if (window.switchTab) window.switchTab('inventaris');
    state.searchBooksQuery = (matchedBook.judul_buku || matchedBook.id_buku).toLowerCase();

    const inputSearchBuku = document.getElementById('inputSearchBooks');
    const btnClearSearch = document.getElementById('btnClearSearchBooks');
    if (inputSearchBuku) {
      inputSearchBuku.value = matchedBook.judul_buku;
      if (btnClearSearch) btnClearSearch.classList.remove('hidden');
    }

    if (window.renderBooksInventory) {
      window.renderBooksInventory();
    }

    if (window.openBookModal) {
      window.openBookModal('edit', matchedBook.id_buku);
    }

    showToast(`Buku "${matchedBook.judul_buku}" ditemukan di inventaris!`, 'success');
    return;
  }

  // 4. Default Fallback jika tidak ada entitas yang cocok
  playErrorBeep();
  showToast(`Kode terdeteksi: "${text}", namun tidak cocok dengan data buku, peminjaman, atau anggota.`, 'warning');
}

if (typeof window !== 'undefined') {
  window.handleCameraScanSuccess = handleCameraScanSuccess;
}
