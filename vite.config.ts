import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'write-dev-port',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address()
          if (address && typeof address === 'object') {
            fs.writeFileSync(
              path.resolve(__dirname, 'electron/dev-port'),
              String(address.port),
            )
          }
        })
      },
    },
  ],
  define: {
    __APP_NAME__: JSON.stringify(pkg.name),
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_AUTHOR__: JSON.stringify(pkg.author),
    __APP_DESCRIPTION__: JSON.stringify(pkg.description),
  },
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './assets'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist/react',
    emptyOutDir: true,
  },
})
