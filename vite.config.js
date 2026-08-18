import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fastApiTarget =
    env.VITE_FASTAPI_URL ||
    env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    env.FASTAPI_BASE_URL ||
    'http://127.0.0.1:8000'
  const workspaceId =
    env.VITE_WORKSPACE_ID ||
    env.NEXT_PUBLIC_WORKSPACE_ID ||
    '00000000-0000-0000-0000-000000000001'

  return {
    define: {
      'process.env.NEXT_PUBLIC_API_MODE': JSON.stringify(env.NEXT_PUBLIC_API_MODE || 'fastapi-proxy'),
      'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(env.NEXT_PUBLIC_BASE_PATH ?? ''),
      'process.env.NEXT_PUBLIC_FASTAPI_BASE_URL': JSON.stringify(fastApiTarget),
      'process.env.NEXT_PUBLIC_WORKSPACE_ID': JSON.stringify(workspaceId),
      'process.env.NEXT_PUBLIC_USE_FASTAPI_BACKEND': JSON.stringify(env.NEXT_PUBLIC_USE_FASTAPI_BACKEND || '1'),
    },
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: fastApiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  }
})
