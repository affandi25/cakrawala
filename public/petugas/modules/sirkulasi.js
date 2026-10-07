/**
 * CAKRAWALA Digital Library - Modul Meja 2: Sirkulasi & Prapinjam
 * File: public/petugas/modules/sirkulasi.js
 * 
 * FUNGSI:
 * - Mengelola antrean prapinjam daring siswa & guru (verifikasi & pembatalan).
 * - Mengelola peminjaman langsung (Walk-In Desk) dengan pencarian cerdas anggota (Combobox Siswa & Guru).
 * - Mengelola daftar buku yang sedang aktif dipinjam beserta pintasan ke meja pengembalian.
 */

import { db } from '../../assets/js/supabaseClient.js';
import { state } from './state.js';
import {
  formatTanggalIndo,
  getTodayDateString,
  addDaysToDate,
  generateRandomId,
  showModal,
  hideModal,
  showToast,
  getBorrowerInfo
} from './utils.js';

/**
 * Menampilkan pratinjau buku yang dipilih ke dalam kartu hijau di Meja Walk-In
 */
export function setMejaSelectedBuku(book) {
  if (!book) return;
  state.selectedMejaBuku = book;

  const barcodeInput = document.getElementById('inputMejaBarcode');
  const selectBuku = document.getElementById('selectMejaBuku');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');

  if (barcodeInput && barcodeInput.value !== book.id_buku) {
    barcodeInput.value = book.id_buku;
  }
  if (selectBuku && selectBuku.value !== book.id_buku) {
    selectBuku.value = book.id_buku;
  }

  const previewBox = document.getElementById('previewBukuMejaBox');
  const badgeId = document.getElementById('badgeMejaIdBuku');
  const textJudul = document.getElementById('textMejaJudulBuku');
  const textPenulisRak = document.getElementById('textMejaPenulisRak');
  const textStok = document.getElementById('textMejaStokBuku');
  const imgCover = document.getElementById('imgMejaCover');
  const iconDefault = document.getElementById('iconMejaCoverDefault');

  if (badgeId) badgeId.textContent = book.id_buku;
  if (textJudul) textJudul.textContent = book.judul_buku;
  if (textPenulisRak) textPenulisRak.innerHTML = `${book.penulis || '-'} &bull; <strong class="text-navy">${book.keterangan || 'Rak Umum'}</strong>`;

  const stok = Number(book.stok) || 0;
  if (textStok) {
    textStok.textContent = `${stok} Eksemplar`;
    textStok.className = stok > 0 ? 'text-base font-extrabold text-emerald-700' : 'text-base font-extrabold text-rose-600';
  }

  if (imgCover && iconDefault) {
    if (book.cover_url) {
      imgCover.src = book.cover_url;
      imgCover.classList.remove('hidden');
      iconDefault.classList.add('hidden');
    } else {
      imgCover.classList.add('hidden');
      iconDefault.classList.remove('hidden');
    }
  }

  if (previewBox) {
    previewBox.classList.remove('hidden');
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (submitBtn) {
    const hasMember = state.selectedMember || (selectSiswa && selectSiswa.value);
    submitBtn.disabled = !(stok > 0 && hasMember);
  }
}

/**
 * Membersihkan kotak pratinjau buku di formulir walk-in
 */
export function clearMejaBukuPreview() {
  state.selectedMejaBuku = null;
  const previewBox = document.getElementById('previewBukuMejaBox');
  if (previewBox) previewBox.classList.add('hidden');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');
  if (submitBtn) submitBtn.disabled = true;
}

/**
 * Inisialisasi event listener meja sirkulasi
 */
export function setupSirkulasiHandlers() {
  state.activeSirkulasiSubtab = 'prapinjam';
  state.selectedMejaBuku = null;

  const subtabs = [
    { id: 'subTabBtnPrapinjam', panelId: 'subPanelPrapinjam', key: 'prapinjam' },
    { id: 'subTabBtnWalkIn', panelId: 'subPanelWalkIn', key: 'walkin' },
    { id: 'subTabBtnDipinjam', panelId: 'subPanelDipinjam', key: 'dipinjam' }
  ];

  subtabs.forEach(item => {
    const btn = document.getElementById(item.id);
    if (!btn) return;

    btn.addEventListener('click', () => {
      switchSirkulasiSubtab(item.key);
    });
  });

  const refreshBtn = document.getElementById('btnRefreshSirkulasi');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showToast('Memperbarui data sirkulasi...', 'info');
      if (window.fetchAllData) await window.fetchAllData();
    });
  }

  const searchPrapinjam = document.getElementById('inputSearchPrapinjam');
  if (searchPrapinjam) {
    searchPrapinjam.addEventListener('input', e => {
      state.searchPrapinjamQuery = e.target.value.trim().toLowerCase();
      renderPrapinjamOnlyTable();
    });
  }

  const searchDipinjam = document.getElementById('inputSearchDipinjam');
  if (searchDipinjam) {
    searchDipinjam.addEventListener('input', e => {
      state.searchDipinjamQuery = e.target.value.trim().toLowerCase();
      renderDipinjamOnlyTable();
    });
  }

  // Pengaturan Walk-In Desk Form
  const barcodeInput = document.getElementById('inputMejaBarcode');
  const selectBuku = document.getElementById('selectMejaBuku');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const formWalkIn = document.getElementById('formMejaWalkIn');
  const resetBtn = document.getElementById('btnResetMejaForm');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');

  const today = getTodayDateString();
  const tglPinjamInput = document.getElementById('inputMejaTglPinjam');
  const batasKembaliInput = document.getElementById('inputMejaBatasKembali');
  if (tglPinjamInput) tglPinjamInput.value = today;
  if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);

  if (barcodeInput) {
    barcodeInput.addEventListener('input', () => {
      const val = barcodeInput.value.trim().toUpperCase();
      if (!val) {
        clearMejaBukuPreview();
        return;
      }

      // Cek tiket booking daring
      const pendingBooking = state.cache.peminjaman.find(p => 
        p.status === 'Menunggu' && p.id_peminjaman && p.id_peminjaman.toUpperCase() === val
      );
      if (pendingBooking) {
        switchSirkulasiSubtab('prapinjam');
        showToast(`Tiket Booking ${pendingBooking.id_peminjaman} terdeteksi! Silakan serahkan buku.`, 'info');
        const searchInput = document.getElementById('inputSearchPrapinjam');
        if (searchInput) {
          searchInput.value = pendingBooking.id_peminjaman;
          state.searchPrapinjamQuery = pendingBooking.id_peminjaman.toLowerCase();
          renderPrapinjamOnlyTable();
        }
        barcodeInput.value = '';
        return;
      }

      // Cek stiker barcode buku fisik
      const book = state.cache.buku.find(b => 
        (b.id_buku && b.id_buku.toUpperCase() === val) || 
        (b.kode_qr && b.kode_qr.toUpperCase() === val)
      );

      if (book) {
        setMejaSelectedBuku(book);
        if (selectBuku) selectBuku.value = book.id_buku;
      } else {
        clearMejaBukuPreview();
      }
    });
  }

  if (selectBuku) {
    selectBuku.addEventListener('change', () => {
      const idBuku = selectBuku.value;
      const book = state.cache.buku.find(b => b.id_buku === idBuku);
      if (book) {
        setMejaSelectedBuku(book);
        if (barcodeInput) barcodeInput.value = book.id_buku;
      } else {
        clearMejaBukuPreview();
        if (barcodeInput) barcodeInput.value = '';
      }
    });
  }

  if (selectSiswa) {
    selectSiswa.addEventListener('change', () => {
      if (submitBtn) {
        const hasMember = state.selectedMember || (selectSiswa && selectSiswa.value);
        submitBtn.disabled = !(hasMember && state.selectedMejaBuku && (Number(state.selectedMejaBuku.stok) || 0) > 0);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearMejaBukuPreview();
      clearSelectedMember();
      if (tglPinjamInput) tglPinjamInput.value = today;
      if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);
    });
  }

  setupMemberPicker();

  if (formWalkIn) {
    formWalkIn.addEventListener('submit', async e => {
      e.preventDefault();
      const memberId = document.getElementById('inputSelectedMemberId')?.value || (selectSiswa ? selectSiswa.value : '');
      const book = state.selectedMejaBuku;
      const tglPinjam = tglPinjamInput ? tglPinjamInput.value : today;
      const batasKembali = batasKembaliInput ? batasKembaliInput.value : addDaysToDate(today, 7);

      if (!memberId) {
        showToast('Pilih identitas siswa/guru peminjam terlebih dahulu.', 'warning');
        const searchInput = document.getElementById('inputCariPeminjam');
        if (searchInput) searchInput.focus();
        return;
      }

      if (!book || (Number(book.stok) || 0) <= 0) {
        showToast('Pilih atau scan buku fisik yang memiliki stok tersedia.', 'warning');
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg"></i> <span>Menerbitkan Peminjaman...</span>';
        }

        const newIdPeminjaman = generateRandomId('PJ', 6);

        const { error: errLoan } = await db
          .from('data_peminjaman')
          .insert({
            id_peminjaman: newIdPeminjaman,
            nisn_siswa: memberId,
            id_buku: book.id_buku,
            tanggal_pinjam: tglPinjam,
            batas_kembali: batasKembali,
            metode_peminjaman: 'Scan QR',
            status: 'Dipinjam'
          });
        if (errLoan) throw errLoan;

        const stokBaru = Math.max(0, (Number(book.stok) || 1) - 1);
        const statusBaru = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

        const { error: errBook } = await db
          .from('data_buku')
          .update({ stok: stokBaru, status: statusBaru })
          .eq('id_buku', book.id_buku);
        if (errBook) throw errBook;

        const borrower = getBorrowerInfo(memberId);
        showToast(`Peminjaman langsung berhasil diterbitkan (${newIdPeminjaman}) untuk ${borrower.nama}! Buku telah aktif dipinjam.`, 'success');

        formWalkIn.reset();
        clearMejaBukuPreview();
        clearSelectedMember();
        if (tglPinjamInput) tglPinjamInput.value = today;
        if (batasKembaliInput) batasKembaliInput.value = addDaysToDate(today, 7);

        if (window.fetchAllData) await window.fetchAllData();
        switchSirkulasiSubtab('dipinjam');
      } catch (err) {
        console.error('Gagal menerbitkan peminjaman meja:', err);
        showToast('Gagal menerbitkan peminjaman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ph ph-check-circle text-lg"></i> <span>Terbitkan Peminjaman Langsung</span>';
        }
      }
    });
  }
}

