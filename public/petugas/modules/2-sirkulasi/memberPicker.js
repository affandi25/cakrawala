/**
 * CAKRAWALA Digital Library - Modul Meja Sirkulasi: Pencarian Anggota (Combobox)
 * File: public/petugas/modules/2-sirkulasi/memberPicker.js
 * 
 * FUNGSI:
 * - Menggabungkan arsip siswa & guru untuk pencarian terpadu
 * - Filter cepat berdasarkan kategori: Semua, Siswa, Guru
 * - Menangani pemilihan dan pembatalan anggota terpilih di Meja Walk-In
 */

import { state } from '../core/state.js';
import { checkMejaBorrowEligibility } from './walkIn.js';

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

  checkMejaBorrowEligibility();
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
  if (submitBtn) submitBtn.disabled = true;
}
