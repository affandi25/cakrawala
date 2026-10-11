/**
 * CAKRAWALA Digital Library - Modul Tab 5: Kartu Anggota Digital & Pengaturan Profil (Koordinator Fitur)
 * File: public/siswa-guru/modules/profil/index.js
 * 
 * Sub-modul:
 * - kartuAnggota.js      : Render visual kartu anggota digital & QR Code identitas
 * - pengaturanProfil.js  : Kompresi foto avatar & formulir submit update profil ke database
 */

import { state } from '../state.js';
import { renderKartuAnggota, getInitials } from './kartuAnggota.js';
import {
  renderFormProfil,
  setupProfileForm,
  compressImage,
  getTempPhotoBase64
} from './pengaturanProfil.js';

// Re-ekspor fungsi
export {
  renderKartuAnggota,
  getInitials,
  renderFormProfil,
  compressImage
};

/**
 * Merender seluruh komponen profil (Kartu Digital & Form Pengaturan)
 */
export function renderProfil() {
  const profile = state.memberProfile || {};
  const isGuru = state.memberType === 'guru';
  const tempPhoto = getTempPhotoBase64();
  const foto = (tempPhoto !== null) ? tempPhoto : (profile.foto_profil || '');

  renderKartuAnggota(profile, isGuru, foto);
  renderFormProfil(profile, isGuru, foto);
}

/**
 * Setup seluruh pendengar event pada modul profil
 */
export function setupProfileModule() {
  setupProfileForm(() => {
    renderProfil();
  });
}
