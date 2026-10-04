import { defineConfig } from 'npm:vite@^5.0.0';
import deno from 'npm:@deno/vite-plugin@^1.0.0';

export default defineConfig({
  root: 'src',
  plugins: [
    deno(),
  ],
  resolve: {
    
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      }
    }
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
        }
      },
       '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
});
