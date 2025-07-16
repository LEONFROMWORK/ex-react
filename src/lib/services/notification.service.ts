import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { renderToString } from 'react-dom/server'

export interface NotificationData {
  userId: string
  type: 'email' | 'push' | 'both'
  subject: string
  message: string
  metadata?: Record<string, any>
  templateName?: string
  templateData?: Record<string, any>
}

export class NotificationService {
  private static instance: NotificationService
  private transporter: nodemailer.Transporter | null = null

  private constructor() {
    this.initializeEmailTransporter()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private initializeEmailTransporter() {
    // SendGrid 사용
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      })
    }
    // AWS SES 사용
    else if (process.env.AWS_SES_REGION) {
      // AWS SES 설정은 추가 구현 필요
      console.warn('AWS SES configuration not implemented')
    }
    // 개발 환경용 SMTP
    else if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    }
  }

  // 이메일 전송
  async sendEmail(to: string, subject: string, html: string, text?: string) {
    if (!this.transporter) {
      console.error('Email transporter not configured')
      return false
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Exhell" <noreply@exhell.com>',
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        html
      })

      console.log('Email sent:', info.messageId)
      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  // 알림 전송
  async sendNotification(data: NotificationData) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true, preferences: true }
    })

    if (!user) {
      console.error('User not found:', data.userId)
      return false
    }

    const preferences = user.preferences ? JSON.parse(user.preferences) : {}
    
    // 이메일 알림
    if ((data.type === 'email' || data.type === 'both') && preferences.emailNotifications !== false) {
      const html = await this.renderEmailTemplate(data.templateName || 'default', {
        userName: user.name,
        subject: data.subject,
        message: data.message,
        ...data.templateData
      })

      await this.sendEmail(user.email, data.subject, html)
    }

    // 푸시 알림 (추후 구현)
    if ((data.type === 'push' || data.type === 'both') && preferences.pushNotifications !== false) {
      await this.sendPushNotification(data.userId, data.subject, data.message)
    }

    // 알림 기록 저장
    await this.saveNotificationLog(data)

    return true
  }

  // 푸시 알림 전송 (추후 구현)
  private async sendPushNotification(userId: string, title: string, body: string) {
    // Web Push API 구현 필요
    console.log('Push notification not implemented yet')
  }

  // 알림 로그 저장
  private async saveNotificationLog(data: NotificationData) {
    // NotificationLog 모델이 필요함
    console.log('Notification log saved:', data)
  }

  // 이메일 템플릿 렌더링
  private async renderEmailTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    // 기본 템플릿
    if (templateName === 'default') {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${data.subject}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Exhell</h1>
              </div>
              <div class="content">
                <p>안녕하세요, ${data.userName}님!</p>
                <h2>${data.subject}</h2>
                <p>${data.message}</p>
                ${data.actionUrl ? `<p><a href="${data.actionUrl}" class="button">${data.actionText || '확인하기'}</a></p>` : ''}
              </div>
              <div class="footer">
                <p>이 이메일은 Exhell 서비스에서 발송되었습니다.</p>
                <p>문의사항이 있으시면 support@exhell.com으로 연락주세요.</p>
              </div>
            </div>
          </body>
        </html>
      `
    }

    // 다른 템플릿들은 추후 구현
    return ''
  }

  // 대량 이메일 전송
  async sendBulkEmails(userIds: string[], subject: string, templateName: string, templateData?: Record<string, any>) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true }
    })

    const results = await Promise.allSettled(
      users.map(user => 
        this.sendNotification({
          userId: user.id,
          type: 'email',
          subject,
          message: '',
          templateName,
          templateData: { ...templateData, userName: user.name }
        })
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return { succeeded, failed, total: users.length }
  }

  // 알림 템플릿 목록
  static NotificationTemplates = {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email-verification',
    PASSWORD_RESET: 'password-reset',
    ANALYSIS_COMPLETE: 'analysis-complete',
    PAYMENT_SUCCESS: 'payment-success',
    PAYMENT_FAILED: 'payment-failed',
    SUBSCRIPTION_RENEWED: 'subscription-renewed',
    SUBSCRIPTION_EXPIRED: 'subscription-expired',
    LOW_TOKENS: 'low-tokens',
    ADMIN_ANNOUNCEMENT: 'admin-announcement'
  }

  // 특정 이벤트에 대한 알림 전송 헬퍼 메서드들
  async sendWelcomeEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })

    return this.sendNotification({
      userId,
      type: 'email',
      subject: 'Exhell에 오신 것을 환영합니다!',
      message: `${user?.name}님, Exhell 가입을 축하드립니다! 지금 바로 Excel 파일의 오류를 수정해보세요.`,
      templateName: NotificationService.NotificationTemplates.WELCOME,
      templateData: {
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        actionText: '시작하기'
      }
    })
  }

  async sendEmailVerification(userId: string, verificationUrl: string) {
    return this.sendNotification({
      userId,
      type: 'email',
      subject: '이메일 인증을 완료해주세요',
      message: '아래 버튼을 클릭하여 이메일 인증을 완료해주세요.',
      templateName: NotificationService.NotificationTemplates.EMAIL_VERIFICATION,
      templateData: {
        actionUrl: verificationUrl,
        actionText: '이메일 인증하기'
      }
    })
  }

  async sendAnalysisComplete(userId: string, fileId: string, fileName: string) {
    return this.sendNotification({
      userId,
      type: 'both',
      subject: '파일 분석이 완료되었습니다',
      message: `${fileName} 파일의 분석이 완료되었습니다. 결과를 확인해보세요.`,
      templateName: NotificationService.NotificationTemplates.ANALYSIS_COMPLETE,
      templateData: {
        fileName,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/files/${fileId}`,
        actionText: '결과 확인하기'
      }
    })
  }

  async sendPaymentSuccess(userId: string, amount: number, tier: string) {
    return this.sendNotification({
      userId,
      type: 'email',
      subject: '결제가 완료되었습니다',
      message: `${tier} 플랜 결제가 성공적으로 처리되었습니다. 결제 금액: ₩${amount.toLocaleString()}`,
      templateName: NotificationService.NotificationTemplates.PAYMENT_SUCCESS,
      templateData: {
        amount: amount.toLocaleString(),
        tier,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        actionText: '결제 내역 확인'
      }
    })
  }

  async sendLowTokensWarning(userId: string, remainingTokens: number) {
    return this.sendNotification({
      userId,
      type: 'both',
      subject: '토큰이 부족합니다',
      message: `현재 ${remainingTokens}개의 토큰이 남아있습니다. 원활한 서비스 이용을 위해 토큰을 충전해주세요.`,
      templateName: NotificationService.NotificationTemplates.LOW_TOKENS,
      templateData: {
        remainingTokens,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tokens`,
        actionText: '토큰 충전하기'
      }
    })
  }
}