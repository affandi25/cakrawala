/**
 * CAKRAWALA Digital Library - Modul 0-Overview (Entry Point & Koordinator)
 * File: public/admin/modules/0-overview/index.js
 */

import { loadKpiStats, initKpiMetrics } from './kpiMetrics.js';

export { loadKpiStats, initKpiMetrics };

// Daftarkan fungsi ke window dengan aman untuk interoperabilitas global
if (typeof window !== 'undefined') {
  window.loadKpiStats = loadKpiStats;
  window.initKpiMetrics = initKpiMetrics;
}
