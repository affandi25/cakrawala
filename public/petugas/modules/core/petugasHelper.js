/**
 * CAKRAWALA Digital Library - Utility & Helper Functions Dashboard Petugas
 * File: public/petugas/modules/core/petugasHelper.js
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
  showToast,
  getTarifDendaHarian,
  setTarifDendaHarian,
  fetchTarifDendaFromDB
} from '../../../assets/js/sharedUtils.js';

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
      kontak: siswa.kontak_siswa || '-',
      foto: siswa.foto_profil || null
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
      kontak: guru.kontak_guru || '-',
      foto: guru.foto_profil || null
    };
  }

  return {
    type: 'unknown',
    nama: id,
    id: id,
    sub: 'Anggota Perpustakaan',
    badge: 'Anggota',
    kelas: '-',
    kontak: '-',
    foto: null
  };
}

/**
 * Merender elemen avatar peminjam: Menggunakan Foto Profil asli jika ada,
 * atau fallback ke Inisial Huruf bergaya profesional.
 * @param {Object} borrower Objek borrower dari getBorrowerInfo
 * @param {string} sizeClass Ukuran Tailwind (default: 'h-10 w-10')
 * @param {string} roundedClass Kelengkungan (default: 'rounded-xl')
 * @param {string} textClass Tipografi inisial (default: 'text-xs font-bold')
 * @returns {string} HTML string avatar
 */
export function renderBorrowerAvatarHtml(borrower, sizeClass = 'h-10 w-10', roundedClass = 'rounded-xl', textClass = 'text-xs font-bold') {
  if (!borrower) {
    return `<div class="flex ${sizeClass} shrink-0 items-center justify-center ${roundedClass} bg-slate-200 text-slate-500 ${textClass} shadow-2xs">?</div>`;
  }

  const initial = borrower.nama ? borrower.nama.substring(0, 2).toUpperCase() : 'AG';
  const isGuru = borrower.type === 'guru';
  const bgInitials = isGuru ? 'bg-amber-600' : 'bg-navy';

  if (borrower.foto && typeof borrower.foto === 'string' && borrower.foto.trim() !== '') {
    return `
      <div class="relative ${sizeClass} shrink-0 overflow-hidden ${roundedClass} border border-slate-200/80 shadow-2xs bg-slate-100 flex items-center justify-center">
        <img src="${borrower.foto}" class="h-full w-full object-cover" alt="${borrower.nama || 'Anggota'}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'${textClass} text-white\\'>${initial}</span>'; this.parentElement.className='flex ${sizeClass} shrink-0 items-center justify-center ${roundedClass} ${bgInitials} text-white ${textClass} shadow-2xs';" />
      </div>
    `;
  }

  return `
    <div class="flex ${sizeClass} shrink-0 items-center justify-center ${roundedClass} ${bgInitials} text-white ${textClass} shadow-2xs">
      ${initial}
    </div>
  `;
}

