import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/Features': path.resolve(__dirname, './src/Features'),
      '@/Common': path.resolve(__dirname, './src/Common'),
      '@/Infrastructure': path.resolve(__dirname, './src/Infrastructure'),
      '@/Host': path.resolve(__dirname, './src/Host'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
})