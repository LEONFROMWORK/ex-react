import React from 'react'
import { EmailTemplate } from './EmailTemplate'

interface VerificationEmailProps {
  userName: string
  verificationUrl: string
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({ userName, verificationUrl }) => {
  return (
    <EmailTemplate
      userName={userName}
      subject="이메일 인증을 완료해주세요"
      actionUrl={verificationUrl}
      actionText="이메일 인증하기"
      previewText="이메일 인증을 완료하고 50개의 무료 토큰을 받으세요!"
      content={
        <>
          <p style={{ marginBottom: '16px' }}>
            Exhell 회원가입을 거의 완료하셨습니다!
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            아래 버튼을 클릭하여 이메일 인증을 완료해주세요. 인증이 완료되면 <strong>50개의 무료 토큰</strong>이 즉시 지급됩니다.
          </p>

          <div style={{ backgroundColor: '#FEF3C7', padding: '16px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #F59E0B' }}>
            <p style={{ margin: 0, color: '#92400E', fontSize: '14px' }}>
              <strong>⚠️ 주의사항:</strong><br />
              이 링크는 24시간 동안만 유효합니다. 기간이 지나면 새로운 인증 이메일을 요청해주세요.
            </p>
          </div>

          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6B7280' }}>
            버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 직접 붙여넣어주세요:
          </p>
          
          <p style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            backgroundColor: '#F3F4F6', 
            borderRadius: '4px',
            wordBreak: 'break-all',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {verificationUrl}
          </p>

          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            본인이 가입하지 않으셨다면 이 이메일을 무시해주세요.
          </p>
        </>
      }
    />
  )
}