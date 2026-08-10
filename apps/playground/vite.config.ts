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
      '@aeckit/core-solver': path.resolve(__dirname, '../../packages/core-solver/src/index.ts'),
      '@aeckit/ui-components': path.resolve(__dirname, '../../packages/ui-components/src/index.ts')
    }
  },
  optimizeDeps: {
    exclude: ['@aeckit/core-solver', '@aeckit/ui-components']
  }
});
