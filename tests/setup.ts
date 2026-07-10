// Test setup for Vitest — MongoDB + NextAuth stack
import { beforeAll, afterEach, afterAll } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'

config({ path: '.env.local' })

beforeAll(() => {
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters-long!!'
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  }
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/tet-connect-test'
  }
})

afterEach(() => {
  // per-test cleanup hooks can go here
})

afterAll(() => {
  // final cleanup
})
