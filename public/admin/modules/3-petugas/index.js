/**
 * CAKRAWALA Digital Library - Modul 3-Petugas (Entry Point & Koordinator)
 * File: public/admin/modules/3-petugas/index.js
 */

import {
  fetchPetugas,
  renderTablePetugas,
  setupPetugasEventListeners,
  initModulPetugas
} from './dataPetugas.js';

export {
  fetchPetugas,
  renderTablePetugas,
  setupPetugasEventListeners,
  initModulPetugas
};

// Daftarkan fungsi ke window dengan aman untuk interoperabilitas global
if (typeof window !== 'undefined') {
  window.fetchPetugas = fetchPetugas;
  window.renderTablePetugas = renderTablePetugas;
  window.initModulPetugas = initModulPetugas;
}
