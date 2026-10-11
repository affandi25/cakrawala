/**
 * CAKRAWALA Digital Library - Modul Visual Kartu Anggota Digital
 * File: public/siswa-guru/modules/profil/kartuAnggota.js
 * 
 * Tanggung Jawab:
 * - Merender kartu identitas digital anggota perpustakaan (#cardMemberNama, etc.)
 * - Menghasilkan QR Code dinamis berbasis NISN (siswa) atau NIP (guru)
 */

import { state } from '../state.js';

/**
 * Mengambil inisial 2 huruf dari nama pengguna
 * @param {string} name 
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || !name.trim()) return 'SW';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

/**
 * Merender elemen visual Kartu Anggota Digital dan QR Code
 * @param {object} profile Objek data profil anggota
 * @param {boolean} isGuru Status apakah anggota bertipe guru
 * @param {string} foto URL foto profil atau string base64
 */
export function renderKartuAnggota(profile, isGuru, foto) {
  const nama = isGuru ? (profile.nama_guru || 'Guru Pengajar') : (profile.nama_siswa || 'Siswa Cakrawala');
  const nomorId = isGuru ? (profile.nip_guru || state.memberId) : (profile.nisn_siswa || state.memberId);
  const detail = isGuru ? (profile.mata_pelajaran || 'Pengajar') : `Kelas ${profile.kelas || '-'}`;

  const cardNamaEl = document.getElementById('cardMemberNama');
  const cardIdEl = document.getElementById('cardMemberId');
  const cardDetailEl = document.getElementById('cardMemberDetail');
  const cardRoleEl = document.getElementById('cardMemberRole');
  const cardIdLabel = document.getElementById('cardMemberIdLabel');
  const cardAvatarEl = document.getElementById('cardMemberAvatar');

  if (cardNamaEl) cardNamaEl.textContent = nama;
  if (cardIdEl) cardIdEl.textContent = nomorId;
  if (cardDetailEl) cardDetailEl.textContent = detail;
  if (cardRoleEl) cardRoleEl.textContent = isGuru ? 'GURU PENGAJAR' : 'SISWA PERPUSTAKAAN';
  if (cardIdLabel) cardIdLabel.textContent = isGuru ? 'NIP' : 'NISN';

  if (cardAvatarEl) {
    if (foto) {
      cardAvatarEl.innerHTML = `<img src="${foto}" class="h-full w-full object-cover rounded-2xl" alt="${nama}" />`;
    } else {
      cardAvatarEl.innerHTML = `<i class="ph-fill ph-user text-3xl text-white"></i>`;
      cardAvatarEl.className = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md border-2 border-white/40 overflow-hidden';
    }
  }

  // Render QR Code Kartu Anggota
  const qrContainer = document.getElementById('cardMemberQrContainer');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    new window.QRCode(qrContainer, {
      text: String(nomorId || 'CAKRAWALA'),
      width: 90,
      height: 90,
      colorDark: '#000C4F',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }
}
