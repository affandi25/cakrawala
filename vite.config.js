import fs from 'fs';
import path from 'path';
import { resolve } from 'path';
import { defineConfig } from 'vite';

/**
 * Plugin untuk mendukung partisi HTML modular (<include src="./components/..." />)
 */
function htmlIncludePlugin() {
  const processHtml = (html, baseDir) => {
    const regex = /<(?:include|load)\s+(?:src=)?['"]([^'"]+)['"]\s*(?:\/>|><\/(?:include|load)>)/gi;
    return html.replace(regex, (match, src) => {
      const filePath = path.resolve(baseDir, src);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return processHtml(fileContent, path.dirname(filePath));
      }
      console.warn(`[html-include] File komponen tidak ditemukan: ${filePath}`);
      return match;
    });
  };

  return {
    name: 'vite-plugin-html-include',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const htmlDir = ctx.filename
          ? path.dirname(ctx.filename)
          : path.resolve(__dirname, 'public', (ctx.path ? path.dirname(ctx.path.replace(/^\//, '')) : ''));
        return processHtml(html, htmlDir);
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html')) {
        server.ws.send({
          type: 'full-reload'
        });
      }
    },
    writeBundle(options) {
      const outputDir = options.dir || resolve(__dirname, 'dist');
      const source = path.resolve(__dirname, 'public/.well-known/security.txt');

      // Berkas security.txt bersifat opsional: lewati saja bila belum ada
      // agar build tidak gagal hanya karena berkas tersebut belum dibuat.
      if (!fs.existsSync(source)) {
        console.warn('[well-known] public/.well-known/security.txt tidak ditemukan, dilewati.');
        return;
      }

      const targetDir = path.join(outputDir, '.well-known');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(source, path.join(targetDir, 'security.txt'));
    }
  };
}

export default defineConfig({
  root: 'public',
  envDir: resolve(__dirname, '.'),
  plugins: [
    htmlIncludePlugin()
  ],
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
