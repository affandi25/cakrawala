/**
 * CAKRAWALA - Script Benchmark Kecepatan Respon (CLI)
 * Menguji kecepatan respon koneksi, API database Supabase, dan Frontend lokal.
 * 
 * Penggunaan:
 *   npm run test:speed
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

// 1. Muat variabel environment dari .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\x1b[31m[ERROR] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum dikonfigurasi di .env\x1b[0m');
  process.exit(1);
}

// 2. Fungsi pengukur waktu request
async function measureRequest(url, headers = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, { headers });
    const end = performance.now();
    const duration = end - start;
    return {
      ok: res.ok,
      status: res.status,
      time: Math.round(duration),
      error: res.ok ? null : `HTTP ${res.status} ${res.statusText}`
    };
  } catch (err) {
    const end = performance.now();
    return {
      ok: false,
      status: 0,
      time: Math.round(end - start),
      error: err.message
    };
  }
}

// 3. Status Badge berdasarkan milidetik
function getStatusBadge(avgMs) {
  if (avgMs < 300) {
    return '\x1b[32m🟢 Cepat (<300ms)\x1b[0m';
  } else if (avgMs < 600) {
    return '\x1b[33m🟡 Normal (300-600ms)\x1b[0m';
  } else if (avgMs < 1000) {
    return '\x1b[38;5;208m🟠 Cukup (600-1000ms)\x1b[0m';
  } else {
    return '\x1b[31m🔴 Lambat (>1000ms)\x1b[0m';
  }
}

// 4. Daftar Endpoint yang diuji
const TARGET_ENDPOINTS = [
  {
    name: '1. Ping Koneksi (data_pengaturan)',
    url: `${SUPABASE_URL}/rest/v1/data_pengaturan?select=*`,
    desc: 'Waktu jangkauan jaringan ke cloud server Supabase'
  },
  {
    name: '2. Katalog Buku (data_buku)',
    url: `${SUPABASE_URL}/rest/v1/data_buku?select=id_buku,judul_buku&limit=20`,
    desc: 'Query daftar buku perpustakaan'
  },
  {
    name: '3. Kategori Buku (data_kategori)',
    url: `${SUPABASE_URL}/rest/v1/data_kategori?select=*`,
    desc: 'Query referensi kategori koleksi'
  },
  {
    name: '4. Pengumuman (data_pengumuman)',
    url: `${SUPABASE_URL}/rest/v1/data_pengumuman?select=*`,
    desc: 'Query pengumuman perpustakaan'
  },
  {
    name: '5. Data Siswa (data_siswa)',
    url: `${SUPABASE_URL}/rest/v1/data_siswa?select=nisn_siswa,nama_siswa,kelas&limit=20`,
    desc: 'Query data profil siswa'
  },
  {
    name: '6. Data Guru (data_guru)',
    url: `${SUPABASE_URL}/rest/v1/data_guru?select=nip_guru,nama_guru&limit=20`,
    desc: 'Query data guru pengajar'
  },
  {
    name: '7. Frontend Web Lokal (Vite)',
    url: 'http://localhost:5173/',
    desc: 'Kecepatan server pengembangan web lokal',
    isLocal: true
  }
];

// 5. Eksekusi Pengujian
async function runBenchmark() {
  console.log('\n===============================================================');
  console.log('       🚀 CAKRAWALA BENCHMARK KECEPATAN RESPON SISTEM');
  console.log('===============================================================');
  console.log(`Target Cloud   : ${SUPABASE_URL}`);
  console.log(`Jumlah Iterasi : 3x pengambilan sampel per endpoint`);
  console.log(`Waktu Mulai    : ${new Date().toLocaleString('id-ID')}\n`);

  // Warm-up connection (membuka soket TLS & menstabilkan koneksi)
  process.stdout.write('🔌 Melakukan warm-up koneksi internet ke Supabase... ');
  for (let w = 0; w < 2; w++) {
    await measureRequest(`${SUPABASE_URL}/rest/v1/data_pengaturan?select=*`, {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    });
  }
  console.log('\x1b[32mTerhubung & Stabil!\x1b[0m\n');

  const results = [];

  for (const endpoint of TARGET_ENDPOINTS) {
    process.stdout.write(`Sedang menguji: ${endpoint.name.padEnd(38)} ... `);

    const headers = endpoint.isLocal ? {} : {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };

    const times = [];
    let hasError = false;
    let errorMsg = '';

    for (let i = 0; i < 3; i++) {
      const res = await measureRequest(endpoint.url, headers);
      if (!res.ok) {
        hasError = true;
        errorMsg = res.error;
      }
      times.push(res.time);
      await new Promise(r => setTimeout(r, 80));
    }

    if (hasError && endpoint.isLocal) {
      console.log('\x1b[90m(Server Lokal Tidak Aktif)\x1b[0m');
      results.push({
        name: endpoint.name,
        avg: null,
        min: null,
        max: null,
        status: '\x1b[90m⚪ Offline (npm run dev)\x1b[0m'
      });
      continue;
    }

    if (hasError) {
      console.log(`\x1b[31m[GAGAL: ${errorMsg}]\x1b[0m`);
      results.push({
        name: endpoint.name,
        avg: null,
        min: null,
        max: null,
        status: `\x1b[31m❌ Error\x1b[0m`
      });
      continue;
    }

    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

    console.log(`\x1b[36m${avg} ms\x1b[0m`);

    results.push({
      name: endpoint.name,
      min,
      max,
      avg,
      status: getStatusBadge(avg)
    });
  }

  // Tampilkan Tabel Rangkuman
  console.log('\n========================================================================================');
  console.log('| No | Fitur / Titik Pengujian              | Min (ms) | Max (ms) | Rata-rata | Status        |');
  console.log('========================================================================================');

  results.forEach((r, idx) => {
    const no = String(idx + 1).padEnd(2);
    const name = r.name.replace(/^\d+\.\s*/, '').padEnd(36);
    const minStr = r.min !== null ? String(r.min).padStart(8) : '       -';
    const maxStr = r.max !== null ? String(r.max).padStart(8) : '       -';
    const avgStr = r.avg !== null ? `${r.avg} ms`.padStart(9) : '        -';
    const statusStr = r.status.padEnd(20);

    console.log(`| ${no} | ${name} | ${minStr} | ${maxStr} | ${avgStr} | ${statusStr} |`);
  });

  console.log('========================================================================================\n');

  // Evaluasi Keseluruhan
  const validAvgs = results.filter(r => r.avg !== null).map(r => r.avg);
  if (validAvgs.length > 0) {
    const overallAvg = Math.round(validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length);
    console.log(`📊 Rata-rata Respon Keseluruhan Sistem: \x1b[1m${overallAvg} ms\x1b[0m (${getStatusBadge(overallAvg)})`);
    
    if (overallAvg < 500) {
      console.log('✅ Kesimpulan: Performa sistem CAKRAWALA sangat prima dan responsif!');
    } else if (overallAvg < 1000) {
      console.log('ℹ️ Kesimpulan: Performa sistem dalam batas normal untuk infrastruktur cloud.');
    } else {
      console.log('⚠️ Kesimpulan: Ada beberapa query yang memerlukan penambahan indeks database di Supabase.');
    }
  }
  console.log('');
}

runBenchmark();
