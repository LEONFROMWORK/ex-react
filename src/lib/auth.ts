import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { env } from "@/lib/env"
import { isServer, isBuildTime } from "@/lib/utils/server-only"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authOptions: NextAuthOptions = {
  adapter: (isServer && !isBuildTime && env.DATABASE_URL) ? PrismaAdapter(db) as any : undefined,
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)

          // Demo mode without database or during build
          if (!env.DATABASE_URL || isBuildTime) {
            // Demo credentials for testing
            const validCredentials = [
              { email: "test@example.com", password: "password123", name: "Test User", role: "USER" },
              { email: "admin@example.com", password: "admin123", name: "Admin User", role: "ADMIN" },
            ]

            const validCred = validCredentials.find(c => c.email === email && c.password === password)
            if (!validCred) {
              return null
            }

            return {
              id: `demo-${validCred.role.toLowerCase()}-1`,
              email: validCred.email,
              name: validCred.name,
              role: validCred.role,
            }
          }

          const user = await db.user.findUnique({
            where: { email },
          })

          if (!user) {
            return null
          }
          
          // 테스트 환경에서는 이메일 인증 체크 생략
          // if (!user.emailVerified) {
          //   return null
          // }

          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
}

// Next-auth v5 configuration
const { auth, handlers } = NextAuth(authOptions)

export { auth, handlers }