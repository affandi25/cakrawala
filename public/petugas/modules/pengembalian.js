/**
 * CAKRAWALA Digital Library - Modul Meja 3: Pengembalian & Kalkulator Denda
 * File: public/petugas/modules/pengembalian.js
 * 
 * FUNGSI:
 * - Menangani pengembalian buku dari siswa / guru
 * - Menghitung keterlambatan pengembalian secara otomatis (Rp 1.000 / hari)
 * - Menilai kondisi buku (Baik = Rp 0, Rusak = 50% harga buku, Hilang = 100% harga buku)
 * - Menerbitkan struk resi pengembalian resmi
 * - Menampilkan riwayat transaksi pengembalian dan pelunasan denda tertunda
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayDateString,
  generateRandomId,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from './petugasHelper.js';

/**
 * Memasang pendengar peristiwa (event listener) pada modul pengembalian
 */
export function setupPengembalianModule() {
  const selectPeminjaman = document.getElementById('selectPeminjamanPengembalian');
  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const kondisiRadios = document.querySelectorAll('input[name="kondisiBuku"]');
  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnRefresh = document.getElementById('btnRefreshPengembalian');
  const btnCloseReceipt = document.getElementById('btnCloseReceipt');

  if (inputTglKembali) {
    inputTglKembali.value = getTodayDateString();
    inputTglKembali.addEventListener('change', recalculateDenda);
  }

  if (selectPeminjaman) {
    selectPeminjaman.addEventListener('change', () => {
      const idPinjam = selectPeminjaman.value;
      const loan = state.cache.peminjaman.find(p => p.id_peminjaman === idPinjam);
      state.selectedPeminjamanForReturn = loan || null;
      updatePreviewPeminjamanBox(loan);
      recalculateDenda();
    });
  }

  kondisiRadios.forEach(radio => {
    radio.addEventListener('change', recalculateDenda);
  });

  if (btnSubmit) {
    btnSubmit.addEventListener('click', handleSubmitPengembalian);
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      showToast('Memperbarui data pengembalian...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  if (btnCloseReceipt) {
    btnCloseReceipt.addEventListener('click', () => {
      const modalReceipt = document.getElementById('modalReceipt');
      const modalContent = document.getElementById('modalReceiptContent');
      hideModal(modalReceipt, modalContent);
    });
  }
}

/**
 * Mengisi pilihan dropdown transaksi peminjaman aktif (status 'Dipinjam')
 */
export function renderPengembalianFormOptions() {
  const select = document.getElementById('selectPeminjamanPengembalian');
  if (!select) return;

  const activeLoans = state.cache.peminjaman.filter(p => p.status === 'Dipinjam');

  let optionsHtml = '<option value="">-- Pilih Buku yang Sedang Dipinjam --</option>';
  activeLoans.forEach(loan => {
    const borrower = getBorrowerInfo(loan.nisn_siswa);
    const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);

    const namaSiswa = `${borrower.nama} [${borrower.badge}]`;
    const judulBuku = buku ? buku.judul_buku : loan.id_buku;

    optionsHtml += `
      <option value="${loan.id_peminjaman}">
        ${loan.id_peminjaman} &bull; ${namaSiswa} ("${judulBuku}") &bull; Tempo: ${formatTanggalIndo(loan.batas_kembali)}
      </option>
    `;
  });

  select.innerHTML = optionsHtml;

  if (!select.value) {
    const previewBox = document.getElementById('previewPeminjamanBox');
    if (previewBox) previewBox.classList.add('hidden');
    state.selectedPeminjamanForReturn = null;
    recalculateDenda();
  }
}

/**
 * Menampilkan kartu informasi peminjaman aktif yang dipilih
 */
