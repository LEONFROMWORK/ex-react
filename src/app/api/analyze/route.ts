import { NextRequest, NextResponse } from 'next/server'
import { ExcelAnalyzer } from '@/modules/excel-analyzer'
// import { QASystem } from '@/modules/qa-system' // 제거됨
// import { VBAAnalyzer } from '@/modules/vba-analyzer' // 제거됨
import { getMockSession } from '@/lib/auth/mock-session'

// 싱글톤 인스턴스
let excelAnalyzer: ExcelAnalyzer | null = null

// 초기화 함수
async function initializeSystems() {
  if (!excelAnalyzer) {
    excelAnalyzer = new ExcelAnalyzer()
  }
}

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await getMockSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 시스템 초기화
    await initializeSystems()
    
    const formData = await req.formData()
    const mode = formData.get('mode') as string
    
    if (mode === 'file') {
      // 파일 분석 모드
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, message: '파일이 제공되지 않았습니다.' },
          { status: 400 }
        )
      }
      
      const buffer = Buffer.from(await file.arrayBuffer())
      const isVBA = file.name.endsWith('.xlsm') || file.name.endsWith('.xlsb')
      
      console.log(`Analyzing file: ${file.name} (VBA: ${isVBA})`)
      
      // Excel 분석
      const fileAnalysis = await excelAnalyzer!.analyze(buffer)
      
      // VBA 분석은 별도 API(/api/vba/extract)에서 처리
      let vbaAnalysis = null
      if (isVBA) {
        vbaAnalysis = {
          message: 'VBA 분석은 /vba/extract 페이지에서 수행하세요.',
          hasVBA: true
        }
      }
      
      // 분석 보고서 생성
      const report = await excelAnalyzer!.generateReport(fileAnalysis)
      
      return NextResponse.json({
        success: true,
        results: {
          fileAnalysis,
          vbaAnalysis,
          report,
          summary: {
            totalIssues: fileAnalysis.length,
            errors: fileAnalysis.filter(r => r.type === 'error').length,
            warnings: fileAnalysis.filter(r => r.type === 'warning').length,
            suggestions: fileAnalysis.filter(r => r.type === 'suggestion').length,
            hasVBA: isVBA,
            vbaRiskLevel: vbaAnalysis?.summary?.riskLevel || 'none'
          }
        }
      })
      
    } else if (mode === 'question') {
      // Q&A 기능은 /dashboard/chat에서 처리
      return NextResponse.json(
        { success: false, message: 'Q&A 기능은 /dashboard/chat에서 이용하세요.' },
        { status: 400 }
      )
      
    } else {
      return NextResponse.json(
        { success: false, message: '잘못된 모드입니다. "file" 또는 "question"을 사용하세요.' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        message: '분석 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Q&A 검색은 /dashboard/chat에서 처리
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Q&A 검색은 /dashboard/chat에서 이용하세요.' },
    { status: 400 }
  )
}