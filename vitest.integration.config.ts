import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Integration tests against production services + real Mongo when available.
 * No mocked RateLimit/admin as "integration".
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/bau-cua-service.integration.test.ts',
      'tests/account-delete-service.integration.test.ts',
      'tests/bau-cua-mongo.integration.test.ts',
      'tests/account-delete-mongo.integration.test.ts',
      'tests/end-to-end-integration.test.ts',
      'tests/mongo-transaction-unit.test.ts',
    ],
    exclude: ['tests/legacy-supabase/**', 'node_modules/**'],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
