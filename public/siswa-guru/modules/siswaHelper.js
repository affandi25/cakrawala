/**
 * CAKRAWALA Digital Library - Utility Helpers Dashboard Siswa & Guru
 * File: public/siswa-guru/modules/siswaHelper.js
 */

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
    return {
      days: diffDays,
      isOverdue: true,
      text: `Terlambat ${late} Hari!`,
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200'
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      isOverdue: false,
      text: 'Batas Tempo Hari Ini!',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  } else if (diffDays <= 2) {
    return {
      days: diffDays,
      isOverdue: false,
      text: `Sisa ${diffDays} Hari Lagi`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  } else {
    return {
      days: diffDays,
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
