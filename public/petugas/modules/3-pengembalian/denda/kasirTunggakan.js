/**
 * CAKRAWALA Digital Library - Modul Kasir Tunggakan Denda
 * Path: public/petugas/modules/3-pengembalian/denda/kasirTunggakan.js
 * 
 * FUNGSI:
 * - Menampilkan daftar tagihan denda siswa/guru yang berstatus 'Belum Lunas'
 * - Pencarian cepat berdasarkan nama peminjam, ID pinjam, atau judul buku
 * - Modal verifikasi 2 lapis penerimaan uang kas tunai di meja sirkulasi
 * - Fitur pengembalian darurat (Safety Net Rollback) jika salah catat lunas
 */

import { db } from '../../../../assets/js/supabaseClient.js';
import { state } from '../../core/state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from '../../core/petugasHelper.js';
import { syncAllData } from '../../core/syncData.js';

let targetPaymentItem = null;
let searchQueryTunggakan = '';
let isKasirSetup = false;

export const kasirTunggakanState = {
  get targetPaymentItem() { return targetPaymentItem; },
  set targetPaymentItem(val) { targetPaymentItem = val; },
  get searchQuery() { return searchQueryTunggakan; },
  set searchQuery(val) { searchQueryTunggakan = val; }
};

export function getSearchQueryTunggakan() {
  return searchQueryTunggakan;
}

export function setSearchQueryTunggakan(query) {
  searchQueryTunggakan = (query || '').trim().toLowerCase();
}

/**
 * Setup event listener untuk pencarian tunggakan dan modal pelunasan
 */
export function setupKasirTunggakanHandlers() {
  if (isKasirSetup) return;
  isKasirSetup = true;

  // Search input tunggakan
  const inputSearch = document.getElementById('inputSearchTunggakanDenda');
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      setSearchQueryTunggakan(inputSearch.value);
      renderTunggakanDendaList();
    });
  }

  // Setup Modal Lunasi Denda 2 Lapis
  const modalLunasi = document.getElementById('modalKonfirmasiLunasiDenda');
  const modalLunasiContent = document.getElementById('modalKonfirmasiLunasiDendaContent');
  const checkUangDiterima = document.getElementById('checkUangDiterima');
  const btnBatalLunasiModal = document.getElementById('btnBatalLunasiModal');
  const btnEksekusiLunasiModal = document.getElementById('btnEksekusiLunasiModal');

  if (checkUangDiterima && btnEksekusiLunasiModal) {
    checkUangDiterima.addEventListener('change', () => {
      btnEksekusiLunasiModal.disabled = !checkUangDiterima.checked;
    });
  }

  if (btnBatalLunasiModal) {
    btnBatalLunasiModal.addEventListener('click', () => {
      hideModal(modalLunasi, modalLunasiContent);
      targetPaymentItem = null;
    });
  }

  if (modalLunasi) {
    modalLunasi.addEventListener('click', e => {
      if (e.target === modalLunasi) {
        hideModal(modalLunasi, modalLunasiContent);
        targetPaymentItem = null;
      }
    });
  }

  if (btnEksekusiLunasiModal) {
    btnEksekusiLunasiModal.addEventListener('click', async () => {
      if (!targetPaymentItem) return;
      await executePelunasanDenda(targetPaymentItem);
      hideModal(modalLunasi, modalLunasiContent);
      targetPaymentItem = null;
    });
  }
}

export const setupKasirTunggakanListeners = setupKasirTunggakanHandlers;

/**
 * Membersihkan dan menstandarisasi nomor telepon ke format internasional WhatsApp (628xxx)
 * @param {string} phone
 * @returns {string|null}
 */
export function formatWhatsAppNumber(phone) {
  if (!phone || phone === '-') return null;
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;

  if (clean.startsWith('08')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  } else if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }

  if (clean.length < 10) return null;
  return clean;
}

/**
 * Mengirimkan pesan pengingat denda resmi melalui WhatsApp ke nomor siswa/guru
 * @param {string} idPengembalian
 */
