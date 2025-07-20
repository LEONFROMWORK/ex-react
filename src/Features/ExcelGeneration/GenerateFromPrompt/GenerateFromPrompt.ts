import { z } from 'zod'
import { Result } from '@/Common/Result'
import { ExcelGenerationErrors } from '../Common/ExcelGenerationErrors'
import { PromptToExcelConverter } from './PromptToExcelConverter'
import { ExcelBuilderService } from '../Common/ExcelBuilderService'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { getExcelAnalysisCacheService } from '@/Services/Cache/ExcelAnalysisCacheService'

// Request/Response 정의
export const GenerateFromPromptRequestSchema = z.object({
  prompt: z.string().min(10, '프롬프트는 최소 10자 이상이어야 합니다.'),
  userId: z.string(),
  options: z.object({
    includeFormulas: z.boolean().default(true),
    includeFormatting: z.boolean().default(true),
    includeCharts: z.boolean().default(false),
    maxRows: z.number().min(1).max(100000).default(1000),
    maxColumns: z.number().min(1).max(1000).default(50),
  }).optional(),
})

export type GenerateFromPromptRequest = z.infer<typeof GenerateFromPromptRequestSchema>

export interface GenerateFromPromptResponse {
  fileId: string
  fileName: string
  fileSize: number
  downloadUrl: string
  preview: {
    sheets: Array<{
      name: string
      rowCount: number
      columnCount: number
      sampleData: any[][]
    }>
  }
  metadata: {
    generatedAt: Date
    prompt: string
    tokensUsed: number
    model: string
  }
}

// Validator
export class GenerateFromPromptValidator {
  validate(request: unknown): Result<GenerateFromPromptRequest> {
    try {
      const validated = GenerateFromPromptRequestSchema.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        })
      }
      return Result.failure(ExcelGenerationErrors.InvalidPrompt)
    }
  }
}

// Handler
export class GenerateFromPromptHandler {
  private converter: PromptToExcelConverter
  private builderService: ExcelBuilderService
  private fileStorage: any
  private promptCache: any
  private cacheService: any

  constructor() {
    this.converter = new PromptToExcelConverter()
    this.builderService = new ExcelBuilderService()
    
    // Get fileStorage from container - should always work now
    this.fileStorage = container.getFileStorage()
    
    // Get promptCache
    try {
      this.promptCache = container.get<any>('promptCacheService')
    } catch (e) {
      console.warn('PromptCache not available')
      this.promptCache = null
    }
    
    this.cacheService = getExcelAnalysisCacheService()
  }

  async handle(request: GenerateFromPromptRequest): Promise<Result<GenerateFromPromptResponse>> {
    try {
      // 캐시 확인
      const cachedResult = await this.cacheService.getExcelGeneration(request.prompt)
      if (cachedResult.isSuccess && cachedResult.value) {
        console.log('Excel 생성 캐시 히트')
        return Result.success(cachedResult.value)
      }
      // 1. 프롬프트를 Excel 구조로 변환 (AI 사용)
      const structureResult = await this.converter.convert(request.prompt, request.options)
      if (!structureResult.isSuccess) {
        return Result.failure(structureResult.error)
      }

      const { structure, metadata } = structureResult.value

      // 2. Excel 파일 생성
      const bufferResult = await this.builderService.build(structure)
      if (!bufferResult.isSuccess) {
        return Result.failure(bufferResult.error)
      }

      const buffer = bufferResult.value

      // 3. 파일 저장
      const fileName = this.generateFileName(request.prompt)
      const fileKey = `generated/${request.userId}/${Date.now()}_${fileName}`
      const downloadUrl = await this.fileStorage.save(buffer, fileKey)

      // 4. 메타데이터 생성
      const fileId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 5. 미리보기 데이터 생성
      const preview = this.generatePreview(structure)

      // 6. 데이터베이스에 기록 (선택사항)
      await this.saveToDatabase({
        fileId,
        userId: request.userId,
        fileName,
        fileSize: buffer.length,
        prompt: request.prompt,
        metadata,
      })

      const response: GenerateFromPromptResponse = {
        fileId,
        fileName,
        fileSize: buffer.length,
        downloadUrl,
        preview,
        metadata: {
          generatedAt: new Date(),
          prompt: request.prompt,
          tokensUsed: metadata.tokensUsed,
          model: metadata.model,
        },
      }

      // 7. 결과 캐싱
      await this.cacheService.cacheExcelGeneration(request.prompt, response)

      return Result.success(response)
    } catch (error) {
      console.error('Excel 생성 오류:', error)
      return Result.failure(ExcelGenerationErrors.GenerationFailed)
    }
  }

  private generateFileName(prompt: string): string {
    // 프롬프트에서 의미있는 파일명 생성
    const words = prompt
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')

    return `${words || 'generated'}_${new Date().toISOString().split('T')[0]}.xlsx`
  }

  private generatePreview(structure: any): any {
    return {
      sheets: structure.sheets.map((sheet: any) => ({
        name: sheet.name,
        rowCount: sheet.rows.length,
        columnCount: sheet.columns.length,
        sampleData: sheet.rows.slice(0, 5).map((row: any) => 
          sheet.columns.map((col: any) => row[col.key])
        ),
      })),
    }
  }

  private async saveToDatabase(data: any): Promise<void> {
    // Prisma를 사용한 데이터베이스 저장
    try {
      const prisma = container.getPrisma()
      await prisma.file.create({
        data: {
          id: data.fileId,
          userId: data.userId,
          fileName: data.fileName,
          originalName: data.fileName,
          fileSize: data.fileSize,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadUrl: data.downloadUrl || '',
          status: 'COMPLETED',
        },
      })
    } catch (error) {
      console.error('데이터베이스 저장 실패:', error)
      // 실패해도 계속 진행
    }
  }
}

// 통합 테스트용 Mock Handler
export class GenerateFromPromptMockHandler {
  async handle(request: GenerateFromPromptRequest): Promise<Result<GenerateFromPromptResponse>> {
    // Mock 응답 생성
    return Result.success({
      fileId: 'mock_' + Date.now(),
      fileName: 'mock_excel.xlsx',
      fileSize: 1024,
      downloadUrl: '/mock/download/url',
      preview: {
        sheets: [{
          name: 'Sheet1',
          rowCount: 10,
          columnCount: 5,
          sampleData: [
            ['Header1', 'Header2', 'Header3', 'Header4', 'Header5'],
            ['Data1', 'Data2', 'Data3', 'Data4', 'Data5'],
          ],
        }],
      },
      metadata: {
        generatedAt: new Date(),
        prompt: request.prompt,
        tokensUsed: 100,
        model: 'gpt-4',
      },
    })
  }
}