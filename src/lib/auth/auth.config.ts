import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'

export const authConfig = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    
    // Kakao OAuth
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    })
  ],
  
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
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
    
    async jwt({ token, user, account }) {
      // 관리자 이메일 확인
      const adminEmail = process.env.ADMIN_EMAIL
      
      if (user) {
        // 관리자가 아닌 경우 로그인 차단
        if (user.email !== adminEmail) {
          throw new Error("Unauthorized: Admin access only")
        }
        
        token.id = user.id
        token.tokens = user.tokens || 100 // 신규 가입자 기본 토큰
        token.role = user.role || 'ADMIN'
        token.tier = user.tier || 'FREE'
      }
      
      // OAuth 로그인 시 추가 정보 저장
      if (account && user) {
        // 관리자가 아닌 경우 로그인 차단
        if (user.email !== adminEmail) {
          throw new Error("Unauthorized: Admin access only")
        }
        
        // 첫 OAuth 로그인 시 DB에 사용자 정보 저장
        const { prisma } = await import('@/lib/prisma')
        
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })
        
        if (!existingUser) {
          // 관리자 계정 생성
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split('@')[0],
              credits: 1000, // 관리자 보너스
              role: 'ADMIN',
              tier: 'ENTERPRISE',
              provider: account.provider,
              providerId: account.providerAccountId,
              referralCode: `ADMIN_${Date.now()}`, // 필수 필드
            }
          })
          
          token.id = newUser.id
          token.tokens = newUser.credits
          token.role = newUser.role
          token.tier = newUser.tier
        } else {
          // 기존 사용자 정보 사용
          token.id = existingUser.id
          token.tokens = existingUser.credits
          token.role = existingUser.role
          token.tier = existingUser.tier
        }
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