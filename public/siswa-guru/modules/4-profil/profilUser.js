/**
 * CAKRAWALA Digital Library - Modul Profil Pengguna & Logout
 * File: public/siswa-guru/modules/4-profil/profilUser.js
 * 
 * Tanggung Jawab:
 * - Mengambil data profil pengguna yang sedang login dari sesi auth & Supabase
 * - Merender data identitas (Nama, NISN/NIP, Role) dan ringkasan aktivitas (total riwayat, sisa kuota) ke tab-profil.html
 * - Merender Kartu Anggota Digital Luxury Style dengan QR Code dinamis via QRCode.js
 * - Formulir pembaruan kontak (email, WhatsApp) & kompresi foto avatar (<50KB)
 * - Menangani logika logout aman via auth.js dan modal konfirmasi (#modalLogout)
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { state } from '../state.js';
import { showToast, escapeHtml } from '../../../assets/js/sharedUtils.js';
import { getCurrentUser, clearSession, updateMemberProfileDisplay } from '../../../assets/js/auth.js';

let tempPhotoBase64 = null;
let isProfileModuleSetup = false;

export function getTempPhotoBase64() {
  return tempPhotoBase64;
}

export function setTempPhotoBase64(val) {
  tempPhotoBase64 = val;
}

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
 * Kompres gambar client-side (<50KB WebP/JPEG) sebelum diunggah
 * @param {File} file 
 * @param {number} [maxWidth=360] 
 * @param {number} [maxHeight=360] 
 * @param {number} [quality=0.85] 
 * @returns {Promise<string>} Base64 data URL
 */
export function compressImage(file, maxWidth = 360, maxHeight = 360, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || dataUrl.indexOf('data:image/webp') !== 0) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Mengambil dan menyinkronkan data profil pengguna yang sedang login
 * @returns {Promise<object|null>}
 */
export async function loadUserProfile() {
  const user = getCurrentUser();
  if (!user) {
    console.warn('[4-profil] Pengguna tidak ditemukan dalam sesi.');
    return null;
  }

  const role = (user.role || '').trim().toLowerCase();
  state.currentUser = user;
  state.memberType = role;

  if (db && user.id_user) {
    try {
      if (role === 'guru') {
        const { data: guruData, error } = await db
          .from('data_guru')
          .select('*')
          .eq('id_user', user.id_user)
          .maybeSingle();

        if (!error && guruData) {
          state.memberProfile = guruData;
          state.memberId = guruData.nip_guru;
        }
      } else {
        const { data: siswaData, error } = await db
          .from('data_siswa')
          .select('*')
          .eq('id_user', user.id_user)
          .maybeSingle();

        if (!error && siswaData) {
          state.memberProfile = siswaData;
          state.memberId = siswaData.nisn_siswa;
        }
      }
    } catch (err) {
      console.error('[4-profil] Gagal fetch profil dari database:', err);
    }
  }

  // Sinkronkan tampilan nama & avatar di sidebar
  updateMemberProfileDisplay(state);
  renderProfil();

  return state.memberProfile;
}

/**
 * Merender visual Kartu Anggota Digital ke dalam tab-profil
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
  if (cardIdEl) cardIdEl.textContent = nomorId || '00000000';
  if (cardDetailEl) cardDetailEl.textContent = detail;
  if (cardRoleEl) cardRoleEl.textContent = isGuru ? 'GURU PENGAJAR' : 'SISWA PERPUSTAKAAN';
  if (cardIdLabel) cardIdLabel.textContent = isGuru ? 'NIP' : 'NISN';

  if (cardAvatarEl) {
    if (foto) {
      cardAvatarEl.innerHTML = `<img src="${escapeHtml(foto)}" class="h-full w-full object-cover rounded-2xl" alt="${escapeHtml(nama)}" />`;
      cardAvatarEl.className = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md border-2 border-white/40 overflow-hidden';
    } else {
      cardAvatarEl.innerHTML = `<i class="ph-fill ph-user text-3xl text-white"></i>`;
      cardAvatarEl.className = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md border-2 border-white/40 overflow-hidden';
    }
  }

  // Render QR Code Kartu Anggota Digital
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

/**
 * Mengisi nilai input form pengaturan profil
 */
