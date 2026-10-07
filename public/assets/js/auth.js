/**
 * CAKRAWALA Digital Library - Centralized Authentication & Session Management
 * File: public/assets/js/auth.js
 * 
 * Satu file terpusat untuk mengelola seluruh siklus autentikasi:
 * 1. Login Form & Kredensial (halaman login.html)
 * 2. Proteksi Sesi & Profil Anggota (Siswa & Guru di siswa-guru/dashboard.html)
 * 3. Proteksi Sesi & Profil Petugas (Petugas di petugas/dashboard.html)
 * 4. Pengendali Logout Universal
 */

import { db } from './supabaseClient.js';

/* ==========================================================================
   1. UTILITY SESI & STORAGE
   ========================================================================== */

/**
 * Mengambil data user yang sedang login dari storage
 */
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem('cakrawala_user') || localStorage.getItem('cakrawala_user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Membersihkan seluruh data sesi autentikasi
 */
export function clearSession() {
  sessionStorage.removeItem('cakrawala_user');
  sessionStorage.removeItem('cakrawala_logged_in');
  sessionStorage.removeItem('cakrawala_role');
  localStorage.removeItem('cakrawala_user');
  localStorage.removeItem('cakrawala_logged_in');
  localStorage.removeItem('cakrawala_role');
}

/**
 * Helper mengarahkan pengguna ke halaman login berdasarkan lokasi URL saat ini
 */
function redirectToLogin() {
  const isNested = window.location.pathname.includes('/siswa-guru/') ||
                   window.location.pathname.includes('/petugas/') ||
                   window.location.pathname.includes('/admin/');
  window.location.replace(isNested ? '../login.html' : 'login.html');
}

/* ==========================================================================
   2. KONTROLER HALAMAN LOGIN (login.html)
   ========================================================================== */

function initLoginForm() {
  const loginForm = document.querySelector('#loginForm');
  if (!loginForm) return;

  const usernameInput = document.querySelector('#username');
  const passwordInput = document.querySelector('#password');
  const toggleButton = document.querySelector('#togglePassword');
  const toggleIcon = document.querySelector('#toggleIcon');
  const errorMessage = document.querySelector('#error-message');
  const loginButton = document.querySelector('#loginButton');

  // Modal Lupa Password
  const btnForgotPassword = document.querySelector('#btnForgotPassword');
  const modalForgotPassword = document.querySelector('#modalForgotPassword');
  const closeForgotModal = document.querySelector('#closeForgotModal');
  const btnOkForgot = document.querySelector('#btnOkForgot');

  function showError(message) {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function resolveBukuId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('buku_id');
  }

  function redirectByRole(role) {
    const r = (role || '').trim().toLowerCase();
    const bukuId = resolveBukuId();
    if (r === 'siswa' || r === 'guru') {
      if (bukuId) {
        window.location.href = 'siswa-guru/dashboard.html?action=pinjam&buku_id=' + encodeURIComponent(bukuId);
      } else {
        window.location.href = 'siswa-guru/dashboard.html';
      }
    } else if (r === 'petugas') {
      window.location.href = 'petugas/dashboard.html';
    } else if (r === 'admin') {
      window.location.href = 'admin/dashboard.html';
    } else {
      window.location.href = 'siswa-guru/dashboard.html';
    }
  }

  // Event Toggle Intip Password
  if (toggleButton && passwordInput && toggleIcon) {
    toggleButton.addEventListener('click', function () {
      const show = passwordInput.type === 'password';
      passwordInput.type = show ? 'text' : 'password';
      toggleIcon.className = show ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
  }

  // Event Modal Lupa Password
  function openForgotModal() {
    if (modalForgotPassword) {
      modalForgotPassword.classList.remove('hidden');
      modalForgotPassword.classList.add('flex');
    }
  }

  function hideForgotModal() {
    if (modalForgotPassword) {
      modalForgotPassword.classList.add('hidden');
      modalForgotPassword.classList.remove('flex');
    }
  }

  if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', function (e) {
      e.preventDefault();
      openForgotModal();
    });
  }

  if (closeForgotModal) closeForgotModal.addEventListener('click', hideForgotModal);
  if (btnOkForgot) btnOkForgot.addEventListener('click', hideForgotModal);
  if (modalForgotPassword) {
    modalForgotPassword.addEventListener('click', function (e) {
      if (e.target === modalForgotPassword) hideForgotModal();
    });
  }

  // Proses Submit Form Login
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (errorMessage) errorMessage.classList.add('hidden');

    const identifier = usernameInput ? usernameInput.value.trim() : '';
    const passwordValue = passwordInput ? passwordInput.value : '';

    if (!identifier || !passwordValue) {
      showError('Semua field wajib diisi.');
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Memverifikasi...';
    }

    try {
      // 1. Cek langsung ke database Supabase
      if (db) {
        // Cari akun di data_user via username (case-insensitive)
        let { data: userMatch } = await db
          .from('data_user')
          .select('id_user, username, password, role')
          .ilike('username', identifier)
          .maybeSingle();

        // Jika tidak ditemukan via username, cari via NIP / Email Guru
        if (!userMatch) {
          const { data: guruMatch } = await db
            .from('data_guru')
            .select('id_user')
            .or('nip_guru.eq.' + identifier + ',email_guru.ilike.' + identifier)
            .maybeSingle();

          if (guruMatch && guruMatch.id_user) {
            const { data: userFromGuru } = await db
              .from('data_user')
              .select('id_user, username, password, role')
              .eq('id_user', guruMatch.id_user)
              .maybeSingle();
            if (userFromGuru) userMatch = userFromGuru;
          }
        }

        // Jika belum ditemukan, cari via NISN / Email Siswa
        if (!userMatch) {
          const { data: siswaMatch } = await db
            .from('data_siswa')
            .select('id_user')
            .or('nisn_siswa.eq.' + identifier + ',email_siswa.ilike.' + identifier)
            .maybeSingle();

          if (siswaMatch && siswaMatch.id_user) {
            const { data: userFromSiswa } = await db
              .from('data_user')
              .select('id_user, username, password, role')
              .eq('id_user', siswaMatch.id_user)
              .maybeSingle();
            if (userFromSiswa) userMatch = userFromSiswa;
          }
        }

        // Jika belum ditemukan, cari via ID Petugas / Email Petugas
        if (!userMatch) {
          const { data: petugasMatch } = await db
            .from('data_petugas')
            .select('id_user')
            .or('id_petugas.eq.' + identifier + ',email_petugas.ilike.' + identifier)
            .maybeSingle();

          if (petugasMatch && petugasMatch.id_user) {
            const { data: userFromPetugas } = await db
              .from('data_user')
              .select('id_user, username, password, role')
              .eq('id_user', petugasMatch.id_user)
              .maybeSingle();
            if (userFromPetugas) userMatch = userFromPetugas;
          }
        }

        // Jika user ditemukan dan password cocok
        if (userMatch && userMatch.password === passwordValue) {
          const roleClean = (userMatch.role || 'Siswa').trim();
          const payload = JSON.stringify({ 
            id_user: userMatch.id_user, 
            username: userMatch.username, 
            role: roleClean 
          });
          sessionStorage.setItem('cakrawala_logged_in', 'true');
          sessionStorage.setItem('cakrawala_role', roleClean);
          sessionStorage.setItem('cakrawala_user', payload);
          localStorage.setItem('cakrawala_logged_in', 'true');
          localStorage.setItem('cakrawala_role', roleClean);
          localStorage.setItem('cakrawala_user', payload);
          redirectByRole(roleClean);
          return;
        }
      }

      showError('NISN, NIP, Email, atau password salah.');
    } catch (err) {
      console.error('Login error:', err);
      showError('Terjadi gangguan saat memverifikasi akun.');
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Log In';
      }
    }
  });
}

