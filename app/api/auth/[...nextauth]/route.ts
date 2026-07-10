import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { verifyPassword } from '@/lib/auth'
import { getDefaultRoleForEmail } from '@/lib/system-admin'

function requireAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.trim() === '' || secret.includes('change-in-production')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET is required in production')
    }
    // Dev-only placeholder so local can boot; never used as production fallback
    console.warn('[auth] NEXTAUTH_SECRET missing or insecure; set a strong secret before production')
    return secret || 'dev-only-insecure-secret'
  }
  return secret
}

async function resolveAndSyncRole(email?: string | null) {
  if (!email) {
    return {
      id: '',
      role: 'user' as const,
      sessionVersion: 0,
      status: 'active' as const,
      valid: false,
    }
  }

  await connectDB()

  const normalizedEmail = email.toLowerCase()
  const dbUser = await User.findOne({ email: normalizedEmail }).select(
    '_id email role status sessionVersion'
  )

  if (!dbUser) {
    return {
      id: '',
      role: 'user' as const,
      sessionVersion: 0,
      status: 'deleted' as const,
      valid: false,
    }
  }

  if (dbUser.status && dbUser.status !== 'active') {
    return {
      id: '',
      role: 'user' as const,
      sessionVersion: dbUser.sessionVersion ?? 0,
      status: dbUser.status,
      valid: false,
    }
  }

  const resolvedRole = dbUser.role || getDefaultRoleForEmail(dbUser.email)

  if (dbUser.role !== resolvedRole) {
    dbUser.role = resolvedRole
    await dbUser.save()
  }

  return {
    id: dbUser._id.toString(),
    role: resolvedRole,
    sessionVersion: dbUser.sessionVersion ?? 0,
    status: (dbUser.status || 'active') as 'active',
    valid: true,
  }
}

export const authOptions: NextAuthOptions = {
  // JWT strategy: Mongoose User is the single source of truth (no MongoDBAdapter)
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email và mật khẩu là bắt buộc')
        }

        await connectDB()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
        if (!user) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }

        if (user.status && user.status !== 'active') {
          throw new Error('Tài khoản đã bị vô hiệu hóa')
        }

        if (user.provider !== 'credentials' || !user.password) {
          throw new Error('Tài khoản này đăng ký bằng Google. Vui lòng đăng nhập bằng Google.')
        }

        const isValid = await verifyPassword(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }

        const resolvedRole = user.role || getDefaultRoleForEmail(user.email)
        if (user.role !== resolvedRole) {
          user.role = resolvedRole
          await user.save()
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: resolvedRole,
          sessionVersion: user.sessionVersion ?? 0,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials already validated in authorize
      if (account?.provider === 'credentials') {
        return true
      }

      if (account?.provider === 'google' && user.email) {
        await connectDB()

        const normalizedEmail = user.email.toLowerCase()
        const existingUser = await User.findOne({ email: normalizedEmail })

        if (!existingUser) {
          const role = getDefaultRoleForEmail(normalizedEmail)
          await User.create({
            email: normalizedEmail,
            name: user.name || (profile as { name?: string })?.name || normalizedEmail.split('@')[0],
            avatar: user.image || (profile as { picture?: string })?.picture,
            provider: 'google',
            role,
            status: 'active',
            sessionVersion: 0,
          })
          return true
        }

        if (existingUser.status && existingUser.status !== 'active') {
          return false
        }

        // Prevent account takeover: credentials account cannot sign in via Google
        if (existingUser.provider === 'credentials') {
          return false
        }

        // Update profile fields for returning Google users
        const resolvedRole = existingUser.role || getDefaultRoleForEmail(existingUser.email)
        let dirty = false
        if (existingUser.role !== resolvedRole) {
          existingUser.role = resolvedRole
          dirty = true
        }
        if (user.name && existingUser.name !== user.name) {
          existingUser.name = user.name
          dirty = true
        }
        if (user.image && existingUser.avatar !== user.image) {
          existingUser.avatar = user.image
          dirty = true
        }
        if (dirty) {
          await existingUser.save()
        }

        return true
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || token.id
        token.role = user.role || token.role
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? token.sessionVersion ?? 0
      }

      if (token.email) {
        const resolvedUser = await resolveAndSyncRole(token.email)

        if (!resolvedUser.valid) {
          token.id = ''
          token.role = 'user'
          token.sessionVersion = -1
          return token
        }

        // Reject JWT if sessionVersion was bumped (e.g. account deleted / force logout)
        if (
          typeof token.sessionVersion === 'number' &&
          token.sessionVersion >= 0 &&
          token.sessionVersion !== resolvedUser.sessionVersion
        ) {
          token.id = ''
          token.role = 'user'
          token.sessionVersion = -1
          return token
        }

        token.id = resolvedUser.id
        token.role = resolvedUser.role
        token.sessionVersion = resolvedUser.sessionVersion
      } else if (!token.role) {
        token.role = 'user'
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (!token.id || token.sessionVersion === -1) {
          session.user.id = ''
          session.user.role = 'user'
        } else {
          session.user.id = (token.id as string) || ''
          session.user.role = (token.role as 'user' | 'admin') || 'user'
        }
      }

      return session
    },
  },
  secret: requireAuthSecret(),
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
