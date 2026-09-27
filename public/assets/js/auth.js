import { db } from './supabaseClient.js';

// Akun default untuk fallback testing offline
var defaultUsers = {
  'admin:password123': { role: 'Admin', label: 'Admin' },
  'petugas:password123': { role: 'Petugas', label: 'Petugas' },
  'siswa:password123': { role: 'Siswa', label: 'Siswa' }
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
    var bukuId = resolveBukuId();
    if (role === 'Siswa') {
      if (bukuId) {
        window.location.href = 'siswa/dashboard.html?action=pinjam&buku_id=' + encodeURIComponent(bukuId);
      } else {
        window.location.href = 'siswa/dashboard.html';
      }
    } else if (role === 'Petugas') {
      window.location.href = 'petugas/dashboard.html';
    } else if (role === 'Admin') {
      window.location.href = 'admin/dashboard.html';
    } else {
      window.location.href = 'index.html';
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
        var { data, error } = await db
          .from('data_user')
          .select('id_user, username, role')
          .eq('username', identifier)
          .eq('password', passwordValue)
          .maybeSingle();

        if (!error && data && data.role) {
          sessionStorage.setItem('cakrawala_logged_in', 'true');
          sessionStorage.setItem('cakrawala_role', data.role);
          sessionStorage.setItem('cakrawala_user', JSON.stringify({ id_user: data.id_user, username: data.username, role: data.role }));
          redirectByRole(data.role);
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