/**
 * Menggabungkan daftar siswa dan guru untuk pencarian terpadu
 */
export function getCombinedMembersList() {
  const list = [];
  const filter = state.memberFilterType || 'semua';

  if (filter === 'semua' || filter === 'siswa') {
    (state.cache.siswa || []).forEach(s => {
      list.push({
        type: 'siswa',
        id: s.nisn_siswa,
        nama: s.nama_siswa,
        detail: `NISN: ${s.nisn_siswa} &bull; Kelas ${s.kelas || '-'}`,
        badge: 'Siswa',
        searchStr: `${s.nama_siswa} ${s.nisn_siswa} ${s.kelas || ''}`.toLowerCase()
      });
    });
  }

  if (filter === 'semua' || filter === 'guru') {
    (state.cache.guru || []).forEach(g => {
      list.push({
        type: 'guru',
        id: g.nip_guru,
        nama: g.nama_guru,
        detail: `NIP: ${g.nip_guru} &bull; ${g.mata_pelajaran || 'Pengajar'}`,
        badge: 'Guru',
        searchStr: `${g.nama_guru} ${g.nip_guru} ${g.mata_pelajaran || ''}`.toLowerCase()
      });
    });
  }

  return list;
}

/**
 * Filter daftar anggota berdasarkan query pencarian
 */
