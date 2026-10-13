/**
 * CAKRAWALA Digital Library - Modul Riwayat & Status Peminjaman
 * File: public/siswa-guru/modules/3-riwayat/riwayatPeminjaman.js
 * 
 * Tanggung Jawab:
 * - Fetch data transaksi pengguna aktif dari Supabase 'data_peminjaman' & 'data_pengembalian'
 * - Render daftar peminjaman aktif & antrean booking ke 'tab-peminjaman.html'
 * - Render riwayat transaksi selesai / kembali ke 'tab-riwayat.html'
 * - Hitung sisa durasi peminjaman dan kalkulasi denda jika melewati tanggal jatuh tempo
 * - Badge status konsisten:
 *   * 'Menunggu'  (kuning: bg-amber-100 text-amber-800 border-amber-200)
 *   * 'Dipinjam'  (biru: bg-blue-100 text-blue-800 border-blue-200)
 *   * 'Kembali'   (hijau: bg-emerald-100 text-emerald-800 border-emerald-200)
 *   * 'Terlambat' (merah: bg-rose-100 text-rose-700 border-rose-200)
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayDateString,
  calculateDateDiffInDays,
  escapeHtml,
  showToast
} from '../../../assets/js/sharedUtils.js';

let isRiwayatModuleSetup = false;

/**
 * Menghitung selisih hari dan informasi status jatuh tempo buku aktif
 * @param {string} batasKembaliStr Tanggal batas kembali (YYYY-MM-DD)
 * @returns {object} { days, lateDays, isOverdue, isMonthOverdue, text, badgeClass }
 */
export function getRemainingDaysInfo(batasKembaliStr) {
  if (!batasKembaliStr) {
    return {
      days: 0,
      lateDays: 0,
      isOverdue: false,
      isMonthOverdue: false,
      text: '-',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

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
      isMonthOverdue,
      text: isMonthOverdue ? `Terlambat ${late} Hari (≥ 1 Bulan!)` : `Terlambat ${late} Hari!`,
      badgeClass: isMonthOverdue
        ? 'bg-rose-600 text-white border-rose-700 font-extrabold shadow-2xs'
        : 'bg-rose-100 text-rose-700 border-rose-200 font-bold'
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      lateDays: 0,
      isOverdue: false,
      isMonthOverdue: false,
      text: 'Jatuh Tempo Hari Ini!',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
    };
  } else if (diffDays <= 2) {
    return {
      days: diffDays,
      lateDays: 0,
      isOverdue: false,
      isMonthOverdue: false,
      text: `Sisa ${diffDays} Hari Lagi`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
    };
  } else {
    return {
      days: diffDays,
      lateDays: 0,
      isOverdue: false,
      isMonthOverdue: false,
      text: `Sisa ${diffDays} Hari`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold'
    };
  }
}

/**
 * Menghitung estimasi denda keterlambatan buku aktif
 * Aturan Denda:
 * - Rp 1.000 / hari keterlambatan
 * - Jika terlambat >= 30 hari (1 bulan), denda diganti biaya ganti rugi seharga buku
 * 
 * @param {string} batasKembaliStr Tanggal batas kembali (YYYY-MM-DD)
 * @param {number} [hargaBuku=50000] Harga buku untuk ganti rugi jika terlambat >= 1 bulan
 * @returns {object} { denda, lateDays, isOverdue, isMonthOverdue }
 */
