import { Result } from '@/Common/Result'
import { AIModelErrors } from '@/Common/Errors'
import { ProviderFactory } from '@/Features/AIModelManagement/ValidateModel/ValidateModel'
import { AIProvider } from '@/lib/ai/providers'
import { AIResponse } from '@/lib/ai/types'
import { prisma } from '@/lib/prisma'
import { ClassifyIntentResponse } from '../ClassifyIntent/ClassifyIntent'
import crypto from 'crypto'

// Request and Response DTOs
export interface GenerateResponseRequest {
  message: string
  modelId: string
  provider: string
  modelName: string
  maxTokens: number
  temperature: number
  endpoint?: string | null
  context?: {
    fileId?: string
    analysisId?: string
    conversationId?: string
  }
  intent: ClassifyIntentResponse
  tenantId?: string
}

export interface GenerateResponseResponse {
  messageId: string
  response: string
  tokensUsed: number
  estimatedCost: number
  suggestions?: string[]
  attachments?: Array<{
    type: 'excel_template' | 'code_snippet' | 'chart'
    content: any
  }>
  rawResponse: AIResponse
}

// Prompt builder service
export class PromptBuilder {
  buildSystemPrompt(intent: ClassifyIntentResponse, provider: string): string {
    const basePrompt = `당신은 Excel 문서 처리를 전문으로 하는 AI 어시스턴트입니다.
사용자의 요청에 대해 명확하고 실용적인 도움을 제공하세요.`

    // Add provider-specific instructions
    let providerInstructions = ''
    if (provider === 'claude') {
      providerInstructions = '\n\n응답시 구조화된 형식을 사용하고 단계별 설명을 제공하세요.'
    } else if (provider === 'openai' || provider === 'openrouter') {
      providerInstructions = '\n\n간결하면서도 완전한 답변을 제공하세요.'
    }

    // Add complexity-specific instructions
    let complexityInstructions = ''
    switch (intent.complexity) {
      case 'SIMPLE':
        complexityInstructions = `
- 간단하고 명확한 답변 제공
- 기본적인 기능 중심으로 설명
- 실행 가능한 단계를 1-3개로 제한`
        break
      case 'MEDIUM':
        complexityInstructions = `
- 적절한 수준의 상세 설명 제공
- 필요시 예제 포함
- 단계별 가이드 제공`
        break
      case 'COMPLEX':
        complexityInstructions = `
- 상세하고 전문적인 답변 제공
- 고급 기능과 최적화 방법 포함
- 실제 구현 가능한 코드나 수식 제공
- 대안적 접근 방법 제시`
        break
    }

    // Add task-specific instructions
    let taskInstructions = ''
    switch (intent.taskType) {
      case 'CREATE':
        taskInstructions = '\n- 생성 요청에 대해 구체적인 템플릿이나 구조 제안'
        break
      case 'CORRECT':
        taskInstructions = '\n- 오류 수정시 근본 원인과 해결 방법 설명'
        break
      case 'ANALYZE':
        taskInstructions = '\n- 분석 요청에 대해 인사이트와 개선점 제공'
        break
      case 'OPTIMIZE':
        taskInstructions = '\n- 최적화 제안시 성능 향상 효과 설명'
        break
    }

    return basePrompt + providerInstructions + complexityInstructions + taskInstructions + '\n\n항상 한국어로 응답하세요.'
  }

  async buildUserPrompt(request: GenerateResponseRequest): Promise<string> {
    let prompt = request.message

    // Add context if available
    if (request.context?.fileId) {
      const file = await prisma.file.findUnique({
        where: { id: request.context.fileId },
        include: { analyses: { take: 1 } },
      })
      
      if (file) {
        prompt += `\n\n[파일 컨텍스트]`
        prompt += `\n- 파일명: ${file.originalName}`
        prompt += `\n- 크기: ${file.fileSize ? (file.fileSize / 1024).toFixed(2) : 'Unknown'}KB`
        
        if (file.analyses[0]) {
          const report = file.analyses[0].report as any
          prompt += `\n- 발견된 오류: ${report.totalErrors || 0}개`
          if (report.errorTypes) {
            prompt += `\n- 오류 유형: ${Object.keys(report.errorTypes).join(', ')}`
          }
        }
      }
    }

    if (request.context?.analysisId) {
      const analysis = await prisma.analysis.findUnique({
        where: { id: request.context.analysisId }
      })
      
      if (analysis) {
        const report = analysis.report as any
        prompt += `\n\n[분석 컨텍스트]`
        prompt += `\n- 분석 상태: ${(analysis as any).status || 'Unknown'}`
        if (report.summary) {
          prompt += `\n- 요약: ${report.summary}`
        }
      }
    }

    return prompt
  }

