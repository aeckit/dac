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
      '@aeckit/dac-schema': path.resolve(__dirname, './packages/schema/src/index.ts'),
      '@aeckit/dac-json-builder': path.resolve(__dirname, './packages/json-builder/src/index.ts'),
      '@aeckit/dac-json-solver': path.resolve(__dirname, './packages/json-solver/src/index.ts'),
      '@aeckit/dac-renderer-svg': path.resolve(__dirname, './packages/renderer-svg/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, './packages/ui-components/src/index.ts'),
    },
  },
});
