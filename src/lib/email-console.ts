import { randomBytes } from 'crypto'

// 이메일 인증 토큰 생성
export function generateVerificationToken() {
  return randomBytes(32).toString('hex')
}

// 콘솔에 인증 이메일 내용 출력 (테스트용)
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`
  
  console.log('\n' + '='.repeat(60))
  console.log('📧 이메일 인증 링크 (테스트 모드)')
  console.log('='.repeat(60))
  console.log(`To: ${email}`)
  console.log(`Name: ${name}`)
  console.log('\n인증 링크:')
  console.log(verificationUrl)
  console.log('\n위 링크를 브라우저에 복사하여 이메일 인증을 완료하세요.')
  console.log('='.repeat(60) + '\n')
  
  return {
    success: true,
    verificationUrl, // 테스트를 위해 URL도 반환
  }
}

// 비밀번호 재설정 이메일 (콘솔 출력)
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`
  
  console.log('\n' + '='.repeat(60))
  console.log('🔐 비밀번호 재설정 링크 (테스트 모드)')
  console.log('='.repeat(60))
  console.log(`To: ${email}`)
  console.log(`Name: ${name}`)
  console.log('\n재설정 링크:')
  console.log(resetUrl)
  console.log('\n위 링크를 브라우저에 복사하여 비밀번호를 재설정하세요.')
  console.log('='.repeat(60) + '\n')
  
  return {
    success: true,
    resetUrl,
  }
}