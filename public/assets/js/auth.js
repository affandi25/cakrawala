/**
 * CAKRAWALA Digital Library - Centralized Authentication & Session Management
 * File: public/assets/js/auth.js
 * 
 * Satu file terpusat untuk mengelola seluruh siklus autentikasi:
 * 1. Login Form & Kredensial Multi-Identitas (halaman login.html)
 * 2. Proteksi Sesi & Profil Anggota (Siswa & Guru di siswa-guru/dashboard.html)
 * 3. Proteksi Sesi & Profil Petugas (Petugas di petugas/dashboard.html)
 * 4. Proteksi Sesi & Profil Admin (Admin di admin/dashboard.html)
 * 5. Pengendali Logout Universal
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
 * Menyimpan data sesi ke sessionStorage dan localStorage sekaligus
 */
export function saveSession(user, role) {
  const roleClean = (role || 'Siswa').trim();
  const payload = JSON.stringify({
    id_user: user.id_user,
    username: user.username,
    role: roleClean
  });

  ['sessionStorage', 'localStorage'].forEach(storage => {
    window[storage].setItem('cakrawala_logged_in', 'true');
    window[storage].setItem('cakrawala_role', roleClean);
    window[storage].setItem('cakrawala_user', payload);
  });
}

/**
 * Membersihkan seluruh data sesi autentikasi
 */
export function clearSession() {
  ['sessionStorage', 'localStorage'].forEach(storage => {
    ['cakrawala_user', 'cakrawala_logged_in', 'cakrawala_role'].forEach(key => {
      window[storage].removeItem(key);
    });
  });
}

/**
 * Mengarahkan pengguna ke halaman login berdasarkan kedalaman URL saat ini
 */
function redirectToLogin() {
  const isNested = window.location.pathname.includes('/siswa-guru/') ||
    window.location.pathname.includes('/petugas/') ||
    window.location.pathname.includes('/admin/');
  window.location.replace(isNested ? '../login.html' : 'login.html');
}

/**
 * Helper perender foto avatar / ikon default petugas & admin
 */
function renderAvatar(el, fotoUrl, altName = 'Pengguna') {
  if (!el) return;
  if (fotoUrl) {
    el.innerHTML = `<img src="${fotoUrl}" class="h-full w-full object-cover rounded-full" alt="${altName}" />`;
    el.className = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 shadow-2xs overflow-hidden border border-slate-200/60';
  } else {
    el.innerHTML = '<i class="ph-fill ph-user text-base text-slate-400"></i>';
    el.className = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 shadow-2xs border border-slate-200/80';
  }
}

/* ==========================================================================
   2. KONTROLER HALAMAN LOGIN (login.html)
   ========================================================================== */

/**
 * Resolusi username dari identifier fleksibel (NISN, NIP, email, atau username).
 * Mencari tabel profil terkait jika identifier bukan username langsung.
 * Mengembalikan string username yang terdaftar di data_user, atau null.
 */
