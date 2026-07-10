import { defineConfig } from 'vitest/config'
import path from 'path'

/** Explicit runner for archived Supabase-era tests (not part of CI gate). */
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/legacy-supabase/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
