/**
 * CAKRAWALA Digital Library - Master Coordinator & Router Siswa & Guru
 * File: public/siswa-guru/siswaGuru.js
 * 
 * Tanggung Jawab:
 * - Menangani transisi switch tab (Beranda, Katalog, Pinjaman, Riwayat, Profil)
 * - Null-safety checking ketat pada seluruh event listener & elemen DOM
 * - Mengontrol off-canvas drawer navigasi pada perangkat mobile
 * - Menginisialisasi Modul 0 (Beranda) dan Modul 1 (Katalog)
 * - Mendaftarkan fungsi switchTab ke window.switchTab & window.switchSiswaTab
 */

import { state, TAB_CONFIGS } from './modules/state.js';
import { initSessionAndMember, setupLogout } from '../assets/js/auth.js';

// Modul Modular Baru
import { setupBerandaModule, renderBeranda } from './modules/0-beranda/index.js';
import { setupKatalogModule, renderKatalogGrid, openDetailModal } from './modules/1-katalog/index.js';
import {
  setupPrapinjamModule,
  openBookingModal,
  submitPraPinjam,
  closeTicketModal,
  openCart,
  removeFromCart
} from './modules/2-prapinjam/index.js';
import {
  setupRiwayatModule,
  renderRiwayatTable,
  renderPinjamanTables,
  loadRiwayatData,
  switchPinjamanSubtab
} from './modules/3-riwayat/index.js';

// Modul 4: Profil Pengguna & Logout
import {
  setupProfileModule,
  renderProfil,
  loadUserProfile,
  handleLogout
} from './modules/4-profil/index.js';
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
}

/**
 * Berpindah tampilan antar-tab meja kerja siswa & guru dengan null-safety
 * @param {string} tabKey Kunci tab target ('beranda' | 'katalog' | 'pinjaman' | 'peminjaman' | 'riwayat' | 'profil')
 */
export function switchTab(tabKey) {
  // Normalisasi alias peminjaman -> pinjaman
  const normalizedKey = (tabKey === 'peminjaman') ? 'pinjaman' : tabKey;
  state.activeTab = normalizedKey;

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

  // 1. Perbarui status tombol aktif di navigasi
  navButtons.forEach(item => {
    const btn = document.getElementById(item.id);
    if (!btn) return;
    const badge = btn.querySelector('span[id^="badge"]');

    if (item.key === normalizedKey) {
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

  // 2. Tampilkan panel konten yang dipilih dan sembunyikan yang lain
  contentPanels.forEach(panel => {
    const el = document.getElementById(panel.id);
    if (!el) return;
    if (panel.key === normalizedKey) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // 3. Perbarui teks header & breadcrumb
  const config = TAB_CONFIGS[normalizedKey] || TAB_CONFIGS.beranda;
  const headerTitle = document.getElementById('headerPageTitle');
  const headerDesc = document.getElementById('headerPageDesc');
  const headerSubBreadcrumb = document.getElementById('headerSubBreadcrumb');

  if (headerTitle) headerTitle.textContent = config.title;
  if (headerDesc) headerDesc.textContent = config.desc;
  if (headerSubBreadcrumb) headerSubBreadcrumb.textContent = config.breadcrumb;

  // 4. Render ulang data pada tab yang aktif
  if (normalizedKey === 'beranda') {
    renderBeranda();
  } else if (normalizedKey === 'katalog') {
    renderKatalogGrid();
  } else if (normalizedKey === 'pinjaman') {
    renderPinjamanTables();
  } else if (normalizedKey === 'riwayat') {
    renderRiwayatTable();
  } else if (normalizedKey === 'profil') {
    renderProfil();
  }

  // 5. Tutup sidebar mobile otomatis setelah memilih menu
  const sidebar = document.getElementById('memberSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

// Buka akses global ke window
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
  window.switchSiswaTab = switchTab;
  window.openBookingModal = openBookingModal;
  window.openDetailModal = openDetailModal;
  window.openBookDetail = openDetailModal;
  window.openCart = openCart;
  window.removeFromCart = removeFromCart;
  window.submitPraPinjam = submitPraPinjam;
  window.closeTicketModal = closeTicketModal;
  window.loadRiwayatData = loadRiwayatData;
  window.renderRiwayatTable = renderRiwayatTable;
  window.renderPinjamanTables = renderPinjamanTables;
  window.switchPinjamanSubtab = switchPinjamanSubtab;
  window.loadUserProfile = loadUserProfile;
  window.handleLogout = handleLogout;
  window.renderProfil = renderProfil;
}

/**
 * Inisialisasi utama aplikasi Portal Siswa & Guru
 */
export async function initSiswaGuru() {
  setupNavigation();
  setupLogout();

  // Inisialisasi Modul Baru
  setupBerandaModule();
  setupKatalogModule((bookId) => openBookingModal(bookId));
  setupPrapinjamModule();
  setupRiwayatModule();
  setupProfileModule();

  // Inisialisasi Sesi Auth dan Sinkronisasi Data Supabase
  try {
    await initSessionAndMember(state);
    await fetchAllMemberData();
    renderBeranda();
  } catch (err) {
    console.error('[siswaGuru] Gangguan sinkronisasi data Supabase:', err);
  }
}

// Jalankan otomatis saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSiswaGuru);
} else {
  initSiswaGuru();
}
