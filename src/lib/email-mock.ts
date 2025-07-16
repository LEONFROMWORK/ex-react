import { randomBytes } from 'crypto'

// Mock email service for testing
export function generateVerificationToken() {
  return randomBytes(32).toString('hex')
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  console.log('📧 Mock Email Service')
  console.log(`To: ${name} <${email}>`)
  console.log(`Verification Token: ${token}`)
  console.log(`Verification URL: ${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`)
  
  return {
    success: true,
    previewUrl: null,
    messageId: `mock-${Date.now()}`
  }
}