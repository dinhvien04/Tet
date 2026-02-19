import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { verifyPassword } from '@/lib/auth'

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any, // Type compatibility fix for @auth/mongodb-adapter
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email và mật khẩu là bắt buộc')
        }

        await connectDB()

        // Find user by email
        const user = await User.findOne({ email: credentials.email.toLowerCase() })
        
        if (!user) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }

        // Check if user registered with credentials (not OAuth)
        if (user.provider !== 'credentials' || !user.password) {
          throw new Error('Tài khoản này đăng ký bằng Google. Vui lòng đăng nhập bằng Google.')
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.password)
        
        if (!isValid) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days - very long for development
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, profile }) {
      // For Google OAuth, ensure user is created with correct provider
      if (profile && user.email) {
        await connectDB()
        
        const existingUser = await User.findOne({ email: user.email })
        
        if (!existingUser) {
          // Create new user with Google provider
          await User.create({
            email: user.email,
            name: user.name || profile.name,
            avatar: user.image || (profile as any).picture,
            provider: 'google',
          })
        } else if (existingUser.provider === 'credentials') {
          // User exists with credentials, don't allow Google login
          return false
        }
      }
      
      return true
    },
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id
      }
      
      return token
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.id as string
      }
      
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
