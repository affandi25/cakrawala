/**
 * CAKRAWALA Digital Library - Data Synchronization & Supabase Fetching
 * File: public/petugas/modules/data.js
 * 
 * FUNGSI:
 * - Mengunduh seluruh arsip data dari 7 tabel Supabase ke dalam memori sentral (state.cache)
 * - Memicu perenderan ulang seluruh meja operasional (Overview, Sirkulasi, Pengembalian, Inventaris, Pengumuman)
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import { showToast } from './utils.js';
import { renderOverview } from './overview.js';
import { renderSirkulasi } from './sirkulasi.js';
import { renderPengembalianFormOptions, renderRiwayatPengembalian } from './pengembalian.js';
import { renderCategoryDropdowns, renderBooksInventory } from './buku.js';
import { renderPengumumanTable } from './pengumuman.js';

/**
 * Menjalankan seluruh fungsi perenderan meja tampilan secara serentak
 */
export function renderAllModules() {
  renderCategoryDropdowns();
  renderOverview();
  renderSirkulasi();
  renderPengembalianFormOptions();
  renderRiwayatPengembalian();
  renderBooksInventory();
  renderPengumumanTable();
}

/**
 * Mengunduh seluruh data tabel dari cloud Supabase ke memori lokal
 */
export async function fetchAllData() {
  if (!db) {
    showToast('Koneksi Supabase tidak terinisialisasi.', 'error');
    return;
  }

  try {
    // 1. Kategori Buku
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

    // 5. Transaksi Peminjaman
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

    // 7. Pengumuman & Agenda Event
    const { data: pengumumanData, error: pengumumanErr } = await db
      .from('data_pengumuman')
      .select('*')
      .order('id_pengumuman', { ascending: false });
    if (pengumumanErr) throw pengumumanErr;
    state.cache.pengumuman = pengumumanData || [];

    // Perbarui seluruh tampilan layar
    renderAllModules();
  } catch (err) {
    console.error('Terjadi gangguan saat mengambil data Supabase:', err);
    showToast('Gagal memuat data dari database. Silakan refresh halaman.', 'error');
  }
}

// Daftarkan ke window agar bisa diakses global oleh seluruh modul tanpa circular dependency issues
if (typeof window !== 'undefined') {
  window.fetchAllData = fetchAllData;
  window.renderAllModules = renderAllModules;
}
