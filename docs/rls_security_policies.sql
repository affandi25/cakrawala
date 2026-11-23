-- ==============================================================================
-- DOKUMENTASI LENGKAP PENGATURAN ROW LEVEL SECURITY (RLS) & POLICY — CAKRAWALA
-- File: docs/rls_security_policies.sql
-- Proyek: CAKRAWALA Digital Library
-- Platform: Supabase Cloud (PostgreSQL 15+)
-- Reference ID: agmeuhytgkcbiovgzhwd
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNGSI RESOLUSI SESI & IDENTITAS PENGGUNA (SCHEMA: app_private)
-- ------------------------------------------------------------------------------

-- 1.1 Ekstraksi token dari header HTTP 'x-session-token'
CREATE OR REPLACE FUNCTION app_private.sesi_token()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT CASE 
    WHEN x.t ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' 
    THEN x.t::uuid 
  END
  FROM (SELECT nullif(current_setting('request.headers', true), '')::json ->> 'x-session-token' AS t) x;
$$;

-- 1.2 Mendapatkan ID Pengguna yang sedang aktif dari tabel data_sesi
CREATE OR REPLACE FUNCTION app_private.sesi_user()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT s.id_user::text 
  FROM public.data_sesi s
  WHERE s.token = app_private.sesi_token() 
    AND s.kedaluwarsa > now();
$$;

-- 1.3 Mendapatkan Role Pengguna yang sah dari data_user
CREATE OR REPLACE FUNCTION app_private.sesi_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT u.role::text 
  FROM public.data_sesi s 
  JOIN public.data_user u ON u.id_user = s.id_user
  WHERE s.token = app_private.sesi_token() 
    AND s.kedaluwarsa > now();
$$;

-- 1.4 Mendapatkan Identitas Anggota (NISN Siswa atau NIP Guru)
CREATE OR REPLACE FUNCTION app_private.ident_saya()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT g.nip_guru::text FROM public.data_guru g WHERE g.id_user = app_private.sesi_user()),
    (SELECT s.nisn_siswa::text FROM public.data_siswa s WHERE s.id_user = app_private.sesi_user())
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. KEBIJAKAN RLS PER TABEL (ROW-LEVEL SECURITY POLICIES)
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 2.1 TABEL data_user
-- ==============================================================================
ALTER TABLE public.data_user ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin bisa lihat semua, Siswa/Guru/Petugas hanya bisa lihat akun sendiri
CREATE POLICY "data_user_select" ON public.data_user
FOR SELECT TO public
USING (
  (app_private.sesi_role() = 'Admin') 
  OR (
    (app_private.sesi_role() IN ('Petugas', 'Siswa', 'Guru')) 
    AND (id_user = app_private.sesi_user())
  )
);

-- INSERT: Hanya Admin yang bisa menambah user baru
CREATE POLICY "data_user_insert" ON public.data_user
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() = 'Admin');

-- UPDATE: Admin bisa ubah semua, pengguna bisa ubah akun sendiri (misal ganti password)
CREATE POLICY "data_user_update" ON public.data_user
FOR UPDATE TO public
USING (
  (app_private.sesi_role() = 'Admin') 
  OR (app_private.sesi_user() IS NOT NULL AND id_user = app_private.sesi_user())
)
WITH CHECK (
  (app_private.sesi_role() = 'Admin') 
  OR (app_private.sesi_user() IS NOT NULL AND id_user = app_private.sesi_user())
);

-- DELETE: Hanya Admin yang bisa menghapus akun
CREATE POLICY "data_user_delete" ON public.data_user
FOR DELETE TO public
USING (app_private.sesi_role() = 'Admin');


-- ==============================================================================
-- 2.2 TABEL data_siswa
-- ==============================================================================
ALTER TABLE public.data_siswa ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin & Petugas bisa lihat semua siswa, Siswa hanya profil miliknya
CREATE POLICY "data_siswa_select" ON public.data_siswa
FOR SELECT TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() = 'Siswa') 
    AND (id_user = app_private.sesi_user() OR nisn_siswa = app_private.ident_saya())
  )
);

