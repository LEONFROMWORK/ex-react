import { CorrectWithAIHandler } from './CorrectWithAI'
import { ConsumeTokensHandler } from '@/Features/Billing/TokenManagement/ConsumeTokens'
import { prisma } from '@/lib/prisma'
import * as aiAnalyzer from '@/lib/ai/analyzer'
import * as XLSX from 'xlsx'

jest.mock('@/lib/ai/analyzer')
jest.mock('@/Features/Billing/TokenManagement/ConsumeTokens')
jest.mock('xlsx')
jest.mock('fs/promises')

describe('AI Correction with Partial Success Tests', () => {
  const mockAI = aiAnalyzer as jest.Mocked<typeof aiAnalyzer>
  const mockConsumeTokens = ConsumeTokensHandler.prototype.handle as jest.Mock
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsumeTokens.mockResolvedValue({ success: true })
  })

  describe('CorrectWithAIHandler', () => {
    it('should apply full token charge for 100% success', async () => {
      const handler = new CorrectWithAIHandler()
      
      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errors: [
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'A1' } },
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'B2' } },
        ],
        file: {
          id: 'file_123',
          uploadUrl: '/uploads/test.xlsx',
        },
      }

      const mockAIResult = {
        tier: 'TIER1',
        confidence: 95,
        corrections: [
          { location: 'A1', corrected: true, formula: '=SUM(A2:A10)' },
          { location: 'B2', corrected: true, formula: '=AVERAGE(B3:B10)' },
        ],
        insights: 'All errors successfully corrected',
        tokensUsed: 200,
        promptTokens: 100,
        completionTokens: 100,
        cost: 0.004,
      }

      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis)
      ;(mockAI.analyzeWithAI as jest.Mock).mockResolvedValue(mockAIResult)
      ;(XLSX.read as jest.Mock).mockReturnValue({ Sheets: { Sheet1: {} } })
      ;(XLSX.write as jest.Mock).mockReturnValue(Buffer.from('corrected'))
      ;(prisma.correction.create as jest.Mock).mockResolvedValue({ id: 'correction_123' })
      ;(prisma.aIUsageStats.upsert as jest.Mock).mockResolvedValue({})

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisId: 'analysis_123',
        aiTier: 'auto',
        autoApply: true,
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.totalErrors).toBe(2)
      expect(result.value?.correctedErrors).toBe(2)
      expect(result.value?.successRate).toBe(100)
      expect(result.value?.tokensUsed).toBe(200)
      expect(result.value?.tokensCharged).toBe(200) // Full charge
      expect(result.value?.partialSuccess).toBe(false)

      expect(mockConsumeTokens).toHaveBeenCalledWith({
        userId: 'user_123',
        amount: 200, // Full token amount
        feature: 'excel_correction',
        metadata: expect.objectContaining({
          successRate: 100,
          partialSuccess: false,
          discount: 'none',
        }),
      })
    })

    it('should apply 50% token discount for low success rate', async () => {
      const handler = new CorrectWithAIHandler()
      
      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errors: [
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'A1' } },
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'B2' } },
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'C3' } },
          { type: 'formula', location: { sheet: 'Sheet1', cell: 'D4' } },
        ],
        file: { id: 'file_123', uploadUrl: '/uploads/test.xlsx' },
      }

      const mockAIResult = {
        tier: 'TIER2',
        confidence: 60,
        corrections: [
          { location: 'A1', corrected: true, formula: '=SUM(A2:A10)' },
          { location: 'B2', corrected: false, suggestion: 'Manual review needed' },
          { location: 'C3', corrected: false, suggestion: 'Complex formula' },
          { location: 'D4', corrected: false, suggestion: 'Reference error' },
        ],
        insights: 'Partial correction completed',
        tokensUsed: 400,
        promptTokens: 200,
        completionTokens: 200,
        cost: 0.008,
      }

      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis)
      ;(mockAI.analyzeWithAI as jest.Mock).mockResolvedValue(mockAIResult)
      ;(XLSX.read as jest.Mock).mockReturnValue({ Sheets: { Sheet1: {} } })
      ;(XLSX.write as jest.Mock).mockReturnValue(Buffer.from('partially corrected'))
      ;(prisma.correction.create as jest.Mock).mockResolvedValue({ id: 'correction_123' })
      ;(prisma.aIUsageStats.upsert as jest.Mock).mockResolvedValue({})

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisId: 'analysis_123',
        aiTier: 'premium',
        autoApply: true,
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.totalErrors).toBe(4)
      expect(result.value?.correctedErrors).toBe(1)
      expect(result.value?.failedCorrections).toBe(3)
      expect(result.value?.successRate).toBe(25) // 1/4 = 25%
      expect(result.value?.tokensUsed).toBe(400)
      expect(result.value?.tokensCharged).toBe(200) // 50% discount applied
      expect(result.value?.partialSuccess).toBe(true)

      expect(mockConsumeTokens).toHaveBeenCalledWith({
        userId: 'user_123',
        amount: 200, // 50% of 400
        feature: 'excel_correction',
        metadata: expect.objectContaining({
          successRate: 25,
          partialSuccess: true,
          discount: '50%',
        }),
      })
    })

    it('should save resolution failures for ML training', async () => {
      const handler = new CorrectWithAIHandler()
      
      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errors: [{ type: 'formula', location: { sheet: 'Sheet1', cell: 'A1' } }],
        file: { id: 'file_123', uploadUrl: '/uploads/test.xlsx' },
      }

      const mockAIResult = {
        tier: 'TIER1',
        corrections: [
          { location: 'A1', corrected: false, suggestion: 'Cannot resolve' },
        ],
        tokensUsed: 100,
        cost: 0.002,
      }

      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis)
      ;(mockAI.analyzeWithAI as jest.Mock).mockResolvedValue(mockAIResult)
      ;(prisma.correction.create as jest.Mock).mockResolvedValue({ id: 'correction_123' })
      ;(prisma.errorResolutionFailure.create as jest.Mock).mockResolvedValue({})

      await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisId: 'analysis_123',
        aiTier: 'auto',
        autoApply: false,
      })

      expect(prisma.errorResolutionFailure.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId: 'file_123',
          userId: 'user_123',
          failureReason: expect.any(String),
        }),
      })
    })

    it('should handle insufficient tokens gracefully', async () => {
      const handler = new CorrectWithAIHandler()
      
      mockConsumeTokens.mockResolvedValue({ 
        success: false, 
        error: 'Insufficient tokens' 
      })

      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errors: [{ type: 'formula' }],
        file: { id: 'file_123', uploadUrl: '/uploads/test.xlsx' },
      }

      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis)
      ;(mockAI.analyzeWithAI as jest.Mock).mockResolvedValue({
        tokensUsed: 100,
        corrections: [],
      })

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        analysisId: 'analysis_123',
        aiTier: 'auto',
        autoApply: true,
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('INSUFFICIENT_TOKENS')
    })
  })
})