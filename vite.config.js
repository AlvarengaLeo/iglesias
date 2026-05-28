import { defineConfig } from 'vite';

// Phase 0 Vite config — keeps the existing classic-script HTML working as-is.
// The current entry points (Sistema de Iglesia.html, Sistema de Iglesia-print.html)
// load React via local UMD scripts (react.js, react-dom.js). Vite serves them as
// static assets; no transformation needed yet. JSX bundling kicks in during Fase 4
// when we add src/main.jsx as a <script type="module">.

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    open: '/Sistema de Iglesia.html',
  },
  build: {
    rollupOptions: {
      input: {
        main: 'Sistema de Iglesia.html',
        print: 'Sistema de Iglesia-print.html',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Phase 4+ will add @vitejs/plugin-react and src/ aliases
});
