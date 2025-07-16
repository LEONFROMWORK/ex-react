import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// 회원가입 스키마
const registerSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  referralCode: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    console.log('Register API called')
    
    const body = await req.json()
    
    // 유효성 검사
    const validatedData = registerSchema.parse(body)
    
    // 이메일 중복 확인
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { 
            success: false,
            message: '이미 사용 중인 이메일입니다.' 
          },
          { status: 400 }
        )
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      throw dbError
    }
    
    // 비밀번호 해시화
    const hashedPassword = await hash(validatedData.password, 12)
    
    // 추천인 코드 생성
    const generateReferralCode = () => {
      const prefix = validatedData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
      const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
      return `${prefix}${suffix}`
    }
    
    let referralCode = generateReferralCode()
    let attempts = 0
    
    // 유니크한 추천인 코드 생성
    while (attempts < 10) {
      try {
        const existing = await prisma.user.findUnique({
          where: { referralCode }
        })
        if (!existing) break
        referralCode = generateReferralCode()
        attempts++
      } catch (error) {
        console.error('Referral code check error:', error)
        break
      }
    }
    
    // 사용자 생성
    try {
      // 이메일 인증 설정 확인
      const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true' || 
                                   process.env.APP_ENV === 'test' || 
                                   process.env.NODE_ENV === 'development'
      
      // 가입 보너스 토큰 (환경변수로 설정 가능)
      const signupBonus = parseInt(process.env.SIGNUP_BONUS_TOKENS || '100')
      
      const newUser = await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          referralCode,
          tokens: signupBonus, // 가입 보너스
          emailVerified: skipEmailVerification ? new Date() : null,
        }
      })
      
      console.log('User created successfully:', newUser.id)
      
      return NextResponse.json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        }
      })
    } catch (createError: any) {
      console.error('User creation error:', createError)
      
      if (createError.code === 'P2002') {
        return NextResponse.json(
          { 
            success: false,
            message: '이미 사용 중인 정보입니다.' 
          },
          { status: 400 }
        )
      }
      
      throw createError
    }
    
  } catch (error) {
    console.error('=== Register Error ===')
    console.error(error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: error.errors[0].message 
        },
        { status: 400 }
      )
    }
    
    // Prisma 연결 오류
    if ((error as any).code === 'P2024') {
      return NextResponse.json(
        { 
          success: false,
          message: '데이터베이스 연결 오류입니다.',
          error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: '회원가입 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? {
          message: (error as any).message,
          code: (error as any).code,
        } : undefined
      },
      { status: 500 }
    )
  }
}