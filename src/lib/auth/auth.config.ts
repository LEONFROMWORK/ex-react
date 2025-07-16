import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { z } from 'zod'

// 로그인 스키마
const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다')
})

export const authConfig = {
  providers: [
    // 이메일/비밀번호 로그인
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials)
        
        if (!validatedFields.success) {
          return null
        }
        
        const { email, password } = validatedFields.data
        
        // Prisma를 직접 import하면 순환 참조 문제가 발생할 수 있으므로
        // 실제 구현에서는 별도의 auth service를 만들어 사용하는 것을 권장
        const { prisma } = await import('@/lib/prisma')
        
        const user = await prisma.user.findUnique({
          where: { email }
        })
        
        if (!user) {
          return null
        }
        
        const passwordsMatch = await compare(password, user.password)
        
        if (!passwordsMatch) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tokens: user.tokens,
          role: user.role,
          tier: user.tier || 'FREE'
        }
      }
    }),
    
    // Google OAuth (선택사항)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code"
          }
        }
      })
    ] : [])
  ],
  
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/auth/register'
  },
  
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      const isOnAuth = nextUrl.pathname.startsWith('/auth')
      
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      
      return true
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tokens = user.tokens
        token.role = user.role
        token.tier = user.tier
      }
      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.tokens = token.tokens as number
        session.user.role = token.role as string
        session.user.tier = token.tier as string
      }
      return session
    }
  }
} satisfies NextAuthConfig

export default authConfig