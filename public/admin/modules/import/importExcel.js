/**
 * CAKRAWALA Digital Library - Modul Import Massal Pengguna via Excel / CSV
 * File: public/admin/modules/import/importExcel.js
 * 
 * Tanggung Jawab:
 * - Menghasilkan & mengunduh template spreadsheet resmi (.xlsx) sesuai role aktif (Siswa, Guru, Petugas)
 * - Membaca dan mem-parsing berkas spreadsheet menggunakan SheetJS (XLSX) dengan proteksi tipe data numerik
 * - Menampilkan pratinjau tabel 5 baris pertama sebelum admin melakukan konfirmasi impor
 * - Validasi kelengkapan data (kunci primer, nama, email, username max 20 char, password min 6 char)
 * - Eksekusi batch insert atomik 2-tahap ke Supabase (data_user + data_siswa/data_guru/data_petugas)
 * - Menggunakan format role kapital ('Siswa', 'Guru', 'Petugas') sesuai Postgres CHECK constraint data_user_role_check
 * - Kompensasi rollback instan jika tahap kedua (profil) mengalami kegagalan
 * - Progress bar realtime & notifikasi rekap hasil import lengkap
 * - Sinkronisasi otomatis ke tabel data dan metrik KPI
 */

import * as XLSX from 'xlsx';
import { db } from '../../../assets/js/supabaseClient.js';
import { showToast, escapeHtml } from '../../../assets/js/sharedUtils.js';
import { state, DOM } from '../state.js';
import { loadData, refreshAllBadges, generateUserId } from '../data.js';
import { loadKpiStats } from '../0-overview/kpiMetrics.js';

let currentParsedRows = [];
let selectedRole = 'siswa';
let listenersInitialized = false;

/**
 * Konfigurasi kolom template per role
 */
export const TEMPLATE_CONFIGS = {
  siswa: {
    filename: 'template_import_siswa.xlsx',
    sheetName: 'Format_SISWA',
    headers: ['NISN', 'Nama Siswa', 'Kelas', 'Email', 'Kontak', 'Username', 'Password'],
    sample: [
      ['0051234567', 'Ahmad Fauzi', 'XII MIPA 1', 'ahmad@sekolah.sch.id', '081234567890', 'ahmad005', 'pass1234'],
      ['0051234568', 'Siti Aisyah', 'XI IPS 2', 'aisyah@sekolah.sch.id', '081234567891', 'aisyah005', 'pass1234']
    ]
  },
  guru: {
    filename: 'template_import_guru.xlsx',
    sheetName: 'Format_GURU',
    headers: ['NIP', 'Nama Guru', 'Mata Pelajaran', 'Email', 'Kontak', 'Username', 'Password'],
    sample: [
      ['198501012010011001', 'Dr. Budi Santoso, M.Pd.', 'Bahasa Indonesia', 'budi@sekolah.sch.id', '081234567892', 'budisantoso', 'pass1234'],
      ['198802152012012002', 'Dewi Sartika, S.Pd.', 'Matematika', 'dewi@sekolah.sch.id', '081234567893', 'dewisartika', 'pass1234']
    ]
  },
  petugas: {
    filename: 'template_import_petugas.xlsx',
    sheetName: 'Format_PETUGAS',
    headers: ['ID Petugas', 'Nama Petugas', 'Email', 'Kontak', 'Username', 'Password'],
    sample: [
      ['PTG001', 'Siti Rahmawati, S.I.Pust.', 'siti@cakrawala.id', '081234567894', 'sitipustaka', 'pass1234'],
      ['PTG002', 'Rian Hidayat', 'rian@cakrawala.id', '081234567895', 'rianpustaka', 'pass1234']
    ]
  }
};

/**
 * Unduh file template Excel resmi sesuai role
 */
export function downloadTemplateExcel(role = selectedRole) {
  const config = TEMPLATE_CONFIGS[role] || TEMPLATE_CONFIGS.siswa;
  const data = [config.headers, ...config.sample];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = config.headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName || `Format_${role.toUpperCase()}`);
  XLSX.writeFile(wb, config.filename);
}

/**
 * Buka modal Import Excel
 */
