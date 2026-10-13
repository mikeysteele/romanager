import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'src',
  plugins: [],
  resolve: {
    alias: {
      '@repo/shared': resolve(__dirname, '../../packages/shared/mod.ts'),
      '@repo/ui-components': resolve(__dirname, '../../packages/ui-components/mod.ts'),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['../..'],
    },
    proxy: {
      '/api/events': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, _req, res) => {
            proxyRes.on("close", () => {
              if (proxyRes.errored && !res.closed) {
                console.warn(`SSE closed, destroying client response`);
                res.destroy(proxyRes.errored);
              }
            });
          });
        },
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