export function updatePreviewPeminjamanBox(loan) {
  const previewBox = document.getElementById('previewPeminjamanBox');
  if (!previewBox) return;

  if (!loan) {
    previewBox.classList.add('hidden');
    return;
  }

  const borrower = getBorrowerInfo(loan.nisn_siswa);
  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);

  const prevNisnPeminjam = document.getElementById('prevNisnPeminjam');
  const prevNamaPeminjam = document.getElementById('prevNamaPeminjam');
  const prevKelasPeminjam = document.getElementById('prevKelasPeminjam');
  const prevIdPeminjamanBadge = document.getElementById('prevIdPeminjamanBadge');
  const prevJudulBuku = document.getElementById('prevJudulBuku');
  const prevHargaBuku = document.getElementById('prevHargaBuku');
  const prevTanggalPinjam = document.getElementById('prevTanggalPinjam');
  const prevBatasKembali = document.getElementById('prevBatasKembali');

  if (prevNisnPeminjam) prevNisnPeminjam.textContent = loan.nisn_siswa;
  if (prevNamaPeminjam) prevNamaPeminjam.textContent = `${borrower.nama} (${borrower.badge})`;
  if (prevKelasPeminjam) prevKelasPeminjam.innerHTML = `${borrower.sub} &bull; Kontak: ${borrower.kontak}`;
  if (prevIdPeminjamanBadge) prevIdPeminjamanBadge.textContent = loan.id_peminjaman;
  if (prevJudulBuku) prevJudulBuku.textContent = buku ? buku.judul_buku : loan.id_buku;
  if (prevHargaBuku) prevHargaBuku.textContent = formatRupiah(buku ? buku.harga_buku : 50000);
  if (prevTanggalPinjam) prevTanggalPinjam.textContent = formatTanggalIndo(loan.tanggal_pinjam);
  if (prevBatasKembali) prevBatasKembali.textContent = formatTanggalIndo(loan.batas_kembali);

  previewBox.classList.remove('hidden');
}

/**
 * Mesin kalkulator denda otomatis keterlambatan dan kerusakan fisik
 */
export function recalculateDenda() {
  const loan = state.selectedPeminjamanForReturn;
  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const displayHariTerlambat = document.getElementById('displayHariTerlambat');
  const badgeStatusTerlambat = document.getElementById('badgeStatusTerlambat');
  const calcHariTerlambat = document.getElementById('calcHariTerlambat');
  const calcDendaTerlambat = document.getElementById('calcDendaTerlambat');
  const calcLabelKondisi = document.getElementById('calcLabelKondisi');
  const calcDendaKondisi = document.getElementById('calcDendaKondisi');
  const calcTotalDenda = document.getElementById('calcTotalDenda');
  const sectionStatusDenda = document.getElementById('sectionStatusDenda');

  if (!loan) {
    if (btnSubmit) btnSubmit.disabled = true;
    if (displayHariTerlambat) displayHariTerlambat.textContent = '0 Hari';
    if (calcHariTerlambat) calcHariTerlambat.textContent = '0';
    if (calcDendaTerlambat) calcDendaTerlambat.textContent = 'Rp 0';
    if (calcLabelKondisi) calcLabelKondisi.textContent = 'Baik';
    if (calcDendaKondisi) calcDendaKondisi.textContent = 'Rp 0';
    if (calcTotalDenda) calcTotalDenda.textContent = 'Rp 0';
    if (sectionStatusDenda) sectionStatusDenda.classList.add('hidden');
    return;
  }

  if (btnSubmit) btnSubmit.disabled = false;

  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const tglKembaliStr = inputTglKembali ? inputTglKembali.value : getTodayDateString();

  const dKembali = new Date(tglKembaliStr);
  const dBatas = new Date(loan.batas_kembali);

  const dKembaliMidnight = new Date(dKembali.getFullYear(), dKembali.getMonth(), dKembali.getDate());
  const dBatasMidnight = new Date(dBatas.getFullYear(), dBatas.getMonth(), dBatas.getDate());

  const diffTime = dKembaliMidnight.getTime() - dBatasMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;
  const dendaTerlambat = hariTerlambat * 1000;

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') {
    dendaKondisi = 0.5 * hargaBuku;
  } else if (kondisi === 'Hilang') {
    dendaKondisi = 1.0 * hargaBuku;
  }

  const totalDenda = dendaTerlambat + dendaKondisi;

  if (displayHariTerlambat) displayHariTerlambat.textContent = `${hariTerlambat} Hari`;
  if (badgeStatusTerlambat) {
    if (hariTerlambat > 0) {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700';
      badgeStatusTerlambat.textContent = 'Terlambat';
    } else {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
      badgeStatusTerlambat.textContent = 'Tepat Waktu';
    }
  }

  if (calcHariTerlambat) calcHariTerlambat.textContent = hariTerlambat;
  if (calcDendaTerlambat) calcDendaTerlambat.textContent = formatRupiah(dendaTerlambat);
  if (calcLabelKondisi) calcLabelKondisi.textContent = kondisi;
  if (calcDendaKondisi) calcDendaKondisi.textContent = formatRupiah(dendaKondisi);

  if (calcTotalDenda) {
    calcTotalDenda.textContent = formatRupiah(totalDenda);
    if (totalDenda > 0) {
      calcTotalDenda.className = 'text-xl font-extrabold text-rose-600';
    } else {
      calcTotalDenda.className = 'text-xl font-extrabold text-emerald-600';
    }
  }

  if (sectionStatusDenda) {
    if (totalDenda > 0) {
      sectionStatusDenda.classList.remove('hidden');
    } else {
      sectionStatusDenda.classList.add('hidden');
    }
  }
}