export function openImportModal(role = state.activeTab) {
  selectedRole = role && ['siswa', 'guru', 'petugas'].includes(role) ? role : (['siswa', 'guru', 'petugas'].includes(state.activeTab) ? state.activeTab : 'siswa');
  resetImportState();

  const modalEl = document.getElementById('modalImportExcel');
  const contentEl = document.getElementById('modalImportContent');
  const roleBadgeEl = document.getElementById('importTargetRoleBadge');
  const titleEl = document.getElementById('modalImportTitle');

  if (titleEl) {
    const roleName = selectedRole === 'siswa' ? 'Siswa' : selectedRole === 'guru' ? 'Guru' : 'Petugas';
    titleEl.textContent = `Impor Massal Data ${roleName}`;
  }

  if (roleBadgeEl) {
    roleBadgeEl.textContent = selectedRole.toUpperCase();
    if (selectedRole === 'siswa') {
      roleBadgeEl.className = 'rounded-full bg-navy/10 px-2.5 py-0.5 text-2xs font-extrabold uppercase text-navy tracking-wide';
    } else if (selectedRole === 'guru') {
      roleBadgeEl.className = 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs font-extrabold uppercase text-emerald-800 tracking-wide';
    } else {
      roleBadgeEl.className = 'rounded-full bg-indigo-100 px-2.5 py-0.5 text-2xs font-extrabold uppercase text-indigo-800 tracking-wide';
    }
  }

  if (modalEl) {
    modalEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalEl.classList.remove('opacity-0');
      if (contentEl) contentEl.classList.remove('scale-95');
    });
  }
}

/**
 * Tutup modal Import Excel
 */
export function closeImportModal() {
  const modalEl = document.getElementById('modalImportExcel');
  const contentEl = document.getElementById('modalImportContent');

  if (modalEl) modalEl.classList.add('opacity-0');
  if (contentEl) contentEl.classList.add('scale-95');

  setTimeout(() => {
    if (modalEl) modalEl.classList.add('hidden');
    resetImportState();
  }, 200);
}

/**
 * Reset seluruh UI dan state di dalam modal Import
 */
export function resetImportState() {
  currentParsedRows = [];

  const fileInput = document.getElementById('inputImportFile');
  if (fileInput) fileInput.value = '';

  const fileInfoBox = document.getElementById('importFileInfoBox');
  if (fileInfoBox) fileInfoBox.classList.add('hidden');

  const dropZone = document.getElementById('importDropZone');
  if (dropZone) dropZone.classList.remove('hidden');

  const previewContainer = document.getElementById('importPreviewContainer');
  if (previewContainer) previewContainer.classList.add('hidden');

  const progressBox = document.getElementById('importProgressBox');
  if (progressBox) progressBox.classList.add('hidden');

  const errorBox = document.getElementById('importErrorBox');
  if (errorBox) errorBox.classList.add('hidden');

  const btnConfirm = document.getElementById('btnConfirmImportExcel');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    const textBtn = document.getElementById('textBtnConfirmImport');
    const icon = document.getElementById('iconConfirmImport');
    if (textBtn) textBtn.textContent = 'Impor ke Database';
    if (icon) icon.className = 'ph ph-check-circle text-base';
  }
}

/**
 * Tampilkan pesan kesalahan validasi / format file
 */
function showImportError(msg) {
  const errorBox = document.getElementById('importErrorBox');
  const errorText = document.getElementById('importErrorText');
  if (errorText) errorText.textContent = msg;
  if (errorBox) errorBox.classList.remove('hidden');
}

/**
 * Parsing file Excel / CSV ke dataset JSON dengan toleransi format tinggi
 */
