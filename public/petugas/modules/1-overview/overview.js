/**
 * CAKRAWALA Digital Library - Modul Meja 1: Overview & KPI Operasional
 * File: public/petugas/modules/1-overview/overview.js
 * 
 * FUNGSI UTAMA:
 * 1. Logika rendering metrik KPI:
 *    - Total Judul & Eksemplar Buku (Katalog)
 *    - Peminjaman Aktif (Status = 'Dipinjam')
 *    - Antrean Prapinjam Menunggu (Status = 'Menunggu')
 *    - Kas Denda Tertunda (Status = 'Belum Lunas')
 * 2. Logika Jam Operasional Meja Real-Time (07.30 - 15.30 WIB)
 * 3. Render tabel cepat 5 antrean prapinjam terbaru
 * 4. Navigasi aksi cepat / shortcut card operasional
 */

import { state } from '../core/state.js';
import { formatRupiah, formatTanggalIndo, getBorrowerInfo } from '../core/petugasHelper.js';

let isOverviewSetup = false;

/**
 * Menyiapkan shortcut banner dan event listener untuk Meja 1 Overview
 */
export function setupOverviewModule() {
  if (isOverviewSetup) return;
  isOverviewSetup = true;

  // 1. Pintasan Cepat dari Banner Sambutan Petugas
  const btnQuickSirkulasi = document.getElementById('btnQuickToSirkulasi');
  if (btnQuickSirkulasi) {
    btnQuickSirkulasi.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('sirkulasi');
    });
  }

  const btnQuickPengembalian = document.getElementById('btnQuickToPengembalian');
  if (btnQuickPengembalian) {
    btnQuickPengembalian.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('pengembalian');
    });
  }

  const btnQuickInventaris = document.getElementById('btnQuickToInventaris');
  if (btnQuickInventaris) {
    btnQuickInventaris.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('inventaris');
    });
  }

  // 2. Tombol 'Buka Menu Sirkulasi Lengkap'
  const btnLihatSemua = document.getElementById('btnLihatSemuaPrapinjam');
  if (btnLihatSemua) {
    btnLihatSemua.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('sirkulasi');
    });
  }

  // 3. Shortcut Card 1: Total Judul Buku -> Buka Meja Inventaris
  const cardBuku = document.getElementById('cardOverviewBuku');
  if (cardBuku) {
    cardBuku.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('inventaris');
    });
  }

  // 4. Shortcut Card 2: Peminjaman Aktif -> Buka Meja Sirkulasi
  const cardDipinjam = document.getElementById('cardOverviewDipinjam');
  if (cardDipinjam) {
    cardDipinjam.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('sirkulasi');
    });
  }

  // 5. Shortcut Card 3: Antrean Prapinjam -> Buka Meja Sirkulasi
  const cardPrapinjam = document.getElementById('cardOverviewPrapinjam');
  if (cardPrapinjam) {
    cardPrapinjam.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('sirkulasi');
    });
  }

  // 6. Shortcut Card 4: Kas Denda Tertunda -> Buka Meja Pengembalian & Denda
  const cardDenda = document.getElementById('cardOverviewDenda');
  if (cardDenda) {
    cardDenda.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') window.switchTab('pengembalian');
    });
  }
}

/**
 * Menghitung dan merender angka metrik KPI di Meja 1
 */
