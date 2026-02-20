import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { verifyPassword } from '@/lib/auth'
import { getDefaultRoleForEmail } from '@/lib/system-admin'

async function resolveAndSyncRole(email?: string | null) {
  if (!email) {
    return { id: '', role: 'user' as const }
  }

  await connectDB()

  const normalizedEmail = email.toLowerCase()
  const dbUser = await User.findOne({ email: normalizedEmail }).select('_id email role')

  if (!dbUser) {
    return {
      id: '',
      role: getDefaultRoleForEmail(normalizedEmail),
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
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email va mat khau la bat buoc')
        }

        await connectDB()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
        if (!user) {
          throw new Error('Email hoac mat khau khong dung')
        }

        if (user.provider !== 'credentials' || !user.password) {
          throw new Error('Tai khoan nay dang ky bang Google. Vui long dang nhap bang Google.')
        }

        const isValid = await verifyPassword(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Email hoac mat khau khong dung')
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
    async signIn({ user, profile }) {
      if (profile && user.email) {
        await connectDB()

        const normalizedEmail = user.email.toLowerCase()
        const existingUser = await User.findOne({ email: normalizedEmail })

        if (!existingUser) {
          const role = getDefaultRoleForEmail(normalizedEmail)
          await User.create({
            email: normalizedEmail,
            name: user.name || profile.name,
            avatar: user.image || (profile as any).picture,
            provider: 'google',
            role,
          })
        } else if (existingUser.provider === 'credentials') {
          return false
        } else {
          const resolvedRole = existingUser.role || getDefaultRoleForEmail(existingUser.email)
          if (existingUser.role !== resolvedRole) {
            existingUser.role = resolvedRole
            await existingUser.save()
          }
        }
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || token.id
        token.role = user.role || token.role
      }

      if (token.email) {
        const resolvedUser = await resolveAndSyncRole(token.email)

        if (resolvedUser.id) {
          token.id = resolvedUser.id
        }

        token.role = resolvedUser.role
      } else if (!token.role) {
        token.role = 'user'
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || ''
        session.user.role = (token.role as 'user' | 'admin') || 'user'
      }

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
