import { AnalysisItem } from '@/lib/modules/excel-analyzer'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

export interface ReportData {
  fileInfo: {
    name: string
    size: number
    analyzedAt: Date
  }
  summary: {
    totalIssues: number
    criticalErrors: number
    warnings: number
    suggestions: number
    autoFixable: number
  }
  analysisResults: AnalysisItem[]
  recommendations: string[]
}

export class ReportService {
  // PDF 리포트 생성
  async generatePDFReport(data: ReportData): Promise<Blob> {
    const doc = new jsPDF()
    
    // 헤더
    doc.setFontSize(20)
    doc.text('Excel 분석 리포트', 20, 20)
    
    // 파일 정보
    doc.setFontSize(12)
    doc.text(`파일명: ${data.fileInfo.name}`, 20, 40)
    doc.text(`크기: ${(data.fileInfo.size / 1024 / 1024).toFixed(2)} MB`, 20, 50)
    doc.text(`분석 일시: ${data.fileInfo.analyzedAt.toLocaleString('ko-KR')}`, 20, 60)
    
    // 요약
    doc.setFontSize(16)
    doc.text('분석 요약', 20, 80)
    doc.setFontSize(12)
    doc.text(`총 문제 수: ${data.summary.totalIssues}개`, 20, 95)
    doc.text(`심각한 오류: ${data.summary.criticalErrors}개`, 20, 105)
    doc.text(`경고: ${data.summary.warnings}개`, 20, 115)
    doc.text(`제안사항: ${data.summary.suggestions}개`, 20, 125)
    doc.text(`자동 수정 가능: ${data.summary.autoFixable}개`, 20, 135)
    
    // 상세 결과
    let yPos = 155
    doc.setFontSize(16)
    doc.text('상세 분석 결과', 20, yPos)
    yPos += 15
    
    doc.setFontSize(10)
    data.analysisResults.forEach((item, index) => {
      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }
      
      const severityIcon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[item.severity] || '⚪'
      
      doc.text(`${index + 1}. ${severityIcon} ${item.description}`, 20, yPos)
      yPos += 7
      doc.text(`   위치: ${item.location.sheet} - ${item.location.cell}`, 25, yPos)
      yPos += 7
      doc.text(`   제안: ${item.suggestion}`, 25, yPos)
      yPos += 10
    })
    
    // 권장사항
    if (data.recommendations.length > 0) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(16)
      doc.text('권장사항', 20, yPos)
      yPos += 15
      
      doc.setFontSize(10)
      data.recommendations.forEach(rec => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`• ${rec}`, 25, yPos)
        yPos += 7
      })
    }
    
    // PDF를 Blob으로 변환
    return doc.output('blob')
  }
  
  // Excel 리포트 생성
  async generateExcelReport(data: ReportData): Promise<Blob> {
    const wb = XLSX.utils.book_new()
    
    // 요약 시트
    const summaryData = [
      ['Excel 분석 리포트'],
      [],
      ['파일 정보'],
      ['파일명', data.fileInfo.name],
      ['크기', `${(data.fileInfo.size / 1024 / 1024).toFixed(2)} MB`],
      ['분석 일시', data.fileInfo.analyzedAt.toLocaleString('ko-KR')],
      [],
      ['분석 요약'],
      ['총 문제 수', data.summary.totalIssues],
      ['심각한 오류', data.summary.criticalErrors],
      ['경고', data.summary.warnings],
      ['제안사항', data.summary.suggestions],
      ['자동 수정 가능', data.summary.autoFixable]
    ]
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, '요약')
    
    // 상세 결과 시트
    const detailsData = [
      ['번호', '심각도', '유형', '위치', '설명', '제안사항', '자동수정가능']
    ]
    
    data.analysisResults.forEach((item, index) => {
      detailsData.push([
        (index + 1).toString(),
        item.severity,
        item.type,
        `${item.location.sheet}!${item.location.cell || item.location.range || ''}`,
        item.description,
        item.suggestion,
        item.autoFixAvailable ? '예' : '아니오'
      ])
    })
    
    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData)
    
    // 열 너비 설정
    detailsSheet['!cols'] = [
      { wch: 6 },   // 번호
      { wch: 10 },  // 심각도
      { wch: 12 },  // 유형
      { wch: 15 },  // 위치
      { wch: 40 },  // 설명
      { wch: 40 },  // 제안사항
      { wch: 12 }   // 자동수정가능
    ]
    
    XLSX.utils.book_append_sheet(wb, detailsSheet, '상세 분석')
    
    // 권장사항 시트
    if (data.recommendations.length > 0) {
      const recommendationsData = [
        ['권장사항'],
        []
      ]
      
      data.recommendations.forEach(rec => {
        recommendationsData.push([rec])
      })
      
      const recommendationsSheet = XLSX.utils.aoa_to_sheet(recommendationsData)
      XLSX.utils.book_append_sheet(wb, recommendationsSheet, '권장사항')
    }
    
    // Excel 파일을 Blob으로 변환
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  }
  
  // 리포트 데이터 준비
  prepareReportData(
    fileInfo: { name: string; size: number },
    analysisResults: AnalysisItem[]
  ): ReportData {
    const summary = {
      totalIssues: analysisResults.length,
      criticalErrors: analysisResults.filter(r => r.severity === 'critical').length,
      warnings: analysisResults.filter(r => r.type === 'warning').length,
      suggestions: analysisResults.filter(r => r.type === 'optimization').length,
      autoFixable: analysisResults.filter(r => r.autoFixAvailable).length
    }
    
    // 문제 유형별 권장사항 생성
    const recommendations: string[] = []
    
    if (summary.criticalErrors > 0) {
      recommendations.push('심각한 오류를 우선적으로 수정하세요. 이는 파일의 정상적인 작동을 방해할 수 있습니다.')
    }
    
    const errorTypes = new Set(analysisResults.map(r => r.type))
    
    if (errorTypes.has('error')) {
      recommendations.push('오류를 수정하여 파일의 정상적인 작동을 보장하세요.')
    }
    
    if (errorTypes.has('optimization')) {
      recommendations.push('최적화 제안사항을 적용하여 성능을 향상시키세요.')
    }
    
    if (errorTypes.has('warning')) {
      recommendations.push('경고사항을 검토하고 필요시 수정하세요.')
    }
    
    if (summary.autoFixable > summary.totalIssues * 0.5) {
      recommendations.push(`${summary.autoFixable}개의 문제가 자동으로 수정 가능합니다. 자동 수정 기능을 활용하세요.`)
    }
    
    return {
      fileInfo: {
        ...fileInfo,
        analyzedAt: new Date()
      },
      summary,
      analysisResults,
      recommendations
    }
  }
  
  // 다운로드 헬퍼
  downloadReport(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}