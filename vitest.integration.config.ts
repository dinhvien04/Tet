import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Integration / concurrency tests for CI with optional MongoDB replica set.
 * Does NOT include legacy Supabase suites or browser component suites that need happy-dom.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/mongo-transaction-unit.test.ts',
      'tests/admin-invariant.test.ts',
      'tests/rate-limit-concurrency.test.ts',
      'tests/bau-cua-concurrency.test.ts',
      'tests/bau-cua-mongo.integration.test.ts',
      'tests/account-delete-mongo.integration.test.ts',
      'tests/end-to-end-integration.test.ts',
    ],
    exclude: [
      'tests/legacy-supabase/**',
      'node_modules/**',
      '**/*.{tsx}',
    ],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
