import CredentialsProvider from 'next-auth/providers/credentials'
import NextAuth from 'next-auth'
import { type NextAuthConfig } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/types/user'

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials.password !== 'string') return null

        const email = credentials.email
        const password = credentials.password

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !(await bcrypt.compare(password, user.password))) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
        session.user.role = (token.role as UserRole) ?? 'ADMIN'
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { auth } = NextAuth(authOptions)

