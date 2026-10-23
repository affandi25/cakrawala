
/**
 * CAKRAWALA Digital Library - Modul Form User (Tambah & Edit Pengguna)
 * File: public/admin/modules/modals/modalUser.js
 * 
 * Tanggung Jawab:
 * - Menampilkan form dialog tambah pengguna baru / edit data & reset password
 * - Mode dinamis: Menyesuaikan field form berdasarkan role aktif (Siswa, Guru, Petugas)
 * - Pendaftaran akun baru dengan kredensial & password default (123456)
 * - Penanganan transaksi database Supabase (data_user + data_siswa/data_guru/data_petugas)
 * - Otomatis refresh tabel dan metrik KPI ringkasan setelah penyimpanan
 */

import { db } from '../../../assets/js/supabaseClient.js';
import { showToast, escapeHtml } from '../../../assets/js/sharedUtils.js';
import { state, TAB_CONFIGS, DOM } from '../core/state.js';
import { loadData, refreshAllBadges, generateUserId } from '../core/data.js';
import { loadKpiStats } from '../0-overview/kpiMetrics.js';

let modalListenersAttached = false;

export function showModalFormError(msg) {
  const errorEl = DOM.modalFormError || document.getElementById('modalFormError');
  const errorTextEl = DOM.modalFormErrorText || document.getElementById('modalFormErrorText');
  if (errorTextEl) errorTextEl.textContent = msg;
  if (errorEl) errorEl.classList.remove('hidden');
}

