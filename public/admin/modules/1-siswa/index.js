/**
 * CAKRAWALA Digital Library - Modul 1-Siswa (Entry Point & Koordinator)
 * File: public/admin/modules/1-siswa/index.js
 */

import {
  fetchSiswa,
  renderTableSiswa,
  setupSiswaEventListeners,
  initModulSiswa
} from './dataSiswa.js';

export {
  fetchSiswa,
  renderTableSiswa,
  setupSiswaEventListeners,
  initModulSiswa
};

// Daftarkan fungsi ke window dengan aman untuk interoperabilitas global
if (typeof window !== 'undefined') {
  window.fetchSiswa = fetchSiswa;
  window.renderTableSiswa = renderTableSiswa;
  window.initModulSiswa = initModulSiswa;
}
