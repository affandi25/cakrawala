import { db } from '../assets/js/supabaseClient.js';

// ========================================================
// 1. STATE & AUTENTIKASI ANGGOTA (SISWA / GURU)
// ========================================================
const state = {
  currentUser: null,
  memberProfile: null,
  role: 'Siswa', // 'Siswa' atau 'Guru'
  activeTab: 'overview',
  loans: [],
  katalogBooks: [],
  activeFilter: 'all'
};

// Cek Autentikasi Pengguna
function checkAuth() {
  const userRaw = sessionStorage.getItem('cakrawala_user');
  const isLoggedIn = sessionStorage.getItem('cakrawala_logged_in');

  if (!isLoggedIn || !userRaw) {
    window.location.href = '../login.html';
    return null;
  }

  try {
    const user = JSON.parse(userRaw);
    state.currentUser = user;
    state.role = user.role === 'Guru' ? 'Guru' : 'Siswa';
    return user;
  } catch (e) {
    window.location.href = '../login.html';
    return null;
  }
}

// Inisialisasi DOM Elements
const DOM = {
  // Profil Sidebar & Kartu
  mobileRoleBadge: document.getElementById('mobileRoleBadge'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  sidebarMemberName: document.getElementById('sidebarMemberName'),
  sidebarRolePill: document.getElementById('sidebarRolePill'),
  sidebarIdNumber: document.getElementById('sidebarIdNumber'),
  topGreetingTitle: document.getElementById('topGreetingTitle'),
  topGreetingSubtitle: document.getElementById('topGreetingSubtitle'),
  currentDateDisplay: document.getElementById('currentDateDisplay'),

  // Virtual Card
  cardStatusBadge: document.getElementById('cardStatusBadge'),
  cardSubRoleLabel: document.getElementById('cardSubRoleLabel'),
  cardMemberName: document.getElementById('cardMemberName'),
  cardIdentityNumber: document.getElementById('cardIdentityNumber'),
  cardBarcodeText: document.getElementById('cardBarcodeText'),

  // Stat Counters
  statSedangDipinjam: document.getElementById('statSedangDipinjam'),
  statPraPinjam: document.getElementById('statPraPinjam'),
  statRiwayatSelesai: document.getElementById('statRiwayatSelesai'),
  badgeActiveBorrow: document.getElementById('badgeActiveBorrow'),
  badgeFineWarning: document.getElementById('badgeFineWarning'),

  // Alert Banner Denda
  alertBannerDenda: document.getElementById('alertBannerDenda'),
  bannerNominalDenda: document.getElementById('bannerNominalDenda'),

  // Lists & Grids
  overviewLoansList: document.getElementById('overviewLoansList'),
  myLoansContainer: document.getElementById('myLoansContainer'),
  katalogBooksGrid: document.getElementById('katalogBooksGrid'),
  katalogSearchInput: document.getElementById('katalogSearchInput'),
  btnFilterKatalogAll: document.getElementById('btnFilterKatalogAll'),
  searchMyLoans: document.getElementById('searchMyLoans'),
  historyTableBody: document.getElementById('historyTableBody'),
  riwayatStatusDenda: document.getElementById('riwayatStatusDenda'),
  riwayatTotalDenda: document.getElementById('riwayatTotalDenda'),

  // Modal Pra-Pinjam
  modalPraPinjam: document.getElementById('modalPraPinjam'),
  btnClosePraPinjamModal: document.getElementById('btnClosePraPinjamModal'),
  btnCancelPraPinjam: document.getElementById('btnCancelPraPinjam'),
  formConfirmPraPinjam: document.getElementById('formConfirmPraPinjam'),
  praPinjamCover: document.getElementById('praPinjamCover'),
  praPinjamCategory: document.getElementById('praPinjamCategory'),
  praPinjamTitle: document.getElementById('praPinjamTitle'),
  praPinjamAuthor: document.getElementById('praPinjamAuthor'),
  praPinjamRack: document.getElementById('praPinjamRack'),
  praPinjamBookId: document.getElementById('praPinjamBookId'),
  praPinjamStartDate: document.getElementById('praPinjamStartDate'),
  praPinjamDueDate: document.getElementById('praPinjamDueDate'),

  // Mobile Drawer
  btnToggleMobileSidebar: document.getElementById('btnToggleMobileSidebar'),
  btnCloseMobileSidebar: document.getElementById('btnCloseMobileSidebar'),
  sidebarNav: document.getElementById('sidebarNav'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  btnSidebarLogout: document.getElementById('btnSidebarLogout'),
  btnQuickSearch: document.getElementById('btnQuickSearch'),

  toastContainer: document.getElementById('toastContainer')
};

// ========================================================
// 2. LOAD PROFIL ANGGOTA (SISWA / GURU)
// ========================================================
async function loadMemberProfile() {
  const user = state.currentUser;
  if (!user) return;

  let displayName = user.username || 'Anggota';
  let idNumber = user.id_user || 'MEMBER';
  let roleTitle = state.role === 'Guru' ? 'Pendidik / Guru' : 'Peserta Didik / Siswa';
  let subtitleDetail = '';

  try {
    if (state.role === 'Guru') {
      // Query profil guru
      const { data: guru } = await db
        .from('data_guru')
        .select('*')
        .eq('id_user', user.id_user)
        .maybeSingle();

      if (guru) {
        state.memberProfile = guru;
        displayName = guru.nama_guru || user.username;
        idNumber = guru.nip_guru || user.id_user;
        subtitleDetail = `Mata Pelajaran: ${guru.mata_pelajaran || 'Umum'}`;
      }
    } else {
      // Query profil siswa
      const { data: siswa } = await db
        .from('data_siswa')
        .select('*')
        .eq('id_user', user.id_user)
        .maybeSingle();

      if (siswa) {
        state.memberProfile = siswa;
        displayName = siswa.nama_siswa || user.username;
        idNumber = siswa.nisn_siswa || user.id_user;
        subtitleDetail = `Kelas: ${siswa.kelas || 'Siswa'}`;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat profil spesifik dari database:', err);
  }

  // Update UI Elements
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  if (DOM.sidebarAvatar) DOM.sidebarAvatar.textContent = initials;
  if (DOM.sidebarMemberName) DOM.sidebarMemberName.textContent = displayName;
  if (DOM.sidebarRolePill) DOM.sidebarRolePill.textContent = state.role;
  if (DOM.sidebarIdNumber) DOM.sidebarIdNumber.textContent = idNumber;

  if (DOM.mobileRoleBadge) DOM.mobileRoleBadge.textContent = `Portal ${state.role}`;
  if (DOM.topGreetingTitle) DOM.topGreetingTitle.textContent = `Selamat Datang, ${displayName}`;
  if (DOM.topGreetingSubtitle) {
    DOM.topGreetingSubtitle.textContent = `${roleTitle} | ${idNumber} ${subtitleDetail ? '• ' + subtitleDetail : ''}`;
  }

  // Update Virtual Card
  if (DOM.cardSubRoleLabel) DOM.cardSubRoleLabel.textContent = roleTitle.toUpperCase();
  if (DOM.cardMemberName) DOM.cardMemberName.textContent = displayName;
  if (DOM.cardIdentityNumber) {
    DOM.cardIdentityNumber.textContent = `${state.role === 'Guru' ? 'NIP' : 'NISN'}: ${idNumber}`;
  }
  if (DOM.cardBarcodeText) DOM.cardBarcodeText.textContent = `CKR-${idNumber}`;
}

// ========================================================
// 3. LOAD DATA PEMINJAMAN, DENDA & STATISTIK
// ========================================================
async function loadMemberLoans() {
  const user = state.currentUser;
  const identifier = state.memberProfile
    ? (state.memberProfile.nisn_siswa || state.memberProfile.nip_guru || user.id_user)
    : user.id_user;

  try {
    // 1. Ambil data transaksi peminjaman
    let loansData = [];
    const { data, error } = await db
      .from('data_peminjaman')
      .select('*, data_buku(*)')
      .order('tanggal_pinjam', { ascending: false });

    if (!error && data) {
      // Filter peminjaman milik user ini
      loansData = data.filter(item => {
        return (
          item.nisn_siswa === identifier ||
          item.nisn_siswa === user.id_user ||
          item.nisn_siswa === user.username
        );
      });
    }

    // Fallback data lokal jika database kosong atau offline testing
    if (loansData.length === 0) {
      const localLoansRaw = localStorage.getItem(`cakrawala_loans_${user.id_user}`);
      if (localLoansRaw) {
        try {
          loansData = JSON.parse(localLoansRaw);
        } catch (_) {}
      }
    }

    state.loans = loansData;
    renderLoanStats();
    renderOverviewLoans();
    renderMyLoans();
    checkMemberFines();

  } catch (err) {
    console.error('Error memuat data peminjaman:', err);
    state.loans = [];
    renderLoanStats();
  }
}

// Perhitungan Statistik Peminjaman
function renderLoanStats() {
  const activeLoans = state.loans.filter(l => l.status === 'Dipinjam');
  const praPinjam = state.loans.filter(l => l.status === 'Menunggu');
  const completed = state.loans.filter(l => l.status === 'Selesai');

  if (DOM.statSedangDipinjam) DOM.statSedangDipinjam.textContent = activeLoans.length;
  if (DOM.statPraPinjam) DOM.statPraPinjam.textContent = praPinjam.length;
  if (DOM.statRiwayatSelesai) DOM.statRiwayatSelesai.textContent = completed.length;

  if (DOM.badgeActiveBorrow) {
    if (activeLoans.length > 0) {
      DOM.badgeActiveBorrow.textContent = activeLoans.length;
      DOM.badgeActiveBorrow.classList.remove('hidden');
    } else {
      DOM.badgeActiveBorrow.classList.add('hidden');
    }
  }
}

// Cek Denda Keterlambatan
async function checkMemberFines() {
  let totalDenda = 0;
  let hasUnpaid = false;

  // Cek apakah ada pengembalian yang denda belum lunas
  try {
    const loanIds = state.loans.map(l => l.id_peminjaman);
    if (loanIds.length > 0) {
      const { data: pengembalian } = await db
        .from('data_pengembalian')
        .select('*')
        .in('id_peminjaman', loanIds);

      if (pengembalian) {
        pengembalian.forEach(p => {
          if (p.status_denda === 'Belum Lunas' && parseFloat(p.denda) > 0) {
            totalDenda += parseFloat(p.denda);
            hasUnpaid = true;
          }
        });
      }
    }
  } catch (err) {
    console.warn('Cek denda:', err);
  }

  // Tampilkan Red Alert Banner jika ada denda belum lunas
  if (hasUnpaid && totalDenda > 0) {
    if (DOM.alertBannerDenda) DOM.alertBannerDenda.classList.remove('hidden');
    if (DOM.bannerNominalDenda) {
      DOM.bannerNominalDenda.textContent = `Rp ${totalDenda.toLocaleString('id-ID')}`;
    }
    if (DOM.badgeFineWarning) DOM.badgeFineWarning.classList.remove('hidden');
    if (DOM.riwayatStatusDenda) {
      DOM.riwayatStatusDenda.textContent = 'Ada Denda Belum Lunas';
      DOM.riwayatStatusDenda.className = 'text-lg font-extrabold text-rose-600';
    }
    if (DOM.riwayatTotalDenda) {
      DOM.riwayatTotalDenda.textContent = `Rp ${totalDenda.toLocaleString('id-ID')}`;
      DOM.riwayatTotalDenda.className = 'text-lg font-extrabold text-rose-600 font-mono';
    }
  } else {
    if (DOM.alertBannerDenda) DOM.alertBannerDenda.classList.add('hidden');
    if (DOM.badgeFineWarning) DOM.badgeFineWarning.classList.add('hidden');
    if (DOM.riwayatStatusDenda) {
      DOM.riwayatStatusDenda.textContent = 'Semua Lunas / Bersih';
      DOM.riwayatStatusDenda.className = 'text-lg font-extrabold text-emerald-600';
    }
    if (DOM.riwayatTotalDenda) {
      DOM.riwayatTotalDenda.textContent = 'Rp 0';
      DOM.riwayatTotalDenda.className = 'text-lg font-extrabold text-navy font-mono';
    }
  }
}

// Render Ringkasan di Tab Overview
function renderOverviewLoans() {
  if (!DOM.overviewLoansList) return;

  const activeLoans = state.loans.filter(l => l.status === 'Dipinjam' || l.status === 'Menunggu');

  if (activeLoans.length === 0) {
    DOM.overviewLoansList.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <i class="ph ph-books text-4xl text-slate-300"></i>
        <p class="mt-2 text-xs font-bold text-slate-600">Saat ini Anda tidak memiliki buku yang sedang dipinjam.</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Temukan buku menarik yang ingin Anda baca di katalog sekarang!</p>
        <button type="button" onclick="switchTab('katalog')" class="mt-4 px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-light transition shadow-xs">
          Mulai Pinjam Buku
        </button>
      </div>
    `;
    return;
  }

  DOM.overviewLoansList.innerHTML = activeLoans.map(loan => createLoanCardItem(loan)).join('');
}

// Render Halaman Penuh Tab Peminjaman
function renderMyLoans() {
  if (!DOM.myLoansContainer) return;

  let filtered = state.loans;
  if (state.activeFilter !== 'all') {
    filtered = filtered.filter(l => l.status === state.activeFilter);
  }

  const query = (DOM.searchMyLoans?.value || '').toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(l => {
      const title = (l.data_buku?.judul_buku || l.judul_buku || '').toLowerCase();
      const author = (l.data_buku?.penulis || l.penulis || '').toLowerCase();
      return title.includes(query) || author.includes(query);
    });
  }

  if (filtered.length === 0) {
    DOM.myLoansContainer.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-xs">
        Tidak ada data peminjaman yang cocok dengan filter.
      </div>
    `;
    return;
  }

  DOM.myLoansContainer.innerHTML = filtered.map(loan => createLoanCardItem(loan)).join('');
}

// Template Card Item Peminjaman
function createLoanCardItem(loan) {
  const book = loan.data_buku || {
    judul_buku: loan.judul_buku || 'Buku Perpustakaan',
    penulis: loan.penulis || 'Penulis',
    cover_url: loan.cover_url || 'https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover'
  };

  const isPraPinjam = loan.status === 'Menunggu';
  const isDipinjam = loan.status === 'Dipinjam';

  // Hitung sisa hari jatuh tempo
  let dueBadge = '';
  if (isDipinjam && loan.batas_kembali) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.batas_kembali);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800">
        <i class="ph-fill ph-warning"></i> Terlambat ${Math.abs(diffDays)} Hari
      </span>`;
    } else if (diffDays === 0) {
      dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-100 text-amber-800">
        <i class="ph-fill ph-clock"></i> Jatuh Tempo Hari Ini!
      </span>`;
    } else {
      dueBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-navy">
        <i class="ph ph-calendar"></i> Sisa ${diffDays} Hari
      </span>`;
    }
  }

  const statusBadge = isPraPinjam
    ? '<span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-100 text-amber-800">Pra-Pinjam (Menunggu ACC)</span>'
    : (isDipinjam
      ? '<span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Sedang Dipinjam</span>'
      : '<span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-700">Selesai Kembali</span>');

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 hover:border-navy/30 bg-white transition shadow-xs">
      <div class="flex items-center gap-3.5 min-w-0">
        <img 
          src="${book.cover_url || 'https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover'}" 
          alt="${book.judul_buku}" 
          class="h-16 w-12 flex-shrink-0 rounded-lg object-cover shadow-xs border border-slate-100"
          onerror="this.src='https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover';"
        />
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-navy truncate">${book.judul_buku}</h4>
          <p class="text-[11px] text-slate-500 mt-0.5 truncate">${book.penulis}</p>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            ${statusBadge}
            ${dueBadge}
          </div>
        </div>
      </div>

      <div class="text-right sm:border-l sm:border-slate-100 sm:pl-4 flex sm:flex-col justify-between items-end">
        <div>
          <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Batas Kembali</p>
          <p class="text-xs font-bold font-mono text-slate-800">${loan.batas_kembali || '-'}</p>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Metode: ${loan.metode_peminjaman || 'Pra Pinjam'}</p>
      </div>
    </div>
  `;
}

// ========================================================
// 4. LOAD KATALOG BUKU & PRA-PINJAM CEPAT
// ========================================================
async function loadKatalogBooks() {
  if (!DOM.katalogBooksGrid) return;

  try {
    const { data, error } = await db
      .from('data_buku')
      .select('*, data_kategori(nama_kategori)')
      .order('judul_buku', { ascending: true });

    if (error) throw error;
    state.katalogBooks = data || [];
    renderKatalogGrid(state.katalogBooks);

  } catch (err) {
    console.error('Error memuat katalog buku:', err);
    DOM.katalogBooksGrid.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-400 text-xs">
        Gagal memuat katalog buku perpustakaan. Silakan muat ulang.
      </div>
    `;
  }
}

function renderKatalogGrid(books) {
  if (!DOM.katalogBooksGrid) return;

  if (books.length === 0) {
    DOM.katalogBooksGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 text-xs">
        Buku tidak ditemukan. Coba gunakan kata kunci lain.
      </div>
    `;
    return;
  }

  DOM.katalogBooksGrid.innerHTML = books.map(buku => {
    const isTersedia = buku.status === 'Tersedia' && parseInt(buku.stok) > 0;
    const kategori = buku.data_kategori ? buku.data_kategori.nama_kategori : 'Umum';

    return `
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-navy/40 transition">
        <div class="flex gap-3">
          <img 
            src="${buku.cover_url || 'https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover'}" 
            alt="${buku.judul_buku}" 
            class="h-24 w-16 object-cover rounded-xl shadow-xs flex-shrink-0"
            onerror="this.src='https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover';"
          />
          <div class="min-w-0 flex-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-navy">${kategori}</span>
            <h4 class="mt-1 text-xs font-bold text-navy line-clamp-2 leading-snug">${buku.judul_buku}</h4>
            <p class="text-[11px] text-slate-500 mt-0.5 truncate">${buku.penulis}</p>
            <p class="text-[10px] text-slate-400 mt-1">Stok: ${buku.stok}</p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold ${isTersedia ? 'text-emerald-700' : 'text-amber-700'}">
            <span class="h-1.5 w-1.5 rounded-full ${isTersedia ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            ${isTersedia ? 'Tersedia' : 'Kosong'}
          </span>
          <button 
            type="button" 
            onclick="openPraPinjamModal('${buku.id_buku}')"
            ${!isTersedia ? 'disabled' : ''}
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
              isTersedia 
                ? 'bg-navy text-white hover:bg-navy-light' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }"
          >
            Pra-Pinjam
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// 5. MODAL KONFIRMASI PRA-PINJAM
// ========================================================
window.openPraPinjamModal = async function (idBuku) {
  let book = state.katalogBooks.find(b => b.id_buku === idBuku);

  if (!book) {
    try {
      const { data } = await db.from('data_buku').select('*, data_kategori(nama_kategori)').eq('id_buku', idBuku).maybeSingle();
      if (data) book = data;
    } catch (_) {}
  }

  if (!book) {
    showToast('Data buku tidak ditemukan.', 'error');
    return;
  }

  DOM.praPinjamBookId.value = book.id_buku;
  DOM.praPinjamTitle.textContent = book.judul_buku;
  DOM.praPinjamAuthor.textContent = book.penulis;
  DOM.praPinjamCategory.textContent = book.data_kategori ? book.data_kategori.nama_kategori : 'Koleksi';
  DOM.praPinjamRack.textContent = `Lokasi Rak: ${book.keterangan || 'Sirkulasi Utama'}`;
  DOM.praPinjamCover.src = book.cover_url || 'https://placehold.co/100x150/000C4F/FFFFFF?text=No+Cover';

  // Set default dates
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 7);

  const format = d => d.toISOString().split('T')[0];
  DOM.praPinjamStartDate.value = format(today);
  DOM.praPinjamDueDate.value = format(due);

  // Tampilkan Modal
  DOM.modalPraPinjam.classList.remove('hidden');
  DOM.modalPraPinjam.classList.add('flex');
};

function closePraPinjamModal() {
  DOM.modalPraPinjam.classList.add('hidden');
  DOM.modalPraPinjam.classList.remove('flex');
}

// Handle Form Submit Pra-Pinjam
async function handlePraPinjamSubmit(e) {
  e.preventDefault();
  const bookId = DOM.praPinjamBookId.value;
  const startDate = DOM.praPinjamStartDate.value;
  const dueDate = DOM.praPinjamDueDate.value;
  const user = state.currentUser;

  const identifier = state.memberProfile
    ? (state.memberProfile.nisn_siswa || state.memberProfile.nip_guru || user.id_user)
    : user.id_user;

  const newLoan = {
    id_peminjaman: 'PJ-' + Math.floor(10000 + Math.random() * 90000),
    nisn_siswa: identifier,
    id_buku: bookId,
    tanggal_pinjam: startDate,
    batas_kembali: dueDate,
    metode_peminjaman: 'Pra Pinjam',
    status: 'Menunggu'
  };

  try {
    const { error } = await db.from('data_peminjaman').insert([newLoan]);
    if (error) throw error;
  } catch (err) {
    console.warn('Simpan ke Supabase data_peminjaman:', err);
    // Simpan ke local storage fallback
    const key = `cakrawala_loans_${user.id_user}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const book = state.katalogBooks.find(b => b.id_buku === bookId);
    newLoan.data_buku = book;
    existing.unshift(newLoan);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  closePraPinjamModal();
  showToast('Pengajuan pra-pinjam berhasil dibuat! Silakan ambil buku di perpustakaan.', 'success');
  await loadMemberLoans();
  switchTab('peminjaman');
}

// ========================================================
// 6. TAB SWITCHING SYSTEM
// ========================================================
window.switchTab = function (tabName) {
  state.activeTab = tabName;

  const tabs = ['overview', 'peminjaman', 'katalog', 'riwayat'];
  tabs.forEach(t => {
    const section = document.getElementById(`section${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);

    if (t === tabName) {
      if (section) section.classList.remove('hidden');
      if (btn) {
        btn.classList.add('bg-navy', 'text-white', 'shadow-xs');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
      }
    } else {
      if (section) section.classList.add('hidden');
      if (btn) {
        btn.classList.remove('bg-navy', 'text-white', 'shadow-xs');
        btn.classList.add('text-slate-600', 'hover:bg-slate-100');
      }
    }
  });

  // Tutup sidebar mobile jika terbuka
  closeMobileSidebar();
};

// ========================================================
// 7. TOAST NOTIFICATION & UTILS
// ========================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-navy');
  const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl ${bgClass} text-white text-xs font-bold shadow-lg transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<i class="ph-fill ${icon} text-lg"></i><span>${message}</span>`;

  DOM.toastContainer?.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openMobileSidebar() {
  DOM.sidebarNav?.classList.remove('-translate-x-full');
  DOM.sidebarBackdrop?.classList.remove('hidden');
}

function closeMobileSidebar() {
  DOM.sidebarNav?.classList.add('-translate-x-full');
  DOM.sidebarBackdrop?.classList.add('hidden');
}

// Cek jika ada parameter ?action=pinjam&buku_id=... dari landing page
function checkUrlAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const bukuId = params.get('buku_id');

  if (action === 'pinjam' && bukuId) {
    setTimeout(() => {
      window.openPraPinjamModal(bukuId);
    }, 500);
  }
}

// Update tanggal sekarang
function updateDateDisplay() {
  if (DOM.currentDateDisplay) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDateDisplay.textContent = now.toLocaleDateString('id-ID', options);
  }
}

// ========================================================
// 8. EVENT LISTENERS
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
  const user = checkAuth();
  if (!user) return;

  updateDateDisplay();

  // Tab Buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // Filter Buttons di Tab Peminjaman
  document.querySelectorAll('.filter-peminjaman-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-peminjaman-btn').forEach(b => {
        b.classList.remove('bg-navy', 'text-white');
        b.classList.add('text-slate-600');
      });
      btn.classList.add('bg-navy', 'text-white');
      btn.classList.remove('text-slate-600');
      state.activeFilter = btn.getAttribute('data-filter') || 'all';
      renderMyLoans();
    });
  });

  // Search Input di Tab Peminjaman
  DOM.searchMyLoans?.addEventListener('input', () => {
    renderMyLoans();
  });

  // Search Input di Tab Katalog
  DOM.katalogSearchInput?.addEventListener('input', e => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) {
      renderKatalogGrid(state.katalogBooks);
      return;
    }
    const filtered = state.katalogBooks.filter(b => {
      return (
        (b.judul_buku || '').toLowerCase().includes(q) ||
        (b.penulis || '').toLowerCase().includes(q)
      );
    });
    renderKatalogGrid(filtered);
  });

  DOM.btnFilterKatalogAll?.addEventListener('click', () => {
    if (DOM.katalogSearchInput) DOM.katalogSearchInput.value = '';
    renderKatalogGrid(state.katalogBooks);
  });

  // Quick Search Button di Top Bar
  DOM.btnQuickSearch?.addEventListener('click', () => {
    switchTab('katalog');
    setTimeout(() => DOM.katalogSearchInput?.focus(), 150);
  });

  // Modal Pra-Pinjam Close & Submit
  DOM.btnClosePraPinjamModal?.addEventListener('click', closePraPinjamModal);
  DOM.btnCancelPraPinjam?.addEventListener('click', closePraPinjamModal);
  DOM.formConfirmPraPinjam?.addEventListener('submit', handlePraPinjamSubmit);

  // Mobile Drawer Toggle
  DOM.btnToggleMobileSidebar?.addEventListener('click', openMobileSidebar);
  DOM.btnCloseMobileSidebar?.addEventListener('click', closeMobileSidebar);
  DOM.sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  // Logout
  DOM.btnSidebarLogout?.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin keluar dari akun perpustakaan?')) {
      sessionStorage.removeItem('cakrawala_logged_in');
      sessionStorage.removeItem('cakrawala_user');
      sessionStorage.removeItem('cakrawala_role');
      window.location.href = '../login.html';
    }
  });

  // Load Data
  await loadMemberProfile();
  await loadMemberLoans();
  await loadKatalogBooks();

  checkUrlAction();
});
