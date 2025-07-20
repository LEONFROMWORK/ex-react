import { describe, it, expect, beforeEach, vi } from "vitest"
import { SendChatMessageHandler, SendChatMessageValidator, ChatIntentClassifier } from "./SendChatMessage"
import { TestDataBuilder } from "@/test/TestDataBuilder"

// Mock OpenAI
vi.mock("openai", () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}))

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: {
      create: vi.fn(),
    },
    chatMessage: {
      createMany: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
    },
  },
}))

describe("SendChatMessage Feature", () => {
  let handler: SendChatMessageHandler
  let mockOpenAI: any

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new SendChatMessageHandler()
    mockOpenAI = (handler as any).openai
  })

  describe("Validator", () => {
    it("should validate valid request", () => {
      const request = {
        userId: "user123",
        message: "월별 매출 관리 엑셀 파일을 만들어줘",
        preferredTier: "ECONOMY" as const,
      }

      const result = SendChatMessageValidator.validate(request)
      expect(result.isSuccess).toBe(true)
    })

    it("should reject empty message", () => {
      const request = {
        userId: "user123",
        message: "",
      }

      const result = SendChatMessageValidator.validate(request)
      expect(result.isFailure).toBe(true)
    })

    it("should reject message exceeding max length", () => {
      const request = {
        userId: "user123",
        message: "a".repeat(4001), // Over 4000 char limit
      }

      const result = SendChatMessageValidator.validate(request)
      expect(result.isFailure).toBe(true)
    })
  })

  describe("ChatIntentClassifier", () => {
    it("should classify simple template requests", () => {
      const simpleMessages = [
        "간단한 템플릿 만들어줘",
        "기본 양식 필요해요",
        "simple template please",
      ]

      simpleMessages.forEach(message => {
        expect(ChatIntentClassifier.classifyIntent(message)).toBe("simple")
      })
    })

    it("should classify complex requests", () => {
      const complexMessages = [
        "복잡한 분석이 필요한 엑셀 파일",
        "맞춤형 대시보드를 만들어주세요",
        "최적화된 재무 모델링 시트",
      ]

      complexMessages.forEach(message => {
        expect(ChatIntentClassifier.classifyIntent(message)).toBe("complex")
      })
    })

    it("should request clarification for unclear messages", () => {
      const unclearMessages = [
        "엑셀",
        "도와줘",
        "파일",
      ]

      unclearMessages.forEach(message => {
        expect(ChatIntentClassifier.classifyIntent(message)).toBe("clarification_needed")
      })
    })
  })

  describe("Handler", () => {
    it("should handle Tier 1 request successfully", async () => {
      // Arrange
      const mockCompletion = {
        choices: [{
          message: {
            content: "월별 매출 관리 템플릿을 만들어드리겠습니다. 기본 템플릿으로 진행하겠습니다.",
          },
        }],
        usage: {
          total_tokens: 100,
        },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)
      ;(handler as any).prisma.chatConversation.create.mockResolvedValue({
        id: "conv123",
      })

      const request = {
        userId: "user123",
        message: "간단한 매출 템플릿 만들어줘",
        preferredTier: "ECONOMY" as const,
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.aiTier).toBe("TIER1")
      expect(result.value.tokensUsed).toBe(100)
      expect(result.value.estimatedCost).toBeLessThan(0.01)
    })

    it("should escalate to Tier 2 when needed", async () => {
      // Arrange
      const tier1Completion = {
        choices: [{
          message: {
            content: "이 요청은 고급 AI 분석이 필요합니다.",
          },
        }],
        usage: { total_tokens: 50 },
      }

      const tier2Completion = {
        choices: [{
          message: {
            content: "복잡한 재무 모델링 템플릿을 생성했습니다. [상세 내용...]",
          },
        }],
        usage: { total_tokens: 500 },
      }

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(tier1Completion)
        .mockResolvedValueOnce(tier2Completion)

      const request = {
        userId: "user123",
        message: "복잡한 재무 모델링 템플릿",
        preferredTier: "ECONOMY" as const,
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.aiTier).toBe("TIER2")
      expect(result.value.tokensUsed).toBe(500)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2)
    })

    it("should handle clarification requests", async () => {
      // Arrange
      const request = {
        userId: "user123",
        message: "엑셀",
        preferredTier: "ECONOMY" as const,
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.response).toContain("명확하지 않습니다")
      expect(result.value.suggestions).toContain("기본 템플릿 선택")
      expect(result.value.tokensUsed).toBe(0)
    })

    it("should include file context when provided", async () => {
      // Arrange
      const mockFile = {
        ...TestDataBuilder.createMockFile(),
        analyses: [{
          report: { totalErrors: 15 },
        }],
      }

      ;(handler as any).prisma.file.findUnique.mockResolvedValue(mockFile)

      const mockCompletion = {
        choices: [{
          message: {
            content: "파일 분석 결과를 바탕으로 수정 방안을 제시합니다.",
          },
        }],
        usage: { total_tokens: 150 },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)

      const request = {
        userId: "user123",
        message: "이 파일의 오류를 수정해줘",
        context: {
          fileId: "file123",
        },
        preferredTier: "ECONOMY" as const,
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect(result.isSuccess).toBe(true)
      expect((handler as any).prisma.file.findUnique).toHaveBeenCalledWith({
        where: { id: "file123" },
        include: { analyses: { take: 1 } },
      })
    })

    it("should save conversation history", async () => {
      // Arrange
      const mockCompletion = {
        choices: [{
          message: { content: "템플릿을 생성했습니다." },
        }],
        usage: { total_tokens: 80 },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)
      ;(handler as any).prisma.chatConversation.create.mockResolvedValue({
        id: "conv123",
      })

      const request = {
        userId: "user123",
        message: "템플릿 만들어줘",
        preferredTier: "ECONOMY" as const,
      }

      // Act
      const result = await handler.handle(request)

      // Assert
      expect((handler as any).prisma.chatMessage.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            conversationId: "conv123",
            role: "user",
            content: "템플릿 만들어줘",
          }),
          expect.objectContaining({
            conversationId: "conv123",
            role: "assistant",
            content: "템플릿을 생성했습니다.",
            tokensUsed: 80,
            aiTier: "TIER1",
          }),
        ]),
      })
    })
  })
})