export function getFilteredMembers(query = '') {
  const all = getCombinedMembersList();
  if (!query) return all.slice(0, 10);
  const q = query.toLowerCase();
  return all.filter(m => m.searchStr.includes(q)).slice(0, 15);
}

/**
 * Inisialisasi komponen Combobox pencarian anggota (Siswa & Guru)
 */
export function setupMemberPicker() {
  const inputSearch = document.getElementById('inputCariPeminjam');
  const btnClear = document.getElementById('btnClearCariPeminjam');
  const dropdown = document.getElementById('dropdownHasilPeminjam');
  const btnGanti = document.getElementById('btnGantiPeminjam');

  const btnSemua = document.getElementById('btnFilterPeminjamSemua');
  const btnSiswa = document.getElementById('btnFilterPeminjamSiswa');
  const btnGuru = document.getElementById('btnFilterPeminjamGuru');

  if (!inputSearch) return;

  function updateFilterPills() {
    const pills = [
      { el: btnSemua, key: 'semua' },
      { el: btnSiswa, key: 'siswa' },
      { el: btnGuru, key: 'guru' }
    ];
    pills.forEach(({ el, key }) => {
      if (!el) return;
      if (key === state.memberFilterType) {
        el.className = 'btn-filter-peminjam rounded-md bg-white px-2 py-0.5 text-navy shadow-xs font-bold';
      } else {
        el.className = 'btn-filter-peminjam rounded-md px-2 py-0.5 text-slate-500 hover:text-navy';
      }
    });
  }

  if (btnSemua) btnSemua.addEventListener('click', () => { state.memberFilterType = 'semua'; updateFilterPills(); renderMemberDropdownResults(); });
  if (btnSiswa) btnSiswa.addEventListener('click', () => { state.memberFilterType = 'siswa'; updateFilterPills(); renderMemberDropdownResults(); });
  if (btnGuru) btnGuru.addEventListener('click', () => { state.memberFilterType = 'guru'; updateFilterPills(); renderMemberDropdownResults(); });

  inputSearch.addEventListener('input', () => {
    const q = inputSearch.value.trim();
    if (btnClear) btnClear.classList.toggle('hidden', !q);
    renderMemberDropdownResults();
  });

  inputSearch.addEventListener('focus', () => {
    renderMemberDropdownResults();
  });

  inputSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const results = getFilteredMembers(inputSearch.value.trim());
      if (results.length > 0) {
        selectMember(results[0]);
      }
    }
  });

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputSearch.value = '';
      btnClear.classList.add('hidden');
      renderMemberDropdownResults();
      inputSearch.focus();
    });
  }

  if (btnGanti) {
    btnGanti.addEventListener('click', () => {
      clearSelectedMember();
    });
  }

  document.addEventListener('click', e => {
    const container = document.getElementById('containerPencarianPeminjam');
    if (container && !container.contains(e.target) && dropdown) {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Menampilkan hasil pencarian anggota pada pop-up dropdown
 */
export function renderMemberDropdownResults() {
  const inputSearch = document.getElementById('inputCariPeminjam');
  const dropdown = document.getElementById('dropdownHasilPeminjam');
  if (!inputSearch || !dropdown) return;

  const query = inputSearch.value.trim();
  const results = getFilteredMembers(query);

  if (results.length === 0) {
    dropdown.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        <i class="ph ph-user-circle text-xl text-slate-300 inline-block mb-1"></i>
        <p>Tidak ada ${state.memberFilterType === 'guru' ? 'guru' : (state.memberFilterType === 'siswa' ? 'siswa' : 'anggota')} yang cocok.</p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = results.map(item => {
    const initials = item.nama ? item.nama.substring(0, 2).toUpperCase() : 'AG';
    const badgeClass = item.type === 'guru' 
      ? 'bg-amber-100 text-amber-800' 
      : 'bg-blue-100 text-navy';
    const avatarBg = item.type === 'guru' ? 'bg-amber-600' : 'bg-navy';

    return `
      <div data-id="${item.id}" class="item-hasil-peminjam flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-200">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${avatarBg} text-white text-[11px] font-bold">
            ${initials}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-800 truncate">${item.nama}</span>
              <span class="rounded-full ${badgeClass} px-2 py-0.2 text-[9px] font-bold">${item.badge}</span>
            </div>
            <p class="text-[11px] text-slate-500 truncate">${item.detail}</p>
          </div>
        </div>
        <i class="ph ph-arrow-right text-slate-300 text-xs shrink-0"></i>
      </div>
    `;
  }).join('');

  dropdown.querySelectorAll('.item-hasil-peminjam').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const all = getCombinedMembersList();
      const found = all.find(m => m.id === id);
      if (found) selectMember(found);
    });
  });

  dropdown.classList.remove('hidden');
}