export function sendWhatsAppReminder(idPengembalian) {
  const allPengembalian = state.cache.pengembalian || [];
  const item = allPengembalian.find(i => i.id_pengembalian === idPengembalian);
  if (!item) {
    showToast('Data tagihan denda tidak ditemukan.', 'error');
    return;
  }

  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
  const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
  const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

  const rawPhone = borrower.kontak;
  const waNumber = formatWhatsAppNumber(rawPhone);

  if (!waNumber) {
    showToast(`Nomor WhatsApp untuk ${borrower.nama} belum terdaftar atau tidak valid (${rawPhone || '-'}).`, 'warning');
    return;
  }

  const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : 'Buku Perpustakaan');
  const nominalDenda = formatRupiah(item.denda);

  let rincian = [];
  if (item.keterlambatan > 0) rincian.push(`Terlambat ${item.keterlambatan} Hari`);
  if (item.kondisi_buku && item.kondisi_buku !== 'Baik') rincian.push(`Kondisi: ${item.kondisi_buku}`);
  const rincianText = rincian.join(', ') || 'Keterlambatan Pengembalian';
  const tglKembali = formatTanggalIndo(item.tanggal_kembali);

  const pesan = 
`Halo *${borrower.nama}*, kami dari *Perpustakaan Digital CAKRAWALA*.

Menginformasikan bahwa Anda memiliki tanggungan denda pengembalian buku yang berstatus *BELUM LUNAS*:
📌 *No. Resi:* ${item.id_pengembalian}
📚 *Judul Buku:* ${judulBuku}
⚠️ *Rincian:* ${rincianText}
💰 *Total Denda:* ${nominalDenda}
📅 *Tgl Pengembalian:* ${tglKembali}

Mohon untuk segera datang ke Meja Sirkulasi Perpustakaan guna menyelesaikan pelunasan denda ini agar catatan akun Anda kembali bersih dan kuota peminjaman dapat digunakan normal kembali.

Terima kasih atas perhatian dan kerja samanya. 🙏
_Layanan Sirkulasi Perpustakaan Digital CAKRAWALA_`;

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(pesan)}`;
  window.open(waUrl, '_blank');
  showToast(`Membuka WhatsApp untuk mengirim peringatan denda ke ${borrower.nama}...`, 'success');
}

/**
 * Merender daftar khusus tunggakan denda (status 'Belum Lunas') dengan UI modern & tombol WhatsApp
 */
export function renderTunggakanDendaList() {
  const container = document.getElementById('listTunggakanDenda');
  if (!container) return;

  const allPengembalian = state.cache.pengembalian || [];
  let tunggakanList = allPengembalian.filter(item => item.status_denda === 'Belum Lunas');

  if (searchQueryTunggakan) {
    tunggakanList = tunggakanList.filter(item => {
      const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
      const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
      const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;
      const nama = (borrower?.nama || '').toLowerCase();
      const borrowerId = (borrower?.id || '').toLowerCase();
      const idPeminjaman = (item?.id_peminjaman || '').toLowerCase();
      const idPengembalian = (item?.id_pengembalian || '').toLowerCase();
      const judul = (buku?.judul_buku || '').toLowerCase();

      return (
        nama.includes(searchQueryTunggakan) ||
        borrowerId.includes(searchQueryTunggakan) ||
        idPeminjaman.includes(searchQueryTunggakan) ||
        idPengembalian.includes(searchQueryTunggakan) ||
        judul.includes(searchQueryTunggakan)
      );
    });
  }

  if (tunggakanList.length === 0) {
    const isSearching = searchQueryTunggakan.length > 0;
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 p-6">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 text-2xl mx-auto mb-2.5">
          <i class="ph-fill ph-check-circle"></i>
        </div>
        <h5 class="text-xs font-bold text-slate-800">${isSearching ? 'Tunggakan denda tidak ditemukan' : 'Tidak ada tagihan tunggakan denda!'}</h5>
        <p class="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">${isSearching ? 'Coba ubah kata kunci pencarian nama atau ID.' : 'Seluruh peminjam tertib atau denda telah diselesaikan di meja sirkulasi.'}</p>
      </div>
    `;
    return;
  }

  let html = '';
  tunggakanList.forEach(item => {
    const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? borrower.nama : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');
    const waNumber = formatWhatsAppNumber(borrower.kontak);
    const hasWa = Boolean(waNumber);

    let rincianPelanggaran = [];
    if (item.keterlambatan > 0) rincianPelanggaran.push(`Terlambat ${item.keterlambatan} Hari`);
    if (item.kondisi_buku && item.kondisi_buku !== 'Baik') rincianPelanggaran.push(`Kondisi: ${item.kondisi_buku}`);
    const rincianText = rincianPelanggaran.join(' &bull; ') || 'Denda Operasional';
    const initials = (borrower.nama || 'A').substring(0, 2).toUpperCase();

    html += `
      <div class="rounded-2xl border border-rose-200/90 bg-white p-4 shadow-xs hover:border-rose-300 hover:shadow-md transition-all duration-200 space-y-3">
        <!-- Baris Atas: Resi, Role, & Status Belum Lunas -->
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg shadow-2xs">${item.id_pengembalian}</span>
            <span class="rounded-full ${borrower.type === 'guru' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-navy border border-blue-200'} px-2 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
            <span class="text-[11px] text-slate-400 font-medium">&bull; ${formatTanggalIndo(item.tanggal_kembali)}</span>
          </div>
          <span class="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold">
            <span class="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span>Belum Lunas</span>
          </span>
        </div>

        <!-- Baris Tengah: Info Peminjam & Buku -->
        <div class="flex items-start gap-3">
          ${(borrower.foto && typeof borrower.foto === 'string' && borrower.foto.trim() !== '')
            ? `<div class="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 flex items-center justify-center">
                 <img src="${borrower.foto}" class="h-full w-full object-cover" alt="${namaSiswa}" onerror="this.onerror=null; this.parentElement.outerHTML='<div class=\\'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white font-black text-xs shadow-xs\\'>${initials}</div>';"/>
               </div>`
            : `<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white font-black text-xs shadow-xs">${initials}</div>`}
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-baseline justify-between gap-2 flex-wrap">
              <h4 class="text-xs font-extrabold text-slate-900 leading-tight">${namaSiswa}</h4>
              <span class="text-[11px] font-bold text-slate-500 font-mono">${borrower.id}</span>
            </div>
            <p class="text-[11px] text-slate-500">${borrower.sub}</p>

            <div class="pt-1 flex flex-col gap-1">
              <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <i class="ph-fill ph-book-open text-navy text-sm shrink-0"></i>
                <span class="line-clamp-1">${judulBuku}</span>
              </div>
              <div class="flex items-center gap-2 flex-wrap text-[11px]">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold text-[10px]">
                  <i class="ph ph-warning-circle text-xs"></i>
                  <span>${rincianText}</span>
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${hasWa ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'} font-semibold text-[10px]">
                  <i class="ph ${hasWa ? 'ph-whatsapp-logo text-emerald-600 text-xs' : 'ph-phone text-slate-400 text-xs'}"></i>
                  <span>${borrower.kontak && borrower.kontak !== '-' ? borrower.kontak : 'No HP Belum Ada'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Baris Bawah: Total Denda & Aksi Tombol -->
        <div class="flex items-center justify-between flex-wrap gap-2.5 pt-2.5 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tagihan Denda</span>
            <span class="text-base font-black text-rose-600 leading-none">${formatRupiah(item.denda)}</span>
          </div>

          <div class="flex items-center gap-2">
            <!-- Tombol WhatsApp Peringatan -->
            <button type="button" data-action="wa-reminder" data-id="${item.id_pengembalian}"
              title="${hasWa ? 'Kirim peringatan denda langsung via WhatsApp' : 'Nomor WhatsApp belum tercatat'}"
              class="btn-wa-reminder inline-flex items-center gap-1.5 rounded-xl ${hasWa ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'} px-3 py-2 text-xs font-bold transition shadow-2xs">
              <i class="ph-fill ph-whatsapp-logo text-sm"></i>
              <span>Peringatkan WA</span>
            </button>

            <!-- Tombol Lunasi Tunai -->
            <button type="button" data-action="lunasi" data-id="${item.id_pengembalian}"
              title="Buka konfirmasi pelunasan uang kas tunai di meja sirkulasi"
              class="btn-trigger-lunasi-tunggakan inline-flex items-center gap-1.5 rounded-xl bg-navy hover:bg-navy-light text-white px-3 py-2 text-xs font-bold transition shadow-sm">
              <i class="ph ph-hand-coins text-sm"></i>
              <span>Lunasi Tunai</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Pasang listener pada tombol WhatsApp dan tombol Lunasi
  container.querySelectorAll('.btn-wa-reminder').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      sendWhatsAppReminder(idPengembalian);
    });
  });

  container.querySelectorAll('.btn-trigger-lunasi-tunggakan').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPengembalian = btn.getAttribute('data-id');
      const item = tunggakanList.find(i => i.id_pengembalian === idPengembalian);
      if (item) openModalKonfirmasiLunasiDenda(item);
    });
  });
}

