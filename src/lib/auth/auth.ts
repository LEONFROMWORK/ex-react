import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' as const },
  secret: process.env.AUTH_SECRET,
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth(authOptions)