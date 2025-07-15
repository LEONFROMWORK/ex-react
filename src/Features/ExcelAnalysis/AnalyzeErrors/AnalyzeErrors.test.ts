import { describe, it, expect, beforeEach, vi } from "vitest"
import { AnalyzeErrorsHandler, AnalyzeErrorsValidator } from "./AnalyzeErrors"
import { EnhancedExcelAnalyzer } from "@/lib/excel/analyzer-enhanced"
import { prisma } from "@/lib/prisma"
import { TestDataBuilder } from "@/test/TestDataBuilder"

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    analysis: {
      create: vi.fn(),
    },
    aIUsageStats: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/excel/analyzer-enhanced")
vi.mock("@/lib/ai/analyzer")

describe("AnalyzeErrors Feature", () => {
  let handler: AnalyzeErrorsHandler
  let mockAnalyzer: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockAnalyzer = {
      analyzeFile: vi.fn(),
      fixErrors: vi.fn(),
    }
    handler = new AnalyzeErrorsHandler(mockAnalyzer)
  })

  describe("Validator", () => {
    it("should validate valid request", () => {
      const request = {
        fileId: "file123",
        userId: "user123",
        options: {
          autoCorrect: true,
          deepAnalysis: false,
          aiTier: "auto" as const,
        },
      }

      const result = AnalyzeErrorsValidator.validate(request)
      expect(result.isSuccess).toBe(true)
    })

    it("should reject invalid request", () => {
      const request = {
        fileId: "", // Invalid empty string
        userId: "user123",
      }

      const result = AnalyzeErrorsValidator.validate(request)
      expect(result.isFailure).toBe(true)
    })
  })

  describe("Handler", () => {
    it("should analyze file successfully", async () => {
      // Arrange
      const mockFile = TestDataBuilder.createMockFile()
      const mockAnalysisResult = {
        success: true,
        totalErrors: 5,
        errors: TestDataBuilder.createMockErrors(5),
        summary: "5 errors found",
      }

      prisma.file.findFirst = vi.fn().mockResolvedValue(mockFile)
      mockAnalyzer.analyzeFile.mockResolvedValue(mockAnalysisResult)
      prisma.analysis.create = vi.fn().mockResolvedValue({
        id: "analysis123",
      })

      const request = {
        fileId: "file123",
        userId: "user123",
        options: {
          autoCorrect: false,
          deepAnalysis: false,
        },
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.analysisId).toBe("analysis123")
      expect(result.value.totalErrors).toBe(5)
      expect(result.value.status).toBe("completed")
    })

    it("should handle file not found", async () => {
      // Arrange
      prisma.file.findFirst = vi.fn().mockResolvedValue(null)

      const request = {
        fileId: "nonexistent",
        userId: "user123",
        options: {},
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isFailure).toBe(true)
      expect(result.error.code).toBe("FILE_NOT_FOUND")
    })

    it("should handle analysis failure", async () => {
      // Arrange
      const mockFile = TestDataBuilder.createMockFile()
      prisma.file.findFirst = vi.fn().mockResolvedValue(mockFile)
      mockAnalyzer.analyzeFile.mockResolvedValue({
        success: false,
        totalErrors: 0,
        errors: [],
        summary: "Analysis failed",
      })

      const request = {
        fileId: "file123",
        userId: "user123",
        options: {},
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isFailure).toBe(true)
      expect(result.error.code).toBe("PROCESSING_FAILED")
    })

    it("should perform deep analysis when requested", async () => {
      // Arrange
      const mockFile = TestDataBuilder.createMockFile()
      const mockAnalysisResult = {
        success: true,
        totalErrors: 10,
        errors: TestDataBuilder.createMockErrors(10),
        summary: "10 errors found",
      }

      const mockAIAnalysis = {
        corrections: TestDataBuilder.createMockCorrections(8),
        insights: "Complex formula errors detected",
        confidence: 0.85,
        tier: "TIER2",
        tokensUsed: 1500,
        cost: 0.045,
      }

      prisma.file.findFirst = vi.fn().mockResolvedValue(mockFile)
      mockAnalyzer.analyzeFile.mockResolvedValue(mockAnalysisResult)
      
      // Mock AI analyzer
      const analyzeWithAI = vi.fn().mockResolvedValue(mockAIAnalysis)
      vi.doMock("@/lib/ai/analyzer", () => ({ analyzeWithAI }))

      const request = {
        fileId: "file123",
        userId: "user123",
        options: {
          autoCorrect: false,
          deepAnalysis: true,
          aiTier: "auto" as const,
        },
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.aiAnalysisPerformed).toBe(true)
      expect(result.value.corrections).toBe(8)
    })
  })
})