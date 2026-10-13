/**
 * CAKRAWALA Digital Library - Modul Beranda (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/0-beranda/index.js
 */

import {
  setupBerandaActions,
  renderBeranda,
  renderHeroGreeting,
  renderFineAlertBanner,
  renderKpiCards,
  renderActiveBorrowQuickList
} from './beranda.js';

export {
  setupBerandaActions,
  renderBeranda,
  renderHeroGreeting,
  renderFineAlertBanner,
  renderKpiCards,
  renderActiveBorrowQuickList
};

/**
 * Inisialisasi modul beranda
 */
export function setupBerandaModule() {
  setupBerandaActions();
  renderBeranda();
}

// Daftarkan ke window untuk kemudahan pemanggilan
if (typeof window !== 'undefined') {
  window.renderBeranda = renderBeranda;
}
