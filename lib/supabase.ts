/**
 * @deprecated Supabase has been removed. App uses MongoDB + NextAuth.
 * This stub exists only so residual imports fail loudly at runtime.
 */

function removed(): never {
  throw new Error(
    'Supabase is no longer used. Use MongoDB models and NextAuth instead.'
  )
}

export const supabase = new Proxy(
  {},
  {
    get: () => removed,
  }
)

export function createClient(): never {
  return removed()
}