/**
 * Memilih anggota terpilih dan memperbarui kartu informasi di UI
 */
export function selectMember(member) {
  state.selectedMember = member;
  const inputHidden = document.getElementById('inputSelectedMemberId');
  const inputType = document.getElementById('inputSelectedMemberType');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const wrapperInput = document.getElementById('wrapperInputCariPeminjam');
  const cardSelected = document.getElementById('cardPeminjamTerpilih');
  const dropdown = document.getElementById('dropdownHasilPeminjam');

  if (inputHidden) inputHidden.value = member.id;
  if (inputType) inputType.value = member.type;
  if (selectSiswa) selectSiswa.value = member.id;

  const elNama = document.getElementById('namaPeminjamTerpilih');
  const elDetail = document.getElementById('detailPeminjamTerpilih');
  const elBadge = document.getElementById('badgeRolePeminjamTerpilih');
  const elAvatar = document.getElementById('avatarPeminjamTerpilih');

  if (elNama) elNama.textContent = member.nama;
  if (elDetail) elDetail.innerHTML = member.detail;
  if (elBadge) {
    elBadge.textContent = member.badge;
    elBadge.className = member.type === 'guru'
      ? 'rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800'
      : 'rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-navy';
  }
  if (elAvatar) {
    elAvatar.textContent = member.nama ? member.nama.substring(0, 2).toUpperCase() : 'AG';
    elAvatar.className = `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${member.type === 'guru' ? 'bg-amber-600' : 'bg-navy'} text-white text-xs font-bold shadow-xs`;
  }

  if (dropdown) dropdown.classList.add('hidden');
  if (wrapperInput) wrapperInput.classList.add('hidden');
  if (cardSelected) cardSelected.classList.remove('hidden');

  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');
  if (submitBtn) {
    submitBtn.disabled = !(state.selectedMember && state.selectedMejaBuku && (Number(state.selectedMejaBuku.stok) || 0) > 0);
  }
}

/**
 * Mereset anggota yang dipilih
 */
export function clearSelectedMember() {
  state.selectedMember = null;
  const inputHidden = document.getElementById('inputSelectedMemberId');
  const inputType = document.getElementById('inputSelectedMemberType');
  const selectSiswa = document.getElementById('selectMejaSiswa');
  const inputSearch = document.getElementById('inputCariPeminjam');
  const btnClear = document.getElementById('btnClearCariPeminjam');
  const wrapperInput = document.getElementById('wrapperInputCariPeminjam');
  const cardSelected = document.getElementById('cardPeminjamTerpilih');
  const submitBtn = document.getElementById('btnSubmitMejaWalkIn');

  if (inputHidden) inputHidden.value = '';
  if (inputType) inputType.value = '';
  if (selectSiswa) selectSiswa.value = '';
  if (inputSearch) inputSearch.value = '';
  if (btnClear) btnClear.classList.add('hidden');

  if (cardSelected) cardSelected.classList.add('hidden');
  if (wrapperInput) wrapperInput.classList.remove('hidden');
  if (inputSearch) inputSearch.focus();

  if (submitBtn) submitBtn.disabled = true;
}

