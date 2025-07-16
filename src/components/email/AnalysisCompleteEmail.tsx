import React from 'react'
import { EmailTemplate } from './EmailTemplate'

interface AnalysisCompleteEmailProps {
  userName: string
  fileName: string
  errorCount: number
  fixedCount: number
  actionUrl: string
}

export const AnalysisCompleteEmail: React.FC<AnalysisCompleteEmailProps> = ({ 
  userName, 
  fileName, 
  errorCount, 
  fixedCount,
  actionUrl 
}) => {
  const successRate = errorCount > 0 ? Math.round((fixedCount / errorCount) * 100) : 0

  return (
    <EmailTemplate
      userName={userName}
      subject="파일 분석이 완료되었습니다"
      actionUrl={actionUrl}
      actionText="결과 확인하기"
      previewText={`${fileName} 파일에서 ${errorCount}개의 오류를 발견했습니다.`}
      content={
        <>
          <p style={{ marginBottom: '16px' }}>
            요청하신 Excel 파일의 분석이 완료되었습니다! 📊
          </p>

          <div style={{ backgroundColor: '#F0F9FF', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #BAE6FD' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0C4A6E' }}>
              {fileName}
            </h3>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748B' }}>발견된 오류</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0C4A6E' }}>
                  {errorCount}개
                </p>
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748B' }}>수정된 오류</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                  {fixedCount}개
                </p>
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748B' }}>성공률</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                  {successRate}%
                </p>
              </div>
            </div>
          </div>

          {errorCount > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>주요 발견 사항:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#4B5563' }}>
                <li>수식 오류가 자동으로 수정되었습니다</li>
                <li>데이터 형식 불일치가 해결되었습니다</li>
                <li>참조 오류가 올바르게 업데이트되었습니다</li>
              </ul>
            </div>
          )}

          {fixedCount < errorCount && (
            <div style={{ backgroundColor: '#FEF3C7', padding: '16px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #F59E0B' }}>
              <p style={{ margin: 0, color: '#92400E', fontSize: '14px' }}>
                일부 오류는 수동으로 확인이 필요합니다. 자세한 내용은 분석 리포트를 확인해주세요.
              </p>
            </div>
          )}

          <p style={{ marginBottom: '16px' }}>
            수정된 파일을 다운로드하고 상세한 분석 리포트를 확인하려면 아래 버튼을 클릭하세요.
          </p>
        </>
      }
    />
  )
}