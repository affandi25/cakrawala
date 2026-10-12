/**
 * CAKRAWALA Digital Library - Master Coordinator Dashboard Petugas
 * File: public/petugas/petugas.js
 * 
 * FUNGSI UTAMA (TAHAP 1 & 2):
 * Mengorkestrasi fondasi modular sistem, Meja 1: Overview, dan Meja 2: Sirkulasi:
 * 1. modules/core/state.js          - Sentral penyimpanan state reaktif & konfigurasi tab
 * 2. modules/core/syncData.js       - Sinkronisasi data dari 7 tabel Supabase
 * 3. modules/1-overview/overview.js   - Meja 1: Metrik KPI operasional & antrean cepat
 * 4. modules/2-sirkulasi/index.js    - Meja 2: Sirkulasi langsung & pra-pinjam
 * 5. ../assets/js/auth.js           - Verifikasi sesi login & guard hak akses role 'Petugas'
 * 6. Handler Meja 3-5 & Scanner     - Terkoneksi secara teratur dan modular
 */

import { state, TAB_CONFIGS } from './modules/core/state.js';
import { syncAllTables, onDataSynced } from './modules/core/syncData.js';
import { setupOverviewModule, renderOverview } from './modules/1-overview/overview.js';
import { setupSirkulasiHandlers, setupWalkInModal, renderSirkulasi } from './modules/2-sirkulasi/index.js';
import { initSessionAndOfficer, setupLogout } from '../assets/js/auth.js';

// Import handler Meja 3 (Pengembalian), Meja 4 (Inventaris), Meja 5 (Pengumuman) & Scanner
import { setupCameraScannerModule } from './modules/scanner/index.js';
import { setupPengembalianModule, renderPengembalianTab } from './modules/3-pengembalian/index.js';
import { setupInventarisModule, renderInventarisTab } from './modules/4-buku/index.js';
import { setupPengumumanModule, renderPengumumanTab } from './modules/5-pengumuman/index.js';

/**
 * Menyiapkan navigasi antar meja operasional dan menu sidebar responsif
 */
export function setupNavigation() {
  const tabs = [
    { id: 'tabBtnOverview', key: 'overview' },
    { id: 'tabBtnSirkulasi', key: 'sirkulasi' },
    { id: 'tabBtnPengembalian', key: 'pengembalian' },
    { id: 'tabBtnInventaris', key: 'inventaris' },
    { id: 'tabBtnPengumuman', key: 'pengumuman' }
  ];

  tabs.forEach(tab => {
    const btn = document.getElementById(tab.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      switchTab(tab.key);
    });
  });

  // Kontrol buka-tutup sidebar di layar mobile / smartphone
  const btnToggleMobile = document.getElementById('btnToggleMobileSidebar');
  const btnCloseMobile = document.getElementById('btnCloseMobileSidebar');
  const sidebar = document.getElementById('petugasSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if (btnToggleMobile) btnToggleMobile.addEventListener('click', openMobileSidebar);
  if (btnCloseMobile) btnCloseMobile.addEventListener('click', closeMobileSidebar);
  if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);
}

/**
 * Berpindah tampilan meja kerja dan memperbarui judul header
 * @param {string} tabKey ('overview' | 'sirkulasi' | 'pengembalian' | 'inventaris' | 'pengumuman')
 */
