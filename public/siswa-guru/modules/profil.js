/**
 * CAKRAWALA Digital Library - Modul Tab 5: Kartu Anggota Digital & Pengaturan Profil
 * File: public/siswa-guru/modules/profil.js
 */

import { state } from './state.js';
import { db } from '../../assets/js/supabaseClient.js';
import { showToast } from './siswaHelper.js';
import { updateMemberProfileDisplay } from '../../assets/js/auth.js';

// Menyimpan foto sementara sebelum disimpan ke database
let tempPhotoBase64 = null;

/**
 * Kompres gambar agar efisien (<50KB) sebelum disimpan
 * @param {File} file Objek file gambar dari input
 * @returns {Promise<string>} Base64 data URL
 */
function compressImage(file, maxWidth = 360, maxHeight = 360, quality = 0.85) {
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

        // Ekspor ke WebP jika didukung, fallback JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || dataUrl.indexOf('data:image/webp') !== 0) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Mengambil inisial 2 huruf dari nama
 */
function getInitials(name) {
  if (!name || !name.trim()) return 'SW';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

/**
 * Merender kartu anggota digital dan informasi akun profil
 */
export function renderProfil() {
  const profile = state.memberProfile || {};
  const isGuru = state.memberType === 'guru';

  const nama = isGuru ? (profile.nama_guru || 'Guru Pengajar') : (profile.nama_siswa || 'Siswa Cakrawala');
  const nomorId = isGuru ? (profile.nip_guru || state.memberId) : (profile.nisn_siswa || state.memberId);
  const detail = isGuru ? (profile.mata_pelajaran || 'Pengajar') : `Kelas ${profile.kelas || '-'}`;
  const email = isGuru ? (profile.email_guru || '') : (profile.email_siswa || '');
  const kontak = isGuru ? (profile.kontak_guru || '') : (profile.kontak_siswa || '');
  const foto = (tempPhotoBase64 !== null) ? tempPhotoBase64 : (profile.foto_profil || '');

  // 1. Tampilan Kartu Digital
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

  const initials = getInitials(nama);

  if (cardAvatarEl) {
    if (foto) {
      cardAvatarEl.innerHTML = `<img src="${foto}" class="h-full w-full object-cover rounded-2xl" alt="${nama}" />`;
    } else {
      cardAvatarEl.innerHTML = `<i class="ph-fill ph-user text-3xl text-white"></i>`;
      cardAvatarEl.className = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md border-2 border-white/40 overflow-hidden';
    }
  }

  // 2. Render QR Code Kartu Anggota
  const qrContainer = document.getElementById('cardMemberQrContainer');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    new window.QRCode(qrContainer, {
      text: nomorId,
      width: 90,
      height: 90,
      colorDark: '#000C4F',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  // 3. Tampilan Preview Avatar di Form Pengaturan
  const previewAvatarEl = document.getElementById('profileAvatarPreview');
  const btnRemovePhoto = document.getElementById('btnRemoveProfilePhoto');

  if (previewAvatarEl) {
    if (foto) {
      previewAvatarEl.innerHTML = `<img src="${foto}" class="h-full w-full object-cover rounded-2xl" alt="Foto Profil" />`;
      if (btnRemovePhoto) btnRemovePhoto.classList.remove('hidden');
    } else {
      previewAvatarEl.innerHTML = `<i class="ph-fill ph-user text-4xl text-white"></i>`;
      previewAvatarEl.className = 'flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-300 text-white shadow-md overflow-hidden border-2 border-white';
      if (btnRemovePhoto) btnRemovePhoto.classList.add('hidden');
    }
  }

  // 4. Isi Form Input Profil
  const inputNama = document.getElementById('inputProfileNama');
  const inputId = document.getElementById('inputProfileId');
  const inputDetail = document.getElementById('inputProfileDetail');
  const inputEmail = document.getElementById('inputProfileEmail');
  const inputKontak = document.getElementById('inputProfileKontak');
  const labelId = document.getElementById('labelProfileId');
  const labelDetail = document.getElementById('labelProfileDetail');

  if (inputNama) inputNama.value = nama;
  if (inputId) inputId.value = nomorId;
  if (inputDetail) inputDetail.value = isGuru ? (profile.mata_pelajaran || '-') : (profile.kelas || '-');
  if (labelId) labelId.textContent = isGuru ? 'Nomor Identitas (NIP)' : 'Nomor Identitas (NISN)';
  if (labelDetail) labelDetail.textContent = isGuru ? 'Mata Pelajaran Diampu' : 'Kelas Terdaftar';

  // Jangan override input jika user sedang mengetik
  if (inputEmail && !inputEmail.matches(':focus')) {
    inputEmail.value = email;
  }
  if (inputKontak && !inputKontak.matches(':focus')) {
    inputKontak.value = kontak;
  }
}

/**
 * Menyiapkan event listener untuk upload foto profil dan form submit
 */
export function setupProfileModule() {
  const inputPhoto = document.getElementById('inputProfilePhoto');
  const btnRemovePhoto = document.getElementById('btnRemoveProfilePhoto');
  const formProfile = document.getElementById('formMemberProfile');
  const btnSave = document.getElementById('btnSaveProfile');
  const iconSave = document.getElementById('iconSaveProfile');
  const textSave = document.getElementById('textSaveProfile');

  // 1. Pilih Foto Profil Baru
  if (inputPhoto) {
    inputPhoto.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('File yang dipilih harus berupa gambar (JPG, PNG, atau WebP).', 'error');
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        showToast('Ukuran gambar maksimal 3MB.', 'warning');
        return;
      }

      try {
        const compressedBase64 = await compressImage(file, 360, 360, 0.85);
        tempPhotoBase64 = compressedBase64;

        // Perbarui pratinjau langsung di halaman
        renderProfil();

        // Perbarui pratinjau di sidebar avatar juga
        const sidebarAvatar = document.getElementById('memberAvatarInitials');
        if (sidebarAvatar) {
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
      tempPhotoBase64 = ''; // String kosong menandakan foto dihapus
      renderProfil();

      // Perbarui pratinjau avatar sidebar ke ikon WhatsApp default
      const sidebarAvatar = document.getElementById('memberAvatarInitials');
      if (sidebarAvatar) {
        sidebarAvatar.innerHTML = '<i class="ph-fill ph-user text-2xl text-white"></i>';
        sidebarAvatar.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-300 text-white shadow-xs overflow-hidden';
      }

      showToast('Foto profil dihapus dari pratinjau. Klik "Simpan Perubahan Profil" untuk menerapkan.', 'info');
    });
  }

  // 3. Simpan Perubahan Profil Mandiri
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

      // Tentukan foto yang akan disimpan
      let newPhoto = state.memberProfile?.foto_profil || null;
      if (tempPhotoBase64 !== null) {
        newPhoto = tempPhotoBase64.length > 0 ? tempPhotoBase64 : null;
      }

      // UI Loading State
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

        // Perbarui State Lokal
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

        // Perbarui SessionStorage
        try {
          const rawSession = sessionStorage.getItem('cakrawala_user');
          if (rawSession) {
            const parsed = JSON.parse(rawSession);
            parsed.email = newEmail;
            parsed.kontak = newKontak;
            parsed.foto_profil = newPhoto;
            sessionStorage.setItem('cakrawala_user', JSON.stringify(parsed));
          }
        } catch (_) {}

        // Reset temp photo
        tempPhotoBase64 = null;

        // Render ulang kartu anggota & profil
        renderProfil();

        // Render ulang tampilan avatar dan nama di sidebar
        updateMemberProfileDisplay(state);

        showToast('Profil dan foto berhasil diperbarui!', 'success');
      } catch (err) {
        console.error('Gagal menyimpan profil:', err);
        showToast('Gagal menyimpan profil: ' + (err.message || 'Koneksi bermasalah'), 'error');
      } finally {
        if (btnSave) btnSave.disabled = false;
        if (iconSave) iconSave.className = 'ph ph-floppy-disk text-base';
        if (textSave) textSave.textContent = 'Simpan Perubahan Profil';
      }
    });
  }
}
