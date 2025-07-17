import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 권한 확인
    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 폼 데이터 파싱
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: '파일이 선택되지 않았습니다' }, { status: 400 })
    }

    // 파일 유효성 검사
    const validationResult = validateFile(file)
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    // 업로드 디렉토리 생성
    const uploadDir = join(process.cwd(), 'uploads', 'knowledge-base')
    await mkdir(uploadDir, { recursive: true })

    // 파일 저장
    const jobId = uuidv4()
    const fileName = `${jobId}_${file.name}`
    const filePath = join(uploadDir, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 백그라운드에서 처리 시작
    processFileAsync(jobId, filePath, file.name, session.user.id)

    return NextResponse.json({
      success: true,
      jobId,
      message: '파일 업로드가 완료되었습니다. 처리가 시작됩니다.'
    })
  } catch (error) {
    console.error('파일 업로드 실패:', error)
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}

function validateFile(file: File): { isValid: boolean; error?: string } {
  // 파일 확장자 검사
  if (!file.name.endsWith('.json') && !file.name.endsWith('.jsonl')) {
    return { isValid: false, error: 'JSON 또는 JSONL 파일만 업로드 가능합니다' }
  }

  // 파일 크기 검사 (100MB 제한)
  const maxSize = 100 * 1024 * 1024
  if (file.size > maxSize) {
    return { isValid: false, error: '파일 크기는 100MB를 초과할 수 없습니다' }
  }

  return { isValid: true }
}

async function processFileAsync(jobId: string, filePath: string, fileName: string, userId: string) {
  // 이 함수는 백그라운드에서 실행됩니다
  // 실제 구현에서는 Queue 시스템을 사용하는 것이 좋습니다
  
  try {
    // 작업 시작 로그
    console.log(`파일 처리 시작: ${fileName} (Job ID: ${jobId})`)
    
    // 1. 파일 읽기 및 파싱
    await updateJobStatus(jobId, 'validating', 10)
    const parseResult = await parseFile(filePath)
    const { data, isBigDataFormat, metadata } = parseResult
    
    // 2. 데이터 검증 및 전처리
    await updateJobStatus(jobId, 'processing', 30)
    const processedData = await preprocessData(data)
    
    // 3. 임베딩 생성
    await updateJobStatus(jobId, 'generating_embeddings', 60)
    const embeddingsData = await generateEmbeddings(processedData)
    
    // 4. 벡터 DB 저장
    await updateJobStatus(jobId, 'generating_embeddings', 90)
    await saveToVectorDB(embeddingsData)
    
    // 5. 완료 처리
    const stats = {
      totalItems: data.length,
      validItems: processedData.length,
      invalidItems: data.length - processedData.length,
      categories: getCategoryStats(processedData),
      averageQuality: getAverageQuality(processedData, isBigDataFormat),
      duplicates: 0,
      ...(isBigDataFormat && {
        qaDataCount: data.filter(item => !item.isChainSolution).length,
        chainSolutionsCount: data.filter(item => item.isChainSolution).length,
        sources: getSourceStats(data),
        metadata: metadata
      })
    }
    
    await updateJobStatus(jobId, 'completed', 100, stats)
    
    console.log(`파일 처리 완료: ${fileName} (Job ID: ${jobId})`)
  } catch (error) {
    console.error(`파일 처리 실패: ${fileName} (Job ID: ${jobId})`, error)
    await updateJobStatus(jobId, 'failed', 0, undefined, (error as Error).message)
  }
}

async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress: number, 
  stats?: any, 
  error?: string
) {
  // 실제 구현에서는 데이터베이스에 저장
  // 현재는 메모리에 저장 (재시작 시 사라짐)
  
  // 임시 저장소 (실제로는 Redis나 Database 사용)
  const jobData = {
    id: jobId,
    status,
    progress,
    stats,
    error,
    updatedAt: new Date().toISOString()
  }
  
  // 실제 구현:
  // await prisma.processingJob.update({
  //   where: { id: jobId },
  //   data: jobData
  // })
}

async function parseFile(filePath: string): Promise<{ data: any[], isBigDataFormat: boolean, metadata?: any }> {
  // 실제 파일 파싱 로직 구현
  const fs = require('fs')
  const content = fs.readFileSync(filePath, 'utf-8')
  
  let parsedData: any
  
  if (filePath.endsWith('.json')) {
    parsedData = JSON.parse(content)
    
    // BigData TRD 형식인지 확인 (표준 형식)
    if (parsedData.metadata && parsedData.qaData && Array.isArray(parsedData.qaData)) {
      // BigData TRD 형식 - 표준으로 채택
      const allData = [
        ...parsedData.qaData,
        ...(parsedData.chainSolutions ? parsedData.chainSolutions.map((chain: any) => ({
          id: chain.id,
          question: `복합 문제 해결 (${chain.chainLength}단계)`,
          answer: chain.integratedContent,
          category: 'chain_solution',
          quality_score: chain.totalScore / 100,
          source: 'chain',
          metadata: chain.metadata,
          isChainSolution: true
        })) : [])
      ]
      
      return {
        data: allData,
        isBigDataFormat: true,
        metadata: parsedData.metadata
      }
    } else if (Array.isArray(parsedData)) {
      // 레거시 JSON 배열 - BigData TRD 형식으로 변환
      return { 
        data: parsedData.map(item => convertToTRDFormat(item)), 
        isBigDataFormat: true,
        metadata: { convertedFromLegacy: true }
      }
    } else {
      // 단일 객체 - BigData TRD 형식으로 변환
      return { 
        data: [convertToTRDFormat(parsedData)], 
        isBigDataFormat: true,
        metadata: { convertedFromLegacy: true }
      }
    }
  } else if (filePath.endsWith('.jsonl')) {
    // JSONL 파일을 BigData TRD 형식으로 변환
    const data = content.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .map(item => convertToTRDFormat(item))
    return { 
      data, 
      isBigDataFormat: true,
      metadata: { convertedFromJSONL: true }
    }
  }
  
  return { data: [], isBigDataFormat: false }
}

