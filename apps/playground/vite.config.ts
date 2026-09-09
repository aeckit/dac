import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/dac/',
  plugins: [
    {
      name: 'redirect-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/dac') {
            res.writeHead(301, { Location: '/dac/' });
            res.end();
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@dac/schema': path.resolve(__dirname, '../../packages/schema/src/index.ts'),
      '@dac/json-builder': path.resolve(__dirname, '../../packages/json-builder/src/index.ts'),
      '@dac/json-solver': path.resolve(__dirname, '../../packages/json-solver/src/index.ts'),
      '@dac/renderer-svg': path.resolve(__dirname, '../../packages/renderer-svg/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, '../../packages/ui-components/src/index.ts')
    }
  },
  optimizeDeps: {
    exclude: ['@dac/schema', '@dac/json-builder', '@dac/json-solver', '@dac/renderer-svg', '@aeckit/ui-components']
  }
});