/**
 * Membuka Modal Konfirmasi Pelunasan Denda 2 Lapis
 */
export function openModalKonfirmasiLunasiDenda(item) {
  targetPaymentItem = item;

  const modalLunasi = document.getElementById('modalKonfirmasiLunasiDenda');
  const modalLunasiContent = document.getElementById('modalKonfirmasiLunasiDendaContent');
  if (!modalLunasi) return;

  const loan = (state.cache.peminjaman || []).find(p => p.id_peminjaman === item.id_peminjaman);
  const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
  const buku = loan ? (state.cache.buku || []).find(b => b.id_buku === loan.id_buku) : null;

  const elId = document.getElementById('lunasiIdPengembalian');
  const elNama = document.getElementById('lunasiNamaPeminjam');
  const elBuku = document.getElementById('lunasiJudulBuku');
  const elRincian = document.getElementById('lunasiRincianDenda');
  const elNominal = document.getElementById('lunasiNominalDenda');
  const elCheckRupiah = document.getElementById('lunasiCheckRupiah');
  const checkUang = document.getElementById('checkUangDiterima');
  const btnEksekusi = document.getElementById('btnEksekusiLunasiModal');

  if (elId) elId.textContent = item.id_pengembalian;
  if (elNama) elNama.textContent = `${borrower.nama} (${borrower.badge}) - ${borrower.sub}`;
  if (elBuku) elBuku.textContent = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

  let rincian = [];
  if (item.keterlambatan > 0) rincian.push(`Terlambat ${item.keterlambatan} Hari`);
  if (item.kondisi_buku && item.kondisi_buku !== 'Baik') rincian.push(`Kondisi: ${item.kondisi_buku}`);
  if (elRincian) elRincian.textContent = rincian.join(', ') || 'Denda Operasional';

  const nominalFmt = formatRupiah(item.denda);
  if (elNominal) elNominal.textContent = nominalFmt;
  if (elCheckRupiah) elCheckRupiah.textContent = nominalFmt;

  // Reset checkbox pengaman & disable tombol
  if (checkUang) checkUang.checked = false;
  if (btnEksekusi) btnEksekusi.disabled = true;

  showModal(modalLunasi, modalLunasiContent);
}

