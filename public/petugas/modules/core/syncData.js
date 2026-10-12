/**
 * CAKRAWALA Digital Library - Data Synchronization & Supabase Multi-Table Fetcher
 * File: public/petugas/modules/core/syncData.js
 * 
 * FUNGSI:
 * Mengunduh seluruh arsip data dari 7 tabel Supabase ke dalam state.cache:
 * - data_kategori, data_buku, data_siswa, data_guru, data_peminjaman, data_pengembalian, data_pengumuman
 * - Menjalankan callback listeners terdaftar saat proses sinkronisasi berhasil
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from './state.js';
import { showToast } from './petugasHelper.js';

// Kumpulan fungsi callback listener yang akan dipanggil saat data diperbarui
const syncListeners = new Set();

/**
 * Daftarkan fungsi listener untuk menerima notifikasi saat sinkronisasi selesai
 * @param {Function} callback 
 */
export function onDataSynced(callback) {
  if (typeof callback === 'function') {
    syncListeners.add(callback);
  }
}

/**
 * Hapus listener terdaftar
 * @param {Function} callback 
 */
export function offDataSynced(callback) {
  syncListeners.delete(callback);
}

/**
 * Panggil semua listener terdaftar
 */
export function notifyListeners() {
  syncListeners.forEach(listener => {
    try {
      listener(state.cache);
    } catch (err) {
      console.error('Error saat menjalankan sync listener:', err);
    }
  });
}

/**
 * Mengunduh seluruh data tabel dari Supabase ke state.cache
 * @returns {Promise<boolean>}
 */
export async function syncAllTables() {
  if (!db) {
    showToast('Koneksi database Supabase tidak terinisialisasi.', 'error');
    return false;
  }

  try {
    // 1. Kategori Koleksi Buku
    const { data: katData, error: katErr } = await db
      .from('data_kategori')
      .select('*')
      .order('id_kategori', { ascending: true });
    if (katErr) throw katErr;
    state.cache.kategori = katData || [];

    // 2. Katalog Koleksi Buku
    const { data: bukuData, error: bukuErr } = await db
      .from('data_buku')
      .select('*')
      .order('id_buku', { ascending: true });
    if (bukuErr) throw bukuErr;
    state.cache.buku = bukuData || [];

    // 3. Data Siswa
    const { data: siswaData, error: siswaErr } = await db
      .from('data_siswa')
      .select('*')
      .order('nama_siswa', { ascending: true });
    if (siswaErr) throw siswaErr;
    state.cache.siswa = siswaData || [];

    // 4. Data Guru
    const { data: guruData, error: guruErr } = await db
      .from('data_guru')
      .select('*')
      .order('nama_guru', { ascending: true });
    if (guruErr) throw guruErr;
    state.cache.guru = guruData || [];

    // 5. Transaksi Peminjaman (Menunggu & Dipinjam)
    const { data: pinjamData, error: pinjamErr } = await db
      .from('data_peminjaman')
      .select('*')
      .order('tanggal_pinjam', { ascending: false });
    if (pinjamErr) throw pinjamErr;
    state.cache.peminjaman = pinjamData || [];

    // 6. Riwayat Pengembalian & Denda
    const { data: returnData, error: returnErr } = await db
      .from('data_pengembalian')
      .select('*')
      .order('tanggal_kembali', { ascending: false });
    if (returnErr) throw returnErr;
    state.cache.pengembalian = returnData || [];

    // 7. Pengumuman & Agenda Perpustakaan
    const { data: pengumumanData, error: pengumumanErr } = await db
      .from('data_pengumuman')
      .select('*')
      .order('id_pengumuman', { ascending: false });
    if (pengumumanErr) throw pengumumanErr;
    state.cache.pengumuman = pengumumanData || [];

    // Jalankan seluruh render listener
    notifyListeners();
    return true;
  } catch (err) {
    console.error('Error saat menyinkronkan data Supabase:', err);
    showToast(`Gagal menyinkronkan data: ${err.message || 'Koneksi terputus'}`, 'error');
    return false;
  }
}

// Alias untuk kompatibilitas
export const fetchAllData = syncAllTables;
export const syncAllData = syncAllTables;

if (typeof window !== 'undefined') {
  window.fetchAllData = syncAllTables;
  window.syncAllTables = syncAllTables;
}
