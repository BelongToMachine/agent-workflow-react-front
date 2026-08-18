import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env.NEXT_PUBLIC_API_MODE': JSON.stringify(env.NEXT_PUBLIC_API_MODE ?? ''),
      'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(env.NEXT_PUBLIC_BASE_PATH ?? ''),
      'process.env.NEXT_PUBLIC_FASTAPI_BASE_URL': JSON.stringify(env.NEXT_PUBLIC_FASTAPI_BASE_URL ?? ''),
      'process.env.NEXT_PUBLIC_USE_FASTAPI_BACKEND': JSON.stringify(env.NEXT_PUBLIC_USE_FASTAPI_BACKEND ?? ''),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  }
})
