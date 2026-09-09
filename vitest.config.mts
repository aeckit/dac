import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@dac/schema': path.resolve(__dirname, './packages/schema/src/index.ts'),
      '@dac/json-builder': path.resolve(__dirname, './packages/json-builder/src/index.ts'),
      '@dac/json-solver': path.resolve(__dirname, './packages/json-solver/src/index.ts'),
      '@dac/renderer-svg': path.resolve(__dirname, './packages/renderer-svg/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, './packages/ui-components/src/index.ts'),
    },
  },
});
