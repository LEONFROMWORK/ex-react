import { z } from "zod"
import { Result } from "@/Common/Result"
import { OpenAI } from "openai"
import { prisma } from "@/lib/prisma"
import { FineTuningLogger } from "@/lib/fine-tuning/logger"
// import { QASystem } from "@/modules/qa-system"

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
  private fineTuningLogger: FineTuningLogger
  // private qaSystem: QASystem
  private readonly TIER1_MODEL = "gpt-3.5-turbo"
  private readonly TIER2_MODEL = "gpt-4"
  private readonly TIER1_COST_PER_TOKEN = 0.0005
  private readonly TIER2_COST_PER_TOKEN = 0.03

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.fineTuningLogger = new FineTuningLogger()
    // this.qaSystem = new QASystem()
    
    // QA 시스템 초기화
    // this.initializeQASystem()
  }

  private async initializeQASystem() {
    // QASystem이 비활성화되어 있어 초기화를 건너뜁니다
    return
    try {
      // await this.qaSystem.initialize()
      console.log('QA 시스템 초기화 완료')
    } catch (error) {
      console.error('QA 시스템 초기화 실패:', error)
    }
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
    const startTime = Date.now()
    
    // 먼저 RAG 시스템으로 답변 시도
    try {
      // const ragResult = await this.qaSystem.generateEnhancedAnswer(request.message)
      const ragResult = { confidence: 0.3, method: 'disabled', answer: '' } // QASystem 비활성화
      
      // RAG 답변이 충분히 신뢰할 만하면 사용
      if (ragResult.confidence > 0.6) {
        console.log(`RAG 답변 사용 (신뢰도: ${ragResult.confidence.toFixed(2)}, 방법: ${ragResult.method})`)
        
        // RAG 답변으로 응답 생성
        const responseTime = Date.now() - startTime
        await this.fineTuningLogger.logInteraction({
          userId: request.userId,
          sessionId: conversationId,
          userQuery: request.message,
          systemPrompt: 'RAG_ENHANCED_SYSTEM',
          aiResponse: ragResult.answer,
          responseTime,
          tokenCount: 0, // RAG는 토큰 사용량 계산 안함
          modelUsed: ragResult.method === 'rag' ? 'RAG_SYSTEM' : this.TIER1_MODEL,
          excelContext: request.context,
          taskType: this.determineTaskType(request.message)
        })
        
        return {
          conversationId,
          messageId: crypto.randomUUID(),
          response: ragResult.answer,
          tokensUsed: 0,
          estimatedCost: 0,
          aiTier: "TIER1",
          suggestions: this.extractSuggestions(ragResult.answer),
        }
      }
      
      console.log(`RAG 신뢰도 낮음 (${ragResult.confidence.toFixed(2)}) - 기존 시스템으로 폴백`)
    } catch (error) {
      console.error('RAG 답변 생성 실패 - 기존 시스템으로 폴백:', error)
    }
    
    // 기존 Tier 1 시스템으로 폴백
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
    const responseTime = Date.now() - startTime

    // Log for fine-tuning
    await this.fineTuningLogger.logInteraction({
      userId: request.userId,
      sessionId: conversationId,
      userQuery: request.message,
      systemPrompt,
      aiResponse: response,
      responseTime,
      tokenCount: tokensUsed,
      modelUsed: this.TIER1_MODEL,
      excelContext: request.context,
      taskType: this.determineTaskType(request.message)
    })

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
    const startTime = Date.now()
    
    // 먼저 RAG 시스템으로 고품질 답변 시도
    try {
      // const ragResult = await this.qaSystem.generateEnhancedAnswer(request.message)
      const ragResult = { confidence: 0.3, method: 'disabled', answer: '' } // QASystem 비활성화
      
      // RAG 답변이 Tier 2 수준으로 충분히 신뢰할 만하면 사용
      if (ragResult.confidence > 0.5) {
        console.log(`RAG 고급 답변 사용 (신뢰도: ${ragResult.confidence.toFixed(2)}, 방법: ${ragResult.method})`)
        
        // RAG 답변으로 응답 생성
        const responseTime = Date.now() - startTime
        await this.fineTuningLogger.logInteraction({
          userId: request.userId,
          sessionId: conversationId,
          userQuery: request.message,
          systemPrompt: 'RAG_ENHANCED_TIER2_SYSTEM',
          aiResponse: ragResult.answer,
          responseTime,
          tokenCount: 0, // RAG는 토큰 사용량 계산 안함
          modelUsed: ragResult.method === 'rag' ? 'RAG_SYSTEM' : this.TIER2_MODEL,
          excelContext: request.context,
          taskType: this.determineTaskType(request.message)
        })
        
        return {
          conversationId,
          messageId: crypto.randomUUID(),
          response: ragResult.answer,
          tokensUsed: 0,
          estimatedCost: 0,
          aiTier: "TIER2",
          suggestions: this.extractSuggestions(ragResult.answer),
          attachments: await this.generateAttachments(ragResult.answer, request),
        }
      }
      
      console.log(`RAG 신뢰도 낮음 (${ragResult.confidence.toFixed(2)}) - 기존 Tier 2 시스템으로 폴백`)
    } catch (error) {
      console.error('RAG 고급 답변 생성 실패 - 기존 Tier 2 시스템으로 폴백:', error)
    }
    
    // 기존 Tier 2 시스템으로 폴백
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
    const responseTime = Date.now() - startTime

    // Log for fine-tuning
    await this.fineTuningLogger.logInteraction({
      userId: request.userId,
      sessionId: conversationId,
      userQuery: request.message,
      systemPrompt,
      aiResponse: response,
      responseTime,
      tokenCount: tokensUsed,
      modelUsed: this.TIER2_MODEL,
      excelContext: request.context,
      taskType: this.determineTaskType(request.message)
    })

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
5. 지식 베이스의 정보가 부족한 경우 일반적인 Excel 지식으로 보완
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
6. 지식 베이스의 정보를 활용하여 실제 사용자 경험 기반 답변
7. 여러 해결 방법이 있다면 상황별 최적 방법 제시
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
          creditsUsed: response.tokensUsed,
          aiTier: response.aiTier,
        },
      ],
    })
  }

  private determineTaskType(message: string): string {
    const taskPatterns = [
      { pattern: /생성|만들|create|make|새로/i, type: "CREATE" },
      { pattern: /수정|고치|fix|correct|오류/i, type: "CORRECT" },
      { pattern: /분석|analyze|검토|review/i, type: "ANALYZE" },
      { pattern: /최적화|개선|optimize|improve/i, type: "OPTIMIZE" },
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