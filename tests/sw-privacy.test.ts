import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Service Worker privacy', () => {
  it('does not precache /dashboard', () => {
    const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
    expect(sw).not.toMatch(/['"]\/dashboard['"]/)
    expect(sw).not.toMatch(/cache\.put/)
  })

  it('does not cache /api responses', () => {
    const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
    expect(sw).not.toMatch(/pathname\.startsWith\(['"]\/api\//)
    expect(sw.toLowerCase()).toMatch(/unregister|inert|pass-through|do not intercept/i)
  })

  it('registration module purges by default', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/service-worker.ts'), 'utf8')
    expect(src).toMatch(/purgeServiceWorkersAndCaches/)
    expect(src).toMatch(/SW_ENABLED/)
  })
})
