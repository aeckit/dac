import { defineConfig } from 'vitest/config';
import path from 'path';
import babel from '@babel/core';
import solidPreset from 'babel-preset-solid';
import tsPreset from '@babel/preset-typescript';

function solidTransformPlugin() {
  return {
    name: 'solid-transform',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      if (/\.[jt]sx$/.test(id)) {
        const result = await babel.transformAsync(code, {
          filename: id,
          presets: [
            [tsPreset],
            [solidPreset, { generate: 'dom', hydratable: false }]
          ],
        });
        return { code: result?.code || '', map: result?.map };
      }
    },
  };
}

export default defineConfig({
  plugins: [solidTransformPlugin()],
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
      '@aeckit/dac-schema': path.resolve(__dirname, './packages/schema/src/index.ts'),
      '@aeckit/dac-json-builder': path.resolve(__dirname, './packages/json-builder/src/index.ts'),
      '@aeckit/dac-json-solver': path.resolve(__dirname, './packages/json-solver/src/index.ts'),
      '@aeckit/dac-renderer-svg': path.resolve(__dirname, './packages/renderer-svg/src/index.ts'),
      '@aeckit/dac-solid': path.resolve(__dirname, './packages/dac-solid/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, './packages/ui-components/src/index.ts'),
    },
  },
});
