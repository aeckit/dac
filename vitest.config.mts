import { defineConfig } from 'vitest/config';
import path from 'path';
import solidPlugin from '@solidjs/vite-plugin';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    globals: true,
    server: {
      deps: {
        inline: [/solid-js/],
      },
    },
  },
  resolve: {
    conditions: ['browser', 'development'],
    alias: {
      'solid-js/web': '@solidjs/web',
      '@aeckit/dac-schema': path.resolve(import.meta.dirname, './packages/schema/src/index.ts'),
      '@aeckit/dac-json-builder': path.resolve(import.meta.dirname, './packages/json-builder/src/index.ts'),
      '@aeckit/dac-json-solver': path.resolve(import.meta.dirname, './packages/json-solver/src/index.ts'),
      '@aeckit/dac-renderer-svg': path.resolve(import.meta.dirname, './packages/renderer-svg/src/index.ts'),
      '@aeckit/dac-solid': path.resolve(import.meta.dirname, './packages/dac-solid/src/index.ts'),
      '@aeckit/ui-components': path.resolve(import.meta.dirname, './packages/ui-components/src/index.ts'),
    },
  },
});
