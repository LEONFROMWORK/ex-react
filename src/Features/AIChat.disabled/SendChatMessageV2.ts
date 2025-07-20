import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"
import { FineTuningLogger } from "@/lib/fine-tuning/logger"
import { AIModelManager } from "@/lib/ai/model-manager"
import { ModelSelectionCriteria } from "@/lib/ai/types"

// Request/Response types (same as before)
export class SendChatMessage {
  static readonly Request = z.object({
    userId: z.string(),
    message: z.string().min(1).max(4000),
    context: z.object({
      fileId: z.string().optional(),
      analysisId: z.string().optional(),
      conversationId: z.string().optional(),
    }).optional(),
    preferredTier: z.enum(["ECONOMY", "PREMIUM"]).default("ECONOMY"),
    preferredModel: z.string().optional(), // Allow user to specify preferred model
  })

  static readonly Response = z.object({
    conversationId: z.string(),
    messageId: z.string(),
    response: z.string(),
    tokensUsed: z.number(),
    estimatedCost: z.number(),
    aiTier: z.enum(["TIER1", "TIER2"]),
    modelUsed: z.string(), // Which model was actually used
    provider: z.string(), // Which provider was used
    suggestions: z.array(z.string()).optional(),
    attachments: z.array(z.object({
      type: z.enum(["excel_template", "code_snippet", "chart"]),
      content: z.any(),
    })).optional(),
  })
}

export type SendChatMessageRequest = z.infer<typeof SendChatMessage.Request>
export type SendChatMessageResponse = z.infer<typeof SendChatMessage.Response>

// Validator (same as before)
export class SendChatMessageValidator {
  static validate(request: unknown): Result<SendChatMessageRequest> {
    try {
      const validated = SendChatMessage.Request.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "VALIDATION_ERROR",
          message: error.errors.map(e => e.message).join(", "),
        })
      }
      return Result.failure({
        code: "INVALID_REQUEST",
        message: "잘못된 요청입니다.",
      })
    }
  }
}

// Intent classifier for task complexity
export class ChatIntentClassifier {
  static classifyComplexity(message: string): "SIMPLE" | "MEDIUM" | "COMPLEX" {
    const simplePatterns = [
      /템플릿|template|양식/i,
      /간단한|기본|basic|simple/i,
      /만들어|생성|create|make/i,
    ]
    
    const complexPatterns = [
      /복잡한|complex|advanced/i,
      /맞춤|custom|personalized/i,
      /분석|analysis|analyze/i,
      /최적화|optimize/i,
      /대량|bulk|multiple/i,
      /자동화|automate/i,
    ]
    
    const isSimple = simplePatterns.some(pattern => pattern.test(message))
    const isComplex = complexPatterns.some(pattern => pattern.test(message))
    
    if (isComplex) return "COMPLEX"
    if (isSimple && !isComplex) return "SIMPLE"
    
    // Default based on message length and complexity
    return message.length < 50 ? "SIMPLE" : "MEDIUM"
  }

  static classifyTaskType(message: string): string {
    const taskPatterns = [
      { pattern: /엑셀.*분석|excel.*analy|데이터.*검토/i, type: "EXCEL_ANALYSIS" },
      { pattern: /오류.*수정|error.*fix|문제.*해결/i, type: "ERROR_CORRECTION" },
      { pattern: /수식|formula|함수|function/i, type: "FORMULA_GENERATION" },
      { pattern: /생성|만들|create|make|새로/i, type: "CREATE" },
      { pattern: /수정|고치|fix|correct/i, type: "CORRECT" },
      { pattern: /변환|convert|transform/i, type: "TRANSFORM" },
    ]
    
    for (const { pattern, type } of taskPatterns) {
      if (pattern.test(message)) {
        return type
      }
    }
    
    return "GENERAL"
  }
}

// Handler with AI Model Manager
export class SendChatMessageHandler {
  private aiManager: AIModelManager
  private fineTuningLogger: FineTuningLogger

  constructor() {
    this.aiManager = AIModelManager.getInstance()
    this.fineTuningLogger = new FineTuningLogger()
  }