/**
 * Berpindah sub-meja sirkulasi ('prapinjam' | 'walkin' | 'dipinjam')
 */
export function switchSirkulasiSubtab(subtabKey) {
  state.activeSirkulasiSubtab = subtabKey;

  const subtabs = [
    { id: 'subTabBtnPrapinjam', panelId: 'subPanelPrapinjam', key: 'prapinjam' },
    { id: 'subTabBtnWalkIn', panelId: 'subPanelWalkIn', key: 'walkin' },
    { id: 'subTabBtnDipinjam', panelId: 'subPanelDipinjam', key: 'dipinjam' }
  ];

  subtabs.forEach(item => {
    const btn = document.getElementById(item.id);
    const panel = document.getElementById(item.panelId);

    if (btn && panel) {
      if (item.key === subtabKey) {
        btn.className = 'subtab-sirkulasi-btn flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-navy shadow-xs';
        panel.classList.remove('hidden');
      } else {
        btn.className = 'subtab-sirkulasi-btn flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition text-slate-600 hover:text-navy';
        panel.classList.add('hidden');
      }
    }
  });

  renderSirkulasi();
}

/**
 * Merender seluruh komponen meja sirkulasi
 */
export function renderSirkulasi() {
  renderMejaDropdowns();
  renderPrapinjamOnlyTable();
  renderDipinjamOnlyTable();
}

/**
 * Mengisi dropdown pilihan siswa, guru, dan buku di form Walk-In
 */
export function renderMejaDropdowns() {
  const selectSiswa = document.getElementById('selectMejaSiswa');
  if (selectSiswa) {
    const currentVal = selectSiswa.value;
    let opts = '<option value="">-- Cari / Pilih Siswa atau Guru --</option>';
    (state.cache.siswa || []).forEach(s => {
      opts += `<option value="${s.nisn_siswa}">[Siswa] ${s.nama_siswa} (${s.nisn_siswa} &bull; ${s.kelas})</option>`;
    });
    (state.cache.guru || []).forEach(g => {
      opts += `<option value="${g.nip_guru}">[Guru] ${g.nama_guru} (${g.nip_guru} &bull; ${g.mata_pelajaran || 'Pengajar'})</option>`;
    });
    selectSiswa.innerHTML = opts;
    if (currentVal) selectSiswa.value = currentVal;
  }

  const selectBuku = document.getElementById('selectMejaBuku');
  if (selectBuku && state.cache.buku) {
    const currentVal = selectBuku.value;
    let opts = '<option value="">-- Atau Pilih Judul dari Daftar Koleksi Tersedia --</option>';
    const availableBooks = state.cache.buku.filter(b => (Number(b.stok) || 0) > 0);
    availableBooks.forEach(b => {
      opts += `<option value="${b.id_buku}">${b.id_buku} &bull; ${b.judul_buku} (Stok: ${b.stok} | Rak: ${b.keterangan || '-'})</option>`;
    });
    selectBuku.innerHTML = opts;
    if (currentVal) selectBuku.value = currentVal;
  }
}

/**
 * Merender tabel antrean prapinjam daring (Status 'Menunggu')
 */
