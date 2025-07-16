import { z } from 'zod'
import { Result } from '@/Common/Result'
import { ExcelGenerationErrors } from '../Common/ExcelGenerationErrors'
import { ExcelBuilderService } from '../Common/ExcelBuilderService'
import { TemplateEngine } from './TemplateEngine'
import { TemplateService } from '../Common/ExcelTemplates'
import { container } from '@/Infrastructure/DependencyInjection/Container'

// Request/Response 정의
export const GenerateFromTemplateRequestSchema = z.object({
  templateId: z.string().min(1, '템플릿 ID는 필수입니다.'),
  userId: z.string(),
  data: z.record(z.any()).optional(),
  options: z.object({
    fillSampleData: z.boolean().default(false),
    applyFormatting: z.boolean().default(true),
    includeFormulas: z.boolean().default(true),
    customization: z.object({
      companyName: z.string().optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
    }).optional(),
  }).optional(),
})

export type GenerateFromTemplateRequest = z.infer<typeof GenerateFromTemplateRequestSchema>

export interface GenerateFromTemplateResponse {
  fileId: string
  fileName: string
  fileSize: number
  downloadUrl: string
  templateInfo: {
    id: string
    name: string
    category: string
  }
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
    templateId: string
    customized: boolean
  }
}

// Validator
export class GenerateFromTemplateValidator {
  validate(request: unknown): Result<GenerateFromTemplateRequest> {
    try {
      const validated = GenerateFromTemplateRequestSchema.parse(request)
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
export class GenerateFromTemplateHandler {
  private templateService: TemplateService
  private templateEngine: TemplateEngine
  private builderService: ExcelBuilderService
  private fileStorage = container.getFileStorage()

  constructor() {
    this.templateService = new TemplateService()
    this.templateEngine = new TemplateEngine()
    this.builderService = new ExcelBuilderService()
  }

  async handle(request: GenerateFromTemplateRequest): Promise<Result<GenerateFromTemplateResponse>> {
    try {
      // 1. 템플릿 로드
      const template = this.templateService.getById(request.templateId)
      if (!template) {
        return Result.failure(ExcelGenerationErrors.TemplateNotFound)
      }

      // 2. 템플릿 처리 (데이터 주입, 커스터마이징)
      const processedStructure = await this.templateEngine.process(
        template,
        request.data || {},
        request.options
      )
      if (!processedStructure.isSuccess) {
        return Result.failure(processedStructure.error)
      }

      // 3. Excel 파일 생성
      const bufferResult = await this.builderService.build(processedStructure.value)
      if (!bufferResult.isSuccess) {
        return Result.failure(bufferResult.error)
      }

      const buffer = bufferResult.value

      // 4. 파일 저장
      const fileName = this.generateFileName(template.name, request.options?.customization?.companyName)
      const fileKey = `templates/${request.userId}/${Date.now()}_${fileName}`
      const downloadUrl = await this.fileStorage.save(buffer, fileKey)

      // 5. 메타데이터 생성
      const fileId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 6. 미리보기 데이터 생성
      const preview = this.generatePreview(processedStructure.value)

      // 7. 데이터베이스에 기록
      await this.saveToDatabase({
        fileId,
        userId: request.userId,
        templateId: request.templateId,
        fileName,
        fileSize: buffer.length,
        customization: request.options?.customization,
      })

      return Result.success({
        fileId,
        fileName,
        fileSize: buffer.length,
        downloadUrl,
        templateInfo: {
          id: template.id,
          name: template.name,
          category: template.category,
        },
        preview,
        metadata: {
          generatedAt: new Date(),
          templateId: request.templateId,
          customized: !!request.options?.customization,
        },
      })
    } catch (error) {
      console.error('템플릿 기반 Excel 생성 오류:', error)
      return Result.failure(ExcelGenerationErrors.GenerationFailed)
    }
  }

  private generateFileName(templateName: string, companyName?: string): string {
    const baseName = templateName.toLowerCase().replace(/\s+/g, '_')
    const prefix = companyName ? 
      companyName.toLowerCase().replace(/\s+/g, '_') + '_' : ''
    const date = new Date().toISOString().split('T')[0]
    
    return `${prefix}${baseName}_${date}.xlsx`
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
    try {
      const prisma = container.getPrisma()
      await prisma.generatedFile.create({
        data: {
          fileId: data.fileId,
          userId: data.userId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          templateId: data.templateId,
          customization: data.customization,
          createdAt: new Date(),
        },
      })
    } catch (error) {
      console.error('데이터베이스 저장 실패:', error)
      // 실패해도 계속 진행
    }
  }
}

// 사용 가능한 템플릿 목록 조회
export class GetAvailableTemplatesHandler {
  private templateService: TemplateService

  constructor() {
    this.templateService = new TemplateService()
  }

  async handle(request: { 
    category?: string
    searchQuery?: string 
    limit?: number 
  }): Promise<Result<{
    templates: Array<{
      id: string
      name: string
      description: string
      category: string
      tags: string[]
      popularity: number
      thumbnail?: string
    }>
    total: number
  }>> {
    try {
      let templates = this.templateService.getAll()

      // 카테고리 필터링
      if (request.category) {
        templates = templates.filter(t => t.category === request.category)
      }

      // 검색어 필터링
      if (request.searchQuery) {
        templates = this.templateService.searchByName(request.searchQuery)
      }

      // 인기순 정렬
      templates = templates.sort((a, b) => b.popularity - a.popularity)

      // 제한 적용
      if (request.limit) {
        templates = templates.slice(0, request.limit)
      }

      const result = templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        popularity: t.popularity,
        thumbnail: t.thumbnail,
      }))

      return Result.success({
        templates: result,
        total: result.length,
      })
    } catch (error) {
      console.error('템플릿 목록 조회 오류:', error)
      return Result.failure({
        code: 'TEMPLATE_LIST_ERROR',
        message: '템플릿 목록을 조회하는 중 오류가 발생했습니다.',
      })
    }
  }
}