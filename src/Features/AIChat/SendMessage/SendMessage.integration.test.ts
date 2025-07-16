import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Container } from '@/Common/Container'
import { TenantContext } from '@/Common/Tenant/TenantContext'
import { PipelineExecutor } from '@/Common/Pipeline/PipelineExecutor'
import { LoggingBehavior } from '@/Common/Pipeline/LoggingBehavior'
import { TenantBehavior } from '@/Common/Pipeline/TenantBehavior'
import { ValidationBehavior } from '@/Common/Pipeline/ValidationBehavior'
import { SendMessage } from './SendMessage'
import { prisma } from '@/lib/prisma'

describe('SendMessage Integration Tests', () => {
  let container: Container
  let tenantContext: TenantContext
  let pipeline: PipelineExecutor

  beforeEach(async () => {
    // Setup tenant context
    tenantContext = new TenantContext()
    tenantContext.setContext('test-tenant', 'test-user')

    // Initialize container
    container = new Container()
    await container.initialize(tenantContext)

    // Setup pipeline
    pipeline = new PipelineExecutor([
      new LoggingBehavior({ 
        info: () => {}, 
        error: () => {} 
      }),
      new TenantBehavior(tenantContext),
      new ValidationBehavior(SendMessage.Request),
    ])

    // Seed test data
    await prisma.aIModelConfig.create({
      data: {
        provider: 'openrouter',
        modelName: 'meta-llama/llama-2-70b-chat',
        displayName: 'Test LLAMA Model',
        apiKey: 'encrypted-test-key',
        isActive: true,
        isDefault: true,
        priority: 100,
        maxTokens: 2000,
        temperature: 0.7,
        costPerToken: 0.0007,
        taskTypes: ['GENERAL'],
        complexity: ['SIMPLE', 'MEDIUM', 'COMPLEX'],
        tenantId: 'test-tenant',
      }
    })
  })

  afterEach(async () => {
    // Cleanup
    await prisma.chatMessage.deleteMany({
      where: { conversationId: { contains: 'test' } }
    })
    await prisma.chatConversation.deleteMany({
      where: { userId: 'test-user' }
    })
    await prisma.aIModelConfig.deleteMany({
      where: { tenantId: 'test-tenant' }
    })
  })

  describe('End-to-End Chat Flow', () => {
    it('should process a simple chat message successfully', async () => {
      // Arrange
      const request: SendMessage.Request = {
        message: "엑셀에서 VLOOKUP 함수 사용법을 알려주세요",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      // Act
      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const result = await pipeline.execute(request, (req) => handler.handle(req))

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value).toBeDefined()
      expect(result.value.conversationId).toBeDefined()
      expect(result.value.messageId).toBeDefined()
      expect(result.value.response).toContain('VLOOKUP')

      // Verify database state
      const conversation = await prisma.chatConversation.findFirst({
        where: { id: result.value.conversationId }
      })
      expect(conversation).toBeDefined()
      expect(conversation?.userId).toBe('test-user')

      const messages = await prisma.chatMessage.findMany({
        where: { conversationId: result.value.conversationId }
      })
      expect(messages).toHaveLength(2) // User message + AI response
    })

    it('should handle complex queries with proper model selection', async () => {
      // Arrange
      const request: SendMessage.Request = {
        message: "복잡한 매크로를 사용해서 여러 시트의 데이터를 통합하고 피벗 테이블을 생성하는 방법을 설명해주세요",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      // Act
      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const result = await pipeline.execute(request, (req) => handler.handle(req))

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.modelUsed).toBeDefined()
      expect(result.value.complexity).toBe('COMPLEX')
    })

    it('should maintain conversation context', async () => {
      // First message
      const firstRequest: SendMessage.Request = {
        message: "엑셀 파일을 열 수 없다는 오류가 발생합니다",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const firstResult = await pipeline.execute(firstRequest, (req) => handler.handle(req))

      expect(firstResult.isSuccess).toBe(true)
      const conversationId = firstResult.value.conversationId

      // Follow-up message
      const secondRequest: SendMessage.Request = {
        message: "파일 확장자는 .xlsx입니다",
        userId: 'test-user',
        tenantId: 'test-tenant',
        context: { conversationId },
      }

      const secondResult = await pipeline.execute(secondRequest, (req) => handler.handle(req))

      // Assert
      expect(secondResult.isSuccess).toBe(true)
      expect(secondResult.value.conversationId).toBe(conversationId)

      // Verify all messages are in the same conversation
      const messages = await prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
      })
      expect(messages).toHaveLength(4) // 2 user messages + 2 AI responses
    })

    it('should enforce tenant isolation', async () => {
      // Create model for different tenant
      await prisma.aIModelConfig.create({
        data: {
          provider: 'openai',
          modelName: 'gpt-4',
          displayName: 'Other Tenant Model',
          apiKey: 'encrypted-key',
          isActive: true,
          isDefault: true,
          priority: 100,
          maxTokens: 2000,
          temperature: 0.7,
          costPerToken: 0.03,
          taskTypes: ['GENERAL'],
          complexity: ['COMPLEX'],
          tenantId: 'other-tenant',
        }
      })

      // Try to use with test-tenant context
      const request: SendMessage.Request = {
        message: "테스트 메시지",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const result = await pipeline.execute(request, (req) => handler.handle(req))

      // Should use test-tenant's model, not other-tenant's
      expect(result.isSuccess).toBe(true)
      expect(result.value.provider).toBe('openrouter')
      expect(result.value.modelUsed).toContain('llama')
    })

    it('should handle validation errors properly', async () => {
      // Arrange - invalid request
      const request = {
        message: "", // Empty message
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      // Act & Assert
      await expect(
        pipeline.execute(request, () => Promise.resolve({ isSuccess: true, value: {} as any }))
      ).rejects.toThrow('Validation failed')
    })

    it('should track usage and costs', async () => {
      // Arrange
      const request: SendMessage.Request = {
        message: "간단한 질문입니다",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      // Act
      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const result = await pipeline.execute(request, (req) => handler.handle(req))

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(result.value.tokensUsed).toBeGreaterThan(0)
      expect(result.value.estimatedCost).toBeGreaterThan(0)

      // Verify usage log
      const usageLog = await prisma.aIModelUsageLog.findFirst({
        where: {
          userId: 'test-user',
          success: true,
        },
        orderBy: { createdAt: 'desc' }
      })
      expect(usageLog).toBeDefined()
      expect(usageLog?.totalTokens).toBe(result.value.tokensUsed)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle AI provider errors gracefully', async () => {
      // Disable all models to force error
      await prisma.aIModelConfig.updateMany({
        where: { tenantId: 'test-tenant' },
        data: { isActive: false }
      })

      const request: SendMessage.Request = {
        message: "테스트 메시지",
        userId: 'test-user',
        tenantId: 'test-tenant',
      }

      const handler = container.resolve<SendMessage.Handler>('SendMessageHandler')
      const result = await pipeline.execute(request, (req) => handler.handle(req))

      expect(result.isFailure).toBe(true)
      expect(result.error.code).toBe('AI.NoModelsAvailable')
    })
  })
})