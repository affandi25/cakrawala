/**
 * CAKRAWALA Digital Library - Modul Kalkulator Denda Pengembalian
 * Path: public/petugas/modules/3-pengembalian/kalkulatorDenda.js
 * 
 * FUNGSI:
 * - Menghitung hari keterlambatan pengembalian buku
 * - Menghitung tarif denda harian dinamis (dapat diubah oleh petugas di form)
 * - Menerapkan aturan: Keterlambatan >= 1 Bulan (30 Hari) -> Denda harian dinonaktifkan & diganti seharga buku
 * - Menghitung denda kondisi fisik buku (Baik, Rusak Ringan 50%, Hilang 100%)
 * - Memperbarui status pembayaran denda (Lunas / Belum Lunas)
 */

import { state } from '../../core/state.js';
import { formatRupiah, getTodayDateString, getTarifDendaHarian } from '../../core/petugasHelper.js';

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

  // 1. Baca Tarif Denda Harian dari Kebijakan Resmi Sistem
  const tarifPerHari = getTarifDendaHarian();
  const labelTarifPerHari = document.getElementById('labelTarifPerHari');
  const displayTarifAktifForm = document.getElementById('displayTarifAktifForm');
  if (displayTarifAktifForm) {
    displayTarifAktifForm.textContent = `${formatRupiah(tarifPerHari)} / hari`;
  }

  // 2. Ambil Harga Buku Fisik
  const buku = (state.cache.buku || []).find(b => b.id_buku === loan.id_buku);
  const hargaBuku = buku ? (Number(buku.harga_buku) || 50000) : 50000;

  // 3. Aturan Khusus: Keterlambatan >= 1 Bulan (30 Hari) -> Denda harian dinonaktifkan & diganti seharga buku
  const isOneMonthOverdue = hariTerlambat >= 30;
  const alertOneMonth = document.getElementById('alertTerlambatSatuBulan') || document.getElementById('bannerDendaSatuBulan');
  if (alertOneMonth) {
    alertOneMonth.classList.toggle('hidden', !isOneMonthOverdue);
  }

  let dendaTerlambat = 0;
  if (isOneMonthOverdue) {
    dendaTerlambat = hargaBuku;
    if (labelTarifPerHari) labelTarifPerHari.textContent = '(Ganti Buku)';
  } else {
    dendaTerlambat = hariTerlambat * tarifPerHari;
    if (labelTarifPerHari) labelTarifPerHari.textContent = formatRupiah(tarifPerHari);
  }

  const radioKondisi = document.querySelector('input[name="kondisiBuku"]:checked');
  const kondisi = radioKondisi ? radioKondisi.value : 'Baik';

  let dendaKondisi = 0;
  if (kondisi === 'Rusak') {
    dendaKondisi = 0.5 * hargaBuku;
  } else if (kondisi === 'Hilang') {
    dendaKondisi = 1.0 * hargaBuku;
  }

  const totalDenda = isOneMonthOverdue ? Math.max(hargaBuku, dendaKondisi) : (dendaTerlambat + dendaKondisi);

  if (displayHariTerlambat) displayHariTerlambat.textContent = `${hariTerlambat} Hari`;
  if (badgeStatusTerlambat) {
    if (isOneMonthOverdue) {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300';
      badgeStatusTerlambat.textContent = 'Terlambat >= 1 Bulan';
    } else if (hariTerlambat > 0) {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700';
      badgeStatusTerlambat.textContent = 'Terlambat';
    } else {
      badgeStatusTerlambat.className = 'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
      badgeStatusTerlambat.textContent = 'Tepat Waktu';
    }
  }

  if (calcHariTerlambat) calcHariTerlambat.textContent = hariTerlambat;
  if (calcDendaTerlambat) {
    calcDendaTerlambat.textContent = isOneMonthOverdue
      ? `${formatRupiah(hargaBuku)} (Harga Buku Penuh)`
      : formatRupiah(dendaTerlambat);
  }
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

// Window binding
if (typeof window !== 'undefined') {
  window.recalculateDenda = recalculateDenda;
}
