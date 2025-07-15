import { AnalyzeErrorsHandler } from './AnalyzeErrors'
import { SaveErrorPatternHandler } from '@/Features/ErrorPatterns/SaveErrorPattern'
import { prisma } from '@/lib/prisma'
import * as analyzer from '@/lib/excel/analyzer-enhanced'

jest.mock('@/lib/excel/analyzer-enhanced')
jest.mock('@/Features/ErrorPatterns/SaveErrorPattern')

describe('Excel Analysis Integration Tests', () => {
  const mockAnalyzer = analyzer as jest.Mocked<typeof analyzer>
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AnalyzeErrorsHandler', () => {
    it('should analyze Excel file and detect formula errors', async () => {
      const handler = new AnalyzeErrorsHandler()
      const mockFile = {
        id: 'file_123',
        userId: 'user_123',
        uploadUrl: '/uploads/test.xlsx',
        status: 'PENDING',
      }

      const mockAnalysisResult = {
        summary: {
          totalCells: 100,
          totalSheets: 2,
          hasErrors: true,
          errorCount: 3,
        },
        sheets: [
          {
            name: 'Sheet1',
            formulaErrors: [
              { cell: 'A1', formula: '=1/0', error: '#DIV/0!' },
              { cell: 'B2', formula: '=VLOOKUP()', error: '#N/A' },
            ],
          },
        ],
        errors: [
          {
            type: 'FORMULA_ERROR',
            location: { sheet: 'Sheet1', cell: 'A1' },
            description: 'Division by zero',
            value: '#DIV/0!',
          },
        ],
      }

      ;(prisma.file.findFirst as jest.Mock).mockResolvedValue(mockFile)
      ;(prisma.file.update as jest.Mock).mockResolvedValue({})
      ;(mockAnalyzer.analyzeExcelFile as jest.Mock).mockResolvedValue(mockAnalysisResult)
      ;(prisma.analysis.create as jest.Mock).mockResolvedValue({
        id: 'analysis_123',
        fileId: 'file_123',
        errors: mockAnalysisResult.errors,
      })

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisType: 'basic',
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.errors).toHaveLength(2)
      expect(result.value?.summary.totalErrors).toBe(2)
      expect(prisma.analysis.create).toHaveBeenCalled()
    })

    it('should save error patterns for ML training', async () => {
      const handler = new AnalyzeErrorsHandler()
      const mockSavePattern = SaveErrorPatternHandler.prototype.handle as jest.Mock
      
      const mockFile = {
        id: 'file_123',
        userId: 'user_123',
        uploadUrl: '/uploads/test.xlsx',
      }

      ;(prisma.file.findFirst as jest.Mock).mockResolvedValue(mockFile)
      ;(mockAnalyzer.analyzeExcelFile as jest.Mock).mockResolvedValue({
        sheets: [{
          name: 'Sheet1',
          formulaErrors: [{ cell: 'A1', error: '#DIV/0!' }],
        }],
      })
      ;(prisma.analysis.create as jest.Mock).mockResolvedValue({ id: 'analysis_123' })
      
      await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisType: 'basic',
      })

      // Verify error patterns were saved
      expect(SaveErrorPatternHandler).toHaveBeenCalled()
    })

    it('should handle analysis failures gracefully', async () => {
      const handler = new AnalyzeErrorsHandler()
      
      ;(prisma.file.findFirst as jest.Mock).mockResolvedValue({
        id: 'file_123',
        uploadUrl: '/uploads/test.xlsx',
      })
      ;(mockAnalyzer.analyzeExcelFile as jest.Mock).mockRejectedValue(
        new Error('Corrupted file')
      )

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisType: 'basic',
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('Excel.AnalysisFailed')
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file_123' },
        data: { status: 'FAILED' },
      })
    })

    it('should calculate token usage for AI analysis', async () => {
      const handler = new AnalyzeErrorsHandler()
      
      ;(prisma.file.findFirst as jest.Mock).mockResolvedValue({
        id: 'file_123',
        uploadUrl: '/uploads/test.xlsx',
      })
      ;(mockAnalyzer.analyzeExcelFile as jest.Mock).mockResolvedValue({
        sheets: [{ name: 'Sheet1', formulaErrors: [] }],
      })
      ;(prisma.analysis.create as jest.Mock).mockResolvedValue({
        id: 'analysis_123',
        tokensUsed: 150,
        estimatedCost: 0.003,
      })

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisType: 'ai',
      })

      expect(result.isSuccess).toBe(true)
      expect(prisma.analysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          aiTier: expect.any(String),
          tokensUsed: expect.any(Number),
        }),
      })
    })
  })
})