import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react'],
        },
        // v6 — force new filenames to bust stale browser caches
        entryFileNames: 'assets/[name]-[hash].v6.js',
        chunkFileNames: 'assets/[name]-[hash].v6.js',
        assetFileNames: 'assets/[name]-[hash].v6[extname]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
