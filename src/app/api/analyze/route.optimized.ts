import { NextRequest, NextResponse } from 'next/server'
import { ExcelAnalyzer } from '@/modules/excel-analyzer'
import { QASystem } from '@/modules/qa-system'
import { VBAAnalyzer } from '@/modules/vba-analyzer'
import { getMockSession } from '@/lib/auth/mock-session'
import { circuitBreakers } from '@/lib/performance/circuit-breaker'
import { analysisCache, qaCache } from '@/lib/cache/simple-cache'

// 파일 크기 제한: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 싱글톤 인스턴스
let excelAnalyzer: ExcelAnalyzer | null = null
let qaSystem: QASystem | null = null
let vbaAnalyzer: VBAAnalyzer | null = null

// 초기화
async function initializeSystems() {
  if (!excelAnalyzer) {
    excelAnalyzer = new ExcelAnalyzer()
  }
  
  if (!qaSystem) {
    qaSystem = new QASystem()
    await qaSystem.initialize()
    
    // Q&A 데이터 로드 (한 번만)
    if (process.env.NODE_ENV === 'production') {
      try {
        const dataPath = process.cwd() + '/data'
        await Promise.all([
          qaSystem.loadOppaduData(`${dataPath}/oppadu_qa_data.jsonl`),
          qaSystem.loadOppaduData(`${dataPath}/reddit_qa_data.jsonl`),
          qaSystem.loadOppaduData(`${dataPath}/reddit_qa_data_part2.jsonl`)
        ])
      } catch (error) {
        console.error('Q&A data load error:', error)
      }
    }
  }
  
  if (!vbaAnalyzer) {
    vbaAnalyzer = new VBAAnalyzer()
  }
}

export async function POST(req: NextRequest) {
  try {
    // 인증
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
      return circuitBreakers.excelAnalysis.execute(async () => {
        const file = formData.get('file') as File
        
        if (!file) {
          return NextResponse.json(
            { success: false, message: '파일이 제공되지 않았습니다.' },
            { status: 400 }
          )
        }
        
        // 파일 크기 확인
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, message: '파일 크기는 10MB 이하여야 합니다.' },
            { status: 413 }
          )
        }
        
        // 캐시 확인
        const cacheKey = `${file.name}:${file.size}:${file.lastModified}`
        const cached = await analysisCache.get(cacheKey)
        
        if (cached) {
          return NextResponse.json({
            success: true,
            results: cached,
            cached: true
          })
        }
        
        // 파일 분석
        const buffer = Buffer.from(await file.arrayBuffer())
        const isVBA = file.name.endsWith('.xlsm') || file.name.endsWith('.xlsb')
        
        const fileAnalysis = await excelAnalyzer!.analyze(buffer)
        
        // VBA 분석 (해당하는 경우)
        let vbaAnalysis = null
        if (isVBA && vbaAnalyzer) {
          try {
            vbaAnalysis = await vbaAnalyzer.analyzeVBAFile(buffer)
          } catch (error) {
            console.error('VBA analysis error:', error)
          }
        }
        
        // 보고서 생성
        const report = await excelAnalyzer!.generateReport(fileAnalysis)
        
        const results = {
          fileAnalysis,
          vbaAnalysis,
          report,
          summary: {
            totalIssues: fileAnalysis.length,
            errors: fileAnalysis.filter(r => r.type === 'error').length,
            warnings: fileAnalysis.filter(r => r.type === 'warning').length,
            suggestions: fileAnalysis.filter(r => r.type === 'suggestion').length,
            hasVBA: isVBA
          }
        }
        
        // 캐시 저장 (1시간)
        await analysisCache.set(cacheKey, results, { ttl: 3600 })
        
        return NextResponse.json({
          success: true,
          results
        })
      })
      
    } else if (mode === 'question') {
      // Q&A 모드
      return circuitBreakers.qaSystem.execute(async () => {
        const question = formData.get('question') as string
        
        if (!question || question.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: '질문이 제공되지 않았습니다.' },
            { status: 400 }
          )
        }
        
        // 캐시 확인
        const cacheKey = question.toLowerCase().trim()
        const cached = await qaCache.get(cacheKey)
        
        if (cached) {
          return NextResponse.json({
            success: true,
            ...cached,
            cached: true
          })
        }
        
        // 질문 처리
        const category = qaSystem!.classifyQuestion(question)
        const keywords = qaSystem!.extractKeywords(question)
        const similarQuestions = await qaSystem!.searchSimilarQuestions(question)
        const answer = await qaSystem!.generateAnswer(question, similarQuestions)
        
        const result = {
          question,
          answer,
          category,
          keywords,
          references: similarQuestions
        }
        
        // 캐시 저장 (24시간)
        await qaCache.set(cacheKey, result, { ttl: 86400 })
        
        return NextResponse.json({
          success: true,
          ...result
        })
      })
      
    } else {
      return NextResponse.json(
        { success: false, message: '잘못된 모드입니다.' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '처리 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}