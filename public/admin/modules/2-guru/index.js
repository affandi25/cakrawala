/**
 * CAKRAWALA Digital Library - Modul 2-Guru (Entry Point & Koordinator)
 * File: public/admin/modules/2-guru/index.js
 */

import {
  fetchGuru,
  renderTableGuru,
  setupGuruEventListeners,
  initModulGuru
} from './dataGuru.js';

export {
  fetchGuru,
  renderTableGuru,
  setupGuruEventListeners,
  initModulGuru
};

// Daftarkan fungsi ke window dengan aman untuk interoperabilitas global
if (typeof window !== 'undefined') {
  window.fetchGuru = fetchGuru;
  window.renderTableGuru = renderTableGuru;
  window.initModulGuru = initModulGuru;
}
