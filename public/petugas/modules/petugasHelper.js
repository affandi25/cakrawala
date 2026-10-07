/**
 * CAKRAWALA Digital Library - Utility & Helper Functions Dashboard Petugas
 * File: public/petugas/modules/petugasHelper.js
 */

import { state } from './state.js';
export {
  formatRupiah,
  formatTanggalIndo,
  getTodayDateString,
  addDaysToDate,
  calculateDateDiffInDays,
  escapeHtml,
  showModal,
  hideModal,
  showToast
} from '../../assets/js/sharedUtils.js';

/**
 * Menghasilkan kode unik acak untuk transaksi
 * @param {string} prefix
 * @param {number} length
 * @returns {string}
 */
export function generateRandomId(prefix = 'TRX', length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

/**
 * Mengubah file berkas menjadi Base64 DataURL
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Mencari identitas peminjam dari memori cache (baik Siswa maupun Guru)
 * @param {string} id NISN Siswa atau NIP Guru
 */
export function getBorrowerInfo(id) {
  if (!id) {
    return { type: 'unknown', nama: '-', id: '-', sub: '-', badge: 'Anggota', kelas: '-', kontak: '-' };
  }

  const siswa = (state.cache.siswa || []).find(s => s.nisn_siswa === id);
  if (siswa) {
    return {
      type: 'siswa',
      nama: siswa.nama_siswa,
      id: siswa.nisn_siswa,
      sub: `Siswa &bull; Kelas ${siswa.kelas || '-'}`,
      badge: 'Siswa',
      kelas: siswa.kelas || '-',
      kontak: siswa.kontak_siswa || '-'
    };
  }

  const guru = (state.cache.guru || []).find(g => g.nip_guru === id);
  if (guru) {
    return {
      type: 'guru',
      nama: guru.nama_guru,
      id: guru.nip_guru,
      sub: `Guru &bull; ${guru.mata_pelajaran || 'Pengajar'}`,
      badge: 'Guru',
      kelas: guru.mata_pelajaran || 'Guru Pengajar',
      kontak: guru.kontak_guru || '-'
    };
  }

  return {
    type: 'unknown',
    nama: id,
    id: id,
    sub: 'Anggota Perpustakaan',
    badge: 'Anggota',
    kelas: '-',
    kontak: '-'
  };
}
