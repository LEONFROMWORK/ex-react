import { Result } from '@/Common/Result'
import { prisma } from '@/lib/prisma'

// Request and Response DTOs
export interface ManageConversationRequest {
  userId: string
  conversationId?: string
  saveMessage?: {
    userMessage: string
    assistantMessage: string
    tokensUsed: number
    modelUsed: string
  }
  updateTitle?: string
  tenantId?: string
}

export interface ManageConversationResponse {
  conversationId: string
  title: string
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

// Conversation service
export class ConversationService {
  async createConversation(userId: string, tenantId?: string): Promise<Result<string>> {
    try {
      const conversation = await prisma.chatConversation.create({
        data: {
          userId,
          title: '새 대화',
          tenantId
        }
      })
      
      return Result.success(conversation.id)
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return Result.failure({
        code: 'ManageConversation.CreateFailed',
        message: '대화 생성에 실패했습니다.'
      })
    }
  }

  async getOrCreateConversation(
    userId: string, 
    conversationId?: string,
    tenantId?: string
  ): Promise<Result<ManageConversationResponse>> {
    try {
      let conversation

      if (conversationId) {
        // Verify conversation exists and belongs to user
        conversation = await prisma.chatConversation.findFirst({
          where: {
            id: conversationId,
            userId,
            ...(tenantId && { tenantId })
          },
          include: {
            _count: {
              select: { messages: true }
            }
          }
        })

        if (!conversation) {
          // Create new if not found
          const createResult = await this.createConversation(userId, tenantId)
          if (createResult.isFailure) {
            return Result.failure(createResult.error!)
          }

          conversation = await prisma.chatConversation.findUnique({
            where: { id: createResult.value! },
            include: {
              _count: {
                select: { messages: true }
              }
            }
          })
        }
      } else {
        // Create new conversation
        const createResult = await this.createConversation(userId, tenantId)
        if (createResult.isFailure) {
          return Result.failure(createResult.error!)
        }

        conversation = await prisma.chatConversation.findUnique({
          where: { id: createResult.value! },
          include: {
            _count: {
              select: { messages: true }
            }
          }
        })
      }

      if (!conversation) {
        return Result.failure({
          code: 'ManageConversation.NotFound',
          message: '대화를 찾을 수 없습니다.'
        })
      }

      return Result.success<ManageConversationResponse>({
        conversationId: conversation.id,
        title: conversation.title,
        messageCount: conversation._count.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      })
    } catch (error) {
      console.error('Failed to get or create conversation:', error)
      return Result.failure({
        code: 'ManageConversation.Failed',
        message: '대화 처리에 실패했습니다.'
      })
    }
  }

  async saveMessages(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    tokensUsed: number,
    modelUsed: string
  ): Promise<Result<void>> {
    try {
      await prisma.chatMessage.createMany({
        data: [
          {
            conversationId,
            role: 'user',
            content: userMessage,
          },
          {
            conversationId,
            role: 'assistant',
            content: assistantMessage,
            creditsUsed: tokensUsed,
            modelUsed,
          },
        ],
      })

      // Auto-generate title from first message if needed
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      })

      if (conversation && conversation.title === '새 대화' && conversation._count.messages <= 2) {
        // Generate title from first user message
        const title = this.generateTitle(userMessage)
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { title }
        })
      }

      return Result.success(undefined)
    } catch (error) {
      console.error('Failed to save messages:', error)
      return Result.failure({
        code: 'ManageConversation.SaveFailed',
        message: '메시지 저장에 실패했습니다.'
      })
    }
  }

  private generateTitle(message: string): string {
    // Truncate and clean up message for title
    const cleanMessage = message
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (cleanMessage.length <= 50) {
      return cleanMessage
    }
    
    return cleanMessage.substring(0, 47) + '...'
  }

  async updateTitle(conversationId: string, title: string): Promise<Result<void>> {
    try {
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { title }
      })

      return Result.success(undefined)
    } catch (error) {
      console.error('Failed to update conversation title:', error)
      return Result.failure({
        code: 'ManageConversation.UpdateFailed',
        message: '대화 제목 업데이트에 실패했습니다.'
      })
    }
  }
}

// Handler
export class ManageConversationHandler {
  private readonly conversationService: ConversationService

  constructor(conversationService?: ConversationService) {
    this.conversationService = conversationService || new ConversationService()
  }

  async handle(request: ManageConversationRequest): Promise<Result<ManageConversationResponse>> {
    // Get or create conversation
    const conversationResult = await this.conversationService.getOrCreateConversation(
      request.userId,
      request.conversationId,
      request.tenantId
    )

    if (conversationResult.isFailure) {
      return conversationResult
    }

    const conversation = conversationResult.value!

    // Save messages if provided
    if (request.saveMessage) {
      const saveResult = await this.conversationService.saveMessages(
        conversation.conversationId,
        request.saveMessage.userMessage,
        request.saveMessage.assistantMessage,
        request.saveMessage.tokensUsed,
        request.saveMessage.modelUsed
      )

      if (saveResult.isFailure) {
        return Result.failure(saveResult.error!)
      }
    }

    // Update title if provided
    if (request.updateTitle) {
      const updateResult = await this.conversationService.updateTitle(
        conversation.conversationId,
        request.updateTitle
      )

      if (updateResult.isFailure) {
        return Result.failure(updateResult.error!)
      }
    }

    // Return updated conversation info
    return this.conversationService.getOrCreateConversation(
      request.userId,
      conversation.conversationId,
      request.tenantId
    )
  }
}