import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import manifest from './src/manifest.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const production = mode === 'production'

  return {
    build: {
      emptyOutDir: true,
      outDir: 'build',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    plugins: [crx({ manifest }), vue()],
    server: {
      port: 5172,
      strictPort: true,
      hmr: {
        port: 5172,
        host: 'localhost',
        clientPort: 5172,
      },
    },
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  }
})
