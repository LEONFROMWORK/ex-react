import { z } from "zod"
import { Result } from "@/Common/Result"
import { OpenAI } from "openai"
import { prisma } from "@/lib/prisma"

// Request/Response types
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
  })

  static readonly Response = z.object({
    conversationId: z.string(),
    messageId: z.string(),
    response: z.string(),
    tokensUsed: z.number(),
    estimatedCost: z.number(),
    aiTier: z.enum(["TIER1", "TIER2"]),
    suggestions: z.array(z.string()).optional(),
    attachments: z.array(z.object({
      type: z.enum(["excel_template", "code_snippet", "chart"]),
      content: z.any(),
    })).optional(),
  })
}

export type SendChatMessageRequest = z.infer<typeof SendChatMessage.Request>
export type SendChatMessageResponse = z.infer<typeof SendChatMessage.Response>

// Validator
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

// Intent classifier for 2-tier AI system
export class ChatIntentClassifier {
  private static readonly SIMPLE_PATTERNS = [
    { pattern: /템플릿|template|양식/i, category: "simple_template" },
    { pattern: /간단한|기본|basic|simple/i, category: "simple_template" },
    { pattern: /만들어|생성|create|make/i, category: "simple_template" },
  ]

  private static readonly COMPLEX_INDICATORS = [
    /복잡한|complex|advanced/i,
    /맞춤|custom|personalized/i,
    /분석|analysis|analyze/i,
    /최적화|optimize/i,
  ]

  static classifyIntent(message: string): "simple" | "complex" | "clarification_needed" {
    // Check for simple patterns
    const isSimple = this.SIMPLE_PATTERNS.some(({ pattern }) => 
      pattern.test(message)
    )
    
    // Check for complex indicators
    const isComplex = this.COMPLEX_INDICATORS.some(pattern => 
      pattern.test(message)
    )
    
    if (isSimple && !isComplex) return "simple"
    if (isComplex) return "complex"
    
    // Default to clarification if unclear
    return message.length < 20 ? "clarification_needed" : "complex"
  }
}

// Handler
export class SendChatMessageHandler {
  private openai: OpenAI
  private readonly TIER1_MODEL = "gpt-3.5-turbo"
  private readonly TIER2_MODEL = "gpt-4"
  private readonly TIER1_COST_PER_TOKEN = 0.0005
  private readonly TIER2_COST_PER_TOKEN = 0.03

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async handle(request: SendChatMessageRequest): Promise<Result<SendChatMessageResponse>> {
    try {
      // Get or create conversation
      const conversationId = request.context?.conversationId || 
        await this.createNewConversation(request.userId)

      // Classify intent
      const intent = ChatIntentClassifier.classifyIntent(request.message)

      // Route to appropriate tier
      let response: SendChatMessageResponse
      
      if (intent === "simple" || request.preferredTier === "ECONOMY") {
        response = await this.handleTier1Request(request, conversationId)
      } else if (intent === "complex" || request.preferredTier === "PREMIUM") {
        response = await this.handleTier2Request(request, conversationId)
      } else {
        // Clarification needed
        response = await this.handleClarificationRequest(request, conversationId)
      }

      // Save to conversation history
      await this.saveToHistory(request, response)

      return Result.success(response)
    } catch (error) {
      console.error("Chat error:", error)
      return Result.failure({
        code: "CHAT_FAILED",
        message: "채팅 처리 중 오류가 발생했습니다.",
      })
    }
  }

  private async handleTier1Request(
    request: SendChatMessageRequest, 
    conversationId: string
  ): Promise<SendChatMessageResponse> {
    const systemPrompt = this.buildTier1SystemPrompt()
    const userPrompt = await this.buildUserPrompt(request)

    const completion = await this.openai.chat.completions.create({
      model: this.TIER1_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const response = completion.choices[0].message.content || ""
    const tokensUsed = completion.usage?.total_tokens || 0

    // Check if escalation to Tier 2 is needed
    if (this.shouldEscalateToTier2(response)) {
      return this.handleTier2Request(request, conversationId)
    }

    return {
      conversationId,
      messageId: crypto.randomUUID(),
      response,
      tokensUsed,
      estimatedCost: tokensUsed * this.TIER1_COST_PER_TOKEN,
      aiTier: "TIER1",
      suggestions: this.extractSuggestions(response),
    }
  }

  private async handleTier2Request(
    request: SendChatMessageRequest,
    conversationId: string
  ): Promise<SendChatMessageResponse> {
    const systemPrompt = this.buildTier2SystemPrompt()
    const userPrompt = await this.buildUserPrompt(request)

    const completion = await this.openai.chat.completions.create({
      model: this.TIER2_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0].message.content || ""
    const tokensUsed = completion.usage?.total_tokens || 0

    return {
      conversationId,
      messageId: crypto.randomUUID(),
      response,
      tokensUsed,
      estimatedCost: tokensUsed * this.TIER2_COST_PER_TOKEN,
      aiTier: "TIER2",
      suggestions: this.extractSuggestions(response),
      attachments: await this.generateAttachments(response, request),
    }
  }

  private async handleClarificationRequest(
    request: SendChatMessageRequest,
    conversationId: string
  ): Promise<SendChatMessageResponse> {
    const clarificationPrompt = `
사용자의 요청이 명확하지 않습니다. 다음 옵션 중 선택하도록 안내해주세요:

1. 📊 기본 템플릿 (즉시 생성 가능)
   - 미리 준비된 템플릿 사용
   - 빠른 생성
   - 기본 기능만 포함

2. 🔷 맞춤형 템플릿 (고급 AI 필요)
   - 사용자 요구사항에 맞춤
   - 복잡한 기능 포함
   - 추가 비용 발생

사용자 메시지: "${request.message}"
`

    return {
      conversationId,
      messageId: crypto.randomUUID(),
      response: clarificationPrompt,
      tokensUsed: 0,
      estimatedCost: 0,
      aiTier: "TIER1",
      suggestions: ["기본 템플릿 선택", "맞춤형 템플릿 선택"],
    }
  }

  private buildTier1SystemPrompt(): string {
    return `
당신은 Excel 문서 생성을 도와주는 AI 어시스턴트입니다.
간단한 템플릿과 기본적인 Excel 기능에 대해 안내합니다.
복잡한 요청은 고급 AI가 필요함을 안내하세요.

응답 규칙:
1. 간단하고 명확하게 답변
2. 기본 템플릿 제공 가능
3. 복잡한 요청시 "고급 AI 분석 필요" 명시
4. 한국어로 응답
`
  }

  private buildTier2SystemPrompt(): string {
    return `
당신은 고급 Excel 전문가 AI입니다.
복잡한 Excel 문서 생성, 고급 수식, 데이터 분석을 수행합니다.

응답 규칙:
1. 상세하고 전문적인 답변
2. 맞춤형 솔루션 제공
3. 실행 가능한 코드나 수식 포함
4. 최적화 제안 포함
5. 한국어로 응답
`
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

  private shouldEscalateToTier2(response: string): boolean {
    const escalationIndicators = [
      "고급 AI 분석이 필요",
      "복잡한 요청",
      "추가 분석 필요",
    ]
    
    return escalationIndicators.some(indicator => 
      response.includes(indicator)
    )
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
          tokensUsed: response.tokensUsed,
          aiTier: response.aiTier,
        },
      ],
    })
  }
}