export function renderPrapinjamOnlyTable() {
  const tbody = document.getElementById('tablePrapinjamOnlyBody');
  const badgeSubtab = document.getElementById('badgeSubtabPrapinjam');
  const countDisplay = document.getElementById('countPrapinjamDisplay');
  const badgePendingSidebar = document.getElementById('badgePendingCount');
  if (!tbody) return;

  let pendingList = state.cache.peminjaman.filter(p => p.status === 'Menunggu');

  if (badgeSubtab) badgeSubtab.textContent = pendingList.length;
  if (countDisplay) countDisplay.textContent = `${pendingList.length} Buku`;
  if (badgePendingSidebar) badgePendingSidebar.textContent = pendingList.length;

  if (state.searchPrapinjamQuery) {
    const q = state.searchPrapinjamQuery;
    pendingList = pendingList.filter(p => {
      const borrower = getBorrowerInfo(p.nisn_siswa);
      const buku = state.cache.buku.find(b => b.id_buku === p.id_buku);

      const matchId = (p.id_peminjaman || '').toLowerCase().includes(q);
      const matchNisn = (p.nisn_siswa || '').toLowerCase().includes(q);
      const matchNama = (borrower.nama || '').toLowerCase().includes(q);
      const matchJudul = buku && (buku.judul_buku || '').toLowerCase().includes(q);

      return matchId || matchNisn || matchNama || matchJudul;
    });
  }

  if (pendingList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-check-circle text-3xl text-emerald-500 inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-700">Tidak ada antrean prapinjam yang menunggu.</p>
          <p class="text-[11px] text-slate-400">Semua siswa/guru yang memesan online telah mengambil buku fisik mereka.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  pendingList.forEach(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = state.cache.buku.find(b => b.id_buku === item.id_buku);

    const namaSiswa = borrower.nama;
    const kelasSiswa = borrower.sub;
    const kontakSiswa = borrower.kontak;
    const judulBuku = buku ? buku.judul_buku : item.id_buku;
    const penulisBuku = buku ? buku.penulis : '-';
    const rakBuku = buku ? (buku.keterangan || 'Rak Umum') : '-';
    const sisaStok = buku ? buku.stok : 0;
    const coverUrl = buku && buku.cover_url ? buku.cover_url : null;

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-navy text-xs">
          ${item.id_peminjaman}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-800 text-xs">${namaSiswa}</span>
            <span class="rounded-full ${borrower.type === 'guru' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-navy'} px-1.5 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
          </div>
          <p class="text-[11px] text-slate-500">${kelasSiswa}</p>
          <p class="text-[10px] text-slate-400">Kontak: ${kontakSiswa}</p>
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-11 w-8 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-800 text-xs line-clamp-1">${judulBuku}</p>
              <p class="text-[11px] text-slate-500">${penulisBuku} &bull; <span class="text-navy font-bold">${rakBuku}</span></p>
              <p class="text-[10px] text-slate-400">Stok Tersedia: <strong class="text-slate-700">${sisaStok}</strong></p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-xs">
          <p class="text-slate-600">Booking: ${formatTanggalIndo(item.tanggal_pinjam)}</p>
          <p class="text-[11px] font-bold text-amber-700">Tempo: ${formatTanggalIndo(item.batas_kembali)}</p>
        </td>
        <td class="px-5 py-3">
          <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-600"></span> Menunggu Penyerahan
          </span>
        </td>
        <td class="px-5 py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" data-action="reject-loan" data-id="${item.id_peminjaman}"
              title="Batalkan booking (siswa tidak kunjung datang)"
              class="btn-reject-loan inline-flex items-center justify-center h-8 w-8 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
              <i class="ph ph-trash text-base"></i>
            </button>
            <button type="button" data-action="approve-loan" data-id="${item.id_peminjaman}"
              class="btn-approve-loan inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-light transition shadow-sm">
              <i class="ph ph-check-circle text-base"></i>
              <span>Serahkan Buku</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  tbody.querySelectorAll('.btn-approve-loan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleApprovePrapinjam(id);
    });
  });

  tbody.querySelectorAll('.btn-reject-loan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRejectPrapinjam(id);
    });
  });
}

/**
 * Merender tabel koleksi yang saat ini berstatus 'Dipinjam'
 */
