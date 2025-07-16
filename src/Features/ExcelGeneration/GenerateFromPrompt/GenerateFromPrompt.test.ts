import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { GenerateFromPromptHandler, GenerateFromPromptValidator } from './GenerateFromPrompt'
import { PromptToExcelConverter } from './PromptToExcelConverter'
import { ExcelBuilderService } from '../Common/ExcelBuilderService'
import { Result } from '@/Common/Result'

// Mock dependencies
jest.mock('./PromptToExcelConverter')
jest.mock('../Common/ExcelBuilderService')
jest.mock('@/Infrastructure/DependencyInjection/Container', () => ({
  container: {
    getFileStorage: () => ({
      save: jest.fn().mockResolvedValue('mock-download-url'),
    }),
    get: () => ({
      getOrCreate: jest.fn().mockResolvedValue(Result.success({
        response: { sheets: [] },
        confidence: 0.9,
        tokensUsed: 100,
        model: 'gpt-4',
        fromCache: false,
      })),
    }),
    getPrisma: () => ({
      generatedFile: {
        create: jest.fn().mockResolvedValue({}),
      },
    }),
  },
}))

describe('GenerateFromPrompt', () => {
  let handler: GenerateFromPromptHandler
  let validator: GenerateFromPromptValidator
  let mockConverter: jest.Mocked<PromptToExcelConverter>
  let mockBuilder: jest.Mocked<ExcelBuilderService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    handler = new GenerateFromPromptHandler()
    validator = new GenerateFromPromptValidator()
    
    // Get mocked instances
    mockConverter = (PromptToExcelConverter as jest.MockedClass<typeof PromptToExcelConverter>).mock.instances[0] as jest.Mocked<PromptToExcelConverter>
    mockBuilder = (ExcelBuilderService as jest.MockedClass<typeof ExcelBuilderService>).mock.instances[0] as jest.Mocked<ExcelBuilderService>
  })

  describe('Validator', () => {
    it('유효한 요청을 검증해야 함', () => {
      const request = {
        prompt: '월별 매출 데이터를 포함한 Excel 파일을 만들어주세요',
        userId: 'user123',
        options: {
          includeFormulas: true,
          includeFormatting: true,
          maxRows: 1000,
        },
      }

      const result = validator.validate(request)
      expect(result.isSuccess).toBe(true)
    })

    it('짧은 프롬프트를 거부해야 함', () => {
      const request = {
        prompt: '엑셀',
        userId: 'user123',
      }

      const result = validator.validate(request)
      expect(result.isSuccess).toBe(false)
      expect(result.error?.message).toContain('최소 10자 이상')
    })

    it('userId가 없으면 거부해야 함', () => {
      const request = {
        prompt: '월별 매출 데이터를 포함한 Excel 파일을 만들어주세요',
      }

      const result = validator.validate(request)
      expect(result.isSuccess).toBe(false)
    })
  })

  describe('Handler', () => {
    const validRequest = {
      prompt: '2024년 월별 매출 데이터와 차트를 포함한 Excel 파일을 만들어주세요',
      userId: 'user123',
      options: {
        includeFormulas: true,
        includeFormatting: true,
        maxRows: 100,
      },
    }

    it('Excel 파일을 성공적으로 생성해야 함', async () => {
      // Mock converter response
      const mockStructure = {
        sheets: [{
          name: '매출 데이터',
          columns: [
            { header: '월', key: 'month', width: 15 },
            { header: '매출액', key: 'sales', width: 20 },
          ],
          rows: [
            { month: '1월', sales: 1000000 },
            { month: '2월', sales: 1200000 },
          ],
        }],
      }

      mockConverter.convert.mockResolvedValue(Result.success({
        structure: mockStructure,
        metadata: {
          tokensUsed: 150,
          model: 'gpt-4',
          processingTime: 1000,
        },
      }))

      // Mock builder response
      const mockBuffer = Buffer.from('mock-excel-content')
      mockBuilder.build.mockResolvedValue(Result.success(mockBuffer))

      // Execute
      const result = await handler.handle(validRequest)

      // Assertions
      expect(result.isSuccess).toBe(true)
      expect(result.value?.fileName).toContain('.xlsx')
      expect(result.value?.fileSize).toBe(mockBuffer.length)
      expect(result.value?.downloadUrl).toBe('mock-download-url')
      expect(result.value?.preview.sheets).toHaveLength(1)
      expect(result.value?.metadata.tokensUsed).toBe(150)
    })

    it('변환 실패 시 오류를 반환해야 함', async () => {
      mockConverter.convert.mockResolvedValue(Result.failure({
        code: 'CONVERSION_FAILED',
        message: '변환 실패',
      }))

      const result = await handler.handle(validRequest)

      expect(result.isSuccess).toBe(false)
      expect(result.error?.code).toBe('CONVERSION_FAILED')
    })

    it('빌드 실패 시 오류를 반환해야 함', async () => {
      mockConverter.convert.mockResolvedValue(Result.success({
        structure: { sheets: [] },
        metadata: { tokensUsed: 100, model: 'gpt-4', processingTime: 1000 },
      }))

      mockBuilder.build.mockResolvedValue(Result.failure({
        code: 'BUILD_FAILED',
        message: '빌드 실패',
      }))

      const result = await handler.handle(validRequest)

      expect(result.isSuccess).toBe(false)
      expect(result.error?.code).toBe('BUILD_FAILED')
    })
  })

  describe('Integration', () => {
    it('전체 파이프라인이 정상 작동해야 함', async () => {
      const request = {
        prompt: '2024년 분기별 실적 보고서를 만들어주세요. 매출, 비용, 이익을 포함하고 차트도 추가해주세요.',
        userId: 'user123',
        options: {
          includeFormulas: true,
          includeFormatting: true,
          includeCharts: true,
          maxRows: 1000,
        },
      }

      // Validate request
      const validationResult = validator.validate(request)
      expect(validationResult.isSuccess).toBe(true)

      // Mock successful pipeline
      mockConverter.convert.mockResolvedValue(Result.success({
        structure: {
          sheets: [{
            name: '분기별 실적',
            columns: [
              { header: '분기', key: 'quarter', width: 15 },
              { header: '매출', key: 'revenue', width: 20, type: 'currency' },
              { header: '비용', key: 'cost', width: 20, type: 'currency' },
              { header: '이익', key: 'profit', width: 20, type: 'currency' },
            ],
            rows: [
              { quarter: '1분기', revenue: 10000000, cost: 7000000, profit: 3000000 },
              { quarter: '2분기', revenue: 12000000, cost: 8000000, profit: 4000000 },
              { quarter: '3분기', revenue: 15000000, cost: 9000000, profit: 6000000 },
              { quarter: '4분기', revenue: 18000000, cost: 10000000, profit: 8000000 },
            ],
            formulas: [
              { cell: 'D2', formula: '=B2-C2' },
              { cell: 'D3', formula: '=B3-C3' },
              { cell: 'D4', formula: '=B4-C4' },
              { cell: 'D5', formula: '=B5-C5' },
            ],
          }],
          metadata: {
            title: '2024년 분기별 실적 보고서',
            author: 'ExcelApp AI',
            description: 'AI가 생성한 분기별 실적 보고서',
          },
        },
        metadata: {
          tokensUsed: 250,
          model: 'gpt-4',
          processingTime: 2000,
        },
      }))

      mockBuilder.build.mockResolvedValue(Result.success(Buffer.from('excel-content')))

      // Handle request
      const result = await handler.handle(validationResult.value!)

      // Verify result
      expect(result.isSuccess).toBe(true)
      expect(result.value?.preview.sheets[0].name).toBe('분기별 실적')
      expect(result.value?.preview.sheets[0].rowCount).toBe(4)
      expect(result.value?.preview.sheets[0].columnCount).toBe(4)
      expect(result.value?.metadata.model).toBe('gpt-4')
    })
  })
})