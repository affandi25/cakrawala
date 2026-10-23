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

// Sinkronkan sesi dari localStorage ke sessionStorage saat modul dimuat
// (menjaga agar sesi tetap terbaca walau halaman dibuka di tab baru).
syncSessionStorage();

/* ==========================================================================
   1. UTILITY SESI & STORAGE
   ========================================================================== */

/**
 * Rute dashboard utama (home) untuk masing-masing role.
 * Dipakai untuk mengarahkan pengguna ke halaman yang sesuai hak aksesnya.
 */
export const ROLE_HOME = {
  siswa: '/siswa-guru/dashboard.html',
  guru: '/siswa-guru/dashboard.html',
  petugas: '/petugas/dashboard.html',
  admin: '/admin/dashboard.html'
};

/**
 * Mengambil data user yang sedang login dari storage.
 * Membaca sessionStorage lebih dulu, lalu fallback ke localStorage agar sesi
 * tetap terbaca pada tab baru (localStorage bersifat lintas-tab).
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
 * Mengambil role pengguna yang sedang login dalam bentuk huruf kecil yang seragam
 * @returns {string} 'siswa' | 'guru' | 'petugas' | 'admin' | ''
 */
export function getUserRole() {
  const user = getCurrentUser();
  return user && user.role ? String(user.role).trim().toLowerCase() : '';
}

/**
 * Menyimpan data sesi autentikasi ke kedua storage (session + local) sekaligus.
 * localStorage menjadi sumber utama agar sesi bertahan lintas tab;
 * sessionStorage disinkronkan untuk kompatibilitas.
 * @param {Object} user Objek user { id_user, username, role }
 */
export function saveSession(user) {
  if (!user) return;
  const roleClean = (user.role || 'Siswa').trim();
  const payload = JSON.stringify({
    id_user: user.id_user,
    username: user.username,
    role: roleClean
  });

  sessionStorage.setItem('cakrawala_logged_in', 'true');
  sessionStorage.setItem('cakrawala_role', roleClean);
  sessionStorage.setItem('cakrawala_user', payload);
  localStorage.setItem('cakrawala_logged_in', 'true');
  localStorage.setItem('cakrawala_role', roleClean);
  localStorage.setItem('cakrawala_user', payload);
}

/**
 * Porter sesi: memastikan sessionStorage terisi dari localStorage bila kosong
 * (misal saat halaman dibuka di tab baru). Dipanggil sekali di setiap halaman.
 */
export function syncSessionStorage() {
  try {
    if (!sessionStorage.getItem('cakrawala_user') && localStorage.getItem('cakrawala_user')) {
      sessionStorage.setItem('cakrawala_logged_in', localStorage.getItem('cakrawala_logged_in') || 'true');
      sessionStorage.setItem('cakrawala_role', localStorage.getItem('cakrawala_role') || '');
      sessionStorage.setItem('cakrawala_user', localStorage.getItem('cakrawala_user'));
    }
  } catch (_) { }
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
 * Route guard terpusat berbasis role.
 * - Belum login -> dialihkan ke halaman login.
 * - Role tidak sesuai -> dialihkan ke dashboard milik role pengguna tersebut.
 * @param {string[]} allowedRoles Daftar role yang diizinkan mengakses halaman ini
 * @returns {boolean} true bila pengguna berhak mengakses halaman
 */
export function guardRoute(allowedRoles = []) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return false;
  }

  const role = getUserRole();
  if (allowedRoles.length > 0 && allowedRoles.indexOf(role) === -1) {
    goToRoleHome(role);
    return false;
  }

  return true;
}

/**
 * Mengarahkan pengguna ke dashboard utama sesuai role-nya.
 * Bila role tidak dikenali, pengguna diarahkan ke halaman login.
 * @param {string} role Role pengguna ('siswa' | 'guru' | 'petugas' | 'admin')
 */
export function goToRoleHome(role) {
  const key = (role || '').trim().toLowerCase();
  window.location.replace(ROLE_HOME[key] || '/login.html');
}

/**
 * Mengarahkan pengguna ke halaman login.
 * Selalu memakai URL absolut agar tidak salah resolusi saat halaman berada
 * di dalam sub-folder (mis. /petugas/ atau /siswa-guru/).
 */
export function redirectToLogin() {
  window.location.replace('/login.html');
}

