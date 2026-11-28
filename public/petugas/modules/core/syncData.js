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
import { showToast, fetchTarifDendaFromDB } from './petugasHelper.js';

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
    // 1-7. Unduh seluruh data tabel secara paralel (Concurrent Fetching) agar jauh lebih cepat
    const [
      { data: katData, error: katErr },
      { data: bukuData, error: bukuErr },
      { data: siswaData, error: siswaErr },
      { data: guruData, error: guruErr },
      { data: pinjamData, error: pinjamErr },
      { data: returnData, error: returnErr },
      { data: pengumumanData, error: pengumumanErr }
    ] = await Promise.all([
      db.from('data_kategori').select('*').order('id_kategori', { ascending: true }),
      db.from('data_buku').select('*').order('id_buku', { ascending: true }),
      db.from('data_siswa').select('*').order('nama_siswa', { ascending: true }),
      db.from('data_guru').select('*').order('nama_guru', { ascending: true }),
      db.from('data_peminjaman').select('*').order('tanggal_pinjam', { ascending: false }),
      db.from('data_pengembalian').select('*').order('tanggal_kembali', { ascending: false }),
      db.from('data_pengumuman').select('*').order('id_pengumuman', { ascending: false })
    ]);

    if (katErr) throw katErr;
    if (bukuErr) throw bukuErr;
    if (siswaErr) throw siswaErr;
    if (guruErr) throw guruErr;
    if (pinjamErr) throw pinjamErr;
    if (returnErr) throw returnErr;
    if (pengumumanErr) throw pengumumanErr;

    state.cache.kategori = katData || [];
    state.cache.buku = bukuData || [];
    state.cache.siswa = siswaData || [];
    state.cache.guru = guruData || [];
    state.cache.peminjaman = pinjamData || [];
    state.cache.pengembalian = returnData || [];
    state.cache.pengumuman = pengumumanData || [];

    // 8. Sinkronisasi Kebijakan Tarif Denda Resmi (Tabel data_pengaturan)
    await fetchTarifDendaFromDB();

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
