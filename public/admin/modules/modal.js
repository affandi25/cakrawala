/**
 * CAKRAWALA Digital Library - Modals & Form Handlers Admin Module
 * File: public/admin/modules/modal.js
 */

import { db } from '../../assets/js/supabaseClient.js';
import { showToast, escapeHtml } from '../../assets/js/sharedUtils.js';
import { state, TAB_CONFIGS, DOM } from './state.js';
import { loadData, refreshAllBadges, generateUserId } from './data.js';

export function showModalFormError(msg) {
  if (DOM.modalFormErrorText) DOM.modalFormErrorText.textContent = msg;
  if (DOM.modalFormError) DOM.modalFormError.classList.remove('hidden');
}

export function setModalSubmitLoading(isLoading) {
  if (isLoading) {
    if (DOM.btnSubmitAddUser) DOM.btnSubmitAddUser.disabled = true;
    if (DOM.iconSubmitSpinner) DOM.iconSubmitSpinner.className = 'ph ph-circle-notch animate-spin text-lg';
    if (DOM.textBtnSubmit) DOM.textBtnSubmit.textContent = 'Menyimpan...';
  } else {
    if (DOM.btnSubmitAddUser) DOM.btnSubmitAddUser.disabled = false;
    if (DOM.iconSubmitSpinner) DOM.iconSubmitSpinner.className = 'ph ph-check-circle text-lg';
    if (DOM.textBtnSubmit) DOM.textBtnSubmit.textContent = 'Simpan Pengguna';
  }
}

/**
 * Buka modal form tambah user baru
 */
export function openAddModal() {
  state.modalMode = 'add';
  state.editingRecord = null;

  const config = TAB_CONFIGS[state.activeTab];
  if (!config) return;

  if (DOM.modalAddTitle) DOM.modalAddTitle.textContent = config.modalTitle;
  if (DOM.modalAddSubtitle) DOM.modalAddSubtitle.textContent = config.modalSubtitle;
  if (DOM.modalFormError) DOM.modalFormError.classList.add('hidden');
  if (DOM.formAddUser) DOM.formAddUser.reset();

  if (DOM.passwordRequiredStar) DOM.passwordRequiredStar.classList.remove('hidden');
  if (DOM.inputPassword) {
    DOM.inputPassword.required = true;
    DOM.inputPassword.placeholder = 'Minimal 6 karakter';
  }
  if (DOM.passwordHelpText) {
    DOM.passwordHelpText.textContent = 'Password autentikasi pengguna.';
  }
  if (DOM.textBtnSubmit) {
    DOM.textBtnSubmit.textContent = 'Simpan Pengguna';
  }

  // Render Form Fields Dinamis Berdasarkan Tab Aktif
  if (state.activeTab === 'siswa') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-student';
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNisn" class="block text-xs font-bold text-slate-700 mb-1">
              NISN Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNisn" 
              name="nisn_siswa" 
              required 
              maxlength="10" 
              placeholder="Contoh: 0051234567" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputKelas" class="block text-xs font-bold text-slate-700 mb-1">
              Kelas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputKelas" 
              name="kelas" 
              required 
              maxlength="20" 
              placeholder="Contoh: XII MIPA 1" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaSiswa" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Siswa <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaSiswa" 
            name="nama_siswa" 
            required 
            maxlength="50" 
            placeholder="Masukkan nama lengkap siswa" 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              Email Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailSiswa" 
              name="email_siswa" 
              required 
              maxlength="50" 
              placeholder="siswa@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakSiswa" 
              name="kontak_siswa" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  } else if (state.activeTab === 'guru') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-chalkboard-teacher';
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNip" class="block text-xs font-bold text-slate-700 mb-1">
              NIP Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNip" 
              name="nip_guru" 
              required 
              maxlength="20" 
              placeholder="Contoh: 198501012010011001" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputMapel" class="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputMapel" 
              name="mata_pelajaran" 
              required 
              maxlength="50" 
              placeholder="Contoh: Bahasa Indonesia" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaGuru" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Guru & Gelar <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaGuru" 
            name="nama_guru" 
            required 
            maxlength="50" 
            placeholder="Contoh: Dr. Budi Santoso, M.Pd." 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailGuru" class="block text-xs font-bold text-slate-700 mb-1">
              Email Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailGuru" 
              name="email_guru" 
              required 
              maxlength="50" 
              placeholder="guru@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakGuru" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakGuru" 
              name="kontak_guru" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  } else if (state.activeTab === 'petugas') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-user-gear';
    const autoId = 'PTG' + Math.floor(100 + Math.random() * 900);
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputIdPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              ID Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputIdPetugas" 
              name="id_petugas" 
              required 
              maxlength="10" 
              value="${autoId}" 
              placeholder="Contoh: PTG001" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10 font-mono" 
            />
          </div>
          <div>
            <label for="inputNamaPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNamaPetugas" 
              name="nama_petugas" 
              required 
              maxlength="50" 
              placeholder="Masukkan nama lengkap petugas" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Email Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailPetugas" 
              name="email_petugas" 
              required 
              maxlength="50" 
              placeholder="petugas@cakrawala.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakPetugas" 
              name="kontak_petugas" 
              required 
              maxlength="15" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  }

  // Tampilkan Modal
  if (DOM.modalAddUser) DOM.modalAddUser.classList.remove('hidden');
  requestAnimationFrame(() => {
    if (DOM.modalAddUser) DOM.modalAddUser.classList.remove('opacity-0');
    if (DOM.modalAddContent) DOM.modalAddContent.classList.remove('scale-95');
  });

  // Auto focus input pertama
  setTimeout(() => {
    if (DOM.dynamicFormFields) {
      const firstInput = DOM.dynamicFormFields.querySelector('input');
      if (firstInput) firstInput.focus();
    }
  }, 150);
}

