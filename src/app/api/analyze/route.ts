import { NextRequest, NextResponse } from 'next/server'
import { ExcelAnalyzer } from '@/modules/excel-analyzer'
import { QASystem } from '@/modules/qa-system'
import { VBAAnalyzer } from '@/modules/vba-analyzer'
import { getMockSession } from '@/lib/auth/mock-session'

// 싱글톤 인스턴스
let excelAnalyzer: ExcelAnalyzer | null = null
let qaSystem: QASystem | null = null
let vbaAnalyzer: VBAAnalyzer | null = null

// 초기화 함수
async function initializeSystems() {
  if (!excelAnalyzer) {
    excelAnalyzer = new ExcelAnalyzer()
  }
  
  if (!qaSystem) {
    qaSystem = new QASystem()
    await qaSystem.initialize()
    // Q&A 데이터 로드
    try {
      // Oppadu 데이터 로드
      const oppaduPath = process.cwd() + '/data/oppadu_qa_data.jsonl'
      await qaSystem.loadOppaduData(oppaduPath)
      console.log('Oppadu data loaded successfully')
      
      // Reddit 데이터 로드
      const redditPath1 = process.cwd() + '/data/reddit_qa_data.jsonl'
      const redditPath2 = process.cwd() + '/data/reddit_qa_data_part2.jsonl'
      await qaSystem.loadOppaduData(redditPath1)
      await qaSystem.loadOppaduData(redditPath2)
      console.log('Reddit data loaded successfully')
    } catch (error) {
      console.error('Failed to load Q&A data:', error)
    }
  }
  
  if (!vbaAnalyzer) {
    vbaAnalyzer = new VBAAnalyzer()
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
      
      // VBA 분석 (해당하는 경우)
      let vbaAnalysis = null
      if (isVBA) {
        try {
          vbaAnalysis = await vbaAnalyzer!.analyzeVBAFile(buffer)
        } catch (error) {
          console.error('VBA analysis failed:', error)
          vbaAnalysis = {
            error: 'VBA 분석 중 오류가 발생했습니다. Python 환경을 확인하세요.'
          }
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
      // Q&A 모드
      const question = formData.get('question') as string
      
      if (!question) {
        return NextResponse.json(
          { success: false, message: '질문이 제공되지 않았습니다.' },
          { status: 400 }
        )
      }
      
      console.log(`Processing question: ${question}`)
      
      // 질문 분류
      const category = qaSystem!.classifyQuestion(question)
      const keywords = qaSystem!.extractKeywords(question)
      
      // 유사 질문 검색
      const similarQuestions = await qaSystem!.searchSimilarQuestions(question)
      
      // AI 답변 생성
      const answer = await qaSystem!.generateAnswer(question, similarQuestions)
      
      return NextResponse.json({
        success: true,
        question,
        answer,
        category,
        keywords,
        references: similarQuestions,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'integrated-qa-system'
        }
      })
      
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

// Q&A 검색 전용 엔드포인트
export async function GET(req: NextRequest) {
  try {
    const session = await getMockSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    await initializeSystems()
    
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '5')
    
    if (!query) {
      return NextResponse.json(
        { success: false, message: '검색어가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const results = await qaSystem!.searchSimilarQuestions(query, limit)
    
    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length
    })
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, message: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}