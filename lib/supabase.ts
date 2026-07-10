/**
 * Supabase has been removed from the runtime stack (MongoDB + NextAuth).
 * Historical SQL lives under `/supabase` for reference only.
 * Importing this module throws to catch accidental usage.
 */
function removed(): never {
  throw new Error(
    'Supabase is no longer used. Use Mongoose models and NextAuth instead.'
  )
}

export const supabase = new Proxy({} as Record<string, never>, {
  get: () => removed,
})

export function createClient(): never {
  return removed()
}
