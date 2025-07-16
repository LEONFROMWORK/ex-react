import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// 회원가입 스키마
const signupSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  referralCode: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    console.log('Signup API called')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    // 유효성 검사
    const validatedData = signupSchema.parse(body)
    console.log('Validation passed')
    
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
    console.log('Password hashed')
    
    // 추천인 코드 생성 (사용자별 고유 코드)
    let userReferralCode: string
    let codeExists = true
    let attempts = 0
    
    // 고유한 추천인 코드 생성 (충돌 방지)
    while (codeExists && attempts < 10) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const namePrefix = validatedData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
      userReferralCode = `${namePrefix}${randomCode}`
      
      try {
        const existingCode = await prisma.user.findUnique({
          where: { referralCode: userReferralCode }
        })
        codeExists = !!existingCode
      } catch (error) {
        console.error('Referral code check error:', error)
        codeExists = false
      }
      
      attempts++
    }
    
    if (attempts >= 10) {
      // 마지막 시도로 타임스탬프 포함
      userReferralCode = `${validatedData.name.substring(0, 2).toUpperCase()}${Date.now().toString(36).toUpperCase()}`
    }
    
    // 간단한 사용자 생성 (최소 필드만)
    try {
      const newUser = await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          referralCode: userReferralCode,
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
    } catch (createError) {
      console.error('User creation error:', createError)
      
      // Prisma 오류 상세 정보
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
    console.error('=== Signup Error Details ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
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
    if (error.code === 'P2024') {
      return NextResponse.json(
        { 
          success: false,
          message: '데이터베이스 연결 오류. 서버를 확인해주세요.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: '회원가입 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          type: error.constructor.name
        } : undefined
      },
      { status: 500 }
    )
  }
}