export async function handleFileSelected(file) {
  if (!file) return;

  const validExtensions = ['xlsx', 'xls', 'csv'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(ext)) {
    showToast('Format file harus berupa Excel (.xlsx, .xls) atau CSV (.csv).', 'warning');
    return;
  }

  // Batas file 5 MB
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file maksimal 5 MB.', 'warning');
    return;
  }

  const errorBox = document.getElementById('importErrorBox');
  if (errorBox) errorBox.classList.add('hidden');

  try {
    const arrayBuffer = await file.arrayBuffer();
    // Gunakan raw: false & cellText: true agar nomor besar seperti NIP / NISN tidak terpotong
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellText: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      showImportError('File spreadsheet tidak memiliki lembar kerja (worksheet).');
      return;
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

    if (!rawRows || rawRows.length < 2) {
      showImportError('File spreadsheet tidak memiliki baris data (hanya header atau kosong).');
      return;
    }

    const headers = rawRows[0].map(h => String(h || '').trim());
    const dataRows = rawRows.slice(1).filter(row => row.some(cell => String(cell || '').trim() !== ''));

    if (dataRows.length === 0) {
      showImportError('Tidak ditemukan baris data yang valid di dalam file.');
      return;
    }

    // Mapping header ke field standar secara cerdas
    const normalizedRows = dataRows.map((row, idx) => {
      const obj = { _rowNum: idx + 2 };

      headers.forEach((header, colIdx) => {
        let val = String(row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : '').trim();
        // Bersihkan akhiran .0 akibat konversi numerik tak sengaja
        if (/^\d+\.0$/.test(val)) val = val.replace(/\.0$/, '');

        const hClean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (hClean.includes('nisn')) {
          obj.nisn = val;
        } else if (hClean.includes('nip')) {
          obj.nip = val;
        } else if (hClean === 'id' || hClean === 'idpetugas' || (hClean.includes('id') && hClean.includes('petugas'))) {
          obj.id_petugas = val;
        } else if (hClean.includes('nama') || hClean === 'name') {
          obj.nama = val;
        } else if (hClean.includes('kelas') || hClean.includes('class') || hClean.includes('rombel')) {
          obj.kelas = val;
        } else if (hClean.includes('matapelajaran') || hClean.includes('mapel') || hClean.includes('subject')) {
          obj.mata_pelajaran = val;
        } else if (hClean.includes('email') || hClean.includes('surel')) {
          obj.email = val;
        } else if (hClean.includes('kontak') || hClean.includes('hp') || hClean.includes('wa') || hClean.includes('telepon') || hClean.includes('phone') || hClean.includes('nohp')) {
          obj.kontak = val;
        } else if (hClean.includes('username') || hClean === 'user' || hClean === 'akun') {
          obj.username = val;
        } else if (hClean.includes('password') || hClean.includes('sandi') || hClean === 'pass') {
          obj.password = val;
        }
      });

      // Fallback pemetaan kolom berdasarkan posisi default jika header tidak bernama standar
      if (selectedRole === 'siswa' && !obj.nisn && row[0]) obj.nisn = String(row[0]).trim();
      if (selectedRole === 'guru' && !obj.nip && row[0]) obj.nip = String(row[0]).trim();
      if (selectedRole === 'petugas' && !obj.id_petugas && row[0]) obj.id_petugas = String(row[0]).trim();
      if (!obj.nama && row[1]) obj.nama = String(row[1]).trim();

      return obj;
    });

    currentParsedRows = normalizedRows;

    // Tampilkan File Info
    const fileInfoBox = document.getElementById('importFileInfoBox');
    const fileNameEl = document.getElementById('importFileName');
    const fileSizeEl = document.getElementById('importFileSize');
    const dropZone = document.getElementById('importDropZone');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) {
      const sizeKb = (file.size / 1024).toFixed(1);
      fileSizeEl.textContent = `${sizeKb} KB • ${dataRows.length} Baris terdeteksi`;
    }

    if (dropZone) dropZone.classList.add('hidden');
    if (fileInfoBox) fileInfoBox.classList.remove('hidden');

    // Tampilkan Preview Tabel
    renderPreviewTable(headers, dataRows);

    // Aktifkan Tombol Eksekusi
    const btnConfirm = document.getElementById('btnConfirmImportExcel');
    if (btnConfirm) btnConfirm.disabled = false;

  } catch (err) {
    console.error('[ImportExcel] Gagal membaca spreadsheet:', err);
    showImportError(`Gagal membaca file: ${err.message || 'Format tidak valid'}`);
  }
}

/**
 * Render pratinjau tabel 5 baris pertama
 */