export function renderFormProfil(profile, isGuru, foto) {
  const nama = isGuru ? (profile.nama_guru || 'Guru Pengajar') : (profile.nama_siswa || 'Siswa Cakrawala');
  const nomorId = isGuru ? (profile.nip_guru || state.memberId) : (profile.nisn_siswa || state.memberId);
  const email = isGuru ? (profile.email_guru || '') : (profile.email_siswa || '');
  const kontak = isGuru ? (profile.kontak_guru || '') : (profile.kontak_siswa || '');
  const detail = isGuru ? (profile.mata_pelajaran || 'Pengajar') : (profile.kelas || '-');

  // Pratinjau Avatar Form
  const previewAvatarEl = document.getElementById('profileAvatarPreview');
  const btnRemovePhoto = document.getElementById('btnRemoveProfilePhoto');

  if (previewAvatarEl) {
    if (foto) {
      previewAvatarEl.innerHTML = `<img src="${escapeHtml(foto)}" class="h-full w-full object-cover rounded-2xl" alt="Foto Profil" />`;
      if (btnRemovePhoto) btnRemovePhoto.classList.remove('hidden');
    } else {
      previewAvatarEl.innerHTML = `<i class="ph-fill ph-user text-4xl text-white"></i>`;
      previewAvatarEl.className = 'flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-300 text-white shadow-md overflow-hidden border-2 border-white';
      if (btnRemovePhoto) btnRemovePhoto.classList.add('hidden');
    }
  }

  // Isi Form Input
  const inputNama = document.getElementById('inputProfileNama');
  const inputId = document.getElementById('inputProfileId');
  const inputDetail = document.getElementById('inputProfileDetail');
  const inputEmail = document.getElementById('inputProfileEmail');
  const inputKontak = document.getElementById('inputProfileKontak');
  const labelId = document.getElementById('labelProfileId');
  const labelDetail = document.getElementById('labelProfileDetail');

  if (inputNama) inputNama.value = nama;
  if (inputId) inputId.value = nomorId || '';
  if (inputDetail) inputDetail.value = isGuru ? detail : `Kelas ${detail}`;
  if (inputEmail) inputEmail.value = email;
  if (inputKontak) inputKontak.value = kontak;

  if (labelId) labelId.textContent = isGuru ? 'Nomor Identitas Pegawai (NIP)' : 'Nomor Induk Siswa Nasional (NISN)';
  if (labelDetail) labelDetail.textContent = isGuru ? 'Mata Pelajaran Diampu' : 'Kelas Terdaftar';
}

/**
 * Merender seluruh tampilan tab profil: Kartu Digital, Form Input, dan Ringkasan Aktivitas
 */
export function renderProfil() {
  const profile = state.memberProfile || {};
  const isGuru = state.memberType === 'guru';
  const foto = (tempPhotoBase64 !== null) ? tempPhotoBase64 : (profile.foto_profil || '');

  renderKartuAnggota(profile, isGuru, foto);
  renderFormProfil(profile, isGuru, foto);
}

/**
 * Menangani logout pengguna secara terpusat (membuka modal konfirmasi logout)
 */
export function handleLogout() {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.click();
    return;
  }

  const modal = document.getElementById('modalLogout');
  const content = document.getElementById('modalLogoutContent');
  if (modal && content) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      content.classList.remove('scale-95');
      content.classList.add('scale-100');
    });
  } else {
    clearSession();
    window.location.replace('/login.html');
  }
}

/**
 * Setup seluruh event listener formulir profil dan modal logout
 */
