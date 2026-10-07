/**
 * CAKRAWALA Digital Library - Data Synchronization Siswa & Guru
 * File: public/siswa-guru/modules/data.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import { showToast } from './siswaHelper.js';
import { renderOverview } from './overview.js';
import { renderKatalogGrid, renderKategoriOptions } from './katalog.js';
import { renderPinjamanTables } from './pinjaman.js';
import { renderRiwayatTable } from './riwayat.js';
import { renderProfil } from './profil.js';

/**
 * Menjalankan render ke seluruh modul tampilan secara serentak
 */
export function renderAllMemberModules() {
  renderKategoriOptions();
  renderOverview();
  renderKatalogGrid();
  renderPinjamanTables();
  renderRiwayatTable();
  renderProfil();
}

/**
 * Mengunduh seluruh data relevan anggota dari cloud Supabase
 */
export async function fetchAllMemberData() {
  if (!db) {
    showToast('Koneksi Supabase tidak terinisialisasi.', 'error');
    return;
  }

  try {
    // 1. Unduh Kategori Buku
    const { data: katData, error: errKat } = await db
      .from('data_kategori')
      .select('*')
      .order('id_kategori', { ascending: true });
    if (errKat) throw errKat;
    state.cache.kategori = katData || [];

    // 2. Unduh Seluruh Katalog Buku
    const { data: bukuData, error: errBuku } = await db
      .from('data_buku')
      .select('*')
      .order('id_buku', { ascending: true });
    if (errBuku) throw errBuku;
    state.cache.buku = bukuData || [];

    // 3. Unduh Riwayat Peminjaman Pribadi Siswa/Guru (berdasarkan NISN/NIP)
    if (state.memberId) {
      const { data: pinjamData, error: errPinjam } = await db
        .from('data_peminjaman')
        .select('*')
        .eq('nisn_siswa', state.memberId)
        .order('tanggal_pinjam', { ascending: false });
      if (errPinjam) throw errPinjam;
      state.cache.peminjaman = pinjamData || [];

      // 4. Unduh Riwayat Pengembalian & Denda untuk transaksi milik user ini
      const loanIds = (state.cache.peminjaman || []).map(p => p.id_peminjaman);
      if (loanIds.length > 0) {
        const { data: returnData, error: errReturn } = await db
          .from('data_pengembalian')
          .select('*')
          .in('id_peminjaman', loanIds)
          .order('tanggal_kembali', { ascending: false });
        if (errReturn) throw errReturn;
        state.cache.pengembalian = returnData || [];
      } else {
        state.cache.pengembalian = [];
      }

      // 5. Filter denda yang belum lunas
      state.unpaidFines = (state.cache.pengembalian || []).filter(r => r.status_denda === 'Belum Lunas');
    }

    renderAllMemberModules();
  } catch (err) {
    console.error('Terjadi gangguan saat mengambil data anggota:', err);
    showToast('Gagal memuat data dari database. Silakan refresh halaman.', 'error');
  }
}

if (typeof window !== 'undefined') {
  window.fetchAllMemberData = fetchAllMemberData;
  window.renderAllMemberModules = renderAllMemberModules;
}
