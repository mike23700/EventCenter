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
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
