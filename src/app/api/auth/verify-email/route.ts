import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: '인증 토큰이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 토큰으로 사용자 찾기
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    })
    
    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 인증 토큰입니다.' },
        { status: 400 }
      )
    }
    
    // 토큰 만료 확인 (24시간)
    const tokenAge = Date.now() - verificationToken.createdAt.getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24시간
    
    if (tokenAge > maxAge) {
      // 만료된 토큰 삭제
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      })
      
      return NextResponse.json(
        { success: false, message: '인증 토큰이 만료되었습니다.' },
        { status: 400 }
      )
    }
    
    // 사용자 이메일 인증 상태 업데이트
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { 
        emailVerified: new Date(),
        // 신규 사용자에게 무료 토큰 지급
        tokens: {
          increment: 50
        }
      }
    })
    
    // 사용한 토큰 삭제
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    })
    
    // 토큰 지급 기록 생성
    await prisma.tokenTransaction.create({
      data: {
        userId: verificationToken.userId,
        amount: 50,
        type: 'EARNED',
        reason: '회원가입 보너스',
        balance: verificationToken.user.tokens + 50
      }
    })
    
    return NextResponse.json({
      success: true,
      message: '이메일 인증이 완료되었습니다! 무료 토큰 50개가 지급되었습니다.'
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}