export function calculateDendaEstimasi(batasKembaliStr, hargaBuku = 50000) {
  if (!batasKembaliStr) return { denda: 0, lateDays: 0, isOverdue: false, isMonthOverdue: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(batasKembaliStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const lateDays = Math.abs(diffDays);
    const isMonthOverdue = lateDays >= 30;
    const nominalHarga = Number(hargaBuku) || 50000;
    const denda = isMonthOverdue ? nominalHarga : (lateDays * 1000);
    return {
      denda,
      lateDays,
      isOverdue: true,
      isMonthOverdue
    };
  }

  return { denda: 0, lateDays: 0, isOverdue: false, isMonthOverdue: false };
}

/**
 * Mengunduh (fetch) data transaksi pengguna aktif dari Supabase
 * @returns {Promise<void>}
 */
export async function loadRiwayatData() {
  if (!db) {
    console.warn('[3-riwayat] Supabase client belum terinisialisasi.');
    return;
  }

  if (!state.memberId) {
    console.warn('[3-riwayat] Member ID belum tersedia untuk fetch riwayat.');
    return;
  }

  try {
    // 1. Ambil seluruh transaksi peminjaman milik anggota ini
    const { data: loansData, error: errLoans } = await db
      .from('data_peminjaman')
      .select('*')
      .eq('nisn_siswa', state.memberId)
      .order('tanggal_pinjam', { ascending: false });

    if (errLoans) throw errLoans;
    state.cache.peminjaman = loansData || [];

    // 2. Ambil data pengembalian & catatan denda untuk transaksi anggota ini
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

    // Filter denda yang belum lunas
    state.unpaidFines = (state.cache.pengembalian || []).filter(r => r.status_denda === 'Belum Lunas');

    // Render ulang tampilan terkait
    renderPinjamanTables();
    renderRiwayatTable();
  } catch (err) {
    console.error('[3-riwayat] Gagal memuat data riwayat peminjaman:', err);
    showToast('Gagal menyinkronkan data riwayat: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Merender daftar buku yang sedang aktif dipinjam (status 'Dipinjam') ke 'tab-peminjaman.html'
 */
export function renderActiveLoansTable() {
  const container = document.getElementById('containerListPinjamanAktif');
  const badgeCount = document.getElementById('badgeCountPinjamanAktif');
  if (!container) return;

  const list = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam');
  if (badgeCount) badgeCount.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-2xs">
          <i class="ph ph-book-open text-3xl"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada buku yang sedang kamu pinjam</h4>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Jelajahi koleksi buku di menu Katalog dan lakukan reservasi pra-pinjam untuk mulai membaca.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
    const judul = book ? book.judul_buku : item.id_buku;
    const penulis = book ? book.penulis : '-';
    const rak = book ? (book.keterangan || 'Rak Umum') : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;
    const hargaBuku = book ? (Number(book.harga_buku) || 50000) : 50000;

    const dueInfo = getRemainingDaysInfo(item.batas_kembali);
    const dendaInfo = calculateDendaEstimasi(item.batas_kembali, hargaBuku);

    return `
      <div class="p-5 rounded-2xl border ${dueInfo.isMonthOverdue ? 'border-rose-400 bg-rose-50/20' : (dueInfo.isOverdue ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200/80 bg-white')} hover:border-slate-300 transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-xs font-bold text-navy px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  ${escapeHtml(item.id_peminjaman)}
                </span>
                
                <!-- Badge Status: Dipinjam (Biru) -->
                <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
                  <i class="ph ph-book-open text-xs"></i>
                  <span>Dipinjam</span>
                </span>

                <!-- Badge Indikator Terlambat (Merah) jika jatuh tempo lewat -->
                ${dueInfo.isOverdue ? `
                  <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                    <span>Terlambat (${formatRupiah(dendaInfo.denda)})</span>
                  </span>
                ` : ''}
              </div>
              <h4 class="font-bold text-slate-800 text-sm mt-1 line-clamp-1">${escapeHtml(judul)}</h4>
              <p class="text-xs text-slate-500">${escapeHtml(penulis)} &bull; Lokasi: <span class="text-navy font-bold">${escapeHtml(rak)}</span></p>
            </div>
          </div>

          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs border ${dueInfo.badgeClass}">
              ${dueInfo.text}
            </span>
            <div class="text-right text-[11px] text-slate-500 mt-1">
              <span>Pinjam: <strong>${formatTanggalIndo(item.tanggal_pinjam)}</strong></span>
              <span class="block ${dueInfo.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700 font-semibold'}">
                Batas Tempo: ${formatTanggalIndo(item.batas_kembali)}
              </span>
            </div>
          </div>
        </div>

        ${dueInfo.isMonthOverdue ? `
          <div class="mt-3.5 p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <i class="ph-fill ph-warning-octagon text-rose-600 text-xl shrink-0 mt-0.5"></i>
            <div class="space-y-1">
              <div class="flex items-center gap-2 font-black text-rose-950">
                <span>Peringatan Keterlambatan: Melebihi 1 Bulan (${dueInfo.lateDays} Hari)!</span>
                <span class="rounded bg-rose-700 text-white px-2 py-0.5 text-[10px] font-bold">Denda Seharga Buku</span>
              </div>
              <p class="text-[11px] leading-relaxed text-rose-800">
                Perhitungan denda harian telah dihentikan. Ditetapkan biaya ganti rugi seharga buku fisik sebesar 
                <strong class="text-rose-950 font-black text-xs underline">${formatRupiah(hargaBuku)}</strong>. 
                Harap segera temui Petugas Sirkulasi untuk proses penyelesaian.
              </p>
            </div>
          </div>
        ` : (dueInfo.isOverdue ? `
          <div class="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
            <span class="flex items-center gap-1.5 font-medium">
              <i class="ph ph-warning-circle text-amber-600 text-sm"></i>
              <span>Terlambat ${dueInfo.lateDays} hari. Denda berjalan: <strong>${formatRupiah(dendaInfo.denda)}</strong> (Rp 1.000/hari).</span>
            </span>
            <span class="text-slate-500 text-[10px]">Harap segera kembalikan ke meja sirkulasi</span>
          </div>
        ` : '')}

        <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60 -mx-5 -mb-5 px-5 py-2.5 rounded-b-2xl">
          <span class="flex items-center gap-1.5 text-[11px]">
            <i class="ph ${dueInfo.isOverdue ? 'ph-warning text-rose-600 font-bold' : 'ph-info text-navy'} text-sm"></i>
            <span class="${dueInfo.isOverdue ? 'text-rose-700 font-semibold' : ''}">
              ${dueInfo.isOverdue ? 'Segera kembalikan buku fisik ke meja perpustakaan.' : 'Kembalikan buku fisik tepat waktu ke meja sirkulasi untuk menghindari denda.'}
            </span>
          </span>
          <span class="font-bold text-navy text-[11px]">&bull; Sedang Dipinjam</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Merender daftar antrean booking pra-pinjam (status 'Menunggu') ke 'tab-peminjaman.html'
 */
export function renderPendingReservationsTable() {
  const container = document.getElementById('containerListPinjamanPrapinjam');
  const badgeCount = document.getElementById('badgeCountPinjamanPrapinjam');
  if (!container) return;

  const list = (state.cache.peminjaman || []).filter(p => p.status === 'Menunggu');
  if (badgeCount) badgeCount.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 shadow-2xs">
          <i class="ph ph-ticket text-3xl"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-700">Tidak ada antrean pra-pinjam yang menunggu</h4>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Semua pesanan buku online telah diambil atau kamu belum mengajukan reservasi baru.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
    const judul = book ? book.judul_buku : item.id_buku;
    const penulis = book ? book.penulis : '-';
    const rak = book ? (book.keterangan || 'Rak Umum') : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;

    const isReady = item.status_persiapan === 'Siap Diambil';
    const cardBorderBg = isReady 
      ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400' 
      : 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300';

    return `
      <div class="p-5 rounded-2xl border ${cardBorderBg} transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs font-extrabold text-navy px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  TIKET: ${escapeHtml(item.id_peminjaman)}
                </span>

                <!-- Badge Status: Menunggu (Kuning) -->
                ${isReady ? `
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Siap di Meja Sirkulasi</span>
                  </span>
                ` : `
                  <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Menunggu</span>
                  </span>
                `}
              </div>
              <h4 class="font-bold text-slate-800 text-sm mt-1.5 line-clamp-1">${escapeHtml(judul)}</h4>
              <p class="text-xs text-slate-500">${escapeHtml(penulis)} &bull; Lokasi: <strong class="text-navy">${escapeHtml(rak)}</strong></p>
            </div>
          </div>

          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
            <div class="text-left sm:text-right text-[11px] text-slate-600">
              <span>Waktu Booking: ${formatTanggalIndo(item.tanggal_pinjam)}</span>
              <span class="block text-navy font-semibold">Durasi Pinjam: 7 Hari (Saat Diserahkan)</span>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" onclick="window.showTicketDetails('${item.id_peminjaman}')"
                class="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white hover:bg-navy-light px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer">
                <i class="ph ph-qr-code text-base"></i>
                <span>Lihat QR Tiket</span>
              </button>
              <button type="button" onclick="window.openCancelBookingModal('${item.id_peminjaman}')"
                class="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer">
                <i class="ph ph-trash"></i>
                <span>Batalkan</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3.5 pt-2.5 border-t ${isReady ? 'border-emerald-200/70 text-emerald-800 font-bold' : 'border-amber-200/50 text-amber-800 font-medium'} flex items-center justify-between text-[11px]">
          ${isReady ? `
            <span class="flex items-center gap-1.5">
              <i class="ph-fill ph-check-circle text-emerald-600 text-base"></i>
              <span>Buku sudah disiapkan oleh petugas. Segera ambil di Meja 2 Sirkulasi!</span>
            </span>
          ` : `
            <span class="flex items-center gap-1.5">
              <i class="ph ph-hourglass-high text-amber-600 text-base"></i>
              <span>Permintaan telah masuk ke antrean Meja 2 Petugas Sirkulasi.</span>
            </span>
          `}
          <span class="text-slate-400 font-mono text-[10px]">Kode: ${escapeHtml(item.id_peminjaman)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Menampilkan detail tiket QR dari daftar antrean
 * @param {string} loanId ID Peminjaman
 */
export function showTicketDetails(loanId) {
  const item = (state.cache.peminjaman || []).find(p => p.id_peminjaman === loanId);
  if (!item) {
    showToast('Data peminjaman tidak ditemukan.', 'error');
    return;
  }
  const book = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);
  if (window.showTicketSuccessModal) {
    window.showTicketSuccessModal({
      id: item.id_peminjaman,
      buku: book ? book.judul_buku : (item.id_buku || 'Buku'),
      rak: book?.keterangan || 'Rak Umum',
      tempo: '7 Hari (Mulai Serah Terima)',
      peminjam: state.userProfile?.nama_siswa || state.userProfile?.nama_guru || state.memberId,
      nisn: state.memberId,
      statusPersiapan: item.status_persiapan
    });
  }
}

/**
 * Merender kedua tabel pinjaman (aktif & antrean pra-pinjam)
 */
export function renderPinjamanTables() {
  renderActiveLoansTable();
  renderPendingReservationsTable();

  // Sinkronkan badge sidebar jika ada
  const badgeSidebar = document.getElementById('badgeSidebarActiveCount');
  if (badgeSidebar) {
    const activeCount = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam').length;
    badgeSidebar.textContent = activeCount;
    badgeSidebar.classList.toggle('hidden', activeCount === 0);
  }
}

/**
 * Berpindah sub-tab pinjaman ('aktif' atau 'prapinjam')
 * @param {string} subtabKey 'aktif' | 'prapinjam'
 */
export function switchPinjamanSubtab(subtabKey) {
  state.activePinjamanSubtab = subtabKey;

  const btnAktif = document.getElementById('subTabBtnPinjamanAktif');
  const btnPrapinjam = document.getElementById('subTabBtnPinjamanPrapinjam');
  const panelAktif = document.getElementById('subPanelPinjamanAktif');
  const panelPrapinjam = document.getElementById('subPanelPinjamanPrapinjam');

  if (subtabKey === 'aktif') {
    if (btnAktif) btnAktif.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
    if (btnPrapinjam) btnPrapinjam.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
    if (panelAktif) panelAktif.classList.remove('hidden');
    if (panelPrapinjam) panelPrapinjam.classList.add('hidden');
  } else {
    if (btnPrapinjam) btnPrapinjam.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
    if (btnAktif) btnAktif.className = 'subtab-pinjaman-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
    if (panelPrapinjam) panelPrapinjam.classList.remove('hidden');
    if (panelAktif) panelAktif.classList.add('hidden');
  }

  renderPinjamanTables();
}

/**
 * Merender daftar riwayat buku yang telah selesai/kembali beserta rincian denda ke 'tab-riwayat.html'
 */
export function renderRiwayatTable() {
  const container = document.getElementById('containerListRiwayat');
  const recordCount = document.getElementById('riwayatRecordCount');
  const filterSelect = document.getElementById('selectFilterStatusDenda');
  if (!container) return;

  // Transaksi berstatus 'Selesai' atau 'Kembali'
  const finishedLoans = (state.cache.peminjaman || []).filter(p => p.status === 'Selesai' || p.status === 'Kembali');
  const filterVal = filterSelect ? filterSelect.value : '';

  let list = finishedLoans.map(loan => {
    const returnRecord = (state.cache.pengembalian || []).find(r => r.id_peminjaman === loan.id_peminjaman);
    const book = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);

    return {
      loan,
      book,
      returnRecord: returnRecord || {
        tanggal_kembali: loan.batas_kembali,
        keterlambatan: 0,
        kondisi_buku: 'Baik',
        denda: 0,
        status_denda: 'Tidak Ada'
      }
    };
  });

  if (filterVal) {
    list = list.filter(item => item.returnRecord.status_denda === filterVal);
  }

  if (recordCount) recordCount.textContent = `${list.length} Riwayat`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3 shadow-2xs">
          <i class="ph ph-clock-counter-clockwise text-3xl"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-700">Belum ada catatan riwayat peminjaman</h4>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Buku yang telah selesai kamu kembalikan akan otomatis tercatat di halaman riwayat ini.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const { loan, book, returnRecord } = item;
    const judul = book ? book.judul_buku : loan.id_buku;
    const penulis = book ? book.penulis : '-';
    const coverUrl = book && book.cover_url ? book.cover_url : null;
    const nominalDenda = Number(returnRecord.denda) || 0;

    let badgeDenda = '';
    if (returnRecord.status_denda === 'Belum Lunas') {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
          Belum Lunas (${formatRupiah(nominalDenda)})
        </span>
      `;
    } else if (returnRecord.status_denda === 'Lunas') {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
          <i class="ph ph-check-circle text-xs"></i>
          Lunas (${formatRupiah(nominalDenda)})
        </span>
      `;
    } else {
      badgeDenda = `
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold">
          Bebas Denda (Rp 0)
        </span>
      `;
    }

    return `
      <div class="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-14 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Cover" class="h-full w-full object-cover" />` : '<i class="ph ph-book text-xl"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] font-bold text-slate-400">#${escapeHtml(loan.id_peminjaman)}</span>
                
                <!-- Badge Status: Kembali (Hijau) -->
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.2 text-[10px] font-bold">
                  <i class="ph ph-check-circle text-xs"></i>
                  <span>Kembali</span>
                </span>
              </div>
              <h4 class="font-bold text-slate-800 text-sm line-clamp-1 mt-0.5">${escapeHtml(judul)}</h4>
              <p class="text-xs text-slate-500">${escapeHtml(penulis)}</p>
            </div>
          </div>

          <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <div>${badgeDenda}</div>
            <div class="text-right text-[11px] text-slate-500 mt-1">
              <span>Dikembalikan: <strong>${formatTanggalIndo(returnRecord.tanggal_kembali)}</strong></span>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-3 text-[11px]">
            <span>Kondisi Buku: <strong class="text-slate-700">${escapeHtml(returnRecord.kondisi_buku || 'Baik')}</strong></span>
            <span>&bull;</span>
            <span>Keterlambatan: <strong class="${(returnRecord.keterlambatan || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}">${returnRecord.keterlambatan || 0} Hari</strong></span>
          </div>
          <span class="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
            <i class="ph-fill ph-check-circle text-emerald-600"></i>
            <span>Selesai</span>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Setup seluruh event listener pada modul riwayat & peminjaman
 */
export function setupRiwayatModule() {
  if (isRiwayatModuleSetup) return;
  isRiwayatModuleSetup = true;

  // Sub-tabs switcher di tab-peminjaman
  const btnSubtabAktif = document.getElementById('subTabBtnPinjamanAktif');
  const btnSubtabPrapinjam = document.getElementById('subTabBtnPinjamanPrapinjam');

  if (btnSubtabAktif) {
    btnSubtabAktif.addEventListener('click', () => switchPinjamanSubtab('aktif'));
  }
  if (btnSubtabPrapinjam) {
    btnSubtabPrapinjam.addEventListener('click', () => switchPinjamanSubtab('prapinjam'));
  }

  // Filter denda di tab-riwayat
  const filterDendaSelect = document.getElementById('selectFilterStatusDenda');
  if (filterDendaSelect) {
    filterDendaSelect.addEventListener('change', () => {
      renderRiwayatTable();
    });
  }
}
