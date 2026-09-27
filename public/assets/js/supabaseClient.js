/**
 * CAKRAWALA Digital Library - Supabase Client Configuration
 * Kredensial dibaca dari environment variables (Vite .env lokal / Vercel Environment Variables).
 *
 * Setup lokal  : Salin .env.example → .env, lalu isi nilainya
 * Setup Vercel : Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di Settings → Environment Variables
 */

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[CAKRAWALA] Supabase credentials tidak ditemukan.\n' +
    'Salin .env.example → .env dan isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.'
  );
}

// Inisialisasi Supabase client dari CDN (window.supabase)
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pasang ke window.db agar kompatibel dengan seluruh script yang sudah ada
export const db = client;
window.db = client;