/**
 * Mengeksekusi perubahan status denda menjadi 'Lunas' di Supabase
 */
export async function executePelunasanDenda(item) {
  try {
    showToast('Memproses pelunasan denda...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Lunas' })
      .eq('id_pengembalian', item.id_pengembalian);

    if (error) throw error;

    showToast(`Denda sebesar ${formatRupiah(item.denda)} berhasil dilunasi!`, 'success');

    // Sinkronisasi data ulang
    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllData();
    }
  } catch (err) {
    console.error('Gagal melunasi denda:', err);
    showToast('Gagal memproses pelunasan: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Fitur Keselamatan Rollback: Membatalkan status Lunas jika ada salah catat oleh petugas
 */
export async function handleBatalkanLunasDenda(idPengembalian) {
  const item = (state.cache.pengembalian || []).find(p => p.id_pengembalian === idPengembalian);
  if (!item) return;

  const konfirmasi = confirm(`Batalkan status lunas untuk ${idPengembalian} (${formatRupiah(item.denda)})? Status akan kembali menjadi 'Belum Lunas'.`);
  if (!konfirmasi) return;

  try {
    showToast('Mengembalikan status denda...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Belum Lunas' })
      .eq('id_pengembalian', idPengembalian);

    if (error) throw error;

    showToast('Status denda berhasil dikembalikan menjadi Belum Lunas!', 'warning');

    if (window.fetchAllData) {
      await window.fetchAllData();
    } else {
      await syncAllData();
    }
  } catch (err) {
    console.error('Gagal membatalkan status lunas:', err);
    showToast('Gagal membatalkan lunas: ' + (err.message || 'Error Supabase'), 'error');
  }
}

// Buka akses global
if (typeof window !== 'undefined') {
  window.openModalKonfirmasiLunasiDenda = openModalKonfirmasiLunasiDenda;
  window.executePelunasanDenda = executePelunasanDenda;
  window.handleBatalkanLunasDenda = handleBatalkanLunasDenda;
  window.renderTunggakanDendaList = renderTunggakanDendaList;
  window.sendWhatsAppReminder = sendWhatsAppReminder;
}
