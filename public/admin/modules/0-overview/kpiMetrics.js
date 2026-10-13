/**
 * CAKRAWALA Digital Library - Modul KPI Metrics & Status Sistem
 * File: public/admin/modules/0-overview/kpiMetrics.js
 * 
 * Tanggung Jawab:
 * - Menghitung total data Siswa, Guru, dan Petugas via Supabase
 * - Mengecek dan menampilkan status koneksi database
 * - Memperbarui elemen metrik di header dan badge di sidebar
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state, DOM } from '../state.js';

/**
 * Menghitung dan menampilkan total jumlah pengguna ke kartu ringkasan KPI
 */
export async function loadKpiStats() {
  console.log('[Admin KPI] Memulai kalkulasi metrik pengguna dari Supabase...');
  try {
    const [siswaRes, guruRes, petugasRes] = await Promise.all([
      db.from('data_siswa').select('nisn_siswa', { count: 'exact', head: true }),
      db.from('data_guru').select('nip_guru', { count: 'exact', head: true }),
      db.from('data_petugas').select('id_petugas', { count: 'exact', head: true })
    ]);

    const countSiswa = (siswaRes && typeof siswaRes.count === 'number') ? siswaRes.count : 0;
    const countGuru = (guruRes && typeof guruRes.count === 'number') ? guruRes.count : 0;
    const countPetugas = (petugasRes && typeof petugasRes.count === 'number') ? petugasRes.count : 0;

    console.log('[Admin KPI] Data berhasil dimuat:', {
      siswa: countSiswa,
      guru: countGuru,
      petugas: countPetugas
    });

    // 1. Update elemen target angka kartu KPI di header.html
    const elSiswa = document.getElementById('totalSiswa') || document.querySelector('[data-stat="siswa"]');
    const elGuru = document.getElementById('totalGuru') || document.querySelector('[data-stat="guru"]');
    const elPetugas = document.getElementById('totalPetugas') || document.querySelector('[data-stat="petugas"]');
    const elStatus = document.getElementById('statusKoneksi');
    const elDbStatus = document.getElementById('dbStatus');

    if (elSiswa) {
      elSiswa.textContent = countSiswa;
      console.log(`[Admin KPI] Nilai totalSiswa berhasil di-update: ${countSiswa}`);
    }
    if (elGuru) {
      elGuru.textContent = countGuru;
      console.log(`[Admin KPI] Nilai totalGuru berhasil di-update: ${countGuru}`);
    }
    if (elPetugas) {
      elPetugas.textContent = countPetugas;
      console.log(`[Admin KPI] Nilai totalPetugas berhasil di-update: ${countPetugas}`);
    }
    if (elStatus) {
      elStatus.textContent = 'Online';
      elStatus.className = 'text-2xl font-black tracking-tight text-emerald-600';
    }
    if (elDbStatus) {
      elDbStatus.textContent = 'Supabase Cloud Aktif';
    }

    // 2. Sinkronkan juga ke badge navigasi sidebar
    if (DOM.badgeCountSiswa) DOM.badgeCountSiswa.textContent = countSiswa;
    if (DOM.badgeCountGuru) DOM.badgeCountGuru.textContent = countGuru;
    if (DOM.badgeCountPetugas) DOM.badgeCountPetugas.textContent = countPetugas;

    return { countSiswa, countGuru, countPetugas };

  } catch (err) {
    console.error('[Admin KPI] Gagal memuat statistik KPI:', err);
    const elStatus = document.getElementById('statusKoneksi');
    const elDbStatus = document.getElementById('dbStatus');
    if (elStatus) {
      elStatus.textContent = 'Offline';
      elStatus.className = 'text-2xl font-black tracking-tight text-rose-600';
    }
    if (elDbStatus) {
      elDbStatus.textContent = 'Koneksi Terputus';
    }
    return null;
  }
}

/**
 * Inisialisasi modul metrik KPI
 */
export function initKpiMetrics() {
  console.log('[Admin KPI] Menginisialisasi Modul 0-Overview (KPI Metrics)...');
  return loadKpiStats();
}
