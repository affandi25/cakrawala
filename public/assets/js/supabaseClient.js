/**
 * CAKRAWALA Digital Library - Supabase Client Configuration
 * Kredensial dibaca dari environment variables (Vite .env lokal / Vercel Environment Variables).
 *
 * Setup lokal  : Salin .env.example → .env, lalu isi nilainya
 * Setup Vercel : Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di Settings → Environment Variables
 *
 * Setiap permintaan membawa header `x-session-token` (token sesi dari login_user) agar
 * kebijakan RLS di database dapat mengenali peran pemanggil.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

export const SESSION_TOKEN_KEY = 'cakrawala_token';

export function getStoredToken() {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch (_) {
    return '';
  }
}

function fetchWithSession(input, init = {}) {
  const token = getStoredToken();
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set('x-session-token', token);
  return fetch(input, { ...init, headers });
}

/**
 * Mencabut token sesi di server (best-effort). keepalive menjaga permintaan tetap
 * terkirim walau halaman langsung berpindah setelah logout.
 */
export function revokeServerSession() {
  const token = getStoredToken();
  if (!token || !SUPABASE_URL) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/logout_user`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-session-token': token
      },
      body: '{}'
    }).catch(() => {});
  } catch (_) { /* logout lokal tetap berjalan */ }
}

let client = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchWithSession }
  });
} else {
  // Fallback jika dipanggil di luar browser atau script CDN belum selesai
  client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
      delete: () => Promise.resolve({ error: null })
    }),
    rpc: async () => ({ data: null, error: new Error('Supabase tidak tersedia') })
  };
}

export const db = client;
