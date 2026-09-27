import { db } from './supabaseClient.js';

// Akun default untuk fallback testing offline
var defaultUsers = {
  'admin:password123': { role: 'Admin', label: 'Admin' },
  'petugas:password123': { role: 'Petugas', label: 'Petugas' },
  'siswa:password123': { role: 'Siswa', label: 'Siswa' },
  'guru:password123': { role: 'Guru', label: 'Guru' }
};

(function () {
  var loginForm = document.querySelector('#loginForm');
  var usernameInput = document.querySelector('#username');
  var passwordInput = document.querySelector('#password');
  var toggleButton = document.querySelector('#togglePassword');
  var toggleIcon = document.querySelector('#toggleIcon');
  var errorMessage = document.querySelector('#error-message');
  var loginButton = document.querySelector('#loginButton');

  // Modal Lupa Password
  var btnForgotPassword = document.querySelector('#btnForgotPassword');
  var modalForgotPassword = document.querySelector('#modalForgotPassword');
  var closeForgotModal = document.querySelector('#closeForgotModal');
  var btnOkForgot = document.querySelector('#btnOkForgot');

  if (!loginForm) return;

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function resolveBukuId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('buku_id');
  }

  function redirectByRole(role) {
    var r = (role || '').trim().toLowerCase();
    var bukuId = resolveBukuId();
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
      var show = passwordInput.type === 'password';
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
    errorMessage.classList.add('hidden');

    var identifier = usernameInput.value.trim();
    var passwordValue = passwordInput.value;

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
        // Coba cari akun di data_user via username (case-insensitive)
        var { data: userMatch } = await db
          .from('data_user')
          .select('id_user, username, password, role')
          .ilike('username', identifier)
          .maybeSingle();

        // Jika tidak ditemukan via username, cari via NIP / Email Guru
        if (!userMatch) {
          var { data: guruMatch } = await db
            .from('data_guru')
            .select('id_user')
            .or('nip_guru.eq.' + identifier + ',email_guru.ilike.' + identifier)
            .maybeSingle();

          if (guruMatch && guruMatch.id_user) {
            var { data: userFromGuru } = await db
              .from('data_user')
              .select('id_user, username, password, role')
              .eq('id_user', guruMatch.id_user)
              .maybeSingle();
            if (userFromGuru) userMatch = userFromGuru;
          }
        }

        // Jika belum ditemukan, cari via NISN / Email Siswa
        if (!userMatch) {
          var { data: siswaMatch } = await db
            .from('data_siswa')
            .select('id_user')
            .or('nisn_siswa.eq.' + identifier + ',email_siswa.ilike.' + identifier)
            .maybeSingle();

          if (siswaMatch && siswaMatch.id_user) {
            var { data: userFromSiswa } = await db
              .from('data_user')
              .select('id_user, username, password, role')
              .eq('id_user', siswaMatch.id_user)
              .maybeSingle();
            if (userFromSiswa) userMatch = userFromSiswa;
          }
        }

        // Jika user ditemukan dan password cocok
        if (userMatch && userMatch.password === passwordValue) {
          var roleClean = (userMatch.role || 'Siswa').trim();
          sessionStorage.setItem('cakrawala_logged_in', 'true');
          sessionStorage.setItem('cakrawala_role', roleClean);
          sessionStorage.setItem('cakrawala_user', JSON.stringify({ 
            id_user: userMatch.id_user, 
            username: userMatch.username, 
            role: roleClean 
          }));
          redirectByRole(roleClean);
          return;
        }
      }

      // 2. Cek akun admin lokal yang diperbarui (disimpan di localStorage jika tabel Supabase belum ada)
      try {
        const localAdminRaw = localStorage.getItem('cakrawala_local_admin');
        if (localAdminRaw) {
          const localAdmin = JSON.parse(localAdminRaw);
          if (
            localAdmin.username &&
            localAdmin.username.toLowerCase() === identifier.toLowerCase() &&
            localAdmin.password === passwordValue
          ) {
            sessionStorage.setItem('cakrawala_logged_in', 'true');
            sessionStorage.setItem('cakrawala_role', 'Admin');
            sessionStorage.setItem('cakrawala_user', JSON.stringify({
              id_user: localAdmin.id_user || 'ADM001',
              username: localAdmin.username,
              role: 'Admin'
            }));
            redirectByRole('Admin');
            return;
          }
        }
      } catch (_) {}

      // 3. Fallback testing akun bawaan default
      var key = (identifier + ':' + passwordValue).toLowerCase();
      var user = defaultUsers[key];
      if (user) {
        sessionStorage.setItem('cakrawala_logged_in', 'true');
        sessionStorage.setItem('cakrawala_role', user.role);
        sessionStorage.setItem('cakrawala_user', JSON.stringify({ identifier: identifier, username: identifier, role: user.role }));
        redirectByRole(user.role);
        return;
      }

      showError('NIS, NIP, Email, atau password salah.');
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
})();