import { signOut as nextAuthSignOut, useSession } from 'next-auth/react'

export function useAuth() {
  const { data: session, status } = useSession()

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/login' })
  }

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    session,
    signOut,
  }
}
