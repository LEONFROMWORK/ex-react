import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail, generateVerificationToken } from '@/lib/email'

// 회원가입 스키마
const registerSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // 유효성 검사
    const validatedData = registerSchema.parse(body)
    
    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      )
    }
    
    // 비밀번호 해시화
    const hashedPassword = await hash(validatedData.password, 12)
    
    // 사용자 생성 (이메일 인증 전이므로 토큰은 0)
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        tokens: 0, // 이메일 인증 후 지급
      }
    })
    
    // 이메일 인증 토큰 생성
    const verificationToken = generateVerificationToken()
    
    await prisma.verificationToken.create({
      data: {
        token: verificationToken,
        userId: newUser.id,
        type: 'EMAIL_VERIFICATION',
        createdAt: new Date()
      }
    })
    
    // 인증 이메일 발송
    try {
      const emailResult = await sendVerificationEmail(
        validatedData.email, 
        validatedData.name, 
        verificationToken
      )
      
      if (process.env.NODE_ENV === 'development' && emailResult.previewUrl) {
        console.log('📧 이메일 미리보기:', emailResult.previewUrl)
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // 이메일 전송 실패 시에도 회원가입은 성공으로 처리
    }
    
    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}