  extractSuggestions(response: string): string[] {
    const suggestions: string[] = []
    
    // Extract numbered suggestions
    const numberPattern = /\d+\.\s*([^\n]+)/g
    let match
    while ((match = numberPattern.exec(response)) !== null) {
      suggestions.push(match[1].trim())
    }
    
    // Extract bullet points
    const bulletPattern = /[•·-]\s*([^\n]+)/g
    while ((match = bulletPattern.exec(response)) !== null) {
      suggestions.push(match[1].trim())
    }
    
    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  generateAttachments(response: string, intent: ClassifyIntentResponse): Array<any> {
    const attachments = []
    
    // Check if response mentions creating a template
    if (intent.taskType === 'CREATE' && (response.includes('템플릿') || response.includes('template'))) {
      attachments.push({
        type: 'excel_template',
        content: {
          name: 'generated-template.xlsx',
          description: 'AI가 생성한 Excel 템플릿',
        },
      })
    }
    
    // Check for code snippets
    if (response.includes('```') || response.includes('=')) {
      const codeMatch = response.match(/```[\s\S]*?```|=[A-Z]+\([^)]+\)/g)
      if (codeMatch) {
        attachments.push({
          type: 'code_snippet',
          content: {
            code: codeMatch[0],
            language: 'excel',
          },
        })
      }
    }
    
    return attachments
  }
}

// Handler
export class GenerateResponseHandler {
  private readonly providerFactory: ProviderFactory
  private readonly promptBuilder: PromptBuilder

  constructor(
    providerFactory?: ProviderFactory,
    promptBuilder?: PromptBuilder
  ) {
    this.providerFactory = providerFactory || new ProviderFactory()
    this.promptBuilder = promptBuilder || new PromptBuilder()
  }

  async handle(request: GenerateResponseRequest): Promise<Result<GenerateResponseResponse>> {
    try {
      // Get model configuration from database
      const modelConfig = await prisma.aIModelConfig.findUnique({
        where: { id: request.modelId }
      })

      if (!modelConfig) {
        return Result.failure(AIModelErrors.ModelNotFound)
      }

      // Create provider instance
      const providerResult = this.providerFactory.createProvider({
        provider: modelConfig.provider,
        apiKey: modelConfig.apiKey,
        endpoint: modelConfig.endpoint,
        modelName: modelConfig.modelName
      })

      if (providerResult.isFailure) {
        return Result.failure(providerResult.error!)
      }

      const provider = providerResult.value!

      // Build prompts
      const systemPrompt = this.promptBuilder.buildSystemPrompt(request.intent, request.provider)
      const userPrompt = await this.promptBuilder.buildUserPrompt(request)

      // Generate response
      try {
        const aiResponse = await provider.generateResponse(userPrompt, {
          systemPrompt,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          // Enable prompt caching for Claude models
          transforms: request.provider === 'claude' || 
                     (request.provider === 'openrouter' && request.modelName.includes('claude'))
                     ? ['cache_control'] : undefined
        })

        // Extract suggestions and attachments
        const suggestions = this.promptBuilder.extractSuggestions(aiResponse.content)
        const attachments = this.promptBuilder.generateAttachments(aiResponse.content, request.intent)

        return Result.success<GenerateResponseResponse>({
          messageId: crypto.randomUUID(),
          response: aiResponse.content,
          tokensUsed: aiResponse.usage.totalTokens,
          estimatedCost: aiResponse.cost,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          rawResponse: aiResponse
        })
      } catch (error) {
        console.error(`AI provider ${request.provider} failed:`, error)
        return Result.failure({
          code: 'GenerateResponse.ProviderFailed',
          message: `AI 응답 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    } catch (error) {
      console.error('Failed to generate response:', error)
      return Result.failure({
        code: 'GenerateResponse.Failed',
        message: 'AI 응답 생성 중 오류가 발생했습니다.'
      })
    }
  }
}