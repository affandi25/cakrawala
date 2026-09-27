import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  envDir: resolve(__dirname, '.'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:         resolve(__dirname, 'public/index.html'),
        login:        resolve(__dirname, 'public/login.html'),
        admin:        resolve(__dirname, 'public/admin/dashboard.html'),
        'siswa-guru': resolve(__dirname, 'public/siswa-guru/dashboard.html'),
        petugas:      resolve(__dirname, 'public/petugas/dashboard.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true
  }
});
