// Test setup file for Vitest
import { beforeAll, afterAll, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Setup environment variables for testing
beforeAll(() => {
  // If still not set after loading .env.local, use defaults
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  }
})

afterEach(() => {
  // Clean up after each test
})

afterAll(() => {
  // Final cleanup
})
