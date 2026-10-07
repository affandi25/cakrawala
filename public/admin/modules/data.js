/**
 * CAKRAWALA Digital Library - Data Synchronization Admin Module
 * File: public/admin/modules/data.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state, DOM } from './state.js';
import { renderTable, renderTableError, updateBadge } from './table.js';

/**
 * Generate ID User unik yang muat dalam VARCHAR(10)
 */
export function generateUserId() {
  const timestampStr = Date.now().toString(36).toUpperCase();
  const randomHex = Math.random().toString(36).substring(2, 5).toUpperCase();
  return ('U' + timestampStr + randomHex).slice(0, 10);
}

/**
 * Helper untuk memastikan relasi data_user terhubung dengan aman
 */
export async function enrichWithUserData(rows, fkColumn = 'id_user') {
  if (!rows || rows.length === 0) return rows;

  const needsFallback = rows.some(r => r[fkColumn] && (!r.data_user || typeof r.data_user !== 'object'));
  if (!needsFallback) return rows;

  try {
    const userIds = rows.map(r => r[fkColumn]).filter(Boolean);
    if (userIds.length === 0) return rows;

    const { data: users, error } = await db
      .from('data_user')
      .select('id_user, username, role')
      .in('id_user', userIds);

    if (!error && users) {
      const userMap = {};
      users.forEach(u => { userMap[u.id_user] = u; });

      rows.forEach(r => {
        if (!r.data_user && r[fkColumn] && userMap[r[fkColumn]]) {
          r.data_user = userMap[r[fkColumn]];
        }
      });
    }
  } catch (err) {
    console.warn('Fallback user data query error:', err);
  }

  return rows;
}

/**
 * Mengambil data siswa dari Supabase
 */
export async function fetchSiswa() {
  const { data, error } = await db
    .from('data_siswa')
    .select('nisn_siswa, nama_siswa, kelas, email_siswa, kontak_siswa, id_user, data_user(id_user, username, role)')
    .order('nama_siswa', { ascending: true });

  if (error) throw error;
  return await enrichWithUserData(data, 'id_user');
}

/**
 * Mengambil data guru dari Supabase
 */
export async function fetchGuru() {
  const { data, error } = await db
    .from('data_guru')
    .select('nip_guru, nama_guru, mata_pelajaran, email_guru, kontak_guru, id_user, data_user(id_user, username, role)')
    .order('nama_guru', { ascending: true });

  if (error) throw error;
  return await enrichWithUserData(data, 'id_user');
}

/**
 * Mengambil data petugas dari Supabase
 */
export async function fetchPetugas() {
  const { data, error } = await db
    .from('data_petugas')
    .select('id_petugas, nama_petugas, email_petugas, kontak_petugas, id_user, data_user(id_user, username, role)')
    .order('nama_petugas', { ascending: true });

  if (error) throw error;
  return await enrichWithUserData(data, 'id_user');
}

/**
 * Muat seluruh data untuk tab aktif dan perbarui badge hitungan
 */
export async function loadData(tab = state.activeTab, isSilent = false) {
  if (!isSilent) {
    state.isLoading = true;
    renderTable();
  }

  if (DOM.iconRefresh) DOM.iconRefresh.classList.add('animate-spin');

  try {
    if (tab === 'siswa') {
      const data = await fetchSiswa();
      state.cache.siswa = data || [];
      updateBadge('siswa', state.cache.siswa.length);
    } else if (tab === 'guru') {
      const data = await fetchGuru();
      state.cache.guru = data || [];
      updateBadge('guru', state.cache.guru.length);
    } else if (tab === 'petugas') {
      const data = await fetchPetugas();
      state.cache.petugas = data || [];
      updateBadge('petugas', state.cache.petugas.length);
    }
    state.isLoading = false;
    renderTable();
  } catch (err) {
    console.error('Error saat mengambil data Supabase:', err);
    state.isLoading = false;
    renderTableError(err.message || 'Gagal tersambung ke database Supabase.');
  } finally {
    if (DOM.iconRefresh) {
      setTimeout(() => DOM.iconRefresh.classList.remove('animate-spin'), 300);
    }
  }
}

/**
 * Refresh semua hitungan badge entitas di background
 */
export async function refreshAllBadges() {
  try {
    const [siswaRes, guruRes, petugasRes] = await Promise.all([
      db.from('data_siswa').select('nisn_siswa', { count: 'exact', head: true }),
      db.from('data_guru').select('nip_guru', { count: 'exact', head: true }),
      db.from('data_petugas').select('id_petugas', { count: 'exact', head: true })
    ]);

    if (siswaRes.count !== null && siswaRes.count !== undefined) updateBadge('siswa', siswaRes.count);
    if (guruRes.count !== null && guruRes.count !== undefined) updateBadge('guru', guruRes.count);
    if (petugasRes.count !== null && petugasRes.count !== undefined) updateBadge('petugas', petugasRes.count);
  } catch (err) {
    console.warn('Gagal memuat ringkasan badge:', err);
  }
}