export function renderOverview() {
  // 0. Sinkronisasi Nama Sambutan Petugas
  const welcomeEl = document.getElementById('welcomeOfficerName');
  if (welcomeEl) {
    const officerName = state.officerProfile?.nama_petugas || state.currentUser?.username || 'Petugas Perpustakaan';
    welcomeEl.textContent = officerName;
  }

  // 1. Metrik Koleksi Buku
  const totalJudul = (state.cache.buku || []).length;
  const totalEksemplar = (state.cache.buku || []).reduce((acc, b) => acc + (Number(b.stok) || 0), 0);

  const statTotalBuku = document.getElementById('statTotalBuku');
  const statTotalEksemplar = document.getElementById('statTotalEksemplar');
  if (statTotalBuku) statTotalBuku.textContent = totalJudul;
  if (statTotalEksemplar) statTotalEksemplar.textContent = `${totalEksemplar} eksemplar tersedia`;

  // 2. Metrik Peminjaman Aktif (status = 'Dipinjam')
  const sedangDipinjam = (state.cache.peminjaman || []).filter(p => p.status === 'Dipinjam').length;
  const statSedangDipinjam = document.getElementById('statSedangDipinjam');
  if (statSedangDipinjam) statSedangDipinjam.textContent = sedangDipinjam;

  // 3. Metrik Antrean Prapinjam Menunggu (status = 'Menunggu')
  const pendingPrapinjam = (state.cache.peminjaman || []).filter(p => p.status === 'Menunggu');
  const statMenungguVerifikasi = document.getElementById('statMenungguVerifikasi');
  if (statMenungguVerifikasi) statMenungguVerifikasi.textContent = pendingPrapinjam.length;

  // 4. Metrik Kas Denda Tertunda (status_denda = 'Belum Lunas')
  const unpaidFines = (state.cache.pengembalian || []).filter(r => r.status_denda === 'Belum Lunas');
  const totalUnpaidNominal = unpaidFines.reduce((acc, r) => acc + (Number(r.denda) || 0), 0);

  const statTotalDendaBelumLunas = document.getElementById('statTotalDendaBelumLunas');
  const statJumlahKasusDenda = document.getElementById('statJumlahKasusDenda');
  if (statTotalDendaBelumLunas) statTotalDendaBelumLunas.textContent = formatRupiah(totalUnpaidNominal);
  if (statJumlahKasusDenda) statJumlahKasusDenda.textContent = `${unpaidFines.length} transaksi tertunda`;

  // 5. Gambar Tabel Cepat Antrean Prapinjam (5 terbaru)
  renderQuickPrapinjamTable(pendingPrapinjam.slice(0, 5));
}

/**
 * Merender tabel ringkas antrean prapinjam di Meja 1
 * @param {Array} list 
 */
export function renderQuickPrapinjamTable(list) {
  const tbody = document.getElementById('tableQuickPrapinjamBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-8 text-center text-slate-400">
          <i class="ph ph-check-circle text-2xl text-emerald-500 inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada antrean prapinjam yang menunggu verifikasi.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = (state.cache.buku || []).find(b => b.id_buku === item.id_buku);

    const badgeRoleClass = borrower.type === 'guru'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-blue-100 text-navy';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-xs text-navy">${item.id_peminjaman}</td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-2.5">
            ${borrower.foto && typeof borrower.foto === 'string' && borrower.foto.trim() !== ''
              ? `<img src="${borrower.foto}" class="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200/80 shadow-2xs" alt="${borrower.nama}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white text-[11px] font-bold\\'>${(borrower.nama || 'A').charAt(0).toUpperCase()}</div>';"/>`
              : `<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${borrower.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white text-[11px] font-bold">${(borrower.nama || 'A').charAt(0).toUpperCase()}</div>`}
            <div class="min-w-0">
              <div class="font-bold text-xs text-slate-900">${borrower.nama}</div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="rounded-full ${badgeRoleClass} px-2 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
                <span class="text-[10px] text-slate-500">${borrower.id} &bull; ${borrower.kelas}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="px-5 py-3">
          <div class="text-xs font-semibold text-slate-800">${buku ? buku.judul_buku : item.id_buku}</div>
          <div class="text-[11px] text-slate-400">Rak: ${buku ? (buku.keterangan || '-') : '-'}</div>
        </td>
        <td class="px-5 py-3 text-xs whitespace-nowrap">
          <span class="text-slate-600">${formatTanggalIndo(item.tanggal_pinjam)}</span>
          <span class="block text-[10px] text-slate-400">Tempo: ${formatTanggalIndo(item.batas_kembali)}</span>
        </td>
        <td class="px-5 py-3 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Menunggu
          </span>
        </td>
        <td class="px-5 py-3 text-right whitespace-nowrap">
          <button type="button" data-id="${item.id_peminjaman}"
            class="btn-quick-inspect inline-flex items-center gap-1 rounded-xl bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-light transition shadow-2xs">
            <i class="ph ph-arrow-square-out text-sm"></i>
            <span>Buka Sirkulasi</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Event listener tombol aksi cepat
  tbody.querySelectorAll('.btn-quick-inspect').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('sirkulasi');
      }
    });
  });
}

// Bind fungsi ke window untuk akses global
if (typeof window !== 'undefined') {
  window.renderOverview = renderOverview;
  window.setupOverviewModule = setupOverviewModule;
}
