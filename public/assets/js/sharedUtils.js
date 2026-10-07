/**
 * CAKRAWALA Digital Library - Centralized Shared Utilities
 * File: public/assets/js/sharedUtils.js
 * 
 * Sentral utility helper untuk format mata uang, tanggal, modal, sanitasi HTML,
 * dan sistem notifikasi toast mengambang di seluruh dashboard.
 */

/**
 * Format angka ke mata uang Rupiah resmi Indonesia (contoh: 50000 -> "Rp 50.000")
 * @param {number|string} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  const val = Number(amount) || 0;
  return 'Rp ' + val.toLocaleString('id-ID');
}

/**
 * Format tanggal YYYY-MM-DD ke teks bahasa Indonesia (contoh: "2026-09-27" -> "27 Sep 2026")
 * @param {string} dateStr
 * @returns {string}
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
 * Menghasilkan string tanggal hari ini dalam format 'YYYY-MM-DD'
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Menambahkan sejumlah hari ke sebuah tanggal string 'YYYY-MM-DD'
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
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
 * Menghitung selisih hari antara dua tanggal
 * @param {string} startStr
 * @param {string} endStr
 * @returns {number}
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
 * Sanitasi string untuk mencegah injeksi XSS pada innerHTML
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Membuka jendela pop-up modal dengan transisi lembut
 * @param {HTMLElement} modalEl
 * @param {HTMLElement} contentEl
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
 * Menutup jendela pop-up modal dengan transisi lembut
 * @param {HTMLElement} modalEl
 * @param {HTMLElement} contentEl
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
 * Menampilkan pesan notifikasi toast mengambang di kontainer #toastContainer
 * @param {string} message Pesan yang ingin ditampilkan
 * @param {'success'|'error'|'warning'|'info'} type Jenis notifikasi
 * @param {number} duration Durasi tayang dalam milidetik (default: 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl border animate-toast transition-all duration-300';

  let iconHtml = '<i class="ph-fill ph-info text-2xl text-navy"></i>';
  let borderColor = 'border-slate-200';

  if (type === 'success') {
    iconHtml = '<i class="ph-fill ph-check-circle text-2xl text-emerald-600"></i>';
    borderColor = 'border-emerald-200 bg-emerald-50/50 text-emerald-900';
  } else if (type === 'error') {
    iconHtml = '<i class="ph-fill ph-warning-circle text-2xl text-rose-600"></i>';
    borderColor = 'border-rose-200 bg-rose-50/50 text-rose-900';
  } else if (type === 'warning') {
    iconHtml = '<i class="ph-fill ph-warning text-2xl text-amber-600"></i>';
    borderColor = 'border-amber-200 bg-amber-50/50 text-amber-900';
  }

  toast.className += ` ${borderColor}`;
  toast.innerHTML = `
    <div class="shrink-0">${iconHtml}</div>
    <div class="flex-1 text-xs font-semibold leading-snug">${escapeHtml(message)}</div>
    <button type="button" aria-label="Tutup pesan" class="shrink-0 text-slate-400 hover:text-slate-600 p-0.5">
      <i class="ph ph-x text-base"></i>
    </button>
  `;

  const btnClose = toast.querySelector('button');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      toast.remove();
    });
  }

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}