/**
 * Buka modal form edit user dan reset password
 */
export function openEditModal(item) {
  state.modalMode = 'edit';
  state.editingRecord = item;

  const config = TAB_CONFIGS[state.activeTab];
  if (!config) return;

  if (DOM.modalAddTitle) DOM.modalAddTitle.textContent = `Edit Data ${config.breadcrumb}`;
  if (DOM.modalAddSubtitle) DOM.modalAddSubtitle.textContent = 'Perbarui data profil atau reset kata sandi jika pengguna lupa password login.';
  if (DOM.modalFormError) DOM.modalFormError.classList.add('hidden');
  if (DOM.formAddUser) DOM.formAddUser.reset();

  if (DOM.passwordRequiredStar) DOM.passwordRequiredStar.classList.add('hidden');
  if (DOM.inputPassword) {
    DOM.inputPassword.required = false;
    DOM.inputPassword.value = '';
    DOM.inputPassword.placeholder = 'Kosongkan jika tidak ingin mengubah password';
  }
  if (DOM.passwordHelpText) {
    DOM.passwordHelpText.textContent = 'Isi password baru untuk mereset sandi jika pengguna lupa, atau kosongkan jika tetap.';
  }
  if (DOM.inputUsername) {
    DOM.inputUsername.value = (item.data_user && item.data_user.username) || '';
  }
  if (DOM.textBtnSubmit) {
    DOM.textBtnSubmit.textContent = 'Simpan Perubahan';
  }

  // Render form fields sesuai mode edit
  if (state.activeTab === 'siswa') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-note-pencil';
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNisn" class="block text-xs font-bold text-slate-700 mb-1">
              NISN Siswa <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputNisn" 
              name="nisn_siswa" 
              readonly
              value="${escapeHtml(item.nisn_siswa)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputKelas" class="block text-xs font-bold text-slate-700 mb-1">
              Kelas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputKelas" 
              name="kelas" 
              required 
              maxlength="20" 
              value="${escapeHtml(item.kelas)}" 
              placeholder="Contoh: XII MIPA 1" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaSiswa" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Siswa <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaSiswa" 
            name="nama_siswa" 
            required 
            maxlength="50" 
            value="${escapeHtml(item.nama_siswa)}" 
            placeholder="Masukkan nama lengkap siswa" 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              Email Siswa <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailSiswa" 
              name="email_siswa" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_siswa)}" 
              placeholder="siswa@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakSiswa" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakSiswa" 
              name="kontak_siswa" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_siswa)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  } else if (state.activeTab === 'guru') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-note-pencil';
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputNip" class="block text-xs font-bold text-slate-700 mb-1">
              NIP Guru <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputNip" 
              name="nip_guru" 
              readonly 
              value="${escapeHtml(item.nip_guru)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputMapel" class="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputMapel" 
              name="mata_pelajaran" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.mata_pelajaran)}" 
              placeholder="Contoh: Bahasa Indonesia" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div>
          <label for="inputNamaGuru" class="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap Guru & Gelar <span class="text-rose-500">*</span>
          </label>
          <input 
            type="text" 
            id="inputNamaGuru" 
            name="nama_guru" 
            required 
            maxlength="50" 
            value="${escapeHtml(item.nama_guru)}" 
            placeholder="Contoh: Dr. Budi Santoso, M.Pd." 
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailGuru" class="block text-xs font-bold text-slate-700 mb-1">
              Email Guru <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailGuru" 
              name="email_guru" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_guru)}" 
              placeholder="guru@sekolah.sch.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakGuru" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakGuru" 
              name="kontak_guru" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_guru)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  } else if (state.activeTab === 'petugas') {
    if (DOM.modalAddIcon) DOM.modalAddIcon.className = 'ph ph-note-pencil';
    if (DOM.dynamicFormFields) {
      DOM.dynamicFormFields.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputIdPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              ID Petugas <span class="text-[10px] text-slate-400 font-normal">(Kunci Primer)</span>
            </label>
            <input 
              type="text" 
              id="inputIdPetugas" 
              name="id_petugas" 
              readonly 
              value="${escapeHtml(item.id_petugas)}" 
              class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 outline-none font-mono cursor-not-allowed" 
            />
          </div>
          <div>
            <label for="inputNamaPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              id="inputNamaPetugas" 
              name="nama_petugas" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.nama_petugas)}" 
              placeholder="Masukkan nama lengkap petugas" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="inputEmailPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              Email Petugas <span class="text-rose-500">*</span>
            </label>
            <input 
              type="email" 
              id="inputEmailPetugas" 
              name="email_petugas" 
              required 
              maxlength="50" 
              value="${escapeHtml(item.email_petugas)}" 
              placeholder="petugas@cakrawala.id" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
          <div>
            <label for="inputKontakPetugas" class="block text-xs font-bold text-slate-700 mb-1">
              No. Kontak / WA <span class="text-rose-500">*</span>
            </label>
            <input 
              type="tel" 
              id="inputKontakPetugas" 
              name="kontak_petugas" 
              required 
              maxlength="15" 
              value="${escapeHtml(item.kontak_petugas)}" 
              placeholder="08123456789" 
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-navy focus:ring-3 focus:ring-navy/10" 
            />
          </div>
        </div>
      `;
    }
  }

  // Tampilkan Modal
  if (DOM.modalAddUser) DOM.modalAddUser.classList.remove('hidden');
  requestAnimationFrame(() => {
    if (DOM.modalAddUser) DOM.modalAddUser.classList.remove('opacity-0');
    if (DOM.modalAddContent) DOM.modalAddContent.classList.remove('scale-95');
  });

  // Focus ke input yang dapat diedit
  setTimeout(() => {
    if (DOM.dynamicFormFields) {
      const inputs = DOM.dynamicFormFields.querySelectorAll('input:not([readonly])');
      if (inputs.length > 0) inputs[0].focus();
    }
  }, 150);
}

export function closeAddModal() {
  if (DOM.modalAddUser) DOM.modalAddUser.classList.add('opacity-0');
  if (DOM.modalAddContent) DOM.modalAddContent.classList.add('scale-95');
  setTimeout(() => {
    if (DOM.modalAddUser) DOM.modalAddUser.classList.add('hidden');
    if (DOM.formAddUser) DOM.formAddUser.reset();
    state.modalMode = 'add';
    state.editingRecord = null;
  }, 200);
}

/**
 * Alur Transaksi Tambah & Edit Pengguna Otomatis (Termasuk Reset Password)
 */
export async function handleAddUserSubmit(event) {
  event.preventDefault();
  if (DOM.modalFormError) DOM.modalFormError.classList.add('hidden');

  const formData = new FormData(DOM.formAddUser);
  const username = (formData.get('username') || '').trim();
  const password = (formData.get('password') || '').trim();

  // ========================================================
  // MODE EDIT PENGGUNA & RESET PASSWORD
  // ========================================================
  if (state.modalMode === 'edit') {
    const editingRecord = state.editingRecord;
    if (!editingRecord || !editingRecord.id_user) {
      showModalFormError('Data akun pengguna tidak ditemukan.');
      return;
    }

    if (!username) {
      showModalFormError('Username wajib diisi.');
      return;
    }

    if (password && password.length < 6) {
      showModalFormError('Password baru minimal harus 6 karakter.');
      return;
    }

    setModalSubmitLoading(true);

    try {
      // 1. Update data_user
      const userUpdatePayload = { username: username };
      if (password) {
        userUpdatePayload.password = password;
      }

      const { error: userError } = await db
        .from('data_user')
        .update(userUpdatePayload)
        .eq('id_user', editingRecord.id_user);

      if (userError) {
        if (userError.code === '23505' || userError.message.includes('unique')) {
          throw new Error(`Username "${username}" sudah digunakan oleh akun lain.`);
        }
        throw new Error(userError.message || 'Gagal memperbarui akun user.');
      }

      // 2. Update tabel profil entitas
      let profileError = null;
      let displayName = '';

      if (state.activeTab === 'siswa') {
        const nama = (formData.get('nama_siswa') || '').trim();
        const kelas = (formData.get('kelas') || '').trim();
        const email = (formData.get('email_siswa') || '').trim();
        const kontak = (formData.get('kontak_siswa') || '').trim();
        displayName = nama;

        const { error } = await db
          .from('data_siswa')
          .update({
            nama_siswa: nama,
            kelas: kelas,
            email_siswa: email,
            kontak_siswa: kontak
          })
          .eq('nisn_siswa', editingRecord.nisn_siswa);
        profileError = error;

      } else if (state.activeTab === 'guru') {
        const nama = (formData.get('nama_guru') || '').trim();
        const mapel = (formData.get('mata_pelajaran') || '').trim();
        const email = (formData.get('email_guru') || '').trim();
        const kontak = (formData.get('kontak_guru') || '').trim();
        displayName = nama;

        const { error } = await db
          .from('data_guru')
          .update({
            nama_guru: nama,
            mata_pelajaran: mapel,
            email_guru: email,
            kontak_guru: kontak
          })
          .eq('nip_guru', editingRecord.nip_guru);
        profileError = error;

      } else if (state.activeTab === 'petugas') {
        const nama = (formData.get('nama_petugas') || '').trim();
        const email = (formData.get('email_petugas') || '').trim();
        const kontak = (formData.get('kontak_petugas') || '').trim();
        displayName = nama;

        const { error } = await db
          .from('data_petugas')
          .update({
            nama_petugas: nama,
            email_petugas: email,
            kontak_petugas: kontak
          })
          .eq('id_petugas', editingRecord.id_petugas);
        profileError = error;
      }

      if (profileError) {
        throw new Error(profileError.message || 'Gagal memperbarui profil pengguna.');
      }

      setModalSubmitLoading(false);
      closeAddModal();

      if (password) {
        showToast(`Data profil dan password baru untuk ${displayName} berhasil diperbarui!`, 'success');
      } else {
        showToast(`Data profil ${displayName} berhasil diperbarui.`, 'success');
      }

      await loadData(state.activeTab, false);

    } catch (err) {
      console.error('Error saat memperbarui user:', err);
      setModalSubmitLoading(false);
      showModalFormError(err.message || 'Terjadi kesalahan sistem saat memperbarui data.');
    }
    return;
  }

  // ========================================================
  // MODE TAMBAH PENGGUNA BARU
  // ========================================================
  if (!username || !password) {
    showModalFormError('Username dan password wajib diisi.');
    return;
  }

  if (password.length < 6) {
    showModalFormError('Password minimal harus terdiri dari 6 karakter.');
    return;
  }

  const roleMapping = {
    siswa: 'Siswa',
    guru: 'Guru',
    petugas: 'Petugas'
  };
  const role = roleMapping[state.activeTab];

  setModalSubmitLoading(true);
  const idUser = generateUserId();

  try {
    // 1. TAHAP 1: Insert akun ke tabel data_user
    const { error: userError } = await db
      .from('data_user')
      .insert([
        {
          id_user: idUser,
          username: username,
          password: password,
          role: role
        }
      ]);

    if (userError) {
      if (userError.code === '23505' || userError.message.includes('unique')) {
        throw new Error(`Username "${username}" sudah digunakan. Silakan gunakan username lain.`);
      }
      throw new Error(userError.message || 'Gagal membuat akun user.');
    }

    // 2. TAHAP 2: Insert profil ke tabel masing-masing
    let profileError = null;

    if (state.activeTab === 'siswa') {
      const nisn = (formData.get('nisn_siswa') || '').trim();
      const nama = (formData.get('nama_siswa') || '').trim();
      const kelas = (formData.get('kelas') || '').trim();
      const email = (formData.get('email_siswa') || '').trim();
      const kontak = (formData.get('kontak_siswa') || '').trim();

      const { error } = await db.from('data_siswa').insert([
        {
          nisn_siswa: nisn,
          nama_siswa: nama,
          kelas: kelas,
          email_siswa: email,
          kontak_siswa: kontak,
          id_user: idUser
        }
      ]);
      profileError = error;

    } else if (state.activeTab === 'guru') {
      const nip = (formData.get('nip_guru') || '').trim();
      const nama = (formData.get('nama_guru') || '').trim();
      const mapel = (formData.get('mata_pelajaran') || '').trim();
      const email = (formData.get('email_guru') || '').trim();
      const kontak = (formData.get('kontak_guru') || '').trim();

      const { error } = await db.from('data_guru').insert([
        {
          nip_guru: nip,
          nama_guru: nama,
          mata_pelajaran: mapel,
          email_guru: email,
          kontak_guru: kontak,
          id_user: idUser
        }
      ]);
      profileError = error;

    } else if (state.activeTab === 'petugas') {
      const idPetugas = (formData.get('id_petugas') || '').trim();
      const nama = (formData.get('nama_petugas') || '').trim();
      const email = (formData.get('email_petugas') || '').trim();
      const kontak = (formData.get('kontak_petugas') || '').trim();

      const { error } = await db.from('data_petugas').insert([
        {
          id_petugas: idPetugas,
          nama_petugas: nama,
          email_petugas: email,
          kontak_petugas: kontak,
          id_user: idUser
        }
      ]);
      profileError = error;
    }

    // Rollback jika tahap 2 gagal
    if (profileError) {
      console.warn('Tahap 2 gagal, melakukan kompensasi rollback data_user...');
      await db.from('data_user').delete().eq('id_user', idUser);

      if (profileError.code === '23505' || profileError.message.includes('unique') || profileError.message.includes('primary')) {
        throw new Error('Nomor induk / ID entitas sudah terdaftar di sistem.');
      }
      throw new Error(profileError.message || 'Gagal menyimpan profil pengguna.');
    }

    setModalSubmitLoading(false);
    closeAddModal();
    showToast(`Berhasil menambahkan akun ${role} baru: ${username}`, 'success');

    await loadData(state.activeTab, false);
    refreshAllBadges();

  } catch (err) {
    console.error('Error proses simpan user:', err);
    setModalSubmitLoading(false);
    showModalFormError(err.message || 'Terjadi kesalahan sistem saat memproses data.');
  }
}

// ========================================================
// MODAL KONFIRMASI HAPUS PENGGUNA (CASCADE DELETE)
// ========================================================

export function openDeleteModal(idUser, name, entity) {
  if (!idUser) {
    showToast('ID Pengguna tidak valid untuk dihapus.', 'error');
    return;
  }

  state.deleteTarget = { id_user: idUser, name: name, entity: entity };
  if (DOM.deleteTargetName) DOM.deleteTargetName.textContent = `${name} (${entity})`;

  if (DOM.modalDeleteConfirm) DOM.modalDeleteConfirm.classList.remove('hidden');
  requestAnimationFrame(() => {
    if (DOM.modalDeleteConfirm) DOM.modalDeleteConfirm.classList.remove('opacity-0');
    if (DOM.modalDeleteContent) DOM.modalDeleteContent.classList.remove('scale-95');
  });
}

export function closeDeleteModal() {
  if (DOM.modalDeleteConfirm) DOM.modalDeleteConfirm.classList.add('opacity-0');
  if (DOM.modalDeleteContent) DOM.modalDeleteContent.classList.add('scale-95');
  setTimeout(() => {
    if (DOM.modalDeleteConfirm) DOM.modalDeleteConfirm.classList.add('hidden');
    state.deleteTarget = null;
  }, 200);
}

export async function handleConfirmDelete() {
  if (!state.deleteTarget || !state.deleteTarget.id_user) return;

  const { id_user, name, entity } = state.deleteTarget;

  if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.disabled = true;
  if (DOM.iconDeleteSpinner) DOM.iconDeleteSpinner.className = 'ph ph-circle-notch animate-spin text-base';
  if (DOM.textBtnDelete) DOM.textBtnDelete.textContent = 'Menghapus...';

  try {
    const { error } = await db
      .from('data_user')
      .delete()
      .eq('id_user', id_user);

    if (error) throw error;

    if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.disabled = false;
    if (DOM.iconDeleteSpinner) DOM.iconDeleteSpinner.className = 'ph ph-trash-simple text-base';
    if (DOM.textBtnDelete) DOM.textBtnDelete.textContent = 'Ya, Hapus Pengguna';

    closeDeleteModal();
    showToast(`Akun ${entity} "${name}" berhasil dihapus dari sistem.`, 'success');

    await loadData(state.activeTab, false);
    refreshAllBadges();

  } catch (err) {
    console.error('Error saat menghapus user:', err);
    if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.disabled = false;
    if (DOM.iconDeleteSpinner) DOM.iconDeleteSpinner.className = 'ph ph-trash-simple text-base';
    if (DOM.textBtnDelete) DOM.textBtnDelete.textContent = 'Ya, Hapus Pengguna';
    showToast(`Gagal menghapus pengguna: ${err.message || 'Koneksi bermasalah'}`, 'error');
  }
}
