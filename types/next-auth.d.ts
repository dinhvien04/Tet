import 'next-auth'
import 'next-auth/jwt'
import type { UserRole } from '@/lib/system-admin'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: UserRole
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: UserRole
  }
}