// Jalankan form login otomatis jika ada form di halaman aktif
initLoginForm();

/* ==========================================================================
   3. KONTROLER SESI & PROFIL SISWA & GURU (siswa-guru/dashboard.html)
   ========================================================================== */

/**
 * Memvalidasi sesi login anggota (Siswa atau Guru) dan memuat profil data terkait
 * @param {Object} targetState Objek state dashboard siswa-guru
 */
export async function initSessionAndMember(targetState = {}) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return;
  }

  try {
    const role = (user.role || '').trim().toLowerCase();
    if (role !== 'siswa' && role !== 'guru') {
      redirectToLogin();
      return;
    }

    targetState.currentUser = user;
    targetState.memberType = role;

    // 1. Ambil data profil dari database Supabase
    if (db && user.id_user) {
      if (targetState.memberType === 'siswa') {
        const { data: siswaData, error: errSiswa } = await db
          .from('data_siswa')
          .select('*')
          .eq('id_user', user.id_user)
          .maybeSingle();

        if (!errSiswa && siswaData) {
          targetState.memberProfile = siswaData;
          targetState.memberId = siswaData.nisn_siswa;
        } else {
          // Fallback cari via username NISN
          const { data: fallbackSiswa } = await db
            .from('data_siswa')
            .select('*')
            .eq('nisn_siswa', user.username)
            .maybeSingle();
          if (fallbackSiswa) {
            targetState.memberProfile = fallbackSiswa;
            targetState.memberId = fallbackSiswa.nisn_siswa;
          } else {
            targetState.memberId = user.username || 'SISWA001';
            targetState.memberProfile = {
              nama_siswa: user.username || 'Siswa Cakrawala',
              nisn_siswa: targetState.memberId,
              kelas: 'Siswa',
              email_siswa: '-',
              kontak_siswa: '-'
            };
          }
        }
      } else {
        // Profil Guru
        const { data: guruData, error: errGuru } = await db
          .from('data_guru')
          .select('*')
          .eq('id_user', user.id_user)
          .maybeSingle();

        if (!errGuru && guruData) {
          targetState.memberProfile = guruData;
          targetState.memberId = guruData.nip_guru;
        } else {
          // Fallback cari via NIP
          const { data: fallbackGuru } = await db
            .from('data_guru')
            .select('*')
            .eq('nip_guru', user.username)
            .maybeSingle();
          if (fallbackGuru) {
            targetState.memberProfile = fallbackGuru;
            targetState.memberId = fallbackGuru.nip_guru;
          } else {
            targetState.memberId = user.username || 'GURU001';
            targetState.memberProfile = {
              nama_guru: user.username || 'Guru Pengajar',
              nip_guru: targetState.memberId,
              mata_pelajaran: 'Pengajar',
              email_guru: '-',
              kontak_guru: '-'
            };
          }
        }
      }
    } else {
      // Fallback offline testing
      targetState.memberId = user.username || (targetState.memberType === 'guru' ? 'GURU001' : 'SISWA001');
      targetState.memberProfile = {
        nama_siswa: user.username || 'Pengguna',
        nama_guru: user.username || 'Pengguna Guru',
        nisn_siswa: targetState.memberId,
        nip_guru: targetState.memberId,
        kelas: 'Aktif',
        mata_pelajaran: 'Pengajar'
      };
    }

    updateMemberProfileDisplay(targetState);
    return targetState;
  } catch (err) {
    console.error('Gagal memverifikasi sesi siswa/guru:', err);
    redirectToLogin();
  }
}

