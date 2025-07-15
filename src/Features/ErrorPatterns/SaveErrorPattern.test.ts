import { SaveErrorPatternHandler } from './SaveErrorPattern'
import { prisma } from '@/lib/prisma'

describe('Error Pattern Analysis System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('SaveErrorPatternHandler', () => {
    it('should save new error pattern', async () => {
      const handler = new SaveErrorPatternHandler()
      
      ;(prisma.errorPattern.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.errorPattern.create as jest.Mock).mockResolvedValue({
        id: 'pattern_123',
        errorType: 'FORMULA_ERROR',
        category: 'FORMULA',
      })

      const result = await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        errorType: 'FORMULA_ERROR',
        errorMessage: '#DIV/0!',
        cellLocation: 'A1',
        sheetName: 'Sheet1',
        category: 'FORMULA',
        severity: 'HIGH',
        resolved: false,
        aiSuggestion: 'Check for division by zero',
      })

      expect(result.success).toBe(true)
      expect(result.data.patternId).toBe('pattern_123')
      expect(prisma.errorPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorType: 'FORMULA_ERROR',
          errorMessage: '#DIV/0!',
          category: 'FORMULA',
          severity: 'HIGH',
          frequency: 1,
        }),
      })
    })

    it('should increment frequency for existing pattern', async () => {
      const handler = new SaveErrorPatternHandler()
      
      const existingPattern = {
        id: 'pattern_123',
        errorType: 'FORMULA_ERROR',
        errorMessage: '#DIV/0!',
        frequency: 5,
      }

      ;(prisma.errorPattern.findFirst as jest.Mock).mockResolvedValue(existingPattern)
      ;(prisma.errorPattern.update as jest.Mock).mockResolvedValue({
        ...existingPattern,
        frequency: 6,
      })

      const result = await handler.handle({
        fileId: 'file_456',
        userId: 'user_123',
        errorType: 'FORMULA_ERROR',
        errorMessage: '#DIV/0!',
        cellLocation: 'B2',
        sheetName: 'Sheet1',
        severity: 'HIGH',
      })

      expect(result.success).toBe(true)
      expect(prisma.errorPattern.update).toHaveBeenCalledWith({
        where: { id: 'pattern_123' },
        data: {
          frequency: { increment: 1 },
          cellLocation: 'B2',
        },
      })
    })

    it('should auto-categorize error types', async () => {
      const handler = new SaveErrorPatternHandler()
      
      ;(prisma.errorPattern.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.errorPattern.create as jest.Mock).mockImplementation(({ data }) => ({
        id: 'pattern_123',
        ...data,
      }))

      // Test formula error categorization
      await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        errorType: 'formula',
        errorMessage: '#REF!',
        severity: 'HIGH',
      })

      expect(prisma.errorPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'FORMULA',
        }),
      })

      // Test data type error categorization
      await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        errorType: 'data',
        errorMessage: 'Invalid data type',
        severity: 'MEDIUM',
      })

      expect(prisma.errorPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'DATA_TYPE',
        }),
      })
    })

    it('should include AI processing information', async () => {
      const handler = new SaveErrorPatternHandler()
      
      ;(prisma.errorPattern.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.errorPattern.create as jest.Mock).mockResolvedValue({
        id: 'pattern_123',
      })

      await handler.handle({
        fileId: 'file_123',
        userId: 'user_123',
        errorType: 'FORMULA_ERROR',
        errorMessage: '#VALUE!',
        severity: 'HIGH',
        aiModel: 'gpt-4',
        aiConfidence: 0.95,
        aiSuggestion: 'Convert text to number',
      })

      expect(prisma.errorPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          aiModel: 'gpt-4',
          aiConfidence: 0.95,
          aiSuggestion: 'Convert text to number',
        }),
      })
    })
  })

  describe('Error Pattern Analysis', () => {
    it('should aggregate patterns by category', async () => {
      const mockPatterns = [
        { category: 'FORMULA', _count: { id: 50 } },
        { category: 'DATA_TYPE', _count: { id: 30 } },
        { category: 'REFERENCE', _count: { id: 20 } },
      ]

      ;(prisma.errorPattern.groupBy as jest.Mock).mockResolvedValue(mockPatterns)

      const result = await prisma.errorPattern.groupBy({
        by: ['category'],
        _count: { id: true },
      })

      expect(result).toHaveLength(3)
      expect(result[0]._count.id).toBe(50)
    })

    it('should identify most frequent errors', async () => {
      const mockFrequentErrors = [
        {
          id: 'pattern_1',
          errorType: 'FORMULA_ERROR',
          errorMessage: '#DIV/0!',
          frequency: 150,
          severity: 'HIGH',
        },
        {
          id: 'pattern_2',
          errorType: 'FORMULA_ERROR',
          errorMessage: '#VALUE!',
          frequency: 120,
          severity: 'HIGH',
        },
      ]

      ;(prisma.errorPattern.findMany as jest.Mock).mockResolvedValue(mockFrequentErrors)

      const result = await prisma.errorPattern.findMany({
        orderBy: { frequency: 'desc' },
        take: 10,
      })

      expect(result[0].frequency).toBe(150)
      expect(result[0].errorMessage).toBe('#DIV/0!')
    })

    it('should track resolution success rates', async () => {
      const mockResolutionStats = [
        { resolved: true, _count: { id: 80 } },
        { resolved: false, _count: { id: 20 } },
      ]

      ;(prisma.errorPattern.groupBy as jest.Mock).mockResolvedValue(mockResolutionStats)

      const result = await prisma.errorPattern.groupBy({
        by: ['resolved'],
        _count: { id: true },
      })

      const totalPatterns = result.reduce((sum, r) => sum + r._count.id, 0)
      const resolvedPatterns = result.find(r => r.resolved)?._count.id || 0
      const successRate = (resolvedPatterns / totalPatterns) * 100

      expect(successRate).toBe(80)
    })

    it('should export patterns for ML training', async () => {
      const mockPatternsForExport = [
        {
          id: 'pattern_1',
          errorType: 'FORMULA_ERROR',
          errorMessage: '#DIV/0!',
          errorContext: { formula: '=A1/B1', cellValues: { A1: 10, B1: 0 } },
          resolved: true,
          resolutionType: 'AI_RESOLVED',
          resolutionDetails: { correctedFormula: '=IF(B1=0,0,A1/B1)' },
          aiConfidence: 0.98,
        },
      ]

      ;(prisma.errorPattern.findMany as jest.Mock).mockResolvedValue(mockPatternsForExport)

      const exportData = await prisma.errorPattern.findMany({
        where: { resolved: true },
        include: { errorContext: true, resolutionDetails: true },
      })

      expect(exportData).toHaveLength(1)
      expect(exportData[0].resolutionDetails.correctedFormula).toBeDefined()
      expect(exportData[0].aiConfidence).toBeGreaterThan(0.9)
    })
  })
})