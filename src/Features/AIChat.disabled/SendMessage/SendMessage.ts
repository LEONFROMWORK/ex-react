import { Result } from '@/Common/Result'
import { z } from 'zod'
import { SelectModelHandler } from '@/Features/AIModelManagement/SelectModel/SelectModel'
import { LogUsageHandler } from '@/Features/AIModelManagement/MonitorUsage/MonitorUsage'
import { GenerateResponseHandler } from '../GenerateResponse/GenerateResponse'
import { ClassifyIntentHandler } from '../ClassifyIntent/ClassifyIntent'
import { ManageConversationHandler } from '../ManageConversation/ManageConversation'

// Request/Response schemas
export const SendMessageRequestSchema = z.object({
  userId: z.string(),
  message: z.string().min(1).max(4000),
  context: z.object({
    fileId: z.string().optional(),
    analysisId: z.string().optional(),
    conversationId: z.string().optional(),
  }).optional(),
  preferredModel: z.string().optional(),
  tenantId: z.string().optional(),
})

export const SendMessageResponseSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  response: z.string(),
  tokensUsed: z.number(),
  estimatedCost: z.number(),
  modelUsed: z.string(),
  provider: z.string(),
  suggestions: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    type: z.enum(['excel_template', 'code_snippet', 'chart']),
    content: z.any(),
  })).optional(),
})

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>

// Validator
export class SendMessageValidator {
  validate(request: unknown): Result<SendMessageRequest> {
    try {
      const validated = SendMessageRequestSchema.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: 'SendMessage.ValidationFailed',
          message: error.errors.map(e => e.message).join(', '),
        })
      }
      return Result.failure({
        code: 'SendMessage.InvalidRequest',
        message: '잘못된 요청입니다.',
      })
    }
  }
}

// Handler
export class SendMessageHandler {
  private readonly validator: SendMessageValidator
  private readonly classifyIntentHandler: ClassifyIntentHandler
  private readonly selectModelHandler: SelectModelHandler
  private readonly generateResponseHandler: GenerateResponseHandler
  private readonly manageConversationHandler: ManageConversationHandler
  private readonly logUsageHandler: LogUsageHandler

  constructor(
    validator?: SendMessageValidator,
    classifyIntentHandler?: ClassifyIntentHandler,
    selectModelHandler?: SelectModelHandler,
    generateResponseHandler?: GenerateResponseHandler,
    manageConversationHandler?: ManageConversationHandler,
    logUsageHandler?: LogUsageHandler
  ) {
    this.validator = validator || new SendMessageValidator()
    this.classifyIntentHandler = classifyIntentHandler || new ClassifyIntentHandler()
    this.selectModelHandler = selectModelHandler || new SelectModelHandler()
    this.generateResponseHandler = generateResponseHandler || new GenerateResponseHandler()
    this.manageConversationHandler = manageConversationHandler || new ManageConversationHandler()
    this.logUsageHandler = logUsageHandler || new LogUsageHandler()
  }

  async handle(request: SendMessageRequest): Promise<Result<SendMessageResponse>> {
    // Validate request
    const validationResult = this.validator.validate(request)
    if (validationResult.isFailure) {
      return Result.failure(validationResult.error!)
    }

    try {
      // Get or create conversation
      const conversationResult = await this.manageConversationHandler.handle({
        userId: request.userId,
        conversationId: request.context?.conversationId,
        tenantId: request.tenantId
      })

      if (conversationResult.isFailure) {
        return Result.failure(conversationResult.error!)
      }

      const conversationId = conversationResult.value!.conversationId

      // Classify intent to determine complexity
      const intentResult = await this.classifyIntentHandler.handle({
        message: request.message,
        context: request.context
      })

      if (intentResult.isFailure) {
        return Result.failure(intentResult.error!)
      }

      const intent = intentResult.value!

      // Select appropriate AI model
      const modelSelectionResult = await this.selectModelHandler.handle({
        taskType: intent.taskType,
        complexity: intent.complexity,
        userPreference: request.preferredModel,
        tenantId: request.tenantId
      })

      if (modelSelectionResult.isFailure) {
        return Result.failure(modelSelectionResult.error!)
      }

      const selectedModel = modelSelectionResult.value!

      // Generate response using selected model
      const responseResult = await this.generateResponseHandler.handle({
        message: request.message,
        modelId: selectedModel.modelId,
        provider: selectedModel.provider,
        modelName: selectedModel.modelName,
        maxTokens: selectedModel.maxTokens,
        temperature: selectedModel.temperature,
        endpoint: selectedModel.endpoint,
        context: request.context,
        intent: intent,
        tenantId: request.tenantId
      })

      if (responseResult.isFailure) {
        return Result.failure(responseResult.error!)
      }

      const aiResponse = responseResult.value!

      // Log usage
      await this.logUsageHandler.handle({
        modelConfigId: selectedModel.modelId,
        userId: request.userId,
        taskType: intent.taskType,
        response: aiResponse.rawResponse,
        tenantId: request.tenantId
      })

      // Save message to conversation
      await this.manageConversationHandler.handle({
        userId: request.userId,
        conversationId: conversationId,
        saveMessage: {
          userMessage: request.message,
          assistantMessage: aiResponse.response,
          tokensUsed: aiResponse.tokensUsed,
          modelUsed: selectedModel.modelName
        },
        tenantId: request.tenantId
      })

      return Result.success<SendMessageResponse>({
        conversationId,
        messageId: aiResponse.messageId,
        response: aiResponse.response,
        tokensUsed: aiResponse.tokensUsed,
        estimatedCost: aiResponse.estimatedCost,
        modelUsed: selectedModel.modelName,
        provider: selectedModel.provider,
        suggestions: aiResponse.suggestions,
        attachments: aiResponse.attachments
      })
    } catch (error) {
      console.error('Chat error:', error)
      return Result.failure({
        code: 'SendMessage.Failed',
        message: '채팅 처리 중 오류가 발생했습니다.',
      })
    }
  }
}