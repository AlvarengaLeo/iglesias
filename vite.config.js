import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Entry principal: index.html via Vite + React + ESM.
// Entry secundario: Sistema de Iglesia-print.html (página separada para PDF stacked
// que sigue usando classic scripts UMD desde /react.js, /react-dom.js, /components.js,
// /screens/*.js, /app-print.js — funcionará hasta que migremos también el print).
//
// NOTA: forzamos resolve.alias react → node_modules/react para que el nuevo entry
// NO confunda el react.js UMD del root con la versión ESM de npm.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react:       resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // Forzar el pre-bundling desde node_modules
    include: ['react', 'react-dom', 'react-dom/client', '@supabase/supabase-js'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal.html'),
        print:  resolve(__dirname, 'Sistema de Iglesia-print.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
