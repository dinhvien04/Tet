import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Default quality-gate config.
 * - Excludes archived Supabase-era tests
 * - Excludes heavy UI/property/integration suites from default CI
 * Use: npm run test:legacy / test:integration / test:property for those.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/legacy-supabase/**',
      '**/*integration*',
      '**/*.property.test.*',
      '**/video-*',
      // Component suites (*.test.tsx) are not in include pattern
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