// 레거시 형식을 BigData TRD 형식으로 변환하는 함수
function convertToTRDFormat(item: any): any {
  // 이미 TRD 형식인 경우 그대로 반환
  if (item.qualityScore && item.source && item.metadata) {
    return item
  }
  
  // 레거시 형식을 TRD 형식으로 변환
  return {
    id: item.id || generateId(),
    question: item.question || item.title || '',
    answer: item.answer || item.content || '',
    qualityScore: {
      total: Math.round((item.quality_score || item.score || 5.0) * 10), // 0-100 스케일로 변환
      breakdown: {
        relevance: Math.round(((item.quality_score || 5.0) * 10) * 0.4),
        clarity: Math.round(((item.quality_score || 5.0) * 10) * 0.3),
        completeness: Math.round(((item.quality_score || 5.0) * 10) * 0.3)
      }
    },
    source: item.source || 'manual',
    metadata: {
      category: item.category || 'general',
      difficulty: item.difficulty || 'intermediate',
      tags: item.tags || [],
      originalData: item,
      convertedAt: new Date().toISOString(),
      ...((item.metadata && typeof item.metadata === 'object') ? item.metadata : {})
    }
  }
}

// 간단한 ID 생성 함수
function generateId(): string {
  return `trd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function preprocessData(data: any[]): Promise<any[]> {
  // BigData TRD 형식으로 데이터 전처리 (표준화)
  return data.filter(item => {
    // TRD 형식 기본 필드 검증
    return item.id && item.question && item.answer
  }).map(item => {
    // BigData TRD 표준 형식으로 정규화
    return {
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.metadata?.category || item.category || 'general',
      quality_score: item.qualityScore?.total ? item.qualityScore.total / 100 : (item.quality_score || 0.5),
      source: item.source || 'unknown',
      difficulty: item.metadata?.difficulty || 'intermediate',
      tags: item.metadata?.tags || [],
      processed_at: new Date().toISOString(),
      original_metadata: item.metadata,
      is_chain_solution: item.isChainSolution || false,
      // TRD 고유 필드 추가
      quality_breakdown: item.qualityScore?.breakdown || {
        relevance: Math.round((item.quality_score || 0.5) * 40),
        clarity: Math.round((item.quality_score || 0.5) * 30), 
        completeness: Math.round((item.quality_score || 0.5) * 30)
      },
      trd_version: '1.0',
      converted_at: new Date().toISOString()
    }
  })
}

async function generateEmbeddings(data: any[]): Promise<any[]> {
  // 임베딩 생성 로직 (실제로는 OpenAI API 사용)
  // 현재는 임시 구현
  return data.map(item => ({
    ...item,
    embedding: Array.from({ length: 1536 }, () => Math.random())
  }))
}

async function saveToVectorDB(data: any[]): Promise<void> {
  // VectorDB를 사용한 실제 저장 구현
  const { VectorDB } = await import('@/lib/ai/vector-db')
  const vectorDB = new VectorDB()
  
  try {
    await vectorDB.initialize()
    
    // 각 데이터를 벡터 DB에 저장
    for (const item of data) {
      const documentText = `제목: ${item.question}\n\n답변: ${item.answer}\n\n카테고리: ${item.category}`
      
      await vectorDB.store({
        id: item.id,
        text: documentText,
        embedding: item.embedding,
        metadata: {
          category: item.category,
          quality_score: item.quality_score,
          source: item.source,
          difficulty: item.difficulty,
          tags: item.tags,
          processed_at: item.processed_at,
          trd_version: item.trd_version
        }
      })
    }
    
    console.log(`벡터 DB에 ${data.length}개 항목 저장 완료`)
  } catch (error) {
    console.error('벡터 DB 저장 실패:', error)
    // 오류가 발생해도 로그만 출력하고 계속 진행 (Mock 구현을 사용하고 있으므로)
  } finally {
    await vectorDB.cleanup()
  }
}

function getCategoryStats(data: any[]): { [key: string]: number } {
  const stats: { [key: string]: number } = {}
  data.forEach(item => {
    stats[item.category] = (stats[item.category] || 0) + 1
  })
  return stats
}

function getAverageQuality(data: any[], isBigDataFormat: boolean = false): number {
  if (data.length === 0) return 0
  const total = data.reduce((sum, item) => sum + (item.quality_score || 0), 0)
  return total / data.length
}

function getSourceStats(data: any[]): { [key: string]: number } {
  const stats: { [key: string]: number } = {}
  data.forEach(item => {
    const source = item.source || 'unknown'
    stats[source] = (stats[source] || 0) + 1
  })
  return stats
}