  async handle(request: SendChatMessageRequest): Promise<Result<SendChatMessageResponse>> {
    try {
      // Initialize AI Manager if needed
      await this.aiManager.initialize()

      // Get or create conversation
      const conversationId = request.context?.conversationId || 
        await this.createNewConversation(request.userId)

      // Classify intent and complexity
      const complexity = ChatIntentClassifier.classifyComplexity(request.message)
      const taskType = ChatIntentClassifier.classifyTaskType(request.message)

      // Handle model selection - "auto" means automatic selection
      let userPreference: string | undefined
      if (request.preferredModel && request.preferredModel !== "auto") {
        // If a specific model ID is provided, use it as preference
        userPreference = request.preferredModel
      }

      // Prepare selection criteria
      const criteria: ModelSelectionCriteria = {
        taskType,
        complexity,
        userPreference,
        costLimit: request.preferredTier === "ECONOMY" ? 0.01 : undefined,
      }

      // Build prompts
      const systemPrompt = this.buildSystemPrompt(complexity, taskType)
      const userPrompt = await this.buildUserPrompt(request)

      // Use AI Model Manager to get response
      const startTime = Date.now()
      const aiResponse = await this.aiManager.chat(userPrompt, criteria, {
        systemPrompt,
        maxTokens: complexity === "COMPLEX" ? 2000 : 1000,
        temperature: 0.7,
      })
      const responseTime = Date.now() - startTime

      // Log for fine-tuning
      await this.fineTuningLogger.logInteraction({
        userId: request.userId,
        sessionId: conversationId,
        userQuery: request.message,
        systemPrompt,
        aiResponse: aiResponse.content,
        responseTime,
        tokenCount: aiResponse.usage.totalTokens,
        modelUsed: aiResponse.model,
        excelContext: request.context,
        taskType,
      })

      // Create response
      const response: SendChatMessageResponse = {
        conversationId,
        messageId: crypto.randomUUID(),
        response: aiResponse.content,
        tokensUsed: aiResponse.usage.totalTokens,
        estimatedCost: aiResponse.cost,
        aiTier: complexity === "SIMPLE" ? "TIER1" : "TIER2",
        modelUsed: aiResponse.model,
        provider: aiResponse.provider,
        suggestions: this.extractSuggestions(aiResponse.content),
        attachments: await this.generateAttachments(aiResponse.content, request),
      }

      // Save to conversation history
      await this.saveToHistory(request, response)

      return Result.success(response)
    } catch (error) {
      console.error("Chat error:", error)
      return Result.failure({
        code: "CHAT_FAILED",
        message: error instanceof Error ? error.message : "채팅 처리 중 오류가 발생했습니다.",
      })
    }
  }

  private buildSystemPrompt(complexity: string, taskType: string): string {
    const basePrompt = `당신은 Excel 전문가 AI 어시스턴트입니다.
사용자의 Excel 관련 질문에 답하고, 문제를 해결하며, 최적의 솔루션을 제공합니다.

작업 유형: ${taskType}
복잡도: ${complexity}

응답 규칙:
1. 한국어로 명확하고 친절하게 응답
2. 실행 가능한 구체적인 솔루션 제공
3. 필요시 단계별 설명 포함`

    if (complexity === "COMPLEX") {
      return basePrompt + `
4. 고급 기능과 최적화 방법 포함
5. 대안적 접근 방법 제시
6. 성능 및 효율성 고려사항 포함`
    }

    return basePrompt + `
4. 간단명료한 설명
5. 즉시 사용 가능한 템플릿이나 수식 제공`
  }

  private async buildUserPrompt(request: SendChatMessageRequest): Promise<string> {
    let prompt = request.message

    // Add context if available
    if (request.context?.fileId) {
      const file = await prisma.file.findUnique({
        where: { id: request.context.fileId },
        include: { analyses: { take: 1 } },
      })
      
      if (file) {
        prompt += `\n\n파일 컨텍스트: ${file.originalName}`
        if (file.analyses[0]) {
          prompt += `\n발견된 오류: ${(file.analyses[0].report as any).totalErrors}개`
        }
      }
    }

    return prompt
  }

  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = []
    
    // Extract numbered suggestions
    const numberPattern = /\d+\.\s*([^\n]+)/g
    let match
    while ((match = numberPattern.exec(response)) !== null) {
      suggestions.push(match[1].trim())
    }
    
    return suggestions.slice(0, 3) // Return top 3 suggestions
  }

  private async generateAttachments(
    response: string,
    request: SendChatMessageRequest
  ): Promise<any[]> {
    const attachments = []
    
    // Check if response mentions creating a template
    if (response.includes("템플릿") || response.includes("template")) {
      attachments.push({
        type: "excel_template",
        content: {
          name: "generated-template.xlsx",
          description: "AI가 생성한 Excel 템플릿",
        },
      })
    }
    
    // Check for code snippets
    const codeMatch = response.match(/```[\s\S]*?```/g)
    if (codeMatch) {
      attachments.push({
        type: "code_snippet",
        content: {
          code: codeMatch[0].replace(/```/g, '').trim(),
          language: "excel-formula",
        },
      })
    }
    
    return attachments
  }

  private async createNewConversation(userId: string): Promise<string> {
    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        title: "새 대화",
      },
    })
    
    return conversation.id
  }

  private async saveToHistory(
    request: SendChatMessageRequest,
    response: SendChatMessageResponse
  ): Promise<void> {
    await prisma.chatMessage.createMany({
      data: [
        {
          conversationId: response.conversationId,
          role: "user",
          content: request.message,
        },
        {
          conversationId: response.conversationId,
          role: "assistant",
          content: response.response,
          creditsUsed: response.tokensUsed,
          aiTier: response.aiTier,
          // metadata: {
          //   modelUsed: response.modelUsed,
          //   provider: response.provider,
          //   cost: response.estimatedCost,
          // },
        },
      ],
    })
  }
}