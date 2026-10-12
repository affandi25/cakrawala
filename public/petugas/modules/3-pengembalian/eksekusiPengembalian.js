/**
 * CAKRAWALA Digital Library - Modul Eksekusi Transaksi Pengembalian
 * Path: public/petugas/modules/3-pengembalian/eksekusiPengembalian.js
 * 
 * FUNGSI:
 * - Menyimpan bukti pengembalian ke tabel 'data_pengembalian' di Supabase
 * - Memperbarui status 'data_peminjaman' menjadi 'Selesai'
 * - Menambah kembali stok fisik buku (+1) di 'data_buku' (kecuali kondisi 'Hilang')
 * - Menampilkan pop-up struk bukti pengembalian resmi
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../core/state.js';
import {
  formatRupiah,
  getTodayDateString,
  generateRandomId,
  showToast,
  getBorrowerInfo
} from '../core/petugasHelper.js';
import { syncAllData } from '../core/syncData.js';
import { showReceiptModal } from './modalStruk.js';
import { resetPengembalianSelection } from './seleksiPeminjam.js';

/**
 * Menyimpan pengembalian buku dan mengupdate stok serta status denda
 */
export async function handleSubmitPengembalian() {
  const loan = state.selectedPeminjamanForReturn;
  if (!loan) {
    showToast('Pilih transaksi peminjaman terlebih dahulu.', 'warning');
    return;
  }

  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const tglKembali = inputTglKembali ? inputTglKembali.value : getTodayDateString();

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const dKembali = new Date(tglKembali);
  const dBatas = new Date(loan.batas_kembali);
  const diffDays = Math.ceil((dKembali.getTime() - dBatas.getTime()) / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;

  // Baca Tarif Harian Kustom Petugas
  const inputTarifDenda = document.getElementById('inputTarifDendaPerHari');
  const tarifPerHari = inputTarifDenda ? Math.max(0, parseInt(inputTarifDenda.value, 10) || 0) : 1000;

  const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  // Aturan >= 1 Bulan: Denda harian dinonaktifkan & diganti harga buku
  const isOneMonthOverdue = hariTerlambat >= 30;
  let dendaTerlambat = 0;
  if (isOneMonthOverdue) {
    dendaTerlambat = hargaBuku;
  } else {
    dendaTerlambat = hariTerlambat * tarifPerHari;
  }

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') dendaKondisi = 0.5 * hargaBuku;
  if (kondisi === 'Hilang') dendaKondisi = 1.0 * hargaBuku;

  const totalDenda = isOneMonthOverdue ? Math.max(hargaBuku, dendaKondisi) : (dendaTerlambat + dendaKondisi);

  let statusDenda = 'Tidak Ada';
  if (totalDenda > 0) {
    const radioStatusDenda = document.querySelector('input[name="statusDenda"]:checked');
    statusDenda = radioStatusDenda ? radioStatusDenda.value : 'Lunas';
  }

  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnText = document.getElementById('btnSubmitPengembalianText');

  try {
    if (btnSubmit) btnSubmit.disabled = true;
    if (btnText) btnText.textContent = 'Menyimpan Pengembalian...';

    const newIdPengembalian = generateRandomId('KB', 6);

    // 1. Simpan Transaksi Pengembalian ke Supabase
    const { error: errReturn } = await db
      .from('data_pengembalian')
      .insert({
        id_pengembalian: newIdPengembalian,
        id_peminjaman: loan.id_peminjaman,
        tanggal_kembali: tglKembali,
        keterlambatan: hariTerlambat,
        kondisi_buku: kondisi,
        denda: totalDenda,
        status_denda: statusDenda
      });
    if (errReturn) throw errReturn;

    // 2. Update Status Peminjaman Menjadi 'Selesai'
    const { error: errLoan } = await db
      .from('data_peminjaman')
      .update({ status: 'Selesai' })
      .eq('id_peminjaman', loan.id_peminjaman);
    if (errLoan) throw errLoan;

    // 3. Kembalikan Stok Buku di data_buku (+1) dan status 'Tersedia' KECUALI jika dilaporkan 'Hilang'
    if (kondisi !== 'Hilang') {
      const stokSekarang = buku ? (Number(buku.stok) || 0) : 0;
      const stokBaru = stokSekarang + 1;

      const { error: errBook } = await db
        .from('data_buku')
        .update({
          stok: stokBaru,
          status: 'Tersedia'
        })
        .eq('id_buku', loan.id_buku);
      if (errBook) throw errBook;
    }

    showToast('Buku berhasil dikembalikan dan data diperbarui!', 'success');

    // 4. Buka Modal Struk Bukti Pengembalian
    const borrower = getBorrowerInfo(loan.nisn_siswa);
    showReceiptModal({
      id: newIdPengembalian,
      siswa: `${borrower.nama} (${borrower.badge})`,
      buku: buku ? buku.judul_buku : loan.id_buku,
      kondisi: kondisi,
      overdue: `${hariTerlambat} Hari`,
      fine: formatRupiah(totalDenda),
      fineStatus: statusDenda
    });

    // Reset pilihan form
    resetPengembalianSelection();

    // Sinkronisasi data real-time
    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllData();
    }
  } catch (err) {
    console.error('Gagal memproses pengembalian:', err);
    showToast('Gagal memproses pengembalian: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Selesaikan Pengembalian Buku';
  }
}

// Window binding
if (typeof window !== 'undefined') {
  window.handleSubmitPengembalian = handleSubmitPengembalian;
}
