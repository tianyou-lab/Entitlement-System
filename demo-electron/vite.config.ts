import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
    rollupOptions: { input: 'index.html' },
  },
});
