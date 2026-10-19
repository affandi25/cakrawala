/**
 * CAKRAWALA Digital Library - Utility Helpers Dashboard Siswa & Guru
 * File: public/siswa-guru/modules/core/siswaHelper.js
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
  setTarifDendaHarian
} from '../../../assets/js/sharedUtils.js';

/**
 * Batas maksimal kuota peminjaman aktif per anggota (dipinjam + tiket antrean)
 */
export const MAX_ACTIVE_LOANS = 2;

/**
 * Menghitung total peminjaman aktif pengguna saat ini (buku yang sedang dipinjam + antrean booking)
 * @returns {number}
 */
export function getUserActiveLoansCount() {
  const memberId = state.memberId;
  const loans = state.cache.peminjaman || [];
  return loans.filter(p => {
    const isUser = !memberId || p.nisn_siswa === memberId;
    return isUser && (p.status === 'Menunggu' || p.status === 'Dipinjam');
  }).length;
}

/**
 * Memeriksa apakah pengguna saat ini sedang memiliki transaksi aktif untuk buku tertentu
 * @param {string} bookId 
 * @returns {object|null}
 */
export function getActiveUserLoanForBook(bookId) {
  const memberId = state.memberId;
  const loans = state.cache.peminjaman || [];
  const cleanId = String(bookId || '').trim().toLowerCase();
  return loans.find(p => {
    const isUser = !memberId || p.nisn_siswa === memberId;
    const isBook = String(p.id_buku || '').trim().toLowerCase() === cleanId;
    return isUser && isBook && (p.status === 'Menunggu' || p.status === 'Dipinjam');
  }) || null;
}

/**
 * Menghitung sisa hari sebelum batas waktu pengembalian
 */
export function getRemainingDays(batasKembaliStr) {
  if (!batasKembaliStr) return { days: 0, isOverdue: false, text: '-', badgeClass: 'bg-slate-100 text-slate-600' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(batasKembaliStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const late = Math.abs(diffDays);
    const isMonthOverdue = late >= 30;
    return {
      days: diffDays,
      lateDays: late,
      isOverdue: true,
      isMonthOverdue: isMonthOverdue,
      text: isMonthOverdue ? `Terlambat ${late} Hari (≥ 1 Bulan!)` : `Terlambat ${late} Hari!`,
      badgeClass: isMonthOverdue
        ? 'bg-rose-600 text-white border-rose-700 font-extrabold shadow-2xs'
        : 'bg-rose-100 text-rose-700 border-rose-200'
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      lateDays: 0,
      isOverdue: false,
      text: 'Batas Tempo Hari Ini!',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  } else if (diffDays <= 2) {
    return {
      days: diffDays,
      lateDays: 0,
      isOverdue: false,
      text: `Sisa ${diffDays} Hari Lagi`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  } else {
    return {
      days: diffDays,
      lateDays: 0,
      isOverdue: false,
      text: `Sisa ${diffDays} Hari`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }
}

/**
 * Menghasilkan ID unik acak
 */
export function generateRandomId(prefix = 'TRX', length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}
