/**
 * CAKRAWALA Digital Library - Utility Helpers Dashboard Siswa & Guru
 * File: public/siswa-guru/modules/utils.js
 */

/**
 * Format angka ke mata uang Rupiah
 */
export function formatRupiah(amount) {
  const val = Number(amount) || 0;
  return 'Rp ' + val.toLocaleString('id-ID');
}

/**
 * Format tanggal YYYY-MM-DD ke teks bahasa Indonesia (contoh: 5 Okt 2026)
 */
export function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * String tanggal hari ini format 'YYYY-MM-DD'
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Menambahkan sejumlah hari ke tanggal
 */
export function addDaysToDate(dateStr, days) {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Menghitung selisih hari antara 2 tanggal
 */
export function calculateDateDiffInDays(startStr, endStr) {
  try {
    const d1 = new Date(startStr);
    const d2 = new Date(endStr);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
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

/**
 * Menampilkan modal pop-up dengan animasi
 */
export function showModal(modalEl, contentEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  setTimeout(() => {
    modalEl.classList.remove('opacity-0');
    if (contentEl) {
      contentEl.classList.remove('scale-95');
      contentEl.classList.add('scale-100');
    }
  }, 10);
}

/**
 * Menutup modal pop-up
 */
export function hideModal(modalEl, contentEl) {
  if (!modalEl) return;
  modalEl.classList.add('opacity-0');
  if (contentEl) {
    contentEl.classList.remove('scale-100');
    contentEl.classList.add('scale-95');
  }
  setTimeout(() => {
    modalEl.classList.add('hidden');
  }, 200);
}

/**
 * Menampilkan pesan toast mengambang di pojok kanan bawah
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl border animate-toast';

  let iconHtml = '<i class="ph-fill ph-info text-2xl text-navy"></i>';
  let borderColor = 'border-slate-200';

  if (type === 'success') {
    iconHtml = '<i class="ph-fill ph-check-circle text-2xl text-emerald-600"></i>';
    borderColor = 'border-emerald-200 bg-emerald-50/50';
  } else if (type === 'error') {
    iconHtml = '<i class="ph-fill ph-warning-circle text-2xl text-rose-600"></i>';
    borderColor = 'border-rose-200 bg-rose-50/50';
  } else if (type === 'warning') {
    iconHtml = '<i class="ph-fill ph-warning text-2xl text-amber-600"></i>';
    borderColor = 'border-amber-200 bg-amber-50/50';
  }

  toast.className += ` ${borderColor}`;
  toast.innerHTML = `
    <div class="shrink-0">${iconHtml}</div>
    <div class="flex-1 text-xs font-semibold text-slate-800 leading-snug">${message}</div>
    <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600">
      <i class="ph ph-x text-base"></i>
    </button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}