/**
 * Menyimpan pengembalian buku dan mengupdate stok serta status denda
 */
export async function handleSubmitPengembalian() {
  const loan = state.selectedPeminjamanForReturn;
  if (!loan) {
    showToast('Pilih transaksi peminjaman terlebih dahulu.', 'warning');
    return;
  }

  const inputTglKembali = document.getElementById('inputTanggalKembali');
  const tglKembali = inputTglKembali ? inputTglKembali.value : getTodayDateString();

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  const dKembali = new Date(tglKembali);
  const dBatas = new Date(loan.batas_kembali);
  const diffDays = Math.ceil((dKembali.getTime() - dBatas.getTime()) / (1000 * 60 * 60 * 24));
  const hariTerlambat = diffDays > 0 ? diffDays : 0;
  const dendaTerlambat = hariTerlambat * 1000;

  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') dendaKondisi = 0.5 * hargaBuku;
  if (kondisi === 'Hilang') dendaKondisi = 1.0 * hargaBuku;

  const totalDenda = dendaTerlambat + dendaKondisi;

  let statusDenda = 'Tidak Ada';
  if (totalDenda > 0) {
    const radioStatusDenda = document.querySelector('input[name="statusDenda"]:checked');
    statusDenda = radioStatusDenda ? radioStatusDenda.value : 'Lunas';
  }

  const btnSubmit = document.getElementById('btnSubmitPengembalian');
  const btnText = document.getElementById('btnSubmitPengembalianText');

  try {
    if (btnSubmit) btnSubmit.disabled = true;
    if (btnText) btnText.textContent = 'Menyimpan Pengembalian...';

    const newIdPengembalian = generateRandomId('KB', 6);

    const { error: errReturn } = await db
      .from('data_pengembalian')
      .insert({
        id_pengembalian: newIdPengembalian,
        id_peminjaman: loan.id_peminjaman,
        tanggal_kembali: tglKembali,
        keterlambatan: hariTerlambat,
        kondisi_buku: kondisi,
        denda: totalDenda,
        status_denda: statusDenda
      });
    if (errReturn) throw errReturn;

    const { error: errLoan } = await db
      .from('data_peminjaman')
      .update({ status: 'Selesai' })
      .eq('id_peminjaman', loan.id_peminjaman);
    if (errLoan) throw errLoan;

    const stokSekarang = buku ? (Number(buku.stok) || 0) : 0;
    const stokBaru = stokSekarang + 1;

    const { error: errBook } = await db
      .from('data_buku')
      .update({
        stok: stokBaru,
        status: 'Tersedia'
      })
      .eq('id_buku', loan.id_buku);
    if (errBook) throw errBook;

    showToast('Buku berhasil dikembalikan dan stok diperbarui!', 'success');

    const borrower = getBorrowerInfo(loan.nisn_siswa);
    showReceiptModal({
      id: newIdPengembalian,
      siswa: `${borrower.nama} (${borrower.badge})`,
      buku: buku ? buku.judul_buku : loan.id_buku,
      kondisi: kondisi,
      overdue: `${hariTerlambat} Hari`,
      fine: formatRupiah(totalDenda),
      fineStatus: statusDenda
    });

    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal memproses pengembalian:', err);
    showToast('Gagal memproses pengembalian: ' + (err.message || 'Error Supabase'), 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Selesaikan Pengembalian Buku';
  }
}

/**
 * Menampilkan modal pop-up tanda terima pengembalian buku
 */
export function showReceiptModal(data) {
  const modalReceipt = document.getElementById('modalReceipt');
  const modalContent = document.getElementById('modalReceiptContent');
  if (!modalReceipt) return;

  const receiptId = document.getElementById('receiptId');
  const receiptStudent = document.getElementById('receiptStudent');
  const receiptBook = document.getElementById('receiptBook');
  const receiptCondition = document.getElementById('receiptCondition');
  const receiptOverdue = document.getElementById('receiptOverdue');
  const receiptFine = document.getElementById('receiptFine');
  const receiptFineStatus = document.getElementById('receiptFineStatus');

  if (receiptId) receiptId.textContent = data.id;
  if (receiptStudent) receiptStudent.textContent = data.siswa;
  if (receiptBook) receiptBook.textContent = data.buku;
  if (receiptCondition) receiptCondition.textContent = data.kondisi;
  if (receiptOverdue) receiptOverdue.textContent = data.overdue;
  if (receiptFine) receiptFine.textContent = data.fine;
  if (receiptFineStatus) receiptFineStatus.textContent = data.fineStatus;

  showModal(modalReceipt, modalContent);
}

/**
 * Menampilkan riwayat pengembalian pada Meja 3
 */
export function renderRiwayatPengembalian() {
  const container = document.getElementById('listRiwayatPengembalian');
  if (!container) return;

  const list = state.cache.pengembalian;
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-slate-400">
        <i class="ph ph-receipt text-3xl inline-block mb-1"></i>
        <p class="text-xs font-semibold text-slate-600">Belum ada riwayat pengembalian.</p>
      </div>
    `;
    return;
  }

  let itemsHtml = '';
  list.slice(0, 15).forEach(item => {
    const loan = state.cache.peminjaman.find(p => p.id_peminjaman === item.id_peminjaman);
    const borrower = getBorrowerInfo(loan ? loan.nisn_siswa : '');
    const buku = loan ? state.cache.buku.find(b => b.id_buku === loan.id_buku) : null;

    const namaSiswa = borrower.nama !== '-' ? `${borrower.nama} (${borrower.badge})` : (loan ? loan.nisn_siswa : '-');
    const judulBuku = buku ? buku.judul_buku : (loan ? loan.id_buku : '-');

    let badgeDenda = '';
    if (item.status_denda === 'Belum Lunas') {
      badgeDenda = `
        <div class="flex items-center gap-2">
          <span class="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            Belum Lunas (${formatRupiah(item.denda)})
          </span>
          <button type="button" data-action="pay-fine" data-id="${item.id_pengembalian}"
            class="btn-pay-fine text-[10px] font-bold text-navy hover:underline">
            Lunasi
          </button>
        </div>
      `;
    } else if (item.status_denda === 'Lunas') {
      badgeDenda = `
        <span class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          Lunas (${formatRupiah(item.denda)})
        </span>
      `;
    } else {
      badgeDenda = `
        <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          Tanpa Denda
        </span>
      `;
    }

    itemsHtml += `
      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-white hover:shadow-xs transition">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-bold text-slate-800 text-xs">${namaSiswa}</p>
            <p class="text-[11px] text-slate-600 line-clamp-1">"${judulBuku}"</p>
          </div>
          <span class="font-mono text-[10px] text-slate-400 font-bold">${item.id_pengembalian}</span>
        </div>

        <div class="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <span class="text-slate-500">Tgl: ${formatTanggalIndo(item.tanggal_kembali)} &bull; Kondisi: <strong>${item.kondisi_buku}</strong></span>
          <div>${badgeDenda}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = itemsHtml;

  container.querySelectorAll('.btn-pay-fine').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idPengembalian = btn.getAttribute('data-id');
      await handleLunasiDenda(idPengembalian);
    });
  });
}

/**
 * Menandai denda sebagai Lunas
 */
export async function handleLunasiDenda(idPengembalian) {
  if (!confirm(`Konfirmasi pelunasan denda untuk tanda terima ${idPengembalian}?`)) return;

  try {
    showToast('Memproses pelunasan denda...', 'info');

    const { error } = await db
      .from('data_pengembalian')
      .update({ status_denda: 'Lunas' })
      .eq('id_pengembalian', idPengembalian);
    if (error) throw error;

    showToast(`Denda untuk ${idPengembalian} berhasil ditandai Lunas!`, 'success');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal melunasi denda:', err);
    showToast('Gagal mengubah status denda: ' + (err.message || 'Error Supabase'), 'error');
  }
}
