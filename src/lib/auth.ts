import CredentialsProvider from 'next-auth/providers/credentials'
import NextAuth from 'next-auth'
import { type NextAuthConfig } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from '@/lib/auth.config'

export const authOptions: NextAuthConfig = {
  ...authConfig,
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
}

export const { auth } = NextAuth(authOptions)
