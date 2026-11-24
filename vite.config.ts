import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Accessible depuis un téléphone du même réseau Wi-Fi (tests en local).
    host: true,
    // En développement, l'API Node (server/, port 4000) est jointe via Vite :
    // le front garde des URL relatives (/api, /uploads) comme en production.
    // changeOrigin: false → l'en-tête Host reste celui du navigateur
    // (localhost:5173 ou l'IP du PC), sinon le contrôle d'origine de l'API
    // (anti-CSRF, server/src/security.ts) refuse connexion et envois.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false, xfwd: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: false },
      // Liens courts /i/<code> : redirection faite par l'API (server/src/routes/shortLink.ts).
      '^/i/[A-Za-z0-9]+$': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
});