export function setupProfileModule() {
  if (isProfileModuleSetup) return;
  isProfileModuleSetup = true;

  // 1. Upload & Kompresi Foto Profil
  const inputPhoto = document.getElementById('inputProfilePhoto');
  const btnRemovePhoto = document.getElementById('btnRemoveProfilePhoto');
  const formProfile = document.getElementById('formMemberProfile');
  const btnSave = document.getElementById('btnSaveProfile');
  const iconSave = document.getElementById('iconSaveProfile');
  const textSave = document.getElementById('textSaveProfile');

  if (inputPhoto) {
    inputPhoto.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
        showToast('Format gambar harus JPG, PNG, atau WebP.', 'warning');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran berkas maksimal 2MB.', 'warning');
        return;
      }

      try {
        tempPhotoBase64 = await compressImage(file, 360, 360, 0.85);
        renderProfil();

        // Perbarui pratinjau avatar sidebar juga
        const sidebarAvatar = document.getElementById('memberAvatarInitials');
        if (sidebarAvatar && tempPhotoBase64) {
          sidebarAvatar.innerHTML = `<img src="${tempPhotoBase64}" class="h-full w-full object-cover rounded-xl" alt="Foto Profil" />`;
          sidebarAvatar.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-xs overflow-hidden border border-slate-200/60';
        }

        showToast('Foto profil dipilih! Klik "Simpan Perubahan Profil" untuk menerapkan.', 'info');
      } catch (err) {
        console.error('Error memproses gambar:', err);
        showToast('Gagal memproses gambar: ' + err.message, 'error');
      }
    });
  }

  // 2. Hapus Foto Profil
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      tempPhotoBase64 = '';
      renderProfil();

      const sidebarAvatar = document.getElementById('memberAvatarInitials');
      if (sidebarAvatar) {
        sidebarAvatar.innerHTML = '<i class="ph-fill ph-user text-2xl text-white"></i>';
        sidebarAvatar.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-300 text-white shadow-xs overflow-hidden';
      }

      showToast('Foto profil dihapus dari pratinjau. Klik "Simpan Perubahan Profil" untuk menerapkan.', 'info');
    });
  }

  // 3. Simpan Perubahan Profil ke Supabase
  if (formProfile) {
    formProfile.addEventListener('submit', async (e) => {
      e.preventDefault();

      const inputEmail = document.getElementById('inputProfileEmail');
      const inputKontak = document.getElementById('inputProfileKontak');

      const newEmail = inputEmail ? inputEmail.value.trim() : '';
      const newKontak = inputKontak ? inputKontak.value.trim() : '';

      if (!newEmail) {
        showToast('Email wajib diisi.', 'warning');
        if (inputEmail) inputEmail.focus();
        return;
      }

      if (!newKontak) {
        showToast('Nomor kontak/WhatsApp wajib diisi.', 'warning');
        if (inputKontak) inputKontak.focus();
        return;
      }

      let newPhoto = state.memberProfile?.foto_profil || null;
      if (tempPhotoBase64 !== null) {
        newPhoto = tempPhotoBase64.length > 0 ? tempPhotoBase64 : null;
      }

      if (btnSave) btnSave.disabled = true;
      if (iconSave) iconSave.className = 'ph ph-circle-notch animate-spin text-base';
      if (textSave) textSave.textContent = 'Menyimpan...';

      try {
        const isGuru = state.memberType === 'guru';

        if (db) {
          if (isGuru) {
            const updatePayload = {
              email_guru: newEmail,
              kontak_guru: newKontak,
              foto_profil: newPhoto
            };

            const query = (state.memberProfile && state.memberProfile.id_user)
              ? db.from('data_guru').update(updatePayload).eq('id_user', state.memberProfile.id_user)
              : db.from('data_guru').update(updatePayload).eq('nip_guru', state.memberProfile?.nip_guru || state.memberId);

            const { error } = await query;
            if (error) throw error;
          } else {
            const updatePayload = {
              email_siswa: newEmail,
              kontak_siswa: newKontak,
              foto_profil: newPhoto
            };

            const query = (state.memberProfile && state.memberProfile.id_user)
              ? db.from('data_siswa').update(updatePayload).eq('id_user', state.memberProfile.id_user)
              : db.from('data_siswa').update(updatePayload).eq('nisn_siswa', state.memberProfile?.nisn_siswa || state.memberId);

            const { error } = await query;
            if (error) throw error;
          }
        }

        // Update State Lokal
        if (!state.memberProfile) state.memberProfile = {};
        if (isGuru) {
          state.memberProfile.email_guru = newEmail;
          state.memberProfile.kontak_guru = newKontak;
          state.memberProfile.foto_profil = newPhoto;
        } else {
          state.memberProfile.email_siswa = newEmail;
          state.memberProfile.kontak_siswa = newKontak;
          state.memberProfile.foto_profil = newPhoto;
        }

        // Simpan ke SessionStorage & LocalStorage agar sesi tetap konsisten lintas tab
        try {
          const rawSession = sessionStorage.getItem('cakrawala_user') || localStorage.getItem('cakrawala_user');
          if (rawSession) {
            const parsed = JSON.parse(rawSession);
            parsed.email = newEmail;
            parsed.kontak = newKontak;
            parsed.foto_profil = newPhoto;
            const serialized = JSON.stringify(parsed);
            sessionStorage.setItem('cakrawala_user', serialized);
            localStorage.setItem('cakrawala_user', serialized);
          }
        } catch (_) { }

        tempPhotoBase64 = null;
        renderProfil();
        updateMemberProfileDisplay(state);

        showToast('Profil dan foto berhasil diperbarui!', 'success');
      } catch (err) {
        console.error('Gagal menyimpan profil:', err);
        showToast('Gagal menyimpan perubahan: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (btnSave) btnSave.disabled = false;
        if (iconSave) iconSave.className = 'ph ph-floppy-disk text-base';
        if (textSave) textSave.textContent = 'Simpan Perubahan Profil';
      }
    });
  }
}
