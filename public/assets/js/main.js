import { db } from './supabaseClient.js';

if (window.AOS) {
  AOS.init({ once: true, offset: 60 });
}

var bookData = {};
var rawBooks = [];
var rawCategories = [];
var activeBookId = null;

var modal = document.querySelector('#modal-buku');

// ========================================================
// 1. MANAJEMEN MODAL & PRA-PINJAM
// ========================================================
function showModal() {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

function closeBookModal() {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

function openDetailModal(bukuId) {
  var book = bookData[bukuId];
  if (!book) return;
  activeBookId = bukuId;

  document.querySelector('#modalCover').src = book.cover;
  document.querySelector('#modalCover').alt = 'Cover ' + book.title;
  document.querySelector('#modalTitle').textContent = book.title;
  document.querySelector('#modalPublisher').textContent = 'Penerbit: ' + book.publisher;
  document.querySelector('#modalYear').textContent = 'Tahun: ' + book.year;
  document.querySelector('#modalCategory').textContent = 'Kategori: ' + book.category;
  document.querySelector('#modalLocation').textContent = book.location;
  document.querySelector('#modalDescription').textContent = book.description;
  document.querySelector('#modalStatus').textContent = book.status;
  document.querySelector('#modalStatus').className = book.available
    ? 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700'
    : 'inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700';

  var borrowBtn = document.querySelector('#modalBorrowButton');
  borrowBtn.disabled = !book.available;
  borrowBtn.classList.toggle('opacity-50', !book.available);
  borrowBtn.classList.toggle('cursor-not-allowed', !book.available);

  showModal();
}

function openPinjamModal(bukuId) {
  var book = bookData[bukuId];
  if (!book || !book.available) return;
  activeBookId = bukuId;

  var userSessionRaw = sessionStorage.getItem('cakrawala_user') || sessionStorage.getItem('cakrawala_logged_in');
  if (!userSessionRaw) {
    window.location.href = 'login.html?buku_id=' + encodeURIComponent(bukuId);
    return;
  }

  // Jika sudah login, tentukan redirect berdasarkan role
  var userRole = 'siswa';
  try {
    var parsed = JSON.parse(userSessionRaw);
    if (parsed && parsed.role) userRole = parsed.role.toLowerCase();
  } catch (e) {
    userRole = String(userSessionRaw).toLowerCase();
  }

  if (userRole === 'petugas') {
    window.location.href = 'petugas/dashboard.html';
  } else if (userRole === 'admin') {
    window.location.href = 'admin/dashboard.html';
  } else {
    window.location.href = 'siswa-guru/dashboard.html?action=pinjam&buku_id=' + encodeURIComponent(bukuId);
  }
}

function praPinjam(bukuId) {
  openPinjamModal(bukuId);
}

// ========================================================
// 2. SUPABASE FETCH: PENGUMUMAN
// ========================================================
async function loadPengumuman() {
  var container = document.getElementById('announcementGrid');
  if (!container) return;

  try {
    const { data, error } = await db
      .from('data_pengumuman')
      .select('*')
      .order('id_pengumuman', { ascending: true });

    if (error) throw error;

    container.innerHTML = data.map(function (item) {
      return `
        <article class="group relative flex-shrink-0 w-[380px] sm:w-[480px] h-[220px] snap-start overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 flex">
          <div class="relative w-40 sm:w-48 h-full flex-shrink-0 overflow-hidden bg-slate-900">
            <img 
              src="${item.gambar_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}" 
              alt="Poster ${item.judul}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent flex flex-col justify-between p-3.5">
              <span class="w-fit rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/20">
                ${item.kategori}
              </span>
              <div class="text-white">
                <p class="text-[9px] uppercase font-bold text-blue-200 tracking-wider">Tanggal</p>
                <p class="text-[11px] font-semibold leading-tight flex items-center gap-1 mt-0.5">
                  <i class="ph ph-calendar-blank text-xs"></i>
                  ${item.tanggal_event}
                </p>
              </div>
            </div>
          </div>

          <div class="flex-1 p-5 flex flex-col justify-between bg-white">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pengumuman Resmi</p>
              <h3 class="mt-1 text-base sm:text-lg font-bold text-slate-900 group-hover:text-navy transition-colors line-clamp-2 leading-snug">
                ${item.judul}
              </h3>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <a 
                href="${item.link_detail || '#'}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-blue-600 transition-colors"
              >
                <span>Buka Informasi</span>
                <i class="ph ph-arrow-right text-sm transition-transform group-hover:translate-x-1"></i>
              </a>
              <span class="rounded-full bg-slate-100 p-1.5 text-slate-400 group-hover:bg-blue-50 group-hover:text-navy transition-colors">
                <i class="ph ph-megaphone-simple text-sm"></i>
              </span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (window.AOS) AOS.refresh();
  } catch (err) {
    console.error('Error memuat pengumuman Supabase:', err);
  }
}

function scrollAnnouncement(direction) {
  var container = document.getElementById('announcementGrid');
  if (!container) return;
  var scrollAmount = 450;
  container.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  });
}

// ========================================================
// 3. TEMPLATE KARTU BUKU HORIZONTAL MODERN (SESUAI GAMBAR)
// ========================================================
function createBookHorizontalCard(buku) {
  var isTersedia = buku.status === 'Tersedia' && parseInt(buku.stok) > 0;
  return `
    <div class="book-horizontal-card flex-none w-[240px] sm:w-[270px] snap-start" onclick="openDetailModal('${buku.id_buku}')">
      <!-- Cover Buku -->
      <div class="cover-box">
        <img 
          src="${buku.cover_url || ''}" 
          alt="${buku.judul_buku}" 
          class="h-full w-full object-cover"
          onerror="this.onerror=null;this.src='https://placehold.co/300x450/000C4F/FFFFFF?text=No+Cover';"
          loading="lazy"
        />
      </div>

      <!-- Keterangan Samping -->
      <div class="flex flex-1 flex-col justify-center min-w-0 pr-1">
        <h4 class="text-sm font-extrabold text-navy leading-snug line-clamp-2 hover:underline">
          ${buku.judul_buku}
        </h4>
        <p class="mt-1 text-xs text-slate-500 line-clamp-1">
          ${buku.penulis}
        </p>
        <p class="mt-1 text-xs text-slate-500 line-clamp-1">
          Stok: ${buku.stok}
        </p>

        <div class="mt-2.5">
          <span class="inline-flex items-center gap-1 rounded-full ${isTersedia ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'} px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
            <i class="ph-fill ${isTersedia ? 'ph-bookmark-simple' : 'ph-clock'} text-[11px]"></i>
            ${isTersedia ? 'Tersedia' : 'Dipinjam'}
          </span>
        </div>
      </div>
    </div>
  `;
}

function scrollRow(elementId, direction) {
  var container = document.getElementById(elementId);
  if (!container) return;
  var distance = 300;
  container.scrollBy({
    left: direction === 'left' ? -distance : distance,
    behavior: 'smooth'
  });
}

function filterByCategory(namaKategori) {
  var catalogSearch = document.getElementById('catalogSearch');
  if (catalogSearch) {
    catalogSearch.value = namaKategori;
    catalogSearch.dispatchEvent(new Event('input'));
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
  }
}

// ========================================================
// 4. SUPABASE FETCH: KATALOG BUKU & RENDERING KATEGORI
// ========================================================
async function loadKatalog() {
  try {
    const { data: categories } = await db
      .from('data_kategori')
      .select('*')
      .order('id_kategori', { ascending: true });
    rawCategories = categories || [];

    const { data: books, error } = await db
      .from('data_buku')
      .select('*, data_kategori(nama_kategori)')
      .order('judul_buku', { ascending: true });

    if (error) throw error;
    rawBooks = books || [];

    // Perbarui Statistik Header
    var totalBuku = rawBooks.length;
    var totalTersedia = rawBooks.filter(function (b) {
      return b.status === 'Tersedia' && parseInt(b.stok) > 0;
    }).length;
    var totalKat = rawCategories.length;

    var statKoleksiEl = document.getElementById('statTotalKoleksi');
    var statTersediaEl = document.getElementById('statTersedia');
    var statKategoriEl = document.getElementById('statKategori');

    if (statKoleksiEl) statKoleksiEl.textContent = totalBuku;
    if (statTersediaEl) statTersediaEl.textContent = totalTersedia;
    if (statKategoriEl) statKategoriEl.textContent = totalKat;

    bookData = {};
    rawBooks.forEach(function (buku) {
      var isTersedia = buku.status === 'Tersedia' && parseInt(buku.stok) > 0;
      var kategoriNama = buku.data_kategori ? buku.data_kategori.nama_kategori : 'Umum';

      bookData[buku.id_buku] = {
        title: buku.judul_buku,
        cover: buku.cover_url || 'https://placehold.co/300x450/000C4F/FFFFFF?text=No+Cover',
        publisher: buku.penerbit,
        year: buku.tahun_terbit,
        category: kategoriNama,
        description: buku.keterangan || 'Tidak ada deskripsi tambahan.',
        location: buku.keterangan || 'Lokasi Belum Diset',
        status: '● ' + buku.status,
        available: isTersedia
      };
    });

    renderShelfView();
    initSearchEvents();
  } catch (err) {
    console.error('Error memuat katalog Supabase:', err);
  }
}

function renderShelfView() {
  var shelfContainer = document.getElementById('shelfContainer');
  var searchResultsGrid = document.getElementById('searchResultsGrid');
  var emptyState = document.getElementById('emptyState');
  var searchStatus = document.getElementById('search-status');

  if (!shelfContainer) return;

  if (searchStatus) searchStatus.classList.add('hidden');
  if (searchResultsGrid) searchResultsGrid.classList.add('hidden');
  shelfContainer.classList.remove('hidden');
  shelfContainer.innerHTML = '';

  if (rawBooks.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  rawCategories.forEach(function (cat) {
    var booksInCat = rawBooks.filter(function (b) {
      return b.id_kategori === cat.id_kategori;
    });

    if (booksInCat.length === 0) return;

    var rowId = 'row-' + cat.id_kategori;
    var rowCard = document.createElement('div');
    rowCard.className = 'catalog-row-card p-5';
    rowCard.setAttribute('data-aos', 'fade-up');
    rowCard.innerHTML = `
      <!-- Header Baris Kategori -->
      <div class="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-navy font-bold">
            <i class="ph-fill ph-book-open text-base"></i>
          </div>
          <h3 class="text-base font-extrabold text-navy tracking-tight">${cat.nama_kategori}</h3>
          <span class="text-xs text-slate-400 font-medium">(${booksInCat.length} koleksi)</span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Tombol Navigasi Geser -->
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="scrollRow('${rowId}', 'left')" class="cat-nav-btn text-xs active:scale-95" aria-label="Geser kiri">
              <i class="ph ph-caret-left font-bold"></i>
            </button>
            <button type="button" onclick="scrollRow('${rowId}', 'right')" class="cat-nav-btn text-xs active:scale-95" aria-label="Geser kanan">
              <i class="ph ph-caret-right font-bold"></i>
            </button>
          </div>

          <!-- Tautan Lihat Semua -->
          <button type="button" onclick="filterByCategory('${cat.nama_kategori}')" class="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-blue-700 transition">
            <span>Lihat semua</span>
            <i class="ph ph-arrow-right text-xs font-bold"></i>
          </button>
        </div>
      </div>

      <!-- Deretan Kartu Buku Horizontal -->
      <div id="${rowId}" class="flex gap-4 overflow-x-auto pb-1 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar">
        ${booksInCat.map(function (b) { return createBookHorizontalCard(b); }).join('')}
      </div>
    `;

    shelfContainer.appendChild(rowCard);
  });

  if (window.AOS) AOS.refresh();
}

// ========================================================
// 5. SEARCH & FILTERING (TOGGLE KATEGORI VS GRID HASIL)
// ========================================================
function initSearchEvents() {
  var heroSearch = document.getElementById('searchInput');
  var catalogSearch = document.getElementById('catalogSearch');
  var shelfContainer = document.getElementById('shelfContainer');
  var searchResultsGrid = document.getElementById('searchResultsGrid');
  var emptyState = document.getElementById('emptyState');
  var searchStatus = document.getElementById('search-status');
  var searchStatusText = document.getElementById('search-status-text');
  var resetSearchBtn = document.getElementById('reset-search');

  function executeSearch(query) {
    var term = (query || '').toLowerCase().trim();

    if (!term) {
      renderShelfView();
      return;
    }

    var filtered = rawBooks.filter(function (buku) {
      var titleMatch = (buku.judul_buku || '').toLowerCase().indexOf(term) !== -1;
      var authorMatch = (buku.penulis || '').toLowerCase().indexOf(term) !== -1;
      var catMatch = (buku.data_kategori?.nama_kategori || '').toLowerCase().indexOf(term) !== -1;
      var locMatch = (buku.keterangan || '').toLowerCase().indexOf(term) !== -1;
      return titleMatch || authorMatch || catMatch || locMatch;
    });

    if (shelfContainer) shelfContainer.classList.add('hidden');
    if (searchStatus) {
      searchStatus.classList.remove('hidden');
      searchStatus.classList.add('flex');
    }
    if (searchStatusText) {
      searchStatusText.textContent = 'Menampilkan ' + filtered.length + ' buku untuk: "' + query.trim() + '"';
    }

    if (filtered.length === 0) {
      if (searchResultsGrid) searchResultsGrid.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.textContent = 'Buku tidak ditemukan. Coba gunakan kata kunci lain.';
      }
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      if (searchResultsGrid) {
        searchResultsGrid.classList.remove('hidden');
        searchResultsGrid.innerHTML = filtered.map(function (b) { return createBookHorizontalCard(b); }).join('');
      }
    }
  }

  var clearSearchBtn = document.getElementById('btnClearCatalogSearch');

  function updateClearBtnVisibility(val) {
    if (!clearSearchBtn) return;
    if (val && val.trim().length > 0) {
      clearSearchBtn.classList.remove('hidden');
      clearSearchBtn.classList.add('flex');
    } else {
      clearSearchBtn.classList.add('hidden');
      clearSearchBtn.classList.remove('flex');
    }
  }

  function syncSearchInput(val) {
    if (heroSearch && heroSearch.value !== val) heroSearch.value = val;
    if (catalogSearch && catalogSearch.value !== val) catalogSearch.value = val;
    updateClearBtnVisibility(val);
    executeSearch(val);
  }

  if (catalogSearch) {
    catalogSearch.addEventListener('input', function (e) {
      syncSearchInput(e.target.value);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', function () {
      syncSearchInput('');
      if (catalogSearch) catalogSearch.focus();
    });
  }

  if (heroSearch) {
    heroSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        syncSearchInput(heroSearch.value);
        document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
    heroSearch.addEventListener('input', function (e) {
      syncSearchInput(e.target.value);
    });
  }

  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', function () {
      syncSearchInput('');
    });
  }
}

// ========================================================
// 6. EVENT LISTENER GLOBAL
// ========================================================
document.addEventListener('DOMContentLoaded', function () {
  loadPengumuman();
  loadKatalog();

  document.querySelector('#closeModal')?.addEventListener('click', closeBookModal);
  document.querySelector('#modalBorrowButton')?.addEventListener('click', function () {
    openPinjamModal(activeBookId);
  });

  modal?.addEventListener('click', function (event) {
    if (event.target === modal) closeBookModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal?.classList.contains('hidden')) {
      closeBookModal();
    }
  });

  // Inisialisasi Fitur Interaktif Responsif (Mobile Nav & Back to Top)
  initResponsiveInteractiveUI();
});

function handleNavbarScroll() {
  var navbar = document.getElementById('mainNavbar');
  var pengumumanSection = document.getElementById('pengumuman');
  if (!navbar) return;

  if (pengumumanSection) {
    var rect = pengumumanSection.getBoundingClientRect();
    if (rect.top <= 70) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  } else {
    if (window.scrollY > 300) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  }
}

function initResponsiveInteractiveUI() {
  // 1. Mobile Menu Toggle & Dropdown Drawer
  var btnToggleNavMenu = document.getElementById('btnToggleNavMenu');
  var mobileNavMenu = document.getElementById('mobileNavMenu');
  var iconNavMenu = document.getElementById('iconNavMenu');

  if (btnToggleNavMenu && mobileNavMenu) {
    btnToggleNavMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var isClosed = mobileNavMenu.classList.contains('hidden');
      if (isClosed) {
        mobileNavMenu.classList.remove('hidden');
        if (iconNavMenu) iconNavMenu.className = 'ph ph-x text-xl';
      } else {
        mobileNavMenu.classList.add('hidden');
        if (iconNavMenu) iconNavMenu.className = 'ph ph-list text-xl';
      }
    });

    document.addEventListener('click', function (e) {
      if (!mobileNavMenu.contains(e.target) && !btnToggleNavMenu.contains(e.target)) {
        mobileNavMenu.classList.add('hidden');
        if (iconNavMenu) iconNavMenu.className = 'ph ph-list text-xl';
      }
    });

    var mobileLinks = mobileNavMenu.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNavMenu.classList.add('hidden');
        if (iconNavMenu) iconNavMenu.className = 'ph ph-list text-xl';
      });
    });
  }

  // 2. Floating Scroll to Top Button (CSS di style.css: .btn-scroll-top.visible)
  var btnScrollToTop = document.getElementById('btnScrollToTop');
  if (btnScrollToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 350) {
        btnScrollToTop.classList.add('visible');
      } else {
        btnScrollToTop.classList.remove('visible');
      }
    }, { passive: true });

    btnScrollToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });
window.addEventListener('DOMContentLoaded', handleNavbarScroll);

// Window bindings agar bisa dipanggil dari HTML onclick
window.scrollAnnouncement = scrollAnnouncement;
window.scrollRow = scrollRow;
window.filterByCategory = filterByCategory;
window.openPinjamModal = openPinjamModal;
window.openDetailModal = openDetailModal;
window.praPinjam = praPinjam;
window.closeBookModal = closeBookModal;