/**
 * Menampilkan nama, subteks, inisial avatar, dan badge peran pada sidebar & header dashboard siswa-guru
 * @param {Object} targetState Objek state dashboard siswa-guru
 */
export function updateMemberProfileDisplay(targetState = {}) {
  const profile = targetState.memberProfile || {};
  const isGuru = targetState.memberType === 'guru';

  const nama = isGuru ? (profile.nama_guru || 'Guru') : (profile.nama_siswa || 'Siswa');
  const sub = isGuru 
    ? `Guru &bull; ${profile.mata_pelajaran || 'Pengajar'}` 
    : `Siswa &bull; Kelas ${profile.kelas || '-'}`;

  const nameEl = document.getElementById('memberUserName');
  const subEl = document.getElementById('memberUserSub');
  const avatarEl = document.getElementById('memberAvatarInitials');
  const roleBadgeEl = document.getElementById('memberRoleBadge');
  const welcomeNameEl = document.getElementById('welcomeMemberName');
  const welcomeRoleEl = document.getElementById('welcomeMemberRole');

  if (nameEl) nameEl.textContent = nama;
  if (subEl) subEl.innerHTML = sub;
  if (welcomeNameEl) welcomeNameEl.textContent = nama;
  if (welcomeRoleEl) welcomeRoleEl.textContent = isGuru ? 'Guru Pengajar' : 'Siswa';

  if (avatarEl) {
    if (profile.foto_profil) {
      avatarEl.innerHTML = `<img src="${profile.foto_profil}" class="h-full w-full object-cover rounded-xl" alt="Foto Profil" />`;
      avatarEl.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-xs overflow-hidden border border-slate-200/60';
    } else {
      avatarEl.innerHTML = `<i class="ph-fill ph-user text-2xl text-white"></i>`;
      avatarEl.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-300 text-white shadow-xs overflow-hidden';
    }
  }

  if (roleBadgeEl) {
    roleBadgeEl.textContent = isGuru ? 'Guru' : 'Siswa';
    roleBadgeEl.className = isGuru
      ? 'rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200'
      : 'rounded-full bg-blue-100 text-navy px-2 py-0.5 text-[10px] font-bold border border-blue-200';
  }
}

