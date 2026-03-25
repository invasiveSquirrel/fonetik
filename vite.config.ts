import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5175,
    strictPort: true,
  },
  plugins: [
    react(),
    ...(process.env.SHIPRUM_EMBEDDED === 'true' ? [] : [
      electron([
        {
          // Main process entry file of the Electron App
          entry: 'electron/main.ts',
          onstart(options) {
            options.startup()
          },
          vite: {
            build: {
              rollupOptions: {
                external: [
                  'electron', 
                  'sqlite3', 
                  'fs', 
                  'path', 
                  'child_process', 
                  'module', 
                  'url',
                  'stream',
                  'util',
                  'events',
                  'crypto',
                  'zlib',
                  'buffer',
                  'assert',
                  '@google-cloud/speech', 
                  '@google-cloud/text-to-speech',
                  '@google/generative-ai'
                ],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].js',
                },
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload()
          },
        },
      ]),
      renderer(),
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