export function renderDipinjamOnlyTable() {
  const tbody = document.getElementById('tableDipinjamOnlyBody');
  const badgeSubtab = document.getElementById('badgeSubtabDipinjam');
  const countDisplay = document.getElementById('countBukuDipinjamDisplay');
  const badgeActiveBorrow = document.getElementById('badgeActiveBorrowCount');
  if (!tbody) return;

  let dipinjamList = state.cache.peminjaman.filter(p => p.status === 'Dipinjam');

  if (badgeSubtab) badgeSubtab.textContent = dipinjamList.length;
  if (countDisplay) countDisplay.textContent = `${dipinjamList.length} Buku`;
  if (badgeActiveBorrow) badgeActiveBorrow.textContent = dipinjamList.length;

  if (state.searchDipinjamQuery) {
    const q = state.searchDipinjamQuery;
    dipinjamList = dipinjamList.filter(p => {
      const borrower = getBorrowerInfo(p.nisn_siswa);
      const buku = state.cache.buku.find(b => b.id_buku === p.id_buku);

      const matchId = (p.id_peminjaman || '').toLowerCase().includes(q);
      const matchNisn = (p.nisn_siswa || '').toLowerCase().includes(q);
      const matchNama = (borrower.nama || '').toLowerCase().includes(q);
      const matchJudul = buku && (buku.judul_buku || '').toLowerCase().includes(q);

      return matchId || matchNisn || matchNama || matchJudul;
    });
  }

  if (dipinjamList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-10 text-center text-slate-400">
          <i class="ph ph-book-open text-3xl inline-block mb-1"></i>
          <p class="text-xs font-semibold text-slate-600">Tidak ada buku yang sedang dipinjam.</p>
          <p class="text-[11px] text-slate-400">Seluruh koleksi perpustakaan saat ini berada di rak inventaris.</p>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  dipinjamList.forEach(item => {
    const borrower = getBorrowerInfo(item.nisn_siswa);
    const buku = state.cache.buku.find(b => b.id_buku === item.id_buku);

    const namaSiswa = borrower.nama;
    const kelasSiswa = borrower.sub;
    const judulBuku = buku ? buku.judul_buku : item.id_buku;
    const penulisBuku = buku ? buku.penulis : '-';
    const coverUrl = buku && buku.cover_url ? buku.cover_url : null;
    const metode = item.metode_peminjaman === 'Pra Pinjam' ? 'Pra-Pinjam Online' : 'Walk-In Meja';

    rowsHtml += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-navy text-xs">
          ${item.id_peminjaman}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-800 text-xs">${namaSiswa}</span>
            <span class="rounded-full ${borrower.type === 'guru' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-navy'} px-1.5 py-0.2 text-[9px] font-bold">${borrower.badge}</span>
          </div>
          <p class="text-[11px] text-slate-500">${kelasSiswa}</p>
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="h-11 w-8 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              ${coverUrl ? `<img src="${coverUrl}" class="h-full w-full object-cover" alt="Cover" />` : '<i class="ph ph-book text-base"></i>'}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-800 text-xs line-clamp-1">${judulBuku}</p>
              <p class="text-[11px] text-slate-500">${penulisBuku}</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-xs">
          <p class="text-slate-600">Dipinjam: ${formatTanggalIndo(item.tanggal_pinjam)}</p>
          <p class="text-[11px] font-bold text-amber-700">Tempo: ${formatTanggalIndo(item.batas_kembali)}</p>
        </td>
        <td class="px-5 py-3">
          <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">${metode}</span>
          <span class="block mt-0.5 text-[10px] font-bold text-emerald-600">&bull; Aktif Dipinjam</span>
        </td>
        <td class="px-5 py-3 text-right">
          <button type="button" data-action="direct-return" data-id="${item.id_peminjaman}"
            class="btn-direct-return inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs">
            <i class="ph ph-arrow-u-up-left"></i>
            <span>Proses Kembali</span>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  tbody.querySelectorAll('.btn-direct-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (window.switchTab) window.switchTab('pengembalian');
      const select = document.getElementById('selectPeminjamanPengembalian');
      if (select) {
        select.value = id;
        select.dispatchEvent(new Event('change'));
      }
    });
  });
}

/**
 * Menyetujui prapinjam dan menyerahkan buku kepada peminjam
 */
