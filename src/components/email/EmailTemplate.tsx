import React from 'react'

interface EmailTemplateProps {
  userName: string
  subject: string
  content: React.ReactNode
  actionUrl?: string
  actionText?: string
  previewText?: string
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  userName,
  subject,
  content,
  actionUrl,
  actionText = '확인하기',
  previewText
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{subject}</title>
        {previewText && (
          <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
            {previewText}
          </div>
        )}
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f3f4f6', padding: '20px 0' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: '#4F46E5', padding: '24px', textAlign: 'center' }}>
                    <h1 style={{ color: '#ffffff', margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                      Exhell
                    </h1>
                    <p style={{ color: '#E0E7FF', margin: '8px 0 0 0', fontSize: '14px' }}>
                      Excel 오류 수정 AI 서비스
                    </p>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: '32px 24px' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#374151' }}>
                      안녕하세요, {userName}님!
                    </p>
                    
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827', fontWeight: 'bold' }}>
                      {subject}
                    </h2>

                    <div style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                      {content}
                    </div>

                    {actionUrl && (
                      <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '32px 0' }}>
                        <tr>
                          <td align="center">
                            <a
                              href={actionUrl}
                              style={{
                                display: 'inline-block',
                                padding: '12px 24px',
                                backgroundColor: '#4F46E5',
                                color: '#ffffff',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                fontSize: '16px',
                                fontWeight: 'bold'
                              }}
                            >
                              {actionText}
                            </a>
                          </td>
                        </tr>
                      </table>
                    )}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: '#f9fafb', padding: '24px', borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                      이 이메일은 Exhell 서비스에서 발송되었습니다.
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                      문의사항이 있으시면 support@exhell.com으로 연락주세요.
                    </p>
                    <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                      © 2024 Exhell. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}