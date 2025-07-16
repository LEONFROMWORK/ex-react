import * as nodemailer from 'nodemailer'
import { randomBytes } from 'crypto'

// 이메일 전송 설정
export async function getEmailTransporter() {
  if (process.env.NODE_ENV === 'development' || process.env.USE_TEST_EMAIL === 'true') {
    // Ethereal Email 테스트 계정 자동 생성
    const testAccount = await nodemailer.createTestAccount()
    
    return {
      transporter: nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      }),
      testAccount,
    }
  }
  
  // 프로덕션 환경 (실제 이메일 서비스)
  return {
    transporter: nodemailer.createTransporter({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    }),
    testAccount: null,
  }
}

// 이메일 인증 토큰 생성
export function generateVerificationToken() {
  return randomBytes(32).toString('hex')
}

// 인증 이메일 전송
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  const { transporter, testAccount } = await getEmailTransporter()
  
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Exhell" <noreply@exhell.com>',
    to: email,
    subject: '이메일 인증을 완료해주세요',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>안녕하세요, ${name}님!</h2>
        <p>Exhell에 가입해주셔서 감사합니다.</p>
        <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            이메일 인증하기
          </a>
        </div>
        <p>또는 다음 링크를 브라우저에 직접 입력하세요:</p>
        <p style="word-break: break-all; color: #3b82f6;">
          ${verificationUrl}
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
        <p style="color: #666; font-size: 14px;">
          이 이메일은 24시간 내에 인증을 완료해주세요.
        </p>
      </div>
    `,
  }
  
  const info = await transporter.sendMail(mailOptions)
  
  // 테스트 환경에서는 미리보기 URL 제공
  if (testAccount) {
    console.log('📧 이메일 전송됨:', {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    })
    return {
      success: true,
      previewUrl: nodemailer.getTestMessageUrl(info),
    }
  }
  
  return {
    success: true,
    messageId: info.messageId,
  }
}

// 비밀번호 재설정 이메일
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
) {
  const { transporter, testAccount } = await getEmailTransporter()
  
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Exhell" <noreply@exhell.com>',
    to: email,
    subject: '비밀번호 재설정',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>비밀번호 재설정</h2>
        <p>${name}님, 비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #ef4444; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            비밀번호 재설정
          </a>
        </div>
        <p>또는 다음 링크를 브라우저에 직접 입력하세요:</p>
        <p style="word-break: break-all; color: #ef4444;">
          ${resetUrl}
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
        <p style="color: #666; font-size: 14px;">
          비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요.
          이 링크는 1시간 후에 만료됩니다.
        </p>
      </div>
    `,
  }
  
  const info = await transporter.sendMail(mailOptions)
  
  if (testAccount) {
    console.log('📧 비밀번호 재설정 이메일:', {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    })
    return {
      success: true,
      previewUrl: nodemailer.getTestMessageUrl(info),
    }
  }
  
  return {
    success: true,
    messageId: info.messageId,
  }
}