/**
 * CAKRAWALA Digital Library - Supabase Client Configuration
 * Kredensial dibaca dari environment variables (Vite .env lokal / Vercel Environment Variables).
 *
 * Setup lokal  : Salin .env.example → .env, lalu isi nilainya
 * Setup Vercel : Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di Settings → Environment Variables
 */

const DEFAULT_URL = 'https://agmeuhytgkcbiovgzhwd.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_iTgU8oOpLPSKf7AYhOSL4A_Y1TZu8mg';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

let client = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  // Fallback jika dipanggil di luar browser atau script CDN belum selesai
  client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
      delete: () => Promise.resolve({ error: null })
    })
  };
}

// Pasang ke window.db agar kompatibel dengan seluruh script yang sudah ada
export const db = client;
if (typeof window !== 'undefined') {
  window.db = client;
}