/* ==========================================================================
   2. KONTROLER HALAMAN LOGIN (login.html)
   ========================================================================== */

/**
 * Resolusi username dari identifier fleksibel (username, NISN, NIP, email).
 * Mencari tabel profil terkait bila identifier bukan username langsung.
 * @returns {Promise<string|null>} username di data_user, atau null bila tidak ada
 */
async function resolveUsername(identifier) {
  if (!db) return null;

  // 1. Cek apakah identifier cocok langsung sebagai username di data_user
  const { data: directMatch } = await db
    .from('data_user')
    .select('username')
    .ilike('username', identifier)
    .maybeSingle();

  if (directMatch && directMatch.username) return directMatch.username;

  // 2. Jika bukan username, cari id_user di tabel profil terkait
  const lookups = [
    { table: 'data_guru', query: 'nip_guru.eq.' + identifier + ',email_guru.ilike.' + identifier },
    { table: 'data_siswa', query: 'nisn_siswa.eq.' + identifier + ',email_siswa.ilike.' + identifier },
    { table: 'data_petugas', query: 'id_petugas.eq.' + identifier + ',email_petugas.ilike.' + identifier }
  ];

  for (const item of lookups) {
    const { data: profile } = await db.from(item.table).select('id_user').or(item.query).maybeSingle();
    if (profile && profile.id_user) {
      const { data: userRow } = await db
        .from('data_user')
        .select('username')
        .eq('id_user', profile.id_user)
        .maybeSingle();
      if (userRow && userRow.username) return userRow.username;
    }
  }

  return null;
}

/**
 * Fallback verifikasi password untuk akun yang passwordnya masih tersimpan apa adanya
 * (plaintext), misalnya akun baru yang dibuat lewat panel Admin atau akun lama.
 * RPC `verify_user_login` memverifikasi dengan bcrypt sehingga tidak akan cocok dengan
 * password plaintext; fungsi ini mengecek kecocokan langsung agar akun tersebut tetap
 * bisa login tanpa mengubah isi database.
 * @returns {Promise<Object|null>} baris data_user bila cocok, atau null
 */
