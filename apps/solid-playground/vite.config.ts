import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/dac/playground/',
  server: {
    port: 5174,
    hmr: { port: 5174 }
  },
  build: {
    target: 'esnext',
  },
});
