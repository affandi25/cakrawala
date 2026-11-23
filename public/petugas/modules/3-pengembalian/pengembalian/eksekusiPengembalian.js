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

import { db } from '../../../../assets/js/supabaseClient.js';
import { state } from '../../core/state.js';
import {
  formatRupiah,
  getTodayDateString,
  generateRandomId,
  showToast,
  getBorrowerInfo,
  getTarifDendaHarian
} from '../../core/petugasHelper.js';
import { syncAllData } from '../../core/syncData.js';
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
  let tglKembali = inputTglKembali ? inputTglKembali.value : getTodayDateString();
  const today = getTodayDateString();

  if (tglKembali > today) {
    showToast('Tanggal pengembalian fisik tidak boleh berada di masa depan!', 'warning');
    if (inputTglKembali) inputTglKembali.value = today;
    return;
  }
  if (loan.tanggal_pinjam && tglKembali < loan.tanggal_pinjam) {
    showToast('Tanggal pengembalian tidak boleh sebelum tanggal pinjam!', 'warning');
    return;
  }

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const dKembali = new Date(tglKembali);
  const dBatas = new Date(loan.batas_kembali);
  const diffDays = Math.ceil((dKembali.getTime() - dBatas.getTime()) / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;

  // Baca Tarif Harian dari Kebijakan Resmi Sistem
  const tarifPerHari = getTarifDendaHarian();

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

    // 1-3. Simpan Transaksi Pengembalian, Selesaikan Pinjaman, & Pulihkan Stok Buku secara Atomik (Database RPC)
    const { data: resReturn, error: errReturn } = await db.rpc('selesaikan_pengembalian', {
      p_id_pengembalian: newIdPengembalian,
      p_id_peminjaman: loan.id_peminjaman,
      p_tanggal_kembali: tglKembali,
      p_keterlambatan: hariTerlambat,
      p_kondisi_buku: kondisi,
      p_denda: totalDenda,
      p_status_denda: statusDenda
    });
    if (errReturn) throw errReturn;

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
