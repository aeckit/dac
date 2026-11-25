import { defineConfig } from 'vite';
import solidPlugin from '@solidjs/vite-plugin';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/dac/',
  resolve: {
    alias: {
      'solid-js/web': '@solidjs/web',
    },
  },
  server: {
    port: 5174,
    hmr: { port: 5174 }
  },
  build: {
    target: 'esnext',
  },
});
