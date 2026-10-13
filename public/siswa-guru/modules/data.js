/**
 * CAKRAWALA Digital Library - Data Synchronization Siswa & Guru
 * File: public/siswa-guru/modules/data.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import { showToast } from './siswaHelper.js';
import { renderBeranda } from './0-beranda/index.js';
import { renderKatalogGrid, renderKategoriOptions } from './1-katalog/index.js';
import { renderPinjamanTables, renderRiwayatTable } from './3-riwayat/index.js';
import { renderProfil } from './4-profil/index.js';

/**
 * Menjalankan render ke seluruh modul tampilan secara serentak
 */
export function renderAllMemberModules() {
  renderKategoriOptions();
  renderBeranda();
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

      // 5. Bersihkan riwayat selesai yang lunas/bebas denda jika >= 1 minggu (Opsi B)
      await cleanupExpiredFinishedLoans();

      // 6. Filter denda yang belum lunas
      state.unpaidFines = (state.cache.pengembalian || []).filter(r => r.status_denda === 'Belum Lunas');
    }

    renderAllMemberModules();
  } catch (err) {
    console.error('Terjadi gangguan saat mengambil data anggota:', err);
    showToast('Gagal memuat data dari database. Silakan refresh halaman.', 'error');
  }
}

/**
 * Membersihkan riwayat pengembalian yang sudah Lunas atau Bebas Denda jika >= 7 hari (Opsi B)
 */
export async function cleanupExpiredFinishedLoans() {
  const allLoans = state.cache.peminjaman || [];
  const allReturns = state.cache.pengembalian || [];
  if (!allLoans || allLoans.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredReturnIds = [];
  const expiredLoanIds = [];

  for (const loan of allLoans) {
    if (loan.status === 'Selesai' || loan.status === 'Kembali') {
      const returnRecord = (allReturns || []).find(r => r.id_peminjaman === loan.id_peminjaman);
      const isLunasOrBebas = !returnRecord || returnRecord.status_denda === 'Lunas' || returnRecord.status_denda === 'Tidak Ada';

      if (isLunasOrBebas) {
        const dateStr = returnRecord?.tanggal_kembali || loan.batas_kembali || loan.tanggal_pinjam;
        if (dateStr) {
          const returnDate = new Date(dateStr);
          returnDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((today.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 7) {
            expiredLoanIds.push(loan.id_peminjaman);
            if (returnRecord?.id_pengembalian) {
              expiredReturnIds.push(returnRecord.id_pengembalian);
            }
          }
        }
      }
    }
  }

  if (expiredLoanIds.length > 0 && db) {
    try {
      if (expiredReturnIds.length > 0) {
        await db.from('data_pengembalian').delete().in('id_pengembalian', expiredReturnIds);
      }
      await db.from('data_peminjaman').delete().in('id_peminjaman', expiredLoanIds);
    } catch (err) {
      console.warn('[data] Gagal membersihkan riwayat kadaluarsa di Supabase:', err);
    }
    state.cache.peminjaman = allLoans.filter(l => !expiredLoanIds.includes(l.id_peminjaman));
    state.cache.pengembalian = allReturns.filter(r => !expiredReturnIds.includes(r.id_pengembalian));
  }
}

if (typeof window !== 'undefined') {
  window.fetchAllMemberData = fetchAllMemberData;
  window.renderAllMemberModules = renderAllMemberModules;
}