async function resolveUsername(identifier) {
  if (!db) return null;

  // 1. Cek apakah identifier cocok langsung sebagai username di data_user
  const { data: directMatch } = await db
    .from('data_user')
    .select('username')
    .ilike('username', identifier)
    .maybeSingle();

  if (directMatch?.username) return directMatch.username;

  // 2. Jika tidak ditemukan, cari di tabel profil terkait untuk dapat id_user
  const lookups = [
    { table: 'data_guru',    query: `nip_guru.eq.${identifier},email_guru.ilike.${identifier}` },
    { table: 'data_siswa',   query: `nisn_siswa.eq.${identifier},email_siswa.ilike.${identifier}` },
    { table: 'data_petugas', query: `id_petugas.eq.${identifier},email_petugas.ilike.${identifier}` }
  ];

  for (const { table, query } of lookups) {
    const { data: profile } = await db.from(table).select('id_user').or(query).maybeSingle();
    if (profile?.id_user) {
      const { data: userRow } = await db
        .from('data_user')
        .select('username')
        .eq('id_user', profile.id_user)
        .maybeSingle();
      if (userRow?.username) return userRow.username;
    }
  }

  return null;
}

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

  function redirectByRole(role) {
    const r = (role || '').trim().toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const bukuId = params.get('buku_id');

    if (r === 'siswa' || r === 'guru') {
      window.location.href = bukuId
        ? `siswa-guru/dashboard.html?action=pinjam&buku_id=${encodeURIComponent(bukuId)}`
        : 'siswa-guru/dashboard.html';
    } else if (r === 'petugas') {
      window.location.href = 'petugas/dashboard.html';
    } else if (r === 'admin') {
      window.location.href = 'admin/dashboard.html';
    } else {
      window.location.href = 'siswa-guru/dashboard.html';
    }
  }

  // Toggle Lihat Password
  if (toggleButton && passwordInput && toggleIcon) {
    toggleButton.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleIcon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
  }

  // Pengendali Modal Lupa Password
  const setForgotModal = (show) => {
    if (!modalForgotPassword) return;
    modalForgotPassword.classList.toggle('hidden', !show);
    modalForgotPassword.classList.toggle('flex', show);
  };

  if (btnForgotPassword) btnForgotPassword.addEventListener('click', (e) => { e.preventDefault(); setForgotModal(true); });
  if (closeForgotModal) closeForgotModal.addEventListener('click', () => setForgotModal(false));
  if (btnOkForgot) btnOkForgot.addEventListener('click', () => setForgotModal(false));
  if (modalForgotPassword) {
    modalForgotPassword.addEventListener('click', (e) => {
      if (e.target === modalForgotPassword) setForgotModal(false);
    });
  }

  // Eksekusi Submit Form Login
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (errorMessage) errorMessage.classList.add('hidden');

    const identifier = usernameInput?.value.trim() || '';
    const passwordValue = passwordInput?.value || '';

    if (!identifier || !passwordValue) {
      showError('Semua field wajib diisi.');
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Memverifikasi...';
    }

    try {
      // Resolusi identifier fleksibel (NISN/NIP/email) ke username data_user
      const resolvedUsername = await resolveUsername(identifier);
      if (!resolvedUsername) {
        showError('NISN, NIP, Email, atau password salah.');
        return;
      }

      // Verifikasi password via fungsi Bcrypt di database (SECURITY DEFINER)
      const { data: result, error } = await db.rpc('verify_user_login', {
        p_identifier: resolvedUsername,
        p_password:   passwordValue
      });

      if (error) throw error;

      const userMatch = result?.[0] ?? null;
      if (userMatch) {
        saveSession(userMatch, userMatch.role);
        redirectByRole(userMatch.role);
        return;
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

// Inisialisasi form login otomatis jika ada di DOM
initLoginForm();

/* ==========================================================================
   3. KONTROLER SESI & PROFIL SISWA & GURU (siswa-guru/dashboard.html)
   ========================================================================== */

/**
 * Memvalidasi sesi login anggota (Siswa atau Guru) dan memuat profil data terkait
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

    if (db && user.id_user) {
      const isSiswa = targetState.memberType === 'siswa';
      const table = isSiswa ? 'data_siswa' : 'data_guru';
      const keyCol = isSiswa ? 'nisn_siswa' : 'nip_guru';

      // 1. Ambil data profil dari database Supabase
      const { data: profileData } = await db
        .from(table)
        .select('*')
        .eq('id_user', user.id_user)
        .maybeSingle();

      if (profileData) {
        targetState.memberProfile = profileData;
        targetState.memberId = profileData[keyCol];
      } else {
        // Fallback cari via ID/Username
        const { data: fallbackData } = await db
          .from(table)
          .select('*')
          .eq(keyCol, user.username)
          .maybeSingle();

        targetState.memberProfile = fallbackData || {
          [isSiswa ? 'nama_siswa' : 'nama_guru']: user.username || (isSiswa ? 'Siswa Cakrawala' : 'Guru Pengajar'),
          [keyCol]: user.username || (isSiswa ? 'SISWA001' : 'GURU001'),
          [isSiswa ? 'kelas' : 'mata_pelajaran']: isSiswa ? 'Siswa' : 'Pengajar',
          [isSiswa ? 'email_siswa' : 'email_guru']: '-',
          [isSiswa ? 'kontak_siswa' : 'kontak_guru']: '-'
        };
        targetState.memberId = targetState.memberProfile[keyCol];
      }
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
      avatarEl.innerHTML = `<img src="${profile.foto_profil}" class="h-full w-full object-cover rounded-full" alt="Foto Profil" />`;
      avatarEl.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 shadow-xs overflow-hidden border border-slate-200/60';
    } else {
      avatarEl.innerHTML = `<i class="ph-fill ph-user text-2xl text-slate-400"></i>`;
      avatarEl.className = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 shadow-xs overflow-hidden border border-slate-200/80';
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

    if (user.id_user && db) {
      const { data } = await db
        .from('data_petugas')
        .select('*')
        .eq('id_user', user.id_user)
        .maybeSingle();

      if (data) {
        targetState.officerProfile = data;
        updateOfficerProfileDisplay(data.nama_petugas, data.foto_profil);
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

export function updateOfficerProfileDisplay(name, fotoUrl = null) {
  const nameEl = document.getElementById('petugasUserName');
  const avatarEl = document.getElementById('petugasAvatarInitials');
  const welcomeEl = document.getElementById('welcomeOfficerName');

  if (nameEl) nameEl.textContent = name;
  if (welcomeEl) welcomeEl.textContent = name;
  renderAvatar(avatarEl, fotoUrl, name);
}

/* ==========================================================================
   5. KONTROLER SESI & PROFIL ADMIN (admin/dashboard.html)
   ========================================================================== */

/**
 * Memeriksa sesi login admin dan menginisialisasi tampilan profil
 */
export async function initSessionAndAdmin(targetState = {}) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return false;
  }

  const role = (user.role || '').trim().toLowerCase();
  if (role !== 'admin') {
    redirectToLogin();
    return false;
  }

  targetState.currentUser = user;
  const username = user.username || user.identifier || 'Administrator';
  updateAdminProfileDisplay(username);
  return true;
}

export function updateAdminProfileDisplay(name, fotoUrl = null) {
  const nameEl = document.getElementById('adminUserName');
  const avatarEl = document.getElementById('adminAvatarInitials');

  if (nameEl) nameEl.textContent = name;
  renderAvatar(avatarEl, fotoUrl, name);
}

/* ==========================================================================
   6. KONTROLER MODAL LOGOUT UNIVERSAL (Siswa-Guru, Petugas, & Admin)
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