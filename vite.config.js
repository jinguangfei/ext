import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import manifest from './src/manifest.js'
import path from 'path'

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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@components': path.resolve(__dirname, './src/components'),
        '@api': path.resolve(__dirname, './src/api'),
      },
    },
    plugins: [UnoCSS(), crx({ manifest }), vue()],
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