export function setModalSubmitLoading(isLoading) {
  const btn = DOM.btnSubmitAddUser || document.getElementById('btnSubmitAddUser');
  const icon = DOM.iconSubmitSpinner || document.getElementById('iconSubmitSpinner');
  const text = DOM.textBtnSubmit || document.getElementById('textBtnSubmit');

  if (isLoading) {
    if (btn) btn.disabled = true;
    if (icon) icon.className = 'ph ph-circle-notch animate-spin text-lg';
    if (text) text.textContent = 'Menyimpan...';
  } else {
    if (btn) btn.disabled = false;
    if (icon) icon.className = 'ph ph-check-circle text-lg';
    if (text) text.textContent = 'Simpan Pengguna';
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

  const modalTitle = DOM.modalAddTitle || document.getElementById('modalAddTitle');
  const modalSubtitle = DOM.modalAddSubtitle || document.getElementById('modalAddSubtitle');
  const modalError = DOM.modalFormError || document.getElementById('modalFormError');
  const formEl = DOM.formAddUser || document.getElementById('formAddUser');
  const modalIcon = DOM.modalAddIcon || document.getElementById('modalAddIcon');
  const dynamicFields = DOM.dynamicFormFields || document.getElementById('dynamicFormFields');
  const starPassword = DOM.passwordRequiredStar || document.getElementById('passwordRequiredStar');
  const inputPass = DOM.inputPassword || document.getElementById('inputPassword');
  const passHelp = DOM.passwordHelpText || document.getElementById('passwordHelpText');
  const btnSubmitText = DOM.textBtnSubmit || document.getElementById('textBtnSubmit');

  if (modalTitle) modalTitle.textContent = config.modalTitle;
  if (modalSubtitle) modalSubtitle.textContent = config.modalSubtitle;
  if (modalError) modalError.classList.add('hidden');
  if (formEl) formEl.reset();

  if (starPassword) starPassword.classList.remove('hidden');
  if (inputPass) {
    inputPass.required = true;
    inputPass.value = 'Password123';
    inputPass.placeholder = 'Default: password123';
    inputPass.type = 'password';
  }
  const iconTogglePass = DOM.iconToggleModalPassword || document.getElementById('iconToggleModalPassword');
  if (iconTogglePass) iconTogglePass.className = 'ph ph-eye';
  if (passHelp) {
    passHelp.textContent = 'Password default diset: password123 (Pengguna dapat mengubahnya saat login).';
  }
  if (btnSubmitText) {
    btnSubmitText.textContent = 'Simpan Pengguna';
  }

  // Render Form Fields Dinamis Berdasarkan Tab Aktif
  if (state.activeTab === 'siswa') {
    if (modalIcon) modalIcon.className = 'ph ph-student';
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
    if (modalIcon) modalIcon.className = 'ph ph-chalkboard-teacher';
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
    if (modalIcon) modalIcon.className = 'ph ph-user-gear';
    const autoId = 'PTG' + Math.floor(100 + Math.random() * 900);
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
              placeholder="Contoh: Siti Rahmawati, S.I.Pust." 
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
  const modalEl = DOM.modalAddUser || document.getElementById('modalAddUser');
  const modalContent = DOM.modalAddContent || document.getElementById('modalAddContent');
  if (modalEl) modalEl.classList.remove('hidden');
  requestAnimationFrame(() => {
    if (modalEl) modalEl.classList.remove('opacity-0');
    if (modalContent) modalContent.classList.remove('scale-95');
  });

  // Focus ke input pertama
  setTimeout(() => {
    if (dynamicFields) {
      const firstInput = dynamicFields.querySelector('input');
      if (firstInput) firstInput.focus();
    }
  }, 150);
}

/**
 * Buka modal form edit data pengguna & reset password
 */
export function openEditModal(item) {
  state.modalMode = 'edit';
  state.editingRecord = item;

  const modalTitle = DOM.modalAddTitle || document.getElementById('modalAddTitle');
  const modalSubtitle = DOM.modalAddSubtitle || document.getElementById('modalAddSubtitle');
  const modalError = DOM.modalFormError || document.getElementById('modalFormError');
  const formEl = DOM.formAddUser || document.getElementById('formAddUser');
  const modalIcon = DOM.modalAddIcon || document.getElementById('modalAddIcon');
  const dynamicFields = DOM.dynamicFormFields || document.getElementById('dynamicFormFields');
  const inputUser = DOM.inputUsername || document.getElementById('inputUsername');
  const starPassword = DOM.passwordRequiredStar || document.getElementById('passwordRequiredStar');
  const inputPass = DOM.inputPassword || document.getElementById('inputPassword');
  const passHelp = DOM.passwordHelpText || document.getElementById('passwordHelpText');
  const btnSubmitText = DOM.textBtnSubmit || document.getElementById('textBtnSubmit');

  if (modalError) modalError.classList.add('hidden');
  if (formEl) formEl.reset();

  const titlePrefix = state.activeTab === 'siswa' ? 'Siswa' : state.activeTab === 'guru' ? 'Guru' : 'Petugas';
  if (modalTitle) modalTitle.textContent = `Edit Data ${titlePrefix}`;
  if (modalSubtitle) modalSubtitle.textContent = `Perbarui informasi profil dan kata sandi akun ${titlePrefix.toLowerCase()}.`;

  if (inputUser) {
    inputUser.value = (item.data_user && item.data_user.username) ? item.data_user.username : '';
  }

  if (starPassword) starPassword.classList.add('hidden');
  if (inputPass) {
    inputPass.required = false;
    inputPass.value = '';
    inputPass.placeholder = 'Kosongkan jika tidak ingin mengubah password';
    inputPass.type = 'password';
  }
  const iconTogglePassEdit = DOM.iconToggleModalPassword || document.getElementById('iconToggleModalPassword');
  if (iconTogglePassEdit) iconTogglePassEdit.className = 'ph ph-eye';
  if (passHelp) {
    passHelp.textContent = 'Biarkan kosong untuk mempertahankan password lama.';
  }
  if (btnSubmitText) {
    btnSubmitText.textContent = 'Simpan Perubahan';
  }

  // Render Field Sesuai Tab
  if (state.activeTab === 'siswa') {
    if (modalIcon) modalIcon.className = 'ph ph-note-pencil';
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
    if (modalIcon) modalIcon.className = 'ph ph-note-pencil';
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
    if (modalIcon) modalIcon.className = 'ph ph-note-pencil';
    if (dynamicFields) {
      dynamicFields.innerHTML = `
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
  const modalEl = DOM.modalAddUser || document.getElementById('modalAddUser');
  const modalContent = DOM.modalAddContent || document.getElementById('modalAddContent');
  if (modalEl) modalEl.classList.remove('hidden');
  requestAnimationFrame(() => {
    if (modalEl) modalEl.classList.remove('opacity-0');
    if (modalContent) modalContent.classList.remove('scale-95');
  });

  // Focus ke input pertama
  setTimeout(() => {
    if (dynamicFields) {
      const inputs = dynamicFields.querySelectorAll('input:not([readonly])');
      if (inputs.length > 0) inputs[0].focus();
    }
  }, 150);
}

/**
 * Tutup modal form tambah / edit
 */
export function closeAddModal() {
  const modalEl = DOM.modalAddUser || document.getElementById('modalAddUser');
  const modalContent = DOM.modalAddContent || document.getElementById('modalAddContent');
  const formEl = DOM.formAddUser || document.getElementById('formAddUser');

  if (modalEl) modalEl.classList.add('opacity-0');
  if (modalContent) modalContent.classList.add('scale-95');
  setTimeout(() => {
    if (modalEl) modalEl.classList.add('hidden');
    if (formEl) formEl.reset();
    const inputPass = DOM.inputPassword || document.getElementById('inputPassword');
    const iconTogglePass = DOM.iconToggleModalPassword || document.getElementById('iconToggleModalPassword');
    if (inputPass) inputPass.type = 'password';
    if (iconTogglePass) iconTogglePass.className = 'ph ph-eye';
    state.modalMode = 'add';
    state.editingRecord = null;
  }, 200);
}

/**
 * Alur Transaksi Tambah & Edit Pengguna Otomatis (Termasuk Reset Password & Upload Pasfoto)
 */
export async function handleAddUserSubmit(event) {
  event.preventDefault();
  const formError = DOM.modalFormError || document.getElementById('modalFormError');
  const formEl = DOM.formAddUser || document.getElementById('formAddUser');
  if (formError) formError.classList.add('hidden');

  const formData = new FormData(formEl);
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
          throw new Error(`Username "${username}" sudah digunakan pengguna lain.`);
        }
        throw new Error(userError.message || 'Gagal memperbarui data login pengguna.');
      }

      // 2. Update tabel data_siswa / data_guru / data_petugas (Pertahankan foto_profil yang sudah ada)
      let updateError = null;
      if (state.activeTab === 'siswa') {
        const payload = {
          nama_siswa: formData.get('nama_siswa'),
          kelas: formData.get('kelas'),
          email_siswa: formData.get('email_siswa'),
          kontak_siswa: formData.get('kontak_siswa')
        };
        if (editingRecord.foto_profil) payload.foto_profil = editingRecord.foto_profil;

        const { error } = await db
          .from('data_siswa')
          .update(payload)
          .eq('nisn_siswa', editingRecord.nisn_siswa);
        updateError = error;

      } else if (state.activeTab === 'guru') {
        const payload = {
          nama_guru: formData.get('nama_guru'),
          mata_pelajaran: formData.get('mata_pelajaran'),
          email_guru: formData.get('email_guru'),
          kontak_guru: formData.get('kontak_guru')
        };
        if (editingRecord.foto_profil) payload.foto_profil = editingRecord.foto_profil;

        const { error } = await db
          .from('data_guru')
          .update(payload)
          .eq('nip_guru', editingRecord.nip_guru);
        updateError = error;

      } else if (state.activeTab === 'petugas') {
        const payload = {
          nama_petugas: formData.get('nama_petugas'),
          email_petugas: formData.get('email_petugas'),
          kontak_petugas: formData.get('kontak_petugas')
        };

        const { error } = await db
          .from('data_petugas')
          .update(payload)
          .eq('id_petugas', editingRecord.id_petugas);
        updateError = error;
      }

      if (updateError) {
        throw new Error(updateError.message || 'Gagal memperbarui profil pengguna.');
      }

      setModalSubmitLoading(false);
      closeAddModal();
      showToast(`Data pengguna "${username}" berhasil diperbarui!`, 'success');

      // Refresh data tabel dan metrik KPI
      await loadData(state.activeTab, false);
      refreshAllBadges();
      loadKpiStats().catch(err => console.warn('[ModalUser] Refresh KPI error:', err));

    } catch (err) {
      console.error('[ModalUser] Error saat update user:', err);
      setModalSubmitLoading(false);
      showModalFormError(err.message || 'Terjadi kesalahan sistem saat memperbarui data.');
    }
    return;
  }

  // ========================================================
  // MODE TAMBAH PENGGUNA BARU
  // ========================================================
  const role = state.activeTab;

  if (!username) {
    showModalFormError('Username wajib diisi.');
    return;
  }

  const effectivePassword = (password && password.trim() !== '') ? password.trim() : 'Password123';

  if (effectivePassword.length < 6) {
    showModalFormError('Password minimal harus 6 karakter.');
    return;
  }

  setModalSubmitLoading(true);

  try {
    const idUser = generateUserId();

    const roleDb = role === 'siswa' ? 'Siswa' : role === 'guru' ? 'Guru' : 'Petugas';

    // 1. Insert data_user dengan sandi default / custom
    const { error: userError } = await db
      .from('data_user')
      .insert([
        {
          id_user: idUser,
          username: username,
          password: effectivePassword,
          role: roleDb
        }
      ]);

    if (userError) {
      if (userError.code === '23505' || userError.message.includes('unique')) {
        throw new Error(`Username "${username}" sudah digunakan. Silakan gunakan username lain.`);
      }
      throw new Error(userError.message || 'Gagal mendaftarkan akun login pengguna.');
    }

    // 2. Insert entitas profil spesifik (foto_profil null, default WhatsApp avatar)
    let profileError = null;

    if (role === 'siswa') {
      const payload = {
        nisn_siswa: formData.get('nisn_siswa'),
        nama_siswa: formData.get('nama_siswa'),
        kelas: formData.get('kelas'),
        email_siswa: formData.get('email_siswa'),
        kontak_siswa: formData.get('kontak_siswa'),
        foto_profil: null,
        id_user: idUser
      };

      const { error } = await db.from('data_siswa').insert([payload]);
      profileError = error;

    } else if (role === 'guru') {
      const payload = {
        nip_guru: formData.get('nip_guru'),
        nama_guru: formData.get('nama_guru'),
        mata_pelajaran: formData.get('mata_pelajaran'),
        email_guru: formData.get('email_guru'),
        kontak_guru: formData.get('kontak_guru'),
        foto_profil: null,
        id_user: idUser
      };

      const { error } = await db.from('data_guru').insert([payload]);
      profileError = error;

    } else if (role === 'petugas') {
      const payload = {
        id_petugas: formData.get('id_petugas'),
        nama_petugas: formData.get('nama_petugas'),
        email_petugas: formData.get('email_petugas'),
        kontak_petugas: formData.get('kontak_petugas'),
        id_user: idUser
      };

      const { error } = await db.from('data_petugas').insert([payload]);
      profileError = error;
    }

    // Rollback akun data_user jika insert profil gagal
    if (profileError) {
      console.warn('[ModalUser] Kompensasi rollback akun data_user...', idUser);
      await db.from('data_user').delete().eq('id_user', idUser);

      if (profileError.code === '23505' || profileError.message.includes('unique') || profileError.message.includes('primary')) {
        throw new Error('Nomor induk / ID entitas sudah terdaftar di sistem.');
      }
      throw new Error(profileError.message || 'Gagal menyimpan profil pengguna.');
    }

    setModalSubmitLoading(false);
    closeAddModal();
    showToast(`Berhasil menambahkan akun ${role} baru: ${username}`, 'success');

    // Refresh data tabel & kartu metrik
    await loadData(state.activeTab, false);
    refreshAllBadges();
    loadKpiStats().catch(err => console.warn('[ModalUser] Refresh KPI error:', err));

  } catch (err) {
    console.error('[ModalUser] Error proses simpan user:', err);
    setModalSubmitLoading(false);
    showModalFormError(err.message || 'Terjadi kesalahan sistem saat memproses data.');
  }
}

/**
 * Pasang seluruh event listener untuk Modal User
 */
export function setupModalUserListeners() {
  if (modalListenersAttached) return;
  modalListenersAttached = true;

  // Tombol buka modal add
  document.querySelectorAll('.btn-open-add-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabAttr = btn.dataset.tab;
      if (tabAttr && ['siswa', 'guru', 'petugas'].includes(tabAttr)) {
        state.activeTab = tabAttr;
      }
      openAddModal();
    });
  });

  const btnCancel = DOM.btnCancelAddModal || document.getElementById('btnCancelAddModal');
  const btnClose = DOM.btnCloseAddModal || document.getElementById('btnCloseAddModal');
  const formEl = DOM.formAddUser || document.getElementById('formAddUser');
  const modalEl = DOM.modalAddUser || document.getElementById('modalAddUser');
  const btnTogglePass = DOM.btnToggleModalPassword || document.getElementById('btnToggleModalPassword');
  const inputPass = DOM.inputPassword || document.getElementById('inputPassword');
  const iconTogglePass = DOM.iconToggleModalPassword || document.getElementById('iconToggleModalPassword');

  if (btnCancel) btnCancel.addEventListener('click', closeAddModal);
  if (btnClose) btnClose.addEventListener('click', closeAddModal);
  if (formEl) formEl.addEventListener('submit', handleAddUserSubmit);

  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeAddModal();
    });
  }

  // Toggle Visibility Password
  if (btnTogglePass && inputPass && iconTogglePass) {
    btnTogglePass.addEventListener('click', () => {
      const isPassword = inputPass.type === 'password';
      inputPass.type = isPassword ? 'text' : 'password';
      iconTogglePass.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
  }
}

/**
 * Inisialisasi Modul Modal User
 */
export function initModalUser() {
  setupModalUserListeners();
}

// Interoperabilitas global
if (typeof window !== 'undefined') {
  window.openAddModal = openAddModal;
  window.openEditModal = openEditModal;
  window.closeAddModal = closeAddModal;
  window.handleAddUserSubmit = handleAddUserSubmit;
}