export async function handleApprovePrapinjam(idPeminjaman) {
  const loan = state.cache.peminjaman.find(p => p.id_peminjaman === idPeminjaman);
  if (!loan) {
    showToast('Data peminjaman tidak ditemukan.', 'error');
    return;
  }

  const buku = state.cache.buku.find(b => b.id_buku === loan.id_buku);
  const stokSekarang = buku ? (Number(buku.stok) || 0) : 0;

  if (stokSekarang <= 0) {
    showToast('Stok buku fisik telah habis! Tidak dapat menyerahkan buku.', 'error');
    return;
  }

  try {
    showToast('Memproses penyerahan buku...', 'info');

    const { error: errLoan } = await db
      .from('data_peminjaman')
      .update({ status: 'Dipinjam' })
      .eq('id_peminjaman', idPeminjaman);
    if (errLoan) throw errLoan;

    const stokBaru = Math.max(0, stokSekarang - 1);
    const statusBaruBuku = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

    const { error: errBook } = await db
      .from('data_buku')
      .update({
        stok: stokBaru,
        status: statusBaruBuku
      })
      .eq('id_buku', loan.id_buku);
    if (errBook) throw errBook;

    showToast(`Buku berhasil diserahkan! Status peminjaman aktif (${idPeminjaman}).`, 'success');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal menyetujui peminjaman:', err);
    showToast('Gagal memproses penyerahan buku: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Membatalkan antrean prapinjam (jika siswa tidak datang)
 */
export async function handleRejectPrapinjam(idPeminjaman) {
  const loan = state.cache.peminjaman.find(p => p.id_peminjaman === idPeminjaman);
  if (!loan) return;

  const konfirmasi = confirm(`Batalkan antrean booking pra-pinjam [${idPeminjaman}]?\n\nPeringatan: Permohonan akan dihapus dan stok buku tetap aman untuk siswa lain.`);
  if (!konfirmasi) return;

  try {
    showToast('Membatalkan pemesanan pra-pinjam...', 'info');
    const { error } = await db
      .from('data_peminjaman')
      .delete()
      .eq('id_peminjaman', idPeminjaman);

    if (error) throw error;

    showToast(`Permohonan ${idPeminjaman} berhasil dibatalkan.`, 'success');
    if (window.fetchAllData) await window.fetchAllData();
  } catch (err) {
    console.error('Gagal membatalkan pra-pinjam:', err);
    showToast('Gagal membatalkan pra-pinjam: ' + (err.message || 'Error Supabase'), 'error');
  }
}

/**
 * Modal Walk-In Direct Peminjaman (Legacy form fallback)
 */
export function setupWalkInModal() {
  const modal = document.getElementById('modalWalkIn');
  const content = document.getElementById('modalWalkInContent');
  const closeBtn = document.getElementById('btnCloseWalkInModal');
  const cancelBtn = document.getElementById('btnCancelWalkInModal');
  const form = document.getElementById('formWalkIn');

  function closeWalkInModal() {
    hideModal(modal, content);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeWalkInModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeWalkInModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeWalkInModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nisn = document.getElementById('selectWalkInSiswa').value;
      const idBuku = document.getElementById('selectWalkInBuku').value;
      const tglPinjam = document.getElementById('inputWalkInTanggalPinjam').value;
      const batasKembali = document.getElementById('inputWalkInBatasKembali').value;
      const metodeRadio = form.querySelector('input[name="walkInMetode"]:checked');
      const metode = metodeRadio ? metodeRadio.value : 'Scan QR';

      if (!nisn || !idBuku || !tglPinjam || !batasKembali) {
        showToast('Harap lengkapi semua isian formulir peminjaman.', 'warning');
        return;
      }

      const book = state.cache.buku.find(b => b.id_buku === idBuku);
      if (!book || (Number(book.stok) || 0) <= 0) {
        showToast('Buku yang dipilih tidak memiliki stok fisik tersedia.', 'error');
        return;
      }

      try {
        const submitBtn = document.getElementById('btnSubmitWalkIn');
        if (submitBtn) submitBtn.disabled = true;

        const newIdPeminjaman = generateRandomId('PJ', 6);

        const { error: errLoan } = await db
          .from('data_peminjaman')
          .insert({
            id_peminjaman: newIdPeminjaman,
            nisn_siswa: nisn,
            id_buku: idBuku,
            tanggal_pinjam: tglPinjam,
            batas_kembali: batasKembali,
            metode_peminjaman: metode,
            status: 'Dipinjam'
          });
        if (errLoan) throw errLoan;

        const stokBaru = Math.max(0, (Number(book.stok) || 1) - 1);
        const statusBaru = stokBaru === 0 ? 'Dipinjam' : 'Tersedia';

        const { error: errBook } = await db
          .from('data_buku')
          .update({ stok: stokBaru, status: statusBaru })
          .eq('id_buku', idBuku);
        if (errBook) throw errBook;

        showToast(`Peminjaman walk-in berhasil diterbitkan (${newIdPeminjaman})!`, 'success');
        closeWalkInModal();
        if (window.fetchAllData) await window.fetchAllData();
      } catch (err) {
        console.error('Gagal menerbitkan peminjaman langsung:', err);
        showToast('Gagal menerbitkan peminjaman: ' + (err.message || 'Error Supabase'), 'error');
      } finally {
        const submitBtn = document.getElementById('btnSubmitWalkIn');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

/**
 * Membuka modal peminjaman langsung (legacy fallback)
 */
export function openWalkInModal() {
  const modal = document.getElementById('modalWalkIn');
  const content = document.getElementById('modalWalkInContent');
  if (!modal) return;

  const selectSiswa = document.getElementById('selectWalkInSiswa');
  if (selectSiswa) {
    let optionsHtml = '<option value="">-- Pilih Siswa atau Guru --</option>';
    (state.cache.siswa || []).forEach(s => {
      optionsHtml += `<option value="${s.nisn_siswa}">[Siswa] ${s.nama_siswa} (${s.nisn_siswa} &bull; ${s.kelas})</option>`;
    });
    (state.cache.guru || []).forEach(g => {
      optionsHtml += `<option value="${g.nip_guru}">[Guru] ${g.nama_guru} (${g.nip_guru} &bull; ${g.mata_pelajaran || 'Pengajar'})</option>`;
    });
    selectSiswa.innerHTML = optionsHtml;
  }

  const selectBuku = document.getElementById('selectWalkInBuku');
  if (selectBuku) {
    let optionsHtml = '<option value="">-- Pilih Buku Tersedia --</option>';
    const availableBooks = state.cache.buku.filter(b => (Number(b.stok) || 0) > 0);
    availableBooks.forEach(b => {
      optionsHtml += `<option value="${b.id_buku}">${b.judul_buku} (Stok: ${b.stok} | Rak: ${b.keterangan || '-'})</option>`;
    });
    selectBuku.innerHTML = optionsHtml;
  }

  const today = getTodayDateString();
  const inputTglPinjam = document.getElementById('inputWalkInTanggalPinjam');
  const inputBatasKembali = document.getElementById('inputWalkInBatasKembali');
  if (inputTglPinjam) inputTglPinjam.value = today;
  if (inputBatasKembali) inputBatasKembali.value = addDaysToDate(today, 7);

  showModal(modal, content);
}
