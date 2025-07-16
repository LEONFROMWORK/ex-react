import React from 'react'
import { EmailTemplate } from './EmailTemplate'

interface WelcomeEmailProps {
  userName: string
  actionUrl: string
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ userName, actionUrl }) => {
  return (
    <EmailTemplate
      userName={userName}
      subject="Exhell에 오신 것을 환영합니다!"
      actionUrl={actionUrl}
      actionText="시작하기"
      previewText="Excel 파일의 모든 오류를 AI가 자동으로 수정해드립니다."
      content={
        <>
          <p style={{ marginBottom: '16px' }}>
            Exhell 가입을 진심으로 축하드립니다! 🎉
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            이제 Excel 파일의 복잡한 오류들을 AI가 자동으로 찾아내고 수정해드립니다.
          </p>

          <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>무료 회원 혜택:</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>가입 즉시 50개의 무료 토큰 지급</li>
              <li>월 10개의 무료 토큰 제공</li>
              <li>최대 10MB 파일 업로드</li>
              <li>기본 오류 수정 기능</li>
            </ul>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>시작하는 방법:</h3>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Excel 파일을 업로드하세요</li>
              <li>AI가 오류를 자동으로 분석합니다</li>
              <li>수정된 파일을 다운로드하세요</li>
            </ol>
          </div>

          <p style={{ marginBottom: '16px' }}>
            질문이 있으시면 언제든지 support@exhell.com으로 문의해주세요.
          </p>
        </>
      }
    />
  )
}