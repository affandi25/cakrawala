/**
 * CAKRAWALA Digital Library - Modul Profil Pengguna & Logout (Koordinator & Entry Point)
 * File: public/siswa-guru/modules/4-profil/index.js
 * 
 * Tanggung Jawab:
 * - Titik masuk tunggal untuk modul profil pengguna dan logout
 * - Ekspor seluruh fungsionalitas kartu anggota, pengaturan profil, dan logout
 * - Mendaftarkan fungsi global (window.loadUserProfile, window.handleLogout) secara aman
 */

import {
    loadUserProfile,
    renderProfil,
    renderKartuAnggota,
    renderFormProfil,
    setupProfileModule,
    handleLogout,
    compressImage,
    getInitials
} from './profilUser.js';

export {
    loadUserProfile,
    renderProfil,
    renderKartuAnggota,
    renderFormProfil,
    setupProfileModule,
    handleLogout,
    compressImage,
    getInitials
};

// Bind fungsi ke window dengan null-safety checking
if (typeof window !== 'undefined') {
    window.loadUserProfile = loadUserProfile;
    window.handleLogout = handleLogout;
    window.renderProfil = renderProfil;
}