/* ==========================================================================
   4. KONTROLER SESI & PROFIL PETUGAS (petugas/dashboard.html)
   ========================================================================== */

/**
 * Memeriksa sesi login petugas dan mengambil data profil dari tabel 'data_petugas'
 * @param {Object} targetState Objek state dashboard petugas
 */
export async function initSessionAndOfficer(targetState = {}) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return;
  }

  try {
    const role = (user.role || '').trim().toLowerCase();
    if (role !== 'petugas' && role !== 'admin') {
      redirectToLogin();
      return;
    }

    targetState.currentUser = user;

    // Ambil data profil petugas dari tabel 'data_petugas'
    if (user.id_user && db) {
      const { data, error } = await db
        .from('data_petugas')
        .select('*')
        .eq('id_user', user.id_user)
        .maybeSingle();

      if (!error && data) {
        targetState.officerProfile = data;
        updateOfficerProfileDisplay(data.nama_petugas);
      } else {
        updateOfficerProfileDisplay(user.username || 'Petugas');
      }
    } else {
      updateOfficerProfileDisplay(user.username || 'Petugas');
    }

    return targetState;
  } catch (err) {
    console.error('Gagal memverifikasi sesi petugas:', err);
    redirectToLogin();
  }
}

/**
 * Menampilkan nama dan inisial avatar petugas pada sidebar
 * @param {string} name Nama petugas
 */
export function updateOfficerProfileDisplay(name) {
  const nameEl = document.getElementById('petugasUserName');
  const avatarEl = document.getElementById('petugasAvatarInitials');

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) {
    const parts = (name || '').trim().split(' ');
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name || 'PT').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

/* ==========================================================================
   5. KONTROLER MODAL LOGOUT UNIVERSAL (Siswa-Guru & Petugas)
   ========================================================================== */

/**
 * Memasang pendengar peristiwa untuk modal keluar (Logout)
 */
export function setupLogout() {
  const btnLogout = document.getElementById('btnLogout');
  const modal = document.getElementById('modalLogout');
  const content = document.getElementById('modalLogoutContent');
  const cancelBtn = document.getElementById('btnCancelLogout');
  const confirmBtn = document.getElementById('btnConfirmLogout');

  function openLogoutModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      if (content) {
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
      }
    });
  }

  function closeLogoutModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
      content.classList.remove('scale-100');
      content.classList.add('scale-95');
    }
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  }

  if (btnLogout) btnLogout.addEventListener('click', openLogoutModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeLogoutModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLogoutModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      clearSession();

      // Buat feedback toast jika kontainer toast tersedia
      const toastContainer = document.getElementById('toastContainer');
      if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl border border-slate-200 animate-toast';
        toast.innerHTML = '<i class="ph-fill ph-info text-2xl text-navy"></i><div class="flex-1 text-xs font-semibold text-slate-800 leading-snug">Berhasil keluar. Mengalihkan ke halaman login...</div>';
        toastContainer.appendChild(toast);
      }

      setTimeout(() => {
        redirectToLogin();
      }, 700);
    });
  }
}