async function verifyPlaintextPassword(username, password) {
  if (!db) return null;
  const { data, error } = await db
    .from('data_user')
    .select('id_user, username, role')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error || !data) return null;
  return data;
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

  function resolveBukuId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('buku_id');
  }

  function redirectByRole(role) {
    const r = (role || '').trim().toLowerCase();
    const bukuId = resolveBukuId();

    // Gunakan URL absolut agar pengalihan tetap benar dari halaman mana pun.
    if (r === 'petugas') {
      window.location.href = '/petugas/dashboard.html';
    } else if (r === 'admin') {
      window.location.href = '/admin/dashboard.html';
    } else if (bukuId) {
      window.location.href = '/siswa-guru/dashboard.html?action=pinjam&buku_id=' + encodeURIComponent(bukuId);
    } else {
      window.location.href = '/siswa-guru/dashboard.html';
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
      // 1. Resolusi identifier fleksibel (username/NISN/NIP/email) ke username data_user
      const resolvedUsername = await resolveUsername(identifier);
      if (!resolvedUsername) {
        showError('NISN, NIP, Email, atau password salah.');
        return;
      }

      // 2. Verifikasi password via fungsi bcrypt di database (RPC SECURITY DEFINER)
      const { data: result, error } = await db.rpc('verify_user_login', {
        p_identifier: resolvedUsername,
        p_password: passwordValue
      });

      const userMatch = (!error && result && result[0]) ? result[0] : null;
      if (userMatch) {
        saveSession({
          id_user: userMatch.id_user,
          username: userMatch.username,
          role: (userMatch.role || 'Siswa').trim()
        });
        redirectByRole(userMatch.role || 'Siswa');
        return;
      }

      // 3. Fallback: akun dengan password tersimpan plaintext (akun baru via panel Admin / akun lama)
      const plainMatch = await verifyPlaintextPassword(resolvedUsername, passwordValue);
      if (plainMatch) {
        saveSession({
          id_user: plainMatch.id_user,
          username: plainMatch.username,
          role: (plainMatch.role || 'Siswa').trim()
        });
        redirectByRole(plainMatch.role || 'Siswa');
        return;
      }

      if (error) throw error;

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
 * @returns {Promise<boolean>} true bila sesi & role valid
 */
export async function initSessionAndMember(targetState = {}) {
  // Route guard terpusat: hanya role Siswa & Guru yang boleh mengakses halaman ini
  if (!guardRoute(['siswa', 'guru'])) return false;

  const user = getCurrentUser();

  try {
    const role = getUserRole();

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
    return true;
  } catch (err) {
    console.error('Gagal memverifikasi sesi siswa/guru:', err);
    redirectToLogin();
    return false;
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
 * @returns {Promise<boolean>} true bila sesi & role valid
 */
export async function initSessionAndOfficer(targetState = {}) {
  // Route guard terpusat: hanya Petugas (dan Admin sebagai superuser) yang diizinkan
  if (!guardRoute(['petugas', 'admin'])) return false;

  const user = getCurrentUser();

  try {
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

    return true;
  } catch (err) {
    console.error('Gagal memverifikasi sesi petugas:', err);
    redirectToLogin();
    return false;
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
   5. KONTROLER SESI & PROFIL ADMIN (admin/dashboard.html)
   ========================================================================== */

/**
 * Memeriksa sesi login admin dan menginisialisasi tampilan profil
 * @param {Object} targetState Objek state dashboard admin
 */
export async function initSessionAndAdmin(targetState = {}) {
  // Route guard terpusat: hanya role Admin yang diizinkan mengakses halaman ini
  if (!guardRoute(['admin'])) return false;

  const user = getCurrentUser();
  targetState.currentUser = user;
  const username = user.username || user.identifier || 'Administrator';
  updateAdminProfileDisplay(username);
  return true;
}

/**
 * Menampilkan nama dan inisial avatar admin pada sidebar
 * @param {string} name Nama pengguna admin
 */
export function updateAdminProfileDisplay(name) {
  const nameEl = document.getElementById('adminUserName');
  const avatarEl = document.getElementById('adminAvatarInitials');

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) {
    const parts = (name || '').trim().split(/\s+/);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name || 'AD').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
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

/* ==========================================================================
   7. KONTROLER NAVIGASI PUBLIK (index.html / katalog & login.html)
   ========================================================================== */

/**
 * Keluar dari sesi lalu mengarahkan pengguna ke halaman login.
 */
export function logout() {
  clearSession();
  window.location.replace('/login.html');
}

/**
 * Menyesuaikan navigasi halaman publik dengan status sesi pengguna:
 * - Sudah login : tautan "Login" berubah menjadi "Dashboard" sesuai role,
 *                 tombol "Keluar" ditampilkan, dan panel "sudah masuk" dibuka.
 * - Belum login : tautan tetap menuju halaman login, tombol keluar disembunyikan.
 * @returns {string} role pengguna, atau string kosong bila belum login
 */
export function initPublicAuthNav() {
  const user = getCurrentUser();
  const role = getUserRole();

  const navAuthLink = document.getElementById('navAuthLink');
  const navLogoutButton = document.getElementById('navLogoutButton');
  const loggedInPanel = document.getElementById('alreadyLoggedInPanel');
  const loggedInRole = document.getElementById('alreadyLoggedInRole');
  const btnGoDashboard = document.getElementById('btnGoDashboard');

  if (!user) {
    if (navLogoutButton) navLogoutButton.classList.add('hidden');
    return '';
  }

  if (navAuthLink) {
    navAuthLink.textContent = 'Dashboard';
    navAuthLink.setAttribute('href', ROLE_HOME[role] || '/login.html');
  }

  if (navLogoutButton) {
    navLogoutButton.classList.remove('hidden');
    navLogoutButton.addEventListener('click', logout);
  }

  if (loggedInPanel) loggedInPanel.classList.remove('hidden');
  if (loggedInRole) loggedInRole.textContent = role || 'pengguna';

  if (btnGoDashboard) {
    const bukuId = new URLSearchParams(window.location.search).get('buku_id');
    let target = ROLE_HOME[role] || '/login.html';
    if (bukuId && (role === 'siswa' || role === 'guru')) {
      target += (target.indexOf('?') === -1 ? '?' : '&') + 'action=pinjam&buku_id=' + encodeURIComponent(bukuId);
    }
    btnGoDashboard.setAttribute('href', target);
  }

  return role;
}

// Jalankan penyesuaian navigasi publik pada halaman yang memuat modul ini
initPublicAuthNav();