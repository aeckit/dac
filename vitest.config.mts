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
      '@aeckit/core-solver': path.resolve(__dirname, './packages/core-solver/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, './packages/ui-components/src/index.ts'),
    },
  },
});
