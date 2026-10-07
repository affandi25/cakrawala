/**
 * CAKRAWALA Digital Library - Master Coordinator Dashboard Siswa & Guru
 * File: public/siswa-guru/siswa-guru.js
 */

import { state, TAB_CONFIGS } from './modules/state.js';
import { initSessionAndMember, setupLogout } from '../assets/js/auth.js';
import { setupKatalogModule } from './modules/katalog.js';
import { setupPinjamanModule, switchPinjamanSubtab } from './modules/pinjaman.js';
import { setupRiwayatModule } from './modules/riwayat.js';
import { setupProfileModule } from './modules/profil.js';
import { fetchAllMemberData } from './modules/data.js';

/**
 * Menyiapkan navigasi antar tab dan kontrol drawer menu mobile
 */
export function setupNavigation() {
  const tabs = [
    { id: 'tabBtnBeranda', key: 'beranda' },
    { id: 'tabBtnKatalog', key: 'katalog' },
    { id: 'tabBtnPinjaman', key: 'pinjaman' },
    { id: 'tabBtnRiwayat', key: 'riwayat' },
    { id: 'tabBtnProfil', key: 'profil' }
  ];

  tabs.forEach(tab => {
    const btn = document.getElementById(tab.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      switchTab(tab.key);
    });
  });

  // Kontrol Sidebar Mobile
  const btnToggleMobile = document.getElementById('btnToggleMobileSidebar');
  const btnCloseMobile = document.getElementById('btnCloseMobileSidebar');
  const sidebar = document.getElementById('memberSidebar');
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

  // Quick Action Buttons di Beranda
  const btnQuickKatalog = document.getElementById('btnQuickToKatalog');
  if (btnQuickKatalog) {
    btnQuickKatalog.addEventListener('click', () => switchTab('katalog'));
  }
  const btnQuickPinjaman = document.getElementById('btnQuickToPinjaman');
  if (btnQuickPinjaman) {
    btnQuickPinjaman.addEventListener('click', () => switchTab('pinjaman'));
  }
  const btnQuickCard = document.getElementById('btnQuickToCard');
  if (btnQuickCard) {
    btnQuickCard.addEventListener('click', () => switchTab('profil'));
  }
}

/**
 * Berpindah tampilan tab meja kerja
 */
export function switchTab(tabKey) {
  state.activeTab = tabKey;

  const navButtons = [
    { id: 'tabBtnBeranda', key: 'beranda' },
    { id: 'tabBtnKatalog', key: 'katalog' },
    { id: 'tabBtnPinjaman', key: 'pinjaman' },
    { id: 'tabBtnRiwayat', key: 'riwayat' },
    { id: 'tabBtnProfil', key: 'profil' }
  ];

  const contentPanels = [
    { id: 'tabContentBeranda', key: 'beranda' },
    { id: 'tabContentKatalog', key: 'katalog' },
    { id: 'tabContentPinjaman', key: 'pinjaman' },
    { id: 'tabContentRiwayat', key: 'riwayat' },
    { id: 'tabContentProfil', key: 'profil' }
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

  const config = TAB_CONFIGS[tabKey] || TAB_CONFIGS.beranda;
  const headerTitle = document.getElementById('headerPageTitle');
  const headerDesc = document.getElementById('headerPageDesc');
  const headerSubBreadcrumb = document.getElementById('headerSubBreadcrumb');

  if (headerTitle) headerTitle.textContent = config.title;
  if (headerDesc) headerDesc.textContent = config.desc;
  if (headerSubBreadcrumb) headerSubBreadcrumb.textContent = config.breadcrumb;

  const sidebar = document.getElementById('memberSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
}

/**
 * Inisialisasi aplikasi Dashboard Siswa & Guru
 */
async function init() {
  setupNavigation();
  setupLogout();
  setupKatalogModule();
  setupPinjamanModule();
  setupRiwayatModule();
  setupProfileModule();

  await initSessionAndMember(state);
  await fetchAllMemberData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