-- INSERT: Admin & Petugas
CREATE POLICY "data_siswa_insert" ON public.data_siswa
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- UPDATE: Admin & Petugas bisa edit semua, Siswa hanya profilnya sendiri
CREATE POLICY "data_siswa_update" ON public.data_siswa
FOR UPDATE TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() = 'Siswa') 
    AND (id_user = app_private.sesi_user() OR nisn_siswa = app_private.ident_saya())
  )
)
WITH CHECK (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() = 'Siswa') 
    AND (id_user = app_private.sesi_user() OR nisn_siswa = app_private.ident_saya())
  )
);

-- DELETE: Hanya Admin & Petugas
CREATE POLICY "data_siswa_delete" ON public.data_siswa
FOR DELETE TO public
USING (app_private.sesi_role() IN ('Admin', 'Petugas'));


-- ==============================================================================
-- 2.3 TABEL data_guru (HANYA ADMIN)
-- ==============================================================================
ALTER TABLE public.data_guru ENABLE ROW LEVEL SECURITY;

-- SELECT: Hanya Admin yang bisa melihat data guru
CREATE POLICY "data_guru_select" ON public.data_guru
FOR SELECT TO public
USING (app_private.sesi_role() = 'Admin');

-- INSERT: Hanya Admin yang bisa menambah data guru
CREATE POLICY "data_guru_insert" ON public.data_guru
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() = 'Admin');

-- UPDATE: Hanya Admin yang bisa mengubah data guru
CREATE POLICY "data_guru_update" ON public.data_guru
FOR UPDATE TO public
USING (app_private.sesi_role() = 'Admin')
WITH CHECK (app_private.sesi_role() = 'Admin');

-- DELETE: Hanya Admin yang bisa menghapus data guru
CREATE POLICY "data_guru_delete" ON public.data_guru
FOR DELETE TO public
USING (app_private.sesi_role() = 'Admin');


-- ==============================================================================
-- 2.4 TABEL data_petugas
-- ==============================================================================
ALTER TABLE public.data_petugas ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin & Petugas
CREATE POLICY "data_petugas_select" ON public.data_petugas
FOR SELECT TO public
USING (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- INSERT: Hanya Admin
CREATE POLICY "data_petugas_insert" ON public.data_petugas
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() = 'Admin');

-- UPDATE: Admin bisa ubah semua petugas, Petugas bisa ubah profil miliknya sendiri
CREATE POLICY "data_petugas_update" ON public.data_petugas
FOR UPDATE TO public
USING (
  (app_private.sesi_role() = 'Admin') 
  OR (app_private.sesi_role() = 'Petugas' AND id_user = app_private.sesi_user())
)
WITH CHECK (
  (app_private.sesi_role() = 'Admin') 
  OR (app_private.sesi_role() = 'Petugas' AND id_user = app_private.sesi_user())
);

-- DELETE: Hanya Admin
CREATE POLICY "data_petugas_delete" ON public.data_petugas
FOR DELETE TO public
USING (app_private.sesi_role() = 'Admin');


-- ==============================================================================
-- 2.5 TABEL data_peminjaman
-- ==============================================================================
ALTER TABLE public.data_peminjaman ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin & Petugas lihat semua, Siswa & Guru hanya melihat pinjaman miliknya
CREATE POLICY "data_peminjaman_select" ON public.data_peminjaman
FOR SELECT TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (nisn_siswa = app_private.ident_saya())
  )
);

-- INSERT: Admin & Petugas (Siswa memesan via RPC ajukan_booking)
CREATE POLICY "data_peminjaman_insert" ON public.data_peminjaman
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- UPDATE: Admin & Petugas (Siswa hanya bisa membatalkan saat status 'Menunggu')
CREATE POLICY "data_peminjaman_update" ON public.data_peminjaman
FOR UPDATE TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (nisn_siswa = app_private.ident_saya()) 
    AND (status = 'Menunggu')
  )
)
WITH CHECK (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (nisn_siswa = app_private.ident_saya()) 
    AND (status = 'Menunggu')
  )
);

