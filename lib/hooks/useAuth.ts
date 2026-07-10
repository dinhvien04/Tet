import { signOut as nextAuthSignOut, useSession } from 'next-auth/react'
import { purgeServiceWorkersAndCaches } from '@/lib/service-worker'

export function useAuth() {
  const { data: session, status } = useSession()

  const signOut = async () => {
    await purgeServiceWorkersAndCaches()
    await nextAuthSignOut({ callbackUrl: '/login' })
  }

  const authenticated = status === 'authenticated' && Boolean(session?.user?.id)

  return {
    user: authenticated ? session?.user : null,
    isAuthenticated: authenticated,
    isLoading: status === 'loading',
    session: authenticated ? session : null,
    signOut,
  }
}