export function switchTab(tabKey) {
  state.activeTab = tabKey;

  const navButtons = [
    { id: 'tabBtnOverview', key: 'overview' },
    { id: 'tabBtnSirkulasi', key: 'sirkulasi' },
    { id: 'tabBtnPengembalian', key: 'pengembalian' },
    { id: 'tabBtnInventaris', key: 'inventaris' },
    { id: 'tabBtnPengumuman', key: 'pengumuman' }
  ];

  const contentPanels = [
    { id: 'tabContentOverview', key: 'overview' },
    { id: 'tabContentSirkulasi', key: 'sirkulasi' },
    { id: 'tabContentPengembalian', key: 'pengembalian' },
    { id: 'tabContentInventaris', key: 'inventaris' },
    { id: 'tabContentPengumuman', key: 'pengumuman' }
  ];

  // Update styling tombol tab aktif
  navButtons.forEach(item => {
    const btn = document.getElementById(item.id);
    if (!btn) return;
    const badge = btn.querySelector('span[id^="badge"]');

    if (item.key === tabKey) {
      btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 bg-navy text-white shadow-sm shadow-navy/20';
      if (badge) {
        badge.className = 'rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white';
      }
    } else {
      btn.className = 'nav-tab-btn group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-navy';
      if (badge) {
        badge.className = 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600';
      }
    }
  });

  // Tampilkan container tab yang dipilih, sembunyikan yang lain
  contentPanels.forEach(panel => {
    const el = document.getElementById(panel.id);
    if (!el) return;
    if (panel.key === tabKey) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // Render konten spesifik tab yang aktif
  if (tabKey === 'overview' && typeof renderOverview === 'function') {
    renderOverview();
  } else if (tabKey === 'sirkulasi' && typeof renderSirkulasi === 'function') {
    renderSirkulasi();
  } else if (tabKey === 'pengembalian' && typeof renderPengembalianTab === 'function') {
    renderPengembalianTab();
  } else if (tabKey === 'inventaris' && typeof renderInventarisTab === 'function') {
    renderInventarisTab();
  } else if (tabKey === 'pengumuman' && typeof renderPengumumanTab === 'function') {
    renderPengumumanTab();
  }

  // Perbarui header breadcrumb, judul halaman, dan deskripsi
  const config = TAB_CONFIGS[tabKey] || TAB_CONFIGS.overview;
  const headerTitle = document.getElementById('headerPageTitle');
  const headerDesc = document.getElementById('headerPageDesc');
  const headerSubBreadcrumb = document.getElementById('headerSubBreadcrumb');

  if (headerTitle) headerTitle.textContent = config.title;
  if (headerDesc) headerDesc.textContent = config.desc;
  if (headerSubBreadcrumb) headerSubBreadcrumb.textContent = config.breadcrumb;

  // Tutup sidebar otomatis di mobile setelah klik menu
  const sidebar = document.getElementById('petugasSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

// Ekspos fungsi navigasi dan render ke window
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
  window.renderSirkulasi = renderSirkulasi;
  window.renderPengembalianTab = renderPengembalianTab;
  window.renderInventarisTab = renderInventarisTab;
  window.renderPengumumanTab = renderPengumumanTab;
}

// Memicu re-render Meja 1, 2, 3, 4, & 5 saat syncData berhasil
onDataSynced(() => {
  if (typeof renderOverview === 'function') renderOverview();
  if (typeof renderSirkulasi === 'function') renderSirkulasi();
  if (typeof renderPengembalianTab === 'function') renderPengembalianTab();
  if (typeof renderInventarisTab === 'function') renderInventarisTab();
  if (typeof renderPengumumanTab === 'function') renderPengumumanTab();
});

/**
 * Inisialisasi utama aplikasi Dashboard Petugas dengan isolasi aman (Fault-Tolerant)
 */
async function init() {
  // 1. Setup UI Navigasi & Logout
  try {
    setupNavigation();
  } catch (err) {
    console.error('Error inisialisasi navigasi:', err);
  }

  try {
    setupLogout();
  } catch (err) {
    console.error('Error inisialisasi logout:', err);
  }

  // 2. Setup Meja 1: Overview
  try {
    if (typeof setupOverviewModule === 'function') setupOverviewModule();
  } catch (err) {
    console.error('Error inisialisasi Meja 1 Overview:', err);
  }

  // 3. Setup Meja 2: Sirkulasi Peminjaman
  try {
    if (typeof setupSirkulasiHandlers === 'function') setupSirkulasiHandlers();
  } catch (err) {
    console.error('Error inisialisasi Meja 2 Sirkulasi:', err);
  }

  try {
    if (typeof setupWalkInModal === 'function') setupWalkInModal();
  } catch (err) {
    console.error('Error inisialisasi Walk-In Modal:', err);
  }

  // 4. Setup Meja 3: Pengembalian & Denda
  try {
    if (typeof setupPengembalianModule === 'function') setupPengembalianModule();
  } catch (err) {
    console.error('Error inisialisasi Meja 3 Pengembalian:', err);
  }

  // 5. Setup Meja 4: Inventaris Buku
  try {
    if (typeof setupInventarisModule === 'function') setupInventarisModule();
  } catch (err) {
    console.error('Error inisialisasi Meja 4 Inventaris:', err);
  }

  // 6. Setup Meja 5: Kelola Pengumuman
  try {
    if (typeof setupPengumumanModule === 'function') setupPengumumanModule();
  } catch (err) {
    console.error('Error inisialisasi Meja 5 Pengumuman:', err);
  }

  // 7. Setup Scanner Kamera Universal
  try {
    if (typeof setupCameraScannerModule === 'function') setupCameraScannerModule();
  } catch (err) {
    console.error('Error inisialisasi modul Scanner Kamera:', err);
  }

  // 8. Verifikasi sesi login & role Petugas
  try {
    await initSessionAndOfficer(state);
  } catch (err) {
    console.error('Error verifikasi auth sesi petugas:', err);
  }

  // 9. Unduh seluruh data tabel dari Supabase
  try {
    await syncAllTables();
  } catch (err) {
    console.error('Error sinkronisasi data Supabase:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