-- DELETE: Admin & Petugas, atau Siswa/Guru untuk arsip status tertentu
CREATE POLICY "data_peminjaman_delete" ON public.data_peminjaman
FOR DELETE TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (nisn_siswa = app_private.ident_saya()) 
    AND (status IN ('Selesai', 'Kembali', 'Dibatalkan', 'Menunggu'))
  )
);


-- ==============================================================================
-- 2.6 TABEL data_pengembalian
-- ==============================================================================
ALTER TABLE public.data_pengembalian ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin & Petugas lihat semua, Siswa/Guru hanya pengembalian miliknya
CREATE POLICY "data_pengembalian_select" ON public.data_pengembalian
FOR SELECT TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (id_peminjaman IN (SELECT p.id_peminjaman FROM data_peminjaman p WHERE p.nisn_siswa = app_private.ident_saya()))
  )
);

-- INSERT: Admin & Petugas
CREATE POLICY "data_pengembalian_insert" ON public.data_pengembalian
FOR INSERT TO public
WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- UPDATE: Admin & Petugas
CREATE POLICY "data_pengembalian_update" ON public.data_pengembalian
FOR UPDATE TO public
USING (app_private.sesi_role() IN ('Admin', 'Petugas'))
WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- DELETE: Admin & Petugas
CREATE POLICY "data_pengembalian_delete" ON public.data_pengembalian
FOR DELETE TO public
USING (
  (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  OR (
    (app_private.sesi_role() IN ('Siswa', 'Guru')) 
    AND (id_peminjaman IN (SELECT p.id_peminjaman FROM data_peminjaman p WHERE p.nisn_siswa = app_private.ident_saya()))
  )
);


-- ==============================================================================
-- 2.7 TABEL data_buku, data_kategori, data_pengumuman, data_pengaturan
-- ==============================================================================
ALTER TABLE public.data_buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pengaturan ENABLE ROW LEVEL SECURITY;

-- Katalog Buku: Publik boleh baca, hanya Admin/Petugas yang boleh modifikasi
CREATE POLICY "data_buku_select" ON public.data_buku FOR SELECT TO public USING (true);
CREATE POLICY "data_buku_write"  ON public.data_buku FOR ALL TO public 
  USING (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- Kategori: Publik boleh baca, hanya Admin/Petugas yang boleh modifikasi
CREATE POLICY "data_kategori_select" ON public.data_kategori FOR SELECT TO public USING (true);
CREATE POLICY "data_kategori_write"  ON public.data_kategori FOR ALL TO public 
  USING (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- Pengumuman: Publik boleh baca, hanya Admin/Petugas yang boleh modifikasi
CREATE POLICY "data_pengumuman_select" ON public.data_pengumuman FOR SELECT TO public USING (true);
CREATE POLICY "data_pengumuman_write"  ON public.data_pengumuman FOR ALL TO public 
  USING (app_private.sesi_role() IN ('Admin', 'Petugas')) 
  WITH CHECK (app_private.sesi_role() IN ('Admin', 'Petugas'));

-- Pengaturan Tarif Denda: Publik boleh baca, HANYA ADMIN yang boleh ubah
CREATE POLICY "data_pengaturan_select" ON public.data_pengaturan FOR SELECT TO public USING (true);
CREATE POLICY "data_pengaturan_write"  ON public.data_pengaturan FOR ALL TO public 
  USING (app_private.sesi_role() = 'Admin') 
  WITH CHECK (app_private.sesi_role() = 'Admin');


-- ==============================================================================
-- 2.8 TABEL data_sesi (ISOLASI MUTLAK)
-- ==============================================================================
ALTER TABLE public.data_sesi ENABLE ROW LEVEL SECURITY;
-- Catatan: Tanpa ada policy publik yang dibuat (0 policies), tabel token ini
-- secara default TIDAK BISA dibaca atau ditulis oleh siapapun dari luar (anon/public).
-- Hanya fungsi SECURITY DEFINER yang dapat mengakses data_sesi.
