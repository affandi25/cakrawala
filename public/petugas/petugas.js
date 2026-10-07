/**
 * CAKRAWALA Digital Library - Master Coordinator Dashboard Petugas
 * File: public/petugas/petugas.js
 * 
 * FUNGSI UTAMA:
 * Sebagai entry point utama yang mengorkestrasi modul-modul terpisah:
 * 1. modules/state.js        - Sentral penyimpanan ingatan/cache data
 * 2. modules/utils.js        - Helper tanggal, rupiah, modal, toast, dan borrower resolver
 * 3. ../assets/js/auth.js    - Verifikasi sesi login & profil petugas terpusat
 * 4. modules/overview.js     - Meja 1: Statistik operasional & quick prapinjam
 * 5. modules/sirkulasi.js    - Meja 2: Verifikasi prapinjam, antrean dipinjam, & walk-in desk
 * 6. modules/scanner.js      - Pemindai barcode/QR kamera (dual engine) & file upload
 * 7. modules/pengembalian.js - Meja 3: Pengembalian buku & kalkulator denda otomatis
 * 8. modules/buku.js         - Meja 4: Inventaris koleksi buku & stiker QR label
 * 9. modules/pengumuman.js   - Meja 5: Kelola pengumuman & upload poster ke Storage
 * 10. modules/data.js        - Sinkronisasi data dari 7 tabel Supabase
 */

import { state, TAB_CONFIGS } from './modules/state.js';
import { initSessionAndOfficer, setupLogout } from '../assets/js/auth.js';
import { setupSirkulasiHandlers, setupWalkInModal, switchSirkulasiSubtab } from './modules/sirkulasi.js';
import { setupCameraScannerModule } from './modules/scanner.js';
import { setupPengembalianModule } from './modules/pengembalian.js';
import { setupBooksHandlers } from './modules/buku.js';
import { setupPengumumanModule } from './modules/pengumuman.js';
import { fetchAllData } from './modules/data.js';

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

  contentPanels.forEach(panel => {
    const el = document.getElementById(panel.id);
    if (!el) return;
    if (panel.key === tabKey) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  const config = TAB_CONFIGS[tabKey] || TAB_CONFIGS.overview;
  const headerTitle = document.getElementById('headerPageTitle');
  const headerDesc = document.getElementById('headerPageDesc');
  const headerSubBreadcrumb = document.getElementById('headerSubBreadcrumb');

  if (headerTitle) headerTitle.textContent = config.title;
  if (headerDesc) headerDesc.textContent = config.desc;
  if (headerSubBreadcrumb) headerSubBreadcrumb.textContent = config.breadcrumb;

  const sidebar = document.getElementById('petugasSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

// Ekspos switchTab ke window agar modul manapun dapat memanggil perpindahan tab
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
}

/**
 * Inisialisasi utama aplikasi Dashboard Petugas
 */
async function init() {
  setupNavigation();
  setupLogout();
  setupSirkulasiHandlers();
  setupWalkInModal();
  setupCameraScannerModule();
  setupPengembalianModule();
  setupBooksHandlers();
  setupPengumumanModule();

  await initSessionAndOfficer(state);
  await fetchAllData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