function renderPreviewTable(headers, dataRows) {
  const container = document.getElementById('importPreviewContainer');
  const thead = document.getElementById('importPreviewThead');
  const tbody = document.getElementById('importPreviewTbody');
  const countBadge = document.getElementById('importPreviewBadgeCount');

  if (!container || !thead || !tbody) return;

  if (countBadge) countBadge.textContent = `${dataRows.length} Total Baris`;

  // Render Header
  thead.innerHTML = `
    <tr>
      <th class="px-3 py-2 w-8 text-center">No</th>
      ${headers.map(h => `<th class="px-3 py-2">${escapeHtml(h)}</th>`).join('')}
    </tr>
  `;

  // Render Maksimal 5 Baris
  const previewRows = dataRows.slice(0, 5);
  tbody.innerHTML = previewRows.map((row, idx) => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-3 py-2 text-center text-slate-400 font-bold">${idx + 1}</td>
      ${headers.map((_, colIdx) => `
        <td class="px-3 py-2 text-slate-700 truncate max-w-[150px]">${escapeHtml(String(row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : '-'))}</td>
      `).join('')}
    </tr>
  `).join('');

  container.classList.remove('hidden');
}

/**
 * Eksekusi Batch Insert Data ke Supabase dengan Rollback Aman
 */
export async function executeImportBatch() {
  if (!currentParsedRows || currentParsedRows.length === 0) {
    showToast('Tidak ada data untuk diimpor.', 'warning');
    return;
  }

  const role = selectedRole;
  // Format role kapital persis sesuai CHECK (role IN ('Admin', 'Petugas', 'Siswa', 'Guru')) di Supabase
  const roleDb = role === 'siswa' ? 'Siswa' : role === 'guru' ? 'Guru' : 'Petugas';

  const total = currentParsedRows.length;
  let successCount = 0;
  let failedCount = 0;
  const failureReasons = [];

  // Setup Progress UI
  const progressBox = document.getElementById('importProgressBox');
  const progressBar = document.getElementById('importProgressBar');
  const progressPct = document.getElementById('importProgressPercentage');
  const progressDetail = document.getElementById('importProgressDetail');
  const btnConfirm = document.getElementById('btnConfirmImportExcel');
  const btnCancel = document.getElementById('btnCloseImportModal');
  const btnCancelTop = document.getElementById('btnCancelImportModal');
  const textBtn = document.getElementById('textBtnConfirmImport');
  const iconBtn = document.getElementById('iconConfirmImport');

  if (progressBox) progressBox.classList.remove('hidden');
  if (btnConfirm) btnConfirm.disabled = true;
  if (btnCancel) btnCancel.disabled = true;
  if (btnCancelTop) btnCancelTop.disabled = true;
  if (textBtn) textBtn.textContent = 'Menyimpan...';
  if (iconBtn) iconBtn.className = 'ph ph-circle-notch animate-spin text-base';

  const updateProgress = (current) => {
    const pct = Math.round((current / total) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPct) progressPct.textContent = `${pct}%`;
    if (progressDetail) progressDetail.textContent = `Menyimpan baris ${current} dari ${total} (${successCount} berhasil, ${failedCount} gagal)...`;
  };

  // Proses baris satu demi satu secara atomik per baris (Two-Phase Commit)
  for (let i = 0; i < total; i++) {
    const row = currentParsedRows[i];
    const rowNum = row._rowNum || (i + 2);

    try {
      // 1. Validasi Kunci Primer
      let primaryKey = role === 'siswa' ? row.nisn : role === 'guru' ? row.nip : row.id_petugas;
      primaryKey = primaryKey ? String(primaryKey).replace(/\.0$/, '').trim() : '';

      if (!primaryKey) {
        throw new Error(`Kolom ${role === 'siswa' ? 'NISN' : role === 'guru' ? 'NIP' : 'ID Petugas'} tidak boleh kosong.`);
      }

      const nama = (row.nama || '').trim();
      if (!nama) {
        throw new Error('Kolom Nama Lengkap tidak boleh kosong.');
      }

      // Pastikan username tidak melebihi batasan VARCHAR(20) di data_user
      let username = (row.username || primaryKey || '').trim();
      if (!username) {
        username = `${role}_${primaryKey}`;
      }
      username = username.slice(0, 20);

      const password = (row.password && String(row.password).trim().length >= 6) ? String(row.password).trim() : '123456';
      const idUser = generateUserId();

      // 2. Tahap 1: Insert ke tabel sentral 'data_user' dengan role kapital
      const { error: userError } = await db
        .from('data_user')
        .insert([
          {
            id_user: idUser,
            username: username,
            password: password,
            role: roleDb
          }
        ]);

      if (userError) {
        if (userError.code === '23505' || userError.message.includes('unique')) {
          throw new Error(`Username "${username}" sudah digunakan pengguna lain.`);
        }
        throw new Error(userError.message || 'Gagal membuat akun login.');
      }

      // 3. Tahap 2: Insert entitas profil spesifik
      let profileError = null;

      if (role === 'siswa') {
        const { error } = await db.from('data_siswa').insert([
          {
            nisn_siswa: primaryKey,
            nama_siswa: nama,
            kelas: row.kelas || 'X',
            email_siswa: row.email || `${username}@sekolah.sch.id`,
            kontak_siswa: row.kontak || '-',
            id_user: idUser
          }
        ]);
        profileError = error;

      } else if (role === 'guru') {
        const { error } = await db.from('data_guru').insert([
          {
            nip_guru: primaryKey,
            nama_guru: nama,
            mata_pelajaran: row.mata_pelajaran || 'Umum',
            email_guru: row.email || `${username}@sekolah.sch.id`,
            kontak_guru: row.kontak || '-',
            id_user: idUser
          }
        ]);
        profileError = error;

      } else if (role === 'petugas') {
        const { error } = await db.from('data_petugas').insert([
          {
            id_petugas: primaryKey,
            nama_petugas: nama,
            email_petugas: row.email || `${username}@cakrawala.id`,
            kontak_petugas: row.kontak || '-',
            id_user: idUser
          }
        ]);
        profileError = error;
      }

      // Kompensasi Rollback jika tahap profil gagal agar tidak meninggalkan orphan record di data_user
      if (profileError) {
        await db.from('data_user').delete().eq('id_user', idUser);

        if (profileError.code === '23505' || profileError.message.includes('unique') || profileError.message.includes('primary')) {
          throw new Error(`Nomor identitas "${primaryKey}" sudah terdaftar di sistem.`);
        }
        throw new Error(profileError.message || 'Gagal menyimpan data profil.');
      }

      successCount++;
    } catch (err) {
      failedCount++;
      failureReasons.push(`Baris ${rowNum}: ${err.message}`);
      console.warn(`[ImportExcel] Gagal pada baris ${rowNum}:`, err.message);
    }

    updateProgress(i + 1);
  }

  // Selesai Batch Process
  if (btnCancel) btnCancel.disabled = false;
  if (btnCancelTop) btnCancelTop.disabled = false;

  if (successCount > 0) {
    if (textBtn) textBtn.textContent = 'Selesai';
    if (iconBtn) iconBtn.className = 'ph ph-check-circle text-base';
    showToast(`Berhasil mengimpor ${successCount} data ${role}!`, 'success');
    if (failedCount > 0) {
      showToast(`${failedCount} baris dilewati (${failureReasons[0] || 'Kendala format'}).`, 'warning');
    }
  } else {
    if (btnConfirm) btnConfirm.disabled = false;
    if (textBtn) textBtn.textContent = 'Coba Lagi';
    if (iconBtn) iconBtn.className = 'ph ph-arrow-clockwise text-base';
    showToast(`Gagal mengimpor data: ${failureReasons[0] || 'Periksa format file dan koneksi.'}`, 'error');
  }

  // Refresh tabel data aktif dan metrik KPI
  await loadData(state.activeTab, false);
  refreshAllBadges();
  loadKpiStats().catch(err => console.warn('[ImportExcel] Refresh KPI error:', err));

  // Tutup modal otomatis jika seluruh/sebagian data sukses diimpor
  if (successCount > 0) {
    setTimeout(() => {
      closeImportModal();
    }, 1200);
  }
}

/**
 * Pasang seluruh event listener untuk Modal Import Excel
 */
export function setupImportExcelListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // Delegated event listener untuk tombol buka modal import di semua tab
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-import-modal');
    if (btn) {
      const role = btn.dataset.role || state.activeTab;
      openImportModal(role);
    }
  });

  const btnCancel = document.getElementById('btnCancelImportModal');
  const btnClose = document.getElementById('btnCloseImportModal');
  const modalEl = document.getElementById('modalImportExcel');
  const btnDownloadTemplate = document.getElementById('btnDownloadTemplateExcel');
  const dropZone = document.getElementById('importDropZone');
  const fileInput = document.getElementById('inputImportFile');
  const btnRemoveFile = document.getElementById('btnRemoveImportFile');
  const btnConfirm = document.getElementById('btnConfirmImportExcel');

  if (btnCancel) btnCancel.addEventListener('click', closeImportModal);
  if (btnClose) btnClose.addEventListener('click', closeImportModal);

  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeImportModal();
    });
  }

  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      downloadTemplateExcel(selectedRole);
      showToast(`Mengunduh template Excel untuk data ${selectedRole}...`, 'info');
    });
  }

  // Drag and Drop Events
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-emerald-500', 'bg-emerald-50/40');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/40');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/40');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelected(e.target.files[0]);
      }
    });
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', resetImportState);
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', executeImportBatch);
  }
}

/**
 * Inisialisasi Modul Import Excel
 */
export function initImportExcel() {
  setupImportExcelListeners();
}

// Interoperabilitas global
if (typeof window !== 'undefined') {
  window.openImportModal = openImportModal;
  window.closeImportModal = closeImportModal;
  window.downloadTemplateExcel = downloadTemplateExcel;
  window.initImportExcel = initImportExcel;
}
